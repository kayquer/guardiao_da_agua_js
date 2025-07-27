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
            }
        };

        this.missionUI = {
            isOpen: false,
            currentCategory: 'primary',
            selectedMission: null
        };

        this.initializeQuests();
        
        console.log('✅ QuestSystem inicializado');
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

        if (isCompleted) {
            statusClass = 'completed';
            statusText = 'Completa';
            actionButton = '<button class="mission-btn completed" disabled>✓ Completa</button>';
        } else if (isActive) {
            statusClass = 'active';
            statusText = 'Ativa';
            actionButton = '<button class="mission-btn active" disabled>⏳ Em Progresso</button>';
        } else if (canStart) {
            statusClass = 'available';
            statusText = 'Disponível';
            actionButton = `<button class="mission-btn start" onclick="window.gameManager.questSystem.startMission('${mission.id}')">▶️ Iniciar</button>`;
        } else {
            statusClass = 'locked';
            statusText = 'Bloqueada';
            actionButton = '<button class="mission-btn locked" disabled>🔒 Bloqueada</button>';
        }

        const progressPercent = isActive ? (mission.progress * 100) : (isCompleted ? 100 : 0);

        return `
            <div class="mission-card ${statusClass}" onclick="window.gameManager.questSystem.selectMission('${mission.id}')">
                <div class="mission-card-header">
                    <div class="mission-title">
                        <span class="category-icon" style="color: ${category.color}">${category.icon}</span>
                        <h4>${mission.title}</h4>
                    </div>
                    <div class="mission-status ${statusClass}">${statusText}</div>
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

    // ===== LEGACY UI SUPPORT =====
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
    
    // ===== MISSION MANAGEMENT HELPERS =====

    /**
     * Gets missions by category
     */
    getMissionsByCategory(category) {
        return Array.from(this.quests.values()).filter(mission => mission.category === category);
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
            return mission.prerequisites.every(prereq => this.completedQuests.has(prereq));
        }

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
