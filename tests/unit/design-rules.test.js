// Regras da 2ª rodada da auditoria de design: imposto por campo, prédios ligados à água, energia pelo clima,
// drenagem do bairro pesado, prêmios de missão variados e relatório de escolhas repetidas.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/data/zoneLots.js', 'js/data/missions.js', 'js/data/resourceStates.js',
    'js/systems/BuildingSystem.js', 'js/systems/building/ZoneGrowth.js', 'js/systems/building/BuildingEfficiency.js',
    'js/systems/building/TreeGrowth.js', 'js/core/ResourceManager.js', 'js/systems/ResourceTrends.js', 'js/systems/QuestSystem.js',
    'js/systems/ResearchLog.js');
const BuildingSystem = g('BuildingSystem');
const ResourceManager = g('ResourceManager');
const QuestSystem = g('QuestSystem');
const ResearchLog = g('ResearchLog');
const BUILDINGS = g('BUILDING_TYPES');
const RULES = g('EFFICIENCY_RULES');
Object.assign(QuestSystem.prototype, { updateQuestUI() {}, playMissionCompletionAudio() {} });

let next = 1;
const make = (type, extra = {}) => ({ id: `b${next++}`, type, gridX: 0, gridZ: 0, config: { ...BUILDINGS[type], id: type }, underConstruction: false, active: true, efficiency: 1, ...extra });

function city(list = []) {
    const bs = Object.create(BuildingSystem.prototype);
    const gm = { gameTime: 0 };
    gm.resourceManager = new ResourceManager(gm);
    Object.assign(bs, { buildings: new Map(), gameManager: gm });
    gm.buildingSystem = bs;
    g('window').gameManager = gm; // applyBuildingEffects lê window.gameManager
    list.forEach(b => bs.buildings.set(b.id, b));
    return { bs, gm, rm: gm.resourceManager };
}

test('imposto de comércio e de turismo vem do campo taxGroup (parque linear e ecoparque não pagam turismo)', () => {
    const { rm } = city([make('hotel'), make('shopping_center'), make('linear_park'), make('ecopark'), make('hotel', { underConstruction: true })]);
    rm.calculateTaxRevenue();
    const mult = rm.taxRates.developmentMultiplier;
    assert.strictEqual(rm.taxRevenue.tourism, rm.taxRates.perTourism * mult, 'só o hotel pronto');
    assert.strictEqual(rm.taxRevenue.business, rm.taxRates.perCommercial * mult, 'só o shopping');
    for (const [id, b] of Object.entries(BUILDINGS)) if (b.taxGroup) assert.ok(['commerce', 'tourism'].includes(b.taxGroup), id);
});

test('energia pelo clima: vento, sol (dia/noite/nuvem) e rio na seca', () => {
    const { bs } = city();
    assert.strictEqual(bs.getWeatherPowerFactor('wind', { wind: 5 }), 0.5, 'calmaria');
    assert.strictEqual(bs.getWeatherPowerFactor('wind', { wind: 30 }), 1.1);
    assert.strictEqual(bs.getWeatherPowerFactor('wind', { wind: 90 }), 0.6, 'ventania desliga por segurança');
    assert.strictEqual(bs.getWeatherPowerFactor('solar', { kind: 'sun', isDay: true }), 1.2);
    assert.strictEqual(bs.getWeatherPowerFactor('solar', { kind: 'storm', isDay: true }), 0.4);
    assert.strictEqual(bs.getWeatherPowerFactor('solar', { kind: 'sun', isDay: false }), RULES.solarNight);
    assert.strictEqual(bs.getWeatherPowerFactor('hydro', { waterFactor: 0.5 }), 0.5, 'seca');
    assert.strictEqual(bs.getWeatherPowerFactor('wind', null), 1, 'sem clima: como sempre');
    // a eficiência da usina leva o clima, e a geração somada é a geração × eficiência
    const wind = make('wind_farm');
    assert.strictEqual(bs.computeBuildingEfficiency(wind, { hasRoad: true, weather: { wind: 5 } }), 0.5);
});

test('geração de energia soma × eficiência e tira exatamente o que somou', () => {
    const solar = make('solar_farm', { efficiency: 0.5 });
    const { bs, rm } = city([solar]);
    const before = rm.resources.electricity.generation;
    bs.applyBuildingEffects(solar, true);
    assert.strictEqual(rm.resources.electricity.generation - before, BUILDINGS.solar_farm.powerGeneration * 0.5);
    solar.efficiency = 1; // mudou depois (o recálculo sempre tira e põe de novo, mas o que sai é o que entrou)
    bs.applyBuildingEffects(solar, false);
    assert.strictEqual(rm.resources.electricity.generation, before);
});

test('hotel sem água, porto com rio sujo e reúso de chuva', () => {
    const { bs } = city();
    assert.strictEqual(bs.computeBuildingEfficiency(make('hotel'), { hasRoad: true, waterShortage: true }), RULES.needsWaterFactor);
    assert.strictEqual(bs.computeBuildingEfficiency(make('port'), { hasRoad: true, pollution: 60 }), RULES.cleanWaterFactor);
    assert.strictEqual(bs.computeBuildingEfficiency(make('port'), { hasRoad: true, pollution: 20 }), 1);
    assert.strictEqual(ResourceManager.buildingWaterUse(make('shopping_center')), BUILDINGS.shopping_center.waterConsumption / 2);
});

test('bairro pesado sem drenagem por perto alaga com chuva; um jardim de chuva perto resolve', () => {
    const heavy = make('zone_residential_heavy', { gridX: 10, gridZ: 10 });
    const { bs } = city([heavy]);
    assert.strictEqual(bs.isZoneUndrained(heavy), true);
    assert.strictEqual(bs.isZoneUndrained(make('zone_residential_light')), false, 'leve não precisa');
    const eff = bs.computeBuildingEfficiency(heavy, { hasRoad: true, cityEnergy: 1, undrained: true, raining: true });
    assert.strictEqual(eff, RULES.undrainedRainFactor);
    assert.strictEqual(bs.computeBuildingEfficiency(heavy, { hasRoad: true, cityEnergy: 1, undrained: true, raining: false }), 1, 'sem chuva, normal');
    const far = make('rain_garden', { gridX: 30, gridZ: 30 });
    bs.buildings.set(far.id, far);
    assert.strictEqual(bs.isZoneUndrained(heavy), true, 'longe não conta');
    const near = make('rain_garden', { gridX: 14, gridZ: 10 });
    bs.buildings.set(near.id, near);
    assert.strictEqual(bs.isZoneUndrained(heavy), false);
});

test('prêmios de missão: desconto e obra grátis gastos ao pagar, aviso antecipado, emergência, e vão no save', () => {
    const gm = { gameTime: 0, buildingSystem: { getBuildingsByType: () => [] }, gameOverSystem: {} };
    gm.resourceManager = new ResourceManager(gm);
    const qs = new QuestSystem(gm);
    qs.applyRewardPerks({ discount: { water_tower: 50 }, freeBuilds: { tree_sapling: 2 }, earlyWarningMs: 60000, emergency: 1 });
    assert.strictEqual(qs.getPerkCost('water_tower', 12000), 6000);
    assert.strictEqual(qs.getPerkCost('tree_sapling', 300), 0);
    assert.strictEqual(qs.getPerkCost('school', 15000), 15000);
    qs.consumeBuildPerk('tree_sapling');
    qs.consumeBuildPerk('water_tower');
    assert.strictEqual(qs.getPerkCost('tree_sapling', 300), 0, 'ainda tem uma');
    assert.strictEqual(qs.getPerkCost('water_tower', 12000), 12000, 'desconto usado');
    assert.strictEqual(qs.isEarlyWarningActive(), true);
    gm.gameTime = 61000;
    assert.strictEqual(qs.isEarlyWarningActive(), false);
    assert.strictEqual(gm.gameOverSystem.extraEmergencies, 1);
    const other = new QuestSystem({ ...gm, gameOverSystem: {} });
    other.loadData(JSON.parse(JSON.stringify(qs.getSaveData())));
    assert.strictEqual(other.getPerkCost('tree_sapling', 300), 0);
    assert.ok(qs.describeRewardPerks({ discount: { water_tower: 50 }, emergency: 1 }).length === 2);
});

test('relatório de escolhas repetidas marca o que 80% ou mais fazem igual', () => {
    const build = (...types) => types.map(target => ({ type: 'build', target }));
    const decision = tier => ({ type: 'event_decision', tier });
    const all = {
        a: { events: [...build('water_pump', 'wind_farm', 'zone_residential_light'), decision('max')] },
        b: { events: [...build('water_pump', 'wind_farm', 'zone_residential_light'), decision('max')] },
        c: { events: [...build('water_pump', 'wind_farm', 'zone_residential_light'), decision('low')] },
        d: { events: [...build('water_pump', 'solar_farm', 'zone_residential_light')] }
    };
    const r = ResearchLog.strategyReport(all);
    assert.strictEqual(r.profiles, 4);
    assert.strictEqual(r.opening.key, 'water_pump → wind_farm → zone_residential_light');
    assert.strictEqual(r.opening.share, 0.75);
    assert.strictEqual(r.energy.key, 'wind_farm');
    assert.ok(!r.flags.includes('opening'), '75% não chega a 80%');
    assert.ok(!r.flags.includes('energy'));
});
