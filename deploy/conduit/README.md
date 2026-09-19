# 🚀 Conduit: Lekki serwer Matrix z kontami gości (RAM < 30 MB)

Dla gier multiplayer idealnym rozwiązaniem do obsługi lobby jest **[Conduit](https://conduit.rs)** – nowoczesny, ultra-lekki serwer Matrix napisany w Rust:
- **Zużycie pamięci:** zaledwie 20–30 MB RAM (działa na darmowych instancjach Fly.io, Render lub najtańszym VPS za kilka zł)
- **Anonimowe konta gości (Guest Accounts):** włączone (`allow_guests = true`), dzięki czemu gracze wchodzą do gry w 100 ms bez podawania maila ani hasła
- **Pełna kompatybilność:** obsługuje ten sam protokół Matrix co `matrix.org`, wspiera federację i pokoje lobby.

---

## ⚡ Uruchomienie w 1 minutę (Docker)

```bash
cd deploy/conduit
docker compose up -d
```

Serwer natychmiast nasłuchuje na porcie `6167`.

Wystarczy w swojej grze podać adres serwera:
```javascript
const net = new MatrixPeerGame.Client({
  homeserver: 'https://twoj-serwer-conduit.org', // lub http://localhost:6167
  gameId: 'moja-gra'
});

// Rejestracja gościa działa natychmiast bez captcha:
await net.loginAsGuest('Gracz_123');
```
