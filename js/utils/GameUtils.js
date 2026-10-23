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
 * Espalha uma classe grande em vários arquivos sem mudar as chamadas (this.metodo()).
 * Métodos entram como os de class (não enumeráveis). Falha alto em colisão de nome:
 * método duplicado sobrescreveria o outro em silêncio.
 * Uso, no fim do arquivo parcial: mixin(BuildingSystem, { metodoA() {...}, metodoB() {...} });
 */
function mixin(TargetClass, methods) {
    for (const [name, value] of Object.entries(methods)) {
        if (name in TargetClass.prototype) {
            throw new Error(`mixin: ${TargetClass.name}.${name} já existe`);
        }
        Object.defineProperty(TargetClass.prototype, name, { value, writable: true, configurable: true });
    }
}

/**
 * ===== DIÁLOGOS (SweetAlert2 no estilo do jogo) =====
 * Use no lugar de alert()/confirm(): os nativos travam a página e fogem do visual.
 * O visual vem das classes do overlay de pausa (.overlay-content, .overlay-btn) + .game-swal em styles.css.
 */
function gameDialog(options) {
    return Swal.fire({
        buttonsStyling: false,
        customClass: {
            popup: 'game-swal overlay-content',
            confirmButton: 'overlay-btn primary',
            cancelButton: 'overlay-btn secondary'
        },
        confirmButtonText: 'OK',
        didOpen: () => { if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_modal_open'); },
        ...options
    });
}

/** Aviso com um botão. Resolve quando fechado. */
function gameAlert(title, text, icon = 'info') {
    return gameDialog({ title, text, icon });
}

/** Pergunta sim/não. Resolve true só se o jogador confirmar (Esc/fora = false). */
async function gameConfirm(title, text, { confirmText = 'Sim', cancelText = 'Cancelar', icon = 'question' } = {}) {
    const result = await gameDialog({
        title, text, icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        focusCancel: true
    });
    return result.isConfirmed;
}

/**
 * Pergunta com duas escolhas e "voltar". Resolve 'confirm', 'deny' ou null (cancelou, Esc ou clicou fora).
 * html vai para innerHTML: escape o que vier do jogador.
 */
async function gameChoice(title, html, { confirmText, denyText, cancelText = 'Voltar', icon = 'question' } = {}) {
    const result = await gameDialog({
        title, html, icon,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: confirmText,
        denyButtonText: denyText,
        cancelButtonText: cancelText,
        customClass: {
            popup: 'game-swal overlay-content',
            confirmButton: 'overlay-btn primary',
            denyButton: 'overlay-btn secondary',
            cancelButton: 'overlay-btn secondary'
        }
    });
    if (result.isConfirmed) return 'confirm';
    if (result.isDenied) return 'deny';
    return null;
}

/**
 * ===== LEITURA EM VOZ ALTA (Web Speech API, nativa do navegador) =====
 * setupReadAloud(botão, () => texto) transforma o botão em play/stop.
 * Uma leitura por vez no jogo todo; sem síntese de voz, o botão some.
 */
let readAloudButton = null;
let readAloudLast = null;

// Avisa quem anima a boca (AnimatedPortrait): document recebe `readaloud` com { type, button }, sendo
// type 'start'/'pause' por frase, 'word' a cada palavra (se a voz emitir boundary) e 'end' ao parar.
function emitReadAloud(type, button) {
    document.dispatchEvent(new CustomEvent('readaloud', { detail: { type, button } }));
}

function stopSpeaking() {
    if (!window.speechSynthesis) return;
    if (readAloudButton) emitReadAloud('end', readAloudButton);
    if (readAloudButton) {
        readAloudButton.innerHTML = uiIcon('ui-sound');
        readAloudButton.setAttribute('aria-pressed', 'false');
    }
    readAloudButton = null;
    readAloudLast = null;
    speechSynthesis.cancel();
}

function setupReadAloud(button, getText) {
    if (!window.speechSynthesis) {
        button.hidden = true;
        return;
    }
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
        const wasPlaying = readAloudButton === button;
        stopSpeaking();
        if (wasPlaying) return;

        const voice = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-') === 'pt-BR');
        // Uma frase por fala: o Chrome corta falas longas no meio
        const sentences = getText().split(/(?<=[.!?])\s+/).filter(s => s.trim());
        sentences.forEach(sentence => {
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.lang = 'pt-BR';
            if (voice) utterance.voice = voice;
            utterance.onstart = () => emitReadAloud('start', button);
            utterance.onboundary = event => { if (event.name === 'word') emitReadAloud('word', button); };
            utterance.onend = () => emitReadAloud('pause', button);
            speechSynthesis.speak(utterance);
            readAloudLast = utterance;
        });
        const last = readAloudLast;
        if (!last) return;
        last.onend = () => { if (readAloudLast === last) stopSpeaking(); else emitReadAloud('pause', button); };
        readAloudButton = button;
        button.textContent = '⏹️';
        button.setAttribute('aria-pressed', 'true');
    });
}

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

log('🛠️ GameUtils loaded - Clean Code utility functions available');
