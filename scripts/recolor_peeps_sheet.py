"""Recolore a VESTIMENTA de cada peep do sheet, preservando traço e rosto.

Como funciona
-------------
A arte é tinta sobre papel: fundo transparente, traço escuro, miolos claros. Cada
miolo cercado de traço é uma região fechada, e é o próprio desenho que separa as
partes: a linha do colarinho isola o rosto, a bainha da manga isola o antebraço nu.
Manga comprida sai junto com o tronco (mesma região); manga curta, não.

A pintura respeita o antialiasing porque trata o pixel como cor DEBAIXO da tinta:

    novo_rgb = cor * (luminância / 255)

No miolo do papel a luminância é ~255 e sai a cor pura; na borda serrilhada ela cai
e a cor escurece junto com o traço; no traço cheio sai quase preto. Nenhum halo.

Para que serve
--------------
O hero da LP no projeto de design da maisa (claude.ai/design, "Landing Maisa.dc.html")
tem uma faixa de multidão animada por `crowd-canvas.js`, que fatia UM sprite sheet
(atributos rows="15" cols="7" — 105 células de 240x324).

O sheet original é o Open Peeps DESENHADO À MÃO, do CodePen do zadvorsky — NÃO é o
pacote "Flat Assets" vetorial. Duas consequências que custaram tempo a descobrir:
a cor não sai trocando `fill` de SVG (não há SVG), e não vale gerar o sheet a partir
do pacote flat, porque isso mudaria o estilo do traço e não só a cor.

    original preto e branco:
    https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/open-peeps-sheet.png
    (também preservado no projeto de design em assets/open-peeps-sheet-bw.png)

Onde ajustar a cor: as listas PAPEL / ESCUROS e as ordens ORDEM_PAPEL / ORDEM_ESCURO.
Para mudar UM boneco específico, ache o índice da célula com `contato` e trate esse
índice à parte dentro de cores_da_celula().

Depende de numpy, scipy e Pillow — não são dependências do app, então use um venv:
    python3 -m venv .venv && .venv/bin/pip install numpy scipy pillow

Uso
---
    .venv/bin/python recolor_peeps_sheet.py score                   # ranqueia as 105 células
    .venv/bin/python recolor_peeps_sheet.py contato <inicio> <qtd>  # prova visual, 3 faixas
    .venv/bin/python recolor_peeps_sheet.py build                   # gera o sheet novo

Espera o sheet original em ./harness/sheet-original.png e escreve ao lado dele.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SHEET = Path("harness/sheet-original.png")
ROWS, COLS = 15, 7
PAPER_LUM = 200      # só papel bem claro conta como região (deixa o serrilhado fora)
OPAQUE = 128
CREME = (247, 242, 233)

# ——— regras de recorte da vestimenta (fracões da altura do desenho na célula) ———
NECK = 0.42          # centro da região tem de estar abaixo disto
TETO = 0.28          # e a região não pode subir acima disto (senão invadiu a cabeça)
AREA_MIN = 500       # px: menos que isso é detalhe, não roupa
REL_MIN = 0.22       # mantém regiões com >= 22% da maior (listras, roupa em dois tons)


def load():
    a = np.asarray(Image.open(SHEET).convert("RGBA"))
    return a, a[..., 3], a[..., :3].astype(np.float64).mean(axis=2)


def cell_box(i, w, h):
    cw, ch = w // ROWS, h // COLS
    return (i % ROWS) * cw, (i // ROWS) * ch, cw, ch


def garment_mask(al, lm):
    """Máscara da vestimenta de UMA célula. Devolve (mask, diagnóstico)."""
    opaque = al > OPAQUE
    if not opaque.any():
        return None, {"motivo": "célula vazia"}
    paper = opaque & (lm >= PAPER_LUM)
    linhas = np.where(opaque.any(axis=1))[0]
    top, bot = int(linhas[0]), int(linhas[-1])
    dh = max(1, bot - top)
    y_neck = top + NECK * dh
    y_teto = top + TETO * dh

    lab, n = ndimage.label(paper)
    if n == 0:
        return None, {"motivo": "sem região de papel (roupa é traço cheio)"}

    objs = ndimage.find_objects(lab)
    cands = []
    for k in range(n):
        sl = objs[k]
        if sl is None:
            continue
        ys, xs = sl
        area = int((lab[sl] == k + 1).sum())
        cy = (ys.start + ys.stop) / 2
        if cy > y_neck and ys.start >= y_teto and area >= 250:
            cands.append({"id": k + 1, "area": area,
                          "y0": ys.start, "y1": ys.stop, "x0": xs.start, "x1": xs.stop})

    if not cands:
        return None, {"motivo": "nenhuma região abaixo do colarinho (roupa é traço cheio)"}

    grandes = [c for c in cands if c["area"] >= AREA_MIN]
    if not grandes:
        return None, {"motivo": "só detalhes abaixo do colarinho, nenhuma peça"}
    maior = max(c["area"] for c in grandes)
    keep = [c["id"] for c in grandes if c["area"] >= REL_MIN * maior]

    #  Painéis internos da mesma peça. Um moletom tem a linha do bolso, um casaco tem
    #  a costura da barra: elas fecham um miolo separado, pequeno demais para passar no
    #  REL_MIN, e ele ficava branco no meio da roupa colorida. Recupera quem está DENTRO
    #  da caixa da vestimenta e centrado nela — braço nu e caneca ficam de fora porque
    #  vivem na lateral.
    dentro = [c for c in cands if c["id"] in keep]
    gx0 = min(c["x0"] for c in dentro); gx1 = max(c["x1"] for c in dentro)
    gy0 = min(c["y0"] for c in dentro); gy1 = max(c["y1"] for c in dentro)
    meio0, meio1 = gx0 + 0.20 * (gx1 - gx0), gx1 - 0.20 * (gx1 - gx0)
    for c in cands:
        if c["id"] in keep or c["area"] < 250:
            continue
        cx = (c["x0"] + c["x1"]) / 2
        if (c["x0"] >= gx0 - 4 and c["x1"] <= gx1 + 4
                and c["y0"] >= gy0 - 4 and c["y1"] <= gy1 + 4
                and meio0 <= cx <= meio1):
            keep.append(c["id"])

    mask = np.isin(lab, keep)

    # Alarga 2px para cobrir o serrilhado, mas nunca invade outra região de papel
    # (isso é o que protege o rosto e o braço nu do outro lado da linha).
    outra = paper & ~mask
    mask2 = ndimage.binary_dilation(mask, iterations=2) & ~outra & opaque

    return mask2, {
        "area": int(mask.sum()),
        "area_dil": int(mask2.sum()),
        "regioes": len(keep),
        "cobertura": mask.sum() / max(1, opaque.sum()),
    }


#  ——— segundo passe: a roupa desenhada como PRETO CHEIO ———
#  Boa parte das vestimentas desta arte não é miolo branco, é mancha preta sólida
#  (regatas, vestidos, blusas escuras). Nessas não há região de papel para pintar,
#  então a troca é outra: identificar a mancha e mudar o preto por um verde fundo
#  da paleta. Erodir separa mancha de traço — traço é fino e desaparece na erosão,
#  mancha sobrevive; depois dilata de volta para recuperar a borda exata.
INK_LUM = 90
ERODE = 6
AREA_INK_MIN = 900


def ink_garment_mask(al, lm):
    """Máscara das manchas pretas cheias ABAIXO do colarinho."""
    opaque = al > OPAQUE
    if not opaque.any():
        return None
    linhas = np.where(opaque.any(axis=1))[0]
    top, bot = int(linhas[0]), int(linhas[-1])
    abaixo = np.zeros_like(opaque)
    abaixo[int(top + NECK * max(1, bot - top)):, :] = True

    tinta = opaque & (lm < INK_LUM) & abaixo
    nucleo = ndimage.binary_erosion(tinta, iterations=ERODE)
    if not nucleo.any():
        return None
    mancha = ndimage.binary_dilation(nucleo, iterations=ERODE + 1) & tinta

    lab, n = ndimage.label(mancha)
    if n == 0:
        return None
    keep = [k + 1 for k in range(n) if (lab == k + 1).sum() >= AREA_INK_MIN]
    if not keep:
        return None
    return np.isin(lab, keep)


def aplica(rgb_cell, lm_cell, mask, cor):
    """Pinta a cor DEBAIXO da tinta: cor * (luminância/255)."""
    out = rgb_cell.copy()
    f = (lm_cell[mask] / 255.0)[:, None]
    out[mask] = (np.array(cor, dtype=np.float64) * f).round().astype(np.uint8)
    return out


def aplica_chapado(rgb_cell, mask, cor):
    """Troca a mancha preta pela cor cheia. O serrilhado da mancha está no ALPHA,
    não na luminância, então aqui não se multiplica por nada — seria preto de novo."""
    out = rgb_cell.copy()
    out[mask] = np.array(cor, dtype=np.uint8)
    return out


def sobre_creme(rgba):
    """Compõe sobre o creme da página — é assim que o usuário vê."""
    a = rgba[..., 3:4].astype(np.float64) / 255.0
    base = np.array(CREME, dtype=np.float64)
    return (rgba[..., :3] * a + base * (1 - a)).round().astype(np.uint8)


#  ——— paleta ———
#  Nada de creme-100 (#F7F2E9) nem creme-200: são o fundo da página e do bloco, a
#  roupa desapareceria. Verde puxa a maioria (é a primária), âmbar entra como acento
#  e branco fica para dar respiro — multidão inteira colorida vira festa junina.
PAPEL = [
    ("green-600", (31, 103, 73)),
    ("green-500", (46, 128, 93)),
    ("green-300", (124, 187, 156)),
    ("green-200", (173, 213, 192)),
    ("ochre-400", (224, 154, 52)),
    ("ochre-300", (235, 178, 94)),
    ("ochre-200", (243, 206, 147)),
    ("white", (255, 255, 255)),
]
#  Pesos por sete: 3 verde, 2 âmbar, 2 claro. A primeira versão foi 4-2-1 e a faixa
#  saiu verde demais — o passe da mancha preta também pinta de verde, então o verde
#  entra duas vezes e é preciso descontar aqui.
ORDEM_PAPEL = [0, 4, 7, 2, 5, 6, 1, 4, 3, 7, 0, 5, 2, 6, 4, 1, 7, 3, 5, 0, 6]
TESTE = (255, 0, 170)


#  Escuros da paleta para as manchas que eram preto cheio. Sem ochre-700: em mancha
#  grande ele lê como marrom barrento, não como âmbar. ink-800 é o quase-preto quente
#  do DS — segura alguns peeps escuros para a faixa não perder contraste.
ESCUROS = [("green-800", (18, 61, 44)), ("green-900", (12, 42, 30)),
           ("green-700", (23, 81, 58)), ("ink-800", (38, 35, 32))]
#  ink-800 entra em 1 de cada 3: preto quente segura o contraste da faixa, que sem
#  ele fica toda em meio-tom e perde a pontuação visual que o preto original dava.
ORDEM_ESCURO = [0, 3, 1, 2, 3, 0, 1, 3, 2, 0, 3, 1, 0, 3, 2, 1, 3, 0, 2, 3, 1]


def cores_da_celula(i):
    """Cor de vestimenta e cor de mancha desta célula.

    As duas ordens têm comprimento 21, primo com 15 (a largura da grade), então
    vizinhos na horizontal e na vertical nunca caem na mesma cor — a multidão não
    forma listra nem xadrez de cor por acidente."""
    return (PAPEL[ORDEM_PAPEL[i % len(ORDEM_PAPEL)]][1],
            ESCUROS[ORDEM_ESCURO[i % len(ORDEM_ESCURO)]][1])


def recolore_celula(cel, lm, cor_papel, cor_mancha):
    """Aplica os dois passes numa célula RGBA e devolve a célula nova."""
    novo = cel.copy()
    rgb = novo[..., :3]
    mask = garment_mask(cel[..., 3], lm)[0]
    if mask is not None:
        rgb = aplica(rgb, lm, mask, cor_papel)
    mancha = ink_garment_mask(cel[..., 3], lm)
    if mancha is not None and cor_mancha is not None:
        rgb = aplica_chapado(rgb, mancha, cor_mancha)
    novo[..., :3] = rgb
    return novo, mask, mancha


def contato(inicio, qtd):
    a, alpha, lum = load()
    H, W = alpha.shape
    cw, ch = W // ROWS, H // COLS
    esc = 2
    canvas = Image.new("RGB", (qtd * cw // esc, 3 * ch // esc), CREME)
    linhas = []
    for j, i in enumerate(range(inicio, inicio + qtd)):
        x, y, _, _ = cell_box(i, W, H)
        cel = a[y:y + ch, x:x + cw]
        lm = lum[y:y + ch, x:x + cw]

        canvas.paste(Image.fromarray(sobre_creme(cel)).resize((cw // esc, ch // esc)),
                     (j * cw // esc, 0))

        # faixa 2: as duas máscaras em cores de teste, para conferir o RECORTE
        mask, _ = garment_mask(cel[..., 3], lm)
        mancha = ink_garment_mask(cel[..., 3], lm)
        prova = cel.copy()
        if mask is not None:
            prova[..., :3] = aplica(prova[..., :3], lm, mask, TESTE)
        if mancha is not None:
            prova[..., :3] = aplica_chapado(prova[..., :3], mancha, (0, 160, 255))
        canvas.paste(Image.fromarray(sobre_creme(prova)).resize((cw // esc, ch // esc)),
                     (j * cw // esc, ch // esc))

        # faixa 3: paleta maisa de verdade
        novo, _, _ = recolore_celula(cel, lm, *cores_da_celula(i))
        canvas.paste(Image.fromarray(sobre_creme(novo)).resize((cw // esc, ch // esc)),
                     (j * cw // esc, 2 * ch // esc))

        linhas.append(f"  {i:>3}: papel {'-' if mask is None else mask.sum():>6}  "
                      f"mancha {'-' if mancha is None else mancha.sum():>6}")
    out = Path(f"harness/recolor-{inicio}-{qtd}.png")
    canvas.save(out)
    print(f"-> {out}\n   1 original · 2 recorte (magenta = miolo de papel, azul = mancha preta) "
          f"· 3 paleta maisa")
    print("\n".join(linhas))


def score():
    a, alpha, lum = load()
    H, W = alpha.shape
    cw, ch = W // ROWS, H // COLS
    bons, ruins = [], []
    for i in range(ROWS * COLS):
        x, y, _, _ = cell_box(i, W, H)
        al, lm = alpha[y:y + ch, x:x + cw], lum[y:y + ch, x:x + cw]
        mask, d = garment_mask(al, lm)
        (bons if mask is not None else ruins).append((i, d))
    bons.sort(key=lambda t: -t[1]["cobertura"])
    print(f"{len(bons)} células com vestimenta identificada, {len(ruins)} sem.\n")
    print("melhores (cobertura = fração do peep que fica colorida):")
    for i, d in bons[:24]:
        print(f"  {i:>3}  cobertura {d['cobertura']:.3f}  área {d['area']:>6}  regiões {d['regioes']}")
    print("\npiores das identificadas:")
    for i, d in bons[-12:]:
        print(f"  {i:>3}  cobertura {d['cobertura']:.3f}  área {d['area']:>6}  regiões {d['regioes']}")
    print("\nsem vestimenta identificada:", ", ".join(str(i) for i, _ in ruins))


def build():
    """Gera o sheet recolorido + uma prova de contato com as 105 células."""
    a, alpha, lum = load()
    H, W = alpha.shape
    cw, ch = W // ROWS, H // COLS
    saida = a.copy()

    prova_esc = 4
    prova = Image.new("RGB", (ROWS * cw // prova_esc, COLS * ch // prova_esc), CREME)
    sem_nada = []

    for i in range(ROWS * COLS):
        x, y, _, _ = cell_box(i, W, H)
        cel = a[y:y + ch, x:x + cw]
        lm = lum[y:y + ch, x:x + cw]
        novo, mask, mancha = recolore_celula(cel, lm, *cores_da_celula(i))
        saida[y:y + ch, x:x + cw] = novo
        if mask is None and mancha is None:
            sem_nada.append(i)
        prova.paste(
            Image.fromarray(sobre_creme(novo)).resize((cw // prova_esc, ch // prova_esc)),
            ((i % ROWS) * cw // prova_esc, (i // ROWS) * ch // prova_esc))

    out = Path("harness/sheet-maisa.png")
    im = Image.fromarray(saida, "RGBA")
    im.save(out, optimize=True)

    #  Quantiza para paleta indexada: a arte tem poucas dezenas de cores, então P+tRNS
    #  fica MUITO menor que RGBA e o browser decodifica igual. Em RGBA o Pillow só
    #  aceita octree (o mediancut dele ignora o canal alpha e come a transparência).
    out_q = Path("harness/sheet-maisa-q.png")
    im.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE) \
      .save(out_q, optimize=True)

    prova.save("harness/prova-105.png")
    orig_kb = SHEET.stat().st_size / 1024
    print(f"-> {out}      {out.stat().st_size / 1024:>7.0f} KB (RGBA)")
    print(f"-> {out_q}   {out_q.stat().st_size / 1024:>7.0f} KB (indexado)")
    print(f"   original  {orig_kb:>7.0f} KB")
    print(f"-> harness/prova-105.png  (as 105 células recoloridas, sobre o creme)")
    print(f"   células sem nenhuma troca: {sem_nada or 'nenhuma'}")


if __name__ == "__main__":
    modo = sys.argv[1] if len(sys.argv) > 1 else "score"
    if modo == "score":
        score()
    elif modo == "build":
        build()
    else:
        contato(int(sys.argv[2]) if len(sys.argv) > 2 else 0,
                int(sys.argv[3]) if len(sys.argv) > 3 else 10)
