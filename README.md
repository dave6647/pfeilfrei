# Arrow Escape

Ein Pfeil-Puzzle für Android im Metroplan-Look. Jeder Pfeil fährt nur in seine Richtung.
Ziel ist es, alle Pfeile in der richtigen Reihenfolge vom Feld zu schicken, ohne dass sie zusammenstoßen.
Drei Zusammenstöße kosten das Level.

## Spielmodi

- **Klassisch**: 3 Herzen pro Level.
- **Hardcore**: 5 Herzen für alle Level zusammen; nach dem fünften Zusammenstoß zurück auf Level 1.
- **Blitz**: zufällige Level gegen die Uhr. Start mit 30 Sekunden, jedes geschaffte Level bringt Zeit dazu
  (1 s pro Pfeil + 3 s), jeder Zusammenstoß kostet 5 s, ein Tipp 3 s. Ist die Zeit um, ist der Durchgang vorbei.
  Die Schwierigkeit steigt wie im klassischen Modus. Werte stehen oben in `web/game.html` (`BLITZ_START` usw.).

In allen Modi zählt eine **Streak** mit, wenn Pfeile schnell hintereinander rausfahren (höchstens 1,2 s Abstand):
ab 3 schwebt „STREAK ×N“ über der angetippten Stelle und der Ton steigt. Reine Motivation, ohne Einfluss aufs Spiel.
Fehlerfrei gelöste Level (Klassisch/Hardcore) feiern mit Konfetti und „Perfekte Runde!“.

## Gratis- und Vollversion

Eine App, die Vollversion wird in der App gekauft (Google Play, einmalig, vorläufig 1,99 €).

- **Gratis**: Klassisch bis Level 250. Hardcore und Blitz sind gesperrt, ganz unten im Menü steht „Vollversion kaufen“.
- **Vollversion**: alles frei, unbegrenzt viele Level. Der Spielstand bleibt beim Kauf erhalten.

Für den Kauf muss die App im Play Store sein und dort ein In-App-Produkt mit der ID `vollversion` angelegt werden
(Play Console → Monetarisieren → In-App-Produkte). Bis dahin meldet der Knopf „Kaufen geht gerade nicht“.

Sprachen: Englisch (Standard), Deutsch, Spanisch, Portugiesisch (Brasilien), Französisch, Indonesisch und Türkisch. Umschaltbar im Menü unter „Language“.

## App aufs Handy holen

1. Auf GitHub rechts auf **Releases** tippen (oder `/releases/latest` an die Repo-Adresse hängen).
2. Eine der beiden Dateien herunterladen und öffnen:
   - `arrow-escape-…-gratis.apk`: so wie später im Play Store (Gratis-Version mit Kaufen-Knopf).
   - `arrow-escape-…-voll-test.apk`: alles freigeschaltet, nur zum Testen. Nicht in den Play Store hochladen.

   Beide haben dieselbe App-ID und ersetzen sich gegenseitig, der Spielstand bleibt.
3. Beim ersten Mal fragt Android, ob der Browser Apps installieren darf. Das einmal erlauben.

Jede Änderung im Branch `main` baut automatisch eine neue APK (Tab **Actions**).
Neue Versionen lassen sich einfach über die alte installieren, der Spielstand bleibt erhalten.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `web/game.html` | Das komplette Spiel (HTML, CSS, JavaScript) inklusive aller Texte (`I18N`). |
| `web/fonts/` | Schrift Overpass (SIL Open Font License), wird eingebettet. |
| `tools/build_web.py` | Erzeugt daraus `app/src/main/assets/index.html` für die App. |
| `tools/test_levels.js` | Prüft, dass alle Level lösbar sind und Level 1–30 unverändert bleiben. |
| `tools/test_i18n.js` | Prüft, dass jeder Text in allen Sprachen übersetzt ist. |
| `app/` | Android-Hülle: zeigt das Spiel in einer WebView, speichert Fortschritt, vibriert. |
| `.github/workflows/build.yml` | Baut die APKs (und mit Secret das AAB für Google Play) und veröffentlicht sie als Release. |
| `docs/` | Webseite (GitHub Pages): Datenschutzerklärung in allen Sprachen, Impressum, Startseite. |
| `fastlane/metadata/android/` | Texte und Grafiken für den Play-Store-Eintrag, je Sprache. |
| `tools/store_assets.js` | Erzeugt Symbol, Titelgrafik und Screenshots für den Play Store. |

## Texte und Sprachen

Alle sichtbaren Texte stehen in `web/game.html` im Objekt `I18N`.
**Jeder neue oder geänderte Text muss in allen Sprachen eingetragen werden.**
`node tools/test_i18n.js` prüft das und läuft bei jedem Build mit: Fehlt eine Übersetzung, wird keine APK gebaut.

Neue Sprache: in `LANGS` eintragen (Code, Name in der eigenen Sprache, HTML-Sprachcode)
und in `I18N` einen Block nach dem Muster von `en` anlegen.
Für Schriften außerhalb des lateinischen Alphabets muss zusätzlich eine passende Schrift eingebettet werden (`tools/build_web.py`).

## Level

Die Level werden aus der Levelnummer erzeugt und sind immer gleich.

- **Level 1–30** (Einstieg): Das Feld wächst von 4×5 auf 11×15. Jeder Pfeil wird nur dort platziert,
  wo sein Weg zum Rand gerade frei ist.
- **Ab Level 31** wird es ohne Ende schwerer, aber immer langsamer (logarithmisch): Level 60 hat etwa 12×19 Felder,
  Level 250 etwa 16×26, Level 1000 etwa 20×32, ab etwa Level 2500 höchstens 24×38.
  Die Pfeile sind länger, kurviger, dicht gepackt und ineinander verschlungen; am Anfang sind nur wenige frei.
  Dafür bekommt jeder Pfeil beim Erzeugen einen Rang: Wer einem anderen im Weg liegt, muss vorher raus.
  Ein Pfeil darf überall hin, solange es dafür noch einen passenden Rang gibt.

So ist jedes Level garantiert lösbar, und man kann sich nie festfahren (es gibt immer einen freien Pfeil).

**Zoom**: Wird das Feld zu groß (Zellen kleiner als 30 px), erscheint in der Fußleiste eine Lupe.
Hineinzoomen geht mit zwei Fingern oder der Lupe, gezoomt verschiebt ein Finger das Feld.
Ein Tipp holt den Pfeil ins Bild. Jedes Level beginnt mit dem ganzen Feld.

## Signaturschlüssel

- `app/pfeilfrei-test.keystore` signiert die APKs auf GitHub, damit sich Updates ohne Deinstallieren installieren lassen.
- Der Upload-Schlüssel für Google Play liegt nicht im Repo, sondern nur in zwei GitHub-Secrets
  (Settings → Secrets and variables → Actions): `UPLOAD_KEYSTORE_BASE64` (die Schlüsseldatei als Base64-Text) und
  `UPLOAD_KEYSTORE_PASSWORD`. Sind beide angelegt, baut jeder Build zusätzlich `arrow-escape-…-play.aab` zum Hochladen
  in die Play Console. Google signiert die App danach mit dem eigenen App-Signaturschlüssel (Play App Signing).
  Eine Sicherungskopie von Schlüsseldatei und Passwort gehört in einen Passwort-Manager.

Die Play-Store-Version und die GitHub-APKs haben deshalb verschiedene Signaturen: Wer von der APK auf die Play-Version
wechselt, muss die App einmal deinstallieren (der Spielstand geht dabei verloren).
