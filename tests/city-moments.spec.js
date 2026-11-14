const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Momentos da cidade (11/2026, ideias da 1ª auditoria — js/systems/CityMoments.js): a nascente que volta (e seca),
// a cheia contida na várzea, o aviso da chuva de verdade, o plano que segue o primeiro carro, o álbum "Como a
// cidade mudou" no Diário e a última legenda da vitória com o nome do jogador. Desktop (mesma lógica no mobile).

function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    return problems;
}

async function start(page) {
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        document.querySelectorAll('.central-alert-overlay').forEach(el => el.remove());
    });
}

/** Momento = plano de câmera (jogador à toa) ou aviso; o teste aceita os dois e pula o plano. */
async function expectMoment(page, text) {
    const caption = page.locator('#city-cinematic:not([hidden]) .cc-caption');
    const toast = page.locator('#toast-stack', { hasText: text });
    await expect(caption.or(toast).first()).toBeVisible({ timeout: 8000 });
    if (await page.evaluate(() => !!window.CityCinematic?.current)) {
        await expect(caption).toContainText(text);
        await page.evaluate(() => window.CityCinematic.current?.skip());
    }
}

test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesma lógica do desktop');
});

test('nascente: brota na encosta quando o aquífero volta de baixo de 30% para cima de 80%, e seca se cair de novo', async ({ page }) => {
    const problems = watchErrors(page);
    await start(page);
    const before = await page.evaluate(() => {
        const gm = window.gameManager, cm = gm.cityMoments;
        gm.resourceManager.resources.water.aquifer = 95;
        cm.check(gm);
        const early = cm.state.spring;
        gm.resourceManager.resources.water.aquifer = 20;
        cm.check(gm);
        gm.resourceManager.resources.water.aquifer = 85;
        cm.check(gm);
        return { early, spring: cm.state.spring, mesh: !!gm.scene.getMeshByName('spring_pool') };
    });
    expect(before.early).toBeNull(); // cheio desde o começo não conta
    expect(before.spring).toEqual({ x: expect.any(Number), z: expect.any(Number) });
    expect(before.mesh).toBe(true);
    await expectMoment(page, 'olho-d');
    const diary = await page.evaluate(() => window.gameManager.cityDiary.entries.map(e => e.text).join(' | '));
    expect(diary).toContain('olho-d\'água voltou a brotar');

    const after = await page.evaluate(() => {
        const gm = window.gameManager, cm = gm.cityMoments;
        gm.resourceManager.resources.water.aquifer = 10;
        cm.check(gm);
        return { spring: cm.state.spring, mesh: !!gm.scene.getMeshByName('spring_pool') };
    });
    expect(after).toEqual({ spring: null, mesh: false });
    await expect(page.locator('#toast-stack')).toContainText('secou');
    expect(problems).toEqual([]);
});

test('cheia contida: com proteção, a câmera mostra a várzea cheia e "parou antes das casas"', async ({ page }) => {
    const problems = watchErrors(page);
    await start(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        const event = gm.eventSystem.triggerEvent('flood', true, { responseId: 'barriers' });
        event.effectScale = 0.4;
        gm.floodplainWet = 1;
        document.querySelectorAll('.central-alert-overlay').forEach(el => el.remove());
        gm.cityMoments.check(gm);
    });
    await expectMoment(page, 'parou antes das casas');
    const again = await page.evaluate(() => {
        const gm = window.gameManager;
        const n = gm.cityDiary.entries.filter(e => e.kind === 'moment').length;
        gm.cityMoments.check(gm); // uma vez por cheia
        return [n, gm.cityDiary.entries.filter(e => e.kind === 'moment').length];
    });
    expect(again).toEqual([1, 1]);
    expect(problems).toEqual([]);
});

test('chuva de verdade na cidade do perfil: o Paulo avisa uma vez e mostra quanto o aquífero sobe', async ({ page }) => {
    const problems = watchErrors(page);
    await start(page);
    const count = await page.evaluate(() => {
        const gm = window.gameManager, cm = gm.cityMoments;
        gm.uiManager.weather = { ...(gm.uiManager.weather || {}), simulated: false };
        gm.weatherEffects.profile = { ...gm.weatherEffects.profile, rain: 0.5 };
        cm.wasRaining = false;
        cm.check(gm);
        cm.wasRaining = false; // parou e voltou a chover logo depois: não repete
        cm.check(gm);
        return [...document.querySelectorAll('#toast-stack .toast')].filter(t => t.textContent.includes('chovendo de verdade')).length;
    });
    expect(count).toBe(1);
    await expect(page.locator('#toast-stack')).toContainText('chovendo de verdade em Campinas');
    await expect(page.locator('#toast-stack')).toContainText('+1% por minuto');
    // clima simulado não conta como chuva "de verdade"
    const simulated = await page.evaluate(() => {
        const gm = window.gameManager, cm = gm.cityMoments;
        cm.lastRainNotice = -Infinity;
        gm.uiManager.weather.simulated = true;
        cm.wasRaining = false;
        cm.check(gm);
        return cm.lastRainNotice;
    });
    expect(simulated).toBe(-Infinity);
    expect(problems).toEqual([]);
});

test('primeiros carros: a câmera segue o primeiro carro (uma vez por partida)', async ({ page }) => {
    const problems = watchErrors(page);
    await start(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        const mesh = BABYLON.MeshBuilder.CreateBox('fake_car', { size: 0.4 }, gm.scene);
        mesh.position.set(6, 0.3, -4);
        gm.cityLifeSystem.vehicles.push({ kind: 'car', mesh });
        gm.cityMoments.check(gm);
    });
    await expectMoment(page, 'primeiros carros');
    const state = await page.evaluate(() => {
        const gm = window.gameManager;
        const t = gm.camera.target;
        return { shown: gm.cityMoments.state.carsShown, dist: Math.hypot(t.x - 6, t.z + 4), diary: gm.cityDiary.entries.some(e => /primeiros carros/.test(e.text)) };
    });
    expect(state.shown).toBe(true);
    expect(state.diary).toBe(true);
    if (await page.evaluate(() => !CityCinematic.reducedMotion())) expect(state.dist).toBeLessThan(1); // pulou: câmera sobre o carro
    expect(problems).toEqual([]);
});

test('álbum: foto do começo e de cada missão, do mesmo ângulo, no Diário da cidade ("Antes" e "Agora")', async ({ page }) => {
    test.setTimeout(90000);
    const problems = watchErrors(page);
    await start(page);
    const first = await page.evaluate(async () => {
        const gm = window.gameManager, cm = gm.cityMoments;
        cm.check(gm); // 1ª olhada: a foto do começo
        await cm.pendingPhoto;
        gm.questSystem.completeQuest('tutorial_01');
        cm.check(gm);
        await cm.pendingPhoto;
        return cm.getAlbum().map(p => ({ key: p.key, jpeg: p.img.startsWith('data:image/jpeg'), title: p.title }));
    });
    expect(first.map(p => p.key)).toEqual(['start', 'tutorial_01']);
    expect(first.every(p => p.jpeg)).toBe(true);
    expect(first[1].title).not.toContain('{nome}');

    await page.evaluate(() => {
        document.querySelectorAll('#mission-card, .central-alert-overlay').forEach(el => { el.hidden = true; });
        window.gameManager.pauseGame();
        window.gameManager.uiManager.openDiaryPanel();
    });
    const album = page.locator('#diary-album');
    await expect(album).toBeVisible();
    await expect(album.locator('.diary-photo--big')).toHaveCount(2);
    await expect(album).toContainText('Antes');
    await expect(album).toContainText('Agora');
    const loaded = await album.locator('img').first().evaluate(img => img.complete && img.naturalWidth > 0);
    expect(loaded).toBe(true);

    // jogo novo apaga o álbum do perfil
    const cleared = await page.evaluate(() => {
        const cm = window.gameManager.cityMoments;
        cm.clearAlbum();
        return cm.getAlbum().length;
    });
    expect(cleared).toBe(0);
    expect(problems).toEqual([]);
});

test('vitória: a última legenda do voo diz quem cuidou da cidade', async ({ page }) => {
    await start(page);
    const captions = await page.evaluate(() => window.gameManager.gameOverSystem.victoryCaptions().map(c => c.text));
    expect(captions).toHaveLength(4);
    expect(captions[3]).toBe('E quem cuidou dela foi você, Teste.');
});

test('tela pequena no canto: a foto do álbum não muda o tamanho da engine e o vigia corrige buffer e viewport', async ({ page }) => {
    const problems = watchErrors(page);
    await start(page);
    const photo = await page.evaluate(async () => {
        const gm = window.gameManager, e = gm.engine;
        const before = [e.getRenderWidth(), e.getRenderHeight()];
        let smallest = Infinity;
        const obs = gm.scene.onAfterRenderObservable.add(() => { smallest = Math.min(smallest, e.getRenderWidth()); });
        await gm.cityMoments.capturePhoto(gm, 'start', 'O começo');
        await new Promise(r => setTimeout(r, 400));
        gm.scene.onAfterRenderObservable.remove(obs);
        // a foto não é preta: tem cor de verdade (terreno/água)
        const img = new Image();
        img.src = gm.cityMoments.getAlbum()[0].img;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = 40; c.height = 22;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 40, 22);
        const d = ctx.getImageData(0, 0, 40, 22).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
        return { before, after: [e.getRenderWidth(), e.getRenderHeight()], smallest, mean: sum / (d.length / 4) / 3 };
    });
    expect(photo.after).toEqual(photo.before);
    expect(photo.smallest).toBe(photo.before[0]); // nenhum quadro desenhado em tamanho de foto
    expect(photo.mean).toBeGreaterThan(30);

    // buffer encolhido (como fazia a captura antiga) e viewport preso em cache: o vigia conserta em ~1 s
    await page.evaluate(() => window.gameManager.engine.setSize(400, 225));
    await page.waitForFunction(() => window.gameManager.engine.getRenderWidth() > 400, null, { timeout: 5000 });
    await page.evaluate(() => {
        const e = window.gameManager.engine;
        e._gl.viewport(0, 0, 120, 80); // o Babylon acha que o viewport ainda é o da tela (cache)
    });
    await page.waitForFunction(() => {
        const e = window.gameManager.engine, vp = e._gl.getParameter(e._gl.VIEWPORT);
        return vp[2] >= e.getRenderWidth() * 0.9;
    }, null, { timeout: 5000 });
    expect(await page.evaluate(() => window.gameManager.canvasFixes)).toBeGreaterThanOrEqual(1); // o buffer; o viewport o Babylon refaz no quadro seguinte
    expect(problems).toEqual([]);
});
