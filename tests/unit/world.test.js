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

// Blocos voxel encostados (antes 98% da célula: pela fresta aparecia o chão escuro) e laterais só onde aparecem
test('terreno: blocos e água ocupam a célula inteira, sem fresta, e só têm as laterais visíveis', () => {
    const gm = grid();
    gm.cellSize = 2;
    const half = 40;
    const quads = geo => {
        const list = [];
        for (let i = 0; i < geo.indices.length; i += 6) {
            const v = [0, 1, 2, 5].map(k => geo.indices[i + k]).map(n => geo.positions.slice(n * 3, n * 3 + 3));
            list.push({ v, n: geo.normals.slice(geo.indices[i] * 3, geo.indices[i] * 3 + 3) });
        }
        return list;
    };
    const cellOf = q => {
        const cx = q.v.reduce((s, p) => s + p[0], 0) / 4, cz = q.v.reduce((s, p) => s + p[2], 0) / 4;
        return [Math.floor((cx + half) / 2), Math.floor((cz + half) / 2)];
    };
    const land = quads(gm.buildTerrainGeometry(0, 0, 40, 40));
    const water = quads(gm.buildWaterGeometry(0, 0, 40, 40));
    // Topo (normal para cima, inclusive o chanfro) de cada célula cobre a célula toda: área = 2 × 2
    const area = new Map();
    for (const q of [...land, ...water]) {
        if (q.n[1] <= 0.5) continue;
        const [a, b, c, d] = q.v; // quad plano em xz (trapézio ou retângulo): área pela fórmula do polígono
        const xz = [a, b, c, d].map(p => [p[0], p[2]]);
        let s = 0;
        for (let i = 0; i < 4; i++) s += xz[i][0] * xz[(i + 1) % 4][1] - xz[(i + 1) % 4][0] * xz[i][1];
        const key = cellOf(q).join(',');
        area.set(key, (area.get(key) || 0) + Math.abs(s) / 2);
    }
    assert.strictEqual(area.size, 1600);
    for (const [key, a] of area) assert.ok(Math.abs(a - 4) < 1e-6, `célula ${key} com topo ${a}`);
    // Laterais da terra: só onde o vizinho é mais baixo, e descem até o topo dele (água = 0, borda = 0)
    const top = (x, z) => (x < 0 || z < 0 || x >= 40 || z >= 40) ? 0 : gm.terrainGrid[x][z] === 'water' ? 0 : gm.getTerrainBlockHeight(x, z);
    let sides = 0;
    for (const q of land) {
        if (Math.abs(q.n[1]) > 1e-9) continue;
        sides++;
        const [x, z] = cellOf({ v: q.v.map(p => [p[0] - q.n[0] * 0.01, p[1], p[2] - q.n[2] * 0.01]) });
        const bottom = Math.min(...q.v.map(p => p[1]));
        const nTop = top(x + Math.round(q.n[0]), z + Math.round(q.n[2]));
        assert.ok(Math.abs(bottom - nTop) < 1e-9, `lateral de ${x},${z} desce até ${bottom}, vizinho ${nTop}`);
        assert.ok(nTop < gm.getTerrainBlockHeight(x, z), `lateral escondida em ${x},${z}`);
    }
    assert.ok(sides > 0 && sides < 1600 * 4, `${sides} laterais`);
    // Cor coerente: nenhuma face lateral escura demais (antes as de costas para o sol ficavam pretas)
    const geo = gm.buildTerrainGeometry(0, 0, 40, 40);
    for (let i = 0; i < geo.colors.length; i += 4) {
        assert.ok(Math.max(geo.colors[i], geo.colors[i + 1], geo.colors[i + 2]) > 0.3, 'cor de vértice escura');
    }
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

// Em 10/2026 a água rasa ficava mais alta que a margem (310 de 310 bordas): a fórmula da lâmina era invertida.
test('água fica abaixo de toda a terra em volta, e cada lago/rio é plano', () => {
    const gm = grid();
    let edges = 0;
    for (let x = 0; x < gm.gridSize; x++) {
        for (let z = 0; z < gm.gridSize; z++) {
            if (gm.getTerrainType(x, z) !== 'water') continue;
            const level = gm.getWaterLevel(x, z);
            assert.ok(level > 0, 'a água tem altura (o fundo fica em 0)');
            assert.strictEqual(gm.getTerrainBlockHeight(x, z), level, 'prédio sobre a água fica na superfície');
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const type = gm.getTerrainType(x + dx, z + dz);
                if (type === 'unknown') continue;
                if (type === 'water') assert.strictEqual(gm.getWaterLevel(x + dx, z + dz), level, 'lago/rio plano');
                else {
                    edges++;
                    assert.ok(gm.getTerrainBlockHeight(x + dx, z + dz) >= level + 0.1, `margem em (${x + dx}, ${z + dz}) acima da água`);
                }
            }
        }
    }
    assert.ok(edges > 0, 'o mapa tem margens');
});
