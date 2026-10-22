/**
 * GUARDIÃO DA ÁGUA - CIDADE DA INTRO (abertura cinematográfica do menu) — só dados
 *
 * Uma cidade pronta e "redonda" que a câmera sobrevoa na abertura e que fica de fundo no menu.
 * Montada pela IntroLayout (js/systems/intro/IntroLayout.js) e desenhada pela IntroCinematic
 * (js/systems/intro/IntroCinematic.js) numa engine/cena próprias — não usa o GameManager, o save nem a
 * economia do jogo. Prédios usam os modelos .glb reais (BUILDING_MODELS).
 *
 * Coordenadas em CÉLULAS (1 célula = cellSize unidades): x para o leste, z para o norte. O núcleo
 * (core) é a cidade plana; fora dele o chão sobe em colinas (moldura até o horizonte).
 *   river.path   eixo do rio (pontos em células, podem sair do mapa)
 *   roads        [x0, z0, x1, z1] retas (sobre o rio viram ponte)
 *   buildings    [tipo, x, z, giro?, escala?] — canto sudoeste; o tamanho vem de BUILDING_TYPES[tipo].size;
 *                giro em quartos de volta (0 = fachada para o sul, de frente para a câmera); escala
 *                multiplica o encaixe do jogo (só nas torres do centro, para o skyline)
 *   onWater      tipos que podem ficar sobre o rio (jardim flutuante, hidrelétrica)
 */
const INTRO_CITY = {
    seed: 20261022,
    cellSize: 2,
    bounds: { min: -36, max: 76 },
    core: { x0: 0, x1: 39, z0: 0, z1: 39 },
    groundHeight: 0.6,
    treeDensity: { bank: 0.75, city: 0.12, wild: 0.55 },
    windScale: 1.5, // eólicas maiores que no jogo: protagonistas da 3ª tomada

    river: {
        path: [[7, -20], [8, -4], [10, 4], [14, 10], [16, 17], [15, 24], [19, 30], [26, 35], [31, 44], [33, 60]],
        halfWidth: 1.8,
        bank: 1.3,
        bedHeight: 0.05,
        waterLevel: 0.35
    },

    // Colinas pontuais (centro em células, raio, altura) e planaltos retos (eólicas)
    hills: [
        { x: -6, z: 40, r: 12, h: 3.5 },
        { x: 48, z: 46, r: 13, h: 4 },
        { x: 50, z: 10, r: 10, h: 2.5 },
        { x: -8, z: 6, r: 9, h: 2 },
        // Serra no horizonte (fundo da pose final)
        { x: 6, z: 72, r: 18, h: 9 },
        { x: 30, z: 76, r: 16, h: 11 },
        { x: 58, z: 66, r: 16, h: 8 },
        { x: -26, z: 52, r: 16, h: 7 },
        { x: 70, z: 34, r: 12, h: 6 }
    ],
    plateaus: [
        { x0: 0, x1: 10, z0: 33, z1: 39, h: 1.5 }
    ],

    roads: [
        [-16, 19, 55, 19],  // avenida leste-oeste (ponte sobre o rio)
        [27, -16, 27, 33],  // avenida norte-sul
        [21, 6, 21, 28],    // margem leste
        [21, 12, 39, 12],
        [21, 26, 39, 26],
        [34, 12, 34, 33],
        [6, 5, 6, 32],      // bairro oeste
        [0, 12, 10, 12],
        [0, 27, 13, 27],
        [-16, 5, 55, 5]     // estrada do sul (segunda ponte)
    ],

    plazas: [
        { x0: 22, x1: 26, z0: 20, z1: 25 }
    ],
    fields: [
        { x0: -14, x1: -4, z0: -14, z1: -4 },
        { x0: 40, x1: 52, z0: -14, z1: -6 }
    ],

    onWater: ['floating_garden', 'hydroelectric_plant'],

    buildings: [
        // Centro cívico (praça da prefeitura)
        ['city_hall', 23, 23],
        ['monument', 23, 20],
        ['rain_garden', 25, 20],
        ['rain_garden', 25, 23],
        // Quadra financeira
        ['office_building', 28, 20, 0, 1.45],
        ['bank', 30, 20],
        ['apartment', 32, 20],
        ['hotel', 28, 22],
        ['office_building', 31, 23, 0, 1.3],
        // Quadra sul do centro
        ['hospital', 22, 13],
        ['fire_station', 24, 13],
        ['police_station', 25, 13],
        ['restaurant', 26, 13],
        ['apartment', 22, 16],
        ['office_building', 24, 16, 0, 1.25],
        ['restaurant', 26, 16],
        ['shopping_center', 28, 13],
        ['apartment', 31, 13],
        ['restaurant', 33, 13],
        ['office_building', 28, 16, 0, 1.35],
        ['bank', 30, 16],
        ['apartment', 32, 16],
        // Educação e pesquisa (leste)
        ['research_center', 35, 13],
        ['apartment', 37, 13],
        ['water_research_center', 35, 16],
        ['green_wall', 38, 16],
        ['university', 35, 20],
        ['museum', 35, 23],
        // Norte do centro: parque e bairro verde
        ['park', 23, 27],
        ['apartment', 28, 27],
        ['green_roof', 30, 27],
        ['apartment', 32, 27],
        ['hotel', 28, 30],
        ['office_building', 31, 30],
        ['house', 35, 27],
        ['house', 37, 27],
        ['house', 35, 29],
        ['school', 37, 29],
        ['house', 35, 31],
        // Bairro oeste
        ['house', 4, 7], ['house', 4, 9], ['house', 7, 7], ['house', 7, 9],
        ['school', 2, 14],
        ['water_tower', 4, 14],
        ['house', 4, 16], ['house', 7, 14], ['house', 7, 16], ['house', 8, 14],
        ['apartment', 2, 20], ['house', 4, 21], ['house', 7, 21], ['house', 7, 23],
        ['water_well', 4, 23],
        ['rain_garden', 8, 24],
        ['house', 4, 25], ['house', 7, 25],
        ['house', 4, 29], ['house', 7, 29], ['apartment', 2, 28],
        ['linear_park', 10, 20],
        // Água na beira do rio
        ['water_pump', 12, 16],
        ['treatment_plant', 10, 13],
        ['filter_station', 12, 14],
        ['water_tank', 9, 9],
        ['monitoring_station', 19, 24],
        ['water_quality_monitor', 18, 15],
        ['floating_garden', 13, 6],
        ['floating_garden', 14, 21],
        // Energia limpa
        ['wind_farm', 1, 34], ['wind_farm', 4, 36], ['wind_farm', 7, 34],
        ['wind_farm', -6, 38], ['wind_farm', -10, 32], ['wind_farm', 44, 40], ['wind_farm', 48, 36],
        ['solar_farm', 28, 6], ['solar_farm', 31, 6], ['solar_farm', 28, 1], ['solar_farm', 31, 1],
        ['hydroelectric_plant', 27, 38],
        // Indústria limpa ao sul
        ['tech_center', 35, 6],
        ['factory', 35, 0],
        ['water_tower', 33, 9]
    ]
};

/**
 * Tomadas da câmera (IntroCinematic). Pontos em células (x, z) + altura y em unidades do mundo.
 * Cada tomada: duração (ms) e uma curva de pontos { pos, look } percorrida com easing (Catmull-Rom).
 * A última termina na pose final (FINAL), de onde a câmera só balança devagar atrás do menu.
 */
const INTRO_SHOTS = {
    shots: [
        {   // 1. Rasante sobre o rio, entrando na cidade pelo sul. Antes da ponte da estrada do sul (z = 5)
            // a câmera sobe e passa por cima dela: rente, o guarda-corpo branco tomava metade do quadro
            // (no celular em pé, quase a tela toda)
            ms: 5200,
            caption: 'Um rio que dá vida',
            points: [
                { pos: [8.5, 1.6, -10], look: [10, 1.4, 2] },
                { pos: [9.6, 2.3, -0.5], look: [12.5, 2.4, 10] },
                { pos: [11.6, 4.6, 5.5], look: [15, 2.2, 15] },
                { pos: [14.5, 3.6, 11], look: [16.5, 2.4, 20] }
            ]
        },
        {   // 2. Voo entre os prédios do centro, curvando pela praça da prefeitura
            ms: 5600,
            caption: 'Uma cidade que cuida da água',
            points: [
                { pos: [46, 10, 17.5], look: [32, 5, 20] },
                { pos: [33, 9.5, 17.5], look: [24, 3, 22], roll: -0.06 },
                { pos: [21, 7.5, 22.5], look: [24, 2, 25] }
            ]
        },
        {   // 3. Subida pelas eólicas e o rio ao fundo
            ms: 5000,
            caption: 'Energia do vento e do sol',
            points: [
                { pos: [12.5, 3.2, 30.5], look: [4, 8, 36.5] },
                { pos: [8, 6, 28.5], look: [5, 8, 35] },
                { pos: [3, 12, 27], look: [18, 3, 27] }
            ]
        },
        {   // 4. Grua revelando a cidade inteira até a pose final
            ms: 5600,
            caption: 'E quem cuida dela é você.',
            points: [
                { pos: [11.5, 4, 7.5], look: [15, 3, 18] },
                { pos: [9, 10, -4], look: [17, 3, 19] },
                { pos: [5, 17, -9], look: [19, 2.5, 22] }
            ]
        }
    ],
    // Repetição na mesma sessão: só a grua final, curta
    shortShot: {
        ms: 4200,
        points: [
            { pos: [10, 8, -1], look: [16, 3, 17] },
            { pos: [5, 17, -9], look: [19, 2.5, 22] }
        ]
    },
    cutFadeMs: 380,
    // Balanço depois que o menu aparece: ângulo (rad) e período (ms) em volta do alvo final
    orbit: { swing: 0.32, periodMs: 70000 }
};

/** Painel de destaque do menu (estilo "billboard"): alterna sozinho. ícone = id de js/utils/Icons.js */
const MENU_BILLBOARD = [
    { icon: 'ui-books', tag: 'Aulas', title: 'Aprenda com a água', text: 'Seis aulas curtas sobre o ciclo da água, a vida no rio e as soluções verdes, com a Pesquisadora Cláudia.' },
    { icon: 'weather-partly', tag: 'Clima real', title: 'O tempo da sua cidade', text: 'O jogo usa o clima de verdade do lugar onde você mora: chuva, sol e vento mudam a sua cidade.' },
    { icon: 'treatment-plant', tag: 'Dica do Guardião', title: 'Trate antes de devolver', text: 'Estações de tratamento limpam a água e reduzem a poluição. Um rio limpo é uma cidade saudável.' },
    { icon: 'wind-farm', tag: 'Energia limpa', title: 'Vento e sol trabalham por você', text: 'Turbinas eólicas e usinas solares dão energia sem sujar o ar nem o rio.' }
];
