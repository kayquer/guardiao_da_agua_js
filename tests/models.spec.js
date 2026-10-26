const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Prédios com modelo .glb (js/data/buildingModels.js): o procedural fica enquanto o arquivo carrega,
// depois o mesh é trocado pelo clone do modelo-base. Com o .glb indisponível, o procedural fica de vez.

/** Erros que reprovam o teste (os mesmos do smoke). `ignore` filtra o aviso do navegador sobre o request bloqueado. */
function collectErrors(page, ignore = null) {
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => {
        if (m.type() === 'error' && !(ignore && ignore.test(m.text()))) errors.push(`console.error: ${m.text()}`);
    });
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    return errors;
}

/** Coloca o prédio no lugar válido mais perto da área inicial; devolve o id. */
function place(page, typeId) {
    return page.evaluate(typeId => {
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
}

/** Termina a obra no próximo tick do loop de construção (e espera o prédio voltar ao tamanho cheio). */
async function finish(page, id) {
    await page.evaluate(id => { window.gameManager.buildingSystem.buildings.get(id).constructionDuration = 1; }, id);
    await page.waitForFunction(id => {
        const b = window.gameManager.buildingSystem.buildings.get(id);
        return b?.underConstruction === false && b.mesh.scaling.x === 1;
    }, id, { timeout: 20000 });
}

/**
 * Estado do mesh do prédio + seleção de verdade (handleBuildingSelection = scene.pick + metadata.buildingId).
 * Use com a obra terminada: na obra o modelo cresce a partir da base e fica pequeno para o clique.
 */
function inspect(page, id) {
    return page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        const b = bs.buildings.get(id);
        const mesh = b.mesh;
        // Câmera parada em cima do prédio, sem a suavização do SimCityCameraControls
        const box = mesh.getHierarchyBoundingVectors(true);
        const center = box.min.add(box.max).scale(0.5);
        // Clica na parte de cima (a de baixo pode ficar atrás do relevo do chão, como num clique de verdade)
        center.y = box.min.y + (box.max.y - box.min.y) * 0.75;
        gm.cameraControls.targetPosition.copyFrom(center);
        gm.cameraControls.targetRadius = 14;
        gm.camera.setTarget(center);
        gm.camera.radius = 14;
        // Anel/plaquinha de obra concluída são temporários e ficariam na frente do clique
        gm.scene.meshes.filter(m => /(completion|celebration)_/.test(m.name)).forEach(m => m.dispose());
        gm.scene.render();
        const engine = gm.scene.getEngine();
        const screen = BABYLON.Vector3.Project(center, BABYLON.Matrix.Identity(), gm.scene.getTransformMatrix(),
            gm.camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
        gm.selectedBuilding = null;
        // Project dá pixels de render; o clique é em pixels da tela (qualidade gráfica baixa/média renderiza menos)
        const scale = engine.getHardwareScalingLevel();
        gm.handleBuildingSelection(screen.x * scale, screen.y * scale);
        return {
            fromModel: !!mesh.metadata?.fromModel,
            metadata: { buildingId: mesh.metadata?.buildingId, buildingType: mesh.metadata?.buildingType, gridX: mesh.metadata?.gridX, gridZ: mesh.metadata?.gridZ },
            grid: { gridX: b.gridX, gridZ: b.gridZ },
            name: mesh.name,
            ownMaterial: !!mesh.material?.metadata?.perBuilding,
            shadowCaster: gm.shadowGenerator ? gm.shadowGenerator.getShadowMap().renderList.includes(mesh) : true,
            groundShadow: bs.shadowMeshes.get(mesh.name) === mesh.shadowMesh && !!mesh.shadowMesh,
            selected: gm.selectedBuilding?.id || null,
            disposedOld: gm.scene.meshes.filter(m => m.metadata?.buildingId === id).length === 1
        };
    }, id);
}

test('prédio mapeado troca o procedural pelo modelo .glb e continua funcionando', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'carregamento e troca de mesh não dependem do layout');
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    const first = await place(page, 'house');
    expect(first).toBeTruthy();
    // Primeira casa: o .glb ainda não carregou → procedural agora, modelo depois
    await page.waitForFunction(id => {
        const bs = window.gameManager.buildingSystem;
        return !bs.hasPendingBuildingModels() && bs.buildings.get(id).mesh.metadata?.fromModel;
    }, first, { timeout: 20000 });

    // A troca aconteceu no meio da obra: material de obra novo, e o do modelo guardado para o fim
    expect(await page.evaluate(id => {
        const b = window.gameManager.buildingSystem.buildings.get(id);
        return b.underConstruction && b.mesh.material === b.constructionMaterial
            && b.originalMaterial?.metadata?.perBuilding && b.originalMaterial.name.startsWith('buildingModelMat_');
    }, first)).toBe(true);

    // Obra termina com o material do modelo de volta (não o de obra)
    await finish(page, first);
    expect(await page.evaluate(id => {
        const b = window.gameManager.buildingSystem.buildings.get(id);
        const m = b.mesh.material;
        return m.name.startsWith('buildingModelMat_') && !!m.metadata?.perBuilding && m.alpha === 1;
    }, first)).toBe(true);

    const a = await inspect(page, first);
    expect(a.fromModel).toBe(true);
    expect(a.metadata).toEqual({ buildingId: first, buildingType: 'house', ...a.grid });
    expect(a.ownMaterial).toBe(true);
    expect(a.shadowCaster).toBe(true);
    expect(a.groundShadow).toBe(true);
    expect(a.selected).toBe(first);
    expect(a.disposedOld).toBe(true);

    // Segunda casa: modelo já em cache → nasce com ele, compartilhando a geometria do modelo-base
    const second = await place(page, 'house');
    const shared = await page.evaluate(([x, y]) => {
        const bs = window.gameManager.buildingSystem;
        const m1 = bs.buildings.get(x).mesh, m2 = bs.buildings.get(y).mesh;
        const template = bs.modelTemplates.get('house');
        return {
            fromModel: !!m2.metadata?.fromModel,
            sameGeometry: m1.geometry === m2.geometry && m2.geometry === template.geometry,
            uniqueNames: m1.name !== m2.name,
            ownMaterials: m1.material !== m2.material
        };
    }, [first, second]);
    expect(shared).toEqual({ fromModel: true, sameGeometry: true, uniqueNames: true, ownMaterials: true });
    await finish(page, second);

    // Remover um prédio não descarta o modelo-base nem a geometria do outro
    await page.evaluate(id => window.gameManager.buildingSystem.removeBuilding(id), first);
    await page.waitForFunction(() => window.gameManager.buildingSystem.disposalQueue.length === 0);
    expect(await page.evaluate(id => {
        const bs = window.gameManager.buildingSystem;
        const template = bs.modelTemplates.get('house');
        const mesh = bs.buildings.get(id).mesh;
        return !template.isDisposed() && !mesh.isDisposed() && mesh.geometry && !mesh.geometry.isDisposed?.()
            && mesh.getTotalVertices() > 0;
    }, second)).toBe(true);

    // Save/load: restoreBuilding recria direto com o modelo (cache) e selecionável
    const restored = await page.evaluate(id => {
        const bs = window.gameManager.buildingSystem;
        const saved = BuildingSystem.serializeBuilding(bs.buildings.get(id));
        bs.clearAllBuildings();
        return bs.restoreBuilding(saved)?.id;
    }, second);
    expect(restored).toBe(second);
    const r = await inspect(page, second);
    expect(r.fromModel).toBe(true);
    expect(r.metadata.buildingId).toBe(second);
    expect(r.selected).toBe(second);

    expect(errors).toEqual([]);
});

test('sem o .glb (rota bloqueada) o prédio fica no procedural, sem erro', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'carregamento e troca de mesh não dependem do layout');
    // O navegador avisa no console do request abortado; isso não é erro do jogo
    const errors = collectErrors(page, /Failed to load resource/);
    const warnings = [];
    page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
    await page.route('**/*.glb', route => route.abort());
    await startGame(page, { url: '/index.html?log=warn' }); // alertas só aparecem no console com ?log=warn
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    const id = await place(page, 'apartment');
    expect(id).toBeTruthy();
    await page.waitForFunction(() => window.gameManager.buildingSystem.modelFiles?.size > 0
        && !window.gameManager.buildingSystem.hasPendingBuildingModels(), null, { timeout: 20000 });
    await finish(page, id);

    const s = await inspect(page, id);
    expect(s.fromModel).toBe(false);
    expect(s.metadata.buildingId).toBe(id);
    expect(s.selected).toBe(id);
    expect(warnings.some(w => w.includes('building-a.glb'))).toBe(true);

    // Um segundo prédio do mesmo tipo não tenta baixar de novo e nasce procedural
    const other = await place(page, 'apartment');
    expect(await page.evaluate(x => !window.gameManager.buildingSystem.buildings.get(x).mesh.metadata?.fromModel, other)).toBe(true);
    expect(errors).toEqual([]);
});

test('prévia de posicionamento e obra mostram o modelo .glb (procedural só de reserva)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'prévia e obra não dependem do layout');
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    // Escolher o prédio já pede o .glb; a prévia começa procedural e vira o modelo quando ele carrega
    const spot = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 1e9;
        bs.buildingCooldown.active = false;
        const a = gm.gridManager.startArea || { x: 16, z: 16 };
        const spots = [];
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) spots.push([x, z]);
        spots.sort((p, q) => Math.hypot(p[0] - a.x - 4, p[1] - a.z - 4) - Math.hypot(q[0] - a.x - 4, q[1] - a.z - 4));
        const s = spots.find(([x, z]) => bs.canPlaceBuilding(x, z, 'house').canPlace && !gm.treeSystem?.countTreesInArea(x, z, 1));
        gm.enterBuildMode('house');
        bs.updatePreview(s[0], s[1]);
        return { x: s[0], z: s[1] };
    });
    await page.waitForFunction(() => window.gameManager.buildingSystem.previewMesh?.metadata?.fromModel, null, { timeout: 20000 });

    const preview = await page.evaluate(() => {
        const bs = window.gameManager.buildingSystem;
        const m = bs.previewMesh, template = bs.modelTemplates.get('house');
        return {
            enabled: m.isEnabled(),
            pickable: m.isPickable,
            sameGeometry: m.geometry === template.geometry,
            ownMaterial: m.material !== template.material && !!m.material.metadata?.preview,
            sharedTexture: m.material.diffuseTexture === template.material.diffuseTexture,
            alpha: m.material.alpha,
            green: m.material.diffuseColor.g === 1 && m.material.diffuseColor.r === 0,
            scaling: m.scaling.asArray(),
            position: m.position.asArray(),
            materialName: m.material.name
        };
    });
    expect(preview).toMatchObject({ enabled: true, pickable: false, sameGeometry: true, ownMaterial: true, sharedTexture: true, green: true, scaling: [1, 1, 1] });
    expect(preview.alpha).toBeLessThan(1);

    // Coloca no lugar da prévia: a obra já nasce com o modelo (em cache), no mesmo lugar e crescendo de baixo
    const build = await page.evaluate(s => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        const b = bs.placeBuilding(s.x, s.z, 'house');
        document.querySelector('.central-alert-overlay')?.remove();
        b.constructionDuration = 600000;
        return {
            id: b.id,
            fromModel: !!b.mesh.metadata?.fromModel,
            underConstruction: b.underConstruction,
            constructionMaterial: b.mesh.material === b.constructionMaterial && b.mesh.material.alpha < 1,
            position: b.mesh.position.asArray(),
            scaling: b.mesh.scaling.asArray(),
            rotation: b.mesh.rotation.asArray()
        };
    }, spot);
    expect(build).toMatchObject({ fromModel: true, underConstruction: true, constructionMaterial: true, rotation: [0, 0, 0] });
    build.position.forEach((v, i) => expect(v).toBeCloseTo(preview.position[i], 3));
    expect(build.scaling[0]).toBe(1);
    expect(build.scaling[2]).toBe(1);
    expect(build.scaling[1]).toBeLessThan(1);

    // Mesmo lugar agora ocupado → prévia vermelha
    expect(await page.evaluate(s => {
        const bs = window.gameManager.buildingSystem;
        bs.lastPreviewPosition = { x: -1, z: -1 };
        bs.updatePreview(s.x, s.z);
        const c = bs.previewMesh.material.diffuseColor;
        return c.r === 1 && c.g === 0;
    }, spot)).toBe(true);

    // Sair do modo construção descarta o fantasma e o material dele, nunca a textura do modelo-base
    expect(await page.evaluate(name => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.exitBuildMode();
        const template = bs.modelTemplates.get('house');
        return {
            preview: bs.previewMesh,
            ghosts: gm.scene.meshes.filter(m => m.name.startsWith('preview_house')).length,
            material: gm.scene.materials.some(m => m.name === name),
            texture: !!template.material.diffuseTexture?.getInternalTexture() && !template.isDisposed()
        };
    }, preview.materialName)).toEqual({ preview: null, ghosts: 0, material: false, texture: true });

    // Remover a obra no meio leva junto barra, plaquinha e partículas de progresso
    expect(await page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        bs.removeBuilding(id);
        return {
            queued: bs.constructionQueue.has(id),
            leftovers: gm.scene.meshes.filter(m => m.name.includes(`_${id}`) && /^(progress|progressBg|particle|cartoonText_progress)/.test(m.name)).length
        };
    }, build.id)).toEqual({ queued: false, leftovers: 0 });

    expect(errors).toEqual([]);
});
