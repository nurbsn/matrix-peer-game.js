import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPair, sha256Hex, schnorrSign } from '../src/providers/nostr/crypto';
import { topicMatches } from '../src/providers/mqtt/MqttProvider';
import { GameNetClient } from '../src/core/GameNetClient';

describe('Nostr Crypto', () => {
  it('should generate valid 32-byte hex keys', () => {
    const kp = generateKeyPair();
    expect(kp.secretKey).toHaveLength(64);
    expect(kp.publicKey).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(kp.secretKey)).toBe(true);
    expect(/^[0-9a-f]{64}$/.test(kp.publicKey)).toBe(true);
  });

  it('should compute sha256 hex correctly', async () => {
    const hash = await sha256Hex('hello world');
    // SHA256 of "hello world"
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('should sign messages with 64-byte hex schnorr signature', async () => {
    const kp = generateKeyPair();
    const msgHash = await sha256Hex('test message');
    const sig = await schnorrSign(msgHash, kp.secretKey);
    expect(sig).toHaveLength(128); // 64 bytes = 128 hex chars
    expect(/^[0-9a-f]{128}$/.test(sig)).toBe(true);
  });
});

describe('MQTT Topic Matching', () => {
  it('should match exact topics', () => {
    expect(topicMatches('games/arena/chat', 'games/arena/chat')).toBe(true);
    expect(topicMatches('games/arena/chat', 'games/arena/other')).toBe(false);
  });

  it('should match single-level wildcard (+)', () => {
    expect(topicMatches('games/+/lobbies', 'games/cyber-gems/lobbies')).toBe(true);
    expect(topicMatches('games/+/lobbies', 'games/cyber-gems/chat')).toBe(false);
    expect(topicMatches('games/cyber-gems/lobbies/+', 'games/cyber-gems/lobbies/room123')).toBe(true);
  });

  it('should match multi-level wildcard (#)', () => {
    expect(topicMatches('games/#', 'games/cyber-gems/lobbies/room123')).toBe(true);
    expect(topicMatches('games/cyber-gems/#', 'games/cyber-gems/chat/user1')).toBe(true);
    expect(topicMatches('other/#', 'games/cyber-gems/chat')).toBe(false);
  });
});

describe('GameNetClient Multi-Provider Integration', () => {
  it('should initialize with default matrix provider', () => {
    const client = new GameNetClient({ homeserver: 'https://matrix.org' });
    expect(client.providerType).toBe('matrix');
    expect(client.lobbyProvider.providerType).toBe('matrix');
  });

  it('should initialize with nostr provider', () => {
    const client = new GameNetClient({ provider: 'nostr', gameId: 'babo-shooter' });
    expect(client.providerType).toBe('nostr');
    expect(client.lobbyProvider.providerType).toBe('nostr');
    expect(client.currentUserId).not.toBeNull();
  });

  it('should initialize with mqtt provider', () => {
    const client = new GameNetClient({ provider: 'mqtt', gameId: 'babo-shooter' });
    expect(client.providerType).toBe('mqtt');
    expect(client.lobbyProvider.providerType).toBe('mqtt');
    expect(client.currentUserId).not.toBeNull();
  });

  it('should initialize with firebase provider', () => {
    const client = new GameNetClient({ provider: 'firebase', gameId: 'babo-shooter' });
    expect(client.providerType).toBe('firebase');
    expect(client.lobbyProvider.providerType).toBe('firebase');
    expect(client.currentUserId).not.toBeNull();
  });
});
