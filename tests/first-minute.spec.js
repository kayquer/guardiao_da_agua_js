const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Primeiro minuto limpo (auditoria de game design, 11/2026): no tutorial de abertura o HUD não mostra alarme,
// a barra de missão só aparece depois da prefeitura e o "Nova missão" não vira toast; uma mensagem por vez
// também para o cartão de eventos e a dica dos recursos.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    return errors;
}

test('tutorial de abertura: sem alarme no HUD, sem barra de missão até a prefeitura, sem toast de missão', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    await expect(page.locator('#tutorial-container')).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/tutorial-calm/);
    await expect(page.locator('body')).toHaveClass(/tutorial-no-mission/);

    // população no vermelho no começo: o HUD continua neutro
    await page.evaluate(() => { window.gameManager.resourceManager.resources.population.satisfaction = 5; });
    await page.waitForTimeout(400);
    expect(await page.locator('.resource-item.res-tier-critical, .resource-item.res-tier-low').count()).toBe(0);
    await expect(page.locator('.hud-bottom')).toBeHidden();
    expect(await page.locator('#toast-stack .toast', { hasText: 'Nova missão' }).count()).toBe(0);

    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await expect(page.locator('body')).not.toHaveClass(/tutorial-calm/);
    await expect(page.locator('body')).not.toHaveClass(/tutorial-no-mission/);
    await expect(page.locator('.hud-bottom')).toBeVisible();
    expect(errors).toEqual([]);
});

test('alerta central aberto esconde o cartão de eventos e a dica dos recursos', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await page.evaluate(() => window.gameManager.uiManager.showCentralAlert('Teste', 'Um aviso', 'warning'));
    await expect(page.locator('.central-alert-overlay')).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/message-open/);
    await page.evaluate(() => window.gameManager.uiManager.showResourceTooltip({ target: document.querySelector('.resource-item') }, 'Água', 'water'));
    await expect(page.locator('#resource-tooltip')).toBeHidden();
    expect(errors).toEqual([]);
});
