"""
Gerador do logo do Guardião da Água (assets/logo/guardiao-logo.svg e guardiao-logo-static.svg).

As letras viram contornos (paths) da Lilita One, a mesma fonte da interface: o logo não depende de fonte
instalada nem do Google Fonts. Estilo: letras brancas grossas com extrusão 3D em degradê azul-água,
sombra chapada, til em forma de onda, gota no lugar do acento do Á, cidade sustentável ao fundo,
água com ondinhas e faixa verde com o subtítulo. Traço e paleta seguem os ícones (assets/icons/_src/core.js).

Uso (Python 3 + fontTools: `python -m pip install fonttools`):
    python assets/logo/_src/build_logo.py caminho/LilitaOne-Regular.ttf
A fonte (licença OFL) está em https://github.com/google/fonts/raw/main/ofl/lilitaone/LilitaOne-Regular.ttf

Animação (CSS dentro do SVG, funciona inline e também em <img>):
  - classe `logo-play` na raiz <svg> = toca a entrada (letras quicando, gota caindo e respingando, faixa
    desenrolando, brilho) e depois o loop sutil (ondas, gota balançando, cata-vento, brilho a cada 7 s);
  - sem `logo-play` = pose final parada; `logo-wait` = escondido (para a intro revelar depois).
  Para reiniciar a entrada num SVG inline: tirar `logo-play`, forçar reflow e pôr de novo (GameLogo.play()).
"""
import math
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FONT = TTFont(sys.argv[1])
GS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()

O = '#1a1a1a'          # contorno (mesmo dos ícones)
W, H = 1000, 612       # viewBox
DEPTH_STEPS = 11       # cópias da extrusão
STEP = (0.55, 2.1)     # deslocamento por cópia (vai para baixo e um pouco para a direita)
# Degradê da extrusão: perto da face (turquesa claro) → fundo (azul profundo)
EXTRUDE = ['#5DEBFF', '#22C4F0', '#1290E0', '#0B5CB8', '#083F8A']


def f1(n):
    s = f'{n:.1f}'
    return s[:-2] if s.endswith('.0') else s


def lerp_hex(stops, t):
    t = max(0.0, min(1.0, t)) * (len(stops) - 1)
    i = min(int(t), len(stops) - 2)
    k = t - i
    a = [int(stops[i][j:j + 2], 16) for j in (1, 3, 5)]
    b = [int(stops[i + 1][j:j + 2], 16) for j in (1, 3, 5)]
    return '#' + ''.join(f'{round(a[c] + (b[c] - a[c]) * k):02x}' for c in range(3))


def glyph_path(ch, x, baseline, s, rot=0.0, cx=None):
    """Contorno de um caractere com origem (x, baseline) e escala s; rot gira em torno de (cx, baseline)."""
    name = CMAP[ord(ch)] if len(ch) == 1 else ch
    pen = SVGPathPen(GS, ntos=f1)
    if rot:
        r = math.radians(rot)
        c, sn = math.cos(r), math.sin(r)
        px = cx if cx is not None else x
        # p' = R·(x + s·gx - px, baseline - s·gy) + (px, baseline)
        tx = c * (x - px) + px
        ty = sn * (x - px) + baseline
        t = (s * c, s * sn, s * sn, -s * c, tx, ty)
    else:
        t = (s, 0, 0, -s, x, baseline)
    GS[name].draw(TransformPen(pen, t))
    return pen.getCommands(), GS[name].width * s


def advance(ch, s):
    return GS[CMAP[ord(ch)]].width * s


# ===================================================================== layout das letras
defs = []
uid = [0]


def new_id(prefix):
    uid[0] += 1
    return f'gl-{prefix}{uid[0]}'


def layout_line(text, s, baseline, track):
    """Devolve [(id, char, x0, x1)] centralizado em W/2 (pela largura de avanço)."""
    widths = [advance(c, s) for c in text]
    total = sum(widths) + track * (len(text) - 1)
    x = (W - total) / 2
    out = []
    for c, w in zip(text, widths):
        if c != ' ':
            gid = new_id('g')
            d, _ = glyph_path(c, x, baseline, s)
            defs.append(f'<path id="{gid}" d="{d}"/>')
            out.append((gid, c, x, x + w))
        x += w + track
    return out


def letter_block(gid, cls, delay, origin='50% 100%'):
    """Letra com contorno escuro, extrusão em degradê e face branca."""
    n = DEPTH_STEPS
    parts = []
    # Contorno de toda a silhueta (face + extrusão)
    for k in range(0, n + 1, 2):
        parts.append(f'<use href="#{gid}" x="{f1(STEP[0] * k)}" y="{f1(STEP[1] * k)}" fill="{O}" stroke="{O}" stroke-width="13"/>')
    # Extrusão: do fundo para a frente
    for k in range(n, 0, -1):
        col = lerp_hex(EXTRUDE, k / n)
        parts.append(f'<use href="#{gid}" x="{f1(STEP[0] * k)}" y="{f1(STEP[1] * k)}" fill="{col}" stroke="{col}" stroke-width="2.4"/>')
    # Face
    parts.append(f'<use href="#{gid}" fill="url(#gl-face)" stroke="#0B4F9C" stroke-width="2.2"/>')
    return f'<g class="{cls}" style="--d:{delay:.2f}s;transform-origin:{origin}">' + ''.join(parts) + '</g>'


S1, S2 = 0.172, 0.205
CAP = 700
L1_TOP = 92
L1_BASE = L1_TOP + CAP * S1
L2_TOP = 334
L2_BASE = L2_TOP + CAP * S2

line1 = layout_line('GUARDIAO', S1, L1_BASE, -2)
line2 = layout_line('DA AGUA', S2, L2_BASE, -2)

# ===================================================================== til-onda do Ã
a_til = line1[6]  # G U A R D I [A] O
til_cx = (a_til[2] + a_til[3]) / 2
TS = S1 * 1.05
tb = 553  # base do glifo "tilde" na fonte
tilde_d, _ = glyph_path('tilde', 0, 0, TS)
til_w = (413 - 22) * TS
tx = til_cx - (22 * TS) - til_w / 2
ty = L1_TOP - 14 + tb * TS  # pé do til a 14 u acima da letra
tid = new_id('g')
d, _ = glyph_path('tilde', tx, ty, TS)
defs.append(f'<path id="{tid}" d="{d}"/>')


def tilde_block(gid):
    n = 6
    parts = []
    for k in range(0, n + 1, 2):
        parts.append(f'<use href="#{gid}" x="{f1(STEP[0] * k)}" y="{f1(STEP[1] * k)}" fill="{O}" stroke="{O}" stroke-width="11"/>')
    for k in range(n, 0, -1):
        col = lerp_hex(['#1F8FE0', '#0B5CB8', '#083F8A'], k / n)
        parts.append(f'<use href="#{gid}" x="{f1(STEP[0] * k)}" y="{f1(STEP[1] * k)}" fill="{col}" stroke="{col}" stroke-width="2.4"/>')
    parts.append(f'<use href="#{gid}" fill="url(#gl-wavefill)" stroke="#0B4F9C" stroke-width="2"/>')
    return ''.join(parts)


# ===================================================================== gota no lugar do acento do Á
a_acc = line2[2]  # D A [A] G U A
drop_cx = (a_acc[2] + a_acc[3]) / 2 + 12
DS = 3.3  # escala do desenho da gota (coordenadas do ícone res-water, 32 u)
drop_bottom = L2_TOP - 9
# gota do ícone: x 8..24, y 6..28 → origem no pé (16, 28)
DROP = 'M0 -22C2.8 -16.8 8 -12.4 8 -8A8 8 0 0 1 -8 -8C-8 -12.4 -2.8 -16.8 0 -22Z'
DROP_SH = 'M8 -8A8 8 0 0 1 -2.4 -0.4A6.4 6.4 0 0 0 6 -9.6Z'
DROP_HI = 'M-4.4 -8.4A4.4 4.4 0 0 1 -1.6 -12.4'

# ===================================================================== cidade ao fundo
# Prédios no estilo dos ícones: cor chapada + faixa de sombra à direita + contorno.
PAL = {
    'concrete': ('#E8EEF2', '#B8C6CF'), 'glass': ('#BFF3FF', '#8FDDF0'), 'pink': ('#FF6B9D', '#E0477C'),
    'yellow': ('#FFD700', '#E5A800'), 'green': ('#5EE08A', '#2FB463'), 'leaf': ('#2FCB5F', '#1E9A45'),
    'water': ('#3FB8FF', '#1F8FE0'), 'gray': ('#9AA7B0', '#76838C'), 'purple': ('#A855F7', '#8433D4'),
}


def building(x, top, w, color, bottom=180, win=True, cols=2, roof=None):
    m, sh = PAL[color]
    h = bottom - top
    s = [f'<rect x="{f1(x)}" y="{f1(top)}" width="{f1(w)}" height="{f1(h)}" fill="{m}"/>',
         f'<rect x="{f1(x + w * 0.72)}" y="{f1(top + 2)}" width="{f1(w * 0.28 - 2)}" height="{f1(h - 4)}" fill="{sh}"/>']
    if win:
        ww, wh = w * 0.18, 9
        gap = (w * 0.72 - cols * ww) / (cols + 1)
        y = top + 10
        while y + wh < top + 60:
            for c in range(cols):
                wx = x + gap + c * (ww + gap)
                s.append(f'<rect x="{f1(wx)}" y="{f1(y)}" width="{f1(ww)}" height="{wh}" rx="1.5" fill="#BFF3FF" stroke="{O}" stroke-width="2.5"/>')
            y += wh + 8
    s.append(f'<rect x="{f1(x)}" y="{f1(top)}" width="{f1(w)}" height="{f1(h)}" fill="none" stroke="{O}" stroke-width="4.5"/>')
    if roof == 'garden':  # telhado verde
        s.insert(0, f'<path d="M{f1(x - 3)} {f1(top)}q{f1(w * 0.2)} -14 {f1(w * 0.4)} -4q{f1(w * 0.2)} -12 {f1(w * 0.4)} -2q{f1(w * 0.2)} -8 {f1(w * 0.26)} 6Z" fill="#2FCB5F" stroke="{O}" stroke-width="4.5" stroke-linejoin="round"/>')
    if roof == 'solar':  # placas solares
        s.append(f'<path d="M{f1(x + 6)} {f1(top)}l6 -10h{f1(w - 18)}l6 10Z" fill="#1F8FE0" stroke="{O}" stroke-width="4" stroke-linejoin="round"/>')
    return ''.join(s)


def water_tower(cx, top, bottom=180):
    s = []
    for dx in (-14, 14):
        s.append(f'<path d="M{f1(cx + dx * 0.6)} {f1(top + 34)}L{f1(cx + dx)} {bottom}" stroke="{O}" stroke-width="5" stroke-linecap="round"/>')
    s.append(f'<path d="M{f1(cx - 11)} {f1(top + 56)}L{f1(cx + 11)} {f1(top + 76)}M{f1(cx + 11)} {f1(top + 56)}L{f1(cx - 11)} {f1(top + 76)}" stroke="{O}" stroke-width="3.5" stroke-linecap="round"/>')
    s.append(f'<rect x="{f1(cx - 25)}" y="{f1(top + 6)}" width="50" height="32" rx="9" fill="#3FB8FF"/>')
    s.append(f'<rect x="{f1(cx + 8)}" y="{f1(top + 8)}" width="15" height="28" rx="6" fill="#1F8FE0"/>')
    s.append(f'<path d="M{f1(cx - 17)} {f1(top + 14)}v14" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.85"/>')
    s.append(f'<rect x="{f1(cx - 25)}" y="{f1(top + 6)}" width="50" height="32" rx="9" fill="none" stroke="{O}" stroke-width="4.5"/>')
    s.append(f'<path d="M{f1(cx - 20)} {f1(top + 7)}Q{f1(cx)} {f1(top - 10)} {f1(cx + 20)} {f1(top + 7)}Z" fill="#E8EEF2" stroke="{O}" stroke-width="4.5" stroke-linejoin="round"/>')
    return ''.join(s)


def turbine(cx, hub_y, bottom=180, blade=38):
    s = [f'<path d="M{f1(cx - 3)} {f1(hub_y)}L{f1(cx - 6)} {bottom}H{f1(cx + 6)}L{f1(cx + 3)} {f1(hub_y)}Z" fill="#E8EEF2" stroke="{O}" stroke-width="4" stroke-linejoin="round"/>']
    bl = []
    for a in (0, 120, 240):
        bl.append(f'<path d="M0 0C-5 -{blade * 0.3:.1f} -4 -{blade * 0.8:.1f} 0 -{blade}C5 -{blade * 0.7:.1f} 5 -{blade * 0.3:.1f} 0 0Z" transform="rotate({a})" fill="#FFFFFF" stroke="{O}" stroke-width="3.5" stroke-linejoin="round"/>')
    s.append(f'<g transform="translate({f1(cx)} {f1(hub_y)})"><g class="gl-rotor">{"".join(bl)}</g>'
             f'<circle r="6" fill="#FFD700" stroke="{O}" stroke-width="3.5"/></g>')
    return ''.join(s)


def tree(cx, top, r=24, bottom=180):
    return (f'<rect x="{f1(cx - 5)}" y="{f1(top + r)}" width="10" height="{f1(bottom - top - r)}" fill="#B9784A" stroke="{O}" stroke-width="4"/>'
            f'<circle cx="{f1(cx)}" cy="{f1(top + r)}" r="{r}" fill="#2FCB5F"/>'
            f'<path d="M{f1(cx + r * 0.2)} {f1(top + r * 0.2)}A{r} {r} 0 0 1 {f1(cx - r * 0.5)} {f1(top + r * 1.85)}A{r} {r} 0 0 0 {f1(cx + r)} {f1(top + r)}Z" fill="#1E9A45" opacity="0.9"/>'
            f'<circle cx="{f1(cx)}" cy="{f1(top + r)}" r="{r}" fill="none" stroke="{O}" stroke-width="4.5"/>')


def lx(i, frac=0.5):
    g = line1[i]
    return g[2] + (g[3] - g[2]) * frac


city_items = [
    ('b', tree(lx(0, 0.3), 50, 20)),
    ('b', building(lx(0, 0.45), 30, 58, 'concrete', roof='garden')),
    ('b', water_tower(lx(1, 0.75), 8)),
    ('b', building(lx(2, 0.55), 2, 62, 'glass', cols=2, roof='solar')),
    ('b', building(lx(3, 0.55), 40, 52, 'pink')),
    ('b', turbine(lx(4, 0.55), 26)),
    ('b', building(lx(5, 0.35), 34, 50, 'yellow')),
    ('b', building(lx(7, 0.12), 20, 56, 'water', roof='garden')),
    ('b', tree(lx(7, 0.78), 46, 22)),
]
city = ''.join(f'<g class="gl-bld" style="--d:{0.05 + i * 0.06:.2f}s">{svg}</g>' for i, (_, svg) in enumerate(city_items))

# ===================================================================== água com ondas (atrás da linha 2)
WATER_TOP = L2_BASE - 26
WATER_BOT = L2_BASE + 60
wl, wr = line2[0][2] - 60, line2[-1][3] + 60
WAVE_P = 56


def wave_path(y, amp, x0, x1, bottom):
    d = f'M{f1(x0)} {f1(y)}'
    x = x0
    while x < x1:
        d += f'q{WAVE_P / 4} {-amp} {WAVE_P / 2} 0t{WAVE_P / 2} 0'
        x += WAVE_P
    return d + f'V{f1(bottom)}H{f1(x0)}Z'


water = (
    f'<clipPath id="gl-lake"><rect x="{f1(wl)}" y="{f1(WATER_TOP - 20)}" width="{f1(wr - wl)}" height="{f1(WATER_BOT - WATER_TOP + 20)}" rx="40"/></clipPath>'
)
defs.append(water)
water_g = (
    f'<g clip-path="url(#gl-lake)">'
    f'<rect x="{f1(wl)}" y="{f1(WATER_TOP - 20)}" width="{f1(wr - wl)}" height="{f1(WATER_BOT - WATER_TOP + 20)}" fill="#BFF3FF"/>'
    f'<path class="gl-wave gl-wave--back" d="{wave_path(WATER_TOP + 2, 9, wl - WAVE_P * 2, wr + WAVE_P, WATER_BOT + 10)}" fill="#3FB8FF"/>'
    f'<path class="gl-wave gl-wave--front" d="{wave_path(WATER_TOP + 22, 8, wl - WAVE_P * 2, wr + WAVE_P, WATER_BOT + 10)}" fill="#1F8FE0" stroke="#BFF3FF" stroke-width="3"/>'
    f'</g>'
    f'<rect x="{f1(wl)}" y="{f1(WATER_TOP - 20)}" width="{f1(wr - wl)}" height="{f1(WATER_BOT - WATER_TOP + 20)}" rx="40" fill="none" stroke="{O}" stroke-width="5"/>'
)

# ===================================================================== faixa com o subtítulo
BAN_TEXT = 'CIDADE SUSTENTÁVEL'
BS = 0.047
BW = 640
BX0, BX1 = (W - BW) / 2, (W + BW) / 2
BY = WATER_BOT - 30
BH = 64
SAG = 14  # curvatura da faixa (sorriso)


def sag(x):
    t = (x - W / 2) / (BW / 2)
    return SAG * (1 - t * t)


def sag_slope(x):
    t = (x - W / 2) / (BW / 2)
    return -2 * SAG * t / (BW / 2)


ribbon = f'M{f1(BX0)} {f1(BY)}Q{W / 2} {f1(BY + 2 * SAG)} {f1(BX1)} {f1(BY)}V{f1(BY + BH)}Q{W / 2} {f1(BY + BH + 2 * SAG)} {f1(BX0)} {f1(BY + BH)}Z'
TAIL = 74
tl = f'M{f1(BX0 + 22)} {f1(BY + 16)}H{f1(BX0 - TAIL)}l22 {BH / 2}l-22 {BH / 2}H{f1(BX0 + 22)}Z'
tr = f'M{f1(BX1 - 22)} {f1(BY + 16)}H{f1(BX1 + TAIL)}l-22 {BH / 2}l22 {BH / 2}H{f1(BX1 - 22)}Z'
fold_l = f'M{f1(BX0)} {f1(BY + BH)}L{f1(BX0 + 22)} {f1(BY + BH + 16)}V{f1(BY + BH)}Z'
fold_r = f'M{f1(BX1)} {f1(BY + BH)}L{f1(BX1 - 22)} {f1(BY + BH + 16)}V{f1(BY + BH)}Z'

bw = [advance(c, BS) for c in BAN_TEXT]
btrack = 1.5
bx = W / 2 - (sum(bw) + btrack * (len(BAN_TEXT) - 1)) / 2
b_letters = []
bi = 0
for c, w in zip(BAN_TEXT, bw):
    if c != ' ':
        cx = bx + w / 2
        base = BY + BH / 2 + CAP * BS / 2 + sag(cx)
        rot = math.degrees(math.atan(sag_slope(cx)))
        d, _ = glyph_path(c, bx, base, BS, rot=rot, cx=cx)
        b_letters.append((d, bi))
        bi += 1
    bx += w + btrack

ban_text_svg = ''.join(
    f'<g class="gl-btxt" style="--d:{1.95 + i * 0.03:.2f}s"><path d="{d}" fill="{O}" stroke="{O}" stroke-width="7" stroke-linejoin="round"/>'
    f'<path d="{d}" fill="#FFFFFF"/></g>' for d, i in b_letters)


banner = (
    f'<path d="{tl}" fill="#1E9A45" stroke="{O}" stroke-width="5" stroke-linejoin="round"/>'
    f'<path d="{tr}" fill="#1E9A45" stroke="{O}" stroke-width="5" stroke-linejoin="round"/>'
    f'<path d="{fold_l}" fill="#14703A" stroke="{O}" stroke-width="5" stroke-linejoin="round"/>'
    f'<path d="{fold_r}" fill="#14703A" stroke="{O}" stroke-width="5" stroke-linejoin="round"/>'
    f'<path d="{ribbon}" fill="url(#gl-ribbon)" stroke="{O}" stroke-width="5" stroke-linejoin="round"/>'
    f'<path d="M{f1(BX0 + 14)} {f1(BY + 10)}Q{W / 2} {f1(BY + 10 + 2 * SAG)} {f1(BX1 - 14)} {f1(BY + 10)}" fill="none" stroke="#B9F5CF" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>'
    + ban_text_svg
)

# ===================================================================== montagem
line1_svg = ''.join(letter_block(gid, 'gl-l gl-l1', 0.15 + i * 0.07) for i, (gid, *_rest) in enumerate(line1))
line2_svg = ''.join(letter_block(gid, 'gl-l gl-l2', 0.75 + i * 0.08) for i, (gid, *_rest) in enumerate(line2))
# Brilho: recortado na letra inteira (face + extrusão); na face branca quase não aparece, na lateral azul sim
faces_clip = '<clipPath id="gl-faces">' + ''.join(
    f'<use href="#{gid}" x="{f1(STEP[0] * k)}" y="{f1(STEP[1] * k)}"/>' for gid, *_ in line1 + line2 for k in (0, 4, 8, DEPTH_STEPS)) + '</clipPath>'

drop_g = (
    f'<g transform="translate({f1(drop_cx)} {f1(drop_bottom)}) rotate(14)">'
    f'<g class="gl-drop"><g transform="scale({DS})">'
    f'<path d="{DROP}" fill="#3FB8FF"/><path d="{DROP_SH}" fill="#1F8FE0"/>'
    f'<path d="{DROP_HI}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>'
    f'<path d="{DROP}" fill="none" stroke="{O}" stroke-width="2" stroke-linejoin="round"/>'
    f'</g></g></g>'
)
splash_parts = [f'<ellipse class="gl-ring" cx="0" cy="0" rx="40" ry="10" fill="none" stroke="#BFF3FF" stroke-width="4"/>']
for i, (dx, dy, r) in enumerate([(-70, -26, 7), (-42, -58, 6), (0, -74, 5.5), (42, -58, 6), (70, -26, 7)]):
    splash_parts.append(f'<circle class="gl-spl" style="--x:{dx}px;--y:{dy}px" cx="0" cy="0" r="{r}" fill="#3FB8FF" stroke="{O}" stroke-width="2.5"/>')
splash_g = f'<g transform="translate({f1(drop_cx - 2)} {f1(drop_bottom + 2)})">{"".join(splash_parts)}</g>'

shine_g = (
    '<g clip-path="url(#gl-faces)" class="gl-shine-wrap">'
    '<rect class="gl-shine" x="-60" y="0" width="90" height="612" fill="url(#gl-shinegrad)" transform="skewX(-20)"/>'
    '</g>'
)

GRADS = (
    '<linearGradient id="gl-face" x1="0" y1="0" x2="0" y2="1">'
    '<stop offset="0" stop-color="#FFFFFF"/><stop offset="0.45" stop-color="#FAFEFF"/><stop offset="1" stop-color="#C2EAFF"/></linearGradient>'
    '<linearGradient id="gl-wavefill" x1="0" y1="0" x2="0" y2="1">'
    '<stop offset="0" stop-color="#8FE6FF"/><stop offset="1" stop-color="#3FB8FF"/></linearGradient>'
    '<linearGradient id="gl-ribbon" x1="0" y1="0" x2="0" y2="1">'
    '<stop offset="0" stop-color="#3FD872"/><stop offset="1" stop-color="#22A853"/></linearGradient>'
    '<linearGradient id="gl-shinegrad" x1="0" y1="0" x2="1" y2="0">'
    '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
    '<filter id="gl-shadow" x="-5%" y="-5%" width="110%" height="120%">'
    '<feDropShadow dx="0" dy="7" stdDeviation="0" flood-color="#06203d" flood-opacity="0.45"/></filter>'
)

# Tempos da entrada (s): cidade 0–0.8 · linha 1 0.15–1.4 · linha 2 0.75–1.9 · til 1.2 · gota cai 1.35, bate 1.75
# · faixa 1.6 · texto da faixa 1.95 · brilho 2.3 (repete a cada 7 s) · loop a partir de ~3 s.
CSS = """
.gda-logo{overflow:visible}
.gda-logo.logo-wait{visibility:hidden}
.gda-logo .gl-l,.gda-logo .gl-bld,.gda-logo .gl-btxt,.gda-logo .gl-drop,.gda-logo .gl-banner,.gda-logo .gl-tilde,.gda-logo .gl-water,.gda-logo .gl-rotor,.gda-logo .gl-wave,.gda-logo .gl-shine{transform-box:fill-box}
.gda-logo .gl-spl,.gda-logo .gl-ring{opacity:0;transform-box:fill-box;transform-origin:center}
.gda-logo .gl-shine{transform:skewX(-20deg) translateX(-200px)}
.gda-logo .gl-rotor{transform-origin:0 0;transform-box:view-box}
.logo-play .gl-bld{animation:gl-rise .7s cubic-bezier(.2,.9,.3,1.25) var(--d) both;transform-origin:50% 100%}
.logo-play .gl-l1{animation:gl-drop .9s cubic-bezier(.33,0,.3,1) var(--d) both}
.logo-play .gl-l2{animation:gl-pop .8s cubic-bezier(.3,0,.3,1) var(--d) both}
.logo-play .gl-tilde{animation:gl-zoom .6s cubic-bezier(.3,1.6,.5,1) 1.2s both,gl-sway 3.4s ease-in-out 3s infinite;transform-origin:50% 100%}
.logo-play .gl-water{animation:gl-fill .7s cubic-bezier(.3,1.4,.5,1) .5s both;transform-origin:50% 100%}
.logo-play .gl-wave--back{animation:gl-wave 5.5s linear infinite}
.logo-play .gl-wave--front{animation:gl-wave 3.8s linear infinite reverse}
.logo-play .gl-drop{animation:gl-fall .65s cubic-bezier(.55,0,.75,.4) 1.35s both,gl-land .6s ease-out 2s forwards,gl-bob 3.6s ease-in-out 3.2s infinite;transform-origin:50% 100%}
.logo-play .gl-ring{animation:gl-ring .8s ease-out 1.98s forwards}
.logo-play .gl-spl{animation:gl-spl .75s cubic-bezier(.2,.7,.4,1) 1.98s forwards}
.logo-play .gl-banner{animation:gl-unroll .55s cubic-bezier(.3,1.5,.5,1) 1.6s both;transform-origin:50% 50%}
.logo-play .gl-btxt{animation:gl-zoom .4s cubic-bezier(.3,1.7,.5,1) var(--d) both;transform-origin:50% 50%}
.logo-play .gl-rotor{animation:gl-spin 7s linear infinite}
.logo-play .gl-shine{animation:gl-shine 7s ease-in-out 2.3s infinite}
@keyframes gl-rise{0%{transform:translateY(90px) scaleY(.6);opacity:0}25%{opacity:1}100%{transform:none}}
@keyframes gl-drop{0%{transform:translateY(-300px) scale(.92,1.12);opacity:0}15%{opacity:1}52%{transform:translateY(0) scale(1.14,.78)}68%{transform:translateY(-26px) scale(.96,1.05)}82%{transform:translateY(0) scale(1.05,.95)}92%{transform:translateY(-4px)}100%{transform:none}}
@keyframes gl-pop{0%{transform:scale(0,.2);opacity:0}30%{opacity:1}55%{transform:scale(1.12,1.18)}72%{transform:scale(.95,.9)}87%{transform:scale(1.03,1.03)}100%{transform:none}}
@keyframes gl-zoom{0%{transform:scale(0);opacity:0}40%{opacity:1}100%{transform:none}}
@keyframes gl-fill{0%{transform:scaleY(0);opacity:0}30%{opacity:1}100%{transform:none}}
@keyframes gl-unroll{0%{transform:scaleX(0) scaleY(.6);opacity:0}30%{opacity:1}100%{transform:none}}
@keyframes gl-fall{0%{transform:translateY(-420px) scale(.8,1.15);opacity:0}25%{opacity:1}100%{transform:translateY(0) scale(.9,1.12)}}
@keyframes gl-land{0%{transform:scale(1.35,.62)}40%{transform:scale(.88,1.14)}70%{transform:scale(1.06,.95)}100%{transform:none}}
@keyframes gl-bob{0%,100%{transform:none}50%{transform:translateY(-5px) rotate(-3deg)}}
@keyframes gl-ring{0%{transform:scale(.2);opacity:1}100%{transform:scale(1.7);opacity:0}}
@keyframes gl-spl{0%{transform:translate(0,0) scale(.4);opacity:1}70%{opacity:1}100%{transform:translate(var(--x),var(--y)) scale(1);opacity:0}}
@keyframes gl-sway{0%,100%{transform:none}50%{transform:translateX(4px) skewX(-8deg)}}
@keyframes gl-wave{from{transform:translateX(0)}to{transform:translateX(""" + str(WAVE_P) + """px)}}
@keyframes gl-spin{to{transform:rotate(360deg)}}
@keyframes gl-shine{0%{transform:skewX(-20deg) translateX(-200px)}20%{transform:skewX(-20deg) translateX(1300px)}100%{transform:skewX(-20deg) translateX(1300px)}}
"""


def minify_css(css):
    return ''.join(line.strip() for line in css.strip().splitlines())


def build(animated):
    root_cls = 'gda-logo logo-play' if animated else 'gda-logo'
    css = minify_css(CSS) if animated else '.gda-logo{overflow:visible}.gda-logo .gl-spl,.gda-logo .gl-ring{opacity:0}.gda-logo .gl-shine{display:none}'
    body = (
        f'<g filter="url(#gl-shadow)">'
        f'<g class="gl-city">{city}</g>'
        f'<g class="gl-water">{water_g}</g>'
        f'<g class="gl-line1">{line1_svg}</g>'
        f'<g class="gl-tilde">{tilde_block(tid)}</g>'
        f'<g class="gl-line2">{line2_svg}</g>'
        f'<g class="gl-banner">{banner}</g>'
        f'</g>'
        + shine_g
        + f'<g filter="url(#gl-shadow)">{drop_g}</g>'
        + splash_g
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" class="{root_cls}" role="img" aria-labelledby="gl-title">'
        f'<title id="gl-title">Guardião da Água</title>'
        f'<defs>{"".join(defs)}{faces_clip}{GRADS}</defs>'
        f'<style>{css}</style>'
        f'{body}</svg>\n'
    )


for name, anim in (('guardiao-logo.svg', True), ('guardiao-logo-static.svg', False)):
    path = os.path.normpath(os.path.join(OUT_DIR, name))
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(build(anim))
    print(path, os.path.getsize(path), 'bytes')
print('linha 1:', line1[0][2], line1[-1][3], 'linha 2:', line2[0][2], line2[-1][3], 'faixa y:', BY, BY + BH + 2 * SAG)
