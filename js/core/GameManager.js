/**
 * GUARDIÃO DA ÁGUA - GAME MANAGER
 * Classe principal que controla o estado do jogo e coordena todos os sistemas
 *
 * ===== CLEAN CODE REFACTORING =====
 * Applied Clean Code principles:
 * - Extracted magic numbers to GameConstants.js
 * - Added comprehensive JSDoc documentation
 * - Improved method naming and single responsibility
 * - Enhanced error handling and validation
 */

// ===== CLEAN CODE REFACTORING: Load game constants =====
// Note: Since this file doesn't use ES6 modules, constants will be loaded via script tag
// The constants are available globally as window.GameConstants

class GameManager {
    constructor() {
        console.log('🎮 Inicializando GameManager...');

        // Estado do jogo
        this.gameState = 'menu'; // menu, playing, paused, tutorial
        this.timeScale = 1;
        this.gameTime = 0;
        this.lastUpdateTime = 0;

        // Sistemas principais
        this.gridManager = null;
        this.resourceManager = null;
        this.buildingSystem = null;
        this.uiManager = null;
        this.loanManager = null;
        this.questSystem = null;
        this.eventSystem = null;
        this.saveSystem = null;
        this.tutorialManager = null;

        // Renderização 3D
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.canvas = null;

        // Controles
        this.inputManager = null;
        this.selectedBuilding = null;
        this.buildMode = false;
        this.currentBuildingType = null;

        // Controles de câmera WASD
        this.cameraControls = {
            keys: {
                W: false,
                A: false,
                S: false,
                D: false
            },
            speed: 0.5,
            enabled: true
        };

        // Performance
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 60;

        // Memory monitoring
        this.memoryMonitoring = {
            enabled: true,
            lastCheck: 0,
            checkInterval: 5000, // 5 segundos
            maxMemoryUsage: 0,
            memoryHistory: [],
            buildingCount: 0,
            meshCount: 0,
            textureCount: 0
        };

        // Auto-save
        this.autoSaveTimer = 0;

        // Sistema de relógio
        this.gameStartTime = null;
        this.gameClockTime = null;
        this.dayNightCycle = 0; // 0-1 (0 = meia-noite, 0.5 = meio-dia)
        this.lastDayNightState = null; // Para detectar transições

        // Sistema de hover/tooltip
        this.hoverInfo = null;
        this.lastHoverPosition = { x: -1, z: -1 };

        // Flag para indicar se a inicialização foi concluída
        this.initialized = false;

        // Não inicializar automaticamente - será feito de forma assíncrona
    }

    // ===== VALIDAÇÃO DE DEPENDÊNCIAS =====
    validateDependencies() {
        console.log('🔍 Validando dependências...');

        const requiredClasses = [
            'GridManager',
            'ResourceManager',
            'BuildingSystem',
            'CityLifeSystem',
            'UIManager',
            'QuestSystem',
            'EventSystem',
            'SaveSystem',
            'TutorialManager'
        ];

        const missingClasses = [];

        for (const className of requiredClasses) {
            if (typeof window[className] === 'undefined') {
                missingClasses.push(className);
            }
        }

        if (missingClasses.length > 0) {
            const error = `❌ Classes não encontradas: ${missingClasses.join(', ')}`;
            console.error(error);
            throw new Error(error);
        }

        // Validar Babylon.js
        if (typeof BABYLON === 'undefined') {
            throw new Error('❌ Babylon.js não carregado');
        }

        // Validar configuração
        if (typeof GAME_CONFIG === 'undefined') {
            throw new Error('❌ GAME_CONFIG não definido');
        }

        console.log('✅ Todas as dependências validadas');
    }

    // ===== INICIALIZAÇÃO =====
    async initializeSystems() {
        try {
            console.log('🔧 Inicializando sistemas...');
            
            // Inicializar renderização 3D
            await this.initializeRenderer();
            
            // Validar dependências antes da inicialização
            this.validateDependencies();

            // Inicializar sistemas de jogo com tratamento de erro
            console.log('🔧 Inicializando GridManager...');
            this.gridManager = new GridManager(this.scene);

            console.log('🔧 Inicializando ResourceManager...');
            this.resourceManager = new ResourceManager(this);

            console.log('🔧 Inicializando BuildingSystem...');
            this.buildingSystem = new BuildingSystem(this.scene, this.gridManager);

            console.log('🔧 Inicializando CityLifeSystem...');
            this.cityLifeSystem = new CityLifeSystem(this.scene, this.gridManager, this.buildingSystem);

            console.log('🔧 Inicializando UIManager...');
            this.uiManager = new UIManager(this);

            console.log('🔧 Inicializando LoanManager...');
            this.loanManager = new LoanManager(this);

            console.log('🔧 Inicializando QuestSystem...');
            this.questSystem = new QuestSystem(this);

            console.log('🔧 Inicializando EventSystem...');
            this.eventSystem = new EventSystem(this);

            console.log('🔧 Inicializando SaveSystem...');
            this.saveSystem = new SaveSystem();

            console.log('🔧 Inicializando TutorialManager...');
            this.tutorialManager = new TutorialManager(this);
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Expor funções de teste globalmente para debug
            window.runMemoryTest = () => this.runMemoryStressTest();
            window.getMemoryInfo = () => this.getMemoryInfo();
            window.logMemoryHistory = () => console.table(this.memoryMonitoring.memoryHistory);
        window.runRapidPlacementTest = () => this.runRapidPlacementTest();
        window.testResourceUpdates = () => this.testResourceUpdates();
        window.testBuildingPlacement = () => this.testBuildingPlacement();

            console.log('✅ Sistemas inicializados com sucesso');
            console.log('🧪 Comandos de debug disponíveis: runMemoryTest(), getMemoryInfo(), logMemoryHistory()');
            this.initialized = true;

        } catch (error) {
            console.error('❌ Erro ao inicializar sistemas:', error);
            this.initialized = false;
            throw error;
        }
    }
    
    async initializeRenderer() {
        console.log('🎨 Inicializando Babylon.js...');

        // Obter canvas
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            // Tentar criar canvas se não existir (para testes)
            this.canvas = document.getElementById('test-canvas');
            if (!this.canvas) {
                throw new Error('Canvas não encontrado (game-canvas ou test-canvas)');
            }
        }

        // Configurar canvas inicial
        this.setupCanvas();

        // Criar engine
        this.engine = new BABYLON.Engine(this.canvas, true, {
            antialias: GAME_CONFIG.canvas.antialias,
            preserveDrawingBuffer: GAME_CONFIG.canvas.preserveDrawingBuffer
        });

        // Criar cena
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color3(0.2, 0.6, 0.9); // Azul céu
        
        // Configurar câmera isométrica
        this.setupCamera();
        
        // Configurar iluminação
        this.setupLighting();
        
        // Configurar controles
        this.setupControls();

        // Configurar sistema de hover
        this.setupHoverSystem();

        // Iniciar loop de renderização
        this.startRenderLoop();
        
        console.log('✅ Babylon.js inicializado');
    }

    setupCanvas() {
        if (!this.canvas) return;

        // Garantir que o canvas tenha dimensões adequadas
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            // Se o canvas não tem dimensões, usar dimensões padrão
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        } else {
            // Usar as dimensões do CSS
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }

        // Garantir que o canvas seja visível
        this.canvas.style.display = 'block';

        console.log(`🎨 Canvas configurado: ${this.canvas.width}x${this.canvas.height}`);
    }

    /**
     * ===== CLEAN CODE REFACTORING: Enhanced camera setup with JSDoc documentation =====
     * Sets up the isometric RTS-style camera system with fixed angles and smooth controls
     *
     * @description Initializes a fixed-angle isometric camera similar to SimCity and Age of Empires.
     *              Provides WASD movement, mouse edge scrolling, and mouse wheel zoom while
     *              maintaining consistent isometric perspective.
     *
     * @method setupCamera
     * @memberof GameManager
     * @since 1.0.0
     *
     * @example
     * // Camera is automatically set up during game initialization
     * gameManager.setupCamera();
     *
     * @see {@link setupIsometricCameraControls} For camera control setup
     * @see {@link updateCameraControls} For camera update logic
     */
    setupCamera() {
        // ===== ISOMETRIC RTS-STYLE CAMERA SYSTEM =====

        // ===== CLEAN CODE REFACTORING: Use constants for camera configuration =====
        this.CAMERA_CONSTANTS = window.GameConstants?.CAMERA || {
            ISOMETRIC_ALPHA: -Math.PI / 4,
            ISOMETRIC_BETA: Math.PI / 3.5,
            DEFAULT_ZOOM_DISTANCE: 30,
            MIN_ZOOM_DISTANCE: 10,
            MAX_ZOOM_DISTANCE: 60
        };

        // Create isometric camera with fixed angle (SimCity/Age of Empires style)
        this.camera = new BABYLON.ArcRotateCamera(
            "isometricCamera",
            this.CAMERA_CONSTANTS.ISOMETRIC_ALPHA,     // Alpha: 45-degree horizontal angle (fixed)
            this.CAMERA_CONSTANTS.ISOMETRIC_BETA,      // Beta: ~51-degree vertical angle for isometric view (fixed)
            this.CAMERA_CONSTANTS.DEFAULT_ZOOM_DISTANCE, // Radius: zoom distance
            BABYLON.Vector3.Zero(),
            this.scene
        );

        // ===== ISOMETRIC CONSTRAINTS: Lock camera angles for true isometric view =====
        this.camera.attachControl(this.canvas, false); // Disable default controls completely

        // Fixed isometric angles - prevent rotation
        this.isometricAngles = {
            alpha: this.CAMERA_CONSTANTS.ISOMETRIC_ALPHA,      // 45 degrees horizontal (fixed)
            beta: this.CAMERA_CONSTANTS.ISOMETRIC_BETA         // ~51 degrees vertical (fixed)
        };

        // Lock camera to isometric angles
        this.camera.alpha = this.isometricAngles.alpha;
        this.camera.beta = this.isometricAngles.beta;

        // Zoom limits for isometric view
        this.camera.lowerRadiusLimit = this.CAMERA_CONSTANTS.MIN_ZOOM_DISTANCE;
        this.camera.upperRadiusLimit = this.CAMERA_CONSTANTS.MAX_ZOOM_DISTANCE;

        // ===== RTS-STYLE CAMERA BOUNDS =====
        this.cameraLimits = this.CAMERA_CONSTANTS.BOUNDS || {
            minX: -30,
            maxX: 70,
            minZ: -30,
            maxZ: 70
        };

        // ===== ISOMETRIC CAMERA STATE =====
        this.isometricCameraState = {
            // Mouse controls
            leftMouseDown: false,
            rightMouseDown: false,
            lastMouseX: 0,
            lastMouseY: 0,
            isPanning: false,

            // Edge scrolling
            edgeScrolling: {
                enabled: true,
                threshold: this.CAMERA_CONSTANTS.EDGE_SCROLL_THRESHOLD || 50,      // Pixels from edge to trigger scrolling
                speed: this.CAMERA_CONSTANTS.EDGE_SCROLL_SPEED || 0.8,             // Edge scroll speed
                isScrolling: false
            },

            // Movement
            isMoving: false,
            targetPosition: BABYLON.Vector3.Zero()
        };

        // ===== SMOOTH MOVEMENT SETTINGS =====
        this.camera.inertia = this.CAMERA_CONSTANTS.INERTIA || 0.9;                                    // Smooth camera movement
        this.camera.angularSensibilityX = this.CAMERA_CONSTANTS.ANGULAR_SENSITIVITY_DISABLED || 0;     // Disable rotation
        this.camera.angularSensibilityY = this.CAMERA_CONSTANTS.ANGULAR_SENSITIVITY_DISABLED || 0;     // Disable rotation

        // Setup isometric camera controls
        this.setupIsometricCameraControls();
    }
    
    setupLighting() {
        // Luz ambiente
        const ambientLight = new BABYLON.HemisphericLight(
            "ambientLight",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambientLight.intensity = 0.6;
        ambientLight.diffuse = new BABYLON.Color3(1, 1, 0.9);
        
        // Luz direcional (sol)
        const sunLight = new BABYLON.DirectionalLight(
            "sunLight",
            new BABYLON.Vector3(-1, -1, -0.5),
            this.scene
        );
        sunLight.intensity = 0.8;
        sunLight.diffuse = new BABYLON.Color3(1, 0.95, 0.8);
        
        // Sombras
        const shadowGenerator = new BABYLON.ShadowGenerator(1024, sunLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
        
        this.shadowGenerator = shadowGenerator;
    }
    
    setupControls() {
        // Configurar picking (seleção de objetos)
        this.scene.onPointerObservable.add((pointerInfo) => {
            this.handlePointerEvent(pointerInfo);
        });

        // Configurar teclado
        this.scene.onKeyboardObservable.add((kbInfo) => {
            this.handleKeyboardEvent(kbInfo);
        });
    }

    // ===== ISOMETRIC RTS-STYLE CAMERA CONTROLS =====
    setupIsometricCameraControls() {
        // Mouse events for panning
        this.canvas.addEventListener('mousedown', (event) => {
            this.handleIsometricMouseDown(event);
        });

        this.canvas.addEventListener('mouseup', (event) => {
            this.handleIsometricMouseUp(event);
        });

        // CONSOLIDATED MOUSE MOVE HANDLER - Handles all mouse movement in one place
        this.canvas.addEventListener('mousemove', (event) => {
            this.handleConsolidatedMouseMove(event);
        });

        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (event) => {
            this.handleIsometricWheel(event);
        });

        this.canvas.addEventListener('mouseleave', () => {
            // Camera cleanup
            this.isometricCameraState.edgeScrolling.isScrolling = false;

            // Hover system cleanup
            this.hideHoverInfo();
            this.hideAllBuildingLabels();

            // Clear throttle timeout if it exists
            if (this.mouseHoverThrottle && this.mouseHoverThrottle.timeoutId) {
                clearTimeout(this.mouseHoverThrottle.timeoutId);
                this.mouseHoverThrottle.timeoutId = null;
            }
        });

        // Arrow keys support (in addition to WASD)
        document.addEventListener('keydown', (event) => {
            this.handleIsometricKeyDown(event);
        });

        document.addEventListener('keyup', (event) => {
            this.handleIsometricKeyUp(event);
        });

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        console.log('🎮 Isometric RTS-style camera controls initialized');
    }

    // ===== ISOMETRIC CAMERA EVENT HANDLERS =====

    handleIsometricMouseDown(event) {
        if (!this.camera) return;

        this.isometricCameraState.lastMouseX = event.clientX;
        this.isometricCameraState.lastMouseY = event.clientY;

        if (event.button === 0) { // Left mouse button for panning
            this.isometricCameraState.leftMouseDown = true;
            this.isometricCameraState.isPanning = true;
        }
        // Note: Right mouse button disabled for isometric view (no rotation allowed)

        event.preventDefault();
    }

    handleIsometricMouseUp(event) {
        if (event.button === 0) { // Left mouse button
            this.isometricCameraState.leftMouseDown = false;
            this.isometricCameraState.isPanning = false;
        }
    }

    // ===== CONSOLIDATED MOUSE MOVE HANDLER - PERFORMANCE FIX =====
    handleConsolidatedMouseMove(event) {
        if (!this.camera) return;

        // Calculate mouse deltas for camera panning
        const deltaX = event.clientX - this.isometricCameraState.lastMouseX;
        const deltaY = event.clientY - this.isometricCameraState.lastMouseY;

        // Handle camera panning (only with left mouse button in isometric view)
        if (this.isometricCameraState.isPanning && this.isometricCameraState.leftMouseDown) {
            this.panIsometricCamera(deltaX, deltaY);
        }

        // Handle edge scrolling
        this.handleEdgeScrolling(event);

        // Handle mouse hover with throttling for performance
        this.handleMouseHoverThrottled(event);

        // Update mouse position for next frame
        this.isometricCameraState.lastMouseX = event.clientX;
        this.isometricCameraState.lastMouseY = event.clientY;
    }

    // Legacy method for compatibility - now calls consolidated handler
    handleIsometricMouseMove(event) {
        this.handleConsolidatedMouseMove(event);
    }

    handleIsometricKeyDown(event) {
        // Arrow keys support for camera movement
        switch (event.code) {
            case 'ArrowUp':
                this.cameraControls.keys.W = true;
                event.preventDefault();
                break;
            case 'ArrowDown':
                this.cameraControls.keys.S = true;
                event.preventDefault();
                break;
            case 'ArrowLeft':
                this.cameraControls.keys.A = true;
                event.preventDefault();
                break;
            case 'ArrowRight':
                this.cameraControls.keys.D = true;
                event.preventDefault();
                break;
        }
    }

    handleIsometricKeyUp(event) {
        // Arrow keys support for camera movement
        switch (event.code) {
            case 'ArrowUp':
                this.cameraControls.keys.W = false;
                event.preventDefault();
                break;
            case 'ArrowDown':
                this.cameraControls.keys.S = false;
                event.preventDefault();
                break;
            case 'ArrowLeft':
                this.cameraControls.keys.A = false;
                event.preventDefault();
                break;
            case 'ArrowRight':
                this.cameraControls.keys.D = false;
                event.preventDefault();
                break;
        }
    }

    // ===== ISOMETRIC CAMERA MOVEMENT METHODS =====

    /**
     * ===== CLEAN CODE REFACTORING: Enhanced camera panning with improved documentation =====
     * Pans the isometric camera while maintaining fixed angles and respecting world boundaries
     *
     * @description Handles smooth camera panning in isometric view by transforming screen-space
     *              mouse movement into world-space camera movement. Maintains fixed camera angles
     *              and applies boundary constraints to prevent camera from moving outside the game world.
     *
     * @method panIsometricCamera
     * @memberof GameManager
     * @since 1.0.0
     *
     * @param {number} deltaX - Mouse movement in X direction (screen pixels)
     * @param {number} deltaY - Mouse movement in Y direction (screen pixels)
     *
     * @throws {Error} Logs warning if camera panning fails
     *
     * @example
     * // Called automatically during mouse drag events
     * gameManager.panIsometricCamera(10, -5); // Pan camera based on mouse movement
     *
     * @see {@link screenToIsometricWorld} For coordinate transformation
     * @see {@link moveIsometricCamera} For direct camera movement
     */
    panIsometricCamera(deltaX, deltaY) {
        try {
            // ===== CLEAN CODE REFACTORING: Use constants for camera sensitivity =====
            const sensitivity = this.CAMERA_CONSTANTS.PAN_SENSITIVITY || 0.02;

            // Calculate movement in world space based on isometric view
            // In isometric view, we need to transform screen movement to world movement
            const worldMovement = this.screenToIsometricWorld(deltaX, deltaY, sensitivity);

            // Get current target and calculate new target
            const currentTarget = this.camera.getTarget();
            const newTarget = currentTarget.add(worldMovement);

            // Apply camera bounds
            newTarget.x = Math.max(this.cameraLimits.minX, Math.min(this.cameraLimits.maxX, newTarget.x));
            newTarget.z = Math.max(this.cameraLimits.minZ, Math.min(this.cameraLimits.maxZ, newTarget.z));

            // Apply smooth movement
            this.camera.setTarget(newTarget);

        } catch (error) {
            console.warn('⚠️ Error in isometric camera panning:', error);
        }
    }

    /**
     * ===== CLEAN CODE REFACTORING: Enhanced coordinate transformation =====
     * Converts screen-space mouse movement to isometric world-space movement
     *
     * @description Transforms 2D screen coordinates to 3D world coordinates for isometric camera movement.
     *              Accounts for the 45-degree rotation inherent in isometric projection to ensure
     *              intuitive camera movement that matches user expectations.
     *
     * @method screenToIsometricWorld
     * @memberof GameManager
     * @since 1.0.0
     *
     * @param {number} deltaX - Screen delta X in pixels
     * @param {number} deltaY - Screen delta Y in pixels
     * @param {number} sensitivity - Movement sensitivity multiplier (default: 0.02)
     *
     * @returns {BABYLON.Vector3} World movement vector with X, Y=0, Z components
     *
     * @example
     * // Convert mouse movement to world movement
     * const worldMovement = gameManager.screenToIsometricWorld(10, -5, 0.02);
     * console.log(worldMovement); // Vector3 with transformed coordinates
     *
     * @see {@link panIsometricCamera} For usage in camera panning
     */
    screenToIsometricWorld(deltaX, deltaY, sensitivity) {
        // For isometric view, we need to account for the 45-degree rotation
        // Screen X movement affects both world X and Z
        // Screen Y movement affects world Z primarily

        const cos45 = Math.cos(Math.PI / 4); // 0.707
        const sin45 = Math.sin(Math.PI / 4); // 0.707

        // Transform screen movement to world movement for isometric view
        const worldX = (-deltaX * cos45 + deltaY * sin45) * sensitivity;
        const worldZ = (-deltaX * sin45 - deltaY * cos45) * sensitivity;

        return new BABYLON.Vector3(worldX, 0, worldZ);
    }

    /**
     * Handles edge scrolling for RTS-style camera movement
     * @param {MouseEvent} event - Mouse move event
     */
    handleEdgeScrolling(event) {
        if (!this.isometricCameraState.edgeScrolling.enabled) return;

        const rect = this.canvas.getBoundingClientRect();
        const threshold = this.isometricCameraState.edgeScrolling.threshold;
        const speed = this.isometricCameraState.edgeScrolling.speed;

        // Calculate distances from edges
        const leftDistance = event.clientX - rect.left;
        const rightDistance = rect.right - event.clientX;
        const topDistance = event.clientY - rect.top;
        const bottomDistance = rect.bottom - event.clientY;

        // Determine edge scrolling direction
        let scrollX = 0;
        let scrollZ = 0;

        if (leftDistance < threshold) {
            scrollX = -speed;
        } else if (rightDistance < threshold) {
            scrollX = speed;
        }

        if (topDistance < threshold) {
            scrollZ = -speed;
        } else if (bottomDistance < threshold) {
            scrollZ = speed;
        }

        // Apply edge scrolling if any direction is active
        if (scrollX !== 0 || scrollZ !== 0) {
            this.isometricCameraState.edgeScrolling.isScrolling = true;
            this.moveIsometricCamera(scrollX, scrollZ);
        } else {
            this.isometricCameraState.edgeScrolling.isScrolling = false;
        }
    }

    /**
     * Moves the isometric camera by specified amounts
     * @param {number} deltaX - Movement in X direction
     * @param {number} deltaZ - Movement in Z direction
     */
    moveIsometricCamera(deltaX, deltaZ) {
        try {
            const currentTarget = this.camera.getTarget();
            const newTarget = new BABYLON.Vector3(
                currentTarget.x + deltaX,
                currentTarget.y,
                currentTarget.z + deltaZ
            );

            // Apply camera bounds
            newTarget.x = Math.max(this.cameraLimits.minX, Math.min(this.cameraLimits.maxX, newTarget.x));
            newTarget.z = Math.max(this.cameraLimits.minZ, Math.min(this.cameraLimits.maxZ, newTarget.z));

            this.camera.setTarget(newTarget);

        } catch (error) {
            console.warn('⚠️ Error in isometric camera movement:', error);
        }
    }

    panCamera(deltaX, deltaY) {
        try {
            // Calculate movement based on camera orientation
            const sensitivity = 0.01;
            const forward = this.camera.getForwardRay().direction;
            const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up());

            // Normalize vectors
            forward.normalize();
            right.normalize();

            // Calculate movement (inverted for natural feel)
            const movement = right.scale(-deltaX * sensitivity).add(forward.scale(deltaY * sensitivity));
            movement.y = 0; // Keep movement on horizontal plane

            // Get current target and calculate new target
            const currentTarget = this.camera.getTarget();
            const newTarget = currentTarget.add(movement);

            // ===== CAMERA LIMITS: Ensure camera stays within playable area =====
            newTarget.x = Math.max(this.cameraLimits.minX, Math.min(this.cameraLimits.maxX, newTarget.x));
            newTarget.z = Math.max(this.cameraLimits.minZ, Math.min(this.cameraLimits.maxZ, newTarget.z));

            // Apply smooth movement
            this.camera.setTarget(newTarget);

        } catch (error) {
            console.warn('⚠️ Error in camera panning:', error);
        }
    }

    orbitCamera(deltaX, deltaY) {
        try {
            // ===== RIGHT MOUSE: Orbital rotation with limits =====
            const sensitivity = 0.005;

            // Update alpha (horizontal rotation)
            this.camera.alpha += deltaX * sensitivity;

            // Update beta (vertical rotation) with limits
            const newBeta = this.camera.beta - deltaY * sensitivity;
            this.camera.beta = Math.max(this.camera.lowerBetaLimit, Math.min(this.camera.upperBetaLimit, newBeta));

        } catch (error) {
            console.warn('⚠️ Error in camera orbiting:', error);
        }
    }

    /**
     * ===== CLEAN CODE REFACTORING: Enhanced wheel zoom with constants =====
     * Handles mouse wheel for isometric camera zoom while maintaining fixed angles
     *
     * @description Processes mouse wheel events to zoom the camera in/out while preserving
     *              the fixed isometric angles. Applies zoom sensitivity and boundary constraints.
     *
     * @method handleIsometricWheel
     * @memberof GameManager
     * @since 1.0.0
     *
     * @param {WheelEvent} event - Mouse wheel event containing deltaY for zoom direction
     *
     * @example
     * // Called automatically by event listener
     * canvas.addEventListener('wheel', (event) => {
     *     gameManager.handleIsometricWheel(event);
     * });
     */
    handleIsometricWheel(event) {
        if (!this.camera) return;

        // ===== CLEAN CODE REFACTORING: Use constants for zoom sensitivity =====
        const zoomSensitivity = this.CAMERA_CONSTANTS.ZOOM_SENSITIVITY || 2;
        const deltaRadius = event.deltaY > 0 ? zoomSensitivity : -zoomSensitivity;

        const newRadius = this.camera.radius + deltaRadius;
        this.camera.radius = Math.max(this.camera.lowerRadiusLimit, Math.min(this.camera.upperRadiusLimit, newRadius));

        // Ensure angles remain fixed for isometric view
        this.camera.alpha = this.isometricAngles.alpha;
        this.camera.beta = this.isometricAngles.beta;

        event.preventDefault();
    }

    // Legacy method for compatibility
    handleCameraWheel(event) {
        this.handleIsometricWheel(event);
    }
    
    startRenderLoop() {
        this.engine.runRenderLoop(() => {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastUpdateTime;
            
            // Atualizar controles de câmera WASD (sempre ativo)
            this.updateCameraControls(deltaTime);

            // Atualizar jogo
            this.update(deltaTime);

            // Renderizar cena
            this.scene.render();
            
            this.lastUpdateTime = currentTime;
            this.frameCount++;
            
            // Atualizar FPS
            if (currentTime - this.lastFPSUpdate > 1000) {
                this.currentFPS = this.frameCount;
                this.frameCount = 0;
                this.lastFPSUpdate = currentTime;
            }
        });
    }
    
    // ===== LOOP PRINCIPAL =====
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Atualizar tempo de jogo
        this.gameTime += deltaTime * this.timeScale;

        // Atualizar relógio do jogo
        this.updateGameClock(deltaTime);
        
        // Atualizar sistemas
        if (this.resourceManager) {
            this.resourceManager.update(deltaTime * this.timeScale);
        }
        
        if (this.buildingSystem) {
            this.buildingSystem.update(deltaTime * this.timeScale);
        }

        if (this.cityLifeSystem) {
            this.cityLifeSystem.update(deltaTime);

            // Atualizar densidade baseada na população
            const population = this.resourceManager.getResource('population');
            this.cityLifeSystem.updateDensity(population);
        }

        if (this.questSystem) {
            this.questSystem.update(deltaTime * this.timeScale);
        }
        
        if (this.eventSystem) {
            this.eventSystem.update(deltaTime * this.timeScale);
        }

        // Processar pagamentos de empréstimos (uma vez por mês de jogo)
        if (this.loanManager) {
            // Verificar se passou um mês de jogo (simplificado)
            const gameHours = this.gameTime / 3600000; // Converter para horas de jogo
            if (Math.floor(gameHours / (24 * 30)) > Math.floor((gameHours - deltaTime * this.timeScale) / (24 * 30))) {
                this.loanManager.processMonthlyPayments();
            }
        }

        if (this.uiManager) {
            this.uiManager.update(deltaTime);
        }

        // Monitoramento de memória
        this.updateMemoryMonitoring(deltaTime);

        // Auto-save
        this.autoSaveTimer += deltaTime;
        if (this.autoSaveTimer >= GAME_CONFIG.gameplay.autoSaveInterval) {
            this.autoSave();
            this.autoSaveTimer = 0;
        }
    }

    // ===== MONITORAMENTO DE MEMÓRIA =====
    updateMemoryMonitoring(deltaTime) {
        if (!this.memoryMonitoring.enabled) return;

        this.memoryMonitoring.lastCheck += deltaTime;

        if (this.memoryMonitoring.lastCheck >= this.memoryMonitoring.checkInterval) {
            this.checkMemoryUsage();
            this.memoryMonitoring.lastCheck = 0;
        }
    }

    checkMemoryUsage() {
        const memoryInfo = this.getMemoryInfo();

        // Atualizar histórico
        this.memoryMonitoring.memoryHistory.push({
            timestamp: Date.now(),
            ...memoryInfo
        });

        // Manter apenas os últimos 20 registros (100 segundos)
        if (this.memoryMonitoring.memoryHistory.length > 20) {
            this.memoryMonitoring.memoryHistory.shift();
        }

        // Atualizar máximo
        if (memoryInfo.heapUsed > this.memoryMonitoring.maxMemoryUsage) {
            this.memoryMonitoring.maxMemoryUsage = memoryInfo.heapUsed;
        }

        // Detectar vazamentos de memória
        this.detectMemoryLeaks();

        // Log de memória
        this.logMemoryUsage(memoryInfo);

        // Verificar limites críticos
        this.checkMemoryThresholds(memoryInfo);
    }

    getMemoryInfo() {
        const info = {
            heapUsed: 0,
            heapTotal: 0,
            buildingCount: 0,
            meshCount: 0,
            textureCount: 0,
            materialCount: 0
        };

        // Obter informações de memória do navegador (se disponível)
        if (performance.memory) {
            info.heapUsed = performance.memory.usedJSHeapSize;
            info.heapTotal = performance.memory.totalJSHeapSize;
        }

        // Contar objetos do jogo
        if (this.buildingSystem) {
            info.buildingCount = this.buildingSystem.buildings.size;
            info.materialCount = this.buildingSystem.materials.size;
            info.textureCount = this.buildingSystem.dynamicTextures.size;
        }

        // Contar meshes na cena
        if (this.scene) {
            info.meshCount = this.scene.meshes.length;
        }

        return info;
    }

    detectMemoryLeaks() {
        const history = this.memoryMonitoring.memoryHistory;
        if (history.length < 5) return; // Precisa de pelo menos 5 amostras

        // Verificar se a memória está crescendo consistentemente
        let growthCount = 0;
        for (let i = 1; i < history.length; i++) {
            if (history[i].heapUsed > history[i-1].heapUsed) {
                growthCount++;
            }
        }

        // Se mais de 80% das amostras mostram crescimento, pode ser vazamento
        const growthRatio = growthCount / (history.length - 1);
        if (growthRatio > 0.8) {
            const memoryGrowth = history[history.length - 1].heapUsed - history[0].heapUsed;
            const timeSpan = (history[history.length - 1].timestamp - history[0].timestamp) / 1000;

            console.warn(`⚠️ POSSÍVEL VAZAMENTO DE MEMÓRIA DETECTADO!`);
            console.warn(`📈 Crescimento: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB em ${timeSpan.toFixed(1)}s`);
            console.warn(`📊 Taxa de crescimento: ${growthRatio * 100}% das amostras`);

            // Mostrar alerta na UI se disponível
            if (this.uiManager && this.uiManager.showAlert) {
                this.uiManager.showAlert('Possível vazamento de memória detectado! Verifique o console para detalhes.', 'warning');
            }
        }
    }

    logMemoryUsage(memoryInfo) {
        const heapMB = (memoryInfo.heapUsed / 1024 / 1024).toFixed(2);
        const maxMB = (this.memoryMonitoring.maxMemoryUsage / 1024 / 1024).toFixed(2);

        console.log(`🧠 Memória: ${heapMB}MB (máx: ${maxMB}MB) | Edifícios: ${memoryInfo.buildingCount} | Meshes: ${memoryInfo.meshCount} | Texturas: ${memoryInfo.textureCount}`);
    }

    checkMemoryThresholds(memoryInfo) {
        const heapMB = memoryInfo.heapUsed / 1024 / 1024;

        // Limite de aviso: 100MB
        if (heapMB > 100 && heapMB <= 200) {
            console.warn(`⚠️ Uso de memória alto: ${heapMB.toFixed(2)}MB`);
        }

        // Limite crítico: 200MB
        if (heapMB > 200) {
            console.error(`🚨 USO DE MEMÓRIA CRÍTICO: ${heapMB.toFixed(2)}MB`);
            console.error(`🔧 Recomendação: Reinicie o jogo ou remova alguns edifícios`);

            if (this.uiManager && this.uiManager.showAlert) {
                this.uiManager.showAlert(`Uso de memória crítico: ${heapMB.toFixed(2)}MB. Considere reiniciar o jogo.`, 'error');
            }
        }
    }

    // Função de teste de stress para verificar vazamentos
    runMemoryStressTest() {
        console.log('🧪 Iniciando teste de stress de memória...');

        if (!this.buildingSystem) {
            console.error('❌ BuildingSystem não disponível para teste');
            return;
        }

        const initialMemory = this.getMemoryInfo();
        console.log(`📊 Memória inicial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

        // Colocar 20 edifícios em posições aleatórias
        const buildingTypes = ['water_pump', 'treatment_plant', 'house', 'apartment', 'water_tank'];
        const placedBuildings = [];

        for (let i = 0; i < 20; i++) {
            let attempts = 0;
            let placed = false;

            while (!placed && attempts < 50) {
                const x = Math.floor(Math.random() * (this.gridManager.gridSize - 5)) + 2;
                const z = Math.floor(Math.random() * (this.gridManager.gridSize - 5)) + 2;
                const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];

                const canPlace = this.buildingSystem.canPlaceBuilding(x, z, buildingType);
                if (canPlace.canPlace) {
                    const building = this.buildingSystem.placeBuilding(x, z, buildingType);
                    if (building) {
                        placedBuildings.push(building.id);
                        placed = true;
                        console.log(`✅ Edifício ${i + 1}/20 colocado: ${buildingType} em (${x}, ${z})`);
                    }
                }
                attempts++;
            }

            if (!placed) {
                console.warn(`⚠️ Não foi possível colocar edifício ${i + 1}/20`);
            }
        }

        // Aguardar um pouco e verificar memória
        setTimeout(() => {
            const afterPlacement = this.getMemoryInfo();
            console.log(`📊 Memória após colocação: ${(afterPlacement.heapUsed / 1024 / 1024).toFixed(2)}MB`);

            // Remover todos os edifícios
            console.log('🗑️ Removendo todos os edifícios de teste...');
            placedBuildings.forEach(buildingId => {
                this.buildingSystem.removeBuilding(buildingId);
            });

            // Forçar garbage collection se disponível
            if (window.gc) {
                window.gc();
            }

            // Verificar memória final
            setTimeout(() => {
                const finalMemory = this.getMemoryInfo();
                console.log(`📊 Memória final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

                const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
                const diffMB = (memoryDiff / 1024 / 1024).toFixed(2);

                if (memoryDiff > 5 * 1024 * 1024) { // 5MB de diferença
                    console.error(`🚨 POSSÍVEL VAZAMENTO: Diferença de ${diffMB}MB após teste`);
                } else {
                    console.log(`✅ TESTE PASSOU: Diferença de apenas ${diffMB}MB`);
                }

                console.log('🧪 Teste de stress de memória concluído');
            }, 2000);
        }, 1000);
    }

    // Teste de colocação rápida para reproduzir vazamentos
    runRapidPlacementTest() {
        console.log('⚡ Iniciando teste de colocação rápida...');

        if (!this.buildingSystem) {
            console.error('❌ BuildingSystem não disponível');
            return;
        }

        const initialMemory = this.getMemoryInfo();
        console.log(`📊 Memória inicial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

        const buildingTypes = ['water_pump', 'house', 'treatment_plant'];
        const placedBuildings = [];
        let placementCount = 0;

        // Colocar edifícios rapidamente (intervalo de 100ms)
        const rapidPlacement = setInterval(() => {
            if (placementCount >= 10) {
                clearInterval(rapidPlacement);

                // Verificar memória após colocação rápida
                setTimeout(() => {
                    const afterPlacement = this.getMemoryInfo();
                    console.log(`📊 Memória após colocação rápida: ${(afterPlacement.heapUsed / 1024 / 1024).toFixed(2)}MB`);

                    // Remover todos rapidamente
                    console.log('🗑️ Removendo todos os edifícios rapidamente...');
                    const rapidRemoval = setInterval(() => {
                        if (placedBuildings.length === 0) {
                            clearInterval(rapidRemoval);

                            // Verificar memória final
                            setTimeout(() => {
                                const finalMemory = this.getMemoryInfo();
                                console.log(`📊 Memória final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

                                const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
                                const diffMB = (memoryDiff / 1024 / 1024).toFixed(2);

                                if (memoryDiff > 10 * 1024 * 1024) { // 10MB
                                    console.error(`🚨 VAZAMENTO DETECTADO: +${diffMB}MB após teste rápido`);
                                } else {
                                    console.log(`✅ TESTE RÁPIDO PASSOU: Apenas +${diffMB}MB`);
                                }

                                console.log('⚡ Teste de colocação rápida concluído');
                            }, 1000);
                            return;
                        }

                        const buildingId = placedBuildings.pop();
                        this.buildingSystem.removeBuilding(buildingId);
                    }, 50); // Remover a cada 50ms
                }, 500);
                return;
            }

            // Tentar colocar edifício
            const x = Math.floor(Math.random() * 10) + 20;
            const z = Math.floor(Math.random() * 10) + 20;
            const type = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];

            const building = this.buildingSystem.placeBuilding(x, z, type);
            if (building) {
                placedBuildings.push(building.id);
                console.log(`⚡ Colocação rápida ${placementCount + 1}/10: ${type}`);
            }

            placementCount++;
        }, 100); // Colocar a cada 100ms
    }

    // Teste de atualizações de recursos
    testResourceUpdates() {
        console.log('💧 Testando atualizações de recursos...');

        if (!this.resourceManager || !this.buildingSystem) {
            console.error('❌ Sistemas não disponíveis');
            return;
        }

        // Capturar estado inicial
        const initialWater = this.resourceManager.getResource('water');
        const initialPollution = this.resourceManager.getResource('pollution');

        console.log(`📊 Estado inicial - Água: ${initialWater.current}/${initialWater.production}, Poluição: ${initialPollution.current}`);

        // Colocar bomba de água
        const waterPump = this.buildingSystem.placeBuilding(25, 25, 'water_pump');
        if (waterPump) {
            setTimeout(() => {
                const afterWaterPump = this.resourceManager.getResource('water');
                console.log(`💧 Após bomba de água - Produção: ${afterWaterPump.production} (+50 esperado)`);

                // Colocar estação de tratamento
                const treatmentPlant = this.buildingSystem.placeBuilding(27, 25, 'treatment_plant');
                if (treatmentPlant) {
                    setTimeout(() => {
                        const afterTreatment = this.resourceManager.getResource('pollution');
                        console.log(`🏭 Após estação de tratamento - Redução: ${afterTreatment.reduction} (+30 esperado)`);

                        // Remover edifícios e verificar reversão
                        this.buildingSystem.removeBuilding(waterPump.id);
                        this.buildingSystem.removeBuilding(treatmentPlant.id);

                        setTimeout(() => {
                            const finalWater = this.resourceManager.getResource('water');
                            const finalPollution = this.resourceManager.getResource('pollution');

                            console.log(`📊 Estado final - Água: ${finalWater.production}, Poluição: ${finalPollution.reduction}`);

                            if (finalWater.production === initialWater.production &&
                                finalPollution.reduction === initialPollution.reduction) {
                                console.log('✅ RECURSOS ATUALIZARAM CORRETAMENTE');
                            } else {
                                console.error('❌ RECURSOS NÃO REVERTERAM CORRETAMENTE');
                            }
                        }, 100);
                    }, 100);
                }
            }, 100);
        }
    }

    // Teste de colocação de edifícios
    testBuildingPlacement() {
        console.log('🏗️ Testando colocação de edifícios...');

        if (!this.buildingSystem) {
            console.error('❌ BuildingSystem não disponível');
            return;
        }

        // Testar diferentes tipos de terreno
        const testCases = [
            { x: 10, z: 10, type: 'water_pump', expected: true, reason: 'Área da cidade (grassland)' },
            { x: 8, z: 8, type: 'house', expected: true, reason: 'Área da cidade (grassland)' },
            { x: 12, z: 12, type: 'treatment_plant', expected: true, reason: 'Área da cidade (grassland)' },
            { x: 5, z: 5, type: 'water_tank', expected: true, reason: 'Borda da cidade' }
        ];

        testCases.forEach((testCase, index) => {
            const { x, z, type, expected, reason } = testCase;

            console.log(`\n🧪 Teste ${index + 1}: ${type} em (${x}, ${z}) - ${reason}`);

            const canPlace = this.buildingSystem.canPlaceBuilding(x, z, type);
            console.log(`   Resultado: ${canPlace.canPlace ? '✅ PODE' : '❌ NÃO PODE'} - ${canPlace.reason || 'OK'}`);

            if (canPlace.canPlace === expected) {
                console.log(`   ✅ Teste passou`);

                if (canPlace.canPlace) {
                    // Tentar construir
                    const building = this.buildingSystem.placeBuilding(x, z, type);
                    if (building) {
                        console.log(`   🏗️ Construído com sucesso: ${building.config.name}`);

                        // Remover após teste
                        setTimeout(() => {
                            this.buildingSystem.removeBuilding(building.id);
                            console.log(`   🗑️ Removido após teste`);
                        }, 1000);
                    } else {
                        console.error(`   ❌ Falha na construção mesmo com canPlace=true`);
                    }
                }
            } else {
                console.error(`   ❌ Teste falhou - Esperado: ${expected}, Obtido: ${canPlace.canPlace}`);
            }
        });

        console.log('\n🏗️ Teste de colocação concluído');
    }

    // ===== CONTROLE DE JOGO =====
    startNewGame() {
        console.log('🎮 Iniciando novo jogo...');

        // Verificar se os sistemas foram inicializados
        if (!this.initialized) {
            console.error('❌ Sistemas não inicializados. Aguarde a inicialização.');
            return false;
        }

        this.gameState = 'playing';
        this.gameTime = 0;
        this.timeScale = 1;

        // Inicializar relógio do jogo
        this.initializeGameClock();

        // Resetar recursos (verificar se existe)
        if (this.resourceManager) {
            this.resourceManager.reset();
        } else {
            console.error('❌ ResourceManager não inicializado');
            return false;
        }

        // Grid já foi inicializado no construtor do GridManager
        if (!this.gridManager) {
            console.error('❌ GridManager não inicializado');
            return false;
        }

        // Inicializar UI (verificar se existe)
        if (this.uiManager) {
            this.uiManager.initialize();
        } else {
            console.error('❌ UIManager não inicializado');
            return false;
        }

        // Iniciar primeira missão (verificar se existe)
        if (this.questSystem) {
            this.questSystem.startFirstQuest();
        } else {
            console.error('❌ QuestSystem não inicializado');
            return false;
        }

        // Redimensionar canvas
        this.handleResize();

        // Criar cidade inicial
        this.createStarterCity();

        console.log('✅ Novo jogo iniciado');
        return true;
    }

    createStarterCity() {
        console.log('🏙️ Criando cidade inicial...');

        if (!this.buildingSystem) {
            console.error('❌ BuildingSystem não disponível para criar cidade inicial');
            return;
        }

        try {
            // Apenas construir a Prefeitura Municipal (City Hall) como edifício inicial
            const cityHall = { type: 'city_hall', x: 10, z: 10 };

            // Temporariamente desabilitar cooldown para construção inicial
            const originalCooldownActive = this.buildingSystem.buildingCooldown.active;
            this.buildingSystem.buildingCooldown.active = false;

            console.log('🏛️ Construindo Prefeitura Municipal (centro da cidade)...');
            const success = this.buildingSystem.placeBuilding(cityHall.x, cityHall.z, cityHall.type);

            if (success) {
                console.log(`✅ ${cityHall.type} construído em (${cityHall.x}, ${cityHall.z})`);
                console.log('🏙️ Cidade inicial criada: 1/1 edifícios (apenas Prefeitura Municipal)');

                // Adicionar efeitos de iluminação ao redor da Prefeitura
                this.addCityHallLightingEffects(success);

                // Centralizar câmera na Prefeitura Municipal
                this.centerCameraOnCityHall(cityHall.x, cityHall.z);
            } else {
                console.warn(`⚠️ Falha ao construir ${cityHall.type} em (${cityHall.x}, ${cityHall.z})`);
            }

            // Restaurar estado original do cooldown
            this.buildingSystem.buildingCooldown.active = originalCooldownActive;

            // Ajustar recursos iniciais para cidade funcional
            if (this.resourceManager) {
                this.resourceManager.resources.budget.current += 10000; // Bônus inicial
                console.log('💰 Bônus de orçamento inicial aplicado');
            }

        } catch (error) {
            console.error('❌ Erro ao criar cidade inicial:', error);
        }
    }

    addCityHallLightingEffects(cityHallBuilding) {
        if (!cityHallBuilding || !cityHallBuilding.mesh || !this.scene) {
            return;
        }

        try {
            console.log('💡 Adicionando efeitos de iluminação à Prefeitura Municipal...');

            // Criar luz pontual dourada ao redor da Prefeitura
            const light = new BABYLON.PointLight("cityHallLight",
                new BABYLON.Vector3(cityHallBuilding.mesh.position.x,
                                  cityHallBuilding.mesh.position.y + 3,
                                  cityHallBuilding.mesh.position.z), this.scene);

            light.diffuse = new BABYLON.Color3(1, 0.8, 0.4); // Cor dourada
            light.specular = new BABYLON.Color3(1, 1, 0.6);
            light.intensity = 0.8;
            light.range = 10;

            // Criar partículas de energia ao redor da Prefeitura
            const particleSystem = new BABYLON.ParticleSystem("cityHallParticles", 50, this.scene);
            particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);

            particleSystem.emitter = cityHallBuilding.mesh;
            particleSystem.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
            particleSystem.maxEmitBox = new BABYLON.Vector3(1, 2, 1);

            particleSystem.color1 = new BABYLON.Color4(1, 0.8, 0.4, 1.0);
            particleSystem.color2 = new BABYLON.Color4(1, 1, 0.6, 1.0);
            particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);

            particleSystem.minSize = 0.1;
            particleSystem.maxSize = 0.3;
            particleSystem.minLifeTime = 1;
            particleSystem.maxLifeTime = 3;
            particleSystem.emitRate = 10;

            particleSystem.direction1 = new BABYLON.Vector3(-0.5, 1, -0.5);
            particleSystem.direction2 = new BABYLON.Vector3(0.5, 2, 0.5);
            particleSystem.minEmitPower = 1;
            particleSystem.maxEmitPower = 3;

            particleSystem.start();

            // Armazenar referências para limpeza posterior
            cityHallBuilding.lightingEffects = {
                light: light,
                particles: particleSystem
            };

            console.log('✅ Efeitos de iluminação da Prefeitura Municipal criados');

        } catch (error) {
            console.error('❌ Erro ao criar efeitos de iluminação:', error);
        }
    }

    centerCameraOnCityHall(gridX, gridZ) {
        if (!this.camera || !this.gridManager) {
            console.warn('⚠️ Câmera ou GridManager não disponível para centralização');
            return;
        }

        try {
            // Converter posição do grid para coordenadas do mundo
            const worldPos = this.gridManager.gridToWorld(gridX, gridZ);

            console.log(`📷 Centralizando câmera na Prefeitura Municipal em (${gridX}, ${gridZ}) -> mundo (${worldPos.x}, ${worldPos.z})`);

            // Criar posição alvo para a câmera
            const targetPosition = new BABYLON.Vector3(worldPos.x, 0, worldPos.z);

            // Animar transição suave da câmera para a nova posição
            const animationTarget = BABYLON.Animation.CreateAndStartAnimation(
                "cameraTargetAnimation",
                this.camera,
                "target",
                60, // 60 FPS
                120, // 2 segundos de duração
                this.camera.getTarget(),
                targetPosition,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                new BABYLON.CubicEase(),
                () => {
                    console.log('✅ Câmera centralizada na Prefeitura Municipal');
                }
            );

            // Ajustar zoom para uma visão adequada da cidade
            const animationRadius = BABYLON.Animation.CreateAndStartAnimation(
                "cameraRadiusAnimation",
                this.camera,
                "radius",
                60, // 60 FPS
                120, // 2 segundos de duração
                this.camera.radius,
                25, // Zoom adequado para ver a Prefeitura e arredores
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                new BABYLON.CubicEase()
            );

            // Ensure isometric angles are maintained during animation
            const animationAlpha = BABYLON.Animation.CreateAndStartAnimation(
                "cameraAlphaAnimation",
                this.camera,
                "alpha",
                60, // 60 FPS
                120, // 2 segundos de duração
                this.camera.alpha,
                this.isometricAngles.alpha, // Use fixed isometric angle
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                new BABYLON.CubicEase()
            );

            const animationBeta = BABYLON.Animation.CreateAndStartAnimation(
                "cameraBetaAnimation",
                this.camera,
                "beta",
                60, // 60 FPS
                120, // 2 segundos de duração
                this.camera.beta,
                this.isometricAngles.beta, // Use fixed isometric angle
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                new BABYLON.CubicEase()
            );

        } catch (error) {
            console.error('❌ Erro ao centralizar câmera na Prefeitura Municipal:', error);
        }
    }

    // ===== ISOMETRIC RTS-STYLE CAMERA CONTROLS UPDATE =====
    updateCameraControls(deltaTime) {
        if (!this.camera || !this.cameraControls.enabled) return;

        // Ensure camera maintains isometric angles
        this.enforceIsometricAngles();

        // Handle WASD/Arrow key movement
        this.updateIsometricKeyboardMovement(deltaTime);

        // Handle edge scrolling
        this.updateEdgeScrolling(deltaTime);
    }

    /**
     * Enforces fixed isometric camera angles
     */
    enforceIsometricAngles() {
        // Continuously enforce isometric angles to prevent drift
        if (Math.abs(this.camera.alpha - this.isometricAngles.alpha) > 0.01 ||
            Math.abs(this.camera.beta - this.isometricAngles.beta) > 0.01) {
            this.camera.alpha = this.isometricAngles.alpha;
            this.camera.beta = this.isometricAngles.beta;
        }
    }

    /**
     * Updates camera movement based on WASD/Arrow keys for isometric view
     * @param {number} deltaTime - Frame delta time
     */
    updateIsometricKeyboardMovement(deltaTime) {
        const keys = this.cameraControls.keys;
        const speed = this.cameraControls.speed * (deltaTime / 16.67); // Normalize to 60 FPS

        // Check if any movement key is pressed
        const isMoving = keys.W || keys.A || keys.S || keys.D;
        if (!isMoving && !this.isometricCameraState.edgeScrolling.isScrolling) return;

        try {
            let deltaX = 0;
            let deltaZ = 0;

            // Calculate movement in isometric space
            if (keys.W) { // Forward (North-West in isometric)
                deltaX -= speed * 0.707; // cos(45°)
                deltaZ -= speed * 0.707; // sin(45°)
            }
            if (keys.S) { // Backward (South-East in isometric)
                deltaX += speed * 0.707;
                deltaZ += speed * 0.707;
            }
            if (keys.A) { // Left (South-West in isometric)
                deltaX -= speed * 0.707;
                deltaZ += speed * 0.707;
            }
            if (keys.D) { // Right (North-East in isometric)
                deltaX += speed * 0.707;
                deltaZ -= speed * 0.707;
            }

            // Apply movement if any
            if (deltaX !== 0 || deltaZ !== 0) {
                this.moveIsometricCamera(deltaX, deltaZ);
            }

        } catch (error) {
            console.error('❌ Error in isometric keyboard movement:', error);
        }
    }

    /**
     * Updates edge scrolling movement
     * @param {number} deltaTime - Frame delta time
     */
    updateEdgeScrolling(deltaTime) {
        // Edge scrolling is handled in real-time by handleEdgeScrolling
        // This method can be used for additional edge scrolling logic if needed
    }

    // ===== SISTEMA DE RELÓGIO =====
    initializeGameClock() {
        // Usar data/hora real atual como ponto de partida
        this.gameStartTime = new Date();
        this.gameClockTime = new Date(this.gameStartTime);

        // Calcular ciclo dia/noite baseado na hora
        const hours = this.gameClockTime.getHours();
        const minutes = this.gameClockTime.getMinutes();
        this.dayNightCycle = (hours + minutes / 60) / 24;

        console.log(`🕐 Relógio do jogo iniciado: ${this.formatGameTime()}`);
        this.updateDayNightLighting();
    }

    updateGameClock(deltaTime) {
        if (this.gameState !== 'playing') return;

        // Calcular multiplicador de tempo baseado na velocidade
        let timeMultiplier;
        switch (this.timeScale) {
            case 1:
                // 1x Speed: 1 segundo real = 1 minuto no jogo (60:1 ratio)
                timeMultiplier = 60;
                break;
            case 2:
                // 2x Speed: 10 game minutes = 1 real second (600:1 ratio)
                timeMultiplier = 600;
                break;
            case 3:
                // 3x Speed: 1 game hour = 1 real second (3600:1 ratio)
                timeMultiplier = 3600;
                break;
            default:
                // Fallback para velocidades customizadas
                timeMultiplier = 60 * this.timeScale;
                break;
        }

        // Avançar tempo do jogo com o multiplicador correto
        const gameTimeAdvance = deltaTime * timeMultiplier;
        this.gameClockTime.setTime(this.gameClockTime.getTime() + gameTimeAdvance);

        // Atualizar ciclo dia/noite
        const hours = this.gameClockTime.getHours();
        const minutes = this.gameClockTime.getMinutes();
        this.dayNightCycle = (hours + minutes / 60) / 24;

        // Atualizar iluminação a cada mudança significativa
        if (Math.floor(this.gameTime / 1000) !== Math.floor((this.gameTime + deltaTime) / 1000)) {
            this.updateDayNightLighting();
        }
    }

    formatGameTime() {
        if (!this.gameClockTime) return '00/00/0000 00:00';

        const day = String(this.gameClockTime.getDate()).padStart(2, '0');
        const month = String(this.gameClockTime.getMonth() + 1).padStart(2, '0');
        const year = this.gameClockTime.getFullYear();
        const hours = String(this.gameClockTime.getHours()).padStart(2, '0');
        const minutes = String(this.gameClockTime.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    updateDayNightLighting() {
        if (!this.scene) return;

        // Determinar estado atual do dia/noite
        const currentState = this.getDayNightState();

        // Verificar se houve transição
        if (this.lastDayNightState && this.lastDayNightState !== currentState) {
            this.handleDayNightTransition(this.lastDayNightState, currentState);
        }

        this.lastDayNightState = currentState;

        // Encontrar luz ambiente
        const ambientLight = this.scene.getLightByName('ambientLight');
        if (ambientLight) {
            // Calcular intensidade baseada no ciclo dia/noite
            let intensity = 0.6; // Intensidade base

            if (this.dayNightCycle >= 0.25 && this.dayNightCycle <= 0.75) {
                // Dia (6h às 18h)
                intensity = 0.8;
            } else if (this.dayNightCycle >= 0.75 || this.dayNightCycle <= 0.25) {
                // Noite (18h às 6h)
                intensity = 0.3;
            }

            ambientLight.intensity = intensity;

            // Mudar cor da luz
            if (this.dayNightCycle >= 0.25 && this.dayNightCycle <= 0.75) {
                // Luz do dia - amarelo claro
                ambientLight.diffuse = new BABYLON.Color3(1, 1, 0.9);
            } else {
                // Luz da noite - azul escuro
                ambientLight.diffuse = new BABYLON.Color3(0.7, 0.8, 1);
            }
        }

        // Atualizar cor de fundo do céu
        if (this.scene) {
            if (this.dayNightCycle >= 0.25 && this.dayNightCycle <= 0.75) {
                // Céu diurno
                this.scene.clearColor = new BABYLON.Color3(0.5, 0.8, 1.0);
            } else {
                // Céu noturno
                this.scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.3);
            }
        }
    }

    getDayNightState() {
        const hours = this.gameClockTime.getHours();

        if (hours >= 6 && hours < 18) {
            return 'day';
        } else {
            return 'night';
        }
    }

    handleDayNightTransition(fromState, toState) {
        console.log(`🌅 Transição dia/noite: ${fromState} -> ${toState}`);

        // Reproduzir som de transição apropriado
        if (typeof AudioManager !== 'undefined') {
            if (toState === 'day') {
                // Transição para o dia (manhã)
                AudioManager.playDayNightTransition('morning');
            } else if (toState === 'night') {
                // Transição para a noite
                AudioManager.playDayNightTransition('night');
            }
        }

        // Mostrar notificação da transição
        if (this.uiManager) {
            const transitionMessage = toState === 'day' ?
                '🌅 Amanheceu! Um novo dia começou.' :
                '🌙 Anoiteceu! A cidade se prepara para descansar.';

            this.uiManager.showNotification(transitionMessage, 'info');
        }
    }

    // ===== SISTEMA DE HOVER/TOOLTIP =====
    setupHoverSystem() {
        if (!this.scene || !this.canvas) return;

        // ===== MOUSE PERFORMANCE FIX: Implementar throttling para melhorar performance =====
        this.mouseHoverThrottle = {
            lastCall: 0,
            delay: 16, // ~60 FPS (16ms entre chamadas)
            timeoutId: null
        };

        // Mouse hover is now handled by the consolidated mouse move handler in setupIsometricCameraControls()
        // This eliminates duplicate mousemove listeners and improves performance

        // Note: mouseleave is already handled in setupIsometricCameraControls() with consolidated cleanup

        // Adicionar listener de clique para construção
        this.canvas.addEventListener('click', (event) => {
            this.handleMouseClick(event);
        });

        // Adicionar listener de ESC para cancelar preview e limpar seleção
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (this.buildingSystem && this.buildingSystem.previewMode) {
                    this.cancelBuildingPreview();
                } else if (this.selectedBuilding) {
                    this.deselectBuilding();
                }
            }
        });
    }

    // ===== MOUSE PERFORMANCE FIX: Método throttled para hover =====
    handleMouseHoverThrottled(event) {
        const now = Date.now();
        const timeSinceLastCall = now - this.mouseHoverThrottle.lastCall;

        if (timeSinceLastCall >= this.mouseHoverThrottle.delay) {
            // Executar imediatamente se passou tempo suficiente
            this.mouseHoverThrottle.lastCall = now;
            this.handleMouseHover(event);
        } else {
            // Agendar execução para o futuro se ainda não agendado
            if (!this.mouseHoverThrottle.timeoutId) {
                const remainingTime = this.mouseHoverThrottle.delay - timeSinceLastCall;
                this.mouseHoverThrottle.timeoutId = setTimeout(() => {
                    this.mouseHoverThrottle.lastCall = Date.now();
                    this.mouseHoverThrottle.timeoutId = null;
                    this.handleMouseHover(event);
                }, remainingTime);
            }
        }
    }

    handleMouseHover(event) {
        if (!this.gridManager || !this.scene) return;

        try {
            // ===== MOUSE PERFORMANCE FIX: Otimizar operações custosas =====

            // Obter posição do mouse no canvas
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // ===== PERFORMANCE OPTIMIZATION: Usar pick mais eficiente =====
            // Usar pickWithRay apenas quando necessário, senão usar aproximação matemática
            let gridPos = null;

            if (this.buildingSystem && this.buildingSystem.previewMode) {
                // Durante preview, usar pick completo para precisão
                const pickInfo = this.scene.pick(x, y);
                if (pickInfo.hit && pickInfo.pickedPoint) {
                    gridPos = this.gridManager.worldToGrid(pickInfo.pickedPoint);
                }
            } else {
                // Para hover normal, usar aproximação mais rápida baseada na câmera
                gridPos = this.approximateGridPosition(x, y);
            }

            if (gridPos) {
                // Forçar alinhamento ao grid - garantir coordenadas inteiras
                gridPos.x = Math.floor(gridPos.x);
                gridPos.z = Math.floor(gridPos.z);

                // Verificar se está dentro dos limites do grid
                if (gridPos.x < 0 || gridPos.x >= this.gridManager.gridSize ||
                    gridPos.z < 0 || gridPos.z >= this.gridManager.gridSize) {
                    return; // Sair se fora dos limites
                }

                // Atualizar preview se estiver ativo
                if (this.buildingSystem && this.buildingSystem.previewMode) {
                    this.buildingSystem.updatePreview(gridPos.x, gridPos.z);
                }

                // ===== PERFORMANCE OPTIMIZATION: Só atualizar se posição mudou =====
                if (!this.lastHoverPosition ||
                    gridPos.x !== this.lastHoverPosition.x ||
                    gridPos.z !== this.lastHoverPosition.z) {

                    this.lastHoverPosition = gridPos;

                    // Usar sistema unificado de informações apenas se não estiver em preview
                    if (!this.buildingSystem || !this.buildingSystem.previewMode) {
                        this.updateHoverInfo(gridPos.x, gridPos.z, event.clientX, event.clientY);
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro no sistema de hover:', error);
        }
    }

    // ===== MOUSE PERFORMANCE FIX: Método de aproximação rápida para posição do grid =====
    approximateGridPosition(screenX, screenY) {
        if (!this.camera || !this.scene) return null;

        try {
            // Usar ray picking mais eficiente apenas no plano do terreno
            const ray = this.scene.createPickingRay(screenX, screenY, BABYLON.Matrix.Identity(), this.camera);

            // Intersecção com plano Y=0 (terreno)
            const planeY = 0;
            if (Math.abs(ray.direction.y) < 0.001) return null; // Ray paralelo ao plano

            const t = (planeY - ray.origin.y) / ray.direction.y;
            if (t < 0) return null; // Intersecção atrás da câmera

            const worldX = ray.origin.x + t * ray.direction.x;
            const worldZ = ray.origin.z + t * ray.direction.z;

            return this.gridManager.worldToGrid({ x: worldX, z: worldZ });
        } catch (error) {
            // Fallback para pick completo se aproximação falhar
            const pickInfo = this.scene.pick(screenX, screenY);
            if (pickInfo.hit && pickInfo.pickedPoint) {
                return this.gridManager.worldToGrid(pickInfo.pickedPoint);
            }
            return null;
        }
    }

    updateHoverInfo(gridX, gridZ, mouseX, mouseY) {
        if (!this.gridManager || !this.buildingSystem) return;

        // Verificar se está dentro dos limites do grid
        if (gridX < 0 || gridX >= this.gridManager.gridSize ||
            gridZ < 0 || gridZ >= this.gridManager.gridSize) {
            this.hideHoverInfo();
            this.hideTerrainInfo();
            // Ocultar todos os labels quando sair do grid
            this.hideAllBuildingLabels();
            return;
        }

        // ===== MOUSE PERFORMANCE FIX: Cache e otimização de operações =====

        // Cache para evitar múltiplas consultas
        const building = this.buildingSystem.getBuildingAt(gridX, gridZ);
        const terrainType = this.gridManager.getTerrainType(gridX, gridZ);
        const isOccupied = this.gridManager.isOccupied(gridX, gridZ);

        // ===== PERFORMANCE OPTIMIZATION: Reduzir operações visuais custosas =====
        // Só atualizar labels e efeitos se realmente necessário
        if (building) {
            // Gerenciar visibilidade dos labels apenas para edifícios
            this.updateBuildingLabelVisibility(gridX, gridZ, building);

            // Aplicar efeitos visuais de hover apenas se mudou de edifício
            if (!this.lastHoveredBuilding || this.lastHoveredBuilding.id !== building.id) {
                this.applyHoverEffects(gridX, gridZ, building);
                this.lastHoveredBuilding = building;
            }
        } else {
            // Limpar cache de edifício anterior
            if (this.lastHoveredBuilding) {
                this.lastHoveredBuilding = null;
                this.applyHoverEffects(gridX, gridZ, null);
            }
        }

        // Criar informações do hover
        let hoverData = {
            position: { x: gridX, z: gridZ },
            mousePosition: { x: mouseX, y: mouseY },
            terrainType: terrainType,
            isOccupied: isOccupied
        };

        if (building) {
            // Determinar status do edifício
            let status = building.active ? 'Ativo' : 'Inativo';
            if (building.hasPowerShortage) {
                status = 'Escassez de Energia';
            }

            // Informações do edifício
            hoverData.building = {
                name: building.config.name,
                type: building.config.category,
                status: status,
                efficiency: Math.round(building.efficiency * 100) + '%',
                waterProduction: building.config.waterProduction || 0,
                waterConsumption: building.config.waterConsumption || 0,
                powerConsumption: building.config.powerConsumption || 0,
                powerGeneration: building.config.powerGeneration || 0,
                pollutionGeneration: building.config.pollutionGeneration || 0,
                maintenanceCost: building.config.maintenanceCost || 0,
                incomeGeneration: building.config.incomeGeneration || 0,
                isRented: building.isRented || false,
                hasPowerShortage: building.hasPowerShortage || false
            };
            this.hideTerrainInfo(); // Esconder info do terreno quando há edifício
        } else {
            // Informações do terreno vazio
            hoverData.empty = {
                buildable: this.gridManager.canPlaceBuilding(gridX, gridZ, 1),
                terrainName: this.getTerrainDisplayName(terrainType)
            };

            // ===== ZERO-ERROR POLICY FIX: Evitar chamada circular =====
            // Mostrar informações do terreno no painel direito se não estiver em modo construção
            if (!this.buildingSystem.previewMode) {
                // Chamar diretamente o UIManager sem recursão
                if (this.uiManager && this.uiManager.showTerrainInfo) {
                    this.uiManager.showTerrainInfo(terrainType, gridX, gridZ, mouseX, mouseY);
                }
            } else {
                this.hideTerrainInfo();
            }
        }

        this.hoverInfo = hoverData;
        this.showHoverTooltip();
    }

    getTerrainDisplayName(terrainType) {
        const terrainNames = {
            'dirt': 'Terra',
            'rock': 'Rocha',
            'water': 'Água',
            'grassland': 'Campo',
            'lowland': 'Planície',
            'hill': 'Colina',
            'forest': 'Floresta',
            'desert': 'Deserto'
        };
        return terrainNames[terrainType] || 'Desconhecido';
    }

    getTerrainDescription(terrainType) {
        const descriptions = {
            'dirt': 'Solo fértil ideal para construção de edifícios residenciais e comerciais.',
            'rock': 'Terreno rochoso resistente, adequado para infraestrutura pesada e fundações.',
            'water': 'Corpo d\'água natural. Essencial para captação e abastecimento da cidade.',
            'grassland': 'Campo verdejante adequado para parques e áreas de lazer.',
            'lowland': 'Planície baixa com boa drenagem, ideal para agricultura urbana.',
            'hill': 'Terreno elevado com boa visibilidade, adequado para torres e antenas.',
            'forest': 'Área florestada que ajuda na purificação do ar e controle da umidade.',
            'desert': 'Terreno árido que requer irrigação especial para desenvolvimento.'
        };
        return descriptions[terrainType] || 'Tipo de terreno não identificado.';
    }

    showHoverTooltip() {
        if (!this.hoverInfo) return;

        // Criar ou atualizar tooltip
        let tooltip = document.getElementById('hover-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'hover-tooltip';
            tooltip.className = 'hover-tooltip';
            document.body.appendChild(tooltip);
        }

        // Gerar conteúdo do tooltip
        let content = `<div class="tooltip-header">Posição: (${this.hoverInfo.position.x}, ${this.hoverInfo.position.z})</div>`;

        if (this.hoverInfo.building) {
            const b = this.hoverInfo.building;
            const statusClass = b.hasPowerShortage ? 'power-shortage' : '';
            content += `
                <div class="tooltip-building">
                    <div class="building-name">${b.name}</div>
                    <div class="building-status ${statusClass}">Status: ${b.status}</div>
                    <div class="building-efficiency">Eficiência: ${b.efficiency}</div>
            `;

            if (b.waterProduction > 0) {
                content += `<div class="building-stat">💧 Produção: ${b.waterProduction}L/s</div>`;
            }
            if (b.waterConsumption > 0) {
                content += `<div class="building-stat">🚰 Consumo: ${b.waterConsumption}L/s</div>`;
            }
            if (b.powerGeneration > 0) {
                content += `<div class="building-stat">⚡ Geração: ${b.powerGeneration} MW</div>`;
            }
            if (b.powerConsumption > 0) {
                content += `<div class="building-stat">🔌 Consumo: ${b.powerConsumption} MW</div>`;
            }
            if (b.pollutionGeneration > 0) {
                content += `<div class="building-stat">🏭 Poluição: +${b.pollutionGeneration}/s</div>`;
            }
            if (b.maintenanceCost > 0) {
                content += `<div class="building-stat">💰 Manutenção: R$ ${b.maintenanceCost}/min</div>`;
            }
            if (b.incomeGeneration > 0) {
                if (b.isRented) {
                    content += `<div class="building-stat rental-income">🏙️ Alugado: R$ ${b.incomeGeneration}/min</div>`;
                } else {
                    content += `<div class="building-stat income-generation">💵 Receita: R$ ${b.incomeGeneration}/min</div>`;
                }
            }

            // Mostrar status de aluguel para edifícios de infraestrutura
            if ((b.waterProduction > 0 || b.powerGeneration > 0) && b.isRented) {
                const rentalIncome = (b.waterProduction * 2) + (b.powerGeneration * 50);
                content += `<div class="building-stat rental-income">🏙️ Aluguel: R$ ${rentalIncome}/min</div>`;
            }
            if (b.hasPowerShortage) {
                content += `<div class="building-stat power-shortage-warning">⚡❌ Energia Insuficiente</div>`;
            }

            content += `</div>`;
        } else if (this.hoverInfo.empty) {
            const e = this.hoverInfo.empty;
            content += `
                <div class="tooltip-terrain">
                    <div class="terrain-type">Terreno: ${e.terrainName}</div>
                    <div class="terrain-buildable">Construível: ${e.buildable ? 'Sim' : 'Não'}</div>
                </div>
            `;
        }

        tooltip.innerHTML = content;

        // Posicionar tooltip
        const mouseX = this.hoverInfo.mousePosition.x;
        const mouseY = this.hoverInfo.mousePosition.y;

        tooltip.style.left = (mouseX + 15) + 'px';
        tooltip.style.top = (mouseY - 10) + 'px';
        tooltip.style.display = 'block';
    }

    hideHoverInfo() {
        this.hoverInfo = null;
        const tooltip = document.getElementById('hover-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }

        // Limpar efeitos visuais de hover
        this.clearHoverEffects();
    }

    // ===== SISTEMA DE EFEITOS VISUAIS =====
    applyHoverEffects(gridX, gridZ, building) {
        // Limpar efeitos anteriores
        this.clearHoverEffects();

        if (building) {
            // Efeito de hover para edifício
            this.addBuildingHoverEffect(building);
        } else {
            // ===== HOVER MARKERS FOR ALL INTERACTIVE OBJECTS: Detectar tipo de objeto =====
            const terrainType = this.gridManager.getTerrainType(gridX, gridZ);

            if (terrainType === 'water') {
                // Efeito especial para água
                this.addWaterHoverEffect(gridX, gridZ);
            } else {
                // Efeito padrão para terreno
                this.addTerrainHoverEffect(gridX, gridZ);
            }

            // Verificar se há decorações ou outros objetos interativos
            this.addDecorationHoverEffect(gridX, gridZ);
        }
    }

    addBuildingHoverEffect(building) {
        if (!building.mesh || building === this.selectedBuilding) return;

        try {
            // Criar outline/glow effect para o edifício
            const hoverEffect = BABYLON.MeshBuilder.CreateBox(`hoverEffect_${building.id}`, {
                width: building.config.size * this.gridManager.cellSize + 0.2,
                height: 0.1,
                depth: building.config.size * this.gridManager.cellSize + 0.2
            }, this.scene);

            const worldPos = this.gridManager.gridToWorld(building.gridX, building.gridZ);
            hoverEffect.position.x = worldPos.x;
            hoverEffect.position.z = worldPos.z;
            hoverEffect.position.y = worldPos.y + 0.01;

            // Material com glow azul
            const material = new BABYLON.StandardMaterial(`hoverEffectMat_${building.id}`, this.scene);
            material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1.0); // Azul
            material.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
            material.alpha = 0.4;

            hoverEffect.material = material;

            // Armazenar referência
            this.currentHoverEffect = hoverEffect;

            // Animação de pulsação
            this.animateHoverEffect(hoverEffect);

        } catch (error) {
            console.warn('⚠️ Erro ao criar efeito de hover para edifício:', error);
        }
    }

    addTerrainHoverEffect(gridX, gridZ) {
        // Usar o sistema de highlight do GridManager
        const color = new BABYLON.Color3(0.8, 0.8, 1.0); // Azul claro
        this.gridManager.highlightCell(gridX, gridZ, color, 'hover');
    }

    // ===== HOVER MARKERS FOR ALL INTERACTIVE OBJECTS: Novos métodos de hover =====
    addWaterHoverEffect(gridX, gridZ) {
        try {
            // Criar efeito especial para água com ondulação
            const worldPos = this.gridManager.gridToWorld(gridX, gridZ);

            const waterHoverEffect = BABYLON.MeshBuilder.CreateGround(`waterHover_${gridX}_${gridZ}`, {
                width: this.gridManager.cellSize * 0.9,
                height: this.gridManager.cellSize * 0.9
            }, this.scene);

            waterHoverEffect.position.x = worldPos.x;
            waterHoverEffect.position.z = worldPos.z;
            waterHoverEffect.position.y = 0.02; // Ligeiramente acima da água

            // Material com efeito aquático
            const material = new BABYLON.StandardMaterial(`waterHoverMat_${gridX}_${gridZ}`, this.scene);
            material.diffuseColor = new BABYLON.Color3(0.2, 0.8, 1.0); // Azul água
            material.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.6);
            material.alpha = 0.6;
            material.hasAlpha = true;

            waterHoverEffect.material = material;

            // Armazenar referência
            this.currentHoverEffect = waterHoverEffect;

            // Animação de ondulação
            this.animateWaterHoverEffect(waterHoverEffect);

        } catch (error) {
            console.warn('⚠️ Erro ao criar efeito de hover para água:', error);
            // Fallback para highlight normal
            this.gridManager.highlightCell(gridX, gridZ, new BABYLON.Color3(0.2, 0.8, 1.0), 'water_hover');
        }
    }

    addDecorationHoverEffect(gridX, gridZ) {
        // Verificar se há decorações nesta célula
        if (!this.gridManager.decorationMeshes) return;

        const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
        const tolerance = this.gridManager.cellSize * 0.5;

        // Encontrar decorações próximas
        const nearbyDecorations = this.gridManager.decorationMeshes.filter(decoration => {
            if (!decoration || decoration.isDisposed()) return false;

            const distance = BABYLON.Vector3.Distance(decoration.position, worldPos);
            return distance < tolerance;
        });

        if (nearbyDecorations.length > 0) {
            // Adicionar efeito sutil para decorações
            nearbyDecorations.forEach(decoration => {
                this.addDecorationGlow(decoration);
            });
        }
    }

    addDecorationGlow(decoration) {
        try {
            // Criar glow sutil ao redor da decoração
            const glowEffect = BABYLON.MeshBuilder.CreateSphere(`decorationGlow_${decoration.name}`, {
                diameter: 0.8
            }, this.scene);

            glowEffect.position = decoration.position.clone();
            glowEffect.position.y += 0.2;

            // Material com glow verde suave
            const material = new BABYLON.StandardMaterial(`decorationGlowMat_${decoration.name}`, this.scene);
            material.diffuseColor = new BABYLON.Color3(0.4, 1.0, 0.4); // Verde suave
            material.emissiveColor = new BABYLON.Color3(0.2, 0.5, 0.2);
            material.alpha = 0.3;
            material.hasAlpha = true;

            glowEffect.material = material;

            // Armazenar na lista de efeitos para limpeza
            if (!this.decorationHoverEffects) {
                this.decorationHoverEffects = [];
            }
            this.decorationHoverEffects.push(glowEffect);

            // Animação de pulsação suave
            this.animateDecorationGlow(glowEffect);

        } catch (error) {
            console.warn('⚠️ Erro ao criar glow para decoração:', error);
        }
    }

    clearHoverEffects() {
        // Limpar efeito de hover de edifício/água/terreno
        if (this.currentHoverEffect) {
            try {
                if (!this.currentHoverEffect.isDisposed()) {
                    this.currentHoverEffect.dispose();
                }
            } catch (error) {
                console.warn('⚠️ Erro ao limpar efeito de hover:', error);
            }
            this.currentHoverEffect = null;
        }

        // ===== HOVER MARKERS FOR ALL INTERACTIVE OBJECTS: Limpar efeitos de decoração =====
        if (this.decorationHoverEffects) {
            this.decorationHoverEffects.forEach(effect => {
                try {
                    if (effect && !effect.isDisposed()) {
                        effect.dispose();
                    }
                } catch (error) {
                    console.warn('⚠️ Erro ao limpar efeito de decoração:', error);
                }
            });
            this.decorationHoverEffects = [];
        }

        // Limpar highlight de terreno
        if (this.gridManager) {
            this.gridManager.clearHighlights();
        }
    }

    animateHoverEffect(effect) {
        if (!effect || effect.isDisposed()) return;

        // Animação de pulsação suave
        const animationKeys = [];
        animationKeys.push({
            frame: 0,
            value: 0.3
        });
        animationKeys.push({
            frame: 20,
            value: 0.5
        });
        animationKeys.push({
            frame: 40,
            value: 0.3
        });

        const alphaAnimation = new BABYLON.Animation(
            "hoverPulse",
            "material.alpha",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );

        alphaAnimation.setKeys(animationKeys);
        effect.animations.push(alphaAnimation);

        this.scene.beginAnimation(effect, 0, 40, true);
    }

    // ===== HOVER MARKERS FOR ALL INTERACTIVE OBJECTS: Animações específicas =====
    animateWaterHoverEffect(effect) {
        if (!effect || effect.isDisposed()) return;

        // Animação de ondulação para água
        const scaleKeys = [];
        scaleKeys.push({
            frame: 0,
            value: new BABYLON.Vector3(1, 1, 1)
        });
        scaleKeys.push({
            frame: 30,
            value: new BABYLON.Vector3(1.1, 1, 1.1)
        });
        scaleKeys.push({
            frame: 60,
            value: new BABYLON.Vector3(1, 1, 1)
        });

        const scaleAnimation = new BABYLON.Animation(
            "waterRipple",
            "scaling",
            30,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );

        scaleAnimation.setKeys(scaleKeys);
        effect.animations.push(scaleAnimation);

        // Animação de alpha também
        const alphaKeys = [];
        alphaKeys.push({
            frame: 0,
            value: 0.4
        });
        alphaKeys.push({
            frame: 30,
            value: 0.7
        });
        alphaKeys.push({
            frame: 60,
            value: 0.4
        });

        const alphaAnimation = new BABYLON.Animation(
            "waterAlpha",
            "material.alpha",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );

        alphaAnimation.setKeys(alphaKeys);
        effect.animations.push(alphaAnimation);

        this.scene.beginAnimation(effect, 0, 60, true);
    }

    animateDecorationGlow(effect) {
        if (!effect || effect.isDisposed()) return;

        // Animação de glow suave para decorações
        const alphaKeys = [];
        alphaKeys.push({
            frame: 0,
            value: 0.2
        });
        alphaKeys.push({
            frame: 25,
            value: 0.4
        });
        alphaKeys.push({
            frame: 50,
            value: 0.2
        });

        const alphaAnimation = new BABYLON.Animation(
            "decorationGlow",
            "material.alpha",
            20,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );

        alphaAnimation.setKeys(alphaKeys);
        effect.animations.push(alphaAnimation);

        this.scene.beginAnimation(effect, 0, 50, true);
    }

    // ===== GERENCIAMENTO DE LABELS DE EDIFÍCIOS =====
    updateBuildingLabelVisibility(gridX, gridZ, hoveredBuilding) {
        if (!this.buildingSystem) return;

        // Ocultar todos os labels primeiro
        this.hideAllBuildingLabels();

        // Mostrar label do edifício sob o mouse (se houver)
        if (hoveredBuilding && hoveredBuilding.mesh) {
            this.buildingSystem.showBuildingLabel(hoveredBuilding.mesh);
        }

        // Mostrar label do edifício selecionado (se diferente do hover)
        if (this.selectedBuilding && this.selectedBuilding !== hoveredBuilding && this.selectedBuilding.mesh) {
            this.buildingSystem.showBuildingLabel(this.selectedBuilding.mesh);
        }
    }

    hideAllBuildingLabels() {
        if (!this.buildingSystem) return;

        this.buildingSystem.buildings.forEach(building => {
            if (building.mesh) {
                this.buildingSystem.hideBuildingLabel(building.mesh);
            }
        });
    }

    showTerrainInfo(terrainType, gridX, gridZ) {
        const detailsPanel = document.getElementById('details-content');
        if (!detailsPanel) return;

        // Verificar se há um painel de recurso aberto no UIManager
        if (this.uiManager && this.uiManager.currentOpenPanel) {
            // Não sobrescrever painéis de recursos ativos
            return;
        }

        const terrainName = this.getTerrainDisplayName(terrainType);
        const terrainDescription = this.getTerrainDescription(terrainType);
        const elevation = this.gridManager.elevationGrid[gridX][gridZ];

        // Obter informações adicionais do terreno
        const buildable = this.gridManager.canPlaceBuilding(gridX, gridZ, 1);
        const waterNearby = this.isNearWater(gridX, gridZ);

        detailsPanel.innerHTML = `
            <div class="terrain-info">
                <h4>🌍 Informações do Terreno</h4>

                <div class="terrain-details">
                    <div class="terrain-type">
                        <span class="terrain-icon">${this.getTerrainIcon(terrainType)}</span>
                        <span class="terrain-name">${terrainName}</span>
                    </div>

                    <div class="terrain-position">
                        <strong>Posição:</strong> (${gridX}, ${gridZ})
                    </div>

                    <div class="terrain-elevation">
                        <strong>Elevação:</strong> ${(elevation * 100).toFixed(1)}%
                    </div>

                    <div class="terrain-buildable">
                        <strong>Construível:</strong>
                        <span class="${buildable ? 'buildable-yes' : 'buildable-no'}">
                            ${buildable ? '✅ Sim' : '❌ Não'}
                        </span>
                    </div>

                    ${waterNearby ? '<div class="terrain-water">💧 Próximo à água</div>' : ''}

                    <div class="terrain-description">
                        <p>${terrainDescription}</p>
                    </div>

                    <div class="terrain-tips">
                        <h5>💡 Dicas de Construção:</h5>
                        ${this.getTerrainTips(terrainType)}
                    </div>
                </div>
            </div>
        `;
    }

    hideTerrainInfo() {
        const detailsPanel = document.getElementById('details-content');
        if (detailsPanel) {
            // Verificar se há um painel de recurso aberto no UIManager
            if (this.uiManager && this.uiManager.currentOpenPanel) {
                // Não limpar painéis de recursos ativos
                return;
            }
            detailsPanel.innerHTML = '<p>Selecione um item para ver detalhes</p>';
        }
    }

    getTerrainIcon(terrainType) {
        const icons = {
            'dirt': '🟫',
            'rock': '🗿',
            'water': '💧',
            'grassland': '🌱',
            'lowland': '🌾',
            'hill': '⛰️',
            'forest': '🌲',
            'desert': '🏜️'
        };
        return icons[terrainType] || '🌍';
    }

    getTerrainTips(terrainType) {
        const tips = {
            'dirt': `
                <ul>
                    <li>Ideal para casas e edifícios residenciais</li>
                    <li>Boa estabilidade para fundações</li>
                    <li>Permite fácil instalação de tubulações</li>
                </ul>
            `,
            'rock': `
                <ul>
                    <li>Excelente para infraestrutura pesada</li>
                    <li>Ideal para estações de tratamento</li>
                    <li>Resistente a erosão e infiltrações</li>
                </ul>
            `,
            'water': `
                <ul>
                    <li>Fonte natural de água para captação</li>
                    <li>Construa bombas d'água nas proximidades</li>
                    <li>Mantenha a qualidade da água limpa</li>
                </ul>
            `,
            'grassland': `
                <ul>
                    <li>Adequado para parques e áreas verdes</li>
                    <li>Boa drenagem natural</li>
                    <li>Ideal para zoneamento residencial</li>
                </ul>
            `
        };
        return tips[terrainType] || '<ul><li>Terreno com características especiais</li></ul>';
    }

    isNearWater(gridX, gridZ, radius = 2) {
        for (let x = gridX - radius; x <= gridX + radius; x++) {
            for (let z = gridZ - radius; z <= gridZ + radius; z++) {
                if (x >= 0 && x < this.gridManager.gridSize &&
                    z >= 0 && z < this.gridManager.gridSize) {
                    if (this.gridManager.getTerrainType(x, z) === 'water') {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getPollutionLevel(gridX, gridZ) {
        // Calcular nível de poluição baseado em edifícios próximos
        let pollutionScore = 0;
        const radius = 3;

        for (let x = gridX - radius; x <= gridX + radius; x++) {
            for (let z = gridZ - radius; z <= gridZ + radius; z++) {
                if (x >= 0 && x < this.gridManager.gridSize &&
                    z >= 0 && z < this.gridManager.gridSize) {
                    const building = this.buildingSystem.getBuildingAt(x, z);
                    if (building) {
                        // Edifícios industriais aumentam poluição
                        if (building.config.category === 'power' || building.config.category === 'treatment') {
                            const distance = Math.abs(x - gridX) + Math.abs(z - gridZ);
                            pollutionScore += Math.max(0, 3 - distance);
                        }
                        // Edifícios de tratamento reduzem poluição
                        if (building.config.id === 'water_treatment' || building.config.id === 'sewage_treatment') {
                            const distance = Math.abs(x - gridX) + Math.abs(z - gridZ);
                            pollutionScore -= Math.max(0, 2 - distance);
                        }
                    }
                }
            }
        }

        // Determinar nível e ícone
        if (pollutionScore <= 0) {
            return { level: 'clean', icon: '🌱', text: 'Limpo' };
        } else if (pollutionScore <= 2) {
            return { level: 'low', icon: '🟡', text: 'Baixa' };
        } else if (pollutionScore <= 5) {
            return { level: 'medium', icon: '🟠', text: 'Média' };
        } else {
            return { level: 'high', icon: '🔴', text: 'Alta' };
        }
    }

    getNearbyResources(gridX, gridZ) {
        const resources = [];
        const radius = 2;

        for (let x = gridX - radius; x <= gridX + radius; x++) {
            for (let z = gridZ - radius; z <= gridZ + radius; z++) {
                if (x >= 0 && x < this.gridManager.gridSize &&
                    z >= 0 && z < this.gridManager.gridSize) {
                    const building = this.buildingSystem.getBuildingAt(x, z);
                    if (building) {
                        if (building.config.category === 'power') {
                            if (!resources.includes('Energia')) resources.push('Energia');
                        }
                        if (building.config.category === 'water') {
                            if (!resources.includes('Água')) resources.push('Água');
                        }
                        if (building.config.category === 'infrastructure') {
                            if (!resources.includes('Infraestrutura')) resources.push('Infraestrutura');
                        }
                    }
                }
            }
        }

        return resources;
    }

    handleMouseClick(event) {
        if (!this.gridManager || !this.scene || !this.buildingSystem) return;

        try {
            // Obter posição do mouse no canvas
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Criar ray para detectar posição no mundo 3D
            const pickInfo = this.scene.pick(x, y);

            if (pickInfo.hit && pickInfo.pickedPoint) {
                // Converter posição do mundo para grid com snap perfeito
                const gridPos = this.gridManager.worldToGrid(pickInfo.pickedPoint);

                // Forçar alinhamento ao grid - garantir coordenadas inteiras
                gridPos.x = Math.floor(gridPos.x);
                gridPos.z = Math.floor(gridPos.z);

                // Se estiver em modo preview, tentar construir
                if (this.buildingSystem.previewMode) {
                    const success = this.buildingSystem.confirmPlacement(gridPos.x, gridPos.z);

                    if (success) {
                        // Construção bem-sucedida, parar preview
                        this.buildingSystem.stopPreviewMode();

                        // Mostrar notificação
                        if (this.uiManager) {
                            this.uiManager.showNotification('Edifício construído com sucesso!', 'success');
                        }
                    } else {
                        // Construção falhou, mostrar erro
                        if (this.uiManager) {
                            this.uiManager.showNotification('Não é possível construir nesta posição!', 'error');
                        }
                    }
                } else {
                    // Modo normal - selecionar edifício se houver
                    this.handleBuildingSelection(gridPos.x, gridPos.z);
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro no clique do mouse:', error);
        }
    }

    startBuildingPreview(buildingTypeId) {
        if (this.buildingSystem) {
            this.buildingSystem.startPreviewMode(buildingTypeId);
            this.hideHoverInfo(); // Esconder tooltip durante preview
        }
    }

    cancelBuildingPreview() {
        if (this.buildingSystem && this.buildingSystem.previewMode) {
            this.buildingSystem.stopPreviewMode();
            console.log('🔍 Preview cancelado');
        }
    }
    
    loadGame(saveData) {
        console.log('📁 Carregando jogo salvo...');

        // Verificar se os sistemas foram inicializados
        if (!this.initialized) {
            console.error('❌ Sistemas não inicializados. Aguarde a inicialização.');
            return false;
        }

        try {
            // Carregar estado do jogo
            this.gameTime = saveData.gameTime || 0;
            this.timeScale = saveData.timeScale || 1;

            // Carregar relógio do jogo
            if (saveData.gameStartTime) {
                this.gameStartTime = new Date(saveData.gameStartTime);
            }
            if (saveData.gameClockTime) {
                this.gameClockTime = new Date(saveData.gameClockTime);
            }
            if (saveData.dayNightCycle !== undefined) {
                this.dayNightCycle = saveData.dayNightCycle;
                this.updateDayNightLighting();
            }

            // Carregar sistemas (verificar se existem)
            if (this.resourceManager && saveData.resources) {
                this.resourceManager.loadData(saveData.resources);
            }

            if (this.buildingSystem && saveData.buildings) {
                this.buildingSystem.loadData(saveData.buildings);
            }

            if (this.questSystem && saveData.quests) {
                this.questSystem.loadData(saveData.quests);
            }

            // Grid já foi inicializado no construtor do GridManager

            if (this.buildingSystem) {
                this.buildingSystem.rebuildFromData();
            }

            // Inicializar UI
            if (this.uiManager) {
                this.uiManager.initialize();
            }

            this.gameState = 'playing';
            this.handleResize();

            console.log('✅ Jogo carregado com sucesso');
            return true;

        } catch (error) {
            console.error('❌ Erro ao carregar jogo:', error);
            alert('Erro ao carregar o jogo salvo. Iniciando novo jogo.');
            return this.startNewGame();
        }
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.uiManager.showPauseOverlay();
            console.log('⏸️ Jogo pausado');
        }
    }
    
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.uiManager.hidePauseOverlay();
            console.log('▶️ Jogo retomado');
        }
    }
    
    setTimeScale(scale) {
        this.timeScale = Math.max(0, Math.min(3, scale));

        // Atualizar UI
        if (this.uiManager) {
            this.uiManager.updateTimeScaleUI(this.timeScale);
        }

        // Mostrar informações detalhadas sobre a nova velocidade
        let speedInfo;
        switch (this.timeScale) {
            case 1:
                speedInfo = '1x (1 min real = 1 hora jogo)';
                break;
            case 2:
                speedInfo = '2x (1 seg real = 10 min jogo)';
                break;
            case 3:
                speedInfo = '3x (1 seg real = 1 hora jogo)';
                break;
            default:
                speedInfo = `${this.timeScale}x (velocidade customizada)`;
                break;
        }

        console.log(`⏱️ Velocidade do jogo alterada: ${speedInfo}`);

        // Mostrar notificação na UI
        if (this.uiManager) {
            this.uiManager.showNotification(`Velocidade: ${speedInfo}`, 'info');
        }
    }
    
    // ===== EVENTOS =====
    setupEventListeners() {
        // Redimensionamento
        window.addEventListener('resize', () => this.handleResize());
        
        // Visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameState === 'playing') {
                this.pauseGame();
            }
        });
    }
    
    handleResize() {
        if (this.engine && this.canvas) {
            // Obter dimensões atuais do container
            const rect = this.canvas.getBoundingClientRect();

            // Atualizar dimensões do canvas
            if (rect.width > 0 && rect.height > 0) {
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
            } else {
                // Fallback para dimensões da janela
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }

            // Notificar o engine sobre a mudança
            this.engine.resize();

            if (this.uiManager) {
                this.uiManager.handleResize();
            }

            console.log(`🔄 Canvas redimensionado: ${this.canvas.width}x${this.canvas.height}`);
        }
    }
    
    handlePointerEvent(pointerInfo) {
        if (this.gameState !== 'playing') return;
        
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                this.handlePointerDown(pointerInfo);
                break;
            case BABYLON.PointerEventTypes.POINTERUP:
                this.handlePointerUp(pointerInfo);
                break;
        }
    }
    
    handlePointerDown(pointerInfo) {
        const pickInfo = pointerInfo.pickInfo;
        
        if (pickInfo.hit) {
            if (this.buildMode && this.currentBuildingType) {
                // Modo construção
                this.buildingSystem.placeBuildingAt(pickInfo.pickedPoint, this.currentBuildingType);
            } else {
                // Seleção de objeto
                this.selectObject(pickInfo.pickedMesh);
            }
        }
    }
    
    handlePointerUp(pointerInfo) {
        // Implementar se necessário
    }
    
    handleKeyboardEvent(kbInfo) {
        const isKeyDown = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
        const isKeyUp = kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP;

        // Controles WASD para movimento da câmera
        if (this.cameraControls.enabled) {
            switch (kbInfo.event.code) {
                case 'KeyW':
                    this.cameraControls.keys.W = isKeyDown;
                    break;
                case 'KeyA':
                    this.cameraControls.keys.A = isKeyDown;
                    break;
                case 'KeyS':
                    this.cameraControls.keys.S = isKeyDown;
                    break;
                case 'KeyD':
                    this.cameraControls.keys.D = isKeyDown;
                    break;
            }
        }

        // Outros controles apenas no keydown
        if (isKeyDown) {
            switch (kbInfo.event.code) {
                case 'Space':
                    if (this.gameState === 'playing') {
                        this.pauseGame();
                    } else if (this.gameState === 'paused') {
                        this.resumeGame();
                    }
                    break;
                case 'Escape':
                    this.exitBuildMode();
                    break;
                case 'Digit1':
                    this.setTimeScale(1);
                    break;
                case 'Digit2':
                    this.setTimeScale(2);
                    break;
                case 'Digit3':
                    this.setTimeScale(3);
                    break;
            }
        }
    }
    
    // ===== CONSTRUÇÃO =====
    enterBuildMode(buildingType) {
        this.buildMode = true;
        this.currentBuildingType = buildingType;
        this.canvas.style.cursor = 'crosshair';

        // Iniciar modo preview
        this.startBuildingPreview(buildingType);

        console.log(`🏗️ Modo construção com preview: ${buildingType}`);
    }
    
    exitBuildMode() {
        this.buildMode = false;
        this.currentBuildingType = null;
        this.canvas.style.cursor = 'grab';
        this.uiManager.clearBuildingSelection();
        console.log('🏗️ Modo construção desativado');
    }
    
    selectObject(mesh) {
        if (mesh && mesh.metadata && mesh.metadata.building) {
            this.selectedBuilding = mesh.metadata.building;
            this.uiManager.showBuildingDetails(this.selectedBuilding);
            console.log(`🏢 Selecionado: ${this.selectedBuilding.type}`);
        } else {
            this.selectedBuilding = null;
            this.uiManager.clearBuildingDetails();
        }
    }

    // ===== SELEÇÃO DE EDIFÍCIOS =====
    handleBuildingSelection(gridX, gridZ) {
        // Verificar se há um edifício na posição clicada
        const building = this.buildingSystem.getBuildingAt(gridX, gridZ);

        if (building) {
            // Selecionar o edifício
            this.selectBuilding(building);
        } else {
            // Clicou em área vazia - desselecionar edifício e mostrar info do terreno
            this.deselectBuilding();
            this.selectTerrain(gridX, gridZ);
        }
    }

    selectBuilding(building) {
        // ===== ZERO-ERROR POLICY FIX: Validar building e config antes de usar =====
        if (!building) {
            console.warn('⚠️ Tentativa de selecionar edifício nulo/indefinido');
            return;
        }

        if (!building.config) {
            console.warn('⚠️ Edifício sem configuração válida:', building);
            return;
        }

        // Limpar seleção anterior
        this.clearBuildingSelection();

        // Definir nova seleção
        this.selectedBuilding = building;

        // Adicionar indicador visual de seleção
        this.addSelectionIndicator(building);

        // Atualizar painel de informações usando sistema unificado
        this.refreshInfoPanel();

        console.log(`🏢 Edifício selecionado: ${building.config.name}`);
    }

    deselectBuilding() {
        if (this.selectedBuilding) {
            // ===== ZERO-ERROR POLICY FIX: Validar config antes de acessar propriedades =====
            const buildingName = (this.selectedBuilding.config && this.selectedBuilding.config.name)
                ? this.selectedBuilding.config.name
                : 'Edifício Desconhecido';
            console.log(`🏢 Edifício desselecionado: ${buildingName}`);
        }

        // Limpar seleção de edifício
        this.clearBuildingSelection();

        // Limpar seleção de terreno
        this.clearTerrainSelection();

        // Atualizar painel usando sistema unificado
        this.refreshInfoPanel();
    }

    selectTerrain(gridX, gridZ) {
        // Garantir que não há edifício selecionado
        this.deselectBuilding();

        // Adicionar indicador visual de seleção de terreno
        this.addTerrainSelectionIndicator(gridX, gridZ);

        // Mostrar informações detalhadas do terreno no painel lateral
        this.showDetailedTerrainInfo(gridX, gridZ);

        console.log(`🌍 Terreno selecionado: (${gridX}, ${gridZ})`);
    }

    addTerrainSelectionIndicator(gridX, gridZ) {
        // Limpar indicador anterior
        this.clearTerrainSelection();

        try {
            // Criar indicador de seleção para terreno
            const selectionIndicator = BABYLON.MeshBuilder.CreateBox(`terrainSelection`, {
                width: this.gridManager.cellSize * 0.9,
                height: 0.08,
                depth: this.gridManager.cellSize * 0.9
            }, this.scene);

            const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
            selectionIndicator.position.x = worldPos.x;
            selectionIndicator.position.z = worldPos.z;
            selectionIndicator.position.y = worldPos.y + 0.03;

            // Material do indicador de terreno
            const material = new BABYLON.StandardMaterial(`terrainSelectionMat`, this.scene);
            material.diffuseColor = new BABYLON.Color3(0, 1, 0.5); // Verde-azulado
            material.emissiveColor = new BABYLON.Color3(0, 0.3, 0.15);
            material.alpha = 0.6;

            selectionIndicator.material = material;

            // Armazenar referência
            this.currentTerrainSelection = selectionIndicator;

            // Animação de pulsação
            this.animateTerrainSelection(selectionIndicator);

        } catch (error) {
            console.warn('⚠️ Erro ao criar indicador de seleção de terreno:', error);
        }
    }

    clearTerrainSelection() {
        if (this.currentTerrainSelection) {
            try {
                if (!this.currentTerrainSelection.isDisposed()) {
                    this.currentTerrainSelection.dispose();
                }
            } catch (error) {
                console.warn('⚠️ Erro ao limpar seleção de terreno:', error);
            }
            this.currentTerrainSelection = null;
        }
    }

    animateTerrainSelection(indicator) {
        if (!indicator || indicator.isDisposed()) return;

        // Animação de pulsação suave
        const animationKeys = [];
        animationKeys.push({
            frame: 0,
            value: 0.4
        });
        animationKeys.push({
            frame: 40,
            value: 0.8
        });
        animationKeys.push({
            frame: 80,
            value: 0.4
        });

        const alphaAnimation = new BABYLON.Animation(
            "terrainSelectionPulse",
            "material.alpha",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );

        alphaAnimation.setKeys(animationKeys);
        indicator.animations.push(alphaAnimation);

        this.scene.beginAnimation(indicator, 0, 80, true);
    }

    showDetailedTerrainInfo(gridX, gridZ) {
        const detailsPanel = document.getElementById('details-content');
        if (!detailsPanel) return;

        const terrainType = this.gridManager.getTerrainType(gridX, gridZ);
        const terrainName = this.getTerrainDisplayName(terrainType);
        const terrainDescription = this.getTerrainDescription(terrainType);
        const elevation = this.gridManager.elevationGrid[gridX] && this.gridManager.elevationGrid[gridX][gridZ] ?
                         this.gridManager.elevationGrid[gridX][gridZ] : 0;

        // Obter informações adicionais do terreno
        const buildable = this.gridManager.canPlaceBuilding(gridX, gridZ, 1);
        const waterNearby = this.isNearWater(gridX, gridZ);
        const pollutionLevel = this.getPollutionLevel(gridX, gridZ);
        const resourcesNearby = this.getNearbyResources(gridX, gridZ);

        detailsPanel.innerHTML = `
            <div class="terrain-selection-info">
                <h3>🌍 Informações do Terreno</h3>

                <div class="terrain-header">
                    <div class="terrain-type-display">
                        <span class="terrain-icon-large">${this.getTerrainIcon(terrainType)}</span>
                        <div class="terrain-name-large">${terrainName}</div>
                    </div>
                </div>

                <div class="terrain-details-grid">
                    <div class="detail-item">
                        <span class="detail-label">📍 Posição:</span>
                        <span class="detail-value">(${gridX}, ${gridZ})</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">📏 Elevação:</span>
                        <span class="detail-value">${(elevation * 100).toFixed(1)}%</span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">🏗️ Construível:</span>
                        <span class="detail-value ${buildable ? 'buildable-yes' : 'buildable-no'}">
                            ${buildable ? '✅ Sim' : '❌ Não'}
                        </span>
                    </div>

                    <div class="detail-item">
                        <span class="detail-label">🏭 Poluição:</span>
                        <span class="detail-value pollution-level-${pollutionLevel.level}">
                            ${pollutionLevel.icon} ${pollutionLevel.text}
                        </span>
                    </div>

                    ${waterNearby ? `
                    <div class="detail-item">
                        <span class="detail-label">💧 Água:</span>
                        <span class="detail-value">Próximo à fonte de água</span>
                    </div>
                    ` : ''}

                    ${resourcesNearby.length > 0 ? `
                    <div class="detail-item">
                        <span class="detail-label">⚡ Recursos:</span>
                        <span class="detail-value">${resourcesNearby.join(', ')}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="terrain-description-section">
                    <h4>📖 Descrição</h4>
                    <p>${terrainDescription}</p>
                </div>

                <div class="terrain-tips-section">
                    <h4>💡 Dicas de Construção</h4>
                    ${this.getTerrainTips(terrainType)}
                </div>

                <div class="terrain-actions">
                    <button class="terrain-action-btn" onclick="gameManager.showBuildingOptions('${terrainType}', ${gridX}, ${gridZ})">
                        🏗️ Ver Construções Recomendadas
                    </button>
                </div>
            </div>
        `;
    }

    clearBuildingSelection() {
        if (this.selectedBuilding) {
            // Remover indicador visual
            this.removeSelectionIndicator(this.selectedBuilding);
            this.selectedBuilding = null;
        }
    }

    // Método para limpar todas as seleções (usado em reset/dispose)
    clearAllSelections() {
        // Limpar seleção atual
        this.clearBuildingSelection();

        // Limpar qualquer indicador órfão que possa ter ficado
        if (this.scene && this.buildingSystem) {
            this.buildingSystem.buildings.forEach(building => {
                if (building.mesh && building.mesh.selectionIndicator) {
                    try {
                        this.removeSelectionIndicator(building);
                    } catch (error) {
                        console.warn('⚠️ Erro ao limpar indicador órfão:', error);
                    }
                }
            });
        }
    }

    addSelectionIndicator(building) {
        if (!building.mesh) return;

        // ===== ZERO-ERROR POLICY FIX: Validar building e config antes de usar =====
        if (!building.config) {
            console.warn('⚠️ Tentativa de adicionar indicador para edifício sem configuração:', building);
            return;
        }

        try {
            // ===== STANDARDIZED SELECTION INDICATOR SYSTEM =====
            const selectionIndicator = this.createStandardizedSelectionIndicator(building);

            if (selectionIndicator) {
                // Armazenar referência
                building.mesh.selectionIndicator = selectionIndicator;

                // Animação de pulsação
                this.animateSelectionIndicator(selectionIndicator);
            }

        } catch (error) {
            console.error('❌ Erro ao criar indicador de seleção:', error);
        }
    }

    /**
     * Creates a standardized selection indicator that properly aligns with building footprint
     * @param {Object} building - The building object
     * @returns {BABYLON.Mesh} - The selection indicator mesh
     */
    createStandardizedSelectionIndicator(building) {
        const buildingMesh = building.mesh;
        const boundingBox = buildingMesh.getBoundingInfo().boundingBox;

        // Calculate indicator size based on actual building footprint
        const buildingWidth = Math.abs(boundingBox.maximum.x - boundingBox.minimum.x);
        const buildingDepth = Math.abs(boundingBox.maximum.z - boundingBox.minimum.z);
        const averageSize = (buildingWidth + buildingDepth) / 2;

        // Create selection ring that matches building footprint
        const selectionRing = BABYLON.MeshBuilder.CreateTorus(`selection_${building.id}`, {
            diameter: averageSize * 1.3, // Slightly larger than building
            thickness: 0.15,
            tessellation: 24
        }, this.scene);

        // Position exactly at building center
        selectionRing.position.x = buildingMesh.position.x;
        selectionRing.position.z = buildingMesh.position.z;
        selectionRing.position.y = 0.08; // Slightly above ground

        // Standardized selection material
        const selectionMaterial = new BABYLON.StandardMaterial(`selectionMat_${building.id}`, this.scene);
        selectionMaterial.diffuseColor = new BABYLON.Color3(1, 0.8, 0); // Golden yellow
        selectionMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.3, 0);
        selectionMaterial.alpha = 0.9;
        selectionMaterial.backFaceCulling = false;

        selectionRing.material = selectionMaterial;

        return selectionRing;
    }

    removeSelectionIndicator(building) {
        if (building.mesh && building.mesh.selectionIndicator) {
            try {
                const indicator = building.mesh.selectionIndicator;

                // Parar todas as animações do indicador
                if (this.scene) {
                    this.scene.stopAnimation(indicator);
                }

                // Limpar animações do mesh
                if (indicator.animations && indicator.animations.length > 0) {
                    indicator.animations = [];
                }

                // Verificar se o mesh ainda existe e não foi disposto
                if (!indicator.isDisposed()) {
                    // Limpar material primeiro
                    if (indicator.material) {
                        indicator.material.dispose();
                        indicator.material = null;
                    }

                    // Remover do scene graph
                    if (indicator.parent) {
                        indicator.parent = null;
                    }

                    // Dispor o mesh
                    indicator.dispose();
                }

                // Limpar referência
                building.mesh.selectionIndicator = null;

                // ===== ZERO-ERROR POLICY FIX: Validar config antes de acessar propriedades =====
                const buildingName = (building.config && building.config.name)
                    ? building.config.name
                    : 'Edifício Desconhecido';
                console.log(`🗑️ Indicador de seleção removido para ${buildingName}`);

            } catch (error) {
                console.error('❌ Erro ao remover indicador de seleção:', error);
                // Forçar limpeza da referência mesmo em caso de erro
                building.mesh.selectionIndicator = null;
            }
        }
    }

    animateSelectionIndicator(indicator) {
        // Animação de pulsação suave
        const animationKeys = [];
        animationKeys.push({
            frame: 0,
            value: 0.8
        });
        animationKeys.push({
            frame: 30,
            value: 1.0
        });
        animationKeys.push({
            frame: 60,
            value: 0.8
        });

        const alphaAnimation = new BABYLON.Animation(
            "selectionPulse",
            "material.alpha",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );

        alphaAnimation.setKeys(animationKeys);
        indicator.animations.push(alphaAnimation);

        this.scene.beginAnimation(indicator, 0, 60, true);
    }

    updateSelectionInfo(building) {
        // Atualizar painel lateral com informações do edifício selecionado
        if (this.uiManager) {
            this.uiManager.showBuildingSelectionInfo(building);
        }
    }

    clearSelectionInfo() {
        // Limpar painel lateral
        if (this.uiManager) {
            this.uiManager.clearBuildingSelectionInfo();
        }
    }

    // ===== SISTEMA UNIFICADO DE INFORMAÇÕES =====
    updateInfoPanel(gridX, gridZ, mouseX, mouseY, forceUpdate = false) {
        // Sistema de prioridades para exibição de informações:
        // 1. Edifício selecionado (mais alta prioridade)
        // 2. Hover sobre edifício (média prioridade)
        // 3. Informações de terreno (baixa prioridade)

        // Se há um edifício selecionado, manter suas informações
        if (this.selectedBuilding && !forceUpdate) {
            return; // Não atualizar se há seleção ativa
        }

        // Verificar se há edifício na posição do hover
        const hoveredBuilding = this.buildingSystem.getBuildingAt(gridX, gridZ);

        if (hoveredBuilding) {
            // Mostrar informações do edifício em hover (apenas se não há seleção)
            if (!this.selectedBuilding) {
                this.showHoverBuildingInfo(hoveredBuilding, mouseX, mouseY);
            }
        } else {
            // Mostrar informações de terreno (apenas se não há seleção)
            if (!this.selectedBuilding) {
                this.showTerrainInfo(gridX, gridZ, mouseX, mouseY);
            }
        }
    }

    showHoverBuildingInfo(building, mouseX, mouseY) {
        // Mostrar tooltip de hover para edifício (não painel lateral)
        if (this.uiManager) {
            this.uiManager.showBuildingHoverTooltip(building, mouseX, mouseY);
        }
    }



    // Método para forçar atualização das informações (usado quando seleção muda)
    refreshInfoPanel() {
        if (this.selectedBuilding) {
            this.updateSelectionInfo(this.selectedBuilding);
        } else {
            // Se não há seleção, limpar painel
            this.clearSelectionInfo();
        }
    }
    
    // ===== SAVE/LOAD =====
    autoSave() {
        if (this.gameState === 'playing') {
            const saveData = this.getSaveData();
            this.saveSystem.autoSave(saveData);
            console.log('💾 Auto-save realizado');
        }
    }
    
    saveGame() {
        const saveData = this.getSaveData();
        this.saveSystem.saveGame(saveData);
        this.uiManager.showNotification('Jogo salvo com sucesso!', 'success');
        console.log('💾 Jogo salvo manualmente');
    }
    
    getSaveData() {
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            gameTime: this.gameTime,
            timeScale: this.timeScale,
            gameStartTime: this.gameStartTime?.getTime(),
            gameClockTime: this.gameClockTime?.getTime(),
            dayNightCycle: this.dayNightCycle,
            resources: this.resourceManager.getSaveData(),
            buildings: this.buildingSystem.getSaveData(),
            quests: this.questSystem.getSaveData(),
            events: this.eventSystem.getSaveData()
        };
    }
    
    // ===== GETTERS =====
    getGameState() { return this.gameState; }
    getGameTime() { return this.gameTime; }
    getCurrentFPS() { return this.currentFPS; }
    getResourceManager() { return this.resourceManager; }
    getBuildingSystem() { return this.buildingSystem; }
    getQuestSystem() { return this.questSystem; }
    
    // ===== CLEANUP =====
    dispose() {
        if (this.engine) {
            this.engine.dispose();
        }
        console.log('🗑️ GameManager disposed');
    }

    // ===== SISTEMA DE RECICLAGEM =====
    recycleBuildingWithConfirmation(buildingId) {
        const building = this.buildingSystem.buildings.get(buildingId);
        if (!building) {
            console.warn(`⚠️ Edifício não encontrado: ${buildingId}`);
            return;
        }

        const recoveredAmount = this.buildingSystem.getRecyclingValue(buildingId);

        // Mostrar diálogo de confirmação
        const confirmed = confirm(
            `♻️ Reciclar ${building.config.name}?\n\n` +
            `Recursos que serão recuperados: R$ ${recoveredAmount}\n` +
            `(70% do custo original: R$ ${building.config.cost})\n\n` +
            `Esta ação não pode ser desfeita. Continuar?`
        );

        if (confirmed) {
            const result = this.buildingSystem.recycleBuilding(buildingId);

            if (result.success) {
                // Limpar seleção se o edifício reciclado estava selecionado
                if (this.selectedBuilding && this.selectedBuilding.id === buildingId) {
                    this.deselectBuilding();
                }

                console.log(`♻️ Reciclagem confirmada: R$ ${result.recoveredAmount} recuperados`);
            } else {
                if (this.uiManager) {
                    this.uiManager.showNotification('❌ Erro ao reciclar edifício', 'error');
                }
            }
        } else {
            console.log('♻️ Reciclagem cancelada pelo usuário');
        }
    }
}

// Exportar para escopo global
window.GameManager = GameManager;
console.log('🎮 GameManager carregado e exportado para window.GameManager');
