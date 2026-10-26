const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Smoke de regressão: boot → novo jogo → construir → salvar/carregar → UI, e o fluxo do tutorial.
// Qualquer erro de JS, console.error, diálogo nativo ou asset 4xx/falho entra em `problems`.
function watchProblems(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    // alert/confirm nativos travam a página: o jogo usa gameAlert/gameConfirm (SweetAlert2)
    page.on('dialog', d => { problems.push(`diálogo nativo: ${d.message()}`); d.dismiss(); });
    // ERR_ABORTED = Chromium cancelando range request de mídia, não arquivo faltando (404 cai no 'response')
    page.on('requestfailed', r => {
        const err = r.failure()?.errorText;
        if (err !== 'net::ERR_ABORTED') problems.push(`requestfailed: ${r.url()} (${err})`);
    });
    const requested = new Set();
    page.on('request', r => requested.add(new URL(r.url()).pathname));
    page.on('response', r => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
    return { problems, requested };
}

test('jogo roda de ponta a ponta sem erros', async ({ page }) => {
    const { problems, requested } = watchProblems(page);

    await startGame(page);
    // O jogo fica congelado até o tutorial acabar (o fluxo dele tem teste próprio no smoke)
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await expect(page.locator('#game-canvas')).toBeVisible();
    await expect(page.locator('#game-hud')).toBeVisible();

    // Construir num lugar livre e conferir que o orçamento caiu
    const built = await page.evaluate(() => {
        const gm = window.gameManager;
        const budget = () => gm.resourceManager.resources.budget.current;
        const before = budget();
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (gm.buildingSystem.canPlaceBuilding(x, z, 'water_well').canPlace) {
                const b = gm.buildingSystem.placeBuilding(x, z, 'water_well');
                return { ok: !!b, before, after: budget(), count: gm.buildingSystem.buildings.size };
            }
        }
        return { ok: false };
    });
    expect(built.ok).toBe(true);
    expect(built.after).toBeLessThan(built.before);

    // Salvar e recarregar o mesmo estado
    const reloaded = await page.evaluate(() => {
        const gm = window.gameManager;
        gm.saveGame();
        const { data } = gm.saveSystem.load(PlayerProfile.getActive().id);
        gm.loadGame(data);
        return gm.buildingSystem.buildings.size;
    });
    expect(reloaded).toBe(built.count);

    // Painéis principais abrem
    await page.evaluate(() => {
        document.getElementById('btn-help').click();
        document.querySelector('.modal .close-btn, #help-modal .close-btn')?.click();
        document.querySelector('.category-btn')?.click();
    });

    // Confirmação no estilo do jogo: Menu Principal → modal → Cancelar mantém o jogo
    await page.evaluate(() => { window.gameManager.uiManager.returnToMainMenu(); }); // sem await: só resolve ao fechar
    const dialog = page.locator('.swal2-popup.game-swal');
    await expect(dialog).toBeVisible();
    await dialog.locator('.swal2-cancel').click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#game-screen')).toBeVisible();

    // Estudo educacional (imagens do building-studies.json)
    await page.evaluate(() => window.gameManager.studySystem.startStudy('water_pump'));

    // Deixar o loop rodar (CityLife, eventos, sons carregados tarde)
    await page.waitForTimeout(10000);

    // Game over (modelo 3D + diálogo próprios)
    await page.evaluate(() => window.gameManager.gameOverSystem.triggerGameOver('water_depleted'));
    await expect(page.locator('#gameover-container')).toBeVisible();
    await page.waitForTimeout(3000);
    expect(problems).toEqual([]);
    if (process.env.REQ_LOG) require('fs').appendFileSync(process.env.REQ_LOG, [...requested].join('\n') + '\n');
});

// Tutorial: o jogo só começa no fim; a prefeitura sai de um passo obrigatório (e grátis).
test('tutorial congela o jogo e guia a construção da prefeitura', async ({ page }) => {
    const { problems } = watchProblems(page);
    await startGame(page);

    const tutorial = page.locator('#tutorial-container');
    const next = page.locator('#tutorial-next-btn');
    const skip = page.locator('#tutorial-skip-btn');
    await expect(tutorial).toBeVisible();
    await expect(tutorial).toHaveClass(/tutorial--story/);

    // Congelado: sem prefeitura automática e o tempo não anda
    const before = await page.evaluate(() => ({
        state: window.gameManager.gameState,
        time: window.gameManager.gameTime,
        halls: window.gameManager.buildingSystem.getBuildingsByType('city_hall').length
    }));
    expect(before).toEqual({ state: 'tutorial', time: 0, halls: 0 });
    // Retrato animado da Cláudia (SVG em camadas, imagens locais): sem cena 3D
    const portrait = page.locator('#tutorial-portrait .aportrait');
    await expect(portrait).toBeVisible();
    await expect(portrait).toHaveAttribute('data-character', 'claudia');
    expect(await page.evaluate(() => window.gameManager.gameTime)).toBe(0);

    // Abertura curta e obrigatória: a primeira ação (a Prefeitura) vem logo, a pergunta das aulas fica para depois
    await expect(page.locator('#tutorial-title')).toHaveText('Olá, Teste!');
    await expect(skip).toBeHidden();
    await next.click();

    // Prefeitura: modo coach, sem "pular" e com "próximo" travado
    await expect(tutorial).toHaveClass(/tutorial--coach/);
    await expect(skip).toBeHidden();
    await expect(next).toBeDisabled();

    const placed = await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.uiManager.selectBuildingType('water_pump'); // travado pelo tutorial
        const blocked = !bs.previewMode;
        gm.enterBuildMode('city_hall');
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (bs.canPlaceBuilding(x, z, 'city_hall').canPlace) {
                const ok = bs.confirmPlacement(x, z);
                gm.exitBuildMode();
                const hall = bs.getBuildingsByType('city_hall')[0];
                return { blocked, ok, active: hall?.active, free: gm.resourceManager.resources.budget.current === GAME_CONFIG.resources.initialBudget };
            }
        }
        return { blocked };
    });
    expect(placed).toEqual({ blocked: true, ok: true, active: true, free: true });
    await expect(page.locator('#tutorial-title')).toHaveText('Prefeitura construída!');
    await expect(next).toBeEnabled();

    await next.click();
    await expect(page.locator('#tutorial-title')).toHaveText('Cuidado com as árvores');
    await next.click();

    // Depois da Prefeitura: escolhe "aprender agora", ouve um trecho e pula o resto das aulas (passam a vir uma por missão)
    await expect(tutorial).toHaveClass(/tutorial--story/);
    await expect(page.locator('#tutorial-title')).toHaveText('Hora de aprender sobre a água?');
    await expect(next).toHaveText('Aprender agora');
    await expect(skip).toHaveText('Durante o jogo');
    await next.click();
    await page.locator('#tutorial-read-btn').click();
    await skip.click();

    // Partes opcionais: pula missões e interface; o final é obrigatório
    await expect(page.locator('#tutorial-title')).toHaveText('Quer conhecer as missões?');
    await skip.click();
    await expect(page.locator('#tutorial-title')).toHaveText('Um tour pela tela?');
    await skip.click();
    await expect(tutorial).toHaveClass(/tutorial--story/);
    await expect(skip).toBeHidden();
    // Final: a Pesquisadora Márcia troca de retrato animado, todas as camadas vindas de assets/characters/marcia/
    await expect(page.locator('#tutorial-character-name')).toHaveText('Pesquisadora Márcia');
    await expect(portrait).toHaveAttribute('data-character', 'marcia');
    expect(await portrait.locator('image').evaluateAll(images => images.map(i => i.getAttribute('href'))
        .filter(href => !href.startsWith('assets/characters/marcia/')))).toEqual([]);
    // Todo passo tem personagem com retrato no manifesto (nenhum retrato vem da rede)
    expect(await page.evaluate(() => window.gameManager.tutorialSystem.tutorialSteps
        .filter(s => !PORTRAIT_MANIFEST[TutorialSystem.CHARACTERS[s.character]?.id])
        .map(s => s.title))).toEqual([]);
    await next.click();
    await next.click();
    // O Secretário Paulo se apresenta (quem avisa dos eventos e dos alertas ambientais)
    await expect(page.locator('#tutorial-character-name')).toHaveText('Secretário Paulo');
    await expect(portrait).toHaveAttribute('data-character', 'paulo');
    await next.click();
    // A Cláudia volta, feliz no recado final
    await expect(page.locator('#tutorial-character-name')).toHaveText('Pesquisadora Cláudia');
    await expect(portrait).toHaveAttribute('data-character', 'claudia');
    await expect(portrait.locator('[data-layer="happy"]')).toHaveClass(/(^|\s)on(\s|$)/);
    await expect(next).toHaveText('Começar a jogar!');
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('tutorial');
    await next.click();

    await expect(tutorial).toBeHidden();
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('playing');
    await page.waitForFunction(() => window.gameManager.gameTime > 0);

    // Missão concluída → a próxima aula (a 1, só vista pela metade) abre sozinha no livro, com o jogo pausado
    await page.evaluate(() => window.gameManager.questSystem.completeQuest('tutorial_01'));
    // Primeiro a comemoração (cartão com estrelas); a aula espera ele fechar
    await expect(page.locator('#mission-card')).toBeVisible();
    await page.locator('#mission-card-ok').click();
    const book = page.locator('#lesson-book');
    await expect(book).toBeVisible({ timeout: 10000 });
    await expect(book.locator('.book-chapter')).toContainText('Aula 1');
    await page.waitForFunction(() => !window.gameManager.isSimulationRunning());
    await book.locator('.book-close').click();
    await expect(book).toBeHidden();
    await page.waitForFunction(() => window.gameManager.isSimulationRunning());

    // Menu do jogador → 📚 Aulas e estudos abre a central de aulas: escolher o tema abre o livro, e a última página conclui a aula
    await page.evaluate(() => {
        document.getElementById('player-chip').click();
        document.querySelector('#player-menu [data-player-action="lessons"]').click();
    });
    const hub = page.locator('#lessons-hub');
    await expect(hub.locator('.lesson-card')).toHaveCount(6);
    await hub.locator('.lesson-card[data-chapter="1"]').click();
    // Vira página por página esperando a animação acabar (clique no meio da virada é ignorado)
    const pages = await book.locator('.book-dot').count();
    for (let i = 1; i < pages; i++) {
        await book.locator('.book-next').click();
        await expect(book.locator('.book-dot').nth(i)).toHaveClass(/current/);
        await expect(book.locator('.book-right')).not.toHaveClass(/turn-/);
    }
    await expect(book.locator('.book-next')).toHaveText('✓ Concluir aula');
    await book.locator('.book-next').click();
    await expect(hub.locator('.lesson-card[data-chapter="1"]')).toHaveClass(/done/);
    await expect(hub.locator('.lessons-progress')).toContainText('1 de 6');
    await hub.locator('.lessons-close').click();
    await expect(hub).toBeHidden();
    expect(problems).toEqual([]);
});
