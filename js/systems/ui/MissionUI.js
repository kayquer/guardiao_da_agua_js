/**
 * QuestSystem — Interface de missões (painel, cards, carrossel, detalhes)
 * Parte da classe QuestSystem (js/systems/QuestSystem.js), anexada via mixin(): use this.* normalmente.
 */
mixin(QuestSystem, {
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
    },

    /**
     * Closes the mission management interface
     */
    closeMissionInterface() {
        this.missionUI.isOpen = false;

        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.closeMissionPanel();
        }
    },

    /**
     * Renders the complete mission interface
     * TASK #1: Added filter system for missions
     */
    renderMissionInterface() {
        const detailsContent = document.getElementById('details-content');
        if (!detailsContent) return;

        // Get all missions sorted by priority
        const allMissions = this.getAllMissionsSorted();

        // TASK #1: Apply filter
        const missions = this.filterMissions(allMissions, this.missionUI.currentFilter);

        // TASK #1: Count missions by status
        const activeMissions = allMissions.filter(m => this.activeQuests.has(m.id));
        const completedMissions = allMissions.filter(m => this.completedQuests.has(m.id));
        const lockedMissions = allMissions.filter(m =>
            !this.activeQuests.has(m.id) &&
            !this.completedQuests.has(m.id) &&
            !this.canStartMission(m.id)
        );

        const content = `
            <div class="mission-interface enhanced">
                <div class="mission-header">
                    <h3>🎯 Sistema de Missões</h3>
                    <button class="close-btn" onclick="window.gameManager.questSystem.closeMissionInterface()">✖️</button>
                </div>

                <div class="mission-content-area">
                    <div class="mission-list-header">
                        <h4>📋 Missões</h4>
                        <div class="mission-list-stats">
                            <span class="active-missions">${activeMissions.length} ativas</span>
                            <span class="completed-missions">${completedMissions.length} completas</span>
                        </div>
                    </div>

                    <!-- TASK #1: Filter Buttons -->
                    <div class="mission-filters">
                        <button class="filter-btn ${this.missionUI.currentFilter === 'all' ? 'active' : ''}"
                                onclick="window.gameManager.questSystem.setMissionFilter('all')">
                            📋 Todas (${allMissions.length})
                        </button>
                        <button class="filter-btn ${this.missionUI.currentFilter === 'active' ? 'active' : ''}"
                                onclick="window.gameManager.questSystem.setMissionFilter('active')">
                            ✅ Ativas (${activeMissions.length})
                        </button>
                        <button class="filter-btn ${this.missionUI.currentFilter === 'completed' ? 'active' : ''}"
                                onclick="window.gameManager.questSystem.setMissionFilter('completed')">
                            🏆 Concluídas (${completedMissions.length})
                        </button>
                        <button class="filter-btn ${this.missionUI.currentFilter === 'locked' ? 'active' : ''}"
                                onclick="window.gameManager.questSystem.setMissionFilter('locked')">
                            🔒 Bloqueadas (${lockedMissions.length})
                        </button>
                    </div>

                    <div class="mission-list-enhanced">
                        ${missions.length > 0 ?
                            missions.map(mission => this.renderMissionCard(mission)).join('') :
                            `<div class="no-missions">
                                <div class="no-missions-icon">📭</div>
                                <div class="no-missions-text">Nenhuma missão nesta categoria</div>
                                <div class="no-missions-hint">Tente outro filtro para ver mais missões</div>
                            </div>`
                        }
                    </div>
                </div>

                <div class="mission-stats-compact">
                    <div class="stat-item-compact">
                        <span class="stat-icon">🎯</span>
                        <span class="stat-value">${this.activeQuests.size}</span>
                        <span class="stat-label">Ativas</span>
                    </div>
                    <div class="stat-item-compact">
                        <span class="stat-icon">✅</span>
                        <span class="stat-value">${this.completedQuests.size}</span>
                        <span class="stat-label">Completas</span>
                    </div>
                    <div class="stat-item-compact">
                        <span class="stat-icon">⭐</span>
                        <span class="stat-value">${this.totalScore}</span>
                        <span class="stat-label">Pontos</span>
                    </div>
                </div>
            </div>
        `;

        detailsContent.innerHTML = content;
    },

    /**
     * Gets all missions sorted by priority:
     * 1. Active missions
     * 2. Available missions
     * 3. Locked missions
     * 4. Completed missions
     */
    getAllMissionsSorted() {
        const allMissions = Array.from(this.quests.values());

        return allMissions.sort((a, b) => {
            // Priority 1: Active missions
            const aActive = this.activeQuests.has(a.id);
            const bActive = this.activeQuests.has(b.id);
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;

            // Priority 2: Available missions (can start)
            const aAvailable = this.canStartMission(a.id) && !this.completedQuests.has(a.id);
            const bAvailable = this.canStartMission(b.id) && !this.completedQuests.has(b.id);
            if (aAvailable && !bAvailable) return -1;
            if (!aAvailable && bAvailable) return 1;

            // Priority 3: Locked missions (prerequisites not met)
            const aCompleted = this.completedQuests.has(a.id);
            const bCompleted = this.completedQuests.has(b.id);
            if (!aCompleted && bCompleted) return -1;
            if (aCompleted && !bCompleted) return 1;

            // Priority 4: Completed missions last
            return 0;
        });
    },

    /**
     * TASK #1: Filters missions based on selected filter
     * @param {Array} missions - Array of missions to filter
     * @param {string} filter - Filter type ('all', 'active', 'completed', 'locked')
     * @returns {Array} Filtered missions
     */
    filterMissions(missions, filter) {
        switch (filter) {
            case 'active':
                return missions.filter(m => this.activeQuests.has(m.id));

            case 'completed':
                return missions.filter(m => this.completedQuests.has(m.id));

            case 'locked':
                return missions.filter(m =>
                    !this.activeQuests.has(m.id) &&
                    !this.completedQuests.has(m.id) &&
                    !this.canStartMission(m.id)
                );

            case 'all':
            default:
                return missions;
        }
    },

    /**
     * TASK #1: Sets the mission filter and re-renders the interface
     * @param {string} filter - Filter type ('all', 'active', 'completed', 'locked')
     */
    setMissionFilter(filter) {
        this.missionUI.currentFilter = filter;
        this.renderMissionInterface();

        // Audio feedback
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('sfx_click', 0.6);
        }

        log(`🎯 Mission filter set to: ${filter}`);
    },

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
            statusText = 'Auto-ativada';
            // ===== REMOVED: Start button no longer needed since missions auto-activate =====
            // actionButton = `<button class="mission-btn start" onclick="window.gameManager.questSystem.startMission('${mission.id}')">▶️ Iniciar</button>`;
            actionButton = ''; // No button needed - missions auto-activate
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
                    ${this.renderMissionInfoCards(mission)}
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
    },

    renderStakeholders(mission) {
        if (!mission.stakeholders || mission.stakeholders.length === 0) return '';

        const stakeholderNames = mission.stakeholders.map(s => this.getStakeholderName(s));

        return `
            <div class="mission-stakeholders">
                <span class="meta-label">Grupos Afetados:</span>
                <span class="stakeholder-list">${stakeholderNames.join(', ')}</span>
            </div>
        `;
    },

    /**
     * Gets the display name for a stakeholder
     */
    getStakeholderName(stakeholder) {
        const stakeholderMap = {
            'citizens': 'Cidadãos',
            'environment': 'Meio Ambiente',
            'business': 'Empresas',
            'government': 'Governo'
        };
        return stakeholderMap[stakeholder] || stakeholder;
    },

    /**
     * Renders informational cards for mission categories (simplified version)
     */
    renderMissionInfoCards(mission) {
        // Get related info cards based on mission category
        const relatedCards = this.getRelatedInfoCards(mission);

        if (relatedCards.length === 0) return '';

        return `
            <div class="mission-info-cards">
                <div class="info-cards-label">Categorias Relacionadas:</div>
                <div class="info-cards-container">
                    ${relatedCards.map(cardKey => {
                        const card = this.missionCategories[cardKey];
                        return `
                            <div class="mission-info-card" style="border-left-color: ${card.color}">
                                <span class="info-card-icon" style="color: ${card.color}">${card.icon}</span>
                                <div class="info-card-content">
                                    <div class="info-card-name">${card.name}</div>
                                    <div class="info-card-description">${card.description}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Gets the most important current objective for a mission
     */
    getCurrentObjective(mission) {
        if (!mission || !mission.objectives) return null;

        // Find the first incomplete objective
        for (const objective of mission.objectives) {
            if (objective.current < objective.required) {
                return objective;
            }
        }

        // If all objectives are complete, return the last one
        return mission.objectives[mission.objectives.length - 1] || null;
    },

    /**
     * Gets actionable text for an objective
     */
    getActionableObjectiveText(objective, mission) {
        if (!objective) return mission.description;

        // Create actionable text based on objective type
        const remaining = objective.required - objective.current;

        if (objective.type === 'build') {
            if (remaining > 0) {
                // Get the specific building name from BuildingSystem
                let buildingName = 'edifício(s)';
                if (objective.target && this.gameManager && this.gameManager.buildingSystem) {
                    const buildingType = this.gameManager.buildingSystem.buildingTypes.get(objective.target);
                    if (buildingType && buildingType.name) {
                        buildingName = buildingType.name;
                        // Add plural 's' if needed (only for buildings that don't already end with 's')
                        if (remaining > 1 && !buildingName.endsWith('s')) {
                            buildingName += 's';
                        }
                    }
                }
                return `Construa ${remaining} ${buildingName}`;
            } else {
                return `✅ ${objective.description}`;
            }
        } else if (objective.type === 'resource') {
            if (remaining > 0) {
                return `Colete ${remaining} unidades de ${objective.resourceType || 'recursos'}`;
            } else {
                return `✅ ${objective.description}`;
            }
        } else if (objective.type === 'reach') {
            if (remaining > 0) {
                return `Alcance ${objective.required} ${objective.targetType || 'pontos'}`;
            } else {
                return `✅ ${objective.description}`;
            }
        }

        // Default fallback
        return objective.description || mission.description;
    },

    /**
     * Gets action text for an objective
     */
    getObjectiveActionText(objective, mission) {
        if (!objective) return 'Clique para ver detalhes';

        const remaining = objective.required - objective.current;

        if (remaining <= 0) {
            return 'Objetivo concluído!';
        }

        if (objective.type === 'build') {
            return 'Abrir painel de construção';
        } else if (objective.type === 'resource') {
            return 'Ver recursos necessários';
        } else if (objective.type === 'reach') {
            return 'Ver progresso detalhado';
        }

        return 'Clique para mais informações';
    },

    /**
     * Gets appropriate icon for an objective
     */
    getObjectiveIcon(objective, mission) {
        if (!objective) return '🎯';

        const remaining = objective.required - objective.current;

        if (remaining <= 0) {
            return '✅';
        }

        if (objective.type === 'build') {
            return '🏗️';
        } else if (objective.type === 'resource') {
            return '📦';
        } else if (objective.type === 'reach') {
            return '📈';
        }

        return '🎯';
    },

    /**
     * Gets mission urgency information
     */
    getMissionUrgency(mission) {
        if (!mission) return { level: 'none', text: '' };

        // Check for explicit urgency
        if (mission.urgency === 'high' || mission.urgency === 'critical') {
            return {
                level: mission.urgency,
                text: mission.urgency === 'critical' ? 'CRÍTICA' : 'URGENTE'
            };
        }

        // Check for time windows
        if (mission.timeWindow && mission.status === 'available') {
            const timeLeft = mission.timeWindow.end - Date.now();
            const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));

            if (hoursLeft <= 2) {
                return { level: 'critical', text: 'CRÍTICA' };
            } else if (hoursLeft <= 6) {
                return { level: 'high', text: 'URGENTE' };
            } else if (hoursLeft <= 24) {
                return { level: 'medium', text: 'MODERADA' };
            }
        }

        // Check mission type
        if (mission.type === 'primary') {
            return { level: 'medium', text: 'IMPORTANTE' };
        }

        return { level: 'low', text: 'NORMAL' };
    },

    /**
     * Handles click on current objective display
     * FIX #2: Now properly shows the details panel after populating content
     */
    focusOnCurrentObjective() {
        if (!this.currentDisplayMission) {
            // No current mission, open mission interface
            this.openMissionInterface();
            return;
        }

        const mission = this.currentDisplayMission;

        // Always show mission details when clicked
        this.showMissionDetails(mission.id);

        // FIX #2: Show the mission panel after populating content
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showMissionPanel();
        }

        log(`🎯 Navigating to mission details: ${mission.title}`);
    },

    /**
     * Gets related info cards for a mission based on its simplified category
     * Returns simplified categories that match the mission's category (primary/secondary)
     */
    getRelatedInfoCards(mission) {
        // For simplified mission interface, return the mission's category as a related card
        // This ensures consistency with the simplified 2-category system
        if (mission.category === 'primary') {
            return ['primary'];
        } else if (mission.category === 'secondary') {
            return ['secondary'];
        }

        // Fallback: if mission doesn't have a category, return empty array
        return [];
    },

    // ===== ENHANCED UI SYNCHRONIZATION =====
    updateQuestUI() {
        this.updateMissionInfoPanel();
        this.updateMissionProgressDisplay();

        // Update mission interface if it's open
        if (this.missionUI.isOpen) {
            this.renderMissionInterface();
        }
    },

    /**
     * FIX #3: Updates the enhanced mission-info panel with carousel support
     * Shows ALL active/available missions with navigation
     */
    updateMissionInfoPanel() {
        const currentMissionElement = document.getElementById('current-mission');
        const progressTextElement = document.querySelector('.mission-info .progress-text');
        const objectiveActionElement = document.getElementById('objective-action');
        const objectiveIconElement = document.getElementById('objective-icon');
        const missionUrgencyElement = document.getElementById('mission-urgency');
        const progressFillElement = document.getElementById('mission-progress');
        const missionHeaderElement = document.querySelector('.mission-header h4');

        if (!currentMissionElement) return;

        // FIX #3: Get all active/available missions for carousel
        this.missionCarousel.missions = this.getActiveMissionsForDisplay();

        // Ensure carousel index is valid
        if (this.missionCarousel.currentIndex >= this.missionCarousel.missions.length) {
            this.missionCarousel.currentIndex = Math.max(0, this.missionCarousel.missions.length - 1);
        }

        // Get current mission from carousel
        const displayMission = this.missionCarousel.missions[this.missionCarousel.currentIndex];

        // Update the display
        if (displayMission) {
            // FIX #3: Update header to show carousel position
            if (missionHeaderElement && this.missionCarousel.missions.length > 1) {
                missionHeaderElement.innerHTML = `
                    Missão Atual
                    <span style="font-size: 0.8em; opacity: 0.7;">(${this.missionCarousel.currentIndex + 1}/${this.missionCarousel.missions.length})</span>
                `;
            } else if (missionHeaderElement) {
                missionHeaderElement.textContent = 'Missão Atual';
            }

            // Get the most important current objective
            const currentObjective = this.getCurrentObjective(displayMission);

            if (currentObjective) {
                // Update objective title with actionable text
                currentMissionElement.textContent = this.getActionableObjectiveText(currentObjective, displayMission);

                // Update action text
                if (objectiveActionElement) {
                    objectiveActionElement.textContent = this.getObjectiveActionText(currentObjective, displayMission);
                }

                // Update objective icon based on type
                if (objectiveIconElement) {
                    objectiveIconElement.textContent = this.getObjectiveIcon(currentObjective, displayMission);
                }
            } else {
                currentMissionElement.textContent = displayMission.description;
                if (objectiveActionElement) {
                    objectiveActionElement.textContent = 'Clique para ver detalhes';
                }
                if (objectiveIconElement) {
                    objectiveIconElement.textContent = '🎯';
                }
            }

            // Update progress
            const completedObjectives = displayMission.objectives.filter(obj => obj.current >= obj.required).length;
            const totalObjectives = displayMission.objectives.length;
            const progressPercent = totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

            if (progressTextElement) {
                progressTextElement.textContent = `${completedObjectives}/${totalObjectives}`;
            }

            if (progressFillElement) {
                progressFillElement.style.width = `${progressPercent}%`;
            }

            // Update urgency indicator
            if (missionUrgencyElement) {
                const urgency = this.getMissionUrgency(displayMission);
                missionUrgencyElement.textContent = urgency.text;
                missionUrgencyElement.className = `mission-urgency ${urgency.level}`;
                missionUrgencyElement.style.display = urgency.level !== 'none' ? 'block' : 'none';
            }

            // Store current mission for click handler
            this.currentDisplayMission = displayMission;

            // FIX #3: Add carousel navigation if multiple missions
            this.updateCarouselNavigation();
        } else {
            currentMissionElement.textContent = 'Nenhuma missão ativa';
            if (progressTextElement) {
                progressTextElement.textContent = '0/0';
            }
            if (objectiveActionElement) {
                objectiveActionElement.textContent = 'Inicie uma missão';
            }
            if (objectiveIconElement) {
                objectiveIconElement.textContent = '📋';
            }
            if (progressFillElement) {
                progressFillElement.style.width = '0%';
            }
            if (missionUrgencyElement) {
                missionUrgencyElement.style.display = 'none';
            }
            this.currentDisplayMission = null;

            // FIX #3: Remove carousel navigation if no missions
            this.removeCarouselNavigation();
        }
    },

    /**
     * FIX #3: Gets all active/available missions for carousel display
     * Filters out completed and locked missions
     */
    getActiveMissionsForDisplay() {
        const missions = [];

        // Get all active missions
        for (const questId of this.activeQuests) {
            const quest = this.quests.get(questId);
            if (quest) {
                missions.push(quest);
            }
        }

        // If no active missions, get available missions
        if (missions.length === 0) {
            for (const [questId, quest] of this.quests) {
                if (quest.status === 'available' && this.canStartMission(questId)) {
                    missions.push(quest);
                }
            }
        }

        // Sort by priority: main quests first, then by urgency
        missions.sort((a, b) => {
            // Priority 1: Main quests
            if (a.type === 'primary' && b.type !== 'primary') return -1;
            if (a.type !== 'primary' && b.type === 'primary') return 1;

            // Priority 2: Urgency
            const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
            const aUrgency = urgencyOrder[a.urgency] || 4;
            const bUrgency = urgencyOrder[b.urgency] || 4;
            return aUrgency - bUrgency;
        });

        return missions;
    },

    /**
     * FIX #3: Updates carousel navigation buttons
     */
    updateCarouselNavigation() {
        const missionHeader = document.querySelector('.mission-header');
        if (!missionHeader) return;

        // Remove existing navigation
        const existingNav = document.getElementById('mission-carousel-nav');
        if (existingNav) {
            existingNav.remove();
        }

        // Only show navigation if there are multiple missions
        if (this.missionCarousel.missions.length <= 1) return;

        // Create navigation buttons
        const navContainer = document.createElement('div');
        navContainer.id = 'mission-carousel-nav';
        navContainer.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '◀';
        prevBtn.style.cssText = 'background: rgba(0,212,255,0.2); border: 2px solid rgba(0,212,255,0.5); color: #00D4FF; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;';
        prevBtn.onclick = () => this.navigateCarousel(-1);
        prevBtn.disabled = this.missionCarousel.currentIndex === 0;
        if (prevBtn.disabled) {
            prevBtn.style.opacity = '0.3';
            prevBtn.style.cursor = 'not-allowed';
        }

        const nextBtn = document.createElement('button');
        nextBtn.textContent = '▶';
        nextBtn.style.cssText = 'background: rgba(0,212,255,0.2); border: 2px solid rgba(0,212,255,0.5); color: #00D4FF; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;';
        nextBtn.onclick = () => this.navigateCarousel(1);
        nextBtn.disabled = this.missionCarousel.currentIndex >= this.missionCarousel.missions.length - 1;
        if (nextBtn.disabled) {
            nextBtn.style.opacity = '0.3';
            nextBtn.style.cursor = 'not-allowed';
        }

        navContainer.appendChild(prevBtn);
        navContainer.appendChild(nextBtn);
        missionHeader.appendChild(navContainer);

        log(`🎯 Carousel navigation updated: ${this.missionCarousel.currentIndex + 1}/${this.missionCarousel.missions.length}`);
    },

    /**
     * FIX #3: Removes carousel navigation buttons
     */
    removeCarouselNavigation() {
        const existingNav = document.getElementById('mission-carousel-nav');
        if (existingNav) {
            existingNav.remove();
        }
    },

    /**
     * FIX #3: Navigates the mission carousel
     * @param {number} direction - -1 for previous, 1 for next
     */
    navigateCarousel(direction) {
        const newIndex = this.missionCarousel.currentIndex + direction;

        // Validate index
        if (newIndex < 0 || newIndex >= this.missionCarousel.missions.length) {
            return;
        }

        this.missionCarousel.currentIndex = newIndex;
        this.updateMissionInfoPanel();

        // Audio feedback
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('sfx_click', 0.5);
        }

        log(`🎯 Carousel navigated to mission ${newIndex + 1}/${this.missionCarousel.missions.length}`);
    },

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
    },

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
    },

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
    },
    
    // ===== MISSION MANAGEMENT HELPERS =====

    /**
     * Selects a mission category
     */
    selectCategory(category) {
        this.missionUI.currentCategory = category;
        this.renderMissionInterface();
    },

    /**
     * Selects a specific mission
     */
    selectMission(missionId) {
        this.missionUI.selectedMission = missionId;
        // Could expand to show detailed mission view
    },

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
            <span class="objective-progress">Progresso: ${Number(obj.current).toFixed(1)}/${Number(obj.required).toFixed(1)}</span>
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
                        `<div class="mission-auto-start-info" style="padding: 1rem; background: rgba(0,255,136,0.1); border-radius: 8px; text-align: center;">
                            <p style="margin: 0; color: #00ff88; font-weight: 600;">✨ Esta missão será ativada automaticamente</p>
                        </div>` :
                        ''
                    }
                </div>
            </div>
        `;

        detailsContent.innerHTML = content;
    },
});
