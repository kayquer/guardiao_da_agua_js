const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Figuras das aulas e fundos do tutorial viram ilustração animada (js/ui/AnimatedIllustration.js):
// SVG com a base tratada + recortes que se mexem + desenhos por cima; com movimento reduzido, nada anima.
function watchProblems(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    return problems;
}

/** Abre o livro da aula 1 e avança até a primeira página com figura. */
async function openBookOnFigure(page) {
    await page.evaluate(() => window.gameManager.uiManager.openLessonBook(1));
    await expect(page.locator('#lesson-book')).toBeVisible();
    for (let i = 0; i < 8 && !(await page.locator('#lesson-book .book-text .ail').count()); i++) {
        await page.click('#lesson-book .book-next');
        await page.waitForTimeout(400); // virada de página
    }
    return page.locator('#lesson-book .book-text .ail').first();
}

test('aula e tutorial mostram a ilustração animada em camadas', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'o fundo de tela cheia do celular é testado abaixo');
    const problems = watchProblems(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    const figure = await openBookOnFigure(page);
    await expect(figure).toHaveClass(/ail--ready/, { timeout: 15000 }); // tratamento pronto (Worker)
    expect(await page.locator('#lesson-book .book-text img[src*="assets/images/lessons/"]').count()).toBe(0);
    const info = await figure.evaluate(el => ({
        cuts: el.querySelectorAll('.ail-cut').length,
        fx: el.querySelectorAll('.ail-fx > g > *').length,
        href: el.querySelector('.ail-base').getAttribute('href'),
        label: el.querySelector('svg').getAttribute('aria-label'),
        moving: [...el.querySelectorAll('.ail-cut')].some(g => getComputedStyle(g).animationName !== 'none'),
        paused: el.classList.contains('ail--paused')
    }));
    expect(info.cuts).toBeGreaterThanOrEqual(2);
    expect(info.fx).toBeGreaterThan(0);
    expect(info.href).toMatch(/^blob:/);
    expect(info.label.length).toBeGreaterThan(5);
    expect(info.moving).toBe(true);
    expect(info.paused).toBe(false);
    await page.click('#lesson-book .book-close');
    await expect(page.locator('#lesson-book')).toHaveCount(0);

    // Aula no painel do tutorial: mesma troca no #tutorial-text
    await page.evaluate(() => window.gameManager.tutorialSystem.startLesson(1));
    await expect(page.locator('#tutorial-container')).toBeVisible();
    for (let i = 0; i < 8 && !(await page.locator('#tutorial-text .ail').count()); i++) {
        await page.evaluate(() => window.gameManager.tutorialSystem.next());
        await page.waitForTimeout(200);
    }
    await expect(page.locator('#tutorial-text .ail--ready')).toHaveCount(1, { timeout: 15000 });
    expect(await page.locator('#tutorial-text .ail .ail-cut').count()).toBeGreaterThanOrEqual(2);
    expect(problems).toEqual([]);
});

test('movimento reduzido: a ilustração fica parada', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma regra de CSS');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const problems = watchProblems(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    const figure = await openBookOnFigure(page);
    await expect(figure).toHaveClass(/ail--ready/, { timeout: 15000 });
    const animated = await figure.evaluate(el => [el, ...el.querySelectorAll('*')]
        .filter(node => getComputedStyle(node).animationName !== 'none').length);
    expect(animated).toBe(0);
    expect(problems).toEqual([]);
});

test('celular: o fundo da página de história é a ilustração animada', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'o fundo de tela cheia só existe no celular');
    const problems = watchProblems(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await page.evaluate(() => window.gameManager.tutorialSystem.startLesson(1));
    const backdrop = page.locator('#tutorial-background > .ail--backdrop');
    await expect(backdrop).toHaveClass(/ail--ready/, { timeout: 15000 });
    expect(await backdrop.locator('.ail-cut').count()).toBeGreaterThanOrEqual(2);
    expect(problems).toEqual([]);
});
