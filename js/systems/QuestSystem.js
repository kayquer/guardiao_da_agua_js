/**
 * GUARDIÃO DA ÁGUA - QUEST SYSTEM
 * Sistema de missões educacionais e progressão
 */

class QuestSystem {
    constructor(gameManager) {
        log('🎯 Inicializando QuestSystem...');
        
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
        this.trackTimers = QuestSystem.emptyTrackTimers?.() || null; // trilhas de tempo (AchievementTracks.js), salvo

        // Stakeholder Reputation System
        this.stakeholderReputation = {
            citizens: 50,
            environment: 50,
            business: 50,
            government: 50
        };

        // Configurações
        this.maxActiveQuests = 99;

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
            selectedMission: null,
            currentFilter: 'all' // TASK #1: Filter state (all, active, completed, locked)
        };

        // FIX #3: Carousel state for info panel mission display
        this.missionCarousel = {
            currentIndex: 0,
            missions: []
        };

        this.initializeQuests();
        
        log('✅ QuestSystem inicializado');

        // ===== GLOBAL DEBUG FUNCTIONS (só com ?debug) =====
        if (DEBUG) {
            window.validateMission = (missionId) => this.validateMissionCompletion(missionId);
            window.forceCompleteMission = (missionId) => this.forceCompleteMission(missionId);
            window.listActiveMissions = () => {
                log('🎯 Active Missions:');
                this.activeQuests.forEach(questId => {
                    const quest = this.quests.get(questId);
                    if (quest) {
                        log(`  - ${quest.title} (${questId}): ${Math.round(quest.progress * 100)}%`);
                    }
                });
            };
            window.listAllMissions = () => {
                log('📋 All Missions:');
                this.quests.forEach((quest, questId) => {
                    const status = this.completedQuests.has(questId) ? 'Completed' :
                                  this.activeQuests.has(questId) ? 'Active' : 'Available';
                    log(`  - ${quest.title} (${questId}): ${status}`);
                });
            };
            log('🧪 Mission debug functions available: validateMission(), forceCompleteMission(), listActiveMissions(), listAllMissions()');
        }
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeQuests() {
        // structuredClone: objetivos guardam progresso (current), não pode vazar entre jogos
        for (const [id, config] of Object.entries(MISSIONS)) {
            this.addQuest(id, structuredClone(config));
        }

        log(`✅ ${this.quests.size} missões definidas (incluindo missões aprimoradas)`);
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
            timeWindow: config.timeWindowMs                 // Time window to start mission
                ? { start: this.simNow(), end: this.simNow() + config.timeWindowMs }
                : null,
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
                log(`🎯 Mission auto-activated: ${quest.title}`);
            }
        }, 100); // Small delay to ensure game is fully initialized
    }

    // ===== CONTROLE DE MISSÕES =====
    // Relógio das missões = tempo de jogo (gameTime): para na pausa, no tutorial e com popup aberto.
    // Date.now() continuaria correndo e a missão "envelheceria" com o jogo parado.
    simNow() {
        return this.gameManager.gameTime || 0;
    }

    // Missões são ativadas no boot; o relógio delas só deve contar depois do tutorial
    restartClocks() {
        this.activeQuests.forEach(id => { this.quests.get(id).startTime = this.simNow(); });
    }

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
            logWarn(`⚠️ Missão não disponível: ${questId}`);
            return false;
        }
        
        // Verificar limite de missões ativas
        if (this.activeQuests.size >= this.maxActiveQuests && quest.type !== 'tutorial') {
            logWarn('⚠️ Muitas missões ativas');
            return false;
        }
        
        // Iniciar missão
        quest.status = 'active';
        quest.startTime = this.simNow();
        this.activeQuests.add(questId);
        this.startMissionEvent(quest);
        
        // Definir como missão principal se for tutorial ou main
        if (quest.type === 'tutorial' || quest.type === 'main') {
            this.currentMainQuest = questId;
        }
        
        // Mostrar na UI
        this.updateQuestUI();
        
        // Notificar. Antes do jogo rodar (boot, tutorial de abertura congelado) vai só para o histórico:
        // o toast disputava a atenção com a Cláudia no primeiro minuto. A barra de missão mostra a missão depois.
        if (this.gameManager.uiManager) {
            const quiet = this.gameManager.gameState !== 'playing' || this.gameManager.tutorialDone === false;
            this.gameManager.uiManager.showNotification(
                `Nova missão: ${PlayerProfile.personalize(quest.title)}`,
                'info', undefined, { quiet }
            );
        }
        // Som só com o jogo rodando (no boot as missões se ativam sozinhas, atrás da tela de carregamento)
        if (typeof AudioManager !== 'undefined' && this.gameManager.gameState === 'playing') {
            AudioManager.playSound('sfx_mission_new');
        }
        
        log(`🎯 Missão iniciada: ${quest.title}`);
        return true;
    }
    
    completeQuest(questId) {
        const quest = this.quests.get(questId);
        if (!quest || quest.status !== 'active') return false;

        // Marcar como completa
        quest.status = 'completed';
        quest.completionTime = this.simNow();
        this.activeQuests.delete(questId);
        this.completedQuests.add(questId);
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('mission_done', { target: questId });
        this.gameManager.tutorialSystem?.onMissionCompleted(questId);

        // ===== ENHANCED COMPLETION SYSTEM =====

        // Estrelas (1 a 3): cumprir, cumprir bem (tempo/reserva) e com a cidade saudável. Cada estrela a mais = +25% de dinheiro
        quest.stars = this.computeStars(quest);
        const performanceMultiplier = this.calculatePerformanceMultiplier(quest);
        const budgetBefore = this.gameManager.resourceManager?.resources?.budget?.current || 0;
        this.applyQuestRewards(quest, performanceMultiplier);
        const budgetGained = (this.gameManager.resourceManager?.resources?.budget?.current || 0) - budgetBefore;

        // Fim da campanha: tela de vitória; o jogo continua no modo livre
        if (quest.victory) this.gameManager.gameOverSystem?.showVictory?.();

        this.checkUnlockConditions();

        // Atualizar UI
        this.updateQuestUI();

        // Comemoração: missão grande para o jogo um instante (cartão com estrelas e o que ganhou, ui/MissionCardUI.js);
        // a missão final já tem a tela de vitória. Sem o cartão (testes de unidade), fica o aviso de sempre.
        const ui = this.gameManager.uiManager;
        if (ui?.queueMissionCelebration && !quest.victory) {
            ui.queueMissionCelebration(quest, {
                stars: quest.stars, budget: budgetGained, goals: this.getStarGoals(quest), results: quest.starResults
            });
        } else if (ui) {
            ui.showNotification(`Missão completa: ${PlayerProfile.personalize(quest.title)} ${'⭐'.repeat(quest.stars)}`, 'success', 5000);
        }

        // ===== ENHANCED MISSION COMPLETION AUDIO FEEDBACK =====
        this.playMissionCompletionAudio(quest, performanceMultiplier);

        log(`✅ Missão completa: ${quest.title} (Performance: ${performanceMultiplier.toFixed(2)}x)`);
        return true;
    }

    /** Recompensa × estrelas: 1 estrela = 1×, 2 = 1,25×, 3 = 1,5× (o jingle de 3 estrelas é o "excelente"). */
    calculatePerformanceMultiplier(quest) {
        return 1 + QuestSystem.STAR_BONUS * (Math.max(1, quest.stars || 1) - 1);
    }

    static STAR_BONUS = 0.25;

    /** Meta das estrelas: js/data/missions.js (stars) ou a do desafio gerado (starSpec). */
    getStarSpec(quest) {
        return (typeof MISSIONS !== 'undefined' && MISSIONS[quest.id]?.stars) || quest.starSpec || {};
    }

    /**
     * Estrelas de uma missão concluída agora:
     * ⭐ cumpriu; ⭐ em até stars.parMs de jogo (ou, com stars.minWater, a reserva nunca abaixo dessa fração);
     * ⭐ cidade saudável ao terminar: água, poluição, satisfação e energia fora de "piorando"/"crítico".
     */
    computeStars(quest) {
        const spec = this.getStarSpec(quest);
        const results = [true]; // na ordem de getStarGoals: o cartão marca qual meta faltou
        if (Number.isFinite(spec.parMs)) {
            results.push((quest.completionTime ?? this.simNow()) - (quest.startTime ?? 0) <= spec.parMs);
        } else if (Number.isFinite(spec.minWater)) {
            results.push((quest.lowestWater ?? 1) >= spec.minWater);
        }
        results.push(this.isCityHealthy(quest));
        quest.starResults = results;
        return results.filter(Boolean).length;
    }

    /**
     * Bacia saudável = nenhum item de "Como está a bacia" no vermelho (ResourceManager.getBasinReport: água, poluição,
     * aquífero, rio, esgoto, energia). Um critério só (11/2026): antes a estrela usava outro, e o cartão podia mostrar
     * tudo com ✓ e negar a estrela sem dizer por quê.
     */
    isCityHealthy(quest = null) {
        const sick = this.getUnhealthyItems(quest);
        return sick !== null && sick.length === 0;
    }

    /**
     * Itens da bacia no vermelho (null = sem dados). `stars.ignore` da missão tira os itens que ela ainda não ensinou
     * (missão 1: energia — a bomba fica pronta antes do sol, que é a missão seguinte, e a 3ª estrela era impossível).
     */
    getUnhealthyItems(quest = null) {
        const report = this.gameManager.resourceManager?.getBasinReport?.();
        if (!report) return null;
        // a especificação vem de getStarSpec: quest.stars vira o NÚMERO de estrelas na conclusão, e o cartão (que
        // pergunta depois) perdia o ignore — "✕ Energia" ao lado de "★ bacia saudável" (4ª auditoria)
        const ignore = new Set(quest ? (this.getStarSpec(quest).ignore || []) : []);
        return report.filter(i => i.level === 'bad' && !ignore.has(i.id));
    }

    /** As metas de cada estrela em texto (painel da missão e cartão de comemoração). */
    getStarGoals(quest) {
        const spec = this.getStarSpec(quest);
        const second = Number.isFinite(spec.parMs)
            ? `Terminar em até ${Math.round(spec.parMs / 60000)} min de jogo`
            : Number.isFinite(spec.minWater)
                ? `Não deixar a reserva de água baixar de ${Math.round(spec.minWater * 100)}%`
                : null;
        return ['Cumprir a missão', second, 'Terminar com a bacia saudável (nada no vermelho em "Como está a bacia")'].filter(Boolean);
    }

    /** Menor fração da caixa d'água durante as missões com stars.minWater (para a 2ª estrela). */
    trackStarConditions() {
        const water = this.gameManager.resourceManager?.resources?.water;
        if (!water) return;
        const ratio = (water.current || 0) / Math.max(1, water.storage || water.max || 1);
        this.activeQuests.forEach(id => {
            const quest = this.quests.get(id);
            if (quest && Number.isFinite(this.getStarSpec(quest).minWater)) quest.lowestWater = Math.min(quest.lowestWater ?? 1, ratio);
        });
    }

    // ===== ENHANCED UPDATE SYSTEM =====
    update(deltaTime) {
        // Missões conferidas 4× por segundo (antes a cada quadro: cópia profunda dos recursos por objetivo, a 60 fps).
        // O tempo de 'sustained' vem do relógio do jogo (simNow), então juntar os quadros não muda a contagem.
        this.updateAccumulator = (this.updateAccumulator || 0) + deltaTime;
        if (this.updateAccumulator < QuestSystem.UPDATE_EVERY_MS) return;
        deltaTime = this.updateAccumulator;
        this.updateAccumulator = 0;

        this.trackStarConditions();

        // Atualizar progresso das missões ativas
        this.activeQuests.forEach(questId => {
            this.updateQuestProgress(questId, deltaTime);
        });

        // Sem missão nenhuma (campanha acabou ou falhou): um desafio novo, do tamanho da cidade (CityChallenges.js)
        this.updateCityChallenges?.();

        // Conquistas por níveis (AchievementTracks.js) e lembretes da missão parada (MissionReminders.js)
        this.updateAchievementTracks?.();
        this.updateMissionReminders?.();

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

                    log(`🎯 Objetivo dinâmico ativado: ${dynObj.description}`);
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
        const currentValue = this.getResourceValue(this.gameManager.resourceManager.resources, resource);
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
        const objectiveDone = o => (o.required > 0 ? (o.current || 0) >= o.required : !o.violated);
        const doneBefore = quest.objectives.filter(objectiveDone).length;
        
        quest.objectives.forEach(objective => {
            const progress = this.checkObjectiveProgress(objective, quest);
            objective.current = progress;
            
            // required 0 = "nenhuma ocorrência" (avoid): cumprido enquanto não for violado
            const objectiveProgress = objective.required > 0 ? Math.min(progress / objective.required, 1) : 1;
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

        // Um objetivo a mais cumprido (sem ser o último: esse toca o jingle da missão)
        if (!allObjectivesComplete && quest.objectives.filter(objectiveDone).length > doneBefore &&
            typeof AudioManager !== 'undefined' && this.gameManager.gameState === 'playing') {
            AudioManager.playSound('sfx_mission_progress');
        }

        // Objetivo 'avoid' violado (ex.: água acabou) reprova na hora
        if (quest.objectives.some(objective => objective.violated)) {
            this.failQuest(questId);
            return;
        }

        // Conclusão antes do limite de tempo: sobreviver até o fim do prazo é vencer
        if (allObjectivesComplete) {
            this.completeQuest(questId);
            return;
        }

        if (quest.timeLimit) {
            const elapsed = (this.simNow() - quest.startTime) / 1000;
            if (elapsed >= quest.timeLimit) {
                this.failQuest(questId);
            }
        }
    }
    
    checkObjectiveProgress(objective, quest) {
        const resourceManager = this.gameManager.resourceManager;
        const buildingSystem = this.gameManager.buildingSystem;
        
        switch (objective.type) {
            case 'build':
                // Só prédio pronto conta: a obra recém-colocada ainda não "construiu" nada
                if (buildingSystem) {
                    return buildingSystem.getBuildingsByType(objective.target).filter(b => !b.underConstruction).length;
                }
                break;
                
            case 'resource':
                if (resourceManager) {
                    const resources = resourceManager.getAllResources();
                    const value = this.getResourceValue(resources, objective.target);
                    
                    if (objective.comparison === 'greater') {
                        return value >= objective.required ? objective.required : value;
                    } else if (objective.comparison === 'less') {
                        // acima do limite o progresso é parcial (limite/valor < 1), nunca completo
                        return value <= objective.required ? objective.required : objective.required * (objective.required / value);
                    } else {
                        return value;
                    }
                }
                break;
                
            case 'sustained':
                // sustainedTime em segundos de jogo (simNow). Antes somava +1 por chamada, ou seja, por quadro:
                // "manter por 5 minutos" acabava em ~5 s.
                if (resourceManager) {
                    const resources = resourceManager.getAllResources();
                    const value = this.getResourceValue(resources, objective.target);
                    const now = this.simNow();
                    const elapsed = Number.isFinite(objective.lastSampleAt) ? Math.max(0, now - objective.lastSampleAt) / 1000 : 0;
                    objective.lastSampleAt = now;

                    if (value >= objective.threshold) {
                        objective.sustainedTime = (objective.sustainedTime || 0) + elapsed;
                        return objective.sustainedTime;
                    } else {
                        objective.sustainedTime = 0;
                        return 0;
                    }
                }
                break;
                
            case 'survival':
                return this.measureSurvival(objective, quest);

            // ===== Tipos novos (3ª auditoria: 13 das 19 missões eram "construa X + número") =====
            case 'notebook': { // espécies registradas no caderno de campo (target 'registered' | 'threatened')
                const nb = this.gameManager.fieldNotebook;
                if (!nb || typeof FieldNotebook === 'undefined') return 0;
                const ids = FieldNotebook.ids().filter(id => nb.isRegistered(id));
                return objective.target === 'threatened' ? ids.filter(id => FieldNotebook.isThreatened(id)).length : ids.length;
            }

            case 'decisions': { // boas decisões com o Paulo depois que a missão começou (EventSystem.responseStats.good)
                const stats = this.gameManager.eventSystem?.responseStats;
                if (!stats) return objective.current || 0;
                if (!Number.isFinite(objective.baseline)) objective.baseline = Math.max(0, (stats.good || 0) - (objective.current || 0));
                return Math.max(0, (stats.good || 0) - objective.baseline);
            }

            case 'impervious': { // chão coberto (asfalto, telhado) em até `required` % da área construída
                const share = this.getImperviousShare();
                objective.share = Math.round(share);
                return share <= objective.required ? objective.required : objective.required * (objective.required / Math.max(1, share));
            }

            case 'riparian': { // mudas prontas na mata ciliar (até TREES.RIPARIAN_DISTANCE da água): limpam mais
                if (!buildingSystem || typeof TreeSystem === 'undefined') return 0;
                const grid = this.gameManager.gridManager;
                return buildingSystem.getBuildingsByType('tree_sapling')
                    .filter(b => !b.underConstruction && TreeSystem.isRiparianCell(grid, b.gridX, b.gridZ)).length;
            }

            case 'hold': { // recurso no limite enquanto a crise da missão dura; abaixo dele = meta perdida (como 'avoid')
                const type = quest.startEvent?.type;
                const es = this.gameManager.eventSystem;
                const active = !!type && !!es && [...es.activeEvents.values()].some(e => e.type === type);
                if (active && resourceManager) {
                    const value = this.getResourceValue(resourceManager.getAllResources(), objective.target);
                    if (value < objective.threshold) objective.violated = true;
                }
                return 0;
            }

            case 'avoid':
                // Alvos aceitos estão em tests/unit/data.test.js (SUPPORTED.avoid)
                // Falta água = a reserva está secando sem produção que dê conta (hasWaterShortage), ou já secou
                if (objective.target === 'water_shortage' &&
                    (resourceManager.resources.water.current <= 0 || resourceManager.hasWaterShortage())) {
                    objective.violated = true;
                }
                return 0;
        }
        
        return 0;
    }
    
    /**
     * "Atravessar N s de <crise>": conta só o tempo de jogo com a crise da missão (startEvent) ativa. Antes contava
     * desde o início da missão, e o aviso do Paulo (45-90 s, dobrado por prêmio) comia a meta: a enchente terminava
     * a missão no instante em que chegava (3ª auditoria, B1). Enquanto a crise não chega, `objective.waitingS` diz em
     * quanto tempo (ou `awaitingDecision`), e o painel mostra. Crise que acabou antes (emergência, fim natural) = meta
     * cumprida. Missão sem startEvent = tempo desde o início, como antes.
     */
    measureSurvival(objective, quest) {
        const type = quest.startEvent?.type;
        const es = this.gameManager.eventSystem;
        if (!type || !es) return Math.min((this.simNow() - quest.startTime) / 1000, objective.required);
        const now = this.simNow();
        const elapsed = Number.isFinite(objective.lastSampleAt) ? Math.max(0, now - objective.lastSampleAt) / 1000 : 0;
        objective.lastSampleAt = now;
        const base = Number.isFinite(objective.survived) ? objective.survived : (objective.current || 0);
        const active = [...es.activeEvents.values()].some(e => e.type === type);
        const pending = es.pendingEvents.find(p => p.type === type);
        if (active) {
            objective.crisisSeen = true;
            objective.waitingS = null;
            objective.awaitingDecision = false;
            objective.survived = Math.min(objective.required, base + elapsed);
        } else if (pending) {
            objective.awaitingDecision = !!pending.awaiting;
            objective.waitingS = pending.awaiting ? null : Math.max(0, Math.ceil((pending.remainingTime || 0) / 1000));
            objective.survived = base;
        } else {
            // nada ativo nem a caminho: a crise passou (ou foi encerrada) — atravessou
            objective.waitingS = null;
            objective.awaitingDecision = false;
            objective.survived = objective.required;
        }
        return objective.survived;
    }

    /**
     * Quanto da área construída a chuva não atravessa (0-100), com as mesmas regras do risco de enchente
     * (EventSystem.getFloodRisk): ruas pelo runoffImpervious (asfalto 1, terra 0,6, cascalho 0,4), zonas pela fração do
     * lote coberta, outros prédios 0,3; jardins de chuva, mudas e áreas verdes não cobrem nada.
     */
    getImperviousShare() {
        const buildings = this.gameManager.buildingSystem?.getAllBuildings?.() || [];
        let impervious = 0;
        let area = 0;
        buildings.forEach(b => {
            if (b.underConstruction) return;
            const cfg = b.config || {};
            const cells = cfg.roadType ? 1 : (cfg.size || 1) ** 2;
            area += cells;
            if (cfg.roadType) impervious += cfg.runoffImpervious || 0;
            else if (Number.isFinite(cfg.runoffImpervious)) impervious += cells * cfg.runoffImpervious;
            else if (!cfg.runoffAbsorption && !cfg.plantedTree) impervious += cells * 0.3;
        });
        return area > 0 ? (impervious / area) * 100 : 0;
    }

    getResourceValue(resources, target) {
        switch (target) {
            case 'water': return resources.water.current;
            case 'pollution': return resources.pollution.current;
            case 'population': return resources.population.current;
            case 'satisfaction': return resources.population.satisfaction;
            case 'budget': return resources.budget.current;
            case 'aquifer': return Number.isFinite(resources.water.aquifer) ? resources.water.aquifer : 100;
            case 'river': return Number.isFinite(resources.water.river) ? resources.water.river : 100;
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
                log(`🎯 Pontuação com bônus: ${scaledScore} (${quest.rewards.score} base + ${Math.round((performanceMultiplier - 1) * quest.rewards.score)} bônus)`);
            }
        }

        // Orçamento (with performance scaling)
        if (quest.rewards.budget && resourceManager) {
            const scaledBudget = Math.round(quest.rewards.budget * performanceMultiplier);
            resourceManager.adjustResource('budget', scaledBudget);

            if (performanceMultiplier > 1) {
                log(`💰 Orçamento com bônus: ${scaledBudget}`);
            }
        }

        if (quest.rewards.reputation) this.changeReputation(quest.rewards.reputation, 'missão');

        // Estudo recomendado: quem desbloqueia é o estudo (StudySystem); a missão só aponta o próximo
        (quest.rewards.recommendStudy || []).forEach(buildingTypeId => {
            const buildingType = buildingSystem?.buildingTypes?.get(buildingTypeId);
            const unlocked = this.gameManager.studySystem?.isBuildingUnlocked?.(buildingTypeId);
            if (buildingType && !unlocked) {
                // Informativo: selo "novo" na categoria + histórico (o cartão da missão já mostra o estudo)
                this.gameManager.uiManager?.markNewStudy?.(buildingTypeId);
                this.gameManager.uiManager?.showNotification(
                    `📖 Novo estudo recomendado: ${buildingType.name}. Clique nele na aba de construções para estudar e liberar.`,
                    'info', 8000, { quiet: true }
                );
            }
        });

        this.applyRewardPerks(quest.rewards);

        // Conquistas
        if (quest.rewards.achievement) {
            this.unlockAchievement(quest.rewards.achievement);
        }

        // ===== NEW REWARD TYPES =====

        // Experience points
        if (quest.rewards.experience) {
            const scaledExp = Math.round(quest.rewards.experience * performanceMultiplier);
            // TODO: Implement experience system
            log(`⭐ Experiência ganha: ${scaledExp}`);
        }

        // Special unlocks based on performance
        if (quest.rewards.performanceUnlocks && performanceMultiplier >= 1.5) {
            quest.rewards.performanceUnlocks.forEach(unlock => {
                log(`🌟 Desbloqueio especial por desempenho: ${unlock}`);
                // TODO: Implement special unlocks
            });
        }
    }

    // ===== RECOMPENSAS QUE RESOLVEM O PRÓXIMO PROBLEMA =====
    // rewards.discount { tipo: % } (uma obra), rewards.freeBuilds { tipo: n } (n obras de graça),
    // rewards.earlyWarningMs (eventos avisam com o dobro de antecedência por esse tempo de jogo), rewards.emergency (+n)
    getPerks() {
        if (!this.perks) this.perks = { discounts: {}, freeBuilds: {}, earlyWarningUntil: 0 };
        return this.perks;
    }

    applyRewardPerks(rewards = {}) {
        const perks = this.getPerks();
        for (const [type, percent] of Object.entries(rewards.discount || {})) perks.discounts[type] = Math.max(perks.discounts[type] || 0, percent);
        for (const [type, count] of Object.entries(rewards.freeBuilds || {})) perks.freeBuilds[type] = (perks.freeBuilds[type] || 0) + count;
        if (rewards.earlyWarningMs) perks.earlyWarningUntil = Math.max(perks.earlyWarningUntil, this.simNow()) + rewards.earlyWarningMs;
        if (rewards.emergency && this.gameManager.gameOverSystem) {
            this.gameManager.gameOverSystem.extraEmergencies = (this.gameManager.gameOverSystem.extraEmergencies || 0) + rewards.emergency;
        }
    }

    /** Preço da próxima obra deste tipo com o prêmio de missão (sem gastar o prêmio). */
    getPerkCost(typeId, cost) {
        const perks = this.getPerks();
        if (perks.freeBuilds[typeId] > 0) return 0;
        const percent = perks.discounts[typeId];
        // engenheiro/a civil (CityStaff, bonus 'buildCost'): obra mais barata, junto com o prêmio de missão
        const civil = 1 - (this.gameManager?.cityStaff?.bonus?.('buildCost') || 0);
        if (civil === 1 && !percent) return cost;
        return Math.round((percent ? cost * (1 - percent / 100) : cost) * civil);
    }

    /** A obra foi paga com o prêmio: gasta uma obra grátis ou o desconto. */
    consumeBuildPerk(typeId) {
        const perks = this.getPerks();
        if (perks.freeBuilds[typeId] > 0) {
            if (--perks.freeBuilds[typeId] <= 0) delete perks.freeBuilds[typeId];
        } else if (perks.discounts[typeId]) {
            delete perks.discounts[typeId];
        }
    }

    isEarlyWarningActive() {
        return this.getPerks().earlyWarningUntil > this.simNow();
    }

    /** Selos dos prêmios de uma missão (painel e cartão de comemoração). */
    describeRewardPerks(rewards = {}) {
        const name = id => this.gameManager.buildingSystem?.buildingTypes?.get(id)?.name || id;
        const chips = [];
        for (const [type, percent] of Object.entries(rewards.discount || {})) chips.push(`🏷️ ${name(type)} com ${percent}% de desconto`);
        for (const [type, count] of Object.entries(rewards.freeBuilds || {})) chips.push(`🎁 ${count}× ${name(type)} de graça`);
        if (rewards.earlyWarningMs) chips.push(`📡 Avisos de evento em dobro por ${Math.round(rewards.earlyWarningMs / 60000)} min`);
        if (rewards.emergency) chips.push(`🚨 +${rewards.emergency} declaração de emergência`);
        return chips;
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

    /**
     * TASK #2: Fixed - Shows choice dialog in details panel
     */
    showChoiceDialog(quest, choice) {
        if (!this.gameManager.uiManager) return;

        const detailsContent = document.getElementById('details-content');
        if (!detailsContent) return;

        const dialogContent = `
            <div class="choice-dialog">
                <div class="choice-header">
                    <div class="choice-mission-title">
                        <span class="mission-icon">${uiIcon(quest.missionIcon || 'ui-target', 'lg')}</span>
                        <h3>${quest.title}</h3>
                    </div>
                    <p class="choice-question">🎭 ${choice.question}</p>
                </div>
                <div class="choice-options">
                    ${choice.options.map((option, index) => {
                        const consequences = option.consequences || {};
                        const consequenceText = this.formatConsequences(consequences);

                        return `
                            <button class="choice-option"
                                    onclick="window.gameManager.questSystem.makeChoice('${quest.id}', '${choice.id}', ${index})">
                                <div class="choice-option-text">${option.text}</div>
                                ${consequenceText ? `<div class="choice-consequences">${consequenceText}</div>` : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
                <div class="choice-footer">
                    <button class="choice-cancel-btn" onclick="window.gameManager.questSystem.closeMissionInterface()">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;

        detailsContent.innerHTML = uiIconsIn(dialogContent);

        // Show the details panel
        this.gameManager.uiManager.showMissionPanel();

        log(`🎭 Choice dialog shown for: ${quest.title}`);
    }

    /**
     * TASK #2: Formats consequences for display
     */
    formatConsequences(consequences) {
        const parts = [];

        if (consequences.budget) {
            const sign = consequences.budget > 0 ? '+' : '';
            parts.push(`💰 ${sign}R$ ${consequences.budget}`);
        }

        if (consequences.reputation) {
            Object.entries(consequences.reputation).forEach(([stakeholder, value]) => {
                const sign = value > 0 ? '+' : '';
                const icon = this.getStakeholderIcon(stakeholder);
                parts.push(`${icon} ${sign}${value}`);
            });
        }

        if (consequences.timeLimit) {
            parts.push(`⏰ ${consequences.timeLimit}s`);
        }

        return parts.join(' | ');
    }

    /**
     * TASK #2: Gets icon for stakeholder
     */
    getStakeholderIcon(stakeholder) {
        const icons = {
            citizens: '👥',
            environment: '🌿',
            business: '💼',
            government: '🏛️'
        };
        return icons[stakeholder] || '📊';
    }

    /**
     * TASK #2: Enhanced - Makes a choice and applies consequences
     */
    makeChoice(questId, choiceId, optionIndex) {
        const quest = this.quests.get(questId);
        if (!quest) return;

        const choice = quest.choices.find(c => c.id === choiceId);
        if (!choice || !choice.options[optionIndex]) return;

        const selectedOption = choice.options[optionIndex];

        // Apply consequences
        this.applyChoiceConsequences(selectedOption.consequences);

        // Remove the choice from the quest
        quest.choices = quest.choices.filter(c => c.id !== choiceId);

        // Show notification
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `✅ Decisão tomada: ${selectedOption.text}`,
                'success',
                5000
            );
        }

        // Audio feedback
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('sfx_success', 0.8);
        }

        // Refresh mission interface to show updated mission
        this.renderMissionInterface();

        log(`🎯 Escolha feita: ${selectedOption.text}`);
    }

    /**
     * TASK #2: Enhanced - Applies choice consequences (budget, reputation, etc.)
     */
    applyChoiceConsequences(consequences) {
        if (!consequences) return;

        // Apply budget changes
        if (consequences.budget && this.gameManager.resourceManager) {
            this.gameManager.resourceManager.adjustResource('budget', consequences.budget);

            if (consequences.budget !== 0) {
                const type = consequences.budget > 0 ? 'Ganho' : 'Gasto';
                const amount = Math.abs(consequences.budget);
                log(`💰 ${type} de orçamento: R$ ${amount}`);
            }
        }

        // Apply reputation changes
        if (consequences.reputation) this.changeReputation(consequences.reputation, 'sua decisão');

        // Apply time limit changes
        if (consequences.timeLimit) {
            log(`⏰ Limite de tempo alterado: ${consequences.timeLimit}s`);
        }

        // Apply resource changes
        if (consequences.resources && this.gameManager.resourceManager) {
            Object.entries(consequences.resources).forEach(([resource, value]) => {
                if (resource === 'water' || resource === 'pollution') {
                    this.gameManager.resourceManager.adjustResource(resource, value);
                }
            });
        }
    }

    getMissionsByUrgency(urgencyLevel) {
        return Array.from(this.quests.values()).filter(quest =>
            quest.urgency === urgencyLevel && quest.status === 'active'
        );
    }

    checkTimeWindowMissions() {
        const now = this.simNow();

        this.quests.forEach(quest => {
            if (quest.timeWindow && quest.status === 'available') {
                if (now > quest.timeWindow.end) {
                    // Mission expired
                    quest.status = 'expired';
                    log(`⏰ Missão expirou: ${quest.title}`);

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
    
    /** Conquista de missão ou do Paulo: aviso na hora, com o botão "Ver conquistas" (AchievementTracks.announceAchievement). */
    unlockAchievement(achievementId) {
        if (this.achievements.has(achievementId)) return;
        this.achievements.add(achievementId);
        this.recordAchievement?.(achievementId);
        if (this.announceAchievement) return this.announceAchievement(achievementId);
        const info = (typeof ACHIEVEMENTS !== 'undefined' && ACHIEVEMENTS[achievementId]) || { icon: '🏆', name: achievementId };
        this.gameManager.uiManager?.showNotification(`🏆 Conquista: ${info.icon} ${info.name}`, 'success', 8000);
    }
    
    // ===== CONDIÇÕES DE DESBLOQUEIO =====
    // ===== REPUTAÇÃO DOS GRUPOS (0-100, começa em 50) =====
    // Muda com escolhas (missões e eventos) e com o que se constrói (config.reputationOnBuild). Tem efeito:
    // moradores → satisfação ±5; comércio → impostos 0,8×-1,2×; meio ambiente → limpeza ±5/min; governo → subsídios.
    static STAKEHOLDERS = {
        citizens: { icon: '👥', name: 'Moradores', effect: 'satisfação' },
        environment: { icon: '🌿', name: 'Meio Ambiente', effect: 'limpeza do rio' },
        business: { icon: '💼', name: 'Comércio', effect: 'impostos' },
        government: { icon: '🏛️', name: 'Governo', effect: 'chance de subsídio' }
    };

    /** Soma { grupo: delta } na reputação (limitada a 0-100). `reason` vai no toast. */
    changeReputation(changes, reason = '') {
        const shown = [];
        Object.entries(changes || {}).forEach(([stakeholder, value]) => {
            if (!Number.isFinite(value) || !value) return;
            const before = Number.isFinite(this.stakeholderReputation[stakeholder]) ? this.stakeholderReputation[stakeholder] : 50;
            this.stakeholderReputation[stakeholder] = Math.max(0, Math.min(100, before + value));
            const info = QuestSystem.STAKEHOLDERS[stakeholder];
            if (info) shown.push(`${info.icon} ${info.name} ${value > 0 ? '+' : ''}${value}`);
        });
        if (shown.length && this.gameManager.gameState === 'playing') {
            // só no histórico (3ª auditoria: 4 toasts juntos depois de cada decisão); o painel de missões mostra a reputação
            this.gameManager.uiManager?.showNotification?.(`🤝 Reputação${reason ? ` (${reason})` : ''}: ${shown.join(', ')}`, 'info', 4000, { quiet: true });
        }
    }

    getReputation(stakeholder) {
        const value = this.stakeholderReputation[stakeholder];
        return Number.isFinite(value) ? value : 50;
    }

    /** O que a reputação faz agora (lido pelo ResourceManager e pelo EventSystem). */
    getReputationModifiers() {
        const off = key => (this.getReputation(key) - 50) / 50; // −1 … +1
        return {
            satisfaction: off('citizens') * 5,
            income: 1 + off('business') * 0.2,
            pollution: off('environment') * 5,
            grantChance: Math.max(0.2, 1 + off('government'))
        };
    }

    // A ordem vem dos dados: prerequisites de cada missão (js/data/missions.js), na ordem de MISSIONS.
    // No máximo MAX_ACTIVE por categoria (11/2026: no ato 1 chegavam a 3 missões ao mesmo tempo); a liberada fica
    // na fila e começa quando a vaga abrir. Desafios da cidade (city_challenge_*) não contam nem esperam.
    // Secundárias = 2 (3ª auditoria: com 1, e 15 das 19 missões secundárias, a campanha ramificada virava fila), mas
    // no máximo uma crise (missão com startEvent) por vez.
    static MAX_ACTIVE = { primary: 1, secondary: 2 };

    hasActiveCrisis() {
        return [...this.activeQuests].some(id => !!this.quests.get(id)?.startEvent);
    }

    activeCountByCategory() {
        const count = { primary: 0, secondary: 0 };
        this.activeQuests.forEach(id => {
            if (String(id).startsWith('city_challenge_')) return;
            const cat = this.quests.get(id)?.category === 'primary' ? 'primary' : 'secondary';
            count[cat]++;
        });
        return count;
    }

    checkUnlockConditions() {
        const count = this.activeCountByCategory();
        this.quests.forEach((quest, id) => {
            if (!this.canStartMission(id)) return;
            const challenge = String(id).startsWith('city_challenge_');
            const cat = quest.category === 'primary' ? 'primary' : 'secondary';
            if (!challenge && count[cat] >= (QuestSystem.MAX_ACTIVE[cat] ?? Infinity)) return;
            if (quest.startEvent && this.hasActiveCrisis()) return; // uma crise de cada vez
            this.startQuest(id);
            if (!challenge && this.activeQuests.has(id)) count[cat]++;
        });
    }

    /**
     * Missão com startEvent (ex.: Crise Hídrica → seca). Passa pelas mesmas regras dos eventos sorteados (11/2026):
     * já ativo ou anunciado = só estica; um evento que não combina com ele (EventSystem.ANTAGONISTS: seca × chuva)
     * termina antes; acima do limite (MAX_SIMULTANEOUS), o mais antigo termina; e a crise chega pelo Paulo
     * (announceEvent: decisão + aviso), não de surpresa.
     */
    startMissionEvent(quest) {
        const spec = quest.startEvent;
        const eventSystem = this.gameManager.eventSystem;
        if (!spec || !eventSystem) return;
        const existing = [...eventSystem.activeEvents.values()].find(e => e.type === spec.type);
        if (existing) {
            existing.remainingTime = Math.max(existing.remainingTime, spec.durationMs);
            existing.duration = Math.max(existing.duration, spec.durationMs);
            return;
        }
        const pending = eventSystem.pendingEvents.find(p => p.type === spec.type);
        if (pending) {
            pending.duration = Math.max(pending.duration || 0, spec.durationMs);
            return;
        }
        const enemies = eventSystem.eventsAgainst?.(spec.type) || [];
        const ended = [...eventSystem.activeEvents.values()].filter(e => enemies.includes(e.type));
        ended.forEach(e => eventSystem.endEvent(e.id));
        eventSystem.pendingEvents = eventSystem.pendingEvents.filter(p => !enemies.includes(p.type));
        const name = type => eventSystem.eventTypes?.get?.(type)?.name || type;
        if (ended.length) {
            this.gameManager.uiManager?.showNotification?.(`${ended.map(e => name(e.type)).join(' e ')} acabou antes da hora: o tempo virou.`, 'info', 5000);
        }
        // Limite de eventos ao mesmo tempo: conta ativos e anunciados (antes só encerrava ativos, e com 3 avisos na
        // fila a crise entrava como 4º). Primeiro sai o ativo mais antigo; sem ativo, o aviso mais antigo que não é crise de missão.
        const max = eventSystem.maxSimultaneous ?? 3;
        while (eventSystem.getOngoingEventTypes().length >= max) {
            if (eventSystem.activeEvents.size) {
                const oldest = [...eventSystem.activeEvents.values()].sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0))[0];
                eventSystem.endEvent(oldest.id);
                continue;
            }
            const drop = eventSystem.pendingEvents.findIndex(p => !p.mission);
            if (drop < 0) break;
            eventSystem.pendingEvents.splice(drop, 1);
        }
        eventSystem.announceEvent(spec.type, { duration: spec.durationMs, mission: quest.id });
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
        
        log(`❌ Missão falhou: ${quest.title}`);
    }
    
    // ===== Interface de missões (painel, cards, carrossel, detalhes): js/systems/ui/MissionUI.js (29 métodos) =====

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
                log(`🔒 Mission ${mission.title} blocked by prerequisites:`,
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

        log(`🔍 Validating mission completion: ${mission.title}`);

        // Check each objective
        let allObjectivesComplete = true;
        mission.objectives.forEach((objective, index) => {
            const progress = this.checkObjectiveProgress(objective, mission);
            const isComplete = progress >= objective.required;

            log(`  📋 Objective ${index + 1}: ${objective.description}`);
            log(`     Progress: ${progress}/${objective.required} ${isComplete ? '✅' : '⏳'}`);

            if (!isComplete) {
                allObjectivesComplete = false;
            }
        });

        log(`🎯 Mission ${mission.title} completion status: ${allObjectivesComplete ? '✅ Complete' : '⏳ In Progress'}`);
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

        log(`🧪 Force completing mission: ${mission.title}`);

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

    // ===== SAVE/LOAD =====
    // Tempos (startTime, completionTime, timeWindow) são em gameTime, que também vai no save: os prazos
    // continuam de onde estavam. Objetivos guardam só o progresso (o texto vem de js/data/missions.js).
    getSaveData() {
        const objectiveState = objective => ({
            id: objective.id,
            current: objective.current,
            sustainedTime: objective.sustainedTime,
            violated: objective.violated || undefined,
            activated: objective.activated || undefined
        });
        return {
            activeQuests: Array.from(this.activeQuests),
            completedQuests: Array.from(this.completedQuests),
            currentMainQuest: this.currentMainQuest,
            totalScore: this.totalScore,
            questCounter: this.questCounter,
            achievements: Array.from(this.achievements),
            trackTimers: this.trackTimers ? { ...this.trackTimers } : undefined,
            stakeholderReputation: { ...this.stakeholderReputation },
            cityChallenges: this.getCityChallengeSaveData?.(),
            perks: structuredClone(this.getPerks()),
            questStates: Array.from(this.quests.entries()).map(([id, quest]) => ({
                id,
                status: quest.status,
                startTime: quest.startTime,
                completionTime: quest.completionTime,
                progress: quest.progress,
                stars: quest.stars,
                lowestWater: quest.lowestWater,
                timeWindow: quest.timeWindow,
                objectives: quest.objectives.map(objectiveState),
                dynamicObjectives: (quest.dynamicObjectives || []).filter(o => o.activated).map(o => o.id),
                choices: (quest.choices || []).map(choice => choice.id) // escolhas já feitas saem da lista
            }))
        };
    }

    loadData(data) {
        if (!data) return;
        // Desafios da cidade gerados na partida voltam antes do estado (eles não estão em js/data/missions.js)
        this.loadCityChallenges?.(data.cityChallenges);
        if (data.perks) this.perks = { discounts: {}, freeBuilds: {}, earlyWarningUntil: 0, ...data.perks };
        // save antigo pode citar missões removidas de js/data/missions.js
        const known = id => this.quests.has(id);
        this.activeQuests = new Set((data.activeQuests || []).filter(known));
        this.completedQuests = new Set((data.completedQuests || []).filter(known));
        this.currentMainQuest = known(data.currentMainQuest) ? data.currentMainQuest : null;
        this.totalScore = data.totalScore || 0;
        this.questCounter = data.questCounter || 0;
        // trilhas que saíram de js/data/achievementTracks.js (11/2026: fontes, asfalto, terra, caixa) não voltam
        const knownTrack = id => { const m = /^track_(.+)_[1-5]$/.exec(String(id)); return !m || typeof ACHIEVEMENT_TRACKS === 'undefined' || !!ACHIEVEMENT_TRACKS[m[1]]; };
        this.achievements = new Set((data.achievements || []).filter(knownTrack));
        this.trackTimers = { ...(QuestSystem.emptyTrackTimers?.() || {}), ...(data.trackTimers || {}) };
        this.lastTrackSimAt = null;
        this.tracksPrimed = false; // 1ª conferência das conquistas de nível depois do load: em silêncio (save antigo)
        this.achievementToastQueue = [];
        if (data.stakeholderReputation) Object.assign(this.stakeholderReputation, data.stakeholderReputation);

        (data.questStates || []).forEach(state => {
            const quest = this.quests.get(state.id);
            if (!quest) return;
            quest.status = state.status;
            quest.startTime = state.startTime;
            quest.completionTime = state.completionTime;
            quest.progress = state.progress || 0;
            if (Number.isFinite(state.stars)) quest.stars = state.stars;
            if (Number.isFinite(state.lowestWater)) quest.lowestWater = state.lowestWater;
            if (state.timeWindow !== undefined) quest.timeWindow = state.timeWindow;

            // Objetivos dinâmicos que já tinham aparecido voltam para a lista antes do progresso
            (state.dynamicObjectives || []).forEach(id => {
                const dynamic = (quest.dynamicObjectives || []).find(o => o.id === id);
                if (dynamic && !dynamic.activated) {
                    dynamic.activated = true;
                    quest.objectives.push(dynamic);
                }
            });
            (state.objectives || []).forEach((saved, index) => {
                const objective = quest.objectives.find(o => saved.id !== undefined && o.id === saved.id) || quest.objectives[index];
                if (!objective) return;
                if (Number.isFinite(saved.current)) objective.current = saved.current;
                if (Number.isFinite(saved.sustainedTime)) objective.sustainedTime = saved.sustainedTime;
                if (saved.violated) objective.violated = true;
            });
            if (Array.isArray(state.choices)) {
                quest.choices = (quest.choices || []).filter(choice => state.choices.includes(choice.id));
            }
        });
        // Status e listas coerentes (save editado à mão): vale para as missões que têm estado no save
        (data.questStates || []).forEach(({ id }) => {
            const quest = this.quests.get(id);
            if (!quest) return;
            if (quest.status === 'active') this.activeQuests.add(id);
            else this.activeQuests.delete(id);
            if (quest.status === 'completed') this.completedQuests.add(id);
        });
    }

    // ===== SOM DA MISSÃO CONCLUÍDA =====
    // Jingle com a música abaixada (AudioManager.onMissionComplete); desempenho excelente ganha a conquista.
    playMissionCompletionAudio(quest, performanceMultiplier) {
        if (typeof AudioManager === 'undefined') return;
        AudioManager.onMissionComplete(performanceMultiplier >= 1.5); // 3 estrelas
        log(`🔊 Som de missão concluída: "${quest.title}"`);
    }
}

// Exportar para escopo global
window.QuestSystem = QuestSystem;
log('🎯 QuestSystem carregado e exportado para window.QuestSystem');

QuestSystem.UPDATE_EVERY_MS = 250; // conferência das missões (QuestSystem.update)
