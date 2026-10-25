/**
 * ===== GUARDIÃO DA ÁGUA - CONFIGURAÇÃO E CONSTANTES =====
 *
 * Fonte única de números de gameplay, câmera e flags de release.
 * Carregado antes de todos os outros scripts (ver index.html).
 * Tudo aqui é lido por algum sistema — não acrescente constante sem uso.
 */

// ===== LOG DE DESENVOLVIMENTO =====
// Abra o jogo com ?debug na URL para ver os logs. console.warn/error aparecem sempre.
const DEBUG = new URLSearchParams(location.search).has('debug');
function log(...args) {
    if (DEBUG) console.log(...args);
}

// ===== CONFIGURAÇÃO DO JOGO (balanceamento) =====
const GAME_CONFIG = {
    canvas: {
        preserveDrawingBuffer: false // antialias: GraphicsQuality (por qualidade gráfica)
    },

    grid: {
        size: 40,        // células por lado
        cellSize: 2
    },

    resources: {
        initialWater: 1000,
        initialBudget: 40000,
        initialPopulation: 75,
        initialSatisfaction: 50,
        initialPollution: 15
    },

    gameplay: {
        autoSaveInterval: 30000, // ms
        eventFrequency: 60000    // ms
    }
};

// ===== DIFICULDADE PELA IDADE DO JOGADOR (perfil) =====
// maxAge: até que idade vale. events = multiplicador da chance de evento (EventSystem.setDifficulty);
// budget = multiplicador do orçamento inicial. Aplicado em GameManager.applyPlayerProfile().
const DIFFICULTY_BY_AGE = [
    { maxAge: 10, id: 'easy', label: 'Fácil', events: 0.6, budget: 1.3 },
    { maxAge: 14, id: 'normal', label: 'Normal', events: 1.0, budget: 1.0 },
    { maxAge: Infinity, id: 'hard', label: 'Difícil', events: 1.4, budget: 0.8 }
];

// ===== CLIMA (WeatherService, Open-Meteo: sem chave, CORS liberado) =====
const WEATHER = {
    FORECAST_URL: 'https://api.open-meteo.com/v1/forecast',
    GEOCODING_URL: 'https://geocoding-api.open-meteo.com/v1/search',
    CITIES_URL: 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf}/municipios?orderBy=nome',
    CACHE_MS: 30 * 60 * 1000,   // reusa a previsão por 30 min (também é o intervalo de atualização no jogo)
    FORECAST_DAYS: 5,
    FETCH_TIMEOUT_MS: 5000 // limite de cada chamada externa (geocodificação, IBGE, previsão)
};

// ===== ÁRVORES (TreeSystem) =====
// Bosques sorteados no mapa. Cada árvore em pé limpa o ar (redução de poluição/min) e soma satisfação
// (área verde, até GREEN_BONUS_MAX); construir em cima derruba: perde esse bônus e a poluição sobe na hora.
const TREES = {
    FOREST_CHANCE: 0.45,          // chance de árvore numa célula de bosque (ruído alto)
    SCATTER_CHANCE: 0.04,         // chance de árvore solta fora dos bosques
    START_AREA_CLEAR: 5,          // raio (células) sem árvores em volta da área inicial do tutorial
    POLLUTION_REDUCTION: 0.04,    // poluição/min que cada árvore tira (~140 árvores ≈ 5/min, uma bomba d'água)
    GREEN_BONUS_MAX: 8,           // satisfação extra com todas as árvores iniciais em pé
    FELL_POLLUTION: 0.6,          // poluição (%) que sobe na hora por árvore derrubada
    RIPARIAN_DISTANCE: 2,         // mata ciliar: até 2 células da água (TreeSystem.isRiparianCell)
    RIPARIAN_FACTOR: 2.5          // árvore de mata ciliar limpa 2,5× mais (nativa ou muda plantada)
};

// ===== FEATURE FLAGS (o que aparece na versão de release) =====
const FEATURE_FLAGS = {
    HIDDEN_BUILDINGS: [
        'power_pole',
        'thermal_plant',
        'coal_plant',
        'nuclear_plant', // ocultas por enquanto (pedido de 10/2026)
        'tidal_plant',
        'desalination_plant',
        'house',      // casa e prédio avulsos: a categoria Residencial mostra só as zonas (a cidade cresce por elas)
        'apartment'
    ],

    HIDDEN_CATEGORIES: [
        'infrastructure' // calçada e praça
    ],

    HIDDEN_UI_FEATURES: {
        rentalButton: true,
        loanButton: false,
        helpButton: false
    },

    isBuildingVisible(buildingId) {
        return !this.HIDDEN_BUILDINGS.includes(buildingId);
    },

    isCategoryVisible(category) {
        return !this.HIDDEN_CATEGORIES.includes(category);
    },

    isUIFeatureVisible(featureName) {
        return !this.HIDDEN_UI_FEATURES[featureName];
    }
};

// ===== CÂMERA =====
const CAMERA = {
    ISOMETRIC_ALPHA: -Math.PI / 4,           // 45° horizontal
    ISOMETRIC_BETA: Math.PI / 3.5,           // ~51° vertical

    MIN_ZOOM_DISTANCE: 10,
    MAX_ZOOM_DISTANCE: 60,
    DEFAULT_ZOOM_DISTANCE: 30,

    BOUNDS: {
        MIN_X: -60,
        MAX_X: 100,
        MIN_Z: -60,
        MAX_Z: 100
    },

    INERTIA: 0.9
};

// ===== EDIFÍCIOS (escala e altura dos meshes) =====
const BUILDINGS = {
    SCALE_FACTOR: 0.85,
    MULTI_CELL_OFFSET_MULTIPLIER: 0.5,       // centraliza edifícios multi-célula

    SHADOW_SIZE_MULTIPLIER: 1.05,
    SHADOW_HEIGHT_OFFSET: 0.005,
    SHADOW_ALPHA: 0.3,

    BASE_HEIGHT: 1.5,
    SIZE_HEIGHT_MULTIPLIER: 0.3,
    CATEGORY_HEIGHT_MODIFIERS: {
        'water': 0.5,
        'treatment': 1.0,
        'storage': 1.5,
        'residential': 0,
        'power': 1.5,
        'infrastructure': -1.2,
        'public': 2.0,
        'commercial': 1.0,
        'industrial': 1.2
    }
};

// ===== UI =====
const UI = {
    // maior número = maior prioridade
    PANEL_PRIORITIES: {
        'terrain': 1,
        'resource': 2,
        'building': 3,
        'selection': 4,
        'construction': 5
    }
};

// ===== VALIDAÇÃO =====
const VALIDATION = {
    MIN_RESOURCE_VALUE: 0,
    MAX_RESOURCE_VALUE: 999999,
    MIN_COORDINATE: -1000,
    MAX_COORDINATE: 1000
};

window.GameConstants = {
    CAMERA,
    BUILDINGS,
    UI,
    VALIDATION
};
