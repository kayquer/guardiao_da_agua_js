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

// Problemas que já existiam quando estes testes foram escritos (10/2026). Decisão de conteúdo
// pendente: criar os prédios ou trocar os alvos. Remova daqui ao corrigir; não acrescente.
const KNOWN_MISSING_BUILDINGS = new Set([
    'spring_protection', 'riparian_forest', 'water_treatment_plant', 'buffer_zone',
    'livestock_waste_management', 'repair_station', 'education_center', 'water_recycling_plant',
    'isolation_station', 'distribution_point',
    // unlocks
    'advanced_water_treatment', 'sustainable_agriculture', 'advanced_erosion_control',
    'advanced_green_infrastructure', 'urban_ecology', 'master_water_guardian', 'advanced_monitoring',
    'advanced_filtration', 'smart_meters', 'leak_detection_ai', 'contamination_detector',
    'emergency_protocol', 'rapid_response_team', 'advanced_treatment'
]);
const KNOWN_MISSING_MISSIONS = new Set(['recovery_contamination']);

test('todo prédio tem custo, categoria e tamanho válidos', () => {
    for (const [id, b] of Object.entries(BUILDINGS)) {
        assert.ok(b.cost > 0, `${id}.cost`);
        assert.ok(typeof b.name === 'string' && b.name, `${id}.name`);
        assert.ok(typeof b.category === 'string' && b.category, `${id}.category`);
        // o grid só ocupa quadrados: size é o lado, em células
        assert.ok(Number.isInteger(b.size) && b.size >= 1, `${id}.size deve ser inteiro >= 1`);
    }
});

test('missões só referenciam prédios e missões que existem', () => {
    for (const [mid, m] of Object.entries(MISSIONS)) {
        const objectives = [...(m.objectives || []), ...(m.dynamicObjectives || [])];
        for (const o of objectives) {
            if (o.type === 'build' && !KNOWN_MISSING_BUILDINGS.has(o.target)) {
                assert.ok(ids.has(o.target), `${mid}: objetivo constrói '${o.target}' inexistente`);
            }
        }
        for (const u of [...(m.rewards?.unlock || []), ...(m.rewards?.performanceUnlocks || [])]) {
            if (!KNOWN_MISSING_BUILDINGS.has(u)) assert.ok(ids.has(u), `${mid}: desbloqueia '${u}' inexistente`);
        }
        for (const p of m.prerequisites || []) {
            assert.ok(MISSIONS[p], `${mid}: pré-requisito '${p}' inexistente`);
        }
        const next = m.consequences?.failure?.unlockMission;
        if (next && !KNOWN_MISSING_MISSIONS.has(next)) {
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
