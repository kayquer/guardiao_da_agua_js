const { test, expect } = require('@playwright/test');
const { startGame, TEST_PROFILE } = require('./helpers');

// Água de superfície (10/2026): a ETA longe da água ganha bomba na margem e canos (building/WaterIntake.js),
// encostada na água capta direto; o fantasma mostra os canos; clicar no cano seleciona a ETA; o traçado volta
// igual depois de salvar e carregar e some junto com a ETA. O painel da água mostra o nível dos rios.
function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('dialog', d => (d.type() === 'beforeunload' ? d.accept() : d.dismiss()));
    return problems;
}

/** Acha um lugar livre para a ETA (2×2) a `min`-`max` blocos da água (min = 1: encostada). */
const findSpot = (page, min, max) => page.evaluate(([min, max]) => {
    const bs = window.gameManager.buildingSystem;
    for (let x = 0; x < 39; x++) for (let z = 0; z < 39; z++) {
        if (!bs.canPlaceBuilding(x, z, 'water_treatment_plant', { quiet: true }).canPlace) continue;
        const plan = bs.planWaterIntake(x, z, 2, 10);
        if (!plan) continue;
        if (min === 1 ? plan.adjacent : (!plan.adjacent && plan.distance >= min && plan.distance <= max && plan.path.length >= 2)) return [x, z];
    }
    return null;
}, [min, max]);

test('ETA longe da água ganha bomba e canos; encostada capta direto; salvar e carregar mantém', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    test.setTimeout(120000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.buildingSystem.maxSimultaneousConstructions = Infinity;
        gm.resourceManager.resources.budget.current = 1e6;
    });

    const far = await findSpot(page, 3, 8);
    expect(far, 'mapa sem lugar a 3-8 blocos da água').not.toBeNull();

    // Fantasma: escolhendo o lugar aparecem os canos (translúcidos, não clicáveis) e o rótulo conta os canos
    const preview = await page.evaluate(([x, z]) => {
        const bs = window.gameManager.buildingSystem;
        const type = bs.buildingTypes.get('water_treatment_plant');
        const plan = bs.planWaterIntake(x, z, 2, 10);
        bs.updateIntakePreview(x, z, type, plan);
        const mesh = bs.intakePreviewMesh;
        const out = { exists: !!mesh && !mesh.isDisposed(), pickable: mesh?.isPickable, label: bs.describeWaterIntake(plan) };
        bs.clearIntakePreview();
        out.cleared = !bs.intakePreviewMesh && mesh.isDisposed();
        return out;
    }, far);
    expect(preview).toMatchObject({ exists: true, pickable: false, cleared: true });
    expect(preview.label).toMatch(/bomba e \d+ canos? automáticos/);

    const placed = await page.evaluate(([x, z]) => {
        const gm = window.gameManager;
        gm.buildingSystem.buildingCooldown.active = false;
        const b = gm.buildingSystem.placeBuilding(x, z, 'water_treatment_plant');
        const mesh = b.intakeMesh;
        return {
            id: b.id, pump: b.intake.pump, path: b.intake.path,
            mesh: !!mesh && !mesh.isDisposed(), pickable: mesh?.isPickable, owner: mesh?.metadata?.buildingId,
            onWater: gm.gridManager.getTerrainType(b.intake.pump[0], b.intake.pump[1])
        };
    }, far);
    expect(placed.mesh).toBe(true);
    expect(placed.pickable).toBe(true);
    expect(placed.owner).toBe(placed.id); // clicar no cano seleciona a ETA (metadata.buildingId)
    expect(placed.onWater).toBe('water');
    expect(placed.path.length).toBeGreaterThanOrEqual(2);

    const near = await findSpot(page, 1, 1);
    if (near) {
        const adjacent = await page.evaluate(([x, z]) => {
            const bs = window.gameManager.buildingSystem;
            bs.buildingCooldown.active = false;
            const b = bs.placeBuilding(x, z, 'water_treatment_plant');
            return { pump: b.intake.pump, path: b.intake.path.length, mesh: !!b.intakeMesh };
        }, near);
        expect(adjacent).toEqual({ pump: null, path: 0, mesh: false });
    }

    // Painel da água mostra o nível dos rios
    await page.evaluate(() => window.gameManager.uiManager.showResourcePanel('water'));
    await expect(page.locator('.river-block')).toContainText('Rios e lagos');

    // Salva, recarrega e continua: a captação volta no mesmo lugar
    await page.evaluate(() => window.gameManager.saveGame());
    await page.goto('/index.html');
    await page.locator(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`).click();
    await page.locator('.swal2-popup.game-swal .swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.buildingSystem.buildings.size > 0);
    const restored = await page.evaluate(id => {
        const b = window.gameManager.buildingSystem.buildings.get(id);
        return { pump: b?.intake?.pump, path: b?.intake?.path, mesh: !!b?.intakeMesh && !b.intakeMesh.isDisposed() };
    }, placed.id);
    expect(restored).toEqual({ pump: placed.pump, path: placed.path, mesh: true });

    // Demolir a ETA leva a bomba e os canos junto
    const removed = await page.evaluate(id => {
        const bs = window.gameManager.buildingSystem;
        const mesh = bs.buildings.get(id).intakeMesh;
        bs.removeBuilding(id);
        return mesh.isDisposed();
    }, placed.id);
    expect(removed).toBe(true);
    expect(problems).toEqual([]);
});

test('ETA longe demais da água não pode ser construída e diz por quê', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    const result = await page.evaluate(() => {
        const bs = window.gameManager.buildingSystem;
        for (let x = 0; x < 39; x++) for (let z = 0; z < 39; z++) {
            if (!window.gameManager.gridManager.canPlaceBuilding(x, z, 2)) continue;
            if (Number.isFinite(bs.getWaterDistance(x, z, 2, 10))) continue;
            return bs.canPlaceBuilding(x, z, 'water_treatment_plant', { quiet: true });
        }
        return null;
    });
    test.skip(!result, 'mapa sem terreno a mais de 10 blocos da água');
    expect(result.canPlace).toBe(false);
    expect(result.reason).toMatch(/rio, lago ou represa a até 10 blocos/);
    expect(problems).toEqual([]);
});
