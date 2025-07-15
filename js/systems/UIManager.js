/**
 * GUARDIÃO DA ÁGUA - UI MANAGER
 * Gerencia toda a interface do usuário do jogo
 */

class UIManager {
    constructor(gameManager) {
        console.log('🖥️ Inicializando UIManager...');
        
        this.gameManager = gameManager;
        
        // Elementos da UI
        this.elements = {
            // Recursos
            waterAmount: document.getElementById('water-amount'),
            pollutionLevel: document.getElementById('pollution-level'),
            populationCount: document.getElementById('population-count'),
            satisfactionLevel: document.getElementById('satisfaction-level'),
            budgetAmount: document.getElementById('budget-amount'),
            electricityAmount: document.getElementById('electricity-amount'),
            gameClock: document.getElementById('game-clock'),

            // Controles
            pauseBtn: document.getElementById('btn-pause'),
            speed1xBtn: document.getElementById('btn-speed-1x'),
            speed2xBtn: document.getElementById('btn-speed-2x'),
            speed3xBtn: document.getElementById('btn-speed-3x'),
            helpBtn: document.getElementById('btn-help'),
            menuBtn: document.getElementById('btn-menu'),
            
            // Painéis
            buildingPanel: document.getElementById('building-panel'),
            buildingItems: document.getElementById('building-items'),
            detailsPanel: document.getElementById('details-panel'),
            detailsContent: document.getElementById('details-content'),
            
            // Missões
            currentMission: document.getElementById('current-mission'),
            missionProgress: document.getElementById('mission-progress'),
            
            // Notificações
            notifications: document.getElementById('notifications'),
            
            // Overlays
            pauseOverlay: document.getElementById('pause-overlay'),
            resumeBtn: document.getElementById('btn-resume'),
            saveGameBtn: document.getElementById('btn-save-game'),
            mainMenuBtn: document.getElementById('btn-main-menu')
        };
        
        // Estado da UI
        this.currentCategory = 'water';
        this.selectedBuilding = null;
        this.notifications = [];
        this.maxNotifications = 5;
        
        // Timers
        this.updateTimer = 0;
        this.updateInterval = 100; // 100ms
        
        // Mobile
        this.isMobile = window.innerWidth <= 768;
        this.mobilePanelsVisible = {
            left: false,
            right: false
        };
        
        this.setupEventListeners();
        this.createBuildingCategories();
        this.createMobileControls();
        this.setupHelpModal();
    }
    
    // ===== INICIALIZAÇÃO =====
    initialize() {
        console.log('🖥️ Inicializando interface...');

        // Verificar se elementos existem
        if (!this.elements.waterAmount) {
            console.warn('⚠️ Elementos da UI não encontrados - modo de teste');
            return;
        }

        // Atualizar recursos iniciais
        this.updateResourceDisplay();

        // Carregar edifícios na UI
        this.loadBuildingItems();

        // Configurar responsividade
        this.handleResize();

        console.log('✅ Interface inicializada');
    }
    
    setupEventListeners() {
        // Verificar se elementos existem antes de adicionar listeners
        if (!this.elements.pauseBtn) {
            console.warn('⚠️ Elementos da UI não encontrados - modo de teste');
            return;
        }

        // Controles de velocidade
        this.elements.pauseBtn?.addEventListener('click', () => this.togglePause());
        this.elements.speed1xBtn?.addEventListener('click', () => this.setGameSpeed(1));
        this.elements.speed2xBtn?.addEventListener('click', () => this.setGameSpeed(2));
        this.elements.speed3xBtn?.addEventListener('click', () => this.setGameSpeed(3));
        
        // Menu
        this.elements.menuBtn?.addEventListener('click', () => this.togglePause());
        
        // Overlay de pausa
        this.elements.resumeBtn?.addEventListener('click', () => this.resumeGame());
        this.elements.saveGameBtn?.addEventListener('click', () => this.saveGame());
        this.elements.mainMenuBtn?.addEventListener('click', () => this.returnToMainMenu());
        
        // Categorias de construção
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.selectCategory(category);
            });
        });
        
        // Fechar notificações
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('notification-close')) {
                this.removeNotification(e.target.parentElement);
            }
        });

        // Cliques nos contadores de recursos para mostrar detalhes
        this.elements.waterAmount?.addEventListener('click', () => this.showWaterDetailsPanel());
        this.elements.budgetAmount?.addEventListener('click', () => this.showBudgetDetailsPanel());
        this.elements.electricityAmount?.addEventListener('click', () => this.showEnergyDetailsPanel());
        this.elements.satisfactionLevel?.addEventListener('click', () => this.showSatisfactionDetailsPanel());
    }
    
    createBuildingCategories() {
        const categories = [
            { id: 'water', name: '💧 Água', icon: '💧' },
            { id: 'treatment', name: '🏭 Tratamento', icon: '🏭' },
            { id: 'storage', name: '🏗️ Armazenamento', icon: '🏗️' },
            { id: 'public', name: '🏛️ Prédios Públicos', icon: '🏛️' },
            { id: 'power', name: '⚡ Energia', icon: '⚡' },
            { id: 'infrastructure', name: '🛣️ Infraestrutura', icon: '🛣️' },
            { id: 'zoning', name: '🏘️ Zoneamento', icon: '🏘️' }
        ];

        // As categorias já estão no HTML, apenas configurar eventos
        this.selectCategory('water'); // Categoria padrão
    }
    
    createMobileControls() {
        if (!this.isMobile) return;
        
        // Criar botões de toggle para mobile
        const leftToggle = document.createElement('button');
        leftToggle.className = 'mobile-toggle left';
        leftToggle.innerHTML = '🏗️';
        leftToggle.addEventListener('click', () => this.toggleMobilePanel('left'));
        document.body.appendChild(leftToggle);
        
        const rightToggle = document.createElement('button');
        rightToggle.className = 'mobile-toggle right';
        rightToggle.innerHTML = 'ℹ️';
        rightToggle.addEventListener('click', () => this.toggleMobilePanel('right'));
        document.body.appendChild(rightToggle);
    }
    
    // ===== ATUALIZAÇÃO =====
    update(deltaTime) {
        this.updateTimer += deltaTime;
        
        if (this.updateTimer >= this.updateInterval) {
            this.updateResourceDisplay();
            this.updateTimer = 0;
        }
    }
    
    updateResourceDisplay() {
        if (!this.gameManager.resourceManager) return;

        const resources = this.gameManager.resourceManager.getAllResources();
        if (!resources) return;

        // Água (formato: usado/capacidade)
        if (this.elements.waterAmount && resources.water) {
            const current = Math.round(resources.water.current || 0);
            const storage = Math.round(resources.water.storage || resources.water.max || 1);
            this.elements.waterAmount.textContent = `${current}/${storage}L`;
            this.updateResourceStatus(this.elements.waterAmount, resources.water.current || 0, storage);
        }

        // Poluição
        if (this.elements.pollutionLevel && resources.pollution) {
            this.elements.pollutionLevel.textContent = `${Math.round(resources.pollution.current || 0)}%`;
            this.updatePollutionStatus(this.elements.pollutionLevel, resources.pollution.current || 0);
        }

        // População
        if (this.elements.populationCount && resources.population) {
            this.elements.populationCount.textContent = Math.round(resources.population.current || 0);
        }

        // Satisfação
        if (this.elements.satisfactionLevel && resources.population) {
            this.elements.satisfactionLevel.textContent = `${Math.round(resources.population.satisfaction || 0)}%`;
            this.updateSatisfactionStatus(this.elements.satisfactionLevel, resources.population.satisfaction || 0);
        }

        // Orçamento
        if (this.elements.budgetAmount && resources.budget) {
            this.elements.budgetAmount.textContent = `R$ ${Math.round(resources.budget.current || 0).toLocaleString()}`;
        }

        // Energia
        if (this.elements.electricityAmount && resources.electricity) {
            const current = Math.round(resources.electricity.current || 0);
            const generation = Math.round(resources.electricity.generation || 0);
            this.elements.electricityAmount.textContent = `${current}/${generation} MW`;
        }

        // Relógio do jogo
        if (this.elements.gameClock && this.gameManager && typeof this.gameManager.formatGameTime === 'function') {
            try {
                const timeString = this.gameManager.formatGameTime();
                this.elements.gameClock.textContent = timeString;
            } catch (error) {
                console.warn('⚠️ Erro ao atualizar relógio:', error);
                this.elements.gameClock.textContent = '00/00/0000 00:00';
            }
        }
    }
    
    updateResourceStatus(element, current, max) {
        const percentage = (current / max) * 100;
        
        element.classList.remove('critical', 'warning', 'good');
        
        if (percentage < 20) {
            element.classList.add('critical');
        } else if (percentage < 50) {
            element.classList.add('warning');
        } else {
            element.classList.add('good');
        }
    }
    
    updatePollutionStatus(element, level) {
        element.classList.remove('critical', 'warning', 'good');
        
        if (level > 80) {
            element.classList.add('critical');
        } else if (level > 50) {
            element.classList.add('warning');
        } else {
            element.classList.add('good');
        }
    }
    
    updateSatisfactionStatus(element, level) {
        element.classList.remove('critical', 'warning', 'good');
        
        if (level < 30) {
            element.classList.add('critical');
        } else if (level < 60) {
            element.classList.add('warning');
        } else {
            element.classList.add('good');
        }
    }
    
    // ===== CONSTRUÇÃO =====
    selectCategory(category) {
        this.currentCategory = category;
        
        // Atualizar botões de categoria
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === category) {
                btn.classList.add('active');
            }
        });
        
        // Carregar itens da categoria
        this.loadBuildingItems();
    }
    
    loadBuildingItems() {
        if (!this.elements.buildingItems || !this.gameManager.buildingSystem) return;
        
        const buildingTypes = this.gameManager.buildingSystem.getBuildingTypesByCategory(this.currentCategory);
        
        this.elements.buildingItems.innerHTML = '';
        
        buildingTypes.forEach(buildingType => {
            const item = this.createBuildingItem(buildingType);
            this.elements.buildingItems.appendChild(item);
        });
    }
    
    createBuildingItem(buildingType) {
        const item = document.createElement('div');
        item.className = 'building-item';
        item.dataset.buildingType = buildingType.id;
        
        // Verificar se pode pagar
        const canAfford = !this.gameManager.resourceManager || 
                         this.gameManager.resourceManager.canAfford(buildingType.cost);
        
        if (!canAfford) {
            item.classList.add('disabled');
        }
        
        item.innerHTML = `
            <div class="building-icon">${buildingType.icon}</div>
            <div class="building-info">
                <div class="building-name">${buildingType.name}</div>
                <div class="building-cost">R$ ${buildingType.cost.toLocaleString()}</div>
                <div class="building-description">${buildingType.description}</div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            if (!item.classList.contains('disabled')) {
                this.selectBuildingType(buildingType.id);
            }
        });
        
        return item;
    }
    
    selectBuildingType(buildingTypeId) {
        // Limpar seleção anterior
        document.querySelectorAll('.building-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Selecionar novo item
        const selectedItem = document.querySelector(`[data-building-type="${buildingTypeId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // Entrar em modo de construção
        this.gameManager.enterBuildMode(buildingTypeId);
        
        // Mostrar requisitos do edifício
        const buildingType = this.gameManager.buildingSystem.buildingTypes.get(buildingTypeId);
        if (buildingType) {
            this.showBuildingRequirements(buildingType);
        }
        
        AudioManager.playSound('sfx_click');
    }
    
    clearBuildingSelection() {
        document.querySelectorAll('.building-item').forEach(item => {
            item.classList.remove('selected');
        });
    }
    
    // ===== DETALHES =====
    showBuildingTypeDetails(buildingTypeId) {
        if (!this.elements.detailsContent) return;
        
        const buildingType = this.gameManager.buildingSystem.buildingTypes.get(buildingTypeId);
        if (!buildingType) return;
        
        this.elements.detailsContent.innerHTML = `
            <div class="detail-item">
                <div class="detail-label">Nome:</div>
                <div class="detail-value">${buildingType.name}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Custo:</div>
                <div class="detail-value">R$ ${buildingType.cost.toLocaleString()}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Manutenção:</div>
                <div class="detail-value">R$ ${buildingType.maintenanceCost}/min</div>
            </div>
            ${buildingType.waterProduction ? `
                <div class="detail-item">
                    <div class="detail-label">Produção de Água:</div>
                    <div class="detail-value">${buildingType.waterProduction}L/s</div>
                </div>
            ` : ''}
            ${buildingType.pollutionReduction ? `
                <div class="detail-item">
                    <div class="detail-label">Redução de Poluição:</div>
                    <div class="detail-value">${buildingType.pollutionReduction}%/s</div>
                </div>
            ` : ''}
            ${buildingType.waterStorage ? `
                <div class="detail-item">
                    <div class="detail-label">Armazenamento:</div>
                    <div class="detail-value">${buildingType.waterStorage}L</div>
                </div>
            ` : ''}
            <div class="detail-item">
                <div class="detail-label">Descrição:</div>
                <div class="detail-value">${buildingType.description}</div>
            </div>
        `;
    }
    
    showBuildingDetails(building) {
        if (!this.elements.detailsContent || !building) return;

        // Verificar se o building tem as propriedades necessárias
        const buildingName = building.config?.name || building.type || 'Edifício Desconhecido';
        const gridX = building.gridX ?? 'N/A';
        const gridZ = building.gridZ ?? 'N/A';
        const efficiency = building.efficiency != null ? Math.round(building.efficiency * 100) : 0;
        const status = building.active != null ? (building.active ? 'Ativo' : 'Inativo') : 'Desconhecido';
        const buildingId = building.id || 'unknown';

        this.elements.detailsContent.innerHTML = `
            <div class="detail-item">
                <div class="detail-label">Edifício:</div>
                <div class="detail-value">${buildingName}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Posição:</div>
                <div class="detail-value">(${gridX}, ${gridZ})</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Eficiência:</div>
                <div class="detail-value">${efficiency}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Status:</div>
                <div class="detail-value">${status}</div>
            </div>
            <button class="overlay-btn secondary" onclick="gameManager.buildingSystem.removeBuilding('${buildingId}')">
                🗑️ Demolir
            </button>
        `;
    }
    
    clearBuildingDetails() {
        if (this.elements.detailsContent) {
            this.elements.detailsContent.innerHTML = '<p>Selecione um item para ver detalhes</p>';
        }
    }
    
    // ===== CONTROLES DE JOGO =====
    togglePause() {
        if (this.gameManager.getGameState() === 'playing') {
            this.gameManager.pauseGame();
        } else if (this.gameManager.getGameState() === 'paused') {
            this.gameManager.resumeGame();
        }
    }
    
    setGameSpeed(speed) {
        this.gameManager.setTimeScale(speed);
        this.updateTimeScaleUI(speed);
        AudioManager.playSound('sfx_click');
    }
    
    updateTimeScaleUI(speed) {
        // Atualizar botões de velocidade
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`btn-speed-${speed}x`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
    
    // ===== OVERLAYS =====
    showPauseOverlay() {
        if (this.elements.pauseOverlay) {
            this.elements.pauseOverlay.classList.remove('hidden');
        }
    }
    
    hidePauseOverlay() {
        if (this.elements.pauseOverlay) {
            this.elements.pauseOverlay.classList.add('hidden');
        }
    }
    
    resumeGame() {
        this.gameManager.resumeGame();
        AudioManager.playSound('sfx_click');
    }
    
    saveGame() {
        this.gameManager.saveGame();
        AudioManager.playSound('sfx_success');
    }
    
    returnToMainMenu() {
        if (confirm('Tem certeza que deseja voltar ao menu principal? O progresso não salvo será perdido.')) {
            // Salvar automaticamente
            this.gameManager.autoSave();
            
            // Voltar ao menu
            showScreen('main-menu');
            AudioManager.playSound('sfx_click');
        }
    }

    // ===== REQUISITOS DE CONSTRUÇÃO =====
    showBuildingRequirements(buildingType) {
        if (!this.elements.detailsContent) return;

        this.selectedBuildingType = buildingType;

        const terrainIcons = {
            'grassland': '🌱',
            'lowland': '🏞️',
            'hill': '🏔️',
            'water': '💧'
        };

        const terrainNames = {
            'grassland': 'Campo',
            'lowland': 'Planície',
            'hill': 'Colina',
            'water': 'Água'
        };

        let requirementsHTML = `
            <div class="building-requirements">
                <h4>${buildingType.name}</h4>
                <p class="building-description">${buildingType.description || 'Edifício para gestão de recursos hídricos.'}</p>

                <div class="requirements-section">
                    <h5>📍 Requisitos de Terreno</h5>
        `;

        if (buildingType.requirements && buildingType.requirements.terrain) {
            requirementsHTML += '<div class="terrain-requirements">';

            // Terrenos compatíveis
            requirementsHTML += '<div class="compatible-terrain"><h6>✅ Pode construir em:</h6><ul>';
            buildingType.requirements.terrain.forEach(terrain => {
                const icon = terrainIcons[terrain] || '🟫';
                const name = terrainNames[terrain] || terrain;
                requirementsHTML += `<li>${icon} ${name}</li>`;
            });
            requirementsHTML += '</ul></div>';

            // Terrenos incompatíveis
            const allTerrains = ['grassland', 'lowland', 'hill', 'water'];
            const incompatibleTerrains = allTerrains.filter(t => !buildingType.requirements.terrain.includes(t));

            if (incompatibleTerrains.length > 0) {
                requirementsHTML += '<div class="incompatible-terrain"><h6>❌ Não pode construir em:</h6><ul>';
                incompatibleTerrains.forEach(terrain => {
                    const icon = terrainIcons[terrain] || '🟫';
                    const name = terrainNames[terrain] || terrain;
                    requirementsHTML += `<li>${icon} ${name}</li>`;
                });
                requirementsHTML += '</ul></div>';
            }

            requirementsHTML += '</div>';
        } else {
            requirementsHTML += '<p>✅ Pode ser construído em qualquer terreno</p>';
        }

        // Requisitos adicionais
        if (buildingType.requirements) {
            if (buildingType.requirements.nearWater) {
                requirementsHTML += '<div class="additional-requirements"><h6>🌊 Requisitos Especiais</h6><ul><li>💧 Deve estar próximo à água</li></ul></div>';
            }
        }

        // Efeitos do edifício
        requirementsHTML += '<div class="building-effects"><h5>📊 Efeitos</h5><ul>';

        if (buildingType.waterProduction) {
            requirementsHTML += `<li>💧 +${buildingType.waterProduction} produção de água</li>`;
        }
        if (buildingType.pollutionReduction) {
            requirementsHTML += `<li>🌿 -${buildingType.pollutionReduction} poluição</li>`;
        }
        if (buildingType.powerGeneration) {
            requirementsHTML += `<li>⚡ +${buildingType.powerGeneration} energia</li>`;
        }
        if (buildingType.powerConsumption) {
            requirementsHTML += `<li>🔌 -${buildingType.powerConsumption} energia</li>`;
        }
        if (buildingType.cost) {
            requirementsHTML += `<li>💰 Custo: $${buildingType.cost}</li>`;
        }

        requirementsHTML += '</ul></div></div>';

        this.elements.detailsContent.innerHTML = requirementsHTML;
    }

    clearBuildingRequirements() {
        if (!this.elements.detailsContent) return;

        this.selectedBuildingType = null;
        this.elements.detailsContent.innerHTML = '<p>Selecione um edifício para ver os requisitos</p>';
    }

    // ===== PAINÉIS DE DETALHES DE RECURSOS =====
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
                        <span class="stat-value">${Math.floor(water.current)}L</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Capacidade:</span>
                        <span class="stat-value">${water.storage}L</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Produção:</span>
                        <span class="stat-value">+${water.production}L/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Consumo:</span>
                        <span class="stat-value">-${water.consumption}L/min</span>
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
                        <span class="building-production">+${production}L/min</span>
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
    }

    showBudgetDetailsPanel() {
        if (!this.elements.detailsContent || !this.gameManager.resourceManager) return;

        const budget = this.gameManager.resourceManager.resources.budget;
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
                        <span class="stat-value">+R$ ${budget.income.toLocaleString()}/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Despesas:</span>
                        <span class="stat-value">-R$ ${budget.expenses.toLocaleString()}/min</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Saldo Líquido:</span>
                        <span class="stat-value ${budget.income - budget.expenses >= 0 ? 'positive' : 'negative'}">
                            ${budget.income - budget.expenses >= 0 ? '+' : ''}R$ ${(budget.income - budget.expenses).toLocaleString()}/min
                        </span>
                    </div>
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
    }

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
                        <span class="stat-value">+${electricity.generation}kW</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Consumo:</span>
                        <span class="stat-value">-${electricity.consumption}kW</span>
                    </div>
                    <div class="resource-stat">
                        <span class="stat-label">Saldo:</span>
                        <span class="stat-value ${electricity.generation - electricity.consumption >= 0 ? 'positive' : 'negative'}">
                            ${electricity.generation - electricity.consumption >= 0 ? '+' : ''}${electricity.generation - electricity.consumption}kW
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
    }

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

        const satisfactionBuildings = buildings.filter(b => b.config.satisfactionBonus && b.active);
        if (satisfactionBuildings.length > 0) {
            detailsHTML += '<ul>';
            satisfactionBuildings.forEach(building => {
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
    }

    // ===== NOTIFICAÇÕES =====
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            ${message}
            <button class="notification-close">✕</button>
        `;
        
        if (this.elements.notifications) {
            this.elements.notifications.appendChild(notification);
        }
        
        // Remover automaticamente
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        // Limitar número de notificações
        this.limitNotifications();
    }
    
    removeNotification(notification) {
        if (notification && notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }
    }
    
    limitNotifications() {
        if (!this.elements.notifications) return;
        
        const notifications = this.elements.notifications.children;
        while (notifications.length > this.maxNotifications) {
            this.removeNotification(notifications[0]);
        }
    }
    
    // ===== MOBILE =====
    toggleMobilePanel(side) {
        if (!this.isMobile) return;
        
        const panel = side === 'left' ? 
            document.querySelector('.hud-left') : 
            document.querySelector('.hud-right');
        
        if (panel) {
            this.mobilePanelsVisible[side] = !this.mobilePanelsVisible[side];
            
            if (this.mobilePanelsVisible[side]) {
                panel.classList.add('active');
                // Fechar o outro painel
                const otherSide = side === 'left' ? 'right' : 'left';
                const otherPanel = document.querySelector(`.hud-${otherSide}`);
                if (otherPanel) {
                    otherPanel.classList.remove('active');
                    this.mobilePanelsVisible[otherSide] = false;
                }
            } else {
                panel.classList.remove('active');
            }
        }
    }
    
    // ===== RESPONSIVIDADE =====
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            // Mudou entre mobile e desktop
            if (this.isMobile && !wasMobile) {
                this.createMobileControls();
            } else if (!this.isMobile && wasMobile) {
                // Remover controles mobile
                document.querySelectorAll('.mobile-toggle').forEach(btn => btn.remove());
            }
        }
    }

    setupHelpModal() {
        // Botão de ajuda
        if (this.elements.helpBtn) {
            this.elements.helpBtn.addEventListener('click', () => {
                this.showHelpModal();
            });
        }

        // Botão de fechar modal
        const closeBtn = document.getElementById('close-controls-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideHelpModal();
            });
        }

        // Fechar modal clicando fora
        const modal = document.getElementById('controls-modal');
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    this.hideHelpModal();
                }
            });
        }

        // Fechar modal com ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.hideHelpModal();
            }
        });
    }

    showHelpModal() {
        const modal = document.getElementById('controls-modal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('📖 Modal de controles aberto');
        }
    }

    hideHelpModal() {
        const modal = document.getElementById('controls-modal');
        if (modal) {
            modal.style.display = 'none';
            console.log('📖 Modal de controles fechado');
        }
    }

    // ===== CLEANUP =====
    dispose() {
        // Remover event listeners se necessário
        document.querySelectorAll('.mobile-toggle').forEach(btn => btn.remove());
        console.log('🗑️ UIManager disposed');
    }
}

// Exportar para escopo global
window.UIManager = UIManager;
console.log('🖥️ UIManager carregado e exportado para window.UIManager');
