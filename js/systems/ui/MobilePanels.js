/**
 * UIManager — Controles, HUD e painéis do mobile
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
    createMobileControls() {
        if (!this.isMobile) return;

        // Remove existing mobile controls
        document.querySelectorAll('.mobile-toggle').forEach(btn => btn.remove());
        document.querySelectorAll('.mobile-top-toggle').forEach(btn => btn.remove());

        // ===== BOTTOM TOGGLES (Building and Information Panels) =====
        // Criar botões de toggle para mobile (bottom)
        const leftToggle = document.createElement('button');
        leftToggle.className = 'mobile-toggle left';
        leftToggle.innerHTML = '🏗️';
        leftToggle.title = 'Abrir painel de construção';

        // Add both click and touch event handlers
        const leftToggleHandler = (e) => {
            e.preventDefault();
            this.toggleMobilePanel('left');
        };
        leftToggle.addEventListener('click', leftToggleHandler);
        leftToggle.addEventListener('touchend', leftToggleHandler, { passive: false });

        document.body.appendChild(leftToggle);

        const rightToggle = document.createElement('button');
        rightToggle.className = 'mobile-toggle right';
        rightToggle.innerHTML = 'ℹ️';
        rightToggle.title = 'Abrir painel de informações';

        // ===== SELECTION COUNTER BADGE =====
        const selectionBadge = document.createElement('span');
        selectionBadge.className = 'selection-counter-badge';
        selectionBadge.style.display = 'none'; // Hidden by default
        selectionBadge.textContent = '0';
        rightToggle.appendChild(selectionBadge);

        // Add both click and touch event handlers
        const rightToggleHandler = (e) => {
            e.preventDefault();
            this.toggleMobilePanel('right');
        };
        rightToggle.addEventListener('click', rightToggleHandler);
        rightToggle.addEventListener('touchend', rightToggleHandler, { passive: false });

        document.body.appendChild(rightToggle);

        // ===== TOP TOGGLES (Resource Panel and Control Buttons) =====
        // Create toggle button for resource-panel
        const resourceToggle = document.createElement('button');
        resourceToggle.className = 'mobile-top-toggle resource-toggle';
        resourceToggle.innerHTML = '📊';
        resourceToggle.title = 'Mostrar/Ocultar recursos';

        const resourceToggleHandler = (e) => {
            e.preventDefault();
            this.toggleTopHudElement('resource-panel');
        };
        resourceToggle.addEventListener('click', resourceToggleHandler);
        resourceToggle.addEventListener('touchend', resourceToggleHandler, { passive: false });

        // Create toggle button for control-buttons
        const controlToggle = document.createElement('button');
        controlToggle.className = 'mobile-top-toggle control-toggle';
        controlToggle.innerHTML = '⚙️';
        controlToggle.title = 'Mostrar/Ocultar controles';

        const controlToggleHandler = (e) => {
            e.preventDefault();
            this.toggleTopHudElement('control-buttons');
        };
        controlToggle.addEventListener('click', controlToggleHandler);
        controlToggle.addEventListener('touchend', controlToggleHandler, { passive: false });

        // Add top toggles to hud-top
        const hudTop = document.querySelector('.hud-top');
        if (hudTop) {
            hudTop.appendChild(resourceToggle);
        }

        // Store references for later updates
        this.mobileToggleButtons = {
            left: leftToggle,
            right: rightToggle,
            resource: resourceToggle,
            control: controlToggle
        };

        // Initialize top HUD elements as hidden on mobile
        this.initializeTopHudVisibility();

        // Create mobile panel headers for hud-right
        this.createMobilePanelHeaders();

        // ===== MOBILE BOTTOM HUD TOGGLE =====
        this.createMobileBottomHudToggle();
    },

    createMobileBottomHudToggle() {
        if (!this.isMobile) return;

        // Remove existing toggle if any
        const existingToggle = document.querySelector('.hud-bottom-toggle');
        if (existingToggle) existingToggle.remove();

        // Create toggle button
        const hudBottomToggle = document.createElement('button');
        hudBottomToggle.className = 'hud-bottom-toggle';
        hudBottomToggle.innerHTML = '▲'; // Up arrow (collapsed state)
        hudBottomToggle.title = 'Mostrar/Ocultar informações de missão';

        // Track state
        this.hudBottomExpanded = false;

        // Toggle handler
        const toggleHandler = (e) => {
            e.preventDefault();
            this.toggleMobileBottomHud();
        };

        hudBottomToggle.addEventListener('click', toggleHandler);
        hudBottomToggle.addEventListener('touchend', toggleHandler, { passive: false });

        document.body.appendChild(hudBottomToggle);

        // Store reference
        this.hudBottomToggleButton = hudBottomToggle;

        log('📱 Mobile bottom HUD toggle created');
    },

    toggleMobileBottomHud() {
        if (!this.isMobile) return;

        const hudBottom = document.querySelector('.hud-bottom');
        const toggleButton = this.hudBottomToggleButton;

        if (!hudBottom || !toggleButton) return;

        this.hudBottomExpanded = !this.hudBottomExpanded;

        if (this.hudBottomExpanded) {
            // Expand
            hudBottom.classList.add('expanded');
            toggleButton.classList.add('expanded');
            toggleButton.innerHTML = '▼'; // Down arrow (expanded state)
            log('📱 Mobile bottom HUD expanded');
        } else {
            // Collapse
            hudBottom.classList.remove('expanded');
            toggleButton.classList.remove('expanded');
            toggleButton.innerHTML = '▲'; // Up arrow (collapsed state)
            log('📱 Mobile bottom HUD collapsed');
        }
    },

    /**
     * Toggle visibility of top HUD elements (resource-panel or control-buttons)
     * @param {string} elementClass - The class name of the element to toggle
     */
    toggleTopHudElement(elementClass) {
        if (!this.isMobile) return;

        const element = document.querySelector(`.${elementClass}`);
        if (!element) return;

        const isVisible = element.classList.contains('mobile-visible');

        if (isVisible) {
            element.classList.remove('mobile-visible');
            // Update toggle button state
            const toggleBtn = elementClass === 'resource-panel' ?
                this.mobileToggleButtons.resource :
                this.mobileToggleButtons.control;
            if (toggleBtn) {
                toggleBtn.classList.remove('active');
            }
        } else {
            element.classList.add('mobile-visible');
            // Update toggle button state
            const toggleBtn = elementClass === 'resource-panel' ?
                this.mobileToggleButtons.resource :
                this.mobileToggleButtons.control;
            if (toggleBtn) {
                toggleBtn.classList.add('active');
            }
        }
    },

    /**
     * Initialize top HUD elements visibility on mobile
     */
    initializeTopHudVisibility() {
        if (!this.isMobile) return;

        const resourcePanel = document.querySelector('.resource-panel');
        const controlButtons = document.querySelector('.control-buttons');

        // Hide both by default on mobile
        if (resourcePanel) {
            resourcePanel.classList.remove('mobile-visible');
        }
        if (controlButtons) {
            controlButtons.classList.remove('mobile-visible');
        }
    },

    /**
     * Shows mobile building details modal with "Construir" button
     * @param {Object} buildingType - The building type object
     * @param {string} buildingTypeId - The building type ID
     */
    showMobileBuildingDetailsModal(buildingType, buildingTypeId) {
        log('📱 Opening mobile building details modal:', buildingType.name);

        // Open the right panel (details panel)
        const hudRight = document.querySelector('.hud-right');
        if (!hudRight) return;

        // Show the panel
        this.mobilePanelsVisible.right = true;
        hudRight.classList.add('active');

        // Update toggle button state
        if (this.mobileToggleButtons && this.mobileToggleButtons.right) {
            this.mobileToggleButtons.right.classList.add('active');
        }

        // Build the details content
        const detailsContent = this.elements.detailsContent;
        if (!detailsContent) return;

        // Check if player can afford the building
        const currentBudget = this.gameManager.resourceManager.resources.budget.current;
        const canAfford = currentBudget >= buildingType.cost;

        detailsContent.innerHTML = `
            <div class="mobile-building-details">
                <div class="building-header">
                    <div class="building-icon-large">${buildingType.icon || '🏗️'}</div>
                    <h2>${buildingType.name}</h2>
                </div>

                <div class="building-description">
                    <p>${buildingType.description || 'Sem descrição disponível'}</p>
                </div>

                <div class="building-stats-mobile">
                    <div class="stat-item">
                        <span class="stat-label">💰 Custo:</span>
                        <span class="stat-value ${!canAfford ? 'critical' : ''}">R$ ${buildingType.cost.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🔧 Manutenção:</span>
                        <span class="stat-value">R$ ${buildingType.maintenanceCost}/min</span>
                    </div>
                    ${buildingType.waterProduction ? `
                        <div class="stat-item">
                            <span class="stat-label">💧 Produção de Água:</span>
                            <span class="stat-value">${buildingType.waterProduction}L/s</span>
                        </div>
                    ` : ''}
                    ${buildingType.pollutionReduction ? `
                        <div class="stat-item">
                            <span class="stat-label">🌿 Redução de Poluição:</span>
                            <span class="stat-value">${buildingType.pollutionReduction}%</span>
                        </div>
                    ` : ''}
                    ${buildingType.powerGeneration ? `
                        <div class="stat-item">
                            <span class="stat-label">⚡ Geração de Energia:</span>
                            <span class="stat-value">${buildingType.powerGeneration} MW</span>
                        </div>
                    ` : ''}
                    ${buildingType.powerConsumption ? `
                        <div class="stat-item">
                            <span class="stat-label">🔌 Consumo de Energia:</span>
                            <span class="stat-value">${buildingType.powerConsumption} MW</span>
                        </div>
                    ` : ''}
                </div>

                ${buildingType.requirements && buildingType.requirements.nearWater ? `
                    <div class="building-requirements">
                        <h4>📋 Requisitos Especiais</h4>
                        <ul>
                            <li>💧 Deve estar próximo à água</li>
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;

        // Create and add the "Construir" button
        const existingBtn = hudRight.querySelector('.mobile-build-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        const buildBtn = document.createElement('button');
        buildBtn.className = `mobile-build-btn ${!canAfford ? 'disabled' : ''}`;
        buildBtn.innerHTML = `<span>🏗️</span> Construir`;
        buildBtn.disabled = !canAfford;

        buildBtn.addEventListener('click', () => {
            if (!canAfford) {
                this.showNotification('❌ Dinheiro insuficiente!', 'error', 3000);
                AudioManager.playSound('sfx_build_error', 0.6);
                return;
            }

            // Close both mobile panels (right info panel and left building panel)
            this.closeMobilePanel('right');
            this.closeMobilePanel('left');

            // Enter build mode
            this.gameManager.enterBuildMode(buildingTypeId);

            // Update UI state
            this.updatePanelState('construction'); // FIX: Use updatePanelState
            this.uiState.selectedBuilding = buildingTypeId;

            log('🏗️ Entering build mode from mobile modal - panels closed');
        });

        hudRight.appendChild(buildBtn);

        // Add escape key listener
        this.addMobileEscapeListener();
    },

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

            // Add both click and touch event handlers
            const closeBtnHandler = (e) => {
                e.preventDefault();
                this.closeMobilePanel('right');
            };
            closeBtn.addEventListener('click', closeBtnHandler);
            closeBtn.addEventListener('touchend', closeBtnHandler, { passive: false });

            mobileHeader.appendChild(title);
            mobileHeader.appendChild(closeBtn);

            // Insert at the beginning of details panel
            detailsPanel.insertBefore(mobileHeader, detailsPanel.firstChild);
        }
    },

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

                // ===== PANEL SEPARATION: Hide control-buttons when right panel is open =====
                if (side === 'right') {
                    const controlButtons = document.querySelector('.control-buttons');
                    if (controlButtons) {
                        controlButtons.classList.remove('mobile-visible');
                    }
                    // Update control toggle button state
                    if (this.mobileToggleButtons && this.mobileToggleButtons.control) {
                        this.mobileToggleButtons.control.classList.remove('active');
                    }
                }

                // Add escape key listener for mobile panels
                this.addMobileEscapeListener();
            }
        }
    },

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

            // If closing right panel (info), remove build button
            if (side === 'right') {
                // Remove mobile build button if it exists
                const mobileBuildBtn = document.querySelector('.mobile-build-btn');
                if (mobileBuildBtn) {
                    mobileBuildBtn.remove();
                }
            }

            // Remove escape listener if no panels are open
            if (!this.mobilePanelsVisible.left && !this.mobilePanelsVisible.right) {
                this.removeMobileEscapeListener();
            }
        }
    },

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

        // Hide resource panel
        const resourcePanel = document.querySelector('.resource-panel');
        if (resourcePanel) {
            resourcePanel.classList.remove('mobile-active');
        }

        // Remove mobile build button if it exists
        const mobileBuildBtn = document.querySelector('.mobile-build-btn');
        if (mobileBuildBtn) {
            mobileBuildBtn.remove();
        }

        this.removeMobileEscapeListener();
    },

    addMobileEscapeListener() {
        if (!this.mobileEscapeListener) {
            this.mobileEscapeListener = (event) => {
                if (event.key === 'Escape') {
                    this.closeAllMobilePanels();
                }
            };
            document.addEventListener('keydown', this.mobileEscapeListener);
        }
    },

    removeMobileEscapeListener() {
        if (this.mobileEscapeListener) {
            document.removeEventListener('keydown', this.mobileEscapeListener);
            this.mobileEscapeListener = null;
        }
    },

    cleanupMobileControls() {
        // Remove mobile controls
        document.querySelectorAll('.mobile-toggle').forEach(btn => btn.remove());

        // Remove mobile bottom HUD toggle
        const hudBottomToggle = document.querySelector('.hud-bottom-toggle');
        if (hudBottomToggle) hudBottomToggle.remove();

        // Remove mobile panel headers
        document.querySelectorAll('.mobile-panel-header').forEach(header => header.remove());

        // Reset mobile state
        this.mobilePanelsVisible = { left: false, right: false };
        this.mobileToggleButtons = null;
        this.hudBottomToggleButton = null;
        this.hudBottomExpanded = false;
        this.removeMobileEscapeListener();

        // Remove active classes from panels
        document.querySelectorAll('.hud-left, .hud-right').forEach(panel => {
            panel.classList.remove('active');
        });

        // Remove expanded class from hud-bottom
        const hudBottom = document.querySelector('.hud-bottom');
        if (hudBottom) hudBottom.classList.remove('expanded');
    },
});
