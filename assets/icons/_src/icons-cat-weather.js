/**
 * Categorias de construção (pequenos) e clima (pequeno no HUD, grande no modal de previsão).
 */
'use strict';
const { O, P, f1, rect, circ, ell, path, line, poly, g, A, box, ball, drop, cloud, gear, pivot, thick, boltD, sparkD } = require('./core');

const HTML = 'index.html';
const UI = 'js/systems/UIManager.js';
const WS = 'js/systems/WeatherService.js';
const WU = 'js/systems/ui/WeatherUI.js';

/** Raios do sol em volta de (cx, cy). */
function rays(cx, cy, r0, r1, n, w) {
    let d = '';
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        d += `M${f1(cx + r0 * Math.cos(a))} ${f1(cy + r0 * Math.sin(a))}L${f1(cx + r1 * Math.cos(a))} ${f1(cy + r1 * Math.sin(a))}`;
    }
    return thick(d, P.yellow[0], w, { ow: w * 0.9 });
}
/** Raios triangulares (grande). */
function rayTris(cx, cy, r0, r1, n, half) {
    let s = '';
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, b = half;
        const p = (rad, an) => `${f1(cx + rad * Math.cos(an))},${f1(cy + rad * Math.sin(an))}`;
        s += poly(`${p(r0, a - b)} ${p(r1, a)} ${p(r0, a + b)}`, i % 2 ? P.orange[0] : P.yellow[0]);
    }
    return s;
}
/** Sol grande com rosto simpático. */
function bigSun(cx, cy, r, withFace = true) {
    return g(pivot(cx, cy, r * 1.75) + rayTris(cx, cy, r * 1.15, r * 1.7, 12, 0.16), { a: A('spin', 16, 0, 'center', 'linear') }) +
        ball(cx, cy, r, 'yellow') +
        (withFace ? g(ell(cx - r * 0.33, cy - r * 0.12, r * 0.08, r * 0.12, O, { s: 'none' }) + ell(cx + r * 0.33, cy - r * 0.12, r * 0.08, r * 0.12, O, { s: 'none' }), { a: A('wink', 5) }) +
            line(`M${f1(cx - r * 0.3)} ${f1(cy + r * 0.25)}q${f1(r * 0.3)} ${f1(r * 0.3)} ${f1(r * 0.6)} 0`, { w: 3 }) +
            circ(cx - r * 0.55, cy + r * 0.2, r * 0.12, P.pink[0], { s: 'none', op: 0.7 }) + circ(cx + r * 0.55, cy + r * 0.2, r * 0.12, P.pink[0], { s: 'none', op: 0.7 }) : '');
}
const rainDrop = (x, y, r, dur, delay, kind = 'fall') => g(drop(x, y, r, 'water', r < 3 ? { flat: true, w: 1.5 } : { noHl: true }), { a: A(kind, dur, delay, 'center', 'ease-in') });
const streak = (x, y, len, w, dur, delay) => g(thick(`M${x} ${y}l-${f1(len * 0.35)} ${len}`, P.water[0], w, { ow: w * 0.8 }), { a: A('fall', dur, delay, 'center', 'linear') });
const flakeD = (x, y, r) => `M${f1(x - r)} ${f1(y)}h${f1(2 * r)}M${f1(x - r / 2)} ${f1(y - r * 0.87)}l${f1(r)} ${f1(r * 1.73)}M${f1(x + r / 2)} ${f1(y - r * 0.87)}l${f1(-r)} ${f1(r * 1.73)}`;
const flake = (x, y, r, w, dur, delay) => g(thick(flakeD(x, y, r), '#fff', w, { ow: w * 1.1 }), { a: A('snow', dur, delay, 'center', 'linear') });

const CAT = cat => [HTML + ` (.category-btn[data-category="${cat}"])`, UI, 'js/systems/ui/MobilePanels.js'];

module.exports = [
    // ===================== CATEGORIAS =====================
    {
        id: 'cat-water', area: 'cat', emoji: ['💧'], title: 'Categoria Água', used: CAT('water'),
        sm: () => rect(7, 4, 6, 3, P.gray[0], { w: 1.6 }) + line('M10 7v2.5', { w: 2 }) +
            path('M3 9.5h13a6 6 0 0 1 6 6v2h-5v-1.5a1.5 1.5 0 0 0-1.5-1.5H3z', P.gray[0]) +
            ell(19.5, 28.5, 6.5, 2, P.water[0], { w: 1.5 }) +
            g(drop(19.5, 22.5, 3.2, 'water', { noHl: true, w: 1.5 }), { a: A('drip', 2.6, 0, 'center', 'ease-in') })
    },
    {
        id: 'cat-treatment', area: 'cat', emoji: ['🏭'], title: 'Categoria Tratamento', used: CAT('treatment'),
        sm: () => g(gear(23, 9, 4.6, 'gray', { teeth: 7, hole: '#fff' }), { a: A('spin', 8, 0, 'center', 'linear') }) +
            drop(13, 20, 8.5) + path(sparkD(17.5, 18, 3), '#fff', { w: 1.2 })
    },
    {
        id: 'cat-storage', area: 'cat', emoji: ['🏗️'], title: 'Categoria Armazenamento', used: CAT('storage'),
        sm: () => path('M5 9v16a11 3.5 0 0 0 22 0V9', P.blue[0]) + path('M20 11.5v16.3a11 3.5 0 0 0 7-2.8V9z', P.blue[1], { s: 'none' }) +
            path('M5 9v16a11 3.5 0 0 0 22 0V9') + ell(16, 9, 11, 3.5, P.concrete[0]) +
            rect(9, 13, 4, 12, '#fff', { w: 1.5 }) +
            g(rect(10, 18, 2, 6.2, P.water[1], { s: 'none' }), { a: A('grows', 4, 0, '50% 100%') })
    },
    {
        id: 'cat-public', area: 'cat', emoji: ['🏛️'], title: 'Categoria Públicos', used: CAT('public'),
        sm: () => line('M16 6V1.5', { w: 1.5 }) +
            g(path('M16 1.5h6l-1.5 1.8 1.5 1.8h-6z', P.red[0], { w: 1.3 }), { a: A('flag', 2, 0, '0% 50%') }) +
            poly('3,13 16,6 29,13', P.concrete[0]) +
            [6, 12, 17.5, 23].map(x => rect(x, 14, 3, 11, '#fff', { w: 1.5 })).join('') +
            rect(3, 25, 26, 4, P.concrete[1], { rx: 1 })
    },
    {
        id: 'cat-power', area: 'cat', emoji: ['⚡'], title: 'Categoria Energia', used: CAT('power'),
        sm: () => line('M8.5 29L13.5 5h5l5 24M11 21h10M12.6 13.5h6.8M13.4 9.5L22 21M18.6 9.5L10 21', { w: 1.7 }) +
            line('M5 9h22M7 15h18', { w: 2.2 }) +
            g(path(boltD(26, 5, 0.33), P.yellow[0], { w: 1.2 }), { a: A('blinkx', 1.6) })
    },
    {
        id: 'cat-infrastructure', area: 'cat', emoji: ['🛣️'], title: 'Categoria Infraestrutura', used: CAT('infrastructure'),
        sm: () => poly('11.5,3 20.5,3 29,29 3,29', P.dark[0]) + line('M10 5.5L4.8 26M22 5.5L27.2 26', { s: '#fff', w: 1.2 }) +
            g(line('M16 4v24', { s: P.yellow[0], w: 2.2, da: '3 3' }), { a: A('march', 1.4, 0, 'center', 'linear') })
    },
    {
        id: 'cat-zoning', area: 'cat', emoji: ['🏘️'], title: 'Categoria Zoneamento', used: CAT('zoning'),
        sm: () => rect(4.5, 4.5, 11.5, 11.5, P.green[0], { w: 1.5 }) + rect(16, 4.5, 11.5, 11.5, P.yellow[0], { w: 1.5 }) +
            rect(4.5, 16, 11.5, 11.5, P.blue[0], { w: 1.5 }) + rect(16, 16, 11.5, 11.5, P.green[0], { w: 1.5 }) +
            g(rect(2, 2, 28, 28, 'none', { rx: 2, w: 1.6, da: '4 2' }), { a: A('march', 1.6, 0, 'center', 'linear') })
    },
    {
        id: 'cat-commercial', area: 'cat', emoji: ['🏬'], title: 'Categoria Comercial', used: CAT('commercial'),
        sm: () => rect(4.5, 4.5, 23, 4, P.dark[0], { rx: 1 }) + box(5, 12, 22, 16, 'white') +
            [0, 1, 2, 3, 4].map(i => path(`M${f1(3 + i * 5.2)} 8.5h5.2v4a2.6 2.6 0 0 1-5.2 0z`, i % 2 ? '#fff' : P.red[0], { w: 1.5 })).join('') +
            rect(13, 19, 6, 9, P.blue[0], { w: 1.5 }) + rect(7, 17, 4.5, 4.5, P.glass[0], { w: 1.4 }) + rect(20.5, 17, 4.5, 4.5, P.glass[0], { w: 1.4 }) +
            g(path(sparkD(23, 18.5, 2.2), '#fff', { s: 'none' }), { a: A('shine', 3) })
    },
    {
        id: 'cat-tourism', area: 'cat', emoji: ['🎡'], title: 'Categoria Turismo', used: CAT('tourism'),
        sm: () => line('M9.5 29L16 13l6.5 16M7 29h18', { w: 2 }) +
            g(pivot(16, 13, 11.5) + circ(16, 13, 9.5, 'none', { w: 1.8 }) +
                line('M16 3.5v19M6.5 13h19M9.3 6.3l13.4 13.4M22.7 6.3L9.3 19.7', { w: 1 }) +
                [[16, 3.5, 'red'], [25.5, 13, 'yellow'], [16, 22.5, 'blue'], [6.5, 13, 'green']].map(([x, y, c]) => circ(x, y, 2.4, P[c][0], { w: 1.3 })).join(''),
                { a: A('spin', 12, 0, 'center', 'linear') }) + circ(16, 13, 1.6, O, { s: 'none' })
    },
    {
        id: 'cat-industrial', area: 'cat', emoji: ['🏭'], title: 'Categoria Industrial', used: CAT('industrial'),
        sm: () => g(circ(24.5, 4.5, 2.2, P.smoke[0], { w: 1.3 }), { a: A('smoke', 3.6, 0, 'center', 'ease-out') }) +
            rect(22, 7, 5, 21, P.gray[0]) + path('M3 28V15l6-4v4l6-4v4l6-4v17z', P.orange[0]) +
            rect(6, 19, 3.5, 3.5, P.glass[0], { w: 1.3 }) + rect(12.5, 19, 3.5, 3.5, P.glass[0], { w: 1.3 }) + line('M2 28h28')
    },

    // ===================== CLIMA =====================
    {
        id: 'weather-sun', area: 'weather', emoji: ['☀️'], title: 'Céu limpo', used: [WS + ' (código 0, dia)', WU],
        sm: () => g(pivot(16, 16, 14) + rays(16, 16, 10, 13.5, 8, 2), { a: A('spin', 14, 0, 'center', 'linear') }) + ball(16, 16, 7, 'yellow'),
        lg: () => g(circ(64, 64, 34, 'none', { s: P.yellow[0], w: 4 }), { a: A('ripple', 3.5, 0, 'center', 'ease-out') }) + bigSun(64, 64, 30)
    },
    {
        id: 'weather-moon', area: 'weather', emoji: ['🌙'], title: 'Noite de céu limpo', used: [WS + ' (noite)', WU],
        sm: () => path('M19 4a12 12 0 1 0 9 19A10 10 0 0 1 19 4z', '#FFE680') + path('M8 22a12 12 0 0 0 20 1 11 11 0 0 1-17-3z', P.yellow[1], { s: 'none' }) +
            path('M19 4a12 12 0 1 0 9 19A10 10 0 0 1 19 4z') +
            g(path(sparkD(25, 8, 3), P.yellow[0], { w: 1.2 }), { a: A('twinkle', 3) }),
        lg: () => g(path('M74 18a46 46 0 1 0 36 72A38 38 0 0 1 74 18z', '#FFE680') + path('M30 88a46 46 0 0 0 80 2 44 44 0 0 1-66-12z', P.yellow[1], { s: 'none' }) +
            path('M74 18a46 46 0 1 0 36 72A38 38 0 0 1 74 18z') +
            circ(44, 60, 5, P.yellow[1], { s: 'none' }) + circ(58, 86, 7, P.yellow[1], { s: 'none' }) + circ(40, 80, 3, P.yellow[1], { s: 'none' }) +
            g(ell(56, 52, 2.5, 4, O, { s: 'none' }) + ell(72, 56, 2.5, 4, O, { s: 'none' }), { a: A('wink', 5) }) +
            line('M58 68q7 5 13 1', { w: 3 }), { a: A('bobs', 5) }) +
            g(path(sparkD(98, 24, 9), P.yellow[0], { w: 2 }), { a: A('twinkle', 3) }) +
            g(path(sparkD(112, 52, 6), P.yellow[0], { w: 2 }), { a: A('twinkle', 3, 1) }) +
            g(path(sparkD(24, 20, 6), P.yellow[0], { w: 2 }), { a: A('twinkle', 3, 2) }) +
            g(cloud(92, 104, 0.9, 'smoke'), { a: A('drift', 6) })
    },
    {
        id: 'weather-partly', area: 'weather', emoji: ['🌤️'], title: 'Poucas nuvens', used: [WS + ' (códigos 1 e 2)', WU],
        sm: () => g(pivot(11, 11, 10) + rays(11, 11, 7.5, 10, 8, 1.6), { a: A('spin', 14, 0, 'center', 'linear') }) + ball(11, 11, 5.5, 'yellow') +
            g(cloud(19, 21, 0.58), { a: A('drift', 5) }),
        lg: () => bigSun(46, 46, 24, false) +
            g(cloud(104, 30, 0.6, 'white'), { a: A('drift', 7, 3) }) +
            g(cloud(76, 84, 2.1, 'white'), { a: A('drift', 6) })
    },
    {
        id: 'weather-cloud', area: 'weather', emoji: ['☁️'], title: 'Nublado', used: [WS + ' (código 3)', WU],
        sm: () => g(cloud(16, 18, 0.84), { a: A('drift', 5) }),
        lg: () => g(cloud(84, 40, 1.8, 'smoke'), { a: A('drift', 7, 3) }) +
            g(cloud(60, 78, 2.5, 'white') + g(ell(50, 76, 3, 4.5, O, { s: 'none' }) + ell(70, 76, 3, 4.5, O, { s: 'none' }), { a: A('wink', 5) }) +
                line('M55 86q5 4 10 0', { w: 3 }), { a: A('drift', 6) })
    },
    {
        id: 'weather-fog', area: 'weather', emoji: ['🌫️'], title: 'Neblina', used: [WS + ' (códigos 45 e 48)', WU],
        sm: () => cloud(16, 11, 0.5, 'smoke') +
            g(thick('M5 19h16', P.smoke[0], 2.2), { a: A('drift', 4) }) + g(thick('M9 24h18', P.smoke[0], 2.2), { a: A('drift', 4, 1.3) }) +
            g(thick('M4 29h14', P.smoke[0], 2.2), { a: A('drift', 4, 2.6) }),
        lg: () => g(cloud(64, 40, 1.5, 'smoke'), { a: A('drift', 8) }) +
            g(thick('M16 74h64', P.smoke[0], 7, { ow: 6 }), { a: A('drift', 5) }) +
            g(thick('M44 90h68', P.white[1], 7, { ow: 6 }), { a: A('drift', 5, 1.2) }) +
            g(thick('M10 106h56', P.smoke[0], 7, { ow: 6 }), { a: A('drift', 5, 2.4) }) +
            g(thick('M78 106h30', P.white[1], 7, { ow: 6 }), { a: A('drift', 5, 3.6) })
    },
    {
        id: 'weather-drizzle', area: 'weather', emoji: ['🌦️'], title: 'Garoa', used: [WS + ' (códigos 51–57)', WU],
        sm: () => ball(10, 9, 5, 'yellow') + cloud(18, 15, 0.55) +
            rainDrop(14, 25, 1.8, 2.4, 0) + rainDrop(21, 25, 1.8, 2.4, 1.2),
        lg: () => bigSun(42, 38, 20, false) + cloud(76, 62, 2, 'white') +
            rainDrop(58, 100, 5.5, 2.2, 0) + rainDrop(78, 106, 5.5, 2.2, 0.8) + rainDrop(98, 100, 5.5, 2.2, 1.5)
    },
    {
        id: 'weather-rain', area: 'weather', emoji: ['🌧️'], title: 'Chuva', used: [WS + ' (códigos 61–81)', WU],
        sm: () => cloud(16, 12, 0.74, 'smoke') +
            rainDrop(10, 24, 1.9, 1.8, 0) + rainDrop(16.5, 26, 1.9, 1.8, 0.6) + rainDrop(23, 24, 1.9, 1.8, 1.2),
        lg: () => g(cloud(64, 46, 2.3, 'smoke'), { a: A('drift', 6) }) +
            [[34, 86, 0], [52, 96, 0.5], [70, 86, 1], [88, 96, 0.3], [104, 84, 0.8]].map(([x, y, d]) => rainDrop(x, y + 2, 5.5, 1.6, d)).join('') +
            g(ell(60, 118, 10, 3, 'none', { s: P.water[1], w: 2.5 }), { a: A('ripple', 1.6, 0, 'center', 'ease-out') }) +
            g(ell(94, 118, 10, 3, 'none', { s: P.water[1], w: 2.5 }), { a: A('ripple', 1.6, 0.8, 'center', 'ease-out') })
    },
    {
        id: 'weather-heavy-rain', area: 'weather', emoji: ['🌧️'], title: 'Chuva forte', used: [WS + ' (códigos 65, 67, 82)', WU],
        sm: () => cloud(16, 11, 0.68, 'soot') +
            streak(9, 20, 6, 1.6, 0.9, 0) + streak(14, 21, 6, 1.6, 0.9, 0.45) + streak(19, 20, 6, 1.6, 0.9, 0.2) + streak(24, 21, 6, 1.6, 0.9, 0.65),
        lg: () => g(cloud(64, 42, 2.3, 'soot'), { a: A('drift', 5) }) +
            [[28, 80, 0], [42, 86, 0.3], [56, 80, 0.6], [70, 86, 0.15], [84, 80, 0.45], [98, 86, 0.75], [112, 80, 0.25]].map(([x, y, d]) => streak(x, y, 20, 4, 0.8, d)).join('') +
            g(ell(48, 120, 12, 3, 'none', { s: P.water[1], w: 2.5 }), { a: A('ripple', 1, 0, 'center', 'ease-out') }) +
            g(ell(88, 120, 12, 3, 'none', { s: P.water[1], w: 2.5 }), { a: A('ripple', 1, 0.5, 'center', 'ease-out') })
    },
    {
        id: 'weather-snow', area: 'weather', emoji: ['❄️'], title: 'Neve', used: [WS + ' (códigos 71–86)', WU],
        sm: () => cloud(16, 11, 0.74, 'white') +
            flake(10, 25, 2.6, 1.3, 3.5, 0) + flake(17, 27, 2.6, 1.3, 3.5, 1.2) + flake(24, 25, 2.6, 1.3, 3.5, 2.4),
        lg: () => g(cloud(64, 44, 2.3, 'white'), { a: A('drift', 7) }) +
            [[30, 86, 0], [50, 98, 1], [68, 84, 2], [86, 100, 0.5], [104, 86, 1.5], [40, 112, 2.5]].map(([x, y, d]) => flake(x, y + 2, 9, 3.5, 4, d)).join('')
    },
    {
        id: 'weather-storm', area: 'weather', emoji: ['⛈️'], title: 'Tempestade', used: [WS + ' (códigos 95–99)', WU],
        sm: () => cloud(16, 11, 0.7, 'soot') +
            g(path(boltD(16, 23, 0.5), P.yellow[0], { w: 1.6 }), { a: A('zap', 3, 0, 'center', 'linear') }) +
            streak(8, 21, 5, 1.5, 0.9, 0) + streak(25, 21, 5, 1.5, 0.9, 0.45),
        lg: () => g(rect(0, 0, 128, 128, '#FFF7C2', { s: 'none', rx: 20 }), { a: A('flash', 3, 0, 'center', 'linear'), op: 0 }) +
            g(cloud(64, 42, 2.4, 'soot'), { a: A('drift', 5) }) +
            [[24, 82, 0], [40, 90, 0.4], [92, 90, 0.2], [108, 82, 0.6]].map(([x, y, d]) => streak(x, y, 18, 4, 0.8, d)).join('') +
            g(path(boltD(66, 88, 2.1), P.yellow[0], { w: 3 }) + path(boltD(66, 88, 1.2), '#fff', { s: 'none' }), { a: A('zap', 3, 0, 'center', 'linear') })
    }
];
