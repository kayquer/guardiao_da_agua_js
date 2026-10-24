// Motor de missões: como cada tipo de objetivo progride, conclui e falha.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/core/ResourceManager.js', 'js/data/missions.js', 'js/systems/QuestSystem.js');
const QuestSystem = g('QuestSystem');
// UI e áudio vivem em arquivos parciais com DOM; aqui só interessam as regras
Object.assign(QuestSystem.prototype, { updateQuestUI() {}, playMissionCompletionAudio() {} });

function setup() {
    const gm = { buildingSystem: { getBuildingsByType: () => [] } };
    gm.resourceManager = new (g('ResourceManager'))(gm);
    const qs = new (g('QuestSystem'))(gm);
    return { qs, resources: gm.resourceManager.resources };
}

function activate(qs, id, secondsAgo = 0) {
    const quest = qs.quests.get(id);
    quest.status = 'active';
    quest.startTime = qs.simNow() - secondsAgo * 1000;
    qs.activeQuests.add(id);
    return quest;
}

test("objetivo 'less' só conclui abaixo do limite", () => {
    const { qs, resources } = setup();
    const quest = activate(qs, 'tutorial_02');
    const objective = quest.objectives.find(o => o.comparison === 'less');

    resources.pollution.current = 60;
    assert.ok(qs.checkObjectiveProgress(objective, quest) < objective.required, 'poluição alta não pode cumprir');

    resources.pollution.current = 20;
    assert.strictEqual(qs.checkObjectiveProgress(objective, quest), objective.required);
});

test('sobrevivência conta o tempo desde o início da missão', () => {
    const { qs } = setup();
    const quest = activate(qs, 'challenge_01', 100);
    const survival = quest.objectives.find(o => o.type === 'survival');
    const progress = qs.checkObjectiveProgress(survival, quest);
    assert.ok(progress >= 99 && progress <= 101, `esperava ~100s, veio ${progress}`);
});

test('Crise Hídrica conclui ao atingir o tempo, sem ser reprovada pelo limite', () => {
    const { qs } = setup();
    activate(qs, 'challenge_01', 601);
    qs.updateQuestProgress('challenge_01', 16);
    assert.strictEqual(qs.quests.get('challenge_01').status, 'completed');
});

test('Crise Hídrica falha se a água acabar', () => {
    const { qs, resources } = setup();
    activate(qs, 'challenge_01', 60);
    resources.water.current = 0;
    qs.updateQuestProgress('challenge_01', 16);
    assert.strictEqual(qs.quests.get('challenge_01').status, 'failed');
    assert.ok(!qs.activeQuests.has('challenge_01'));
});

test('relógio das missões é o tempo de jogo: parado (pausa/tutorial/popup), a missão não envelhece', () => {
    const { qs } = setup();
    qs.gameManager.gameTime = 50000;
    const quest = activate(qs, 'challenge_01', 100);
    const survival = quest.objectives.find(o => o.type === 'survival');
    assert.strictEqual(qs.checkObjectiveProgress(survival, quest), 100);
    // Tempo real passa, gameTime não (jogo pausado): o progresso fica igual
    assert.strictEqual(qs.checkObjectiveProgress(survival, quest), 100);
    qs.gameManager.gameTime += 30000; // jogo voltou e rodou 30 s
    assert.strictEqual(qs.checkObjectiveProgress(survival, quest), 130);
});

test('save antigo com missão removida carrega sem ela', () => {
    const { qs } = setup();
    qs.loadData({ activeQuests: ['tutorial_01', 'seasonal_water_day'], completedQuests: ['green_infrastructure'] });
    assert.deepStrictEqual([...qs.activeQuests], ['tutorial_01']);
    assert.deepStrictEqual([...qs.completedQuests], []);
});

test('missões liberam em sequência pelos pré-requisitos dos dados (não todas no início)', () => {
    const { qs } = setup();
    qs.activeQuests.clear();
    qs.quests.forEach(q => { q.status = 'available'; });
    qs.checkUnlockConditions();
    assert.deepStrictEqual([...qs.activeQuests], ['tutorial_01'], 'no começo só a primeira');

    qs.completeQuest('tutorial_01');
    assert.ok(qs.activeQuests.has('tutorial_02'));
    assert.ok(qs.activeQuests.has('story_chain_01_01'));
    assert.ok(!qs.activeQuests.has('main_01'));

    qs.completeQuest('tutorial_02');
    qs.completeQuest('tutorial_03');
    assert.ok(qs.activeQuests.has('main_01'));
    assert.ok(qs.activeQuests.has('challenge_01'));
});

test("'sustained' conta segundos de jogo, não chamadas (quadros)", () => {
    const { qs, resources } = setup();
    qs.gameManager.gameTime = 0;
    const quest = activate(qs, 'main_01');
    const objective = quest.objectives.find(o => o.type === 'sustained');
    resources.population.satisfaction = 90;
    for (let i = 0; i < 300; i++) qs.checkObjectiveProgress(objective, quest); // 300 quadros sem o jogo andar
    assert.strictEqual(objective.sustainedTime, 0);
    qs.gameManager.gameTime += 10000;
    assert.strictEqual(qs.checkObjectiveProgress(objective, quest), 10);
    resources.population.satisfaction = 40;
    qs.gameManager.gameTime += 1000;
    assert.strictEqual(qs.checkObjectiveProgress(objective, quest), 0, 'caiu abaixo: zera');
});

test("'build' só conta prédio pronto", () => {
    const { qs } = setup();
    const quest = activate(qs, 'tutorial_01');
    const objective = quest.objectives[0];
    qs.gameManager.buildingSystem.getBuildingsByType = () => [{ underConstruction: true }];
    assert.strictEqual(qs.checkObjectiveProgress(objective, quest), 0);
    qs.gameManager.buildingSystem.getBuildingsByType = () => [{ underConstruction: false }];
    assert.strictEqual(qs.checkObjectiveProgress(objective, quest), 1);
});

test('Crise Hídrica começa uma seca da duração da missão (ou estica a que já existe)', () => {
    const { qs } = setup();
    const calls = [];
    const active = new Map();
    qs.gameManager.eventSystem = { activeEvents: active, triggerEvent: (type, forced, opts) => calls.push([type, opts.duration]) };
    qs.quests.get('challenge_01').status = 'available';
    qs.startQuest('challenge_01');
    assert.deepStrictEqual(JSON.stringify(calls), JSON.stringify([['drought', 240000]]));

    const { qs: qs2 } = setup();
    const drought = { type: 'drought', duration: 120000, remainingTime: 30000 };
    qs2.gameManager.eventSystem = { activeEvents: new Map([['e', drought]]), triggerEvent: () => assert.fail('não cria outra') };
    qs2.quests.get('challenge_01').status = 'available';
    qs2.startQuest('challenge_01');
    assert.strictEqual(drought.remainingTime, 240000);
});

test('Crise Hídrica falha quando a água está secando sem produção (antes de zerar)', () => {
    const { qs, resources } = setup();
    activate(qs, 'challenge_01', 60);
    resources.water.production = 0;
    resources.water.current = 5;
    resources.population.current = 500;
    qs.gameManager.resourceManager.updateConsumption();
    qs.updateQuestProgress('challenge_01', 16);
    assert.strictEqual(qs.quests.get('challenge_01').status, 'failed');
});
