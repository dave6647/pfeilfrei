# Clear the Line: Arrow Puzzle – Regeln für dieses Repo

Pfeil-Puzzle für Android. Das Spiel liegt komplett in `web/game.html`, die Android-App ist nur eine WebView-Hülle (`app/`).
Name: „Clear the Line: Arrow Puzzle“ (App-Name „Clear the Line“, früher „Arrow Escape“), von davelabs (Geschäftsbezeichnung von David Müller).
Der Name steht in `app_name` (strings.xml), im Schriftzug und `<title>` von `web/game.html`, in `docs/`, in den Store-Texten
und in der Titelgrafik (`tools/store_assets.js`). Bei einer Namensänderung alle diese Stellen anpassen.
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

## Fußleiste im Spiel

- Nur Knöpfe (die Anzeige „N Pfeile übrig“ ist seit Build 16 weg): „Modus neu“ (nur Klassisch/Hardcore), Lupe (nur große Felder),
  Raster, Tipp, Neu. Text-Knöpfe teilen sich die Breite. Auf 360 px ist sie damit voll: `fitFooter()` macht erst „Neu“ zum Symbol
  (`compact`), dann „Modus neu“ (`mini`), zuletzt „Tipp“ zur Glühbirne (`tight`).
- „Modus neu“ setzt den ganzen Modus auf Level 1 zurück (Klassisch: auch Tipps auf 3 und „fehlerfrei“ auf 0; Hardcore: wie Game over,
  Rekord bleibt) – immer mit Nachfrage, „Weiterspielen“ ist dort der hervorgehobene Knopf.
- Änderungen dort in allen 7 Sprachen × 3 Modi auf 360 px testen (Blitz mit großem Level, weil der Tipp-Knopf „−3 s“ zeigt).

## Streak und Gewinn-Effekte

- Die Streak (`STREAK_GAP` 1200 ms, Schild ab `STREAK_SHOW` = 3, `streakStep()`, `showStreak()`) ist nur Anzeige und Ton:
  Sie darf nie Herzen, Zeit, Tipps oder den Spielstand beeinflussen und wird nicht gespeichert. Zusammenstoß oder neues Level beenden sie.
- Der Ton beim Rausfahren (`sndRelease`) steigt mit der Streak, nicht mit der Zahl der Pfeile.
- „Perfekte Runde!“ (`showPerfect()` / `hidePerfect()`) erscheint nur zusammen mit dem Konfetti eines fehlerfreien Levels
  (Klassisch/Hardcore) und blendet aus, sobald das Ergebnis-Fenster kommt.

## Play Store

- Zwei Schlüssel, beide nie ändern:
  - `app/pfeilfrei-test.keystore` signiert die APKs auf GitHub.
  - Der Upload-Schlüssel signiert das AAB für die Play Console (Play App Signing). Er liegt **nur** in den GitHub-Secrets
    `UPLOAD_KEYSTORE_BASE64` und `UPLOAD_KEYSTORE_PASSWORD`, nie im Repo (`app/upload.keystore` steht in `.gitignore`).
    Ohne die Secrets baut der Workflow nur die APKs.
- `targetSdk` muss jedes Jahr bis 31. August auf das neueste Android (Play-Pflicht; 2026: API 36).
- Zurück-Taste: `MainActivity.handleBack()` (ab Android 13 über `OnBackInvokedCallback`, darunter `onBackPressed`) fragt `window.pfBack()`.
  Neue Fenster im Spiel dort eintragen.
- Das Impressum ist allgemein für davelabs; neue Spiele dort unter „Meine Spiele“ / „My games“ eintragen.
- Datenschutzerklärung und Impressum liegen in `docs/` (GitHub Pages, `https://dave6647.github.io/pfeilfrei/`), die App verlinkt sie
  unter Einstellungen (`LEGAL_URL`). Sammelt die App je Daten (Werbung, Analyse, Internet, Konto), `docs/privacy.html` in allen
  Sprachen und das Datensicherheits-Formular in der Play Console anpassen.
- Store-Texte: `fastlane/metadata/android/<sprache>/` (Titel max. 30, Kurzbeschreibung max. 80, Beschreibung max. 4000 Zeichen).
  Bei neuen Funktionen mit anpassen, in allen Sprachen. Grafiken in `fastlane/metadata/android/<sprache>/images/`, erzeugt mit
  `node tools/store_assets.js`.

## Sonstiges

- Der Nutzer schreibt Deutsch; Commit-Nachrichten auf Deutsch.
- `applicationId` bleibt `de.pfeilfrei.game`, damit Updates über alte Installationen gehen.
- Speicher-Schlüssel (`pfeilfrei_progress`, SharedPreferences `pfeilfrei`) nicht umbenennen, sonst geht der Spielstand verloren.
