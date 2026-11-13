const { test, expect } = require('@playwright/test');
const { startGame, mockExternalApis, storageKey, pickBasin, TEST_PROFILE } = require('./helpers');

// Modo loja (js/config/GameMode.js, ?modo=loja): estudo opcional, sem "Dados da pesquisa", cadastro só com apelido,
// clima simulado e o aviso inicial só na primeira vez. O modo pesquisa (padrão desta versão) continua igual.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    return errors;
}

test('loja: bomba liberada sem estudo, sem dados da pesquisa, clima simulado', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica no mobile');
    const errors = watchErrors(page);
    await startGame(page, { url: '/index.html?modo=loja', basin: 'vale' });
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    const state = await page.evaluate(() => {
        const gm = window.gameManager;
        const pump = gm.buildingSystem.buildingTypes.get('water_pump');
        return {
            mode: GameMode.id(),
            unlocked: gm.studySystem.isStudyUnlocked('water_pump'),
            card: gm.uiManager.getBuildingItemState(pump),
            research: !!document.getElementById('btn-research'),
            climate: SimulatedWeather.mode(),
            log: ResearchLog.record('build', { target: 'teste' })
        };
    });
    expect(state).toEqual({ mode: 'loja', unlocked: true, card: 'ok', research: false, climate: 'simulated', log: null });

    // o menu de construção oferece o estudo como leitura, com o bônus
    await page.evaluate(() => window.gameManager.uiManager.showBuildInfo('water_pump'));
    await expect(page.locator('.build-info-link[data-action="study"]')).toContainText('+5% de eficiência');
    expect(errors).toEqual([]);
});

test('pesquisa (padrão): a bomba continua pedindo o estudo e o painel da pesquisa existe', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    const state = await page.evaluate(() => ({
        mode: GameMode.id(),
        unlocked: window.gameManager.studySystem.isStudyUnlocked('water_pump'),
        research: !!document.getElementById('btn-research')
    }));
    expect(state).toEqual({ mode: 'pesquisa', unlocked: false, research: true });
    expect(errors).toEqual([]);
});

test('loja: cadastro só com o apelido começa o jogo; "Fora do Brasil" existe', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica no mobile');
    const errors = watchErrors(page);
    await mockExternalApis(page);
    await page.goto('/index.html?modo=loja');
    await page.click('#btn-new-game');
    await expect(page.locator('#profile-screen')).toBeVisible();
    await expect(page.locator('#profile-uf option[value="XX"]')).toHaveCount(1);
    await expect(page.locator('#profile-age')).not.toHaveAttribute('required', '');
    await expect(page.locator('.profile-optional')).toHaveCount(3);
    await page.fill('#profile-name', 'Lu');
    await page.click('#btn-profile-start');
    await pickBasin(page, 'litoral'); // modo loja: escolhe a bacia antes da cidade
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });
    const profile = await page.evaluate(() => PlayerProfile.getActive());
    expect(profile).toMatchObject({ name: 'Lu', age: null, uf: null, city: '' });
    expect(errors).toEqual([]);
});

test('loja: a bacia escolhida vira o terreno e vai no save; espaço de outra bacia só abre pelo menu', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica no mobile');
    const errors = watchErrors(page);
    await startGame(page, { url: '/index.html?modo=loja', basin: 'sertao' });
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    const state = await page.evaluate(() => {
        const gm = window.gameManager;
        const data = gm.getSaveData();
        // um espaço manual de outra bacia (vale): carregar no meio da partida não pode misturar terrenos
        const other = { ...data, basin: 'vale' };
        new SaveSystem().save(other, PlayerProfile.getActive().id, { kind: 'manual', slot: 'slot_2' });
        return {
            basin: Basin.id(), saved: data.basin, aquifer: gm.resourceManager.resources.water.aquifer,
            loaded: gm.restoreSavePoint('slot_2'), still: Basin.id()
        };
    });
    expect(state).toEqual({ basin: 'sertao', saved: 'sertao', aquifer: 60, loaded: false, still: 'sertao' });
    await expect(page.locator('#toast-stack .toast', { hasText: 'outra bacia' })).toBeVisible();
    expect(errors).toEqual([]);
});

test('loja: carrossel de bacias — setas, teclado e arrasto trocam o cartão; Esc volta; a escolhida vira a cidade', async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await mockExternalApis(page);
    await page.addInitScript(({ p, key }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ profiles: [p], activeId: p.id }));
    }, { p: TEST_PROFILE, key: storageKey('profiles') });
    await page.goto('/index.html?modo=loja');
    const focused = page.locator('.bp-card.is-focus');

    // Esc volta ao menu e descarta a maquete
    await page.click(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    await expect(page.locator('#basin-picker')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#basin-picker')).toHaveCount(0);
    await expect(page.locator('#main-menu')).toHaveClass(/active/);
    expect(await page.evaluate(() => ({ preview: BasinPicker.preview, canvas: document.querySelectorAll('.bp-canvas').length })))
        .toEqual({ preview: null, canvas: 0 });

    await page.click(`.profile-card[data-profile-id="${TEST_PROFILE.id}"]`);
    const picker = page.locator('#basin-picker');
    await expect(picker).toBeVisible();
    await expect(page.locator('.bp-card')).toHaveCount(4);
    await expect(focused).toHaveAttribute('data-basin', 'vale'); // o mapa clássico vem primeiro
    await expect(focused.locator('.bp-badge')).toContainText('Mapa clássico');
    await expect(focused.locator('.bp-trait')).toHaveCount(4);
    expect(/\p{Extended_Pictographic}/u.test(await picker.innerText()), 'sem emoji no carrossel').toBe(false);
    // maquete 3D no cartão em foco (fotos nos outros)
    await page.waitForSelector('#basin-picker.has-preview', { timeout: 30000 });
    await expect(focused.locator('canvas.bp-canvas')).toHaveCount(1);
    await expect(page.locator('.bp-card:not(.is-focus) .bp-shot:not([hidden])')).toHaveCount(3);

    await page.click('.bp-arrow--next');
    await expect(focused).toHaveAttribute('data-basin', 'serra');
    await page.keyboard.press('ArrowRight');
    await expect(focused).toHaveAttribute('data-basin', 'litoral');
    await page.keyboard.press('ArrowLeft');
    await expect(focused).toHaveAttribute('data-basin', 'serra');
    await page.click('.bp-dot[data-basin="vale"]');
    await page.click('.bp-arrow--prev'); // dá a volta: do primeiro para o último
    await expect(focused).toHaveAttribute('data-basin', 'sertao');
    await expect(focused.locator('canvas.bp-canvas')).toHaveCount(1); // a maquete foi junto

    // arrastar para a esquerda = próxima
    const box = await page.locator('.bp-stage').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.7, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, y, { steps: 6 });
    await page.mouse.move(box.x + box.width * 0.3, y, { steps: 6 });
    await page.mouse.up();
    await expect(focused).toHaveAttribute('data-basin', 'vale');

    // o "Jogar aqui" de um cartão do lado só traz ele para o meio (no celular o cartão do lado mal aparece)
    if (testInfo.project.name !== 'mobile') {
        await page.locator('.bp-card[data-basin="serra"] .basin-pick').click();
        await expect(focused).toHaveAttribute('data-basin', 'serra');
        await expect(page.locator('#basin-picker')).toBeVisible();
    } else {
        await page.keyboard.press('ArrowRight');
    }

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(focused).toHaveAttribute('data-basin', 'sertao');
    await focused.locator('.basin-pick').click();
    await page.waitForFunction(() => window.gameManager?.initialized, null, { timeout: 45000 });
    expect(await page.evaluate(() => ({
        basin: Basin.id(),
        picker: document.querySelectorAll('#basin-picker, .bp-canvas').length,
        preview: BasinPicker.preview
    }))).toEqual({ basin: 'sertao', picker: 0, preview: null });
    expect(errors).toEqual([]);
});

test('pesquisa: sem escolha de bacia, todo mundo no mesmo mapa', async ({ page }) => {
    const errors = watchErrors(page);
    await startGame(page);
    expect(await page.evaluate(() => Basin.id())).toBe('vale');
    await expect(page.locator('.basin-pick')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('loja: o aviso inicial aparece só até ser aceito uma vez', async ({ page }) => {
    const errors = watchErrors(page);
    await mockExternalApis(page);
    await page.goto('/index.html?aviso&modo=loja');
    await expect(page.locator('#start-notice')).toBeVisible();
    await page.click('#btn-notice-accept');
    await expect(page.locator('#start-notice')).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey('notice_seen'))).toBe('yes');
    await page.goto('/index.html?aviso&modo=loja');
    await expect(page.locator('#main-menu')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('#start-notice')).toHaveCount(0);
    // no modo pesquisa ele volta sempre
    await page.goto('/index.html?aviso');
    await expect(page.locator('#start-notice')).toBeVisible();
    expect(errors).toEqual([]);
});
