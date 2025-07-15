/**
 * GUARDIÃO DA ÁGUA - BUILDING SYSTEM
 * Sistema de construção e gerenciamento de infraestrutura
 */

class BuildingSystem {
    constructor(scene, gridManager) {
        console.log('🏗️ Inicializando BuildingSystem...');
        
        this.scene = scene;
        this.gridManager = gridManager;
        
        // Edifícios construídos
        this.buildings = new Map();
        this.buildingCounter = 0;
        
        // Tipos de edifícios disponíveis
        this.buildingTypes = new Map();
        
        // Materiais
        this.materials = new Map();
        
        // Configurações
        this.showConstructionPreview = true;
        this.previewMesh = null;

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
            duration: 500, // 500ms de cooldown
            lastBuildTime: 0,
            remainingTime: 0
        };

        // Sistema de construção com timer
        this.constructionQueue = new Map(); // buildingId -> construction data
        this.constructionInProgress = false;

        // Throttling para atualizações de eficiência
        this.lastEfficiencyUpdate = 0;

        this.initializeBuildingTypes();
        this.createMaterials();
        
        console.log('✅ BuildingSystem inicializado');
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeBuildingTypes() {
        console.log('🏢 Definindo tipos de edifícios...');
        
        // CATEGORIA: ÁGUA
        this.addBuildingType('water_pump', {
            name: 'Bomba de Água',
            description: 'Extrai água de fontes subterrâneas',
            category: 'water',
            cost: 5000,
            size: 1,
            waterProduction: 50,
            powerConsumption: 20,
            pollutionGeneration: 5,
            maintenanceCost: 100,
            icon: '💧',
            color: '#2196F3',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });
        
        this.addBuildingType('water_well', {
            name: 'Poço Artesiano',
            description: 'Poço profundo para extração de água limpa',
            category: 'water',
            cost: 8000,
            size: 1,
            waterProduction: 80,
            pollutionGeneration: 2,
            maintenanceCost: 150,
            icon: '🕳️',
            color: '#1976D2',
            requirements: {
                terrain: ['grassland', 'lowland', 'hill'],
                nearWater: false
            }
        });
        
        this.addBuildingType('desalination_plant', {
            name: 'Usina de Dessalinização',
            description: 'Converte água salgada em água potável',
            category: 'water',
            cost: 25000,
            size: 2,
            waterProduction: 200,
            pollutionGeneration: 15,
            maintenanceCost: 500,
            icon: '🏭',
            color: '#0D47A1',
            requirements: {
                terrain: ['water', 'lowland'],
                nearWater: true
            }
        });
        
        // CATEGORIA: TRATAMENTO
        this.addBuildingType('treatment_plant', {
            name: 'Estação de Tratamento',
            description: 'Reduz a poluição da água',
            category: 'treatment',
            cost: 15000,
            size: 2,
            pollutionReduction: 30,
            powerConsumption: 40,
            maintenanceCost: 300,
            icon: '🏭',
            color: '#4CAF50',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });
        
        this.addBuildingType('filter_station', {
            name: 'Estação de Filtros',
            description: 'Sistema avançado de filtração',
            category: 'treatment',
            cost: 20000,
            size: 1,
            pollutionReduction: 20,
            waterEfficiency: 1.2, // Melhora eficiência
            maintenanceCost: 250,
            icon: '🔧',
            color: '#388E3C',
            requirements: {
                terrain: ['grassland', 'lowland', 'hill'],
                nearWater: false
            }
        });
        
        // CATEGORIA: ARMAZENAMENTO
        this.addBuildingType('water_tank', {
            name: 'Reservatório',
            description: 'Armazena água para distribuição',
            category: 'storage',
            cost: 8000,
            size: 1,
            waterStorage: 500,
            maintenanceCost: 100,
            icon: '🛢️',
            color: '#FF9800',
            requirements: {
                terrain: ['grassland', 'lowland', 'hill'],
                nearWater: false
            }
        });
        
        this.addBuildingType('water_tower', {
            name: 'Caixa d\'Água',
            description: 'Torre de água para distribuição por gravidade',
            category: 'storage',
            cost: 12000,
            size: 1,
            waterStorage: 800,
            distributionBonus: 1.5,
            maintenanceCost: 150,
            icon: '🗼',
            color: '#F57C00',
            requirements: {
                terrain: ['hill', 'grassland'],
                nearWater: false
            }
        });
        
        // CATEGORIA: INFRAESTRUTURA
        this.addBuildingType('paved_road', {
            name: 'Rua Asfaltada',
            description: 'Estrada pavimentada que conecta edifícios eficientemente',
            category: 'infrastructure',
            cost: 500,
            size: 1,
            roadType: 'paved',
            efficiency: 1.0,
            maintenanceCost: 10,
            icon: '🛣️',
            color: '#424242',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('dirt_road', {
            name: 'Estrada de Terra',
            description: 'Estrada básica de baixo custo',
            category: 'infrastructure',
            cost: 200,
            size: 1,
            roadType: 'dirt',
            efficiency: 0.7,
            maintenanceCost: 5,
            icon: '🛤️',
            color: '#8D6E63',
            requirements: {
                terrain: ['grassland', 'lowland', 'hill'],
                nearWater: false
            }
        });

        this.addBuildingType('sidewalk', {
            name: 'Calçada',
            description: 'Melhora a satisfação dos moradores',
            category: 'infrastructure',
            cost: 300,
            size: 1,
            satisfactionBonus: 5,
            maintenanceCost: 5,
            icon: '🚶',
            color: '#9E9E9E',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('plaza', {
            name: 'Praça',
            description: 'Área recreativa que aumenta a satisfação',
            category: 'infrastructure',
            cost: 2000,
            size: 2,
            satisfactionBonus: 15,
            maintenanceCost: 50,
            icon: '🌳',
            color: '#4CAF50',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('bridge', {
            name: 'Ponte',
            description: 'Permite atravessar áreas de água',
            category: 'infrastructure',
            cost: 5000,
            size: 1,
            bridgeType: true,
            maintenanceCost: 100,
            icon: '🌉',
            color: '#795548',
            requirements: {
                terrain: ['water'],
                nearWater: true
            }
        });

        // CATEGORIA: RESIDENCIAL
        this.addBuildingType('house', {
            name: 'Casa',
            description: 'Residência para uma família',
            category: 'residential',
            cost: 3000,
            size: 1,
            population: 4,
            waterConsumption: 8,
            maintenanceCost: 50,
            icon: '🏠',
            color: '#795548',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });
        
        this.addBuildingType('apartment', {
            name: 'Prédio Residencial',
            description: 'Edifício com múltiplas famílias',
            category: 'residential',
            cost: 15000,
            size: 2,
            population: 20,
            waterConsumption: 40,
            maintenanceCost: 200,
            icon: '🏢',
            color: '#5D4037',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });
        
        // CATEGORIA: ZONAS RESIDENCIAIS
        this.addBuildingType('zone_residential_light', {
            name: 'Zona Residencial Leve',
            description: 'Área para casas pequenas e baixa densidade populacional',
            category: 'zoning',
            cost: 1000,
            size: 2,
            zoneType: 'residential_light',
            populationCapacity: 50,
            waterConsumptionPerPerson: 1.5,
            growthRate: 0.1,
            icon: '🏘️',
            color: '#81C784',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('zone_residential_balanced', {
            name: 'Zona Residencial Equilibrada',
            description: 'Área para casas suburbanas de densidade média',
            category: 'zoning',
            cost: 2000,
            size: 2,
            zoneType: 'residential_balanced',
            populationCapacity: 100,
            waterConsumptionPerPerson: 2.0,
            growthRate: 0.15,
            icon: '🏘️',
            color: '#66BB6A',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('zone_residential_heavy', {
            name: 'Zona Residencial Pesada',
            description: 'Área para prédios de apartamentos de alta densidade',
            category: 'zoning',
            cost: 4000,
            size: 2,
            zoneType: 'residential_heavy',
            populationCapacity: 200,
            waterConsumptionPerPerson: 2.5,
            powerConsumption: 30,
            growthRate: 0.2,
            icon: '🏢',
            color: '#4CAF50',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        // CATEGORIA: ZONAS INDUSTRIAIS
        this.addBuildingType('zone_industrial_light', {
            name: 'Zona Industrial Leve',
            description: 'Área para indústrias leves e manufatura',
            category: 'zoning',
            cost: 3000,
            size: 2,
            zoneType: 'industrial_light',
            jobCapacity: 30,
            pollutionGeneration: 10,
            waterConsumption: 20,
            incomeGeneration: 500,
            icon: '🏭',
            color: '#FFB74D',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('zone_industrial_balanced', {
            name: 'Zona Industrial Equilibrada',
            description: 'Área para indústrias de porte médio',
            category: 'zoning',
            cost: 5000,
            size: 2,
            zoneType: 'industrial_balanced',
            jobCapacity: 60,
            pollutionGeneration: 20,
            waterConsumption: 40,
            incomeGeneration: 1000,
            icon: '🏭',
            color: '#FF9800',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('zone_industrial_heavy', {
            name: 'Zona Industrial Pesada',
            description: 'Área para indústrias pesadas e químicas',
            category: 'zoning',
            cost: 8000,
            size: 3,
            zoneType: 'industrial_heavy',
            jobCapacity: 100,
            pollutionGeneration: 40,
            waterConsumption: 80,
            incomeGeneration: 2000,
            icon: '🏭',
            color: '#FF5722',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        // CATEGORIA: ZONAS COMERCIAIS
        this.addBuildingType('zone_commercial_light', {
            name: 'Zona Comercial Leve',
            description: 'Área para comércio local e serviços básicos',
            category: 'zoning',
            cost: 2500,
            size: 2,
            zoneType: 'commercial_light',
            jobCapacity: 25,
            waterConsumption: 15,
            incomeGeneration: 300,
            satisfactionBonus: 5,
            icon: '🏪',
            color: '#64B5F6',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('zone_commercial_balanced', {
            name: 'Zona Comercial Equilibrada',
            description: 'Área para shopping centers e comércio médio',
            category: 'zoning',
            cost: 4500,
            size: 2,
            zoneType: 'commercial_balanced',
            jobCapacity: 50,
            waterConsumption: 30,
            incomeGeneration: 600,
            satisfactionBonus: 10,
            icon: '🏬',
            color: '#2196F3',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('zone_commercial_heavy', {
            name: 'Zona Comercial Pesada',
            description: 'Área para grandes centros comerciais e escritórios',
            category: 'zoning',
            cost: 7000,
            size: 3,
            zoneType: 'commercial_heavy',
            jobCapacity: 100,
            waterConsumption: 60,
            incomeGeneration: 1200,
            satisfactionBonus: 15,
            icon: '🏢',
            color: '#1976D2',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        // CATEGORIA: ENERGIA
        this.addBuildingType('hydroelectric_plant', {
            name: 'Hidrelétrica',
            description: 'Usina hidrelétrica limpa de alta capacidade',
            category: 'power',
            cost: 15000,
            size: 3,
            powerGeneration: 500,
            waterConsumption: 0,
            pollutionGeneration: 0,
            maintenanceCost: 200,
            icon: '🌊',
            color: '#2196F3',
            requirements: {
                terrain: ['water'],
                nearWater: true
            }
        });

        this.addBuildingType('power_pole', {
            name: 'Poste de Energia',
            description: 'Infraestrutura de transmissão elétrica',
            category: 'power',
            cost: 200,
            size: 1,
            powerTransmission: true,
            maintenanceCost: 10,
            icon: '⚡',
            color: '#FFC107',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('thermal_plant', {
            name: 'Termelétrica',
            description: 'Usina térmica a gás natural',
            category: 'power',
            cost: 8000,
            size: 2,
            powerGeneration: 300,
            pollutionGeneration: 25,
            maintenanceCost: 150,
            icon: '🏭',
            color: '#FF5722',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('nuclear_plant', {
            name: 'Usina Nuclear',
            description: 'Usina nuclear de alta capacidade',
            category: 'power',
            cost: 50000,
            size: 4,
            powerGeneration: 1000,
            pollutionGeneration: 5,
            maintenanceCost: 500,
            icon: '☢️',
            color: '#9C27B0',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: true
            }
        });

        this.addBuildingType('coal_plant', {
            name: 'Usina a Carvão',
            description: 'Usina térmica a carvão de baixo custo',
            category: 'power',
            cost: 6000,
            size: 2,
            powerGeneration: 250,
            pollutionGeneration: 50,
            maintenanceCost: 100,
            icon: '🏭',
            color: '#424242',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('solar_farm', {
            name: 'Usina Solar',
            description: 'Fazenda solar fotovoltaica limpa',
            category: 'power',
            cost: 12000,
            size: 3,
            powerGeneration: 200,
            pollutionGeneration: 0,
            maintenanceCost: 80,
            icon: '☀️',
            color: '#FFEB3B',
            requirements: {
                terrain: ['grassland', 'lowland', 'desert'],
                nearWater: false
            }
        });

        this.addBuildingType('wind_farm', {
            name: 'Campo Eólico',
            description: 'Parque eólico de energia limpa',
            category: 'power',
            cost: 10000,
            size: 2,
            powerGeneration: 180,
            pollutionGeneration: 0,
            maintenanceCost: 60,
            icon: '💨',
            color: '#4CAF50',
            requirements: {
                terrain: ['grassland', 'lowland', 'hill'],
                nearWater: false
            }
        });

        // CATEGORIA: PÚBLICO/ADMINISTRATIVO
        this.addBuildingType('city_hall', {
            name: 'Prefeitura Municipal',
            description: 'Centro administrativo da cidade - simboliza o desenvolvimento urbano',
            category: 'public',
            cost: 25000,
            size: 2,
            populationCapacity: 0,
            satisfactionBonus: 20,
            administrativeBonus: true,
            maintenanceCost: 500,
            icon: '🏛️',
            color: '#FFD700',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('school', {
            name: 'Escola',
            description: 'Instituição de ensino que aumenta a satisfação da população',
            category: 'public',
            cost: 15000,
            size: 2,
            satisfactionBonus: 15,
            educationBonus: true,
            maintenanceCost: 300,
            icon: '🏫',
            color: '#4CAF50',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('hospital', {
            name: 'Hospital',
            description: 'Centro médico que melhora a saúde e satisfação dos cidadãos',
            category: 'public',
            cost: 20000,
            size: 2,
            satisfactionBonus: 18,
            healthBonus: true,
            maintenanceCost: 400,
            icon: '🏥',
            color: '#F44336',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('fire_station', {
            name: 'Corpo de Bombeiros',
            description: 'Estação de bombeiros que protege a cidade',
            category: 'public',
            cost: 12000,
            size: 1,
            satisfactionBonus: 12,
            safetyBonus: true,
            maintenanceCost: 250,
            icon: '🚒',
            color: '#FF5722',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('police_station', {
            name: 'Delegacia de Polícia',
            description: 'Estação policial que mantém a segurança urbana',
            category: 'public',
            cost: 10000,
            size: 1,
            satisfactionBonus: 10,
            securityBonus: true,
            maintenanceCost: 200,
            icon: '🚔',
            color: '#3F51B5',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        console.log(`✅ ${this.buildingTypes.size} tipos de edifícios definidos`);
    }
    
    addBuildingType(id, config) {
        this.buildingTypes.set(id, {
            id,
            ...config,
            unlocked: true // Por enquanto todos desbloqueados
        });
    }
    
    createMaterials() {
        console.log('🎨 Criando materiais estilo Minecraft para edifícios...');

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
            zoning: new BABYLON.Color3(0.8, 0.8, 0.8)         // Cinza claro
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
    
    // ===== CONSTRUÇÃO =====
    canPlaceBuilding(gridX, gridZ, buildingTypeId) {
        const buildingType = this.buildingTypes.get(buildingTypeId);
        if (!buildingType) {
            console.warn(`❌ Tipo de edifício inválido: ${buildingTypeId}`);
            return { canPlace: false, reason: 'Tipo de edifício inválido' };
        }

        // Verificar se há espaço no grid
        if (!this.gridManager.canPlaceBuilding(gridX, gridZ, buildingType.size)) {
            console.warn(`❌ Área ocupada ou fora dos limites em (${gridX}, ${gridZ})`);
            return { canPlace: false, reason: 'Área ocupada ou fora dos limites' };
        }

        // Verificar requisitos de terreno
        if (buildingType.requirements) {
            const terrainType = this.gridManager.getTerrainType(gridX, gridZ);
            console.log(`🔍 Verificando terreno em (${gridX}, ${gridZ}): tipo='${terrainType}', requerido=${JSON.stringify(buildingType.requirements.terrain)}`);

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

                console.warn(`❌ Terreno inadequado: '${terrainType}' não está em ${JSON.stringify(buildingType.requirements.terrain)}`);
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

        console.log(`✅ Pode construir ${buildingType.name} em (${gridX}, ${gridZ})`);
        return {
            canPlace: true,
            reason: `Você pode construir ${buildingType.name} aqui`,
            userFriendly: true
        };
    }
    
    placeBuildingAt(worldPosition, buildingTypeId) {
        const gridPos = this.gridManager.worldToGrid(worldPosition);
        return this.placeBuilding(gridPos.x, gridPos.z, buildingTypeId);
    }
    
    placeBuilding(gridX, gridZ, buildingTypeId) {
        // Verificar cooldown de construção
        if (this.isBuildingOnCooldown()) {
            const remainingSeconds = Math.ceil(this.buildingCooldown.remainingTime / 1000);
            this.showNotification(`Aguarde ${remainingSeconds} segundos antes de construir novamente...`, 'warning');
            console.warn(`⚠️ Construção em cooldown: ${remainingSeconds}s restantes`);
            return null;
        }

        // Verificar se há construção em andamento
        if (this.constructionInProgress) {
            this.showNotification('Aguarde a construção atual terminar antes de iniciar outra...', 'warning');
            console.warn('⚠️ Construção já em andamento');
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
        
        // Verificar orçamento
        if (window.gameManager && gameManager.resourceManager) {
            if (!gameManager.resourceManager.canAfford(buildingType.cost)) {
                this.showNotification(`Orçamento insuficiente! Custo: R$ ${buildingType.cost.toLocaleString()}`, 'error');
                console.warn(`⚠️ Orçamento insuficiente: R$ ${buildingType.cost} (disponível: R$ ${gameManager.resourceManager.resources.budget.current})`);
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

        // Deduzir custo do orçamento
        if (window.gameManager && gameManager.resourceManager) {
            const success = gameManager.resourceManager.spendBudget(buildingType.cost);
            if (success) {
                console.log(`💰 Custo deduzido: R$ ${buildingType.cost.toLocaleString()}`);
            } else {
                console.error(`❌ Falha ao deduzir custo: R$ ${buildingType.cost.toLocaleString()}`);
            }
        }

        // Tocar som de construção
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('sfx_build');
        }

        // Notificar sistema de vida urbana se for uma estrada
        if (buildingType.id === 'road' && window.gameManager && window.gameManager.cityLifeSystem) {
            window.gameManager.cityLifeSystem.onRoadBuilt();
        }

        // Ativar cooldown de construção
        this.activateBuildingCooldown();

        // Mostrar notificação de sucesso
        this.showNotification(`${buildingType.name} construído com sucesso!`, 'success');

        console.log(`🏗️ Edifício construído: ${buildingType.name} em (${gridX}, ${gridZ})`);
        return buildingData;
    }
    
    createBuildingMesh(gridX, gridZ, buildingType) {
        const worldPos = this.gridManager.gridToWorld(gridX, gridZ);

        // Criar mesh estilo Minecraft voxel
        let mesh = this.createMinecraftStyleMesh(buildingType);

        if (!mesh) {
            // Fallback para mesh básico voxel
            mesh = this.createBasicVoxelMesh(buildingType);
        }

        // Posicionar no mundo (X e Z apenas, Y será ajustado depois)
        mesh.position.x = worldPos.x;
        mesh.position.z = worldPos.z;
        mesh.position.y = 0; // Será ajustado em adjustBuildingToTerrain

        // Aplicar material estilo Minecraft
        const material = this.createMinecraftBuildingMaterial(buildingType);
        mesh.material = material;

        // Adicionar sombras
        if (this.scene.shadowGenerator) {
            this.scene.shadowGenerator.addShadowCaster(mesh);
        }
        mesh.receiveShadows = true;

        // Ajustar posicionamento preciso no terreno
        this.adjustBuildingToTerrain(mesh, gridX, gridZ);

        // Criar sombra projetada no chão
        const terrainHeight = this.getTerrainHeightAt(gridX, gridZ);
        this.createBuildingShadow(mesh, mesh.position, terrainHeight);

        // Metadados
        mesh.metadata = {
            building: true,
            buildingType: buildingType.id,
            gridX,
            gridZ
        };

        return mesh;
    }

    createMinecraftStyleMesh(buildingType) {
        // Criar edifícios com estilo voxel baseado na categoria
        switch (buildingType.category) {
            case 'water':
                return this.createWaterFacilityMesh(buildingType);
            case 'treatment':
                return this.createTreatmentPlantMesh(buildingType);
            case 'storage':
                return this.createStorageMesh(buildingType);
            case 'residential':
                return this.createHouseMesh(buildingType);
            case 'power':
                return this.createPowerPlantMesh(buildingType);
            case 'infrastructure':
                return this.createInfrastructureMesh(buildingType);
            default:
                return null;
        }
    }

    createBasicVoxelMesh(buildingType) {
        // Mesh básico estilo Minecraft
        const size = buildingType.size || 1;
        const height = this.getBuildingHeight(buildingType);

        const mesh = BABYLON.MeshBuilder.CreateBox(`building_${buildingType.id}`, {
            width: size * this.gridManager.cellSize * 0.9,
            height: height,
            depth: size * this.gridManager.cellSize * 0.9
        }, this.scene);

        return mesh;
    }

    getBuildingHeight(buildingType) {
        // Alturas baseadas no tipo de edifício
        const heights = {
            'water_pump': 1.5,
            'treatment_plant': 2.5,
            'water_tank': 3.0,
            'house': 2.0,
            'apartment': 4.0,
            'power_plant': 3.5,
            'road': 0.1,
            'pipe': 0.2,
            'city_hall': 3.5,
            'school': 2.8,
            'hospital': 3.0,
            'fire_station': 2.5,
            'police_station': 2.3
        };

        return heights[buildingType.id] || 2.0;
    }

    createWaterFacilityMesh(buildingType) {
        const size = this.gridManager.cellSize * 0.9;

        // Base da bomba
        const base = BABYLON.MeshBuilder.CreateBox("waterBase", {
            width: size,
            height: 0.5,
            depth: size
        }, this.scene);

        // Torre da bomba
        const tower = BABYLON.MeshBuilder.CreateBox("waterTower", {
            width: size * 0.6,
            height: 1.0,
            depth: size * 0.6
        }, this.scene);
        tower.position.y = 0.75;

        // Combinar meshes
        const merged = BABYLON.Mesh.MergeMeshes([base, tower]);
        merged.name = `waterFacility_${buildingType.id}`;

        return merged;
    }

    createTreatmentPlantMesh(buildingType) {
        const size = this.gridManager.cellSize * 0.9;

        // Edifício principal
        const main = BABYLON.MeshBuilder.CreateBox("treatmentMain", {
            width: size,
            height: 1.5,
            depth: size
        }, this.scene);

        // Chaminé
        const chimney = BABYLON.MeshBuilder.CreateBox("treatmentChimney", {
            width: size * 0.3,
            height: 1.0,
            depth: size * 0.3
        }, this.scene);
        chimney.position.y = 2.0;
        chimney.position.x = size * 0.3;

        const merged = BABYLON.Mesh.MergeMeshes([main, chimney]);
        merged.name = `treatmentPlant_${buildingType.id}`;

        return merged;
    }

    createStorageMesh(buildingType) {
        const size = this.gridManager.cellSize * 0.9;

        // Tanque cilíndrico estilo voxel (usando cilindro com poucos lados)
        const tank = BABYLON.MeshBuilder.CreateCylinder("storageTank", {
            height: 2.5,
            diameterTop: size * 0.8,
            diameterBottom: size * 0.8,
            tessellation: 8 // Poucos lados para estilo voxel
        }, this.scene);

        tank.name = `storage_${buildingType.id}`;
        return tank;
    }

    createHouseMesh(buildingType) {
        const size = this.gridManager.cellSize * 0.9;

        // Base da casa
        const base = BABYLON.MeshBuilder.CreateBox("houseBase", {
            width: size,
            height: 1.5,
            depth: size
        }, this.scene);

        // Telhado (pirâmide)
        const roof = BABYLON.MeshBuilder.CreateBox("houseRoof", {
            width: size * 1.1,
            height: 0.8,
            depth: size * 1.1
        }, this.scene);
        roof.position.y = 1.9;
        roof.scaling.y = 0.5; // Achatar para parecer telhado

        const merged = BABYLON.Mesh.MergeMeshes([base, roof]);
        merged.name = `house_${buildingType.id}`;

        return merged;
    }

    createPowerPlantMesh(buildingType) {
        const size = this.gridManager.cellSize * 0.9;

        // Edifício principal
        const main = BABYLON.MeshBuilder.CreateBox("powerMain", {
            width: size,
            height: 2.0,
            depth: size
        }, this.scene);

        // Torres de resfriamento (cilindros)
        const tower1 = BABYLON.MeshBuilder.CreateCylinder("powerTower1", {
            height: 1.5,
            diameterTop: size * 0.4,
            diameterBottom: size * 0.4,
            tessellation: 6
        }, this.scene);
        tower1.position.y = 2.75;
        tower1.position.x = size * 0.3;

        const tower2 = tower1.clone("powerTower2");
        tower2.position.x = -size * 0.3;

        const merged = BABYLON.Mesh.MergeMeshes([main, tower1, tower2]);
        merged.name = `powerPlant_${buildingType.id}`;

        return merged;
    }

    createInfrastructureMesh(buildingType) {
        const size = this.gridManager.cellSize * 0.9;

        if (buildingType.id === 'road') {
            // Estrada baixa
            const road = BABYLON.MeshBuilder.CreateBox("road", {
                width: size,
                height: 0.1,
                depth: size
            }, this.scene);
            return road;
        } else if (buildingType.id === 'pipe') {
            // Cano
            const pipe = BABYLON.MeshBuilder.CreateCylinder("pipe", {
                height: size,
                diameterTop: size * 0.2,
                diameterBottom: size * 0.2,
                tessellation: 8
            }, this.scene);
            pipe.rotation.z = Math.PI / 2; // Horizontal
            return pipe;
        }

        // Infraestrutura genérica
        return this.createBasicVoxelMesh(buildingType);
    }

    getTerrainHeightAt(gridX, gridZ) {
        // Obter altura do terreno na posição especificada
        if (this.gridManager && this.gridManager.elevationGrid) {
            const elevation = this.gridManager.elevationGrid[gridX] && this.gridManager.elevationGrid[gridX][gridZ];
            if (elevation !== undefined) {
                return Math.max(0.1, elevation * 0.5 + 0.1);
            }
        }
        return 0.1; // Altura padrão
    }

    createBuildingShadow(buildingMesh, worldPos, terrainHeight) {
        // Criar sombra projetada simples no chão
        const boundingBox = buildingMesh.getBoundingInfo().boundingBox;
        const shadowSize = Math.max(boundingBox.extendSize.x, boundingBox.extendSize.z) * 2;

        const shadow = BABYLON.MeshBuilder.CreateGround(`shadow_${buildingMesh.name}`, {
            width: shadowSize * 1.3,
            height: shadowSize * 1.3
        }, this.scene);

        shadow.position = worldPos.clone();
        shadow.position.y = terrainHeight + 0.005; // Muito próximo ao terreno

        // Material de sombra com gradiente
        const shadowMaterial = new BABYLON.StandardMaterial(`shadowMat_${buildingMesh.name}`, this.scene);
        shadowMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        shadowMaterial.alpha = 0.4;
        shadowMaterial.backFaceCulling = false;

        // Criar textura de sombra com gradiente radial
        try {
            const shadowTexture = new BABYLON.DynamicTexture(`shadowTex_${buildingMesh.name}`, 64, this.scene);
            const context = shadowTexture.getContext();
            const imageData = context.createImageData(64, 64);
            const data = imageData.data;

            const center = 32;
            const maxRadius = 32;

            for (let x = 0; x < 64; x++) {
                for (let y = 0; y < 64; y++) {
                    const distance = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
                    const alpha = Math.max(0, 1 - (distance / maxRadius));
                    const index = (y * 64 + x) * 4;

                    data[index] = 0;     // R
                    data[index + 1] = 0; // G
                    data[index + 2] = 0; // B
                    data[index + 3] = alpha * 255; // A
                }
            }

            context.putImageData(imageData, 0, 0);
            shadowTexture.update();

            shadowMaterial.diffuseTexture = shadowTexture;
            shadowMaterial.diffuseTexture.hasAlpha = true;

            // Rastrear textura de sombra para limpeza
            this.dynamicTextures.set(`shadowTex_${buildingMesh.name}`, shadowTexture);
        } catch (error) {
            console.warn('⚠️ Não foi possível criar textura de sombra gradiente');
        }

        shadow.material = shadowMaterial;

        // Associar sombra ao edifício e rastrear para limpeza
        buildingMesh.shadowMesh = shadow;
        this.shadowMeshes.set(buildingMesh.name, shadow);

        return shadow;
    }

    // Método para ajustar posicionamento preciso no terreno
    adjustBuildingToTerrain(buildingMesh, gridX, gridZ) {
        const terrainHeight = this.getTerrainHeightAt(gridX, gridZ);
        const boundingBox = buildingMesh.getBoundingInfo().boundingBox;

        // Verificar se há blocos de terreno adjacentes para melhor alinhamento
        const adjacentHeights = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const adjX = gridX + dx;
                const adjZ = gridZ + dz;
                if (adjX >= 0 && adjX < this.gridManager.gridSize &&
                    adjZ >= 0 && adjZ < this.gridManager.gridSize) {
                    adjacentHeights.push(this.getTerrainHeightAt(adjX, adjZ));
                }
            }
        }

        // Usar altura média dos terrenos adjacentes para melhor integração
        let finalTerrainHeight = terrainHeight;
        if (adjacentHeights.length > 0) {
            finalTerrainHeight = adjacentHeights.reduce((a, b) => a + b, 0) / adjacentHeights.length;
        }

        // Posicionar o edifício com a base tocando o terreno
        // boundingBox.minimum.y é a distância do centro até a base do mesh
        const meshBottomOffset = Math.abs(boundingBox.minimum.y);
        buildingMesh.position.y = finalTerrainHeight + meshBottomOffset + 0.02; // Pequeno offset para evitar z-fighting

        // Criar base de conexão com o terreno se necessário
        this.createTerrainConnection(buildingMesh, gridX, gridZ, finalTerrainHeight);
    }

    createTerrainConnection(buildingMesh, gridX, gridZ, terrainHeight) {
        // Criar uma pequena base que conecta o edifício ao terreno
        const size = this.gridManager.cellSize * 0.95;

        const connection = BABYLON.MeshBuilder.CreateBox(`connection_${buildingMesh.name}`, {
            width: size,
            height: 0.05,
            depth: size
        }, this.scene);

        const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
        connection.position = worldPos;
        connection.position.y = terrainHeight + 0.025;

        // Material que combina com o terreno
        const terrainType = this.gridManager.getTerrainType(gridX, gridZ);
        const connectionMaterial = new BABYLON.StandardMaterial(`connectionMat_${buildingMesh.name}`, this.scene);

        if (terrainType === 'dirt') {
            connectionMaterial.diffuseColor = new BABYLON.Color3(0.45, 0.25, 0.15);
        } else if (terrainType === 'rock') {
            connectionMaterial.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.35);
        } else {
            connectionMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);
        }

        connectionMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        connection.material = connectionMaterial;
        connection.receiveShadows = true;

        // Associar conexão ao edifício e rastrear para limpeza
        buildingMesh.terrainConnection = connection;
        this.connectionMeshes.set(buildingMesh.name, connection);

        return connection;
    }

    createMinecraftBuildingMaterial(buildingType) {
        const materialName = `minecraftMat_${buildingType.id}`;
        let material = this.materials.get(materialName);

        if (!material) {
            material = new BABYLON.StandardMaterial(materialName, this.scene);

            // Cor baseada no tipo com estilo Minecraft
            if (buildingType.color) {
                const color = BABYLON.Color3.FromHexString(buildingType.color);
                material.diffuseColor = color;
            } else {
                // Cor padrão baseada na categoria
                const categoryMaterial = this.materials.get(buildingType.category);
                if (categoryMaterial) {
                    material.diffuseColor = categoryMaterial.diffuseColor;
                } else {
                    material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                }
            }

            // Propriedades do material estilo Minecraft
            material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Pouco brilho
            material.backFaceCulling = false; // Para melhor visualização dos blocos

            // Transparência para zonas
            if (buildingType.category === 'zoning') {
                material.alpha = 0.6;
            }

            // Adicionar textura procedural pixelada se possível
            try {
                this.addPixelatedTexture(material, buildingType);
            } catch (error) {
                console.warn('⚠️ Não foi possível criar textura pixelada para', buildingType.id);
            }

            this.materials.set(materialName, material);
        }

        return material;
    }

    addPixelatedTexture(material, buildingType) {
        // Verificar se já existe uma textura para este tipo de edifício
        const textureKey = `pixelTex_${buildingType.id}`;
        let dynamicTexture = this.dynamicTextures.get(textureKey);

        if (!dynamicTexture) {
            // Criar textura pixelada simples
            const textureSize = 32; // Pequeno para efeito pixelado
            dynamicTexture = new BABYLON.DynamicTexture(textureKey, textureSize, this.scene);
            const context = dynamicTexture.getContext();

            // Preencher com padrão pixelado baseado na categoria
            const imageData = context.createImageData(textureSize, textureSize);
            const data = imageData.data;

            const baseColor = material.diffuseColor;

            for (let i = 0; i < data.length; i += 4) {
                const variation = (Math.random() - 0.5) * 0.3;
                data[i] = Math.max(0, Math.min(255, (baseColor.r + variation) * 255));     // R
                data[i + 1] = Math.max(0, Math.min(255, (baseColor.g + variation) * 255)); // G
                data[i + 2] = Math.max(0, Math.min(255, (baseColor.b + variation) * 255)); // B
                data[i + 3] = 255; // A
            }

            context.putImageData(imageData, 0, 0);
            dynamicTexture.update();

            // Rastrear para limpeza posterior
            this.dynamicTextures.set(textureKey, dynamicTexture);
        }

        material.diffuseTexture = dynamicTexture;
        material.diffuseTexture.hasAlpha = false;
        material.diffuseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        material.diffuseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        material.diffuseTexture.magFilter = BABYLON.Texture.NEAREST_SAMPLINGMODE; // Pixelado
        material.diffuseTexture.minFilter = BABYLON.Texture.NEAREST_SAMPLINGMODE;
    }

    createSpecializedMesh(buildingType) {
        const size = buildingType.size;
        const category = buildingType.category;
        const type = buildingType.id;

        try {
            switch (category) {
                case 'water':
                    return this.createWaterFacilityMesh(type, size);
                case 'treatment':
                    return this.createTreatmentFacilityMesh(type, size);
                case 'storage':
                    return this.createStorageFacilityMesh(type, size);
                case 'residential':
                    return this.createResidentialMesh(type, size);
                case 'infrastructure':
                    return this.createInfrastructureMesh(type, size);
                case 'zoning':
                    return this.createZoneMesh(type, size);
                case 'power':
                    return this.createPowerFacilityMesh(type, size);
                default:
                    return null;
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao criar mesh especializado para ${type}:`, error);
            return null;
        }
    }

    createWaterFacilityMesh(type, size) {
        let mesh;

        if (type === 'water_pump') {
            // Bomba de água - cilindro com base
            const base = BABYLON.MeshBuilder.CreateBox("pump_base", {
                width: 1.2, height: 0.3, depth: 1.2
            }, this.scene);

            const cylinder = BABYLON.MeshBuilder.CreateCylinder("pump_cylinder", {
                height: 1.5, diameter: 0.8
            }, this.scene);
            cylinder.position.y = 0.9;

            mesh = BABYLON.Mesh.MergeMeshes([base, cylinder]);

        } else if (type === 'water_well') {
            // Poço - cilindro baixo com anel
            const well = BABYLON.MeshBuilder.CreateCylinder("well", {
                height: 0.5, diameter: 1.0
            }, this.scene);

            const ring = BABYLON.MeshBuilder.CreateTorus("well_ring", {
                diameter: 1.2, thickness: 0.1
            }, this.scene);
            ring.position.y = 0.3;

            mesh = BABYLON.Mesh.MergeMeshes([well, ring]);

        } else if (type === 'desalination_plant') {
            // Usina - complexo industrial
            const main = BABYLON.MeshBuilder.CreateBox("desal_main", {
                width: 2.5, height: 2, depth: 2.5
            }, this.scene);

            const tower = BABYLON.MeshBuilder.CreateCylinder("desal_tower", {
                height: 3, diameter: 0.8
            }, this.scene);
            tower.position.x = 1;
            tower.position.y = 1.5;

            mesh = BABYLON.Mesh.MergeMeshes([main, tower]);
        }

        return mesh;
    }

    createTreatmentFacilityMesh(type, size) {
        // Estação de tratamento - edifício industrial com tanques
        const main = BABYLON.MeshBuilder.CreateBox("treatment_main", {
            width: 2.5, height: 1.5, depth: 2.5
        }, this.scene);

        const tank1 = BABYLON.MeshBuilder.CreateCylinder("treatment_tank1", {
            height: 1, diameter: 0.8
        }, this.scene);
        tank1.position.x = -0.8;
        tank1.position.y = 1.25;

        const tank2 = BABYLON.MeshBuilder.CreateCylinder("treatment_tank2", {
            height: 1, diameter: 0.8
        }, this.scene);
        tank2.position.x = 0.8;
        tank2.position.y = 1.25;

        return BABYLON.Mesh.MergeMeshes([main, tank1, tank2]);
    }

    createStorageFacilityMesh(type, size) {
        if (type === 'water_tank') {
            // Reservatório - cilindro grande
            return BABYLON.MeshBuilder.CreateCylinder("storage_tank", {
                height: 2, diameter: 1.8
            }, this.scene);

        } else if (type === 'water_tower') {
            // Caixa d'água - cilindro elevado
            const base = BABYLON.MeshBuilder.CreateCylinder("tower_base", {
                height: 2.5, diameter: 0.3
            }, this.scene);

            const tank = BABYLON.MeshBuilder.CreateCylinder("tower_tank", {
                height: 1, diameter: 1.2
            }, this.scene);
            tank.position.y = 2;

            return BABYLON.Mesh.MergeMeshes([base, tank]);
        }

        return null;
    }

    createResidentialMesh(type, size) {
        if (type === 'house') {
            // Casa - caixa com telhado
            const base = BABYLON.MeshBuilder.CreateBox("house_base", {
                width: 1.2, height: 1.5, depth: 1.2
            }, this.scene);

            const roof = BABYLON.MeshBuilder.CreateCylinder("house_roof", {
                height: 0.8, diameterTop: 0, diameterBottom: 1.6, tessellation: 4
            }, this.scene);
            roof.position.y = 1.5;
            roof.rotation.y = Math.PI / 4;

            return BABYLON.Mesh.MergeMeshes([base, roof]);

        } else if (type === 'apartment') {
            // Prédio - caixa alta
            return BABYLON.MeshBuilder.CreateBox("apartment", {
                width: 2.5, height: 3, depth: 2.5
            }, this.scene);
        }

        return null;
    }

    createInfrastructureMesh(type, size) {
        if (type.includes('road')) {
            // Estrada - plano baixo
            return BABYLON.MeshBuilder.CreateBox("road", {
                width: 1.8, height: 0.1, depth: 1.8
            }, this.scene);

        } else if (type === 'sidewalk') {
            // Calçada - plano ainda mais baixo
            return BABYLON.MeshBuilder.CreateBox("sidewalk", {
                width: 1.6, height: 0.05, depth: 1.6
            }, this.scene);

        } else if (type === 'plaza') {
            // Praça - plano com decoração
            const base = BABYLON.MeshBuilder.CreateBox("plaza_base", {
                width: 3, height: 0.1, depth: 3
            }, this.scene);

            const tree = BABYLON.MeshBuilder.CreateCylinder("plaza_tree", {
                height: 1.5, diameter: 0.3
            }, this.scene);
            tree.position.y = 0.8;

            return BABYLON.Mesh.MergeMeshes([base, tree]);

        } else if (type === 'bridge') {
            // Ponte - plano elevado
            return BABYLON.MeshBuilder.CreateBox("bridge", {
                width: 1.8, height: 0.2, depth: 1.8
            }, this.scene);
        }

        return null;
    }

    createZoneMesh(type, size) {
        // Zona - plano transparente com bordas
        const zone = BABYLON.MeshBuilder.CreateBox("zone", {
            width: size * 1.8, height: 0.05, depth: size * 1.8
        }, this.scene);

        return zone;
    }

    createPowerFacilityMesh(type, size) {
        let mesh;

        try {
            if (type === 'hydroelectric_plant') {
                // Hidrelétrica - estrutura complexa com barragem
                const main = BABYLON.MeshBuilder.CreateBox("hydro_main", {
                    width: 4, height: 2.5, depth: 3
                }, this.scene);

                const turbine1 = BABYLON.MeshBuilder.CreateCylinder("hydro_turbine1", {
                    height: 1.5, diameter: 1.2
                }, this.scene);
                turbine1.position.x = -1.5;
                turbine1.position.y = 1.5;

                const turbine2 = BABYLON.MeshBuilder.CreateCylinder("hydro_turbine2", {
                    height: 1.5, diameter: 1.2
                }, this.scene);
                turbine2.position.x = 1.5;
                turbine2.position.y = 1.5;

                mesh = BABYLON.Mesh.MergeMeshes([main, turbine1, turbine2]);

            } else if (type === 'power_pole') {
                // Poste de energia - torre alta e fina
                const pole = BABYLON.MeshBuilder.CreateCylinder("power_pole", {
                    height: 3, diameter: 0.2
                }, this.scene);

                const crossbar = BABYLON.MeshBuilder.CreateBox("power_crossbar", {
                    width: 1.5, height: 0.1, depth: 0.1
                }, this.scene);
                crossbar.position.y = 2.5;

                mesh = BABYLON.Mesh.MergeMeshes([pole, crossbar]);

            } else if (type === 'thermal_plant') {
                // Termelétrica - edifício industrial com chaminés
                const main = BABYLON.MeshBuilder.CreateBox("thermal_main", {
                    width: 3, height: 2, depth: 2.5
                }, this.scene);

                const chimney1 = BABYLON.MeshBuilder.CreateCylinder("thermal_chimney1", {
                    height: 4, diameter: 0.6
                }, this.scene);
                chimney1.position.x = -1;
                chimney1.position.y = 2.5;

                const chimney2 = BABYLON.MeshBuilder.CreateCylinder("thermal_chimney2", {
                    height: 3.5, diameter: 0.5
                }, this.scene);
                chimney2.position.x = 1;
                chimney2.position.y = 2.25;

                mesh = BABYLON.Mesh.MergeMeshes([main, chimney1, chimney2]);

            } else if (type === 'nuclear_plant') {
                // Usina nuclear - domo característico
                const base = BABYLON.MeshBuilder.CreateBox("nuclear_base", {
                    width: 4, height: 1.5, depth: 4
                }, this.scene);

                const dome = BABYLON.MeshBuilder.CreateSphere("nuclear_dome", {
                    diameter: 3
                }, this.scene);
                dome.position.y = 2.25;

                const tower = BABYLON.MeshBuilder.CreateCylinder("nuclear_tower", {
                    height: 5, diameterTop: 1.5, diameterBottom: 2
                }, this.scene);
                tower.position.x = 2.5;
                tower.position.y = 2.5;

                mesh = BABYLON.Mesh.MergeMeshes([base, dome, tower]);

            } else if (type === 'coal_plant') {
                // Usina a carvão - similar à termelétrica mas mais simples
                const main = BABYLON.MeshBuilder.CreateBox("coal_main", {
                    width: 2.5, height: 1.8, depth: 2
                }, this.scene);

                const chimney = BABYLON.MeshBuilder.CreateCylinder("coal_chimney", {
                    height: 3.5, diameter: 0.8
                }, this.scene);
                chimney.position.y = 2.5;

                mesh = BABYLON.Mesh.MergeMeshes([main, chimney]);

            } else if (type === 'solar_farm') {
                // Fazenda solar - painéis solares
                const base = BABYLON.MeshBuilder.CreateBox("solar_base", {
                    width: 4, height: 0.2, depth: 4
                }, this.scene);

                const panel1 = BABYLON.MeshBuilder.CreateBox("solar_panel1", {
                    width: 1.5, height: 0.1, depth: 2
                }, this.scene);
                panel1.position.x = -1;
                panel1.position.y = 0.8;
                panel1.rotation.z = Math.PI / 6;

                const panel2 = BABYLON.MeshBuilder.CreateBox("solar_panel2", {
                    width: 1.5, height: 0.1, depth: 2
                }, this.scene);
                panel2.position.x = 1;
                panel2.position.y = 0.8;
                panel2.rotation.z = Math.PI / 6;

                mesh = BABYLON.Mesh.MergeMeshes([base, panel1, panel2]);

            } else if (type === 'wind_farm') {
                // Campo eólico - turbinas eólicas
                const base = BABYLON.MeshBuilder.CreateCylinder("wind_base", {
                    height: 0.5, diameter: 1
                }, this.scene);

                const tower = BABYLON.MeshBuilder.CreateCylinder("wind_tower", {
                    height: 3, diameter: 0.3
                }, this.scene);
                tower.position.y = 1.75;

                const nacelle = BABYLON.MeshBuilder.CreateBox("wind_nacelle", {
                    width: 0.8, height: 0.4, depth: 0.4
                }, this.scene);
                nacelle.position.y = 3.2;

                // Pás da turbina
                const blade1 = BABYLON.MeshBuilder.CreateBox("wind_blade1", {
                    width: 0.1, height: 1.5, depth: 0.05
                }, this.scene);
                blade1.position.y = 3.2;
                blade1.position.x = 0.75;

                const blade2 = BABYLON.MeshBuilder.CreateBox("wind_blade2", {
                    width: 0.1, height: 1.5, depth: 0.05
                }, this.scene);
                blade2.position.y = 3.2;
                blade2.position.x = 0.75;
                blade2.rotation.z = 2 * Math.PI / 3;

                const blade3 = BABYLON.MeshBuilder.CreateBox("wind_blade3", {
                    width: 0.1, height: 1.5, depth: 0.05
                }, this.scene);
                blade3.position.y = 3.2;
                blade3.position.x = 0.75;
                blade3.rotation.z = 4 * Math.PI / 3;

                mesh = BABYLON.Mesh.MergeMeshes([base, tower, nacelle, blade1, blade2, blade3]);
            }

            return mesh;

        } catch (error) {
            console.error(`❌ Erro ao criar mesh de energia para ${type}:`, error);
            return null;
        }
    }

    createBasicMesh(buildingType) {
        // Mesh básico como fallback
        const size = buildingType.size;

        if (size === 1) {
            return BABYLON.MeshBuilder.CreateBox(`building_${buildingType.id}`, {
                width: 1.5, height: 2, depth: 1.5
            }, this.scene);
        } else {
            return BABYLON.MeshBuilder.CreateBox(`building_${buildingType.id}`, {
                width: size * 1.5, height: 2.5, depth: size * 1.5
            }, this.scene);
        }
    }

    createBuildingMaterial(buildingType) {
        const materialName = `material_${buildingType.id}`;
        let material = this.materials.get(materialName);

        if (!material) {
            material = new BABYLON.StandardMaterial(materialName, this.scene);

            // Cor baseada no tipo
            if (buildingType.color) {
                const color = BABYLON.Color3.FromHexString(buildingType.color);
                material.diffuseColor = color;
            } else {
                // Cor padrão baseada na categoria
                const categoryMaterial = this.materials.get(buildingType.category);
                if (categoryMaterial) {
                    material.diffuseColor = categoryMaterial.diffuseColor;
                } else {
                    material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                }
            }

            // Propriedades do material
            material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

            // Transparência para zonas
            if (buildingType.category === 'zoning') {
                material.alpha = 0.6;
            }

            this.materials.set(materialName, material);
        }

        return material;
    }
    
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

        // Adicionar à fila de disposal para processamento assíncrono
        if (building.mesh) {
            this.queueForDisposal(building.mesh);
        }

        console.log(`🗑️ Edifício removido: ${building.config.name}`);
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
            if (shadowTexture && !shadowTexture.isDisposed()) {
                shadowTexture.dispose();
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
        const multiplier = add ? 1 : -1;
        
        // Aplicar efeitos se ResourceManager estiver disponível
        if (window.gameManager && gameManager.resourceManager) {
            const resourceManager = gameManager.resourceManager;
            
            // Produção de água
            if (config.waterProduction) {
                if (add) {
                    resourceManager.addWaterProduction(config.waterProduction * building.efficiency);
                } else {
                    resourceManager.removeWaterProduction(config.waterProduction * building.efficiency);
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

            // Geração de energia
            if (config.powerGeneration) {
                if (add) {
                    resourceManager.addElectricityGeneration(config.powerGeneration);
                } else {
                    resourceManager.removeElectricityGeneration(config.powerGeneration);
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
        }
    }

    addSatisfactionBonus(amount) {
        // Implementar quando ResourceManager suportar bônus de satisfação
        console.log(`✅ Bônus de satisfação adicionado: +${amount}%`);
    }

    removeSatisfactionBonus(amount) {
        // Implementar quando ResourceManager suportar bônus de satisfação
        console.log(`➖ Bônus de satisfação removido: -${amount}%`);
    }

    // ===== UTILITÁRIOS =====
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
    
    getBuildingsByCategory(category) {
        return Array.from(this.buildings.values()).filter(
            building => building.config.category === category
        );
    }
    
    // ===== PREVIEW =====
    showBuildingPreview(gridX, gridZ, buildingTypeId) {
        this.hideBuildingPreview();
        
        const buildingType = this.buildingTypes.get(buildingTypeId);
        if (!buildingType) return;
        
        const canPlace = this.canPlaceBuilding(gridX, gridZ, buildingTypeId);
        const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
        
        // Criar mesh de preview
        this.previewMesh = BABYLON.MeshBuilder.CreateBox("preview", {
            width: buildingType.size * 1.5,
            height: 2,
            depth: buildingType.size * 1.5
        }, this.scene);
        
        this.previewMesh.position = worldPos;
        this.previewMesh.position.y += 1;
        
        // Material baseado na validade
        const material = canPlace.canPlace ? 
            this.materials.get('preview') : 
            this.materials.get('error');
        this.previewMesh.material = material;
    }
    
    hideBuildingPreview() {
        if (this.previewMesh) {
            this.previewMesh.dispose();
            this.previewMesh = null;
        }
    }
    
    // ===== ATUALIZAÇÃO =====
    update(deltaTime) {
        try {
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
                this.constructionInProgress = false;
                this.constructionQueue.clear();
            }

        } catch (error) {
            console.error('❌ Erro crítico no update do BuildingSystem:', error);
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
        this.constructionInProgress = true;
        this.constructionQueue.set(buildingData.id, buildingData);

        // Criar indicador de progresso 3D
        this.createConstructionIndicator(buildingData);

        // Aplicar efeito visual de construção
        this.applyConstructionVisuals(buildingData);

        console.log(`🚧 Iniciando construção de ${buildingData.config.name} (${buildingData.constructionDuration / 1000}s)`);
    }

    updateConstructions(deltaTime) {
        if (this.constructionQueue.size === 0) {
            this.constructionInProgress = false;
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

        // Verificar se ainda há construções em andamento
        if (this.constructionQueue.size === 0) {
            this.constructionInProgress = false;
            console.log('✅ Todas as construções concluídas');
        }
    }

    completeConstruction(buildingData) {
        console.log(`✅ Construção concluída: ${buildingData.config.name}`);

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

        // Mostrar indicador de conclusão
        this.showCompletionIndicator(buildingData);

        // Verificar se há mais construções na fila
        if (this.constructionQueue.size === 0) {
            this.constructionInProgress = false;
        }
    }

    // ===== SISTEMA DE COOLDOWN =====
    isBuildingOnCooldown() {
        return this.buildingCooldown.active;
    }

    activateBuildingCooldown() {
        this.buildingCooldown.active = true;
        this.buildingCooldown.lastBuildTime = Date.now();
        this.buildingCooldown.remainingTime = this.buildingCooldown.duration;

        console.log(`⏱️ Cooldown de construção ativado: ${this.buildingCooldown.duration}ms`);
    }

    updateBuildingCooldown(deltaTime) {
        if (!this.buildingCooldown.active) return;

        this.buildingCooldown.remainingTime -= deltaTime;

        if (this.buildingCooldown.remainingTime <= 0) {
            this.buildingCooldown.active = false;
            this.buildingCooldown.remainingTime = 0;
            console.log(`✅ Cooldown de construção finalizado`);
        }
    }

    getBuildingCooldownProgress() {
        if (!this.buildingCooldown.active) return 0;

        const elapsed = this.buildingCooldown.duration - this.buildingCooldown.remainingTime;
        return Math.min(1, elapsed / this.buildingCooldown.duration);
    }

    // ===== SISTEMA DE NOTIFICAÇÕES =====
    showNotification(message, type = 'info') {
        // Tentar usar o sistema de notificações do jogo se disponível
        if (window.gameManager && window.gameManager.uiManager && window.gameManager.uiManager.showNotification) {
            window.gameManager.uiManager.showNotification(message, type);
        } else if (window.gameManager && window.gameManager.uiManager && window.gameManager.uiManager.showAlert) {
            window.gameManager.uiManager.showAlert(message, type);
        } else {
            // Fallback para console se UI não estiver disponível
            const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
            console.log(`${prefix} ${message}`);
        }
    }

    // ===== INDICADORES VISUAIS DE CONSTRUÇÃO =====
    createConstructionIndicator(buildingData) {
        const worldPos = this.gridManager.gridToWorld(buildingData.gridX, buildingData.gridZ);

        // Criar barra de progresso 3D
        const progressBar = BABYLON.MeshBuilder.CreateBox(`progress_${buildingData.id}`, {
            width: 2,
            height: 0.2,
            depth: 0.4
        }, this.scene);

        progressBar.position.x = worldPos.x;
        progressBar.position.z = worldPos.z;
        progressBar.position.y = 3; // Acima do edifício

        // Material da barra de progresso
        const progressMaterial = new BABYLON.StandardMaterial(`progressMat_${buildingData.id}`, this.scene);
        progressMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2); // Verde
        progressMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1);
        progressBar.material = progressMaterial;

        // Criar fundo da barra
        const progressBg = BABYLON.MeshBuilder.CreateBox(`progressBg_${buildingData.id}`, {
            width: 2.1,
            height: 0.25,
            depth: 0.45
        }, this.scene);

        progressBg.position.x = worldPos.x;
        progressBg.position.z = worldPos.z;
        progressBg.position.y = 2.98;

        const bgMaterial = new BABYLON.StandardMaterial(`progressBgMat_${buildingData.id}`, this.scene);
        bgMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        progressBg.material = bgMaterial;

        // Criar texto de porcentagem
        const textPlane = BABYLON.MeshBuilder.CreatePlane(`progressText_${buildingData.id}`, {
            width: 1.5,
            height: 0.5
        }, this.scene);

        textPlane.position.x = worldPos.x;
        textPlane.position.z = worldPos.z;
        textPlane.position.y = 3.8;
        textPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        // Material do texto
        const textMaterial = new BABYLON.StandardMaterial(`textMat_${buildingData.id}`, this.scene);
        textMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        textMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        textPlane.material = textMaterial;

        // Armazenar referências
        buildingData.constructionIndicators = {
            progressBar: progressBar,
            progressBg: progressBg,
            textPlane: textPlane
        };
    }

    updateConstructionIndicator(buildingData, progress) {
        if (!buildingData.constructionIndicators) return;

        const { progressBar, textPlane } = buildingData.constructionIndicators;

        // Atualizar largura da barra de progresso
        progressBar.scaling.x = progress;

        // Atualizar cor baseada no progresso
        const material = progressBar.material;
        if (material) {
            const red = 1 - progress;
            const green = progress;
            material.diffuseColor = new BABYLON.Color3(red, green, 0.2);
            material.emissiveColor = new BABYLON.Color3(red * 0.5, green * 0.5, 0.1);
        }

        // Atualizar texto de porcentagem (simulado com cor)
        const percentage = Math.floor(progress * 100);
        if (textPlane.material) {
            // Simular texto mudando a cor baseada na porcentagem
            const intensity = 0.5 + (progress * 0.5);
            textPlane.material.emissiveColor = new BABYLON.Color3(intensity, intensity, intensity);
        }
    }

    removeConstructionVisuals(buildingData) {
        if (buildingData.constructionIndicators) {
            const { progressBar, progressBg, textPlane } = buildingData.constructionIndicators;

            if (progressBar && !progressBar.isDisposed()) progressBar.dispose();
            if (progressBg && !progressBg.isDisposed()) progressBg.dispose();
            if (textPlane && !textPlane.isDisposed()) textPlane.dispose();

            delete buildingData.constructionIndicators;
        }
    }

    applyConstructionVisuals(buildingData) {
        if (buildingData.mesh) {
            // Aplicar efeito de construção (escala reduzida e rotação)
            buildingData.mesh.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
            buildingData.originalRotation = buildingData.mesh.rotation.clone();

            // Armazenar estado original para restaurar depois
            buildingData.originalScaling = new BABYLON.Vector3(1, 1, 1);
        }
    }

    showCompletionIndicator(buildingData) {
        const worldPos = this.gridManager.gridToWorld(buildingData.gridX, buildingData.gridZ);

        // Criar texto "Concluído" temporário
        const completionText = BABYLON.MeshBuilder.CreatePlane(`completion_${buildingData.id}`, {
            width: 2,
            height: 0.8
        }, this.scene);

        completionText.position.x = worldPos.x;
        completionText.position.z = worldPos.z;
        completionText.position.y = 4;
        completionText.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        const textMaterial = new BABYLON.StandardMaterial(`completionMat_${buildingData.id}`, this.scene);
        textMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
        textMaterial.emissiveColor = new BABYLON.Color3(0, 0.8, 0);
        completionText.material = textMaterial;

        // Restaurar escala do edifício
        if (buildingData.mesh) {
            buildingData.mesh.scaling = buildingData.originalScaling || new BABYLON.Vector3(1, 1, 1);
        }

        // Remover texto após 2 segundos
        setTimeout(() => {
            if (completionText && !completionText.isDisposed()) {
                completionText.dispose();
            }
        }, 2000);

        // Mostrar notificação
        this.showNotification(`${buildingData.config.name} concluído!`, 'success');
    }
    
    updateBuildingEfficiency(building) {
        // Só atualizar eficiência para edifícios ativos
        if (!building.active || building.underConstruction) {
            return;
        }

        let efficiency = 1.0;

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

                console.log(`🔧 Eficiência atualizada para ${building.config.name}: ${oldEfficiency.toFixed(2)} -> ${efficiency.toFixed(2)}`);
            } catch (error) {
                console.error(`❌ Erro ao atualizar eficiência do edifício ${building.id}:`, error);
                // Restaurar eficiência anterior em caso de erro
                building.efficiency = oldEfficiency;
            }
        }
    }
    
    // ===== GETTERS =====
    getBuildingTypes() { return Array.from(this.buildingTypes.values()); }
    getBuildingTypesByCategory(category) {
        return Array.from(this.buildingTypes.values()).filter(
            type => type.category === category
        );
    }
    getAllBuildings() { return Array.from(this.buildings.values()); }
    getBuildingCount() { return this.buildings.size; }
    
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
        console.log('🔄 Reconstruindo edifícios...');
    }

    // ===== SISTEMA DE PREVIEW =====
    startPreviewMode(buildingTypeId) {
        console.log(`🔍 Iniciando modo preview para: ${buildingTypeId}`);

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
        console.log('🔍 Parando modo preview');

        this.previewMode = false;
        this.selectedBuildingType = null;
        this.clearPreview();
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

        // Verificar se mudou de posição
        if (gridX === this.lastPreviewPosition.x && gridZ === this.lastPreviewPosition.z) {
            return;
        }

        this.lastPreviewPosition = { x: gridX, z: gridZ };

        // Verificar se a posição é válida usando o método correto
        const canPlaceResult = this.canPlaceBuilding(gridX, gridZ, this.selectedBuildingType);

        // Atualizar posição dos meshes
        if (this.previewMesh) {
            const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
            this.previewMesh.position = worldPos;
            this.previewMesh.position.y += this.previewMesh.getBoundingInfo().boundingBox.extendSize.y;
            this.previewMesh.setEnabled(true);
        }

        if (this.previewMarker) {
            const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
            this.previewMarker.position.x = worldPos.x;
            this.previewMarker.position.z = worldPos.z;

            // Mudar cor baseado na validade
            const material = this.previewMarker.material;
            if (canPlaceResult.canPlace) {
                material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Verde
                material.emissiveColor = new BABYLON.Color3(0, 0.3, 0);
            } else {
                material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Vermelho
                material.emissiveColor = new BABYLON.Color3(0.3, 0, 0);
            }

            this.previewMarker.setEnabled(true);
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

        this.lastPreviewPosition = { x: -1, z: -1 };
    }

    confirmPlacement(gridX, gridZ) {
        if (!this.previewMode || !this.selectedBuildingType) return false;

        const buildingType = this.buildingTypes.get(this.selectedBuildingType);
        if (!buildingType) return false;

        // Verificar se pode construir usando o método correto
        const canPlaceResult = this.canPlaceBuilding(gridX, gridZ, this.selectedBuildingType);
        if (!canPlaceResult.canPlace) {
            console.warn(`⚠️ Não é possível construir: ${canPlaceResult.reason}`);
            return false;
        }

        // Construir edifício
        const building = this.placeBuilding(gridX, gridZ, this.selectedBuildingType);

        if (building) {
            console.log(`✅ Edifício ${buildingType.name} construído em (${gridX}, ${gridZ})`);
            return true;
        } else {
            console.error('❌ Falha ao construir edifício');
            return false;
        }
    }

    // ===== CLEANUP =====
    dispose() {
        console.log('🗑️ Iniciando disposal do BuildingSystem...');

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

        console.log('✅ BuildingSystem disposed - Memória limpa');
    }

    // ===== MÉTODOS AUXILIARES =====
    getAllBuildings() {
        return Array.from(this.buildings.values());
    }

    getBuildingsByType(type) {
        return this.getAllBuildings().filter(building => building.type === type);
    }

    getActiveBuildingsCount() {
        return this.getAllBuildings().filter(building => building.active).length;
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

                console.log(`🔗 Conectado: ${building.config.name} ↔ ${adjacentBuilding.config.name}`);
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

    getBuildingAt(gridX, gridZ) {
        for (const building of this.buildings.values()) {
            if (building.gridX === gridX && building.gridZ === gridZ) {
                return building;
            }
        }
        return null;
    }

    updateConnectionVisual(building1, building2) {
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

    getConnectedBuildings(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building || !building.connections) return [];

        return Array.from(building.connections)
            .map(id => this.buildings.get(id))
            .filter(b => b != null);
    }

    isConnectedToNetwork(buildingId, targetBuildingId) {
        // Busca em largura para verificar conectividade
        const visited = new Set();
        const queue = [buildingId];

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;

            visited.add(currentId);

            if (currentId === targetBuildingId) {
                return true;
            }

            const building = this.buildings.get(currentId);
            if (building && building.connections) {
                for (const connectedId of building.connections) {
                    if (!visited.has(connectedId)) {
                        queue.push(connectedId);
                    }
                }
            }
        }

        return false;
    }
}

// Exportar para escopo global
window.BuildingSystem = BuildingSystem;
console.log('🏗️ BuildingSystem carregado e exportado para window.BuildingSystem');
