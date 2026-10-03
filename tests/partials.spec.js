const { test, expect } = require('@playwright/test');

// Cada arquivo parcial (mixin em js/core/game, js/systems/building, js/systems/ui) é exercitado
// pelo menos uma vez. O smoke cobre o fluxo principal; aqui entram os painéis que ele não abre.
// Mesmo critério do smoke: qualquer erro de JS, console.error ou diálogo nativo reprova.
test('arquivos parciais funcionam sem erros', async ({ page }, testInfo) => {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('dialog', d => { problems.push(`diálogo nativo: ${d.message()}`); d.dismiss(); });

    await page.goto('/index.html');
    await page.click('#btn-new-game');
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });

    // building/BuildingMeshes + BuildingFeedback: obra até o fim (celebração, rótulo) e alerta de energia
    const buildingId = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (bs.canPlaceBuilding(x, z, 'water_pump').canPlace) return bs.placeBuilding(x, z, 'water_pump').id;
        }
    });
    expect(buildingId).toBeTruthy();
    // Sem geração e com 20 kW de consumo, a eficiência é 0% já no alerta pós-construção
    // (antes lia o valor do tick anterior e dizia 100%)
    const alert = page.locator('.central-alert-card');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('apenas 0% de eficiência');
    await page.evaluate(() => document.querySelector('.central-alert-overlay')?.remove());
    await page.waitForFunction(id => {
        const b = window.gameManager.buildingSystem.buildings.get(id);
        return b && !b.underConstruction;
    }, buildingId, { timeout: 20000 });

    await page.evaluate(id => {
        const gm = window.gameManager, ui = gm.uiManager;
        const building = gm.buildingSystem.buildings.get(id);

        // core/game/SelectionVisuals: seleção + overlay de construção
        gm.selectBuilding(building);
        gm.deselectBuilding();
        gm.enterBuildMode('water_well');
        gm.exitBuildMode();

        // core/game/CameraGuard
        gm.validateCameraStateWithBreaker();
        gm.getCameraState();

        // core/game/Diagnostics (o monitoramento roda no loop; aqui a leitura direta)
        gm.getMemoryInfo();

        // ui/MissionUI
        const qs = gm.questSystem;
        qs.openMissionInterface();
        for (const f of ['active', 'completed', 'locked', 'all']) qs.setMissionFilter(f);
        qs.showMissionDetails([...qs.quests.keys()][0]);
        qs.closeMissionInterface();

        // ui/LoanUI
        ui.showLoanInterface();
        ui.calculateLoanPreview();
        ui.closeLoanInterface();

        // ui/ResourcePanels
        for (const t of ['water', 'budget', 'energy', 'satisfaction']) ui.showResourcePanel(t);
        ui.closeResourcePanel();
        ui.showPopulationDetailsPanel();
        ui.showPollutionDetailsPanel();

        // ui/StudyBookUI
        ui.openStudyBook('water_pump');
    }, buildingId);
    await expect(page.locator('.swal2-popup')).toHaveCount(0);

    // ui/MobilePanels + ui/MobileTouch (só fazem algo com isMobile)
    if (testInfo.project.name === 'mobile') {
        await page.evaluate(() => {
            const ui = window.gameManager.uiManager;
            ui.toggleMobilePanel('left');
            ui.closeAllMobilePanels();
            ui.toggleMobileBottomHud();
            ui.showTouchHoldInfo(200, 300);
            ui.hideTouchHoldInfo();
        });
    }

    // Deixar animações e timers (celebração, rótulos, partículas) rodarem
    await page.waitForTimeout(3000);
    expect(problems).toEqual([]);
});

// Dados de js/data/buildings.js: todo prédio visível acha lugar no mapa, é construído e ganha mesh.
// Pegou 9 prédios com size {width, height} que o grid (só quadrados) não sabia ocupar.
test('todo prédio visível pode ser construído', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });

    await page.goto('/index.html');
    await page.click('#btn-new-game');
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });

    const failures = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        bs.maxSimultaneousConstructions = Infinity;
        const failed = [];
        for (const [id, type] of bs.buildingTypes) {
            if (!type.visible) continue;
            gm.resourceManager.resources.budget.current = 1e9;
            bs.buildingCooldown.active = false;
            let spot = null;
            for (let x = 0; x < 40 && !spot; x++) for (let z = 0; z < 40 && !spot; z++) {
                if (bs.canPlaceBuilding(x, z, id).canPlace) spot = [x, z];
            }
            if (!spot) { failed.push(`${id}: nenhum lugar válido`); continue; }
            const b = bs.placeBuilding(spot[0], spot[1], id);
            if (!b) failed.push(`${id}: placeBuilding retornou null`);
            else if (!b.mesh || b.mesh.isDisposed()) failed.push(`${id}: sem mesh`);
        }
        return failed;
    });
    expect(failures).toEqual([]);
    expect(problems).toEqual([]);
});
