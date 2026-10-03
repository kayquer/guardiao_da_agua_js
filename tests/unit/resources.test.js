const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/core/ResourceManager.js');
const ResourceManager = g('ResourceManager');
const CONFIG = g('GAME_CONFIG');

test('começa com os valores de GAME_CONFIG', () => {
    const rm = new ResourceManager();
    assert.strictEqual(rm.resources.budget.current, CONFIG.resources.initialBudget);
    assert.strictEqual(rm.resources.water.current, CONFIG.resources.initialWater);
    assert.strictEqual(rm.resources.population.current, CONFIG.resources.initialPopulation);
});

test('spendBudget recusa gasto acima do saldo e não altera nada', () => {
    const rm = new ResourceManager();
    const before = rm.resources.budget.current;
    assert.strictEqual(rm.spendBudget(before + 1), false);
    assert.strictEqual(rm.resources.budget.current, before);
    assert.strictEqual(rm.spendBudget(100), true);
    assert.strictEqual(rm.resources.budget.current, before - 100);
});

test('água fica entre 0 e a capacidade de armazenamento', () => {
    const rm = new ResourceManager();
    rm.resources.water.production = 1e9;
    rm.updateWater();
    assert.strictEqual(rm.resources.water.current, rm.resources.water.storage);

    rm.resources.water.production = 0;
    rm.resources.population.current = 1e9;
    rm.invalidateConsumptionCache();
    rm.updateWater();
    assert.strictEqual(rm.resources.water.current, 0);
});

test('reduzir armazenamento corta a água excedente', () => {
    const rm = new ResourceManager();
    rm.resources.water.current = 1000;
    rm.resources.water.storage = 1000;
    rm.removeWaterStorage(600);
    assert.strictEqual(rm.resources.water.storage, 400);
    assert.strictEqual(rm.resources.water.current, 400);
});

test('save/load preserva os recursos', () => {
    const rm = new ResourceManager();
    rm.spendBudget(1234);
    const restored = new ResourceManager();
    restored.loadData(JSON.parse(JSON.stringify(rm.getSaveData())));
    assert.strictEqual(JSON.stringify(restored.resources), JSON.stringify(rm.resources));
});

test('adjustResource soma e respeita [0, max]', () => {
    const rm = new ResourceManager();
    const budget = rm.resources.budget.current;
    rm.adjustResource('budget', 500);
    assert.strictEqual(rm.resources.budget.current, budget + 500);
    rm.adjustResource('budget', -1e9);
    assert.strictEqual(rm.resources.budget.current, 0);
    rm.adjustResource('pollution', 1000);
    assert.strictEqual(rm.resources.pollution.current, rm.resources.pollution.max);
});
