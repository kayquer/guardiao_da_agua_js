/**
 * Missões, por id, na ordem de registro. Registradas por QuestSystem.initializeQuests().
 * Carregado antes dos sistemas (index.html). Só dados: sem funções, sem `this`.
 */
const MISSIONS = {

    // ===== MISSÕES PRINCIPAIS (PRIMARY) =====
    tutorial_01: {
        title: 'Bem-vindo, Guardião!',
        description: 'Construa sua primeira bomba de água para começar a fornecer água à população.',
        type: 'primary',
        category: 'primary',
        difficulty: 'beginner',
        estimatedTime: '5 minutos',
        prerequisites: [],
        objectives: [
            {
                id: 'build_water_pump',
                description: 'Construir 1 Bomba de Água',
                type: 'build',
                target: 'water_pump',
                current: 0,
                required: 1
            }
        ],
        rewards: {
            score: 100,
            budget: 2000,
            unlock: ['water_well'],
            experience: 50
        },
        educationalContent: {
            concepts: ['recursos hídricos', 'água subterrânea', 'aquíferos'],
            facts: [
                'Uma bomba de água pode extrair até 50 litros por segundo de fontes subterrâneas.',
                'É importante monitorar o nível dos aquíferos para evitar esgotamento.',
                'Aquíferos são formações geológicas que armazenam água subterrânea.'
            ],
            tips: [
                'Posicione bombas longe de fontes de poluição.',
                'Diversifique suas fontes de água para maior segurança.',
                'Monitore a qualidade da água regularmente.'
            ]
        }
    },

    tutorial_02: {
        title: 'Tratando a Poluição',
        description: 'A poluição está afetando a qualidade da água. Construa uma estação de tratamento.',
        type: 'tutorial',
        category: 'secondary',
        objectives: [
            {
                id: 'build_treatment',
                description: 'Construir 1 Estação de Tratamento',
                type: 'build',
                target: 'treatment_plant',
                current: 0,
                required: 1
            },
            {
                id: 'reduce_pollution',
                description: 'Reduzir poluição para menos de 30%',
                type: 'resource',
                target: 'pollution',
                current: 0,
                required: 30,
                comparison: 'less'
            }
        ],
        rewards: {
            score: 200,
            budget: 3000,
            unlock: ['filter_station']
        },
        educationalContent: {
            facts: [
                'Estações de tratamento removem contaminantes químicos e biológicos da água.',
                'O tratamento adequado pode reduzir doenças transmitidas pela água em 90%.'
            ],
            tips: [
                'Trate a água na fonte sempre que possível.',
                'Monitore regularmente a qualidade da água tratada.'
            ]
        }
    },

    tutorial_03: {
        title: 'Armazenamento Estratégico',
        description: 'Construa reservatórios para garantir fornecimento constante de água.',
        type: 'tutorial',
        category: 'secondary',
        objectives: [
            {
                id: 'build_storage',
                description: 'Construir 2 Reservatórios',
                type: 'build',
                target: 'water_tank',
                current: 0,
                required: 2
            },
            {
                id: 'water_reserve',
                description: 'Manter reserva de água acima de 1500L',
                type: 'resource',
                target: 'water',
                current: 0,
                required: 1500,
                comparison: 'greater'
            }
        ],
        rewards: {
            score: 150,
            budget: 2500,
            unlock: ['water_tower']
        },
        educationalContent: {
            facts: [
                'Reservatórios permitem armazenar água para períodos de escassez.',
                'Uma reserva estratégica deve cobrir pelo menos 3 dias de consumo.'
            ],
            tips: [
                'Posicione reservatórios em pontos altos para melhor distribuição.',
                'Mantenha reservatórios limpos para evitar contaminação.'
            ]
        }
    },

    // MISSÕES PRINCIPAIS
    main_01: {
        title: 'Cidade Sustentável',
        description: 'Desenvolva uma infraestrutura hídrica sustentável para sua cidade.',
        type: 'main',
        category: 'primary',
        objectives: [
            {
                id: 'population_growth',
                description: 'Alcançar população de 800 habitantes',
                type: 'resource',
                target: 'population',
                current: 0,
                required: 800,
                comparison: 'greater'
            },
            {
                id: 'satisfaction_high',
                description: 'Manter satisfação acima de 80% por 5 minutos',
                type: 'sustained',
                target: 'satisfaction',
                current: 0,
                required: 300, // 5 minutos em segundos
                threshold: 80
            },
            {
                id: 'pollution_low',
                description: 'Manter poluição abaixo de 20%',
                type: 'resource',
                target: 'pollution',
                current: 0,
                required: 20,
                comparison: 'less'
            }
        ],
        rewards: {
            score: 500,
            budget: 10000,
            unlock: ['desalination_plant'],
            achievement: 'sustainable_city'
        },
        educationalContent: {
            facts: [
                'Cidades sustentáveis equilibram crescimento econômico com proteção ambiental.',
                'O acesso à água limpa é um direito humano fundamental.'
            ],
            tips: [
                'Invista em tecnologias limpas para reduzir a poluição.',
                'Eduque a população sobre conservação da água.'
            ]
        }
    },

    // MISSÕES DE DESAFIO
    challenge_01: {
        title: 'Crise Hídrica',
        description: 'Supere uma crise de escassez de água mantendo a cidade funcionando.',
        type: 'challenge',
        category: 'secondary',
        timeLimit: 600, // 10 minutos
        objectives: [
            {
                id: 'survive_drought',
                description: 'Sobreviver à seca por 10 minutos',
                type: 'survival',
                target: 'time',
                current: 0,
                required: 600
            },
            {
                id: 'no_water_shortage',
                description: 'Não deixar a água acabar',
                type: 'avoid',
                target: 'water_shortage',
                current: 0,
                required: 0
            }
        ],
        rewards: {
            score: 300,
            budget: 5000,
            achievement: 'crisis_manager'
        },
        educationalContent: {
            facts: [
                'Secas podem durar meses ou anos, exigindo planejamento a longo prazo.',
                'Racionamento inteligente pode estender reservas por muito mais tempo.'
            ],
            tips: [
                'Implemente medidas de conservação antes da crise.',
                'Diversifique suas fontes de água para maior resiliência.'
            ]
        }
    },

    // ===== MISSÕES SECUNDÁRIAS EDUCACIONAIS =====

    // Ciclo Hidrológico
    edu_hydrological_cycle: {
        title: 'Compreendendo o Ciclo Hidrológico',
        description: 'Aprenda sobre o ciclo da água e sua importância para o ecossistema.',
        type: 'secondary',
        category: 'secondary',
        difficulty: 'beginner',
        estimatedTime: '10 minutos',
        prerequisites: ['tutorial_01'],
        objectives: [
            {
                id: 'observe_evaporation',
                description: 'Observar a evaporação em corpos d\'água por 3 minutos',
                type: 'observation',
                target: 'water_evaporation',
                current: 0,
                required: 180
            },
            {
                id: 'build_rain_garden',
                description: 'Construir um jardim de chuva',
                type: 'build',
                target: 'rain_garden',
                current: 0,
                required: 1
            }
        ],
        rewards: {
            score: 150,
            budget: 1000,
            experience: 75
        },
        educationalContent: {
            concepts: ['ciclo hidrológico', 'evaporação', 'precipitação', 'infiltração'],
            facts: [
                'O ciclo hidrológico é o movimento contínuo da água na Terra.',
                'A evaporação dos oceanos fornece 86% da precipitação global.',
                'Jardins de chuva ajudam na infiltração e reduzem o escoamento superficial.'
            ],
            tips: [
                'Jardins de chuva devem ser posicionados em áreas de drenagem natural.',
                'Use plantas nativas que toleram tanto seca quanto encharcamento.',
                'Mantenha uma profundidade de 15-20cm para máxima eficiência.'
            ]
        }
    },

    // Bacia Hidrográfica
    edu_watershed_management: {
        title: 'Gestão de Bacia Hidrográfica',
        description: 'Entenda como proteger e gerenciar uma bacia hidrográfica urbana.',
        type: 'secondary',
        category: 'secondary',
        difficulty: 'intermediate',
        estimatedTime: '15 minutos',
        prerequisites: ['tutorial_01', 'edu_hydrological_cycle'],
        objectives: [
            {
                id: 'protect_springs',
                description: 'Proteger 2 nascentes com vegetação',
                type: 'build',
                target: 'spring_protection',
                current: 0,
                required: 2
            },
            {
                id: 'create_riparian_forest',
                description: 'Criar mata ciliar ao longo de rios',
                type: 'build',
                target: 'riparian_forest',
                current: 0,
                required: 100 // metros lineares
            },
            {
                id: 'prevent_occupation',
                description: 'Evitar ocupação desordenada em áreas de preservação',
                type: 'management',
                target: 'prevent_illegal_occupation',
                current: 0,
                required: 1
            }
        ],
        rewards: {
            score: 300,
            budget: 5000,
            experience: 150,
            unlock: ['linear_park']
        },
        educationalContent: {
            concepts: ['bacia hidrográfica', 'nascentes', 'mata ciliar', 'APP'],
            facts: [
                'Uma bacia hidrográfica é a área drenada por um rio principal e seus afluentes.',
                'Mata ciliar protege os cursos d\'água da erosão e sedimentação.',
                'APPs (Áreas de Preservação Permanente) são essenciais para a qualidade da água.',
                'Ocupação desordenada pode causar assoreamento e poluição dos rios.'
            ],
            tips: [
                'Mantenha pelo menos 30m de mata ciliar em cada margem do rio.',
                'Use espécies nativas para restauração da mata ciliar.',
                'Implemente fiscalização para evitar ocupações irregulares.',
                'Crie parques lineares para proteger e valorizar os rios urbanos.'
            ]
        }
    },

    // ===== MISSÕES DE GESTÃO DE CRISES =====

    // Contaminação de Água Subterrânea
    crisis_groundwater_contamination: {
        title: 'Crise: Água Subterrânea Contaminada',
        description: 'Responda a uma emergência de contaminação da água subterrânea por nitratos e coliformes fecais.',
        type: 'secondary',
        category: 'secondary',
        difficulty: 'advanced',
        estimatedTime: '20 minutos',
        prerequisites: ['tutorial_01'],
        objectives: [
            {
                id: 'identify_contamination_source',
                description: 'Identificar fonte de contaminação (agrotóxicos/esgoto)',
                type: 'investigation',
                target: 'contamination_source',
                current: 0,
                required: 1
            },
            {
                id: 'build_water_treatment',
                description: 'Construir estação de tratamento de água',
                type: 'build',
                target: 'water_treatment_plant',
                current: 0,
                required: 1
            },
            {
                id: 'implement_monitoring',
                description: 'Implementar monitoramento de qualidade da água',
                type: 'build',
                target: 'water_quality_monitor',
                current: 0,
                required: 3
            }
        ],
        rewards: {
            score: 500,
            budget: 10000,
            experience: 250,
            unlock: ['advanced_water_treatment']
        },
        educationalContent: {
            concepts: ['água subterrânea contaminada', 'nitratos', 'coliformes fecais', 'chorume'],
            facts: [
                'Nitratos em excesso na água podem causar metahemoglobinemia em bebês.',
                'Coliformes fecais indicam contaminação por esgoto e risco de doenças.',
                'Chorume de aterros pode contaminar aquíferos por décadas.',
                'Agrotóxicos podem persistir no solo e contaminar água subterrânea.',
                'Baixo oxigênio dissolvido indica poluição orgânica severa.'
            ],
            tips: [
                'Monitore regularmente a qualidade da água em poços próximos a atividades agrícolas.',
                'Implemente barreiras de proteção ao redor de fontes de água.',
                'Use tecnologias de biorremediação para tratar contaminação orgânica.',
                'Estabeleça zonas de proteção ao redor de poços de abastecimento.'
            ]
        }
    },

    // ===== MISSÕES AMBIENTAIS AVANÇADAS =====

    // Produção Canavieira e Impactos
    env_sugarcane_impact: {
        title: 'Impactos da Produção Canavieira',
        description: 'Gerencie os impactos ambientais da produção de cana-de-açúcar na bacia hidrográfica.',
        type: 'secondary',
        category: 'secondary',
        difficulty: 'expert',
        estimatedTime: '30 minutos',
        prerequisites: ['edu_watershed_management'],
        objectives: [
            {
                id: 'assess_pesticide_impact',
                description: 'Avaliar impacto do uso de agrotóxicos',
                type: 'analysis',
                target: 'pesticide_assessment',
                current: 0,
                required: 1
            },
            {
                id: 'implement_buffer_zones',
                description: 'Criar zonas de amortecimento ao redor de rios',
                type: 'build',
                target: 'buffer_zone',
                current: 0,
                required: 5
            },
            {
                id: 'manage_livestock_waste',
                description: 'Implementar gestão de resíduos da pecuária',
                type: 'build',
                target: 'livestock_waste_management',
                current: 0,
                required: 2
            },
            {
                id: 'prevent_erosion',
                description: 'Implementar medidas contra erosão e assoreamento',
                type: 'build',
                target: 'erosion_control',
                current: 0,
                required: 3
            }
        ],
        rewards: {
            score: 750,
            budget: 15000,
            experience: 400,
            unlock: ['sustainable_agriculture', 'advanced_erosion_control']
        },
        educationalContent: {
            concepts: ['produção canavieira', 'uso de agrotóxicos', 'pecuária', 'erosão', 'assoreamento', 'sedimentação'],
            facts: [
                'A cana-de-açúcar é uma das culturas que mais consome água no Brasil.',
                'Agrotóxicos podem contaminar águas superficiais e subterrâneas.',
                'Pecuária intensiva pode causar compactação do solo e erosão.',
                'Erosão causa perda de solo fértil e assoreamento de rios.',
                'Sedimentação reduz a capacidade de armazenamento de reservatórios.',
                'Zonas de amortecimento reduzem em até 90% a chegada de poluentes aos rios.'
            ],
            tips: [
                'Mantenha pelo menos 50m de vegetação entre cultivos e corpos d\'água.',
                'Use práticas de agricultura sustentável para reduzir uso de agrotóxicos.',
                'Implemente sistemas de rotação de pastagens para evitar degradação.',
                'Construa terraços e curvas de nível para controlar erosão.',
                'Monitore a turbidez da água como indicador de sedimentação.'
            ]
        }
    },

    // ===== MISSÕES DE INFRAESTRUTURA VERDE =====

    // Soluções Baseadas na Natureza
    green_infrastructure: {
        title: 'Infraestrutura Verde Urbana',
        description: 'Implemente soluções baseadas na natureza para gestão sustentável da água urbana.',
        type: 'primary',
        category: 'primary',
        difficulty: 'intermediate',
        estimatedTime: '25 minutos',
        prerequisites: ['edu_hydrological_cycle'],
        objectives: [
            {
                id: 'create_linear_park',
                description: 'Criar parque linear em contato com o rio',
                type: 'build',
                target: 'linear_park',
                current: 0,
                required: 1
            },
            {
                id: 'install_green_roofs',
                description: 'Instalar tetos verdes em edifícios públicos',
                type: 'build',
                target: 'green_roof',
                current: 0,
                required: 5
            },
            {
                id: 'build_green_walls',
                description: 'Construir paredes verdes para purificação do ar',
                type: 'build',
                target: 'green_wall',
                current: 0,
                required: 3
            },
            {
                id: 'create_floating_gardens',
                description: 'Instalar jardins flutuantes com plantas filtradoras',
                type: 'build',
                target: 'floating_garden',
                current: 0,
                required: 2
            },
            {
                id: 'prevent_disorderly_occupation',
                description: 'Prevenir ocupação desordenada em áreas de bacia',
                type: 'management',
                target: 'occupation_control',
                current: 0,
                required: 1
            }
        ],
        rewards: {
            score: 600,
            budget: 20000,
            experience: 300,
            unlock: ['advanced_green_infrastructure', 'urban_ecology']
        },
        educationalContent: {
            concepts: ['parque linear', 'jardim de chuva', 'tetos verdes', 'paredes verdes', 'jardins flutuantes', 'ocupação desordenada'],
            facts: [
                'Parques lineares protegem rios urbanos e oferecem lazer à população.',
                'Tetos verdes podem reduzir em até 50% o escoamento superficial.',
                'Paredes verdes melhoram a qualidade do ar e reduzem temperatura urbana.',
                'Jardins flutuantes com plantas filtradoras purificam a água naturalmente.',
                'Ocupação desordenada em bacias hidrográficas aumenta risco de enchentes.',
                'Infraestrutura verde custa 50% menos que soluções convencionais.'
            ],
            tips: [
                'Use plantas nativas em projetos de infraestrutura verde.',
                'Integre parques lineares com ciclovias e transporte público.',
                'Escolha plantas com alta capacidade de filtração para jardins flutuantes.',
                'Implemente zoneamento rigoroso para proteger áreas de bacia.',
                'Combine múltiplas soluções verdes para máxima eficiência.'
            ]
        }
    },

    // ===== MISSÃO DE PESQUISA E DESENVOLVIMENTO =====

    // Centro de Pesquisas Hídricas
    research_center_mission: {
        title: 'Centro de Pesquisas Hídricas',
        description: 'Estabeleça um centro de pesquisas para desenvolver tecnologias inovadoras de gestão hídrica.',
        type: 'primary',
        category: 'primary',
        difficulty: 'expert',
        estimatedTime: '40 minutos',
        prerequisites: ['crisis_groundwater_contamination', 'green_infrastructure'],
        objectives: [
            {
                id: 'build_research_center',
                description: 'Construir Centro de Pesquisas Hídricas',
                type: 'build',
                target: 'water_research_center',
                current: 0,
                required: 1
            },
            {
                id: 'develop_monitoring_network',
                description: 'Desenvolver rede de monitoramento da bacia',
                type: 'build',
                target: 'monitoring_station',
                current: 0,
                required: 10
            },
            {
                id: 'research_new_technologies',
                description: 'Pesquisar tecnologias de tratamento avançado',
                type: 'research',
                target: 'advanced_treatment_tech',
                current: 0,
                required: 3
            },
            {
                id: 'educate_community',
                description: 'Educar comunidade sobre proteção hídrica',
                type: 'education',
                target: 'community_education',
                current: 0,
                required: 1000 // pessoas educadas
            }
        ],
        rewards: {
            score: 1000,
            budget: 50000,
            experience: 500,
            unlock: ['master_water_guardian']
        },
        educationalContent: {
            concepts: ['centros de pesquisas', 'monitoramento ambiental', 'tecnologias hídricas', 'educação ambiental'],
            facts: [
                'Centros de pesquisa são fundamentais para inovação em gestão hídrica.',
                'Monitoramento contínuo permite detecção precoce de problemas.',
                'Tecnologias avançadas podem tratar até 99% dos contaminantes.',
                'Educação ambiental é a base para mudanças comportamentais duradouras.',
                'Pesquisa aplicada gera soluções específicas para cada região.'
            ],
            tips: [
                'Integre universidades e institutos de pesquisa ao projeto.',
                'Use sensores IoT para monitoramento em tempo real.',
                'Desenvolva tecnologias adaptadas às condições locais.',
                'Crie programas educacionais para diferentes faixas etárias.',
                'Compartilhe resultados de pesquisa com outras cidades.'
            ]
        }
    },

    // ===== MISSÕES APRIMORADAS (cadeias, escolhas, consequências) =====
    // ===== STORY MISSION CHAIN: "A NOVA GESTORA" =====
    story_chain_01_01: {
        title: 'A Nova Gestora - Parte 1: Primeiro Dia',
        description: 'Você foi nomeada a nova gestora de recursos hídricos da cidade. Conheça a situação atual e tome suas primeiras decisões.',
        type: 'story',
        category: 'secondary',
        difficulty: 'beginner',
        estimatedTime: '8 minutos',
        chainId: 'nova_gestora',
        chainPosition: 1,
        urgency: 'normal',
        missionIcon: '👩‍💼',
        stakeholders: ['citizens', 'government'],
        scalingRewards: true,
        objectives: [
            {
                id: 'inspect_infrastructure',
                description: 'Inspecionar a infraestrutura existente (construir 1 estação de monitoramento)',
                type: 'build',
                target: 'monitoring_station',
                current: 0,
                required: 1
            },
            {
                id: 'meet_citizens',
                description: 'Conhecer as necessidades dos cidadãos (manter satisfação acima de 60%)',
                type: 'resource',
                target: 'satisfaction',
                current: 0,
                required: 60,
                comparison: 'greater'
            }
        ],
        choices: [
            {
                id: 'management_style',
                question: 'Qual será seu estilo de gestão?',
                options: [
                    {
                        text: 'Priorizar eficiência e resultados rápidos',
                        consequences: { reputation: { business: 5, citizens: -2 } }
                    },
                    {
                        text: 'Focar em participação cidadã e transparência',
                        consequences: { reputation: { citizens: 5, government: -2 } }
                    },
                    {
                        text: 'Equilibrar todas as necessidades',
                        consequences: { reputation: { citizens: 2, business: 2, government: 2 } }
                    }
                ]
            }
        ],
        rewards: {
            score: 150,
            budget: 3000,
            experience: 75,
            reputation: { government: 3 }
        }
    },

    story_chain_01_02: {
        title: 'A Nova Gestora - Parte 2: Primeira Crise',
        description: 'Um vazamento foi detectado na rede principal. Como você lidará com esta primeira emergência?',
        type: 'story',
        category: 'secondary',
        difficulty: 'intermediate',
        estimatedTime: '12 minutos',
        chainId: 'nova_gestora',
        chainPosition: 2,
        urgency: 'high',
        timeLimit: 900, // 15 minutos
        missionIcon: '🚨',
        stakeholders: ['citizens', 'environment'],
        scalingRewards: true,
        status: 'locked', // Unlocked when previous mission completes
        objectives: [
            {
                id: 'emergency_response',
                description: 'Responder à emergência (construir 1 estação de reparo)',
                type: 'build',
                target: 'repair_station',
                current: 0,
                required: 1
            },
            {
                id: 'minimize_waste',
                description: 'Minimizar desperdício de água (manter eficiência acima de 75%)',
                type: 'resource',
                target: 'water_efficiency',
                current: 0,
                required: 75,
                comparison: 'greater'
            },
            {
                id: 'public_communication',
                description: 'Comunicar-se com o público (manter satisfação acima de 50% durante a crise)',
                type: 'sustained',
                target: 'satisfaction',
                current: 0,
                required: 300, // 5 minutos
                threshold: 50
            }
        ],
        choices: [
            {
                id: 'crisis_approach',
                question: 'Como você abordará esta crise?',
                options: [
                    {
                        text: 'Reparo rápido, mesmo com custos altos',
                        consequences: {
                            budget: -2000,
                            reputation: { citizens: 5, business: -3 }
                        }
                    },
                    {
                        text: 'Solução econômica, mas mais demorada',
                        consequences: {
                            timeLimit: 1200,
                            reputation: { business: 3, citizens: -2 }
                        }
                    },
                    {
                        text: 'Buscar ajuda de especialistas externos',
                        consequences: {
                            budget: -1000,
                            reputation: { government: 2, environment: 3 }
                        }
                    }
                ]
            }
        ],
        rewards: {
            score: 250,
            budget: 4000,
            experience: 100,
            reputation: { citizens: 5 },
            performanceUnlocks: ['advanced_monitoring']
        }
    },

    // ===== SEASONAL EVENT: DIA MUNDIAL DA ÁGUA =====
    seasonal_water_day: {
        title: '💧 Dia Mundial da Água - Campanha Especial',
        description: 'Organize uma campanha especial para o Dia Mundial da Água. Eduque a população e promova a conservação.',
        type: 'seasonal',
        category: 'secondary',
        difficulty: 'intermediate',
        estimatedTime: '20 minutos',
        urgency: 'normal',
        timeWindowMs: 7 * 24 * 60 * 60 * 1000, // janela de 7 dias a partir do início do jogo
        missionIcon: '🌍',
        stakeholders: ['citizens', 'environment'],
        scalingRewards: true,
        objectives: [
            {
                id: 'education_campaign',
                description: 'Construir 3 centros educacionais',
                type: 'build',
                target: 'education_center',
                current: 0,
                required: 3
            },
            {
                id: 'water_conservation',
                description: 'Reduzir consumo per capita em 15%',
                type: 'resource',
                target: 'water_consumption_reduction',
                current: 0,
                required: 15,
                comparison: 'greater'
            },
            {
                id: 'community_engagement',
                description: 'Alcançar 85% de satisfação cidadã',
                type: 'resource',
                target: 'satisfaction',
                current: 0,
                required: 85,
                comparison: 'greater'
            }
        ],
        dynamicObjectives: [
            {
                id: 'bonus_recycling',
                description: 'BÔNUS: Implementar sistema de reciclagem de água',
                type: 'build',
                target: 'water_recycling_plant',
                current: 0,
                required: 1,
                unlockCondition: 'satisfaction >= 80'
            }
        ],
        rewards: {
            score: 400,
            budget: 6000,
            experience: 150,
            achievement: 'water_day_champion',
            reputation: { citizens: 8, environment: 10 },
            unlock: ['advanced_filtration'],
            performanceUnlocks: ['smart_meters', 'leak_detection_ai']
        }
    },

    // ===== EMERGENCY MISSION: CONTAMINAÇÃO =====
    emergency_contamination: {
        title: '☣️ EMERGÊNCIA: Contaminação Detectada',
        description: 'Contaminação química foi detectada no reservatório principal. Ação imediata necessária para proteger a saúde pública!',
        type: 'emergency',
        category: 'secondary',
        difficulty: 'expert',
        estimatedTime: '10 minutos',
        urgency: 'critical',
        timeLimit: 600, // 10 minutos
        missionIcon: '☣️',
        stakeholders: ['citizens', 'environment', 'government'],
        scalingRewards: true,
        objectives: [
            {
                id: 'isolate_contamination',
                description: 'URGENTE: Isolar fonte de contaminação (construir 2 estações de isolamento)',
                type: 'build',
                target: 'isolation_station',
                current: 0,
                required: 2
            },
            {
                id: 'alternative_supply',
                description: 'Estabelecer fornecimento alternativo (construir 3 pontos de distribuição)',
                type: 'build',
                target: 'distribution_point',
                current: 0,
                required: 3
            },
            {
                id: 'public_safety',
                description: 'Manter segurança pública (satisfação não pode cair abaixo de 30%)',
                type: 'avoid',
                target: 'satisfaction_critical',
                current: 0,
                required: 30,
                comparison: 'greater'
            }
        ],
        choices: [
            {
                id: 'contamination_response',
                question: 'Estratégia de resposta à contaminação:',
                options: [
                    {
                        text: 'Evacuação preventiva da área afetada',
                        consequences: {
                            reputation: { citizens: 8, government: 5 },
                            budget: -5000
                        }
                    },
                    {
                        text: 'Tratamento in-loco com tecnologia avançada',
                        consequences: {
                            reputation: { environment: 8, business: 3 },
                            budget: -3000
                        }
                    },
                    {
                        text: 'Coordenação com autoridades estaduais',
                        consequences: {
                            reputation: { government: 10 },
                            timeLimit: 900 // Mais tempo disponível
                        }
                    }
                ]
            }
        ],
        rewards: {
            score: 500,
            budget: 8000,
            experience: 200,
            achievement: 'crisis_hero',
            reputation: { citizens: 10, environment: 8, government: 6 },
            unlock: ['contamination_detector', 'emergency_protocol'],
            performanceUnlocks: ['rapid_response_team', 'advanced_treatment']
        },
        consequences: {
            failure: {
                reputation: { citizens: -15, environment: -10, government: -8 },
                budget: -10000,
                unlockMission: 'recovery_contamination'
            }
        }
    },
};
