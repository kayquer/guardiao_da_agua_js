const { test, expect } = require('@playwright/test');
const { mockExternalApis, startGame } = require('./helpers');

// Jogador (perfil, clima, tela de perfil/pausa), pausa de verdade, cancelar construção, aulas e o
// tutorial de missões que avança no clique. Qualquer erro de JS ou console.error reprova.
function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    page.on('dialog', d => { if (d.type() === 'beforeunload') return; problems.push(`diálogo nativo: ${d.message()}`); d.dismiss(); });
    return problems;
}

const gameTime = page => page.evaluate(() => window.gameManager.gameTime);

test('cadastro do jogador: valida, salva o perfil e usa nome, idade e cidade', async ({ page }) => {
    const problems = watchErrors(page);
    await mockExternalApis(page);
    await page.goto('/index.html');

    // Sem perfis salvos: a lista não aparece e "Novo Jogador" abre o cadastro
    await expect(page.locator('#profile-section')).toBeHidden();
    await page.click('#btn-new-game');
    await expect(page.locator('#profile-screen')).toBeVisible();
    await page.click('#btn-profile-start');
    await expect(page.locator('#profile-errors')).toContainText('nome');

    await page.fill('#profile-name', 'Ana');
    await page.fill('#profile-age', '9');
    await page.selectOption('#profile-uf', 'SP');
    await expect(page.locator('#profile-city')).toBeEnabled();
    await page.fill('#profile-city', 'Cidade Inventada');
    await page.click('#btn-profile-start');
    await expect(page.locator('#profile-errors')).toContainText('lista');
    await page.fill('#profile-city', 'campinas'); // sem maiúscula: casa com "Campinas" da lista do IBGE
    await page.click('#btn-profile-start');
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });

    const state = await page.evaluate(() => ({
        profile: PlayerProfile.getActive(),
        difficulty: window.gameManager.difficulty.id,
        budget: window.gameManager.resourceManager.resources.budget.current,
        initialBudget: GAME_CONFIG.resources.initialBudget
    }));
    expect(state.profile).toMatchObject({ name: 'Ana', age: 9, uf: 'SP', city: 'Campinas', lat: -22.9, lon: -47.06 });
    expect(state.difficulty).toBe('easy'); // até 10 anos
    expect(state.budget).toBe(Math.round(state.initialBudget * 1.3));
    await expect(page.locator('#player-name')).toHaveText('Ana');
    await expect(page.locator('#tutorial-title')).toContainText('Ana'); // {nome} nos textos do tutorial

    // Recarregar no meio da partida: o navegador avisa (beforeunload); aceitando, a tela inicial lista o perfil salvo
    const leaveWarnings = [];
    page.on('dialog', dialog => { leaveWarnings.push(dialog.type()); dialog.accept(); });
    await page.goto('/index.html');
    expect(leaveWarnings).toEqual(['beforeunload']);
    await expect(page.locator('.profile-card .profile-name')).toHaveText('Ana');
    await expect(page.locator('.profile-card .profile-meta')).toContainText('Campinas/SP');
    expect(problems).toEqual([]);
});

// Item validado de propósito: obras e missões usam o relógio do jogo (gameTime), que precisa parar
// no menu de pausa, com popup aberto e no tutorial — com Date.now() a obra "pulava" ao voltar.
test('pausa congela de verdade: menu de pausa, popups e aula rápida', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    // Uma obra em andamento e uma missão contando
    const building = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (bs.canPlaceBuilding(x, z, 'water_well').canPlace) {
                const b = bs.placeBuilding(x, z, 'water_well');
                b.constructionDuration = 60000;
                return b.id;
            }
        }
    });
    expect(building).toBeTruthy();
    await page.waitForFunction(() => window.gameManager.gameTime > 500);

    const frozen = async (label, open, close) => {
        await open();
        await page.waitForFunction(() => !window.gameManager.isSimulationRunning(), null, { timeout: 5000 });
        const t0 = await gameTime(page);
        await page.waitForTimeout(1200);
        expect(await gameTime(page), `${label}: gameTime não pode andar`).toBe(t0);
        expect(await page.evaluate(id => window.gameManager.buildingSystem.buildings.get(id).underConstruction, building)).toBe(true);
        await close();
        await page.waitForFunction(t => window.gameManager.gameTime > t + 200, t0, { timeout: 5000 });
    };

    // 1) Clique no nome → tela de perfil + pausa (com estatísticas e ajuda)
    await frozen('menu de pausa', async () => {
        await page.click('#player-chip');
        await expect(page.locator('#pause-overlay')).toBeVisible();
        await expect(page.locator('#pp-name')).toHaveText('Teste');
        await expect(page.locator('#pp-stats')).toContainText('Missões concluídas');
        await page.click('#btn-help');
        await expect(page.locator('#controls-modal')).toBeVisible();
        await page.click('#close-controls-modal');
    }, async () => {
        await page.click('#btn-resume');
        await expect(page.locator('#pause-overlay')).toBeHidden();
    });

    // 2) Popup informativo (clima) → pausa leve, sem menu de pausa, e o jogo volta sozinho ao fechar
    await expect(page.locator('#clock-weather .weather-temp')).toHaveText('22°');
    await frozen('popup do clima', async () => {
        await page.click('#clock-weather');
        await expect(page.locator('#weather-modal .weather-forecast .weather-day')).toHaveCount(5);
        await expect(page.locator('#soft-pause-badge')).toBeVisible();
        await expect(page.locator('#pause-overlay')).toBeHidden();
    }, async () => {
        await page.click('.weather-modal-close');
        await expect(page.locator('#soft-pause-badge')).toBeHidden();
    });

    // 3) Painel de recurso → "Aprender sobre a água" (aula rápida congela como o tutorial)
    await frozen('aula rápida', async () => {
        await page.evaluate(() => window.gameManager.uiManager.showResourcePanel('water'));
        await page.click('.topic-lesson-btn');
        await expect(page.locator('#tutorial-progress')).toContainText('Aula rápida · Água');
    }, async () => {
        await page.click('#tutorial-skip-btn'); // "Fechar aula"
        await expect(page.locator('#tutorial-container')).toBeHidden();
    });

    // O clima real (mock: chuva) chega ao mundo 3D
    expect(await page.evaluate(() => window.gameManager.weatherEffects?.profile.kind)).toBe('rain');
    expect(problems).toEqual([]);
});

test('Esc e o botão cancelam a construção', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'no mobile a escolha passa pelo painel "Construir"');
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.studySystem.isBuildingUnlocked = () => true;
    });
    const buildMode = () => page.evaluate(() => window.gameManager.buildMode);

    // Escolhe pelo menu (o foco fica no botão, fora do canvas) e cancela com Esc
    await page.evaluate(() => window.gameManager.uiManager.selectBuildingType('water_well'));
    await expect(page.locator('#cancel-build-btn')).toBeVisible();
    expect(await buildMode()).toBe(true);
    await page.keyboard.press('Escape');
    expect(await buildMode()).toBe(false);
    await expect(page.locator('#cancel-build-btn')).toHaveCount(0);

    // E pelo botão visível
    await page.evaluate(() => window.gameManager.uiManager.selectBuildingType('water_well'));
    await page.click('#cancel-build-btn');
    expect(await buildMode()).toBe(false);

    // Sem nada para cancelar ou fechar, o Esc abre a pausa (tela de perfil); outro Esc volta ao jogo
    await page.evaluate(() => {
        document.querySelectorAll('.swal2-container, .central-alert-overlay').forEach(el => el.remove());
        window.gameManager.uiManager.closeCurrentPanel?.();
    });
    await expect.poll(() => page.evaluate(() => window.gameManager.isIdleForEscPause())).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-overlay')).toBeVisible();
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('paused');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('playing');
    expect(problems).toEqual([]);
});

test('tutorial das missões avança quando o aluno clica no que está destacado', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'alvos do desktop (o mobile usa os mesmos passos com outros alvos)');
    const problems = watchErrors(page);
    await startGame(page);
    const title = page.locator('#tutorial-title');

    await page.click('#tutorial-skip-btn'); // aulas "durante o jogo"
    await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.enterBuildMode('city_hall');
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (bs.canPlaceBuilding(x, z, 'city_hall').canPlace) { bs.confirmPlacement(x, z); gm.exitBuildMode(); return; }
        }
    });
    await expect(title).toHaveText('Prefeitura construída!');
    await page.click('#tutorial-next-btn');
    await expect(title).toHaveText('Cuidado com as árvores');
    await page.click('#tutorial-next-btn');
    await expect(title).toHaveText('Quer conhecer as missões?');
    await page.click('#tutorial-next-btn'); // "Mostrar"

    await expect(title).toHaveText('O botão de Missões');
    await page.click('#btn-missions');
    await expect(title).toHaveText('Suas missões');
    await page.locator('.mission-card.simple').first().click();
    await expect(title).toHaveText('Os detalhes');
    await expect(page.locator('.mission-details .back-btn')).toBeVisible();
    await page.click('#tutorial-next-btn');
    // Meta "Construir X" é atalho: o clique leva ao prédio na aba de construções e avança
    await expect(title).toHaveText('Atalho para construir');
    await page.locator('.mission-details .mission-goal.goal-link').first().click();
    await expect(page.locator('.building-item.goal-highlight')).toHaveCount(1);
    await expect(title).toHaveText('A missão da vez');
    await page.click('.hud-bottom .mission-info');
    await expect(title).toHaveText('Um tour pela tela?');
    expect(problems).toEqual([]);
});

test('guias em sequência: água + energia → reservatório → zoneamento → públicos', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica; alvos do desktop');
    const problems = watchErrors(page);
    await startGame(page, { guides: [] });
    const title = page.locator('#tutorial-title');
    // Constrói direto (sem o modo de construção) e termina a obra na hora
    const build = (type, finish = true) => page.evaluate(({ type, finish }) => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (!bs.canPlaceBuilding(x, z, type).canPlace) continue;
            bs.buildingCooldown.active = false;
            const b = bs.placeBuilding(x, z, type);
            if (b && finish) bs.completeConstruction(b);
            // Alertas (ex.: falta de energia) seguram os guias até fechar
            document.querySelectorAll('.central-alert-overlay').forEach(el => el.remove());
            return !!b;
        }
        return false;
    }, { type, finish });
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 1e6;
    });

    // Água sem energia ainda não abre nada
    expect(await build('water_pump')).toBe(true);
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => window.gameManager.tutorialSystem.isActive)).toBe(false);
    const power = await page.evaluate(() => [...window.gameManager.buildingSystem.buildingTypes].find(([, t]) => t.powerGeneration > 0 && t.visible)[0]);
    expect(await build(power)).toBe(true);

    await expect(title).toHaveText('Água e energia funcionando!', { timeout: 8000 });
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('tutorial'); // congela enquanto ensina
    await page.click('#tutorial-next-btn');
    await expect(title).toHaveText('Construa um Reservatório');
    await expect(page.locator('#tutorial-next-btn')).toBeDisabled();
    const budget = () => page.evaluate(() => window.gameManager.resourceManager.resources.budget.current);
    const before = await budget();
    expect(await build('water_tank', false)).toBe(true);
    await expect(title).toHaveText('Reservatório em obra!');
    expect(await budget()).toBeLessThan(before); // obra do guia é paga (só a prefeitura é grátis)
    await page.click('#tutorial-next-btn');

    await expect(title).toHaveText('Onde as pessoas vão morar?', { timeout: 8000 });
    await page.click('#tutorial-next-btn');
    await expect(title).toHaveText('Crie uma zona residencial');
    expect(await build('zone_residential_light', false)).toBe(true); // qualquer zona serve
    await expect(title).toHaveText('Novos moradores a caminho');
    await page.click('#tutorial-next-btn');

    // Públicos só depois de uma zona pronta
    await page.waitForTimeout(4000);
    expect(await page.evaluate(() => window.gameManager.tutorialSystem.isActive)).toBe(false);
    await page.evaluate(() => {
        const bs = window.gameManager.buildingSystem;
        bs.getAllBuildings().filter(b => b.config.category === 'zoning').forEach(b => bs.completeConstruction(b));
    });
    await expect(title).toHaveText('Serviços para a população', { timeout: 8000 });
    await page.click('#tutorial-skip-btn'); // "Fazer depois" também conta como visto
    await expect(title).toHaveText('Visitantes trazem dinheiro', { timeout: 8000 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('guardiao_agua_guides')).p_teste))
        .toEqual(['storage', 'zoning', 'public']);
    expect(problems).toEqual([]);
});

test('bússola: o N aponta na tela para o norte do mapa (+z) em qualquer ângulo de câmera, e a seta mostra o vento', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma conta; basta um viewport');
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await expect(page.locator('#compass')).toBeVisible();
    for (const alpha of [-Math.PI / 4, 0, Math.PI / 3, Math.PI, 2.5]) {
        const result = await page.evaluate(async alpha => {
            const gm = window.gameManager, cam = gm.camera;
            gm.cameraControls.targetAlpha = alpha; // o controle suave converge para cá
            cam.alpha = alpha;
            await new Promise(r => setTimeout(r, 600)); // a câmera para de se mover
            gm.scene.updateTransformMatrix(true); // matriz do estado atual, não do último frame
            gm.uiManager.updateCompass();
            // Ângulo real na tela: projeta o alvo e um ponto 10 unidades ao norte (+z)
            const project = v => BABYLON.Vector3.Project(v, BABYLON.Matrix.Identity(), gm.scene.getTransformMatrix(),
                cam.viewport.toGlobal(gm.engine.getRenderWidth(), gm.engine.getRenderHeight()));
            const a = project(cam.target), b = project(cam.target.add(new BABYLON.Vector3(0, 0, 10)));
            const screen = Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI;
            const shown = Number(/rotate\((-?[\d.]+)/.exec(document.querySelector('.compass-rose').getAttribute('transform'))[1]);
            // A rosa gira no lugar: o centro dela continua no centro do mostrador
            const box = el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
            const rose = box(document.querySelector('.compass-pin')), dial = box(document.querySelector('.compass-face'));
            const roseCenter = box(document.querySelector('.compass-inner'));
            const offCenter = Math.hypot(rose.x - dial.x, rose.y - dial.y) + Math.hypot(roseCenter.x - dial.x, roseCenter.y - dial.y);
            const n = box(document.querySelector('.compass-letter--n'));
            const nDistance = Math.hypot(n.x - dial.x, n.y - dial.y);
            return { screen, shown, offCenter, nDistance, radius: document.querySelector('.compass-face').getBoundingClientRect().width / 2 };
        }, alpha);
        const diff = Math.abs(((result.screen - result.shown) % 360 + 540) % 360 - 180);
        expect(diff, `alpha ${alpha}: tela ${result.screen.toFixed(1)}° × bússola ${result.shown.toFixed(1)}°`).toBeLessThan(12);
        expect(result.nDistance, `alpha ${alpha}: o N saiu do mostrador`).toBeLessThan(result.radius);
    }
    // Clima simulado (chuva com vento): a seta do vento aparece com a velocidade
    await expect(page.locator('.compass-wind-label')).toContainText('km/h');
    expect(problems).toEqual([]);
});

test('bússola clicável: vira a câmera para o norte e, se já estiver no norte, para o sul', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica; basta um viewport');
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => {
        window.gameManager.tutorialSystem.complete();
        window.gameManager.cameraControls.targetAlpha = 7.3; // várias voltas acumuladas: deve girar pelo caminho curto
    });
    const north = () => page.evaluate(() => window.gameManager.uiManager.screenAngle({ x: 0, z: 1 }));
    const near = (angle, target) => Math.abs(((angle - target) % 360 + 540) % 360 - 180) < 3;
    await page.waitForTimeout(1500);
    await page.click('#compass');
    await expect.poll(async () => near(await north(), 0), { timeout: 8000 }).toBe(true);
    expect(Math.abs(await page.evaluate(() => window.gameManager.cameraControls.targetAlpha - 7.3))).toBeLessThanOrEqual(Math.PI);
    await page.waitForTimeout(400); // cooldown do clique
    await page.click('#compass');
    await expect.poll(async () => near(await north(), 180), { timeout: 8000 }).toBe(true);
    expect(problems).toEqual([]);
});

test('central de aulas: abas Como jogar / Conteúdo / Guias, refazer partes e fontes no fim da aula', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica; alvos do desktop');
    const problems = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => {
        window.gameManager.tutorialSystem.complete();
        window.gameManager.uiManager.openLessonsHub();
    });
    await expect(page.locator('.lessons-tab.active')).toHaveText('Conteúdo'); // o 📖 é um ícone SVG (ui-book)
    await expect(page.locator('.lessons-tab.active img.ui-icon[src$="ui-book.svg"]')).toBeVisible();
    await expect(page.locator('[data-chapter]')).toHaveCount(6);

    // Aula: páginas extras só do livro + fontes com link na última página
    await page.click('[data-chapter="5"]');
    const pages = await page.evaluate(() => window.gameManager.uiManager.lessonBook.pages.length);
    expect(pages).toBe(3); // 2 do tutorial + 1 só do livro
    await expect(page.locator('#lesson-book .book-sources')).toHaveCount(0);
    for (let i = 1; i < pages; i++) {
        await page.click('.book-next');
        await expect(page.locator(`.book-dot:nth-child(${i + 1}).current`)).toHaveCount(1);
        await expect(page.locator('.book-right[class*="turn-"]')).toHaveCount(0);
    }
    const links = page.locator('#lesson-book .book-sources a');
    expect(await links.count()).toBeGreaterThan(0);
    expect(await links.first().getAttribute('target')).toBe('_blank');
    await page.click('.book-close');

    // Como jogar: refaz o tour pela tela em cima do jogo (cartão pequeno, jogo congelado)
    await page.click('[data-lessons-tab="intro"]');
    await expect(page.locator('[data-replay="part"]')).toHaveCount(4);
    await page.click('[data-replay="part"][data-id="interface"]');
    await expect(page.locator('#tutorial-progress')).toContainText('Rever · Tour pela tela');
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('tutorial');
    await page.click('#tutorial-skip-btn'); // "Fechar"
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('playing');

    // Guias: os 6 guias da cidade + as aulas rápidas dos indicadores
    await page.evaluate(() => window.gameManager.uiManager.openLessonsHub(null, 'guides'));
    await expect(page.locator('[data-replay="guide"]')).toHaveCount(6);
    await expect(page.locator('[data-replay="topic"]')).toHaveCount(6);
    expect(problems).toEqual([]);
});
