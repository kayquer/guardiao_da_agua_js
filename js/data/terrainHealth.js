// Saúde do pedaço de chão ou de rio clicado (painel de terreno): pesos, limites e textos dos indicadores.
// Só dados: a conta é de js/systems/TerrainHealth.js (sem DOM, testada em tests/unit/terrain-health.test.js).
//
// Cada indicador vai de 0 a 100 (`value` = quanto tem; a barra mostra isso). `better`: 'high' (quanto mais, melhor),
// 'low' (quanto menos, melhor) ou [de, até] (melhor dentro da faixa). A nota do indicador (0-100) sai disso e dá a
// cor e a palavra do nível (bom / atenção / ruim). `words` = palavra pela quantidade ([a partir de, palavra]),
// `moves` = o que mexe nele (a linha de baixo quando nada perto ajuda nem atrapalha).
const TERRAIN_HEALTH = {
    // Até quantos quadrados o que está em volta conta (árvores/obras: RADIUS; prédios que poluem: POLLUTER_RADIUS)
    RADIUS: 2,
    POLLUTER_RADIUS: 6,
    SPECIES_RADIUS: 4,
    BANK_RADIUS: 3,          // margem de uma célula de água: terra até 3 quadrados dela
    SLOPE_FULL: 0.6,         // diferença de altura entre vizinhos que já é "muito inclinado"
    SEWAGE_FULL: 8,          // esgoto sem tratar (poluição/min) que já tira todo o oxigênio que o esgoto pode tirar
    ROOF_IMPERVIOUS: 0.6,    // prédio sem runoffImpervious nos dados: telhado + calçada cobrem 60% do chão
    TREATMENT: ['treatment_plant', 'filter_station', 'water_reuse_plant'], // tratam o esgoto antes do rio

    // Nota (0-100) → nível. Vale para cada indicador e para a nota geral.
    LEVELS: { good: 65, ok: 40 },
    LEVEL_WORDS: { good: 'Bom', ok: 'Atenção', bad: 'Ruim' },

    soil: {
        infiltration: {
            label: 'Infiltração', icon: '💧', better: 'high',
            words: [[0, 'Quase nada'], [40, 'Pouca'], [65, 'Boa']],
            moves: 'Sobe com árvores e jardins de chuva; desce com asfalto, telhados e chão inclinado.',
            base: { grassland: 66, app: 72, floodplain: 58, hill: 45 },
            slope: -25, impervious: -55, cover: 25, absorber: 8, absorberMax: 20, soaked: -12
        },
        moisture: {
            label: 'Umidade do solo', icon: '🌱', better: [40, 85],
            words: [[0, 'Seco'], [22, 'Pouco úmido'], [40, 'Úmido'], [86, 'Encharcado']],
            moves: 'Sobe perto da água, com chuva e sombra das árvores; desce na seca e no chão coberto.',
            base: 35, nearWater: 40, perCell: 8, zone: { floodplain: 25, app: 10, hill: -10 },
            rain: 30, drought: -28, cover: 15, impervious: -15
        },
        cover: {
            label: 'Matéria orgânica', icon: '🍂', better: 'high',
            words: [[0, 'Chão pelado'], [40, 'Pouca'], [65, 'Bastante']],
            moves: 'Sobe com árvores e mudas por perto (folhas viram adubo); desce com desmatamento e chão pelado na encosta.',
            base: 20, cover: 65, treeHere: 15, riparian: 10, deforestation: -25, bareSlope: -12
        },
        pollution: {
            label: 'Poluição local', icon: '☣️', better: 'low',
            words: [[0, 'Pouca'], [36, 'Média'], [61, 'Muita']],
            moves: 'Sobe com a poluição da cidade e fábricas perto; desce com árvores e tratamento de esgoto.',
            city: 0.7, polluters: 1, pollutersMax: 40, cover: -15
        },
        erosion: {
            label: 'Erosão', icon: '🪨', better: 'low',
            words: [[0, 'Pouca'], [36, 'Alguma'], [61, 'Forte']],
            moves: 'Sobe em chão inclinado sem plantas, com chuva e rua de terra; desce com árvores e controle de enxurrada.',
            slope: 45, bare: 22, rain: 20, dirtRoad: 5, dirtRoadMax: 15, deforestation: 12, absorber: -6, bareBank: 10
        }
    },

    water: {
        oxygen: {
            label: 'Oxigênio na água', icon: '🫧', better: 'high',
            words: [[0, 'Quase nada'], [20, 'Pouco'], [40, 'Médio'], [65, 'Bom']],
            moves: 'Desce com esgoto sem tratar e poluição; sobe com ETE, filtros, mata ciliar e rio cheio correndo.',
            base: 82, city: -0.5, sewage: -35, polluters: -0.5, pollutersMax: 20, treatment: 7, treatmentMax: 14,
            riparian: 12, flow: 0.15, heat: -8
        },
        turbidity: {
            label: 'Turbidez', icon: '🟤', better: 'low',
            words: [[0, 'Clara'], [36, 'Turva'], [61, 'Barrenta']],
            moves: 'Água barrenta ou suja: sobe com margem sem mata, rua de terra perto, chuva forte e poluição; desce com árvores na margem.',
            base: 10, city: 0.25, bareBanks: 35, dirtRoad: 6, dirtRoadMax: 24, rain: 18, storm: 15, lowRiver: 10, riparian: -8
        },
        river: {
            label: 'Nível do rio', icon: '🌊', better: 'high',
            words: [[0, 'Muito baixo'], [40, 'Baixo'], [65, 'Bom'], [90, 'Cheio']],
            moves: 'Desce quando a cidade puxa muita água e na seca; sobe com chuva, nascentes, ETE e filtros.'
        },
        shade: {
            label: 'Sombra (água fresca)', icon: '🌳', better: 'high',
            words: [[0, 'Sem sombra'], [40, 'Pouca sombra'], [65, 'Fresca']],
            moves: 'Árvores na margem fazem sombra e deixam a água fresca; sol forte e seca esquentam.',
            base: 12, riparian: 80, hot: -15, drought: -10
        },
        life: {
            label: 'Vida aquática', icon: '🐟', better: 'high',
            words: [[0, 'Quase nenhuma'], [40, 'Pouca'], [65, 'Muita']],
            moves: 'Depende do oxigênio, da água clara e fresca e do rio cheio.',
            weights: { oxygen: 0.4, turbidity: 0.2, river: 0.2, shade: 0.2 }, perSpecies: 4, speciesMax: 12
        }
    },

    // Peso de cada indicador na nota geral
    WEIGHTS: { infiltration: 1, moisture: 0.8, cover: 1, pollution: 1, erosion: 1, oxygen: 1.2, turbidity: 1, river: 1, shade: 0.7, life: 1.5 },

    // Nome curto de cada coisa que ajuda ou atrapalha (a linha "Ajuda: … Atrapalha: …"); par = [quando ajuda, quando atrapalha]
    FACTORS: {
        slope: 'chão inclinado', impervious: 'asfalto e telhados perto', cover: 'árvores perto', absorber: 'controle de enxurrada perto',
        soaked: 'chão já encharcado', nearWater: 'água perto', zone: ['beira do rio', 'encosta'], rain: 'chuva agora', drought: 'seca',
        treeHere: 'árvore aqui', riparian: 'mata ciliar', deforestation: 'desmatamento na cidade', bareSlope: 'encosta sem plantas',
        city: 'poluição da cidade', polluters: 'prédios que poluem perto', bare: 'chão sem plantas', dirtRoad: 'rua de terra perto',
        bareBank: 'margem sem mata', sewage: 'esgoto sem tratar', treatment: 'ETE e filtros', flow: ['rio cheio correndo', 'rio baixo e parado'],
        heat: 'água quente', bareBanks: 'margem sem mata', storm: 'chuva forte', lowRiver: 'rio baixo', hot: 'sol forte',
        // Vida aquática: cada parte acima do meio ajuda, abaixo atrapalha
        life_oxygen: ['bastante oxigênio', 'pouco oxigênio'], life_turbidity: ['água clara', 'água barrenta'],
        life_river: ['rio cheio', 'rio baixo'], life_shade: ['sombra na margem', 'pouca sombra'],
        species: 'bichos por perto'
    }
};
