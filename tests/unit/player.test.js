// Perfil do jogador, clima e progresso das aulas: regras sem DOM nem Babylon.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const setup = () => load('js/data/brazil.js', 'js/data/lessons.js', 'js/systems/PlayerProfile.js',
    'js/systems/WeatherService.js', 'js/systems/LessonProgress.js', 'js/systems/WeatherEffects.js');

const ANA = { name: 'Ana', age: 12, uf: 'SP', city: 'Campinas' };

test('perfil: validação pede nome, idade possível, estado e cidade', () => {
    const PlayerProfile = setup()('PlayerProfile');
    assert.deepStrictEqual(PlayerProfile.validate(ANA).length, 0);
    const errors = PlayerProfile.validate({ name: '  ', age: '3', uf: 'XX', city: '' });
    assert.strictEqual(errors.length, 4);
    assert.ok(PlayerProfile.validate({ ...ANA, name: 'x'.repeat(21) })[0].includes('20'));
    assert.strictEqual(PlayerProfile.validate({ ...ANA, age: '12.5' }).length, 1);
});

test('perfil: criar ativa; ativar outro troca; apagar o ativo deixa sem ativo', () => {
    const PlayerProfile = setup()('PlayerProfile');
    const ana = PlayerProfile.create(ANA);
    assert.strictEqual(PlayerProfile.getActive().id, ana.id);
    const bia = PlayerProfile.create({ ...ANA, name: 'Bia', age: 9 });
    assert.strictEqual(PlayerProfile.displayName(), 'Bia');
    PlayerProfile.activate(ana.id);
    assert.strictEqual(PlayerProfile.displayName(), 'Ana');
    assert.strictEqual(PlayerProfile.list().length, 2);
    PlayerProfile.remove(ana.id);
    assert.strictEqual(PlayerProfile.getActive(), null);
    assert.strictEqual(PlayerProfile.displayName(), 'Guardião');
    assert.strictEqual(JSON.stringify(PlayerProfile.list().map(p => p.id)), JSON.stringify([bia.id]));
});

test('perfil: dificuldade pela idade (até 10 fácil, até 14 normal, depois difícil)', () => {
    const PlayerProfile = setup()('PlayerProfile');
    assert.strictEqual(PlayerProfile.difficultyForAge(8).id, 'easy');
    assert.strictEqual(PlayerProfile.difficultyForAge(10).id, 'easy');
    assert.strictEqual(PlayerProfile.difficultyForAge(11).id, 'normal');
    assert.strictEqual(PlayerProfile.difficultyForAge(14).id, 'normal');
    assert.strictEqual(PlayerProfile.difficultyForAge(15).id, 'hard');
    assert.strictEqual(PlayerProfile.difficultyForAge(40).id, 'hard');
});

test('perfil: {nome} vira o nome do jogador, escapado (os textos vão para innerHTML)', () => {
    const PlayerProfile = setup()('PlayerProfile');
    PlayerProfile.create({ ...ANA, name: '<b>Ana' });
    assert.strictEqual(PlayerProfile.personalize('Olá, {nome}! Tchau, {nome}.'), 'Olá, &lt;b&gt;Ana! Tchau, &lt;b&gt;Ana.');
});

test('clima: códigos WMO viram texto, ícone e animação (noite troca o sol pela lua)', () => {
    const WeatherService = setup()('WeatherService');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(WeatherService.describe(0))), { label: 'Céu limpo', icon: '☀️', anim: 'sun' });
    assert.strictEqual(WeatherService.describe(0, false).icon, '🌙');
    assert.strictEqual(WeatherService.describe(63).anim, 'rain');
    assert.strictEqual(WeatherService.describe(95).anim, 'storm');
    assert.strictEqual(WeatherService.describe(1234).label, 'Tempo variável');
});

test('clima: resposta da Open-Meteo vira { current, daily }', () => {
    const WeatherService = setup()('WeatherService');
    const data = WeatherService.parse({
        current: { temperature_2m: 21.5, apparent_temperature: 22, relative_humidity_2m: 70, wind_speed_10m: 12, precipitation: 0, weather_code: 2, is_day: 0 },
        daily: { time: ['2026-10-21', '2026-10-22'], weather_code: [2, 61], temperature_2m_max: [25, 23], temperature_2m_min: [15, 16], precipitation_probability_max: [10, 80], precipitation_sum: [0, 5] }
    });
    assert.strictEqual(data.current.temperature, 21.5);
    assert.strictEqual(data.current.isDay, false);
    assert.strictEqual(data.daily.length, 2);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(data.daily[1])), { date: '2026-10-22', code: 61, max: 23, min: 16, rainChance: 80, rain: 5 });
    assert.ok(WeatherService.buildUrl(-22.9, -47.06).includes('latitude=-22.9'));
});

test('efeitos do clima: chuva forte, garoa, sol forte e neblina', () => {
    const WeatherEffects = setup()('WeatherEffects');
    assert.strictEqual(WeatherEffects.profileFor({ code: 65, wind: 30, temperature: 20, isDay: true }).rain, 1);
    assert.strictEqual(WeatherEffects.profileFor({ code: 51, wind: 5, temperature: 20, isDay: true }).rain, 0.3);
    assert.strictEqual(WeatherEffects.profileFor({ code: 0, wind: 5, temperature: 33, isDay: true }).hot, true);
    assert.strictEqual(WeatherEffects.profileFor({ code: 0, wind: 5, temperature: 33, isDay: false }).hot, false);
    assert.ok(WeatherEffects.profileFor({ code: 45, wind: 2, temperature: 14, isDay: true }).fog > 0);
    assert.ok(WeatherEffects.profileFor({ code: 95, wind: 40, temperature: 22, isDay: true }).lightning);
    assert.strictEqual(WeatherEffects.profileFor(null).kind, 'none');
});

test('aulas: progresso por jogador, sem repetir, e "próxima aula"', () => {
    const g = setup();
    const PlayerProfile = g('PlayerProfile'), LessonProgress = g('LessonProgress');
    const ana = PlayerProfile.create(ANA);
    assert.strictEqual(LessonProgress.markDone(2), true);
    assert.strictEqual(LessonProgress.markDone(2), false, 'segunda vez não conta de novo');
    assert.strictEqual(LessonProgress.markDone(99), false, 'aula que não existe');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(LessonProgress.summary())), { done: 1, total: 6, next: 1 });

    PlayerProfile.create({ ...ANA, name: 'Bia' }); // outro aluno começa do zero
    assert.strictEqual(LessonProgress.summary().done, 0);
    PlayerProfile.activate(ana.id);
    assert.ok(LessonProgress.isDone(2));
});
