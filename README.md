# Asteroids Arcade (Static Web Project)

Ein simples, sofort spielbares **Asteroids-Arcade-Spiel** als reine statische Website.

## Features

- 2D-Canvas-Gameplay im Retro-Stil
- Steuerbares Raumschiff mit Trägheit
- Wrap-around am Bildschirmrand (Schiff, Schüsse, Asteroiden)
- Asteroiden in mehreren Größen, inkl. Split-Mechanik
- Kollisionen Schiff/Asteroiden mit 3 Leben
- Score-System
- Game-Over-Overlay mit Neustart per Leertaste
- Kein Backend, keine Datenbank, kein Build-Prozess

## Lokal starten

Da das Projekt nur aus statischen Dateien besteht, gibt es zwei einfache Wege:

1. **Direkt öffnen:**
   - `index.html` im Browser öffnen.
2. **Mit lokalem Static-Server (empfohlen):**
   - Im Projektordner:
     ```bash
     python3 -m http.server 8080
     ```
   - Dann im Browser aufrufen: `http://localhost:8080`

## Deployment als GitHub Pages Vorschau

1. Repository zu GitHub pushen.
2. Auf GitHub in **Settings → Pages** gehen.
3. Unter **Build and deployment** bei **Source** die Option **Deploy from a branch** wählen.
4. Branch (z. B. `main`) und Ordner `/ (root)` auswählen.
5. Speichern – nach kurzer Zeit ist die Seite unter der GitHub-Pages-URL erreichbar.

## Steuerung

- **Pfeil links/rechts:** Rotation
- **Pfeil hoch:** Schub
- **Leertaste:** Schießen
- **Leertaste bei Game Over:** Neustart

## Projektstruktur

```text
.
├── index.html   # Grundstruktur, Canvas, HUD
├── style.css    # Retro-Arcade-Styling
├── script.js    # Spiellogik (Loop, Input, Rendering, Kollisionen)
└── README.md    # Doku & Hosting-Hinweise
```

## Technik

- Reines **HTML + CSS + Vanilla JavaScript**
- Hauptschleife mit `requestAnimationFrame`
- Modulare Trennung in:
  - Initialisierung
  - Input Handling
  - Entity-Management
  - Kollisionslogik
  - Rendering
  - Game Loop
