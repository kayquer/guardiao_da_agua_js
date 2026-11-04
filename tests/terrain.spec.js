// Relevo no jogo: painel de terreno, regra de construção e cheia na planície (js/data/riverMap.js, terrainInfo.js)
const { test, expect } = require('@playwright/test');
const { startGame, closeCards } = require('./helpers');

test.skip(({ isMobile }) => isMobile, 'mesma lógica do computador');

const findCell = (page, wanted, filter) => page.evaluate(([wanted, filter]) => {
    const g = window.gameManager.gridManager;
    for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
        if (g.getTerrainZone(x, z) !== wanted) continue;
        if (filter === 'plain' && !g.hasFloodplainReach(x, z)) continue;
        if (filter === 'entrenched' && g.hasFloodplainReach(x, z)) continue;
        return [x, z];
    }
    return null;
}, [wanted, filter]);

test.beforeEach(async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await closeCards(page, 500);
});

const panel = async (page, [x, z], type) => {
    await page.evaluate(([x, z, type]) => window.gameManager.uiManager.showTerrainInfo(x, z, type), [x, z, type]);
    return page.locator('.terrain-info-panel');
};

test('o painel segue a sequência do relevo, com e sem planície', async ({ page }) => {
    let info = await panel(page, await findCell(page, 'floodplain'), 'floodplain');
    await expect(info).toContainText('Planície fluvial');
    await expect(info).toContainText('alagável');
    await expect(info.locator('.terrain-sequence li')).toHaveText(['Rio', 'Planície fluvial', 'APP do rio', 'Planalto']);
    await expect(info.locator('.terrain-sequence li.here')).toHaveText('Planície fluvial');

    info = await panel(page, await findCell(page, 'app', 'entrenched'), 'grassland');
    await expect(info).toContainText('APP do rio');
    await expect(info).toContainText('30 metros');
    await expect(info.locator('.terrain-sequence li')).toHaveText(['Rio', 'APP do rio', 'Planalto']);

    info = await panel(page, await findCell(page, 'app', 'plain'), 'grassland');
    await expect(info).toContainText('depois da planície');
    await expect(info).toContainText('50 metros');

    info = await panel(page, await findCell(page, 'hill'), 'hill');
    await expect(info).toContainText('Encosta');
    await expect(info).not.toContainText('Desconhecido');
});

test('o jogo recusa construir na planície e na APP, com o motivo, e a rua atravessa', async ({ page }) => {
    const check = async (cell, type) => page.evaluate(([x, z, type]) => {
        const r = window.gameManager.buildingSystem.canPlaceBuilding(x, z, type, { quiet: true });
        return { canPlace: r.canPlace, reason: r.reason };
    }, [...cell, type]);
    const plain = await findCell(page, 'floodplain');
    const app = await findCell(page, 'app');
    expect(await check(plain, 'zone_residential_light')).toMatchObject({ canPlace: false, reason: expect.stringMatching(/^Planície/) });
    expect(await check(app, 'zone_residential_light')).toMatchObject({ canPlace: false, reason: expect.stringMatching(/^APP/) });
    expect((await check(plain, 'paved_road')).canPlace).toBe(true);
    expect((await check(app, 'paved_road')).canPlace).toBe(true);
});

test('ETA fora das faixas protegidas ganha bomba e canos', async ({ page }) => {
    const plan = await page.evaluate(() => {
        const bs = window.gameManager.buildingSystem;
        for (let x = 0; x < 39; x++) for (let z = 0; z < 39; z++) {
            if (!bs.canPlaceBuilding(x, z, 'water_treatment_plant', { quiet: true }).canPlace) continue;
            return bs.planWaterIntake(x, z, 2, 10);
        }
        return null;
    });
    expect(plan.adjacent).toBeFalsy();
    expect(plan.path.length).toBeGreaterThan(0);
});

test('a planície fica coberta de água durante a enchente e seca depois', async ({ page }) => {
    const mesh = () => page.evaluate(() => {
        const m = window.gameManager.gridManager.floodMesh;
        return m ? { enabled: m.isEnabled(), alpha: m.material.alpha, pickable: m.isPickable } : null;
    });
    expect(await mesh()).toBeNull();
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.eventSystem.hasActiveEventOfType = type => type === 'flood';
        for (let i = 0; i < 12; i++) gm.updateDayNightLighting();
    });
    expect(await mesh()).toMatchObject({ enabled: true, pickable: false });
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.eventSystem.hasActiveEventOfType = () => false;
        for (let i = 0; i < 12; i++) gm.updateDayNightLighting();
    });
    expect((await mesh()).enabled).toBe(false);
});
