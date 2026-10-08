"""
Baut LumGis.html: eine einzige Datei mit allen Bibliotheken, Logo und Code eingebettet.

    python web/build.py

Quellen: web/src/ (eigener Code), web/vendor/ (Bibliotheken, siehe VENDOR.md),
web/assets/luminum_logo.png. Ergebnis: LumGis.html im Repo-Hauptordner.
"""

import base64
import os
import re

VERSION = "1.2.0"

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "LumGis.html")


def read(*parts):
    with open(os.path.join(HERE, *parts), encoding="utf-8") as f:
        return f.read()


def js(*parts):
    # "</script" im eingebetteten Code wuerde das <script>-Element vorzeitig beenden
    return read(*parts).replace("</script", "<\\/script")


def main():
    with open(os.path.join(HERE, "assets", "luminum_logo.png"), "rb") as f:
        logo = "data:image/png;base64," + base64.b64encode(f.read()).decode("ascii")

    parts = {
        "VERSION": VERSION,
        "LOGO": logo,
        "CSS_LEAFLET": read("vendor", "leaflet.css"),
        "CSS_APP": read("src", "style.css"),
        "JS_XLSX": js("vendor", "xlsx.mini.min.js"),
        "JS_PROJ4": js("vendor", "proj4.js"),
        "JS_LEAFLET": js("vendor", "leaflet.js"),
        # pdf.js: Worker-Skript als normales Skript -> pdf.js laeuft ohne Web Worker (geht auch unter file://)
        "JS_PDF": js("vendor", "pdf.min.js"),
        "JS_PDF_WORKER": js("vendor", "pdf.worker.min.js"),
        "JS_CORE": js("src", "core.js"),
        "JS_PLAN": js("src", "plan.js"),
        "JS_APP": js("src", "app.js"),
    }
    # Ein Durchgang ueber die Vorlage: eingefuegter Code wird nicht erneut durchsucht
    html = re.sub(r"\{\{([A-Z0-9_]+)\}\}", lambda m: parts[m.group(1)], read("src", "index.html"))
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)
    print(f"LumGis.html v{VERSION} geschrieben ({os.path.getsize(OUT) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
