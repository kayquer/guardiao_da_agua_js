/**
 * Ícones de HUD, recursos, botões e status (pequenos, 32×32), mais alguns com versão grande.
 * Regra dos pequenos: formas simples, contorno grosso e UM movimento lento e sutil.
 */
'use strict';
const { O, P, rect, circ, ell, path, line, poly, g, A, box, ball, drop, cloud, gear, pivot, thick, boltD, starD, sparkD, waveD } = require('./core');

const HTML = 'index.html';
const RP = 'js/systems/ui/ResourcePanels.js';
const TS = 'js/systems/TutorialSystem.js';
const MU = 'js/systems/ui/MissionUI.js';
const QS = 'js/systems/QuestSystem.js';
const MP = 'js/systems/ui/MobilePanels.js';
const WU = 'js/systems/ui/WeatherUI.js';
const LB = 'js/systems/ui/LessonBookUI.js';
const SB = 'js/systems/ui/StudyBookUI.js';
const UI = 'js/systems/UIManager.js';

module.exports = [
    // ===================== HUD / RECURSOS =====================
    {
        id: 'res-water', area: 'hud', emoji: ['💧'], title: 'Água',
        used: [HTML + ' (#water-amount, compacto)', RP, TS, MP, WU],
        sm: () => g(drop(16, 20, 8), { a: A('bobs', 3) })
    },
    {
        id: 'res-pollution', area: 'hud', emoji: ['🏭'], title: 'Poluição',
        used: [HTML + ' (.resource-icon poluição, ajuda)', RP, TS],
        sm: () => rect(13, 20, 6, 9, P.gray[0]) +
            g(circ(12, 9, 2.6, P.smoke[0], { w: 1.5 }), { a: A('smoke', 4, 0, 'center', 'ease-out') }) +
            g(circ(19, 7, 2, P.smoke[0], { w: 1.5 }), { a: A('smoke', 4, 2, 'center', 'ease-out') }) +
            cloud(16, 18, 0.6, 'soot')
    },
    {
        id: 'res-budget', area: 'hud', emoji: ['💰'], title: 'Orçamento',
        used: [HTML + ' (orçamento, compacto, ajuda)', RP, TS, MU, MP],
        sm: () => path('M12 10h8l-2 3c5 2 8 6 8 10 0 3-3 5-10 5S6 26 6 23c0-4 3-8 8-10z', P.yellow[0], { s: 'none' }) +
            path('M21 14.5c2.5 2 5 5 5 8.5 0 3-3 5-10 5 4-1 7-3 7-6.5 0-3-1-5-2-7z', P.yellow[1], { s: 'none' }) +
            path('M12 10h8l-2 3c5 2 8 6 8 10 0 3-3 5-10 5S6 26 6 23c0-4 3-8 8-10z') +
            line('M13.5 13h5') +
            line('M18.6 18.4c-.8-1-4.6-1.3-4.6.7 0 2.1 4.9 1.2 4.9 3.4 0 2-3.9 2-5.1.7M16.3 16.6v8.3', { w: 1.6 }) +
            g(path(sparkD(24.5, 8.5, 3.5), '#fff', { w: 1.2 }), { a: A('shine', 4) })
    },
    {
        id: 'res-population', area: 'hud', emoji: ['👥'], title: 'População',
        used: [HTML + ' (população, compacto)', RP, TS, QS + ' (stakeholder citizens)'],
        sm: () => g(path('M13 25c0-5 3.5-8 8-8s8 3 8 8z', P.blue[0]) + circ(21, 10, 4, P.blue[0]), { a: A('bobs', 3.2) }) +
            g(path('M3 28c0-6 4-9 9-9s9 3 9 9z', P.orange[0]) + circ(12, 13, 4.5, P.orange[0]), { a: A('bobs', 3.2, 1.6) })
    },
    {
        id: 'res-energy', area: 'hud', emoji: ['⚡'], title: 'Energia',
        used: [HTML + ' (energia, compacto, ajuda)', RP, TS, MU, MP],
        sm: () => g(path(boltD(16, 16, 0.95), P.yellow[0]) + line('M16 6.5l-5 7', { s: '#fff', w: 1.3, op: 0.8 }), { a: A('breathe', 2.6) })
    },
    {
        id: 'res-satisfaction', area: 'hud', emoji: ['😊'], title: 'Satisfação',
        used: [HTML + ' (satisfação)', RP, TS],
        sm: () => ball(16, 16, 12.5, 'yellow') +
            circ(9.5, 18, 2, P.pink[0], { s: 'none', op: 0.7 }) + circ(22.5, 18, 2, P.pink[0], { s: 'none', op: 0.7 }) +
            g(ell(12, 13, 1.6, 2.2, O, { s: 'none' }) + ell(20, 13, 1.6, 2.2, O, { s: 'none' }), { a: A('wink', 4.5) }) +
            line('M10.5 18.5q5.5 5.5 11 0')
    },
    {
        id: 'res-temperature', area: 'hud', emoji: ['🌡️', '🤒'], title: 'Temperatura',
        used: [HTML + ' (#compact-weather-icon)', 'js/systems/WeatherService.js (código desconhecido)', WU, RP],
        sm: () => rect(12.5, 3, 7, 20, '#fff', { rx: 3.5 }) +
            g(rect(14.6, 9, 2.8, 14, P.red[0], { s: 'none' }), { a: A('grows', 4, 0, '50% 100%') }) +
            ball(16, 24, 5, 'red') + line('M21.5 8h2.5M21.5 12h2.5M21.5 16h2.5', { w: 1.5 }),
        lg: () => g(line('M92 40q4-5 0-10t0-10', { w: 3, s: P.orange[0] }), { a: A('rise', 3, 0) }) +
            g(line('M104 46q4-5 0-10t0-10', { w: 3, s: P.orange[0] }), { a: A('rise', 3, 1.5) }) +
            rect(50, 12, 28, 80, '#fff', { rx: 14 }) +
            line('M57 22v50', { s: P.white[1], w: 4 }) +
            g(rect(58.5, 36, 11, 58, P.red[0], { s: 'none', rx: 5 }), { a: A('grows', 4, 0, '50% 100%') }) +
            ball(64, 98, 18, 'red') + circ(57, 92, 4, '#fff', { s: 'none', op: 0.7 }) +
            line('M80 30h10M80 44h10M80 58h10M80 72h10', { w: 3 }) + line('M80 37h6M80 51h6M80 65h6', { w: 2.5 })
    },
    {
        id: 'ui-target', area: 'hud', emoji: ['🎯'], title: 'Missões',
        used: [HTML + ' (#btn-missions, #objective-icon)', MU + ' (ícone padrão de missão/objetivo)', QS + ' (categoria primária, missionIcon padrão)', TS],
        sm: () => circ(14, 18, 12, P.red[0]) + circ(14, 18, 8, '#fff') + circ(14, 18, 4, P.red[0]) +
            g(line('M14 18L26 6') + path('M23 4.5l4.5-1.5-1.5 4.5-2 .5z', P.yellow[0], { w: 1.5 }), { a: A('shake', 4.5, 0, '0% 100%') }),
        lg: () => g(circ(58, 72, 48, 'none', { s: P.red[0], w: 3 }), { a: A('ripple', 3, 0, 'center', 'ease-out') }) +
            ball(58, 72, 46, 'red') + circ(58, 72, 33, '#fff') + circ(58, 72, 20, P.red[0]) + circ(58, 72, 8, '#fff') +
            path('M30 50a36 36 0 0 1 22-14', 'none', { s: '#fff', w: 5, op: 0.7 }) +
            g(line('M58 72L104 26', { w: 6 }) + line('M58 72L104 26', { s: P.brown[0], w: 3 }) +
                path('M96 22l14-6-4 12-6 4-2-2z', P.yellow[0]) + path('M102 30l12-2-6 10z', P.yellow[1]), { a: A('shake', 4, 0, '0% 100%') }) +
            g(path(sparkD(26, 30, 8), P.yellow[0], { w: 2 }), { a: A('shine', 3.5) }) +
            g(path(sparkD(100, 92, 6), P.yellow[0], { w: 2 }), { a: A('shine', 3.5, 1.7) })
    },
    {
        id: 'ui-books', area: 'hud', emoji: ['📚'], title: 'Aulas',
        used: [HTML + ' (#btn-lessons)', QS + ' (categoria secundária)', 'data/building-studies.json (studyIcon water_pump)', TS, LB, SB],
        sm: () => box(4, 22, 24, 6, 'blue', { rx: 1.5 }) + box(6, 16, 21, 6, 'red', { rx: 1.5 }) +
            line('M24 18h1.5M24 20h1.5', { s: '#fff', w: 1 }) +
            g(box(5, 9, 21, 6, 'green', { rx: 1.5 }) + line('M8 12h5', { w: 1.3 }), { a: A('bobs', 3) }),
        lg: () => box(16, 96, 96, 16, 'blue', { rx: 3 }) + rect(94, 100, 12, 8, '#fff', { w: 2 }) +
            box(24, 80, 84, 16, 'red', { rx: 3 }) + rect(90, 84, 12, 8, '#fff', { w: 2 }) +
            box(18, 64, 90, 16, 'yellow', { rx: 3 }) + rect(92, 68, 10, 8, '#fff', { w: 2 }) +
            g(path('M64 34c-10-6-22-8-36-6v26c14-2 26 0 36 6z', '#fff') + path('M64 34c10-6 22-8 36-6v26c-14-2-26 0-36 6z', P.white[1]) +
                g(path('M64 34c8-5 18-7 30-7v26c-12 0-22 2-30 7z', '#fff'), { a: A('coin', 3.5, 0, '0% 50%') }) +
                line('M36 36c8-1 15 0 21 3M36 44c8-1 15 0 21 3', { w: 2 }), { a: A('bob', 3.5) }) +
            g(path(sparkD(22, 22, 7), P.yellow[0], { w: 2 }), { a: A('shine', 3) }) +
            g(path(sparkD(108, 40, 5), P.yellow[0], { w: 2 }), { a: A('shine', 3, 1.5) })
    },
    {
        id: 'ui-pause', area: 'hud', emoji: ['⏸️'], title: 'Pausar',
        used: [HTML + ' (#btn-pause, .pp-paused)'],
        sm: () => g(ball(16, 16, 13, 'blue') + rect(10.5, 9, 4.5, 14, '#fff', { rx: 1.5 }) + rect(17, 9, 4.5, 14, '#fff', { rx: 1.5 }), { a: A('breathe', 3.5) })
    },
    {
        id: 'ui-build', area: 'hud', emoji: ['🏗️'], title: 'Construir',
        used: [MP + ' (botão construir no celular)', MU + ' (objetivo de construção)', TS, 'data/building-studies.json (studyIcon treatment_plant)'],
        sm: () => rect(4, 27, 13, 3, P.dark[0], { rx: 1 }) + rect(8.5, 6, 4.5, 21, P.yellow[0]) +
            line('M8.5 11l4.5 4M8.5 19l4.5 4M13 11l-4.5 4M13 19l-4.5 4', { w: 1 }) +
            rect(5, 4.5, 24, 3.5, P.yellow[0]) + rect(4, 8, 4, 4, P.gray[0]) +
            g(line('M25 8v8', { w: 1.5 }) + rect(21.5, 16, 7, 6, P.orange[0], { rx: 1 }), { a: A('sway', 3.5, 0, '50% 0%') })
    },
    {
        id: 'ui-player', area: 'hud', emoji: ['👤'], title: 'Jogador',
        used: [HTML + ' (.player-chip-icon)', WU],
        sm: () => path('M5 29c0-7 5-11 11-11s11 4 11 11z', P.blue[0]) + path('M20 19c4 2 7 5 7 10h-4c0-4-1-7-3-10z', P.blue[1], { s: 'none' }) +
            path('M5 29c0-7 5-11 11-11s11 4 11 11z') +
            g(ball(16, 10.5, 6, 'blue'), { a: A('nod', 4, 0, '50% 100%') })
    },

    // ===================== BOTÕES / STATUS / PAINÉIS =====================
    {
        id: 'ui-help', area: 'ui', emoji: ['❓'], title: 'Ajuda',
        used: [HTML + ' (#btn-help, aba Dúvidas)', TS, SB],
        sm: () => g(ball(16, 16, 13, 'pink') + line('M12 12.5a4 4 0 1 1 5.5 3.7c-1 .5-1.5 1.2-1.5 2.3v1', { s: '#fff', w: 3 }) +
            circ(16, 23.5, 1.7, '#fff', { s: 'none' }), { a: A('tilt', 4) })
    },
    {
        id: 'ui-save', area: 'ui', emoji: ['💾'], title: 'Salvar jogo',
        used: [HTML + ' (#btn-save-game, #btn-save-settings)'],
        sm: () => g(box(5, 5, 22, 22, 'blue', { rx: 3 }) + rect(9.5, 5, 11, 7, P.gray[0]) + rect(16.5, 6.5, 2.5, 4, P.dark[0], { s: 'none' }) +
            rect(9, 15, 14, 10, '#fff', { rx: 1 }) + line('M12 19h8M12 22h5', { w: 1.3 }), { a: A('bobs', 3.5) })
    },
    {
        id: 'ui-home', area: 'ui', emoji: ['🏠'], title: 'Menu principal',
        used: [HTML + ' (#btn-main-menu, game over)'],
        sm: () => rect(20, 6, 4, 7, P.red[0]) +
            g(circ(22, 3.5, 1.6, P.smoke[0], { w: 1.2 }), { a: A('smoke', 4, 0, 'center', 'ease-out') }) +
            box(7, 15, 18, 13, 'white') + path('M3.5 16.5L16 5l12.5 11.5', P.red[0]) +
            rect(13, 20, 6, 8, P.brown[0])
    },
    {
        id: 'ui-settings', area: 'ui', emoji: ['⚙️'], title: 'Configurações',
        used: [HTML + ' (Configurações)', TS, MP],
        sm: () => g(gear(16, 16, 8.5, 'gray', { hole: '#fff' }), { a: A('spin', 10, 0, 'center', 'linear') })
    },
    {
        id: 'ui-sound', area: 'ui', emoji: ['🔊'], title: 'Ouvir em voz alta',
        used: [HTML + ' (#tutorial-read-btn, Áudio)', LB, SB],
        sm: () => path('M4 12h5l7-6v20l-7-6H4z', P.yellow[0]) +
            g(line('M20.5 12a5 5 0 0 1 0 8', { w: 2.2 }), { a: A('fade', 2) }) +
            g(line('M24 8.5a10 10 0 0 1 0 15', { w: 2.2 }), { a: A('fade', 2, 1) })
    },
    {
        id: 'ui-close', area: 'ui', emoji: ['✕', '✖️'], title: 'Fechar',
        used: [HTML + ' (.close-btn)', MU, SB],
        sm: () => g(ball(16, 16, 13, 'red') + line('M11 11l10 10M21 11L11 21', { s: '#fff', w: 3 }), { a: A('breathe', 4) })
    },
    {
        id: 'ui-play', area: 'ui', emoji: ['🎮'], title: 'Jogar',
        used: [HTML + ' (botão Jogar, Gameplay, Controles)'],
        sm: () => path('M9 9h14c4 0 6 3 6.5 7l.5 5c.3 3-3 4.5-5 2.5L21 20H11l-4 3.5c-2 2-5.3.5-5-2.5l.5-5C3 12 5 9 9 9z', P.purple[0]) +
            line('M7.5 15h5.5M10.25 12.25v5.5', { s: '#fff', w: 2.2 }) +
            g(circ(21, 13.5, 1.8, P.yellow[0], { w: 1.2 }), { a: A('blinkx', 2) }) +
            g(circ(24.5, 17, 1.8, P.green[0], { w: 1.2 }), { a: A('blinkx', 2, 1) })
    },
    {
        id: 'ui-rocket', area: 'ui', emoji: ['🚀'], title: 'Começar',
        used: [HTML + ' (botão de início do perfil)'],
        sm: () => g(
            g(path('M12.5 23h7l-3.5 7z', P.orange[0], { w: 1.5 }) + path('M14.3 23h3.4l-1.7 4z', P.yellow[0], { s: 'none' }), { a: A('flicker', 0.6, 0, '50% 0%') }) +
            path('M10 16l-4 6v3l4-2z', P.red[0]) + path('M22 16l4 6v3l-4-2z', P.red[0]) +
            path('M16 2.5c4 3 6 8 6 13v7.5H10v-7.5c0-5 2-10 6-13z', '#fff') + circ(16, 12, 2.6, P.blue[0], { w: 1.6 }),
            { x: 'transform="rotate(40 16 16)"' })
    },
    {
        id: 'ui-hello', area: 'ui', emoji: ['👋'], title: 'Olá',
        used: [HTML + ' (tela de boas-vindas)', TS],
        sm: () => line('M3 9l2.5 1.5M4 4.5l2 2', { w: 1.5 }) +
            g(rect(9, 5, 4, 13, P.yellow[0], { rx: 2 }) + rect(13.4, 3, 4, 13, P.yellow[0], { rx: 2 }) +
                rect(17.8, 4, 4, 13, P.yellow[0], { rx: 2 }) + rect(22.2, 7, 3.8, 11, P.yellow[0], { rx: 1.9 }) +
                path('M9 19l-3.5-4c-1.4-1.5.5-3.6 2-2.5L10 15', P.yellow[0]) +
                path('M8.5 14h17.5v7c0 5-4 8-8.7 8S8.5 26 8.5 21z', P.yellow[0]) +
                path('M21 15h5v6c0 4-3 7-7 7.8 4-2 4-5 4-8z', P.yellow[1], { s: 'none' }), { a: A('hand', 1.8, 0, '50% 100%') })
    },
    {
        id: 'status-done', area: 'ui', emoji: ['✅', '✔'], title: 'Concluído',
        used: [MU + ' (missão concluída, pré-requisito)', TS, LB, SB, RP],
        sm: () => g(box(4, 4, 24, 24, 'green', { rx: 6 }) + line('M10 16.5l4 4 8-9', { w: 3.2 }), { a: A('breathe', 3.5) })
    },
    {
        id: 'status-locked', area: 'ui', emoji: ['🔒'], title: 'Bloqueado',
        used: [MU + ' (missão bloqueada)', TS],
        sm: () => g(thick('M10.5 15v-4a5.5 5.5 0 0 1 11 0v4', P.gray[0], 2.5) + box(6, 14, 20, 15, 'yellow', { rx: 3 }) +
            circ(16, 20, 2, O, { s: 'none' }) + rect(15.1, 20, 1.8, 4.5, O, { s: 'none' }), { a: A('shake', 4.5, 0, '50% 0%') })
    },
    {
        id: 'status-unlocked', area: 'ui', emoji: ['🔓'], title: 'Desbloqueado',
        used: [MU + ' (missão liberada)', SB],
        sm: () => g(thick('M21.5 15V8a5.5 5.5 0 0 0-11 0v1', P.gray[0], 2.5), { a: A('bobs', 2.5) }) +
            box(6, 14, 20, 15, 'green', { rx: 3 }) + circ(16, 20, 2, O, { s: 'none' }) + rect(15.1, 20, 1.8, 4.5, O, { s: 'none' })
    },
    {
        id: 'status-pending', area: 'ui', emoji: ['⏳'], title: 'Aguardando',
        used: [MU + ' (pré-requisito pendente)', WU, SB],
        sm: () => g(path('M9 6h14c0 6-5 7-5 10s5 4 5 10H9c0-6 5-7 5-10S9 12 9 6z', P.glass[0]) +
            path('M11.5 9h9c-.5 3-3 4-4.5 5.5C14.5 13 12 12 11.5 9z', P.yellow[0], { s: 'none' }) +
            path('M10.5 24.5c1-3 4-4 5.5-4.5 1.5.5 4.5 1.5 5.5 4.5z', P.yellow[0], { s: 'none' }) +
            rect(6.5, 3, 19, 3.5, P.brown[0], { rx: 1.2 }) + rect(6.5, 25.5, 19, 3.5, P.brown[0], { rx: 1.2 }), { a: A('sand', 6) })
    },
    {
        id: 'status-star', area: 'ui', emoji: ['⭐'], title: 'Estrela',
        used: [MU + ' (recompensa)', LB],
        sm: () => g(path(starD(16, 17, 13.5, 6.2), P.yellow[0]) + path('M10.5 13.5l3-.5', { s: '#fff', w: 1.6 }), { a: A('breathe', 3) })
    },
    {
        id: 'status-trophy', area: 'ui', emoji: ['🏆'], title: 'Conquista',
        used: [MU, LB],
        sm: () => line('M9 7H5.5c0 4 2 6 4 6M23 7h3.5c0 4-2 6-4 6') +
            path('M9 4h14v7a7 7 0 0 1-14 0z', P.yellow[0]) + path('M19 4.5h3.5V11a7 7 0 0 1-5 6.6c1.5-2 1.5-4 1.5-6.6z', P.yellow[1], { s: 'none' }) +
            path('M9 4h14v7a7 7 0 0 1-14 0z') + rect(14.5, 18, 3, 3.5, P.yellow[0], { w: 1.5 }) +
            rect(10, 21.5, 12, 3.5, P.orange[0], { rx: 1 }) + rect(8, 25, 16, 4, P.brown[0], { rx: 1 }) +
            g(path(sparkD(13, 9, 3), '#fff', { w: 1.2 }), { a: A('shine', 3.5) })
    },
    {
        id: 'status-warning', area: 'ui', emoji: ['⚠️'], title: 'Atenção',
        used: [RP, WU, SB, TS],
        sm: () => path('M16 3.5L29.5 27h-27z', P.yellow[0]) + path('M16 3.5L29.5 27h-6L16 9z', P.yellow[1], { s: 'none' }) + path('M16 3.5L29.5 27h-27z') +
            g(rect(14.6, 10.5, 2.8, 9.5, O, { rx: 1.4, s: 'none' }) + circ(16, 23, 1.7, O, { s: 'none' }), { a: A('fade', 2.4) })
    },
    {
        id: 'status-info', area: 'ui', emoji: ['ℹ️'], title: 'Informação',
        used: [TS, MP],
        sm: () => ball(16, 16, 13, 'blue') + rect(14, 14, 4, 9.5, '#fff', { rx: 1.5, w: 1.5 }) +
            g(circ(16, 9.5, 2.3, '#fff', { w: 1.5 }), { a: A('hop', 3) })
    },
    {
        id: 'status-tip', area: 'ui', emoji: ['💡'], title: 'Dica',
        used: [WU + ' (dica da água)', MU, RP, SB, TS],
        sm: () => g(line('M3 12h2.5M26.5 12H29M6 3.5L7.8 5.3M26 3.5L24.2 5.3', { w: 1.8 }), { a: A('fade', 2.4) }) +
            path('M16 3a9 9 0 0 0-5 16.5V23h10v-3.5A9 9 0 0 0 16 3z', P.yellow[0]) +
            path('M19 4.3a9 9 0 0 1 2 15.2V23h-3v-4c3-3 3.5-10 1-14.7z', P.yellow[1], { s: 'none' }) +
            path('M16 3a9 9 0 0 0-5 16.5V23h10v-3.5A9 9 0 0 0 16 3z') +
            line('M13.5 15l2.5 2.5 2.5-2.5', { w: 1.5 }) + rect(11, 23, 10, 3, P.gray[0]) + rect(12.5, 26, 7, 3, P.gray[0], { rx: 1.5 })
    },
    {
        id: 'status-error', area: 'ui', emoji: ['❌'], title: 'Erro',
        used: [RP, MP, SB, TS],
        sm: () => g(line('M8 8l16 16M24 8L8 24', { w: 7.5 }) + line('M8 8l16 16M24 8L8 24', { s: P.red[0], w: 4 }), { a: A('shake', 4.5) })
    },
    {
        id: 'ui-box', area: 'ui', emoji: ['📦'], title: 'Recurso',
        used: [MU + ' (objetivo de recurso)', TS],
        sm: () => g(path('M5 13l3.5-6h15l3.5 6z', '#F2C285') + box(5, 13, 22, 15, '#E0A060', { rx: 1 }) +
            rect(13, 13, 6, 6, P.sand[0], { w: 1.5 }), { a: A('bobs', 3) })
    },
    {
        id: 'ui-chart-up', area: 'ui', emoji: ['📈'], title: 'Crescimento',
        used: [MU + ' (objetivo de alcançar)'],
        sm: () => rect(4, 4, 24, 24, '#fff', { rx: 3 }) + line('M8 8v16h17', { w: 1.6 }) +
            g(line('M9 21l5-5 4 3 7-8', { s: P.red[0], w: 2.6 }) + line('M20.5 10.5h5v5', { s: P.red[0], w: 2.6 }), { a: A('hop', 3) })
    },
    {
        id: 'ui-clipboard', area: 'ui', emoji: ['📋'], title: 'Lista de objetivos',
        used: [MU + ' (sem missão ativa)', TS, MP],
        sm: () => box(6, 5, 20, 24, 'brown', { rx: 2 }) + rect(9, 9, 14, 17, '#fff') + rect(12, 3, 8, 5, P.gray[0], { rx: 1.5 }) +
            line('M12 14h8M12 18h8M12 22h4', { w: 1.5 }) +
            g(line('M17.5 22l1.8 1.8 3.5-4', { s: P.leaf[0], w: 2.2 }), { a: A('fade', 2.5) })
    },
    {
        id: 'ui-stats', area: 'ui', emoji: ['📊'], title: 'Estatísticas',
        used: [RP + ' (painel de estatísticas)', QS + ' (stakeholder padrão)', TS, MP, SB],
        sm: () => g(rect(5.5, 15, 5.5, 13, P.blue[0]), { a: A('grows', 3, 0, '50% 100%') }) +
            g(rect(13.25, 7, 5.5, 21, P.green[0]), { a: A('grows', 3, 1, '50% 100%') }) +
            g(rect(21, 11, 5.5, 17, P.orange[0]), { a: A('grows', 3, 2, '50% 100%') }) + line('M3 28h26', { w: 2.2 })
    },
    {
        id: 'ui-book', area: 'ui', emoji: ['📖'], title: 'Livro aberto',
        used: [MU + ' (aula da missão)', LB, TS],
        sm: () => path('M2 9v18c5-1 10 0 14 2 4-2 9-3 14-2V9', P.blue[0]) +
            path('M16 8c-3-2-7-3-12-2v18c5-1 9 0 12 2z', '#fff') + path('M16 8c3-2 7-3 12-2v18c-5-1-9 0-12 2z', P.white[1]) +
            g(path('M16 8c2.3-1.6 5.3-2.4 9-2.3v18c-3.7 0-6.7.8-9 2.3z', '#fff'), { a: A('coin', 3.5, 0, '0% 50%') }) +
            line('M7 11c2.5-.3 4.5 0 6 .8M7 15c2.5-.3 4.5 0 6 .8', { w: 1.3 })
    },
    {
        id: 'ui-clock', area: 'ui', emoji: ['🕐', '⏱️'], title: 'Relógio',
        used: [TS + ' (passagem do tempo)', HTML + ' (Controles de Tempo)', SB],
        sm: () => ball(16, 16, 13, 'white') + circ(16, 6.5, 1, O, { s: 'none' }) + circ(25.5, 16, 1, O, { s: 'none' }) +
            circ(16, 25.5, 1, O, { s: 'none' }) + circ(6.5, 16, 1, O, { s: 'none' }) +
            line('M16 16l-3.5-4', { w: 2.6 }) +
            g(pivot(16, 16, 9) + line('M16 16h7.5', { s: P.red[0], w: 2 }), { a: A('spin', 12, 0, 'center', 'linear') }) +
            circ(16, 16, 1.6, O, { s: 'none' })
    },
    {
        id: 'ui-camera', area: 'ui', emoji: ['📹'], title: 'Câmera',
        used: [TS + ' (controle de câmera)'],
        sm: () => path('M21 14l8-4.5v13L21 18z', P.gray[0]) + box(3, 9, 19, 14, 'dark', { rx: 3 }) +
            circ(10, 16, 4, P.blue[0]) + circ(9, 15, 1.2, '#fff', { s: 'none' }) +
            g(circ(18, 12.5, 1.8, P.red[0], { s: 'none' }), { a: A('blinkx', 1.6) })
    },
    {
        id: 'ui-compass', area: 'ui', emoji: ['🧭'], title: 'Guia da interface',
        used: [TS + ' (tour da interface)', MU],
        sm: () => ball(16, 16, 13, 'white') + circ(16, 16, 10, 'none', { w: 1, op: 0.5 }) +
            g(pivot(16, 16, 10) + path('M16 6l3.2 10h-6.4z', P.red[0], { w: 1.5 }) + path('M16 26l3.2-10h-6.4z', P.blue[0], { w: 1.5 }), { a: A('tilt', 3) }) +
            circ(16, 16, 1.8, O, { s: 'none' })
    },
    {
        id: 'ui-celebrate', area: 'ui', emoji: ['🎉'], title: 'Parabéns',
        used: [TS, LB, SB],
        sm: () => path('M4 29l5.5-15 9.5 9.5z', P.yellow[0]) + line('M7.5 20.5l4 4M9.8 15.5l6.5 6.5', { s: P.red[0], w: 1.8 }) + path('M4 29l5.5-15 9.5 9.5z') +
            g(circ(21, 7, 1.8, P.pink[0], { w: 1.2 }), { a: A('twinkle', 2) }) +
            g(rect(24, 12, 3.5, 3.5, P.blue[0], { w: 1.2 }), { a: A('twinkle', 2, 0.7) }) +
            g(circ(14, 5, 1.6, P.green[0], { w: 1.2 }), { a: A('twinkle', 2, 1.3) }) +
            g(line('M21 19q2-2 4 0t4 0', { s: P.orange[0], w: 2 }), { a: A('twinkle', 2, 1) })
    },
    {
        id: 'ui-leaf', area: 'ui', emoji: ['🌿'], title: 'Meio ambiente',
        used: [QS + ' (stakeholder environment)', RP, MP],
        sm: () => g(path('M5 28C4 16 12 6 27 5c0 14-9 23-22 23z', P.leaf[0]) + path('M27 5c0 14-9 23-22 23 8-3 17-11 22-23z', P.leaf[1], { s: 'none' }) +
            path('M5 28C4 16 12 6 27 5c0 14-9 23-22 23z') +
            line('M5 28C11 20 16 14 22 9M11 21h6M14 17l-.5-5', { w: 1.6 }), { a: A('sway', 4, 0, '0% 100%') })
    },
    {
        id: 'ui-briefcase', area: 'ui', emoji: ['💼'], title: 'Comércio',
        used: [QS + ' (stakeholder business)'],
        sm: () => g(line('M12 9V6.5c0-1 .8-1.5 1.5-1.5h5c.7 0 1.5.5 1.5 1.5V9') + box(4, 9, 24, 18, 'brown', { rx: 3 }) +
            line('M4 16h24', { w: 1.6 }) + rect(14, 14, 4, 4.5, P.yellow[0], { w: 1.5 }), { a: A('bobs', 3) })
    },
    {
        id: 'ui-renewable', area: 'ui', emoji: ['🌱'], title: 'Renovável',
        used: [RP + ' (indicador de energia renovável)'],
        sm: () => g(line('M16 27V16', { w: 2.2 }) + path('M16 19c-1-5-5-7-10-6 0 5 4 7 10 6z', P.leaf[0]) +
            path('M16 15.5c1-6 5-9 11-8 0 6-5 9-11 8z', P.green[0]), { a: A('sway', 4, 0, '50% 100%') }) +
            ell(16, 27, 11, 3.5, P.brown[0])
    },
    {
        id: 'ui-income', area: 'ui', emoji: ['💵'], title: 'Receita',
        used: [RP + ' (receita)'],
        sm: () => g(box(3, 8, 26, 16, 'green', { rx: 2.5 }) + rect(6, 11, 20, 10, 'none', { w: 1.2 }) + circ(16, 16, 4, '#fff', { w: 1.5 }) +
            line('M16 13.5v5', { w: 1.5 }), { a: A('bobs', 3) })
    },
    {
        id: 'ui-expense', area: 'ui', emoji: ['💸'], title: 'Despesa',
        used: [RP + ' (despesa)'],
        sm: () => g(path('M8 13c-4-4-7-2-6.5 1 .5 2.5 3.5 3 6.5 1.5z', '#fff', { w: 1.5 }) +
            path('M24 13c4-4 7-2 6.5 1-.5 2.5-3.5 3-6.5 1.5z', '#fff', { w: 1.5 }) +
            g(box(7, 10, 18, 12, 'green', { rx: 2 }) + circ(16, 16, 3, '#fff', { w: 1.3 }), { x: 'transform="rotate(-10 16 16)"' }), { a: A('nod', 2.5) })
    },
    {
        id: 'ui-battery', area: 'ui', emoji: ['🔋'], title: 'Bateria',
        used: [RP + ' (energia armazenada)'],
        sm: () => rect(26, 13, 3, 6, P.gray[0], { rx: 1 }) + rect(3.5, 9, 22.5, 14, '#fff', { rx: 2.5 }) +
            rect(6.5, 11.8, 5, 8.4, P.green[0], { s: 'none' }) + rect(12.6, 11.8, 5, 8.4, P.green[0], { s: 'none' }) +
            g(rect(18.7, 11.8, 5, 8.4, P.green[0], { s: 'none' }), { a: A('fade', 2) })
    },
    {
        id: 'ui-plug', area: 'ui', emoji: ['🔌'], title: 'Tomada / conexão',
        used: [RP + ' (sem energia)', MP],
        sm: () => line('M15 24v2.5c0 2 2 3 4 3h9', { w: 2.6 }) + rect(10.5, 4, 2.5, 7, P.concrete[0], { w: 1.5 }) + rect(17, 4, 2.5, 7, P.concrete[0], { w: 1.5 }) +
            path('M8 11h14v5a7 7 0 0 1-14 0z', P.gray[0]) +
            g(path(sparkD(26, 9, 4), P.yellow[0], { w: 1.3 }), { a: A('shine', 2.5) })
    },
    {
        id: 'ui-no-water', area: 'ui', emoji: ['🚱'], title: 'Falta de água',
        used: [RP + ' (falta de água)'],
        sm: () => drop(16, 19, 7) +
            g(circ(16, 16, 12.5, 'none', { w: 5 }) + line('M7.2 7.2l17.6 17.6', { w: 5 }) +
                circ(16, 16, 12.5, 'none', { s: P.red[0], w: 2.6 }) + line('M7.2 7.2l17.6 17.6', { s: P.red[0], w: 2.6 }), { a: A('breathe', 2.4) })
    },
    {
        id: 'ui-construction', area: 'ui', emoji: ['🚧'], title: 'Em construção',
        used: [RP + ' (obra em andamento)'],
        sm: () => rect(6, 20, 3, 9, P.gray[0], { w: 1.5 }) + rect(23, 20, 3, 9, P.gray[0], { w: 1.5 }) +
            rect(3, 12, 26, 8, '#fff', { s: 'none', rx: 1.5 }) +
            path('M6 12h4l-4 8H3v-3zM14 12h4l-4 8h-4zM22 12h4l-4 8h-4z', P.orange[0], { s: 'none' }) +
            rect(3, 12, 26, 8, 'none', { rx: 1.5 }) + rect(15, 9, 2, 3, P.dark[0], { s: 'none' }) +
            g(circ(16, 7, 2.8, P.yellow[0], { w: 1.5 }), { a: A('blinkx', 1.4) })
    },
    {
        id: 'ui-recycle', area: 'ui', emoji: ['♻️'], title: 'Reciclagem',
        used: [RP + ' (reaproveitamento)'],
        sm: () => g(pivot(16, 16, 13) +
            thick('M26 16A10 10 0 0 1 9.5 23.6', P.leaf[0], 3) + poly('6.8,21 7.2,24.8 10.7,21.3', P.leaf[0], { w: 1.8 }) +
            thick('M6 16A10 10 0 0 1 22.5 8.4', P.leaf[0], 3) + poly('25.2,11 24.8,7.2 21.3,10.7', P.leaf[0], { w: 1.8 }),
            { a: A('spin', 12, 0, 'center', 'linear') })
    },
    {
        id: 'ui-axe', area: 'ui', emoji: ['🪓'], title: 'Desmatamento',
        used: [RP + ' (árvores cortadas)'],
        sm: () => g(thick('M8 28L21 9', P.brown[0], 3) + path('M17 6.5l7-2.5 4.5 6-3.5 4.5-6-4z', P.gray[0]) + line('M24 4l4.5 6', { s: '#fff', w: 1.2 }),
            { a: A('tilt', 2.6, 0, '0% 100%') })
    },
    {
        id: 'ui-sick', area: 'ui', emoji: ['😷', '🤢'], title: 'Doença',
        used: [RP + ' (saúde)', TS + ' (água contaminada)'],
        sm: () => ball(16, 16, 12.5, '#B9E86B') + line('M4 17l4-1M28 17l-4-1', { w: 1.5 }) +
            path('M8 16h16v4c0 3.5-3.8 6-8 6s-8-2.5-8-6z', '#fff') + line('M11 19.5h10M11.5 22.5h9', { w: 1.2, op: 0.6 }) +
            g(ell(12, 11.5, 1.5, 2, O, { s: 'none' }) + ell(20, 11.5, 1.5, 2, O, { s: 'none' }), { a: A('wink', 4) })
    },
    {
        id: 'ui-bus', area: 'ui', emoji: ['🚌'], title: 'Transporte',
        used: [RP + ' (mobilidade)'],
        sm: () => circ(10, 25, 3, P.dark[0]) + circ(22, 25, 3, P.dark[0]) +
            g(box(4, 6.5, 24, 17, 'yellow', { rx: 3 }) + rect(7, 9.5, 7, 6, P.glass[0], { w: 1.5 }) + rect(17, 9.5, 8, 6, P.glass[0], { w: 1.5 }) +
                circ(25, 20, 1.3, '#fff', { w: 1 }) + line('M4 18.5h24', { w: 1.3 }), { a: A('bobs', 1.6) })
    },
    {
        id: 'ui-tree', area: 'ui', emoji: ['🌳'], title: 'Árvores',
        used: [RP + ' (árvores)', TS],
        sm: () => rect(13.5, 17, 5, 12, P.brown[0]) + line('M8 29h16') +
            g(ball(16, 12, 9.5, 'leaf') + circ(12.5, 9, 2, '#fff', { s: 'none', op: 0.4 }), { a: A('sway', 4, 0, '50% 100%') })
    },
    {
        id: 'ui-river', area: 'ui', emoji: ['🏞️'], title: 'Bacia hidrográfica',
        used: [TS + ' (aula do caminho da água)'],
        sm: () => rect(3, 4, 26, 24, P.glass[0], { rx: 4, s: 'none' }) + circ(23.5, 10, 2.8, P.yellow[0], { w: 1.5 }) +
            poly('3,22 11,10 17,18 21,13 29,22 29,28 3,28', P.grass[0], { w: 1.6 }) +
            path('M9 28c1-3 5-4 5-6.5 0-1-1-1.5-.5-2.5h3c-.5 1 .5 1.5.5 2.5 0 2.5-3 3.5-3 6.5z', P.water[0], { w: 1.5 }) +
            g(line('M15.3 26.5c.4-1.6 2.4-2.6 2.4-4.5', { s: '#fff', w: 1.2, da: '2 1' }), { a: A('march', 1.2, 0, 'center', 'linear') }) +
            rect(3, 4, 26, 24, 'none', { rx: 4 })
    },
    {
        id: 'ui-farm', area: 'ui', emoji: ['🌾'], title: 'Agricultura',
        used: [TS + ' (água para todos)'],
        sm: () => [11, 21].map((x, i) =>
            g(line(`M${x} 29V14`, { w: 1.8 }) +
                [0, 1, 2].map(k => ell(x - 2.4, 20 - k * 4.5, 2.6, 1.6, P.yellow[0], { w: 1.3 }) + ell(x + 2.4, 18 - k * 4.5, 2.6, 1.6, P.yellow[0], { w: 1.3 })).join('') +
                ell(x, 5.5, 1.6, 2.6, P.yellow[0], { w: 1.3 }), { a: A('sway', 3.5, i * 1.2, '50% 100%') })).join('') + line('M5 29h22')
    },
    {
        id: 'ui-bricks', area: 'ui', emoji: ['🧱'], title: 'Construção / erosão',
        used: [TS + ' (aula sobre margens)'],
        sm: () => rect(3, 7, 26, 19, '#E8693F', { rx: 1.5 }) +
            line('M3 13.3h26M3 19.6h26M11 7v6.3M21 7v6.3M7 13.3v6.3M16 13.3v6.3M25 13.3v6.3M11 19.6V26M21 19.6V26', { w: 1.5 }) +
            g(path(sparkD(25, 6, 3.5), '#fff', { w: 1.2 }), { a: A('shine', 3.5) })
    },
    {
        id: 'ui-microscope', area: 'ui', emoji: ['🔬'], title: 'Ciência',
        used: [TS, 'data/building-studies.json (studyIcon filter_station, research_center, water_research_center)'],
        sm: () => rect(6, 26, 20, 3.5, P.dark[0], { rx: 1.5 }) + line('M18 26q7-5 1.5-12', { w: 3 }) +
            rect(9, 19.5, 14, 2.5, P.gray[0], { w: 1.5 }) + line('M16 22v4', { w: 2 }) +
            poly('10.5,6.5 15.5,4.5 20.5,15 15.5,17', P.blue[0], { w: 1.6 }) + poly('9.5,4 14.5,2 15.7,4.8 10.7,6.8', P.dark[0], { w: 1.4 }) +
            g(path(sparkD(9, 15, 3), P.yellow[0], { w: 1.1 }), { a: A('shine', 3) })
    },
    {
        id: 'ui-biohazard', area: 'ui', emoji: ['☣️'], title: 'Contaminação',
        used: [TS + ' (poluição do rio)'],
        sm: () => ball(16, 16, 13, 'yellow') +
            g(pivot(16, 16, 10) + circ(16, 9.5, 3.8, O, { s: 'none' }) + circ(10.4, 19.2, 3.8, O, { s: 'none' }) + circ(21.6, 19.2, 3.8, O, { s: 'none' }) +
                circ(16, 16, 3.2, P.yellow[0], { w: 1.6 }), { a: A('spin', 14, 0, 'center', 'linear') })
    },
    {
        id: 'ui-history', area: 'ui', emoji: ['📜'], title: 'Histórico de notificações',
        used: [HTML + ' (#btn-notifications, #nh-title)', UI + ' (setupNotificationHistory)'],
        sm: () => box(8, 6, 16, 20, 'sand', { k: 0.25 }) +
            rect(5, 3, 22, 5, P.sand[1], { rx: 2.5, w: 1.8 }) + rect(5, 24, 22, 5, P.sand[1], { rx: 2.5, w: 1.8 }) +
            line('M12 11.5h8M12 15h8M12 18.5h5', { w: 1.5 }) +
            g(line('M12 21.5h8', { s: P.red[0], w: 1.8 }), { a: A('fade', 2.2) })
    },
    {
        id: 'ui-faucet', area: 'ui', emoji: ['🚰'], title: 'Torneira / rega',
        used: [RP + ' (quem consome água)', UI + ' (consumo do prédio)', 'js/systems/ui/TreeInfoUI.js (rega da muda)'],
        sm: () => rect(3, 9, 5, 9, P.gray[0], { rx: 1, w: 1.6 }) +
            path('M8 11h12a6 6 0 0 1 6 6v2h-6v-2H8z', P.concrete[0], { w: 1.8 }) + path('M20 17v-3a4 4 0 0 1 3.5 4H20z', P.concrete[1], { s: 'none' }) +
            line('M15 11V7', { w: 2.2 }) + rect(10, 4.5, 10, 3, P.blue[0], { rx: 1.5, w: 1.5 }) +
            g(drop(23, 26.5, 2.4, 'water', { noHl: true, w: 1.4 }), { a: A('drip', 1.8, 0, 'center', 'ease-in') })
    },
    {
        id: 'ui-upgrade', area: 'ui', emoji: ['⬆️'], title: 'Evoluir',
        used: ['js/systems/building/ZoneGrowth.js (botão Evoluir e aviso)'],
        sm: () => box(3, 3, 26, 26, 'green', { rx: 6 }) +
            g(path('M16 6.5l8 8.5h-5v10h-6V15H8z', '#fff', { w: 1.8 }), { a: A('hop', 2.4) })
    },
    {
        id: 'ui-document', area: 'ui', emoji: ['📄'], title: 'Documento / outras despesas',
        used: ['js/core/ResourceManager.js (getExpenseBreakdown: outras despesas)', RP],
        sm: () => g(path('M7 3h12l7 7v19H7z', '#fff') + path('M21 10h5v19h-5z', P.white[1], { s: 'none' }) + path('M7 3h12l7 7v19H7z') +
            path('M19 3v7h7', P.white[1]) + line('M11 15h11M11 19h11M11 23h7', { w: 1.5 }), { a: A('bobs', 3) })
    },
    {
        id: 'ui-pick', area: 'ui', emoji: ['⛏️'], title: 'Cavando a cova',
        used: ['js/systems/ui/TreeInfoUI.js (abrindo a cova da muda)'],
        sm: () => [[6, 27, 0], [11, 28.5, 0.6]].map(([x, y, d]) => g(ell(x, y, 2.4, 1.5, P.soil[0], { w: 1.2 }), { a: A('hop', 1.6, d) })).join('') +
            g(thick('M10 27L22 9', P.brown[0], 3) + path('M8 9c5-5 13-6 21-2-6-1-11 0-15 3z', P.gray[0], { w: 1.6 }) +
                line('M10 8.5c5-3.5 11-4 17-2', { s: '#fff', w: 1, op: 0.8 }), { a: A('tilt', 1.6, 0, '0% 100%') })
    },
    {
        id: 'ui-native-tree', area: 'ui', emoji: ['🌲'], title: 'Árvore nativa',
        used: ['js/systems/ui/TreeInfoUI.js (árvores nativas no mapa)'],
        sm: () => rect(14, 23, 4, 6, P.brown[0], { w: 1.5 }) + line('M8 29h16') +
            g(poly('16,3 23,12 9,12', P.leaf[0], { w: 1.6 }) + poly('16,8 25,18 7,18', P.leaf[0], { w: 1.6 }) +
                poly('16,13 27,24 5,24', P.leaf[0], { w: 1.6 }) + path('M16 13l11 11h-6z', P.leaf[1], { s: 'none' }) +
                circ(13, 10, 1.3, '#fff', { s: 'none', op: 0.45 }), { a: A('sway', 4, 0, '50% 100%') })
    },
    {
        id: 'weather-wind', area: 'weather', emoji: ['💨', '🌬️'], title: 'Vento',
        used: [WU + ' (vento e rajadas)', 'data/building-studies.json (studyIcon wind_farm)'],
        sm: () => g(thick('M4 11h13a3.5 3.5 0 1 0-3.5-3.5', P.blue[0], 2.2), { a: A('drift', 3) }) +
            g(thick('M4 17h20a3.5 3.5 0 1 1-3.5 3.5', P.blue[0], 2.2), { a: A('drift', 3, 1) }) +
            g(thick('M4 23h8', P.blue[0], 2.2), { a: A('drift', 3, 2) })
    },
    {
        id: 'weather-humidity', area: 'weather', emoji: ['💦'], title: 'Umidade',
        used: [WU + ' (umidade do ar)'],
        sm: () => g(drop(12, 21, 6.5), { a: A('bobs', 3) }) + g(drop(23.5, 13, 4.5), { a: A('bobs', 3, 1.5) })
    }
];
