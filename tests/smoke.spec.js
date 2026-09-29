const { test, expect } = require('@playwright/test');

// Smoke de regressão: boot → novo jogo → construir → salvar/carregar → UI.
// Qualquer erro de JS, console.error ou asset 4xx/falho reprova o teste.
test('jogo roda de ponta a ponta sem erros', async ({ page }) => {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    // ERR_ABORTED = Chromium cancelando range request de mídia, não arquivo faltando (404 cai no 'response')
    page.on('requestfailed', r => {
        const err = r.failure()?.errorText;
        if (err !== 'net::ERR_ABORTED') problems.push(`requestfailed: ${r.url()} (${err})`);
    });
    const requested = new Set();
    page.on('request', r => requested.add(new URL(r.url()).pathname));
    page.on('response', r => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });

    await page.goto('/index.html');
    await page.click('#btn-new-game');
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect(page.locator('#game-hud')).toBeVisible();

    // Construir num lugar livre e conferir que o orçamento caiu
    const built = await page.evaluate(() => {
        const gm = window.gameManager;
        const budget = () => gm.resourceManager.resources.budget.current;
        const before = budget();
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (gm.buildingSystem.canPlaceBuilding(x, z, 'water_well').canPlace) {
                const b = gm.buildingSystem.placeBuilding(x, z, 'water_well');
                return { ok: !!b, before, after: budget(), count: gm.buildingSystem.buildings.size };
            }
        }
        return { ok: false };
    });
    expect(built.ok).toBe(true);
    expect(built.after).toBeLessThan(built.before);

    // Salvar e recarregar o mesmo estado
    const reloaded = await page.evaluate(() => {
        const gm = window.gameManager;
        gm.saveGame();
        const data = gm.saveSystem.loadGame();
        gm.loadGame(data);
        return gm.buildingSystem.buildings.size;
    });
    expect(reloaded).toBe(built.count);

    // Painéis principais abrem
    await page.evaluate(() => {
        document.getElementById('btn-help').click();
        document.querySelector('.modal .close-btn, #help-modal .close-btn')?.click();
        document.querySelector('.category-btn')?.click();
    });

    // Estudo educacional (imagens do building-studies.json)
    await page.evaluate(() => window.gameManager.studySystem.startStudy('water_pump'));

    // Deixar o loop rodar (tutorial 3D, CityLife, eventos, sons carregados tarde)
    await page.waitForTimeout(10000);

    // Game over (modelo 3D + diálogo próprios)
    await page.evaluate(() => window.gameManager.gameOverSystem.triggerGameOver('water_depleted'));
    await expect(page.locator('#gameover-container')).toBeVisible();
    await page.waitForTimeout(3000);
    expect(problems).toEqual([]);
    if (process.env.REQ_LOG) require('fs').appendFileSync(process.env.REQ_LOG, [...requested].join('\n') + '\n');
});
