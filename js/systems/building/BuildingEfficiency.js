/**
 * BuildingSystem — Eficiência dos prédios, acesso por rua e consumo de energia das zonas
 * Parte da classe BuildingSystem (js/systems/BuildingSystem.js), anexada via mixin(): use this.* normalmente.
 *
 * building.efficiency (0-2) multiplica o que o prédio entrega: produção de água, redução de poluição,
 * receita (applyBuildingEffects) e o ritmo de crescimento das zonas (ZoneGrowth.js). É recalculada do zero
 * (nunca a partir do valor anterior) por computeBuildingEfficiency:
 *   dano de evento (damageFactor, EventSystem) × sem rua (EFFICIENCY_RULES.noRoadFactor)
 *   × energia (só zonas que consomem: 0,5 + 0,5 × eficiência elétrica da cidade) + bônus de pesquisa.
 *
 * Acesso por rua: o prédio precisa de uma célula de rua (paved_road/dirt_road, config.roadType) encostada
 * em algum lado do seu quadrado (vizinhos N/L/S/O do perímetro; diagonal não conta). Só vale para quem tem
 * algo medido pela eficiência (água, tratamento, receita, zonas): usinas se ligam pela rede elétrica,
 * caixas d'água, praças, jardins e sensores não dependem de rua, e ruas não precisam de rua.
 * Sem rua: ícone 3D "🚧 Sem rua" sobre o prédio (instância de um modelo-base compartilhado, billboard) e uma
 * linha no painel do prédio.
 *
 * Desempenho: nada roda por frame. updateAllBuildingEfficiency monta o conjunto de ruas uma vez e passa
 * por todos os prédios a cada 5 s, ou no frame seguinte a markEfficiencyDirty() (rua/prédio construído ou
 * demolido, save carregado).
 */
const EFFICIENCY_RULES = {
    noRoadFactor: 0.75,        // prédio sem rua encostada funciona a 75%
    zoneEnergyFloor: 0.5,      // zona sem nenhuma energia rende metade (0,5 + 0,5 × eficiência elétrica)
    researchBonusCap: 0.5      // soma dos bônus de centros de pesquisa/universidades próximos
};

mixin(BuildingSystem, {
    // ===== REGRAS (sem Babylon) =====

    /** O prédio depende de rua para funcionar 100%? Aceita o prédio ou o tipo. */
    buildingNeedsRoad(buildingOrType) {
        const config = buildingOrType?.config || buildingOrType;
        if (!config || config.roadType || config.needsRoad === false) return false;
        return config.category === 'zoning' || !!(config.waterProduction || config.pollutionReduction || config.incomeGeneration);
    },

    /** Alguma célula vizinha (N/L/S/O) ao quadrado size×size em (x, z) é rua? `isRoad(x, z)` diz se a célula é rua. */
    areaTouchesRoad(isRoad, x, z, size = 1) {
        for (let i = 0; i < size; i++) {
            if (isRoad(x + i, z - 1) || isRoad(x + i, z + size) || isRoad(x - 1, z + i) || isRoad(x + size, z + i)) return true;
        }
        return false;
    },

    /** Células com rua pronta agora: Set de "x,z". */
    getRoadCellKeys() {
        const keys = new Set();
        for (const b of this.buildings.values()) {
            if (b.config?.roadType && !b.underConstruction) keys.add(`${b.gridX},${b.gridZ}`);
        }
        return keys;
    },

    /** O prédio tem rua encostada? (roadKeys opcional, para não remontar o conjunto a cada prédio) */
    hasRoadLink(building, roadKeys = this.getRoadCellKeys()) {
        if (!this.buildingNeedsRoad(building)) return true;
        return this.areaTouchesRoad((x, z) => roadKeys.has(`${x},${z}`), building.gridX, building.gridZ, building.config?.size || 1);
    },

    /** Consumo de energia do prédio agora (MW): zona consome pela fase (ZONE_GROWTH.effectScale), igual à receita. */
    getBuildingPowerConsumption(building) {
        const full = building?.config?.powerConsumption || 0;
        if (!full) return 0;
        const scale = this.getZoneEffectScale ? this.getZoneEffectScale(building) : 1;
        return Math.round(full * scale * 100) / 100;
    },

    /** Consumo assim que a obra terminar (zona começa na fase 0). Usado no aviso de energia na colocação. */
    getInitialPowerConsumption(buildingType) {
        const full = buildingType?.powerConsumption || 0;
        if (!full) return 0;
        const isZone = this.isZoneBuilding ? this.isZoneBuilding(buildingType) : false;
        return isZone && typeof ZONE_GROWTH !== 'undefined' ? full * ZONE_GROWTH.effectScale[0] : full;
    },

    /** Soma dos bônus de pesquisa por perto (determinístico; limite EFFICIENCY_RULES.researchBonusCap). */
    getResearchEfficiencyBonus(building) {
        let bonus = 0;
        for (const other of this.findNearbyResearchBuildings(building.gridX, building.gridZ)) {
            if (other !== building && other.active && other.config.nearbyEfficiencyBonus) bonus += other.config.nearbyEfficiencyBonus;
        }
        return Math.min(bonus, EFFICIENCY_RULES.researchBonusCap);
    },

    /**
     * Eficiência do prédio (puro sobre os dados recebidos).
     * @param {object} building
     * @param {{hasRoad:boolean, cityEnergy:number, researchBonus?:number}} ctx
     */
    computeBuildingEfficiency(building, ctx) {
        let efficiency = Number.isFinite(building.damageFactor) ? building.damageFactor : 1;
        if (!ctx.hasRoad && this.buildingNeedsRoad(building)) efficiency *= EFFICIENCY_RULES.noRoadFactor;
        const isZone = this.isZoneBuilding ? this.isZoneBuilding(building) : false;
        if (isZone && this.getBuildingPowerConsumption(building) > 0) {
            const energy = Number.isFinite(ctx.cityEnergy) ? Math.max(0, Math.min(1, ctx.cityEnergy)) : 1;
            const floor = EFFICIENCY_RULES.zoneEnergyFloor;
            efficiency *= floor + (1 - floor) * energy;
        }
        efficiency += ctx.researchBonus || 0;
        return Math.round(Math.min(2, Math.max(0, efficiency)) * 100) / 100;
    },

    /** Eficiência elétrica da cidade (1 sem consumo). */
    getCityEnergyEfficiency() {
        const electricity = this.gameManager?.resourceManager?.resources?.electricity;
        return electricity && electricity.consumption > 0 ? electricity.efficiency : 1;
    },

    // ===== ATUALIZAÇÃO =====

    /** Pede o recálculo de todos no próximo update (rua/prédio construído ou demolido, save carregado). */
    markEfficiencyDirty() {
        this.lastEfficiencyUpdate = 0;
    },

    /** Recalcula todos os prédios prontos: um conjunto de ruas, uma passada. */
    updateAllBuildingEfficiency() {
        const roadKeys = this.getRoadCellKeys();
        for (const building of this.buildings.values()) {
            try {
                this.updateBuildingEfficiency(building, roadKeys);
            } catch (error) {
                console.warn(`⚠️ Erro ao atualizar eficiência do edifício ${building.id}:`, error);
            }
        }
        this.lastEfficiencyUpdate = Date.now();
    },

    /** Eficiência de um prédio pronto + avisos (sem rua, falta de energia) e reaplicação dos efeitos se mudou. */
    updateBuildingEfficiency(building, roadKeys = this.getRoadCellKeys()) {
        if (!building || !building.config || !building.active || building.underConstruction) return;

        const hasRoad = this.hasRoadLink(building, roadKeys);
        const hadNoRoad = !!building.noRoad;
        building.noRoad = !hasRoad;
        this.syncNoRoadIcon(building);

        // Falta de energia: ícone ⚡❌ em quem consome
        const cityEnergy = this.getCityEnergyEfficiency();
        const hasPowerShortage = this.getBuildingPowerConsumption(building) > 0 && cityEnergy < 1;
        if (hasPowerShortage !== !!building.hasPowerShortage) {
            building.hasPowerShortage = hasPowerShortage;
            this.updatePowerShortageVisuals(building, hasPowerShortage);
        }

        const efficiency = this.computeBuildingEfficiency(building, {
            hasRoad, cityEnergy, researchBonus: this.getResearchEfficiencyBonus(building)
        });
        // Consumo de energia da zona fora do que está nos totais (save antigo): refaz os efeitos também
        const powerOutOfSync = building.effectsApplied && Number.isFinite(building.appliedPowerConsumption)
            && Math.abs(building.appliedPowerConsumption - this.getBuildingPowerConsumption(building)) > 0.01;
        const changed = !Number.isFinite(building.efficiency) || Math.abs(building.efficiency - efficiency) > 0.005;

        if (changed || powerOutOfSync) {
            const old = building.efficiency;
            const hadEffects = !!building.effectsApplied;
            if (hadEffects) this.applyBuildingEffects(building, false); // tira com a eficiência antiga
            building.efficiency = efficiency;
            if (hadEffects) this.applyBuildingEffects(building, true);
            log(`🔧 Eficiência de ${building.config.name}: ${Number(old).toFixed(2)} → ${efficiency.toFixed(2)}`);
        }

        // Painel aberto deste prédio: mostra o aviso/eficiência novos
        const gm = this.gameManager;
        if ((changed || hadNoRoad !== building.noRoad) && gm?.selectedBuilding === building) {
            gm.uiManager?.showBuildingSelectionInfo?.(building);
        }
    },

    /** Eficiência no momento da conclusão (completeConstruction), antes de somar os efeitos. */
    getEfficiencyOnCompletion(building) {
        return this.computeBuildingEfficiency(building, {
            hasRoad: this.hasRoadLink(building),
            cityEnergy: this.getCityEnergyEfficiency(),
            researchBonus: this.getResearchEfficiencyBonus(building)
        });
    },

    // ===== CONSERTO (dano de enchente, EventSystem.damageInfrastructure) =====

    isBuildingDamaged(building) {
        return Number.isFinite(building?.damageFactor) && building.damageFactor < 1;
    },

    /** Metade do custo do prédio × fração perdida (dano 0,2 → 10% do custo), arredondado em R$ 100. */
    getRepairCost(building) {
        if (!this.isBuildingDamaged(building)) return 0;
        const lost = 1 - building.damageFactor;
        return Math.max(100, Math.round((building.config?.cost || 0) * lost * 0.5 / 100) * 100);
    },

    /** Paga o conserto e devolve a eficiência total. false se não estiver danificado ou faltar dinheiro. */
    repairBuilding(buildingId) {
        const building = this.buildings.get(buildingId);
        const rm = this.gameManager?.resourceManager;
        if (!building || !rm || !this.isBuildingDamaged(building)) return false;
        const cost = this.getRepairCost(building);
        if (!rm.spendBudget(cost)) {
            this.gameManager.uiManager?.showNotification(`💰 Faltam R$ ${Math.ceil(cost - rm.resources.budget.current).toLocaleString('pt-BR')} para consertar.`, 'warning');
            return false;
        }
        delete building.damageFactor;
        this.updateBuildingEfficiency(building);
        this.gameManager.uiManager?.showNotification(`🔧 ${building.config.name} consertado (R$ ${cost.toLocaleString('pt-BR')}).`, 'success');
        return true;
    },

    /** Linhas de aviso do painel do prédio (UIManager.generateBuildingStats). */
    generateEfficiencyWarnings(building) {
        if (!building?.active || building.underConstruction) return '';
        let html = '';
        if (this.isBuildingDamaged(building)) {
            const percent = Math.round(building.damageFactor * 100);
            html += `<div class="stat-item efficiency-warning damage-warning" style="color:#ffb74d">🌊 Danificado pela enchente: funciona a ${percent}%. Conserte para voltar a 100%.</div>`;
        }
        if (building.noRoad) {
            const percent = Math.round(EFFICIENCY_RULES.noRoadFactor * 100);
            html += `<div class="stat-item efficiency-warning no-road-warning" style="color:#ffb74d">🚧 Sem rua ligando: funciona a ${percent}%. Construa uma rua encostada.</div>`;
        }
        const isZone = this.isZoneBuilding ? this.isZoneBuilding(building) : false;
        if (isZone && building.hasPowerShortage) {
            const energy = Math.round(this.getCityEnergyEfficiency() * 100);
            html += `<div class="stat-item efficiency-warning zone-energy-warning" style="color:#ffb74d">⚡ Falta energia (${energy}% da demanda): a zona rende menos e cresce mais devagar.</div>`;
        }
        return html;
    },

    // ===== ÍCONE 3D "SEM RUA" =====

    /** Mostra/esconde e reposiciona o ícone conforme building.noRoad. */
    syncNoRoadIcon(building) {
        if (!this.scene || typeof BABYLON === 'undefined') return;
        if (!building.noRoad || !building.mesh || building.mesh.isDisposed?.()) {
            this.removeNoRoadIcon(building);
            return;
        }
        let icon = building.noRoadIcon;
        if (!icon || icon.isDisposed()) {
            const template = this.getNoRoadIconTemplate();
            if (!template) return;
            icon = template.createInstance(`noRoadIcon_${building.id}`);
            icon.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            icon.isPickable = false;
            icon.metadata = { noRoadIcon: true, buildingId: building.id };
            building.noRoadIcon = icon;
        }
        // Acima do topo atual (zona cresce: reposiciona a cada passada), um pouco à esquerda do ícone ⚡❌
        const mesh = building.mesh;
        mesh.computeWorldMatrix(true);
        const { min, max } = mesh.getHierarchyBoundingVectors(true, m => !m.metadata?.noRoadIcon);
        icon.position.set((min.x + max.x) / 2 - 0.5, max.y + 1.0, (min.z + max.z) / 2 - 0.5);
    },

    removeNoRoadIcon(building) {
        if (building?.noRoadIcon) {
            if (!building.noRoadIcon.isDisposed()) building.noRoadIcon.dispose();
            building.noRoadIcon = null;
        }
    },

    /** Modelo-base escondido do ícone (plano + textura desenhados uma vez; nunca descarte enquanto houver ícones). */
    getNoRoadIconTemplate() {
        if (this.noRoadIconTemplate && !this.noRoadIconTemplate.isDisposed()) return this.noRoadIconTemplate;
        const scene = this.scene;
        const plane = BABYLON.MeshBuilder.CreatePlane('noRoadIconTemplate', { width: 1.6, height: 0.6 }, scene);
        const texture = new BABYLON.DynamicTexture('noRoadIconTexture', { width: 256, height: 96 }, scene, false);
        texture.hasAlpha = true;
        const ctx = texture.getContext();
        ctx.clearRect(0, 0, 256, 96);
        ctx.fillStyle = 'rgba(255, 193, 7, 0.95)';
        ctx.strokeStyle = 'rgba(60, 40, 0, 1)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(8, 8, 240, 80, 22); else ctx.rect(8, 8, 240, 80);
        ctx.fill();
        ctx.stroke();
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#3a2a00';
        ctx.fillText('🚧 Sem rua', 128, 50);
        texture.update();

        const material = new BABYLON.StandardMaterial('noRoadIconMat', scene);
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.opacityTexture = texture;
        material.emissiveColor = new BABYLON.Color3(1, 1, 1);
        material.disableLighting = true;
        material.backFaceCulling = false;
        material.disableDepthWrite = true;
        plane.material = material;
        plane.renderingGroupId = 2;
        plane.isPickable = false;
        plane.isVisible = false; // só as instâncias aparecem
        this.noRoadIconTemplate = plane;
        return plane;
    }
});
