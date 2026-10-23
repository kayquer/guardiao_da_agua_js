/**
 * BuildingSystem — Meshes e materiais dos edifícios
 * Parte da classe BuildingSystem (js/systems/BuildingSystem.js), anexada via mixin(): use this.* normalmente.
 */
mixin(BuildingSystem, {
    /** @param {number} rotation - quartos de volta (0-3) em torno do centro da área; 0 = fachada para -Z */
    createBuildingMesh(gridX, gridZ, buildingType, rotation = 0) {
        // Rua: peça de auto-encaixe (js/systems/roads/RoadMeshes.js), sem rótulo, sombra falsa nem rotação manual
        if (buildingType.roadType) return this.createRoadMesh(gridX, gridZ, buildingType);

        // ===== STANDARDIZED BUILDING GRAPHICS SYSTEM =====
        const standardizedMesh = this.createStandardizedBuildingMesh(buildingType);

        if (!standardizedMesh) {
            console.error(`❌ Failed to create mesh for building type: ${buildingType.id}`);
            return null;
        }

        // Nome único por prédio: sombra e conexão com o terreno são indexadas pelo nome do mesh
        // (com o nome só do tipo, o segundo prédio igual sobrescrevia as peças do primeiro)
        standardizedMesh.name = `${standardizedMesh.name}#${standardizedMesh.uniqueId}`;

        // ===== STANDARDIZED POSITIONING SYSTEM =====
        this.applyStandardizedPositioning(standardizedMesh, gridX, gridZ, buildingType);

        // Sempre alinhada aos 4 eixos do grid: só quartos de volta em Y (size > 1 é quadrado, a ocupação não muda)
        standardizedMesh.rotation = new BABYLON.Vector3(0, this.rotationToRadians(rotation), 0);

        // ===== STANDARDIZED MATERIAL APPLICATION ===
        // Sem material ou com o cinza padrão do merge → material com a cor do prédio.
        // Material próprio do merge (peças com cores diferentes) ou de modelo é preservado.
        if (!standardizedMesh.material || standardizedMesh.material === this.getDefaultMergeMaterial()) {
            this.applyStandardizedMaterial(standardizedMesh, buildingType);
        }

        // ===== STANDARDIZED SHADOW SYSTEM =====
        this.applyStandardizedShadows(standardizedMesh);

        // ===== STANDARDIZED TERRAIN INTEGRATION =====
        const terrainHeight = this.adjustBuildingToTerrain(standardizedMesh, gridX, gridZ, buildingType.size || 1);

        // ===== STANDARDIZED SHADOW CREATION =====
        this.createStandardizedBuildingShadow(standardizedMesh, terrainHeight);

        // ===== STANDARDIZED METADATA =====
        this.applyStandardizedMetadata(standardizedMesh, buildingType, gridX, gridZ);

        // ===== STANDARDIZED LABELING =====
        const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
        this.createBuildingNameLabel(standardizedMesh, buildingType, worldPos);
        if (standardizedMesh.metadata.fromModel) this.fitBuildingLabelToMesh(standardizedMesh);

        return standardizedMesh;
    },

    // ===== STANDARDIZED BUILDING GRAPHICS SYSTEM =====

    /**
     * Creates a standardized building mesh with consistent sizing and positioning
     * @param {Object} buildingType - The building type configuration
     * @returns {BABYLON.Mesh} - The standardized building mesh
     */
    createStandardizedBuildingMesh(buildingType) {
        // Zona: laje do lote; as peças de cada fase entram como filhas (ZoneGrowth.js)
        if (this.isZoneBuilding(buildingType)) return this.createZoneLotMesh(buildingType);

        // Modelo .glb da tabela (js/data/buildingModels.js), se já carregou; senão o procedural abaixo
        // é a reserva e BuildingModels.js troca o mesh quando o modelo ficar pronto
        const modelMesh = this.createBuildingModelMesh(buildingType);
        if (modelMesh) return modelMesh;

        // Get standardized dimensions
        const dimensions = this.getStandardizedBuildingDimensions(buildingType);

        // Create mesh based on category with standardized approach
        switch (buildingType.category) {
            case 'water':
                return this.createStandardizedWaterFacilityMesh(buildingType, dimensions);
            case 'treatment':
                return this.createStandardizedTreatmentPlantMesh(buildingType, dimensions);
            case 'storage':
                return this.createStandardizedStorageMesh(buildingType, dimensions);
            case 'residential':
                return this.createStandardizedHouseMesh(buildingType, dimensions);
            case 'power':
                return this.createStandardizedPowerPlantMesh(buildingType, dimensions);
            case 'infrastructure':
                return this.createStandardizedInfrastructureMesh(buildingType, dimensions);
            case 'public':
                return this.createStandardizedPublicBuildingMesh(buildingType, dimensions);
            default:
                return this.createStandardizedBasicMesh(buildingType, dimensions);
        }
    },

    /**
     * Calculates standardized building dimensions for consistent sizing
     * @param {Object} buildingType - The building type configuration
     * @returns {Object} - Standardized dimensions object
     */
    getStandardizedBuildingDimensions(buildingType) {
        // ===== CLEAN CODE REFACTORING: Use constants for building scale =====
        const BUILDING_CONSTANTS = BUILDINGS;
        const BUILDING_SCALE_FACTOR = BUILDING_CONSTANTS.SCALE_FACTOR;

        const buildingSize = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const actualSize = buildingSize * cellSize * BUILDING_SCALE_FACTOR;

        return {
            size: buildingSize,
            cellSize: cellSize,
            scaleFactor: BUILDING_SCALE_FACTOR,
            actualSize: actualSize,
            width: actualSize,
            depth: actualSize,
            height: this.getStandardizedBuildingHeight(buildingType)
        };
    },

    /**
     * Calculates standardized building height based on type and size
     * @param {Object} buildingType - The building type configuration
     * @returns {number} - Standardized height
     */
    /**
     * ===== CLEAN CODE REFACTORING: Enhanced building height calculation =====
     * Calculates standardized building height based on type, size, and category
     *
     * @description Computes building height using base height, size multiplier, and category-specific
     *              modifiers from game constants. Ensures consistent visual hierarchy across building types.
     *
     * @method getStandardizedBuildingHeight
     * @memberof BuildingSystem
     * @since 1.0.0
     *
     * @param {Object} buildingType - The building type configuration object
     * @param {string} buildingType.category - Building category (water, power, residential, etc.)
     * @param {number} [buildingType.size=1] - Building size in grid cells
     *
     * @returns {number} Calculated building height in world units
     *
     * @example
     * const height = buildingSystem.getStandardizedBuildingHeight({
     *     category: 'power',
     *     size: 2
     * });
     * log(height); // Returns calculated height for 2x2 power building
     */
    getStandardizedBuildingHeight(buildingType) {
        // ===== CLEAN CODE REFACTORING: Use constants for height calculations =====
        const BUILDING_CONSTANTS = BUILDINGS;

        const baseHeight = BUILDING_CONSTANTS.BASE_HEIGHT;
        const sizeMultiplier = (buildingType.size || 1) * BUILDING_CONSTANTS.SIZE_HEIGHT_MULTIPLIER;
        const categoryModifier = BUILDING_CONSTANTS.CATEGORY_HEIGHT_MODIFIERS[buildingType.category] || 0;

        return baseHeight + categoryModifier + sizeMultiplier;
    },

    /**
     * Applies standardized positioning to building mesh
     * @param {BABYLON.Mesh} mesh - The building mesh
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridZ - Grid Z coordinate
     * @param {Object} buildingType - The building type configuration
     */
    applyStandardizedPositioning(mesh, gridX, gridZ, buildingType) {
        const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
        const buildingSize = buildingType.size || 1;

        // Base positioning
        mesh.position.x = worldPos.x;
        mesh.position.z = worldPos.z;
        mesh.position.y = 0; // Will be adjusted by terrain integration

        // ===== CLEAN CODE REFACTORING: Use constants for multi-cell positioning =====
        if (buildingSize > 1) {
            const BUILDING_CONSTANTS = BUILDINGS;
            const offset = (buildingSize - 1) * this.gridManager.cellSize * BUILDING_CONSTANTS.MULTI_CELL_OFFSET_MULTIPLIER;
            mesh.position.x += offset;
            mesh.position.z += offset;
        }
    },

    /**
     * Applies standardized material to building mesh
     * @param {BABYLON.Mesh} mesh - The building mesh
     * @param {Object} buildingType - The building type configuration
     */
    applyStandardizedMaterial(mesh, buildingType) {
        // Material próprio por prédio (cor e textura do tipo, textura compartilhada): os efeitos de
        // falta de energia e destaque alteram o material e não podem afetar os outros prédios do tipo.
        // Liberado em performDisposal (metadata.perBuilding).
        const typeMaterial = this.createMinecraftBuildingMaterial(buildingType);
        const material = new BABYLON.StandardMaterial(`buildingMat_${buildingType.id}_${mesh.uniqueId}`, this.scene);
        material.diffuseColor = typeMaterial.diffuseColor.clone();
        material.specularColor = typeMaterial.specularColor.clone();
        material.diffuseTexture = typeMaterial.diffuseTexture;
        material.alpha = typeMaterial.alpha;
        material.metadata = { perBuilding: true };
        mesh.material = material;

        // ===== FIX BUILDING VISIBILITY: Ensure mesh is visible =====
        mesh.isVisible = true;
        mesh.setEnabled(true);

        // Ensure material is properly applied
        if (material) {
            material.needDepthPrePass = false;
            material.backFaceCulling = false; // Better visibility for voxel style
        }
    },

    /**
     * Applies standardized shadow settings to building mesh
     * @param {BABYLON.Mesh} mesh - The building mesh
     */
    applyStandardizedShadows(mesh) {
        const shadowGenerator = this.gameManager?.shadowGenerator;
        if (shadowGenerator) {
            shadowGenerator.addShadowCaster(mesh);
        }
        mesh.receiveShadows = true;
    },

    /**
     * Applies standardized metadata to building mesh
     * @param {BABYLON.Mesh} mesh - The building mesh
     * @param {Object} buildingType - The building type configuration
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridZ - Grid Z coordinate
     */
    applyStandardizedMetadata(mesh, buildingType, gridX, gridZ) {
        mesh.metadata = {
            ...(mesh.metadata || {}), // fromModel/modelFile dos prédios com modelo .glb
            building: true,
            buildingType: buildingType.id,
            gridX,
            gridZ,
            standardized: true // Mark as using standardized system
        };
    },

    // ===== STANDARDIZED MESH CREATION METHODS =====

    /**
     * Creates standardized basic building mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedBasicMesh(buildingType, dimensions) {
        const mesh = BABYLON.MeshBuilder.CreateBox(`building_${buildingType.id}`, {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth
        }, this.scene);

        return mesh;
    },

    /**
     * Creates standardized water facility mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedWaterFacilityMesh(buildingType, dimensions) {
        // Base structure
        const base = BABYLON.MeshBuilder.CreateBox("waterBase", {
            width: dimensions.width,
            height: dimensions.height * 0.3,
            depth: dimensions.depth
        }, this.scene);

        // Tower structure
        const tower = BABYLON.MeshBuilder.CreateBox("waterTower", {
            width: dimensions.width * 0.6,
            height: dimensions.height * 0.7,
            depth: dimensions.depth * 0.6
        }, this.scene);
        tower.position.y = dimensions.height * 0.5;

        return this.mergeVisibleMeshes([base, tower], `waterFacility_${buildingType.id}`);
    },

    /**
     * Creates standardized power plant mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedPowerPlantMesh(buildingType, dimensions) {
        // ===== ENHANCED POWER BUILDING MESH CREATION =====
        // Handle specific power building types with proper grid alignment

        if (buildingType.id === 'solar_farm') {
            return this.createStandardizedSolarFarmMesh(buildingType, dimensions);
        } else if (buildingType.id === 'wind_farm') {
            return this.createStandardizedWindFarmMesh(buildingType, dimensions);
        } else if (buildingType.id === 'power_pole') {
            return this.createStandardizedPowerPoleMesh(buildingType, dimensions);
        } else if (buildingType.id === 'hydroelectric_plant') {
            return this.createStandardizedHydroelectricMesh(buildingType, dimensions);
        } else if (buildingType.id === 'nuclear_plant') {
            return this.createStandardizedNuclearPlantMesh(buildingType, dimensions);
        }

        // Default power plant (thermal, coal, etc.)
        const main = BABYLON.MeshBuilder.CreateBox("powerMain", {
            width: dimensions.width,
            height: dimensions.height * 0.8,
            depth: dimensions.depth
        }, this.scene);

        // Cooling towers
        const tower1 = BABYLON.MeshBuilder.CreateCylinder("powerTower1", {
            height: dimensions.height * 0.6,
            diameterTop: dimensions.width * 0.3,
            diameterBottom: dimensions.width * 0.3,
            tessellation: 8
        }, this.scene);
        tower1.position.y = dimensions.height * 0.7;
        tower1.position.x = dimensions.width * 0.25;

        const tower2 = tower1.clone("powerTower2");
        tower2.position.x = -dimensions.width * 0.25;

        return this.mergeVisibleMeshes([main, tower1, tower2], `powerPlant_${buildingType.id}`);
    },

    /**
     * Creates standardized solar farm mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedSolarFarmMesh(buildingType, dimensions) {
        // Base platform
        const base = BABYLON.MeshBuilder.CreateBox("solarBase", {
            width: dimensions.width,
            height: dimensions.height * 0.1,
            depth: dimensions.depth
        }, this.scene);

        // Solar panels - arranged in grid pattern
        const panelWidth = dimensions.width * 0.35;
        const panelDepth = dimensions.depth * 0.4;
        const panelHeight = dimensions.height * 0.05;

        const panel1 = BABYLON.MeshBuilder.CreateBox("solarPanel1", {
            width: panelWidth,
            height: panelHeight,
            depth: panelDepth
        }, this.scene);
        panel1.position.x = -dimensions.width * 0.25;
        panel1.position.y = dimensions.height * 0.4;
        panel1.position.z = -dimensions.depth * 0.2;
        panel1.rotation.z = Math.PI / 12; // Slight tilt

        const panel2 = panel1.clone("solarPanel2");
        panel2.position.x = dimensions.width * 0.25;

        const panel3 = panel1.clone("solarPanel3");
        panel3.position.x = -dimensions.width * 0.25;
        panel3.position.z = dimensions.depth * 0.2;

        const panel4 = panel1.clone("solarPanel4");
        panel4.position.x = dimensions.width * 0.25;
        panel4.position.z = dimensions.depth * 0.2;

        return this.mergeVisibleMeshes([base, panel1, panel2, panel3, panel4], `solarFarm_${buildingType.id}`);
    },

    /**
     * Creates standardized wind farm mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedWindFarmMesh(buildingType, dimensions) {
        // Base platform
        const base = BABYLON.MeshBuilder.CreateCylinder("windBase", {
            height: dimensions.height * 0.1,
            diameter: dimensions.width * 0.3
        }, this.scene);

        // Tower
        const tower = BABYLON.MeshBuilder.CreateCylinder("windTower", {
            height: dimensions.height * 0.7,
            diameterTop: dimensions.width * 0.08,
            diameterBottom: dimensions.width * 0.12,
            tessellation: 8
        }, this.scene);
        tower.position.y = dimensions.height * 0.4;

        // Nacelle
        const nacelle = BABYLON.MeshBuilder.CreateBox("windNacelle", {
            width: dimensions.width * 0.2,
            height: dimensions.height * 0.1,
            depth: dimensions.width * 0.1
        }, this.scene);
        nacelle.position.y = dimensions.height * 0.75;

        // Turbine blades
        const bladeLength = dimensions.width * 0.35;
        const blade1 = BABYLON.MeshBuilder.CreateBox("windBlade1", {
            width: dimensions.width * 0.02,
            height: bladeLength,
            depth: dimensions.width * 0.01
        }, this.scene);
        blade1.position.y = dimensions.height * 0.75;
        blade1.position.x = dimensions.width * 0.15;

        const blade2 = blade1.clone("windBlade2");
        blade2.rotation.z = 2 * Math.PI / 3;

        const blade3 = blade1.clone("windBlade3");
        blade3.rotation.z = 4 * Math.PI / 3;

        return this.mergeVisibleMeshes([base, tower, nacelle, blade1, blade2, blade3], `windFarm_${buildingType.id}`);
    },

    /**
     * Creates standardized power pole mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedPowerPoleMesh(buildingType, dimensions) {
        // Main pole
        const pole = BABYLON.MeshBuilder.CreateCylinder("powerPole", {
            height: dimensions.height,
            diameterTop: dimensions.width * 0.05,
            diameterBottom: dimensions.width * 0.08,
            tessellation: 6
        }, this.scene);

        // Cross arms
        const crossArm = BABYLON.MeshBuilder.CreateBox("powerCrossArm", {
            width: dimensions.width * 0.8,
            height: dimensions.height * 0.03,
            depth: dimensions.width * 0.03
        }, this.scene);
        crossArm.position.y = dimensions.height * 0.8;

        return this.mergeVisibleMeshes([pole, crossArm], `powerPole_${buildingType.id}`);
    },

    /**
     * Creates standardized hydroelectric plant mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedHydroelectricMesh(buildingType, dimensions) {
        // Main building
        const main = BABYLON.MeshBuilder.CreateBox("hydroMain", {
            width: dimensions.width,
            height: dimensions.height * 0.6,
            depth: dimensions.depth
        }, this.scene);

        // Dam structure
        const dam = BABYLON.MeshBuilder.CreateBox("hydroDam", {
            width: dimensions.width * 1.2,
            height: dimensions.height * 0.8,
            depth: dimensions.depth * 0.3
        }, this.scene);
        dam.position.z = -dimensions.depth * 0.4;

        // Turbine housing
        const turbine = BABYLON.MeshBuilder.CreateCylinder("hydroTurbine", {
            height: dimensions.height * 0.4,
            diameter: dimensions.width * 0.4,
            tessellation: 8
        }, this.scene);
        turbine.position.y = dimensions.height * 0.5;
        turbine.position.z = dimensions.depth * 0.2;

        return this.mergeVisibleMeshes([main, dam, turbine], `hydroelectric_${buildingType.id}`);
    },

    /**
     * Creates standardized nuclear plant mesh with proper grid alignment
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedNuclearPlantMesh(buildingType, dimensions) {
        // Main reactor building
        const main = BABYLON.MeshBuilder.CreateBox("nuclearMain", {
            width: dimensions.width,
            height: dimensions.height * 0.7,
            depth: dimensions.depth
        }, this.scene);

        // Reactor dome
        const dome = BABYLON.MeshBuilder.CreateSphere("nuclearDome", {
            diameter: dimensions.width * 0.6,
            segments: 8
        }, this.scene);
        dome.position.y = dimensions.height * 0.6;
        dome.scaling.y = 0.6; // Flatten the dome

        // Cooling towers
        const tower1 = BABYLON.MeshBuilder.CreateCylinder("nuclearTower1", {
            height: dimensions.height * 0.9,
            diameterTop: dimensions.width * 0.25,
            diameterBottom: dimensions.width * 0.35,
            tessellation: 8
        }, this.scene);
        tower1.position.y = dimensions.height * 0.45;
        tower1.position.x = dimensions.width * 0.4;

        const tower2 = tower1.clone("nuclearTower2");
        tower2.position.x = -dimensions.width * 0.4;

        return this.mergeVisibleMeshes([main, dome, tower1, tower2], `nuclear_${buildingType.id}`);
    },

    /**
     * Creates standardized treatment plant mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedTreatmentPlantMesh(buildingType, dimensions) {
        // Main building
        const main = BABYLON.MeshBuilder.CreateBox("treatmentMain", {
            width: dimensions.width,
            height: dimensions.height * 0.7,
            depth: dimensions.depth
        }, this.scene);

        // Chimney
        const chimney = BABYLON.MeshBuilder.CreateBox("treatmentChimney", {
            width: dimensions.width * 0.2,
            height: dimensions.height * 0.5,
            depth: dimensions.depth * 0.2
        }, this.scene);
        chimney.position.y = dimensions.height * 0.85;
        chimney.position.x = dimensions.width * 0.3;

        return this.mergeVisibleMeshes([main, chimney], `treatmentPlant_${buildingType.id}`);
    },

    /**
     * Creates standardized storage mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedStorageMesh(buildingType, dimensions) {
        // Default storage mesh for other storage types
        const tank = BABYLON.MeshBuilder.CreateCylinder("storageTank", {
            height: dimensions.height,
            diameterTop: dimensions.width * 0.8,
            diameterBottom: dimensions.width * 0.8,
            tessellation: 12
        }, this.scene);

        tank.name = `storage_${buildingType.id}`;
        return tank;
    },

    /**
     * Troca o mesh de um prédio já colocado (ex.: procedural → modelo .glb que acabou de carregar),
     * levando junto tudo que depende dele: metadata (seleção por clique/toque), base no mesmo chão,
     * escala/rotação da obra, material próprio e de obra, sombra (caster, chão e conexão com o terreno),
     * rótulo, ícones, indicador de seleção e filhos. Descarta o mesh antigo e o material próprio dele.
     * @param {BABYLON.Mesh} oldMesh - mesh atual do prédio (buildingData.mesh)
     * @param {BABYLON.Mesh} newMesh - mesh novo, com material próprio (metadata.perBuilding) e nome único
     * @returns {boolean} se achou o prédio e trocou
     */
    replaceBuildingMesh(oldMesh, newMesh) {
        const buildingData = Array.from(this.buildings?.values() || []).find(b => b.mesh === oldMesh);
        if (!buildingData || !oldMesh || oldMesh.isDisposed() || !newMesh) return false;

        // Mesma base no terreno (o procedural é centrado em y; o modelo tem a base em y = 0)
        const oldBottom = oldMesh.position.y - Math.abs(oldMesh.getBoundingInfo().boundingBox.minimum.y);
        newMesh.position.set(oldMesh.position.x, oldBottom + Math.abs(newMesh.getBoundingInfo().boundingBox.minimum.y), oldMesh.position.z);
        newMesh.rotation.copyFrom(oldMesh.rotation);
        newMesh.scaling.copyFrom(oldMesh.scaling);
        newMesh.receiveShadows = true;
        newMesh.metadata = { ...(newMesh.metadata || {}), ...(oldMesh.metadata || {}), fromModel: !!newMesh.metadata?.fromModel };

        const shadowGenerator = this.gameManager?.shadowGenerator;
        if (shadowGenerator) {
            shadowGenerator.removeShadowCaster(oldMesh);
            shadowGenerator.addShadowCaster(newMesh);
        }

        // Sombra no chão e conexão com o terreno são indexadas pelo nome do mesh
        [['shadowMesh', this.shadowMeshes], ['terrainConnection', this.connectionMeshes]].forEach(([prop, map]) => {
            const piece = oldMesh[prop];
            if (!piece) return;
            newMesh[prop] = piece;
            if (map.get(oldMesh.name) === piece) map.delete(oldMesh.name);
            map.set(newMesh.name, piece);
        });
        ['nameLabel', 'powerShortageIcon', 'powerShortageFlicker', 'rentalIcon', 'selectionIndicator'].forEach(prop => {
            if (oldMesh[prop]) newMesh[prop] = oldMesh[prop];
        });
        oldMesh.getChildren().slice().forEach(child => child.setParent(newMesh));

        // Material: o novo vira o "original" da obra; obra em andamento ganha um material de obra novo
        const oldOwnMaterial = buildingData.originalMaterial || oldMesh.material;
        const inConstruction = !!buildingData.originalMaterial && oldMesh.material !== buildingData.originalMaterial;
        if (inConstruction && buildingData.constructionMaterial && buildingData.constructionMaterial !== oldOwnMaterial) {
            buildingData.constructionMaterial.dispose(false, false);
            buildingData.constructionMaterial = null;
        }
        if (oldOwnMaterial?.metadata?.perBuilding) oldOwnMaterial.dispose(false, false);
        buildingData.mesh = newMesh;
        if (buildingData.originalMaterial) buildingData.originalMaterial = newMesh.material;
        if (inConstruction) this.applyConstructionMaterial(buildingData);
        if (oldMesh.originalEmissiveColor) this.addPowerShortageEffects(buildingData); // reaplica o escurecimento

        oldMesh.dispose(false, false);
        this.fitBuildingLabelToMesh(newMesh);
        log(`🔄 Mesh substituído para edifício ${buildingData.id}`);
        return true;
    },

    /**
     * Creates standardized house mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedHouseMesh(buildingType, dimensions) {
        // Base house
        const base = BABYLON.MeshBuilder.CreateBox("houseBase", {
            width: dimensions.width,
            height: dimensions.height * 0.8,
            depth: dimensions.depth
        }, this.scene);

        // Roof
        const roof = BABYLON.MeshBuilder.CreateBox("houseRoof", {
            width: dimensions.width * 1.1,
            height: dimensions.height * 0.4,
            depth: dimensions.depth * 1.1
        }, this.scene);
        roof.position.y = dimensions.height * 0.6;
        roof.scaling.y = 0.5;

        return this.mergeVisibleMeshes([base, roof], `house_${buildingType.id}`);
    },

    /**
     * Creates standardized infrastructure mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedInfrastructureMesh(buildingType, dimensions) {
        if (buildingType.id === 'road') {
            return BABYLON.MeshBuilder.CreateBox("road", {
                width: dimensions.width,
                height: dimensions.height * 0.1,
                depth: dimensions.depth
            }, this.scene);
        } else if (buildingType.id === 'pipe') {
            const pipe = BABYLON.MeshBuilder.CreateCylinder("pipe", {
                height: dimensions.width,
                diameterTop: dimensions.width * 0.2,
                diameterBottom: dimensions.width * 0.2,
                tessellation: 8
            }, this.scene);
            pipe.rotation.z = Math.PI / 2;
            return pipe;
        }

        return this.createStandardizedBasicMesh(buildingType, dimensions);
    },

    /**
     * Creates standardized public building mesh
     * @param {Object} buildingType - The building type configuration
     * @param {Object} dimensions - Standardized dimensions
     * @returns {BABYLON.Mesh} - The building mesh
     */
    createStandardizedPublicBuildingMesh(buildingType, dimensions) {
        if (buildingType.id === 'city_hall') {
            // City Hall with distinctive architecture
            const base = BABYLON.MeshBuilder.CreateBox("cityHallBase", {
                width: dimensions.width,
                height: dimensions.height * 0.8,
                depth: dimensions.depth
            }, this.scene);

            const tower = BABYLON.MeshBuilder.CreateBox("cityHallTower", {
                width: dimensions.width * 0.4,
                height: dimensions.height * 0.6,
                depth: dimensions.depth * 0.4
            }, this.scene);
            tower.position.y = dimensions.height * 0.7;

            return this.mergeVisibleMeshes([base, tower], `cityHall_${buildingType.id}`);
        }

        return this.createStandardizedBasicMesh(buildingType, dimensions);
    },

    /**
     * Creates standardized building shadow with proper alignment
     * @param {BABYLON.Mesh} buildingMesh - The building mesh
     * @param {number} terrainHeight - The terrain height
     */
    createStandardizedBuildingShadow(buildingMesh, terrainHeight) {
        const boundingBox = buildingMesh.getBoundingInfo().boundingBox;

        // Calculate shadow size based on actual building footprint
        const buildingWidth = Math.abs(boundingBox.maximum.x - boundingBox.minimum.x);
        const buildingDepth = Math.abs(boundingBox.maximum.z - boundingBox.minimum.z);

        // ===== CLEAN CODE REFACTORING: Use constants for shadow sizing =====
        const BUILDING_CONSTANTS = BUILDINGS;
        const shadowWidth = buildingWidth * BUILDING_CONSTANTS.SHADOW_SIZE_MULTIPLIER;
        const shadowDepth = buildingDepth * BUILDING_CONSTANTS.SHADOW_SIZE_MULTIPLIER;

        const shadow = BABYLON.MeshBuilder.CreateGround(`shadow_${buildingMesh.name}`, {
            width: shadowWidth,
            height: shadowDepth
        }, this.scene);

        // ===== CLEAN CODE REFACTORING: Use constants for shadow positioning and material =====
        const SHADOW_HEIGHT_OFFSET = BUILDING_CONSTANTS.SHADOW_HEIGHT_OFFSET || 0.005;
        const SHADOW_ALPHA = BUILDING_CONSTANTS.SHADOW_ALPHA || 0.3;

        // Position shadow exactly under building center (girada junto com o prédio: planta não quadrada)
        shadow.position.x = buildingMesh.position.x;
        shadow.position.z = buildingMesh.position.z;
        shadow.rotation.y = buildingMesh.rotation.y;
        shadow.position.y = terrainHeight + SHADOW_HEIGHT_OFFSET;

        // Standardized shadow material
        const shadowMaterial = new BABYLON.StandardMaterial(`shadowMat_${buildingMesh.name}`, this.scene);
        shadowMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        shadowMaterial.alpha = SHADOW_ALPHA;
        shadowMaterial.backFaceCulling = false;
        shadow.material = shadowMaterial;

        // Associate shadow with building
        buildingMesh.shadowMesh = shadow;
        this.shadowMeshes.set(buildingMesh.name, shadow);

        return shadow;
    },

    createBasicVoxelMesh(buildingType) {
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Mesh básico com dimensões corrigidas =====
        const size = buildingType.size || 1;
        const height = this.getBuildingHeight(buildingType);

        // ===== FIX: Garantir que edifícios se ajustem perfeitamente às células do grid =====
        const cellSize = this.gridManager.cellSize;
        const buildingWidth = size * cellSize * 0.85; // Reduzido de 0.9 para 0.85 para melhor ajuste
        const buildingDepth = size * cellSize * 0.85;

        const mesh = BABYLON.MeshBuilder.CreateBox(`building_${buildingType.id}`, {
            width: buildingWidth,
            height: height,
            depth: buildingDepth
        }, this.scene);

        // ===== FIX: Ajustar posição para centralizar no grid =====
        // Para edifícios multi-célula, ajustar o centro
        if (size > 1) {
            const offset = (size - 1) * cellSize * 0.5;
            mesh.position.x += offset;
            mesh.position.z += offset;
        }

        return mesh;
    },

    getBuildingHeight(buildingType) {
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Alturas corrigidas e consistentes =====
        const size = buildingType.size || 1;

        // Alturas baseadas no tipo de edifício com escala consistente
        const baseHeights = {
            // Infraestrutura de água
            'water_pump': 1.8,
            'treatment_plant': 2.2,
            'water_tank': 3.5,
            'water_tower': 4.5,

            // Residencial - altura proporcional ao tamanho
            'house': 2.2,
            'apartment': 3.8,

            // Energia
            'power_plant': 3.2,
            'solar_panel': 0.3,
            'wind_farm': 4.0,

            // Infraestrutura
            'road': 0.1,
            'pipe': 0.2,

            // Público - altura proporcional ao tamanho e importância
            'city_hall': 4.2,
            'school': 3.0,
            'hospital': 3.5, // ===== FIX: Hospital altura corrigida =====
            'fire_station': 2.8,
            'police_station': 2.6,

            // Industrial
            'factory': 3.0,
            'warehouse': 2.5,
            'port': 2.8,

            // Zonas
            'zone_residential_light': 0.5,
            'zone_residential_dense': 0.5,
            'zone_commercial': 0.5,
            'zone_industrial': 0.5
        };

        const baseHeight = baseHeights[buildingType.id] || 2.0;

        // ===== FIX: Ajustar altura baseada no tamanho para edifícios multi-célula =====
        if (size > 1) {
            // Edifícios maiores são ligeiramente mais altos, mas não linearmente
            return baseHeight * (1 + (size - 1) * 0.15);
        }

        return baseHeight;
    },

    getTerrainHeightAt(gridX, gridZ) {
        // Topo do bloco de terreno da célula (colina é bem mais alta que pastagem)
        return this.gridManager.getTerrainBlockHeight(gridX, gridZ);
    },

    // Altura do bloco mais alto da área size × size a partir de gridX/gridZ (prédio e prévia usam a mesma)
    getBuildingAreaTerrainHeight(gridX, gridZ, size = 1) {
        let height = 0;
        for (let dx = 0; dx < size; dx++) {
            for (let dz = 0; dz < size; dz++) {
                height = Math.max(height, this.getTerrainHeightAt(gridX + dx, gridZ + dz));
            }
        }
        return height;
    },

    // ===== ROTAÇÃO (quartos de volta, building.rotation 0-3) =====
    rotationToRadians(rotation) {
        return BuildingSystem.normalizeRotation(rotation) * Math.PI / 2;
    },

    getBuildingRotationVector(building) {
        return new BABYLON.Vector3(0, this.rotationToRadians(building?.rotation), 0);
    },

    /** Põe o mesh na rotação do prédio, a não ser que a animação do botão "girar" esteja no meio. */
    applyBuildingRotation(building) {
        const mesh = building?.mesh;
        if (!mesh || mesh.isDisposed?.() || building.rotateAnimation) return;
        mesh.rotation = this.getBuildingRotationVector(building);
        if (mesh.shadowMesh) mesh.shadowMesh.rotation.y = mesh.rotation.y;
    },

    /**
     * Quarto de volta cuja fachada (-Z dos modelos) aponta mais para a câmera. Na ArcRotateCamera a
     * câmera fica em alvo + (cos α, sin α) no chão; a frente girada por θ em Y vira (-sin θ, -cos θ),
     * então θ = -α - π/2. Na diagonal (a câmera padrão, α = -π/4) dois quartos empatam: o desempate (+0.05)
     * escolhe o que deixa a câmera vendo a fachada e o lado +X, os dois lados caprichados dos modelos.
     * Ruas (roadType) não giram: o encaixe automático decide.
     */
    getDefaultBuildingRotation(buildingType) {
        if (buildingType?.roadType) return 0;
        const alpha = this.gameManager?.camera?.alpha;
        if (!Number.isFinite(alpha)) return 0;
        return BuildingSystem.normalizeRotation(Math.round((-alpha - Math.PI / 2) / (Math.PI / 2) + 0.05));
    },

    canRotateBuilding(building) {
        return !!building?.config && !building.config.roadType;
    },

    /**
     * Gira o prédio um quarto de volta (+1 = direita/horário visto de cima, -1 = esquerda) com animação suave.
     * Prédios size > 1 são quadrados e giram no centro: grid e ocupação não mudam.
     */
    rotateBuilding(buildingId, direction = 1) {
        const building = this.buildings?.get(buildingId);
        if (!this.canRotateBuilding(building) || !building.mesh || building.mesh.isDisposed()) return false;
        building.rotation = BuildingSystem.normalizeRotation((building.rotation || 0) + (direction < 0 ? -1 : 1));
        this.animateBuildingRotation(building);
        log(`🔄 ${building.config.name} girado para ${building.rotation * 90}°`);
        return true;
    },

    animateBuildingRotation(building) {
        const startMesh = building.mesh;
        const start = startMesh.rotation.y;
        const target = this.rotationToRadians(building.rotation);
        let diff = (target - start) % (2 * Math.PI);
        if (diff > Math.PI) diff -= 2 * Math.PI;
        if (diff <= -Math.PI) diff += 2 * Math.PI;
        const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const duration = reduceMotion ? 0 : 380;
        const token = {};
        building.rotateAnimation = token;
        const startTime = performance.now();

        const finish = () => {
            if (building.rotateAnimation !== token) return;
            building.rotateAnimation = null;
            this.applyBuildingRotation(building);
            const gm = this.gameManager;
            if (gm?.selectedBuilding === building && building.mesh) {
                gm.removeSelectionIndicator?.(building);
                gm.addSelectionIndicator?.(building);
            }
        };
        const step = () => {
            if (building.rotateAnimation !== token) return; // outro giro começou
            const mesh = building.mesh; // pode ter virado modelo .glb no meio (replaceBuildingMesh copia a rotação)
            if (!mesh || mesh.isDisposed()) { building.rotateAnimation = null; return; }
            const t = duration ? Math.min(1, (performance.now() - startTime) / duration) : 1;
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            mesh.rotation.y = start + diff * eased;
            if (mesh.shadowMesh) mesh.shadowMesh.rotation.y = mesh.rotation.y;
            if (t >= 1) { finish(); return; }
            requestAnimationFrame(step);
        };
        step();
    },

    // Assenta o edifício no bloco mais alto da área que ele ocupa (size × size a partir de gridX/gridZ),
    // senão ele afunda nas colinas da própria área. Retorna a altura usada.
    adjustBuildingToTerrain(buildingMesh, gridX, gridZ, size = 1) {
        const boundingBox = buildingMesh.getBoundingInfo().boundingBox;
        const finalTerrainHeight = this.getBuildingAreaTerrainHeight(gridX, gridZ, size);

        // Posicionar o edifício com a base tocando o terreno
        // boundingBox.minimum.y é a distância do centro até a base do mesh
        const meshBottomOffset = Math.abs(boundingBox.minimum.y);
        buildingMesh.position.y = finalTerrainHeight + meshBottomOffset + 0.02; // Pequeno offset para evitar z-fighting

        // Criar base de conexão com o terreno se necessário
        this.createTerrainConnection(buildingMesh, gridX, gridZ, finalTerrainHeight);
        return finalTerrainHeight;
    },

    createTerrainConnection(buildingMesh, gridX, gridZ, terrainHeight) {
        // Criar uma pequena base que conecta o edifício ao terreno
        const size = this.gridManager.cellSize * 0.95;

        const connection = BABYLON.MeshBuilder.CreateBox(`connection_${buildingMesh.name}`, {
            width: size,
            height: 0.05,
            depth: size
        }, this.scene);

        const worldPos = this.gridManager.gridToWorld(gridX, gridZ);
        connection.position = worldPos;
        connection.position.y = terrainHeight + 0.025;

        // Material que combina com o terreno
        const terrainType = this.gridManager.getTerrainType(gridX, gridZ);
        const connectionMaterial = new BABYLON.StandardMaterial(`connectionMat_${buildingMesh.name}`, this.scene);

        if (terrainType === 'dirt') {
            connectionMaterial.diffuseColor = new BABYLON.Color3(0.45, 0.25, 0.15);
        } else if (terrainType === 'rock') {
            connectionMaterial.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.35);
        } else {
            connectionMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);
        }

        connectionMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        connection.material = connectionMaterial;
        connection.receiveShadows = true;

        // Associar conexão ao edifício e rastrear para limpeza
        buildingMesh.terrainConnection = connection;
        this.connectionMeshes.set(buildingMesh.name, connection);

        return connection;
    },

    createMinecraftBuildingMaterial(buildingType) {
        const materialName = `minecraftMat_${buildingType.id}`;
        let material = this.materials.get(materialName);

        if (!material) {
            material = new BABYLON.StandardMaterial(materialName, this.scene);

            // Cor baseada no tipo com estilo Minecraft
            if (buildingType.color) {
                const color = BABYLON.Color3.FromHexString(buildingType.color);
                material.diffuseColor = color;
            } else {
                // Cor padrão baseada na categoria
                const categoryMaterial = this.materials.get(buildingType.category);
                if (categoryMaterial) {
                    material.diffuseColor = categoryMaterial.diffuseColor;
                } else {
                    material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                }
            }

            // Propriedades do material estilo Minecraft
            material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Pouco brilho
            material.backFaceCulling = false; // Para melhor visualização dos blocos

            // Transparência para zonas
            if (buildingType.category === 'zoning') {
                material.alpha = 0.6;
            }

            // Adicionar textura procedural pixelada se possível
            try {
                this.addPixelatedTexture(material, buildingType);
            } catch (error) {
                console.warn('⚠️ Não foi possível criar textura pixelada para', buildingType.id);
            }

            this.materials.set(materialName, material);
        }

        return material;
    },

    addPixelatedTexture(material, buildingType) {
        // Verificar se já existe uma textura para este tipo de edifício
        const textureKey = `pixelTex_${buildingType.id}`;
        let dynamicTexture = this.dynamicTextures.get(textureKey);

        if (!dynamicTexture) {
            // Criar textura pixelada simples
            const textureSize = 32; // Pequeno para efeito pixelado
            dynamicTexture = new BABYLON.DynamicTexture(textureKey, textureSize, this.scene);
            const context = dynamicTexture.getContext();

            // Preencher com padrão pixelado baseado na categoria
            const imageData = context.createImageData(textureSize, textureSize);
            const data = imageData.data;

            const baseColor = material.diffuseColor;

            for (let i = 0; i < data.length; i += 4) {
                const variation = (Math.random() - 0.5) * 0.3;
                data[i] = Math.max(0, Math.min(255, (baseColor.r + variation) * 255));     // R
                data[i + 1] = Math.max(0, Math.min(255, (baseColor.g + variation) * 255)); // G
                data[i + 2] = Math.max(0, Math.min(255, (baseColor.b + variation) * 255)); // B
                data[i + 3] = 255; // A
            }

            context.putImageData(imageData, 0, 0);
            dynamicTexture.update();

            // Rastrear para limpeza posterior
            this.dynamicTextures.set(textureKey, dynamicTexture);
        }

        material.diffuseTexture = dynamicTexture;
        material.diffuseTexture.hasAlpha = false;
        material.diffuseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        material.diffuseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        material.diffuseTexture.magFilter = BABYLON.Texture.NEAREST_SAMPLINGMODE; // Pixelado
        material.diffuseTexture.minFilter = BABYLON.Texture.NEAREST_SAMPLINGMODE;
    },

    createSpecializedMesh(buildingType) {
        const size = buildingType.size;
        const category = buildingType.category;
        const type = buildingType.id;

        try {
            switch (category) {
                case 'water':
                    return this.createWaterFacilityMesh(type, size);
                case 'treatment':
                    return this.createTreatmentFacilityMesh(type, size);
                case 'storage':
                    return this.createStorageFacilityMesh(type, size);
                case 'residential':
                    return this.createResidentialMesh(type, size);
                case 'infrastructure':
                    return this.createInfrastructureMesh(type, size);
                case 'zoning':
                    return this.createZoneMesh(type, size);
                case 'power':
                    return this.createPowerFacilityMesh(type, size);
                default:
                    return null;
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao criar mesh especializado para ${type}:`, error);
            return null;
        }
    },

    createWaterFacilityMesh(type, size) {
        // ===== STANDARDIZED 3D MODEL POSITIONING AND SCALING =====
        // Use consistent scaling based on grid cell size
        const buildingSize = size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with reference model (water reservoir)
        const actualSize = buildingSize * cellSize * buildingScale;

        let mesh;

        if (type === 'water_pump') {
            // ===== WATER PUMP - STANDARDIZED SCALING =====
            // Bomba de água - cilindro com base proporcional ao grid
            const base = BABYLON.MeshBuilder.CreateBox("pump_base", {
                width: actualSize * 0.8,
                height: 0.4,
                depth: actualSize * 0.8
            }, this.scene);

            const cylinder = BABYLON.MeshBuilder.CreateCylinder("pump_cylinder", {
                height: 1.8,
                diameter: actualSize * 0.5
            }, this.scene);
            cylinder.position.y = 1.1;

            mesh = this.mergeVisibleMeshes([base, cylinder], `pump_${type}`);

        } else if (type === 'water_well') {
            // ===== WATER WELL - STANDARDIZED SCALING =====
            // Poço - cilindro baixo com anel proporcional
            const well = BABYLON.MeshBuilder.CreateCylinder("well", {
                height: 0.6,
                diameter: actualSize * 0.6
            }, this.scene);

            const ring = BABYLON.MeshBuilder.CreateTorus("well_ring", {
                diameter: actualSize * 0.7,
                thickness: actualSize * 0.05
            }, this.scene);
            ring.position.y = 0.35;

            mesh = this.mergeVisibleMeshes([well, ring], `well_${type}`);
        }

        // ===== STANDARDIZED POSITIONING: Multi-cell building support =====
        if (mesh && buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            mesh.position.x += offset;
            mesh.position.z += offset;
        }

        return mesh;
    },

    createTreatmentFacilityMesh(type, size) {
        // ===== STANDARDIZED 3D MODEL POSITIONING AND SCALING =====
        // Use consistent scaling based on water reservoir reference model
        const buildingSize = size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with reference model
        const actualSize = buildingSize * cellSize * buildingScale;

        // ===== TREATMENT FACILITY - STANDARDIZED SCALING =====
        // Estação de tratamento - edifício industrial com tanques proporcionais
        const main = BABYLON.MeshBuilder.CreateBox("treatment_main", {
            width: actualSize,
            height: 1.8,
            depth: actualSize
        }, this.scene);

        const tankDiameter = actualSize * 0.3;
        const tankOffset = actualSize * 0.25;

        const tank1 = BABYLON.MeshBuilder.CreateCylinder("treatment_tank1", {
            height: 1.2,
            diameter: tankDiameter
        }, this.scene);
        tank1.position.x = -tankOffset;
        tank1.position.y = 1.5;

        const tank2 = BABYLON.MeshBuilder.CreateCylinder("treatment_tank2", {
            height: 1.2,
            diameter: tankDiameter
        }, this.scene);
        tank2.position.x = tankOffset;
        tank2.position.y = 1.5;

        const merged = this.mergeVisibleMeshes([main, tank1, tank2], `treatment_${type}`);

        // ===== STANDARDIZED POSITIONING: Multi-cell building support =====
        if (buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            merged.position.x += offset;
            merged.position.z += offset;
        }

        return merged;
    },

    createStorageFacilityMesh(type, size) {
        // ===== STANDARDIZED 3D MODEL POSITIONING AND SCALING =====
        // Use water reservoir as reference model for consistent scaling
        const buildingSize = size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistent with other building methods
        const actualSize = buildingSize * cellSize * buildingScale;

        if (type === 'water_tank') {
            // ===== WATER RESERVOIR - PROCEDURAL CYLINDER =====
            return this.createWaterTankFallback(buildingSize, cellSize, actualSize);
        } else if (type === 'water_tower') {
            // ===== WATER TOWER - STANDARDIZED SCALING =====
            // Caixa d'água - cilindro elevado com dimensões proporcionais
            const base = BABYLON.MeshBuilder.CreateCylinder("tower_base", {
                height: 3.0, // Proportional to actualSize
                diameter: actualSize * 0.15 // Thin support column
            }, this.scene);

            const tank = BABYLON.MeshBuilder.CreateCylinder("tower_tank", {
                height: 1.2,
                diameter: actualSize * 0.6 // Proportional to building size
            }, this.scene);
            tank.position.y = 2.4; // Position on top of base

            const merged = this.mergeVisibleMeshes([base, tank], `tower_${type}`);

            // ===== STANDARDIZED POSITIONING: Multi-cell building support =====
            if (buildingSize > 1) {
                const offset = (buildingSize - 1) * cellSize * 0.5;
                merged.position.x += offset;
                merged.position.z += offset;
            }

            return merged;
        }

        return null;
    },

    createWaterTankFallback(buildingSize, cellSize, actualSize) {
        // Original procedural water tank
        const tank = BABYLON.MeshBuilder.CreateCylinder("storage_tank", {
            height: 2.5, // Proportional height for visibility
            diameter: actualSize * 0.9 // Slightly smaller than cell for visual clarity
        }, this.scene);

        // Position for multi-cell buildings
        if (buildingSize > 1) {
            const offset = (buildingSize - 1) * cellSize * 0.5;
            tank.position.x += offset;
            tank.position.z += offset;
        }

        return tank;
    },

    createResidentialMesh(type, size) {
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Residencial com dimensões corrigidas =====
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85; // Consistente com createBasicVoxelMesh

        if (type === 'house') {
            // ===== FIX: Casa com dimensões proporcionais ao grid =====
            const houseSize = cellSize * buildingScale;

            const base = BABYLON.MeshBuilder.CreateBox("house_base", {
                width: houseSize,
                height: 1.8,
                depth: houseSize
            }, this.scene);

            const roof = BABYLON.MeshBuilder.CreateCylinder("house_roof", {
                height: 0.6,
                diameterTop: 0,
                diameterBottom: houseSize * 1.2,
                tessellation: 4
            }, this.scene);
            roof.position.y = 1.5;
            roof.rotation.y = Math.PI / 4;

            return this.mergeVisibleMeshes([base, roof], `house_${type}`);

        } else if (type === 'apartment') {
            // ===== FIX: Prédio com dimensões baseadas no tamanho real (size=2) =====
            const apartmentSize = size * cellSize * buildingScale;

            const apartment = BABYLON.MeshBuilder.CreateBox("apartment", {
                width: apartmentSize,
                height: 3.8,
                depth: apartmentSize
            }, this.scene);

            // ===== FIX: Ajustar posição para edifícios multi-célula =====
            if (size > 1) {
                const offset = (size - 1) * cellSize * 0.5;
                apartment.position.x += offset;
                apartment.position.z += offset;
            }

            return apartment;
        }

        return null;
    },

    createInfrastructureMesh(typeOrBuildingType, size) {
        // Determinar se o primeiro parâmetro é um objeto buildingType ou uma string type
        let type, actualSize;
        if (typeof typeOrBuildingType === 'object' && typeOrBuildingType.id) {
            // Chamado com buildingType object
            type = typeOrBuildingType.id;
            actualSize = typeOrBuildingType.size || 1;
        } else {
            // Chamado com type string e size
            type = typeOrBuildingType;
            actualSize = size || 1;
        }

        if (type.includes('road')) {
            // Estrada - plano baixo
            return BABYLON.MeshBuilder.CreateBox("road", {
                width: 1.8, height: 0.1, depth: 1.8
            }, this.scene);

        } else if (type === 'sidewalk') {
            // Calçada - plano ainda mais baixo
            return BABYLON.MeshBuilder.CreateBox("sidewalk", {
                width: 1.6, height: 0.05, depth: 1.6
            }, this.scene);

        } else if (type === 'plaza') {
            // Praça - plano com decoração
            const base = BABYLON.MeshBuilder.CreateBox("plaza_base", {
                width: 3, height: 0.1, depth: 3
            }, this.scene);

            const tree = BABYLON.MeshBuilder.CreateCylinder("plaza_tree", {
                height: 1.5, diameter: 0.3
            }, this.scene);
            tree.position.y = 0.8;

            return this.mergeVisibleMeshes([base, tree], `plaza_${typeOrBuildingType}`);

        }

        // Infraestrutura genérica - usar fallback
        if (typeof typeOrBuildingType === 'object') {
            return this.createBasicVoxelMesh(typeOrBuildingType);
        } else {
            // Criar um objeto buildingType básico para o fallback
            const basicBuildingType = {
                id: type,
                size: actualSize,
                category: 'infrastructure'
            };
            return this.createBasicVoxelMesh(basicBuildingType);
        }
    },

    createZoneMesh(type, size) {
        // Zona - plano transparente com bordas
        const zone = BABYLON.MeshBuilder.CreateBox("zone", {
            width: size * 1.8, height: 0.05, depth: size * 1.8
        }, this.scene);

        return zone;
    },

    createPowerFacilityMesh(type, size) {
        let mesh;

        try {
            if (type === 'hydroelectric_plant') {
                // Hidrelétrica - estrutura complexa com barragem
                const main = BABYLON.MeshBuilder.CreateBox("hydro_main", {
                    width: 4, height: 2.5, depth: 3
                }, this.scene);

                const turbine1 = BABYLON.MeshBuilder.CreateCylinder("hydro_turbine1", {
                    height: 1.5, diameter: 1.2
                }, this.scene);
                turbine1.position.x = -1.5;
                turbine1.position.y = 1.5;

                const turbine2 = BABYLON.MeshBuilder.CreateCylinder("hydro_turbine2", {
                    height: 1.5, diameter: 1.2
                }, this.scene);
                turbine2.position.x = 1.5;
                turbine2.position.y = 1.5;

                mesh = this.mergeVisibleMeshes([main, turbine1, turbine2], `hydro_${type}`);

            } else if (type === 'power_pole') {
                // Poste de energia - torre alta e fina
                const pole = BABYLON.MeshBuilder.CreateCylinder("power_pole", {
                    height: 3, diameter: 0.2
                }, this.scene);

                const crossbar = BABYLON.MeshBuilder.CreateBox("power_crossbar", {
                    width: 1.5, height: 0.1, depth: 0.1
                }, this.scene);
                crossbar.position.y = 2.5;

                mesh = this.mergeVisibleMeshes([pole, crossbar], `pole_${type}`);

            } else if (type === 'thermal_plant') {
                // Termelétrica - edifício industrial com chaminés
                const main = BABYLON.MeshBuilder.CreateBox("thermal_main", {
                    width: 3, height: 2, depth: 2.5
                }, this.scene);

                const chimney1 = BABYLON.MeshBuilder.CreateCylinder("thermal_chimney1", {
                    height: 4, diameter: 0.6
                }, this.scene);
                chimney1.position.x = -1;
                chimney1.position.y = 2.5;

                const chimney2 = BABYLON.MeshBuilder.CreateCylinder("thermal_chimney2", {
                    height: 3.5, diameter: 0.5
                }, this.scene);
                chimney2.position.x = 1;
                chimney2.position.y = 2.25;

                mesh = this.mergeVisibleMeshes([main, chimney1, chimney2], `thermal_${type}`);

            } else if (type === 'nuclear_plant') {
                // Usina nuclear - domo característico
                const base = BABYLON.MeshBuilder.CreateBox("nuclear_base", {
                    width: 4, height: 1.5, depth: 4
                }, this.scene);

                const dome = BABYLON.MeshBuilder.CreateSphere("nuclear_dome", {
                    diameter: 3
                }, this.scene);
                dome.position.y = 2.25;

                const tower = BABYLON.MeshBuilder.CreateCylinder("nuclear_tower", {
                    height: 5, diameterTop: 1.5, diameterBottom: 2
                }, this.scene);
                tower.position.x = 2.5;
                tower.position.y = 2.5;

                mesh = this.mergeVisibleMeshes([base, dome, tower], `nuclear_${type}`);

            } else if (type === 'coal_plant') {
                // Usina a carvão - similar à termelétrica mas mais simples
                const main = BABYLON.MeshBuilder.CreateBox("coal_main", {
                    width: 2.5, height: 1.8, depth: 2
                }, this.scene);

                const chimney = BABYLON.MeshBuilder.CreateCylinder("coal_chimney", {
                    height: 3.5, diameter: 0.8
                }, this.scene);
                chimney.position.y = 2.5;

                mesh = this.mergeVisibleMeshes([main, chimney], `coal_${type}`);

            } else if (type === 'solar_farm') {
                // Fazenda solar - painéis solares
                const base = BABYLON.MeshBuilder.CreateBox("solar_base", {
                    width: 4, height: 0.2, depth: 4
                }, this.scene);

                const panel1 = BABYLON.MeshBuilder.CreateBox("solar_panel1", {
                    width: 1.5, height: 0.1, depth: 2
                }, this.scene);
                panel1.position.x = -1;
                panel1.position.y = 0.8;
                panel1.rotation.z = Math.PI / 6;

                const panel2 = BABYLON.MeshBuilder.CreateBox("solar_panel2", {
                    width: 1.5, height: 0.1, depth: 2
                }, this.scene);
                panel2.position.x = 1;
                panel2.position.y = 0.8;
                panel2.rotation.z = Math.PI / 6;

                mesh = this.mergeVisibleMeshes([base, panel1, panel2], `solar_${type}`);

            } else if (type === 'wind_farm') {
                // Campo eólico - turbinas eólicas
                const base = BABYLON.MeshBuilder.CreateCylinder("wind_base", {
                    height: 0.5, diameter: 1
                }, this.scene);

                const tower = BABYLON.MeshBuilder.CreateCylinder("wind_tower", {
                    height: 3, diameter: 0.3
                }, this.scene);
                tower.position.y = 1.75;

                const nacelle = BABYLON.MeshBuilder.CreateBox("wind_nacelle", {
                    width: 0.8, height: 0.4, depth: 0.4
                }, this.scene);
                nacelle.position.y = 3.2;

                // Pás da turbina
                const blade1 = BABYLON.MeshBuilder.CreateBox("wind_blade1", {
                    width: 0.1, height: 1.5, depth: 0.05
                }, this.scene);
                blade1.position.y = 3.2;
                blade1.position.x = 0.75;

                const blade2 = BABYLON.MeshBuilder.CreateBox("wind_blade2", {
                    width: 0.1, height: 1.5, depth: 0.05
                }, this.scene);
                blade2.position.y = 3.2;
                blade2.position.x = 0.75;
                blade2.rotation.z = 2 * Math.PI / 3;

                const blade3 = BABYLON.MeshBuilder.CreateBox("wind_blade3", {
                    width: 0.1, height: 1.5, depth: 0.05
                }, this.scene);
                blade3.position.y = 3.2;
                blade3.position.x = 0.75;
                blade3.rotation.z = 4 * Math.PI / 3;

                mesh = this.mergeVisibleMeshes([base, tower, nacelle, blade1, blade2, blade3], `wind_${type}`);
            }

            return mesh;

        } catch (error) {
            console.error(`❌ Erro ao criar mesh de energia para ${type}:`, error);
            return null;
        }
    },

    createBasicMesh(buildingType) {
        // ===== BUILDING SIZE AND PROPORTION CORRECTIONS: Mesh básico com dimensões consistentes =====
        const size = buildingType.size || 1;
        const cellSize = this.gridManager.cellSize;
        const buildingScale = 0.85;
        const height = this.getBuildingHeight(buildingType);

        // Usar dimensões consistentes com outros métodos
        const buildingSize = size * cellSize * buildingScale;

        const mesh = BABYLON.MeshBuilder.CreateBox(`building_${buildingType.id}`, {
            width: buildingSize,
            height: height,
            depth: buildingSize
        }, this.scene);

        // ===== FIX: Ajustar posição para edifícios multi-célula =====
        if (size > 1) {
            const offset = (size - 1) * cellSize * 0.5;
            mesh.position.x += offset;
            mesh.position.z += offset;
        }

        return mesh;
    },

    createBuildingMaterial(buildingType) {
        const materialName = `material_${buildingType.id}`;
        let material = this.materials.get(materialName);

        if (!material) {
            material = new BABYLON.StandardMaterial(materialName, this.scene);

            // Cor baseada no tipo
            if (buildingType.color) {
                const color = BABYLON.Color3.FromHexString(buildingType.color);
                material.diffuseColor = color;
            } else {
                // Cor padrão baseada na categoria
                const categoryMaterial = this.materials.get(buildingType.category);
                if (categoryMaterial) {
                    material.diffuseColor = categoryMaterial.diffuseColor;
                } else {
                    material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
                }
            }

            // Propriedades do material
            material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);

            // Transparência para zonas
            if (buildingType.category === 'zoning') {
                material.alpha = 0.6;
            }

            this.materials.set(materialName, material);
        }

        return material;
    },
});
