const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Retorno da cidade ao jogador: tempo até a próxima fase da zona, poluição visível (água, ruas, ar),
// cards de construção que acompanham dinheiro e estudo, e Esc que não fecha tutorial interativo.
function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    return problems;
}

async function ready(page) {
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.resourceManager.resources.budget.current = 1e6;
    });
}

test('zona mostra quanto falta para a próxima fase e por quê', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma regra; basta um viewport');
    const problems = watchErrors(page);
    await ready(page);
    const id = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        bs.buildingCooldown.active = false;
        const a = gm.gridManager.startArea || { x: 16, z: 16 };
        const spots = [];
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) spots.push([x, z]);
        spots.sort((p, q) => Math.hypot(p[0] - a.x - 4, p[1] - a.z - 4) - Math.hypot(q[0] - a.x - 4, q[1] - a.z - 4));
        const spot = spots.find(([x, z]) => bs.canPlaceBuilding(x, z, 'zone_residential_light').canPlace);
        const b = bs.placeBuilding(spot[0], spot[1], 'zone_residential_light');
        document.querySelector('.central-alert-overlay')?.remove();
        bs.completeConstruction(b);
        // Cidade com água e satisfação média: ritmo 1
        bs.getZoneGrowthConditions = () => ({ satisfaction: 50, waterShortage: false, energyEfficiency: 1 });
        gm.selectBuilding(b);
        return b.id;
    });
    const eta = page.locator(`#zone-stage-eta-${id}`);
    await expect(eta).toHaveText(/Próxima fase em ~\d+ s/);
    const first = Number((await eta.textContent()).match(/~(\d+)/)[1]);
    expect(first).toBeLessThanOrEqual(20); // fase 0 → 1 em 20 s de jogo
    await page.waitForTimeout(2500);
    expect(Number((await eta.textContent()).match(/~(\d+)/)[1])).toBeLessThan(first); // conta regressiva ao vivo

    // Sem água: parada, com o motivo
    await page.evaluate(() => {
        window.gameManager.buildingSystem.getZoneGrowthConditions = () => ({ satisfaction: 50, waterShortage: true, energyEfficiency: 1 });
    });
    await expect(eta).toHaveText('Crescimento parado');
    await expect(page.locator(`#zone-stage-why-${id}`)).toContainText('Falta água');
    expect(problems).toEqual([]);
});

test('poluição acima de 70%: água turva, ruas encardidas e ar com fumaça; volta ao normal', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma regra; basta um viewport');
    const problems = watchErrors(page);
    await ready(page);
    const placed = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem, s = gm.gridManager.startArea;
        for (let x = s.x; x < s.x + 8; x++) for (let z = s.z; z < s.z + 8; z++) {
            if (bs.canPlaceBuilding(x, z, 'paved_road').canPlace && bs.placeBuilding(x, z, 'paved_road')) return true;
        }
        return false;
    });
    expect(placed).toBe(true);

    const look = () => page.evaluate(() => {
        const gm = window.gameManager, scene = gm.scene;
        const road = scene.materials.find(m => m.name.startsWith('roadPieceMat_'));
        return {
            level: gm.pollutionVisuals.level,
            water: gm.gridManager.waterPollution || 0,
            road: road.diffuseColor.b,
            fog: scene.fogMode === BABYLON.Scene.FOGMODE_EXP2 ? scene.fogDensity : 0
        };
    });

    await page.evaluate(() => { window.gameManager.resourceManager.resources.pollution.current = 60; });
    await page.waitForTimeout(1000);
    expect((await look()).level).toBe(0); // até 70% nada muda

    await page.evaluate(() => { window.gameManager.resourceManager.resources.pollution.current = 95; });
    await page.waitForFunction(() => window.gameManager.pollutionVisuals.level > 0.8, null, { timeout: 15000 });
    const dirty = await look();
    expect(dirty.water).toBeGreaterThan(0.8);
    expect(dirty.road).toBeLessThan(0.65);
    expect(dirty.fog).toBeGreaterThan(0.01);

    await page.evaluate(() => { window.gameManager.resourceManager.resources.pollution.current = 10; });
    await page.waitForFunction(() => window.gameManager.pollutionVisuals.level === 0, null, { timeout: 15000 });
    await page.waitForTimeout(600);
    const clean = await look();
    expect(clean.water).toBe(0);
    expect(clean.road).toBe(1);
    expect(problems).toEqual([]);
});

test('cards de construção atualizam sozinhos com o dinheiro e com o estudo feito', async ({ page }) => {
    const problems = watchErrors(page);
    await ready(page);
    // Abre a categoria de um prédio que precisa de estudo
    const ids = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        const locked = [...bs.buildingTypes.values()].find(t => t.visible !== false && !bs.isBuildingUnlocked(t.id) && gm.studySystem.hasStudyContent(t.id));
        gm.uiManager.selectCategory(locked.category);
        const free = [...bs.buildingTypes.values()].find(t => t.category === locked.category && bs.isBuildingUnlocked(t.id) && t.cost > 0);
        return { locked: locked.id, free: free?.id || null };
    });
    const card = id => page.locator(`#building-items .building-item[data-building-type="${id}"]`);
    await expect(card(ids.locked)).toHaveClass(/locked/);

    // Sem dinheiro: card desabilitado; o dinheiro volta → habilita sem reabrir a categoria
    if (ids.free) {
        await page.evaluate(() => { window.gameManager.resourceManager.resources.budget.current = 0; });
        await expect(card(ids.free)).toHaveClass(/disabled/);
        await page.evaluate(() => { window.gameManager.resourceManager.resources.budget.current = 1e6; });
        await expect(card(ids.free)).not.toHaveClass(/disabled/);
    }

    // Bloqueado + sem dinheiro → estudo feito: vira "sem dinheiro"; dinheiro volta → pronto para construir
    await page.evaluate(() => { window.gameManager.resourceManager.resources.budget.current = 0; });
    await page.evaluate(id => window.gameManager.studySystem.unlockBuilding(id), ids.locked);
    await expect(card(ids.locked)).not.toHaveClass(/locked/);
    await expect(card(ids.locked)).toHaveClass(/disabled/);
    await expect(card(ids.locked).locator('.building-cost')).toContainText('R$');
    await page.evaluate(() => { window.gameManager.resourceManager.resources.budget.current = 1e6; });
    await expect(card(ids.locked)).not.toHaveClass(/disabled/);
    expect(await card(ids.locked).getAttribute('data-locked')).toBeNull();
    expect(problems).toEqual([]);
});

test('Esc não fecha o tutorial interativo (aula rápida e guia)', async ({ page }, testInfo) => {
    const problems = watchErrors(page);
    await ready(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.startTopic('water'));
    await expect(page.locator('#tutorial-container')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => ({
        active: window.gameManager.tutorialSystem.isActive,
        state: window.gameManager.gameState
    }))).toEqual({ active: true, state: 'tutorial' });
    await expect(page.locator('#pause-overlay')).toBeHidden();

    // Num passo de ação de um guia, o Esc só cancela a construção; o guia continua
    // (no celular escolher o prédio não entra direto no modo de construção: só a parte da aula vale lá)
    if (testInfo.project.name === 'mobile') return expect(problems).toEqual([]);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await page.evaluate(() => {
        localStorage.setItem('guardiao_agua_guides', JSON.stringify({ p_teste: [] }));
        window.gameManager.tutorialSystem.startGuide('energy');
    });
    await page.waitForFunction(() => window.gameManager.tutorialSystem.steps?.length > 0);
    const action = await page.evaluate(() => {
        const ts = window.gameManager.tutorialSystem;
        const i = ts.steps.findIndex(s => ts.isActionStep(s));
        ts.goTo(i);
        window.gameManager.uiManager.selectBuildingType(ts.steps[i].waitFor);
        return window.gameManager.buildMode;
    });
    expect(action).toBeTruthy();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => ({ active: window.gameManager.tutorialSystem.isActive, build: !!window.gameManager.buildMode })))
        .toEqual({ active: true, build: false });
    expect(problems).toEqual([]);
});
