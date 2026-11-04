// Todas as mensagens passam por um único espaço, uma por vez (UIManager.isMessageSlotBusy).
const { test, expect } = require('@playwright/test');
const { startGame, closeCards } = require('./helpers');

test.skip(({ isMobile }) => isMobile, 'fila testada no computador');

async function play(page) {
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await closeCards(page, 1000);
}

test('dois alertas adiados aparecem um depois do outro, sem se apagar', async ({ page }) => {
    await play(page);
    await page.evaluate(() => {
        const ui = window.gameManager.uiManager;
        ui.openLessonBook(1);
        ui.showCentralAlert('Alerta A', 'primeiro');
        ui.showCentralAlert('Alerta B', 'segundo');
    });
    await page.click('#lesson-book .book-close');

    const title = page.locator('.central-alert-title');
    await expect(title).toHaveText('Alerta A');
    await page.click('.central-alert-btn');
    await expect(title).toHaveText('Alerta B');
    await page.click('.central-alert-btn');
    await expect(title).toHaveCount(0);
});

test('o cartão de missão abre depois de uma decisão do Paulo', async ({ page }) => {
    await play(page);
    await page.evaluate(() => {
        const ui = window.gameManager.uiManager;
        ui.getEventDecisionModal(); // o elemento fica no DOM depois de fechar
        ui.closeEventDecision({ silent: true });
        window.gameManager.questSystem.completeQuest('tutorial_01');
    });
    await expect(page.locator('#mission-card')).toBeVisible({ timeout: 3000 });
});
