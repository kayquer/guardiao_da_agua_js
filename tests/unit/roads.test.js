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
