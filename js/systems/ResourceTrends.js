/**
 * Estado e tendência dos recursos do HUD (sem DOM; testado em tests/unit/resource-hud.test.js).
 * - `metricOf(id, resources)` → o número que decide a faixa (fração de água, poluição, eficiência…)
 * - `tierOf(id, resources, growth)` → 'great' | 'ok' | 'low' | 'critical' (RESOURCE_STATES)
 * - `ResourceTrends#sample(resources, now)` guarda amostras por tempo de jogo; `trend(id)` → { dir, good }
 */
class ResourceTrends {
    static TIERS = ['great', 'ok', 'low', 'critical'];

    constructor(config = RESOURCE_STATES) {
        this.config = config;
        this.samples = []; // { t, values: { id: número } }
        this.lastSampleAt = -Infinity;
    }

    /** Valor bruto de cada recurso usado na tendência (na unidade de `flat`). */
    static rawValue(id, r) {
        switch (id) {
            case 'water': return (r.water?.current || 0) / Math.max(1, r.water?.storage || r.water?.max || 1);
            case 'pollution': return r.pollution?.current || 0;
            case 'population': return r.population?.current || 0;
            case 'satisfaction': return r.population?.satisfaction || 0;
            case 'budget': return r.budget?.current || 0;
            case 'energy': return ResourceTrends.energyEfficiency(r);
            default: return 0;
        }
    }

    /** Geração ÷ consumo; cidade sem consumo = 1 (ou a sobra, se já gera). */
    static energyEfficiency(r) {
        const e = r.electricity || {};
        const use = e.consumption || 0;
        if (use <= 0) return (e.generation || 0) > 0 ? 1.25 : 1;
        return (e.generation || 0) / use;
    }

    /** Número que decide a faixa. `growth` = % da população por minuto (da tendência). */
    static metricOf(id, r, growth = 0) {
        if (id === 'population') {
            const max = r.population?.max || 0;
            // cheia e sem encolher = great (não tem para onde crescer)
            if (max > 0 && (r.population?.current || 0) >= max * 0.95 && growth > -0.3) return Infinity;
            return growth;
        }
        return ResourceTrends.rawValue(id, r);
    }

    /** Faixa do recurso agora. */
    static tierOf(id, r, growth = 0, config = RESOURCE_STATES) {
        const def = config.resources[id];
        if (!def) return 'ok';
        const v = ResourceTrends.metricOf(id, r, growth);
        const t = def.tiers;
        let tier;
        if (def.better === 'low') tier = v < t.great ? 'great' : v < t.ok ? 'ok' : v < t.low ? 'low' : 'critical';
        else tier = v >= t.great ? 'great' : v >= t.ok ? 'ok' : v >= t.low ? 'low' : 'critical';
        // caixa entrando no vermelho: uma faixa abaixo (dinheiro sobrando que está acabando não é "muito bem")
        if (id === 'budget' && (r.budget?.income || 0) - (r.budget?.expenses || 0) < 0) tier = ResourceTrends.worse(tier);
        return tier;
    }

    static worse(tier) {
        const i = ResourceTrends.TIERS.indexOf(tier);
        return ResourceTrends.TIERS[Math.min(ResourceTrends.TIERS.length - 1, i + 1)];
    }

    /** Diferença de faixa (> 0 piorou, < 0 melhorou). */
    static compare(from, to) {
        return ResourceTrends.TIERS.indexOf(to) - ResourceTrends.TIERS.indexOf(from);
    }

    /** Guarda uma amostra a cada `sampleMs` de tempo de jogo (pausa = tempo parado = sem amostra). */
    sample(r, now) {
        if (now - this.lastSampleAt < this.config.sampleMs) return false;
        this.lastSampleAt = now;
        const values = {};
        for (const id of Object.keys(this.config.resources)) values[id] = ResourceTrends.rawValue(id, r);
        this.samples.push({ t: now, values });
        const keepFrom = now - this.config.windowMs * 1.5;
        while (this.samples.length > 2 && this.samples[0].t < keepFrom) this.samples.shift();
        return true;
    }

    /** Amostra mais antiga dentro da janela (e a mais nova). */
    window() {
        if (this.samples.length < 2) return null;
        const last = this.samples[this.samples.length - 1];
        const from = last.t - this.config.windowMs;
        const first = this.samples.find(s => s.t >= from) || this.samples[0];
        return first === last ? null : { first, last };
    }

    /** % da população por minuto na janela (0 sem dados). */
    populationGrowth() {
        const w = this.window();
        if (!w) return 0;
        const a = w.first.values.population, b = w.last.values.population;
        const minutes = (w.last.t - w.first.t) / 60000;
        if (!(minutes > 0)) return 0;
        return ((b - a) / Math.max(1, a)) * 100 / minutes;
    }

    /** { dir: 'up'|'flat'|'down', good: true|false|null } — `good` já considera que poluição subindo é ruim. */
    trend(id) {
        const def = this.config.resources[id];
        const w = this.window();
        if (!def || !w) return { dir: 'flat', good: null };
        const delta = w.last.values[id] - w.first.values[id];
        // a janela pode ainda ser curta: a variação mínima vale para a janela inteira
        const span = (w.last.t - w.first.t) / this.config.windowMs;
        const flat = id === 'budget' ? Math.max(def.flat, Math.abs(w.first.values[id]) * 0.005) : def.flat;
        if (Math.abs(delta) < flat * Math.max(0.5, span)) return { dir: 'flat', good: null };
        const dir = delta > 0 ? 'up' : 'down';
        return { dir, good: def.better === 'low' ? dir === 'down' : dir === 'up' };
    }

    reset() {
        this.samples = [];
        this.lastSampleAt = -Infinity;
    }
}
