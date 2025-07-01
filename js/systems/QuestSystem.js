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
        
        this.initializeQuests();
        
        console.log('✅ QuestSystem inicializado');
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeQuests() {
        console.log('🎯 Definindo missões educacionais...');
        
        // MISSÕES TUTORIAL
        this.addQuest('tutorial_01', {
            title: 'Bem-vindo, Guardião!',
            description: 'Construa sua primeira bomba de água para começar a fornecer água à população.',
            type: 'tutorial',
            category: 'construction',
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
                unlock: ['water_well']
            },
            educationalContent: {
                facts: [
                    'Uma bomba de água pode extrair até 50 litros por segundo de fontes subterrâneas.',
                    'É importante monitorar o nível dos aquíferos para evitar esgotamento.'
                ],
                tips: [
                    'Posicione bombas longe de fontes de poluição.',
                    'Diversifique suas fontes de água para maior segurança.'
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
        
        console.log(`✅ ${this.quests.size} missões definidas`);
    }
    
    addQuest(id, config) {
        this.quests.set(id, {
            id,
            ...config,
            status: 'available',
            startTime: null,
            completionTime: null,
            progress: 0
        });
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
        
        // Aplicar recompensas
        this.applyQuestRewards(quest);
        
        // Verificar próximas missões
        this.checkUnlockConditions();
        
        // Atualizar UI
        this.updateQuestUI();
        
        // Notificar
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `Missão completa: ${quest.title}`,
                'success'
            );
        }
        
        // Som de sucesso
        AudioManager.playSound('sfx_success');
        
        console.log(`✅ Missão completa: ${quest.title}`);
        return true;
    }
    
    // ===== ATUALIZAÇÃO =====
    update(deltaTime) {
        // Atualizar progresso das missões ativas
        this.activeQuests.forEach(questId => {
            this.updateQuestProgress(questId, deltaTime);
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
        quest.progress = totalProgress / quest.objectives.length;
        
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
    
    // ===== RECOMPENSAS =====
    applyQuestRewards(quest) {
        if (!quest.rewards) return;
        
        const resourceManager = this.gameManager.resourceManager;
        const buildingSystem = this.gameManager.buildingSystem;
        
        // Pontuação
        if (quest.rewards.score) {
            this.totalScore += quest.rewards.score;
        }
        
        // Orçamento
        if (quest.rewards.budget && resourceManager) {
            resourceManager.resources.budget.current += quest.rewards.budget;
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
    
    // ===== UI =====
    updateQuestUI() {
        const currentMissionElement = document.getElementById('current-mission');
        const missionProgressElement = document.getElementById('mission-progress');
        
        if (this.currentMainQuest) {
            const quest = this.quests.get(this.currentMainQuest);
            if (quest && currentMissionElement) {
                currentMissionElement.textContent = quest.description;
                
                if (missionProgressElement) {
                    missionProgressElement.style.width = `${quest.progress * 100}%`;
                }
            }
        }
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
