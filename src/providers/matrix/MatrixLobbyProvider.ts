import { TypedEventEmitter } from '../../core/events';
import { ILobbyProvider, ILobbySession, LobbyInfo, CreateLobbyOptions, LobbyProviderEvents } from '../types';
import { MatrixClient } from '../../matrix/MatrixClient';
import { LobbyRoom } from '../../lobby/LobbyRoom';
import { LobbyDiscovery } from '../../lobby/LobbyDiscovery';

export class MatrixLobbyProvider extends TypedEventEmitter<LobbyProviderEvents> implements ILobbyProvider {
  readonly providerType = 'matrix' as const;
  readonly matrix: MatrixClient;

  constructor(homeserver = 'https://matrix.org') {
    super();
    this.matrix = new MatrixClient(homeserver);
    this.matrix.on('error', (err) => this.emit('error', err));
  }

  get currentUserId(): string | null {
    return this.matrix.currentUserId;
  }

  get isConnected(): boolean {
    return this.matrix.isAuthenticated;
  }

  async connect(authOptions?: any): Promise<void> {
    if (authOptions?.token) {
      await this.matrix.loginWithToken(authOptions.token, authOptions.userId);
    } else if (authOptions?.username && authOptions?.password) {
      await this.matrix.loginWithPassword(authOptions.username, authOptions.password);
    } else if (authOptions?.guestNickname) {
      await this.matrix.registerGuest(authOptions.guestNickname);
    }
    this.matrix.startSync();
    this.emit('connected', undefined);
  }

  async disconnect(): Promise<void> {
    this.matrix.stopSync();
    this.emit('disconnected', undefined);
  }

  async listLobbies(gameId: string): Promise<LobbyInfo[]> {
    const list = await LobbyDiscovery.searchLobbies(this.matrix, { gameId, limit: 30 });
    return list.map(l => ({
      roomId: l.roomId,
      name: l.name,
      gameId: l.gameId,
      hostNickname: l.hostNickname || 'Host',
      numPlayers: (l as any).numJoinedMembers ?? (l as any).numMembers ?? 1,
      maxPlayers: l.maxPlayers,
      status: l.status,
      metadata: l.metadata
    }));
  }

  async createLobby(options: CreateLobbyOptions): Promise<ILobbySession> {
    const roomId = await this.matrix.createLobbyRoom({
      name: options.name,
      topic: options.topic,
      gameId: options.gameId || 'game',
      maxPlayers: options.maxPlayers ?? 4,
      isPublic: options.isPublic ?? true,
      metadata: options.metadata
    });

    const lobby = new LobbyRoom(this.matrix, roomId, {
      gameId: options.gameId || 'game',
      hostUserId: this.matrix.currentUserId || '',
      maxPlayers: options.maxPlayers ?? 4,
      metadata: options.metadata,
      status: 'waiting'
    });

    return lobby as unknown as ILobbySession;
  }

  async joinLobby(roomId: string, nickname?: string): Promise<ILobbySession> {
    const joinedRoomId = await this.matrix.joinRoom(roomId);
    if (nickname) {
      try {
        await this.matrix.setDisplayName(nickname);
      } catch {}
    }

    const lobby = new LobbyRoom(this.matrix, joinedRoomId, {
      status: 'waiting'
    });

    return lobby as unknown as ILobbySession;
  }
}
