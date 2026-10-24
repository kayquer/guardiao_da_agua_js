// Eventos fazem o que dizem: seca corta a produção, vazamento desperdiça, campanha economiza, a falha de equipamento
// é consertada no fim — e o fim de cada evento desfaz exatamente o começo.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/core/ResourceManager.js', 'js/systems/EventSystem.js');
const ResourceManager = g('ResourceManager');
const EventSystem = g('EventSystem');

function setup(buildings = []) {
    const notes = [];
    const applied = [];
    const gm = {
        uiManager: { showNotification: (msg) => notes.push(msg) },
        buildingSystem: {
            buildings: new Map(buildings.map(b => [b.id, b])),
            getAllBuildings: () => buildings,
            applyBuildingEffects: (b, add) => { applied.push([b.id, add]); b.effectsApplied = add; }
        }
    };
    gm.resourceManager = new ResourceManager(gm);
    gm.eventSystem = new EventSystem(gm);
    return { es: gm.eventSystem, rm: gm.resourceManager, res: gm.resourceManager.resources, notes, applied };
}

const snapshot = rm => JSON.stringify(rm.resources);

test('seca: produção efetiva cai pela metade e volta no fim', () => {
    const { es, rm, res } = setup();
    res.water.production = 100;
    const ev = es.triggerEvent('drought');
    assert.strictEqual(rm.getEffectiveWaterProduction(), 50);
    assert.strictEqual(rm.getWaterBalance().production, 50);
    es.endEvent(ev.id);
    assert.strictEqual(rm.getEffectiveWaterProduction(), 100);
    assert.strictEqual(res.water.productionMultiplier, 1);
});

test('seca muda a água que entra na reserva', () => {
    const { es, rm, res } = setup();
    res.water.production = 600;
    res.population.current = 0;
    res.water.current = 0;
    rm.invalidateConsumptionCache();
    rm.updateWater();
    const normal = res.water.current;
    res.water.current = 0;
    es.triggerEvent('drought');
    rm.invalidateConsumptionCache();
    rm.updateWater();
    assert.ok(Math.abs(res.water.current - normal / 2) < 1e-6);
});

test('duração vinda da missão troca a padrão', () => {
    const { es } = setup();
    const ev = es.triggerEvent('drought', false, { duration: 240000 });
    assert.strictEqual(ev.remainingTime, 240000);
});

test('vazamento, campanha e visitantes mexem no consumo/desperdício/satisfação e desfazem no fim', () => {
    const { es, rm, res } = setup();
    res.population.current = 500;
    rm.invalidateConsumptionCache(); // o cache de 100 ms guarda o consumo do construtor
    rm.updateConsumption();
    const base = { consumption: res.water.consumption, waste: res.water.waste };

    const before = snapshot(rm);
    const leak = es.triggerEvent('pipe_leak');
    rm.invalidateConsumptionCache(); rm.updateConsumption();
    assert.ok(res.water.waste > base.waste + 24, 'vazamento soma desperdício');
    es.endEvent(leak.id);

    const campaign = es.triggerEvent('water_conservation_campaign');
    rm.updateConsumption();
    assert.ok(Math.abs(res.water.consumption - base.consumption * 0.85) < 1e-6, 'campanha: −15%');
    assert.strictEqual(res.population.eventSatisfaction, 10);
    es.endEvent(campaign.id);
    rm.updateConsumption();
    assert.ok(Math.abs(res.water.consumption - base.consumption) < 1e-6);
    assert.strictEqual(res.population.eventSatisfaction, 0);
    // o vazamento custa R$ 2.000 (fica pago); o resto volta ao que era
    const after = JSON.parse(snapshot(rm));
    const prev = JSON.parse(before);
    assert.strictEqual(prev.budget.current - after.budget.current, 2000);
});

test('crescimento populacional traz gente e demanda maior só enquanto dura', () => {
    const { es, rm, res } = setup();
    res.population.current = 200;
    res.population.max = 1000;
    const ev = es.triggerEvent('population_boom');
    assert.strictEqual(res.population.current, 300);
    assert.ok(res.water.demandMultiplier > 1);
    es.endEvent(ev.id);
    assert.strictEqual(res.water.demandMultiplier, 1);
    assert.strictEqual(res.population.current, 300, 'os novos moradores ficam');
});

test('falha de equipamento: o prédio para e volta a funcionar no fim, com o conserto pago', () => {
    const pump = { id: 'b1', active: true, effectsApplied: true, underConstruction: false, config: { name: 'Bomba' } };
    const road = { id: 'r1', active: true, effectsApplied: true, underConstruction: false, config: { name: 'Rua', roadType: 'paved' } };
    const { es, res, applied } = setup([road, pump]);
    const budget = res.budget.current;
    const ev = es.triggerEvent('equipment_failure');
    assert.strictEqual(ev.disabledBuildingId, 'b1', 'rua não para');
    assert.strictEqual(pump.active, false);
    es.endEvent(ev.id);
    assert.strictEqual(pump.active, true);
    assert.deepStrictEqual(JSON.stringify(applied), JSON.stringify([['b1', false], ['b1', true]]));
    assert.strictEqual(budget - res.budget.current, 5000);
});

test('poluição industrial encarece o tratamento enquanto dura', () => {
    const plant = { id: 't1', active: true, effectsApplied: true, config: { category: 'treatment', maintenanceCost: 300 } };
    const { es, res } = setup([plant]);
    const ev = es.triggerEvent('industrial_pollution');
    assert.strictEqual(res.budget.expenses, 150);
    es.endEvent(ev.id);
    assert.strictEqual(res.budget.expenses, 0);
});

test('chuva intensa limpa um pouco o rio e enche a produção', () => {
    const { es, rm, res } = setup();
    const before = snapshot(rm);
    const ev = es.triggerEvent('heavy_rain');
    assert.strictEqual(res.pollution.reduction, 5);
    assert.strictEqual(res.water.production, 20);
    assert.strictEqual(res.water.aquiferRecharge, 4, 'a chuva infiltra e recarrega o aquífero');
    es.endEvent(ev.id);
    const after = JSON.parse(snapshot(rm));
    assert.strictEqual(after.water.aquiferRecharge, 0);
    delete after.water.aquiferRecharge;
    assert.strictEqual(JSON.stringify(after), before);
});

test('dica educativa aparece como notificação', () => {
    const { es, notes } = setup();
    es.showEducationalContent({ message: 'Secas são longas.', tips: ['Guarde água'] });
    assert.ok(notes.some(n => n.includes('Secas são longas.') && n.includes('Guarde água')));
});
