import { TypedEventEmitter } from '../core/events';
import { MatrixClient } from '../matrix/MatrixClient';
import {
  LobbyChatMessage,
  LobbyPlayer,
  LobbyStateEventContent,
  PlayerStateEventContent
} from '../matrix/types';

export interface LobbyRoomEvents {
  playerJoined: LobbyPlayer;
  playerLeft: string; // userId
  playerUpdated: LobbyPlayer;
  hostPeerIdAvailable: string; // hostPeerId
  gameStarted: { hostPeerId?: string; metadata: Record<string, any> };
  lobbyUpdated: LobbyStateEventContent;
  chatMessage: LobbyChatMessage;
  error: Error;
}

export class LobbyRoom extends TypedEventEmitter<LobbyRoomEvents> {
  readonly roomId: string;
  readonly matrix: MatrixClient;
  private _hostUserId: string;
  private _hostPeerId?: string;
  private _gameId: string;
  private _status: 'waiting' | 'starting' | 'in_game' = 'waiting';
  private _maxPlayers: number;
  private _metadata: Record<string, any> = {};
  private _players = new Map<string, LobbyPlayer>();
  private _chatMessages: LobbyChatMessage[] = [];

  constructor(
    matrix: MatrixClient,
    roomId: string,
    initialState?: Partial<LobbyStateEventContent>
  ) {
    super();
    this.matrix = matrix;
    this.roomId = roomId;
    this._hostUserId = initialState?.hostUserId || matrix.currentUserId || '';
    this._hostPeerId = initialState?.hostPeerId;
    this._gameId = initialState?.gameId || 'generic';
    this._maxPlayers = initialState?.maxPlayers || 4;
    this._metadata = initialState?.metadata || {};
    this._status = initialState?.status || 'waiting';

    this.setupMatrixListeners();
  }

  get hostUserId(): string {
    return this._hostUserId;
  }

  get hostPeerId(): string | undefined {
    return this._hostPeerId;
  }

  get isHost(): boolean {
    return this.matrix.currentUserId === this._hostUserId;
  }

  get status(): 'waiting' | 'starting' | 'in_game' {
    return this._status;
  }

  get players(): LobbyPlayer[] {
    return Array.from(this._players.values());
  }

  get gameId(): string {
    return this._gameId;
  }

  get maxPlayers(): number {
    return this._maxPlayers;
  }

  get metadata(): Record<string, any> {
    return this._metadata;
  }

  get chatMessages(): LobbyChatMessage[] {
    return [...this._chatMessages];
  }

  private setupMatrixListeners(): void {
    this.matrix.on('roomMessage', ({ roomId, message }) => {
      if (roomId !== this.roomId) return;
      this._chatMessages.push(message);
      this.emit('chatMessage', message);
    });

    this.matrix.on('lobbyStateChange', ({ roomId, state }) => {
      if (roomId !== this.roomId) return;
      this.updateLobbyState(state);
    });

    this.matrix.on('playerStateChange', ({ roomId, userId, state }) => {
      if (roomId !== this.roomId) return;
      this.updatePlayerState(userId, state);
    });
  }

  private updateLobbyState(state: LobbyStateEventContent): void {
    const prevStatus = this._status;
    const prevHostPeerId = this._hostPeerId;

    this._hostUserId = state.hostUserId;
    this._hostPeerId = state.hostPeerId;
    this._status = state.status;
    this._maxPlayers = state.maxPlayers;
    this._metadata = state.metadata || {};

    if (state.hostPeerId && state.hostPeerId !== prevHostPeerId) {
      this.emit('hostPeerIdAvailable', state.hostPeerId);
    }

    if (state.status === 'in_game' && prevStatus !== 'in_game') {
      this.emit('gameStarted', {
        hostPeerId: this._hostPeerId,
        metadata: this._metadata
      });
    }

    this.emit('lobbyUpdated', state);
  }

  private updatePlayerState(userId: string, state: PlayerStateEventContent): void {
    const isNew = !this._players.has(userId);
    const player: LobbyPlayer = {
      userId,
      nickname: state.nickname || userId.split(':')[0].replace('@', ''),
      peerId: state.peerId,
      isReady: state.isReady ?? false,
      isHost: userId === this._hostUserId,
      customData: state.customData
    };

    this._players.set(userId, player);

    if (isNew) {
      this.emit('playerJoined', player);
    } else {
      this.emit('playerUpdated', player);
    }
  }

  /**
   * Set player readiness in the lobby
   */
  async setReady(isReady: boolean, customData?: Record<string, any>): Promise<void> {
    const userId = this.matrix.currentUserId;
    if (!userId) throw new Error('Not authenticated');

    const existing = this._players.get(userId);
    const content: PlayerStateEventContent = {
      nickname: existing?.nickname || userId.split(':')[0].replace('@', ''),
      peerId: existing?.peerId,
      isReady,
      customData: customData ?? existing?.customData
    };

    await this.matrix.setRoomState(this.roomId, 'm.game.player', userId, content);
    this.updatePlayerState(userId, content);
  }

  /**
   * Set or update this player's PeerJS ID
   */
  async setPeerId(peerId: string): Promise<void> {
    const userId = this.matrix.currentUserId;
    if (!userId) throw new Error('Not authenticated');

    const existing = this._players.get(userId);
    const content: PlayerStateEventContent = {
      nickname: existing?.nickname || userId.split(':')[0].replace('@', ''),
      peerId,
      isReady: existing?.isReady ?? false,
      customData: existing?.customData
    };

    await this.matrix.setRoomState(this.roomId, 'm.game.player', userId, content);
    this.updatePlayerState(userId, content);

    // If I am the host, also update the main room lobby state with hostPeerId
    if (this.isHost) {
      await this.setHostPeerId(peerId);
    }
  }

  /**
   * Set host peer ID (only callable by host)
   */
  async setHostPeerId(hostPeerId: string): Promise<void> {
    if (!this.isHost) throw new Error('Only the host can set hostPeerId');
    this._hostPeerId = hostPeerId;

    const content: LobbyStateEventContent = {
      gameId: this._gameId,
      hostUserId: this._hostUserId,
      hostPeerId,
      maxPlayers: this._maxPlayers,
      status: this._status,
      metadata: this._metadata
    };

    await this.matrix.setRoomState(this.roomId, 'm.game.lobby', '', content);
  }

  /**
   * Set custom player properties (e.g. skin, team, color)
   */
  async setCustomData(data: Record<string, any>): Promise<void> {
    const userId = this.matrix.currentUserId;
    if (!userId) throw new Error('Not authenticated');

    const existing = this._players.get(userId);
    const content: PlayerStateEventContent = {
      nickname: existing?.nickname || userId.split(':')[0].replace('@', ''),
      peerId: existing?.peerId,
      isReady: existing?.isReady ?? false,
      customData: { ...(existing?.customData || {}), ...data }
    };

    await this.matrix.setRoomState(this.roomId, 'm.game.player', userId, content);
    this.updatePlayerState(userId, content);
  }

  /**
   * Start the game (host only)
   */
  async startGame(): Promise<void> {
    if (!this.isHost) throw new Error('Only the host can start the game');

    this._status = 'in_game';
    const content: LobbyStateEventContent = {
      gameId: this._gameId,
      hostUserId: this._hostUserId,
      hostPeerId: this._hostPeerId,
      maxPlayers: this._maxPlayers,
      status: 'in_game',
      metadata: this._metadata
    };

    await this.matrix.setRoomState(this.roomId, 'm.game.lobby', '', content);
    this.emit('gameStarted', { hostPeerId: this._hostPeerId, metadata: this._metadata });
  }

  /**
   * Send a chat message into the lobby
   */
  async sendChatMessage(text: string): Promise<void> {
    await this.matrix.sendChatMessage(this.roomId, text);
  }

  /**
   * Leave this lobby
   */
  async leave(): Promise<void> {
    await this.matrix.leaveRoom(this.roomId);
    this._players.clear();
    this.removeAllListeners();
  }
}
