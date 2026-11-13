// Carrossel de bacias do modo loja (js/ui/BasinPicker.js + js/data/basinIcons.js): a parte sem DOM —
// ordem (vale, o mapa clássico, primeiro), deslocamento circular, traços tirados dos dados e ícones sem emoji.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/data/riverMap.js', 'js/data/basinMaps.js', 'js/systems/Basin.js', 'js/data/basinIcons.js', 'js/ui/BasinPicker.js');
const ids = g('Object.keys(BASIN_MAPS)');
const EMOJI = /\p{Extended_Pictographic}/u;

test('carrossel: o vale (mapa clássico) vem primeiro e todas as bacias aparecem', () => {
    const order = g('BasinPicker.orderedIds()');
    assert.strictEqual(order[0], 'vale');
    assert.deepStrictEqual([...order].sort(), [...ids].sort());
});

test('carrossel: deslocamento circular ao foco (4 cartões: -2..1, o foco é 0)', () => {
    const off = (i, focus, n) => g(`BasinPicker.circularOffset(${i}, ${focus}, ${n})`);
    assert.deepStrictEqual([0, 1, 2, 3].map(i => off(i, 0, 4)), [0, 1, -2, -1]);
    assert.deepStrictEqual([0, 1, 2, 3].map(i => off(i, 3, 4)), [1, -2, -1, 0]);
    assert.strictEqual(off(0, 0, 1), 0);
});

test('carrossel: cada bacia tem cartão, ícone SVG e 4 traços tirados dos dados, sem emoji', () => {
    for (const id of ids) {
        const traits = JSON.parse(g(`JSON.stringify(BasinPicker.traitsFor('${id}'))`));
        assert.deepStrictEqual(traits.map(t => t.key), ['relief', 'climate', 'water', 'challenge'], id);
        traits.forEach(t => {
            assert.ok(t.label && t.value, `${id}.${t.key}: rótulo e valor`);
            assert.ok(!EMOJI.test(t.value + t.label), `${id}.${t.key}: sem emoji`);
            assert.ok(g(`!!BASIN_TRAIT_ICONS['${t.icon}']`), `${id}.${t.key}: ícone ${t.icon} existe`);
        });
        assert.ok(g(`BASIN_CARDS['${id}']?.challenge`), `${id}: desafio em BASIN_CARDS`);
        assert.match(g(`BASIN_ICONS['${id}']`), /^<svg[\s\S]*<\/svg>$/, `${id}: ícone SVG`);
    }
    const icons = g('JSON.stringify([BASIN_ICONS, BASIN_TRAIT_ICONS])');
    assert.ok(!EMOJI.test(icons), 'ícones sem emoji');
});

test('carrossel: os traços seguem os dados da bacia (sertão seco, litoral alaga, vale equilibrado)', () => {
    const trait = (id, key) => g(`BasinPicker.traitsFor('${id}').find(t => t.key === '${key}')`);
    assert.match(trait('sertao', 'water').value, /60%/);
    assert.strictEqual(trait('sertao', 'water').level, 60);
    assert.match(trait('sertao', 'climate').value, /secas/);
    assert.strictEqual(trait('sertao', 'climate').icon, 'drought');
    assert.match(trait('litoral', 'relief').value, /Plano/);
    assert.match(trait('litoral', 'climate').value, /enchentes/);
    assert.match(trait('serra', 'relief').value, /encostas.*encaixado/);
    assert.strictEqual(trait('vale', 'climate').icon, 'balance');
    assert.match(trait('vale', 'water').value, /cheios/);
});

test('carrossel: ícone do aquífero com id único e água na altura do nível', () => {
    const full = g("BasinPicker.traitIcon('aquifer', 100, 'a')");
    const half = g("BasinPicker.traitIcon('aquifer', 60, 'b')");
    assert.ok(!/\{uid\}|\{lvl\}/.test(full + half));
    assert.match(full, /id="bp-drop-a"/);
    assert.match(half, /url\(#bp-drop-b\)/);
    const level = svg => Number(/M-6 ([\d.]+)/.exec(svg)[1]);
    assert.ok(level(full) < level(half), 'cheio = água mais alta no desenho');
});
