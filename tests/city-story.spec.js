const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// A história da cidade (11/2026): voo de câmera da vitória (pulável, sem voo com movimento reduzido) que chega à tela
// com o Diário da cidade, o painel do diário na pausa e no menu do jogador, a derrota por poluição dizendo QUAL
// prédio sujava (e quanto), a tendência de cada ponto de volta e o corte de câmera da 1ª espécie ameaçada.
// Desktop (a lógica é a mesma no mobile).

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

/** Constrói e termina um prédio no primeiro lugar livre (estudos liberados, dinheiro sobrando). */
async function buildDone(page, type) {
    return page.evaluate(t => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 500000;
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (!bs.canPlaceBuilding(x, z, t).canPlace) continue;
            const b = bs.placeBuilding(x, z, t);
            if (!b) continue;
            if (b.underConstruction) bs.completeConstruction(b);
            document.querySelectorAll('.central-alert-overlay').forEach(el => el.remove());
            return b.id;
        }
        return null;
    }, type);
}

test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
});

test('vitória: voo sobre a cidade (simulação parada, pulável) e a tela com o Diário da cidade', async ({ page }) => {
    test.setTimeout(120000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    expect(await buildDone(page, 'water_pump')).toBeTruthy();
    await page.evaluate(() => window.gameManager.cityDiary.check(window.gameManager));

    await page.evaluate(() => window.gameManager.gameOverSystem.showVictory());
    const overlay = page.locator('#city-cinematic');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#city-cinematic .cc-caption')).toContainText('moradores');
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('cinematic');
    const t0 = await page.evaluate(() => window.gameManager.gameTime);
    const pose0 = await page.evaluate(() => window.gameManager.camera.alpha);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => window.gameManager.gameTime)).toBe(t0); // simulação parada no voo
    expect(await page.evaluate(() => window.gameManager.camera.alpha)).not.toBe(pose0); // a câmera está voando
    await expect(page.locator('#gameover-container')).toBeHidden();

    await page.keyboard.press('Escape'); // pula
    await expect(overlay).toBeHidden();
    await expect(page.locator('#gameover-container')).toBeVisible();
    await expect(page.locator('#pause-overlay')).toBeHidden(); // o Esc que pulou não pausou
    const diary = page.locator('#victory-diary');
    await expect(diary).toBeVisible();
    await expect(diary).toContainText('Primeira fonte de água');
    await expect(page.locator('#gameover-text')).toContainText('espécie');
    const state = await page.evaluate(() => ({
        state: window.gameManager.gameState, held: window.gameManager.pauseReasons.has('victory'),
        beta: window.gameManager.camera.beta
    }));
    expect(state.state).toBe('playing');
    expect(state.held).toBe(true);
    expect(Math.abs(state.beta - Math.PI / 3.5)).toBeLessThan(1e-6);

    await page.click('#gameover-continue-btn');
    await expect(page.locator('#gameover-container')).toBeHidden();
    expect(await page.evaluate(() => window.gameManager.pauseReasons.has('victory'))).toBe(false);
    expect(problems).toEqual([]);
});

test('vitória com movimento reduzido: sem voo, direto para a tela', async ({ page }) => {
    test.setTimeout(90000);
    const problems = watchErrors(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await page.evaluate(() => window.gameManager.gameOverSystem.showVictory());
    await expect(page.locator('#gameover-container')).toBeVisible();
    expect(await page.locator('#city-cinematic').count()).toBe(0);
    expect(problems).toEqual([]);
});

test('Diário da cidade: na pausa e no menu do jogador, com o dia de cada marco', async ({ page }) => {
    test.setTimeout(90000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await buildDone(page, 'water_pump');

    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-diary');
    const panel = page.locator('#diary-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.diary-day').first()).toContainText('Dia 1');
    await expect(panel.locator('.diary-entry[data-kind="build"]')).toContainText(['Primeira fonte de água: Bomba de Água']);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('#pause-overlay .player-panel')).toBeVisible();

    await page.evaluate(() => window.gameManager.resumeGame());
    await page.click('#player-chip');
    await page.click('#player-menu [data-player-action="diary"]');
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => window.gameManager.getSaveData().diary.entries.length)).toBeGreaterThan(0);
    expect(problems).toEqual([]);
});

test('derrota por poluição: diz qual prédio sujava e quanto; cada ponto de volta mostra a tendência', async ({ page }) => {
    test.setTimeout(120000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    // autosaves com a água caindo e a poluição subindo: cada foto guarda o resumo e a tendência
    await page.evaluate(() => {
        const gm = window.gameManager;
        const r = gm.resourceManager.resources;
        r.population.satisfaction = 70;
        for (let i = 0; i <= 10; i++) {
            r.water.current = r.water.max * (0.9 - i * 0.03);
            r.pollution.current = 10 + i * 3;
            gm.gameTime = 60000 + i * 30000;
            gm.autoSave();
        }
    });
    expect(await buildDone(page, 'coal_plant')).toBeTruthy();

    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.resourceManager.resources.pollution.current = 100;
        gm.gameOverSystem.triggerGameOver('pollution_critical');
    });
    const text = page.locator('#gameover-text');
    await expect(text).toBeVisible();
    await expect(text.locator('.gameover-causes')).toContainText(/Quem mais sujava: Usina a Carvão, com \d+ dos \d+ pontos de poluição por minuto/);
    await expect(text.locator('.gameover-tips li').first()).toContainText('Usina a Carvão era a maior fonte');

    const rewind = page.locator('#gameover-recovery .recovery-btn[data-slot="rewind"]');
    await expect(rewind).toContainText('Voltar 3 minutos');
    await expect(rewind.locator('.recovery-trend')).toContainText(/há 3 min: água \d+% e caindo, poluição \d+ e subindo/);
    await expect(page.locator('#gameover-recovery .recovery-btn[data-slot="safe"] .recovery-trend')).toContainText('água');
    expect(problems).toEqual([]);
});

test('1ª espécie ameaçada: corte curto de câmera com a Márcia, pulável e uma vez por espécie', async ({ page }) => {
    test.setTimeout(90000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    const id = await page.evaluate(() => Object.keys(FIELD_NOTEBOOK).find(k => FieldNotebook.isThreatened(k)));
    const found = { id, cell: { x: 20, z: 20 }, first: true, returned: false, notify: true };
    await page.evaluate(f => window.gameManager.uiManager.announceNewSpecies(f), found);
    const overlay = page.locator('#city-cinematic');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('.cc-caption')).toContainText('Márcia');
    await page.click('#city-cinematic-skip');
    await expect(overlay).toBeHidden();
    await expect(page.locator('.toast--notebook')).toContainText('Márcia');
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('playing');

    // a mesma espécie de novo: só a pista, sem plano
    await page.evaluate(f => window.gameManager.uiManager.announceNewSpecies(f), found);
    await page.waitForTimeout(300);
    await expect(overlay).toBeHidden();
    expect(problems).toEqual([]);
});
