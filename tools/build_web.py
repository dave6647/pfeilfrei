#!/usr/bin/env python3
"""Baut aus web/game.html zwei Dateien:

- app/src/main/assets/index.html  (vollständige Seite für die Android-App)
- build/pfeilfrei-web.html         (Fragment ohne <html>-Gerüst für die Web-Vorschau)

Die Sprache der Seite richtet sich nach der Wahl im Spiel (Standard: Englisch).

Die Schriften aus web/fonts werden direkt eingebettet, damit das Spiel
komplett offline läuft.
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = [
    ("Overpass", 400, "overpass-latin-400-normal.woff2"),
    ("Overpass", 700, "overpass-latin-700-normal.woff2"),
    ("Overpass", 800, "overpass-latin-800-normal.woff2"),
    ("Overpass", 900, "overpass-latin-900-normal.woff2"),
    ("Overpass Mono", 700, "overpass-mono-latin-700-normal.woff2"),
]


def font_css() -> str:
    parts = []
    for family, weight, file in FONTS:
        data = base64.b64encode((ROOT / "web" / "fonts" / file).read_bytes()).decode()
        parts.append(
            f'@font-face{{font-family:"{family}";font-style:normal;font-weight:{weight};'
            f'font-display:swap;src:url(data:font/woff2;base64,{data}) format("woff2")}}'
        )
    return "\n".join(parts)


def main() -> None:
    src = (ROOT / "web" / "game.html").read_text(encoding="utf-8")
    fragment = src.replace("/*@FONTS@*/", font_css())

    out_web = ROOT / "build" / "pfeilfrei-web.html"
    out_web.parent.mkdir(parents=True, exist_ok=True)
    out_web.write_text(fragment, encoding="utf-8")

    page = (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n"
        "<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover\">\n"
        "<style>:root{color-scheme:light}[hidden]{display:none!important}</style>\n"
        "</head>\n<body>\n" + fragment + "\n</body>\n</html>\n"
    )
    out_app = ROOT / "app" / "src" / "main" / "assets" / "index.html"
    out_app.parent.mkdir(parents=True, exist_ok=True)
    out_app.write_text(page, encoding="utf-8")
    print(f"OK: {out_app.relative_to(ROOT)} ({len(page) // 1024} KB), {out_web.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
