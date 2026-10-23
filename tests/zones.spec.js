const { test, expect } = require('@playwright/test');
const { startGame, TEST_PROFILE } = require('./helpers');

const ZONE_GROWTH_ANIM_MS = 1500; // peças novas sobem do chão em ZONE_GROWTH.growMs (+ atraso por peça)

// Zonas que crescem (js/data/zoneLots.js + js/systems/building/ZoneGrowth.js): canteiro padrão → fase 0
// (área livre) → 1 → 2 → 3 pelo tempo de jogo, peças como instâncias filhas da laje do lote, seleção,
// painel com a fase e save/load mantendo a fase.

function collectErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    return errors;
}

/** Coloca a zona perto da área inicial e termina a obra; devolve o id. */
async function placeZone(page, typeId) {
    const id = await page.evaluate(typeId => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 1e9;
        bs.buildingCooldown.active = false;
        const a = gm.gridManager.startArea || { x: 16, z: 16 };
        const spots = [];
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) spots.push([x, z]);
        spots.sort((p, q) => Math.hypot(p[0] - a.x - 4, p[1] - a.z - 4) - Math.hypot(q[0] - a.x - 4, q[1] - a.z - 4));
        const spot = spots.find(([x, z]) => bs.canPlaceBuilding(x, z, typeId).canPlace);
        const b = spot && bs.placeBuilding(spot[0], spot[1], typeId);
        document.querySelector('.central-alert-overlay')?.remove();
        return b ? b.id : null;
    }, typeId);
    expect(id).toBeTruthy();
    return id;
}

/** Estado da zona: fase, peças (instâncias filhas da laje) e se tudo leva o buildingId. */
function zoneState(page, id) {
    return page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        const b = bs.buildings.get(id);
        const pieces = b.zonePieces || [];
        return {
            underConstruction: b.underConstruction,
            stage: bs.getZoneStage(b),
            expected: b.underConstruction ? 0 : ZONE_LOTS[b.type].stages[bs.getZoneStage(b)].length,
            pieces: pieces.length,
            files: pieces.map(p => p.key.split('|')[0]).sort(),
            allInstances: pieces.every(p => p.node.getClassName() === 'InstancedMesh' && p.node.parent === b.mesh && !p.node.isDisposed()),
            allTagged: pieces.every(p => p.node.metadata?.buildingId === id),
            lotTagged: b.mesh.metadata?.buildingId === id && !!b.mesh.metadata?.zoneLot,
            lotInScene: gm.scene.meshes.includes(b.mesh) && !b.mesh.isDisposed()
        };
    }, id);
}

/** Clica (handleBuildingSelection, como o jogo) no topo da peça mais alta do lote; devolve o id selecionado. */
function clickTallestPiece(page, id) {
    return page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        const b = bs.buildings.get(id);
        const tallest = b.zonePieces.map(p => p.node).sort((p, q) => q.getBoundingInfo().boundingBox.maximumWorld.y - p.getBoundingInfo().boundingBox.maximumWorld.y)[0];
        const box = tallest.getBoundingInfo().boundingBox;
        const point = box.centerWorld.clone();
        point.y = box.minimumWorld.y + (box.maximumWorld.y - box.minimumWorld.y) * 0.7;
        gm.cameraControls.targetPosition.copyFrom(point);
        gm.cameraControls.targetRadius = 14;
        gm.camera.setTarget(point);
        gm.camera.radius = 14;
        gm.scene.meshes.filter(m => /(completion|celebration)_/.test(m.name)).forEach(m => m.dispose());
        gm.scene.render();
        const engine = gm.scene.getEngine();
        const screen = BABYLON.Vector3.Project(point, BABYLON.Matrix.Identity(), gm.scene.getTransformMatrix(),
            gm.camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
        // Project dá pixels de render; o clique é em pixels da tela (qualidade gráfica baixa/média renderiza menos)
        const scale = engine.getHardwareScalingLevel();
        const hit = gm.pickBuildingFirst(screen.x * scale, screen.y * scale);
        gm.selectedBuilding = null;
        gm.handleBuildingSelection(screen.x * scale, screen.y * scale);
        return { selected: gm.selectedBuilding?.id || null, pickedPiece: !!hit?.pickedMesh?.metadata?.zonePiece };
    }, id);
}

const waitPieces = (page, id) => page.waitForFunction(id => {
    const bs = window.gameManager.buildingSystem;
    const b = bs.buildings.get(id);
    const stage = bs.getZoneStage(b);
    return stage !== null && !bs.hasPendingBuildingModels() && (b.zonePieces || []).length === ZONE_LOTS[b.type].stages[stage].length;
}, id, { timeout: 20000 });

test('zona: canteiro → área livre → cresce pelo tempo de jogo, troca as peças, seleção e painel; save/load mantém a fase', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'regras e malha não dependem do layout');
    test.setTimeout(150000);
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        // Cidade "saudável" para o ritmo ser previsível (1×): sem falta de água/energia, satisfação 50
        gm.buildingSystem.getZoneGrowthConditions = () => ({ satisfaction: 50, waterShortage: false, energyEfficiency: 1 });
    });

    const id = await placeZone(page, 'zone_commercial_light');
    // Em obra: canteiro padrão, sem fase nem peças
    let s = await zoneState(page, id);
    expect(s).toMatchObject({ underConstruction: true, stage: null, pieces: 0, lotTagged: true });

    await page.evaluate(id => { window.gameManager.buildingSystem.buildings.get(id).constructionDuration = 1; }, id);
    await waitPieces(page, id);
    s = await zoneState(page, id);
    expect(s).toMatchObject({ underConstruction: false, stage: 0, allInstances: true, allTagged: true, lotTagged: true, lotInScene: true });
    expect(s.pieces).toBe(s.expected);
    expect(s.files.every(f => f.startsWith('prop:'))).toBe(true); // área livre: só estacas/obra

    // Avança o relógio do jogo (gameTime) uma fase inteira → fase 1, com prédio de verdade (.glb)
    const stageMs = await page.evaluate(() => ZONE_GROWTH.stageMs);
    await page.evaluate(ms => { window.gameManager.gameTime += ms + 1000; }, stageMs[0]);
    await page.waitForFunction(id => window.gameManager.buildingSystem.getZoneStage(window.gameManager.buildingSystem.buildings.get(id)) === 1, id, { timeout: 10000 });
    await waitPieces(page, id);
    s = await zoneState(page, id);
    expect(s).toMatchObject({ stage: 1, allInstances: true, allTagged: true });
    expect(s.files.some(f => f.endsWith('.glb'))).toBe(true);

    // Pausado, o tempo não passa e a zona não cresce
    await page.evaluate(() => window.gameManager.pauseGame());
    await page.waitForTimeout(800);
    expect((await zoneState(page, id)).stage).toBe(1);
    await page.evaluate(() => window.gameManager.resumeGame());

    // Fases 2 e 3 (método de debug) trocam as peças; os modelos-base são compartilhados
    for (const stage of [2, 3]) {
        await page.evaluate(({ id, stage }) => window.gameManager.buildingSystem.forceZoneStage(id, stage), { id, stage });
        await waitPieces(page, id);
        s = await zoneState(page, id);
        expect(s).toMatchObject({ stage, allInstances: true, allTagged: true, lotInScene: true });
        expect(s.pieces).toBe(s.expected);
    }
    const shared = await page.evaluate(id => {
        const bs = window.gameManager.buildingSystem;
        const nodes = bs.buildings.get(id).zonePieces.map(p => p.node);
        const sources = nodes.map(n => n.sourceMesh);
        return {
            templatesHidden: sources.every(t => !t.isVisible && !t.isPickable),
            sameSourceForSameFile: nodes.filter(n => n.sourceMesh.name.endsWith('building-c.glb')).every((n, _, all) => n.sourceMesh === all[0].sourceMesh),
            fullScale: bs.getZoneEffectScale(bs.buildings.get(id))
        };
    }, id);
    expect(shared).toEqual({ templatesHidden: true, sameSourceForSameFile: true, fullScale: 1 });

    // Seleção: clicar numa peça (instância) seleciona a zona; o painel mostra a fase
    await page.waitForTimeout(ZONE_GROWTH_ANIM_MS);
    const click = await clickTallestPiece(page, id);
    expect(click).toEqual({ selected: id, pickedPiece: true });
    await expect(page.locator('.stat-item.zone-stage')).toContainText('Fase: Completa');

    // Save → recarrega → Continuar: a zona volta na fase 3 com as peças
    await page.evaluate(() => window.gameManager.saveGame());
    const saved = await page.evaluate(pid => JSON.parse(localStorage.getItem(SaveSystem.keyFor(pid))).game.buildings.buildings, TEST_PROFILE.id);
    expect(saved.find(b => b.id === id)).toMatchObject({ zoneStage: 3 });
    await page.goto('/index.html');
    await page.click(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    const dialog = page.locator('.swal2-popup.game-swal');
    await expect(dialog).toBeVisible();
    await dialog.locator('.swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'playing', null, { timeout: 45000 });
    await waitPieces(page, id);
    s = await zoneState(page, id);
    expect(s).toMatchObject({ underConstruction: false, stage: 3, allInstances: true, allTagged: true, lotTagged: true, lotInScene: true });
    expect(s.pieces).toBe(s.expected);
    await page.waitForTimeout(ZONE_GROWTH_ANIM_MS);
    expect((await clickTallestPiece(page, id)).selected).toBe(id);

    // Remover a zona descarta as peças, nunca os modelos-base
    const removed = await page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        const nodes = bs.buildings.get(id).zonePieces.map(p => p.node);
        const templates = nodes.map(n => n.sourceMesh);
        bs.removeBuilding(id);
        while (bs.disposalQueue.length) bs.performDisposal(bs.disposalQueue.shift());
        return { piecesGone: nodes.every(n => n.isDisposed()), templatesKept: templates.every(t => !t.isDisposed()) };
    }, id);
    expect(removed).toEqual({ piecesGone: true, templatesKept: true });
    expect(errors).toEqual([]);
});
