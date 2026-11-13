// Estudos (data/building-studies.json): toda usina visível tem estudo, e a leitura em duas camadas —
// `content` curto, para criança (sem números), e `more` opcional, completo (números, unidades e fontes).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/data/buildings.js');
const BUILDINGS = g('BUILDING_TYPES');
const FLAGS = g('FEATURE_FLAGS');
const STUDIES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/building-studies.json'), 'utf8'));

// Estudos que precisam da camada completa em todas as páginas: toda a energia + água e saneamento centrais
const WATER_CORE = ['water_pump', 'water_well', 'water_treatment_plant', 'treatment_plant', 'water_tank', 'rain_garden', 'linear_park'];

test('toda usina visível tem estudo (sem estudo o prédio sai liberado sem leitura no modo pesquisa)', () => {
    const power = Object.entries(BUILDINGS).filter(([id, b]) => b.category === 'power' && FLAGS.isBuildingVisible(id));
    assert.ok(power.length >= 15, 'linha de energia');
    for (const [id] of power) assert.ok(STUDIES[id], `${id} sem estudo`);
});

test('camada curta: texto sem números, prova curta (até 2 perguntas, 50%) e imagens que existem', () => {
    for (const [id, s] of Object.entries(STUDIES)) {
        assert.ok(s.quiz.questions.length <= 2 && s.quiz.passingScore === 50, `${id}: prova curta, 50%`);
        s.quiz.questions.forEach((q, i) => assert.ok(q.correctAnswer >= 0 && q.correctAnswer < q.options.length, `${id}: resposta ${i + 1}`));
        for (const p of s.pages) {
            assert.ok(!/\d/.test(p.content), `${id} p.${p.pageNumber}: texto curto sem números`);
            if (p.image) assert.ok(fs.existsSync(path.join(ROOT, p.image)), `${id}: falta ${p.image}`);
        }
    }
});

test('camada completa (more): energia e água/saneamento centrais têm em todas as páginas, com fonte', () => {
    const ids = [...Object.values(STUDIES).filter(s => BUILDINGS[s.buildingId]?.category === 'power').map(s => s.buildingId), ...WATER_CORE];
    for (const id of ids) {
        for (const p of STUDIES[id].pages) {
            assert.ok(typeof p.more === 'string' && p.more.length > 80, `${id} p.${p.pageNumber}: sem camada completa`);
            assert.match(p.more, /class="more-src">Fontes?: /, `${id} p.${p.pageNumber}: camada completa sem fonte`);
        }
    }
    // HTML simples e seguro: sem script, sem atributo de evento, sem imagem externa
    for (const [id, s] of Object.entries(STUDIES)) {
        for (const p of s.pages.filter(p => p.more)) {
            assert.ok(!/<script|\son\w+=|https?:/i.test(p.more), `${id} p.${p.pageNumber}: more com HTML proibido`);
        }
    }
});

test('microgeração solar segue as faixas da ANEEL (Lei 14.300/2022) na camada completa', () => {
    const more = STUDIES.solar_micro.pages.map(p => p.more).join(' ');
    assert.match(more, /75 kW/);
    assert.match(more, /3 MW/);
    assert.ok(STUDIES.solar_micro.sources.some(s => /14\.300/.test(s.label)));
});
