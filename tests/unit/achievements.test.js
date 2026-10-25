// Conquistas por níveis (js/data/achievementTracks.js + js/systems/AchievementTracks.js), lembretes da missão
// (js/systems/MissionReminders.js) e vigia de queda dos guias de socorro (js/systems/DeclineWatch.js + js/data/rescueGuides.js).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/core/ResourceManager.js', 'js/data/buildings.js', 'js/data/missions.js',
    'js/data/achievementTracks.js', 'js/data/rescueGuides.js', 'js/data/resourceStates.js', 'js/systems/ResourceTrends.js',
    'js/systems/DeclineWatch.js', 'js/systems/PlayerProfile.js', 'js/systems/QuestSystem.js', 'js/systems/AchievementTracks.js', 'js/systems/MissionReminders.js');
const QuestSystem = g('QuestSystem');
const DeclineWatch = g('DeclineWatch');
const TRACKS = g('ACHIEVEMENT_TRACKS');
const BUILDINGS = g('BUILDING_TYPES');
Object.assign(QuestSystem.prototype, { updateQuestUI() {}, playMissionCompletionAudio() {} });

function setup(buildings = []) {
    const toasts = [];
    const gm = {
        gameState: 'playing', tutorialDone: true,
        buildingSystem: { getBuildingsByType: () => [], getAllBuildings: () => buildings },
        uiManager: {
            shown: toasts,
            showNotification: (msg, type, ms, opts = {}) => { if (!opts.quiet) toasts.push({ msg, opts }); },
            showAchievementToast: info => toasts.push({ achievement: info }),
            showAchievementSummaryToast: n => toasts.push({ summary: n }),
            isInfoPopupOpen: () => false, isReadingOverlayOpen: () => false
        }
    };
    gm.resourceManager = new (g('ResourceManager'))(gm);
    const qs = new QuestSystem(gm);
    return { gm, qs, toasts, resources: gm.resourceManager.resources };
}

const built = (type, extra = {}) => ({ type, config: { id: type, ...BUILDINGS[type] }, underConstruction: false, ...extra });

test('toda trilha tem 5 níveis crescentes, nome, ícone SVG e métrica medida', () => {
    const icons = fs.readFileSync(path.join(ROOT, 'js/utils/Icons.js'), 'utf8');
    const metrics = QuestSystem.measureAchievementMetrics([], {});
    const names = new Set();
    for (const [id, t] of Object.entries(TRACKS)) {
        assert.strictEqual(t.levels.length, 5, id);
        t.levels.forEach((l, i) => {
            assert.ok(l.name && !names.has(l.name), `${id}: nome repetido ou vazio no nível ${i + 1}`);
            names.add(l.name);
            if (i) assert.ok(l.goal >= t.levels[i - 1].goal * 1.4, `${id}: nível ${i + 1} perto demais do anterior`);
        });
        assert.ok(t.metric in metrics, `${id}: métrica ${t.metric} não é medida`);
        assert.ok(t.description.includes('{n}'), id);
        assert.ok(new RegExp(`'${t.icon}': 'l'`).test(icons), `${id}: ícone ${t.icon} fora de UI_ICON_FILES`);
        assert.ok(fs.existsSync(path.join(ROOT, 'assets/icons/svg', `${t.icon}.svg`)), `${id}: falta ${t.icon}.svg`);
    }
});

test('as conquistas antigas continuam iguais', () => {
    assert.strictEqual(Object.keys(g('ACHIEVEMENTS')).sort().join(), 'climate_guardian,crisis_manager,guardian_city,sustainable_city');
});

test('métricas contam só o que está pronto, por tipo de rua e de zona', () => {
    const m = QuestSystem.measureAchievementMetrics([
        built('water_pump'), built('water_well'), built('water_pump', { underConstruction: true }),
        built('paved_road'), built('paved_road'), built('gravel_road'), built('dirt_road'),
        built('zone_residential_light'), built('zone_commercial_heavy'), built('zone_industrial_balanced'),
        built('tree_sapling'), built('recycling_point'), built('university')
    ], { budget: { current: 123 }, electricity: { generation: 400 }, water: { storage: 2500 } });
    assert.strictEqual(m.water_sources, 2);
    assert.deepStrictEqual([m.road_paved, m.road_gravel, m.road_dirt], [2, 1, 1]);
    assert.deepStrictEqual([m.zone_residential, m.zone_commercial, m.zone_industrial], [1, 1, 1]);
    assert.deepStrictEqual([m.trees, m.recycling, m.high_tech], [1, 1, 1]);
    assert.deepStrictEqual([m.budget, m.power, m.storage], [123, 400, 2500]);
    assert.strictEqual(QuestSystem.trackLevel(TRACKS.power, 400), 1);
    assert.strictEqual(QuestSystem.trackLevel(TRACKS.storage, 2500), 1);
});

test('nível novo vira um aviso só (o maior), com espaço entre avisos; save antigo guarda em silêncio', () => {
    const { qs, toasts, resources } = setup();
    qs.updateAchievementTracks(); // 1ª conferência: nada ainda
    assert.strictEqual(toasts.length, 0);

    resources.budget.current = 600000; // pula 3 níveis de uma vez
    qs.lastTrackCheckAt = 0;
    qs.updateAchievementTracks();
    assert.ok(['track_budget_1', 'track_budget_2', 'track_budget_3'].every(id => qs.achievements.has(id)));
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].achievement.id, 'track_budget_3');
    assert.strictEqual(toasts[0].achievement.levelName, 'Ouro');

    resources.electricity.generation = 450; // outro nível logo depois: espera na fila
    qs.lastTrackCheckAt = 0;
    qs.updateAchievementTracks();
    assert.strictEqual(toasts.length, 1, 'dois avisos de conquista seguidos');
    qs.lastAchievementToastAt -= qs.ACHIEVEMENT_TOAST_GAP_MS;
    qs.updateAchievementTracks();
    assert.strictEqual(toasts[1].achievement.id, 'track_power_1');

    // load de um save que já tinha chegado lá: guarda tudo, um aviso de resumo
    const loaded = setup();
    loaded.qs.loadData({ achievements: ['crisis_manager'] });
    loaded.resources.budget.current = 300000;
    loaded.qs.updateAchievementTracks();
    assert.ok(loaded.qs.achievements.has('track_budget_2') && loaded.qs.achievements.has('crisis_manager'));
    assert.deepStrictEqual(JSON.stringify(loaded.toasts), JSON.stringify([{ summary: 2 }]));
});

test('reciclar não tira nível nem repete aviso', () => {
    const roads = Array.from({ length: 25 }, () => built('paved_road'));
    const { qs, toasts } = setup(roads);
    qs.tracksPrimed = true;
    qs.updateAchievementTracks();
    assert.ok(qs.achievements.has('track_paved_roads_1'));
    roads.length = 0;
    qs.lastTrackCheckAt = 0;
    qs.updateAchievementTracks();
    assert.ok(qs.achievements.has('track_paved_roads_1'));
    assert.strictEqual(toasts.length, 1);
});

test('achievementInfo resolve conquista de nível e de missão', () => {
    const lvl = QuestSystem.achievementInfo('track_water_sources_1');
    assert.strictEqual(lvl.name, 'Farejador de Água');
    assert.match(lvl.description, /5 fontes/);
    assert.strictEqual(QuestSystem.achievementInfo('crisis_manager').name, 'Gestora de Crise');
});

test('missão parada vira lembrete com atalho de construir; cada lembrete espera mais', () => {
    const { qs, toasts } = setup();
    let now = 0;
    qs.simNow = () => now;
    const quest = qs.quests.get('tutorial_01');
    quest.status = 'active';
    qs.activeQuests.add('tutorial_01');
    qs.currentMainQuest = 'tutorial_01';
    qs.updateMissionReminders();
    now = qs.MISSION_REMIND_MS - 1;
    qs.updateMissionReminders();
    assert.strictEqual(toasts.length, 0);
    now = qs.MISSION_REMIND_MS + 1;
    qs.updateMissionReminders();
    assert.strictEqual(toasts.length, 1);
    assert.match(toasts[0].msg, /Lembrete da missão/);
    assert.strictEqual(JSON.stringify(toasts[0].opts.actions.map(a => a.label)), JSON.stringify(['🏗️ Construir', '🎯 Ver missão']));
    now += qs.MISSION_REMIND_MS + 1; // o 2º espera 1,5×
    qs.updateMissionReminders();
    assert.strictEqual(toasts.length, 1);
});

test('vigia de queda: só "cai sem parar" conta; ruído e subida não', () => {
    const w = new DeclineWatch({ sampleMs: 5000, windowMs: 60000 });
    const r = { water: { current: 1000, storage: 1000 }, pollution: { current: 40 }, budget: { current: 20000 }, population: { current: 100, satisfaction: 60 }, electricity: { generation: 10, consumption: 5 } };
    for (let t = 0; t <= 60000; t += 5000) {
        r.water.current -= 20; // 2% por amostra: 24% no minuto
        r.pollution.current += t === 30000 ? -0.5 : 1; // um passo de ruído
        w.sample(r, t);
    }
    assert.deepStrictEqual(JSON.stringify(w.declining()), JSON.stringify(['water', 'pollution']));
    assert.strictEqual(DeclineWatch.isDeclining('water', [0.9, 0.85, 0.9, 0.8, 0.85, 0.75]), false, 'sobe e desce não é cair sem parar');
    assert.strictEqual(DeclineWatch.isDeclining('energy', [0.8, 0.8, 0.79, 0.8]), true);
    const short = new DeclineWatch();
    short.sample(r, 0); short.sample(r, 5000); short.sample(r, 10000);
    assert.strictEqual(short.declining().length, 0, 'janela curta não conta');
});

test('guias de socorro sugerem prédios que existem e cobrem todo recurso vigiado', () => {
    const guides = g('RESCUE_GUIDES');
    for (const id of DeclineWatch.RESOURCES) {
        const def = guides[id];
        assert.ok(def && def.title && def.tip && def.category, id);
        assert.ok(def.suggest.length >= 3, id);
        def.suggest.forEach(s => assert.ok(BUILDINGS[s.id] && s.why, `${id}: ${s.id}`));
    }
});
