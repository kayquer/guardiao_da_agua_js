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
        console.log('🏗️ Inicializando BuildingSystem...');

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

        // Expor métodos de debug globalmente
        window.resetConstructionState = () => this.forceResetConstructionState();
        window.getConstructionInfo = () => ({
            activeConstructions: this.constructionQueue.size,
            maxConstructions: this.maxSimultaneousConstructions,
            queueSize: this.constructionQueue.size,
            queue: Array.from(this.constructionQueue.keys())
        });

        console.log('✅ BuildingSystem inicializado');
        console.log('🧪 Debug: resetConstructionState() e getConstructionInfo() disponíveis globalmente');
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

        // ===== RESEARCH CENTERS AND UNIVERSITIES IMPLEMENTATION =====
        this.addBuildingType('research_center', {
            name: 'Centro de Pesquisa',
            description: 'Centro de pesquisa que reduz custos de construção em 10-15% e melhora eficiência de edifícios próximos',
            category: 'public',
            cost: 35000,
            size: 2,
            satisfactionBonus: 12,
            researchBonus: true,
            maintenanceCost: 500,
            powerConsumption: 80,
            waterConsumption: 25,
            // ===== EFFICIENCY BONUSES =====
            constructionCostReduction: 0.125, // 12.5% average (10-15% range)
            nearbyEfficiencyBonus: 0.125, // 12.5% average (10-15% range)
            effectRadius: 3, // Affects buildings within 3 grid cells
            icon: '🔬',
            color: '#9C27B0',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false,
                populationRequirement: 200
            }
        });

        this.addBuildingType('university', {
            name: 'Universidade',
            description: 'Universidade que reduz custos de construção em 15-25% e melhora significativamente a eficiência de edifícios próximos',
            category: 'public',
            cost: 60000,
            size: 3,
            satisfactionBonus: 25,
            educationBonus: true,
            researchBonus: true,
            maintenanceCost: 800,
            powerConsumption: 120,
            waterConsumption: 40,
            // ===== EFFICIENCY BONUSES =====
            constructionCostReduction: 0.20, // 20% average (15-25% range)
            nearbyEfficiencyBonus: 0.20, // 20% average (15-25% range)
            effectRadius: 5, // Affects buildings within 5 grid cells
            icon: '🎓',
            color: '#673AB7',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false,
                populationRequirement: 500
            }
        });

        // CATEGORIA: COMERCIAL (Revenue-Generating)
        this.addBuildingType('shopping_center', {
            name: 'Centro Comercial',
            description: 'Grande centro comercial que gera receita através de aluguéis',
            category: 'commercial',
            cost: 50000,
            size: 3,
            incomeGeneration: 2000, // R$ por minuto
            powerConsumption: 80,
            waterConsumption: 30,
            maintenanceCost: 800,
            populationRequirement: 200,
            icon: '🏬',
            color: '#4CAF50',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('office_building', {
            name: 'Edifício de Escritórios',
            description: 'Complexo de escritórios que gera receita através de aluguéis comerciais',
            category: 'commercial',
            cost: 35000,
            size: 2,
            incomeGeneration: 1500, // R$ por minuto
            powerConsumption: 60,
            waterConsumption: 20,
            maintenanceCost: 600,
            populationRequirement: 150,
            icon: '🏢',
            color: '#2196F3',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('bank', {
            name: 'Banco',
            description: 'Instituição financeira que gera receita através de serviços bancários',
            category: 'commercial',
            cost: 40000,
            size: 2,
            incomeGeneration: 1800, // R$ por minuto
            powerConsumption: 50,
            waterConsumption: 15,
            maintenanceCost: 700,
            populationRequirement: 100,
            icon: '🏦',
            color: '#FF9800',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('restaurant', {
            name: 'Restaurante',
            description: 'Estabelecimento gastronômico que atrai turistas e gera receita',
            category: 'commercial',
            cost: 20000,
            size: 1,
            incomeGeneration: 800, // R$ por minuto
            powerConsumption: 30,
            waterConsumption: 25,
            maintenanceCost: 300,
            populationRequirement: 50,
            icon: '🍽️',
            color: '#E91E63',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        // CATEGORIA: TURISMO (Revenue-Generating)
        this.addBuildingType('museum', {
            name: 'Museu',
            description: 'Museu que atrai turistas e gera receita através de ingressos',
            category: 'tourism',
            cost: 60000,
            size: 3,
            incomeGeneration: 1200, // R$ por minuto
            powerConsumption: 40,
            waterConsumption: 10,
            maintenanceCost: 500,
            satisfactionBonus: 25,
            attractivenessBonus: 30,
            icon: '🏛️',
            color: '#9C27B0',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('park', {
            name: 'Parque Turístico',
            description: 'Parque temático que atrai visitantes e gera receita',
            category: 'tourism',
            cost: 80000,
            size: 4,
            incomeGeneration: 2500, // R$ por minuto
            powerConsumption: 100,
            waterConsumption: 50,
            maintenanceCost: 1000,
            satisfactionBonus: 35,
            attractivenessBonus: 50,
            icon: '🎡',
            color: '#4CAF50',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('monument', {
            name: 'Monumento Histórico',
            description: 'Marco histórico que atrai turistas e aumenta o prestígio da cidade',
            category: 'tourism',
            cost: 45000,
            size: 2,
            incomeGeneration: 900, // R$ por minuto
            powerConsumption: 20,
            waterConsumption: 5,
            maintenanceCost: 200,
            satisfactionBonus: 20,
            attractivenessBonus: 40,
            icon: '🗿',
            color: '#795548',
            requirements: {
                terrain: ['grassland', 'lowland', 'hill'],
                nearWater: false
            }
        });

        this.addBuildingType('hotel', {
            name: 'Hotel',
            description: 'Hotel que hospeda turistas e gera receita através de hospedagem',
            category: 'tourism',
            cost: 55000,
            size: 3,
            incomeGeneration: 1800, // R$ por minuto
            powerConsumption: 80,
            waterConsumption: 60,
            maintenanceCost: 800,
            attractivenessBonus: 25,
            icon: '🏨',
            color: '#FF5722',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        // CATEGORIA: INDUSTRIAL (Revenue-Generating)
        this.addBuildingType('factory', {
            name: 'Fábrica de Exportação',
            description: 'Fábrica que produz bens para exportação e gera receita',
            category: 'industrial',
            cost: 70000,
            size: 4,
            incomeGeneration: 3000, // R$ por minuto
            powerConsumption: 150,
            waterConsumption: 40,
            pollutionGeneration: 30,
            maintenanceCost: 1200,
            populationRequirement: 300,
            icon: '🏭',
            color: '#607D8B',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('tech_center', {
            name: 'Centro Tecnológico',
            description: 'Centro de desenvolvimento tecnológico que gera receita através de inovação',
            category: 'industrial',
            cost: 90000,
            size: 3,
            incomeGeneration: 2800, // R$ por minuto
            powerConsumption: 120,
            waterConsumption: 20,
            pollutionGeneration: 5,
            maintenanceCost: 1000,
            populationRequirement: 250,
            satisfactionBonus: 15,
            icon: '🔬',
            color: '#3F51B5',
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: false
            }
        });

        this.addBuildingType('port', {
            name: 'Porto Comercial',
            description: 'Porto para exportação de mercadorias que gera alta receita',
            category: 'industrial',
            cost: 120000,
            size: 5,
            incomeGeneration: 4000, // R$ por minuto
            powerConsumption: 200,
            waterConsumption: 30,
            pollutionGeneration: 25,
            maintenanceCost: 1500,
            populationRequirement: 400,
            icon: '⚓',
            color: '#00BCD4',
            requirements: {
                terrain: ['water'],
                nearWater: true
            }
        });

        // ===== EDIFÍCIOS EDUCACIONAIS E DE PESQUISA =====

        // Centro de Pesquisas Hídricas
        this.addBuildingType('water_research_center', {
            name: 'Centro de Pesquisas Hídricas',
            icon: '🔬',
            category: 'public',
            cost: 100000,
            buildTime: 45,
            size: { width: 3, height: 3 },
            requirements: {
                terrain: ['grassland', 'lowland'],
                population: 1000,
                budget: 100000
            },
            effects: {
                research: 50,
                education: 30,
                satisfaction: 15,
                waterQuality: 20
            },
            description: 'Centro avançado para pesquisa e desenvolvimento de tecnologias hídricas',
            educationalContent: {
                concepts: ['centros de pesquisas', 'inovação tecnológica', 'gestão hídrica'],
                facts: [
                    'Centros de pesquisa aceleram o desenvolvimento de soluções inovadoras.',
                    'Pesquisa aplicada gera tecnologias específicas para cada região.',
                    'Colaboração científica multiplica os resultados de pesquisa.'
                ]
            }
        });

        // ===== INFRAESTRUTURA VERDE =====

        // Parque Linear
        this.addBuildingType('linear_park', {
            name: 'Parque Linear',
            icon: '🌳',
            category: 'public',
            cost: 25000,
            buildTime: 20,
            size: { width: 5, height: 2 },
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: true
            },
            effects: {
                satisfaction: 25,
                pollution: -15,
                waterQuality: 15,
                biodiversity: 30
            },
            description: 'Parque linear que protege rios urbanos e oferece lazer sustentável',
            educationalContent: {
                concepts: ['parque linear', 'proteção de rios', 'lazer sustentável'],
                facts: [
                    'Parques lineares protegem margens de rios da ocupação irregular.',
                    'Vegetação ripária filtra poluentes antes que cheguem aos rios.',
                    'Espaços verdes urbanos melhoram a qualidade de vida da população.'
                ]
            }
        });

        // Jardim de Chuva
        this.addBuildingType('rain_garden', {
            name: 'Jardim de Chuva',
            icon: '🌧️',
            category: 'water',
            cost: 8000,
            buildTime: 10,
            size: { width: 2, height: 2 },
            requirements: {
                terrain: ['grassland', 'lowland']
            },
            effects: {
                waterStorage: 50,
                pollution: -10,
                satisfaction: 10,
                floodControl: 20
            },
            description: 'Sistema natural de drenagem que reduz enchentes e filtra água',
            educationalContent: {
                concepts: ['jardim de chuva', 'drenagem sustentável', 'infiltração'],
                facts: [
                    'Jardins de chuva reduzem o escoamento superficial em até 30%.',
                    'Plantas nativas filtram naturalmente poluentes da água.',
                    'Sistemas de drenagem verde custam menos que obras convencionais.'
                ]
            }
        });

        // Teto Verde
        this.addBuildingType('green_roof', {
            name: 'Teto Verde',
            icon: '🏢',
            category: 'public',
            cost: 15000,
            buildTime: 15,
            size: { width: 2, height: 2 },
            requirements: {
                terrain: ['grassland', 'lowland']
            },
            effects: {
                waterStorage: 30,
                pollution: -8,
                satisfaction: 12,
                energyEfficiency: 15
            },
            description: 'Cobertura vegetal que reduz escoamento e melhora eficiência energética',
            educationalContent: {
                concepts: ['tetos verdes', 'eficiência energética', 'retenção de água'],
                facts: [
                    'Tetos verdes podem reter até 75% da água da chuva.',
                    'Reduzem a temperatura interna em até 5°C no verão.',
                    'Melhoram a qualidade do ar urbano através da fotossíntese.'
                ]
            }
        });

        // Parede Verde
        this.addBuildingType('green_wall', {
            name: 'Parede Verde',
            icon: '🌿',
            category: 'public',
            cost: 12000,
            buildTime: 12,
            size: { width: 1, height: 2 },
            requirements: {
                terrain: ['grassland', 'lowland']
            },
            effects: {
                pollution: -12,
                satisfaction: 15,
                airQuality: 20,
                temperature: -2
            },
            description: 'Sistema vertical de plantas que purifica o ar e reduz temperatura',
            educationalContent: {
                concepts: ['paredes verdes', 'purificação do ar', 'ilha de calor urbana'],
                facts: [
                    'Paredes verdes podem filtrar até 15kg de CO2 por ano por m².',
                    'Reduzem a temperatura ambiente em até 5°C.',
                    'Melhoram a acústica urbana absorvendo ruídos.'
                ]
            }
        });

        // Jardim Flutuante
        this.addBuildingType('floating_garden', {
            name: 'Jardim Flutuante',
            icon: '🪷',
            category: 'water',
            cost: 18000,
            buildTime: 18,
            size: { width: 3, height: 3 },
            requirements: {
                terrain: ['water'],
                waterBody: true
            },
            effects: {
                waterQuality: 25,
                pollution: -20,
                biodiversity: 35,
                satisfaction: 20
            },
            description: 'Sistema flutuante com plantas filtradoras que purificam a água',
            educationalContent: {
                concepts: ['jardins flutuantes', 'plantas filtradoras', 'fitorremediação'],
                facts: [
                    'Plantas aquáticas podem remover até 90% dos nutrientes em excesso.',
                    'Sistemas flutuantes não ocupam espaço terrestre valioso.',
                    'Fitorremediação é uma tecnologia natural e sustentável.'
                ]
            }
        });

        // ===== SISTEMAS DE MONITORAMENTO =====

        // Estação de Monitoramento
        this.addBuildingType('monitoring_station', {
            name: 'Estação de Monitoramento',
            icon: '📊',
            category: 'water',
            cost: 20000,
            buildTime: 15,
            size: { width: 1, height: 1 },
            requirements: {
                terrain: ['grassland', 'lowland'],
                nearWater: true
            },
            effects: {
                monitoring: 40,
                waterQuality: 10,
                earlyWarning: 30
            },
            description: 'Sistema automatizado de monitoramento da qualidade da água',
            educationalContent: {
                concepts: ['monitoramento ambiental', 'qualidade da água', 'sensores IoT'],
                facts: [
                    'Monitoramento contínuo permite detecção precoce de problemas.',
                    'Sensores IoT fornecem dados em tempo real sobre qualidade da água.',
                    'Sistemas de alerta precoce podem prevenir crises hídricas.'
                ]
            }
        });

        // Monitor de Qualidade da Água
        this.addBuildingType('water_quality_monitor', {
            name: 'Monitor de Qualidade',
            icon: '🔍',
            category: 'water',
            cost: 12000,
            buildTime: 10,
            size: { width: 1, height: 1 },
            requirements: {
                terrain: ['grassland', 'lowland', 'water']
            },
            effects: {
                monitoring: 25,
                waterQuality: 15,
                healthSafety: 20
            },
            description: 'Equipamento para análise contínua de parâmetros de qualidade da água',
            educationalContent: {
                concepts: ['qualidade da água', 'parâmetros físico-químicos', 'saúde pública'],
                facts: [
                    'pH, turbidez e oxigênio dissolvido são indicadores básicos de qualidade.',
                    'Coliformes fecais indicam contaminação por esgoto.',
                    'Monitoramento regular previne doenças de veiculação hídrica.'
                ]
            }
        });

        // Sistema de Controle de Erosão
        this.addBuildingType('erosion_control', {
            name: 'Controle de Erosão',
            icon: '🛡️',
            category: 'infrastructure',
            cost: 15000,
            buildTime: 20,
            size: { width: 2, height: 1 },
            requirements: {
                terrain: ['grassland', 'highland']
            },
            effects: {
                soilProtection: 30,
                waterQuality: 15,
                sedimentControl: 25
            },
            description: 'Terraços e barreiras para prevenir erosão e assoreamento',
            educationalContent: {
                concepts: ['erosão', 'assoreamento', 'sedimentação', 'conservação do solo'],
                facts: [
                    'Erosão causa perda de 25 bilhões de toneladas de solo por ano no mundo.',
                    'Sedimentação reduz a capacidade de reservatórios em 1% ao ano.',
                    'Terraços podem reduzir a erosão em até 95%.'
                ]
            }
        });

        console.log(`✅ ${this.buildingTypes.size} tipos de edifícios definidos`);
    }

    addBuildingType(id, config) {
        // ===== FEATURE FLAGS: Check if building should be visible in release version =====
        const isVisible = typeof FEATURE_FLAGS !== 'undefined' ? FEATURE_FLAGS.isBuildingVisible(id) : true;
        const isCategoryVisible = typeof FEATURE_FLAGS !== 'undefined' ? FEATURE_FLAGS.isCategoryVisible(config.category) : true;

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
            console.log(`🔬 Construction cost reduction: ${(totalReduction * 100).toFixed(1)}% (${baseCost} → ${finalCost})`);
        }

        return finalCost;
    }

    findNearbyResearchBuildings(gridX, gridZ) {
        const nearbyBuildings = [];

        for (const [buildingId, building] of this.buildings) {
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
            console.log(`🎓 Building efficiency bonus: +${(bonusEfficiency * 100).toFixed(1)}% for ${building.config.name}`);
        }

        return Math.min(finalEfficiency, 2.0); // Cap at 200% efficiency
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

            // Mostrar indicador visual de cooldown
            if (this.gameManager && this.gameManager.uiManager) {
                this.gameManager.uiManager.showBuildingCooldown(
                    this.buildingCooldown.remainingTime,
                    this.buildingCooldown.duration
                );
            }

            return null;
        }

        // Verificar se atingiu o limite de construções simultâneas
        if (this.constructionQueue.size >= this.maxSimultaneousConstructions) {
            // Verificar se há construções travadas antes de bloquear
            this.validateConstructionState();

            if (this.constructionQueue.size >= this.maxSimultaneousConstructions) {
                this.showNotification(`⚠️ Máximo de ${this.maxSimultaneousConstructions} construções simultâneas atingido`, 'warning');
                console.warn(`⚠️ Máximo de ${this.maxSimultaneousConstructions} construções simultâneas atingido - aguarde a conclusão de uma construção`);
                return null;
            }
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
        console.log(`✅ Mesh metadata updated with buildingId: ${buildingId}`);

        // ===== BUILDING CREATION LOG =====
        console.log(`🏗️ Building created: ${buildingId} (${buildingTypeId}) at (${gridX}, ${gridZ})`);
        console.log(`   📊 Total buildings: ${this.buildings.size + 1}`);

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
                    console.log(`💰 Custo deduzido: R$ ${actualCost.toLocaleString()} (economia de R$ ${savings.toLocaleString()} graças à pesquisa!)`);
                } else {
                    console.log(`💰 Custo deduzido: R$ ${actualCost.toLocaleString()}`);
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

        console.log(`🏗️ Edifício construído: ${buildingType.name} em (${gridX}, ${gridZ})`);
        return buildingData;
    }
    
    createBuildingMesh(gridX, gridZ, buildingType) {
        // ===== STANDARDIZED BUILDING GRAPHICS SYSTEM =====
        const standardizedMesh = this.createStandardizedBuildingMesh(buildingType);

        if (!standardizedMesh) {
            console.error(`❌ Failed to create mesh for building type: ${buildingType.id}`);
            return null;
        }

        // ===== STANDARDIZED POSITIONING SYSTEM =====
        this.applyStandardizedPositioning(standardizedMesh, gridX, gridZ, buildingType);

        // ✅ FIX: Garantir que a rotação inicial seja sempre (0, 0, 0) alinhada ao grid
        standardizedMesh.rotation = BABYLON.Vector3.Zero();
        console.log(`🎯 Rotação do mesh definida para (0, 0, 0) - alinhada ao grid`);

        // ===== STANDARDIZED MATERIAL APPLICATION ===
        // ✅ FIX: Apenas aplicar material se o mesh ainda não tiver um (meshes não-merged já têm material)
        if (!standardizedMesh.material) {
            this.applyStandardizedMaterial(standardizedMesh, buildingType);
            console.log(`🎨 Material aplicado para ${buildingType.name} (mesh não-merged)`);
        } else {
            console.log(`✅ Material preservado do merge para ${buildingType.name}`);
        }

        // ===== STANDARDIZED SHADOW SYSTEM =====
        this.applyStandardizedShadows(standardizedMesh);

        // ===== STANDARDIZED TERRAIN INTEGRATION =====
        this.adjustBuildingToTerrain(standardizedMesh, gridX, gridZ);

        // ===== STANDARDIZED SHADOW CREATION =====
        const terrainHeight = this.getTerrainHeightAt(gridX, gridZ);
        this.createStandardizedBuildingShadow(standardizedMesh, terrainHeight);

        // ===== STANDARDIZED METADATA =====
        this.applyStandardizedMetadata(standardizedMesh, buildingType, gridX, gridZ);

        // ===== STANDARDIZED LABELING =====
        const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
        this.createBuildingNameLabel(standardizedMesh, buildingType, worldPos);

        return standardizedMesh;
    }

    // ===== STANDARDIZED BUILDING GRAPHICS SYSTEM =====

    /**
     * Creates a standardized building mesh with consistent sizing and positioning
     * @param {Object} buildingType - The building type configuration
     * @returns {BABYLON.Mesh} - The standardized building mesh
     */
    createStandardizedBuildingMesh(buildingType) {
        // Get standardized dimensions
        const dimensions = this.getStandardizedBuildingDimensions(buildingType);

        // Create mesh based on category with standardized approach
        switch (buildingType.category) {
            case 'water':
                return this.createStandardizedWaterFacilityMesh(buildingType, dimensions);
            case 'treatment':
                return this.createStandardizedTreatmentPlantMesh(buildingType, dimensions);
            case 'storage':
                return this.createStandardizedStorageMesh(buildingType, dimensions);
            case 'residential':
                return this.createStandardizedHouseMesh(buildingType, dimensions);
            case 'power':
                return this.createStandardizedPowerPlantMesh(buildingType, dimensions);
            case 'infrastructure':
                return this.createStandardizedInfrastructureMesh(buildingType, dimensions);
            case 'public':
                return this.createStandardizedPublicBuildingMesh(buildingType, dimensions);
            default:
                return this.createStandardizedBasicMesh(buildingType, dimensions);
        }
    }

    /**
     * Calculates standardized building dimensions for consistent sizing
     * @param {Object} buildingType - The building type configuration
     * @returns {Object} - Standardized dimensions object
     */
    getStandardizedBuildingDimensions(buildingType) {
        // ===== CLEAN CODE REFACTORING: Use constants for building scale =====
        const BUILDING_CONSTANTS = window.GameConstants?.BUILDINGS || { SCALE_FACTOR: 0.85 };
        const BUILDING_SCALE_FACTOR = BUILDING_CONSTANTS.SCALE_FACTOR;

        const buildingSize = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const actualSize = buildingSize * cellSize * BUILDING_SCALE_FACTOR;

        return {
            size: buildingSize,
            cellSize: cellSize,
            scaleFactor: BUILDING_SCALE_FACTOR,
            actualSize: actualSize,
            width: actualSize,
            depth: actualSize,
            height: this.getStandardizedBuildingHeight(buildingType)
        };
    }

    /**
     * Calculates standardized building height based on type and size
     * @param {Object} buildingType - The building type configuration
     * @returns {number} - Standardized height
     */
    /**
     * ===== CLEAN CODE REFACTORING: Enhanced building height calculation =====
     * Calculates standardized building height based on type, size, and category
     *
     * @description Computes building height using base height, size multiplier, and category-specific
     *              modifiers from game constants. Ensures consistent visual hierarchy across building types.
     *
     * @method getStandardizedBuildingHeight
     * @memberof BuildingSystem
     * @since 1.0.0
     *
     * @param {Object} buildingType - The building type configuration object
     * @param {string} buildingType.category - Building category (water, power, residential, etc.)
     * @param {number} [buildingType.size=1] - Building size in grid cells
     *
     * @returns {number} Calculated building height in world units
     *
     * @example
     * const height = buildingSystem.getStandardizedBuildingHeight({
     *     category: 'power',
     *     size: 2
     * });
     * console.log(height); // Returns calculated height for 2x2 power building
     */
    getStandardizedBuildingHeight(buildingType) {
        // ===== CLEAN CODE REFACTORING: Use constants for height calculations =====
        const BUILDING_CONSTANTS = window.GameConstants?.BUILDINGS || {
            BASE_HEIGHT: 1.5,
            SIZE_HEIGHT_MULTIPLIER: 0.3,
            CATEGORY_HEIGHT_MODIFIERS: {
                'water': 0.5,
                'treatment': 1.0,
                'storage': 1.5,
                'residential': 0,
                'power': 1.5,
                'infrastructure': -1.2,
                'public': 2.0,
                'commercial': 1.0,
                'industrial': 1.2
            }
        };

        const baseHeight = BUILDING_CONSTANTS.BASE_HEIGHT;
        const sizeMultiplier = (buildingType.size || 1) * BUILDING_CONSTANTS.SIZE_HEIGHT_MULTIPLIER;
        const categoryModifier = BUILDING_CONSTANTS.CATEGORY_HEIGHT_MODIFIERS[buildingType.category] || 0;

        return baseHeight + categoryModifier + sizeMultiplier;
    }

    /**
     * Applies standardized positioning to building mesh
     * @param {BABYLON.Mesh} mesh - The building mesh
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridZ - Grid Z coordinate
     * @param {Object} buildingType - The building type configuration
     */
    applyStandardizedPositioning(mesh, gridX, gridZ, buildingType) {
        const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
        const buildingSize = buildingType.size || 1;

        // Base positioning
        mesh.position.x = worldPos.x;
        mesh.position.z = worldPos.z;
        mesh.position.y = 0; // Will be adjusted by terrain integration

        // ===== CLEAN CODE REFACTORING: Use constants for multi-cell positioning =====
        if (buildingSize > 1) {
            const BUILDING_CONSTANTS = window.GameConstants?.BUILDINGS || { MULTI_CELL_OFFSET_MULTIPLIER: 0.5 };
            const offset = (buildingSize - 1) * this.gridManager.cellSize * BUILDING_CONSTANTS.MULTI_CELL_OFFSET_MULTIPLIER;
            mesh.position.x += offset;
            mesh.position.z += offset;
        }
    }

    /**
     * Applies standardized material to building mesh
     * @param {BABYLON.Mesh} mesh - The building mesh
     * @param {Object} buildingType - The building type configuration
     */
    applyStandardizedMaterial(mesh, buildingType) {
        const material = this.createMinecraftBuildingMaterial(buildingType);
        mesh.material = material;

        // ===== FIX BUILDING VISIBILITY: Ensure mesh is visible =====
        mesh.isVisible = true;
        mesh.setEnabled(true);

        // Ensure material is properly applied
        if (material) {
            material.needDepthPrePass = false;
            material.backFaceCulling = false; // Better visibility for voxel style
        }
    }

    /**
     * Applies standardized shadow settings to building mesh
     * @param {BABYLON.Mesh} mesh - The building mesh
     */
    applyStandardizedShadows(mesh) {
        if (this.scene.shadowGenerator) {
            this.scene.shadowGenerator.addShadowCaster(mesh);
        }
        mesh.receiveShadows = true;
    }

    /**
     * Applies standardized metadata to building mesh
     * @param {BABYLON.Mesh} mesh - The building mesh
     * @param {Object} buildingType - The building type configuration
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridZ - Grid Z coordinate
     */
    applyStandardizedMetadata(mesh, buildingType, gridX, gridZ) {
        mesh.metadata = {
            building: true,
            buildingType: buildingType.id,
            gridX,
            gridZ,
            standardized: true // Mark as using standardized system
        };
    }

    // ===== STANDARDIZED MESH CREATION METHODS =====

    /**
     * Creates standardized basic building mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedBasicMesh(buildingType, dimensions) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`building_${buildingType.id}`, {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth
        }, this.scene);

        return mesh;
    }

    /**
     * Creates standardized water facility mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedWaterFacilityMesh(buildingType, dimensions) {
        // Base structure
        const base = BABYLON.MeshBuilder.CreateBox("waterBase", {
            width: dimensions.width,
            height: dimensions.height * 0.3,
            depth: dimensions.depth
        }, this.scene);

        // Tower structure
        const tower = BABYLON.MeshBuilder.CreateBox("waterTower", {
            width: dimensions.width * 0.6,
            height: dimensions.height * 0.7,
            depth: dimensions.depth * 0.6
        }, this.scene);
        tower.position.y = dimensions.height * 0.5;

        return this.mergeVisibleMeshes([base, tower], `waterFacility_${buildingType.id}`);
    }

    /**
     * Creates standardized power plant mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedPowerPlantMesh(buildingType, dimensions) {
        // ===== ENHANCED POWER BUILDING MESH CREATION =====
        // Handle specific power building types with proper grid alignment

        if (buildingType.id === 'solar_farm') {
            return this.createStandardizedSolarFarmMesh(buildingType, dimensions);
        } else if (buildingType.id === 'wind_farm') {
            return this.createStandardizedWindFarmMesh(buildingType, dimensions);
        } else if (buildingType.id === 'power_pole') {
            return this.createStandardizedPowerPoleMesh(buildingType, dimensions);
        } else if (buildingType.id === 'hydroelectric_plant') {
            return this.createStandardizedHydroelectricMesh(buildingType, dimensions);
        } else if (buildingType.id === 'nuclear_plant') {
            return this.createStandardizedNuclearPlantMesh(buildingType, dimensions);
        }

        // Default power plant (thermal, coal, etc.)
        const main = BABYLON.MeshBuilder.CreateBox("powerMain", {
            width: dimensions.width,
            height: dimensions.height * 0.8,
            depth: dimensions.depth
        }, this.scene);

        // Cooling towers
        const tower1 = BABYLON.MeshBuilder.CreateCylinder("powerTower1", {
            height: dimensions.height * 0.6,
            diameterTop: dimensions.width * 0.3,
            diameterBottom: dimensions.width * 0.3,
            tessellation: 8
        }, this.scene);
        tower1.position.y = dimensions.height * 0.7;
        tower1.position.x = dimensions.width * 0.25;

        const tower2 = tower1.clone("powerTower2");
        tower2.position.x = -dimensions.width * 0.25;

        return this.mergeVisibleMeshes([main, tower1, tower2], `powerPlant_${buildingType.id}`);
    }

    /**
     * Creates standardized solar farm mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedSolarFarmMesh(buildingType, dimensions) {
        // Base platform
        const base = BABYLON.MeshBuilder.CreateBox("solarBase", {
            width: dimensions.width,
            height: dimensions.height * 0.1,
            depth: dimensions.depth
        }, this.scene);

        // Solar panels - arranged in grid pattern
        const panelWidth = dimensions.width * 0.35;
        const panelDepth = dimensions.depth * 0.4;
        const panelHeight = dimensions.height * 0.05;

        const panel1 = BABYLON.MeshBuilder.CreateBox("solarPanel1", {
            width: panelWidth,
            height: panelHeight,
            depth: panelDepth
        }, this.scene);
        panel1.position.x = -dimensions.width * 0.25;
        panel1.position.y = dimensions.height * 0.4;
        panel1.position.z = -dimensions.depth * 0.2;
        panel1.rotation.z = Math.PI / 12; // Slight tilt

        const panel2 = panel1.clone("solarPanel2");
        panel2.position.x = dimensions.width * 0.25;

        const panel3 = panel1.clone("solarPanel3");
        panel3.position.x = -dimensions.width * 0.25;
        panel3.position.z = dimensions.depth * 0.2;

        const panel4 = panel1.clone("solarPanel4");
        panel4.position.x = dimensions.width * 0.25;
        panel4.position.z = dimensions.depth * 0.2;

        return this.mergeVisibleMeshes([base, panel1, panel2, panel3, panel4], `solarFarm_${buildingType.id}`);
    }

    /**
     * Creates standardized wind farm mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedWindFarmMesh(buildingType, dimensions) {
        // Base platform
        const base = BABYLON.MeshBuilder.CreateCylinder("windBase", {
            height: dimensions.height * 0.1,
            diameter: dimensions.width * 0.3
        }, this.scene);

        // Tower
        const tower = BABYLON.MeshBuilder.CreateCylinder("windTower", {
            height: dimensions.height * 0.7,
            diameterTop: dimensions.width * 0.08,
            diameterBottom: dimensions.width * 0.12,
            tessellation: 8
        }, this.scene);
        tower.position.y = dimensions.height * 0.4;

        // Nacelle
        const nacelle = BABYLON.MeshBuilder.CreateBox("windNacelle", {
            width: dimensions.width * 0.2,
            height: dimensions.height * 0.1,
            depth: dimensions.width * 0.1
        }, this.scene);
        nacelle.position.y = dimensions.height * 0.75;

        // Turbine blades
        const bladeLength = dimensions.width * 0.35;
        const blade1 = BABYLON.MeshBuilder.CreateBox("windBlade1", {
            width: dimensions.width * 0.02,
            height: bladeLength,
            depth: dimensions.width * 0.01
        }, this.scene);
        blade1.position.y = dimensions.height * 0.75;
        blade1.position.x = dimensions.width * 0.15;

        const blade2 = blade1.clone("windBlade2");
        blade2.rotation.z = 2 * Math.PI / 3;

        const blade3 = blade1.clone("windBlade3");
        blade3.rotation.z = 4 * Math.PI / 3;

        return this.mergeVisibleMeshes([base, tower, nacelle, blade1, blade2, blade3], `windFarm_${buildingType.id}`);
    }

    /**
     * Creates standardized power pole mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedPowerPoleMesh(buildingType, dimensions) {
        // Main pole
        const pole = BABYLON.MeshBuilder.CreateCylinder("powerPole", {
            height: dimensions.height,
            diameterTop: dimensions.width * 0.05,
            diameterBottom: dimensions.width * 0.08,
            tessellation: 6
        }, this.scene);

        // Cross arms
        const crossArm = BABYLON.MeshBuilder.CreateBox("powerCrossArm", {
            width: dimensions.width * 0.8,
            height: dimensions.height * 0.03,
            depth: dimensions.width * 0.03
        }, this.scene);
        crossArm.position.y = dimensions.height * 0.8;

        return this.mergeVisibleMeshes([pole, crossArm], `powerPole_${buildingType.id}`);
    }

    /**
     * Creates standardized hydroelectric plant mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedHydroelectricMesh(buildingType, dimensions) {
        // Main building
        const main = BABYLON.MeshBuilder.CreateBox("hydroMain", {
            width: dimensions.width,
            height: dimensions.height * 0.6,
            depth: dimensions.depth
        }, this.scene);

        // Dam structure
        const dam = BABYLON.MeshBuilder.CreateBox("hydroDam", {
            width: dimensions.width * 1.2,
            height: dimensions.height * 0.8,
            depth: dimensions.depth * 0.3
        }, this.scene);
        dam.position.z = -dimensions.depth * 0.4;

        // Turbine housing
        const turbine = BABYLON.MeshBuilder.CreateCylinder("hydroTurbine", {
            height: dimensions.height * 0.4,
            diameter: dimensions.width * 0.4,
            tessellation: 8
        }, this.scene);
        turbine.position.y = dimensions.height * 0.5;
        turbine.position.z = dimensions.depth * 0.2;

        return this.mergeVisibleMeshes([main, dam, turbine], `hydroelectric_${buildingType.id}`);
    }

    /**
     * Creates standardized nuclear plant mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedNuclearPlantMesh(buildingType, dimensions) {
        // Main reactor building
        const main = BABYLON.MeshBuilder.CreateBox("nuclearMain", {
            width: dimensions.width,
            height: dimensions.height * 0.7,
            depth: dimensions.depth
        }, this.scene);

        // Reactor dome
        const dome = BABYLON.MeshBuilder.CreateSphere("nuclearDome", {
            diameter: dimensions.width * 0.6,
            segments: 8
        }, this.scene);
        dome.position.y = dimensions.height * 0.6;
        dome.scaling.y = 0.6; // Flatten the dome

        // Cooling towers
        const tower1 = BABYLON.MeshBuilder.CreateCylinder("nuclearTower1", {
            height: dimensions.height * 0.9,
            diameterTop: dimensions.width * 0.25,
            diameterBottom: dimensions.width * 0.35,
            tessellation: 8
        }, this.scene);
        tower1.position.y = dimensions.height * 0.45;
        tower1.position.x = dimensions.width * 0.4;

        const tower2 = tower1.clone("nuclearTower2");
        tower2.position.x = -dimensions.width * 0.4;

        return this.mergeVisibleMeshes([main, dome, tower1, tower2], `nuclear_${buildingType.id}`);
    }

    /**
     * Creates standardized treatment plant mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedTreatmentPlantMesh(buildingType, dimensions) {
        // Main building
        const main = BABYLON.MeshBuilder.CreateBox("treatmentMain", {
            width: dimensions.width,
            height: dimensions.height * 0.7,
            depth: dimensions.depth
        }, this.scene);

        // Chimney
        const chimney = BABYLON.MeshBuilder.CreateBox("treatmentChimney", {
            width: dimensions.width * 0.2,
            height: dimensions.height * 0.5,
            depth: dimensions.depth * 0.2
        }, this.scene);
        chimney.position.y = dimensions.height * 0.85;
        chimney.position.x = dimensions.width * 0.3;

        return this.mergeVisibleMeshes([main, chimney], `treatmentPlant_${buildingType.id}`);
    }

    /**
     * Creates standardized storage mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedStorageMesh(buildingType, dimensions) {
        // Special handling for water tank with 3D model
        if (buildingType.id === 'water_tank') {
            return this.createWaterTankWithModel(buildingType, dimensions);
        }

        // Default storage mesh for other storage types
        const tank = BABYLON.MeshBuilder.CreateCylinder("storageTank", {
            height: dimensions.height,
            diameterTop: dimensions.width * 0.8,
            diameterBottom: dimensions.width * 0.8,
            tessellation: 12
        }, this.scene);

        tank.name = `storage_${buildingType.id}`;
        return tank;
    }

    /**
     * Creates water tank with 3D model support
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh (placeholder that gets replaced)
     */
    createWaterTankWithModel(buildingType, dimensions) {
        // Create placeholder mesh first (for immediate display)
        const placeholder = BABYLON.MeshBuilder.CreateCylinder("waterTankPlaceholder", {
            height: dimensions.height,
            diameterTop: dimensions.width * 0.8,
            diameterBottom: dimensions.width * 0.8,
            tessellation: 12
        }, this.scene);

        placeholder.name = `storage_${buildingType.id}_placeholder`;

        // Try to load 3D model asynchronously and replace placeholder
        this.loadWaterTank3DModel(placeholder, buildingType, dimensions);

        return placeholder;
    }

    /**
     * Loads 3D water tank model and replaces placeholder
     * @param {BABYLON.Mesh} placeholder - The placeholder mesh to replace
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     */
    async loadWaterTank3DModel(placeholder, buildingType, dimensions) {
        try {
            const waterTankAsset = AssetLoader.getAsset('water_tank_3d');
            if (waterTankAsset && waterTankAsset.loadInScene) {
                console.log('🎯 Carregando modelo 3D do reservatório de água...');

                const modelData = await waterTankAsset.loadInScene(this.scene);
                if (modelData && modelData.meshes && modelData.meshes.length > 0) {
                    const rootMesh = modelData.rootMesh;

                    // Copy position and properties from placeholder
                    rootMesh.position = placeholder.position.clone();
                    rootMesh.rotation = placeholder.rotation.clone();

                    // Scale the model to fit the grid cell
                    const targetSize = dimensions.width * 0.9;
                    const boundingInfo = rootMesh.getBoundingInfo();
                    const modelSize = boundingInfo.boundingBox.extendSize;
                    const maxDimension = Math.max(modelSize.x, modelSize.z) * 2;

                    if (maxDimension > 0) {
                        const scale = targetSize / maxDimension;
                        rootMesh.scaling = new BABYLON.Vector3(scale, scale, scale);
                    }

                    // Ensure the model is positioned on the ground
                    const groundY = boundingInfo.boundingBox.minimum.y * rootMesh.scaling.y;
                    rootMesh.position.y = placeholder.position.y - groundY;

                    // Copy metadata and properties
                    rootMesh.name = `storage_${buildingType.id}`;
                    rootMesh.metadata = placeholder.metadata;

                    // Replace placeholder in building system
                    this.replaceBuildingMesh(placeholder, rootMesh);

                    // Dispose placeholder
                    placeholder.dispose();

                    console.log('✅ Modelo 3D do reservatório carregado e substituído com sucesso');
                    return;
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar modelo 3D do reservatório:', error);
        }

        console.log('🔄 Mantendo reservatório procedural');
    }

    /**
     * Replaces a building mesh in the system
     * @param {BABYLON.Mesh} oldMesh - The old mesh to replace
     * @param {BABYLON.Mesh} newMesh - The new mesh to use
     */
    replaceBuildingMesh(oldMesh, newMesh) {
        // Update any references to the old mesh
        if (this.buildings) {
            for (const [buildingId, buildingData] of this.buildings.entries()) {
                if (buildingData.mesh === oldMesh) {
                    buildingData.mesh = newMesh;
                    console.log(`🔄 Mesh substituído para edifício ${buildingId}`);
                    break;
                }
            }
        }
    }

    /**
     * Creates standardized house mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedHouseMesh(buildingType, dimensions) {
        // Base house
        const base = BABYLON.MeshBuilder.CreateBox("houseBase", {
            width: dimensions.width,
            height: dimensions.height * 0.8,
            depth: dimensions.depth
        }, this.scene);

        // Roof
        const roof = BABYLON.MeshBuilder.CreateBox("houseRoof", {
            width: dimensions.width * 1.1,
            height: dimensions.height * 0.4,
            depth: dimensions.depth * 1.1
        }, this.scene);
        roof.position.y = dimensions.height * 0.6;
        roof.scaling.y = 0.5;

        return this.mergeVisibleMeshes([base, roof], `house_${buildingType.id}`);
    }

    /**
     * Creates standardized infrastructure mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedInfrastructureMesh(buildingType, dimensions) {
        if (buildingType.id === 'road') {
            return BABYLON.MeshBuilder.CreateBox("road", {
                width: dimensions.width,
                height: dimensions.height * 0.1,
                depth: dimensions.depth
            }, this.scene);
        } else if (buildingType.id === 'pipe') {
            const pipe = BABYLON.MeshBuilder.CreateCylinder("pipe", {
                height: dimensions.width,
                diameterTop: dimensions.width * 0.2,
                diameterBottom: dimensions.width * 0.2,
                tessellation: 8
            }, this.scene);
            pipe.rotation.z = Math.PI / 2;
            return pipe;
        }

        return this.createStandardizedBasicMesh(buildingType, dimensions);
    }

    /**
     * Creates standardized public building mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
createStandardizedPublicBuildingMesh(buildingType, dimensions) {
    if (buildingType.id === 'city_hall') {
        // City Hall with distinctive architecture
        const base = BABYLON.MeshBuilder.CreateBox("cityHallBase", {
            width: dimensions.width,
            height: dimensions.height * 0.8,
            depth: dimensions.depth
        }, this.scene);

        const tower = BABYLON.MeshBuilder.CreateBox("cityHallTower", {
            width: dimensions.width * 0.4,
            height: dimensions.height * 0.6,
            depth: dimensions.depth * 0.4
        }, this.scene);
        tower.position.y = dimensions.height * 0.7;

        return this.mergeVisibleMeshes([base, tower], `cityHall_${buildingType.id}`);
    }

    return this.createStandardizedBasicMesh(buildingType, dimensions);
}

    /**
     * Creates standardized building shadow with proper alignment
     * @param {BABYLON.Mesh} buildingMesh - The building mesh
     * @param {number} terrainHeight - The terrain height
     */
    createStandardizedBuildingShadow(buildingMesh, terrainHeight) {
        const boundingBox = buildingMesh.getBoundingInfo().boundingBox;

        // Calculate shadow size based on actual building footprint
        const buildingWidth = Math.abs(boundingBox.maximum.x - boundingBox.minimum.x);
        const buildingDepth = Math.abs(boundingBox.maximum.z - boundingBox.minimum.z);

        // ===== CLEAN CODE REFACTORING: Use constants for shadow sizing =====
        const BUILDING_CONSTANTS = window.GameConstants?.BUILDINGS || { SHADOW_SIZE_MULTIPLIER: 1.05 };
        const shadowWidth = buildingWidth * BUILDING_CONSTANTS.SHADOW_SIZE_MULTIPLIER;
        const shadowDepth = buildingDepth * BUILDING_CONSTANTS.SHADOW_SIZE_MULTIPLIER;

        const shadow = BABYLON.MeshBuilder.CreateGround(`shadow_${buildingMesh.name}`, {
            width: shadowWidth,
            height: shadowDepth
        }, this.scene);

        // ===== CLEAN CODE REFACTORING: Use constants for shadow positioning and material =====
        const SHADOW_HEIGHT_OFFSET = BUILDING_CONSTANTS.SHADOW_HEIGHT_OFFSET || 0.005;
        const SHADOW_ALPHA = BUILDING_CONSTANTS.SHADOW_ALPHA || 0.3;

        // Position shadow exactly under building center
        shadow.position.x = buildingMesh.position.x;
        shadow.position.z = buildingMesh.position.z;
        shadow.position.y = terrainHeight + SHADOW_HEIGHT_OFFSET;

        // Standardized shadow material
        const shadowMaterial = new BABYLON.StandardMaterial(`shadowMat_${buildingMesh.name}`, this.scene);
        shadowMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        shadowMaterial.alpha = SHADOW_ALPHA;
        shadowMaterial.backFaceCulling = false;
        shadow.material = shadowMaterial;

        // Associate shadow with building
        buildingMesh.shadowMesh = shadow;
        this.shadowMeshes.set(buildingMesh.name, shadow);

        return shadow;
    }

    createBasicVoxelMesh(buildingType) {
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Mesh básico com dimensões corrigidas =====
        const size = buildingType.size || 1;
        const height = this.getBuildingHeight(buildingType);

        // ===== FIX: Garantir que edifícios se ajustem perfeitamente às células do grid =====
        const cellSize = this.gridManager.cellSize;
        const buildingWidth = size * cellSize * 0.85; // Reduzido de 0.9 para 0.85 para melhor ajuste
        const buildingDepth = size * cellSize * 0.85;

        const mesh = BABYLON.MeshBuilder.CreateBox(`building_${buildingType.id}`, {
            width: buildingWidth,
            height: height,
            depth: buildingDepth
        }, this.scene);

        // ===== FIX: Ajustar posição para centralizar no grid =====
        // Para edifícios multi-célula, ajustar o centro
        if (size > 1) {
            const offset = (size - 1) * cellSize * 0.5;
            mesh.position.x += offset;
            mesh.position.z += offset;
        }

        return mesh;
    }

    getBuildingHeight(buildingType) {
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Alturas corrigidas e consistentes =====
        const size = buildingType.size || 1;

        // Alturas baseadas no tipo de edifício com escala consistente
        const baseHeights = {
            // Infraestrutura de água
            'water_pump': 1.8,
            'treatment_plant': 2.2,
            'water_tank': 3.5,
            'water_tower': 4.5,

            // Residencial - altura proporcional ao tamanho
            'house': 2.2,
            'apartment': 3.8,

            // Energia
            'power_plant': 3.2,
            'solar_panel': 0.3,
            'wind_farm': 4.0,

            // Infraestrutura
            'road': 0.1,
            'pipe': 0.2,

            // Público - altura proporcional ao tamanho e importância
            'city_hall': 4.2,
            'school': 3.0,
            'hospital': 3.5, // ===== FIX: Hospital altura corrigida =====
            'fire_station': 2.8,
            'police_station': 2.6,

            // Industrial
            'factory': 3.0,
            'warehouse': 2.5,
            'port': 2.8,

            // Zonas
            'zone_residential_light': 0.5,
            'zone_residential_dense': 0.5,
            'zone_commercial': 0.5,
            'zone_industrial': 0.5
        };

        const baseHeight = baseHeights[buildingType.id] || 2.0;

        // ===== FIX: Ajustar altura baseada no tamanho para edifícios multi-célula =====
        if (size > 1) {
            // Edifícios maiores são ligeiramente mais altos, mas não linearmente
            return baseHeight * (1 + (size - 1) * 0.15);
        }

        return baseHeight;
    }

    createWaterFacilityMesh(buildingType) {
        // ===== BUILDING SIZE AND GRID ALIGNMENT FIX: Respect building's actual size =====
        const buildingSize = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with other methods
        const actualSize = buildingSize * cellSize * buildingScale;

        // Base da bomba
        const base = BABYLON.MeshBuilder.CreateBox("waterBase", {
            width: actualSize,
            height: 0.5,
            depth: actualSize
        }, this.scene);

        // Torre da bomba - scale with building size
        const tower = BABYLON.MeshBuilder.CreateBox("waterTower", {
            width: actualSize * 0.6,
            height: 1.0,
            depth: actualSize * 0.6
        }, this.scene);
        tower.position.y = 0.75;

        // Combinar meshes
        const merged = this.mergeVisibleMeshes([base, tower], `waterFacility_${buildingType.id}`);

        // ===== FIX: Adjust position for multi-cell buildings =====
        if (buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            merged.position.x += offset;
            merged.position.z += offset;
        }

        return merged;
    }

    createTreatmentPlantMesh(buildingType) {
        // ===== BUILDING SIZE AND GRID ALIGNMENT FIX: Respect building's actual size =====
        const buildingSize = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with other methods
        const actualSize = buildingSize * cellSize * buildingScale;

        // Edifício principal
        const main = BABYLON.MeshBuilder.CreateBox("treatmentMain", {
            width: actualSize,
            height: 1.5,
            depth: actualSize
        }, this.scene);

        // Chaminé - scale with building size
        const chimney = BABYLON.MeshBuilder.CreateBox("treatmentChimney", {
            width: actualSize * 0.3,
            height: 1.0,
            depth: actualSize * 0.3
        }, this.scene);
        chimney.position.y = 2.0;
        chimney.position.x = actualSize * 0.3;

        const merged = this.mergeVisibleMeshes([main, chimney], `treatmentPlant_${buildingType.id}`);

        // ===== FIX: Adjust position for multi-cell buildings =====
        if (buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            merged.position.x += offset;
            merged.position.z += offset;
        }

        return merged;
    }

    createStorageMesh(buildingType) {
        // ===== BUILDING SIZE AND GRID ALIGNMENT FIX: Respect building's actual size =====
        const buildingSize = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with other methods
        const actualSize = buildingSize * cellSize * buildingScale;

        // Tanque cilíndrico estilo voxel (usando cilindro com poucos lados)
        const tank = BABYLON.MeshBuilder.CreateCylinder("storageTank", {
            height: 2.5,
            diameterTop: actualSize * 0.8,
            diameterBottom: actualSize * 0.8,
            tessellation: 8 // Poucos lados para estilo voxel
        }, this.scene);

        tank.name = `storage_${buildingType.id}`;

        // ===== FIX: Adjust position for multi-cell buildings =====
        if (buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            tank.position.x += offset;
            tank.position.z += offset;
        }

        return tank;
    }

    createHouseMesh(buildingType) {
        // ===== BUILDING SIZE AND GRID ALIGNMENT FIX: Respect building's actual size =====
        const buildingSize = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with other methods
        const actualSize = buildingSize * cellSize * buildingScale;

        // Base da casa
        const base = BABYLON.MeshBuilder.CreateBox("houseBase", {
            width: actualSize,
            height: 1.5,
            depth: actualSize
        }, this.scene);

        // Telhado (pirâmide) - scale with building size
        const roof = BABYLON.MeshBuilder.CreateBox("houseRoof", {
            width: actualSize * 1.1,
            height: 0.8,
            depth: actualSize * 1.1
        }, this.scene);
        roof.position.y = 1.9;
        roof.scaling.y = 0.5; // Achatar para parecer telhado

        const merged = this.mergeVisibleMeshes([base, roof], `house_${buildingType.id}`);

        // ===== FIX: Adjust position for multi-cell buildings =====
        if (buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            merged.position.x += offset;
            merged.position.z += offset;
        }

        return merged;
    }

    createPowerPlantMesh(buildingType) {
        // ===== BUILDING SIZE AND GRID ALIGNMENT FIX: Respect building's actual size =====
        const buildingSize = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with other methods
        const actualSize = buildingSize * cellSize * buildingScale;

        // Edifício principal
        const main = BABYLON.MeshBuilder.CreateBox("powerMain", {
            width: actualSize,
            height: 2.0,
            depth: actualSize
        }, this.scene);

        // Torres de resfriamento (cilindros) - scale with building size
        const tower1 = BABYLON.MeshBuilder.CreateCylinder("powerTower1", {
            height: 1.5,
            diameterTop: actualSize * 0.4,
            diameterBottom: actualSize * 0.4,
            tessellation: 6
        }, this.scene);
        tower1.position.y = 2.75;
        tower1.position.x = actualSize * 0.3;

        const tower2 = tower1.clone("powerTower2");
        tower2.position.x = -actualSize * 0.3;

        const merged = this.mergeVisibleMeshes([main, tower1, tower2], `powerPlant_${buildingType.id}`);

        // ===== FIX: Adjust position for multi-cell buildings =====
        if (buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            merged.position.x += offset;
            merged.position.z += offset;
        }

        return merged;
    }

    createInfrastructureMesh(buildingType) {
        // ===== BUILDING SIZE AND GRID ALIGNMENT FIX: Respect building's actual size =====
        const buildingSize = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with other methods
        const actualSize = buildingSize * cellSize * buildingScale;

        let mesh;

        if (buildingType.id === 'road') {
            // Estrada baixa
            mesh = BABYLON.MeshBuilder.CreateBox("road", {
                width: actualSize,
                height: 0.1,
                depth: actualSize
            }, this.scene);
        } else if (buildingType.id === 'pipe') {
            // Cano
            mesh = BABYLON.MeshBuilder.CreateCylinder("pipe", {
                height: actualSize,
                diameterTop: actualSize * 0.2,
                diameterBottom: actualSize * 0.2,
                tessellation: 8
            }, this.scene);
            mesh.rotation.z = Math.PI / 2; // Horizontal
        } else {
            // Infraestrutura genérica
            return this.createBasicVoxelMesh(buildingType);
        }

        // ===== FIX: Adjust position for multi-cell buildings =====
        if (buildingSize > 1 && mesh) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            mesh.position.x += offset;
            mesh.position.z += offset;
        }

        return mesh;
    }

    createPublicBuildingMesh(buildingType) {
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Edifícios públicos com dimensões corrigidas =====
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85;
        const buildingSize = buildingType.size || 1;
        const actualSize = buildingSize * cellSize * buildingScale;

        if (buildingType.id === 'city_hall') {
            // ===== FIX: Prefeitura Municipal com dimensões corrigidas para size=2 =====
            const base = BABYLON.MeshBuilder.CreateBox("cityHallBase", {
                width: actualSize,
                height: 3.0,
                depth: actualSize
            }, this.scene);

            // Colunas frontais proporcionais ao tamanho real
            const columnDiameter = actualSize * 0.15;
            const column1 = BABYLON.MeshBuilder.CreateCylinder("cityHallColumn1", {
                height: 3.5,
                diameter: columnDiameter,
                tessellation: 8
            }, this.scene);
            column1.position.x = actualSize * 0.3;
            column1.position.z = actualSize * 0.4;
            column1.position.y = 1.75;

            const column2 = column1.clone("cityHallColumn2");
            column2.position.x = -actualSize * 0.3;

            const column3 = column1.clone("cityHallColumn3");
            column3.position.x = 0;

            // Telhado triangular proporcional
            const roof = BABYLON.MeshBuilder.CreateCylinder("cityHallRoof", {
                height: 1.2,
                diameterTop: 0,
                diameterBottom: actualSize * 1.1,
                tessellation: 4
            }, this.scene);
            roof.position.y = 4.0;
            roof.rotation.y = Math.PI / 4;

            const merged = this.mergeVisibleMeshes([base, column1, column2, column3, roof], `cityHall_${buildingType.id}`);

            // ===== FIX: Ajustar posição para edifícios multi-célula =====
            if (buildingSize > 1) {
                const offset = (buildingSize - 1) * cellSize * 0.5;
                merged.position.x += offset;
                merged.position.z += offset;
            }

            return merged;
        }

        // Outros edifícios públicos genéricos
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
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Sombra alinhada com footprint =====
        const boundingBox = buildingMesh.getBoundingInfo().boundingBox;

        // ===== FIX: Calcular tamanho da sombra baseado no footprint real do edifício =====
        const buildingWidth = Math.abs(boundingBox.maximum.x - boundingBox.minimum.x);
        const buildingDepth = Math.abs(boundingBox.maximum.z - boundingBox.minimum.z);

        // Sombra ligeiramente maior que o edifício para efeito realista
        const shadowWidth = buildingWidth * 1.1;
        const shadowDepth = buildingDepth * 1.1;

        const shadow = BABYLON.MeshBuilder.CreateGround(`shadow_${buildingMesh.name}`, {
            width: shadowWidth,
            height: shadowDepth
        }, this.scene);

        // ===== FIX: Posicionar sombra exatamente sob o centro do edifício =====
        shadow.position.x = buildingMesh.position.x;
        shadow.position.z = buildingMesh.position.z;
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
        // ===== STANDARDIZED 3D MODEL POSITIONING AND SCALING =====
        // Use consistent scaling based on grid cell size
        const buildingSize = size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with reference model (water reservoir)
        const actualSize = buildingSize * cellSize * buildingScale;

        let mesh;

        if (type === 'water_pump') {
            // ===== WATER PUMP - STANDARDIZED SCALING =====
            // Bomba de água - cilindro com base proporcional ao grid
            const base = BABYLON.MeshBuilder.CreateBox("pump_base", {
                width: actualSize * 0.8,
                height: 0.4,
                depth: actualSize * 0.8
            }, this.scene);

            const cylinder = BABYLON.MeshBuilder.CreateCylinder("pump_cylinder", {
                height: 1.8,
                diameter: actualSize * 0.5
            }, this.scene);
            cylinder.position.y = 1.1;

            mesh = this.mergeVisibleMeshes([base, cylinder], `pump_${type}`);

        } else if (type === 'water_well') {
            // ===== WATER WELL - STANDARDIZED SCALING =====
            // Poço - cilindro baixo com anel proporcional
            const well = BABYLON.MeshBuilder.CreateCylinder("well", {
                height: 0.6,
                diameter: actualSize * 0.6
            }, this.scene);

            const ring = BABYLON.MeshBuilder.CreateTorus("well_ring", {
                diameter: actualSize * 0.7,
                thickness: actualSize * 0.05
            }, this.scene);
            ring.position.y = 0.35;

            mesh = this.mergeVisibleMeshes([well, ring], `well_${type}`);

        } else if (type === 'desalination_plant') {
            // ===== DESALINATION PLANT - STANDARDIZED SCALING =====
            // Usina - complexo industrial proporcional ao tamanho
            const main = BABYLON.MeshBuilder.CreateBox("desal_main", {
                width: actualSize,
                height: 2.5,
                depth: actualSize
            }, this.scene);

            const tower = BABYLON.MeshBuilder.CreateCylinder("desal_tower", {
                height: 3.5,
                diameter: actualSize * 0.3
            }, this.scene);
            tower.position.x = actualSize * 0.3;
            tower.position.y = 2.0;

            mesh = this.mergeVisibleMeshes([main, tower], `desal_${type}`);
        }

        // ===== STANDARDIZED POSITIONING: Multi-cell building support =====
        if (mesh && buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            mesh.position.x += offset;
            mesh.position.z += offset;
        }

        return mesh;
    }

    createTreatmentFacilityMesh(type, size) {
        // ===== STANDARDIZED 3D MODEL POSITIONING AND SCALING =====
        // Use consistent scaling based on water reservoir reference model
        const buildingSize = size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with reference model
        const actualSize = buildingSize * cellSize * buildingScale;

        // ===== TREATMENT FACILITY - STANDARDIZED SCALING =====
        // Estação de tratamento - edifício industrial com tanques proporcionais
        const main = BABYLON.MeshBuilder.CreateBox("treatment_main", {
            width: actualSize,
            height: 1.8,
            depth: actualSize
        }, this.scene);

        const tankDiameter = actualSize * 0.3;
        const tankOffset = actualSize * 0.25;

        const tank1 = BABYLON.MeshBuilder.CreateCylinder("treatment_tank1", {
            height: 1.2,
            diameter: tankDiameter
        }, this.scene);
        tank1.position.x = -tankOffset;
        tank1.position.y = 1.5;

        const tank2 = BABYLON.MeshBuilder.CreateCylinder("treatment_tank2", {
            height: 1.2,
            diameter: tankDiameter
        }, this.scene);
        tank2.position.x = tankOffset;
        tank2.position.y = 1.5;

        const merged = this.mergeVisibleMeshes([main, tank1, tank2], `treatment_${type}`);

        // ===== STANDARDIZED POSITIONING: Multi-cell building support =====
        if (buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            merged.position.x += offset;
            merged.position.z += offset;
        }

        return merged;
    }

    createStorageFacilityMesh(type, size) {
        // ===== STANDARDIZED 3D MODEL POSITIONING AND SCALING =====
        // Use water reservoir as reference model for consistent scaling
        const buildingSize = size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with other building methods
        const actualSize = buildingSize * cellSize * buildingScale;

        if (type === 'water_tank') {
            // ===== WATER RESERVOIR - PROCEDURAL CYLINDER =====
            return this.createWaterTankFallback(buildingSize, cellSize, actualSize);
        } else if (type === 'water_tower') {
            // ===== WATER TOWER - STANDARDIZED SCALING =====
            // Caixa d'água - cilindro elevado com dimensões proporcionais
            const base = BABYLON.MeshBuilder.CreateCylinder("tower_base", {
                height: 3.0, // Proportional to actualSize
                diameter: actualSize * 0.15 // Thin support column
            }, this.scene);

            const tank = BABYLON.MeshBuilder.CreateCylinder("tower_tank", {
                height: 1.2,
                diameter: actualSize * 0.6 // Proportional to building size
            }, this.scene);
            tank.position.y = 2.4; // Position on top of base

            const merged = this.mergeVisibleMeshes([base, tank], `tower_${type}`);

            // ===== STANDARDIZED POSITIONING: Multi-cell building support =====
            if (buildingSize > 1) {
                const offset = (buildingSize - 1) * cellSize * 0.5;
                merged.position.x += offset;
                merged.position.z += offset;
            }

            return merged;
        }

        return null;
    }



    createWaterTankFallback(buildingSize, cellSize, actualSize) {
        // Original procedural water tank
        const tank = BABYLON.MeshBuilder.CreateCylinder("storage_tank", {
            height: 2.5, // Proportional height for visibility
            diameter: actualSize * 0.9 // Slightly smaller than cell for visual clarity
        }, this.scene);

        // Position for multi-cell buildings
        if (buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            tank.position.x += offset;
            tank.position.z += offset;
        }

        return tank;
    }

    createResidentialMesh(type, size) {
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Residencial com dimensões corrigidas =====
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistente com createBasicVoxelMesh

        if (type === 'house') {
            // ===== FIX: Casa com dimensões proporcionais ao grid =====
            const houseSize = cellSize * buildingScale;

            const base = BABYLON.MeshBuilder.CreateBox("house_base", {
                width: houseSize,
                height: 1.8,
                depth: houseSize
            }, this.scene);

            const roof = BABYLON.MeshBuilder.CreateCylinder("house_roof", {
                height: 0.6,
                diameterTop: 0,
                diameterBottom: houseSize * 1.2,
                tessellation: 4
            }, this.scene);
            roof.position.y = 1.5;
            roof.rotation.y = Math.PI / 4;

            return this.mergeVisibleMeshes([base, roof], `house_${type}`);

        } else if (type === 'apartment') {
            // ===== FIX: Prédio com dimensões baseadas no tamanho real (size=2) =====
            const apartmentSize = size * cellSize * buildingScale;

            const apartment = BABYLON.MeshBuilder.CreateBox("apartment", {
                width: apartmentSize,
                height: 3.8,
                depth: apartmentSize
            }, this.scene);

            // ===== FIX: Ajustar posição para edifícios multi-célula =====
            if (size > 1) {
                const offset = (size - 1) * cellSize * 0.5;
                apartment.position.x += offset;
                apartment.position.z += offset;
            }

            return apartment;
        }

        return null;
    }

    createInfrastructureMesh(typeOrBuildingType, size) {
        // Determinar se o primeiro parâmetro é um objeto buildingType ou uma string type
        let type, actualSize;
        if (typeof typeOrBuildingType === 'object' && typeOrBuildingType.id) {
            // Chamado com buildingType object
            type = typeOrBuildingType.id;
            actualSize = typeOrBuildingType.size || 1;
        } else {
            // Chamado com type string e size
            type = typeOrBuildingType;
            actualSize = size || 1;
        }

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

            return this.mergeVisibleMeshes([base, tree], `plaza_${typeOrBuildingType}`);

        }

        // Infraestrutura genérica - usar fallback
        if (typeof typeOrBuildingType === 'object') {
            return this.createBasicVoxelMesh(typeOrBuildingType);
        } else {
            // Criar um objeto buildingType básico para o fallback
            const basicBuildingType = {
                id: type,
                size: actualSize,
                category: 'infrastructure'
            };
            return this.createBasicVoxelMesh(basicBuildingType);
        }
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

                mesh = this.mergeVisibleMeshes([main, turbine1, turbine2], `hydro_${type}`);

            } else if (type === 'power_pole') {
                // Poste de energia - torre alta e fina
                const pole = BABYLON.MeshBuilder.CreateCylinder("power_pole", {
                    height: 3, diameter: 0.2
                }, this.scene);

                const crossbar = BABYLON.MeshBuilder.CreateBox("power_crossbar", {
                    width: 1.5, height: 0.1, depth: 0.1
                }, this.scene);
                crossbar.position.y = 2.5;

                mesh = this.mergeVisibleMeshes([pole, crossbar], `pole_${type}`);

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

                mesh = this.mergeVisibleMeshes([main, chimney1, chimney2], `thermal_${type}`);

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

                mesh = this.mergeVisibleMeshes([base, dome, tower], `nuclear_${type}`);

            } else if (type === 'coal_plant') {
                // Usina a carvão - similar à termelétrica mas mais simples
                const main = BABYLON.MeshBuilder.CreateBox("coal_main", {
                    width: 2.5, height: 1.8, depth: 2
                }, this.scene);

                const chimney = BABYLON.MeshBuilder.CreateCylinder("coal_chimney", {
                    height: 3.5, diameter: 0.8
                }, this.scene);
                chimney.position.y = 2.5;

                mesh = this.mergeVisibleMeshes([main, chimney], `coal_${type}`);

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

                mesh = this.mergeVisibleMeshes([base, panel1, panel2], `solar_${type}`);

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

                mesh = this.mergeVisibleMeshes([base, tower, nacelle, blade1, blade2, blade3], `wind_${type}`);
            }

            return mesh;

        } catch (error) {
            console.error(`❌ Erro ao criar mesh de energia para ${type}:`, error);
            return null;
        }
    }

    createBasicMesh(buildingType) {
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Mesh básico com dimensões consistentes =====
        const size = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85;
        const height = this.getBuildingHeight(buildingType);

        // Usar dimensões consistentes com outros métodos
        const buildingSize = size * cellSize * buildingScale;

        const mesh = BABYLON.MeshBuilder.CreateBox(`building_${buildingType.id}`, {
            width: buildingSize,
            height: height,
            depth: buildingSize
        }, this.scene);

        // ===== FIX: Ajustar posição para edifícios multi-célula =====
        if (size > 1) {
            const offset = (size - 1) * cellSize * 0.5;
            mesh.position.x += offset;
            mesh.position.z += offset;
        }

        return mesh;
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
        console.log(`🗑️ Edifício removido: ${buildingName}`);
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

    // ===== SISTEMA DE RECICLAGEM =====
    recycleBuilding(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building) {
            console.warn(`⚠️ Edifício não encontrado para reciclagem: ${buildingId}`);
            return false;
        }

        // Calcular recursos recuperados (70% do custo original)
        const recoveredAmount = Math.floor(building.config.cost * 0.7);

        // Mostrar animação de reciclagem
        this.showRecyclingAnimation(building);

        // Remover o edifício
        const removed = this.removeBuilding(buildingId);

        if (removed) {
            // Adicionar recursos recuperados ao orçamento
            if (window.gameManager && window.gameManager.resourceManager) {
                window.gameManager.resourceManager.addBudget(recoveredAmount);

                // Mostrar notificação de reciclagem
                if (window.gameManager.uiManager) {
                    window.gameManager.uiManager.showNotification(
                        `♻️ ${building.config.name} reciclado! Recursos recuperados: R$ ${recoveredAmount}`,
                        'success'
                    );
                }
            }

            console.log(`♻️ Edifício ${building.config.name} reciclado. Recursos recuperados: R$ ${recoveredAmount}`);
            return { success: true, recoveredAmount };
        }

        return { success: false, recoveredAmount: 0 };
    }

    showRecyclingAnimation(building) {
        if (!building.mesh) return;

        try {
            // Criar efeito de partículas de reciclagem
            const particleSystem = new BABYLON.ParticleSystem("recycling", 50, this.scene);

            // Textura das partículas (usar uma textura simples)
            particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.scene);

            // Posição do emissor
            particleSystem.emitter = building.mesh;
            particleSystem.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
            particleSystem.maxEmitBox = new BABYLON.Vector3(1, 0, 1);

            // Cores das partículas (verde para reciclagem)
            particleSystem.color1 = new BABYLON.Color4(0, 1, 0, 1.0);
            particleSystem.color2 = new BABYLON.Color4(0.5, 1, 0.5, 1.0);
            particleSystem.colorDead = new BABYLON.Color4(0, 0.5, 0, 0.0);

            // Tamanho das partículas
            particleSystem.minSize = 0.1;
            particleSystem.maxSize = 0.3;

            // Tempo de vida
            particleSystem.minLifeTime = 0.5;
            particleSystem.maxLifeTime = 1.5;

            // Taxa de emissão
            particleSystem.emitRate = 100;

            // Direção das partículas
            particleSystem.direction1 = new BABYLON.Vector3(-1, 2, -1);
            particleSystem.direction2 = new BABYLON.Vector3(1, 4, 1);

            // Velocidade
            particleSystem.minEmitPower = 2;
            particleSystem.maxEmitPower = 4;

            // Gravidade
            particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);

            // Iniciar sistema de partículas
            particleSystem.start();

            // Parar após 2 segundos e limpar
            setTimeout(() => {
                particleSystem.stop();
                setTimeout(() => {
                    particleSystem.dispose();
                }, 2000);
            }, 2000);

        } catch (error) {
            console.warn('⚠️ Erro ao criar animação de reciclagem:', error);
        }
    }

    getRecyclingValue(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building) return 0;

        return Math.floor(building.config.cost * 0.7);
    }

    // ===== EFEITOS NOS RECURSOS =====
    applyBuildingEffects(building, add = true) {
        const config = building.config;
        const multiplier = add ? 1 : -1;
        
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
                        console.log(`💰 Receita adicionada: +R$ ${incomeAmount}/min de ${config.name}`);
                    } else {
                        resourceManager.removeIncome(incomeAmount);
                        console.log(`💰 Receita removida: -R$ ${incomeAmount}/min de ${config.name}`);
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
                        console.log(`🏙️ Receita de aluguel adicionada: +R$ ${rentalIncome}/min de ${config.name}`);
                    } else {
                        resourceManager.removeIncome(rentalIncome);
                        console.log(`🏙️ Receita de aluguel removida: -R$ ${rentalIncome}/min de ${config.name}`);
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
        console.log(`✅ Bônus de satisfação adicionado: +${amount}%`);
    }

    removeSatisfactionBonus(amount) {
        // Implementar quando ResourceManager suportar bônus de satisfação
        console.log(`➖ Bônus de satisfação removido: -${amount}%`);
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
    
    getBuildingsByCategory(category) {
        return Array.from(this.buildings.values()).filter(
            building => building.config.category === category
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

        console.log(`🚧 Iniciando construção de ${buildingData.config.name} (${buildingData.constructionDuration / 1000}s) [${this.constructionQueue.size}/${this.maxSimultaneousConstructions}]`);
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

        // ===== AUDIO FEEDBACK PARA CONCLUSÃO =====
        this.playConstructionCompletionAudio(buildingData);

        // Mostrar indicador de conclusão
        this.showCompletionIndicator(buildingData);

        // Log do progresso das construções restantes
        if (this.constructionQueue.size > 0) {
            console.log(`📊 Construções restantes: ${this.constructionQueue.size}/${this.maxSimultaneousConstructions}`);
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
        console.log('🔄 Forçando reset do estado de construção...');
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

        console.log(`⏱️ Cooldown de construção ativado: ${this.buildingCooldown.duration}ms`);

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
            console.log(`✅ Cooldown de construção finalizado`);

            // Esconder indicador visual de cooldown
            if (this.gameManager && this.gameManager.uiManager) {
                this.gameManager.uiManager.hideBuildingCooldown();
            }
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

    // ===== FUNÇÃO REUTILIZÁVEL PARA CRIAR PLAQUINHAS DE TEXTO CARTOON =====
createCartoonTextPlate(id, position, initialText = "", options = {}) {
    // Presets de cores
    const colorPresets = {
        green: {
            bgColor: "rgba(0, 100, 20, 0.95)",
            highlightColor: "rgba(100, 255, 100, 0.3)",
            outlineColor: "rgba(0, 40, 0, 1)",
            textColor: "white",
            emissiveColor: new BABYLON.Color3(0.5, 1, 0.5)
        },
        red: {
            bgColor: "rgba(180, 20, 20, 0.95)",
            highlightColor: "rgba(255, 100, 100, 0.3)",
            outlineColor: "rgba(80, 0, 0, 1)",
            textColor: "#FF4444",
            emissiveColor: new BABYLON.Color3(1, 0.2, 0.2)
        },
        blue: {
            bgColor: "rgba(20, 100, 200, 0.95)",
            highlightColor: "rgba(100, 150, 255, 0.3)",
            outlineColor: "rgba(0, 40, 100, 1)",
            textColor: "#00CCFF",
            emissiveColor: new BABYLON.Color3(0.2, 0.6, 1)
        },
        yellow: {
            bgColor: "rgba(200, 180, 0, 0.95)",
            highlightColor: "rgba(255, 255, 100, 0.3)",
            outlineColor: "rgba(100, 80, 0, 1)",
            textColor: "yellow",
            emissiveColor: new BABYLON.Color3(1, 1, 0.2)
        },
        orange: {
            bgColor: "rgba(200, 100, 0, 0.95)",
            highlightColor: "rgba(255, 150, 50, 0.3)",
            outlineColor: "rgba(100, 40, 0, 1)",
            textColor: "#FFA500",
            emissiveColor: new BABYLON.Color3(1, 0.6, 0)
        },
        purple: {
            bgColor: "rgba(120, 20, 180, 0.95)",
            highlightColor: "rgba(200, 100, 255, 0.3)",
            outlineColor: "rgba(60, 0, 100, 1)",
            textColor: "#CC00FF",
            emissiveColor: new BABYLON.Color3(0.8, 0.2, 1)
        }
    };

    // Aplicar preset se fornecido
    let colors = {};
    if (options.preset && colorPresets[options.preset]) {
        colors = { ...colorPresets[options.preset] };
    }

    // Opções padrão (podem sobrescrever o preset)
    const config = {
        width: 1.5,
        height: 0.5,
        textureWidth: 320,
        textureHeight: 80,
        fontSize: 44,
        bgColor: colors.bgColor || "rgba(0, 100, 20, 0.95)",
        highlightColor: colors.highlightColor || "rgba(100, 255, 100, 0.3)",
        outlineColor: colors.outlineColor || "rgba(0, 40, 0, 1)",
        textColor: colors.textColor || "white",
        textOutlineColor: "rgba(0, 0, 0, 0.8)",
        emissiveColor: colors.emissiveColor || new BABYLON.Color3(0.5, 1, 0.5),
        borderRadius: 25,
        outlineWidth: 6,
        textOutlineWidth: 5,
        billboard: true,
        renderingGroupId: 2,
        alphaIndex: 999,
        ...options
    };

    // Criar plano para o texto
    const textPlane = BABYLON.MeshBuilder.CreatePlane(`cartoonText_${id}`, {
        width: config.width,
        height: config.height
    }, this.scene);

    textPlane.position = position.clone();
    
    if (config.billboard) {
        textPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    }

    // Configurar rendering
    textPlane.renderingGroupId = config.renderingGroupId;
    textPlane.alphaIndex = config.alphaIndex;

    // Criar textura dinâmica
    const texture = new BABYLON.DynamicTexture(`cartoonTexture_${id}`,
        { width: config.textureWidth, height: config.textureHeight }, this.scene, false);

    texture.hasAlpha = true;

    // Material
    const material = new BABYLON.StandardMaterial(`cartoonMat_${id}`, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.emissiveColor = config.emissiveColor;
    material.backFaceCulling = false;
    material.opacityTexture = texture;
    material.disableDepthWrite = true;
    material.needDepthPrePass = false;
    material.separateCullingPass = false;

    textPlane.material = material;

    // ===== FUNÇÃO DE DESENHO CARTOON =====
    const drawCartoonText = (text) => {
        const ctx = texture.getContext();
        const centerX = config.textureWidth / 2;
        const centerY = config.textureHeight / 2;
        const boxWidth = config.textureWidth - 40;
        const boxHeight = config.textureHeight - 20;
        const radius = config.borderRadius;
        
        ctx.clearRect(0, 0, config.textureWidth, config.textureHeight);
        
        // Sombra
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        
        // Desenhar retângulo arredondado - fundo
        ctx.fillStyle = config.bgColor;
        ctx.beginPath();
        ctx.moveTo(centerX - boxWidth/2 + radius, centerY - boxHeight/2);
        ctx.lineTo(centerX + boxWidth/2 - radius, centerY - boxHeight/2);
        ctx.quadraticCurveTo(centerX + boxWidth/2, centerY - boxHeight/2, centerX + boxWidth/2, centerY - boxHeight/2 + radius);
        ctx.lineTo(centerX + boxWidth/2, centerY + boxHeight/2 - radius);
        ctx.quadraticCurveTo(centerX + boxWidth/2, centerY + boxHeight/2, centerX + boxWidth/2 - radius, centerY + boxHeight/2);
        ctx.lineTo(centerX - boxWidth/2 + radius, centerY + boxHeight/2);
        ctx.quadraticCurveTo(centerX - boxWidth/2, centerY + boxHeight/2, centerX - boxWidth/2, centerY + boxHeight/2 - radius);
        ctx.lineTo(centerX - boxWidth/2, centerY - boxHeight/2 + radius);
        ctx.quadraticCurveTo(centerX - boxWidth/2, centerY - boxHeight/2, centerX - boxWidth/2 + radius, centerY - boxHeight/2);
        ctx.closePath();
        ctx.fill();
        
        // Resetar sombra
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Contorno cartoon
        ctx.strokeStyle = config.outlineColor;
        ctx.lineWidth = config.outlineWidth;
        ctx.stroke();
        
        // Highlight no topo (efeito 3D cartoon)
        ctx.fillStyle = config.highlightColor;
        ctx.beginPath();
        ctx.moveTo(centerX - boxWidth/2 + radius, centerY - boxHeight/2);
        ctx.lineTo(centerX + boxWidth/2 - radius, centerY - boxHeight/2);
        ctx.quadraticCurveTo(centerX + boxWidth/2, centerY - boxHeight/2, centerX + boxWidth/2, centerY - boxHeight/2 + radius);
        ctx.lineTo(centerX + boxWidth/2, centerY - boxHeight/2 + 15);
        ctx.lineTo(centerX - boxWidth/2, centerY - boxHeight/2 + 15);
        ctx.lineTo(centerX - boxWidth/2, centerY - boxHeight/2 + radius);
        ctx.quadraticCurveTo(centerX - boxWidth/2, centerY - boxHeight/2, centerX - boxWidth/2 + radius, centerY - boxHeight/2);
        ctx.closePath();
        ctx.fill();
        
        // Texto com contorno cartoon
        ctx.font = `bold ${config.fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Contorno preto grosso do texto
        ctx.strokeStyle = config.textOutlineColor;
        ctx.lineWidth = config.textOutlineWidth;
        ctx.strokeText(text, centerX, centerY);
        
        // Texto principal
        ctx.fillStyle = config.textColor;
        ctx.fillText(text, centerX, centerY);
        
        // Brilho no texto (efeito cartoon)
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillText(text, centerX - 1, centerY - 2);
        
        texture.update();
    };

    // Desenhar texto inicial
    if (initialText) {
        drawCartoonText(initialText);
    }

    // Retornar objeto com referências
    return {
        mesh: textPlane,
        texture: texture,
        material: material,
        updateText: drawCartoonText,
        dispose: () => {
            textPlane.dispose();
            texture.dispose();
            material.dispose();
        }
    };
}
// ===== INDICADORES VISUAIS DE CONSTRUÇÃO (USANDO A FUNÇÃO REUTILIZÁVEL) =====
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
    progressBar.position.y = 3;

    // Material da barra de progresso
    const progressMaterial = new BABYLON.StandardMaterial(`progressMat_${buildingData.id}`, this.scene);
    progressMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
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

    // ===== USAR A FUNÇÃO REUTILIZÁVEL PARA CRIAR PLAQUINHA =====
    const textPosition = new BABYLON.Vector3(worldPos.x, 3.8, worldPos.z);
    const textPlate = this.createCartoonTextPlate(
        `progress_${buildingData.id}`,
        textPosition,
        "0%",
        {
            bgColor: "rgba(0, 100, 20, 0.95)", // Verde escuro
            fontSize: 44
        }
    );

    // Armazenar referências
    buildingData.constructionIndicators = {
        progressBar: progressBar,
        progressBg: progressBg,
        textPlate: textPlate
    };
}

updateConstructionIndicator(buildingData, progress) {
    if (!buildingData.constructionIndicators) return;

    const { progressBar, textPlate } = buildingData.constructionIndicators;

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

    // Atualizar texto de porcentagem
    const percentage = Math.floor(progress * 100);
    if (textPlate && textPlate.updateText) {
        try {
            textPlate.updateText(`${percentage}%`);
        } catch (error) {
            console.warn('⚠️ Erro ao atualizar texto de progresso:', error);
        }
    }
}

  removeConstructionVisuals(buildingData) {
    // ===== FIX BUILDING VISIBILITY: Restore building to normal state =====

    // Remover indicadores de progresso
    if (buildingData.constructionIndicators) {
        const { progressBar, progressBg, textPlate } = buildingData.constructionIndicators;

        // Remover barras de progresso
        if (progressBar && !progressBar.isDisposed()) progressBar.dispose();
        if (progressBg && !progressBg.isDisposed()) progressBg.dispose();
        
        // ===== USAR O MÉTODO DISPOSE DA PLAQUINHA =====
        if (textPlate) {
            textPlate.dispose(); // Já faz cleanup completo de mesh, texture e material
        }

        delete buildingData.constructionIndicators;
    }

    // ===== CRITICAL FIX: Restore building mesh to normal state =====
    if (buildingData.mesh && !buildingData.mesh.isDisposed()) {
        // ✅ FIX: Parar a animação de construção ANTES de restaurar visuais
        if (buildingData.constructionAnimationData) {
            buildingData.constructionAnimationData.isAnimating = false;
        }

        // Restore original scaling immediately
        buildingData.mesh.scaling = buildingData.originalScaling || new BABYLON.Vector3(1, 1, 1);

        // ✅ FIX: FORÇAR rotação para (0, 0, 0) para alinhamento perfeito com grid
        buildingData.mesh.rotation = BABYLON.Vector3.Zero();
        console.log(`🎯 Rotação FORÇADA para (0, 0, 0) - alinhamento perfeito ao grid`);

        // ✅ FIX: Restaurar material original SEM sobrescrever com novo material
        if (buildingData.originalMaterial) {
            buildingData.mesh.material = buildingData.originalMaterial;
            console.log(`♻️ Material original restaurado para ${buildingData.config.name}`);
        }
        // Se não houver material salvo, o mesh já deve ter o material do merge

        // Ensure mesh is visible
        buildingData.mesh.isVisible = true;
        buildingData.mesh.setEnabled(true);

        console.log(`🔧 Building mesh restored to normal state: ${buildingData.config.name}`);
    }

    // Remover efeitos visuais aprimorados
    this.removeConstructionEffects(buildingData);
}

   applyConstructionVisuals(buildingData) {
        if (buildingData.mesh) {
            // ✅ FIX: Garantir que a rotação esteja zerada antes de salvar
            buildingData.mesh.rotation = BABYLON.Vector3.Zero();
            
            // Aplicar efeito de construção aprimorado
            buildingData.mesh.scaling = new BABYLON.Vector3(0.3, 0.3, 0.3);
            buildingData.originalRotation = BABYLON.Vector3.Zero(); // Sempre (0, 0, 0) para grid
            buildingData.originalScaling = new BABYLON.Vector3(1, 1, 1);

            // ✅ FIX: Salvar material original ANTES de aplicar efeitos de construção
            if (!buildingData.originalMaterial && buildingData.mesh.material) {
                buildingData.originalMaterial = buildingData.mesh.material;
                console.log(`💾 Material original salvo para ${buildingData.config.name}`);
            }

            // Aplicar material de construção semi-transparente
            this.applyConstructionMaterial(buildingData);

            // Criar efeitos de partículas de construção
            this.createConstructionParticles(buildingData);

            // Adicionar animação de rotação suave durante construção
            this.startConstructionAnimation(buildingData);

            console.log(`🎨 Efeitos visuais de construção aplicados para ${buildingData.config.name}`);
        }
    }

    showCompletionIndicator(buildingData) {
        const worldPos = this.gridManager.gridToWorld(buildingData.gridX, buildingData.gridZ);

        // ===== EFEITOS DE CONCLUSÃO APRIMORADOS =====
        this.createCompletionCelebration(buildingData, worldPos);
        this.createCompletionText(buildingData, worldPos);
        this.createCompletionParticles(buildingData, worldPos);

        // Restaurar escala do edifício com animação suave
        if (buildingData.mesh) {
            this.animateBuildingCompletion(buildingData);
        }

        // Mostrar notificação aprimorada
        this.showNotification(`🎉 ${buildingData.config.name} concluído com sucesso!`, 'success');
    }

    createCompletionCelebration(buildingData, worldPos) {
        try {
            // Criar anel de energia que se expande
            const celebrationRing = BABYLON.MeshBuilder.CreateTorus(`celebration_${buildingData.id}`, {
                diameter: 0.5,
                thickness: 0.1
            }, this.scene);

            celebrationRing.position = worldPos.clone();
            celebrationRing.position.y += 1;

            // Material brilhante
            const ringMaterial = new BABYLON.StandardMaterial(`celebrationMat_${buildingData.id}`, this.scene);
            ringMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0.5);
            ringMaterial.disableLighting = true;
            celebrationRing.material = ringMaterial;

            // Animação de expansão e fade
            const startTime = Date.now();
            const duration = 1500;

            const animateRing = () => {
                if (celebrationRing.isDisposed()) return;

                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;

                if (progress >= 1) {
                    celebrationRing.dispose();
                    ringMaterial.dispose();
                    return;
                }

                // Expansão
                const scale = 1 + progress * 3;
                celebrationRing.scaling = new BABYLON.Vector3(scale, scale, scale);

                // Fade out
                ringMaterial.alpha = 1 - progress;

                // Rotação
                celebrationRing.rotation.y += 0.1;

                requestAnimationFrame(animateRing);
            };

            animateRing();

        } catch (error) {
            console.warn('⚠️ Erro ao criar celebração de conclusão:', error);
        }
    }
createCompletionText(buildingData, worldPos) {
    try {
        // ===== USAR A FUNÇÃO REUTILIZÁVEL PARA CRIAR PLAQUINHA DE CONCLUSÃO =====
        const completionPosition = new BABYLON.Vector3(worldPos.x, 4, worldPos.z);
        const completionPlate = this.createCartoonTextPlate(
            `completion_${buildingData.id}`,
            completionPosition,
            "✅ CONCLUÍDO!",
            {
                width: 3,
                height: 1,
                textureWidth: 512,
                textureHeight: 128,
                fontSize: 48,
                bgColor: "rgba(0, 180, 80, 0.95)", // Verde vibrante
                highlightColor: "rgba(100, 255, 150, 0.4)",
                outlineColor: "rgba(0, 80, 40, 1)",
                textColor: "#00FF88", // Verde neon
                borderRadius: 30,
                outlineWidth: 8,
                textOutlineWidth: 6,
                renderingGroupId: 2,
                alphaIndex: 1001
            }
        );

        const completionText = completionPlate.mesh;
        const textMaterial = completionPlate.material;

        // Adicionar emissão extra para efeito de brilho
        textMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0.5);

        // Animação de entrada e saída
        completionText.scaling = new BABYLON.Vector3(0, 0, 0);

        const startTime = Date.now();
        const animateText = () => {
            if (completionText.isDisposed()) return;

            const elapsed = Date.now() - startTime;

            if (elapsed < 300) {
                // Animação de entrada (0-300ms)
                const progress = elapsed / 300;
                const scale = this.easeOutBounce(progress);
                completionText.scaling = new BABYLON.Vector3(scale, scale, scale);
            } else if (elapsed < 2000) {
                // Manter visível (300-2000ms)
                completionText.scaling = new BABYLON.Vector3(1, 1, 1);
                completionText.position.y = 4 + Math.sin(elapsed * 0.005) * 0.2; // Flutuação suave
                
                // Pulsar o brilho
                const pulse = Math.sin(elapsed * 0.008) * 0.3 + 0.7;
                textMaterial.emissiveColor = new BABYLON.Color3(0, pulse, pulse * 0.5);
            } else if (elapsed < 2500) {
                // Animação de saída (2000-2500ms)
                const progress = (elapsed - 2000) / 500;
                const scale = 1 - progress;
                completionText.scaling = new BABYLON.Vector3(scale, scale, scale);
                textMaterial.alpha = 1 - progress;
            } else {
                // Limpar usando o método dispose da plaquinha
                completionPlate.dispose();
                return;
            }

            requestAnimationFrame(animateText);
        };

        animateText();

    } catch (error) {
        console.warn('⚠️ Erro ao criar texto de conclusão:', error);
    }
}

    easeOutBounce(t) {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }

    createCompletionParticles(buildingData, worldPos) {
        try {
            const particleCount = 12;
            const particles = [];

            for (let i = 0; i < particleCount; i++) {
                const particle = BABYLON.MeshBuilder.CreateSphere(`completionParticle_${buildingData.id}_${i}`, {
                    diameter: 0.15
                }, this.scene);

                // Posição inicial no centro
                particle.position = worldPos.clone();
                particle.position.y += 2;

                // Material brilhante colorido
                const particleMaterial = new BABYLON.StandardMaterial(`completionParticleMat_${buildingData.id}_${i}`, this.scene);
                const hue = (i / particleCount) * 360;
                const color = this.hslToRgb(hue, 0.8, 0.6);
                particleMaterial.emissiveColor = new BABYLON.Color3(color.r, color.g, color.b);
                particleMaterial.disableLighting = true;
                particle.material = particleMaterial;

                particles.push({ mesh: particle, material: particleMaterial });

                // Animação de explosão
                const angle = (i / particleCount) * Math.PI * 2;
                const velocity = {
                    x: Math.cos(angle) * (2 + Math.random()),
                    y: 3 + Math.random() * 2,
                    z: Math.sin(angle) * (2 + Math.random())
                };

                this.animateCompletionParticle(particle, particleMaterial, velocity, worldPos);
            }

        } catch (error) {
            console.warn('⚠️ Erro ao criar partículas de conclusão:', error);
        }
    }

    animateCompletionParticle(particle, material, velocity, startPos) {
        const startTime = Date.now();
        const duration = 2000;
        const gravity = -0.01;

        const animateParticle = () => {
            if (particle.isDisposed()) return;

            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                material.dispose();
                particle.dispose();
                return;
            }

            // Física simples
            const time = elapsed / 1000;
            particle.position.x = startPos.x + velocity.x * time;
            particle.position.z = startPos.z + velocity.z * time;
            particle.position.y = startPos.y + velocity.y * time + 0.5 * gravity * time * time;

            // Fade out
            material.alpha = 1 - progress;

            // Rotação
            particle.rotation.x += 0.1;
            particle.rotation.y += 0.1;

            requestAnimationFrame(animateParticle);
        };

        animateParticle();
    }

    animateBuildingCompletion(buildingData) {
        try {
            const mesh = buildingData.mesh;
            const targetScale = buildingData.originalScaling || new BABYLON.Vector3(1, 1, 1);

            // Animação de "pop" de conclusão
            const startTime = Date.now();
            const duration = 800;

            const animateCompletion = () => {
                if (mesh.isDisposed()) return;

                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;

                if (progress >= 1) {
                    mesh.scaling = targetScale;
                    mesh.rotation = buildingData.originalRotation || BABYLON.Vector3.Zero();
                    return;
                }

                // Efeito de "bounce" na escala
                const bounceScale = this.easeOutBounce(progress);
                const scale = BABYLON.Vector3.Lerp(
                    new BABYLON.Vector3(0.3, 0.3, 0.3),
                    targetScale,
                    bounceScale
                );

                mesh.scaling = scale;

                // Parar rotação gradualmente
                const rotationFactor = 1 - progress;
                mesh.rotation.y = (buildingData.originalRotation?.y || 0) + (rotationFactor * 0.1);

                requestAnimationFrame(animateCompletion);
            };

            animateCompletion();

        } catch (error) {
            console.warn('⚠️ Erro ao animar conclusão do edifício:', error);
        }
    }

    hslToRgb(h, s, l) {
        h /= 360;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h / (1/12)) % 1;
            return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        return { r: f(0), g: f(8), b: f(4) };
    }

    // ===== LABELS DE NOME DOS EDIFÍCIOS =====
    createBuildingNameLabel(buildingMesh, buildingType, worldPos) {
        try {
            // Criar plano para o texto
            const labelPlane = BABYLON.MeshBuilder.CreatePlane(`label_${buildingMesh.name}`, {
                width: 3,
                height: 0.8
            }, this.scene);

            // Posicionar acima do edifício
            labelPlane.position.x = worldPos.x;
            labelPlane.position.z = worldPos.z;
            labelPlane.position.y = this.getBuildingHeight(buildingType) + 1.5;
            labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

            // ===== Z-INDEX FIX: Configurar rendering group para aparecer acima de outros elementos =====
            labelPlane.renderingGroupId = 2; // Grupo de renderização alto para aparecer por cima
            labelPlane.alphaIndex = 1000; // Índice alto para garantir ordem de renderização

            // Desabilitar depth testing para garantir que sempre apareça por cima
            labelPlane.material = null; // Temporário para configurar depois

            // Criar textura dinâmica com texto
            const dynamicTexture = new BABYLON.DynamicTexture(`labelTexture_${buildingMesh.name}`,
                { width: 512, height: 128 }, this.scene);

            // Configurar fonte e texto
            const font = "bold 48px Arial";
            const text = buildingType.name || buildingType.id;

            // Limpar textura e desenhar texto
            dynamicTexture.drawText(text, null, null, font, "#FFFFFF", "#000000AA", true);

            // Criar material para o label com configurações otimizadas para z-index
            const labelMaterial = new BABYLON.StandardMaterial(`labelMat_${buildingMesh.name}`, this.scene);
            labelMaterial.diffuseTexture = dynamicTexture;
            labelMaterial.emissiveTexture = dynamicTexture;
            labelMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            labelMaterial.backFaceCulling = false;
            labelMaterial.hasAlpha = true;

            // ===== Z-INDEX FIX: Configurações de material para renderização por cima =====
            labelMaterial.disableDepthWrite = true; // Não escrever no depth buffer
            labelMaterial.needDepthPrePass = false; // Não precisa de depth pre-pass
            labelMaterial.separateCullingPass = false; // Renderizar em uma única passada

            labelPlane.material = labelMaterial;

            // Inicialmente oculto - só aparece no hover ou seleção
            labelPlane.visibility = 0;
            labelPlane.isVisible = false;

            // Armazenar referência no mesh do edifício
            buildingMesh.nameLabel = labelPlane;

            // Adicionar propriedades para animação
            labelPlane.targetVisibility = 0;
            labelPlane.fadeSpeed = 5; // Velocidade da transição (5 = 200ms)

            console.log(`✅ Label criado para ${buildingType.name}: "${text}" (inicialmente oculto) - Z-index configurado`);

        } catch (error) {
            console.error(`❌ Erro ao criar label para ${buildingType.name}:`, error);
        }
    }

    removeBuildingNameLabel(buildingMesh) {
        if (buildingMesh.nameLabel) {
            try {
                if (!buildingMesh.nameLabel.isDisposed()) {
                    // Limpar material e textura
                    if (buildingMesh.nameLabel.material) {
                        if (buildingMesh.nameLabel.material.diffuseTexture) {
                            buildingMesh.nameLabel.material.diffuseTexture.dispose();
                        }
                        if (buildingMesh.nameLabel.material.emissiveTexture) {
                            buildingMesh.nameLabel.material.emissiveTexture.dispose();
                        }
                        buildingMesh.nameLabel.material.dispose();
                    }
                    buildingMesh.nameLabel.dispose();
                }
                buildingMesh.nameLabel = null;
            } catch (error) {
                console.error('❌ Erro ao remover label do edifício:', error);
            }
        }
    }

    // ===== CONTROLE DE VISIBILIDADE DOS LABELS =====
    showBuildingLabel(buildingMesh, immediate = false) {
        if (!buildingMesh || !buildingMesh.nameLabel) return;

        const label = buildingMesh.nameLabel;
        label.isVisible = true;
        label.targetVisibility = 1;

        if (immediate) {
            label.visibility = 1;
        }
    }

    hideBuildingLabel(buildingMesh, immediate = false) {
        if (!buildingMesh || !buildingMesh.nameLabel) return;

        const label = buildingMesh.nameLabel;
        label.targetVisibility = 0;

        if (immediate) {
            label.visibility = 0;
            label.isVisible = false;
        }
    }

    // Atualizar animações dos labels (chamado no update loop)
    updateBuildingLabels(deltaTime) {
        this.buildings.forEach(building => {
            if (building.mesh && building.mesh.nameLabel) {
                const label = building.mesh.nameLabel;

                // Animar transição suave
                if (Math.abs(label.visibility - label.targetVisibility) > 0.01) {
                    const direction = label.targetVisibility > label.visibility ? 1 : -1;
                    label.visibility += direction * label.fadeSpeed * deltaTime;

                    // Clamp entre 0 e 1
                    label.visibility = Math.max(0, Math.min(1, label.visibility));

                    // Ocultar completamente quando invisível
                    if (label.visibility <= 0.01) {
                        label.visibility = 0;
                        label.isVisible = false;
                    }
                }
            }
        });
    }

    // Atualizar efeitos de escassez de energia (chamado no update loop)
    updatePowerShortageEffects(deltaTime) {
        this.buildings.forEach(building => {
            if (building.mesh && building.mesh.powerShortageFlicker) {
                const flicker = building.mesh.powerShortageFlicker;
                flicker.time += deltaTime;

                // Verificar se é hora de piscar
                if (flicker.time >= flicker.interval) {
                    flicker.time = 0;

                    // Aplicar efeito de piscada
                    if (building.mesh.material) {
                        const originalAlpha = building.mesh.material.alpha || 1;

                        // Piscar reduzindo a opacidade
                        building.mesh.material.alpha = 0.3;

                        // Restaurar opacidade após a duração do piscar
                        setTimeout(() => {
                            if (building.mesh && building.mesh.material) {
                                building.mesh.material.alpha = originalAlpha;
                            }
                        }, flicker.duration * 1000);
                    }
                }
            }
        });
    }

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

                console.log(`🔧 Eficiência atualizada para ${building.config.name}: ${oldEfficiency.toFixed(2)} -> ${efficiency.toFixed(2)}`);
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

    console.log(`⚡❌ Efeitos de escassez de energia aplicados a ${building.config.name}`);
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

    console.log(`⚡✅ Efeitos de escassez de energia removidos de ${building.config.name}`);
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

        console.log(`⚡ Ícone de escassez de energia criado para ${building.config.name}`);

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
    // ===== GETTERS =====
    getBuildingTypes() {
        return Array.from(this.buildingTypes.values()).filter(type => type.visible !== false);
    }
    getBuildingTypesByCategory(category) {
        return Array.from(this.buildingTypes.values()).filter(
            type => type.category === category && type.visible !== false
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
        console.log(`🔍 Preview updated: (${gridX}, ${gridZ}) - ${isValid ? 'VALID' : 'INVALID'} - ${canPlaceResult.reason || 'No reason'}`);
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
            console.log(`✅ Edifício ${buildingType.name} construído em (${gridX}, ${gridZ}) com alinhamento perfeito ao grid`);
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

    getBuildingAt(gridX, gridZ) {
        for (const building of this.buildings.values()) {
            if (building.gridX === gridX && building.gridZ === gridZ) {
                return building;
            }
        }
        return null;
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
                console.log(`🔗 Conexão seamless criada entre ${building1.config.name} e ${building2.config.name}`);
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

        console.log(`🔗 Conexões de infraestrutura removidas para ${building.config.name}`);
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
        console.log(`🏙️ ${buildingName} agora está ${status}`);

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

            console.log(`🏙️ Ícone de aluguel criado para ${building.config.name}`);

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

    canBuildingBeRented(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building) return false;

        return !!(building.config.waterProduction || building.config.powerGeneration);
    }

    getRentalIncome(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building || !building.isRented) return 0;

        let rentalIncome = 0;
        if (building.config.waterProduction) {
            rentalIncome += building.config.waterProduction * 2; // R$ 2 por L/s
        }
        if (building.config.powerGeneration) {
            rentalIncome += building.config.powerGeneration * 50; // R$ 50 por MW
        }

        return rentalIncome;
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
                    console.log(`✅ Animação de construção finalizada - rotação restaurada para ${buildingData.config.name} rotação: ${buildingData.mesh.rotation}`);
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

            console.log(`🔊 Audio de conclusão aprimorado reproduzido para ${buildingType.name}`);

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

                console.log(`🔊 Som de progresso aprimorado (${Math.round(currentMilestone * 100)}%) para ${buildingData.config.name}`);
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

            console.log(`🔊 Audio de colocação aprimorado reproduzido para ${buildingType.name}`);

        } catch (error) {
            console.warn('⚠️ Erro ao reproduzir áudio de colocação:', error);
        }
    }
}

// Exportar para escopo global
window.BuildingSystem = BuildingSystem;
console.log('🏗️ BuildingSystem carregado e exportado para window.BuildingSystem');
