/**
 * GUARDIÃO DA ÁGUA - BUILDING SYSTEM
 * Sistema de construção e gerenciamento de infraestrutura
 *
 * ===== CLEAN CODE REFACTORING =====
 * Applied Clean Code principles:
 * - Extracted magic numbers to GameConstants.js
 * - Added comprehensive JSDoc documentation
 * - Improved method naming and single responsibility
 * - Standardized building creation pipeline
 * - Enhanced error handling and validation
 */

class BuildingSystem {
    constructor(scene, gridManager, gameManager = null) {
        log('🏗️ Inicializando BuildingSystem...');

        this.scene = scene;
        this.gridManager = gridManager;
        this.gameManager = gameManager;
        
        // Edifícios construídos
        this.buildings = new Map();
        this.buildingCounter = 0;
        
        // Tipos de edifícios disponíveis
        this.buildingTypes = new Map();
        
        // Materiais
        this.materials = new Map();
        
        // Sistema de preview avançado
        this.previewMode = false;
        this.previewMarker = null;
        this.selectedBuildingType = null;
        this.lastPreviewPosition = { x: -1, z: -1 };

        // Rastreamento de recursos para limpeza de memória
        this.dynamicTextures = new Map(); // Rastrear texturas dinâmicas
        this.shadowMeshes = new Map(); // Rastrear sombras
        this.connectionMeshes = new Map(); // Rastrear conexões de terreno

        // Sistema de fila para operações de limpeza (prevenir race conditions)
        this.disposalQueue = [];
        this.isProcessingDisposal = false;
        this.disposalBatchSize = 5; // Processar até 5 disposals por frame

        // Sistema de cooldown para construção
        this.buildingCooldown = {
            active: false,
            duration: 1000, // 1000ms de cooldown (1 segundo)
            lastBuildTime: 0,
            remainingTime: 0
        };

        // Sistema de construção com timer - SUPORTE A MÚLTIPLAS CONSTRUÇÕES SIMULTÂNEAS
        this.constructionQueue = new Map(); // buildingId -> construction data
        this.maxSimultaneousConstructions = 3; // Máximo de 3 construções simultâneas
        this.constructionTimeout = 30000; // 30 segundos timeout para construções
        this.lastConstructionCheck = 0;

        // Throttling para atualizações de eficiência
        this.lastEfficiencyUpdate = 0;

        this.initializeBuildingTypes();
        this.createMaterials();

        // Expor métodos de debug globalmente (só com ?debug)
        if (DEBUG) {
            window.resetConstructionState = () => this.forceResetConstructionState();
            window.getConstructionInfo = () => ({
                activeConstructions: this.constructionQueue.size,
                maxConstructions: this.maxSimultaneousConstructions,
                queueSize: this.constructionQueue.size,
                queue: Array.from(this.constructionQueue.keys())
            });
        }

        log('✅ BuildingSystem inicializado');
        log('🧪 Debug: resetConstructionState() e getConstructionInfo() disponíveis globalmente');
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeBuildingTypes() {
        // structuredClone: cada jogo novo parte de dados limpos (js/data/buildings.js)
        for (const [id, config] of Object.entries(BUILDING_TYPES)) {
            this.addBuildingType(id, structuredClone(config));
        }
        log(`✅ ${this.buildingTypes.size} tipos de edifícios definidos`);
    }

    addBuildingType(id, config) {
        // ===== FEATURE FLAGS: Check if building should be visible in release version =====
        const isVisible = FEATURE_FLAGS.isBuildingVisible(id);
        const isCategoryVisible = FEATURE_FLAGS.isCategoryVisible(config.category);

        this.buildingTypes.set(id, {
            id,
            ...config,
            visible: isVisible && isCategoryVisible // Hide based on feature flags
        });
    }

    // ===== BUILDING UNLOCK STATUS =====
    isBuildingUnlocked(buildingId) {
        // Check with StudySystem if available
        if (this.gameManager && this.gameManager.studySystem) {
            return this.gameManager.studySystem.isBuildingUnlocked(buildingId);
        }
        // Fallback: all buildings unlocked if StudySystem not available
        return true;
    }

    // ===== RESEARCH CENTERS AND UNIVERSITIES: Efficiency bonus system =====
    calculateConstructionCostWithBonuses(buildingTypeId, gridX, gridZ) {
        const buildingType = this.buildingTypes.get(buildingTypeId);
        if (!buildingType) return 0;

        let baseCost = buildingType.cost;
        let totalReduction = 0;

        // Find nearby research buildings that provide cost reduction
        const nearbyResearchBuildings = this.findNearbyResearchBuildings(gridX, gridZ);

        for (const researchBuilding of nearbyResearchBuildings) {
            const config = researchBuilding.config;
            if (config.constructionCostReduction) {
                // Add some randomness within the specified range
                const baseReduction = config.constructionCostReduction;
                const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
                const actualReduction = Math.max(0, baseReduction + randomVariation);
                totalReduction += actualReduction;
            }
        }

        // Cap total reduction at 40% to prevent abuse
        totalReduction = Math.min(totalReduction, 0.4);

        const finalCost = Math.round(baseCost * (1 - totalReduction));

        if (totalReduction > 0) {
            log(`🔬 Construction cost reduction: ${(totalReduction * 100).toFixed(1)}% (${baseCost} → ${finalCost})`);
        }

        return finalCost;
    }

    findNearbyResearchBuildings(gridX, gridZ) {
        const nearbyBuildings = [];

        for (const building of this.buildings.values()) {
            const config = building.config;

            // Check if building provides research bonuses
            if (config.constructionCostReduction || config.nearbyEfficiencyBonus) {
                const distance = Math.sqrt(
                    Math.pow(building.gridX - gridX, 2) +
                    Math.pow(building.gridZ - gridZ, 2)
                );

                // Check if within effect radius
                if (distance <= config.effectRadius) {
                    nearbyBuildings.push(building);
                }
            }
        }

        return nearbyBuildings;
    }

    calculateBuildingEfficiency(building) {
        if (!building || !building.config) return 1.0;

        let baseEfficiency = building.efficiency || 1.0;
        let bonusEfficiency = 0;

        // Find nearby research buildings that provide efficiency bonuses
        const nearbyResearchBuildings = this.findNearbyResearchBuildings(building.gridX, building.gridZ);

        for (const researchBuilding of nearbyResearchBuildings) {
            const config = researchBuilding.config;
            if (config.nearbyEfficiencyBonus) {
                // Add some randomness within the specified range
                const baseBonus = config.nearbyEfficiencyBonus;
                const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
                const actualBonus = Math.max(0, baseBonus + randomVariation);
                bonusEfficiency += actualBonus;
            }
        }

        // Cap total efficiency bonus at 50% to prevent abuse
        bonusEfficiency = Math.min(bonusEfficiency, 0.5);

        const finalEfficiency = baseEfficiency + bonusEfficiency;

        if (bonusEfficiency > 0) {
            log(`🎓 Building efficiency bonus: +${(bonusEfficiency * 100).toFixed(1)}% for ${building.config.name}`);
        }

        return Math.min(finalEfficiency, 2.0); // Cap at 200% efficiency
    }
    
    createMaterials() {
        log('🎨 Criando materiais estilo Minecraft para edifícios...');

        // Material base para edifícios estilo voxel
        const baseMaterial = new BABYLON.StandardMaterial("buildingBase", this.scene);
        baseMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        baseMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Menos brilho para estilo Minecraft
        baseMaterial.backFaceCulling = false; // Para melhor visualização dos blocos
        this.materials.set('base', baseMaterial);

        // Materiais por categoria com cores estilo Minecraft
        const categories = {
            water: new BABYLON.Color3(0.25, 0.56, 1.0),       // Azul água Minecraft
            treatment: new BABYLON.Color3(0.35, 0.70, 0.35),  // Verde mais saturado
            storage: new BABYLON.Color3(1.0, 0.65, 0.0),      // Laranja mais vibrante
            residential: new BABYLON.Color3(0.55, 0.35, 0.20), // Marrom madeira
            power: new BABYLON.Color3(1.0, 1.0, 0.0),         // Amarelo energia
            infrastructure: new BABYLON.Color3(0.5, 0.5, 0.5), // Cinza concreto
            zoning: new BABYLON.Color3(0.8, 0.8, 0.8),        // Cinza claro
            commercial: new BABYLON.Color3(0.2, 0.8, 0.2),    // Verde comercial
            tourism: new BABYLON.Color3(0.8, 0.2, 0.8),       // Magenta turismo
            industrial: new BABYLON.Color3(0.6, 0.6, 0.6),    // Cinza industrial
            public: new BABYLON.Color3(0.9, 0.9, 0.1)         // Amarelo público
        };
        
        Object.entries(categories).forEach(([category, color]) => {
            const material = new BABYLON.StandardMaterial(`material_${category}`, this.scene);
            material.diffuseColor = color;
            material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            this.materials.set(category, material);
        });
        
        // Material de preview
        const previewMaterial = new BABYLON.StandardMaterial("preview", this.scene);
        previewMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
        previewMaterial.alpha = 0.5;
        this.materials.set('preview', previewMaterial);
        
        // Material de erro
        const errorMaterial = new BABYLON.StandardMaterial("error", this.scene);
        errorMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        errorMaterial.alpha = 0.5;
        this.materials.set('error', errorMaterial);
    }
    
    /**
     * Helper para fazer merge de meshes com configurações corretas
     * @param {BABYLON.Mesh[]} meshes - Array de meshes para combinar
     * @param {string} name - Nome do mesh resultante
     * @param {BABYLON.Material} [material=null] - Material opcional para aplicar antes do merge
     * @returns {BABYLON.Mesh} - Mesh combinado visível
     */
    mergeVisibleMeshes(meshes, name, material = null) {
        // ✅ FIX: Aplicar material temporário ANTES do merge para preservar visibilidade
        if (material) {
            meshes.forEach(mesh => {
                if (mesh && mesh.material === undefined) {
                    mesh.material = material;
                }
            });
        } else {
            // Criar material padrão se nenhum for fornecido
            const defaultMaterial = new BABYLON.StandardMaterial(`temp_${name}`, this.scene);
            defaultMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            defaultMaterial.backFaceCulling = false;
            meshes.forEach(mesh => {
                if (mesh && !mesh.material) {
                    mesh.material = defaultMaterial;
                }
            });
        }
        
        const merged = BABYLON.Mesh.MergeMeshes(
            meshes,
            true,  // disposeSource - libera memória dos originais
            false, // allow32BitsIndices
            undefined, // meshSubclass
            false, // subdivideWithSubMeshes
            true   // multiMultiMaterials - preserva materiais
        );
        
        if (merged) {
            merged.name = name;
            merged.isVisible = true;
            merged.setEnabled(true);
        }
        
        return merged;
    }
    
    // ===== CONSTRUÇÃO =====
    canPlaceBuilding(gridX, gridZ, buildingTypeId) {
        const buildingType = this.buildingTypes.get(buildingTypeId);
        if (!buildingType) {
            console.warn(`❌ Tipo de edifício inválido: ${buildingTypeId}`);
            return { canPlace: false, reason: 'Tipo de edifício inválido' };
        }

        // Verificar se há espaço no grid
        // Para edifícios que requerem água, usar validação especial
        if (buildingType.requirements && buildingType.requirements.terrain &&
            buildingType.requirements.terrain.includes('water')) {
            // Validação especial para edifícios que podem ser construídos na água
            if (!this.canPlaceBuildingOnWater(gridX, gridZ, buildingType.size)) {
                console.warn(`❌ Área ocupada ou fora dos limites em (${gridX}, ${gridZ})`);
                return { canPlace: false, reason: 'Área ocupada ou fora dos limites' };
            }
        } else {
            // Validação normal para outros edifícios
            if (!this.gridManager.canPlaceBuilding(gridX, gridZ, buildingType.size)) {
                console.warn(`❌ Área ocupada ou fora dos limites em (${gridX}, ${gridZ})`);
                return { canPlace: false, reason: 'Área ocupada ou fora dos limites' };
            }
        }

        // Verificar requisitos de terreno
        if (buildingType.requirements) {
            const terrainType = this.gridManager.getTerrainType(gridX, gridZ);

            if (buildingType.requirements.terrain &&
                !buildingType.requirements.terrain.includes(terrainType)) {
                const terrainNames = {
                    'water': 'água',
                    'grassland': 'campo',
                    'lowland': 'planície',
                    'hill': 'colina'
                };
                const currentTerrainName = terrainNames[terrainType] || terrainType;
                const requiredTerrainNames = buildingType.requirements.terrain.map(t => terrainNames[t] || t).join(', ');

                return {
                    canPlace: false,
                    reason: `Você não pode construir ${buildingType.name} em ${currentTerrainName}. Requer: ${requiredTerrainNames}`,
                    userFriendly: true
                };
            }

            if (buildingType.requirements.nearWater) {
                if (!this.isNearWater(gridX, gridZ, buildingType.size)) {
                    console.warn(`❌ Deve estar próximo à água em (${gridX}, ${gridZ})`);
                    return {
                        canPlace: false,
                        reason: `${buildingType.name} deve estar próximo à água`,
                        userFriendly: true
                    };
                }
            }
        }

        log(`✅ Pode construir ${buildingType.name} em (${gridX}, ${gridZ})`);
        return {
            canPlace: true,
            reason: `Você pode construir ${buildingType.name} aqui`,
            userFriendly: true
        };
    }

    placeBuilding(gridX, gridZ, buildingTypeId) {
        // Verificar cooldown de construção
        if (this.isBuildingOnCooldown()) {
            const remainingSeconds = Math.ceil(this.buildingCooldown.remainingTime / 1000);
            this.showNotification(`Aguarde ${remainingSeconds} segundos antes de construir novamente...`, 'warning');
            console.warn(`⚠️ Construção em cooldown: ${remainingSeconds}s restantes`);

            // Mostrar indicador visual de cooldown
            if (this.gameManager && this.gameManager.uiManager) {
                this.gameManager.uiManager.showBuildingCooldown(
                    this.buildingCooldown.remainingTime,
                    this.buildingCooldown.duration
                );
            }

            return null;
        }

        const buildingType = this.buildingTypes.get(buildingTypeId);
        if (!buildingType) {
            console.error(`❌ Tipo de edifício não encontrado: ${buildingTypeId}`);
            return null;
        }

        // Verificar se pode construir
        const canPlace = this.canPlaceBuilding(gridX, gridZ, buildingTypeId);
        if (!canPlace.canPlace) {
            this.showNotification(canPlace.reason, 'error');
            console.warn(`⚠️ Não é possível construir: ${canPlace.reason}`);
            return null;
        }

        // ===== RESEARCH CENTERS AND UNIVERSITIES: Apply cost reduction =====
        const actualCost = this.calculateConstructionCostWithBonuses(buildingTypeId, gridX, gridZ);

        // Verificar orçamento (usando custo com desconto)
        if (window.gameManager && gameManager.resourceManager) {
            if (!gameManager.resourceManager.canAfford(actualCost)) {
                this.showNotification(`Orçamento insuficiente! Custo: R$ ${actualCost.toLocaleString()}`, 'error');
                console.warn(`⚠️ Orçamento insuficiente: R$ ${actualCost} (original: R$ ${buildingType.cost}, disponível: R$ ${gameManager.resourceManager.resources.budget.current})`);
                return null;
            }
        }

        // Verificar se atingiu o limite de construções simultâneas
        // (verificado depois de canPlaceBuilding e budget para que o aviso só apareça
        // quando o local e o orçamento estão corretos, mas a fila está cheia)
        if (this.constructionQueue.size >= this.maxSimultaneousConstructions) {
            // Verificar se há construções travadas antes de bloquear
            this.validateConstructionState();

            if (this.constructionQueue.size >= this.maxSimultaneousConstructions) {
                this.showNotification(`⚠️ Máximo de ${this.maxSimultaneousConstructions} construções simultâneas atingido`, 'warning');
                console.warn(`⚠️ Máximo de ${this.maxSimultaneousConstructions} construções simultâneas atingido - aguarde a conclusão de uma construção`);
                return null;
            }
        }
        
        // Calcular tempo de construção baseado no custo
        const constructionTime = this.calculateConstructionTime(buildingType.cost);

        // Criar edifício em estado de construção
        const building = this.createBuildingMesh(gridX, gridZ, buildingType);
        if (!building) return null;

        // Registrar no sistema
        const buildingId = `building_${this.buildingCounter++}`;
        const buildingData = {
            id: buildingId,
            type: buildingTypeId,
            gridX,
            gridZ,
            mesh: building,
            config: buildingType,
            constructionTime: Date.now(),
            active: false, // Inativo durante construção
            efficiency: 0.0, // Sem eficiência durante construção
            connections: new Set(), // Para infraestrutura conectável
            underConstruction: true,
            constructionDuration: constructionTime,
            constructionStartTime: Date.now()
        };

        // ===== FIX: Update mesh metadata with buildingId for touch interaction =====
        if (building.metadata) {
            building.metadata.buildingId = buildingId;
        } else {
            building.metadata = {
                building: true,
                buildingId: buildingId,
                buildingType: buildingType.id,
                gridX,
                gridZ
            };
        }
        log(`✅ Mesh metadata updated with buildingId: ${buildingId}`);

        // ===== BUILDING CREATION LOG =====
        log(`🏗️ Building created: ${buildingId} (${buildingTypeId}) at (${gridX}, ${gridZ})`);
        log(`   📊 Total buildings: ${this.buildings.size + 1}`);

        this.buildings.set(buildingId, buildingData);

        // Iniciar processo de construção
        this.startConstruction(buildingData);

        // Ocupar área no grid
        this.gridManager.occupyArea(gridX, gridZ, buildingType.size);

        // Limpar decorações na área de construção
        if (this.gridManager.clearDecorationsInArea) {
            this.gridManager.clearDecorationsInArea(gridX, gridZ, buildingType.size);
        }

        // Verificar e criar conexões para infraestrutura
        if (this.isInfrastructureBuilding(buildingType)) {
            this.updateInfrastructureConnections(buildingData);
        }

        // Aplicar efeitos nos recursos
        this.applyBuildingEffects(buildingData, true);

        // ===== RESEARCH CENTERS AND UNIVERSITIES: Deduct actual cost with bonuses =====
        if (window.gameManager && gameManager.resourceManager) {
            const success = gameManager.resourceManager.spendBudget(actualCost);
            if (success) {
                const savings = buildingType.cost - actualCost;
                if (savings > 0) {
                    log(`💰 Custo deduzido: R$ ${actualCost.toLocaleString()} (economia de R$ ${savings.toLocaleString()} graças à pesquisa!)`);
                } else {
                    log(`💰 Custo deduzido: R$ ${actualCost.toLocaleString()}`);
                }
            } else {
                console.error(`❌ Falha ao deduzir custo: R$ ${actualCost.toLocaleString()}`);
            }
        }

        // ===== AUDIO FEEDBACK PARA COLOCAÇÃO =====
        this.playBuildingPlacementAudio(buildingType);

        // Notificar sistema de vida urbana se for uma estrada
        if (buildingType.id === 'road' && window.gameManager && window.gameManager.cityLifeSystem) {
            window.gameManager.cityLifeSystem.onRoadBuilt();
        }

        // Ativar cooldown de construção
        this.activateBuildingCooldown();

        // Mostrar notificação de sucesso
        this.showNotification(`${buildingType.name} construído com sucesso!`, 'success');

        // Verificar balanço de energia após construção
        if (buildingType.powerConsumption && window.gameManager && gameManager.resourceManager) {
            const electricity = gameManager.resourceManager.getElectricity();
            if (electricity.consumption > electricity.generation) {
                this.showEnergyShortageNotification(electricity);
            }
        }

        log(`🏗️ Edifício construído: ${buildingType.name} em (${gridX}, ${gridZ})`);
        this.gameManager?.tutorialSystem?.onBuildingPlaced(buildingData);
        return buildingData;
    }
    
    // ===== Meshes e materiais dos edifícios: js/systems/building/BuildingMeshes.js (43 métodos) =====
    
    // ===== REMOÇÃO =====
    removeBuilding(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building) return false;

        // Remover efeitos nos recursos imediatamente
        this.applyBuildingEffects(building, false);

        // Liberar área no grid imediatamente
        this.gridManager.freeArea(building.gridX, building.gridZ, building.config.size);

        // Remover do sistema imediatamente
        this.buildings.delete(buildingId);

        // Remover conexões de infraestrutura
        if (this.isInfrastructureBuilding(building.config)) {
            this.removeInfrastructureConnections(building);
        }

        // Remover label do edifício e outros elementos visuais
        if (building.mesh) {
            this.removeBuildingNameLabel(building.mesh);
            this.removeRentalIcon(building);
            this.removePowerShortageIcon(building);

            // Remover indicador de seleção se existir
            if (window.gameManager && window.gameManager.selectedBuilding === building) {
                window.gameManager.removeSelectionIndicator(building);
                window.gameManager.selectedBuilding = null;
            }
        }

        // Adicionar à fila de disposal para processamento assíncrono
        if (building.mesh) {
            this.queueForDisposal(building.mesh);
        }

        // ===== ZERO-ERROR POLICY FIX: Validar config antes de acessar propriedades =====
        const buildingName = (building.config && building.config.name)
            ? building.config.name
            : 'Edifício Desconhecido';
        log(`🗑️ Edifício removido: ${buildingName}`);
        return true;
    }

    // Sistema de fila para disposal assíncrono
    queueForDisposal(mesh) {
        this.disposalQueue.push({
            mesh: mesh,
            meshName: mesh.name,
            timestamp: Date.now()
        });

        // Processar fila se não estiver sendo processada
        if (!this.isProcessingDisposal) {
            this.processDisposalQueue();
        }
    }

    processDisposalQueue() {
        if (this.disposalQueue.length === 0) {
            this.isProcessingDisposal = false;
            return;
        }

        this.isProcessingDisposal = true;

        // Verificar se a fila não está crescendo indefinidamente
        if (this.disposalQueue.length > 100) {
            console.warn(`⚠️ Fila de disposal muito grande (${this.disposalQueue.length} itens), limpando...`);
            // Processar todos os itens imediatamente para evitar memory leak
            while (this.disposalQueue.length > 0) {
                const item = this.disposalQueue.shift();
                if (item) {
                    try {
                        this.performDisposal(item);
                    } catch (error) {
                        console.error('❌ Erro durante limpeza forçada:', error);
                    }
                }
            }
            this.isProcessingDisposal = false;
            return;
        }

        // Processar até disposalBatchSize itens por frame
        const batchSize = Math.min(this.disposalBatchSize, this.disposalQueue.length);

        for (let i = 0; i < batchSize; i++) {
            const item = this.disposalQueue.shift();
            if (item) {
                try {
                    this.performDisposal(item);
                } catch (error) {
                    console.error(`❌ Erro ao processar disposal de ${item.meshName}:`, error);
                }
            }
        }

        // Continuar processamento no próximo frame se ainda há itens
        if (this.disposalQueue.length > 0) {
            requestAnimationFrame(() => this.processDisposalQueue());
        } else {
            this.isProcessingDisposal = false;
        }
    }

    performDisposal(item) {
        try {
            const { mesh, meshName } = item;

            // Remover sombra associada
            const shadowMesh = this.shadowMeshes.get(meshName);
            if (shadowMesh && !shadowMesh.isDisposed()) {
                shadowMesh.dispose();
                this.shadowMeshes.delete(meshName);
            }

            // Remover conexão de terreno associada
            const connectionMesh = this.connectionMeshes.get(meshName);
            if (connectionMesh && !connectionMesh.isDisposed()) {
                connectionMesh.dispose();
                this.connectionMeshes.delete(meshName);
            }

            // Remover texturas dinâmicas associadas
            const shadowTexKey = `shadowTex_${meshName}`;
            const shadowTexture = this.dynamicTextures.get(shadowTexKey);
            if (shadowTexture) {
                try {
                    // Verificar se a textura tem o método isDisposed antes de chamar
                    if (typeof shadowTexture.isDisposed === 'function' && !shadowTexture.isDisposed()) {
                        shadowTexture.dispose();
                    } else if (typeof shadowTexture.dispose === 'function') {
                        // Se não tem isDisposed mas tem dispose, chamar dispose diretamente
                        shadowTexture.dispose();
                    }
                } catch (error) {
                    console.warn(`⚠️ Erro ao remover textura ${shadowTexKey}:`, error);
                }
                this.dynamicTextures.delete(shadowTexKey);
            }

            // Remover mesh principal
            if (mesh && !mesh.isDisposed()) {
                mesh.dispose();
            }

        } catch (error) {
            console.warn(`⚠️ Erro durante disposal de ${item.meshName}:`, error);
        }
    }

    // ===== EFEITOS NOS RECURSOS =====
    applyBuildingEffects(building, add = true) {
        const config = building.config;
        
        // Aplicar efeitos se ResourceManager estiver disponível
        if (window.gameManager && gameManager.resourceManager) {
            const resourceManager = gameManager.resourceManager;
            
            // Produção de água (só se não estiver alugado)
            if (config.waterProduction) {
                const isRented = building.isRented || false;
                if (!isRented) {
                    if (add) {
                        resourceManager.addWaterProduction(config.waterProduction * building.efficiency);
                    } else {
                        resourceManager.removeWaterProduction(config.waterProduction * building.efficiency);
                    }
                }
            }
            
            // Redução de poluição
            if (config.pollutionReduction) {
                if (add) {
                    resourceManager.addPollutionReduction(config.pollutionReduction * building.efficiency);
                } else {
                    resourceManager.removePollutionReduction(config.pollutionReduction * building.efficiency);
                }
            }
            
            // Geração de poluição
            if (config.pollutionGeneration) {
                if (add) {
                    resourceManager.addPollutionSource(config.pollutionGeneration);
                } else {
                    resourceManager.removePollutionSource(config.pollutionGeneration);
                }
            }
            
            // Custos de manutenção
            if (config.maintenanceCost) {
                if (add) {
                    resourceManager.addExpense(config.maintenanceCost);
                } else {
                    resourceManager.addExpense(-config.maintenanceCost);
                }
            }
            
            // População (para edifícios residenciais)
            if (config.population) {
                // TODO: Implementar quando ResourceManager suportar mudanças de população
            }

            // Bônus de satisfação (para infraestrutura)
            if (config.satisfactionBonus) {
                if (add) {
                    // Adicionar bônus de satisfação
                    this.addSatisfactionBonus(config.satisfactionBonus);
                } else {
                    // Remover bônus de satisfação
                    this.removeSatisfactionBonus(config.satisfactionBonus);
                }
            }

            // Geração de energia (só se não estiver alugado)
            if (config.powerGeneration) {
                const isRented = building.isRented || false;
                if (!isRented) {
                    if (add) {
                        resourceManager.addElectricityGeneration(config.powerGeneration);
                    } else {
                        resourceManager.removeElectricityGeneration(config.powerGeneration);
                    }
                }
            }

            // Consumo de energia
            if (config.powerConsumption) {
                if (add) {
                    resourceManager.addElectricityConsumption(config.powerConsumption);
                } else {
                    resourceManager.removeElectricityConsumption(config.powerConsumption);
                }
            }

            // Armazenamento de água
            if (config.waterStorage) {
                if (add) {
                    resourceManager.addWaterStorage(config.waterStorage);
                } else {
                    resourceManager.removeWaterStorage(config.waterStorage);
                }
            }

            // Geração de receita (para edifícios comerciais, turísticos e industriais)
            if (config.incomeGeneration) {
                // Verificar se o edifício está alugado (se aplicável)
                const isRented = building.isRented || false;

                if (!isRented) {
                    // Só gera receita se não estiver alugado
                    const incomeAmount = config.incomeGeneration * building.efficiency;
                    if (add) {
                        resourceManager.addIncome(incomeAmount);
                        log(`💰 Receita adicionada: +R$ ${incomeAmount}/min de ${config.name}`);
                    } else {
                        resourceManager.removeIncome(incomeAmount);
                        log(`💰 Receita removida: -R$ ${incomeAmount}/min de ${config.name}`);
                    }
                }
            }

            // Sistema de aluguel para infraestrutura (água e energia)
            if (building.isRented && (config.waterProduction || config.powerGeneration)) {
                // Calcular receita de aluguel baseada na capacidade do edifício
                let rentalIncome = 0;
                if (config.waterProduction) {
                    rentalIncome = config.waterProduction * 2; // R$ 2 por L/s de capacidade
                }
                if (config.powerGeneration) {
                    rentalIncome += config.powerGeneration * 50; // R$ 50 por MW de capacidade
                }

                if (rentalIncome > 0) {
                    if (add) {
                        resourceManager.addIncome(rentalIncome);
                        log(`🏙️ Receita de aluguel adicionada: +R$ ${rentalIncome}/min de ${config.name}`);
                    } else {
                        resourceManager.removeIncome(rentalIncome);
                        log(`🏙️ Receita de aluguel removida: -R$ ${rentalIncome}/min de ${config.name}`);
                    }
                }
            }

            // Consumo de água
            if (config.waterConsumption) {
                if (add) {
                    resourceManager.addWaterConsumption(config.waterConsumption);
                } else {
                    resourceManager.removeWaterConsumption(config.waterConsumption);
                }
            }
        }
    }

    addSatisfactionBonus(amount) {
        // Implementar quando ResourceManager suportar bônus de satisfação
        log(`✅ Bônus de satisfação adicionado: +${amount}%`);
    }

    removeSatisfactionBonus(amount) {
        // Implementar quando ResourceManager suportar bônus de satisfação
        log(`➖ Bônus de satisfação removido: -${amount}%`);
    }

    // ===== UTILITÁRIOS =====
    canPlaceBuildingOnWater(gridX, gridZ, buildingSize = 1) {
        // Verificar se todas as células necessárias estão livres (permitindo água)
        for (let x = gridX; x < gridX + buildingSize; x++) {
            for (let z = gridZ; z < gridZ + buildingSize; z++) {
                // Verificar limites do grid
                if (x < 0 || x >= this.gridManager.gridSize ||
                    z < 0 || z >= this.gridManager.gridSize) {
                    return false;
                }

                // Verificar se a célula está ocupada por outro edifício
                if (this.gridManager.isCellOccupied(x, z)) {
                    return false;
                }

                // Para edifícios que requerem água, permitir construção na água
                // Não verificar tipo de terreno aqui, será verificado nos requirements
            }
        }
        return true;
    }

    isNearWater(gridX, gridZ, size) {
        // Verificar células adjacentes
        for (let x = gridX - 1; x <= gridX + size; x++) {
            for (let z = gridZ - 1; z <= gridZ + size; z++) {
                if (this.gridManager.getTerrainType(x, z) === 'water') {
                    return true;
                }
            }
        }
        return false;
    }
    
    getBuildingAt(gridX, gridZ) {
        for (const building of this.buildings.values()) {
            if (building.gridX === gridX && building.gridZ === gridZ) {
                return building;
            }
        }
        return null;
    }
    
    getBuildingsByType(buildingTypeId) {
        return Array.from(this.buildings.values()).filter(
            building => building.type === buildingTypeId
        );
    }

    // ===== PREVIEW SYSTEM CONSOLIDATION =====
    // ✅ UNIFIED PREVIEW SYSTEM: All preview functionality consolidated into advanced system
    // - startPreviewMode(): Initiates building placement preview with visual feedback
    // - stopPreviewMode(): Cleanly exits preview mode with UI cleanup
    // - updatePreview(): Real-time preview updates with validation and visual cues
    // - createPreviewMesh(): Specialized mesh creation for different building types
    // - createPreviewMarker(): Ground markers with color-coded validity feedback
    // - Multi-cell preview support for large buildings
    // - Audio feedback for invalid placements
    // - UI cursor changes and placement feedback
    //
    // 🗑️ REMOVED: Legacy simple preview methods (showBuildingPreview, hideBuildingPreview)
    // 🎯 RESULT: Single, comprehensive preview system with enhanced user experience
    
    // ===== ATUALIZAÇÃO =====
    update(deltaTime) {
        try {
            // Atualizar animações dos labels de edifícios
            this.updateBuildingLabels(deltaTime);

            // Atualizar efeitos de escassez de energia
            this.updatePowerShortageEffects(deltaTime);

            // Atualizar eficiência dos edifícios baseado em condições (com throttling)
            if (!this.lastEfficiencyUpdate || Date.now() - this.lastEfficiencyUpdate > 5000) {
                this.buildings.forEach(building => {
                    try {
                        this.updateBuildingEfficiency(building);
                    } catch (error) {
                        console.error(`❌ Erro ao atualizar eficiência do edifício ${building.id}:`, error);
                    }
                });
                this.lastEfficiencyUpdate = Date.now();
            }

            // Processar fila de disposal se necessário
            if (this.disposalQueue.length > 0 && !this.isProcessingDisposal) {
                try {
                    this.processDisposalQueue();
                } catch (error) {
                    console.error('❌ Erro ao processar fila de disposal:', error);
                    // Reset da fila em caso de erro crítico
                    this.isProcessingDisposal = false;
                }
            }

            // Atualizar cooldown de construção
            try {
                this.updateBuildingCooldown(deltaTime);
            } catch (error) {
                console.error('❌ Erro ao atualizar cooldown:', error);
            }

            // Atualizar construções em andamento
            try {
                this.updateConstructions(deltaTime);
            } catch (error) {
                console.error('❌ Erro ao atualizar construções:', error);
                // Reset do sistema de construção em caso de erro crítico
                this.forceResetConstructionState();
            }

            // Validação periódica do estado de construção (a cada 5 segundos)
            this.lastConstructionCheck += deltaTime;
            if (this.lastConstructionCheck >= 5000) {
                this.validateConstructionState();
                this.lastConstructionCheck = 0;
            }

        } catch (error) {
            console.error('❌ Erro crítico no update do BuildingSystem:', error);
            // Em caso de erro crítico, tentar recuperar o sistema
            this.forceResetConstructionState();
        }
    }

    // ===== SISTEMA DE CONSTRUÇÃO =====
    calculateConstructionTime(cost) {
        // Tempo base: 2 segundos + 1 segundo por R$ 1000
        const baseTime = 2000; // 2 segundos
        const costFactor = Math.floor(cost / 1000) * 1000; // 1 segundo por R$ 1000
        return Math.min(baseTime + costFactor, 15000); // Máximo 15 segundos
    }

    startConstruction(buildingData) {
        this.constructionQueue.set(buildingData.id, buildingData);

        // Criar indicador de progresso 3D
        this.createConstructionIndicator(buildingData);

        // Aplicar efeito visual de construção
        this.applyConstructionVisuals(buildingData);

        log(`🚧 Iniciando construção de ${buildingData.config.name} (${buildingData.constructionDuration / 1000}s) [${this.constructionQueue.size}/${this.maxSimultaneousConstructions}]`);
    }

    updateConstructions(deltaTime) {
        if (this.constructionQueue.size === 0) {
            return;
        }

        // Usar Array.from para evitar problemas com modificação durante iteração
        const constructionsToUpdate = Array.from(this.constructionQueue.entries());
        const completedConstructions = [];

        for (const [buildingId, buildingData] of constructionsToUpdate) {
            try {
                const elapsed = Date.now() - buildingData.constructionStartTime;
                const progress = Math.min(1, elapsed / buildingData.constructionDuration);

                // Atualizar indicador de progresso
                this.updateConstructionIndicator(buildingData, progress);

                // ===== AUDIO FEEDBACK PARA PROGRESSO =====
                this.playConstructionProgressAudio(buildingData, progress);

                // Verificar se construção terminou
                if (progress >= 1) {
                    completedConstructions.push(buildingData);
                }
            } catch (error) {
                console.error(`❌ Erro ao atualizar construção ${buildingId}:`, error);
                // Remover construção problemática da fila
                this.constructionQueue.delete(buildingId);
            }
        }

        // Completar construções fora do loop principal
        completedConstructions.forEach(buildingData => {
            try {
                this.completeConstruction(buildingData);
            } catch (error) {
                console.error(`❌ Erro ao completar construção ${buildingData.id}:`, error);
                // Remover da fila mesmo com erro
                this.constructionQueue.delete(buildingData.id);
            }
        });

        // Log quando todas as construções são concluídas
        if (this.constructionQueue.size === 0) {
            log('✅ Todas as construções concluídas');
        }
    }

    completeConstruction(buildingData) {
        log(`✅ Construção concluída: ${buildingData.config.name}`);

        // Remover da fila de construção
        this.constructionQueue.delete(buildingData.id);

        // Ativar edifício
        buildingData.active = true;
        buildingData.efficiency = 1.0;
        buildingData.underConstruction = false;

        // Remover visuais de construção
        this.removeConstructionVisuals(buildingData);

        // Aplicar efeitos nos recursos (agora que está ativo)
        this.applyBuildingEffects(buildingData, true);

        // ===== AUDIO FEEDBACK PARA CONCLUSÃO =====
        this.playConstructionCompletionAudio(buildingData);

        // Mostrar indicador de conclusão
        this.showCompletionIndicator(buildingData);

        // Log do progresso das construções restantes
        if (this.constructionQueue.size > 0) {
            log(`📊 Construções restantes: ${this.constructionQueue.size}/${this.maxSimultaneousConstructions}`);
        }
    }

    // ===== VALIDAÇÃO E RECUPERAÇÃO =====
    validateConstructionState() {
        const currentTime = Date.now();

        // Verificar se há construções órfãs ou travadas
        if (this.constructionQueue.size === 0) {
            return; // Nenhuma construção em andamento
        }

        // Verificar timeout de construções
        for (const [buildingId, buildingData] of this.constructionQueue) {
            const constructionAge = currentTime - buildingData.constructionStartTime;
            if (constructionAge > this.constructionTimeout) {
                console.warn(`⚠️ Construção ${buildingId} excedeu timeout (${constructionAge}ms) - forçando conclusão`);
                this.completeConstruction(buildingData);
            }
        }
    }

    forceResetConstructionState() {
        log('🔄 Forçando reset do estado de construção...');
        this.constructionQueue.clear();
        this.showNotification('Sistema de construção reiniciado', 'info');
    }

    // ===== SISTEMA DE COOLDOWN =====
    isBuildingOnCooldown() {
        return this.buildingCooldown.active;
    }

    activateBuildingCooldown() {
        this.buildingCooldown.active = true;
        this.buildingCooldown.lastBuildTime = Date.now();
        this.buildingCooldown.remainingTime = this.buildingCooldown.duration;

        log(`⏱️ Cooldown de construção ativado: ${this.buildingCooldown.duration}ms`);

        // Mostrar indicador visual de cooldown
        if (this.gameManager && this.gameManager.uiManager) {
            this.gameManager.uiManager.showBuildingCooldown(
                this.buildingCooldown.remainingTime,
                this.buildingCooldown.duration
            );
        }
    }

    updateBuildingCooldown(deltaTime) {
        if (!this.buildingCooldown.active) return;

        this.buildingCooldown.remainingTime -= deltaTime;

        if (this.buildingCooldown.remainingTime <= 0) {
            this.buildingCooldown.active = false;
            this.buildingCooldown.remainingTime = 0;
            log(`✅ Cooldown de construção finalizado`);

            // Esconder indicador visual de cooldown
            if (this.gameManager && this.gameManager.uiManager) {
                this.gameManager.uiManager.hideBuildingCooldown();
            }
        }
    }

    // ===== Notificações, indicadores de obra, celebração e rótulos: js/systems/building/BuildingFeedback.js (19 métodos) =====

    // ===== EFICIÊNCIA DOS EDIFÍCIOS =====
    updateBuildingEfficiency(building) {
        // Só atualizar eficiência para edifícios ativos
        if (!building.active || building.underConstruction) {
            return;
        }

        let efficiency = 1.0;
        let hasPowerShortage = false;

        // Verificar se o edifício consome energia
        if (building.config.powerConsumption && window.gameManager && window.gameManager.resourceManager) {
            const electricityData = window.gameManager.resourceManager.getElectricity();

            // Se a eficiência elétrica está baixa, há escassez de energia
            if (electricityData.efficiency < 1.0) {
                hasPowerShortage = true;
                efficiency *= electricityData.efficiency; // Reduzir eficiência baseado na disponibilidade de energia
            }
        }

        // ===== RESEARCH CENTERS AND UNIVERSITIES: Apply efficiency bonuses =====
        efficiency = this.calculateBuildingEfficiency(building);

        // Atualizar status de escassez de energia
        const hadPowerShortage = building.hasPowerShortage || false;
        building.hasPowerShortage = hasPowerShortage;

        // Aplicar efeitos visuais de escassez de energia
        if (hasPowerShortage !== hadPowerShortage) {
            this.updatePowerShortageVisuals(building, hasPowerShortage);
        }

        // Reduzir eficiência baseado na poluição local
        // TODO: Implementar cálculo de poluição local

        // Reduzir eficiência se falta manutenção
        // TODO: Implementar sistema de manutenção

        // Só reaplicar efeitos se a eficiência realmente mudou
        if (Math.abs(building.efficiency - efficiency) > 0.01) {
            const oldEfficiency = building.efficiency;
            building.efficiency = efficiency;

            // Reaplicar efeitos com nova eficiência de forma otimizada
            try {
                this.applyBuildingEffects(building, false); // Remover efeitos antigos
                this.applyBuildingEffects(building, true);  // Aplicar novos efeitos

                log(`🔧 Eficiência atualizada para ${building.config.name}: ${oldEfficiency.toFixed(2)} -> ${efficiency.toFixed(2)}`);
            } catch (error) {
                console.error(`❌ Erro ao atualizar eficiência do edifício ${building.id}:`, error);
                // Restaurar eficiência anterior em caso de erro
                building.efficiency = oldEfficiency;
            }
        }
    }

    // ===== EFEITOS VISUAIS DE ESCASSEZ DE ENERGIA =====
    updatePowerShortageVisuals(building, hasPowerShortage) {
        if (!building.mesh) return;

        try {
            if (hasPowerShortage) {
                this.addPowerShortageEffects(building);
            } else {
                this.removePowerShortageEffects(building);
            }
        } catch (error) {
            console.error(`❌ Erro ao atualizar efeitos visuais de energia para ${building.id}:`, error);
        }
    }

    // ===== APLICAR NOS ÍCONES DE ESCASSEZ DE ENERGIA =====
    addPowerShortageEffects(building) {
        const mesh = building.mesh;

        // Criar ícone de escassez de energia se não existir
        if (!mesh.powerShortageIcon) {
            this.createPowerShortageIcon(building);
        }

        // Aplicar efeito de escurecimento no material
        if (mesh.material && !mesh.originalEmissiveColor) {
            // Salvar cor original
            mesh.originalEmissiveColor = mesh.material.emissiveColor ? mesh.material.emissiveColor.clone() : new BABYLON.Color3(0, 0, 0);
            mesh.originalDiffuseColor = mesh.material.diffuseColor ? mesh.material.diffuseColor.clone() : new BABYLON.Color3(1, 1, 1);

            // Aplicar escurecimento
            mesh.material.emissiveColor = mesh.originalEmissiveColor.scale(0.3);
            mesh.material.diffuseColor = mesh.originalDiffuseColor.scale(0.6);
        }

        // Iniciar efeito de piscada
        if (!mesh.powerShortageFlicker) {
            mesh.powerShortageFlicker = {
                time: 0,
                interval: 2.0, // Piscar a cada 2 segundos
                duration: 0.3   // Duração do piscar
            };
        }

        log(`⚡❌ Efeitos de escassez de energia aplicados a ${building.config.name}`);
    }

    removePowerShortageEffects(building) {
        const mesh = building.mesh;

        // Remover ícone de escassez de energia
        if (mesh.powerShortageIcon) {
            this.removePowerShortageIcon(building);
        }

        // Restaurar cores originais
        if (mesh.material && mesh.originalEmissiveColor) {
            mesh.material.emissiveColor = mesh.originalEmissiveColor;
            mesh.material.diffuseColor = mesh.originalDiffuseColor;
            mesh.originalEmissiveColor = null;
            mesh.originalDiffuseColor = null;
        }

        // Remover efeito de piscada
        mesh.powerShortageFlicker = null;

        log(`⚡✅ Efeitos de escassez de energia removidos de ${building.config.name}`);
    }

    createPowerShortageIcon(building) {
        try {
            const mesh = building.mesh;
            const worldPos = mesh.position;

            // ===== USAR A FUNÇÃO REUTILIZÁVEL COM PRESET VERMELHO =====
            const iconPosition = new BABYLON.Vector3(
                worldPos.x + 1,
                this.getBuildingHeight(building.config) + 2,
                worldPos.z + 1
            );

            const powerIcon = this.createCartoonTextPlate(
                `powerIcon_${mesh.name}`,
                iconPosition,
                "⚡❌",
                {
                    preset: 'red', // Usar preset vermelho
                    width: 1.5,
                    height: 1.5,
                    textureWidth: 256,
                    textureHeight: 256,
                    fontSize: 80,
                    borderRadius: 35,
                    outlineWidth: 8,
                    alphaIndex: 1000
                }
            );

            // Armazenar referência
            mesh.powerShortageIcon = powerIcon;

            // Adicionar animação de pulsação
            const startTime = Date.now();
            const animatePowerIcon = () => {
                if (!powerIcon.mesh || powerIcon.mesh.isDisposed()) return;

                const elapsed = Date.now() - startTime;
                const pulse = Math.sin(elapsed * 0.005) * 0.15 + 1; // Pulsar entre 0.85 e 1.15
            
                powerIcon.mesh.scaling = new BABYLON.Vector3(pulse, pulse, pulse);
            
                // Pulsar emissão
                const emissivePulse = Math.sin(elapsed * 0.005) * 0.3 + 0.7;
                powerIcon.material.emissiveColor = new BABYLON.Color3(emissivePulse, 0.2 * emissivePulse, 0.2 * emissivePulse);

                requestAnimationFrame(animatePowerIcon);
            };

            animatePowerIcon();

            log(`⚡ Ícone de escassez de energia criado para ${building.config.name}`);

        } catch (error) {
            console.error(`❌ Erro ao criar ícone de escassez de energia:`, error);
        }
    }

    removePowerShortageIcon(building) {
        const mesh = building.mesh;
        if (mesh.powerShortageIcon) {
            try {
                // Usar o método dispose da plaquinha
                mesh.powerShortageIcon.dispose();
                mesh.powerShortageIcon = null;
            } catch (error) {
                console.error('❌ Erro ao remover ícone de escassez de energia:', error);
            }
        }
    }
    getBuildingTypesByCategory(category) {
        return Array.from(this.buildingTypes.values())
            .filter(type => type.category === category && type.visible !== false)
            .sort((a, b) => a.cost - b.cost);
    }
    getAllBuildings() { return Array.from(this.buildings.values()); }
    
    // ===== SAVE/LOAD =====
    getSaveData() {
        const buildingsData = [];
        this.buildings.forEach(building => {
            buildingsData.push({
                id: building.id,
                type: building.type,
                gridX: building.gridX,
                gridZ: building.gridZ,
                constructionTime: building.constructionTime,
                active: building.active,
                efficiency: building.efficiency
            });
        });
        
        return {
            buildings: buildingsData,
            buildingCounter: this.buildingCounter
        };
    }
    
    loadData(data) {
        if (data && data.buildings) {
            this.buildingCounter = data.buildingCounter || 0;
            // Buildings serão recriados pelo rebuildFromData
        }
    }
    
    rebuildFromData() {
        // TODO: Implementar reconstrução de edifícios a partir de dados salvos
        log('🔄 Reconstruindo edifícios...');
    }

    // ===== SISTEMA DE PREVIEW =====
    startPreviewMode(buildingTypeId) {
        log(`🔍 Iniciando modo preview para: ${buildingTypeId}`);

        this.selectedBuildingType = buildingTypeId;
        this.previewMode = true;

        // Limpar preview anterior
        this.clearPreview();

        // Criar preview mesh
        this.createPreviewMesh(buildingTypeId);

        // Criar marcador de posição
        this.createPreviewMarker(buildingTypeId);
    }

    stopPreviewMode() {
        log('🔍 Parando modo preview');

        this.previewMode = false;
        this.selectedBuildingType = null;

        // Limpar preview
        this.clearPreview();

        // Limpar feedback UI
        if (this.gameManager && this.gameManager.uiManager) {
            this.gameManager.uiManager.hideBuildingPlacementFeedback();
        }

        // Resetar cursor
        if (this.gameManager && this.gameManager.canvas) {
            this.gameManager.canvas.style.cursor = 'grab';
        }
    }

    createPreviewMesh(buildingTypeId) {
        const buildingType = this.buildingTypes.get(buildingTypeId);
        if (!buildingType) return;

        try {
            // Criar mesh especializado ou básico
            this.previewMesh = this.createSpecializedMesh(buildingType);

            if (!this.previewMesh) {
                this.previewMesh = this.createBasicMesh(buildingType);
            }

            if (this.previewMesh) {
                // Tornar semi-transparente
                const material = this.createBuildingMaterial(buildingType);
                material.alpha = 0.6;
                this.previewMesh.material = material;

                // Desabilitar colisões
                this.previewMesh.checkCollisions = false;

                // Metadados
                this.previewMesh.metadata = {
                    preview: true,
                    buildingType: buildingTypeId
                };

                // Inicialmente invisível
                this.previewMesh.setEnabled(false);
            }

        } catch (error) {
            console.error('❌ Erro ao criar preview mesh:', error);
        }
    }

    createPreviewMarker(buildingTypeId) {
        const buildingType = this.buildingTypes.get(buildingTypeId);
        if (!buildingType) return;

        try {
            const size = buildingType.size || 1;
            const markerSize = size * 1.8;

            // Criar marcador circular ou quadrado
            this.previewMarker = BABYLON.MeshBuilder.CreateGround("preview_marker", {
                width: markerSize,
                height: markerSize
            }, this.scene);

            // Material do marcador
            const markerMaterial = new BABYLON.StandardMaterial("preview_marker_material", this.scene);
            markerMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // Verde por padrão
            markerMaterial.alpha = 0.5;
            markerMaterial.emissiveColor = new BABYLON.Color3(0, 0.3, 0);

            this.previewMarker.material = markerMaterial;
            this.previewMarker.position.y = 0.01; // Ligeiramente acima do terreno

            // Metadados
            this.previewMarker.metadata = {
                previewMarker: true
            };

            // Inicialmente invisível
            this.previewMarker.setEnabled(false);

        } catch (error) {
            console.error('❌ Erro ao criar preview marker:', error);
        }
    }

    updatePreview(gridX, gridZ) {
        if (!this.previewMode || !this.selectedBuildingType) return;

        // Forçar alinhamento ao grid - garantir que as coordenadas sejam inteiras
        gridX = Math.floor(gridX);
        gridZ = Math.floor(gridZ);

        // Verificar se mudou de posição
        if (gridX === this.lastPreviewPosition.x && gridZ === this.lastPreviewPosition.z) {
            return;
        }

        this.lastPreviewPosition = { x: gridX, z: gridZ };

        const buildingType = this.buildingTypes.get(this.selectedBuildingType);
        if (!buildingType) return;

        // Verificar se a posição é válida usando o método correto
        const canPlaceResult = this.canPlaceBuilding(gridX, gridZ, this.selectedBuildingType);

        // Verificar se todas as células necessárias estão dentro dos limites do grid
        const isWithinBounds = this.isPlacementWithinBounds(gridX, gridZ, buildingType.size);

        // Determinar se a posição é válida
        const isValid = canPlaceResult.canPlace && isWithinBounds;

        // Atualizar posição dos meshes
        if (this.previewMesh) {
            const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
            this.previewMesh.position = worldPos;
            this.previewMesh.position.y += this.previewMesh.getBoundingInfo().boundingBox.extendSize.y;
            this.previewMesh.setEnabled(true);

            // ===== ENHANCED PREVIEW MESH VISUAL FEEDBACK =====
            if (this.previewMesh.material) {
                if (isValid) {
                    this.previewMesh.material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Verde para válido
                    this.previewMesh.material.alpha = 0.6;
                    this.previewMesh.material.emissiveColor = new BABYLON.Color3(0, 0.2, 0);
                } else {
                    this.previewMesh.material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Vermelho para inválido
                    this.previewMesh.material.alpha = 0.8;
                    this.previewMesh.material.emissiveColor = new BABYLON.Color3(0.2, 0, 0);
                }
            }
        }

        if (this.previewMarker) {
            const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
            this.previewMarker.position.x = worldPos.x;
            this.previewMarker.position.z = worldPos.z;

            // ===== ENHANCED MARKER VISUAL FEEDBACK =====
            const material = this.previewMarker.material;
            if (isValid) {
                material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Verde
                material.emissiveColor = new BABYLON.Color3(0, 0.3, 0);
                // Animação suave para posição válida
                this.previewMarker.scaling = new BABYLON.Vector3(1, 1, 1);
            } else {
                material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Vermelho
                material.emissiveColor = new BABYLON.Color3(0.3, 0, 0);
                // Animação de "shake" para posição inválida
                this.previewMarker.scaling = new BABYLON.Vector3(1.1, 1, 1.1);
            }

            this.previewMarker.setEnabled(true);
        }

        // ===== AUDIO FEEDBACK FOR INVALID PLACEMENT =====
        if (!isValid && this.lastPreviewWasValid) {
            // Play subtle error sound when moving from valid to invalid position
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSound('sfx_click', 0.2);
            }
        }
        this.lastPreviewWasValid = isValid;

        // ===== ENHANCED UI FEEDBACK =====
        this.updatePreviewUIFeedback(isValid, canPlaceResult);

        // Mostrar indicadores de células ocupadas para edifícios multi-célula
        this.updateMultiCellPreview(gridX, gridZ, buildingType.size, isValid);

        // Log para debug (apenas quando a posição muda)
        log(`🔍 Preview updated: (${gridX}, ${gridZ}) - ${isValid ? 'VALID' : 'INVALID'} - ${canPlaceResult.reason || 'No reason'}`);
    }

    updatePreviewUIFeedback(isValid, canPlaceResult) {
        // Update cursor style
        if (this.gameManager && this.gameManager.canvas) {
            this.gameManager.canvas.style.cursor = isValid ? 'crosshair' : 'not-allowed';
        }

        // Show placement feedback in UI
        if (this.gameManager && this.gameManager.uiManager) {
            const buildingName = this.buildingTypes.get(this.selectedBuildingType)?.name || 'edifício';
            const message = isValid
                ? `✅ Clique para construir ${buildingName}`
                : `❌ ${canPlaceResult.reason || 'Não é possível construir aqui'}`;

            // Update building info panel with placement feedback
            this.gameManager.uiManager.updateBuildingPlacementFeedback(message, isValid);
        }
    }

    clearPreview() {
        if (this.previewMesh) {
            this.previewMesh.dispose();
            this.previewMesh = null;
        }

        if (this.previewMarker) {
            this.previewMarker.dispose();
            this.previewMarker = null;
        }

        // Limpar indicadores de células múltiplas
        this.clearMultiCellPreview();

        this.lastPreviewPosition = { x: -1, z: -1 };
    }

    // ===== VALIDAÇÃO DE ALINHAMENTO AO GRID =====
    isPlacementWithinBounds(gridX, gridZ, buildingSize) {
        // Verificar se todas as células necessárias estão dentro dos limites do grid
        for (let x = gridX; x < gridX + buildingSize; x++) {
            for (let z = gridZ; z < gridZ + buildingSize; z++) {
                if (x < 0 || x >= this.gridManager.gridSize ||
                    z < 0 || z >= this.gridManager.gridSize) {
                    return false;
                }
            }
        }
        return true;
    }

    // ===== PREVIEW MULTI-CÉLULA =====
    updateMultiCellPreview(gridX, gridZ, buildingSize, isValid) {
        // Limpar preview anterior
        this.clearMultiCellPreview();

        // Se for edifício de uma célula, não precisa de indicadores extras
        if (buildingSize <= 1) return;

        // Criar indicadores para cada célula que o edifício ocupará
        this.multiCellIndicators = [];

        for (let x = gridX; x < gridX + buildingSize; x++) {
            for (let z = gridZ; z < gridZ + buildingSize; z++) {
                // Pular a célula central (já tem o marcador principal)
                if (x === gridX && z === gridZ) continue;

                const indicator = this.createCellIndicator(x, z, isValid);
                if (indicator) {
                    this.multiCellIndicators.push(indicator);
                }
            }
        }
    }

    createCellIndicator(gridX, gridZ, isValid) {
        try {
            // Verificar se está dentro dos limites
            if (gridX < 0 || gridX >= this.gridManager.gridSize ||
                gridZ < 0 || gridZ >= this.gridManager.gridSize) {
                return null;
            }

            const worldPos = this.gridManager.gridToWorld(gridX, gridZ);

            // Criar indicador pequeno
            const indicator = BABYLON.MeshBuilder.CreateGround(`cell_indicator_${gridX}_${gridZ}`, {
                width: 1.5,
                height: 1.5
            }, this.scene);

            indicator.position.x = worldPos.x;
            indicator.position.z = worldPos.z;
            indicator.position.y = 0.02; // Ligeiramente acima do terreno

            // Material baseado na validade
            const material = new BABYLON.StandardMaterial(`cell_indicator_mat_${gridX}_${gridZ}`, this.scene);
            if (isValid) {
                material.diffuseColor = new BABYLON.Color3(0, 0.8, 0); // Verde
                material.emissiveColor = new BABYLON.Color3(0, 0.2, 0);
            } else {
                material.diffuseColor = new BABYLON.Color3(0.8, 0, 0); // Vermelho
                material.emissiveColor = new BABYLON.Color3(0.2, 0, 0);
            }
            material.alpha = 0.4;

            indicator.material = material;

            return indicator;

        } catch (error) {
            console.error('❌ Erro ao criar indicador de célula:', error);
            return null;
        }
    }

    clearMultiCellPreview() {
        if (this.multiCellIndicators) {
            this.multiCellIndicators.forEach(indicator => {
                if (indicator && !indicator.isDisposed()) {
                    if (indicator.material) {
                        indicator.material.dispose();
                    }
                    indicator.dispose();
                }
            });
            this.multiCellIndicators = [];
        }
    }

    confirmPlacement(gridX, gridZ) {
        if (!this.previewMode || !this.selectedBuildingType) return false;

        // Forçar alinhamento ao grid - garantir que as coordenadas sejam inteiras
        gridX = Math.floor(gridX);
        gridZ = Math.floor(gridZ);

        const buildingType = this.buildingTypes.get(this.selectedBuildingType);
        if (!buildingType) return false;

        // Verificar se está dentro dos limites do grid
        if (!this.isPlacementWithinBounds(gridX, gridZ, buildingType.size)) {
            console.warn(`⚠️ Construção fora dos limites do grid: (${gridX}, ${gridZ}) com tamanho ${buildingType.size}`);
            return false;
        }

        // Verificar se pode construir usando o método correto
        const canPlaceResult = this.canPlaceBuilding(gridX, gridZ, this.selectedBuildingType);
        if (!canPlaceResult.canPlace) {
            console.warn(`⚠️ Não é possível construir: ${canPlaceResult.reason}`);
            return false;
        }

        // Construir edifício
        const building = this.placeBuilding(gridX, gridZ, this.selectedBuildingType);

        if (building) {
            log(`✅ Edifício ${buildingType.name} construído em (${gridX}, ${gridZ}) com alinhamento perfeito ao grid`);
            return true;
        } else {
            console.error('❌ Falha ao construir edifício');
            return false;
        }
    }

    // ===== CLEANUP =====
    dispose() {
        log('🗑️ Iniciando disposal do BuildingSystem...');

        // Parar processamento da fila
        this.isProcessingDisposal = false;

        // Remover todos os edifícios usando o método de remoção seguro
        const buildingIds = Array.from(this.buildings.keys());
        buildingIds.forEach(buildingId => {
            this.removeBuilding(buildingId);
        });

        // Processar toda a fila de disposal imediatamente
        while (this.disposalQueue.length > 0) {
            const item = this.disposalQueue.shift();
            this.performDisposal(item);
        }

        this.buildings.clear();
        this.clearPreview();

        // Limpar materiais
        this.materials.forEach(material => {
            try {
                if (material.diffuseTexture && !material.diffuseTexture.isDisposed()) {
                    material.diffuseTexture.dispose();
                }
                if (!material.isDisposed()) {
                    material.dispose();
                }
            } catch (error) {
                console.warn('⚠️ Erro ao dispor material:', error);
            }
        });
        this.materials.clear();

        // Limpar texturas dinâmicas restantes
        this.dynamicTextures.forEach(texture => {
            try {
                if (!texture.isDisposed()) {
                    texture.dispose();
                }
            } catch (error) {
                console.warn('⚠️ Erro ao dispor textura:', error);
            }
        });
        this.dynamicTextures.clear();

        // Limpar sombras restantes
        this.shadowMeshes.forEach(shadow => {
            try {
                if (!shadow.isDisposed()) {
                    shadow.dispose();
                }
            } catch (error) {
                console.warn('⚠️ Erro ao dispor sombra:', error);
            }
        });
        this.shadowMeshes.clear();

        // Limpar conexões restantes
        this.connectionMeshes.forEach(connection => {
            try {
                if (!connection.isDisposed()) {
                    connection.dispose();
                }
            } catch (error) {
                console.warn('⚠️ Erro ao dispor conexão:', error);
            }
        });
        this.connectionMeshes.clear();

        log('✅ BuildingSystem disposed - Memória limpa');
    }

    // ===== CONECTIVIDADE DE INFRAESTRUTURA =====
    isInfrastructureBuilding(buildingType) {
        return buildingType.category === 'infrastructure' ||
               buildingType.category === 'zoning' ||
               buildingType.roadType ||
               buildingType.zoneType;
    }

    updateInfrastructureConnections(building) {
        if (!this.isInfrastructureBuilding(building.config)) return;

        const { gridX, gridZ } = building;
        const adjacentPositions = [
            { x: gridX - 1, z: gridZ },     // Esquerda
            { x: gridX + 1, z: gridZ },     // Direita
            { x: gridX, z: gridZ - 1 },     // Cima
            { x: gridX, z: gridZ + 1 }      // Baixo
        ];

        // Verificar edifícios adjacentes
        adjacentPositions.forEach(pos => {
            const adjacentBuilding = this.getBuildingAt(pos.x, pos.z);
            if (adjacentBuilding && this.canConnect(building, adjacentBuilding)) {
                // Criar conexão bidirecional
                building.connections.add(adjacentBuilding.id);
                adjacentBuilding.connections.add(building.id);

                // Atualizar visual da conexão
                this.updateConnectionVisual(building, adjacentBuilding);

                log(`🔗 Conectado: ${building.config.name} ↔ ${adjacentBuilding.config.name}`);
            }
        });

        // Atualizar conexões de todos os edifícios adjacentes para garantir seamless connections
        this.refreshAdjacentConnections(building);
    }

    refreshAdjacentConnections(centerBuilding) {
        const { gridX, gridZ } = centerBuilding;
        const adjacentPositions = [
            { x: gridX - 1, z: gridZ },
            { x: gridX + 1, z: gridZ },
            { x: gridX, z: gridZ - 1 },
            { x: gridX, z: gridZ + 1 }
        ];

        // Para cada posição adjacente, verificar se há outros edifícios adjacentes que precisam de conexões
        adjacentPositions.forEach(pos => {
            const building = this.getBuildingAt(pos.x, pos.z);
            if (building && this.isInfrastructureBuilding(building.config)) {
                // Verificar conexões deste edifício com seus adjacentes
                const subAdjacentPositions = [
                    { x: pos.x - 1, z: pos.z },
                    { x: pos.x + 1, z: pos.z },
                    { x: pos.x, z: pos.z - 1 },
                    { x: pos.x, z: pos.z + 1 }
                ];

                subAdjacentPositions.forEach(subPos => {
                    const subBuilding = this.getBuildingAt(subPos.x, subPos.z);
                    if (subBuilding && this.canConnect(building, subBuilding)) {
                        // Verificar se já existe conexão visual
                        const connectionId1 = `connection_${building.id}_${subBuilding.id}`;
                        const connectionId2 = `connection_${subBuilding.id}_${building.id}`;

                        if (!this.connectionMeshes.has(connectionId1) && !this.connectionMeshes.has(connectionId2)) {
                            this.updateConnectionVisual(building, subBuilding);
                        }
                    }
                });
            }
        });
    }

    canConnect(building1, building2) {
        // Verificar se ambos são infraestrutura
        if (!this.isInfrastructureBuilding(building1.config) ||
            !this.isInfrastructureBuilding(building2.config)) {
            return false;
        }

        // Estradas podem conectar com estradas
        if (building1.config.roadType && building2.config.roadType) {
            return true;
        }

        // Zonas podem conectar com zonas do mesmo tipo
        if (building1.config.zoneType && building2.config.zoneType) {
            return building1.config.zoneType === building2.config.zoneType;
        }

        // Infraestrutura geral pode conectar
        if (building1.config.category === 'infrastructure' &&
            building2.config.category === 'infrastructure') {
            return true;
        }

        return false;
    }

    updateConnectionVisual(building1, building2) {
        // Criar conexão visual seamless entre infraestruturas adjacentes
        this.createSeamlessConnection(building1, building2);

        // Atualizar material para mostrar conexão
        if (building1.mesh && building1.mesh.material) {
            const material = building1.mesh.material;
            if (material.emissiveColor) {
                // Adicionar um leve brilho para indicar conexão
                material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            }
        }

        if (building2.mesh && building2.mesh.material) {
            const material = building2.mesh.material;
            if (material.emissiveColor) {
                material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            }
        }
    }

    // ===== CONEXÕES SEAMLESS =====
    createSeamlessConnection(building1, building2) {
        try {
            // Verificar se ambos são do mesmo tipo de infraestrutura
            if (!this.canCreateSeamlessConnection(building1, building2)) return;

            const connectionId = `connection_${building1.id}_${building2.id}`;

            // Evitar criar conexões duplicadas
            if (this.connectionMeshes.has(connectionId)) return;

            // Calcular posição da conexão (ponto médio entre os dois edifícios)
            const pos1 = this.gridManager.gridToWorld(building1.gridX, building1.gridZ);
            const pos2 = this.gridManager.gridToWorld(building2.gridX, building2.gridZ);

            const connectionPos = {
                x: (pos1.x + pos2.x) / 2,
                y: Math.max(pos1.y, pos2.y),
                z: (pos1.z + pos2.z) / 2
            };

            // Determinar orientação da conexão
            const isHorizontal = Math.abs(building1.gridX - building2.gridX) > 0;

            // Criar mesh de conexão
            const connectionMesh = this.createConnectionMesh(building1, building2, connectionPos, isHorizontal);

            if (connectionMesh) {
                this.connectionMeshes.set(connectionId, connectionMesh);
                log(`🔗 Conexão seamless criada entre ${building1.config.name} e ${building2.config.name}`);
            }

        } catch (error) {
            console.error('❌ Erro ao criar conexão seamless:', error);
        }
    }

    canCreateSeamlessConnection(building1, building2) {
        // Verificar se são do mesmo tipo de infraestrutura
        const type1 = building1.config.roadType || building1.config.category;
        const type2 = building2.config.roadType || building2.config.category;

        // Só criar conexões seamless para tipos compatíveis
        if (type1 !== type2) return false;

        // Verificar se são adjacentes (distância de 1 célula)
        const distance = Math.abs(building1.gridX - building2.gridX) + Math.abs(building1.gridZ - building2.gridZ);
        return distance === 1;
    }

    createConnectionMesh(building1, building2, position, isHorizontal) {
        try {
            const config1 = building1.config;

            // Determinar dimensões da conexão baseado no tipo
            let width, height, depth;

            if (config1.roadType) {
                // Conexão de estrada
                width = isHorizontal ? 1.8 : 0.3;
                height = 0.08;
                depth = isHorizontal ? 0.3 : 1.8;
            } else if (config1.id === 'sidewalk') {
                // Conexão de calçada
                width = isHorizontal ? 1.6 : 0.2;
                height = 0.03;
                depth = isHorizontal ? 0.2 : 1.6;
            } else {
                // Conexão genérica de infraestrutura
                width = isHorizontal ? 1.5 : 0.25;
                height = 0.05;
                depth = isHorizontal ? 0.25 : 1.5;
            }

            // Criar mesh da conexão
            const connectionMesh = BABYLON.MeshBuilder.CreateBox(`seamless_connection`, {
                width: width,
                height: height,
                depth: depth
            }, this.scene);

            connectionMesh.position.x = position.x;
            connectionMesh.position.y = position.y + height / 2;
            connectionMesh.position.z = position.z;

            // Aplicar material similar ao dos edifícios conectados
            const material = this.createConnectionMaterial(config1);
            connectionMesh.material = material;

            // Metadados
            connectionMesh.metadata = {
                isConnection: true,
                building1Id: building1.id,
                building2Id: building2.id
            };

            return connectionMesh;

        } catch (error) {
            console.error('❌ Erro ao criar mesh de conexão:', error);
            return null;
        }
    }

    createConnectionMaterial(buildingConfig) {
        const materialName = `connectionMat_${buildingConfig.id}`;

        // Reutilizar material se já existir
        if (this.materials.has(materialName)) {
            return this.materials.get(materialName);
        }

        const material = new BABYLON.StandardMaterial(materialName, this.scene);

        // Cor baseada no tipo de infraestrutura
        if (buildingConfig.roadType === 'paved') {
            material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Cinza escuro
        } else if (buildingConfig.roadType === 'dirt') {
            material.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2); // Marrom terra
        } else if (buildingConfig.id === 'sidewalk') {
            material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7); // Cinza claro
        } else {
            material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Cinza médio
        }

        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.roughness = 0.8;

        this.materials.set(materialName, material);
        return material;
    }

    // ===== REMOÇÃO DE CONEXÕES =====
    removeInfrastructureConnections(building) {
        if (!building.connections) return;

        // Remover conexões visuais relacionadas a este edifício
        const connectionsToRemove = [];

        this.connectionMeshes.forEach((mesh, connectionId) => {
            if (connectionId.includes(building.id)) {
                connectionsToRemove.push(connectionId);

                // Dispor o mesh de conexão
                if (mesh && !mesh.isDisposed()) {
                    if (mesh.material) {
                        mesh.material.dispose();
                    }
                    mesh.dispose();
                }
            }
        });

        // Remover das estruturas de dados
        connectionsToRemove.forEach(connectionId => {
            this.connectionMeshes.delete(connectionId);
        });

        // Remover referências bidirecionais
        building.connections.forEach(connectedId => {
            const connectedBuilding = this.buildings.get(connectedId);
            if (connectedBuilding && connectedBuilding.connections) {
                connectedBuilding.connections.delete(building.id);
            }
        });

        building.connections.clear();

        log(`🔗 Conexões de infraestrutura removidas para ${building.config.name}`);
    }

    // ===== SISTEMA DE ALUGUEL =====
    toggleBuildingRental(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building) {
            console.warn(`⚠️ Edifício não encontrado: ${buildingId}`);
            return false;
        }

        // Verificar se o edifício pode ser alugado (água ou energia)
        if (!building.config.waterProduction && !building.config.powerGeneration) {
            console.warn(`⚠️ Edifício ${building.config.name} não pode ser alugado`);
            return false;
        }

        // Alternar status de aluguel
        building.isRented = !building.isRented;

        // Reaplicar efeitos com novo status
        this.applyBuildingEffects(building, false); // Remover efeitos antigos
        this.applyBuildingEffects(building, true);  // Aplicar novos efeitos

        // Atualizar ícone de aluguel
        this.updateRentalIcon(building);

        const status = building.isRented ? 'alugado' : 'não alugado';
        // ===== ZERO-ERROR POLICY FIX: Validar config antes de acessar propriedades =====
        const buildingName = (building.config && building.config.name)
            ? building.config.name
            : 'Edifício Desconhecido';
        log(`🏙️ ${buildingName} agora está ${status}`);

        return true;
    }

    updateRentalIcon(building) {
        if (!building.mesh) return;

        try {
            // Remover ícone anterior se existir
            if (building.mesh.rentalIcon) {
                this.removeRentalIcon(building);
            }

            // Criar novo ícone se estiver alugado
            if (building.isRented) {
                this.createRentalIcon(building);
            }
        } catch (error) {
            console.error(`❌ Erro ao atualizar ícone de aluguel:`, error);
        }
    }

    createRentalIcon(building) {
        try {
            const mesh = building.mesh;
            const worldPos = mesh.position;

            // Criar plano para o ícone
            const iconPlane = BABYLON.MeshBuilder.CreatePlane(`rentalIcon_${mesh.name}`, {
                width: 1.2,
                height: 1.2
            }, this.scene);

            // Posicionar acima do edifício (lado oposto ao ícone de energia)
            iconPlane.position.x = worldPos.x - 1;
            iconPlane.position.z = worldPos.z - 1;
            iconPlane.position.y = this.getBuildingHeight(building.config) + 2;
            iconPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

            // Criar textura dinâmica com ícone
            const dynamicTexture = new BABYLON.DynamicTexture(`rentalIconTexture_${mesh.name}`,
                { width: 256, height: 256 }, this.scene);

            // Desenhar ícone de aluguel
            const font = "bold 100px Arial";
            const icon = "🏙️💰";
            dynamicTexture.drawText(icon, null, null, font, "#00AA00", "transparent", true);

            // Criar material para o ícone
            const iconMaterial = new BABYLON.StandardMaterial(`rentalIconMat_${mesh.name}`, this.scene);
            iconMaterial.diffuseTexture = dynamicTexture;
            iconMaterial.emissiveTexture = dynamicTexture;
            iconMaterial.emissiveColor = new BABYLON.Color3(0, 0.8, 0);
            iconMaterial.backFaceCulling = false;
            iconMaterial.hasAlpha = true;

            iconPlane.material = iconMaterial;

            // Armazenar referência
            mesh.rentalIcon = iconPlane;

            log(`🏙️ Ícone de aluguel criado para ${building.config.name}`);

        } catch (error) {
            console.error(`❌ Erro ao criar ícone de aluguel:`, error);
        }
    }

    removeRentalIcon(building) {
        const mesh = building.mesh;
        if (mesh.rentalIcon) {
            try {
                if (!mesh.rentalIcon.isDisposed()) {
                    // Limpar material e textura
                    if (mesh.rentalIcon.material) {
                        if (mesh.rentalIcon.material.diffuseTexture) {
                            mesh.rentalIcon.material.diffuseTexture.dispose();
                        }
                        if (mesh.rentalIcon.material.emissiveTexture) {
                            mesh.rentalIcon.material.emissiveTexture.dispose();
                        }
                        mesh.rentalIcon.material.dispose();
                    }
                    mesh.rentalIcon.dispose();
                }
                mesh.rentalIcon = null;
            } catch (error) {
                console.error('❌ Erro ao remover ícone de aluguel:', error);
            }
        }
    }

    // ===== EFEITOS VISUAIS APRIMORADOS DE CONSTRUÇÃO =====
    applyConstructionMaterial(buildingData) {
        if (!buildingData.mesh || !buildingData.mesh.material) return;

        try {
            // Armazenar material original
            buildingData.originalMaterial = buildingData.mesh.material.clone();

            // Criar material de construção
            const constructionMaterial = buildingData.mesh.material.clone();
            constructionMaterial.alpha = 0.7;
            constructionMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.8);
            constructionMaterial.wireframe = false;

            // Aplicar efeito de "fantasma" durante construção
            if (constructionMaterial.diffuseColor) {
                constructionMaterial.diffuseColor = constructionMaterial.diffuseColor.scale(0.6);
            }

            buildingData.mesh.material = constructionMaterial;
            buildingData.constructionMaterial = constructionMaterial;

        } catch (error) {
            console.warn('⚠️ Erro ao aplicar material de construção:', error);
        }
    }

    createConstructionParticles(buildingData) {
        try {
            const worldPos = this.gridManager.gridToWorld(buildingData.gridX, buildingData.gridZ);

            // Criar sistema de partículas simples usando meshes pequenos
            const particleCount = 8;
            buildingData.constructionParticles = [];

            for (let i = 0; i < particleCount; i++) {
                const particle = BABYLON.MeshBuilder.CreateSphere(`particle_${buildingData.id}_${i}`, {
                    diameter: 0.1
                }, this.scene);

                // Posição aleatória ao redor do edifício
                const angle = (i / particleCount) * Math.PI * 2;
                const radius = 1 + Math.random() * 0.5;

                particle.position.x = worldPos.x + Math.cos(angle) * radius;
                particle.position.z = worldPos.z + Math.sin(angle) * radius;
                particle.position.y = worldPos.y + Math.random() * 2;

                // Material brilhante
                const particleMaterial = new BABYLON.StandardMaterial(`particleMat_${buildingData.id}_${i}`, this.scene);
                particleMaterial.emissiveColor = new BABYLON.Color3(1, 0.8, 0.2);
                particleMaterial.disableLighting = true;
                particle.material = particleMaterial;

                // Animação de flutuação
                this.animateConstructionParticle(particle, i);

                buildingData.constructionParticles.push(particle);
            }

        } catch (error) {
            console.warn('⚠️ Erro ao criar partículas de construção:', error);
        }
    }

    animateConstructionParticle(particle, index) {
        const startY = particle.position.y;
        const amplitude = 0.5;
        const frequency = 0.002 + (index * 0.0003);

        const animateParticle = () => {
            if (particle.isDisposed()) return;

            const time = Date.now();
            particle.position.y = startY + Math.sin(time * frequency) * amplitude;
            particle.rotation.y += 0.02;

            requestAnimationFrame(animateParticle);
        };

        animateParticle();
    }

    startConstructionAnimation(buildingData) {
        if (!buildingData.mesh) return;

        try {
            // Animação de crescimento gradual
            const targetScale = buildingData.originalScaling || new BABYLON.Vector3(1, 1, 1);
            const startScale = new BABYLON.Vector3(0.3, 0.3, 0.3);

            // ✅ FIX: Usar rotação já salva (sempre 0,0,0 para grid) ou criar nova zerada
            const originalRotation = buildingData.originalRotation || BABYLON.Vector3.Zero();

            buildingData.constructionAnimationData = {
                startTime: Date.now(),
                startScale: startScale.clone(),
                targetScale: targetScale.clone(),
                originalRotation: originalRotation.clone(),
                isAnimating: true
            };

            // Rotação suave durante construção
            const rotationSpeed = 0.001;
            const animateConstruction = () => {
                if (!buildingData.mesh || buildingData.mesh.isDisposed() || !buildingData.constructionAnimationData?.isAnimating) {
                    return;
                }

                const elapsed = Date.now() - buildingData.constructionStartTime;
                const progress = Math.min(1, elapsed / buildingData.constructionDuration);

                // Interpolação suave da escala
                const currentScale = BABYLON.Vector3.Lerp(
                    buildingData.constructionAnimationData.startScale,
                    buildingData.constructionAnimationData.targetScale,
                    this.easeOutCubic(progress)
                );

                buildingData.mesh.scaling = currentScale;

                // Rotação sutil durante construção
                buildingData.mesh.rotation.y += rotationSpeed;

                // ✅ FIX: Ao finalizar, restaurar rotação original
                if (progress >= 1) {
                    buildingData.mesh.rotation.copyFrom(buildingData.constructionAnimationData.originalRotation);
                    buildingData.mesh.scaling.copyFrom(targetScale);
                    buildingData.constructionAnimationData.isAnimating = false;
                    log(`✅ Animação de construção finalizada - rotação restaurada para ${buildingData.config.name} rotação: ${buildingData.mesh.rotation}`);
                    return;
                }

                requestAnimationFrame(animateConstruction);
            };

            animateConstruction();

        } catch (error) {
            console.warn('⚠️ Erro ao iniciar animação de construção:', error);
        }
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    removeConstructionEffects(buildingData) {
        try {
            // Remover partículas
            if (buildingData.constructionParticles) {
                buildingData.constructionParticles.forEach(particle => {
                    if (particle && !particle.isDisposed()) {
                        if (particle.material) particle.material.dispose();
                        particle.dispose();
                    }
                });
                delete buildingData.constructionParticles;
            }

            // Restaurar material original
            if (buildingData.mesh && buildingData.originalMaterial) {
                if (buildingData.constructionMaterial) {
                    buildingData.constructionMaterial.dispose();
                }
                buildingData.mesh.material = buildingData.originalMaterial;
                delete buildingData.originalMaterial;
                delete buildingData.constructionMaterial;
            }

            // Parar animação
            if (buildingData.constructionAnimationData) {
                buildingData.constructionAnimationData.isAnimating = false;
                delete buildingData.constructionAnimationData;
            }

            // Restaurar escala final
            if (buildingData.mesh) {
                buildingData.mesh.scaling = buildingData.originalScaling || new BABYLON.Vector3(1, 1, 1);
                buildingData.mesh.rotation = buildingData.originalRotation || BABYLON.Vector3.Zero();
            }

        } catch (error) {
            console.warn('⚠️ Erro ao remover efeitos de construção:', error);
        }
    }

    // ===== SISTEMA DE ÁUDIO PARA CONSTRUÇÃO =====
    playConstructionCompletionAudio(buildingData) {
        if (typeof AudioManager === 'undefined') return;

        try {
            const buildingType = buildingData.config;

            // Som principal de conclusão (novo som procedural)
            AudioManager.playSound('sfx_build_complete', 1.0);

            // Som específico baseado no tipo de edifício
            setTimeout(() => {
                switch (buildingType.category) {
                    case 'water':
                        AudioManager.playSound('sfx_water', 0.6);
                        break;
                    case 'power':
                        AudioManager.playSound('sfx_item', 0.5);
                        break;
                    case 'infrastructure':
                        AudioManager.playSound('sfx_build', 0.4);
                        break;
                    case 'residential':
                    case 'commercial':
                    case 'industrial':
                        AudioManager.playSound('sfx_pickup', 0.5);
                        break;
                    default:
                        AudioManager.playSound('sfx_success', 0.3);
                }
            }, 300);

            // Som de celebração extra para edifícios importantes
            if (buildingType.cost > 10000) {
                setTimeout(() => {
                    AudioManager.playSound('sfx_build_complete', 0.5);
                }, 600);
            }

            log(`🔊 Audio de conclusão aprimorado reproduzido para ${buildingType.name}`);

        } catch (error) {
            console.warn('⚠️ Erro ao reproduzir áudio de conclusão:', error);
        }
    }

    playConstructionProgressAudio(buildingData, progress) {
        if (typeof AudioManager === 'undefined') return;
        if (!buildingData.lastProgressAudio) buildingData.lastProgressAudio = 0;

        try {
            const now = Date.now();

            // Tocar som de progresso a cada 25% de conclusão
            const progressMilestones = [0.25, 0.5, 0.75];
            const currentMilestone = progressMilestones.find(milestone =>
                progress >= milestone && buildingData.lastProgressAudio < milestone
            );

            if (currentMilestone && now - (buildingData.lastProgressSound || 0) > 1500) {
                // Usar novo som procedural de progresso
                AudioManager.playSound('sfx_build_progress', 0.4);
                buildingData.lastProgressAudio = currentMilestone;
                buildingData.lastProgressSound = now;

                log(`🔊 Som de progresso aprimorado (${Math.round(currentMilestone * 100)}%) para ${buildingData.config.name}`);
            }

        } catch (error) {
            console.warn('⚠️ Erro ao reproduzir áudio de progresso:', error);
        }
    }

    playBuildingPlacementAudio(buildingType) {
        if (typeof AudioManager === 'undefined') return;

        try {
            // Som principal de colocação (novo som procedural)
            AudioManager.playSound('sfx_build_place', 0.8);

            // Som adicional baseado no tipo
            setTimeout(() => {
                if (buildingType.category === 'infrastructure') {
                    AudioManager.playSound('sfx_axe', 0.4);
                } else if (buildingType.category === 'water') {
                    AudioManager.playSound('sfx_water', 0.3);
                } else {
                    AudioManager.playSound('sfx_pickup', 0.3);
                }
            }, 200);

            log(`🔊 Audio de colocação aprimorado reproduzido para ${buildingType.name}`);

        } catch (error) {
            console.warn('⚠️ Erro ao reproduzir áudio de colocação:', error);
        }
    }
}

// Exportar para escopo global
window.BuildingSystem = BuildingSystem;
log('🏗️ BuildingSystem carregado e exportado para window.BuildingSystem');
