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
  // Browser standalone bundle (IIFE -> window.MatrixPeerGame, fully self-contained with PeerJS embedded)
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
  // Browser minified bundle
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
  }
]);
