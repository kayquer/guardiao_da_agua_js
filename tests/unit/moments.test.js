// Momentos da cidade (11/2026, ideias da 1ª auditoria): nascente que volta, chuva real, cheia contida, álbum e o
// peso do plano que segue o primeiro carro. Só as partes puras (js/systems/CityMoments.js, CityCinematic.js).
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/systems/CityCinematic.js', 'js/systems/CityMoments.js');
const CityMoments = g('CityMoments');
const CityCinematic = g('CityCinematic');
const same = (a, b, msg) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), msg);

test('nascente: só brota depois de o aquífero cair abaixo de 30% e voltar acima de 80%', () => {
    let state = { aquiferWasLow: false, spring: null };
    const step = aquifer => {
        const r = CityMoments.springStep(state, aquifer);
        state = { ...state, aquiferWasLow: r.aquiferWasLow };
        return r.event;
    };
    assert.strictEqual(step(95), null, 'cheio desde o começo não conta: precisa ter caído antes');
    assert.strictEqual(step(50), null);
    assert.strictEqual(step(25), null, 'caiu: arma a volta');
    assert.strictEqual(state.aquiferWasLow, true);
    assert.strictEqual(step(70), null, 'ainda não passou de 80%');
    assert.strictEqual(step(81), 'appear');
    state.spring = { x: 1, z: 1 };
    assert.strictEqual(step(60), null, 'nascente fica enquanto o aquífero não seca de novo');
    assert.strictEqual(step(20), 'dry');
    state.spring = null;
    assert.strictEqual(step(85), 'appear', 'pode voltar de novo');
    assert.strictEqual(CityMoments.springStep({ aquiferWasLow: true }, NaN).event, null);
});

test('nascente: encosta livre mais perto da cidade; sem encosta, a APP; nada livre = null', () => {
    const types = {}, zones = {}, occupied = new Set();
    const grid = {
        gridSize: 10,
        getTerrainType: (x, z) => types[`${x},${z}`] || 'grassland',
        getRiverZone: (x, z) => zones[`${x},${z}`] || null,
        isCellOccupied: (x, z) => occupied.has(`${x},${z}`)
    };
    types['9,9'] = 'hill';
    types['3,3'] = 'hill';
    zones['5,5'] = 'app';
    same(CityMoments.pickSpringCell(grid, { x: 4, z: 4 }), { x: 3, z: 3 }, 'encosta mais perto');
    occupied.add('3,3');
    same(CityMoments.pickSpringCell(grid, { x: 4, z: 4 }), { x: 9, z: 9 }, 'pula a ocupada');
    same(CityMoments.pickSpringCell(grid, { x: 4, z: 4 }, (x, z) => x === 9), { x: 5, z: 5 }, 'sem encosta livre: APP');
    zones['5,5'] = null;
    assert.strictEqual(CityMoments.pickSpringCell(grid, { x: 4, z: 4 }, (x, z) => x === 9), null);
});

test('chuva real: avisa quando começa a chover (inclusive se já chovia na primeira olhada), não enquanto continua', () => {
    assert.strictEqual(CityMoments.rainStarted(null, 0.6), true);
    assert.strictEqual(CityMoments.rainStarted(false, 0.3), true);
    assert.strictEqual(CityMoments.rainStarted(true, 0.8), false);
    assert.strictEqual(CityMoments.rainStarted(false, 0), false);
});

test('cheia contida: percentual evitado pela força do evento', () => {
    assert.strictEqual(CityMoments.savedPercent(0.2), 80);
    assert.strictEqual(CityMoments.savedPercent(0.7), 30);
    assert.strictEqual(CityMoments.savedPercent(1.4), 0, 'pressão da cidade acima de 1 não vira número negativo');
    assert.strictEqual(CityMoments.savedPercent(undefined), 0);
});

test('álbum: tira fotos de missões não cumpridas (save de antes), guarda a do começo e respeita o máximo', () => {
    const photo = key => ({ key, img: 'data:image/jpeg;base64,AAAA', day: 1 });
    const album = [photo('start'), photo('tutorial_01'), photo('energy_01'), { key: 'x' }];
    same(CityMoments.trimAlbum(album, new Set(['tutorial_01'])).map(p => p.key), ['start', 'tutorial_01']);
    const many = [photo('start')];
    for (let i = 0; i < CityMoments.ALBUM_MAX + 5; i++) many.push(photo(`m${i}`));
    const trimmed = CityMoments.trimAlbum(many, many.map(p => p.key));
    assert.strictEqual(trimmed.length, CityMoments.ALBUM_MAX);
    assert.strictEqual(trimmed[0].key, 'start', 'a foto do começo nunca sai');
    assert.strictEqual(trimmed[1].key, 'm6', 'saem as mais antigas depois do começo (36 → 30: m0 a m5)');
    assert.ok(CityMoments.albumKey('p1').endsWith('album_p1'));
});

test('save: nascente e carros voltam; save antigo não tira foto do começo nem repete os carros', () => {
    const m = new CityMoments();
    m.state.spring = { x: 4, z: 7 };
    m.state.carsShown = true;
    m.state.startShot = true;
    const data = JSON.parse(JSON.stringify(m.getSaveData()));
    const back = new CityMoments();
    back.loadData(data, null);
    same(back.state.spring, { x: 4, z: 7 });
    assert.strictEqual(back.state.carsShown, true);
    const old = new CityMoments();
    old.loadData(null, { questSystem: { completedQuests: new Set(['tutorial_01']) } });
    assert.strictEqual(old.state.startShot, true, 'save antigo: a cidade já não é o começo');
    assert.strictEqual(old.primeCars, true, 'carros: marca pelo trânsito que já existe');
    assert.ok(old.albumSeen.has('tutorial_01'), 'missões já cumpridas não ganham foto');
});

test('plano que segue o carro: pega o carro no primeiro terço, suave', () => {
    assert.strictEqual(CityCinematic.followWeight(0), 0);
    assert.ok(CityCinematic.followWeight(0.15) > 0 && CityCinematic.followWeight(0.15) < 1);
    assert.strictEqual(CityCinematic.followWeight(CityCinematic.FOLLOW_REACH), 1);
    assert.strictEqual(CityCinematic.followWeight(1), 1);
});
