# 🎮 MatrixPeerGame

> **Serverless Multiplayer Game Networking Library**  
> Build multiplayer browser games **without paying for or maintaining dedicated game servers!**  
> Usable as **flat JavaScript (`<script src="...">`) with zero Node.js / build steps required**, or as a modern TypeScript/ESM package.

**English** | [Polski](README.pl.md)

---

## 🚀 Why MatrixPeerGame?

Traditional multiplayer games require expensive backend game servers (Node.js, C#, Go), databases, matchmakers, and continuous maintenance.

**MatrixPeerGame** eliminates server maintenance by combining two free, decentralized, battle-tested technologies:

```
+-------------------------------------------------------------+
|               Matrix Protocol (e.g. matrix.org)             |
|  - Room Discovery & Matchmaking    - In-Lobby Chat          |
|  - Player Ready Checks             - WebRTC Signaling / SDP |
|  - Free Guest Authentication                                |
+-------------------------------------------------------------+
                              |
               (Direct WebRTC P2P Handshake)
                              v
+-------------------------------------------------------------+
|                      PeerJS (WebRTC)                        |
|  - Direct Browser-to-Browser P2P DataChannels               |
|  - Ultra-low latency (10-30 ms RTT)                         |
|  - Unreliable UDP (60 FPS positions, physics, raycasts)     |
|  - Reliable TCP-like (Orders, turns, chat, game events)     |
+-------------------------------------------------------------+
```

---

## 📦 Quick Start: Flat Vanilla JS (Zero Node.js!)

You do not need Node.js, npm, Webpack, or Vite to build multiplayer games. Simply include `dist/matrix-peer-game.js` in your HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Multiplayer Game</title>
</head>
<body>
  <!-- All-in-one standalone bundle with embedded PeerJS -->
  <script src="./dist/matrix-peer-game.js"></script>

  <script>
    async function init() {
      // 1. Initialize client
      const net = new MatrixPeerGame.Client({
        homeserver: 'https://matrix.org',
        gameId: 'my-arena-game'
      });

      // 2. Log in as a guest (no email or password required)
      await net.loginAsGuest('Player1');

      // 3. Create a game lobby (host)
      const room = await net.createLobby({ name: 'Arena #1', maxPlayers: 4 });

      room.on('playerJoined', (player) => console.log('Player joined:', player));

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

---

## 🕹️ Specialized Engines for Every Game Genre

MatrixPeerGame includes 4 pre-built, specialized engines tailored for different gameplay mechanics:

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
  commandDelayTicks: 2  // Orders execute 2 ticks ahead
});

// Player clicks on the map:
rts.queueCommand('MOVE_UNITS', { unitIds: [1, 2, 3], targetX: 120, targetY: 300 });

// Synchronized tick execution across all players without desync:
rts.on('tickExecute', ({ tick, commands }) => {
  commands.forEach(cmd => executeOrder(cmd));
  advanceSimulationPhysics();
});

rts.start();
```

---

### 3. `TurnBasedEngine` (Chess, Checkers, Card & Board Games)
Handles player turn sequences, enforces turn validity (prevents players from moving out of turn), manages turn time limits (countdown timers), and stores complete action history for undo/replays.

```javascript
const turnGame = net.createTurnBasedEngine({
  playersOrder: ['player1', 'player2'],
  turnTimeoutMs: 30000 // 30 seconds per turn
});

turnGame.on('turnChange', ({ activePlayerId, turnNumber }) => {
  console.log(`Turn #${turnNumber}: active player is ${activePlayerId}`);
});

// Submit move during your turn:
if (turnGame.isMyTurn) {
  turnGame.submitAction('MOVE_PIECE', { from: 'e2', to: 'e4' });
  turnGame.passTurn();
}
```

---

### 4. `SharedStateEngine` (Pictionary, Whiteboards, Clickers, Party Games)
A reactive Key-Value store synchronized peer-to-peer across all players with conflict resolution and property subscriptions:

```javascript
const store = net.createSharedState({
  canvasStrokes: [],
  currentScore: 0
});

// Subscribe to specific keys:
store.subscribe('canvasStrokes', (strokes) => redrawCanvas(strokes));

// Updating a value locally instantly syncs to all other connected peers:
store.push('canvasStrokes', { x1: 10, y1: 20, x2: 30, y2: 40, color: '#ff0000' });
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
| **05. In-Game Matrix Chat (Cyber Gems)** | `examples/05-complete-game-matrix-chat/index.html` | Playable 2D gem collector with 60 FPS P2P WebRTC movement, live in-game Matrix chat, auto-login persistence, and shareable room links (`?room=` / `?p2proom=`). |

---

## 🔑 Simplified Matrix Onboarding & Authentication

Because public matrix servers like `matrix.org` have disabled open guest registration (`403 M_FORBIDDEN`) to mitigate spam, MatrixPeerGame provides 4 seamless ways to onboard players:

1. **Persistent Auto-Login (`localStorage`):**
   ```javascript
   // Automatically restore previous session so players only log in once:
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
   Players can start a match instantly via PeerJS without any Matrix account and share a direct join link (e.g. `index.html?p2proom=ABC123XYZ`).

4. **Self-Host Ultra-Lightweight Conduit Matrix Server (< 30 MB RAM):**
   The [`deploy/conduit/`](deploy/conduit/README.md) directory includes a 1-minute `docker-compose.yml` for Conduit with guest registration enabled (`allow_guests = true`). Players can join with 100 ms anonymous guest logins (`net.loginAsGuest('Player1')`) without email, password, or captcha.

---

## 🛠️ Development & Building

```bash
# Install dependencies
npm install

# Run Vitest unit tests (100% pass)
npm run test

# Build standalone IIFE and ESM/CJS bundles
npm run build
```

Generated files in `dist/`:
- `dist/matrix-peer-game.js` – Standalone bundle (with embedded PeerJS for `<script>` tag)
- `dist/matrix-peer-game.min.js` – Minified standalone bundle (~116 KB)
- `dist/index.mjs` – ES Module
- `dist/index.js` – CommonJS Module
- `dist/index.d.ts` – Full TypeScript definitions

---

## 📄 License

MIT License.
