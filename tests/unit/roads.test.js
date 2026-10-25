// Rede de ruas (js/systems/roads/RoadNetwork.js): auto-encaixe das peças e caminhos do trânsito.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/systems/roads/RoadNetwork.js');
const RoadNetwork = g('RoadNetwork');

const N = 1, L = 2, S = 4, O = 8;

test('máscara → peça e rotação nos 16 casos', () => {
    const expected = {
        0: ['isolada', 0],
        [N]: ['ponta', 0], [L]: ['ponta', 1], [S]: ['ponta', 2], [O]: ['ponta', 3],
        [N | S]: ['reta', 0], [L | O]: ['reta', 1],
        [N | L]: ['curva', 0], [L | S]: ['curva', 1], [S | O]: ['curva', 2], [O | N]: ['curva', 3],
        [N | L | S]: ['T', 0], [L | S | O]: ['T', 1], [S | O | N]: ['T', 2], [O | N | L]: ['T', 3],
        [N | L | S | O]: ['cruzamento', 0]
    };
    assert.strictEqual(Object.keys(expected).length, 16);
    for (const [mask, [tipo, rotacao]] of Object.entries(expected)) {
        const piece = RoadNetwork.pieceForMask(Number(mask));
        assert.deepStrictEqual([piece.tipo, piece.rotacao], [tipo, rotacao], `máscara ${mask}`);
        // Girar a peça canônica pela rotação devolve a máscara (é assim que o mesh é girado)
        if (tipo !== 'reta') assert.strictEqual(RoadNetwork.rotateMask(RoadNetwork.CANONICAL[tipo], rotacao), Number(mask));
    }
});

test('rede: vizinhos, máscara, curva em L e T', () => {
    // L: (0,0) → (2,0) e sobe até (2,2)
    const net = new RoadNetwork([{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 1 }, { x: 2, z: 2 }]);
    assert.strictEqual(net.pieceAt(0, 0).tipo, 'ponta');
    assert.strictEqual(net.pieceAt(1, 0).tipo, 'reta');
    assert.strictEqual(net.pieceAt(2, 0).tipo, 'curva'); // liga O e N
    assert.strictEqual(net.maskAt(2, 0), O | N);
    assert.strictEqual(net.pieceAt(2, 1).tipo, 'reta');
    net.add(3, 1); // bifurcação
    assert.strictEqual(net.pieceAt(2, 1).tipo, 'T');
    net.add(1, 1);
    assert.strictEqual(net.pieceAt(2, 1).tipo, 'cruzamento');
    net.remove(1, 1);
    assert.strictEqual(net.pieceAt(2, 1).tipo, 'T');
    assert.strictEqual(net.connectedCount(), 6);
    net.add(10, 10); // solta
    assert.strictEqual(net.connectedCount(), 6);
    assert.strictEqual(net.components().length, 2);
});

test('arrasto traça linha reta pelo eixo dominante', () => {
    const fmt = cells => cells.map(c => `${c.x},${c.z}`).join(' ');
    assert.strictEqual(fmt(RoadNetwork.linePath(2, 2, 5, 3)), '2,2 3,2 4,2 5,2');
    assert.strictEqual(fmt(RoadNetwork.linePath(2, 2, 1, -2)), '2,2 2,1 2,0 2,-1 2,-2');
    assert.strictEqual(fmt(RoadNetwork.linePath(4, 4, 4, 4)), '4,4');
    assert.strictEqual(RoadNetwork.linePath(0, 0, 19, 0).length, 20);
});

test('trânsito: segue em frente, não dá meia-volta, só volta em ponta', () => {
    const net = new RoadNetwork(RoadNetwork.linePath(0, 0, 4, 0));
    net.add(2, 1); // T em (2,0)
    // De (1,0) para (2,0): escolhe entre (3,0) e (2,1), nunca (1,0)
    for (let i = 0; i < 20; i++) {
        const next = net.nextCell({ x: 1, z: 0 }, { x: 2, z: 0 }, () => i / 20);
        assert.ok(!(next.x === 1 && next.z === 0));
    }
    // Ponta: volta
    assert.deepStrictEqual(JSON.parse(JSON.stringify(net.nextCell({ x: 3, z: 0 }, { x: 4, z: 0 }))), { x: 3, z: 0 });
    // Isolada: nada
    net.add(9, 9);
    assert.strictEqual(net.nextCell(null, { x: 9, z: 9 }), null);
    // Percorre 200 passos sem sair da rede
    let prev = null, cur = { x: 0, z: 0 };
    for (let i = 0; i < 200; i++) {
        const next = net.nextCell(prev, cur);
        assert.ok(net.has(next.x, next.z));
        assert.strictEqual(Math.abs(next.x - cur.x) + Math.abs(next.z - cur.z), 1);
        prev = cur;
        cur = next;
    }
});

// Perfil de altura: rampa subindo a colina, ponte sobre a água e ponte entre dois montes
test('perfil: rampa na reta encostada numa rua mais alta; degrau pequeno fica plano', () => {
    const net = new RoadNetwork([{ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 0, z: 2 }, { x: 0, z: 3 }]);
    const heights = { '0,0': 0.4, '0,1': 0.4, '0,2': 1.6, '0,3': 1.65 };
    const p = net.profile((x, z) => heights[`${x},${z}`], () => false);
    const ramp = p.get('0,1');
    assert.strictEqual(ramp.kind, 'ramp');
    assert.strictEqual(ramp.dir, 0, 'sobe para o norte');
    assert.ok(Math.abs(ramp.rise - 1.2) < 1e-9);
    assert.strictEqual(p.get('0,0').kind, 'flat');
    assert.strictEqual(p.get('0,3').kind, 'flat', '0,05 de degrau não vira rampa');
    // carros: borda baixa, meio e borda alta da rampa
    assert.ok(Math.abs(RoadNetwork.edgeHeight(p, { x: 0, z: 1 }, { x: 0, z: 0 }) - 0.4) < 1e-9);
    assert.ok(Math.abs(RoadNetwork.edgeHeight(p, { x: 0, z: 1 }, { x: 0, z: 2 }) - 1.6) < 1e-9);
    assert.ok(Math.abs(RoadNetwork.centerHeight(p, { x: 0, z: 1 }) - 1.0) < 1e-9);
    assert.ok(Math.abs(RoadNetwork.edgeHeight(p, { x: 0, z: 2 }, { x: 0, z: 1 }) - 1.6) < 1e-9, 'a vizinha encosta no topo da rampa');
});

test('perfil: ponte sobre a água (vão de até 4) e entre dois montes, na altura do apoio mais baixo', () => {
    const line = n => Array.from({ length: n }, (_, i) => ({ x: i, z: 0 }));
    const net = new RoadNetwork(line(5));
    const water = new Set(['1,0', '2,0', '3,0']);
    const g = { '0,0': 0.5, '1,0': 0.3, '2,0': 0.3, '3,0': 0.3, '4,0': 0.6 };
    const p = net.profile((x, z) => g[`${x},${z}`], (x, z) => water.has(`${x},${z}`));
    for (const k of ['1,0', '2,0', '3,0']) {
        assert.strictEqual(p.get(k).kind, 'bridge', k);
        assert.strictEqual(p.get(k).base, 0.5, 'tabuleiro na altura do apoio mais baixo');
    }
    assert.strictEqual(p.get('0,0').kind, 'flat');

    // Vão de 5 é longo demais: sem ponte
    const longNet = new RoadNetwork(line(7));
    const longWater = new Set(['1,0', '2,0', '3,0', '4,0', '5,0']);
    const q = longNet.profile(() => 0.4, (x, z) => longWater.has(`${x},${z}`));
    assert.strictEqual(q.get('3,0').kind, 'flat');

    // Vale entre dois montes (terra baixa entre colinas)
    const hills = { '0,0': 1.7, '1,0': 0.45, '2,0': 1.8 };
    const v = new RoadNetwork(line(3)).profile((x, z) => hills[`${x},${z}`], () => false);
    assert.strictEqual(v.get('1,0').kind, 'bridge');
    assert.strictEqual(v.get('1,0').base, 1.7);
});
