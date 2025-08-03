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
            missionBtn: document.getElementById('btn-missions'),
            
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
        
        // ===== ENHANCED UI STATE MANAGEMENT =====
        this.uiState = {
            currentCategory: 'water',
            selectedBuilding: null,
            currentOpenPanel: null,
            isTransitioning: false,
            lastInteraction: 0,
            interactionCooldown: 150 // Prevent rapid state changes
        };

        // Legacy compatibility
        this.currentCategory = this.uiState.currentCategory;
        this.selectedBuilding = this.uiState.selectedBuilding;

        this.notifications = [];
        this.maxNotifications = 5;

        // Timers
        this.updateTimer = 0;
        this.updateInterval = 100; // 100ms

        // Cooldown UI
        this.cooldownIndicator = null;
        this.cooldownUpdateInterval = null;

        // ===== ENHANCED MOBILE SUPPORT =====
        this.isMobile = window.innerWidth <= 768;
        this.mobilePanelsVisible = {
            left: false,
            right: false
        };

        // ===== UI CONFLICT RESOLUTION =====
        // Use GameConstants.js as authoritative source for panel priorities

        // ===== EVENT LISTENER TRACKING =====
        this.eventListeners = {
            resource: [],
            category: [],
            building: [],
            global: []
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

    // ===== MISSION MANAGEMENT UI =====

    /**
     * Shows the mission management panel
     */
    showMissionPanel() {
        if (this.elements.detailsPanel) {
            this.elements.detailsPanel.style.display = 'flex';
            this.uiState.currentOpenPanel = 'missions';
        }
    }

    /**
     * Closes the mission management panel
     */
    closeMissionPanel() {
        if (this.elements.detailsPanel && this.uiState.currentOpenPanel === 'missions') {
            this.closeResourcePanel();
        }
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
        
        // ===== LATERAL MENU STABILITY FIX: Improved category button handling =====
        this.setupCategoryButtons();
        
        // Fechar notificações
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('notification-close')) {
                this.removeNotification(e.target.parentElement);
            }
        });

        // ===== ENHANCED RESOURCE PANEL INTERACTION SYSTEM =====
        this.setupEnhancedResourcePanelInteractions();

        // ESC key para fechar painéis
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.uiState.currentOpenPanel) {
                this.closeResourcePanel();
            }
        });

        // ===== ENHANCED MOBILE TOUCH SUPPORT =====
        this.setupMobileTouchSupport();

        // ===== MISSION OBJECTIVE CLICK HANDLERS =====
        this.setupMissionObjectiveHandlers();

        // ===== CONTROL BUTTON ENHANCEMENTS =====
        this.setupControlButtonEnhancements();
    }

    // ===== LATERAL MENU STABILITY FIX: Event listener management =====
    cleanupEventListeners() {
        // Remove existing category button listeners
        if (this.categoryButtonListeners) {
            this.categoryButtonListeners.forEach(({ element, listener }) => {
                element.removeEventListener('click', listener);
            });
        }
        this.categoryButtonListeners = [];

        // Remove existing building item listeners
        if (this.buildingItemListeners) {
            this.buildingItemListeners.forEach(({ element, listener }) => {
                element.removeEventListener('click', listener);
            });
        }
        this.buildingItemListeners = [];
    }

    setupCategoryButtons() {
        // Clean up existing listeners first
        this.cleanupCategoryButtons();

        // Add new listeners with proper tracking
        document.querySelectorAll('.category-btn').forEach(btn => {
            const listener = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // ===== STABILITY FIX: Prevent multiple rapid clicks =====
                if (this.categoryClickCooldown) return;
                this.categoryClickCooldown = true;
                setTimeout(() => this.categoryClickCooldown = false, 200);

                const category = e.target.dataset.category;
                if (category) {
                    this.selectCategory(category);
                }
            };

            btn.addEventListener('click', listener);
            this.categoryButtonListeners.push({ element: btn, listener });
        });
    }

    cleanupCategoryButtons() {
        if (this.categoryButtonListeners) {
            this.categoryButtonListeners.forEach(({ element, listener }) => {
                element.removeEventListener('click', listener);
            });
        }
        this.categoryButtonListeners = [];
    }

    // ===== STABILITY FIX: Improved building item event handling =====
    setupBuildingItemListeners() {
        // Clean up existing listeners
        this.cleanupBuildingItemListeners();

        // Add new listeners for building items
        document.querySelectorAll('.building-item').forEach(item => {
            const listener = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // ===== STABILITY FIX: Prevent clicks on disabled items =====
                if (item.classList.contains('disabled')) return;

                // ===== STABILITY FIX: Prevent multiple rapid clicks =====
                if (this.buildingClickCooldown) return;
                this.buildingClickCooldown = true;
                setTimeout(() => this.buildingClickCooldown = false, 300);

                const buildingType = item.dataset.buildingType;
                if (buildingType) {
                    this.selectBuildingType(buildingType);
                }
            };

            item.addEventListener('click', listener);
            this.buildingItemListeners.push({ element: item, listener });
        });
    }

    cleanupBuildingItemListeners() {
        if (this.buildingItemListeners) {
            this.buildingItemListeners.forEach(({ element, listener }) => {
                element.removeEventListener('click', listener);
            });
        }
        this.buildingItemListeners = [];
    }

    // ===== ENHANCED RESOURCE PANEL INTERACTION SYSTEM =====

    /**
     * Sets up enhanced resource panel interactions with improved reliability
     */
    setupEnhancedResourcePanelInteractions() {
        // Clear existing resource event listeners
        this.cleanupResourceEventListeners();

        // Resource type mapping with improved detection
        const resourceMapping = this.getResourceMapping();

        // Setup resource panel interactions with enhanced error handling
        const resourceItems = document.querySelectorAll('.resource-item');

        resourceItems.forEach((item, index) => {
            const resourceData = resourceMapping[index];
            if (!resourceData) return;

            const { type, name, clickable } = resourceData;

            // Enhanced click handling for resource panels
            if (clickable) {
                this.setupResourceItemClick(item, type, name);
            }

            // Enhanced tooltip system
            this.setupResourceItemTooltip(item, type, name);
        });

        console.log('✅ Enhanced resource panel interactions initialized');
    }

    /**
     * Gets the resource mapping configuration
     * @returns {Array} Resource mapping array
     */
    getResourceMapping() {
        return [
            { type: 'water', name: 'Água', clickable: true },
            { type: 'pollution', name: 'Poluição', clickable: true },
            { type: 'population', name: 'População', clickable: true },
            { type: 'satisfaction', name: 'Satisfação', clickable: true },
            { type: 'budget', name: 'Orçamento', clickable: true },
            { type: 'electricity', name: 'Energia', clickable: true },
            { type: 'clock', name: 'Data/Hora', clickable: false }
        ];
    }

    /**
     * Sets up click handling for a resource item
     * @param {HTMLElement} item - The resource item element
     * @param {string} type - Resource type
     * @param {string} name - Resource display name
     */
    setupResourceItemClick(item, type, name) {
        item.style.cursor = 'pointer';

        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // ===== INTERACTION COOLDOWN: Prevent rapid clicks =====
            const now = Date.now();
            if (now - this.uiState.lastInteraction < this.uiState.interactionCooldown) {
                return;
            }
            this.uiState.lastInteraction = now;

            // ===== STATE MANAGEMENT: Handle panel transitions =====
            // User-initiated panel switch - override priority restrictions
            this.handleResourcePanelTransition(type, true);
        };

        item.addEventListener('click', clickHandler);
        this.eventListeners.resource.push({ element: item, event: 'click', handler: clickHandler });
    }

    /**
     * Sets up tooltip handling for a resource item
     * @param {HTMLElement} item - The resource item element
     * @param {string} type - Resource type
     * @param {string} name - Resource display name
     */
    setupResourceItemTooltip(item, type, name) {
        item.title = name;

        const mouseEnterHandler = (e) => {
            this.showResourceTooltip(e, name, type);
        };

        const mouseLeaveHandler = () => {
            this.hideResourceTooltip();
        };

        item.addEventListener('mouseenter', mouseEnterHandler);
        item.addEventListener('mouseleave', mouseLeaveHandler);

        this.eventListeners.resource.push(
            { element: item, event: 'mouseenter', handler: mouseEnterHandler },
            { element: item, event: 'mouseleave', handler: mouseLeaveHandler }
        );
    }

    /**
     * Handles resource panel transitions with proper state management
     * @param {string} resourceType - The resource type to show
     * @param {boolean} userInitiated - Whether this is a user-initiated panel switch (overrides priority)
     */
    handleResourcePanelTransition(resourceType, userInitiated = false) {
        try {
            // ===== STATE TRANSITION MANAGEMENT =====
            if (this.uiState.isTransitioning) {
                console.log('⚠️ UI transition in progress, ignoring resource panel request');
                return;
            }

            this.uiState.isTransitioning = true;

            // ===== ENHANCED PANEL PRIORITY SYSTEM =====
            const currentPriority = GameConstants.UI.PANEL_PRIORITIES[this.uiState.currentOpenPanel] || 0;
            const newPriority = GameConstants.UI.PANEL_PRIORITIES['resource'];

            // ===== FIX: Allow user-initiated panel switches to override priority restrictions =====
            if (!userInitiated && currentPriority > newPriority && this.uiState.currentOpenPanel !== resourceType) {
                console.log(`⚠️ Higher priority panel (${this.uiState.currentOpenPanel}) is open, resource panel blocked (system-initiated)`);
                this.uiState.isTransitioning = false;
                return;
            }

            // User-initiated switches always succeed
            if (userInitiated && this.uiState.currentOpenPanel !== resourceType) {
                console.log(`🎯 User-initiated panel switch: ${this.uiState.currentOpenPanel} → ${resourceType}`);
            }

            // ===== CLEAN TRANSITION =====
            this.closeCurrentPanel();

            // Small delay to ensure clean transition
            setTimeout(() => {
                this.showResourcePanel(resourceType);
                this.uiState.isTransitioning = false;
            }, 50);

        } catch (error) {
            console.error('❌ Error in resource panel transition:', error);
            this.uiState.isTransitioning = false;
        }
    }

    /**
     * Cleans up resource event listeners
     */
    cleanupResourceEventListeners() {
        this.eventListeners.resource.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners.resource = [];
    }

    /**
     * Closes the current panel if any is open
     */
    closeCurrentPanel() {
        if (this.uiState.currentOpenPanel) {
            switch (this.uiState.currentOpenPanel) {
                case 'water':
                case 'pollution':
                case 'population':
                case 'satisfaction':
                case 'budget':
                case 'electricity':
                    this.closeResourcePanel();
                    break;
                case 'selection':
                    this.clearBuildingSelectionInfo();
                    break;
                case 'terrain':
                    this.hideTerrainInfo();
                    break;
            }
        }
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

        // Remove existing mobile controls
        document.querySelectorAll('.mobile-toggle').forEach(btn => btn.remove());

        // Criar botões de toggle para mobile
        const leftToggle = document.createElement('button');
        leftToggle.className = 'mobile-toggle left';
        leftToggle.innerHTML = '🏗️';
        leftToggle.title = 'Abrir painel de construção';
        leftToggle.addEventListener('click', () => this.toggleMobilePanel('left'));
        document.body.appendChild(leftToggle);

        const rightToggle = document.createElement('button');
        rightToggle.className = 'mobile-toggle right';
        rightToggle.innerHTML = 'ℹ️';
        rightToggle.title = 'Abrir painel de informações';
        rightToggle.addEventListener('click', () => this.toggleMobilePanel('right'));
        document.body.appendChild(rightToggle);

        // Store references for later updates
        this.mobileToggleButtons = {
            left: leftToggle,
            right: rightToggle
        };

        // Create mobile panel headers for hud-right
        this.createMobilePanelHeaders();
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
            // Garantir valores válidos para exibição
            let current = resources.water.current;
            if (current === null || current === undefined || isNaN(current)) {
                current = 0;
            }
            current = Math.round(current);

            const storage = Math.round(resources.water.storage || resources.water.max || 1000);
            this.elements.waterAmount.textContent = `${current}/${storage}L`;
            this.updateResourceStatus(this.elements.waterAmount, current, storage);
        }

        // Poluição
        if (this.elements.pollutionLevel && resources.pollution) {
            this.elements.pollutionLevel.textContent = `${Math.round(resources.pollution.current || 0)}%`;
            this.updatePollutionStatus(this.elements.pollutionLevel, resources.pollution.current || 0);
        }

        // População (formato: atual/capacidade máxima)
        if (this.elements.populationCount && resources.population) {
            const current = Math.round(resources.population.current || 0);
            const maxCapacity = Math.round(resources.population.max || 1000);
            this.elements.populationCount.textContent = `${current}/${maxCapacity}`;
            this.updateResourceStatus(this.elements.populationCount, current, maxCapacity);
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

        // Energia (formato: atual/máximo disponível)
        if (this.elements.electricityAmount && resources.electricity) {
            const current = Math.round(resources.electricity.current || 0);
            const maxAvailable = Math.round(resources.electricity.generation || 0);

            this.elements.electricityAmount.textContent = `${current}/${maxAvailable} MW`;

            // Adicionar classe de status baseada na eficiência
            const efficiency = resources.electricity.efficiency || 0;
            this.elements.electricityAmount.classList.remove('energy-sufficient', 'energy-deficit');
            if (efficiency >= 1.0) {
                this.elements.electricityAmount.classList.add('energy-sufficient');
            } else {
                this.elements.electricityAmount.classList.add('energy-deficit');
            }
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
        // ===== ENHANCED CATEGORY SELECTION WITH STATE MANAGEMENT =====
        if (!category || this.uiState.currentCategory === category) return;

        // ===== STATE TRANSITION MANAGEMENT =====
        if (this.uiState.isTransitioning) {
            console.log('⚠️ UI transition in progress, ignoring category selection');
            return;
        }

        this.uiState.isTransitioning = true;

        try {
            // ===== CLEAN STATE TRANSITION =====
            this.cleanupBuildingItemListeners();

            // Exit any active construction mode
            if (this.gameManager && this.gameManager.buildingSystem.previewMode) {
                this.gameManager.exitBuildMode();
            }

            // Update state
            this.uiState.currentCategory = category;
            this.currentCategory = category; // Legacy compatibility

            // ===== ENHANCED CATEGORY BUTTON MANAGEMENT =====
            this.updateCategoryButtonStates(category);

            // ===== ENHANCED BUILDING ITEMS LOADING =====
            this.loadBuildingItemsWithStateManagement();

            // ===== PANEL STATE MANAGEMENT =====
            if (this.uiState.currentOpenPanel === 'construction') {
                this.uiState.currentOpenPanel = 'building';
            }

            console.log(`🏗️ Categoria selecionada: ${category}`);

        } catch (error) {
            console.error('❌ Error in category selection:', error);
        } finally {
            this.uiState.isTransitioning = false;
        }
    }

    /**
     * Updates category button states with enhanced visual feedback
     * @param {string} activeCategory - The active category
     */
    updateCategoryButtonStates(activeCategory) {
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === activeCategory) {
                btn.classList.add('active');
                // Enhanced visual feedback
                btn.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 200);
            }
        });
    }

    /**
     * Loads building items with enhanced state management
     */
    loadBuildingItemsWithStateManagement() {
        if (!this.elements.buildingItems || !this.gameManager.buildingSystem) return;

        try {
            const buildingTypes = this.gameManager.buildingSystem.getBuildingTypesByCategory(this.uiState.currentCategory);

            // Clear existing items
            this.elements.buildingItems.innerHTML = '';

            // Create building items with enhanced error handling
            buildingTypes.forEach(buildingType => {
                try {
                    const item = this.createBuildingItem(buildingType);
                    this.elements.buildingItems.appendChild(item);
                } catch (error) {
                    console.warn(`⚠️ Error creating building item for ${buildingType.id}:`, error);
                }
            });

            // Setup event listeners after creating items
            this.setupBuildingItemListeners();

            // Update panel state
            this.uiState.currentOpenPanel = 'building';

        } catch (error) {
            console.error('❌ Error loading building items:', error);
        }
    }
    
    loadBuildingItems() {
        if (!this.elements.buildingItems || !this.gameManager.buildingSystem) return;

        const buildingTypes = this.gameManager.buildingSystem.getBuildingTypesByCategory(this.currentCategory);

        this.elements.buildingItems.innerHTML = '';

        buildingTypes.forEach(buildingType => {
            const item = this.createBuildingItem(buildingType);
            this.elements.buildingItems.appendChild(item);
        });

        // ===== LATERAL MENU STABILITY FIX: Setup event listeners after creating items =====
        this.setupBuildingItemListeners();
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

        // ===== LATERAL MENU STABILITY FIX: Event listeners now handled centrally =====
        // Event listener will be added by setupBuildingItemListeners()

        return item;
    }
    
    selectBuildingType(buildingTypeId) {
        // ===== ENHANCED BUILDING SELECTION WITH STATE MANAGEMENT =====
        if (!buildingTypeId) return;

        // ===== STATE TRANSITION MANAGEMENT =====
        if (this.uiState.isTransitioning) {
            console.log('⚠️ UI transition in progress, ignoring building selection');
            return;
        }

        this.uiState.isTransitioning = true;

        try {
            // ===== CLEAN PREVIOUS SELECTION =====
            this.clearBuildingSelections();

            // ===== ENHANCED BUILDING ITEM SELECTION =====
            const selectedItem = document.querySelector(`[data-building-type="${buildingTypeId}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
                // Enhanced visual feedback
                selectedItem.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    selectedItem.style.transform = '';
                }, 300);
            }

            // ===== CONSTRUCTION MODE MANAGEMENT =====
            const buildingType = this.gameManager.buildingSystem.buildingTypes.get(buildingTypeId);
            if (!buildingType) {
                console.error(`❌ Building type not found: ${buildingTypeId}`);
                return;
            }

            // ===== PANEL STATE MANAGEMENT =====
            this.closeCurrentPanel(); // Close any open resource panels

            // Enter construction mode
            this.gameManager.enterBuildMode(buildingTypeId);

            // Show building requirements with enhanced display
            this.showEnhancedBuildingRequirements(buildingType);

            // Update UI state
            this.uiState.currentOpenPanel = 'construction';
            this.uiState.selectedBuilding = buildingTypeId;

            // Audio feedback
            AudioManager.playSound('sfx_click');

            console.log(`🏗️ Building type selected: ${buildingTypeId}`);

        } catch (error) {
            console.error('❌ Error in building selection:', error);
        } finally {
            this.uiState.isTransitioning = false;
        }
    }

    /**
     * Clears all building selections with enhanced cleanup
     */
    clearBuildingSelections() {
        document.querySelectorAll('.building-item').forEach(item => {
            item.classList.remove('selected');
            item.style.transform = ''; // Clear any transform effects
        });
    }

    /**
     * Shows enhanced building requirements with better formatting
     * @param {Object} buildingType - The building type object
     */
    showEnhancedBuildingRequirements(buildingType) {
        try {
            // Use existing method but with enhanced error handling
            this.showBuildingRequirements(buildingType);
        } catch (error) {
            console.warn('⚠️ Error showing building requirements:', error);
            // Fallback to basic display
            this.showBasicBuildingInfo(buildingType);
        }
    }

    /**
     * Shows basic building information as fallback
     * @param {Object} buildingType - The building type object
     */
    showBasicBuildingInfo(buildingType) {
        const detailsContent = this.elements.detailsContent;
        if (detailsContent) {
            detailsContent.innerHTML = `
                <div class="building-info">
                    <h3>${buildingType.name}</h3>
                    <p>${buildingType.description || 'Edifício selecionado para construção'}</p>
                    <p><strong>Custo:</strong> $${buildingType.cost || 0}</p>
                </div>
            `;
        }
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
    showResourcePanel(panelType) {
        // ===== ENHANCED RESOURCE PANEL DISPLAY SYSTEM =====

        // ===== VALIDATION =====
        if (!panelType) {
            console.warn('⚠️ No panel type specified');
            return;
        }

        // ===== STATE MANAGEMENT: Prevent showing same panel =====
        if (this.uiState.currentOpenPanel === panelType) {
            console.log(`📊 Panel ${panelType} already open`);
            return;
        }

        // ===== TRANSITION MANAGEMENT =====
        if (this.uiState.isTransitioning) {
            console.log('⚠️ UI transition in progress, queuing resource panel request');
            setTimeout(() => this.showResourcePanel(panelType), 100);
            return;
        }

        this.uiState.isTransitioning = true;

        try {
            // ===== CLEAN PREVIOUS PANEL =====
            this.closeCurrentPanel();

            // ===== UPDATE STATE =====
            this.uiState.currentOpenPanel = panelType;

            // ===== FIX: Ensure details panel is visible after transition =====
            if (this.elements.detailsPanel) {
                this.elements.detailsPanel.style.display = 'flex';
            }

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
                console.log(`📊 Resource panel opened: ${panelType}`);
            } else {
                console.warn(`⚠️ Unknown panel type: ${panelType}`);
                this.uiState.currentOpenPanel = null;
            }

        } catch (error) {
            console.error('❌ Error showing resource panel:', error);
            this.uiState.currentOpenPanel = null;
        } finally {
            this.uiState.isTransitioning = false;
        }
    }

    closeResourcePanel() {
        try {
            // ===== ENHANCED RESOURCE PANEL CLOSING =====

            // ===== STATE CLEANUP =====
            this.uiState.currentOpenPanel = null;

            // ===== PANEL CLEANUP =====
            if (this.elements.detailsContent) {
                this.elements.detailsContent.innerHTML = '<p>Clique em um recurso para ver detalhes</p>';
            }

            if (this.elements.detailsPanel) {
                this.elements.detailsPanel.style.display = 'none';
            }

            console.log('📊 Resource panel closed');

        } catch (error) {
            console.error('❌ Error closing resource panel:', error);
        }
    }

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
    
    removeNotification(notification, immediate = false) {
        if (!notification || !notification.parentElement) return;

        if (immediate) {
            // Immediate removal without animation (used for cleanup)
            notification.parentElement.removeChild(notification);
            return;
        }

        // Animated removal (used for user interactions)
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification && notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }
    
    limitNotifications() {
        if (!this.elements.notifications) return;

        const notifications = this.elements.notifications.children;

        // Prevent infinite loops by using a counter and immediate removal for excess notifications
        let removalCount = 0;
        const maxRemovals = 10; // Safety limit to prevent infinite loops

        while (notifications.length > this.maxNotifications && removalCount < maxRemovals) {
            const notificationToRemove = notifications[0];

            // Immediately remove excess notifications without animation to prevent infinite loop
            if (notificationToRemove && notificationToRemove.parentElement) {
                notificationToRemove.parentElement.removeChild(notificationToRemove);
                removalCount++;
                console.log(`🗑️ Removed excess notification (${removalCount}/${notifications.length + removalCount})`);
            } else {
                // Safety break if we can't remove the element
                console.warn('⚠️ Could not remove notification, breaking loop to prevent freeze');
                break;
            }
        }

        if (removalCount >= maxRemovals) {
            console.warn('⚠️ Hit maximum removal limit in limitNotifications() - potential infinite loop prevented');
        }
    }
    
    // ===== ENHANCED MOBILE PANEL MANAGEMENT =====
    createMobilePanelHeaders() {
        if (!this.isMobile) return;

        // Add mobile header to hud-right panel
        const hudRight = document.querySelector('.hud-right');
        const detailsPanel = hudRight?.querySelector('.details-panel');

        if (detailsPanel && !detailsPanel.querySelector('.mobile-panel-header')) {
            // Create mobile header
            const mobileHeader = document.createElement('div');
            mobileHeader.className = 'mobile-panel-header';

            const title = document.createElement('div');
            title.className = 'mobile-panel-title';
            title.textContent = 'Informações';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'mobile-close-btn';
            closeBtn.innerHTML = '✕';
            closeBtn.title = 'Fechar painel';
            closeBtn.addEventListener('click', () => this.closeMobilePanel('right'));

            mobileHeader.appendChild(title);
            mobileHeader.appendChild(closeBtn);

            // Insert at the beginning of details panel
            detailsPanel.insertBefore(mobileHeader, detailsPanel.firstChild);
        }
    }

    toggleMobilePanel(side) {
        if (!this.isMobile) return;

        const panel = side === 'left' ?
            document.querySelector('.hud-left') :
            document.querySelector('.hud-right');

        if (panel) {
            const wasVisible = this.mobilePanelsVisible[side];

            // Close all panels first
            this.closeAllMobilePanels();

            if (!wasVisible) {
                // Open the requested panel
                this.mobilePanelsVisible[side] = true;
                panel.classList.add('active');

                // Update toggle button state
                if (this.mobileToggleButtons && this.mobileToggleButtons[side]) {
                    this.mobileToggleButtons[side].classList.add('active');
                }

                // Add escape key listener for mobile panels
                this.addMobileEscapeListener();
            }
        }
    }

    closeMobilePanel(side) {
        if (!this.isMobile) return;

        const panel = side === 'left' ?
            document.querySelector('.hud-left') :
            document.querySelector('.hud-right');

        if (panel) {
            this.mobilePanelsVisible[side] = false;
            panel.classList.remove('active');

            // Update toggle button state
            if (this.mobileToggleButtons && this.mobileToggleButtons[side]) {
                this.mobileToggleButtons[side].classList.remove('active');
            }

            // Remove escape listener if no panels are open
            if (!this.mobilePanelsVisible.left && !this.mobilePanelsVisible.right) {
                this.removeMobileEscapeListener();
            }
        }
    }

    closeAllMobilePanels() {
        if (!this.isMobile) return;

        ['left', 'right'].forEach(side => {
            const panel = document.querySelector(`.hud-${side}`);
            if (panel) {
                this.mobilePanelsVisible[side] = false;
                panel.classList.remove('active');

                // Update toggle button state
                if (this.mobileToggleButtons && this.mobileToggleButtons[side]) {
                    this.mobileToggleButtons[side].classList.remove('active');
                }
            }
        });

        this.removeMobileEscapeListener();
    }

    addMobileEscapeListener() {
        if (!this.mobileEscapeListener) {
            this.mobileEscapeListener = (event) => {
                if (event.key === 'Escape') {
                    this.closeAllMobilePanels();
                }
            };
            document.addEventListener('keydown', this.mobileEscapeListener);
        }
    }

    removeMobileEscapeListener() {
        if (this.mobileEscapeListener) {
            document.removeEventListener('keydown', this.mobileEscapeListener);
            this.mobileEscapeListener = null;
        }
    }
    
    // ===== ENHANCED RESPONSIVIDADE =====
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        if (wasMobile !== this.isMobile) {
            // Mudou entre mobile e desktop
            if (this.isMobile && !wasMobile) {
                // Switching to mobile
                this.createMobileControls();
                this.closeAllMobilePanels(); // Ensure panels are closed initially
            } else if (!this.isMobile && wasMobile) {
                // Switching to desktop
                this.cleanupMobileControls();
            }
        }
    }

    cleanupMobileControls() {
        // Remove mobile controls
        document.querySelectorAll('.mobile-toggle').forEach(btn => btn.remove());

        // Remove mobile panel headers
        document.querySelectorAll('.mobile-panel-header').forEach(header => header.remove());

        // Reset mobile state
        this.mobilePanelsVisible = { left: false, right: false };
        this.mobileToggleButtons = null;
        this.removeMobileEscapeListener();

        // Remove active classes from panels
        document.querySelectorAll('.hud-left, .hud-right').forEach(panel => {
            panel.classList.remove('active');
        });
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
    }

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
    }

    // ===== UTILITY METHODS =====
    formatNumber(value, decimals = 1) {
        if (value === null || value === undefined || isNaN(value)) {
            return '0';
        }

        // Para números grandes, usar formatação com vírgulas
        if (Math.abs(value) >= 1000) {
            return Math.round(value).toLocaleString();
        }

        // Para números menores, usar decimais limitados
        return parseFloat(value.toFixed(decimals)).toLocaleString();
    }

    // ===== CLEANUP =====
    dispose() {
        // Remover event listeners se necessário
        document.querySelectorAll('.mobile-toggle').forEach(btn => btn.remove());
        console.log('🗑️ UIManager disposed');
    }

    // ===== INFORMAÇÕES DE SELEÇÃO DE EDIFÍCIOS =====
    showBuildingSelectionInfo(building) {
        if (!building) return;

        // ===== ZERO-ERROR POLICY FIX: Validar config antes de usar =====
        if (!building.config) {
            console.warn('⚠️ Tentativa de mostrar informações para edifício sem configuração:', building);
            return;
        }

        // Usar o painel de detalhes existente para mostrar informações de seleção
        const detailsPanel = this.elements.detailsPanel;
        const detailsContent = this.elements.detailsContent;

        if (!detailsPanel || !detailsContent) return;

        // Gerar conteúdo das informações do edifício selecionado
        let content = `
            <div class="building-selection-info">
                <div class="selection-header">
                    <h3>🏢 ${building.config.name}</h3>
                    <button class="deselect-btn" onclick="window.gameManager.deselectBuilding()">✖️ Desselecionar</button>
                </div>

                <div class="building-details">
                    <div class="detail-row">
                        <span class="detail-label">Categoria:</span>
                        <span class="detail-value">${this.getCategoryDisplayName(building.config.category)}</span>
                    </div>

                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value ${building.active ? 'status-active' : 'status-inactive'}">
                            ${building.active ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>

                    <div class="detail-row">
                        <span class="detail-label">Eficiência:</span>
                        <span class="detail-value">${Math.round(building.efficiency * 100)}%</span>
                    </div>

                    <div class="detail-row">
                        <span class="detail-label">Posição:</span>
                        <span class="detail-value">(${building.gridX}, ${building.gridZ})</span>
                    </div>
                </div>

                <div class="building-stats">
                    ${this.generateBuildingStats(building)}
                </div>

                <div class="building-actions">
                    ${this.generateBuildingActions(building)}
                </div>
            </div>
        `;

        detailsContent.innerHTML = content;
        detailsPanel.style.display = 'block';
        this.uiState.currentOpenPanel = 'selection';

        console.log(`📋 Informações de seleção exibidas para ${building.config.name}`);
    }

    clearBuildingSelectionInfo() {
        const detailsPanel = this.elements.detailsPanel;

        if (detailsPanel && this.uiState.currentOpenPanel === 'selection') {
            detailsPanel.style.display = 'none';
            this.uiState.currentOpenPanel = null;
        }
    }

    generateBuildingStats(building) {
        let stats = '';
        const config = building.config;

        if (config.waterProduction > 0) {
            const status = building.isRented ? ' (Alugado)' : '';
            stats += `<div class="stat-item">💧 Produção de Água: ${config.waterProduction}L/s${status}</div>`;
        }

        if (config.waterConsumption > 0) {
            stats += `<div class="stat-item">🚰 Consumo de Água: ${config.waterConsumption}L/s</div>`;
        }

        if (config.powerGeneration > 0) {
            const status = building.isRented ? ' (Alugado)' : '';
            stats += `<div class="stat-item">⚡ Geração de Energia: ${config.powerGeneration} MW${status}</div>`;
        }

        if (config.powerConsumption > 0) {
            stats += `<div class="stat-item">🔌 Consumo de Energia: ${config.powerConsumption} MW</div>`;
        }

        if (config.incomeGeneration > 0) {
            const status = building.isRented ? ' (Alugado)' : '';
            stats += `<div class="stat-item">💵 Receita: R$ ${config.incomeGeneration}/min${status}</div>`;
        }

        if (config.maintenanceCost > 0) {
            stats += `<div class="stat-item">💰 Manutenção: R$ ${config.maintenanceCost}/min</div>`;
        }

        if (config.pollutionGeneration > 0) {
            stats += `<div class="stat-item">🏭 Poluição: +${config.pollutionGeneration}/s</div>`;
        }

        return stats;
    }

    generateBuildingActions(building) {
        let actions = '';
        const config = building.config;

        // Botão de aluguel para edifícios de infraestrutura
        if (config.waterProduction > 0 || config.powerGeneration > 0) {
            const rentalText = building.isRented ? 'Cancelar Aluguel' : 'Alugar para Outras Cidades';
            const rentalIcon = building.isRented ? '🏠' : '🏙️';
            actions += `
                <button class="action-btn rental-btn" onclick="window.gameManager.buildingSystem.toggleBuildingRental('${building.id}'); window.gameManager.updateSelectionInfo(window.gameManager.selectedBuilding);">
                    ${rentalIcon} ${rentalText}
                </button>
            `;
        }

        // Botão de reciclagem
        actions += `
            <button class="action-btn recycle-btn" onclick="window.gameManager.recycleBuildingWithConfirmation('${building.id}')">
                ♻️ Reciclar Edifício
            </button>
        `;

        return actions;
    }

    getCategoryDisplayName(category) {
        const categoryNames = {
            'water': 'Água',
            'treatment': 'Tratamento',
            'storage': 'Armazenamento',
            'residential': 'Residencial',
            'power': 'Energia',
            'infrastructure': 'Infraestrutura',
            'zoning': 'Zoneamento',
            'commercial': 'Comercial',
            'tourism': 'Turismo',
            'industrial': 'Industrial',
            'public': 'Público'
        };
        return categoryNames[category] || category;
    }

    // ===== SISTEMA DE EMPRÉSTIMOS =====
    showLoanInterface() {
        if (!this.gameManager.loanManager) {
            console.warn('⚠️ LoanManager não disponível');
            return;
        }

        const loanManager = this.gameManager.loanManager;
        const monthlyIncome = loanManager.getMonthlyIncome();
        const maxLoanAmount = loanManager.getMaxLoanAmount();
        const creditScore = loanManager.getCreditScore();
        const currentDebt = loanManager.getTotalDebt();
        const monthlyPayments = loanManager.getMonthlyPayments();

        // Usar o painel de detalhes para mostrar a interface de empréstimos
        const detailsPanel = this.elements.detailsPanel;
        const detailsContent = this.elements.detailsContent;

        if (!detailsPanel || !detailsContent) return;

        const content = `
            <div class="loan-interface">
                <div class="loan-header">
                    <h3>🏦 Sistema de Empréstimos</h3>
                    <button class="close-btn" onclick="window.gameManager.uiManager.closeLoanInterface()">✖️</button>
                </div>

                <div class="financial-status">
                    <h4>📊 Status Financeiro da Cidade</h4>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Receita Mensal:</span>
                            <span class="status-value">R$ ${monthlyIncome.toFixed(2)}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Score de Crédito:</span>
                            <span class="status-value credit-score-${this.getCreditScoreClass(creditScore)}">${creditScore}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Dívida Total:</span>
                            <span class="status-value">R$ ${currentDebt.toFixed(2)}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Pagamentos Mensais:</span>
                            <span class="status-value">R$ ${monthlyPayments.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div class="loan-application">
                    <h4>💰 Solicitar Empréstimo</h4>
                    <div class="loan-form">
                        <div class="form-group">
                            <label for="loan-amount">Valor do Empréstimo (máx. R$ ${maxLoanAmount.toFixed(2)}):</label>
                            <input type="number" id="loan-amount" min="1000" max="${maxLoanAmount}" step="1000" value="10000">
                        </div>

                        <div class="form-group">
                            <label for="loan-term">Prazo de Pagamento:</label>
                            <select id="loan-term">
                                <option value="6">6 meses</option>
                                <option value="12" selected>12 meses</option>
                                <option value="24">24 meses</option>
                                <option value="36">36 meses</option>
                            </select>
                        </div>

                        <div class="loan-preview" id="loan-preview">
                            <div class="preview-item">
                                <span>Taxa de Juros Estimada:</span>
                                <span id="estimated-rate">-</span>
                            </div>
                            <div class="preview-item">
                                <span>Pagamento Mensal:</span>
                                <span id="monthly-payment">-</span>
                            </div>
                            <div class="preview-item">
                                <span>Total a Pagar:</span>
                                <span id="total-payment">-</span>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button class="loan-btn calculate-btn" onclick="window.gameManager.uiManager.calculateLoanPreview()">
                                📊 Calcular
                            </button>
                            <button class="loan-btn apply-btn" onclick="window.gameManager.uiManager.applyForLoan()">
                                💰 Solicitar Empréstimo
                            </button>
                        </div>
                    </div>
                </div>

                <div class="active-loans">
                    <h4>📋 Empréstimos Ativos</h4>
                    <div id="active-loans-list">
                        ${this.generateActiveLoansHTML(loanManager.getActiveLoans())}
                    </div>
                </div>
            </div>
        `;

        detailsContent.innerHTML = content;
        detailsPanel.style.display = 'block';
        this.uiState.currentOpenPanel = 'loans';

        // Calcular preview inicial
        this.calculateLoanPreview();

        console.log('🏦 Interface de empréstimos aberta');
    }

    closeLoanInterface() {
        const detailsPanel = this.elements.detailsPanel;

        if (detailsPanel && this.uiState.currentOpenPanel === 'loans') {
            detailsPanel.style.display = 'none';
            this.uiState.currentOpenPanel = null;
        }
    }

    calculateLoanPreview() {
        const amountInput = document.getElementById('loan-amount');
        const termSelect = document.getElementById('loan-term');

        if (!amountInput || !termSelect) return;

        const amount = parseFloat(amountInput.value) || 0;
        const termMonths = parseInt(termSelect.value) || 12;

        if (amount <= 0) return;

        const loanManager = this.gameManager.loanManager;
        const interestRate = loanManager.calculateInterestRate();
        const monthlyPayment = loanManager.calculateMonthlyPayment(amount, termMonths, interestRate);
        const totalPayment = monthlyPayment * termMonths;

        // Atualizar preview
        document.getElementById('estimated-rate').textContent = `${(interestRate * 100).toFixed(2)}% ao ano`;
        document.getElementById('monthly-payment').textContent = `R$ ${monthlyPayment.toFixed(2)}`;
        document.getElementById('total-payment').textContent = `R$ ${totalPayment.toFixed(2)}`;
    }

    applyForLoan() {
        const amountInput = document.getElementById('loan-amount');
        const termSelect = document.getElementById('loan-term');

        if (!amountInput || !termSelect) return;

        const amount = parseFloat(amountInput.value) || 0;
        const termMonths = parseInt(termSelect.value) || 12;

        if (amount <= 0) {
            this.showNotification('❌ Valor do empréstimo inválido', 'error');
            return;
        }

        const result = this.gameManager.loanManager.requestLoan(amount, termMonths);

        if (result.approved) {
            this.showNotification(
                `✅ Empréstimo aprovado! R$ ${amount} a ${(result.interestRate * 100).toFixed(2)}% ao ano`,
                'success'
            );

            // Atualizar interface
            this.showLoanInterface();
        } else {
            this.showNotification(`❌ Empréstimo rejeitado: ${result.reason}`, 'error');
        }
    }

    generateActiveLoansHTML(loans) {
        if (loans.length === 0) {
            return '<p class="no-loans">Nenhum empréstimo ativo</p>';
        }

        return loans.map(loan => `
            <div class="loan-item">
                <div class="loan-info">
                    <span class="loan-id">${loan.id}</span>
                    <span class="loan-balance">Saldo: R$ ${loan.remainingBalance.toFixed(2)}</span>
                    <span class="loan-payment">Pagamento: R$ ${loan.monthlyPayment.toFixed(2)}/mês</span>
                    <span class="loan-remaining">${loan.remainingMonths} meses restantes</span>
                </div>
            </div>
        `).join('');
    }

    getCreditScoreClass(score) {
        if (score >= 750) return 'excellent';
        if (score >= 650) return 'good';
        if (score >= 550) return 'fair';
        return 'poor';
    }

    // ===== SISTEMA DE COOLDOWN VISUAL APRIMORADO =====
    showBuildingCooldown(remainingTime, totalTime) {
        // Criar indicador de cooldown se não existir
        if (!this.cooldownIndicator) {
            this.createCooldownIndicator();
        }

        // Mostrar o indicador com animação suave
        this.cooldownIndicator.style.display = 'block';
        this.cooldownIndicator.style.opacity = '0';
        this.cooldownIndicator.style.transform = 'translate(-50%, -50%) scale(0.8)';

        // Animação de entrada
        requestAnimationFrame(() => {
            this.cooldownIndicator.style.transition = 'all 0.3s ease-out';
            this.cooldownIndicator.style.opacity = '1';
            this.cooldownIndicator.style.transform = 'translate(-50%, -50%) scale(1)';
        });

        // Atualizar texto com formatação melhorada
        const seconds = Math.ceil(remainingTime / 1000);
        const progressText = this.cooldownIndicator.querySelector('.cooldown-text');
        if (progressText) {
            progressText.textContent = `⏱️ Aguarde ${seconds}s antes de construir novamente`;
        }

        // Desabilitar botões de construção com feedback visual
        this.disableBuildingButtons();

        // Adicionar efeito de pulsação no painel de construção
        this.addCooldownPulseEffect();

        // Iniciar atualização do progresso
        this.startCooldownUpdate(remainingTime, totalTime);

        // Tocar som de feedback aprimorado
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('sfx_build_error', 0.6);
        }
    }

    createCooldownIndicator() {
        // Criar elemento do indicador de cooldown aprimorado
        this.cooldownIndicator = document.createElement('div');
        this.cooldownIndicator.className = 'building-cooldown enhanced';
        this.cooldownIndicator.style.display = 'none';

        this.cooldownIndicator.innerHTML = `
            <div class="cooldown-icon">🏗️</div>
            <div class="cooldown-text">Aguarde antes de construir novamente</div>
            <div class="cooldown-progress">
                <div class="cooldown-progress-fill"></div>
                <div class="cooldown-progress-glow"></div>
            </div>
            <div class="cooldown-time">0s</div>
            <div class="cooldown-subtitle">Sistema de construção em pausa</div>
        `;

        // Adicionar ao body
        document.body.appendChild(this.cooldownIndicator);
    }

    startCooldownUpdate(remainingTime, totalTime) {
        // Limpar intervalo anterior se existir
        if (this.cooldownUpdateInterval) {
            clearInterval(this.cooldownUpdateInterval);
        }

        const startTime = Date.now();
        const endTime = startTime + remainingTime;

        this.cooldownUpdateInterval = setInterval(() => {
            const now = Date.now();
            const timeLeft = Math.max(0, endTime - now);
            const progress = Math.min(1, (totalTime - timeLeft) / totalTime);

            // Atualizar barra de progresso com animação suave
            const progressFill = this.cooldownIndicator.querySelector('.cooldown-progress-fill');
            const progressGlow = this.cooldownIndicator.querySelector('.cooldown-progress-glow');
            if (progressFill) {
                progressFill.style.width = `${progress * 100}%`;

                // Mudança de cor baseada no progresso
                const hue = progress * 120; // De vermelho (0) para verde (120)
                progressFill.style.background = `hsl(${hue}, 70%, 50%)`;

                if (progressGlow) {
                    progressGlow.style.width = `${progress * 100}%`;
                    progressGlow.style.boxShadow = `0 0 10px hsl(${hue}, 70%, 50%)`;
                }
            }

            // Atualizar tempo restante com formatação melhorada
            const timeDisplay = this.cooldownIndicator.querySelector('.cooldown-time');
            if (timeDisplay) {
                const seconds = Math.ceil(timeLeft / 1000);
                timeDisplay.textContent = `${seconds}s`;

                // Efeito de pulsação nos últimos 3 segundos
                if (seconds <= 3 && seconds > 0) {
                    timeDisplay.style.animation = 'pulse 0.5s ease-in-out infinite alternate';
                } else {
                    timeDisplay.style.animation = '';
                }
            }

            // Verificar se terminou
            if (timeLeft <= 0) {
                this.hideBuildingCooldown();
            }
        }, 50); // Atualizar a cada 50ms para suavidade
    }

    hideBuildingCooldown() {
        if (this.cooldownIndicator) {
            // Animação de saída suave
            this.cooldownIndicator.style.transition = 'all 0.3s ease-in';
            this.cooldownIndicator.style.opacity = '0';
            this.cooldownIndicator.style.transform = 'translate(-50%, -50%) scale(0.8)';

            setTimeout(() => {
                if (this.cooldownIndicator) {
                    this.cooldownIndicator.style.display = 'none';
                }
            }, 300);
        }

        if (this.cooldownUpdateInterval) {
            clearInterval(this.cooldownUpdateInterval);
            this.cooldownUpdateInterval = null;
        }

        // Reabilitar botões de construção com feedback visual
        this.enableBuildingButtons();

        // Remover efeito de pulsação do painel
        this.removeCooldownPulseEffect();

        // Tocar som de sucesso
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('sfx_success', 0.3);
        }

        // Mostrar notificação de cooldown finalizado
        this.showNotification('Sistema de construção reativado!', 'success', 2000);
    }

    disableBuildingButtons() {
        const buildingItems = document.querySelectorAll('.building-item');
        buildingItems.forEach(item => {
            item.classList.add('cooldown-disabled');
            item.style.pointerEvents = 'none';
            item.style.opacity = '0.4';
            item.style.filter = 'grayscale(50%)';
            item.style.transition = 'all 0.3s ease';

            // Adicionar overlay de cooldown
            if (!item.querySelector('.cooldown-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'cooldown-overlay';
                overlay.innerHTML = '⏱️';
                item.appendChild(overlay);
            }
        });
    }

    enableBuildingButtons() {
        const buildingItems = document.querySelectorAll('.building-item');
        buildingItems.forEach(item => {
            item.classList.remove('cooldown-disabled');
            item.style.pointerEvents = '';
            item.style.opacity = '';
            item.style.filter = '';
            item.style.transition = 'all 0.3s ease';

            // Remover overlay de cooldown
            const overlay = item.querySelector('.cooldown-overlay');
            if (overlay) {
                overlay.remove();
            }

            // Efeito de "reativação" suave
            item.style.transform = 'scale(1.05)';
            setTimeout(() => {
                item.style.transform = '';
            }, 200);
        });
    }

    // Adicionar efeito de pulsação no painel durante cooldown
    addCooldownPulseEffect() {
        const buildingPanel = document.querySelector('.building-panel');
        if (buildingPanel) {
            buildingPanel.classList.add('cooldown-pulse');
        }
    }

    removeCooldownPulseEffect() {
        const buildingPanel = document.querySelector('.building-panel');
        if (buildingPanel) {
            buildingPanel.classList.remove('cooldown-pulse');
        }
    }

    // ===== SISTEMA UNIFICADO DE TOOLTIPS =====
    showBuildingHoverTooltip(building, mouseX, mouseY) {
        // Mostrar tooltip de hover (diferente do painel lateral de seleção)
        // Este método pode reutilizar a lógica existente de hover
        if (this.gameManager && this.gameManager.updateHoverInfo) {
            // Usar o sistema de hover existente, mas apenas para tooltips
            const gridPos = this.gameManager.gridManager.worldToGrid({x: mouseX, z: mouseY});
            this.gameManager.updateHoverInfo(gridPos.x, gridPos.z, mouseX, mouseY);
        }
    }



    // ===== RESOURCE UI REDESIGN: Sistema de tooltips para recursos =====
    showResourceTooltip(event, resourceName, resourceType) {
        // Criar ou obter tooltip
        let tooltip = document.getElementById('resource-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'resource-tooltip';
            tooltip.className = 'hover-tooltip resource-tooltip';
            document.body.appendChild(tooltip);
        }

        // Definir conteúdo do tooltip
        let content = `<div class="tooltip-header">${resourceName}</div>`;

        // Adicionar informações específicas do recurso
        const descriptions = {
            'water': 'Recurso essencial para a população. Monitore o consumo e a capacidade de armazenamento.',
            'pollution': 'Nível de poluição da cidade. Mantenha baixo para a saúde dos cidadãos.',
            'population': 'Número de habitantes. Construa residências para aumentar.',
            'satisfaction': 'Felicidade dos cidadãos. Afeta o crescimento populacional.',
            'budget': 'Recursos financeiros disponíveis para construção e manutenção.',
            'electricity': 'Energia elétrica disponível. Necessária para muitos edifícios.',
            'clock': 'Data e hora atual do jogo.'
        };

        if (descriptions[resourceType]) {
            content += `<div class="tooltip-description">${descriptions[resourceType]}</div>`;
        }

        tooltip.innerHTML = content;

        // ===== RESOURCE TOOLTIP POSITIONING FIX: Position below element to prevent off-screen display =====
        const rect = event.target.getBoundingClientRect();

        // Position tooltip below the resource button
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.bottom + 10) + 'px'; // Changed from rect.top - 10 to rect.bottom + 10
        tooltip.style.transform = 'translateX(-50%)'; // Removed translateY(-100%) to position below
        tooltip.style.display = 'block';

        // ===== ADDITIONAL FIX: Ensure tooltip stays within viewport bounds =====
        // Check if tooltip would go off-screen and adjust if necessary
        setTimeout(() => {
            const tooltipRect = tooltip.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Adjust horizontal position if off-screen
            if (tooltipRect.right > viewportWidth) {
                tooltip.style.left = (viewportWidth - tooltipRect.width - 10) + 'px';
                tooltip.style.transform = 'none';
            } else if (tooltipRect.left < 0) {
                tooltip.style.left = '10px';
                tooltip.style.transform = 'none';
            }

            // If tooltip would go below viewport, position above instead
            if (tooltipRect.bottom > viewportHeight) {
                tooltip.style.top = (rect.top - 10) + 'px';
                tooltip.style.transform = tooltip.style.transform + ' translateY(-100%)';
            }
        }, 0);
    }

    hideResourceTooltip() {
        const tooltip = document.getElementById('resource-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Método para garantir que apenas um tipo de informação seja exibido por vez
    clearAllInfoDisplays() {
        // Limpar tooltips de hover
        if (this.gameManager) {
            this.gameManager.hideHoverInfo();
            this.gameManager.hideTerrainInfo();
        }

        // Limpar painel de seleção se não há seleção ativa
        if (!this.gameManager || !this.gameManager.selectedBuilding) {
            this.clearBuildingSelectionInfo();
        }
    }

    // ===== BUILDING PLACEMENT FEEDBACK =====
    updateBuildingPlacementFeedback(message, isValid) {
        try {
            // Find or create placement feedback element
            let feedbackElement = document.getElementById('building-placement-feedback');

            if (!feedbackElement) {
                feedbackElement = document.createElement('div');
                feedbackElement.id = 'building-placement-feedback';
                feedbackElement.className = 'building-placement-feedback';
                document.body.appendChild(feedbackElement);
            }

            // Update content and styling
            feedbackElement.textContent = message;
            feedbackElement.className = `building-placement-feedback ${isValid ? 'valid' : 'invalid'}`;
            feedbackElement.style.display = 'block';

            // Position near the bottom center of the screen
            feedbackElement.style.position = 'fixed';
            feedbackElement.style.bottom = '120px';
            feedbackElement.style.left = '50%';
            feedbackElement.style.transform = 'translateX(-50%)';
            feedbackElement.style.zIndex = '1000';
            feedbackElement.style.padding = '10px 20px';
            feedbackElement.style.borderRadius = '8px';
            feedbackElement.style.fontSize = '14px';
            feedbackElement.style.fontWeight = 'bold';
            feedbackElement.style.pointerEvents = 'none';
            feedbackElement.style.transition = 'all 0.3s ease';

            if (isValid) {
                feedbackElement.style.backgroundColor = 'rgba(0, 150, 0, 0.9)';
                feedbackElement.style.color = 'white';
                feedbackElement.style.border = '2px solid #00aa00';
            } else {
                feedbackElement.style.backgroundColor = 'rgba(200, 0, 0, 0.9)';
                feedbackElement.style.color = 'white';
                feedbackElement.style.border = '2px solid #cc0000';
            }

        } catch (error) {
            console.warn('⚠️ Error updating building placement feedback:', error);
        }
    }

    hideBuildingPlacementFeedback() {
        const feedbackElement = document.getElementById('building-placement-feedback');
        if (feedbackElement) {
            feedbackElement.style.display = 'none';
        }
    }

    // ===== ENHANCED MOBILE TOUCH SUPPORT =====
    setupMobileTouchSupport() {
        console.log('📱 Setting up enhanced mobile touch support...');

        // Add touch event listeners to all interactive elements
        const interactiveElements = document.querySelectorAll(
            '.resource-item, .building-item, .category-btn, .control-btn, .mission-objective, button'
        );

        interactiveElements.forEach(element => {
            // Add touch feedback
            element.addEventListener('touchstart', (e) => {
                element.style.transform = 'scale(0.95)';
                element.style.transition = 'transform 0.1s ease';
            }, { passive: true });

            element.addEventListener('touchend', (e) => {
                element.style.transform = '';
                element.style.transition = 'transform 0.2s ease';
            }, { passive: true });

            element.addEventListener('touchcancel', (e) => {
                element.style.transform = '';
                element.style.transition = 'transform 0.2s ease';
            }, { passive: true });
        });

        // Enhanced touch support for canvas interactions
        if (this.gameManager && this.gameManager.canvas) {
            this.gameManager.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                // Convert touch to mouse event for building placement
                if (this.gameManager.buildMode) {
                    const touch = e.touches[0];
                    const rect = this.gameManager.canvas.getBoundingClientRect();
                    const mouseEvent = new MouseEvent('mousemove', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                    });
                    this.gameManager.handleBuildingPreviewMouseMove(mouseEvent);
                }
            }, { passive: false });

            this.gameManager.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                // Convert touch to mouse click for building placement
                if (this.gameManager.buildMode && e.changedTouches.length > 0) {
                    const touch = e.changedTouches[0];
                    const mouseEvent = new MouseEvent('click', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                    });
                    this.gameManager.handleBuildingPlacementClick(mouseEvent);
                }
            }, { passive: false });
        }

        console.log('✅ Enhanced mobile touch support initialized');
    }

    // ===== MISSION OBJECTIVE CLICK HANDLERS =====
    setupMissionObjectiveHandlers() {
        console.log('🎯 Setting up mission objective click handlers...');

        // Add click handlers to mission objectives
        document.addEventListener('click', (e) => {
            if (e.target.closest('.mission-objective')) {
                const objective = e.target.closest('.mission-objective');
                this.handleMissionObjectiveClick(objective);
            }
        });

        console.log('✅ Mission objective click handlers initialized');
    }

    handleMissionObjectiveClick(objectiveElement) {
        try {
            // Get objective data
            const objectiveText = objectiveElement.textContent;

            // Check if it's a building objective
            if (objectiveText.includes('Construa') || objectiveText.includes('edifício')) {
                // Open building panel
                this.gameManager.uiManager.selectCategory('water');

                // Show helpful notification
                this.showNotification(
                    '🏗️ Painel de construção aberto! Selecione um edifício para construir.',
                    'info',
                    4000
                );

                // Audio feedback
                if (typeof AudioManager !== 'undefined') {
                    AudioManager.playSound('sfx_click', 0.6);
                }

                console.log('🎯 Mission objective clicked: opened building panel');
            }

        } catch (error) {
            console.warn('⚠️ Error handling mission objective click:', error);
        }
    }

    // ===== CONTROL BUTTON ENHANCEMENTS =====
    setupControlButtonEnhancements() {
        console.log('🎮 Setting up control button enhancements...');

        // Enhanced pause button
        const pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (this.gameManager.gameState === 'playing') {
                    this.gameManager.pauseGame();
                    this.showNotification('⏸️ Jogo pausado', 'info', 2000);
                } else if (this.gameManager.gameState === 'paused') {
                    this.gameManager.resumeGame();
                    this.showNotification('▶️ Jogo retomado', 'info', 2000);
                }
                AudioManager.playSound('sfx_click', 0.8);
            });
        }

        // Enhanced speed buttons
        ['btn-speed-1x', 'btn-speed-2x', 'btn-speed-3x'].forEach((btnId, index) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    const speed = index + 1;
                    this.gameManager.setTimeScale(speed);
                    this.showNotification(`⚡ Velocidade: ${speed}x`, 'info', 2000);
                    AudioManager.playSound('sfx_click', 0.6);
                });
            }
        });

        // Enhanced help button
        const helpBtn = document.getElementById('btn-help');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.showHelpModal();
                AudioManager.playSound('sfx_click', 0.8);
            });
        }

        // Enhanced missions button
        const missionsBtn = document.getElementById('btn-missions');
        if (missionsBtn) {
            missionsBtn.addEventListener('click', () => {
                if (this.gameManager.questSystem) {
                    this.gameManager.questSystem.openMissionInterface();
                    AudioManager.playSound('sfx_click', 0.8);
                }
            });
        }

        console.log('✅ Control button enhancements initialized');
    }

    // ===== TERRAIN INFORMATION DISPLAY =====
    showTerrainInfo(gridX, gridZ, terrainType) {
        try {
            // Clear any existing panels
            this.closeCurrentPanel();

            // Create terrain info content
            const terrainDescriptions = {
                'grassland': {
                    name: 'Pastagem',
                    description: 'Terra fértil ideal para construção de edifícios residenciais e comerciais',
                    buildable: true,
                    icon: '🌿'
                },
                'lowland': {
                    name: 'Planície',
                    description: 'Terreno baixo adequado para edifícios e infraestrutura',
                    buildable: true,
                    icon: '🏞️'
                },
                'water': {
                    name: 'Corpo d\'água',
                    description: 'Fonte natural de água. Não é possível construir aqui',
                    buildable: false,
                    icon: '💧'
                },
                'highland': {
                    name: 'Terreno Elevado',
                    description: 'Terreno elevado com boa vista, ideal para edifícios especiais',
                    buildable: true,
                    icon: '⛰️'
                },
                'mountain': {
                    name: 'Montanha',
                    description: 'Terreno montanhoso. Não é possível construir aqui',
                    buildable: false,
                    icon: '🏔️'
                }
            };

            const terrain = terrainDescriptions[terrainType] || {
                name: 'Terreno Desconhecido',
                description: 'Tipo de terreno não identificado',
                buildable: false,
                icon: '❓'
            };

            let detailsHTML = `
                <div class="terrain-info-panel">
                    <h4>${terrain.icon} Informações do Terreno</h4>
                    <div class="terrain-details">
                        <div class="terrain-header">
                            <h5>${terrain.name}</h5>
                            <span class="terrain-coords">Posição: (${gridX}, ${gridZ})</span>
                        </div>
                        <p class="terrain-description">${terrain.description}</p>
                        <div class="terrain-properties">
                            <div class="property">
                                <span class="property-label">Construível:</span>
                                <span class="property-value ${terrain.buildable ? 'positive' : 'negative'}">
                                    ${terrain.buildable ? '✅ Sim' : '❌ Não'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Show in details panel
            this.elements.detailsContent.innerHTML = detailsHTML;
            this.elements.detailsPanel.style.display = 'flex';
            this.uiState.currentOpenPanel = 'terrain';

            // Audio feedback
            if (typeof AudioManager !== 'undefined') {
                AudioManager.playSound('sfx_click', 0.4);
            }

            console.log(`🌍 Terrain info displayed: ${terrain.name} at (${gridX}, ${gridZ})`);

        } catch (error) {
            console.warn('⚠️ Error showing terrain info:', error);
        }
    }

    // ===== TERRAIN INFORMATION CLEANUP =====
    hideTerrainInfo() {
        try {
            // Clear terrain info from details panel
            if (this.elements.detailsContent) {
                this.elements.detailsContent.innerHTML = '<p>Selecione um item para ver detalhes</p>';
            }

            // Hide details panel if it was showing terrain info
            if (this.elements.detailsPanel && this.uiState.currentOpenPanel === 'terrain') {
                this.elements.detailsPanel.style.display = 'none';
            }

            // Clear panel state
            if (this.uiState.currentOpenPanel === 'terrain') {
                this.uiState.currentOpenPanel = null;
            }

            console.log('🌍 Terrain info hidden');

        } catch (error) {
            console.warn('⚠️ Error hiding terrain info:', error);
        }
    }
}

// Exportar para escopo global
window.UIManager = UIManager;
console.log('🖥️ UIManager carregado e exportado para window.UIManager');
