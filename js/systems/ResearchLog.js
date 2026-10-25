/**
 * ResearchLog — registro de pesquisa por perfil (dissertação): respostas dos quizzes, páginas lidas e o tempo em cada
 * uma, escolhas nos eventos, missões, fim de jogo e emergências. Fica só neste navegador (localStorage) e é exportado
 * à mão na tela de pausa (JSON ou CSV), sem o apelido do aluno: o perfil sai como id + idade + cidade.
 * Sem DOM (testável em tests/unit): a tela de exportação fica em js/systems/ui/ResearchUI.js.
 *
 * Cada registro: { t (ISO, hora real), s (sessão), gt (s de jogo), type, target?, value?, ok?, ...extra }.
 * target = o quê (aula, prédio, evento, missão), value = quanto/qual (ms, nota, opção), ok = acertou/deu certo.
 */
class ResearchLog {
    static STORAGE_KEY = 'guardiao_agua_research';
    static MAX_EVENTS = 3000;   // por perfil; os mais antigos saem primeiro
    static MIN_PAGE_MS = 300;   // página que passou direto não conta como leitura
    static MAX_PAGE_MS = 30 * 60 * 1000; // aba esquecida aberta não vira meia hora de leitura
    static VERSION = 1;

    static session = null;      // id da sessão atual (uma por partida aberta)
    static page = null;         // { source, target, title, start }

    static profileKey() {
        return (typeof PlayerProfile !== 'undefined' && PlayerProfile.getActive()?.id) || 'guest';
    }

    static readAll() {
        try {
            return JSON.parse(localStorage.getItem(ResearchLog.STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    }

    static writeAll(all) {
        try {
            localStorage.setItem(ResearchLog.STORAGE_KEY, JSON.stringify(all));
            return true;
        } catch {
            return false; // cota cheia ou modo privado: o jogo segue sem registrar
        }
    }

    static entry(profileId = ResearchLog.profileKey()) {
        const entry = ResearchLog.readAll()[profileId];
        return { sessions: Number(entry?.sessions) || 0, events: Array.isArray(entry?.events) ? entry.events : [] };
    }

    static gameSeconds() {
        const gm = typeof window !== 'undefined' ? window.gameManager : null;
        return Math.round((gm?.gameTime || 0) / 100) / 10;
    }

    /** Começa uma sessão (novo jogo ou jogo carregado). */
    static startSession(mode) {
        const all = ResearchLog.readAll();
        const key = ResearchLog.profileKey();
        const entry = ResearchLog.entry(key);
        entry.sessions++;
        all[key] = entry;
        ResearchLog.writeAll(all);
        ResearchLog.session = entry.sessions;
        ResearchLog.sessionStart = Date.now();
        ResearchLog.page = null;
        return ResearchLog.record('session_start', { value: mode });
    }

    static record(type, data = {}) {
        const all = ResearchLog.readAll();
        const key = ResearchLog.profileKey();
        const entry = ResearchLog.entry(key);
        const event = { t: new Date().toISOString(), s: ResearchLog.session ?? entry.sessions, gt: ResearchLog.gameSeconds(), type, ...data };
        entry.events.push(event);
        if (entry.events.length > ResearchLog.MAX_EVENTS) entry.events.splice(0, entry.events.length - ResearchLog.MAX_EVENTS);
        all[key] = entry;
        ResearchLog.writeAll(all);
        return event;
    }

    /** Página que entrou na tela (tutorial, livro de aulas, estudo). Fecha a anterior registrando o tempo nela. */
    static startPage(source, target, title) {
        ResearchLog.endPage();
        ResearchLog.page = { source, target: String(target ?? ''), title: String(title || '').replace(/<[^>]*>/g, ''), start: Date.now() };
    }

    static endPage() {
        const page = ResearchLog.page;
        ResearchLog.page = null;
        if (!page) return null;
        const ms = Date.now() - page.start;
        if (ms < ResearchLog.MIN_PAGE_MS) return null;
        return ResearchLog.record('page', { source: page.source, target: page.target, title: page.title, value: Math.min(ms, ResearchLog.MAX_PAGE_MS) });
    }

    /** Números para a tela de exportação. */
    static summary(profileId = ResearchLog.profileKey()) {
        const { sessions, events } = ResearchLog.entry(profileId);
        const of = type => events.filter(e => e.type === type);
        const quizzes = of('quiz');
        const decisions = of('event_decision');
        return {
            sessions,
            events: events.length,
            pages: of('page').length,
            readingMinutes: Math.round(of('page').reduce((sum, e) => sum + (e.value || 0), 0) / 6000) / 10,
            quizzes: quizzes.length,
            quizzesPassed: quizzes.filter(e => e.ok).length,
            decisions: decisions.length,
            goodDecisions: decisions.filter(e => e.ok).length,
            missions: of('mission_done').length,
            lessons: of('lesson_done').length
        };
    }

    static ENERGY_TYPES = ['wind_farm', 'solar_farm', 'hydroelectric_plant', 'biomass_plant', 'sugarcane_mill', 'thermal_plant', 'coal_plant'];

    /**
     * Escolhas que se repetem entre os perfis deste computador (sinal de estratégia dominante, auditoria de design):
     * a abertura (3 primeiras obras), a usina mais escolhida e a resposta mais dada ao Paulo. Uma escolha com
     * pelo menos 80% (e amostra de 3 ou mais) entra em flags.
     */
    static strategyReport(all = ResearchLog.readAll()) {
        const profiles = Object.values(all).filter(e => Array.isArray(e?.events));
        const top = values => {
            const counts = {};
            values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
            const [key, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [null, 0];
            return { key, count: n, total: values.length, share: values.length ? n / values.length : 0 };
        };
        const openings = profiles.map(p => p.events.filter(e => e.type === 'build').slice(0, 3).map(e => e.target))
            .filter(o => o.length === 3).map(o => o.join(' → '));
        const energy = profiles.flatMap(p => p.events.filter(e => e.type === 'build' && ResearchLog.ENERGY_TYPES.includes(e.target)).map(e => e.target));
        const decisions = profiles.flatMap(p => p.events.filter(e => e.type === 'event_decision' && !e.auto).map(e => e.tier || e.value));
        const report = { profiles: profiles.length, opening: top(openings), energy: top(energy), decisions: top(decisions), flags: [] };
        for (const kind of ['opening', 'energy', 'decisions']) {
            const r = report[kind];
            if (r.total >= 3 && r.share >= 0.8) report.flags.push(kind);
        }
        return report;
    }

    static profileInfo(profileId) {
        const profile = typeof PlayerProfile !== 'undefined' ? PlayerProfile.get(profileId) : null;
        return { id: profileId, age: profile?.age ?? null, uf: profile?.uf ?? null, city: profile?.city ?? null };
    }

    static toJSON(profileId = ResearchLog.profileKey()) {
        return {
            format: 'guardiao-da-agua-pesquisa',
            version: ResearchLog.VERSION,
            exportedAt: new Date().toISOString(),
            profile: ResearchLog.profileInfo(profileId),
            summary: ResearchLog.summary(profileId),
            events: ResearchLog.entry(profileId).events
        };
    }

    /** Uma linha por registro; o que não cabe nas colunas fixas vai em "detalhe" (JSON). Separador ";" (Excel pt-BR). */
    static toCSV(profileId = ResearchLog.profileKey()) {
        const profile = ResearchLog.profileInfo(profileId);
        const head = ['perfil', 'idade', 'uf', 'cidade', 'data_hora', 'sessao', 'tempo_jogo_s', 'tipo', 'origem', 'alvo', 'titulo', 'valor', 'acerto', 'detalhe'];
        const cell = v => {
            if (v === undefined || v === null) return '';
            const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const rows = ResearchLog.entry(profileId).events.map(e => {
            const { t, s, gt, type, source, target, title, value, ok, ...extra } = e;
            return [profile.id, profile.age, profile.uf, profile.city, t, s, gt, type, source, target, title, value,
                ok === undefined ? '' : (ok ? 1 : 0), Object.keys(extra).length ? extra : ''].map(cell).join(';');
        });
        return [head.join(';'), ...rows].join('\r\n');
    }

    /** Apaga o registro do jogador (perfil apagado ou pedido do professor). */
    static clear(profileId = ResearchLog.profileKey()) {
        const all = ResearchLog.readAll();
        delete all[profileId];
        ResearchLog.writeAll(all);
    }
}
