/**
 * Bacias para jogar (11/2026, modo loja: GameMode.mapChoice). Só dados, lidos por js/systems/Basin.js.
 * `vale` é o mapa da pesquisa (RIVER_MAP, js/data/riverMap.js, relevo revisado pelo orientador): no modo pesquisa
 * todo mundo joga nele, e ele nunca muda. As outras seguem a mesma sequência geomorfológica (rio → planície → APP →
 * planalto, ou rio encaixado → APP → planalto), só com outro traçado e outro jeito de terreno:
 *   river        = mesmo formato de RIVER_MAP (eixo [x, z, largura da planície] em células)
 *   hills        = 'few' | 'some' | 'many' (quantas encostas: o limite do ruído de colina em GridManager)
 *   start        = { aquifer, river } nível inicial (%) do aquífero e do rio (ResourceManager.reset)
 *   eventWeights = peso extra de cada tipo de evento no sorteio (EventSystem.getEventWeight)
 * Bacia nova: teste em tests/unit/basins.test.js (área inicial construível, encostas, rio cruzando o mapa).
 */
const BASIN_MAPS = {
    vale: {
        name: 'Vale do Ribeirão', icon: '🏞️',
        description: 'Um rio com meandros largos e planície que alaga. O mapa da pesquisa: equilibrado para aprender.',
        river: 'RIVER_MAP',
        hills: 'some'
    },
    serra: {
        name: 'Serra das Nascentes', icon: '⛰️',
        description: 'Rio encaixado entre encostas, sem planície. Pouco espaço plano: cada bairro precisa de cuidado com a erosão.',
        river: {
            halfWidth: 0.8, appEntrenched: 1, appAfterPlain: 2, minPlain: 0.75,
            path: [[-3, 31, 0], [5, 27, 0], [11, 31, 0], [17, 26, 0], [23, 29, 0], [29, 24, 0], [35, 27, 0], [44, 23, 0]],
            samplesPerSegment: 8
        },
        hills: 'many',
        start: { aquifer: 100, river: 100 },
        eventWeights: { flood: 1.3, wildfire: 0.8 }
    },
    litoral: {
        name: 'Planície do Litoral', icon: '🌊',
        description: 'Terra baixa e plana, com uma planície larga que alaga fácil. Muito espaço, mas a chuva forte é a grande ameaça.',
        river: {
            halfWidth: 1.2, appEntrenched: 1, appAfterPlain: 2, minPlain: 0.75,
            path: [[-3, 33, 4], [8, 31, 4], [16, 34, 4.5], [24, 32, 4], [32, 35, 4], [44, 33, 4]],
            samplesPerSegment: 8
        },
        hills: 'few',
        start: { aquifer: 100, river: 100 },
        eventWeights: { flood: 1.6, heavy_rain: 1.3, drought: 0.6 }
    },
    sertao: {
        name: 'Sertão do Rio Seco', icon: '🌵',
        description: 'Um rio fino e um aquífero que começa pela metade. Seca e queimada aparecem mais: guardar água é tudo.',
        river: {
            halfWidth: 0.6, appEntrenched: 1, appAfterPlain: 2, minPlain: 0.75,
            path: [[33, -3, 0], [31, 8, 0], [35, 16, 0], [32, 25, 0], [36, 33, 0], [34, 44, 0]],
            samplesPerSegment: 8
        },
        hills: 'some',
        start: { aquifer: 60, river: 70 },
        eventWeights: { drought: 1.7, wildfire: 1.5, heavy_rain: 0.6, flood: 0.5 }
    }
};

const DEFAULT_BASIN = 'vale';
