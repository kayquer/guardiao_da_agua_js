// Salvar/carregar: formato do save (versão, danificado, antigo), um save por perfil e o vaivém
// getSaveData → JSON → loadData dos sistemas sem Babylon. Objetos do vm comparam via JSON.stringify.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const same = (a, b, msg) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), msg);
const roundTrip = data => JSON.parse(JSON.stringify(data)); // o que o localStorage faz com o save

// Conteúdo mínimo que GameManager.getSaveData() produz (só o que o SaveSystem confere)
const GAME = {
    gameTime: 123456,
    gameClockTime: Date.UTC(2026, 9, 21, 15, 30),
    resources: { resources: { population: { current: 640.4 } }, history: {} },
    trees: { cells: [[1, 2], [3, 4]], initialCount: 5 },
    buildings: { buildings: [{ id: 'building_0', type: 'city_hall', gridX: 10, gridZ: 12 }], buildingCounter: 1 },
    quests: { totalScore: 300, completedQuests: ['tutorial_01'] }
};

test('save: envelope versionado com resumo para a tela de perfis', () => {
    const SaveSystem = load('js/systems/SaveSystem.js')('SaveSystem');
    const envelope = SaveSystem.buildEnvelope(GAME, 'p_ana', { kind: 'manual', now: 42 });
    assert.strictEqual(envelope.format, 'guardiao_agua_save');
    assert.strictEqual(envelope.version, SaveSystem.VERSION);
    assert.strictEqual(envelope.profileId, 'p_ana');
    same(envelope.summary, { gameTime: 123456, gameClockTime: GAME.gameClockTime, buildingCount: 1, population: 640, score: 300, completedQuests: 1 });

    const parsed = SaveSystem.parseEnvelope(JSON.stringify(envelope), 'p_ana');
    assert.strictEqual(parsed.ok, true);
    same(parsed.envelope.game, GAME);
});

test('save: vazio, danificado, de outra versão ou de outro perfil não carrega (e não lança)', () => {
    const SaveSystem = load('js/systems/SaveSystem.js')('SaveSystem');
    const good = SaveSystem.buildEnvelope(GAME, 'p_ana');
    const reason = (raw, profile = 'p_ana') => SaveSystem.parseEnvelope(raw, profile).reason;

    assert.strictEqual(reason(null), 'missing');
    assert.strictEqual(reason('{"format":'), 'corrupt');
    assert.strictEqual(reason('42'), 'corrupt');
    assert.strictEqual(reason(JSON.stringify({ hello: 'mundo' })), 'corrupt');
    // formato 1.0.0 (antes deste save): { metadata, gameData }, sem prédios recriáveis
    assert.strictEqual(reason(JSON.stringify({ metadata: { version: '1.0.0' }, gameData: {} })), 'incompatible');
    assert.strictEqual(reason(JSON.stringify({ ...good, version: SaveSystem.VERSION + 1 })), 'incompatible');
    assert.strictEqual(reason(JSON.stringify({ ...good, version: 1 })), 'incompatible');
    assert.strictEqual(reason(JSON.stringify({ ...good, game: { ...GAME, buildings: null } })), 'corrupt');
    assert.strictEqual(reason(JSON.stringify({ ...good, game: { ...GAME, trees: undefined } })), 'corrupt');
    assert.strictEqual(reason(JSON.stringify({ ...good, game: { ...GAME, gameTime: 'ontem' } })), 'corrupt');
    assert.strictEqual(reason(JSON.stringify(good), 'p_bia'), 'corrupt', 'save de outro perfil na chave errada');
    assert.ok(SaveSystem.reasonText('incompatible').includes('versão'));
});

test('save: um jogo por perfil; apagar um não mexe no outro; chaves antigas somem', () => {
    const g = load('js/systems/SaveSystem.js');
    const SaveSystem = g('SaveSystem');
    g("localStorage.setItem('guardiao_agua_autosave', '{}')");
    const saves = new SaveSystem();
    assert.strictEqual(g("localStorage.getItem('guardiao_agua_autosave')"), null, 'save antigo, global, é descartado');

    assert.strictEqual(saves.getSaveInfo('p_ana'), null);
    assert.ok(saves.save({ ...GAME, gameTime: 1 }, 'p_ana', { kind: 'manual' }));
    assert.ok(saves.save({ ...GAME, gameTime: 2 }, 'p_bia'));
    assert.strictEqual(saves.load('p_ana').data.gameTime, 1);
    assert.strictEqual(saves.load('p_bia').data.gameTime, 2);
    const info = saves.getSaveInfo('p_ana');
    assert.strictEqual(info.ok, true);
    assert.strictEqual(info.kind, 'manual');
    assert.strictEqual(info.summary.buildingCount, 1);

    saves.deleteSave('p_ana');
    assert.strictEqual(saves.hasSave('p_ana'), false);
    assert.strictEqual(saves.load('p_ana').reason, 'missing');
    assert.strictEqual(saves.load('p_bia').ok, true);

    // Danificado no armazenamento: a tela de perfis vê o problema sem quebrar
    g(`localStorage.setItem(SaveSystem.keyFor('p_bia'), '{quebrado')`);
    same(saves.getSaveInfo('p_bia'), { ok: false, reason: 'corrupt' });
    assert.strictEqual(saves.load('p_bia').ok, false);
});

test('recursos: os totais (com efeito de prédios, árvores e eventos) voltam como estavam', () => {
    const g = load('js/core/ResourceManager.js');
    const ResourceManager = g('ResourceManager');
    const a = new ResourceManager(null);
    a.addWaterProduction(50);
    a.addPollutionSource(3);
    a.addPollutionReduction(5.6);
    a.addExpense(200);
    a.addWaterStorage(1000);
    a.addWaterConsumption(12);
    a.addElectricityGeneration(30);
    a.addElectricityConsumption(40);
    a.resources.budget.current = 12345;
    a.resources.population.satisfaction = 77;

    const saved = roundTrip(a.getSaveData());
    const b = new ResourceManager(null);
    b.loadData(saved);
    same(b.resources, a.resources);
    assert.strictEqual(b.resources.electricity.efficiency, 0.75);

    // Campo novo que o save não tinha fica com o valor de jogo novo
    delete saved.resources.electricity;
    const c = new ResourceManager(null);
    c.loadData(saved);
    assert.strictEqual(c.resources.electricity.generation, 0);

    // O histórico (amostras com horário real, que nada lê) não vai para o save; save antigo com ele carrega
    a.addToHistory();
    assert.strictEqual(a.getSaveData().history, undefined);
    const d = new ResourceManager(null);
    d.loadData({ ...roundTrip(a.getSaveData()), history: { water: [{ time: 1, current: 5 }] } });
    same(d.resources, a.resources);
});

test('prédio: o save guarda tipo, posição, obra (pelo gameTime), aluguel e eficiência', () => {
    const g = load('js/systems/BuildingSystem.js');
    const data = g('BuildingSystem').serializeBuilding({
        id: 'building_3', type: 'water_well', gridX: 4, gridZ: 9, mesh: { nada: 'de Babylon' }, config: {},
        connections: new Set(), active: false, efficiency: 0, underConstruction: true,
        constructionStartTime: 5000, constructionDuration: 7000, constructionTime: 99, isRented: false
    });
    same(data, {
        id: 'building_3', type: 'water_well', gridX: 4, gridZ: 9, rotation: 0, active: false, efficiency: 0,
        underConstruction: true, constructionStartTime: 5000, constructionDuration: 7000, constructionTime: 99, isRented: false,
        effectsApplied: false
    });
});

test('prédio: a rotação (quartos de volta 0-3) vai e volta do save; save antigo sem o campo = 0', () => {
    const g = load('js/systems/BuildingSystem.js');
    const { bs, BuildingSystem } = restorer(g);
    const meshRotations = [];
    bs.createBuildingMesh = (x, z, type, rotation) => { meshRotations.push(rotation); return { metadata: {} }; };
    const base = { type: 'water_well', gridZ: 3, active: true, efficiency: 1, underConstruction: false, effectsApplied: true };
    const saves = [
        { ...base, id: 'building_0', gridX: 1, rotation: 3 },
        { ...base, id: 'building_1', gridX: 2, rotation: 1 },
        { ...base, id: 'building_2', gridX: 3 }, // save antigo
        { ...base, id: 'building_3', gridX: 4, rotation: 'lixo' },
        { ...base, id: 'building_4', gridX: 5, rotation: -1 } // normaliza para 0-3
    ];
    for (const saved of saves) bs.restoreBuilding(roundTrip(saved));
    same([...bs.buildings.values()].map(b => b.rotation), [3, 1, 0, 0, 3]);
    same(meshRotations, [3, 1, 0, 0, 3], 'o mesh nasce já girado');
    same([...bs.buildings.values()].map(b => roundTrip(BuildingSystem.serializeBuilding(b)).rotation), [3, 1, 0, 0, 3]);
    same([0, 1, 2, 3, 4, 5, -2, 2.4, null, undefined].map(r => BuildingSystem.normalizeRotation(r)), [0, 1, 2, 3, 0, 1, 2, 2, 0, 0]);
});

// restoreBuilding sem Babylon: mesh, grid e obra trocados por stubs (o resto é a regra do save)
function restorer(g) {
    const BuildingSystem = g('BuildingSystem');
    const bs = Object.create(BuildingSystem.prototype);
    const calls = { construction: [], occupied: [] };
    Object.assign(bs, {
        buildings: new Map(),
        buildingTypes: new Map([['water_well', { id: 'water_well', size: 1, cost: 1000, waterProduction: 10 }]]),
        gridManager: { gridSize: 40, occupyArea: (x, z) => calls.occupied.push([x, z]), clearDecorationsInArea() {} },
        createBuildingMesh: () => ({ metadata: { fromModel: true } }),
        isInfrastructureBuilding: () => false,
        startConstruction: b => calls.construction.push(b.id),
        updateRentalIcon() {}
    });
    return { bs, calls, BuildingSystem };
}

test('prédio: efeitos aplicados voltam como estavam (pronto, obra e danificado por evento) sem somar de novo', () => {
    const g = load('js/systems/BuildingSystem.js');
    const { bs, calls, BuildingSystem } = restorer(g);
    let applied = 0;
    bs.applyBuildingEffects = () => applied++;
    const base = { type: 'water_well', gridZ: 3, active: true, efficiency: 1, constructionStartTime: 0, constructionDuration: 5000 };
    const saves = [
        { ...base, id: 'building_0', gridX: 1, underConstruction: false, effectsApplied: true },
        { ...base, id: 'building_1', gridX: 2, underConstruction: true, active: false, efficiency: 0, effectsApplied: false },
        // EventSystem.disableRandomBuilding: pronto, inativo e sem efeitos nos totais
        { ...base, id: 'building_2', gridX: 3, underConstruction: false, active: false, effectsApplied: false },
        // save antigo, sem o campo: pronto = com efeitos, obra = sem
        { ...base, id: 'building_3', gridX: 4, underConstruction: false },
        { ...base, id: 'building_4', gridX: 5, underConstruction: true, active: false }
    ];
    for (const saved of saves) bs.restoreBuilding(roundTrip(saved));
    same([...bs.buildings.values()].map(b => b.effectsApplied), [true, false, false, true, false]);
    assert.strictEqual(applied, 0, 'restaurar não reaplica efeitos');
    same(calls.construction, ['building_1', 'building_4'], 'só as obras voltam para a fila de construção');
    assert.strictEqual(bs.buildings.get('building_0').mesh.metadata.buildingId, 'building_0');

    // Vaivém completo: serializeBuilding → JSON → restoreBuilding mantém o que importa
    const again = restorer(g);
    for (const b of bs.buildings.values()) again.bs.restoreBuilding(roundTrip(BuildingSystem.serializeBuilding(b)));
    const keep = b => ({ id: b.id, x: b.gridX, z: b.gridZ, active: b.active, efficiency: b.efficiency, obra: b.underConstruction,
        start: b.constructionStartTime, duration: b.constructionDuration, effects: b.effectsApplied });
    same([...again.bs.buildings.values()].map(keep), [...bs.buildings.values()].map(keep));
});

test('zona: fase e progresso voltam do save; save antigo sem o campo começa na área livre (fase 0)', () => {
    const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/data/zoneLots.js',
        'js/systems/BuildingSystem.js', 'js/systems/building/ZoneGrowth.js');
    const zoneType = { ...g('BUILDING_TYPES').zone_residential_light, id: 'zone_residential_light' };
    const setup = () => {
        const r = restorer(g);
        r.bs.buildingTypes.set(zoneType.id, zoneType);
        r.bs.refreshZoneLot = b => r.calls.occupied.push(['lote', b.id, b.zoneStage]);
        return r;
    };
    const { bs, calls, BuildingSystem } = setup();
    const base = { type: 'zone_residential_light', gridZ: 3, active: true, efficiency: 1, effectsApplied: true, constructionStartTime: 0, constructionDuration: 5000 };
    bs.restoreBuilding(roundTrip({ ...base, id: 'building_0', gridX: 1, underConstruction: false, zoneStage: 2, zoneProgress: 0.25 }));
    bs.restoreBuilding(roundTrip({ ...base, id: 'building_1', gridX: 4, underConstruction: false })); // save antigo
    bs.restoreBuilding(roundTrip({ ...base, id: 'building_2', gridX: 7, underConstruction: true, active: false, effectsApplied: false }));
    const [a, old, obra] = [...bs.buildings.values()];
    same([a.zoneStage, a.zoneProgress, old.zoneStage, old.zoneProgress, obra.zoneStage], [2, 0.25, 0, 0, undefined]);
    assert.ok(calls.occupied.some(c => c[0] === 'lote' && c[1] === 'building_0' && c[2] === 2), 'lote redesenhado na fase salva');
    assert.strictEqual(old.zoneAppliedScale, 1, 'save antigo: totais com a receita cheia');
    assert.strictEqual(bs.getEffectivePopulationCapacity(a), Math.round(zoneType.populationCapacity * 0.75));

    // Vaivém: serializeBuilding → JSON → restoreBuilding mantém a fase
    const again = setup();
    for (const b of bs.buildings.values()) again.bs.restoreBuilding(roundTrip(BuildingSystem.serializeBuilding(b)));
    same([...again.bs.buildings.values()].map(b => [b.zoneStage, b.zoneProgress]), [[2, 0.25], [0, 0], [undefined, undefined]]);
});

test('missões: status, progresso dos objetivos, prazos, escolhas e reputação voltam', () => {
    const g = load('js/core/ResourceManager.js', 'js/data/missions.js', 'js/systems/QuestSystem.js');
    const QuestSystem = g('QuestSystem');
    Object.assign(QuestSystem.prototype, { updateQuestUI() {}, playMissionCompletionAudio() {}, renderMissionInterface() {} });
    const setup = () => {
        const gm = { gameTime: 90000, buildingSystem: { getBuildingsByType: () => [], buildingTypes: new Map() } };
        gm.resourceManager = new (g('ResourceManager'))(gm);
        return new QuestSystem(gm);
    };

    const a = setup();
    a.startQuest('tutorial_01');
    a.completeQuest('tutorial_01');
    a.startQuest('main_01');
    const main = a.quests.get('main_01');
    main.objectives.find(o => o.type === 'sustained').sustainedTime = 42;
    main.objectives[0].current = 500;
    main.progress = 0.4;
    a.startQuest('story_chain_01_01');
    a.makeChoice('story_chain_01_01', 'management_style', 1);
    a.startQuest('challenge_01');
    a.quests.get('challenge_01').objectives.find(o => o.type === 'avoid').violated = true;

    const saved = roundTrip(a.getSaveData());
    const b = setup();
    b.loadData(saved);

    same([...b.completedQuests], ['tutorial_01']);
    same([...b.activeQuests].sort(), [...a.activeQuests].sort());
    assert.strictEqual(b.totalScore, a.totalScore);
    assert.ok(b.totalScore > 0);
    same(b.stakeholderReputation, a.stakeholderReputation);
    const mainB = b.quests.get('main_01');
    assert.strictEqual(mainB.status, 'active');
    assert.strictEqual(mainB.startTime, 90000);
    assert.strictEqual(mainB.progress, 0.4);
    assert.strictEqual(mainB.objectives[0].current, 500);
    assert.strictEqual(mainB.objectives.find(o => o.type === 'sustained').sustainedTime, 42);
    assert.strictEqual(b.quests.get('story_chain_01_01').choices.length, 0, 'escolha feita não reaparece');
    assert.strictEqual(b.quests.get('challenge_01').objectives.find(o => o.type === 'avoid').violated, true);
});

test('missões: save com missão que não existe mais é ignorada', () => {
    const g = load('js/core/ResourceManager.js', 'js/data/missions.js', 'js/systems/QuestSystem.js');
    const QuestSystem = g('QuestSystem');
    Object.assign(QuestSystem.prototype, { updateQuestUI() {}, playMissionCompletionAudio() {} });
    const gm = { buildingSystem: { getBuildingsByType: () => [] } };
    gm.resourceManager = new (g('ResourceManager'))(gm);
    const qs = new QuestSystem(gm);
    qs.loadData({ activeQuests: ['missao_apagada'], completedQuests: ['tutorial_01', 'outra_apagada'], currentMainQuest: 'missao_apagada',
        questStates: [{ id: 'missao_apagada', status: 'active' }, { id: 'tutorial_01', status: 'completed' }] });
    same([...qs.completedQuests], ['tutorial_01']);
    assert.strictEqual(qs.activeQuests.has('missao_apagada'), false);
    assert.strictEqual(qs.currentMainQuest, null);
});

test('eventos, estudos e empréstimos: voltam do save (evento ativo sem reaplicar efeito)', () => {
    const g = load('js/core/ResourceManager.js', 'js/systems/EventSystem.js', 'js/systems/StudySystem.js', 'js/systems/LoanManager.js');
    const gm = {};
    gm.resourceManager = new (g('ResourceManager'))(gm);

    const events = new (g('EventSystem'))(gm);
    const drought = events.eventTypes.get('drought');
    events.activeEvents.set('event_1', { id: 'event_1', type: 'drought', config: drought, startTime: 1, duration: drought.duration, remainingTime: 5000, active: true });
    events.lastEventTime = 777;
    const savedEvents = roundTrip(events.getSaveData());
    assert.strictEqual(savedEvents.activeEvents[0][1].config, undefined, 'o tipo do evento não vai no save');
    const sourcesBefore = gm.resourceManager.resources.pollution.sources;
    const events2 = new (g('EventSystem'))(gm);
    events2.loadData(savedEvents);
    const restored = events2.activeEvents.get('event_1');
    assert.strictEqual(restored.remainingTime, 5000);
    assert.strictEqual(restored.config.name, drought.name);
    assert.strictEqual(events2.lastEventTime, 777);
    assert.strictEqual(gm.resourceManager.resources.pollution.sources, sourcesBefore, 'load não soma o efeito de novo');

    const study = new (g('StudySystem'))(gm);
    study.loadSaveData(roundTrip({ unlockedBuildings: ['water_pump'] }));
    assert.ok(study.isBuildingUnlocked('water_pump'));
    assert.ok(study.isBuildingUnlocked('city_hall'), 'os liberados por padrão continuam liberados');

    const loans = new (g('LoanManager'))(gm);
    loans.loans.set('loan_1', { id: 'loan_1', principal: 1000, startDate: new Date(5), nextPaymentDate: new Date(10),
        paymentHistory: [{ date: new Date(7), amount: 100 }] });
    loans.loanCounter = 1;
    const loans2 = new (g('LoanManager'))(gm);
    loans2.loadData(roundTrip(loans.saveData()));
    assert.strictEqual(loans2.loans.get('loan_1').nextPaymentDate.getTime(), 10);
    assert.strictEqual(loans2.loans.get('loan_1').paymentHistory[0].date.getTime(), 7);
    assert.strictEqual(loans2.loanCounter, 1);
});

test('save: partida sem volta (água < 5% ou poluição ≥ 90) não é continuável', () => {
    const SaveSystem = load('js/systems/SaveSystem.js')('SaveSystem');
    const game = (water, max, pollution) => ({ resources: { resources: { water: { current: water, max }, pollution: { current: pollution } } } });
    assert.strictEqual(SaveSystem.isLostGame(game(500, 1000, 30)), false);
    assert.strictEqual(SaveSystem.isLostGame(game(60, 1000, 30)), false, '6% ainda dá para salvar');
    assert.strictEqual(SaveSystem.isLostGame(game(40, 1000, 30)), true, 'água abaixo de 5%');
    assert.strictEqual(SaveSystem.isLostGame(game(0, 1000, 10)), true, 'água acabou');
    assert.strictEqual(SaveSystem.isLostGame(game(800, 1000, 89)), false);
    assert.strictEqual(SaveSystem.isLostGame(game(800, 1000, 90)), true, 'poluição quase no máximo');
    assert.strictEqual(SaveSystem.isLostGame(GAME), false, 'save sem água/poluição no resumo não é tratado como perdido');
});
