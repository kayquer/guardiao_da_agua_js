const { test, expect } = require('@playwright/test');
const { startGame, TEST_PROFILE } = require('./helpers');

// Categoria 🛣️ Asfalto: ruas instantâneas e baratas, traçadas arrastando, com auto-encaixe
// (js/systems/roads/RoadNetwork.js → peças de RoadMeshes.js) e trânsito (CityLifeSystem) a partir de 20 blocos.
function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('dialog', d => {
        if (d.type() !== 'beforeunload') problems.push(`diálogo nativo: ${d.message()}`);
        d.type() === 'beforeunload' ? d.accept() : d.dismiss();
    });
    return problems;
}

/** Retângulo W×H livre para rua asfaltada, o mais perto do centro do mapa; centraliza a câmera nele. */
const findFreeArea = (page, w, h) => page.evaluate(([W, H]) => {
    const gm = window.gameManager, bs = gm.buildingSystem;
    let best = null, bestDist = Infinity;
    for (let x = 0; x + W <= 40; x++) for (let z = 0; z + H <= 40; z++) {
        let ok = true;
        for (let dx = 0; dx < W && ok; dx++) for (let dz = 0; dz < H && ok; dz++) ok = bs.canPlaceRoadAt(x + dx, z + dz, 'paved_road').ok;
        const dist = Math.hypot(x + W / 2 - 20, z + H / 2 - 20);
        if (ok && dist < bestDist) { bestDist = dist; best = [x, z]; }
    }
    const c = gm.gridManager.gridToWorld(best[0] + W / 2, best[1] + H / 2);
    gm.cameraControls.centerCameraOn(c.x, c.z, 18);
    return best;
}, [w, h]);

/** Ponto da tela (coordenadas do cliente) no centro do topo do bloco da célula. */
const cellToScreen = (page, x, z) => page.evaluate(([x, z]) => {
    const gm = window.gameManager, scene = gm.scene, engine = scene.getEngine();
    const w = gm.gridManager.gridToWorld(x, z);
    const v = BABYLON.Vector3.Project(new BABYLON.Vector3(w.x, gm.gridManager.getTerrainBlockHeight(x, z), w.z),
        BABYLON.Matrix.Identity(), scene.getTransformMatrix(),
        gm.camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
    const rect = gm.canvas.getBoundingClientRect();
    const sx = rect.left + v.x * rect.width / engine.getRenderWidth();
    const sy = rect.top + v.y * rect.height / engine.getRenderHeight();
    // Célula que o jogo enxerga nesse ponto (o pick acerta o que está desenhado)
    const cell = gm.pickTerrainCell(sx - rect.left, sy - rect.top);
    return { x: sx, y: sy, cell };
}, [x, z]);

const roadCount = page => page.evaluate(() => window.gameManager.buildingSystem.getAllBuildings().filter(b => b.config.roadType).length);
const pieceAt = (page, x, z) => page.evaluate(([x, z]) => window.gameManager.buildingSystem.getBuildingAt(x, z)?.mesh?.metadata?.roadPiece, [x, z]);

test('Asfalto: categoria visível, arrastar traça a rua na hora e cobra pouco', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'arrasto com mouse: desktop');
    test.setTimeout(180000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    const category = page.locator('.category-btn[data-category="roads"]');
    await expect(category).toBeVisible();
    await expect(category).toContainText('Asfalto');
    await expect(category.locator('img[src$="cat-roads.svg"]')).toBeVisible();
    await expect(page.locator('.category-btn[data-category="infrastructure"]')).toBeHidden();
    await category.click();
    const item = page.locator('.building-item[data-building-type="paved_road"]');
    await expect(item).toBeVisible();
    await expect(item).toContainText('R$ 40');
    await expect(page.locator('.building-item[data-building-type="dirt_road"]')).toContainText('R$ 20');

    const [ox, oz] = await findFreeArea(page, 6, 1);
    await page.waitForTimeout(2500); // câmera suave chegando
    await item.click();
    expect(await page.evaluate(() => window.gameManager.buildMode)).toBe(true);

    const a = await cellToScreen(page, ox, oz);
    const b = await cellToScreen(page, ox + 5, oz);
    // Simulação parada (pausa leve): só a obra mexe no dinheiro, não a receita/manutenção do minuto
    await page.evaluate(() => window.gameManager.holdPause('teste'));
    const budgetBefore = await page.evaluate(() => window.gameManager.resourceManager.resources.budget.current);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + (b.x - a.x) * i / 10, a.y + (b.y - a.y) * i / 10);
    // Prévia: uma célula por bloco e o custo total
    const preview = await page.evaluate(() => window.gameManager.buildingSystem.lastRoadPlan);
    const feedback = page.locator('#building-placement-feedback');
    await expect(feedback).toContainText('blocos');
    await expect(feedback).toContainText(`R$ ${(preview.count * 40).toLocaleString('pt-BR')}`);
    await page.mouse.up();

    const expected = preview.count;
    expect(expected).toBeGreaterThanOrEqual(4);
    expect(await roadCount(page)).toBe(expected);
    const state = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        const roads = bs.getAllBuildings().filter(b => b.config.roadType);
        return {
            budget: gm.resourceManager.resources.budget.current,
            underConstruction: roads.filter(b => b.underConstruction || !b.active).length,
            queue: bs.constructionQueue.size,
            buildMode: gm.buildMode,
            cooldown: bs.buildingCooldown.active,
            pieces: roads.map(b => b.mesh.metadata.roadPiece).sort(),
            sameRow: new Set(roads.map(b => b.gridZ)).size === 1 || new Set(roads.map(b => b.gridX)).size === 1,
            pickable: roads.every(b => b.mesh.metadata.buildingId === b.id && b.mesh.isPickable)
        };
    });
    expect(budgetBefore - state.budget).toBe(expected * 40); // barato
    expect(state.underConstruction).toBe(0);                  // pronta na hora, sem canteiro de obras
    expect(state.queue).toBe(0);
    expect(state.cooldown).toBe(false);
    expect(state.buildMode).toBe(true);                        // continua traçando a próxima rua
    await page.evaluate(() => window.gameManager.releasePause('teste'));
    expect(state.sameRow).toBe(true);
    expect(state.pickable).toBe(true);
    expect(state.pieces.filter(p => p === 'ponta')).toHaveLength(2);
    expect(state.pieces.filter(p => p === 'reta')).toHaveLength(expected - 2);

    // Clique simples: um bloco só (ao lado da linha, numa célula livre)
    const single = await cellToScreen(page, ox, oz - 1 >= 0 ? oz - 1 : oz + 1);
    const singleFree = await page.evaluate(c => c && window.gameManager.buildingSystem.canPlaceRoadAt(c.x, c.z, 'paved_road').ok, single.cell);
    if (singleFree) {
        await page.mouse.click(single.x, single.y);
        await expect.poll(() => roadCount(page)).toBe(expected + 1);
    }

    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.gameManager.buildMode)).toBe(false);
    expect(problems).toEqual([]);
});

test('Asfalto: curva, T e cruzamento se encaixam; com 20 blocos o trânsito anda; save/load mantém', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    test.setTimeout(150000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    const [ox, oz] = await findFreeArea(page, 10, 8);

    // Traçados (como arrastos): avenida, uma rua que cruza e uma que dobra
    const line = (x0, z0, x1, z1) => page.evaluate(([a, b, c, d]) => {
        const bs = window.gameManager.buildingSystem;
        window.gameManager.resourceManager.resources.budget.current = 100000;
        return bs.placeRoadLine(RoadNetwork.linePath(a, b, c, d), 'paved_road').length;
    }, [ox + x0, oz + z0, ox + x1, oz + z1]);

    expect(await line(0, 0, 8, 0)).toBe(9);
    expect(await line(8, 1, 8, 4)).toBe(4);
    expect(await pieceAt(page, ox + 8, oz)).toBe('curva');     // L: curva de 90°
    expect(await pieceAt(page, ox + 8, oz + 4)).toBe('ponta');
    expect(await page.evaluate(() => window.gameManager.cityLifeSystem.vehicles.length)).toBe(0); // 13 blocos: sem trânsito

    await line(4, 1, 4, 5);
    expect(await pieceAt(page, ox + 4, oz)).toBe('T');         // bifurcação
    await line(2, 3, 3, 3);
    await line(5, 3, 6, 3);
    expect(await pieceAt(page, ox + 4, oz + 3)).toBe('cruzamento');
    expect(await pieceAt(page, ox + 3, oz + 3)).toBe('reta');
    expect(await page.evaluate(() => window.gameManager.cityLifeSystem.getConnectedRoadCount())).toBeGreaterThanOrEqual(20);

    // Sem peças de conexão antigas (createConnectionMesh) entre as ruas
    expect(await page.evaluate(() => [...window.gameManager.buildingSystem.connectionMeshes.keys()].filter(k => k.startsWith('connection_building_')).length)).toBe(0);

    // Trânsito: carros/caminhões aparecem e andam
    await page.waitForFunction(() => window.gameManager.cityLifeSystem.vehicles.length >= 3, null, { timeout: 15000 });
    const pos = () => page.evaluate(() => window.gameManager.cityLifeSystem.vehicles.map(v => [v.mesh.position.x, v.mesh.position.z]));
    const p0 = await pos();
    await page.waitForTimeout(1500);
    const p1 = await pos();
    const moved = p0.filter((p, i) => p1[i] && Math.hypot(p1[i][0] - p[0], p1[i][1] - p[1]) > 0.3).length;
    expect(moved).toBeGreaterThan(0);
    const kinds = await page.evaluate(() => window.gameManager.cityLifeSystem.vehicles.every(v => v.mesh.sourceMesh && ['car', 'truck'].includes(v.kind)));
    expect(kinds).toBe(true);

    // Pausa congela o trânsito
    await page.evaluate(() => window.gameManager.pauseGame());
    const paused0 = await pos();
    await page.waitForTimeout(800);
    expect(await pos()).toEqual(paused0);
    await page.evaluate(() => window.gameManager.resumeGame());

    // Demolir: o cruzamento vira T
    await page.evaluate(([x, z]) => {
        const bs = window.gameManager.buildingSystem;
        bs.removeBuilding(bs.getBuildingAt(x, z).id);
    }, [ox + 5, oz + 3]);
    expect(await pieceAt(page, ox + 4, oz + 3)).toBe('T');

    // Save → recarrega → Continuar: ruas, peças e trânsito voltam
    const before = await roadCount(page);
    await page.evaluate(() => window.gameManager.saveGame());
    await page.goto('/index.html');
    await page.click(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    const dialog = page.locator('.swal2-popup.game-swal');
    await expect(dialog).toBeVisible();
    await dialog.locator('.swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'playing', null, { timeout: 45000 });
    expect(await roadCount(page)).toBe(before);
    expect(await pieceAt(page, ox + 8, oz)).toBe('curva');
    expect(await pieceAt(page, ox + 4, oz)).toBe('T');
    expect(await pieceAt(page, ox + 4, oz + 3)).toBe('T');
    expect(await pieceAt(page, ox + 2, oz + 3)).toBe('ponta');
    await page.waitForFunction(() => window.gameManager.cityLifeSystem.vehicles.length >= 3, null, { timeout: 15000 });
    expect(problems).toEqual([]);
});

test('Asfalto: guia das ruas abre na primeira vez e fica na aba Guias', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    test.setTimeout(180000);
    const problems = watchErrors(page);
    // Todos os guias feitos, menos o das ruas
    await startGame(page, { guides: ['energy', 'storage', 'zoning', 'public', 'tourism', 'industrial', 'commercial'] });
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await page.waitForTimeout(3500); // checkGuides espera 3 s depois de um tutorial
    await page.click('.category-btn[data-category="roads"]');
    const container = page.locator('#tutorial-container');
    await expect(container).toBeVisible({ timeout: 5000 });
    await expect(container).toContainText('Hora de abrir ruas');
    expect(await page.evaluate(() => window.gameManager.tutorialSystem.guideId)).toBe('roads');

    // Próximo: o passo pede para traçar uma rua (e libera só as ruas)
    await page.click('#tutorial-next-btn');
    await expect(container).toContainText('Trace uma rua');
    expect(await page.evaluate(() => window.gameManager.tutorialSystem.allowsBuilding('paved_road'))).toBe(true);
    expect(await page.evaluate(() => window.gameManager.tutorialSystem.allowsBuilding('water_pump'))).toBe(false);

    // Uma linha de 3 blocos avança o guia uma vez só
    await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem, s = gm.gridManager.startArea;
        bs.selectedBuildingType = 'paved_road';
        for (let z = s.z; z < s.z + 8; z++) {
            const cells = RoadNetwork.linePath(s.x, z, s.x + 2, z);
            if (cells.every(c => bs.canPlaceRoadAt(c.x, c.z, 'paved_road').ok)) return bs.placeRoadLine(cells, 'paved_road');
        }
    });
    await expect(container).toContainText('Curvas e cruzamentos sozinhos');
    // Enter = Próximo (o card do coach balança com a expressão da Cláudia e o clique esperaria ele parar)
    await page.keyboard.press('Enter');
    await expect(container).toContainText('20 blocos');
    await page.keyboard.press('Enter');
    await expect(container).toContainText('enxurrada');
    await expect(container).toContainText('erosão');
    await page.keyboard.press('Enter');
    await expect(container).toBeHidden();
    expect(await page.evaluate(() => TutorialSystem.guidesDone().includes('roads'))).toBe(true);

    // Livro de aulas → Guias: o guia das ruas está lá (feito) para rever
    await page.evaluate(() => window.gameManager.uiManager.openLessonsHub());
    await page.click('[data-lessons-tab="guides"]');
    const card = page.locator('.replay-card[data-replay="guide"][data-id="roads"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/done/);
    await expect(card).toContainText('Ruas');
    expect(problems).toEqual([]);
});
