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
    quest.startTime = Date.now() - secondsAgo * 1000;
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
    const quest = activate(qs, 'challenge_01', 300);
    const survival = quest.objectives.find(o => o.type === 'survival');
    const progress = qs.checkObjectiveProgress(survival, quest);
    assert.ok(progress >= 299 && progress <= 301, `esperava ~300s, veio ${progress}`);
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

test('save antigo com missão removida carrega sem ela', () => {
    const { qs } = setup();
    qs.loadData({ activeQuests: ['tutorial_01', 'seasonal_water_day'], completedQuests: ['green_infrastructure'] });
    assert.deepStrictEqual([...qs.activeQuests], ['tutorial_01']);
    assert.deepStrictEqual([...qs.completedQuests], []);
});
