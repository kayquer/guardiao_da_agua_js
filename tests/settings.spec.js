const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Rodada de 10/2026: painel ⚙️ Configurações na pausa, clima real/simulado, Shift para continuar construindo,
// estudo concluído abre a construção, um som só ao selecionar um prédio e os efeitos completos no painel do prédio.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const network = /Failed to fetch|Failed to load resource|net::ERR_/;
    page.on('console', m => { if (m.type() === 'error' && !network.test(m.text())) errors.push(m.text()); });
    return errors;
}

async function start(page) {
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 1e6;
    });
}

// Coloca e termina um prédio no primeiro lugar válido; devolve o id
async function build(page, type) {
    return page.evaluate(t => {
        const bs = window.gameManager.buildingSystem;
        bs.buildingCooldown.active = false;
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (bs.canPlaceBuilding(x, z, t).canPlace) {
                const b = bs.placeBuilding(x, z, t);
                bs.completeConstruction(b);
                return b.id;
            }
        }
        return null;
    }, type);
}

test('Configurações: gráficos, texto, clima e som num painel próprio; Esc volta para a pausa', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => window.gameManager.pauseGame());
    const panel = page.locator('#settings-panel');
    await expect(panel).toBeHidden();
    await expect(page.locator('#pause-gfx')).toBeHidden(); // saiu do painel do jogador
    await page.click('#btn-settings');
    await expect(panel).toBeVisible();
    await expect(page.locator('#pause-overlay .player-panel')).toBeHidden();
    for (const sel of ['#pause-gfx', '#pause-text', '#pause-climate', '#pp-sound']) {
        await expect(panel.locator(sel)).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('#pause-overlay .player-panel')).toBeVisible();
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('paused');
    expect(errors).toEqual([]);
});

test('clima simulado: escolhido nas Configurações, o jogo inventa o tempo e o popup avisa', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    expect(await page.evaluate(() => window.gameManager.uiManager.weather?.simulated)).toBeFalsy(); // padrão: real
    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-settings');
    await page.click('#pause-climate [data-climate="simulated"]');
    await expect(page.locator('#pause-climate [data-climate="simulated"]')).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => page.evaluate(() => window.gameManager.uiManager.weather?.simulated)).toBe(true);
    const state = await page.evaluate(() => ({
        saved: localStorage.getItem('guardiao_agua_climate'),
        days: window.gameManager.uiManager.weather.data.daily.length,
        profile: !!window.gameManager.weatherEffects?.profile
    }));
    expect(state).toEqual({ saved: 'simulated', days: 5, profile: true });

    await page.evaluate(() => { window.gameManager.resumeGame(); window.gameManager.uiManager.showWeatherModal(); });
    await expect(page.locator('#weather-modal h3')).toContainText('Clima simulado');
    await expect(page.locator('#weather-modal .weather-day')).toHaveCount(5);
    // Volta para o real
    await page.evaluate(() => SimulatedWeather.setMode('real'));
    await expect.poll(() => page.evaluate(() => window.gameManager.uiManager.weather?.simulated)).toBeFalsy();
    expect(errors).toEqual([]);
});

test('Shift ao clicar continua construindo o mesmo prédio; sem Shift o modo acaba', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Shift é do teclado do computador');
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => window.gameManager.enterBuildMode('water_tank'));
    await expect(page.locator('#build-shift-hint')).toContainText('Shift');
    // Acha duas células livres e projeta na tela para clicar de verdade
    const spots = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem, out = [];
        for (let x = 0; x < 40 && out.length < 2; x++) for (let z = 0; z < 40 && out.length < 2; z++) {
            if (bs.canPlaceBuilding(x, z, 'water_tank').canPlace && !gm.treeSystem.countTreesInArea(x, z, 1)
                && !out.some(([a, b]) => Math.abs(a - x) < 3 && Math.abs(b - z) < 3)) out.push([x, z]);
        }
        return out;
    });
    expect(spots.length).toBe(2);
    const place = (spot, keep) => page.evaluate(([[x, z], k]) => {
        const gm = window.gameManager;
        gm.buildingSystem.buildingCooldown.active = false;
        gm.pickTerrainCell = () => ({ x, z }); // o clique cai nesta célula
        gm.handleBuildingPlacement(0, 0, { keep: k });
        return gm.buildMode;
    }, [spot, keep]);
    expect(await place(spots[0], true)).toBe(true);   // com Shift: continua
    expect(await place(spots[1], false)).toBe(false); // sem Shift: sai
    await expect(page.locator('#build-shift-hint')).toHaveCount(0);
    expect(await page.evaluate(() => window.gameManager.buildingSystem.getBuildingsByType('water_tank').length)).toBe(2);
    expect(errors).toEqual([]);
});

test('estudo concluído abre o menu de construção já com aquele prédio', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => {
        const ui = window.gameManager.uiManager;
        window.gameManager.studySystem.currentStudy = 'water_tank';
        ui.continueAfterQuiz(); // mesmo caminho do aprovado: conclui, fecha o livro e abre o prédio
    });
    await expect(page.locator('#build-modal')).toBeVisible({ timeout: 4000 });
    await expect(page.locator('#build-info-construct')).toBeVisible();
    await expect(page.locator('.building-item.goal-highlight[data-building-type="water_tank"]')).toHaveCount(1);
    expect(errors).toEqual([]);
});

test('selecionar um prédio pronto toca um som só, e o painel mostra todos os efeitos', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'clique do mouse no prédio');
    const errors = watchErrors(page);
    await start(page);
    const id = await build(page, 'recycling_point');
    expect(id).toBeTruthy();
    const sounds = await page.evaluate(buildingId => {
        const gm = window.gameManager, played = [];
        const orig = { play: AudioManager.playSound, select: AudioManager.onSelect };
        AudioManager.playSound = key => { played.push(key); };
        AudioManager.onSelect = group => { played.push(`select:${group}`); };
        const b = gm.buildingSystem.buildings.get(buildingId);
        gm.pickBuildingFirst = () => ({ hit: true, pickedMesh: b.mesh });
        gm.handleBuildingSelection(0, 0);
        // re-render do painel (eficiência mudou): não repete o som
        gm.uiManager.showBuildingSelectionInfo(b);
        AudioManager.playSound = orig.play;
        AudioManager.onSelect = orig.select;
        return played;
    }, id);
    expect(sounds).toEqual(['select:waste']); // sem o clique genérico nem o "abrir painel" por cima
    const panel = page.locator('#details-content');
    await expect(panel).toContainText('Limpa a poluição');
    await expect(panel).toContainText('Satisfação');
    await expect(panel).toContainText('Manutenção');
    expect(errors).toEqual([]);
});
