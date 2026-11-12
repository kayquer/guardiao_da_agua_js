const { test, expect } = require('@playwright/test');
const { startGame, mockExternalApis, storageKey } = require('./helpers');

// Modo loja (js/config/GameMode.js, ?modo=loja): estudo opcional, sem "Dados da pesquisa", cadastro só com apelido,
// clima simulado e o aviso inicial só na primeira vez. O modo pesquisa (padrão desta versão) continua igual.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    return errors;
}

test('loja: bomba liberada sem estudo, sem dados da pesquisa, clima simulado', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica no mobile');
    const errors = watchErrors(page);
    await startGame(page, { url: '/index.html?modo=loja' });
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    const state = await page.evaluate(() => {
        const gm = window.gameManager;
        const pump = gm.buildingSystem.buildingTypes.get('water_pump');
        return {
            mode: GameMode.id(),
            unlocked: gm.studySystem.isStudyUnlocked('water_pump'),
            card: gm.uiManager.getBuildingItemState(pump),
            research: !!document.getElementById('btn-research'),
            climate: SimulatedWeather.mode(),
            log: ResearchLog.record('build', { target: 'teste' })
        };
    });
    expect(state).toEqual({ mode: 'loja', unlocked: true, card: 'ok', research: false, climate: 'simulated', log: null });

    // o menu de construção oferece o estudo como leitura, com o bônus
    await page.evaluate(() => window.gameManager.uiManager.showBuildInfo('water_pump'));
    await expect(page.locator('.build-info-link[data-action="study"]')).toContainText('+5% de eficiência');
    expect(errors).toEqual([]);
});

test('pesquisa (padrão): a bomba continua pedindo o estudo e o painel da pesquisa existe', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    const state = await page.evaluate(() => ({
        mode: GameMode.id(),
        unlocked: window.gameManager.studySystem.isStudyUnlocked('water_pump'),
        research: !!document.getElementById('btn-research')
    }));
    expect(state).toEqual({ mode: 'pesquisa', unlocked: false, research: true });
    expect(errors).toEqual([]);
});

test('loja: cadastro só com o apelido começa o jogo; "Fora do Brasil" existe', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica no mobile');
    const errors = watchErrors(page);
    await mockExternalApis(page);
    await page.goto('/index.html?modo=loja');
    await page.click('#btn-new-game');
    await expect(page.locator('#profile-screen')).toBeVisible();
    await expect(page.locator('#profile-uf option[value="XX"]')).toHaveCount(1);
    await expect(page.locator('#profile-age')).not.toHaveAttribute('required', '');
    await expect(page.locator('.profile-optional')).toHaveCount(3);
    await page.fill('#profile-name', 'Lu');
    await page.click('#btn-profile-start');
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });
    const profile = await page.evaluate(() => PlayerProfile.getActive());
    expect(profile).toMatchObject({ name: 'Lu', age: null, uf: null, city: '' });
    expect(errors).toEqual([]);
});

test('loja: o aviso inicial aparece só até ser aceito uma vez', async ({ page }) => {
    const errors = watchErrors(page);
    await mockExternalApis(page);
    await page.goto('/index.html?aviso&modo=loja');
    await expect(page.locator('#start-notice')).toBeVisible();
    await page.click('#btn-notice-accept');
    await expect(page.locator('#start-notice')).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey('notice_seen'))).toBe('yes');
    await page.goto('/index.html?aviso&modo=loja');
    await expect(page.locator('#main-menu')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('#start-notice')).toHaveCount(0);
    // no modo pesquisa ele volta sempre
    await page.goto('/index.html?aviso');
    await expect(page.locator('#start-notice')).toBeVisible();
    expect(errors).toEqual([]);
});
