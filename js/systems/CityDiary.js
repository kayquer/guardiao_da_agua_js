/**
 * Diário da cidade (11/2026) — sem DOM nem Babylon (testável em tests/unit/diary.test.js).
 *
 * A linha do tempo que o JOGADOR vê (o ResearchLog é para a pesquisa e fica desligado no modo loja): marcos com o
 * dia de jogo em que aconteceram. O diário não muda nada no jogo: só olha.
 *   - primeira construção pronta de cada tipo importante (prefeitura, fonte de água, ETA, ETE, reservatório, usina
 *     limpa, usina a combustível, muda, obra verde, ciência, serviço público) e o primeiro bairro completo (fase 3) de
 *     cada tipo de zona;
 *   - missão concluída (com as estrelas);
 *   - evento enfrentado (com a escolha feita com o Secretário Paulo e se ela foi boa pela situação da cidade);
 *   - espécie registrada no caderno de campo e espécie AMEAÇADA registrada que voltou depois de sumir;
 *   - recordes: população passando de marcos (100, 250, 500…) e o rio cheio de novo depois de ter baixado.
 *
 * Como não mexe na lógica de ninguém, ele OLHA os sistemas a cada CHECK_EVERY_MS de jogo (`tick`, chamado pelo
 * GameManager.update) e compara com o que já anotou (`marks`). Save antigo (sem diário) = diário vazio: a primeira
 * olhada depois de carregar só marca o que já existia, sem escrever nada (`primeAll`). Depois de qualquer
 * carregamento os eventos ativos também são só marcados (o id deles não é estável entre carregamentos).
 */
class CityDiary {
    static MAX_ENTRIES = 300;
    static CHECK_EVERY_MS = 2000;
    static DAY_MS = 86400000;
    static POPULATION_MARKS = [100, 250, 500, 1000, 2000, 3000, 5000, 10000, 20000];
    static RIVER_FULL = 95;   // rio cheio
    static RIVER_LOW = 70;    // abaixo disso, voltar a ficar cheio vira marco

    // Primeiras construções (prontas). Cada chave só uma vez por partida; um prédio pode marcar mais de uma.
    static FIRSTS = [
        { key: 'city_hall', icon: '🏛️', match: (c, t) => t === 'city_hall', text: () => 'A prefeitura abriu as portas: nasce a cidade' },
        { key: 'water_source', icon: '💧', match: c => (c.waterProduction || 0) > 0, text: c => `Primeira fonte de água: ${c.name}` },
        { key: 'eta', icon: '🚰', match: (c, t) => t === 'water_treatment_plant', text: () => 'Primeira ETA: a água do rio passa a ser tratada para beber' },
        { key: 'ete', icon: '🧪', match: (c, t) => t === 'treatment_plant', text: () => 'Primeira ETE: o esgoto passa a ser tratado antes de voltar ao rio' },
        { key: 'storage', icon: '🛢️', match: c => (c.waterStorage || 0) > 0, text: c => `Primeiro lugar para guardar água: ${c.name}` },
        { key: 'clean_power', icon: '☀️', match: c => (c.powerGeneration || 0) > 0 && !!c.renewable, text: c => `Primeira usina limpa: ${c.name}` },
        { key: 'fossil_power', icon: '🏭', match: c => (c.powerGeneration || 0) > 0 && !c.renewable, text: c => `Primeira usina a combustível: ${c.name}` },
        { key: 'tree', icon: '🌱', match: (c, t) => t === 'tree_sapling' || !!c.treeStages, text: () => 'Primeira muda de árvore plantada' },
        { key: 'nature', icon: '🌿', match: (c, t) => c.category === 'nature' && t !== 'tree_sapling' && !c.treeStages, text: c => `Primeira obra verde: ${c.name}` },
        { key: 'science', icon: '🔬', match: c => c.category === 'science', text: c => `Primeiro centro de ciência: ${c.name}` },
        { key: 'public', icon: '🏫', match: (c, t) => c.category === 'public' && t !== 'city_hall', text: c => `Primeiro serviço público: ${c.name}` }
    ];

    static ZONE_NAMES = { residential: 'bairro de casas', commercial: 'bairro de comércio', industrial: 'bairro de indústrias' };

    constructor() {
        this.reset();
    }

    /** Jogo novo: diário em branco, sem nada para "primar" (tudo que acontecer daqui em diante entra). */
    reset() {
        this.entries = [];
        this.marks = CityDiary.emptyMarks();
        this.primeAll = false;
        this.primeEvents = false;
        this.timer = 0;
    }

    static emptyMarks() {
        return { firsts: [], quests: [], events: [], species: [], returns: {}, population: 0, riverLow: false };
    }

    /** Dia de jogo (1, 2, 3…) pelo relógio da cidade (GameManager.gameClockTime − gameStartTime). */
    static dayOf(gm) {
        const start = gm?.gameStartTime?.getTime?.() ?? gm?.gameStartTime;
        const now = gm?.gameClockTime?.getTime?.() ?? gm?.gameClockTime;
        if (!Number.isFinite(start) || !Number.isFinite(now)) return 1;
        return Math.max(1, Math.floor((now - start) / CityDiary.DAY_MS) + 1);
    }

    /** Escreve um marco. Devolve a entrada (ou null se `silent`). */
    add(kind, data, gm, { silent = false } = {}) {
        if (silent) return null;
        const entry = { day: CityDiary.dayOf(gm), gt: Math.round(gm?.gameTime || 0), kind, ...data };
        this.entries.push(entry);
        if (this.entries.length > CityDiary.MAX_ENTRIES) this.entries.splice(0, this.entries.length - CityDiary.MAX_ENTRIES);
        return entry;
    }

    /** Chamado pelo GameManager.update com o tempo de jogo; olha os sistemas a cada CHECK_EVERY_MS. */
    tick(dt, gm) {
        this.timer += dt || 0;
        if (this.timer < CityDiary.CHECK_EVERY_MS) return;
        this.timer = 0;
        this.check(gm);
    }

    /** Uma olhada em tudo. Devolve as entradas novas. */
    check(gm) {
        if (!gm) return [];
        const before = this.entries.length;
        const silent = this.primeAll;
        this.checkBuildings(gm, silent);
        this.checkQuests(gm, silent);
        this.checkEvents(gm, silent || this.primeEvents);
        this.checkSpecies(gm, silent);
        this.checkRecords(gm, silent);
        this.primeAll = false;
        this.primeEvents = false;
        return this.entries.slice(before);
    }

    checkBuildings(gm, silent) {
        const buildings = gm.buildingSystem?.getAllBuildings?.() || [];
        const firsts = new Set(this.marks.firsts);
        for (const b of buildings) {
            const c = b?.config;
            if (!c || b.underConstruction || c.roadType) continue;
            for (const rule of CityDiary.FIRSTS) {
                if (firsts.has(rule.key) || !rule.match(c, b.type)) continue;
                firsts.add(rule.key);
                this.add('build', { key: rule.key, icon: rule.icon, text: rule.text(c), type: b.type }, gm, { silent });
            }
            const zone = c.zoneType && Number.isInteger(b.zoneStage) && b.zoneStage >= 3 ? c.category : null;
            const zoneKey = zone && `zone_${zone}`;
            if (zoneKey && !firsts.has(zoneKey)) {
                firsts.add(zoneKey);
                this.add('zone', { key: zoneKey, icon: '🏘️', text: `Primeiro ${CityDiary.ZONE_NAMES[zone] || 'bairro'} completo: ${c.name}`, type: b.type }, gm, { silent });
            }
        }
        this.marks.firsts = [...firsts];
    }

    checkQuests(gm, silent) {
        const qs = gm.questSystem;
        if (!qs?.completedQuests) return;
        const done = new Set(this.marks.quests);
        for (const id of qs.completedQuests) {
            if (done.has(id)) continue;
            done.add(id);
            const quest = qs.quests?.get?.(id);
            if (!quest) continue;
            const challenge = /^city_challenge_/.test(id);
            this.add('mission', {
                key: id, icon: quest.victory ? '🏆' : challenge ? '🎯' : '✅',
                text: `${quest.victory ? 'Campanha vencida' : challenge ? 'Desafio da cidade cumprido' : 'Missão concluída'}: ${quest.title}`,
                stars: Math.max(0, Math.min(3, Number(quest.stars) || 0))
            }, gm, { silent });
        }
        this.marks.quests = [...done];
    }

    checkEvents(gm, silent) {
        const es = gm.eventSystem;
        if (!es?.activeEvents) return;
        const seen = new Set(this.marks.events);
        for (const event of es.activeEvents.values()) {
            if (!event?.id || seen.has(event.id)) continue;
            seen.add(event.id);
            const config = event.config || {};
            const option = config.response?.options?.find?.(o => o.id === event.responseId) || null;
            const data = { key: event.type, icon: config.icon || '⚡', text: `${config.severity === 'positive' ? 'Aconteceu' : 'A cidade enfrentou'}: ${config.name || event.type}` };
            if (option) data.choice = option.label;
            if (event.verdict && typeof event.verdict.good === 'boolean') {
                data.good = event.verdict.good;
                if (event.verdict.why) data.why = event.verdict.why;
            }
            this.add('event', data, gm, { silent });
        }
        // só guarda os ids dos que ainda estão ativos (os outros nunca voltam com o mesmo id)
        const active = new Set(es.activeEvents.keys());
        this.marks.events = [...seen].filter(id => active.has(id));
    }

    checkSpecies(gm, silent) {
        const nb = gm.fieldNotebook;
        if (!nb?.registered) return;
        const known = new Set(this.marks.species);
        const entry = id => (typeof FieldNotebook !== 'undefined' ? FieldNotebook.entry(id) : null);
        const threatened = id => (typeof FieldNotebook !== 'undefined' ? FieldNotebook.isThreatened(id) : false);
        for (const id of Object.keys(nb.registered)) {
            if (known.has(id)) continue;
            known.add(id);
            const e = entry(id);
            this.add('species', {
                key: id, icon: '📓', threatened: threatened(id),
                text: `${threatened(id) ? 'Espécie ameaçada registrada' : 'Espécie registrada'} no caderno: ${e?.name || id}`
            }, gm, { silent });
        }
        this.marks.species = [...known];
        // Ameaçada (e já registrada) que tinha sumido e voltou
        const returns = this.marks.returns;
        for (const [id, rec] of Object.entries(nb.seen || {})) {
            const n = Number(rec?.returns) || 0;
            if (n <= (returns[id] || 0)) continue;
            returns[id] = n;
            if (!threatened(id) || !nb.registered[id]) continue;
            this.add('return', { key: id, icon: '🦦', threatened: true, text: `Uma espécie ameaçada voltou: ${entry(id)?.name || id}` }, gm, { silent });
        }
    }

    checkRecords(gm, silent) {
        const r = gm.resourceManager?.resources;
        if (!r) return;
        const people = Math.floor(r.population?.current || 0);
        const mark = [...CityDiary.POPULATION_MARKS].reverse().find(m => people >= m) || 0;
        if (mark > (this.marks.population || 0)) {
            this.marks.population = mark;
            this.add('record', { key: `population_${mark}`, icon: '👥', text: `A cidade passou de ${mark.toLocaleString('pt-BR')} moradores` }, gm, { silent });
        }
        const river = Number(r.water?.river ?? 100);
        if (river < CityDiary.RIVER_LOW) this.marks.riverLow = true;
        else if (river >= CityDiary.RIVER_FULL && this.marks.riverLow) {
            this.marks.riverLow = false;
            this.add('record', { key: 'river_full', icon: '🏞️', text: `O rio voltou a ficar cheio (${Math.round(river)}%)` }, gm, { silent });
        }
    }

    /** Resumo para a tela de vitória: os primeiros marcos, as missões e o que mais importou (no máximo `max`). */
    highlights(max = 8) {
        if (this.entries.length <= max) return this.entries.slice();
        const rank = { mission: 0, return: 1, zone: 2, build: 3, record: 4, species: 5, event: 6 };
        const picked = this.entries
            .map((e, i) => ({ e, i }))
            .sort((a, b) => (rank[a.e.kind] ?? 9) - (rank[b.e.kind] ?? 9) || a.i - b.i)
            .slice(0, max)
            .sort((a, b) => a.i - b.i);
        return picked.map(p => p.e);
    }

    /** Contagem por tipo de marco (cabeçalho do painel). */
    counts() {
        const out = {};
        for (const e of this.entries) out[e.kind] = (out[e.kind] || 0) + 1;
        return out;
    }

    getSaveData() {
        return { entries: structuredClone(this.entries), marks: structuredClone(this.marks) };
    }

    /**
     * Save sem diário (antigo) ou inválido: diário vazio e a 1ª olhada só marca o que a cidade já tem.
     * Com diário: volta como estava; os eventos ativos de agora são só marcados (ids novos a cada carregamento).
     */
    loadData(data) {
        this.reset();
        if (!data || typeof data !== 'object' || !Array.isArray(data.entries)) {
            this.primeAll = true;
            return;
        }
        this.entries = structuredClone(data.entries.filter(e => e && typeof e === 'object' && typeof e.text === 'string'))
            .slice(-CityDiary.MAX_ENTRIES);
        const m = data.marks && typeof data.marks === 'object' ? data.marks : {};
        const list = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : []);
        this.marks = {
            firsts: list(m.firsts), quests: list(m.quests), events: [], species: list(m.species),
            returns: m.returns && typeof m.returns === 'object' ? structuredClone(m.returns) : {},
            population: Number(m.population) || 0, riverLow: !!m.riverLow
        };
        this.primeEvents = true;
    }
}

window.CityDiary = CityDiary;
