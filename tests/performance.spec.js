// Gasto de GPU e memória: o que não aparece nos outros testes (js/core/GameManager.js getFrameRateTarget, IntroCinematic)
const { test, expect } = require('@playwright/test');
const { startGame, mockExternalApis, closeCards } = require('./helpers');

test.skip(({ isMobile }) => isMobile, 'mesma lógica do computador');

test('atrás do aviso a abertura não desenha nada; ao aceitar, começa', async ({ page }) => {
    await mockExternalApis(page);
    await page.goto('/index.html?aviso&intro');
    await page.waitForFunction(() => MenuIntro.state === 'ready', null, { timeout: 60000 });
    const frame = () => page.evaluate(() => MenuIntro.cinematic.scene.getFrameId());
    const before = await frame();
    await page.waitForTimeout(800);
    expect(await frame()).toBe(before);
    await page.click('#btn-notice-accept');
    await page.waitForFunction(start => MenuIntro.cinematic.scene.getFrameId() > start, before, { timeout: 30000 });
});

test('a meta de quadros acompanha o que está na tela', async ({ page }) => {
    await startGame(page);
    const target = () => page.evaluate(() => {
        const gm = window.gameManager;
        gm.isCameraMoving = () => false;
        return String(gm.getFrameRateTarget());
    });
    expect(await target()).toBe('30'); // tutorial
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await closeCards(page, 500);
    expect(await target()).toBe('60'); // jogando
    await page.evaluate(() => window.gameManager.holdPause('teste'));
    expect(await target()).toBe('30'); // popup aberto
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.releasePause('teste');
        gm.pauseGame();
    });
    expect(await target()).toBe('5'); // tela de pausa
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.resumeGame();
        gm.buildMode = true;
    });
    expect(await target()).toBe('Infinity'); // construindo: o fantasma acompanha o mouse
});

test('construir e remover não deixa materiais na cena', async ({ page }) => {
    await startGame(page);
    const count = await page.evaluate(async () => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.tutorialSystem.complete();
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 1e6;
        const cycle = async () => {
            for (let i = 0; i < 6; i++) {
                outer: for (let x = 1; x < 38; x++) for (let z = 16; z < 38; z++) {
                    if (!bs.canPlaceBuilding(x, z, 'water_tank', { quiet: true }).canPlace) continue;
                    bs.buildingCooldown.active = false;
                    const placed = bs.placeBuilding(x, z, 'water_tank');
                    if (placed) { bs.completeConstruction(placed); bs.removeBuilding(placed.id); }
                    break outer;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 3000)); // a fila de descarte esvazia
            return gm.scene.materials.filter(m => /^(progress|connection)/.test(m.name)).length;
        };
        return [await cycle(), await cycle()];
    });
    expect(count[1]).toBeLessThanOrEqual(count[0]);
    expect(count[0]).toBe(0);
});

test('o preload busca retratos, ícones e figuras antes de aparecerem', async ({ page }) => {
    await mockExternalApis(page);
    const requested = new Set();
    page.on('request', request => requested.add(new URL(request.url()).pathname));
    await page.goto('/index.html?preload');
    await expect.poll(() => [...requested].filter(p => p.startsWith('/assets/characters/')).length, { timeout: 30000 }).toBeGreaterThan(20);
    expect([...requested].some(p => p.startsWith('/assets/images/lessons/'))).toBe(true);
    await expect.poll(() => [...requested].filter(p => p.startsWith('/assets/icons/svg/')).length, { timeout: 30000 }).toBeGreaterThan(100);
});
