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
LATIN = ("U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
         "U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")
# latin-ext: u. a. türkische Zeichen (ğ, ş, İ)
LATIN_EXT = ("U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,"
             "U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF")
FONTS = [
    (family, weight, f"{stem}-{subset}-{weight}-normal.woff2", rng)
    for family, stem, weights in [("Overpass", "overpass", (400, 700, 800, 900)),
                                  ("Overpass Mono", "overpass-mono", (700,))]
    for weight in weights
    for subset, rng in (("latin", LATIN), ("latin-ext", LATIN_EXT))
]


def font_css() -> str:
    parts = []
    for family, weight, file, rng in FONTS:
        data = base64.b64encode((ROOT / "web" / "fonts" / file).read_bytes()).decode()
        parts.append(
            f'@font-face{{font-family:"{family}";font-style:normal;font-weight:{weight};'
            f'font-display:swap;src:url(data:font/woff2;base64,{data}) format("woff2");unicode-range:{rng}}}'
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
