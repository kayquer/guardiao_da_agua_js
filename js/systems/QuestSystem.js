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

        // ===== ENHANCED MISSION SYSTEM =====
        // Mission chains for connected storylines
        this.missionChains = new Map();
        this.activeChains = new Set();

        // Player choices and consequences
        this.playerChoices = new Map();
        this.reputation = {
            citizens: 50,      // Citizen satisfaction with decisions
            environment: 50,   // Environmental groups approval
            business: 50,      // Business community support
            government: 50     // Government/regulatory approval
        };

        // Dynamic mission state
        this.seasonalEvents = new Map();
        this.emergencyEvents = new Set();
        this.missionNotifications = [];

        // Enhanced timing system
        this.urgentMissions = new Set();
        this.timeWindowMissions = new Map();

        // ===== ENHANCED MISSION MANAGEMENT SYSTEM =====
        this.missionCategories = {
            primary: {
                name: 'Missões Principais',
                description: 'Atividades essenciais para o progresso do jogo',
                icon: '🎯',
                color: '#00ff88'
            },
            secondary: {
                name: 'Missões Secundárias',
                description: 'Conteúdo educacional opcional e desafios extras',
                icon: '📚',
                color: '#4a9eff'
            },
            water_management: {
                name: 'Gestão Hídrica',
                description: 'Missões focadas em recursos hídricos',
                icon: '💧',
                color: '#00bfff'
            },
            environmental: {
                name: 'Proteção Ambiental',
                description: 'Missões sobre impacto ambiental',
                icon: '🌱',
                color: '#32cd32'
            },
            urban_planning: {
                name: 'Planejamento Urbano',
                description: 'Missões sobre desenvolvimento urbano',
                icon: '🏙️',
                color: '#ffa500'
            },
            crisis: {
                name: 'Gestão de Crises',
                description: 'Missões de resposta a emergências',
                icon: '⚠️',
                color: '#ff4444'
            },

            // Additional categories used by missions
            environment: {
                name: 'Meio Ambiente',
                description: 'Missões de proteção e conservação ambiental',
                icon: '🌍',
                color: '#228B22'
            },
            infrastructure: {
                name: 'Infraestrutura',
                description: 'Desenvolvimento de infraestrutura básica',
                icon: '🏗️',
                color: '#8B4513'
            },
            sustainability: {
                name: 'Sustentabilidade',
                description: 'Práticas sustentáveis e desenvolvimento responsável',
                icon: '♻️',
                color: '#32CD32'
            },

            // ===== ENHANCED MISSION CATEGORIES =====
            story: {
                name: 'Narrativa',
                description: 'Missões com história e escolhas que impactam o futuro',
                icon: '📖',
                color: '#9B59B6'
            },
            community: {
                name: 'Comunidade',
                description: 'Engajamento cidadão e participação pública',
                icon: '👥',
                color: '#E67E22'
            },
            innovation: {
                name: 'Inovação',
                description: 'Pesquisa, desenvolvimento e novas tecnologias',
                icon: '🔬',
                color: '#3498DB'
            },
            seasonal: {
                name: 'Eventos Sazonais',
                description: 'Desafios especiais por tempo limitado',
                icon: '🌟',
                color: '#F39C12'
            },
            emergency: {
                name: 'Emergências',
                description: 'Situações críticas que requerem resposta imediata',
                icon: '🚨',
                color: '#E74C3C'
            }
        };

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
            category: 'water_management',
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
            category: 'environment',
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
            category: 'infrastructure',
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
            category: 'sustainability',
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
            category: 'crisis',
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
            category: 'environmental',
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
            category: 'water_management',
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
            category: 'crisis',
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
            category: 'environmental',
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
            category: 'urban_planning',
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
            category: 'water_management',
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
            category: 'story',
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
            category: 'emergency',
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
            category: 'seasonal',
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
            category: 'emergency',
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

        // Register mission chain if specified
        if (quest.chainId) {
            this.registerMissionChain(quest.chainId, id, quest.chainPosition);
        }
    }

    // ===== ENHANCED MISSION CHAIN SYSTEM =====
    registerMissionChain(chainId, missionId, position) {
        if (!this.missionChains.has(chainId)) {
            this.missionChains.set(chainId, []);
        }

        const chain = this.missionChains.get(chainId);
        chain[position] = missionId;

        // Sort chain by position
        chain.sort((a, b) => {
            const questA = this.quests.get(a);
            const questB = this.quests.get(b);
            return (questA?.chainPosition || 0) - (questB?.chainPosition || 0);
        });
    }

    getNextMissionInChain(chainId, currentPosition) {
        const chain = this.missionChains.get(chainId);
        if (!chain) return null;

        const nextIndex = chain.findIndex(missionId => {
            const quest = this.quests.get(missionId);
            return quest && quest.chainPosition > currentPosition;
        });

        return nextIndex >= 0 ? chain[nextIndex] : null;
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

        // Handle mission chain progression
        if (quest.chainId) {
            this.progressMissionChain(quest.chainId, quest.chainPosition);
        }

        // Apply reputation changes based on stakeholders
        this.updateReputation(quest);

        // Remove from urgent missions if applicable
        this.urgentMissions.delete(questId);

        // Verificar próximas missões
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

        // Som de sucesso
        AudioManager.playSound('sfx_success');

        console.log(`✅ Missão completa: ${quest.title} (Performance: ${performanceMultiplier.toFixed(2)}x)`);
        return true;
    }

    // ===== ENHANCED MISSION PROGRESSION =====
    progressMissionChain(chainId, completedPosition) {
        const nextMissionId = this.getNextMissionInChain(chainId, completedPosition);

        if (nextMissionId) {
            const nextMission = this.quests.get(nextMissionId);
            if (nextMission && nextMission.status === 'locked') {
                nextMission.status = 'available';

                // Notify player about new mission
                if (this.gameManager.uiManager) {
                    this.gameManager.uiManager.showNotification(
                        `🔓 Nova missão desbloqueada: ${nextMission.title}`,
                        'info',
                        6000
                    );
                }

                console.log(`🔓 Missão da cadeia desbloqueada: ${nextMission.title}`);
            }
        } else {
            // Chain completed
            this.activeChains.delete(chainId);

            if (this.gameManager.uiManager) {
                this.gameManager.uiManager.showNotification(
                    `🏆 Série de missões completa!`,
                    'success',
                    4000
                );
            }
        }
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

        // Reputation changes
        if (quest.rewards.reputation) {
            Object.entries(quest.rewards.reputation).forEach(([group, change]) => {
                this.modifyReputation(group, change);
            });
        }

        // Special unlocks based on performance
        if (quest.rewards.performanceUnlocks && performanceMultiplier >= 1.5) {
            quest.rewards.performanceUnlocks.forEach(unlock => {
                console.log(`🌟 Desbloqueio especial por desempenho: ${unlock}`);
                // TODO: Implement special unlocks
            });
        }
    }

    // ===== REPUTATION SYSTEM =====
    updateReputation(quest) {
        if (!quest.stakeholders || quest.stakeholders.length === 0) return;

        // Base reputation change based on quest completion
        const baseChange = quest.type === 'challenge' ? 3 : 2;

        quest.stakeholders.forEach(stakeholder => {
            this.modifyReputation(stakeholder, baseChange);
        });
    }

    modifyReputation(group, change) {
        if (this.reputation.hasOwnProperty(group)) {
            this.reputation[group] = Math.max(0, Math.min(100, this.reputation[group] + change));

            if (Math.abs(change) >= 5) {
                const direction = change > 0 ? 'melhorou' : 'piorou';
                const emoji = change > 0 ? '👍' : '👎';

                if (this.gameManager.uiManager) {
                    this.gameManager.uiManager.showNotification(
                        `${emoji} Reputação com ${this.getStakeholderName(group)} ${direction}`,
                        change > 0 ? 'success' : 'warning',
                        3000
                    );
                }
            }

            console.log(`📊 Reputação ${group}: ${this.reputation[group]} (${change > 0 ? '+' : ''}${change})`);
        }
    }

    getStakeholderName(group) {
        const names = {
            citizens: 'Cidadãos',
            environment: 'Ambientalistas',
            business: 'Empresários',
            government: 'Governo'
        };
        return names[group] || group;
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

        // Store player choice
        this.playerChoices.set(`${questId}_${choiceId}`, {
            questId,
            choiceId,
            optionIndex,
            option: selectedOption,
            timestamp: Date.now()
        });

        // Apply immediate consequences
        this.applyChoiceConsequences(selectedOption.consequences);

        // Remove choice from quest (can only choose once)
        quest.choices = quest.choices.filter(c => c.id !== choiceId);

        // Notify player
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

        // Apply reputation changes
        if (consequences.reputation) {
            Object.entries(consequences.reputation).forEach(([group, change]) => {
                this.modifyReputation(group, change);
            });
        }

        // Apply budget changes
        if (consequences.budget && this.gameManager.resourceManager) {
            this.gameManager.resourceManager.resources.budget.current += consequences.budget;

            if (consequences.budget !== 0) {
                const type = consequences.budget > 0 ? 'Ganho' : 'Gasto';
                const amount = Math.abs(consequences.budget);
                console.log(`💰 ${type} de orçamento: ${amount}`);
            }
        }

        // Apply time limit changes
        if (consequences.timeLimit) {
            // TODO: Implement dynamic time limit changes
            console.log(`⏰ Limite de tempo alterado: ${consequences.timeLimit}s`);
        }

        // Apply other consequences
        Object.entries(consequences).forEach(([key, value]) => {
            if (!['reputation', 'budget', 'timeLimit'].includes(key)) {
                console.log(`🔄 Consequência aplicada: ${key} = ${value}`);
            }
        });
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
            <div class="mission-interface">
                <div class="mission-header">
                    <h3>🎯 Sistema de Missões</h3>
                    <button class="close-btn" onclick="window.gameManager.questSystem.closeMissionInterface()">✖️</button>
                </div>

                <div class="mission-categories">
                    ${categories.map(cat => {
                        const category = this.missionCategories[cat];
                        const isActive = cat === currentCategory;
                        const missionCount = this.getMissionsByCategory(cat).length;

                        return `
                            <button class="category-btn ${isActive ? 'active' : ''}"
                                    onclick="window.gameManager.questSystem.selectCategory('${cat}')">
                                <span class="category-icon">${category.icon}</span>
                                <span class="category-name">${category.name}</span>
                                <span class="mission-count">${missionCount}</span>
                            </button>
                        `;
                    }).join('')}
                </div>

                <div class="category-description">
                    <p>${this.missionCategories[currentCategory].description}</p>
                </div>

                <div class="mission-list">
                    ${missions.map(mission => this.renderMissionCard(mission)).join('')}
                </div>

                <div class="mission-stats">
                    <div class="stat-item">
                        <span class="stat-label">Missões Ativas:</span>
                        <span class="stat-value">${this.activeQuests.size}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Missões Completas:</span>
                        <span class="stat-value">${this.completedQuests.size}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Pontuação Total:</span>
                        <span class="stat-value">${this.totalScore}</span>
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
     * Updates the mission-info panel in the sidebar
     */
    updateMissionInfoPanel() {
        const currentMissionElement = document.getElementById('current-mission');
        const progressTextElement = document.querySelector('.mission-info .progress-text');

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
            currentMissionElement.textContent = displayMission.description;

            // Update progress text
            if (progressTextElement) {
                const completedObjectives = displayMission.objectives.filter(obj => obj.current >= obj.required).length;
                const totalObjectives = displayMission.objectives.length;
                progressTextElement.textContent = `${completedObjectives}/${totalObjectives}`;
            }
        } else {
            currentMissionElement.textContent = 'Nenhuma missão ativa';
            if (progressTextElement) {
                progressTextElement.textContent = '0/0';
            }
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
     * Gets missions by category or type
     */
    getMissionsByCategory(category) {
        return Array.from(this.quests.values()).filter(mission => {
            // Handle primary/secondary type filtering
            if (category === 'primary' || category === 'secondary') {
                return mission.type === category;
            }
            // Handle regular category filtering
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
}

// Exportar para escopo global
window.QuestSystem = QuestSystem;
console.log('🎯 QuestSystem carregado e exportado para window.QuestSystem');
