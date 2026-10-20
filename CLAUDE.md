# Arrow Escape – Regeln für dieses Repo

Pfeil-Puzzle für Android. Das Spiel liegt komplett in `web/game.html`, die Android-App ist nur eine WebView-Hülle (`app/`).
GitHub Actions baut bei jedem Push auf `main` eine APK und veröffentlicht sie als Release.

## Übersetzungen (Pflicht)

- Jeder für Spieler sichtbare Text gehört in das Objekt `I18N` in `web/game.html`, nie fest ins HTML oder JS.
  Im HTML über `data-i18n="schlüssel"` (Text) bzw. `data-i18n-aria="schlüssel"` (Screenreader), im JS über `t('schlüssel')`.
- **Jede Änderung an Texten muss in allen Sprachen in `I18N` gemacht werden**: en, de, es, pt (Brasilien), fr, id, tr.
  Englisch ist die Standardsprache und die Vorlage.
- Neue Sprachen: Eintrag in `LANGS` und kompletter Block in `I18N`. Nicht-lateinische Schriften brauchen eine eingebettete Schrift in `tools/build_web.py`.
- Texte kurz halten: Auf 360 px Breite müssen Fußleiste, Knöpfe und Menü in jeder Sprache passen.
- Vor jedem Push ausführen:
  - `node tools/test_i18n.js` (bricht ab, wenn eine Übersetzung fehlt)
  - `node tools/test_levels.js 300`
  - `python3 tools/build_web.py` (erzeugt `app/src/main/assets/index.html`)

## Gratis- und Vollversion

- Eine App; die Vollversion ist ein In-App-Kauf über Google Play (Produkt-ID `vollversion`, Code in `MainActivity.java`).
- Gratis: Klassisch bis `FREE_LEVELS` (250), Hardcore und Blitz gesperrt. Ob etwas spielbar ist, immer über `canPlay(mode, n)` bzw. `Edition.full` prüfen.
- Bei neuen Modi oder Funktionen festlegen, ob sie gratis sind oder zur Vollversion gehören.
- Zwei APKs pro Build: Flavor `store` (für den Play Store) und `vollTest` (alles frei, nur zum Testen, nie hochladen).
- Im Browser ist alles frei; `?free` an die Adresse hängen, um die Gratis-Version zu testen.
- SharedPreferences-Schlüssel `full` und `price` nicht umbenennen.

## Level

- Level werden aus der Nummer erzeugt (`levelSpec`, `generateLevel` zwischen `// ENGINE START` und `// ENGINE END`).
- Ändert sich das Feld eines Levels, `LEVEL_GEN` erhöhen: Laufende Level aus der alten Version starten dann frisch
  (Level, Herzen und Blitz-Zeit bleiben, ein bezahlter Tipp wird zurückgegeben).
- Level 1–30 bleiben unverändert; `tools/test_levels.js` prüft das über eine Prüfsumme.
- Große Felder brauchen den Zoom (ab Zellgröße unter `ZOOM_FROM` px): Neue Funktionen am Spielfeld immer auch gezoomt testen.

## Sonstiges

- Der Nutzer schreibt Deutsch; Commit-Nachrichten auf Deutsch.
- `applicationId` bleibt `de.pfeilfrei.game` und der Signaturschlüssel bleibt gleich, damit Updates über alte Installationen gehen.
- Speicher-Schlüssel (`pfeilfrei_progress`, SharedPreferences `pfeilfrei`) nicht umbenennen, sonst geht der Spielstand verloren.
