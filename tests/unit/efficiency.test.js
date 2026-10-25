// Eficiência dos prédios (js/systems/building/BuildingEfficiency.js): acesso por rua, consumo de energia das
// zonas pela fase e a conta de eficiência (dano × rua × energia + pesquisa), sem Babylon.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/data/zoneLots.js',
    'js/systems/BuildingSystem.js', 'js/systems/building/ZoneGrowth.js', 'js/systems/building/BuildingEfficiency.js',
    'js/core/ResourceManager.js');
const BuildingSystem = g('BuildingSystem');
const ResourceManager = g('ResourceManager');
const BUILDINGS = g('BUILDING_TYPES');
const GROWTH = g('ZONE_GROWTH');
const RULES = g('EFFICIENCY_RULES');
const win = g('window');

let nextId = 1;
const make = (type, gridX, gridZ, extra = {}) => ({
    id: `building_${nextId++}`, type, gridX, gridZ, config: { ...BUILDINGS[type], id: type },
    underConstruction: false, active: true, efficiency: 1, ...extra
});

function system(buildings = []) {
    const bs = Object.create(BuildingSystem.prototype);
    const rm = new ResourceManager(null);
    Object.assign(bs, { buildings: new Map(), gameManager: { gameTime: 0, resourceManager: rm }, refreshZoneLot() {} });
    buildings.forEach(b => bs.buildings.set(b.id, b));
    win.gameManager = bs.gameManager;
    return { bs, rm };
}

test('rua: só os 4 vizinhos do perímetro contam (diagonal não), qualquer tamanho', () => {
    const { bs } = system();
    const roads = new Set(['5,4']);
    const isRoad = (x, z) => roads.has(`${x},${z}`);
    assert.strictEqual(bs.areaTouchesRoad(isRoad, 5, 5, 1), true, 'rua ao sul');
    assert.strictEqual(bs.areaTouchesRoad(isRoad, 6, 5, 1), false, 'diagonal não liga');
    assert.strictEqual(bs.areaTouchesRoad(isRoad, 4, 5, 2), true, 'lado de baixo de um 2×2');
    assert.strictEqual(bs.areaTouchesRoad(isRoad, 3, 5, 2), false, 'canto do 2×2 na diagonal');
    roads.clear(); roads.add('8,7');
    assert.strictEqual(bs.areaTouchesRoad(isRoad, 5, 5, 3), true, 'lado leste de um 3×3 (x + size)');
    assert.strictEqual(bs.areaTouchesRoad(isRoad, 5, 5, 2), false, 'longe');
});

test('rua: quem precisa (água, tratamento, receita, zonas) e quem não precisa', () => {
    const { bs } = system();
    ['water_pump', 'water_well', 'treatment_plant', 'zone_residential_light', 'zone_industrial_heavy', 'restaurant']
        .forEach(id => assert.strictEqual(bs.buildingNeedsRoad(BUILDINGS[id]), true, id));
    ['paved_road', 'dirt_road', 'wind_farm', 'solar_farm', 'water_tank', 'city_hall', 'rain_garden', 'sidewalk']
        .forEach(id => assert.strictEqual(bs.buildingNeedsRoad(BUILDINGS[id]), false, id));
});

test('rua: hasRoadLink usa ruas prontas do mapa; ruas em obra não contam', () => {
    const pump = make('water_pump', 10, 10);
    const road = make('paved_road', 10, 11);
    const { bs } = system([pump, road]);
    assert.strictEqual(bs.hasRoadLink(pump), true);
    road.underConstruction = true;
    assert.strictEqual(bs.hasRoadLink(pump), false);
    road.underConstruction = false; road.gridX = 11;
    assert.strictEqual(bs.hasRoadLink(pump), false, 'só na diagonal');
    assert.strictEqual(bs.hasRoadLink(make('wind_farm', 30, 30)), true, 'usina não precisa de rua');
});

test('eficiência: dano × sem rua × energia (só zonas) + pesquisa, sempre do zero', () => {
    const { bs } = system();
    const pump = make('water_pump', 0, 0, { efficiency: 1.4 });
    assert.strictEqual(bs.computeBuildingEfficiency(pump, { hasRoad: true, cityEnergy: 1 }), 1, 'não parte do valor antigo');
    assert.strictEqual(bs.computeBuildingEfficiency(pump, { hasRoad: false, cityEnergy: 1 }), RULES.noRoadFactor);
    assert.strictEqual(bs.computeBuildingEfficiency(pump, { hasRoad: true, cityEnergy: 0 }), 1, 'prédio comum: energia não entra (balanço do início)');
    assert.strictEqual(bs.computeBuildingEfficiency({ ...pump, damageFactor: 0.8 }, { hasRoad: false, cityEnergy: 1 }), 0.6);
    assert.strictEqual(bs.computeBuildingEfficiency(pump, { hasRoad: true, cityEnergy: 1, researchBonus: 0.3 }), 1.3);

    const zone = make('zone_commercial_light', 0, 0, { zoneStage: 1 });
    assert.strictEqual(bs.computeBuildingEfficiency(zone, { hasRoad: true, cityEnergy: 1 }), 1);
    assert.strictEqual(bs.computeBuildingEfficiency(zone, { hasRoad: true, cityEnergy: 0 }), RULES.zoneEnergyFloor, 'zona sem energia rende 30%');
    assert.strictEqual(bs.computeBuildingEfficiency(zone, { hasRoad: true, cityEnergy: 0.5 }), 0.65, '0,3 + 0,7 × 0,5');
    assert.strictEqual(bs.computeBuildingEfficiency(zone, { hasRoad: false, cityEnergy: 0 }), 0.22, '0,75 × 0,3 (0,225 arredonda para baixo em ponto flutuante)');
    // Água e poluição também pesam nas zonas (e só nelas)
    assert.strictEqual(bs.computeBuildingEfficiency(zone, { hasRoad: true, cityEnergy: 1, waterShortage: true }), RULES.zoneNoWaterFactor);
    assert.strictEqual(bs.computeBuildingEfficiency(zone, { hasRoad: true, cityEnergy: 1, highPollution: true }), RULES.zoneHighPollutionFactor);
    assert.strictEqual(bs.computeBuildingEfficiency(pump, { hasRoad: true, cityEnergy: 1, waterShortage: true, highPollution: true }), 1, 'prédio comum não');
});

test('energia: toda zona consome, pela fase (0,25 → 1) e por tipo/peso', () => {
    const { bs } = system();
    const zones = Object.keys(BUILDINGS).filter(id => BUILDINGS[id].zoneType);
    assert.ok(zones.length >= 9);
    for (const id of zones) {
        const full = BUILDINGS[id].powerConsumption;
        assert.ok(full > 0, `${id} consome energia`);
        assert.strictEqual(JSON.stringify([0, 1, 2, 3].map(s => bs.getBuildingPowerConsumption(make(id, 0, 0, { zoneStage: s })))),
            JSON.stringify(GROWTH.effectScale.map(k => Math.round(full * k * 100) / 100)), id);
        assert.strictEqual(bs.getInitialPowerConsumption({ ...BUILDINGS[id], id }), full * GROWTH.effectScale[0]);
    }
    // leve < equilibrada < pesada em cada tipo; indústria gasta mais que comércio, que gasta mais que moradia
    for (const kind of ['residential', 'commercial', 'industrial']) {
        const [l, b, h] = ['light', 'balanced', 'heavy'].map(w => BUILDINGS[`zone_${kind}_${w}`].powerConsumption);
        assert.ok(l < b && b < h, kind);
    }
    const w = 'balanced';
    assert.ok(BUILDINGS[`zone_residential_${w}`].powerConsumption < BUILDINGS[`zone_commercial_${w}`].powerConsumption);
    assert.ok(BUILDINGS[`zone_commercial_${w}`].powerConsumption < BUILDINGS[`zone_industrial_${w}`].powerConsumption);
    // Início: 4 zonas completas + bomba + ETA cabem numa eólica
    const city = ['zone_residential_light', 'zone_residential_balanced', 'zone_commercial_light', 'zone_industrial_light']
        .reduce((sum, id) => sum + BUILDINGS[id].powerConsumption, 0) + BUILDINGS.water_pump.powerConsumption + BUILDINGS.treatment_plant.powerConsumption;
    assert.ok(city <= BUILDINGS.wind_farm.powerGeneration, `${city} MW cabe em uma eólica`);
});

test('energia: zona entra no consumo do ResourceManager e acompanha a fase (tira o que somou)', () => {
    const zone = make('zone_residential_light', 2, 2, { zoneStage: 0 });
    const { bs, rm } = system([zone]);
    const full = BUILDINGS.zone_residential_light.powerConsumption;
    bs.applyBuildingEffects(zone, true);
    assert.strictEqual(rm.resources.electricity.consumption, full * 0.25);
    bs.setZoneStage(zone, 3);
    assert.strictEqual(rm.resources.electricity.consumption, full, 'fase completa = consumo cheio');
    assert.strictEqual(rm.resources.electricity.efficiency, 0, 'sem geração a eficiência elétrica cai');
    bs.applyBuildingEffects(zone, false);
    assert.strictEqual(rm.resources.electricity.consumption, 0);
});

test('updateBuildingEfficiency: rua nova sobe a eficiência e reaplica a receita; save antigo acerta o consumo', () => {
    const zone = make('zone_industrial_light', 5, 5, { zoneStage: 3 });
    const { bs, rm } = system([zone]);
    rm.addElectricityGeneration(1000);
    bs.updatePowerShortageVisuals = () => {};
    bs.findNearbyResearchBuildings = () => [];
    const income0 = rm.resources.budget.income;
    zone.efficiency = bs.getEfficiencyOnCompletion(zone);
    assert.strictEqual(zone.efficiency, RULES.noRoadFactor, 'sem rua: 75%');
    bs.applyBuildingEffects(zone, true);
    const inc = BUILDINGS.zone_industrial_light.incomeGeneration;
    assert.strictEqual(rm.resources.budget.income - income0, inc * RULES.noRoadFactor);

    const road = make('dirt_road', 4, 5);
    bs.buildings.set(road.id, road);
    bs.updateAllBuildingEfficiency();
    assert.strictEqual(zone.noRoad, false);
    assert.strictEqual(zone.efficiency, 1);
    assert.strictEqual(rm.resources.budget.income - income0, inc, 'receita cheia com rua');

    bs.buildings.delete(road.id);
    bs.updateAllBuildingEfficiency();
    assert.strictEqual(zone.noRoad, true);
    assert.match(bs.generateEfficiencyWarnings(zone), /Sem rua ligando: funciona a 75%\. Construa uma rua encostada\./);

    // Save de antes: zona pronta sem consumo nos totais → a passada seguinte soma o consumo da fase
    const old = make('zone_commercial_light', 20, 20, { zoneStage: 3, effectsApplied: true, appliedPowerConsumption: 0, efficiency: 0.75 });
    bs.buildings.set(old.id, old);
    const before = rm.resources.electricity.consumption;
    bs.updateAllBuildingEfficiency();
    assert.strictEqual(rm.resources.electricity.consumption - before, BUILDINGS.zone_commercial_light.powerConsumption);
});

test('save: consumo aplicado e dano voltam; save antigo deduz o consumo que estava nos totais', () => {
    const b = make('zone_commercial_light', 1, 1, { zoneStage: 2, effectsApplied: true, appliedPowerConsumption: 9, damageFactor: 0.8 });
    const saved = JSON.parse(JSON.stringify(BuildingSystem.serializeBuilding(b)));
    assert.strictEqual(saved.appliedPowerConsumption, 9);
    assert.strictEqual(saved.damageFactor, 0.8);
    const plain = BuildingSystem.serializeBuilding(make('water_tank', 0, 0));
    assert.ok(!('appliedPowerConsumption' in plain) && !('damageFactor' in plain), 'sem campos à toa');
});
