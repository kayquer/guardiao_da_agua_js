const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Cada arquivo parcial (mixin em js/core/game, js/systems/building, js/systems/ui) é exercitado
// pelo menos uma vez. O smoke cobre o fluxo principal; aqui entram os painéis que ele não abre.
// Mesmo critério do smoke: qualquer erro de JS, console.error ou diálogo nativo reprova.
test('arquivos parciais funcionam sem erros', async ({ page }, testInfo) => {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('dialog', d => { problems.push(`diálogo nativo: ${d.message()}`); d.dismiss(); });

    await startGame(page);
    // O jogo fica congelado até o tutorial acabar (o fluxo dele tem teste próprio no smoke)
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

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

        // roads/RoadPlacement + RoadMeshes: prévia do traçado e uma rua instantânea com peças encaixadas
        const bs = gm.buildingSystem, s = gm.gridManager.startArea;
        gm.enterBuildMode('paved_road');
        bs.updateRoadPreview(s.x, s.z);
        bs.showRoadLinePreview({ x: s.x, z: s.z }, { x: s.x + 3, z: s.z });
        gm.exitBuildMode();
        bs.placeRoadLine(RoadNetwork.linePath(s.x, s.z + 7, s.x + 2, s.z + 7), 'dirt_road');

        // building/ZoneGrowth (o fluxo completo está em tests/zones.spec.js): ritmo e regra de quem é zona
        gm.buildingSystem.computeZoneGrowthRate(gm.buildingSystem.getZoneGrowthConditions());
        gm.buildingSystem.getEffectivePopulationCapacity(building);
        gm.buildingSystem.updateZoneGrowth();

        // building/BuildingEfficiency (o fluxo completo está em tests/efficiency.spec.js): rua, energia, aviso
        gm.buildingSystem.updateAllBuildingEfficiency();
        gm.buildingSystem.generateEfficiencyWarnings(building);

        // building/TreeGrowth + ui/TreeInfoUI (o fluxo completo está em tests/trees.spec.js)
        gm.buildingSystem.updateTreeGrowth();
        gm.uiManager.generatePlantedTreeStats(building);
        gm.uiManager.plantedTreesLine();

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

        // ui/WeatherUI: popup do clima (a previsão vem do mock em tests/helpers.js)
        ui.showWeatherModal();
        ui.closeWeatherModal();

        // ui/LessonBookUI: central de aulas → livro → vira a página → volta
        ui.openLessonsHub();
        ui.openLessonBook(1, { fromHub: true });
        ui.turnLessonPage(1);
        ui.closeLessonBook();
        ui.closeLessonsHub();

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

    await startGame(page);
    // O jogo fica congelado até o tutorial acabar (o fluxo dele tem teste próprio no smoke)
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

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

// ui/StudyBookUI: a folha vira (mesmas keyframes do livro do tutorial) para frente/trás e na revisão
// do quiz; a abertura usa só o bookOpen. Cliques rápidos não travam nem pulam páginas.
test('livro de estudo vira a página', async ({ page }, testInfo) => {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });

    await startGame(page);
    // monitoring_station: estudo com quiz habilitado (o da bomba não tem)
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await page.waitForFunction(() => window.gameManager.studySystem.contentLoaded);
    await page.evaluate(() => window.gameManager.uiManager.openStudyBook('monitoring_station'));

    const container = page.locator('.study-book-container');
    const content = page.locator('.study-book .book-content');
    await expect(container).not.toHaveClass(/is-turning/); // abertura: livro abrindo, sem folha
    await expect(content).not.toHaveClass(/turn-in/);

    await page.locator('.study-book .next-btn').click();
    await expect(content).toHaveClass(/turn-in-next/);
    await expect(container).toHaveClass(/is-turning/);
    await expect(page.locator('.page-number')).toContainText('Página 2');
    // Congela a animação no meio para a foto (conferência visual)
    await page.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 160; }));
    const shot = testInfo.outputPath('folha-virando.png');
    await page.screenshot({ path: shot });
    await testInfo.attach('folha-virando', { path: shot, contentType: 'image/png' });
    await page.evaluate(() => document.getAnimations().forEach(a => a.play()));

    await page.locator('.study-book .prev-btn').click();
    await expect(content).toHaveClass(/turn-in-prev/);
    await expect(page.locator('.page-number')).toContainText('Página 1');

    // Cliques rápidos: cada clique avança exatamente uma página
    const total = await page.evaluate(() => window.gameManager.studySystem.getStudyContent('monitoring_station').pages.length);
    for (let i = 1; i < total; i++) await page.locator('.study-book .next-btn').click();
    await expect(page.locator('.page-number')).toContainText(`Página ${total} de ${total}`);
    await expect(page.locator('.quiz-container')).toBeVisible();

    // Reprovar → a revisão entra virando a folha; "Tentar de novo" volta a folha para o quiz
    await page.evaluate(() => {
        const ss = window.gameManager.studySystem;
        ss.getQuiz().questions.forEach((q, i) => ss.submitQuizAnswer(q.id ?? i, (q.correctAnswer + 1) % q.options.length));
        window.gameManager.uiManager.completeStudy();
    });
    await expect(page.locator('.quiz-review')).toBeVisible();
    await expect(content).toHaveClass(/turn-in-next/);
    await page.locator('.quiz-review-actions .retry-btn').click();
    await expect(page.locator('.study-book .book-content')).toHaveClass(/turn-in-prev/);
    await expect(page.locator('.quiz-review')).toHaveCount(0);

    expect(problems).toEqual([]);
});
