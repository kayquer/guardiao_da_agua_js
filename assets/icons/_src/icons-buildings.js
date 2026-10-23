/**
 * Prédios (js/data/buildings.js): versão grande (128, lista de construção / estudos) e pequena (32, chips).
 * Grandes ficam sobre um "lote" de grama (elipse) e têm várias partes animadas.
 */
'use strict';
const { O, P, f1, rect, circ, ell, path, line, poly, g, A, box, ball, drop, cloud, gear, pivot, thick, tree, boltD, starD, sparkD, waveD } = require('./core');

const BJ = 'js/data/buildings.js';
const RP = 'js/systems/ui/ResourcePanels.js';
const ST = 'data/building-studies.json';
const UI = 'js/systems/UIManager.js';

// ---------- helpers ----------
const ground = () => ell(64, 108, 58, 12, P.grass[0]) + path('M10 112a58 12 0 0 0 108 0a58 9 0 0 1-108 0z', P.grass[1], { s: 'none' });
const win = (x, y, w = 12, h = 12) => rect(x, y, w, h, P.glass[0], { w: 2.5 });
const lit = (x, y, w = 12, h = 12, dur = 5, delay = 0) => win(x, y, w, h) + g(rect(x, y, w, h, P.yellow[0], { w: 2.5 }), { a: A('blinkx', dur, delay) });
const smokes = (x, y, r, c = 'smoke', dur = 3.6, n = 3) => Array.from({ length: n }, (_, i) =>
    g(circ(x + (i % 2 ? r * 0.35 : -r * 0.2), y, r, P[c][0], { w: 2.5 }), { a: A('smoke', dur, (i * dur) / n, 'center', 'ease-out') })).join('');
const smokeSm = (x, y, r = 2.2, c = 'smoke', dur = 3.6) => g(circ(x, y, r, P[c][0], { w: 1.4 }), { a: A('smoke', dur, 0, 'center', 'ease-out') });
const spark = (x, y, r, dur = 3.5, delay = 0, c = '#fff') => g(path(sparkD(x, y, r), c, { w: 2 }), { a: A('shine', dur, delay) });
const roof = (x, y, w, h, c = 'red') => poly(`${x},${y + h} ${x + w / 2},${y} ${x + w},${y + h}`, P[c][0]) +
    poly(`${x + w / 2},${y + 3} ${x + w - 4},${y + h - 1.5} ${x + w / 2 + 6},${y + h - 1.5}`, P[c][1], { s: 'none' });
const doorL = (x, y, w, h, c = 'brown') => rect(x, y, w, h, P[c][0], { rx: 2 }) + circ(x + w - 4, y + h / 2, 1.6, O, { s: 'none' });
/** Pás de turbina eólica girando em (cx, cy). */
const blades = (cx, cy, L, dur, w = 3) => g(pivot(cx, cy, L) + [0, 120, 240].map(a =>
    path(`M${cx} ${cy}c${f1(L * 0.34)} ${f1(-L * 0.22)} ${f1(L * 0.24)} ${f1(-L * 0.8)} 0 ${f1(-L)}c${f1(-L * 0.12)} ${f1(L * 0.25)} ${f1(-L * 0.16)} ${f1(L * 0.7)} 0 ${f1(L)}z`, P.concrete[0], { w, x: `transform="rotate(${a} ${cx} ${cy})"` })).join(''),
    { a: A('spin', dur, 0, 'center', 'linear') }) + circ(cx, cy, L * 0.12, P.gray[0], { w });
/** Roda-gigante. */
function ferris(cx, cy, R, w, dur) {
    const cab = [];
    const cols = ['red', 'yellow', 'blue', 'green', 'pink', 'orange'];
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        cab.push(rect(cx + R * Math.cos(a) - R * 0.14, cy + R * Math.sin(a) - R * 0.1, R * 0.28, R * 0.24, P[cols[i]][0], { rx: R * 0.06, w: w * 0.8 }));
    }
    let spokes = '';
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        spokes += `M${cx} ${cy}L${f1(cx + R * Math.cos(a))} ${f1(cy + R * Math.sin(a))}`;
    }
    return g(pivot(cx, cy, R * 1.2) + circ(cx, cy, R, 'none', { w: w * 1.3 }) + circ(cx, cy, R * 0.55, 'none', { w: w * 0.7 }) + line(spokes, { w: w * 0.6 }) + cab.join(''),
        { a: A('spin', dur, 0, 'center', 'linear') }) + circ(cx, cy, R * 0.12, P.dark[0], { w: w * 0.8 });
}
/** Fábrica com telhado serrilhado. (x, base) canto inferior esquerdo. */
const sawFactory = (x, base, w, h, c = 'orange', sw = 3) => {
    const n = 3, tw = w / n;
    let d = `M${x} ${base}V${base - h}`;
    for (let i = 0; i < n; i++) d += `l${f1(tw)} ${f1(-h * 0.35)}v${f1(h * 0.35)}`;
    d += `V${base}z`;
    return path(d, P[c][0], { w: sw });
};
const ZONE = {
    residential: { c: P.green[0], light: '#C9FFE2', name: 'Residencial' },
    industrial: { c: P.yellow[0], light: '#FFF3B0', name: 'Industrial' },
    commercial: { c: P.blue[0], light: '#C4F4FF', name: 'Comercial' }
};
const LEVEL = { light: ['Leve', 1], balanced: ['Equilibrada', 2], heavy: ['Pesada', 3] };

function zoneLg(kind, level) {
    const z = ZONE[kind], n = LEVEL[level][1];
    let b = ground() + rect(12, 82, 104, 26, z.light, { rx: 8 }) +
        g(rect(12, 82, 104, 26, 'none', { rx: 8, s: z.c === P.yellow[0] ? P.orange[0] : P.leaf[1], w: 3, da: '12 8' }), { a: A('march', 2, 0, 'center', 'linear') });
    const base = 96;
    const slots = n === 1 ? [64] : n === 2 ? [44, 84] : [30, 64, 98];
    slots.forEach((cx, i) => {
        const tall = n === 3 ? [40, 62, 48][i] : n === 2 ? [30, 46][i] : 30;
        if (kind === 'residential') {
            if (n === 1 || (n === 2 && i === 0)) {
                const w = 40;
                b += box(cx - w / 2, base - 26, w, 26, 'white') + roof(cx - w / 2 - 5, base - 50, w + 10, 26, 'red') +
                    doorL(cx - 5, base - 16, 10, 16) + lit(cx + 8, base - 20, 8, 8, 5, i);
            } else {
                const w = n === 3 ? 26 : 32;
                b += box(cx - w / 2, base - tall, w, tall, i % 2 ? 'pink' : 'orange') + rect(cx - w / 2 - 2, base - tall - 5, w + 4, 6, P.dark[0], { rx: 2 });
                for (let r = 0; r < Math.floor((tall - 12) / 12); r++) b += lit(cx - w / 2 + 4, base - tall + 6 + r * 12, 7, 7, 5, r + i) + win(cx + w / 2 - 11, base - tall + 6 + r * 12, 7, 7);
            }
        } else if (kind === 'industrial') {
            const w = n === 3 ? 30 : 38, h = n === 1 ? 26 : 22 + i * 6;
            b += rect(cx + w / 2 - 10, base - h - 26, 8, 26 + h, P.gray[0]) + smokes(cx + w / 2 - 6, base - h - 30, n === 3 ? 6 : 7, n === 3 ? 'soot' : 'smoke', 3.4, 2) +
                sawFactory(cx - w / 2, base, w, h) + win(cx - w / 2 + 5, base - 14, 8, 7) + win(cx - w / 2 + 16, base - 14, 8, 7);
        } else {
            const w = n === 3 ? 26 : 36;
            if (n === 1 || (n === 2 && i === 0)) {
                b += box(cx - w / 2, base - 28, w, 28, 'white') +
                    [0, 1, 2, 3].map(k => path(`M${f1(cx - w / 2 - 3 + k * (w + 6) / 4)} ${base - 34}h${f1((w + 6) / 4)}v6a${f1((w + 6) / 8)} ${f1((w + 6) / 8)} 0 0 1 ${f1(-(w + 6) / 4)} 0z`, k % 2 ? '#fff' : P.red[0], { w: 2.5 })).join('') +
                    rect(cx - 6, base - 16, 12, 16, P.glass[0], { w: 2.5 }) + g(rect(cx - w / 2 + 2, base - 46, w - 4, 9, P.yellow[0], { rx: 3, w: 2.5 }), { a: A('blinkx', 2.4, i) });
            } else {
                b += box(cx - w / 2, base - tall, w, tall, 'glass', { k: 0.35 }) + rect(cx - w / 2 - 2, base - tall - 5, w + 4, 6, P.dark[0], { rx: 2 }) +
                    line(`M${cx - w / 2 + 8} ${base - tall + 4}V${base - 4}M${cx + w / 2 - 8} ${base - tall + 4}V${base - 4}`, { w: 2, op: 0.6 }) +
                    g(rect(cx - 4, base - tall - 11, 8, 6, P.red[0], { w: 2 }), { a: A('blinkx', 1.6, i * 0.5) });
            }
        }
    });
    return b + spark(104, 30, 6, 3.5);
}
function zoneSm(kind, level) {
    const z = ZONE[kind], n = LEVEL[level][1];
    let glyph = '';
    if (kind === 'residential') glyph = rect(10, 13, 12, 8, '#fff', { w: 1.6 }) + poly('8,14 16,7 24,14', P.red[0], { w: 1.6 }) + rect(14.5, 16, 3, 5, P.brown[0], { w: 1.2 });
    else if (kind === 'industrial') glyph = rect(19, 6, 3.5, 15, P.gray[0], { w: 1.4 }) + path('M8 21v-8l4-2.5v2.5l4-2.5v2.5l4-2.5v10.5z', P.orange[0], { w: 1.6 });
    else glyph = rect(9, 12, 14, 9, '#fff', { w: 1.6 }) + path('M8 9h16v3.5H8z', P.red[0], { w: 1.4 }) + rect(14, 15, 4, 6, P.glass[0], { w: 1.2 });
    const pips = Array.from({ length: n }, (_, i) => circ(16 + (i - (n - 1) / 2) * 5, 25.5, 1.8, O, { s: 'none' })).join('');
    return rect(3, 3, 26, 26, z.light, { rx: 5, s: 'none' }) +
        g(rect(3, 3, 26, 26, 'none', { rx: 5, w: 1.7, da: '4 2' }), { a: A('march', 1.8, 0, 'center', 'linear') }) + glyph + pips;
}

// ---------- definições ----------
const B = (id, key, title, emoji, lg, sm, extraUsed = []) => ({
    id, area: 'building', emoji: [emoji], title,
    used: [`${BJ} (${key}.icon)`, RP + ' (.building-icon)', UI + ' (lista de construção)', ...extraUsed],
    lg, sm
});

module.exports = [
    // ----- ÁGUA -----
    B('water-pump', 'water_pump', 'Bomba de Água', '💧',
        () => ground() + thick('M68 76h24v16', P.gray[0], 9, { ow: 6 }) +
            g(line('M68 76h24v16', { s: P.water[0], w: 4, da: '14 10' }), { a: A('flow', 1.2, 0, 'center', 'linear') }) +
            ell(92, 108, 13, 3.5, P.water[0], { w: 2.5 }) +
            g(drop(92, 99, 4, 'water', { noHl: true, w: 2.5 }), { a: A('drip', 1.6, 0, 'center', 'ease-in') }) +
            box(22, 58, 46, 48, 'blue', { rx: 4 }) + rect(17, 50, 56, 10, P.dark[0], { rx: 3 }) +
            g(gear(45, 84, 11, 'yellow', { hole: P.dark[0] }), { a: A('spin', 4, 0, 'center', 'linear') }) +
            drop(100, 34, 9) + spark(84, 26, 6, 3) + spark(112, 50, 4.5, 3, 1.5),
        () => box(5, 12, 15, 16, 'blue', { rx: 2 }) + rect(3, 9, 19, 4, P.dark[0], { rx: 1.5 }) +
            thick('M20 17h6v4', P.gray[0], 2.6, { ow: 2 }) + g(drop(26, 26.5, 2.2, 'water', { noHl: true, w: 1.4 }), { a: A('drip', 2, 0, 'center', 'ease-in') }),
        [ST + ' (water_pump)']),
    B('water-well', 'water_well', 'Poço Artesiano', '🕳️',
        () => ground() + rect(36, 32, 6, 48, P.brown[0]) + rect(86, 32, 6, 48, P.brown[0]) + line('M40 44h48', { w: 4 }) +
            g(line('M64 44v16', { w: 2 }) + path('M56 60h16l-2 12H58z', P.brown[0]) + line('M56 64h16', { w: 2 }), { a: A('level', 3.5) }) +
            path('M34 78v24a30 8 0 0 0 60 0V78', P.gray[0]) + path('M80 85v24a30 8 0 0 0 14-7V78z', P.gray[1], { s: 'none' }) +
            path('M34 78v24a30 8 0 0 0 60 0V78') + line('M34 90a30 8 0 0 0 60 0M50 85v7M70 97v8M80 86v6M44 98v7', { w: 2 }) +
            ell(64, 78, 30, 8, P.dark[0]) + ell(64, 79, 24, 5.5, P.water[0], { w: 2 }) +
            g(ell(64, 79, 12, 3, 'none', { s: '#fff', w: 2 }), { a: A('ripple', 2.4, 0, 'center', 'ease-out') }) +
            roof(26, 14, 76, 22, 'red') + spark(108, 64, 5, 3.4),
        () => line('M8 20V9M24 20V9', { w: 2 }) + poly('5,10.5 16,4 27,10.5', P.red[0]) +
            g(line('M16 10v3', { w: 1.3 }) + rect(14, 13, 4, 3.5, P.brown[0], { w: 1.3 }), { a: A('level', 3) }) +
            path('M7 20v7a9 2.5 0 0 0 18 0v-7', P.gray[0]) + ell(16, 20, 9, 2.5, P.water[0], { w: 1.6 }),
        [ST + ' (water_well)']),
    B('treatment-plant', 'treatment_plant', 'Estação de Tratamento', '🏭',
        () => ground() + path('M12 52v46a22 6 0 0 0 44 0V52', P.concrete[0]) + path('M44 54v49a22 6 0 0 0 12-5V52z', P.concrete[1], { s: 'none' }) +
            path('M12 52v46a22 6 0 0 0 44 0V52') + ell(34, 52, 22, 6, P.water[0]) +
            rect(23, 64, 22, 32, P.water[0], { rx: 4 }) +
            [[29, 0], [36, 1], [40, 2]].map(([x, d]) => g(circ(x, 88, 2.6, '#fff', { w: 2 }), { a: A('rise', 3, d, 'center', 'ease-out') })).join('') +
            thick('M56 96h6', P.gray[0], 6, { ow: 5 }) +
            box(60, 50, 54, 56, 'blue', { rx: 3 }) + rect(56, 44, 62, 8, P.dark[0], { rx: 3 }) +
            g(gear(87, 78, 12, 'yellow'), { a: A('spin', 5, 0, 'center', 'linear') }) +
            g(drop(87, 26, 8), { a: A('bob', 3) }) + spark(104, 16, 5, 3) + spark(70, 30, 4, 3, 1.5),
        () => rect(3, 10, 12, 18, P.concrete[0], { rx: 2 }) + rect(5.5, 14, 7, 10, P.water[0], { w: 1.5 }) +
            box(16, 12, 13, 16, 'blue', { rx: 1.5 }) + g(gear(22.5, 20, 3.4, 'yellow', { teeth: 6 }), { a: A('spin', 6, 0, 'center', 'linear') }),
        [ST + ' (treatment_plant)']),
    B('filter-station', 'filter_station', 'Estação de Filtros', '🔧',
        () => ground() + thick('M92 96h14v8', P.gray[0], 7, { ow: 5 }) +
            g(drop(106, 113, 3.5, 'water', { noHl: true, w: 2 }), { a: A('drip', 1.8, 0, 'center', 'ease-in') }) +
            rect(36, 26, 56, 20, P.water[0], { s: 'none' }) + rect(36, 46, 56, 18, P.sand[0], { s: 'none' }) +
            rect(36, 64, 56, 18, P.gray[0], { s: 'none' }) + rect(36, 82, 56, 22, P.dark[0], { s: 'none' }) +
            [[44, 70], [56, 74], [70, 69], [82, 75], [50, 78], [76, 79], [63, 70]].map(([x, y]) => circ(x, y, 3, P.concrete[1], { w: 1.5 })).join('') +
            [[46, 52], [58, 57], [72, 51], [84, 58]].map(([x, y]) => circ(x, y, 1.5, P.sand[1], { s: 'none' })).join('') +
            line('M36 46h56M36 64h56M36 82h56', { w: 2 }) + rect(36, 26, 56, 78, 'none', { rx: 4 }) +
            rect(32, 20, 64, 8, P.gray[0], { rx: 3 }) +
            g(drop(52, 38, 3.5, P.brown[0], { noHl: true, w: 2 }), { a: A('fall', 2.4, 0, 'center', 'ease-in') }) +
            g(drop(76, 38, 3.5, P.brown[0], { noHl: true, w: 2 }), { a: A('fall', 2.4, 1.2, 'center', 'ease-in') }) +
            g(path('M104 24l8-8a7 7 0 0 1 4 9l-6 2-14 14-4-4 14-14z', P.gray[0], { w: 2.5 }), { a: A('tilt', 3, 0, '0% 100%') }) + spark(20, 40, 5, 3),
        () => rect(8, 3, 16, 7, P.water[0], { s: 'none' }) + rect(8, 10, 16, 7, P.sand[0], { s: 'none' }) + rect(8, 17, 16, 7, P.gray[0], { s: 'none' }) +
            line('M8 10h16M8 17h16', { w: 1.4 }) + rect(8, 3, 16, 21, 'none', { rx: 2 }) +
            g(drop(16, 28.5, 1.9, 'water', { noHl: true, w: 1.3 }), { a: A('drip', 2, 0, 'center', 'ease-in') }),
        [ST + ' (filter_station)']),
    B('water-tank', 'water_tank', 'Reservatório', '🛢️',
        // Igual ao modelo 3D (blender/water_tank.glb): cilindro metálico cinza com faixas azuis, telhado cônico azul com
        // respiro, escada amarela à direita, medidor de nível turquesa, cano com válvula vermelha e base de concreto.
        () => ground() + path('M18 94v8a46 10 0 0 0 92 0v-8', P.concrete[1]) + ell(64, 94, 46, 10, P.concrete[0]) +
            thick('M30 86H14v14', P.gray[0], 7, { ow: 5 }) + line('M22 86v-7', { w: 3 }) +
            g(ell(22, 77, 8, 2.8, P.red[0], { w: 2.5 }), { a: A('coin', 3) }) +
            g(drop(14, 109, 3.5, 'water', { noHl: true, w: 2 }), { a: A('drip', 1.8, 0, 'center', 'ease-in') }) +
            path('M30 42v50a34 8 0 0 0 68 0V42', P.gray[0], { s: 'none' }) + path('M80 48v51a34 8 0 0 0 18-7V42z', P.gray[1], { s: 'none' }) +
            [56, 76].map(y => path(`M30 ${y}a34 8 0 0 0 68 0v6a34 8 0 0 1-68 0z`, P.water[0], { w: 2 })).join('') +
            path('M30 42v50a34 8 0 0 0 68 0V42') + line('M64 50v8M64 70v4M64 90v10', { w: 1.8, op: 0.5 }) +
            rect(38, 48, 12, 44, '#fff', { rx: 4, w: 2.5 }) + g(rect(40.5, 56, 7, 33.5, '#2EE6D6', { s: 'none', rx: 2 }), { a: A('grows', 4, 0, '50% 100%') }) +
            line('M41 62h3M41 72h3M41 82h3', { w: 1.5 }) +
            path('M26 42L64 14l38 28a38 9 0 0 1-76 0z', P.water[0], { s: 'none' }) + path('M64 14l38 28a38 9 0 0 1-22 8z', P.water[1], { s: 'none' }) +
            path('M26 42L64 14l38 28a38 9 0 0 1-76 0z') + line('M64 14L52 50M64 14l12 36', { w: 1.8, op: 0.6 }) +
            rect(59, 6, 10, 10, P.dark[0], { w: 2.5 }) + rect(55, 3, 18, 5, P.gray[0], { rx: 2, w: 2.5 }) +
            thick('M102 36v62M112 36v62', P.yellow[0], 3, { ow: 2.5 }) + line('M102 46h10M102 56h10M102 66h10M102 76h10M102 86h10', { s: P.yellow[1], w: 3 }) +
            spark(114, 22, 6, 3.4) + spark(36, 26, 4.5, 3.4, 1.7),
        () => ell(16, 27, 12, 3, P.concrete[0], { w: 1.5 }) + path('M8 12v13a8 2.5 0 0 0 16 0V12', P.gray[0]) +
            path('M8 17a8 2.5 0 0 0 16 0v2.5a8 2.5 0 0 1-16 0z', P.water[0], { w: 1.2 }) +
            rect(10.5, 15, 3, 9, '#fff', { w: 1 }) + g(rect(11.2, 18, 1.6, 5.4, '#2EE6D6', { s: 'none' }), { a: A('grows', 4, 0, '50% 100%') }) +
            path('M5.5 12L16 4l10.5 8a10.5 2.8 0 0 1-21 0z', P.water[0], { w: 1.6 }) + rect(14.5, 1.8, 3, 2.6, P.dark[0], { w: 1 }) +
            line('M27.5 9v18', { s: P.yellow[1], w: 1.8 }) + line('M26.5 13h2M26.5 18h2M26.5 23h2', { s: P.yellow[1], w: 1.2 }),
        [ST + ' (water_tank)']),
    B('water-tower', 'water_tower', "Caixa d'Água", '🗼',
        () => ground() + thick('M44 106L52 60M84 106L76 60M49 84h30M47 98l32-16', P.gray[0], 4, { ow: 4 }) +
            g(line('M64 60v42', { s: P.water[0], w: 4, da: '14 10' }), { a: A('flow', 1.2, 0, 'center', 'linear') }) +
            box(34, 28, 60, 34, 'blue', { rx: 12 }) + line('M34 44h60', { w: 2 }) + roof(30, 8, 68, 24, 'red') +
            g(drop(64, 50, 6, 'white', { noHl: true, w: 2.5 }), { a: A('bobs', 3) }) +
            g(ell(64, 106, 12, 3, 'none', { s: P.water[1], w: 2.5 }), { a: A('ripple', 2, 0, 'center', 'ease-out') }) +
            spark(42, 36, 5, 3) + spark(108, 30, 5, 3, 1.6),
        () => line('M11 29l3-11M21 29l-3-11M12.3 24h7.4', { w: 1.8 }) + box(7, 8, 18, 11, 'blue', { rx: 4 }) + poly('5.5,9.5 16,3 26.5,9.5', P.red[0]) +
            g(path(sparkD(11.5, 13.5, 2.4), '#fff', { s: 'none' }), { a: A('shine', 3) }),
        [ST + ' (water_tower)']),

    // ----- INFRAESTRUTURA -----
    B('paved-road', 'paved_road', 'Rua Asfaltada', '🛣️',
        () => ground() + tree(16, 92, 0.9, { a: A('sway', 4, 0, '50% 100%') }) + tree(112, 86, 0.8, { a: A('sway', 4, 1.5, '50% 100%') }) +
            poly('52,18 76,18 118,110 10,110', P.dark[0]) + line('M50 24L18 104M78 24l32 80', { s: '#fff', w: 3 }) +
            g(line('M64 22v86', { s: P.yellow[0], w: 5, da: '14 10' }), { a: A('flow', 1, 0, 'center', 'linear') }) +
            g(rect(80, 68, 18, 12, P.red[0], { rx: 4 }) + rect(83, 62, 12, 7, P.glass[0], { rx: 2, w: 2.5 }) + circ(84, 81, 3, O, { s: 'none' }) + circ(94, 81, 3, O, { s: 'none' }), { a: A('bobs', 0.8) }),
        () => poly('11.5,3 20.5,3 29,29 3,29', P.dark[0]) + line('M10.5 5L4.5 27M21.5 5l6 22', { s: '#fff', w: 1.2 }) +
            g(line('M16 4v24', { s: P.yellow[0], w: 2, da: '3 3' }), { a: A('march', 1.2, 0, 'center', 'linear') })),
    B('dirt-road', 'dirt_road', 'Estrada de Terra', '🛤️',
        () => ground() + poly('50,18 78,18 118,110 10,110', P.sand[0]) + poly('64,18 78,18 118,110 80,110', P.sand[1], { s: 'none' }) +
            line('M50 18L10 110M78 18l40 92') + line('M58 20L44 108M70 20l14 88', { s: P.brown[1], w: 3, da: '6 6' }) +
            [[40, 90], [86, 96], [60, 70], [72, 48], [52, 50], [96, 80]].map(([x, y]) => ell(x, y, 3.5, 2.2, P.brown[0], { w: 2 })).join('') +
            smokes(58, 100, 6, 'sand', 3.2, 3) + tree(18, 70, 0.7, { a: A('sway', 4, 0, '50% 100%') }) +
            path('M104 50l4-8 4 8M112 50l3-6 3 6', 'none', { s: P.leaf[0], w: 3 }),
        () => poly('11.5,3 20.5,3 29,29 3,29', P.sand[0]) + line('M14 5l-3 22M18 5l3 22', { s: P.brown[1], w: 1.3, da: '2 2' }) +
            circ(9, 22, 1.4, P.brown[0], { w: 1 }) + circ(22, 15, 1.2, P.brown[0], { w: 1 }) + smokeSm(16, 24, 2.2, 'sand', 3.4)),
    B('sidewalk', 'sidewalk', 'Calçada', '🚶',
        () => ground() + poly('20,82 108,82 120,108 8,108', P.concrete[0]) +
            line('M42 82l-8 26M64 82v26M86 82l8 26M14 95h100', { w: 2.5 }) + line('M8 108h112', { w: 3 }) +
            rect(98, 30, 5, 54, P.dark[0]) + path('M92 30h17l-3-8h-11z', P.dark[0]) +
            g(ell(100.5, 34, 7, 3, P.yellow[0], { w: 2 }), { a: A('fade', 3) }) +
            g(circ(52, 34, 8, P.skin[0]) + rect(44, 44, 16, 22, P.blue[0], { rx: 6 }) +
                g(line('M48 64l-6 18', { w: 5 }), { a: A('swing', 0.9, 0, '50% 0%') }) + g(line('M56 64l6 18', { w: 5 }), { a: A('swing', 0.9, 0.45, '50% 0%') }) +
                line('M45 48l-6 12M59 48l6 12', { w: 4 }), { a: A('bobs', 0.45) }),
        () => poly('5,19 27,19 30,29 2,29', P.concrete[0], { w: 1.6 }) + line('M12 19l-2 10M20 19l2 10', { w: 1.3 }) +
            g(circ(16, 6, 3, P.skin[0], { w: 1.4 }) + rect(13, 9.5, 6, 6.5, P.blue[0], { rx: 2, w: 1.4 }) + line('M14.5 16l-2 3.5M17.5 16l2 3.5', { w: 1.8 }), { a: A('bobs', 0.9) })),
    B('plaza', 'plaza', 'Praça', '🌳',
        () => ground() + ell(64, 98, 50, 11, P.concrete[0]) + tree(22, 90, 1, { a: A('sway', 4, 0, '50% 100%') }) +
            rect(92, 84, 26, 5, P.brown[0], { rx: 2 }) + line('M95 89v8M115 89v8', { w: 3 }) +
            path('M42 82h44l-6 14H48z', P.concrete[0]) + ell(64, 82, 22, 5, P.water[0]) +
            g(line('M64 80V44', { s: P.water[0], w: 5, da: '10 6' }), { a: A('march', 0.8, 0, 'center', 'linear') }) +
            g(drop(52, 56, 3.5, 'water', { noHl: true, w: 2 }), { a: A('drip', 1.6, 0, 'center', 'ease-in') }) +
            g(drop(76, 56, 3.5, 'water', { noHl: true, w: 2 }), { a: A('drip', 1.6, 0.8, 'center', 'ease-in') }) +
            g(ell(64, 82, 10, 2.5, 'none', { s: '#fff', w: 2 }), { a: A('ripple', 1.8, 0, 'center', 'ease-out') }) + spark(100, 40, 5, 3),
        () => path('M7 22h18l-3 6H10z', P.concrete[0]) + ell(16, 22, 9, 2.2, P.water[0], { w: 1.5 }) +
            g(drop(16, 14, 3, 'water', { noHl: true, w: 1.4 }), { a: A('bobs', 1.6) }) + line('M16 20v-3', { s: P.water[1], w: 1.6 }) +
            rect(25, 18, 2, 6, P.brown[0], { w: 1 }) + ball(26, 14, 4.5, 'leaf', { w: 1.5 })),

    // ----- RESIDENCIAL -----
    B('house', 'house', 'Casa', '🏠',
        () => ground() + rect(78, 28, 10, 26, P.brown[0]) + smokes(83, 24, 5, 'smoke', 3.6, 3) +
            box(28, 60, 64, 46, '#FFF1C9', { k: 0.3 }) + roof(20, 26, 80, 36, 'red') +
            doorL(52, 80, 16, 26) + lit(34, 70, 14, 14, 5, 0) + lit(72, 70, 14, 14, 5, 2.5) +
            line('M41 70v14M34 77h14M79 70v14M72 77h14', { w: 2 }) +
            g(ball(108, 92, 9, 'leaf') + circ(104, 88, 2, P.pink[0], { s: 'none' }), { a: A('sway', 4, 0, '50% 100%') }),
        () => rect(20, 6, 4, 7, P.brown[0], { w: 1.6 }) + smokeSm(22, 3.5, 1.6) + box(7, 15, 18, 13, '#FFF1C9') + poly('3.5,16.5 16,5 28.5,16.5', P.red[0]) +
            rect(13.5, 20, 5, 8, P.brown[0], { w: 1.5 }) + rect(8.5, 18, 3.5, 3.5, P.glass[0], { w: 1.2 }) + rect(20, 18, 3.5, 3.5, P.glass[0], { w: 1.2 })),
    B('apartment', 'apartment', 'Prédio Residencial', '🏢',
        () => ground() + box(36, 20, 56, 86, 'orange') + rect(32, 14, 64, 8, P.dark[0], { rx: 3 }) + line('M84 14V4M80 8h8', { w: 2.5 }) +
            [0, 1, 2, 3, 4].map(r => [0, 1, 2].map(c => (r + c) % 3 === 0 ? lit(42 + c * 16, 28 + r * 14, 10, 9, 6, r + c * 1.7) : win(42 + c * 16, 28 + r * 14, 10, 9)).join('')).join('') +
            doorL(56, 94, 16, 12, 'brown') + line('M40 96h12M76 96h12', { w: 2 }) +
            g(cloud(108, 30, 0.45), { a: A('drift', 6) }),
        () => box(8, 4, 16, 24, 'orange', { rx: 1 }) + [0, 1, 2].map(r => win(10.5, 7 + r * 6, 4, 4) + win(17.5, 7 + r * 6, 4, 4)).join('').replace(/stroke-width="2.5"/g, 'stroke-width="1.2"') +
            g(rect(17.5, 13, 4, 4, P.yellow[0], { w: 1.2 }), { a: A('blinkx', 4) }) + line('M5 28h22')),

    // ----- ZONEAMENTO -----
    ...['residential', 'industrial', 'commercial'].flatMap(kind => ['light', 'balanced', 'heavy'].map(level => {
        const key = `zone_${kind}_${level}`;
        const emo = { residential: ['🏘️', '🏘️', '🏢'], industrial: ['🏭', '🏭', '🏭'], commercial: ['🏪', '🏬', '🏢'] }[kind][Object.keys(LEVEL).indexOf(level)];
        return B(`zone-${kind}-${level}`, key, `Zona ${ZONE[kind].name} ${LEVEL[level][0]}`, emo, () => zoneLg(kind, level), () => zoneSm(kind, level));
    })),

    // ----- ENERGIA -----
    B('hydroelectric-plant', 'hydroelectric_plant', 'Hidrelétrica', '🌊',
        () => ground() + rect(4, 40, 44, 66, P.water[0], { rx: 6 }) + g(line(waveD(6, 50, 46, 3, 12), { s: '#fff', w: 2.5 }), { a: A('wave', 2, 0, 'center', 'linear') }) +
            poly('36,26 60,26 82,106 14,106', P.concrete[0]) + poly('48,26 60,26 82,106 56,106', P.concrete[1], { s: 'none' }) + poly('36,26 60,26 82,106 14,106', 'none') +
            g(line('M50 34L66 100', { s: P.water[0], w: 6, da: '14 10' }), { a: A('flow', 0.9, 0, 'center', 'linear') }) +
            g(line('M58 34l14 60', { s: '#fff', w: 2.5, da: '8 16' }), { a: A('flow', 0.9, 0.4, 'center', 'linear') }) +
            path('M70 98c10 4 30 2 48-4v14H74z', P.water[0]) +
            box(86, 62, 30, 30, 'yellow', { rx: 3 }) + g(gear(101, 77, 8, 'gray'), { a: A('spin', 3, 0, 'center', 'linear') }) +
            line('M101 62V30M92 36h18', { w: 3 }) + g(path(boltD(114, 26, 0.6), P.yellow[0], { w: 2 }), { a: A('zap', 2.4, 0, 'center', 'linear') }),
        () => rect(2, 10, 11, 18, P.water[0], { rx: 2, w: 1.6 }) + poly('10,6 17,6 23,28 5,28', P.concrete[0]) +
            g(line('M14 9l4.5 17', { s: P.water[0], w: 2.2, da: '3 3' }), { a: A('march', 1, 0, 'center', 'linear') }) +
            path(boltD(26, 9, 0.42), P.yellow[0], { w: 1.3 }), [ST + ' (hydroelectric_plant)']),
    B('power-pole', 'power_pole', 'Poste de Energia', '⚡',
        () => ground() + line('M38 33q-18 14-36 10M90 33q18 14 36 10M38 33q26 12 52 0', { w: 2.5 }) +
            rect(60, 22, 8, 86, P.brown[0]) + rect(30, 28, 68, 7, P.brown[0], { rx: 2 }) +
            [38, 54, 74, 90].map(x => rect(x - 2.5, 20, 5, 9, P.glass[0], { w: 2 })).join('') +
            g(path(sparkD(20, 44, 7), P.yellow[0], { w: 2 }), { a: A('shine', 2, 0) }) + g(path(sparkD(108, 44, 7), P.yellow[0], { w: 2 }), { a: A('shine', 2, 1) }) +
            g(ell(64, 44, 6, 5, P.blue[0], { w: 2.5 }) + circ(66, 42, 1.5, O, { s: 'none' }) + path('M69 44l5 1-5 1', P.orange[0], { w: 1.5 }), { a: A('hop', 2.4) }) +
            g(path(boltD(64, 72, 0.9), P.yellow[0], { w: 2.5 }), { a: A('zap', 2.6, 0, 'center', 'linear') }),
        () => line('M8 9q-4 4-7 3M24 9q4 4 7 3M8 9q8 4 16 0', { w: 1.3 }) + rect(14.5, 5, 3, 24, P.brown[0], { w: 1.5 }) + rect(6, 7.5, 20, 3, P.brown[0], { w: 1.5 }) +
            g(path(boltD(16, 20, 0.35), P.yellow[0], { w: 1.2 }), { a: A('zap', 2.4, 0, 'center', 'linear') })),
    B('thermal-plant', 'thermal_plant', 'Termelétrica', '🏭',
        () => ground() + rect(84, 26, 16, 80, P.concrete[0]) + rect(84, 34, 16, 6, P.red[0], { w: 2 }) + rect(84, 52, 16, 6, P.red[0], { w: 2 }) +
            smokes(92, 22, 8, 'smoke', 3.6, 3) + box(16, 60, 64, 46, 'orange') + rect(12, 54, 72, 8, P.dark[0], { rx: 3 }) +
            rect(26, 72, 24, 22, P.dark[0], { rx: 3 }) +
            g(path('M38 92c-8 0-10-6-6-12 0 4 2 4 3 2-1-4 1-8 5-10-1 4 4 6 4 12 0 5-3 8-6 8z', P.orange[0], { w: 2 }) +
                path('M38 92c-3 0-4-3-2-6 1 2 3 1 3-1 2 2 3 4 2 5-1 2-2 2-3 2z', P.yellow[0], { s: 'none' }), { a: A('flicker', 0.8, 0, '50% 100%') }) +
            lit(58, 72, 14, 10, 4) + thick('M80 94h4', P.gray[0], 6, { ow: 5 }),
        () => rect(20, 8, 6, 20, P.concrete[0], { w: 1.6 }) + rect(20, 12, 6, 2.5, P.red[0], { s: 'none' }) + smokeSm(23, 5.5, 2.2) +
            box(4, 15, 17, 13, 'orange') + path('M10 25c-2 0-3-1.5-2-3.5 0 1 1 1 1 .5 0-1.5 1-3 2-3.5 0 1.5 1.5 2 1.5 4 0 1.5-1 2.5-2.5 2.5z', P.yellow[0], { w: 1.2 })),
    B('nuclear-plant', 'nuclear_plant', 'Usina Nuclear', '☢️',
        () => ground() + Array.from({ length: 3 }, (_, i) => g(circ(42 + (i - 1) * 8, 22, 9 - i, '#fff', { w: 2.5 }), { a: A('steam', 4, i * 1.3, 'center', 'ease-out') })).join('') +
            path('M18 106c8-20 8-46 2-74h44c-6 28-6 54 2 74z', P.concrete[0]) + path('M52 32h12c-6 28-6 54 2 74H56c-6-20-8-46-4-74z', P.concrete[1], { s: 'none' }) +
            path('M18 106c8-20 8-46 2-74h44c-6 28-6 54 2 74z') + line('M20 50h40', { s: P.red[0], w: 4 }) +
            path('M74 106V76a20 20 0 0 1 40 0v30z', '#fff') + path('M102 60a20 20 0 0 1 12 16v30h-10V76c0-6-1-12-2-16z', P.white[1], { s: 'none' }) +
            path('M74 106V76a20 20 0 0 1 40 0v30z') +
            circ(94, 82, 12, P.yellow[0]) +
            g(pivot(94, 82, 11) + [0, 120, 240].map(a => path('M94 82l-5.5-9.5a11 11 0 0 1 11 0z', O, { s: 'none', x: `transform="rotate(${a} 94 82)"` })).join(''), { a: A('spin', 8, 0, 'center', 'linear') }) +
            circ(94, 82, 2.5, P.yellow[0], { w: 1.5 }) + spark(116, 36, 5, 3),
        () => g(circ(12, 5, 2.4, '#fff', { w: 1.3 }), { a: A('steam', 3.6, 0, 'center', 'ease-out') }) +
            path('M4 28c2-6 2-12 .5-19h15c-1.5 7-1.5 13 .5 19z', P.concrete[0]) + line('M5 14h14', { s: P.red[0], w: 1.6 }) +
            circ(25, 22, 5, P.yellow[0], { w: 1.5 }) + [0, 120, 240].map(a => path('M25 22l-2.2-3.8a4.4 4.4 0 0 1 4.4 0z', O, { s: 'none', x: `transform="rotate(${a} 25 22)"` })).join('')),
    B('coal-plant', 'coal_plant', 'Usina a Carvão', '🏭',
        () => ground() + rect(62, 22, 12, 52, P.gray[0]) + rect(84, 30, 12, 44, P.gray[0]) +
            smokes(68, 18, 8, 'soot', 3.2, 3) + smokes(90, 26, 7, 'soot', 3.8, 2) +
            box(46, 70, 66, 36, 'dark') + rect(42, 64, 74, 8, P.soot[1], { rx: 3 }) + lit(56, 80, 12, 10, 4) + lit(90, 80, 12, 10, 4, 2) +
            path('M8 106c2-14 10-22 18-22s14 8 18 22z', P.soot[1]) + [[18, 98], [28, 92], [34, 100], [24, 102]].map(([x, y]) => circ(x, y, 2.5, P.dark[0], { s: 'none' })).join('') +
            g(rect(30, 74, 10, 8, P.dark[0], { w: 2 }), { a: A('slide', 3, 0, 'center', 'linear') }) + line('M22 84l24-6', { w: 2.5 }),
        () => rect(10, 8, 4, 12, P.gray[0], { w: 1.5 }) + rect(18, 10, 4, 10, P.gray[0], { w: 1.5 }) + smokeSm(12, 5.5, 2.2, 'soot', 3.2) +
            box(5, 18, 22, 10, 'dark') + rect(9, 21.5, 4, 3, P.yellow[0], { w: 1.1 })),
    B('solar-farm', 'solar_farm', 'Usina Solar', '☀️',
        () => ground() + g(pivot(98, 28, 22) + [0, 45, 90, 135, 180, 225, 270, 315].map(a => line('M98 10v-6', { s: P.yellow[0], w: 4, x: `transform="rotate(${a} 98 28)"` })).join(''), { a: A('spin', 12, 0, 'center', 'linear') }) +
            ball(98, 28, 12, 'yellow') +
            [[14, 74], [46, 82], [78, 74]].map(([x, y], i) =>
                line(`M${x + 16} ${y + 16}v${100 - y - 10}`, { w: 3 }) +
                poly(`${x},${y + 22} ${x + 8},${y} ${x + 40},${y} ${x + 32},${y + 22}`, P.blue[1]) +
                line(`M${x + 16} ${y}l-8 22M${x + 24} ${y}l-8 22M${x + 4} ${y + 11}h32`, { s: P.glass[0], w: 1.8 }) +
                poly(`${x},${y + 22} ${x + 8},${y} ${x + 40},${y} ${x + 32},${y + 22}`, 'none') +
                spark(x + 28, y + 6, 5, 3, i)).join(''),
        () => g(circ(25, 7, 4.5, P.yellow[0], { w: 1.5 }), { a: A('breathe', 3) }) + line('M13 23v6M21 23v6', { w: 1.6 }) +
            poly('3,24 8,13 29,13 24,24', P.blue[1]) + line('M15 13l-5 11M22 13l-5 11M5.5 18.5h21', { s: P.glass[0], w: 1 }) + poly('3,24 8,13 29,13 24,24', 'none'),
        [ST + ' (solar_farm)']),
    B('wind-farm', 'wind_farm', 'Campo Eólico', '💨',
        () => ground() + g(cloud(100, 22, 0.5), { a: A('drift', 7) }) +
            poly('44,106 49,40 55,40 60,106', '#fff') + blades(52, 40, 30, 4) +
            poly('94,104 98,62 102,62 106,104', '#fff') + blades(100, 62, 20, 3) +
            g(thick('M8 72h18', P.blue[0], 3), { a: A('drift', 3) }) + g(thick('M70 30h14', P.blue[0], 3), { a: A('drift', 3, 1.5) }),
        () => poly('13.5,29 15,13 17,13 18.5,29', '#fff', { w: 1.5 }) + blades(16, 13, 10, 4, 1.5), [ST + ' (wind_farm)']),

    // ----- PÚBLICOS -----
    B('city-hall', 'city_hall', 'Prefeitura Municipal', '🏛️',
        () => ground() + line('M64 34V8', { w: 3 }) +
            g(path('M64 8h26l-5 7 5 7H64z', P.leaf[0], { w: 2.5 }) + poly('70,15 77,10.5 84,15 77,19.5', P.yellow[0], { w: 1.5 }) + circ(77, 15, 2.4, P.blue[0], { w: 1 }), { a: A('flag', 2.4, 0, '0% 50%') }) +
            box(22, 58, 84, 36, 'white') + poly('16,60 64,34 112,60', P.concrete[0]) + poly('64,38 106,58 70,58', P.concrete[1], { s: 'none' }) + poly('16,60 64,34 112,60', 'none') +
            circ(64, 50, 5, '#fff', { w: 2 }) + line('M64 50v-3M64 50h2', { w: 1.5 }) +
            [30, 46, 76, 92].map(x => rect(x, 62, 8, 30, '#fff', { w: 2.5 })).join('') + doorL(56, 72, 16, 22, 'brown') +
            rect(16, 94, 96, 6, P.concrete[1]) + rect(12, 100, 104, 6, P.concrete[0]) + spark(108, 30, 5, 3),
        () => line('M16 7V2', { w: 1.3 }) + g(path('M16 2h6l-1.3 1.7L22 5.4h-6z', P.leaf[0], { w: 1.1 }), { a: A('flag', 2, 0, '0% 50%') }) +
            path('M10 12a6 5 0 0 1 12 0z', P.concrete[0], { w: 1.6 }) + poly('3,15 16,9 29,15', P.concrete[0]) +
            [6, 12, 17.5, 23].map(x => rect(x, 16, 3, 9, '#fff', { w: 1.4 })).join('') + rect(3, 25, 26, 4, P.concrete[1], { rx: 1 }),
        [ST + ' (water_tank: studyIcon 🏛️)', 'js/systems/QuestSystem.js (stakeholder government)', 'js/systems/TutorialSystem.js (prefeitura)']),
    B('school', 'school', 'Escola', '🏫',
        () => ground() + box(16, 62, 96, 44, '#F07A5A') + rect(12, 56, 104, 8, P.dark[0], { rx: 3 }) +
            box(48, 28, 32, 30, '#F07A5A') + roof(44, 10, 40, 20, 'blue') +
            g(path('M58 34a6 6 0 0 1 12 0v8H58z', P.yellow[0], { w: 2.5 }) + circ(64, 44, 2.5, P.yellow[1], { w: 2 }), { a: A('swing', 1.6, 0, '50% 0%') }) +
            win(24, 72, 14, 12) + win(42, 72, 14, 12) + win(72, 72, 14, 12) + lit(90, 72, 14, 12, 5) +
            doorL(56, 84, 16, 22, 'blue') + spark(110, 30, 5, 3),
        () => box(4, 15, 24, 13, '#F07A5A') + box(11.5, 8, 9, 8, '#F07A5A') + poly('10,8.5 16,3 22,8.5', P.blue[0], { w: 1.5 }) +
            g(path('M14.3 10a1.7 1.7 0 0 1 3.4 0v3h-3.4z', P.yellow[0], { w: 1.1 }), { a: A('swing', 1.6, 0, '50% 0%') }) +
            rect(13.5, 21, 5, 7, P.blue[0], { w: 1.3 }) + rect(6.5, 18, 4, 3.5, P.glass[0], { w: 1.1 }) + rect(21.5, 18, 4, 3.5, P.glass[0], { w: 1.1 })),
    B('hospital', 'hospital', 'Hospital', '🏥',
        () => ground() + box(20, 34, 88, 72, 'white') + rect(16, 28, 96, 8, P.concrete[1], { rx: 3 }) +
            g(path('M56 42h16v12h12v16H72v12H56V70H44V54h12z', P.red[0]), { a: A('beat', 1.6) }) +
            win(26, 46, 12, 10) + win(90, 46, 12, 10) + lit(26, 66, 12, 10, 5) + win(90, 66, 12, 10, 5) +
            rect(50, 88, 28, 18, P.glass[0], { w: 2.5 }) + line('M64 88v18', { w: 2 }) +
            g(rect(56, 16, 16, 8, P.red[0], { rx: 2, w: 2.5 }), { a: A('blinkx', 1.4) }) + line('M64 24v4', { w: 2.5 }),
        () => box(4, 6, 24, 22, 'white', { rx: 1.5 }) + g(path('M13.5 9.5h5v4h4v5h-4v4h-5v-4h-4v-5h4z', P.red[0], { w: 1.4 }), { a: A('beat', 1.6) })),
    B('fire-station', 'fire_station', 'Corpo de Bombeiros', '🚒',
        () => ground() + box(14, 46, 100, 60, P.red[0]) + rect(10, 40, 108, 8, P.dark[0], { rx: 3 }) +
            rect(24, 62, 40, 44, P.concrete[0]) + line('M24 72h40M24 82h40M24 92h40', { w: 2 }) +
            rect(74, 56, 30, 18, P.glass[0], { w: 2.5 }) + doorL(80, 82, 18, 24, 'brown') +
            g(rect(56, 26, 16, 14, P.red[0], { rx: 6 }), { a: A('blinkx', 0.9) }) + g(ell(64, 32, 14, 9, 'none', { s: P.red[0], w: 2.5 }), { a: A('ripple', 0.9, 0, 'center', 'ease-out') }) +
            g(path('M106 30c-6 0-8-5-5-10 0 3 2 3 2.5 1.5-1-3 1-6.5 4.5-8-1 3 3 5 3 9.5 0 4-2.5 7-5 7z', P.orange[0], { w: 2 }), { a: A('flicker', 0.8, 0, '50% 100%') }),
        () => box(4, 11, 24, 17, P.red[0]) + rect(8, 17, 10, 11, P.concrete[0], { w: 1.4 }) + line('M8 20.5h10M8 24h10', { w: 1 }) +
            g(rect(13, 5.5, 6, 5, P.red[0], { rx: 2, w: 1.4 }), { a: A('blinkx', 0.9) }) + rect(20.5, 15, 5, 4, P.glass[0], { w: 1.1 })),
    B('police-station', 'police_station', 'Delegacia de Polícia', '🚔',
        () => ground() + box(16, 48, 96, 58, 'blue') + rect(12, 42, 104, 8, P.dark[0], { rx: 3 }) +
            path(starD(64, 66, 13, 6), P.yellow[0]) + win(24, 58, 16, 12) + lit(88, 58, 16, 12, 5) +
            doorL(54, 84, 20, 22, 'dark') + win(24, 82, 16, 12) + win(88, 82, 16, 12) +
            rect(52, 30, 24, 12, P.dark[0], { rx: 4 }) +
            g(rect(54, 30, 10, 10, P.red[0], { rx: 3, w: 2 }), { a: A('blinkx', 0.8) }) + g(rect(64, 30, 10, 10, P.blue[1], { rx: 3, w: 2 }), { a: A('blinkx', 0.8, 0.4) }),
        () => box(4, 12, 24, 16, 'blue') + path(starD(16, 20, 4.5, 2), P.yellow[0], { w: 1.2 }) + rect(11, 6, 10, 5, P.dark[0], { rx: 1.5, w: 1.4 }) +
            g(rect(12, 7, 4, 3, P.red[0], { s: 'none' }), { a: A('blinkx', 0.8) }) + g(rect(16, 7, 4, 3, '#4A7DFF', { s: 'none' }), { a: A('blinkx', 0.8, 0.4) })),
    B('research-center', 'research_center', 'Centro de Pesquisa', '🔬',
        () => ground() + box(14, 58, 64, 48, 'white') + path('M22 58a24 24 0 0 1 48 0z', P.concrete[0]) +
            g(rect(48, 28, 30, 8, P.dark[0], { rx: 3, x: 'transform="rotate(-25 48 40)"' }), { a: A('tilt', 5, 0, '0% 100%') }) +
            lit(22, 70, 14, 12, 5) + win(56, 70, 14, 12) + doorL(36, 86, 16, 20, 'blue') +
            path('M90 52h16v14l12 30c2 5-1 10-6 10H84c-5 0-8-5-6-10l12-30z', '#fff') +
            path('M84 82h28l5 12c2 5-1 10-6 10H85c-5 0-8-5-6-10z', P.green[0], { w: 2.5 }) +
            [[92, 0], [100, 1], [106, 2]].map(([x, d]) => g(circ(x, 94, 2.6, '#fff', { w: 2 }), { a: A('rise', 2.4, d, 'center', 'ease-out') })).join('') +
            rect(88, 46, 20, 7, P.gray[0], { rx: 2 }) + spark(116, 36, 5, 3),
        () => path('M12 4h8v7l6 13c1 2.5-.5 5-3 5H9c-2.5 0-4-2.5-3-5l6-13z', '#fff') + path('M8 19h16l2 5c1 2.5-.5 5-3 5H9c-2.5 0-4-2.5-3-5z', P.green[0], { w: 1.6 }) +
            g(circ(15, 23, 1.6, '#fff', { w: 1 }), { a: A('rise', 2.4, 0, 'center', 'ease-out') }) + rect(11, 3, 10, 3, P.gray[0], { rx: 1, w: 1.4 }),
        [ST + ' (research_center)']),
    B('university', 'university', 'Universidade', '🎓',
        () => ground() + box(14, 66, 100, 40, 'white') + poly('8,68 64,48 120,68', P.purple[0]) +
            [24, 44, 76, 96].map(x => rect(x, 70, 8, 32, '#fff', { w: 2.5 })).join('') + doorL(56, 80, 16, 26, 'purple') +
            g(poly('64,10 100,24 64,38 28,24', P.dark[0]) + path('M44 30v10c0 5 40 5 40 0V30l-20 8z', P.dark[0]) +
                g(line('M96 26v14', { s: P.yellow[0], w: 3 }) + circ(96, 42, 3, P.yellow[0], { w: 2 }), { a: A('sway', 2, 0, '50% 0%') }), { a: A('bob', 3) }) +
            spark(18, 40, 5, 3) + spark(112, 48, 4, 3, 1.5),
        () => g(poly('16,5 30,11 16,17 2,11', P.dark[0], { w: 1.6 }) + path('M8 14v5c0 2.5 16 2.5 16 0v-5l-8 3z', P.dark[0], { w: 1.6 }) +
            g(line('M27 12v8', { s: P.yellow[0], w: 1.6 }) + circ(27, 21, 1.4, P.yellow[0], { w: 1 }), { a: A('sway', 2, 0, '50% 0%') }), { a: A('bobs', 3) }),
        [ST + ' (university)']),

    // ----- COMERCIAL -----
    B('shopping-center', 'shopping_center', 'Centro Comercial', '🏬',
        () => ground() + box(10, 50, 108, 56, 'white') + rect(6, 44, 116, 8, P.dark[0], { rx: 3 }) +
            [0, 1, 2, 3, 4, 5, 6, 7].map(k => path(`M${10 + k * 13.5} 54h13.5v8a6.75 6.75 0 0 1-13.5 0z`, k % 2 ? '#fff' : P.pink[0], { w: 2.5 })).join('') +
            rect(30, 22, 68, 20, P.pink[0], { rx: 6 }) +
            [40, 52, 64, 76, 88].map((x, i) => g(circ(x, 32, 3.5, P.yellow[0], { w: 2 }), { a: A('blinkx', 1.5, i * 0.3) })).join('') +
            rect(48, 76, 32, 30, P.glass[0], { w: 2.5 }) + line('M64 76v30', { w: 2 }) + win(18, 76, 20, 18) + win(90, 76, 20, 18) +
            g(path('M96 86h12l2 14H94z', P.orange[0], { w: 2 }) + line('M99 86a3 3 0 0 1 6 0', { w: 2 }), { a: A('bobs', 2.4) }),
        () => box(3, 11, 26, 17, 'white') + [0, 1, 2, 3].map(k => path(`M${3 + k * 6.5} 9h6.5v3.5a3.25 3.25 0 0 1-6.5 0z`, k % 2 ? '#fff' : P.pink[0], { w: 1.4 })).join('') +
            rect(12, 19, 8, 9, P.glass[0], { w: 1.3 }) + g(rect(8, 3, 16, 5, P.yellow[0], { rx: 2, w: 1.4 }), { a: A('blinkx', 2) })),
    B('office-building', 'office_building', 'Edifício de Escritórios', '🏢',
        () => ground() + `<clipPath id="§c"><rect x="34" y="14" width="60" height="92"/></clipPath>` +
            box(34, 14, 60, 92, 'glass', { k: 0.35 }) + line('M34 30h60M34 46h60M34 62h60M34 78h60M34 94h60M54 14v92M74 14v92', { w: 2 }) +
            g(g(rect(40, 4, 16, 110, '#fff', { s: 'none', op: 0.6 }), { a: A('sweep', 3.5, 0, 'center', 'ease-in-out') }), { x: 'clip-path="url(#§c)"' }) +
            rect(34, 14, 60, 92, 'none') + rect(30, 8, 68, 8, P.dark[0], { rx: 3 }) + line('M86 8V0', { w: 2.5 }) +
            g(circ(86, 2, 2.5, P.red[0], { w: 1.5 }), { a: A('blinkx', 1.4) }) + rect(56, 92, 16, 14, P.dark[0], { w: 2.5 }),
        () => box(8, 4, 16, 24, 'glass', { k: 0.35 }) + line('M8 10h16M8 16h16M8 22h16M16 4v24', { w: 1.2 }) +
            g(path(sparkD(12, 8, 2.4), '#fff', { s: 'none' }), { a: A('shine', 3) }) + line('M4 28h24')),
    B('bank', 'bank', 'Banco', '🏦',
        () => ground() + box(20, 60, 88, 34, 'white') + poly('14,62 64,38 114,62', P.leaf[0]) +
            [28, 46, 74, 92].map(x => rect(x, 64, 8, 28, '#fff', { w: 2.5 })).join('') + doorL(56, 70, 16, 24, 'leaf') +
            rect(14, 94, 100, 6, P.concrete[1]) + rect(10, 100, 108, 6, P.concrete[0]) +
            g(circ(64, 20, 15, P.yellow[0]) + circ(64, 20, 10, 'none', { s: P.yellow[1], w: 2.5 }) +
                line('M68 14c-1.5-2-8-2-8 1.5 0 3.5 8.5 2 8.5 6 0 3.5-7 3.5-9 1M64 10v20', { w: 2.5 }), { a: A('coin', 2.6) }) +
            spark(30, 26, 5, 3) + spark(100, 30, 5, 3, 1.5),
        () => poly('3,13 16,7 29,13', P.leaf[0]) + [6, 12, 17.5, 23].map(x => rect(x, 14, 3, 10, '#fff', { w: 1.4 })).join('') + rect(3, 24, 26, 4, P.concrete[1], { rx: 1 }) +
            g(circ(16, 4, 3.4, P.yellow[0], { w: 1.4 }), { a: A('coin', 2.6) }), ['index.html (#btn-loans, empréstimos)', 'js/systems/ui/LoanUI.js']),
    B('restaurant', 'restaurant', 'Restaurante', '🍽️',
        () => ground() + box(16, 56, 96, 50, '#FFF1C9') + rect(12, 50, 104, 8, P.dark[0], { rx: 3 }) +
            [0, 1, 2, 3, 4, 5, 6].map(k => path(`M${16 + k * 13.7} 60h13.7v8a6.85 6.85 0 0 1-13.7 0z`, k % 2 ? '#fff' : P.red[0], { w: 2.5 })).join('') +
            rect(24, 80, 26, 18, P.glass[0], { w: 2.5 }) + doorL(70, 80, 18, 26, 'brown') +
            path('M36 44a20 20 0 0 1 40 0z', P.concrete[0]) + rect(30, 44, 52, 5, P.concrete[1], { rx: 2 }) + circ(56, 22, 3, P.concrete[0], { w: 2 }) +
            [0, 1, 2].map(i => g(line(`M${44 + i * 12} 18q-4-5 0-10t0-10`, { s: P.smoke[1], w: 3 }), { a: A('steam', 3, i, 'center', 'ease-out') })).join('') +
            line('M100 74v26M96 74v8q4 4 8 0v-8M110 74c-4 2-4 10 0 12v14', { w: 2.5 }),
        () => [0, 1].map(i => g(line(`M${13 + i * 6} 9q-2-2.5 0-5t0-5`, { s: P.gray[0], w: 1.6 }), { a: A('steam', 3, i * 1.5, 'center', 'ease-out') })).join('') +
            path('M6 22a10 10 0 0 1 20 0z', P.concrete[0]) + rect(3, 22, 26, 3.5, P.concrete[1], { rx: 1.5 }) + circ(16, 11, 1.6, P.concrete[0], { w: 1.4 })),

    // ----- TURISMO -----
    B('museum', 'museum', 'Museu', '🏛️',
        () => ground() + box(16, 58, 96, 36, P.concrete[0]) + poly('10,60 64,32 118,60', P.purple[0]) + poly('64,36 110,58 70,58', P.purple[1], { s: 'none' }) + poly('10,60 64,32 118,60', 'none') +
            [24, 40, 80, 96].map(x => rect(x, 62, 8, 30, '#fff', { w: 2.5 })).join('') +
            rect(50, 64, 28, 22, P.yellow[0], { w: 2.5 }) + rect(54, 68, 20, 14, P.glass[0], { w: 2 }) + path('M54 82l7-8 5 5 3-3 5 6z', P.leaf[0], { w: 1.5 }) + circ(69, 72, 2, P.orange[0], { s: 'none' }) +
            g(path('M28 18h12v20l-6-4-6 4z', P.pink[0], { w: 2.5 }), { a: A('sway', 3, 0, '50% 0%') }) + g(path('M88 18h12v20l-6-4-6 4z', P.blue[0], { w: 2.5 }), { a: A('sway', 3, 1.5, '50% 0%') }) +
            line('M24 18h20M84 18h20', { w: 3 }) + rect(10, 94, 108, 6, P.concrete[1]) + rect(6, 100, 116, 6, P.concrete[0]) + spark(64, 18, 7, 3),
        () => poly('3,13 16,6 29,13', P.purple[0]) + [6, 23].map(x => rect(x, 14, 3, 10, '#fff', { w: 1.4 })).join('') +
            rect(11, 15, 10, 8, P.yellow[0], { w: 1.4 }) + rect(3, 24, 26, 4, P.concrete[1], { rx: 1 }) +
            g(path(sparkD(16, 19, 2.4), '#fff', { s: 'none' }), { a: A('shine', 3) })),
    B('park', 'park', 'Parque Turístico', '🎡',
        () => ground() + line('M42 106L64 54l22 52M34 106h60', { w: 4 }) + ferris(64, 54, 38, 3, 14) +
            tree(16, 100, 0.8, { a: A('sway', 4, 0, '50% 100%') }) + tree(112, 100, 0.8, { a: A('sway', 4, 1.6, '50% 100%') }) + spark(112, 22, 5, 3),
        () => line('M9.5 29L16 13l6.5 16M7 29h18', { w: 2 }) + ferris(16, 13, 9.5, 1.3, 12)),
    B('monument', 'monument', 'Monumento Histórico', '🗿',
        () => ground() + rect(32, 90, 64, 16, P.concrete[0]) + rect(26, 84, 76, 8, P.concrete[1], { rx: 2 }) +
            path('M44 84V40c0-14 8-24 20-24s20 10 20 24v44z', P.gray[0]) + path('M70 18c8 4 14 12 14 22v44H74V40c0-10-2-18-4-22z', P.gray[1], { s: 'none' }) +
            path('M44 84V40c0-14 8-24 20-24s20 10 20 24v44z') + rect(40, 30, 48, 8, P.gray[1], { rx: 3 }) +
            line('M50 50h10M68 50h10', { w: 4 }) + path('M64 50v14l-5 4h10', 'none', { w: 3 }) + line('M54 76h20', { w: 4 }) +
            g(ell(102, 44, 6, 5, P.blue[0], { w: 2.5 }) + circ(104, 42, 1.4, O, { s: 'none' }), { a: A('hop', 3) }) +
            spark(26, 36, 6, 3) + spark(104, 22, 5, 3, 1.2) + spark(30, 68, 4, 3, 2),
        () => path('M10 25V12c0-5 3-8 6-8s6 3 6 8v13z', P.gray[0]) + rect(8, 9, 16, 3, P.gray[1], { w: 1.3 }) + line('M12.5 15h3M17 15h3M13.5 21h5', { w: 1.6 }) +
            rect(6, 25, 20, 4, P.concrete[0], { rx: 1, w: 1.5 }) + g(path(sparkD(26, 6, 3), P.yellow[0], { w: 1.1 }), { a: A('shine', 3) })),
    B('hotel', 'hotel', 'Hotel', '🏨',
        () => ground() + box(28, 26, 72, 80, P.pink[0]) + rect(24, 20, 80, 8, P.dark[0], { rx: 3 }) +
            rect(50, 32, 28, 22, '#fff', { rx: 4 }) + line('M57 36v14M71 36v14M57 43h14', { s: P.pink[1], w: 4 }) +
            [0, 1, 2].map(i => g(path(starD(50 + i * 14, 12, 5, 2.3), P.yellow[0], { w: 2 }), { a: A('twinkle', 2.4, i * 0.8) })).join('') +
            [0, 1, 2].map(r => lit(34, 60 + r * 14, 12, 9, 6, r) + win(58, 60 + r * 14, 12, 9) + win(82, 60 + r * 14, 12, 9)).join('').slice(0) +
            rect(52, 94, 24, 12, P.glass[0], { w: 2.5 }) + path('M46 94h36l-4-6H50z', P.red[0], { w: 2.5 }),
        () => box(6, 6, 20, 22, P.pink[0]) + rect(11, 9, 10, 8, '#fff', { rx: 1.5, w: 1.4 }) + line('M13.5 10.5v5M18.5 10.5v5M13.5 13h5', { s: P.pink[1], w: 1.6 }) +
            g(path(starD(16, 3.5, 2.6, 1.2), P.yellow[0], { w: 1 }), { a: A('twinkle', 2.4) }) + rect(13, 21, 6, 7, P.glass[0], { w: 1.3 })),

    // ----- INDUSTRIAL -----
    B('factory', 'factory', 'Fábrica de Exportação', '🏭',
        () => ground() + rect(86, 26, 14, 50, P.gray[0]) + rect(86, 32, 14, 5, P.red[0], { w: 2 }) + smokes(93, 22, 7, 'smoke', 3.4, 3) +
            sawFactory(14, 98, 84, 40) + win(22, 80, 14, 10) + win(48, 80, 14, 10) + lit(72, 80, 14, 10, 4) +
            rect(4, 98, 120, 6, P.dark[0], { rx: 3 }) + circ(14, 101, 2, P.gray[0], { s: 'none' }) + circ(114, 101, 2, P.gray[0], { s: 'none' }) +
            [0, 1].map(i => g(rect(76, 88, 10, 10, '#E0A060', { w: 2 }) + line('M81 88v10', { w: 1.5 }), { a: A('slide', 3, i * 1.5, 'center', 'linear') })).join('') +
            g(path('M106 40h12l-2 4h-8z', P.blue[0], { w: 2 }) + line('M112 40v-6', { w: 2 }), { a: A('bob', 2) }),
        () => rect(21, 7, 5, 14, P.gray[0], { w: 1.5 }) + smokeSm(23.5, 4.5) + path('M3 26v-11l6-4v4l6-4v4l6-4v15z', P.orange[0]) +
            rect(5.5, 19, 4, 3.5, P.glass[0], { w: 1.1 }) + rect(12, 19, 4, 3.5, P.glass[0], { w: 1.1 }) + rect(2, 26, 28, 3, P.dark[0], { rx: 1.5, w: 1.4 })),
    B('tech-center', 'tech_center', 'Centro Tecnológico', '🔬',
        () => ground() + box(20, 50, 88, 56, 'purple') + rect(16, 44, 96, 8, P.dark[0], { rx: 3 }) +
            rect(30, 60, 68, 26, P.glass[0], { rx: 4 }) + line('M30 73h68M47 60v26M64 60v26M81 60v26', { w: 2 }) +
            line('M64 44V22', { w: 3 }) + path('M50 24a14 8 0 0 0 28 0z', P.concrete[0]) + circ(64, 18, 3, P.red[0], { w: 2 }) +
            [0, 1, 2].map(i => g(path(`M${f1(54 - i * 7)} ${f1(12 - i * 4)}a${f1(14 + i * 9)} ${f1(14 + i * 9)} 0 0 1 ${f1(20 + i * 14)} 0`, 'none', { s: P.purple[0], w: 3 }), { a: A('fade', 1.8, i * 0.6) })).join('') +
            doorL(56, 90, 16, 16, 'dark') + g(rect(36, 92, 10, 6, P.green[0], { w: 2 }), { a: A('blinkx', 1.2) }),
        () => box(5, 14, 22, 14, 'purple') + rect(8.5, 17, 15, 6, P.glass[0], { w: 1.2 }) + line('M16 14V8', { w: 1.6 }) + circ(16, 7, 1.5, P.red[0], { w: 1 }) +
            g(line('M11 6a6 6 0 0 1 10 0M8 3.5a10 10 0 0 1 16 0', { s: P.purple[0], w: 1.6 }), { a: A('fade', 1.8) })),
    B('port', 'port', 'Porto Comercial', '⚓',
        () => rect(4, 78, 120, 34, P.water[0], { rx: 10 }) +
            g(line(waveD(4, 136, 88, 3, 12), { s: '#fff', w: 2.5 }), { a: A('wave', 1.6, 0, 'center', 'linear') }) +
            rect(4, 66, 46, 14, P.brown[0]) + line('M12 80v14M26 80v14M40 80v14', { w: 4 }) +
            line('M22 66V16M22 20h44M22 30l14-10', { w: 4 }) + line('M56 20v14', { w: 2 }) +
            g(line('M56 20v18', { w: 2 }) + rect(48, 38, 16, 12, P.orange[0], { rx: 2 }), { a: A('sway', 3, 0, '50% 0%') }) +
            g(path('M62 82h56l-8 16H70z', P.red[0]) + rect(74, 70, 16, 12, P.blue[0], { w: 2.5 }) + rect(92, 70, 16, 12, P.yellow[0], { w: 2.5 }) + rect(80, 58, 12, 12, '#fff', { w: 2.5 }) +
                circ(86, 64, 2, P.glass[1], { s: 'none' }), { a: A('nod', 3) }) + spark(112, 30, 5, 3),
        () => rect(2, 21, 28, 9, P.water[0], { rx: 3, w: 1.5 }) + g(line(waveD(2, 38, 25, 1, 4), { s: '#fff', w: 1.2 }), { a: A('wave', 1.6, 0, 'center', 'linear') }) +
            g(circ(16, 5, 2.4, 'none', { w: 1.8 }) + line('M16 7.5v13M11 11h10M7 15c0 5 4 7 9 7s9-2 9-7', { w: 2 }), { a: A('tilt', 3, 0, '50% 0%') })),

    // ----- SOLUÇÕES VERDES E MONITORAMENTO -----
    B('water-research-center', 'water_research_center', 'Centro de Pesquisas Hídricas', '🔬',
        () => ground() + box(12, 56, 56, 50, 'white') + rect(8, 50, 64, 8, P.blue[1], { rx: 3 }) + lit(20, 66, 14, 12, 5) + win(44, 66, 14, 12) + doorL(32, 86, 16, 20, 'blue') +
            path('M82 30h20v22l14 34c3 7-1 14-8 14H76c-7 0-11-7-8-14l14-34z', '#fff') +
            path('M74 70h36l6 16c3 7-1 14-8 14H76c-7 0-11-7-8-14z', P.water[0], { w: 2.5 }) +
            g(line(waveD(72, 120, 72, 2, 8), { s: '#fff', w: 2 }), { a: A('wave', 1.6, 0, 'center', 'linear') }) +
            [[84, 0], [94, 1], [102, 2]].map(([x, d]) => g(circ(x, 92, 3, '#fff', { w: 2 }), { a: A('rise', 2.6, d, 'center', 'ease-out') })).join('') +
            rect(78, 24, 28, 8, P.gray[0], { rx: 3 }) + g(drop(36, 30, 8), { a: A('bob', 3) }) + spark(54, 22, 5, 3),
        () => path('M12 4h8v7l6 13c1 2.5-.5 5-3 5H9c-2.5 0-4-2.5-3-5l6-13z', '#fff') + path('M8 18h16l2 6c1 2.5-.5 5-3 5H9c-2.5 0-4-2.5-3-5z', P.water[0], { w: 1.6 }) +
            g(drop(16, 24, 2.4, 'white', { noHl: true, w: 1.2 }), { a: A('bobs', 2.4) }) + rect(11, 3, 10, 3, P.gray[0], { rx: 1, w: 1.4 }),
        [ST + ' (water_research_center)']),
    B('linear-park', 'linear_park', 'Parque Linear', '🌳',
        () => ground() + path('M30 20c30 10 10 40 40 54s20 30 10 34h22c10-6 0-22-12-34S60 40 50 20z', P.water[0]) +
            g(line('M41 22c22 10 6 38 32 52s18 28 16 34', { s: '#fff', w: 3, da: '10 14' }), { a: A('flow', 1.6, 0, 'center', 'linear') }) +
            tree(22, 66, 0.9, { a: A('sway', 4, 0, '50% 100%') }) + tree(36, 104, 1, { a: A('sway', 4, 1, '50% 100%') }) +
            tree(96, 56, 0.85, { a: A('sway', 4, 2, '50% 100%') }) + tree(112, 92, 0.75, { a: A('sway', 4, 3, '50% 100%') }) +
            line('M8 86c14-4 22 2 30-2', { s: P.sand[1], w: 4, da: '6 5' }),
        () => path('M9 3c8 3 3 11 11 15s5 8 3 11h6c2-3 0-7-3-10S17 11 14 3z', P.water[0], { w: 1.6 }) +
            rect(6, 20, 2.5, 7, P.brown[0], { w: 1.1 }) + g(ball(7.25, 16, 5, 'leaf', { w: 1.5 }), { a: A('sway', 4, 0, '50% 100%') }),
        [ST + ' (linear_park)']),
    B('rain-garden', 'rain_garden', 'Jardim de Chuva', '🌧️',
        () => g(cloud(64, 26, 1.2, 'smoke'), { a: A('drift', 6) }) +
            [[46, 0], [60, 0.5], [74, 1], [86, 0.25]].map(([x, d]) => g(drop(x, 50, 3.5, 'water', { noHl: true, w: 2 }), { a: A('fall', 1.6, d, 'center', 'ease-in') })).join('') +
            path('M8 82h112v12c0 8-6 14-14 14H22c-8 0-14-6-14-14z', P.brown[0]) + path('M14 94h100c-2 6-6 8-10 8H24c-4 0-8-2-10-8z', P.brown[1], { s: 'none' }) +
            [[30, 98, 0], [64, 100, 0.8], [96, 98, 1.6]].map(([x, y, d]) => g(circ(x, y, 3, P.water[0], { w: 2 }), { a: A('drip', 2.4, d, 'center', 'ease-in') })).join('') +
            [[24, 0], [44, 1], [64, 2], [84, 0.5], [104, 1.5]].map(([x, d], i) =>
                g(line(`M${x} 84V${66 - (i % 2) * 6}`, { s: P.leaf[1], w: 3 }) + path(`M${x} 74c-8-2-10-8-8-12 6 0 8 6 8 12z`, P.leaf[0], { w: 2 }) +
                    path(`M${x} 70c8-2 10-8 8-12-6 0-8 6-8 12z`, P.leaf[0], { w: 2 }) +
                    (i % 2 ? '' : circ(x, 62 - (i % 2) * 6, 4, i === 2 ? P.yellow[0] : P.pink[0], { w: 2 })), { a: A('sway', 3.5, d, '50% 100%') })).join(''),
        () => cloud(16, 7, 0.45, 'smoke') + g(drop(12, 15, 1.6, 'water', { flat: true, w: 1.1 }), { a: A('fall', 1.8, 0, 'center', 'ease-in') }) +
            g(drop(20, 15, 1.6, 'water', { flat: true, w: 1.1 }), { a: A('fall', 1.8, 0.9, 'center', 'ease-in') }) +
            path('M3 24h26v1c0 2.5-2 4-4 4H7c-2 0-4-1.5-4-4z', P.brown[0], { w: 1.6 }) + line('M10 24v-5M22 24v-5', { s: P.leaf[1], w: 1.6 }) +
            circ(10, 18, 2, P.pink[0], { w: 1.2 }) + circ(22, 18, 2, P.yellow[0], { w: 1.2 }),
        [ST + ' (rain_garden)']),
    B('green-roof', 'green_roof', 'Teto Verde', '🏢',
        () => ground() + box(24, 50, 80, 56, P.concrete[0]) + [0, 1, 2].map(r => win(32 + r * 24, 62, 16, 12) + (r === 1 ? lit(32 + r * 24, 82, 16, 12, 5) : win(32 + r * 24, 82, 16, 12))).join('') +
            path('M20 50c4-8 84-8 88 0z', P.leaf[0]) + rect(20, 46, 88, 6, P.grass[1], { rx: 3 }) +
            [[30, 0], [46, 1], [62, 2], [80, 0.6], [96, 1.6]].map(([x, d], i) =>
                g(line(`M${x} 46v-12`, { s: P.leaf[1], w: 3 }) + path(`M${x} 38c-6 0-8-5-6-8 4 0 6 4 6 8zM${x} 36c6 0 8-5 6-8-4 0-6 4-6 8z`, P.leaf[0], { w: 2 }) +
                    (i % 2 ? circ(x, 30, 3.5, i === 1 ? P.yellow[0] : P.pink[0], { w: 2 }) : ''), { a: A('sway', 3.5, d, '50% 100%') })).join('') +
            g(drop(110, 30, 5), { a: A('bob', 3) }) + spark(16, 30, 5, 3),
        () => box(6, 13, 20, 15, P.concrete[0]) + rect(9, 17, 4, 3.5, P.glass[0], { w: 1.1 }) + rect(19, 17, 4, 3.5, P.glass[0], { w: 1.1 }) + rect(13.5, 22, 5, 6, P.dark[0], { w: 1.2 }) +
            rect(4.5, 11, 23, 3, P.leaf[0], { rx: 1.5, w: 1.5 }) +
            g(line('M11 11V7M21 11V7', { s: P.leaf[1], w: 1.5 }) + circ(11, 6, 2.2, P.green[0], { w: 1.2 }) + circ(21, 6, 2.2, P.pink[0], { w: 1.2 }), { a: A('sway', 3.5, 0, '50% 100%') }),
        [ST + ' (green_roof)']),
    B('green-wall', 'green_wall', 'Parede Verde', '🌿',
        () => ground() + box(22, 18, 84, 88, '#E8693F') +
            line('M22 36h84M22 54h84M22 72h84M22 90h84M50 18v18M78 18v18M36 36v18M64 36v18M92 36v18M50 54v18M78 54v18M36 72v18M64 72v18M92 72v18', { w: 2, op: 0.5 }) +
            line('M38 18c-6 30 6 50-2 88M64 18c6 26-6 54 2 88M90 18c-6 30 4 54-2 88', { s: P.leaf[1], w: 3 }) +
            [[38, 30], [34, 52], [40, 74], [36, 94], [64, 28], [68, 50], [60, 70], [66, 92], [90, 32], [86, 56], [92, 78], [88, 96]].map(([x, y], i) =>
                g(path(`M${x} ${y}c-10-2-12-10-8-14 6 0 9 6 8 14zM${x} ${y}c10-2 12-10 8-14-6 0-9 6-8 14z`, i % 3 ? P.leaf[0] : P.green[0], { w: 2 }), { a: A('sway', 3, i * 0.35, '50% 100%') })).join('') +
            [[46, 40], [78, 62], [50, 86]].map(([x, y], i) => g(circ(x, y, 4, P.pink[0], { w: 2 }) + circ(x, y, 1.5, P.yellow[0], { s: 'none' }), { a: A('twinkle', 3, i) })).join(''),
        () => box(4, 4, 24, 24, '#E8693F', { rx: 1.5 }) + line('M12 4c-3 8 3 14 0 24M21 4c3 8-3 14 0 24', { s: P.leaf[1], w: 1.5 }) +
            g(path('M12 11c-4-1-5-4-3.5-5.5 2.5 0 3.5 2.5 3.5 5.5zM21 18c4-1 5-4 3.5-5.5-2.5 0-3.5 2.5-3.5 5.5zM12 24c4-1 5-4 3.5-5.5-2.5 0-3.5 2.5-3.5 5.5z', P.leaf[0], { w: 1.2 }), { a: A('sway', 3, 0, '50% 100%') }),
        [ST + ' (green_wall)']),
    B('floating-garden', 'floating_garden', 'Jardim Flutuante', '🪷',
        () => ell(64, 92, 60, 22, P.water[0]) + path('M10 98a60 22 0 0 0 108 0a60 16 0 0 1-108 0z', P.water[1], { s: 'none' }) +
            [[64, 0], [64, 1.3]].map(([x, d]) => g(ell(x, 92, 44, 12, 'none', { s: '#fff', w: 2.5 }), { a: A('ripple', 2.6, d, 'center', 'ease-out') })).join('') +
            g(ell(64, 90, 40, 9, P.brown[0]) + ell(64, 87, 36, 7, P.leaf[0]) +
                path('M64 82c-6-4-12-14-10-24 6 2 10 10 10 24zM64 82c6-4 12-14 10-24-6 2-10 10-10 24zM64 82c-10 0-20-6-22-14 8-2 16 4 22 14zM64 82c10 0 20-6 22-14-8-2-16 4-22 14z', P.pink[0], { w: 2.5 }) +
                path('M64 82c-3-4-5-12-4-20 4 2 5 8 4 20z', '#FFC2D6', { w: 2 }) + circ(64, 78, 3.5, P.yellow[0], { w: 2 }), { a: A('bob', 3.2) }) +
            g(ell(24, 100, 10, 4, P.leaf[0], { w: 2.5 }), { a: A('bob', 3.2, 1) }) + g(ell(104, 104, 9, 3.5, P.leaf[0], { w: 2.5 }), { a: A('bob', 3.2, 2) }) +
            spark(100, 52, 5, 3),
        () => ell(16, 25, 14, 5, P.water[0], { w: 1.6 }) +
            g(ell(16, 23.5, 9, 2.5, P.leaf[0], { w: 1.4 }) + path('M16 22c-1.5-1-3-4-2.5-7 1.5.5 2.5 3 2.5 7zM16 22c1.5-1 3-4 2.5-7-1.5.5-2.5 3-2.5 7zM16 22c-3 0-5.5-1.5-6-4 2.5-.5 4.5 1.5 6 4zM16 22c3 0 5.5-1.5 6-4-2.5-.5-4.5 1.5-6 4z', P.pink[0], { w: 1.3 }), { a: A('bobs', 3) }),
        [ST + ' (floating_garden)', 'js/systems/TutorialSystem.js']),
    B('monitoring-station', 'monitoring_station', 'Estação de Monitoramento', '📊',
        () => ground() + rect(14, 86, 40, 22, P.water[0], { rx: 6 }) + thick('M34 86V62h20', P.gray[0], 4, { ow: 4 }) +
            g(ell(34, 94, 8, 2.5, 'none', { s: '#fff', w: 2 }), { a: A('ripple', 2, 0, 'center', 'ease-out') }) +
            box(54, 44, 60, 62, 'white') + rect(50, 38, 68, 8, P.dark[0], { rx: 3 }) + rect(60, 52, 48, 34, P.dark[0], { rx: 3 }) +
            [[66, 'blue', 0], [78, 'green', 0.6], [90, 'yellow', 1.2]].map(([x, c, d]) => g(rect(x, 60, 8, 22, P[c][0], { w: 2 }), { a: A('grow', 2.4, d, '50% 100%') })).join('') +
            line('M100 38V18', { w: 3 }) + circ(100, 16, 3, P.red[0], { w: 2 }) +
            [0, 1].map(i => g(path(`M${92 - i * 6} ${10 - i * 3}a${12 + i * 8} ${12 + i * 8} 0 0 1 ${16 + i * 12} 0`, 'none', { s: P.blue[1], w: 3 }), { a: A('fade', 1.8, i * 0.9) })).join('') +
            rect(76, 92, 16, 14, P.dark[0], { w: 2.5 }),
        () => rect(3, 5, 26, 19, P.dark[0], { rx: 3 }) + line('M12 24v4M20 24v4M8 28h16', { w: 2 }) +
            g(rect(7, 11, 4, 10, P.blue[0], { w: 1.2 }), { a: A('grows', 2.4, 0, '50% 100%') }) + g(rect(14, 9, 4, 12, P.green[0], { w: 1.2 }), { a: A('grows', 2.4, 0.8, '50% 100%') }) +
            g(rect(21, 13, 4, 8, P.yellow[0], { w: 1.2 }), { a: A('grows', 2.4, 1.6, '50% 100%') }),
        [ST + ' (monitoring_station)', 'js/data/missions.js (objetivo da missão)']),
    B('water-quality-monitor', 'water_quality_monitor', 'Monitor de Qualidade', '🔍',
        () => ground() + drop(56, 72, 30) +
            g(circ(78, 50, 22, P.glass[0], { w: 4, op: 1 }) + circ(78, 50, 22, '#fff', { s: 'none', op: 0.35 }) + thick('M94 66l16 16', P.dark[0], 8, { ow: 4 }) +
                path('M66 40a14 14 0 0 1 12-6', 'none', { s: '#fff', w: 3 }), { a: A('scan', 3.5) }) +
            g(circ(30, 30, 11, P.green[0]) + line('M25 30l4 4 7-8', { w: 3 }), { a: A('breathe', 2.4) }) +
            spark(110, 30, 5, 3) + [[40, 98, 0], [70, 100, 1]].map(([x, y, d]) => g(circ(x, y, 2.5, '#fff', { w: 2 }), { a: A('rise', 2.6, d, 'center', 'ease-out') })).join(''),
        () => drop(13, 19, 8) + g(circ(20, 13, 6.5, P.glass[0], { w: 2 }) + thick('M24.5 17.5l4.5 4.5', P.dark[0], 2.6, { ow: 2 }), { a: A('scan', 3.5) }),
        [ST + ' (water_quality_monitor)']),
    B('erosion-control', 'erosion_control', 'Controle de Erosão', '🛡️',
        () => ground() + path('M6 108V70l30-6 22 14 30-24 34 10v44z', P.brown[0]) + path('M6 108V86l30-6 22 14 30-24 34 10v28z', P.brown[1], { s: 'none' }) +
            path('M6 108V70l30-6 22 14 30-24 34 10v44z', 'none') +
            rect(30, 74, 24, 12, P.gray[0], { w: 2.5 }) + rect(54, 86, 24, 12, P.gray[0], { w: 2.5 }) + line('M38 74v12M46 74v12M62 86v12M70 86v12', { w: 1.8 }) +
            line('M96 60c-2 10 4 14 0 24M96 72c6 4 8 10 6 14M96 70c-6 4-8 8-6 12', { s: P.sand[0], w: 2 }) +
            [[18, 66, 0], [96, 56, 1], [110, 60, 2]].map(([x, y, d]) => g(line(`M${x} ${y}v-10`, { s: P.leaf[1], w: 3 }) +
                path(`M${x} ${y - 6}c-6 0-8-6-6-9 4 0 6 4 6 9zM${x} ${y - 8}c6 0 8-6 6-9-4 0-6 4-6 9z`, P.leaf[0], { w: 2 }), { a: A('sway', 3.5, d, '50% 100%') })).join('') +
            g(path('M64 10l24 8v14c0 16-10 26-24 30-14-4-24-14-24-30V18z', P.blue[0]) + path('M64 10l24 8v14c0 16-10 26-24 30z', P.blue[1], { s: 'none' }) +
                path('M64 10l24 8v14c0 16-10 26-24 30-14-4-24-14-24-30V18z', 'none') +
                path('M56 46c-2-12 6-20 18-22 0 12-6 20-18 22z', P.green[0], { w: 2.5 }) + line('M56 46c4-6 8-10 14-16', { w: 2 }), { a: A('bob', 3) }) +
            g(drop(108, 84, 4, 'water', { noHl: true, w: 2 }), { a: A('hop', 2) }),
        () => g(path('M16 3l11 4v7c0 7-5 12-11 15-6-3-11-8-11-15V7z', P.blue[0]) +
            path('M12 20c-1-6 3-10 9-11 0 6-3 10-9 11z', P.green[0], { w: 1.4 }) + line('M12 20c2-3 4-5 7-8', { w: 1.2 }), { a: A('breathe', 3) })),
    // Igual à muda no 3D (building/TreeGrowth.js): cova com terra escura, tutor de madeira amarrado e copa verde-limão.
    B('tree-sapling', 'tree_sapling', 'Muda de Árvore', '🌱',
        () => ground() + ell(60, 100, 34, 9, P.soil[1]) + ell(60, 99, 26, 6, P.soil[0], { w: 2 }) +
            [[44, 99], [52, 102], [70, 101], [77, 98], [62, 96], [48, 96]].map(([x, y]) => ell(x, y, 2.6, 1.4, P.brown[0], { w: 1.2 })).join('') +
            g(ell(60, 99, 12, 3, 'none', { s: P.water[0], w: 2.5 }), { a: A('ripple', 2.4, 0, 'center', 'ease-out') }) +
            poly('80,32 84,26 88,32', P.brown[0], { w: 2.5 }) + box(80, 32, 8, 68, 'brown', { k: 0.4 }) +
            path('M58 98c0-14 1-30 5-44', 'none', { w: 9 }) + path('M58 98c0-14 1-30 5-44', 'none', { s: P.brown[0], w: 5 }) +
            line('M61 72h19', { s: P.sand[1], w: 3.5 }) + ell(62, 72, 3, 4, 'none', { s: P.sand[1], w: 2.5 }) +
            g(path('M62 58c-8-2-14-8-14-16 4-2 12 2 14 16z', P.leaf[0], { w: 2.5 }) +
                ball(64, 38, 16, 'lime', { w: 3 }) + ball(50, 46, 9, 'lime', { w: 3 }) + ball(77, 47, 8, 'lime', { w: 3 }) +
                circ(58, 32, 3.5, '#fff', { s: 'none', op: 0.45 }), { a: A('sway', 4, 0, '50% 100%') }) +
            g(drop(32, 64, 4.5, 'water', { noHl: true, w: 2 }), { a: A('fall', 2.2, 0, 'center', 'ease-in') }) +
            g(drop(24, 80, 3.5, 'water', { noHl: true, w: 2 }), { a: A('fall', 2.2, 1.1, 'center', 'ease-in') }) +
            spark(108, 28, 6, 3.4) + spark(100, 70, 4, 3.4, 1.7),
        () => ell(15, 27, 11, 3.2, P.soil[0], { w: 1.6 }) + rect(21, 6, 3, 21, P.brown[0], { w: 1.4 }) +
            line('M14.5 27c0-4 .3-8 1.3-12', { w: 3.4 }) + line('M14.5 27c0-4 .3-8 1.3-12', { s: P.brown[0], w: 1.6 }) +
            line('M15.5 20h5.5', { s: P.sand[1], w: 1.4 }) +
            g(ball(15, 10, 7, 'lime', { w: 1.6 }) + circ(13, 8, 1.5, '#fff', { s: 'none', op: 0.45 }), { a: A('sway', 4, 0, '50% 100%') }),
        [UI + ' (TreeInfoUI: árvore plantada, linha no painel de poluição)'])
];
