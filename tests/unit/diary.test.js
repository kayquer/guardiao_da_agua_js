// A história da cidade (11/2026): Diário da cidade (marcos, save/load, save antigo), tendência dos pontos de volta,
// a causa da derrota (maiores fontes de poluição / consumidores de água) e o caminho dos planos de câmera.
// Objetos do vm comparam via JSON.stringify.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/data/props.js', 'js/data/fieldNotebook.js', 'js/systems/FieldNotebook.js', 'js/systems/CityDiary.js',
    'js/systems/SavePointTrend.js', 'js/systems/CityCinematic.js', 'js/systems/GameOverSystem.js');
const CityDiary = g('CityDiary');
const SavePointTrend = g('SavePointTrend');
const CityCinematic = g('CityCinematic');
const GameOverSystem = g('GameOverSystem');
const same = (a, b, msg) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), msg);

const DAY = 86400000;
const START = Date.UTC(2026, 10, 1, 8, 0);

/** GameManager de mentira: só o que o diário lê. */
function fakeGame() {
    const gm = {
        gameTime: 0,
        gameStartTime: new Date(START),
        gameClockTime: new Date(START),
        buildings: [],
        buildingSystem: { getAllBuildings: () => gm.buildings },
        questSystem: { completedQuests: new Set(), quests: new Map() },
        eventSystem: { activeEvents: new Map() },
        fieldNotebook: new (g('FieldNotebook'))(),
        resourceManager: { resources: { population: { current: 30 }, water: { river: 100 } } }
    };
    gm.setDay = d => { gm.gameClockTime = new Date(START + (d - 1) * DAY + 3600000); };
    return gm;
}

const building = (type, config, extra = {}) => ({ type, config: { name: type, ...config }, underConstruction: false, effectsApplied: true, ...extra });

test('diário: primeira construção de cada tipo, com o dia de jogo, uma vez só', () => {
    const diary = new CityDiary();
    const gm = fakeGame();
    gm.buildings.push(building('city_hall', { category: 'public', name: 'Prefeitura' }));
    gm.buildings.push(building('water_pump', { category: 'water', name: 'Bomba de Água', waterProduction: 50 }));
    gm.buildings.push(building('solar_micro', { category: 'power', name: 'Microgeração Solar', powerGeneration: 45, renewable: true },
        { underConstruction: true })); // obra não conta
    const first = diary.check(gm);
    same(first.map(e => e.key), ['city_hall', 'water_source']);
    assert.strictEqual(first[0].day, 1);

    gm.setDay(3);
    gm.buildings[2].underConstruction = false;
    gm.buildings.push(building('water_pump', { category: 'water', name: 'Bomba de Água', waterProduction: 50 })); // 2ª bomba: nada
    gm.buildings.push(building('treatment_plant', { category: 'treatment', name: 'ETE' }));
    gm.buildings.push(building('coal_plant', { category: 'power', name: 'Usina a Carvão', powerGeneration: 120 }));
    const next = diary.check(gm);
    same(next.map(e => e.key), ['clean_power', 'ete', 'fossil_power']);
    assert.ok(next.every(e => e.day === 3), 'dia 3 do relógio da cidade');
    assert.match(next[0].text, /Microgeração Solar/);
    assert.strictEqual(diary.check(gm).length, 0, 'nada repetido');

    // primeiro bairro completo (fase 3) de cada tipo de zona
    const zone = building('residential_light', { category: 'residential', zoneType: 'residential_light', name: 'Zona Residencial Leve' }, { zoneStage: 2 });
    gm.buildings.push(zone);
    assert.strictEqual(diary.check(gm).length, 0, 'fase 2 ainda não');
    zone.zoneStage = 3;
    const z = diary.check(gm);
    same(z.map(e => e.key), ['zone_residential']);
    assert.match(z[0].text, /bairro de casas completo/);
});

test('diário: missão com estrelas, evento com a escolha do Paulo, espécies e recordes', () => {
    const diary = new CityDiary();
    const gm = fakeGame();
    gm.questSystem.quests.set('energy_01', { title: 'Energia para a Bomba', stars: 2 });
    gm.questSystem.completedQuests.add('energy_01');
    gm.eventSystem.activeEvents.set('event_1_drought', {
        id: 'event_1_drought', type: 'drought', responseId: 'ration', verdict: { good: false, why: 'os moradores já estavam infelizes' },
        config: { name: 'Seca', icon: '🌵', response: { options: [{ id: 'ration', label: 'Racionar água' }] } }
    });
    gm.fieldNotebook.register('sapo', 1000);
    gm.fieldNotebook.register('ra_das_pedras', 2000);
    gm.resourceManager.resources.population.current = 260;
    const entries = diary.check(gm);
    const by = kind => entries.filter(e => e.kind === kind);

    assert.strictEqual(by('mission')[0].stars, 2);
    assert.match(by('mission')[0].text, /Missão concluída: Energia para a Bomba/);
    const event = by('event')[0];
    assert.strictEqual(event.choice, 'Racionar água');
    assert.strictEqual(event.good, false);
    assert.match(event.why, /infelizes/);
    same(by('species').map(e => [e.key, e.threatened]), [['sapo', false], ['ra_das_pedras', true]]);
    same(by('record').map(e => e.key), ['population_250'], 'só o maior marco passado');

    // espécie ameaçada registrada que sumiu e voltou
    gm.fieldNotebook.seen.ra_das_pedras.returns = 1;
    gm.fieldNotebook.seen.sapo = { first: 0, returns: 1 }; // comum: não é marco
    const back = diary.check(gm);
    same(back.map(e => e.kind), ['return']);
    assert.match(back[0].text, /ameaçada voltou/);

    // rio: baixou e voltou a encher
    gm.resourceManager.resources.water.river = 60;
    assert.strictEqual(diary.check(gm).length, 0);
    gm.resourceManager.resources.water.river = 97;
    same(diary.check(gm).map(e => e.key), ['river_full']);
    gm.resourceManager.resources.water.river = 100;
    assert.strictEqual(diary.check(gm).length, 0, 'cheio de novo sem ter baixado não repete');
});

test('diário: tick olha a cada 2 s de jogo; resumo da vitória prioriza missões', () => {
    const diary = new CityDiary();
    const gm = fakeGame();
    gm.buildings.push(building('city_hall', { category: 'public' }));
    diary.tick(1500, gm);
    assert.strictEqual(diary.entries.length, 0);
    diary.tick(600, gm);
    assert.strictEqual(diary.entries.length, 1);

    for (let i = 0; i < 12; i++) diary.add('species', { key: `s${i}`, icon: '📓', text: `bicho ${i}` }, gm);
    diary.add('mission', { key: 'final_01', icon: '🏆', text: 'Campanha vencida', stars: 3 }, gm);
    const top = diary.highlights(8);
    assert.strictEqual(top.length, 8);
    assert.ok(top.some(e => e.kind === 'mission'), 'a missão entra no resumo');
    assert.ok(top.some(e => e.kind === 'build'), 'a prefeitura também');
});

test('diário: salvar/carregar; save antigo começa vazio e não inventa marcos do que já existia', () => {
    const diary = new CityDiary();
    const gm = fakeGame();
    gm.buildings.push(building('city_hall', { category: 'public' }));
    gm.questSystem.quests.set('tutorial_01', { title: 'Primeiros passos', stars: 3 });
    gm.questSystem.completedQuests.add('tutorial_01');
    diary.check(gm);
    const saved = JSON.parse(JSON.stringify(diary.getSaveData()));
    assert.strictEqual(saved.entries.length, 2);

    const again = new CityDiary();
    again.loadData(saved);
    same(again.entries, saved.entries);
    // evento que já estava ativo no save: só marcado (o id muda a cada carregamento)
    gm.eventSystem.activeEvents.set('event_9_flood', { id: 'event_9_flood', type: 'flood', config: { name: 'Enchente' } });
    assert.strictEqual(again.check(gm).length, 0, 'nada repetido nem o evento antigo');
    gm.eventSystem.activeEvents.set('event_10_wildfire', { id: 'event_10_wildfire', type: 'wildfire', config: { name: 'Queimada' } });
    same(again.check(gm).map(e => e.kind), ['event'], 'evento novo depois do carregamento entra');

    const old = new CityDiary();
    old.loadData(undefined); // save de antes do diário
    assert.strictEqual(old.entries.length, 0);
    assert.strictEqual(old.check(gm).length, 0, 'a 1ª olhada só marca o que a cidade já tem');
    gm.buildings.push(building('treatment_plant', { category: 'treatment' }));
    same(old.check(gm).map(e => e.key), ['ete'], 'o que vem depois entra');

    const broken = new CityDiary();
    broken.loadData({ entries: 'x' });
    assert.strictEqual(broken.entries.length, 0);
    assert.strictEqual(broken.primeAll, true);
});

test('diário: dia de jogo pelo relógio da cidade', () => {
    assert.strictEqual(CityDiary.dayOf({}), 1);
    assert.strictEqual(CityDiary.dayOf({ gameStartTime: new Date(START), gameClockTime: new Date(START + 2.5 * DAY) }), 3);
});

test('pontos de volta: resumo, tendência e frase (arriscado quando a cidade já ia mal)', () => {
    const game = (water, pollution, satisfaction = 60, population = 200) => ({
        gameTime: 1, resources: { resources: { water: { current: water, max: 1000 }, pollution: { current: pollution }, population: { satisfaction, current: population } } }
    });
    const before = SavePointTrend.summarize(game(500, 50));
    const after = SavePointTrend.summarize(game(380, 62, 55));
    same([after.water, after.pollution, after.satisfaction], [38, 62, 55]);
    const trend = SavePointTrend.compare(before, after);
    same([trend.water, trend.pollution, trend.satisfaction, trend.population], ['down', 'up', 'down', 'flat']);
    const d = SavePointTrend.describe(after, trend, 3);
    assert.match(d.text, /^há 3 min: água 38% e caindo, poluição 62 e subindo/);
    assert.strictEqual(d.risky, true, 'poluição acima de 60 e subindo');
    assert.strictEqual(SavePointTrend.describe({ ...after, pollution: 40 }, trend).risky, false, 'água 38% caindo e poluição 40 ainda dá');
    assert.strictEqual(SavePointTrend.describe({ ...after, water: 20, pollution: 40 }, trend).risky, true, 'pouca água e caindo');
    const calm = SavePointTrend.describe(after, SavePointTrend.compare(after, after));
    assert.match(calm.text, /água 38% estável, poluição 62 estável/);
    const noTrend = SavePointTrend.describe(after, null, 5);
    assert.strictEqual(noTrend.text, 'há 5 min: água 38%, poluição 62', 'sem foto anterior: só os números');
});

test('derrota por poluição: a maior fonte com a parte dela, e a 1ª dica fala dela', () => {
    const coal = building('coal_plant', { name: 'Usina a Carvão', category: 'power', powerGeneration: 120, pollutionGeneration: 55 }, { appliedPollution: 55 });
    const pump = building('water_pump', { name: 'Bomba de Água', category: 'water', pollutionGeneration: 1 }, { appliedPollution: 1 });
    const pump2 = building('water_pump', { name: 'Bomba de Água', category: 'water', pollutionGeneration: 1 }, { appliedPollution: 1 });
    const site = building('factory', { name: 'Fábrica', pollutionGeneration: 30 }, { effectsApplied: false }); // obra: não conta
    const result = GameOverSystem.pollutionCulprits([coal, pump, pump2, site], { sources: 57, sewage: 0, reduction: 5 });
    assert.strictEqual(result.total, 57);
    same(result.groups.map(g => [g.name, g.count, g.total]), [['Usina a Carvão', 1, 55], ['Bomba de Água', 2, 2]]);
    assert.ok(Math.abs(result.groups[0].share - 55 / 57) < 1e-9);
    assert.match(GameOverSystem.pollutionTip(result.groups[0]), /Usina a Carvão<\/b> era a maior fonte: troque por energia limpa/);

    // esgoto e eventos entram como fontes
    const mixed = GameOverSystem.pollutionCulprits([pump], { sources: 21, sewage: 8 });
    same(mixed.groups.map(g => g.key), ['events', 'sewage', 'water_pump']);
    assert.match(GameOverSystem.pollutionTip(mixed.groups[1]), /ETE/);
});

test('derrota por água: quem mais gastava e a dica dele', () => {
    const consumers = { total: 300, groups: [
        { key: 'hospital', config: { name: 'Hospital' }, count: 1, total: 50, people: 0 },
        { key: 'residential_heavy', config: { name: 'Zona Residencial Pesada', zoneType: 'residential_heavy' }, count: 2, total: 200, people: 120 },
        { key: 'other', name: 'Outros consumos', count: 1, total: 50, people: 0 }
    ] };
    const result = GameOverSystem.waterCulprits(consumers);
    same(result.groups.map(g => g.name), ['Zona Residencial Pesada', 'Hospital', 'Outros consumos']);
    assert.match(GameOverSystem.waterTip(result.groups[0], 100), /moradores/);
    assert.match(GameOverSystem.waterTip(result.groups[0], 0), /Nenhuma fonte de água/);
    assert.strictEqual(GameOverSystem.groupLabel(result.groups[0]), '<b>2× Zona Residencial Pesada</b>');
});

test('planos de câmera: voo da vitória passa pelos pontos e termina no ângulo do jogo', () => {
    const start = { x: 0, z: 0, alpha: -0.8, beta: CityCinematic.ISO_BETA, radius: 30 };
    const keys = CityCinematic.planVictory(start, {
        center: { x: 5, z: 5 }, river: { x: -20, z: 10 }, homes: { x: 12, z: 0 }, utilities: { x: 12.5, z: 0.5 }, extent: 18
    });
    // utilities colado nos bairros é pulado; fim = centro, 2 quadros (aproxima + giro lento)
    same(keys.map(k => [k.x, k.z]), [[0, 0], [-20, 10], [12, 0], [5, 5], [5, 5]]);
    const last = keys[keys.length - 1];
    assert.strictEqual(last.beta, CityCinematic.ISO_BETA, 'termina no beta que os controles travam');
    assert.ok(keys.every((k, i) => i === 0 || k.alpha > keys[i - 1].alpha), 'gira sempre para o mesmo lado');
    assert.ok(last.radius >= 30 && last.radius <= 52);
    const a = CityCinematic.sample(keys, 0), b = CityCinematic.sample(keys, 1);
    assert.ok(Math.abs(a.x - 0) < 1e-6 && Math.abs(a.radius - 30) < 1e-6, 'começa na pose do jogador');
    assert.ok(Math.abs(b.x - 5) < 1e-3 && Math.abs(b.beta - CityCinematic.ISO_BETA) < 1e-3, 'acaba na pose final');
    assert.ok(Math.abs(CityCinematic.ease(0)) < 1e-9 && Math.abs(CityCinematic.ease(1) - 1) < 1e-9);

    const cut = CityCinematic.planSpecies(start, { x: 10, z: -4 });
    assert.strictEqual(cut.length, 3);
    same([cut[2].x, cut[2].z, cut[2].radius], [10, -4, 16]);
    assert.strictEqual(cut[2].beta, CityCinematic.ISO_BETA);
});
