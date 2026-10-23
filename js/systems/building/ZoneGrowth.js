/**
 * BuildingSystem — Crescimento das zonas (residencial, comercial, industrial) e o lote 3D de cada fase
 * Parte da classe BuildingSystem (js/systems/BuildingSystem.js), anexada via mixin(): use this.* normalmente.
 *
 * Dados: js/data/zoneLots.js (ZONE_LOTS por zona e fase, ZONE_PROPS, ZONE_GROWTH, ZONE_LOT_MODEL_SCALE).
 *
 * Como funciona:
 * 1. A zona passa pelo canteiro de obras padrão (underConstruction) como qualquer prédio. O mesh do prédio é
 *    o LOTE: uma laje fina do tamanho da zona (raiz, clicável, metadata.buildingId, material próprio com a cor
 *    do chão da fase) com a moldura na cor da zona por cima.
 * 2. Pronta (completeConstruction → onZoneConstructionComplete) ela entra na fase 0 e cresce sozinha pelo
 *    tempo de jogo (simNow, nunca Date.now): cada fase leva ZONE_GROWTH.stageMs com ritmo 1; satisfação,
 *    falta de água e de energia mudam o ritmo (getZoneGrowthRate) — sem água a zona para.
 * 3. As peças da fase (casas/prédios/fábricas da Kenney e peças de obra procedurais) são INSTÂNCIAS
 *    (createInstance) de modelos-base escondidos por arquivo (zonePieceTemplates — nunca descarte), filhas da
 *    laje: giram, sobem e são descartadas junto com o prédio. Ao mudar de fase só entram/saem as peças que
 *    mudaram; as novas sobem do chão (ZONE_GROWTH.growMs). Cada instância leva metadata.buildingId (clique).
 * 4. Efeitos: capacidade de população (getEffectivePopulationCapacity), empregos (getEffectiveJobCapacity) e
 *    receita valem ZONE_GROWTH.effectScale[fase]. A receita está nos totais do ResourceManager, então mudar
 *    de fase = tirar com a escala antiga (zoneAppliedScale), mudar, somar com a nova.
 */
mixin(BuildingSystem, {
    // ===== REGRAS (sem Babylon) =====

    /** É uma zona com lote em ZONE_LOTS? Aceita o prédio (buildingData) ou o tipo. */
    isZoneBuilding(buildingOrType) {
        const config = buildingOrType?.config || buildingOrType;
        return !!config && config.category === 'zoning' && typeof ZONE_LOTS !== 'undefined' && !!ZONE_LOTS[config.id];
    },

    /** Fase atual (0-3) de uma zona pronta; null se não é zona ou ainda está em obra. */
    getZoneStage(building) {
        if (!this.isZoneBuilding(building) || building.underConstruction) return null;
        const stage = Number(building.zoneStage);
        return Number.isInteger(stage) ? Math.max(0, Math.min(3, stage)) : 0;
    },

    /** Fração dos efeitos da zona na fase (1 para quem não é zona). */
    getZoneEffectScale(building) {
        const stage = this.getZoneStage(building);
        return stage === null ? 1 : ZONE_GROWTH.effectScale[stage];
    },

    /** Capacidade de população que a zona dá AGORA (pela fase). Prédios comuns: o valor cheio. */
    getEffectivePopulationCapacity(building) {
        const config = building?.config || {};
        const full = config.populationCapacity || config.population || 0;
        return Math.round(full * this.getZoneEffectScale(building));
    },

    /** Empregos que a zona oferece agora (pela fase). */
    getEffectiveJobCapacity(building) {
        return Math.round((building?.config?.jobCapacity || 0) * this.getZoneEffectScale(building));
    },

    /**
     * Escala da receita dentro de applyBuildingEffects: ao somar grava a escala usada (zoneAppliedScale), ao
     * tirar usa a gravada — assim um save antigo (receita cheia nos totais) desconta o que somou.
     */
    getZoneIncomeScale(building, add) {
        if (!this.isZoneBuilding(building)) return 1;
        if (add) {
            building.zoneAppliedScale = this.getZoneEffectScale(building);
            return building.zoneAppliedScale;
        }
        return Number.isFinite(building.zoneAppliedScale) ? building.zoneAppliedScale : this.getZoneEffectScale(building);
    },

    /**
     * Ritmo de crescimento (multiplica o tempo que passa): satisfação 0-100 vai de 0,5× a 1,5×; energia em
     * falta (eficiência < 1) freia na mesma proporção, até 0,25×; sem água a zona para (0).
     * @param {{satisfaction:number, waterShortage:boolean, energyEfficiency:number}} c
     */
    computeZoneGrowthRate(c) {
        if (c.waterShortage) return 0;
        const satisfaction = Math.max(0, Math.min(100, Number.isFinite(c.satisfaction) ? c.satisfaction : 50));
        const energy = Number.isFinite(c.energyEfficiency) ? Math.max(0, Math.min(1, c.energyEfficiency)) : 1;
        return (0.5 + satisfaction / 100) * Math.max(0.25, energy);
    },

    /** Condições da cidade agora (ResourceManager) para computeZoneGrowthRate. */
    getZoneGrowthConditions() {
        const rm = this.gameManager?.resourceManager;
        if (!rm) return { satisfaction: 50, waterShortage: false, energyEfficiency: 1 };
        const electricity = rm.resources.electricity || {};
        return {
            satisfaction: rm.resources.population?.satisfaction,
            waterShortage: !!rm.hasWaterShortage?.(),
            // sem consumo nenhum a eficiência fica 1; zona que gasta energia sente a falta
            energyEfficiency: electricity.consumption > 0 ? electricity.efficiency : 1
        };
    },

    /**
     * Avança o progresso da fase de uma zona: dtMs de tempo de jogo × ritmo. Devolve a nova fase se mudou
     * (null se não). Puro sobre o objeto do prédio; quem chama troca a malha e os efeitos (setZoneStage).
     */
    advanceZoneProgress(building, dtMs, rate) {
        const stage = this.getZoneStage(building);
        if (stage === null || stage >= 3 || !(dtMs > 0) || !(rate > 0)) return null;
        building.zoneProgress = (building.zoneProgress || 0) + (dtMs * rate) / ZONE_GROWTH.stageMs[stage];
        if (building.zoneProgress < 1) return null;
        building.zoneProgress = stage + 1 >= 3 ? 1 : Math.min(building.zoneProgress - 1, 0.99);
        return stage + 1;
    },

    /**
     * Tempo de jogo (ms) até a próxima fase no ritmo `rate` (o de agora, se omitido). null = fase final ou não é
     * zona; Infinity = parada (sem água). O painel divide pelo timeScale (2x/3x) para mostrar o tempo real.
     */
    getZoneTimeToNextStage(building, rate = this.computeZoneGrowthRate(this.getZoneGrowthConditions())) {
        const stage = this.getZoneStage(building);
        if (stage === null || stage >= 3) return null;
        const effective = rate * (building.efficiency > 0 ? building.efficiency : 1);
        if (!(effective > 0)) return Infinity;
        return (1 - this.getZoneStageProgress(building)) * ZONE_GROWTH.stageMs[stage] / effective;
    },

    /**
     * Indicador do painel: quanto falta para a próxima fase e o que está acelerando/freando.
     * @returns {{eta: string, reason: string}|null} null na fase final
     */
    describeZoneGrowth(building) {
        const c = this.getZoneGrowthConditions();
        const ms = this.getZoneTimeToNextStage(building, this.computeZoneGrowthRate(c));
        if (ms === null) return null;
        if (ms === Infinity) return { eta: 'Crescimento parado', reason: 'Falta água na cidade: a zona só cresce com água.' };
        const scale = this.gameManager?.timeScale > 0 ? this.gameManager.timeScale : 1;
        const sec = Math.max(1, Math.ceil(ms / scale / 1000));
        const eta = sec < 60 ? `~${sec} s` : `~${Math.floor(sec / 60)} min${sec % 60 ? ` ${sec % 60} s` : ''}`;
        let reason = '';
        if (c.energyEfficiency < 1) reason = 'Mais devagar: falta energia.';
        else if (c.satisfaction < 40) reason = 'Mais devagar: moradores insatisfeitos.';
        else if (c.satisfaction >= 70) reason = 'Mais rápido: a cidade está satisfeita.';
        return { eta: `Próxima fase em ${eta}`, reason };
    },

    /** Painel do prédio selecionado: barra, fase e tempo restante, sem redesenhar o painel inteiro. */
    updateZoneStagePanel() {
        const selected = this.gameManager?.selectedBuilding;
        if (!selected || typeof document === 'undefined' || this.getZoneStage(selected) === null) return;
        const bar = document.getElementById(`zone-stage-bar-${selected.id}`);
        if (bar) bar.style.width = `${Math.round(this.getZoneStageProgress(selected) * 100)}%`;
        const name = document.getElementById(`zone-stage-name-${selected.id}`);
        const stage = this.getZoneStage(selected);
        if (name) name.textContent = `${ZONE_GROWTH.stageNames[stage]} (${stage + 1}/4)`;
        const eta = document.getElementById(`zone-stage-eta-${selected.id}`);
        if (eta) {
            const info = this.describeZoneGrowth(selected);
            eta.textContent = info ? info.eta : 'Zona completa';
            eta.title = info?.reason || '';
            const why = document.getElementById(`zone-stage-why-${selected.id}`);
            if (why) why.textContent = info?.reason || '';
        }
    },

    /** Progresso 0-1 da fase atual (para a barra no painel). Fase final = 1. */
    getZoneStageProgress(building) {
        const stage = this.getZoneStage(building);
        if (stage === null) return 0;
        return stage >= 3 ? 1 : Math.max(0, Math.min(1, building.zoneProgress || 0));
    },

    // ===== CICLO DE VIDA =====

    /** Obra terminou: a zona vira área livre (fase 0) — chamado por completeConstruction antes dos efeitos. */
    onZoneConstructionComplete(building) {
        if (!this.isZoneBuilding(building)) return;
        building.zoneStage = 0;
        building.zoneProgress = 0;
        this.refreshZoneLot(building, { animate: true });
    },

    /** Recria o estado da zona de um save (restoreBuilding). Save antigo sem o campo: zona pronta começa em 0. */
    restoreZoneState(building, saved) {
        if (!this.isZoneBuilding(building) || building.underConstruction) return;
        const hasStage = Number.isInteger(saved?.zoneStage);
        building.zoneStage = hasStage ? Math.max(0, Math.min(3, saved.zoneStage)) : 0;
        building.zoneProgress = Number.isFinite(saved?.zoneProgress) ? Math.max(0, Math.min(1, saved.zoneProgress)) : 0;
        // Os totais salvos já contam a receita: de um save novo, na escala da fase; de um antigo, cheia
        if (building.effectsApplied) building.zoneAppliedScale = hasStage ? this.getZoneEffectScale(building) : 1;
        this.refreshZoneLot(building, { animate: false });
    },

    /** Muda a fase: efeitos (tira com a escala antiga, soma com a nova), malha e painel. */
    setZoneStage(building, stage) {
        if (!this.isZoneBuilding(building) || building.underConstruction) return false;
        const next = Math.max(0, Math.min(3, Math.round(stage)));
        if (next === this.getZoneStage(building)) return false;
        const hadEffects = !!building.effectsApplied;
        if (hadEffects) this.applyBuildingEffects(building, false);
        building.zoneStage = next;
        if (next >= 3) building.zoneProgress = 1;
        else if (!(building.zoneProgress < 1)) building.zoneProgress = 0;
        if (hadEffects) this.applyBuildingEffects(building, true);
        this.refreshZoneLot(building, { animate: true });

        const gm = this.gameManager;
        if (gm?.selectedBuilding === building) gm.updateSelectionInfo?.(building);
        log(`🏘️ ${building.config.name} (${building.id}) agora na fase ${next}: ${ZONE_GROWTH.stageNames[next]}`);
        return true;
    },

    /** Chamado no update do BuildingSystem: avança as zonas pelo tempo de jogo (a cada ~0,5 s de jogo). */
    updateZoneGrowth() {
        const now = this.simNow();
        if (this.lastZoneGrowthTime === undefined || now < this.lastZoneGrowthTime) {
            this.lastZoneGrowthTime = now;
            return;
        }
        const dt = now - this.lastZoneGrowthTime;
        if (dt < 500) return;
        this.lastZoneGrowthTime = now;
        const rate = this.computeZoneGrowthRate(this.getZoneGrowthConditions());
        if (rate <= 0) return this.updateZoneStagePanel();
        for (const building of this.buildings.values()) {
            if (!building.active || !this.isZoneBuilding(building)) continue;
            const next = this.advanceZoneProgress(building, dt, rate * (building.efficiency > 0 ? building.efficiency : 1));
            if (next !== null && this.setZoneStage(building, next) && typeof AudioManager !== 'undefined') {
                AudioManager.playSound('sfx_zone_grow'); // casinhas brotando (gap no manifesto: várias zonas juntas = um som)
            }
        }
        this.updateZoneStagePanel();
    },

    /** Debug/testes: põe a zona direto numa fase (?debug: gameManager.buildingSystem.forceZoneStage(id, 2)). */
    forceZoneStage(buildingId, stage) {
        const building = this.buildings.get(buildingId);
        if (!building || building.underConstruction) return false;
        building.zoneProgress = 0;
        return this.setZoneStage(building, stage);
    },

    // ===== MALHA DO LOTE =====

    /** Mesh do prédio para uma zona: a laje do lote (base em y = 0) com a moldura na cor da zona. */
    createZoneLotMesh(buildingType) {
        const cell = this.gridManager.cellSize;
        const side = (buildingType.size || 1) * cell - 0.08;
        const lot = BABYLON.MeshBuilder.CreateBox(`zoneLot_${buildingType.id}`, { width: side, height: 0.1, depth: side }, this.scene);
        lot.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 0.05, 0));

        const material = new BABYLON.StandardMaterial(`zoneLotMat_${buildingType.id}_${lot.uniqueId}`, this.scene);
        material.diffuseColor = this.getZoneGroundColor(buildingType, 0);
        material.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
        material.emissiveColor = new BABYLON.Color3(0.06, 0.06, 0.06);
        material.metadata = { perBuilding: true };
        lot.material = material;

        // Moldura na cor da zona (marcação do terreno), material compartilhado por tipo
        const t = 0.1;
        const parts = [[side, t, 0, (side - t) / 2], [side, t, 0, -(side - t) / 2], [t, side - 2 * t, (side - t) / 2, 0], [t, side - 2 * t, -(side - t) / 2, 0]]
            .map(([w, d, x, z]) => {
                const vd = BABYLON.VertexData.CreateBox({ width: w, height: 0.03, depth: d });
                vd.transform(BABYLON.Matrix.Translation(x, 0.115, z));
                return vd;
            });
        const borderData = parts[0];
        borderData.merge(parts.slice(1));
        const border = new BABYLON.Mesh(`zoneBorder_${buildingType.id}_${lot.uniqueId}`, this.scene);
        borderData.applyToMesh(border);
        border.material = this.getZoneBorderMaterial(buildingType);
        border.isPickable = false;
        border.parent = lot;

        lot.metadata = { fromModel: true, zoneLot: true };
        this.requestZoneLotModels(buildingType.id);
        return lot;
    },

    /** Cor do chão: terra batida nas fases 0-1; grama/calçada/concreto (ZONE_LOTS.ground) depois. */
    getZoneGroundColor(buildingType, stage) {
        if (stage < 2) return new BABYLON.Color3(0.6, 0.47, 0.33);
        const ground = ZONE_LOTS[buildingType.id]?.ground;
        if (ground === 'grass') return new BABYLON.Color3(0.42, 0.66, 0.33);
        if (ground === 'paved') return new BABYLON.Color3(0.74, 0.74, 0.72);
        return new BABYLON.Color3(0.56, 0.56, 0.56);
    },

    getZoneBorderMaterial(buildingType) {
        const name = `zoneBorderMat_${buildingType.id}`;
        let material = this.materials.get(name);
        if (!material) {
            material = new BABYLON.StandardMaterial(name, this.scene);
            const color = BABYLON.Color3.FromHexString(buildingType.color || '#ffffff');
            material.diffuseColor = color;
            material.emissiveColor = color.scale(0.35);
            material.specularColor = new BABYLON.Color3(0, 0, 0);
            this.materials.set(name, material);
        }
        return material;
    },

    /** Arquivos .glb usados nas 4 fases do lote. */
    getZoneLotFiles(typeId) {
        const lot = ZONE_LOTS[typeId];
        if (!lot) return [];
        return [...new Set(lot.stages.flat().map(p => p.file).filter(f => f.endsWith('.glb')))];
    },

    /** Começa a carregar os modelos do lote (uma vez por arquivo) e redesenha as zonas quando chegarem. */
    requestZoneLotModels(typeId) {
        if (!this.zonePieceTemplates) this.zonePieceTemplates = new Map();
        if (!this.zonePieceRequests) this.zonePieceRequests = new Set();
        const scene = this.scene;
        this.getZoneLotFiles(typeId).forEach(file => {
            if (this.zonePieceTemplates.has(file) || this.zonePieceRequests.has(file)) return;
            this.zonePieceRequests.add(file);
            this.loadBuildingModelFile(file).then(data => {
                if (!data || this.scene !== scene || scene.isDisposed) return;
                this.zonePieceTemplates.set(file, this.createZonePieceTemplate(file, data));
                for (const building of this.buildings.values()) {
                    if (this.isZoneBuilding(building) && !building.underConstruction && this.zoneLotNeedsFile(building, file)) {
                        this.refreshZoneLot(building, { animate: false });
                    }
                }
            }).catch(error => {
                console.warn(`⚠️ Peça de zona indisponível (${file}):`, error?.message || error);
            });
        });
    },

    zoneLotNeedsFile(building, file) {
        const stage = this.getZoneStage(building);
        return stage !== null && ZONE_LOTS[building.type].stages[stage].some(p => p.file === file);
    },

    /** Modelo-base escondido de um .glb: tamanho do lote (ZONE_LOT_MODEL_SCALE), centrado, base em y = 0. */
    createZonePieceTemplate(file, data) {
        const source = data.vertexData;
        const vd = new BABYLON.VertexData();
        vd.positions = Float32Array.from(source.positions);
        vd.normals = source.normals ? Float32Array.from(source.normals) : null;
        vd.uvs = source.uvs ? Float32Array.from(source.uvs) : null;
        vd.colors = source.colors ? Float32Array.from(source.colors) : null;
        vd.indices = source.indices.slice ? source.indices.slice() : Array.from(source.indices);

        const min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
        const max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < vd.positions.length; i += 3) {
            min.minimizeInPlaceFromFloats(vd.positions[i], vd.positions[i + 1], vd.positions[i + 2]);
            max.maximizeInPlaceFromFloats(vd.positions[i], vd.positions[i + 1], vd.positions[i + 2]);
        }
        const scale = ZONE_LOT_MODEL_SCALE * this.gridManager.cellSize;
        vd.transform(BABYLON.Matrix.Translation(-(min.x + max.x) / 2, -min.y, -(min.z + max.z) / 2)
            .multiply(BABYLON.Matrix.Scaling(scale, scale, scale)));

        const template = new BABYLON.Mesh(`zonePieceTemplate_${file}`, this.scene);
        vd.applyToMesh(template, false);
        template.isVisible = false; // o modelo-base não aparece; as instâncias sim
        template.isPickable = false;

        const material = new BABYLON.StandardMaterial(`zonePieceMat_${file}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
        material.emissiveColor = new BABYLON.Color3(0.14, 0.14, 0.15); // como os prédios da Kenney
        material.diffuseTexture = data.texture;
        material.backFaceCulling = false;
        template.material = material;
        return template;
    },

    /** Modelo-base de uma peça de obra procedural (ZONE_PROPS), criado na primeira vez. */
    getZonePropTemplate(name) {
        if (!this.zonePieceTemplates) this.zonePieceTemplates = new Map();
        const key = `prop:${name}`;
        if (this.zonePieceTemplates.has(key)) return this.zonePieceTemplates.get(key);
        const spec = ZONE_PROPS[name];
        if (!spec) return null;

        const template = this.createZonePropTemplate(name, spec);
        template.isVisible = false;
        template.isPickable = false;
        if (!this.zonePropMaterial) {
            const material = new BABYLON.StandardMaterial('zonePropMat', this.scene);
            material.diffuseColor = new BABYLON.Color3(1, 1, 1);
            material.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);
            material.emissiveColor = new BABYLON.Color3(0.12, 0.12, 0.12);
            material.backFaceCulling = false;
            this.zonePropMaterial = material;
        }
        template.material = this.zonePropMaterial;
        this.zonePieceTemplates.set(key, template);
        return template;
    },

    /**
     * Geometria das peças de obra, em unidades do mundo, centrada no chão (x/z) com base em y = 0, cores de
     * vértice. Fundação e andaime têm 1 × 1 × 1 célula e são esticados pela instância (w/d/h da peça).
     */
    createZonePropTemplate(name, spec) {
        const c = this.gridManager.cellSize;
        const parts = [];
        const rgb = (r, g, b) => new BABYLON.Color4(r, g, b, 1);
        const paint = (vd, color) => {
            const n = vd.positions.length / 3;
            vd.colors = new Float32Array(n * 4);
            for (let i = 0; i < n; i++) vd.colors.set([color.r, color.g, color.b, 1], i * 4);
            return vd;
        };
        const box = (w, h, d, x, y, z, color, rotY = 0) => {
            const vd = BABYLON.VertexData.CreateBox({ width: w * c, height: h * c, depth: d * c });
            vd.transform(BABYLON.Matrix.RotationY(rotY).multiply(BABYLON.Matrix.Translation(x * c, (y + h / 2) * c, z * c)));
            parts.push(paint(vd, color));
        };
        const cyl = (top, bottom, h, x, y, z, color, tessellation = 8, matrix = null) => {
            const vd = BABYLON.VertexData.CreateCylinder({ height: h * c, diameterTop: top * c, diameterBottom: bottom * c, tessellation });
            vd.transform((matrix || BABYLON.Matrix.Identity()).multiply(BABYLON.Matrix.Translation(x * c, (y + h / 2) * c, z * c)));
            parts.push(paint(vd, color));
        };
        const wood = rgb(0.62, 0.42, 0.22), orange = rgb(1, 0.5, 0.1), white = rgb(0.95, 0.95, 0.92);
        const concrete = rgb(0.72, 0.71, 0.68), rebar = rgb(0.45, 0.28, 0.2), yellow = rgb(0.98, 0.76, 0.1);
        const dark = rgb(0.2, 0.2, 0.24), steel = rgb(0.55, 0.57, 0.62), dirt = rgb(0.5, 0.36, 0.24);

        switch (name) {
            case 'stake':
                box(0.05, 0.24, 0.05, 0, 0, 0, wood);
                box(0.06, 0.06, 0.06, 0, 0.24, 0, orange);
                break;
            case 'cone':
                cyl(0.015, 0.09, 0.12, 0, 0.02, 0, orange, 10);
                cyl(0.04, 0.05, 0.025, 0, 0.065, 0, white, 10);
                box(0.1, 0.02, 0.1, 0, 0, 0, dark);
                break;
            case 'dirt': {
                const flat = BABYLON.Matrix.Scaling(1, 1, spec.d / spec.w);
                cyl(0.12, spec.w, spec.h, 0, 0, 0, dirt, 7, flat);
                cyl(0.05, 0.2, 0.08, 0.08, spec.h - 0.02, 0, rgb(0.45, 0.32, 0.2), 6);
                break;
            }
            case 'bricks':
                box(0.3, 0.04, 0.24, 0, 0, 0, wood);
                box(0.27, 0.12, 0.21, 0, 0.04, 0, rgb(0.72, 0.33, 0.22));
                break;
            case 'pipes':
                // três tubos deitados ao longo de X (dois embaixo, um em cima)
                [[-0.05, 0.04], [0.05, 0.04], [0, 0.11]].forEach(([z, y]) => {
                    const vd = BABYLON.VertexData.CreateCylinder({ height: 0.42 * c, diameter: 0.08 * c, tessellation: 8 });
                    vd.transform(BABYLON.Matrix.RotationZ(Math.PI / 2).multiply(BABYLON.Matrix.Translation(0, y * c, z * c)));
                    parts.push(paint(vd, steel));
                });
                break;
            case 'foundation':
                box(1, 0.06, 1, 0, 0, 0, concrete);
                [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45], [0, -0.45], [0, 0.45], [-0.45, 0], [0.45, 0]]
                    .forEach(([x, z]) => box(0.025, 0.16, 0.025, x, 0.06, z, rebar));
                break;
            case 'scaffold': {
                box(0.84, 0.92, 0.84, 0, 0, 0, rgb(0.8, 0.78, 0.74)); // a obra em si (paredes subindo)
                [[-0.47, -0.47], [0.47, -0.47], [-0.47, 0.47], [0.47, 0.47], [0, -0.47], [0.47, 0]]
                    .forEach(([x, z]) => box(0.03, 1, 0.03, x, 0, z, steel));
                [0.3, 0.62, 0.96].forEach(y => {
                    box(0.98, 0.03, 0.06, 0, y, -0.47, wood);
                    box(0.06, 0.03, 0.98, 0.47, y, 0, wood);
                    box(0.98, 0.02, 0.02, 0, y + 0.12, -0.49, steel);
                    box(0.02, 0.02, 0.98, 0.49, y + 0.12, 0, steel);
                });
                box(0.84, 0.04, 0.84, 0, 0.92, 0, concrete);
                break;
            }
            case 'digger':
                box(0.42, 0.06, 0.08, 0.02, 0, -0.09, dark);
                box(0.42, 0.06, 0.08, 0.02, 0, 0.09, dark);
                box(0.3, 0.1, 0.22, 0.05, 0.06, 0, yellow);
                box(0.12, 0.12, 0.14, 0.1, 0.16, -0.03, rgb(0.3, 0.45, 0.6));
                box(0.2, 0.04, 0.05, -0.15, 0.2, 0, yellow, 0);
                box(0.04, 0.16, 0.05, -0.23, 0.06, 0, yellow);
                box(0.07, 0.06, 0.12, -0.21, 0, 0, dark);
                break;
            case 'crane': {
                // Mastro à direita (+X) do centro; lança para -X e contra-lança com o contrapeso para +X
                const mx = 0.35;
                box(0.36, 0.06, 0.36, mx, 0, 0, concrete);
                box(0.12, 1.86, 0.12, mx, 0.06, 0, yellow);
                [0.4, 0.8, 1.2, 1.6].forEach(y => box(0.14, 0.02, 0.14, mx, y, 0, rgb(0.85, 0.62, 0.08)));
                box(0.14, 0.1, 0.12, mx, 1.86, 0, rgb(0.3, 0.45, 0.6));
                box(1.3, 0.05, 0.08, 0, 1.94, 0, yellow);
                box(0.16, 0.12, 0.14, 0.57, 1.88, 0, concrete);
                box(0.03, 0.08, 0.03, mx, 1.99, 0, yellow);
                box(0.008, 0.9, 0.008, -0.45, 1.04, 0, dark);
                box(0.05, 0.05, 0.05, -0.45, 0.99, 0, dark);
                break;
            }
            default:
                box(spec.w, spec.h, spec.d, 0, 0, 0, concrete);
        }

        const vd = parts[0];
        if (parts.length > 1) vd.merge(parts.slice(1), true);
        const mesh = new BABYLON.Mesh(`zonePropTemplate_${name}`, this.scene);
        vd.applyToMesh(mesh, false);
        return mesh;
    },

    /** Modelo-base da peça, ou null se o .glb ainda não carregou. */
    getZonePieceTemplate(file) {
        if (file.startsWith('prop:')) return this.getZonePropTemplate(file.slice(5));
        return this.zonePieceTemplates?.get(file) || null;
    },

    /**
     * Põe no lote as peças da fase atual. Mantém as que continuam (mesmo arquivo e lugar), descarta as que
     * saíram e cria as novas (subindo do chão se animate). Sem os .glb prontos, espera (requestZoneLotModels
     * chama de novo quando chegarem).
     */
    refreshZoneLot(building, { animate = false } = {}) {
        const lot = building.mesh;
        const stage = this.getZoneStage(building);
        if (!lot || lot.isDisposed() || stage === null) return;

        if (lot.material && building.config) {
            const target = building.originalMaterial || lot.material;
            if (target?.metadata?.perBuilding) target.diffuseColor = this.getZoneGroundColor(building.config, stage);
        }

        const pieces = ZONE_LOTS[building.type].stages[stage];
        const missing = pieces.filter(p => !this.getZonePieceTemplate(p.file));
        if (missing.length) {
            this.requestZoneLotModels(building.type);
            return;
        }

        const size = building.config.size || 1;
        const cell = this.gridManager.cellSize;
        const keyOf = p => `${p.file}|${p.x}|${p.z}|${p.rot || 0}|${p.scale || 1}|${p.w || ''}|${p.d || ''}|${p.h || ''}`;
        const current = new Map((building.zonePieces || []).map(item => [item.key, item]));
        const next = [];
        const shadowGenerator = this.gameManager?.shadowGenerator;
        const top = 0.1; // topo da laje

        pieces.forEach((piece, index) => {
            const key = keyOf(piece);
            const kept = current.get(key);
            if (kept && !kept.node.isDisposed()) {
                current.delete(key);
                next.push(kept);
                return;
            }
            const template = this.getZonePieceTemplate(piece.file);
            const instance = template.createInstance(`zonePiece_${building.id}_${stage}_${index}`);
            instance.parent = lot;
            instance.position.set((piece.x - size / 2) * cell, top, (piece.z - size / 2) * cell);
            // rot: quartos de volta como building.rotation (1 = fachada para -X, 3 = para +X); o lote inteiro
            // gira junto com a laje (building.rotation), porque as peças são filhas dela
            instance.rotation.y = (piece.rot || 0) * Math.PI / 2;
            const s = piece.scale || 1;
            const isProp = piece.file.startsWith('prop:');
            instance.scaling.set(s * (isProp && piece.w ? piece.w : 1), s * (isProp && piece.h ? piece.h : 1), s * (isProp && piece.d ? piece.d : 1));
            instance.isPickable = true;
            instance.metadata = { buildingId: building.id, zonePiece: true };
            instance.receiveShadows = true;
            if (shadowGenerator) shadowGenerator.addShadowCaster(instance);
            const item = { key, node: instance, targetY: instance.scaling.y };
            if (animate) this.growZonePiece(item, index);
            next.push(item);
        });

        current.forEach(item => this.disposeZonePiece(item));
        building.zonePieces = next;
        this.fitZoneLabel(building);
    },

    /** Peça nova sobe do chão (só visual; escala em y de quase 0 até a final). */
    growZonePiece(item, index) {
        const node = item.node;
        const duration = ZONE_GROWTH.growMs;
        const delay = index * 90;
        const start = performance.now() + delay;
        node.scaling.y = item.targetY * 0.02;
        const step = () => {
            if (node.isDisposed()) return;
            const t = Math.max(0, Math.min(1, (performance.now() - start) / duration));
            node.scaling.y = item.targetY * Math.max(0.02, this.easeOutCubic(t));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    },

    disposeZonePiece(item) {
        const node = item.node;
        if (!node || node.isDisposed()) return;
        this.gameManager?.shadowGenerator?.removeShadowCaster(node);
        node.dispose();
    },

    /** Rótulo acima da peça mais alta do lote (a laje é baixa). */
    fitZoneLabel(building) {
        const lot = building.mesh;
        const label = lot?.nameLabel;
        if (!label || label.isDisposed?.()) return;
        let top = 0.1;
        (building.zonePieces || []).forEach(({ node, targetY }) => {
            const height = node.sourceMesh?.getBoundingInfo().boundingBox.maximum.y || 0;
            top = Math.max(top, 0.1 + height * (targetY || node.scaling.y));
        });
        label.position.y = Math.max(label.position.y, lot.position.y + top + 1);
    }
});
