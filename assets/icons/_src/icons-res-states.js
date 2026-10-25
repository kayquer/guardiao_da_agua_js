/**
 * Estados dos botões de recurso do HUD (ui/ResourceHud.js): o ícone muda conforme o recurso vai bem ou mal.
 * Faixas: great (muito bem) → o ícone normal (res-<recurso>) → low (piorando) → critical (crítico).
 * Pequenos (32×32): formas simples, contorno grosso e um movimento que conta o estado (brilho = bem, queda/pisca = mal).
 */
'use strict';
const { O, P, rect, circ, ell, path, line, g, A, box, ball, drop, cloud, boltD, starD, sparkD, waveD } = require('./core');

const USED = ['js/systems/ui/ResourceHud.js', 'js/data/resourceStates.js'];
const sparkle = (x, y, r, d = 0) => g(path(sparkD(x, y, r), '#fff', { w: 1.1 }), { a: A('twinkle', 2.2, d) });

module.exports = [
    // ===================== ÁGUA =====================
    {
        id: 'res-water-great', area: 'hud', emoji: [], title: 'Água de sobra (cachoeira)', used: USED,
        sm: () => box(2, 4, 12, 9, 'gray', { rx: 2 }) +
            rect(8, 10, 7, 15, P.water[0]) +
            g(line('M10 11v13M13 11v13', { s: '#fff', w: 1.2, da: '3 3', op: 0.9 }), { a: A('flow', 0.8, 0, 'center', 'linear') }) +
            ell(16, 26, 13, 4, P.water[0]) +
            g(line(waveD(6, 26, 26, 1, 5), { s: '#fff', w: 1.1 }), { a: A('drift', 2) }) +
            sparkle(25, 9, 3.5) + sparkle(20, 15, 2.2, 1.1)
    },
    {
        id: 'res-water-low', area: 'hud', emoji: [], title: 'Água acabando (torneira pingando)', used: USED,
        sm: () => rect(3, 6, 14, 5, P.gray[0], { rx: 1.5 }) + rect(13, 9, 5, 6, P.gray[0], { rx: 1 }) + rect(7, 3, 4, 3, P.red[0], { rx: 1 }) +
            g(drop(15.5, 20, 2.6), { a: A('fall', 1.8, 0, 'center', 'ease-in') }) +
            ell(16, 27, 9, 2.5, P.water[0], { op: 0.75 })
    },
    {
        id: 'res-water-critical', area: 'hud', emoji: [], title: 'Sem água (deserto)', used: USED,
        sm: () => g(circ(24, 8, 4.5, P.yellow[0]) + line('M24 1v1.5M31 8h-1.5M29 3l-1 1M19 3l1 1', { w: 1.4 }), { a: A('pulse', 1.8) }) +
            path('M1 21q8-6 15-1t15-2V31H1z', P.sand[0]) +
            path('M1 25q9-3 30 0V31H1z', P.sand[1], { s: 'none' }) +
            line('M6 27l3-2 2 2 3-3M19 27l2-2 3 2', { w: 1.3 }) +
            rect(8, 13, 3, 9, P.leaf[0], { rx: 1.5, w: 1.4 }) + line('M8 17H6v-3M11 16h2v-3', { w: 1.4 })
    },

    // ===================== POLUIÇÃO (pouca = bom) =====================
    {
        id: 'res-pollution-great', area: 'hud', emoji: [], title: 'Ar e rio limpos', used: USED,
        sm: () => g(path('M6 26C6 13 15 5 27 5c0 13-8 21-21 21z', P.leaf[0]) + line('M6 26L21 11', { w: 1.6 }) +
            path('M16 21c3-1 6-4 8-8', 'none', { s: '#fff', w: 1.2, op: 0.7 }), { a: A('sway', 3.5, 0, '10% 90%') }) +
            sparkle(8, 8, 3.2) + sparkle(25, 24, 2.4, 1)
    },
    {
        id: 'res-pollution-low', area: 'hud', emoji: [], title: 'Poluição subindo', used: USED,
        sm: () => rect(6, 18, 5, 12, P.gray[0]) + rect(18, 15, 5, 15, P.gray[0]) +
            g(cloud(10, 11, 0.42, 'soot'), { a: A('smoke', 3.2, 0, 'center', 'ease-out') }) +
            g(cloud(21, 8, 0.48, 'soot'), { a: A('smoke', 3.2, 1.6, 'center', 'ease-out') }) +
            line('M1 30h30')
    },
    {
        id: 'res-pollution-critical', area: 'hud', emoji: [], title: 'Poluição crítica', used: USED,
        sm: () => g(cloud(16, 12, 0.78, 'soot') +
            line('M9 10l3 2m0-2l-3 2m11-2l3 2m0-2l-3 2', { s: '#fff', w: 1.3 }) +
            line('M12 16q4-2.5 8 0', { s: '#fff', w: 1.3 }), { a: A('shake', 2.4) }) +
            g(drop(10, 25, 1.8, 'soil', { flat: true, w: 1.2 }), { a: A('fall', 1.5, 0) }) +
            g(drop(24, 25, 1.8, 'soil', { flat: true, w: 1.2 }), { a: A('fall', 1.5, 1) })
    },

    // ===================== POPULAÇÃO =====================
    {
        id: 'res-population-great', area: 'hud', emoji: [], title: 'Cidade cheia e animada', used: USED,
        sm: () => g(path('M18 27c0-4 2.5-6 6-6s6 2 6 6z', P.blue[0]) + circ(24, 16, 3.2, P.blue[0]), { a: A('hop', 1.6, 0.4) }) +
            g(path('M2 27c0-4 2.5-6 6-6s6 2 6 6z', P.green[0]) + circ(8, 16, 3.2, P.green[0]), { a: A('hop', 1.6, 0.9) }) +
            g(path('M9 29c0-5 3-7.5 7-7.5s7 2.5 7 7.5z', P.orange[0]) + circ(16, 15, 4, P.orange[0]), { a: A('hop', 1.6) }) +
            g(rect(5, 4, 2.5, 2.5, P.pink[0], { s: 'none' }) + rect(25, 6, 2.5, 2.5, P.yellow[0], { s: 'none' }) +
                rect(15, 2, 2.5, 2.5, P.blue[0], { s: 'none' }), { a: A('twinkle', 1.4) })
    },
    {
        id: 'res-population-low', area: 'hud', emoji: [], title: 'Pouca gente na cidade', used: USED,
        sm: () => g(path('M8 28c0-6 3.5-9 8-9s8 3 8 9z', P.orange[0], { op: 0.85 }) + circ(16, 12, 4.5, P.orange[0]), { a: A('bobs', 3.5) }) +
            line('M3 30h26', { s: P.gray[0], w: 1.5, da: '2 3' })
    },
    {
        id: 'res-population-critical', area: 'hud', emoji: [], title: 'Moradores indo embora', used: USED,
        sm: () => path('M3 14L12 6l9 8v14H3z', P.concrete[0], { op: 0.8 }) + rect(9, 19, 5, 9, P.dark[0]) +
            line('M5 16l14 9', { s: P.gray[1], w: 1.2, da: '2 2' }) +
            g(box(19, 18, 9, 8, 'brown', { rx: 1.5 }) + line('M22 18v-2h3v2', { w: 1.4 }) +
                circ(21, 27.5, 1.2, O, { s: 'none' }) + circ(26, 27.5, 1.2, O, { s: 'none' }), { a: A('slide', 2.6, 0, 'center', 'linear') })
    },

    // ===================== SATISFAÇÃO =====================
    {
        id: 'res-satisfaction-great', area: 'hud', emoji: [], title: 'Moradores muito felizes', used: USED,
        sm: () => g(ball(16, 17, 12, 'yellow') +
            path('M10 13q2-2.5 4 0M18 13q2-2.5 4 0', 'none', { w: 1.7 }) +
            path('M9.5 18h13q-1 6.5-6.5 6.5T9.5 18z', '#fff') +
            circ(8.5, 19, 1.8, P.pink[0], { s: 'none', op: 0.7 }) + circ(23.5, 19, 1.8, P.pink[0], { s: 'none', op: 0.7 }), { a: A('breathe', 1.8) }) +
            g(path(starD(4.5, 5, 3.5), P.yellow[0], { w: 1.1 }), { a: A('twinkle', 1.6) }) +
            g(path(starD(27.5, 4.5, 3), P.yellow[0], { w: 1.1 }), { a: A('twinkle', 1.6, 0.8) })
    },
    {
        id: 'res-satisfaction-low', area: 'hud', emoji: [], title: 'Moradores insatisfeitos', used: USED,
        sm: () => ball(16, 16, 12.5, 'orange') +
            g(ell(12, 13, 1.5, 2, O, { s: 'none' }) + ell(20, 13, 1.5, 2, O, { s: 'none' }), { a: A('wink', 5) }) +
            line('M11 21h10') + line('M9 9l4 1.5M23 9l-4 1.5', { w: 1.4 })
    },
    {
        id: 'res-satisfaction-critical', area: 'hud', emoji: [], title: 'Moradores revoltados', used: USED,
        sm: () => g(ball(16, 18, 11.5, 'red') +
            line('M9 12l5 2.5M23 12l-5 2.5', { w: 1.8 }) +
            ell(12.5, 17, 1.4, 1.6, O, { s: 'none' }) + ell(19.5, 17, 1.4, 1.6, O, { s: 'none' }) +
            line('M11 25q5-4 10 0'), { a: A('shake', 1.6) }) +
            g(circ(5, 6, 2.2, P.smoke[0], { w: 1.3 }), { a: A('steam', 1.4) }) +
            g(circ(27, 6, 2.2, P.smoke[0], { w: 1.3 }), { a: A('steam', 1.4, 0.7) })
    },

    // ===================== ORÇAMENTO =====================
    {
        id: 'res-budget-great', area: 'hud', emoji: [], title: 'Cofre cheio', used: USED,
        sm: () => [26, 22, 18].map(y => ell(11, y, 8, 2.8, P.yellow[0]) + path(`M3 ${y}v2.5q8 4 16 0V${y}`, P.yellow[1])).join('') +
            g(ball(24, 13, 6, 'yellow') + line('M24 10v6', { w: 1.6 }), { a: A('coin', 2) }) +
            sparkle(6, 9, 3.2) + sparkle(17, 6, 2.4, 0.9)
    },
    {
        id: 'res-budget-low', area: 'hud', emoji: [], title: 'Dinheiro curto', used: USED,
        sm: () => box(3, 11, 24, 15, 'brown', { rx: 3 }) + rect(17, 15.5, 10, 6, P.brown[1], { rx: 2 }) + circ(21, 18.5, 1.3, P.yellow[0], { w: 1 }) +
            g(ball(25, 9, 4.2, 'yellow') + line('M25 7v4', { w: 1.3 }), { a: A('bob', 2.4) })
    },
    {
        id: 'res-budget-critical', area: 'hud', emoji: [], title: 'Sem dinheiro', used: USED,
        sm: () => g(ell(15, 19, 11, 8, P.pink[0]) + path('M24 15l4-2v6l-3 1', P.pink[0]) +
            rect(9, 25, 3, 4, P.pink[0]) + rect(18, 25, 3, 4, P.pink[0]) +
            rect(12, 11, 6, 1.6, O, { s: 'none' }) + circ(22, 17, 1, O, { s: 'none' }) +
            line('M12 16l2 3-2 2 2 3', { w: 1.4 }), { a: A('tilt', 3) }) +
            g(path('M27 5l2-2M27 5l2 2M27 5l-2-1', 'none', { w: 1.2 }) + circ(27, 5, 1.2, P.gray[0], { w: 1 }), { a: A('drift', 2.2) })
    },

    // ===================== ENERGIA =====================
    {
        id: 'res-energy-great', area: 'hud', emoji: [], title: 'Energia de sobra', used: USED,
        sm: () => g(circ(16, 16, 9, 'none', { s: P.yellow[0], w: 1.6 }), { a: A('ripple', 1.6, 0, 'center', 'ease-out') }) +
            g(circ(16, 16, 9, 'none', { s: P.yellow[0], w: 1.6 }), { a: A('ripple', 1.6, 0.8, 'center', 'ease-out') }) +
            g(path(boltD(16, 16, 1), P.yellow[0]) + line('M16 6l-5 7', { s: '#fff', w: 1.3, op: 0.85 }), { a: A('pulse', 1.4) }) +
            sparkle(26, 6, 2.8, 0.4) + sparkle(6, 26, 2.4, 1.2)
    },
    {
        id: 'res-energy-low', area: 'hud', emoji: [], title: 'Energia faltando', used: USED,
        sm: () => rect(4, 9, 22, 14, '#fff', { rx: 3 }) + rect(26, 13, 3, 6, P.gray[0], { rx: 1 }) +
            rect(7, 12, 5, 8, P.orange[0], { s: 'none' }) +
            g(rect(13, 12, 5, 8, P.orange[0], { s: 'none' }), { a: A('blink', 1.6) })
    },
    {
        id: 'res-energy-critical', area: 'hud', emoji: [], title: 'Sem energia', used: USED,
        sm: () => rect(4, 9, 22, 14, '#fff', { rx: 3 }) + rect(26, 13, 3, 6, P.gray[0], { rx: 1 }) +
            g(rect(7, 12, 3.5, 8, P.red[0], { s: 'none' }) +
                path(boltD(17, 16, 0.42), P.red[0], { w: 1.2 }), { a: A('blinkx', 1) }) +
            line('M3 27L27 5', { s: P.red[0], w: 2.2 })
    }
];
