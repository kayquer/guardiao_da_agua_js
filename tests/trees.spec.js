const { test, expect } = require('@playwright/test');
const { startGame, TEST_PROFILE } = require('./helpers');

// Árvores: plantar uma "Muda de Árvore" (js/systems/building/TreeGrowth.js) — 4 etapas pelo tempo de jogo,
// água só na muda e redução de poluição depois, entrando nos números do ResourceManager — e selecionar
// árvores nativas (TreeSystem.selectAt) e plantadas (painel com etapa, barra e tempo até a próxima).

function collectErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    return errors;
}

/** Planta uma muda perto da área inicial (sem mexer no desbloqueio: ela já vem liberada) e devolve o id. */
async function plantSapling(page) {
    const id = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.resourceManager.resources.budget.current = 1e6;
        bs.buildingCooldown.active = false;
        const a = gm.gridManager.startArea || { x: 16, z: 16 };
        const spots = [];
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) spots.push([x, z]);
        spots.sort((p, q) => Math.hypot(p[0] - a.x - 2, p[1] - a.z - 2) - Math.hypot(q[0] - a.x - 2, q[1] - a.z - 2));
        const spot = spots.find(([x, z]) => bs.canPlaceBuilding(x, z, 'tree_sapling').canPlace);
        const b = spot && bs.placeBuilding(spot[0], spot[1], 'tree_sapling');
        document.querySelector('.central-alert-overlay')?.remove();
        return b ? b.id : null;
    });
    expect(id).toBeTruthy();
    return id;
}

/** Estado da árvore plantada + números do ResourceManager. */
function treeState(page, id) {
    return page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem, rm = gm.resourceManager;
        const b = bs.buildings.get(id);
        const crown = b.treeMesh;
        return {
            underConstruction: b.underConstruction,
            stage: bs.getTreeStage(b),
            water: rm.resources.water.buildingConsumption || 0,
            reduction: rm.resources.pollution.reduction,
            crownInstance: !!crown && crown.getClassName() === 'InstancedMesh' && crown.parent === b.mesh && !crown.isDisposed(),
            crownTagged: crown?.metadata?.buildingId === id,
            crownScale: crown ? Math.round(crown.scaling.x * 100) / 100 : 0,
            rootTagged: b.mesh.metadata?.buildingId === id && !!b.mesh.metadata?.plantedTree
        };
    }, id);
}

/**
 * Centra a câmera na árvore e devolve a posição dela na tela (pixels CSS), esperando o ponto ficar livre
 * (avisos/toasts do começo do jogo aparecem no meio da tela e engoliriam o clique).
 */
async function focusAndProject(page, which) {
    const pt = await project(page, which);
    await page.waitForFunction(({ x, y }) => document.elementFromPoint(x, y)?.id === 'game-canvas', pt, { timeout: 20000 });
    return project(page, which);
}

function project(page, which) {
    return page.evaluate(which => {
        const gm = window.gameManager;
        let mesh;
        if (which.native) {
            const a = gm.gridManager.startArea || { x: 20, z: 20 };
            mesh = [...gm.treeSystem.trees.values()].sort((p, q) =>
                Math.hypot(p.metadata.gridX - a.x, p.metadata.gridZ - a.z) - Math.hypot(q.metadata.gridX - a.x, q.metadata.gridZ - a.z))[0];
        } else {
            mesh = gm.buildingSystem.buildings.get(which.id).treeMesh;
        }
        mesh.computeWorldMatrix(true);
        const box = mesh.getBoundingInfo().boundingBox;
        const point = box.centerWorld.clone();
        point.y = box.minimumWorld.y + (box.maximumWorld.y - box.minimumWorld.y) * 0.65;
        gm.cameraControls.targetPosition.copyFrom(point);
        gm.cameraControls.targetRadius = 12;
        gm.camera.setTarget(point);
        gm.camera.radius = 12;
        gm.scene.meshes.filter(m => /(completion|celebration)_/.test(m.name)).forEach(m => m.dispose());
        gm.scene.render();
        const engine = gm.scene.getEngine();
        const screen = BABYLON.Vector3.Project(point, BABYLON.Matrix.Identity(), gm.scene.getTransformMatrix(),
            gm.camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
        const scale = engine.getHardwareScalingLevel();
        const rect = gm.canvas.getBoundingClientRect();
        return { x: rect.left + screen.x * scale, y: rect.top + screen.y * scale, gridX: mesh.metadata.gridX, gridZ: mesh.metadata.gridZ };
    }, which);
}

test('muda de árvore: cresce em 4 etapas, só a muda bebe água, depois limpa o ar; clique, painel e save/load', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'regras e malha não dependem do layout');
    test.setTimeout(150000);
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.buildingSystem.getTreeGrowthConditions = () => ({ waterShortage: false });
    });

    // Liberada sem estudo, no cartão da categoria Natureza
    const card = await page.evaluate(() => {
        const gm = window.gameManager;
        return { unlocked: gm.studySystem.isBuildingUnlocked('tree_sapling'), category: gm.buildingSystem.buildingTypes.get('tree_sapling').category };
    });
    expect(card).toEqual({ unlocked: true, category: 'nature' });

    // Não planta em cima de árvore nativa
    const onNative = await page.evaluate(() => {
        const gm = window.gameManager;
        const tree = gm.treeSystem.trees.values().next().value;
        return gm.buildingSystem.canPlaceBuilding(tree.metadata.gridX, tree.metadata.gridZ, 'tree_sapling').canPlace;
    });
    expect(onNative).toBe(false);

    const before = await page.evaluate(() => {
        const rm = window.gameManager.resourceManager;
        return { water: rm.resources.water.buildingConsumption || 0, reduction: rm.resources.pollution.reduction };
    });
    const id = await plantSapling(page);
    let s = await treeState(page, id);
    expect(s).toMatchObject({ underConstruction: true, stage: null, crownInstance: false, rootTagged: true });
    expect(s.water).toBe(before.water); // em obra: nenhum efeito ainda

    // Obra rápida → etapa 0 (muda): só consome água
    await page.waitForFunction(id => window.gameManager.buildingSystem.getTreeStage(window.gameManager.buildingSystem.buildings.get(id)) === 0, id, { timeout: 15000 });
    const stages = await page.evaluate(() => BUILDING_TYPES.tree_sapling.treeStages);
    s = await treeState(page, id);
    expect(s).toMatchObject({ stage: 0, crownInstance: true, crownTagged: true });
    expect(s.water).toBeCloseTo(before.water + stages[0].waterConsumption, 5);
    expect(s.reduction).toBeCloseTo(before.reduction, 5);

    // Plantada é diferente da nativa: copa de outra cor (modelo próprio) e cova com tutor
    const looks = await page.evaluate(id => {
        const gm = window.gameManager;
        const crown = gm.buildingSystem.buildings.get(id).treeMesh;
        const leaf = m => m.material.subMaterials.find(sub => /Leaf|Pine/.test(sub.name)).diffuseColor.toHexString();
        return {
            plantedLeaf: leaf(crown.sourceMesh),
            nativeLeaves: gm.treeSystem.templates.map(leaf),
            notNativeTemplate: !gm.treeSystem.templates.includes(crown.sourceMesh),
            templateHidden: !crown.sourceMesh.isVisible
        };
    }, id);
    expect(looks.notNativeTemplate).toBe(true);
    expect(looks.templateHidden).toBe(true);
    expect(looks.nativeLeaves).not.toContain(looks.plantedLeaf);

    // Tempo de jogo passa → etapa 1: para de beber água e começa a limpar o ar; a copa cresce
    const scale0 = s.crownScale;
    await page.evaluate(ms => { window.gameManager.gameTime += ms + 1000; }, stages[0].ms);
    await page.waitForFunction(id => window.gameManager.buildingSystem.getTreeStage(window.gameManager.buildingSystem.buildings.get(id)) === 1, id, { timeout: 10000 });
    await page.waitForTimeout(1200); // animação de crescimento
    s = await treeState(page, id);
    expect(s.water).toBeCloseTo(before.water, 5);
    expect(s.reduction).toBeCloseTo(before.reduction + stages[1].pollutionReduction, 5);
    expect(s.crownScale).toBeGreaterThan(scale0);

    // Pausado, não cresce
    const progress = await page.evaluate(id => window.gameManager.buildingSystem.buildings.get(id).treeProgress, id);
    await page.evaluate(() => window.gameManager.pauseGame());
    await page.waitForTimeout(800);
    expect(await page.evaluate(id => window.gameManager.buildingSystem.buildings.get(id).treeProgress, id)).toBe(progress);
    await page.evaluate(() => window.gameManager.resumeGame());

    // Clique na copa seleciona a árvore plantada; painel com etapa, barra e tempo até a próxima
    const pt = await focusAndProject(page, { id });
    await page.mouse.click(pt.x, pt.y);
    await expect.poll(() => page.evaluate(() => window.gameManager.selectedBuilding?.id || null)).toBe(id);
    await expect(page.locator('.stat-item.tree-stage')).toContainText('Etapa: Árvore jovem (2/4)');
    await expect(page.locator(`#tree-stage-bar-${id}`)).toBeAttached();
    await expect(page.locator(`#tree-stage-eta-${id}`)).toContainText('Próxima etapa em');
    await expect(page.locator('.tree-effect[data-effect="pollution"]')).toContainText('Limpa o ar');
    await expect(page.locator('[data-tree-kind="planted"]')).toBeVisible();

    // Madura: maior redução
    await page.evaluate(id => window.gameManager.buildingSystem.forceTreeStage(id, 3), id);
    s = await treeState(page, id);
    expect(s.stage).toBe(3);
    expect(s.reduction).toBeCloseTo(before.reduction + stages[3].pollutionReduction, 5);
    await expect(page.locator(`#tree-stage-eta-${id}`)).toContainText('madura');

    // Save → recarrega → Continuar: volta madura, sem somar de novo
    await page.evaluate(() => window.gameManager.saveGame());
    const saved = await page.evaluate(pid => JSON.parse(localStorage.getItem(SaveSystem.keyFor(pid))).game.buildings.buildings, TEST_PROFILE.id);
    expect(saved.find(b => b.id === id)).toMatchObject({ treeStage: 3 });
    const reductionSaved = s.reduction;
    await page.goto('/index.html');
    await page.click(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    const dialog = page.locator('.swal2-popup.game-swal');
    await expect(dialog).toBeVisible();
    await dialog.locator('.swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'playing', null, { timeout: 45000 });
    s = await treeState(page, id);
    expect(s).toMatchObject({ stage: 3, crownInstance: true, crownTagged: true, rootTagged: true });
    expect(s.reduction).toBeCloseTo(reductionSaved, 5);

    // Remover tira exatamente a redução da etapa e descarta a copa, nunca o modelo-base
    const removed = await page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        const crown = bs.buildings.get(id).treeMesh;
        const template = crown.sourceMesh;
        const red = gm.resourceManager.resources.pollution.reduction;
        bs.removeBuilding(id);
        while (bs.disposalQueue.length) bs.performDisposal(bs.disposalQueue.shift());
        return { delta: red - gm.resourceManager.resources.pollution.reduction, crownGone: crown.isDisposed(), templateKept: !template.isDisposed() };
    }, id);
    expect(removed.delta).toBeCloseTo(stages[3].pollutionReduction, 5);
    expect(removed).toMatchObject({ crownGone: true, templateKept: true });
    expect(errors).toEqual([]);
});

test('árvore nativa: clicar/tocar seleciona, mostra o painel (limpa o ar, construir derruba) e desselecionar limpa o anel', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    const pt = await focusAndProject(page, { native: true });
    if (testInfo.project.name === 'mobile') await page.touchscreen.tap(pt.x, pt.y);
    else await page.mouse.click(pt.x, pt.y);

    const panel = page.locator('#native-tree-info');
    await expect(panel).toBeAttached();
    await expect(panel).toContainText('Árvore nativa');
    await expect(panel.locator('.tree-effect[data-effect="pollution"]')).toContainText('Limpa o ar');
    await expect(panel.locator('.tree-warning')).toContainText('Construir em cima derruba');
    const sel = await page.evaluate(() => {
        const ts = window.gameManager.treeSystem;
        return { selected: !!ts.selectedTree?.metadata?.tree, ring: !!ts.selectionRing && !ts.selectionRing.isDisposed(), building: window.gameManager.selectedBuilding };
    });
    expect(sel).toEqual({ selected: true, ring: true, building: null });

    // Desselecionar (Esc no desktop; o botão do painel no celular) tira o anel e fecha o painel
    if (testInfo.project.name === 'mobile') {
        await page.evaluate(() => document.querySelector('#native-tree-info .deselect-btn').click());
    } else {
        await page.keyboard.press('Escape');
    }
    await expect.poll(() => page.evaluate(() => !window.gameManager.treeSystem.selectionRing)).toBe(true);
    expect(errors).toEqual([]);
});
