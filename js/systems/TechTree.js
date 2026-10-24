/**
 * GUARDIÃO DA ÁGUA - ÁRVORE TECNOLÓGICA (evolução das construções)
 *
 * Cada prédio de js/data/buildings.js tem `tier` (1 a 5, TechTree.TIERS), `group` (seção no menu de
 * construção) e `techRequires` — o que precisa estar PRONTO na cidade antes de ele aparecer:
 *   { id: 'water_pump', count: 3 }                          → 3 Bombas de Água prontas
 *   { ids: ['zone_industrial_light', ...], count: 2, label } → 2 prédios quaisquer da lista
 * Atingido uma vez, fica atingido (`reached`, salvo): demolir as bombas não tranca o poço de novo.
 * Depois da tecnologia, o prédio ainda pode pedir o estudo (StudySystem): os dois juntos liberam.
 * Sem DOM (testado em tests/unit/techtree.test.js); a tela é ui/TechTreeUI.js.
 */
class TechTree {
    static TIERS = {
        1: { name: 'Básico', icon: '①' },
        2: { name: 'Intermediário', icon: '②' },
        3: { name: 'Avançado', icon: '③' },
        4: { name: 'Especialista', icon: '④' },
        5: { name: 'Alta tecnologia', icon: '⑤' }
    };

    /** Contagem de prédios prontos em cache por este tempo (ms reais): o menu pergunta várias vezes por segundo. */
    static COUNT_CACHE_MS = 250;

    constructor(gameManager) {
        this.gameManager = gameManager;
        this.reached = new Set();
        this.countCache = null;
        this.countCacheAt = 0;
    }

    reset() {
        this.reached.clear();
        this.countCache = null;
    }

    getType(id) {
        return this.gameManager?.buildingSystem?.buildingTypes?.get(id)
            || (typeof BUILDING_TYPES !== 'undefined' ? BUILDING_TYPES[id] : null);
    }

    getTier(id) {
        return this.getType(id)?.tier || 1;
    }

    /** Prédios prontos por tipo (obras não contam). */
    getFinishedCounts() {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (this.countCache && now - this.countCacheAt < TechTree.COUNT_CACHE_MS) return this.countCache;
        const counts = new Map();
        const buildings = this.gameManager?.buildingSystem?.buildings;
        if (buildings) {
            for (const b of buildings.values()) {
                if (b.underConstruction) continue;
                counts.set(b.type, (counts.get(b.type) || 0) + 1);
            }
        }
        this.countCache = counts;
        this.countCacheAt = now;
        return counts;
    }

    /** Uma construção terminou ou foi demolida: recontar já. */
    invalidate() {
        this.countCache = null;
    }

    /** Nome curto do requisito ("Bomba de Água", "Zonas Industriais"). */
    requirementLabel(req) {
        if (req.label) return req.label;
        return this.getType(req.id)?.name || req.id;
    }

    /** [{ label, ids, have, need, done }] de cada requisito do prédio. */
    getProgress(id) {
        const list = this.getType(id)?.techRequires || [];
        const counts = this.getFinishedCounts();
        return list.map(req => {
            const ids = req.ids || [req.id];
            const have = ids.reduce((sum, t) => sum + (counts.get(t) || 0), 0);
            const need = req.count || 1;
            return { label: this.requirementLabel(req), ids, have: Math.min(have, need), need, done: have >= need };
        });
    }

    /** A tecnologia do prédio já foi atingida? (sem requisito = sim; atingida uma vez fica). */
    isReached(id) {
        if (this.reached.has(id)) return true;
        const type = this.getType(id);
        if (!type) return true;
        const progress = this.getProgress(id);
        if (progress.every(p => p.done)) {
            this.reached.add(id);
            return true;
        }
        return false;
    }

    /** Libera sem cumprir os requisitos (estudo concluído por fora, testes, saves antigos). */
    markReached(id) {
        this.reached.add(id);
    }

    /** Prédios que dependem deste (setas "libera" na árvore). */
    getUnlocks(id) {
        const out = [];
        const types = this.gameManager?.buildingSystem?.buildingTypes;
        const all = types ? [...types.values()] : Object.entries(BUILDING_TYPES).map(([k, v]) => ({ id: k, ...v }));
        for (const t of all) {
            if ((t.techRequires || []).some(r => (r.ids || [r.id]).includes(id))) out.push(t.id);
        }
        return out;
    }

    /**
     * Confere tudo (GameManager.update, ~1 vez por segundo, e ao terminar uma obra) e avisa as tecnologias
     * novas. Devolve os ids recém-atingidos.
     */
    check({ notify = true } = {}) {
        const types = this.gameManager?.buildingSystem?.buildingTypes;
        if (!types) return [];
        const fresh = [];
        for (const t of types.values()) {
            if (this.reached.has(t.id) || !(t.techRequires || []).length) continue;
            if (t.visible === false) continue;
            if (this.isReached(t.id)) fresh.push(t.id);
        }
        if (notify && fresh.length) {
            const names = fresh.map(id => this.getType(id)?.name).filter(Boolean);
            const ui = this.gameManager?.uiManager;
            ui?.showNotification?.(`🔓 Nova tecnologia: ${names.join(', ')}! Veja no menu de construção.`, 'success', 6000);
            ui?.onTechUnlocked?.(fresh);
            if (typeof AudioManager !== 'undefined') AudioManager.playSound?.('sfx_study_unlock', 0.7);
        }
        return fresh;
    }

    getSaveData() {
        return { reached: [...this.reached] };
    }

    /**
     * Save sem árvore (anterior a ela): fica atingido o que o jogador já tinha — prédios construídos e os
     * estudados (com conteúdo de estudo) — para nada que ele usava trancar de novo.
     */
    loadData(data) {
        this.reset();
        if (data && Array.isArray(data.reached)) {
            data.reached.forEach(id => this.reached.add(id));
            return;
        }
        const gm = this.gameManager;
        for (const b of gm?.buildingSystem?.buildings?.values() || []) this.reached.add(b.type);
        const study = gm?.studySystem;
        for (const id of study?.unlockedBuildings || []) {
            if (study.hasStudyContent?.(id)) this.reached.add(id);
        }
        this.check({ notify: false });
    }
}
