const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Fase 3: registro de pesquisa (ResearchLog) com exportação na pausa ("📊 Dados da pesquisa"), tamanho do texto
// (TextSize) e sinais que não dependem só de cor (rótulo de lugar da obra, selos nos números do topo).

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const network = /Failed to fetch|Failed to load resource|net::ERR_/;
    page.on('console', m => { if (m.type() === 'error' && !network.test(m.text())) errors.push(m.text()); });
    return errors;
}

test('o registro de pesquisa guarda páginas, obras e decisões e é exportado em CSV e JSON sem o apelido', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    // Abertura do tutorial: a página e a primeira obra entram no registro
    await page.waitForTimeout(400);
    await page.click('#tutorial-next-btn');
    await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.enterBuildMode('city_hall');
        for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
            if (bs.canPlaceBuilding(x, z, 'city_hall').canPlace) { bs.confirmPlacement(x, z); gm.exitBuildMode(); return; }
        }
    });
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.eventSystem.announceEvent('drought');
    });
    await page.waitForSelector('#event-decision', { state: 'visible' });
    await page.evaluate(() => {
        const es = window.gameManager.eventSystem;
        const pending = es.pendingEvents.find(p => p.awaiting);
        es.chooseResponse(pending.id, 'none');
        window.gameManager.uiManager.closeEventDecision();
    });

    const types = await page.evaluate(() => ResearchLog.entry().events.map(e => e.type));
    expect(types[0]).toBe('session_start');
    expect(types).toEqual(expect.arrayContaining(['page', 'build', 'event_decision']));
    const build = await page.evaluate(() => ResearchLog.entry().events.find(e => e.type === 'build'));
    expect(build.target).toBe('city_hall');

    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-research');
    const panel = page.locator('#research-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('#pause-overlay .player-panel')).toBeHidden();
    await expect(page.locator('#rs-summary .rs-item')).toHaveCount(6);
    await expect(page.locator('#rs-summary')).toContainText('0/1');

    const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#btn-research-csv')]);
    expect(csv.suggestedFilename()).toMatch(/^guardiao-pesquisa-p_teste-.*\.csv$/);
    const csvText = require('fs').readFileSync(await csv.path(), 'utf8');
    expect(csvText).toContain('perfil;idade;uf;cidade;data_hora;sessao;tempo_jogo_s;tipo');
    expect(csvText).toContain(';event_decision;');
    expect(csvText).not.toContain('Teste');

    const [json] = await Promise.all([page.waitForEvent('download'), page.click('#btn-research-json')]);
    const data = JSON.parse(require('fs').readFileSync(await json.path(), 'utf8'));
    expect(data.profile).toEqual({ id: 'p_teste', age: 12, uf: 'SP', city: 'Campinas' });
    expect(data.events.length).toBeGreaterThan(2);

    // Esc volta para a pausa (não retoma o jogo)
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.locator('#pause-overlay .player-panel')).toBeVisible();
    expect(errors).toEqual([]);
});

test('tamanho do texto: escolhido na pausa, salvo e aplicado nos textos de leitura', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await page.evaluate(() => window.gameManager.pauseGame());
    await page.click('#btn-settings');
    await expect(page.locator('#pause-text [data-text-size="normal"]')).toHaveAttribute('aria-checked', 'true');
    await page.click('#pause-text [data-text-size="xlarge"]');
    await expect(page.locator('#pause-text [data-text-size="xlarge"]')).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => ({
        attr: document.documentElement.dataset.textSize,
        saved: localStorage.getItem('guardiao_agua_text'),
        scale: getComputedStyle(document.documentElement).getPropertyValue('--text-scale').trim()
    }))).toEqual({ attr: 'xlarge', saved: 'xlarge', scale: '1.3' });

    // O texto do livro de aulas cresce; o HUD não
    await page.evaluate(() => { window.gameManager.resumeGame(); window.gameManager.uiManager.openLessonBook(1); });
    await expect(page.locator('#lesson-book .book-text')).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#lesson-book .book-text')).zoom)).toBe('1.3');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.resource-value')).zoom)).toBe('1');

    // Vale depois de recarregar (o menu já mostra a escolha)
    await page.evaluate(() => window.gameManager.uiManager.closeLessonBook());
    page.on('dialog', d => d.accept());
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.dataset.textSize)).toBe('xlarge');
    expect(errors).toEqual([]);
});

test('sinais além da cor: rótulo em texto no lugar da obra e selo nos números do topo', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mouse sobre o mapa');
    const errors = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    await page.evaluate(() => window.gameManager.enterBuildMode('water_pump'));
    const box = await page.locator('#game-canvas').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 10);
    const label = page.locator('#placement-label');
    await expect(label).toBeVisible();
    await expect(label).toHaveText(/^(✓ Pode construir aqui|🌳 Pode, mas derruba \d+ árvores?|✕ .+)$/);
    expect(['ok', 'trees', 'bad']).toContain(await label.getAttribute('data-state'));
    await page.evaluate(() => window.gameManager.exitBuildMode());
    await expect(label).toBeHidden();

    // Água acabando: além do vermelho, o número ganha um selo ✕
    await page.evaluate(() => { window.gameManager.resourceManager.resources.water.current = 1; });
    const water = page.locator('.resource-item:has(.resource-value.critical)').first();
    await expect(water).toBeVisible();
    expect(await water.evaluate(el => getComputedStyle(el, '::after').content)).toBe('"✕"');
    expect(errors).toEqual([]);
});
