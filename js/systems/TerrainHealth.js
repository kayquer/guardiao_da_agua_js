/**
 * Saúde do pedaço de chão ou de rio clicado (painel de terreno, ui/TerrainHealthUI.js). Sem DOM nem Babylon.
 *
 *   TerrainHealth.collect(gameManager, x, z) → snapshot (lê o estado real do jogo; só leitura)
 *   TerrainHealth.evaluate(snapshot)         → { kind, indicators, score, level, levelWord, species }
 *
 * evaluate é pura: tudo o que ela precisa vem no snapshot, por isso os testes montam um à mão. Pesos, limites e
 * textos em js/data/terrainHealth.js (TERRAIN_HEALTH).
 *
 * Snapshot: { zone ('grassland'|'app'|'floodplain'|'hill'|'water'), slope 0-1, waterDistance (quadrados),
 *   riparianCell, cover 0-1 (parte das células em volta com árvore), treeHere, riparianCover 0-1, impervious 0-1,
 *   absorbers, dirtRoads, polluters (poluição/min somada, caindo com a distância), cityPollution 0-100,
 *   sewage (esgoto sem tratar, poluição/min), treatment (ETE/filtros prontos), rain 0-1, storm, drought, hot,
 *   river 0-100, deforestation 0-1, bareBanks 0-1, species [{ id, name, icon, known }] }
 */
const TerrainHealth = {
    clamp(v, lo = 0, hi = 100) {
        return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : 0));
    },

    /** Nota 0-100 → 'good' | 'ok' | 'bad'. */
    levelOf(score) {
        const L = TERRAIN_HEALTH.LEVELS;
        return score >= L.good ? 'good' : score >= L.ok ? 'ok' : 'bad';
    },

    /** Quanto o valor é bom (0-100), pela direção do indicador. */
    goodness(rule, value) {
        if (rule.better === 'low') return 100 - value;
        if (Array.isArray(rule.better)) {
            const [lo, hi] = rule.better;
            if (value < lo) return this.clamp(100 - (lo - value) * (100 / lo));
            if (value > hi) return this.clamp(100 - (value - hi) * (60 / (100 - hi)));
            return 100;
        }
        return value;
    },

    /** Palavra da quantidade (rule.words: [[a partir de, palavra], ...] em ordem). */
    wordFor(rule, value) {
        let word = rule.words[0][1];
        for (const [from, w] of rule.words) if (value >= from) word = w;
        return word;
    },

    /** Um indicador a partir das parcelas [chave, delta] somadas à base. */
    build(id, rule, base, parts, extra = {}) {
        const value = Math.round(this.clamp(base + parts.reduce((sum, [, d]) => sum + d, 0)));
        const score = Math.round(this.goodness(rule, value));
        const level = this.levelOf(score);
        // O que ajuda/atrapalha: o sinal depende da direção (menos poluição é bom; umidade demais é ruim)
        const sign = rule.better === 'low' ? -1 : Array.isArray(rule.better) && value > rule.better[1] ? -1 : 1;
        const helps = [];
        const hurts = [];
        parts.filter(([, d]) => Math.abs(d) >= 2)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .forEach(([key, d]) => {
                const good = d * sign > 0;
                const label = this.factorLabel(key, good);
                const list = good ? helps : hurts;
                if (label && !list.includes(label) && list.length < 2) list.push(label);
            });
        return {
            id, label: rule.label, icon: rule.icon, value, score, level,
            levelWord: TERRAIN_HEALTH.LEVEL_WORDS[level], word: this.wordFor(rule, value),
            helps, hurts, why: this.whyLine(helps, hurts, rule.moves), moves: rule.moves, ...extra
        };
    },

    factorLabel(key, good) {
        const label = TERRAIN_HEALTH.FACTORS[key];
        if (Array.isArray(label)) return good ? label[0] : label[1];
        return label || '';
    },

    /** A linha de baixo do indicador: o que está mexendo nele aqui, agora (ou a regra geral). */
    whyLine(helps, hurts, moves) {
        const join = list => (list.length > 1 ? `${list[0]} e ${list[1]}` : list[0]);
        const out = [];
        if (helps.length) out.push(`Ajuda: ${join(helps)}.`);
        if (hurts.length) out.push(`Atrapalha: ${join(hurts)}.`);
        return out.length ? out.join(' ') : moves;
    },

    evaluate(snap) {
        const s = { ...TerrainHealth.EMPTY, ...(snap || {}) };
        const kind = s.zone === 'water' ? 'water' : 'soil';
        const indicators = kind === 'water' ? this.evaluateWater(s) : this.evaluateSoil(s);
        const W = TERRAIN_HEALTH.WEIGHTS;
        let total = 0;
        let weight = 0;
        indicators.forEach(ind => {
            const w = W[ind.id] ?? 1;
            total += ind.score * w;
            weight += w;
        });
        const score = Math.round(weight ? total / weight : 0);
        const level = this.levelOf(score);
        return { kind, indicators, score, level, levelWord: TERRAIN_HEALTH.LEVEL_WORDS[level], species: s.species || [] };
    },

    evaluateSoil(s) {
        const R = TERRAIN_HEALTH.soil;
        const riparian = s.riparianCell || s.zone === 'app' || s.zone === 'floodplain';

        const m = R.moisture;
        const moisture = this.build('moisture', m, m.base, [
            ['nearWater', Math.max(0, m.nearWater - m.perCell * Math.max(0, s.waterDistance - 1))],
            ['zone', m.zone[s.zone] || 0],
            ['rain', m.rain * s.rain],
            ['drought', s.drought ? m.drought : 0],
            ['cover', m.cover * s.cover],
            ['impervious', m.impervious * s.impervious]
        ]);

        const i = R.infiltration;
        const infiltration = this.build('infiltration', i, i.base[s.zone] ?? i.base.grassland, [
            ['slope', i.slope * s.slope],
            ['impervious', i.impervious * s.impervious],
            ['cover', i.cover * s.cover],
            ['absorber', Math.min(i.absorberMax, i.absorber * s.absorbers)],
            ['soaked', moisture.value > m.better[1] ? i.soaked : 0]
        ]);

        const c = R.cover;
        const steep = s.zone === 'hill' || s.slope > 0.5;
        const cover = this.build('cover', c, c.base, [
            ['cover', c.cover * s.cover],
            ['treeHere', s.treeHere ? c.treeHere : 0],
            ['riparian', riparian ? c.riparian * Math.min(1, s.cover * 2) : 0],
            ['deforestation', c.deforestation * s.deforestation],
            ['bareSlope', steep && s.cover < 0.2 ? c.bareSlope : 0]
        ]);

        const p = R.pollution;
        const pollution = this.build('pollution', p, 0, [
            ['city', p.city * s.cityPollution],
            ['polluters', Math.min(p.pollutersMax, p.polluters * s.polluters)],
            ['cover', p.cover * s.cover]
        ]);

        const e = R.erosion;
        const bare = 1 - s.cover;
        const erosion = this.build('erosion', e, 0, [
            ['slope', e.slope * s.slope],
            ['bare', e.bare * bare],
            ['rain', e.rain * s.rain * bare],
            ['dirtRoad', Math.min(e.dirtRoadMax, e.dirtRoad * s.dirtRoads)],
            ['deforestation', e.deforestation * s.deforestation],
            ['absorber', Math.max(-3 * Math.abs(e.absorber), e.absorber * s.absorbers)],
            ['bareBank', riparian && s.cover < 0.2 ? e.bareBank : 0]
        ]);

        return [infiltration, moisture, cover, pollution, erosion];
    },

    evaluateWater(s) {
        const R = TERRAIN_HEALTH.water;
        const sewageShare = Math.min(1, s.sewage / TERRAIN_HEALTH.SEWAGE_FULL);

        const o = R.oxygen;
        const oxygen = this.build('oxygen', o, o.base, [
            ['city', o.city * s.cityPollution],
            ['sewage', o.sewage * sewageShare],
            ['polluters', -Math.min(o.pollutersMax, -o.polluters * s.polluters)],
            ['treatment', Math.min(o.treatmentMax, o.treatment * s.treatment)],
            ['riparian', o.riparian * s.riparianCover],
            ['flow', (s.river - 50) * o.flow],
            ['heat', s.hot && s.riparianCover < 0.3 ? o.heat : 0]
        ]);

        const t = R.turbidity;
        const turbidity = this.build('turbidity', t, t.base, [
            ['city', t.city * s.cityPollution],
            ['bareBanks', t.bareBanks * s.bareBanks],
            ['dirtRoad', Math.min(t.dirtRoadMax, t.dirtRoad * s.dirtRoads)],
            ['rain', t.rain * s.rain],
            ['storm', s.storm ? t.storm : 0],
            ['lowRiver', s.river < 30 ? t.lowRiver : 0],
            ['riparian', t.riparian * s.riparianCover]
        ]);

        const river = this.build('river', R.river, s.river, []);

        const h = R.shade;
        const shade = this.build('shade', h, h.base, [
            ['riparian', h.riparian * s.riparianCover],
            ['hot', s.hot ? h.hot : 0],
            ['drought', s.drought ? h.drought : 0]
        ]);

        // Vida aquática: média ponderada das notas acima + bichos que já estão por perto
        const l = R.life;
        const parts = { oxygen, turbidity, river, shade };
        const lifeParts = Object.entries(l.weights).map(([id, w]) => [`life_${id}`, w * parts[id].score]);
        const species = s.species || [];
        const bonus = Math.min(l.speciesMax, l.perSpecies * species.length);
        const value = lifeParts.reduce((sum, [, d]) => sum + d, 0);
        // Para a linha "Ajuda/Atrapalha": só as partes boas (ajudam) e ruins (atrapalham); as de atenção não entram
        const why = Object.entries(l.weights).map(([id, w]) => {
            const part = parts[id];
            return [`life_${id}`, part.level === 'ok' ? 0 : w * (part.score - 50)];
        });
        if (bonus) why.push(['species', bonus]);
        const life = this.build('life', l, 0, why, { species });
        const lifeValue = Math.round(this.clamp(value + bonus));
        Object.assign(life, {
            value: lifeValue, score: lifeValue, level: this.levelOf(lifeValue),
            levelWord: TERRAIN_HEALTH.LEVEL_WORDS[this.levelOf(lifeValue)], word: this.wordFor(l, lifeValue)
        });

        return [oxygen, turbidity, river, shade, life];
    },

    // ===== Leitura do jogo (sem DOM) =====
    /** Monta o snapshot da célula (x, z) a partir do estado real da simulação. */
    collect(gm, x, z) {
        const C = TERRAIN_HEALTH;
        const grid = gm?.gridManager;
        const rm = gm?.resourceManager;
        const bs = gm?.buildingSystem;
        const trees = gm?.treeSystem;
        const events = gm?.eventSystem;
        const size = grid?.gridSize || 40;
        const inMap = (cx, cz) => cx >= 0 && cz >= 0 && cx < size && cz < size;
        const typeAt = (cx, cz) => grid?.getTerrainType?.(cx, cz);
        const zone = grid?.getTerrainZone?.(x, z) || typeAt(x, z) || 'grassland';
        const isWater = zone === 'water';

        // Árvores: nativas (TreeSystem) + mudas plantadas prontas
        const treeCells = new Set(trees?.trees ? trees.trees.keys() : []);
        const buildings = bs?.buildings ? [...bs.buildings.values()] : [];
        buildings.forEach(b => { if (b.config?.plantedTree && !b.underConstruction) treeCells.add(`${b.gridX},${b.gridZ}`); });

        // Cobertura: parte da terra em volta (RADIUS) com árvore
        const coverOf = (r) => {
            let land = 0;
            let withTree = 0;
            for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
                const cx = x + dx;
                const cz = z + dz;
                if (!inMap(cx, cz) || typeAt(cx, cz) === 'water') continue;
                land++;
                if (treeCells.has(`${cx},${cz}`)) withTree++;
            }
            return land ? withTree / land : 0;
        };
        const cover = coverOf(C.RADIUS);
        const bankCover = isWater ? coverOf(C.BANK_RADIUS) : cover;

        // Inclinação: maior diferença de altura para um vizinho de terra (encosta ≥ 0,7)
        let slope = 0;
        if (!isWater && grid?.getTerrainBlockHeight) {
            const h = grid.getTerrainBlockHeight(x, z);
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
                const cx = x + dx;
                const cz = z + dz;
                if (!inMap(cx, cz) || typeAt(cx, cz) === 'water') return;
                slope = Math.max(slope, Math.abs(grid.getTerrainBlockHeight(cx, cz) - h) / C.SLOPE_FULL);
            });
            slope = Math.min(1, slope);
            if (zone === 'hill') slope = Math.max(0.7, slope);
        }

        // Distância até a água (quadrados, até 10)
        let waterDistance = isWater ? 0 : 10;
        if (!isWater) {
            for (let r = 1; r < 10 && waterDistance === 10; r++) {
                for (let dx = -r; dx <= r && waterDistance === 10; dx++) for (let dz = -r; dz <= r; dz++) {
                    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
                    if (typeAt(x + dx, z + dz) === 'water') { waterDistance = r; break; }
                }
            }
        }

        // Prédios e ruas em volta
        const area = (2 * C.RADIUS + 1) ** 2;
        let imperviousSum = 0;
        let absorbers = 0;
        let dirtRoads = 0;
        let polluters = 0;
        let treatment = 0;
        let treatmentCapacity = 0;
        buildings.forEach(b => {
            const config = b.config || {};
            const s = config.size || 1;
            const dx = Math.max(0, b.gridX - x, x - (b.gridX + s - 1));
            const dz = Math.max(0, b.gridZ - z, z - (b.gridZ + s - 1));
            const d = Math.max(dx, dz);
            const done = !b.underConstruction;
            if (d <= C.RADIUS && !config.plantedTree && !(config.runoffAbsorption > 0)) {
                // Células do prédio dentro da janela × quanto do chão ele cobre
                const ox = Math.max(0, Math.min(b.gridX + s - 1, x + C.RADIUS) - Math.max(b.gridX, x - C.RADIUS) + 1);
                const oz = Math.max(0, Math.min(b.gridZ + s - 1, z + C.RADIUS) - Math.max(b.gridZ, z - C.RADIUS) + 1);
                const share = Number.isFinite(config.runoffImpervious) ? config.runoffImpervious : config.roadType ? 1 : C.ROOF_IMPERVIOUS;
                imperviousSum += ox * oz * share;
            }
            if (!done) return;
            if (config.runoffAbsorption > 0 && d <= C.RADIUS + 1) absorbers++;
            if ((config.roadType === 'dirt' || config.roadType === 'gravel') && d <= C.BANK_RADIUS) {
                dirtRoads += config.roadType === 'dirt' ? 1 : 0.5;
            }
            const gen = config.pollutionGeneration || 0;
            if (gen > 0 && d <= C.POLLUTER_RADIUS) {
                const scale = config.zoneType ? (bs.getZoneResourceScale?.(b) ?? 1) : 1;
                polluters += gen * scale / (1 + d);
            }
            if (C.TREATMENT.includes(b.type)) {
                treatment++;
                treatmentCapacity += config.pollutionReduction || 0;
            }
        });

        // Margem de uma célula de água: terra até BANK_RADIUS sem árvore
        let bareBanks = 0;
        if (isWater) bareBanks = 1 - bankCover;

        const profile = gm?.weatherEffects?.profile || {};
        const hasEvent = type => !!events?.hasActiveEventOfType?.(type);
        const storm = hasEvent('heavy_rain') || hasEvent('flood') || profile.kind === 'storm';
        const balance = rm?.getPollutionBalance?.() || { sewage: 0 };

        // Bichos do caderno de campo perto daqui (o nome só se o jogador já registrou)
        const seen = new Set();
        const species = [];
        const notebook = typeof FIELD_NOTEBOOK !== 'undefined' ? FIELD_NOTEBOOK : {};
        (gm?.propSystem?.placements || []).forEach(p => {
            if (!notebook[p.id] || seen.has(p.id)) return;
            if (Math.max(Math.abs(p.x - x), Math.abs(p.z - z)) > C.SPECIES_RADIUS) return;
            seen.add(p.id);
            const entry = notebook[p.id];
            species.push({ id: p.id, name: entry.name, icon: entry.icon, known: !!gm?.fieldNotebook?.isRegistered?.(p.id) });
        });

        const riparianCell = !isWater && typeof TreeSystem !== 'undefined' && grid
            ? TreeSystem.isRiparianCell(grid, x, z) : false;

        return {
            zone, slope, waterDistance, riparianCell, cover, treeHere: treeCells.has(`${x},${z}`),
            riparianCover: isWater ? bankCover : (riparianCell ? cover : 0),
            impervious: Math.min(1, imperviousSum / area), absorbers, dirtRoads, polluters,
            cityPollution: rm?.resources?.pollution?.current || 0,
            sewage: Math.max(0, (balance.sewage || 0) - treatmentCapacity), treatment,
            rain: Math.max(profile.rain || 0, storm ? 1 : 0), storm, drought: hasEvent('drought'), hot: !!profile.hot,
            river: rm?.getRiverLevel?.() ?? 100,
            deforestation: trees?.initialCount ? Math.max(0, 1 - trees.trees.size / trees.initialCount) : 0,
            bareBanks, species
        };
    }
};

/** Valores neutros: o que falta no snapshot vem daqui. */
TerrainHealth.EMPTY = {
    zone: 'grassland', slope: 0, waterDistance: 10, riparianCell: false, cover: 0, treeHere: false, riparianCover: 0,
    impervious: 0, absorbers: 0, dirtRoads: 0, polluters: 0, cityPollution: 0, sewage: 0, treatment: 0, rain: 0,
    storm: false, drought: false, hot: false, river: 100, deforestation: 0, bareBanks: 0, species: []
};

window.TerrainHealth = TerrainHealth;
