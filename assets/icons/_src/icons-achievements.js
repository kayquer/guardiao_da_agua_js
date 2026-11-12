/**
 * Selos das conquistas por níveis (js/data/achievementTracks.js): medalha com fitas e o símbolo da trilha.
 * Só a versão grande (vitrine da pausa e toast de conquista; uiIcon usa a grande também no tamanho pequeno).
 */
'use strict';
const { P, rect, circ, path, line, poly, g, A, box, ball, drop, tree, boltD, starD, sparkD, waveD } = require('./core');

const AT = 'js/data/achievementTracks.js';
const AU = 'js/systems/ui/AchievementsUI.js (vitrine e toast)';
const spark = (x, y, r, dur = 3.2, delay = 0) => g(path(sparkD(x, y, r), '#fff', { w: 2 }), { a: A('shine', dur, delay) });

/** Medalha: fitas, aro colorido e miolo claro; o símbolo vai centrado em (64, 54), raio ~30. */
const medal = (c, inner) =>
    poly('42,86 30,122 46,112 56,124 62,92', P.red[0]) + poly('86,86 98,122 82,112 72,124 66,92', P.blue[0]) +
    ball(64, 54, 46, c) + circ(64, 54, 36, '#fffdf5', { w: 2.5 }) + inner +
    spark(100, 18, 7) + spark(24, 30, 5, 3.2, 1.6);

const T = (id, title, c, inner) => ({ id, area: 'ach', emoji: [], title, used: [AT, AU], lg: () => medal(c, inner()) });

module.exports = [
    // 11/2026: trilhas que premiam o que o jogo ensina (rio, torneira, esgoto, mata ciliar, chuva, investimento verde)
    T('ach-river', 'Conquista: rio cheio', 'water', () =>
        path('M28 46Q46 40 64 46T100 46V76H28Z', P.water[0]) +
        g(line(waveD(30, 98, 52, 3, 12), { s: '#fff', w: 2.5 }), { a: A('flow', 2.6, 0, 'center', 'linear') }) +
        line(waveD(30, 98, 64, 2.5, 10), { s: P.water[1], w: 2 }) +
        rect(28, 72, 72, 6, P.grass[1], { rx: 3 }) + g(circ(46, 58, 2.5, '#fff', { s: 'none' }), { a: A('bob', 2.2) })),
    T('ach-tap', 'Conquista: sem faltar água', 'blue', () =>
        rect(36, 36, 34, 12, P.concrete[0], { rx: 4 }) + rect(62, 36, 12, 24, P.concrete[0], { rx: 3 }) +
        rect(46, 28, 14, 8, P.red[0], { rx: 3 }) + g(drop(68, 72, 7), { a: A('drip', 1.8) })),
    T('ach-sewage', 'Conquista: esgoto tratado', 'green', () =>
        ball(64, 58, 22, 'concrete') + circ(64, 58, 15, P.water[0]) +
        g(line('M64 44V72M50 58H78', { s: P.water[1], w: 3 }), { a: A('spin', 6, 0, 'center', 'linear') }) +
        circ(64, 58, 4, P.dark[0]) + g(drop(92, 36, 6), { a: A('bob', 2.4) })),
    T('ach-riparian', 'Conquista: mata ciliar', 'leaf', () =>
        path('M28 64Q64 56 100 64V80H28Z', P.water[0]) + line(waveD(32, 96, 70, 2, 10), { s: '#fff', w: 2 }) +
        tree(44, 62, 0.9, { a: A('sway', 3.4, 0, '50% 100%') }) + tree(64, 60, 1.05, { a: A('sway', 3.4, 1.1, '50% 100%') }) +
        tree(84, 62, 0.85, { c: 'lime', a: A('sway', 3.4, 2.2, '50% 100%') })),
    T('ach-sponge', 'Conquista: cidade esponja', 'grass', () =>
        rect(34, 62, 60, 16, P.soil[0], { rx: 3 }) + rect(34, 58, 60, 6, P.grass[0], { rx: 2 }) +
        g(drop(48, 40, 5) + drop(64, 34, 6) + drop(80, 40, 5), { a: A('fall', 2.2) }) +
        line('M46 68V74M58 66V76M70 68V74M82 66V76', { s: P.water[0], w: 2.5 })),
    T('ach-green-invest', 'Conquista: investimento verde', 'yellow', () =>
        rect(40, 66, 30, 8, P.yellow[1], { rx: 3 }) + rect(42, 58, 30, 8, P.yellow[0], { rx: 3 }) +
        g(ball(78, 46, 15, 'leaf') + path('M78 56V38M78 46q-6-6-8-8M78 46q6-4 8-8', 'none', { s: '#fff', w: 2.5 }), { a: A('grow', 2.6, 0, '50% 100%') })),
    T('ach-gravel-roads', 'Conquista: estradas de cascalho', 'gray', () =>
        rect(30, 40, 68, 28, P.smoke[0], { rx: 6 }) +
        [[38, 48], [50, 56], [62, 46], [74, 58], [86, 50], [44, 62], [80, 44], [92, 62], [56, 64]]
            .map(([x, y], i) => circ(x, y, 3 + (i % 2), i % 3 ? P.gray[0] : P.concrete[0], { w: 1.5 })).join('') +
        g(drop(64, 34, 5), { a: A('fall', 2.2) })),
    T('ach-high-tech', 'Conquista: alta tecnologia', 'purple', () =>
        [0, 1, 2].map(i => line(`M${52 + i * 12} 30V38M${52 + i * 12} 70V78M40 ${42 + i * 12}H48M80 ${42 + i * 12}H88`, { w: 3 })).join('') +
        box(46, 36, 36, 36, 'purple', { rx: 5 }) + rect(54, 44, 20, 20, P.glass[0], { rx: 3 }) +
        g(path(boltD(64, 54, 0.6), P.yellow[0], { w: 1.5 }), { a: A('zap', 1.8) })),
    T('ach-power', 'Conquista: energia gerada', 'yellow', () =>
        g(path(boltD(64, 54, 2), P.yellow[0], { w: 3 }), { a: A('pulse', 1.6) }) +
        g(line('M36 40l-6-4M92 40l6-4M36 68l-6 4M92 68l6 4', { s: P.orange[0], w: 3 }), { a: A('blink', 1.6) })),
    T('ach-storage', 'Conquista: água guardada', 'blue', () =>
        `<clipPath id="§c"><rect x="44" y="32" width="40" height="44" rx="6"/></clipPath>` +
        rect(44, 32, 40, 44, P.concrete[0], { rx: 6, s: 'none' }) +
        g(g(rect(30, 52, 80, 30, P.water[0], { s: 'none' }) + line(waveD(30, 110, 52, 3, 10), { s: '#fff', w: 2 }), { a: A('level', 3) }), { x: 'clip-path="url(#§c)"' }) +
        rect(44, 32, 40, 44, 'none', { rx: 6 }) + line('M50 40V68', { s: '#fff', w: 3, op: 0.8 })),
    T('ach-trees', 'Conquista: árvores plantadas', 'leaf', () =>
        rect(36, 74, 56, 6, P.soil[0], { rx: 3 }) + tree(52, 76, 1, { a: A('sway', 3.4, 0, '50% 100%') }) +
        tree(76, 76, 0.8, { c: 'lime', a: A('sway', 3.4, 1.2, '50% 100%') })),
    T('ach-recycling', 'Conquista: reciclagem', 'green', () =>
        g(circ(64, 54, 28, 'none', { s: 'none' }) +
            [0, 120, 240].map(r => g(path('M64 30A24 24 0 0 1 84 41', 'none', { s: P.leaf[1], w: 6 }) + poly('86,34 90,46 78,45', P.leaf[1], { w: 1.5 }), { x: `transform="rotate(${r} 64 54)"` })).join(''),
            { a: A('spin', 8, 0, 'center', 'linear') })),
    T('ach-residential', 'Conquista: zonas residenciais', 'grass', () =>
        box(44, 52, 30, 24, 'white') + poly('40,54 59,36 78,54', P.red[0]) + rect(55, 62, 8, 14, P.brown[0]) +
        box(76, 60, 14, 16, 'sand') + poly('74,62 83,52 92,62', P.orange[0]) +
        g(rect(48, 58, 5, 5, P.yellow[0], { w: 1.5 }), { a: A('blink', 2.4) })),
    T('ach-commercial', 'Conquista: zonas comerciais', 'pink', () =>
        box(40, 50, 48, 28, 'white') + rect(40, 40, 48, 10, P.red[0]) +
        [0, 1, 2].map(i => rect(44 + i * 16, 40, 8, 10, '#fff', { s: 'none' })).join('') + rect(40, 40, 48, 10, 'none') +
        rect(46, 58, 14, 20, P.glass[0]) + rect(66, 58, 16, 12, P.glass[0]) + spark(80, 62, 4, 2.4)),
    T('ach-industrial', 'Conquista: zonas industriais', 'orange', () =>
        g(circ(50, 26, 5, P.smoke[0]) + circ(56, 20, 6, P.smoke[0]), { a: A('smoke', 2.8) }) +
        box(44, 26, 10, 26, 'gray') + poly('36,78 36,52 52,44 52,52 68,44 68,52 84,44 92,44 92,78', P.concrete[0]) +
        rect(44, 62, 8, 8, P.yellow[0], { w: 1.5 }) + rect(60, 62, 8, 8, P.yellow[0], { w: 1.5 }) + rect(76, 62, 8, 8, P.yellow[0], { w: 1.5 }))
];
