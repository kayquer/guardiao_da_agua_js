const { test, expect } = require('@playwright/test');
const { startGame, TEST_PROFILE } = require('./helpers');

// Salvar e carregar de verdade: joga um pouco, salva pela tela de pausa, recarrega a página e continua pelo
// perfil. Tudo tem de voltar igual (prédios, obra em andamento, árvores, recursos, missões, estudos, tempo)
// e o tutorial não pode abrir de novo. Qualquer erro de JS ou console.error reprova.
function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    // beforeunload (recarregar no meio do jogo) é aceito: a página tem de sair para o teste continuar
    page.on('dialog', d => {
        if (d.type() !== 'beforeunload') problems.push(`diálogo nativo: ${d.message()}`);
        d.type() === 'beforeunload' ? d.accept() : d.dismiss();
    });
    return problems;
}

/** Retrato do jogo para comparar antes de salvar e depois de carregar. */
const snapshot = page => page.evaluate(() => {
    const gm = window.gameManager;
    const r = gm.resourceManager.resources;
    return {
        gameTime: gm.gameTime,
        timeScale: gm.timeScale,
        clock: gm.gameClockTime.getTime(),
        buildings: [...gm.buildingSystem.buildings.values()]
            .map(b => ({
                id: b.id, type: b.type, x: b.gridX, z: b.gridZ, underConstruction: b.underConstruction, start: b.constructionStartTime,
                duration: b.constructionDuration, active: b.active, effectsApplied: !!b.effectsApplied, efficiency: b.efficiency
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        budget: r.budget.current,
        water: r.water.current,
        pollution: r.pollution.current,
        pollutionReduction: r.pollution.reduction,
        waterProduction: r.water.production,
        power: r.electricity.consumption,
        expenses: r.budget.expenses,
        population: r.population.current,
        completed: [...gm.questSystem.completedQuests].sort(),
        active: [...gm.questSystem.activeQuests].sort(),
        score: gm.questSystem.totalScore,
        pumpUnlocked: gm.studySystem.unlockedBuildings.has('water_pump'),
        trees: [...gm.treeSystem.trees.keys()].sort(),
        initialTrees: gm.treeSystem.initialCount
    };
});

/** Fecha o alerta de energia (aparece ao construir sem usina e pausa o jogo enquanto aberto). */
async function dismissEnergyAlert(page) {
    const ok = page.locator('.central-alert-btn');
    if (await ok.isVisible()) await ok.click();
}

/** Volta à tela inicial (recarrega) e clica no perfil de teste. */
async function reloadAndPickProfile(page) {
    await page.goto('/index.html');
    const card = page.locator(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    await expect(card.locator('.profile-save')).toContainText('jogo salvo');
    await card.click();
    const dialog = page.locator('.swal2-popup.game-swal');
    await expect(dialog).toBeVisible();
    return dialog;
}

test('salvar, recarregar a página e continuar: o jogo volta exatamente como estava', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    test.setTimeout(180000);
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    // 1) Estudo desbloqueia a bomba d'água; ela fica pronta e cumpre a 1ª missão (tutorial_01)
    const pump = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.unlockBuilding('water_pump');
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (!gm.treeSystem.countTreesInArea(x, z, 1) && bs.canPlaceBuilding(x, z, 'water_pump').canPlace) {
                const b = bs.placeBuilding(x, z, 'water_pump');
                b.constructionDuration = 300;
                return { id: b.id, x, z };
            }
        }
    });
    expect(pump).toBeTruthy();
    await dismissEnergyAlert(page);
    await page.waitForFunction(() => window.gameManager.questSystem.completedQuests.has('tutorial_01'), null, { timeout: 20000 });

    // 2) Uma obra em cima de uma árvore (derruba) que ainda não terminou na hora de salvar
    const felled = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        bs.buildingCooldown.active = false;
        for (const key of gm.treeSystem.trees.keys()) {
            const [x, z] = key.split(',').map(Number);
            if (bs.canPlaceBuilding(x, z, 'water_well').canPlace) {
                const b = bs.placeBuilding(x, z, 'water_well');
                b.constructionDuration = 12000;
                return { id: b.id, key };
            }
        }
    });
    expect(felled).toBeTruthy();
    await dismissEnergyAlert(page);
    await page.waitForFunction(() => window.gameManager.gameTime > 1500);

    // 2b) Um evento danifica a bomba pronta: fica inativa e SEM efeitos nos totais (effectsApplied = false).
    // O save tem de guardar isso, senão o load a marcava como "com efeitos" e removê-la descontava em dobro.
    await page.evaluate(() => window.gameManager.eventSystem.disableRandomBuilding());
    expect(await page.evaluate(id => {
        const b = window.gameManager.buildingSystem.buildings.get(id);
        return { active: b.active, effectsApplied: b.effectsApplied };
    }, pump.id)).toEqual({ active: false, effectsApplied: false });

    // 3) Pausa (tela do jogador) e "💾 Salvar jogo": o tempo para, então o retrato é o que foi salvo
    await page.click('#player-chip');
    await expect(page.locator('#pause-overlay')).toBeVisible();
    await page.click('#btn-save-game');
    // O ✅ virou ícone SVG (status-done): confere o texto e o ícone
    await expect(page.locator('#btn-save-game')).toHaveText('Jogo salvo!');
    await expect(page.locator('#btn-save-game img.ui-icon[src$="status-done.svg"]')).toBeVisible();
    const before = await snapshot(page);
    expect(before.trees).not.toContain(felled.key);
    const building = before.buildings.find(b => b.id === felled.id);
    expect(building.underConstruction).toBe(true);
    expect(before.gameTime - building.start).toBeLessThan(building.duration); // obra pela metade

    // O save é leve: sem histórico de recursos, sem malhas/materiais, só dados
    const stored = await page.evaluate(id => localStorage.getItem(SaveSystem.keyFor(id)), TEST_PROFILE.id);
    expect(stored.length).toBeLessThan(30000);
    const savedGame = JSON.parse(stored).game;
    expect(savedGame.resources.history).toBeUndefined();
    expect(savedGame.buildings.buildings.find(b => b.id === pump.id).effectsApplied).toBe(false);

    // 4) Recarrega a página → perfil → "Continuar"
    const dialog = await reloadAndPickProfile(page);
    await expect(dialog).toContainText('2 construções');
    await dialog.locator('.swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'playing', null, { timeout: 45000 });

    // Sem tutorial inicial: o jogo já roda
    await expect(page.locator('#game-screen')).toBeVisible();
    await expect(page.locator('#tutorial-container')).toBeHidden();
    expect(await page.evaluate(() => window.gameManager.tutorialSystem.isActive)).toBe(false);

    // Logo depois de carregar (o tempo anda pouco): compara com o retrato
    const after = await snapshot(page);
    expect(after.gameTime).toBeGreaterThanOrEqual(before.gameTime);
    expect(after.gameTime - before.gameTime).toBeLessThan(5000);
    expect(after.timeScale).toBe(before.timeScale);
    expect(Math.abs(after.clock - before.clock)).toBeLessThan(5 * 60 * 1000); // relógio: 1 s real = 1 min de jogo
    expect(after.buildings).toEqual(before.buildings);
    expect(after.completed).toEqual(before.completed);
    expect(after.active).toEqual(before.active);
    expect(after.score).toBe(before.score);
    expect(after.pumpUnlocked).toBe(true);
    expect(after.trees).toEqual(before.trees); // a árvore derrubada continua derrubada
    expect(after.initialTrees).toBe(before.initialTrees);
    expect(after.pollutionReduction).toBeCloseTo(before.pollutionReduction, 5); // efeitos não aplicados em dobro
    expect(after.waterProduction).toBeCloseTo(before.waterProduction, 5);
    expect(after.power).toBeCloseTo(before.power, 5);
    expect(after.expenses).toBe(before.expenses);
    expect(Math.abs(after.budget - before.budget)).toBeLessThan(500);
    expect(Math.abs(after.water - before.water)).toBeLessThan(Math.max(50, before.water * 0.05));
    expect(Math.abs(after.pollution - before.pollution)).toBeLessThan(2);
    expect(Math.abs(after.population - before.population)).toBeLessThan(before.population * 0.05);

    // Cada prédio com malha na cena, clicável (metadata.buildingId) e ocupando o grid
    const meshes = await page.evaluate(() => {
        const gm = window.gameManager;
        return [...gm.buildingSystem.buildings.values()].map(b => ({
            inScene: gm.scene.meshes.includes(b.mesh) && !b.mesh.isDisposed(),
            buildingId: b.mesh.metadata?.buildingId === b.id,
            occupied: gm.gridManager.isCellOccupied(b.gridX, b.gridZ)
        }));
    });
    expect(meshes).toEqual(meshes.map(() => ({ inScene: true, buildingId: true, occupied: true })));

    // Modelos .glb: depois de carregar, cada prédio com modelo troca o procedural pelo .glb do próprio tipo,
    // e a obra continua com a escala de obra do modelo (planta inteira, altura crescendo de baixo pra cima)
    await page.waitForFunction(() => !window.gameManager.buildingSystem.hasPendingBuildingModels(), null, { timeout: 30000 });
    const models = await page.evaluate(id => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        const obra = bs.buildings.get(id);
        return {
            all: [...bs.buildings.values()].every(b => !BUILDING_MODELS[b.type] || (b.mesh.metadata?.fromModel && b.mesh.metadata.buildingType === b.type)),
            obra: { underConstruction: obra.underConstruction, x: obra.mesh.scaling.x, y: obra.mesh.scaling.y }
        };
    }, felled.id);
    expect(models.all).toBe(true);
    expect(models.obra.underConstruction).toBe(true);
    expect(models.obra.x).toBeCloseTo(1, 5);
    expect(models.obra.y).toBeLessThan(1);

    // A bomba danificada continua sem efeitos: removê-la não desconta nada dos totais
    const removal = await page.evaluate(id => {
        const gm = window.gameManager, r = gm.resourceManager.resources;
        const before = { water: r.water.production, power: r.electricity.consumption, expenses: r.budget.expenses };
        gm.buildingSystem.removeBuilding(id);
        return { before, after: { water: r.water.production, power: r.electricity.consumption, expenses: r.budget.expenses } };
    }, pump.id);
    expect(removal.after).toEqual(removal.before);

    // A obra continua de onde parou e termina
    await page.waitForFunction(id => !window.gameManager.buildingSystem.buildings.get(id).underConstruction, felled.id, { timeout: 30000 });
    expect(await page.evaluate(id => window.gameManager.buildingSystem.buildings.get(id).active, felled.id)).toBe(true);

    // Autosave pelo relógio (GAME_CONFIG.gameplay.autoSaveInterval) com o jogo rodando
    const savedAt = await page.evaluate(id => JSON.parse(localStorage.getItem(SaveSystem.keyFor(id))).savedAt, TEST_PROFILE.id);
    await page.evaluate(() => { GAME_CONFIG.gameplay.autoSaveInterval = 300; });
    await page.waitForFunction(({ id, savedAt }) => {
        const envelope = JSON.parse(localStorage.getItem(SaveSystem.keyFor(id)));
        return envelope.savedAt > savedAt && envelope.kind === 'auto';
    }, { id: TEST_PROFILE.id, savedAt }, { timeout: 10000 });
    expect(problems).toEqual([]);
});

test('perfil com jogo salvo: "Novo jogo" pede confirmação, apaga o save e começa com o tutorial', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete(); // o fim do tutorial já salva (com a cidade do jeito que está)
        gm.buildingSystem.placeBuilding(gm.gridManager.startArea.x, gm.gridManager.startArea.z, 'water_well');
        gm.saveGame();
    });
    const hasSave = () => page.evaluate(id => new SaveSystem().hasSave(id), TEST_PROFILE.id);
    expect(await hasSave()).toBe(true);

    // "Novo jogo" e depois "Voltar": nada muda, o save continua
    let dialog = await reloadAndPickProfile(page);
    await dialog.locator('.swal2-deny').click();
    await expect(dialog).toContainText('será apagado');
    await dialog.locator('.swal2-cancel').click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#main-menu')).toBeVisible();
    expect(await hasSave()).toBe(true);

    // "Novo jogo" confirmado: jogo do zero, com o tutorial, e o save antigo some
    dialog = await reloadAndPickProfile(page);
    await dialog.locator('.swal2-deny').click();
    await dialog.locator('.swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'tutorial', null, { timeout: 45000 });
    await expect(page.locator('#tutorial-container')).toBeVisible();
    expect(await page.evaluate(() => window.gameManager.buildingSystem.buildings.size)).toBe(0);
    expect(await hasSave()).toBe(false);
    expect(problems).toEqual([]);
});

test('save danificado: avisa com calma e começa um jogo novo', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(id => localStorage.setItem(SaveSystem.keyFor(id), '{"format":"guardiao_agua_save", quebrado'), TEST_PROFILE.id);

    await page.goto('/index.html');
    await page.click(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    const dialog = page.locator('.swal2-popup.game-swal');
    await expect(dialog).toContainText('danificado');
    await dialog.locator('.swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'tutorial', null, { timeout: 45000 });
    expect(await page.evaluate(id => new SaveSystem().hasSave(id), TEST_PROFILE.id)).toBe(false);
    expect(problems).toEqual([]);
});
