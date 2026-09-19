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
import { generateKeyPair, sha256Hex, schnorrSign } from './crypto';

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export const DEFAULT_NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social'
];

export class NostrRelayPool {
  private sockets: Map<string, WebSocket> = new Map();
  private messageListeners: Set<(event: NostrEvent, relayUrl: string) => void> = new Set();
  private eoseListeners: Map<string, () => void> = new Map();

  constructor(public readonly relayUrls: string[] = DEFAULT_NOSTR_RELAYS) {}

  async connect(): Promise<void> {
    if (typeof WebSocket === 'undefined') return;

    for (const url of this.relayUrls) {
      if (this.sockets.has(url)) continue;
      try {
        const ws = new WebSocket(url);
        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (Array.isArray(data)) {
              const [type, subId, payload] = data;
              if (type === 'EVENT' && payload) {
                this.messageListeners.forEach((listener) => listener(payload, url));
              } else if (type === 'EOSE' && subId) {
                const cb = this.eoseListeners.get(subId);
                if (cb) cb();
              }
            }
          } catch {}
        };
        ws.onerror = () => {};
        this.sockets.set(url, ws);
      } catch {}
    }
  }

  onMessage(listener: (event: NostrEvent, relayUrl: string) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  send(message: any[]): void {
    const raw = JSON.stringify(message);
    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(raw);
        } catch {}
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.addEventListener('open', () => {
          try { ws.send(raw); } catch {}
        }, { once: true });
      }
    }
  }

  subscribe(subId: string, filter: any, onEose?: () => void): void {
    if (onEose) this.eoseListeners.set(subId, onEose);
    this.send(['REQ', subId, filter]);
  }

  unsubscribe(subId: string): void {
    this.eoseListeners.delete(subId);
    this.send(['CLOSE', subId]);
  }

  close(): void {
    for (const ws of this.sockets.values()) {
      try { ws.close(); } catch {}
    }
    this.sockets.clear();
    this.messageListeners.clear();
    this.eoseListeners.clear();
  }
}

export class NostrLobbySession extends TypedEventEmitter<LobbySessionEvents> implements ILobbySession {
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
  private subId: string;
  private unsubscribeMessages: (() => void) | null = null;

  constructor(
    private pool: NostrRelayPool,
    private keyPair: { secretKey: string; publicKey: string },
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
    this.subId = 'sub_' + Math.random().toString(36).substring(2, 9);

    // Add self to players
    this._players.set(keyPair.publicKey, {
      userId: keyPair.publicKey,
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

  private async publishEvent(kind: number, tags: string[][], contentObj: any): Promise<void> {
    const content = typeof contentObj === 'string' ? contentObj : JSON.stringify(contentObj);
    const createdAt = Math.floor(Date.now() / 1000);
    const serialized = JSON.stringify([0, this.keyPair.publicKey, createdAt, kind, tags, content]);
    const id = await sha256Hex(serialized);
    const sig = await schnorrSign(id, this.keyPair.secretKey);
    const event: NostrEvent = {
      id,
      pubkey: this.keyPair.publicKey,
      created_at: createdAt,
      kind,
      tags,
      content,
      sig
    };
    this.pool.send(['EVENT', event]);
  }

  private initNetwork(): void {
    this.unsubscribeMessages = this.pool.onMessage((event) => {
      this.handleIncomingEvent(event);
    });

    // Subscribe to room events: kind 20001 (lobby), 20002 (players), 20003 (chat)
    this.pool.subscribe(this.subId, {
      kinds: [20001, 20002, 20003],
      '#d': [this.roomId],
      since: Math.floor(Date.now() / 1000) - 30
    });

    if (this.isHost) {
      this.broadcastLobbyHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        this.broadcastLobbyHeartbeat();
      }, 8000);
    } else {
      // Announce guest presence
      const self = this._players.get(this.keyPair.publicKey);
      if (self) {
        this.publishEvent(20002, [['d', this.roomId]], {
          type: 'player_update',
          player: self
        });
      }
    }
  }

  private broadcastLobbyHeartbeat(): void {
    this.publishEvent(20001, [['d', this.roomId], ['t', 'mpg-lobby'], ['g', this.gameId]], {
      name: this.metadata.name || 'Nostr Lobby',
      gameId: this.gameId,
      hostUserId: this.hostUserId,
      hostNickname: this._players.get(this.hostUserId)?.nickname || 'Host',
      hostPeerId: this._hostPeerId,
      maxPlayers: this.maxPlayers,
      numPlayers: this._players.size,
      status: this._status,
      metadata: this.metadata
    });
  }

  private handleIncomingEvent(event: NostrEvent): void {
    const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
    if (dTag !== this.roomId) return;

    try {
      const data = JSON.parse(event.content);
      if (event.kind === 20001) {
        // Lobby status update
        if (data.status && data.status !== this._status) {
          this._status = data.status;
        }
        if (data.hostPeerId && data.hostPeerId !== this._hostPeerId) {
          this._hostPeerId = data.hostPeerId;
          this.emit('hostPeerIdAvailable', data.hostPeerId);
        }
        this.emit('lobbyUpdated', data);
      } else if (event.kind === 20002) {
        // Player state / game start
        if (data.type === 'player_update' && data.player) {
          const p = data.player as LobbyPlayer;
          const isNew = !this._players.has(p.userId);
          this._players.set(p.userId, p);
          if (p.isHost && p.peerId && p.peerId !== this._hostPeerId) {
            this._hostPeerId = p.peerId;
            this.emit('hostPeerIdAvailable', p.peerId);
          }
          if (isNew) {
            this.emit('playerJoined', p);
          } else {
            this.emit('playerUpdated', p);
          }
        } else if (data.type === 'start_game') {
          this._status = 'in_game';
          if (data.hostPeerId) this._hostPeerId = data.hostPeerId;
          this.emit('gameStarted', {
            hostPeerId: data.hostPeerId || this._hostPeerId,
            metadata: data.metadata || {}
          });
        }
      } else if (event.kind === 20003) {
        // Chat message
        const chatMsg: LobbyChatMessage = {
          id: event.id,
          senderUserId: event.pubkey,
          senderNickname: data.nickname || event.pubkey.substring(0, 8),
          text: data.text,
          timestamp: event.created_at * 1000
        };
        this._chatMessages.push(chatMsg);
        this.emit('chatMessage', chatMsg);
      }
    } catch {}
  }

  async setReady(ready: boolean, data?: Record<string, any>): Promise<void> {
    const self = this._players.get(this.keyPair.publicKey);
    if (!self) return;
    self.isReady = ready;
    if (data) self.data = { ...self.data, ...data };

    await this.publishEvent(20002, [['d', this.roomId]], {
      type: 'player_update',
      player: self
    });
    this.emit('playerUpdated', self);
  }

  async setPeerId(peerId: string): Promise<void> {
    const self = this._players.get(this.keyPair.publicKey);
    if (!self) return;
    self.peerId = peerId;
    if (this.isHost) {
      this._hostPeerId = peerId;
      this.emit('hostPeerIdAvailable', peerId);
    }
    await this.publishEvent(20002, [['d', this.roomId]], {
      type: 'player_update',
      player: self
    });
  }

  async sendChatMessage(text: string): Promise<void> {
    const self = this._players.get(this.keyPair.publicKey);
    const nickname = self?.nickname || 'Gracz';
    await this.publishEvent(20003, [['d', this.roomId]], {
      text,
      nickname
    });
  }

  async startGame(metadata?: Record<string, any>): Promise<void> {
    if (!this.isHost) return;
    this._status = 'in_game';
    await this.publishEvent(20002, [['d', this.roomId]], {
      type: 'start_game',
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    });
    this.emit('gameStarted', {
      hostPeerId: this._hostPeerId,
      metadata: metadata || this.metadata
    });
  }

  async leave(): Promise<void> {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.unsubscribeMessages) this.unsubscribeMessages();
    this.pool.unsubscribe(this.subId);
  }
}

export class NostrLobbyProvider extends TypedEventEmitter<LobbyProviderEvents> implements ILobbyProvider {
  readonly providerType = 'nostr' as const;
  private pool: NostrRelayPool;
  private keyPair: { secretKey: string; publicKey: string };
  private _isConnected = false;

  constructor(relays: string[] = DEFAULT_NOSTR_RELAYS) {
    super();
    this.pool = new NostrRelayPool(relays);
    this.keyPair = this.loadOrGenerateKeys();
  }

  get currentUserId(): string | null {
    return this.keyPair.publicKey;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  private loadOrGenerateKeys(): { secretKey: string; publicKey: string } {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('mpg_nostr_keypair');
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    const keys = generateKeyPair();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mpg_nostr_keypair', JSON.stringify(keys));
      }
    } catch {}
    return keys;
  }

  async connect(authOptions?: any): Promise<void> {
    if (authOptions?.secretKey) {
      this.keyPair = {
        secretKey: authOptions.secretKey,
        publicKey: authOptions.publicKey
      };
    }
    await this.pool.connect();
    this._isConnected = true;
    this.emit('connected', undefined);
  }

  async disconnect(): Promise<void> {
    this.pool.close();
    this._isConnected = false;
    this.emit('disconnected', undefined);
  }

  async listLobbies(gameId: string): Promise<LobbyInfo[]> {
    return new Promise((resolve) => {
      const subId = 'list_' + Math.random().toString(36).substring(2, 9);
      const lobbiesMap = new Map<string, { info: LobbyInfo; createdAt: number }>();

      const unsubscribe = this.pool.onMessage((event) => {
        if (event.kind !== 20001) return;
        const dTag = event.tags.find((t) => t[0] === 'd')?.[1];
        if (!dTag) return;
        try {
          const data = JSON.parse(event.content);
          if (data.gameId !== gameId) return;

          const prev = lobbiesMap.get(dTag);
          if (!prev || event.created_at > prev.createdAt) {
            lobbiesMap.set(dTag, {
              createdAt: event.created_at,
              info: {
                roomId: dTag,
                name: data.name || 'Pokój Gry',
                gameId: data.gameId || gameId,
                hostNickname: data.hostNickname || 'Host',
                numPlayers: data.numPlayers || 1,
                maxPlayers: data.maxPlayers || 4,
                status: data.status || 'waiting',
                metadata: data.metadata
              }
            });
          }
        } catch {}
      });

      this.pool.subscribe(
        subId,
        {
          kinds: [20001],
          '#t': ['mpg-lobby'],
          '#g': [gameId],
          since: Math.floor(Date.now() / 1000) - 45
        },
        () => {
          finish();
        }
      );

      const timeout = setTimeout(() => {
        finish();
      }, 1500);

      const finish = () => {
        clearTimeout(timeout);
        unsubscribe();
        this.pool.unsubscribe(subId);
        resolve(Array.from(lobbiesMap.values()).map((v) => v.info));
      };
    });
  }

  async createLobby(options: CreateLobbyOptions): Promise<ILobbySession> {
    const roomId = 'nostr_' + Math.random().toString(36).substring(2, 12);
    const session = new NostrLobbySession(this.pool, this.keyPair, {
      roomId,
      isHost: true,
      gameId: options.gameId || 'game',
      hostUserId: this.keyPair.publicKey,
      maxPlayers: options.maxPlayers ?? 4,
      metadata: { name: options.name, ...options.metadata },
      nickname: options.nickname || 'Gracz'
    });
    return session;
  }

  async joinLobby(roomId: string, nickname?: string): Promise<ILobbySession> {
    const session = new NostrLobbySession(this.pool, this.keyPair, {
      roomId,
      isHost: false,
      gameId: 'game',
      hostUserId: '',
      nickname: nickname || 'Gracz'
    });
    return session;
  }
}
