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
                ? { start: Date.now(), end: Date.now() + config.timeWindowMs }
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
        
        log(`🎯 Missão iniciada: ${quest.title}`);
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

        log(`✅ Missão completa: ${quest.title} (Performance: ${performanceMultiplier.toFixed(2)}x)`);
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

        // Desbloqueios
        if (quest.rewards.unlock) {
            quest.rewards.unlock.forEach(buildingTypeId => {
                const buildingType = buildingSystem?.buildingTypes.get(buildingTypeId);
                if (buildingType) {
                    buildingType.unlocked = true;
                    log(`🔓 Desbloqueado: ${buildingType.name}`);
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
                        <span class="mission-icon">${quest.missionIcon || '🎯'}</span>
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

        detailsContent.innerHTML = dialogContent;

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
        if (consequences.reputation) {
            Object.entries(consequences.reputation).forEach(([stakeholder, value]) => {
                if (!this.stakeholderReputation[stakeholder]) {
                    this.stakeholderReputation[stakeholder] = 50; // Default reputation
                }

                this.stakeholderReputation[stakeholder] += value;
                this.stakeholderReputation[stakeholder] = Math.max(0, Math.min(100, this.stakeholderReputation[stakeholder]));

                const icon = this.getStakeholderIcon(stakeholder);
                const sign = value > 0 ? '+' : '';
                log(`${icon} Reputação ${stakeholder}: ${sign}${value} (total: ${this.stakeholderReputation[stakeholder]})`);
            });
        }

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
        const now = Date.now();

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
            
            if (this.gameManager.uiManager) {
                this.gameManager.uiManager.showNotification(
                    `🏆 Conquista desbloqueada: ${achievementId}`,
                    'success',
                    8000
                );
            }
            
            log(`🏆 Conquista desbloqueada: ${achievementId}`);
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
            const progress = this.checkObjectiveProgress(objective);
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

            log(`🔊 Mission completion audio played: ${celebrationLevel} level for "${quest.title}"`);

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

            log('🎵 Procedural victory sound created');

        } catch (error) {
            console.warn('⚠️ Error creating procedural victory sound:', error);
        }
    }
}

// Exportar para escopo global
window.QuestSystem = QuestSystem;
log('🎯 QuestSystem carregado e exportado para window.QuestSystem');
