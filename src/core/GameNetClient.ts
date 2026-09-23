import { TypedEventEmitter } from './events';
import { MatrixClient } from '../matrix/MatrixClient';
import { MatrixAuth } from '../matrix/types';
import { PeerManager } from '../peer/PeerManager';
import { ChannelReliability, PeerManagerOptions } from '../peer/types';
import { PacketSerializer } from '../peer/packet';
import { PacketType } from '../peer/types';
import { RealtimeEngine, RealtimeEngineOptions } from '../engines/RealtimeEngine';
import { LockstepEngine, LockstepEngineOptions } from '../engines/LockstepEngine';
import { TurnBasedEngine, TurnBasedEngineOptions } from '../engines/TurnBasedEngine';
import { SharedStateEngine, SharedStateOptions } from '../engines/SharedStateEngine';
import {
  ILobbyProvider,
  ILobbySession,
  ProviderType,
  LobbyInfo as ProviderLobbyInfo
} from '../providers/types';
import { MatrixLobbyProvider } from '../providers/matrix/MatrixLobbyProvider';
import { NostrLobbyProvider } from '../providers/nostr/NostrProvider';
import { MqttLobbyProvider } from '../providers/mqtt/MqttProvider';
import { FirebaseLobbyProvider, FirebaseConfig } from '../providers/firebase/FirebaseProvider';

export interface GameNetClientOptions {
  provider?: ProviderType;
  homeserver?: string;
  nostrRelays?: string[];
  mqttBroker?: string;
  firebaseConfig?: FirebaseConfig | string;
  gameId?: string;
  peerConfig?: any;
}

export interface GameNetClientEvents {
  authenticated: MatrixAuth;
  lobbyJoined: ILobbySession;
  peerConnected: string;
  peerDisconnected: string;
  gameData: { senderPeerId: string; data: any; channel: ChannelReliability };
  gameBinary: { senderPeerId: string; type: PacketType; payload: Uint8Array; timestamp: number; seq: number };
  pingUpdate: { peerId: string; ping: number };
  error: Error;
}

export class GameNetClient extends TypedEventEmitter<GameNetClientEvents> {
  readonly providerType: ProviderType;
  readonly lobbyProvider: ILobbyProvider;
  readonly matrix: MatrixClient;
  readonly gameId: string;
  readonly peerConfig?: any;

  private currentLobby: ILobbySession | null = null;
  private peerManager: PeerManager | null = null;

  constructor(options: GameNetClientOptions = {}) {
    super();
    this.gameId = options.gameId || 'matrix-peer-game';
    this.providerType = options.provider || 'matrix';
    this.peerConfig = options.peerConfig;

    if (this.providerType === 'nostr') {
      const p = new NostrLobbyProvider(options.nostrRelays);
      this.lobbyProvider = p;
      this.matrix = new MatrixClient(options.homeserver || 'https://matrix.org');
      p.connect().catch(() => {});
    } else if (this.providerType === 'mqtt') {
      const p = new MqttLobbyProvider(options.mqttBroker);
      this.lobbyProvider = p;
      this.matrix = new MatrixClient(options.homeserver || 'https://matrix.org');
      p.connect().catch(() => {});
    } else if (this.providerType === 'firebase') {
      const p = new FirebaseLobbyProvider(options.firebaseConfig);
      this.lobbyProvider = p;
      this.matrix = new MatrixClient(options.homeserver || 'https://matrix.org');
      p.connect().catch(() => {});
    } else {
      const p = new MatrixLobbyProvider(options.homeserver || 'https://matrix.org');
      this.lobbyProvider = p;
      this.matrix = p.matrix;
      this.setupMatrixEvents();
    }

    this.lobbyProvider.on('error', (err) => {
      this.emit('error', err);
    });
  }

  get lobby(): ILobbySession | null {
    return this.currentLobby;
  }

  get peer(): PeerManager | null {
    return this.peerManager;
  }

  get isHost(): boolean {
    return this.currentLobby?.isHost ?? false;
  }

  get myPeerId(): string | null {
    return this.peerManager?.peerId ?? null;
  }

  get currentUserId(): string | null {
    return this.lobbyProvider.currentUserId || this.matrix.currentUserId;
  }

  private setupMatrixEvents(): void {
    this.matrix.on('error', (err) => {
      this.emit('error', err);
    });
  }

  /**
   * Register as a guest without requiring an account or email
   */
  async loginAsGuest(nickname?: string): Promise<MatrixAuth> {
    const auth = await this.matrix.registerGuest(nickname);
    this.matrix.startSync();
    this.emit('authenticated', auth);
    return auth;
  }

  /**
   * Log in using existing Matrix account
   */
  async loginWithPassword(username: string, password: string): Promise<MatrixAuth> {
    const auth = await this.matrix.loginWithPassword(username, password);
    this.matrix.startSync();
    this.emit('authenticated', auth);
    return auth;
  }

  /**
   * Log in using an existing Matrix Access Token (retrieves userId automatically)
   */
  async loginWithToken(accessToken: string, userId?: string): Promise<MatrixAuth> {
    const auth = await this.matrix.loginWithToken(accessToken, userId);
    this.matrix.startSync();
    this.emit('authenticated', auth);
    return auth;
  }

  /**
   * Restore existing session with token
   */
  restoreSession(auth: MatrixAuth): void {
    this.matrix.setAuth(auth);
    this.matrix.startSync();
    this.emit('authenticated', auth);
  }

  /**
   * Register a new user account with username and password
   */
  async registerUser(username: string, password: string, nickname?: string): Promise<MatrixAuth> {
    const auth = await this.matrix.registerUser(username, password, nickname);
    this.matrix.startSync();
    this.emit('authenticated', auth);
    return auth;
  }

  /**
   * Save current authentication to localStorage
   */
  saveSession(key = 'matrix_peer_game_auth'): boolean {
    if (!this.matrix.currentAuth) return false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(this.matrix.currentAuth));
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Automatically restore session from localStorage if available
   */
  autoLogin(key = 'matrix_peer_game_auth'): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(key);
        if (stored) {
          const auth = JSON.parse(stored);
          if (auth.accessToken && auth.userId) {
            this.restoreSession(auth);
            return true;
          }
        }
      }
    } catch {}
    return false;
  }

  /**
   * Clear session from localStorage
   */
  clearSession(key = 'matrix_peer_game_auth'): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
  }

  /**
   * List available public game lobbies for this game
   */
  async listLobbies(_limit = 20): Promise<ProviderLobbyInfo[]> {
    return this.lobbyProvider.listLobbies(this.gameId);
  }

  /**
   * Create a new multiplayer game lobby
   */
  async createLobby(options: {
    name: string;
    topic?: string;
    maxPlayers?: number;
    isPublic?: boolean;
    metadata?: Record<string, any>;
    nickname?: string;
  }): Promise<ILobbySession> {
    const lobby = await this.lobbyProvider.createLobby({
      name: options.name,
      topic: options.topic,
      gameId: this.gameId,
      maxPlayers: options.maxPlayers ?? 4,
      isPublic: options.isPublic ?? true,
      metadata: options.metadata,
      nickname: options.nickname
    });

    this.currentLobby = lobby;
    this.initPeerNetwork(true);
    this.emit('lobbyJoined', lobby);
    return lobby;
  }

  /**
   * Join an existing lobby room by its room ID
   */
  async joinLobby(roomIdOrAlias: string, nickname?: string): Promise<ILobbySession> {
    const lobby = await this.lobbyProvider.joinLobby(roomIdOrAlias, nickname);

    this.currentLobby = lobby;
    this.initPeerNetwork(false);

    // Listen for host peer ID announcement to establish direct WebRTC connection
    lobby.on('hostPeerIdAvailable', (hostPeerId) => {
      if (this.peerManager && !lobby.isHost) {
        this.peerManager.connectToPeer(hostPeerId);
      }
    });

    lobby.on('gameStarted', ({ hostPeerId }) => {
      if (hostPeerId && this.peerManager && !lobby.isHost) {
        this.peerManager.connectToPeer(hostPeerId);
      }
    });

    this.emit('lobbyJoined', lobby);
    return lobby;
  }

  private initPeerNetwork(isHost: boolean): void {
    if (this.peerManager) {
      this.peerManager.destroy();
    }

    const peerOpts: PeerManagerOptions = {
      isHost,
      peerConfig: this.peerConfig
    };

    this.peerManager = new PeerManager(peerOpts);

    this.peerManager.on('ready', async (peerId) => {
      if (this.currentLobby) {
        await this.currentLobby.setPeerId(peerId);
        // If client joins an already-known host
        if (!isHost && this.currentLobby.hostPeerId) {
          this.peerManager?.connectToPeer(this.currentLobby.hostPeerId);
        }
      }
    });

    this.peerManager.on('peerConnected', (peerId) => {
      this.emit('peerConnected', peerId);
    });

    this.peerManager.on('peerDisconnected', (peerId) => {
      this.emit('peerDisconnected', peerId);
    });

    this.peerManager.on('data', ({ senderPeerId, packet, channel }) => {
      if (packet.type === PacketType.GAME_JSON) {
        this.emit('gameData', {
          senderPeerId,
          data: packet.data,
          channel
        });
      }
    });

    this.peerManager.on('binary', ({ senderPeerId, type, timestamp, seq, payload }) => {
      this.emit('gameBinary', {
        senderPeerId,
        type,
        timestamp,
        seq,
        payload
      });
    });

    this.peerManager.on('pingUpdate', ({ peerId, ping }) => {
      this.emit('pingUpdate', { peerId, ping });
    });

    this.peerManager.on('error', (err) => {
      this.emit('error', err);
    });
  }

  /**
   * Broadcast arbitrary game data to all connected players via WebRTC
   */
  broadcast(data: any, channel: ChannelReliability = 'reliable'): void {
    if (!this.peerManager) return;
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(PacketType.GAME_JSON, this.peerManager.peerId || '', data),
      channel
    );
  }

  /**
   * Send game data to a specific peer via WebRTC
   */
  sendTo(peerId: string, data: any, channel: ChannelReliability = 'reliable'): boolean {
    if (!this.peerManager) return false;
    return this.peerManager.sendJson(
      peerId,
      PacketSerializer.createJsonPacket(PacketType.GAME_JSON, this.peerManager.peerId || '', data),
      channel
    );
  }

  // --- Specialized Game Engine Constructors ---

  /**
   * Create RealtimeEngine (ideal for FPS, fast 2D/3D action, racers)
   */
  createRealtimeEngine(options: Partial<RealtimeEngineOptions> = {}): RealtimeEngine {
    if (!this.peerManager) throw new Error('PeerManager is not initialized; join or create a lobby first');
    return new RealtimeEngine({
      peerManager: this.peerManager,
      isHost: this.isHost,
      ...options
    });
  }

  /**
   * Create LockstepEngine (ideal for RTS, fighting games, deterministic simulations)
   */
  createLockstepEngine(options: Partial<LockstepEngineOptions> = {}): LockstepEngine {
    if (!this.peerManager) throw new Error('PeerManager is not initialized; join or create a lobby first');
    return new LockstepEngine({
      peerManager: this.peerManager,
      ...options
    });
  }

  /**
   * Create TurnBasedEngine (ideal for board, card, chess, turn-based games)
   */
  createTurnBasedEngine(options: Omit<TurnBasedEngineOptions, 'peerManager'>): TurnBasedEngine {
    if (!this.peerManager) throw new Error('PeerManager is not initialized; join or create a lobby first');
    return new TurnBasedEngine({
      peerManager: this.peerManager,
      ...options
    });
  }

  /**
   * Create SharedStateEngine (ideal for whiteboard, kalambury, clickers, party games)
   */
  createSharedState(options: Partial<SharedStateOptions> = {}): SharedStateEngine {
    if (!this.peerManager) throw new Error('PeerManager is not initialized; join or create a lobby first');
    return new SharedStateEngine({
      peerManager: this.peerManager,
      isHost: this.isHost,
      ...options
    });
  }

  /**
   * Leave the current game lobby and clean up network connections
   */
  async leave(): Promise<void> {
    if (this.currentLobby) {
      await this.currentLobby.leave();
      this.currentLobby = null;
    }
    if (this.peerManager) {
      this.peerManager.destroy();
      this.peerManager = null;
    }
  }

  /**
   * Disconnect completely
   */
  destroy(): void {
    this.leave();
    this.matrix.stopSync();
    this.removeAllListeners();
  }

  /**
   * Save player data / stats / savegame in the cloud or local storage
   * Supported across Firebase (RTDB), Matrix (Account Data), Nostr (NIP-78), and LocalStorage
   */
  async savePlayerData(key: string, data: any): Promise<void> {
    if (this.lobbyProvider && typeof this.lobbyProvider.savePlayerData === 'function') {
      try {
        await this.lobbyProvider.savePlayerData(key, data);
        return;
      } catch (err) {
        // Fall through to localStorage fallback
      }
    }
    if (typeof localStorage !== 'undefined') {
      const payload = {
        ...(typeof data === 'object' && data !== null ? data : { value: data }),
        _updatedAt: Date.now()
      };
      try {
        localStorage.setItem(`mpg_player_${this.gameId}_${key}`, JSON.stringify(payload));
      } catch {}
    }
  }

  /**
   * Load player data / stats / savegame from the cloud or local storage
   */
  async loadPlayerData<T = any>(key: string): Promise<T | null> {
    if (this.lobbyProvider && typeof this.lobbyProvider.loadPlayerData === 'function') {
      try {
        const remoteData = await this.lobbyProvider.loadPlayerData(key);
        if (remoteData !== null && remoteData !== undefined) {
          return remoteData as T;
        }
      } catch {}
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(`mpg_player_${this.gameId}_${key}`);
        if (raw) return JSON.parse(raw) as T;
      } catch {}
    }
    return null;
  }
}
