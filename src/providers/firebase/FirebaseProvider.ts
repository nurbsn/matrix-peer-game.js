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

export interface FirebaseConfig {
  databaseURL: string;
  apiKey?: string;
  projectId?: string;
}

export class FirebaseLobbySession extends TypedEventEmitter<LobbySessionEvents> implements ILobbySession {
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
  private eventSource: EventSource | null = null;
  private heartbeatTimer: any = null;

  constructor(
    private databaseURL: string,
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

  private cleanDbUrl(): string {
    return this.databaseURL.replace(/\/+$/, '');
  }

  private initNetwork(): void {
    const eventsUrl = `${this.cleanDbUrl()}/games/${this.gameId}/rooms/${this.roomId}/events.json`;
    if (typeof EventSource !== 'undefined') {
      try {
        this.eventSource = new EventSource(eventsUrl);
        this.eventSource.addEventListener('put', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            if (data.data) {
              this.handleRawData(data.data);
            }
          } catch {}
        });
      } catch {}
    }

    if (this.isHost) {
      this.syncLobbyState();
      this.heartbeatTimer = setInterval(() => this.syncLobbyState(), 6000);
    } else {
      const self = this._players.get(this.myUserId);
      if (self) {
        this.pushEvent({ type: 'player_update', player: self });
      }
    }
  }

  private async pushEvent(eventData: any): Promise<void> {
    const url = `${this.cleanDbUrl()}/games/${this.gameId}/rooms/${this.roomId}/events.json`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
    } catch {}
  }

  private async syncLobbyState(): Promise<void> {
    const lobbyUrl = `${this.cleanDbUrl()}/games/${this.gameId}/lobbies/${this.roomId}.json`;
    const info: LobbyInfo = {
      roomId: this.roomId,
      name: this.metadata.name || 'Firebase Lobby',
      gameId: this.gameId,
      hostNickname: this._players.get(this.hostUserId)?.nickname || 'Host',
      numPlayers: this._players.size,
      maxPlayers: this.maxPlayers,
      status: this._status,
      metadata: { ...this.metadata, hostPeerId: this._hostPeerId }
    };
    try {
      await fetch(lobbyUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info)
      });
    } catch {}
  }

  private handleRawData(data: any): void {
    if (!data) return;
    const items = typeof data === 'object' ? Object.values(data) : [];
    for (const msg of items as any[]) {
      if (!msg || typeof msg !== 'object') continue;
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
        } else {
          this.emit('playerUpdated', p);
        }
      } else if (msg.type === 'chat' && msg.message) {
        const chatMsg = msg.message as LobbyChatMessage;
        if (!this._chatMessages.some((m) => m.id === chatMsg.id)) {
          this._chatMessages.push(chatMsg);
          this.emit('chatMessage', chatMsg);
        }
      } else if (msg.type === 'start_game') {
        this._status = 'in_game';
        if (msg.hostPeerId) this._hostPeerId = msg.hostPeerId;
        this.emit('gameStarted', {
          hostPeerId: msg.hostPeerId || this._hostPeerId,
          metadata: msg.metadata || {}
        });
      }
    }
  }

  async setReady(ready: boolean, data?: Record<string, any>): Promise<void> {
    const self = this._players.get(this.myUserId);
    if (!self) return;
    self.isReady = ready;
    if (data) self.data = { ...self.data, ...data };
    await this.pushEvent({ type: 'player_update', player: self });
    this.emit('playerUpdated', self);
  }

  async setPeerId(peerId: string): Promise<void> {
    const self = this._players.get(this.myUserId);
    if (!self) return;
    self.peerId = peerId;
    if (this.isHost) {
      this._hostPeerId = peerId;
      this.emit('hostPeerIdAvailable', peerId);
      this.syncLobbyState();
    }
    await this.pushEvent({ type: 'player_update', player: self });
  }

  async sendChatMessage(text: string): Promise<void> {
    const self = this._players.get(this.myUserId);
    const chatMsg: LobbyChatMessage = {
      id: Math.random().toString(36).substring(2, 10),
      senderUserId: this.myUserId,
      senderNickname: self?.nickname || 'Gracz',
      text,
      timestamp: Date.now()
    };
    await this.pushEvent({ type: 'chat', message: chatMsg });
  }

  async startGame(metadata?: Record<string, any>): Promise<void> {
    if (!this.isHost) return;
    this._status = 'in_game';
    this.syncLobbyState();
    await this.pushEvent({
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
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
    }
    if (this.isHost) {
      const lobbyUrl = `${this.cleanDbUrl()}/games/${this.gameId}/lobbies/${this.roomId}.json`;
      try { await fetch(lobbyUrl, { method: 'DELETE' }); } catch {}
    }
  }
}

export class FirebaseLobbyProvider extends TypedEventEmitter<LobbyProviderEvents> implements ILobbyProvider {
  readonly providerType = 'firebase' as const;
  private databaseURL: string;
  private myUserId: string;
  private _isConnected = false;

  constructor(config?: FirebaseConfig | string) {
    super();
    if (typeof config === 'string') {
      this.databaseURL = config;
    } else if (config?.databaseURL) {
      this.databaseURL = config.databaseURL;
    } else {
      // Fallback demo sandbox
      this.databaseURL = 'https://matrix-peer-game-default-rtdb.firebaseio.com';
    }
    this.myUserId = 'fb_u_' + Math.random().toString(36).substring(2, 10);
  }

  get currentUserId(): string | null {
    return this.myUserId;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  private cleanDbUrl(): string {
    return this.databaseURL.replace(/\/+$/, '');
  }

  async connect(): Promise<void> {
    this._isConnected = true;
    this.emit('connected', undefined);
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
    this.emit('disconnected', undefined);
  }

  async listLobbies(gameId: string): Promise<LobbyInfo[]> {
    const url = `${this.cleanDbUrl()}/games/${gameId}/lobbies.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data || typeof data !== 'object') return [];
      return Object.values(data) as LobbyInfo[];
    } catch {
      return [];
    }
  }

  async createLobby(options: CreateLobbyOptions): Promise<ILobbySession> {
    const roomId = 'fb_r_' + Math.random().toString(36).substring(2, 10);
    const session = new FirebaseLobbySession(this.databaseURL, this.myUserId, {
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
    const session = new FirebaseLobbySession(this.databaseURL, this.myUserId, {
      roomId,
      isHost: false,
      gameId: 'game',
      hostUserId: '',
      nickname: nickname || 'Gracz'
    });
    return session;
  }
}
