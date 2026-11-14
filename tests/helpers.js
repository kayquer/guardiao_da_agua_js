// Começo de jogo comum aos testes E2E (e ao scripts/screenshot-buildings.js).
// O jogo agora começa por um perfil de jogador e chama APIs externas (clima Open-Meteo, municípios IBGE):
// aqui elas são simuladas, para o teste não depender da rede (e o smoke reprova qualquer request falho).

// Prefixo das chaves do localStorage (STORAGE_PREFIX em js/config/GameConstants.js): cada versão publicada tem o seu.
// No navegador (page.evaluate) use a global STORAGE_PREFIX; em addInitScript, que roda antes do jogo, passe storageKey().
const STORAGE_PREFIX = /const STORAGE_PREFIX = '([^']+)'/.exec(
    require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'config', 'GameConstants.js'), 'utf8'))[1];
const storageKey = name => STORAGE_PREFIX + name;

const TEST_PROFILE = {
    id: 'p_teste', name: 'Teste', age: 12, uf: 'SP', city: 'Campinas',
    lat: -22.9, lon: -47.06, createdAt: 1, lastPlayedAt: 1
};

// Formato da Open-Meteo (WeatherService.parse). Chuva: exercita as partículas do WeatherEffects.
const FORECAST = {
    current: {
        temperature_2m: 22.4, apparent_temperature: 23, relative_humidity_2m: 80, wind_speed_10m: 18,
        precipitation: 1.2, weather_code: 61, is_day: 1
    },
    daily: {
        time: ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'],
        weather_code: [61, 3, 0, 95, 2],
        temperature_2m_max: [25, 27, 30, 24, 26],
        temperature_2m_min: [17, 16, 18, 19, 17],
        precipitation_probability_max: [80, 20, 5, 90, 30],
        precipitation_sum: [6, 0, 0, 20, 1]
    }
};

const CLEAR_SKY = { ...FORECAST, current: { ...FORECAST.current, weather_code: 0, precipitation: 0, wind_speed_10m: 4 } };

async function mockExternalApis(page, { forecast = FORECAST } = {}) {
    await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: forecast }));
    await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({
        json: { results: [{ name: 'Campinas', latitude: -22.9, longitude: -47.06, admin1: 'São Paulo' }] }
    }));
    await page.route('https://servicodados.ibge.gov.br/**', route => route.fulfill({
        json: [{ nome: 'Campinas' }, { nome: 'São Paulo' }, { nome: 'Santos' }]
    }));
}

/** Perfil salvo + clique nele na tela inicial → espera o jogo inicializar (fica no tutorial). */
// Guias progressivos (TutorialSystem.GUIDES) já feitos: senão eles abrem sozinhos quando o teste constrói
// água + energia e congelam o jogo. O teste dos guias passa guides: [].
const ALL_GUIDES = ['energy', 'roads', 'rivers', 'tour', 'howto', 'paulo', 'storage', 'zoning', 'public', 'tourism', 'industrial', 'commercial'];

/**
 * Escolhe a bacia no carrossel do modo loja (js/ui/BasinPicker.js): o ponto traz o cartão para o meio e o
 * "Jogar aqui" dele (`.basin-pick[data-pick]`) começa a cidade (o dos cartões do lado só traz o cartão).
 */
async function pickBasin(page, basin) {
    await page.locator(`.bp-dot[data-basin="${basin}"]`).click();
    await page.locator(`.bp-card.is-focus .basin-pick[data-pick="${basin}"]`).click();
}

/**
 * `basin` = no modo loja (?modo=loja) o jogo novo pergunta a bacia (main.js chooseBasin): escolhe no carrossel.
 */
async function startGame(page, { profile = TEST_PROFILE, forecast, url = '/index.html', guides = ALL_GUIDES, basin = null } = {}) {
    await mockExternalApis(page, { forecast });
    await page.addInitScript(({ p, guides, keys }) => {
        if (!localStorage.getItem(keys.profiles)) {
            localStorage.setItem(keys.profiles, JSON.stringify({ profiles: [p], activeId: p.id }));
            localStorage.setItem(keys.guides, JSON.stringify({ [p.id]: guides }));
        }
    }, { p: profile, guides, keys: { profiles: storageKey('profiles'), guides: storageKey('guides') } });
    await page.goto(url);
    await page.click(`.profile-card[data-profile-id="${profile.id}"]`);
    if (basin) await pickBasin(page, basin);
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });
}

/**
 * Fecha os cartões que pausam o jogo (comemoração da missão, "que bom ter você de volta", zona que evoluiu:
 * ui/MissionCardUI.js). Espera até `wait` ms o primeiro aparecer; testes que não são sobre eles usam isto.
 */
async function closeCards(page, wait = 5000) {
    await page.waitForSelector('#mission-card', { timeout: wait }).catch(() => {});
    for (let i = 0; i < 5; i++) {
        const open = await page.evaluate(() => {
            const ui = window.gameManager?.uiManager;
            if (!document.getElementById('mission-card')) return false;
            ui.closeMissionCard();
            return true;
        });
        if (!open) break;
        await page.waitForTimeout(300); // o próximo da fila abre no flush seguinte (200 ms)
    }
}

module.exports = { TEST_PROFILE, FORECAST, CLEAR_SKY, STORAGE_PREFIX, storageKey, mockExternalApis, startGame, pickBasin, closeCards };
