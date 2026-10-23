const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Notificações em toast (UIManager.showNotification + css/toasts.css), histórico da partida na pausa
// (NotificationLog, "📜 Notificações") e os painéis 💧/💰 agrupando consumidores e despesas por tipo.
// Roda em desktop e mobile.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // Falha de rede (servidor local ocupado com outras suítes) não é deste teste: o smoke cobre a rede
    const network = /Failed to fetch|Failed to load resource|net::ERR_/;
    page.on('console', m => { if (m.type() === 'error' && !network.test(m.text())) errors.push(m.text()); });
    return errors;
}

async function start(page) {
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    // Tira avisos que a abertura possa ter mostrado: o teste conta só os dele
    await page.evaluate(() => {
        document.querySelectorAll('#toast-stack .toast').forEach(t => t.remove());
        window.gameManager.uiManager.notificationLog.clear();
    });
}

test('toasts flutuantes: empilham, somem, clique fecha e não cobrem o HUD', async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await start(page);
    const mobile = testInfo.project.name === 'mobile';

    expect(await page.locator('#notifications').count()).toBe(0); // a barra antiga saiu do HUD

    await page.evaluate(() => {
        const ui = window.gameManager.uiManager;
        ui.showNotification('Primeiro aviso', 'info', 60000);
        ui.showNotification('Deu certo!', 'success', 60000);
        ui.showNotification('Cuidado com a água', 'warning', 60000);
        ui.showNotification('Algo deu errado', 'error', 60000);
        ui.showNotification('Quinto aviso', 'info', 60000);
        ui.showNotification('Sexto aviso', 'info', 60000);
    });
    const toasts = page.locator('#toast-stack .toast:not(.toast-leaving)');
    await expect(toasts).toHaveCount(mobile ? 2 : 4); // limite de visíveis: o mais antigo sai
    await expect(toasts.last()).toContainText('Sexto aviso');
    await expect(page.locator('#toast-stack')).toHaveAttribute('aria-live', 'polite');

    // Posição: computador = acima da barra inferior e fora do menu da esquerda; celular = abaixo da barra de recursos
    const box = await toasts.last().boundingBox();
    const viewport = page.viewportSize();
    if (mobile) {
        const top = await page.locator('.hud-top').boundingBox();
        expect(box.y).toBeGreaterThanOrEqual(top.y + top.height - 1);
        expect(box.x).toBeGreaterThanOrEqual(15);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 8);
    } else {
        // Canto superior direito, abaixo da barra de recursos: nada no meio da tela
        const top = await page.locator('.hud-top').boundingBox();
        expect(box.y).toBeGreaterThanOrEqual(top.y + top.height - 1);
        expect(box.x).toBeGreaterThan(viewport.width / 2);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 8);
        // Com o painel da direita aberto, a pilha fica à esquerda dele
        await page.evaluate(() => window.gameManager.uiManager.showHudRight());
        const right = await page.locator('.hud-right').boundingBox();
        const moved = await toasts.last().boundingBox();
        expect(moved.x + moved.width).toBeLessThanOrEqual(right.x);
        await page.evaluate(() => window.gameManager.uiManager.hideHudRight());
    }
    // O contêiner não engole cliques: só o toast é clicável; o vão entre toasts cai no jogo
    expect(await page.locator('#toast-stack').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
    const gapHit = await page.evaluate(() => {
        const [a, b] = [...document.querySelectorAll('#toast-stack .toast:not(.toast-leaving)')].map(t => t.getBoundingClientRect());
        if (!a || !b) return 'sem vão';
        const y = (Math.min(a.bottom, b.bottom) + Math.max(a.top, b.top)) / 2;
        const el = document.elementFromPoint(a.left + a.width / 2, y);
        return el?.closest('#toast-stack') ? 'toast-stack' : 'jogo';
    });
    expect(gapHit).toBe('jogo');

    // Clique fecha
    const before = await toasts.count();
    await toasts.last().click();
    await expect(toasts).toHaveCount(before - 1);
    await expect(page.locator('#toast-stack .toast', { hasText: 'Sexto aviso' })).toHaveCount(0);

    // Some sozinho
    await page.evaluate(() => window.gameManager.uiManager.showNotification('Rapidinho', 'info', 300));
    await expect(page.locator('#toast-stack .toast', { hasText: 'Rapidinho' })).toHaveCount(1);
    await expect(page.locator('#toast-stack .toast', { hasText: 'Rapidinho' })).toHaveCount(0, { timeout: 3000 });

    expect(errors).toEqual([]);
});

test('toasts respeitam prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await start(page);
    await page.evaluate(() => window.gameManager.uiManager.showNotification('Sem animação', 'info', 60000));
    const anim = await page.locator('#toast-stack .toast').first().evaluate(el => getComputedStyle(el).animationName);
    expect(anim).toBe('none');
});

test('histórico de notificações na pausa: ordem de chegada, rolagem no fim, Esc volta, vai no save', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);

    await page.evaluate(() => {
        const ui = window.gameManager.uiManager;
        for (let i = 1; i <= 30; i++) {
            ui.showNotification(`Aviso número ${i}`, ['info', 'success', 'warning', 'error'][i % 4], 200);
        }
        ui.showNotification('<b>Com HTML</b> e 💧', 'success', 200);
    });

    await page.evaluate(() => window.gameManager.pauseGame());
    await expect(page.locator('#pause-overlay')).toBeVisible();
    await page.click('#btn-notifications');

    const history = page.locator('#notification-history');
    await expect(history).toBeVisible();
    await expect(page.locator('#pause-overlay .player-panel')).toBeHidden();
    await expect(history).toHaveAttribute('role', 'dialog');
    await expect(page.locator('#btn-notifications-back')).toBeFocused();

    const items = page.locator('#nh-list .nh-item');
    await expect(items).toHaveCount(31);
    await expect(items.first()).toContainText('Aviso número 1');
    await expect(items.first()).toHaveClass(/nh-success/); // 1 % 4 = 1 → success
    await expect(items.last()).toContainText('Com HTML e');
    await expect(items.nth(1)).toHaveClass(/nh-warning/);
    await expect(items.nth(2)).toHaveClass(/nh-error/);
    await expect(page.locator('#nh-count')).toHaveText('31 avisos');
    // HTML do aviso não vira marcação no histórico
    expect(await items.last().locator('.nh-text b').count()).toBe(0);
    // Hora real e hora no jogo
    await expect(items.first().locator('.nh-time')).toContainText(/\d{2}:\d{2}/);

    // Rolagem já posicionada no fim (o mais novo)
    const scroll = await page.locator('#nh-list').evaluate(el => ({ top: el.scrollTop, max: el.scrollHeight - el.clientHeight }));
    expect(scroll.max).toBeGreaterThan(0);
    expect(Math.abs(scroll.top - scroll.max)).toBeLessThanOrEqual(2);

    // Esc volta para a pausa (não retoma o jogo)
    await page.keyboard.press('Escape');
    await expect(history).toBeHidden();
    await expect(page.locator('#pause-overlay .player-panel')).toBeVisible();
    await expect(page.locator('#btn-notifications')).toBeFocused();
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('paused');

    // Botão voltar também funciona
    await page.click('#btn-notifications');
    await page.click('#btn-notifications-back');
    await expect(history).toBeHidden();

    // Vai junto com o save e volta no load
    const saved = await page.evaluate(() => window.gameManager.getSaveData().notifications);
    expect(saved.length).toBe(31);
    expect(saved[0]).toMatchObject({ text: 'Aviso número 1', type: 'success' });
    expect(typeof saved[0].real).toBe('number');
    expect(typeof saved[0].clock).toBe('number');

    // Esc agora retoma o jogo
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('playing');

    // Pausa de novo abre sempre no painel do jogador
    await page.evaluate(() => window.gameManager.pauseGame());
    await expect(page.locator('#pause-overlay .player-panel')).toBeVisible();
    await expect(history).toBeHidden();

    expect(errors).toEqual([]);
});

test('painéis de água e dinheiro agrupam consumidores e despesas iguais, e a soma bate', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);

    // Prédios prontos sem esperar a obra: 3 casas, 2 bombas e 1 zona comercial
    await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 1e7;
        bs.maxSimultaneousConstructions = Infinity;
        const want = ['house', 'house', 'house', 'water_pump', 'water_pump', 'zone_commercial_light'];
        for (const type of want) {
            let placed = null;
            for (let x = 0; x < 40 && !placed; x++) for (let z = 0; z < 40 && !placed; z++) {
                if (bs.canPlaceBuilding(x, z, type).canPlace) {
                    bs.buildingCooldown.active = false;
                    placed = bs.placeBuilding(x, z, type);
                }
            }
            if (placed && placed.underConstruction) bs.completeConstruction(placed, { quiet: true });
        }
        document.querySelectorAll('.central-alert-overlay').forEach(el => el.remove());
        gm.resourceManager.resources.population.current = 300;
        gm.resourceManager.invalidateConsumptionCache();
        gm.resourceManager.updateConsumption();
    });

    const counts = await page.evaluate(() => {
        const all = window.gameManager.buildingSystem.getAllBuildings();
        const n = t => all.filter(b => b.type === t && b.effectsApplied).length;
        return { house: n('house'), pump: n('water_pump'), shop: n('zone_commercial_light') };
    });
    expect(counts.house).toBe(3);
    expect(counts.pump).toBe(2);

    // 💧 Quem consome água
    await page.evaluate(() => window.gameManager.uiManager.showWaterDetailsPanel());
    const water = page.locator('#details-content .water-consumers');
    await expect(water).toHaveCount(1);
    const houseRow = water.locator('li[data-group="house"]');
    await expect(houseRow).toHaveCount(1);
    await expect(houseRow).toContainText('3×');
    const waterCheck = await page.evaluate(() => {
        const gm = window.gameManager;
        const rm = gm.resourceManager;
        const bs = gm.buildingSystem;
        rm.invalidateConsumptionCache();
        rm.updateConsumption();
        const r = rm.getWaterConsumers(bs.getAllBuildings(), b => bs.getEffectivePopulationCapacity(b));
        const keys = [...document.querySelectorAll('#details-content .water-consumers li[data-group]')].map(li => li.dataset.group);
        return {
            sum: r.groups.reduce((s, g) => s + g.total, 0),
            total: r.total,
            consumption: rm.resources.water.consumption,
            keys,
            unique: new Set(keys).size === keys.length,
            sorted: r.groups.every((g, i) => i === 0 || r.groups[i - 1].total >= g.total),
            house: r.groups.find(g => g.key === 'house')
        };
    });
    expect(waterCheck.unique).toBe(true);
    expect(waterCheck.sorted).toBe(true);
    expect(waterCheck.sum).toBeCloseTo(waterCheck.total, 5);
    expect(waterCheck.total).toBeCloseTo(waterCheck.consumption, 5);
    expect(waterCheck.house.count).toBe(3);
    expect(waterCheck.keys).not.toContain('water_pump'); // bomba não consome água
    await expect(page.locator('#details-content .water-consumers .breakdown-total')).toContainText('Total de Consumo');

    // 💰 Fontes de despesa agrupadas
    await page.evaluate(() => window.gameManager.uiManager.showBudgetDetailsPanel());
    const expenses = page.locator('#details-content .expense-groups');
    await expect(expenses.locator('li[data-group="house"]')).toContainText('3×');
    await expect(expenses.locator('li[data-group="water_pump"]')).toContainText('2×');
    const expenseCheck = await page.evaluate(() => {
        const rm = window.gameManager.resourceManager;
        const r = rm.getExpenseBreakdown(window.gameManager.buildingSystem.getAllBuildings());
        const keys = [...document.querySelectorAll('#details-content .expense-groups li[data-group]')].map(li => li.dataset.group);
        return { sum: r.groups.reduce((s, g) => s + g.total, 0), expenses: rm.resources.budget.expenses, unique: new Set(keys).size === keys.length };
    });
    expect(expenseCheck.unique).toBe(true);
    expect(expenseCheck.sum).toBeCloseTo(expenseCheck.expenses, 5);

    expect(errors).toEqual([]);
});
