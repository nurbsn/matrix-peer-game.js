import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TypedEventEmitter } from '../src/core/events';
import { TurnBasedEngine } from '../src/engines/TurnBasedEngine';
import { RealtimeEngine } from '../src/engines/RealtimeEngine';
import { LockstepEngine } from '../src/engines/LockstepEngine';
import { SharedStateEngine } from '../src/engines/SharedStateEngine';
import { PacketType } from '../src/peer/types';

// Mock PeerManager
class MockPeerManager extends TypedEventEmitter<any> {
  peerId = 'player-1';
  broadcastJson = vi.fn();
  broadcastBinary = vi.fn();
  sendJson = vi.fn();
  sendBinary = vi.fn();
}

describe('Game Engines', () => {
  let mockPeer: MockPeerManager;

  beforeEach(() => {
    mockPeer = new MockPeerManager();
  });

  describe('TurnBasedEngine', () => {
    it('should manage turn sequence and allow actions only on current turn', () => {
      const engine = new TurnBasedEngine({
        peerManager: mockPeer as any,
        playersOrder: ['player-1', 'player-2']
      });

      expect(engine.activePlayerId).toBe('player-1');
      expect(engine.isMyTurn).toBe(true);
      expect(engine.currentTurnNumber).toBe(1);

      // Player 1 submits move
      const action = engine.submitAction('PLAY_CARD', { cardId: 42 });
      expect(action.action).toBe('PLAY_CARD');
      expect(action.turnNumber).toBe(1);
      expect(mockPeer.broadcastJson).toHaveBeenCalledTimes(1);

      // End turn
      engine.passTurn();
      expect(engine.activePlayerId).toBe('player-2');
      expect(engine.isMyTurn).toBe(false);
      expect(engine.currentTurnNumber).toBe(2);

      // Submitting move when not your turn throws error
      expect(() => {
        engine.submitAction('ATTACK', {});
      }).toThrow(/not yours/);
    });

    it('should record action history for replays', () => {
      const engine = new TurnBasedEngine({
        peerManager: mockPeer as any,
        playersOrder: ['player-1', 'player-2']
      });

      engine.submitAction('MOVE', { from: 'a1', to: 'a2' });
      expect(engine.actionHistory.length).toBe(1);
      expect(engine.actionHistory[0].action).toBe('MOVE');
    });
  });

  describe('RealtimeEngine', () => {
    it('should track local entities and calculate interpolated positions', () => {
      const engine = new RealtimeEngine({
        peerManager: mockPeer as any,
        tickRate: 30,
        interpolationDelayMs: 50
      });

      const now = Date.now();

      // Simulate remote player packets received in the past
      (engine as any).recordSnapshot('remote-player', { x: 100, y: 100 }, now - 100);
      (engine as any).recordSnapshot('remote-player', { x: 200, y: 200 }, now);

      // Render at now - 50ms (halfway between now - 100 and now)
      const interpolated = engine.getInterpolatedPosition('remote-player', now - 50);
      expect(interpolated).not.toBeNull();
      expect(interpolated!.x).toBeCloseTo(150, 1);
      expect(interpolated!.y).toBeCloseTo(150, 1);

      engine.destroy();
    });

    it('should broadcast vector3 coords via ultra-compact binary packet', () => {
      const engine = new RealtimeEngine({
        peerManager: mockPeer as any,
        tickRate: 30
      });

      engine.sendVector3(7, 10.5, 20.0, -30.5, 1.57);
      expect(mockPeer.broadcastBinary).toHaveBeenCalledWith(
        PacketType.REALTIME_SNAPSHOT,
        expect.any(Uint8Array),
        'unreliable'
      );

      engine.destroy();
    });
  });

  describe('LockstepEngine', () => {
    it('should schedule commands for future ticks and execute them in order', () => {
      const engine = new LockstepEngine({
        peerManager: mockPeer as any,
        tickDurationMs: 50,
        commandDelayTicks: 2,
        playerIds: ['player-1'] // Single player mode for simple test
      });

      const executedTicks: { tick: number; commands: any[] }[] = [];
      engine.on('tickExecute', (data) => {
        executedTicks.push(data);
      });

      const cmd = engine.queueCommand('SPAWN_TANK', { x: 150, y: 200 });
      expect(cmd.targetTick).toBe(2); // currentTick (0) + 2

      (engine as any).isRunning = true;
      (engine as any).advanceTick(); // Tick 0
      (engine as any).advanceTick(); // Tick 1
      (engine as any).advanceTick(); // Tick 2 -> should execute SPAWN_TANK

      expect(executedTicks.length).toBe(3);
      expect(executedTicks[2].commands.length).toBe(1);
      expect(executedTicks[2].commands[0].action).toBe('SPAWN_TANK');

      engine.destroy();
    });
  });

  describe('SharedStateEngine', () => {
    it('should support reactive key-value updates and subscriptions', () => {
      const store = new SharedStateEngine({
        peerManager: mockPeer as any,
        initialState: { score: 0, items: [] }
      });

      let observedScore = 0;
      store.subscribe('score', (newScore) => {
        observedScore = newScore;
      });

      store.set('score', 150);
      expect(store.get('score')).toBe(150);
      expect(observedScore).toBe(150);
      expect(mockPeer.broadcastJson).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PacketType.SHARED_STATE_SET
        }),
        'reliable'
      );

      // Test array push
      store.push('items', 'sword');
      store.push('items', 'shield');
      expect(store.get('items')).toEqual(['sword', 'shield']);

      store.destroy();
    });
  });
});
