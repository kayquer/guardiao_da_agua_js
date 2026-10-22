/**
 * Capas de aula (js/data/lessons.js) e retrato da missão (js/data/missions.js).
 */
'use strict';
const { O, P, f1, rect, circ, ell, path, line, poly, g, A, box, ball, drop, cloud, pivot, thick, sparkD, waveD } = require('./core');

const LJ = 'js/data/lessons.js';
const LB = 'js/systems/ui/LessonBookUI.js';
const TS = 'js/systems/TutorialSystem.js';
const spark = (x, y, r, dur = 3.5, delay = 0, c = P.yellow[0]) => g(path(sparkD(x, y, r), c, { w: 2 }), { a: A('shine', dur, delay) });
const L = (n, id, title, emoji, lg, sm, extra = []) => ({
    id, area: 'lesson', emoji: [emoji], title: `Aula ${n}: ${title}`,
    used: [`${LJ} (capítulo ${n})`, LB + ' (cartões do hub de aulas)', TS + ' (Aula rápida)', ...extra], lg, sm
});

/** Continentes simplificados (desenhados duas vezes lado a lado para "girar"). */
const CONT = [[[8, 34], [24, 28], [30, 40], [22, 50], [28, 62], [24, 82], [16, 74], [12, 58], [4, 46]],
    [[48, 30], [66, 26], [76, 36], [70, 46], [76, 60], [66, 84], [56, 70], [58, 56], [50, 46]], [[80, 68], [90, 66], [90, 78], [82, 80]]];
/** Blob suave passando pelos pontos médios (curvas quadráticas). */
const blob = pts => { const m = (a, b) => `${f1((a[0] + b[0]) / 2)} ${f1((a[1] + b[1]) / 2)}`; let d = `M${m(pts[pts.length - 1], pts[0])}`; pts.forEach((p, k) => { d += `Q${f1(p[0])} ${f1(p[1])} ${m(p, pts[(k + 1) % pts.length])}`; }); return d + 'Z'; };
/** Continentes com período de 92 (grande) ou 23 (pequeno): duas cópias lado a lado deslizam sem emenda. */
const lands = (dx, sx, cy, sy, w) => path(CONT.map(c => blob(c.map(([x, y]) => [dx + x * sx, cy + (y - 64) * sy]))).join(''), P.leaf[0], { w });

module.exports = [
    L(1, 'lesson-planet', 'A água do planeta', '🌍',
        () => `<clipPath id="§g"><circle cx="64" cy="64" r="46"/></clipPath>` +
            g(pivot(64, 64, 60) + ell(64, 64, 60, 14, 'none', { s: P.yellow[0], w: 3, da: '8 8', x: 'transform="rotate(-20 64 64)"' }), { a: A('spin', 20, 0, 'center', 'linear') }) +
            circ(64, 64, 46, P.water[0], { s: 'none' }) +
            g(g(lands(18, 1, 64, 1, 2.5) + lands(-74, 1, 64, 1, 2.5), { a: A('globe', 14, 0, 'center', 'linear') }) +
                path('M64 18a46 46 0 0 1 0 92a46 46 0 0 0 0-92z', P.water[1], { s: 'none', op: 0.45 }) +
                ell(64, 24, 30, 8, '#fff', { s: 'none', op: 0.9 }), { x: 'clip-path="url(#§g)"' }) +
            circ(64, 64, 46, 'none') + path('M34 40a36 36 0 0 1 18-14', 'none', { s: '#fff', w: 5, op: 0.7 }) +
            g(drop(108, 26, 8), { a: A('bob', 3) }) + spark(20, 22, 6) + spark(110, 104, 5, 3.5, 1.6),
        () => `<clipPath id="§g"><circle cx="16" cy="16" r="12.5"/></clipPath>` + circ(16, 16, 12.5, P.water[0], { s: 'none' }) +
            g(g(lands(4.5, 0.25, 16, 0.27, 1.2) + lands(-18.5, 0.25, 16, 0.27, 1.2), { a: A('globe', 14, 0, 'center', 'linear') }), { x: 'clip-path="url(#§g)"' }) +
            circ(16, 16, 12.5, 'none'),
        ['js/systems/ui/ResourcePanels.js (🌍)']),
    L(2, 'lesson-water-cycle', 'O caminho da água', '🔄',
        () => rect(8, 86, 112, 30, P.water[0], { rx: 10 }) + g(line(waveD(8, 140, 94, 3, 12), { s: '#fff', w: 2.5 }), { a: A('wave', 1.8, 0, 'center', 'linear') }) +
            poly('70,88 94,52 118,88', P.grass[0]) + poly('94,52 102,64 98,62 94,66 90,62 86,64', '#fff', { w: 2 }) +
            g(pivot(26, 28, 18) + [0, 60, 120, 180, 240, 300].map(a => line('M26 12v-4', { s: P.yellow[0], w: 4, x: `transform="rotate(${a} 26 28)"` })).join(''), { a: A('spin', 10, 0, 'center', 'linear') }) +
            ball(26, 28, 11, 'yellow') +
            [0, 1, 2].map(i => g(line(`M${34 + i * 10} 80q4-6 0-12t0-12`, { s: '#fff', w: 3 }), { a: A('rise', 2.8, i * 0.9, 'center', 'ease-out') })).join('').replace(/stroke="#fff"/g, `stroke="${P.water[1]}"`) +
            g(cloud(90, 26, 0.95, 'white'), { a: A('drift', 5) }) +
            [[82, 0], [94, 0.5], [104, 1]].map(([x, d]) => g(drop(x, 46, 3, 'water', { noHl: true, w: 2 }), { a: A('fall', 1.6, d, 'center', 'ease-in') })).join('') +
            g(path('M46 14q14-6 26 0', 'none', { s: P.blue[1], w: 3, da: '6 4' }) + path('M68 10l6 4-7 3', 'none', { s: P.blue[1], w: 3 }), { a: A('fade', 2.4) }),
        () => g(pivot(16, 16, 13) +
            thick('M26 16A10 10 0 0 1 9.5 23.6', P.water[0], 3) + poly('6.8,21 7.2,24.8 10.7,21.3', P.water[0], { w: 1.8 }) +
            thick('M6 16A10 10 0 0 1 22.5 8.4', P.water[0], 3) + poly('25.2,11 24.8,7.2 21.3,10.7', P.water[0], { w: 1.8 }), { a: A('spin', 10, 0, 'center', 'linear') }) +
            drop(16, 17.5, 3.6, 'water', { noHl: true, w: 1.5 })),
    L(3, 'lesson-sharing', 'Água para todos', '⚖️',
        () => rect(40, 108, 48, 8, P.brown[0], { rx: 3 }) + rect(60, 30, 8, 80, P.brown[0]) +
            g(pivot(64, 30, 50) + line('M18 30h92', { w: 6 }) + line('M18 30h92', { s: P.yellow[0], w: 3 }) +
                line('M24 30l-12 36M24 30l12 36M104 30l-12 36M104 30l12 36', { w: 2 }) +
                path('M6 66h36a18 10 0 0 1-36 0z', P.concrete[0]) + path('M86 66h36a18 10 0 0 1-36 0z', P.concrete[0]) +
                drop(18, 60, 5) + drop(30, 58, 6) + rect(92, 52, 12, 14, '#FFF1C9', { w: 2.5 }) + poly('90,53 98,45 106,53', P.red[0], { w: 2.5 }) +
                path('M110 66v-8c-5-1-6-5-4-7 3 0 4 3 4 7 0-5 2-8 6-8 1 3-1 7-6 8', P.leaf[0], { w: 2 }), { a: A('tilt', 4) }) +
            circ(64, 30, 6, P.yellow[0]) + spark(64, 12, 6),
        () => rect(10, 27, 12, 3, P.brown[0], { rx: 1, w: 1.5 }) + line('M16 27V7', { w: 2.2 }) +
            g(pivot(16, 8, 13) + line('M4 8h24', { w: 2 }) + line('M6 8l-3 9M6 8l3 9M26 8l-3 9M26 8l3 9', { w: 1 }) +
                path('M2 17h8a4 3 0 0 1-8 0z', P.water[0], { w: 1.4 }) + path('M22 17h8a4 3 0 0 1-8 0z', P.leaf[0], { w: 1.4 }), { a: A('tilt', 4) }) +
            circ(16, 8, 2, P.yellow[0], { w: 1.2 })),
    L(4, 'lesson-river-life', 'A vida no rio', '🐟',
        () => rect(6, 12, 116, 104, P.water[0], { rx: 18 }) + path('M6 92h116v6c0 10-8 18-18 18H24c-10 0-18-8-18-18z', P.sand[0]) +
            g(line(waveD(6, 150, 22, 3, 12), { s: '#fff', w: 2.5 }), { a: A('wave', 2, 0, 'center', 'linear') }) +
            [[20, 0], [104, 1.2]].map(([x, d]) => g(path(`M${x} 96c-4-12 4-20 0-34M${x} 96c4-10-2-18 4-28`, 'none', { s: P.leaf[0], w: 4 }), { a: A('sway', 3, d, '50% 100%') })).join('') +
            g(path('M30 60c10-16 40-20 58 0-18 20-48 16-58 0z', P.orange[0]) + path('M30 60l-14-12v24z', P.orange[1]) +
                path('M54 46c4-6 12-8 16-6l-4 8z', P.orange[1], { w: 2.5 }) + circ(74, 56, 4, '#fff', { w: 2 }) + circ(75, 56, 1.8, O, { s: 'none' }) +
                line('M58 50c3 6 3 14 0 20', { w: 2.5 }), { a: A('swim', 4) }) +
            [[92, 0], [98, 1], [88, 2]].map(([x, d]) => g(circ(x, 52, 3, '#fff', { w: 2 }), { a: A('rise', 3, d, 'center', 'ease-out') })).join('') +
            g(path('M70 84c5-6 14-6 18 0-4 6-13 6-18 0zm0 0l-6-5v10z', P.yellow[0], { w: 2 }), { a: A('swim', 3, 1.5) }) + rect(6, 12, 116, 104, 'none', { rx: 18 }),
        () => rect(2, 4, 28, 24, P.water[0], { rx: 6, w: 1.6 }) +
            g(path('M8 16c3-5 11-6 16 0-5 6-13 5-16 0z', P.orange[0], { w: 1.5 }) + path('M8 16l-4-3.5v7z', P.orange[1], { w: 1.4 }) + circ(20, 15, 1.2, O, { s: 'none' }), { a: A('swim', 4) }) +
            g(circ(25, 9, 1.3, '#fff', { w: 1 }), { a: A('rise', 3, 0, 'center', 'ease-out') })),
    L(5, 'lesson-hidden-water', 'Água escondida e cidades', '🏙️',
        () => rect(6, 50, 116, 66, P.brown[0], { rx: 10 }) + rect(6, 50, 116, 10, P.grass[0]) +
            rect(6, 76, 116, 22, P.water[0], { s: 'none' }) +
            [[20, 82], [44, 90], [70, 84], [98, 92], [110, 80]].map(([x, y]) => circ(x, y, 4, P.water[1], { s: 'none' })).join('') +
            g(line('M6 87h116', { s: '#fff', w: 3, da: '14 10' }), { a: A('flow', 1.6, 0, 'center', 'linear') }) +
            line('M6 76h116M6 98h116', { w: 2.5 }) + rect(6, 50, 116, 66, 'none', { rx: 10 }) +
            [[14, 30, 22, 'orange'], [38, 18, 20, 'blue'], [60, 34, 18, 'pink'], [100, 26, 18, 'purple']].map(([x, y, w, c]) =>
                box(x, y, w, 50 - y, c) + Array.from({ length: Math.floor((50 - y - 6) / 8) }, (_, r) => rect(x + 4, y + 4 + r * 8, w - 8, 4, P.glass[0], { w: 1.5 })).join('')).join('') +
            thick('M86 50V86', P.gray[0], 5, { ow: 4 }) + rect(80, 36, 12, 14, P.gray[0], { w: 2.5 }) +
            g(line('M86 84V54', { s: P.water[0], w: 3, da: '6 6' }), { a: A('flow', 1, 0, 'center', 'linear') }) +
            g(drop(86, 24, 6), { a: A('bob', 2.6) }) + spark(118, 12, 5),
        () => rect(2, 15, 28, 14, P.brown[0], { rx: 3, w: 1.6 }) + rect(2, 20, 28, 5, P.water[0], { s: 'none' }) +
            g(line('M3 22.5h26', { s: '#fff', w: 1.4, da: '4 4' }), { a: A('flow', 1.6, 0, 'center', 'linear') }) + line('M2 20h28M2 25h28', { w: 1.2 }) +
            rect(4, 7, 6, 8, P.orange[0], { w: 1.4 }) + rect(11, 3, 6, 12, P.blue[0], { w: 1.4 }) + rect(18, 9, 5, 6, P.pink[0], { w: 1.4 }) + line('M26 15V8', { w: 1.6 }) + rect(24, 6, 4, 3, P.gray[0], { w: 1.2 })),
    L(6, 'lesson-green-solutions', 'Soluções verdes', '🌿',
        () => g(path('M18 112C14 64 46 22 112 16c0 60-38 96-94 96z', P.leaf[0]) + path('M112 16c0 60-38 96-94 96 34-12 76-48 94-96z', P.leaf[1], { s: 'none' }) +
            path('M18 112C14 64 46 22 112 16c0 60-38 96-94 96z') +
            line('M18 112C44 82 66 58 94 34M44 82l-4-24M44 82h24M66 58l-2-20M66 58h22', { w: 3 }), { a: A('sway', 4.5, 0, '0% 100%') }) +
            g(drop(78, 70, 10), { a: A('bob', 3) }) + spark(98, 54, 6) + spark(28, 34, 6, 3.5, 1.4) +
            g(circ(40, 26, 4, '#fff', { w: 2 }), { a: A('rise', 3, 0, 'center', 'ease-out') }),
        () => g(path('M5 28C4 16 12 6 27 5c0 14-9 23-22 23z', P.leaf[0]) + line('M5 28C11 20 16 14 22 9', { w: 1.5 }), { a: A('sway', 4, 0, '0% 100%') }) +
            drop(18.5, 19.5, 3.4, 'water', { w: 1.4 }),
        ['js/systems/QuestSystem.js (🌿 também em ui-leaf)']),

    // ----- MISSÃO -----
    {
        id: 'mission-new-manager', area: 'mission', emoji: ['👩‍💼'], title: 'A Nova Gestora',
        used: ['js/data/missions.js (story_chain_01_01.missionIcon)', 'js/systems/ui/MissionUI.js (.mission-icon, título dos detalhes)', 'js/systems/QuestSystem.js (.mission-icon)'],
        lg: () => circ(64, 64, 58, P.glass[0], { s: 'none' }) +
            path('M18 124c0-26 20-40 46-40s46 14 46 40z', P.blue[0]) + path('M80 86c18 6 30 18 30 38H92c0-16-4-28-12-38z', P.blue[1], { s: 'none' }) +
            path('M18 124c0-26 20-40 46-40s46 14 46 40z') + path('M52 86l12 20 12-20', '#fff', { w: 2.5 }) + path('M60 92l4 14 4-14z', P.red[0], { w: 2 }) +
            g(circ(64, 22, 14, '#5A3420') + path('M32 62c-4-30 10-44 32-44s36 14 32 44c-4 8-8 10-8 10L88 50H40l-2 22s-4-2-6-10z', '#5A3420') +
                ball(64, 56, 24, 'skin') + path('M40 52c4-16 14-22 24-22s20 6 24 22c-8-6-16-8-24-14-6 8-14 12-24 14z', '#5A3420') +
                g(ell(55, 58, 2.6, 3.6, O, { s: 'none' }) + ell(73, 58, 2.6, 3.6, O, { s: 'none' }), { a: A('wink', 4.5) }) +
                circ(48, 66, 3.5, P.pink[0], { s: 'none', op: 0.7 }) + circ(80, 66, 3.5, P.pink[0], { s: 'none', op: 0.7 }) +
                line('M57 68q7 6 14 0', { w: 3 }), { a: A('nod', 4, 0, '50% 100%') }) +
            g(rect(84, 92, 26, 32, P.brown[0], { rx: 3 }) + rect(88, 98, 18, 22, '#fff', { w: 2 }) + rect(92, 89, 10, 6, P.gray[0], { rx: 2, w: 2 }) +
                line('M91 104h12M91 110h12', { w: 1.6 }) + g(line('M91 115l3 3 6-6', { s: P.leaf[0], w: 2.5 }), { a: A('fade', 2.4) }), { a: A('bobs', 3) }) +
            g(drop(30, 104, 6), { a: A('bob', 3, 1) }) + spark(108, 22, 6) + spark(20, 40, 5, 3.5, 1.6),
        sm: () => path('M4 31c0-7 5-10 12-10s12 3 12 10z', P.blue[0]) + path('M13 21.5l3 5 3-5', '#fff', { w: 1.2 }) +
            g(path('M8 18c-1-8 3-12 8-12s9 4 8 12c-1 2-2 2-2 2l-.5-5h-11l-.5 5s-1 0-2-2z', '#5A3420', { w: 1.5 }) + circ(16, 5, 3.5, '#5A3420', { w: 1.5 }) +
                circ(16, 14, 6.5, P.skin[0], { w: 1.6 }) + path('M9.5 13c1-4 4-6 6.5-6s5.5 2 6.5 6c-2-1.5-4-2-6.5-3.5-1.5 2-4 3-6.5 3.5z', '#5A3420', { s: 'none' }) +
                g(circ(13.6, 15, 0.9, O, { s: 'none' }) + circ(18.4, 15, 0.9, O, { s: 'none' }), { a: A('wink', 4.5) }) + line('M14.2 17.6q1.8 1.4 3.6 0', { w: 1.1 }),
                { a: A('nod', 4, 0, '50% 100%') })
    }
];
