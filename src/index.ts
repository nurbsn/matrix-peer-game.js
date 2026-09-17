// Core exports
export { GameNetClient, GameNetClientOptions, GameNetClientEvents } from './core/GameNetClient';
export { TypedEventEmitter, EventHandler } from './core/events';

// Matrix module exports
export { MatrixClient, MatrixClientEvents } from './matrix/MatrixClient';
export * from './matrix/types';

// Lobby module exports
export { LobbyRoom, LobbyRoomEvents } from './lobby/LobbyRoom';
export { LobbyDiscovery, LobbySearchOptions } from './lobby/LobbyDiscovery';

// Peer module exports
export { PeerManager, PeerManagerEvents } from './peer/PeerManager';
export { PacketSerializer } from './peer/packet';
export * from './peer/types';

// Game Engines
export {
  RealtimeEngine,
  RealtimeEngineOptions,
  RealtimeEngineEvents,
  EntitySnapshot,
  Vector2State,
  Vector3State
} from './engines/RealtimeEngine';

export {
  LockstepEngine,
  LockstepEngineOptions,
  LockstepEngineEvents,
  LockstepCommand
} from './engines/LockstepEngine';

export {
  TurnBasedEngine,
  TurnBasedEngineOptions,
  TurnBasedEngineEvents,
  TurnAction
} from './engines/TurnBasedEngine';

export {
  SharedStateEngine,
  SharedStateOptions,
  SharedStateEvents,
  StateChangeOperation
} from './engines/SharedStateEngine';

// Import for window attachment
import { GameNetClient } from './core/GameNetClient';
import { MatrixClient } from './matrix/MatrixClient';
import { LobbyRoom } from './lobby/LobbyRoom';
import { LobbyDiscovery } from './lobby/LobbyDiscovery';
import { PeerManager } from './peer/PeerManager';
import { PacketSerializer } from './peer/packet';
import { RealtimeEngine } from './engines/RealtimeEngine';
import { LockstepEngine } from './engines/LockstepEngine';
import { TurnBasedEngine } from './engines/TurnBasedEngine';
import { SharedStateEngine } from './engines/SharedStateEngine';
import { PacketType } from './peer/types';

// Create bundle namespace for flat browser <script> usage
const MatrixPeerGame = {
  Client: GameNetClient,
  GameNetClient,
  MatrixClient,
  LobbyRoom,
  LobbyDiscovery,
  PeerManager,
  PacketSerializer,
  PacketType,
  RealtimeEngine,
  LockstepEngine,
  TurnBasedEngine,
  SharedStateEngine
};

// Expose globally if running in a browser window
if (typeof window !== 'undefined') {
  (window as any).MatrixPeerGame = MatrixPeerGame;
}

export default MatrixPeerGame;
