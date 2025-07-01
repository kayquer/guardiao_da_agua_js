/**
 * GUARDIÃO DA ÁGUA - GAME MANAGER
 * Classe principal que controla o estado do jogo e coordena todos os sistemas
 */

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
            this.resourceManager = new ResourceManager();

            console.log('🔧 Inicializando BuildingSystem...');
            this.buildingSystem = new BuildingSystem(this.scene, this.gridManager);

            console.log('🔧 Inicializando CityLifeSystem...');
            this.cityLifeSystem = new CityLifeSystem(this.scene, this.gridManager, this.buildingSystem);

            console.log('🔧 Inicializando UIManager...');
            this.uiManager = new UIManager(this);

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

    setupCamera() {
        // Câmera isométrica/ortográfica
        this.camera = new BABYLON.ArcRotateCamera(
            "camera",
            -Math.PI / 4, // Alpha (rotação horizontal)
            Math.PI / 3,  // Beta (rotação vertical)
            30,           // Raio
            BABYLON.Vector3.Zero(),
            this.scene
        );
        
        // Configurações da câmera
        this.camera.setTarget(BABYLON.Vector3.Zero());
        this.camera.attachControl(this.canvas, true);
        
        // Limites de movimento
        this.camera.lowerRadiusLimit = 15;
        this.camera.upperRadiusLimit = 50;
        this.camera.lowerBetaLimit = 0.1;
        this.camera.upperBetaLimit = Math.PI / 2.2;
        
        // Velocidade de movimento
        this.camera.panningSensibility = 100;
        this.camera.wheelPrecision = 50;
        
        // Suavização
        this.camera.inertia = 0.8;
        this.camera.angularSensibilityX = 1000;
        this.camera.angularSensibilityY = 1000;
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
    
    startRenderLoop() {
        this.engine.runRenderLoop(() => {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastUpdateTime;
            
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
            // Posições estratégicas para a cidade inicial
            const starterBuildings = [
                // Infraestrutura de água
                { type: 'water_pump', x: 8, z: 8 },
                { type: 'treatment_plant', x: 12, z: 8 },
                { type: 'water_tank', x: 10, z: 6 },

                // Residências iniciais
                { type: 'house', x: 6, z: 12 },
                { type: 'house', x: 8, z: 12 },
                { type: 'house', x: 10, z: 12 },
                { type: 'apartment', x: 14, z: 12 }
            ];

            let successCount = 0;

            starterBuildings.forEach(building => {
                const success = this.buildingSystem.placeBuilding(building.x, building.z, building.type);
                if (success) {
                    successCount++;
                    console.log(`✅ ${building.type} construído em (${building.x}, ${building.z})`);
                } else {
                    console.warn(`⚠️ Falha ao construir ${building.type} em (${building.x}, ${building.z})`);
                }
            });

            console.log(`🏙️ Cidade inicial criada: ${successCount}/${starterBuildings.length} edifícios`);

            // Ajustar recursos iniciais para cidade funcional
            if (this.resourceManager) {
                this.resourceManager.resources.budget.current += 10000; // Bônus inicial
                console.log('💰 Bônus de orçamento inicial aplicado');
            }

        } catch (error) {
            console.error('❌ Erro ao criar cidade inicial:', error);
        }
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

        // Avançar tempo do jogo (1 segundo real = 1 minuto no jogo por padrão)
        const gameTimeAdvance = deltaTime * this.timeScale * 60; // 60x mais rápido
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

    // ===== SISTEMA DE HOVER/TOOLTIP =====
    setupHoverSystem() {
        if (!this.scene || !this.canvas) return;

        // Adicionar listener de movimento do mouse
        this.canvas.addEventListener('mousemove', (event) => {
            this.handleMouseHover(event);
        });

        // Adicionar listener para sair da tela
        this.canvas.addEventListener('mouseleave', () => {
            this.hideHoverInfo();
        });

        // Adicionar listener de clique para construção
        this.canvas.addEventListener('click', (event) => {
            this.handleMouseClick(event);
        });

        // Adicionar listener de ESC para cancelar preview
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.cancelBuildingPreview();
            }
        });
    }

    handleMouseHover(event) {
        if (!this.gridManager || !this.scene) return;

        try {
            // Obter posição do mouse no canvas
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Criar ray para detectar posição no mundo 3D
            const pickInfo = this.scene.pick(x, y);

            if (pickInfo.hit && pickInfo.pickedPoint) {
                // Converter posição do mundo para grid
                const gridPos = this.gridManager.worldToGrid(pickInfo.pickedPoint);

                // Atualizar preview se estiver ativo
                if (this.buildingSystem && this.buildingSystem.previewMode) {
                    this.buildingSystem.updatePreview(gridPos.x, gridPos.z);
                }

                // Verificar se mudou de posição para hover info
                if (gridPos.x !== this.lastHoverPosition.x || gridPos.z !== this.lastHoverPosition.z) {
                    this.lastHoverPosition = gridPos;

                    // Só mostrar hover info se não estiver em modo preview
                    if (!this.buildingSystem || !this.buildingSystem.previewMode) {
                        this.updateHoverInfo(gridPos.x, gridPos.z, event.clientX, event.clientY);
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro no sistema de hover:', error);
        }
    }

    updateHoverInfo(gridX, gridZ, mouseX, mouseY) {
        if (!this.gridManager || !this.buildingSystem) return;

        // Verificar se está dentro dos limites do grid
        if (gridX < 0 || gridX >= this.gridManager.gridSize ||
            gridZ < 0 || gridZ >= this.gridManager.gridSize) {
            this.hideHoverInfo();
            this.hideTerrainInfo();
            return;
        }

        // Obter informações da célula
        const building = this.buildingSystem.getBuildingAt(gridX, gridZ);
        const terrainType = this.gridManager.getTerrainType(gridX, gridZ);
        const isOccupied = this.gridManager.isOccupied(gridX, gridZ);

        // Criar informações do hover
        let hoverData = {
            position: { x: gridX, z: gridZ },
            mousePosition: { x: mouseX, y: mouseY },
            terrainType: terrainType,
            isOccupied: isOccupied
        };

        if (building) {
            // Informações do edifício
            hoverData.building = {
                name: building.config.name,
                type: building.config.category,
                status: building.active ? 'Ativo' : 'Inativo',
                efficiency: Math.round(building.efficiency * 100) + '%',
                waterProduction: building.config.waterProduction || 0,
                waterConsumption: building.config.waterConsumption || 0,
                pollutionGeneration: building.config.pollutionGeneration || 0,
                maintenanceCost: building.config.maintenanceCost || 0
            };
            this.hideTerrainInfo(); // Esconder info do terreno quando há edifício
        } else {
            // Informações do terreno vazio
            hoverData.empty = {
                buildable: this.gridManager.canPlaceBuilding(gridX, gridZ, 1),
                terrainName: this.getTerrainDisplayName(terrainType)
            };

            // Mostrar informações do terreno no painel direito se não estiver em modo construção
            if (!this.buildingSystem.previewMode) {
                this.showTerrainInfo(terrainType, gridX, gridZ);
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
            content += `
                <div class="tooltip-building">
                    <div class="building-name">${b.name}</div>
                    <div class="building-status">Status: ${b.status}</div>
                    <div class="building-efficiency">Eficiência: ${b.efficiency}</div>
            `;

            if (b.waterProduction > 0) {
                content += `<div class="building-stat">💧 Produção: ${b.waterProduction}L/s</div>`;
            }
            if (b.waterConsumption > 0) {
                content += `<div class="building-stat">🚰 Consumo: ${b.waterConsumption}L/s</div>`;
            }
            if (b.pollutionGeneration > 0) {
                content += `<div class="building-stat">🏭 Poluição: +${b.pollutionGeneration}/s</div>`;
            }
            if (b.maintenanceCost > 0) {
                content += `<div class="building-stat">💰 Manutenção: R$ ${b.maintenanceCost}/min</div>`;
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
    }

    showTerrainInfo(terrainType, gridX, gridZ) {
        const detailsPanel = document.getElementById('details-content');
        if (!detailsPanel) return;

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
                // Converter posição do mundo para grid
                const gridPos = this.gridManager.worldToGrid(pickInfo.pickedPoint);

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
        this.uiManager.updateTimeScaleUI(this.timeScale);
        console.log(`⏱️ Velocidade do jogo: ${this.timeScale}x`);
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
        if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
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
}

// Exportar para escopo global
window.GameManager = GameManager;
console.log('🎮 GameManager carregado e exportado para window.GameManager');
