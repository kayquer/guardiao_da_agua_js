/**
 * BuildingSystem — Reciclar prédio: tira o prédio do mapa e devolve parte do custo, de RECYCLE_MIN (20%) a
 * RECYCLE_MAX (80%). O que sobe a porcentagem é o conhecimento da cidade: cada tipo de prédio com `recycleBonus`
 * pronto (escola, escola técnica, centro de pesquisa, universidade, cooperativa de reciclagem...) soma uma vez.
 * Parte da classe BuildingSystem (js/systems/BuildingSystem.js), anexada via mixin(): use this.* normalmente.
 */
mixin(BuildingSystem, {
    RECYCLE_MIN: 0.2,
    RECYCLE_MAX: 0.8,

    /** { percent (0,2–0,8), sources: [{ name, bonus }] } — cada tipo com recycleBonus pronto conta uma vez. */
    getRecycleRate() {
        const seen = new Map();
        for (const b of this.buildings.values()) {
            const bonus = b.config?.recycleBonus;
            if (!bonus || !b.active || b.underConstruction || seen.has(b.type)) continue;
            seen.set(b.type, { name: b.config.name, bonus });
        }
        const sources = [...seen.values()].sort((a, b) => b.bonus - a.bonus);
        const percent = Math.min(this.RECYCLE_MAX, this.RECYCLE_MIN + sources.reduce((s, x) => s + x.bonus, 0));
        return { percent, sources };
    },

    /** Pode reciclar? A Prefeitura não (sede da cidade, de graça no tutorial), nem rua, nem durante um tutorial. */
    canRecycleBuilding(building) {
        if (!building?.config || building.config.roadType) return false;
        if (building.type === 'city_hall') return false;
        return !this.gameManager?.tutorialSystem?.isActive;
    },

    /** Quanto volta para o caixa (R$). */
    getRecycleValue(building) {
        return Math.round((building?.config?.cost || 0) * this.getRecycleRate().percent);
    },

    /** Recicla: devolve o valor, tira o prédio (efeitos saem junto, removeBuilding) e avisa. */
    recycleBuilding(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!this.canRecycleBuilding(building)) return false;
        const value = this.getRecycleValue(building);
        const { percent } = this.getRecycleRate();
        const name = building.config.name;
        if (this.gameManager?.selectedBuilding?.id === buildingId) this.gameManager.deselectBuilding?.();
        this.removeBuilding(buildingId);
        this.gameManager?.resourceManager?.adjustResource('budget', value);
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('recycle', { target: building.type, value, percent });
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_cash_register');
        this.showNotification(`♻️ ${name} reciclado: voltaram R$ ${value.toLocaleString('pt-BR')} (${Math.round(percent * 100)}% do custo).`, 'success', 5000);
        return value;
    }
});
