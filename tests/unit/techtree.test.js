// Árvore tecnológica: dados (tier/group/techRequires em buildings.js) e regras do TechTree.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/data/buildings.js', 'js/data/missions.js', 'js/systems/TechTree.js', 'js/systems/StudySystem.js');
const BUILDINGS = g('BUILDING_TYPES');
const MISSIONS = g('MISSIONS');
const TechTree = g('TechTree');
const StudySystem = g('StudySystem');

test('todo prédio tem nível 1-5, grupo e requisitos que existem', () => {
    for (const [id, b] of Object.entries(BUILDINGS)) {
        assert.ok(Number.isInteger(b.tier) && b.tier >= 1 && b.tier <= 5, `${id}.tier`);
        assert.ok(typeof b.group === 'string' && b.group, `${id}.group`);
        assert.ok(Array.isArray(b.techRequires), `${id}.techRequires`);
        for (const req of b.techRequires) {
            const ids = req.ids || [req.id];
            assert.ok(ids.length && ids.every(r => BUILDINGS[r]), `${id}: requisito inexistente ${JSON.stringify(req)}`);
            assert.ok(Number.isInteger(req.count) && req.count >= 1, `${id}: count`);
            if (req.ids) assert.ok(req.label, `${id}: requisito com ids precisa de label`);
            // um requisito nunca é de nível mais alto que o prédio que ele libera
            assert.ok(Math.min(...ids.map(r => BUILDINGS[r].tier)) <= b.tier, `${id} (nível ${b.tier}) depende de algo mais avançado`);
            assert.ok(!ids.includes(id), `${id} depende de si mesmo`);
        }
    }
});

test('a árvore não tem ciclo e tudo é alcançável a partir do nível 1', () => {
    const reached = new Set(Object.keys(BUILDINGS).filter(id => BUILDINGS[id].techRequires.length === 0));
    let grew = true;
    while (grew) {
        grew = false;
        for (const [id, b] of Object.entries(BUILDINGS)) {
            if (reached.has(id)) continue;
            if (b.techRequires.every(r => (r.ids || [r.id]).some(x => reached.has(x)))) {
                reached.add(id);
                grew = true;
            }
        }
    }
    const stuck = Object.keys(BUILDINGS).filter(id => !reached.has(id));
    assert.deepStrictEqual(stuck, [], `inalcançáveis: ${stuck.join(', ')}`);
});

test('construções avançadas (nível 5) passam por pesquisa', () => {
    const RESEARCH = new Set(['research_center', 'university', 'water_research_center']);
    const needsResearch = (id, seen = new Set()) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return BUILDINGS[id].techRequires.some(r => (r.ids || [r.id]).some(x => RESEARCH.has(x) || needsResearch(x, seen)));
    };
    for (const [id, b] of Object.entries(BUILDINGS)) {
        if (b.tier === 5) assert.ok(needsResearch(id), `${id} é nível 5 e não depende de pesquisa`);
    }
});

test('o poço artesiano pede 3 bombas d\'água (exemplo do pedido)', () => {
    assert.strictEqual(JSON.stringify(BUILDINGS.water_well.techRequires), JSON.stringify([{ id: 'water_pump', count: 3 }]));
});

test('o primeiro prédio de cada missão de construção do começo não pede tecnologia', () => {
    for (const id of ['tutorial_01']) {
        for (const o of MISSIONS[id].objectives.filter(o => o.type === 'build')) {
            assert.strictEqual(BUILDINGS[o.target].techRequires.length, 0, `${id} pede ${o.target}`);
        }
    }
});

// GameManager mínimo: tipos registrados como no BuildingSystem e prédios num Map
function fakeGame() {
    const buildingTypes = new Map(Object.entries(BUILDINGS).map(([id, b]) => [id, { ...structuredClone(b), id }]));
    const buildings = new Map();
    const gm = { buildingSystem: { buildingTypes, buildings }, notes: [] };
    gm.uiManager = { showNotification: msg => gm.notes.push(msg) };
    let n = 0;
    gm.build = (type, done = true) => buildings.set(`b${++n}`, { id: `b${n}`, type, underConstruction: !done });
    gm.techTree = new TechTree(gm);
    return gm;
}

test('conta só prédios prontos e libera quando a contagem fecha (e avisa uma vez)', () => {
    const gm = fakeGame();
    const tech = gm.techTree;
    assert.strictEqual(tech.isReached('water_pump'), true, 'sem requisito');
    assert.strictEqual(tech.isReached('water_well'), false);
    gm.build('water_pump');
    gm.build('water_pump');
    gm.build('water_pump', false); // em obra: não conta
    tech.invalidate();
    assert.strictEqual(JSON.stringify(tech.getProgress('water_well')), JSON.stringify([{ label: 'Bomba de Água', ids: ['water_pump'], have: 2, need: 3, done: false }]));
    assert.strictEqual(tech.isReached('water_well'), false);

    gm.build('water_pump');
    tech.invalidate();
    const fresh = tech.check();
    assert.ok(fresh.includes('water_well'));
    assert.ok(gm.notes.some(m => m.includes('Poço Artesiano')));
    assert.strictEqual(tech.check().length, 0, 'não avisa de novo');
});

test('atingida uma vez, fica: demolir os requisitos não tranca de novo', () => {
    const gm = fakeGame();
    for (let i = 0; i < 3; i++) gm.build('water_pump');
    assert.strictEqual(gm.techTree.isReached('water_well'), true);
    gm.buildingSystem.buildings.clear();
    gm.techTree.invalidate();
    assert.strictEqual(gm.techTree.isReached('water_well'), true);
});

test('requisito por lista (zonas industriais quaisquer) soma os tipos', () => {
    const gm = fakeGame();
    gm.techTree.markReached('biomass_plant'); // só falta a parte das zonas
    gm.build('composting_yard');
    gm.build('biomass_plant');
    gm.build('zone_industrial_light');
    gm.techTree.invalidate();
    assert.strictEqual(gm.techTree.isReached('sugarcane_mill'), false);
    gm.build('zone_industrial_heavy');
    gm.techTree.invalidate();
    assert.strictEqual(gm.techTree.isReached('sugarcane_mill'), true);
});

test('save: round trip e save antigo libera o que já foi construído ou estudado', () => {
    const gm = fakeGame();
    gm.techTree.markReached('nuclear_plant');
    const data = JSON.parse(JSON.stringify(gm.techTree.getSaveData()));
    const other = fakeGame();
    other.techTree.loadData(data);
    assert.ok(other.techTree.isReached('nuclear_plant'));

    // Save sem árvore: prédio já construído e estudo já feito continuam liberados
    const legacy = fakeGame();
    legacy.build('university');
    legacy.studySystem = { unlockedBuildings: new Set(['filter_station', 'school']), hasStudyContent: id => id === 'filter_station' };
    legacy.techTree.loadData(undefined);
    assert.ok(legacy.techTree.isReached('university'));
    assert.ok(legacy.techTree.isReached('filter_station'));
    // liberado só pela regra antiga de "sem estudo = liberado" não conta: a escola ainda pede a prefeitura
    assert.strictEqual(legacy.techTree.isReached('school'), false);
});

test('StudySystem: tecnologia antes do estudo; estudo concluído vale pela tecnologia', () => {
    const gm = fakeGame();
    const study = new StudySystem(gm);
    study.contentLoaded = true;
    study.studyContent.set('water_well', {});
    assert.strictEqual(study.isTechReached('water_well'), false);
    assert.strictEqual(study.isBuildingUnlocked('water_well'), false);
    study.unlockBuilding('water_well');
    assert.strictEqual(study.isTechReached('water_well'), true);
    assert.strictEqual(study.isBuildingUnlocked('water_well'), true);
    // prédio sem estudo, mas com tecnologia pendente
    assert.strictEqual(study.isStudyUnlocked('hospital'), true);
    assert.strictEqual(study.isBuildingUnlocked('hospital'), false);
});
