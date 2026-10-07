/* LumGis Oberflaeche: Datei oeffnen, Karte, Filter, Suche, Tabelle, Pruefbericht. */
(function () {
  "use strict";
  const C = window.LumGisCore;
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmtCount = (n) => n.toLocaleString("de-CH");
  const collator = new Intl.Collator("de-CH", { numeric: true, sensitivity: "base" });
  const isEmpty = (v) => v == null || C.EMPTY_VALS.has(String(v).trim());

  // Farbenblind-taugliche Palette (Okabe-Ito + Tol)
  const PALETTE = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9", "#D55E00", "#F0E442", "#332288",
    "#882255", "#44AA99", "#999933", "#AA4499", "#117733", "#88CCEE", "#DDCC77", "#000000"];
  const EMPTY_COLOR = "#9ca3af";
  const MAX_FILTER_UNIQUE = 150;
  const MAX_TABLE_ROWS = 3000;

  // Nur swisstopo: OpenStreetMap sperrt Kachelabrufe ohne Referer, und eine per Doppelklick
  // geoeffnete Datei (file://) sendet keinen -> 403 «Access blocked».
  const BASEMAPS = {
    strasse: { label: "Strassenkarte", url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swisstlm3d-karte-farbe/default/current/3857/{z}/{x}/{y}.png",
      opts: { maxZoom: 21, maxNativeZoom: 19, attribution: "© swisstopo swissTLM3D" } },
    lk: { label: "Landeskarte", url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg",
      opts: { maxZoom: 21, maxNativeZoom: 19, attribution: "© swisstopo" } },
    img: { label: "Luftbild", url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg",
      opts: { maxZoom: 21, maxNativeZoom: 20, attribution: "© swisstopo SWISSIMAGE" } },
  };

  // ---------- kleine Helfer fuer Browser-Speicher (darf fehlen) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("lumgis." + key); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem("lumgis." + key, JSON.stringify(value)); } catch (e) { /* egal */ } },
  };
  const handleDb = {
    open() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open("lumgis", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("handles");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    async get() {
      try {
        const db = await this.open();
        return await new Promise((res) => {
          const r = db.transaction("handles").objectStore("handles").get("last");
          r.onsuccess = () => res(r.result || null);
          r.onerror = () => res(null);
        });
      } catch (e) { return null; }
    },
    async set(handle) {
      try {
        const db = await this.open();
        db.transaction("handles", "readwrite").objectStore("handles").put(handle, "last");
      } catch (e) { /* egal */ }
    },
  };

  // ---------- Zustand ----------
  const state = {
    model: null, report: null, handle: null, fileName: "",
    filters: new Map(), search: "", colorCol: null,
    filterable: [], visible: [], tab: "map",
  };
  let map = null, markerLayer = null, legendCtl = null, baseLayer = null, pulseMarker = null;
  const markers = []; // parallel zu state.model.rows (null ohne Koordinaten)

  // ---------- Datei oeffnen ----------
  function showStartMessage(html, kind = "error") {
    $("startMsg").innerHTML = html ? `<div class="msg ${kind}">${html}</div>` : "";
  }

  async function pickFile() {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "Excel", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx", ".xlsm"] } }],
        });
        return openHandle(handle);
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    $("fileInput").click();
  }

  async function openHandle(handle, askPermission = false) {
    try {
      if (askPermission && handle.requestPermission) {
        const perm = await handle.requestPermission({ mode: "read" });
        if (perm !== "granted") return;
      }
      const file = await handle.getFile();
      state.handle = handle;
      handleDb.set(handle);
      await loadFile(file);
    } catch (e) {
      showError(`Die Datei konnte nicht geöffnet werden. Bitte erneut auswählen.<br><small>${esc(e.message)}</small>`);
    }
  }

  async function loadFile(file) {
    if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
      showError(`«${esc(file.name)}» ist keine Excel-Datei (.xlsx oder .xlsm).`);
      return;
    }
    $("overlay").hidden = false;
    await new Promise((r) => setTimeout(r, 30)); // Overlay zeichnen lassen
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const model = C.parseWorkbook(XLSX, buf, proj4);
      const report = await C.buildReport(model);
      if (file.name !== state.fileName) { // andere Datei: Filter und Suche zuruecksetzen; bei «Neu laden» bleiben sie
        state.filters.clear();
        state.search = "";
        $("search").value = "";
      }
      state.fileName = file.name;
      showModel(model, report);
    } catch (e) {
      const msg = e instanceof C.LumGisError ? esc(e.message)
        : `Die Datei konnte nicht gelesen werden. Ist sie beschädigt oder passwortgeschützt?<br><small>${esc(e.message)}</small>`;
      showError(msg);
    } finally {
      $("overlay").hidden = true;
    }
  }

  function showError(html) {
    if (state.model) {
      alert(html.replace(/<[^>]+>/g, " ")); // Daten bleiben sichtbar
    } else {
      showStartMessage(html);
    }
  }

  async function reload() {
    if (state.handle) return openHandle(state.handle, true);
    alert("Bitte die Datei erneut auswählen, damit die neue Fassung gelesen wird.");
    pickFile();
  }

  // ---------- Daten anzeigen ----------
  function showModel(model, report) {
    const firstLoad = !state.model;
    state.model = model;
    state.report = report;
    $("start").hidden = true;
    $("app").hidden = false;
    $("btnOpen").hidden = false;
    $("btnReload").hidden = false;
    $("fileName").textContent = state.fileName;
    document.title = `${state.fileName} – LumGis`;

    // Filterbare Spalten wie in app.py (2..150 verschiedene Werte), ohne IDs und Koordinaten
    const skip = new Set([...C.ID_COLS, ...C.COORD_COLS]);
    state.filterable = model.columns.filter((col) => {
      if (skip.has(col)) return false;
      const vals = new Set();
      for (const r of model.rows) {
        const v = r.values[col];
        if (!isEmpty(v)) { vals.add(v); if (vals.size > MAX_FILTER_UNIQUE) return false; }
      }
      return vals.size > 1;
    });
    // Filter behalten, wenn es Spalte und Werte noch gibt (z. B. nach «Neu laden»)
    for (const col of [...state.filters.keys()]) if (!state.filterable.includes(col)) state.filters.delete(col);

    buildColorSelect();
    buildFilters();
    initMap();
    buildMarkers();
    renderReport();
    apply({ fit: true });
    if (firstLoad) switchTab("map");
  }

  function buildColorSelect() {
    const sel = $("colorCol");
    const saved = store.get("colorCol", null);
    const preferred = [saved, state.colorCol, "Leuchtentyp", "Leuchte", "Typ"].find((c) => c && state.filterable.includes(c));
    state.colorCol = preferred || state.filterable[0] || null;
    sel.innerHTML = `<option value="">– keine –</option>` +
      state.filterable.map((c) => `<option ${c === state.colorCol ? "selected" : ""}>${esc(c)}</option>`).join("");
  }

  function valueCounts(col, rows) {
    const counts = new Map();
    for (const r of rows) {
      const v = r.values[col];
      if (isEmpty(v)) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => collator.compare(a[0], b[0]));
  }

  function buildFilters() {
    const m = state.model;
    const html = [];
    for (const cat of m.orderedCategories) {
      const cols = state.filterable.filter((c) => m.catMap[c] === cat);
      if (!cols.length) continue;
      const open = cols.some((c) => state.filters.has(c));
      html.push(`<details class="cat" ${open ? "open" : ""}><summary>${esc(cat)}</summary><div>`);
      for (const col of cols) {
        const counts = valueCounts(col, m.rows);
        const sel = state.filters.get(col) || new Set();
        html.push(`<details class="flt" data-col="${esc(col)}" ${sel.size ? "open" : ""}>
          <summary><span>${esc(col)}</span><span class="sel">${sel.size ? sel.size + " gewählt" : ""}</span></summary>
          ${counts.length > 8 ? `<input type="search" placeholder="Werte durchsuchen …" class="optsearch">` : ""}
          <div class="opts">${counts.map(([v, n]) =>
            `<label><input type="checkbox" value="${esc(v)}" ${sel.has(v) ? "checked" : ""}><span>${esc(v)}</span><small>${fmtCount(n)}</small></label>`
          ).join("")}</div></details>`);
      }
      html.push(`</div></details>`);
    }
    $("filters").innerHTML = html.join("") || `<p class="muted">Keine filterbaren Spalten gefunden.</p>`;
  }

  // ---------- Filtern ----------
  function currentRows() {
    const m = state.model;
    const q = state.search.trim().toLowerCase();
    const searchCols = [C.STREET_COL, ...C.ID_COLS].filter((c) => m.columns.includes(c));
    return m.rows.filter((r) => {
      for (const [col, sel] of state.filters) if (sel.size && !sel.has(r.values[col])) return false;
      if (q && !searchCols.some((c) => String(r.values[c]).toLowerCase().includes(q))) return false;
      return true;
    });
  }

  let applyTimer = null;
  function applySoon(opts) { clearTimeout(applyTimer); applyTimer = setTimeout(() => apply(opts), 250); }

  function apply({ fit = false } = {}) {
    const rows = currentRows();
    state.visible = rows;
    renderSummary(rows);
    renderChips(rows);
    renderResults(rows);
    updateMarkers(rows, fit);
    renderLegend(rows);
    if (state.tab === "table") renderTable();
  }

  function rowTitle(r) {
    for (const c of C.ID_COLS) if (!isEmpty(r.values[c])) return r.values[c];
    return "–";
  }

  function renderSummary(rows) {
    const rep = state.report;
    const onMap = rows.filter((r) => r.lat != null).length;
    const total = state.model.rows.length;
    const issues = [];
    if (rep.noCoords) issues.push(`${fmtCount(rep.noCoords)} ohne Koordinaten`);
    if (rep.invalidCoords) issues.push(`${fmtCount(rep.invalidCoords)} Koordinaten nicht lesbar`);
    if (rep.duplicates.length) issues.push(`${fmtCount(rep.duplicates.length)} doppelte Lichtpunkt-Nr.`);
    $("summary").innerHTML =
      `<div class="big"><b>${fmtCount(onMap)}</b> von ${fmtCount(rows.length)} Leuchten auf der Karte</div>` +
      (rows.length !== total ? `<div class="muted">Auswahl aus ${fmtCount(total)} Leuchten</div>` : "") +
      (issues.length
        ? `<div class="issues">${issues.join(" · ")} – <a data-goto="report">Prüfbericht</a></div>`
        : `<div class="ok">Alle Leuchten haben gültige Koordinaten.</div>`);
  }

  function renderChips(rows) {
    const chips = [];
    if (state.search.trim()) chips.push(`<span class="chip">Suche: ${esc(state.search.trim())}<button data-chip-search title="Entfernen">×</button></span>`);
    for (const [col, sel] of state.filters) {
      for (const v of sel) chips.push(`<span class="chip">${esc(col)}: ${esc(v)}<button data-chip-col="${esc(col)}" data-chip-val="${esc(v)}" title="Entfernen">×</button></span>`);
    }
    $("chipbar").innerHTML = chips.join("") +
      (chips.length ? `<button class="reset" id="btnReset">Alle zurücksetzen</button>` : `<span class="muted">Keine Filter aktiv</span>`) +
      `<span class="count">${fmtCount(rows.length)} von ${fmtCount(state.model.rows.length)} Leuchten</span>`;
  }

  function renderResults(rows) {
    const box = $("results");
    if (!state.search.trim()) { box.hidden = true; return; }
    box.hidden = false;
    if (!rows.length) { box.innerHTML = `<div class="more">Keine Treffer.</div>`; return; }
    const shown = rows.slice(0, 50);
    box.innerHTML = shown.map((r) =>
      `<button data-row="${r.excelRow}">${esc(rowTitle(r))} <small>${esc(r.values[C.STREET_COL] || "")}${r.lat == null ? " · ohne Koordinaten" : ""}</small></button>`
    ).join("") + (rows.length > shown.length ? `<div class="more">… und ${fmtCount(rows.length - shown.length)} weitere</div>` : "");
  }

  // ---------- Karte ----------
  function initMap() {
    if (map) return;
    map = L.map("map", { preferCanvas: true, zoomControl: true }).setView([46.8, 8.2], 8);
    markerLayer = L.layerGroup().addTo(map);
    const wanted = store.get("basemap", "strasse");
    $("basemaps").innerHTML = Object.entries(BASEMAPS)
      .map(([k, b]) => `<button data-basemap="${k}">${b.label}</button>`).join("");
    setBasemap(BASEMAPS[wanted] ? wanted : "strasse");
  }

  function setBasemap(key) {
    if (baseLayer) map.removeLayer(baseLayer);
    const b = BASEMAPS[key];
    let errors = 0;
    baseLayer = L.tileLayer(b.url, b.opts)
      .on("tileerror", () => { if (++errors >= 4) $("tilewarn").hidden = false; })
      .on("tileload", () => { errors = 0; $("tilewarn").hidden = true; })
      .addTo(map);
    baseLayer.bringToBack();
    store.set("basemap", key);
    for (const btn of $("basemaps").querySelectorAll("button")) btn.classList.toggle("active", btn.dataset.basemap === key);
  }

  function colorMapFor(col) {
    if (!col) return { colorOf: () => PALETTE[0], entries: [] };
    const values = valueCounts(col, state.model.rows).map(([v]) => v);
    const saved = (store.get("colors", {}) || {})[col] || {};
    const cmap = new Map(values.map((v, i) => [v, saved[v] || PALETTE[i % PALETTE.length]]));
    return { colorOf: (v) => (isEmpty(v) ? EMPTY_COLOR : cmap.get(v) || EMPTY_COLOR), cmap };
  }

  function buildMarkers() {
    markers.length = 0;
    markerLayer.clearLayers();
    for (const r of state.model.rows) {
      if (r.lat == null) { markers.push(null); continue; }
      const mk = L.circleMarker([r.lat, r.lon], { radius: 6, weight: 1, color: "#1f2937", fillOpacity: 0.9 });
      mk.row = r;
      mk.bindTooltip(() => esc(rowTitle(r)) + (r.values[C.STREET_COL] ? " | " + esc(r.values[C.STREET_COL]) : ""),
        { direction: "top", offset: [0, -6] });
      mk.bindPopup(() => popupHtml(r), { maxWidth: 360 });
      markers.push(mk);
    }
  }

  function popupHtml(r) {
    const m = state.model;
    const rows = m.columns
      .filter((c) => !isEmpty(r.values[c]))
      .map((c) => `<tr><td>${esc(c)}</td><td>${esc(r.values[c]).replace(/\n/g, "<br>")}</td></tr>`).join("");
    return `<div class="ptitle">${esc(rowTitle(r))}</div>
      <div class="psub">${esc(r.values[C.STREET_COL] || "")} · Excel-Zeile ${r.excelRow}</div>
      <table>${rows}</table>`;
  }

  function updateMarkers(rows, fit) {
    const { colorOf } = colorMapFor(state.colorCol);
    const visible = new Set(rows);
    markerLayer.clearLayers();
    const shown = [];
    state.model.rows.forEach((r, i) => {
      const mk = markers[i];
      if (!mk || !visible.has(r)) return;
      mk.setStyle({ fillColor: colorOf(state.colorCol ? r.values[state.colorCol] : null) });
      markerLayer.addLayer(mk);
      shown.push(mk);
    });
    if (fit && shown.length) {
      const bounds = L.latLngBounds(shown.map((mk) => mk.getLatLng()));
      map.fitBounds(bounds.pad(0.05), { maxZoom: 18, animate: false });
    }
    setTimeout(() => map.invalidateSize(), 0);
  }

  function renderLegend(rows) {
    if (legendCtl) { legendCtl.remove(); legendCtl = null; }
    const col = state.colorCol;
    if (!col) return;
    const { cmap } = colorMapFor(col);
    const counts = new Map(valueCounts(col, rows));
    const emptyCount = rows.filter((r) => isEmpty(r.values[col])).length;
    legendCtl = L.control({ position: "bottomright" });
    legendCtl.onAdd = () => {
      const div = L.DomUtil.create("div", "legend");
      div.innerHTML = `<b>${esc(col)}</b>` +
        [...cmap.entries()].map(([v, color]) =>
          `<label><input type="color" value="${color}" data-val="${esc(v)}" title="Farbe ändern"><span>${esc(v)}</span><small>${fmtCount(counts.get(v) || 0)}</small></label>`
        ).join("") +
        (emptyCount ? `<label><input type="color" value="${EMPTY_COLOR}" disabled><span>(leer)</span><small>${fmtCount(emptyCount)}</small></label>` : "");
      div.addEventListener("input", (e) => {
        if (e.target.type !== "color" || !e.target.dataset.val) return;
        const colors = store.get("colors", {}) || {};
        colors[col] = Object.assign(colors[col] || {}, { [e.target.dataset.val]: e.target.value });
        store.set("colors", colors);
        updateMarkers(state.visible, false);
      });
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      return div;
    };
    legendCtl.addTo(map);
  }

  function focusRow(excelRow) {
    const i = state.model.rows.findIndex((r) => r.excelRow === excelRow);
    const mk = markers[i];
    if (!mk) { alert("Diese Leuchte hat keine gültigen Koordinaten und ist nicht auf der Karte."); return; }
    switchTab("map");
    if (!markerLayer.hasLayer(mk)) markerLayer.addLayer(mk);
    map.setView(mk.getLatLng(), Math.max(map.getZoom(), 18), { animate: false });
    if (pulseMarker) pulseMarker.remove();
    pulseMarker = L.marker(mk.getLatLng(), {
      icon: L.divIcon({ className: "", html: '<div class="pulse"></div>', iconSize: [40, 40] }), interactive: false,
    }).addTo(map);
    setTimeout(() => { if (pulseMarker) { pulseMarker.remove(); pulseMarker = null; } }, 3800);
    mk.openPopup();
  }

  // ---------- Tabelle ----------
  function renderTable() {
    const m = state.model;
    const rows = state.visible.slice(0, MAX_TABLE_ROWS);
    const head = `<tr><th>Excel-Zeile</th>${m.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
    const body = rows.map((r) =>
      `<tr data-row="${r.excelRow}"><td>${r.excelRow}</td>${m.columns.map((c) => `<td title="${esc(r.values[c])}">${esc(r.values[c])}</td>`).join("")}</tr>`
    ).join("");
    const note = state.visible.length > rows.length
      ? `<div class="tablenote">Angezeigt: erste ${fmtCount(rows.length)} von ${fmtCount(state.visible.length)} Leuchten. Mit Filter oder Suche eingrenzen.</div>` : "";
    $("tablewrap").innerHTML = note + `<table class="data"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  // ---------- Pruefbericht ----------
  function colLetter(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

  function renderReport() {
    const m = state.model, rep = state.report;
    const byRow = new Map(m.rows.map((r) => [r.excelRow, r]));
    const kv = [
      ["Leuchten gelesen", rep.rows], ["davon mit Koordinaten", rep.withCoords], ["ohne Koordinaten", rep.noCoords],
      ["Koordinaten nicht lesbar", rep.invalidCoords], ["ausgeblendete Zeilen übersprungen", rep.hiddenRows],
      ["ausgeblendete Spalten ignoriert", rep.hiddenCols], ["Zeilen ohne Lichtpunkt-Nr. verworfen", rep.noId],
      ["doppelte Lichtpunkt-Nr.", rep.duplicates.length],
    ];
    const coordCols = C.COORD_COLS.filter((c) => m.columns.includes(c));
    const invalid = rep.invalidRows.map((n) => byRow.get(n));
    const found = [[C.COORD_X_COL, "Koordinate X (LV95)"], [C.COORD_Y_COL, "Koordinate Y (LV95)"],
      [C.COORD_COL, "GPS-Spalte (Altformat)"], [C.ID_COL, "ID-Spalte"], [C.STREET_COL, "Strasse"]]
      .map(([c, label]) => `<li>${label} «${esc(c)}»: ${m.colInfo[c] ? "Spalte " + colLetter(m.colInfo[c].colIndex) : "<span class='muted'>nicht gefunden</span>"}</li>`).join("");

    $("report").innerHTML = `
      <h2>Prüfbericht</h2>
      <p class="muted">Gleiche Prüfsumme bedeutet gleicher Datenstand. Ändert sich eine einzige Zelle, ändert sich die Prüfsumme.</p>
      <div>Prüfsumme</div><div class="checksum">${rep.checksum}</div>
      <table class="kv">${kv.map(([k, v]) => `<tr><td>${k}</td><td>${fmtCount(v)}</td></tr>`).join("")}</table>
      ${invalid.length ? `<details open><summary>Koordinaten nicht lesbar (${fmtCount(invalid.length)})</summary><div>
        <table class="data"><thead><tr><th>Excel-Zeile</th><th>Lichtpunkt</th><th>Strasse</th>${coordCols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
        <tbody>${invalid.map((r) => `<tr><td>${r.excelRow}</td><td>${esc(rowTitle(r))}</td><td>${esc(r.values[C.STREET_COL] || "")}</td>${coordCols.map((c) => `<td>${esc(r.values[c])}</td>`).join("")}</tr>`).join("")}</tbody></table>
      </div></details>` : ""}
      ${rep.duplicates.length ? `<details open><summary>Doppelte Lichtpunkt-Nr. (${fmtCount(rep.duplicates.length)})</summary><div>
        <table class="data"><thead><tr><th>Lichtpunkt-Nr.</th><th>Excel-Zeilen</th></tr></thead>
        <tbody>${rep.duplicates.map(([v, rows]) => `<tr><td>${esc(v)}</td><td>${rows.join(", ")}</td></tr>`).join("")}</tbody></table>
      </div></details>` : ""}
      <h3>Gefundene Spalten</h3><ul>${found}</ul>
      <details><summary>Kategorien und Spalten (${m.orderedCategories.length} Kategorien, ${Object.keys(m.colInfo).length} Spalten)</summary><div>
        ${m.orderedCategories.map((cat) => `<p><b>${esc(cat)}</b><br>${Object.entries(m.colInfo).filter(([, i]) => i.category === cat)
          .map(([c, i]) => `${colLetter(i.colIndex)}: ${esc(c)}`).join(", ")}</p>`).join("")}
      </div></details>
      <details><summary>Details für den Vergleich</summary><div>
        <p class="muted">Liste aller gelesenen Werte (Tab-getrennt), z. B. um zwei Datenstände zu vergleichen.</p>
        <button class="copy" id="btnCopy">In die Zwischenablage kopieren</button> <span id="copyMsg" class="muted"></span>
      </div></details>`;
  }

  async function copyDetails() {
    const text = state.report.details;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    $("copyMsg").textContent = `${fmtCount(text.split("\n").length - 1)} Zeilen kopiert.`;
  }

  // ---------- Tabs ----------
  function switchTab(tab) {
    state.tab = tab;
    for (const btn of $("tabs").querySelectorAll("button")) btn.classList.toggle("active", btn.dataset.tab === tab);
    for (const t of ["map", "table", "report"]) $("panel-" + t).hidden = t !== tab;
    if (tab === "map" && map) setTimeout(() => map.invalidateSize(), 0);
    if (tab === "table") renderTable();
  }

  // ---------- Ereignisse ----------
  function bind() {
    const dz = $("dropzone");
    $("btnPick").addEventListener("click", (e) => { e.stopPropagation(); pickFile(); });
    dz.addEventListener("click", () => pickFile());
    dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickFile(); } });
    $("fileInput").addEventListener("change", (e) => {
      const f = e.target.files[0];
      e.target.value = "";
      if (f) { state.handle = null; loadFile(f); }
    });
    // Drag & Drop auf das ganze Fenster
    window.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
    window.addEventListener("dragleave", (e) => { if (!e.relatedTarget) dz.classList.remove("drag"); });
    window.addEventListener("drop", async (e) => {
      e.preventDefault();
      dz.classList.remove("drag");
      const item = e.dataTransfer.items && e.dataTransfer.items[0];
      const f = e.dataTransfer.files[0];
      if (item && item.getAsFileSystemHandle) {
        // Mit Handle kann «Neu laden» spaeter die aktuelle Fassung lesen; sonst (z. B. aus Outlook) nur die Datei
        try {
          const handle = await item.getAsFileSystemHandle();
          if (handle && handle.kind === "file") return openHandle(handle);
        } catch (err) { /* weiter mit der Datei */ }
      }
      if (f) { state.handle = null; loadFile(f); }
    });

    $("btnOpen").addEventListener("click", () => pickFile());
    $("btnReload").addEventListener("click", () => reload());
    $("colorCol").addEventListener("change", (e) => {
      state.colorCol = e.target.value || null;
      store.set("colorCol", state.colorCol);
      apply();
    });
    $("search").addEventListener("input", (e) => { state.search = e.target.value; applySoon({ fit: true }); });

    $("filters").addEventListener("change", (e) => {
      if (e.target.type !== "checkbox") return;
      const col = e.target.closest("details.flt").dataset.col;
      const sel = state.filters.get(col) || new Set();
      e.target.checked ? sel.add(e.target.value) : sel.delete(e.target.value);
      if (sel.size) state.filters.set(col, sel); else state.filters.delete(col);
      e.target.closest("details.flt").querySelector(".sel").textContent = sel.size ? sel.size + " gewählt" : "";
      apply({ fit: true });
    });
    $("filters").addEventListener("input", (e) => {
      if (!e.target.classList.contains("optsearch")) return;
      const q = e.target.value.toLowerCase();
      for (const lab of e.target.parentElement.querySelectorAll(".opts label")) {
        lab.hidden = !lab.textContent.toLowerCase().includes(q);
      }
    });

    $("chipbar").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.id === "btnReset") {
        state.filters.clear(); state.search = ""; $("search").value = "";
      } else if (b.hasAttribute("data-chip-search")) {
        state.search = ""; $("search").value = "";
      } else if (b.dataset.chipCol) {
        const sel = state.filters.get(b.dataset.chipCol);
        if (sel) { sel.delete(b.dataset.chipVal); if (!sel.size) state.filters.delete(b.dataset.chipCol); }
      }
      buildFilters();
      apply({ fit: true });
    });

    $("results").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-row]");
      if (b) focusRow(Number(b.dataset.row));
    });
    $("tablewrap").addEventListener("dblclick", (e) => {
      const tr = e.target.closest("tr[data-row]");
      if (tr) focusRow(Number(tr.dataset.row));
    });
    $("tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) switchTab(b.dataset.tab); });
    $("summary").addEventListener("click", (e) => { if (e.target.dataset.goto) switchTab(e.target.dataset.goto); });
    $("basemaps").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setBasemap(b.dataset.basemap); });
    $("report").addEventListener("click", (e) => { if (e.target.id === "btnCopy") copyDetails(); });
  }

  async function showRecent() {
    if (!window.showOpenFilePicker) return;
    const handle = await handleDb.get();
    if (!handle) return;
    $("btnRecent").textContent = handle.name;
    $("recent").hidden = false;
    $("btnRecent").addEventListener("click", () => openHandle(handle, true));
  }

  // Fuer Fehlersuche in der Browser-Konsole
  window.LumGisDebug = { state, get map() { return map; } };

  bind();
  showRecent();
})();
