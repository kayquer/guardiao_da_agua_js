const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Botões de recurso do topo (ui/ResourceHud.js): seta de tendência, ícone/visual por faixa e som de alerta.

test('recurso caindo: seta vermelha, ícone muda até o deserto, som de alerta e de alívio', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await startGame(page);

    const result = await page.evaluate(() => {
        const gm = window.gameManager, ui = gm.uiManager, r = gm.resourceManager.resources;
        gm.tutorialSystem.complete();
        const played = [];
        const orig = AudioManager.playSound;
        AudioManager.playSound = key => { played.push(key); };
        // Relógio próprio: tudo numa chamada síncrona, o loop do jogo não interfere
        let t = gm.gameTime + 1e6;
        const step = (water, seconds = 1) => {
            for (let i = 0; i < seconds; i++) {
                t += 1000;
                gm.gameTime = t;
                r.water.current = water;
                ui.updateResourceHud(r);
            }
        };
        const item = document.querySelector('#water-amount').closest('.resource-item');
        const icon = () => item.querySelector('.resource-icon img').getAttribute('src');
        const arrow = () => item.querySelector('.res-trend').className;
        const storage = r.water.storage || r.water.max;

        step(storage * 0.95, 13);
        const full = { cls: item.className, icon: icon(), arrow: arrow() };
        for (let k = 0; k < 13; k++) step(storage * (0.9 - k * 0.06));
        const falling = { cls: item.className, icon: icon(), arrow: arrow(), title: item.title };
        step(storage * 0.05, 13);
        const dry = { cls: item.className, icon: icon() };
        t += 25000; // passa o intervalo mínimo entre alertas do mesmo recurso
        step(storage * 0.6, 13);
        const back = { cls: item.className, icon: icon() };
        AudioManager.playSound = orig;
        return { full, falling, dry, back, played, arrows: document.querySelectorAll('.resource-item .res-trend').length };
    });

    expect(result.arrows).toBe(6);
    expect(result.full.cls).toContain('res-tier-great');
    expect(result.full.icon).toContain('res-water-great.svg');
    expect(result.full.arrow).toContain('res-trend--flat');
    expect(result.falling.arrow).toContain('res-trend--down');
    expect(result.falling.arrow).toContain('res-trend--bad');
    expect(result.falling.title).toMatch(/Água: caindo/);
    expect(result.dry.cls).toContain('res-tier-critical');
    expect(result.dry.icon).toContain('res-water-critical.svg');
    expect(result.back.icon).toMatch(/res-water\.svg/);
    expect(result.played).toContain('sfx_alert_water');
    expect(result.played).toContain('sfx_alert_recover');
    expect(errors).toEqual([]);
});

test('poluição subindo é ruim (seta vermelha para cima) e nada toca com o jogo pausado', async ({ page }) => {
    await startGame(page);
    const result = await page.evaluate(() => {
        const gm = window.gameManager, ui = gm.uiManager, r = gm.resourceManager.resources;
        gm.tutorialSystem.complete();
        const played = [];
        const orig = AudioManager.playSound;
        AudioManager.playSound = key => { played.push(key); };
        gm.pauseGame();
        let t = gm.gameTime + 1e6;
        for (let s = 0; s <= 13; s++) {
            t += 1000;
            gm.gameTime = t;
            r.pollution.current = 30 + s * 4;
            ui.updateResourceHud(r);
        }
        const item = document.querySelector('#pollution-level').closest('.resource-item');
        AudioManager.playSound = orig;
        return { arrow: item.querySelector('.res-trend').className, cls: item.className, played };
    });
    expect(result.arrow).toContain('res-trend--up');
    expect(result.arrow).toContain('res-trend--bad');
    expect(result.cls).toContain('res-tier-critical');
    expect(result.played).toEqual([]);
});
