/**
 * Bacias para jogar (11/2026, modo loja: GameMode.mapChoice). Só dados, lidos por js/systems/Basin.js.
 * `vale` é o mapa da pesquisa (RIVER_MAP, js/data/riverMap.js, relevo revisado pelo orientador): no modo pesquisa
 * todo mundo joga nele, e ele nunca muda. As outras seguem a mesma sequência geomorfológica (rio → planície → APP →
 * planalto, ou rio encaixado → APP → planalto), só com outro traçado e outro jeito de terreno:
 *   river        = mesmo formato de RIVER_MAP (eixo [x, z, largura da planície] em células)
 *   hills        = 'few' | 'some' | 'many' (quantas encostas: o limite do ruído de colina em GridManager)
 *   start        = { aquifer, river } nível inicial (%) do aquífero e do rio (ResourceManager.reset)
 *   eventWeights = peso extra de cada tipo de evento no sorteio (EventSystem.getEventWeight)
 *   palette      = cara da bacia na tela (só cor, nunca relevo); o que faltar vem de BASIN_PALETTE (= o vale).
 *                  Lida por Basin.palette(id) → GridManager (cor de vértice dos blocos e da água) e TreeSystem (copas).
 * Bacia nova: teste em tests/unit/basins.test.js (área inicial construível, encostas, rio cruzando o mapa).
 */

/**
 * Paleta-base = o vale, o mapa da pesquisa: as cores que o jogo sempre teve (só a encosta deixou de ser cinza-concreto
 * e virou terra/rocha, em todas as bacias). Terreno em RGB 0-255 (como GridManager.getMinecraftTerrainColor);
 * água e copas em 0-1 (como o shader da água e o Color3 das árvores).
 *   grassland / floodplain / app = topo do planalto, da planície fluvial e da APP
 *   hill / hillSide              = topo e laterais da encosta (as laterais ainda escurecem para baixo)
 *   bank                         = topo da terra encostada na água (praia, barranco); null = a cor da própria faixa
 *   water.shallow / water.deep   = água rasa / funda (a funda é mais opaca)
 *   trees.round / dark / pine    = copas das três árvores nativas (TreeSystem)
 * GridManager.getMinecraftTerrainColor repete grassland/floodplain/app/hill para rodar sem este arquivo (testes);
 * basins.test.js confere que os dois não se separam.
 */
const BASIN_PALETTE = {
    grassland: [91, 153, 76],
    floodplain: [62, 112, 74],
    app: [74, 132, 66],
    hill: [138, 116, 88],
    hillSide: [124, 100, 76],
    bank: null,
    water: { shallow: [0.25, 0.56, 1.0], deep: [0.15, 0.45, 0.8] },
    trees: { round: [0.22, 0.58, 0.2], dark: [0.13, 0.42, 0.16], pine: [0.1, 0.36, 0.2] }
};

const BASIN_MAPS = {
    vale: {
        name: 'Vale do Ribeirão', icon: '🏞️',
        description: 'Um rio com meandros largos e planície que alaga. O mapa clássico: equilibrado para aprender.',
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
        // Mata atlântica de serra: verdes fundos, encosta de rocha cinza-amarronzada, rio verde-azulado escuro
        palette: {
            grassland: [44, 104, 62], floodplain: [40, 100, 70], app: [42, 100, 56],
            hill: [100, 90, 70], hillSide: [104, 88, 74], bank: null,
            water: { shallow: [0.18, 0.52, 0.72], deep: [0.08, 0.34, 0.5] },
            trees: { round: [0.13, 0.46, 0.16], dark: [0.07, 0.32, 0.12], pine: [0.06, 0.28, 0.17] }
        },
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
        // Restinga: verdes claros, barranco de areia clara, água turquesa
        palette: {
            grassland: [142, 178, 100], floodplain: [92, 146, 92], app: [100, 156, 84],
            hill: [170, 150, 112], hillSide: [156, 134, 100], bank: [222, 204, 152],
            water: { shallow: [0.24, 0.82, 0.86], deep: [0.07, 0.55, 0.68] },
            trees: { round: [0.32, 0.66, 0.26], dark: [0.2, 0.5, 0.22], pine: [0.16, 0.46, 0.28] }
        },
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
        // Caatinga: capim seco ocre/cáqui, solo avermelhado, mata cinza-esverdeada, rio barrento
        palette: {
            grassland: [160, 152, 98], floodplain: [130, 138, 84], app: [138, 136, 92],
            hill: [150, 106, 80], hillSide: [134, 94, 72], bank: [172, 130, 98],
            water: { shallow: [0.5, 0.57, 0.48], deep: [0.34, 0.4, 0.33] },
            trees: { round: [0.46, 0.5, 0.26], dark: [0.36, 0.4, 0.22], pine: [0.32, 0.46, 0.3] }
        },
        start: { aquifer: 60, river: 70 },
        eventWeights: { drought: 1.7, wildfire: 1.5, heavy_rain: 0.6, flood: 0.5 }
    }
};

const DEFAULT_BASIN = 'vale';
