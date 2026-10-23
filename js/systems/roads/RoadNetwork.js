/**
 * ===== REDE DE RUAS (puro: sem Babylon nem DOM, testado em tests/unit/roads.test.js) =====
 * Células de rua do grid → peça de auto-encaixe de cada uma e caminhos para o trânsito.
 *
 * Direções: N = z+1, L (leste) = x+1, S = z-1, O (oeste) = x-1. Máscara de vizinhos: N=1, L=2, S=4, O=8.
 * Peça = { tipo, rotacao } com rotacao em quartos de volta no sentido horário visto de cima (N → L → S → O),
 * a partir da peça canônica: ponta liga N; reta liga N-S; curva liga N-L; T liga N-L-S (sem O);
 * cruzamento liga os 4; isolada não liga nada. No Babylon, rotation.y = rotacao × π/2 leva +z (N) para +x (L).
 */
class RoadNetwork {
    constructor(cells = []) {
        this.cells = new Set();
        for (const c of cells) this.add(c.x, c.z);
    }

    static key(x, z) { return `${x},${z}`; }

    /** Gira a máscara q quartos no sentido horário (N→L→S→O). */
    static rotateMask(mask, q = 1) {
        let m = mask & 15;
        for (let i = 0; i < ((q % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
        return m;
    }

    /** Máscara dos 4 vizinhos → { tipo, rotacao }. */
    static pieceForMask(mask) {
        const m = mask & 15;
        const count = [1, 2, 4, 8].filter(bit => m & bit).length;
        let tipo;
        if (count === 0) tipo = 'isolada';
        else if (count === 1) tipo = 'ponta';
        else if (count === 3) tipo = 'T';
        else if (count === 4) tipo = 'cruzamento';
        else tipo = (m === 5 || m === 10) ? 'reta' : 'curva';
        const canonical = RoadNetwork.CANONICAL[tipo];
        for (let q = 0; q < 4; q++) {
            if (RoadNetwork.rotateMask(canonical, q) === m) return { tipo, rotacao: tipo === 'reta' ? q % 2 : q };
        }
        return { tipo, rotacao: 0 };
    }

    /**
     * Células de um arrasto: linha reta pelo eixo dominante a partir da célula inicial (empate = eixo x).
     * Sempre inclui a célula inicial; a final é projetada no eixo.
     */
    static linePath(x0, z0, x1, z1) {
        const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
        const length = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
        const step = Math.sign(alongX ? x1 - x0 : z1 - z0) || 1;
        const cells = [];
        for (let i = 0; i <= length; i++) {
            cells.push(alongX ? { x: x0 + i * step, z: z0 } : { x: x0, z: z0 + i * step });
        }
        return cells;
    }

    add(x, z) { this.cells.add(RoadNetwork.key(x, z)); }
    remove(x, z) { this.cells.delete(RoadNetwork.key(x, z)); }
    has(x, z) { return this.cells.has(RoadNetwork.key(x, z)); }
    get size() { return this.cells.size; }

    list() {
        return Array.from(this.cells, k => {
            const [x, z] = k.split(',').map(Number);
            return { x, z };
        });
    }

    maskAt(x, z) {
        let mask = 0;
        for (const d of RoadNetwork.DIRS) if (this.has(x + d.dx, z + d.dz)) mask |= d.bit;
        return mask;
    }

    pieceAt(x, z) { return RoadNetwork.pieceForMask(this.maskAt(x, z)); }

    /** Vizinhos de rua de (x, z), na ordem N, L, S, O. */
    neighbors(x, z) {
        return RoadNetwork.DIRS.filter(d => this.has(x + d.dx, z + d.dz)).map(d => ({ x: x + d.dx, z: z + d.dz, dir: d.name }));
    }

    /** Grupos de células ligadas (busca em largura). */
    components() {
        const seen = new Set();
        const groups = [];
        for (const start of this.cells) {
            if (seen.has(start)) continue;
            const group = [];
            const queue = [start];
            seen.add(start);
            while (queue.length) {
                const k = queue.shift();
                const [x, z] = k.split(',').map(Number);
                group.push({ x, z });
                for (const n of this.neighbors(x, z)) {
                    const nk = RoadNetwork.key(n.x, n.z);
                    if (!seen.has(nk)) {
                        seen.add(nk);
                        queue.push(nk);
                    }
                }
            }
            groups.push(group);
        }
        return groups;
    }

    /** Blocos ligados a pelo menos outro (os que carros podem percorrer). */
    connectedCount() {
        let n = 0;
        for (const k of this.cells) {
            const [x, z] = k.split(',').map(Number);
            if (this.maskAt(x, z)) n++;
        }
        return n;
    }

    /**
     * Próxima célula de quem está em cur vindo de prev: um vizinho aleatório que não seja a volta.
     * Ponta sem saída → volta por onde veio (meia-volta); célula isolada → null.
     */
    nextCell(prev, cur, rand = Math.random) {
        const options = this.neighbors(cur.x, cur.z);
        if (!options.length) return null;
        const forward = prev ? options.filter(n => n.x !== prev.x || n.z !== prev.z) : options;
        const pool = forward.length ? forward : options;
        const pick = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
        return { x: pick.x, z: pick.z };
    }
}

RoadNetwork.DIRS = [
    { name: 'N', dx: 0, dz: 1, bit: 1 },
    { name: 'L', dx: 1, dz: 0, bit: 2 },
    { name: 'S', dx: 0, dz: -1, bit: 4 },
    { name: 'O', dx: -1, dz: 0, bit: 8 }
];

// Máscara da peça canônica (rotacao 0)
RoadNetwork.CANONICAL = { isolada: 0, ponta: 1, reta: 5, curva: 3, T: 7, cruzamento: 15 };

window.RoadNetwork = RoadNetwork;
