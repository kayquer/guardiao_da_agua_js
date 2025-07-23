/**
 * ===== GUARDIÃO DA ÁGUA - GAME UTILITIES =====
 * 
 * Clean Code Refactoring: Utility functions to eliminate code duplication
 * and provide common functionality across the game systems
 * 
 * @author Guardião da Água Development Team
 * @version 1.0.0
 */

/**
 * ===== VALIDATION UTILITIES =====
 */

/**
 * Validates if a building object has all required properties
 * @param {Object} building - Building object to validate
 * @returns {boolean} True if building is valid
 */
function validateBuilding(building) {
    if (!building) return false;
    if (!building.config) return false;
    if (!building.mesh) return false;
    if (typeof building.gridX !== 'number') return false;
    if (typeof building.gridZ !== 'number') return false;
    return true;
}

/**
 * Validates if coordinates are within acceptable game bounds
 * @param {number} x - X coordinate
 * @param {number} z - Z coordinate
 * @returns {boolean} True if coordinates are valid
 */
function validateCoordinates(x, z) {
    const VALIDATION = window.GameConstants?.VALIDATION || {
        MIN_COORDINATE: -1000,
        MAX_COORDINATE: 1000
    };
    
    return typeof x === 'number' && 
           typeof z === 'number' && 
           x >= VALIDATION.MIN_COORDINATE && 
           x <= VALIDATION.MAX_COORDINATE &&
           z >= VALIDATION.MIN_COORDINATE && 
           z <= VALIDATION.MAX_COORDINATE;
}

/**
 * Validates if a resource value is within acceptable bounds
 * @param {number} value - Resource value to validate
 * @returns {boolean} True if value is valid
 */
function validateResourceValue(value) {
    const VALIDATION = window.GameConstants?.VALIDATION || {
        MIN_RESOURCE_VALUE: 0,
        MAX_RESOURCE_VALUE: 999999
    };
    
    return typeof value === 'number' && 
           value >= VALIDATION.MIN_RESOURCE_VALUE && 
           value <= VALIDATION.MAX_RESOURCE_VALUE;
}

/**
 * ===== ERROR HANDLING UTILITIES =====
 */

/**
 * Safely executes a function with error handling and logging
 * @param {Function} fn - Function to execute
 * @param {string} context - Context description for error logging
 * @param {*} fallbackValue - Value to return if function fails
 * @returns {*} Function result or fallback value
 */
function safeExecute(fn, context, fallbackValue = null) {
    try {
        return fn();
    } catch (error) {
        console.error(`❌ Error in ${context}:`, error);
        return fallbackValue;
    }
}

/**
 * Creates a standardized error message with context
 * @param {string} operation - Operation that failed
 * @param {string} details - Additional error details
 * @param {Error} [error] - Original error object
 * @returns {string} Formatted error message
 */
function createErrorMessage(operation, details, error = null) {
    let message = `❌ ${operation} failed: ${details}`;
    if (error) {
        message += ` (${error.message})`;
    }
    return message;
}

/**
 * ===== ANIMATION UTILITIES =====
 */

/**
 * Creates a standardized scale animation for UI elements
 * @param {HTMLElement} element - Element to animate
 * @param {number} [duration=200] - Animation duration in milliseconds
 * @param {number} [scale=1.05] - Scale factor
 */
function createScaleAnimation(element, duration = 200, scale = 1.05) {
    if (!element) return;
    
    element.style.transform = `scale(${scale})`;
    element.style.transition = `transform ${duration}ms ease`;
    
    setTimeout(() => {
        element.style.transform = '';
    }, duration);
}

/**
 * Creates a standardized fade animation
 * @param {HTMLElement} element - Element to animate
 * @param {string} direction - 'in' or 'out'
 * @param {number} [duration=300] - Animation duration in milliseconds
 * @param {Function} [callback] - Callback function after animation
 */
function createFadeAnimation(element, direction, duration = 300, callback = null) {
    if (!element) return;
    
    const startOpacity = direction === 'in' ? 0 : 1;
    const endOpacity = direction === 'in' ? 1 : 0;
    
    element.style.opacity = startOpacity;
    element.style.transition = `opacity ${duration}ms ease`;
    
    setTimeout(() => {
        element.style.opacity = endOpacity;
        if (callback) {
            setTimeout(callback, duration);
        }
    }, 10);
}

/**
 * ===== MATH UTILITIES =====
 */

/**
 * Clamps a value between minimum and maximum bounds
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linearly interpolates between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
function lerp(start, end, t) {
    return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Converts degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

/**
 * ===== STRING UTILITIES =====
 */

/**
 * Formats a number as currency (Brazilian Real)
 * @param {number} value - Numeric value
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
    if (!validateResourceValue(value)) return 'R$ 0';
    
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

/**
 * Formats a number with thousand separators
 * @param {number} value - Numeric value
 * @returns {string} Formatted number string
 */
function formatNumber(value) {
    if (typeof value !== 'number') return '0';
    
    return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Capitalizes the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
    if (typeof str !== 'string' || str.length === 0) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * ===== PERFORMANCE UTILITIES =====
 */

/**
 * Debounces a function to prevent excessive calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttles a function to limit call frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== EXPORT UTILITIES =====
// Make utilities available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.GameUtils = {
        // Validation
        validateBuilding,
        validateCoordinates,
        validateResourceValue,
        
        // Error handling
        safeExecute,
        createErrorMessage,
        
        // Animation
        createScaleAnimation,
        createFadeAnimation,
        
        // Math
        clamp,
        lerp,
        degreesToRadians,
        radiansToDegrees,
        
        // String
        formatCurrency,
        formatNumber,
        capitalize,
        
        // Performance
        debounce,
        throttle
    };
}

console.log('🛠️ GameUtils loaded - Clean Code utility functions available');
