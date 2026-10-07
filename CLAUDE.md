# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**LumGis** — read-only viewer for lighting fixture (Leuchten) inventories stored in Excel files (.xlsx/.xlsm). UI entirely in German. Two implementations that must read files **identically**:

| | `LumGis.html` | `archiv/streamlit/app.py` (reference) |
|---|---|---|
| Tech | single self-contained HTML, no install | Streamlit (Python) |
| Source | `web/src/` → built by `web/build.py` | `archiv/streamlit/app.py` |
| Status | in daily use (v1.0.1) | retired from daily use (Oct 2026); kept only as parity reference |

**Never read or write anything on network drives (R:\, A:\).** Real test files are provided locally by the user (`testdaten/`, git-ignored). The user compares checksums on real files himself.

## Commands

```bash
python web/build.py              # build LumGis.html (commit the result)
python archiv/streamlit/test_app.py   # regression tests of the archived Streamlit app (AppTest)
python tests/test_parity.py      # Python vs. JS: identical report + checksum (needs Node.js)
python tests/test_parity.py a.xlsx b.xlsx   # parity on additional local files
node web/tools/report_cli.js file.xlsx      # JS report for one file
python docs/anleitung_pdf.py docs/Anleitung.md --logo web/assets/luminum_logo.png --fusszeile "LumGis <version> – Kurzanleitung · Luminum GmbH"
```

User manual: `docs/Anleitung.md` → `docs/Anleitung.pdf` (Luminum template). Update both when the UI changes; UI labels and messages are quoted verbatim.

Tests generate Excel files in temp folders (Excel files are git-ignored). After **any** change to reading/parsing logic, change **both** `archiv/streamlit/app.py` and `web/src/core.js` and run both test scripts.

## Excel layout (both implementations)

Sheet `Lp`; categories in row 53 (merged cells, value taken from row 53 at the merge's left column); headers in row 55 (newlines collapsed to a space); data from row 56. Columns located by **header name**, never by letter. Hidden rows/columns are ignored. Rows are dropped only if all three ID columns (`Lichtpunkt-Nr.`, `… neu`, `… Projekt`) are empty; loading aborts with a clear message if none of the ID columns exists. Duplicate header names: value of the last column wins.

Coordinates: `Koordinate X` / `Koordinate Y` (LV95). E/N assigned per row by value range (E 2.4–2.9 M, N 1.0–1.4 M) so swapped X/Y works; thousands apostrophes and decimal commas accepted. Legacy fallback `GPS Koordinaten (Breite, Länge)` (one cell, auto-detects WGS84 vs LV95). LV95 → WGS84 only for the map: pyproj in Python, proj4js with EPSG:2056 (same towgs84) in JS — agree to < 1 cm.

Cell values become text exactly like `python-calamine` + `str()`: integral floats without `.0`, other floats as Python `repr`, dates `YYYY-MM-DD`, datetimes `YYYY-MM-DD HH:MM:SS[.ffffff]`, values < 1 with date format as time, `[h]` formats as `timedelta` text, booleans `True`/`False`, error cells empty. `core.js` reimplements this (`fmtNum`, `pyFloatRepr`, `excelDateToText`).

## Prüfbericht / checksum (must match in both)

Text = `LumGis-Pruefsumme v1` line, tab-joined data column names, then per row (Excel order): Excel row, all values, coord source (`LV95 E N` / `WGS84 lat lon` / empty), tab-separated, `\n`-terminated. Checksum = first 8 hex of SHA-256 (`XXXX-XXXX`). Plus counts: rows, with/without/unreadable coordinates, skipped hidden rows (with data), ignored hidden columns (with header), rows without ID, duplicate `Lichtpunkt-Nr.`. Python: `build_report()`; JS: `buildReport()`.

## LumGis.html (web/)

- `src/core.js` — parsing, coordinates, report; UMD so it runs in the browser and in Node (tests).
- `src/app.js` — UI: open via File System Access API (handle kept for «Neu laden» and «Zuletzt geöffnet» in IndexedDB) or file input/drag & drop; Leaflet map (canvas circle markers, lazy popups with Excel row, pulse on search hit), basemaps swisstopo swissTLM3D-Karte («Strassenkarte») / Landeskarte / SWISSIMAGE (WMTS 3857, no key). **No OpenStreetMap tiles**: OSM blocks requests without Referer, and file:// pages send none (403), tile-error banner; colour legend with colour-blind palette, colours persisted in localStorage; category filters (2–150 distinct values, not IDs/coords) with chips; search (street + 3 IDs, substring); table (max 3000 rows); Prüfbericht with copy-to-clipboard details.
- `src/index.html`, `src/style.css` — template (`{{PLACEHOLDER}}`) and styles (Luminum orange `#F37021`, Segoe UI; header stays light for the logo).
- `vendor/` — Leaflet 1.9.4, proj4js 2.15.0, SheetJS **0.20.3 mini** from cdn.sheetjs.com (npm 0.18.5 has CVEs). See `vendor/VENDOR.md`.
- No export, no editing (deliberate). All libraries inlined: works offline except map tiles.

## archiv/streamlit/app.py (reference)

Two-pass reading: `_read_structure` parses sheet XML from the ZIP (merges, headers, hidden rows/cols); `_read_data` uses python-calamine with `to_python(skip_empty_area=False)` — without it calamine trims leading empty rows/columns and all indices shift silently. Map via `build_map_html` (`@st.cache_data`, marker data passed as `markers_json` so it is part of the cache key). Tabs: Karte, Tabelle, Prüfbericht.
