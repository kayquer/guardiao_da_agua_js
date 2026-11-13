/**
 * PROPS DE CENÁRIO (dados puros) — Kit Props Brasil Low Poly (github.com/kayquer/kit-props-brasil-lowpoly)
 * e, para os bichos ameaçados, Kit Fauna Ameaçada Low Poly (github.com/kayquer/kit-fauna-ameacada-lowpoly)
 *
 * Peças pequenas e leves que enfeitam o mapa e contam a história da cidade: a natureza já está lá no começo, o dia
 * a dia aparece conforme a cidade cresce, a tecnologia aparece junto com os prédios que a trazem e a poluição
 * aparece (e some) com a poluição. Nunca ocupam a grade: construir em cima tira o prop. Quem decide onde cada um
 * fica é js/systems/props/PropPlanner.js (puro); js/systems/PropSystem.js desenha os parados em poucos meshes (um
 * por pedaço do mapa) e os que se mexem (`motion`) como instâncias leves.
 *
 * PROP_TYPES[id] = {
 *   file:  .glb em models/props/ (copiado dos kits; scripts/sync-props.js)
 *   kit:   'fauna/<grupo>/<id>' = vem do Kit Fauna Ameaçada (orçamento PROP_SETTINGS.MAX_TRIS_FAUNA); sem = Kit Props
 *   group: natureza | fauna | rua | rural | rio | tecnologia | poluicao (só organização e testes)
 *   place: onde pode ficar (célula livre: sem prédio, rua nem árvore)
 *          land  = grama/várzea      hill = encosta           bank  = terra encostada na água
 *          water = água perto da margem                       road  = terra encostada numa rua
 *          zone  = até 2 células de uma zona residencial/comercial pronta
 *          near  = até 3 células de um dos prédios de `requires`
 *          rural = grama longe da cidade (≥ PROP_SETTINGS.RURAL_DISTANCE de qualquer prédio)
 *          city  = grama até 3 células de qualquer prédio (obra também)
 *   size:  tamanho no mundo da maior medida do modelo (célula = 2; casa da zona ≈ 1,1 de altura). O PropSystem
 *          mede o .glb e escala para isso: o tamanho segue a escala do mapa, não a do arquivo
 *   max:   quantos no máximo (qualidade Alta) antes de PROP_SETTINGS.DENSITY; a quantidade real =
 *          max × DENSITY × intensidade × fator da qualidade
 *   spacing: distância mínima (em células, 8 vizinhos) entre dois do mesmo tipo (padrão: PROP_SETTINGS.SPACING do grupo)
 *   clump: até quantos do mesmo tipo dividem uma célula (moitas de capim, flores); só para peças pequenas
 *   motion: o que o prop faz no mapa (PropSystem.animate): bob = boia na água · swim = nada em volta do ponto ·
 *          graze = anda devagar e pasta · hop = pulinhos · perch = pousado, se ajeita · fly = voa em círculo baixo ·
 *          soar = plana em círculo alto · sway = balança com o vento
 *   level: nível da cidade a partir do qual aparece (PROP_LEVELS; 0 = desde o começo). Um nível depois
 *          já está completo (no nível de entrada aparece metade)
 *   requires: [ids] — só com pelo menos um desses prédios pronto; `perBuilding` = quantos por prédio
 *   pollution: [de, até] — aparece a partir de `de` e chega ao máximo em `até` (sinais de poluição)
 *   cleanBelow: [some, cheio] — bioindicador: todo abaixo de `cheio`, some de vez em `some` (fauna do rio)
 *   sewage: true — só com esgoto sem tratamento (cidade com moradores e sem ETE pronta)
 *   deforestation: [de, até] — parte da mata do começo derrubada para obras (0-1, TreeSystem): tocos e toras
 *   face:  'water' | 'road' — a frente (-Z do modelo) vira para a água/rua vizinha; sem isso o giro é sorteado
 * }
 */
const PROP_SETTINGS = {
    MAX_TRIS: 150,              // orçamento por prop do Kit Props (tests/unit/props.test.js)
    MAX_TRIS_FAUNA: 800,        // bichos do Kit Fauna Ameaçada (poucos no mapa, e são o que o jogador procura)
    CHUNK: 20,                  // células por lado de cada pedaço (40×40 → 4 meshes = no máximo 4 draw calls)
    REFRESH_MS: 2000,           // replaneja a cada 2 s de jogo rodando (ou logo depois de construir/demolir)
    RURAL_DISTANCE: 6,
    DENSITY: 0.5,               // 11/2026: o mapa tinha props demais (metade de cada tipo)
    MAX_TOTAL: 220,             // teto geral na Alta
    QUALITY: { high: 1, medium: 0.7, low: 0.4 },
    SMALL: 0.42,                // até este tamanho a peça usa só um quarto da célula (várias dividem o bloco)
    JITTER: 0.42,               // deslocamento máximo de peça de célula inteira (célula = 2)
    QUARTER_JITTER: 0.22,       // deslocamento máximo dentro do quarto
    SPACING: { rua: 3, tecnologia: 3, rural: 2, rio: 3, fauna: 3, poluicao: 0, natureza: 0 },
    CLUSTER: { natureza: 0.75, rural: 0.5 }, // quanto a mancha de ruído junta os tipos do grupo (0 = espalhado)
    CLUSTER_CELLS: 6            // tamanho das manchas (em células)
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
    poste_concreto: { file: 'poste_concreto.glb', group: 'rua', place: 'road', size: 0.8, max: 18, level: 1, face: 'road', spacing: 3 },
    hidrante: { file: 'hidrante.glb', group: 'rua', place: 'road', size: 0.22, max: 8, level: 1, face: 'road', spacing: 6 },
    bueiro: { file: 'bueiro.glb', group: 'rua', place: 'road', size: 0.3, max: 8, level: 1, spacing: 4 },
    placa_rua: { file: 'placa_rua.glb', group: 'rua', place: 'road', size: 0.55, max: 8, level: 1, face: 'road', spacing: 5 },
    poste_solar: { file: 'poste_solar.glb', group: 'tecnologia', place: 'road', size: 0.85, max: 16, requires: ['solar_farm'], perBuilding: 8, face: 'road' },
    boia_rio: { file: 'boia_rio.glb', group: 'tecnologia', place: 'water', size: 0.35, max: 6, requires: ['monitoring_station', 'water_quality_monitor'], perBuilding: 3, motion: 'bob' },
    pluviometro: { file: 'pluviometro.glb', group: 'tecnologia', place: 'near', size: 0.4, max: 4, requires: ['monitoring_station'], perBuilding: 2 },
    placa_educativa: { file: 'placa_educativa.glb', group: 'tecnologia', place: 'bank', size: 0.5, max: 6, requires: ['school', 'technical_school', 'university', 'museum'], perBuilding: 2, face: 'road' },
    barril_chuva: { file: 'barril_chuva.glb', group: 'tecnologia', place: 'zone', size: 0.35, max: 10, requires: ['rain_garden', 'green_roof', 'green_wall'], perBuilding: 4 },
    hidrometro: { file: 'hidrometro.glb', group: 'tecnologia', place: 'zone', size: 0.22, max: 10, requires: ['loss_control_center'], perBuilding: 10, face: 'road' },
    lixeiras_coleta: { file: 'lixeiras_coleta.glb', group: 'tecnologia', place: 'road', size: 0.4, max: 8, requires: ['recycling_point', 'recycling_coop', 'ecopark'], perBuilding: 3, face: 'road' },
    // Captação antiga de água: cata-vento ao lado das bombas e poços
    moinho_vento: { file: 'moinho_vento.glb', group: 'rural', place: 'near', size: 1.0, max: 4, requires: ['water_pump', 'water_well'], perBuilding: 1 },

    // ===== Sinais de poluição: aparecem com a poluição e somem quando ela baixa =====
    manilha_esgoto: { file: 'manilha_esgoto.glb', group: 'poluicao', place: 'bank', size: 0.6, max: 6, sewage: true, pollution: [25, 55], face: 'water' },
    peixe_morto: { file: 'peixe_morto.glb', group: 'poluicao', place: 'water', size: 0.3, max: 8, pollution: [72, 90], motion: 'bob' },
    espuma_rio: { file: 'espuma_rio.glb', group: 'poluicao', place: 'water', size: 0.8, max: 10, pollution: [62, 85], motion: 'bob' },
    lixo_flutuante: { file: 'lixo_flutuante.glb', group: 'poluicao', place: 'water', size: 0.55, max: 10, pollution: [45, 75], motion: 'bob' },
    tambor_enferrujado: { file: 'tambor_enferrujado.glb', group: 'poluicao', place: 'bank', size: 0.32, max: 5, pollution: [58, 85] },
    pneus_velhos: { file: 'pneus_velhos.glb', group: 'poluicao', place: 'land', size: 0.45, max: 6, pollution: [45, 75] },
    monte_lixo: { file: 'monte_lixo.glb', group: 'poluicao', place: 'zone', size: 0.6, max: 8, pollution: [52, 80] },
    saco_lixo: { file: 'saco_lixo.glb', group: 'poluicao', place: 'road', size: 0.3, max: 12, pollution: [35, 65], clump: 2 },
    entulho: { file: 'entulho.glb', group: 'poluicao', place: 'road', size: 0.5, max: 6, pollution: [48, 78] },
    aguape: { file: 'aguape.glb', group: 'natureza', place: 'water', size: 0.4, max: 10, pollution: [38, 70], motion: 'bob', clump: 2 }, // esgoto aduba o rio: aguapé demais
    cano_pvc: { file: 'cano_pvc.glb', group: 'poluicao', place: 'bank', size: 0.5, max: 5, sewage: true, pollution: [30, 60], face: 'water' },
    carrinho_mercado: { file: 'carrinho_mercado.glb', group: 'poluicao', place: 'water', size: 0.35, max: 4, pollution: [55, 85] },
    galao_agrotoxico: { file: 'galao_agrotoxico.glb', group: 'poluicao', place: 'bank', size: 0.3, max: 4, pollution: [55, 85] },
    sofa_velho: { file: 'sofa_velho.glb', group: 'poluicao', place: 'road', size: 0.45, max: 4, pollution: [40, 70] },
    cacamba_entulho: { file: 'cacamba_entulho.glb', group: 'poluicao', place: 'road', size: 0.55, max: 4, pollution: [45, 75] },
    geladeira_velha: { file: 'geladeira_velha.glb', group: 'poluicao', place: 'zone', size: 0.35, max: 4, pollution: [50, 80] },
    carcaca_carro: { file: 'carcaca_carro.glb', group: 'poluicao', place: 'city', size: 0.7, max: 4, pollution: [55, 85] },

    // ===== Desmatamento: tocos, toras e barranco caindo onde a mata foi derrubada para obras =====
    toco_serrado: { file: 'toco_serrado.glb', group: 'poluicao', place: 'city', size: 0.35, max: 12, deforestation: [0.04, 0.3], clump: 2 },
    pilha_toras: { file: 'pilha_toras.glb', group: 'poluicao', place: 'city', size: 0.6, max: 5, deforestation: [0.12, 0.4] },
    barranco_erodido: { file: 'barranco_erodido.glb', group: 'poluicao', place: 'bank', size: 0.8, max: 8, deforestation: [0.15, 0.5], face: 'water' },

    // ===== Rio: ribeirinhos com a cidade crescendo, enquanto a água está limpa =====
    pescaria: { file: 'pescaria.glb', group: 'rio', place: 'bank', size: 0.6, max: 4, level: 1, cleanBelow: [65, 45], face: 'water' },
    covo: { file: 'covo.glb', group: 'rio', place: 'bank', size: 0.35, max: 3, level: 2, cleanBelow: [65, 45], face: 'water' },
    bombona_flutuante: { file: 'bombona_flutuante.glb', group: 'rio', place: 'water', size: 0.35, max: 3, level: 2, cleanBelow: [70, 50], motion: 'bob' },
    trapiche: { file: 'trapiche.glb', group: 'rio', place: 'bank', size: 1.1, max: 3, level: 1, cleanBelow: [70, 50], face: 'water' },
    canoa: { file: 'canoa.glb', group: 'rio', place: 'water', size: 0.85, max: 4, level: 1, cleanBelow: [70, 50], motion: 'bob' },
    rede_pesca: { file: 'rede_pesca.glb', group: 'rio', place: 'bank', size: 0.7, max: 3, level: 2, cleanBelow: [65, 45], face: 'water' },

    // ===== Dia a dia da cidade: aparece conforme ela cresce =====
    cachorro_caramelo: { file: 'cachorro_caramelo.glb', group: 'fauna', place: 'zone', size: 0.3, max: 4, level: 1, motion: 'graze' },
    cone_transito: { file: 'cone_transito.glb', group: 'rua', place: 'road', size: 0.18, max: 6, level: 1, clump: 2 },
    lixeira_grade: { file: 'lixeira_grade.glb', group: 'rua', place: 'zone', size: 0.35, max: 8, level: 2, face: 'road' },
    caixa_dagua: { file: 'caixa_dagua.glb', group: 'rua', place: 'zone', size: 0.35, max: 8, level: 2 },
    banco_praca: { file: 'banco_praca.glb', group: 'rua', place: 'zone', size: 0.45, max: 8, level: 2, face: 'road' },
    orelhao: { file: 'orelhao.glb', group: 'rua', place: 'road', size: 0.45, max: 4, level: 2, face: 'road', spacing: 6 },
    bebedouro: { file: 'bebedouro.glb', group: 'rua', place: 'zone', size: 0.3, max: 4, level: 2, face: 'road' },
    mesa_cadeiras: { file: 'mesa_cadeiras.glb', group: 'rua', place: 'zone', size: 0.5, max: 5, level: 3 },
    carrinho_pipoca: { file: 'carrinho_pipoca.glb', group: 'rua', place: 'road', size: 0.45, max: 3, level: 3, face: 'road', spacing: 6 },
    barraca_feira: { file: 'barraca_feira.glb', group: 'rua', place: 'road', size: 0.6, max: 4, level: 3, face: 'road' },
    bicicletario: { file: 'bicicletario.glb', group: 'rua', place: 'road', size: 0.5, max: 5, level: 3, face: 'road' },

    carrinho_mao: { file: 'carrinho_mao.glb', group: 'rua', place: 'road', size: 0.35, max: 4, level: 1 },
    monte_areia: { file: 'monte_areia.glb', group: 'rua', place: 'road', size: 0.45, max: 4, level: 1 },
    botijao: { file: 'botijao.glb', group: 'rua', place: 'zone', size: 0.18, max: 6, level: 2 },
    varal: { file: 'varal.glb', group: 'rua', place: 'zone', size: 0.6, max: 5, level: 2, motion: 'sway' },
    tanque_lavar: { file: 'tanque_lavar.glb', group: 'rua', place: 'zone', size: 0.3, max: 4, level: 2, face: 'road' },
    cavalete_pf: { file: 'cavalete_pf.glb', group: 'rua', place: 'road', size: 0.3, max: 3, level: 3, face: 'road' },

    // ===== Campo: em volta, longe da cidade =====
    poco_caipira: { file: 'poco_caipira.glb', group: 'rural', place: 'rural', size: 0.45, max: 3, level: 1 },
    pilha_lenha: { file: 'pilha_lenha.glb', group: 'rural', place: 'rural', size: 0.4, max: 4, level: 1 },
    latao_leite: { file: 'latao_leite.glb', group: 'rural', place: 'rural', size: 0.25, max: 3, level: 2 },
    cocho_gado: { file: 'cocho_gado.glb', group: 'rural', place: 'rural', size: 0.5, max: 4, level: 2 },
    tamandua: { file: 'tamandua.glb', group: 'fauna', place: 'rural', size: 0.55, max: 2, level: 1, cleanBelow: [70, 50], motion: 'graze' },
    cerca_mourao: { file: 'cerca_mourao.glb', group: 'rural', place: 'rural', size: 0.9, max: 10, level: 1 },
    fardo_feno: { file: 'fardo_feno.glb', group: 'rural', place: 'rural', size: 0.3, max: 8, level: 1, clump: 2 },
    porteira: { file: 'porteira.glb', group: 'rural', place: 'rural', size: 0.8, max: 3, level: 2 },
    vaca: { file: 'vaca.glb', group: 'fauna', place: 'rural', size: 0.6, max: 6, level: 2, motion: 'graze', spacing: 2 },
    caixotes: { file: 'caixotes.glb', group: 'rural', place: 'rural', size: 0.35, max: 4, level: 2 },
    espantalho: { file: 'espantalho.glb', group: 'rural', place: 'rural', size: 0.6, max: 3, level: 3, motion: 'sway' },
    colmeia: { file: 'colmeia.glb', group: 'rural', place: 'rural', size: 0.3, max: 4, level: 3 },
    horta: { file: 'horta.glb', group: 'rural', place: 'zone', size: 0.8, max: 4, level: 3 },

    // ===== Bichos do rio: bioindicadores (somem com a água suja) =====
    garca: { file: 'garca.glb', group: 'fauna', place: 'bank', size: 0.45, max: 6, cleanBelow: [55, 35], motion: 'perch' },
    capivara: { file: 'capivara.glb', group: 'fauna', place: 'bank', size: 0.45, max: 5, cleanBelow: [60, 40], motion: 'graze' },
    tartaruga: { file: 'tartaruga.glb', group: 'fauna', place: 'bank', size: 0.28, max: 4, cleanBelow: [45, 25], motion: 'graze' },
    vitoria_regia: { file: 'vitoria_regia.glb', group: 'natureza', place: 'water', size: 0.7, max: 8, cleanBelow: [55, 35], motion: 'bob' },
    sapo: { file: 'sapo.glb', group: 'fauna', place: 'bank', size: 0.2, max: 5, cleanBelow: [40, 20], motion: 'hop' }, // anfíbio: o primeiro a sumir
    lambaris: { file: 'lambaris.glb', group: 'fauna', place: 'water', size: 0.45, max: 6, cleanBelow: [50, 30], motion: 'swim' },
    // Kit Fauna Ameaçada (Livro Vermelho, ICMBio 2018): os mais exigentes, um ou dois por mapa
    ariranha: { file: 'ariranha.glb', kit: 'fauna/mamiferos/ariranha', group: 'fauna', place: 'bank', size: 0.55, max: 2, cleanBelow: [40, 20], motion: 'graze' },
    boto_vermelho: { file: 'boto_vermelho.glb', kit: 'fauna/mamiferos/boto_vermelho', group: 'fauna', place: 'water', size: 0.7, max: 2, cleanBelow: [45, 25], motion: 'swim' },
    pato_mergulhao: { file: 'pato_mergulhao.glb', kit: 'fauna/aves/pato_mergulhao', group: 'fauna', place: 'water', size: 0.32, max: 2, cleanBelow: [30, 12], motion: 'swim' },
    soco_boi_escuro: { file: 'soco_boi_escuro.glb', kit: 'fauna/aves/soco_boi_escuro', group: 'fauna', place: 'bank', size: 0.4, max: 2, cleanBelow: [55, 35], motion: 'perch' },
    cobra_dagua: { file: 'cobra_dagua.glb', kit: 'fauna/repteis/cobra_dagua_grande_do_tocantins', group: 'fauna', place: 'bank', size: 0.6, max: 2, cleanBelow: [50, 30], motion: 'graze' },
    ra_das_pedras: { file: 'ra_das_pedras.glb', kit: 'fauna/anfibios/ra_das_pedras', group: 'fauna', place: 'bank', size: 0.22, max: 2, cleanBelow: [35, 15], motion: 'hop' },
    piracanjuba: { file: 'piracanjuba.glb', kit: 'fauna/peixes/piracanjuba', group: 'fauna', place: 'water', size: 0.4, max: 2, cleanBelow: [45, 25], motion: 'swim' },
    surubim: { file: 'surubim.glb', kit: 'fauna/peixes/surubim_do_iguacu', group: 'fauna', place: 'water', size: 0.45, max: 2, cleanBelow: [40, 20], motion: 'swim' },
    libelula: { file: 'libelula.glb', kit: 'fauna/invertebrados/libelula_januaria', group: 'fauna', place: 'bank', size: 0.24, max: 2, cleanBelow: [45, 25], motion: 'fly' },
    egla: { file: 'egla.glb', kit: 'fauna/invertebrados/egla_rossiana', group: 'fauna', place: 'bank', size: 0.2, max: 2, cleanBelow: [30, 12], motion: 'graze' },

    // ===== Bichos da mata e do campo: somem com o ar e a água sujos =====
    tucano: { file: 'tucano.glb', group: 'fauna', place: 'land', size: 0.35, max: 4, cleanBelow: [70, 50], motion: 'perch' },
    arara: { file: 'arara.glb', group: 'fauna', place: 'land', size: 0.4, max: 4, cleanBelow: [70, 50], motion: 'perch' },
    quati: { file: 'quati.glb', group: 'fauna', place: 'land', size: 0.4, max: 4, cleanBelow: [70, 50], motion: 'graze' },
    tatu: { file: 'tatu.glb', group: 'fauna', place: 'land', size: 0.32, max: 4, cleanBelow: [75, 55], motion: 'graze' },
    ninho_joao_de_barro: { file: 'ninho_joao_de_barro.glb', group: 'fauna', place: 'land', size: 0.45, max: 4 },
    anta: { file: 'anta.glb', kit: 'fauna/mamiferos/anta', group: 'fauna', place: 'rural', size: 0.62, max: 2, cleanBelow: [65, 45], motion: 'graze' },
    onca_pintada: { file: 'onca_pintada.glb', kit: 'fauna/mamiferos/onca_pintada', group: 'fauna', place: 'rural', size: 0.62, max: 1, cleanBelow: [55, 35], motion: 'graze' },
    lobo_guara: { file: 'lobo_guara.glb', kit: 'fauna/mamiferos/lobo_guara', group: 'fauna', place: 'rural', size: 0.52, max: 2, cleanBelow: [70, 50], motion: 'graze' },
    cervo_pantanal: { file: 'cervo_pantanal.glb', kit: 'fauna/mamiferos/cervo_do_pantanal', group: 'fauna', place: 'land', size: 0.6, max: 2, cleanBelow: [60, 40], motion: 'graze' },
    mico_leao_dourado: { file: 'mico_leao_dourado.glb', kit: 'fauna/mamiferos/mico_leao_dourado', group: 'fauna', place: 'land', size: 0.3, max: 2, cleanBelow: [70, 50], motion: 'hop' },
    gaviao_real: { file: 'gaviao_real.glb', kit: 'fauna/aves/gaviao_real', group: 'fauna', place: 'land', size: 0.5, max: 1, cleanBelow: [60, 40], motion: 'perch' },
    morfo: { file: 'morfo.glb', kit: 'fauna/invertebrados/morfo_menelaus', group: 'fauna', place: 'land', size: 0.22, max: 2, cleanBelow: [70, 50], motion: 'fly' },

    // ===== Natureza: desde o começo =====
    taboa: { file: 'taboa.glb', group: 'natureza', place: 'bank', size: 0.5, max: 14, motion: 'sway' },
    pedras: { file: 'pedras.glb', group: 'natureza', place: 'bank', size: 0.6, max: 12 },
    mandacaru: { file: 'mandacaru.glb', group: 'natureza', place: 'hill', size: 0.8, max: 10 },
    matacao: { file: 'matacao.glb', group: 'natureza', place: 'land', size: 0.7, max: 8 },
    cupinzeiro: { file: 'cupinzeiro.glb', group: 'natureza', place: 'land', size: 0.5, max: 8 },
    tronco_caido: { file: 'tronco_caido.glb', group: 'natureza', place: 'land', size: 0.7, max: 8 },
    toco: { file: 'toco.glb', group: 'natureza', place: 'land', size: 0.3, max: 8 },
    arbustos: { file: 'arbustos.glb', group: 'natureza', place: 'land', size: 0.7, max: 16 },
    capim_alto: { file: 'capim_alto.glb', group: 'natureza', place: 'land', size: 0.35, max: 22, clump: 3, motion: 'sway' },
    flores_campo: { file: 'flores_campo.glb', group: 'natureza', place: 'land', size: 0.32, max: 18, clump: 3 },
    bambu: { file: 'bambu.glb', group: 'natureza', place: 'bank', size: 1.0, max: 6, motion: 'sway' },
    bananeira: { file: 'bananeira.glb', group: 'natureza', place: 'land', size: 0.8, max: 6, motion: 'sway' },
    bromelia: { file: 'bromelia.glb', group: 'natureza', place: 'land', size: 0.3, max: 8, clump: 2 },
    coqueiro: { file: 'coqueiro.glb', group: 'natureza', place: 'land', size: 1.3, max: 4, motion: 'sway' }
};
