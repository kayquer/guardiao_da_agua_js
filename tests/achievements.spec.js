const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Conquistas por níveis (toast com "Ver conquistas" → vitrine), lembrete da missão parada e guia de socorro
// quando um recurso cai sem parar. Desktop (a vitrine e a barra de missão são as do computador).
test.describe('conquistas, lembretes e socorro', () => {

    let problems;
    test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === 'mobile', 'só no computador');
        problems = [];
        page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
        page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
        await startGame(page);
        await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    });
    test.afterEach(() => { if (problems) expect(problems).toEqual([]); });

    test('nível novo mostra o selo e o botão abre a vitrine com as trilhas', async ({ page }) => {
        await page.evaluate(() => {
            const qs = window.gameManager.questSystem;
            qs.tracksPrimed = true;
            window.gameManager.resourceManager.resources.budget.current = 120000;
            qs.lastTrackCheckAt = 0;
            qs.updateAchievementTracks();
        });
        const toast = page.locator('.toast--achievement');
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('Cofre Cheio');
        await expect(toast).toContainText('Nível 1 de 5');
        await expect(toast.locator('.toast-icon img')).toHaveAttribute('src', /ach-budget\.svg/);

        await toast.locator('.toast-action').click();
        await expect(page.locator('#achievements-panel')).toBeVisible();
        expect(await page.evaluate(() => window.gameManager.gameState)).toBe('paused');
        await expect(page.locator('.ach-track')).toHaveCount(13);
        await expect(page.locator('.ach-track.lvl-1')).toContainText('Cofre Cheio');
        await expect(page.locator('.ach-track.lvl-1')).toContainText('Caixa Forte'); // próximo nível
        await expect(page.locator('.ach-badge')).toHaveCount(4); // as conquistas antigas continuam
    });

    test('missão parada lembra o que falta e o atalho abre o prédio', async ({ page }) => {
        await page.evaluate(() => {
            const qs = window.gameManager.questSystem;
            qs.updateMissionReminders();
            qs.missionWatch.since -= qs.MISSION_REMIND_MS + 1000;
            qs.updateMissionReminders();
        });
        const toast = page.locator('.toast--mission').filter({ hasText: 'Lembrete da missão' });
        await expect(toast).toBeVisible();
        await expect(page.locator('#mission-peek-btn')).toHaveClass(/mission-peek-btn--remind/);
        await toast.getByRole('button', { name: /Construir/ }).click();
        await expect(page.locator('#build-modal')).toBeVisible();
        await expect(page.locator('.building-item[data-building-type="water_pump"]')).toBeVisible();
    });

    test('água caindo sem parar abre o socorro da Cláudia com o que construir', async ({ page }) => {
        await page.evaluate(() => {
            const gm = window.gameManager, ts = gm.tutorialSystem;
            const r = gm.resourceManager.resources;
            ts.declineWatch = new DeclineWatch();
            const now = gm.buildingSystem.simNow();
            // um minuto de jogo com a caixa esvaziando (amostras do passado)
            for (let i = 12; i >= 1; i--) {
                ts.declineWatch.sample({ ...r, water: { current: 1000 - (12 - i) * 40, storage: 1000 } }, now - i * 5000);
            }
            r.water.current = 500;
            ts.checkRescue();
        });
        const card = page.locator('#tutorial-container');
        await expect(card).toBeVisible();
        await expect(card).toContainText('A água não para de cair');
        await page.locator('#tutorial-next-btn').click();
        const link = card.locator('.rescue-link[data-build="water_pump"]');
        await expect(link).toBeVisible();
        await link.click();
        expect(await page.evaluate(() => window.gameManager.tutorialSystem.isActive)).toBe(false);
        await expect(page.locator('#build-modal')).toBeVisible();
    });
});
