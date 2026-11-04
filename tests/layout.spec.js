// A tela inteira precisa caber em 100% de zoom nos tamanhos comuns de notebook: o orientador da pesquisa teve de
// reduzir o navegador para 90%. O Playwright rola até o elemento antes de clicar, então os outros testes não notam.
const { test, expect } = require('@playwright/test');
const { startGame, mockExternalApis, closeCards } = require('./helpers');

test.skip(({ isMobile }) => isMobile, 'tamanhos de computador');

const inView = (page, selector) => page.evaluate(sel => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    return !!r && r.width > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
}, selector);

const fits = (page, selector) => page.evaluate(sel => {
    const el = document.querySelector(sel);
    return el.scrollHeight <= el.clientHeight + 1;
}, selector);

for (const [width, height] of [[1366, 650], [1536, 730], [1920, 940]]) {
    test.describe(`${width}×${height}`, () => {
        test.use({ viewport: { width, height } });

        test('aviso e menu cabem sem rolar', async ({ page }) => {
            await mockExternalApis(page);
            await page.goto('/index.html?aviso');
            expect(await inView(page, '#btn-notice-accept')).toBe(true);
            await page.goto('/index.html');
            await expect(page.locator('#main-menu .menu-layout')).toBeVisible();
            expect(await fits(page, '#main-menu .menu-layout')).toBe(true);
        });

        test('trilho, painel à esquerda e mensagens cabem, com o mapa à vista', async ({ page }) => {
            await startGame(page);

            // Tutorial: um painel à esquerda, depois do trilho, sem cobrir mais de 1/3 da largura
            const card = await page.locator('#tutorial-container .tut-card').boundingBox();
            const rail = await page.locator('.hud-left').boundingBox();
            expect(card.x).toBeGreaterThanOrEqual(rail.x + rail.width);
            expect(card.width).toBeLessThanOrEqual(width / 3 + 2);
            expect(card.y + card.height).toBeLessThanOrEqual(height);
            expect(await inView(page, '#tutorial-next-btn')).toBe(true);

            // Toda página do tutorial mantém os botões à vista (texto longo rola dentro do painel)
            await page.evaluate(() => {
                const ts = window.gameManager.tutorialSystem;
                ts.goTo(ts.steps.reduce((best, s, i, all) => (s.text.length > all[best].text.length ? i : best), 0));
            });
            await page.waitForTimeout(500); // a página termina de virar
            expect(await inView(page, '#tutorial-next-btn')).toBe(true);

            await page.evaluate(() => window.gameManager.tutorialSystem.complete());
            await closeCards(page, 500);

            // Todas as categorias à vista, sem rolagem
            expect(await fits(page, '#building-panel')).toBe(true);
            for (const button of await page.locator('.hud-left button:visible').all()) {
                const box = await button.boundingBox();
                expect(box.y + box.height).toBeLessThanOrEqual(height);
            }

            // Alerta e decisão do Paulo no mesmo lugar; o resto do mapa continua sem véu
            await page.evaluate(() => window.gameManager.uiManager.showCentralAlert('Teste', 'mensagem'));
            await page.waitForTimeout(500); // termina a animação de entrada
            const alert = await page.locator('.central-alert-card').boundingBox();
            expect(alert.x).toBeLessThan(card.x + 20);
            expect(alert.x + alert.width).toBeLessThanOrEqual(width / 2);
            expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [width - 200, height / 2])).toBe('game-canvas');
            await page.click('.central-alert-btn');

            await page.evaluate(() => window.gameManager.eventSystem.announceEvent('pipe_leak'));
            const decision = page.locator('#event-decision.open .decision-box');
            await expect(decision).toBeVisible();
            const box = await decision.boundingBox();
            expect(box.x).toBeLessThan(card.x + 20);
            expect(box.x + box.width).toBeLessThanOrEqual(width / 2);
        });
    });
}

test('rever cartão de missão: o botão fica à vista mesmo em tela curta', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 650 });
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.questSystem.completeQuest('tutorial_01');
    });
    await expect(page.locator('#mission-card')).toBeVisible();
    expect(await inView(page, '#mission-card-ok')).toBe(true);
});
