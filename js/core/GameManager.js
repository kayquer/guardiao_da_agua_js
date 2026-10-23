/**
 * GUARDIÃO DA ÁGUA - GAME MANAGER
 * Classe principal que controla o estado do jogo e coordena todos os sistemas
 */

class GameManager {
    constructor() {
        log('🎮 Inicializando GameManager...');

        // Estado do jogo
        this.gameState = 'menu';
        this.timeScale = 1;
        this.gameTime = 0;
        this.lastUpdateTime = 0;
        // Pausa "leve" por motivo (popup, painel, diálogo): congela a simulação sem abrir o menu de pausa
        this.pauseReasons = new Set();

        // Sistemas principais
        this.gridManager = null;
        this.resourceManager = null;
        this.buildingSystem = null;
        this.uiManager = null;
        this.loanManager = null;
        this.questSystem = null;
        this.eventSystem = null;
        this.saveSystem = null;
        this.studySystem = null;
        this.tutorialSystem = null;
        this.cityLifeSystem = null;
        this.gameOverSystem = null;

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

        this.gameStartTime = null;
        this.gameClockTime = null;
        this.dayNightCycle = 0;
        this.lastDayNightState = null;

        this.hoverInfo = null;
        this.lastHoverPosition = { x: -1, z: -1 };
        this.currentHoverEffect = null;
        this.currentTerrainSelection = null;
        this.lastHoveredBuilding = null;

        // Auto-save (só depois do tutorial inicial: canSave)
        this.autoSaveTimer = 0;
        this.tutorialDone = false;
        this.initialized = false;

        // Estado de renderização e recuperação de erros
        this.renderState = {
            circuitBreakerActive: false,
            corruptionCount: 0,
            maxCorruptions: 5,
            lastCorruptionTime: 0,
            recoveryAttempts: 0,
            lastErrorTime: 0
        };
        // Estado de renderização e recuperação de erros
        this.renderState = {
            circuitBreakerActive: false,
            corruptionCount: 0,
            maxCorruptions: 5,
            lastCorruptionTime: 0,
            recoveryAttempts: 0,
            lastErrorTime: 0
        };

        // Monitoramento de memória e performance
        this.memoryMonitoring = {
            enabled: true,
            lastCheck: 0,
            checkInterval: 5000, // Verificar a cada 5 segundos
            memoryHistory: [],
            maxMemoryUsage: 0
        };
    }

    // ===== VALIDAÇÃO DE DEPENDÊNCIAS =====
    validateDependencies() {
        log('🔍 Validando dependências...');

        const requiredClasses = [
            'GridManager', 'ResourceManager', 'BuildingSystem', 'CityLifeSystem',
            'UIManager', 'QuestSystem', 'EventSystem', 'SaveSystem', 'StudySystem', 'TutorialSystem'
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

        log('✅ Todas as dependências validadas');
    }

    // ===== INICIALIZAÇÃO =====
    async initializeSystems() {
        try {
            log('🔧 Inicializando sistemas...');

            await this.initializeRenderer();
            this.validateDependencies();

            // Inicializar sistemas de jogo
            this.gridManager = new GridManager(this.scene);
            this.resourceManager = new ResourceManager(this);
            this.treeSystem = new TreeSystem(this);
            this.buildingSystem = new BuildingSystem(this.scene, this.gridManager, this);
            this.cityLifeSystem = new CityLifeSystem(this.scene, this.gridManager, this.buildingSystem);
            this.uiManager = new UIManager(this);
            this.loanManager = new LoanManager(this);
            this.questSystem = new QuestSystem(this);
            this.eventSystem = new EventSystem(this);
            this.saveSystem = new SaveSystem();
            this.studySystem = new StudySystem(this);
            this.tutorialSystem = new TutorialSystem(this);
            this.gameOverSystem = new GameOverSystem(this);

            // Aguardar carregamento do conteúdo educacional
            await this.studySystem.initialize();

            this.setupEventListeners();
            // Trocar a qualidade gráfica no menu de pausa aplica na hora
            GraphicsQuality.onChange(level => this.applyGraphicsQuality(level));
            if (DEBUG) this.exposeDebugFunctions();

            log('✅ Sistemas inicializados com sucesso');
            this.initialized = true;

        } catch (error) {
            console.error('❌ Erro ao inicializar sistemas:', error);
            this.initialized = false;
            throw error;
        }
    }
    
    async initializeRenderer() {
        log('🎨 Inicializando Babylon.js...');

        this.canvas = document.getElementById('game-canvas') || document.getElementById('test-canvas');
        if (!this.canvas) {
            throw new Error('Canvas não encontrado (game-canvas ou test-canvas)');
        }

        this.setupCanvas();

        // Qualidade gráfica (GraphicsQuality): MSAA só se escolhe ao criar o engine; o resto
        // (escala de render, sombras, partículas...) muda ao vivo em applyGraphicsQuality
        this.engineAntialias = GraphicsQuality.preset().antialias;
        this.engine = new BABYLON.Engine(this.canvas, this.engineAntialias, {
            preserveDrawingBuffer: GAME_CONFIG.canvas.preserveDrawingBuffer,
            stencil: false,
            powerPreference: 'high-performance'
        });

        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color3(0.2, 0.6, 0.9);
        // O jogo faz os próprios picks (pickTerrainCell/pickBuildingFirst); o pick automático do Babylon a cada
        // movimento do mouse testava todos os meshes à toa
        this.scene.skipPointerMovePicking = true;
        
        this.setupCamera();
        this.setupLighting();
        this.setupControls();
        this.setupHoverSystem();
        this.startRenderLoop();
        
        log('✅ Babylon.js inicializado');
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
        log(`🎨 Canvas configurado: ${this.canvas.width}x${this.canvas.height}`);
    }

    setupCamera() {
        this.CAMERA_CONSTANTS = { ...CAMERA };

        if (!this.validate(this.CAMERA_CONSTANTS.ISOMETRIC_ALPHA) ||
            !this.validate(this.CAMERA_CONSTANTS.ISOMETRIC_BETA)) {
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

        if (this.validate(this.isometricAngles.alpha, 'number', {absMax: 10}) &&
            this.validate(this.isometricAngles.beta, 'number', {absMax: 10})) {
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
        
        // Filtro da sombra (suave / simples / desligada): applyGraphicsQuality
        this.shadowGenerator = new BABYLON.ShadowGenerator(1024, sunLight);
        this.applyGraphicsQuality();
    }

    /**
     * Aplica a qualidade gráfica (GraphicsQuality) com o jogo rodando: escala de render, sombras, FXAA, água,
     * partículas/nuvens/árvores (WeatherEffects). Chamado na criação da cena e quando o jogador troca no
     * menu ou na pausa. O MSAA fica como o engine nasceu (needsRestart avisa "ao reabrir o jogo").
     */
    applyGraphicsQuality(level = GraphicsQuality.current()) {
        const p = GraphicsQuality.preset(level);
        this.graphicsQuality = level;
        if (!this.engine || !this.scene) return;
        this.engine.setHardwareScalingLevel(1 / p.resolution);

        // Sem sombra dinâmica fica só a sombra falsa no chão; o mapa de sombra nem é renderizado
        this.scene.shadowsEnabled = p.shadows !== 'off';
        const sg = this.shadowGenerator;
        if (sg && p.shadows === 'blur') {
            sg.useBlurExponentialShadowMap = true;
            sg.blurKernel = 16;
        } else if (sg && p.shadows === 'pcf') {
            sg.usePercentageCloserFiltering = true;
            sg.filteringQuality = BABYLON.ShadowGenerator.QUALITY_LOW;
        }

        // FXAA (um passe barato) quando não há MSAA: na média, ou na alta escolhida depois de abrir o jogo sem MSAA
        const wantFxaa = (p.fxaa || p.antialias) && !this.engineAntialias && !!this.camera;
        if (wantFxaa && !this.fxaaPostProcess) {
            this.fxaaPostProcess = new BABYLON.FxaaPostProcess('fxaa', 1.0, this.camera);
        } else if (!wantFxaa && this.fxaaPostProcess) {
            this.fxaaPostProcess.dispose(this.camera);
            this.fxaaPostProcess = null;
        }

        this.gridManager?.setWaterAnimated(p.waterShader);
        this.weatherEffects?.setQuality(p);
        log(`🎨 Qualidade gráfica: ${GraphicsQuality.LABELS[level]}`);
    }
    
    setupControls() {
        if (this.scene && this.scene.onPointerObservable) {
            this.scene.onPointerObservable._observers = [];
            this.scene.onPointerObservable.clear();
            log('🚫 Babylon.js pointer observables desabilitados');
        }

        // ===== DISABLE DEFAULT BABYLON.JS CAMERA CONTROLS =====
        this.camera.detachControl(this.canvas);

        // ===== INITIALIZE SIMCITY-STYLE CAMERA CONTROLS =====
        if (window.SimCityCameraControls) {
            this.cameraControls = new window.SimCityCameraControls(
                this.camera,
                this.canvas,
                this.scene,
                this
            );

            // Configure camera bounds based on grid size
            this.cameraControls.setBounds(-20, 60, -20, 60);
            this.cameraControls.setZoomLimits(15, 80);

            log('🎮 SimCity-style camera controls initialized');
        } else {
            console.warn('⚠️ SimCityCameraControls not found, falling back to basic zoom');
            // Fallback to basic zoom only
            this.canvas.addEventListener('wheel', (event) => {
                try {
                    this.handleIsolatedWheel(event);
                } catch (error) {
                    console.error('❌ Erro no wheel:', error);
                    this.recoverCameraState();
                }
            });
        }

        // ===== BUILDING PLACEMENT MOUSE INTERACTION =====
        this.setupBuildingPlacementControls();

        this.scene.onKeyboardObservable.add((kbInfo) => {
            this.handleKeyboardEvent(kbInfo);
        });

        log('🎮 Controles inicializados: SimCity Camera + Building Placement');
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

        // Rua: clicar e arrastar traça a linha (mouse e dedo); o pan da câmera já fica parado no modo construção
        const roadPointer = (kind, event) => {
            if (!this.buildMode || !this.buildingSystem?.handleRoadPointer) return false;
            const rect = this.canvas.getBoundingClientRect();
            const cell = this.pickTerrainCell(event.clientX - rect.left, event.clientY - rect.top);
            return this.buildingSystem.handleRoadPointer(kind, cell);
        };
        const onRoadMove = event => roadPointer('move', event);
        const onRoadEnd = event => {
            document.removeEventListener('pointermove', onRoadMove);
            document.removeEventListener('pointerup', onRoadEnd);
            document.removeEventListener('pointercancel', onRoadEnd);
            roadPointer(event.type === 'pointercancel' ? 'cancel' : 'up', event);
        };
        this.canvas.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !event.isPrimary) return;
            if (roadPointer('down', event)) {
                document.addEventListener('pointermove', onRoadMove);
                document.addEventListener('pointerup', onRoadEnd);
                document.addEventListener('pointercancel', onRoadEnd);
            }
        });

        // Right click to cancel building mode
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            if (this.buildMode) {
                this.exitBuildMode();
                log('🚫 Building mode cancelled via right-click');
            }
        });

        log('🏗️ Building placement controls initialized');
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

            const gridPos = this.pickTerrainCell(x, y);
            if (gridPos) {
                // Update building preview at this position
                this.buildingSystem.updatePreview(gridPos.x, gridPos.z);
            }

        } catch (error) {
            console.warn('⚠️ Error in building preview mouse move:', error);
        }
    }

    handleBuildingPlacementClick(event) {
        try {
            // Ignore click if mouse was dragged (camera pan)
            if (this.cameraControls && this.cameraControls.mouseHasMoved) {
                this.cameraControls.mouseHasMoved = false;
                return;
            }

            // Get mouse position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // ===== ENHANCED 3D INTERACTION SYSTEM =====
            if (this.buildMode && this.buildingSystem?.previewMode && this.buildingSystem.isRoadType?.(this.buildingSystem.selectedBuildingType)) {
                // Rua: o traçado já construiu no pointerup; aqui só o toque sintetizado do mobile (uma célula)
                this.buildingSystem.placeRoadAtClick(this.pickTerrainCell(x, y));
            } else if (this.buildMode && this.buildingSystem && this.buildingSystem.previewMode) {
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
        const gridPos = this.pickTerrainCell(x, y);
        if (gridPos) {
            // Attempt to place building at this position
            const success = this.buildingSystem.confirmPlacement(gridPos.x, gridPos.z);

            if (success) {
                log(`✅ Building placed successfully at (${gridPos.x}, ${gridPos.z})`);
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

    /**
     * Pick para clique/toque: prédios primeiro, depois o resto. Plaquinhas de obra concluída, rótulos e
     * árvores/decorações na frente não roubam o clique de um prédio (o chão "terrain" também roubava, quando
     * subia acima dos blocos — corrigido em GridManager.applyElevationToTerrain).
     */
    pickBuildingFirst(x, y) {
        const building = this.scene.pick(x, y, m => m.isPickable && m.isEnabled() && m.isVisible && !!m.metadata?.buildingId);
        return building?.hit ? building : this.scene.pick(x, y);
    }

    /**
     * Célula do terreno sob o ponto da tela (posicionamento, prévia, informações do terreno). Acerta o que
     * aparece: os blocos voxel (topo e lados), a água e, nas frestas entre blocos, o chão "terrain" (sempre
     * abaixo do topo dos blocos — GridManager.getTerrainFloorHeight). O ponto num bloco recua um pouco contra a
     * normal, para o clique no lado de uma colina cair na célula dela e não na vizinha.
     */
    pickTerrainCell(x, y) {
        const isTerrainMesh = (mesh) => mesh.isEnabled() && (mesh.name === 'terrain' || mesh.metadata?.terrain === true || mesh.name.startsWith('water_'));
        const pickInfo = this.performRayCast(x, y, isTerrainMesh, 'terrain');
        if (!pickInfo?.hit || !pickInfo.pickedPoint) return null;

        let point = pickInfo.pickedPoint;
        if (pickInfo.pickedMesh?.name !== 'terrain') {
            const normal = pickInfo.getNormal(true, false);
            if (normal) point = point.subtract(normal.scale(0.05));
        }
        return this.gridManager.worldToGrid(point);
    }

    handleBuildingSelection(x, y) {
        // ===== UNIFIED BUILDING SELECTION (same approach as mobile/touch) =====
        // Prédios primeiro (pickBuildingFirst), depois confere metadata.buildingId
        const pickInfo = this.pickBuildingFirst(x, y);

        if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
            // Primary: check metadata.buildingId (set by BuildingSystem on all buildings)
            if (pickInfo.pickedMesh.metadata && pickInfo.pickedMesh.metadata.buildingId) {
                const buildingId = pickInfo.pickedMesh.metadata.buildingId;
                const building = this.buildingSystem.buildings.get(buildingId);
                if (building) {
                    this.selectBuilding(building);
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.playSound('sfx_click', 0.8);
                    }
                    log(`🏢 Building selected: ${building.config.name} at (${building.gridX}, ${building.gridZ})`);
                    return;
                }
            }

            // Fallback: find building by mesh reference
            const building = this.findBuildingByMesh(pickInfo.pickedMesh);
            if (building) {
                this.selectBuilding(building);
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSound('sfx_click', 0.8);
                }
                log(`🏢 Building selected: ${building.config.name} at (${building.gridX}, ${building.gridZ})`);
            } else {
                // Click on terrain or non-building mesh
                this.handleTerrainClick(x, y);
            }
        } else {
            // Click on empty terrain - show terrain info
            this.handleTerrainClick(x, y);
        }
    }

    // ===== OPTIMIZED RAY CASTING SYSTEM =====
    performRayCast(x, y, meshFilter, cacheKey = 'default') {
        // Centralized ray casting with caching for performance
        // Fixed: Use explicit cacheKey parameter instead of trying to modify read-only function.name property
        const fullCacheKey = `${x}_${y}_${cacheKey}`;

        // Simple frame-based cache to avoid duplicate ray casts in same frame
        const currentFrame = this.scene.getFrameId ? this.scene.getFrameId() : Date.now();
        if (this.rayCastCache && this.rayCastCache.frame === currentFrame && this.rayCastCache[fullCacheKey]) {
            return this.rayCastCache[fullCacheKey];
        }

        // Perform ray cast
        const pickInfo = this.scene.pick(x, y, meshFilter);

        // Initialize cache if needed
        if (!this.rayCastCache || this.rayCastCache.frame !== currentFrame) {
            this.rayCastCache = { frame: currentFrame };
        }

        // Cache result
        this.rayCastCache[fullCacheKey] = pickInfo;
        return pickInfo;
    }

    // ===== OPTIMIZED BUILDING MESH LOOKUP =====
    findBuildingByMesh(mesh) {
        // Single iteration combining both search strategies for optimal performance
        const meshName = mesh.name;

        for (const building of this.buildingSystem.buildings.values()) {
            // Primary search: direct mesh reference comparison (fastest)
            if (building.mesh === mesh) {
                return building;
            }

            // Secondary search: mesh name comparison (fallback within same iteration)
            if (building.mesh && building.mesh.name === meshName) {
                return building;
            }
        }

        return null;
    }

    handleTerrainClick(x, y) {
        const gridPos = this.pickTerrainCell(x, y);
        if (gridPos) {
            // Get terrain type
            const terrainType = this.gridManager.getTerrainType(gridPos.x, gridPos.z);

            // Show terrain information in UI
            if (this.uiManager) {
                this.uiManager.showTerrainInfo(gridPos.x, gridPos.z, terrainType);
            }

            // Clear building selection
            this.deselectBuilding();

            log(`🌍 Terrain clicked: ${terrainType} at (${gridPos.x}, ${gridPos.z})`);
        }
    }

    handleIsolatedWheel(event) {
        if (!this.camera) return;

        const deltaY = event.deltaY;
        if (!this.validate(deltaY)) return;

        try {
            const zoomSensitivity = 2;
            const deltaRadius = deltaY > 0 ? zoomSensitivity : -zoomSensitivity;
            const newRadius = this.camera.radius + deltaRadius;

            this.camera.radius = Math.max(
                this.camera.lowerRadiusLimit,
                Math.min(this.camera.upperRadiusLimit, newRadius)
            );

            if (this.isometricAngles &&
                this.validate(this.isometricAngles.alpha, 'number', {absMax: 10}) &&
                this.validate(this.isometricAngles.beta, 'number', {absMax: 10})) {

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
        // Durante o tutorial ou com popup aberto nada simula; só o HUD se atualiza (o tour mostra valores reais).
        // gameTime também para: é o relógio das obras e missões.
        if (this.gameState === 'tutorial' || (this.gameState === 'playing' && this.pauseReasons.size > 0)) {
            this.uiManager?.update(deltaTime);
            // A espera entre obras corre em tempo real: congelada, ela travava o "Construir" durante guias e popups
            // (a obra colocada fica em 0% até o jogo voltar a rodar)
            this.buildingSystem?.updateBuildingCooldown(deltaTime);
            return;
        }
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
            // Trânsito anda no tempo de jogo (acelera com 2x/3x, para na pausa: só roda aqui)
            this.cityLifeSystem.update(deltaTime * this.timeScale);
        }

        if (this.questSystem) {
            this.questSystem.update(deltaTime * this.timeScale);
        }
        
        if (this.eventSystem) {
            this.eventSystem.update(deltaTime * this.timeScale);
        }

        if (this.gameOverSystem) {
            this.gameOverSystem.update(deltaTime * this.timeScale);
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

    // ===== Monitoramento de memória e ferramentas de debug: js/core/game/Diagnostics.js (4 métodos) =====

    // ===== SISTEMA DE RELÓGIO =====
    initializeGameClock() {
        this.gameStartTime = new Date();
        this.gameClockTime = new Date(this.gameStartTime);

        const hours = this.gameClockTime.getHours();
        const minutes = this.gameClockTime.getMinutes();
        this.dayNightCycle = (hours + minutes / 60) / 24;

        log(`🕐 Relógio iniciado: ${this.formatGameTime()}`);
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

        // Clima real por cima do dia/noite: nublado escurece, sol forte esquenta a luz, chuva acinzenta o céu
        this.weatherEffects?.applyToLighting(ambientLight);
    }

    // Clima real da cidade do jogador no mundo 3D (WeatherEffects). current = WeatherService.parse(...).current
    applyWeather(current) {
        if (!this.scene) return;
        if (!this.weatherEffects) this.weatherEffects = new WeatherEffects(this);
        this.weatherEffects.apply(current);
    }

    getDayNightState() {
        const hours = this.gameClockTime.getHours();
        return (hours >= 6 && hours < 18) ? 'day' : 'night';
    }

    handleDayNightTransition(fromState, toState) {
        log(`🌅 Transição: ${fromState} -> ${toState}`);

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

        log('🎮 Sistema de hover configurado (apenas ESC)');
    }

    // ===== CONTROLE DE JOGO =====
    startNewGame() {
        log('🎮 Iniciando novo jogo...');

        if (!this.initialized) {
            console.error('❌ Sistemas não inicializados');
            return false;
        }

        this.gameState = 'playing';
        this.gameTime = 0;
        this.timeScale = 1;
        this.tutorialDone = false; // TutorialSystem.complete() libera o save

        this.initializeGameClock();

        if (this.resourceManager) {
            this.resourceManager.reset();
            this.treeSystem?.applyEffects({ fresh: true }); // o reset zera a redução de poluição das árvores
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

        this.applyPlayerProfile();
        this.handleResize();

        // Começa olhando para a área inicial (≥ 80% construível, GridManager.findStartArea): é ali que o
        // tutorial pede a Prefeitura, e o centro do mapa pode cair em colina ou água
        const start = this.gridManager.startArea;
        if (start) this.centerCameraOnCityHall(start.x, start.z);

        // Tutorial obrigatório: o jogo fica congelado ('tutorial') até ele terminar,
        // e é nele que o jogador constrói a prefeitura.
        this.gameState = 'tutorial';
        this.tutorialSystem.start();

        log('✅ Novo jogo iniciado');
        return true;
    }

    addCityHallLightingEffects(cityHallBuilding) {
        if (!cityHallBuilding || !cityHallBuilding.mesh || !this.scene) {
            return;
        }

        try {
            log('💡 Adicionando efeitos de iluminação...');

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

            log('✅ Efeitos de iluminação criados');

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
            log(`📷 Centralizando câmera na Prefeitura em (${gridX}, ${gridZ})`);

            // Use SimCityCameraControls for smooth camera transition if available
            if (this.cameraControls && typeof this.cameraControls.centerCameraOn === 'function') {
                this.cameraControls.centerCameraOn(worldPos.x, worldPos.z, 25);
                log('✅ Câmera centralizada com transição suave');
            } else {
                // Fallback to direct camera positioning
                const targetPosition = new BABYLON.Vector3(worldPos.x, 0, worldPos.z);
                const beforeState = this.getCameraState();

                this.camera.setTarget(targetPosition);
                this.camera.radius = 25;

                this.validateCameraPositionChange('centerCameraOnCityHall', beforeState);

                if (this.isometricAngles &&
                    this.validate(this.isometricAngles.alpha, 'number', {absMax: 10}) &&
                    this.validate(this.isometricAngles.beta, 'number', {absMax: 10})) {

                    this.camera.alpha = this.isometricAngles.alpha;
                    this.camera.beta = this.isometricAngles.beta;
                } else {
                    console.warn('⚠️ Ângulos corrompidos, usando valores seguros');
                    this.camera.alpha = -Math.PI / 4;
                    this.camera.beta = Math.PI / 3.5;
                    this.isometricAngles = { alpha: -Math.PI / 4, beta: Math.PI / 3.5 };
                }

                log('✅ Câmera centralizada (fallback direto)');
            }

        } catch (error) {
            console.error('❌ Erro ao centralizar câmera:', error);
        }
    }

    // ===== CONTROLES DE JOGO =====
    /**
     * Continua um jogo salvo (conteúdo de getSaveData, já validado por SaveSystem.load).
     * Ordem importa: recursos → árvores → prédios (as árvores salvas não incluem as derrubadas pelas obras,
     * e os recursos salvos já contêm o efeito de prédios, árvores e eventos: nada é reaplicado).
     * O tutorial inicial não roda de novo. Se algo der errado, avisa e começa um jogo novo.
     */
    loadGame(saveData) {
        log('📁 Carregando jogo...');

        if (!this.initialized) {
            console.error('❌ Sistemas não inicializados');
            return false;
        }

        try {
            this.gameState = 'loading'; // nada simula enquanto o mundo é remontado
            this.pauseReasons.clear();
            if (this.buildMode) this.exitBuildMode();
            this.deselectBuilding?.();

            // Tempo e relógio do jogo
            this.gameTime = Number(saveData.gameTime) || 0;
            this.timeScale = [1, 2, 3].includes(saveData.timeScale) ? saveData.timeScale : 1;
            if (saveData.gameClockTime) {
                this.gameStartTime = new Date(saveData.gameStartTime || saveData.gameClockTime);
                this.gameClockTime = new Date(saveData.gameClockTime);
                const hours = this.gameClockTime.getHours() + this.gameClockTime.getMinutes() / 60;
                this.dayNightCycle = hours / 24;
            } else {
                this.initializeGameClock();
            }
            this.lastDayNightState = null; // sem aviso de "amanheceu" ao carregar
            this.updateDayNightLighting();

            // Perfil (dificuldade, clima, HUD) sem mexer no orçamento: ele vem do save
            this.applyPlayerProfile({ resetBudget: false });

            this.resourceManager.loadData(saveData.resources);
            this.treeSystem?.loadData(saveData.trees);
            this.buildingSystem.loadData(saveData.buildings);
            this.questSystem.loadData(saveData.quests);
            this.eventSystem?.loadData(saveData.events);
            this.studySystem?.loadSaveData(saveData.studies);
            this.loanManager?.loadData(saveData.loans);
            if (this.tutorialSystem && saveData.tutorial) {
                this.tutorialSystem.lessonsDeferred = !!saveData.tutorial.lessonsDeferred;
            }
            this.tutorialDone = true;

            this.uiManager?.initialize();
            this.uiManager?.updateTimeScaleUI(this.timeScale);
            this.questSystem.updateQuestUI();
            this.handleResize();
            this.restoreCamera(saveData.camera);

            this.autoSaveTimer = 0;
            this.gameState = 'playing';
            log('✅ Jogo carregado');
            return true;

        } catch (error) {
            console.warn('⚠️ Erro ao carregar o jogo salvo, começando um novo:', error);
            gameAlert('Jogo salvo com problema', 'Não foi possível abrir o jogo salvo. Vamos começar um jogo novo.', 'warning');
            this.buildingSystem?.clearAllBuildings();
            return this.startNewGame();
        }
    }

    // Câmera: alvo (x, z), zoom e rotação, pelos alvos do SimCityCameraControls (o loop dele converge a câmera)
    getCameraSaveData() {
        const controls = this.cameraControls;
        if (!controls?.targetPosition) return null;
        return {
            x: controls.targetPosition.x,
            z: controls.targetPosition.z,
            radius: controls.targetRadius,
            alpha: controls.targetAlpha
        };
    }

    restoreCamera(camera) {
        const controls = this.cameraControls;
        const valid = camera && [camera.x, camera.z, camera.radius, camera.alpha].every(Number.isFinite);
        if (!valid || !controls) {
            const start = this.gridManager.startArea;
            if (start) this.centerCameraOnCityHall(start.x, start.z);
            return;
        }
        controls.centerCameraOn(camera.x, camera.z, camera.radius);
        controls.targetAlpha = camera.alpha;
        // Já na posição: sem "voo" da câmera ao abrir o jogo
        this.camera.setTarget(new BABYLON.Vector3(camera.x, 0, camera.z));
        this.camera.radius = camera.radius;
        this.camera.alpha = camera.alpha;
    }

    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.uiManager.showPauseOverlay();
            log('⏸️ Jogo pausado');
        }
    }

    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.uiManager.hidePauseOverlay();
            log('▶️ Jogo retomado');
        }
    }

    // Perfil do jogador (PlayerProfile): a idade define a dificuldade (DIFFICULTY_BY_AGE) e a cidade, o clima do HUD
    // resetBudget: false ao continuar um jogo salvo (o orçamento vem do save)
    applyPlayerProfile({ resetBudget = true } = {}) {
        const profile = PlayerProfile.getActive();
        this.difficulty = PlayerProfile.difficultyForAge(profile ? profile.age : 12);
        this.eventSystem?.setDifficulty(this.difficulty.events);
        if (resetBudget) {
            const budget = this.resourceManager.resources.budget;
            budget.current = Math.round(GAME_CONFIG.resources.initialBudget * this.difficulty.budget);
        }
        log(`👤 Jogador: ${PlayerProfile.displayName()} · dificuldade ${this.difficulty.label}`);
        this.uiManager?.initPlayerHud();
    }

    // Pausa leve: popups informativos chamam holdPause ao abrir e releasePause ao fechar.
    // O jogo volta sozinho quando o último motivo sai; não mexe no gameState nem no menu de pausa.
    holdPause(reason) {
        this.pauseReasons.add(reason);
        this.uiManager?.updateSoftPauseBadge?.();
    }

    releasePause(reason) {
        this.pauseReasons.delete(reason);
        this.uiManager?.updateSoftPauseBadge?.();
    }

    isSimulationRunning() {
        return this.gameState === 'playing' && this.pauseReasons.size === 0;
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

        log(`⏱️ Velocidade alterada: ${speedInfo}`);

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
        this.createPlacementOverlay(buildingType);
        this.showCancelBuildButton(buildingType);
        log(`🏗️ Modo construção: ${buildingType}`);
    }

    // Botão visível para sair do modo construção (o mesmo que Esc e botão direito)
    showCancelBuildButton(buildingType) {
        let button = document.getElementById('cancel-build-btn');
        if (!button) {
            button = document.createElement('button');
            button.id = 'cancel-build-btn';
            button.className = 'cancel-build-btn';
            button.addEventListener('click', () => this.exitBuildMode());
            document.getElementById('game-screen')?.appendChild(button);
        }
        const name = this.buildingSystem?.buildingTypes.get(buildingType)?.name || 'construção';
        const keyHint = this.uiManager?.isMobile ? '' : ' <small>(Esc)</small>';
        button.innerHTML = `✖ Cancelar ${name}${keyHint}`;
    }

    exitBuildMode() {
        this.buildMode = false;
        this.currentBuildingType = null;
        this.canvas.style.cursor = 'grab';

        // Clear building system preview mode
        if (this.buildingSystem && this.buildingSystem.previewMode) {
            this.buildingSystem.stopPreviewMode();
        }

        // Clear placement overlay
        this.clearPlacementOverlay();
        document.getElementById('cancel-build-btn')?.remove();

        // Clear UI selection and feedback
        this.uiManager.clearBuildingSelection();
        this.uiManager.hideBuildingPlacementFeedback();
        // Sem obra, o painel "construction" não está mais aberto (senão o Esc nunca chega à pausa)
        if (this.uiManager.uiState.currentOpenPanel === 'construction') this.uiManager.updatePanelState(null);

        log('🏗️ Modo construção desativado');
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
            log('🔍 Preview cancelado');
        }
    }

    // ===== Seleção de edifícios e overlay de construção: js/core/game/SelectionVisuals.js (11 métodos) =====

    // ===== EVENTOS =====
    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameState === 'playing') {
                this.pauseGame();
            }
        });

        // Esc cancela a construção de qualquer lugar (o teclado do Babylon só recebe a tecla com o canvas em foco,
        // e depois de escolher o prédio no menu o foco fica no botão)
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.buildMode) {
                this.exitBuildMode();
                log('🚫 Construção cancelada pelo Esc');
            }
        });

        // Esc sem nada aberto nem selecionado abre a pausa (tela de perfil); na pausa, volta ao jogo.
        // Em captura, antes dos outros Esc: decide pelo estado de antes de eles fecharem algo
        // (senão o Esc que fecha um painel também pausaria)
        window.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || event.repeat) return;
            if (this.gameState === 'paused') {
                if (!this.uiManager?.isInfoPopupOpen()) this.resumeGame();
            } else if (this.gameState === 'playing' && this.isIdleForEscPause()) {
                this.pauseGame();
            }
        }, true);
    }

    /** Nada para o Esc fechar ou cancelar: sem construção, seleção, painel, popup, tutorial ou gaveta do mobile. */
    isIdleForEscPause() {
        const ui = this.uiManager;
        return !this.buildMode && !this.buildingSystem?.previewMode && !this.selectedBuilding &&
            !this.tutorialSystem?.isActive && !ui?.uiState?.currentOpenPanel && !ui?.isInfoPopupOpen() &&
            !document.querySelector('.hud-left.active, .hud-right.active') && !ui?.isHudRightVisible?.();
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

            log(`🔄 Canvas redimensionado: ${this.canvas.width}x${this.canvas.height}`);
        }
    }

    // ===== SAVE/LOAD =====
    // Um jogo salvo por perfil (SaveSystem). Só há o que salvar depois do tutorial inicial (antes dele a
    // cidade nem tem prefeitura) e enquanto o jogo não acabou. Pausa, popup e aula aberta podem salvar:
    // ao carregar, o jogo volta rodando.
    canSave() {
        return this.initialized && this.tutorialDone && !!PlayerProfile.getActive() &&
            ['playing', 'paused', 'tutorial'].includes(this.gameState);
    }

    autoSave() {
        if (!this.canSave()) return false;
        // Partida sem volta (água quase no fim/poluição quase no máximo) não sobrescreve o save: ele não seria jogável
        const data = this.getSaveData();
        if (SaveSystem.isLostGame(data)) return false;
        return this.saveSystem.save(data, PlayerProfile.getActive().id, { kind: 'auto' });
    }

    /** Botão "💾 Salvar jogo" da tela de pausa. */
    saveGame() {
        if (!this.canSave()) {
            this.uiManager?.showNotification('Termine o tutorial para poder salvar o jogo.', 'warning');
            return false;
        }
        const ok = this.saveSystem.save(this.getSaveData(), PlayerProfile.getActive().id, { kind: 'manual' });
        this.uiManager?.showNotification(ok
            ? `💾 Jogo salvo! Na próxima vez, escolha ${PlayerProfile.personalize('{nome}')} e "Continuar".`
            : '⚠️ Não foi possível salvar o jogo (o navegador está sem espaço ou bloqueou o salvamento).',
        ok ? 'success' : 'error');
        if (ok) this.autoSaveTimer = 0;
        log(`💾 Jogo salvo manualmente: ${ok}`);
        return ok;
    }

    getSaveData() {
        return {
            gameTime: this.gameTime,
            timeScale: this.timeScale,
            gameStartTime: this.gameStartTime?.getTime() ?? null,
            gameClockTime: this.gameClockTime?.getTime() ?? null,
            resources: this.resourceManager.getSaveData(),
            trees: this.treeSystem ? this.treeSystem.getSaveData() : { cells: [], initialCount: 0 },
            buildings: this.buildingSystem.getSaveData(),
            quests: this.questSystem.getSaveData(),
            events: this.eventSystem.getSaveData(),
            studies: this.studySystem.getSaveData(),
            loans: this.loanManager?.saveData() ?? null,
            tutorial: { lessonsDeferred: !!this.tutorialSystem?.lessonsDeferred },
            camera: this.getCameraSaveData()
        };
    }

    // ===== Monitoramento de memória e ferramentas de debug: js/core/game/Diagnostics.js (2 métodos) =====

    // ===== Seleção de edifícios e overlay de construção: js/core/game/SelectionVisuals.js (2 métodos) =====

    // ===== GETTERS =====
    getGameState() { return this.gameState; }

    // ===== CLEANUP =====
    dispose() {
        if (this.engine) {
            this.engine.dispose();
        }
        log('🗑️ GameManager disposed');
    }
}

// Exportar para escopo global
window.GameManager = GameManager;
log('🎮 GameManager carregado e exportado para window.GameManager');

// ===== FUNÇÕES DE DEBUG GLOBAIS =====
if (DEBUG) window.monitorCamera = () => {
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
                log('✅ Câmera OK:', {
                    alpha: state.alpha.toFixed(3),
                    beta: state.beta.toFixed(3),
                    position: `(${state.position.x.toFixed(1)}, ${state.position.y.toFixed(1)}, ${state.position.z.toFixed(1)})`
                });
            }
        }
    }, 1000);
    
    log('🎮 Monitor de câmera iniciado');
    return monitor;
};

log('🎮 Funções de debug disponíveis: monitorCamera(), getCameraState(), recoverCamera()');