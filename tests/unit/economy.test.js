// Economia e efeitos dos prédios: receita dos prédios entra no caixa (antes era apagada a cada segundo),
// bônus de satisfação com teto, prédios verdes com efeito real e recomposição de saves antigos.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/data/zoneLots.js',
    'js/systems/BuildingSystem.js', 'js/systems/building/ZoneGrowth.js', 'js/systems/building/BuildingEfficiency.js',
    'js/systems/building/TreeGrowth.js', 'js/core/ResourceManager.js');
const BuildingSystem = g('BuildingSystem');
const ResourceManager = g('ResourceManager');
const BUILDINGS = g('BUILDING_TYPES');
const win = g('window');

let nextId = 1;
const make = (type, extra = {}) => ({
    id: `building_${nextId++}`, type, gridX: nextId, gridZ: 0, config: { ...BUILDINGS[type], id: type },
    underConstruction: false, active: true, efficiency: 1, ...extra
});

function city(buildings = []) {
    const bs = Object.create(BuildingSystem.prototype);
    const gm = { gameTime: 0 };
    const rm = new ResourceManager(gm);
    Object.assign(bs, { buildings: new Map(), gameManager: gm, refreshZoneLot() {} });
    Object.assign(gm, { resourceManager: rm, buildingSystem: bs });
    buildings.forEach(b => bs.buildings.set(b.id, b));
    win.gameManager = gm;
    return { bs, rm };
}

test('receita de um prédio pronto continua no caixa depois do recálculo de impostos', () => {
    const shop = make('shopping_center');
    const { bs, rm } = city([shop]);
    bs.applyBuildingEffects(shop, true);
    rm.calculateTaxRevenue();
    const expected = ResourceManager.BASE_INCOME + rm.taxRevenue.total + BUILDINGS.shopping_center.incomeGeneration;
    assert.strictEqual(rm.resources.budget.income, expected);
    rm.calculateTaxRevenue();
    assert.strictEqual(rm.resources.budget.income, expected, 'segundo tick não apaga');

    bs.applyBuildingEffects(shop, false);
    rm.calculateTaxRevenue();
    assert.strictEqual(rm.resources.budget.buildingIncome, 0);
});

test('o caixa cresce com a receita dos prédios ao longo dos ticks', () => {
    const run = withShop => {
        const shop = make('shopping_center');
        const { bs, rm } = city([shop]);
        if (withShop) bs.applyBuildingEffects(shop, true);
        const start = rm.resources.budget.current;
        for (let i = 0; i < 60; i++) rm.updateBudget();
        return rm.resources.budget.current - start;
    };
    const diff = run(true) - run(false);
    const shop = BUILDINGS.shopping_center;
    assert.ok(Math.abs(diff - (shop.incomeGeneration - shop.maintenanceCost)) < 1, `1 min de shopping rende o líquido (${diff})`);
});

test('satisfação dos prédios: soma, teto e retorno decrescente', () => {
    const effect = ResourceManager.buildingSatisfactionEffect;
    assert.strictEqual(effect(0), 0);
    assert.ok(effect(20) > 0);
    assert.ok(effect(1000) <= ResourceManager.BUILDING_SATISFACTION_MAX);
    assert.ok(effect(40) - effect(20) < effect(20), 'o segundo prédio soma menos que o primeiro');

    const park = make('park');
    const { bs, rm } = city([park]);
    Object.assign(rm.resources.electricity, { generation: 1e6, efficiency: 1 }); // energia de sobra: mede só os serviços
    rm.updatePopulation();
    const before = rm.resources.population.satisfaction;
    bs.applyBuildingEffects(park, true);
    rm.updatePopulation();
    assert.ok(rm.resources.population.satisfaction > before, 'parque pronto deixa a cidade mais satisfeita');
    bs.applyBuildingEffects(park, false);
    assert.strictEqual(rm.resources.population.buildingSatisfaction, 0);
});

test('prédios verdes e de monitoramento mudam poluição/armazenamento e custam manutenção', () => {
    ['rain_garden', 'green_roof', 'green_wall', 'floating_garden', 'linear_park', 'monitoring_station',
        'water_quality_monitor', 'erosion_control', 'water_research_center'].forEach(id => {
        const b = make(id);
        const { bs, rm } = city([b]);
        const before = JSON.stringify(rm.resources);
        bs.applyBuildingEffects(b, true);
        assert.notStrictEqual(JSON.stringify(rm.resources), before, `${id} não mudou nada`);
        assert.ok(rm.resources.budget.expenses > 0, `${id} sem manutenção`);
        assert.ok(rm.resources.pollution.reduction > 0, `${id} não limpa nada`);
    });
    const rain = make('rain_garden');
    const { bs, rm } = city([rain]);
    const storage = rm.resources.water.storage;
    bs.applyBuildingEffects(rain, true);
    assert.strictEqual(rm.resources.water.storage, storage + BUILDINGS.rain_garden.waterStorage);
});

test('soluções da natureza e sensores funcionam sem rua; bomba precisa', () => {
    const { bs } = city();
    // monitoramento vai na APP e na várzea, onde não há rua (decisão de 11/2026)
    ['rain_garden', 'green_roof', 'green_wall', 'floating_garden', 'linear_park', 'monitoring_station', 'water_quality_monitor']
        .forEach(id => assert.strictEqual(bs.buildingNeedsRoad(BUILDINGS[id]), false, id));
    assert.strictEqual(bs.buildingNeedsRoad(BUILDINGS.water_pump), true);
});

test('save antigo (sem buildingIncome/buildingSatisfaction) recompõe pelos prédios prontos', () => {
    const shop = make('shopping_center', { effectsApplied: true });
    const school = make('school', { effectsApplied: true });
    const site = make('hotel', { underConstruction: true, effectsApplied: false });
    const { bs, rm } = city([shop, school, site]);
    const old = rm.getSaveData();
    delete old.resources.budget.buildingIncome;
    delete old.resources.population.buildingSatisfaction;
    rm.loadData(JSON.parse(JSON.stringify(old)));
    bs.rebuildLegacyResourceTotals(old);
    assert.strictEqual(rm.resources.budget.buildingIncome, BUILDINGS.shopping_center.incomeGeneration);
    assert.strictEqual(rm.resources.population.buildingSatisfaction, BUILDINGS.school.satisfactionBonus);

    // save novo: os valores salvos valem, nada é recalculado
    rm.resources.budget.buildingIncome = 123;
    const fresh = rm.getSaveData();
    rm.loadData(JSON.parse(JSON.stringify(fresh)));
    bs.rebuildLegacyResourceTotals(fresh);
    assert.strictEqual(rm.resources.budget.buildingIncome, 123);
});

test('jogo novo tem capacidade de água definida desde o primeiro instante', () => {
    const rm = new ResourceManager({ gameTime: 0 });
    rm.reset();
    const water = rm.resources.water;
    assert.strictEqual(water.storage, water.max);
    assert.ok(Number.isFinite(water.storage) && water.storage > 0, String(water.storage));
    rm.addWaterStorage(500);
    assert.strictEqual(water.storage, water.max + 500);
});

test('imposto dos moradores: chegada contínua (× atração) e casas que esvaziam aos poucos (4ª auditoria)', () => {
    const run = (finance, pop, max) => {
        const { rm } = city([]);
        rm.gameManager.cityFinance = finance;
        rm.getSatisfactionFactors = () => [{ value: 90 }];
        rm.calculatePopulationAttraction = () => 1.5;
        rm.updatePopulationCapacity = () => { rm.resources.population.max = max; };
        rm.resources.population.current = pop;
        rm.updatePopulation();
        return rm.resources.population.current;
    };
    const normal = run({ attraction: () => 1, occupancy: () => 1 }, 30, 1000) - 30;
    const high = run({ attraction: () => 0.7, occupancy: () => 1 }, 30, 1000) - 30;
    assert.ok(normal > 0);
    assert.ok(Math.abs(high / normal - 0.7) < 1e-9, 'Muito alto: chegam exatamente 30% menos (era só um portão)');
    // cidade cheia e casas ocupadas em 72%: gente sai aos poucos, nunca abaixo do alvo
    const full = run({ attraction: () => 0.7, occupancy: () => 0.72 }, 1000, 1000);
    assert.ok(full < 1000 && full >= 720, `saiu gente: ${full}`);
    assert.strictEqual(run({ attraction: () => 0.7, occupancy: () => 0.72 }, 721, 1000), 720);
});

test('"Nível de Água Baixo" só com a água caindo: reservatório novo não dispara alerta (4ª auditoria)', () => {
    const { rm } = city([]);
    const alerts = [];
    rm.gameManager.uiManager = { showCentralAlert: (title, msg) => alerts.push(msg) };
    const w = rm.resources.water;
    Object.assign(w, { current: 580, max: 1000 });
    rm.checkWaterThresholds();               // 58%: nada
    w.max = 1500;                            // reservatório pronto: 39% sem perder água
    rm.checkWaterThresholds();
    assert.strictEqual(alerts.length, 0, 'fazer a coisa certa não é avisado como perigo');
    w.current = 570; rm.checkWaterThresholds(); // caindo, mas a faixa de 50% já foi marcada em silêncio
    assert.strictEqual(alerts.length, 0);
    w.current = 360; rm.checkWaterThresholds(); // 24% caindo: avisa
    assert.strictEqual(alerts.length, 1);
    assert.match(alerts[0], /25%/);
});

test('requisito de moradores (populationRequirement no prédio ou em requirements.population)', () => {
    const { bs } = city();
    assert.strictEqual(bs.getPopulationRequirement(BUILDINGS.university), 500);
    assert.strictEqual(bs.getPopulationRequirement(BUILDINGS.factory), 300);
    assert.strictEqual(bs.getPopulationRequirement(BUILDINGS.water_research_center), 1000);
    assert.strictEqual(bs.getPopulationRequirement(BUILDINGS.water_pump), 0);
});
