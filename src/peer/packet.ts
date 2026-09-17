import { PacketType, NetworkPacket } from './types';

// Binary packet protocol:
// Byte 0: Magic byte 0xAA
// Byte 1: PacketType enum value
// Bytes 2-5: Timestamp (Uint32, milliseconds mod 2^32)
// Bytes 6-7: Sequence number (Uint16)
// Bytes 8+: Payload bytes
const BINARY_MAGIC = 0xAA;
const BINARY_HEADER_SIZE = 8;

export class PacketSerializer {
  private static seqCounter = 0;

  static nextSeq(): number {
    this.seqCounter = (this.seqCounter + 1) & 0xFFFF;
    return this.seqCounter;
  }

  /**
   * Wrap payload into a typed NetworkPacket object for JSON transmission
   */
  static createJsonPacket<T = any>(type: PacketType, senderPeerId: string, data: T): NetworkPacket<T> {
    return {
      type,
      senderPeerId,
      seq: this.nextSeq(),
      timestamp: Date.now(),
      data
    };
  }

  /**
   * Create a binary packet with header (for FPS / real-time high frequency streaming)
   */
  static createBinaryPacket(type: PacketType, payload: Uint8Array): Uint8Array {
    const totalSize = BINARY_HEADER_SIZE + payload.byteLength;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    view.setUint8(0, BINARY_MAGIC);
    view.setUint8(1, type);
    view.setUint32(2, Date.now() & 0xFFFFFFFF, true); // little-endian
    view.setUint16(6, this.nextSeq(), true);

    bytes.set(payload, BINARY_HEADER_SIZE);
    return bytes;
  }

  /**
   * Parse a received binary packet
   */
  static parseBinaryPacket(buffer: ArrayBuffer | Uint8Array): {
    type: PacketType;
    timestamp: number;
    seq: number;
    payload: Uint8Array;
  } | null {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.byteLength < BINARY_HEADER_SIZE) return null;
    
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = view.getUint8(0);
    if (magic !== BINARY_MAGIC) return null;

    const type = view.getUint8(1) as PacketType;
    const timestamp = view.getUint32(2, true);
    const seq = view.getUint16(6, true);
    const payload = bytes.subarray(BINARY_HEADER_SIZE);

    return { type, timestamp, seq, payload };
  }

  /**
   * Fast Vector3 pack for FPS (position X, Y, Z + rotation Y + entityId)
   * Total size: 2 (entityId) + 4*3 (coords) + 4 (rot) = 18 bytes!
   */
  static packVector3(entityId: number, x: number, y: number, z: number, rotY: number): Uint8Array {
    const buffer = new ArrayBuffer(18);
    const view = new DataView(buffer);
    view.setUint16(0, entityId, true);
    view.setFloat32(2, x, true);
    view.setFloat32(6, y, true);
    view.setFloat32(10, z, true);
    view.setFloat32(14, rotY, true);
    return new Uint8Array(buffer);
  }

  /**
   * Fast Vector3 unpack for FPS
   */
  static unpackVector3(buffer: ArrayBuffer | Uint8Array): {
    entityId: number;
    x: number;
    y: number;
    z: number;
    rotY: number;
  } {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      entityId: view.getUint16(0, true),
      x: view.getFloat32(2, true),
      y: view.getFloat32(6, true),
      z: view.getFloat32(10, true),
      rotY: view.getFloat32(14, true)
    };
  }

  /**
   * Fast Vector2 pack for 2D Arena/Shooter (position X, Y + angle + entityId)
   * Total size: 2 (entityId) + 4*2 (coords) + 4 (angle) = 14 bytes!
   */
  static packVector2(entityId: number, x: number, y: number, angle: number): Uint8Array {
    const buffer = new ArrayBuffer(14);
    const view = new DataView(buffer);
    view.setUint16(0, entityId, true);
    view.setFloat32(2, x, true);
    view.setFloat32(6, y, true);
    view.setFloat32(10, angle, true);
    return new Uint8Array(buffer);
  }

  /**
   * Fast Vector2 unpack for 2D Arena/Shooter
   */
  static unpackVector2(buffer: ArrayBuffer | Uint8Array): {
    entityId: number;
    x: number;
    y: number;
    angle: number;
  } {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      entityId: view.getUint16(0, true),
      x: view.getFloat32(2, true),
      y: view.getFloat32(6, true),
      angle: view.getFloat32(10, true)
    };
  }
}
