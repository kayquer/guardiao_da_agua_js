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
        this.constructionTimeout = 30000; // 30 segundos timeout para construções
        this.lastConstructionCheck = 0;

        // Throttling para atualizações de eficiência
        this.lastEfficiencyUpdate = 0;

        this.initializeBuildingTypes();
        this.createMaterials();

        // Expor métodos de debug globalmente
        window.resetConstructionState = () => this.forceResetConstructionState();
        window.getConstructionInfo = () => ({
            inProgress: this.constructionInProgress,
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
            return null;
        }

        // Verificar se há construção em andamento
        if (this.constructionInProgress) {
            // Verificar se a construção não está travada
            this.validateConstructionState();

            if (this.constructionInProgress) {
                this.showNotification('⚠️ Construção já em andamento', 'warning');
                console.warn('⚠️ Construção já em andamento - aguarde a conclusão');
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

        // Criar label de nome do edifício
        this.createBuildingNameLabel(mesh, buildingType, worldPos);

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

            return BABYLON.Mesh.MergeMeshes([base, tree]);

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

    // ===== VALIDAÇÃO E RECUPERAÇÃO =====
    validateConstructionState() {
        const currentTime = Date.now();

        // Verificar se há construções travadas (timeout)
        if (this.constructionInProgress && this.constructionQueue.size === 0) {
            console.warn('⚠️ Estado de construção inconsistente detectado - resetando');
            this.forceResetConstructionState();
            return;
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
        this.constructionInProgress = false;
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

        // Criar texto de porcentagem com textura dinâmica
        const textPlane = BABYLON.MeshBuilder.CreatePlane(`progressText_${buildingData.id}`, {
            width: 1.5,
            height: 0.5
        }, this.scene);

        textPlane.position.x = worldPos.x;
        textPlane.position.z = worldPos.z;
        textPlane.position.y = 3.8;
        textPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        // Criar textura dinâmica para o texto de progresso
        const progressTexture = new BABYLON.DynamicTexture(`progressTexture_${buildingData.id}`,
            { width: 256, height: 64 }, this.scene);

        // Material do texto com textura dinâmica
        const textMaterial = new BABYLON.StandardMaterial(`textMat_${buildingData.id}`, this.scene);
        textMaterial.diffuseTexture = progressTexture;
        textMaterial.emissiveTexture = progressTexture;
        textMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        textMaterial.backFaceCulling = false;
        textMaterial.hasAlpha = true;
        textPlane.material = textMaterial;

        // Desenhar texto inicial (0%)
        progressTexture.drawText("0%", null, null, "bold 32px Arial", "#FFFFFF", "#000000AA", true);

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

        // Atualizar texto de porcentagem real
        const percentage = Math.floor(progress * 100);
        if (textPlane.material && textPlane.material.diffuseTexture) {
            try {
                // Atualizar o texto na textura dinâmica
                textPlane.material.diffuseTexture.drawText(`${percentage}%`, null, null,
                    "bold 32px Arial", "#FFFFFF", "#000000AA", true);
            } catch (error) {
                console.warn('⚠️ Erro ao atualizar texto de progresso:', error);
            }
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

        // Criar texto "Concluído" temporário com textura dinâmica
        const completionText = BABYLON.MeshBuilder.CreatePlane(`completion_${buildingData.id}`, {
            width: 2,
            height: 0.8
        }, this.scene);

        completionText.position.x = worldPos.x;
        completionText.position.z = worldPos.z;
        completionText.position.y = 4;
        completionText.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        // Criar textura dinâmica para "Concluído"
        const completionTexture = new BABYLON.DynamicTexture(`completionTexture_${buildingData.id}`,
            { width: 256, height: 64 }, this.scene);

        completionTexture.drawText("Concluído!", null, null, "bold 32px Arial", "#00FF00", "#000000AA", true);

        const textMaterial = new BABYLON.StandardMaterial(`completionMat_${buildingData.id}`, this.scene);
        textMaterial.diffuseTexture = completionTexture;
        textMaterial.emissiveTexture = completionTexture;
        textMaterial.emissiveColor = new BABYLON.Color3(0, 0.8, 0);
        textMaterial.backFaceCulling = false;
        textMaterial.hasAlpha = true;
        completionText.material = textMaterial;

        // Restaurar escala do edifício
        if (buildingData.mesh) {
            buildingData.mesh.scaling = buildingData.originalScaling || new BABYLON.Vector3(1, 1, 1);
        }

        // Remover texto após 2 segundos
        setTimeout(() => {
            if (completionText && !completionText.isDisposed()) {
                // Limpar material e textura
                if (completionText.material) {
                    if (completionText.material.diffuseTexture) {
                        completionText.material.diffuseTexture.dispose();
                    }
                    if (completionText.material.emissiveTexture) {
                        completionText.material.emissiveTexture.dispose();
                    }
                    completionText.material.dispose();
                }
                completionText.dispose();
            }
        }, 2000);

        // Mostrar notificação
        this.showNotification(`${buildingData.config.name} concluído!`, 'success');
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

            // Criar textura dinâmica com texto
            const dynamicTexture = new BABYLON.DynamicTexture(`labelTexture_${buildingMesh.name}`,
                { width: 512, height: 128 }, this.scene);

            // Configurar fonte e texto
            const font = "bold 48px Arial";
            const text = buildingType.name || buildingType.id;

            // Limpar textura e desenhar texto
            dynamicTexture.drawText(text, null, null, font, "#FFFFFF", "#000000AA", true);

            // Criar material para o label
            const labelMaterial = new BABYLON.StandardMaterial(`labelMat_${buildingMesh.name}`, this.scene);
            labelMaterial.diffuseTexture = dynamicTexture;
            labelMaterial.emissiveTexture = dynamicTexture;
            labelMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            labelMaterial.backFaceCulling = false;
            labelMaterial.hasAlpha = true;

            labelPlane.material = labelMaterial;

            // Inicialmente oculto - só aparece no hover ou seleção
            labelPlane.visibility = 0;
            labelPlane.isVisible = false;

            // Armazenar referência no mesh do edifício
            buildingMesh.nameLabel = labelPlane;

            // Adicionar propriedades para animação
            labelPlane.targetVisibility = 0;
            labelPlane.fadeSpeed = 5; // Velocidade da transição (5 = 200ms)

            console.log(`✅ Label criado para ${buildingType.name}: "${text}" (inicialmente oculto)`);

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

            // Criar plano para o ícone
            const iconPlane = BABYLON.MeshBuilder.CreatePlane(`powerIcon_${mesh.name}`, {
                width: 1.5,
                height: 1.5
            }, this.scene);

            // Posicionar acima do edifício
            iconPlane.position.x = worldPos.x + 1;
            iconPlane.position.z = worldPos.z + 1;
            iconPlane.position.y = this.getBuildingHeight(building.config) + 2;
            iconPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

            // Criar textura dinâmica com ícone
            const dynamicTexture = new BABYLON.DynamicTexture(`powerIconTexture_${mesh.name}`,
                { width: 256, height: 256 }, this.scene);

            // Desenhar ícone de escassez de energia
            const font = "bold 120px Arial";
            const icon = "⚡❌";
            dynamicTexture.drawText(icon, null, null, font, "#FF4444", "transparent", true);

            // Criar material para o ícone
            const iconMaterial = new BABYLON.StandardMaterial(`powerIconMat_${mesh.name}`, this.scene);
            iconMaterial.diffuseTexture = dynamicTexture;
            iconMaterial.emissiveTexture = dynamicTexture;
            iconMaterial.emissiveColor = new BABYLON.Color3(1, 0.2, 0.2);
            iconMaterial.backFaceCulling = false;
            iconMaterial.hasAlpha = true;

            iconPlane.material = iconMaterial;

            // Armazenar referência
            mesh.powerShortageIcon = iconPlane;

            console.log(`⚡ Ícone de escassez de energia criado para ${building.config.name}`);

        } catch (error) {
            console.error(`❌ Erro ao criar ícone de escassez de energia:`, error);
        }
    }

    removePowerShortageIcon(building) {
        const mesh = building.mesh;
        if (mesh.powerShortageIcon) {
            try {
                if (!mesh.powerShortageIcon.isDisposed()) {
                    // Limpar material e textura
                    if (mesh.powerShortageIcon.material) {
                        if (mesh.powerShortageIcon.material.diffuseTexture) {
                            mesh.powerShortageIcon.material.diffuseTexture.dispose();
                        }
                        if (mesh.powerShortageIcon.material.emissiveTexture) {
                            mesh.powerShortageIcon.material.emissiveTexture.dispose();
                        }
                        mesh.powerShortageIcon.material.dispose();
                    }
                    mesh.powerShortageIcon.dispose();
                }
                mesh.powerShortageIcon = null;
            } catch (error) {
                console.error('❌ Erro ao remover ícone de escassez de energia:', error);
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
            if (canPlaceResult.canPlace && isWithinBounds) {
                material.diffuseColor = new BABYLON.Color3(0, 1, 0); // Verde
                material.emissiveColor = new BABYLON.Color3(0, 0.3, 0);
            } else {
                material.diffuseColor = new BABYLON.Color3(1, 0, 0); // Vermelho
                material.emissiveColor = new BABYLON.Color3(0.3, 0, 0);
            }

            this.previewMarker.setEnabled(true);
        }

        // Mostrar indicadores de células ocupadas para edifícios multi-célula
        this.updateMultiCellPreview(gridX, gridZ, buildingType.size, canPlaceResult.canPlace && isWithinBounds);
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
        console.log(`🏙️ ${building.config.name} agora está ${status}`);

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
}

// Exportar para escopo global
window.BuildingSystem = BuildingSystem;
console.log('🏗️ BuildingSystem carregado e exportado para window.BuildingSystem');
