/**
 * Núcleo do gerador de ícones SVG do Guardião da Água.
 * Helpers de desenho (contorno escuro, cores chapadas + sombra) e montagem do SVG final.
 * Tudo usa o marcador "§", trocado pelo prefixo "<id>-" para não colidir quando vários SVGs estão inline.
 */
'use strict';

const O = '#1a1a1a';

// Paleta: [cor, sombra]. Base nas variáveis --cartoon-* de css/ui.css.
const P = {
    blue: ['#00D4FF', '#00A6CC'],
    water: ['#3FB8FF', '#1F8FE0'],
    green: ['#00FF88', '#00C46A'],
    grass: ['#5EE08A', '#2FB463'],
    leaf: ['#2FCB5F', '#1E9A45'],
    lime: ['#B4E65A', '#86C232'],
    soil: ['#6B4A2E', '#4E341F'],
    yellow: ['#FFD700', '#E5A800'],
    orange: ['#FF8C00', '#D96F00'],
    red: ['#FF4757', '#D42F3F'],
    pink: ['#FF6B9D', '#E0477C'],
    purple: ['#A855F7', '#8433D4'],
    white: ['#FFFFFF', '#DDE6EC'],
    concrete: ['#E8EEF2', '#B8C6CF'],
    gray: ['#9AA7B0', '#76838C'],
    dark: ['#4A5560', '#333C45'],
    brown: ['#B9784A', '#8F5631'],
    sand: ['#F2D49B', '#D9B26B'],
    glass: ['#BFF3FF', '#8FDDF0'],
    skin: ['#FFC9A0', '#E8A57A'],
    smoke: ['#D5DCE0', '#AEB8BE'],
    soot: ['#6B737A', '#4E555B']
};

const f1 = n => (Math.round(n * 10) / 10).toString();

/** Monta atributos; `s` = stroke ('none' para sem contorno), `w` = stroke-width, `a` = animação (string de A()). */
function attrs(o = {}) {
    let s = '';
    if (o.f !== undefined) s += ` fill="${o.f}"`;
    if (o.s !== undefined) s += ` stroke="${o.s}"`;
    if (o.w !== undefined) s += ` stroke-width="${o.w}"`;
    if (o.rx !== undefined) s += ` rx="${o.rx}"`;
    if (o.op !== undefined) s += ` opacity="${o.op}"`;
    if (o.da !== undefined) s += ` stroke-dasharray="${o.da}"`;
    if (o.x) s += ' ' + o.x;
    if (o.a) s += o.a;
    return s;
}

const rect = (x, y, w, h, f, o = {}) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"${attrs({ f, ...o })}/>`;
const circ = (cx, cy, r, f, o = {}) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"${attrs({ f, ...o })}/>`;
const ell = (cx, cy, rx, ry, f, o = {}) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}"${attrs({ f, ...o })}/>`;
const path = (d, f, o = {}) => `<path d="${d}"${attrs({ f, ...o })}/>`;
const line = (d, o = {}) => path(d, 'none', o);
const poly = (pts, f, o = {}) => `<polygon points="${pts}"${attrs({ f, ...o })}/>`;
const g = (inner, o = {}) => `<g${attrs(o)}>${inner}</g>`;

/**
 * Animação inline: A('spin', 6) → style com keyframes "§k-spin".
 * origin: transform-origin relativo à caixa do elemento (transform-box: fill-box).
 */
function A(kind, dur, delay = 0, origin = 'center', ease = 'ease-in-out') {
    const d = delay ? ` ${-Math.abs(delay)}s` : '';
    return ` style="animation:§k-${kind} ${dur}s ${ease}${d} infinite;transform-box:fill-box;transform-origin:${origin}"`;
}

/** Retângulo com cor chapada + faixa de sombra à direita + contorno. */
function box(x, y, w, h, c, o = {}) {
    const [m, sh] = P[c] || [c, c];
    const rx = o.rx ?? 0;
    const k = o.k ?? 0.28;
    return rect(x, y, w, h, m, { s: 'none', rx }) +
        rect(x + w * (1 - k), y + (o.sw ?? 1), w * k - (o.sw ?? 1), h - 2 * (o.sw ?? 1), sh, { s: 'none' }) +
        rect(x, y, w, h, 'none', { rx });
}

/** Círculo com sombra (meia-lua no lado direito-baixo). */
function ball(cx, cy, r, c, o = {}) {
    const [m, sh] = P[c] || [c, c];
    const k = r * 0.35;
    return circ(cx, cy, r, m, { s: 'none' }) +
        path(`M${f1(cx + r * 0.7)} ${f1(cy - r * 0.7)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx - r * 0.7)} ${f1(cy + r * 0.7)}A${f1(r - k)} ${f1(r - k)} 0 0 0 ${f1(cx + r * 0.7)} ${f1(cy - r * 0.7)}Z`, sh, { s: 'none' }) +
        circ(cx, cy, r, 'none', o);
}

/** Gota d'água (ponta para cima), centro da parte redonda em (cx, cy), raio r. */
function dropD(cx, cy, r) {
    const t = cy - r * 1.75;
    return `M${f1(cx)} ${f1(t)}C${f1(cx + r * 0.35)} ${f1(cy - r * 1.1)} ${f1(cx + r)} ${f1(cy - r * 0.55)} ${f1(cx + r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx - r)} ${f1(cy)}C${f1(cx - r)} ${f1(cy - r * 0.55)} ${f1(cx - r * 0.35)} ${f1(cy - r * 1.1)} ${f1(cx)} ${f1(t)}Z`;
}
function drop(cx, cy, r, c = 'water', o = {}) {
    const [m, sh] = P[c] || [c, c];
    if (o.flat) return path(dropD(cx, cy, r), m, o.w ? { w: o.w } : {});
    const hl = o.noHl ? '' : path(`M${f1(cx - r * 0.55)} ${f1(cy - r * 0.05)}A${f1(r * 0.55)} ${f1(r * 0.55)} 0 0 1 ${f1(cx - r * 0.2)} ${f1(cy - r * 0.55)}`, 'none', { s: '#fff', w: f1(Math.max(1, r * 0.22)), op: 0.85 });
    return path(dropD(cx, cy, r), m, { s: 'none' }) +
        path(`M${f1(cx + r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx - r * 0.3)} ${f1(cy + r * 0.95)}A${f1(r * 0.8)} ${f1(r * 0.8)} 0 0 0 ${f1(cx + r * 0.75)} ${f1(cy - r * 0.2)}Z`, sh, { s: 'none' }) +
        hl + path(dropD(cx, cy, r), 'none', o.w ? { w: o.w } : {});
}

/** Nuvem: três bolhas + base. (cx, cy) = centro; s = escala (1 ≈ 40 de largura). */
function cloudD(cx, cy, s) {
    const x = v => f1(cx + v * s), y = v => f1(cy + v * s);
    return `M${x(-16)} ${y(8)}A${f1(7 * s)} ${f1(7 * s)} 0 0 1 ${x(-14)} ${y(-5)}A${f1(10 * s)} ${f1(10 * s)} 0 0 1 ${x(4)} ${y(-9)}A${f1(8 * s)} ${f1(8 * s)} 0 0 1 ${x(17)} ${y(1)}A${f1(4 * s)} ${f1(4 * s)} 0 0 1 ${x(16)} ${y(8)}Z`;
}
function cloud(cx, cy, s, c = 'white', o = {}) {
    const [m, sh] = P[c] || [c, c];
    return path(cloudD(cx, cy, s), m, { s: 'none' }) +
        path(`M${f1(cx - 14 * s)} ${f1(cy + 8 * s)}H${f1(cx + 16 * s)}A${f1(4 * s)} ${f1(4 * s)} 0 0 0 ${f1(cx + 17 * s)} ${f1(cy + 2 * s)}Q${f1(cx + 4 * s)} ${f1(cy + 6 * s)} ${f1(cx - 14 * s)} ${f1(cy + 8 * s)}Z`, sh, { s: 'none' }) +
        path(cloudD(cx, cy, s), 'none', o);
}

/** Contorno de engrenagem com n dentes (raio interno r, dentes até r*1.3). */
function gearD(cx, cy, r, n = 8) {
    const R = r * 1.32;
    let d = '';
    for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const st = Math.PI * 2 / n;
        const pts = [[r, a0], [R, a0 + st * 0.12], [R, a0 + st * 0.42], [r, a0 + st * 0.54]];
        pts.forEach(([rad, an], j) => {
            d += (i === 0 && j === 0 ? 'M' : 'L') + f1(cx + rad * Math.cos(an)) + ' ' + f1(cy + rad * Math.sin(an));
        });
    }
    return d + 'Z';
}
/** Engrenagem com furo central. */
function gear(cx, cy, r, c = 'gray', o = {}) {
    const [m] = P[c] || [c];
    return path(gearD(cx, cy, r, o.teeth || 8), m) + circ(cx, cy, r * 0.38, o.hole || P.dark[0]);
}

/** Círculo invisível que centraliza a caixa de um grupo em (cx, cy): com transform-box fill-box, girar em "center" gira em torno dele. */
const pivot = (cx, cy, r) => circ(cx, cy, r, 'none', { s: 'none' });

/** Linha grossa com contorno: traço escuro largo + traço colorido por cima. */
const thick = (d, c, w, o = {}) => line(d, { w: w + (o.ow ?? 2.5), ...(o.x ? { x: o.x } : {}) }) + line(d, { s: c, w, ...(o.x ? { x: o.x } : {}) });

/** Árvore redonda (copa + tronco). */
function tree(cx, by, s = 1, o = {}) {
    const a = o.a || '';
    return rect(cx - 3 * s, by - 14 * s, 6 * s, 14 * s, P.brown[0]) +
        g(ball(cx, by - 22 * s, 12 * s, o.c || 'leaf'), { a });
}

/** Raio/relâmpago. */
function boltD(cx, cy, s) {
    const x = v => f1(cx + v * s), y = v => f1(cy + v * s);
    return `M${x(3)} ${y(-14)}L${x(-8)} ${y(2)}H${x(-1)}L${x(-4)} ${y(14)}L${x(8)} ${y(-3)}H${x(1)}Z`;
}

/** Estrela de 5 pontas. */
function starD(cx, cy, R, r = R * 0.45) {
    let d = '';
    for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + i * Math.PI / 5;
        const rad = i % 2 ? r : R;
        d += (i ? 'L' : 'M') + f1(cx + rad * Math.cos(ang)) + ' ' + f1(cy + rad * Math.sin(ang));
    }
    return d + 'Z';
}

/** Brilho de 4 pontas (sparkle). */
function sparkD(cx, cy, r) {
    const k = r * 0.25;
    return `M${f1(cx)} ${f1(cy - r)}Q${f1(cx + k)} ${f1(cy - k)} ${f1(cx + r)} ${f1(cy)}Q${f1(cx + k)} ${f1(cy + k)} ${f1(cx)} ${f1(cy + r)}Q${f1(cx - k)} ${f1(cy + k)} ${f1(cx - r)} ${f1(cy)}Q${f1(cx - k)} ${f1(cy - k)} ${f1(cx)} ${f1(cy - r)}Z`;
}

/** Linha ondulada (para água correndo). x0..x1 na altura y, amplitude a, período p. */
function waveD(x0, x1, y, a, p) {
    let d = `M${f1(x0)} ${f1(y)}`;
    for (let x = x0; x < x1; x += p) d += `q${f1(p / 4)} ${f1(-a)} ${f1(p / 2)} 0t${f1(p / 2)} 0`;
    return d;
}

/** Biblioteca de keyframes (u = unidade de amplitude: 1 nos pequenos, 4 nos grandes). */
function keyframes(u) {
    const px = v => f1(v * u) + 'px';
    return {
        spin: 'to{transform:rotate(360deg)}',
        spinr: 'to{transform:rotate(-360deg)}',
        bob: `0%,100%{transform:translateY(0)}50%{transform:translateY(-${px(1.2)})}`,
        bobs: `0%,100%{transform:translateY(0)}50%{transform:translateY(-${px(0.6)})}`,
        sway: '0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}',
        swing: '0%,100%{transform:rotate(-16deg)}50%{transform:rotate(16deg)}',
        tilt: '0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}',
        drip: `0%{transform:translateY(0);opacity:0}15%,75%{opacity:1}100%{transform:translateY(${px(4)});opacity:0}`,
        fall: `0%{transform:translateY(-${px(2.5)});opacity:0}20%,70%{opacity:1}100%{transform:translateY(${px(4)});opacity:0}`,
        smoke: `0%{transform:translate(0,0) scale(.5);opacity:0}20%{opacity:.95}100%{transform:translate(${px(1.5)},-${px(6)}) scale(1.35);opacity:0}`,
        steam: `0%{transform:translateY(0) scaleX(1);opacity:0}30%{opacity:.9}100%{transform:translateY(-${px(4)}) scaleX(1.3);opacity:0}`,
        blink: '0%,100%{opacity:1}50%{opacity:.25}',
        blinkx: '0%,45%{opacity:1}50%,95%{opacity:.15}100%{opacity:1}',
        pulse: '0%,100%{transform:scale(1)}50%{transform:scale(1.12)}',
        breathe: '0%,100%{transform:scale(1)}50%{transform:scale(1.05)}',
        beat: '0%,40%,100%{transform:scale(1)}10%,30%{transform:scale(1.15)}20%{transform:scale(1.02)}',
        flow: `to{stroke-dashoffset:-${f1(u === 1 ? 8 : 24)}}`,
        drift: `0%,100%{transform:translateX(-${px(1.2)})}50%{transform:translateX(${px(1.2)})}`,
        wink: '0%,90%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}',
        twinkle: '0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.6)}',
        flash: '0%,76%,84%,92%,100%{opacity:0}80%,88%{opacity:1}',
        zap: '0%,70%,100%{opacity:1}75%,85%{opacity:.25}80%{opacity:1}',
        snow: `0%{transform:translate(0,-${px(2.5)});opacity:0}20%{opacity:1}50%{transform:translate(${px(0.8)},${px(1)})}100%{transform:translate(-${px(0.5)},${px(4.5)});opacity:0}`,
        coin: '0%,100%{transform:scaleX(1)}50%{transform:scaleX(.2)}',
        shine: '0%,55%,100%{opacity:0;transform:scale(.3) rotate(0)}75%{opacity:1;transform:scale(1) rotate(45deg)}',
        sweep: `0%{transform:translateX(-${px(9)}) skewX(-20deg)}55%,100%{transform:translateX(${px(9)}) skewX(-20deg)}`,
        grow: '0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}',
        grows: '0%,100%{transform:scaleY(.78)}50%{transform:scaleY(1)}',
        globe: `to{transform:translateX(${px(23)})}`,
        wave: `to{transform:translateX(-${px(u === 1 ? 8 : 6)})}`,
        ripple: '0%{transform:scale(.3);opacity:1}100%{transform:scale(1.5);opacity:0}',
        slide: `0%{transform:translateX(0);opacity:0}15%,80%{opacity:1}100%{transform:translateX(${px(8)});opacity:0}`,
        flag: '0%,100%{transform:skewY(0) scaleX(1)}50%{transform:skewY(7deg) scaleX(.88)}',
        flicker: '0%,100%{transform:scaleY(1) scaleX(1)}33%{transform:scaleY(.82) scaleX(1.06)}66%{transform:scaleY(1.08) scaleX(.94)}',
        nod: `0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-${px(0.5)}) rotate(4deg)}`,
        scan: `0%,100%{transform:translate(-${px(2)},0)}50%{transform:translate(${px(2)},-${px(0.6)})}`,
        swim: `0%,100%{transform:translate(-${px(2.5)},0) rotate(-4deg)}50%{transform:translate(${px(2.5)},-${px(0.6)}) rotate(4deg)}`,
        rise: `0%{transform:translateY(${px(1.5)});opacity:0}25%,75%{opacity:1}100%{transform:translateY(-${px(3)});opacity:0}`,
        level: `0%,100%{transform:translateY(${px(1.2)})}50%{transform:translateY(-${px(0.6)})}`,
        hop: `0%,60%,100%{transform:translateY(0)}70%{transform:translateY(-${px(1.6)})}80%{transform:translateY(0)}`,
        fade: '0%,100%{opacity:.35}50%{opacity:1}',
        march: `to{stroke-dashoffset:-${f1(u === 1 ? 6 : 20)}}`,
        sand: '0%,100%{transform:rotate(0)}45%,55%{transform:rotate(180deg)}',
        shake: '0%,80%,100%{transform:rotate(0)}84%{transform:rotate(-12deg)}88%{transform:rotate(12deg)}92%{transform:rotate(-8deg)}96%{transform:rotate(6deg)}',
        hand: '0%,100%{transform:rotate(-14deg)}50%{transform:rotate(18deg)}'
    };
}

/**
 * Monta o SVG final.
 * @param {string} id   id do arquivo (kebab-case)
 * @param {'sm'|'lg'} size
 * @param {string} title título em português
 * @param {string} body  conteúdo com marcadores "§"
 */
function svg(id, size, title, body) {
    const vb = size === 'lg' ? 128 : 32;
    const sw = size === 'lg' ? 3 : 2;
    const pre = `${id}-`;
    const lib = keyframes(size === 'lg' ? 4 : 1);
    const used = [...new Set([...body.matchAll(/§k-([a-z]+)/g)].map(m => m[1]))];
    let css = '';
    if (used.length) {
        // Animação sempre ligada, mesmo com "reduzir movimento" no sistema (pedido do usuário).
        css = used.map(k => {
            if (!lib[k]) throw new Error(`keyframe desconhecido: ${k} (${id})`);
            return `@keyframes ${pre}k-${k}{${lib[k]}}`;
        }).join('');
    }
    const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" role="img" aria-labelledby="${pre}t" class="${pre}svg" fill="none" stroke="${O}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">` +
        `<title id="${pre}t">${title}</title>` +
        (css ? `<style>${css}</style>` : '') +
        body.replace(/§/g, pre) + '</svg>';
    return out;
}

module.exports = { O, P, f1, rect, circ, ell, path, line, poly, g, A, box, ball, drop, dropD, cloud, cloudD, gear, gearD, pivot, thick, tree, boltD, starD, sparkD, waveD, svg };
