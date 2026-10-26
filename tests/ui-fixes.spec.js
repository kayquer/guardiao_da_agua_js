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

// Câmera: limites iguais nos 4 lados do mapa (centrado em 0) e girar muitas voltas não quebra a câmera.
// Antes os limites eram -20..60 (parava antes da borda em dois lados) e o ângulo passava do limite da
// validação depois de ~1,5 volta: a "recuperação" punha alpha = Infinity e o circuit breaker parava o render.
test('câmera: chega à borda nos 4 lados e gira várias voltas sem travar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mouse');
    const problems = watchErrors(page);
    await playing(page);
    const edges = await page.evaluate(() => {
        const c = window.gameManager.cameraControls;
        const half = GAME_CONFIG.grid.size * GAME_CONFIG.grid.cellSize / 2;
        return [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([x, z]) => {
            c.targetPosition.set(x * 1000, 0, z * 1000);
            c.enforceTargetBounds();
            return { reach: Math.abs(x ? c.targetPosition.x : c.targetPosition.z), half };
        });
    });
    for (const e of edges) expect(e.reach).toBeGreaterThanOrEqual(e.half);
    expect(new Set(edges.map(e => e.reach)).size).toBe(1); // mesma folga nos 4 lados

    // Botão do meio arrastando para o lado, muitas vezes (≈ 6 voltas)
    const box = await page.locator('#game-canvas').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 100, y);
    await page.mouse.down({ button: 'middle' });
    for (let i = 0; i < 12; i++) {
        await page.mouse.move(box.x + box.width - 100, y, { steps: 4 });
        await page.mouse.move(box.x + 100, y, { steps: 1 });
    }
    await page.mouse.up({ button: 'middle' });
    await page.evaluate(() => { const c = window.gameManager.cameraControls; c.targetAlpha += 40; });
    await page.waitForTimeout(800);
    const state = await page.evaluate(() => {
        const gm = window.gameManager;
        return {
            alpha: gm.camera.alpha, target: gm.cameraControls.targetAlpha,
            sameCamera: gm.cameraControls.camera === gm.camera,
            breaker: gm.renderState.circuitBreakerActive, corruptions: gm.renderState.corruptionCount,
            valid: gm.validateCameraStateWithBreaker()
        };
    });
    expect(Number.isFinite(state.alpha)).toBe(true);
    expect(Math.abs(state.target)).toBeLessThanOrEqual(Math.PI + 1e-9);
    expect(state).toMatchObject({ sameCamera: true, breaker: false, corruptions: 0, valid: true });
    expect(problems).toEqual([]);
});

test('velocidade: um botão só abre o menu 1x/2x/3x; escolher muda o jogo e fecha; Esc e clique fora fecham', async ({ page }, testInfo) => {
    const problems = watchErrors(page);
    await playing(page);
    if (testInfo.project.name === 'mobile') {
        await page.evaluate(() => document.querySelector('.control-buttons').classList.add('mobile-visible'));
    }
    await expect(page.locator('.speed-btn')).toHaveCount(1);
    const btn = page.locator('#btn-speed');
    const menu = page.locator('#speed-menu');
    await expect(btn).toContainText('1x');
    await expect(menu).toBeHidden();

    await btn.click();
    await expect(menu).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await menu.locator('[data-speed="3"]').click();
    await expect(menu).toBeHidden();
    await expect(btn).toContainText('3x');
    expect(await page.evaluate(() => window.gameManager.timeScale)).toBe(3);
    await expect(menu.locator('[data-speed="3"]')).toHaveAttribute('aria-checked', 'true');

    await btn.click();
    await expect(menu).toBeVisible();
    // fora do menu (no canvas o clique poderia abrir o painel do terreno por cima do botão)
    await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await expect(menu).toBeHidden();

    if (testInfo.project.name !== 'mobile') {
        await btn.click();
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden();
        expect(await page.evaluate(() => window.gameManager.getGameState())).toBe('playing'); // Esc não pausou
    }
    expect(problems).toEqual([]);
});

test('estudo aprovado: o livro espera o clique e "Ver o prédio liberado" fecha e abre o prédio', async ({ page }) => {
    const problems = watchErrors(page);
    await playing(page);
    await page.waitForFunction(() => window.gameManager.studySystem.contentLoaded);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.uiManager.openStudyBook('monitoring_station');
        const ss = gm.studySystem;
        ss.currentPage = ss.getStudyContent(ss.currentStudy).pages.length - 1;
        gm.uiManager.showStudyBookInterface(ss.getStudyContent(ss.currentStudy));
        ss.getQuiz().questions.forEach((q, i) => ss.submitQuizAnswer(q.id ?? i, q.correctAnswer));
    });
    await page.locator('#study-book-overlay .complete-btn').click();
    await expect(page.locator('.quiz-results.quiz-passed')).toBeVisible();
    const finish = page.locator('#study-book-overlay .study-finish-btn');
    await expect(finish).toBeVisible();
    await page.waitForTimeout(3000); // não fecha sozinho (era um temporizador de 2,5 s)
    await expect(page.locator('#study-book-overlay')).toBeVisible();
    await finish.click();
    await expect(page.locator('#study-book-overlay')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.gameManager.uiManager.isBuildModalOpen())).toBe(true);
    expect(await page.evaluate(() => window.gameManager.studySystem.isBuildingUnlocked('monitoring_station'))).toBe(true);
    expect(problems).toEqual([]);
});

test('menu do jogador: o nome abre o menu; cada item abre o seu painel; aulas saíram do topo', async ({ page }, testInfo) => {
    const problems = watchErrors(page);
    await playing(page);
    await expect(page.locator('#btn-lessons')).toHaveCount(0);
    const menu = page.locator('#player-menu');
    const open = async () => {
        await page.click('#player-chip');
        await expect(menu).toBeVisible();
        await expect(page.locator('#player-chip')).toHaveAttribute('aria-expanded', 'true');
    };
    const pick = action => menu.locator(`[data-player-action="${action}"]`).click();
    const resume = async () => {
        await page.evaluate(() => window.gameManager.resumeGame());
        await expect(page.locator('#pause-overlay')).toBeHidden();
    };

    await open();
    await expect(menu.locator('[data-player-action]')).toHaveText(['Perfil e pausa', 'Aulas e estudos', 'Conquistas', 'Configurações', 'Notificações', 'Dados da pesquisa', 'Salvar jogo']);
    await pick('pause');
    await expect(menu).toBeHidden();
    await expect(page.locator('#pause-overlay')).toBeVisible();
    await expect(page.locator('#pp-name')).toHaveText('Teste');
    await resume();

    for (const [action, panel] of [['achievements', '#achievements-panel'], ['settings', '#settings-panel'], ['notifications', '#notification-history'], ['research', '#research-panel']]) {
        await open();
        await pick(action);
        await expect(page.locator(panel), action).toBeVisible();
        expect(await page.evaluate(() => window.gameManager.gameState), action).toBe('paused');
        await resume();
    }

    await open();
    await pick('lessons');
    await expect(page.locator('#lessons-hub')).toBeVisible();
    await page.evaluate(() => window.gameManager.uiManager.closeLessonsHub());
    await page.waitForFunction(() => window.gameManager.gameState === 'playing');
    await open();
    await pick('save');
    await expect(page.locator('#toast-stack')).toContainText('Jogo salvo');
    expect(await page.evaluate(() => !!localStorage.getItem(`guardiao_agua_save_${PlayerProfile.getActive().id}`))).toBe(true);

    if (testInfo.project.name !== 'mobile') {
        await open();
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden();
        expect(await page.evaluate(() => window.gameManager.gameState)).toBe('playing'); // Esc só fechou o menu
    }
    expect(problems).toEqual([]);
});

test('painel da direita tem ✕ que fecha (como o Esc); construir fora do tutorial não dá erro', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'no mobile a gaveta tem o próprio ✕');
    const problems = watchErrors(page);
    await playing(page);
    await page.evaluate(() => window.gameManager.uiManager.showResourcePanel('water'));
    await expect(page.locator('.hud-right')).toBeVisible();
    await page.click('#hud-right-close');
    await expect(page.locator('.hud-right')).toBeHidden();

    // Antes: TutorialSystem.onBuildingPlaced lia steps[...] com steps vazio fora do tutorial
    const placed = await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.steps = undefined;
        const bs = gm.buildingSystem;
        gm.resourceManager.resources.budget.current = 1e6;
        for (let x = 0; x < 39; x++) for (let z = 0; z < 39; z++) {
            if (!bs.canPlaceBuilding(x, z, 'paved_road', { quiet: true }).canPlace) continue;
            bs.buildingCooldown.active = false;
            return !!bs.placeBuilding(x, z, 'paved_road');
        }
        return false;
    });
    expect(placed).toBe(true);
    expect(problems).toEqual([]);
});
