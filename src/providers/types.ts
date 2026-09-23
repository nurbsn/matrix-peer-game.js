import { TypedEventEmitter } from '../core/events';

export type ProviderType = 'matrix' | 'nostr' | 'mqtt' | 'firebase' | 'direct';

export interface LobbyPlayer {
  userId: string;
  nickname: string;
  isHost: boolean;
  isReady: boolean;
  peerId?: string;
  data?: Record<string, any>;
  customData?: Record<string, any>;
}

export interface LobbyChatMessage {
  id?: string;
  senderUserId: string;
  senderNickname: string;
  text: string;
  timestamp: number;
}

export interface LobbyInfo {
  roomId: string;
  name: string;
  topic?: string;
  gameId: string;
  hostNickname?: string;
  hostUserId?: string;
  hostPeerId?: string;
  numPlayers?: number;
  numMembers?: number;
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'in_game' | 'closed';
  metadata?: Record<string, any>;
}

export interface CreateLobbyOptions {
  name: string;
  topic?: string;
  gameId?: string;
  maxPlayers?: number;
  isPublic?: boolean;
  metadata?: Record<string, any>;
  nickname?: string;
}

export interface LobbySessionEvents {
  playerJoined: LobbyPlayer;
  playerLeft: string; // userId
  playerUpdated: LobbyPlayer;
  hostPeerIdAvailable: string; // hostPeerId
  gameStarted: { hostPeerId?: string; metadata: Record<string, any> };
  lobbyUpdated: any;
  chatMessage: LobbyChatMessage;
  error: Error;
}

export interface ILobbySession extends TypedEventEmitter<LobbySessionEvents> {
  readonly roomId: string;
  readonly isHost: boolean;
  readonly players: LobbyPlayer[];
  readonly chatMessages: LobbyChatMessage[];
  readonly status: 'waiting' | 'starting' | 'in_game';
  readonly hostPeerId?: string;
  readonly hostUserId: string;
  readonly gameId: string;
  readonly maxPlayers: number;
  readonly metadata: Record<string, any>;

  setReady(ready: boolean, data?: Record<string, any>): Promise<void>;
  setPeerId(peerId: string): Promise<void>;
  sendChatMessage(text: string): Promise<void>;
  startGame(metadata?: Record<string, any>): Promise<void>;
  leave(): Promise<void>;
}

export interface LobbyProviderEvents {
  connected: void;
  disconnected: void;
  error: Error;
}

export interface ILobbyProvider extends TypedEventEmitter<LobbyProviderEvents> {
  readonly providerType: ProviderType;
  readonly currentUserId: string | null;
  readonly isConnected: boolean;

  connect(authOptions?: any): Promise<void>;
  disconnect(): Promise<void>;

  listLobbies(gameId: string): Promise<LobbyInfo[]>;
  createLobby(options: CreateLobbyOptions): Promise<ILobbySession>;
  joinLobby(roomId: string, nickname?: string): Promise<ILobbySession>;

  savePlayerData?(key: string, data: any): Promise<void>;
  loadPlayerData?(key: string): Promise<any | null>;
}

export interface PlayerData {
  nickname?: string;
  avatar?: string;
  stats?: Record<string, number>;
  saveState?: Record<string, any>;
  updatedAt?: number;
  [key: string]: any;
}
