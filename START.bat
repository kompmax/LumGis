@echo off
title Leuchten GIS Dashboard
echo ============================================
echo   Leuchten GIS Dashboard v4.0
echo ============================================
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
