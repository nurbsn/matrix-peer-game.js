import { defineConfig } from 'tsup';

export default defineConfig([
  // Node / Bundler formats (ESM + CJS + Types)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    external: ['peerjs'],
    outDir: 'dist',
  },
  // Browser standalone bundle (IIFE -> window.nOmniPeer, fully self-contained with PeerJS embedded)
  {
    entry: { 'nomnipeer': 'src/index.ts' },
    format: ['iife'],
    globalName: 'nOmniPeer',
    minify: false,
    sourcemap: true,
    noExternal: ['peerjs'],
    platform: 'browser',
    outExtension() {
      return { js: '.js' };
    },
    outDir: 'dist',
  },
  // Browser minified bundle (nomnipeer.min.js)
  {
    entry: { 'nomnipeer.min': 'src/index.ts' },
    format: ['iife'],
    globalName: 'nOmniPeer',
    minify: true,
    noExternal: ['peerjs'],
    platform: 'browser',
    outExtension() {
      return { js: '.js' };
    },
    outDir: 'dist',
  },
  // Backward compatibility alias (matrix-peer-game.js)
  {
    entry: { 'matrix-peer-game': 'src/index.ts' },
    format: ['iife'],
    globalName: 'MatrixPeerGame',
    minify: false,
    sourcemap: true,
    noExternal: ['peerjs'],
    platform: 'browser',
    outExtension() {
      return { js: '.js' };
    },
    outDir: 'dist',
  },
  // Backward compatibility minified alias (matrix-peer-game.min.js)
  {
    entry: { 'matrix-peer-game.min': 'src/index.ts' },
    format: ['iife'],
    globalName: 'MatrixPeerGame',
    minify: true,
    noExternal: ['peerjs'],
    platform: 'browser',
    outExtension() {
      return { js: '.js' };
    },
    outDir: 'dist',
  },
  // Browser standalone bundle without "omni" substring to avoid adblock / EasyPrivacy filters (npeer.js)
  {
    entry: { 'npeer': 'src/index.ts' },
    format: ['iife'],
    globalName: 'nOmniPeer',
    minify: false,
    sourcemap: true,
    noExternal: ['peerjs'],
    platform: 'browser',
    outExtension() {
      return { js: '.js' };
    },
    outDir: 'dist',
  },
  // Browser minified bundle (npeer.min.js)
  {
    entry: { 'npeer.min': 'src/index.ts' },
    format: ['iife'],
    globalName: 'nOmniPeer',
    minify: true,
    noExternal: ['peerjs'],
    platform: 'browser',
    outExtension() {
      return { js: '.js' };
    },
    outDir: 'dist',
  }
]);
