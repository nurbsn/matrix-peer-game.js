export interface MatrixAuth {
  userId: string;
  accessToken: string;
  deviceId?: string;
  homeserver: string;
}

export interface MatrixPublicRoom {
  room_id: string;
  name?: string;
  topic?: string;
  num_joined_members: number;
  world_readable: boolean;
  guest_can_join: boolean;
  avatar_url?: string;
  canonical_alias?: string;
}

export interface MatrixPublicRoomsResponse {
  chunk: MatrixPublicRoom[];
  next_batch?: string;
  total_room_count_estimate?: number;
}

export interface MatrixEvent {
  type: string;
  sender: string;
  content: Record<string, any>;
  origin_server_ts: number;
  event_id: string;
  state_key?: string;
  room_id?: string;
}

export interface MatrixSyncRoomState {
  events: MatrixEvent[];
}

export interface MatrixSyncTimeline {
  events: MatrixEvent[];
  limited?: boolean;
  prev_batch?: string;
}

export interface MatrixJoinedRoomSync {
  state: MatrixSyncRoomState;
  timeline: MatrixSyncTimeline;
  unread_notifications?: {
    notification_count?: number;
    highlight_count?: number;
  };
}

export interface MatrixSyncResponse {
  next_batch: string;
  rooms?: {
    join?: Record<string, MatrixJoinedRoomSync>;
    invite?: Record<string, any>;
    leave?: Record<string, any>;
  };
}

export {
  LobbyPlayer,
  LobbyChatMessage,
  LobbyInfo,
  CreateLobbyOptions
} from '../providers/types';

export interface LobbyStateEventContent {
  gameId: string;
  hostUserId: string;
  hostPeerId?: string;
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'in_game';
  metadata: Record<string, any>;
}

export interface PlayerStateEventContent {
  nickname: string;
  peerId?: string;
  isReady: boolean;
  customData?: Record<string, any>;
}

