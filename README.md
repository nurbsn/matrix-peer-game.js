# 🌐 nOmniPeer.js

> **Omni-Channel Serverless P2P Game Networking Library for WebRTC**  
> Build multiplayer browser games **without paying for or maintaining dedicated game servers!**  
> Usable as **flat JavaScript (`<script src="...">`) with zero Node.js / build steps required**, or as a modern TypeScript/ESM package.

**English** | [Polski](README.pl.md)

---

## 🚀 Why nOmniPeer.js?

Traditional multiplayer games require expensive backend game servers (Node.js, C#, Go), databases, matchmakers, and continuous maintenance.

**nOmniPeer.js** eliminates server maintenance by combining multiple free, decentralized matchmaking & signaling protocols with direct WebRTC browser-to-browser data channels:

```
+---------------------------------------------------------------------------+
|              Omni-Channel Matchmaking & Signaling Layer                   |
|   ⚡ NOSTR (Zero-Auth, Schnorr, Relays)   📡 MQTT (Wildcards, Open Brokers)|
|   🔥 Firebase (Realtime DB, onDisconnect) 💬 Matrix (Rooms, E2EE, Chat)   |
|   🔗 Direct P2P (Code / URL Link Sharing with Zero Infrastructure)        |
+---------------------------------------------------------------------------+
                                      |
                       (Direct WebRTC P2P Handshake)
                                      v
+---------------------------------------------------------------------------+
|                          PeerJS (WebRTC Core)                             |
|  - Direct Browser-to-Browser P2P DataChannels                             |
|  - Ultra-low latency (10-30 ms RTT)                                       |
|  - Unreliable UDP (60 FPS positions, physics, raycasts)                   |
|  - Reliable TCP-like (Orders, turns, chat, game events)                   |
+---------------------------------------------------------------------------+
```

---

## 📦 Quick Start: Flat Vanilla JS (Zero Node.js!)

You do not need Node.js, npm, Webpack, or Vite to build multiplayer games. Simply include `dist/nomnipeer.js` in your HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Multiplayer Game</title>
</head>
<body>
  <!-- All-in-one standalone bundle with embedded PeerJS & pure JS crypto -->
  <script src="./dist/nomnipeer.js"></script>

  <script>
    async function init() {
      // 1. Initialize client with your choice of matchmaking provider
      // Options: 'nostr' | 'mqtt' | 'firebase' | 'matrix'
      const net = new nOmniPeer.Client({
        provider: 'nostr', // Zero-auth, instant key generation
        gameId: 'my-arena-game'
      });

      // 2. Discover open game lobbies
      const lobbies = await net.listLobbies();
      console.log('Available lobbies:', lobbies);

      // 3. Create a game lobby (host)
      const room = await net.createLobby({ name: 'Arena #1', maxPlayers: 4 });

      room.on('playerJoined', (player) => console.log('Player joined:', player));
      room.on('chatMessage', (msg) => console.log(`${msg.senderNickname}: ${msg.text}`));

      // 4. Start game -> P2P WebRTC DataChannel connects automatically
      room.on('gameStarted', () => {
        const engine = net.createRealtimeEngine({ tickRate: 30 });
        
        engine.on('entityUpdate', ({ entityId, state }) => {
          console.log('Player state:', entityId, state);
        });
      });
    }

    init();
  </script>
</body>
</html>
```

## 🌐 Multi-Provider Matchmaking & Lobby Support

Switch between multiple signaling and lobby backends with a single configuration line:

| Provider (`provider`) | Player Authentication | Server Requirements | Key Advantages |
| :--- | :--- | :--- | :--- |
| **`'nostr'`** | **Zero-Auth** (Key generated in 1 ms) | **0 servers** (Open Damus, Nos.lol relays) | Open decentralized network, no passwords, pure JS Schnorr |
| **`'mqtt'`** | **Anonymous** | **0 servers** (Public HiveMQ, EMQX brokers) | Ultra-fast wildcard-based room discovery |
| **`'firebase'`** | **Anonymous UID** | Google Realtime Database | Self-cleaning lobbies via disconnect triggers (`onDisconnect`) |
| **`'matrix'`** | Matrix Account / Guest | matrix.org or Conduit | End-to-end encryption, federation, persistent room state |

```javascript
// Instant matchmaking via open NOSTR protocol (zero accounts needed!):
const net = new nOmniPeer.Client({
  provider: 'nostr',
  gameId: 'babo-shooter'
});

// Discover public open lobbies:
const lobbies = await net.listLobbies();

// Create room and start playing WebRTC 60 FPS:
const lobby = await net.createLobby({ name: 'Babo Arena #1', maxPlayers: 6 });
lobby.on('playerJoined', (p) => console.log('Player joined:', p));
lobby.on('chatMessage', (m) => console.log(`${m.senderNickname}: ${m.text}`));
```

---

## 🕹️ Specialized Engines for Every Game Genre

nOmniPeer.js includes 4 pre-built, specialized engines tailored for different gameplay mechanics:

### 1. `RealtimeEngine` (Action, FPS, 2D/3D Shooters, Racers)
Runs over WebRTC's fast unreliable UDP channel (`reliable: false`) with built-in snapshot interpolation (`lerp`) to eliminate stutter and jitter.

**18-Byte Binary Packets for 3D & FPS Games:**  
Instead of bulky JSON strings (75+ bytes), 3D player coordinates `(x, y, z, rotY)` are packed into **exactly 18 bytes**:

```javascript
const engine = net.createRealtimeEngine({ tickRate: 60, interpolationDelayMs: 40 });

// In your 60 FPS render loop, broadcast 18 bytes via UDP:
engine.sendVector3(myPlayerId, player.x, player.y, player.z, player.rotationY);

// On receiving remote players with smooth linear interpolation:
const smoothPos = engine.getInterpolatedPosition(enemyId);
```

---

### 2. `LockstepEngine` (RTS & Fighting Games)
Real-time strategy games (like *StarCraft* or *Age of Empires*) never stream hundreds of individual unit coordinates across the network. Instead, they use **Deterministic Lockstep**:
- Only user commands (mouse clicks, build orders) are sent over the network (a few dozen bytes).
- All peers execute simulation ticks in lockstep with lag detection and automatic pauses.

```javascript
const rts = net.createLockstepEngine({
  tickDurationMs: 100, // 10 simulation ticks per second
  commandDelayTicks: 2  // Execute 2 ticks ahead to hide latency
});

// Send unit move order:
rts.queueCommand('MOVE_UNITS', { unitIds: [1, 2, 3], targetX: 150, targetY: 300 });

// Synchronously execute tick:
rts.on('tickExecute', ({ tick, commands }) => {
  commands.forEach(cmd => applyCommand(cmd));
  advanceSimulation();
});

rts.start();
```

---

### 3. `TurnBasedEngine` (Card Games, Chess, Board Games)
Handles turn order, moves, turn timers (timeout countdown), and full action history with undo capability:

```javascript
const turnGame = net.createTurnBasedEngine({
  playersOrder: ['player1', 'player2'],
  turnTimeoutMs: 30000 // 30s per turn
});

turnGame.on('turnChange', ({ activePlayerId, turnNumber }) => {
  console.log(`Turn #${turnNumber}: ${activePlayerId}'s move`);
});

if (turnGame.isMyTurn) {
  turnGame.submitAction('PLAY_CARD', { cardId: 'fireball', target: 'enemy1' });
  turnGame.passTurn();
}
```

---

### 4. `SharedStateEngine` (Pictionary, Drawing, Clickers, Shared Canvases)
A reactive key-value distributed store synchronized peer-to-peer across all players with delta change operations:

```javascript
const state = net.createSharedState({
  strokes: [],
  score: 0
});

state.subscribe('strokes', (newStrokes) => renderCanvas(newStrokes));

// Automatically broadcasts delta to all peers:
state.push('strokes', { x1: 10, y1: 20, x2: 30, y2: 40, color: '#ff0000' });
```

---

## 🎮 Interactive Browser Demos

The `examples/` directory contains runnable, zero-dependency HTML files:

| Example | Path | Description |
| :--- | :--- | :--- |
| **01. Full Vanilla 2D Arena** | `examples/01-vanilla-flat-html/index.html` | Complete multiplayer lobby, Matrix guest login, ready checks, in-lobby chat, and real-time 60 FPS movement with live ping meter. |
| **02. FPS Binary Vector3** | `examples/02-realtime-fps-arena/index.html` | High-frequency 18-byte binary Vector3 serialization benchmarks and raw buffer inspection. |
| **03. RTS Deterministic Lockstep** | `examples/03-rts-lockstep/index.html` | Tactical unit squad movement using synchronized frame lockstep and order queueing. |
| **04. Turn-Based Board Game** | `examples/04-turn-based/index.html` | Turn-based Tic-Tac-Toe / board game with turn timers and action history. |
| **05. Babo Violent 2D Shooter** | `examples/05-complete-game-matrix-chat/index.html` | Full 2D multiplayer shooter in Babo Violent style (rolling balls in a maze, WASD movement, mouse aim & shooting, health bars, frags, respawn) in 60 FPS WebRTC with **multi-provider lobby selection (NOSTR, MQTT, Firebase, Matrix, Direct P2P)** and live in-game chat! |

---

## 🔑 Simplified Matrix Onboarding & Authentication

Because public matrix servers like `matrix.org` have disabled open guest registration (`403 M_FORBIDDEN`) to mitigate spam, nOmniPeer.js provides 4 seamless ways to onboard players:

1. **Persistent Auto-Login (`localStorage`):**
   ```javascript
   if (net.autoLogin('my_game_auth')) {
     console.log('Restored session as:', net.currentUserId);
   } else {
     await net.loginWithPassword('username', 'password');
     net.saveSession('my_game_auth');
   }
   ```

2. **In-Game User Registration:**
   ```javascript
   const auth = await net.registerUser('new_player', 'secret_pwd_123', 'MyNickname');
   net.saveSession('my_game_auth');
   ```

3. **Direct P2P Link Sharing (Zero-Auth Fallback):**
   Players can start a match instantly via PeerJS without any account and share a direct join link (e.g. `index.html?p2proom=ABC123XYZ`).

4. **Self-Host Ultra-Lightweight Conduit Matrix Server (< 30 MB RAM):**
   The [`deploy/conduit/`](deploy/conduit/README.md) directory includes a 1-minute `docker-compose.yml` for Conduit with guest registration enabled (`allow_guests = true`). Players can join with 100 ms anonymous guest logins (`net.loginAsGuest('Player1')`) without email, password, or captcha.

---

## 🛠️ Development & Building

```bash
# Install dependencies
npm install

# Run Vitest unit tests (23/23 tests passing)
npm run test

# Build standalone IIFE and ESM/CJS bundles
npm run build
```

Generated files in `dist/`:
- `dist/nomnipeer.js` – Standalone bundle (with embedded PeerJS for `<script>` tag, global `nOmniPeer`)
- `dist/nomnipeer.min.js` – Minified standalone bundle (~143 KB)
- `dist/matrix-peer-game.js` – Backward compatibility bundle (global `MatrixPeerGame`)
- `dist/matrix-peer-game.min.js` – Backward compatibility minified bundle
- `dist/index.mjs` – ES Module
- `dist/index.js` – CommonJS Module
- `dist/index.d.ts` – Full TypeScript definitions

---

## 📄 License

MIT License.
