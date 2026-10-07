# Eingebettete Bibliotheken

Werden von `web/build.py` unverändert in `LumGis.html` eingebettet (kein CDN zur Laufzeit).

| Datei | Bibliothek | Version | Quelle | Lizenz |
|---|---|---|---|---|
| leaflet.js, leaflet.css | Leaflet | 1.9.4 | https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/ | BSD-2-Clause |
| proj4.js | proj4js | 2.15.0 | https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.15.0/proj4.js | MIT |
| xlsx.mini.min.js | SheetJS Community Edition | 0.20.3 | https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js | Apache-2.0 |

SheetJS: Die npm-Version 0.18.5 hat bekannte Sicherheitslücken (CVE-2023-30533, CVE-2024-22363)
und wird nicht mehr aktualisiert. Neuere Versionen gibt es nur über cdn.sheetjs.com.

SHA-256:
    5c9aecfc30e4564519dbdcddcc53a418227dcc7568e619e9762ddcec7609ed47 *leaflet.js
    b570abbda963c60b4de4b4ff4b26f9326f53fb2ccf1461fdf0955ca094fb2539 *leaflet.css
    5c73f2719b0c33c8d8e709fc3d71056b39623d5f9182fb06a7b8e5173cfd8651 *proj4.js
    0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939 *xlsx.mini.min.js
