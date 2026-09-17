import { TypedEventEmitter } from './events';
import { MatrixClient } from '../matrix/MatrixClient';
import { MatrixAuth, LobbyInfo, CreateLobbyOptions } from '../matrix/types';
import { LobbyRoom } from '../lobby/LobbyRoom';
import { LobbyDiscovery } from '../lobby/LobbyDiscovery';
import { PeerManager } from '../peer/PeerManager';
import { ChannelReliability, PeerManagerOptions } from '../peer/types';
import { PacketSerializer } from '../peer/packet';
import { PacketType } from '../peer/types';
import { RealtimeEngine, RealtimeEngineOptions } from '../engines/RealtimeEngine';
import { LockstepEngine, LockstepEngineOptions } from '../engines/LockstepEngine';
import { TurnBasedEngine, TurnBasedEngineOptions } from '../engines/TurnBasedEngine';
import { SharedStateEngine, SharedStateOptions } from '../engines/SharedStateEngine';

export interface GameNetClientOptions {
  homeserver?: string;
  gameId?: string;
  peerConfig?: any;
}

export interface GameNetClientEvents {
  authenticated: MatrixAuth;
  lobbyJoined: LobbyRoom;
  peerConnected: string;
  peerDisconnected: string;
  gameData: { senderPeerId: string; data: any; channel: ChannelReliability };
  gameBinary: { senderPeerId: string; type: PacketType; payload: Uint8Array; timestamp: number; seq: number };
  pingUpdate: { peerId: string; ping: number };
  error: Error;
}

export class GameNetClient extends TypedEventEmitter<GameNetClientEvents> {
  readonly matrix: MatrixClient;
  readonly gameId: string;
  readonly peerConfig?: any;

  private currentLobby: LobbyRoom | null = null;
  private peerManager: PeerManager | null = null;

  constructor(options: GameNetClientOptions = {}) {
    super();
    this.gameId = options.gameId || 'matrix-peer-game';
    this.matrix = new MatrixClient(options.homeserver || 'https://matrix.org');
    this.peerConfig = options.peerConfig;

    this.setupMatrixEvents();
  }

  get lobby(): LobbyRoom | null {
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
    return this.matrix.currentUserId;
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
   * Restore existing session with token
   */
  restoreSession(auth: MatrixAuth): void {
    this.matrix.setAuth(auth);
    this.matrix.startSync();
    this.emit('authenticated', auth);
  }

  /**
   * List available public game lobbies for this game
   */
  async listLobbies(limit = 20): Promise<LobbyInfo[]> {
    return LobbyDiscovery.searchLobbies(this.matrix, {
      gameId: this.gameId,
      limit
    });
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
  }): Promise<LobbyRoom> {
    const createOpts: CreateLobbyOptions = {
      name: options.name,
      topic: options.topic,
      gameId: this.gameId,
      maxPlayers: options.maxPlayers ?? 4,
      isPublic: options.isPublic ?? true,
      metadata: options.metadata
    };

    const roomId = await this.matrix.createLobbyRoom(createOpts);
    const lobby = new LobbyRoom(this.matrix, roomId, {
      gameId: this.gameId,
      hostUserId: this.matrix.currentUserId || '',
      maxPlayers: createOpts.maxPlayers,
      metadata: createOpts.metadata,
      status: 'waiting'
    });

    this.currentLobby = lobby;
    this.initPeerNetwork(true);
    this.emit('lobbyJoined', lobby);
    return lobby;
  }

  /**
   * Join an existing lobby room by its Matrix room ID or alias
   */
  async joinLobby(roomIdOrAlias: string): Promise<LobbyRoom> {
    const roomId = await this.matrix.joinRoom(roomIdOrAlias);
    const lobby = new LobbyRoom(this.matrix, roomId, {
      gameId: this.gameId,
      status: 'waiting'
    });

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
}
