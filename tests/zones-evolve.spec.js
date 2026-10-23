const { test, expect } = require('@playwright/test');
const { startGame, TEST_PROFILE } = require('./helpers');

// Zonas (js/systems/building/ZoneGrowth.js): mensagem de falta d'água com os números certos (e sem falso
// alarme com água sobrando) e o botão "Evoluir" na fase final (leve → equilibrada → pesada), que troca o tipo
// sem perder nada, cobra a diferença, cresce para 3 × 3 quando precisa e sobrevive a salvar/carregar.

function collectErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    return errors;
}

async function ready(page) {
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 1e6;
    });
}

/** Põe a zona num lugar livre perto da área inicial (com folga em volta para crescer) e termina a obra. */
async function placeZone(page, typeId, { margin = 0 } = {}) {
    const id = await page.evaluate(({ typeId, margin }) => {
        const gm = window.gameManager, bs = gm.buildingSystem, grid = gm.gridManager;
        bs.buildingCooldown.active = false;
        const a = grid.startArea || { x: 16, z: 16 };
        const size = bs.buildingTypes.get(typeId).size;
        const spots = [];
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) spots.push([x, z]);
        spots.sort((p, q) => Math.hypot(p[0] - a.x - 4, p[1] - a.z - 4) - Math.hypot(q[0] - a.x - 4, q[1] - a.z - 4));
        const roomy = ([x, z]) => grid.canPlaceBuilding(x, z, size + margin) && bs.canPlaceBuilding(x, z, typeId).canPlace;
        const spot = spots.find(roomy);
        const b = spot && bs.placeBuilding(spot[0], spot[1], typeId);
        document.querySelector('.central-alert-overlay')?.remove();
        if (!b) return null;
        bs.completeConstruction(b);
        return b.id;
    }, { typeId, margin });
    expect(id).toBeTruthy();
    return id;
}

const waitPieces = (page, id) => page.waitForFunction(id => {
    const bs = window.gameManager.buildingSystem;
    const b = bs.buildings.get(id);
    const stage = bs.getZoneStage(b);
    return stage !== null && !bs.hasPendingBuildingModels() && (b.zonePieces || []).length === ZONE_LOTS[b.type].stages[stage].length;
}, id, { timeout: 20000 });

test('zona: com água sobrando não acusa falta; sem água diz quanto falta em L/min', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'regra não depende do layout');
    const errors = collectErrors(page);
    await ready(page);
    const id = await placeZone(page, 'zone_residential_light');
    // Caixa com menos de 10 minutos de consumo, mas a produção cobre o gasto (o bug antigo dizia "falta água")
    await page.evaluate(id => {
        const gm = window.gameManager, w = gm.resourceManager.resources.water;
        w.production = 5000;
        w.current = Math.min(w.storage, 300);
        gm.selectBuilding(gm.buildingSystem.buildings.get(id));
    }, id);
    const eta = page.locator(`#zone-stage-eta-${id}`);
    await expect(eta).toHaveText(/Próxima fase em/);
    expect(await page.evaluate(() => window.gameManager.resourceManager.hasWaterShortage())).toBe(false);

    // Sem produção e caixa vazia: parada, com consumo × produção e quanto falta
    await page.evaluate(() => {
        window.gameManager.gameOverSystem.update = () => {}; // caixa vazia = fim de jogo; aqui só importa o painel
        const w = window.gameManager.resourceManager.resources.water;
        w.production = 0;
        w.current = 0;
    });
    await expect(eta).toHaveText('Crescimento parado');
    const why = page.locator(`#zone-stage-why-${id}`);
    await expect(why).toContainText('Falta água!');
    await expect(why).toContainText(/gasta [\d.]+ L\/min e só produz 0 L\/min\. Precisa de mais [\d.]+ L\/min/);
    expect(errors).toEqual([]);
});

test('zona na fase final: botão evoluir troca o peso sem perder nada, cobra a diferença e salva', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'regras e malha não dependem do layout');
    test.setTimeout(150000);
    const errors = collectErrors(page);
    await ready(page);
    const id = await placeZone(page, 'zone_residential_light');
    await waitPieces(page, id);

    // Ainda crescendo: sem botão
    await page.evaluate(id => window.gameManager.selectBuilding(window.gameManager.buildingSystem.buildings.get(id)), id);
    await expect(page.locator('.stat-item.zone-stage')).toBeVisible();
    await expect(page.locator(`#zone-evolve-btn-${id}`)).toHaveCount(0);

    // Fase final: botão aparece; sem dinheiro fica desabilitado com o motivo
    await page.evaluate(id => window.gameManager.buildingSystem.forceZoneStage(id, 3), id);
    const button = page.locator(`#zone-evolve-btn-${id}`);
    await expect(button).toContainText('Evoluir para Equilibrada');
    await expect(button).toContainText('R$ 1.000');
    await page.evaluate(() => { window.gameManager.resourceManager.resources.budget.current = 10; });
    await expect(button).toBeDisabled({ timeout: 5000 });
    await expect(page.locator(`#zone-evolve-why-${id}`)).toContainText('Falta dinheiro');
    await page.evaluate(() => { window.gameManager.resourceManager.resources.budget.current = 50000; });
    await expect(button).toBeEnabled({ timeout: 5000 });

    // Clique no botão (o do painel) medindo o dinheiro no mesmo instante: só a diferença de custo sai
    const before = await page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem, b = bs.buildings.get(id);
        const pop = bs.getEffectivePopulationCapacity(b);
        const budget = gm.resourceManager.resources.budget.current;
        document.getElementById(`zone-evolve-btn-${id}`).click();
        return { pop, spent: budget - gm.resourceManager.resources.budget.current };
    }, id);
    expect(before.spent).toBe(1000);
    await waitPieces(page, id);
    const after = await page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem, b = bs.buildings.get(id);
        return {
            type: b.type, stage: bs.getZoneStage(b), progress: b.zoneProgress,
            pop: bs.getEffectivePopulationCapacity(b),
            lotTagged: b.mesh.metadata?.buildingId === id && !!b.mesh.metadata?.zoneLot && !b.mesh.isDisposed(),
            piecesTagged: b.zonePieces.every(p => p.node.metadata?.buildingId === id && p.node.parent === b.mesh),
            label: b.mesh.nameLabel && !b.mesh.nameLabel.isDisposed(),
            selected: gm.selectedBuilding === b
        };
    }, id);
    expect(after).toMatchObject({ type: 'zone_residential_balanced', stage: 1, lotTagged: true, piecesTagged: true, label: true, selected: true });
    expect(after.pop).toBeGreaterThanOrEqual(before.pop);
    expect(after.progress).toBeLessThan(0.2); // recomeça a fase do zero (o jogo segue rodando)
    await expect(page.locator('.stat-item.zone-stage')).toContainText('Início');

    // Pesada não tem botão
    await page.evaluate(id => window.gameManager.buildingSystem.forceZoneStage(id, 3), id);
    await expect(button).toContainText('Evoluir para Pesada');
    await button.click();
    await page.waitForFunction(id => window.gameManager.buildingSystem.buildings.get(id).type === 'zone_residential_heavy', id);
    await page.evaluate(id => window.gameManager.buildingSystem.forceZoneStage(id, 3), id);
    await expect(page.locator('.stat-item.zone-stage')).toContainText('Completa');
    await expect(button).toHaveCount(0);

    // Salvar → recarregar → Continuar: volta como pesada, na fase salva
    await page.evaluate(() => window.gameManager.saveGame());
    await page.goto('/index.html');
    await page.click(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    const dialog = page.locator('.swal2-popup.game-swal');
    await expect(dialog).toBeVisible();
    await dialog.locator('.swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'playing', null, { timeout: 45000 });
    await waitPieces(page, id);
    const loaded = await page.evaluate(id => {
        const bs = window.gameManager.buildingSystem, b = bs.buildings.get(id);
        return { type: b.type, stage: bs.getZoneStage(b) };
    }, id);
    expect(loaded).toEqual({ type: 'zone_residential_heavy', stage: 3 });
    expect(errors).toEqual([]);
});

test('zona industrial equilibrada → pesada cresce para 3 × 3 e começa na fase que não perde empregos', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'regras e malha não dependem do layout');
    const errors = collectErrors(page);
    await ready(page);
    const id = await placeZone(page, 'zone_industrial_balanced', { margin: 1 });
    await page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        bs.forceZoneStage(id, 3);
        gm.selectBuilding(bs.buildings.get(id));
    }, id);
    const button = page.locator(`#zone-evolve-btn-${id}`);
    await expect(button).toBeEnabled();
    const jobsBefore = await page.evaluate(id => window.gameManager.buildingSystem.getEffectiveJobCapacity(window.gameManager.buildingSystem.buildings.get(id)), id);
    await button.click();
    await waitPieces(page, id);
    const r = await page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem, b = bs.buildings.get(id), grid = gm.gridManager;
        let occupied = 0;
        for (let x = b.gridX; x < b.gridX + 3; x++) for (let z = b.gridZ; z < b.gridZ + 3; z++) if (grid.isCellOccupied(x, z)) occupied++;
        return { type: b.type, stage: bs.getZoneStage(b), occupied, size: b.config.size, jobs: bs.getEffectiveJobCapacity({ ...b, efficiency: 1 }) };
    }, id);
    expect(r).toMatchObject({ type: 'zone_industrial_heavy', stage: 2, occupied: 9, size: 3 });
    expect(r.jobs).toBeGreaterThanOrEqual(jobsBefore);
    expect(errors).toEqual([]);
});
