const { test, expect } = require('@playwright/test');
const { TEST_PROFILE, mockExternalApis, startGame } = require('./helpers');

// Ajustes de interface: Esc fecha o painel da direita, clique no relógio, cadastro com a rede travada,
// partida sem volta não continua e a câmera anda relativa a para onde olha.
function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('dialog', d => d.type() === 'beforeunload' ? d.accept() : d.dismiss());
    return problems;
}

async function playing(page) {
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
}

test('Esc fecha o painel da direita (recurso) sem pausar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'no mobile o Esc já fecha as gavetas');
    const problems = watchErrors(page);
    await playing(page);
    await page.evaluate(() => window.gameManager.uiManager.showResourcePanel('water'));
    await expect(page.locator('.hud-right')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.hud-right')).toBeHidden();
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('playing');
    // Agora sem nada aberto: o Esc pausa
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('paused');
    expect(problems).toEqual([]);
});

test('clicar no texto do relógio (não só no balão do clima) abre a previsão', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'no mobile o item é o #compact-weather');
    const problems = watchErrors(page);
    await playing(page);
    const box = await page.locator('#game-clock .clock-time').boundingBox();
    // Clique lento: o relógio é atualizado a cada 100 ms no meio do mousedown/mouseup
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300);
    await page.mouse.up();
    await expect(page.locator('#weather-modal')).toBeVisible();
    expect(problems).toEqual([]);
});

test('cadastro: geocodificação travada não segura o início do jogo (limite de 5 s)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    const problems = watchErrors(page);
    await mockExternalApis(page);
    await page.route('https://geocoding-api.open-meteo.com/**', () => { /* nunca responde */ });
    await page.goto('/index.html');
    await page.click('#btn-new-game');
    await page.fill('#profile-name', 'Ana');
    await page.fill('#profile-age', '12');
    await page.selectOption('#profile-uf', 'SP');
    await expect(page.locator('#profile-city')).toBeEnabled();
    await page.fill('#profile-city', 'Campinas');
    const t0 = Date.now();
    await page.click('#btn-profile-start');
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });
    // 5 s de limite + a montagem do jogo
    expect(Date.now() - t0).toBeLessThan(25000);
    const profile = await page.evaluate(() => PlayerProfile.getActive());
    expect(profile.lat).toBeNull();
    expect(problems).toEqual([]);
});

test('partida sem volta (água quase no fim) não oferece "Continuar"', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    const problems = watchErrors(page);
    await playing(page);
    // Autosave normal e depois a água quase no fim, gravada direto no save
    await page.evaluate(id => {
        window.gameManager.autoSave();
        const key = SaveSystem.keyFor(id);
        const envelope = JSON.parse(localStorage.getItem(key));
        envelope.game.resources.resources.water.current = envelope.game.resources.resources.water.max * 0.02;
        localStorage.setItem(key, JSON.stringify(envelope));
    }, TEST_PROFILE.id);
    // A água quase no fim também não sobrescreve o save
    expect(await page.evaluate(() => {
        const w = window.gameManager.resourceManager.resources.water;
        w.current = w.max * 0.01;
        return window.gameManager.autoSave();
    })).toBe(false);

    await page.goto('/index.html');
    await page.click(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    const dialog = page.locator('.swal2-popup.game-swal');
    await expect(dialog).toContainText('não tem mais volta');
    await expect(dialog.locator('.swal2-deny')).toBeHidden(); // sem "Novo jogo/Continuar": só o aviso
    await dialog.locator('.swal2-confirm').click();
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });
    expect(await page.evaluate(id => localStorage.getItem(SaveSystem.keyFor(id)), TEST_PROFILE.id)).toBeNull();
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('tutorial');
    expect(problems).toEqual([]);
});

test('câmera: "para a direita" anda para a direita de quem olha, com a câmera virada', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'teclado');
    const problems = watchErrors(page);
    await playing(page);
    // Direto nos métodos (um centerCameraOn atrasado do jogo mexeria no alvo no meio de um teste por tempo)
    const moves = await page.evaluate(() => {
        const c = window.gameManager.cameraControls;
        return [Math.PI / 4, -3 * Math.PI / 4, Math.PI, -Math.PI / 4].map(alpha => {
            c.camera.alpha = c.targetAlpha = alpha;
            const step = (fn) => {
                c.targetPosition.set(20, 0, 20);
                fn();
                return { dx: c.targetPosition.x - 20, dz: c.targetPosition.z - 20 };
            };
            const key = step(() => { c.keys.d = true; c.updateKeyboardMovement(0.1); c.keys.d = false; });
            const drag = step(() => c.panCamera(-40, 0, c.config.panSensitivity)); // arrastar para a esquerda
            const edge = step(() => c.moveRelativeToView(0, 1)); // borda de cima
            return { alpha, key, drag, edge };
        });
    });
    for (const { alpha, key, drag, edge } of moves) {
        // direita da tela no chão = (-sin α, cos α); frente = (-cos α, -sin α)
        const right = v => v.dx * -Math.sin(alpha) + v.dz * Math.cos(alpha);
        const forward = v => v.dx * -Math.cos(alpha) + v.dz * -Math.sin(alpha);
        const at = `α=${alpha.toFixed(2)}`;
        expect(right(key), at).toBeGreaterThan(0.5);
        expect(Math.abs(forward(key)), at).toBeLessThan(1e-6);
        expect(right(drag), at).toBeGreaterThan(0.1);
        expect(Math.abs(forward(drag)), at).toBeLessThan(1e-6);
        expect(forward(edge), at).toBeCloseTo(1, 5);
    }
    // No ângulo inicial (-π/4) o comportamento é o de antes: W anda para (-0,707; +0,707)
    const initial = moves.find(m => Math.abs(m.alpha + Math.PI / 4) < 1e-9);
    expect(initial.edge.dx).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(initial.edge.dz).toBeCloseTo(Math.SQRT1_2, 5);
    expect(problems).toEqual([]);
});
