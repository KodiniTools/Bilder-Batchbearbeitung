#!/usr/bin/env python3
"""
Erzeugt die TTF-Schriften für den PDF-Export aus public/fonts.

jsPDF kann nur TrueType (glyf) einbetten, die App liefert aber WOFF2 und
Variable Fonts aus. Dieses Skript wählt für jede Familie aus
src/assets/styles/fonts.css und jeden PDF-Schnitt (normal, bold, italic,
bolditalic) die @font-face-Regel, die auch der Browser nehmen würde
(CSS-Font-Matching), instanziiert Variable Fonts beim passenden Gewicht und
schreibt das Ergebnis nach src/assets/pdf-fonts/<Familie>-<schnitt>.ttf.

Fehlt ein Kursivschnitt, entsteht keine Datei; der Export fällt dann auf den
aufrechten Schnitt zurück (siehe src/lib/features/pdf-fonts.ts).

Aufruf (einmalig nach Änderungen an public/fonts):
    python3 -m pip install fonttools brotli
    python3 scripts/build-pdf-fonts.py
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
FONTS_CSS = ROOT / 'src' / 'assets' / 'styles' / 'fonts.css'
PUBLIC_FONTS = ROOT / 'public' / 'fonts'
OUT_DIR = ROOT / 'src' / 'assets' / 'pdf-fonts'

# PDF-Schnitt -> (CSS-Gewicht, kursiv)
PDF_STYLES = {
    'normal': (400, False),
    'bold': (700, False),
    'italic': (400, True),
    'bolditalic': (700, True),
}


@dataclass
class Face:
    family: str
    file: str
    weight_min: int
    weight_max: int
    italic: bool


def parse_faces() -> list[Face]:
    faces: list[Face] = []
    for block in re.findall(r'@font-face\s*{([^}]*)}', FONTS_CSS.read_text()):
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        file = re.search(r"url\('/fonts/([^']+)'\)", block).group(1)
        weights = [int(w) for w in re.search(r'font-weight:\s*([\d ]+);', block).group(1).split()]
        italic = 'font-style: italic' in block
        faces.append(Face(family, file, weights[0], weights[-1], italic))
    return faces


def match_weight(faces: list[Face], weight: int) -> tuple[Face, int] | None:
    """CSS-Fonts-4-Gewichtsauswahl (§5.2) für die gewünschten Gewichte 400 und 700."""

    def covers(face: Face, w: int) -> bool:
        return face.weight_min <= w <= face.weight_max

    for face in faces:
        if covers(face, weight):
            return face, weight

    if weight == 400:
        # 400: zuerst 400–500 aufsteigend, dann darunter absteigend, dann darüber
        order = list(range(401, 501)) + list(range(399, 0, -1)) + list(range(501, 1001))
    else:
        # > 500: zuerst schwerer aufsteigend, dann leichter absteigend
        order = list(range(weight + 1, 1001)) + list(range(weight - 1, 0, -1))
    for w in order:
        for face in faces:
            if covers(face, w):
                return face, w
    return None


def main() -> None:
    faces = parse_faces()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob('*.ttf'):
        old.unlink()

    for family in dict.fromkeys(f.family for f in faces):
        family_faces = [f for f in faces if f.family == family]
        slug = family.replace(' ', '')
        generated: set[tuple[str, int]] = set()
        for style, (weight, italic) in PDF_STYLES.items():
            same_style = [f for f in family_faces if f.italic == italic]
            if not same_style:
                continue  # kein echter Kursivschnitt -> Fallback zur Laufzeit
            match = match_weight(same_style, weight)
            if match is None:
                continue
            face, used_weight = match
            if (face.file, used_weight) in generated:
                continue  # identisch mit einem schon erzeugten Schnitt -> Fallback
            generated.add((face.file, used_weight))

            font = TTFont(PUBLIC_FONTS / face.file)
            font.flavor = None
            if 'fvar' in font:
                font = instancer.instantiateVariableFont(font, {'wght': used_weight})
            out = OUT_DIR / f'{slug}-{style}.ttf'
            font.save(out)
            print(f'{out.name:32} <- {face.file} @ {used_weight}')


if __name__ == '__main__':
    main()
