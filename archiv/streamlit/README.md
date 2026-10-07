# Archiv: Streamlit-Version (bis Oktober 2026)

Die frühere Python/Streamlit-Version des Leuchten GIS Dashboards. Im Alltag ersetzt durch `LumGis.html` im Hauptordner.

Sie bleibt als **Referenz**: `tests/test_parity.py` liest dieselben Testdateien mit dieser Version und mit `LumGis.html` und prüft, dass beide dieselbe Prüfsumme liefern. Wer die Leselogik in `web/src/core.js` ändert, muss sie hier gleich ändern.

```bash
python archiv/streamlit/test_app.py     # Tests dieser Version
cd archiv/streamlit && streamlit run app.py
```
