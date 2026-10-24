/**
 * Tipos de edifício, por id. Registrados por BuildingSystem.initializeBuildingTypes().
 * Carregado antes dos sistemas (index.html). Só dados: sem funções, sem `this`.
 */
const BUILDING_TYPES = {

    // CATEGORIA: ÁGUA
    water_pump: {
        tier: 1, group: 'Captação', techRequires: [],
        groundwater: true, // tira água do aquífero (ResourceManager.updateAquifer)
        name: 'Bomba de Água',
        description: 'Extrai água de fontes subterrâneas',
        category: 'water',
        cost: 2500,
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
    },

    water_well: {
        tier: 2, group: 'Captação', techRequires: [{ id: 'water_pump', count: 3 }],
        groundwater: true,
        name: 'Poço Artesiano',
        description: 'Poço profundo para extração de água limpa',
        category: 'water',
        cost: 4000,
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
    },

    // CATEGORIA: TRATAMENTO
    treatment_plant: {
        tier: 2, group: 'Água e esgoto', techRequires: [{ id: 'water_pump', count: 2 }],
        reputationOnBuild: { environment: 3, citizens: 1 },
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
    },

    filter_station: {
        tier: 3, group: 'Água e esgoto', techRequires: [{ id: 'treatment_plant', count: 1 }, { id: 'water_quality_monitor', count: 1 }],
        reputationOnBuild: { environment: 2 },
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
    },

    // ----- Lixo e reciclagem (grupo da categoria Tratamento). waste: true = fora do "custo de tratamento" dos
    // eventos (EventSystem). O lixo não é um recurso próprio: o efeito é a poluição que deixa de ir para rios e bueiros.
    recycling_point: {
        tier: 1, group: 'Lixo e reciclagem', techRequires: [],
        waste: true,
        reputationOnBuild: { environment: 1, citizens: 1 },
        name: 'Ponto de Coleta Reciclável',
        description: 'Contêineres coloridos da coleta seletiva: papel, plástico, vidro e metal deixam de ir para o rio',
        category: 'treatment',
        cost: 1500,
        size: 1,
        pollutionReduction: 4,
        satisfactionBonus: 3,
        maintenanceCost: 40,
        icon: '♻️',
        color: '#43A047',
        requirements: { terrain: ['grassland', 'lowland'], nearWater: false }
    },

    recycling_coop: {
        tier: 2, group: 'Lixo e reciclagem', techRequires: [{ id: 'recycling_point', count: 3 }],
        waste: true,
        reputationOnBuild: { citizens: 2, environment: 2 },
        name: 'Cooperativa de Reciclagem',
        description: 'Catadores organizados separam, prensam e vendem os recicláveis: renda para as famílias e menos lixo',
        category: 'treatment',
        cost: 9000,
        size: 2,
        pollutionReduction: 10,
        incomeGeneration: 300,
        satisfactionBonus: 5,
        powerConsumption: 15,
        maintenanceCost: 150,
        icon: '♻️',
        color: '#2E7D32',
        requirements: { terrain: ['grassland', 'lowland'], nearWater: false }
    },

    landfill: {
        tier: 2, group: 'Lixo e reciclagem', techRequires: [{ id: 'recycling_point', count: 1 }],
        waste: true,
        reputationOnBuild: { environment: 1 },
        name: 'Aterro Sanitário',
        description: 'Guarda o lixo que não dá para reciclar sobre uma manta que protege o solo; o chorume é tratado e o gás, queimado',
        category: 'treatment',
        cost: 12000,
        size: 3,
        pollutionReduction: 12,
        pollutionGeneration: 2,
        maintenanceCost: 200,
        icon: '🚛',
        color: '#795548',
        requirements: { terrain: ['grassland', 'lowland', 'hill'], nearWater: false }
    },

    composting_yard: {
        tier: 2, group: 'Lixo e reciclagem', techRequires: [{ id: 'recycling_point', count: 2 }],
        waste: true,
        reputationOnBuild: { environment: 2 },
        name: 'Pátio de Compostagem',
        description: 'Restos de comida e podas viram adubo: metade do lixo de casa volta para a terra',
        category: 'treatment',
        cost: 7000,
        size: 2,
        needsRoad: false,
        pollutionReduction: 8,
        satisfactionBonus: 4,
        maintenanceCost: 90,
        icon: '🍂',
        color: '#8D6E63',
        requirements: { terrain: ['grassland', 'lowland'], nearWater: false }
    },

    biodigester: {
        tier: 3, group: 'Lixo e reciclagem', techRequires: [{ id: 'composting_yard', count: 1 }, { id: 'treatment_plant', count: 1 }],
        waste: true,
        reputationOnBuild: { environment: 2, business: 1 },
        name: 'Biodigestor',
        description: 'Bactérias sem ar transformam restos orgânicos e lodo do esgoto em biogás (energia) e adubo líquido',
        category: 'treatment',
        cost: 18000,
        size: 2,
        pollutionReduction: 10,
        powerGeneration: 60,
        maintenanceCost: 180,
        icon: '🫧',
        color: '#558B2F',
        requirements: { terrain: ['grassland', 'lowland'], nearWater: false }
    },

    ecopark: {
        tier: 5, group: 'Lixo e reciclagem', techRequires: [{ id: 'research_center', count: 1 }, { id: 'recycling_coop', count: 2 }, { id: 'biodigester', count: 1 }],
        waste: true,
        reputationOnBuild: { environment: 4, citizens: 2, government: 2 },
        name: 'Ecoparque',
        description: 'Central de tratamento avançado: triagem automática, compostagem, biogás e energia limpa. Quase nada vai para o aterro',
        category: 'treatment',
        cost: 60000,
        size: 3,
        pollutionReduction: 30,
        powerGeneration: 80,
        powerConsumption: 40,
        incomeGeneration: 500,
        satisfactionBonus: 10,
        maintenanceCost: 600,
        icon: '🏞️',
        color: '#00897B',
        requirements: { terrain: ['grassland', 'lowland'], nearWater: false }
    },

    // Muda de árvore: cresce sozinha em 4 etapas pelo tempo de jogo (js/systems/building/TreeGrowth.js).
    // Na etapa 1 só bebe água (rega); da 2 em diante não precisa mais de rega e limpa o ar cada vez mais.
    // treeStages: ms = tempo de jogo da etapa (null na última), scale = tamanho da árvore, waterConsumption em
    // L/min, pollutionReduction em poluição/min (uma árvore nativa limpa TREES.POLLUTION_REDUCTION).
    tree_sapling: {
        tier: 1, group: 'Árvores', techRequires: [],
        name: 'Muda de Árvore',
        description: 'Plante uma árvore! No começo ela só precisa de rega (gasta água); depois cresce e passa a limpar o ar.',
        category: 'nature',
        cost: 300,
        size: 1,
        plantedTree: true,
        treeStages: [
            { name: 'Muda', ms: 25000, scale: 0.32, waterConsumption: 3, pollutionReduction: 0 },
            { name: 'Árvore jovem', ms: 35000, scale: 0.55, waterConsumption: 0, pollutionReduction: 0.3 },
            { name: 'Árvore adulta', ms: 45000, scale: 0.8, waterConsumption: 0, pollutionReduction: 0.6 },
            { name: 'Árvore madura', ms: null, scale: 1.05, waterConsumption: 0, pollutionReduction: 1 }
        ],
        icon: '🌱',
        color: '#7CB342',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    // CATEGORIA: ARMAZENAMENTO
    water_tank: {
        tier: 1, group: 'Armazenamento', techRequires: [{ id: 'water_pump', count: 1 }],
        name: 'Reservatório',
        description: 'Armazena água para distribuição',
        category: 'water',
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
    },

    water_tower: {
        tier: 2, group: 'Armazenamento', techRequires: [{ id: 'water_tank', count: 2 }],
        name: 'Caixa d\'Água',
        description: 'Torre de água para distribuição por gravidade',
        category: 'water',
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
    },

    // CATEGORIA: ASFALTO (ruas: obra instantânea e barata, auto-encaixe de curvas/T/cruzamentos — js/systems/roads/)
    paved_road: {
        tier: 1, group: 'Ruas', techRequires: [],
        name: 'Rua Asfaltada',
        description: 'Arraste para traçar. Liga sozinha nas curvas e cruzamentos',
        category: 'roads',
        cost: 40,
        size: 1,
        roadType: 'paved',
        efficiency: 1.0,
        maintenanceCost: 1,
        icon: '🛣️',
        color: '#424242',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    dirt_road: {
        tier: 1, group: 'Ruas', techRequires: [],
        name: 'Estrada de Terra',
        description: 'Mais barata e sobe colinas, mas a chuva leva a terra',
        category: 'roads',
        cost: 20,
        size: 1,
        roadType: 'dirt',
        efficiency: 0.7,
        icon: '🛤️',
        color: '#8D6E63',
        requirements: {
            terrain: ['grassland', 'lowland', 'hill'],
            nearWater: false
        }
    },

    sidewalk: {
        tier: 1, group: 'Calçadas e praças', techRequires: [],
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
    },

    plaza: {
        tier: 2, group: 'Calçadas e praças', techRequires: [{ id: 'sidewalk', count: 4 }],
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
    },

    // CATEGORIA: RESIDENCIAL
    house: {
        tier: 1, group: 'Moradias', techRequires: [],
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
    },

    apartment: {
        tier: 2, group: 'Moradias', techRequires: [{ id: 'house', count: 3 }],
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
    },

    // CATEGORIA: ZONAS RESIDENCIAIS
    zone_residential_light: {
        tier: 1, group: 'Residencial', techRequires: [{ id: 'city_hall', count: 1 }],
        name: 'Zona Residencial Leve',
        description: 'Área para casas pequenas e baixa densidade populacional',
        category: 'zoning',
        cost: 1000,
        size: 2,
        zoneType: 'residential_light',
        powerConsumption: 8, // MW na fase completa (ZoneGrowth: pela fase)
        populationCapacity: 50,
        waterConsumptionPerPerson: 1.5,
        growthRate: 0.1,
        icon: '🏘️',
        color: '#81C784',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    zone_residential_balanced: {
        tier: 2, group: 'Residencial', techRequires: [{ id: 'zone_residential_light', count: 2 }],
        name: 'Zona Residencial Equilibrada',
        description: 'Área para casas suburbanas de densidade média',
        category: 'zoning',
        cost: 2000,
        size: 2,
        zoneType: 'residential_balanced',
        powerConsumption: 15, // MW na fase completa (ZoneGrowth: pela fase)
        populationCapacity: 100,
        waterConsumptionPerPerson: 2.0,
        growthRate: 0.15,
        icon: '🏘️',
        color: '#66BB6A',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    zone_residential_heavy: {
        tier: 3, group: 'Residencial', techRequires: [{ id: 'zone_residential_balanced', count: 2 }],
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
    },

    // CATEGORIA: ZONAS INDUSTRIAIS
    zone_industrial_light: {
        tier: 1, group: 'Industrial', techRequires: [{ ids: ['zone_residential_light', 'zone_residential_balanced', 'zone_residential_heavy'], count: 2, label: 'Zonas Residenciais' }],
        reputationOnBuild: { business: 2, environment: -2 },
        name: 'Zona Industrial Leve',
        description: 'Área para indústrias leves e manufatura',
        category: 'zoning',
        cost: 3000,
        size: 2,
        zoneType: 'industrial_light',
        powerConsumption: 20, // MW na fase completa (ZoneGrowth: pela fase)
        jobCapacity: 30,
        pollutionGeneration: 10,
        waterConsumption: 20,
        incomeGeneration: 250, // R$/min na fase completa (retorno ~12 min)
        icon: '🏭',
        color: '#FFB74D',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    zone_industrial_balanced: {
        tier: 2, group: 'Industrial', techRequires: [{ id: 'zone_industrial_light', count: 2 }],
        reputationOnBuild: { business: 2, environment: -2 },
        name: 'Zona Industrial Equilibrada',
        description: 'Área para indústrias de porte médio',
        category: 'zoning',
        cost: 5000,
        size: 2,
        zoneType: 'industrial_balanced',
        powerConsumption: 40, // MW na fase completa (ZoneGrowth: pela fase)
        jobCapacity: 60,
        pollutionGeneration: 20,
        waterConsumption: 40,
        incomeGeneration: 450,
        icon: '🏭',
        color: '#FF9800',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    zone_industrial_heavy: {
        tier: 3, group: 'Industrial', techRequires: [{ id: 'zone_industrial_balanced', count: 2 }],
        reputationOnBuild: { business: 2, environment: -2 },
        name: 'Zona Industrial Pesada',
        description: 'Área para indústrias pesadas e químicas',
        category: 'zoning',
        cost: 8000,
        size: 3,
        zoneType: 'industrial_heavy',
        powerConsumption: 70, // MW na fase completa (ZoneGrowth: pela fase)
        jobCapacity: 100,
        pollutionGeneration: 40,
        waterConsumption: 80,
        incomeGeneration: 800,
        icon: '🏭',
        color: '#FF5722',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    // CATEGORIA: ZONAS COMERCIAIS
    zone_commercial_light: {
        tier: 1, group: 'Comercial', techRequires: [{ ids: ['zone_residential_light', 'zone_residential_balanced', 'zone_residential_heavy'], count: 1, label: 'Zona Residencial' }],
        reputationOnBuild: { business: 2 },
        name: 'Zona Comercial Leve',
        description: 'Área para comércio local e serviços básicos',
        category: 'zoning',
        cost: 2500,
        size: 2,
        zoneType: 'commercial_light',
        powerConsumption: 12, // MW na fase completa (ZoneGrowth: pela fase)
        jobCapacity: 25,
        waterConsumption: 15,
        incomeGeneration: 150,
        satisfactionBonus: 5,
        icon: '🏪',
        color: '#64B5F6',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    zone_commercial_balanced: {
        tier: 2, group: 'Comercial', techRequires: [{ id: 'zone_commercial_light', count: 2 }],
        reputationOnBuild: { business: 2 },
        name: 'Zona Comercial Equilibrada',
        description: 'Área para shopping centers e comércio médio',
        category: 'zoning',
        cost: 4500,
        size: 2,
        zoneType: 'commercial_balanced',
        powerConsumption: 24, // MW na fase completa (ZoneGrowth: pela fase)
        jobCapacity: 50,
        waterConsumption: 30,
        incomeGeneration: 280,
        satisfactionBonus: 10,
        icon: '🏬',
        color: '#2196F3',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    zone_commercial_heavy: {
        tier: 3, group: 'Comercial', techRequires: [{ id: 'zone_commercial_balanced', count: 2 }],
        reputationOnBuild: { business: 2 },
        name: 'Zona Comercial Pesada',
        description: 'Área para grandes centros comerciais e escritórios',
        category: 'zoning',
        cost: 7000,
        size: 3,
        zoneType: 'commercial_heavy',
        powerConsumption: 45, // MW na fase completa (ZoneGrowth: pela fase)
        jobCapacity: 100,
        waterConsumption: 60,
        incomeGeneration: 500,
        satisfactionBonus: 15,
        icon: '🏢',
        color: '#1976D2',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: false
        }
    },

    // CATEGORIA: ENERGIA
    hydroelectric_plant: {
        tier: 3, group: 'Renováveis', techRequires: [{ id: 'solar_farm', count: 1 }],
        name: 'Hidrelétrica',
        description: 'Usina hidrelétrica limpa de alta capacidade',
        category: 'power',
        cost: 11250,
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
    },

    power_pole: {
        tier: 1, group: 'Rede elétrica', techRequires: [],
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
    },

    thermal_plant: {
        tier: 2, group: 'Fósseis', techRequires: [{ id: 'coal_plant', count: 1 }],
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
    },

    nuclear_plant: {
        tier: 5, group: 'Alta tecnologia', techRequires: [{ id: 'university', count: 1 }, { id: 'research_center', count: 1 }],
        name: 'Usina Nuclear',
        description: 'Muita energia quase sem fumaça, mas gasta muita água para esfriar o reator e deixa lixo radioativo',
        category: 'power',
        cost: 50000,
        size: 4,
        powerGeneration: 1000,
        pollutionGeneration: 5,
        waterConsumption: 60, // resfriamento do reator
        maintenanceCost: 500,
        reputationOnBuild: { business: 2, citizens: -2 },
        icon: '☢️',
        color: '#9C27B0',
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: true
        }
    },

    coal_plant: {
        tier: 1, group: 'Fósseis', techRequires: [],
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
    },

    solar_farm: {
        tier: 2, group: 'Renováveis', techRequires: [{ id: 'wind_farm', count: 1 }],
        name: 'Usina Solar',
        description: 'Fazenda solar fotovoltaica limpa',
        category: 'power',
        cost: 9000,
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
    },

    wind_farm: {
        tier: 1, group: 'Renováveis', techRequires: [],
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
    },

    biomass_plant: {
        tier: 3, group: 'Biomassa', techRequires: [{ id: 'composting_yard', count: 1 }],
        reputationOnBuild: { business: 1 },
        name: 'Usina de Biomassa',
        description: 'Queima restos de madeira e da roça para gerar eletricidade. Renovável, mas solta fumaça e precisa de filtros',
        category: 'power',
        cost: 16000,
        size: 2,
        powerGeneration: 140,
        pollutionGeneration: 8,
        maintenanceCost: 200,
        icon: '🪵',
        color: '#6D4C41',
        requirements: { terrain: ['grassland', 'lowland'], nearWater: false }
    },

    sugarcane_mill: {
        tier: 4, group: 'Biomassa', techRequires: [{ id: 'biomass_plant', count: 1 }, { ids: ['zone_industrial_light', 'zone_industrial_balanced', 'zone_industrial_heavy'], count: 2, label: 'Zonas Industriais' }],
        reputationOnBuild: { business: 3, environment: -1 },
        name: 'Usina Sucroenergética',
        description: 'A cana vira açúcar e etanol, e o bagaço queimado gera eletricidade. Gasta muita água e a vinhaça precisa de cuidado',
        category: 'power',
        cost: 30000,
        size: 3,
        powerGeneration: 250,
        pollutionGeneration: 12,
        waterConsumption: 40,
        incomeGeneration: 500,
        maintenanceCost: 400,
        icon: '🌾',
        color: '#9E9D24',
        requirements: { terrain: ['grassland', 'lowland'], nearWater: false }
    },

    // CATEGORIA: PÚBLICO/ADMINISTRATIVO
    city_hall: {
        tier: 1, group: 'Governo', techRequires: [],
        reputationOnBuild: { government: 3 },
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
    },

    school: {
        tier: 1, group: 'Educação e saúde', techRequires: [{ id: 'city_hall', count: 1 }],
        reputationOnBuild: { citizens: 3 },
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
    },

    hospital: {
        tier: 2, group: 'Educação e saúde', techRequires: [{ id: 'school', count: 1 }],
        reputationOnBuild: { citizens: 3 },
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
    },

    fire_station: {
        tier: 1, group: 'Segurança', techRequires: [{ id: 'city_hall', count: 1 }],
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
    },

    police_station: {
        tier: 1, group: 'Segurança', techRequires: [{ id: 'city_hall', count: 1 }],
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
    },

    // ===== RESEARCH CENTERS AND UNIVERSITIES IMPLEMENTATION =====
    research_center: {
        tier: 3, group: 'Pesquisa', techRequires: [{ id: 'school', count: 1 }],
        name: 'Centro de Pesquisa',
        description: 'Centro de pesquisa que reduz custos de construção em 10-15% e melhora eficiência de edifícios próximos',
        category: 'science',
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
    },

    university: {
        tier: 4, group: 'Pesquisa', techRequires: [{ id: 'research_center', count: 1 }, { id: 'school', count: 2 }],
        name: 'Universidade',
        description: 'Universidade que reduz custos de construção em 15-25% e melhora significativamente a eficiência de edifícios próximos',
        category: 'science',
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
    },

    // CATEGORIA: COMERCIAL (Revenue-Generating)
    shopping_center: {
        tier: 4, group: 'Comércio e serviços', techRequires: [{ id: 'bank', count: 1 }, { id: 'zone_commercial_heavy', count: 1 }],
        reputationOnBuild: { business: 2 },
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
    },

    office_building: {
        tier: 3, group: 'Comércio e serviços', techRequires: [{ id: 'restaurant', count: 1 }],
        reputationOnBuild: { business: 2 },
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
    },

    bank: {
        tier: 3, group: 'Comércio e serviços', techRequires: [{ id: 'office_building', count: 1 }],
        reputationOnBuild: { business: 2 },
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
    },

    restaurant: {
        tier: 2, group: 'Comércio e serviços', techRequires: [{ ids: ['zone_commercial_light', 'zone_commercial_balanced', 'zone_commercial_heavy'], count: 1, label: 'Zona Comercial' }],
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
    },

    // CATEGORIA: TURISMO (Revenue-Generating)
    museum: {
        tier: 3, group: 'Cultura', techRequires: [{ id: 'monument', count: 1 }],
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
    },

    park: {
        tier: 4, group: 'Hospedagem e lazer', techRequires: [{ id: 'linear_park', count: 1 }, { id: 'hotel', count: 1 }],
        aquiferRecharge: 1.5,
        runoffAbsorption: 15,
        reputationOnBuild: { citizens: 3, environment: 1 },
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
    },

    monument: {
        tier: 2, group: 'Cultura', techRequires: [{ id: 'school', count: 1 }],
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
    },

    hotel: {
        tier: 3, group: 'Hospedagem e lazer', techRequires: [{ id: 'restaurant', count: 1 }],
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
    },

    // CATEGORIA: INDUSTRIAL (Revenue-Generating)
    factory: {
        tier: 3, group: 'Indústria', techRequires: [{ ids: ['zone_industrial_light', 'zone_industrial_balanced', 'zone_industrial_heavy'], count: 3, label: 'Zonas Industriais' }],
        reputationOnBuild: { business: 2, environment: -2 },
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
    },

    tech_center: {
        tier: 4, group: 'Indústria', techRequires: [{ id: 'factory', count: 1 }, { id: 'research_center', count: 1 }],
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
    },

    port: {
        tier: 5, group: 'Indústria', techRequires: [{ id: 'tech_center', count: 1 }],
        reputationOnBuild: { business: 2, environment: -2 },
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
    },

    // ===== EDIFÍCIOS EDUCACIONAIS E DE PESQUISA =====

    // Centro de Pesquisas Hídricas
    water_research_center: {
        tier: 5, group: 'Pesquisa', techRequires: [{ id: 'university', count: 1 }, { id: 'monitoring_station', count: 1 }],
        name: 'Centro de Pesquisas Hídricas',
        icon: '🔬',
        category: 'science',
        cost: 100000,
        buildTime: 45,
        size: 3,
        requirements: {
            terrain: ['grassland', 'lowland'],
            population: 1000,
            budget: 100000
        },
        // Efeitos reais: satisfação, eficiência dos prédios por perto e um pouco de limpeza
        satisfactionBonus: 15,
        researchBonus: true,
        nearbyEfficiencyBonus: 0.2,
        effectRadius: 5,
        pollutionReduction: 5,
        maintenanceCost: 800,
        description: 'Centro avançado para pesquisa e desenvolvimento de tecnologias hídricas',
        educationalContent: {
            concepts: ['centros de pesquisas', 'inovação tecnológica', 'gestão hídrica'],
            facts: [
                'Centros de pesquisa aceleram o desenvolvimento de soluções inovadoras.',
                'Pesquisa aplicada gera tecnologias específicas para cada região.',
                'Colaboração científica multiplica os resultados de pesquisa.'
            ]
        }
    },

    // ===== INFRAESTRUTURA VERDE =====

    // Parque Linear
    linear_park: {
        tier: 3, group: 'Rios e parques', techRequires: [{ id: 'rain_garden', count: 2 }, { id: 'tree_sapling', count: 5 }],
        aquiferRecharge: 2,
        runoffAbsorption: 20,
        reputationOnBuild: { environment: 3, citizens: 2 },
        name: 'Parque Linear',
        icon: '🌳',
        category: 'nature',
        cost: 25000,
        buildTime: 20,
        size: 3,
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: true
        },
        satisfactionBonus: 25,
        pollutionReduction: 15, // vegetação da margem filtra o que escorre para o rio
        maintenanceCost: 300,
        needsRoad: false, // solução da natureza: funciona sem rua
        description: 'Parque linear que protege rios urbanos e oferece lazer sustentável',
        educationalContent: {
            concepts: ['parque linear', 'proteção de rios', 'lazer sustentável'],
            facts: [
                'Parques lineares protegem margens de rios da ocupação irregular.',
                'Vegetação ripária filtra poluentes antes que cheguem aos rios.',
                'Espaços verdes urbanos melhoram a qualidade de vida da população.'
            ]
        }
    },

    // Jardim de Chuva
    rain_garden: {
        tier: 2, group: 'Chuva e drenagem', techRequires: [{ id: 'tree_sapling', count: 3 }],
        aquiferRecharge: 1.5, // %/min devolvidos ao aquífero
        runoffAbsorption: 12, // segura a enxurrada (risco de enchente, EventSystem.getFloodRisk)
        reputationOnBuild: { environment: 3 },
        name: 'Jardim de Chuva',
        icon: '🌧️',
        category: 'nature',
        cost: 8000,
        buildTime: 10,
        size: 2,
        requirements: {
            terrain: ['grassland', 'lowland']
        },
        waterStorage: 50, // guarda a água da chuva
        pollutionReduction: 10,
        satisfactionBonus: 10,
        maintenanceCost: 60,
        needsRoad: false, // solução da natureza: funciona sem rua
        description: 'Sistema natural de drenagem que reduz enchentes e filtra água',
        educationalContent: {
            concepts: ['jardim de chuva', 'drenagem sustentável', 'infiltração'],
            facts: [
                'Jardins de chuva reduzem o escoamento superficial em até 30%.',
                'Plantas nativas filtram naturalmente poluentes da água.',
                'Sistemas de drenagem verde custam menos que obras convencionais.'
            ]
        }
    },

    // Teto Verde
    green_roof: {
        tier: 3, group: 'Telhados e paredes', techRequires: [{ id: 'green_wall', count: 1 }],
        aquiferRecharge: 1,
        runoffAbsorption: 8,
        reputationOnBuild: { environment: 2 },
        name: 'Teto Verde',
        icon: '🏢',
        category: 'nature',
        cost: 15000,
        buildTime: 15,
        size: 2,
        requirements: {
            terrain: ['grassland', 'lowland']
        },
        waterStorage: 30,
        pollutionReduction: 8,
        satisfactionBonus: 12,
        maintenanceCost: 80,
        needsRoad: false, // solução da natureza: funciona sem rua
        description: 'Cobertura vegetal que reduz escoamento e melhora eficiência energética',
        educationalContent: {
            concepts: ['tetos verdes', 'eficiência energética', 'retenção de água'],
            facts: [
                'Tetos verdes podem reter até 75% da água da chuva.',
                'Reduzem a temperatura interna em até 5°C no verão.',
                'Melhoram a qualidade do ar urbano através da fotossíntese.'
            ]
        }
    },

    // Parede Verde
    green_wall: {
        tier: 2, group: 'Telhados e paredes', techRequires: [{ id: 'rain_garden', count: 1 }],
        runoffAbsorption: 2,
        reputationOnBuild: { environment: 2 },
        name: 'Parede Verde',
        icon: '🌿',
        category: 'nature',
        cost: 12000,
        buildTime: 12,
        size: 1,
        requirements: {
            terrain: ['grassland', 'lowland']
        },
        pollutionReduction: 12,
        satisfactionBonus: 15,
        maintenanceCost: 60,
        needsRoad: false, // solução da natureza: funciona sem rua
        description: 'Sistema vertical de plantas que purifica o ar e reduz temperatura',
        educationalContent: {
            concepts: ['paredes verdes', 'purificação do ar', 'ilha de calor urbana'],
            facts: [
                'Paredes verdes podem filtrar até 15kg de CO2 por ano por m².',
                'Reduzem a temperatura ambiente em até 5°C.',
                'Melhoram a acústica urbana absorvendo ruídos.'
            ]
        }
    },

    // Jardim Flutuante
    floating_garden: {
        tier: 3, group: 'Rios e parques', techRequires: [{ id: 'treatment_plant', count: 1 }, { id: 'rain_garden', count: 1 }],
        reputationOnBuild: { environment: 3 },
        name: 'Jardim Flutuante',
        icon: '🪷',
        category: 'nature',
        cost: 18000,
        buildTime: 18,
        size: 3,
        requirements: {
            terrain: ['water'],
            waterBody: true
        },
        pollutionReduction: 20, // plantas filtradoras limpam o rio
        satisfactionBonus: 20,
        maintenanceCost: 120,
        needsRoad: false, // solução da natureza: funciona sem rua
        description: 'Sistema flutuante com plantas filtradoras que purificam a água',
        educationalContent: {
            concepts: ['jardins flutuantes', 'plantas filtradoras', 'fitorremediação'],
            facts: [
                'Plantas aquáticas podem remover até 90% dos nutrientes em excesso.',
                'Sistemas flutuantes não ocupam espaço terrestre valioso.',
                'Fitorremediação é uma tecnologia natural e sustentável.'
            ]
        }
    },

    // ===== SISTEMAS DE MONITORAMENTO =====

    // Estação de Monitoramento
    monitoring_station: {
        tier: 3, group: 'Monitoramento', techRequires: [{ id: 'water_quality_monitor', count: 1 }],
        earlyWarning: true, // avisa eventos com o dobro de antecedência (EventSystem.getWarningTime)
        reputationOnBuild: { environment: 1, government: 2 },
        name: 'Estação de Monitoramento',
        icon: '📊',
        category: 'science',
        cost: 20000,
        buildTime: 15,
        size: 1,
        requirements: {
            terrain: ['grassland', 'lowland'],
            nearWater: true
        },
        pollutionReduction: 6, // acha cedo quem polui: o problema é corrigido antes de crescer
        maintenanceCost: 150,
        description: 'Sistema automatizado de monitoramento da qualidade da água',
        educationalContent: {
            concepts: ['monitoramento ambiental', 'qualidade da água', 'sensores IoT'],
            facts: [
                'Monitoramento contínuo permite detecção precoce de problemas.',
                'Sensores IoT fornecem dados em tempo real sobre qualidade da água.',
                'Sistemas de alerta precoce podem prevenir crises hídricas.'
            ]
        }
    },

    // Monitor de Qualidade da Água
    water_quality_monitor: {
        tier: 2, group: 'Monitoramento', techRequires: [{ id: 'treatment_plant', count: 1 }],
        name: 'Monitor de Qualidade',
        icon: '🔍',
        category: 'science',
        cost: 12000,
        buildTime: 10,
        size: 1,
        requirements: {
            terrain: ['grassland', 'lowland', 'water']
        },
        pollutionReduction: 5,
        satisfactionBonus: 8, // moradores confiam na água da torneira
        maintenanceCost: 100,
        description: 'Equipamento para análise contínua de parâmetros de qualidade da água',
        educationalContent: {
            concepts: ['qualidade da água', 'parâmetros físico-químicos', 'saúde pública'],
            facts: [
                'pH, turbidez e oxigênio dissolvido são indicadores básicos de qualidade.',
                'Coliformes fecais indicam contaminação por esgoto.',
                'Monitoramento regular previne doenças de veiculação hídrica.'
            ]
        }
    },

    // Sistema de Controle de Erosão
    erosion_control: {
        tier: 2, group: 'Chuva e drenagem', techRequires: [{ id: 'tree_sapling', count: 3 }],
        name: 'Controle de Erosão',
        icon: '🛡️',
        category: 'nature',
        cost: 15000,
        buildTime: 20,
        size: 1,
        requirements: {
            terrain: ['grassland', 'highland']
        },
        pollutionReduction: 6, // menos terra descendo para o rio
        maintenanceCost: 80,
        needsRoad: false, // solução da natureza: funciona sem rua
        description: 'Terraços e barreiras para prevenir erosão e assoreamento',
        educationalContent: {
            concepts: ['erosão', 'assoreamento', 'sedimentação', 'conservação do solo'],
            facts: [
                'Erosão causa perda de 25 bilhões de toneladas de solo por ano no mundo.',
                'Sedimentação reduz a capacidade de reservatórios em 1% ao ano.',
                'Terraços podem reduzir a erosão em até 95%.'
            ]
        }
    },
};
