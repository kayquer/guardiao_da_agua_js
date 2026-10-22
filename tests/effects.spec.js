const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Cada prédio soma seus efeitos uma vez, quando a obra termina, e tira uma vez ao ser removido.
// Antes a colocação e a conclusão aplicavam os dois: manutenção, poluição e consumo contavam em dobro.
test('efeitos do prédio contam uma vez só', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    const snapshot = () => page.evaluate(() => {
        const r = window.gameManager.resourceManager.resources;
        return {
            expenses: r.budget.expenses,
            pollution: r.pollution.sources,
            power: r.electricity.consumption,
            water: r.water.production
        };
    });
    const before = await snapshot();

    const id = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (bs.canPlaceBuilding(x, z, 'water_pump').canPlace) return bs.placeBuilding(x, z, 'water_pump').id;
        }
    });
    expect(id).toBeTruthy();
    await page.evaluate(() => document.querySelector('.central-alert-overlay')?.remove());

    // Em obra: nada mudou ainda
    expect(await snapshot()).toEqual(before);

    await page.waitForFunction(buildingId => !window.gameManager.buildingSystem.buildings.get(buildingId)?.underConstruction,
        id, { timeout: 20000 });
    const config = await page.evaluate(() => window.gameManager.buildingSystem.buildingTypes.get('water_pump'));
    const built = await snapshot();
    expect(built.expenses - before.expenses).toBeCloseTo(config.maintenanceCost);
    expect(built.pollution - before.pollution).toBeCloseTo(config.pollutionGeneration);
    expect(built.power - before.power).toBeCloseTo(config.powerConsumption);

    // Removido: volta ao ponto de partida (a produção de água depende da eficiência, que muda com a energia)
    await page.evaluate(buildingId => window.gameManager.buildingSystem.removeBuilding(buildingId), id);
    const removed = await snapshot();
    expect(removed.expenses).toBeCloseTo(before.expenses);
    expect(removed.pollution).toBeCloseTo(before.pollution);
    expect(removed.power).toBeCloseTo(before.power);
    expect(removed.water).toBeCloseTo(before.water);

    // Remover uma obra não desconta o que nunca foi somado
    const obra = await page.evaluate(() => {
        const bs = window.gameManager.buildingSystem;
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (bs.canPlaceBuilding(x, z, 'water_pump').canPlace) return bs.placeBuilding(x, z, 'water_pump').id;
        }
    });
    await page.evaluate(buildingId => window.gameManager.buildingSystem.removeBuilding(buildingId), obra);
    expect(await snapshot()).toEqual(removed);
});

// "Energia Insuficiente" (e os outros alertas centrais automáticos) não abrem por cima do livro de aulas,
// da central de aulas, do tutorial ou do livro de estudo: esperam e aparecem quando eles fecham.
test('alerta de energia espera o livro de aulas fechar', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    await page.evaluate(() => window.gameManager.uiManager.openLessonBook(1));
    await expect(page.locator('#lesson-book')).toBeVisible();
    const id = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (bs.canPlaceBuilding(x, z, 'water_pump').canPlace) return bs.placeBuilding(x, z, 'water_pump').id;
        }
    });
    expect(id).toBeTruthy();
    await page.waitForTimeout(600);
    await expect(page.locator('.central-alert-overlay')).toHaveCount(0);
    // O livro continua clicável
    await page.click('#lesson-book .book-next');
    await page.click('#lesson-book .book-close');
    await expect(page.locator('#lesson-book')).toHaveCount(0);
    await expect(page.locator('.central-alert-card')).toContainText('Energia Insuficiente');
    await page.click('.central-alert-btn');

    // Se a energia voltar enquanto o alerta espera, ele não aparece mais
    await page.evaluate(() => {
        const gm = window.gameManager, ui = gm.uiManager;
        ui.cooldownManager.active.clear();
        gm.buildingSystem._energyWarningCooldown = 0;
        ui.openLessonsHub();
        gm.buildingSystem.showEnergyShortageNotification({ efficiency: 0, generation: 0, consumption: 20 });
        gm.resourceManager.addElectricityGeneration(1000);
        ui.closeLessonsHub();
    });
    await page.waitForTimeout(600);
    await expect(page.locator('.central-alert-overlay')).toHaveCount(0);
});
