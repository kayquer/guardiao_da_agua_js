/**
 * Quadro de funcionários da prefeitura (11/2026). Sem DOM nem Babylon (testado em tests/unit/city-hall.test.js);
 * dados em js/data/cityHall.js (STAFF_ROLES, níveis, nomes, sorteio de etnia). UI em ui/CityHallUI.js.
 *
 * - Vagas: cargos de base têm vagas fixas (`cap.base`); especialistas liberam com a população (`unlockAt`, 1 vaga) e
 *   ganham +1 vaga a cada `extraEvery` moradores além disso. Vagas que somem (população caiu) não demitem ninguém;
 *   só não deixam contratar mais.
 * - Contratar custa STAFF_HIRE_MONTHS de salário; o salário entra nas despesas por minuto (ResourceManager, payroll);
 *   +STAFF_SALARY_STEP por nível. Demitir corta o salário na hora e a pessoa leva a experiência embora.
 * - Progressão: cada minuto de jogo com o número do cargo indo bem (kpiGood: atende e não está caindo) vale 1 de
 *   experiência; parado/caindo não vale nada e não tira. STAFF_LEVEL_XP = minutos para cada nível (até 5).
 * - Bônus: bonus(key) soma o efeito de todo mundo (tabela por nível) com teto BONUS_CAP. Quem lê: BuildingSystem
 *   (obras simultâneas, tempo e custo de obra), ResourceManager (manutenção, poluição, satisfação), EventSystem
 *   (falha de equipamento, força de seca/enchente/chuva e aviso), TreeGrowth/TreeSystem (verde), PropSystem
 *   (ecologia e tolerância dos bichos) e o conserto automático de estrago (tick).
 */
class CityStaff {
    static BONUS_CAP = { buildTime: 0.4, buildCost: 0.35, maintenance: 0.4, pollution: 0.45, failure: 0.75, climate: 0.45, green: 0.6, ecology: 0.35, taxComplaint: 0.8, warning: 0.8 };
    static KPI_WINDOW_MS = 3 * 60 * 1000; // "obras entregues"/"árvores": algo novo nos últimos 3 min de jogo
    static TREND_MS = 60 * 1000;          // compara com 1 min de jogo atrás para saber se está caindo

    constructor() {
        this.reset();
    }

    reset() {
        this.staff = [];
        this.nextId = 1;
        this.kpi = {};     // estado de cada número acompanhado (contagens, amostras para a tendência)
        this.timer = 0;
        this.events = [];  // níveis novos desde a última leitura (takeEvents) — a UI mostra o cartão
    }

    // ===== Vagas e custos =====

    static role(id) {
        return STAFF_ROLES[id] || null;
    }

    /** Vagas de um cargo com esta população (puro). */
    static cap(roleId, population = 0) {
        const r = STAFF_ROLES[roleId];
        if (!r) return 0;
        if (Number.isFinite(r.cap.base)) return r.cap.base;
        if (population < r.cap.unlockAt) return 0;
        return 1 + Math.floor((population - r.cap.unlockAt) / r.cap.extraEvery);
    }

    /** Salário por minuto de um funcionário (puro). */
    static salaryOf(person) {
        const r = STAFF_ROLES[person?.role];
        if (!r) return 0;
        return Math.round(r.salary * (1 + STAFF_SALARY_STEP * ((person.level || 1) - 1)));
    }

    static hireCost(roleId) {
        const r = STAFF_ROLES[roleId];
        const monthMs = typeof LoanManager !== 'undefined' && LoanManager.MONTH_MS ? LoanManager.MONTH_MS : 120000;
        return r ? Math.round(r.salary * STAFF_HIRE_MONTHS * monthMs / 60000) : 0;
    }

    count(roleId) {
        return this.staff.filter(p => p.role === roleId).length;
    }

    payroll() {
        return this.staff.reduce((sum, p) => sum + CityStaff.salaryOf(p), 0);
    }

    /** Pode contratar? → { ok, reason? } */
    canHire(roleId, gm) {
        const r = STAFF_ROLES[roleId];
        if (!r) return { ok: false, reason: 'Cargo desconhecido' };
        const pop = gm?.resourceManager?.resources?.population?.current || 0;
        const cap = CityStaff.cap(roleId, pop);
        if (cap <= 0) return { ok: false, reason: `Libera com ${r.cap.unlockAt.toLocaleString('pt-BR')} moradores` };
        if (this.count(roleId) >= cap) {
            return { ok: false, reason: r.cap.extraEvery ? `Vagas cheias: +1 vaga a cada ${r.cap.extraEvery} moradores` : 'Vagas cheias' };
        }
        const fee = CityStaff.hireCost(roleId);
        if ((gm?.resourceManager?.resources?.budget?.current || 0) < fee) return { ok: false, reason: `Falta dinheiro: contratar custa R$ ${fee.toLocaleString('pt-BR')}` };
        return { ok: true };
    }

    // ===== Sorteio da pessoa =====

    /** Variantes de retrato prontas para o cargo e o gênero (números 1 … STAFF_PORTRAIT_VARIANTS no manifesto). */
    static portraitVariants(roleId, gender) {
        const manifest = typeof PORTRAIT_MANIFEST !== 'undefined' ? PORTRAIT_MANIFEST : {};
        const all = Array.from({ length: STAFF_PORTRAIT_VARIANTS }, (_, i) => i + 1);
        const ready = all.filter(n => manifest[CityStaff.portraitKey(roleId, gender, n)]);
        return ready.length ? ready : [1];
    }

    static portraitKey(roleId, gender, variant) {
        return `staff/${roleId}-${gender}-${variant}`;
    }

    /** Pessoa nova (rng = () => 0..1). Nome sem repetir quem já trabalha na prefeitura. */
    static randomPerson(roleId, rng = Math.random, taken = []) {
        const gender = rng() < 0.5 ? 'f' : 'm';
        // variante do retrato: chance igual entre as que existem
        const variants = CityStaff.portraitVariants(roleId, gender);
        const variant = variants[Math.min(variants.length - 1, Math.floor(rng() * variants.length))];
        let name = '';
        for (let tries = 0; tries < 20; tries++) {
            const first = STAFF_NAMES[gender][Math.floor(rng() * STAFF_NAMES[gender].length)];
            const last = STAFF_NAMES.surnames[Math.floor(rng() * STAFF_NAMES.surnames.length)];
            name = `${first} ${last}`;
            if (!taken.includes(name)) break;
        }
        return { role: roleId, gender, variant, name, portrait: CityStaff.portraitKey(roleId, gender, variant) };
    }

    static title(person) {
        return STAFF_ROLES[person?.role]?.title?.[person?.gender] || '';
    }

    // ===== Contratar e demitir =====

    hire(roleId, gm, rng = Math.random) {
        const gate = this.canHire(roleId, gm);
        if (!gate.ok) return gate;
        const fee = CityStaff.hireCost(roleId);
        if (!gm.resourceManager.spendBudget(fee)) return { ok: false, reason: 'Falta dinheiro' };
        const person = {
            id: `st${this.nextId++}`,
            ...CityStaff.randomPerson(roleId, rng, this.staff.map(p => p.name)),
            level: 1, xp: 0, hiredAt: gm.gameTime || 0
        };
        this.staff.push(person);
        return { ok: true, person, fee };
    }

    fire(id) {
        const i = this.staff.findIndex(p => p.id === id);
        if (i < 0) return null;
        return this.staff.splice(i, 1)[0];
    }

    // ===== Bônus =====

    /** Efeito de um funcionário para uma chave (tabela por nível ou valor fixo). */
    static personBonus(person, key) {
        const v = STAFF_ROLES[person?.role]?.bonus?.[key];
        if (Array.isArray(v)) return v[Math.max(0, Math.min(v.length - 1, (person.level || 1) - 1))] || 0;
        return Number.isFinite(v) ? v : 0;
    }

    /** Soma de todo o quadro, com teto (BONUS_CAP). */
    bonus(key) {
        const sum = this.staff.reduce((s, p) => s + CityStaff.personBonus(p, key), 0);
        const cap = CityStaff.BONUS_CAP[key];
        return Number.isFinite(cap) ? Math.min(cap, sum) : sum;
    }

    // ===== Progressão =====

    /** Amostra de um número para a tendência (guarda ~2 min). */
    sample(key, value, now) {
        const s = this.kpi[key] || (this.kpi[key] = { samples: [] });
        s.samples.push([now, value]);
        while (s.samples.length > 2 && s.samples[0][0] < now - 2 * CityStaff.TREND_MS) s.samples.shift();
        const old = s.samples.find(([t]) => t >= now - CityStaff.TREND_MS) || s.samples[0];
        return value - old[1]; // variação no último minuto
    }

    /** Contagem que precisa ter subido nos últimos KPI_WINDOW_MS (obras entregues, mudas). */
    grew(key, count, now) {
        const s = this.kpi[key] || (this.kpi[key] = { count, at: -Infinity });
        if (count > s.count) s.at = now;
        s.count = count;
        return now - s.at <= CityStaff.KPI_WINDOW_MS;
    }

    /** O número do cargo vai bem agora? (atende e não está caindo) */
    kpiGood(kpi, gm) {
        const rm = gm.resourceManager, r = rm?.resources;
        if (!r) return false;
        const now = gm.gameTime || 0;
        const finished = (gm.buildingSystem?.getAllBuildings?.() || []).filter(b => b.config && !b.underConstruction && !b.config.roadType);
        switch (kpi) {
            case 'builds':
                return this.grew('builds', finished.length, now);
            case 'efficiency': {
                const list = finished.filter(b => b.effectsApplied);
                const avg = list.length ? list.reduce((s, b) => s + (b.efficiency ?? 1), 0) / list.length : 0;
                return list.length > 0 && avg >= 0.9 && !list.some(b => (b.damageFactor ?? 1) < 1);
            }
            case 'satisfaction': {
                const v = r.population?.satisfaction || 0;
                return v >= 60 && this.sample('satisfaction', v, now) >= -0.5;
            }
            case 'pollution': {
                const v = r.pollution?.current || 0;
                const d = this.sample('pollution', v, now);
                return v <= 35 ? d <= 1 : d < -0.5;
            }
            case 'budget':
                // saldo de verdade: com a folha e com a economia do próprio economista na manutenção
                return (r.budget?.income || 0) - (r.budget?.expenses || 0) - this.payroll() + (r.budget?.staffSavings || 0) > 0;
            case 'trees': {
                const planted = finished.filter(b => b.config.treeStages || b.type === 'tree_sapling').length;
                return this.grew('trees', planted, now) || (gm.propSystem?.getEcology?.() || 0) >= 0.5;
            }
            case 'fauna':
                return (rm.getRiverLevel?.() ?? r.water?.river ?? 100) >= 70 && (gm.fieldNotebook?.count?.() || 0) > 0;
            case 'climate': {
                const aquifer = rm.getAquiferLevel?.() ?? r.water?.aquifer ?? 100;
                const river = rm.getRiverLevel?.() ?? r.water?.river ?? 100;
                return aquifer >= 50 && river >= 50;
            }
            default:
                return false;
        }
    }

    /** A cada segundo de jogo: experiência de quem vai bem, nível novo e o conserto automático de estrago. */
    tick(dtMs, gm) {
        this.timer += Math.max(0, dtMs || 0);
        if (this.timer < 1000) return;
        const dt = this.timer;
        this.timer = 0;
        const minutes = dt / 60000;
        const cache = {};
        for (const p of this.staff) {
            const kpi = STAFF_ROLES[p.role]?.kpi;
            if (!kpi) continue;
            if (!(kpi in cache)) cache[kpi] = this.kpiGood(kpi, gm);
            p.good = cache[kpi]; // atualizado também no nível 5 (a UI mostra se o trabalho vai bem)
            if (!cache[kpi] || p.level >= STAFF_MAX_LEVEL) continue;
            p.xp += minutes;
            const need = STAFF_LEVEL_XP[p.level - 1];
            if (p.xp >= need - 1e-6) { // soma de frações de minuto: 180 × 1/60 dá 2,9999…
                p.xp = Math.max(0, p.xp - need);
                p.level += 1;
                if (p.level >= STAFF_MAX_LEVEL) p.xp = 0;
                this.events.push({ type: 'level', id: p.id, level: p.level });
            }
        }
        // Serviços gerais: devolvem aos poucos a eficiência de prédios estragados por enchente (o botão Consertar
        // continua valendo para quem não quer esperar)
        const repair = this.bonus('repairPerMin') * minutes;
        if (repair > 0) {
            const bs = gm.buildingSystem;
            for (const b of bs?.getAllBuildings?.() || []) {
                if (!(Number.isFinite(b.damageFactor) && b.damageFactor < 1) || b.underConstruction) continue;
                b.damageFactor = Math.min(1, b.damageFactor + repair);
                if (b.damageFactor >= 0.999) delete b.damageFactor;
                bs.markEfficiencyDirty?.();
            }
        }
    }

    takeEvents() {
        const out = this.events;
        this.events = [];
        return out;
    }

    /** Progresso até o próximo nível (0-1) e minutos que faltam. */
    static progress(person) {
        if ((person.level || 1) >= STAFF_MAX_LEVEL) return { ratio: 1, left: 0 };
        const need = STAFF_LEVEL_XP[person.level - 1];
        return { ratio: Math.min(1, (person.xp || 0) / need), left: Math.max(0, need - (person.xp || 0)) };
    }

    getSaveData() {
        return { staff: this.staff.map(p => ({ ...p, good: undefined })), nextId: this.nextId };
    }

    loadData(data) {
        this.reset();
        if (!data) return;
        this.staff = (Array.isArray(data.staff) ? data.staff : [])
            .filter(p => p && STAFF_ROLES[p.role])
            .map(p => ({
                ...p,
                level: Math.max(1, Math.min(STAFF_MAX_LEVEL, Math.round(p.level) || 1)),
                xp: Number.isFinite(p.xp) ? p.xp : 0
            }));
        this.nextId = Number.isFinite(data.nextId) ? data.nextId : this.staff.length + 1;
    }
}

window.CityStaff = CityStaff;
