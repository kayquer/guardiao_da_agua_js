/**
 * Missões, por id, na ordem de registro. Registradas por QuestSystem.initializeQuests().
 * Carregado antes dos sistemas (index.html). Só dados: sem funções, sem `this`.
 */
const MISSIONS = {

    // ===== MISSÕES PRINCIPAIS (PRIMARY) =====
    tutorial_01: {
        title: 'Boas-vindas, {nome}!',
        description: 'Construa sua primeira bomba de água para começar a fornecer água à população.',
        type: 'primary',
        category: 'primary',
        difficulty: 'beginner',
        estimatedTime: '5 minutos',
        lesson: 1, // aula ao concluir: a água do planeta: de onde vem a água da bomba
        prerequisites: [],
        stars: { parMs: 180000 }, // ⭐⭐ em até 3 min de jogo; ⭐⭐⭐ cidade sem recurso no vermelho (QuestSystem.computeStars)
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
            recommendStudy: ['water_well'], // estudo é o caminho do desbloqueio: a missão só aponta
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
        lesson: 4, // aula ao concluir: a vida no rio: o esgoto que a estação trata
        prerequisites: ['tutorial_01'],
        stars: { parMs: 420000 },
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
            freeBuilds: { tree_sapling: 3 }, // 3 mudas de graça: árvore perto do rio limpa mais
            score: 200,
            budget: 3000,
            recommendStudy: ['filter_station']
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
        lesson: 5, // aula ao concluir: água escondida: aquíferos e reservatórios
        prerequisites: ['tutorial_02'],
        stars: { parMs: 420000 },
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
            discount: { water_tower: 50 }, // a próxima Torre d'Água sai pela metade
            score: 150,
            budget: 2500,
            recommendStudy: ['water_tower']
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
        lesson: 6, // aula ao concluir: soluções verdes: crescer sem sujar o rio
        prerequisites: ['tutorial_03'],
        stars: { parMs: 900000 },
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
            emergency: 1, // mais uma declaração de emergência (GameOverSystem.extraEmergencies)
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
        description: 'Uma seca chegou: as bombas e poços produzem metade da água. Aguente 4 minutos sem deixar a água faltar.',
        type: 'challenge',
        category: 'secondary',
        lesson: 2, // aula ao concluir: o caminho da água: por que a seca acontece
        prerequisites: ['tutorial_03'],
        stars: { minWater: 0.3 }, // ⭐⭐ sem deixar a reserva baixar de 30% durante a seca
        startEvent: { type: 'drought', durationMs: 240000 }, // a missão começa a seca (QuestSystem.startQuest)
        objectives: [
            {
                id: 'survive_drought',
                description: 'Sobreviver à seca por 4 minutos',
                type: 'survival',
                target: 'time',
                current: 0,
                required: 240
            },
            {
                id: 'no_water_shortage',
                description: 'Não deixar faltar água (a reserva não pode secar)',
                type: 'avoid',
                target: 'water_shortage',
                current: 0,
                required: 0
            }
        ],
        rewards: {
            discount: { water_well: 50 }, // o próximo Poço Artesiano sai pela metade
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
        lesson: 3, // aula ao concluir: água para todos: dividir a água entre os grupos
        prerequisites: ['tutorial_01'],
        stars: { parMs: 480000 },
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
            earlyWarningMs: 600000, // 10 min de jogo com os eventos avisando com o dobro de antecedência
            score: 150,
            budget: 3000,
            experience: 75,
            reputation: { government: 3 }
        }
    },

    // ===== FIM DA CAMPANHA =====
    // victory: true → tela "Cidade Guardiã" (GameOverSystem.showVictory) e o jogo segue no modo livre
    final_01: {
        title: 'Cidade Guardiã',
        description: 'Mostre que sua cidade cresce sem acabar com a água: muita gente, rio limpo, aquífero cheio e moradores felizes.',
        type: 'main',
        category: 'primary',
        prerequisites: ['main_01', 'challenge_01'],
        stars: { parMs: 1200000 },
        missionIcon: '🏆',
        victory: true,
        objectives: [
            {
                id: 'final_population',
                description: 'Chegar a 1.200 moradores',
                type: 'resource',
                target: 'population',
                current: 0,
                required: 1200,
                comparison: 'greater'
            },
            {
                id: 'final_pollution',
                description: 'Manter a poluição abaixo de 25%',
                type: 'resource',
                target: 'pollution',
                current: 0,
                required: 25,
                comparison: 'less'
            },
            {
                id: 'final_aquifer',
                description: 'Manter o aquífero acima de 50% (água debaixo da terra)',
                type: 'resource',
                target: 'aquifer',
                current: 0,
                required: 50,
                comparison: 'greater'
            },
            {
                id: 'final_satisfaction',
                description: 'Satisfação acima de 75% por 3 minutos',
                type: 'sustained',
                target: 'satisfaction',
                current: 0,
                required: 180,
                threshold: 75
            }
        ],
        rewards: {
            score: 1000,
            budget: 20000,
            achievement: 'guardian_city'
        },
        educationalContent: {
            facts: [
                'Uma cidade só cresce de verdade se a água que ela usa continua existindo para as próximas gerações.'
            ],
            tips: [
                'Use áreas verdes para segurar a chuva e recarregar o aquífero.',
                'Trate o esgoto antes que ele chegue ao rio.'
            ]
        }
    },

};

/** Conquistas (QuestSystem.unlockAchievement): nome e ícone mostrados no toast e no painel de missões. */
const ACHIEVEMENTS = {
    sustainable_city: { icon: '🌱', name: 'Cidade Sustentável', description: 'Cresceu com a população feliz e o rio limpo.' },
    crisis_manager: { icon: '☀️', name: 'Gestora de Crise', description: 'Atravessou uma seca sem deixar faltar água.' },
    guardian_city: { icon: '🏆', name: 'Cidade Guardiã', description: 'Terminou a campanha cuidando da água de todos.' },
    climate_guardian: { icon: '🌦️', name: 'Guardião do Clima', description: 'Respondeu bem a cinco eventos com o Secretário Paulo.' }
};
