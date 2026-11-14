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
    expect(await page.locator('#lesson-book .book-text img[src*="assets/images/lessons/"]:not(.ail-raw)').count()).toBe(0); // a crua (.ail-raw) é da figura
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

test('a figura aparece na hora (esqueleto, depois a crua) e só então vira a animada, sem pular', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica no celular');
    const problems = watchProblems(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    // Imagem lenta (rede) e guache segurado até o teste liberar: dá para ver cada fase
    let releaseImage;
    const imageGate = new Promise(resolve => { releaseImage = resolve; });
    await page.route('**/assets/images/lessons/**', async route => {
        await imageGate;
        await route.continue();
    });
    await page.evaluate(() => {
        const AI = window.AnimatedIllustration;
        const process = AI.process;
        const gate = new Promise(resolve => { window.__releaseGouache = resolve; });
        AI.process = async src => { await gate; return process.call(AI, src); };
    });

    const figure = await openBookOnFigure(page);
    // 1) esqueleto: moldura já no tamanho final, brilho de carregando, nada animado ainda
    await expect(figure).toHaveClass(/ail--loading/);
    const before = await figure.boundingBox();
    expect(before.height).toBeGreaterThan(60);
    expect(await figure.evaluate(el => getComputedStyle(el, '::before').content)).not.toBe('none');

    // 2) a crua chega: aparece logo, ainda sem a animada
    releaseImage();
    await expect(figure).toHaveClass(/ail--raw/, { timeout: 10000 });
    await expect(figure).not.toHaveClass(/ail--loading/);
    const raw = await figure.evaluate(el => {
        const img = el.querySelector('.ail-raw');
        return { loaded: img.complete && img.naturalWidth > 0, opacity: getComputedStyle(img).opacity, svg: getComputedStyle(el.querySelector('svg')).opacity };
    });
    expect(raw).toEqual({ loaded: true, opacity: '1', svg: '0' });
    await expect(figure).not.toHaveClass(/ail--ready/);

    // 3) guache pronto: a animada cobre a crua (crossfade), a crua sai e o tamanho não muda
    await page.evaluate(() => window.__releaseGouache());
    await expect(figure).toHaveClass(/ail--ready/, { timeout: 15000 });
    expect(await figure.locator('.ail-base').getAttribute('href')).toMatch(/^blob:/);
    await expect(figure.locator('.ail-raw')).toHaveCount(0, { timeout: 5000 });
    await expect.poll(() => figure.evaluate(el => getComputedStyle(el.querySelector('svg')).opacity)).toBe('1');
    const after = await figure.boundingBox();
    expect(Math.abs(after.height - before.height)).toBeLessThan(1);
    expect(Math.abs(after.width - before.width)).toBeLessThan(1);

    // 4) mesma figura de novo (página virada e volta): já nasce animada, sem crua nem esqueleto
    const key = await figure.getAttribute('data-illustration');
    const again = await page.evaluate(key => {
        const holder = document.createElement('div');
        holder.innerHTML = `<img src="assets/images/${key}" alt="x">`;
        AnimatedIllustration.enhance(holder);
        const el = holder.firstElementChild;
        return { ready: el.classList.contains('ail--ready'), raw: el.querySelectorAll('.ail-raw').length };
    }, key);
    expect(again).toEqual({ ready: true, raw: 0 });

    // 5) prefetch: a figura da próxima página já fica pronta antes de aparecer (uma vez só por arquivo)
    const prefetched = await page.evaluate(async () => {
        const AI = window.AnimatedIllustration;
        const src = 'assets/images/lessons/erosao.webp';
        AI.prefetch(`<img src="${src}">`, src);
        const url = AI.urlOf(src);
        for (let i = 0; i < 300 && !AI.treated.has(url); i++) await new Promise(r => setTimeout(r, 100));
        const holder = document.createElement('div');
        holder.innerHTML = `<img src="${src}" alt="x">`;
        AI.enhance(holder);
        return { treated: AI.treated.has(url), ready: holder.firstElementChild.classList.contains('ail--ready') };
    });
    expect(prefetched).toEqual({ treated: true, ready: true });
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
