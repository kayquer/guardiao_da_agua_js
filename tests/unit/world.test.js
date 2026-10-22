// Mundo: terreno (colinas e área inicial), vento do clima e revisão do quiz — regras sem Babylon.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const grid = () => {
    const g = load('js/utils/GameUtils.js', 'js/core/GridManager.js');
    const GridManager = g('GridManager');
    const gm = Object.create(GridManager.prototype); // sem cena: só as grades
    Object.assign(gm, { gridSize: 40, occupationGrid: [], elevationGrid: [], terrainGrid: [] });
    gm.initializeGrid();
    return gm;
};

test('terreno: colinas são poucas (< 10%) e nenhuma fica sozinha', () => {
    const gm = grid();
    let hills = 0;
    for (let x = 0; x < 40; x++) {
        for (let z = 0; z < 40; z++) {
            if (gm.terrainGrid[x][z] !== 'hill') continue;
            hills++;
            const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => gm.terrainGrid[x + dx]?.[z + dz] === 'hill');
            assert.ok(neighbours.length > 0, `colina solta em ${x},${z}`);
        }
    }
    assert.ok(hills / 1600 < 0.1, `${hills} colinas`);
});

test('terreno: a área inicial tem pelo menos 80% de terreno construível', () => {
    const gm = grid();
    const { x, z, ratio } = gm.startArea;
    assert.ok(ratio >= 0.8, `só ${ratio}`);
    let buildable = 0;
    for (let i = x - 4; i < x + 4; i++) {
        for (let j = z - 4; j < z + 4; j++) {
            if (['grassland', 'lowland'].includes(gm.terrainGrid[i][j])) buildable++;
        }
    }
    assert.ok(buildable / 64 >= 0.8);
});

test('terreno: o chão "terrain" nunca passa acima do topo dos blocos (nem perto de colinas)', () => {
    const gm = grid();
    const top = (x, z) => gm.terrainGrid[x][z] === 'water' ? 0 : gm.getTerrainBlockHeight(x, z);
    // Vértices como os do CreateGround com 2 subdivisões por célula: cantos, bordas e centros
    for (let i = 0; i <= 80; i++) {
        for (let j = 0; j <= 80; j++) {
            const fx = i / 2, fz = j / 2;
            const h = gm.getTerrainFloorHeight(fx, fz);
            assert.ok(h >= 0, `negativo em ${fx},${fz}`);
            for (const x of [Math.floor(fx - 1e-3), Math.floor(fx + 1e-3)]) {
                for (const z of [Math.floor(fz - 1e-3), Math.floor(fz + 1e-3)]) {
                    if (x < 0 || z < 0 || x >= 40 || z >= 40) continue;
                    assert.ok(h <= Math.max(0, top(x, z) - 0.1), `chão ${h.toFixed(2)} acima do bloco ${x},${z} (${top(x, z).toFixed(2)})`);
                }
            }
        }
    }
    // No centro de uma colina o chão acompanha o topo (o pick de posicionamento/informações acerta a célula)
    let hill = null;
    for (let x = 0; x < 40 && !hill; x++) for (let z = 0; z < 40 && !hill; z++) if (gm.terrainGrid[x][z] === 'hill') hill = [x, z];
    const c = gm.getTerrainFloorHeight(hill[0] + 0.5, hill[1] + 0.5);
    assert.ok(Math.abs(c - (gm.getTerrainBlockHeight(hill[0], hill[1]) - 0.15)) < 1e-9);
});

test('vento: rajada ou média alta liga o vento forte; direção vira vetor para onde sopra', () => {
    const g = load('js/systems/WeatherService.js', 'js/systems/WeatherEffects.js');
    const WeatherEffects = g('WeatherEffects');
    const calm = WeatherEffects.profileFor({ code: 0, wind: 10, gusts: 18, windDir: 0, temperature: 20, isDay: true });
    assert.strictEqual(calm.windy, false);
    assert.ok(WeatherEffects.profileFor({ code: 3, wind: 22, gusts: 55, windDir: 0, temperature: 20, isDay: true }).windy);
    assert.ok(WeatherEffects.profileFor({ code: 3, wind: 35, temperature: 20, isDay: true }).windy, 'sem rajada na resposta usa a média');
    const fromNorth = WeatherEffects.windVector(0); // vem do norte → sopra para o sul (−z)
    assert.ok(Math.abs(fromNorth.x) < 1e-9 && fromNorth.z < -0.99);
    const fromWest = WeatherEffects.windVector(270); // vem do oeste → sopra para leste (+x)
    assert.ok(fromWest.x > 0.99);
    assert.strictEqual(g('WeatherService').compass(225), 'sudoeste');
});

test('quiz: revisão lista só as erradas, com a resposta dada, a certa e a explicação', () => {
    const g = load('js/systems/StudySystem.js');
    const study = Object.create(g('StudySystem').prototype);
    const quiz = {
        passingScore: 70,
        questions: [
            { id: 0, question: 'A?', options: ['x', 'y'], correctAnswer: 0, explanation: 'porque x' },
            { id: 1, question: 'B?', options: ['p', 'q'], correctAnswer: 1, explanation: 'porque q' }
        ]
    };
    study.getQuiz = () => quiz;
    study.currentQuizAnswers = { 0: 0, 1: 0 };
    const wrong = study.getWrongAnswers();
    assert.strictEqual(JSON.stringify(wrong), JSON.stringify([{ question: 'B?', chosen: 'p', correct: 'q', explanation: 'porque q' }]));
});
