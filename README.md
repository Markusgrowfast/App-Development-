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
- Sanfte Töne und Vibration (Vibration nur, wo der Browser sie unterstützt, z. B. Android/Chrome – nicht auf iOS)
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
index.html            Grundgerüst
styles.css            Layout und Farben
js/content.js         Übungen und Texte  ← hier neue Übungen eintragen
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

## Hinweis
Atemzeit ist kein Medizinprodukt und ersetzt keine ärztliche oder psychotherapeutische Behandlung.
