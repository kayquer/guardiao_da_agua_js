const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// "Ver debaixo da terra" (ui/AquiferViewUI.js): corte do solo com o aquífero ao vivo, aberto pelo painel 💧.

test('corte do aquífero: abre pelo painel de água, nível ao vivo, canudo da bomba secando e Esc fecha', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    await startGame(page);
    await page.evaluate(() => {
        window.gameManager.tutorialSystem.complete();
        // a prefeitura sem usina dá o alerta central de energia, que no celular cobre o botão (não é o assunto aqui)
        window.gameManager.buildingSystem._energyWarningCooldown = Date.now() + 1e9;
        document.querySelector('.central-alert-overlay')?.remove();
    });

    // Painel 💧 (no celular, o indicador compacto) → botão do bloco do aquífero
    if (testInfo.project.name === 'mobile') await page.locator('#compact-water').click();
    else await page.locator('.resource-panel .resource-item', { has: page.locator('#water-amount') }).click();
    const button = page.locator('#btn-aquifer-view');
    await expect(button).toBeVisible();
    await expect(button).toContainText('Ver debaixo da terra');
    await button.click();

    const view = page.locator('#aquifer-view');
    await expect(view).toBeVisible();
    await expect(view.locator('svg#aquifer-svg')).toHaveCount(1);
    await expect(view.locator('#av-water')).toHaveCount(1);
    await expect(view.locator('#av-straws .av-none')).toContainText('Nenhuma bomba');
    await expect(view.locator('#av-level')).toContainText('%');
    // Pausa como os outros popups
    expect(await page.evaluate(() => window.gameManager.uiManager.isInfoPopupOpen())).toBe(true);

    // Nível muda ao vivo (UIManager.update, a cada 1 s): 80% → água 30 unidades abaixo do topo da areia
    await page.evaluate(() => { window.gameManager.resourceManager.resources.water.aquifer = 80; });
    await expect(view.locator('#aquifer-svg')).toHaveAttribute('data-level', '80', { timeout: 4000 });
    const shift80 = await page.evaluate(() => document.getElementById('av-water').style.transform);
    expect(shift80).toBe('translateY(30px)');
    await page.evaluate(() => { window.gameManager.resourceManager.resources.water.aquifer = 20; });
    await expect(view.locator('#aquifer-svg')).toHaveAttribute('data-level', '20', { timeout: 4000 });
    const shift20 = await page.evaluate(() => document.getElementById('av-water').style.transform);
    expect(shift20).toBe('translateY(120px)');
    await expect(view.locator('#av-level')).toContainText('20%');

    // Uma bomba terminada vira um canudo; com a água abaixo da ponta (aquífero < AQUIFER_LOW) ele seca
    await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.uiManager.flushMissionCards = () => {}; // a bomba completa a 1ª missão: o cartão cobriria o painel no celular
        let placed = null;
        for (let x = 0; x < 40 && !placed; x++) for (let z = 0; z < 40 && !placed; z++) {
            if (bs.canPlaceBuilding(x, z, 'water_pump').canPlace) placed = bs.placeBuilding(x, z, 'water_pump');
        }
        bs.completeConstruction(placed, { quiet: true });
        gm.resourceManager.resources.water.aquifer = 20;
        document.querySelectorAll('.central-alert-overlay').forEach(el => el.remove());
    });
    await expect(view.locator('#av-straws .av-straw[data-type="water_pump"]')).toHaveCount(1, { timeout: 4000 });
    await expect(view).toHaveClass(/av-dry/);
    await expect(view.locator('#av-tip')).toContainText('rendem só');
    await expect(view.locator('#av-flow')).toContainText('1 bomba ou poço');

    // Água de volta acima da ponta: o canudo deixa de secar
    await page.evaluate(() => { window.gameManager.resourceManager.resources.water.aquifer = 90; });
    await expect(view).toHaveClass(/av-pumping/, { timeout: 4000 });
    await expect(view).not.toHaveClass(/av-dry/);

    // Esc fecha só o corte; o painel de água continua aberto
    await page.keyboard.press('Escape');
    await expect(view).toBeHidden();
    await expect(page.locator('#details-content .aquifer-block')).toBeVisible();

    // ✕ e "Fechar" também fecham
    await button.click();
    await expect(view).toBeVisible();
    await page.locator('#aquifer-view-x').click();
    await expect(view).toBeHidden();
    await button.click();
    await page.locator('#aquifer-view-close').click();
    await expect(view).toBeHidden();

    expect(errors).toEqual([]);
});
