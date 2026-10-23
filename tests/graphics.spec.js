// Qualidade gráfica (GraphicsQuality): seletor Baixa/Média/Alta no menu principal e na pausa, salvo no navegador
// e aplicado ao vivo (escala de render, sombras, FXAA, água, partículas). Unit: tests/unit/graphics.test.js.
const { test, expect } = require('@playwright/test');
const { mockExternalApis, startGame } = require('./helpers');

function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    return problems;
}

const KEY = 'guardiao_agua_graphics';

test('menu principal: escolhe a qualidade e ela fica salva', async ({ page }) => {
    const problems = watchErrors(page);
    await mockExternalApis(page);
    await page.goto('/index.html');
    const picker = page.locator('#menu-gfx');
    await expect(picker).toBeVisible();
    // Primeira vez: o jogo escolheu sozinho (um botão marcado e a dica diz isso)
    await expect(picker.locator('[aria-checked="true"]')).toHaveCount(1);
    await expect(picker.locator('.gfx-hint')).toContainText('Escolhida pelo jogo');
    expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBeNull();

    await picker.getByRole('radio', { name: 'Baixa' }).click();
    await expect(picker.getByRole('radio', { name: 'Baixa' })).toHaveAttribute('aria-checked', 'true');
    await expect(picker.locator('.gfx-hint')).toContainText('computadores antigos');
    await expect(picker.locator('.gfx-hint')).not.toContainText('Escolhida pelo jogo');
    expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBe('low');
    // O seletor da pausa acompanha
    await expect(page.locator('#pause-gfx [data-quality="low"]')).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await expect(page.locator('#menu-gfx [data-quality="low"]')).toHaveAttribute('aria-checked', 'true');
    expect(problems).toEqual([]);
});

test('na pausa: trocar a qualidade aplica na hora (baixa sem sombras, alta com) e persiste', async ({ page }) => {
    const problems = watchErrors(page);
    await page.addInitScript(k => { if (!sessionStorage.getItem('gfx-seeded')) { localStorage.setItem(k, 'low'); sessionStorage.setItem('gfx-seeded', '1'); } }, KEY);
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());

    const state = () => page.evaluate(() => {
        const gm = window.gameManager;
        return {
            level: gm.graphicsQuality,
            shadows: gm.scene.shadowsEnabled,
            scale: gm.engine.getHardwareScalingLevel(),
            fxaa: !!gm.fxaaPostProcess,
            waterShader: gm.gridManager.waterMeshes.every(m => m.material === gm.gridManager.waterShaderMaterial),
            msaa: gm.engineAntialias
        };
    });
    // Baixa desde o começo: sem sombra dinâmica, menos pixels, água simples, MSAA desligado no engine
    expect(await state()).toMatchObject({ level: 'low', shadows: false, scale: 1.6, fxaa: false, waterShader: false, msaa: false });

    await page.evaluate(() => window.gameManager.pauseGame());
    const picker = page.locator('#pause-gfx');
    await expect(picker).toBeVisible();
    await expect(picker.locator('[data-quality="low"]')).toHaveAttribute('aria-checked', 'true');

    await picker.getByRole('radio', { name: 'Alta' }).click();
    // Alta com o engine sem MSAA: FXAA no lugar e o aviso de que a suavização muda ao reabrir
    expect(await state()).toMatchObject({ level: 'high', shadows: true, scale: 1, fxaa: true, waterShader: true });
    await expect(picker.locator('.gfx-hint')).toContainText('abrir o jogo de novo');

    await picker.getByRole('radio', { name: 'Média' }).click();
    expect(await state()).toMatchObject({ level: 'medium', shadows: true, scale: 1.25, fxaa: true, waterShader: true });
    expect(await page.evaluate(() => window.gameManager.shadowGenerator.usePercentageCloserFiltering)).toBe(true);

    await picker.getByRole('radio', { name: 'Baixa' }).click();
    expect(await state()).toMatchObject({ level: 'low', shadows: false, scale: 1.6, fxaa: false, waterShader: false });
    // Partículas e nuvens acompanham (chuva da previsão simulada)
    const weather = await page.evaluate(() => {
        const w = window.gameManager.weatherEffects;
        return { scale: w.particleScale, clouds: w.clouds.filter(c => c.isEnabled()).length };
    });
    expect(weather).toEqual({ scale: 0.3, clouds: 0 });

    await picker.getByRole('radio', { name: 'Média' }).click();
    // Alguns quadros renderizando com a troca, sem erro
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
    expect(await page.evaluate(k => localStorage.getItem(k), 'guardiao_agua_graphics')).toBe('medium');

    // Depois de recarregar, o jogo nasce na média (sem MSAA, com FXAA)
    page.on('dialog', d => d.accept());
    await page.reload();
    await page.click('.profile-card[data-profile-id="p_teste"]');
    await page.locator('.swal2-confirm').click(); // "Continuar" (complete() salvou)
    await page.waitForFunction(() => window.gameManager?.initialized && window.gameManager.gameState === 'playing', null, { timeout: 45000 });
    expect(await state()).toMatchObject({ level: 'medium', shadows: true, scale: 1.25, fxaa: true, msaa: false });
    expect(problems).toEqual([]);
});
