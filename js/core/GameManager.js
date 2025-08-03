/**
 * GUARDIÃO DA ÁGUA - GAME MANAGER
 * Classe principal que controla o estado do jogo e coordena todos os sistemas
 */

class GameManager {
    constructor() {
        console.log('🎮 Inicializando GameManager...');

        // Estado do jogo
        this.gameState = 'menu';
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
        this.cityLifeSystem = null;

        // Renderização 3D
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.canvas = null;
        this.shadowGenerator = null;

        // Controles
        this.selectedBuilding = null;
        this.buildMode = false;
        this.currentBuildingType = null;

        // Câmera isométrica
        this.CAMERA_CONSTANTS = null;
        this.isometricAngles = null;
        this.cameraLimits = null;

        // Performance e monitoramento
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 60;
        this.memoryMonitoring = {
            enabled: true,
            lastCheck: 0,
            checkInterval: 5000,
            maxMemoryUsage: 0,
            memoryHistory: []
        };

        // Sistema de relógio
        this.gameStartTime = null;
        this.gameClockTime = null;
        this.dayNightCycle = 0;
        this.lastDayNightState = null;

        // Sistema de hover/seleção
        this.hoverInfo = null;
        this.lastHoverPosition = { x: -1, z: -1 };
        this.currentHoverEffect = null;
        this.currentTerrainSelection = null;
        this.lastHoveredBuilding = null;

        // Circuit breaker para render
        this.renderState = {
            corruptionCount: 0,
            maxCorruptions: 5,
            lastCorruptionTime: 0,
            circuitBreakerActive: false,
            recoveryAttempts: 0,
            maxRecoveryAttempts: 3
        };

        // Auto-save
        this.autoSaveTimer = 0;
        this.initialized = false;
    }

    // ===== VALIDAÇÃO DE DEPENDÊNCIAS =====
    validateDependencies() {
        console.log('🔍 Validando dependências...');

        const requiredClasses = [
            'GridManager', 'ResourceManager', 'BuildingSystem', 'CityLifeSystem',
            'UIManager', 'QuestSystem', 'EventSystem', 'SaveSystem', 'TutorialManager'
        ];

        const missingClasses = requiredClasses.filter(className => 
            typeof window[className] === 'undefined'
        );

        if (missingClasses.length > 0) {
            const error = `❌ Classes não encontradas: ${missingClasses.join(', ')}`;
            console.error(error);
            throw new Error(error);
        }

        if (typeof BABYLON === 'undefined') {
            throw new Error('❌ Babylon.js não carregado');
        }

        if (typeof GAME_CONFIG === 'undefined') {
            throw new Error('❌ GAME_CONFIG não definido');
        }

        console.log('✅ Todas as dependências validadas');
    }

    // ===== INICIALIZAÇÃO =====
    async initializeSystems() {
        try {
            console.log('🔧 Inicializando sistemas...');
            
            await this.initializeRenderer();
            this.validateDependencies();

            // Inicializar sistemas de jogo
            this.gridManager = new GridManager(this.scene);
            this.resourceManager = new ResourceManager(this);
            this.buildingSystem = new BuildingSystem(this.scene, this.gridManager);
            this.cityLifeSystem = new CityLifeSystem(this.scene, this.gridManager, this.buildingSystem);
            this.uiManager = new UIManager(this);
            this.loanManager = new LoanManager(this);
            this.questSystem = new QuestSystem(this);
            this.eventSystem = new EventSystem(this);
            this.saveSystem = new SaveSystem();
            this.tutorialManager = new TutorialManager(this);
            
            this.setupEventListeners();
            this.exposeDebugFunctions();

            console.log('✅ Sistemas inicializados com sucesso');
            this.initialized = true;

        } catch (error) {
            console.error('❌ Erro ao inicializar sistemas:', error);
            this.initialized = false;
            throw error;
        }
    }
    
    async initializeRenderer() {
        console.log('🎨 Inicializando Babylon.js...');

        this.canvas = document.getElementById('game-canvas') || document.getElementById('test-canvas');
        if (!this.canvas) {
            throw new Error('Canvas não encontrado (game-canvas ou test-canvas)');
        }

        this.setupCanvas();

        this.engine = new BABYLON.Engine(this.canvas, true, {
            antialias: GAME_CONFIG.canvas.antialias,
            preserveDrawingBuffer: GAME_CONFIG.canvas.preserveDrawingBuffer
        });

        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color3(0.2, 0.6, 0.9);
        
        this.setupCamera();
        this.setupLighting();
        this.setupControls();
        this.setupHoverSystem();
        this.startRenderLoop();
        
        console.log('✅ Babylon.js inicializado');
    }

    setupCanvas() {
        if (!this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        } else {
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }

        this.canvas.style.display = 'block';
        console.log(`🎨 Canvas configurado: ${this.canvas.width}x${this.canvas.height}`);
    }

    setupCamera() {
        this.CAMERA_CONSTANTS = window.GameConstants?.CAMERA || {
            ISOMETRIC_ALPHA: -Math.PI / 4,
            ISOMETRIC_BETA: Math.PI / 3.5,
            DEFAULT_ZOOM_DISTANCE: 30,
            MIN_ZOOM_DISTANCE: 10,
            MAX_ZOOM_DISTANCE: 60
        };

        if (!this.isValidNumber(this.CAMERA_CONSTANTS.ISOMETRIC_ALPHA) ||
            !this.isValidNumber(this.CAMERA_CONSTANTS.ISOMETRIC_BETA)) {
            console.error('❌ Constantes da câmera inválidas, usando valores seguros');
            this.CAMERA_CONSTANTS.ISOMETRIC_ALPHA = -Math.PI / 4;
            this.CAMERA_CONSTANTS.ISOMETRIC_BETA = Math.PI / 3.5;
        }

        this.camera = new BABYLON.ArcRotateCamera(
            "isometricCamera",
            this.CAMERA_CONSTANTS.ISOMETRIC_ALPHA,
            this.CAMERA_CONSTANTS.ISOMETRIC_BETA,
            this.CAMERA_CONSTANTS.DEFAULT_ZOOM_DISTANCE,
            BABYLON.Vector3.Zero(),
            this.scene
        );

        this.camera.attachControl(this.canvas, false);

        this.isometricAngles = {
            alpha: this.CAMERA_CONSTANTS.ISOMETRIC_ALPHA,
            beta: this.CAMERA_CONSTANTS.ISOMETRIC_BETA
        };

        if (this.isValidCameraAngle(this.isometricAngles.alpha) &&
            this.isValidCameraAngle(this.isometricAngles.beta)) {
            this.camera.alpha = this.isometricAngles.alpha;
            this.camera.beta = this.isometricAngles.beta;
        } else {
            console.error('❌ Ângulos isométricos inválidos, usando valores seguros');
            this.camera.alpha = -Math.PI / 4;
            this.camera.beta = Math.PI / 3.5;
            this.isometricAngles = { alpha: -Math.PI / 4, beta: Math.PI / 3.5 };
        }

        this.camera.lowerRadiusLimit = this.CAMERA_CONSTANTS.MIN_ZOOM_DISTANCE;
        this.camera.upperRadiusLimit = this.CAMERA_CONSTANTS.MAX_ZOOM_DISTANCE;

        this.cameraLimits = this.CAMERA_CONSTANTS.BOUNDS || {
            minX: -30, maxX: 70, minZ: -30, maxZ: 70
        };

        this.camera.inertia = this.CAMERA_CONSTANTS.INERTIA || 0.9;
        this.camera.angularSensibilityX = 0;
        this.camera.angularSensibilityY = 0;
    }
    
    setupLighting() {
        const ambientLight = new BABYLON.HemisphericLight(
            "ambientLight",
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambientLight.intensity = 0.6;
        ambientLight.diffuse = new BABYLON.Color3(1, 1, 0.9);
        
        const sunLight = new BABYLON.DirectionalLight(
            "sunLight",
            new BABYLON.Vector3(-1, -1, -0.5),
            this.scene
        );
        sunLight.intensity = 0.8;
        sunLight.diffuse = new BABYLON.Color3(1, 0.95, 0.8);
        
        const shadowGenerator = new BABYLON.ShadowGenerator(1024, sunLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
        
        this.shadowGenerator = shadowGenerator;
    }
    
    setupControls() {
        if (this.scene && this.scene.onPointerObservable) {
            this.scene.onPointerObservable._observers = [];
            this.scene.onPointerObservable.clear();
            console.log('🚫 Babylon.js pointer observables desabilitados');
        }

        // ===== BUILDING PLACEMENT MOUSE INTERACTION =====
        this.setupBuildingPlacementControls();

        this.canvas.addEventListener('wheel', (event) => {
            try {
                this.handleIsolatedWheel(event);
            } catch (error) {
                console.error('❌ Erro no wheel:', error);
                this.recoverCameraState();
            }
        });

        this.scene.onKeyboardObservable.add((kbInfo) => {
            this.handleKeyboardEvent(kbInfo);
        });

        console.log('🎮 Controles inicializados: ZOOM + Building Placement permitidos');
    }

    // ===== BUILDING PLACEMENT CONTROLS =====
    setupBuildingPlacementControls() {
        // Mouse move for building preview
        this.canvas.addEventListener('mousemove', (event) => {
            this.handleBuildingPreviewMouseMove(event);
        });

        // Mouse click for building placement
        this.canvas.addEventListener('click', (event) => {
            this.handleBuildingPlacementClick(event);
        });

        // Right click to cancel building mode
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            if (this.buildMode) {
                this.exitBuildMode();
                console.log('🚫 Building mode cancelled via right-click');
            }
        });

        console.log('🏗️ Building placement controls initialized');
    }

    handleBuildingPreviewMouseMove(event) {
        if (!this.buildMode || !this.buildingSystem || !this.buildingSystem.previewMode) {
            return;
        }

        try {
            // Get mouse position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Convert screen coordinates to world coordinates using ray casting
            const pickInfo = this.scene.pick(x, y, (mesh) => {
                return mesh.name === 'terrain' || mesh.name.includes('ground') || mesh.name.includes('grid');
            });

            if (pickInfo.hit && pickInfo.pickedPoint) {
                // Convert world position to grid coordinates
                const gridPos = this.gridManager.worldToGrid(pickInfo.pickedPoint);

                // Update building preview at this position
                this.buildingSystem.updatePreview(gridPos.x, gridPos.z);
            }

        } catch (error) {
            console.warn('⚠️ Error in building preview mouse move:', error);
        }
    }

    handleBuildingPlacementClick(event) {
        try {
            // Get mouse position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // ===== ENHANCED 3D INTERACTION SYSTEM =====
            if (this.buildMode && this.buildingSystem && this.buildingSystem.previewMode) {
                // Building placement mode
                this.handleBuildingPlacement(x, y);
            } else {
                // Building selection mode
                this.handleBuildingSelection(x, y);
            }

        } catch (error) {
            console.error('❌ Error in building placement click:', error);
        }
    }

    handleBuildingPlacement(x, y) {
        // Convert screen coordinates to world coordinates using ray casting
        const pickInfo = this.scene.pick(x, y, (mesh) => {
            return mesh.name === 'terrain' || mesh.name.includes('ground') || mesh.name.includes('grid');
        });

        if (pickInfo.hit && pickInfo.pickedPoint) {
            // Convert world position to grid coordinates
            const gridPos = this.gridManager.worldToGrid(pickInfo.pickedPoint);

            // Attempt to place building at this position
            const success = this.buildingSystem.confirmPlacement(gridPos.x, gridPos.z);

            if (success) {
                console.log(`✅ Building placed successfully at (${gridPos.x}, ${gridPos.z})`);
                // Exit build mode after successful placement
                this.exitBuildMode();
            } else {
                console.warn(`⚠️ Cannot place building at (${gridPos.x}, ${gridPos.z})`);
                // Play error sound
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSound('sfx_build_error', 0.6);
                }
            }
        }
    }

    handleBuildingSelection(x, y) {
        // ===== ENHANCED 3D BUILDING SELECTION SYSTEM =====
        // Ray cast to find buildings with improved mesh name detection
        const pickInfo = this.scene.pick(x, y, (mesh) => {
            // Look for building meshes with actual naming patterns used in BuildingSystem
            if (!mesh.name) return false;

            const meshName = mesh.name.toLowerCase();
            return (
                meshName.includes('building_') ||
                meshName.includes('structure_') ||
                meshName.includes('waterfacility_') ||
                meshName.includes('storage_') ||
                meshName.includes('house_') ||
                meshName.includes('cityhall_') ||
                meshName.includes('treatmentplant_') ||
                meshName.includes('powerplant_') ||
                meshName.includes('storage_tank') ||
                meshName.includes('treatment_') ||
                meshName.includes('pump_') ||
                meshName.includes('well_') ||
                meshName.includes('desal_')
            );
        });

        if (pickInfo.hit && pickInfo.pickedMesh) {
            // ===== ENHANCED BUILDING ID EXTRACTION =====
            const meshName = pickInfo.pickedMesh.name;
            const building = this.findBuildingByMesh(pickInfo.pickedMesh);

            if (building) {
                this.selectBuilding(building);

                // Audio feedback
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSound('sfx_click', 0.8);
                }

                console.log(`🏢 Building selected: ${building.config.name} at (${building.gridX}, ${building.gridZ})`);
            } else {
                console.warn(`⚠️ Building not found for mesh: ${meshName}`);
                // Still show terrain info if building not found
                this.handleTerrainClick(x, y);
            }
        } else {
            // Click on empty terrain - show terrain info
            this.handleTerrainClick(x, y);
        }
    }

    // ===== ENHANCED BUILDING MESH LOOKUP =====
    findBuildingByMesh(mesh) {
        // Search through all buildings to find the one with matching mesh
        for (const [buildingId, building] of this.buildingSystem.buildings) {
            if (building.mesh === mesh) {
                return building;
            }
        }

        // Alternative: search by mesh name patterns
        const meshName = mesh.name;
        for (const [buildingId, building] of this.buildingSystem.buildings) {
            if (building.mesh && building.mesh.name === meshName) {
                return building;
            }
        }

        return null;
    }

    handleTerrainClick(x, y) {
        // Ray cast to terrain
        const pickInfo = this.scene.pick(x, y, (mesh) => {
            return mesh.name === 'terrain' || mesh.name.includes('ground') || mesh.name.includes('grid');
        });

        if (pickInfo.hit && pickInfo.pickedPoint) {
            // Convert world position to grid coordinates
            const gridPos = this.gridManager.worldToGrid(pickInfo.pickedPoint);

            // Get terrain type
            const terrainType = this.gridManager.getTerrainType(gridPos.x, gridPos.z);

            // Show terrain information in UI
            if (this.uiManager) {
                this.uiManager.showTerrainInfo(gridPos.x, gridPos.z, terrainType);
            }

            // Clear building selection
            this.deselectBuilding();

            console.log(`🌍 Terrain clicked: ${terrainType} at (${gridPos.x}, ${gridPos.z})`);
        }
    }

    handleIsolatedWheel(event) {
        if (!this.camera) return;

        const deltaY = event.deltaY;
        if (!this.isValidNumber(deltaY)) return;

        try {
            const zoomSensitivity = 2;
            const deltaRadius = deltaY > 0 ? zoomSensitivity : -zoomSensitivity;
            const newRadius = this.camera.radius + deltaRadius;

            this.camera.radius = Math.max(
                this.camera.lowerRadiusLimit,
                Math.min(this.camera.upperRadiusLimit, newRadius)
            );

            if (this.isometricAngles &&
                this.isValidCameraAngle(this.isometricAngles.alpha) &&
                this.isValidCameraAngle(this.isometricAngles.beta)) {

                const beforeState = this.getCameraState();
                this.camera.alpha = this.isometricAngles.alpha;
                this.camera.beta = this.isometricAngles.beta;
                this.validateCameraPositionChange('zoom operation', beforeState);
            } else {
                console.warn('⚠️ Ângulos isométricos corrompidos, usando valores seguros');
                this.camera.alpha = -Math.PI / 4;
                this.camera.beta = Math.PI / 3.5;
                this.isometricAngles = { alpha: -Math.PI / 4, beta: Math.PI / 3.5 };
            }

            event.preventDefault();

        } catch (error) {
            console.error('❌ Erro no zoom:', error);
            this.recoverCameraState();
        }
    }

    startRenderLoop() {
        this.engine.runRenderLoop(() => {
            const currentTime = performance.now();

            if (this.renderState.circuitBreakerActive) {
                console.error('🚨 Circuit breaker ativo - render parado');
                this.handleCriticalFailure();
                return;
            }

            if (this.lastUpdateTime === 0) {
                this.lastUpdateTime = currentTime;
                return;
            }

            const deltaTime = currentTime - this.lastUpdateTime;
            const cappedDeltaTime = Math.min(deltaTime, 100);

            if (!this.validateCameraStateWithBreaker()) {
                console.warn('⚠️ Câmera inválida detectada, tentando recuperação...');
                this.renderState.corruptionCount++;
                this.renderState.lastCorruptionTime = currentTime;
                
                if (this.renderState.corruptionCount >= this.renderState.maxCorruptions) {
                    console.error('🚨 Muitas corrupções - ativando circuit breaker');
                    this.renderState.circuitBreakerActive = true;
                    return;
                }
                
                this.emergencyRecovery();
                this.lastUpdateTime = currentTime;
                return;
            }

            if (this.renderState.corruptionCount > 0 && 
                (currentTime - this.renderState.lastCorruptionTime) > 5000) {
                this.renderState.corruptionCount = 0;
            }

            try {
                this.updateCameraControls(cappedDeltaTime);
                this.update(cappedDeltaTime);
                this.scene.render();
            } catch (error) {
                console.error('❌ Erro durante render:', error);
                this.renderState.corruptionCount++;
            }

            this.lastUpdateTime = currentTime;
            this.frameCount++;

            if (currentTime - this.lastFPSUpdate > 1000) {
                this.currentFPS = this.frameCount;
                this.frameCount = 0;
                this.lastFPSUpdate = currentTime;
            }
        });
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.gameTime += deltaTime * this.timeScale;
        this.updateGameClock(deltaTime);
        
        if (this.resourceManager) {
            this.resourceManager.update(deltaTime * this.timeScale);
        }
        
        if (this.buildingSystem) {
            this.buildingSystem.update(deltaTime * this.timeScale);
        }

        if (this.cityLifeSystem) {
            this.cityLifeSystem.update(deltaTime);
            const population = this.resourceManager.getResource('population');
            this.cityLifeSystem.updateDensity(population);
        }

        if (this.questSystem) {
            this.questSystem.update(deltaTime * this.timeScale);
        }
        
        if (this.eventSystem) {
            this.eventSystem.update(deltaTime * this.timeScale);
        }

        if (this.loanManager) {
            const gameHours = this.gameTime / 3600000;
            if (Math.floor(gameHours / (24 * 30)) > Math.floor((gameHours - deltaTime * this.timeScale) / (24 * 30))) {
                this.loanManager.processMonthlyPayments();
            }
        }

        if (this.uiManager) {
            this.uiManager.update(deltaTime);
        }

        this.updateMemoryMonitoring(deltaTime);

        this.autoSaveTimer += deltaTime;
        if (this.autoSaveTimer >= GAME_CONFIG.gameplay.autoSaveInterval) {
            this.autoSave();
            this.autoSaveTimer = 0;
        }
    }

    // ===== VALIDAÇÃO E RECUPERAÇÃO =====
    isValidNumber(value) {
        return typeof value === 'number' && isFinite(value) && !isNaN(value);
    }

    isValidCameraAngle(angle) {
        return this.isValidNumber(angle) && Math.abs(angle) <= 10;
    }

    isValidVector3(vector) {
        if (!vector || typeof vector !== 'object') return false;
        return this.isValidNumber(vector.x) && 
               this.isValidNumber(vector.y) && 
               this.isValidNumber(vector.z);
    }

    validateCameraStateWithBreaker() {
        if (!this.camera) return false;
        
        try {
            const alpha = this.camera.alpha;
            const beta = this.camera.beta;
            const radius = this.camera.radius;
            const target = this.camera.getTarget();
            const position = this.camera.position;
            
            if (!this.isValidCameraAngle(alpha) || !this.isValidCameraAngle(beta) || 
                !this.isValidNumber(radius) || !this.isValidVector3(target) || 
                !this.isValidVector3(position)) {
                
                console.error('🚨 Corrupção detectada:', {
                    alpha, beta, radius,
                    target: { x: target.x, y: target.y, z: target.z },
                    position: { x: position.x, y: position.y, z: position.z }
                });
                
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro na validação:', error);
            return false;
        }
    }

    validateCameraPositionChange(operation, beforeState) {
        if (!this.camera) return;

        try {
            const afterPosition = this.camera.position;
            const afterTarget = this.camera.getTarget();

            const hasNaNPosition = isNaN(afterPosition.x) || isNaN(afterPosition.y) || isNaN(afterPosition.z);
            const hasNaNTarget = isNaN(afterTarget.x) || isNaN(afterTarget.y) || isNaN(afterTarget.z);

            if (hasNaNPosition || hasNaNTarget) {
                console.error('🚨 NaN detectado após operação:', {
                    operation, beforeState,
                    afterPosition: { x: afterPosition.x, y: afterPosition.y, z: afterPosition.z },
                    afterTarget: { x: afterTarget.x, y: afterTarget.y, z: afterTarget.z }
                });

                this.emergencyRecovery();
            }

        } catch (error) {
            console.error('❌ Erro na validação de mudança:', error);
        }
    }

    emergencyRecovery() {
        console.log('🚨 Iniciando recuperação de emergência...');
        
        try {
            if (this.scene) {
                this.scene.stopAllAnimations();
                if (this.camera && this.camera.animations) {
                    this.camera.animations = [];
                }
            }
            
            this.recreateCamera();
            this.renderState.recoveryAttempts++;
            
            console.log(`✅ Recuperação concluída (tentativa ${this.renderState.recoveryAttempts})`);
            
        } catch (error) {
            console.error('❌ Falha na recuperação:', error);
            this.renderState.circuitBreakerActive = true;
        }
    }

    recreateCamera() {
        console.log('🔧 Recriando câmera...');
        
        try {
            const oldCamera = this.camera;
            const scene = this.scene;
            
            const safeAlpha = -Math.PI / 4;
            const safeBeta = Math.PI / 3.5;
            const safeRadius = 30;
            const safeTarget = new BABYLON.Vector3(20, 0, 20);
            
            const newCamera = new BABYLON.ArcRotateCamera(
                "recoveredCamera", safeAlpha, safeBeta, safeRadius, safeTarget, scene
            );
            
            newCamera.attachControl(this.canvas, false);
            newCamera.lowerRadiusLimit = 10;
            newCamera.upperRadiusLimit = 60;
            newCamera.inertia = 0.9;
            newCamera.angularSensibilityX = 0;
            newCamera.angularSensibilityY = 0;
            
            this.camera = newCamera;
            scene.activeCamera = newCamera;
            
            this.isometricAngles = { alpha: safeAlpha, beta: safeBeta };
            
            if (oldCamera) {
                try {
                    oldCamera.dispose();
                } catch (disposeError) {
                    console.warn('⚠️ Erro ao dispor câmera antiga:', disposeError);
                }
            }
            
            console.log('✅ Câmera recriada com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao recriar câmera:', error);
            throw error;
        }
    }

    recoverCameraState() {
        try {
            console.log('🔧 Recuperando estado da câmera...');

            if (!this.camera) {
                console.error('❌ Câmera não inicializada');
                return;
            }

            const safeTarget = new BABYLON.Vector3(20, 0, 20);
            this.camera.setTarget(safeTarget);
            this.camera.alpha = this.CAMERA_CONSTANTS.ISOMETRIC_ALPHA;
            this.camera.beta = this.CAMERA_CONSTANTS.ISOMETRIC_BETA;
            this.camera.radius = this.CAMERA_CONSTANTS.DEFAULT_ZOOM_DISTANCE;

            if (this.scene && this.engine) {
                this.scene.render();
                this.engine.resize();
            }

            console.log('✅ Recuperação da câmera concluída');

        } catch (error) {
            console.error('❌ Falha na recuperação:', error);
            try {
                if (this.engine && !this.engine.isDisposed) {
                    this.engine.resize();
                }
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError);
            }
        }
    }

    handleCriticalFailure() {
        console.error('🚨 Falha crítica do sistema 3D');
        
        if (this.engine) {
            try {
                this.engine.stopRenderLoop();
                console.log('🔧 Render loop parado');
            } catch (error) {
                console.error('❌ Erro ao parar render loop:', error);
            }
        }
        
        const errorMessage = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.8); color: white; z-index: 10000;
                        display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h1>🚨 Erro Crítico no Sistema 3D</h1>
                <p>O sistema de renderização 3D encontrou um erro irrecuperável.</p>
                <button onclick="window.location.reload()" 
                        style="padding: 10px 20px; font-size: 16px; background: #007acc; color: white; border: none; cursor: pointer;">
                    🔄 Recarregar Página
                </button>
                <small>O progresso não salvo será perdido.</small>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorMessage);
    }

    updateCameraControls(deltaTime) {
        if (!this.camera) return;
        
        if (!this.validateCameraStateWithBreaker()) {
            console.warn('⚠️ Câmera inválida, pulando frame');
            return;
        }
        
        this.enforceIsometricAngles();
        
        if (!this.validateCameraStateWithBreaker()) {
            console.error('🚨 Câmera corrompida após operações de controle');
        }
    }

    enforceIsometricAngles() {
        if (!this.camera || !this.isometricAngles) return;
        
        try {
            const targetAlpha = this.isometricAngles.alpha;
            const targetBeta = this.isometricAngles.beta;
            
            if (!this.isValidCameraAngle(targetAlpha) || !this.isValidCameraAngle(targetBeta)) {
                console.error('❌ Ângulos isométricos inválidos:', { targetAlpha, targetBeta });
                return;
            }
            
            const currentAlpha = this.camera.alpha;
            const currentBeta = this.camera.beta;
            
            if (this.isValidCameraAngle(currentAlpha) && this.isValidCameraAngle(currentBeta)) {
                const alphaDiff = Math.abs(currentAlpha - targetAlpha);
                const betaDiff = Math.abs(currentBeta - targetBeta);
                
                if (alphaDiff > 0.01 || betaDiff > 0.01) {
                    this.camera.alpha = targetAlpha;
                    this.camera.beta = targetBeta;
                }
            } else {
                console.warn('⚠️ Corrigindo ângulos inválidos da câmera');
                this.camera.alpha = targetAlpha;
                this.camera.beta = targetBeta;
            }
            
        } catch (error) {
            console.error('❌ Erro ao enforcar ângulos isométricos:', error);
            this.emergencyRecovery();
        }
    }

    getCameraState() {
        if (!this.camera) return null;
        
        try {
            const target = this.camera.getTarget();
            return {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                target: { x: target.x, y: target.y, z: target.z },
                alpha: this.camera.alpha,
                beta: this.camera.beta,
                radius: this.camera.radius
            };
        } catch (error) {
            return { error: 'Falha ao obter estado da câmera: ' + error.message };
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

        this.memoryMonitoring.memoryHistory.push({
            timestamp: Date.now(),
            ...memoryInfo
        });

        if (this.memoryMonitoring.memoryHistory.length > 20) {
            this.memoryMonitoring.memoryHistory.shift();
        }

        if (memoryInfo.heapUsed > this.memoryMonitoring.maxMemoryUsage) {
            this.memoryMonitoring.maxMemoryUsage = memoryInfo.heapUsed;
        }

        this.checkMemoryThresholds(memoryInfo);
    }

    getMemoryInfo() {
        const info = {
            heapUsed: 0,
            heapTotal: 0,
            buildingCount: 0,
            meshCount: 0
        };

        if (performance.memory) {
            info.heapUsed = performance.memory.usedJSHeapSize;
            info.heapTotal = performance.memory.totalJSHeapSize;
        }

        if (this.buildingSystem) {
            info.buildingCount = this.buildingSystem.buildings.size;
        }

        if (this.scene) {
            info.meshCount = this.scene.meshes.length;
        }

        return info;
    }

    checkMemoryThresholds(memoryInfo) {
        const heapMB = memoryInfo.heapUsed / 1024 / 1024;

        if (heapMB > 100 && heapMB <= 200) {
            console.warn(`⚠️ Uso de memória alto: ${heapMB.toFixed(2)}MB`);
        }

        if (heapMB > 200) {
            console.error(`🚨 Uso de memória crítico: ${heapMB.toFixed(2)}MB`);
            if (this.uiManager && this.uiManager.showAlert) {
                this.uiManager.showAlert(`Uso de memória crítico: ${heapMB.toFixed(2)}MB. Considere reiniciar o jogo.`, 'error');
            }
        }
    }

    // ===== SISTEMA DE RELÓGIO =====
    initializeGameClock() {
        this.gameStartTime = new Date();
        this.gameClockTime = new Date(this.gameStartTime);

        const hours = this.gameClockTime.getHours();
        const minutes = this.gameClockTime.getMinutes();
        this.dayNightCycle = (hours + minutes / 60) / 24;

        console.log(`🕐 Relógio iniciado: ${this.formatGameTime()}`);
        this.updateDayNightLighting();
    }

    updateGameClock(deltaTime) {
        if (this.gameState !== 'playing') return;

        let timeMultiplier;
        switch (this.timeScale) {
            case 1: timeMultiplier = 60; break;
            case 2: timeMultiplier = 600; break;
            case 3: timeMultiplier = 3600; break;
            default: timeMultiplier = 60 * this.timeScale; break;
        }

        const gameTimeAdvance = deltaTime * timeMultiplier;
        this.gameClockTime.setTime(this.gameClockTime.getTime() + gameTimeAdvance);

        const hours = this.gameClockTime.getHours();
        const minutes = this.gameClockTime.getMinutes();
        this.dayNightCycle = (hours + minutes / 60) / 24;

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

        const currentState = this.getDayNightState();

        if (this.lastDayNightState && this.lastDayNightState !== currentState) {
            this.handleDayNightTransition(this.lastDayNightState, currentState);
        }

        this.lastDayNightState = currentState;

        const ambientLight = this.scene.getLightByName('ambientLight');
        if (ambientLight) {
            let intensity = 0.6;

            if (this.dayNightCycle >= 0.25 && this.dayNightCycle <= 0.75) {
                intensity = 0.8;
                ambientLight.diffuse = new BABYLON.Color3(1, 1, 0.9);
                this.scene.clearColor = new BABYLON.Color3(0.5, 0.8, 1.0);
            } else {
                intensity = 0.3;
                ambientLight.diffuse = new BABYLON.Color3(0.7, 0.8, 1);
                this.scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.3);
            }

            ambientLight.intensity = intensity;
        }
    }

    getDayNightState() {
        const hours = this.gameClockTime.getHours();
        return (hours >= 6 && hours < 18) ? 'day' : 'night';
    }

    handleDayNightTransition(fromState, toState) {
        console.log(`🌅 Transição: ${fromState} -> ${toState}`);

        if (typeof AudioManager !== 'undefined') {
            if (toState === 'day') {
                AudioManager.playDayNightTransition('morning');
            } else if (toState === 'night') {
                AudioManager.playDayNightTransition('night');
            }
        }

        if (this.uiManager) {
            const message = toState === 'day' ?
                '🌅 Amanheceu! Um novo dia começou.' :
                '🌙 Anoiteceu! A cidade se prepara para descansar.';
            this.uiManager.showNotification(message, 'info');
        }
    }

    // ===== SISTEMA DE HOVER =====
    setupHoverSystem() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (this.buildingSystem && this.buildingSystem.previewMode) {
                    this.cancelBuildingPreview();
                } else if (this.selectedBuilding) {
                    this.deselectBuilding();
                }
            }
        });

        console.log('🎮 Sistema de hover configurado (apenas ESC)');
    }

    // ===== CONTROLE DE JOGO =====
    startNewGame() {
        console.log('🎮 Iniciando novo jogo...');

        if (!this.initialized) {
            console.error('❌ Sistemas não inicializados');
            return false;
        }

        this.gameState = 'playing';
        this.gameTime = 0;
        this.timeScale = 1;

        this.initializeGameClock();

        if (this.resourceManager) {
            this.resourceManager.reset();
        } else {
            console.error('❌ ResourceManager não inicializado');
            return false;
        }

        if (!this.gridManager) {
            console.error('❌ GridManager não inicializado');
            return false;
        }

        if (this.uiManager) {
            this.uiManager.initialize();
        } else {
            console.error('❌ UIManager não inicializado');
            return false;
        }

        if (this.questSystem) {
            this.questSystem.startFirstQuest();
        } else {
            console.error('❌ QuestSystem não inicializado');
            return false;
        }

        this.handleResize();
        this.createStarterCity();

        console.log('✅ Novo jogo iniciado');
        return true;
    }

    createStarterCity() {
        console.log('🏙️ Criando cidade inicial...');

        if (!this.buildingSystem) {
            console.error('❌ BuildingSystem não disponível');
            return;
        }

        try {
            const cityHall = { type: 'city_hall', x: 10, z: 10 };

            const originalCooldownActive = this.buildingSystem.buildingCooldown.active;
            this.buildingSystem.buildingCooldown.active = false;

            console.log('🏛️ Construindo Prefeitura Municipal...');
            const success = this.buildingSystem.placeBuilding(cityHall.x, cityHall.z, cityHall.type);

            if (success) {
                console.log('✅ Prefeitura construída');
                this.addCityHallLightingEffects(success);
                this.centerCameraOnCityHall(cityHall.x, cityHall.z);
            } else {
                console.warn('⚠️ Falha ao construir Prefeitura');
            }

            this.buildingSystem.buildingCooldown.active = originalCooldownActive;

            if (this.resourceManager) {
                this.resourceManager.resources.budget.current += 10000;
                console.log('💰 Bônus inicial aplicado');
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
            console.log('💡 Adicionando efeitos de iluminação...');

            const light = new BABYLON.PointLight("cityHallLight",
                new BABYLON.Vector3(cityHallBuilding.mesh.position.x,
                                  cityHallBuilding.mesh.position.y + 3,
                                  cityHallBuilding.mesh.position.z), this.scene);

            light.diffuse = new BABYLON.Color3(1, 0.8, 0.4);
            light.specular = new BABYLON.Color3(1, 1, 0.6);
            light.intensity = 0.8;
            light.range = 10;

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

            cityHallBuilding.lightingEffects = {
                light: light,
                particles: particleSystem
            };

            console.log('✅ Efeitos de iluminação criados');

        } catch (error) {
            console.error('❌ Erro ao criar efeitos de iluminação:', error);
        }
    }

    centerCameraOnCityHall(gridX, gridZ) {
        if (!this.camera || !this.gridManager) {
            console.warn('⚠️ Câmera ou GridManager não disponível');
            return;
        }

        try {
            const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
            console.log(`📷 Centralizando câmera na Prefeitura em (${gridX}, ${gridZ})`);

            const targetPosition = new BABYLON.Vector3(worldPos.x, 0, worldPos.z);
            const beforeState = this.getCameraState();

            this.camera.setTarget(targetPosition);
            this.camera.radius = 25;

            this.validateCameraPositionChange('centerCameraOnCityHall', beforeState);

            if (this.isometricAngles &&
                this.isValidCameraAngle(this.isometricAngles.alpha) &&
                this.isValidCameraAngle(this.isometricAngles.beta)) {

                this.camera.alpha = this.isometricAngles.alpha;
                this.camera.beta = this.isometricAngles.beta;
            } else {
                console.warn('⚠️ Ângulos corrompidos, usando valores seguros');
                this.camera.alpha = -Math.PI / 4;
                this.camera.beta = Math.PI / 3.5;
                this.isometricAngles = { alpha: -Math.PI / 4, beta: Math.PI / 3.5 };
            }
            
            console.log('✅ Câmera centralizada');

        } catch (error) {
            console.error('❌ Erro ao centralizar câmera:', error);
        }
    }

    // ===== CONTROLES DE JOGO =====
    loadGame(saveData) {
        console.log('📁 Carregando jogo...');

        if (!this.initialized) {
            console.error('❌ Sistemas não inicializados');
            return false;
        }

        try {
            this.gameTime = saveData.gameTime || 0;
            this.timeScale = saveData.timeScale || 1;

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

            if (this.resourceManager && saveData.resources) {
                this.resourceManager.loadData(saveData.resources);
            }

            if (this.buildingSystem && saveData.buildings) {
                this.buildingSystem.loadData(saveData.buildings);
            }

            if (this.questSystem && saveData.quests) {
                this.questSystem.loadData(saveData.quests);
            }

            if (this.buildingSystem) {
                this.buildingSystem.rebuildFromData();
            }

            if (this.uiManager) {
                this.uiManager.initialize();
            }

            this.gameState = 'playing';
            this.handleResize();

            console.log('✅ Jogo carregado');
            return true;

        } catch (error) {
            console.error('❌ Erro ao carregar:', error);
            alert('Erro ao carregar o jogo. Iniciando novo jogo.');
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

        if (this.uiManager) {
            this.uiManager.updateTimeScaleUI(this.timeScale);
        }

        let speedInfo;
        switch (this.timeScale) {
            case 1: speedInfo = '1x (1 min real = 1 hora jogo)'; break;
            case 2: speedInfo = '2x (1 seg real = 10 min jogo)'; break;
            case 3: speedInfo = '3x (1 seg real = 1 hora jogo)'; break;
            default: speedInfo = `${this.timeScale}x (velocidade customizada)`; break;
        }

        console.log(`⏱️ Velocidade alterada: ${speedInfo}`);

        if (this.uiManager) {
            this.uiManager.showNotification(`Velocidade: ${speedInfo}`, 'info');
        }
    }

    handleKeyboardEvent(kbInfo) {
        const isKeyDown = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;

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

    enterBuildMode(buildingType) {
        this.buildMode = true;
        this.currentBuildingType = buildingType;
        this.canvas.style.cursor = 'crosshair';
        this.startBuildingPreview(buildingType);
        console.log(`🏗️ Modo construção: ${buildingType}`);
    }

    exitBuildMode() {
        this.buildMode = false;
        this.currentBuildingType = null;
        this.canvas.style.cursor = 'grab';

        // Clear building system preview mode
        if (this.buildingSystem && this.buildingSystem.previewMode) {
            this.buildingSystem.stopPreviewMode();
        }

        // Clear UI selection and feedback
        this.uiManager.clearBuildingSelection();
        this.uiManager.hideBuildingPlacementFeedback();

        console.log('🏗️ Modo construção desativado');
    }

    startBuildingPreview(buildingTypeId) {
        if (this.buildingSystem) {
            this.buildingSystem.startPreviewMode(buildingTypeId);
            this.hideHoverInfo();
        }
    }

    cancelBuildingPreview() {
        if (this.buildingSystem && this.buildingSystem.previewMode) {
            this.buildingSystem.stopPreviewMode();
            console.log('🔍 Preview cancelado');
        }
    }

    // ===== SELEÇÃO =====
    selectBuilding(building) {
        if (!building || !building.config) {
            console.warn('⚠️ Tentativa de selecionar edifício inválido');
            return;
        }

        this.clearBuildingSelection();
        this.selectedBuilding = building;
        this.addSelectionIndicator(building);
        this.refreshInfoPanel();

        console.log(`🏢 Selecionado: ${building.config.name}`);
    }

    deselectBuilding() {
        if (this.selectedBuilding) {
            const buildingName = (this.selectedBuilding.config && this.selectedBuilding.config.name)
                ? this.selectedBuilding.config.name
                : 'Edifício Desconhecido';
            console.log(`🏢 Desselecionado: ${buildingName}`);
        }

        this.clearBuildingSelection();
        this.refreshInfoPanel();
    }

    // ===== RECICLAGEM DE EDIFÍCIOS =====
    recycleBuildingWithConfirmation(buildingId) {
        if (!buildingId || !this.buildingSystem) {
            console.warn('⚠️ ID do edifício ou BuildingSystem inválido');
            return;
        }

        const building = this.buildingSystem.buildings.get(buildingId);
        if (!building) {
            console.warn(`⚠️ Edifício não encontrado: ${buildingId}`);
            return;
        }

        const buildingName = building.config?.name || 'Edifício Desconhecido';
        const recoveryValue = this.buildingSystem.getRecyclingValue(buildingId);

        // Mostrar diálogo de confirmação
        const confirmed = confirm(
            `♻️ Reciclar ${buildingName}?\n\n` +
            `Você receberá R$ ${recoveryValue} de volta.\n` +
            `Esta ação não pode ser desfeita.`
        );

        if (confirmed) {
            const result = this.buildingSystem.recycleBuilding(buildingId);

            if (result.success) {
                console.log(`♻️ ${buildingName} reciclado com sucesso. Recursos recuperados: R$ ${result.recoveredAmount}`);

                // Limpar seleção se o edifício reciclado estava selecionado
                if (this.selectedBuilding && this.selectedBuilding.id === buildingId) {
                    this.deselectBuilding();
                }

                // Tocar som de sucesso
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSound('sfx_success', 0.8);
                }
            } else {
                console.error(`❌ Falha ao reciclar ${buildingName}`);

                // Tocar som de erro
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSound('sfx_build_error', 0.6);
                }
            }
        } else {
            console.log(`🚫 Reciclagem de ${buildingName} cancelada pelo usuário`);
        }
    }

    clearBuildingSelection() {
        if (this.selectedBuilding) {
            this.removeSelectionIndicator(this.selectedBuilding);
            this.selectedBuilding = null;
        }
    }

    addSelectionIndicator(building) {
        if (!building.mesh || !building.config) {
            console.warn('⚠️ Tentativa de adicionar indicador inválido');
            return;
        }

        try {
            const selectionIndicator = this.createSelectionIndicator(building);
            if (selectionIndicator) {
                building.mesh.selectionIndicator = selectionIndicator;
                this.animateSelectionIndicator(selectionIndicator);
            }
        } catch (error) {
            console.error('❌ Erro ao criar indicador:', error);
        }
    }

    createSelectionIndicator(building) {
        const buildingMesh = building.mesh;
        const boundingBox = buildingMesh.getBoundingInfo().boundingBox;

        const buildingWidth = Math.abs(boundingBox.maximum.x - boundingBox.minimum.x);
        const buildingDepth = Math.abs(boundingBox.maximum.z - boundingBox.minimum.z);
        const averageSize = (buildingWidth + buildingDepth) / 2;

        const selectionRing = BABYLON.MeshBuilder.CreateTorus(`selection_${building.id}`, {
            diameter: averageSize * 1.3,
            thickness: 0.15,
            tessellation: 24
        }, this.scene);

        selectionRing.position.x = buildingMesh.position.x;
        selectionRing.position.z = buildingMesh.position.z;
        selectionRing.position.y = 0.08;

        const selectionMaterial = new BABYLON.StandardMaterial(`selectionMat_${building.id}`, this.scene);
        selectionMaterial.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
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

                if (this.scene) {
                    this.scene.stopAnimation(indicator);
                }

                if (indicator.animations && indicator.animations.length > 0) {
                    indicator.animations = [];
                }

                if (!indicator.isDisposed()) {
                    if (indicator.material) {
                        indicator.material.dispose();
                        indicator.material = null;
                    }

                    if (indicator.parent) {
                        indicator.parent = null;
                    }

                    indicator.dispose();
                }

                building.mesh.selectionIndicator = null;

                const buildingName = (building.config && building.config.name)
                    ? building.config.name
                    : 'Edifício Desconhecido';
                console.log(`🗑️ Indicador removido: ${buildingName}`);

            } catch (error) {
                console.error('❌ Erro ao remover indicador:', error);
                building.mesh.selectionIndicator = null;
            }
        }
    }

    animateSelectionIndicator(indicator) {
        const animationKeys = [];
        animationKeys.push({ frame: 0, value: 0.8 });
        animationKeys.push({ frame: 30, value: 1.0 });
        animationKeys.push({ frame: 60, value: 0.8 });

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

    refreshInfoPanel() {
        if (this.selectedBuilding) {
            this.updateSelectionInfo(this.selectedBuilding);
        } else {
            this.clearSelectionInfo();
        }
    }

    updateSelectionInfo(building) {
        if (this.uiManager) {
            this.uiManager.showBuildingSelectionInfo(building);
        }
    }

    clearSelectionInfo() {
        if (this.uiManager) {
            this.uiManager.clearBuildingSelectionInfo();
        }
    }

    hideHoverInfo() {
        this.hoverInfo = null;
        const tooltip = document.getElementById('hover-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // ===== EVENTOS =====
    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameState === 'playing') {
                this.pauseGame();
            }
        });
    }

    handleResize() {
        if (this.engine && this.canvas) {
            const rect = this.canvas.getBoundingClientRect();

            if (rect.width > 0 && rect.height > 0) {
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
            } else {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }

            this.engine.resize();

            if (this.uiManager) {
                this.uiManager.handleResize();
            }

            console.log(`🔄 Canvas redimensionado: ${this.canvas.width}x${this.canvas.height}`);
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

    // ===== FUNÇÕES DE DEBUG =====
    exposeDebugFunctions() {
        window.runMemoryTest = () => this.runMemoryStressTest();
        window.getMemoryInfo = () => this.getMemoryInfo();
        window.logMemoryHistory = () => console.table(this.memoryMonitoring.memoryHistory);
        window.getCameraState = () => this.getCameraState();
        window.recoverCamera = () => this.recoverCameraState();
    }

    runMemoryStressTest() {
        console.log('🧪 Iniciando teste de stress de memória...');

        if (!this.buildingSystem) {
            console.error('❌ BuildingSystem não disponível');
            return;
        }

        const initialMemory = this.getMemoryInfo();
        console.log(`📊 Memória inicial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

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
                        console.log(`✅ Edifício ${i + 1}/20: ${buildingType} em (${x}, ${z})`);
                    }
                }
                attempts++;
            }

            if (!placed) {
                console.warn(`⚠️ Não foi possível colocar edifício ${i + 1}/20`);
            }
        }

        setTimeout(() => {
            const afterPlacement = this.getMemoryInfo();
            console.log(`📊 Memória após colocação: ${(afterPlacement.heapUsed / 1024 / 1024).toFixed(2)}MB`);

            console.log('🗑️ Removendo todos os edifícios...');
            placedBuildings.forEach(buildingId => {
                this.buildingSystem.removeBuilding(buildingId);
            });

            if (window.gc) {
                window.gc();
            }

            setTimeout(() => {
                const finalMemory = this.getMemoryInfo();
                console.log(`📊 Memória final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

                const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
                const diffMB = (memoryDiff / 1024 / 1024).toFixed(2);

                if (memoryDiff > 5 * 1024 * 1024) {
                    console.error(`🚨 POSSÍVEL VAZAMENTO: ${diffMB}MB`);
                } else {
                    console.log(`✅ TESTE PASSOU: apenas ${diffMB}MB de diferença`);
                }

                console.log('🧪 Teste de stress concluído');
            }, 2000);
        }, 1000);
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
}

// Exportar para escopo global
window.GameManager = GameManager;
console.log('🎮 GameManager carregado e exportado para window.GameManager');

// ===== FUNÇÕES DE DEBUG GLOBAIS =====
window.monitorCamera = () => {
    if (!window.gameManager) {
        console.warn('⚠️ GameManager não inicializado');
        return;
    }
    
    const monitor = setInterval(() => {
        const state = window.gameManager.getCameraState();
        
        if (state && state.error) {
            console.error('❌ Erro no monitoramento:', state.error);
            clearInterval(monitor);
            return;
        }
        
        if (state) {
            const hasInvalidAlpha = !isFinite(state.alpha) || isNaN(state.alpha);
            const hasInvalidBeta = !isFinite(state.beta) || isNaN(state.beta);
            const hasInvalidPosition = !isFinite(state.position.x) || isNaN(state.position.x);
            
            if (hasInvalidAlpha || hasInvalidBeta || hasInvalidPosition) {
                console.error('🚨 CORRUPÇÃO DETECTADA:', {
                    alpha: state.alpha,
                    beta: state.beta,
                    position: state.position,
                    target: state.target
                });
                
                clearInterval(monitor);
                window.gameManager.emergencyRecovery();
            } else {
                console.log('✅ Câmera OK:', {
                    alpha: state.alpha.toFixed(3),
                    beta: state.beta.toFixed(3),
                    position: `(${state.position.x.toFixed(1)}, ${state.position.y.toFixed(1)}, ${state.position.z.toFixed(1)})`
                });
            }
        }
    }, 1000);
    
    console.log('🎮 Monitor de câmera iniciado');
    return monitor;
};

console.log('🎮 Funções de debug disponíveis: monitorCamera(), getCameraState(), recoverCamera()');