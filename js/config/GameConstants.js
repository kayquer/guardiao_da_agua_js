/**
 * ===== GUARDIÃO DA ÁGUA - CONFIGURAÇÃO E CONSTANTES =====
 *
 * Fonte única de números de gameplay, câmera e flags de release.
 * Carregado antes de todos os outros scripts (ver index.html).
 * Tudo aqui é lido por algum sistema — não acrescente constante sem uso.
 */

// ===== CONFIGURAÇÃO DO JOGO (balanceamento) =====
const GAME_CONFIG = {
    canvas: {
        antialias: true,
        preserveDrawingBuffer: false
    },

    grid: {
        size: 40,        // células por lado
        cellSize: 2,
        height: 0.1
    },

    resources: {
        initialWater: 1000,
        initialBudget: 30000,
        initialPopulation: 75,
        initialSatisfaction: 50,
        initialPollution: 15
    },

    gameplay: {
        autoSaveInterval: 30000, // ms
        eventFrequency: 60000    // ms
    }
};

// ===== FEATURE FLAGS (o que aparece na versão de release) =====
const FEATURE_FLAGS = {
    HIDDEN_BUILDINGS: [
        'power_pole',
        'thermal_plant',
        'coal_plant',
        'nuclear_plant'
    ],

    HIDDEN_CATEGORIES: [
        'infrastructure'
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
