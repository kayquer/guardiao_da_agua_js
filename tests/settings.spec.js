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

test('dificuldade nas Configurações: eventos mudam na hora, o caixa não, fica no perfil e vale depois de carregar o save', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    const before = await page.evaluate(() => ({
        id: window.gameManager.difficulty.id,
        budget: window.gameManager.resourceManager.resources.budget.current
    }));
    expect(before.id).toBe('normal'); // perfil de teste sem escolha = Normal
    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-settings');
    await expect(page.locator('#pause-difficulty [data-difficulty="normal"]')).toHaveAttribute('aria-checked', 'true');
    await page.click('#pause-difficulty [data-difficulty="hard"]');
    await expect(page.locator('#pause-difficulty [data-difficulty="hard"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#pause-difficulty .difficulty-hint')).toContainText('próximo jogo novo');
    const after = await page.evaluate(() => ({
        id: window.gameManager.difficulty.id,
        events: window.gameManager.eventSystem.difficultyMultiplier,
        budget: window.gameManager.resourceManager.resources.budget.current,
        profile: PlayerProfile.getActive().difficulty,
        logged: ResearchLog.entry().events.some(e => e.type === 'difficulty' && e.value === 'hard')
    }));
    expect(after).toEqual({ id: 'hard', events: 1.4, budget: before.budget, profile: 'hard', logged: true });

    // Save gravado ANTES da troca (multiplicador 1.0): ao carregar, quem manda é o perfil
    await page.evaluate(() => {
        const gm = window.gameManager;
        const data = gm.getSaveData();
        data.events.difficultyMultiplier = 1.0;
        gm.loadGame(data);
    });
    await expect.poll(() => page.evaluate(() => window.gameManager.eventSystem.difficultyMultiplier)).toBe(1.4);
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
        saved: localStorage.getItem(STORAGE_PREFIX + 'climate'),
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

test('onde o botão tem som próprio, o clique padrão não toca junto (nem em clique duplo rápido)', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => {
        const am = AudioManager.instance;
        window.playedSounds = [];
        const orig = am.playSound.bind(am);
        am.playSound = (key, ...rest) => { window.playedSounds.push(key); return orig(key, ...rest); };
        window.gameManager.pauseGame();
    });
    // Configurações tem som próprio (abrir painel); o segundo clique cai no intervalo mínimo do som e antes
    // virava o clique padrão por cima
    await page.click('#btn-settings');
    await page.evaluate(() => window.gameManager.uiManager.closeSettingsPanel({ focus: false })); // Voltar não tem som próprio
    await page.click('#btn-settings');
    await page.waitForTimeout(200);
    const played = await page.evaluate(() => window.playedSounds);
    expect(played).toContain('sfx_panel_open');
    expect(played).not.toContain('sfx_click');
    expect(errors).toEqual([]);
});

// ===== Acessibilidade de loja: 0,5x, teclas trocáveis, daltonismo, tela cheia e controle =====

test('velocidade 0,5x: no menu e na tecla 0; o botão mostra "0,5x" com cor própria e o jogo anda pela metade', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'atalhos de teclado são do computador');
    const errors = watchErrors(page);
    await start(page);
    const btn = page.locator('#btn-speed');
    await btn.click();
    const slow = page.locator('#speed-menu [data-speed="0.5"]');
    await expect(slow).toBeVisible();
    await expect(page.locator('#speed-menu .speed-option').first()).toHaveAttribute('data-speed', '0.5'); // antes do 1x
    await slow.click();
    expect(await page.evaluate(() => window.gameManager.timeScale)).toBe(0.5);
    await expect(btn).toContainText('0,5x');
    await expect(btn).toHaveClass(/\bslow\b/);
    await expect(btn).not.toHaveClass(/\bactive\b/);
    await expect(slow).toHaveAttribute('aria-checked', 'true');
    // O relógio de jogo anda pela metade do tempo real
    const advanced = await page.evaluate(() => new Promise(resolve => {
        const gm = window.gameManager;
        const t0 = gm.gameTime, r0 = performance.now();
        setTimeout(() => resolve((gm.gameTime - t0) / (performance.now() - r0)), 1000);
    }));
    expect(advanced).toBeGreaterThan(0.3);
    expect(advanced).toBeLessThan(0.65);
    // Teclas: 3 acelera (destaque), 0 volta ao 0,5x
    await page.keyboard.press('Digit3');
    await expect(btn).toHaveClass(/\bactive\b/);
    await page.keyboard.press('Digit0');
    expect(await page.evaluate(() => window.gameManager.timeScale)).toBe(0.5);
    await expect(btn).toHaveAttribute('title', /0, 1, 2 e 3/);
    expect(errors).toEqual([]);
});

test('teclas: trocar a de mover a câmera funciona na hora, avisa conflito, aparece em Controles e volta ao padrão', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'teclado é do computador');
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-settings');
    const keys = page.locator('#pause-keys');
    await expect(keys).toBeVisible();
    const forward = keys.locator('.key-btn[data-action="camForward"][data-slot="0"]');
    await expect(forward).toContainText('W');
    await expect(keys.locator('.key-btn[data-action="cancel"][data-slot="0"]')).toBeDisabled(); // Esc fixo

    // Esc cancela a captura sem fechar o painel
    await forward.click();
    await expect(forward).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-panel')).toBeVisible();
    await expect(forward).toContainText('W');

    // Tecla nova: I
    await forward.click();
    await page.keyboard.press('KeyI');
    await expect(forward).toContainText('I');
    await expect(page.locator('#keys-status')).toContainText('agora é');
    expect(await page.evaluate(() => InputBindings.actionFor('KeyI'))).toBe('camForward');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem(InputBindings.STORAGE_KEY)).camForward[0])).toBe('KeyI');

    // Conflito: Q era de girar à esquerda
    await keys.locator('.key-btn[data-action="camReset"][data-slot="1"]').click();
    await page.keyboard.press('KeyQ');
    await expect(page.locator('#keys-status')).toContainText('ficou sem essa tecla');
    await expect(keys.locator('.key-btn[data-action="rotateLeft"][data-slot="0"]')).toContainText('—');

    // Reservada: Tab não pode (e a captura continua esperando até o Esc)
    await keys.locator('.key-btn[data-action="pause"][data-slot="1"]').click();
    await page.keyboard.press('Tab');
    await expect(page.locator('#keys-status')).toContainText('não pode ser usada');
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-panel')).toBeVisible();

    // De volta ao jogo: I move a câmera, W não
    await page.click('#btn-settings-back');
    await page.evaluate(() => window.gameManager.resumeGame());
    const target = () => page.evaluate(() => {
        const p = window.gameManager.cameraControls.targetPosition;
        return { x: p.x, z: p.z };
    });
    const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    let before = await target();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyW');
    expect(dist(before, await target())).toBeLessThan(0.01);
    before = await target();
    await page.keyboard.down('KeyI');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyI');
    expect(dist(before, await target())).toBeGreaterThan(0.5);

    // Pausa → Controles mostra as teclas de agora e o controle
    await page.evaluate(() => window.gameManager.uiManager.showHelpModal());
    await expect(page.locator('#controls-desktop')).toContainText('Para trocar as teclas');
    await expect(page.locator('#controls-desktop kbd', { hasText: /^I$/ })).toHaveCount(1);
    await expect(page.locator('#controls-gamepad')).toContainText('Start');
    await page.evaluate(() => window.gameManager.uiManager.hideHelpModal());

    // Restaurar padrão
    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-settings');
    await page.click('#btn-keys-reset');
    await expect(forward).toContainText('W');
    expect(await page.evaluate(() => InputBindings.actionFor('KeyQ'))).toBe('rotateLeft');
    expect(errors).toEqual([]);
});

test('daltonismo: o modo põe o atributo no html, troca as cores de estado e do fantasma de obra e fica salvo', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-settings');
    const picker = page.locator('#pause-color');
    await expect(picker.locator('[data-color-mode="normal"]')).toHaveAttribute('aria-checked', 'true');
    const good = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--gda-good').trim());
    expect(await good()).toBe('#1d7a3e');
    await picker.locator('[data-color-mode="deutan"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'deutan');
    await expect(picker.locator('.color-hint')).toContainText('azul = bom');
    expect(await good()).not.toBe('#1d7a3e');
    expect(await page.evaluate(() => localStorage.getItem(ColorMode.STORAGE_KEY))).toBe('deutan');

    // Fantasma de obra: num lugar livre fica azul (não verde); num lugar proibido, laranja (não vermelho)
    await page.click('#btn-settings-back');
    await page.evaluate(() => window.gameManager.resumeGame());
    const colors = await page.evaluate(() => {
        const gm = window.gameManager;
        const bs = gm.buildingSystem;
        const size = bs.buildingTypes.get('water_tank').size || 1;
        gm.enterBuildMode('water_tank');
        let okCell = null, badCell = null;
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            const fits = bs.canPlaceBuilding(x, z, 'water_tank').canPlace;
            if (fits && !okCell && !gm.treeSystem?.countTreesInArea(x, z, size)) okCell = [x, z];
            if (!fits && !badCell) badCell = [x, z];
        }
        const read = () => bs.previewMesh.material.diffuseColor.asArray();
        bs.updatePreview(...okCell);
        const ok = read();
        bs.updatePreview(...badCell);
        const bad = read();
        gm.exitBuildMode();
        return { ok, bad };
    });
    expect(colors.ok[2]).toBeGreaterThan(colors.ok[1]); // mais azul que verde
    expect(colors.bad[2]).toBe(0);
    expect(colors.bad[1]).toBeGreaterThan(0.2); // laranja, não vermelho puro

    // Volta ao normal: sem atributo
    await page.evaluate(() => ColorMode.set('normal'));
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-color-mode'))).toBe(false);
    expect(errors).toEqual([]);
});

test('tela cheia: o botão nas Configurações não quebra (o navegador pode aceitar ou negar)', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-settings');
    const btn = page.locator('#btn-fullscreen');
    await expect(btn).toHaveText('Tela cheia');
    await btn.click();
    await page.waitForTimeout(300);
    await expect(btn).toHaveText(/Tela cheia|Sair da tela cheia/);
    if (await page.evaluate(() => !!document.fullscreenElement)) {
        await expect(btn).toHaveText('Sair da tela cheia');
        await btn.click();
        await expect(btn).toHaveText('Tela cheia');
    }
    await expect(page.locator('#settings-panel')).toBeVisible();
    expect(errors).toEqual([]);
});

test('controle: avisa ao conectar; Start pausa e continua, RB acelera, B cancela a obra como o Esc', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    const result = await page.evaluate(() => {
        const gm = window.gameManager;
        const input = gm.gamepadInput;
        const pad = down => ({ index: 0, connected: true, axes: [0, 0, 0, 0],
            buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })) });
        input.onConnected({ index: 0, id: 'Controle de teste' });
        const B = GamepadInput.BUTTON;
        const out = {};
        input.poll(1000, [pad([B.START])]);
        out.paused = gm.gameState;
        input.poll(1016, [pad([])]);
        input.poll(1032, [pad([B.START])]);
        out.resumed = gm.gameState;
        input.poll(1048, [pad([B.RB])]);
        out.speed = gm.timeScale;
        input.poll(1064, [pad([])]);
        gm.enterBuildMode('water_tank');
        input.poll(1080, [pad([B.B])]);
        out.buildMode = gm.buildMode;
        return out;
    });
    expect(result).toEqual({ paused: 'paused', resumed: 'playing', speed: 2, buildMode: false });
    await expect(page.locator('#toast-stack')).toContainText('Controle conectado');
    expect(errors).toEqual([]);
});
