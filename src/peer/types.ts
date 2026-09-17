export type NetworkTopology = 'star' | 'mesh';

export type ChannelReliability = 'reliable' | 'unreliable';

export enum PacketType {
  // System packets
  PING = 1,
  PONG = 2,
  HANDSHAKE = 3,
  HANDSHAKE_ACK = 4,

  // High-level game packets
  GAME_JSON = 10,
  GAME_BINARY = 11,
  
  // Specialized game engines
  TURN_ACTION = 20,
  TURN_END = 21,
  
  LOCKSTEP_COMMAND = 30,
  LOCKSTEP_TICK_ACK = 31,
  
  REALTIME_SNAPSHOT = 40,
  REALTIME_INPUT = 41,

  SHARED_STATE_SET = 50,
  SHARED_STATE_SYNC = 51
}

export interface NetworkPacket<T = any> {
  type: PacketType;
  senderPeerId: string;
  seq?: number;
  timestamp: number;
  data: T;
}

export interface PeerConnectionStats {
  peerId: string;
  ping: number;
  lastPingTimestamp: number;
  bytesSent: number;
  bytesReceived: number;
  connectedAt: number;
}

export interface PeerManagerOptions {
  peerId?: string;
  topology?: NetworkTopology;
  isHost?: boolean;
  debug?: boolean;
  peerConfig?: any; // Custom STUN/TURN ICE servers if needed
  pingIntervalMs?: number;
}
