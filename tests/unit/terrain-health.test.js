// Saúde do lugar no painel de terreno (js/systems/TerrainHealth.js + js/data/terrainHealth.js)
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/data/terrainHealth.js', 'js/data/fieldNotebook.js', 'js/systems/TerrainHealth.js');
const evaluate = snap => JSON.parse(JSON.stringify(g(`TerrainHealth.evaluate(${JSON.stringify(snap)})`)));
const byId = (health, id) => health.indicators.find(ind => ind.id === id);

test('chão: os 5 indicadores, cada um com valor 0-100, nível e palavra', () => {
    const h = evaluate({ zone: 'grassland' });
    assert.strictEqual(h.kind, 'soil');
    assert.deepStrictEqual(h.indicators.map(i => i.id), ['infiltration', 'moisture', 'cover', 'pollution', 'erosion']);
    h.indicators.forEach(ind => {
        assert.ok(ind.value >= 0 && ind.value <= 100, ind.id);
        assert.ok(['good', 'ok', 'bad'].includes(ind.level), ind.id);
        assert.ok(ind.word && ind.levelWord && ind.label && ind.why, ind.id);
    });
    assert.ok(['good', 'ok', 'bad'].includes(h.level));
    assert.ok(['Bom', 'Atenção', 'Ruim'].includes(h.levelWord));
});

test('rio: oxigênio, turbidez, nível, sombra e vida aquática', () => {
    const h = evaluate({ zone: 'water', riparianCover: 0.6 });
    assert.strictEqual(h.kind, 'water');
    assert.deepStrictEqual(h.indicators.map(i => i.id), ['oxygen', 'turbidity', 'river', 'shade', 'life']);
    assert.strictEqual(byId(h, 'river').value, 100);
});

test('mais poluição: o chão fica mais poluído e o rio perde oxigênio e vida (e a nota cai)', () => {
    const cleanSoil = evaluate({ zone: 'grassland', cityPollution: 5 });
    const dirtySoil = evaluate({ zone: 'grassland', cityPollution: 95, polluters: 30 });
    assert.ok(byId(dirtySoil, 'pollution').value > byId(cleanSoil, 'pollution').value);
    assert.strictEqual(byId(dirtySoil, 'pollution').level, 'bad');
    assert.ok(dirtySoil.score < cleanSoil.score);
    assert.match(byId(dirtySoil, 'pollution').why, /Atrapalha: .*poluição da cidade/);

    const cleanRiver = evaluate({ zone: 'water', cityPollution: 5, riparianCover: 0.6 });
    const dirtyRiver = evaluate({ zone: 'water', cityPollution: 95, sewage: 10, riparianCover: 0.6 });
    assert.ok(byId(dirtyRiver, 'oxygen').value < byId(cleanRiver, 'oxygen').value);
    assert.ok(byId(dirtyRiver, 'life').value < byId(cleanRiver, 'life').value);
    assert.strictEqual(byId(dirtyRiver, 'oxygen').level, 'bad');
    assert.match(byId(dirtyRiver, 'oxygen').why, /esgoto sem tratar/);
    assert.ok(dirtyRiver.score < cleanRiver.score);
});

test('ETE e filtros devolvem oxigênio; mata ciliar deixa a água clara e fresca', () => {
    const base = { zone: 'water', cityPollution: 40, sewage: 4 };
    assert.ok(byId(evaluate({ ...base, treatment: 2 }), 'oxygen').value > byId(evaluate(base), 'oxygen').value);
    const bare = evaluate({ ...base, riparianCover: 0, bareBanks: 1 });
    const forest = evaluate({ ...base, riparianCover: 1, bareBanks: 0 });
    assert.ok(byId(forest, 'turbidity').value < byId(bare, 'turbidity').value);
    assert.ok(byId(forest, 'shade').value > byId(bare, 'shade').value);
    assert.strictEqual(byId(bare, 'shade').word, 'Sem sombra');
});

test('chuva forte e rua de terra deixam o rio barrento', () => {
    const calm = evaluate({ zone: 'water', riparianCover: 0.5, bareBanks: 0.5 });
    const storm = evaluate({ zone: 'water', riparianCover: 0.5, bareBanks: 0.5, rain: 1, storm: true, dirtRoads: 3 });
    assert.ok(byId(storm, 'turbidity').value > byId(calm, 'turbidity').value);
    assert.match(byId(storm, 'turbidity').why, /chuva forte|rua de terra/);
});

test('encosta sem plantas erode e infiltra menos; árvores seguram a terra', () => {
    const bareHill = evaluate({ zone: 'hill', slope: 1, cover: 0, rain: 0.6 });
    const forestHill = evaluate({ zone: 'hill', slope: 1, cover: 0.8, treeHere: true, rain: 0.6 });
    const flat = evaluate({ zone: 'grassland', slope: 0, cover: 0.3 });
    assert.strictEqual(byId(bareHill, 'erosion').level, 'bad');
    assert.ok(byId(forestHill, 'erosion').value < byId(bareHill, 'erosion').value);
    assert.ok(byId(bareHill, 'infiltration').value < byId(flat, 'infiltration').value);
    assert.ok(byId(forestHill, 'cover').value > byId(bareHill, 'cover').value);
});

test('asfalto e telhados em volta tiram a infiltração; jardim de chuva devolve', () => {
    const open = evaluate({ zone: 'grassland', impervious: 0 });
    const paved = evaluate({ zone: 'grassland', impervious: 0.9 });
    const garden = evaluate({ zone: 'grassland', impervious: 0.9, absorbers: 2 });
    assert.ok(byId(paved, 'infiltration').value < byId(open, 'infiltration').value);
    assert.strictEqual(byId(paved, 'infiltration').level, 'bad');
    assert.match(byId(paved, 'infiltration').why, /asfalto e telhados/);
    assert.ok(byId(garden, 'infiltration').value > byId(paved, 'infiltration').value);
});

test('umidade: seca resseca, perto da água e com chuva fica úmido, planície alagada encharca', () => {
    const dry = evaluate({ zone: 'grassland', waterDistance: 10, drought: true });
    const wet = evaluate({ zone: 'grassland', waterDistance: 1, rain: 0.6 });
    const soaked = evaluate({ zone: 'floodplain', waterDistance: 1, rain: 1 });
    assert.strictEqual(byId(dry, 'moisture').word, 'Seco');
    assert.strictEqual(byId(dry, 'moisture').level, 'bad');
    assert.ok(byId(wet, 'moisture').value > byId(dry, 'moisture').value);
    assert.strictEqual(byId(soaked, 'moisture').word, 'Encharcado');
    assert.notStrictEqual(byId(soaked, 'moisture').level, 'good');
});

test('vida aquática conta os bichos por perto', () => {
    const species = [{ id: 'sapo', name: 'Sapo-cururu', icon: '🐸', known: true }];
    const without = evaluate({ zone: 'water', riparianCover: 0.5 });
    const withFrog = evaluate({ zone: 'water', riparianCover: 0.5, species });
    assert.ok(byId(withFrog, 'life').value > byId(without, 'life').value);
    assert.strictEqual(withFrog.species.length, 1);
});

test('dados: todo indicador tem rótulo, palavras em ordem e peso; todo fator tem nome', () => {
    const data = JSON.parse(JSON.stringify(g('TERRAIN_HEALTH')));
    for (const kind of ['soil', 'water']) {
        for (const [id, rule] of Object.entries(data[kind])) {
            assert.ok(rule.label && rule.icon && rule.moves, `${kind}.${id}`);
            assert.ok(rule.words.length >= 2 && rule.words[0][0] === 0, `${kind}.${id} words`);
            rule.words.forEach((w, i) => i && assert.ok(w[0] > rule.words[i - 1][0], `${kind}.${id} ordem`));
            assert.ok(Number.isFinite(data.WEIGHTS[id]), `${id} sem peso`);
        }
    }
    // Todo fator que aparece num "Ajuda/Atrapalha" tem texto (senão a linha sairia vazia)
    const seen = new Set();
    const variants = [
        { zone: 'hill', slope: 1, impervious: 0.8, absorbers: 3, rain: 1, drought: true, deforestation: 1, polluters: 50, cityPollution: 90, dirtRoads: 4 },
        { zone: 'app', cover: 0.9, treeHere: true, waterDistance: 1, riparianCell: true },
        { zone: 'floodplain', waterDistance: 1, rain: 1 },
        { zone: 'water', sewage: 10, cityPollution: 90, polluters: 50, treatment: 2, riparianCover: 0, bareBanks: 1, rain: 1, storm: true, river: 10, hot: true, drought: true, dirtRoads: 4 },
        { zone: 'water', riparianCover: 1, river: 100, species: [{ id: 'sapo', name: 'Sapo', icon: '🐸', known: true }] }
    ];
    variants.forEach(v => evaluate(v).indicators.forEach(ind => [...ind.helps, ...ind.hurts].forEach(l => seen.add(l))));
    assert.ok(seen.size > 10);
    seen.forEach(label => assert.ok(label && !/undefined/.test(label), label));
});

test('collect lê o jogo: árvores, ruas, poluidores, esgoto e bichos perto', () => {
    const gameManager = g(`(() => {
        const trees = new Map([['5,6', {}], ['6,5', {}], ['4,4', {}]]);
        const terrain = (x, z) => (x === 5 && z >= 9 ? 'water' : 'grassland');
        const buildings = new Map([
            ['r', { type: 'dirt_road', gridX: 5, gridZ: 7, config: { roadType: 'dirt', size: 1, runoffImpervious: 0.6 } }],
            ['f', { type: 'factory', gridX: 7, gridZ: 5, config: { size: 1, pollutionGeneration: 20 } }],
            ['e', { type: 'treatment_plant', gridX: 20, gridZ: 20, config: { size: 2, pollutionReduction: 3 } }]
        ]);
        return {
            gridManager: { gridSize: 40, getTerrainType: terrain, getTerrainZone: terrain,
                getTerrainBlockHeight: () => 0.3, isRiverZone: () => false },
            treeSystem: { trees, initialCount: 6 },
            buildingSystem: { buildings },
            resourceManager: { resources: { pollution: { current: 42 } }, getPollutionBalance: () => ({ sewage: 5 }), getRiverLevel: () => 70 },
            eventSystem: { hasActiveEventOfType: t => t === 'drought' },
            weatherEffects: { profile: { rain: 0.3, hot: true } },
            propSystem: { placements: [{ id: 'sapo', x: 5, z: 9 }, { id: 'sapo', x: 6, z: 9 }, { id: 'nao_existe', x: 5, z: 5 }] },
            fieldNotebook: { isRegistered: id => id === 'sapo' }
        };
    })()`);
    g('this').gm = gameManager;
    const snap = JSON.parse(JSON.stringify(g('TerrainHealth.collect(gm, 5, 5)')));
    assert.strictEqual(snap.zone, 'grassland');
    assert.strictEqual(snap.waterDistance, 4);
    assert.strictEqual(snap.treeHere, false);
    assert.ok(snap.cover > 0 && snap.cover < 1);
    assert.ok(snap.impervious > 0);
    assert.strictEqual(snap.dirtRoads, 1);
    assert.strictEqual(snap.polluters, 20 / 3);
    assert.strictEqual(snap.treatment, 1);
    assert.strictEqual(snap.sewage, 2);
    assert.strictEqual(snap.cityPollution, 42);
    assert.strictEqual(snap.river, 70);
    assert.strictEqual(snap.drought, true);
    assert.strictEqual(snap.hot, true);
    assert.strictEqual(snap.deforestation, 0.5);
    assert.deepStrictEqual(snap.species.map(s => [s.id, s.known]), [['sapo', true]]);

    const water = JSON.parse(JSON.stringify(g('TerrainHealth.collect(gm, 5, 10)')));
    assert.strictEqual(water.zone, 'water');
    assert.ok(water.bareBanks > 0.5);
    assert.strictEqual(TerrainHealthKind(water), 'water');
});

function TerrainHealthKind(snap) {
    return evaluate(snap).kind;
}
