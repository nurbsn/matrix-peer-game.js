import { Peer, DataConnection } from 'peerjs';
import { TypedEventEmitter } from '../core/events';
import {
  ChannelReliability,
  NetworkPacket,
  NetworkTopology,
  PacketType,
  PeerConnectionStats,
  PeerManagerOptions
} from './types';
import { PacketSerializer } from './packet';

export interface PeerManagerEvents {
  ready: string;
  peerConnected: string;
  peerDisconnected: string;
  data: { senderPeerId: string; packet: NetworkPacket; channel: ChannelReliability };
  binary: { senderPeerId: string; type: PacketType; timestamp: number; seq: number; payload: Uint8Array };
  pingUpdate: { peerId: string; ping: number };
  error: Error;
}

interface PeerConnectionPair {
  peerId: string;
  reliable?: DataConnection;
  unreliable?: DataConnection;
  stats: PeerConnectionStats;
}

export class PeerManager extends TypedEventEmitter<PeerManagerEvents> {
  private peer: Peer | null = null;
  private myPeerId: string | null = null;
  private connections = new Map<string, PeerConnectionPair>();
  readonly topology: NetworkTopology;
  readonly isHost: boolean;
  private pingIntervalId: any = null;
  private pingIntervalMs: number;
  private isDestroyed = false;

  constructor(options: PeerManagerOptions = {}) {
    super();
    this.topology = options.topology ?? 'star';
    this.isHost = options.isHost ?? false;
    this.pingIntervalMs = options.pingIntervalMs ?? 2000;

    this.initPeer(options);
  }

  get peerId(): string | null {
    return this.myPeerId;
  }

  get isReady(): boolean {
    return this.peer !== null && this.myPeerId !== null && !this.peer.destroyed;
  }

  get connectedPeerIds(): string[] {
    return Array.from(this.connections.keys());
  }

  getStats(peerId: string): PeerConnectionStats | null {
    return this.connections.get(peerId)?.stats ?? null;
  }

  getAllStats(): PeerConnectionStats[] {
    return Array.from(this.connections.values()).map(p => p.stats);
  }

  private initPeer(options: PeerManagerOptions): void {
    // Check if Peer class is available in global (for flat browser bundle) or import
    const PeerClass = typeof (window as any) !== 'undefined' && (window as any).Peer
      ? (window as any).Peer
      : Peer;

    const peerId = options.peerId;
    const config = options.peerConfig || {
      debug: options.debug ? 2 : 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    };

    const peerInstance = peerId ? new PeerClass(peerId, config) : new PeerClass(config);
    this.peer = peerInstance;

    peerInstance.on('open', (id: string) => {
      this.myPeerId = id;
      this.startPingLoop();
      this.emit('ready', id);
    });

    peerInstance.on('connection', (conn: DataConnection) => {
      this.handleIncomingConnection(conn);
    });

    peerInstance.on('error', (err: any) => {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    });

    peerInstance.on('close', () => {
      this.destroy();
    });
  }

  /**
   * Connect to a remote peer with both reliable and unreliable channels
   */
  connectToPeer(remotePeerId: string): void {
    if (!this.peer || this.peer.destroyed || remotePeerId === this.myPeerId) {
      return;
    }

    let pair = this.connections.get(remotePeerId);
    if (!pair) {
      pair = {
        peerId: remotePeerId,
        stats: {
          peerId: remotePeerId,
          ping: 0,
          lastPingTimestamp: 0,
          bytesSent: 0,
          bytesReceived: 0,
          connectedAt: Date.now()
        }
      };
      this.connections.set(remotePeerId, pair);
    }

    // 1. Establish Reliable Channel (for commands, state, events)
    if (!pair.reliable || !pair.reliable.open) {
      const reliableConn = this.peer.connect(remotePeerId, {
        label: 'reliable',
        reliable: true
      });
      this.setupConnectionEvents(reliableConn, 'reliable');
      pair.reliable = reliableConn;
    }

    // 2. Establish Unreliable Channel (for FPS / 60Hz positions)
    if (!pair.unreliable || !pair.unreliable.open) {
      const unreliableConn = this.peer.connect(remotePeerId, {
        label: 'unreliable',
        reliable: false
      });
      this.setupConnectionEvents(unreliableConn, 'unreliable');
      pair.unreliable = unreliableConn;
    }
  }

  private handleIncomingConnection(conn: DataConnection): void {
    const remotePeerId = conn.peer;
    let pair = this.connections.get(remotePeerId);

    if (!pair) {
      pair = {
        peerId: remotePeerId,
        stats: {
          peerId: remotePeerId,
          ping: 0,
          lastPingTimestamp: 0,
          bytesSent: 0,
          bytesReceived: 0,
          connectedAt: Date.now()
        }
      };
      this.connections.set(remotePeerId, pair);
    }

    const channelType: ChannelReliability = conn.label === 'unreliable' ? 'unreliable' : 'reliable';
    if (channelType === 'reliable') {
      pair.reliable = conn;
    } else {
      pair.unreliable = conn;
    }

    this.setupConnectionEvents(conn, channelType);
  }

  private setupConnectionEvents(conn: DataConnection, channel: ChannelReliability): void {
    const remotePeerId = conn.peer;

    conn.on('open', () => {
      this.emit('peerConnected', remotePeerId);
    });

    conn.on('data', (raw: any) => {
      this.handleIncomingData(remotePeerId, raw, channel);
    });

    conn.on('close', () => {
      this.cleanupConnection(remotePeerId, channel);
    });

    conn.on('error', (err: any) => {
      console.warn(`Connection error with peer ${remotePeerId}:`, err);
    });
  }

  private handleIncomingData(senderPeerId: string, raw: any, channel: ChannelReliability): void {
    const pair = this.connections.get(senderPeerId);

    // 1. Check if raw data is a binary packet
    if (raw instanceof ArrayBuffer || raw instanceof Uint8Array) {
      const parsed = PacketSerializer.parseBinaryPacket(raw);
      if (parsed) {
        if (pair) {
          pair.stats.bytesReceived += (raw as any).byteLength || 0;
        }
        this.emit('binary', {
          senderPeerId,
          type: parsed.type,
          timestamp: parsed.timestamp,
          seq: parsed.seq,
          payload: parsed.payload
        });
        return;
      }
    }

    // 2. Handle structured JSON packets
    if (typeof raw === 'object' && raw !== null && 'type' in raw) {
      const packet = raw as NetworkPacket;
      if (pair) {
        pair.stats.bytesReceived += JSON.stringify(raw).length;
      }

      // Handle system ping/pong
      if (packet.type === PacketType.PING) {
        this.sendJson(senderPeerId, PacketSerializer.createJsonPacket(
          PacketType.PONG,
          this.myPeerId || '',
          packet.data
        ), 'reliable');
        return;
      }

      if (packet.type === PacketType.PONG) {
        const sentTime = packet.data?.sentAt;
        if (typeof sentTime === 'number') {
          const rtt = Date.now() - sentTime;
          if (pair) {
            pair.stats.ping = rtt;
            pair.stats.lastPingTimestamp = Date.now();
          }
          this.emit('pingUpdate', { peerId: senderPeerId, ping: rtt });
        }
        return;
      }

      // High-level game packets
      this.emit('data', {
        senderPeerId,
        packet,
        channel
      });
    }
  }

  private cleanupConnection(remotePeerId: string, channel: ChannelReliability): void {
    const pair = this.connections.get(remotePeerId);
    if (!pair) return;

    if (channel === 'reliable') {
      delete pair.reliable;
    } else {
      delete pair.unreliable;
    }

    if (!pair.reliable && !pair.unreliable) {
      this.connections.delete(remotePeerId);
      this.emit('peerDisconnected', remotePeerId);
    }
  }

  /**
   * Send arbitrary JSON payload to a specific peer
   */
  sendJson(peerId: string, packet: NetworkPacket, channel: ChannelReliability = 'reliable'): boolean {
    const pair = this.connections.get(peerId);
    if (!pair) return false;

    const targetConn = channel === 'unreliable' && pair.unreliable?.open
      ? pair.unreliable
      : pair.reliable;

    if (targetConn && targetConn.open) {
      targetConn.send(packet);
      pair.stats.bytesSent += JSON.stringify(packet).length;
      return true;
    }
    return false;
  }

  /**
   * Send binary data (Uint8Array / ArrayBuffer) to a specific peer (ideal for FPS)
   */
  sendBinary(peerId: string, type: PacketType, payload: Uint8Array, channel: ChannelReliability = 'unreliable'): boolean {
    const pair = this.connections.get(peerId);
    if (!pair) return false;

    const targetConn = channel === 'unreliable' && pair.unreliable?.open
      ? pair.unreliable
      : pair.reliable;

    if (targetConn && targetConn.open) {
      const packet = PacketSerializer.createBinaryPacket(type, payload);
      targetConn.send(packet);
      pair.stats.bytesSent += packet.byteLength;
      return true;
    }
    return false;
  }

  /**
   * Broadcast JSON payload to all connected peers
   */
  broadcastJson(packet: NetworkPacket, channel: ChannelReliability = 'reliable'): void {
    for (const peerId of this.connections.keys()) {
      this.sendJson(peerId, packet, channel);
    }
  }

  /**
   * Broadcast binary data to all connected peers
   */
  broadcastBinary(type: PacketType, payload: Uint8Array, channel: ChannelReliability = 'unreliable'): void {
    for (const peerId of this.connections.keys()) {
      this.sendBinary(peerId, type, payload, channel);
    }
  }

  /**
   * Send periodic PING to measure RTT latency
   */
  private startPingLoop(): void {
    if (this.pingIntervalId) return;
    this.pingIntervalId = setInterval(() => {
      if (this.isDestroyed) return;
      const now = Date.now();
      for (const [peerId, pair] of this.connections.entries()) {
        if (pair.reliable && pair.reliable.open) {
          this.sendJson(
            peerId,
            PacketSerializer.createJsonPacket(PacketType.PING, this.myPeerId || '', { sentAt: now }),
            'reliable'
          );
        }
      }
    }, this.pingIntervalMs);
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    for (const pair of this.connections.values()) {
      try {
        pair.reliable?.close();
        pair.unreliable?.close();
      } catch {}
    }
    this.connections.clear();

    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch {}
    }
    this.peer = null;
    this.myPeerId = null;
    this.removeAllListeners();
  }
}
