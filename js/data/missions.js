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

    // ===== MISSÕES APRIMORADAS (cadeias, escolhas, consequências) =====
    // ===== STORY MISSION CHAIN: "A NOVA GESTORA" =====
    story_chain_01_01: {
        title: 'A Nova Gestora: Primeiro Dia',
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

};
