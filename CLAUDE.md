# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
pip install streamlit pyproj openpyxl pandas python-calamine
streamlit run app.py --server.headless false --browser.gatherUsageStats false
```

Alternatively, double-click `START.bat` on Windows (auto-installs dependencies).

## Tests

```bash
python tests/test_app.py
```

No pytest needed. The script generates Excel test files in a temp folder (Excel files are git-ignored) and drives the app via Streamlit's `AppTest`. Covers layouts (A1 empty / content only from A15 / column A completely empty), hidden rows/columns, number formatting, LV95 parsing variants, search with special characters, missing ID columns.

## What This App Does

**Leuchten GIS Dashboard (LumGis)** — a read-only Streamlit viewer for lighting fixture (Leuchten) inventories stored in Excel files (.xlsx/.xlsm). UI is entirely in German. Editing was removed on purpose (v4.2): changes are made in Excel, then "Daten neu laden".

## Roadmap

The Streamlit app is being kept as the **reference implementation**. Planned successor: a single self-contained HTML file (`LumGis.html`, SheetJS + Leaflet + proj4js inlined, no installation). Before switching, a parity test must show both parsers produce identical results on real Lp files. Do not read or write anything on network drives (R:\, A:\) — real test files must be provided locally by the user.

## Architecture (app.py, single file)

1. **Constants**: sheet `Lp`, categories in row 53 (merged cells), headers in row 55, data from row 56. Columns are located by **header name**, never by letter. Coordinate columns: `Koordinate X` / `Koordinate Y` (LV95); legacy `GPS Koordinaten (Breite, Länge)` as fallback.

2. **Coordinates**: LV95 → WGS84 via pyproj (only needed for Leaflet). E/N are assigned per row by value range (E 2.4–2.9 M, N 1.0–1.4 M), so swapped X/Y works. Accepts thousands apostrophes and decimal commas. Legacy column auto-detects WGS84 vs. LV95.

3. **Two-pass Excel reading**:
   - **Pass 1 (`_read_structure`)**: parses the sheet XML directly from the ZIP (no openpyxl) for merged cells, headers, hidden columns/rows.
   - **Pass 2 (`_read_data`)**: python-calamine for bulk data. Must use `to_python(skip_empty_area=False)` — otherwise calamine trims leading empty rows/columns and all indices shift silently. All values are converted to text here (integral floats → `"30"`, not `"30.0"`).

4. **File browser (`render_file_selector`)**: OS-level directory browser with quick-access drive buttons.

5. **Leaflet map (`prepare_map_data` / `build_map_html`)**: self-contained HTML with markers, lazy popups (incl. Excel row), live color pickers in the legend. `build_map_html` is `@st.cache_data`-cached; all marker data goes in as `markers_json` so it is part of the cache key.

6. **Streamlit UI**: sidebar with color coding, category filters, search (street + all three ID columns, plain substring, `regex=False`), export as browser download (deferred callable, never written next to the source file). Tabs: Karte, Tabelle (with Excel row), Diagnose (found columns, unparseable coordinate rows).

## Key Design Decisions

- **Read-only**: no write access to the source Excel at all.
- **Session state**: loaded data (`df`, `cat_map`, `col_info`, …) lives in `st.session_state`; loading aborts with a clear message if none of the ID columns exists.
- **Internal columns**: `_lat`, `_lon`, `_excel_row` are prefixed with `_` and excluded from display/export.
- **ID columns**: `Lichtpunkt-Nr.`, `Lichtpunkt-Nr. neu`, `Lichtpunkt-Nr. Projekt`; a row is dropped only if all three are empty. Marker titles use the first non-empty one.
