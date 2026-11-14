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
        this.usedFaces = []; // rostos e nomes que já trabalharam neste jogo (não voltam a ser sorteados)
        this.usedNames = [];
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

    /** Salário por minuto de um funcionário (puro): base × nível × talento (quem rende mais pede mais). */
    static salaryOf(person) {
        const r = STAFF_ROLES[person?.role];
        if (!r) return 0;
        return Math.round(r.salary * (1 + STAFF_SALARY_STEP * ((person.level || 1) - 1)) * CityStaff.talentSalaryFactor(person));
    }

    /** Média do talento da pessoa (1 = na média; pessoas de saves antigos não têm talento = 1). */
    static talentAverage(person) {
        const values = Object.values(person?.talent || {}).filter(Number.isFinite);
        return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 1;
    }

    static talentSalaryFactor(person) {
        return 1 + STAFF_TALENT.salaryWeight * (CityStaff.talentAverage(person) - 1);
    }

    /** Talento sorteado para cada bônus do cargo que tem tabela por nível (o fixo, como +1 obra, não varia). */
    static randomTalent(roleId, rng = Math.random) {
        const out = {};
        for (const [key, v] of Object.entries(STAFF_ROLES[roleId]?.bonus || {})) {
            if (!Array.isArray(v)) continue;
            out[key] = Math.round((STAFF_TALENT.min + rng() * (STAFF_TALENT.max - STAFF_TALENT.min)) * 100) / 100;
        }
        return out;
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
        const ready = CityStaff.readyVariants(roleId, gender);
        return ready.length ? ready : [1];
    }

    /** Só as que existem no manifesto (vazio = o cargo ainda não tem retrato desse gênero). */
    static readyVariants(roleId, gender) {
        const manifest = typeof PORTRAIT_MANIFEST !== 'undefined' ? PORTRAIT_MANIFEST : {};
        return Array.from({ length: STAFF_PORTRAIT_VARIANTS }, (_, i) => i + 1)
            .filter(n => manifest[CityStaff.portraitKey(roleId, gender, n)]);
    }

    /**
     * Rostos que ainda podem ser sorteados para o cargo (ids staff/…): nenhum já usado (quem trabalha agora ou já
     * trabalhou neste jogo). Se todos já foram usados, volta a valer quem saiu (nunca quem está na equipe).
     */
    availableFaces(roleId) {
        const all = ['f', 'm'].flatMap(g => CityStaff.readyVariants(roleId, g).map(n => CityStaff.portraitKey(roleId, g, n)));
        const current = new Set(this.staff.map(p => p.portrait));
        const fresh = all.filter(k => !current.has(k) && !this.usedFaces.includes(k));
        return fresh.length ? fresh : all.filter(k => !current.has(k));
    }

    static portraitKey(roleId, gender, variant) {
        return `staff/${roleId}-${gender}-${variant}`;
    }

    /**
     * Pessoa nova (rng = () => 0..1). `faces` = rostos que podem sair (CityStaff#availableFaces; vazio = qualquer
     * variante pronta). Nome e rosto não repetem os já usados (`taken` = nomes, `takenFirst` = primeiros nomes).
     */
    static randomPerson(roleId, rng = Math.random, taken = [], faces = null) {
        let gender, variant;
        const pick = list => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
        if (faces && faces.length) {
            // chance igual entre os rostos livres (o gênero vem do rosto)
            const face = pick(faces);
            const m = /-(f|m)-(\d+)$/.exec(face);
            gender = m ? m[1] : 'f';
            variant = m ? Number(m[2]) : 1;
        } else {
            gender = rng() < 0.5 ? 'f' : 'm';
            variant = pick(CityStaff.portraitVariants(roleId, gender));
        }
        const firstTaken = new Set(taken.map(n => String(n).split(' ')[0]));
        let name = '';
        for (let tries = 0; tries < 40; tries++) {
            const first = pick(STAFF_NAMES[gender]);
            const last = pick(STAFF_NAMES.surnames);
            name = `${first} ${last}`;
            // primeiro nome livre nas primeiras tentativas; depois basta o nome completo não repetir
            if (!taken.includes(name) && (tries >= 20 || !firstTaken.has(first))) break;
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
        const takenNames = [...new Set([...this.staff.map(p => p.name), ...this.usedNames])];
        const person = {
            id: `st${this.nextId++}`,
            ...CityStaff.randomPerson(roleId, rng, takenNames, this.availableFaces(roleId)),
            talent: CityStaff.randomTalent(roleId, rng),
            level: 1, xp: 0, hiredAt: gm.gameTime || 0
        };
        this.staff.push(person);
        if (!this.usedFaces.includes(person.portrait)) this.usedFaces.push(person.portrait);
        if (!this.usedNames.includes(person.name)) this.usedNames.push(person.name);
        return { ok: true, person, fee };
    }

    fire(id) {
        const i = this.staff.findIndex(p => p.id === id);
        if (i < 0) return null;
        return this.staff.splice(i, 1)[0];
    }

    // ===== Bônus =====

    /** Efeito de um funcionário para uma chave (tabela por nível × talento sorteado, ou valor fixo). */
    static personBonus(person, key) {
        const v = STAFF_ROLES[person?.role]?.bonus?.[key];
        if (Array.isArray(v)) {
            const talent = Number.isFinite(person?.talent?.[key]) ? person.talent[key] : 1;
            return (v[Math.max(0, Math.min(v.length - 1, (person.level || 1) - 1))] || 0) * talent;
        }
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
        return this.kpiState(kpi, gm) === 'good';
    }

    /**
     * 'good' (ganha experiência), 'bad' (o número vai mal) ou 'idle' (não há trabalho para medir agora: nenhuma obra
     * nova, nenhuma crise de clima — a UI diz "esperando" em vez de "não está indo bem").
     */
    kpiState(kpi, gm) {
        const rm = gm.resourceManager, r = rm?.resources;
        if (!r) return 'bad';
        const now = gm.gameTime || 0;
        const finished = (gm.buildingSystem?.getAllBuildings?.() || []).filter(b => b.config && !b.underConstruction && !b.config.roadType);
        const yes = v => (v ? 'good' : 'bad');
        switch (kpi) {
            case 'builds':
                return this.grew('builds', finished.length, now) ? 'good' : 'idle';
            case 'efficiency': {
                const list = finished.filter(b => b.effectsApplied);
                const avg = list.length ? list.reduce((s, b) => s + (b.efficiency ?? 1), 0) / list.length : 0;
                return yes(list.length > 0 && avg >= 0.9 && !list.some(b => (b.damageFactor ?? 1) < 1));
            }
            case 'satisfaction': {
                const v = r.population?.satisfaction || 0;
                return yes(v >= 60 && this.sample('satisfaction', v, now) >= -0.5);
            }
            case 'pollution': {
                const v = r.pollution?.current || 0;
                const d = this.sample('pollution', v, now);
                return yes(v <= 35 ? d <= 1 : d < -0.5);
            }
            case 'budget': {
                // saldo de verdade (com a folha e a economia do próprio economista) positivo E sem cair mais de 5% da
                // receita no último minuto — "saldo positivo" sozinho era verdade quase sempre (4ª auditoria)
                const net = (r.budget?.income || 0) - (r.budget?.expenses || 0) - this.payroll() + (r.budget?.staffSavings || 0);
                const d = this.sample('budget', net, now);
                return yes(net > 0 && d >= -0.05 * Math.max(1, r.budget?.income || 0));
            }
            case 'trees': {
                const planted = finished.filter(b => b.config.treeStages || b.type === 'tree_sapling').length;
                return yes(this.grew('trees', planted, now) || (gm.propSystem?.getEcology?.() || 0) >= 0.5);
            }
            case 'fauna':
                return yes((rm.getRiverLevel?.() ?? r.water?.river ?? 100) >= 70 && (gm.fieldNotebook?.count?.() || 0) > 0);
            case 'climate': {
                // só conta atravessando uma crise de clima (ativa ou anunciada, e 1 min depois dela) com rio e
                // aquífero acima de 40% — antes media "acima de 50%" a qualquer hora e subia só com o tempo
                const crisis = this.climateCrisisActive(gm);
                if (crisis) this.kpi.climateAt = now;
                if (!crisis && !(now - (this.kpi.climateAt ?? -Infinity) <= CityStaff.TREND_MS)) return 'idle';
                const aquifer = rm.getAquiferLevel?.() ?? r.water?.aquifer ?? 100;
                const river = rm.getRiverLevel?.() ?? r.water?.river ?? 100;
                return yes(aquifer >= 40 && river >= 40);
            }
            default:
                return 'bad';
        }
    }

    static CLIMATE_EVENTS = ['drought', 'flood', 'heavy_rain', 'wildfire', 'long_drought'];

    /** Crise de clima ativa ou anunciada (EventSystem). */
    climateCrisisActive(gm) {
        const es = gm?.eventSystem;
        if (!es) return false;
        const types = new Set(CityStaff.CLIMATE_EVENTS);
        const active = [...(es.activeEvents?.values?.() || [])].some(e => types.has(e?.type));
        const pending = (es.pendingEvents || []).some(e => types.has(e?.type));
        return active || pending;
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
            if (!(kpi in cache)) cache[kpi] = this.kpiState(kpi, gm);
            // atualizado também no nível 5 (a UI mostra se o trabalho vai bem); idle = sem trabalho para medir
            p.good = cache[kpi] === 'good';
            p.idle = cache[kpi] === 'idle';
            if (!p.good || p.level >= STAFF_MAX_LEVEL) continue;
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
        return {
            staff: this.staff.map(p => ({ ...p, good: undefined, idle: undefined })), nextId: this.nextId,
            usedFaces: [...this.usedFaces], usedNames: [...this.usedNames]
        };
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
        const strings = v => (Array.isArray(v) ? v.filter(s => typeof s === 'string') : []);
        this.usedFaces = [...new Set([...strings(data.usedFaces), ...this.staff.map(p => p.portrait).filter(Boolean)])];
        this.usedNames = [...new Set([...strings(data.usedNames), ...this.staff.map(p => p.name).filter(Boolean)])];
    }
}

window.CityStaff = CityStaff;
