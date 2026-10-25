/**
 * SimulatedWeather — clima inventado pelo jogo, para quando o jogador escolhe "Simulado" nas configurações
 * (ou quando a cidade não tem localização). Sem DOM (testável em tests/unit).
 *
 * Gera exatamente o formato de WeatherService.parse — { current, daily[5], fetchedAt } — então tudo que lê o clima
 * real (efeitos 3D, pesos dos eventos, recarga do aquífero pela chuva, música e ambientes, rotores, bússola, popup)
 * funciona igual. É determinístico: a mesma semente + dia + hora de jogo dão sempre o mesmo tempo.
 *
 * O modo (real | simulated) fica salvo neste navegador em STORAGE_KEY; o padrão é o clima real da cidade.
 */
class SimulatedWeather {
    static STORAGE_KEY = 'guardiao_agua_climate';
    static MODES = ['real', 'simulated'];
    static listeners = [];

    // Tipos de dia (código WMO) e quanto aparecem: clima tropical brasileiro, mais sol que chuva
    static DAY_TYPES = [
        { code: 0, weight: 30, rainChance: [0, 10], rain: [0, 0], wind: [5, 14], temp: [26, 33] },
        { code: 2, weight: 24, rainChance: [5, 25], rain: [0, 1], wind: [6, 16], temp: [24, 31] },
        { code: 3, weight: 14, rainChance: [20, 45], rain: [0, 2], wind: [8, 18], temp: [21, 27] },
        { code: 45, weight: 5, rainChance: [10, 30], rain: [0, 1], wind: [2, 6], temp: [16, 22] },
        { code: 61, weight: 13, rainChance: [60, 85], rain: [4, 15], wind: [8, 20], temp: [19, 25] },
        { code: 65, weight: 7, rainChance: [80, 95], rain: [15, 40], wind: [12, 26], temp: [18, 24] },
        { code: 95, weight: 7, rainChance: [85, 100], rain: [20, 60], wind: [20, 38], temp: [22, 29] }
    ];

    static mode() {
        try {
            const saved = localStorage.getItem(SimulatedWeather.STORAGE_KEY);
            return SimulatedWeather.MODES.includes(saved) ? saved : 'real';
        } catch {
            return 'real';
        }
    }

    static setMode(mode) {
        if (!SimulatedWeather.MODES.includes(mode)) return;
        try { localStorage.setItem(SimulatedWeather.STORAGE_KEY, mode); } catch { /* modo privado: vale nesta visita */ }
        SimulatedWeather.listeners.forEach(fn => fn(mode));
    }

    static onChange(fn) {
        SimulatedWeather.listeners.push(fn);
    }

    /** Número inteiro estável a partir de um texto (id do perfil). */
    static seedFrom(text) {
        let h = 2166136261;
        for (const ch of String(text || 'guardiao')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
        return h >>> 0;
    }

    /** Aleatório reprodutível (mulberry32) para a semente + partes (dia, hora...). */
    static random(seed, ...parts) {
        let a = (seed ^ parts.reduce((acc, p) => Math.imul(acc ^ (p + 0x9e3779b9), 2654435761) >>> 0, 0x85ebca6b)) >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** O tempo de um dia de jogo: tipo, mínima/máxima, chance e volume de chuva, vento, rajadas e direção. */
    static day(seed, dayIndex) {
        const rnd = SimulatedWeather.random(seed, dayIndex);
        const total = SimulatedWeather.DAY_TYPES.reduce((s, t) => s + t.weight, 0);
        let pick = rnd() * total;
        const type = SimulatedWeather.DAY_TYPES.find(t => (pick -= t.weight) < 0) || SimulatedWeather.DAY_TYPES[0];
        const range = ([a, b]) => a + (b - a) * rnd();
        const max = Math.round(range(type.temp));
        const wind = Math.round(range(type.wind));
        return {
            code: type.code,
            max,
            min: max - Math.round(6 + rnd() * 5),
            rainChance: Math.round(range(type.rainChance)),
            rain: Math.round(range(type.rain) * 10) / 10,
            wind,
            gusts: Math.round(wind * (1.4 + rnd() * (type.code === 95 ? 1.2 : 0.5))),
            windDir: Math.round(rnd() * 360)
        };
    }

    /**
     * Clima completo para o dia/hora de jogo. date = Date do relógio do jogo (dia e hora), isDay = é dia no jogo.
     * A chuva do dia não cai o dia inteiro: em cada hora ela cai com a chance do dia (senão fica nublado).
     */
    static generate({ seed, date, isDay = true }) {
        const when = date && typeof date.getTime === 'function' && !Number.isNaN(date.getTime()) ? date : new Date();
        const dayIndex = Math.floor(Date.UTC(when.getFullYear(), when.getMonth(), when.getDate()) / 86400000);
        const hour = when.getHours();
        const today = SimulatedWeather.day(seed, dayIndex);
        const rnd = SimulatedWeather.random(seed, dayIndex, hour + 1);
        const rainy = today.code >= 61;
        const raining = rainy && rnd() * 100 < today.rainChance;
        const code = rainy && !raining ? 3 : today.code;
        // Temperatura: mínima de madrugada, máxima às 15 h
        const t = (Math.cos(((hour - 15) / 24) * Math.PI * 2) + 1) / 2;
        const temperature = Math.round((today.min + (today.max - today.min) * t) * 10) / 10;
        const wind = Math.max(0, Math.round(today.wind * (0.7 + rnd() * 0.6)));
        const current = {
            temperature,
            apparent: Math.round((temperature + (raining ? -1 : 1.5)) * 10) / 10,
            humidity: Math.round(raining ? 85 + rnd() * 12 : code === 45 ? 92 : 45 + rnd() * 30),
            wind,
            gusts: Math.max(wind, Math.round(today.gusts * (0.8 + rnd() * 0.3))),
            windDir: Math.round((today.windDir + (rnd() - 0.5) * 40 + 360) % 360),
            precipitation: raining ? Math.round(today.rain / 6 * 10) / 10 : 0,
            code,
            isDay: !!isDay
        };
        const daily = Array.from({ length: 5 }, (_, i) => {
            const d = SimulatedWeather.day(seed, dayIndex + i);
            const date = new Date(Date.UTC(when.getFullYear(), when.getMonth(), when.getDate() + i));
            return { date: date.toISOString().slice(0, 10), code: d.code, max: d.max, min: d.min,
                rainChance: d.rainChance, rain: d.rain, wind: d.wind, gusts: d.gusts };
        });
        return { current, daily, fetchedAt: Date.now(), simulated: true };
    }
}
