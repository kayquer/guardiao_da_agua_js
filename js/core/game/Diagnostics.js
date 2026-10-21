/**
 * GameManager — Monitoramento de memória e ferramentas de debug
 * Parte da classe GameManager (js/core/GameManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(GameManager, {
    // ===== Validação e recuperação da câmera: js/core/game/CameraGuard.js (10 métodos) =====

    // ===== MONITORAMENTO DE MEMÓRIA =====
    updateMemoryMonitoring(deltaTime) {
        if (!this.memoryMonitoring.enabled) return;

        this.memoryMonitoring.lastCheck += deltaTime;

        if (this.memoryMonitoring.lastCheck >= this.memoryMonitoring.checkInterval) {
            this.checkMemoryUsage();
            this.memoryMonitoring.lastCheck = 0;
        }
    },

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
    },

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
    },

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
    },

    // ===== FUNÇÕES DE DEBUG =====
    exposeDebugFunctions() {
        window.runMemoryTest = () => this.runMemoryStressTest();
        window.getMemoryInfo = () => this.getMemoryInfo();
        window.logMemoryHistory = () => console.table(this.memoryMonitoring.memoryHistory);
        window.getCameraState = () => this.getCameraState();
        window.recoverCamera = () => this.recoverCameraState();
    },

    runMemoryStressTest() {
        log('🧪 Iniciando teste de stress de memória...');

        if (!this.buildingSystem) {
            console.error('❌ BuildingSystem não disponível');
            return;
        }

        const initialMemory = this.getMemoryInfo();
        log(`📊 Memória inicial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

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
                        log(`✅ Edifício ${i + 1}/20: ${buildingType} em (${x}, ${z})`);
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
            log(`📊 Memória após colocação: ${(afterPlacement.heapUsed / 1024 / 1024).toFixed(2)}MB`);

            log('🗑️ Removendo todos os edifícios...');
            placedBuildings.forEach(buildingId => {
                this.buildingSystem.removeBuilding(buildingId);
            });

            if (window.gc) {
                window.gc();
            }

            setTimeout(() => {
                const finalMemory = this.getMemoryInfo();
                log(`📊 Memória final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

                const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
                const diffMB = (memoryDiff / 1024 / 1024).toFixed(2);

                if (memoryDiff > 5 * 1024 * 1024) {
                    console.error(`🚨 POSSÍVEL VAZAMENTO: ${diffMB}MB`);
                } else {
                    log(`✅ TESTE PASSOU: apenas ${diffMB}MB de diferença`);
                }

                log('🧪 Teste de stress concluído');
            }, 2000);
        }, 1000);
    },
});
