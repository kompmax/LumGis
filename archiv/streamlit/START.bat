@echo off
title Leuchten GIS Dashboard
echo ============================================
echo   Leuchten GIS Dashboard v4.2
echo ============================================
echo.
echo HINWEIS: Fuer die taegliche Arbeit LumGis.html verwenden (Doppelklick).
echo Dieses Python-Tool dient nur noch als Referenz fuer Pruefsummen-Tests.
echo.

:: Pruefe ob Python vorhanden ist
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo FEHLER: Python wurde nicht gefunden!
    echo Bitte installiere Python von https://www.python.org
    pause
    exit /b 1
)

:: Installiere fehlende Pakete automatisch
echo Pruefe Abhaengigkeiten...
pip install streamlit pyproj openpyxl pandas python-calamine --quiet

echo.
echo Starte App im Browser...
echo (Fenster nicht schliessen solange die App laeuft)
echo.
echo Zum Beenden: Strg+C druecken oder dieses Fenster schliessen.
echo.

:: Starte Streamlit
streamlit run app.py --server.headless false --browser.gatherUsageStats false

pause
