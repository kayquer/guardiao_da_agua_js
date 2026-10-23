// Árvores plantadas ("Muda de Árvore", js/systems/building/TreeGrowth.js): dados das 4 etapas, crescimento pelo
// tempo de jogo, efeitos que entram de verdade no ResourceManager (água na muda, poluição depois), save e estudo.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/core/ResourceManager.js',
    'js/systems/BuildingSystem.js', 'js/systems/building/TreeGrowth.js', 'js/systems/StudySystem.js');
const BUILDINGS = g('BUILDING_TYPES');
const BuildingSystem = g('BuildingSystem');
const ResourceManager = g('ResourceManager');
const StudySystem = g('StudySystem');
const TREES = g('TREES');
const SAPLING = { ...BUILDINGS.tree_sapling, id: 'tree_sapling' };

/** BuildingSystem só com as regras (sem Babylon) e um ResourceManager de verdade. */
function setup() {
    const rm = new ResourceManager();
    const bs = Object.create(BuildingSystem.prototype);
    bs.gameManager = { resourceManager: rm, gameTime: 0, timeScale: 1 };
    bs.buildings = new Map();
    const building = { id: 'building_1', type: 'tree_sapling', config: SAPLING, active: true, efficiency: 1, underConstruction: false };
    bs.buildings.set(building.id, building);
    return { rm, bs, building };
}

test('dados: muda 1×1 barata, 4 etapas crescendo; só a 1ª bebe água e só as outras limpam o ar', () => {
    assert.strictEqual(SAPLING.size, 1);
    assert.ok(SAPLING.cost > 0 && SAPLING.cost <= 1000, 'muda é barata');
    assert.strictEqual(SAPLING.plantedTree, true);
    const stages = SAPLING.treeStages;
    assert.strictEqual(stages.length, 4);
    assert.ok(stages[0].waterConsumption > 0 && !stages[0].pollutionReduction, 'muda: só consome água');
    for (let i = 1; i < 4; i++) {
        assert.strictEqual(stages[i].waterConsumption, 0, `etapa ${i + 1} não consome água`);
        assert.ok(stages[i].pollutionReduction > (stages[i - 1].pollutionReduction || 0), `etapa ${i + 1} limpa mais`);
        assert.ok(stages[i].scale > stages[i - 1].scale, `etapa ${i + 1} é maior`);
    }
    stages.slice(0, 3).forEach(s => assert.ok(s.ms > 0));
    assert.strictEqual(stages[3].ms, null);
    assert.ok(stages[3].pollutionReduction > TREES.POLLUTION_REDUCTION, 'madura limpa mais que uma nativa');
});

test('etapa: em obra é null; pronta começa em 0 e avança pelo tempo de jogo até a madura', () => {
    const { bs, building } = setup();
    building.underConstruction = true;
    assert.strictEqual(bs.getTreeStage(building), null);
    building.underConstruction = false;
    bs.onTreeConstructionComplete(building);
    assert.strictEqual(bs.getTreeStage(building), 0);
    const ms = SAPLING.treeStages[0].ms;
    assert.strictEqual(bs.advanceTreeProgress(building, ms / 2, 1), null);
    assert.ok(Math.abs(bs.getTreeStageProgress(building) - 0.5) < 1e-9);
    assert.strictEqual(bs.advanceTreeProgress(building, ms / 2, 1), 1);
    assert.strictEqual(bs.getTreeStage({ ...building, treeStage: 3 }), 3);
    assert.strictEqual(bs.advanceTreeProgress({ ...building, treeStage: 3 }, 1e9, 1), null, 'madura não passa da etapa 4');
    assert.strictEqual(bs.getTreeTimeToNextStage({ ...building, treeStage: 3 }), null);
});

test('muda sem água na cidade para de crescer; as outras etapas crescem mesmo assim', () => {
    const { bs, building } = setup();
    assert.strictEqual(bs.computeTreeGrowthRate(0, { waterShortage: true }), 0);
    assert.strictEqual(bs.computeTreeGrowthRate(0, { waterShortage: false }), 1);
    assert.strictEqual(bs.computeTreeGrowthRate(2, { waterShortage: true }), 1);
    bs.onTreeConstructionComplete(building);
    assert.strictEqual(bs.getTreeTimeToNextStage(building, { waterShortage: true }), Infinity);
    assert.strictEqual(bs.getTreeTimeToNextStage(building, { waterShortage: false }), SAPLING.treeStages[0].ms);
});

test('efeitos entram no ResourceManager: muda soma consumo de água; jovem troca por redução de poluição; remover zera', () => {
    const { rm, bs, building } = setup();
    const water0 = rm.resources.water.buildingConsumption || 0;
    const red0 = rm.resources.pollution.reduction;
    bs.onTreeConstructionComplete(building);
    bs.applyBuildingEffects(building, true);
    assert.strictEqual(rm.resources.water.buildingConsumption, water0 + SAPLING.treeStages[0].waterConsumption);
    assert.strictEqual(rm.resources.pollution.reduction, red0);
    rm.updateWater();
    assert.ok(rm.resources.water.consumption >= SAPLING.treeStages[0].waterConsumption, 'entra no consumo total');

    assert.strictEqual(bs.setTreeStage(building, 1), true);
    assert.strictEqual(rm.resources.water.buildingConsumption, water0, 'jovem não bebe mais água');
    assert.ok(Math.abs(rm.resources.pollution.reduction - (red0 + SAPLING.treeStages[1].pollutionReduction)) < 1e-9);

    bs.forceTreeStage(building.id, 3);
    assert.ok(Math.abs(rm.resources.pollution.reduction - (red0 + SAPLING.treeStages[3].pollutionReduction)) < 1e-9);

    bs.applyBuildingEffects(building, false);
    assert.strictEqual(rm.resources.water.buildingConsumption, water0);
    assert.ok(Math.abs(rm.resources.pollution.reduction - red0) < 1e-9);
});

test('updateTreeGrowth avança pelo gameTime (pausa = gameTime parado = nada muda)', () => {
    const { rm, bs, building } = setup();
    bs.onTreeConstructionComplete(building);
    bs.applyBuildingEffects(building, true);
    bs.updateTreeGrowth(); // primeira chamada só marca o relógio
    bs.updateTreeGrowth();
    assert.strictEqual(building.treeProgress, 0, 'sem gameTime passando, não cresce');
    bs.gameManager.gameTime = SAPLING.treeStages[0].ms + 10;
    bs.updateTreeGrowth();
    assert.strictEqual(bs.getTreeStage(building), 1);
    assert.ok(rm.resources.pollution.reduction >= SAPLING.treeStages[1].pollutionReduction);
});

test('save: etapa e progresso vão no serializeBuilding e restoreTreeState não soma de novo', () => {
    const { rm, bs, building } = setup();
    bs.onTreeConstructionComplete(building);
    bs.applyBuildingEffects(building, true);
    bs.setTreeStage(building, 2);
    building.treeProgress = 0.4567;
    const saved = JSON.parse(JSON.stringify(BuildingSystem.serializeBuilding({ ...building, gridX: 1, gridZ: 2 })));
    assert.strictEqual(saved.treeStage, 2);
    assert.strictEqual(saved.treeProgress, 0.457);
    assert.strictEqual(saved.effectsApplied, true);

    const reduction = rm.resources.pollution.reduction;
    const restored = { id: 'building_1', type: 'tree_sapling', config: SAPLING, active: true, efficiency: 1, underConstruction: false, effectsApplied: true };
    bs.restoreTreeState(restored, saved);
    assert.strictEqual(bs.getTreeStage(restored), 2);
    assert.strictEqual(restored.treeProgress, 0.457);
    assert.strictEqual(rm.resources.pollution.reduction, reduction, 'restaurar não soma efeitos');
    bs.applyBuildingEffects(restored, false); // remover depois do load tira exatamente o da etapa
    assert.ok(Math.abs(rm.resources.pollution.reduction - (reduction - SAPLING.treeStages[2].pollutionReduction)) < 1e-9);

    const plain = BuildingSystem.serializeBuilding({ id: 'b', type: 'house', gridX: 0, gridZ: 0 });
    assert.ok(!('treeStage' in plain), 'outros prédios não ganham o campo');
});

test('estudo: a muda já vem desbloqueada (não espera o conteúdo de estudos carregar)', () => {
    const study = new StudySystem(null);
    assert.strictEqual(study.isBuildingUnlocked('tree_sapling'), true);
});
