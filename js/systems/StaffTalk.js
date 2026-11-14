/**
 * Conversa com os funcionários da prefeitura (11/2026) — sem DOM nem Babylon (testado em
 * tests/unit/staff-talk.test.js). Falas em js/data/staffTalk.js; quem mostra é js/systems/ui/CityHallUI.js.
 *
 * - resolve(text, gender, vars): troca os marcadores de gênero {fem|masc} e as variáveis {nome}, {fila}…;
 * - conditions({ hour, rain, hot }): etiquetas do momento para as falas do dia (morning/afternoon/night, rain, hot);
 * - problems(tiers, events): problemas da cidade, do mais grave para o menos grave (para escolher a dica);
 * - chooseDay / chooseWork / chooseTip: sorteiam uma fala adequada, sem repetir a anterior (`avoid`).
 */
const StaffTalk = {
    GENDER: /\{([^{}|]*)\|([^{}|]*)\}/g,
    VAR: /\{([a-z_]+)\}/g,
    // Ordem de desempate da dica: o que pesa mais para a cidade primeiro
    PROBLEM_ORDER: ['water', 'energy', 'pollution', 'money', 'satisfaction', 'events'],

    resolve(text, gender, vars = {}) {
        return String(text ?? '')
            .replace(StaffTalk.GENDER, (_, fem, masc) => (gender === 'f' ? fem : masc))
            .replace(StaffTalk.VAR, (all, key) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : all));
    },

    /** Variáveis usadas numa fala (fora os marcadores de gênero). */
    varsUsed(text) {
        const plain = String(text ?? '').replace(StaffTalk.GENDER, '');
        return [...plain.matchAll(StaffTalk.VAR)].map(m => m[1]);
    },

    /** Etiquetas do momento: período do dia (relógio do jogo) e tempo (chuva, sol quente). */
    conditions({ hour = 12, rain = false, hot = false } = {}) {
        const set = new Set();
        set.add(hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'night');
        if (rain) set.add('rain');
        if (hot && !rain) set.add('hot');
        return set;
    },

    /**
     * tiers = { water, energy, pollution, money, satisfaction } com 'great'|'ok'|'low'|'critical' (ResourceTrends);
     * events = há crise anunciada ou em andamento. → ['water', 'events', …] do mais grave para o menos grave.
     */
    problems(tiers = {}, events = false) {
        const weight = { critical: 3, low: 2 };
        const list = StaffTalk.PROBLEM_ORDER
            .map((id, i) => ({ id, w: id === 'events' ? (events ? 2.5 : 0) : (weight[tiers[id]] || 0), i }))
            .filter(p => p.w > 0);
        list.sort((a, b) => b.w - a.w || a.i - b.i);
        return list.map(p => p.id);
    },

    pick(pool, rng = Math.random, avoid = null) {
        if (!pool.length) return null;
        const fresh = pool.length > 1 ? pool.filter(l => l.text !== avoid) : pool;
        return fresh[Math.floor(rng() * fresh.length) % fresh.length];
    },

    /** Fala do dia: prefere a que combina com a hora/tempo (60%), senão qualquer uma que sirva agora. */
    chooseDay(lines = [], conds = new Set(), rng = Math.random, avoid = null) {
        const ok = lines.filter(l => !l.when || conds.has(l.when));
        const special = ok.filter(l => l.when);
        if (special.length && rng() < 0.6) return StaffTalk.pick(special, rng, avoid);
        return StaffTalk.pick(ok, rng, avoid);
    },

    /** Fala do trabalho: pelo número do cargo indo bem (good) ou parado (bad). */
    chooseWork(lines = [], good = true, rng = Math.random, avoid = null) {
        const want = good ? 'good' : 'bad';
        const pool = lines.filter(l => !l.when || l.when === want);
        return StaffTalk.pick(pool.length ? pool : lines, rng, avoid);
    },

    /**
     * Dica do momento: a do problema mais grave que o cargo sabe resolver; sem problema = calm ou conselho geral;
     * com problema fora do tema do cargo = só conselho geral (nunca "está tudo bem" com a cidade mal).
     */
    chooseTip(lines = [], problems = [], rng = Math.random, avoid = null) {
        for (const p of problems) {
            const pool = lines.filter(l => l.when === p);
            if (pool.length) return StaffTalk.pick(pool, rng, avoid);
        }
        const pool = problems.length ? lines.filter(l => !l.when) : lines.filter(l => !l.when || l.when === 'calm');
        return StaffTalk.pick(pool.length ? pool : lines.filter(l => !l.when), rng, avoid);
    }
};

window.StaffTalk = StaffTalk;
