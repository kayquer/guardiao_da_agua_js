// Bacias do modo loja (js/data/basinMaps.js + js/systems/Basin.js): todas jogáveis como o mapa da pesquisa —
// área inicial construível, encostas sem ficar soltas, rio cruzando o mapa e a margem sempre acima da água.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const FILES = ['js/utils/GameUtils.js', 'js/data/riverMap.js', 'js/data/basinMaps.js', 'js/systems/Basin.js', 'js/core/GridManager.js'];

function gridFor(id) {
    const g = load(...FILES);
    g(`Basin.select('${id}')`);
    const GridManager = g('GridManager');
    const gm = Object.create(GridManager.prototype);
    Object.assign(gm, { gridSize: 40, occupationGrid: [], elevationGrid: [], terrainGrid: [] });
    gm.initializeGrid();
    return { gm, g };
}

const ids = Object.keys(load('js/data/riverMap.js', 'js/data/basinMaps.js')('BASIN_MAPS'));

test('bacias: o mapa da pesquisa (vale) é o RIVER_MAP de sempre e é o padrão', () => {
    const { g } = gridFor('vale');
    assert.strictEqual(g('DEFAULT_BASIN'), 'vale');
    assert.strictEqual(g('Basin.current().river === RIVER_MAP'), true);
    assert.strictEqual(g("Basin.select('nao_existe')"), 'vale');
    assert.ok(ids.length >= 3, 'pelo menos 2 bacias além do vale');
});

for (const id of ids) {
    test(`bacia ${id}: área inicial construível, encostas agrupadas, rio cruzando o mapa`, () => {
        const { gm, g } = gridFor(id);
        const def = g(`BASIN_MAPS.${id}`);
        assert.ok(def.name && def.icon && def.description.length > 30, `${id}: nome, ícone e descrição`);
        assert.ok(gm.startArea.ratio >= 0.8, `${id}: área inicial só ${gm.startArea.ratio}`);
        let hills = 0, water = 0;
        const edges = new Set();
        for (let x = 0; x < 40; x++) {
            for (let z = 0; z < 40; z++) {
                const t = gm.terrainGrid[x][z];
                if (t === 'water') {
                    water++;
                    if (x === 0) edges.add('O'); if (x === 39) edges.add('L'); if (z === 0) edges.add('N'); if (z === 39) edges.add('S');
                }
                if (t !== 'hill') continue;
                hills++;
                const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => gm.terrainGrid[x + dx]?.[z + dz] === 'hill');
                assert.ok(neighbours.length > 0, `${id}: encosta solta em ${x},${z}`);
            }
        }
        assert.ok(hills / 1600 < 0.2, `${id}: encostas demais (${hills})`);
        assert.ok(water > 40, `${id}: rio pequeno demais (${water} células)`);
        assert.ok(edges.size >= 2, `${id}: o rio precisa cruzar o mapa (bordas: ${[...edges]})`);
        // margem sempre acima da água (como o mapa da pesquisa, tests/unit/world.test.js)
        for (let x = 0; x < 40; x++) {
            for (let z = 0; z < 40; z++) {
                if (gm.terrainGrid[x][z] !== 'water') continue;
                const level = gm.getWaterLevel(x, z);
                for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx, nz = z + dz;
                    if (nx < 0 || nz < 0 || nx >= 40 || nz >= 40 || gm.terrainGrid[nx][nz] === 'water') continue;
                    assert.ok(gm.getTerrainBlockHeight(nx, nz) - level >= 0.1 - 1e-9, `${id}: margem ${nx},${nz} rente à água`);
                }
            }
        }
    });
}

test('bacias: a serra tem mais encostas que o litoral; o sertão começa com menos água e seca mais', () => {
    const count = id => { const { gm } = gridFor(id); return gm.terrainGrid.flat().filter(t => t === 'hill').length; };
    assert.ok(count('serra') > count('vale') && count('vale') > count('litoral'), 'serra mais acidentada, litoral mais plano');
    const { g } = gridFor('sertao');
    assert.ok(g('Basin.current().start.aquifer') < 100);
    assert.ok(g("Basin.eventWeight('drought')") > 1 && g("Basin.eventWeight('flood')") < 1);
    assert.strictEqual(gridFor('vale').g("Basin.eventWeight('drought')"), 1, 'vale: sem peso extra');
});
