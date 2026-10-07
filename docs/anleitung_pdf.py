# -*- coding: utf-8 -*-
"""
Luminum Anleitung Vorlage: erzeugt aus einer Markdown-Anleitung ein PDF im Luminum-Stil
(Logo oben rechts, orange Linie unter dem Titel, Segoe UI, Fusszeile mit Seitenzahl).

    python anleitung_pdf.py Anleitung.md
    python anleitung_pdf.py Anleitung.md Anleitung.pdf --fusszeile "Mein Tool 1.0 – Anleitung · Luminum GmbH"

Nur reportlab nötig (pip install reportlab). Bewusst einfacher Markdown-Umfang:
Überschriften (#, ##, ###), Absätze, Aufzählungen (-, 1.), Tabellen (|), **fett** und `Code`.
Der PDF-Titel wird aus der ersten #-Überschrift übernommen.
"""

from __future__ import annotations

import argparse
import os
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (Flowable, Image, KeepTogether, ListFlowable, ListItem, Paragraph,
                                SimpleDocTemplate, Spacer, Table, TableStyle)

HIER = os.path.dirname(os.path.abspath(__file__))

# Luminum-Farben
ORANGE = colors.HexColor("#F37021")
TEXT = colors.HexColor("#111111")
LEISE = colors.HexColor("#6B7280")
RAND = colors.HexColor("#E5E7EB")
FLAECHE = colors.HexColor("#F7F7F8")
BREITE = A4[0] - 40 * mm

# Segoe UI wie in Windows; kennt ≥, ≤, −, «» usw. (Helvetica nicht)
_SCHRIFTEN = [
    ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/segoeuib.ttf"),
    ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]


def _schrift():
    for normal, fett in _SCHRIFTEN:
        if os.path.exists(normal) and os.path.exists(fett):
            pdfmetrics.registerFont(TTFont("Anleitung", normal))
            pdfmetrics.registerFont(TTFont("Anleitung-Fett", fett))
            pdfmetrics.registerFontFamily("Anleitung", normal="Anleitung", bold="Anleitung-Fett",
                                          italic="Anleitung", boldItalic="Anleitung-Fett")
            return "Anleitung", "Anleitung-Fett"
    return "Helvetica", "Helvetica-Bold"


class _Linie(Flowable):
    def __init__(self, breite=BREITE, farbe=ORANGE, dicke=1.2):
        super().__init__()
        self.width, self.height, self.farbe, self.dicke = breite, 3, farbe, dicke

    def draw(self):
        self.canv.setStrokeColor(self.farbe)
        self.canv.setLineWidth(self.dicke)
        self.canv.line(0, 1, self.width, 1)


def _inline(text: str) -> str:
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r"<font color='#6B7280'>\1</font>", text)
    return text


def umwandeln(md_pfad: str, pdf_pfad: str, fusszeile: str = "", logo: str = "") -> str:
    normal, fett = _schrift()
    basis = ParagraphStyle("b", fontName=normal, fontSize=10, leading=14.5, textColor=TEXT, spaceAfter=5)
    st = {
        "p": basis,
        "h1": ParagraphStyle("h1", parent=basis, fontName=fett, fontSize=19, leading=24, spaceAfter=8),
        "h2": ParagraphStyle("h2", parent=basis, fontName=fett, fontSize=13.5, leading=18,
                             spaceBefore=12, spaceAfter=5),
        "h3": ParagraphStyle("h3", parent=basis, fontName=fett, fontSize=11, leading=15,
                             spaceBefore=8, spaceAfter=3),
        "zelle": ParagraphStyle("z", parent=basis, fontSize=9, leading=12, spaceAfter=0),
        "liste": ParagraphStyle("l", parent=basis, spaceAfter=2),
        "kopf": ParagraphStyle("k", parent=basis, fontName=fett, fontSize=9, leading=12, spaceAfter=0),
    }

    with open(md_pfad, encoding="utf-8") as f:
        zeilen = f.read().splitlines()
    titel = next((z[2:].strip() for z in zeilen if z.startswith("# ")), os.path.basename(md_pfad))
    fusszeile = fusszeile or f"{titel} · Luminum GmbH"

    story = []
    logo = logo or os.path.join(HIER, "luminum_logo.png")
    if os.path.exists(logo):
        bild = Image(logo, width=30 * mm, height=30 * mm * 133 / 376)
        bild.hAlign = "RIGHT"
        story.append(bild)

    absatz, liste, tabelle = [], None, []

    def absatz_schliessen():
        if absatz:
            story.append(Paragraph("<br/>".join(_inline(z) for z in absatz), st["p"]))
            absatz.clear()

    def liste_schliessen():
        nonlocal liste
        if liste:
            art, punkte = liste
            story.append(ListFlowable(
                [ListItem(Paragraph(_inline(p), st["liste"]), leftIndent=14) for p in punkte],
                bulletType="1" if art == "nummer" else "bullet", start="1" if art == "nummer" else None,
                bulletFontName=normal, bulletFontSize=9, leftIndent=14,
                bulletFormat="%s." if art == "nummer" else None,
                bulletColor=ORANGE if art == "punkt" else TEXT))
            story.append(Spacer(1, 3))
            liste = None

    def tabelle_schliessen():
        if not tabelle:
            return
        zeilen_t = [z for z in tabelle if not re.fullmatch(r"\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?", z)]
        daten = [[Paragraph(_inline(c.strip()), st["kopf"] if i == 0 else st["zelle"])
                  for c in z.strip().strip("|").split("|")]
                 for i, z in enumerate(zeilen_t)]
        n = len(daten[0])
        if n == 2:
            breiten = [BREITE * 0.36, BREITE * 0.64]
        elif n == 3:
            breiten = [BREITE * 0.25, BREITE * 0.40, BREITE * 0.35]
        else:
            breiten = [BREITE / n] * n
        t = Table(daten, colWidths=breiten, repeatRows=1)
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, 0), FLAECHE),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, LEISE),
            ("LINEBELOW", (0, 1), (-1, -1), 0.4, RAND),
            ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(KeepTogether(t) if len(daten) <= 10 else t)      # kurze Tabellen nicht trennen
        story.append(Spacer(1, 6))
        tabelle.clear()

    def alles_schliessen():
        absatz_schliessen()
        liste_schliessen()
        tabelle_schliessen()

    im_code = False
    for zeile in zeilen:
        roh = zeile.rstrip()
        if roh.strip().startswith("```"):          # Codeblöcke als graue Absätze
            alles_schliessen()
            im_code = not im_code
            continue
        if im_code:
            story.append(Paragraph(f"<font color='#6B7280'>{escape(roh)}</font>", st["zelle"]))
            continue
        if not roh.strip():
            alles_schliessen()
            continue
        if roh.startswith("|"):
            absatz_schliessen()
            liste_schliessen()
            tabelle.append(roh)
            continue
        tabelle_schliessen()
        m = re.match(r"^(#{1,3})\s+(.*)", roh)
        if m:
            alles_schliessen()
            ebene = len(m.group(1))
            story.append(Paragraph(_inline(m.group(2)), st[f"h{ebene}"]))
            if ebene == 1:
                story.append(_Linie())
                story.append(Spacer(1, 6))
            continue
        m_punkt = re.match(r"^\s*-\s+(.*)", roh)
        m_nummer = re.match(r"^\s*\d+\.\s+(.*)", roh)
        if m_punkt or m_nummer:
            absatz_schliessen()
            art = "punkt" if m_punkt else "nummer"
            if liste and liste[0] != art:
                liste_schliessen()
            if not liste:
                liste = (art, [])
            liste[1].append((m_punkt or m_nummer).group(1))
            continue
        liste_schliessen()
        absatz.append(roh.strip())
    alles_schliessen()

    # Überschriften nicht allein am Seitenende stehen lassen
    gruppiert, i = [], 0
    while i < len(story):
        el = story[i]
        if isinstance(el, Paragraph) and el.style.name in ("h2", "h3") and i + 1 < len(story):
            folgend = story[i + 1]
            # verschachteltes KeepTogether erzwingt in reportlab unnötige Seitenumbrüche
            inhalt = list(folgend._content) if isinstance(folgend, KeepTogether) else [folgend]
            gruppiert.append(KeepTogether([el] + inhalt))
            i += 2
        else:
            gruppiert.append(el)
            i += 1

    def seitenrahmen(canvas, doc):
        canvas.saveState()
        canvas.setFont(normal, 8)
        canvas.setFillColor(LEISE)
        canvas.setStrokeColor(RAND)
        canvas.line(20 * mm, 14 * mm, A4[0] - 20 * mm, 14 * mm)
        canvas.drawString(20 * mm, 10 * mm, fusszeile)
        canvas.drawRightString(A4[0] - 20 * mm, 10 * mm, f"Seite {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(pdf_pfad, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                            topMargin=16 * mm, bottomMargin=20 * mm, title=titel, author="Luminum GmbH")
    doc.build(gruppiert, onFirstPage=seitenrahmen, onLaterPages=seitenrahmen)
    return pdf_pfad


if __name__ == "__main__":
    a = argparse.ArgumentParser(description="Markdown-Anleitung als Luminum-PDF")
    a.add_argument("markdown")
    a.add_argument("pdf", nargs="?", help="Ziel (Standard: gleicher Name mit .pdf)")
    a.add_argument("--fusszeile", default="", help="Text unten links (Standard: Titel · Luminum GmbH)")
    a.add_argument("--logo", default="", help="Logo oben rechts (Standard: luminum_logo.png im Skill-Ordner)")
    x = a.parse_args()
    print(umwandeln(x.markdown, x.pdf or os.path.splitext(x.markdown)[0] + ".pdf", x.fusszeile, x.logo))
