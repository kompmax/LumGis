# LumGis Leuchtenkarte – Kurzanleitung

LumGis zeigt ein Leuchten-Inventar aus Excel auf einer Karte. Es liefert:

- **Karte** mit allen Leuchten, farbig nach einer frei wählbaren Spalte
- **Filter und Suche**, um Leuchten nach Typ, Strasse oder Nummer einzugrenzen
- **Tabelle** mit den gefilterten Leuchten und der Excel-Zeile
- **Prüfbericht** mit Hinweisen auf fehlende oder fehlerhafte Angaben
- **Erfassen**: fehlende Koordinaten setzen und falsche verschieben, als Liste speichern, auf Wunsch mit einem PDF-Plan als Vorlage

LumGis verändert die Excel-Datei nie. Änderungen und erfasste Koordinaten überträgt man selbst in Excel.

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

- **Oben:** die Modi **Ansehen** und **Erfassen**, Dateiname, **Neu laden** und **Andere Datei …**.
- **Links:** Übersicht, Suche, **Farbe nach** und die **Filter**.
- **Mitte:** die Ansichten **Karte**, **Tabelle** und **Prüfbericht**. Darüber stehen die aktiven Filter.

Die Übersicht links oben zeigt zum Beispiel «1'600 von 2'000 Leuchten auf der Karte». Gibt es Probleme, steht darunter ein Hinweis mit Link zum **Prüfbericht**.

## 4. Schritt für Schritt

### 4.1 Karte

- Mit dem Mausrad zoomen, mit gedrückter Maustaste verschieben.
- Oben rechts zwischen **Strassenkarte**, **Landeskarte**, **Vermessung** und **Luftbild** wechseln. Die Auswahl bleibt gespeichert. **Vermessung** zeigt Gebäude und Parzellen der amtlichen Vermessung.
- Mit der Maus auf eine Leuchte zeigen: Nummer und Strasse erscheinen.
- Auf eine Leuchte klicken: Alle Angaben erscheinen, mit der **Excel-Zeile**.

### 4.2 Bezeichnung

Unter **Bezeichnung nach** wählt man, welche Nummer auf der Karte, in Listen und in der Tabelle als Name der Leuchte erscheint: «Lichtpunkt-Nr. neu», «Lichtpunkt-Nr. Projekt» oder «Lichtpunkt-Nr.». Standard ist «Lichtpunkt-Nr. neu». Ist die gewählte Nummer bei einer Leuchte leer, zeigt LumGis die nächste vorhandene Nummer. Die Wahl bleibt pro Excel-Datei gespeichert und gilt auch im Modus **Erfassen**.

### 4.3 Farben

1. Unter **Farbe nach** die Spalte wählen, z. B. den Leuchtentyp.
2. Die Legende unten rechts zeigt jede Farbe mit der Anzahl Leuchten.
3. Auf einen Farbkreis in der Legende klicken, um die Farbe zu ändern. Die Farbe bleibt auf diesem Computer gespeichert.

### 4.4 Filtern

1. Unter **Filter** eine Kategorie aufklappen, dann eine Spalte.
2. Die gewünschten Werte ankreuzen. Mehrere Werte in derselben Spalte gelten als «oder», Filter in verschiedenen Spalten als «und».
3. Die Karte zoomt automatisch auf die gefilterten Leuchten.

Aktive Filter stehen oben als Kärtchen. Ein Klick auf **×** entfernt einen Filter, **Alle zurücksetzen** entfernt alle.

Als Filter erscheinen nur Spalten mit 2 bis 150 verschiedenen Werten, zum Beispiel Leuchtentyp oder Leistung. Nach Nummern sucht man über die Suche.

### 4.5 Suchen

1. Im Feld **Suche (Strasse oder Lichtpunkt-Nr.)** einen Teil des Namens oder der Nummer eingeben, z. B. «Bahnhof» oder «LP-01».
2. Unter dem Feld erscheinen die Treffer. Ein Klick auf einen Treffer zoomt auf die Leuchte, öffnet ihre Angaben und lässt sie kurz aufblinken.

Gesucht wird in der Strasse und in allen drei Lichtpunkt-Nummern. Gross- und Kleinschreibung spielt keine Rolle.

### 4.6 Tabelle

Die Ansicht **Tabelle** zeigt die gefilterten Leuchten mit allen Spalten und der Excel-Zeile. Ein Doppelklick auf eine Zeile springt zur Leuchte auf der Karte. Angezeigt werden höchstens 3'000 Zeilen. Bei mehr Leuchten mit Filter oder Suche eingrenzen.

### 4.7 Nach Änderungen in Excel

1. Die Änderung in Excel machen und **speichern**.
2. In LumGis **Neu laden** klicken.

Filter und Suche bleiben dabei erhalten. Mit **Andere Datei …** wird eine andere Datei geöffnet. Dann werden Filter und Suche zurückgesetzt.

**Wichtig:** Ohne **Neu laden** zeigt LumGis weiterhin den Stand beim Öffnen.

## 5. Koordinaten erfassen und korrigieren

Im Modus **Erfassen** setzt man Leuchten ohne gültige Koordinaten auf der Karte und verschiebt vorhandene Leuchten, deren Lage nicht stimmt. Die Excel-Datei ändert LumGis dabei nicht: Alle Änderungen landen in der Koordinatenliste, die man in Excel überträgt.

### 5.1 Positionen setzen

1. Oben auf **Erfassen** klicken. Links erscheinen alle Leuchten ohne gültige Koordinaten, in der Reihenfolge der Excel-Zeilen.
2. Rechts oben auf **Luftbild** wechseln. Darauf sind Masten meist gut zu erkennen.
3. Links eine Leuchte anklicken. Die Karte springt zu der Leuchte mit Koordinaten, die in Excel am nächsten liegt.
4. Oben auf der Karte steht «Auf die Karte klicken, um … zu setzen». An die richtige Stelle klicken. Der Punkt erscheint orange, und die nächste Leuchte ist gleich ausgewählt.

Die Liste links ist geteilt in **Noch nicht gesetzt**, **Gesetzt** und **Verschoben**. Oben steht der Stand, z. B. «12 von 40 Leuchten ohne Koordinaten gesetzt». Mit dem Feld **Suche** findet man eine Leuchte über die Lichtpunkt-Nr. oder die Strasse.

### 5.2 Vorhandene Leuchten verschieben

Leuchten, die bereits Koordinaten in Excel haben, erscheinen als weisse Punkte.

1. Den weissen Punkt anklicken. Oben steht «Neue Position für … auf der Karte anklicken».
2. An die richtige Stelle klicken. Der Punkt erscheint orange und steht links unter **Verschoben**, z. B. «verschoben um 2.35 m».

Der weisse Punkt bleibt an der alten Stelle sichtbar, damit man die Verschiebung sieht. Der Pfeil rechts neben einer verschobenen Leuchte setzt sie auf die Position aus Excel zurück.

### 5.3 Korrigieren

- Einen orangen Punkt mit der Maus an die richtige Stelle ziehen.
- Eine gesetzte Leuchte in der Liste oder auf der Karte anklicken und neu auf die Karte klicken, um sie neu zu setzen.
- **Esc** bricht das Setzen ab.
- Mit dem Pfeil rechts neben einer Leuchte wird ihre Änderung entfernt.
- **Alle Änderungen verwerfen** löscht alle gesetzten und verschobenen Positionen dieser Datei. Vorher fragt LumGis nach.

**Wichtig:** Die gesetzten und verschobenen Positionen werden nur in diesem Browser auf diesem Computer gespeichert, unter dem Namen der Excel-Datei. Sie überstehen das Schliessen des Browsers, aber nicht das Löschen der Browserdaten. Deshalb die Koordinatenliste regelmässig speichern.

### 5.4 In Excel übernehmen

1. **Koordinatenliste speichern** klicken. Im Download-Ordner liegt eine Excel-Datei, z. B. «Inventar_Koordinaten_20261007.xlsx», mit den Spalten Excel-Zeile, Lichtpunkt-Nummern, Strasse, «Koordinate X», «Koordinate Y» und «Änderung» («neu gesetzt» oder «verschoben um … m»).
2. Die Werte in die Inventar-Datei übertragen. Bei wenigen Leuchten anhand der Excel-Zeile von Hand kopieren. Bei vielen Leuchten mit XVERWEIS über die Lichtpunkt-Nr., danach die Formeln mit **Inhalte einfügen → Werte** ersetzen.
3. Die Inventar-Datei speichern und in LumGis **Neu laden** klicken.

LumGis erkennt die übernommenen Leuchten, nimmt sie aus der Liste und meldet zum Beispiel «3 Positionen sind inzwischen in Excel übernommen». Als übernommen gilt eine Leuchte, wenn in Excel genau die gesetzte Position steht (auf 5 cm). Steht dort etwas anderes, bleibt sie unter **Verschoben**, mit dem Abstand zur Position in Excel. Ob X den Ost- oder den Nordwert enthält, richtet sich nach den vorhandenen Daten in der Datei.

Solange Änderungen noch nicht in Excel stehen, erinnert der Modus **Ansehen** daran: «… geänderte Positionen noch nicht in Excel übernommen». Ein Klick auf **Erfassen** im Hinweis wechselt direkt in den Modus.

**Wichtig:** Steht bei einer gesetzten Leuchte «nicht mehr in der Datei», gibt es ihre Lichtpunkt-Nr. in der Excel-Datei nicht mehr, z. B. weil die Zeile gelöscht oder die Nummer geändert wurde. Die Position bleibt in der Liste und wird mitgespeichert. Ob sie noch gebraucht wird, in Excel prüfen.

### 5.5 Mit einem PDF-Plan als Vorlage

Ein Beleuchtungsplan als PDF lässt sich über die Karte legen. Die Leuchten setzt man dann direkt auf die Symbole im Plan. Der Plan muss nicht georeferenziert sein; LumGis richtet ihn über zwei Passpunkte aus.

**Plan laden**

1. Im Modus **Erfassen** im Bereich **Plan (PDF)** auf **Plan laden …** klicken und das PDF wählen. Bei mehreren Seiten die Seite wählen.
2. Der Plan erscheint in der Mitte der Karte, nach Norden ausgerichtet, im Massstab aus dem Plankopf (z. B. 1:500). Steht kein Massstab im Plan, unter **Massstab des Plans 1:** eintragen.

**Ausrichten mit zwei Passpunkten**

Oben auf der Karte führt eine blaue Anzeige durch die vier Klicks:

1. «Punkt A im Plan anklicken»: einen gut erkennbaren Punkt im Plan anklicken, am besten eine Gebäudeecke.
2. «Denselben Punkt A auf der Karte anklicken»: denselben Punkt auf der Hintergrundkarte anklicken. Dafür vorher auf **Vermessung** wechseln. Der Plan wird dabei automatisch blass.
3. «Punkt B im Plan anklicken»: einen zweiten Punkt wählen, möglichst weit weg von A, z. B. am anderen Ende des Plans.
4. «Denselben Punkt B auf der Karte anklicken».

LumGis berechnet daraus Lage, Massstab und Drehung und meldet zum Beispiel «Ausgerichtet: Massstab 1:501 (laut Plan 1:500), Drehung 2.3°». Weicht der Massstab deutlich vom Plankopf ab, ist ein Passpunkt falsch. Dann **Neu ausrichten**. **Esc** bricht das Ausrichten ab.

**Wichtig:** Passpunkte auf der Karte **Vermessung** setzen, nicht auf dem **Luftbild**. Auf dem Luftbild verdecken Dachvorsprünge und Schatten die echten Gebäudeecken; man liegt schnell einen Meter daneben.

**Genauigkeit prüfen**

**Kontrollpunkt** klicken, einen dritten Punkt im Plan und denselben Punkt auf der Karte anklicken. LumGis meldet die Abweichung, z. B. «Abweichung 0.35 m». Bis etwa 0.5 m ist das gut. Über 2 m passt der Plan schlecht: neu ausrichten, mit Punkten weiter auseinander.

**Arbeiten mit dem Plan**

- Unten links: **Plan** ein- oder ausblenden, mit dem Regler die Transparenz einstellen, mit **weiss** einen weissen Planhintergrund einschalten.
- Wählt man links eine Leuchte, deren Nummer im Plan beschriftet ist (z. B. «C-03.1»), springt die Karte zu dieser Beschriftung. Dafür vergleicht LumGis alle drei Nummern-Spalten mit den Texten im Plan. Dann auf das Leuchtensymbol im Plan klicken.
- Die Ausrichtung bleibt gespeichert. Lädt man denselben Plan wieder, liegt er sofort richtig. Beim nächsten Öffnen der Excel-Datei bietet LumGis **Plan «…» wieder laden** an.
- **Plan entfernen** nimmt den Plan von der Karte.

Der Plan bleibt auch im Modus **Ansehen** sichtbar, z. B. um vorhandene Leuchten mit dem Plan zu vergleichen.

## 6. Koordinaten – was man wissen muss

- Erwartet wird **LV95**, z. B. X = 2'683'000 und Y = 1'247'000.
- Ob Ost und Nord in X oder in Y stehen, erkennt LumGis selbst am Wertebereich. Beide Schreibweisen funktionieren.
- Zahlen mit Apostroph (2'683'000) und mit Dezimalkomma (2683000,5) werden gelesen.
- Ältere Dateien mit der Spalte «GPS Koordinaten (Breite, Länge)» funktionieren weiterhin. Dort ist auch WGS84 möglich (z. B. 47.3769, 8.5417).
- Leuchten ohne gültige Koordinaten fehlen auf der Karte, erscheinen aber in der Tabelle und im Prüfbericht.

## 7. Prüfbericht

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
| **doppelte Lichtpunkt-Nr. neu** | dieselbe Nummer in mehreren Zeilen. Fehlt die Spalte «Lichtpunkt-Nr. neu», prüft LumGis «Lichtpunkt-Nr.» |

Nicht lesbare Koordinaten und doppelte Nummern sind mit Excel-Zeile aufgelistet. So lassen sie sich in Excel direkt korrigieren.

Die **Prüfsumme** (z. B. `BDE1-51F2`) ist ein Fingerabdruck aller gelesenen Werte. Haben zwei Personen dieselbe Prüfsumme, arbeiten sie mit demselben Datenstand. Ändert sich auch nur eine Zelle, ändert sich die Prüfsumme.

## 8. Häufige Fragen

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

**Ich sehe meine erfassten Positionen auf einem anderen Computer nicht.**
Die Positionen sind nur im Browser gespeichert, in dem sie gesetzt wurden. Für die Weitergabe die **Koordinatenliste speichern**.

**Der Plan liegt nach dem Ausrichten schief oder verzerrt.**
Meist ist ein Passpunkt danebengeklickt oder liegen A und B zu nahe beieinander. **Neu ausrichten** mit zwei weit entfernten, eindeutigen Punkten. Bei eingescannten Plänen kann der Plan selbst verzerrt sein; dann mit **Kontrollpunkt** prüfen, ob die Genauigkeit reicht.

**Kann ich einen DWG-Plan laden?**
Nein. Den Plan in AutoCAD als PDF ausgeben und dieses laden.

**Kann ich Daten exportieren?**
Nein, bewusst nicht. Ausnahme ist die Koordinatenliste im Modus **Erfassen**. Listen filtert man in Excel mit dem AutoFilter. Dort bleiben Formatierung und Formeln erhalten.

## 9. Hinweise

Die Hintergrundkarten stammen vom Bundesamt für Landestopografie swisstopo, die Karte **Vermessung** von den Kantonen (amtliche Vermessung). Die Lage der Leuchten ist so genau wie die Koordinaten in der Excel-Datei.

Das Tool unterstützt die Fachplanung. Es ersetzt weder die Normen und Richtlinien noch die Beurteilung durch die zuständigen Stellen.
