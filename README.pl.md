# 🌐 nOmniPeer.js

> **Omni-Channel Serverless P2P Game Networking Library for WebRTC**  
> Twórz gry wieloosobowe w przeglądarce **bez kosztów i bez konieczności stawiania własnych serwerów dedykowanych!**  
> Działa jako **płaskie JS (`<script src="...">`) bez Node.js i bez bundlerów** lub jako nowoczesna paczka TypeScript/ESM.

[English](README.md) | **Polski**

---

## 🚀 Czym jest nOmniPeer.js?

Tradycyjne gry multiplayer wymagają drogich serwerów backendowych (Node.js, C#, Go), baz danych, matchmakerów i stałej konserwacji.

**nOmniPeer.js** całkowicie eliminuje koszty i utrzymanie serwerów dzięki połączeniu wielokanałowej sygnalizacji (NOSTR, MQTT, Firebase, Matrix, Direct P2P) z bezpośrednimi kanałami WebRTC DataChannel (PeerJS) między przeglądarkami:

```
+---------------------------------------------------------------------------+
|               Wielokanałowa Warstwa Lobby i Sygnalizacji                  |
|   ⚡ NOSTR (Zero-Auth, Schnorr, Relaye)   📡 MQTT (Wildcardy, Otwarte)     |
|   🔥 Firebase (Realtime DB, onDisconnect) 💬 Matrix (Pokoje, E2EE, Czat)   |
|   🔗 Direct P2P (Brak infrastruktury, linki z zaproszeniem)               |
+---------------------------------------------------------------------------+
                                      |
                       (Bezpośredni Handshake WebRTC P2P)
                                      v
+---------------------------------------------------------------------------+
|                          PeerJS (Silnik WebRTC)                           |
|  - Połączenia P2P przeglądarka-przeglądarka z opóźnieniem 10–30 ms        |
|  - Kanał Unreliable (UDP): 60 FPS dla fizyki, pozycji i pocisków          |
|  - Kanał Reliable (TCP-like): bezbłędne rozkazy, akcje i czat             |
+---------------------------------------------------------------------------+
```

---

## 📦 Szybki Start: Użycie jako „Płaskie JS” (Zero Node.js!)

Nie potrzebujesz instalować Node.js, npm, Webpacka ani Vite. Wystarczy dołączyć plik `dist/nomnipeer.js` w swoim pliku HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Moja Gra Multiplayer</title>
</head>
<body>
  <!-- Kompletna biblioteka ze wszystkimi zależnościami w jednym pliku -->
  <script src="./dist/nomnipeer.js"></script>

  <script>
    async function init() {
      // 1. Inicjalizacja klienta z wybranym dostawcą matchmakingu:
      // Opcje: 'nostr' | 'mqtt' | 'firebase' | 'matrix'
      const net = new nOmniPeer.Client({
        provider: 'nostr', // Zero-auth, klucze generowane w 1 ms
        gameId: 'moja-gra-arena'
      });

      // 2. Pobranie listy dostępnych pokoi:
      const lobbies = await net.listLobbies();
      console.log('Dostępne pokoje:', lobbies);

      // 3. Utworzenie pokoju lobby
      const room = await net.createLobby({ name: 'Arena Mistrzów', maxPlayers: 4 });

      room.on('playerJoined', (player) => console.log('Dołączył gracz:', player));
      room.on('chatMessage', (msg) => console.log(`${msg.senderNickname}: ${msg.text}`));
      
      // 4. Gdy gra startuje -> automatyczne połączenie WebRTC P2P
      room.on('gameStarted', () => {
        const engine = net.createRealtimeEngine({ tickRate: 30 });
        engine.on('entityUpdate', ({ entityId, state }) => {
          console.log('Pozycja gracza:', entityId, state);
        });
      });
    }

    init();
  </script>
</body>
</html>
```

---

## 🌐 Wymienne Technologie Lobby (Multi-Provider)

Biblioteka umożliwia wybór technologii matchmakingu, listy pokoi i czatu jedną linijką konfiguracji:

| Dostawca (`provider`) | Autoryzacja gracza | Wymagany własny serwer | Główne zalety |
| :--- | :--- | :--- | :--- |
| **`'nostr'`** | **Zero-Auth** (Klucz w 1 ms) | **0 serwerów** (otwarte przekaźniki Damus, Nos.lol) | Otwarta sieć, odporność na cenzurę, czyste JS Schnorr |
| **`'mqtt'`** | **Anonimowa** | **0 serwerów** (publiczne brokery HiveMQ, EMQX) | Błyskawiczny matchmaking oparty o wildcardy |
| **`'firebase'`** | **Anonimowe UID** | Google Realtime Database | Samoczyszczące się pokoje (`onDisconnect`) |
| **`'matrix'`** | Konto Matrix / Gość | matrix.org lub Conduit | Szyfrowanie, federacja i historia |

```javascript
// Wejście do gry przez otwarty protokół NOSTR (bez rejestracji i bez haseł):
const net = new nOmniPeer.Client({
  provider: 'nostr',
  gameId: 'babo-shooter'
});

// Zwraca listę otwartych pokoi z publicznych przekaźników:
const lobbies = await net.listLobbies();

// Tworzenie pokoju:
const lobby = await net.createLobby({ name: 'Babo Arena #1', maxPlayers: 6 });
lobby.on('playerJoined', (player) => console.log('Nowy gracz:', player));
lobby.on('chatMessage', (msg) => console.log(`${msg.senderNickname}: ${msg.text}`));
```

---

## 🕹️ Dedykowane Silniki pod Różne Typy Gier

nOmniPeer.js posiada 4 wbudowane silniki dopasowane do specyfiki różnych gatunków:

### 1. `RealtimeEngine` (Gry Akcji, FPS i Zręcznościówki 2D/3D)
Działa na szybkim kanale UDP (`reliable: false`) z wbudowanym buforem i interpolacją pozycji (`lerp`) eliminującą szarpanie ekranu.

**Wsparcie dla pakietów binarnych w grach FPS:**
Zamiast ciężkiego JSON-a (75+ bajtów), współrzędne gracza 3D `(x, y, z, rotY)` pakowane są do **zaledwie 18 bajtów**:
```javascript
const engine = net.createRealtimeEngine({ tickRate: 60, interpolationDelayMs: 40 });

// W pętli gry (60 FPS) wysyłamy 18-bajtowy pakiet binarny:
engine.sendVector3(myPlayerId, player.x, player.y, player.z, player.rotationY);

// Odbiór z automatyczną płynną interpolacją:
const smoothPos = engine.getInterpolatedPosition(enemyId);
```

---

### 2. `LockstepEngine` (Gry RTS i Bijatyki)
W strategiach czasu rzeczywistego (jak StarCraft) nie przesyła się pozycji setek jednostek. Wykorzystuje się **Deterministic Lockstep**, gdzie gracze przesyłają wyłącznie rozkazy gracza (kilkadziesiąt bajtów), a symulacja wykonuje się synchronicznie w określonych krokach czasowych (tickach):
```javascript
const rts = net.createLockstepEngine({
  tickDurationMs: 100, // 10 kroków symulacji na sekundę
  commandDelayTicks: 2  // Wykonanie rozkazu za 2 kroki w przód
});

// Gracz klika na mapie:
rts.queueCommand('MOVE_UNITS', { unitIds: [1, 2, 3], targetX: 120, targetY: 300 });

// Zsynchronizowane wykonanie kroku symulacji u wszystkich graczy bez desynchronizacji:
rts.on('tickExecute', ({ tick, commands }) => {
  commands.forEach(cmd => executeOrder(cmd));
  simulationStep();
});

rts.start();
```

---

### 3. `TurnBasedEngine` (Gry Turowe, Karciane i Planszowe)
Zarządza kolejką graczy, sprawdza uprawnienia do ruchu, pilnuje limitu czasu tury (timeout) oraz rejestruje pełną historię akcji do cofania i powtórek:
```javascript
const turnGame = net.createTurnBasedEngine({
  playersOrder: ['gracz1', 'gracz2'],
  turnTimeoutMs: 30000 // 30 sekund na ruch
});

turnGame.on('turnChange', ({ activePlayerId, turnNumber }) => {
  console.log(`Tura #${turnNumber}: ruch gracza ${activePlayerId}`);
});

// Gracz wykonuje ruch:
if (turnGame.isMyTurn) {
  turnGame.submitAction('MOVE_CHESS_PIECE', { from: 'e2', to: 'e4' });
  turnGame.passTurn();
}
```

---

### 4. `SharedStateEngine` (Kalambury, Tablice do Rysowania, Clickery)
Reaktywny magazyn klucz-wartość synchronizowany P2P pomiędzy wszystkimi graczami:
```javascript
const store = net.createSharedState({
  canvasStrokes: [],
  score: 0
});

// Subskrypcja zmian:
store.subscribe('canvasStrokes', (strokes) => redrawCanvas(strokes));

// Aktualizacja u dowolnego gracza natychmiast synchronizuje się u pozostałych:
store.push('canvasStrokes', { x1: 10, y1: 20, x2: 30, y2: 40, color: '#ff0000' });
```

---

## 🎮 Interaktywne Przykłady (Dema)

W katalogu `examples/` znajdują się gotowe przykłady działające od razu w przeglądarce:

1. **`examples/01-vanilla-flat-html/index.html`**:
   Kompletna gra arena 2D w czystym HTML+JS z logowaniem, poczekalnią, czatem i ruchem 60 FPS.

2. **`examples/02-realtime-fps-arena/index.html`**:
   Wizualizacja i metryki oszczędności pasma dla pakietów binarnych 18-bajtowych w FPS.

3. **`examples/03-rts-lockstep/index.html`**:
   Deterministyczna symulacja jednostek w RTS z kolejkowaniem rozkazów kliknięć.

4. **`examples/04-turn-based/index.html`**:
   Gra turowa z zegarem odliczającym czas i blokadą ruchów nie w swojej turze.

5. **`examples/05-complete-game-matrix-chat/index.html`**:
   Kompletna strzelanka 2D w stylu **Babo Violent** (kulki w labiryncie, sterowanie WASD, celowanie i strzelanie myszką, odbijanie od ścian, paski HP, respawn i fragi) w 60 FPS przez WebRTC z **wyborem dowolnego dostawcy lobby (NOSTR, MQTT, Firebase, Matrix, Direct P2P)** oraz zintegrowanym czatem na żywo!

---

## 🔑 Ułatwione Logowanie i Rejestracja w Matrix

Oficjalny serwer `matrix.org` wyłączył rejestrację anonimowych gości (`403 M_FORBIDDEN`) ze względów antyspamowych. nOmniPeer.js oferuje 4 sposoby na bezproblemowe dołączanie graczy:

1. **Auto-Login z zapamiętaniem sesji:**
   ```javascript
   if (net.autoLogin('moja_gra_sesja')) {
     console.log('Automatycznie zalogowano jako:', net.currentUserId);
   } else {
     await net.loginWithPassword('login', 'haslo');
     net.saveSession('moja_gra_sesja');
   }
   ```

2. **Rejestracja nowego konta prosto z gry:**
   ```javascript
   const auth = await net.registerUser('nowy_gracz', 'tajne_haslo_123', 'SuperNick');
   net.saveSession('moja_gra_sesja');
   ```

3. **Tryb Szybki Direct P2P (Bez rejestracji i bez infrastruktury):**
   Możliwość natychmiastowej gry P2P przez PeerJS z generowaniem bezpośredniego linku z zaproszeniem (np. `index.html?p2proom=XYZ`).

4. **Własny ultra-lekki serwer Matrix – Conduit (< 30 MB RAM):**
   W katalogu [`deploy/conduit/`](deploy/conduit/README.md) znajduje się gotowy `docker-compose.yml` uruchamiający Conduit z włączonymi kontami gości (`allow_guests = true`). Pozwala graczom na anonimowe logowanie w 100 ms (`net.loginAsGuest('Nick')`) bez captchy i podawania maila.

---

## 🛠️ Budowanie i Testy (Dla Deweloperów)

```bash
# Instalacja zależności
npm install

# Uruchomienie testów jednostkowych (Vitest - 23 testy zaliczone)
npm run test

# Zbudowanie plików standalone oraz modułów ESM/CJS (Tsup)
npm run build
```

Pliki wyjściowe w `dist/`:
- `dist/nomnipeer.js` – wersja standalone (IIFE z wbudowanym PeerJS do tagu `<script>`, global `nOmniPeer`)
- `dist/nomnipeer.min.js` – wersja zminifikowana (~143 KB)
- `dist/matrix-peer-game.js` – wersja dla kompatybilności wstecznej (global `MatrixPeerGame`)
- `dist/matrix-peer-game.min.js` – zminifikowana wersja kompatybilności wstecznej
- `dist/index.mjs` – moduł ES
- `dist/index.js` – CommonJS
- `dist/index.d.ts` – typowania TypeScript

---

## 📄 Licencja

MIT License.
