/**
 * NotificationLog — histórico das notificações da partida (sem DOM; testado em tests/unit/notifications.test.js).
 *
 * Cada aviso que aparece como toast (UIManager.showNotification) entra aqui, na ordem em que chegou:
 * { text, type, game, clock, real } — texto sem HTML, tipo (info/success/warning/error), gameTime (ms do relógio
 * da simulação), hora do relógio do jogo (ms de gameClockTime) e hora real (Date.now()).
 * Guarda no máximo LIMIT (as mais antigas saem primeiro); o save leva só as SAVE_LIMIT mais recentes para não
 * inchar o jogo salvo. Uma partida nova limpa o histórico; continuar um jogo restaura o que foi salvo.
 */
class NotificationLog {
    static LIMIT = 200;
    static SAVE_LIMIT = 100;
    static TYPES = ['info', 'success', 'warning', 'error'];
    static MAX_TEXT = 300;

    constructor(limit = NotificationLog.LIMIT) {
        this.limit = limit;
        this.entries = [];
    }

    /** Tira tags HTML e espaços repetidos: o histórico guarda só o texto. */
    static plainText(message) {
        return String(message ?? '')
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, NotificationLog.MAX_TEXT);
    }

    static normalizeType(type) {
        return NotificationLog.TYPES.includes(type) ? type : 'info';
    }

    /** Registra um aviso e devolve a entrada criada (ou null se o texto ficou vazio). */
    add(message, type = 'info', { game = 0, clock = null, real = Date.now() } = {}) {
        const text = NotificationLog.plainText(message);
        if (!text) return null;
        const entry = {
            text,
            type: NotificationLog.normalizeType(type),
            game: Number(game) || 0,
            clock: Number.isFinite(clock) ? clock : null,
            real: Number(real) || Date.now()
        };
        this.entries.push(entry);
        if (this.entries.length > this.limit) this.entries.splice(0, this.entries.length - this.limit);
        return entry;
    }

    clear() {
        this.entries = [];
    }

    /** Cópia em ordem de chegada (mais antiga primeiro). */
    list() {
        return this.entries.slice();
    }

    getSaveData(max = NotificationLog.SAVE_LIMIT) {
        return this.entries.slice(-max).map(e => ({ ...e }));
    }

    /** Aceita o que veio do save (ou nada: save antigo) e descarta entradas quebradas. */
    loadData(data) {
        this.entries = [];
        if (!Array.isArray(data)) return;
        data.forEach(e => {
            if (!e || typeof e.text !== 'string') return;
            this.add(e.text, e.type, { game: e.game, clock: Number(e.clock) || null, real: e.real });
        });
    }
}

window.NotificationLog = NotificationLog;
