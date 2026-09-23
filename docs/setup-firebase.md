# 🚀 Firebase Setup Guide for nOmniPeer.js (Step-by-Step)

**Google Firebase Realtime Database** provides a powerful serverless backend for web games and multiplayer lobbies. It offers:
- **Instant Lobby & Matchmaking** – real-time room discovery without custom websocket servers.
- **WebRTC P2P Signaling** – players exchange connection metadata to establish direct 60 FPS WebRTC data channels.
- **Cloud Saves & Player Persistence** – store player profiles, kills/deaths, high scores, campaign progress, and achievements tied to device or user accounts.
- **Generous Free Tier (Spark Plan)** – 1 GB storage, 10 GB/month data transfer, and 50,000 simultaneous connections **for $0/month**.

---

## Step 1: Create a Project in the Firebase Console

1. Navigate to the [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **"Add project"** (or *Create a project*).
3. Enter your project name (e.g., `my-multiplayer-game`) and click *Continue*.
4. Google Analytics is optional; toggle it on or off, then click **"Create project"**.
5. Once your project is ready, click **"Continue"** to access the project dashboard.

---

## Step 2: Enable the Realtime Database

1. In the left navigation menu, expand **Build &rarr; Realtime Database**.
2. Click the **"Create Database"** button.
3. **Select Database Location:**
   - Choose the region closest to your player base (e.g., `europe-west1` in Belgium for Europe, or `us-central1` for North America).
4. **Choose Security Mode:**
   - Select **Start in test mode** for fast local development and prototyping.
   - Click **"Enable"**.

After creation, your database URL will be displayed at the top of the panel, for example:
```text
https://my-multiplayer-game-default-rtdb.europe-west1.firebasedatabase.app/
```
> **Note:** Copy this URL – this is your `databaseURL` (or `firebaseConfig` parameter).

---

## Step 3: Configure Security Rules

Navigate to the **Rules** tab inside the Realtime Database section.

### Option A: Open Sandbox for Gaming (Development & Rapid Prototyping)
Allows players to discover lobbies and save game states without prior authentication:
```json
{
  "rules": {
    "games": {
      "$gameId": {
        "lobbies": {
          ".read": true,
          ".write": true
        },
        "rooms": {
          ".read": true,
          ".write": true
        }
      }
    },
    "users": {
      "$userId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Option B: Authenticated & User-Isolated (Recommended for Production)
Ensures players can only write to their own user profile and saves:
```json
{
  "rules": {
    "games": {
      "$gameId": {
        "lobbies": {
          ".read": true,
          ".write": "auth != null || true"
        },
        "rooms": {
          ".read": true,
          ".write": true
        }
      }
    },
    "users": {
      "$userId": {
        ".read": true,
        ".write": "auth != null && auth.uid == $userId"
      }
    }
  }
}
```
Click **Publish** to save your rules.

---

## Step 4: Configure Authentication (Optional: Google & Anonymous)

To associate game progress with Google accounts or persistent guest IDs:
1. In the left sidebar, click **Build &rarr; Authentication**.
2. Click **"Get started"**.
3. Under the **Sign-in method** tab:
   - Enable **Anonymous** – allows zero-friction guest play without passwords or sign-up forms.
   - Enable **Google** – lets players sign in with 1-click and synchronize their achievements across devices.
4. Click **Save**.

---

## Step 5: Integrate nOmniPeer.js into Your Game

In your game's HTML / JavaScript code, initialize the client using your database URL:

```html
<!-- Include nOmniPeer.js standalone bundle -->
<script src="dist/nomnipeer.js"></script>
<script>
  if (!window.nOmniPeer) document.write('<script src="dist/npeer.js"><\/script>');
</script>

<script>
  // 1. Initialize client with Firebase provider
  const client = new nOmniPeer.Client({
    provider: 'firebase',
    gameId: 'babo-shooter',
    firebaseConfig: 'https://my-multiplayer-game-default-rtdb.europe-west1.firebasedatabase.app'
  });

  async function initGame() {
    // 2. Load cloud save data
    const stats = await client.loadPlayerData('stats');
    if (stats) {
      console.log(`Welcome back! Kills: ${stats.kills}, HighScore: ${stats.highScore}`);
    } else {
      console.log('New player detected, initialized default stats.');
    }

    // 3. Create or join multiplayer lobby
    const lobby = await client.createLobby({
      name: 'Deathmatch Arena',
      maxPlayers: 4,
      nickname: 'Sniper_99'
    });

    // 4. Save game progress or match results
    await client.savePlayerData('stats', {
      kills: (stats?.kills || 0) + 10,
      deaths: (stats?.deaths || 0) + 2,
      highScore: Math.max(stats?.highScore || 0, 2500),
      unlockedItems: ['laser_rifle', 'golden_skin']
    });
    console.log('Player data saved to Firebase Realtime Database!');
  }

  initGame();
</script>
```

---

## Summary

With Firebase and nOmniPeer.js:
1. **Zero backend maintenance:** Google manages scaling and uptime.
2. **Instant cross-device synchronization:** Stats, achievements, and cloud saves persist seamlessly.
3. **High-performance gameplay:** Heavy real-time game traffic flows directly peer-to-peer via WebRTC (UDP), keeping your Firebase quota usage near zero!
