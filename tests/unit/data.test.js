// Integridade dos dados do jogo: referências cruzadas entre prédios, missões e estudos.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/data/buildings.js', 'js/data/missions.js');
const BUILDINGS = g('BUILDING_TYPES');
const MISSIONS = g('MISSIONS');
const ids = new Set(Object.keys(BUILDINGS));


test('todo prédio tem custo, categoria e tamanho válidos', () => {
    for (const [id, b] of Object.entries(BUILDINGS)) {
        assert.ok(b.cost > 0, `${id}.cost`);
        assert.ok(typeof b.name === 'string' && b.name, `${id}.name`);
        assert.ok(typeof b.category === 'string' && b.category, `${id}.category`);
        // o grid só ocupa quadrados: size é o lado, em células
        assert.ok(Number.isInteger(b.size) && b.size >= 1, `${id}.size deve ser inteiro >= 1`);
    }
});

// applyBuildingEffects só lê campos no primeiro nível do prédio. Em 10/2026, 9 prédios verdes/de monitoramento
// guardavam tudo num `effects: {}` aninhado e não faziam nada (nem custavam manutenção).
const EFFECT_FIELDS = ['waterProduction', 'pollutionReduction', 'pollutionGeneration', 'maintenanceCost', 'satisfactionBonus',
    'powerGeneration', 'powerConsumption', 'waterStorage', 'incomeGeneration', 'waterConsumption', 'populationCapacity',
    'population', 'nearbyEfficiencyBonus', 'constructionCostReduction', 'treeStages'];

test('todo prédio tem efeito que a simulação lê (sem `effects` aninhado)', () => {
    for (const [id, b] of Object.entries(BUILDINGS)) {
        assert.ok(!('effects' in b), `${id}: efeitos em 'effects: {}' não são lidos — use campos no primeiro nível`);
        if (b.roadType) continue;
        assert.ok(EFFECT_FIELDS.some(f => b[f]), `${id}: nenhum efeito (${EFFECT_FIELDS.join(', ')})`);
    }
});

test('missões só referenciam prédios e missões que existem', () => {
    for (const [mid, m] of Object.entries(MISSIONS)) {
        const objectives = [...(m.objectives || []), ...(m.dynamicObjectives || [])];
        for (const o of objectives) {
            if (o.type === 'build') {
                assert.ok(ids.has(o.target), `${mid}: objetivo constrói '${o.target}' inexistente`);
            }
        }
        // rewards.unlock não desbloqueava nada (quem libera é o estudo): virou recommendStudy
        assert.ok(!m.rewards?.unlock, `${mid}: use rewards.recommendStudy, não rewards.unlock`);
        for (const u of [...(m.rewards?.recommendStudy || []), ...(m.rewards?.performanceUnlocks || [])]) {
            assert.ok(ids.has(u), `${mid}: recomenda '${u}' inexistente`);
        }
        if (m.startEvent) {
            assert.ok(typeof m.startEvent.type === 'string' && m.startEvent.durationMs > 0, `${mid}: startEvent { type, durationMs }`);
        }
        for (const p of m.prerequisites || []) {
            assert.ok(MISSIONS[p], `${mid}: pré-requisito '${p}' inexistente`);
        }
        const next = m.consequences?.failure?.unlockMission;
        if (next) {
            assert.ok(MISSIONS[next], `${mid}: unlockMission '${next}' inexistente`);
        }
    }
});

test('dados não têm funções (structuredClone no registro quebraria)', () => {
    const fns = [];
    JSON.stringify({ BUILDINGS, MISSIONS }, (k, v) => (typeof v === 'function' && fns.push(k), v));
    assert.deepStrictEqual(fns, []);
});

test('estudos apontam para prédios existentes e quiz tem ids sequenciais', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/building-studies.json'), 'utf8'));
    const studies = Array.isArray(raw) ? raw : Object.values(raw.studies || raw);
    assert.ok(studies.length > 0);
    for (const s of studies) {
        assert.ok(ids.has(s.buildingId), `estudo de '${s.buildingId}' sem prédio`);
        const questions = s.quiz?.questions || s.quiz || [];
        questions.forEach((q, i) => assert.strictEqual(q.id, i + 1, `${s.buildingId}: quiz[${i}].id`));
    }
});

// Tipos/alvos que QuestSystem.checkObjectiveProgress sabe medir. Objetivo fora disso nunca progride
// (já existiram missões com 'observation', 'management', 'research'... impossíveis de concluir).
const RESOURCE_TARGETS = ['water', 'pollution', 'population', 'satisfaction', 'budget', 'aquifer'];
const SUPPORTED = {
    build: o => ids.has(o.target),
    resource: o => RESOURCE_TARGETS.includes(o.target),
    sustained: o => RESOURCE_TARGETS.includes(o.target) && typeof o.threshold === 'number',
    survival: o => o.target === 'time' && o.required > 0,
    avoid: o => ['water_shortage'].includes(o.target)
};

test('todo objetivo de missão é de um tipo que o motor mede', () => {
    for (const [mid, m] of Object.entries(MISSIONS)) {
        for (const o of [...(m.objectives || []), ...(m.dynamicObjectives || [])]) {
            const check = SUPPORTED[o.type];
            assert.ok(check, `${mid}/${o.id}: tipo '${o.type}' não implementado`);
            assert.ok(check(o), `${mid}/${o.id}: alvo '${o.target}' inválido para '${o.type}'`);
        }
    }
});
