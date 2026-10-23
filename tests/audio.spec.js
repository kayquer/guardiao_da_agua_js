const { test, expect } = require('@playwright/test');
const { CLEAR_SKY, mockExternalApis, startGame } = require('./helpers');

// Som: música por contexto (menu → dia/noite/chuva/alerta → game over), ambientes pelo clima, pausa e
// controles de volume na tela de pausa. Ver js/utils/audio/SoundDirector.js e js/data/audioManifest.js.
function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('response', r => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
    page.on('requestfailed', r => {
        const err = r.failure()?.errorText;
        if (err !== 'net::ERR_ABORTED') problems.push(`requestfailed: ${r.url()} (${err})`);
    });
    return problems;
}

// Roda `src` na página com am = AudioManager (classe global, não é propriedade de window) e gm = gameManager
const audio = (page, src, arg) => page.evaluate(([body, a]) =>
    new Function('gm', 'a', `const am = AudioManager.getInstance();\n${body}`)(window.gameManager, a), [src, arg]);
const musicKey = page => audio(page, 'return am.currentMusicKey;');

test('música e ambiente seguem o contexto do jogo; pausa e volumes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica; o painel de pausa é testado no desktop');
    const problems = watchErrors(page);

    // Menu: tema do menu (sem a abertura nos testes)
    await mockExternalApis(page, { forecast: CLEAR_SKY });
    await page.goto('/index.html');
    await expect.poll(() => musicKey(page), { timeout: 15000 }).toBe('bgm_menu');

    await startGame(page, { forecast: CLEAR_SKY });
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    // Contexto controlado: meio-dia, sem chuva, troca sem esperar o tempo mínimo
    await audio(page, `
        am.director.minDwellMs = 0;
        am.director.alertClearMs = 0;
        gm.gameClockTime.setHours(12, 0, 0, 0);
        if (gm.weatherEffects) gm.weatherEffects.profile = WeatherEffects.profileFor(null);
    `);
    await expect.poll(() => musicKey(page), { timeout: 8000 }).toBe('bgm_gameplay_day');
    await expect.poll(() => audio(page, 'return am.getAmbientKeys();')).toEqual(['amb_city_day', 'amb_river']);

    // Noite pelo relógio do jogo
    await audio(page, 'gm.gameClockTime.setHours(22, 0, 0, 0);');
    await expect.poll(() => musicKey(page), { timeout: 8000 }).toBe('bgm_gameplay_night');
    await expect.poll(() => audio(page, 'return am.getAmbientKeys();')).toContain('amb_city_night');

    // Chuva pelo clima real (perfil do WeatherEffects) — ganha da noite; ambiente de chuva entra
    await audio(page, `
        gm.weatherEffects ||= new WeatherEffects(gm);
        gm.weatherEffects.profile = WeatherEffects.profileFor({ code: 63, isDay: false, temperature: 20, wind: 10 });
    `);
    await expect.poll(() => musicKey(page), { timeout: 8000 }).toBe('bgm_gameplay_rain');
    await expect.poll(() => audio(page, 'return am.getAmbientKeys();')).toContain('amb_rain_light');

    // Caixa d'água quase vazia (10 %; zero seria game over): alerta tem prioridade máxima e entra na hora
    await audio(page, `
        const w = gm.resourceManager.resources.water;
        w.current = w.max * 0.1;
    `);
    await expect.poll(() => musicKey(page), { timeout: 8000 }).toBe('bgm_gameplay_alert');
    // Água de volta: sai do alerta
    await audio(page, `
        const w = gm.resourceManager.resources.water;
        w.current = w.max;
    `);
    await expect.poll(() => musicKey(page), { timeout: 8000 }).toBe('bgm_gameplay_rain');

    // Pausa: ambientes calam, música abaixa; painel "Som" com os três volumes e o mudo
    await page.evaluate(() => {
        document.querySelectorAll('.central-alert-overlay').forEach(el => el.remove()); // o aviso de água baixa
        window.gameManager.pauseGame();
    });
    await expect(page.locator('#pause-overlay')).toBeVisible();
    const vols = await audio(page, `
        const amb = [...am.ambientTracks.values()].map(t => am.trackVolume(t));
        return { amb, music: am.trackVolume(am.musicTrack) };
    `);
    expect(vols.amb.every(v => v === 0)).toBe(true);
    const sound = page.locator('#pp-sound');
    await expect(sound).toBeVisible();
    await expect(sound.locator('input[type=range]')).toHaveCount(3);
    await sound.locator('#pp-music-volume').fill('20');
    await sound.locator('#pp-mute').click();
    await expect(sound.locator('#pp-mute')).toHaveAttribute('aria-pressed', 'true');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('guardiao_agua_audio')));
    expect(saved.musicVolume).toBeCloseTo(0.2);
    expect(saved.muted).toBe(true);
    await sound.locator('#pp-mute').click();
    await page.evaluate(() => window.gameManager.resumeGame());

    // Os efeitos curtos foram baixados e decodificados (o clique criou o AudioContext)
    await expect.poll(() => audio(page, 'return am.buffers.size;'), { timeout: 20000 }).toBeGreaterThan(50);
    expect(await audio(page, 'return am.playSound("sfx_build_error");')).toBe(true);

    // Game over: a música para
    await page.evaluate(() => window.gameManager.gameOverSystem.triggerGameOver('water_depleted'));
    await expect.poll(() => musicKey(page)).toBe(null);
    await expect.poll(() => audio(page, 'return am.getAmbientKeys();')).toEqual([]);

    expect(problems).toEqual([]);
});

test('abertura: música da intro junto com as tomadas e "Pular" passa para o tema do menu', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    const problems = watchErrors(page);
    await mockExternalApis(page);
    await page.goto('/index.html?intro');
    await page.waitForFunction(() => document.body.classList.contains('intro-playing'), null, { timeout: 60000 });
    expect(await musicKey(page)).toBe('bgm_intro');
    await page.click('#btn-skip-intro', { force: true });
    await expect.poll(() => musicKey(page)).toBe('bgm_menu');
    expect(problems).toEqual([]);
});
