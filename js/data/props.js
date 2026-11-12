/**
 * PROPS DE CENÁRIO (dados puros) — Kit Props Brasil Low Poly (github.com/kayquer/kit-props-brasil-lowpoly)
 *
 * Peças pequenas e leves (≤ PROP_SETTINGS.MAX_TRIS triângulos) que enfeitam o mapa e contam a história da
 * cidade: a natureza já está lá no começo, o dia a dia aparece conforme a cidade cresce, a tecnologia aparece
 * junto com os prédios que a trazem e a poluição aparece (e some) com a poluição. Nunca ocupam a grade:
 * construir em cima tira o prop. Quem decide onde cada um fica é js/systems/props/PropPlanner.js (puro);
 * js/systems/PropSystem.js desenha tudo em poucos meshes (um por pedaço do mapa, uma draw call cada).
 *
 * PROP_TYPES[id] = {
 *   file:  .glb em models/props/ (copiado do kit; scripts/sync-props.js)
 *   group: natureza | fauna | rua | rural | rio | tecnologia | poluicao (só organização e testes)
 *   place: onde pode ficar (célula livre: sem prédio, rua nem árvore)
 *          land  = grama/várzea      hill = encosta           bank  = terra encostada na água
 *          water = água perto da margem                       road  = terra encostada numa rua
 *          zone  = até 2 células de uma zona residencial/comercial pronta
 *          near  = até 3 células de um dos prédios de `requires`
 *          rural = grama longe da cidade (≥ PROP_SETTINGS.RURAL_DISTANCE de qualquer prédio)
 *          city  = grama até 3 células de qualquer prédio (obra também)
 *   max:   quantos no máximo (qualidade Alta); a quantidade real = max × intensidade × fator da qualidade
 *   level: nível da cidade a partir do qual aparece (PROP_LEVELS; 0 = desde o começo). Um nível depois
 *          já está completo (no nível de entrada aparece metade)
 *   requires: [ids] — só com pelo menos um desses prédios pronto; `perBuilding` = quantos por prédio
 *   pollution: [de, até] — aparece a partir de `de` e chega ao máximo em `até` (sinais de poluição)
 *   cleanBelow: [some, cheio] — bioindicador: todo abaixo de `cheio`, some de vez em `some` (fauna do rio)
 *   sewage: true — só com esgoto sem tratamento (cidade com moradores e sem ETE pronta)
 *   deforestation: [de, até] — parte da mata do começo derrubada para obras (0-1, TreeSystem): tocos e toras
 *   face:  'water' | 'road' — a frente (-Z do modelo) vira para a água/rua vizinha; sem isso o giro é sorteado
 *   scale: escala do modelo (padrão 1)
 * }
 */
const PROP_SETTINGS = {
    MAX_TRIS: 150,              // orçamento por prop (tests/unit/props.test.js)
    CHUNK: 20,                  // células por lado de cada pedaço (40×40 → 4 meshes = no máximo 4 draw calls)
    REFRESH_MS: 2000,           // replaneja a cada 2 s de jogo rodando (ou logo depois de construir/demolir)
    RURAL_DISTANCE: 6,
    MAX_TOTAL: 400,             // teto geral na Alta (≤ 400 × 150 = 60 mil triângulos no pior caso)
    QUALITY: { high: 1, medium: 0.7, low: 0.4 },
    SCALE: 1.6,                 // os props são "de brinquedo": maiores para ler na câmera do jogo (os altos têm scale próprio)
    JITTER: 0.55                // deslocamento máximo dentro da célula (unidades; célula = 2)
};

// Nível da cidade para os props: o maior nível em que a população OU as missões feitas chegam lá
const PROP_LEVELS = [
    { population: 0, missions: 0 },
    { population: 60, missions: 1 },
    { population: 150, missions: 2 },
    { population: 350, missions: 4 },
    { population: 700, missions: 6 }
];

// Ordem = prioridade na disputa por uma célula (o primeiro tipo que quer a célula fica com ela)
const PROP_TYPES = {
    // ===== Infraestrutura de rua e tecnologia: ficam mesmo com a cidade suja (antes da poluição na disputa) =====
    poste_concreto: { file: 'poste_concreto.glb', group: 'rua', place: 'road', max: 18, level: 1, face: 'road', scale: 0.6 },
    hidrante: { file: 'hidrante.glb', group: 'rua', place: 'road', max: 8, level: 1, face: 'road' },
    bueiro: { file: 'bueiro.glb', group: 'rua', place: 'road', max: 8, level: 1 },
    placa_rua: { file: 'placa_rua.glb', group: 'rua', place: 'road', max: 8, level: 1, face: 'road', scale: 0.7 },
    poste_solar: { file: 'poste_solar.glb', group: 'tecnologia', place: 'road', max: 16, requires: ['solar_farm'], perBuilding: 8, face: 'road', scale: 0.6 },
    boia_rio: { file: 'boia_rio.glb', group: 'tecnologia', place: 'water', max: 6, requires: ['monitoring_station', 'water_quality_monitor'], perBuilding: 3 },
    pluviometro: { file: 'pluviometro.glb', group: 'tecnologia', place: 'near', max: 4, requires: ['monitoring_station'], perBuilding: 2, scale: 0.8 },
    placa_educativa: { file: 'placa_educativa.glb', group: 'tecnologia', place: 'bank', max: 6, requires: ['school', 'technical_school', 'university', 'museum'], perBuilding: 2, face: 'road' },
    barril_chuva: { file: 'barril_chuva.glb', group: 'tecnologia', place: 'zone', max: 10, requires: ['rain_garden', 'green_roof', 'green_wall'], perBuilding: 4, scale: 0.75 },
    hidrometro: { file: 'hidrometro.glb', group: 'tecnologia', place: 'zone', max: 10, requires: ['loss_control_center'], perBuilding: 10, face: 'road' },
    lixeiras_coleta: { file: 'lixeiras_coleta.glb', group: 'tecnologia', place: 'road', max: 8, requires: ['recycling_point', 'recycling_coop', 'ecopark'], perBuilding: 3, face: 'road' },
    // Captação antiga de água: cata-vento ao lado das bombas e poços
    moinho_vento: { file: 'moinho_vento.glb', group: 'rural', place: 'near', max: 4, requires: ['water_pump', 'water_well'], perBuilding: 1, scale: 0.8 },

    // ===== Sinais de poluição: aparecem com a poluição e somem quando ela baixa =====
    manilha_esgoto: { file: 'manilha_esgoto.glb', group: 'poluicao', place: 'bank', max: 6, sewage: true, pollution: [25, 55], face: 'water' },
    peixe_morto: { file: 'peixe_morto.glb', group: 'poluicao', place: 'water', max: 8, pollution: [72, 90] },
    espuma_rio: { file: 'espuma_rio.glb', group: 'poluicao', place: 'water', max: 10, pollution: [62, 85] },
    lixo_flutuante: { file: 'lixo_flutuante.glb', group: 'poluicao', place: 'water', max: 10, pollution: [45, 75] },
    tambor_enferrujado: { file: 'tambor_enferrujado.glb', group: 'poluicao', place: 'bank', max: 5, pollution: [58, 85] },
    pneus_velhos: { file: 'pneus_velhos.glb', group: 'poluicao', place: 'land', max: 6, pollution: [45, 75] },
    monte_lixo: { file: 'monte_lixo.glb', group: 'poluicao', place: 'zone', max: 8, pollution: [52, 80] },
    saco_lixo: { file: 'saco_lixo.glb', group: 'poluicao', place: 'road', max: 12, pollution: [35, 65] },
    entulho: { file: 'entulho.glb', group: 'poluicao', place: 'road', max: 6, pollution: [48, 78] },
    aguape: { file: 'aguape.glb', group: 'natureza', place: 'water', max: 10, pollution: [38, 70] }, // esgoto aduba o rio: aguapé demais
    cano_pvc: { file: 'cano_pvc.glb', group: 'poluicao', place: 'bank', max: 5, sewage: true, pollution: [30, 60], face: 'water' },
    carrinho_mercado: { file: 'carrinho_mercado.glb', group: 'poluicao', place: 'water', max: 4, pollution: [55, 85] },
    galao_agrotoxico: { file: 'galao_agrotoxico.glb', group: 'poluicao', place: 'bank', max: 4, pollution: [55, 85] },
    sofa_velho: { file: 'sofa_velho.glb', group: 'poluicao', place: 'road', max: 4, pollution: [40, 70] },
    cacamba_entulho: { file: 'cacamba_entulho.glb', group: 'poluicao', place: 'road', max: 4, pollution: [45, 75], scale: 0.8 },
    geladeira_velha: { file: 'geladeira_velha.glb', group: 'poluicao', place: 'zone', max: 4, pollution: [50, 80] },
    carcaca_carro: { file: 'carcaca_carro.glb', group: 'poluicao', place: 'city', max: 4, pollution: [55, 85], scale: 0.8 },

    // ===== Desmatamento: tocos, toras e barranco caindo onde a mata foi derrubada para obras =====
    toco_serrado: { file: 'toco_serrado.glb', group: 'poluicao', place: 'city', max: 12, deforestation: [0.04, 0.3] },
    pilha_toras: { file: 'pilha_toras.glb', group: 'poluicao', place: 'city', max: 5, deforestation: [0.12, 0.4] },
    barranco_erodido: { file: 'barranco_erodido.glb', group: 'poluicao', place: 'bank', max: 8, deforestation: [0.15, 0.5], face: 'water' },

    // ===== Rio: ribeirinhos com a cidade crescendo, enquanto a água está limpa =====
    pescaria: { file: 'pescaria.glb', group: 'rio', place: 'bank', max: 4, level: 1, cleanBelow: [65, 45], face: 'water' },
    covo: { file: 'covo.glb', group: 'rio', place: 'bank', max: 3, level: 2, cleanBelow: [65, 45], face: 'water' },
    bombona_flutuante: { file: 'bombona_flutuante.glb', group: 'rio', place: 'water', max: 3, level: 2, cleanBelow: [70, 50] },
    trapiche: { file: 'trapiche.glb', group: 'rio', place: 'bank', max: 3, level: 1, cleanBelow: [70, 50], face: 'water', scale: 0.7 },
    canoa: { file: 'canoa.glb', group: 'rio', place: 'water', max: 4, level: 1, cleanBelow: [70, 50], scale: 0.7 },
    rede_pesca: { file: 'rede_pesca.glb', group: 'rio', place: 'bank', max: 3, level: 2, cleanBelow: [65, 45], face: 'water' },

    // ===== Dia a dia da cidade: aparece conforme ela cresce =====
    cachorro_caramelo: { file: 'cachorro_caramelo.glb', group: 'fauna', place: 'zone', max: 4, level: 1 },
    cone_transito: { file: 'cone_transito.glb', group: 'rua', place: 'road', max: 6, level: 1 },
    lixeira_grade: { file: 'lixeira_grade.glb', group: 'rua', place: 'zone', max: 8, level: 2, face: 'road', scale: 0.75 },
    caixa_dagua: { file: 'caixa_dagua.glb', group: 'rua', place: 'zone', max: 8, level: 2 },
    banco_praca: { file: 'banco_praca.glb', group: 'rua', place: 'zone', max: 8, level: 2, face: 'road' },
    orelhao: { file: 'orelhao.glb', group: 'rua', place: 'road', max: 4, level: 2, face: 'road', scale: 0.75 },
    bebedouro: { file: 'bebedouro.glb', group: 'rua', place: 'zone', max: 4, level: 2, face: 'road' },
    mesa_cadeiras: { file: 'mesa_cadeiras.glb', group: 'rua', place: 'zone', max: 5, level: 3 },
    carrinho_pipoca: { file: 'carrinho_pipoca.glb', group: 'rua', place: 'road', max: 3, level: 3, face: 'road', scale: 0.8 },
    barraca_feira: { file: 'barraca_feira.glb', group: 'rua', place: 'road', max: 4, level: 3, face: 'road', scale: 0.8 },
    bicicletario: { file: 'bicicletario.glb', group: 'rua', place: 'road', max: 5, level: 3, face: 'road' },

    carrinho_mao: { file: 'carrinho_mao.glb', group: 'rua', place: 'road', max: 4, level: 1 },
    monte_areia: { file: 'monte_areia.glb', group: 'rua', place: 'road', max: 4, level: 1 },
    botijao: { file: 'botijao.glb', group: 'rua', place: 'zone', max: 6, level: 2 },
    varal: { file: 'varal.glb', group: 'rua', place: 'zone', max: 5, level: 2 },
    tanque_lavar: { file: 'tanque_lavar.glb', group: 'rua', place: 'zone', max: 4, level: 2, face: 'road' },
    cavalete_pf: { file: 'cavalete_pf.glb', group: 'rua', place: 'road', max: 3, level: 3, face: 'road' },

    // ===== Campo: em volta, longe da cidade =====
    poco_caipira: { file: 'poco_caipira.glb', group: 'rural', place: 'rural', max: 3, level: 1, scale: 0.8 },
    pilha_lenha: { file: 'pilha_lenha.glb', group: 'rural', place: 'rural', max: 4, level: 1 },
    latao_leite: { file: 'latao_leite.glb', group: 'rural', place: 'rural', max: 3, level: 2 },
    cocho_gado: { file: 'cocho_gado.glb', group: 'rural', place: 'rural', max: 4, level: 2 },
    tamandua: { file: 'tamandua.glb', group: 'fauna', place: 'rural', max: 2, level: 1, cleanBelow: [70, 50] },
    cerca_mourao: { file: 'cerca_mourao.glb', group: 'rural', place: 'rural', max: 10, level: 1 },
    fardo_feno: { file: 'fardo_feno.glb', group: 'rural', place: 'rural', max: 8, level: 1 },
    porteira: { file: 'porteira.glb', group: 'rural', place: 'rural', max: 3, level: 2 },
    vaca: { file: 'vaca.glb', group: 'fauna', place: 'rural', max: 6, level: 2 },
    caixotes: { file: 'caixotes.glb', group: 'rural', place: 'rural', max: 4, level: 2 },
    espantalho: { file: 'espantalho.glb', group: 'rural', place: 'rural', max: 3, level: 3 },
    colmeia: { file: 'colmeia.glb', group: 'rural', place: 'rural', max: 4, level: 3 },
    horta: { file: 'horta.glb', group: 'rural', place: 'zone', max: 4, level: 3 },

    // ===== Bichos do rio: bioindicadores (somem com a água suja) =====
    garca: { file: 'garca.glb', group: 'fauna', place: 'bank', max: 6, cleanBelow: [55, 35] },
    capivara: { file: 'capivara.glb', group: 'fauna', place: 'bank', max: 5, cleanBelow: [60, 40] },
    tartaruga: { file: 'tartaruga.glb', group: 'fauna', place: 'bank', max: 4, cleanBelow: [45, 25] },
    vitoria_regia: { file: 'vitoria_regia.glb', group: 'natureza', place: 'water', max: 8, cleanBelow: [55, 35] },
    sapo: { file: 'sapo.glb', group: 'fauna', place: 'bank', max: 5, cleanBelow: [40, 20] }, // anfíbio: o primeiro a sumir
    lambaris: { file: 'lambaris.glb', group: 'fauna', place: 'water', max: 6, cleanBelow: [50, 30] },

    // ===== Bichos da mata: somem com o ar e a água sujos =====
    tucano: { file: 'tucano.glb', group: 'fauna', place: 'land', max: 4, cleanBelow: [70, 50] },
    arara: { file: 'arara.glb', group: 'fauna', place: 'land', max: 4, cleanBelow: [70, 50] },
    quati: { file: 'quati.glb', group: 'fauna', place: 'land', max: 4, cleanBelow: [70, 50] },
    tatu: { file: 'tatu.glb', group: 'fauna', place: 'land', max: 4, cleanBelow: [75, 55] },
    ninho_joao_de_barro: { file: 'ninho_joao_de_barro.glb', group: 'fauna', place: 'land', max: 4 },

    // ===== Natureza: desde o começo =====
    taboa: { file: 'taboa.glb', group: 'natureza', place: 'bank', max: 14 },
    pedras: { file: 'pedras.glb', group: 'natureza', place: 'bank', max: 12 },
    mandacaru: { file: 'mandacaru.glb', group: 'natureza', place: 'hill', max: 10 },
    matacao: { file: 'matacao.glb', group: 'natureza', place: 'land', max: 8, scale: 0.7 },
    cupinzeiro: { file: 'cupinzeiro.glb', group: 'natureza', place: 'land', max: 8 },
    tronco_caido: { file: 'tronco_caido.glb', group: 'natureza', place: 'land', max: 8 },
    toco: { file: 'toco.glb', group: 'natureza', place: 'land', max: 8 },
    arbustos: { file: 'arbustos.glb', group: 'natureza', place: 'land', max: 16 },
    capim_alto: { file: 'capim_alto.glb', group: 'natureza', place: 'land', max: 22 },
    flores_campo: { file: 'flores_campo.glb', group: 'natureza', place: 'land', max: 18 },
    bambu: { file: 'bambu.glb', group: 'natureza', place: 'bank', max: 6 },
    bananeira: { file: 'bananeira.glb', group: 'natureza', place: 'land', max: 6 },
    bromelia: { file: 'bromelia.glb', group: 'natureza', place: 'land', max: 8 },
    coqueiro: { file: 'coqueiro.glb', group: 'natureza', place: 'land', max: 4, scale: 0.8 }
};
