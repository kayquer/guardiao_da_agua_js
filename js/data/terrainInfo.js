// Nome, explicação e regra de cada faixa do relevo: fonte única para o painel de terreno, o toque no celular, os
// avisos de construção e o painel de requisitos. `water`, `floodplain` e `hill` são tipos de terreno; `grassland` é o
// planalto; `app` é uma faixa sobre o planalto (GridManager.getTerrainZone). Conteúdo revisado pelo orientador da pesquisa.
const TERRAIN_INFO = {
    water: {
        name: 'Rio', short: 'rio', icon: '💧', build: 'Só pontes, usinas e jardins flutuantes',
        description: 'A água corre por aqui. Ela abastece a cidade, por isso precisa continuar limpa.',
        descriptionEntrenched: 'Neste trecho o rio é encaixado: corre apertado entre terras mais altas, sem planície. Depois da margem já vem a APP.',
        descriptionPlain: 'Neste trecho o rio tem planície: uma faixa baixa ao lado dele, que recebe a água nas cheias.'
    },
    floodplain: {
        name: 'Planície fluvial', short: 'planície', icon: '🏞️', build: 'Não pode ser ocupada',
        description: 'Faixa baixa e plana sempre colada ao rio. Quando o rio enche, a água se espalha por aqui: é uma área alagável, e por isso não pode ser ocupada. Nem todo rio tem planície.',
        blocked: 'Planície: alaga quando o rio enche, não pode construir'
    },
    app: {
        name: 'APP do rio', short: 'APP', icon: '🌳', build: 'Protegida: só mudas, parque linear e monitoramento',
        description: 'Área de Preservação Permanente: a faixa de mata que protege o rio.',
        descriptionEntrenched: 'Área de Preservação Permanente: a faixa de mata que protege o rio. Como aqui o rio é encaixado, ela começa na beira dele, com 30 metros ou mais (no jogo, cada bloco vale cerca de 30 metros).',
        descriptionPlain: 'Área de Preservação Permanente: a faixa de mata que protege o rio. Aqui ela começa depois da planície, já no planalto, e costuma ter 50 metros ou mais (no jogo, cada bloco vale cerca de 30 metros).',
        blocked: 'APP: mata protegida do rio, não pode construir'
    },
    grassland: {
        name: 'Planalto', short: 'planalto', icon: '🌿', build: 'Pode construir',
        description: 'Terra mais alta e de inclinação suave, fora do alcance das cheias. É aqui que a cidade pode crescer.'
    },
    hill: {
        name: 'Encosta', short: 'encosta', icon: '⛰️', build: 'Só algumas construções',
        description: 'Parte mais inclinada do relevo. A ocupação precisa de inclinação suave, por isso poucas construções ficam aqui.'
    }
};

// A sequência do rio para o planalto, mostrada no painel de terreno (com e sem planície)
const TERRAIN_SEQUENCE = {
    plain: ['water', 'floodplain', 'app', 'grassland'],
    entrenched: ['water', 'app', 'grassland']
};
