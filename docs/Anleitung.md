# LumGis Leuchtenkarte – Kurzanleitung

LumGis zeigt ein Leuchten-Inventar aus Excel auf einer Karte. Es liefert:

- **Karte** mit allen Leuchten, farbig nach einer frei wählbaren Spalte
- **Filter und Suche**, um Leuchten nach Typ, Strasse oder Nummer einzugrenzen
- **Tabelle** mit den gefilterten Leuchten und der Excel-Zeile
- **Prüfbericht** mit Hinweisen auf fehlende oder fehlerhafte Angaben

LumGis ist **nur eine Ansicht**. Die Excel-Datei wird nie verändert. Änderungen macht man direkt in Excel.

## 1. Starten

1. **LumGis.html** doppelklicken. Die Datei öffnet sich im Browser. Eine Installation ist nicht nötig.
2. Die Excel-Datei (.xlsx oder .xlsm) in das Fenster ziehen oder **Datei auswählen …** klicken.

Empfohlen ist **Chrome** (oder Edge). Die Excel-Datei wird nur im Browser gelesen und nirgends hochgeladen. Für die Hintergrundkarte braucht es eine Internetverbindung.

Beim nächsten Start steht auf der Startseite **Zuletzt geöffnet:** mit dem Dateinamen. Ein Klick darauf öffnet die Datei wieder, ohne sie suchen zu müssen. Beim ersten Mal fragt der Browser, ob LumGis die Datei lesen darf.

## 2. Was die Excel-Datei enthalten muss

| Element | Erwartung |
|---|---|
| **Arbeitsblatt** | heisst «Lp» |
| **Kategorien** | Zeile 53, meist als verbundene Zellen über mehrere Spalten |
| **Spaltenüberschriften** | Zeile 55 |
| **Daten** | ab Zeile 56, eine Leuchte pro Zeile |
| **Nummer** | mindestens eine der Spalten «Lichtpunkt-Nr.», «Lichtpunkt-Nr. neu», «Lichtpunkt-Nr. Projekt» |
| **Koordinaten** | LV95 in den Spalten «Koordinate X» und «Koordinate Y» |

LumGis sucht die Spalten über die Überschrift, nicht über den Buchstaben. Spalten dürfen also verschoben werden. Ausgeblendete Zeilen und Spalten werden ignoriert. Zeilen ohne jede Lichtpunkt-Nr. werden nicht angezeigt.

## 3. Das Fenster

- **Oben:** Dateiname, **Neu laden** und **Andere Datei …**.
- **Links:** Übersicht, Suche, **Farbe nach** und die **Filter**.
- **Mitte:** die Ansichten **Karte**, **Tabelle** und **Prüfbericht**. Darüber stehen die aktiven Filter.

Die Übersicht links oben zeigt zum Beispiel «1'600 von 2'000 Leuchten auf der Karte». Gibt es Probleme, steht darunter ein Hinweis mit Link zum **Prüfbericht**.

## 4. Schritt für Schritt

### 4.1 Karte

- Mit dem Mausrad zoomen, mit gedrückter Maustaste verschieben.
- Oben rechts zwischen **Strassenkarte**, **Landeskarte** und **Luftbild** wechseln. Die Auswahl bleibt gespeichert.
- Mit der Maus auf eine Leuchte zeigen: Nummer und Strasse erscheinen.
- Auf eine Leuchte klicken: Alle Angaben erscheinen, mit der **Excel-Zeile**.

### 4.2 Farben

1. Unter **Farbe nach** die Spalte wählen, z. B. den Leuchtentyp.
2. Die Legende unten rechts zeigt jede Farbe mit der Anzahl Leuchten.
3. Auf einen Farbkreis in der Legende klicken, um die Farbe zu ändern. Die Farbe bleibt auf diesem Computer gespeichert.

### 4.3 Filtern

1. Unter **Filter** eine Kategorie aufklappen, dann eine Spalte.
2. Die gewünschten Werte ankreuzen. Mehrere Werte in derselben Spalte gelten als «oder», Filter in verschiedenen Spalten als «und».
3. Die Karte zoomt automatisch auf die gefilterten Leuchten.

Aktive Filter stehen oben als Kärtchen. Ein Klick auf **×** entfernt einen Filter, **Alle zurücksetzen** entfernt alle.

Als Filter erscheinen nur Spalten mit 2 bis 150 verschiedenen Werten, zum Beispiel Leuchtentyp oder Leistung. Nach Nummern sucht man über die Suche.

### 4.4 Suchen

1. Im Feld **Suche (Strasse oder Lichtpunkt-Nr.)** einen Teil des Namens oder der Nummer eingeben, z. B. «Bahnhof» oder «LP-01».
2. Unter dem Feld erscheinen die Treffer. Ein Klick auf einen Treffer zoomt auf die Leuchte, öffnet ihre Angaben und lässt sie kurz aufblinken.

Gesucht wird in der Strasse und in allen drei Lichtpunkt-Nummern. Gross- und Kleinschreibung spielt keine Rolle.

### 4.5 Tabelle

Die Ansicht **Tabelle** zeigt die gefilterten Leuchten mit allen Spalten und der Excel-Zeile. Ein Doppelklick auf eine Zeile springt zur Leuchte auf der Karte. Angezeigt werden höchstens 3'000 Zeilen. Bei mehr Leuchten mit Filter oder Suche eingrenzen.

### 4.6 Nach Änderungen in Excel

1. Die Änderung in Excel machen und **speichern**.
2. In LumGis **Neu laden** klicken.

Filter und Suche bleiben dabei erhalten. Mit **Andere Datei …** wird eine andere Datei geöffnet. Dann werden Filter und Suche zurückgesetzt.

**Wichtig:** Ohne **Neu laden** zeigt LumGis weiterhin den Stand beim Öffnen.

## 5. Koordinaten – was man wissen muss

- Erwartet wird **LV95**, z. B. X = 2'683'000 und Y = 1'247'000.
- Ob Ost und Nord in X oder in Y stehen, erkennt LumGis selbst am Wertebereich. Beide Schreibweisen funktionieren.
- Zahlen mit Apostroph (2'683'000) und mit Dezimalkomma (2683000,5) werden gelesen.
- Ältere Dateien mit der Spalte «GPS Koordinaten (Breite, Länge)» funktionieren weiterhin. Dort ist auch WGS84 möglich (z. B. 47.3769, 8.5417).
- Leuchten ohne gültige Koordinaten fehlen auf der Karte, erscheinen aber in der Tabelle und im Prüfbericht.

## 6. Prüfbericht

Der **Prüfbericht** zeigt, was beim Lesen aufgefallen ist:

| Kennzahl | Bedeutung |
|---|---|
| **Leuchten gelesen** | Anzahl Zeilen mit mindestens einer Lichtpunkt-Nr. |
| **davon mit Koordinaten** | erscheinen auf der Karte |
| **ohne Koordinaten** | X und Y sind leer |
| **Koordinaten nicht lesbar** | etwas eingetragen, aber keine gültige LV95-Koordinate |
| **ausgeblendete Zeilen übersprungen** | in Excel ausgeblendete Zeilen mit Inhalt |
| **ausgeblendete Spalten ignoriert** | in Excel ausgeblendete Spalten mit Überschrift |
| **Zeilen ohne Lichtpunkt-Nr. verworfen** | Zeilen mit Inhalt, aber ohne jede Nummer |
| **doppelte Lichtpunkt-Nr.** | dieselbe Nummer in mehreren Zeilen |

Nicht lesbare Koordinaten und doppelte Nummern sind mit Excel-Zeile aufgelistet. So lassen sie sich in Excel direkt korrigieren.

Die **Prüfsumme** (z. B. `BDE1-51F2`) ist ein Fingerabdruck aller gelesenen Werte. Haben zwei Personen dieselbe Prüfsumme, arbeiten sie mit demselben Datenstand. Ändert sich auch nur eine Zelle, ändert sich die Prüfsumme.

## 7. Häufige Fragen

**Die Karte bleibt grau, oben erscheint «Hintergrundkarte nicht erreichbar (keine Internetverbindung?)».**
Die Internetverbindung prüfen. Die Leuchten werden trotzdem angezeigt, nur ohne Hintergrund.

**Meldung «Arbeitsblatt «Lp» nicht gefunden. Vorhandene Blätter: …».**
Die Datei hat kein Blatt «Lp». Ist es nur anders benannt, in Excel umbenennen.

**Meldung «Keine ID-Spalte in Zeile 55 gefunden …».**
In Zeile 55 fehlen die Überschriften «Lichtpunkt-Nr.», «Lichtpunkt-Nr. neu» und «Lichtpunkt-Nr. Projekt». Die Meldung zählt auf, welche Spalten gefunden wurden. Meist ist die Kopfzeile verrutscht.

**Meldung «Die Datei konnte nicht gelesen werden. Ist sie beschädigt oder passwortgeschützt?».**
Passwortgeschützte Dateien kann LumGis nicht lesen. Eine Kopie ohne Passwort speichern und diese öffnen.

**Eine Leuchte fehlt auf der Karte.**
Im **Prüfbericht** nachsehen, ob sie ohne oder mit nicht lesbaren Koordinaten aufgeführt ist. Sonst prüfen, ob ein Filter oder die Suche aktiv ist.

**Meldung «Diese Leuchte hat keine gültigen Koordinaten und ist nicht auf der Karte.»**
Die Leuchte wurde gefunden, hat aber keine gültigen Koordinaten. In Excel X und Y ergänzen und **Neu laden** klicken.

**Kann ich Daten exportieren?**
Nein, bewusst nicht. Listen filtert man in Excel mit dem AutoFilter. Dort bleiben Formatierung und Formeln erhalten.

## 8. Hinweise

Die Hintergrundkarten stammen vom Bundesamt für Landestopografie swisstopo. Die Lage der Leuchten ist so genau wie die Koordinaten in der Excel-Datei.

Das Tool unterstützt die Fachplanung. Es ersetzt weder die Normen und Richtlinien noch die Beurteilung durch die zuständigen Stellen.
