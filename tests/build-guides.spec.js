const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// "Como funciona" de cada categoria do menu de construção (#build-guide, ui/BuildMenuUI.js; dados em
// js/data/buildGuides.js): abre pelo botão do topo do modal, mostra para que serve, as regras e as dicas, pausa o
// jogo (é leitura), Esc fecha só ele e o atalho "Ver aula" leva ao livro da aula.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    return errors;
}

async function start(page) {
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
}

const CATEGORIES = ['water', 'treatment', 'nature', 'science', 'public', 'power', 'roads', 'residential', 'commercial', 'industrial'];

test.describe('desktop', () => {
    test.beforeEach(async ({}, testInfo) => {
        test.skip(testInfo.project.name === 'mobile', 'o celular tem o próprio teste (393×727)');
    });

    test('toda categoria tem o botão "Como funciona" com o conteúdo dela', async ({ page }) => {
        const errors = watchErrors(page);
        await start(page);
        for (const category of CATEGORIES) {
            await page.click(`.category-btn[data-category="${category}"]`);
            await expect(page.locator('#build-modal')).toBeVisible();
            const button = page.locator('#build-modal-guide');
            await expect(button).toBeVisible();
            await expect(button).toContainText('Como funciona');
            const expected = await page.evaluate(c => ({ title: BUILD_GUIDES[c].title, how: BUILD_GUIDES[c].how.length, tips: BUILD_GUIDES[c].tips.length }), category);
            await expect(button).toHaveAttribute('aria-label', `Como funciona: ${expected.title}`);
            await button.click();
            const guide = page.locator('#build-guide');
            await expect(guide).toBeVisible();
            await expect(guide.locator('#build-guide-title')).toHaveText(expected.title);
            await expect(guide.locator('.build-guide-how li')).toHaveCount(expected.how);
            await expect(guide.locator('.build-guide-tips li')).toHaveCount(expected.tips);
            await expect(guide.getByText('Para que serve')).toBeVisible();
            await expect(guide.locator('.build-guide-chain li').first()).toContainText(/sobe|desce/);
            await expect(guide.locator('[data-guide-link]').first()).toBeVisible();
            // Esc fecha só o painel: o menu de construção continua aberto
            await page.keyboard.press('Escape');
            await expect(guide).toBeHidden();
            await expect(page.locator('#build-modal')).toBeVisible();
            // e o foco volta ao botão que abriu
            await expect(button).toBeFocused();
        }
        expect(errors).toEqual([]);
    });

    test('pausa enquanto está aberto, prende o foco e "Entendi" fecha', async ({ page }) => {
        const errors = watchErrors(page);
        await start(page);
        await page.click('.category-btn[data-category="power"]');
        await page.click('#build-modal-guide');
        await expect(page.locator('#build-guide')).toBeVisible();
        await expect(page.locator('#build-guide-ok')).toBeFocused();
        await page.waitForFunction(() => window.gameManager.pauseReasons?.has('popup'), null, { timeout: 3000 });
        const t0 = await page.evaluate(() => window.gameManager.gameTime);
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => window.gameManager.gameTime)).toBe(t0);
        // Tab no último botão volta ao primeiro (o ✕)
        await page.keyboard.press('Tab');
        await expect(page.locator('#build-guide-x')).toBeFocused();
        await page.click('#build-guide-ok');
        await expect(page.locator('#build-guide')).toBeHidden();
        await page.waitForFunction(() => !window.gameManager.pauseReasons?.has('popup'), null, { timeout: 3000 });
        // o painel vazio do menu também abre o mesmo guia
        await page.click('#build-info-content [data-action="build-guide"]');
        await expect(page.locator('#build-guide-title')).toHaveText('Energia');
        // Esc fecha o guia; outro Esc fecha o menu
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        await expect(page.locator('#build-modal')).toBeHidden();
        expect(errors).toEqual([]);
    });

    test('"Ver aula" fecha o menu e abre a aula ligada à categoria', async ({ page }) => {
        const errors = watchErrors(page);
        await start(page);
        await page.click('.category-btn[data-category="water"]');
        await page.click('#build-modal-guide');
        const lesson = page.locator('#build-guide [data-guide-link="lesson"]');
        await expect(lesson).toContainText('Ver aula: Água escondida e cidades');
        await lesson.click();
        await expect(page.locator('#build-guide')).toBeHidden();
        await expect(page.locator('#build-modal')).toBeHidden();
        await expect(page.locator('#lesson-book')).toBeVisible();
        expect(errors).toEqual([]);
    });
});

test('celular 393×727: botão visível e painel sem sobra para os lados', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 393, height: 727 });
    await start(page);
    await page.evaluate(() => window.gameManager.uiManager.selectCategory('residential'));
    await expect(page.locator('#build-modal')).toBeVisible();
    const button = page.locator('#build-modal-guide');
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(393);
    const head = await page.evaluate(() => {
        const el = document.querySelector('#build-modal .build-modal-head');
        return { scroll: el.scrollWidth, client: el.clientWidth };
    });
    expect(head.scroll).toBeLessThanOrEqual(head.client + 1);
    await button.click();
    const guide = page.locator('#build-guide');
    await expect(guide).toBeVisible();
    const sizes = await page.evaluate(() => {
        const body = document.querySelector('.build-guide-body');
        const box = document.querySelector('.build-guide-box').getBoundingClientRect();
        return {
            page: document.documentElement.scrollWidth, inner: window.innerWidth,
            bodyScroll: body.scrollWidth, bodyClient: body.clientWidth,
            boxLeft: box.left, boxRight: box.right
        };
    });
    expect(sizes.page).toBeLessThanOrEqual(sizes.inner);
    expect(sizes.bodyScroll).toBeLessThanOrEqual(sizes.bodyClient + 1);
    expect(sizes.boxLeft).toBeGreaterThanOrEqual(0);
    expect(sizes.boxRight).toBeLessThanOrEqual(393);
    // "Entendi" à vista (rodapé fixo, o texto rola por dentro)
    await expect(page.locator('#build-guide-ok')).toBeInViewport();
    await page.locator('#build-guide-ok').click();
    await expect(guide).toBeHidden();
    await expect(page.locator('#build-modal')).toBeVisible();
    expect(errors).toEqual([]);
});
