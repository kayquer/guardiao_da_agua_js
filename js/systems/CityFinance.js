/**
 * Financeiro da prefeitura (11/2026) — impostos por grupo (moradores, comércio e serviços, indústrias). Sem DOM
 * nem Babylon (testado em tests/unit/city-hall.test.js). Dados em js/data/cityHall.js (TAX_LEVELS, TAX_GROUPS).
 *
 * Quem lê os efeitos:
 *   - ResourceManager.calculateTaxRevenue → revenue(group) no imposto por morador, no de comércio/turismo e na renda
 *     de zonas comerciais/industriais e prédios de comércio/turismo (incomeAdjust);
 *   - ResourceManager.getSatisfactionFactors → satisfactionNow() (entra devagar, SATISFACTION_EASE_S);
 *   - ResourceManager.calculatePopulationAttraction → attraction();
 *   - ZoneGrowth.computeZoneGrowthRate → growth(zoneType); BuildingEfficiency → efficiencyBonus(building);
 *   - tick → confiança das empresas (reputação 'business') aos poucos.
 * Contra o truque de subir e baixar: cada imposto só muda de novo depois de CHANGE_COOLDOWN_MS de jogo, e a
 * satisfação acompanha o nível devagar.
 */
class CityFinance {
    static CHANGE_COOLDOWN_MS = 2 * 60 * 1000; // 1 "mês" de jogo (LoanManager.MONTH_MS)
    static SATISFACTION_EASE_S = 60;          // a satisfação leva ~1 min de jogo para chegar ao efeito do nível
    static GROUPS = ['residents', 'commerce', 'industry'];

    constructor() {
        this.reset();
    }

    reset() {
        this.levels = { residents: 'normal', commerce: 'normal', industry: 'normal' };
        this.changedAt = { residents: -Infinity, commerce: -Infinity, industry: -Infinity };
        this.satisfactionNowValue = 0; // efeito atual (vai até o alvo aos poucos)
    }

    static levelIndex(id) {
        const i = TAX_LEVELS.findIndex(l => l.id === id);
        return i < 0 ? 2 : i;
    }

    static level(id) {
        return TAX_LEVELS[CityFinance.levelIndex(id)];
    }

    index(group) {
        return CityFinance.levelIndex(this.levels[group]);
    }

    /** Multiplicador da receita do grupo (0,6 … 1,4). */
    revenue(group) {
        return TAX_LEVELS[this.index(group)].revenue;
    }

    /** Alvo de satisfação pelo imposto dos moradores, já com o alívio da assistente social (complaint 0-1). */
    satisfactionTarget(complaintRelief = 0) {
        const v = TAX_GROUPS.residents.satisfaction[this.index('residents')];
        return v < 0 ? v * (1 - Math.max(0, Math.min(1, complaintRelief))) : v;
    }

    /** Efeito de satisfação de agora (o que o painel 😊 mostra). */
    satisfactionNow() {
        return Math.round(this.satisfactionNowValue * 10) / 10;
    }

    attraction() {
        return TAX_GROUPS.residents.attraction[this.index('residents')];
    }

    /** × velocidade das fases de uma zona comercial/industrial (1 para as outras). */
    growth(zoneCategory) {
        if (zoneCategory === 'commercial') return TAX_GROUPS.commerce.growth[this.index('commerce')];
        if (zoneCategory === 'industrial') return TAX_GROUPS.industry.growth[this.index('industry')];
        return 1;
    }

    /** Grupo de imposto de um prédio: 'commerce' (zona comercial, comércio/turismo), 'industry' (zona industrial) ou null. */
    static groupOf(config) {
        if (!config) return null;
        if (config.zoneType && config.category === 'industrial') return 'industry';
        if (config.zoneType && config.category === 'commercial') return 'commerce';
        if (config.taxGroup === 'commerce' || config.taxGroup === 'tourism') return 'commerce';
        return null;
    }

    /** + eficiência do prédio pelo imposto do grupo dele (0 para quem não paga esse imposto). */
    efficiencyBonus(config) {
        const group = CityFinance.groupOf(config);
        return group ? TAX_GROUPS[group].efficiency[this.index(group)] : 0;
    }

    /** Pode mudar este imposto agora? → { ok, waitMs } */
    canChange(group, now) {
        const wait = (this.changedAt[group] ?? -Infinity) + CityFinance.CHANGE_COOLDOWN_MS - now;
        return { ok: wait <= 0, waitMs: Math.max(0, wait) };
    }

    /** Muda o nível. → { ok, reason? } (mesmo nível = nada; espera ainda correndo = recusa). */
    setLevel(group, levelId, now) {
        if (!CityFinance.GROUPS.includes(group) || !TAX_LEVELS.some(l => l.id === levelId)) return { ok: false, reason: 'Nível desconhecido' };
        if (this.levels[group] === levelId) return { ok: false, reason: 'Já está neste nível' };
        const gate = this.canChange(group, now);
        if (!gate.ok) return { ok: false, reason: `Mude de novo daqui a ~${Math.ceil(gate.waitMs / 1000)} s de jogo` };
        this.levels[group] = levelId;
        this.changedAt[group] = now;
        return { ok: true };
    }

    /**
     * Prévia de trocar o nível (puro sobre os números passados): { revenueDelta (R$/min), satisfaction, growth,
     * efficiency, attraction } — base = { residents, commerce, industry } receita de hoje de cada grupo (R$/min).
     */
    preview(group, levelId, base = {}) {
        const from = this.index(group), to = CityFinance.levelIndex(levelId);
        const now = TAX_LEVELS[from].revenue, next = TAX_LEVELS[to].revenue;
        const g = TAX_GROUPS[group];
        const out = { revenueDelta: Math.round((base[group] || 0) / now * (next - now)) };
        if (group === 'residents') {
            out.satisfaction = g.satisfaction[to] - g.satisfaction[from];
            out.attraction = g.attraction[to];
        } else {
            out.growth = g.growth[to];
            out.efficiency = g.efficiency[to];
        }
        return out;
    }

    /** A cada segundo de jogo: satisfação vai até o alvo; confiança das empresas mexe aos poucos. */
    tick(dtMs, gm) {
        const dt = Math.max(0, dtMs || 0) / 1000;
        if (!dt) return;
        const relief = gm?.cityStaff?.bonus?.('taxComplaint') || 0;
        const target = this.satisfactionTarget(relief);
        const k = Math.min(1, dt / CityFinance.SATISFACTION_EASE_S);
        this.satisfactionNowValue += (target - this.satisfactionNowValue) * k;
        if (Math.abs(target - this.satisfactionNowValue) < 0.05) this.satisfactionNowValue = target;
        const trust = (TAX_GROUPS.commerce.trust[this.index('commerce')] + TAX_GROUPS.industry.trust[this.index('industry')]) * dt / 60;
        // direto no número (changeReputation escreveria no histórico a cada minuto); o painel de missões mostra
        const rep = gm?.questSystem?.stakeholderReputation;
        if (trust && rep) {
            const before = Number.isFinite(rep.business) ? rep.business : 50;
            rep.business = Math.max(0, Math.min(100, before + trust));
        }
    }

    getSaveData() {
        return { levels: { ...this.levels }, changedAt: { ...this.changedAt }, satisfaction: this.satisfactionNowValue };
    }

    loadData(data) {
        this.reset();
        if (!data) return;
        for (const g of CityFinance.GROUPS) {
            if (TAX_LEVELS.some(l => l.id === data.levels?.[g])) this.levels[g] = data.levels[g];
            const t = data.changedAt?.[g];
            this.changedAt[g] = Number.isFinite(t) ? t : -Infinity;
        }
        this.satisfactionNowValue = Number.isFinite(data.satisfaction) ? data.satisfaction : this.satisfactionTarget();
    }
}

window.CityFinance = CityFinance;
