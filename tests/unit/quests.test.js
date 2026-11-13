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

    // depois da bomba: energia (a bomba precisa dela), depois o primeiro bairro, depois o esgoto
    qs.completeQuest('tutorial_01');
    assert.deepStrictEqual([...qs.activeQuests], ['energy_01']);
    qs.completeQuest('energy_01');
    assert.deepStrictEqual([...qs.activeQuests], ['story_chain_01_01']);
    qs.completeQuest('story_chain_01_01');
    // até duas secundárias ao mesmo tempo (3ª auditoria: com uma só, a campanha ramificada virava fila)
    assert.ok(qs.activeQuests.has('tutorial_02') && qs.activeQuests.has('story_chain_01_02'), [...qs.activeQuests].join());
    assert.ok(!qs.activeQuests.has('main_01'));

    qs.completeQuest('tutorial_02');
    assert.strictEqual(qs.activeQuests.size, 2, 'a próxima da fila começa quando a vaga abre');
    for (let i = 0; i < 4 && qs.activeQuests.size; i++) {
        qs.completeQuest([...qs.activeQuests][0]);
        const count = qs.activeCountByCategory();
        assert.ok(count.primary <= 1 && count.secondary <= 2, JSON.stringify(count));
        const crises = [...qs.activeQuests].filter(id => qs.quests.get(id)?.startEvent);
        assert.ok(crises.length <= 1, `uma crise por vez: ${crises.join()}`);
    }
    assert.ok(!qs.activeQuests.has('main_01'), 'Cidade Sustentável vem depois do comércio (campanha ampliada)');
});

test("'survival' conta só com a crise da missão ativa, não o tempo de aviso", () => {
    const { qs } = setup();
    qs.gameManager.gameTime = 0;
    const es = { activeEvents: new Map(), pendingEvents: [], eventTypes: new Map([['flood', { name: 'Enchente' }]]) };
    qs.gameManager.eventSystem = es;
    const quest = activate(qs, 'challenge_03');
    const objective = quest.objectives.find(o => o.type === 'survival');
    es.pendingEvents.push({ type: 'flood', remainingTime: 45000, awaiting: false });
    qs.checkObjectiveProgress(objective, quest);
    qs.gameManager.gameTime += 60000; // um minuto de aviso: a meta não anda
    assert.strictEqual(qs.checkObjectiveProgress(objective, quest), 0);
    assert.strictEqual(objective.waitingS, 45);
    es.pendingEvents.length = 0;
    es.activeEvents.set('e1', { type: 'flood' });
    qs.checkObjectiveProgress(objective, quest);
    qs.gameManager.gameTime += 30000;
    assert.strictEqual(qs.checkObjectiveProgress(objective, quest), 30, 'só os 30 s com a enchente ativa');
    es.activeEvents.clear(); // a enchente acabou antes: atravessou
    assert.strictEqual(qs.checkObjectiveProgress(objective, quest), objective.required);
});

test('3ª estrela da missão 1 não depende da energia (missão seguinte)', () => {
    const { qs } = setup();
    qs.gameManager.resourceManager.getBasinReport = () => [{ id: 'water', level: 'good' }, { id: 'energy', level: 'bad' }];
    assert.strictEqual(qs.isCityHealthy(qs.quests.get('tutorial_01')), true);
    assert.strictEqual(qs.isCityHealthy(qs.quests.get('energy_01')), false);
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
    const calls = [], ended = [];
    // chuva intensa ativa: não combina com a seca (EventSystem.ANTAGONISTS) e termina antes; a seca chega pelo Paulo
    const active = new Map([['r', { id: 'r', type: 'heavy_rain', startTime: 0 }]]);
    const es = {
        activeEvents: active, pendingEvents: [],
        endEvent: id => { ended.push(id); active.delete(id); },
        getOngoingEventTypes: () => [...active.values()].map(e => e.type),
        eventsAgainst: type => (type === 'drought' ? ['heavy_rain', 'flood'] : []),
        maxSimultaneous: 3,
        announceEvent: (type, opts) => calls.push([type, opts.duration]),
        triggerEvent: () => assert.fail('a crise passa pelo announceEvent (decisão do Paulo + aviso)')
    };
    qs.gameManager.eventSystem = es;
    qs.quests.get('challenge_01').status = 'available';
    qs.startQuest('challenge_01');
    assert.deepStrictEqual(JSON.stringify(calls), JSON.stringify([['drought', 240000]]));
    assert.deepStrictEqual(ended, ['r'], 'seca e chuva intensa nunca juntas');

    const { qs: qs2 } = setup();
    const drought = { type: 'drought', duration: 120000, remainingTime: 30000 };
    qs2.gameManager.eventSystem = { activeEvents: new Map([['e', drought]]), pendingEvents: [], announceEvent: () => assert.fail('não cria outra'), triggerEvent: () => assert.fail('não cria outra') };
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

test('tipos novos de objetivo: boas decisões, chão coberto e rio durante a crise', () => {
    const { qs, resources } = setup();
    // 'decisions': conta só as boas decisões depois que a missão começou
    const es = { responseStats: { good: 4 }, activeEvents: new Map(), pendingEvents: [] };
    qs.gameManager.eventSystem = es;
    const q1 = activate(qs, 'story_chain_01_02');
    const decisions = q1.objectives.find(o => o.type === 'decisions');
    assert.strictEqual(qs.checkObjectiveProgress(decisions, q1), 0, 'as 4 de antes não contam');
    es.responseStats.good = 5;
    assert.strictEqual(qs.checkObjectiveProgress(decisions, q1), 1);

    // 'impervious': asfalto conta inteiro, zona leve pela fração coberta, muda não cobre nada
    const city = [
        { config: { roadType: 'paved', runoffImpervious: 1 } },
        { config: { size: 2, runoffImpervious: 0.1 } },
        { config: { size: 1, plantedTree: true } }
    ];
    qs.gameManager.buildingSystem.getAllBuildings = () => city;
    assert.strictEqual(Math.round(qs.getImperviousShare()), Math.round((1 + 0.4) / 6 * 100));
    const q2 = activate(qs, 'story_chain_01_04');
    const sponge = q2.objectives.find(o => o.type === 'impervious');
    assert.strictEqual(qs.checkObjectiveProgress(sponge, q2), sponge.required, 'abaixo do limite = cumprida');
    city.push(...Array.from({ length: 10 }, () => ({ config: { roadType: 'paved', runoffImpervious: 1 } })));
    assert.ok(qs.checkObjectiveProgress(sponge, q2) < sponge.required, 'asfalto demais');

    // 'hold': só vale com a seca da missão ativa
    const q3 = activate(qs, 'challenge_01');
    const hold = q3.objectives.find(o => o.type === 'hold');
    resources.water.river = 10;
    qs.checkObjectiveProgress(hold, q3);
    assert.ok(!hold.violated, 'sem a seca ativa, rio baixo não conta');
    es.activeEvents.set('d', { type: 'drought' });
    qs.checkObjectiveProgress(hold, q3);
    assert.ok(hold.violated, 'com a seca ativa e o rio abaixo de 30%');
});
