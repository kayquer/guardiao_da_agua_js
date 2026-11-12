// Fase 2: decisões com troca. Esgoto, aquífero, mata ciliar, risco de enchente (asfalto × verde), aviso antecipado,
// escolhas nos eventos, reputação com efeito e a missão final.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/data/zoneLots.js', 'js/data/missions.js',
    'js/systems/BuildingSystem.js', 'js/systems/building/ZoneGrowth.js', 'js/systems/building/BuildingEfficiency.js',
    'js/systems/building/TreeGrowth.js', 'js/core/ResourceManager.js', 'js/systems/EventSystem.js',
    'js/systems/QuestSystem.js', 'js/systems/TreeSystem.js');
const BuildingSystem = g('BuildingSystem');
const ResourceManager = g('ResourceManager');
const EventSystem = g('EventSystem');
const QuestSystem = g('QuestSystem');
const TreeSystem = g('TreeSystem');
const BUILDINGS = g('BUILDING_TYPES');
const MISSIONS = g('MISSIONS');
const ACHIEVEMENTS = g('ACHIEVEMENTS');
const TREES = g('TREES');
const win = g('window');
Object.assign(QuestSystem.prototype, { updateQuestUI() {}, playMissionCompletionAudio() {} });
// Toasts de missão personalizam o texto com o nome do jogador (PlayerProfile vive com o DOM)
win.PlayerProfile = { personalize: text => text };

let nextId = 1;
const make = (type, extra = {}) => ({
    id: `b${nextId++}`, type, gridX: 0, gridZ: 0, config: { ...BUILDINGS[type], id: type },
    underConstruction: false, active: true, efficiency: 1, ...extra
});

function city(buildings = []) {
    const notes = [];
    const gm = { gameTime: 0, timeScale: 1, gameState: 'playing', uiManager: { showNotification: m => notes.push(m), showCentralAlert: (t) => notes.push(t) } };
    const bs = Object.create(BuildingSystem.prototype);
    Object.assign(bs, { buildings: new Map(), gameManager: gm, refreshZoneLot() {} });
    gm.buildingSystem = bs;
    gm.resourceManager = new ResourceManager(gm);
    gm.questSystem = new QuestSystem(gm);
    gm.eventSystem = new EventSystem(gm);
    buildings.forEach(b => bs.buildings.set(b.id, b));
    win.gameManager = gm;
    return { gm, bs, rm: gm.resourceManager, es: gm.eventSystem, qs: gm.questSystem, res: gm.resourceManager.resources, notes };
}

// ===== Esgoto =====
test('esgoto: cada morador polui; a ETA dá conta de uma cidade média', () => {
    const { rm, res } = city();
    res.population.current = 800;
    const b = rm.getPollutionBalance();
    assert.strictEqual(b.sewage, 800 * ResourceManager.SEWAGE_PER_PERSON);
    assert.ok(b.sewage < BUILDINGS.treatment_plant.pollutionReduction, 'uma ETA cobre o esgoto de 800 pessoas');
    res.pollution.current = 10;
    res.pollution.sources = 0;
    res.pollution.reduction = 0;
    rm.updatePollution();
    assert.ok(res.pollution.current > 10, 'sem tratamento, o esgoto sobe a poluição');
});

// ===== Aquífero =====
test('aquífero: bombas tiram, natureza devolve; baixo, a água subterrânea rende menos', () => {
    const pump = make('water_pump');
    const well = make('water_well');
    const { bs, rm, res } = city([pump, well]);
    bs.applyBuildingEffects(pump, true);
    bs.applyBuildingEffects(well, true);
    assert.strictEqual(res.water.groundwaterProduction, BUILDINGS.water_pump.waterProduction + BUILDINGS.water_well.waterProduction);
    assert.ok(rm.getAquiferBalance().net < 0, 'bomba + poço esgotam mais que a recarga natural');

    const full = rm.getEffectiveWaterProduction();
    res.water.aquifer = 15; // metade do limite baixo
    assert.ok(Math.abs(rm.getAquiferFactor() - 0.5) < 1e-9);
    assert.ok(rm.getEffectiveWaterProduction() < full * 0.6, 'aquífero baixo: bombas e poços rendem menos');

    const garden = make('rain_garden');
    bs.applyBuildingEffects(garden, true);
    assert.strictEqual(res.water.aquiferRecharge, BUILDINGS.rain_garden.aquiferRecharge);
    bs.applyBuildingEffects(pump, false);
    bs.applyBuildingEffects(well, false);
    assert.strictEqual(res.water.groundwaterProduction, 0);
});

test('aquífero desce com o tempo e avisa ao passar de 50% e 30%', () => {
    const { rm, res, notes } = city();
    res.water.groundwaterProduction = 500;
    res.water.aquifer = 51;
    for (let i = 0; i < 600 && res.water.aquifer > 29; i++) rm.updateAquifer();
    assert.ok(res.water.aquifer <= 30);
    assert.ok(notes.some(n => String(n).includes('metade')));
    assert.ok(notes.includes('Aquífero Baixo'));
});

test('chuva real (perfil do clima) recarrega o aquífero', () => {
    const { gm, rm } = city();
    const dry = rm.getAquiferBalance().recharge;
    gm.weatherEffects = { profile: { rain: 1 } };
    assert.strictEqual(rm.getAquiferBalance().recharge, dry + ResourceManager.AQUIFER_RAIN_RECHARGE);
});

// ===== Mata ciliar =====
test('mata ciliar: árvore perto da água limpa 2,5×, nativa ou plantada', () => {
    const grid = { getTerrainType: (x, z) => (x === 10 && z === 10 ? 'water' : 'grassland') };
    assert.strictEqual(TreeSystem.isRiparianCell(grid, 11, 12), true);
    assert.strictEqual(TreeSystem.isRiparianCell(grid, 13, 10), false);
    assert.strictEqual(TreeSystem.treeReduction(true), TREES.POLLUTION_REDUCTION * TREES.RIPARIAN_FACTOR);

    const { bs } = city();
    bs.gridManager = grid;
    const near = make('tree_sapling', { gridX: 11, gridZ: 10, treeStage: 3 });
    const far = make('tree_sapling', { gridX: 30, gridZ: 30, treeStage: 3 });
    assert.strictEqual(bs.getTreeEffects(near).pollution, bs.getTreeEffects(far).pollution * TREES.RIPARIAN_FACTOR);
});

// ===== Enchente =====
test('risco de enchente: asfalto sobe, área verde desce', () => {
    const roads = Array.from({ length: 60 }, () => make('paved_road'));
    const { es, bs } = city(roads);
    const asphalt = es.getFloodRisk();
    assert.strictEqual(asphalt.level, 'alto');
    ['linear_park', 'park', 'rain_garden', 'rain_garden'].forEach(t => { const b = make(t); bs.buildings.set(b.id, b); });
    const green = es.getFloodRisk();
    assert.ok(green.risk < asphalt.risk);
    assert.ok(green.absorption > 0);
});

test('enchente: a força segue o risco e a resposta escolhida corta o estrago', () => {
    const roads = Array.from({ length: 60 }, () => make('paved_road'));
    const { es, res } = city(roads);
    es.damageInfrastructure = () => {};
    const strong = es.triggerEvent('flood');
    const strongPollution = res.pollution.sources;
    es.endEvent(strong.id);
    assert.strictEqual(res.pollution.sources, 0, 'o fim tira exatamente o que somou');

    const asked = es.announceEvent('flood');
    assert.ok(es.chooseResponse(asked.id, 'barriers'));
    es.updatePendingEvents(asked.total + 1);
    const ev = [...es.activeEvents.values()][0];
    assert.strictEqual(ev.responseId, 'barriers');
    assert.ok(Math.abs(res.pollution.sources - strongPollution * 0.5) < 1e-6, 'barreiras = metade do estrago');
    assert.strictEqual(ev.duration, Math.round(es.eventTypes.get('flood').duration * 0.75));
});

// ===== Aviso antecipado =====
test('seca e enchente chegam com aviso; a Estação de Monitoramento dobra a antecedência', () => {
    const { es, bs, notes } = city();
    assert.strictEqual(es.eventTypes.get('drought').warning, true);
    const p = es.announceEvent('drought');
    assert.strictEqual(p.total, EventSystem.WARNING_MS);
    es.updatePendingEvents(p.total * 2);
    assert.strictEqual(es.activeEvents.size, 0, 'esperando a decisão, o tempo não corre');
    assert.ok(es.chooseResponse(p.id, 'none'));
    assert.strictEqual(notes.length >= 0, true);
    es.updatePendingEvents(p.total - 1);
    assert.strictEqual(es.activeEvents.size, 0, 'ainda não começou');
    es.updatePendingEvents(2);
    assert.ok(es.hasActiveEventOfType('drought'));

    const station = make('monitoring_station');
    bs.buildings.set(station.id, station);
    assert.strictEqual(es.getWarningTime(), EventSystem.WARNING_MS * 2);
});

test('avisos sobrevivem a salvar/carregar', () => {
    const { es } = city();
    es.announceEvent('flood');
    es.responseStats.streak = 2;
    const { es: es2 } = city();
    es2.loadData(JSON.parse(JSON.stringify(es.getSaveData())));
    assert.strictEqual(es2.pendingEvents.length, 1);
    assert.strictEqual(es2.pendingEvents[0].type, 'flood');
    assert.strictEqual(es2.pendingEvents[0].awaiting, true, 'continua esperando a decisão');
    assert.strictEqual(es2.responseStats.streak, 2);
});

// ===== Resposta aos eventos (modal do Secretário Paulo) =====
test('todo evento com resposta tem 4 opções; cada uma paga um preço diferente (não é escada de dinheiro)', () => {
    const { es } = city();
    const priceKinds = o => {
        const kinds = new Set();
        if (o.cost) kinds.add('dinheiro');
        if (o.requires) kinds.add('prédio');
        Object.entries(o.effects || {}).forEach(([k, v]) => { if ((k === 'satisfactionBonus' || k === 'aquiferRecharge') && v < 0) kinds.add(k); });
        Object.entries(o.instant || {}).forEach(([k, v]) => { if (v < 0) kinds.add(`instant.${k}`); });
        Object.values(o.reputation || {}).forEach(v => { if (v < 0) kinds.add('reputação'); });
        return kinds;
    };
    for (const [id, config] of es.eventTypes) {
        if (!config.response) continue;
        const options = config.response.options;
        assert.strictEqual(options.length, 4, `${id}: 4 cartas`);
        assert.strictEqual(new Set(options.map(o => o.id)).size, 4, `${id}: ids únicos`);
        const none = options[options.length - 1];
        assert.strictEqual(none.tier, 'none', `${id}: a última é não fazer nada`);
        assert.ok(!none.cost, `${id}: não fazer nada é de graça`);
        assert.ok(config.response.intro, `${id}: fala do Paulo`);
        const acts = options.slice(0, 3);
        const kinds = new Set(acts.flatMap(o => [...priceKinds(o)]));
        assert.ok(kinds.size >= 2, `${id}: as opções pagam de jeitos diferentes (${[...kinds]})`);
        acts.forEach(o => {
            if (o.badIf) assert.ok(o.badIf.why && Object.keys(o.badIf).length >= 2, `${id}/${o.id}: risco sem explicação`);
            assert.ok(!/jeitinho/i.test(o.label), `${id}/${o.id}: rótulo que entrega a resposta`);
        });
    }
});

test('boa decisão é pela situação: poço com aquífero baixo, rodízio com moradores insatisfeitos, barreira sem enxurrada', () => {
    const { es, res } = city();
    const drought = es.eventTypes.get('drought');
    const opt = id => es.getResponseOption(drought, id);
    res.water.aquifer = 80;
    assert.strictEqual(es.judgeResponse(drought, opt('wells')).good, true, 'aquífero cheio: bombear mais funciona');
    res.water.aquifer = 30;
    const wells = es.judgeResponse(drought, opt('wells'));
    assert.strictEqual(wells.good, false);
    assert.match(wells.why, /aquífero/);
    res.population.satisfaction = 70;
    assert.strictEqual(es.judgeResponse(drought, opt('rationing')).good, true);
    res.population.satisfaction = 30;
    assert.strictEqual(es.judgeResponse(drought, opt('rationing')).good, false, 'rodízio com a cidade já chateada');
    assert.strictEqual(es.judgeResponse(drought, opt('none')).good, false);
    assert.strictEqual(es.judgeResponse(drought, opt('rationing'), true).good, false, 'sem resposta não conta');

    // barreiras caras numa cidade que já segura a chuva (risco baixo) não são boa decisão
    const flood = es.eventTypes.get('flood');
    assert.ok(es.getFloodRisk().risk < 0.6);
    assert.strictEqual(es.judgeResponse(flood, es.getResponseOption(flood, 'barriers')).good, false);
    // fez pouco: compartilhar nas redes (20%) não conta como boa
    const campaign = es.eventTypes.get('water_conservation_campaign');
    assert.strictEqual(es.judgeResponse(campaign, es.getResponseOption(campaign, 'post')).good, false);
});

test('escolha arriscada zera a sequência e o Paulo explica no fim do evento', () => {
    const { es, res, notes } = city();
    res.budget.current = 1e5;
    res.water.aquifer = 30;
    es.responseStats.streak = 2;
    const asked = es.announceEvent('drought');
    assert.ok(es.chooseResponse(asked.id, 'wells'));
    assert.strictEqual(es.responseStats.streak, 0);
    assert.strictEqual(asked.verdict.good, false);
    es.updatePendingEvents(asked.total + 1);
    const ev = [...es.activeEvents.values()][0];
    assert.strictEqual(ev.verdict.good, false, 'o veredito vai junto com o evento (e com o save)');
    es.endEvent(ev.id);
    assert.ok(notes.some(n => n.includes('Secretário Paulo') && n.includes('aquífero já estava baixo')));
});

test('ameaça: a resposta corta o impacto e a duração; o fim desfaz exatamente', () => {
    const { es, rm, res } = city();
    res.population.current = 500;
    const productionBefore = res.water.productionMultiplier ?? 1;
    const asked = es.announceEvent('drought');
    assert.strictEqual(es.activeEvents.size, 0, 'nada começa antes da decisão');
    const satisfaction = res.population.eventSatisfaction || 0;
    assert.ok(es.chooseResponse(asked.id, 'rationing'));
    es.updatePendingEvents(asked.total + 1);
    const ev = [...es.activeEvents.values()][0];
    assert.ok(Math.abs(res.water.productionMultiplier - productionBefore * 0.825) < 1e-9, 'seca a 35% de impacto: produção × 0,825');
    assert.strictEqual(ev.duration, Math.round(120000 * 0.8));
    assert.strictEqual(res.population.eventSatisfaction - satisfaction, -8, 'o rodízio custa satisfação enquanto dura');
    es.endEvent(ev.id);
    assert.ok(Math.abs(res.water.productionMultiplier - productionBefore) < 1e-9);
    assert.strictEqual(res.population.eventSatisfaction || 0, satisfaction, 'o fim devolve a satisfação');
    assert.strictEqual(rm.resources.pollution.sources, 0);
});

test('oportunidade: aproveita 50%; não fazer nada perde o benefício', () => {
    const { es, res } = city();
    const production = res.water.production;
    const half = es.announceEvent('heavy_rain');
    assert.ok(es.chooseResponse(half.id, 'reservoirs'));
    const ev = [...es.activeEvents.values()][0];
    assert.strictEqual(res.water.production - production, 20 * 0.5);
    es.endEvent(ev.id);
    assert.strictEqual(res.water.production, production);

    const lost = es.announceEvent('heavy_rain');
    assert.ok(es.chooseResponse(lost.id, 'none'));
    assert.strictEqual(es.activeEvents.size, 0, 'a chuva foi embora sem ser aproveitada');
});

test('a melhor opção pede um prédio e o dinheiro; sem eles fica bloqueada', () => {
    const { es, bs, res } = city();
    const asked = es.announceEvent('heavy_rain');
    const harvest = es.getResponseOption(es.eventTypes.get('heavy_rain'), 'harvest');
    assert.strictEqual(es.getOptionAvailability(harvest).ok, false);
    assert.strictEqual(es.chooseResponse(asked.id, 'harvest'), false);
    const tank = make('water_tank');
    bs.buildings.set(tank.id, tank);
    res.budget.current = 100;
    assert.ok(es.getOptionAvailability(harvest).short > 0, 'agora falta só dinheiro');
    res.budget.current = 50000;
    res.water.current = 100;
    const water = res.water.current;
    assert.ok(es.chooseResponse(asked.id, 'harvest'));
    assert.strictEqual(res.budget.current, 50000 - 1500);
    assert.ok(res.water.current > water, 'captar tudo enche a caixa na hora');
});

test('subsídio instantâneo: o valor recebido segue o aproveitamento', () => {
    const { es, res } = city();
    const budget = res.budget.current;
    const asked = es.announceEvent('government_grant');
    assert.ok(es.chooseResponse(asked.id, 'rush'));
    assert.strictEqual(res.budget.current - budget, 15000 * 0.6);
});

test('3 boas decisões seguidas dão prêmio; 5 dão a conquista Guardião do Clima', () => {
    const { es, res, qs } = city();
    res.budget.current = 1e6;
    let budget = res.budget.current;
    for (let i = 0; i < 3; i++) {
        const asked = es.announceEvent('water_conservation_campaign');
        assert.ok(es.chooseResponse(asked.id, 'posters'));
        [...es.activeEvents.values()].forEach(e => es.endEvent(e.id));
    }
    assert.strictEqual(es.responseStats.streak, 3);
    assert.strictEqual(res.budget.current - budget, EventSystem.STREAK_REWARD - 3 * 1200);
    for (let i = 0; i < 2; i++) {
        const asked = es.announceEvent('water_conservation_campaign');
        es.chooseResponse(asked.id, 'posters');
        [...es.activeEvents.values()].forEach(e => es.endEvent(e.id));
    }
    assert.ok(qs.achievements.has('climate_guardian'));
    assert.ok(ACHIEVEMENTS.climate_guardian.name);
    const asked = es.announceEvent('water_conservation_campaign');
    es.chooseResponse(asked.id, 'none');
    assert.strictEqual(es.responseStats.streak, 0, 'não fazer nada zera a sequência');
});

test('sem decisão em 30 s de jogo (o modal não abriu), fica "não fazer nada"', () => {
    const { gm, es, qs } = city();
    const asked = es.announceEvent('industrial_pollution');
    gm.gameTime += EventSystem.CHOICE_TIMEOUT_MS;
    es.updateChoiceTimeouts();
    const ev = [...es.activeEvents.values()][0];
    assert.strictEqual(ev.responseId, 'none');
    assert.strictEqual(asked.choiceAuto, true);
    assert.strictEqual(qs.getReputation('environment'), 45);
});

test('o fim do evento traz o resultado na voz do Paulo', () => {
    const { es, notes } = city();
    const asked = es.announceEvent('pipe_leak');
    es.chooseResponse(asked.id, 'patch');
    const ev = [...es.activeEvents.values()][0];
    es.endEvent(ev.id);
    assert.ok(notes.some(n => n.includes('Secretário Paulo') && n.includes('50%')));
});

// ===== Reputação =====
test('reputação: limita 0-100 e muda satisfação, impostos, limpeza e subsídio', () => {
    const { qs, rm } = city();
    qs.changeReputation({ citizens: 80, business: -80, environment: 50, government: 50 });
    assert.strictEqual(qs.getReputation('citizens'), 100);
    assert.strictEqual(qs.getReputation('business'), 0);
    const m = qs.getReputationModifiers();
    assert.strictEqual(m.satisfaction, 5);
    assert.strictEqual(m.income, 0.8);
    assert.strictEqual(m.pollution, 5);
    assert.strictEqual(m.grantChance, 2);
    assert.ok(rm.getSatisfactionFactors().some(f => f.key === 'reputation' && f.value === 5));
    assert.strictEqual(rm.getPollutionBalance().reputation, 5);
});

test('construir muda a reputação uma vez (na conclusão), não a cada recálculo de eficiência', () => {
    const plant = make('treatment_plant', { underConstruction: true });
    const { bs, qs } = city([plant]);
    Object.assign(bs, { constructionQueue: new Map(), getEfficiencyOnCompletion: () => 1, markEfficiencyDirty() {} });
    bs.completeConstruction(plant, { quiet: true });
    const env = qs.getReputation('environment');
    assert.strictEqual(env, 50 + BUILDINGS.treatment_plant.reputationOnBuild.environment);
    bs.applyBuildingEffects(plant, false);
    bs.applyBuildingEffects(plant, true);
    assert.strictEqual(qs.getReputation('environment'), env);
});

// ===== Campanha =====
test('missão final: depois da Seca Longa e da Cidade Esponja, com vitória e conquista com nome', () => {
    const final = MISSIONS.final_01;
    assert.deepStrictEqual([...final.prerequisites], ['challenge_05', 'story_chain_01_04']);
    assert.strictEqual(final.victory, true);
    for (const m of Object.values(MISSIONS)) {
        if (m.rewards?.achievement) assert.ok(ACHIEVEMENTS[m.rewards.achievement]?.name, `${m.rewards.achievement} sem nome`);
    }
    const { qs, gm } = city();
    let shown = 0;
    gm.uiManager = null; // o toast de missão usa PlayerProfile (DOM), fora do escopo aqui
    gm.gameOverSystem = { showVictory: () => shown++ };
    const quest = qs.quests.get('final_01');
    quest.status = 'active';
    qs.activeQuests.add('final_01');
    qs.completeQuest('final_01');
    assert.strictEqual(shown, 1);
    assert.ok(qs.achievements.has('guardian_city'));
});

test('campanha: 15+ missões, todas alcançáveis desde a primeira, crises variadas e a vitória por último', () => {
    const ids = Object.keys(MISSIONS);
    assert.ok(ids.length >= 15, `só ${ids.length} missões`);
    const ancestors = id => {
        const out = new Set();
        const walk = m => (MISSIONS[m].prerequisites || []).forEach(p => { if (!out.has(p)) { out.add(p); walk(p); } });
        walk(id);
        return out;
    };
    for (const id of ids) {
        if (id === 'tutorial_01') continue;
        assert.ok(ancestors(id).has('tutorial_01'), `${id} não sai da primeira missão`);
        assert.ok(MISSIONS[id].stars, `${id} sem meta de estrelas`);
    }
    // toda missão leva à vitória (nada fica solto depois do fim)
    const toFinal = ancestors('final_01');
    for (const id of ids) if (id !== 'final_01') assert.ok(toFinal.has(id), `${id} não leva à Cidade Guardiã`);
    const crises = Object.values(MISSIONS).filter(m => m.startEvent).map(m => m.startEvent.type);
    assert.ok(crises.length >= 4 && new Set(crises).size >= 4, `crises: ${crises}`);
});

test('objetivo de aquífero mede o nível', () => {
    const { qs, res } = city();
    res.water.aquifer = 40;
    const quest = qs.quests.get('final_01');
    const obj = quest.objectives.find(o => o.target === 'aquifer');
    assert.ok(qs.checkObjectiveProgress(obj, quest) < obj.required);
    res.water.aquifer = 80;
    assert.strictEqual(qs.checkObjectiveProgress(obj, quest), obj.required);
});

test('save antigo sem aquífero: recompõe bombas e áreas verdes dos prédios prontos', () => {
    const pump = make('water_pump', { effectsApplied: true });
    const park = make('park', { effectsApplied: true });
    const { bs, rm } = city([pump, park]);
    const old = rm.getSaveData();
    delete old.resources.water.groundwaterProduction;
    delete old.resources.water.aquiferRecharge;
    rm.loadData(JSON.parse(JSON.stringify(old)));
    bs.rebuildLegacyResourceTotals(old);
    assert.strictEqual(rm.resources.water.groundwaterProduction, BUILDINGS.water_pump.waterProduction);
    assert.strictEqual(rm.resources.water.aquiferRecharge, BUILDINGS.park.aquiferRecharge);
    assert.strictEqual(rm.getAquiferLevel(), 100, 'save antigo começa com o aquífero cheio');
});
