/**
 * BuildingSystem — Árvores plantadas pelo jogador ("Muda de Árvore", tree_sapling)
 * Parte da classe BuildingSystem (js/systems/BuildingSystem.js), anexada via mixin(): use this.* normalmente.
 *
 * Dados: js/data/buildings.js → tree_sapling.treeStages (4 etapas: nome, ms, scale, waterConsumption,
 * pollutionReduction). Mesmo padrão das zonas (ZoneGrowth.js):
 * 1. A muda passa pelo canteiro de obras padrão (rápido: é barata). O mesh do prédio é a COVA: um monte de terra
 *    escura (mulch) com borda de terra clara e o tutor (estaca de madeira com amarrilho) — é o que diferencia a
 *    plantada da nativa, junto com a copa verde-limão (TreeSystem.getPlantedTemplate).
 * 2. Pronta (completeConstruction → onTreeConstructionComplete) ela entra na etapa 0 e cresce sozinha pelo tempo
 *    de jogo (simNow, nunca Date.now). Na etapa 0 a muda depende de rega: com falta de água na cidade ela para.
 * 3. A árvore é uma INSTÂNCIA do modelo-base das plantadas, filha da cova (gira e é descartada junto), com
 *    metadata.buildingId (clique na copa seleciona) e escala da etapa (cresce animada).
 * 4. Efeitos: etapa 0 só consome água; etapas 1-3 não consomem água e tiram poluição (crescente). Os valores
 *    somados ficam em building.treeApplied, e mudar de etapa = tirar o somado, mudar, somar o novo
 *    (applyPlantedTreeEffects, chamado por applyBuildingEffects).
 */
mixin(BuildingSystem, {
    // ===== REGRAS (sem Babylon) =====

    /** É uma muda de árvore? Aceita o prédio (buildingData) ou o tipo. */
    isPlantedTree(buildingOrType) {
        const config = buildingOrType?.config || buildingOrType;
        return !!config?.plantedTree && Array.isArray(config.treeStages) && config.treeStages.length === 4;
    },

    /** Etapa atual (0-3) de uma árvore plantada pronta; null se não é árvore plantada ou ainda está em obra. */
    getTreeStage(building) {
        if (!this.isPlantedTree(building) || building.underConstruction) return null;
        const stage = Number(building.treeStage);
        return Number.isInteger(stage) ? Math.max(0, Math.min(3, stage)) : 0;
    },

    /** Dados da etapa (treeStages[etapa]); a etapa 0 para quem ainda está em obra. */
    getTreeStageData(building) {
        const stages = building?.config?.treeStages;
        if (!stages) return null;
        return stages[this.getTreeStage(building) ?? 0];
    },

    /** O que a árvore faz agora na cidade: { water: L/min consumidos, pollution: poluição/min tirada }. */
    getTreeEffects(building) {
        if (this.getTreeStage(building) === null) return { water: 0, pollution: 0 };
        const data = this.getTreeStageData(building);
        return { water: data.waterConsumption || 0, pollution: data.pollutionReduction || 0 };
    },

    /**
     * Soma/tira os efeitos da árvore no ResourceManager. Ao somar guarda o que somou (treeApplied); ao tirar,
     * tira exatamente o que foi somado — assim mudar de etapa nunca deixa sobra nos totais.
     */
    applyPlantedTreeEffects(building, add) {
        const rm = this.gameManager?.resourceManager || (typeof window !== 'undefined' ? window.gameManager?.resourceManager : null);
        if (add) building.treeApplied = this.getTreeEffects(building);
        const applied = building.treeApplied || this.getTreeEffects(building);
        if (rm) {
            if (applied.water) {
                if (add) rm.addWaterConsumption(applied.water);
                else rm.removeWaterConsumption(applied.water);
            }
            if (applied.pollution) {
                if (add) rm.addPollutionReduction(applied.pollution);
                else rm.removePollutionReduction(applied.pollution);
            }
        }
        if (!add) building.treeApplied = null;
    },

    /** Ritmo de crescimento: a muda (etapa 0) só cresce com água na cidade; depois, sempre 1. */
    computeTreeGrowthRate(stage, { waterShortage = false } = {}) {
        if (stage === 0 && waterShortage) return 0;
        return 1;
    },

    getTreeGrowthConditions() {
        const rm = this.gameManager?.resourceManager;
        return { waterShortage: !!rm?.hasWaterShortage?.() };
    },

    /** Avança o progresso da etapa (dtMs de tempo de jogo × ritmo). Devolve a nova etapa se mudou, senão null. */
    advanceTreeProgress(building, dtMs, rate) {
        const stage = this.getTreeStage(building);
        if (stage === null || stage >= 3 || !(dtMs > 0) || !(rate > 0)) return null;
        const ms = building.config.treeStages[stage].ms;
        building.treeProgress = (building.treeProgress || 0) + (dtMs * rate) / ms;
        if (building.treeProgress < 1) return null;
        building.treeProgress = stage + 1 >= 3 ? 1 : Math.min(building.treeProgress - 1, 0.99);
        return stage + 1;
    },

    /** Progresso 0-1 da etapa atual (barra do painel). Etapa final = 1. */
    getTreeStageProgress(building) {
        const stage = this.getTreeStage(building);
        if (stage === null) return 0;
        return stage >= 3 ? 1 : Math.max(0, Math.min(1, building.treeProgress || 0));
    },

    /** Tempo de jogo (ms) até a próxima etapa. null = etapa final/não é árvore; Infinity = parada (sem água). */
    getTreeTimeToNextStage(building, conditions = this.getTreeGrowthConditions()) {
        const stage = this.getTreeStage(building);
        if (stage === null || stage >= 3) return null;
        const rate = this.computeTreeGrowthRate(stage, conditions);
        if (!(rate > 0)) return Infinity;
        return (1 - this.getTreeStageProgress(building)) * building.config.treeStages[stage].ms / rate;
    },

    /** Indicador do painel: "Próxima etapa em ~N s" (tempo real, ÷ timeScale) e o motivo se parada. */
    describeTreeGrowth(building) {
        const ms = this.getTreeTimeToNextStage(building);
        if (ms === null) return null;
        if (ms === Infinity) return { eta: 'Crescimento parado', reason: 'Falta água na cidade: a muda precisa de rega para crescer.' };
        const scale = this.gameManager?.timeScale > 0 ? this.gameManager.timeScale : 1;
        const sec = Math.max(1, Math.ceil(ms / scale / 1000));
        const eta = sec < 60 ? `~${sec} s` : `~${Math.floor(sec / 60)} min${sec % 60 ? ` ${sec % 60} s` : ''}`;
        return { eta: `Próxima etapa em ${eta}`, reason: '' };
    },

    /** Resumo das plantadas para o painel de poluição: quantas, quantas ainda mudas e quanto limpam. */
    getPlantedTreeSummary() {
        let count = 0, saplings = 0, pollution = 0, water = 0;
        for (const building of this.buildings.values()) {
            if (!this.isPlantedTree(building) || building.underConstruction) continue;
            count++;
            if (this.getTreeStage(building) === 0) saplings++;
            if (building.effectsApplied && building.treeApplied) {
                pollution += building.treeApplied.pollution || 0;
                water += building.treeApplied.water || 0;
            }
        }
        return { count, saplings, pollution, water };
    },

    // ===== CICLO DE VIDA =====

    /** Obra terminou: vira muda (etapa 0) — chamado por completeConstruction antes dos efeitos. */
    onTreeConstructionComplete(building) {
        if (!this.isPlantedTree(building)) return;
        building.treeStage = 0;
        building.treeProgress = 0;
        this.refreshPlantedTree(building, { animate: true });
    },

    /** Estado do save (restoreBuilding). Os totais salvos já contam os efeitos da etapa: só marca treeApplied. */
    restoreTreeState(building, saved) {
        if (!this.isPlantedTree(building) || building.underConstruction) return;
        building.treeStage = Number.isInteger(saved?.treeStage) ? Math.max(0, Math.min(3, saved.treeStage)) : 0;
        building.treeProgress = Number.isFinite(saved?.treeProgress) ? Math.max(0, Math.min(1, saved.treeProgress)) : 0;
        building.treeApplied = building.effectsApplied ? this.getTreeEffects(building) : null;
        this.refreshPlantedTree(building, { animate: false });
    },

    /** Muda a etapa: efeitos (tira o somado, soma o novo), malha e painel. */
    setTreeStage(building, stage) {
        if (!this.isPlantedTree(building) || building.underConstruction) return false;
        const next = Math.max(0, Math.min(3, Math.round(stage)));
        if (next === this.getTreeStage(building)) return false;
        const hadEffects = !!building.effectsApplied;
        if (hadEffects) this.applyBuildingEffects(building, false);
        building.treeStage = next;
        if (next >= 3) building.treeProgress = 1;
        else if (!(building.treeProgress < 1)) building.treeProgress = 0;
        if (hadEffects) this.applyBuildingEffects(building, true);
        this.refreshPlantedTree(building, { animate: true });

        const gm = this.gameManager;
        if (gm?.selectedBuilding === building) gm.updateSelectionInfo?.(building);
        if (next === 1 && gm?.uiManager?.showNotification) {
            gm.uiManager.showNotification('🌳 Uma muda virou árvore jovem: não precisa mais de rega e começou a limpar o ar!', 'success', 4000);
        }
        log(`🌳 ${building.config.name} (${building.id}) agora na etapa ${next}: ${building.config.treeStages[next].name}`);
        return true;
    },

    /** Chamado no update do BuildingSystem: avança as árvores plantadas pelo tempo de jogo (a cada ~0,5 s). */
    updateTreeGrowth() {
        const now = this.simNow();
        if (this.lastTreeGrowthTime === undefined || now < this.lastTreeGrowthTime) {
            this.lastTreeGrowthTime = now;
            return;
        }
        const dt = now - this.lastTreeGrowthTime;
        if (dt < 500) return;
        this.lastTreeGrowthTime = now;
        const conditions = this.getTreeGrowthConditions();
        for (const building of this.buildings.values()) {
            if (!building.active || !this.isPlantedTree(building)) continue;
            const stage = this.getTreeStage(building);
            const next = this.advanceTreeProgress(building, dt, this.computeTreeGrowthRate(stage, conditions));
            if (next !== null) this.setTreeStage(building, next);
        }
        this.updateTreeStagePanel();
    },

    /** Debug/testes: põe a árvore direto numa etapa (?debug: gameManager.buildingSystem.forceTreeStage(id, 2)). */
    forceTreeStage(buildingId, stage) {
        const building = this.buildings.get(buildingId);
        if (!building || building.underConstruction) return false;
        building.treeProgress = 0;
        return this.setTreeStage(building, stage);
    },

    /** Painel do prédio selecionado: barra e tempo restante, sem redesenhar o painel inteiro. */
    updateTreeStagePanel() {
        const selected = this.gameManager?.selectedBuilding;
        if (!selected || typeof document === 'undefined' || this.getTreeStage(selected) === null) return;
        const bar = document.getElementById(`tree-stage-bar-${selected.id}`);
        if (bar) bar.style.width = `${Math.round(this.getTreeStageProgress(selected) * 100)}%`;
        const eta = document.getElementById(`tree-stage-eta-${selected.id}`);
        if (eta) {
            const info = this.describeTreeGrowth(selected);
            eta.textContent = info ? info.eta : 'Árvore madura: crescimento completo';
            const why = document.getElementById(`tree-stage-why-${selected.id}`);
            if (why) why.textContent = info?.reason || '';
        }
    },

    // ===== MALHA =====

    /**
     * Mesh do prédio para a muda: a cova (base em y = 0) com mulch escuro, borda de terra clara e o tutor de
     * madeira com amarrilho verde. Cores de vértice + material próprio branco (o da obra é um clone dele).
     */
    createPlantedTreeMesh(buildingType) {
        const c = this.gridManager.cellSize;
        const parts = [];
        const paint = (vd, r, g, b) => {
            const n = vd.positions.length / 3;
            vd.colors = new Float32Array(n * 4);
            for (let i = 0; i < n; i++) vd.colors.set([r, g, b, 1], i * 4);
            parts.push(vd);
        };
        const cyl = (top, bottom, h, x, y, z, color, tessellation = 12) => {
            const vd = BABYLON.VertexData.CreateCylinder({ height: h * c, diameterTop: top * c, diameterBottom: bottom * c, tessellation });
            vd.transform(BABYLON.Matrix.Translation(x * c, (y + h / 2) * c, z * c));
            paint(vd, ...color);
        };
        const box = (w, h, d, x, y, z, color) => {
            const vd = BABYLON.VertexData.CreateBox({ width: w * c, height: h * c, depth: d * c });
            vd.transform(BABYLON.Matrix.Translation(x * c, (y + h / 2) * c, z * c));
            paint(vd, ...color);
        };
        cyl(0.6, 0.66, 0.03, 0, 0, 0, [0.62, 0.48, 0.32]);      // borda de terra clara (anel)
        cyl(0.44, 0.52, 0.05, 0, 0.02, 0, [0.27, 0.17, 0.1]);   // mulch escuro da cova
        box(0.035, 0.62, 0.035, 0.12, 0.02, 0.05, [0.66, 0.47, 0.25]); // tutor (estaca)
        box(0.05, 0.03, 0.05, 0.12, 0.38, 0.05, [0.2, 0.62, 0.25]);   // amarrilho
        const vd = parts[0];
        vd.merge(parts.slice(1), true);
        const mesh = new BABYLON.Mesh(`plantedTree_${buildingType.id}`, this.scene);
        vd.applyToMesh(mesh, false);

        const material = new BABYLON.StandardMaterial(`plantedTreeMat_${mesh.uniqueId}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
        material.emissiveColor = new BABYLON.Color3(0.08, 0.08, 0.08);
        material.metadata = { perBuilding: true };
        mesh.material = material;
        mesh.metadata = { fromModel: true, plantedTree: true };
        return mesh;
    },

    /** Põe/ajusta a árvore da etapa atual na cova (instância do modelo das plantadas, crescendo se animate). */
    refreshPlantedTree(building, { animate = false } = {}) {
        const root = building.mesh;
        const stage = this.getTreeStage(building);
        if (!root || root.isDisposed() || stage === null) return;
        const target = building.config.treeStages[stage].scale;
        let tree = building.treeMesh;
        if (!tree || tree.isDisposed()) {
            const template = this.gameManager?.treeSystem?.getPlantedTemplate?.();
            if (!template) return;
            tree = template.createInstance(`plantedTreeCrown_${building.id}`);
            tree.parent = root;
            tree.position.set(0, 0.05, 0);
            tree.rotation.y = Math.random() * Math.PI * 2;
            tree.isPickable = true;
            tree.metadata = { buildingId: building.id, plantedTree: true };
            tree.scaling.setAll(animate ? 0.05 : target);
            this.gameManager?.shadowGenerator?.addShadowCaster(tree);
            building.treeMesh = tree;
        }
        if (!animate) {
            tree.scaling.setAll(target);
            return;
        }
        const from = tree.scaling.x;
        const start = performance.now();
        const duration = 900;
        const step = () => {
            if (tree.isDisposed()) return;
            const t = Math.min(1, (performance.now() - start) / duration);
            tree.scaling.setAll(from + (target - from) * this.easeOutCubic(t));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
});
