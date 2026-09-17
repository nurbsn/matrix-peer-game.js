import { TypedEventEmitter } from '../core/events';
import { PeerManager } from '../peer/PeerManager';
import { PacketType } from '../peer/types';
import { PacketSerializer } from '../peer/packet';

export interface LockstepCommand<T = any> {
  playerId: string;
  action: string;
  payload: T;
  targetTick: number;
}

export interface LockstepEngineOptions {
  peerManager: PeerManager;
  tickDurationMs?: number; // Duration of one simulation tick (e.g. 100ms = 10 ticks/sec)
  commandDelayTicks?: number; // Number of ticks into future to schedule commands (e.g. 2 ticks)
  playerIds?: string[];
}

export interface LockstepEngineEvents {
  tickExecute: { tick: number; commands: LockstepCommand[] };
  lagPause: { tick: number; waitingForPeerId: string };
  lagResume: { tick: number };
}

export class LockstepEngine extends TypedEventEmitter<LockstepEngineEvents> {
  readonly peerManager: PeerManager;
  readonly tickDurationMs: number;
  readonly commandDelayTicks: number;

  private currentTick = 0;
  private isRunning = false;
  private isPausedForLag = false;
  private tickTimer: any = null;

  // Stored commands per tick: tickNumber -> LockstepCommand[]
  private scheduledCommands = new Map<number, LockstepCommand[]>();
  // Track received acks/commands from each peer per tick: tickNumber -> Set<peerId>
  private tickPeerReceipts = new Map<number, Set<string>>();
  private knownPeers = new Set<string>();

  constructor(options: LockstepEngineOptions) {
    super();
    this.peerManager = options.peerManager;
    this.tickDurationMs = options.tickDurationMs ?? 100;
    this.commandDelayTicks = options.commandDelayTicks ?? 2;

    if (options.playerIds) {
      for (const p of options.playerIds) this.knownPeers.add(p);
    }

    this.setupListeners();
  }

  private setupListeners(): void {
    this.peerManager.on('peerConnected', (peerId) => {
      this.knownPeers.add(peerId);
    });

    this.peerManager.on('peerDisconnected', (peerId) => {
      this.knownPeers.delete(peerId);
    });

    this.peerManager.on('data', ({ senderPeerId, packet }) => {
      if (packet.type === PacketType.LOCKSTEP_COMMAND) {
        const cmd = packet.data as LockstepCommand;
        this.registerRemoteCommand(cmd, senderPeerId);
      } else if (packet.type === PacketType.LOCKSTEP_TICK_ACK) {
        const { tick } = packet.data;
        this.registerTickAck(tick, senderPeerId);
      }
    });
  }

  /**
   * Queue a gameplay command for the next executable tick (e.g. move army, build unit)
   */
  queueCommand<T = any>(action: string, payload: T): LockstepCommand<T> {
    const targetTick = this.currentTick + this.commandDelayTicks;
    const cmd: LockstepCommand<T> = {
      playerId: this.peerManager.peerId || 'local',
      action,
      payload,
      targetTick
    };

    // Store locally
    let list = this.scheduledCommands.get(targetTick);
    if (!list) {
      list = [];
      this.scheduledCommands.set(targetTick, list);
    }
    list.push(cmd);

    // Broadcast over reliable channel
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(PacketType.LOCKSTEP_COMMAND, this.peerManager.peerId || '', cmd),
      'reliable'
    );

    return cmd;
  }

  private registerRemoteCommand(cmd: LockstepCommand, senderPeerId: string): void {
    let list = this.scheduledCommands.get(cmd.targetTick);
    if (!list) {
      list = [];
      this.scheduledCommands.set(cmd.targetTick, list);
    }
    list.push(cmd);
    this.registerTickAck(cmd.targetTick, senderPeerId);
  }

  private registerTickAck(tick: number, senderPeerId: string): void {
    let acks = this.tickPeerReceipts.get(tick);
    if (!acks) {
      acks = new Set();
      this.tickPeerReceipts.set(tick, acks);
    }
    acks.add(senderPeerId);

    // If we were paused waiting for this peer, try resuming
    if (this.isPausedForLag && this.canAdvanceTick(this.currentTick)) {
      this.isPausedForLag = false;
      this.emit('lagResume', { tick: this.currentTick });
      this.advanceTick();
    }
  }

  private canAdvanceTick(tick: number): boolean {
    const acks = this.tickPeerReceipts.get(tick);
    for (const peerId of this.knownPeers) {
      if (peerId !== this.peerManager.peerId) {
        if (!acks || !acks.has(peerId)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Start the deterministic lockstep simulation loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentTick = 0;

    this.tickTimer = setInterval(() => {
      this.advanceTick();
    }, this.tickDurationMs);
  }

  private advanceTick(): void {
    if (!this.isRunning || this.isPausedForLag) return;

    // Check if we have received acks/commands from all connected peers for current tick
    for (const peerId of this.knownPeers) {
      if (peerId !== this.peerManager.peerId) {
        const acks = this.tickPeerReceipts.get(this.currentTick);
        if (!acks || !acks.has(peerId)) {
          this.isPausedForLag = true;
          this.emit('lagPause', { tick: this.currentTick, waitingForPeerId: peerId });
          return;
        }
      }
    }

    // All peers synchronized! Execute this tick's commands
    const commands = this.scheduledCommands.get(this.currentTick) || [];
    this.emit('tickExecute', { tick: this.currentTick, commands });

    // Clean up old tick data
    this.scheduledCommands.delete(this.currentTick);
    this.tickPeerReceipts.delete(this.currentTick);

    // Send empty tick ack for future tick if no command was sent
    this.peerManager.broadcastJson(
      PacketSerializer.createJsonPacket(PacketType.LOCKSTEP_TICK_ACK, this.peerManager.peerId || '', {
        tick: this.currentTick + this.commandDelayTicks
      }),
      'reliable'
    );

    this.currentTick++;
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    this.isRunning = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  destroy(): void {
    this.pause();
    this.scheduledCommands.clear();
    this.tickPeerReceipts.clear();
    this.knownPeers.clear();
    this.removeAllListeners();
  }
}
