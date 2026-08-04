#!/usr/bin/env python3
"""
gen_peeps — converte os SVGs "Standing" do Open Peeps em arte recolorível pelo
design system da maisa.

    python3 scripts/gen_peeps.py "<pasta Flat Assets/Templates/Standing>"

Só stdlib (re + xml.etree + pathlib): não precisa de venv nem de Pillow.

────────────────────────────────────────────────────────────────────────────────
POR QUE DÁ PARA RECOLORIR DE VERDADE

Os SVGs do Open Peeps são organizados por parte do corpo, com o preenchimento e
o traço separados:

    a-person/standing
      pose/standing/shirt-1          <- roupa
        🎨-Background  #FFFFFF          preenchimento
        🖍-Ink         #000000          traço
    Head
      head/Long-Curly                <- cabelo
        🎨-Background / 🖍-Ink
    face/Smile                       <- rosto (só traço)
    accessories/Glasses-4            <- óculos

Então roupa, cabelo, rosto e óculos viram classes CSS independentes em vez de um
tingimento por cima. Cada classe lê um custom property, do jeito que o DS pede
("recoloridos por currentColor"): traço em verde-900, preenchimentos em creme /
verde / âmbar. Nada de preto puro — o DS não tem cinza nem preto neutro.

O `id` de cada nó é removido: os peeps são inlinados na mesma página e ids
repetidos (`🖍-Ink` aparece em todos) colidiriam no documento.
"""

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)

#  Seleção curada: 10 peeps com variedade real de cabelo, pose, corpo e idade —
#  inclusive duas pessoas com prótese, que vêm no pack e costumam ser as
#  primeiras a serem cortadas de uma seleção "genérica".
PICK = [1, 4, 7, 10, 14, 16, 22, 23, 25, 28]

#  A COR de origem decide o papel: preto = traço, branco = preenchimento,
#  #4F66AF = tela de aparelho (aparece em 2 peeps do pack).
KIND = {"#000000": "ink", "#FFFFFF": "fill", "#4F66AF": "screen"}


def part_for(chain, own_id):
    """Parte do corpo a partir do grupo semântico. O grupo pode ser o PRÓPRIO
    elemento (ex.: <g id="face/Smile" fill="#000000">), não só um ancestral."""
    ids = chain + [own_id]
    joined = " ".join(ids).lower()
    if "accessories/" in joined:
        return "acc"
    if "facial-hair/" in joined:
        return "hair"
    if "face/" in joined:
        return "face"
    if "head/" in joined or "head" in [i.lower() for i in ids]:
        return "hair"
    return "cloth"  # pose/… e o resto é corpo/roupa


def transform(path: Path, precision: int = 1):
    tree = ET.parse(path)
    root = tree.getroot()

    for parent in root.iter():
        for child in list(parent):
            if child.tag.split("}")[-1] in ("title", "desc"):
                parent.remove(child)

    def walk(el, chain):
        own_id = el.get("id") or ""
        fill = el.get("fill")

        if fill and fill.upper() in KIND:
            kind = KIND[fill.upper()]
            role = "screen" if kind == "screen" else f"{part_for(chain, own_id)}-{kind}"
            el.set("class", f"pp-{role}")
            del el.attrib["fill"]

        el.attrib.pop("id", None)
        newchain = chain + ([own_id] if own_id else [])
        for c in list(el):
            walk(c, newchain)

    walk(root, [])

    w = int(float(root.get("width", "0").replace("px", "")))
    h = int(float(root.get("height", "0").replace("px", "")))

    inner = "".join(ET.tostring(c, encoding="unicode") for c in root)

    #  Sketch exporta coordenadas com muitas decimais num viewBox de ~200x700;
    #  1 decimal é invisível a olho nu e corta metade do arquivo.
    def shrink(m):
        s = f"{float(m.group(0)):.{precision}f}"
        # Só corta zero à direita QUANDO EXISTE vírgula decimal. Sem essa
        # guarda, "230" (de 230.0 com precisão 0) virava "23" e a arte toda
        # desmontava — coordenada terminada em zero é comum em desenho vetorial.
        if "." in s:
            s = s.rstrip("0").rstrip(".")
        return s if s not in ("", "-") else "0"

    inner = re.sub(r"-?\d+\.\d+", shrink, inner)
    inner = re.sub(r"\s+", " ", inner)
    inner = re.sub(r"> <", "><", inner)
    inner = inner.replace(f' xmlns="{NS}"', "")
    return w, h, inner.strip()


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    precision = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    out = Path(__file__).resolve().parent.parent / "src/app/(marketing)/_lib/terapeutas-v2/peeps.data.ts"

    rows = []
    total = 0
    for n in PICK:
        f = src / f"peep-standing-{n}.svg"
        if not f.exists():
            sys.exit(f"não achei {f}")
        w, h, inner = transform(f, precision)
        total += len(inner)
        rows.append(f'  {{ id: "p{n}", w: {w}, h: {h}, art: {chr(96)}{inner}{chr(96)} }},')

    body = (
        "/* GERADO por scripts/gen_peeps.py — NÃO EDITE À MÃO.\n"
        "   Arte: Open Peeps de Pablo Stanley (CC0). Recolorida pelo DS da maisa\n"
        "   via as classes pp-* (ver peeps.css). Rode o script de novo para trocar\n"
        "   a seleção — a lista está em PICK, dentro do script. */\n\n"
        "/** Um peep: dimensões originais do viewBox + o markup interno do SVG. */\n"
        "export type PeepArt = { id: string; w: number; h: number; art: string };\n\n"
        "export const PEEPS: PeepArt[] = [\n" + "\n".join(rows) + "\n];\n"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(body, encoding="utf-8")
    print(f"{len(PICK)} peeps -> {out.relative_to(out.parents[4])}")
    print(f"  markup: {total/1024:.0f} KB (precisão {precision} decimal)")


if __name__ == "__main__":
    main()
