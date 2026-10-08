"""
Paritaetstest: archiv/streamlit/app.py (Python-Referenz) und LumGis.html (JS-Kern web/src/core.js) muessen
fuer dieselbe Datei denselben Pruefbericht und dieselbe Pruefsumme liefern.

    python tests/test_parity.py            # synthetische Testdateien
    python tests/test_parity.py a.xlsx ... # zusaetzlich eigene (lokale!) Dateien

Braucht Node.js. Excel-Dateien werden in einem Temp-Ordner erzeugt.
"""

import datetime
import json
import logging
import os
import random
import subprocess
import sys
import tempfile
import warnings

import openpyxl
from streamlit.testing.v1 import AppTest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "archiv", "streamlit"))
from test_app import APP, make_file  # noqa: E402

warnings.filterwarnings("ignore")
logging.disable(logging.WARNING)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CLI = os.path.join(ROOT, "web", "tools", "report_cli.js")
KEYS = [("rows", "rows"), ("with_coords", "withCoords"), ("no_coords", "noCoords"),
        ("invalid_coords", "invalidCoords"), ("invalid_rows", "invalidRows"),
        ("hidden_rows", "hiddenRows"), ("hidden_cols", "hiddenCols"), ("no_id", "noId"),
        ("checksum", "checksum")]


def make_edge_file(path):
    """Sonderfaelle: Datum/Zeit/Dauer, Wahrheitswerte, Fehler, Zeilenumbrueche,
    doppelte Spaltennamen, Altformat-Koordinaten, doppelte IDs."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Lp"
    ws["C10"] = "irgendwo"
    ws["B52"], ws["B53"] = "Ueber zwei Zeilen", None
    ws.merge_cells("B52:D53")          # Merge ueber Zeile 52-53: Wert steht in B52, nicht in B53
    ws["E53"] = "Daten"
    ws.merge_cells("E53:P53")
    headers = ["Lichtpunkt-Nr.", "Lichtpunkt-Nr. Projekt", "Strasse", "Datum", "Zeitpunkt", "Uhrzeit",
               "Dauer", "Ja/Nein", "Fehler", "Zahl", "Bemerkung", "Bemerkung",
               "GPS Koordinaten (Breite, Länge)", "Text\n mit Umbruch", 2024]
    for i, h in enumerate(headers):
        ws.cell(55, 2 + i, h)
    rows = [
        ("A-1", None, "Weg 1", datetime.date(2016, 2, 1), datetime.datetime(2016, 2, 1, 12, 30, 5),
         datetime.time(7, 30), 1.5, True, "#N/A", 0.1, "erste", "zweite", "47.3769, 8.5417", "a\nb", 1),
        ("A-2", None, "Weg 2", datetime.date(2020, 12, 31), datetime.datetime(2020, 1, 1, 0, 0, 0, 9000),
         datetime.time(23, 59, 59), 0.3, False, None, 5e-05, "  Leerzeichen  ", None,
         "2683000; 1247000", "x", 2.5),
        ("A-1", None, "Weg 3", None, None, None, None, None, None, 123456789.123, None, None,
         "8.5417, 47.3769", None, None),     # doppelte ID, vertauschte WGS-Werte (Breite > 90? nein -> gueltig!)
        (None, "P-9", "Weg 4", None, None, None, None, None, None, -12.0, None, None, "kaputt", None, None),
        (None, None, "ohne ID", None, None, None, None, None, None, 1, None, None, None, None, None),
    ]
    for r_i, row in enumerate(rows):
        for c_i, v in enumerate(row):
            if v is None:
                continue
            c = ws.cell(56 + r_i, 2 + c_i, v)
            if c_i == 6:
                c.number_format = "[h]:mm"
            if c_i == 8:
                c.data_type = "e"
    ws.column_dimensions["Q"].hidden = True
    ws["Q55"] = "versteckt"
    wb.save(path)


def make_dup_file(path):
    """Doppelte «Lichtpunkt-Nr. neu» (Plannummern), alte Nummern eindeutig."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Lp"
    for c, h in enumerate(["Lichtpunkt-Nr.", "Lichtpunkt-Nr. neu", "Strasse", "Koordinate X", "Koordinate Y"], start=2):
        ws.cell(55, c, h)
    for i, (old, new) in enumerate([("1001", "C-01"), ("1002", "C-02"), ("1003", "C-01"), ("1004", ""), ("1004", "C-03")]):
        ws.cell(56 + i, 2, old)
        if new:
            ws.cell(56 + i, 3, new)
        ws.cell(56 + i, 4, "Weg")
        ws.cell(56 + i, 5, 2683000 + i)
        ws.cell(56 + i, 6, 1247000 + i)
    wb.save(path)


def make_big_file(path, n=2000):
    random.seed(7)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Lp"
    ws["A15"] = "Info"
    for c, h in enumerate(["Lichtpunkt-Nr.", "Strasse", "Koordinate X", "Koordinate Y", "Leistung W",
                           "Inbetriebnahme", "Mastnummer"], start=2):
        ws.cell(55, c, h)
    ws.merge_cells("B53:D53")
    ws["B53"] = "Allgemein"
    for i in range(n):
        r = 56 + i
        e = 2683000 + random.uniform(-5000, 5000)
        nn = 1247000 + random.uniform(-5000, 5000)
        ws.cell(r, 2, f"LP-{i:05d}")
        ws.cell(r, 3, random.choice(["Bahnhofstrasse", "Seestrasse", "Rämistrasse", "Dorf (alt)"]))
        kind = i % 5
        if kind == 0:
            ws.cell(r, 4, round(e, 3)); ws.cell(r, 5, round(nn, 3))
        elif kind == 1:
            ws.cell(r, 4, f"{e:,.2f}".replace(",", "'")); ws.cell(r, 5, f"{nn:,.2f}".replace(",", "'"))
        elif kind == 2:
            ws.cell(r, 4, round(nn, 1)); ws.cell(r, 5, round(e, 1))
        elif kind == 3:
            ws.cell(r, 4, e); ws.cell(r, 5, nn)        # volle Gleitkommagenauigkeit
        ws.cell(r, 6, random.choice([30, 45.5, 70, 125, 0.1 + 0.2]))
        c = ws.cell(r, 7, datetime.date(2010 + i % 15, 1 + i % 12, 1 + i % 28))
        c.number_format = "dd.mm.yyyy"
        ws.cell(r, 8, f"{i:05d}")
    wb.save(path)


def python_report(path):
    at = AppTest.from_file(APP, default_timeout=120)
    at.session_state["filepath"] = path
    at.run()
    if "report" not in at.session_state:
        return {"error": " ".join(e.value for e in at.error)}, None
    return at.session_state["report"], at.session_state["df"]


def js_report(path):
    out = subprocess.run(["node", CLI, path, "--details"], capture_output=True, text=True, encoding="utf-8")
    if out.returncode != 0:
        return {"error": out.stderr.strip()}
    return json.loads(out.stdout)


def compare(name, path):
    py, df = python_report(path)
    js = js_report(path)
    if "error" in py or "error" in js:
        same = ("error" in py) == ("error" in js)
        print(f"{'OK  ' if same else 'FAIL'} {name}: Fehler Python={py.get('error')!r} JS={js.get('error')!r}")
        return same
    problems = []
    for pk, jk in KEYS:
        if py[pk] != js[jk]:
            problems.append(f"{pk}: Python={py[pk]} JS={js[jk]}")
    if py["dup_col"] != js["dupCol"]:
        problems.append(f"Spalte fuer Duplikate: Python={py['dup_col']} JS={js['dupCol']}")
    dup_py = [[v, rows] for v, rows in py["duplicates"]]
    if dup_py != js["duplicates"]:
        problems.append(f"duplicates: Python={dup_py} JS={js['duplicates']}")
    if py["details"] != js["details"]:
        pl, jl = py["details"].split("\n"), js["details"].split("\n")
        for i, (a, b) in enumerate(zip(pl, jl)):
            if a != b:
                problems.append(f"Details Zeile {i}:\n      Python: {a!r}\n      JS:     {b!r}")
                break
        if len(pl) != len(jl):
            problems.append(f"Details Zeilenzahl: Python={len(pl)} JS={len(jl)}")
    # Umrechnung pyproj vs. proj4js: Abweichung < 1 cm (1e-7 Grad)
    for s in js["sample"]:
        if s["lat"] is None:
            continue
        row = df[df["_excel_row"] == s["excelRow"]].iloc[0]
        if abs(row["_lat"] - s["lat"]) > 1e-7 or abs(row["_lon"] - s["lon"]) > 1e-7:
            problems.append(f"Umrechnung Zeile {s['excelRow']}: py={row['_lat']},{row['_lon']} js={s['lat']},{s['lon']}")
    status = "OK  " if not problems else "FAIL"
    print(f"{status} {name}: {py['rows']} Leuchten, Pruefsumme Python {py['checksum']} / JS {js['checksum']}")
    for p in problems:
        print("   ", p)
    return not problems


if __name__ == "__main__":
    results = []
    with tempfile.TemporaryDirectory() as tmp:
        for layout in ("a15", "a1", "leer"):
            p = os.path.join(tmp, f"lp_{layout}.xlsx")
            make_file(p, layout)
            results.append(compare(f"Layout {layout}", p))
        p = os.path.join(tmp, "lp_sonderfaelle.xlsx")
        make_edge_file(p)
        results.append(compare("Sonderfaelle", p))
        p = os.path.join(tmp, "lp_duplikate.xlsx")
        make_dup_file(p)
        results.append(compare("Duplikate in Lichtpunkt-Nr. neu", p))
        p = os.path.join(tmp, "lp_gross.xlsx")
        make_big_file(p)
        results.append(compare("2000 Leuchten", p))
        for extra in sys.argv[1:]:
            results.append(compare(os.path.basename(extra), os.path.abspath(extra)))
    print("\nALLE PARITAETSTESTS OK" if all(results) else f"\n{results.count(False)} FEHLGESCHLAGEN")
    sys.exit(0 if all(results) else 1)
