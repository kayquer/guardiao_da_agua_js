// Serviços públicos (11/2026, js/systems/CityServices.js + js/data/cityServices.js): os campos de bônus dos prédios
// (educationBonus, healthBonus, safetyBonus, securityBonus, attractivenessBonus, growthRate, populationRequirement,
// administrativeBonus) agora fazem algo — no mesmo padrão de CityStaff.bonus (soma com teto).
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/data/buildings.js', 'js/data/cityHall.js', 'js/data/cityServices.js', 'js/systems/CityFinance.js', 'js/systems/CityServices.js');
const CityServices = g('CityServices');
const CityFinance = g('CityFinance');
const SERVICES = g('CITY_SERVICES');
const B = g('BUILDING_TYPES');

const built = (id, extra = {}) => ({ type: id, config: B[id], effectsApplied: true, active: true, efficiency: 1, ...extra });
const services = list => new CityServices({ buildingSystem: { getAllBuildings: () => list, getEffectivePopulationCapacity: b => b.config.populationCapacity || 0 } });

test('todo campo de serviço existe em algum prédio e todo prédio com o campo tem efeito', () => {
    for (const [key, def] of Object.entries(SERVICES)) {
        const owners = Object.entries(B).filter(([, b]) => b[def.field]);
        assert.ok(owners.length > 0, `${key}: nenhum prédio com ${def.field}`);
        for (const [id, b] of owners) assert.ok(CityServices.single(key, b) > 0, `${id}: ${def.field} sem efeito`);
        assert.ok(def.text(0.1).length > 5);
    }
});

test('soma com teto (escola, hospital, bombeiros, polícia) e prédio em obra/sem efeito não conta', () => {
    assert.strictEqual(services([built('school')]).bonus('education'), SERVICES.education.per);
    const many = services([1, 2, 3, 4, 5, 6].map(() => built('school')));
    assert.strictEqual(many.bonus('education'), SERVICES.education.cap);
    assert.strictEqual(services([built('school', { underConstruction: true })]).bonus('education'), 0);
    assert.strictEqual(services([built('hospital', { efficiency: 0.5 })]).bonus('health'), SERVICES.health.per * 0.5);
    assert.ok(services([built('fire_station')]).bonus('safety') > 0);
    assert.ok(services([built('police_station')]).bonus('security') > 0);
    assert.strictEqual(services([]).bonus('nada'), 0);
});

test('atrações com retorno decrescente; ritmo das zonas pela capacidade (leve 1×, pesada 2×)', () => {
    const one = services([built('park')]).bonus('attraction');
    const four = services([built('park'), built('park'), built('museum'), built('monument')]).bonus('attraction');
    assert.ok(one > 0 && four > one && four < SERVICES.attraction.max);
    assert.ok(four - one < one * 3, 'o 4º soma menos que o 1º');
    assert.strictEqual(services([]).residentialPace(), 1);
    assert.strictEqual(services([built('zone_residential_light')]).residentialPace(), 1);
    assert.ok(Math.abs(services([built('zone_residential_heavy')]).residentialPace() - 2) < 1e-9);
});

test('fábricas avulsas pagam o imposto da indústria; requisito de moradores lido dos dois formatos', () => {
    for (const id of ['factory', 'tech_center', 'port', 'sugarcane_mill']) assert.strictEqual(CityFinance.groupOf(B[id]), 'industry', id);
    assert.strictEqual(CityFinance.groupOf(B.restaurant), 'commerce');
    assert.ok(!/turista/i.test(B.restaurant.description), 'restaurante paga comércio: texto sem turistas');
    assert.ok(B.water_research_center.powerConsumption > 0);
    assert.strictEqual(B.monitoring_station.needsRoad, false);
    assert.strictEqual(B.water_quality_monitor.needsRoad, false);
    assert.strictEqual(B.city_hall.administrativeBonus, true);
});
