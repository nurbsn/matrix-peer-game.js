import { describe, it, expect } from 'vitest';
import { PacketSerializer } from '../src/peer/packet';
import { PacketType } from '../src/peer/types';

describe('PacketSerializer', () => {
  it('should correctly format JSON packets with sequence numbers and timestamps', () => {
    const packet = PacketSerializer.createJsonPacket(PacketType.GAME_JSON, 'peer-123', { hello: 'world' });
    
    expect(packet.type).toBe(PacketType.GAME_JSON);
    expect(packet.senderPeerId).toBe('peer-123');
    expect(packet.data).toEqual({ hello: 'world' });
    expect(typeof packet.timestamp).toBe('number');
    expect(typeof packet.seq).toBe('number');
  });

  it('should pack and unpack binary packets with magic header', () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const binaryPacket = PacketSerializer.createBinaryPacket(PacketType.REALTIME_SNAPSHOT, payload);

    expect(binaryPacket.byteLength).toBe(8 + 5); // 8 bytes header + 5 bytes payload

    const parsed = PacketSerializer.parseBinaryPacket(binaryPacket);
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe(PacketType.REALTIME_SNAPSHOT);
    expect(Array.from(parsed!.payload)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should pack and unpack Vector2 coordinates for 2D arena games', () => {
    const entityId = 42;
    const x = 123.45;
    const y = 678.9;
    const angle = 1.57;

    const packed = PacketSerializer.packVector2(entityId, x, y, angle);
    expect(packed.byteLength).toBe(14); // Exactly 14 bytes

    const unpacked = PacketSerializer.unpackVector2(packed);
    expect(unpacked.entityId).toBe(entityId);
    expect(unpacked.x).toBeCloseTo(x, 2);
    expect(unpacked.y).toBeCloseTo(y, 2);
    expect(unpacked.angle).toBeCloseTo(angle, 2);
  });

  it('should pack and unpack Vector3 coordinates for FPS 3D games', () => {
    const entityId = 101;
    const x = 10.5;
    const y = 2.0;
    const z = -50.25;
    const rotY = 3.1415;

    const packed = PacketSerializer.packVector3(entityId, x, y, z, rotY);
    expect(packed.byteLength).toBe(18); // Exactly 18 bytes

    const unpacked = PacketSerializer.unpackVector3(packed);
    expect(unpacked.entityId).toBe(entityId);
    expect(unpacked.x).toBeCloseTo(x, 2);
    expect(unpacked.y).toBeCloseTo(y, 2);
    expect(unpacked.z).toBeCloseTo(z, 2);
    expect(unpacked.rotY).toBeCloseTo(rotY, 2);
  });
});
