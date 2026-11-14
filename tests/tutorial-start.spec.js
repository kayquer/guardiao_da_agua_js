const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Início enxuto do tutorial (11/2026): só o essencial (5 páginas), a lista do menu de construção rola até o prédio
// que o tutorial pede, o tour pela tela e a causa e efeito (SVG) viram guias depois das missões e o Paulo se
// apresenta na primeira decisão. Desktop (o mobile usa os mesmos passos com outros alvos).

function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    return problems;
}

/** O elemento aparece inteiro dentro de todas as áreas com rolagem em volta dele (não está escondido embaixo). */
function fullyShown(page, selector) {
    return page.evaluate(sel => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        if (!r.width || r.bottom > window.innerHeight || r.top < 0) return false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (!/(auto|scroll|hidden)/.test(cs.overflowY)) continue;
            const c = p.getBoundingClientRect();
            if (r.top < c.top - 4 || r.bottom > c.bottom + 4) return false;
        }
        return true;
    }, selector);
}

test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica; alvos do desktop');
});

test('início: 5 páginas, e o menu de construção rola até a Prefeitura numa tela baixa', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 600 });
    const problems = watchErrors(page);
    await startGame(page);
    const steps = await page.evaluate(() => window.gameManager.tutorialSystem.steps.map(s => s.title));
    expect(steps).toEqual(['Olá, {nome}!', 'Primeiro passo: a Prefeitura', 'Prefeitura construída!', 'Sua primeira missão', 'Agora é com você!']);
    expect(await page.evaluate(() => window.gameManager.tutorialSystem.lessonsDeferred)).toBe(true);

    await page.click('#tutorial-next-btn');
    // a categoria Públicos abre sozinha; o cartão da Prefeitura vem para a vista dentro da grade
    const card = '.building-item[data-building-type="city_hall"]';
    await expect(page.locator(card)).toBeVisible();
    await expect.poll(() => fullyShown(page, card), { timeout: 5000 }).toBe(true);
    expect(problems).toEqual([]);
});

test('a lista rola até o alvo uma vez por passo: se o jogador rolar de volta, o tutorial não puxa de novo', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 600 });
    await startGame(page);
    await page.click('#tutorial-next-btn');
    const card = '.building-item[data-building-type="city_hall"]';
    await expect.poll(() => fullyShown(page, card), { timeout: 5000 }).toBe(true);
    const scrolledBack = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        let p = el.parentElement;
        while (p && !(p.scrollHeight > p.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
        if (!p) return null;
        p.scrollTop = 0;
        return p.scrollTop;
    }, card);
    if (scrolledBack === null) return; // a grade coube inteira nesta altura: nada para rolar
    await page.waitForTimeout(700);
    expect(await page.evaluate(sel => {
        let p = document.querySelector(sel).parentElement;
        while (p && !(p.scrollHeight > p.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
        return p.scrollTop;
    }, card)).toBe(0);
});

test('guias depois das missões: tour pela tela (José) e causa e efeito em SVG (Márcia)', async ({ page }) => {
    const problems = watchErrors(page);
    await startGame(page, { guides: ['energy', 'roads', 'rivers', 'paulo', 'storage', 'zoning', 'public', 'tourism', 'industrial', 'commercial'] });
    await page.evaluate(() => {
        const gm = window.gameManager, ts = gm.tutorialSystem;
        ts.complete();
        ts.lastReadingAt = -Infinity;
        ts.lastGuideEnd = 0;
        gm.questSystem.completedQuests.add('tutorial_01');
        ts.checkGuides();
    });
    await expect(page.locator('#tutorial-title')).toHaveText('Os números lá de cima');
    await expect(page.locator('#tutorial-character-name')).toHaveText('Pescador José');
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    await page.evaluate(() => {
        const gm = window.gameManager, ts = gm.tutorialSystem;
        ts.lastReadingAt = -Infinity;
        ts.lastGuideEnd = 0;
        gm.questSystem.completedQuests.add('energy_01');
        ts.checkGuides();
    });
    await expect(page.locator('#tutorial-title')).toHaveText('Causa e efeito');
    await expect(page.locator('#tutorial-character-name')).toHaveText('Pesquisadora Márcia');
    const svg = page.locator('#tutorial-container .cause-effect svg');
    await expect(svg).toBeVisible();
    await expect(svg.locator('.ce-row')).toHaveCount(4);
    await expect(svg.locator('.ce-row.ce-good')).toHaveCount(2);
    expect(await svg.getAttribute('aria-label')).toContain('Esgoto sem tratar');
    expect(problems).toEqual([]);
});

test('o Paulo se apresenta na primeira decisão, só uma vez', async ({ page }) => {
    const problems = watchErrors(page);
    await startGame(page, { guides: ['energy', 'roads', 'rivers', 'tour', 'howto', 'storage', 'zoning', 'public', 'tourism', 'industrial', 'commercial'] });
    await page.evaluate(() => {
        window.gameManager.tutorialSystem.complete();
        window.gameManager.eventSystem.announceEvent('drought');
    });
    await expect(page.locator('#event-decision .decision-hello')).toContainText('Eu sou o Paulo');
    await page.evaluate(() => {
        const es = window.gameManager.eventSystem;
        es.chooseResponse(es.pendingEvents.find(p => p.awaiting).id, 'none');
        window.gameManager.uiManager.closeEventDecision();
        es.pendingEvents.length = 0;
        es.activeEvents.clear();
        es.announceEvent('heavy_rain');
    });
    await expect(page.locator('#event-decision .decision-option')).not.toHaveCount(0);
    await expect(page.locator('#event-decision .decision-hello')).toHaveCount(0);
    expect(problems).toEqual([]);
});
