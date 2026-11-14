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
        // ⭐⭐ em até 3 min de jogo; ⭐⭐⭐ bacia saudável (QuestSystem.computeStars) — sem contar a energia, que é a
        // missão seguinte (energy_01): a bomba fica pronta antes do sol e a 3ª estrela era impossível
        stars: { parMs: 180000, ignore: ['energy'] },
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
                'A bomba puxa a água guardada nos espaços entre a areia e as rochas, debaixo da terra.',
                'Se a água sai do aquífero mais depressa do que a chuva repõe, o nível dele baixa.',
                'Aquíferos são camadas de rocha e areia que guardam água debaixo da terra.'
            ],
            factSources: [
                { label: 'IAT-PR — Águas subterrâneas', url: 'https://www.iat.pr.gov.br/Pagina/Aguas-Subterraneas-Origem-e-ocorrencia' },
                { label: 'USGS — Aquíferos e água subterrânea', url: 'https://www.usgs.gov/special-topics/water-science-school/science/aquifers-and-groundwater' }
            ],
            tips: [
                'Posicione bombas longe de fontes de poluição.',
                'Diversifique suas fontes de água para maior segurança.',
                'Monitore a qualidade da água regularmente.'
            ]
        }
    },

    // Logo depois da bomba (11/2026): a bomba precisa de energia e a cidade não tinha nenhuma; o jogador ficava sem o
    // que fazer. O sol é o começo mais barato (Microgeração Solar)
    energy_01: {
        title: 'Energia para a Bomba',
        description: 'A bomba precisa de energia para puxar a água. O jeito mais barato de começar é o sol: uma microgeração solar, a menor usina que a ANEEL permite ligar na rede.',
        type: 'tutorial',
        category: 'secondary',
        difficulty: 'beginner',
        estimatedTime: '3 minutos',
        prerequisites: ['tutorial_01'],
        stars: { parMs: 180000 },
        missionIcon: '⚡',
        objectives: [
            { id: 'first_solar', description: 'Construir 1 Microgeração Solar', type: 'build', target: 'solar_micro', current: 0, required: 1 }
        ],
        rewards: {
            score: 100,
            budget: 1500,
            freeBuilds: { tree_sapling: 3 }, // as mudas da próxima missão
            experience: 40
        },
        educationalContent: {
            concepts: ['energia elétrica', 'energia solar', 'geração distribuída'],
            facts: ['Bombas, estações de tratamento e casas usam energia elétrica: sem ela, a água não chega às torneiras.'],
            factSources: [
                { label: 'Governo de Goiás — Energia que bombeia a água', url: 'https://agencia.go.gov.br/especial/saneago-implanta-tecnologia-de-eficiencia-energetica-da-qual-e-pioneira-na-america-latina/' },
                { label: 'ANEEL — Geração distribuída', url: 'https://www.gov.br/aneel/pt-br/assuntos/geracao-distribuida' }
            ],
            tips: ['Gere sempre um pouco mais de energia do que a cidade usa: cada obra nova aumenta o consumo.']
        }
    },

    tutorial_02: {
        title: 'Tratando a Poluição',
        description: 'A poluição está afetando a qualidade da água. Construa uma estação de tratamento.',
        type: 'tutorial',
        category: 'secondary',
        lesson: 4, // aula ao concluir: a vida no rio: o esgoto que a estação trata
        prerequisites: ['story_chain_01_01'], // depois do primeiro bairro (com moradores, o esgoto aparece)
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
                'Estações de tratamento tiram a sujeira e os micróbios da água antes de ela chegar às casas.',
                'Tratar a água e o esgoto é uma das formas mais eficazes de evitar doenças como diarreia, hepatite A e cólera (OMS).'
            ],
            factSources: [
                { label: 'SAAE Santa Maria da Vitória — Como funciona uma ETA', url: 'https://www.saaesmv.ba.gov.br/2023/08/08/como-funciona-uma-estacao-de-tratamento-de-agua/' },
                { label: 'OMS — Água potável', url: 'https://www.who.int/news-room/fact-sheets/detail/drinking-water' }
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
                'A reserva dá tempo para a cidade reagir quando a produção cai, como numa seca ou num conserto.'
            ],
            factSources: [
                { label: 'Semae São Leopoldo — Por que ter um reservatório', url: 'https://semae.rs.gov.br/sustentabilidade-beneficios-de-ter-um-reservatorio-de-agua/' },
                { label: 'Prefeitura de Sorocaba — Reservação de água', url: 'https://agencia-local.sorocaba.sp.gov.br/capacidade-de-reservacao-de-agua-ultrapassa-100-milhoes/' }
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
        prerequisites: ['city_03'], // 11/2026: depois do comércio (campanha ampliada)
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
            factSources: [
                { label: 'ONU Brasil — ODS 11: cidades sustentáveis', url: 'https://brasil.un.org/pt-br/sdgs/11' },
                { label: 'Ipea — ODS 6: água e saneamento', url: 'https://ipea.gov.br/ods/ods6.html' }
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
            },
            // 'hold': vale só enquanto a seca dura (QuestSystem.checkObjectiveProgress)
            { id: 'river_in_drought', description: 'Durante a seca, não deixar o rio baixar de 30%', type: 'hold', target: 'river', current: 0, required: 0, threshold: 30 }
        ],
        rewards: {
            discount: { water_well: 50 }, // o próximo Poço Artesiano sai pela metade
            score: 300,
            budget: 5000,
            achievement: 'crisis_manager'
        },
        educationalContent: {
            facts: [
                'Uma seca pode durar poucos meses ou muito mais tempo, por isso a cidade precisa se planejar antes.',
                'Economizar água durante a seca ajuda a manter as represas com água por mais tempo.'
            ],
            factSources: [
                { label: 'ANA — Monitor de Secas', url: 'https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/eventos-criticos/monitor-de-secas' },
                { label: 'Governo de SP — Estiagem e economia de água', url: 'https://semil.sp.gov.br/2025/12/calor-e-estiagem-pressionam-mananciais-e-governo-de-sp-alerta-populacao-para-reducao-imediata-do-consumo-de-agua/' }
            ],
            tips: [
                'Implemente medidas de conservação antes da crise.',
                'Diversifique suas fontes de água para maior resiliência.'
            ]
        }
    },

    // ===== MISSÕES APRIMORADAS (cadeias, escolhas, consequências) =====
    // ===== STORY MISSION CHAIN: "A NOVA GESTORA" =====
    // Meta de tier 1 (zona leve + mudas): era a Estação de Monitoramento, tier 3, ≈ R$ 52 mil em cadeia e 4 estudos
    story_chain_01_01: {
        title: 'A Nova Gestão: Primeiro Dia',
        description: 'Você assumiu a gestão da água da cidade. Traga os primeiros moradores e comece a cuidar da beira do rio.',
        type: 'story',
        category: 'secondary',
        lesson: 3, // aula ao concluir: água para todos: dividir a água entre os grupos
        prerequisites: ['energy_01'],
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
                id: 'first_neighbourhood',
                description: 'Abrir o primeiro bairro (1 Zona Residencial Leve)',
                type: 'build',
                target: 'zone_residential_light',
                current: 0,
                required: 1
            },
            {
                id: 'plant_riverbank',
                description: 'Plantar 3 Mudas de Árvore (na beira do rio elas limpam mais)',
                type: 'build',
                target: 'tree_sapling',
                current: 0,
                required: 3
            },
            {
                // era "satisfação > 60%", que já começa cumprida (a cidade abre com ~90%): meta vazia. Com 30 moradores e
                // lugar para 40 (ResourceManager.BASE_POPULATION_CAPACITY), os 50 só cabem com a zona pronta
                id: 'first_residents',
                description: 'Receber moradores na zona nova (chegar a 50 habitantes)',
                type: 'resource',
                target: 'population',
                current: 0,
                required: 50,
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

    // ===== CAMPANHA AMPLIADA (11/2026, auditoria): 18 missões em atos, alternando crise e calma, rio, cidade e campo =====
    // Ato 1 (aprender): tutorial_01 → 02 → 03; tutorial_01 → Nova Gestão 1 → 2 → Cílios do Rio
    // Ato 2 (crescer): tutorial_03 → Bairro com Quintal e Crise Hídrica; Cílios do Rio → Chuva para Guardar;
    //                  Bairro + Chuva → Enxurrada; Crise Hídrica → Queimada no Campo
    // Ato 3 (sustentar): Enxurrada → Nova Gestão 3 (esgoto) → Comércio que Respeita o Rio → Cidade Sustentável
    //                    → Indústria que Cuida do Rio; Nova Gestão 3 → Nova Gestão 4 (cidade esponja)
    // Ato 4 (provar): Indústria + Queimada → Seca Longa; Seca Longa + Nova Gestão 4 → Cidade Guardiã (vitória)
    story_chain_01_02: {
        title: 'A Nova Gestão: Luz que Não Suja',
        description: 'A cidade precisa de mais energia, e o jeito de gerar faz diferença para o ar e para o rio. Some o vento ao sol.',
        type: 'story',
        category: 'secondary',
        prerequisites: ['story_chain_01_01'],
        stars: { parMs: 480000 },
        chainId: 'nova_gestora',
        chainPosition: 2,
        missionIcon: '⚡',
        objectives: [
            { id: 'first_wind', description: 'Construir 1 Aerogerador Pequeno', type: 'build', target: 'wind_small', current: 0, required: 1 },
            { id: 'clean_air', description: 'Manter a poluição abaixo de 35%', type: 'resource', target: 'pollution', current: 0, required: 35, comparison: 'less' },
            { id: 'good_call', description: 'Tomar 1 boa decisão com o Secretário Paulo', type: 'decisions', target: 'good', current: 0, required: 1 }
        ],
        rewards: {
            discount: { solar_farm: 30 }, // a próxima Usina Solar sai 30% mais barata
            score: 200,
            budget: 3000,
            recommendStudy: ['solar_farm'],
            reputation: { environment: 2 }
        },
        educationalContent: {
            facts: ['Vento e sol geram energia sem queimar nada; usinas que queimam carvão, petróleo ou gás soltam gases que poluem o ar.'],
            factSources: [
                { label: 'EPE — Fontes de energia', url: 'https://www.epe.gov.br/pt/abcdenergia/fontes-de-energia' }
            ],
            tips: ['Energia limpa no começo evita ter de limpar a poluição depois.']
        }
    },

    river_01: {
        title: 'Cílios do Rio',
        description: 'Árvores na beira do rio funcionam como cílios: seguram a terra e a sujeira antes que caiam na água. Plante a mata ciliar.',
        type: 'story',
        category: 'secondary',
        prerequisites: ['story_chain_01_02'],
        stars: { parMs: 600000 },
        missionIcon: '🌳',
        objectives: [
            { id: 'riparian_saplings', description: 'Plantar 6 Mudas de Árvore na mata ciliar (até 2 blocos do rio)', type: 'riparian', target: 'tree_sapling', current: 0, required: 6 },
            { id: 'river_full', description: 'Manter o rio acima de 70%', type: 'resource', target: 'river', current: 0, required: 70, comparison: 'greater' },
            { id: 'river_life', description: 'Registrar 3 bichos no Caderno de Campo (toque neles no mapa)', type: 'notebook', target: 'registered', current: 0, required: 3 }
        ],
        rewards: {
            discount: { rain_garden: 40 },
            score: 250,
            budget: 3000,
            recommendStudy: ['rain_garden']
        },
        educationalContent: {
            facts: ['Mata ciliar é a vegetação da beira de rios e lagos. Sem ela, a chuva leva terra para a água e o rio fica raso e turvo.'],
            factSources: [
                { label: 'Embrapa — Importância das matas ciliares', url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/703807' },
                { label: 'Embrapa Semiárido — Matas ciliares do São Francisco', url: 'https://www.embrapa.br/busca-de-publicacoes/-/publicacao/153157/a-importancia-das-matas-ciliares-do-rio-sao-francisco' }
            ],
            tips: ['Plante as mudas coladas na água: lá cada árvore limpa bem mais.']
        }
    },

    city_02: {
        title: 'Bairro com Quintal',
        description: 'Gente nova quer morar na cidade. Casas com quintal deixam a chuva entrar na terra e gastam menos água que prédios altos.',
        type: 'story',
        category: 'secondary',
        prerequisites: ['tutorial_03'],
        stars: { parMs: 600000 },
        missionIcon: '🏡',
        objectives: [
            { id: 'light_homes', description: 'Ter 3 Zonas Residenciais Leves', type: 'build', target: 'zone_residential_light', current: 0, required: 3 },
            { id: 'neighbours', description: 'Chegar a 250 moradores', type: 'resource', target: 'population', current: 0, required: 250, comparison: 'greater' }
        ],
        rewards: {
            freeBuilds: { tree_sapling: 3 },
            score: 250,
            budget: 4000
        }
    },

    challenge_02: {
        title: 'Chuva para Guardar',
        description: 'Vem aí uma chuva forte. Água de chuva que entra na terra enche o aquífero; a que escorre pelo asfalto vai embora.',
        type: 'challenge',
        category: 'secondary',
        prerequisites: ['river_01'],
        stars: { parMs: 300000 },
        startEvent: { type: 'heavy_rain', durationMs: 120000 },
        missionIcon: '🌧️',
        objectives: [
            { id: 'rain_garden', description: 'Construir 1 Jardim de Chuva', type: 'build', target: 'rain_garden', current: 0, required: 1 },
            { id: 'aquifer_up', description: 'Encher o aquífero acima de 75%', type: 'resource', target: 'aquifer', current: 0, required: 75, comparison: 'greater' }
        ],
        rewards: {
            earlyWarningMs: 600000, // 10 min com os avisos de evento chegando antes
            score: 300,
            budget: 4000
        },
        educationalContent: {
            facts: ['Jardins de chuva são canteiros que recebem a enxurrada: a água afunda devagar na terra e sobra menos para os bueiros.'],
            factSources: [
                { label: 'Prefeitura de SP — Jardins de chuva', url: 'https://prefeitura.sp.gov.br/web/sampa-news/w/cidade-passar%C3%A1-a-ter-530-jardins-de-chuva-com-implanta%C3%A7%C3%A3o-de-mais-103-na-regi%C3%A3o-da-s%C3%A9' }
            ],
            tips: ['Quanto mais chão de terra e verde, mais chuva vira água guardada.']
        }
    },

    challenge_03: {
        title: 'Enxurrada',
        description: 'Uma chuva muito forte chegou de uma vez. Aguente a enxurrada sem deixar a poluição do rio passar do limite.',
        type: 'challenge',
        category: 'secondary',
        prerequisites: ['challenge_02', 'city_02'],
        stars: { minWater: 0.3 },
        startEvent: { type: 'flood', durationMs: 90000 },
        missionIcon: '🌊',
        objectives: [
            { id: 'survive_flood', description: 'Atravessar 90 segundos de enxurrada', type: 'survival', target: 'time', current: 0, required: 90 },
            { id: 'river_ok', description: 'Manter a poluição abaixo de 50%', type: 'resource', target: 'pollution', current: 0, required: 50, comparison: 'less' }
        ],
        rewards: {
            discount: { erosion_control: 50 },
            score: 350,
            budget: 5000,
            achievement: 'flood_ready'
        },
        educationalContent: {
            facts: ['Cidade com muito asfalto e pouco verde sofre enchentes maiores: a água não tem onde entrar.'],
            factSources: [
                { label: 'USGS — Escoamento da chuva', url: 'https://www.usgs.gov/special-topics/water-science-school/science/runoff-surface-and-overland-water-runoff' },
                { label: 'Prefeitura de SP — Jardins de chuva', url: 'https://prefeitura.sp.gov.br/web/sampa-news/w/cidade-passar%C3%A1-a-ter-530-jardins-de-chuva-com-implanta%C3%A7%C3%A3o-de-mais-103-na-regi%C3%A3o-da-s%C3%A9' }
            ],
            tips: ['Antes da próxima chuva forte, troque asfalto por cascalho onde der e plante perto do rio.']
        }
    },

    challenge_04: {
        title: 'Queimada no Campo',
        description: 'O tempo está seco e o mato pegou fogo perto da cidade. Aguente a fumaça sem deixar a poluição explodir.',
        type: 'challenge',
        category: 'secondary',
        prerequisites: ['challenge_01'],
        stars: { minWater: 0.3 },
        startEvent: { type: 'wildfire', durationMs: 120000 },
        missionIcon: '🔥',
        objectives: [
            { id: 'survive_fire', description: 'Atravessar 2 minutos de queimada', type: 'survival', target: 'time', current: 0, required: 120 },
            { id: 'smoke_limit', description: 'Manter a poluição abaixo de 60%', type: 'resource', target: 'pollution', current: 0, required: 60, comparison: 'less' }
        ],
        rewards: {
            discount: { fire_station: 50 },
            score: 350,
            budget: 5000
        },
        educationalContent: {
            facts: ['Depois da queimada o solo fica pelado: a chuva bate direto na terra e a enxurrada leva o solo embora.'],
            factSources: [
                { label: 'Embrapa — Queimadas e o solo', url: 'https://www.embrapa.br/busca-de-noticias/-/noticia/92020089/queimadas-diminuem-qualidade-do-solo-e-aumentam-custos-da-producao' }
            ],
            tips: ['Bombeiros e mata ciliar bem cuidada protegem a cidade e o rio do fogo.']
        }
    },

    story_chain_01_03: {
        title: 'A Nova Gestão: A Conta do Esgoto',
        description: 'Cada morador produz esgoto. Com a cidade crescendo, uma estação só não dá conta: o rio sente primeiro.',
        type: 'story',
        category: 'secondary',
        prerequisites: ['challenge_03'],
        stars: { parMs: 900000 },
        chainId: 'nova_gestora',
        chainPosition: 3,
        missionIcon: '🚰',
        objectives: [
            { id: 'two_ete', description: 'Ter 2 Estações de Tratamento de Esgoto', type: 'build', target: 'treatment_plant', current: 0, required: 2 },
            { id: 'grow_clean', description: 'Chegar a 500 moradores', type: 'resource', target: 'population', current: 0, required: 500, comparison: 'greater' },
            { id: 'river_clean', description: 'Manter a poluição abaixo de 30%', type: 'resource', target: 'pollution', current: 0, required: 30, comparison: 'less' }
        ],
        rewards: {
            freeBuilds: { tree_sapling: 5 },
            score: 400,
            budget: 8000,
            reputation: { environment: 3, citizens: 2 }
        },
        educationalContent: {
            facts: ['Esgoto sem tratamento gasta o oxigênio da água do rio, e sem oxigênio os peixes não sobrevivem.'],
            factSources: [
                { label: 'Prefeitura de SP — Esgoto e os peixes dos córregos', url: 'https://prefeitura.sp.gov.br/web/meio_ambiente/w/noticias/231548' },
                { label: 'USGS — Oxigênio dissolvido', url: 'https://www.usgs.gov/special-topics/water-science-school/science/dissolved-oxygen-and-water' }
            ],
            tips: ['Antes de abrir bairros novos, veja se o tratamento dá conta de mais gente.']
        }
    },

    city_03: {
        title: 'Comércio que Respeita o Rio',
        description: 'Lojas trazem empregos e impostos. Faça o comércio crescer sem deixar os moradores insatisfeitos.',
        type: 'story',
        category: 'secondary',
        prerequisites: ['story_chain_01_03'],
        stars: { parMs: 900000 },
        missionIcon: '🛍️',
        objectives: [
            { id: 'shops', description: 'Ter 2 Zonas Comerciais Leves', type: 'build', target: 'zone_commercial_light', current: 0, required: 2 },
            { id: 'happy_city', description: 'Manter a satisfação acima de 70% por 2 minutos', type: 'sustained', target: 'satisfaction', current: 0, required: 120, threshold: 70 }
        ],
        rewards: {
            score: 400,
            budget: 8000,
            reputation: { business: 3 }
        }
    },

    story_chain_01_04: {
        title: 'A Nova Gestão: Cidade Esponja',
        description: 'Uma cidade esponja segura a chuva onde ela cai: parques, jardins e telhados verdes enchem o aquífero em vez de alagar a rua.',
        type: 'story',
        category: 'secondary',
        prerequisites: ['story_chain_01_03'],
        stars: { parMs: 1200000 },
        chainId: 'nova_gestora',
        chainPosition: 4,
        missionIcon: '🧽',
        objectives: [
            { id: 'linear_park', description: 'Construir 1 Parque Linear', type: 'build', target: 'linear_park', current: 0, required: 1 },
            { id: 'aquifer_ok', description: 'Manter o aquífero acima de 60%', type: 'resource', target: 'aquifer', current: 0, required: 60, comparison: 'greater' },
            { id: 'sponge_city', description: 'Cidade-esponja: no máximo 50% do chão construído coberto (asfalto e telhado)', type: 'impervious', target: 'city', current: 0, required: 50 },
            { id: 'rare_guest', description: 'Registrar 1 bicho ameaçado de extinção no Caderno de Campo', type: 'notebook', target: 'threatened', current: 0, required: 1 }
        ],
        rewards: {
            emergency: 1,
            score: 500,
            budget: 10000,
            reputation: { environment: 3, government: 2 }
        },
        educationalContent: {
            facts: ['Parques lineares acompanham o rio: dão lazer para a cidade e espaço para a água quando ele enche.'],
            factSources: [
                { label: 'Prefeitura de SP — Parques lineares', url: 'https://prefeitura.sp.gov.br/w/prefeitura-inaugura-parque-linear-da-vila-princesa-isabel-na-zona-leste' }
            ],
            tips: ['Quem segura a chuva ganha duas vezes: menos enchente e mais água guardada debaixo da terra.']
        }
    },

    main_02: {
        title: 'Indústria que Cuida do Rio',
        description: 'A cidade quer fábricas e empregos. Traga a indústria com o tratamento da água pronto antes.',
        type: 'main',
        category: 'primary',
        prerequisites: ['main_01'],
        stars: { parMs: 1200000 },
        missionIcon: '🏭',
        objectives: [
            { id: 'filters', description: 'Construir 1 Estação de Filtros', type: 'build', target: 'filter_station', current: 0, required: 1 },
            { id: 'factories', description: 'Ter 2 Zonas Industriais Leves', type: 'build', target: 'zone_industrial_light', current: 0, required: 2 },
            { id: 'still_clean', description: 'Manter a poluição abaixo de 40%', type: 'resource', target: 'pollution', current: 0, required: 40, comparison: 'less' }
        ],
        rewards: {
            score: 600,
            budget: 12000,
            achievement: 'clean_industry',
            reputation: { business: 3, environment: 2 }
        }
    },

    challenge_05: {
        title: 'Seca Longa',
        description: 'A maior seca em anos: bombas, poços e rio rendem bem menos por 6 minutos. É a prova de tudo o que a cidade guardou.',
        type: 'challenge',
        category: 'secondary',
        prerequisites: ['main_02', 'challenge_04'],
        stars: { minWater: 0.25 },
        startEvent: { type: 'drought', durationMs: 360000 },
        missionIcon: '🏜️',
        objectives: [
            { id: 'survive_long_drought', description: 'Atravessar 6 minutos de seca', type: 'survival', target: 'time', current: 0, required: 360 },
            { id: 'no_shortage_long', description: 'Não deixar faltar água (a reserva não pode secar)', type: 'avoid', target: 'water_shortage', current: 0, required: 0 }
        ],
        rewards: {
            score: 700,
            budget: 15000,
            achievement: 'long_drought'
        },
        educationalContent: {
            facts: ['Com o clima mudando, as secas estão ficando mais frequentes. Cidades que guardam água e protegem o aquífero atravessam melhor.'],
            factSources: [
                { label: 'ANA — Mudança climática e água', url: 'https://www.gov.br/ana/pt-br/assuntos/gestao-das-aguas/panorama-das-aguas/mudancas-climaticas-recursos-hidricos' },
                { label: 'ANA — Dez anos do Monitor de Secas', url: 'https://www.gov.br/ana/pt-br/assuntos/noticias-e-eventos/noticias/monitor-de-secas-completa-dez-anos-registrando-o-fenomeno-como-realidade-recorrente-em-todas-as-regioes-brasileiras' }
            ],
            tips: ['Reservatórios cheios, aquífero alto e consumo baixo: é isso que segura uma seca longa.']
        }
    },

    // ===== FIM DA CAMPANHA =====
    // victory: true → tela "Cidade Guardiã" (GameOverSystem.showVictory) e o jogo segue no modo livre
    final_01: {
        title: 'Cidade Guardiã',
        description: 'Mostre que sua cidade cresce sem acabar com a água: muita gente, rio limpo, aquífero cheio e moradores felizes.',
        type: 'main',
        category: 'primary',
        prerequisites: ['challenge_05', 'story_chain_01_04'],
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
            factSources: [
                { label: 'ONU Brasil — ODS 6: água e saneamento', url: 'https://brasil.un.org/pt-br/sdgs/6' }
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
    crisis_manager: { icon: '☀️', name: 'Gestão de Crise', description: 'Atravessou uma seca sem deixar faltar água.' },
    guardian_city: { icon: '🏆', name: 'Cidade Guardiã', description: 'Terminou a campanha cuidando da água de todos.' },
    climate_guardian: { icon: '🌦️', name: 'Guardião do Clima', description: 'Respondeu bem a cinco eventos com o Secretário Paulo.' },
    flood_ready: { icon: '🌊', name: 'Cidade Preparada', description: 'Atravessou uma enxurrada sem sujar o rio.' },
    clean_industry: { icon: '🏭', name: 'Indústria Limpa', description: 'Trouxe as fábricas sem deixar a poluição passar do limite.' },
    long_drought: { icon: '🏜️', name: 'Seca Longa', description: 'Atravessou seis minutos de seca sem faltar água.' }
};
