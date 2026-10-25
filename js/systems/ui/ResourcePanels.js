/**
 * UIManager — Painéis de detalhe de recursos
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
    /**
     * Lista de prédios agrupada por tipo: "5× Bomba de Água" com a soma do que eles fazem.
     * value(building) = contribuição de um prédio; label(total) = texto da soma (ex.: '+250 L/min').
     * cls = classe do valor (building-production / building-consumption / building-storage).
     */
    renderBuildingGroups(buildings, value, label, cls = 'building-production', extra = () => '') {
        const groups = new Map();
        buildings.forEach(building => {
            if (!building.config) return;
            const group = groups.get(building.type) || { config: building.config, count: 0, total: 0, sample: building };
            group.count++;
            group.total += Number(value(building)) || 0;
            groups.set(building.type, group);
        });
        const rows = [...groups.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total)).map(g => `
            <li class="building-group">
                <span class="building-icon">${buildingIcon(g.config)}</span>
                <span class="building-name">${g.count > 1 ? `<b class="building-count">${g.count}×</b> ` : ''}${g.config.name}</span>
                <span class="${cls}">${label(g.total, g.count)}</span>
                ${extra(g.sample)}
            </li>`).join('');
        return `<ul>${rows}</ul>`;
    },

    /**
     * Lista já agrupada (ResourceManager.getWaterConsumers / getExpenseBreakdown): "3× Casa" com o total do grupo.
     * Grupo sem config (ex.: "Moradores sem zona", "Outras despesas") usa icon/name próprios. Fecha com a linha Total.
     */
    renderBreakdownGroups(groups, label, cls, totalLabel, listClass) {
        const rows = groups.map(g => `
            <li class="building-group" data-group="${g.key}">
                <span class="building-icon">${g.config ? buildingIcon(g.config) : uiIcon(g.icon)}</span>
                <span class="building-name">${g.count > 1 ? `<b class="building-count">${g.count}×</b> ` : ''}${g.config ? g.config.name : g.name}</span>
                <span class="${cls}">${label(g)}</span>
            </li>`).join('');
        return `<ul class="${listClass}">${rows}
            <li class="breakdown-total" style="border-top: 2px solid rgba(0,0,0,0.2); margin-top: 8px; padding-top: 8px;">
                <span class="building-icon">📊</span>
                <span class="building-name"><strong>${totalLabel.name}</strong></span>
                <span class="${cls}"><strong>${totalLabel.value}</strong></span>
            </li></ul>`;
    },

    // ===== PAINÉIS DE DETALHES DE RECURSOS =====
    showResourcePanel(panelType) {
        // ===== ENHANCED RESOURCE PANEL DISPLAY SYSTEM =====

        // ===== VALIDATION =====
        if (!panelType) {
            console.warn('⚠️ No panel type specified');
            return;
        }

        // ===== STATE MANAGEMENT: Prevent showing same panel =====
        if (this.uiState.currentOpenPanel === panelType) {
            log(`📊 Panel ${panelType} already open`);
            return;
        }

        // ===== TRANSITION MANAGEMENT =====
        if (this.uiState.isTransitioning) {
            log('⚠️ UI transition in progress, queuing resource panel request');
            setTimeout(() => this.showResourcePanel(panelType), 100);
            return;
        }

        this.uiState.isTransitioning = true;

        try {
            // ===== CLEAN PREVIOUS PANEL =====
            this.closeCurrentPanel();

            // ===== UPDATE STATE =====
            this.updatePanelState(panelType);

            // ===== MOBILE: Open right panel if on mobile =====
            if (this.isMobile) {
                const hudRight = document.querySelector('.hud-right');
                if (hudRight) {
                    this.mobilePanelsVisible.right = true;
                    hudRight.classList.add('active');

                    // Update toggle button state
                    if (this.mobileToggleButtons && this.mobileToggleButtons.right) {
                        this.mobileToggleButtons.right.classList.add('active');
                    }

                    // Add escape key listener
                    this.addMobileEscapeListener();
                }
            }

            // ===== FIX: Ensure details panel is visible after transition =====
            if (this.elements.detailsPanel) {
                this.elements.detailsPanel.style.display = 'flex';
            }

            // ===== FIX: Show hud-right container (desktop) =====
            this.showHudRight();

            // ===== ENHANCED PANEL ROUTING =====
            const panelMethods = {
                'water': () => this.showWaterDetailsPanel(),
                'budget': () => this.showBudgetDetailsPanel(),
                'electricity': () => this.showEnergyDetailsPanel(),
                'satisfaction': () => this.showSatisfactionDetailsPanel(),
                'population': () => this.showPopulationDetailsPanel(),
                'pollution': () => this.showPollutionDetailsPanel()
            };

            const panelMethod = panelMethods[panelType];
            if (panelMethod) {
                panelMethod();
                log(`📊 Resource panel opened: ${panelType}`);
            } else {
                console.warn(`⚠️ Unknown panel type: ${panelType}`);
                this.updatePanelState(null); // FIX: Use updatePanelState
            }

        } catch (error) {
            console.error('❌ Error showing resource panel:', error);
            this.updatePanelState(null); // FIX: Use updatePanelState
        } finally {
            this.uiState.isTransitioning = false;
        }
    },

    // Botão no fim de cada painel de recurso: abre o tutorial curto daquela área (TutorialSystem.startTopic)
    topicLessonButton(topic) {
        const lesson = TutorialSystem.TOPICS[topic];
        if (!lesson) return '';
        return `<button class="topic-lesson-btn" onclick="window.gameManager.tutorialSystem.startTopic('${topic}')">
            ${uiIcon('ui-books')} Aprender sobre ${lesson.name}
        </button>`;
    },

    closeResourcePanel() {
        try {
            // ===== ENHANCED RESOURCE PANEL CLOSING =====

            // ===== STATE CLEANUP =====
            this.updatePanelState(null);

            // ===== PANEL CLEANUP =====
            if (this.elements.detailsContent) {
                this.elements.detailsContent.innerHTML = '<p>Clique em um recurso para ver detalhes</p>';
            }

            if (this.elements.detailsPanel) {
                this.elements.detailsPanel.style.display = 'none';
            }

            log('📊 Resource panel closed');

        } catch (error) {
            console.error('❌ Error closing resource panel:', error);
        }
    },

    showWaterDetailsPanel() {
        if (!this.elements.detailsContent || !this.gameManager.resourceManager) return;

        const water = this.gameManager.resourceManager.resources.water;
        const buildings = this.gameManager.buildingSystem.getAllBuildings();

        // Filtrar edifícios que produzem água
        const waterProducers = buildings.filter(b => b.config.waterProduction && b.active);

        let detailsHTML = `
            <div class="resource-details-panel">
                <h4>💧 Gestão de Água</h4>

                <div class="resource-summary">
                    <div class="resource-stat">
                        <span class="stat-label">Água Atual:</span>
                        <span class="stat-value">${Math.floor(water.current).toLocaleString()}L</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Capacidade:</span>
                        <span class="stat-value">${Math.floor(water.storage).toLocaleString()}L</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Produção:</span>
                        <span class="stat-value">+${this.formatNumber(this.gameManager.resourceManager.getEffectiveWaterProduction(), 1)}L/min${(water.productionMultiplier ?? 1) < 1 ? ` (seca: −${Math.round((1 - water.productionMultiplier) * 100)}%)` : ''}</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Consumo:</span>
                        <span class="stat-value">-${this.formatNumber(water.consumption, 1)}L/min</span>
                    </div>
                    <div class="resource-stat time-to-empty">
                        <span class="stat-label">Tendência:</span>
                        <span class="stat-value">${this.describeWaterTrend()}</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Desperdício:</span>
                        <span class="stat-value">-${this.formatNumber(water.waste || 0, 1)}L/min${water.extraWaste > 0 ? ' (vazamento)' : ''}</span>
                    </div>
                </div>

                ${this.renderTrend(this.gameManager.resourceManager.getHistorySeries('water'), { color: '#29b6f6', max: water.storage, caption: 'Água guardada nos últimos minutos' })}
                ${this.renderAquiferBlock()}
                ${this.renderFloodRiskBlock()}

                <div class="resource-sources">
                    <h5>🏭 Fontes de Produção</h5>
        `;

        if (waterProducers.length > 0) {
            detailsHTML += this.renderBuildingGroups(waterProducers,
                b => this.gameManager.buildingSystem.getBuildingWaterYield(b).actual, // seca e aquífero inclusos (= total)
                (total, count) => `${count > 1 ? 'produzindo ' : ''}+${this.formatNumber(total, 1)} L/min`);
        } else {
            detailsHTML += '<p class="no-sources">Nenhuma fonte de água ativa</p>';
        }

        // Quem consome: prédios (consumo fixo) + moradores divididos pelas zonas/casas, agrupados por tipo
        const rm = this.gameManager.resourceManager;
        const bs = this.gameManager.buildingSystem;
        const consumers = rm.getWaterConsumers(buildings, bs.getEffectivePopulationCapacity
            ? b => bs.getEffectivePopulationCapacity(b)
            : undefined);
        detailsHTML += '<h5>🚰 Quem Consome Água</h5>';
        if (consumers.groups.length > 0) {
            detailsHTML += this.renderBreakdownGroups(consumers.groups,
                g => `${g.people >= 1 ? `<small class="breakdown-people">${Math.round(g.people).toLocaleString('pt-BR')} pessoas · </small>` : ''}-${this.formatNumber(g.total, 1)} L/min`,
                'building-consumption',
                { name: 'Total de Consumo', value: `-${this.formatNumber(consumers.total, 1)} L/min` },
                'water-consumers');
        } else {
            detailsHTML += '<p class="no-sources">Ninguém está consumindo água agora</p>';
        }

        // Edifícios de armazenamento
        const storageBuildings = buildings.filter(b => b.config.waterStorage && b.active);
        if (storageBuildings.length > 0) {
            detailsHTML += '<h5>🛢️ Armazenamento</h5>' + this.renderBuildingGroups(storageBuildings,
                b => b.config.waterStorage,
                (total, count) => `${count > 1 ? 'guardando ' : ''}+${Math.round(total).toLocaleString('pt-BR')} L`, 'building-storage');
        }

        detailsHTML += '</div></div>';

        this.elements.detailsContent.innerHTML = uiIconsIn(detailsHTML) + this.topicLessonButton('water');
    },

    showBudgetDetailsPanel() {
        if (!this.elements.detailsContent || !this.gameManager.resourceManager) return;

        const budget = this.gameManager.resourceManager.resources.budget;
        const taxRevenue = this.gameManager.resourceManager.getTaxRevenue();
        const taxRates = this.gameManager.resourceManager.getTaxRates();
        const buildings = this.gameManager.buildingSystem.getAllBuildings();

        let detailsHTML = `
            <div class="resource-details-panel">
                <h4>💰 Gestão Financeira</h4>

                <div class="resource-summary">
                    <div class="resource-stat">
                        <span class="stat-label">Orçamento Atual:</span>
                        <span class="stat-value">R$ ${Math.floor(budget.current).toLocaleString()}</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Receita:</span>
                        <span class="stat-value">+R$ ${this.formatNumber(budget.income, 0)}/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Despesas:</span>
                        <span class="stat-value">-R$ ${this.formatNumber(budget.expenses, 0)}/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Saldo Líquido:</span>
                        <span class="stat-value ${budget.income - budget.expenses >= 0 ? 'positive' : 'negative'}">
                            ${budget.income - budget.expenses >= 0 ? '+' : ''}R$ ${this.formatNumber(budget.income - budget.expenses, 0)}/min
                        </span>
                    </div>
                </div>

                <div class="resource-sources">
                    <h5>💵 Receitas Tributárias</h5>
                    <ul>
                        <li>
                            <span class="building-icon">👥</span>
                            <span class="building-name">Impostos Populacionais</span>
                            <span class="building-production">+R$ ${this.formatNumber(taxRevenue.population, 0)}/min</span>
                        </li>
                        <li>
                            <span class="building-icon">🏬</span>
                            <span class="building-name">Impostos Comerciais</span>
                            <span class="building-production">+R$ ${this.formatNumber(taxRevenue.business, 0)}/min</span>
                        </li>
                        <li>
                            <span class="building-icon">🎡</span>
                            <span class="building-name">Impostos de Turismo</span>
                            <span class="building-production">+R$ ${this.formatNumber(taxRevenue.tourism, 0)}/min</span>
                        </li>
                        <li>
                            <span class="building-icon">🏛️</span>
                            <span class="building-name">Receita Base</span>
                            <span class="building-production">+R$ 1.000/min</span>
                        </li>
                        <li style="border-top: 2px solid rgba(0,0,0,0.2); margin-top: 8px; padding-top: 8px;">
                            <span class="building-icon">📊</span>
                            <span class="building-name"><strong>Total de Receitas</strong></span>
                            <span class="building-production"><strong>+R$ ${this.formatNumber(budget.income, 0)}/min</strong></span>
                        </li>
                    </ul>
                    <p style="font-size: 0.85em; color: #666; margin-top: 10px; font-style: italic;">
                        💡 Multiplicador de Desenvolvimento: ${taxRates.developmentMultiplier.toFixed(2)}x
                    </p>
                </div>

                <div class="resource-sources">
                    <h5>💸 Fontes de Despesa</h5>
        `;

        // Agrupadas por tipo (mesma fonte do total: ResourceManager.getExpenseBreakdown)
        const expenses = this.gameManager.resourceManager.getExpenseBreakdown(buildings);
        if (expenses.groups.length > 0) {
            detailsHTML += this.renderBreakdownGroups(expenses.groups,
                g => `-R$ ${this.formatNumber(g.total, 0)}/min`,
                'building-cost',
                { name: 'Total de Despesas', value: `-R$ ${this.formatNumber(expenses.total, 0)}/min` },
                'expense-groups');
        } else {
            detailsHTML += '<p class="no-sources">Nenhuma despesa de manutenção</p>';
        }

        detailsHTML += '</div></div>';

        this.elements.detailsContent.innerHTML = uiIconsIn(detailsHTML) + this.topicLessonButton('budget');
    },

    showEnergyDetailsPanel() {
        if (!this.elements.detailsContent || !this.gameManager.resourceManager) return;

        const electricity = this.gameManager.resourceManager.resources.electricity;
        const buildings = this.gameManager.buildingSystem.getAllBuildings();

        // Filtrar edifícios que geram energia
        const powerGenerators = buildings.filter(b => b.config.powerGeneration && b.active);
        // Consumo de cada um agora (zona: pela fase, BuildingEfficiency.getBuildingPowerConsumption)
        const powerOf = b => this.gameManager.buildingSystem.getBuildingPowerConsumption(b);
        const powerConsumers = buildings.filter(b => b.active && powerOf(b) > 0);

        let detailsHTML = `
            <div class="resource-details-panel">
                <h4>⚡ Gestão de Energia</h4>

                <div class="resource-summary">
                    <div class="resource-stat">
                        <span class="stat-label">Geração:</span>
                        <span class="stat-value">+${this.formatNumber(electricity.generation, 1)}kW</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Consumo:</span>
                        <span class="stat-value">-${this.formatNumber(electricity.consumption, 1)}kW</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Saldo:</span>
                        <span class="stat-value ${electricity.generation - electricity.consumption >= 0 ? 'positive' : 'negative'}">
                            ${electricity.generation - electricity.consumption >= 0 ? '+' : ''}${this.formatNumber(electricity.generation - electricity.consumption, 1)}kW
                        </span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Eficiência:</span>
                        <span class="stat-value">${Math.floor(electricity.efficiency * 100)}%</span>
                    </div>
                </div>

                <div class="resource-sources">
                    <h5>🔋 Fontes de Energia</h5>
        `;

        if (powerGenerators.length > 0) {
            const renewable = building => ['hydroelectric_plant', 'solar_panel', 'wind_turbine'].includes(building.type);
            detailsHTML += this.renderBuildingGroups(powerGenerators,
                b => b.config.powerGeneration,
                (total, count) => `${count > 1 ? 'gerando ' : ''}+${this.formatNumber(total, 1)} kW`, 'building-production',
                b => `<span class="renewable-indicator">${renewable(b) ? '🌱 (Renovável)' : '🏭 (Não-renovável)'}</span>`);
        } else {
            detailsHTML += '<p class="no-sources">Nenhuma fonte de energia ativa</p>';
        }

        if (powerConsumers.length > 0) {
            detailsHTML += '<h5>🔌 Consumidores de Energia</h5>' + this.renderBuildingGroups(powerConsumers,
                powerOf,
                (total, count) => `${count > 1 ? 'usando ' : ''}-${this.formatNumber(total, 1)} kW`, 'building-consumption');
        }

        detailsHTML += '</div></div>';

        this.elements.detailsContent.innerHTML = uiIconsIn(detailsHTML) + this.topicLessonButton('electricity');
    },

    showSatisfactionDetailsPanel() {
        if (!this.elements.detailsContent || !this.gameManager.resourceManager) return;

        const population = this.gameManager.resourceManager.resources.population;
        const buildings = this.gameManager.buildingSystem.getAllBuildings();

        let detailsHTML = `
            <div class="resource-details-panel">
                <h4>😊 Satisfação da População</h4>

                <div class="resource-summary">
                    <div class="resource-stat">
                        <span class="stat-label">Satisfação Atual:</span>
                        <span class="stat-value">${Math.floor(population.satisfaction)}%</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">População:</span>
                        <span class="stat-value">${population.current.toLocaleString()}</span>
                    </div>
                </div>

                <div class="resource-sources">
                    <h5>📊 De onde vem a satisfação</h5>
                    <ul class="satisfaction-factors">
                        ${this.gameManager.resourceManager.getSatisfactionFactors().map(f =>
                            `<li>${f.icon} ${f.label}: <b>${f.value >= 0 ? '+' : ''}${this.formatNumber(f.value, 1)}</b></li>`).join('')}
                    </ul>

                    <h5>🏢 Edifícios que Melhoram Satisfação</h5>
                    <p class="stat-note">Cada prédio novo soma um pouco menos que o anterior (no máximo +${ResourceManager.BUILDING_SATISFACTION_MAX} no total).</p>
        `;

        const satisfactionBuildings = buildings.filter(b => b.config && b.config.satisfactionBonus && b.active && b.effectsApplied);
        if (satisfactionBuildings.length > 0) {
            detailsHTML += this.renderBuildingGroups(satisfactionBuildings,
                b => b.config.satisfactionBonus,
                total => `${this.formatNumber(total, 1)} pts`, 'building-bonus');
        } else {
            detailsHTML += '<p class="no-sources">Nenhum edifício de satisfação construído</p>';
        }

        detailsHTML += '</div></div>';

        this.elements.detailsContent.innerHTML = uiIconsIn(detailsHTML) + this.topicLessonButton('satisfaction');
    },

    showPopulationDetailsPanel() {
        if (!this.elements.detailsContent || !this.gameManager.resourceManager) return;

        const population = this.gameManager.resourceManager.resources.population;
        const buildings = this.gameManager.buildingSystem.getAllBuildings();

        // Filtrar edifícios que afetam população
        const residentialBuildings = buildings.filter(b => b.config.populationCapacity && b.active);
        const serviceBuildings = buildings.filter(b => b.config.satisfactionBonus && b.active);

        let detailsHTML = `
            <div class="resource-details-panel">
                <h4>👥 Gestão da População</h4>

                <div class="resource-summary">
                    <div class="resource-stat">
                        <span class="stat-label">População Atual:</span>
                        <span class="stat-value">${Math.floor(population.current).toLocaleString()}</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Capacidade Máxima:</span>
                        <span class="stat-value">${Math.floor(population.max).toLocaleString()}</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Crescimento:</span>
                        <span class="stat-value">${population.growth >= 0 ? '+' : ''}${this.formatNumber(population.growth * 60, 1)}%/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Satisfação:</span>
                        <span class="stat-value">${Math.floor(population.satisfaction)}%</span>
                    </div>
                </div>

                <div class="resource-sources">
                    <h5>🏠 Edifícios Residenciais</h5>
        `;

        if (residentialBuildings.length > 0) {
            detailsHTML += '<ul>';
            residentialBuildings.forEach(building => {
                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-production">+${this.gameManager.buildingSystem.getEffectivePopulationCapacity(building)} hab</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        } else {
            detailsHTML += '<p class="no-sources">Nenhum edifício residencial construído</p>';
        }

        if (serviceBuildings.length > 0) {
            detailsHTML += '<h5>🏢 Serviços e Infraestrutura</h5><ul>';
            serviceBuildings.forEach(building => {
                // ===== ZERO-ERROR POLICY FIX: Validar config antes de usar =====
                if (!building.config) {
                    console.warn('⚠️ Edifício sem configuração encontrado na lista de serviços:', building);
                    return;
                }

                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-production">+${building.config.satisfactionBonus}% satisfação</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        }

        detailsHTML += `
                    <h5>📊 Fatores de Crescimento</h5>
                    <ul>
                        <li>💧 Disponibilidade de água</li>
                        <li>🏠 Capacidade habitacional</li>
                        <li>😊 Nível de satisfação</li>
                        <li>🏭 Baixa poluição</li>
                        <li>⚡ Fornecimento de energia</li>
                    </ul>
                </div>
            </div>
        `;

        this.elements.detailsContent.innerHTML = uiIconsIn(detailsHTML) + this.topicLessonButton('population');
    },

    showPollutionDetailsPanel() {
        if (!this.elements.detailsContent || !this.gameManager.resourceManager) return;

        const rm = this.gameManager.resourceManager;
        const pollution = rm.resources.pollution;
        const balance = rm.getPollutionBalance();
        const buildings = this.gameManager.buildingSystem.getAllBuildings();

        // Filtrar edifícios que afetam poluição
        const pollutionSources = buildings.filter(b => b.config.pollutionGeneration && b.active);
        const cleanupBuildings = buildings.filter(b => b.config.pollutionReduction && b.active);

        let detailsHTML = `
            <div class="resource-details-panel">
                <h4>🏭 Gestão da Poluição</h4>

                <div class="resource-summary">
                    <div class="resource-stat">
                        <span class="stat-label">Poluição Atual:</span>
                        <span class="stat-value">${Math.floor(pollution.current)}%</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Prédios e eventos:</span>
                        <span class="stat-value">+${this.formatNumber(balance.sources, 1)}/min</span>
                    </div>
                    <div class="resource-stat sewage-stat">
                        <span class="stat-label">🚽 Esgoto dos moradores:</span>
                        <span class="stat-value">+${this.formatNumber(balance.sewage, 1)}/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Limpeza:</span>
                        <span class="stat-value">-${this.formatNumber(balance.reduction, 1)}/min</span>
                    </div>
                    ${Math.abs(balance.reputation) >= 0.05 ? `<div class="resource-stat">
                        <span class="stat-label">🌿 Confiança do Meio Ambiente:</span>
                        <span class="stat-value">${balance.reputation >= 0 ? '-' : '+'}${this.formatNumber(Math.abs(balance.reputation), 1)}/min</span>
                    </div>` : ''}
                    <div class="resource-stat">
                        <span class="stat-label">Balanço:</span>
                        <span class="stat-value ${balance.net <= 0 ? 'positive' : 'negative'}">
                            ${balance.net >= 0 ? '+' : ''}${this.formatNumber(balance.net, 1)}/min
                        </span>
                    </div>
                </div>
                ${this.renderTrend(rm.getHistorySeries('pollution'), { color: '#ef5350', max: 100, caption: 'Poluição nos últimos minutos' })}
                <p class="stat-note">Cada morador gera esgoto. Sem <b>Estação de Tratamento</b>, ele vai direto para o rio.</p>

                <div class="resource-sources">
        `;

        if (pollutionSources.length > 0) {
            detailsHTML += '<h5>🏭 Fontes de Poluição</h5>' + this.renderBuildingGroups(pollutionSources,
                b => b.config.pollutionGeneration,
                (total, count) => `${count > 1 ? 'poluindo ' : ''}+${this.formatNumber(total, 1)}%/min`, 'building-consumption');
        }

        if (cleanupBuildings.length > 0) {
            detailsHTML += '<h5>🌱 Sistemas de Limpeza</h5>' + this.renderBuildingGroups(cleanupBuildings,
                b => b.config.pollutionReduction,
                (total, count) => `${count > 1 ? 'limpando ' : ''}-${this.formatNumber(total, 1)}%/min`);
        }

        const trees = this.gameManager.treeSystem;
        if (trees) {
            detailsHTML += `
                    <h5>🌳 Árvores da cidade</h5>
                    <ul>
                        <li>
                            <span class="building-icon">🌳</span>
                            <span class="building-name">${trees.count} árvores em pé (${trees.riparianCount} na margem do rio)</span>
                            <span class="building-production">-${this.formatNumber(trees.pollutionReduction, 1)}%/min</span>
                        </li>${this.plantedTreesLine()}
                        <li>🏞️ Mata ciliar: árvores a até ${TREES.RIPARIAN_DISTANCE} quadrados da água limpam ${TREES.RIPARIAN_FACTOR}× mais. Plante mudas na margem!</li>
                        <li>🪓 Construir em cima de árvores derruba as árvores: a poluição sobe e a cidade fica menos verde.</li>
                    </ul>`;
        }

        detailsHTML += `
                    <h5>🌍 O que a poluição faz na cidade</h5>
                    <ul>
                        <li>😷 Acima de 50%, os moradores ficam menos satisfeitos</li>
                        <li>🏃 Acima de 70%, menos gente quer morar aqui (e a água fica turva)</li>
                        <li>☠️ Em 100%, a água fica imprópria: fim de jogo</li>
                    </ul>

                    <h5>✅ O que baixa a poluição</h5>
                    <ul>
                        <li>🏭 Estações de Tratamento e de Filtros (tratam o esgoto)</li>
                        <li>🪷 Jardins Flutuantes, Parque Linear, jardins e tetos verdes</li>
                        <li>🌳 Árvores, principalmente na margem do rio</li>
                        <li>🤝 Decisões que agradam o grupo Meio Ambiente</li>
                    </ul>
                </div>
            </div>
        `;

        this.elements.detailsContent.innerHTML = uiIconsIn(detailsHTML) + this.topicLessonButton('pollution');
    },

    // ===== GRÁFICO DE TENDÊNCIA (ResourceManager.history: 1 ponto a cada 5 s de jogo) =====
    /** Linha SVG dos últimos pontos. Sem 2 pontos ainda, só a legenda dizendo que está juntando dados. */
    renderTrend(values, { color = '#29b6f6', max, caption = '' } = {}) {
        if (!values || values.length < 2) {
            return `<div class="trend-box"><span class="trend-caption">📈 ${caption}: juntando dados…</span></div>`;
        }
        const top = Math.max(max || 0, ...values, 1);
        const w = 300, h = 48;
        const points = values.map((v, i) => `${(i / (values.length - 1) * w).toFixed(1)},${(h - 2 - (v / top) * (h - 4)).toFixed(1)}`).join(' ');
        return `<div class="trend-box">
            <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${caption}">
                <rect x="0" y="0" width="${w}" height="${h}" rx="6" fill="rgba(0,0,0,0.18)"/>
                <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
            </svg>
            <span class="trend-caption">📈 ${caption} (${Math.max(1, Math.round(values.length * ResourceManager.HISTORY_EVERY / 60))} min)</span>
        </div>`;
    },

    /** "Enchendo", "estável" ou "seca em ~N min" (tempo real), pelo balanço atual. */
    describeWaterTrend() {
        const rm = this.gameManager.resourceManager;
        const { production, demand, current, storage } = rm.getWaterBalance();
        const net = production - demand; // L/min de jogo
        const realMin = minutes => minutes / (this.gameManager.timeScale || 1);
        if (Math.abs(net) < 0.5) return 'estável';
        if (net > 0) return current >= storage - 1 ? 'caixa cheia' : `enchendo (cheia em ~${Math.max(1, Math.ceil(realMin((storage - current) / net)))} min)`;
        return `<b class="negative">secando: vazia em ~${Math.max(1, Math.ceil(realMin(current / -net)))} min</b>`;
    },

    renderAquiferBlock() {
        const rm = this.gameManager.resourceManager;
        const level = rm.getAquiferLevel();
        const { drain, recharge, net } = rm.getAquiferBalance();
        const factor = rm.getAquiferFactor();
        const color = level >= 50 ? '#29b6f6' : level >= ResourceManager.AQUIFER_LOW ? '#ffb74d' : '#ef5350';
        return `<div class="aquifer-block">
            <h5>🪨 Aquífero (água debaixo da terra): ${Math.round(level)}%</h5>
            <div style="height:10px;border-radius:5px;background:rgba(0,0,0,0.25);overflow:hidden">
                <div class="aquifer-bar" style="height:100%;width:${level.toFixed(1)}%;background:${color}"></div>
            </div>
            <p class="stat-note">Bombas e poços tiram ${this.formatNumber(drain, 1)}%/min; chuva, solo e áreas verdes devolvem ${this.formatNumber(recharge, 1)}%/min
                (${net >= 0 ? 'subindo' : 'descendo'}).${factor < 1 ? ` <b class="negative">Aquífero baixo: bombas e poços rendem ${Math.round(factor * 100)}%.</b>` : ''}</p>
        </div>`;
    },

    renderFloodRiskBlock() {
        const es = this.gameManager.eventSystem;
        if (!es?.getFloodRisk) return '';
        const { impervious, absorption, level } = es.getFloodRisk();
        return `<div class="flood-block">
            <h5>🌊 Risco de enchente: ${level}</h5>
            <p class="stat-note">Asfalto e prédios fazem a chuva escorrer (${Math.round(impervious)}); jardins de chuva, tetos verdes, parques e árvores seguram (${Math.round(absorption)}).
                ${es.getWarningTime() > EventSystem.WARNING_MS ? 'A Estação de Monitoramento avisa as enchentes mais cedo.' : 'Uma Estação de Monitoramento avisaria as enchentes mais cedo.'}</p>
        </div>`;
    },
});
