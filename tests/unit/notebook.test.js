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

test('toda espécie do caderno é um prop bioindicador (cleanBelow) com ficha completa e que se mexe no mapa', () => {
    const ids = Object.keys(NOTEBOOK);
    const STATUS = g('FIELD_NOTEBOOK_STATUS');
    assert.ok(ids.length >= 25, 'caderno com os bichos do Kit Fauna Ameaçada');
    for (const id of ids) {
        const e = NOTEBOOK[id];
        assert.ok(PROPS[id], `${id}: não existe em props.js`);
        assert.ok(Array.isArray(PROPS[id].cleanBelow), `${id}: não some com a poluição (cleanBelow)`);
        assert.ok(e.name && e.icon && e.look && e.note.length > 40, `${id}: página incompleta`);
        assert.ok(e.sci && e.size && e.habitat && e.help, `${id}: ficha sem nome científico, tamanho, onde vive ou como ajudar`);
        assert.ok(STATUS[e.status], `${id}: status ${e.status}`);
        assert.ok(PROPS[id].motion, `${id}: bicho do caderno se mexe (e por isso é clicável)`);
        assert.strictEqual(!!e.kit, !!PROPS[id].kit, `${id}: ficha do Kit Fauna = prop do Kit Fauna`);
        const range = FieldNotebook.range(id);
        assert.ok(range.gone > range.full, `${id}: faixa de poluição`);
    }
    assert.ok(NOTEBOOK.sapo, 'o sapo é o primeiro a sumir');
});

test('a primeira olhada só registra; depois, espécie nova é descoberta e a que sumiu e voltou é o grande momento', () => {
    const nb = new FieldNotebook();
    let r = nb.observe([at('sapo'), at('garca'), at('arvore_qualquer')], 0);
    assert.strictEqual(r.found.length + r.gone.length, 0, 'o rio do começo já tinha bichos: sem aviso');
    assert.strictEqual(nb.count(), 0, 'avistar não registra: só o toque no bicho');
    assert.strictEqual(nb.status('sapo'), 'unknown', 'página apagada até tocar');
    assert.ok(nb.isPresent('sapo'));
    assert.strictEqual(nb.register('sapo', 50), true, 'primeiro toque = página nova');
    assert.strictEqual(nb.register('sapo', 60), false, 'segundo toque: já estava');
    assert.strictEqual(nb.register('arvore_qualquer', 60), false, 'só espécies do caderno');
    assert.strictEqual(nb.count(), 1);
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
    nb.register('sapo', 10);
    nb.register('garca', 20);
    nb.observe([at('garca')], 5000); // sapo sumiu
    const saved = JSON.parse(JSON.stringify(nb.getSaveData()));
    const loaded = new FieldNotebook();
    loaded.loadData(saved);
    assert.strictEqual(loaded.count(), 2);
    assert.ok(loaded.isRegistered('sapo'));
    assert.strictEqual(loaded.status('sapo'), 'gone', 'sumido continua sumido até a próxima olhada');
    const r = loaded.observe([at('garca'), at('sapo')], 9000);
    assert.strictEqual(r.found.length, 0, 'olhada depois do load não avisa');
    assert.strictEqual(loaded.status('sapo'), 'here');
    const empty = new FieldNotebook();
    empty.loadData(null);
    assert.strictEqual(empty.count(), 0, 'save antigo sem caderno');
    const old = new FieldNotebook();
    old.loadData({ seen: { sapo: { first: 0, returns: 0 } } });
    assert.ok(old.isRegistered('sapo'), 'save de antes do toque: o que já tinha visto continua no caderno');
});

test('ficha: a fonte segue a situação (ameaçada = Livro Vermelho), e toda espécie tem figura', () => {
    const fs = require('fs');
    const path = require('path');
    for (const [id, e] of Object.entries(NOTEBOOK)) {
        assert.strictEqual(FieldNotebook.isThreatened(id), e.status !== 'LC', `${id}: ${e.status}`);
        assert.ok(fs.existsSync(path.join(__dirname, '..', '..', 'assets', 'images', 'fauna', `${id}.webp`)), `${id}: sem figura`);
    }
    assert.strictEqual(FieldNotebook.isThreatened('tamandua'), true, 'tamanduá-bandeira é Vulnerável (não "fora da lista")');
});

test('cada bacia tem a sua fauna, e os ameaçados só chegam com a bacia recuperada', () => {
    const vale = FieldNotebook.ids('vale');
    const sertao = FieldNotebook.ids('sertao');
    const litoral = FieldNotebook.ids('litoral');
    assert.ok(sertao.includes('arara_azul_de_lear') && !vale.includes('arara_azul_de_lear'));
    assert.ok(litoral.includes('guaiamum') && !sertao.includes('guaiamum'));
    // 3ª auditoria: o vale é um rio do interior da bacia do Paraná (com várzea); o litoral é a Mata Atlântica do mar
    for (const id of ['vitoria_regia', 'ariranha', 'cervo_pantanal', 'piracanjuba']) assert.ok(!litoral.includes(id), `${id} não é do litoral`);
    assert.ok(!vale.includes('surubim') && FieldNotebook.ids('serra').includes('surubim'), 'surubim-do-iguaçu só no rio encaixado do planalto');
    assert.ok(!PROPS.mandacaru.basins || !PROPS.mandacaru.basins.includes('vale'), 'mandacaru só na caatinga');
    for (const id of Object.keys(NOTEBOOK)) {
        if (NOTEBOOK[id].status !== 'LC') assert.ok(PROPS[id].ecology > 0, `${id}: ameaçado sem progressão (ecology)`);
    }
    const Planner = load('js/data/props.js', 'js/systems/props/PropPlanner.js')('PropPlanner');
    const state = { level: 0, pollution: 5, quality: 'high', basin: 'litoral' };
    assert.strictEqual(Planner.intensity(PROPS.guaiamum, { ...state, ecology: 0 }, {}).k, 0, 'sem recuperação: não chega');
    assert.ok(Planner.intensity(PROPS.guaiamum, { ...state, ecology: 1 }, {}).k > 0, 'bacia recuperada: chega');
    assert.strictEqual(Planner.intensity(PROPS.guaiamum, { ...state, basin: 'sertao', ecology: 1 }, {}).k, 0, 'outro bioma');
});
