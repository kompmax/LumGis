# LumGis – Leuchtenkarte

Zeigt ein Leuchten-Inventar aus Excel (Blatt «Lp») auf einer Karte – mit Filtern, Suche, Tabelle und Prüfbericht. Nur Ansicht: Die Excel-Datei wird nie verändert.

## Benutzen

`LumGis.html` mit Chrome öffnen (Doppelklick) und die Excel-Datei hineinziehen oder «Datei auswählen». Nichts zu installieren; die Datei wird nur im Browser gelesen und nirgends hochgeladen. Für die Hintergrundkarte braucht es Internet.

Erwartetes Excel-Layout: Blatt `Lp`, Kategorien in Zeile 53, Spaltenüberschriften in Zeile 55, Daten ab Zeile 56, Koordinaten in LV95 in «Koordinate X» und «Koordinate Y».

Kurzanleitung: [docs/Anleitung.pdf](docs/Anleitung.pdf).

## Archiv

`archiv/streamlit/` enthält die frühere Python/Streamlit-Version (bis Oktober 2026). Sie bleibt als Referenz: `tests/test_parity.py` prüft, dass beide Versionen jede Datei identisch lesen (gleiche Prüfsumme).

## Entwicklung

```bash
python web/build.py           # LumGis.html aus web/src bauen
python tests/test_parity.py   # Python und HTML lesen identisch (braucht Node.js)
python docs/anleitung_pdf.py docs/Anleitung.md --logo web/assets/luminum_logo.png --fusszeile "LumGis 1.2.1 – Kurzanleitung · Luminum GmbH"
```

Details zur Architektur: [CLAUDE.md](CLAUDE.md).
