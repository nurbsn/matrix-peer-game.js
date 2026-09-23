import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirebaseLobbyProvider } from '../src/providers/firebase/FirebaseProvider';
import { MatrixLobbyProvider } from '../src/providers/matrix/MatrixLobbyProvider';
import { NostrLobbyProvider } from '../src/providers/nostr/NostrProvider';
import { GameNetClient } from '../src/core/GameNetClient';

describe('Player Data Storage (Cloud Saves)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Firebase Provider Player Data', () => {
    it('should save player data to Firebase Realtime Database via REST PUT', async () => {
      const fb = new FirebaseLobbyProvider('https://test-game-rtdb.firebaseio.com');
      fb.setUserId('player_99');

      let capturedUrl = '';
      let capturedMethod = '';
      let capturedBody = '';

      global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
        capturedUrl = url;
        capturedMethod = opts?.method || 'GET';
        capturedBody = opts?.body;
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true })
        };
      }) as any;

      await fb.savePlayerData('stats', { kills: 15, deaths: 2, score: 3200 });

      expect(capturedUrl).toBe('https://test-game-rtdb.firebaseio.com/users/player_99/stats.json');
      expect(capturedMethod).toBe('PUT');
      const parsed = JSON.parse(capturedBody);
      expect(parsed.kills).toBe(15);
      expect(parsed.deaths).toBe(2);
      expect(parsed.score).toBe(3200);
      expect(parsed._updatedAt).toBeTypeOf('number');
    });

    it('should load player data from Firebase Realtime Database via REST GET', async () => {
      const fb = new FirebaseLobbyProvider('https://test-game-rtdb.firebaseio.com');
      fb.setUserId('player_99');

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        expect(url).toBe('https://test-game-rtdb.firebaseio.com/users/player_99/stats.json');
        return {
          ok: true,
          status: 200,
          json: async () => ({ kills: 20, deaths: 4, rank: 'Pro' })
        };
      }) as any;

      const loaded = await fb.loadPlayerData('stats');
      expect(loaded).toEqual({ kills: 20, deaths: 4, rank: 'Pro' });
    });
  });

  describe('Matrix Provider Account Data', () => {
    it('should save player data via Matrix Account Data API', async () => {
      const matrix = new MatrixLobbyProvider('https://matrix.org');
      // Mock matrix client authenticated state
      (matrix as any).matrix.auth = {
        userId: '@alice:matrix.org',
        accessToken: 'syt_secret_token',
        homeserver: 'https://matrix.org'
      };

      let capturedUrl = '';
      let capturedBody: any = null;

      vi.spyOn((matrix as any).matrix, 'request').mockImplementation(async (endpoint: string, method: string, body: any) => {
        capturedUrl = endpoint;
        capturedBody = body;
        return {};
      });

      await matrix.savePlayerData('stats', { kills: 7, deaths: 1 });

      expect(capturedUrl).toContain('/_matrix/client/v3/user/%40alice%3Amatrix.org/account_data/org.nomnipeer.player.stats');
      expect(capturedBody.kills).toBe(7);
      expect(capturedBody.deaths).toBe(1);
    });

    it('should load player data from Matrix Account Data API', async () => {
      const matrix = new MatrixLobbyProvider('https://matrix.org');
      (matrix as any).matrix.auth = {
        userId: '@alice:matrix.org',
        accessToken: 'syt_secret_token',
        homeserver: 'https://matrix.org'
      };

      vi.spyOn((matrix as any).matrix, 'request').mockResolvedValue({
        kills: 10,
        deaths: 3,
        _updatedAt: 123456789
      });

      const data = await matrix.loadPlayerData('stats');
      expect(data?.kills).toBe(10);
      expect(data?.deaths).toBe(3);
    });
  });

  describe('Nostr Provider Player Data', () => {
    it('should publish signed NIP-78 event for player data', async () => {
      const nostr = new NostrLobbyProvider();
      let sentData: any = null;

      vi.spyOn((nostr as any).pool, 'send').mockImplementation((data: any) => {
        sentData = data;
      });

      await nostr.savePlayerData('stats', { kills: 42, score: 9999 });

      expect(sentData).not.toBeNull();
      expect(sentData[0]).toBe('EVENT');
      const event = sentData[1];
      expect(event.kind).toBe(30078);
      expect(event.tags).toContainEqual(['d', 'nomnipeer:player:stats']);
      expect(event.tags).toContainEqual(['t', 'nomnipeer-player-data']);
      expect(event.sig).toHaveLength(128); // valid schnorr signature
      const parsed = JSON.parse(event.content);
      expect(parsed.kills).toBe(42);
      expect(parsed.score).toBe(9999);
    });
  });

  describe('GameNetClient Unified Storage API', () => {
    it('should delegate savePlayerData and loadPlayerData to active provider', async () => {
      const client = new GameNetClient({ provider: 'firebase', firebaseConfig: 'https://test-game-rtdb.firebaseio.com' });
      
      const saveSpy = vi.spyOn(client.lobbyProvider, 'savePlayerData' as any).mockResolvedValue(undefined);
      const loadSpy = vi.spyOn(client.lobbyProvider, 'loadPlayerData' as any).mockResolvedValue({ kills: 8 });

      await client.savePlayerData('stats', { kills: 8 });
      expect(saveSpy).toHaveBeenCalledWith('stats', { kills: 8 });

      const loaded = await client.loadPlayerData('stats');
      expect(loaded).toEqual({ kills: 8 });
      expect(loadSpy).toHaveBeenCalledWith('stats');
    });

    it('should fall back to localStorage when provider save fails or for local storage', async () => {
      const mockStorage: Record<string, string> = {};
      const fakeLocalStorage = {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
        clear: () => {}
      };
      vi.stubGlobal('localStorage', fakeLocalStorage);

      const client = new GameNetClient({ provider: 'mqtt', gameId: 'babo' });
      await client.savePlayerData('highscore', { score: 5000 });

      const loaded = await client.loadPlayerData('highscore');
      expect(loaded).not.toBeNull();
      expect(loaded?.score).toBe(5000);
      vi.unstubAllGlobals();
    });
  });
});
