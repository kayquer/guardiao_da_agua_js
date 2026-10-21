/**
 * UIManager — Painéis de detalhe de recursos
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
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
                        <span class="stat-value">+${this.formatNumber(water.production, 1)}L/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Consumo:</span>
                        <span class="stat-value">-${this.formatNumber(water.consumption, 1)}L/min</span>
                    </div>
                </div>

                <div class="resource-sources">
                    <h5>🏭 Fontes de Produção</h5>
        `;

        if (waterProducers.length > 0) {
            detailsHTML += '<ul>';
            waterProducers.forEach(building => {
                const production = building.config.waterProduction * building.efficiency;
                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-production">+${this.formatNumber(production, 1)}L/min</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        } else {
            detailsHTML += '<p class="no-sources">Nenhuma fonte de água ativa</p>';
        }

        // Edifícios de armazenamento
        const storageBuildings = buildings.filter(b => b.config.waterStorage && b.active);
        if (storageBuildings.length > 0) {
            detailsHTML += '<h5>🛢️ Armazenamento</h5><ul>';
            storageBuildings.forEach(building => {
                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-storage">+${building.config.waterStorage}L</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        }

        detailsHTML += '</div></div>';

        this.elements.detailsContent.innerHTML = detailsHTML;
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

        const expenseBuildings = buildings.filter(b => b.config.maintenanceCost && b.active);
        if (expenseBuildings.length > 0) {
            detailsHTML += '<ul>';
            expenseBuildings.forEach(building => {
                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-cost">-R$ ${building.config.maintenanceCost}/min</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        } else {
            detailsHTML += '<p class="no-sources">Nenhuma despesa de manutenção</p>';
        }

        detailsHTML += '</div></div>';

        this.elements.detailsContent.innerHTML = detailsHTML;
    },

    showEnergyDetailsPanel() {
        if (!this.elements.detailsContent || !this.gameManager.resourceManager) return;

        const electricity = this.gameManager.resourceManager.resources.electricity;
        const buildings = this.gameManager.buildingSystem.getAllBuildings();

        // Filtrar edifícios que geram energia
        const powerGenerators = buildings.filter(b => b.config.powerGeneration && b.active);
        const powerConsumers = buildings.filter(b => b.config.powerConsumption && b.active);

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
            detailsHTML += '<ul>';
            powerGenerators.forEach(building => {
                // ===== ZERO-ERROR POLICY FIX: Validar config antes de usar =====
                if (!building.config) {
                    console.warn('⚠️ Edifício sem configuração encontrado na lista de geradores:', building);
                    return;
                }

                const isRenewable = ['hydroelectric_plant', 'solar_panel', 'wind_turbine'].includes(building.type);
                const renewableIcon = isRenewable ? '🌱' : '🏭';
                const renewableText = isRenewable ? ' (Renovável)' : ' (Não-renovável)';

                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-production">+${building.config.powerGeneration}kW</span>
                        <span class="renewable-indicator">${renewableIcon}${renewableText}</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        } else {
            detailsHTML += '<p class="no-sources">Nenhuma fonte de energia ativa</p>';
        }

        if (powerConsumers.length > 0) {
            detailsHTML += '<h5>🔌 Consumidores de Energia</h5><ul>';
            powerConsumers.forEach(building => {
                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-consumption">-${building.config.powerConsumption}kW</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        }

        detailsHTML += '</div></div>';

        this.elements.detailsContent.innerHTML = detailsHTML;
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
                    <h5>✅ Fatores Positivos</h5>
                    <ul>
                        <li>💧 Abastecimento de água adequado</li>
                        <li>🌿 Baixos níveis de poluição</li>
                        <li>🏥 Infraestrutura de saúde</li>
                        <li>🎓 Infraestrutura educacional</li>
                        <li>🌳 Áreas verdes e recreação</li>
                    </ul>

                    <h5>❌ Fatores Negativos</h5>
                    <ul>
                        <li>🚱 Escassez de água</li>
                        <li>🏭 Alta poluição</li>
                        <li>⚡ Falta de energia</li>
                        <li>🚧 Infraestrutura inadequada</li>
                    </ul>

                    <h5>🏢 Edifícios que Melhoram Satisfação</h5>
        `;

        const satisfactionBuildings = buildings.filter(b => b.config && b.config.satisfactionBonus && b.active);
        if (satisfactionBuildings.length > 0) {
            detailsHTML += '<ul>';
            satisfactionBuildings.forEach(building => {
                // ===== ZERO-ERROR POLICY FIX: Validar config antes de usar =====
                if (!building.config) {
                    console.warn('⚠️ Edifício sem configuração encontrado na lista de satisfação:', building);
                    return;
                }

                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-bonus">+${building.config.satisfactionBonus}%</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        } else {
            detailsHTML += '<p class="no-sources">Nenhum edifício de satisfação construído</p>';
        }

        detailsHTML += '</div></div>';

        this.elements.detailsContent.innerHTML = detailsHTML;
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
                        <span class="stat-value">${this.formatNumber(population.growth, 1)}/min</span>
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
                        <span class="building-production">+${building.config.populationCapacity} hab</span>
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

        this.elements.detailsContent.innerHTML = detailsHTML;
    },

    showPollutionDetailsPanel() {
        if (!this.elements.detailsContent || !this.gameManager.resourceManager) return;

        const pollution = this.gameManager.resourceManager.resources.pollution;
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
                        <span class="stat-label">Fontes Ativas:</span>
                        <span class="stat-value">${this.formatNumber(pollution.sources, 1)}/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Redução:</span>
                        <span class="stat-value">-${this.formatNumber(pollution.reduction, 1)}/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Balanço:</span>
                        <span class="stat-value ${(pollution.sources - pollution.reduction) <= 0 ? 'positive' : 'negative'}">
                            ${pollution.sources - pollution.reduction >= 0 ? '+' : ''}${this.formatNumber(pollution.sources - pollution.reduction, 1)}/min
                        </span>
                    </div>
                </div>

                <div class="resource-sources">
        `;

        if (pollutionSources.length > 0) {
            detailsHTML += '<h5>🏭 Fontes de Poluição</h5><ul>';
            pollutionSources.forEach(building => {
                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-consumption">+${building.config.pollutionGeneration}%/min</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        }

        if (cleanupBuildings.length > 0) {
            detailsHTML += '<h5>🌱 Sistemas de Limpeza</h5><ul>';
            cleanupBuildings.forEach(building => {
                detailsHTML += `
                    <li>
                        <span class="building-icon">${building.config.icon}</span>
                        <span class="building-name">${building.config.name}</span>
                        <span class="building-production">-${building.config.pollutionReduction}%/min</span>
                    </li>
                `;
            });
            detailsHTML += '</ul>';
        }

        detailsHTML += `
                    <h5>🌍 Impactos da Poluição</h5>
                    <ul>
                        <li>😷 Reduz satisfação da população</li>
                        <li>🏥 Aumenta custos de saúde pública</li>
                        <li>🐟 Contamina recursos hídricos</li>
                        <li>🌡️ Contribui para mudanças climáticas</li>
                        <li>🌱 Degrada ecossistemas locais</li>
                    </ul>

                    <h5>✅ Estratégias de Redução</h5>
                    <ul>
                        <li>🌳 Construir áreas verdes e parques</li>
                        <li>♻️ Implementar sistemas de reciclagem</li>
                        <li>🔋 Usar fontes de energia limpa</li>
                        <li>🚌 Promover transporte público</li>
                        <li>🏭 Modernizar indústrias</li>
                    </ul>
                </div>
            </div>
        `;

        this.elements.detailsContent.innerHTML = detailsHTML;
    },
});
