/**
 * WeatherService — clima real da cidade do jogador (Open-Meteo: grátis, sem chave, CORS liberado).
 * Sem DOM (testável em tests/unit): o card e o popup ficam em js/systems/ui/WeatherUI.js.
 *
 * fetch(lat, lon) → { current: {temperature, apparent, humidity, wind, precipitation, code, isDay},
 *                     daily: [{date, code, max, min, rainChance, rain}], fetchedAt }
 * A resposta fica em cache no localStorage por WEATHER.CACHE_MS.
 */
class WeatherService {
    static CACHE_KEY = 'guardiao_agua_weather';

    // Códigos WMO (https://open-meteo.com/en/docs) → texto, ícone e animação do card
    static CODES = [
        { codes: [0], label: 'Céu limpo', icon: '☀️', nightIcon: '🌙', anim: 'sun' },
        { codes: [1, 2], label: 'Poucas nuvens', icon: '🌤️', nightIcon: '🌙', anim: 'partly' },
        { codes: [3], label: 'Nublado', icon: '☁️', anim: 'cloud' },
        { codes: [45, 48], label: 'Neblina', icon: '🌫️', anim: 'fog' },
        { codes: [51, 53, 55, 56, 57], label: 'Garoa', icon: '🌦️', anim: 'rain' },
        { codes: [61, 63, 66, 80, 81], label: 'Chuva', icon: '🌧️', anim: 'rain' },
        { codes: [65, 67, 82], label: 'Chuva forte', icon: '🌧️', anim: 'rain' },
        { codes: [71, 73, 75, 77, 85, 86], label: 'Neve', icon: '❄️', anim: 'snow' },
        { codes: [95, 96, 99], label: 'Tempestade', icon: '⛈️', anim: 'storm' }
    ];

    /** Texto, ícone e animação para um código WMO. */
    static describe(code, isDay = true) {
        const entry = WeatherService.CODES.find(e => e.codes.includes(Number(code)));
        if (!entry) return { label: 'Tempo variável', icon: '🌡️', anim: 'cloud' };
        return { label: entry.label, icon: !isDay && entry.nightIcon ? entry.nightIcon : entry.icon, anim: entry.anim };
    }

    /** Direção em graus → ponto cardeal em português (de onde o vento vem). */
    static compass(degrees) {
        const points = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
        return points[Math.round(((Number(degrees) % 360) + 360) % 360 / 45) % 8];
    }

    static buildUrl(lat, lon) {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation,weather_code,is_day',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max',
            timezone: 'America/Sao_Paulo',
            forecast_days: WEATHER.FORECAST_DAYS
        });
        return `${WEATHER.FORECAST_URL}?${params}`;
    }

    /** Converte a resposta da Open-Meteo no formato do jogo. */
    static parse(json) {
        const c = json.current || {};
        const d = json.daily || {};
        return {
            current: {
                temperature: c.temperature_2m,
                apparent: c.apparent_temperature,
                humidity: c.relative_humidity_2m,
                wind: c.wind_speed_10m,
                gusts: c.wind_gusts_10m ?? c.wind_speed_10m,
                windDir: c.wind_direction_10m ?? 90, // de onde o vento vem, em graus (0 = norte)
                precipitation: c.precipitation,
                code: c.weather_code,
                isDay: c.is_day !== 0
            },
            daily: (d.time || []).map((date, i) => ({
                date,
                code: d.weather_code?.[i],
                max: d.temperature_2m_max?.[i],
                min: d.temperature_2m_min?.[i],
                rainChance: d.precipitation_probability_max?.[i],
                rain: d.precipitation_sum?.[i],
                wind: d.wind_speed_10m_max?.[i],
                gusts: d.wind_gusts_10m_max?.[i]
            })),
            fetchedAt: Date.now()
        };
    }

    static readCache(lat, lon) {
        try {
            const cache = JSON.parse(localStorage.getItem(WeatherService.CACHE_KEY));
            if (cache && cache.lat === lat && cache.lon === lon && Date.now() - cache.data.fetchedAt < WEATHER.CACHE_MS) {
                return cache.data;
            }
        } catch {
            // cache ilegível: busca de novo
        }
        return null;
    }

    /** Clima atual + previsão. Usa o cache se estiver fresco; lança erro se a rede falhar. */
    static async fetch(lat, lon, { force = false } = {}) {
        if (!force) {
            const cached = WeatherService.readCache(lat, lon);
            if (cached) return cached;
        }
        const response = await fetch(WeatherService.buildUrl(lat, lon));
        if (!response.ok) throw new Error(`Open-Meteo respondeu ${response.status}`);
        const data = WeatherService.parse(await response.json());
        try {
            localStorage.setItem(WeatherService.CACHE_KEY, JSON.stringify({ lat, lon, data }));
        } catch {
            // localStorage cheio/bloqueado: segue sem cache
        }
        return data;
    }

    /** "ter.", "qua."… para a data AAAA-MM-DD da previsão ("Hoje" para a primeira). */
    static dayLabel(date, index) {
        if (index === 0) return 'Hoje';
        const [y, m, d] = date.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' });
    }
}
