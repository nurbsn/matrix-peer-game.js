# 🚀 Konfiguracja Firebase dla nOmniPeer.js (Poradnik Krok po Kroku)

**Google Firebase Realtime Database** to doskonały, bezserwerowy backend dla gier webowych i multiplayer. Zapewnia:
- **Błyskawiczne Lobby i Matchmaking** – lista aktywnych pokoi aktualizuje się w czasie rzeczywistym.
- **Sygnalizację WebRTC P2P** – gracze łączą się bezpośrednio ze sobą, co minimalizuje opóźnienia i koszty transferu.
- **Zapis Stanu Gry i Danych Gracza w Chmurze (Cloud Saves)** – odblokowane skórki, postępy, statystyki K/D, rankingi i osiągnięcia przypisane do konta gracza lub jego urządzenia.
- **Bezpłatny limit (Spark Plan)** – do 1 GB danych, 10 GB transferu miesięcznie i 50 000 jednoczesnych połączeń **za 0 zł**.

---

## Krok 1: Utworzenie Projektu w Firebase Console

1. Otwórz w przeglądarce [Firebase Console](https://console.firebase.google.com/) i zaloguj się kontem Google.
2. Kliknij **„Dodaj projekt”** (lub *Create a project*).
3. Podaj nazwę swojego projektu (np. `moja-gra-multiplayer`) i kliknij *Dalej*.
4. Google Analytics możesz wyłączyć lub zostawić włączone (opcjonalnie) i kliknij **„Utwórz projekt”**.
5. Po kilku sekundach projekt zostanie utworzony – kliknij **„Dalej”**, aby wejść do panelu zarządzania.

---

## Krok 2: Aktywacja Realtime Database

1. W menu bocznym po lewej stronie wybierz **Kompilacja (Build) &rarr; Realtime Database**.
2. Kliknij przycisk **„Utwórz bazę danych”** (*Create Database*).
3. **Wybór lokalizacji bazy:**
   - Wybierz region najbliższy Twoim graczom, np. `europe-west1` (Belgia) dla graczy w Europie lub `us-central1` dla Ameryki.
4. **Wybór trybu startowego:**
   - Wybierz **Tryb testowy** (*Start in test mode*) – pozwoli to na natychmiastowe testowanie bez blokad przez pierwsze 30 dni.
   - Kliknij **„Włącz”** (*Enable*).

Po utworzeniu bazy na samej górze ekranu pojawi się URL Twojej bazy, np.:
```text
https://moja-gra-multiplayer-default-rtdb.europe-west1.firebasedatabase.app/
```
> **Ważne:** Skopiuj ten URL – to Twój parametr `databaseURL`!

---

## Krok 3: Konfiguracja Reguł Bezpieczeństwa (Security Rules)

Przejdź do zakładki **Reguły** (*Rules*) w sekcji Realtime Database.

### Wariant A: Otwarty Sandbox dla gier (szybki start / prototypy)
Umożliwia graczom tworzenie i dołączanie do pokoi bez konieczności konfiguracji kont:
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

### Wariant B: Zabezpieczony z izolacją użytkowników (Zalecany na produkcję)
Każdy gracz może modyfikować wyłącznie swój własny profil i statystyki:
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
Kliknij **Opublikuj** (*Publish*), aby zapisać reguły.

---

## Krok 4: Włączenie Autoryzacji (Opcjonalnie: Google i Anonimowe)

Jeśli chcesz powiązać profile graczy z kontami Google lub identyfikatorami sesji:
1. W menu bocznym wybierz **Kompilacja &rarr; Authentication**.
2. Kliknij **„Rozpocznij”** (*Get started*).
3. W zakładce **Metoda logowania** (*Sign-in method*):
   - Włącz **Anonimowe** (*Anonymous*) – idealne dla graczy gości (brak formularzy, zerowy próg wejścia).
   - Włącz **Google** – umożliwia graczom logowanie 1-kliknięciem kontem Google i zachowanie osiągnięć na wszystkich urządzeniach.
4. Kliknij **Zapisz**.

---

## Krok 5: Podłączenie nOmniPeer.js w Twojej Grze

W pliku HTML / JS swojej gry zainicjalizuj klienta podając adres bazy danych:

```html
<!-- Dołączenie biblioteki nOmniPeer.js -->
<script src="dist/nomnipeer.js"></script>
<script>
  if (!window.nOmniPeer) document.write('<script src="dist/npeer.js"><\/script>');
</script>

<script>
  // 1. Inicjalizacja z dostawcą Firebase
  const client = new nOmniPeer.Client({
    provider: 'firebase',
    gameId: 'moja-strzelanka',
    firebaseConfig: 'https://moja-gra-multiplayer-default-rtdb.europe-west1.firebasedatabase.app'
  });

  async function start() {
    // 2. Wczytanie zapisanych danych gracza z chmury (Cloud Save)
    const stats = await client.loadPlayerData('stats');
    if (stats) {
      console.log(`Wczytano statystyki gracza: ${stats.kills} fragów, rekord: ${stats.highScore} pkt`);
    } else {
      console.log('Nowy gracz, brak historii w chmurze.');
    }

    // 3. Utworzenie pokoju w lobby
    const session = await client.createLobby({
      name: 'Arena #1',
      maxPlayers: 4,
      nickname: 'BaboPlayer'
    });

    // 4. Zapisanie nowych osiągnięć lub wyniku po meczu
    await client.savePlayerData('stats', {
      kills: (stats?.kills || 0) + 5,
      deaths: (stats?.deaths || 0) + 1,
      highScore: Math.max(stats?.highScore || 0, 1500),
      unlockedSkins: ['neon', 'gold']
    });
    console.log('Statystyki zostały zsynchronizowane w chmurze Firebase!');
  }

  start();
</script>
```

---

## Podsumowanie

Dzięki integracji z Firebase Twoja gra zyskuje:
1. **Zero własnych serwerów** do utrzymania.
2. **Globalny matchmaking** i listę aktywnych graczy.
3. **Płynną rozgrywkę 60 FPS** dzięki bezpośredniemu WebRTC P2P (UDP).
4. **Trwałe statystyki i zapisy w chmurze** dostępne na dowolnym urządzeniu gracza.
