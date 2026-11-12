const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Caderno de Campo da Márcia (auditoria 11/2026): o sapo some com a poluição (aviso do Paulo), volta quando o rio
// limpa (toast da Márcia com "Ver onde"/"Caderno"), o caderno mostra a página dele e clicar no bicho no mapa mostra a nota.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    return errors;
}

test('o sapo some e volta: aviso do Paulo, momento da Márcia e página no caderno', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica no mobile');
    const errors = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    // a primeira olhada registra em silêncio o que já está no rio
    const cell = await page.evaluate(() => {
        const gm = window.gameManager;
        gm.propSystem.update = () => {}; // o teste manda o que o planejador "viu" (sem o replanejamento real no meio)
        gm.fieldNotebook.loadData(null);
        const s = gm.gridManager.startArea;
        const sapo = { id: 'sapo', x: s.x + 2, z: s.z + 2 };
        gm.uiManager.onPropsPlanned([sapo]);
        gm.gameTime += 1000;
        gm.uiManager.onPropsPlanned([]); // a poluição tirou o sapo
        return sapo;
    });
    await expect(page.locator('#toast-stack .toast', { hasText: 'Sapo sumiu' })).toBeVisible();

    await page.evaluate(c => {
        const gm = window.gameManager;
        gm.gameTime += FieldNotebook.MOMENT_COOLDOWN_MS;
        gm.uiManager.onPropsPlanned([c]); // o rio limpou
    }, cell);
    const toast = page.locator('#toast-stack .toast--notebook', { hasText: 'Sapo voltou' });
    await expect(toast).toBeVisible();
    await toast.getByRole('button', { name: /Caderno/ }).click();
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('paused');
    const panel = page.locator('#notebook-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.nb-entry[data-species="sapo"]')).toHaveClass(/nb-here/);
    await expect(panel.locator('.nb-entry[data-species="sapo"]')).toHaveClass(/nb-focus/);
    await expect(panel.locator('.nb-entry.nb-unknown').first()).toContainText('???');
    await expect(page.locator('#notebook-count')).toContainText('1 de');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();

    // vai no save
    const saved = await page.evaluate(() => window.gameManager.getSaveData().notebook.seen.sapo.returns);
    expect(saved).toBe(1);

    // clicar no bicho no mapa mostra a nota da Márcia (em vez do painel do terreno)
    await page.evaluate(c => {
        const gm = window.gameManager;
        gm.resumeGame();
        gm.propSystem.placements = [c];
        gm.uiManager.showSpeciesAt(c.x, c.z + 1);
    }, cell);
    await expect(page.locator('#toast-stack .toast--notebook', { hasText: 'pele do sapo' })).toBeVisible();
    expect(errors).toEqual([]);
});
