const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Eficiência dos prédios (js/systems/building/BuildingEfficiency.js): prédio sem rua encostada funciona a 75%
// com aviso 3D ("🚧 Sem rua") e no painel; rua construída/demolida recalcula; zonas consomem energia pela fase
// e aparecem no painel de energia.
function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    // Recurso recusado pelo servidor local sobrecarregado não é erro do jogo (o smoke cobre arquivos faltando)
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_REFUSED/.test(m.text())) problems.push(`console.error: ${m.text()}`); });
    return problems;
}

async function ready(page) {
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.resourceManager.resources.budget.current = 1e6;
        gm.studySystem.isBuildingUnlocked = () => true;
    });
}

/** Constrói e termina um prédio num lugar livre perto da área inicial, com as 4 células ao redor livres. */
async function buildNear(page, type) {
    return page.evaluate(type => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        bs.buildingCooldown.active = false;
        const a = gm.gridManager.startArea || { x: 16, z: 16 };
        const size = bs.buildingTypes.get(type).size || 1;
        const spots = [];
        for (let x = 1; x < 38; x++) for (let z = 1; z < 38; z++) spots.push([x, z]);
        spots.sort((p, q) => Math.hypot(p[0] - a.x - 4, p[1] - a.z - 4) - Math.hypot(q[0] - a.x - 4, q[1] - a.z - 4));
        const free = (x, z) => bs.canPlaceBuilding(x, z, 'paved_road').canPlace;
        const spot = spots.find(([x, z]) => bs.canPlaceBuilding(x, z, type).canPlace && free(x, z - 1) && free(x - 1, z)
            && !bs.hasRoadLink({ config: bs.buildingTypes.get(type), gridX: x, gridZ: z }));
        const b = bs.placeBuilding(spot[0], spot[1], type);
        document.querySelector('.central-alert-overlay')?.remove();
        bs.completeConstruction(b);
        bs.updateAllBuildingEfficiency();
        return { id: b.id, x: spot[0], z: spot[1], size };
    }, type);
}

test('prédio sem rua funciona a 75% com aviso 3D e no painel; a rua encostada resolve', async ({ page }) => {
    const problems = watchErrors(page);
    await ready(page);
    const pump = await buildNear(page, 'water_pump');

    const state = () => page.evaluate(id => {
        const gm = window.gameManager, b = gm.buildingSystem.buildings.get(id);
        gm.buildingSystem.updateAllBuildingEfficiency(); // a passada (5 s) reposiciona o ícone (modelo .glb pode chegar depois)
        const icon = b.noRoadIcon;
        return {
            efficiency: b.efficiency, noRoad: b.noRoad,
            icon: !!icon && !icon.isDisposed(), billboard: icon?.billboardMode === BABYLON.Mesh.BILLBOARDMODE_ALL,
            pickable: icon?.isPickable, iconY: icon?.position.y, topY: b.mesh.getHierarchyBoundingVectors(true).max.y,
            production: gm.resourceManager.resources.water.production
        };
    }, pump.id);

    const before = await state();
    expect(before.noRoad).toBe(true);
    expect(before.efficiency).toBeCloseTo(0.75);
    expect(before.icon).toBe(true);
    expect(before.billboard).toBe(true);
    expect(before.pickable).toBe(false);
    expect(before.iconY).toBeGreaterThan(before.topY);

    // Painel do prédio selecionado
    await page.evaluate(id => {
        const gm = window.gameManager;
        gm.selectBuilding(gm.buildingSystem.buildings.get(id));
    }, pump.id);
    const panel = page.locator('#details-content');
    await expect(panel.locator('.no-road-warning')).toContainText('Sem rua ligando: funciona a 75%. Construa uma rua encostada.') // 🚧 vira ícone (uiIconsIn);
    await expect(panel).toContainText('75%');

    // Rua encostada (ao sul): volta a 100%, ícone some, produção sobe, painel atualiza sozinho
    const roadId = await page.evaluate(p => window.gameManager.buildingSystem.placeBuilding(p.x, p.z - 1, 'paved_road').id, pump);
    await expect.poll(async () => (await state()).efficiency).toBeCloseTo(1);
    const after = await state();
    expect(after.noRoad).toBe(false);
    expect(after.icon).toBe(false);
    expect(after.production).toBeGreaterThan(before.production);
    await expect(panel.locator('.no-road-warning')).toHaveCount(0);

    // Rua demolida: volta o aviso; prédio demolido: o ícone sai junto
    await page.evaluate(id => window.gameManager.buildingSystem.removeBuilding(id), roadId);
    await expect.poll(async () => (await state()).icon).toBe(true);
    const iconName = `noRoadIcon_${pump.id}`;
    await page.evaluate(id => window.gameManager.buildingSystem.removeBuilding(id), pump.id);
    expect(await page.evaluate(name => !!window.gameManager.scene.getMeshByName(name), iconName)).toBe(false);
    expect(problems).toEqual([]);
});

test('zona consome energia pela fase e aparece no painel de energia e no da zona', async ({ page }, testInfo) => {
    const problems = watchErrors(page);
    await ready(page);
    const zone = await buildNear(page, 'zone_commercial_light');
    const info = () => page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem, b = bs.buildings.get(id);
        return { consumption: gm.resourceManager.resources.electricity.consumption, mine: bs.getBuildingPowerConsumption(b), full: b.config.powerConsumption };
    }, zone.id);
    const stage0 = await info();
    expect(stage0.full).toBeGreaterThan(0);
    expect(stage0.mine).toBeCloseTo(stage0.full * 0.25);
    expect(stage0.consumption).toBeCloseTo(stage0.mine);

    await page.evaluate(id => window.gameManager.buildingSystem.forceZoneStage(id, 3), zone.id);
    const stage3 = await info();
    expect(stage3.consumption).toBeCloseTo(stage3.full);

    // Sem nenhuma usina: a zona rende metade (e sem rua, 75% disso), com o aviso de energia no painel
    await page.evaluate(() => window.gameManager.buildingSystem.updateAllBuildingEfficiency());
    expect(await page.evaluate(id => window.gameManager.buildingSystem.buildings.get(id).efficiency, zone.id)).toBeCloseTo(0.38);
    await page.evaluate(id => {
        const gm = window.gameManager;
        gm.selectBuilding(gm.buildingSystem.buildings.get(id));
    }, zone.id);
    const panel = page.locator('#details-content');
    await expect(panel.locator('.power-consumption')).toContainText(`${stage3.full} MW`);
    await expect(panel.locator('.zone-energy-warning')).toContainText('Falta energia');
    await expect(panel.locator('.no-road-warning')).toBeVisible();

    // Painel/modal de energia lista a zona entre os consumidores
    await page.evaluate(() => window.gameManager.uiManager.showEnergyDetailsPanel());
    await expect(panel).toContainText('Consumidores de Energia');
    await expect(panel).toContainText('Zona Comercial Leve');
    if (testInfo.project.name === 'desktop') await expect(panel).toBeVisible();
    expect(problems).toEqual([]);
});
