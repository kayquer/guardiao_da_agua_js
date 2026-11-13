/**
 * PropPlanner — decide ONDE fica cada prop de cenário (js/data/props.js). Puro: sem Babylon nem DOM
 * (tests/unit/props.test.js); quem desenha é js/systems/PropSystem.js.
 *
 * Determinístico: cada célula tem um número sorteado fixo por tipo (hash da posição + id), então o mesmo estado
 * da cidade dá sempre os mesmos props nos mesmos lugares (nada precisa ir no save), e quando a quantidade de um
 * tipo sobe os que já estavam ficam e os novos entram em seguida. Prop nunca ocupa a grade (célula com prédio, rua,
 * árvore ou obra não recebe nada).
 *
 * Para não parecer posto à mão numa grade (11/2026):
 *   - a célula se divide em 4 quartos: peça pequena (size ≤ SMALL) usa um quarto, e até 4 dividem o bloco; peça
 *     grande usa a célula inteira, sozinha;
 *   - `clump` põe até N do mesmo tipo na mesma célula (moitas de capim, flores);
 *   - natureza e campo se juntam em manchas (ruído suave, CLUSTER), em vez de pontos soltos espalhados por igual;
 *   - `spacing` afasta dois do mesmo tipo (três hidrantes lado a lado na mesma esquina não acontecem mais).
 *
 * world = { size, terrain(x, z) → tipo, occupied(x, z) → bool, tree(x, z) → bool,
 *           buildings: [{ type, x, z, size, finished, zone: 'residential'|'commercial'|'industrial'|null, road }] }
 * state = { level, pollution (0-100), sewage (bool), deforestation (0-1: parte da mata do começo que caiu),
 *           quality ('high'|'medium'|'low') }
 */
const PropPlanner = {
    FULL: 15, // os 4 quartos da célula ocupados

    /** Número fixo em [0, 1) por célula e semente (hash inteiro, sem Math.random). */
    hash(x, z, seed) {
        let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 1442695041);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    },

    /** Semente estável por id (acrescentar um tipo novo não embaralha os outros). */
    seedOf(id) {
        let h = 2166136261;
        for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
        return h | 0;
    },

    /** Ruído suave em [0, 1]: valores fixos nos cantos de uma grade de `cell` células, interpolados (manchas). */
    noise(x, z, seed, cell) {
        const gx = x / cell, gz = z / cell;
        const x0 = Math.floor(gx), z0 = Math.floor(gz);
        const fx = gx - x0, fz = gz - z0;
        const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
        const h = (a, b) => PropPlanner.hash(a, b, seed);
        const top = h(x0, z0) + (h(x0 + 1, z0) - h(x0, z0)) * sx;
        const bottom = h(x0, z0 + 1) + (h(x0 + 1, z0 + 1) - h(x0, z0 + 1)) * sx;
        return top + (bottom - top) * sz;
    },

    /** Nível da cidade para os props (PROP_LEVELS): o maior que a população OU as missões feitas alcançam. */
    levelFor(population = 0, missions = 0, levels = PROP_LEVELS) {
        let level = 0;
        levels.forEach((l, i) => { if (population >= l.population || missions >= l.missions) level = i; });
        return level;
    },

    /** Distância de Chebyshev (8 vizinhos) até a fonte mais próxima, limitada a `cap` (além disso = cap + 1). */
    distanceField(size, sources, cap) {
        const far = cap + 1;
        const dist = new Uint8Array(size * size).fill(far);
        let frontier = [];
        sources.forEach(([x, z]) => {
            if (x < 0 || z < 0 || x >= size || z >= size || dist[x * size + z] === 0) return;
            dist[x * size + z] = 0;
            frontier.push([x, z]);
        });
        for (let d = 1; d <= cap && frontier.length; d++) {
            const next = [];
            frontier.forEach(([x, z]) => {
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        const nx = x + dx, nz = z + dz;
                        if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
                        if (dist[nx * size + nz] <= d) continue;
                        dist[nx * size + nz] = d;
                        next.push([nx, nz]);
                    }
                }
            });
            frontier = next;
        }
        return dist;
    },

    /** Quanto do máximo de um tipo aparece agora (0-1) e o teto (max, ou perBuilding × prédios prontos). */
    intensity(type, state, counts) {
        let k = 1;
        let cap = type.max;
        if (type.level) {
            if (state.level < type.level) return { k: 0, cap };
            if (state.level === type.level) k *= 0.5;
        }
        if (type.requires) {
            const n = type.requires.reduce((sum, id) => sum + (counts[id] || 0), 0);
            if (!n) return { k: 0, cap };
            cap = Math.min(type.max, (type.perBuilding || type.max) * n);
        }
        const p = state.pollution || 0;
        if (type.pollution) {
            const [from, to] = type.pollution;
            k *= Math.max(0, Math.min(1, (p - from) / Math.max(1, to - from)));
        }
        if (type.cleanBelow) {
            const [gone, full] = type.cleanBelow;
            k *= Math.max(0, Math.min(1, (gone - p) / Math.max(1, gone - full)));
        }
        if (type.deforestation) {
            const [from, to] = type.deforestation;
            k *= Math.max(0, Math.min(1, ((state.deforestation || 0) - from) / Math.max(0.01, to - from)));
        }
        if (type.sewage && !state.sewage) k = 0;
        return { k, cap };
    },

    /** Peça pequena (um quarto da célula) ou grande (célula inteira). */
    isSmall(type, settings = PROP_SETTINGS) {
        return (type.size || 0.5) <= settings.SMALL;
    },

    /** Quarto q (0-3) → centro dele em relação ao centro da célula (célula = 2 unidades: quarto a ±0,5). */
    quarterCenter(q) {
        return [q & 1 ? 0.5 : -0.5, q & 2 ? 0.5 : -0.5];
    },

    /**
     * Plano completo: [{ id, x, z, ox, oz, rot, scale, motion?, phase }] na ordem de PROP_TYPES.
     * `scale` = tamanho final no mundo da maior medida do modelo (type.size × variação); o PropSystem divide pela
     * medida do .glb.
     */
    plan(world, state, types = PROP_TYPES, settings = PROP_SETTINGS) {
        const size = world.size;
        const idx = (x, z) => x * size + z;
        const inside = (x, z) => x >= 0 && z >= 0 && x < size && z < size;
        const isWater = (x, z) => inside(x, z) && world.terrain(x, z) === 'water';

        // Fontes das distâncias: ruas, zonas prontas (casa e comércio), qualquer prédio e cada prédio exigido
        const counts = {};
        const roadCells = [], zoneCells = [], buildCells = [], byType = new Map();
        (world.buildings || []).forEach(b => {
            const cells = [];
            for (let dx = 0; dx < (b.size || 1); dx++) for (let dz = 0; dz < (b.size || 1); dz++) cells.push([b.x + dx, b.z + dz]);
            if (b.road) { roadCells.push(...cells); return; }
            buildCells.push(...cells);
            if (!b.finished) return;
            counts[b.type] = (counts[b.type] || 0) + 1;
            if (b.zone === 'residential' || b.zone === 'commercial') zoneCells.push(...cells);
            if (!byType.has(b.type)) byType.set(b.type, []);
            byType.get(b.type).push(...cells);
        });
        const dZone = PropPlanner.distanceField(size, zoneCells, 2);
        const dBuild = PropPlanner.distanceField(size, buildCells, settings.RURAL_DISTANCE);
        const nearCache = new Map();
        const nearField = ids => {
            const key = ids.join(',');
            if (!nearCache.has(key)) nearCache.set(key, PropPlanner.distanceField(size, ids.flatMap(id => byType.get(id) || []), 3));
            return nearCache.get(key);
        };
        const roadSet = new Set(roadCells.map(([x, z]) => idx(x, z)));
        const isRoad = (x, z) => inside(x, z) && roadSet.has(idx(x, z));
        const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

        const free = (x, z) => !world.occupied(x, z) && !world.tree(x, z) && world.terrain(x, z) !== 'water';
        const grass = (x, z) => { const t = world.terrain(x, z); return t === 'grassland' || t === 'floodplain'; };
        const neighborsWhere = (x, z, test) => N4.filter(([dx, dz]) => test(x + dx, z + dz));
        const fits = {
            land: (x, z) => free(x, z) && grass(x, z),
            hill: (x, z) => free(x, z) && world.terrain(x, z) === 'hill',
            bank: (x, z) => free(x, z) && neighborsWhere(x, z, isWater).length > 0,
            water: (x, z) => isWater(x, z) && !world.occupied(x, z) && N4.some(([dx, dz]) => inside(x + dx, z + dz) && !isWater(x + dx, z + dz)),
            road: (x, z) => free(x, z) && neighborsWhere(x, z, isRoad).length > 0,
            zone: (x, z) => free(x, z) && dZone[idx(x, z)] <= 2,
            city: (x, z) => free(x, z) && grass(x, z) && dBuild[idx(x, z)] <= 3,
            rural: (x, z) => free(x, z) && grass(x, z) && buildCells.length > 0 && dBuild[idx(x, z)] > settings.RURAL_DISTANCE - 1
        };

        const quality = settings.QUALITY[state.quality] ?? 1;
        const density = settings.DENSITY ?? 1;
        const totalCap = Math.round(settings.MAX_TOTAL * quality);
        const used = new Uint8Array(size * size); // bits = quartos ocupados (FULL = célula toda)
        const out = [];
        const ctx = { isWater, isRoad, neighborsWhere };
        for (const [id, type] of Object.entries(types)) {
            if (out.length >= totalCap) break;
            const { k, cap } = PropPlanner.intensity(type, state, counts);
            let want = Math.round(cap * k * quality * density);
            if (k > 0 && want === 0 && cap > 0) want = 1; // o primeiro aparece logo (sinal visível de mudança)
            if (want <= 0) continue;
            const seed = PropPlanner.seedOf(id);
            const fit = type.place === 'near' ? ((x, z) => free(x, z) && nearField(type.requires)[idx(x, z)] <= 3) : fits[type.place];
            if (!fit) continue;
            const small = PropPlanner.isSmall(type, settings);
            const cluster = settings.CLUSTER?.[type.group] || 0;
            const groupSeed = PropPlanner.seedOf(type.group);
            const cands = [];
            for (let x = 0; x < size; x++) {
                for (let z = 0; z < size; z++) {
                    const u = used[idx(x, z)];
                    if ((small ? u === PropPlanner.FULL : u !== 0) || !fit(x, z)) continue;
                    let key = PropPlanner.hash(x, z, seed);
                    if (cluster) key *= 1 - cluster * PropPlanner.noise(x, z, groupSeed, settings.CLUSTER_CELLS || 6);
                    cands.push([key, x, z]);
                }
            }
            cands.sort((a, b) => a[0] - b[0]);
            const spacing = type.spacing ?? settings.SPACING?.[type.group] ?? 0;
            const blocked = spacing > 1 ? new Uint8Array(size * size) : null;
            for (let i = 0; i < cands.length && want > 0 && out.length < totalCap; i++) {
                const [, x, z] = cands[i];
                if (blocked?.[idx(x, z)]) continue;
                const quarters = small ? PropPlanner.pickQuarters(type, x, z, seed, used[idx(x, z)], want, ctx) : [null];
                if (!quarters.length) continue;
                for (const q of quarters) {
                    used[idx(x, z)] |= q === null ? PropPlanner.FULL : 1 << q;
                    want--;
                    out.push(PropPlanner.transform(id, type, x, z, seed + (q ?? 0) * 7, q, ctx, settings));
                }
                if (blocked) {
                    for (let dx = 1 - spacing; dx < spacing; dx++) {
                        for (let dz = 1 - spacing; dz < spacing; dz++) {
                            if (inside(x + dx, z + dz)) blocked[idx(x + dx, z + dz)] = 1;
                        }
                    }
                }
            }
        }
        return out;
    },

    /**
     * Quartos livres da célula para uma peça pequena: até `clump` (e até o que ainda falta), em ordem sorteada. Com
     * `face`, só os quartos do lado da água/rua (a peça encosta nela).
     */
    pickQuarters(type, x, z, seed, usedBits, want, { isWater, isRoad, neighborsWhere }) {
        let order = [0, 1, 2, 3].sort((a, b) => PropPlanner.hash(x, z, seed + 11 + a) - PropPlanner.hash(x, z, seed + 11 + b));
        const test = type.face === 'water' ? isWater : type.face === 'road' ? isRoad : null;
        if (test) {
            const sides = neighborsWhere(x, z, test);
            if (sides.length) {
                const [dx, dz] = sides[Math.floor(PropPlanner.hash(x, z, seed + 4) * sides.length)];
                order = order.filter(q => {
                    const [qx, qz] = PropPlanner.quarterCenter(q);
                    return dx ? Math.sign(qx) === dx : Math.sign(qz) === dz;
                });
            }
        }
        const n = Math.max(1, Math.min(type.clump || 1, want));
        return order.filter(q => !(usedBits & (1 << q))).slice(0, n);
    },

    /**
     * Posição dentro da célula, giro e escala. Com `face` a frente (-Z do modelo) vira para a água/rua vizinha e
     * o prop encosta daquele lado; sem, giro sorteado. Yaw no Babylon: (0, 0, -1) girado por θ = (-sen θ, -cos θ).
     * q = quarto da célula (peça pequena) ou null (célula inteira).
     */
    transform(id, type, x, z, seed, q, { isWater, isRoad, neighborsWhere }, settings) {
        const r1 = PropPlanner.hash(x, z, seed + 1), r2 = PropPlanner.hash(x, z, seed + 2);
        const r3 = PropPlanner.hash(x, z, seed + 3), r4 = PropPlanner.hash(x, z, seed + 4);
        const j = q === null ? settings.JITTER : settings.QUARTER_JITTER;
        const [cx, cz] = q === null ? [0, 0] : PropPlanner.quarterCenter(q);
        let ox = cx + (r1 - 0.5) * 2 * j, oz = cz + (r2 - 0.5) * 2 * j;
        let rot = r3 * Math.PI * 2;
        const test = type.face === 'water' ? isWater : type.face === 'road' ? isRoad : null;
        const sides = test ? neighborsWhere(x, z, test) : [];
        if (sides.length) {
            let [dx, dz] = sides[Math.floor(r4 * sides.length)];
            if (q !== null) {
                // o quarto já foi escolhido do lado da água/rua: vira para o lado em que ele está
                const match = sides.find(([sx, sz]) => (sx ? Math.sign(cx) === sx : Math.sign(cz) === sz));
                if (match) [dx, dz] = match;
            }
            rot = Math.atan2(-dx, -dz);
            // encosta do lado da água/rua (a borda da célula fica a 1 unidade do centro); no outro eixo, o quarto
            ox = dx ? dx * 0.62 : (q === null ? ox * 0.6 : cx + (r1 - 0.5) * 0.3);
            oz = dz ? dz * 0.62 : (q === null ? oz * 0.6 : cz + (r2 - 0.5) * 0.3);
        }
        const scale = (type.size || 0.5) * (0.85 + 0.3 * r4);
        const out = { id, x, z, ox, oz, rot, scale, phase: r1 * Math.PI * 2 };
        if (type.motion) out.motion = type.motion;
        return out;
    }
};

if (typeof window !== 'undefined') window.PropPlanner = PropPlanner;
