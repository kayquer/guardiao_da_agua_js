/**
 * Vigia de queda (sem DOM; tests/unit/rescue.test.js): guarda amostras dos recursos por tempo de jogo e diz quais
 * estão piorando SEM PARAR na janela inteira — quase nenhum passo melhorando e uma piora grande no total.
 * Quem usa: js/systems/RescueGuides.js (guia de socorro da Cláudia com o que construir).
 * Valores de ResourceTrends.rawValue: água = fração do tanque, energia = geração ÷ consumo, o resto em pontos/R$.
 */
class DeclineWatch {
    static RESOURCES = ['water', 'energy', 'pollution', 'budget', 'satisfaction', 'population'];

    // Piora mínima na janela para contar. energy: faltando energia em todas as amostras e sem melhorar.
    static RULES = {
        water: { drop: 0.1 },                    // 10% do tanque
        pollution: { rise: 6, min: 35 },         // +6 pontos, já acima de 35
        budget: { dropRatio: 0.1, dropMin: 2000 },
        satisfaction: { drop: 5 },
        population: { dropRatio: 0.05 },
        energy: { below: 0.98 }
    };

    constructor({ sampleMs = 5000, windowMs = 60000 } = {}) {
        this.sampleMs = sampleMs;
        this.windowMs = windowMs;
        this.reset();
    }

    reset() {
        this.samples = [];
        this.lastSampleAt = -Infinity;
    }

    /** Uma amostra a cada sampleMs de tempo de jogo. */
    sample(resources, now) {
        if (now - this.lastSampleAt < this.sampleMs) return false;
        this.lastSampleAt = now;
        const values = {};
        DeclineWatch.RESOURCES.forEach(id => { values[id] = ResourceTrends.rawValue(id, resources); });
        this.samples.push({ t: now, values });
        while (this.samples.length > 2 && this.samples[0].t < now - this.windowMs * 1.5) this.samples.shift();
        return true;
    }

    /** Amostras da última janela, só se ela já cobre quase toda a janela (sem dados = nada está caindo). */
    windowSamples() {
        if (this.samples.length < 3) return null;
        const last = this.samples[this.samples.length - 1];
        const list = this.samples.filter(s => s.t >= last.t - this.windowMs);
        if (list.length < 3 || last.t - list[0].t < this.windowMs * 0.9) return null;
        return list;
    }

    /** Ids piorando sem parar, do mais grave (pela ordem de RESOURCES) para o menos. */
    declining() {
        const list = this.windowSamples();
        if (!list) return [];
        return DeclineWatch.RESOURCES.filter(id => DeclineWatch.isDeclining(id, list.map(s => s.values[id])));
    }

    /** `values` em ordem de tempo. Melhorar = subir (poluição: descer). Tolera 1 passo de 6 melhorando (ruído). */
    static isDeclining(id, values) {
        const rule = DeclineWatch.RULES[id];
        if (!rule || values.length < 3) return false;
        const first = values[0], last = values[values.length - 1];
        if (id === 'energy') return values.every(v => v < rule.below) && last <= first + 0.01;
        const sign = id === 'pollution' ? -1 : 1; // +1: cair é piorar
        let improving = 0;
        for (let i = 1; i < values.length; i++) {
            if ((values[i] - values[i - 1]) * sign > 1e-6) improving++;
        }
        if (improving > Math.floor((values.length - 1) / 6)) return false;
        const worse = (first - last) * sign;
        switch (id) {
            case 'pollution': return worse >= rule.rise && last >= rule.min;
            case 'budget': return worse >= Math.max(rule.dropMin, Math.abs(first) * rule.dropRatio);
            case 'population': return first > 0 && worse >= first * rule.dropRatio;
            default: return worse >= rule.drop;
        }
    }
}
