// Props de cenário: dados (js/data/props.js), arquivos .glb (models/props/, Kit Props Brasil Low Poly) e o
// planejador (js/systems/props/PropPlanner.js): onde, quando e quantos.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/data/buildings.js', 'js/data/props.js', 'js/systems/props/PropPlanner.js');
const TYPES = g('PROP_TYPES');
const SETTINGS = g('PROP_SETTINGS');
const Planner = g('PropPlanner');
const BUILDINGS = g('BUILDING_TYPES');
const PROPS_DIR = path.join(ROOT, 'models', 'props');
const PLACES = ['land', 'hill', 'bank', 'water', 'road', 'zone', 'near', 'rural', 'city'];
const GROUPS = ['natureza', 'fauna', 'rua', 'rural', 'rio', 'tecnologia', 'poluicao'];
const MOTIONS = ['bob', 'swim', 'graze', 'hop', 'perch', 'fly', 'soar', 'sway'];

function glbTriangles(file) {
    const data = fs.readFileSync(file);
    assert.strictEqual(data.readUInt32LE(0), 0x46546c67, `${file} não é um .glb`);
    const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString('utf8'));
    let tris = 0;
    for (const mesh of json.meshes || []) for (const p of mesh.primitives) tris += Math.floor(json.accessors[p.indices ?? p.attributes.POSITION].count / 3);
    return { tris, json };
}

test('cada tipo tem campos válidos e prédios exigidos que existem', () => {
    for (const [id, t] of Object.entries(TYPES)) {
        assert.match(id, /^[a-z_]+$/, id);
        assert.strictEqual(t.file, `${id}.glb`, `${id}.file`);
        assert.ok(GROUPS.includes(t.group), `${id}.group`);
        assert.ok(PLACES.includes(t.place), `${id}.place`);
        assert.ok(Number.isInteger(t.max) && t.max > 0, `${id}.max`);
        if (t.place === 'near') assert.ok(t.requires?.length, `${id}: place near precisa de requires`);
        (t.requires || []).forEach(b => assert.ok(BUILDINGS[b], `${id}.requires: prédio ${b} não existe`));
        if (t.pollution) assert.ok(t.pollution[0] < t.pollution[1], `${id}.pollution [de, até]`);
        if (t.cleanBelow) assert.ok(t.cleanBelow[0] > t.cleanBelow[1], `${id}.cleanBelow [some, cheio]`);
        if (t.deforestation) assert.ok(t.deforestation[0] < t.deforestation[1] && t.deforestation[1] <= 1, `${id}.deforestation [de, até] em 0-1`);
        if (t.face) assert.ok(['water', 'road'].includes(t.face), `${id}.face`);
        // tamanho no mundo (célula = 2; casa ≈ 1,1): nada de hidrante da altura de uma casa
        assert.ok(t.size >= 0.15 && t.size <= 1.4, `${id}.size ${t.size} fora de 0,15-1,4`);
        if (t.motion) assert.ok(MOTIONS.includes(t.motion), `${id}.motion`);
        if (t.clump) assert.ok(Number.isInteger(t.clump) && t.clump <= 4 && t.size <= SETTINGS.SMALL, `${id}.clump só para peça pequena (1-4)`);
        if (t.kit) assert.match(t.kit, /^fauna\/[a-z]+\/[a-z_]+$/, `${id}.kit`);
    }
});

test('todo prop tem o .glb, é leve (≤ MAX_TRIS) e não sobra .glb sem uso em models/props/', () => {
    const files = fs.readdirSync(PROPS_DIR).filter(f => f.endsWith('.glb'));
    for (const [id, t] of Object.entries(TYPES)) {
        const file = path.join(PROPS_DIR, t.file);
        assert.ok(fs.existsSync(file), `falta models/props/${t.file}`);
        const { tris, json } = glbTriangles(file);
        const budget = t.kit ? SETTINGS.MAX_TRIS_FAUNA : SETTINGS.MAX_TRIS;
        assert.ok(tris <= budget, `${id}: ${tris} triângulos (máximo ${budget})`);
        assert.ok(!(json.images || []).length, `${id}: sem textura (cor por vértice)`);
    }
    const used = new Set(Object.values(TYPES).map(t => t.file));
    files.forEach(f => assert.ok(used.has(f), `models/props/${f} não é usado em js/data/props.js`));
});

// Mapa de teste 20×20: rio na coluna x = 10, encosta em (2..3, 2..3), resto grama
function world(extra = {}) {
    const size = 20;
    const occupied = new Set(extra.occupied || []);
    return {
        size,
        terrain: (x, z) => (x === 10 ? 'water' : x >= 2 && x <= 3 && z >= 2 && z <= 3 ? 'hill' : 'grassland'),
        occupied: (x, z) => occupied.has(`${x},${z}`),
        tree: (x, z) => (extra.trees || []).includes(`${x},${z}`),
        buildings: extra.buildings || []
    };
}
const state = (s = {}) => ({ level: 0, pollution: 0, sewage: false, quality: 'high', ...s });
const ofGroup = (plan, group) => plan.filter(p => TYPES[p.id].group === group);
const ids = plan => new Set(plan.map(p => p.id));

test('cidade nova: só natureza e bichos do rio; nada de rua, campo, tecnologia ou poluição', () => {
    const plan = Planner.plan(world(), state());
    assert.ok(ofGroup(plan, 'natureza').length > 12);
    assert.ok(ids(plan).has('garca') && ids(plan).has('vitoria_regia'));
    for (const p of plan) assert.ok(['natureza', 'fauna'].includes(TYPES[p.id].group) && !TYPES[p.id].level, `${p.id} no começo`);
});

test('célula dividida em 4 quartos: peça grande sozinha, até 4 pequenas; nunca em célula ocupada/com árvore', () => {
    const occupied = ['5,5', '5,6', '11,4'];
    const trees = ['6,6', '9,9'];
    const plan = Planner.plan(world({ occupied, trees }), state({ pollution: 80, level: 4 }));
    const cells = new Map();
    for (const p of plan) {
        const key = `${p.x},${p.z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(p);
        assert.ok(!occupied.includes(key) && !trees.includes(key), `${p.id} em ${key} ocupada`);
        const t = TYPES[p.id];
        if (t.place === 'water') assert.strictEqual(p.x, 10, `${p.id} fora da água`);
        else assert.notStrictEqual(p.x, 10, `${p.id} na água`);
        if (t.place === 'bank') assert.ok(Math.abs(p.x - 10) === 1, `${p.id} longe da margem`);
        if (t.place === 'hill') assert.ok(p.x >= 2 && p.x <= 3 && p.z >= 2 && p.z <= 3, `${p.id} fora da encosta`);
        assert.ok(Math.abs(p.ox) < 1 && Math.abs(p.oz) < 1, `${p.id} sai da célula (${p.ox}, ${p.oz})`);
        // a peça inteira cabe na célula (meia medida + deslocamento ≤ 1), menos o lado virado para a água/rua
        if (!t.face) assert.ok(Math.abs(p.ox) + p.scale / 2 <= 1 && Math.abs(p.oz) + p.scale / 2 <= 1, `${p.id} invade a célula vizinha`);
    }
    let shared = 0;
    cells.forEach((items, key) => {
        const big = items.filter(p => !Planner.isSmall(TYPES[p.id]));
        if (big.length) assert.strictEqual(items.length, 1, `peça grande dividindo ${key}: ${items.map(p => p.id)}`);
        assert.ok(items.length <= 4, `mais de 4 peças em ${key}`);
        if (items.length > 1) shared++;
    });
    assert.ok(shared > 0, 'peças pequenas dividem o bloco (moitas, sapo na taboa)');
});

test('metade da densidade e espaçamento: hidrantes nunca a menos de 6 células um do outro', () => {
    assert.strictEqual(SETTINGS.DENSITY, 0.5);
    const roads = [];
    for (let i = 0; i < 18; i++) roads.push({ type: 'paved_road', x: 4, z: i + 1, size: 1, finished: true, road: true });
    for (let i = 0; i < 8; i++) roads.push({ type: 'paved_road', x: 5 + i, z: 9, size: 1, finished: true, road: true });
    const w = world({ buildings: roads, occupied: roads.map(r => `${r.x},${r.z}`) });
    const plan = Planner.plan(w, state({ level: 4 }));
    const hydrants = plan.filter(p => p.id === 'hidrante');
    assert.ok(hydrants.length >= 1);
    hydrants.forEach((a, i) => hydrants.slice(i + 1).forEach(b => {
        assert.ok(Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z)) >= TYPES.hidrante.spacing, `hidrantes em ${a.x},${a.z} e ${b.x},${b.z}`);
    }));
    assert.ok(plan.filter(p => p.id === 'poste_concreto').length <= Math.ceil(TYPES.poste_concreto.max * SETTINGS.DENSITY));
});

test('determinístico: o mesmo estado dá o mesmo plano; mais intensidade só acrescenta', () => {
    const a = Planner.plan(world(), state({ pollution: 50 }));
    const b = Planner.plan(world(), state({ pollution: 50 }));
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
    const few = Planner.plan(world(), state({ pollution: 40 })).filter(p => p.id === 'saco_lixo' || p.id === 'lixo_flutuante');
    const more = Planner.plan(world(), state({ pollution: 60 })).filter(p => p.id === 'lixo_flutuante');
    const fewFloat = few.filter(p => p.id === 'lixo_flutuante').map(p => `${p.x},${p.z}`);
    const moreFloat = new Set(more.map(p => `${p.x},${p.z}`));
    fewFloat.forEach(c => assert.ok(moreFloat.has(c), `lixo flutuante em ${c} sumiu com mais poluição`));
});

test('poluição: sinais aparecem com ela e crescem; bichos do rio somem; esgoto só sem ETE', () => {
    const clean = Planner.plan(world(), state({ pollution: 10 }));
    assert.strictEqual(ofGroup(clean, 'poluicao').length, 0);
    const dirty = Planner.plan(world(), state({ pollution: 90 }));
    assert.ok(ids(dirty).has('peixe_morto') && ids(dirty).has('espuma_rio') && ids(dirty).has('lixo_flutuante'));
    ['garca', 'capivara', 'tartaruga', 'vitoria_regia'].forEach(id => assert.ok(!ids(dirty).has(id), `${id} com a água suja`));
    assert.ok(!ids(dirty).has('manilha_esgoto'), 'sem esgoto (sewage false) não há manilha');
    assert.ok(ids(Planner.plan(world(), state({ pollution: 60, sewage: true }))).has('manilha_esgoto'));
    // (no mapa de teste o rio é estreito: com 90 os peixes e a espuma disputam as mesmas células)
    const mid = Planner.plan(world(), state({ pollution: 50 })).filter(p => p.id === 'lixo_flutuante').length;
    const high = Planner.plan(world(), state({ pollution: 75 })).filter(p => p.id === 'lixo_flutuante').length;
    assert.ok(high > mid && mid > 0, `lixo flutuante ${mid} → ${high}`);
});

test('dia a dia: aparece com o nível da cidade, perto das ruas e zonas', () => {
    const road = z => ({ type: 'paved_road', x: 5, z, size: 1, finished: true, road: true });
    const buildings = [road(8), road(9), road(10), road(11), road(12),
        { type: 'zone_residential_light', x: 6, z: 9, size: 2, finished: true, zone: 'residential' }];
    const occupied = buildings.flatMap(b => b.size === 2 ? [`${b.x},${b.z}`, `${b.x + 1},${b.z}`, `${b.x},${b.z + 1}`, `${b.x + 1},${b.z + 1}`] : [`${b.x},${b.z}`]);
    const w = world({ buildings, occupied });
    assert.ok(!ids(Planner.plan(w, state({ level: 0 }))).has('poste_concreto'), 'nível 0 sem poste');
    const plan = Planner.plan(w, state({ level: 2 }));
    const postes = plan.filter(p => p.id === 'poste_concreto');
    assert.ok(postes.length > 0);
    postes.forEach(p => assert.ok([[4, 0], [6, 0]].some(([x]) => p.x === x) || (p.x === 5 && (p.z === 7 || p.z === 13)), `poste longe da rua em ${p.x},${p.z}`));
    plan.filter(p => TYPES[p.id].place === 'zone').forEach(p => {
        assert.ok(Math.max(Math.abs(p.x - 6.5) - 0.5, Math.abs(p.z - 9.5) - 0.5) <= 2, `${p.id} longe da zona`);
    });
    // no nível de entrada aparece metade; um nível depois, tudo
    assert.strictEqual(Planner.intensity(TYPES.banco_praca, state({ level: 2 }), {}).k, 0.5);
    assert.strictEqual(Planner.intensity(TYPES.banco_praca, state({ level: 3 }), {}).k, 1);
});

test('tecnologia: só com o prédio pronto que a traz, perBuilding por prédio', () => {
    const solar = { type: 'solar_farm', x: 14, z: 14, size: 2, finished: true };
    const road = z => ({ type: 'paved_road', x: 13, z, size: 1, finished: true, road: true });
    const buildings = [road(12), road(13), road(14), road(15), road(16), road(17)];
    assert.ok(!ids(Planner.plan(world({ buildings }), state({ level: 4 }))).has('poste_solar'));
    assert.ok(!ids(Planner.plan(world({ buildings: [...buildings, { ...solar, finished: false }] }), state())).has('poste_solar'), 'obra não conta');
    const plan = Planner.plan(world({ buildings: [...buildings, solar] }), state());
    const n = plan.filter(p => p.id === 'poste_solar').length;
    assert.ok(n > 0 && n <= TYPES.poste_solar.perBuilding, `${n} postes solares`);
});

test('desmatamento: tocos e toras perto das obras só depois que a mata cai', () => {
    const buildings = [{ type: 'park', x: 4, z: 4, size: 2, finished: true }];
    const w = world({ buildings, occupied: ['4,4', '5,4', '4,5', '5,5'] });
    assert.ok(!ids(Planner.plan(w, state({ deforestation: 0 }))).has('toco_serrado'));
    const plan = Planner.plan(w, state({ deforestation: 0.5 }));
    const tocos = plan.filter(p => p.id === 'toco_serrado' || p.id === 'pilha_toras');
    assert.ok(tocos.length > 0);
    tocos.forEach(p => assert.ok(Math.max(Math.abs(p.x - 4.5) - 0.5, Math.abs(p.z - 4.5) - 0.5) <= 3, `${p.id} longe da obra em ${p.x},${p.z}`));
    assert.ok(ids(plan).has('barranco_erodido'), 'margem sem mata desmorona');
});

test('poluição não tira os postes e hidrantes da rua (infraestrutura vem antes na disputa)', () => {
    const roads = Array.from({ length: 12 }, (_, i) => ({ type: 'paved_road', x: 5, z: 4 + i, size: 1, finished: true, road: true }));
    const w = world({ buildings: roads, occupied: roads.map(r => `${r.x},${r.z}`) });
    const count = p => Planner.plan(w, state({ level: 3, pollution: p })).filter(q => q.id === 'poste_concreto' || q.id === 'hidrante').length;
    assert.ok(count(0) > 0);
    assert.strictEqual(count(90), count(0));
});

test('qualidade baixa põe menos props; teto geral respeitado', () => {
    const high = Planner.plan(world(), state({ pollution: 80 })).length;
    const low = Planner.plan(world(), state({ pollution: 80, quality: 'low' })).length;
    assert.ok(low < high * 0.6, `baixa ${low} × alta ${high}`);
    assert.ok(high <= SETTINGS.MAX_TOTAL);
});

test('nível da cidade: população OU missões', () => {
    assert.strictEqual(Planner.levelFor(0, 0), 0);
    assert.strictEqual(Planner.levelFor(70, 0), 1);
    assert.strictEqual(Planner.levelFor(0, 2), 2);
    assert.strictEqual(Planner.levelFor(10000, 0), 4);
});

test('frente para a água: o -Z do modelo aponta para a célula de água vizinha', () => {
    const plan = Planner.plan(world(), state({ level: 2 }));
    const faced = plan.filter(p => TYPES[p.id].face === 'water');
    assert.ok(faced.length > 0);
    faced.forEach(p => {
        const fx = -Math.sin(p.rot), fz = -Math.cos(p.rot);
        assert.ok(Math.abs(fx - Math.sign(10 - p.x)) < 1e-6 && Math.abs(fz) < 1e-6, `${p.id} em ${p.x},${p.z} olha para (${fx.toFixed(2)}, ${fz.toFixed(2)})`);
    });
});

// PropSystem.refresh pula o replanejamento quando a assinatura não muda (o plano custa ~10-35 ms numa cidade grande)
test('assinatura do plano: igual quando o plano seria igual; muda com prédio, árvore, qualidade e quantidade', () => {
    const sig = (w, s) => Planner.signature(w, s);
    const house = { type: 'zone_residential_light', x: 4, z: 6, size: 2, finished: true, road: false, zone: 'residential' };
    const base = sig(world({ buildings: [house] }), state({ pollution: 50 }));
    assert.strictEqual(sig(world({ buildings: [house] }), state({ pollution: 50 })), base);
    // poluições diferentes com a mesma assinatura dão de fato o mesmo plano
    const plans = new Map();
    let repeated = 0;
    for (let p = 0; p <= 100; p += 0.73) {
        const w = world({ buildings: [house] }), s = state({ pollution: p });
        const key = sig(w, s), plan = JSON.stringify(Planner.plan(w, s));
        if (plans.has(key)) { repeated++; assert.strictEqual(plan, plans.get(key), `poluição ${p}`); } else plans.set(key, plan);
    }
    assert.ok(repeated > 50, 'a maioria das poluições vizinhas não muda o plano');
    assert.notStrictEqual(sig(world({ buildings: [house] }), state({ pollution: 90 })), base);
    assert.notStrictEqual(sig(world({ buildings: [{ ...house, finished: false }] }), state({ pollution: 50 })), base);
    assert.notStrictEqual(sig(world({ buildings: [{ ...house, x: 5 }] }), state({ pollution: 50 })), base);
    assert.notStrictEqual(sig(world({ buildings: [house] }), state({ pollution: 50, quality: 'low' })), base);
    assert.notStrictEqual(sig({ ...world({ buildings: [house] }), treeCount: 3 }, state({ pollution: 50 })), base);
});
