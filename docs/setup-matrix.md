# 🪐 Self-Hosted Matrix Server Guide for nOmniPeer.js (Step-by-Step)

The **Matrix Protocol** is an open, decentralized standard for secure, real-time communication. Paired with **nOmniPeer.js**, it serves as an ideal backend for:
- **Matchmaking & Public Game Lobbies**.
- **Real-Time In-Game Chat** and team communication channels.
- **Decentralized Cloud Saves** via the official Matrix Account Data API (`m.account_data`).
- **Complete Data Ownership** – no corporate lock-in, zero external API rate limits, full control.

---

## Why Conduit Instead of Synapse?

| Feature | 🚀 Conduit (Rust) – **Recommended for Games** | 🐍 Synapse (Python) |
| :--- | :--- | :--- |
| **RAM Usage** | **20 – 30 MB RAM** (ultra-lightweight) | 500 MB – 2 GB RAM |
| **Guest Accounts** | Instant (`allow_guests = true`) | Requires complex configuration |
| **Server Requirements** | Low-cost VPS ($2–$4/mo) / Fly.io / Render | Dedicated higher-tier server |
| **Setup Complexity** | Single binary or single Docker container | Multiple services + PostgreSQL database |

---

## Step 1: Prerequisites

- A Linux server (Ubuntu, Debian) or cloud VM (Hetzner, OVH, DigitalOcean, Linode).
- **Docker** and **Docker Compose** installed.
- A domain or subdomain pointing to your server's public IP (e.g., `matrix.my-game.org`).
- Open ports: `80` (HTTP), `443` (HTTPS), and optionally `6167` (Conduit's internal port).

---

## Step 2: Run Conduit with Docker

Ready-to-use configuration files are provided in [`deploy/conduit/`](../deploy/conduit/).

Create a working directory on your server:
```bash
mkdir -p /opt/game-matrix && cd /opt/game-matrix
```

### 1. Create `conduit.toml`:
```toml
[global]
server_name = "matrix.my-game.org"
port = 6167
address = "0.0.0.0"

# Storage
database_backend = "rocksdb"
database_path = "/var/lib/matrix-conduit/"

# Gamer-friendly zero-friction access
allow_registration = true
allow_guests = true
yes_i_am_very_sure_i_want_an_open_registration_server_prone_to_spam = true

# Request size limit (20 MB)
max_request_size = 20_000_000
```

### 2. Create `docker-compose.yml`:
```yaml
version: '3'

services:
  conduit:
    image: matrixconduit/matrix-conduit:latest
    container_name: game-matrix-lobby
    restart: unless-stopped
    volumes:
      - ./conduit.toml:/etc/matrix-conduit/conduit.toml
      - conduit-data:/var/lib/matrix-conduit
    ports:
      - "127.0.0.1:6167:6167"

volumes:
  conduit-data:
```

Start Conduit in detached mode:
```bash
docker compose up -d
```

---

## Step 3: Configure Reverse Proxy & SSL (HTTPS + CORS)

Modern web browsers require web games running over HTTPS to connect only to secure endpoints with appropriate **CORS** headers (`Access-Control-Allow-Origin: *`).

### Option A: Caddy (Easiest: Automatic SSL in 30 Seconds)
Install Caddy (`sudo apt install caddy`) and add to `/etc/caddy/Caddyfile`:
```caddy
matrix.my-game.org {
    header Access-Control-Allow-Origin *
    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization"

    reverse_proxy 127.0.0.1:6167
}
```
Reload Caddy:
```bash
sudo systemctl restart caddy
```
Caddy will automatically obtain, install, and renew free Let's Encrypt SSL certificates.

### Option B: Nginx + Certbot
If using Nginx, configure `/etc/nginx/sites-available/matrix`:
```nginx
server {
    server_name matrix.my-game.org;

    location / {
        proxy_pass http://127.0.0.1:6167;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Essential CORS headers for browser games
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```
Acquire the SSL certificate:
```bash
sudo certbot --nginx -d matrix.my-game.org
```

---

## Step 4: Verify the Installation

Test your new homeserver in a terminal or browser:
```bash
curl https://matrix.my-game.org/_matrix/client/versions
```
Expected JSON response:
```json
{"versions":["r0.5.0","r0.6.0","v1.1","v1.2","v1.3"]}
```
Your gaming Matrix server is operational and ready to host players worldwide.

---

## Step 5: Connect nOmniPeer.js

Pass your server address directly to `nOmniPeer.Client`:

```html
<script src="dist/nomnipeer.js"></script>
<script>
  if (!window.nOmniPeer) document.write('<script src="dist/npeer.js"><\/script>');
</script>

<script>
  // 1. Initialize client with your private Conduit homeserver
  const client = new nOmniPeer.Client({
    provider: 'matrix',
    homeserver: 'https://matrix.my-game.org',
    gameId: 'cyber-arena'
  });

  async function start() {
    // 2. Instant guest login in ~50ms (no email, no captcha):
    await client.loginAsGuest('Pilot_' + Math.floor(Math.random() * 1000));
    console.log('Signed in as:', client.currentUserId);

    // 3. Load player stats from Matrix Account Data:
    const stats = await client.loadPlayerData('stats');
    if (stats) {
      console.log(`Loaded save from Matrix: Kills: ${stats.kills}, Deaths: ${stats.deaths}`);
    }

    // 4. Create or browse lobbies:
    const lobby = await client.createLobby({
      name: 'Championship Match',
      maxPlayers: 4
    });

    // 5. Save progress to Matrix cloud storage:
    await client.savePlayerData('stats', {
      kills: (stats?.kills || 0) + 15,
      deaths: (stats?.deaths || 0) + 4,
      tier: 'Diamond',
      timestamp: Date.now()
    });
    console.log('Player data saved to Matrix account data!');
  }

  start();
</script>
```

---

## Summary

Hosting Conduit for your game provides:
1. **Total sovereignty:** You own the infrastructure and player accounts.
2. **Frictionless guest accounts:** 1-click player onboarding.
3. **Decentralized Cloud Saves:** Native persistent storage using Matrix `m.account_data`.
4. **Minimal resource footprint:** Runs smoothly on virtually any machine with `<30 MB` RAM.
