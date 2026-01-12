/**
 * ===== GUARDIÃO DA ÁGUA - GAME CONSTANTS =====
 *
 * Clean Code Refactoring: Extract all magic numbers into meaningful constants
 * This improves code maintainability and readability while following Clean Code principles
 *
 * @author Guardião da Água Development Team
 * @version 1.0.0
 */

// ===== FEATURE FLAGS FOR RELEASE VERSION =====
const FEATURE_FLAGS = {
    // Building types to hide in release version
    HIDDEN_BUILDINGS: [
        'power_pole',
        'thermal_plant',
        'coal_plant',
        'nuclear_plant'
    ],

    // Building categories to hide in release version
    // TASK #3: Removed 'zoning' and 'tourism' to re-enable these categories
    HIDDEN_CATEGORIES: [
        'infrastructure'
    ],

    // UI features to hide in release version
    HIDDEN_UI_FEATURES: {
        rentalButton: true,  // Hide rental functionality
        loanButton: false,   // Keep loan button visible
        helpButton: false    // Keep help button visible
    },

    // Enable/disable features globally
    // TASK #3: Enabled zoning and tourism features
    ENABLE_ZONING: true,
    ENABLE_TOURISM: true,
    ENABLE_INFRASTRUCTURE: false,
    ENABLE_POWER_GRID: false,
    ENABLE_RENTAL_SYSTEM: false,

    // Check if a building should be visible
    isBuildingVisible(buildingId) {
        return !this.HIDDEN_BUILDINGS.includes(buildingId);
    },

    // Check if a category should be visible
    isCategoryVisible(category) {
        return !this.HIDDEN_CATEGORIES.includes(category);
    },

    // Check if a UI feature should be visible
    isUIFeatureVisible(featureName) {
        return !this.HIDDEN_UI_FEATURES[featureName];
    }
};

// ===== CAMERA CONSTANTS =====
const CAMERA = {
    // Isometric camera angles (fixed for RTS-style view)
    ISOMETRIC_ALPHA: -Math.PI / 4,           // 45 degrees horizontal
    ISOMETRIC_BETA: Math.PI / 3.5,           // ~51 degrees vertical for isometric view
    
    // Zoom limits
    MIN_ZOOM_DISTANCE: 10,
    MAX_ZOOM_DISTANCE: 60,
    DEFAULT_ZOOM_DISTANCE: 30,
    
    // Movement and sensitivity
    PAN_SENSITIVITY: 0.02,
    ZOOM_SENSITIVITY: 2,
    EDGE_SCROLL_THRESHOLD: 50,               // Pixels from edge to trigger scrolling
    EDGE_SCROLL_SPEED: 0.8,
    
    // Camera bounds (world coordinates)
    BOUNDS: {
        MIN_X: -30,
        MAX_X: 70,
        MIN_Z: -30,
        MAX_Z: 70
    },
    
    // Animation settings
    INERTIA: 0.9,
    ANGULAR_SENSITIVITY_DISABLED: 0          // Disable rotation in isometric mode
};

// ===== GRID CONSTANTS =====
const GRID = {
    // Grid dimensions
    DEFAULT_WIDTH: 40,
    DEFAULT_HEIGHT: 40,
    CELL_SIZE: 2,
    
    // Visual settings
    LINE_COLOR: '#00ff88',
    LINE_ALPHA: 0.3,
    LINE_WIDTH: 1,
    
    // Grid calculations
    get TOTAL_CELLS() { return this.DEFAULT_WIDTH * this.DEFAULT_HEIGHT; },
    get WORLD_WIDTH() { return this.DEFAULT_WIDTH * this.CELL_SIZE; },
    get WORLD_HEIGHT() { return this.DEFAULT_HEIGHT * this.CELL_SIZE; }
};

// ===== RESOURCE CONSTANTS =====
const RESOURCES = {
    // Water management
    WATER: {
        DEFAULT_CAPACITY: 1000,              // Liters
        INITIAL_AMOUNT: 1000,
        CONSUMPTION_RATE_PER_CITIZEN: 2,     // L/min per citizen
        CRITICAL_THRESHOLD: 0.1,             // 10% of capacity
        WARNING_THRESHOLD: 0.3               // 30% of capacity
    },
    
    // Population management
    POPULATION: {
        INITIAL_COUNT: 100,
        DEFAULT_CAPACITY: 500,
        GROWTH_RATE: 0.02,                   // 2% per game hour
        SATISFACTION_THRESHOLD: 0.7          // 70% satisfaction needed for growth
    },
    
    // Budget management
    BUDGET: {
        INITIAL_AMOUNT: 40000,               // R$
        CITY_HALL_BONUS: 10000,             // R$ bonus for building city hall
        DAILY_INCOME_BASE: 100,             // R$ per day base income
        INCOME_PER_CITIZEN: 5                // R$ per citizen per day
    },
    
    // Pollution management
    POLLUTION: {
        INITIAL_LEVEL: 15,                   // Percentage
        CRITICAL_THRESHOLD: 80,              // 80% pollution is critical
        WARNING_THRESHOLD: 60,               // 60% pollution is warning
        NATURAL_REDUCTION_RATE: 0.1          // 0.1% per minute natural reduction
    },
    
    // Satisfaction management
    SATISFACTION: {
        INITIAL_LEVEL: 85,                   // Percentage
        CRITICAL_THRESHOLD: 30,              // 30% satisfaction is critical
        GOOD_THRESHOLD: 70,                  // 70% satisfaction is good
        CITY_HALL_BONUS: 20                  // +20% satisfaction from city hall
    },
    
    // Energy management
    ENERGY: {
        INITIAL_CAPACITY: 0,                 // MW
        INITIAL_CONSUMPTION: 0,              // MW
        CONSUMPTION_PER_CITIZEN: 0.01        // MW per citizen
    }
};

// ===== BUILDING CONSTANTS =====
const BUILDINGS = {
    // Size and scaling
    SCALE_FACTOR: 0.85,                      // Consistent scale factor for all buildings
    MULTI_CELL_OFFSET_MULTIPLIER: 0.5,       // For centering multi-cell buildings
    
    // Construction
    DEFAULT_CONSTRUCTION_TIME: 15000,        // 15 seconds in milliseconds
    CONSTRUCTION_COOLDOWN: 1000,             // 1 second cooldown between constructions
    
    // Visual effects
    SELECTION_RING_SIZE_MULTIPLIER: 1.3,     // Selection ring size relative to building
    SELECTION_RING_THICKNESS: 0.15,
    SELECTION_RING_TESSELLATION: 24,
    SELECTION_RING_HEIGHT_OFFSET: 0.08,      // Height above ground
    
    // Shadow settings
    SHADOW_SIZE_MULTIPLIER: 1.05,            // Shadow size relative to building
    SHADOW_HEIGHT_OFFSET: 0.005,             // Height above terrain
    SHADOW_ALPHA: 0.3,
    
    // Height calculations
    BASE_HEIGHT: 1.5,
    SIZE_HEIGHT_MULTIPLIER: 0.3,
    CATEGORY_HEIGHT_MODIFIERS: {
        'water': 0.5,
        'treatment': 1.0,
        'storage': 1.5,
        'residential': 0,
        'power': 1.5,
        'infrastructure': -1.2,              // Lower than base
        'public': 2.0,
        'commercial': 1.0,
        'industrial': 1.2
    }
};

// ===== UI CONSTANTS =====
const UI = {
    // Update intervals
    RESOURCE_UPDATE_INTERVAL: 100,           // 100ms
    MEMORY_CHECK_INTERVAL: 5000,             // 5 seconds
    AUTO_SAVE_INTERVAL: 30000,               // 30 seconds
    
    // Interaction settings
    INTERACTION_COOLDOWN: 150,               // Prevent rapid clicks (ms)
    CATEGORY_CLICK_COOLDOWN: 200,            // Category button cooldown (ms)
    BUILDING_CLICK_COOLDOWN: 300,            // Building item cooldown (ms)
    
    // Animation settings
    TRANSITION_DELAY: 50,                    // Panel transition delay (ms)
    BUTTON_SCALE_DURATION: 200,              // Button scale animation (ms)
    SELECTION_SCALE_DURATION: 300,           // Selection scale animation (ms)
    
    // Panel priorities (higher number = higher priority)
    PANEL_PRIORITIES: {
        'terrain': 1,
        'resource': 2,
        'building': 3,
        'selection': 4,
        'construction': 5
    },
    
    // Notification settings
    MAX_NOTIFICATIONS: 5,
    NOTIFICATION_DURATION: 5000,             // 5 seconds
    
    // Mobile settings
    MOBILE_BREAKPOINT: 768,                  // px
    MOBILE_PANEL_ANIMATION_DURATION: 300     // ms
};

// ===== ANIMATION CONSTANTS =====
const ANIMATION = {
    // Frame rates and timing
    TARGET_FPS: 60,
    FRAME_TIME_MS: 16.67,                    // 1000ms / 60fps
    
    // Camera animations
    CAMERA_ANIMATION_FPS: 60,
    CAMERA_ANIMATION_DURATION_FRAMES: 120,   // 2 seconds at 60fps
    
    // Building animations
    BUILDING_SCALE_ANIMATION_FRAMES: 30,     // 0.5 seconds at 60fps
    SELECTION_PULSE_DURATION: 2000,         // 2 seconds
    
    // UI animations
    FADE_IN_DURATION: 300,                   // ms
    FADE_OUT_DURATION: 200,                  // ms
    SLIDE_ANIMATION_DURATION: 250            // ms
};

// ===== GAME MECHANICS CONSTANTS =====
const GAME_MECHANICS = {
    // Time management
    TIME_SCALE_NORMAL: 1,
    TIME_SCALE_FAST: 2,
    TIME_SCALE_VERY_FAST: 3,
    TIME_SCALE_PAUSED: 0,
    
    // Game world
    INITIAL_CITY_HALL_POSITION: { x: 10, z: 10 },
    
    // Memory management
    MEMORY_WARNING_THRESHOLD: 100,           // MB
    MEMORY_CRITICAL_THRESHOLD: 200,          // MB
    
    // Performance
    MAX_BUILDINGS_FOR_OPTIMAL_PERFORMANCE: 50,
    MESH_CLEANUP_INTERVAL: 60000,            // 1 minute
    
    // Validation
    MIN_BUILDING_COST: 100,                  // R$
    MAX_BUILDING_COST: 100000,               // R$
    MIN_BUILDING_SIZE: 1,                    // Grid cells
    MAX_BUILDING_SIZE: 5                     // Grid cells
};

// ===== TERRAIN CONSTANTS =====
const TERRAIN = {
    // Terrain types
    TYPES: {
        WATER: 'water',
        GRASSLAND: 'grassland',
        LOWLAND: 'lowland',
        HIGHLAND: 'highland'
    },
    
    // Elevation settings
    MIN_ELEVATION: 0,
    MAX_ELEVATION: 5,
    WATER_LEVEL: 0.5,
    
    // Procedural generation
    NOISE_SCALE: 0.1,
    WATER_THRESHOLD: 0.3,
    HIGHLAND_THRESHOLD: 0.7
};

// ===== VALIDATION CONSTANTS =====
const VALIDATION = {
    // String lengths
    MIN_BUILDING_NAME_LENGTH: 2,
    MAX_BUILDING_NAME_LENGTH: 50,
    
    // Numeric ranges
    MIN_GRID_SIZE: 10,
    MAX_GRID_SIZE: 100,
    MIN_RESOURCE_VALUE: 0,
    MAX_RESOURCE_VALUE: 999999,
    
    // Coordinates
    MIN_COORDINATE: -1000,
    MAX_COORDINATE: 1000
};

/**
 * Utility function to validate if a value is within acceptable game bounds
 * @param {number} value - The value to validate
 * @param {number} min - Minimum acceptable value
 * @param {number} max - Maximum acceptable value
 * @returns {boolean} - True if value is within bounds
 */
function isWithinBounds(value, min, max) {
    return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Utility function to clamp a value within specified bounds
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// ===== MAKE CONSTANTS AVAILABLE GLOBALLY =====
if (typeof window !== 'undefined') {
    window.GameConstants = {
        CAMERA,
        GRID,
        RESOURCES,
        BUILDINGS,
        UI,
        ANIMATION,
        GAME_MECHANICS,
        TERRAIN,
        VALIDATION,
        isWithinBounds,
        clamp
    };
}

console.log('📐 GameConstants loaded - Clean Code refactoring applied');
