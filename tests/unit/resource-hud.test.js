// Botões de recurso do HUD: faixa de cada recurso (ícone/visual/som) e seta de tendência por tempo de jogo.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/data/resourceStates.js', 'js/systems/ResourceTrends.js');
const ResourceTrends = g('ResourceTrends');
const STATES = g('RESOURCE_STATES');

const city = (o = {}) => ({
    water: { current: 500, storage: 1000, ...o.water },
    pollution: { current: 30, ...o.pollution },
    population: { current: 100, max: 500, satisfaction: 60, ...o.population },
    budget: { current: 20000, income: 100, expenses: 50, ...o.budget },
    electricity: { generation: 100, consumption: 90, ...o.electricity }
});

test('água: cachoeira cheia → gota → torneira pingando → deserto', () => {
    const tier = current => ResourceTrends.tierOf('water', city({ water: { current } }));
    assert.deepStrictEqual([900, 500, 200, 50].map(tier), ['great', 'ok', 'low', 'critical']);
});

test('poluição: quanto menor, melhor', () => {
    const tier = current => ResourceTrends.tierOf('pollution', city({ pollution: { current } }));
    assert.deepStrictEqual([10, 30, 60, 85].map(tier), ['great', 'ok', 'low', 'critical']);
});

test('orçamento cai uma faixa quando o saldo por minuto está negativo', () => {
    assert.strictEqual(ResourceTrends.tierOf('budget', city({ budget: { current: 50000 } })), 'great');
    assert.strictEqual(ResourceTrends.tierOf('budget', city({ budget: { current: 50000, income: 10, expenses: 90 } })), 'ok');
    assert.strictEqual(ResourceTrends.tierOf('budget', city({ budget: { current: 1000, income: 10, expenses: 90 } })), 'critical');
});

test('energia pela eficiência; cidade que ainda não consome fica normal', () => {
    const tier = (generation, consumption) => ResourceTrends.tierOf('energy', city({ electricity: { generation, consumption } }));
    assert.deepStrictEqual([tier(150, 100), tier(100, 100), tier(60, 100), tier(20, 100)], ['great', 'ok', 'low', 'critical']);
    assert.strictEqual(tier(0, 0), 'ok');
});

test('população pelo crescimento; cidade cheia é "muito bem"', () => {
    const r = city();
    assert.strictEqual(ResourceTrends.tierOf('population', r, 2), 'great');
    assert.strictEqual(ResourceTrends.tierOf('population', r, 0), 'ok');
    assert.strictEqual(ResourceTrends.tierOf('population', r, -1), 'low');
    assert.strictEqual(ResourceTrends.tierOf('population', r, -5), 'critical');
    assert.strictEqual(ResourceTrends.tierOf('population', city({ population: { current: 490 } }), 0), 'great');
});

test('seta: compara com ~12 s de jogo atrás; poluição subindo é ruim; sem tempo andando, sem amostra', () => {
    const t = new ResourceTrends();
    const r = city();
    for (let s = 0; s <= 12; s++) {
        r.water.current = 500 - s * 10;      // caindo
        r.pollution.current = 30 + s;        // subindo
        r.budget.current = 20000;            // parado
        t.sample(r, s * 1000);
    }
    assert.strictEqual(JSON.stringify(t.trend('water')), JSON.stringify({ dir: 'down', good: false }));
    assert.strictEqual(JSON.stringify(t.trend('pollution')), JSON.stringify({ dir: 'up', good: false }));
    assert.strictEqual(t.trend('budget').dir, 'flat');
    assert.strictEqual(t.sample(r, 12000), false, 'mesmo tempo de jogo (pausa): não guarda');
    // a população que cresce 10% em 12 s cresce 50% por minuto
    const p = new ResourceTrends();
    p.sample(city({ population: { current: 100 } }), 0);
    p.sample(city({ population: { current: 110 } }), 12000);
    assert.ok(Math.abs(p.populationGrowth() - 50) < 0.01);
});

test('comparação de faixas e ícone de cada faixa existe', () => {
    assert.ok(ResourceTrends.compare('ok', 'critical') > 0);
    assert.ok(ResourceTrends.compare('low', 'great') < 0);
    for (const id of Object.keys(STATES.resources)) {
        for (const tier of ResourceTrends.TIERS) {
            const file = `assets/icons/svg/res-${id}${tier === 'ok' ? '' : '-' + tier}.svg`;
            assert.ok(fs.existsSync(path.join(ROOT, file)), file);
        }
    }
});
