/*
 * LumGis Kern: Excel lesen, Koordinaten, Pruefbericht.
 *
 * Bildet die Leselogik von archiv/streamlit/app.py 1:1 nach (Referenzimplementierung).
 * Fuer dieselbe Datei muessen beide dieselbe Pruefsumme liefern — bei
 * Aenderungen hier immer auch archiv/streamlit/app.py anpassen und tests/test_parity.py laufen lassen.
 *
 * Laeuft im Browser (window.LumGisCore) und in Node (require) fuer die Tests.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LumGisCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SHEET_NAME = "Lp";
  const CATEGORY_ROW = 53;
  const HEADER_ROW = 55;
  const DATA_START_ROW = 56;
  const DATA_START_COL = 2;

  const ID_COL = "Lichtpunkt-Nr.";
  const ID_COL_NEU = "Lichtpunkt-Nr. neu";
  const ID_COL_PROJEKT = "Lichtpunkt-Nr. Projekt";
  const ID_COLS = [ID_COL, ID_COL_NEU, ID_COL_PROJEKT];
  const COORD_X_COL = "Koordinate X";
  const COORD_Y_COL = "Koordinate Y";
  const COORD_COL = "GPS Koordinaten (Breite, Länge)";
  const COORD_COLS = [COORD_X_COL, COORD_Y_COL, COORD_COL];
  const STREET_COL = "Strasse";

  const LV95_E_RANGE = [2400000, 2900000];
  const LV95_N_RANGE = [1000000, 1400000];
  const EMPTY_VALS = new Set(["", "None", "nan"]);
  const REPORT_VERSION = "LumGis-Pruefsumme v1";

  // EPSG:2056 (CH1903+/LV95) — gleiche Parameter wie pyproj/EPSG-Datenbank
  const EPSG_2056 =
    "+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 " +
    "+x_0=2600000 +y_0=1200000 +ellps=bessel " +
    "+towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs";

  class LumGisError extends Error {}

  // ---------------------------------------------------------------
  // Zahlen und Zellwerte als Text — exakt wie Python (str/repr)
  // ---------------------------------------------------------------

  /** Python repr(float) fuer nicht-ganzzahlige Werte. */
  function pyFloatRepr(x) {
    if (Number.isNaN(x)) return "nan";
    if (!Number.isFinite(x)) return x > 0 ? "inf" : "-inf";
    const neg = x < 0 || Object.is(x, -0);
    // toExponential() ohne Argument liefert die kuerzeste eindeutige Ziffernfolge
    const [mant, expStr] = Math.abs(x).toExponential().split("e");
    const digits = mant.replace(".", "");
    const exp = parseInt(expStr, 10);
    let out;
    if (exp >= -4 && exp < 16) {
      if (exp >= 0) {
        const intLen = exp + 1;
        const intPart = digits.length > intLen ? digits.slice(0, intLen) : digits.padEnd(intLen, "0");
        const frac = digits.length > intLen ? digits.slice(intLen) : "0";
        out = intPart + "." + frac;
      } else {
        out = "0." + "0".repeat(-exp - 1) + digits;
      }
    } else {
      const m = digits.length > 1 ? digits[0] + "." + digits.slice(1) : digits;
      const e = Math.abs(exp) < 10 ? "0" + Math.abs(exp) : String(Math.abs(exp));
      out = m + "e" + (exp < 0 ? "-" : "+") + e;
    }
    return (neg ? "-" : "") + out;
  }

  /** Wie _fmt_num in app.py: Ganzzahlen ohne '.0', sonst repr. */
  function fmtNum(x) {
    if (Number.isInteger(x)) return Math.abs(x) < 2 ** 53 ? String(x) : BigInt(x).toString();
    return pyFloatRepr(x);
  }

  const pad = (n, w = 2) => String(n).padStart(w, "0");
  const MS_PER_DAY = 86400000;

  function fmtTimeOfDay(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const frac = ms % 1000;
    return { h, m, s, us: frac ? "." + pad(frac * 1000, 6) : "" };
  }

  /** Excel-Seriennummer -> Text, wie python-calamine + str() (date/datetime/time/timedelta). */
  function excelDateToText(v, fmt, date1904) {
    const ms = Math.round(v * MS_PER_DAY);
    if (/\[(h+|m+|s+)\]/i.test(fmt)) {
      // Dauer -> str(timedelta): "[D day(s), ]H:MM:SS[.ffffff]"
      const days = Math.floor(ms / MS_PER_DAY);
      const t = fmtTimeOfDay(ms - days * MS_PER_DAY);
      const dayPart = days ? `${days} day${Math.abs(days) === 1 ? "" : "s"}, ` : "";
      return `${dayPart}${t.h}:${pad(t.m)}:${pad(t.s)}${t.us}`;
    }
    if (v < 1 && !date1904) {
      const t = fmtTimeOfDay(ms);
      return `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}${t.us}`;
    }
    const days = Math.floor(ms / MS_PER_DAY);
    let base;
    if (date1904) base = Date.UTC(1904, 0, 1);
    else base = days < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30);
    const d = new Date(base + days * MS_PER_DAY);
    const date = `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    if (Number.isInteger(v)) return date;
    const t = fmtTimeOfDay(ms - days * MS_PER_DAY);
    return `${date} ${pad(t.h)}:${pad(t.m)}:${pad(t.s)}${t.us}`;
  }

  /** Datenzelle -> Text oder null (wie _read_data in app.py). */
  function cellToText(XLSX, cell, date1904) {
    if (!cell) return null;
    switch (cell.t) {
      case "n":
        if (cell.z && XLSX.SSF.is_date(cell.z)) return excelDateToText(cell.v, cell.z, date1904);
        return fmtNum(cell.v);
      case "s":
        return cell.v === "" || cell.v == null ? null : String(cell.v);
      case "b":
        return cell.v ? "True" : "False";
      default: // "e" (Fehler), "z" (leer)
        return null;
    }
  }

  /** Kopf-/Kategoriezelle -> Text wie der rohe XML-Wert in _get_cell_value. */
  function rawCellText(cell) {
    if (!cell || cell.v == null) return null;
    if (cell.t === "b") return cell.v ? "1" : "0";
    if (cell.t === "e") return cell.w != null ? cell.w : null;
    if (cell.t === "n") return fmtNum(cell.v);
    return String(cell.v);
  }

  // ---------------------------------------------------------------
  // Koordinaten (wie _add_coordinates in app.py)
  // ---------------------------------------------------------------

  /** Wie _to_number: Apostroph/Leerzeichen weg, Dezimalkomma -> Punkt. */
  function toNumber(text) {
    const s = String(text).trim().replace(/[\s'’`]/g, "").replace(/,/g, ".");
    if (s === "" || !/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    return Number(s);
  }

  const inRange = (x, [lo, hi]) => !Number.isNaN(x) && x > lo && x < hi;

  function coordsFromXY(x, y) {
    const east = inRange(x, LV95_E_RANGE) ? x : inRange(y, LV95_E_RANGE) ? y : NaN;
    const north = inRange(y, LV95_N_RANGE) ? y : inRange(x, LV95_N_RANGE) ? x : NaN;
    return [east, north];
  }

  const LEGACY_RE = /(-?\d[\d.]*)\s*[,;\s]+\s*(-?\d[\d.]*)/;

  function parseLegacy(raw) {
    const m = String(raw).trim().match(LEGACY_RE);
    if (!m) return null;
    const a = toNumber(m[1]);
    const b = toNumber(m[2]);
    if (inRange(a, LV95_E_RANGE) && inRange(b, LV95_N_RANGE)) return { lv95: [a, b] };
    if (!Number.isNaN(a) && !Number.isNaN(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180)
      return { wgs: [a, b] };
    return null;
  }

  function addCoordinates(rows, columns, proj4) {
    const hasXY = columns.includes(COORD_X_COL) && columns.includes(COORD_Y_COL);
    const hasLegacy = columns.includes(COORD_COL);
    const toWgs = proj4 ? proj4(EPSG_2056, "EPSG:4326") : null;
    for (const r of rows) {
      let east = NaN, north = NaN, lat = NaN, lon = NaN;
      if (hasXY) [east, north] = coordsFromXY(toNumber(r.values[COORD_X_COL]), toNumber(r.values[COORD_Y_COL]));
      if (hasLegacy && (Number.isNaN(east) || Number.isNaN(north))) {
        const p = parseLegacy(r.values[COORD_COL]);
        east = p && p.lv95 ? p.lv95[0] : NaN;
        north = p && p.lv95 ? p.lv95[1] : NaN;
        if (p && p.wgs) [lat, lon] = p.wgs;
      }
      r.coordSrc = "";
      if (!Number.isNaN(east) && !Number.isNaN(north)) {
        r.coordSrc = `LV95 ${fmtNum(east)} ${fmtNum(north)}`;
        r.lv95 = [east, north];
        if (toWgs) [lon, lat] = toWgs.forward([east, north]);
      } else if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        r.coordSrc = `WGS84 ${fmtNum(lat)} ${fmtNum(lon)}`;
      }
      r.lat = Number.isNaN(lat) ? null : lat;
      r.lon = Number.isNaN(lon) ? null : lon;
    }
  }

  // ---------------------------------------------------------------
  // Excel lesen (wie _read_structure + _read_data + read_excel_structure)
  // ---------------------------------------------------------------

  function parseWorkbook(XLSX, data, proj4) {
    const wb = XLSX.read(data, { type: "array", cellStyles: true, cellNF: true, cellDates: false, dense: false });
    const ws = wb.Sheets[SHEET_NAME];
    if (!ws) {
      throw new LumGisError(
        `Arbeitsblatt «${SHEET_NAME}» nicht gefunden. Vorhandene Blätter: ${wb.SheetNames.join(", ")}`
      );
    }
    const date1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
    // Ausdehnung aus den tatsaechlich vorhandenen Zellen (wie calamine), nicht aus <dimension>
    let lastRow = 0, lastCol = 0;
    for (const key of Object.keys(ws)) {
      if (key[0] === "!") continue;
      const a = XLSX.utils.decode_cell(key);
      if (a.r + 1 > lastRow) lastRow = a.r + 1;
      if (a.c + 1 > lastCol) lastCol = a.c + 1;
    }
    const cellAt = (row, col) => ws[XLSX.utils.encode_cell({ r: row - 1, c: col - 1 })];

    const hiddenCols = new Set();
    (ws["!cols"] || []).forEach((c, i) => { if (c && c.hidden) hiddenCols.add(i + 1); });
    const hiddenRows = new Set();
    (ws["!rows"] || []).forEach((r, i) => { if (r && r.hidden) hiddenRows.add(i + 1); });

    // Kategorien (Zeile 53): verbundene Zellen, Wert aus Zeile 53 an der linken Spalte
    const catRow = {};
    for (let c = 1; c <= lastCol; c++) {
      const v = rawCellText(cellAt(CATEGORY_ROW, c));
      if (v != null) catRow[c] = v;
    }
    const categoryByCol = {};
    for (const m of ws["!merges"] || []) {
      const minRow = m.s.r + 1, maxRow = m.e.r + 1, minCol = m.s.c + 1, maxCol = m.e.c + 1;
      if (minRow <= CATEGORY_ROW && CATEGORY_ROW <= maxRow) {
        const val = catRow[minCol];
        if (val && val.trim()) {
          for (let c = minCol; c <= maxCol; c++) if (c >= DATA_START_COL) categoryByCol[c] = val.trim();
        }
      }
    }
    for (const [c, val] of Object.entries(catRow)) {
      const ci = Number(c);
      if (ci >= DATA_START_COL && !(ci in categoryByCol) && val && val.trim()) categoryByCol[ci] = val.trim();
    }

    // Spaltenkoepfe (Zeile 55)
    let headers = {};
    for (let c = DATA_START_COL; c <= lastCol; c++) {
      const v = rawCellText(cellAt(HEADER_ROW, c));
      if (v != null && v.trim()) headers[c] = v.trim().replace(/\s*\n\s*/g, " ").trim();
    }
    let hiddenColsWithHeader = 0;
    for (const ci of hiddenCols) {
      if (ci in headers) hiddenColsWithHeader++;
      delete headers[ci];
      delete categoryByCol[ci];
    }
    const colIndices = Object.keys(headers).map(Number).sort((a, b) => a - b);

    // Spaltenreihenfolge wie im DataFrame: erste Erwaehnung; bei doppeltem Namen gewinnt die letzte Spalte
    const columns = [];
    for (const ci of colIndices) if (!columns.includes(headers[ci])) columns.push(headers[ci]);

    // Daten ab Zeile 56
    const rows = [];
    let hiddenRowsWithData = 0;
    for (let row = DATA_START_ROW; row <= lastRow; row++) {
      const values = {};
      let hasValue = false;
      for (const ci of colIndices) {
        const v = cellToText(XLSX, cellAt(row, ci), date1904);
        values[headers[ci]] = v;
        if (v != null) hasValue = true;
      }
      if (!hasValue) continue;
      if (hiddenRows.has(row)) { hiddenRowsWithData++; continue; }
      for (const col of columns) if (values[col] == null) values[col] = "";
      rows.push({ excelRow: row, values });
    }

    // Zeilen ohne jede ID verwerfen
    const isEmpty = (v) => v == null || EMPTY_VALS.has(String(v).trim());
    const kept = rows.filter((r) => ID_COLS.some((c) => columns.includes(c) && !isEmpty(r.values[c])));
    const noId = rows.length - kept.length;

    // Kategorien und Spalten-Infos
    const colInfo = {};
    const catMap = {};
    const orderedCategories = [];
    for (const ci of colIndices) {
      const h = headers[ci];
      const cat = categoryByCol[ci] || "Sonstige";
      catMap[h] = cat;
      colInfo[h] = { colIndex: ci, category: cat };
      if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
    }

    if (!ID_COLS.some((c) => c in colInfo)) {
      throw new LumGisError(
        `Keine ID-Spalte in Zeile ${HEADER_ROW} gefunden (erwartet: «${ID_COL}», «${ID_COL_NEU}» ` +
          `oder «${ID_COL_PROJEKT}»). Gefundene Spalten: ${Object.keys(colInfo).join(", ") || "keine"}`
      );
    }

    addCoordinates(kept, columns, proj4);
    return {
      columns, rows: kept, colInfo, catMap, orderedCategories,
      stats: { hiddenRows: hiddenRowsWithData, hiddenCols: hiddenColsWithHeader, noId },
    };
  }

  // ---------------------------------------------------------------
  // Pruefbericht (wie build_report in app.py)
  // ---------------------------------------------------------------

  async function sha256Hex(text) {
    const subtle = (typeof crypto !== "undefined" && crypto.subtle) || require("crypto").webcrypto.subtle;
    const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  function reportDetails(model) {
    const cols = model.columns.filter((c) => !c.startsWith("_")); // wie data_cols in app.py
    const lines = [REPORT_VERSION, cols.join("\t")];
    for (const r of model.rows) {
      lines.push([String(r.excelRow), ...cols.map((c) => r.values[c]), r.coordSrc].join("\t"));
    }
    return lines.join("\n") + "\n";
  }

  async function buildReport(model) {
    const details = reportDetails(model);
    const digest = await sha256Hex(details);
    const present = COORD_COLS.filter((c) => model.columns.includes(c));
    const isEmpty = (v) => EMPTY_VALS.has(String(v).trim());
    let withCoords = 0, noCoords = 0;
    const invalidRows = [];
    for (const r of model.rows) {
      const hasRaw = present.some((c) => !isEmpty(r.values[c]));
      const hasCoord = r.lat != null;
      if (hasCoord) withCoords++;
      if (!hasRaw) noCoords++;
      if (hasRaw && !hasCoord) invalidRows.push(r.excelRow);
    }
    const byId = new Map();
    if (model.columns.includes(ID_COL)) {
      for (const r of model.rows) {
        const id = String(r.values[ID_COL]).trim();
        if (EMPTY_VALS.has(id)) continue;
        if (!byId.has(id)) byId.set(id, []);
        byId.get(id).push(r.excelRow);
      }
    }
    const duplicates = [...byId.entries()]
      .filter(([, rows]) => rows.length > 1)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return {
      rows: model.rows.length,
      withCoords,
      noCoords,
      invalidCoords: invalidRows.length,
      invalidRows,
      hiddenRows: model.stats.hiddenRows,
      hiddenCols: model.stats.hiddenCols,
      noId: model.stats.noId,
      duplicates,
      checksum: `${digest.slice(0, 4)}-${digest.slice(4, 8)}`,
      details,
    };
  }

  /** WGS84 (Kartenklick) -> LV95 [E, N], fuer den Modus «Erfassen». */
  function toLV95(proj4, lat, lon) {
    return proj4(EPSG_2056, "EPSG:4326").inverse([lon, lat]);
  }

  /** LV95 [E, N] -> WGS84 [lat, lon], fuer das Plan-Overlay. */
  function toWGS84(proj4, e, n) {
    const [lon, lat] = proj4(EPSG_2056, "EPSG:4326").forward([e, n]);
    return [lat, lon];
  }

  return {
    toLV95, toWGS84, LV95_E_RANGE, LV95_N_RANGE,
    SHEET_NAME, HEADER_ROW, ID_COL, ID_COL_NEU, ID_COL_PROJEKT, ID_COLS,
    COORD_X_COL, COORD_Y_COL, COORD_COL, COORD_COLS, STREET_COL, EMPTY_VALS,
    LumGisError, parseWorkbook, buildReport, fmtNum, pyFloatRepr, excelDateToText, toNumber,
  };
});
