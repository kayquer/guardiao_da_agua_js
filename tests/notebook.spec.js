const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Caderno de Campo da Márcia (11/2026): bicho novo no mapa = pista da Márcia sem dizer quem é (página apagada com "?");
// tocar no bicho no mapa (clique real, pela posição na tela) seleciona com anel, abre a ficha e registra no caderno;
// bicho registrado que some = aviso do Paulo, que volta = momento da Márcia com "Ver onde"/"Ficha".

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    return errors;
}

/** Ponto na tela (px do canvas) do bicho `id` que está no mapa agora. */
const screenOf = (page, id) => page.evaluate(speciesId => {
    const gm = window.gameManager, ps = gm.propSystem, scene = gm.scene, eng = scene.getEngine();
    const m = ps.speciesInstances().find(s => s.p.id === speciesId);
    if (!m) return null;
    const v = BABYLON.Vector3.Project(new BABYLON.Vector3(m.inst.position.x, m.inst.position.y + m.height * 0.5, m.inst.position.z),
        BABYLON.Matrix.IdentityReadOnly, scene.getTransformMatrix(), scene.activeCamera.viewport.toGlobal(eng.getRenderWidth(), eng.getRenderHeight()));
    const k = eng.getHardwareScalingLevel();
    return { x: v.x * k, y: v.y * k };
}, id);

test('pista sem revelar, toque no bicho abre a ficha com anel e registra; sumir e voltar avisam', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica no mobile');
    const errors = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    // Bichos de verdade no mapa (planejador real): o caderno começa vazio e as páginas apagadas
    const species = await page.evaluate(async () => {
        const gm = window.gameManager, ps = gm.propSystem;
        gm.resourceManager.resources.pollution.current = 5;
        ps.refresh();
        await Promise.all([...ps.loading.values()]);
        ps.refresh();
        ps.update = () => {}; // o teste decide quando replanejar
        const m = ps.speciesInstances()[0];
        gm.cameraControls.centerCameraOn(m.inst.position.x, m.inst.position.z, 10);
        return m.p.id;
    });
    expect(species).toBeTruthy();
    expect(await page.evaluate(() => window.gameManager.fieldNotebook.count())).toBe(0);
    await page.waitForTimeout(1500); // a câmera chega
    // pausa a animação do bicho para o clique ser determinístico (ele se mexe devagar, mas se mexe)
    await page.evaluate(() => { window.gameManager.propSystem.movers.forEach(m => { m.p.motion = 'still'; }); });
    await page.waitForTimeout(100);

    const pt = await screenOf(page, species);
    // Clique um pouco ao lado do bicho (ele é pequeno): o raio na tela também acha
    await page.mouse.click(pt.x + 14, pt.y + 10);
    const card = page.locator('#species-card');
    await expect(card).toBeVisible();
    await expect(card.locator('#species-card-new')).toBeVisible();
    const entry = await page.evaluate(id => FIELD_NOTEBOOK[id], species);
    await expect(card.locator('#species-card-name')).toHaveText(entry.name);
    await expect(card.locator('#species-card-sci')).toHaveText(entry.sci);
    await expect(card.locator('#species-card-status')).toHaveClass(new RegExp(`sc-status--${entry.status}`));
    expect(await page.evaluate(() => !!window.gameManager.propSystem.selected)).toBe(true);
    expect(await page.evaluate(() => window.gameManager.isSimulationRunning())).toBe(false); // a ficha pausa
    expect(await page.evaluate(id => window.gameManager.fieldNotebook.isRegistered(id), species)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    expect(await page.evaluate(() => window.gameManager.propSystem.selected)).toBeNull();
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('playing'); // Esc fechou a ficha, não pausou

    // Pista de bicho ainda não registrado: não diz o nome
    const other = await page.evaluate(registered => {
        const gm = window.gameManager;
        const id = Object.keys(FIELD_NOTEBOOK).find(k => k !== registered && !gm.fieldNotebook.isPresent(k));
        const s = gm.gridManager.startArea;
        const all = gm.propSystem.placements.slice();
        gm.gameTime += 1000;
        gm.uiManager.onPropsPlanned([...all, { id, x: s.x + 1, z: s.z + 1 }]);
        return id;
    }, species);
    const hint = page.locator('#toast-stack .toast--notebook', { hasText: 'bicho diferente' });
    await expect(hint).toBeVisible();
    const otherName = await page.evaluate(id => FIELD_NOTEBOOK[id].name, other);
    await expect(hint).not.toContainText(otherName);

    // O registrado some (aviso do Paulo) e volta (momento da Márcia)
    await page.evaluate(id => {
        const gm = window.gameManager;
        gm.gameTime += 1000;
        gm.uiManager.onPropsPlanned(gm.propSystem.placements.filter(p => p.id !== id));
    }, species);
    await expect(page.locator('#toast-stack .toast', { hasText: `${entry.name} sumiu` })).toBeVisible();
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.gameTime += FieldNotebook.MOMENT_COOLDOWN_MS;
        gm.uiManager.onPropsPlanned(gm.propSystem.placements);
    });
    const back = page.locator('#toast-stack .toast--notebook', { hasText: `${entry.name} voltou` });
    await expect(back).toBeVisible();

    // Caderno: a página do registrado acesa; as outras apagadas com "?"
    await page.evaluate(() => window.gameManager.uiManager.openNotebookFromToast());
    const panel = page.locator('#notebook-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator(`.nb-entry[data-species="${species}"]`)).toHaveClass(/nb-here/);
    await expect(panel.locator('.nb-entry.nb-unknown').first()).toContainText('???');
    await expect(page.locator('#notebook-count')).toContainText('1 de');
    await panel.locator(`.nb-entry[data-species="${species}"]`).click();
    await expect(card).toBeVisible();
    await expect(card.locator('#species-card-new')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(panel).toBeVisible();

    // vai no save
    const saved = await page.evaluate(id => window.gameManager.getSaveData().notebook.registered[id], species);
    expect(saved).toBeTruthy();
    expect(errors).toEqual([]);
});
