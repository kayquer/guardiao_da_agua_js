const { test, expect } = require('@playwright/test');
const { TEST_PROFILE, mockExternalApis } = require('./helpers');

// Abertura cinematográfica do menu (js/systems/intro/). Nos outros testes ela não roda (navigator.webdriver);
// aqui ?intro força a abertura de verdade: cidade 3D com os .glb, tomadas, pular, menu e descarte da cena.
function watchProblems(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('requestfailed', r => {
        const err = r.failure()?.errorText;
        if (err !== 'net::ERR_ABORTED') problems.push(`requestfailed: ${r.url()} (${err})`);
    });
    page.on('response', r => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
    return problems;
}

const playing = page => page.waitForFunction(() => document.body.classList.contains('intro-playing'), null, { timeout: 60000 });

test('abertura toca, "Pular" leva ao menu com logo, boas-vindas, Começar e destaques', async ({ page }) => {
    const problems = watchProblems(page);
    await mockExternalApis(page);
    await page.goto('/index.html?intro');
    await playing(page);

    // Cidade montada com os modelos reais e a câmera nas tomadas
    const scene = await page.evaluate(() => {
        const c = MenuIntro.cinematic;
        return {
            canvas: !!document.getElementById('intro-canvas'),
            buildings: c.scene.meshes.filter(m => m.name.startsWith('buildingModelTemplate_') || m.name.startsWith('intro_')).length,
            rotors: c.rotors.length,
            shots: c.director.shots.length,
            letterbox: document.body.classList.contains('intro-letterbox')
        };
    });
    expect(scene.canvas).toBe(true);
    expect(scene.buildings).toBeGreaterThan(40);
    expect(scene.rotors).toBeGreaterThan(0);
    expect(scene.shots).toBe(4);
    expect(scene.letterbox).toBe(true);
    await expect(page.locator('#intro-overlay')).toBeVisible();

    // force: o pointerdown já pula e esconde o overlay no meio do clique (o Playwright reclamaria do alvo)
    await page.click('#btn-skip-intro', { force: true });
    await page.waitForFunction(() => document.body.classList.contains('menu-ready'));
    await expect(page.locator('#intro-overlay')).toBeHidden();
    await expect(page.locator('#main-menu-logo svg')).toBeVisible();
    await expect(page.locator('#welcome-title')).toContainText('Bem-vindo(a)');
    await expect(page.locator('#btn-start')).toBeVisible();
    await expect(page.locator('#btn-start')).toContainText('Começar');
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await expect(page.locator('#btn-about')).toBeVisible();
    await expect(page.locator('#menu-billboard .billboard-slide')).not.toHaveCount(0);
    // A cidade continua viva atrás do menu (câmera balançando, render loop rodando)
    const t0 = await page.evaluate(() => MenuIntro.cinematic.time);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => MenuIntro.cinematic.time)).toBeGreaterThan(t0);

    // Sem perfil, "Começar" abre o cadastro
    await page.click('#btn-start');
    await expect(page.locator('#profile-screen')).toBeVisible();

    // Toda vez que o menu abre, a abertura toca inteira (sem versão curta na mesma sessão)
    await page.reload();
    await playing(page);
    const shots = await page.evaluate(() => [MenuIntro.cinematic.director.shots.length, INTRO_SHOTS.shots.length]);
    expect(shots[0]).toBe(shots[1]);

    expect(problems).toEqual([]);
});

test('movimento reduzido: sem voo, menu direto na pose final', async ({ page }) => {
    const problems = watchProblems(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockExternalApis(page);
    await page.goto('/index.html?intro');
    await page.waitForFunction(() => document.body.classList.contains('menu-ready') && MenuIntro.cinematic, null, { timeout: 60000 });
    const state = await page.evaluate(() => ({
        shots: MenuIntro.cinematic.director.shots.length,
        orbit: MenuIntro.cinematic.orbitEnabled,
        playing: document.body.classList.contains('intro-playing')
    }));
    expect(state).toEqual({ shots: 0, orbit: false, playing: false });
    expect(problems).toEqual([]);
});

test('iniciar o jogo descarta a cena da abertura e o jogo roda normal', async ({ page }) => {
    const problems = watchProblems(page);
    await mockExternalApis(page);
    await page.addInitScript(p => {
        if (!localStorage.getItem('guardiao_agua_profiles')) {
            localStorage.setItem('guardiao_agua_profiles', JSON.stringify({ profiles: [p], activeId: p.id }));
            localStorage.setItem('guardiao_agua_guides', JSON.stringify({ [p.id]: ['storage', 'zoning', 'public', 'tourism', 'industrial', 'commercial'] }));
        }
    }, TEST_PROFILE);
    await page.goto('/index.html?intro');
    await playing(page);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.body.classList.contains('menu-ready'));
    // Com perfil, o card dá boas-vindas pelo nome e "Começar" joga com ele
    await expect(page.locator('#welcome-title')).toContainText(TEST_PROFILE.name);

    const engineCount = await page.evaluate(() => BABYLON.EngineStore.Instances.length);
    await page.click('#btn-start');
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });

    const after = await page.evaluate(() => ({
        canvas: !!document.getElementById('intro-canvas'),
        cinematic: MenuIntro.cinematic,
        state: MenuIntro.state,
        introEngines: BABYLON.EngineStore.Instances.filter(e => e.getRenderingCanvas()?.id === 'intro-canvas').length,
        hasIntroClass: document.body.classList.contains('has-intro'),
        gameMeshes: window.gameManager.scene.meshes.length,
        engines: BABYLON.EngineStore.Instances.length
    }));
    expect(after.canvas).toBe(false);
    expect(after.cinematic).toBeNull();
    expect(after.state).toBe('disposed');
    expect(after.introEngines).toBe(0);
    expect(after.hasIntroClass).toBe(false);
    expect(after.gameMeshes).toBeGreaterThan(0);
    // A engine da abertura saiu; a do jogo entrou (e a do retrato do tutorial, se já abriu)
    expect(after.engines).toBeLessThanOrEqual(engineCount + 1);
    await expect(page.locator('#game-canvas')).toBeVisible();
    expect(problems).toEqual([]);
});
