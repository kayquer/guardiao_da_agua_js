// Água de superfície (10/2026): ETA perto de rio/lago com bomba e canos automáticos (building/WaterIntake.js),
// nível dos rios (ResourceManager.updateRiver), esgoto tratado que devolve água ao rio, aquífero 20% maior e
// árvores recarregando o aquífero.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/data/zoneLots.js', 'js/data/missions.js',
    'js/systems/BuildingSystem.js', 'js/systems/building/ZoneGrowth.js', 'js/systems/building/BuildingEfficiency.js',
    'js/systems/building/TreeGrowth.js', 'js/systems/building/WaterIntake.js', 'js/core/ResourceManager.js',
    'js/systems/EventSystem.js', 'js/systems/QuestSystem.js');
const BuildingSystem = g('BuildingSystem');
const ResourceManager = g('ResourceManager');
const QuestSystem = g('QuestSystem');
const BUILDINGS = g('BUILDING_TYPES');
const TREES = g('TREES');
const win = g('window');
Object.assign(QuestSystem.prototype, { updateQuestUI() {}, playMissionCompletionAudio() {} });

let nextId = 1;
const make = (type, extra = {}) => ({
    id: `r${nextId++}`, type, gridX: 0, gridZ: 0, config: { ...BUILDINGS[type], id: type },
    underConstruction: false, active: true, efficiency: 1, ...extra
});

/** Mapa 20×20 de campo com um rio nas colunas x = 0 e 1 (ou `water(x, z)` próprio). */
function grid(water = x => x <= 1) {
    return { gridSize: 20, cellSize: 2, getTerrainType: (x, z) => (x < 0 || z < 0 || x >= 20 || z >= 20) ? 'grassland' : water(x, z) ? 'water' : 'grassland' };
}

function city(buildings = [], gridManager = grid()) {
    const notes = [];
    const gm = { gameTime: 0, timeScale: 1, gameState: 'playing', uiManager: { showNotification: m => notes.push(m), showCentralAlert: t => notes.push(t) } };
    const bs = Object.create(BuildingSystem.prototype);
    Object.assign(bs, { buildings: new Map(), gameManager: gm, gridManager, refreshZoneLot() {} });
    gm.buildingSystem = bs;
    gm.gridManager = gridManager;
    gm.resourceManager = new ResourceManager(gm);
    buildings.forEach(b => bs.buildings.set(b.id, b));
    win.gameManager = gm;
    return { gm, bs, rm: gm.resourceManager, res: gm.resourceManager.resources, notes };
}

// ===== Dados =====
test('ETA: capta água de superfície, dá o dobro do poço, custa 5.000, polui, gasta energia e precisa de água a até 10 blocos', () => {
    const eta = BUILDINGS.water_treatment_plant;
    assert.strictEqual(eta.surfaceWater, true);
    assert.ok(!eta.groundwater, 'não tira do aquífero');
    assert.strictEqual(eta.waterProduction, BUILDINGS.water_well.waterProduction * 2);
    assert.strictEqual(eta.cost, 5000);
    assert.ok(eta.pollutionGeneration > 0 && eta.powerConsumption > 0);
    assert.strictEqual(eta.requirements.maxWaterDistance, 10);
    assert.strictEqual(eta.category, 'water');
    // ETE: trata o esgoto e devolve água limpa ao rio
    assert.match(BUILDINGS.treatment_plant.name, /Esgoto/);
    assert.ok(BUILDINGS.treatment_plant.riverRecharge > 0);
    assert.ok(BUILDINGS.treatment_plant.pollutionReduction > 0);
});

test('ETA e ETE têm estudo, modelo próprio, ícone animado e as imagens do estudo existem', () => {
    const studies = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/building-studies.json'), 'utf8'));
    for (const id of ['water_treatment_plant', 'treatment_plant']) {
        const s = studies[id];
        assert.ok(s, `${id} sem estudo`);
        assert.ok(s.quiz.questions.length <= 2 && s.quiz.passingScore === 50, `${id}: quiz curto, 50%`);
        for (const p of s.pages) {
            assert.ok(!/\d/.test(p.content), `${id} p.${p.pageNumber}: texto sem números`);
            if (p.image) assert.ok(fs.existsSync(path.join(ROOT, p.image)), `${id}: falta ${p.image}`);
        }
        const icon = fs.readFileSync(path.join(ROOT, 'assets/icons/svg', `${id.replace(/_/g, '-')}.svg`), 'utf8');
        assert.ok(/@keyframes/.test(icon), `${id}: ícone animado`);
    }
    assert.match(studies.treatment_plant.studyTitle, /Esgoto/);
    assert.match(studies.water_treatment_plant.studyTitle, /Água/);
});

// ===== Posição e traçado da captação =====
test('distância até a água: diagonal conta 1, sem água perto = Infinity', () => {
    const { bs } = city();
    assert.strictEqual(bs.getWaterDistance(2, 5, 2, 10), 1, 'encostada no rio');
    assert.strictEqual(bs.getWaterDistance(6, 5, 2, 10), 5);
    assert.strictEqual(bs.getWaterDistance(13, 5, 2, 10), Infinity, 'a 12 blocos: longe demais');
    const { bs: dry } = city([], grid(() => false));
    assert.strictEqual(dry.getWaterDistance(5, 5, 2, 10), Infinity);
});

test('ETA encostada na água capta direto: sem bomba e sem canos', () => {
    const { bs } = city();
    const plan = bs.planWaterIntake(2, 5, 2, 10);
    assert.strictEqual(plan.adjacent, true);
    assert.strictEqual(plan.pump, null);
    assert.strictEqual(plan.path.length, 0);
    assert.match(bs.describeWaterIntake(plan), /sem canos/);
});

test('ETA longe da água: bomba na célula de água da margem e canos ligando a margem à ETA', () => {
    const { bs } = city();
    const plan = bs.planWaterIntake(6, 5, 2, 10);
    assert.strictEqual(plan.adjacent, false);
    const [px, pz] = plan.pump;
    assert.ok(px <= 1, 'bomba sobre o rio');
    assert.strictEqual(plan.path.length, 4, 'células 5, 4, 3 e 2 até a margem');
    const [lx, lz] = plan.path[plan.path.length - 1];
    assert.strictEqual(Math.abs(lx - px) + Math.abs(lz - pz), 1, 'o último cano encosta na bomba');
    const [fx, fz] = plan.path[0];
    assert.ok(fx === 5 && fz >= 5 && fz <= 6, 'o primeiro cano encosta na ETA');
    for (let i = 1; i < plan.path.length; i++) {
        const [ax, az] = plan.path[i - 1];
        const [bx, bz] = plan.path[i];
        assert.strictEqual(Math.abs(ax - bx) + Math.abs(az - bz), 1, 'canos em sequência, sem pulo');
    }
    assert.match(bs.describeWaterIntake(plan), /bomba e 4 canos/);
});

test('o cano desvia de prédios, passa por baixo de ruas e, sem saída, passa por baixo de tudo', () => {
    // parede de prédios na coluna 4 (z 0-19, menos z 15): o cano contorna por z = 15
    const wall = Array.from({ length: 20 }, (_, z) => z).filter(z => z !== 15)
        .map(z => make('water_tank', { gridX: 4, gridZ: z }));
    const { bs } = city(wall);
    const plan = bs.planWaterIntake(6, 5, 2, 10);
    assert.ok(plan.pump, 'achou caminho');
    assert.ok(plan.path.every(([x, z]) => !(x === 4 && z !== 15)), 'não atravessa prédios');
    // rua no meio do caminho: passa por baixo (o caminho reto continua valendo)
    const road = make('paved_road', { gridX: 4, gridZ: 5 });
    const { bs: withRoad } = city([road]);
    assert.strictEqual(withRoad.planWaterIntake(6, 5, 2, 10).path.length, 4);
    // parede completa: passa por baixo dos prédios (a ETA continua funcionando)
    const full = Array.from({ length: 20 }, (_, z) => make('water_tank', { gridX: 4, gridZ: z }));
    const { bs: walled } = city(full);
    assert.ok(walled.planWaterIntake(6, 5, 2, 10).pump);
});

test('captação vai no save e volta igual; save sem o campo replaneja', () => {
    const { bs } = city();
    const eta = make('water_treatment_plant', { gridX: 6, gridZ: 5 });
    eta.intake = bs.resolveWaterIntake(eta);
    const saved = JSON.parse(JSON.stringify(BuildingSystem.serializeBuilding(eta)));
    assert.strictEqual(JSON.stringify(saved.intake), JSON.stringify({ pump: eta.intake.pump, path: eta.intake.path }));
    assert.strictEqual(JSON.stringify(bs.resolveWaterIntake(eta, saved.intake)), JSON.stringify(saved.intake));
    assert.strictEqual(JSON.stringify(bs.resolveWaterIntake(eta, { pump: 'x' })), JSON.stringify(saved.intake), 'campo quebrado = replaneja');
    assert.ok(!('intake' in BuildingSystem.serializeBuilding(make('water_pump'))), 'outros prédios não ganham o campo');
});

// ===== Nível dos rios =====
test('ETA tira do rio (não do aquífero); ETE devolve; rio baixo = ETA capta menos', () => {
    const eta = make('water_treatment_plant');
    const ete = make('treatment_plant');
    const { bs, rm, res } = city([eta, ete]);
    bs.applyBuildingEffects(eta, true);
    assert.strictEqual(res.water.surfaceProduction, BUILDINGS.water_treatment_plant.waterProduction);
    assert.ok(!res.water.groundwaterProduction, 'aquífero intocado');
    const before = rm.getRiverBalance();
    assert.ok(before.drain > 0);
    bs.applyBuildingEffects(ete, true);
    assert.strictEqual(res.water.riverRecharge, BUILDINGS.treatment_plant.riverRecharge);
    assert.ok(rm.getRiverBalance().net > before.net, 'esgoto tratado sobe o balanço do rio');

    const full = rm.getEffectiveWaterProduction();
    res.water.river = 15;
    assert.ok(Math.abs(rm.getRiverFactor() - 0.5) < 1e-9);
    assert.ok(rm.getEffectiveWaterProduction() < full * 0.6, 'rio baixo: a ETA rende menos');
    assert.ok(bs.getBuildingWaterYield(eta).reasons.some(r => r.includes('rio baixo')));
    bs.applyBuildingEffects(eta, false);
    bs.applyBuildingEffects(ete, false);
    assert.strictEqual(res.water.surfaceProduction, 0);
    assert.strictEqual(res.water.riverRecharge, 0);
});

test('rio desce com a captação, avisa em 50% e 30%; a seca diminui o que as nascentes trazem', () => {
    const { rm, res, notes } = city();
    res.water.surfaceProduction = 600;
    res.water.river = 51;
    for (let i = 0; i < 600 && res.water.river > 29; i++) rm.updateRiver();
    assert.ok(res.water.river <= 30);
    assert.ok(notes.some(n => String(n).includes('metade')));
    assert.ok(notes.includes('Rio Baixo'));
    const normal = rm.getRiverBalance().natural;
    res.water.productionMultiplier = 0.5;
    assert.strictEqual(rm.getRiverBalance().natural, normal * 0.5);
});

test('hidrelétrica sente o rio baixo (waterFactor = seca × rio)', () => {
    const { bs, res } = city();
    assert.strictEqual(bs.getWeatherContext().waterFactor, 1);
    res.water.river = 15;
    assert.ok(Math.abs(bs.getWeatherContext().waterFactor - 0.5) < 1e-9);
});

test('save antigo: ETE e filtros prontos recompõem a água devolvida ao rio', () => {
    const ete = make('treatment_plant', { effectsApplied: true });
    const filters = make('filter_station', { effectsApplied: true });
    const { bs, rm } = city([ete, filters]);
    bs.getAllBuildings = () => [ete, filters];
    const old = { resources: JSON.parse(JSON.stringify(rm.resources)) };
    delete old.resources.water.riverRecharge;
    bs.rebuildLegacyResourceTotals(old);
    assert.strictEqual(rm.resources.water.riverRecharge, BUILDINGS.treatment_plant.riverRecharge + BUILDINGS.filter_station.riverRecharge);
});

// ===== Aquífero maior e árvores =====
test('aquífero 20% maior: o mesmo bombeamento tira 1/1,2 do que tirava', () => {
    const { rm, res } = city();
    res.water.groundwaterProduction = 100;
    const { drain } = rm.getAquiferBalance();
    assert.ok(Math.abs(drain - 100 * ResourceManager.AQUIFER_DRAIN / 1.2) < 1e-9);
    assert.strictEqual(ResourceManager.AQUIFER_CAPACITY, 1.2);
});

test('árvores recarregam o aquífero: nativas pela contagem, mudas pela etapa', () => {
    const sapling = make('tree_sapling', { treeStage: 3 });
    const young = make('tree_sapling', { treeStage: 0 });
    const site = make('tree_sapling', { underConstruction: true });
    const { gm, rm } = city([sapling, young, site]);
    const none = rm.getAquiferBalance();
    assert.strictEqual(none.trees, BUILDINGS.tree_sapling.treeStages[3].aquiferRecharge, 'só a madura (muda e obra = 0)');
    gm.treeSystem = { trees: { size: 100 } };
    const withForest = rm.getAquiferBalance();
    assert.ok(Math.abs(withForest.trees - (100 * TREES.AQUIFER_RECHARGE + BUILDINGS.tree_sapling.treeStages[3].aquiferRecharge)) < 1e-9);
    assert.ok(withForest.recharge > none.recharge);
    // cortar a floresta tira a recarga na hora (sem conta no save)
    gm.treeSystem.trees.size = 0;
    assert.strictEqual(rm.getAquiferBalance().trees, none.trees);
});
