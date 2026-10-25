// Curva de desafio (auditoria 10/2026): estrelas por missão, desafios da cidade no jogo livre e eventos que crescem com a cidade.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/core/ResourceManager.js', 'js/data/missions.js', 'js/data/resourceStates.js',
    'js/systems/ResourceTrends.js', 'js/systems/QuestSystem.js', 'js/systems/CityChallenges.js', 'js/systems/EventSystem.js');
const QuestSystem = g('QuestSystem');
const EventSystem = g('EventSystem');
Object.assign(QuestSystem.prototype, { updateQuestUI() {}, playMissionCompletionAudio() {} });

function setup(buildings = []) {
    const gm = { gameTime: 0, buildingSystem: { getBuildingsByType: id => buildings.filter(b => b === id), buildingTypes: new Map() } };
    gm.resourceManager = new (g('ResourceManager'))(gm);
    const qs = new QuestSystem(gm);
    gm.questSystem = qs;
    const r = gm.resourceManager.resources;
    // cidade saudável: água pela metade, pouca poluição, satisfação boa, energia sobrando
    Object.assign(r.water, { current: 600, storage: 1000 });
    r.pollution.current = 10;
    r.population.satisfaction = 70;
    Object.assign(r.electricity, { generation: 100, consumption: 50 });
    return { gm, qs, r };
}

function activate(qs, id, startTime = 0) {
    const quest = qs.quests.get(id);
    quest.status = 'active';
    quest.startTime = startTime;
    qs.activeQuests.add(id);
    return quest;
}

test('estrelas: cumprir, no tempo-alvo, com a cidade saudável; cada estrela a mais = +25% de dinheiro', () => {
    const { gm, qs, r } = setup();
    const quest = activate(qs, 'tutorial_01');
    gm.gameTime = 60000; // 1 min: dentro dos 3 min
    quest.completionTime = gm.gameTime;
    assert.strictEqual(qs.computeStars(quest), 3);
    assert.strictEqual(JSON.stringify(quest.starResults), '[true,true,true]');

    quest.completionTime = 10 * 60000; // atrasado
    assert.strictEqual(qs.computeStars(quest), 2);
    r.pollution.current = 85; // cidade no vermelho
    assert.strictEqual(qs.computeStars(quest), 1);

    quest.stars = 3;
    assert.strictEqual(qs.calculatePerformanceMultiplier(quest), 1.5);
    quest.stars = 1;
    assert.strictEqual(qs.calculatePerformanceMultiplier(quest), 1);
    assert.strictEqual(qs.getStarGoals(quest).length, 3);
    assert.match(qs.getStarGoals(quest)[1], /3 min/);
});

test('crise hídrica: a 2ª estrela olha a menor reserva durante a missão', () => {
    const { qs, r } = setup();
    const quest = activate(qs, 'challenge_01');
    r.water.current = 200; // 20%
    qs.trackStarConditions();
    r.water.current = 800;
    qs.trackStarConditions();
    assert.strictEqual(quest.lowestWater, 0.2);
    quest.completionTime = 0;
    quest.starResults = undefined;
    qs.computeStars(quest);
    assert.strictEqual(quest.starResults[1], false, 'baixou de 30%');
    assert.match(qs.getStarGoals(quest)[1], /30%/);
});

test('missão concluída guarda as estrelas, paga o bônus e o save leva tudo', () => {
    const { gm, qs, r } = setup();
    const quest = activate(qs, 'tutorial_01');
    gm.gameTime = 30000;
    const before = r.budget.current;
    qs.completeQuest('tutorial_01');
    assert.strictEqual(quest.stars, 3);
    assert.strictEqual(r.budget.current - before, MISSIONS_BUDGET(g) * 1.5);

    const other = setup().qs;
    other.loadData(JSON.parse(JSON.stringify(qs.getSaveData())));
    assert.strictEqual(other.quests.get('tutorial_01').stars, 3);
});

function MISSIONS_BUDGET(evaluate) {
    return JSON.parse(JSON.stringify(evaluate('MISSIONS'))).tutorial_01.rewards.budget;
}

test('sem missão nenhuma, um desafio da cidade aparece depois de 30 s de jogo, medido pela cidade, e volta do save', () => {
    const { gm, qs, r } = setup();
    Object.assign(gm, { gameState: 'playing', tutorialDone: true });
    qs.activeQuests.clear();
    r.population.current = 400;
    qs.updateCityChallenges();
    gm.gameTime = 29000;
    qs.updateCityChallenges();
    assert.ok(!qs.quests.has('city_challenge_1'), 'ainda não deu 30 s');
    gm.gameTime = 31000;
    qs.updateCityChallenges();
    const quest = qs.quests.get('city_challenge_1');
    assert.ok(quest, 'desafio criado');
    assert.strictEqual(quest.challengeKind, 'growth');
    assert.strictEqual(quest.objectives[0].required, 500, '400 × 1,25');
    assert.ok(quest.starSpec.parMs > 0);

    const other = setup().qs;
    other.loadData(JSON.parse(JSON.stringify(qs.getSaveData())));
    assert.ok(other.quests.has('city_challenge_1'));
    assert.strictEqual(other.getCityChallengeState().count, 1);
});

test('desafios se revezam e usam só objetivos que o motor mede', () => {
    const { gm, qs, r } = setup();
    r.water.aquifer = 40;
    gm.eventSystem = { hasActiveEventOfType: () => false, pendingEvents: [] };
    const kinds = [1, 2, 3, 4].map(n => qs.buildCityChallenge(n));
    assert.deepStrictEqual(kinds.map(c => c.challengeKind), ['growth', 'aquifer', 'drought', 'satisfaction']);
    const supported = ['build', 'resource', 'sustained', 'survival', 'avoid'];
    kinds.forEach(c => c.objectives.forEach(o => assert.ok(supported.includes(o.type), o.type)));
    assert.strictEqual(kinds[1].objectives[0].required, 60, 'aquífero 40% → meta mínima de 60%');
    assert.strictEqual(kinds[2].startEvent.type, 'drought');
    // aquífero cheio: o modelo é pulado e entra o próximo
    r.water.aquifer = 100;
    assert.strictEqual(qs.buildCityChallenge(2).challengeKind, 'drought');
});

test('pressão dos eventos cresce com missões cumpridas e população (até +60%)', () => {
    const gm = { questSystem: { completedQuests: new Set() }, resourceManager: { resources: { population: { current: 300 } } } };
    const es = Object.create(EventSystem.prototype);
    es.gameManager = gm;
    assert.strictEqual(es.getCityPressure(), 1, 'cidade nova: como sempre foi');
    gm.questSystem.completedQuests = new Set(['a', 'b', 'c', 'd']);
    gm.resourceManager.resources.population.current = 1100;
    assert.ok(Math.abs(es.getCityPressure() - (1 + 0.28 + 0.1)) < 1e-9);
    gm.resourceManager.resources.population.current = 99999;
    assert.strictEqual(es.getCityPressure(), 1 + EventSystem.MAX_PRESSURE);
});
