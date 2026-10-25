// Zonas que crescem (js/data/zoneLots.js + js/systems/building/ZoneGrowth.js): dados dos lotes
// (4 fases por zona, arquivos que existem, peças dentro do lote) e as regras de crescimento sem Babylon.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/data/zoneLots.js',
    'js/systems/BuildingSystem.js', 'js/systems/building/ZoneGrowth.js', 'js/core/ResourceManager.js');
const ResourceManager = g('ResourceManager');
const EVOLUTION = g('ZONE_EVOLUTION');
const BUILDINGS = g('BUILDING_TYPES');
const LOTS = g('ZONE_LOTS');
const PROPS = g('ZONE_PROPS');
const GROWTH = g('ZONE_GROWTH');
const MODEL_SCALE = g('ZONE_LOT_MODEL_SCALE');
const BuildingSystem = g('BuildingSystem');
const MODELS_DIR = path.join(ROOT, 'models', 'buildings');

/** Caixa envolvente (x/z) de um .glb com as transformações dos nós (TRS) aplicadas, em unidades do modelo. */
function glbFootprint(file) {
    const data = fs.readFileSync(file);
    const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString('utf8'));
    const local = n => {
        if (n.matrix) return n.matrix;
        const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
        const [sx, sy, sz] = n.scale || [1, 1, 1];
        const [tx, ty, tz] = n.translation || [0, 0, 0];
        return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
            2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
            2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
    };
    const mul = (a, b) => {
        const o = new Array(16).fill(0);
        for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
        return o;
    };
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const visit = (i, parent) => {
        const node = json.nodes[i];
        const m = mul(parent, local(node));
        if (node.mesh !== undefined) {
            for (const p of json.meshes[node.mesh].primitives) {
                const a = json.accessors[p.attributes.POSITION];
                for (let c = 0; c < 8; c++) {
                    const v = [c & 1 ? a.max[0] : a.min[0], c & 2 ? a.max[1] : a.min[1], c & 4 ? a.max[2] : a.min[2]];
                    for (let r = 0; r < 3; r++) {
                        const w = m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r];
                        min[r] = Math.min(min[r], w);
                        max[r] = Math.max(max[r], w);
                    }
                }
            }
        }
        (node.children || []).forEach(c => visit(c, m));
    };
    json.scenes[json.scene || 0].nodes.forEach(i => visit(i, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
    return { w: max[0] - min[0], d: max[2] - min[2] };
}

/** Planta da peça em células (já girada): o centro é (x, z) — o carregador centra cada modelo. */
function pieceFootprint(piece) {
    const s = piece.scale || 1;
    let w, d;
    if (piece.file.startsWith('prop:')) {
        const spec = PROPS[piece.file.slice(5)];
        w = (piece.w || 1) * spec.w * s;
        d = (piece.d || 1) * spec.d * s;
    } else {
        const box = glbFootprint(path.join(MODELS_DIR, piece.file));
        w = box.w * MODEL_SCALE * s;
        d = box.d * MODEL_SCALE * s;
    }
    return (piece.rot || 0) % 2 ? { w: d, d: w } : { w, d };
}

test('lotes: toda zona de BUILDING_TYPES tem lote com 4 fases, e todo lote é de uma zona', () => {
    const zones = Object.entries(BUILDINGS).filter(([, t]) => t.zoneType).map(([id]) => id);
    assert.strictEqual(zones.length, 9);
    for (const id of zones) {
        assert.ok(LOTS[id], `${id} sem lote em ZONE_LOTS`);
        assert.strictEqual(LOTS[id].stages.length, 4, `${id}: 4 fases`);
        assert.ok(['grass', 'paved', 'concrete'].includes(LOTS[id].ground), `${id}.ground`);
    }
    for (const id of Object.keys(LOTS)) assert.ok(BUILDINGS[id]?.zoneType, `lote de algo que não é zona: ${id}`);
});

test('lotes: arquivos existem, peças válidas e dentro de size × size células', () => {
    for (const [id, lot] of Object.entries(LOTS)) {
        const size = BUILDINGS[id].size;
        lot.stages.forEach((pieces, stage) => {
            assert.ok(pieces.length > 0, `${id} fase ${stage} vazia`);
            for (const piece of pieces) {
                const where = `${id} fase ${stage} ${piece.file} (${piece.x}, ${piece.z})`;
                if (piece.file.startsWith('prop:')) {
                    assert.ok(PROPS[piece.file.slice(5)], `${where}: peça de obra inexistente`);
                } else {
                    assert.match(piece.file, /^kenney\/[a-z]+\/[a-z0-9-]+\.glb$/, `${where}: caminho`);
                    assert.ok(fs.existsSync(path.join(MODELS_DIR, piece.file)), `${where}: arquivo não existe`);
                    for (const key of ['w', 'd', 'h']) assert.ok(!(key in piece), `${where}: ${key} só vale para prop:`);
                }
                assert.ok(Number.isInteger(piece.rot || 0) && (piece.rot || 0) >= 0 && (piece.rot || 0) <= 3, `${where}: rot 0-3`);
                for (const key of ['x', 'z', 'scale', 'w', 'd', 'h']) {
                    if (key in piece) assert.ok(Number.isFinite(piece[key]) && (key === 'x' || key === 'z' || piece[key] > 0), `${where}: ${key}`);
                }
                const { w, d } = pieceFootprint(piece);
                const eps = 0.02;
                assert.ok(piece.x - w / 2 >= -eps && piece.x + w / 2 <= size + eps, `${where}: sai do lote em X (largura ${w.toFixed(2)})`);
                assert.ok(piece.z - d / 2 >= -eps && piece.z + d / 2 <= size + eps, `${where}: sai do lote em Z (fundo ${d.toFixed(2)})`);
            }
        });
        // A fase final tem prédio de verdade (algum .glb) e a fase 0 é só obra
        assert.ok(lot.stages[3].some(p => p.file.endsWith('.glb')), `${id}: fase final sem prédio`);
        assert.ok(lot.stages[0].every(p => p.file.startsWith('prop:')), `${id}: fase 0 (área livre) só tem peças de obra`);
    }
});

test('crescimento: ZONE_GROWTH coerente (3 durações, 4 escalas crescentes até 1, 4 nomes)', () => {
    assert.strictEqual(GROWTH.stageMs.length, 3);
    GROWTH.stageMs.forEach(ms => assert.ok(ms >= 15000 && ms <= 60000, `fase de ${ms} ms fora de 15-60 s`));
    assert.strictEqual(JSON.stringify(GROWTH.effectScale), JSON.stringify([0.25, 0.5, 0.75, 1]));
    assert.strictEqual(GROWTH.stageNames.length, 4);
});

// BuildingSystem sem Babylon: só as regras (refreshZoneLot/applyBuildingEffects viram stubs)
function system() {
    const bs = Object.create(BuildingSystem.prototype);
    const calls = { refresh: 0, effects: [] };
    Object.assign(bs, {
        buildings: new Map(),
        refreshZoneLot: () => calls.refresh++,
        gameManager: { gameTime: 0 }
    });
    bs.applyBuildingEffects = (b, add) => {
        if (!!b.effectsApplied === add) return;
        b.effectsApplied = add;
        calls.effects.push([add, bs.getZoneIncomeScale(b, add)]);
    };
    return { bs, calls };
}
const zone = (type, extra = {}) => ({ id: 'building_1', type, config: { ...BUILDINGS[type], id: type }, underConstruction: false, active: true, efficiency: 1, ...extra });

test('crescimento: ritmo pela satisfação, energia e água', () => {
    const { bs } = system();
    assert.strictEqual(bs.computeZoneGrowthRate({ satisfaction: 50, waterShortage: false, energyEfficiency: 1 }), 1);
    assert.strictEqual(bs.computeZoneGrowthRate({ satisfaction: 100, waterShortage: false, energyEfficiency: 1 }), 1.5);
    assert.strictEqual(bs.computeZoneGrowthRate({ satisfaction: 0, waterShortage: false, energyEfficiency: 1 }), 0.5);
    assert.strictEqual(bs.computeZoneGrowthRate({ satisfaction: 50, waterShortage: false, energyEfficiency: 0.5 }), 0.5);
    assert.strictEqual(bs.computeZoneGrowthRate({ satisfaction: 50, waterShortage: false, energyEfficiency: 0 }), 0.25, 'sem energia cresce bem devagar');
    assert.strictEqual(bs.computeZoneGrowthRate({ satisfaction: 100, waterShortage: true, energyEfficiency: 1 }), 0, 'sem água para');
});

test('crescimento: tempo de jogo → fase (0 → 3) e para na fase final', () => {
    const { bs } = system();
    const b = zone('zone_residential_light', { zoneStage: 0, zoneProgress: 0 });
    assert.strictEqual(bs.getZoneStage(b), 0);
    assert.strictEqual(bs.advanceZoneProgress(b, GROWTH.stageMs[0] / 2, 1), null);
    assert.ok(Math.abs(bs.getZoneStageProgress(b) - 0.5) < 1e-9);
    assert.strictEqual(bs.advanceZoneProgress(b, GROWTH.stageMs[0] / 2, 1), 1, 'metade + metade = próxima fase');
    b.zoneStage = 1;
    assert.strictEqual(bs.advanceZoneProgress(b, GROWTH.stageMs[1] / 2, 0), null, 'ritmo 0 não avança');
    assert.strictEqual(bs.advanceZoneProgress(b, GROWTH.stageMs[1] / 2, 2), 2, 'ritmo 2 = metade do tempo');
    b.zoneStage = 2;
    assert.strictEqual(bs.advanceZoneProgress(b, GROWTH.stageMs[2], 1), 3);
    b.zoneStage = 3;
    assert.strictEqual(bs.advanceZoneProgress(b, 1e9, 1), null, 'fase final não passa de 3');
    assert.strictEqual(bs.getZoneStageProgress(b), 1);

    // Obra em andamento e prédio comum não têm fase
    assert.strictEqual(bs.getZoneStage({ ...b, underConstruction: true }), null);
    assert.strictEqual(bs.getZoneStage({ config: { ...BUILDINGS.house, id: 'house' } }), null);
});

test('indicador: tempo até a próxima fase (ritmo e 2x/3x) e o motivo', () => {
    const { bs } = system();
    const b = zone('zone_residential_light', { zoneStage: 0, zoneProgress: 0.5 });
    assert.strictEqual(bs.getZoneTimeToNextStage(b, 1), GROWTH.stageMs[0] / 2);
    assert.strictEqual(bs.getZoneTimeToNextStage(b, 2), GROWTH.stageMs[0] / 4, 'ritmo 2 = metade');
    assert.strictEqual(bs.getZoneTimeToNextStage(b, 0), Infinity, 'sem água: parada');
    assert.strictEqual(bs.getZoneTimeToNextStage({ ...b, zoneStage: 3 }, 1), null, 'fase final');

    bs.getZoneGrowthConditions = () => ({ satisfaction: 50, waterShortage: false, energyEfficiency: 1 });
    assert.strictEqual(bs.describeZoneGrowth(b).eta, `Próxima fase em ~${GROWTH.stageMs[0] / 2000} s`);
    bs.gameManager.timeScale = 2;
    assert.strictEqual(bs.describeZoneGrowth(b).eta, `Próxima fase em ~${GROWTH.stageMs[0] / 4000} s`, '2x conta o tempo real');
    bs.gameManager.timeScale = 1;
    bs.getZoneGrowthConditions = () => ({ satisfaction: 0, waterShortage: false, energyEfficiency: 1 });
    const slow = bs.describeZoneGrowth({ ...b, zoneProgress: 0, zoneStage: 2 });
    assert.match(slow.eta, /~\d+ min/, 'acima de 1 minuto mostra minutos');
    assert.match(slow.reason, /insatisfeitos/);
    bs.getZoneGrowthConditions = () => ({ satisfaction: 50, waterShortage: false, energyEfficiency: 0.5 });
    assert.match(bs.describeZoneGrowth(b).reason, /falta energia/);
    bs.getZoneGrowthConditions = () => ({ satisfaction: 50, waterShortage: true, energyEfficiency: 1 });
    assert.deepStrictEqual({ ...bs.describeZoneGrowth(b) }, { eta: 'Crescimento parado', reason: 'Falta água na cidade: a zona só cresce com água.' });
    assert.strictEqual(bs.describeZoneGrowth({ ...b, zoneStage: 3 }), null);
});

test('crescimento: updateZoneGrowth usa o relógio do jogo (simNow), não Date.now', () => {
    const { bs, calls } = system();
    bs.getZoneGrowthConditions = () => ({ satisfaction: 50, waterShortage: false, energyEfficiency: 1 });
    const b = zone('zone_industrial_light', { zoneStage: 0, zoneProgress: 0, effectsApplied: true, zoneAppliedScale: 0.25 });
    bs.buildings.set(b.id, b);
    bs.updateZoneGrowth(); // primeira chamada só marca o tempo
    bs.updateZoneGrowth();
    assert.strictEqual(b.zoneStage, 0, 'sem tempo de jogo passando nada cresce');
    bs.gameManager.gameTime = GROWTH.stageMs[0] + 10;
    bs.updateZoneGrowth();
    assert.strictEqual(b.zoneStage, 1);
    assert.strictEqual(calls.refresh, 1, 'troca a malha uma vez');
    // Efeitos: tirou com a escala da fase 0 e somou com a da fase 1
    assert.strictEqual(JSON.stringify(calls.effects), JSON.stringify([[false, 0.25], [true, 0.5]]));
});

test('efeitos: população, empregos e receita escalam com a fase (0,25 → 1)', () => {
    const { bs, calls } = system();
    const res = zone('zone_residential_balanced', { zoneStage: 0 });
    const full = BUILDINGS.zone_residential_balanced.populationCapacity;
    assert.deepStrictEqual([0, 1, 2, 3].map(stage => bs.getEffectivePopulationCapacity({ ...res, zoneStage: stage })),
        [full * 0.25, full * 0.5, full * 0.75, full]);
    assert.strictEqual(bs.getEffectivePopulationCapacity({ ...res, underConstruction: true }), full, 'em obra não conta (inativo), valor cheio de referência');
    assert.strictEqual(bs.getEffectivePopulationCapacity({ config: { populationCapacity: 70, id: 'x' } }), 70, 'prédio comum: cheio');
    const ind = zone('zone_industrial_heavy', { zoneStage: 2, effectsApplied: true, zoneAppliedScale: 0.75 });
    assert.strictEqual(bs.getEffectiveJobCapacity(ind), Math.round(BUILDINGS.zone_industrial_heavy.jobCapacity * 0.75));

    // setZoneStage: tira com a escala antiga, soma com a nova; zona desativada por evento só muda a fase
    assert.strictEqual(bs.setZoneStage(ind, 3), true);
    assert.strictEqual(JSON.stringify(calls.effects), JSON.stringify([[false, 0.75], [true, 1]]));
    const off = zone('zone_industrial_light', { zoneStage: 1, effectsApplied: false });
    bs.setZoneStage(off, 2);
    assert.strictEqual(calls.effects.length, 2, 'sem efeitos aplicados nada é somado');
    assert.strictEqual(off.zoneStage, 2);
});

test('save: fase e progresso da zona voltam; save antigo (sem fase) começa em 0 e desconta a receita cheia', () => {
    const { bs } = system();
    const b = zone('zone_commercial_light', { zoneStage: 2, zoneProgress: 0.4321, effectsApplied: true });
    const saved = JSON.parse(JSON.stringify(BuildingSystem.serializeBuilding(b)));
    assert.strictEqual(saved.zoneStage, 2);
    assert.strictEqual(saved.zoneProgress, 0.432);
    const restored = zone('zone_commercial_light', { effectsApplied: true });
    bs.restoreZoneState(restored, saved);
    assert.strictEqual(restored.zoneStage, 2);
    assert.strictEqual(restored.zoneProgress, 0.432);
    assert.strictEqual(restored.zoneAppliedScale, 0.75, 'totais salvos já têm a receita da fase 2');

    const legacy = zone('zone_commercial_light', { effectsApplied: true });
    bs.restoreZoneState(legacy, { type: 'zone_commercial_light', underConstruction: false });
    assert.strictEqual(legacy.zoneStage, 0);
    assert.strictEqual(legacy.zoneAppliedScale, 1, 'save antigo somou a receita cheia');
    assert.strictEqual(bs.getZoneIncomeScale(legacy, false), 1);

    // Prédio comum e obra não ganham campos de zona
    assert.ok(!('zoneStage' in BuildingSystem.serializeBuilding({ id: 'b', type: 'house', gridX: 1, gridZ: 1 })));
    const building = zone('zone_commercial_light', { underConstruction: true });
    bs.restoreZoneState(building, { zoneStage: 3 });
    assert.ok(!('zoneStage' in building));
});

// ===== Falta de água (ResourceManager.hasWaterShortage) e a mensagem da zona =====

test('água: falta só quando a produção não cobre o gasto E a caixa está quase vazia (consumo é por minuto)', () => {
    const rm = new ResourceManager();
    const water = rm.resources.water;
    rm.resources.population.current = 75; // 150 L/min de consumo + 10% de desperdício
    rm.invalidateConsumptionCache();
    rm.updateConsumption();
    water.current = 1000;
    water.production = 500; // produz mais do que gasta
    assert.strictEqual(rm.hasWaterShortage(), false, 'caixa enchendo não é falta (antes pedia 10 MINUTOS de reserva: 1.500 L)');
    water.current = 0;
    assert.strictEqual(rm.hasWaterShortage(), false, 'caixa vazia mas produção dando conta: não falta');
    water.production = 100; // gasta 165, produz 100
    water.current = 1000;
    assert.strictEqual(rm.hasWaterShortage(), false, 'ainda tem reserva');
    water.current = 20; // menos de 10 s do gasto (165/60 × 10 = 27,5 L)
    assert.strictEqual(rm.hasWaterShortage(), true);
    const balance = rm.getWaterBalance();
    assert.strictEqual(balance.production, 100);
    assert.ok(Math.abs(balance.demand - 165) < 1e-9);
    assert.ok(Math.abs(balance.deficit - 65) < 1e-9);
});

test('zona sem água: diz quanto a cidade gasta, produz e quanto falta (L/min)', () => {
    const { bs } = system();
    const b = zone('zone_residential_light', { zoneStage: 1, zoneProgress: 0 });
    bs.getZoneGrowthConditions = () => ({ satisfaction: 50, waterShortage: true, energyEfficiency: 1, water: { production: 100, demand: 165, deficit: 65, current: 0 } });
    const info = bs.describeZoneGrowth(b);
    assert.strictEqual(info.eta, 'Crescimento parado');
    assert.match(info.reason, /^Falta água! A cidade gasta 165 L\/min e só produz 100 L\/min\. Precisa de mais 65 L\/min/);
});

// ===== Eficiência: ritmo e efeitos =====

test('eficiência: ritmo = satisfação × eficiência da zona (mínimo com a energia, sem contar duas vezes)', () => {
    const { bs } = system();
    const c = { satisfaction: 50, waterShortage: false, energyEfficiency: 1 };
    const z = efficiency => zone('zone_residential_light', { zoneStage: 0, zoneProgress: 0, efficiency });
    assert.strictEqual(bs.getZoneGrowthRate(z(1), c), 1);
    assert.strictEqual(bs.getZoneGrowthRate(z(0.5), c), 0.5, 'zona a 50% cresce na metade');
    assert.strictEqual(bs.getZoneGrowthRate(z(1.3), c), 1.3, 'bônus de pesquisa acelera');
    assert.strictEqual(bs.getZoneGrowthRate(z(0), c), 0.25, 'nunca abaixo de 0,25×');
    const low = { ...c, energyEfficiency: 0.5 };
    assert.strictEqual(bs.getZoneGrowthRate(z(0.5), low), 0.5, 'eficiência do prédio que já conta a energia: 0,5, não 0,25');
    assert.strictEqual(bs.getZoneGrowthRate(z(1), low), 0.5, 'energia da cidade limita');
    assert.strictEqual(bs.getZoneGrowthRate(z(1), { ...c, waterShortage: true }), 0);

    // O tempo até a próxima fase usa o ritmo da zona (uma vez só)
    bs.getZoneGrowthConditions = () => c;
    assert.strictEqual(bs.getZoneTimeToNextStage(z(0.5)), GROWTH.stageMs[0] / 0.5);
    assert.match(bs.describeZoneGrowth(z(0.5)).reason, /funcionando a 50%/);
});

test('eficiência: empregos e receita caem com ela; moradia não', () => {
    const { bs } = system();
    const ind = zone('zone_industrial_balanced', { zoneStage: 3, efficiency: 0.5 });
    assert.strictEqual(bs.getEffectiveJobCapacity(ind), Math.round(BUILDINGS.zone_industrial_balanced.jobCapacity * 0.5));
    assert.strictEqual(bs.getEffectiveZoneIncome(ind), BUILDINGS.zone_industrial_balanced.incomeGeneration * 0.5);
    assert.strictEqual(bs.getEffectiveJobCapacity({ ...ind, efficiency: 1.5 }), BUILDINGS.zone_industrial_balanced.jobCapacity, 'empregos até 100%');
    const res = zone('zone_residential_balanced', { zoneStage: 2, efficiency: 0.3 });
    assert.strictEqual(bs.getEffectivePopulationCapacity(res), BUILDINGS.zone_residential_balanced.populationCapacity * 0.75);
});

// ===== Evoluir para o próximo peso =====

function evolutionSystem({ budget = 1e6, occupied = [] } = {}) {
    const { bs, calls } = system();
    bs.buildingTypes = new Map(Object.entries(BUILDINGS).map(([id, cfg]) => [id, { ...cfg, id }]));
    const busy = new Set(occupied.map(([x, z]) => `${x},${z}`));
    const rm = {
        resources: { budget: { current: budget } },
        canAfford(n) { return this.resources.budget.current >= n; },
        spendBudget(n) { if (!this.canAfford(n)) return false; this.resources.budget.current -= n; return true; }
    };
    bs.gameManager.resourceManager = rm;
    bs.gridManager = {
        isCellOccupied: (x, z) => busy.has(`${x},${z}`),
        getTerrainType: () => 'grassland',
        occupyArea: (x, z, s) => { for (let i = x; i < x + s; i++) for (let j = z; j < z + s; j++) busy.add(`${i},${j}`); }
    };
    bs.isPlacementWithinBounds = (x, z, s) => x >= 0 && z >= 0 && x + s <= 40 && z + s <= 40;
    calls.notes = [];
    bs.showNotification = (msg, type) => calls.notes.push([type, msg]);
    calls.mesh = 0;
    bs.replaceZoneLotMesh = () => { calls.mesh++; };
    return { bs, calls, rm, busy };
}
const typed = id => ({ ...BUILDINGS[id], id });

test('evolução: leve → equilibrada → pesada; ids e custo (diferença)', () => {
    const { bs } = evolutionSystem();
    for (const kind of ['residential', 'commercial', 'industrial']) {
        assert.strictEqual(bs.getNextZoneTypeId(typed(`zone_${kind}_light`)), `zone_${kind}_balanced`);
        assert.strictEqual(bs.getNextZoneTypeId(typed(`zone_${kind}_balanced`)), `zone_${kind}_heavy`);
        assert.strictEqual(bs.getNextZoneTypeId(typed(`zone_${kind}_heavy`)), null, 'pesada não evolui');
    }
    assert.strictEqual(bs.getNextZoneTypeId(typed('house')), null);
    assert.strictEqual(bs.getZoneEvolutionCost(BUILDINGS.zone_residential_light, BUILDINGS.zone_residential_balanced),
        BUILDINGS.zone_residential_balanced.cost - BUILDINGS.zone_residential_light.cost);
    assert.strictEqual(JSON.stringify(EVOLUTION.weights), JSON.stringify(['light', 'balanced', 'heavy']));
});

test('evolução: começa na menor fase do novo peso em que nada cai (moradores, empregos, receita)', () => {
    const { bs } = evolutionSystem();
    const scale = GROWTH.effectScale;
    const stats = ['population', 'jobs', 'income'];
    const stat = (cfg, k) => ({ population: cfg.populationCapacity || 0, jobs: cfg.jobCapacity || 0, income: cfg.incomeGeneration || 0 })[k];
    for (const kind of ['residential', 'commercial', 'industrial']) {
        for (const [from, to] of [['light', 'balanced'], ['balanced', 'heavy']]) {
            const a = BUILDINGS[`zone_${kind}_${from}`], b = BUILDINGS[`zone_${kind}_${to}`];
            const start = bs.getZoneEvolutionStartStage(a, 3, b);
            stats.forEach(k => assert.ok(stat(b, k) * scale[start] >= stat(a, k), `${kind} ${from}→${to}: ${k} não pode cair`));
            if (start > 0) assert.ok(stats.some(k => stat(b, k) * scale[start - 1] < stat(a, k)), `${kind} ${from}→${to}: fase ${start} é a menor`);
        }
    }
    assert.strictEqual(bs.getZoneEvolutionStartStage(BUILDINGS.zone_residential_light, 3, BUILDINGS.zone_residential_balanced), 1);
    assert.strictEqual(bs.getZoneEvolutionStartStage(BUILDINGS.zone_industrial_balanced, 3, BUILDINGS.zone_industrial_heavy), 2);
});

test('evolução: só na fase final, cobra, troca o tipo preservando os efeitos e salva', () => {
    const { bs, calls, rm } = evolutionSystem({ budget: 5000 });
    const b = zone('zone_residential_light', { zoneStage: 2, zoneProgress: 0.5, effectsApplied: true, zoneAppliedScale: 0.75, gridX: 5, gridZ: 5, rotation: 1 });
    bs.buildings.set(b.id, b);
    assert.strictEqual(bs.getZoneEvolution(b), null, 'ainda crescendo: sem botão');
    assert.strictEqual(bs.getZoneEvolveHtml(b), '');
    b.zoneStage = 3;
    b.zoneAppliedScale = 1;
    const evo = bs.getZoneEvolution(b);
    assert.strictEqual(evo.ok, true);
    assert.strictEqual(evo.next, 'zone_residential_balanced');
    assert.match(bs.getZoneEvolveHtml(b), /Evoluir para Equilibrada/);
    assert.doesNotMatch(bs.getZoneEvolveHtml(b), /disabled/);

    const popBefore = bs.getEffectivePopulationCapacity(b);
    assert.strictEqual(bs.evolveZone(b.id), true);
    assert.strictEqual(b.type, 'zone_residential_balanced');
    assert.strictEqual(b.config.id, 'zone_residential_balanced');
    assert.strictEqual(b.zoneStage, 1);
    assert.strictEqual(b.zoneProgress, 0);
    assert.ok(bs.getEffectivePopulationCapacity(b) >= popBefore, 'moradores não caem');
    assert.strictEqual(rm.resources.budget.current, 5000 - 1000);
    assert.strictEqual(JSON.stringify(calls.effects), JSON.stringify([[false, 1], [true, 0.5]]), 'tira o peso antigo (escala 1) e soma o novo (fase 1)');
    assert.strictEqual(calls.mesh, 1, 'lote novo');
    assert.strictEqual(JSON.stringify([b.gridX, b.gridZ]), '[5,5]', 'mesmo tamanho: mesmo lugar');

    // Save/load: o tipo novo e a fase voltam, com a receita da fase nos totais
    const saved = JSON.parse(JSON.stringify(BuildingSystem.serializeBuilding(b)));
    assert.strictEqual(saved.type, 'zone_residential_balanced');
    assert.strictEqual(saved.zoneStage, 1);
    const restored = zone('zone_residential_balanced', { effectsApplied: true });
    bs.restoreZoneState(restored, saved);
    assert.strictEqual(restored.zoneStage, 1);
    assert.strictEqual(restored.zoneAppliedScale, 0.5);
});

test('evolução: sem dinheiro ou sem espaço o botão fica desabilitado com o motivo; a pesada 3 × 3 procura espaço', () => {
    const poor = evolutionSystem({ budget: 100 });
    const b = zone('zone_industrial_balanced', { zoneStage: 3, effectsApplied: true, zoneAppliedScale: 1, gridX: 10, gridZ: 10 });
    poor.bs.buildings.set(b.id, b);
    const noMoney = poor.bs.getZoneEvolution(b);
    assert.strictEqual(noMoney.ok, false);
    assert.match(noMoney.reason, /Falta dinheiro: precisa de R\$ 3\.000/);
    assert.match(poor.bs.getZoneEvolveHtml(b), /disabled/);
    assert.strictEqual(poor.bs.evolveZone(b.id), false);
    assert.strictEqual(b.type, 'zone_industrial_balanced');

    // A zona ocupa x 10-11, z 10-11; em volta tudo ocupado → sem espaço para 3 × 3
    const own = [[10, 10], [10, 11], [11, 10], [11, 11]];
    const ring = [];
    for (let x = 9; x <= 12; x++) for (let z = 9; z <= 12; z++) ring.push([x, z]);
    const cramped = evolutionSystem({ occupied: [...own, ...ring] });
    cramped.bs.buildings.set(b.id, b);
    const noSpace = cramped.bs.getZoneEvolution(b);
    assert.strictEqual(noSpace.ok, false);
    assert.match(noSpace.reason, /Falta espaço/);

    // Rua do lado direito (x = 12) e no fundo (z = 12): cresce para o outro lado (canto 9, 9)
    const road = [...own, ...[9, 10, 11, 12].map(z => [12, z]), ...[9, 10, 11].map(x => [x, 12])];
    const ok = evolutionSystem({ occupied: road });
    ok.bs.buildings.set(b.id, b);
    assert.strictEqual(ok.bs.evolveZone(b.id), true);
    assert.strictEqual(b.type, 'zone_industrial_heavy');
    assert.strictEqual(JSON.stringify([b.gridX, b.gridZ]), '[9,9]');
    assert.strictEqual(b.zoneStage, 2, 'industrial equilibrada → pesada começa na fase 2 (75 empregos ≥ 60)');
    for (let x = 9; x < 12; x++) for (let z = 9; z < 12; z++) assert.ok(ok.busy.has(`${x},${z}`), `célula ${x},${z} ocupada`);
});
