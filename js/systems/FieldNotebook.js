/**
 * Caderno de Campo da Márcia — sem DOM nem Babylon (testável em tests/unit/notebook.test.js).
 *
 * Recebe o que o PropSystem desenhou (placements com modelo carregado) e descobre quais espécies do caderno
 * (FIELD_NOTEBOOK) chegaram ou sumiram desde a última olhada:
 *   - a primeira olhada da partida (ou depois de carregar) só registra, em silêncio: o rio do começo já tem bichos;
 *   - espécie nova no mapa → `found` (first = nunca vista; returned = tinha sumido e voltou: o grande momento);
 *   - espécie que saiu → `gone` (o Paulo avisa: bicho sumindo é sinal de água piorando).
 * Para a poluição oscilando perto do limite não virar enxurrada de avisos, cada espécie só gera aviso de novo
 * depois de MOMENT_COOLDOWN_MS de jogo (o registro continua). Salvo no jogo (`game.notebook`).
 */
class FieldNotebook {
    static MOMENT_COOLDOWN_MS = 180000;

    constructor() {
        this.seen = {};          // id → { first (gameTime), returns, goneAt?, lastMoment? }
        this.present = new Set();
        this.primed = false;
    }

    static entry(id) {
        return typeof FIELD_NOTEBOOK !== 'undefined' ? FIELD_NOTEBOOK[id] || null : null;
    }

    static ids() {
        return typeof FIELD_NOTEBOOK !== 'undefined' ? Object.keys(FIELD_NOTEBOOK) : [];
    }

    /** Faixa de poluição do prop (props.js cleanBelow = [some, todos]): o caderno mostra a mesma do mapa. */
    static range(id) {
        const clean = typeof PROP_TYPES !== 'undefined' ? PROP_TYPES[id]?.cleanBelow : null;
        return clean ? { gone: clean[0], full: clean[1] } : null;
    }

    /** Primeira célula de cada espécie do caderno no plano: Map id → { x, z }. */
    static speciesIn(placements) {
        const map = new Map();
        for (const p of placements || []) {
            if (FieldNotebook.entry(p.id) && !map.has(p.id)) map.set(p.id, { x: p.x, z: p.z });
        }
        return map;
    }

    /**
     * Olha o plano de agora. Devolve { found: [{ id, cell, first, returned, notify }], gone: [{ id, notify }] }.
     * `notify` = passou o intervalo mínimo desde o último aviso daquela espécie.
     */
    observe(placements, gameTime = 0) {
        const now = FieldNotebook.speciesIn(placements);
        const found = [];
        const gone = [];
        if (!this.primed) {
            this.primed = true;
            now.forEach((cell, id) => {
                if (!this.seen[id]) this.seen[id] = { first: gameTime, returns: 0 };
                delete this.seen[id].goneAt;
            });
            this.present = new Set(now.keys());
            return { found, gone };
        }
        const canNotify = rec => gameTime - (rec.lastMoment ?? -Infinity) >= FieldNotebook.MOMENT_COOLDOWN_MS;
        now.forEach((cell, id) => {
            if (this.present.has(id)) return;
            const rec = this.seen[id];
            const first = !rec;
            const returned = !!rec && rec.goneAt != null;
            const record = rec || (this.seen[id] = { first: gameTime, returns: 0 });
            if (returned) record.returns++;
            delete record.goneAt;
            const notify = first || canNotify(record);
            if (notify) record.lastMoment = gameTime;
            found.push({ id, cell, first, returned, notify });
        });
        this.present.forEach(id => {
            if (now.has(id)) return;
            const record = this.seen[id] || (this.seen[id] = { first: gameTime, returns: 0 });
            record.goneAt = gameTime;
            const notify = canNotify(record);
            if (notify) record.lastMoment = gameTime;
            gone.push({ id, notify });
        });
        this.present = new Set(now.keys());
        return { found, gone };
    }

    /** Situação de cada espécie para o caderno: 'here' (no mapa), 'gone' (já vista, sumiu) ou 'unknown'. */
    status(id) {
        if (this.present.has(id)) return 'here';
        return this.seen[id] ? 'gone' : 'unknown';
    }

    count() {
        return FieldNotebook.ids().filter(id => this.seen[id]).length;
    }

    getSaveData() {
        return { seen: structuredClone(this.seen) };
    }

    /** Depois de carregar, a próxima olhada é silenciosa (os bichos de agora já estavam lá). */
    loadData(data) {
        this.seen = data?.seen && typeof data.seen === 'object' ? structuredClone(data.seen) : {};
        this.present = new Set();
        this.primed = false;
    }
}

window.FieldNotebook = FieldNotebook;
