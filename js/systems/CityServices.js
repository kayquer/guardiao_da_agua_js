/**
 * Serviços públicos (11/2026): escola/universidade, hospital, bombeiros, polícia, atrações e o ritmo das zonas
 * residenciais. Sem DOM nem Babylon (tests/unit/city-services.test.js); dados em js/data/cityServices.js.
 * Mesmo padrão do CityStaff.bonus(key): soma dos prédios prontos com teto; quem usa lê `gm.cityServices?.bonus?.(key)`
 * (sem o sistema, nos testes de unidade, o efeito é neutro).
 *
 * Quem lê: ResourceManager.waterPerPerson (education), getSatisfactionFactors (health), updatePopulation (attraction
 * e residentialPace), EventSystem.startEvent (safety) e BuildingEfficiency (security).
 */
class CityServices {
    constructor(gameManager = null) {
        this.gameManager = gameManager;
    }

    /** Prédios prontos e com efeito aplicado (o mesmo critério das linhas de efeito e do imposto). */
    finishedBuildings() {
        return (this.gameManager?.buildingSystem?.getAllBuildings?.() || [])
            .filter(b => b?.config && !b.underConstruction && b.effectsApplied !== false && b.active !== false);
    }

    /** Efeito somado de uma chave de CITY_SERVICES (0 = nenhum prédio). */
    bonus(key, buildings = this.finishedBuildings()) {
        const def = CITY_SERVICES[key];
        if (!def) return 0;
        return CityServices.sum(def, buildings.map(b => ({ value: b.config[def.field], efficiency: b.efficiency ?? 1 })));
    }

    /** Puro: [{ value, efficiency }] → efeito com teto (per/cap) ou com retorno decrescente (max/scale). */
    static sum(def, items) {
        if (Number.isFinite(def.max)) {
            const total = items.reduce((s, i) => s + (Number(i.value) || 0) * Math.max(0, i.efficiency ?? 1), 0);
            return total > 0 ? def.max * (1 - Math.exp(-total / def.scale)) : 0;
        }
        const total = items.reduce((s, i) => s + (i.value ? def.per * Math.max(0, i.efficiency ?? 1) : 0), 0);
        return Math.min(def.cap, total);
    }

    /** Efeito de UM prédio desse tipo sozinho (linha do cartão no menu de construção). */
    static single(key, config) {
        const def = CITY_SERVICES[key];
        if (!def || !config?.[def.field]) return 0;
        return CityServices.sum(def, [{ value: config[def.field], efficiency: 1 }]);
    }

    /** × chegada de moradores pelo tipo das zonas residenciais prontas (growthRate, média pela capacidade). */
    residentialPace(buildings = this.finishedBuildings()) {
        const bs = this.gameManager?.buildingSystem;
        let cap = 0, weighted = 0;
        for (const b of buildings) {
            const rate = b.config?.growthRate;
            if (!Number.isFinite(rate)) continue;
            const c = bs?.getEffectivePopulationCapacity ? bs.getEffectivePopulationCapacity(b) : (b.config.populationCapacity || 0);
            if (c <= 0) continue;
            cap += c;
            weighted += c * rate;
        }
        return CityServices.pace(cap, weighted);
    }

    static pace(capacity, weighted) {
        return capacity > 0 ? (weighted / capacity) / RESIDENTIAL_PACE_BASE : 1;
    }
}

window.CityServices = CityServices;
