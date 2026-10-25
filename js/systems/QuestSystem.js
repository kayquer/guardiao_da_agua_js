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
        quest.startTime = this.simNow();
        this.activeQuests.add(questId);
        this.startMissionEvent(quest);
        
        // Definir como missão principal se for tutorial ou main
        if (quest.type === 'tutorial' || quest.type === 'main') {
            this.currentMainQuest = questId;
        }
        
        // Mostrar na UI
        this.updateQuestUI();
        
        // Notificar
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `Nova missão: ${PlayerProfile.personalize(quest.title)}`,
                'info'
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
        results.push(this.isCityHealthy());
        quest.starResults = results;
        return results.filter(Boolean).length;
    }

    /** Nenhum recurso principal no vermelho (mesmas faixas dos botões do HUD, js/systems/ResourceTrends.js). */
    isCityHealthy() {
        const r = this.gameManager.resourceManager?.resources;
        if (!r || typeof ResourceTrends === 'undefined') return false;
        return ['water', 'pollution', 'satisfaction', 'energy'].every(id => {
            const tier = ResourceTrends.tierOf(id, r);
            return tier === 'great' || tier === 'ok';
        });
    }

    /** As metas de cada estrela em texto (painel da missão e cartão de comemoração). */
    getStarGoals(quest) {
        const spec = this.getStarSpec(quest);
        const second = Number.isFinite(spec.parMs)
            ? `Terminar em até ${Math.round(spec.parMs / 60000)} min de jogo`
            : Number.isFinite(spec.minWater)
                ? `Não deixar a reserva de água baixar de ${Math.round(spec.minWater * 100)}%`
                : null;
        return ['Cumprir a missão', second, 'Terminar com água, poluição, satisfação e energia fora do vermelho'].filter(Boolean);
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
                
            case 'survival': {
                const elapsed = (this.simNow() - quest.startTime) / 1000;
                return Math.min(elapsed, objective.required);
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
    
    getResourceValue(resources, target) {
        switch (target) {
            case 'water': return resources.water.current;
            case 'pollution': return resources.pollution.current;
            case 'population': return resources.population.current;
            case 'satisfaction': return resources.population.satisfaction;
            case 'budget': return resources.budget.current;
            case 'aquifer': return Number.isFinite(resources.water.aquifer) ? resources.water.aquifer : 100;
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
        return percent ? Math.round(cost * (1 - percent / 100)) : cost;
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
    
    unlockAchievement(achievementId) {
        if (!this.achievements.has(achievementId)) {
            this.achievements.add(achievementId);
            
            const info = (typeof ACHIEVEMENTS !== 'undefined' && ACHIEVEMENTS[achievementId]) || { icon: '🏆', name: achievementId };
            this.gameManager.uiManager?.showNotification(`🏆 Conquista: ${info.icon} ${info.name}${info.description ? ` — ${info.description}` : ''}`, 'success', 8000);
            
            log(`🏆 Conquista desbloqueada: ${achievementId}`);
        }
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
            this.gameManager.uiManager?.showNotification?.(`🤝 Reputação${reason ? ` (${reason})` : ''}: ${shown.join(', ')}`, 'info', 4000);
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

    // A ordem vem dos dados: prerequisites de cada missão (js/data/missions.js)
    checkUnlockConditions() {
        this.quests.forEach((quest, id) => {
            if (this.canStartMission(id)) this.startQuest(id);
        });
    }

    /** Missão com startEvent (ex.: Crise Hídrica → seca): começa o evento, ou estica o que já está ativo. */
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
        eventSystem.triggerEvent(spec.type, false, { duration: spec.durationMs });
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
        this.achievements = new Set(data.achievements || []);
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
