import { TypedEventEmitter } from '../../core/events';
import {
  ILobbyProvider,
  ILobbySession,
  LobbyPlayer,
  LobbyChatMessage,
  LobbyInfo,
  CreateLobbyOptions,
  LobbySessionEvents,
  LobbyProviderEvents
} from '../types';

export const DEFAULT_MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
export const FALLBACK_MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';

// Minimal native MQTT 3.1.1 over WebSocket client (Zero npm dependencies)
export class MinimalMqttClient {
  private ws: WebSocket | null = null;
  private messageListeners: Set<(topic: string, payload: string) => void> = new Set();
  private pingInterval: any = null;
  private isConnected = false;
  private packetIdCounter = 1;

  constructor(
    public readonly brokerUrl: string = DEFAULT_MQTT_BROKER,
    public readonly clientId: string = 'mpg_' + Math.random().toString(36).substring(2, 11)
  ) {}

  async connect(): Promise<void> {
    if (typeof WebSocket === 'undefined') return;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.brokerUrl, 'mqtt');
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.sendConnect();
        };

        this.ws.onmessage = (event) => {
          this.handlePacket(new Uint8Array(event.data as ArrayBuffer), resolve);
        };

        this.ws.onerror = (err) => {
          if (!this.isConnected) reject(err);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          if (this.pingInterval) clearInterval(this.pingInterval);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  onMessage(cb: (topic: string, payload: string) => void): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  private sendConnect(): void {
    const protocolName = [0x00, 0x04, 0x4d, 0x51, 0x54, 0x54]; // "MQTT"
    const protocolLevel = 0x04; // 3.1.1
    const connectFlags = 0x02; // Clean Session
    const keepAlive = [0x00, 0x3c]; // 60 seconds
    const clientBytes = new TextEncoder().encode(this.clientId);
    const clientLen = [clientBytes.length >> 8, clientBytes.length & 0xff];

    const varPayload = [
      ...protocolName,
      protocolLevel,
      connectFlags,
      ...keepAlive,
      ...clientLen,
      ...clientBytes
    ];
    const lenBytes = this.encodeLength(varPayload.length);
    const packet = new Uint8Array([0x10, ...lenBytes, ...varPayload]);
    this.sendRaw(packet);
  }

  publish(topic: string, message: string): void {
    const topicBytes = new TextEncoder().encode(topic);
    const topicLen = [topicBytes.length >> 8, topicBytes.length & 0xff];
    const msgBytes = new TextEncoder().encode(message);
    const varPayload = [...topicLen, ...topicBytes, ...msgBytes];
    const lenBytes = this.encodeLength(varPayload.length);
    const packet = new Uint8Array([0x30, ...lenBytes, ...varPayload]);
    this.sendRaw(packet);
  }

  subscribe(topic: string): void {
    const pid = this.packetIdCounter++;
    const packetId = [pid >> 8, pid & 0xff];
    const topicBytes = new TextEncoder().encode(topic);
    const topicLen = [topicBytes.length >> 8, topicBytes.length & 0xff];
    const qos = 0x00;

    const varPayload = [...packetId, ...topicLen, ...topicBytes, qos];
    const lenBytes = this.encodeLength(varPayload.length);
    const packet = new Uint8Array([0x82, ...lenBytes, ...varPayload]);
    this.sendRaw(packet);
  }

  private sendRaw(bytes: Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(bytes.buffer);
    }
  }

  private handlePacket(bytes: Uint8Array, onConnected: () => void): void {
    if (bytes.length === 0) return;
    const packetType = bytes[0] >> 4;

    if (packetType === 2) {
      // CONNACK
      this.isConnected = true;
      this.pingInterval = setInterval(() => {
        this.sendRaw(new Uint8Array([0xc0, 0x00])); // PINGREQ
      }, 25000);
      onConnected();
    } else if (packetType === 3) {
      // PUBLISH
      let offset = 1;
      // Skip variable length
      while (bytes[offset] & 0x80) offset++;
      offset++;

      // Read topic
      const topicLen = (bytes[offset] << 8) | bytes[offset + 1];
      offset += 2;
      const topic = new TextDecoder().decode(bytes.subarray(offset, offset + topicLen));
      offset += topicLen;

      // Remaining bytes = payload
      const payload = new TextDecoder().decode(bytes.subarray(offset));
      this.messageListeners.forEach((cb) => cb(topic, payload));
    }
  }

  private encodeLength(len: number): number[] {
    const out: number[] = [];
    do {
      let digit = len % 128;
      len = Math.floor(len / 128);
      if (len > 0) digit |= 0x80;
      out.push(digit);
    } while (len > 0);
    return out;
  }

  close(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      try {
        this.sendRaw(new Uint8Array([0xe0, 0x00])); // DISCONNECT
        this.ws.close();
      } catch {}
    }
    this.messageListeners.clear();
  }
}

export function topicMatches(pattern: string, topic: string): boolean {
  const pParts = pattern.split('/');
  const tParts = topic.split('/');
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i] === '#') return true;
    if (pParts[i] === '+') {
      if (i >= tParts.length) return false;
      continue;
    }
    if (pParts[i] !== tParts[i]) return false;
  }
  return pParts.length === tParts.length;
}

export class MqttLobbySession extends TypedEventEmitter<LobbySessionEvents> implements ILobbySession {
  readonly roomId: string;
  readonly isHost: boolean;
  readonly gameId: string;
  readonly hostUserId: string;
  readonly maxPlayers: number;
  readonly metadata: Record<string, any>;

  private _status: 'waiting' | 'starting' | 'in_game' = 'waiting';
  private _hostPeerId?: string;
  private _players = new Map<string, LobbyPlayer>();
  private _chatMessages: LobbyChatMessage[] = [];
  private heartbeatTimer: any = null;
  private unsubscribeMessages: (() => void) | null = null;
  private roomTopic: string;
  private lobbyTopic: string;

  constructor(
    private mqtt: MinimalMqttClient,
    private myUserId: string,
    options: {
      roomId: string;
      isHost: boolean;
      gameId: string;
      hostUserId: string;
      hostPeerId?: string;
      maxPlayers?: number;
      metadata?: Record<string, any>;
      nickname: string;
    }
  ) {
    super();
    this.roomId = options.roomId;
    this.isHost = options.isHost;
    this.gameId = options.gameId;
    this.hostUserId = options.hostUserId;
    this._hostPeerId = options.hostPeerId;
    this.maxPlayers = options.maxPlayers ?? 4;
    this.metadata = options.metadata || {};

    this.roomTopic = `mpg/${this.gameId}/room/${this.roomId}/events`;
    this.lobbyTopic = `mpg/${this.gameId}/lobbies/${this.roomId}`;

    // Add self to players
    this._players.set(myUserId, {
      userId: myUserId,
      nickname: options.nickname,
      isHost: options.isHost,
      isReady: options.isHost,
      peerId: options.hostPeerId
    });

    this.initNetwork();
  }

  get players(): LobbyPlayer[] {
    return Array.from(this._players.values());
  }

  get chatMessages(): LobbyChatMessage[] {
    return [...this._chatMessages];
  }

  get status(): 'waiting' | 'starting' | 'in_game' {
    return this._status;
  }

  get hostPeerId(): string | undefined {
    return this._hostPeerId;
  }

  private initNetwork(): void {
    this.mqtt.subscribe(this.roomTopic);

    this.unsubscribeMessages = this.mqtt.onMessage((topic, payload) => {
      if (topic !== this.roomTopic) return;
      try {
        const msg = JSON.parse(payload);
        this.handleRoomMessage(msg);
      } catch {}
    });

    if (this.isHost) {
      this.broadcastLobbyHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        this.broadcastLobbyHeartbeat();
      }, 5000);
    } else {
      // Send join announcement
      const self = this._players.get(this.myUserId);
      if (self) {
        this.mqtt.publish(this.roomTopic, JSON.stringify({
          type: 'player_update',
          player: self
        }));
      }
    }
  }

  private broadcastLobbyHeartbeat(): void {
    const info: LobbyInfo = {
      roomId: this.roomId,
      name: this.metadata.name || 'MQTT Lobby',
      gameId: this.gameId,
      hostNickname: this._players.get(this.hostUserId)?.nickname || 'Host',
      numPlayers: this._players.size,
      maxPlayers: this.maxPlayers,
      status: this._status,
      metadata: { ...this.metadata, hostPeerId: this._hostPeerId }
    };
    this.mqtt.publish(this.lobbyTopic, JSON.stringify(info));
  }

  private handleRoomMessage(msg: any): void {
    if (msg.type === 'player_update' && msg.player) {
      const p = msg.player as LobbyPlayer;
      const isNew = !this._players.has(p.userId);
      this._players.set(p.userId, p);
      if (p.isHost && p.peerId && p.peerId !== this._hostPeerId) {
        this._hostPeerId = p.peerId;
        this.emit('hostPeerIdAvailable', p.peerId);
      }
      if (isNew) {
        this.emit('playerJoined', p);
        // If host receives a new player, re-announce host state to ensure they know the host
        if (this.isHost) {
          const self = this._players.get(this.myUserId);
          if (self) {
            this.mqtt.publish(this.roomTopic, JSON.stringify({
              type: 'player_update',
              player: self
            }));
          }
        }
      } else {
        this.emit('playerUpdated', p);
      }
    } else if (msg.type === 'chat' && msg.message) {
      const chatMsg = msg.message as LobbyChatMessage;
      this._chatMessages.push(chatMsg);
      this.emit('chatMessage', chatMsg);
    } else if (msg.type === 'start_game') {
      this._status = 'in_game';
      if (msg.hostPeerId) this._hostPeerId = msg.hostPeerId;
      this.emit('gameStarted', {
        hostPeerId: msg.hostPeerId || this._hostPeerId,
        metadata: msg.metadata || {}
      });
    }
  }

  async setReady(ready: boolean, data?: Record<string, any>): Promise<void> {
    const self = this._players.get(this.myUserId);
    if (!self) return;
    self.isReady = ready;
    if (data) self.data = { ...self.data, ...data };

    this.mqtt.publish(this.roomTopic, JSON.stringify({
      type: 'player_update',
      player: self
    }));
    this.emit('playerUpdated', self);
  }

  async setPeerId(peerId: string): Promise<void> {
    const self = this._players.get(this.myUserId);
    if (!self) return;
    self.peerId = peerId;
    if (this.isHost) {
      this._hostPeerId = peerId;
      this.emit('hostPeerIdAvailable', peerId);
      this.broadcastLobbyHeartbeat();
    }
    this.mqtt.publish(this.roomTopic, JSON.stringify({
      type: 'player_update',
      player: self
    }));
  }

  async sendChatMessage(text: string): Promise<void> {
    const self = this._players.get(this.myUserId);
    const chatMsg: LobbyChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderUserId: this.myUserId,
      senderNickname: self?.nickname || 'Gracz',
      text,
      timestamp: Date.now()
    };
    this.mqtt.publish(this.roomTopic, JSON.stringify({
      type: 'chat',
      message: chatMsg
    }));
  }

  async startGame(metadata?: Record<string, any>): Promise<void> {
    if (!this.isHost) return;
    this._status = 'in_game';
    this.broadcastLobbyHeartbeat();
    this.mqtt.publish(this.roomTopic, JSON.stringify({
      type: 'start_game',
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    }));
    this.emit('gameStarted', {
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    });
  }

  async leave(): Promise<void> {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.unsubscribeMessages) this.unsubscribeMessages();
  }
}

export class MqttLobbyProvider extends TypedEventEmitter<LobbyProviderEvents> implements ILobbyProvider {
  readonly providerType = 'mqtt' as const;
  private mqtt: MinimalMqttClient;
  private myUserId: string;
  private _isConnected = false;

  constructor(brokerUrl = DEFAULT_MQTT_BROKER) {
    super();
    this.myUserId = 'mqtt_u_' + Math.random().toString(36).substring(2, 10);
    this.mqtt = new MinimalMqttClient(brokerUrl, 'mpg_' + this.myUserId);
  }

  get currentUserId(): string | null {
    return this.myUserId;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    await this.mqtt.connect();
    this._isConnected = true;
    this.emit('connected', undefined);
  }

  async disconnect(): Promise<void> {
    this.mqtt.close();
    this._isConnected = false;
    this.emit('disconnected', undefined);
  }

  async listLobbies(gameId: string): Promise<LobbyInfo[]> {
    return new Promise((resolve) => {
      const discoveryTopic = `mpg/${gameId}/lobbies/+`;
      this.mqtt.subscribe(discoveryTopic);

      const lobbiesMap = new Map<string, { info: LobbyInfo; receivedAt: number }>();
      const unsubscribe = this.mqtt.onMessage((topic, payload) => {
        if (!topicMatches(discoveryTopic, topic)) return;
        try {
          const info = JSON.parse(payload) as LobbyInfo;
          lobbiesMap.set(info.roomId, { info, receivedAt: Date.now() });
        } catch {}
      });

      setTimeout(() => {
        unsubscribe();
        resolve(Array.from(lobbiesMap.values()).map((v) => v.info));
      }, 1200);
    });
  }

  async createLobby(options: CreateLobbyOptions): Promise<ILobbySession> {
    const roomId = 'mqtt_r_' + Math.random().toString(36).substring(2, 10);
    const session = new MqttLobbySession(this.mqtt, this.myUserId, {
      roomId,
      isHost: true,
      gameId: options.gameId || 'game',
      hostUserId: this.myUserId,
      maxPlayers: options.maxPlayers ?? 4,
      metadata: { name: options.name, ...options.metadata },
      nickname: options.nickname || 'Host'
    });
    return session;
  }

  async joinLobby(roomId: string, nickname?: string): Promise<ILobbySession> {
    const session = new MqttLobbySession(this.mqtt, this.myUserId, {
      roomId,
      isHost: false,
      gameId: 'game',
      hostUserId: '',
      nickname: nickname || 'Gracz'
    });
    return session;
  }
}
