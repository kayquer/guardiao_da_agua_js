const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/systems/NotificationLog.js', 'js/core/ResourceManager.js');
const NotificationLog = g('NotificationLog');
const ResourceManager = g('ResourceManager');

// ===== Histórico de notificações =====

test('guarda em ordem de chegada, com tipo, hora do jogo e hora real, sem HTML', () => {
    const log = new NotificationLog();
    log.add('<b>Bomba</b> pronta!<br>Água +10', 'success', { game: 1000, clock: 5000, real: 42 });
    log.add('Falta energia', 'warning', { game: 2000, clock: 6000, real: 43 });
    const list = log.list();
    assert.strictEqual(list.length, 2);
    assert.strictEqual(list[0].text, 'Bomba pronta! Água +10');
    assert.strictEqual(JSON.stringify(list[0]), JSON.stringify({ text: 'Bomba pronta! Água +10', type: 'success', game: 1000, clock: 5000, real: 42 }));
    assert.strictEqual(list[1].type, 'warning');
});

test('tipo desconhecido vira info e texto vazio não entra', () => {
    const log = new NotificationLog();
    assert.strictEqual(log.add('Oi', 'banana').type, 'info');
    assert.strictEqual(log.add('   <br>  ', 'info'), null);
    assert.strictEqual(log.list().length, 1);
});

test('limite: as mais antigas saem primeiro', () => {
    const log = new NotificationLog(3);
    ['a', 'b', 'c', 'd', 'e'].forEach(t => log.add(t));
    assert.strictEqual(JSON.stringify(log.list().map(e => e.text)), JSON.stringify(['c', 'd', 'e']));
    assert.strictEqual(NotificationLog.LIMIT, 200);
});

test('save leva só as SAVE_LIMIT mais recentes e o load restaura (save antigo = vazio)', () => {
    const log = new NotificationLog();
    for (let i = 0; i < 150; i++) log.add(`aviso ${i}`, 'info', { game: i, clock: null, real: i + 1 });
    const saved = JSON.parse(JSON.stringify(log.getSaveData()));
    assert.strictEqual(saved.length, NotificationLog.SAVE_LIMIT);
    assert.strictEqual(saved[0].text, 'aviso 50');

    const other = new NotificationLog();
    other.loadData(saved);
    assert.strictEqual(other.list().length, 100);
    assert.strictEqual(other.list()[99].text, 'aviso 149');
    assert.strictEqual(other.list()[0].clock, null);

    other.loadData(undefined);
    assert.strictEqual(other.list().length, 0);
    other.loadData([null, { text: 5 }, { text: 'ok', type: 'error' }]);
    assert.strictEqual(JSON.stringify(other.list().map(e => e.text)), JSON.stringify(['ok']));
});

// ===== Consumo de água e despesas agrupados =====

const type = (id, extra) => ({ id, name: id, ...extra });
const HOUSE = type('house', { populationCapacity: 100, waterConsumption: 0 });
const SHOP = type('shop', { waterConsumption: 20, maintenanceCost: 50 });
const PUMP = type('pump', { maintenanceCost: 30 });
const b = (config, extra = {}) => ({ type: config.id, config, active: true, effectsApplied: true, ...extra });

test('consumidores de água: agrupa por tipo, divide moradores pela capacidade e a soma bate com o consumo', () => {
    const rm = new ResourceManager();
    const buildings = [b(HOUSE), b(HOUSE), b(SHOP), b(SHOP), b(SHOP), b(PUMP)];
    buildings.filter(x => x.config.waterConsumption).forEach(x => rm.addWaterConsumption(x.config.waterConsumption));
    rm.resources.population.current = 350;
    rm.resources.population.max = 700; // 500 da cidade + 2 × 100

    const { groups, total } = rm.getWaterConsumers(buildings);
    rm.invalidateConsumptionCache();
    rm.updateConsumption();
    assert.strictEqual(total, rm.resources.water.consumption);
    assert.ok(Math.abs(groups.reduce((s, x) => s + x.total, 0) - total) < 1e-9);

    const byKey = Object.fromEntries(groups.map(x => [x.key, x]));
    assert.strictEqual(byKey.shop.count, 3);
    assert.strictEqual(byKey.shop.total, 60);
    assert.strictEqual(byKey.house.count, 2);
    assert.strictEqual(byKey.house.people, 100); // 350 × 200/700
    assert.strictEqual(byKey.house.total, 200);
    assert.strictEqual(byKey.residents.people, 250);
    assert.ok(!byKey.pump, 'quem não consome não aparece');
    // do maior para o menor
    assert.strictEqual(JSON.stringify(groups.map(x => x.key)), JSON.stringify(['residents', 'house', 'shop']));
});

test('consumidores de água: obra/prédio sem efeitos não conta; consumo fora dos prédios vira "Outros consumos"', () => {
    const rm = new ResourceManager();
    rm.resources.population.current = 0;
    const buildings = [b(SHOP), b(SHOP, { effectsApplied: false, underConstruction: true })];
    rm.addWaterConsumption(20);
    rm.addWaterConsumption(7); // ex.: árvores plantadas consumindo direto
    const { groups, total } = rm.getWaterConsumers(buildings);
    assert.strictEqual(total, 27);
    assert.strictEqual(groups.find(x => x.key === 'shop').count, 1);
    assert.strictEqual(groups.find(x => x.key === 'other').total, 7);
});

test('despesas: agrupa por tipo e a soma bate com budget.expenses (sobra vira "Outras despesas")', () => {
    const rm = new ResourceManager();
    const buildings = [b(SHOP), b(SHOP), b(PUMP), b(PUMP, { effectsApplied: false }), b(HOUSE)];
    buildings.filter(x => x.effectsApplied).forEach(x => rm.addExpense(ResourceManager.buildingMaintenance(x)));
    let r = rm.getExpenseBreakdown(buildings);
    assert.strictEqual(JSON.stringify(r.groups.map(x => [x.key, x.count, x.total])), JSON.stringify([['shop', 2, 100], ['pump', 1, 30]]));
    assert.strictEqual(r.total, 130);

    rm.addExpense(15);
    r = rm.getExpenseBreakdown(buildings);
    assert.strictEqual(r.groups.reduce((s, x) => s + x.total, 0), r.total);
    assert.strictEqual(r.groups.find(x => x.key === 'other').total, 15);
});
