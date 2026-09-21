// Native, lightweight Nostr cryptographic primitives (secp256k1 + BIP-340 Schnorr + SHA256)
// Zero external npm dependencies.

const P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const Gx = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
const Gy = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;

export interface Point {
  x: bigint;
  y: bigint;
}

const G: Point = { x: Gx, y: Gy };

function mod(a: bigint, m: bigint): bigint {
  const result = a % m;
  return result >= 0n ? result : result + m;
}

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let res = 1n;
  let b = mod(base, m);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) res = (res * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return res;
}

function modInverse(a: bigint, m: bigint): bigint {
  return modPow(a, m - 2n, m);
}

function pointAdd(P1: Point | null, P2: Point | null): Point | null {
  if (!P1) return P2;
  if (!P2) return P1;
  if (P1.x === P2.x) {
    if (P1.y !== P2.y) return null;
    const num = mod(3n * P1.x * P1.x, P);
    const den = mod(2n * P1.y, P);
    const s = mod(num * modInverse(den, P), P);
    const rx = mod(s * s - 2n * P1.x, P);
    const ry = mod(s * (P1.x - rx) - P1.y, P);
    return { x: rx, y: ry };
  }
  const num = mod(P2.y - P1.y, P);
  const den = mod(P2.x - P1.x, P);
  const s = mod(num * modInverse(den, P), P);
  const rx = mod(s * s - P1.x - P2.x, P);
  const ry = mod(s * (P1.x - rx) - P1.y, P);
  return { x: rx, y: ry };
}

export function pointMultiply(k: bigint, pt: Point = G): Point {
  let curr: Point | null = pt;
  let result: Point | null = null;
  let scalar = k;
  while (scalar > 0n) {
    if (scalar & 1n) {
      result = pointAdd(result, curr);
    }
    curr = pointAdd(curr, curr);
    scalar >>= 1n;
  }
  return result!;
}

// Convert bigint to 32-byte hex string
export function toHex32(n: bigint): string {
  const positive = mod(n, 2n ** 256n);
  return positive.toString(16).padStart(64, '0').slice(-64);
}

// Convert byte array to hex
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to byte array
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Standard SHA-256 hash using Web Crypto API with fallback
export async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }
  // Sync fallback for pure environments
  return syncSha256(data);
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await sha256Bytes(bytes);
  return bytesToHex(hash);
}

// BIP-340 tagged hash: SHA256(SHA256(tag) || SHA256(tag) || msg)
export async function taggedHash(tag: string, msg: Uint8Array): Promise<Uint8Array> {
  const tagBytes = new TextEncoder().encode(tag);
  const tagHash = await sha256Bytes(tagBytes);
  const concat = new Uint8Array(tagHash.length * 2 + msg.length);
  concat.set(tagHash, 0);
  concat.set(tagHash, tagHash.length);
  concat.set(msg, tagHash.length * 2);
  return sha256Bytes(concat);
}

function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

// Generate random 32-byte secret key and corresponding public key
export function generateKeyPair(): { secretKey: string; publicKey: string } {
  const randBytes = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randBytes);
  } else {
    for (let i = 0; i < 32; i++) randBytes[i] = Math.floor(Math.random() * 256);
  }
  
  let d = BigInt('0x' + bytesToHex(randBytes)) % N;
  if (d === 0n) d = 1n;

  const P = pointMultiply(d, G);
  // BIP-340: if P.y is odd, negate d
  if (P.y % 2n !== 0n) {
    d = N - d;
  }

  return {
    secretKey: toHex32(d),
    publicKey: toHex32(P.x)
  };
}

// Sign 32-byte message hash using canonical BIP-340 Schnorr
export async function schnorrSign(msgHashHex: string, secretKeyHex: string, auxRandHex?: string): Promise<string> {
  const d0 = BigInt('0x' + secretKeyHex);
  if (d0 <= 0n || d0 >= N) throw new Error('Invalid secret key');

  const P0 = pointMultiply(d0, G);
  const d = P0.y % 2n === 0n ? d0 : N - d0;

  const dBytes = hexToBytes(toHex32(d));
  const pxBytes = hexToBytes(toHex32(P0.x));
  const msgBytes = hexToBytes(msgHashHex);

  let aBytes: Uint8Array;
  if (auxRandHex) {
    aBytes = hexToBytes(auxRandHex);
  } else {
    aBytes = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(aBytes);
    }
  }

  const tAux = await taggedHash('BIP0340/aux', aBytes);
  const t = xorBytes(dBytes, tAux);

  const nonceInput = new Uint8Array(t.length + pxBytes.length + msgBytes.length);
  nonceInput.set(t, 0);
  nonceInput.set(pxBytes, t.length);
  nonceInput.set(msgBytes, t.length + pxBytes.length);

  const randHash = await taggedHash('BIP0340/nonce', nonceInput);
  let k0 = BigInt('0x' + bytesToHex(randHash)) % N;
  if (k0 === 0n) throw new Error('k0 is zero');

  const R = pointMultiply(k0, G);
  const k = R.y % 2n === 0n ? k0 : N - k0;

  const rxBytes = hexToBytes(toHex32(R.x));
  const challengeInput = new Uint8Array(rxBytes.length + pxBytes.length + msgBytes.length);
  challengeInput.set(rxBytes, 0);
  challengeInput.set(pxBytes, rxBytes.length);
  challengeInput.set(msgBytes, rxBytes.length + pxBytes.length);

  const eHash = await taggedHash('BIP0340/challenge', challengeInput);
  const e = BigInt('0x' + bytesToHex(eHash)) % N;

  const s = mod(k + e * d, N);
  return toHex32(R.x) + toHex32(s);
}

// Lightweight synchronous SHA-256 implementation as standalone fallback
function syncSha256(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = data.length;
  const bitLen = len * 8;
  const padLen = (((len + 8) >> 6) + 1) << 6;
  const msg = new Uint8Array(padLen);
  msg.set(data);
  msg[len] = 0x80;

  const view = new DataView(msg.buffer);
  view.setUint32(padLen - 4, bitLen, false);

  const W = new Uint32Array(64);
  for (let i = 0; i < padLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^ ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^ (W[t - 15] >>> 3);
      const s1 = ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^ ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}
