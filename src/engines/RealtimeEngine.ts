import { TypedEventEmitter } from '../core/events';
import { PeerManager } from '../peer/PeerManager';
import { PacketType } from '../peer/types';
import { PacketSerializer } from '../peer/packet';

export interface EntitySnapshot<T = any> {
  id: string | number;
  timestamp: number;
  state: T;
}

export interface RealtimeEngineOptions {
  peerManager: PeerManager;
  tickRate?: number; // How many updates per second (e.g. 30 or 60)
  interpolationDelayMs?: number; // Delay for smooth rendering (e.g. 50ms)
  isHost?: boolean;
}

export interface Vector2State {
  entityId: number;
  x: number;
  y: number;
  angle: number;
  timestamp: number;
}

export interface Vector3State {
  entityId: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  timestamp: number;
}

export interface RealtimeEngineEvents {
  entityUpdate: { entityId: string | number; state: any; senderPeerId: string };
  vector2Update: Vector2State & { senderPeerId: string };
  vector3Update: Vector3State & { senderPeerId: string };
  tick: number;
}

export class RealtimeEngine extends TypedEventEmitter<RealtimeEngineEvents> {
  readonly peerManager: PeerManager;
  readonly tickRate: number;
  readonly interpolationDelayMs: number;
  readonly isHost: boolean;

  private localEntities = new Map<string | number, any>();
  private remoteEntityHistory = new Map<string | number, EntitySnapshot[]>();
  private tickIntervalId: any = null;
  private currentTick = 0;

  constructor(options: RealtimeEngineOptions) {
    super();
    this.peerManager = options.peerManager;
    this.tickRate = options.tickRate ?? 30;
    this.interpolationDelayMs = options.interpolationDelayMs ?? 50;
    this.isHost = options.isHost ?? false;

    this.setupListeners();
    this.startTickLoop();
  }

  private setupListeners(): void {
    // 1. Listen for JSON real-time snapshots
    this.peerManager.on('data', ({ senderPeerId, packet }) => {
      if (packet.type === PacketType.REALTIME_SNAPSHOT) {
        const { entityId, state } = packet.data;
        this.recordSnapshot(entityId, state, packet.timestamp);
        this.emit('entityUpdate', { entityId, state, senderPeerId });
      }
    });

    // 2. Listen for ultra-compact Binary FPS / action packets
    this.peerManager.on('binary', ({ senderPeerId, type, payload, timestamp }) => {
      if (type === PacketType.REALTIME_SNAPSHOT) {
        // Check size: 14 bytes = Vector2, 18 bytes = Vector3
        if (payload.byteLength === 14) {
          const v2 = PacketSerializer.unpackVector2(payload);
          const state: Vector2State = { ...v2, timestamp };
          this.recordSnapshot(v2.entityId, v2, timestamp);
          this.emit('vector2Update', { ...state, senderPeerId });
        } else if (payload.byteLength === 18) {
          const v3 = PacketSerializer.unpackVector3(payload);
          const state: Vector3State = { ...v3, timestamp };
          this.recordSnapshot(v3.entityId, v3, timestamp);
          this.emit('vector3Update', { ...state, senderPeerId });
        }
      }
    });
  }

  private recordSnapshot(entityId: string | number, state: any, timestamp: number): void {
    let history = this.remoteEntityHistory.get(entityId);
    if (!history) {
      history = [];
      this.remoteEntityHistory.set(entityId, history);
    }

    history.push({ id: entityId, state, timestamp });

    // Keep only last 20 snapshots to prevent memory leaks
    if (history.length > 20) {
      history.shift();
    }
  }

  /**
   * Register or update a local entity's state (e.g. local player)
   */
  setLocalEntity(entityId: string | number, state: any): void {
    this.localEntities.set(entityId, state);
  }

  /**
   * Send 3D coordinates (position X, Y, Z + rotation Y) via ultra-fast binary packet
   * Total payload: only 18 bytes! Ideal for FPS / 3D games.
   */
  sendVector3(entityId: number, x: number, y: number, z: number, rotY: number): void {
    const payload = PacketSerializer.packVector3(entityId, x, y, z, rotY);
    this.peerManager.broadcastBinary(PacketType.REALTIME_SNAPSHOT, payload, 'unreliable');
    this.setLocalEntity(entityId, { x, y, z, rotY });
  }

  /**
   * Send 2D coordinates (position X, Y + angle) via ultra-fast binary packet
   * Total payload: only 14 bytes! Ideal for 2D arena / top-down shooters.
   */
  sendVector2(entityId: number, x: number, y: number, angle: number): void {
    const payload = PacketSerializer.packVector2(entityId, x, y, angle);
    this.peerManager.broadcastBinary(PacketType.REALTIME_SNAPSHOT, payload, 'unreliable');
    this.setLocalEntity(entityId, { x, y, angle });
  }

  /**
   * Send arbitrary JSON state for an entity over unreliable UDP WebRTC channel
   */
  broadcastEntityState(entityId: string | number, state: any): void {
    this.setLocalEntity(entityId, state);
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(
        PacketType.REALTIME_SNAPSHOT,
        this.peerManager.peerId || '',
        { entityId, state }
      ),
      'unreliable'
    );
  }

  /**
   * Get interpolated state for smooth rendering (eliminates jitter and stutter)
   */
  getInterpolatedPosition(entityId: string | number, customRenderTime?: number): { x: number; y: number; z?: number } | null {
    const history = this.remoteEntityHistory.get(entityId);
    if (!history || history.length === 0) return null;
    if (history.length === 1) return history[0].state;

    const renderTime = customRenderTime ?? (Date.now() - this.interpolationDelayMs);

    // Find the two snapshots surrounding renderTime
    let s0: EntitySnapshot | null = null;
    let s1: EntitySnapshot | null = null;

    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].timestamp <= renderTime) {
        s0 = history[i];
        s1 = history[i + 1] || history[i];
        break;
      }
    }

    if (!s0 || !s1) {
      return s0 ? s0.state : history[0].state;
    }

    if (s0 === s1 || s0.timestamp === s1.timestamp) {
      return s0.state;
    }

    const t = Math.max(0, Math.min(1, (renderTime - s0.timestamp) / (s1.timestamp - s0.timestamp)));

    // Linear interpolation (lerp)
    const lerp = (a: number, b: number, factor: number) => a + (b - a) * factor;

    const res: any = {
      x: lerp(s0.state.x, s1.state.x, t),
      y: lerp(s0.state.y, s1.state.y, t)
    };

    if (typeof s0.state.z === 'number' && typeof s1.state.z === 'number') {
      res.z = lerp(s0.state.z, s1.state.z, t);
    }

    return res;
  }

  private startTickLoop(): void {
    const intervalMs = Math.floor(1000 / this.tickRate);
    this.tickIntervalId = setInterval(() => {
      this.currentTick++;
      this.emit('tick', this.currentTick);

      // Automatically broadcast all local entities at tick rate
      for (const [id, state] of this.localEntities.entries()) {
        if (typeof state.z === 'number' && typeof id === 'number') {
          this.sendVector3(id, state.x, state.y, state.z, state.rotY ?? 0);
        } else if (typeof state.x === 'number' && typeof state.y === 'number' && typeof id === 'number') {
          this.sendVector2(id, state.x, state.y, state.angle ?? 0);
        } else {
          this.broadcastEntityState(id, state);
        }
      }
    }, intervalMs);
  }

  destroy(): void {
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
    this.localEntities.clear();
    this.remoteEntityHistory.clear();
    this.removeAllListeners();
  }
}
