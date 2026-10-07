# LumGis – Leuchtenkarte

Zeigt ein Leuchten-Inventar aus Excel (Blatt «Lp») auf einer Karte – mit Filtern, Suche, Tabelle und Prüfbericht. Nur Ansicht: Die Excel-Datei wird nie verändert.

## Benutzen

`LumGis.html` mit Chrome öffnen (Doppelklick) und die Excel-Datei hineinziehen oder «Datei auswählen». Nichts zu installieren; die Datei wird nur im Browser gelesen und nirgends hochgeladen. Für die Hintergrundkarte braucht es Internet.

Erwartetes Excel-Layout: Blatt `Lp`, Kategorien in Zeile 53, Spaltenüberschriften in Zeile 55, Daten ab Zeile 56, Koordinaten in LV95 in «Koordinate X» und «Koordinate Y».

## Prüfsumme vergleichen

Der Prüfbericht zeigt eine Prüfsumme (z. B. `BDE1-51F2`). Dieselbe Datei muss in `LumGis.html` und im Python-Referenztool (`app.py`, Tab «Pruefbericht») dieselbe Prüfsumme ergeben. Bei Abweichung unter «Details» beide Listen vergleichen.

## Entwicklung

```bash
python web/build.py           # LumGis.html aus web/src bauen
python tests/test_app.py      # Tests Python-Referenz
python tests/test_parity.py   # Python und HTML lesen identisch (braucht Node.js)
```

Details zur Architektur: [CLAUDE.md](CLAUDE.md).
