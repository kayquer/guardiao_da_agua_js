/**
 * GUARDIÃO DA ÁGUA - QUEST SYSTEM
 * Sistema de missões educacionais e progressão
 */

class QuestSystem {
    constructor(gameManager) {
        console.log('🎯 Inicializando QuestSystem...');
        
        this.gameManager = gameManager;
        
        // Missões
        this.quests = new Map();
        this.activeQuests = new Set();
        this.completedQuests = new Set();
        this.currentMainQuest = null;
        
        // Progresso
        this.questCounter = 0;
        this.totalScore = 0;
        this.achievements = new Set();

        // Configurações
        this.maxActiveQuests = 3;

        // ===== SIMPLIFIED MISSION CATEGORIES - ONLY 2 PRIMARY CATEGORIES =====
        this.missionCategories = {
            primary: {
                name: 'Missões Primárias',
                description: 'Atividades essenciais para o progresso do jogo',
                icon: '🎯',
                color: '#00ff88'
            },
            secondary: {
                name: 'Missões Secundárias',
                description: 'Conteúdo educacional opcional e desafios extras',
                icon: '📚',
                color: '#4a9eff'
            }
        };

        // ===== SIMPLIFIED MISSION INTERFACE =====
        // Note: Old detailed categories have been simplified to just 'primary' and 'secondary'
        // for better user experience and reduced complexity

        this.missionUI = {
            isOpen: false,
            currentCategory: 'primary',
            selectedMission: null
        };

        this.initializeQuests();
        
        console.log('✅ QuestSystem inicializado');

        // ===== GLOBAL DEBUG FUNCTIONS =====
        if (typeof window !== 'undefined') {
            window.validateMission = (missionId) => this.validateMissionCompletion(missionId);
            window.forceCompleteMission = (missionId) => this.forceCompleteMission(missionId);
            window.listActiveMissions = () => {
                console.log('🎯 Active Missions:');
                this.activeQuests.forEach(questId => {
                    const quest = this.quests.get(questId);
                    if (quest) {
                        console.log(`  - ${quest.title} (${questId}): ${Math.round(quest.progress * 100)}%`);
                    }
                });
            };
            window.listAllMissions = () => {
                console.log('📋 All Missions:');
                this.quests.forEach((quest, questId) => {
                    const status = this.completedQuests.has(questId) ? 'Completed' :
                                  this.activeQuests.has(questId) ? 'Active' : 'Available';
                    console.log(`  - ${quest.title} (${questId}): ${status}`);
                });
            };
            console.log('🧪 Mission debug functions available: validateMission(), forceCompleteMission(), listActiveMissions(), listAllMissions()');
        }
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeQuests() {
        console.log('🎯 Definindo missões educacionais...');
        
        // ===== MISSÕES PRINCIPAIS (PRIMARY) =====
        this.addQuest('tutorial_01', {
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
        });
        
        this.addQuest('tutorial_02', {
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
        });
        
        this.addQuest('tutorial_03', {
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
        });
        
        // MISSÕES PRINCIPAIS
        this.addQuest('main_01', {
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
        });
        
        // MISSÕES DE DESAFIO
        this.addQuest('challenge_01', {
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
        });
        
        // ===== MISSÕES SECUNDÁRIAS EDUCACIONAIS =====

        // Ciclo Hidrológico
        this.addQuest('edu_hydrological_cycle', {
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
        });

        // Bacia Hidrográfica
        this.addQuest('edu_watershed_management', {
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
        });

        // ===== MISSÕES DE GESTÃO DE CRISES =====

        // Contaminação de Água Subterrânea
        this.addQuest('crisis_groundwater_contamination', {
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
        });

        // ===== MISSÕES AMBIENTAIS AVANÇADAS =====

        // Produção Canavieira e Impactos
        this.addQuest('env_sugarcane_impact', {
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
        });

        // ===== MISSÕES DE INFRAESTRUTURA VERDE =====

        // Soluções Baseadas na Natureza
        this.addQuest('green_infrastructure', {
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
        });

        // ===== MISSÃO DE PESQUISA E DESENVOLVIMENTO =====

        // Centro de Pesquisas Hídricas
        this.addQuest('research_center_mission', {
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
        });

        // ===== ENHANCED MISSIONS =====
        this.addEnhancedMissions();

        console.log(`✅ ${this.quests.size} missões definidas (incluindo missões aprimoradas)`);
    }

    addEnhancedMissions() {
        // ===== STORY MISSION CHAIN: "A NOVA GESTORA" =====
        this.addQuest('story_chain_01_01', {
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
        });

        this.addQuest('story_chain_01_02', {
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
        });

        // ===== SEASONAL EVENT: DIA MUNDIAL DA ÁGUA =====
        this.addQuest('seasonal_water_day', {
            title: '💧 Dia Mundial da Água - Campanha Especial',
            description: 'Organize uma campanha especial para o Dia Mundial da Água. Eduque a população e promova a conservação.',
            type: 'seasonal',
            category: 'secondary',
            difficulty: 'intermediate',
            estimatedTime: '20 minutos',
            urgency: 'normal',
            timeWindow: { start: Date.now(), end: Date.now() + (7 * 24 * 60 * 60 * 1000) }, // 7 days
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
        });

        // ===== EMERGENCY MISSION: CONTAMINAÇÃO =====
        this.addQuest('emergency_contamination', {
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
        });
    }
    
    addQuest(id, config) {
        const quest = {
            id,
            ...config,
            status: 'available',
            startTime: null,
            completionTime: null,
            progress: 0,

            // ===== ENHANCED MISSION PROPERTIES =====
            urgency: config.urgency || 'normal',           // low, normal, high, critical
            chainId: config.chainId || null,               // Mission chain identifier
            chainPosition: config.chainPosition || 0,      // Position in chain
            timeWindow: config.timeWindow || null,          // Time window to start mission
            choices: config.choices || [],                 // Interactive choices
            consequences: config.consequences || {},        // Results of choices
            dynamicObjectives: config.dynamicObjectives || [], // Conditional objectives
            scalingRewards: config.scalingRewards || false,    // Performance-based rewards
            missionIcon: config.missionIcon || '🎯',       // Visual icon
            stakeholders: config.stakeholders || [],       // Affected reputation groups
            unlockConditions: config.unlockConditions || {}, // Special unlock requirements
        };

        this.quests.set(id, quest);

        // ===== AUTO-ACTIVATION: Automatically activate missions when they become available =====
        // Check if mission can be auto-activated (prerequisites met, not exceeding max active)
        setTimeout(() => {
            if (this.canStartMission(id)) {
                this.startQuest(id);
                console.log(`🎯 Mission auto-activated: ${quest.title}`);
            }
        }, 100); // Small delay to ensure game is fully initialized
    }


    
    // ===== CONTROLE DE MISSÕES =====
    startFirstQuest() {
        this.startQuest('tutorial_01');
    }
    
    startQuest(questId) {
        const quest = this.quests.get(questId);
        if (!quest) {
            console.error(`❌ Missão não encontrada: ${questId}`);
            return false;
        }
        
        if (quest.status !== 'available') {
            console.warn(`⚠️ Missão não disponível: ${questId}`);
            return false;
        }
        
        // Verificar limite de missões ativas
        if (this.activeQuests.size >= this.maxActiveQuests && quest.type !== 'tutorial') {
            console.warn('⚠️ Muitas missões ativas');
            return false;
        }
        
        // Iniciar missão
        quest.status = 'active';
        quest.startTime = Date.now();
        this.activeQuests.add(questId);
        
        // Definir como missão principal se for tutorial ou main
        if (quest.type === 'tutorial' || quest.type === 'main') {
            this.currentMainQuest = questId;
        }
        
        // Mostrar na UI
        this.updateQuestUI();
        
        // Notificar
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `Nova missão: ${quest.title}`,
                'info'
            );
        }
        
        console.log(`🎯 Missão iniciada: ${quest.title}`);
        return true;
    }
    
    completeQuest(questId) {
        const quest = this.quests.get(questId);
        if (!quest || quest.status !== 'active') return false;

        // Marcar como completa
        quest.status = 'completed';
        quest.completionTime = Date.now();
        this.activeQuests.delete(questId);
        this.completedQuests.add(questId);

        // ===== ENHANCED COMPLETION SYSTEM =====

        // Calculate performance-based rewards
        const performanceMultiplier = this.calculatePerformanceMultiplier(quest);

        // Aplicar recompensas (with scaling if enabled)
        this.applyQuestRewards(quest, performanceMultiplier);

        this.checkUnlockConditions();

        // Atualizar UI
        this.updateQuestUI();

        // Enhanced notification with performance feedback
        if (this.gameManager.uiManager) {
            const performanceText = performanceMultiplier > 1 ?
                ` (Desempenho Excelente! +${Math.round((performanceMultiplier - 1) * 100)}% bônus)` : '';

            this.gameManager.uiManager.showNotification(
                `Missão completa: ${quest.title}${performanceText}`,
                'success',
                5000
            );
        }

        // ===== ENHANCED MISSION COMPLETION AUDIO FEEDBACK =====
        this.playMissionCompletionAudio(quest, performanceMultiplier);

        console.log(`✅ Missão completa: ${quest.title} (Performance: ${performanceMultiplier.toFixed(2)}x)`);
        return true;
    }



    calculatePerformanceMultiplier(quest) {
        if (!quest.scalingRewards) return 1.0;

        let multiplier = 1.0;
        const completionTime = quest.completionTime - quest.startTime;

        // Time bonus (faster completion = higher multiplier)
        if (quest.estimatedTime) {
            const estimatedMs = this.parseTimeToMs(quest.estimatedTime);
            if (completionTime < estimatedMs * 0.8) {
                multiplier += 0.3; // 30% bonus for fast completion
            } else if (completionTime < estimatedMs) {
                multiplier += 0.1; // 10% bonus for on-time completion
            }
        }

        // Objective completion bonus
        const perfectCompletion = quest.objectives.every(obj => obj.current >= obj.required);
        if (perfectCompletion) {
            multiplier += 0.2; // 20% bonus for perfect completion
        }

        return Math.min(multiplier, 2.0); // Cap at 2x multiplier
    }

    parseTimeToMs(timeString) {
        // Convert "5 minutos" to milliseconds
        const match = timeString.match(/(\d+)\s*(minuto|hora)/);
        if (!match) return 300000; // Default 5 minutes

        const value = parseInt(match[1]);
        const unit = match[2];

        if (unit.startsWith('minuto')) {
            return value * 60 * 1000;
        } else if (unit.startsWith('hora')) {
            return value * 60 * 60 * 1000;
        }

        return 300000; // Default 5 minutes
    }
    
    // ===== ENHANCED UPDATE SYSTEM =====
    update(deltaTime) {
        // Atualizar progresso das missões ativas
        this.activeQuests.forEach(questId => {
            this.updateQuestProgress(questId, deltaTime);
        });

        // ===== NEW UPDATE FEATURES =====

        // Check time window missions
        this.checkTimeWindowMissions();

        // Update urgent mission indicators
        this.updateUrgencyIndicators();

        // Process dynamic objectives
        this.processDynamicObjectives();

        // Check for automatic choice triggers
        this.checkChoiceTriggers();
    }

    updateUrgencyIndicators() {
        // Update UI indicators for urgent missions
        const urgentMissions = this.getMissionsByUrgency('critical').concat(
            this.getMissionsByUrgency('high')
        );

        if (urgentMissions.length > 0 && this.gameManager.uiManager) {
            // TODO: Add pulsing urgency indicator to UI
        }
    }

    processDynamicObjectives() {
        this.activeQuests.forEach(questId => {
            const quest = this.quests.get(questId);
            if (!quest || !quest.dynamicObjectives) return;

            quest.dynamicObjectives.forEach(dynObj => {
                if (!dynObj.activated && this.checkUnlockCondition(dynObj.unlockCondition)) {
                    // Activate dynamic objective
                    dynObj.activated = true;
                    quest.objectives.push(dynObj);

                    if (this.gameManager.uiManager) {
                        this.gameManager.uiManager.showNotification(
                            `🎯 Novo objetivo: ${dynObj.description}`,
                            'info',
                            5000
                        );
                    }

                    console.log(`🎯 Objetivo dinâmico ativado: ${dynObj.description}`);
                }
            });
        });
    }

    checkUnlockCondition(condition) {
        if (!condition) return true;

        // Parse condition string (e.g., "satisfaction >= 80")
        const match = condition.match(/(\w+)\s*(>=|<=|>|<|==)\s*(\d+)/);
        if (!match) return false;

        const [, resource, operator, value] = match;
        const currentValue = this.getResourceValue(resource);
        const targetValue = parseInt(value);

        switch (operator) {
            case '>=': return currentValue >= targetValue;
            case '<=': return currentValue <= targetValue;
            case '>': return currentValue > targetValue;
            case '<': return currentValue < targetValue;
            case '==': return currentValue === targetValue;
            default: return false;
        }
    }

    getResourceValue(resourceName) {
        const resourceManager = this.gameManager.resourceManager;
        if (!resourceManager) return 0;

        switch (resourceName) {
            case 'satisfaction':
                return resourceManager.resources.satisfaction?.current || 0;
            case 'population':
                return resourceManager.resources.population?.current || 0;
            case 'pollution':
                return resourceManager.resources.pollution?.current || 0;
            case 'budget':
                return resourceManager.resources.budget?.current || 0;
            case 'water':
                return resourceManager.resources.water?.current || 0;
            default:
                return 0;
        }
    }

    checkChoiceTriggers() {
        this.activeQuests.forEach(questId => {
            const quest = this.quests.get(questId);
            if (!quest || !quest.choices) return;

            quest.choices.forEach(choice => {
                if (choice.autoTrigger && this.checkUnlockCondition(choice.autoTrigger)) {
                    this.presentChoice(questId, choice.id);
                }
            });
        });
    }
    
    updateQuestProgress(questId, deltaTime) {
        const quest = this.quests.get(questId);
        if (!quest || quest.status !== 'active') return;
        
        let allObjectivesComplete = true;
        let totalProgress = 0;
        
        quest.objectives.forEach(objective => {
            const progress = this.checkObjectiveProgress(objective);
            objective.current = progress;
            
            const objectiveProgress = Math.min(progress / objective.required, 1);
            totalProgress += objectiveProgress;
            
            if (objectiveProgress < 1) {
                allObjectivesComplete = false;
            }
        });
        
        // Calcular progresso total
        const oldProgress = quest.progress;
        quest.progress = totalProgress / quest.objectives.length;

        // Update UI if progress changed
        if (Math.abs(oldProgress - quest.progress) > 0.01) {
            this.updateQuestUI();
        }

        // Verificar limite de tempo
        if (quest.timeLimit) {
            const elapsed = (Date.now() - quest.startTime) / 1000;
            if (elapsed >= quest.timeLimit) {
                this.failQuest(questId);
                return;
            }
        }

        // Verificar conclusão
        if (allObjectivesComplete) {
            this.completeQuest(questId);
        }
    }
    
    checkObjectiveProgress(objective) {
        const resourceManager = this.gameManager.resourceManager;
        const buildingSystem = this.gameManager.buildingSystem;
        
        switch (objective.type) {
            case 'build':
                if (buildingSystem) {
                    return buildingSystem.getBuildingsByType(objective.target).length;
                }
                break;
                
            case 'resource':
                if (resourceManager) {
                    const resources = resourceManager.getAllResources();
                    const value = this.getResourceValue(resources, objective.target);
                    
                    if (objective.comparison === 'greater') {
                        return value >= objective.required ? objective.required : value;
                    } else if (objective.comparison === 'less') {
                        return value <= objective.required ? objective.required : value;
                    } else {
                        return value;
                    }
                }
                break;
                
            case 'sustained':
                if (resourceManager) {
                    const resources = resourceManager.getAllResources();
                    const value = this.getResourceValue(resources, objective.target);
                    
                    if (value >= objective.threshold) {
                        objective.sustainedTime = (objective.sustainedTime || 0) + 1;
                        return objective.sustainedTime;
                    } else {
                        objective.sustainedTime = 0;
                        return 0;
                    }
                }
                break;
                
            case 'survival':
                const elapsed = (Date.now() - this.quests.get(objective.questId)?.startTime || 0) / 1000;
                return Math.min(elapsed, objective.required);
                
            case 'avoid':
                // Implementar lógica de evitar eventos
                return 0;
        }
        
        return 0;
    }
    
    getResourceValue(resources, target) {
        switch (target) {
            case 'water': return resources.water.current;
            case 'pollution': return resources.pollution.current;
            case 'population': return resources.population.current;
            case 'satisfaction': return resources.population.satisfaction;
            case 'budget': return resources.budget.current;
            default: return 0;
        }
    }
    
    // ===== ENHANCED REWARDS SYSTEM =====
    applyQuestRewards(quest, performanceMultiplier = 1.0) {
        if (!quest.rewards) return;

        const resourceManager = this.gameManager.resourceManager;
        const buildingSystem = this.gameManager.buildingSystem;

        // Pontuação (with performance scaling)
        if (quest.rewards.score) {
            const scaledScore = Math.round(quest.rewards.score * performanceMultiplier);
            this.totalScore += scaledScore;

            if (performanceMultiplier > 1) {
                console.log(`🎯 Pontuação com bônus: ${scaledScore} (${quest.rewards.score} base + ${Math.round((performanceMultiplier - 1) * quest.rewards.score)} bônus)`);
            }
        }

        // Orçamento (with performance scaling)
        if (quest.rewards.budget && resourceManager) {
            const scaledBudget = Math.round(quest.rewards.budget * performanceMultiplier);
            resourceManager.resources.budget.current += scaledBudget;

            if (performanceMultiplier > 1) {
                console.log(`💰 Orçamento com bônus: ${scaledBudget}`);
            }
        }

        // Desbloqueios
        if (quest.rewards.unlock) {
            quest.rewards.unlock.forEach(buildingTypeId => {
                const buildingType = buildingSystem?.buildingTypes.get(buildingTypeId);
                if (buildingType) {
                    buildingType.unlocked = true;
                    console.log(`🔓 Desbloqueado: ${buildingType.name}`);
                }
            });
        }

        // Conquistas
        if (quest.rewards.achievement) {
            this.unlockAchievement(quest.rewards.achievement);
        }

        // ===== NEW REWARD TYPES =====

        // Experience points
        if (quest.rewards.experience) {
            const scaledExp = Math.round(quest.rewards.experience * performanceMultiplier);
            // TODO: Implement experience system
            console.log(`⭐ Experiência ganha: ${scaledExp}`);
        }



        // Special unlocks based on performance
        if (quest.rewards.performanceUnlocks && performanceMultiplier >= 1.5) {
            quest.rewards.performanceUnlocks.forEach(unlock => {
                console.log(`🌟 Desbloqueio especial por desempenho: ${unlock}`);
                // TODO: Implement special unlocks
            });
        }
    }



    // ===== INTERACTIVE CHOICE SYSTEM =====
    presentChoice(questId, choiceId) {
        const quest = this.quests.get(questId);
        if (!quest || quest.status !== 'active') return;

        const choice = quest.choices.find(c => c.id === choiceId);
        if (!choice) return;

        // Show choice dialog
        this.showChoiceDialog(quest, choice);
    }

    showChoiceDialog(quest, choice) {
        if (!this.gameManager.uiManager) return;

        const dialogContent = `
            <div class="choice-dialog">
                <div class="choice-header">
                    <h3>${quest.title}</h3>
                    <p class="choice-question">${choice.question}</p>
                </div>
                <div class="choice-options">
                    ${choice.options.map((option, index) => `
                        <button class="choice-option"
                                onclick="window.gameManager.questSystem.makeChoice('${quest.id}', '${choice.id}', ${index})">
                            ${option.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // TODO: Implement choice dialog UI
        console.log('Choice Dialog:', dialogContent);
    }

    makeChoice(questId, choiceId, optionIndex) {
        const quest = this.quests.get(questId);
        if (!quest) return;

        const choice = quest.choices.find(c => c.id === choiceId);
        if (!choice || !choice.options[optionIndex]) return;

        const selectedOption = choice.options[optionIndex];

        this.applyChoiceConsequences(selectedOption.consequences);

        quest.choices = quest.choices.filter(c => c.id !== choiceId);

        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `Decisão tomada: ${selectedOption.text}`,
                'info',
                4000
            );
        }

        console.log(`🎯 Escolha feita: ${selectedOption.text}`);
    }

    applyChoiceConsequences(consequences) {
        if (!consequences) return;

        if (consequences.budget && this.gameManager.resourceManager) {
            this.gameManager.resourceManager.resources.budget.current += consequences.budget;

            if (consequences.budget !== 0) {
                const type = consequences.budget > 0 ? 'Ganho' : 'Gasto';
                const amount = Math.abs(consequences.budget);
                console.log(`💰 ${type} de orçamento: ${amount}`);
            }
        }

        if (consequences.timeLimit) {
            console.log(`⏰ Limite de tempo alterado: ${consequences.timeLimit}s`);
        }
    }

    // ===== ENHANCED MISSION MANAGEMENT =====
    getAvailableChoices(questId) {
        const quest = this.quests.get(questId);
        return quest?.choices || [];
    }

    getMissionsByUrgency(urgencyLevel) {
        return Array.from(this.quests.values()).filter(quest =>
            quest.urgency === urgencyLevel && quest.status === 'active'
        );
    }

    getActiveEmergencies() {
        return this.getMissionsByUrgency('critical').concat(
            this.getMissionsByUrgency('high')
        );
    }

    checkTimeWindowMissions() {
        const now = Date.now();

        this.quests.forEach(quest => {
            if (quest.timeWindow && quest.status === 'available') {
                if (now > quest.timeWindow.end) {
                    // Mission expired
                    quest.status = 'expired';
                    console.log(`⏰ Missão expirou: ${quest.title}`);

                    if (this.gameManager.uiManager) {
                        this.gameManager.uiManager.showNotification(
                            `⏰ Missão expirou: ${quest.title}`,
                            'warning',
                            5000
                        );
                    }
                }
            }
        });
    }
    
    unlockAchievement(achievementId) {
        if (!this.achievements.has(achievementId)) {
            this.achievements.add(achievementId);
            
            if (this.gameManager.uiManager) {
                this.gameManager.uiManager.showNotification(
                    `🏆 Conquista desbloqueada: ${achievementId}`,
                    'success',
                    8000
                );
            }
            
            console.log(`🏆 Conquista desbloqueada: ${achievementId}`);
        }
    }
    
    // ===== CONDIÇÕES DE DESBLOQUEIO =====
    checkUnlockConditions() {
        // Verificar se novas missões devem ser desbloqueadas
        if (this.completedQuests.has('tutorial_01') && !this.activeQuests.has('tutorial_02')) {
            this.startQuest('tutorial_02');
        }
        
        if (this.completedQuests.has('tutorial_02') && !this.activeQuests.has('tutorial_03')) {
            this.startQuest('tutorial_03');
        }
        
        if (this.completedQuests.has('tutorial_03') && !this.activeQuests.has('main_01')) {
            this.startQuest('main_01');
        }
    }
    
    // ===== FALHA DE MISSÃO =====
    failQuest(questId) {
        const quest = this.quests.get(questId);
        if (!quest) return;
        
        quest.status = 'failed';
        this.activeQuests.delete(questId);
        
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `Missão falhou: ${quest.title}`,
                'error'
            );
        }
        
        console.log(`❌ Missão falhou: ${quest.title}`);
    }
    
    // ===== ENHANCED MISSION MANAGEMENT UI =====

    /**
     * Opens the comprehensive mission management interface
     */
    openMissionInterface() {
        this.missionUI.isOpen = true;
        this.renderMissionInterface();

        // Show mission panel in details area
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showMissionPanel();
        }
    }

    /**
     * Closes the mission management interface
     */
    closeMissionInterface() {
        this.missionUI.isOpen = false;

        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.closeMissionPanel();
        }
    }

    /**
     * Renders the complete mission interface
     */
    renderMissionInterface() {
        const detailsContent = document.getElementById('details-content');
        if (!detailsContent) return;

        const categories = Object.keys(this.missionCategories);
        const currentCategory = this.missionUI.currentCategory;
        const missions = this.getMissionsByCategory(currentCategory);

        const content = `
            <div class="mission-interface enhanced">
                <div class="mission-header">
                    <h3>🎯 Sistema de Missões</h3>
                    <button class="close-btn" onclick="window.gameManager.questSystem.closeMissionInterface()">✖️</button>
                </div>

                <div class="mission-categories-simplified">
                    ${categories.map(cat => {
                        const category = this.missionCategories[cat];
                        const isActive = cat === currentCategory;
                        const missionCount = this.getMissionsByCategory(cat).length;

                        return `
                            <button class="category-btn-large ${isActive ? 'active' : ''}"
                                    data-tooltip="${category.name} (${missionCount} missões)"
                                    onclick="window.gameManager.questSystem.selectCategory('${cat}')">
                                <div class="category-icon-large">${category.icon}</div>
                                <div class="category-info">
                                    <div class="category-name-large">${category.name}</div>
                                    <div class="category-description-small">${category.description}</div>
                                    <div class="mission-count-badge">${missionCount} missões</div>
                                </div>
                            </button>
                        `;
                    }).join('')}
                </div>

                <div class="mission-content-area">
                    <div class="mission-list-header">
                        <h4>📋 ${this.missionCategories[currentCategory].name}</h4>
                        <div class="mission-list-stats">
                            <span class="active-missions">${this.activeQuests.size} ativas</span>
                            <span class="completed-missions">${this.completedQuests.size} completas</span>
                        </div>
                    </div>

                    <div class="mission-list-enhanced">
                        ${missions.length > 0 ?
                            missions.map(mission => this.renderMissionCard(mission)).join('') :
                            `<div class="no-missions">
                                <div class="no-missions-icon">📭</div>
                                <div class="no-missions-text">Nenhuma missão disponível nesta categoria</div>
                                <div class="no-missions-hint">Explore outras categorias ou complete missões anteriores</div>
                            </div>`
                        }
                    </div>
                </div>

                <div class="mission-stats-compact">
                    <div class="stat-item-compact">
                        <span class="stat-icon">🎯</span>
                        <span class="stat-value">${this.activeQuests.size}</span>
                        <span class="stat-label">Ativas</span>
                    </div>
                    <div class="stat-item-compact">
                        <span class="stat-icon">✅</span>
                        <span class="stat-value">${this.completedQuests.size}</span>
                        <span class="stat-label">Completas</span>
                    </div>
                    <div class="stat-item-compact">
                        <span class="stat-icon">⭐</span>
                        <span class="stat-value">${this.totalScore}</span>
                        <span class="stat-label">Pontos</span>
                    </div>
                </div>
            </div>
        `;

        detailsContent.innerHTML = content;
    }

    /**
     * Renders a mission card
     */
    renderMissionCard(mission) {
        const isActive = this.activeQuests.has(mission.id);
        const isCompleted = this.completedQuests.has(mission.id);
        const canStart = this.canStartMission(mission.id);
        const category = this.missionCategories[mission.category];

        let statusClass = 'available';
        let statusText = 'Disponível';
        let actionButton = '';

        // ===== ENHANCED STATUS HANDLING =====
        if (mission.status === 'expired') {
            statusClass = 'expired';
            statusText = 'Expirada';
            actionButton = '<button class="mission-btn expired" disabled>⏰ Expirada</button>';
        } else if (isCompleted) {
            statusClass = 'completed';
            statusText = 'Completa';
            actionButton = '<button class="mission-btn completed" disabled>✓ Completa</button>';
        } else if (isActive) {
            statusClass = 'active';
            statusText = 'Ativa';
            actionButton = '<button class="mission-btn active" disabled>⏳ Em Progresso</button>';

            // Add choice button if choices are available
            if (mission.choices && mission.choices.length > 0) {
                actionButton += `<button class="mission-btn choice" onclick="window.gameManager.questSystem.presentChoice('${mission.id}', '${mission.choices[0].id}')">🎭 Decidir</button>`;
            }
        } else if (canStart) {
            statusClass = 'available';
            statusText = 'Disponível';
            actionButton = `<button class="mission-btn start" onclick="window.gameManager.questSystem.startMission('${mission.id}')">▶️ Iniciar</button>`;
        } else {
            statusClass = 'locked';
            statusText = 'Bloqueada';
            actionButton = '<button class="mission-btn locked" disabled>🔒 Bloqueada</button>';
        }

        // ===== ENHANCED VISUAL INDICATORS =====

        // Urgency indicator
        let urgencyIndicator = '';
        if (mission.urgency === 'critical') {
            urgencyIndicator = '<span class="urgency-indicator critical">🚨 CRÍTICA</span>';
            statusClass += ' critical-urgency';
        } else if (mission.urgency === 'high') {
            urgencyIndicator = '<span class="urgency-indicator high">⚡ URGENTE</span>';
            statusClass += ' high-urgency';
        }

        // Chain indicator
        let chainIndicator = '';
        if (mission.chainId) {
            chainIndicator = `<span class="chain-indicator">🔗 Parte ${mission.chainPosition}</span>`;
        }

        // Time window indicator
        let timeWindowIndicator = '';
        if (mission.timeWindow && mission.status === 'available') {
            const timeLeft = mission.timeWindow.end - Date.now();
            const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
            if (hoursLeft > 0) {
                timeWindowIndicator = `<span class="time-window">⏰ ${hoursLeft}h restantes</span>`;
            }
        }

        // Special features indicators
        let featuresIndicators = '';
        if (mission.scalingRewards) {
            featuresIndicators += '<span class="feature-indicator scaling">⭐ Recompensas Dinâmicas</span>';
        }
        if (mission.choices && mission.choices.length > 0) {
            featuresIndicators += '<span class="feature-indicator choices">🎭 Decisões</span>';
        }
        if (mission.stakeholders && mission.stakeholders.length > 0) {
            featuresIndicators += '<span class="feature-indicator stakeholders">👥 Impacto Social</span>';
        }

        const progressPercent = isActive ? (mission.progress * 100) : (isCompleted ? 100 : 0);

        return `
            <div class="mission-card ${statusClass}" onclick="window.gameManager.questSystem.selectMission('${mission.id}')">
                <div class="mission-card-header">
                    <div class="mission-title">
                        <span class="mission-icon" style="color: ${category.color}">${mission.missionIcon || category.icon}</span>
                        <h4>${mission.title}</h4>
                    </div>
                    <div class="mission-status-area">
                        <div class="mission-status ${statusClass}">${statusText}</div>
                        ${urgencyIndicator}
                    </div>
                </div>

                <div class="mission-indicators">
                    ${chainIndicator}
                    ${timeWindowIndicator}
                    ${featuresIndicators}
                </div>

                <div class="mission-description">
                    <p>${mission.description}</p>
                    ${this.renderMissionInfoCards(mission)}
                </div>

                <div class="mission-meta">
                    <div class="mission-difficulty">
                        <span class="meta-label">Dificuldade:</span>
                        <span class="difficulty-${mission.difficulty}">${this.getDifficultyText(mission.difficulty)}</span>
                    </div>
                    <div class="mission-time">
                        <span class="meta-label">Tempo estimado:</span>
                        <span>${mission.estimatedTime || 'Variável'}</span>
                    </div>
                </div>

                ${this.renderStakeholders(mission)}
                ${this.renderPrerequisites(mission)}

                <div class="mission-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-text">${Math.round(progressPercent)}%</span>
                </div>

                <div class="mission-actions">
                    ${actionButton}
                    <button class="mission-btn info" onclick="window.gameManager.questSystem.showMissionDetails('${mission.id}')">ℹ️ Detalhes</button>
                </div>
            </div>
        `;
    }

    renderStakeholders(mission) {
        if (!mission.stakeholders || mission.stakeholders.length === 0) return '';

        const stakeholderNames = mission.stakeholders.map(s => this.getStakeholderName(s));

        return `
            <div class="mission-stakeholders">
                <span class="meta-label">Grupos Afetados:</span>
                <span class="stakeholder-list">${stakeholderNames.join(', ')}</span>
            </div>
        `;
    }

    /**
     * Renders informational cards for mission categories (simplified version)
     */
    renderMissionInfoCards(mission) {
        // Get related info cards based on mission category
        const relatedCards = this.getRelatedInfoCards(mission);

        if (relatedCards.length === 0) return '';

        return `
            <div class="mission-info-cards">
                <div class="info-cards-label">Categorias Relacionadas:</div>
                <div class="info-cards-container">
                    ${relatedCards.map(cardKey => {
                        const card = this.missionCategories[cardKey];
                        return `
                            <div class="mission-info-card" style="border-left-color: ${card.color}">
                                <span class="info-card-icon" style="color: ${card.color}">${card.icon}</span>
                                <div class="info-card-content">
                                    <div class="info-card-name">${card.name}</div>
                                    <div class="info-card-description">${card.description}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Gets the most important current objective for a mission
     */
    getCurrentObjective(mission) {
        if (!mission || !mission.objectives) return null;

        // Find the first incomplete objective
        for (const objective of mission.objectives) {
            if (objective.current < objective.required) {
                return objective;
            }
        }

        // If all objectives are complete, return the last one
        return mission.objectives[mission.objectives.length - 1] || null;
    }

    /**
     * Gets actionable text for an objective
     */
    getActionableObjectiveText(objective, mission) {
        if (!objective) return mission.description;

        // Create actionable text based on objective type
        const remaining = objective.required - objective.current;

        if (objective.type === 'build') {
            if (remaining > 0) {
                return `Construa ${remaining} ${objective.buildingType || 'edifício(s)'}`;
            } else {
                return `✅ ${objective.description}`;
            }
        } else if (objective.type === 'resource') {
            if (remaining > 0) {
                return `Colete ${remaining} unidades de ${objective.resourceType || 'recursos'}`;
            } else {
                return `✅ ${objective.description}`;
            }
        } else if (objective.type === 'reach') {
            if (remaining > 0) {
                return `Alcance ${objective.required} ${objective.targetType || 'pontos'}`;
            } else {
                return `✅ ${objective.description}`;
            }
        }

        // Default fallback
        return objective.description || mission.description;
    }

    /**
     * Gets action text for an objective
     */
    getObjectiveActionText(objective, mission) {
        if (!objective) return 'Clique para ver detalhes';

        const remaining = objective.required - objective.current;

        if (remaining <= 0) {
            return 'Objetivo concluído!';
        }

        if (objective.type === 'build') {
            return 'Abrir painel de construção';
        } else if (objective.type === 'resource') {
            return 'Ver recursos necessários';
        } else if (objective.type === 'reach') {
            return 'Ver progresso detalhado';
        }

        return 'Clique para mais informações';
    }

    /**
     * Gets appropriate icon for an objective
     */
    getObjectiveIcon(objective, mission) {
        if (!objective) return '🎯';

        const remaining = objective.required - objective.current;

        if (remaining <= 0) {
            return '✅';
        }

        if (objective.type === 'build') {
            return '🏗️';
        } else if (objective.type === 'resource') {
            return '📦';
        } else if (objective.type === 'reach') {
            return '📈';
        }

        return '🎯';
    }

    /**
     * Gets mission urgency information
     */
    getMissionUrgency(mission) {
        if (!mission) return { level: 'none', text: '' };

        // Check for explicit urgency
        if (mission.urgency === 'high' || mission.urgency === 'critical') {
            return {
                level: mission.urgency,
                text: mission.urgency === 'critical' ? 'CRÍTICA' : 'URGENTE'
            };
        }

        // Check for time windows
        if (mission.timeWindow && mission.status === 'available') {
            const timeLeft = mission.timeWindow.end - Date.now();
            const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

            if (hoursLeft <= 2) {
                return { level: 'critical', text: 'CRÍTICA' };
            } else if (hoursLeft <= 6) {
                return { level: 'high', text: 'URGENTE' };
            } else if (hoursLeft <= 24) {
                return { level: 'medium', text: 'MODERADA' };
            }
        }

        // Check mission type
        if (mission.type === 'primary') {
            return { level: 'medium', text: 'IMPORTANTE' };
        }

        return { level: 'low', text: 'NORMAL' };
    }

    /**
     * Handles click on current objective display
     */
    focusOnCurrentObjective() {
        if (!this.currentDisplayMission) {
            // No current mission, open mission interface
            this.openMissionInterface();
            return;
        }

        const mission = this.currentDisplayMission;
        const currentObjective = this.getCurrentObjective(mission);

        if (!currentObjective) {
            // Show mission details
            this.showMissionDetails(mission.id);
            return;
        }

        // Handle different objective types
        if (currentObjective.type === 'build') {
            // Open building panel for the required building type
            if (currentObjective.buildingType && window.gameManager.uiManager) {
                // Try to open the appropriate building category
                this.openBuildingCategory(currentObjective.buildingType);
            } else {
                // Fallback to mission details
                this.showMissionDetails(mission.id);
            }
        } else {
            // For other types, show mission details
            this.showMissionDetails(mission.id);
        }
    }

    /**
     * Opens the appropriate building category for an objective
     */
    openBuildingCategory(buildingType) {
        // Map building types to UI categories
        const categoryMap = {
            'water_pump': 'water',
            'well': 'water',
            'desalination_plant': 'water',
            'rain_garden': 'water',
            'floating_garden': 'water',
            'monitoring_station': 'water',
            'quality_monitor': 'water',
            'treatment_plant': 'treatment',
            'reservoir': 'storage',
            'water_tower': 'storage'
        };

        const category = categoryMap[buildingType] || 'water';

        // Trigger building category selection
        if (window.gameManager.uiManager && window.gameManager.uiManager.selectBuildingCategory) {
            window.gameManager.uiManager.selectBuildingCategory(category);
        }
    }

    /**
     * Gets related info cards for a mission based on its simplified category
     * Returns simplified categories that match the mission's category (primary/secondary)
     */
    getRelatedInfoCards(mission) {
        // For simplified mission interface, return the mission's category as a related card
        // This ensures consistency with the simplified 2-category system
        if (mission.category === 'primary') {
            return ['primary'];
        } else if (mission.category === 'secondary') {
            return ['secondary'];
        }

        // Fallback: if mission doesn't have a category, return empty array
        return [];
    }

    // ===== ENHANCED UI SYNCHRONIZATION =====
    updateQuestUI() {
        this.updateMissionInfoPanel();
        this.updateMissionProgressDisplay();

        // Update mission interface if it's open
        if (this.missionUI.isOpen) {
            this.renderMissionInterface();
        }
    }

    /**
     * Updates the enhanced mission-info panel in the sidebar
     */
    updateMissionInfoPanel() {
        const currentMissionElement = document.getElementById('current-mission');
        const progressTextElement = document.querySelector('.mission-info .progress-text');
        const objectiveActionElement = document.getElementById('objective-action');
        const objectiveIconElement = document.getElementById('objective-icon');
        const objectiveStatusElement = document.getElementById('objective-status');
        const missionUrgencyElement = document.getElementById('mission-urgency');
        const progressFillElement = document.getElementById('mission-progress');

        if (!currentMissionElement) return;

        // Find the most relevant active mission to display
        let displayMission = null;

        // Priority 1: Current main quest
        if (this.currentMainQuest && this.activeQuests.has(this.currentMainQuest)) {
            displayMission = this.quests.get(this.currentMainQuest);
        }

        // Priority 2: Any active primary mission
        if (!displayMission) {
            for (const questId of this.activeQuests) {
                const quest = this.quests.get(questId);
                if (quest && quest.type === 'primary') {
                    displayMission = quest;
                    break;
                }
            }
        }

        // Priority 3: Any active mission
        if (!displayMission && this.activeQuests.size > 0) {
            const firstActiveId = this.activeQuests.values().next().value;
            displayMission = this.quests.get(firstActiveId);
        }

        // Update the display
        if (displayMission) {
            // Get the most important current objective
            const currentObjective = this.getCurrentObjective(displayMission);

            if (currentObjective) {
                // Update objective title with actionable text
                currentMissionElement.textContent = this.getActionableObjectiveText(currentObjective, displayMission);

                // Update action text
                if (objectiveActionElement) {
                    objectiveActionElement.textContent = this.getObjectiveActionText(currentObjective, displayMission);
                }

                // Update objective icon based on type
                if (objectiveIconElement) {
                    objectiveIconElement.textContent = this.getObjectiveIcon(currentObjective, displayMission);
                }
            } else {
                currentMissionElement.textContent = displayMission.description;
                if (objectiveActionElement) {
                    objectiveActionElement.textContent = 'Clique para ver detalhes';
                }
                if (objectiveIconElement) {
                    objectiveIconElement.textContent = '🎯';
                }
            }

            // Update progress
            const completedObjectives = displayMission.objectives.filter(obj => obj.current >= obj.required).length;
            const totalObjectives = displayMission.objectives.length;
            const progressPercent = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

            if (progressTextElement) {
                progressTextElement.textContent = `${completedObjectives}/${totalObjectives}`;
            }

            if (progressFillElement) {
                progressFillElement.style.width = `${progressPercent}%`;
            }

            // Update urgency indicator
            if (missionUrgencyElement) {
                const urgency = this.getMissionUrgency(displayMission);
                missionUrgencyElement.textContent = urgency.text;
                missionUrgencyElement.className = `mission-urgency ${urgency.level}`;
                missionUrgencyElement.style.display = urgency.level !== 'none' ? 'block' : 'none';
            }

            // Store current mission for click handler
            this.currentDisplayMission = displayMission;
        } else {
            currentMissionElement.textContent = 'Nenhuma missão ativa';
            if (progressTextElement) {
                progressTextElement.textContent = '0/0';
            }
            if (objectiveActionElement) {
                objectiveActionElement.textContent = 'Inicie uma missão';
            }
            if (objectiveIconElement) {
                objectiveIconElement.textContent = '📋';
            }
            if (progressFillElement) {
                progressFillElement.style.width = '0%';
            }
            if (missionUrgencyElement) {
                missionUrgencyElement.style.display = 'none';
            }
            this.currentDisplayMission = null;
        }
    }

    /**
     * Updates the mission progress bar
     */
    updateMissionProgressDisplay() {
        const missionProgressElement = document.getElementById('mission-progress');
        if (!missionProgressElement) return;

        // Find the mission to display (same logic as above)
        let displayMission = null;

        if (this.currentMainQuest && this.activeQuests.has(this.currentMainQuest)) {
            displayMission = this.quests.get(this.currentMainQuest);
        } else if (this.activeQuests.size > 0) {
            // Find first active primary mission, or any active mission
            for (const questId of this.activeQuests) {
                const quest = this.quests.get(questId);
                if (quest && quest.type === 'primary') {
                    displayMission = quest;
                    break;
                }
            }

            if (!displayMission) {
                const firstActiveId = this.activeQuests.values().next().value;
                displayMission = this.quests.get(firstActiveId);
            }
        }

        if (displayMission) {
            const progressPercent = this.calculateMissionProgress(displayMission);
            missionProgressElement.style.width = `${progressPercent}%`;
        } else {
            missionProgressElement.style.width = '0%';
        }
    }

    /**
     * Calculates mission progress percentage
     */
    calculateMissionProgress(mission) {
        if (!mission || !mission.objectives || mission.objectives.length === 0) {
            return 0;
        }

        const totalObjectives = mission.objectives.length;
        const completedObjectives = mission.objectives.filter(obj => obj.current >= obj.required).length;

        return Math.round((completedObjectives / totalObjectives) * 100);
    }

    /**
     * Renders prerequisite information for a mission
     */
    renderPrerequisites(mission) {
        if (!mission.prerequisites || mission.prerequisites.length === 0) {
            return '';
        }

        const prerequisiteInfo = mission.prerequisites.map(prereqId => {
            const prereqMission = this.quests.get(prereqId);
            const isCompleted = this.completedQuests.has(prereqId);

            if (prereqMission) {
                return {
                    title: prereqMission.title,
                    completed: isCompleted,
                    id: prereqId
                };
            } else {
                return {
                    title: prereqId,
                    completed: isCompleted,
                    id: prereqId
                };
            }
        });

        const allCompleted = prerequisiteInfo.every(prereq => prereq.completed);
        const statusClass = allCompleted ? 'prerequisites-met' : 'prerequisites-pending';

        return `
            <div class="mission-prerequisites ${statusClass}">
                <div class="prerequisites-header">
                    <span class="meta-label">Pré-requisitos:</span>
                    <span class="prerequisites-status">
                        ${allCompleted ? '✅ Completos' : '⏳ Pendentes'}
                    </span>
                </div>
                <div class="prerequisites-list">
                    ${prerequisiteInfo.map(prereq => `
                        <div class="prerequisite-item ${prereq.completed ? 'completed' : 'pending'}">
                            <span class="prerequisite-icon">${prereq.completed ? '✅' : '⏳'}</span>
                            <span class="prerequisite-title">${prereq.title}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // ===== MISSION MANAGEMENT HELPERS =====

    /**
     * Gets missions by category - now simplified to only primary/secondary
     */
    getMissionsByCategory(category) {
        return Array.from(this.quests.values()).filter(mission => {
            // Filter by the simplified category system
            return mission.category === category;
        });
    }

    /**
     * Selects a mission category
     */
    selectCategory(category) {
        this.missionUI.currentCategory = category;
        this.renderMissionInterface();
    }

    /**
     * Selects a specific mission
     */
    selectMission(missionId) {
        this.missionUI.selectedMission = missionId;
        // Could expand to show detailed mission view
    }

    /**
     * Starts a mission from the UI
     */
    startMission(missionId) {
        if (this.startQuest(missionId)) {
            this.renderMissionInterface();

            if (this.gameManager.uiManager) {
                this.gameManager.uiManager.showNotification(
                    `Missão iniciada: ${this.quests.get(missionId).title}`,
                    'info'
                );
            }
        }
    }

    /**
     * Shows detailed mission information
     */
    showMissionDetails(missionId) {
        const mission = this.quests.get(missionId);
        if (!mission) return;

        const detailsContent = document.getElementById('details-content');
        if (!detailsContent) return;

        const category = this.missionCategories[mission.category];
        const isActive = this.activeQuests.has(missionId);
        const isCompleted = this.completedQuests.has(missionId);

        const content = `
            <div class="mission-details">
                <div class="mission-details-header">
                    <button class="back-btn" onclick="window.gameManager.questSystem.renderMissionInterface()">← Voltar</button>
                    <h3>${mission.title}</h3>
                </div>

                <div class="mission-info">
                    <div class="mission-category">
                        <span class="category-icon" style="color: ${category.color}">${category.icon}</span>
                        <span>${category.name}</span>
                    </div>
                    <div class="mission-difficulty">Dificuldade: ${this.getDifficultyText(mission.difficulty)}</div>
                    <div class="mission-time">Tempo estimado: ${mission.estimatedTime || 'Variável'}</div>
                </div>

                <div class="mission-description">
                    <h4>Descrição</h4>
                    <p>${mission.description}</p>
                </div>

                <div class="mission-objectives">
                    <h4>Objetivos</h4>
                    ${mission.objectives.map(obj => `
                        <div class="objective-item">
                            <span class="objective-icon">${obj.current >= obj.required ? '✅' : '⏳'}</span>
                            <span class="objective-text">${obj.description}</span>
                            <span class="objective-progress">${obj.current}/${obj.required}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="mission-rewards">
                    <h4>Recompensas</h4>
                    <div class="rewards-list">
                        ${mission.rewards.score ? `<div class="reward-item">🏆 ${mission.rewards.score} pontos</div>` : ''}
                        ${mission.rewards.budget ? `<div class="reward-item">💰 R$ ${mission.rewards.budget}</div>` : ''}
                        ${mission.rewards.experience ? `<div class="reward-item">⭐ ${mission.rewards.experience} XP</div>` : ''}
                        ${mission.rewards.unlock ? `<div class="reward-item">🔓 Desbloqueios: ${mission.rewards.unlock.join(', ')}</div>` : ''}
                    </div>
                </div>

                ${mission.educationalContent ? `
                    <div class="educational-content">
                        <h4>Conteúdo Educacional</h4>

                        ${mission.educationalContent.concepts ? `
                            <div class="concepts">
                                <h5>Conceitos Abordados:</h5>
                                <div class="concept-tags">
                                    ${mission.educationalContent.concepts.map(concept =>
                                        `<span class="concept-tag">${concept}</span>`
                                    ).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="facts">
                            <h5>Fatos Interessantes:</h5>
                            <ul>
                                ${mission.educationalContent.facts.map(fact => `<li>${fact}</li>`).join('')}
                            </ul>
                        </div>

                        <div class="tips">
                            <h5>Dicas:</h5>
                            <ul>
                                ${mission.educationalContent.tips.map(tip => `<li>${tip}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                ` : ''}

                <div class="mission-actions">
                    ${!isCompleted && !isActive && this.canStartMission(missionId) ?
                        `<button class="mission-btn start" onclick="window.gameManager.questSystem.startMission('${missionId}')">▶️ Iniciar Missão</button>` :
                        ''
                    }
                </div>
            </div>
        `;

        detailsContent.innerHTML = content;
    }

    /**
     * Checks if a mission can be started
     */
    canStartMission(missionId) {
        const mission = this.quests.get(missionId);
        if (!mission || mission.status !== 'available') return false;

        // Check prerequisites
        if (mission.prerequisites && mission.prerequisites.length > 0) {
            const prerequisitesMet = mission.prerequisites.every(prereq => this.completedQuests.has(prereq));
            if (!prerequisitesMet) {
                console.log(`🔒 Mission ${mission.title} blocked by prerequisites:`,
                    mission.prerequisites.filter(prereq => !this.completedQuests.has(prereq)));
                return false;
            }
        }

        return true;
    }

    /**
     * Validates mission completion logic
     */
    validateMissionCompletion(missionId) {
        const mission = this.quests.get(missionId);
        if (!mission) {
            console.error(`❌ Mission validation failed: Mission ${missionId} not found`);
            return false;
        }

        console.log(`🔍 Validating mission completion: ${mission.title}`);

        // Check each objective
        let allObjectivesComplete = true;
        mission.objectives.forEach((objective, index) => {
            const progress = this.checkObjectiveProgress(objective);
            const isComplete = progress >= objective.required;

            console.log(`  📋 Objective ${index + 1}: ${objective.description}`);
            console.log(`     Progress: ${progress}/${objective.required} ${isComplete ? '✅' : '⏳'}`);

            if (!isComplete) {
                allObjectivesComplete = false;
            }
        });

        console.log(`🎯 Mission ${mission.title} completion status: ${allObjectivesComplete ? '✅ Complete' : '⏳ In Progress'}`);
        return allObjectivesComplete;
    }

    /**
     * Forces mission completion for testing purposes
     */
    forceCompleteMission(missionId) {
        const mission = this.quests.get(missionId);
        if (!mission) {
            console.error(`❌ Cannot force complete: Mission ${missionId} not found`);
            return false;
        }

        console.log(`🧪 Force completing mission: ${mission.title}`);

        // Complete all objectives
        mission.objectives.forEach(objective => {
            objective.current = objective.required;
        });

        // Complete the mission
        this.completeQuest(missionId);
        return true;
    }

    /**
     * Gets difficulty text
     */
    getDifficultyText(difficulty) {
        const difficultyMap = {
            'beginner': 'Iniciante',
            'intermediate': 'Intermediário',
            'advanced': 'Avançado',
            'expert': 'Especialista'
        };
        return difficultyMap[difficulty] || 'Desconhecido';
    }

    // ===== GETTERS =====
    getActiveQuests() {
        return Array.from(this.activeQuests).map(id => this.quests.get(id));
    }

    getCompletedQuests() {
        return Array.from(this.completedQuests).map(id => this.quests.get(id));
    }
    
    getCurrentMainQuest() {
        return this.currentMainQuest ? this.quests.get(this.currentMainQuest) : null;
    }
    
    getTotalScore() {
        return this.totalScore;
    }
    
    getAchievements() {
        return Array.from(this.achievements);
    }
    
    // ===== SAVE/LOAD =====
    getSaveData() {
        return {
            activeQuests: Array.from(this.activeQuests),
            completedQuests: Array.from(this.completedQuests),
            currentMainQuest: this.currentMainQuest,
            totalScore: this.totalScore,
            achievements: Array.from(this.achievements),
            questStates: Array.from(this.quests.entries()).map(([id, quest]) => ({
                id,
                status: quest.status,
                startTime: quest.startTime,
                completionTime: quest.completionTime,
                progress: quest.progress
            }))
        };
    }
    
    loadData(data) {
        if (data) {
            this.activeQuests = new Set(data.activeQuests || []);
            this.completedQuests = new Set(data.completedQuests || []);
            this.currentMainQuest = data.currentMainQuest;
            this.totalScore = data.totalScore || 0;
            this.achievements = new Set(data.achievements || []);
            
            // Restaurar estados das missões
            if (data.questStates) {
                data.questStates.forEach(state => {
                    const quest = this.quests.get(state.id);
                    if (quest) {
                        quest.status = state.status;
                        quest.startTime = state.startTime;
                        quest.completionTime = state.completionTime;
                        quest.progress = state.progress;
                    }
                });
            }
        }
    }

    // ===== ENHANCED MISSION COMPLETION AUDIO FEEDBACK =====
    playMissionCompletionAudio(quest, performanceMultiplier) {
        try {
            // Determine audio based on mission importance and performance
            let primarySound = 'sfx_success';
            let celebrationLevel = 'normal';

            // Check mission importance
            if (quest.priority === 'high' || quest.urgency === 'urgent') {
                celebrationLevel = 'important';
            }

            // Check performance multiplier
            if (performanceMultiplier >= 1.5) {
                celebrationLevel = 'excellent';
            } else if (performanceMultiplier >= 1.2) {
                celebrationLevel = 'good';
            }

            // Play primary completion sound
            AudioManager.playSound(primarySound, 0.8);

            // Add celebration effects based on level
            setTimeout(() => {
                switch (celebrationLevel) {
                    case 'excellent':
                        // Excellent performance - fanfare
                        AudioManager.playSound('sfx_pickup', 0.6);
                        setTimeout(() => {
                            AudioManager.playSound('sfx_item', 0.4);
                        }, 200);
                        setTimeout(() => {
                            AudioManager.playSound('sfx_success', 0.5);
                        }, 400);
                        break;

                    case 'important':
                        // Important mission - double celebration
                        AudioManager.playSound('sfx_pickup', 0.7);
                        setTimeout(() => {
                            AudioManager.playSound('sfx_success', 0.6);
                        }, 300);
                        break;

                    case 'good':
                        // Good performance - bonus sound
                        AudioManager.playSound('sfx_pickup', 0.5);
                        break;

                    default:
                        // Normal completion - single sound already played
                        break;
                }
            }, 150);

            // Create procedural victory sound for special occasions
            if (celebrationLevel === 'excellent') {
                setTimeout(() => {
                    this.createProceduralVictorySound();
                }, 600);
            }

            console.log(`🔊 Mission completion audio played: ${celebrationLevel} level for "${quest.title}"`);

        } catch (error) {
            console.warn('⚠️ Error playing mission completion audio:', error);
            // Fallback to simple success sound
            AudioManager.playSound('sfx_success', 0.8);
        }
    }

    createProceduralVictorySound() {
        try {
            if (typeof AudioManager === 'undefined' || !AudioManager.getInstance().audioContext) {
                return;
            }

            const audioContext = AudioManager.getInstance().audioContext;
            const masterVolume = AudioManager.getInstance().masterVolume;
            const sfxVolume = AudioManager.getInstance().sfxVolume;

            // Create a celebratory chord progression
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
            const duration = 0.8;

            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    oscillator.type = 'sine';

                    // Envelope for musical sound
                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(
                        masterVolume * sfxVolume * 0.3,
                        audioContext.currentTime + 0.1
                    );
                    gainNode.gain.exponentialRampToValueAtTime(
                        0.001,
                        audioContext.currentTime + duration
                    );

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + duration);

                }, index * 100);
            });

            console.log('🎵 Procedural victory sound created');

        } catch (error) {
            console.warn('⚠️ Error creating procedural victory sound:', error);
        }
    }
}

// Exportar para escopo global
window.QuestSystem = QuestSystem;
console.log('🎯 QuestSystem carregado e exportado para window.QuestSystem');
