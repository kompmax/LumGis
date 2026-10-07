// Pruefbericht einer Excel-Datei mit dem JS-Kern berechnen (gleicher Code wie im Browser).
// Aufruf: node web/tools/report_cli.js <datei.xlsx> [--details]
const fs = require("fs");
const path = require("path");
const XLSX = require(path.join(__dirname, "..", "vendor", "xlsx.mini.min.js"));
const proj4 = require(path.join(__dirname, "..", "vendor", "proj4.js"));
const core = require(path.join(__dirname, "..", "src", "core.js"));

(async () => {
  const file = process.argv[2];
  try {
    const model = core.parseWorkbook(XLSX, new Uint8Array(fs.readFileSync(file)), proj4);
    const report = await core.buildReport(model);
    if (!process.argv.includes("--details")) delete report.details;
    report.sample = model.rows.slice(0, 3).map((r) => ({ excelRow: r.excelRow, lat: r.lat, lon: r.lon }));
    process.stdout.write(JSON.stringify(report));
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: e.message }));
  }
})();
