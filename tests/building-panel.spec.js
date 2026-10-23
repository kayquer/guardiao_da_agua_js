const { test, expect } = require('@playwright/test');
const { startGame, TEST_PROFILE } = require('./helpers');

// Prédio selecionado e painel de informações: anel de seleção no topo do bloco, rotação em quartos de volta
// (padrão de frente para a câmera, botões girar, save/load), moradores da zona residencial e o guia de energia.
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

/** Constrói o tipo no primeiro lugar livre (sem árvores) e devolve o id. */
const place = (page, type, { finish = false } = {}) => page.evaluate(({ type, finish }) => {
    const gm = window.gameManager, bs = gm.buildingSystem;
    gm.resourceManager.resources.budget.current = 1e6;
    for (let x = 2; x < 38; x++) for (let z = 2; z < 38; z++) {
        if (gm.treeSystem.countTreesInArea(x, z, bs.buildingTypes.get(type).size || 1)) continue;
        if (!bs.canPlaceBuilding(x, z, type).canPlace) continue;
        bs.buildingCooldown.active = false;
        const b = bs.placeBuilding(x, z, type);
        document.querySelectorAll('.central-alert-overlay').forEach(el => el.remove());
        if (b && finish) bs.completeConstruction(b);
        return b?.id || null;
    }
    return null;
}, { type, finish });

async function begin(page, options) {
    await startGame(page, options);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.studySystem.unlockBuilding('water_pump');
        gm.studySystem.unlockBuilding('water_tank');
        gm.studySystem.unlockBuilding('zone_residential_light');
    });
}

test('anel de seleção, marcador e overlay de construção ficam acima do topo do bloco', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma conta; basta um viewport');
    const problems = watchErrors(page);
    await begin(page);
    const id = await place(page, 'zone_residential_light');
    expect(id).toBeTruthy();

    const ring = await page.evaluate(buildingId => {
        const gm = window.gameManager, bs = gm.buildingSystem, b = bs.buildings.get(buildingId);
        gm.selectBuilding(b);
        const indicator = b.mesh.selectionIndicator;
        const ringMesh = indicator.selectionRing;
        ringMesh.computeWorldMatrix(true);
        let top = 0;
        for (let dx = 0; dx < b.config.size; dx++) for (let dz = 0; dz < b.config.size; dz++) {
            top = Math.max(top, gm.gridManager.getTerrainBlockHeight(b.gridX + dx, b.gridZ + dz));
        }
        return { parentY: indicator.position.y, ringY: ringMesh.getAbsolutePosition().y, top };
    }, id);
    expect(ring.top).toBeGreaterThan(0);
    expect(ring.parentY).toBeCloseTo(ring.top, 5);
    expect(ring.ringY).toBeGreaterThan(ring.top);

    // Overlay de posicionamento: cada célula logo acima do bloco dela (antes: elevação × gridHeight + 0.75)
    const overlay = await page.evaluate(async () => {
        const gm = window.gameManager;
        await gm.createPlacementOverlay('water_pump');
        const bad = gm.placementOverlayMeshes.filter(p => {
            const [, x, z] = p.name.split('_').map(Number);
            const top = gm.gridManager.getTerrainBlockHeight(x, z);
            return p.position.y <= top || p.position.y > top + 0.2;
        }).length;
        const total = gm.placementOverlayMeshes.length;
        gm.clearPlacementOverlay();
        return { bad, total };
    });
    expect(overlay.total).toBeGreaterThan(0);
    expect(overlay.bad).toBe(0);

    // Marcador da prévia: no centro da área e acima do bloco mais alto dela
    const marker = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        bs.startPreviewMode('zone_residential_light');
        for (let x = 2; x < 38; x++) for (let z = 2; z < 38; z++) {
            bs.updatePreview(x, z);
            const top = bs.getBuildingAreaTerrainHeight(x, z, 2);
            const result = { y: bs.previewMarker.position.y, top, meshX: bs.previewMesh.position.x, markerX: bs.previewMarker.position.x };
            bs.stopPreviewMode();
            return result;
        }
    });
    expect(marker.y).toBeGreaterThan(marker.top);
    expect(marker.markerX).toBeCloseTo(marker.meshX, 5);
    expect(problems).toEqual([]);
});

test('rotação: prédio nasce de frente para a câmera, botões giram e a rotação volta do save', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'botões testados no desktop; a regra é a mesma');
    test.setTimeout(120000);
    const problems = watchErrors(page);
    await begin(page);

    // Para vários ângulos de câmera, a fachada (-Z local) aponta para o lado da câmera (±45°)
    // Câmera padrão (diagonal, α = -π/4): rotação 0, que mostra a fachada e o lado +X dos modelos
    expect(await page.evaluate(() => {
        const bs = window.gameManager.buildingSystem, cam = window.gameManager.camera, saved = cam.alpha;
        cam.alpha = -Math.PI / 4;
        const rotation = bs.getDefaultBuildingRotation(bs.buildingTypes.get('water_tank'));
        cam.alpha = saved;
        return rotation;
    })).toBe(0);
    // Tudo no mesmo quadro: a câmera suave mexe no alpha entre um evaluate e outro
    for (const alpha of [-Math.PI / 2, 0, 2.2, Math.PI, -2.6]) {
        const facing = await page.evaluate(alpha => {
            const gm = window.gameManager, cam = gm.camera, bs = gm.buildingSystem;
            cam.alpha = alpha;
            cam.getViewMatrix(true); // recalcula a posição da câmera para este alpha
            const expected = bs.getDefaultBuildingRotation(bs.buildingTypes.get('water_tank'));
            // A prévia mostra a mesma rotação que a obra vai ter
            bs.startPreviewMode('water_tank');
            bs.syncPreviewRotation();
            const previewY = bs.previewMesh.rotation.y;
            bs.stopPreviewMode();
            let b = null;
            for (let x = 2; x < 38 && !b; x++) for (let z = 2; z < 38 && !b; z++) {
                if (gm.treeSystem.countTreesInArea(x, z, 1) || !bs.canPlaceBuilding(x, z, 'water_tank').canPlace) continue;
                bs.buildingCooldown.active = false;
                b = bs.placeBuilding(x, z, 'water_tank');
            }
            document.querySelectorAll('.central-alert-overlay').forEach(el => el.remove());
            const front = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 0, -1), b.mesh.computeWorldMatrix(true));
            const toCam = new BABYLON.Vector3(cam.position.x - cam.target.x, 0, cam.position.z - cam.target.z).normalize();
            front.y = 0;
            front.normalize();
            const result = { expected, previewY, dot: BABYLON.Vector3.Dot(front, toCam), rotation: b.rotation, meshY: b.mesh.rotation.y };
            bs.removeBuilding(b.id); // libera a fila de obras simultâneas
            return result;
        }, alpha);
        expect(facing.rotation).toBe(facing.expected);
        expect(facing.meshY).toBeCloseTo(facing.rotation * Math.PI / 2, 5);
        expect(facing.previewY).toBeCloseTo(facing.rotation * Math.PI / 2, 5);
        expect(facing.dot).toBeGreaterThan(0.7);
    }

    // Botões no painel do prédio selecionado
    const id = await place(page, 'water_tank', { finish: true });
    await page.evaluate(buildingId => {
        const gm = window.gameManager;
        gm.selectBuilding(gm.buildingSystem.buildings.get(buildingId));
    }, id);
    const right = page.locator('.building-actions .rotate-right');
    const left = page.locator('.building-actions .rotate-left');
    await expect(right).toBeVisible();
    await expect(left).toHaveAttribute('aria-label', 'Girar para a esquerda');
    await expect(right.locator('svg.rotate-icon')).toHaveCount(1);
    const rotationOf = () => page.evaluate(buildingId => {
        const b = window.gameManager.buildingSystem.buildings.get(buildingId);
        return { rotation: b.rotation, meshY: b.mesh.rotation.y, animating: !!b.rotateAnimation, selected: !!b.mesh.selectionIndicator };
    }, id);
    const start = (await rotationOf()).rotation;
    await right.click();
    await page.waitForFunction(buildingId => !window.gameManager.buildingSystem.buildings.get(buildingId).rotateAnimation, id);
    let now = await rotationOf();
    expect(now.rotation).toBe((start + 1) % 4);
    expect(now.meshY).toBeCloseTo(now.rotation * Math.PI / 2, 5);
    expect(now.selected).toBe(true);
    await page.waitForTimeout(350); // cooldown do botão
    await left.click();
    await page.waitForTimeout(350);
    await left.click();
    await page.waitForFunction(buildingId => !window.gameManager.buildingSystem.buildings.get(buildingId).rotateAnimation, id);
    now = await rotationOf();
    const final = (start + 3) % 4;
    expect(now.rotation).toBe(final);
    expect(now.meshY).toBeCloseTo(final * Math.PI / 2, 5);

    // Save → recarrega → Continuar: a rotação volta igual
    await page.evaluate(() => window.gameManager.autoSave());
    const saved = await page.evaluate(({ pid, buildingId }) =>
        JSON.parse(localStorage.getItem(SaveSystem.keyFor(pid))).game.buildings.buildings.find(b => b.id === buildingId).rotation,
    { pid: TEST_PROFILE.id, buildingId: id });
    expect(saved).toBe(final);
    await page.goto('/index.html');
    await page.locator(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`).click();
    await page.locator('.swal2-popup.game-swal .swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'playing', null, { timeout: 45000 });
    const restored = await page.evaluate(buildingId => {
        const b = window.gameManager.buildingSystem.buildings.get(buildingId);
        return { rotation: b.rotation, meshY: b.mesh.rotation.y };
    }, id);
    expect(restored.rotation).toBe(final);
    expect(restored.meshY).toBeCloseTo(final * Math.PI / 2, 5);
    expect(problems).toEqual([]);
});

test('zona residencial mostra moradores (em obra e pronta) no painel do prédio', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesmo HTML do painel');
    const problems = watchErrors(page);
    await begin(page);
    const id = await place(page, 'zone_residential_light');
    const select = () => page.evaluate(buildingId => {
        const gm = window.gameManager, b = gm.buildingSystem.buildings.get(buildingId);
        gm.selectBuilding(b);
        return gm.uiManager.getBuildingPopulationCapacity(b);
    }, id);
    const capacity = await select();
    expect(capacity).toBeGreaterThan(0);
    await expect(page.locator('.residents-stat')).toContainText(`Vai abrigar até ${capacity} moradores`);
    await expect(page.locator('.residents-note')).toContainText('limite da cidade sobe');

    await page.evaluate(buildingId => {
        const bs = window.gameManager.buildingSystem;
        bs.completeConstruction(bs.buildings.get(buildingId));
        window.gameManager.resourceManager.updatePopulationCapacity();
    }, id);
    const capacityDone = await select();
    await expect(page.locator('.residents-stat')).toHaveText(new RegExp(`Moradores: ~\\d+ de ${capacityDone} \\(limite da zona\\)`));
    await expect(page.locator('.residents-note')).toContainText(`soma +${capacityDone} ao limite da cidade`);

    // Prédio que não é moradia não mostra a linha
    const tank = await place(page, 'water_tank', { finish: true });
    await page.evaluate(buildingId => {
        const gm = window.gameManager;
        gm.selectBuilding(gm.buildingSystem.buildings.get(buildingId));
    }, tank);
    await expect(page.locator('.residents-stat')).toHaveCount(0);
    expect(problems).toEqual([]);
});

test('guia de energia: a primeira falta de energia abre a Cláudia no lugar do alerta, uma vez só', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'alvos do desktop');
    const problems = watchErrors(page);
    // Outros guias já vistos; 'energy' não
    await begin(page, { guides: ['roads', 'storage', 'zoning', 'public', 'tourism', 'industrial', 'commercial'] });
    const title = page.locator('#tutorial-title');

    expect(await place(page, 'water_pump')).toBeTruthy(); // bomba sem usina: falta energia
    await expect(title).toHaveText('Faltou energia!', { timeout: 8000 });
    await expect(page.locator('.central-alert-overlay')).toHaveCount(0); // o guia substitui o alerta
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('tutorial');
    await page.click('#tutorial-next-btn');
    await expect(title).toHaveText('O que acontece agora');
    await page.click('#tutorial-next-btn');
    await expect(title).toHaveText('O vento pode ajudar');
    await page.click('#tutorial-next-btn');
    await expect(title).toHaveText('Construa um Campo Eólico');
    await expect(page.locator('#tutorial-next-btn')).toBeDisabled(); // espera a obra (ou "Fazer depois")
    await expect(page.locator('.building-item[data-building-type="wind_farm"]')).toBeVisible();

    await page.click('#tutorial-skip-btn'); // "Fazer depois" conta como visto
    await expect(page.locator('#tutorial-container')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('guardiao_agua_guides')).p_teste)).toContain('energy');

    // Da segunda vez em diante é o alerta de sempre
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.uiManager.cooldownManager.active.clear();
        gm.buildingSystem._energyWarningCooldown = 0;
        gm.buildingSystem.showEnergyShortageNotification({ efficiency: 0.5, generation: 10, consumption: 20 });
    });
    await expect(page.locator('.central-alert-card')).toContainText('Energia Insuficiente');
    await page.click('.central-alert-btn');
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => window.gameManager.tutorialSystem.isActive)).toBe(false);

    // O guia aparece na aba Guias do livro de aulas
    expect(await page.evaluate(() => TutorialSystem.GUIDES.some(g => g.id === 'energy'))).toBe(true);
    expect(problems).toEqual([]);
});
