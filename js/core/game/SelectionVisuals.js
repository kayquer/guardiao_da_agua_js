/**
 * GameManager — Seleção de edifícios e overlay de construção
 * Parte da classe GameManager (js/core/GameManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(GameManager, {
    // ===== SELEÇÃO =====
    /** sound: clique do jogador → um som só (o característico do prédio pronto, ou uma ferramenta numa obra) */
    selectBuilding(building, { sound = false } = {}) {
        if (!building || !building.config) {
            logWarn('⚠️ Tentativa de selecionar edifício inválido');
            return;
        }
        if (sound && typeof AudioManager !== 'undefined') {
            if (!building.underConstruction && this.gameState === 'playing') {
                AudioManager.onSelect(AudioManager.selectGroupFor({ ...building.config, id: building.type }));
            } else {
                AudioManager.playSound('sfx_construction_click'); // obra em andamento: ferramenta (parafusadeira, serrote...)
            }
        }

        this.clearBuildingSelection();
        this.selectedBuilding = building;
        this.addSelectionIndicator(building);
        // O painel abre calado: o som da seleção já tocou (o "abrir painel" junto encobria o do prédio)
        this.uiManager.quietPanelOpen = true;
        this.refreshInfoPanel();

        // FIX #4: Show building info in details panel (removed showMissionPanel interference)
        this.uiManager.showBuildingSelectionInfo(building);
        this.uiManager.quietPanelOpen = false;
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
        this.treeSystem?.clearSelection?.(); // árvore nativa selecionada (TreeSystem.selectAt)
        if (this.selectedBuilding) {
            this.removeSelectionIndicator(this.selectedBuilding);
            this.selectedBuilding = null;
        }
    },

    addSelectionIndicator(building) {
        if (!building.mesh || !building.config) {
            logWarn('⚠️ Tentativa de adicionar indicador inválido');
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
        // Base no topo do bloco mais alto da área do prédio (o mesmo que adjustBuildingToTerrain usa);
        // em y = 0 o anel ficava escondido dentro dos blocos de pastagem/colina.
        selectionParent.position.y = this.getSelectionBaseHeight(building);

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
        // Uma luz só, reaproveitada, e que ilumina só o prédio e o chão: criar/apagar uma luz por seleção (ou
        // uma luz que pega tudo) recompilava o shader de todos os materiais da cena — o jogo engasgava ao clicar.
        // Posição local ao selectionParent (que já está no centro do prédio, no topo do terreno)
        const light = this.getSelectionLight();
        light.position.set(0, Math.max(2, buildingMesh.position.y - selectionParent.position.y + 2), 0);
        light.intensity = 0.5;
        light.range = averageSize * 3;
        light.parent = selectionParent;
        light.includedOnlyMeshes = [buildingMesh, ...(this.gridManager?.terrainBlocks || [])];
        light.setEnabled(true);

        // Store references for animation
        selectionParent.selectionRing = selectionRing;
        selectionParent.selectionAura = aura;
        selectionParent.selectionLight = light;

        return selectionParent;
    },

    getSelectionLight() {
        if (!this.selectionLight || this.selectionLight.isDisposed()) {
            const light = new BABYLON.PointLight('selection_light', BABYLON.Vector3.Zero(), this.scene);
            light.diffuse = new BABYLON.Color3(1, 0.8, 0);
            light.specular = new BABYLON.Color3(1, 0.9, 0.5);
            this.selectionLight = light;
        }
        return this.selectionLight;
    },

    // Topo do terreno sob o prédio (bloco mais alto da área size × size)
    getSelectionBaseHeight(building) {
        const bs = this.buildingSystem;
        if (!bs || typeof bs.getBuildingAreaTerrainHeight !== 'function'
            || !Number.isFinite(building?.gridX) || !Number.isFinite(building?.gridZ)) {
            return 0;
        }
        const size = building.config?.size || 1;
        return bs.getBuildingAreaTerrainHeight(building.gridX, building.gridZ, size) || 0;
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

                // Light: reaproveitada na próxima seleção (getSelectionLight); só desliga e solta do indicador
                if (indicator.selectionLight && !indicator.selectionLight.isDisposed()) {
                    indicator.selectionLight.animations = [];
                    indicator.selectionLight.parent = null;
                    indicator.selectionLight.setEnabled(false);
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
    // Uma malha só, com um quadrado por célula (verde = cabe, vermelho = não cabe) em cor de vértice, logo acima do topo
    // de cada bloco. Antes eram 1.600 planos transparentes (1.600 draw calls ordenados a cada quadro) montados em
    // lotes assíncronos, e sair do modo construção no meio deixava planos órfãos.
    createPlacementOverlay(buildingType) {
        this.clearPlacementOverlay();
        if (!this.buildingSystem.buildingTypes.get(buildingType)) {
            logWarn(`⚠️ Building type not found: ${buildingType}`);
            return;
        }
        const gm = this.gridManager;
        const size = gm.gridSize;
        const half = (gm.cellSize * 0.95) / 2;
        const positions = [], colors = [], indices = [], normals = [];
        const cells = [];
        const valid = [0.15, 0.95, 0.35, 0.4], invalid = [1, 0.15, 0.15, 0.4];
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const ok = this.buildingSystem.canPlaceBuilding(x, z, buildingType, { quiet: true }).canPlace;
                const c = gm.gridToWorld(x, z);
                // Logo acima do topo real do bloco (GridManager.getTerrainBlockHeight)
                const y = gm.getTerrainBlockHeight(x, z) + 0.06;
                const base = positions.length / 3;
                positions.push(c.x - half, y, c.z - half, c.x + half, y, c.z - half, c.x + half, y, c.z + half, c.x - half, y, c.z + half);
                const col = ok ? valid : invalid;
                for (let i = 0; i < 4; i++) { colors.push(...col); normals.push(0, 1, 0); }
                indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
                cells.push({ x, z, y, ok });
            }
        }
        const mesh = new BABYLON.Mesh('placementOverlay', this.scene);
        const data = new BABYLON.VertexData();
        data.positions = positions;
        data.colors = colors;
        data.indices = indices;
        data.normals = normals;
        data.applyToMesh(mesh);
        const mat = new BABYLON.StandardMaterial('placementOverlayMat', this.scene);
        mat.disableLighting = true;
        mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        mat.backFaceCulling = false;
        mat.useVertexAlpha = true;
        mesh.hasVertexAlpha = true;
        mesh.material = mat;
        mesh.isPickable = false;
        mesh.freezeWorldMatrix();
        this.placementOverlayMeshes = [mesh];
        this.placementOverlayCells = cells; // para testes e para quem precisar saber o que cabe onde
        log(`✅ Placement overlay: ${cells.length} cells in 1 mesh`);
    },

    clearPlacementOverlay() {
        for (const mesh of this.placementOverlayMeshes || []) {
            mesh.material?.dispose();
            mesh.dispose();
        }
        this.placementOverlayMeshes = [];
        this.placementOverlayCells = [];
    },
});
