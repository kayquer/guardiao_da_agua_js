/**
 * Tendência dos pontos de volta (11/2026) — sem DOM (testável em tests/unit/diary.test.js).
 *
 * Na derrota, "⏪ Voltar N minutos" e "🛟 Ponto seguro" (core/game/SavePoints.js) mostram como a cidade estava
 * naquele ponto e para onde ia: "água 38% e caindo, poluição 62 e subindo". Assim o jogador não volta, sem saber,
 * para um estado já perdido. Cada foto do autosave guarda um resumo (`summarize`) e a tendência em relação à foto
 * anterior (`compare`); `describe` monta a frase e diz se o ponto é arriscado.
 */
const SavePointTrend = {
    // Variação mínima entre duas fotos para contar como "subindo"/"caindo" (pontos percentuais/de poluição)
    STEP: { water: 2, pollution: 2, satisfaction: 2, population: 0.03 },
    RISKY_WATER: 35,      // água abaixo disso e caindo = ponto arriscado
    RISKY_POLLUTION: 60,  // poluição acima disso e subindo = ponto arriscado

    /** Resumo de um `game` (GameManager.getSaveData): água em % da caixa, poluição, satisfação, moradores. */
    summarize(game) {
        const r = game?.resources?.resources || {};
        const water = r.water || {};
        const capacity = water.max || water.storage || 0;
        return {
            gameTime: Number(game?.gameTime) || 0,
            water: capacity > 0 ? Math.round(Math.max(0, water.current || 0) / capacity * 100) : 0,
            pollution: Math.round(r.pollution?.current || 0),
            satisfaction: Math.round(r.population?.satisfaction || 0),
            population: Math.round(r.population?.current || 0)
        };
    },

    /** 'up' | 'down' | 'flat' de cada número, de `prev` para `cur` (sem `prev` = tudo 'flat'). */
    compare(prev, cur) {
        const dir = (key, relative = false) => {
            if (!prev || !cur) return 'flat';
            const a = Number(prev[key]) || 0, b = Number(cur[key]) || 0;
            const delta = relative ? (b - a) / Math.max(1, a) : b - a;
            const step = SavePointTrend.STEP[key];
            return delta >= step ? 'up' : delta <= -step ? 'down' : 'flat';
        };
        return { water: dir('water'), pollution: dir('pollution'), satisfaction: dir('satisfaction'), population: dir('population', true) };
    },

    /**
     * Frase do botão: { text, risky, parts }. minutesBack = há quantos minutos de jogo. Água e poluição sempre;
     * satisfação só se estiver mudando.
     */
    describe(summary, trend, minutesBack = null) {
        if (!summary) return null;
        const t = trend || {};
        // sem tendência (foto sem anterior, save antigo): só os números
        const word = d => (!trend ? '' : d === 'up' ? ' e subindo' : d === 'down' ? ' e caindo' : ' estável');
        const parts = [
            { id: 'water', text: `água ${summary.water}%${word(t.water)}`, bad: t.water === 'down', good: t.water === 'up' },
            { id: 'pollution', text: `poluição ${summary.pollution}${word(t.pollution)}`, bad: t.pollution === 'up', good: t.pollution === 'down' }
        ];
        if (t.satisfaction && t.satisfaction !== 'flat') {
            parts.push({ id: 'satisfaction', text: `moradores ${t.satisfaction === 'up' ? 'mais' : 'menos'} felizes (${summary.satisfaction}%)`,
                bad: t.satisfaction === 'down', good: t.satisfaction === 'up' });
        }
        const risky = (t.water === 'down' && summary.water < SavePointTrend.RISKY_WATER) ||
            (t.pollution === 'up' && summary.pollution > SavePointTrend.RISKY_POLLUTION);
        const when = Number.isFinite(minutesBack) ? `há ${minutesBack} min: ` : '';
        return { text: when + parts.map(p => p.text).join(', '), risky, parts };
    }
};

window.SavePointTrend = SavePointTrend;
