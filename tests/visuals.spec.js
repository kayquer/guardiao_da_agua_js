const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Efeitos visuais (BuildingFeedback.js + RoadMeshes.js): poeira/fumacinha/marteladas/luzinhas no canteiro e o
// efeito de conclusão, fumaça das zonas industriais só na qualidade Alta, e o acesso (rebaixo de calçada)
// que a rua ganha ao lado de um prédio. Desktop só (é tudo 3D, sem diferença de interface).
function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => {
        if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
        if (m.type() === 'warning' && /efeitos de obra|efeito de conclusão/.test(m.text())) problems.push(`warn: ${m.text()}`);
    });
    return problems;
}

/** Jogo rodando, sem popups segurando a pausa leve, com dinheiro e tudo desbloqueado. */
async function start(page, quality) {
    if (quality) await page.addInitScript(q => localStorage.setItem('guardiao_agua_graphics', q), quality);
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.uiManager.syncPopupPause = () => {};
        gm.releasePause('popup');
        gm.gameOverSystem.update = () => {};
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 1e9;
        gm.buildingSystem.maxSimultaneousConstructions = 99;
    });
}

/** Coloca `type` no lugar livre mais perto do centro (ou em x/z) e devolve o id. */
const place = (page, type, { duration, at } = {}) => page.evaluate(({ type, duration, at }) => {
    const bs = window.gameManager.buildingSystem;
    bs.buildingCooldown.active = false;
    let spot = at;
    if (!spot) {
        const spots = [];
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) spots.push([x, z]);
        spots.sort((a, b) => Math.hypot(a[0] - 20, a[1] - 20) - Math.hypot(b[0] - 20, b[1] - 20));
        const s = spots.find(([x, z]) => bs.canPlaceBuilding(x, z, type).canPlace);
        spot = { x: s[0], z: s[1] };
    }
    const b = bs.placeBuilding(spot.x, spot.z, type);
    if (b && duration) b.constructionDuration = duration;
    return b?.id || null;
}, { type, duration, at });

const stats = page => page.evaluate(() => window.gameManager.buildingSystem.getBuildingFxStats());

test('obra tem poeira, fumaça, marteladas e luzinhas; a conclusão faz um efeito que se limpa sozinho', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'efeito 3D: só desktop');
    test.setTimeout(120000);
    const problems = watchErrors(page);
    await start(page, 'high');

    const id = await place(page, 'water_pump', { duration: 600000 });
    expect(id).toBeTruthy();
    await expect.poll(() => stats(page)).toMatchObject({ sites: 1, siteParts: 7 });
    await expect.poll(async () => (await stats(page)).dustRate).toBeGreaterThan(0);
    const systems = await page.evaluate(() => window.gameManager.scene.particleSystems.map(p => p.name));
    expect(systems).toEqual(expect.arrayContaining(['fx_site_dust', 'fx_site_smoke', 'fx_site_sparks']));
    // Faíscas da martelada saem de tempos em tempos
    await expect.poll(() => page.evaluate(() => window.gameManager.buildingSystem.fxSystems.sparks.getActiveCount()), { timeout: 15000 }).toBeGreaterThan(0);
    // Sem PointLight dinâmica nova por obra
    const lightsBefore = await page.evaluate(() => window.gameManager.scene.lights.length);

    // Concluir: canteiro some, entra o efeito de conclusão e ele se descarta sozinho
    await page.evaluate(id => { window.gameManager.buildingSystem.buildings.get(id).constructionDuration = 1; }, id);
    await expect.poll(() => stats(page)).toMatchObject({ sites: 0 });
    await expect.poll(async () => (await stats(page)).bursts, { timeout: 5000 }).toBe(0);
    const after = await page.evaluate(() => ({
        lights: window.gameManager.scene.lights.length,
        leftovers: window.gameManager.scene.meshes.filter(m => /^fx(Pole|Lamp|Glow|Flash)_|fx_completion_/.test(m.name)).length,
        completion: window.gameManager.scene.particleSystems.filter(p => /fx_completion_/.test(p.name)).length,
        dust: window.gameManager.buildingSystem.fxSystems.dust.emitRate,
        textureOk: !!window.gameManager.buildingSystem.fxTextures.get('puff').getInternalTexture()
    }));
    expect(after).toEqual({ lights: lightsBefore, leftovers: 0, completion: 0, dust: 0, textureOk: true });

    // Demolir no meio da obra limpa o canteiro na hora
    const id2 = await place(page, 'water_pump', { duration: 600000 });
    await expect.poll(() => stats(page)).toMatchObject({ sites: 1 });
    await page.evaluate(id => window.gameManager.buildingSystem.removeBuilding(id), id2);
    expect(await stats(page)).toMatchObject({ sites: 0, siteParts: 0 });
    expect(await page.evaluate(() => window.gameManager.scene.meshes.filter(m => /^fx(Pole|Lamp|Glow|Flash)_/.test(m.name)).length)).toBe(0);
    expect(problems).toEqual([]);
});

test('qualidade baixa: canteiro quase sem partículas (sem poeira nem fumaça)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'efeito 3D: só desktop');
    test.setTimeout(90000);
    const problems = watchErrors(page);
    await start(page, 'low');
    await place(page, 'water_pump', { duration: 600000 });
    await expect.poll(() => stats(page)).toMatchObject({ sites: 1 });
    await page.waitForTimeout(500);
    const rates = await page.evaluate(() => {
        const fx = window.gameManager.buildingSystem.fxSystems;
        return { dust: fx.dust.emitRate, smoke: fx.smoke.emitRate };
    });
    expect(rates).toEqual({ dust: 0, smoke: 0 });
    expect(problems).toEqual([]);
});

test('fumaça industrial só na Alta, liga/desliga ao vivo e some ao demolir', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'efeito 3D: só desktop');
    test.setTimeout(120000);
    const problems = watchErrors(page);
    await start(page, 'high');
    const id = await place(page, 'zone_industrial_heavy', { duration: 1 });
    expect(id).toBeTruthy();
    await expect.poll(() => page.evaluate(id => window.gameManager.buildingSystem.buildings.get(id).underConstruction, id)).toBe(false);
    await page.evaluate(id => window.gameManager.buildingSystem.forceZoneStage(id, 3), id);
    // Peças do lote carregam (.glb) e viram chaminés: mais fase = mais chaminés
    await expect.poll(async () => (await stats(page)).chimneys, { timeout: 30000 }).toBeGreaterThanOrEqual(2);
    expect(await stats(page)).toMatchObject({ industrialSmoke: true });
    expect((await stats(page)).smokeRate).toBeGreaterThan(0);

    await page.evaluate(() => GraphicsQuality.set('medium'));
    expect(await stats(page)).toMatchObject({ industrialSmoke: false });
    expect(await page.evaluate(() => window.gameManager.scene.particleSystems.some(p => p.name === 'fx_industrial_smoke'))).toBe(false);
    await page.evaluate(() => GraphicsQuality.set('high'));
    await expect.poll(() => stats(page)).toMatchObject({ industrialSmoke: true });

    await page.evaluate(id => window.gameManager.buildingSystem.removeBuilding(id), id);
    await expect.poll(async () => (await stats(page)).chimneys, { timeout: 5000 }).toBe(0);
    expect(problems).toEqual([]);
});

test('rua ao lado de prédio ganha acesso; some ao demolir o prédio ou a rua', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'efeito 3D: só desktop');
    test.setTimeout(120000);
    const problems = watchErrors(page);
    await start(page);
    // Faixa livre 5×2: rua em z, prédio logo acima (z + 1)
    const origin = await page.evaluate(() => {
        const bs = window.gameManager.buildingSystem;
        for (let x = 2; x < 34; x++) for (let z = 2; z < 36; z++) {
            let ok = true;
            for (let dx = 0; dx < 5 && ok; dx++) for (let dz = 0; dz < 2 && ok; dz++) ok = bs.canPlaceRoadAt(x + dx, z + dz, 'paved_road').ok;
            if (ok && bs.canPlaceBuilding(x + 2, z + 1, 'house').canPlace) return { x, z };
        }
        return null;
    });
    expect(origin).toBeTruthy();
    await page.evaluate(({ x, z }) => {
        const bs = window.gameManager.buildingSystem;
        for (let dx = 0; dx < 5; dx++) bs.placeBuilding(x + dx, z, 'paved_road');
    }, origin);
    expect(await page.evaluate(() => window.gameManager.buildingSystem.roadAccesses?.size || 0)).toBe(0);

    const house = await place(page, 'house', { at: { x: origin.x + 2, z: origin.z + 1 } });
    expect(house).toBeTruthy();
    const access = await page.evaluate(({ x, z }) => {
        const bs = window.gameManager.buildingSystem;
        const entry = bs.roadAccesses.get(`${x + 2},${z},0`); // lado N (z + 1) da rua embaixo da casa
        return entry && { side: entry.mesh.metadata.side, pickable: entry.mesh.isPickable, instance: entry.mesh.getClassName(), total: bs.roadAccesses.size };
    }, origin);
    expect(access).toEqual({ side: 0, pickable: false, instance: 'InstancedMesh', total: 1 });
    // Carregar save reencaixa tudo (loadData → refreshAllRoadPieces): o acesso volta mesmo se tiver sumido
    expect(await page.evaluate(() => {
        const bs = window.gameManager.buildingSystem;
        bs.roadAccesses.forEach(e => e.mesh.dispose());
        bs.refreshAllRoadPieces();
        return [...bs.roadAccesses.values()].filter(e => !e.mesh.isDisposed()).length;
    })).toBe(1);

    // Demolir a casa tira o acesso; reconstruir devolve; demolir a rua também tira
    await page.evaluate(id => window.gameManager.buildingSystem.removeBuilding(id), house);
    expect(await page.evaluate(() => window.gameManager.buildingSystem.roadAccesses.size)).toBe(0);
    await place(page, 'house', { at: { x: origin.x + 2, z: origin.z + 1 } });
    expect(await page.evaluate(() => window.gameManager.buildingSystem.roadAccesses.size)).toBe(1);
    await page.evaluate(({ x, z }) => {
        const bs = window.gameManager.buildingSystem;
        bs.removeBuilding(bs.getBuildingAt(x + 2, z).id);
    }, origin);
    expect(await page.evaluate(() => window.gameManager.buildingSystem.roadAccesses.size)).toBe(0);
    // Peça-modelo do acesso continua escondida (só instâncias aparecem)
    expect(await page.evaluate(() => [...window.gameManager.buildingSystem.roadAccessTemplates.values()].every(t => !t.isVisible && !t.isDisposed()))).toBe(true);
    expect(problems).toEqual([]);
});
