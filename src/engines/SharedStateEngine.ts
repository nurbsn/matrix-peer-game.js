import { TypedEventEmitter } from '../core/events';
import { PeerManager } from '../peer/PeerManager';
import { PacketType } from '../peer/types';
import { PacketSerializer } from '../peer/packet';

export interface StateChangeOperation {
  key: string;
  type: 'set' | 'push' | 'delete';
  value?: any;
  version: number;
  authorPeerId: string;
}

export interface SharedStateOptions {
  peerManager: PeerManager;
  initialState?: Record<string, any>;
  isHost?: boolean;
}

export interface SharedStateEvents {
  change: { key: string; value: any; authorPeerId: string };
  sync: Record<string, any>;
}

export class SharedStateEngine extends TypedEventEmitter<SharedStateEvents> {
  readonly peerManager: PeerManager;
  readonly isHost: boolean;

  private state: Record<string, any>;
  private keyVersions = new Map<string, number>();
  private keySubscribers = new Map<string, Set<(val: any, author: string) => void>>();

  constructor(options: SharedStateOptions) {
    super();
    this.peerManager = options.peerManager;
    this.isHost = options.isHost ?? false;
    this.state = { ...(options.initialState || {}) };

    for (const key of Object.keys(this.state)) {
      this.keyVersions.set(key, 1);
    }

    this.setupListeners();
  }

  private setupListeners(): void {
    // When a peer connects, host can send full state sync
    this.peerManager.on('peerConnected', (peerId) => {
      if (this.isHost) {
        this.peerManager.sendJson(
          peerId,
          PacketSerializer.createJsonPacket(PacketType.SHARED_STATE_SYNC, this.peerManager.peerId || '', {
            state: this.state,
            versions: Object.fromEntries(this.keyVersions.entries())
          }),
          'reliable'
        );
      }
    });

    this.peerManager.on('data', ({ packet }) => {
      if (packet.type === PacketType.SHARED_STATE_SET) {
        const op = packet.data as StateChangeOperation;
        this.applyOperation(op, false);
      } else if (packet.type === PacketType.SHARED_STATE_SYNC) {
        const { state, versions } = packet.data;
        this.applyFullSync(state, versions);
      }
    });
  }

  /**
   * Set a key-value pair and broadcast to all peers
   */
  set<T = any>(key: string, value: T): void {
    const currentVersion = this.keyVersions.get(key) || 0;
    const nextVersion = currentVersion + 1;

    const op: StateChangeOperation = {
      key,
      type: 'set',
      value,
      version: nextVersion,
      authorPeerId: this.peerManager.peerId || 'local'
    };

    this.applyOperation(op, true);
  }

  /**
   * Push an item into an array state value (e.g. canvas strokes, logs)
   */
  push<T = any>(key: string, item: T): void {
    const currentList = Array.isArray(this.state[key]) ? this.state[key] : [];
    const nextList = [...currentList, item];
    this.set(key, nextList);
  }

  /**
   * Get value by key
   */
  get<T = any>(key: string, defaultValue?: T): T {
    return (this.state[key] !== undefined ? this.state[key] : defaultValue) as T;
  }

  /**
   * Get entire state snapshot
   */
  getState(): Record<string, any> {
    return { ...this.state };
  }

  /**
   * Subscribe to changes on a specific key
   */
  subscribe<T = any>(key: string, callback: (value: T, authorPeerId: string) => void): () => void {
    let subs = this.keySubscribers.get(key);
    if (!subs) {
      subs = new Set();
      this.keySubscribers.set(key, subs);
    }
    subs.add(callback);

    // Unsubscribe function
    return () => {
      subs?.delete(callback);
      if (subs?.size === 0) {
        this.keySubscribers.delete(key);
      }
    };
  }

  private applyOperation(op: StateChangeOperation, broadcast: boolean): void {
    const localVer = this.keyVersions.get(op.key) || 0;

    // Conflict resolution: latest version wins
    if (op.version >= localVer) {
      this.state[op.key] = op.value;
      this.keyVersions.set(op.key, op.version);

      // Trigger key subscribers
      const subs = this.keySubscribers.get(op.key);
      if (subs) {
        for (const cb of subs) {
          try {
            cb(op.value, op.authorPeerId);
          } catch (e) {
            console.error('Error in state subscriber:', e);
          }
        }
      }

      this.emit('change', { key: op.key, value: op.value, authorPeerId: op.authorPeerId });

      if (broadcast) {
        this.peerManager.broadcastJson(
          PacketSerializer.createJsonPacket(PacketType.SHARED_STATE_SET, this.peerManager.peerId || '', op),
          'reliable'
        );
      }
    }
  }

  private applyFullSync(newState: Record<string, any>, versions: Record<string, number>): void {
    this.state = { ...newState };
    this.keyVersions.clear();
    for (const [k, v] of Object.entries(versions)) {
      this.keyVersions.set(k, v);
    }

    // Notify all active key subscribers
    for (const [key, subs] of this.keySubscribers.entries()) {
      const val = this.state[key];
      for (const cb of subs) {
        try {
          cb(val, 'sync');
        } catch (e) {
          console.error(e);
        }
      }
    }

    this.emit('sync', this.state);
  }

  destroy(): void {
    this.keySubscribers.clear();
    this.keyVersions.clear();
    this.removeAllListeners();
  }
}
