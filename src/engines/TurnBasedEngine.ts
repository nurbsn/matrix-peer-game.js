import { TypedEventEmitter } from '../core/events';
import { PeerManager } from '../peer/PeerManager';
import { PacketType } from '../peer/types';
import { PacketSerializer } from '../peer/packet';

export interface TurnAction<T = any> {
  playerId: string;
  action: string;
  payload: T;
  turnNumber: number;
  timestamp: number;
}

export interface TurnBasedEngineOptions {
  peerManager: PeerManager;
  playersOrder: string[]; // List of peer IDs or player names
  turnTimeoutMs?: number; // Optional turn time limit (e.g. 30000ms)
  initialTurnNumber?: number;
}

export interface TurnBasedEngineEvents {
  turnChange: { activePlayerId: string; turnNumber: number; remainingTimeMs?: number };
  action: TurnAction;
  turnTimeout: { timedOutPlayerId: string; turnNumber: number };
}

export class TurnBasedEngine extends TypedEventEmitter<TurnBasedEngineEvents> {
  readonly peerManager: PeerManager;
  private playersOrder: string[];
  private currentTurnIndex = 0;
  private turnNumber = 1;
  private turnTimeoutMs?: number;
  private timerId: any = null;
  private history: TurnAction[] = [];

  constructor(options: TurnBasedEngineOptions) {
    super();
    this.peerManager = options.peerManager;
    this.playersOrder = [...options.playersOrder];
    this.turnTimeoutMs = options.turnTimeoutMs;
    this.turnNumber = options.initialTurnNumber ?? 1;

    this.setupListeners();
  }

  get activePlayerId(): string {
    return this.playersOrder[this.currentTurnIndex] || '';
  }

  get currentTurnNumber(): number {
    return this.turnNumber;
  }

  get isMyTurn(): boolean {
    return this.activePlayerId === this.peerManager.peerId;
  }

  get actionHistory(): TurnAction[] {
    return [...this.history];
  }

  private setupListeners(): void {
    this.peerManager.on('data', ({ packet }) => {
      if (packet.type === PacketType.TURN_ACTION) {
        const action = packet.data as TurnAction;
        this.history.push(action);
        this.emit('action', action);
      } else if (packet.type === PacketType.TURN_END) {
        this.advanceTurnInternal(packet.data?.nextTurnNumber);
      }
    });
  }

  /**
   * Start the turn loop (initiates timer for the first player)
   */
  start(): void {
    this.resetTimer();
    this.emit('turnChange', {
      activePlayerId: this.activePlayerId,
      turnNumber: this.turnNumber,
      remainingTimeMs: this.turnTimeoutMs
    });
  }

  /**
   * Submit an action during the active turn
   */
  submitAction<T = any>(action: string, payload: T): TurnAction<T> {
    if (!this.isMyTurn) {
      throw new Error(`Cannot submit action: it is ${this.activePlayerId}'s turn, not yours`);
    }

    const turnAction: TurnAction<T> = {
      playerId: this.peerManager.peerId || 'local',
      action,
      payload,
      turnNumber: this.turnNumber,
      timestamp: Date.now()
    };

    this.history.push(turnAction);
    this.emit('action', turnAction);

    // Broadcast action to all players reliably
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(PacketType.TURN_ACTION, this.peerManager.peerId || '', turnAction),
      'reliable'
    );

    return turnAction;
  }

  /**
   * End the current player's turn and pass to the next player
   */
  passTurn(): void {
    if (!this.isMyTurn) {
      throw new Error(`Cannot pass turn: it is not your turn`);
    }

    const nextTurnNumber = this.turnNumber + 1;
    this.advanceTurnInternal(nextTurnNumber);

    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(PacketType.TURN_END, this.peerManager.peerId || '', { nextTurnNumber }),
      'reliable'
    );
  }

  private advanceTurnInternal(explicitTurnNumber?: number): void {
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.playersOrder.length;
    this.turnNumber = explicitTurnNumber ?? (this.turnNumber + 1);

    this.resetTimer();

    this.emit('turnChange', {
      activePlayerId: this.activePlayerId,
      turnNumber: this.turnNumber,
      remainingTimeMs: this.turnTimeoutMs
    });
  }

  private resetTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.turnTimeoutMs && this.turnTimeoutMs > 0) {
      this.timerId = setTimeout(() => {
        const timedOutId = this.activePlayerId;
        this.emit('turnTimeout', {
          timedOutPlayerId: timedOutId,
          turnNumber: this.turnNumber
        });
        // Auto-advance if timed out
        this.advanceTurnInternal();
      }, this.turnTimeoutMs);
    }
  }

  destroy(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.history = [];
    this.removeAllListeners();
  }
}
