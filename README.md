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

Sprachen: Englisch (Standard), Deutsch, Spanisch, Portugiesisch (Brasilien), Französisch, Indonesisch und Türkisch. Umschaltbar im Menü unter „Language“.

## App aufs Handy holen

1. Auf GitHub rechts auf **Releases** tippen (oder `/releases/latest` an die Repo-Adresse hängen).
2. Die Datei `arrow-escape-….apk` herunterladen und öffnen.
3. Beim ersten Mal fragt Android, ob der Browser Apps installieren darf. Das einmal erlauben.

Jede Änderung im Branch `main` baut automatisch eine neue APK (Tab **Actions**).
Neue Versionen lassen sich einfach über die alte installieren, der Spielstand bleibt erhalten.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `web/game.html` | Das komplette Spiel (HTML, CSS, JavaScript) inklusive aller Texte (`I18N`). |
| `web/fonts/` | Schrift Overpass (SIL Open Font License), wird eingebettet. |
| `tools/build_web.py` | Erzeugt daraus `app/src/main/assets/index.html` für die App. |
| `tools/test_levels.js` | Prüft, dass alle Level lösbar sind. |
| `tools/test_i18n.js` | Prüft, dass jeder Text in allen Sprachen übersetzt ist. |
| `app/` | Android-Hülle: zeigt das Spiel in einer WebView, speichert Fortschritt, vibriert. |
| `.github/workflows/build.yml` | Baut die APK auf GitHub und veröffentlicht sie als Release. |

## Texte und Sprachen

Alle sichtbaren Texte stehen in `web/game.html` im Objekt `I18N`.
**Jeder neue oder geänderte Text muss in allen Sprachen eingetragen werden.**
`node tools/test_i18n.js` prüft das und läuft bei jedem Build mit: Fehlt eine Übersetzung, wird keine APK gebaut.

Neue Sprache: in `LANGS` eintragen (Code, Name in der eigenen Sprache, HTML-Sprachcode)
und in `I18N` einen Block nach dem Muster von `en` anlegen.
Für Schriften außerhalb des lateinischen Alphabets muss zusätzlich eine passende Schrift eingebettet werden (`tools/build_web.py`).

## Level

Die Level werden aus der Levelnummer erzeugt und sind immer gleich.
Beim Erzeugen wird jeder Pfeil nur dort platziert, wo sein Weg zum Rand gerade frei ist.
Dadurch ist jedes Level garantiert lösbar.

## Hinweis zum Signaturschlüssel

`app/pfeilfrei-test.keystore` ist ein Test-Schlüssel, damit sich Updates ohne Deinstallieren installieren lassen.
Für eine Veröffentlichung im Play Store wird ein eigener, geheimer Schlüssel gebraucht.
