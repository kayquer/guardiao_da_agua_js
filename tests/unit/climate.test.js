// Clima simulado (SimulatedWeather): mesmo formato do clima real, determinístico e coerente com o jogo.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/systems/WeatherService.js', 'js/systems/SimulatedWeather.js', 'js/systems/WeatherEffects.js');
const SimulatedWeather = g('SimulatedWeather');
const WeatherService = g('WeatherService');
const WeatherEffects = g('WeatherEffects');

test('clima simulado: mesmo formato do WeatherService.parse, com 5 dias de previsão', () => {
    const data = SimulatedWeather.generate({ seed: 42, date: new Date(2026, 9, 24, 14), isDay: true });
    for (const key of ['temperature', 'apparent', 'humidity', 'wind', 'gusts', 'windDir', 'precipitation', 'code', 'isDay']) {
        assert.ok(key in data.current, `current.${key}`);
    }
    assert.strictEqual(data.daily.length, 5);
    assert.strictEqual(data.daily[0].date, '2026-10-24');
    for (const day of data.daily) {
        assert.ok(day.max >= day.min);
        assert.ok(day.rainChance >= 0 && day.rainChance <= 100);
        assert.notStrictEqual(WeatherService.describe(day.code).label, 'Tempo variável', `código conhecido: ${day.code}`);
    }
    assert.ok(data.current.gusts >= data.current.wind);
    // Os efeitos 3D entendem o simulado como entendem o real
    assert.notStrictEqual(WeatherEffects.profileFor(data.current).kind, 'none');
});

test('clima simulado: determinístico pela semente, dia e hora; muda entre dias e entre perfis', () => {
    const at = (seed, day, hour) => JSON.stringify(SimulatedWeather.generate({ seed, date: new Date(2026, 9, day, hour) }).current);
    assert.strictEqual(at(7, 24, 10), at(7, 24, 10));
    const days = new Set(Array.from({ length: 20 }, (_, i) => SimulatedWeather.day(7, 20000 + i).code));
    assert.ok(days.size >= 3, 'em 20 dias aparecem pelo menos 3 tipos de tempo');
    const seeds = new Set(Array.from({ length: 10 }, (_, i) => SimulatedWeather.day(SimulatedWeather.seedFrom(`p_${i}`), 20000).code));
    assert.ok(seeds.size >= 2, 'perfis diferentes têm tempos diferentes');
    // Mais quente à tarde que de madrugada
    const temp = hour => SimulatedWeather.generate({ seed: 7, date: new Date(2026, 9, 24, hour) }).current.temperature;
    assert.ok(temp(15) > temp(4));
});

test('clima simulado: chove em parte do tempo e o modo fica salvo (padrão = real)', () => {
    let rainyHours = 0;
    for (let d = 0; d < 30; d++) for (let h = 0; h < 24; h += 3) {
        const c = SimulatedWeather.generate({ seed: 3, date: new Date(2026, 0, 1 + d, h) }).current;
        if (WeatherEffects.profileFor(c).rain > 0) rainyHours++;
    }
    assert.ok(rainyHours > 0 && rainyHours < 30 * 8 * 0.6, `horas com chuva: ${rainyHours}`);

    assert.strictEqual(SimulatedWeather.mode(), 'real');
    let heard = null;
    SimulatedWeather.onChange(mode => { heard = mode; });
    SimulatedWeather.setMode('simulated');
    assert.strictEqual(SimulatedWeather.mode(), 'simulated');
    assert.strictEqual(heard, 'simulated');
    SimulatedWeather.setMode('outro');
    assert.strictEqual(SimulatedWeather.mode(), 'simulated', 'modo inválido é ignorado');
});
