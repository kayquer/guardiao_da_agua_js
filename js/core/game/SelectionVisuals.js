/**
 * GameManager — Seleção de edifícios e overlay de construção
 * Parte da classe GameManager (js/core/GameManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(GameManager, {
    // ===== SELEÇÃO =====
    selectBuilding(building) {
        if (!building || !building.config) {
            console.warn('⚠️ Tentativa de selecionar edifício inválido');
            return;
        }

        this.clearBuildingSelection();
        this.selectedBuilding = building;
        this.addSelectionIndicator(building);
        this.refreshInfoPanel();

        // FIX #4: Show building info in details panel (removed showMissionPanel interference)
        this.uiManager.showBuildingSelectionInfo(building);
        this.uiManager.toggleMobilePanel('right');

        log(`🏢 Selecionado: ${building.config.name}`);
    },

    deselectBuilding() {
        if (this.selectedBuilding) {
            const buildingName = (this.selectedBuilding.config && this.selectedBuilding.config.name)
                ? this.selectedBuilding.config.name
                : 'Edifício Desconhecido';
            log(`🏢 Desselecionado: ${buildingName}`);
        }

        this.clearBuildingSelection();
        this.refreshInfoPanel();
    },

    clearBuildingSelection() {
        if (this.selectedBuilding) {
            this.removeSelectionIndicator(this.selectedBuilding);
            this.selectedBuilding = null;
        }
    },

    addSelectionIndicator(building) {
        if (!building.mesh || !building.config) {
            console.warn('⚠️ Tentativa de adicionar indicador inválido');
            return;
        }

        try {
            const selectionIndicator = this.createSelectionIndicator(building);
            if (selectionIndicator) {
                building.mesh.selectionIndicator = selectionIndicator;
                this.animateSelectionIndicator(selectionIndicator);
            }
        } catch (error) {
            console.error('❌ Erro ao criar indicador:', error);
        }
    },

    createSelectionIndicator(building) {
        const buildingMesh = building.mesh;
        const boundingBox = buildingMesh.getBoundingInfo().boundingBox;

        const buildingWidth = Math.abs(boundingBox.maximum.x - boundingBox.minimum.x);
        const buildingDepth = Math.abs(boundingBox.maximum.z - boundingBox.minimum.z);
        const averageSize = (buildingWidth + buildingDepth) / 2;

        // ===== ENHANCED SELECTION INDICATOR WITH PULSATING AURA =====

        // Create parent node to hold all selection effects
        const selectionParent = new BABYLON.TransformNode(`selection_parent_${building.id}`, this.scene);
        selectionParent.position.x = buildingMesh.position.x;
        selectionParent.position.z = buildingMesh.position.z;
        selectionParent.position.y = 0;

        // 1. Main selection ring (torus)
        const selectionRing = BABYLON.MeshBuilder.CreateTorus(`selection_ring_${building.id}`, {
            diameter: averageSize * 1.3,
            thickness: 0.15,
            tessellation: 32
        }, this.scene);
        selectionRing.position.y = 0.08;
        selectionRing.parent = selectionParent;

        const ringMaterial = new BABYLON.StandardMaterial(`selectionRingMat_${building.id}`, this.scene);
        ringMaterial.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
        ringMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.6, 0);
        ringMaterial.alpha = 0.9;
        ringMaterial.backFaceCulling = false;
        selectionRing.material = ringMaterial;

        // 2. Pulsating aura (ground disc)
        const aura = BABYLON.MeshBuilder.CreateDisc(`selection_aura_${building.id}`, {
            radius: averageSize * 0.8,
            tessellation: 32
        }, this.scene);
        aura.rotation.x = Math.PI / 2; // Rotate to be horizontal
        aura.position.y = 0.25;
        aura.parent = selectionParent;

        const auraMaterial = new BABYLON.StandardMaterial(`selectionAuraMat_${building.id}`, this.scene);
        auraMaterial.diffuseColor = new BABYLON.Color3(1, 0.9, 0.3);
        auraMaterial.emissiveColor = new BABYLON.Color3(1, 0.8, 0);
        auraMaterial.alpha = 0.3;
        auraMaterial.backFaceCulling = false;
        aura.material = auraMaterial;

        // 3. Point light for glow effect
        const light = new BABYLON.PointLight(`selection_light_${building.id}`,
            new BABYLON.Vector3(buildingMesh.position.x, buildingMesh.position.y + 2, buildingMesh.position.z),
            this.scene);
        light.diffuse = new BABYLON.Color3(1, 0.8, 0);
        light.specular = new BABYLON.Color3(1, 0.9, 0.5);
        light.intensity = 0.5;
        light.range = averageSize * 3;
        light.parent = selectionParent;

        // Store references for animation
        selectionParent.selectionRing = selectionRing;
        selectionParent.selectionAura = aura;
        selectionParent.selectionLight = light;

        return selectionParent;
    },

    removeSelectionIndicator(building) {
        if (building.mesh && building.mesh.selectionIndicator) {
            try {
                const indicator = building.mesh.selectionIndicator;

                // ===== ENHANCED CLEANUP FOR MULTI-COMPONENT INDICATOR =====

                // Stop all animations
                if (this.scene) {
                    if (indicator.selectionRing) {
                        this.scene.stopAnimation(indicator.selectionRing);
                    }
                    if (indicator.selectionAura) {
                        this.scene.stopAnimation(indicator.selectionAura);
                    }
                    if (indicator.selectionLight) {
                        this.scene.stopAnimation(indicator.selectionLight);
                    }
                }

                // Dispose ring
                if (indicator.selectionRing && !indicator.selectionRing.isDisposed()) {
                    if (indicator.selectionRing.material) {
                        indicator.selectionRing.material.dispose();
                    }
                    indicator.selectionRing.dispose();
                }

                // Dispose aura
                if (indicator.selectionAura && !indicator.selectionAura.isDisposed()) {
                    if (indicator.selectionAura.material) {
                        indicator.selectionAura.material.dispose();
                    }
                    indicator.selectionAura.dispose();
                }

                // Dispose light
                if (indicator.selectionLight && !indicator.selectionLight.isDisposed()) {
                    indicator.selectionLight.dispose();
                }

                // Dispose parent node
                if (!indicator.isDisposed()) {
                    indicator.dispose();
                }

                building.mesh.selectionIndicator = null;

                const buildingName = (building.config && building.config.name)
                    ? building.config.name
                    : 'Edifício Desconhecido';
                log(`🗑️ Indicador removido: ${buildingName}`);

            } catch (error) {
                console.error('❌ Erro ao remover indicador:', error);
                building.mesh.selectionIndicator = null;
            }
        }
    },

    animateSelectionIndicator(indicator) {
        // ===== ENHANCED PULSATING ANIMATION WITH MULTIPLE EFFECTS =====

        // 1. Animate ring alpha (pulsing)
        if (indicator.selectionRing) {
            const ringAlphaKeys = [];
            ringAlphaKeys.push({ frame: 0, value: 0.7 });
            ringAlphaKeys.push({ frame: 30, value: 1.0 });
            ringAlphaKeys.push({ frame: 60, value: 0.7 });

            const ringAlphaAnim = new BABYLON.Animation(
                "ringAlphaPulse",
                "material.alpha",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            ringAlphaAnim.setKeys(ringAlphaKeys);
            indicator.selectionRing.animations.push(ringAlphaAnim);
            this.scene.beginAnimation(indicator.selectionRing, 0, 60, true);
        }

        // 2. Animate aura scale (breathing effect)
        if (indicator.selectionAura) {
            const auraScaleKeys = [];
            auraScaleKeys.push({ frame: 0, value: 1.0 });
            auraScaleKeys.push({ frame: 30, value: 1.2 });
            auraScaleKeys.push({ frame: 60, value: 1.0 });

            const auraScaleAnim = new BABYLON.Animation(
                "auraScalePulse",
                "scaling",
                30,
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            auraScaleAnim.setKeys(auraScaleKeys.map(key => ({
                frame: key.frame,
                value: new BABYLON.Vector3(key.value, key.value, key.value)
            })));
            indicator.selectionAura.animations.push(auraScaleAnim);
            this.scene.beginAnimation(indicator.selectionAura, 0, 60, true);

            // Animate aura alpha (pulsing)
            const auraAlphaKeys = [];
            auraAlphaKeys.push({ frame: 0, value: 0.2 });
            auraAlphaKeys.push({ frame: 30, value: 0.4 });
            auraAlphaKeys.push({ frame: 60, value: 0.2 });

            const auraAlphaAnim = new BABYLON.Animation(
                "auraAlphaPulse",
                "material.alpha",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            auraAlphaAnim.setKeys(auraAlphaKeys);
            indicator.selectionAura.animations.push(auraAlphaAnim);
            this.scene.beginAnimation(indicator.selectionAura, 0, 60, true);
        }

        // 3. Animate light intensity (pulsing glow)
        if (indicator.selectionLight) {
            const lightIntensityKeys = [];
            lightIntensityKeys.push({ frame: 0, value: 0.3 });
            lightIntensityKeys.push({ frame: 30, value: 0.7 });
            lightIntensityKeys.push({ frame: 60, value: 0.3 });

            const lightIntensityAnim = new BABYLON.Animation(
                "lightIntensityPulse",
                "intensity",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            lightIntensityAnim.setKeys(lightIntensityKeys);
            indicator.selectionLight.animations.push(lightIntensityAnim);
            this.scene.beginAnimation(indicator.selectionLight, 0, 60, true);
        }

        // 4. Rotate the ring slowly for extra visual interest
        if (indicator.selectionRing) {
            const rotationKeys = [];
            rotationKeys.push({ frame: 0, value: 0 });
            rotationKeys.push({ frame: 120, value: Math.PI * 2 });

            const rotationAnim = new BABYLON.Animation(
                "ringRotation",
                "rotation.y",
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );
            rotationAnim.setKeys(rotationKeys);
            indicator.selectionRing.animations.push(rotationAnim);
            this.scene.beginAnimation(indicator.selectionRing, 0, 120, true);
        }
    },

    refreshInfoPanel() {
        if (this.selectedBuilding) {
            this.updateSelectionInfo(this.selectedBuilding);
        } else {
            this.clearSelectionInfo();
        }
    },

    updateSelectionInfo(building) {
        if (this.uiManager) {
            this.uiManager.showBuildingSelectionInfo(building);
        }
    },

    clearSelectionInfo() {
        if (this.uiManager) {
            this.uiManager.clearBuildingSelectionInfo();
        }
    },

    hideHoverInfo() {
        this.hoverInfo = null;
        const tooltip = document.getElementById('hover-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    },

    // ===== BUILDING PLACEMENT OVERLAY SYSTEM =====
    async createPlacementOverlay(buildingType) {
        // Clear any existing overlay
        this.clearPlacementOverlay();

        const buildingTypeData = this.buildingSystem.buildingTypes.get(buildingType);
        if (!buildingTypeData) {
            console.warn(`⚠️ Building type not found: ${buildingType}`);
            return;
        }

        log(`🎨 Creating placement overlay for ${buildingType}...`);

        // Create overlay mesh array
        this.placementOverlayMeshes = [];

        const gridSize = this.gridManager.gridSize;
        const cellSize = this.gridManager.cellSize;

        // Create shared materials for better performance
        const validMaterial = new BABYLON.StandardMaterial('overlayValidMat', this.scene);
        validMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
        validMaterial.alpha = 0.4;
        validMaterial.backFaceCulling = false;
        validMaterial.disableLighting = true;
        validMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0);

        const invalidMaterial = new BABYLON.StandardMaterial('overlayInvalidMat', this.scene);
        invalidMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        invalidMaterial.alpha = 0.4;
        invalidMaterial.backFaceCulling = false;
        invalidMaterial.disableLighting = true;
        invalidMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);

        // Process in batches to avoid UI freeze
        const batchSize = 100; // Process 100 cells at a time
        let processedCells = 0;

        // Show loading notification
        if (this.uiManager) {
            this.uiManager.showNotification('🎨 Preparando área de construção...', 'info', 2000);
        }

        // Process grid in batches
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                // Check if building can be placed at this position
                const canPlaceResult = this.buildingSystem.canPlaceBuilding(x, z, buildingType);
                const canPlace = canPlaceResult.canPlace;

                // Create plane for this cell
                const plane = BABYLON.MeshBuilder.CreatePlane(`overlay_${x}_${z}`, {
                    width: cellSize * 0.95,
                    height: cellSize * 0.95
                }, this.scene);

                // Position the plane slightly above the terrain
                const worldPos = this.gridManager.gridToWorld(x, z);
                const elevation = this.gridManager.getElevation(x, z);
                plane.position = new BABYLON.Vector3(
                    worldPos.x,
                    elevation * this.gridManager.gridHeight + 0.75, // Slightly higher for visibility
                    worldPos.z
                );

                // Rotate to be horizontal
                plane.rotation.x = Math.PI / 2;

                // Use shared material
                plane.material = canPlace ? validMaterial : invalidMaterial;

                // Store reference
                this.placementOverlayMeshes.push(plane);

                processedCells++;

                // Yield to UI every batch
                if (processedCells % batchSize === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }

        log(`✅ Placement overlay created with ${this.placementOverlayMeshes.length} cells`);

        if (this.uiManager) {
            this.uiManager.showNotification('✅ Área de construção pronta!', 'success', 1500);
        }
    },

    clearPlacementOverlay() {
        if (this.placementOverlayMeshes && this.placementOverlayMeshes.length > 0) {
            log(`🗑️ Clearing placement overlay (${this.placementOverlayMeshes.length} meshes)...`);

            this.placementOverlayMeshes.forEach(mesh => {
                if (mesh.material) {
                    mesh.material.dispose();
                }
                mesh.dispose();
            });

            this.placementOverlayMeshes = [];
            log('✅ Placement overlay cleared');
        }
    },
});
