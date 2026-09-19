import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatrixClient } from '../src/matrix/MatrixClient';
import { GameNetClient } from '../src/core/GameNetClient';

describe('MatrixClient', () => {
  let client: MatrixClient;

  beforeEach(() => {
    client = new MatrixClient('https://mock.matrix.server');
  });

  it('should initialize with correct homeserver without trailing slash', () => {
    const clientWithSlash = new MatrixClient('https://matrix.org///');
    clientWithSlash.setAuth({
      userId: '@test:matrix.org',
      accessToken: 'token123',
      homeserver: 'https://matrix.org/'
    });

    expect(clientWithSlash.isAuthenticated).toBe(true);
    expect(clientWithSlash.currentUserId).toBe('@test:matrix.org');
  });

  it('should parse sync events and emit typed events', () => {
    client.setAuth({
      userId: '@alice:mock.server',
      accessToken: 'token-xyz',
      homeserver: 'https://mock.server'
    });

    let detectedLobbyState: any = null;
    let detectedPlayerState: any = null;
    let detectedChatMessage: any = null;

    client.on('lobbyStateChange', ({ state }) => {
      detectedLobbyState = state;
    });

    client.on('playerStateChange', ({ state }) => {
      detectedPlayerState = state;
    });

    client.on('roomMessage', ({ message }) => {
      detectedChatMessage = message;
    });

    // Simulate raw Matrix /sync response
    const mockSyncPayload = {
      next_batch: 's_token_123',
      rooms: {
        join: {
          '!room1:mock.server': {
            state: {
              events: [
                {
                  type: 'm.game.lobby',
                  sender: '@alice:mock.server',
                  content: {
                    gameId: 'my-arena-game',
                    hostUserId: '@alice:mock.server',
                    hostPeerId: 'peer-alice-99',
                    maxPlayers: 4,
                    status: 'waiting',
                    metadata: { map: 'desert' }
                  },
                  origin_server_ts: 1000,
                  event_id: '$event1'
                },
                {
                  type: 'm.game.player',
                  sender: '@bob:mock.server',
                  state_key: '@bob:mock.server',
                  content: {
                    nickname: 'BobTheGamer',
                    isReady: true,
                    peerId: 'peer-bob-12'
                  },
                  origin_server_ts: 1001,
                  event_id: '$event2'
                }
              ]
            },
            timeline: {
              events: [
                {
                  type: 'm.room.message',
                  sender: '@bob:mock.server',
                  content: {
                    msgtype: 'm.text',
                    body: 'GL & HF!'
                  },
                  origin_server_ts: 1002,
                  event_id: '$event3'
                }
              ]
            }
          }
        }
      }
    };

    (client as any).processSyncResponse(mockSyncPayload);

    expect(detectedLobbyState).not.toBeNull();
    expect(detectedLobbyState.gameId).toBe('my-arena-game');
    expect(detectedLobbyState.hostPeerId).toBe('peer-alice-99');

    expect(detectedPlayerState).not.toBeNull();
    expect(detectedPlayerState.nickname).toBe('BobTheGamer');
    expect(detectedPlayerState.isReady).toBe(true);

    expect(detectedChatMessage).not.toBeNull();
    expect(detectedChatMessage.text).toBe('GL & HF!');
  });
});

describe('GameNetClient Session Management', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
    });
  });

  it('should save, autoLogin and clear session correctly', () => {
    const net = new GameNetClient({ homeserver: 'https://mock.server', gameId: 'test-game' });
    
    // Before auth
    expect(net.saveSession('test_key')).toBe(false);
    expect(net.autoLogin('test_key')).toBe(false);

    // Simulate session
    net.restoreSession({
      userId: '@player1:mock.server',
      accessToken: 'token_secret_123',
      homeserver: 'https://mock.server'
    });

    expect(net.saveSession('test_key')).toBe(true);
    expect(localStorage.getItem('test_key')).toContain('token_secret_123');

    // Create a new client instance and autoLogin
    const net2 = new GameNetClient({ homeserver: 'https://mock.server', gameId: 'test-game' });
    const autoLoginResult = net2.autoLogin('test_key');
    expect(autoLoginResult).toBe(true);
    expect(net2.currentUserId).toBe('@player1:mock.server');

    // Clear session
    net2.clearSession('test_key');
    expect(localStorage.getItem('test_key')).toBeNull();
  });
});
