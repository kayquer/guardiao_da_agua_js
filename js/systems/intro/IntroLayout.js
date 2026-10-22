/**
 * ===== INTRO: MAPA DA CIDADE (sem Babylon, sem DOM — testável em tests/unit/intro.test.js) =====
 * Lê INTRO_CITY (js/data/introCity.js) e monta o mapa de células que a IntroCinematic desenha:
 *   kind[x][z]   'grass' | 'river' | 'bank' | 'road' | 'bridge' | 'plaza' | 'field'
 *   height[x][z] altura do bloco de terreno (cidade plana; colinas na borda e no planalto das eólicas)
 *   buildings    [{ type, x, z, size, rot, scale, cx, cz, baseY }] (cx/cz = centro em unidades do mundo)
 *   trees        [{ x, z, y, scale, pine }] (unidades do mundo, posição sorteada com semente fixa)
 *   errors       textos de problemas no layout (prédio sobre o rio, sobreposto, fora do mapa...)
 * Coordenadas: célula (x, z) de INTRO_CITY.bounds.min até max-1; 1 célula = INTRO_CITY.cellSize unidades;
 * x cresce para o leste, z para o norte; o centro do mundo é o centro do núcleo (core) da cidade.
 */
class IntroLayout {
    constructor(city, buildingTypes = (typeof BUILDING_TYPES !== 'undefined' ? BUILDING_TYPES : {})) {
        this.city = city;
        this.types = buildingTypes;
        this.min = city.bounds.min;
        this.max = city.bounds.max;
        this.cellSize = city.cellSize;
        const core = city.core;
        this.originX = (core.x0 + core.x1 + 1) / 2;
        this.originZ = (core.z0 + core.z1 + 1) / 2;
        this.errors = [];
        this.rand = IntroLayout.prng(city.seed || 1);

        const n = this.max - this.min;
        this.kind = Array.from({ length: n }, () => new Array(n).fill('grass'));
        this.height = Array.from({ length: n }, () => new Array(n).fill(city.groundHeight));
        this.occupied = Array.from({ length: n }, () => new Array(n).fill(null));

        this.paintTerrain();
        this.paintRoads();
        this.placeBuildings();
        this.scatterTrees();
    }

    /** Gerador pseudoaleatório com semente (mulberry32): a cidade sai igual toda vez. */
    static prng(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    inBounds(x, z) { return x >= this.min && x < this.max && z >= this.min && z < this.max; }
    getKind(x, z) { return this.inBounds(x, z) ? this.kind[x - this.min][z - this.min] : null; }
    setKind(x, z, k) { if (this.inBounds(x, z)) this.kind[x - this.min][z - this.min] = k; }
    getHeight(x, z) { return this.inBounds(x, z) ? this.height[x - this.min][z - this.min] : 0; }
    isCore(x, z) {
        const c = this.city.core;
        return x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1;
    }

    /** Centro da célula (ou de um ponto em células) em unidades do mundo. */
    toWorld(cx, cz) {
        return { x: (cx - this.originX) * this.cellSize, z: (cz - this.originZ) * this.cellSize };
    }

    /** Distância (em células) do centro da célula até o eixo do rio. */
    riverDistance(px, pz) {
        const pts = this.city.river.path;
        let best = Infinity;
        for (let i = 0; i < pts.length - 1; i++) {
            const [ax, az] = pts[i];
            const [bx, bz] = pts[i + 1];
            const dx = bx - ax, dz = bz - az;
            const len2 = dx * dx + dz * dz || 1;
            const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
            const qx = ax + dx * t - px, qz = az + dz * t - pz;
            best = Math.min(best, Math.hypot(qx, qz));
        }
        return best;
    }

    paintTerrain() {
        const { river, hills = [], plateaus = [], plazas = [], fields = [], groundHeight } = this.city;
        const c = this.city.core;
        for (let x = this.min; x < this.max; x++) {
            for (let z = this.min; z < this.max; z++) {
                const i = x - this.min, j = z - this.min;
                const d = this.riverDistance(x + 0.5, z + 0.5);
                if (d < river.halfWidth) this.kind[i][j] = 'river';
                else if (d < river.halfWidth + river.bank) this.kind[i][j] = 'bank';

                // Colinas: fora do núcleo o chão sobe aos poucos (moldura da cidade) + morros pontuais
                let h = groundHeight;
                const out = Math.max(c.x0 - x, x - c.x1, c.z0 - z, z - c.z1, 0);
                if (out > 0) h += Math.min(3.2, out * 0.32) * (0.75 + 0.5 * this.noise(x, z));
                for (const hill of hills) {
                    const r = Math.hypot(x + 0.5 - hill.x, z + 0.5 - hill.z) / hill.r;
                    if (r < 1) h += hill.h * (1 - r * r);
                }
                for (const p of plateaus) {
                    if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) h = Math.max(h, groundHeight + p.h);
                }
                if (this.kind[i][j] === 'river') h = river.bedHeight;
                else if (this.kind[i][j] === 'bank') h = Math.min(h, groundHeight);
                // Degraus do voxel: alturas em múltiplos de 0.25
                this.height[i][j] = Math.round(h * 4) / 4;
            }
        }
        for (const p of plazas) this.fillRect(p, 'plaza');
        for (const f of fields) this.fillRect(f, 'field');
    }

    fillRect(r, kind) {
        for (let x = r.x0; x <= r.x1; x++) {
            for (let z = r.z0; z <= r.z1; z++) {
                if (this.getKind(x, z) !== 'river') this.setKind(x, z, kind);
            }
        }
    }

    /** Ruído suave e determinístico (0..1) para variar colinas e cores. */
    noise(x, z) {
        const s = Math.sin(x * 0.37 + z * 0.11) * 0.5 + Math.sin(z * 0.29 - x * 0.17) * 0.35 + Math.sin((x + z) * 0.71) * 0.15;
        return (s + 1) / 2;
    }

    paintRoads() {
        for (const [x0, z0, x1, z1] of this.city.roads) {
            if (x0 !== x1 && z0 !== z1) this.errors.push(`rua não é reta: ${[x0, z0, x1, z1]}`);
            for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
                for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
                    if (!this.inBounds(x, z)) { this.errors.push(`rua fora do mapa em ${x},${z}`); continue; }
                    const k = this.getKind(x, z);
                    this.setKind(x, z, k === 'river' || k === 'bridge' ? 'bridge' : 'road');
                    if (k !== 'river' && k !== 'bridge') this.height[x - this.min][z - this.min] = this.city.groundHeight;
                }
            }
        }
    }

    placeBuildings() {
        this.buildings = [];
        for (const [type, x, z, rot = 0, scale = 1] of this.city.buildings) {
            const info = this.types[type];
            if (!info) { this.errors.push(`prédio desconhecido: ${type}`); continue; }
            const size = info.size || 1;
            const onWater = (this.city.onWater || []).includes(type);
            let baseY = -Infinity;
            let ok = true;
            for (let i = x; i < x + size; i++) {
                for (let j = z; j < z + size; j++) {
                    const k = this.getKind(i, j);
                    if (k === null) { this.errors.push(`${type} em ${x},${z} sai do mapa`); ok = false; break; }
                    if (this.occupied[i - this.min][j - this.min]) {
                        this.errors.push(`${type} em ${x},${z} sobrepõe ${this.occupied[i - this.min][j - this.min]}`);
                        ok = false;
                    }
                    if (k === 'road' || k === 'bridge') { this.errors.push(`${type} em ${x},${z} sobre a rua (${i},${j})`); ok = false; }
                    if (k === 'river' && !onWater) { this.errors.push(`${type} em ${x},${z} dentro do rio (${i},${j})`); ok = false; }
                    baseY = Math.max(baseY, k === 'river' ? this.city.river.waterLevel : this.getHeight(i, j));
                }
                if (!ok) break;
            }
            if (!ok) continue;
            for (let i = x; i < x + size; i++) {
                for (let j = z; j < z + size; j++) {
                    this.occupied[i - this.min][j - this.min] = `${type}@${x},${z}`;
                    // Chão sob o prédio fica nivelado (sem bloco de colina atravessando o modelo)
                    if (this.getKind(i, j) !== 'river') this.height[i - this.min][j - this.min] = baseY;
                }
            }
            const center = this.toWorld(x + size / 2, z + size / 2);
            this.buildings.push({ type, x, z, size, rot, scale, cx: center.x, cz: center.z, baseY });
        }
    }

    /** Árvores: mata ciliar densa nas margens, bosques nas colinas, poucas soltas na cidade. */
    scatterTrees() {
        this.trees = [];
        const density = this.city.treeDensity;
        for (let x = this.min; x < this.max; x++) {
            for (let z = this.min; z < this.max; z++) {
                const k = this.getKind(x, z);
                if (this.occupied[x - this.min][z - this.min]) continue;
                let p;
                if (k === 'bank') p = density.bank;
                else if (k === 'grass') {
                    // Mata em volta da cidade; mais longe (já na neblina) rareia — menos árvores para desenhar
                    const c = this.city.core;
                    const out = Math.max(c.x0 - x, x - c.x1, c.z0 - z, z - c.z1, 0);
                    const fade = Math.max(0.12, Math.min(1, 1 - (out - 14) / 12));
                    p = this.isCore(x, z) ? density.city : density.wild * fade * (0.4 + this.noise(x * 1.7, z * 1.3));
                }
                else continue;
                // Não plantar colado na rua (deixa a calçada livre)
                if (k === 'grass' && this.isCore(x, z) && this.touches(x, z, ['road', 'plaza'])) p *= 0.3;
                const count = this.rand() < p ? (this.rand() < 0.45 ? 2 : 1) : 0;
                for (let t = 0; t < count; t++) {
                    const w = this.toWorld(x + 0.2 + this.rand() * 0.6, z + 0.2 + this.rand() * 0.6);
                    this.trees.push({
                        x: w.x, z: w.z, y: this.getHeight(x, z),
                        scale: 0.75 + this.rand() * 0.6,
                        pine: !this.isCore(x, z) && this.rand() < 0.45
                    });
                }
            }
        }
    }

    touches(x, z, kinds) {
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => kinds.includes(this.getKind(x + dx, z + dz)));
    }

    /** Mapa em texto (depuração e teste): ~ rio, = rua/ponte, . grama, , margem, # prédio, : praça. */
    toAscii() {
        const sym = { river: '~', bank: ',', road: '=', bridge: 'H', plaza: ':', field: '"', grass: '.' };
        const rows = [];
        for (let z = this.max - 1; z >= this.min; z--) {
            let row = '';
            for (let x = this.min; x < this.max; x++) {
                row += this.occupied[x - this.min][z - this.min] ? '#' : sym[this.getKind(x, z)];
            }
            rows.push(row);
        }
        return rows.join('\n');
    }
}
