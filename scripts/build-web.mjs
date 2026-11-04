// Kopiert die Web-App (liegt im Hauptordner, damit GitHub Pages sie direkt ausliefert)
// nach www/ – von dort übernimmt Capacitor sie in die Android- und iOS-App.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const FILES = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js', 'js', 'icons'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of FILES) cpSync(f, `www/${f}`, { recursive: true });
console.log('Web-App nach www/ kopiert:', FILES.join(', '));
