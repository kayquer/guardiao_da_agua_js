/**
 * BuildingSystem — Traçado de ruas (clicar e arrastar)
 * Parte da classe BuildingSystem (js/systems/BuildingSystem.js), anexada via mixin(): use this.* normalmente.
 *
 * No modo construção de rua, o botão esquerdo (ou o dedo) pressionado traça uma linha reta de células
 * pelo eixo dominante a partir da célula inicial (RoadNetwork.linePath), com a prévia de cada célula
 * (verde = constrói, vermelho = ocupada/água/sem dinheiro) e o custo total; soltar constrói todas de uma vez.
 * Clique simples = uma célula. O modo continua ativo para a próxima rua (Esc/botão direito/✖ saem).
 * Os eventos chegam de GameManager.setupBuildingPlacementControls (handleRoadPointer).
 */
mixin(BuildingSystem, {
    /** A célula aceita esta rua? Sem os console.warn do canPlaceBuilding (a prévia testa muitas células). */
    canPlaceRoadAt(gridX, gridZ, typeId) {
        const type = this.buildingTypes.get(typeId);
        if (!type) return { ok: false, reason: 'Tipo inválido' };
        if (!this.isPlacementWithinBounds(gridX, gridZ, 1)) return { ok: false, reason: 'Fora do mapa' };
        const terrain = this.gridManager.getTerrainType(gridX, gridZ);
        if (terrain === 'water') return { ok: false, reason: 'Não dá para fazer rua na água' };
        if (!this.gridManager.canPlaceBuilding(gridX, gridZ, 1)) return { ok: false, reason: 'Lugar ocupado' };
        const allowed = type.requirements?.terrain;
        if (allowed && !allowed.includes(terrain)) {
            return { ok: false, reason: terrain === 'hill' ? `${type.name} não sobe colina: use a Estrada de Terra` : `${type.name} não pode ser feita aqui` };
        }
        return { ok: true };
    },

    /** Para cada célula da linha: pode construir e quanto custa (para até onde o dinheiro dá). */
    planRoadLine(cells, typeId) {
        let budget = this.gameManager?.resourceManager?.resources?.budget?.current ?? Infinity;
        let total = 0, count = 0;
        const plan = cells.map(c => {
            const check = this.canPlaceRoadAt(c.x, c.z, typeId);
            if (!check.ok) return { ...c, ok: false, reason: check.reason };
            const cost = this.calculateConstructionCostWithBonuses(typeId, c.x, c.z);
            if (cost > budget) return { ...c, ok: false, reason: 'Orçamento insuficiente', noMoney: true };
            budget -= cost;
            total += cost;
            count++;
            return { ...c, ok: true, cost };
        });
        return { plan, total, count };
    },

    // ===== ENTRADA (ponteiro) =====
    /** pointerdown/move/up/cancel do canvas no modo construção de rua. Devolve true se tratou o evento. */
    handleRoadPointer(kind, cell) {
        if (!this.previewMode || !this.isRoadType(this.selectedBuildingType)) return false;
        if (kind === 'down') {
            if (!cell) return false;
            this.roadDrag = { start: cell, end: cell };
            this.showRoadLinePreview(cell, cell);
            return true;
        }
        if (!this.roadDrag) {
            if (kind === 'move' && cell) this.updateRoadPreview(cell.x, cell.z);
            return false;
        }
        if (kind === 'move') {
            if (cell && (cell.x !== this.roadDrag.end.x || cell.z !== this.roadDrag.end.z)) {
                this.roadDrag.end = cell;
                this.showRoadLinePreview(this.roadDrag.start, cell);
            }
            return true;
        }
        const drag = this.roadDrag;
        this.roadDrag = null;
        if (kind === 'cancel') {
            this.clearRoadPreview();
            return true;
        }
        // 'up': constrói a linha inteira
        const end = cell ? this.projectRoadEnd(drag.start, cell) : drag.end;
        const cells = RoadNetwork.linePath(drag.start.x, drag.start.z, end.x, end.z);
        this.lastRoadPlacementAt = Date.now();
        this.placeRoadLine(cells, this.selectedBuildingType);
        this.clearRoadPreview();
        if (cell) this.updateRoadPreview(cell.x, cell.z);
        return true;
    },

    projectRoadEnd(start, cell) {
        const path = RoadNetwork.linePath(start.x, start.z, cell.x, cell.z);
        return path[path.length - 1];
    },

    /** Clique sem os eventos de ponteiro (toque sintetizado do mobile): uma célula. */
    placeRoadAtClick(cell) {
        if (Date.now() - (this.lastRoadPlacementAt || 0) < 700) return true; // já tratado no pointerup
        if (!cell) return false;
        this.lastRoadPlacementAt = Date.now();
        return this.placeRoadLine([cell], this.selectedBuildingType).length > 0;
    },

    // ===== PRÉVIA =====
    updateRoadPreview(gridX, gridZ) {
        if (this.roadDrag) return;
        if (this.lastRoadHover && this.lastRoadHover.x === gridX && this.lastRoadHover.z === gridZ) return;
        this.lastRoadHover = { x: gridX, z: gridZ };
        this.showRoadLinePreview({ x: gridX, z: gridZ }, { x: gridX, z: gridZ }, { hover: true });
    },

    showRoadLinePreview(start, end, { hover = false } = {}) {
        const typeId = this.selectedBuildingType;
        const type = this.buildingTypes.get(typeId);
        if (!type) return;
        const cells = RoadNetwork.linePath(start.x, start.z, end.x, end.z);
        const { plan, total, count } = this.planRoadLine(cells, typeId);
        this.clearRoadGhosts();
        this.roadGhosts = plan.map(p => {
            const ghost = this.getRoadGhostTemplate(p.ok).createInstance(`roadGhost_${p.x}_${p.z}`);
            const world = this.gridManager.gridToWorld(p.x, p.z);
            ghost.position.set(world.x, this.getRoadSurfaceHeight(p.x, p.z) + 0.03, world.z);
            ghost.isPickable = false;
            return ghost;
        });
        this.lastRoadPlan = { cells: plan, total, count };

        const ui = this.gameManager?.uiManager;
        if (!ui) return;
        const blocked = plan.find(p => !p.ok);
        let message;
        if (hover) {
            message = blocked
                ? `❌ ${blocked.reason}`
                : `✅ Clique para 1 bloco (R$ ${total.toLocaleString('pt-BR')}) ou arraste para traçar a rua`;
        } else {
            message = `🛣️ ${count} ${count === 1 ? 'bloco' : 'blocos'} · R$ ${total.toLocaleString('pt-BR')}` +
                (blocked ? ` · ${plan.length - count} ${plan.length - count === 1 ? 'pulado' : 'pulados'} (${blocked.reason.toLowerCase()})` : '');
        }
        ui.updateBuildingPlacementFeedback(message, count > 0);
        if (this.gameManager?.canvas) this.gameManager.canvas.style.cursor = count > 0 ? 'crosshair' : 'not-allowed';
    },

    getRoadGhostTemplate(valid) {
        if (!this.roadGhostTemplates) this.roadGhostTemplates = {};
        const key = valid ? 'ok' : 'bad';
        let mesh = this.roadGhostTemplates[key];
        if (mesh && !mesh.isDisposed()) return mesh;
        const size = this.gridManager.cellSize * 0.96;
        mesh = BABYLON.MeshBuilder.CreateBox(`roadGhost_${key}`, { width: size, height: 0.06, depth: size }, this.scene);
        const mat = new BABYLON.StandardMaterial(`roadGhostMat_${key}`, this.scene);
        mat.diffuseColor = valid ? new BABYLON.Color3(0.2, 0.9, 0.35) : new BABYLON.Color3(0.95, 0.2, 0.15);
        mat.emissiveColor = valid ? new BABYLON.Color3(0.05, 0.3, 0.1) : new BABYLON.Color3(0.3, 0.05, 0.03);
        mat.alpha = 0.55;
        mat.metadata = { preview: true };
        mesh.material = mat;
        mesh.isPickable = false;
        mesh.isVisible = false;
        mesh.metadata = { preview: true };
        this.roadGhostTemplates[key] = mesh;
        return mesh;
    },

    clearRoadGhosts() {
        (this.roadGhosts || []).forEach(g => { if (!g.isDisposed()) g.dispose(); });
        this.roadGhosts = [];
    },

    clearRoadPreview() {
        this.clearRoadGhosts();
        this.roadDrag = null;
        this.lastRoadHover = null;
        this.lastRoadPlan = null;
    },

    // ===== CONSTRUÇÃO =====
    /**
     * Constrói a rua em cada célula da lista (pula ocupada/água/inválida, para quando acaba o dinheiro).
     * Instantâneo: sem obra nem espera. Encaixe das peças, trânsito, som, aviso e gancho do tutorial uma vez só.
     */
    placeRoadLine(cells, typeId) {
        const type = this.buildingTypes.get(typeId);
        if (!type?.roadType) return [];
        const placed = [];
        let skipped = 0, noMoney = false, spent = 0;
        const rm = this.gameManager?.resourceManager;
        this.roadBatch = true;
        try {
            for (const c of cells) {
                if (!this.canPlaceRoadAt(c.x, c.z, typeId).ok) {
                    skipped++;
                    continue;
                }
                const cost = this.calculateConstructionCostWithBonuses(typeId, c.x, c.z);
                if (rm && !rm.canAfford(cost)) {
                    noMoney = true;
                    break;
                }
                const building = this.placeBuilding(c.x, c.z, typeId);
                if (building) {
                    placed.push(building);
                    spent += cost;
                } else skipped++;
            }
        } finally {
            this.roadBatch = false;
        }

        if (placed.length) {
            this.refreshRoadPieces(placed.map(b => ({ x: b.gridX, z: b.gridZ })));
            this.gameManager?.cityLifeSystem?.onRoadBuilt();
            this.playBuildingPlacementAudio(type);
            const n = placed.length;
            this.showNotification(`🛣️ ${n} ${n === 1 ? 'bloco' : 'blocos'} de ${type.name} · R$ ${spent.toLocaleString('pt-BR')}` +
                (skipped ? ` (${skipped} ${skipped === 1 ? 'célula pulada' : 'células puladas'})` : ''), 'success');
            this.gameManager?.tutorialSystem?.onBuildingPlaced(placed[0]);
        }
        if (noMoney) {
            this.showNotification(`💰 O dinheiro acabou: faltou para ${type.name}.`, 'warning');
        } else if (!placed.length && cells.length) {
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_build_error', 0.6);
            this.showNotification(`❌ ${this.canPlaceRoadAt(cells[0].x, cells[0].z, typeId).reason || 'Não dá para fazer rua aqui'}`, 'warning');
        }
        return placed;
    }
});
