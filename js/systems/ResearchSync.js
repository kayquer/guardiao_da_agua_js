/**
 * ResearchSync — envia o registro de pesquisa (ResearchLog) para a planilha da pesquisadora (Google Apps Script,
 * scripts/research/apps-script.gs; URL em RESEARCH_SYNC.ENDPOINT).
 *
 * - Anônimo: de identificação vai só o id do perfil, a idade e a cidade. Nunca o apelido (e, se ele aparecer em
 *   algum texto do registro, vira "{nome}") nem a UF.
 * - Automático a cada RESEARCH_SYNC.INTERVAL_MS, só com o consentimento da caixa do aviso inicial (#start-notice,
 *   ligada por padrão nesta fase do estudo). O botão "☁️ Enviar para a pesquisa" do painel envia na hora.
 * - Todos os perfis deste computador (cada aluno tem o seu), só o que ainda não foi: guarda o último `n` aceito por
 *   perfil em STATE_KEY. Sem internet, fica para o próximo envio; o servidor ignora `n` repetido.
 * - Desligado nos testes E2E (navigator.webdriver), a não ser com ?sync na URL. Sem DOM (tests/unit/research.test.js).
 */
class ResearchSync {
    static CONSENT_KEY = STORAGE_PREFIX + 'research_consent'; // 'yes' | 'no' (StartNotice grava a mesma chave)
    static STATE_KEY = STORAGE_PREFIX + 'research_sync';      // { [profileId]: { sent: n, at: ISO } }
    static FORMAT = 'guardiao-da-agua-pesquisa';

    static timer = null;
    static running = null;     // promessa do envio em andamento (não sobrepõe envios)
    static lastResult = null;  // { ok, sent, at, error? }
    static fetchImpl = (...args) => fetch(...args);

    static endpoint() {
        return String(RESEARCH_SYNC.ENDPOINT || '').trim();
    }

    static isConfigured() {
        return /^https:\/\/\S+$/.test(ResearchSync.endpoint());
    }

    /** Ligado por padrão: só 'no' (caixa desmarcada no aviso) desliga. */
    static hasConsent() {
        try {
            return localStorage.getItem(ResearchSync.CONSENT_KEY) !== 'no';
        } catch {
            return true;
        }
    }

    static setConsent(on) {
        try {
            localStorage.setItem(ResearchSync.CONSENT_KEY, on ? 'yes' : 'no');
        } catch { /* modo privado: vale só nesta abertura */ }
    }

    static readState() {
        try {
            return JSON.parse(localStorage.getItem(ResearchSync.STATE_KEY)) || {};
        } catch {
            return {};
        }
    }

    static writeState(state) {
        try {
            localStorage.setItem(ResearchSync.STATE_KEY, JSON.stringify(state));
        } catch { /* cota cheia: reenviar depois é inofensivo (o servidor ignora n repetido) */ }
    }

    static sentUpTo(profileId) {
        return Number(ResearchSync.readState()[profileId]?.sent) || 0;
    }

    static lastSentAt() {
        const times = Object.values(ResearchSync.readState()).map(s => s?.at).filter(Boolean).sort();
        return times.length ? times[times.length - 1] : null;
    }

    static pendingEvents(profileId) {
        const sent = ResearchSync.sentUpTo(profileId);
        return ResearchLog.entry(profileId).events.filter(e => e.n > sent);
    }

    /** Quantos registros de todos os perfis ainda não foram enviados. */
    static pendingCount() {
        return Object.keys(ResearchLog.readAll()).reduce((sum, id) => sum + ResearchSync.pendingEvents(id).length, 0);
    }

    /** Troca o apelido por "{nome}" em qualquer texto do registro (títulos de páginas personalizados, por exemplo). */
    static scrub(value, name) {
        if (!name || name.length < 2) return value;
        if (typeof value === 'string') return value.split(name).join('{nome}');
        if (Array.isArray(value)) return value.map(v => ResearchSync.scrub(v, name));
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, ResearchSync.scrub(v, name)]));
        }
        return value;
    }

    static payload(profileId, events) {
        const profile = typeof PlayerProfile !== 'undefined' ? PlayerProfile.get(profileId) : null;
        return {
            format: ResearchSync.FORMAT,
            version: ResearchLog.VERSION,
            sentAt: new Date().toISOString(),
            profile: { id: profileId, age: profile?.age ?? null, city: profile?.city ?? null },
            events: ResearchSync.scrub(events, profile?.name)
        };
    }

    static async post(body) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeout = controller ? setTimeout(() => controller.abort(), RESEARCH_SYNC.TIMEOUT_MS) : null;
        try {
            // text/plain: requisição "simples", sem preflight CORS (o Apps Script não responde OPTIONS)
            const res = await ResearchSync.fetchImpl(ResearchSync.endpoint(), {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(body),
                redirect: 'follow',
                signal: controller?.signal
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!data?.ok) throw new Error(data?.error || 'resposta inválida');
            return data;
        } finally {
            if (timeout) clearTimeout(timeout);
        }
    }

    /** Envia o que falta de um perfil, em lotes. Devolve quantos registros foram aceitos. */
    static async syncProfile(profileId) {
        let sent = 0;
        let events = ResearchSync.pendingEvents(profileId);
        while (events.length) {
            const batch = events.slice(0, RESEARCH_SYNC.BATCH);
            await ResearchSync.post(ResearchSync.payload(profileId, batch));
            const state = ResearchSync.readState();
            state[profileId] = { sent: batch[batch.length - 1].n, at: new Date().toISOString() };
            ResearchSync.writeState(state);
            sent += batch.length;
            events = events.slice(batch.length);
        }
        return sent;
    }

    /** Envia todos os perfis deste computador. Nunca lança: devolve { ok, sent, error? }. */
    static syncAll() {
        if (ResearchSync.running) return ResearchSync.running;
        ResearchSync.running = (async () => {
            if (!ResearchSync.isConfigured()) return { ok: false, sent: 0, error: 'not_configured' };
            let sent = 0;
            try {
                for (const id of Object.keys(ResearchLog.readAll())) sent += await ResearchSync.syncProfile(id);
                return { ok: true, sent };
            } catch (error) {
                logWarn('📊 Envio dos dados de pesquisa falhou (tenta de novo depois):', error?.message || error);
                return { ok: false, sent, error: String(error?.message || error) };
            }
        })().then(result => {
            ResearchSync.lastResult = { ...result, at: new Date().toISOString() };
            ResearchSync.running = null;
            return result;
        });
        return ResearchSync.running;
    }

    static autoEnabled() {
        const automated = typeof navigator !== 'undefined' && navigator.webdriver && !/[?&]sync\b/.test(location.search);
        return !automated && ResearchSync.isConfigured() && ResearchSync.hasConsent();
    }

    /** Liga o envio automático (main.js, depois do aviso inicial). */
    static start() {
        ResearchSync.stop();
        if (!ResearchSync.autoEnabled()) return false;
        const tick = () => { if (ResearchSync.autoEnabled()) ResearchSync.syncAll(); };
        ResearchSync.timer = setTimeout(function loop() {
            tick();
            ResearchSync.timer = setTimeout(loop, RESEARCH_SYNC.INTERVAL_MS);
        }, RESEARCH_SYNC.FIRST_DELAY_MS);
        return true;
    }

    static stop() {
        if (ResearchSync.timer) clearTimeout(ResearchSync.timer);
        ResearchSync.timer = null;
    }
}
