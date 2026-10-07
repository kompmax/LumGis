# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
pip install streamlit pyproj openpyxl pandas python-calamine
streamlit run app.py --server.headless false --browser.gatherUsageStats false
```

Alternatively, double-click `START.bat` on Windows (auto-installs dependencies).

There are no tests, linting, or build steps — this is a single-file Streamlit application.

## What This App Does

**Leuchten GIS Dashboard** — a Streamlit tool for viewing and editing lighting fixture (Leuchten) inventory data stored in Excel files (.xlsx/.xlsm). The UI is entirely in German.

## Architecture (app.py)

The entire application lives in `app.py` (~960 lines). Key sections in order:

1. **Constants (lines ~20-44)**: Excel layout constants — the app expects a specific sheet structure with categories in row 53, headers in row 55, data starting at row 56 in the sheet named "Lp".

2. **Coordinate conversion (lines ~50-85)**: Converts Swiss LV95 (EPSG:2056) coordinates to WGS84 using pyproj. Batch-converts using vectorised operations.

3. **Two-pass Excel reading (lines ~91-241)**:
   - **Pass 1 (`_read_structure`)**: Uses openpyxl in normal mode to read merged cells (categories), headers, hidden columns/rows — metadata that calamine cannot access.
   - **Pass 2 (`_read_data`)**: Uses python-calamine (Rust-based) for fast data extraction (10-30x faster than openpyxl for bulk cell reads).

4. **Excel writing (`save_excel_data`, lines ~247-271)**: Writes changed cells back to Excel via openpyxl, preserving VBA macros in .xlsm files.

5. **File browser (`render_file_selector`, lines ~277-375)**: OS-level directory browser with quick-access to Windows network drives (R:\, A:\).

6. **Leaflet map (lines ~389-601)**: Generates a self-contained HTML page with Leaflet.js markers, popups, color legend with live color pickers. Cached via `@st.cache_data`.

7. **Streamlit UI (lines ~624-957)**: Sidebar with filters/search, four tabs: Karte (map), Tabelle (data table), Bearbeiten (edit single fixture), Diagnose (debug info).

## Key Design Decisions

- **Two-pass read strategy**: openpyxl is needed for structure metadata (merged cells, hidden columns); calamine handles bulk data for performance.
- **Session state**: Loaded data (`df`, `cat_map`, `col_info`, etc.) is stored in `st.session_state` to avoid re-reading Excel on every Streamlit rerun.
- **Map caching**: `build_map_html` is cached with `@st.cache_data`; cache is cleared on data edits.
- **Internal columns**: `_lat`, `_lon`, `_excel_row`, `_hidden_row` are prefixed with `_` and excluded from display/export.
- **ID columns**: Three ID columns exist (`Lichtpunkt-Nr.`, `Lichtpunkt-Nr. neu`, `Lichtpunkt-Nr. Projekt`); rows are dropped only if all three are empty.
