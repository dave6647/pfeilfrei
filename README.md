# Pfeilfrei

Ein Pfeil-Puzzle für Android im Metroplan-Look. Jeder Pfeil fährt nur in seine Richtung.
Ziel ist es, alle Pfeile in der richtigen Reihenfolge vom Feld zu schicken, ohne dass sie zusammenstoßen.
Drei Zusammenstöße kosten das Level.

## App aufs Handy holen

1. Auf GitHub rechts auf **Releases** tippen (oder `/releases/latest` an die Repo-Adresse hängen).
2. Die Datei `pfeilfrei-….apk` herunterladen und öffnen.
3. Beim ersten Mal fragt Android, ob der Browser Apps installieren darf. Das einmal erlauben.

Jede Änderung im Branch `main` baut automatisch eine neue APK (Tab **Actions**).
Neue Versionen lassen sich einfach über die alte installieren, der Spielstand bleibt erhalten.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `web/game.html` | Das komplette Spiel (HTML, CSS, JavaScript). Hier wird am Spiel gearbeitet. |
| `web/fonts/` | Schrift Overpass (SIL Open Font License), wird eingebettet. |
| `tools/build_web.py` | Erzeugt daraus `app/src/main/assets/index.html` für die App. |
| `tools/test_levels.js` | Prüft, dass alle Level lösbar sind. |
| `app/` | Android-Hülle: zeigt das Spiel in einer WebView, speichert Fortschritt, vibriert. |
| `.github/workflows/build.yml` | Baut die APK auf GitHub und veröffentlicht sie als Release. |

## Level

Die Level werden aus der Levelnummer erzeugt und sind immer gleich.
Beim Erzeugen wird jeder Pfeil nur dort platziert, wo sein Weg zum Rand gerade frei ist.
Dadurch ist jedes Level garantiert lösbar.

## Hinweis zum Signaturschlüssel

`app/pfeilfrei-test.keystore` ist ein Test-Schlüssel, damit sich Updates ohne Deinstallieren installieren lassen.
Für eine Veröffentlichung im Play Store wird ein eigener, geheimer Schlüssel gebraucht.
