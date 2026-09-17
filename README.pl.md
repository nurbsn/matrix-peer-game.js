# 🎮 MatrixPeerGame

> **Serverless Multiplayer Game Networking Library**  
> Twórz gry wieloosobowe w przeglądarce **bez kosztów i bez utrzymywania własnych dedykowanych serwerów gier!**  
> Działa jako **płaskie JS (`<script src="...">`) bez Node.js** lub jako nowoczesna paczka TypeScript/ESM.

[English](README.md) | **Polski**

---

## 🚀 Jak to działa?

Tradycyjne gry multiplayer wymagają drogich serwerów backendowych (Node.js, C#, Go), bazy danych i stałej konserwacji. **MatrixPeerGame** całkowicie to eliminuje dzięki połączeniu dwóch bezpłatnych technologii:

1. **[Matrix Protocol](https://matrix.org)** (Zdecentralizowana warstwa lobby i sygnalizacji):
   - Wyszukiwanie gier (`LobbyDiscovery`)
   - Tworzenie i dołączanie do pokoi lobby
   - Gotowość graczy (Ready check), nicki, avatary
   - Czat w poczekalni
   - Wymiana identyfikatorów WebRTC (sygnalizacja P2P)
   - Działa z darmowymi kontami gości (`Guest Accounts`) na publicznych serwerach jak `matrix.org`

2. **[PeerJS](https://peerjs.com)** (Warstwa bezpośredniej komunikacji w czasie rzeczywistym WebRTC):
   - Bezpośrednie połączenia P2P przeglądarka-przeglądarka z opóźnieniami rzędu **10–30 ms**
   - **Kanał Unreliable (UDP):** 60 FPS dla pozycji graczy, fizyki i pocisków
   - **Kanał Reliable (TCP-like):** bezbłędne dostarczanie rozkazów, akcji i czatu
   - Ciągły pomiar opóźnień (Ping/RTT)

---

## 📦 Szybki Start: Użycie jako „Płaskie JS” (Zero Node.js!)

Nie potrzebujesz instalować Node.js, npm, Webpacka ani Vite. Wystarczy dołączyć plik `dist/matrix-peer-game.js` w swoim pliku HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Moja Gra Multiplayer</title>
</head>
<body>
  <!-- Dołączenie biblioteki ze wszystkimi zależnościami w jednym pliku -->
  <script src="./dist/matrix-peer-game.js"></script>

  <script>
    async function init() {
      // 1. Inicjalizacja klienta
      const net = new MatrixPeerGame.Client({
        homeserver: 'https://matrix.org',
        gameId: 'moja-gra-arena'
      });

      // 2. Logowanie gościa (bez hasła)
      await net.loginAsGuest('Player1');

      // 3. Utworzenie pokoju lobby
      const room = await net.createLobby({ name: 'Arena Mistrzów', maxPlayers: 4 });

      room.on('playerJoined', (player) => console.log('Dołączył gracz:', player));
      
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

## 🕹️ Dedykowane Silniki pod Różne Typy Gier

Biblioteka posiada 4 wbudowane silniki dopasowane do specyfiki różnych gatunków:

### 1. `RealtimeEngine` (Gry Akcji, FPS i Zręcznościówki 2D/3D)
Działa na szybkim kanale UDP (`reliable: false`) z wbudowanym buforem i interpolacją pozycji (`lerp`) eliminującą szarpanie ekranu.

**Wsparcie dla pakietów binarnych w grach FPS:**
Zamiast ciężkiego JSON-a (75 bajtów), współrzędne gracza 3D `(x, y, z, rotY)` pakowane są do **zaledwie 18 bajtów**:
```javascript
const engine = net.createRealtimeEngine({ tickRate: 60, interpolationDelayMs: 40 });

// W pętli gry (60 FPS) wysyłamy 18-bajtowy pakiet binarny:
engine.sendVector3(myPlayerId, player.x, player.y, player.z, player.rotationY);

// Odbiór z automatyczną płynną interpolacją:
const smoothPos = engine.getInterpolatedPosition(enemyId);
```

---

### 2. `LockstepEngine` (Gry RTS i Bijatyki)
W strategiach czasu rzeczywistego (jak StarCraft) nie przesyła się pozycji 500 czołgów. Wykorzystuje się **Deterministic Lockstep**, gdzie gracze przesyłają wyłącznie rozkazy gracza (kilkadziesiąt bajtów), a symulacja wykonuje się synchronicznie w określonych krokach czasowych (tickach):
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
   Kompletna gra arena 2D w czystym HTML+JS:
   - Logowanie do Matrixa jako gość
   - Tworzenie i dołączanie do pokoi lobby
   - Czat w poczekalni i wskaźnik gotowości
   - Płynne poruszanie się postacią w 60 FPS przez WebRTC z pomiarem pingu

2. **`examples/02-realtime-fps-arena/index.html`**:
   Wizualizacja i metryki oszczędności pasma dla pakietów binarnych 18-bajtowych w FPS.

3. **`examples/03-rts-lockstep/index.html`**:
   Deterministyczna symulacja jednostek w RTS z kolejkowaniem rozkazów kliknięć.

4. **`examples/04-turn-based/index.html`**:
   Gra turowa z zegarem odliczającym czas i blokadą ruchów nie w swojej turze.

---

## 🛠️ Budowanie i Testy (Dla Deweloperów)

```bash
# Instalacja zależności
npm install

# Uruchomienie testów jednostkowych (Vitest)
npm run test

# Zbudowanie plików standalone oraz modułów ESM/CJS (Tsup)
npm run build
```

Pliki wyjściowe w `dist/`:
- `dist/matrix-peer-game.js` – wersja standalone (IIFE z wbudowanym PeerJS do tagu `<script>`)
- `dist/matrix-peer-game.min.js` – wersja zminifikowana
- `dist/index.mjs` – moduł ES
- `dist/index.js` – CommonJS
- `dist/index.d.ts` – typowania TypeScript

---

## 📄 Licencja

MIT License.
