const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Modo loja (o publicado nesta branch, ?modo=loja) — as regras que a 3ª auditoria de game design pediu para
// cobrir aqui, porque a suíte antiga roda no modo pesquisa: começo sem pulo de população, carência de eventos,
// carvão com portão e aviso de poluição, textos sem "estude para liberar" e as 4 cartas do Paulo à vista.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    return errors;
}

async function startStore(page) {
    await startGame(page, { url: '/index.html?modo=loja', basin: 'vale' });
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
}

test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'regras iguais no mobile');
});

test('loja: a cidade começa com 30 moradores e lugar para 40 (sem pulo para 100), e sem eventos na carência', async ({ page }) => {
    const errors = watchErrors(page);
    await startStore(page);
    await page.evaluate(() => { window.gameManager.timeScale = 3; });
    await page.waitForFunction(() => (window.gameManager.gameTime || 0) > 15000, null, { timeout: 30000 });
    const state = await page.evaluate(() => {
        const gm = window.gameManager;
        const es = gm.eventSystem;
        es.eventProbability = 1; // mesmo com 100% de chance, a carência segura
        es.tryGenerateEvent();
        return {
            mode: GameMode.id(),
            pop: gm.resourceManager.resources.population.current,
            max: gm.resourceManager.resources.population.max,
            grace: es.inGracePeriod(),
            events: es.activeEvents.size + es.pendingEvents.length
        };
    });
    expect(state.mode).toBe('loja');
    expect(state.pop).toBeGreaterThanOrEqual(30);
    expect(state.pop).toBeLessThanOrEqual(40);
    expect(state.max).toBe(40);
    expect(state.grace).toBe(true);
    expect(state.events).toBe(0);
    expect(errors).toEqual([]);
});

test('loja: carvão e gás só depois da indústria, e o cartão avisa em quanto tempo a poluição chega a 100%', async ({ page }) => {
    const errors = watchErrors(page);
    await startStore(page);
    const state = await page.evaluate(() => {
        const ui = window.gameManager.uiManager;
        const types = window.gameManager.buildingSystem.buildingTypes;
        return {
            coal: ui.getBuildingItemState(types.get('coal_plant')),
            gas: ui.getBuildingItemState(types.get('thermal_plant')),
            solar: ui.getBuildingItemState(types.get('solar_micro')),
            fill: ui.getPollutionFillMinutes(types.get('coal_plant')),
            clean: ui.getPollutionFillMinutes(types.get('solar_micro'))
        };
    });
    expect(state.coal).toBe('tech');
    expect(state.gas).toBe('tech');
    expect(state.solar).toBe('ok');
    expect(state.fill).toMatch(/leva a poluição de \d+% a 100% em/);
    expect(state.clean).toBeNull();
    await page.evaluate(() => window.gameManager.uiManager.showBuildInfo('coal_plant'));
    await expect(page.locator('#build-info-content')).toContainText('Com a cidade de agora');
    expect(errors).toEqual([]);
});

test('loja: nenhum texto de tutorial, guia ou aula rápida manda "estudar para liberar"', async ({ page }) => {
    const errors = watchErrors(page);
    await startStore(page);
    const bad = await page.evaluate(() => {
        const ts = window.gameManager.tutorialSystem;
        const texts = [];
        const take = s => [s.text, s.placingHint, s.lessonText, ...(s.targets || []).map(t => t?.text)].forEach(t => t && texts.push(t));
        ts.tutorialSteps.forEach(take);
        TutorialSystem.GUIDES.forEach(g => g.steps.forEach(take));
        Object.values(TutorialSystem.TOPICS || {}).forEach(t => t.steps.forEach(take));
        TutorialSystem.buildTargets('water_pump', 'water', 'a bomba').forEach(t => texts.push(t.text));
        return texts.map(t => TutorialSystem.studyText(t))
            .filter(t => /estud\w*\s+(e|para)\s+(liberar|desbloquear)|clique nela para <b>estudar/i.test(t));
    });
    expect(bad).toEqual([]);
    expect(errors).toEqual([]);
});

test('loja: as 4 cartas do Paulo cabem na tela a 1366×768, com o quadro "Como está a cidade agora"', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    const errors = watchErrors(page);
    await startStore(page);
    await page.evaluate(() => window.gameManager.eventSystem.announceEvent('drought'));
    await expect(page.locator('#event-decision .decision-option')).toHaveCount(4, { timeout: 10000 });
    await expect(page.locator('#event-decision .decision-state')).toBeVisible();
    const boxes = await page.locator('#event-decision .decision-option').evaluateAll(els => els.map(e => e.getBoundingClientRect().bottom));
    for (const bottom of boxes) expect(bottom).toBeLessThanOrEqual(768);
    // "Não fazer nada" mostra o que se ganha: caixa livre e conserto pela metade
    await expect(page.locator('#event-decision .decision-option.tier-none')).toContainText('Conserto pela metade');
    expect(errors).toEqual([]);
});
