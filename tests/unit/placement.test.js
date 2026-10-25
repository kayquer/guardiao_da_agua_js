// Prédios novos de 10/2026: corpo d'água da usina maremotriz, enxurrada por tipo de rua, rendimento real de água,
// categorias por zoneType e os 5 prédios avançados com estudo, modelo e tecnologia.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/core/GridManager.js', 'js/data/buildings.js', 'js/data/buildingModels.js');
const GridManager = g('GridManager');
const BUILDINGS = g('BUILDING_TYPES');
const MODELS = g('BUILDING_MODELS');

test('corpo d\'água: cada célula sabe o tamanho do lago/rio ligado a ela', () => {
    const W = 'water', L = 'grassland';
    const grid = [
        [W, W, L, L, L],
        [W, W, L, W, L],
        [L, L, L, W, L],
        [L, L, L, W, W],
        [L, L, L, L, W]
    ];
    const sizes = GridManager.measureWaterBodies(grid, 5);
    assert.strictEqual(sizes[0][0], 4, 'lago de 4');
    assert.strictEqual(sizes[1][3], 5, 'rio de 5 (ligado só por lados, não pela diagonal)');
    assert.strictEqual(sizes[4][4], 5);
    assert.strictEqual(sizes[2][2], 0, 'terra');
});

test('usina maremotriz: só em água, num corpo d\'água de 8 blocos ou mais, e é avançada', () => {
    const tidal = BUILDINGS.tidal_plant;
    assert.ok(tidal.requirements.terrain.includes('water'));
    assert.strictEqual(tidal.requirements.minWaterBody, 8);
    assert.ok(tidal.tier >= 4);
    assert.ok(tidal.powerGeneration > 0);
});

test('enxurrada: asfalto > cascalho > terra (runoffImpervious) e a estrada de cascalho sobe colina', () => {
    const imp = id => BUILDINGS[id].runoffImpervious;
    assert.ok(imp('paved_road') > imp('gravel_road') && imp('gravel_road') > imp('dirt_road'));
    assert.ok(BUILDINGS.gravel_road.requirements.terrain.includes('hill'));
    assert.strictEqual(BUILDINGS.gravel_road.roadType, 'gravel');
    const study = fs.readFileSync(path.join(ROOT, 'js/systems/StudySystem.js'), 'utf8');
    assert.ok(study.includes("'gravel_road'"), 'rua nunca pede estudo');
});

test('categorias: zonas pelo zoneType em residencial/comercial/industrial; sem "zoning" nem "tourism"', () => {
    const cats = new Set(Object.values(BUILDINGS).map(b => b.category));
    assert.ok(!cats.has('zoning') && !cats.has('tourism'));
    for (const [id, b] of Object.entries(BUILDINGS)) {
        if (!b.zoneType) continue;
        const want = id.includes('residential') ? 'residential' : id.includes('commercial') ? 'commercial' : 'industrial';
        assert.strictEqual(b.category, want, id);
    }
    for (const id of ['monument', 'museum', 'hotel', 'park']) assert.strictEqual(BUILDINGS[id].category, 'commercial', id);
    assert.ok(g('FEATURE_FLAGS').isCategoryVisible('residential'));
    assert.ok(!g('FEATURE_FLAGS').isBuildingVisible('house'), 'casa avulsa fica escondida (Residencial = zonas)');
});

test('os 5 prédios avançados têm modelo próprio, estudo com imagem e quiz, e tecnologia de nível 4–5', () => {
    const studies = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/building-studies.json'), 'utf8'));
    for (const id of ['tidal_plant', 'loss_control_center', 'underground_dam', 'water_reuse_plant', 'desalination_plant']) {
        const b = BUILDINGS[id];
        assert.ok(b, id);
        assert.ok(b.tier >= 4, `${id} nível`);
        assert.ok(MODELS[id]?.file.startsWith('blender/'), `${id} modelo próprio`);
        const s = studies[id];
        assert.ok(s && s.quiz.questions.length === 2 && s.quiz.passingScore === 50, `${id} estudo`);
        assert.ok(fs.existsSync(path.join(ROOT, s.pages[0].image)), `${id} imagem do estudo`);
        assert.ok(!/\d/.test(s.pages.map(p => p.content).join('')), `${id}: texto sem números`);
    }
});

test('reciclar prédio: de 20% a 80% do custo, cada tipo de prédio de conhecimento conta uma vez', () => {
    const h = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/systems/BuildingSystem.js', 'js/systems/building/BuildingRecycle.js');
    const BS = h('BuildingSystem');
    const B = h('BUILDING_TYPES');
    const fake = { buildings: new Map(), gameManager: { tutorialSystem: { isActive: false } } };
    Object.setPrototypeOf(fake, BS.prototype);
    const add = (id, type, extra = {}) => fake.buildings.set(id, { id, type, config: { ...B[type], id: type }, active: true, underConstruction: false, ...extra });
    add('p', 'water_pump');
    assert.strictEqual(fake.getRecycleRate().percent, 0.2, 'sem escola: 20%');
    assert.strictEqual(fake.getRecycleValue(fake.buildings.get('p')), Math.round(B.water_pump.cost * 0.2));
    add('s1', 'school');
    add('s2', 'school'); // a segunda escola não soma de novo
    add('t', 'technical_school', { underConstruction: true }); // em obra não conta
    assert.ok(Math.abs(fake.getRecycleRate().percent - 0.25) < 1e-9);
    fake.buildings.get('t').underConstruction = false;
    ['research_center', 'university', 'water_research_center', 'tech_center', 'recycling_coop', 'ecopark'].forEach((t, i) => add(`k${i}`, t));
    assert.strictEqual(fake.getRecycleRate().percent, 0.8, 'no máximo 80%');
    // Prefeitura, rua e tutorial não reciclam
    add('c', 'city_hall');
    add('r', 'paved_road');
    assert.strictEqual(fake.canRecycleBuilding(fake.buildings.get('c')), false);
    assert.strictEqual(fake.canRecycleBuilding(fake.buildings.get('r')), false);
    assert.strictEqual(fake.canRecycleBuilding(fake.buildings.get('p')), true);
    fake.gameManager.tutorialSystem.isActive = true;
    assert.strictEqual(fake.canRecycleBuilding(fake.buildings.get('p')), false);
});
