# 🪐 Konfiguracja Własnego Serwera Matrix dla nOmniPeer.js (Poradnik Krok po Kroku)

**Protokół Matrix** to otwarty, zdecentralizowany standard komunikacji czasu rzeczywistego. W połączeniu z **nOmniPeer.js** stanowi idealne rozwiązanie do obsługi:
- **Poczekalni (Lobbies)** i publicznej listy otwartych gier.
- **Wbudowanego czatu tekstowego w grze** oraz kanałów drużynowych.
- **Zdecentralizowanych Zapisów w Chmurze (Cloud Saves)** przez oficjalne Matrix Account Data API (`m.account_data`).
- **Niezależności od korporacji** – pełna własność danych graczy na Twoim własnym serwerze!

---

## Dlaczego Conduit, a nie Synapse?

| Cecha | 🚀 Conduit (Rust) – **Zalecany do gier** | 🐍 Synapse (Python) |
| :--- | :--- | :--- |
| **Zużycie pamięci RAM** | **20 – 30 MB RAM** (ultra-lekki) | 500 MB – 2 GB RAM |
| **Konta Gości (Guest Accounts)** | Błyskawiczne (`allow_guests = true`) | Wymaga skomplikowanej konfiguracji |
| **Wymagania sprzętowe** | Najtańszy VPS za 10–15 zł / Fly.io / Render | Dedykowana mocniejsza maszyna |
| **Instalacja** | 1 binarka lub 1 kontener Docker | Wiele zależności i baza PostgreSQL |

---

## Krok 1: Wymagania

- Dowolny serwer VPS z systemem Linux (Debian, Ubuntu) lub chmura (np. Hetzner, OVH, DigitalOcean, Linode).
- Zainstalowany **Docker** oraz **Docker Compose**.
- Domena lub subdomena skierowana na IP Twojego serwera (np. `matrix.twoja-gra.pl`).
- Otwarte porty: `80` (HTTP), `443` (HTTPS) oraz opcjonalnie `6167` (wewnętrzny port Conduita).

---

## Krok 2: Uruchomienie Conduit w Dockerze

W repozytorium nOmniPeer.js w katalogu [`deploy/conduit/`](../deploy/conduit/) znajduje się gotowa konfiguracja.

Stwórz na serwerze katalog i przejdź do niego:
```bash
mkdir -p /opt/game-matrix && cd /opt/game-matrix
```

### 1. Utwórz plik `conduit.toml`:
```toml
[global]
server_name = "matrix.twoja-gra.pl"
port = 6167
address = "0.0.0.0"

# Baza danych
database_backend = "rocksdb"
database_path = "/var/lib/matrix-conduit/"

# Opcje dla graczy (Brak captchy, natychmiastowe wejście gości)
allow_registration = true
allow_guests = true
yes_i_am_very_sure_i_want_an_open_registration_server_prone_to_spam = true

# Limit wielkości zapytań (20 MB)
max_request_size = 20_000_000
```

### 2. Utwórz plik `docker-compose.yml`:
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

Uruchom serwer w tle:
```bash
docker compose up -d
```

---

## Krok 3: Konfiguracja Reverse Proxy i SSL (HTTPS + CORS)

Przeglądarki internetowe wymagają, aby zapytania z gier WWW (HTTPS) kierowane były na serwer z poprawnym certyfikatem SSL oraz nagłówkami **CORS** (`Access-Control-Allow-Origin: *`).

### Opcja A: Caddy (Najprostsza, automatyczny darmowy SSL w 30 sekund)
Zainstaluj Caddy (`sudo apt install caddy`) i w `/etc/caddy/Caddyfile` wklej:
```caddy
matrix.twoja-gra.pl {
    header Access-Control-Allow-Origin *
    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization"

    reverse_proxy 127.0.0.1:6167
}
```
Zrestartuj Caddy:
```bash
sudo systemctl restart caddy
```
Caddy automatycznie wygeneruje bezpłatny certyfikat SSL z Let's Encrypt i odnowi go w tle!

### Opcja B: Nginx + Certbot
Jeśli wolisz tradycyjny serwer Nginx, w `/etc/nginx/sites-available/matrix` wklej:
```nginx
server {
    server_name matrix.twoja-gra.pl;

    location / {
        proxy_pass http://127.0.0.1:6167;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Nagłówki CORS niezbędne dla gier w przeglądarce
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```
Wygeneruj certyfikat Let's Encrypt:
```bash
sudo certbot --nginx -d matrix.twoja-gra.pl
```

---

## Krok 4: Weryfikacja Działania

Otwórz w przeglądarce lub w terminalu:
```bash
curl https://matrix.twoja-gra.pl/_matrix/client/versions
```
Odpowiedź powinna zawierać obsługiwane wersje API:
```json
{"versions":["r0.5.0","r0.6.0","v1.1","v1.2","v1.3"]}
```
Gratulacje! Twój własny serwer gier Matrix działa i jest gotowy do obsługi graczy z całego świata.

---

## Krok 5: Integracja z nOmniPeer.js

Wystarczy wskazać adres swojego serwera homeserver w kodzie JavaScript:

```html
<script src="dist/nomnipeer.js"></script>
<script>
  if (!window.nOmniPeer) document.write('<script src="dist/npeer.js"><\/script>');
</script>

<script>
  // 1. Inicjalizacja klienta z własnym serwerem Conduit
  const client = new nOmniPeer.Client({
    provider: 'matrix',
    homeserver: 'https://matrix.twoja-gra.pl',
    gameId: 'super-arena'
  });

  async function start() {
    // 2. Błyskawiczne logowanie gościa w 50 ms bez hasła i captchy:
    await client.loginAsGuest('Ninja_' + Math.floor(Math.random() * 1000));
    console.log('Zalogowano na własnym Matrixie jako:', client.currentUserId);

    // 3. Wczytanie profilu i statystyk gracza z Matrix Account Data:
    const stats = await client.loadPlayerData('stats');
    if (stats) {
      console.log(`Pobrano zapis z serwera: Fragi: ${stats.kills}, Zgony: ${stats.deaths}`);
    }

    // 4. Utworzenie lub dołączenie do lobby:
    const lobby = await client.createLobby({
      name: 'Mecz Turniejowy',
      maxPlayers: 4
    });

    // 5. Zapisanie wyniku po zakończonym meczu:
    await client.savePlayerData('stats', {
      kills: (stats?.kills || 0) + 12,
      deaths: (stats?.deaths || 0) + 3,
      rank: 'Złoto',
      savedAt: Date.now()
    });
    console.log('Dane gracza zostały bezpiecznie utrwalone na homeserverze Matrix!');
  }

  start();
</script>
```

---

## Podsumowanie

Własny serwer Conduit daje Ci:
1. **Pełną prywatność i niezależność** – brak limitów zewnętrznych korporacji.
2. **Konta gości bez tarcia** – gracze wchodzą do gry jednym kliknięciem bez haseł.
3. **Oficjalne Cloud Saves w Matrixie** – dane graczy są trwale przechowywane w standardzie Matrix Account Data.
4. **Znikome koszty** – zużycie RAM < 30 MB pozwala uruchomić serwer na najtańszym VPS za kilkanaście złotych rocznie.
