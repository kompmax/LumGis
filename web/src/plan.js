/*
 * LumGis Plan-Overlay: PDF-Plan laden, mit zwei Passpunkten ausrichten
 * (Lage, Massstab und Drehung), Kontrollpunkt, Transparenz, ein/aus.
 *
 * Koordinaten: Planpunkte in PDF-Punkten (u nach rechts, v nach unten, Ursprung
 * oben links). Abbildung als Aehnlichkeitstransformation in komplexer Schreibweise:
 *   z = a * w + b   mit w = u - i*v (Plan) und z = E + i*N (LV95).
 * |a| = Meter pro PDF-Punkt (Massstab), arg(a) = Drehung, b = Verschiebung.
 */
(function () {
  "use strict";
  const PT_M = 0.0254 / 72;          // ein PDF-Punkt in Metern (bei Massstab 1:1)
  const MAX_PX = 6000;               // Rendergroesse des Plans (laengste Seite)

  // ---------- komplexe Zahlen ----------
  const cx = (re, im) => ({ re, im });
  const add = (p, q) => cx(p.re + q.re, p.im + q.im);
  const sub = (p, q) => cx(p.re - q.re, p.im - q.im);
  const mul = (p, q) => cx(p.re * q.re - p.im * q.im, p.re * q.im + p.im * q.re);
  const div = (p, q) => { const d = q.re * q.re + q.im * q.im; return cx((p.re * q.re + p.im * q.im) / d, (p.im * q.re - p.re * q.im) / d); };
  const abs = (p) => Math.hypot(p.re, p.im);

  function create(deps) {
    const { getMap, C, store, esc, $, handleDb, onAligned, getContextKey } = deps;
    const plan = {
      name: "", size: 0, page: 1, pageCount: 1, wPt: 0, hPt: 0,
      canvas: null, layer: null, labels: new Map(), nominalScale: null,
      a: null, b: null, aligned: false,
    };
    const ui = { visible: true, opacity: 70, white: false };
    let step = null;          // laufender Ablauf: {kind: "align"|"check", phase, picks: []}
    let pickLayer = null;     // Hilfsmarker beim Ausrichten
    let pdfDoc = null, fileHandle = null, fileBlob = null;

    // ---------- Umrechnung Plan <-> Karte ----------
    const toLatLng = (u, v) => {
      const z = add(mul(plan.a, cx(u, -v)), plan.b);
      const [lat, lon] = C.toWGS84(proj4, z.re, z.im);
      return L.latLng(lat, lon);
    };
    const fromLatLng = (ll) => {
      const [e, n] = C.toLV95(proj4, ll.lat, ll.lng);
      const w = div(sub(cx(e, n), plan.b), plan.a);
      return [w.re, -w.im];
    };
    const lv95Of = (ll) => { const [e, n] = C.toLV95(proj4, ll.lat, ll.lng); return cx(e, n); };

    // ---------- Leaflet-Ebene: Canvas mit beliebiger Drehung/Skalierung ----------
    const PlanLayer = L.Layer.extend({
      onAdd(map) {
        if (!map.getPane("planPane")) {
          const pane = map.createPane("planPane");
          pane.style.zIndex = 350;
          pane.style.pointerEvents = "none";
        }
        this._el = plan.canvas;
        this._el.classList.add("plancanvas", "leaflet-zoom-animated");
        map.getPane("planPane").appendChild(this._el);
        this._reset();
        applyStyle();
      },
      onRemove() { this._el.remove(); },
      getEvents() { return { zoom: this._reset, viewreset: this._reset, moveend: this._reset, zoomanim: this._animate }; },
      _matrix(toPoint) {
        const W = plan.canvas.width, H = plan.canvas.height;
        const tl = toPoint(toLatLng(0, 0)), tr = toPoint(toLatLng(plan.wPt, 0)), bl = toPoint(toLatLng(0, plan.hPt));
        return `matrix(${(tr.x - tl.x) / W},${(tr.y - tl.y) / W},${(bl.x - tl.x) / H},${(bl.y - tl.y) / H},${tl.x},${tl.y})`;
      },
      _reset() { if (this._map && plan.a) this._el.style.transform = this._matrix((ll) => this._map.latLngToLayerPoint(ll)); },
      _animate(e) { this._el.style.transform = this._matrix((ll) => this._map._latLngToNewLayerPoint(ll, e.zoom, e.center)); },
    });

    function applyStyle() {
      if (!plan.canvas) return;
      plan.canvas.style.opacity = String(ui.opacity / 100);
      plan.canvas.style.background = ui.white ? "#fff" : "transparent";
    }

    function showLayer() {
      const map = getMap();
      if (!plan.canvas || !map) return;
      if (ui.visible && !plan.layer) plan.layer = new PlanLayer().addTo(map);
      if (!ui.visible && plan.layer) { plan.layer.remove(); plan.layer = null; }
      if (plan.layer) plan.layer._reset();
      applyStyle();
    }

    // ---------- PDF laden ----------
    const storeKey = () => `plan.${plan.name}|${plan.size}|${plan.page}`;

    async function pick() {
      if (window.showOpenFilePicker) {
        try {
          const [h] = await window.showOpenFilePicker({ types: [{ description: "PDF-Plan", accept: { "application/pdf": [".pdf"] } }] });
          return openHandle(h);
        } catch (e) { if (e.name === "AbortError") return; }
      }
      $("planInput").click();
    }

    async function openHandle(h, askPermission = false) {
      try {
        if (askPermission && h.requestPermission && (await h.requestPermission({ mode: "read" })) !== "granted") return;
        fileHandle = h;
        await load(await h.getFile());
        handleDb.set(h, "plan." + getContextKey());
      } catch (e) {
        info(`Der Plan konnte nicht geöffnet werden.<br><small>${esc(e.message)}</small>`, "error");
      }
    }

    async function load(file, page = 1) {
      if (!/\.pdf$/i.test(file.name)) { info(`«${esc(file.name)}» ist kein PDF.`, "error"); return; }
      $("overlay").firstElementChild.textContent = "Plan wird geladen …";
      $("overlay").hidden = false;
      await new Promise((r) => setTimeout(r, 30));
      try {
        fileBlob = file;
        const data = new Uint8Array(await file.arrayBuffer());
        // isEvalSupported: false schliesst CVE-2024-4367 (Code-Ausfuehrung ueber praeparierte Schriften)
        pdfDoc = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
        Object.assign(plan, { name: file.name, size: file.size, pageCount: pdfDoc.numPages });
        await renderPage(page);
      } catch (e) {
        info(`Das PDF konnte nicht gelesen werden.<br><small>${esc(e.message)}</small>`, "error");
      } finally {
        $("overlay").hidden = true;
        $("overlay").firstElementChild.textContent = "Datei wird gelesen …";
      }
    }

    async function renderPage(n) {
      const page = await pdfDoc.getPage(n);
      const vp1 = page.getViewport({ scale: 1 });
      const scale = MAX_PX / Math.max(vp1.width, vp1.height);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      // pdf.js wartet beim Zeichnen auf requestAnimationFrame. In einem verdeckten Fenster feuert das
      // nie -> Laden haengt. Waehrend des Zeichnens daher mit Zeitgeber als Rueckfall.
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = (cb) => {
        let done = false;
        const once = (t) => { if (!done) { done = true; cb(t); } };
        setTimeout(() => once(performance.now()), 50);
        return raf.call(window, once);
      };
      try {
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, background: "rgba(0,0,0,0)" }).promise;
      } finally {
        window.requestAnimationFrame = raf;
      }

      // Beschriftungen mit Position (fuer «Leuchte im Plan finden») und Massstab aus dem Plankopf
      const text = await page.getTextContent();
      const labels = new Map();
      let nominal = null;
      for (const it of text.items) {
        const s = (it.str || "").trim();
        if (!s) continue;
        const [u, v] = vp1.convertToViewportPoint(it.transform[4] + (it.width || 0) / 2, it.transform[5] + (it.height || 0) / 2);
        if (!labels.has(s)) labels.set(s, [u, v]);
        const m = s.match(/^1\s*:\s*(\d{2,5})$/);
        if (m && !nominal) nominal = Number(m[1]);
      }

      if (plan.layer) { plan.layer.remove(); plan.layer = null; }
      Object.assign(plan, { page: n, wPt: vp1.width, hPt: vp1.height, canvas, labels, nominalScale: nominal });
      const saved = store.get(storeKey(), null);
      if (saved) {
        plan.a = cx(saved.a[0], saved.a[1]);
        plan.b = cx(saved.b[0], saved.b[1]);
        plan.aligned = true;
      } else {
        placeRough(Number($("planScale").value) || nominal || 500);
        plan.aligned = false;
      }
      if (nominal) $("planScale").value = nominal;
      ui.visible = true;
      showLayer();
      render();
      if (!plan.aligned) startAlign();
    }

    /** Grobe Lage: Planmitte in der Kartenmitte, nach Norden, mit Nennmassstab. */
    function placeRough(scale) {
      const map = getMap();
      plan.a = cx(scale * PT_M, 0);
      const c = lv95Of(map.getCenter());
      plan.b = sub(c, mul(plan.a, cx(plan.wPt / 2, -plan.hPt / 2)));
    }

    // ---------- Ausrichten und Kontrollpunkt ----------
    const TEXT = {
      align: [
        "Ausrichten 1/4: Punkt A <b>im Plan</b> anklicken, z. B. eine Gebäudeecke.",
        "Ausrichten 2/4: Denselben Punkt A <b>auf der Karte</b> anklicken. Tipp: Hintergrund «Vermessung».",
        "Ausrichten 3/4: Punkt B <b>im Plan</b> anklicken, möglichst weit weg von A.",
        "Ausrichten 4/4: Denselben Punkt B <b>auf der Karte</b> anklicken.",
      ],
      check: [
        "Kontrolle 1/2: Einen weiteren Punkt <b>im Plan</b> anklicken.",
        "Kontrolle 2/2: Denselben Punkt <b>auf der Karte</b> anklicken.",
      ],
    };
    let opacityBefore = null;

    function startAlign() { begin("align"); }
    function startCheck() { if (plan.aligned) begin("check"); }

    function begin(kind) {
      const map = getMap();
      if (!plan.canvas || !map) return;
      step = { kind, phase: 0, picks: [] };
      opacityBefore = opacityBefore == null ? ui.opacity : opacityBefore;
      if (!pickLayer) pickLayer = L.layerGroup().addTo(map);
      pickLayer.clearLayers();
      ui.visible = true;
      showLayer();
      update();
    }

    function cancel() {
      if (!step) return false;
      step = null;
      if (pickLayer) pickLayer.clearLayers();
      if (opacityBefore != null) { ui.opacity = opacityBefore; opacityBefore = null; }
      showLayer();
      update();
      return true;
    }

    function onMapClick(ll) {
      if (!step) return false;
      const onPlan = step.phase % 2 === 0;
      const label = String.fromCharCode(65 + Math.floor(step.phase / 2));
      if (onPlan) step.picks.push({ w: (([u, v]) => cx(u, -v))(fromLatLng(ll)) });
      else step.picks[step.picks.length - 1].z = lv95Of(ll);
      pickLayer.addLayer(L.marker(ll, {
        interactive: false,
        icon: L.divIcon({ className: "", html: `<div class="pick ${onPlan ? "pplan" : "pmap"}">${step.kind === "check" ? "K" : label}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
      }));
      step.phase++;
      const total = step.kind === "align" ? 4 : 2;
      if (step.phase < total) { update(); return true; }
      step.kind === "align" ? finishAlign() : finishCheck();
      return true;
    }

    function finishAlign() {
      const [A, B] = step.picks;
      const dw = sub(B.w, A.w), dz = sub(B.z, A.z);
      if (abs(dw) * (plan.a ? abs(plan.a) : 1) < 5 || abs(dz) < 5) {
        info("Die Punkte A und B liegen zu nahe beieinander. Bitte zwei weit entfernte Punkte wählen.", "error");
        begin("align");
        return;
      }
      plan.a = div(dz, dw);
      plan.b = sub(A.z, mul(plan.a, A.w));
      plan.aligned = true;
      store.set(storeKey(), { a: [plan.a.re, plan.a.im], b: [plan.b.re, plan.b.im] });
      const scale = abs(plan.a) / PT_M;
      const rot = (Math.atan2(plan.a.im, plan.a.re) * 180) / Math.PI;
      step = null;
      pickLayer.clearLayers();
      if (opacityBefore != null) { ui.opacity = opacityBefore; opacityBefore = null; }
      showLayer();
      const nominal = plan.nominalScale ? ` (laut Plan 1:${plan.nominalScale})` : "";
      const off = plan.nominalScale && Math.abs(scale / plan.nominalScale - 1) > 0.02;
      info(`Ausgerichtet: Massstab 1:${Math.round(scale)}${nominal}, Drehung ${rot.toFixed(1)}°.` +
        (off ? " <b>Der Massstab weicht deutlich vom Plan ab – Passpunkte prüfen.</b>" : " Mit «Kontrollpunkt» lässt sich die Genauigkeit prüfen."), off ? "warn" : "ok");
      update();
      if (onAligned) onAligned();
    }

    function finishCheck() {
      const P = step.picks[0];
      const predicted = add(mul(plan.a, P.w), plan.b);
      const dev = abs(sub(predicted, P.z));
      step = null;
      if (opacityBefore != null) { ui.opacity = opacityBefore; opacityBefore = null; }
      showLayer();
      const kind = dev <= 0.5 ? "ok" : dev <= 2 ? "warn" : "error";
      info(`Kontrollpunkt: Abweichung <b>${dev.toFixed(2)} m</b>.` +
        (dev > 2 ? " Der Plan passt schlecht – neu ausrichten, mit Punkten weiter auseinander." : ""), kind);
      setTimeout(() => pickLayer && pickLayer.clearLayers(), 4000);
      update();
    }

    // ---------- Leuchte im Plan finden ----------
    function labelLatLng(names) {
      if (!plan.aligned) return null;
      for (const n of names) {
        const p = n && plan.labels.get(String(n).trim());
        if (p) return toLatLng(p[0], p[1]);
      }
      return null;
    }

    // ---------- Oberflaeche ----------
    let lastInfo = "";
    function info(html, kind = "") { lastInfo = html ? `<div class="msg ${kind}">${html}</div>` : ""; render(); }

    function update() {
      const el = $("planBanner");
      if (step) {
        const phases = TEXT[step.kind];
        const onPlan = step.phase % 2 === 0;
        ui.opacity = onPlan ? 90 : 35; // im Plan klicken: Plan deutlich; auf der Karte: Plan schwach
        applyStyle();
        el.innerHTML = `${phases[step.phase]} · Esc = abbrechen`;
        el.hidden = false;
      } else {
        el.hidden = true;
      }
      const map = getMap();
      if (map) map.getContainer().classList.toggle("picking", !!step);
      render();
    }

    function render() {
      const has = !!plan.canvas;
      $("planCtl").hidden = !has;
      $("planInfo").innerHTML = has
        ? `<b>${esc(plan.name)}</b>${plan.pageCount > 1 ? ` · Seite ${plan.page} von ${plan.pageCount}` : ""}<br>` +
          (plan.aligned ? "ausgerichtet" : "<span class='warn-t'>noch nicht ausgerichtet</span>") +
          (plan.labels.size ? ` · ${plan.labels.size} Texte im Plan` : "")
        : "Kein Plan geladen.";
      $("planMsg").innerHTML = lastInfo;
      $("planPage").hidden = !(has && plan.pageCount > 1);
      if (has && plan.pageCount > 1) {
        $("planPage").innerHTML = Array.from({ length: plan.pageCount }, (_, i) =>
          `<option value="${i + 1}" ${i + 1 === plan.page ? "selected" : ""}>Seite ${i + 1}</option>`).join("");
      }
      $("btnPlanAlign").hidden = !has;
      $("btnPlanAlign").textContent = plan.aligned ? "Neu ausrichten" : "Ausrichten";
      $("btnPlanCheck").hidden = !(has && plan.aligned);
      $("btnPlanRemove").hidden = !has;
      $("planScaleRow").hidden = !has || plan.aligned;
      $("planShow").checked = ui.visible;
      $("planOpacity").value = ui.opacity;
      $("planWhite").checked = ui.white;
    }

    function remove() {
      cancel();
      if (plan.layer) { plan.layer.remove(); plan.layer = null; }
      Object.assign(plan, { name: "", canvas: null, labels: new Map(), aligned: false, a: null, b: null });
      pdfDoc = null; fileHandle = null;
      handleDb.set(null, "plan." + getContextKey());
      info("");
    }

    /** Beim Oeffnen einer Excel-Datei: zuletzt dazu verwendeten Plan anbieten. */
    async function offerRecent() {
      const h = await handleDb.get("plan." + getContextKey());
      const btn = $("btnPlanRecent");
      btn.hidden = !h || !!plan.canvas;
      if (h) { btn.textContent = `Plan «${h.name}» wieder laden`; btn.onclick = () => openHandle(h, true); }
    }

    function bind() {
      $("btnPlanLoad").addEventListener("click", () => pick());
      $("planInput").addEventListener("change", (e) => {
        const f = e.target.files[0];
        e.target.value = "";
        if (f) { fileHandle = null; load(f); }
      });
      $("btnPlanAlign").addEventListener("click", () => {
        if (!plan.aligned) placeRough(Number($("planScale").value) || 500);
        startAlign();
      });
      $("btnPlanCheck").addEventListener("click", () => startCheck());
      $("btnPlanRemove").addEventListener("click", () => remove());
      $("planPage").addEventListener("change", (e) => renderPage(Number(e.target.value)));
      $("planScale").addEventListener("change", () => {
        if (plan.canvas && !plan.aligned) { placeRough(Number($("planScale").value) || 500); showLayer(); }
      });
      $("planShow").addEventListener("change", (e) => { ui.visible = e.target.checked; showLayer(); });
      $("planOpacity").addEventListener("input", (e) => { ui.opacity = Number(e.target.value); applyStyle(); });
      $("planWhite").addEventListener("change", (e) => { ui.white = e.target.checked; applyStyle(); });
    }

    bind();
    render();
    return {
      onMapClick, cancel, labelLatLng, offerRecent,
      planToLatLng: (u, v) => toLatLng(u, v), latLngToPlan: (ll) => fromLatLng(ll),
      get busy() { return !!step; },
      get aligned() { return plan.aligned; },
      get loaded() { return !!plan.canvas; },
      refresh: showLayer,
    };
  }

  window.LumGisPlan = { create };
})();
