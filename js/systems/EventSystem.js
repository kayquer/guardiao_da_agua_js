/**
 * GUARDIÃO DA ÁGUA - EVENT SYSTEM
 * Sistema de eventos dinâmicos e aleatórios
 *
 * Eventos com `response` não começam sozinhos: viram um anúncio (pendingEvents, awaiting) e o Secretário de Meio
 * Ambiente Paulo pergunta o que fazer (modal, ui/EventDecisionUI.js). Quatro opções, sempre com troca real:
 *   threat (seca, enchente...): max/mid/low cortam o impacto (impact 0,2–0,8) e a duração; "não fazer nada" = tudo;
 *   opportunity (chuva, subsídio...): max/mid/low aproveitam 100% / 50% / 20% (gain); "não fazer nada" perde tudo.
 * A melhor opção custa mais e costuma pedir um prédio (requires): planejar a cidade abre respostas melhores.
 * Boas decisões em sequência dão prêmio (STREAK_BONUS) e a conquista "Guardião do Clima"; no fim do evento o
 * Paulo diz quanto do estrago foi evitado (ou do benefício foi aproveitado). Desenho: trocas com custo de
 * oportunidade, aviso antes (dá para se preparar), metas de médio prazo e retorno claro de cada escolha.
 */

class EventSystem {
    constructor(gameManager) {
        log('⚡ Inicializando EventSystem...');
        
        this.gameManager = gameManager;
        
        // Eventos
        this.eventTypes = new Map();
        this.activeEvents = new Map();
        this.pendingEvents = []; // anúncios/avisos: { id, type, total, remainingTime, choiceId, awaiting } (announceEvent)
        this.responseStats = { total: 0, good: 0, best: 0, missed: 0, streak: 0 }; // decisões do jogador (recompensas)
        this.eventHistory = [];
        
        // Configurações
        this.eventFrequency = GAME_CONFIG.gameplay.eventFrequency; // 1 minuto
        this.lastEventTime = 0;
        this.eventProbability = 0.3; // 30% de chance por verificação
        
        // Estado
        this.eventsEnabled = true;
        this.difficultyMultiplier = 1.0;
        
        this.initializeEventTypes();
        
        log('✅ EventSystem inicializado');
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeEventTypes() {
        log('⚡ Definindo tipos de eventos...');
        
        // EVENTOS CLIMÁTICOS
        this.addEventType('drought', {
            name: 'Seca',
            description: 'Uma seca severa está afetando a região, reduzindo a produção de água.',
            category: 'climate',
            severity: 'high',
            duration: 120000, // 2 minutos
            probability: 0.15,
            icon: '☀️',
            warning: true, // chega com aviso (EventSystem.warnEvent)
            effects: {
                waterProductionMultiplier: 0.5,
                pollutionIncrease: 5
            },
            response: {
                kind: 'threat',
                intro: '{nome}, a previsão é de semanas sem chuva. Os rios vão baixar e as bombas vão render a metade. Como a cidade enfrenta a seca?',
                options: [
                    { id: 'plan', tier: 'max', label: 'Plano de seca completo', cost: 6000, impact: 0.25, duration: 0.5,
                        detail: 'Rodízio combinado com os bairros, caminhões-pipa e água guardada nos reservatórios.',
                        requires: [{ ids: ['water_tank', 'water_tower'], count: 1, label: 'Reservatório ou Caixa d\'Água' }],
                        reputation: { environment: 3, citizens: 1 } },
                    { id: 'campaign', tier: 'mid', label: 'Campanha de economia', cost: 2500, impact: 0.5, duration: 0.75,
                        detail: 'Escolas, rádio e redes ensinam a fechar a torneira e reaproveitar água.', reputation: { environment: 2 } },
                    { id: 'notice', tier: 'low', label: 'Aviso nas redes', cost: 500, impact: 0.8, duration: 0.9,
                        detail: 'Um recado pedindo economia. Barato, mas pouca gente muda o hábito.' },
                    { id: 'none', tier: 'none', label: 'Não fazer nada', impact: 1, duration: 1,
                        detail: 'A seca chega com força total.', reputation: { citizens: -2 } }
                ]
            },
            educationalContent: {
                message: 'Secas são períodos prolongados de baixa precipitação que podem durar meses ou anos.',
                tips: [
                    'Implemente medidas de conservação de água',
                    'Diversifique suas fontes hídricas',
                    'Construa reservatórios para guardar água da chuva'
                ]
            }
        });
        
        this.addEventType('flood', {
            name: 'Enchente',
            description: 'Chuvas intensas causaram enchentes: prédios atingidos rendem menos até você consertá-los.',
            category: 'climate',
            severity: 'medium',
            duration: 60000, // 1 minuto
            probability: 0.12,
            icon: '🌊',
            warning: true,
            effects: {
                // × risco de enchente (asfalto − áreas verdes, EventSystem.getFloodRisk); conserto no painel do prédio
                infrastructureDamage: 0.1,
                pollutionIncrease: 15 // a enxurrada leva sujeira para o rio
            },
            response: {
                kind: 'threat',
                intro: '{nome}, vem aí uma chuva muito forte. Onde tem muito asfalto, a água não entra no chão e vira enxurrada. O que fazemos antes que ela chegue?',
                options: [
                    { id: 'drain', tier: 'max', label: 'Abrir piscinões e áreas verdes', cost: 7000, impact: 0.2, duration: 0.5,
                        detail: 'Jardins de chuva e parques seguram a água; a Defesa Civil tira as famílias das áreas de risco.',
                        requires: [{ ids: ['rain_garden', 'linear_park', 'green_roof'], count: 1, label: 'Jardim de Chuva, Parque Linear ou Teto Verde' }],
                        reputation: { citizens: 3, environment: 2 } },
                    { id: 'barriers', tier: 'mid', label: 'Barreiras e sacos de areia', cost: 4000, impact: 0.5, duration: 0.75,
                        detail: 'Protege as ruas mais baixas e os prédios importantes.', reputation: { citizens: 2 } },
                    { id: 'drains', tier: 'low', label: 'Limpar os bueiros', cost: 1000, impact: 0.8, duration: 0.9,
                        detail: 'Bueiro limpo escoa melhor, mas não segura uma chuva grande.' },
                    { id: 'none', tier: 'none', label: 'Não fazer nada', impact: 1, duration: 1,
                        detail: 'A enxurrada estraga prédios e suja o rio.', reputation: { citizens: -3 } }
                ]
            },
            educationalContent: {
                message: 'Enchentes podem contaminar fontes de água e danificar sistemas de tratamento.',
                tips: [
                    'Construa sistemas de drenagem adequados',
                    'Eleve estruturas críticas acima do nível de enchente',
                    'Tenha planos de emergência para contaminação'
                ]
            }
        });
        
        this.addEventType('heavy_rain', {
            name: 'Chuva Intensa',
            description: 'Chuvas intensas estão reabastecendo os reservatórios naturais.',
            category: 'climate',
            severity: 'low',
            duration: 45000, // 45 segundos
            probability: 0.25,
            icon: '🌧️',
            effects: {
                waterProductionBonus: 20,
                pollutionReduction: 5,
                aquiferRecharge: 4 // a chuva infiltra e enche o aquífero
            },
            response: {
                kind: 'opportunity',
                intro: '{nome}, vai chover bastante, e chuva é água de graça! Quanto dela a cidade vai conseguir guardar?',
                options: [
                    { id: 'harvest', tier: 'max', label: 'Captar tudo', cost: 3000, gain: 1,
                        detail: 'Cisternas, jardins de chuva e reservatórios abertos: a chuva enche a caixa e o aquífero.',
                        requires: [{ ids: ['rain_garden', 'water_tank', 'water_tower'], count: 1, label: 'Jardim de Chuva ou Reservatório' }],
                        instant: { water: 200 }, reputation: { environment: 3 } },
                    { id: 'reservoirs', tier: 'mid', label: 'Encher os reservatórios', cost: 1200, gain: 0.5,
                        detail: 'Uma parte da chuva vai para a rede da cidade.', reputation: { environment: 1 } },
                    { id: 'buckets', tier: 'low', label: 'Pedir que guardem água da chuva', cost: 200, gain: 0.2,
                        detail: 'Baldes e caixas nas casas aproveitam um pouquinho.' },
                    { id: 'none', tier: 'none', label: 'Não fazer nada', gain: 0,
                        detail: 'A água escorre pelo asfalto e vai embora.' }
                ]
            },
            educationalContent: {
                message: 'A captação de água da chuva pode ser uma fonte sustentável importante.',
                tips: [
                    'Instale sistemas de captação pluvial',
                    'Use a água da chuva para usos não potáveis',
                    'Mantenha reservatórios limpos para armazenamento'
                ]
            }
        });
        
        // EVENTOS DE INFRAESTRUTURA
        this.addEventType('pipe_leak', {
            name: 'Vazamento na Rede',
            description: 'Um vazamento foi detectado na rede de distribuição.',
            category: 'infrastructure',
            severity: 'medium',
            duration: 90000, // 1.5 minutos
            probability: 0.18,
            icon: '🔧',
            effects: {
                waterWasteIncrease: 25,
                maintenanceCost: 2000
            },
            response: {
                kind: 'threat',
                intro: '{nome}, um cano estourou debaixo da rua: água tratada está indo para o esgoto. Qual conserto a gente faz?',
                options: [
                    { id: 'replace', tier: 'max', label: 'Trocar o trecho de cano', cost: 3000, impact: 0.2, duration: 0.25,
                        detail: 'Cano novo e sensor de pressão: o vazamento para quase na hora.',
                        requires: [{ ids: ['water_quality_monitor', 'monitoring_station'], count: 1, label: 'Monitor de Qualidade ou Estação de Monitoramento' }],
                        reputation: { citizens: 2 } },
                    { id: 'patch', tier: 'mid', label: 'Remendo rápido', cost: 1200, impact: 0.5, duration: 0.5,
                        detail: 'A equipe tampa o furo, mas o cano velho ainda pinga.' },
                    { id: 'valve', tier: 'low', label: 'Fechar o registro à noite', cost: 300, impact: 0.8, duration: 0.9,
                        detail: 'Perde menos água de madrugada, só isso.' },
                    { id: 'none', tier: 'none', label: 'Não fazer nada', impact: 1, duration: 1,
                        detail: 'A água tratada continua indo embora.' }
                ]
            },
            educationalContent: {
                message: 'Vazamentos podem desperdiçar até 30% da água tratada em sistemas mal mantidos.',
                tips: [
                    'Monitore a pressão da rede regularmente',
                    'Invista em manutenção preventiva',
                    'Use tecnologias de detecção de vazamentos'
                ]
            }
        });
        
        this.addEventType('equipment_failure', {
            name: 'Falha de Equipamento',
            description: 'Um prédio parou de funcionar. A equipe conserta em 3 minutos, por R$ 5.000.',
            category: 'infrastructure',
            severity: 'high',
            duration: 180000, // 3 minutos
            probability: 0.10,
            icon: '⚙️',
            effects: {
                randomBuildingDisabled: true,
                repairCost: 5000 // × impacto da escolha
            },
            response: {
                kind: 'threat',
                intro: '{nome}, um dos nossos prédios quebrou e parou. Quanto antes ele voltar, melhor. Como fazemos o conserto?',
                options: [
                    { id: 'crew', tier: 'max', label: 'Equipe extra com peça nova', cost: 4000, impact: 0.2, duration: 0.25,
                        detail: 'Técnicos da universidade ajudam: o prédio volta rápido e o conserto final sai barato.',
                        requires: [{ ids: ['research_center', 'university'], count: 1, label: 'Centro de Pesquisa ou Universidade' }] },
                    { id: 'overtime', tier: 'mid', label: 'Hora extra da equipe', cost: 1500, impact: 0.5, duration: 0.5,
                        detail: 'A equipe da prefeitura trabalha até tarde.' },
                    { id: 'queue', tier: 'low', label: 'Entrar na fila de consertos', cost: 300, impact: 0.8, duration: 0.85,
                        detail: 'Sai um pouco mais rápido que o normal.' },
                    { id: 'none', tier: 'none', label: 'Não fazer nada', impact: 1, duration: 1,
                        detail: 'Três minutos parado e conserto caro no fim.' }
                ]
            },
            educationalContent: {
                message: 'Manutenção preventiva é mais econômica que reparos de emergência.',
                tips: [
                    'Estabeleça cronogramas de manutenção',
                    'Mantenha peças de reposição em estoque',
                    'Treine equipes para reparos rápidos'
                ]
            }
        });
        
        // EVENTOS POPULACIONAIS
        this.addEventType('population_boom', {
            name: 'Crescimento Populacional',
            description: 'Chegaram novos moradores e visitantes: a cidade vai gastar mais água por 5 minutos.',
            category: 'population',
            severity: 'medium',
            duration: 300000, // 5 minutos
            probability: 0.08,
            icon: '👥',
            effects: {
                populationIncrease: 100, // até o limite de moradia da cidade
                waterDemandIncrease: 1.15
            },
            response: {
                kind: 'opportunity',
                scales: ['populationIncrease'], // aproveitar = quantos moradores ficam; a demanda extra vem de qualquer jeito
                intro: '{nome}, muita gente quer se mudar para a nossa cidade! Mais moradores pagam mais impostos. Como recebemos todo mundo?',
                options: [
                    { id: 'welcome', tier: 'max', label: 'Receber com casa, escola e aula de água', cost: 4000, gain: 1,
                        detail: 'Todos ficam, e aprendem a usar a água com cuidado.',
                        requires: [{ id: 'school', count: 1, label: 'Escola' }],
                        effects: { waterConsumptionReduction: 0.1 }, reputation: { citizens: 3, business: 2 } },
                    { id: 'register', tier: 'mid', label: 'Cadastro e moradia simples', cost: 1500, gain: 0.5,
                        detail: 'Metade das famílias encontra lugar para morar.', reputation: { citizens: 1, business: 1 } },
                    { id: 'sign', tier: 'low', label: 'Uma placa de boas-vindas', cost: 200, gain: 0.2,
                        detail: 'Poucos ficam: sem apoio, a maioria segue viagem.' },
                    { id: 'none', tier: 'none', label: 'Não fazer nada', gain: 0,
                        detail: 'Ninguém fica, mas a visita gasta água mesmo assim.', reputation: { business: -1 } }
                ]
            },
            educationalContent: {
                message: 'O crescimento populacional requer planejamento antecipado da infraestrutura.',
                tips: [
                    'Monitore tendências demográficas',
                    'Expanda a infraestrutura antes da demanda',
                    'Eduque novos moradores sobre conservação'
                ]
            }
        });
        
        // EVENTOS AMBIENTAIS
        this.addEventType('industrial_pollution', {
            name: 'Poluição Industrial',
            description: 'Uma indústria próxima causou um vazamento, aumentando a poluição.',
            category: 'environment',
            severity: 'high',
            duration: 240000, // 4 minutos
            probability: 0.12,
            icon: '🏭',
            effects: {
                pollutionSpike: 30,
                treatmentCostIncrease: 1.5 // manutenção das estações de tratamento × 1,5 enquanto dura
            },
            response: {
                kind: 'threat',
                intro: '{nome}, uma fábrica soltou resíduo no rio! Os peixes e a nossa água estão em risco. Qual vai ser a resposta?',
                options: [
                    { id: 'fine', tier: 'max', label: 'Multar e obrigar a limpar o rio', impact: 0.2, duration: 0.4,
                        detail: 'Com as análises de laboratório como prova, a fábrica paga a multa e a limpeza.',
                        requires: [{ ids: ['water_quality_monitor', 'monitoring_station'], count: 1, label: 'Monitor de Qualidade ou Estação de Monitoramento' }],
                        instant: { budget: 5000 }, reputation: { environment: 5, business: -4 } },
                    { id: 'inspect', tier: 'mid', label: 'Fiscalizar e notificar', cost: 1000, impact: 0.5, duration: 0.7,
                        detail: 'Fiscais vão até a fábrica e ela fecha o cano sujo.', reputation: { environment: 2, business: -1 } },
                    { id: 'ask', tier: 'low', label: 'Pedir com jeitinho', impact: 0.8, duration: 0.9,
                        detail: 'A fábrica promete melhorar... devagar.', reputation: { environment: 1 } },
                    { id: 'none', tier: 'none', label: 'Não fazer nada', impact: 1, duration: 1,
                        detail: 'O comércio agradece, o rio não.', reputation: { environment: -5, business: 2 } }
                ]
            },
            educationalContent: {
                message: 'A poluição industrial pode contaminar fontes de água por décadas.',
                tips: [
                    'Monitore fontes de poluição próximas',
                    'Invista em tratamento avançado',
                    'Trabalhe com autoridades para controle'
                ]
            }
        });
        
        // EVENTOS POSITIVOS
        this.addEventType('government_grant', {
            name: 'Subsídio Governamental',
            description: 'O governo aprovou um subsídio para melhorias na infraestrutura hídrica.',
            category: 'economic',
            severity: 'positive',
            duration: 0, // Instantâneo
            probability: 0.05,
            icon: '💰',
            effects: {
                budgetBonus: 15000
            },
            response: {
                kind: 'opportunity',
                intro: '{nome}, o governo abriu um edital de dinheiro para obras de água! Quanto mais caprichado o projeto, mais a cidade recebe.',
                options: [
                    { id: 'project', tier: 'max', label: 'Projeto técnico completo', cost: 1500, gain: 1,
                        detail: 'Com dados e estudos da cidade, o projeto ganha o valor inteiro.',
                        requires: [{ ids: ['research_center', 'university', 'water_research_center'], count: 1, label: 'Centro de Pesquisa ou Universidade' }],
                        reputation: { government: 4 } },
                    { id: 'simple', tier: 'mid', label: 'Projeto simples', cost: 500, gain: 0.5,
                        detail: 'Recebe metade.', reputation: { government: 1 } },
                    { id: 'form', tier: 'low', label: 'Só preencher o formulário', gain: 0.2,
                        detail: 'Recebe um pouco.' },
                    { id: 'none', tier: 'none', label: 'Não fazer nada', gain: 0,
                        detail: 'O dinheiro vai para outra cidade.', reputation: { government: -2 } }
                ]
            },
            educationalContent: {
                message: 'Investimentos públicos são essenciais para infraestrutura hídrica sustentável.',
                tips: [
                    'Use recursos extras para melhorias de longo prazo',
                    'Invista em tecnologias eficientes',
                    'Documente resultados para futuros subsídios'
                ]
            }
        });
        
        this.addEventType('water_conservation_campaign', {
            name: 'Campanha de Conservação',
            description: 'Uma campanha educativa reduziu o consumo de água da população (−15%) e animou os moradores.',
            category: 'social',
            severity: 'positive',
            duration: 180000, // 3 minutos
            probability: 0.10,
            icon: '📢',
            effects: {
                waterConsumptionReduction: 0.15,
                satisfactionBonus: 10
            },
            response: {
                kind: 'opportunity',
                intro: '{nome}, os alunos de uma escola criaram uma campanha para economizar água! Se a prefeitura apoiar, ela vai longe.',
                options: [
                    { id: 'media', tier: 'max', label: 'Levar a campanha para rádio, TV e escolas', cost: 3000, gain: 1,
                        detail: 'A cidade inteira participa: consumo bem menor e moradores felizes.',
                        requires: [{ id: 'school', count: 1, label: 'Escola' }],
                        reputation: { citizens: 3, environment: 2 } },
                    { id: 'posters', tier: 'mid', label: 'Cartazes nos bairros', cost: 1200, gain: 0.5,
                        detail: 'Metade dos bairros entra na campanha.', reputation: { citizens: 1 } },
                    { id: 'post', tier: 'low', label: 'Compartilhar nas redes da prefeitura', gain: 0.2,
                        detail: 'Alguns curtem e poucos mudam o hábito.' },
                    { id: 'none', tier: 'none', label: 'Não fazer nada', gain: 0,
                        detail: 'A ideia dos alunos fica só na escola.' }
                ]
            },
            educationalContent: {
                message: 'Educação e conscientização podem reduzir o consumo em até 20%.',
                tips: [
                    'Promova campanhas regulares de conscientização',
                    'Ofereça incentivos para conservação',
                    'Compartilhe dados de consumo com a população'
                ]
            }
        });
        
        // Depois de declarar situação de emergência (GameOverSystem.declareEmergency): nunca sorteado
        this.addEventType('state_intervention', {
            name: 'Intervenção do Estado',
            description: 'O Estado está cuidando da emergência: os moradores estão menos satisfeitos com a prefeitura.',
            category: 'social',
            severity: 'high',
            duration: 300000, // 5 minutos
            probability: 0,
            icon: '🚨',
            effects: { satisfactionBonus: -10 }
        });

        log(`✅ ${this.eventTypes.size} tipos de eventos definidos`);
    }
    
    addEventType(id, config) {
        this.eventTypes.set(id, {
            id,
            ...config
        });
    }
    
    // ===== ATUALIZAÇÃO =====
    update(deltaTime) {
        if (!this.eventsEnabled) return;
        
        this.lastEventTime += deltaTime;
        
        // Verificar se é hora de tentar gerar um evento
        if (this.lastEventTime >= this.eventFrequency) {
            this.tryGenerateEvent();
            this.lastEventTime = 0;
        }
        
        // Atualizar eventos ativos, avisos que viram evento e escolhas sem resposta
        this.updateActiveEvents(deltaTime);
        this.updatePendingEvents(deltaTime);
        this.updateChoiceTimeouts();
    }
    
    tryGenerateEvent() {
        if (Math.random() > this.eventProbability * this.difficultyMultiplier) {
            return; // Não gerar evento desta vez
        }
        
        // Selecionar tipo de evento baseado em probabilidades
        const availableEvents = Array.from(this.eventTypes.values()).filter(
            eventType => !this.hasActiveEventOfType(eventType.id) && !this.pendingEvents.some(p => p.type === eventType.id)
        );
        
        if (availableEvents.length === 0) return;
        
        // Calcular probabilidades ponderadas
        // Peso = probabilidade × clima real × risco de enchente × reputação (getEventWeight)
        const weights = availableEvents.map(eventType => this.getEventWeight(eventType));
        const totalProbability = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalProbability;
        
        for (let i = 0; i < availableEvents.length; i++) {
            const eventType = availableEvents[i];
            random -= weights[i];
            if (random <= 0) {
                // Com resposta: o Paulo pergunta antes (seca e enchente ainda dão um tempo de preparo depois)
                this.announceEvent(eventType.id);
                break;
            }
        }
    }
    
    updateActiveEvents(deltaTime) {
        this.activeEvents.forEach((event, eventId) => {
            if (event.duration > 0) {
                event.remainingTime -= deltaTime;
                
                if (event.remainingTime <= 0) {
                    this.endEvent(eventId);
                }
            }
        });
    }
    
    // ===== CONTROLE DE EVENTOS =====
    /**
     * options.duration (ms) troca a duração padrão — ex.: a seca da missão "Crise Hídrica".
     * options.responseId = opção escolhida no modal do Paulo: escala os efeitos (impact/gain) e a duração.
     */
    triggerEvent(eventTypeId, forced = false, options = {}) {
        const eventType = this.eventTypes.get(eventTypeId);
        if (!eventType) {
            console.error(`❌ Tipo de evento não encontrado: ${eventTypeId}`);
            return null;
        }
        
        if (!forced && this.hasActiveEventOfType(eventTypeId)) {
            console.warn(`⚠️ Evento já ativo: ${eventTypeId}`);
            return null;
        }
        
        // Criar instância do evento
        const response = this.getResponseOption(eventType, options.responseId);
        const baseDuration = Number.isFinite(options.duration) ? options.duration : eventType.duration;
        const duration = Math.round(baseDuration * (response?.duration ?? 1));
        const event = {
            id: `event_${Date.now()}_${eventTypeId}`,
            type: eventTypeId,
            config: eventType,
            startTime: Date.now(),
            duration,
            remainingTime: duration,
            active: true
        };

        // Força: impacto (ameaça) ou aproveitamento (oportunidade) da resposta; a enchente ainda × risco (asfalto × verde)
        if (response) {
            event.responseId = response.id;
            event.choiceId = response.id; // cartão do evento mostra a escolha
            event.effectScale = eventType.response.kind === 'opportunity' ? (response.gain ?? 1) : (response.impact ?? 1);
        }
        if (eventTypeId === 'flood') event.effectScale = (event.effectScale ?? 1) * this.getFloodRisk().risk;
        
        this.activeEvents.set(event.id, event);
        
        // Aplicar efeitos
        this.applyEventEffects(event, true);
        
        // Notificar UI
        this.notifyEventStart(event);
        
        // Adicionar ao histórico
        this.eventHistory.push({
            type: eventTypeId,
            startTime: event.startTime,
            duration: eventType.duration
        });
        
        log(`⚡ Evento iniciado: ${eventType.name}`);
        return event;
    }
    
    endEvent(eventId) {
        const event = this.activeEvents.get(eventId);
        if (!event) return;
        
        // Remover efeitos
        this.applyEventEffects(event, false);
        
        // Remover da lista de ativos
        this.activeEvents.delete(eventId);
        
        // Notificar UI
        this.notifyEventEnd(event);
        this.reportOutcome(event);
        
        log(`⚡ Evento finalizado: ${event.config.name}`);
    }
    
    // ===== EFEITOS =====
    /** Efeitos do evento (× effectScale, só nas chaves de response.scales se houver) + os da opção escolhida. */
    applyEventEffects(event, apply = true) {
        this.applyEffectSet(event.config.effects, apply, event, event.effectScale ?? 1, event.config.response?.scales || null);
        const option = this.getResponseOption(event.config, event.responseId);
        if (option?.effects) this.applyEffectSet(option.effects, apply, event, 1);
    }

    /**
     * scale = força do evento (impacto da resposta, aproveitamento, risco de enchente). Fica no evento para o fim
     * tirar exatamente o que entrou. Multiplicadores interpolam (1 + (f − 1) × scale); somas e efeitos de uma vez
     * multiplicam. scaledKeys: só essas chaves escalam (o resto vem inteiro).
     */
    applyEffectSet(effects, apply, event, scale = 1, scaledKeys = null) {
        const resourceManager = this.gameManager.resourceManager;
        const buildingSystem = this.gameManager.buildingSystem;

        if (!effects) return;
        const k = key => (!scaledKeys || scaledKeys.includes(key) ? scale : 1);
        const lerp = (f, key) => 1 + (f - 1) * k(key);
        effects = { ...effects };
        if (effects.waterProductionMultiplier) effects.waterProductionMultiplier = lerp(effects.waterProductionMultiplier, 'waterProductionMultiplier');
        if (effects.waterDemandIncrease) effects.waterDemandIncrease = lerp(effects.waterDemandIncrease, 'waterDemandIncrease');
        if (effects.treatmentCostIncrease) effects.treatmentCostIncrease = lerp(effects.treatmentCostIncrease, 'treatmentCostIncrease');
        for (const key of ['waterConsumptionReduction', 'waterWasteIncrease', 'satisfactionBonus', 'pollutionReduction',
            'populationIncrease', 'waterProductionBonus', 'aquiferRecharge', 'pollutionSpike', 'budgetBonus', 'maintenanceCost', 'repairCost']) {
            if (effects[key]) effects[key] *= k(key);
        }
        if (effects.populationIncrease) effects.populationIncrease = Math.round(effects.populationIncrease);
        if (effects.budgetBonus) effects.budgetBonus = Math.round(effects.budgetBonus);

        // Efeitos nos recursos (o fim do evento desfaz exatamente o que o começo fez)
        if (effects.waterProductionMultiplier && resourceManager) {
            const f = effects.waterProductionMultiplier;
            resourceManager.scaleWaterModifier('productionMultiplier', apply ? f : 1 / f);
        }

        if (effects.waterDemandIncrease && resourceManager) {
            const f = effects.waterDemandIncrease;
            resourceManager.scaleWaterModifier('demandMultiplier', apply ? f : 1 / f);
        }

        if (effects.waterConsumptionReduction && resourceManager) {
            const f = 1 - effects.waterConsumptionReduction;
            resourceManager.scaleWaterModifier('demandMultiplier', apply ? f : 1 / f);
        }

        if (effects.waterWasteIncrease && resourceManager) {
            resourceManager.addExtraWaste(apply ? effects.waterWasteIncrease : -effects.waterWasteIncrease);
        }

        if (effects.satisfactionBonus && resourceManager) {
            resourceManager.addEventSatisfaction(apply ? effects.satisfactionBonus : -effects.satisfactionBonus);
        }

        if (effects.pollutionReduction && resourceManager) {
            if (apply) resourceManager.addPollutionReduction(effects.pollutionReduction);
            else resourceManager.removePollutionReduction(effects.pollutionReduction);
        }

        // Novos moradores ficam (até o limite de moradia); só a demanda extra acaba com o evento
        if (effects.populationIncrease && resourceManager && apply) {
            resourceManager.adjustResource('population', effects.populationIncrease);
            resourceManager.invalidateConsumptionCache();
        }

        // Tratamento mais caro: manutenção das estações × (fator − 1), guardada no evento para tirar no fim
        if (effects.treatmentCostIncrease && resourceManager) {
            if (apply) {
                const treatment = (buildingSystem?.getAllBuildings() || [])
                    .filter(b => b.effectsApplied && b.config.category === 'treatment' && b.config.maintenanceCost);
                event.appliedExpense = treatment.reduce((sum, b) => sum + b.config.maintenanceCost, 0) *
                    (effects.treatmentCostIncrease - 1);
                if (event.appliedExpense) resourceManager.addExpense(event.appliedExpense);
            } else if (event.appliedExpense) {
                resourceManager.addExpense(-event.appliedExpense);
            }
        }

        if (effects.waterProductionBonus && resourceManager) {
            if (apply) {
                resourceManager.addWaterProduction(effects.waterProductionBonus);
            } else {
                resourceManager.removeWaterProduction(effects.waterProductionBonus);
            }
        }
        
        if (effects.pollutionIncrease && resourceManager) {
            const amount = effects.pollutionIncrease * k('pollutionIncrease');
            if (apply) {
                resourceManager.addPollutionSource(amount);
            } else {
                resourceManager.removePollutionSource(amount);
            }
        }

        if (effects.aquiferRecharge && resourceManager) {
            resourceManager.addAquiferRecharge(apply ? effects.aquiferRecharge : -effects.aquiferRecharge);
        }

        if (effects.pollutionSpike && resourceManager && apply) {
            resourceManager.adjustResource('pollution', effects.pollutionSpike);
        }
        
        if (effects.budgetBonus && resourceManager && apply) {
            resourceManager.adjustResource('budget', effects.budgetBonus);
        }
        
        if (effects.maintenanceCost && resourceManager && apply) {
            resourceManager.spendBudget(effects.maintenanceCost);
        }
        
        // Efeitos em edifícios: o prédio parado volta a funcionar no fim do evento (conserto pago)
        if (effects.randomBuildingDisabled && buildingSystem && k('randomBuildingDisabled') > 0) {
            if (apply) event.disabledBuildingId = this.disableRandomBuilding();
            else this.repairDisabledBuilding(event, effects.repairCost || 0);
        }
        
        if (effects.infrastructureDamage && buildingSystem && apply) {
            this.damageInfrastructure(Math.min(0.5, effects.infrastructureDamage * k('infrastructureDamage')));
        }
    }

    // ===== ENCHENTE E ESCOAMENTO =====
    // Asfalto e prédios não deixam a chuva entrar no chão: ela escorre (enxurrada). Áreas verdes (runoffAbsorption)
    // e árvores seguram. Risco = (impermeável − absorção) / FLOOD_RISK_SCALE, entre 0,25× e 2×.
    static FLOOD_RISK_SCALE = 40;

    getFloodRisk() {
        const buildings = this.gameManager.buildingSystem?.getAllBuildings() || [];
        let impervious = 0;
        let absorption = 0;
        buildings.forEach(b => {
            if (b.underConstruction) return;
            const cfg = b.config || {};
            if (b.type === 'paved_road') impervious += 1;
            else if (!cfg.roadType && !cfg.runoffAbsorption && !cfg.plantedTree) impervious += (cfg.size || 1) ** 2 * 0.3;
            absorption += cfg.runoffAbsorption || 0;
            if (cfg.plantedTree) absorption += 0.5;
        });
        absorption += (this.gameManager.treeSystem?.count || 0) * 0.1;
        const risk = Math.max(0.25, Math.min(2, (impervious - absorption) / EventSystem.FLOOD_RISK_SCALE + 0.5));
        const level = risk >= 1.3 ? 'alto' : risk >= 0.8 ? 'médio' : 'baixo';
        return { impervious, absorption, risk, level };
    }

    // ===== CLIMA REAL → SORTEIO =====
    /** Peso extra de cada tipo pelo clima real (chovendo: chuva/enchente; sol quente e seco: seca) e pela reputação. */
    getEventWeight(eventType) {
        let weight = eventType.probability;
        const profile = this.gameManager.weatherEffects?.profile;
        const rain = profile?.rain || 0;
        const today = this.gameManager.uiManager?.weather?.data?.daily?.[0];
        const rainyForecast = (today?.rainChance ?? 0) >= 70;
        if (eventType.id === 'heavy_rain' || eventType.id === 'flood') {
            weight *= 1 + 2 * rain + (rainyForecast ? 0.5 : 0);
            if (eventType.id === 'flood') weight *= this.getFloodRisk().risk;
        }
        if (eventType.id === 'drought') weight *= rain > 0 ? 0.3 : profile?.hot ? 2 : 1;
        if (eventType.id === 'government_grant') {
            weight *= this.gameManager.questSystem?.getReputationModifiers?.().grantChance ?? 1;
        }
        return weight;
    }

    // ===== AVISO ANTECIPADO =====
    // Eventos com warning: true chegam com aviso (pendingEvents) e dão tempo de se preparar e escolher.
    // Uma Estação de Monitoramento pronta (earlyWarning) dobra a antecedência.
    static WARNING_MS = 45000;

    getWarningTime() {
        const monitored = (this.gameManager.buildingSystem?.getAllBuildings() || [])
            .some(b => b.config?.earlyWarning && b.active && !b.underConstruction);
        return EventSystem.WARNING_MS * (monitored ? 2 : 1);
    }

    /**
     * Anuncia um evento: o Paulo pergunta o que fazer (modal) e o evento só começa depois da decisão — na hora, ou,
     * se ele tem warning, depois do tempo de preparo (dobrado com a Estação de Monitoramento). Sem response: começa
     * direto (ou com aviso). Devolve o anúncio (ou o evento, se começou).
     */
    announceEvent(eventTypeId, options = {}) {
        const eventType = this.eventTypes.get(eventTypeId);
        if (!eventType) return null;
        if (!eventType.response) return eventType.warning ? this.warnEvent(eventTypeId) : this.triggerEvent(eventTypeId, false, options);
        const total = eventType.warning ? this.getWarningTime() : 0;
        const pending = {
            id: `decide_${Date.now()}_${eventTypeId}`, type: eventTypeId, total, remainingTime: total,
            choiceId: null, awaiting: true, askedAt: this.gameManager.gameTime || 0, duration: options.duration
        };
        this.pendingEvents.push(pending);
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_alert_warning', 0.7, { ifQuiet: true });
        this.gameManager.uiManager?.queueEventDecision?.(pending);
        return pending;
    }

    /** Aviso sem decisão (eventos sem response). Devolve o aviso criado. */
    warnEvent(eventTypeId) {
        const eventType = this.eventTypes.get(eventTypeId);
        if (!eventType) return null;
        const total = this.getWarningTime();
        const pending = { id: `warn_${Date.now()}_${eventTypeId}`, type: eventTypeId, total, remainingTime: total, choiceId: null };
        this.pendingEvents.push(pending);
        const seconds = Math.round(total / 1000 / (this.gameManager.timeScale || 1));
        this.gameManager.uiManager?.showNotification(`⚠️ Previsão: ${eventType.icon} ${eventType.name} em ~${seconds} s.`, 'warning', 8000);
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_alert_warning', 0.7, { ifQuiet: true });
        return pending;
    }

    /** Anúncios decididos contam o tempo de preparo; os que esperam a decisão ficam parados. */
    updatePendingEvents(deltaTime) {
        if (!this.pendingEvents.length) return;
        const due = [];
        this.pendingEvents.forEach(p => {
            if (p.awaiting) return;
            p.remainingTime -= deltaTime;
            if (p.remainingTime <= 0) due.push(p);
        });
        due.forEach(p => {
            this.pendingEvents = this.pendingEvents.filter(x => x !== p);
            this.startDecidedEvent(p);
        });
    }

    /** O evento decidido começa (oportunidade recusada não começa: o benefício se perdeu). */
    startDecidedEvent(pending) {
        const config = this.eventTypes.get(pending.type);
        const option = this.getResponseOption(config, pending.choiceId);
        if (config?.response?.kind === 'opportunity' && option && !(option.gain > 0)) {
            this.gameManager.uiManager?.showNotification(`🌿 Secretário Paulo: ${config.icon} oportunidade perdida — ${option.detail || config.name}`, 'warning', 6000);
            return null;
        }
        return this.triggerEvent(pending.type, false, { responseId: pending.choiceId, duration: pending.duration });
    }

    // ===== RESPOSTA (modal do Paulo) =====
    getResponseOption(config, optionId) {
        if (!optionId) return null;
        return (config?.response?.options || []).find(o => o.id === optionId) || null;
    }

    /** Pode escolher? { ok, missing: [rótulos dos prédios que faltam], short: quanto falta de dinheiro }. */
    getOptionAvailability(option) {
        const counts = new Map();
        for (const b of this.gameManager.buildingSystem?.getAllBuildings?.() || []) {
            if (!b.underConstruction) counts.set(b.type, (counts.get(b.type) || 0) + 1);
        }
        const missing = (option.requires || [])
            .filter(r => (r.ids || [r.id]).reduce((sum, id) => sum + (counts.get(id) || 0), 0) < (r.count || 1))
            .map(r => r.label || r.id);
        const budget = this.gameManager.resourceManager?.resources?.budget?.current ?? Infinity;
        const short = option.cost ? Math.max(0, option.cost - budget) : 0;
        return { ok: missing.length === 0 && short === 0, missing, short };
    }

    /** Decide o anúncio (id de pendingEvents) com a opção. auto = ninguém respondeu (fica "não fazer nada"). */
    chooseResponse(pendingId, optionId, { auto = false } = {}) {
        const pending = this.pendingEvents.find(p => p.id === pendingId);
        if (!pending || !pending.awaiting) return false;
        const config = this.eventTypes.get(pending.type);
        const option = this.getResponseOption(config, optionId);
        if (!option) return false;
        const rm = this.gameManager.resourceManager;
        if (!auto) {
            const { ok, missing, short } = this.getOptionAvailability(option);
            if (!ok) {
                this.gameManager.uiManager?.showNotification(missing.length
                    ? `🔒 "${option.label}" precisa de: ${missing.join(', ')}.`
                    : `💰 Falta R$ ${Math.ceil(short).toLocaleString('pt-BR')} para "${option.label}".`, 'warning');
                return false;
            }
        }
        if (option.cost && !auto && !rm?.spendBudget(option.cost)) return false;
        pending.choiceId = option.id;
        pending.choiceAuto = auto;
        pending.awaiting = false;
        const instant = option.instant || {};
        if (instant.budget && rm) rm.adjustResource('budget', instant.budget);
        if (instant.pollution && rm) rm.adjustResource('pollution', instant.pollution);
        if (instant.water && rm) rm.adjustResource('water', instant.water);
        if (option.reputation) this.gameManager.questSystem?.changeReputation?.(option.reputation, config.name);
        this.eventHistory.push({ type: pending.type, choice: option.id, tier: option.tier, auto, startTime: Date.now() });
        this.recordResponse(config, option, auto);
        if (pending.total <= 0) {
            this.pendingEvents = this.pendingEvents.filter(x => x !== pending);
            this.startDecidedEvent(pending);
        }
        return true;
    }

    /** Anúncio sem resposta por CHOICE_TIMEOUT_MS de jogo (o modal não pôde abrir) fica com "não fazer nada". */
    static CHOICE_TIMEOUT_MS = 30000;

    updateChoiceTimeouts() {
        const now = this.gameManager.gameTime || 0;
        this.pendingEvents.filter(p => p.awaiting).forEach(p => {
            if (now - (p.askedAt || 0) < EventSystem.CHOICE_TIMEOUT_MS) return;
            const options = this.eventTypes.get(p.type)?.response?.options || [];
            const fallback = options.find(o => o.tier === 'none') || options[options.length - 1];
            if (fallback) this.chooseResponse(p.id, fallback.id, { auto: true });
        });
    }

    // ===== RECOMPENSAS =====
    // Boa decisão = a melhor ou a do meio. STREAK_BONUS boas seguidas = prêmio do governo; GUARDIAN_GOAL boas no
    // total = conquista "Guardião do Clima". "Não fazer nada" zera a sequência.
    static STREAK_BONUS = 3;
    static STREAK_REWARD = 3000;
    static GUARDIAN_GOAL = 5;

    recordResponse(config, option, auto) {
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('event_decision', { target: config.id, value: option.id, tier: option.tier, auto, ok: !auto && (option.tier === 'max' || option.tier === 'mid') });
        const st = this.responseStats;
        st.total++;
        if (option.tier === 'max') st.best++;
        if (option.tier === 'none') st.missed++;
        const good = !auto && (option.tier === 'max' || option.tier === 'mid');
        st.streak = good ? st.streak + 1 : 0;
        if (good) st.good++;
        const ui = this.gameManager.uiManager;
        if (good && st.streak % EventSystem.STREAK_BONUS === 0) {
            this.gameManager.resourceManager?.adjustResource('budget', EventSystem.STREAK_REWARD);
            this.gameManager.questSystem?.changeReputation?.({ government: 2 }, 'Boas decisões');
            ui?.showNotification(`🏅 Secretário Paulo: ${st.streak} boas decisões seguidas! O governo mandou R$ ${EventSystem.STREAK_REWARD.toLocaleString('pt-BR')} de prêmio.`, 'success', 7000);
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_achievement');
        }
        if (good && st.good === EventSystem.GUARDIAN_GOAL) this.gameManager.questSystem?.unlockAchievement?.('climate_guardian');
    }

    /** Fim do evento: o Paulo diz quanto do estrago foi evitado (ou do benefício foi aproveitado). */
    reportOutcome(event) {
        const option = this.getResponseOption(event.config, event.responseId);
        const ui = this.gameManager.uiManager;
        if (!option || !ui) return;
        const name = `${event.config.icon} ${event.config.name}`;
        let text;
        if (event.config.response.kind === 'opportunity') {
            text = `${name}: aproveitamos ${Math.round((option.gain ?? 0) * 100)}% com "${option.label}".`;
        } else if (option.tier === 'none') {
            text = `${name} acabou. Sem preparo, a cidade sentiu tudo. Da próxima vez, vamos agir antes!`;
        } else {
            text = `${name} acabou. Com "${option.label}", evitamos ${Math.round((1 - (option.impact ?? 1)) * 100)}% do estrago.`;
        }
        ui.showNotification(`🌿 Secretário Paulo: ${text}`, option.tier === 'none' ? 'warning' : 'success', 7000);
    }

        /** Para um prédio pronto (não rua) e devolve o id dele, ou null se não houver nenhum. */
    disableRandomBuilding() {
        const buildings = this.gameManager.buildingSystem.getAllBuildings();
        const activeBuildings = buildings.filter(b => b.active && b.effectsApplied && !b.underConstruction && !b.config.roadType);

        if (activeBuildings.length === 0) return null;
        const randomBuilding = activeBuildings[Math.floor(Math.random() * activeBuildings.length)];
        randomBuilding.active = false;
        this.gameManager.buildingSystem.applyBuildingEffects(randomBuilding, false);

        this.gameManager.uiManager?.showNotification(
            `⚙️ ${randomBuilding.config.name} parou de funcionar! A equipe já está consertando.`,
            'warning'
        );
        return randomBuilding.id;
    }

    /** Fim da falha: o prédio volta a funcionar (se ainda existe) e o conserto é pago com o que houver no caixa. */
    repairDisabledBuilding(event, repairCost) {
        const building = event.disabledBuildingId && this.gameManager.buildingSystem.buildings?.get(event.disabledBuildingId);
        if (!building || building.active) return;
        building.active = true;
        this.gameManager.buildingSystem.applyBuildingEffects(building, true);
        const resourceManager = this.gameManager.resourceManager;
        const paid = Math.min(repairCost, Math.max(0, resourceManager?.resources.budget.current || 0));
        if (paid > 0) resourceManager.adjustResource('budget', -paid);
        this.gameManager.uiManager?.showNotification(
            `🔧 ${building.config.name} voltou a funcionar${paid > 0 ? ` (conserto: R$ ${Math.round(paid).toLocaleString('pt-BR')})` : ''}.`,
            'success'
        );
    }
    
    damageInfrastructure(damagePercentage) {
        const buildings = this.gameManager.buildingSystem.getAllBuildings();
        const buildingsToAffect = Math.ceil(buildings.length * damagePercentage);
        
        for (let i = 0; i < buildingsToAffect; i++) {
            const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
            const damage = Number.isFinite(randomBuilding.damageFactor) ? randomBuilding.damageFactor : 1;
            if (damage > 0.5) {
                // O dano entra na conta da eficiência (BuildingEfficiency.js), que tira os efeitos com a
                // eficiência antiga e soma com a nova; o recálculo periódico não apaga o dano
                randomBuilding.damageFactor = Math.max(0.5, damage - 0.2);
                this.gameManager.buildingSystem.updateBuildingEfficiency(randomBuilding);
            }
        }
    }
    
    // ===== NOTIFICAÇÕES =====
    notifyEventStart(event) {
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `${event.config.icon} ${event.config.name}: ${event.config.description}`,
                event.config.severity === 'positive' ? 'success' : 
                event.config.severity === 'high' ? 'error' : 'warning',
                8000
            );
            
            // Mostrar conteúdo educacional se disponível
            if (event.config.educationalContent) {
                setTimeout(() => {
                    this.showEducationalContent(event.config.educationalContent);
                }, 2000);
            }
        }
        
        // Som do tipo de evento (sting de abertura + seca/enchente/poluição...; bons eventos: som alegre)
        if (typeof AudioManager !== 'undefined') AudioManager.onEventStart(event);
    }
    
    notifyEventEnd(event) {
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `${event.config.name} terminou`,
                'info',
                3000
            );
        }
        if (typeof AudioManager !== 'undefined') AudioManager.onEventEnd(event);
    }
    
    /** Dica do evento num toast longo: o fato + uma dica sorteada. */
    showEducationalContent(content) {
        const uiManager = this.gameManager.uiManager;
        if (!uiManager || !content?.message) return;
        const tips = content.tips || [];
        const tip = tips.length ? ` Dica: ${tips[Math.floor(Math.random() * tips.length)]}.` : '';
        uiManager.showNotification(`💡 ${content.message}${tip}`, 'info', 12000);
    }
    
    // ===== UTILITÁRIOS =====
    hasActiveEventOfType(eventTypeId) {
        return Array.from(this.activeEvents.values()).some(
            event => event.type === eventTypeId
        );
    }

    setDifficulty(multiplier) {
        this.difficultyMultiplier = Math.max(0.1, Math.min(3.0, multiplier));
        log(`⚡ Dificuldade dos eventos: ${this.difficultyMultiplier}x`);
    }
    
    // ===== SAVE/LOAD =====
    // config (o tipo do evento) não vai no save: volta de eventTypes pelo type. Os efeitos de um evento ativo
    // já estão nos totais do ResourceManager salvos, então o load não os reaplica (o fim do evento os retira).
    getSaveData() {
        return {
            activeEvents: Array.from(this.activeEvents.entries(), ([id, event]) => {
                const rest = { ...event };
                delete rest.config;
                return [id, rest];
            }),
            pendingEvents: this.pendingEvents.map(p => ({ ...p })),
            responseStats: { ...this.responseStats },
            eventHistory: this.eventHistory.slice(-50),
            lastEventTime: this.lastEventTime,
            difficultyMultiplier: this.difficultyMultiplier,
            eventsEnabled: this.eventsEnabled
        };
    }

    loadData(data) {
        if (!data) return;
        this.activeEvents = new Map((data.activeEvents || [])
            .filter(([, event]) => event && this.eventTypes.has(event.type))
            .map(([id, event]) => [id, { ...event, config: this.eventTypes.get(event.type) }]));
        this.pendingEvents = (data.pendingEvents || []).filter(p => p && this.eventTypes.has(p.type));
        this.responseStats = { total: 0, good: 0, best: 0, missed: 0, streak: 0, ...(data.responseStats || {}) };
        // Anúncio esperando decisão no save: o Paulo pergunta de novo ao continuar
        this.pendingEvents.filter(p => p.awaiting).forEach(p => this.gameManager.uiManager?.queueEventDecision?.(p));
        this.eventHistory = data.eventHistory || [];
        this.lastEventTime = data.lastEventTime || 0;
        this.difficultyMultiplier = data.difficultyMultiplier || 1.0;
        this.eventsEnabled = data.eventsEnabled !== undefined ? data.eventsEnabled : true;
    }
}

// Exportar para escopo global
window.EventSystem = EventSystem;
log('⚡ EventSystem carregado e exportado para window.EventSystem');
