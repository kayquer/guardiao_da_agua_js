const { test, expect } = require('@playwright/test');
const { startGame, TEST_PROFILE, closeCards } = require('./helpers');

// A derrota não apaga mais a cidade (auditoria 11/2026): pontos de volta (alguns minutos antes, ponto seguro),
// recuperação pelo menu e o painel "Jogos salvos" com 3 espaços manuais. Desktop (mesma lógica no mobile).

function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('dialog', d => {
        if (d.type() !== 'beforeunload') problems.push(`diálogo nativo: ${d.message()}`);
        d.type() === 'beforeunload' ? d.accept() : d.dismiss();
    });
    return problems;
}

/** Autosaves com o relógio andando: cada um vira uma foto (getRewindSnapshot) e a cidade bem vira ponto seguro. */
async function playWithAutosaves(page, minutes = 5) {
    await page.evaluate(n => {
        const gm = window.gameManager;
        const r = gm.resourceManager.resources;
        r.water.current = r.water.max * 0.8;
        r.pollution.current = 10;
        r.population.satisfaction = 70;
        for (let i = 0; i <= n * 2; i++) {
            gm.gameTime = 60000 + i * 30000;
            gm.autoSave();
        }
    }, minutes);
}

test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
});

test('fim de jogo: o save fica marcado e "Voltar 3 minutos" devolve a cidade de antes', async ({ page }) => {
    test.setTimeout(120000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await playWithAutosaves(page, 5); // relógio em 6 min de jogo

    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.resourceManager.resources.water.current = 0;
        gm.gameOverSystem.triggerGameOver('water_depleted');
    });
    await expect(page.locator('#gameover-container')).toBeVisible();
    const info = await page.evaluate(id => new SaveSystem().getSaveInfo(id), TEST_PROFILE.id);
    expect(info.ok && info.lost).toBe(true); // não foi apagado

    const rewind = page.locator('#gameover-recovery .recovery-btn[data-slot="rewind"]');
    await expect(rewind).toContainText('Voltar 3 minutos');
    await expect(page.locator('#gameover-recovery .recovery-btn[data-slot="safe"]')).toBeVisible();
    await rewind.click();

    await expect(page.locator('#gameover-container')).toBeHidden();
    const after = await page.evaluate(id => ({
        state: window.gameManager.gameState,
        time: window.gameManager.gameTime,
        water: window.gameManager.resourceManager.resources.water.current,
        over: window.gameManager.gameOverSystem.isGameOver,
        lost: new SaveSystem().getSaveInfo(id).lost
    }), TEST_PROFILE.id);
    expect(after.state).toBe('playing');
    expect(after.over).toBe(false);
    expect(after.water).toBeGreaterThan(0);
    // a foto mais nova com 3 min de jogo antes do fim (6 min); depois de carregar o relógio já andou um pouco
    expect(after.time).toBeGreaterThanOrEqual(180000);
    expect(after.time).toBeLessThan(185000);
    expect(after.lost).toBe(false); // voltar regravou o jogo atual
    expect(problems).toEqual([]);
});

test('menu: cidade que terminou oferece voltar a um ponto anterior em vez de apagar', async ({ page }) => {
    test.setTimeout(150000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await playWithAutosaves(page, 4);
    // fim de jogo de verdade: marca o save e para de salvar (o beforeunload não grava por cima)
    await page.evaluate(() => {
        window.gameManager.resourceManager.resources.water.current = 0;
        window.gameManager.gameOverSystem.triggerGameOver('water_depleted');
    });

    await page.goto('/index.html');
    await page.click(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    const dialog = page.locator('.swal2-popup.game-swal');
    await expect(dialog).toContainText('não acabou');
    await expect(dialog.locator('.save-pick[data-pick="main"]')).toHaveCount(0); // o que terminou não é opção
    await expect(dialog.locator('.save-pick[data-pick="new"]')).toBeVisible();
    await dialog.locator('.save-pick[data-pick="safe"]').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'playing', null, { timeout: 45000 });
    await closeCards(page);
    expect(await page.evaluate(() => window.gameManager.resourceManager.resources.water.current)).toBeGreaterThan(0);
    expect(problems).toEqual([]);
});

test('Jogos salvos na pausa: salvar no espaço 1, carregar e apagar', async ({ page }) => {
    test.setTimeout(120000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await page.evaluate(() => { window.gameManager.gameTime = 90000; window.gameManager.pauseGame(); });

    await page.click('#btn-saves');
    const panel = page.locator('#saves-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.save-row[data-slot^="slot_"]')).toHaveCount(3); // os 3 espaços manuais, vazios
    await panel.locator('.save-act[data-act="save"][data-slot="slot_1"]').click();
    await expect(panel.locator('.save-row[data-slot="slot_1"]')).not.toHaveClass(/save-row--empty/);

    // o jogo anda e depois volta ao espaço 1
    await page.evaluate(() => { window.gameManager.gameTime = 400000; });
    await panel.locator('.save-act[data-act="load"][data-slot="slot_1"]').click();
    await page.locator('.swal2-popup.game-swal .swal2-confirm').click();
    await expect.poll(() => page.evaluate(() => window.gameManager.gameState)).toBe('playing');
    const time = await page.evaluate(() => window.gameManager.gameTime);
    expect(time).toBeGreaterThanOrEqual(90000);
    expect(time).toBeLessThan(95000); // voltou ao espaço 1 (o relógio estava em 400000)

    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-saves');
    await panel.locator('.save-act[data-act="delete"][data-slot="slot_1"]').click();
    await page.locator('.swal2-popup.game-swal .swal2-confirm').click();
    await expect(panel.locator('.save-row[data-slot="slot_1"]')).toHaveClass(/save-row--empty/);
    await expect(page.locator('.swal2-container')).toHaveCount(0); // o Esc é do diálogo enquanto ele fecha
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    expect(problems).toEqual([]);
});
