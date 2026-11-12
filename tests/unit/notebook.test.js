// Caderno de Campo da Márcia (js/data/fieldNotebook.js + js/systems/FieldNotebook.js): bichos que aparecem,
// voltam e somem com a poluição, sem enxurrada de avisos, e o vaivém do save.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/data/props.js', 'js/data/fieldNotebook.js', 'js/systems/FieldNotebook.js');
const FieldNotebook = g('FieldNotebook');
const NOTEBOOK = g('FIELD_NOTEBOOK');
const PROPS = g('PROP_TYPES');

const at = (id, x = 1, z = 2) => ({ id, x, z });

test('toda espécie do caderno é um prop bioindicador (cleanBelow) com nome, ícone, nota e onde procurar', () => {
    const ids = Object.keys(NOTEBOOK);
    assert.ok(ids.length >= 8);
    for (const id of ids) {
        const e = NOTEBOOK[id];
        assert.ok(PROPS[id], `${id}: não existe em props.js`);
        assert.ok(Array.isArray(PROPS[id].cleanBelow), `${id}: não some com a poluição (cleanBelow)`);
        assert.ok(e.name && e.icon && e.look && e.note.length > 40, `${id}: página incompleta`);
        const range = FieldNotebook.range(id);
        assert.ok(range.gone > range.full, `${id}: faixa de poluição`);
    }
    assert.ok(NOTEBOOK.sapo, 'o sapo é o primeiro a sumir');
});

test('a primeira olhada só registra; depois, espécie nova é descoberta e a que sumiu e voltou é o grande momento', () => {
    const nb = new FieldNotebook();
    let r = nb.observe([at('sapo'), at('garca'), at('arvore_qualquer')], 0);
    assert.strictEqual(r.found.length + r.gone.length, 0, 'o rio do começo já tinha bichos: sem aviso');
    assert.strictEqual(nb.count(), 2);
    assert.strictEqual(nb.status('sapo'), 'here');
    assert.strictEqual(nb.status('tatu'), 'unknown');

    r = nb.observe([at('garca')], 10000); // a poluição subiu: o sapo sumiu
    assert.strictEqual(JSON.stringify(r.gone), JSON.stringify([{ id: 'sapo', notify: true }]));
    assert.strictEqual(nb.status('sapo'), 'gone');

    r = nb.observe([at('garca'), at('sapo', 5, 6), at('tatu', 9, 9)], 400000); // limpou o rio
    const sapo = r.found.find(f => f.id === 'sapo');
    const tatu = r.found.find(f => f.id === 'tatu');
    assert.ok(sapo.returned && !sapo.first && sapo.notify, 'o sapo voltou');
    assert.strictEqual(JSON.stringify(sapo.cell), JSON.stringify({ x: 5, z: 6 }));
    assert.ok(tatu.first && !tatu.returned, 'o tatu é novidade');
    assert.strictEqual(nb.seen.sapo.returns, 1);
});

test('poluição oscilando no limite não vira enxurrada de avisos (um por espécie a cada 3 min de jogo)', () => {
    const nb = new FieldNotebook();
    nb.observe([at('sapo')], 0);
    const gone1 = nb.observe([], 1000).gone[0];
    const back1 = nb.observe([at('sapo')], 2000).found[0];
    const gone2 = nb.observe([], 3000).gone[0];
    assert.strictEqual(gone1.notify, true);
    assert.strictEqual(back1.notify, false, 'voltou logo em seguida: só registra');
    assert.strictEqual(gone2.notify, false);
    const later = nb.observe([at('sapo')], 3000 + FieldNotebook.MOMENT_COOLDOWN_MS);
    assert.strictEqual(later.found[0].notify, true);
});

test('caderno vai e volta do save; depois do load a primeira olhada é silenciosa', () => {
    const nb = new FieldNotebook();
    nb.observe([at('sapo'), at('garca')], 0);
    nb.observe([at('garca')], 5000); // sapo sumiu
    const saved = JSON.parse(JSON.stringify(nb.getSaveData()));
    const loaded = new FieldNotebook();
    loaded.loadData(saved);
    assert.strictEqual(loaded.count(), 2);
    assert.strictEqual(loaded.status('sapo'), 'gone', 'sumido continua sumido até a próxima olhada');
    const r = loaded.observe([at('garca'), at('sapo')], 9000);
    assert.strictEqual(r.found.length, 0, 'olhada depois do load não avisa');
    assert.strictEqual(loaded.status('sapo'), 'here');
    const empty = new FieldNotebook();
    empty.loadData(null);
    assert.strictEqual(empty.count(), 0, 'save antigo sem caderno');
});
