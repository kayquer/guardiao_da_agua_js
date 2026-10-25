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
     * Perfil de altura de cada rua: plana, rampa (sobe uma colina) ou ponte (passa sobre água ou entre dois montes).
     * ground(x, z) = altura da rua assentada no chão; isWater(x, z) = célula de água. Devolve Map chave →
     * { kind: 'flat'|'ramp'|'bridge', base, rise?, dir? } — base = altura (na rampa, a da ponta baixa); rise = quanto
     * a rampa sobe; dir = 0..3 (N, L, S, O) para onde ela sobe. Só retas viram ponte; retas e pontas viram rampa.
     */
    profile(ground, isWater, { dip = RoadNetwork.BRIDGE_DIP, span = RoadNetwork.BRIDGE_SPAN, rampMin = RoadNetwork.RAMP_MIN } = {}) {
        const out = new Map();
        const cells = this.list();
        for (const c of cells) out.set(RoadNetwork.key(c.x, c.z), { kind: 'flat', base: ground(c.x, c.z) });

        // Pontes: numa reta, procura nos dois sentidos do eixo o primeiro apoio (terra firme ou terreno bem mais alto)
        for (const c of cells) {
            const piece = this.pieceAt(c.x, c.z);
            if (piece.tipo !== 'reta') continue;
            const axis = piece.rotacao % 2 === 0 ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
            const water = isWater(c.x, c.z);
            const g = ground(c.x, c.z);
            const anchors = axis.map(([dx, dz]) => {
                for (let k = 1; k <= span; k++) {
                    const x = c.x + dx * k, z = c.z + dz * k;
                    if (!this.has(x, z)) return null;
                    const nWater = isWater(x, z);
                    if (water ? !nWater : (!nWater && ground(x, z) >= g + dip)) return { k, h: ground(x, z) };
                    // no meio da ponte só pode haver retas no mesmo eixo
                    const p = this.pieceAt(x, z);
                    if (p.tipo !== 'reta' || p.rotacao % 2 !== piece.rotacao % 2) return null;
                }
                return null;
            });
            if (!anchors[0] || !anchors[1] || anchors[0].k + anchors[1].k - 1 > span) continue;
            const deck = Math.min(anchors[0].h, anchors[1].h);
            if (!water && deck < g + dip) continue;
            out.set(RoadNetwork.key(c.x, c.z), { kind: 'bridge', base: deck, ground: g });
        }

        // Rampas: reta ou ponta plana encostada numa rua bem mais alta, no próprio eixo
        for (const c of cells) {
            const k = RoadNetwork.key(c.x, c.z);
            const me = out.get(k);
            if (me.kind !== 'flat') continue;
            const piece = this.pieceAt(c.x, c.z);
            const dirs = piece.tipo === 'reta' ? (piece.rotacao % 2 === 0 ? [0, 2] : [1, 3]) : piece.tipo === 'ponta' ? [piece.rotacao] : [];
            let best = null;
            for (const dir of dirs) {
                const d = RoadNetwork.DIRS[dir];
                const other = out.get(RoadNetwork.key(c.x + d.dx, c.z + d.dz));
                if (!other) continue;
                const rise = other.base - me.base; // rampa vizinha: a ponta baixa dela (base) é onde esta encosta
                if (rise >= rampMin && (!best || rise > best.rise)) best = { rise, dir };
            }
            if (best) out.set(k, { kind: 'ramp', base: me.base, rise: best.rise, dir: best.dir });
        }
        return out;
    }

    /**
     * Altura da rua na borda da célula c virada para o vizinho n (para os carros): na rampa, a altura daquela ponta;
     * entre duas células planas, a média; ao lado de uma rampa, a ponta da rampa que encosta.
     */
    static edgeHeight(profile, c, n) {
        const pc = profile.get(RoadNetwork.key(c.x, c.z));
        const pn = profile.get(RoadNetwork.key(n.x, n.z));
        const rampEdge = (p, from, to) => {
            const d = RoadNetwork.DIRS[p.dir];
            const dx = to.x - from.x, dz = to.z - from.z;
            if (dx === d.dx && dz === d.dz) return p.base + p.rise;
            if (dx === -d.dx && dz === -d.dz) return p.base;
            return p.base + p.rise / 2;
        };
        if (pc?.kind === 'ramp') return rampEdge(pc, c, n);
        if (pn?.kind === 'ramp') return rampEdge(pn, n, c);
        if (!pc) return pn?.base ?? 0;
        if (!pn) return pc.base;
        return (pc.base + pn.base) / 2;
    }

    /** Altura da rua no centro da célula (meio da rampa). */
    static centerHeight(profile, c) {
        const p = profile.get(RoadNetwork.key(c.x, c.z));
        if (!p) return 0;
        return p.kind === 'ramp' ? p.base + p.rise / 2 : p.base;
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

// Perfil de altura (profile): ponte quando o vão fica BRIDGE_DIP abaixo dos dois apoios (ou é água), até BRIDGE_SPAN
// células de vão; rampa quando a rua vizinha fica RAMP_MIN ou mais acima (degraus menores ficam planos)
RoadNetwork.BRIDGE_DIP = 0.5;
RoadNetwork.BRIDGE_SPAN = 4;
RoadNetwork.RAMP_MIN = 0.15;
