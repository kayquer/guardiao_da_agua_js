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

test('bacias: cada uma tem cara própria (Basin.palette) e o vale fica com as cores de sempre', () => {
    const { gm, g } = gridFor('vale');
    const base = JSON.parse(JSON.stringify(g('BASIN_PALETTE')));
    const vale = JSON.parse(JSON.stringify(g("Basin.palette('vale')")));
    assert.deepStrictEqual(vale, base, 'vale = paleta-base');
    // A tabela de GridManager (usada sem Basin, como em world.test.js) não pode se separar da paleta-base
    const bare = Object.create(g('GridManager').prototype);
    for (const key of ['grassland', 'floodplain', 'app', 'hill', 'hillSide']) {
        const c = bare.getMinecraftTerrainColor(key);
        assert.deepStrictEqual([c.r, c.g, c.b], base[key], `GridManager.${key} ≠ BASIN_PALETTE`);
    }
    assert.deepStrictEqual(JSON.parse(JSON.stringify(bare.getWaterColors())), base.water);
    // As cores de sempre do vale (mapa da pesquisa): planalto, planície, APP e água
    assert.deepStrictEqual([base.grassland, base.floodplain, base.app], [[91, 153, 76], [62, 112, 74], [74, 132, 66]]);
    assert.deepStrictEqual(base.water, { shallow: [0.25, 0.56, 1.0], deep: [0.15, 0.45, 0.8] });
    assert.strictEqual(base.bank, null, 'vale sem barranco pintado');
    assert.strictEqual(JSON.stringify(gm.palette), JSON.stringify(vale), 'GridManager lê a paleta da bacia');
    // Bacias diferentes = planalto e água diferentes (nítido: soma das diferenças RGB > 40)
    const diff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0);
    const palettes = ids.map(id => [id, JSON.parse(JSON.stringify(g(`Basin.palette('${id}')`)))]);
    for (let i = 0; i < palettes.length; i++) {
        for (let j = i + 1; j < palettes.length; j++) {
            const [a, pa] = palettes[i], [b, pb] = palettes[j];
            assert.ok(diff(pa.grassland, pb.grassland) > 40, `${a} × ${b}: planalto parecido demais`);
            assert.ok(diff(pa.water.shallow.map(v => v * 255), pb.water.shallow.map(v => v * 255)) > 40, `${a} × ${b}: água parecida demais`);
        }
    }
    assert.strictEqual(g("Basin.cssColor([91, 153, 76])"), 'rgb(91, 153, 76)');
    assert.strictEqual(g("Basin.cssColor([0.25, 0.56, 1])"), 'rgb(64, 143, 255)');
});

for (const id of ids) {
    test(`bacia ${id}: encosta de terra/rocha (nunca cinza-concreto) e nenhuma cor escura demais`, () => {
        const { gm } = gridFor(id);
        gm.cellSize = 2;
        const p = gm.palette;
        for (const key of ['hill', 'hillSide']) {
            const [r, g, b] = p[key];
            assert.ok(r > b + 12, `${id}: ${key} [${p[key]}] precisa puxar para terra (vermelho > azul)`);
        }
        const geo = gm.buildTerrainGeometry(0, 0, 40, 40);
        for (let i = 0; i < geo.colors.length; i += 4) {
            assert.ok(Math.max(geo.colors[i], geo.colors[i + 1], geo.colors[i + 2]) > 0.3, `${id}: cor de vértice escura`);
        }
    });

    test(`bacia ${id}: o jogo novo enquadra a área inicial e o rio mais perto`, () => {
        const { gm } = gridFor(id);
        gm.cellSize = 2;
        const f = gm.getStartFraming();
        assert.ok(f && f.water, `${id}: achou água`);
        assert.strictEqual(gm.terrainGrid[f.water.x][f.water.z], 'water');
        assert.ok(f.radius >= 25 && f.radius <= 46, `${id}: zoom ${f.radius}`);
        // A mira fica entre a área inicial e a água (os dois a no máximo ~0,62 × raio dela)
        const world = c => (c + 0.5) * 2 - 40;
        const toStart = Math.hypot(world(gm.startArea.x - 0.5) - f.x, world(gm.startArea.z - 0.5) - f.z);
        const toWater = Math.hypot(world(f.water.x) - f.x, world(f.water.z) - f.z);
        assert.ok(Math.abs(toStart - toWater) < 1e-6, `${id}: mira no meio`);
        assert.ok(toWater + 8 <= f.radius * 0.62 + 1e-6, `${id}: rio fora do quadro`);
    });
}
