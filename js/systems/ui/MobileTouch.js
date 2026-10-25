/**
 * UIManager — Toque no mobile (segurar, multisseleção)
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
    // ===== ENHANCED MOBILE TOUCH SUPPORT =====
    setupMobileTouchSupport() {
        log('📱 Setting up enhanced mobile touch support...');

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
            // Store touch start position to detect taps vs drags
            let touchStartPos = null;
            let touchStartTime = 0;
            let touchHoldTimer = null;
            let multiSelectTimer = null;
            let isHoldingForInfo = false;
            let isMultiSelectMode = false;
            let multiSelectStartPos = null;
            let touchIndicatorTimer = null;
            let holdCompletedForTerrain = false; // Track if 500ms hold completed for terrain

            this.gameManager.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();

                const touch = e.touches[0];
                touchStartPos = { x: touch.clientX, y: touch.clientY };
                touchStartTime = Date.now();
                isHoldingForInfo = false;
                isMultiSelectMode = false;
                holdCompletedForTerrain = false;

                // Clear any existing timers
                if (touchHoldTimer) clearTimeout(touchHoldTimer);
                if (multiSelectTimer) clearTimeout(multiSelectTimer);
                if (touchIndicatorTimer) clearTimeout(touchIndicatorTimer);

                // ===== VISUAL FEEDBACK: Show circular loading indicator after 250ms =====
                touchIndicatorTimer = setTimeout(() => {
                    const currentPos = { x: touch.clientX, y: touch.clientY };
                    const distance = Math.sqrt(
                        Math.pow(currentPos.x - touchStartPos.x, 2) +
                        Math.pow(currentPos.y - touchStartPos.y, 2)
                    );

                    // Only show indicator if finger hasn't moved much (< 10px)
                    if (distance < 10) {
                        this.showTouchHoldIndicator(touch.clientX, touch.clientY);
                    }
                }, 250);

                // Set up 500ms timer for info display
                touchHoldTimer = setTimeout(() => {
                    const currentPos = { x: touch.clientX, y: touch.clientY };
                    const distance = Math.sqrt(
                        Math.pow(currentPos.x - touchStartPos.x, 2) +
                        Math.pow(currentPos.y - touchStartPos.y, 2)
                    );

                    // Only process if finger hasn't moved much (< 10px)
                    if (distance < 10) {
                        isHoldingForInfo = true;

                        // Check what we're touching
                        const pickResult = this.gameManager.pickBuildingFirst(touch.clientX, touch.clientY);

                        if (pickResult && pickResult.hit &&
                            pickResult.pickedMesh &&
                            pickResult.pickedMesh.metadata &&
                            pickResult.pickedMesh.metadata.buildingId) {
                            // Touching a building - show info immediately
                            this.showTouchHoldInfo(touch.clientX, touch.clientY);
                        } else {
                            // Touching terrain - just mark that hold completed, show info on release
                            holdCompletedForTerrain = true;
                        }

                        // ===== VISUAL FEEDBACK: Pulse effect at 500ms =====
                        this.pulseTouchHoldIndicator();
                    }
                }, 500);

                // Set up 1500ms timer for multi-selection mode
                multiSelectTimer = setTimeout(() => {
                    const currentPos = { x: touch.clientX, y: touch.clientY };
                    const distance = Math.sqrt(
                        Math.pow(currentPos.x - touchStartPos.x, 2) +
                        Math.pow(currentPos.y - touchStartPos.y, 2)
                    );

                    // Only activate multi-select if finger hasn't moved much (< 10px)
                    if (distance < 10) {
                        isMultiSelectMode = true;
                        multiSelectStartPos = { x: touch.clientX, y: touch.clientY };
                        // ===== VISUAL FEEDBACK: Complete circle at 1500ms =====
                        this.completeTouchHoldIndicator();
                        this.startMultiSelectMode(touch.clientX, touch.clientY);
                    }
                }, 1500);

                // Convert touch to mouse event for building placement preview
                if (this.gameManager.buildMode) {
                    const mouseEvent = new MouseEvent('mousemove', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                    });
                    this.gameManager.handleBuildingPreviewMouseMove(mouseEvent);
                }
            }, { passive: false });

            this.gameManager.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();

                if (e.touches.length === 0) return;
                const touch = e.touches[0];

                // Calculate movement distance
                const distance = touchStartPos ?
                    Math.sqrt(
                        Math.pow(touch.clientX - touchStartPos.x, 2) +
                        Math.pow(touch.clientY - touchStartPos.y, 2)
                    ) : 0;

                // If moved more than 10px, cancel hold timers (user is dragging)
                if (distance > 10) {
                    if (touchHoldTimer) {
                        clearTimeout(touchHoldTimer);
                        touchHoldTimer = null;
                    }
                    if (multiSelectTimer) {
                        clearTimeout(multiSelectTimer);
                        multiSelectTimer = null;
                    }
                    if (touchIndicatorTimer) {
                        clearTimeout(touchIndicatorTimer);
                        touchIndicatorTimer = null;
                    }
                    this.hideTouchHoldInfo();
                    this.hideTouchHoldIndicator();
                }

                // Update multi-select rectangle if in multi-select mode
                if (isMultiSelectMode && multiSelectStartPos) {
                    this.updateMultiSelectRectangle(
                        multiSelectStartPos.x,
                        multiSelectStartPos.y,
                        touch.clientX,
                        touch.clientY
                    );
                }

                // Update building preview position during drag
                if (this.gameManager.buildMode) {
                    const mouseEvent = new MouseEvent('mousemove', {
                        clientX: touch.clientX,
                        clientY: touch.clientY
                    });
                    this.gameManager.handleBuildingPreviewMouseMove(mouseEvent);
                }
            }, { passive: false });

            this.gameManager.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();

                // Clear timers
                if (touchHoldTimer) {
                    clearTimeout(touchHoldTimer);
                    touchHoldTimer = null;
                }
                if (multiSelectTimer) {
                    clearTimeout(multiSelectTimer);
                    multiSelectTimer = null;
                }
                if (touchIndicatorTimer) {
                    clearTimeout(touchIndicatorTimer);
                    touchIndicatorTimer = null;
                }

                // Hide visual indicator
                this.hideTouchHoldIndicator();

                if (e.changedTouches.length === 0) return;

                const touch = e.changedTouches[0];
                const touchEndPos = { x: touch.clientX, y: touch.clientY };
                const touchDuration = Date.now() - touchStartTime;

                // Calculate distance moved
                const distance = touchStartPos ?
                    Math.sqrt(
                        Math.pow(touchEndPos.x - touchStartPos.x, 2) +
                        Math.pow(touchEndPos.y - touchStartPos.y, 2)
                    ) : 0;

                // Handle multi-select mode completion
                if (isMultiSelectMode && multiSelectStartPos) {
                    this.completeMultiSelect(
                        multiSelectStartPos.x,
                        multiSelectStartPos.y,
                        touch.clientX,
                        touch.clientY
                    );
                    isMultiSelectMode = false;
                    multiSelectStartPos = null;
                } else if (isHoldingForInfo) {
                    // If hold was for terrain, show info now on release
                    if (holdCompletedForTerrain) {
                        this.showTouchHoldInfo(touch.clientX, touch.clientY);
                        holdCompletedForTerrain = false;
                    } else {
                        // Building info was already shown, just hide the tooltip
                        this.hideTouchHoldInfo();
                    }
                    isHoldingForInfo = false;
                } else {
                    // Only trigger click if it's a tap (short duration, minimal movement)
                    // Reduced threshold from 300ms to 250ms to match camera controls and improve responsiveness
                    const isTap = touchDuration < 250 && distance < 10;

                    if (isTap) {
                        log(`👆 Tap detected: duration=${touchDuration}ms, distance=${distance.toFixed(1)}px`);

                        // Create a proper pointer event for Babylon.js
                        const pointerEvent = new PointerEvent('pointerdown', {
                            clientX: touch.clientX,
                            clientY: touch.clientY,
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            pointerId: 1,
                            pointerType: 'touch'
                        });

                        if (this.gameManager.buildMode) {
                            // Building placement mode
                            const mouseEvent = new MouseEvent('click', {
                                clientX: touch.clientX,
                                clientY: touch.clientY,
                                bubbles: true,
                                cancelable: true
                            });
                            this.gameManager.handleBuildingPlacementClick(mouseEvent);
                        } else {
                            // Normal mode - check if we tapped on a building
                            const pickResult = this.gameManager.pickBuildingFirst(touch.clientX, touch.clientY);

                            if (pickResult && pickResult.hit &&
                                pickResult.pickedMesh &&
                                pickResult.pickedMesh.metadata &&
                                pickResult.pickedMesh.metadata.buildingId) {

                                // Tapped on a building - use GameManager's selectBuilding for full aura effect
                                const buildingId = pickResult.pickedMesh.metadata.buildingId;
                                const building = this.gameManager.buildingSystem.buildings.get(buildingId);

                                if (building) {
                                    // ===== FIX: Call GameManager.selectBuilding to trigger aura effect =====
                                    this.gameManager.selectBuilding(building, { sound: true });
                                    log(`🏢 Building selected via tap with aura: ${building.config.name}`);
                                }
                            } else if (this.gameManager.treeSystem?.selectAt(touch.clientX, touch.clientY)) {
                                log('🌳 Árvore nativa selecionada via toque');
                            } else {
                                // Trigger Babylon.js scene picking for terrain/other interactions
                                this.gameManager.canvas.dispatchEvent(pointerEvent);

                                // Also dispatch pointerup for complete interaction
                                const pointerUpEvent = new PointerEvent('pointerup', {
                                    clientX: touch.clientX,
                                    clientY: touch.clientY,
                                    bubbles: true,
                                    cancelable: true,
                                    view: window,
                                    pointerId: 1,
                                    pointerType: 'touch'
                                });
                                this.gameManager.canvas.dispatchEvent(pointerUpEvent);
                            }
                        }
                    } else {
                        log(`❌ Not a tap: duration=${touchDuration}ms, distance=${distance.toFixed(1)}px`);
                    }
                }

                // Reset touch tracking
                touchStartPos = null;
                touchStartTime = 0;
            }, { passive: false });
        }

        log('✅ Enhanced mobile touch support initialized');
    },

    // ===== TOUCH-AND-HOLD INFO DISPLAY (500ms) =====
    showTouchHoldInfo(clientX, clientY) {
        // Get pick info from Babylon.js scene
        const pickResult = this.gameManager.pickBuildingFirst(clientX, clientY);

        if (!pickResult || !pickResult.hit) {
            return;
        }

        let infoText = '';
        let infoTitle = '';

        // Check if we hit a building
        if (pickResult.pickedMesh && pickResult.pickedMesh.metadata && pickResult.pickedMesh.metadata.buildingId) {
            const buildingId = pickResult.pickedMesh.metadata.buildingId;
            const building = this.gameManager.buildingSystem.buildings.get(buildingId);

            if (building) {
                // ===== FIX: Use GameManager.selectBuilding to trigger aura effect =====
                this.gameManager.selectBuilding(building, { sound: true });

                // Also show a quick tooltip for immediate feedback
                infoTitle = building.config.name;
                infoText = `Tipo: ${building.config.category}\n`;
                if (building.config.waterProduction) {
                    infoText += `💧 Produção: ${building.config.waterProduction}L/min\n`;
                }
                if (building.config.energyConsumption) {
                    infoText += `⚡ Consumo: ${building.config.energyConsumption}MW\n`;
                }
                if (building.config.maintenanceCost) {
                    infoText += `🔧 Manutenção: R$ ${building.config.maintenanceCost}/min`;
                }

                this.displayTouchTooltip(clientX, clientY, infoTitle, infoText);
                return;
            }
        } else if (pickResult.pickedPoint) {
            // Hit terrain
            const gridPos = this.gameManager.pickTerrainCell(clientX, clientY) ||
                this.gameManager.gridManager.worldToGrid(pickResult.pickedPoint);
            const terrainType = this.gameManager.gridManager.getTerrainType(gridPos.x, gridPos.z);
            const elevation = this.gameManager.gridManager.getElevation(gridPos.x, gridPos.z);
            const isOccupied = this.gameManager.gridManager.isCellOccupied(gridPos.x, gridPos.z);

            const terrainNames = {
                'water': '💧 Água',
                'grassland': '🌿 Campo',
                'lowland': '🏞️ Planície',
                'hill': '⛰️ Colina',
                'mountain': '🏔️ Montanha'
            };

            infoTitle = terrainNames[terrainType] || terrainType;
            infoText = `Elevação: ${(elevation * 100).toFixed(0)}%\n`;
            infoText += `Posição: (${gridPos.x}, ${gridPos.z})\n`;
            infoText += isOccupied ? '❌ Ocupado' : '✅ Disponível';
        }

        if (infoTitle || infoText) {
            this.displayTouchTooltip(clientX, clientY, infoTitle, infoText);
        }
    },

    displayTouchTooltip(x, y, title, text) {
        // Remove existing tooltip and clear any existing timeout
        this.hideTouchHoldInfo();

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.id = 'touch-hold-tooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.left = `${x + 20}px`;
        tooltip.style.top = `${y - 60}px`;
        tooltip.style.background = 'linear-gradient(135deg, rgba(45, 53, 97, 0.98) 0%, rgba(26, 31, 58, 0.98) 100%)';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '12px 16px';
        tooltip.style.borderRadius = '12px';
        tooltip.style.fontSize = '0.85rem';
        tooltip.style.fontWeight = '600';
        tooltip.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.5), 0 0 20px rgba(100, 100, 255, 0.4)';
        tooltip.style.border = '2px solid rgba(100, 100, 255, 0.4)';
        tooltip.style.zIndex = '10000';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.maxWidth = '250px';
        tooltip.style.whiteSpace = 'pre-line';
        tooltip.style.backdropFilter = 'blur(10px)';

        if (title) {
            const titleEl = document.createElement('div');
            titleEl.textContent = title;
            titleEl.style.fontWeight = '700';
            titleEl.style.marginBottom = '8px';
            titleEl.style.fontSize = '1rem';
            titleEl.style.color = '#00ff88';
            tooltip.appendChild(titleEl);
        }

        if (text) {
            const textEl = document.createElement('div');
            textEl.textContent = text;
            textEl.style.fontSize = '0.8rem';
            textEl.style.lineHeight = '1.4';
            tooltip.appendChild(textEl);
        }

        document.body.appendChild(tooltip);

        // Adjust position if tooltip goes off screen
        const rect = tooltip.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            tooltip.style.left = `${x - rect.width - 20}px`;
        }
        if (rect.bottom > window.innerHeight) {
            tooltip.style.top = `${y - rect.height - 20}px`;
        }

        // ===== AUTO-HIDE: Automatically hide tooltip after 5 seconds =====
        if (this.tooltipAutoHideTimer) {
            clearTimeout(this.tooltipAutoHideTimer);
        }

        this.tooltipAutoHideTimer = setTimeout(() => {
            this.hideTouchHoldInfo();
            log('🕐 Touch tooltip auto-hidden after 2 seconds');
        }, 2000);
    },

    hideTouchHoldInfo() {
        // Clear auto-hide timer if it exists
        if (this.tooltipAutoHideTimer) {
            clearTimeout(this.tooltipAutoHideTimer);
            this.tooltipAutoHideTimer = null;
        }

        const tooltip = document.getElementById('touch-hold-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    },

    // ===== TOUCH-AND-HOLD VISUAL INDICATOR =====
    showTouchHoldIndicator(x, y) {
        // Remove existing indicator
        this.hideTouchHoldIndicator();

        // Create circular loading indicator
        const indicator = document.createElement('div');
        indicator.id = 'touch-hold-indicator';
        indicator.style.position = 'fixed';
        indicator.style.left = `${x}px`;
        indicator.style.top = `${y}px`;
        indicator.style.width = '60px';
        indicator.style.height = '60px';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.zIndex = '10000';
        indicator.style.pointerEvents = 'none';

        // Create SVG circle
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '60');
        svg.style.transform = 'rotate(-90deg)'; // Start from top

        // Background circle (full circle, semi-transparent)
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', '30');
        bgCircle.setAttribute('cy', '30');
        bgCircle.setAttribute('r', '25');
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
        bgCircle.setAttribute('stroke-width', '4');

        // Progress circle (animated)
        const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        progressCircle.setAttribute('cx', '30');
        progressCircle.setAttribute('cy', '30');
        progressCircle.setAttribute('r', '25');
        progressCircle.setAttribute('fill', 'none');
        progressCircle.setAttribute('stroke', '#00ff88');
        progressCircle.setAttribute('stroke-width', '4');
        progressCircle.setAttribute('stroke-linecap', 'round');
        progressCircle.setAttribute('stroke-dasharray', '157'); // 2 * PI * 25
        progressCircle.setAttribute('stroke-dashoffset', '157');
        progressCircle.style.filter = 'drop-shadow(0 0 8px rgba(0, 255, 136, 0.8))';
        progressCircle.style.transition = 'stroke-dashoffset 1.25s linear'; // 250ms to 1500ms = 1250ms

        svg.appendChild(bgCircle);
        svg.appendChild(progressCircle);
        indicator.appendChild(svg);
        document.body.appendChild(indicator);

        // Start animation after a brief delay
        requestAnimationFrame(() => {
            progressCircle.style.strokeDashoffset = '0';
        });

        // Store reference for pulse and complete effects
        indicator.progressCircle = progressCircle;
    },

    pulseTouchHoldIndicator() {
        const indicator = document.getElementById('touch-hold-indicator');
        if (!indicator || !indicator.progressCircle) return;

        // Create pulse effect at 500ms
        const pulse = document.createElement('div');
        pulse.style.position = 'absolute';
        pulse.style.left = '50%';
        pulse.style.top = '50%';
        pulse.style.width = '60px';
        pulse.style.height = '60px';
        pulse.style.transform = 'translate(-50%, -50%)';
        pulse.style.borderRadius = '50%';
        pulse.style.background = 'rgba(0, 255, 136, 0.4)';
        pulse.style.animation = 'pulse-effect 0.5s ease-out';

        indicator.appendChild(pulse);

        // Remove pulse after animation
        setTimeout(() => {
            if (pulse.parentNode) {
                pulse.remove();
            }
        }, 500);

        // Add text label for 500ms milestone
        const textLabel = document.createElement('div');
        textLabel.id = 'touch-hold-text-500';
        textLabel.style.position = 'absolute';
        textLabel.style.left = '50%';
        textLabel.style.top = '80px'; // Below the circle
        textLabel.style.transform = 'translateX(-50%)';
        textLabel.style.whiteSpace = 'nowrap';
        textLabel.style.fontSize = '0.75rem';
        textLabel.style.fontWeight = '600';
        textLabel.style.color = '#00ff88';
        textLabel.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.8), 0 2px 4px rgba(0, 0, 0, 0.8)';
        textLabel.style.background = 'rgba(0, 0, 0, 0.7)';
        textLabel.style.padding = '4px 8px';
        textLabel.style.borderRadius = '6px';
        textLabel.style.pointerEvents = 'none';
        textLabel.textContent = 'Solte para informações de terreno';

        indicator.appendChild(textLabel);

        // Add pulse animation to document if not exists
        if (!document.getElementById('pulse-animation-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation-style';
            style.textContent = `
                @keyframes pulse-effect {
                    0% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.6;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },

    completeTouchHoldIndicator() {
        const indicator = document.getElementById('touch-hold-indicator');
        if (!indicator || !indicator.progressCircle) return;

        // Change color to indicate completion
        indicator.progressCircle.setAttribute('stroke', '#ffaa00');
        indicator.progressCircle.style.filter = 'drop-shadow(0 0 12px rgba(255, 170, 0, 1))';

        // Add completion flash effect
        const flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.left = '50%';
        flash.style.top = '50%';
        flash.style.width = '60px';
        flash.style.height = '60px';
        flash.style.transform = 'translate(-50%, -50%)';
        flash.style.borderRadius = '50%';
        flash.style.background = 'rgba(255, 170, 0, 0.6)';
        flash.style.animation = 'flash-effect 0.3s ease-out';

        indicator.appendChild(flash);

        // Remove flash after animation
        setTimeout(() => {
            if (flash.parentNode) {
                flash.remove();
            }
        }, 300);

        // Remove 500ms text label if it exists
        const oldTextLabel = document.getElementById('touch-hold-text-500');
        if (oldTextLabel) {
            oldTextLabel.remove();
        }

        // Add text label for 1500ms milestone
        const textLabel = document.createElement('div');
        textLabel.id = 'touch-hold-text-1500';
        textLabel.style.position = 'absolute';
        textLabel.style.left = '50%';
        textLabel.style.top = '80px'; // Below the circle
        textLabel.style.transform = 'translateX(-50%)';
        textLabel.style.whiteSpace = 'nowrap';
        textLabel.style.fontSize = '0.75rem';
        textLabel.style.fontWeight = '600';
        textLabel.style.color = '#ffaa00';
        textLabel.style.textShadow = '0 0 8px rgba(255, 170, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.8)';
        textLabel.style.background = 'rgba(0, 0, 0, 0.7)';
        textLabel.style.padding = '4px 8px';
        textLabel.style.borderRadius = '6px';
        textLabel.style.pointerEvents = 'none';
        textLabel.textContent = 'Arraste para selecionar construções';

        indicator.appendChild(textLabel);

        // Add flash animation to document if not exists
        if (!document.getElementById('flash-animation-style')) {
            const style = document.createElement('style');
            style.id = 'flash-animation-style';
            style.textContent = `
                @keyframes flash-effect {
                    0% {
                        transform: translate(-50%, -50%) scale(0.8);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1.5);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    },

    hideTouchHoldIndicator() {
        const indicator = document.getElementById('touch-hold-indicator');
        if (indicator) {
            indicator.remove();
        }
    },

    // ===== MULTI-SELECTION MODE (2s HOLD) =====
    startMultiSelectMode(x, y) {
        log('🎯 Multi-select mode activated');

        // Create selection rectangle overlay with orange color to match long-touch indicator
        const selectionRect = document.createElement('div');
        selectionRect.id = 'multi-select-rectangle';
        selectionRect.style.position = 'fixed';
        selectionRect.style.left = `${x}px`;
        selectionRect.style.top = `${y}px`;
        selectionRect.style.width = '0px';
        selectionRect.style.height = '0px';
        selectionRect.style.border = '3px dashed rgba(255, 170, 0, 0.8)';
        selectionRect.style.background = 'rgba(255, 170, 0, 0.2)';
        selectionRect.style.zIndex = '9999';
        selectionRect.style.pointerEvents = 'none';
        selectionRect.style.boxShadow = '0 0 20px rgba(255, 170, 0, 0.6)';

        document.body.appendChild(selectionRect);

        // Show notification
        this.showNotification('🎯 Modo de seleção múltipla ativado! Arraste para selecionar edifícios.', 'info', 3000);
    },

    updateMultiSelectRectangle(startX, startY, currentX, currentY) {
        const selectionRect = document.getElementById('multi-select-rectangle');
        if (!selectionRect) return;

        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        selectionRect.style.left = `${left}px`;
        selectionRect.style.top = `${top}px`;
        selectionRect.style.width = `${width}px`;
        selectionRect.style.height = `${height}px`;
    },

    completeMultiSelect(startX, startY, endX, endY) {
        log(`🎯 Completing multi-select from (${startX}, ${startY}) to (${endX}, ${endY})`);

        // Remove selection rectangle
        const selectionRect = document.getElementById('multi-select-rectangle');
        if (selectionRect) {
            selectionRect.remove();
        }

        // Get all buildings within the selection rectangle
        const selectedBuildings = [];
        const buildings = this.gameManager.buildingSystem.buildings;

        buildings.forEach((building) => {
            if (building.mesh) {
                // Project 3D position to 2D screen coordinates
                const screenPos = BABYLON.Vector3.Project(
                    building.mesh.position,
                    BABYLON.Matrix.Identity(),
                    this.gameManager.scene.getTransformMatrix(),
                    this.gameManager.camera.viewport.toGlobal(
                        this.gameManager.engine.getRenderWidth(),
                        this.gameManager.engine.getRenderHeight()
                    )
                );

                const x = screenPos.x;
                const y = screenPos.y;

                // Check if building is within selection rectangle
                const minX = Math.min(startX, endX);
                const maxX = Math.max(startX, endX);
                const minY = Math.min(startY, endY);
                const maxY = Math.max(startY, endY);

                if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                    selectedBuildings.push(building);
                }
            }
        });

        log(`✅ Selected ${selectedBuildings.length} buildings`);
        console.table(selectedBuildings);

        // Show notification and display buildings in details panel
        if (selectedBuildings.length > 0) {
            this.showNotification(
                `✅ ${selectedBuildings.length} edifício(s) selecionado(s)`,
                'success',
                3000
            );

            // Display multi-selection info in details panel
            this.showMultiSelectionInfo(selectedBuildings);

            // Highlight selected buildings with visual feedback
            selectedBuildings.forEach(building => {
                if (building.mesh && building.mesh.material) {
                    // Add a temporary highlight effect with proper null checks
                    let originalColor = null;

                    // Safely clone the original emissive color if it exists
                    if (building.mesh.material.emissiveColor) {
                        originalColor = building.mesh.material.emissiveColor.clone();
                    } else {
                        // Fallback to default color if emissiveColor doesn't exist
                        originalColor = new BABYLON.Color3(0, 0, 0);
                    }

                    // Set highlight color
                    building.mesh.material.emissiveColor = new BABYLON.Color3(0, 1, 0.5);

                    // Restore original color after 1 second
                    setTimeout(() => {
                        if (building.mesh && building.mesh.material && originalColor) {
                            building.mesh.material.emissiveColor = originalColor;
                        }
                    }, 1000);
                }
            });
        } else {
            this.showNotification('❌ Nenhum edifício selecionado', 'warning', 2000);
        }
    },

    // ===== MULTI-SELECTION INFO DISPLAY =====
    showMultiSelectionInfo(buildings) {
        if (!buildings || buildings.length === 0) return;

        const detailsPanel = this.elements.detailsPanel;
        const detailsContent = this.elements.detailsContent;

        if (!detailsPanel || !detailsContent) return;

        // Generate content for multiple buildings
        let content = `
            <div class="multi-selection-info">
                <div class="selection-header">
                    <h3>${uiIcon('apartment', 'lg')} ${buildings.length} Edifícios Selecionados</h3>
                    <button class="deselect-btn" data-action="close-multi">${uiIcon('ui-close')} Fechar</button>
                </div>
                <div class="multi-selection-list">
        `;

        // Add each building as a separate item
        buildings.forEach((building, index) => {
            const categoryName = this.getCategoryDisplayName(building.config.category);
            const statusClass = building.active ? 'status-active' : 'status-inactive';
            const statusText = building.active ? 'Ativo' : 'Inativo';

            content += `
                <div class="building-item" data-building-index="${index}">
                    <div class="building-item-header">
                        <h4>${index + 1}. ${building.config.name}</h4>
                        <span class="building-category">${categoryName}</span>
                    </div>
                    <div class="building-item-details">
                        <div class="detail-row">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value ${statusClass}">${statusText}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Eficiência:</span>
                            <span class="detail-value">${Math.round(building.efficiency * 100)}%</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Posição:</span>
                            <span class="detail-value">(${building.gridX}, ${building.gridZ})</span>
                        </div>
            `;

            // Add production/consumption stats
            if (building.config.waterProduction > 0) {
                content += `
                        <div class="detail-row">
                            <span class="detail-label">${uiIcon('res-water')} Produção:</span>
                            <span class="detail-value">${building.config.waterProduction}L/min</span>
                        </div>
                `;
            }
            if (building.config.powerGeneration > 0) {
                content += `
                        <div class="detail-row">
                            <span class="detail-label">${uiIcon('res-energy')} Geração:</span>
                            <span class="detail-value">${building.config.powerGeneration} MW</span>
                        </div>
                `;
            }
            if (building.config.maintenanceCost > 0) {
                content += `
                        <div class="detail-row">
                            <span class="detail-label">🔧 Manutenção:</span>
                            <span class="detail-value">R$ ${building.config.maintenanceCost}/min</span>
                        </div>
                `;
            }

            content += `
                    </div>
                </div>
            `;
        });

        content += `
                </div>
            </div>
        `;

        detailsContent.innerHTML = content;
        detailsPanel.style.display = 'flex';
        this.updatePanelState('multi-selection');

        // ===== FIX: Add proper event listener for close button (mobile-friendly) =====
        const closeBtn = detailsContent.querySelector('.deselect-btn[data-action="close-multi"]');
        if (closeBtn) {
            // Remove any existing listeners
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

            // Add both click and touchend for mobile compatibility
            const handleClose = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.clearBuildingSelectionInfo();
                // Close mobile panel if on mobile
                if (this.isMobile) {
                    this.closeMobilePanel('right');
                }
                log('✅ Multi-selection panel closed via button');
            };

            newCloseBtn.addEventListener('click', handleClose);
            newCloseBtn.addEventListener('touchend', handleClose, { passive: false });
        }

        log(`📋 Multi-selection info displayed for ${buildings.length} buildings`);

        // Update selection counter badge with number of selected buildings
        this.updateSelectionCounterBadge(buildings.length);
    },

    // ===== SELECTION COUNTER BADGE UPDATE =====
    updateSelectionCounterBadge(count) {
        if (!this.isMobile) return; // Only show on mobile

        const badge = document.querySelector('.selection-counter-badge');
        if (!badge) return;

        if (count > 0) {
            badge.textContent = count.toString();
            badge.style.display = 'flex';
            log(`📊 Selection counter badge updated: ${count} building(s)`);
        } else {
            badge.style.display = 'none';
            log('📊 Selection counter badge hidden');
        }
    },
});
