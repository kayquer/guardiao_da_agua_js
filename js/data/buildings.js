/**
 * Tipos de edifício, por id. Registrados por BuildingSystem.initializeBuildingTypes().
 * Carregado antes dos sistemas (index.html). Só dados: sem funções, sem `this`.
 */
const BUILDING_TYPES = {

    // CATEGORIA: ÁGUA
    water_pump: {
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

    desalination_plant: {
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
    },

    // CATEGORIA: TRATAMENTO
    treatment_plant: {
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

    // CATEGORIA: ARMAZENAMENTO
    water_tank: {
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
    },

    water_tower: {
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
    },

    // CATEGORIA: INFRAESTRUTURA
    paved_road: {
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
    },

    dirt_road: {
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
    },

    sidewalk: {
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
    },

    zone_residential_balanced: {
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
    },

    zone_residential_heavy: {
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
    },

    zone_industrial_balanced: {
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
    },

    zone_industrial_heavy: {
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
    },

    // CATEGORIA: ZONAS COMERCIAIS
    zone_commercial_light: {
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
    },

    zone_commercial_balanced: {
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
    },

    zone_commercial_heavy: {
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
    },

    // CATEGORIA: ENERGIA
    hydroelectric_plant: {
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
    },

    coal_plant: {
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

    // CATEGORIA: PÚBLICO/ADMINISTRATIVO
    city_hall: {
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
    },

    university: {
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
    },

    // CATEGORIA: COMERCIAL (Revenue-Generating)
    shopping_center: {
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
    },

    // ===== INFRAESTRUTURA VERDE =====

    // Parque Linear
    linear_park: {
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
    },

    // Jardim de Chuva
    rain_garden: {
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
    },

    // Teto Verde
    green_roof: {
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
    },

    // Parede Verde
    green_wall: {
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
    },

    // Jardim Flutuante
    floating_garden: {
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
    },

    // ===== SISTEMAS DE MONITORAMENTO =====

    // Estação de Monitoramento
    monitoring_station: {
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
    },

    // Monitor de Qualidade da Água
    water_quality_monitor: {
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
    },

    // Sistema de Controle de Erosão
    erosion_control: {
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
    },
};
