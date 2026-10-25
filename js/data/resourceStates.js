/**
 * Botões de recurso do HUD: faixas de estado (ícone/visual/som) e sensibilidade da seta de tendência.
 * Dados puros; a regra está em js/systems/ResourceTrends.js e a tela em js/systems/ui/ResourceHud.js.
 *
 * Faixas, da melhor para a pior: great → ok → low → critical. O ícone de "ok" é o normal (res-<id>);
 * os outros são res-<id>-great/low/critical. `better: 'low'` = quanto menor, melhor (poluição).
 * `flat` = variação mínima na janela para a seta sair do "estável" (na unidade de `metric`).
 */
const RESOURCE_STATES = {
    windowMs: 12000,      // a seta compara o valor de agora com o de ~12 s de jogo atrás
    sampleMs: 1000,
    alertCooldownMs: 20000, // um alerta sonoro por recurso a cada 20 s, no máximo
    resources: {
        // fração da caixa d'água cheia
        water: { selector: '#water-amount', compact: '#compact-water', metric: 'ratio', flat: 0.01, tiers: { great: 0.8, ok: 0.4, low: 0.15 } },
        // pontos de poluição (0-100): alertas centrais em 60/80/90, derrota em 90
        pollution: { selector: '#pollution-level', metric: 'value', better: 'low', flat: 0.5, tiers: { great: 20, ok: 45, low: 70 } },
        // crescimento em % da população por minuto (cheia = great, encolhendo = low/critical)
        population: { selector: '#population-count', compact: '#compact-population', metric: 'growth', flat: 0.3, tiers: { great: 1.5, ok: -0.3, low: -3 } },
        satisfaction: { selector: '#satisfaction-level', metric: 'value', flat: 0.5, tiers: { great: 80, ok: 55, low: 30 } },
        // reais em caixa; com saldo por minuto negativo cai uma faixa
        budget: { selector: '#budget-amount', compact: '#compact-budget', metric: 'value', flat: 50, tiers: { great: 30000, ok: 8000, low: 2000 } },
        // eficiência elétrica (geração ÷ consumo); sobra de 25 % = great
        energy: { selector: '#electricity-amount', compact: '#compact-energy', metric: 'efficiency', flat: 0.02, tiers: { great: 1.25, ok: 1, low: 0.5 } }
    },
    labels: { great: 'muito bem', ok: 'normal', low: 'piorando', critical: 'crítico' },
    trendLabels: { up: 'subindo', flat: 'estável', down: 'caindo' }
};
