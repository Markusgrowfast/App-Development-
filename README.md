# Atemzeit – Breathwork für Einsteiger

Eine einfache Web-App (PWA) mit geführten Atemübungen. Gedacht für Menschen ohne Vorerfahrung.

**Modul 1: Calm Down – sofort ruhiger** (1–2 Minuten)

| Übung | Ablauf | Tempo |
|---|---|---|
| Der Seufzer (Physiological Sigh) | ein – kurz nachatmen – lang aus | 5 Atemzüge |
| Länger aus als ein | 4 ein · 6 aus | Leicht 3/5 · Normal 4/6 |
| Box Breathing | ein · halten · aus · halten | Leicht je 3 · Normal je 4 Sek |

Geplante Module: Wind Down (Einschlafen), Re-Energize, Daily Balance mit 7-Tage-Programm.

## Funktionen
- Atemkreis, der mit dem Atem wächst und schrumpft, Countdown pro Phase
- Klangebene: binaurale Beats (links 430 Hz, rechts 436 Hz → 6 Hz Differenz, plus weicher Ton bei 215 Hz), live erzeugt per Web Audio, atmet leicht mit; Einstellungen in `js/content.js` → `ambient`
- Chill-out-Musik, live erzeugt (`js/music.js`): Akkord-Flächen in A = 430 Hz, Meeresrauschen, das mit dem Atem rollt, Klangtropfen, Hall; Einstellungen in `js/content.js` → `music`
- Signaltöne harmonisch zum Grundton, und Vibration (Vibration nur, wo der Browser sie unterstützt, z. B. Android/Chrome – nicht auf iOS)
- Tempo „Leicht“ / „Normal“, Pause, automatische Pause beim App-Wechsel, Bildschirm bleibt an (falls unterstützt)
- Stimmungs-Check nach jeder Übung, Serie („Tage in Folge“)
- Sicherheitshinweise beim ersten Start
- Funktioniert offline und lässt sich auf dem Homescreen installieren
- Keine Accounts, kein Tracking: alles wird nur lokal im Browser gespeichert

## Lokal starten
```bash
python3 -m http.server 8000
# dann http://localhost:8000 im Browser öffnen
```
Offline-Modus und Installation brauchen `https://` oder `localhost`. Zum Veröffentlichen eignet sich z. B. GitHub Pages (Ordner: Repository-Root).

## Aufbau
```
android/, ios/          Native Projekte (Capacitor)
assets/               Vorlagen für App-Icons und Startbildschirm
scripts/build-web.mjs Kopiert die Web-App nach www/ für die nativen Apps
index.html            Grundgerüst
styles.css            Layout und Farben
js/content.js         Übungen und Texte  ← hier neue Übungen eintragen
js/music.js           Live erzeugte Chill-out-Musik
js/engine.js          Atem-Taktgeber (Phasen, Timing)
js/ui.js              Oberfläche, Navigation, Speicher
sw.js                 Offline-Cache (bei Änderungen VERSION erhöhen)
manifest.webmanifest  PWA-Einstellungen
icons/                App-Icons
```

Neue Übung = neuer Eintrag in `js/content.js`, z. B.:
```js
{ id: 'mein-atem', emoji: '🌊', title: '…', subtitle: '…', why: '…', steps: ['…'],
  rounds: 10, phases: [ { type: 'in', secs: 4, label: 'Einatmen' }, { type: 'out', secs: 6, label: 'Ausatmen' } ] }
```

## Android & iOS (Capacitor)
Die Web-App wird mit [Capacitor](https://capacitorjs.com) als native App verpackt – derselbe Code für Web, Android und iOS.

**Android (Testversion für Familie/Testgruppe)**
- Bei jedem Push baut GitHub Actions automatisch die APK (`.github/workflows/android.yml`).
- Download: Releases → „android-test“ → `Atemzeit.apk`
  (https://github.com/Markusgrowfast/App-Development-/releases/tag/android-test)
- Installation: APK auf dem Handy öffnen und „Installation aus dieser Quelle erlauben“ bestätigen.
- Signiert mit einem **Test-Schlüssel** (`android/app/test-signing.keystore`, Passwort `atemzeit-test`). Der ist bewusst öffentlich und nur für Tests gedacht. Für Google Play einen eigenen, geheimen Schlüssel erzeugen und über die Umgebungsvariablen `ATEMZEIT_KEYSTORE`, `ATEMZEIT_KEYSTORE_PASSWORD`, `ATEMZEIT_KEY_ALIAS`, `ATEMZEIT_KEY_PASSWORD` setzen.

**iOS**
- `.github/workflows/ios.yml` prüft nur, ob die App für den Simulator baut.
- Zum Installieren auf iPhones (TestFlight/App Store) braucht es ein Apple-Developer-Konto und Signatur-Zertifikate. Bis dahin: Web-App über Safari → „Zum Home-Bildschirm“.

**Lokal arbeiten**
```bash
npm install
npm run sync          # Web-App nach www/ kopieren und in android/ + ios/ übernehmen
npx cap open android  # Android Studio (benötigt Android SDK)
npx cap open ios      # Xcode (nur auf dem Mac)
```
App-Icons/Startbildschirm: Vorlagen in `assets/`, neu erzeugen mit `npx @capacitor/assets generate`.

## Hinweis
Atemzeit ist kein Medizinprodukt und ersetzt keine ärztliche oder psychotherapeutische Behandlung.
