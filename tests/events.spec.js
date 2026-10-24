// Fase 2 na tela: o Secretário Paulo pergunta o que fazer (modal com 4 opções), barra do tempo de cada evento/aviso,
// painel de água (aquífero, enchente, tendência), reputação no painel de missões e a tela de vitória "Cidade Guardiã".
const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

function watchErrors(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    return problems;
}

async function ready(page) {
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.eventSystem.eventsEnabled = true;
        gm.eventSystem.lastEventTime = -1e9; // nada sorteado no meio do teste
        gm.gameOverSystem.update = () => {};
    });
}

test('o Paulo pergunta o que fazer: 4 opções, a melhor trancada sem o prédio, a escolha começa o evento com a barra', async ({ page }) => {
    const problems = watchErrors(page);
    await ready(page);

    await page.evaluate(() => window.gameManager.eventSystem.announceEvent('pipe_leak'));
    const modal = page.locator('#event-decision.open');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Secretário Paulo');
    await expect(modal.locator('.decision-option')).toHaveCount(4);
    await expect(modal.locator('.decision-option[data-option="replace"]')).toBeDisabled(); // pede monitoramento
    expect(await page.evaluate(() => window.gameManager.isSimulationRunning())).toBe(false); // decisão pausa o jogo

    await modal.locator('.decision-option[data-option="patch"]').click();
    await expect(page.locator('#event-decision.open')).toHaveCount(0);
    const card = page.locator('.event-card.active[data-event-type="pipe_leak"]');
    await expect(card).toBeVisible();
    await expect(card.locator('.event-chosen')).toContainText('Remendo rápido');
    await expect(card.locator('.event-time')).toContainText('termina em');
    const width = () => card.locator('.event-bar-fill').evaluate(el => parseFloat(el.style.width));
    const first = await width();
    await page.waitForTimeout(1500);
    expect(await width()).toBeLessThan(first); // a barra anda com o tempo de jogo

    await page.evaluate(() => {
        const es = window.gameManager.eventSystem;
        [...es.activeEvents.keys()].forEach(id => es.endEvent(id));
    });
    await expect(card).toHaveCount(0);
    expect(problems).toEqual([]);
});

test('enchente: escolhe barreiras no modal, a barra conta o preparo e o evento chega com a escolha', async ({ page }) => {
    const problems = watchErrors(page);
    await ready(page);

    await page.evaluate(() => window.gameManager.eventSystem.announceEvent('flood'));
    await page.locator('#event-decision.open .decision-option[data-option="barriers"]').click();
    const warning = page.locator('.event-card.warning[data-event-type="flood"]');
    await expect(warning).toBeVisible();
    await expect(warning.locator('.event-time')).toContainText('chega em');
    await expect(warning.locator('.event-chosen')).toContainText('Barreiras');

    // Avança o aviso até o fim: vira o evento, com as barreiras registradas
    await page.evaluate(() => {
        const es = window.gameManager.eventSystem;
        es.updatePendingEvents(es.pendingEvents[0].remainingTime + 1);
    });
    await expect(page.locator('.event-card.active[data-event-type="flood"]')).toBeVisible();
    const choice = await page.evaluate(() => [...window.gameManager.eventSystem.activeEvents.values()][0].responseId);
    expect(choice).toBe('barriers');
    expect(problems).toEqual([]);
});

test('painel de água mostra aquífero, risco de enchente, tendência e gráfico', async ({ page }) => {
    const problems = watchErrors(page);
    await ready(page);
    await page.evaluate(() => {
        const rm = window.gameManager.resourceManager;
        for (let i = 0; i < 3; i++) rm.addToHistory();
        window.gameManager.uiManager.showResourcePanel('water');
    });
    const panel = page.locator('.resource-details-panel');
    await expect(panel.locator('.aquifer-block')).toContainText('Aquífero');
    await expect(panel.locator('.flood-block')).toContainText('Risco de enchente');
    await expect(panel.locator('.time-to-empty')).toBeVisible();
    await expect(panel.locator('.trend-box svg polyline')).toHaveCount(1);

    await page.evaluate(() => window.gameManager.uiManager.showPollutionDetailsPanel());
    await expect(page.locator('.sewage-stat')).toContainText('Esgoto');
    expect(problems).toEqual([]);
});

test('reputação aparece no painel de missões e muda com o que se constrói', async ({ page }) => {
    const problems = watchErrors(page);
    await ready(page);
    await page.evaluate(() => window.gameManager.questSystem.changeReputation({ environment: 20 }));
    await page.evaluate(() => window.gameManager.questSystem.openMissionInterface());
    const row = page.locator('.reputation-row[data-stakeholder="environment"]');
    await expect(row).toBeVisible();
    await expect(row.locator('.reputation-value')).toHaveText('70');
    expect(problems).toEqual([]);
});

test('vitória: "Cidade Guardiã" pausa, mostra os números e "Continuar jogando" volta ao jogo', async ({ page }) => {
    const problems = watchErrors(page);
    await ready(page);
    await page.evaluate(() => window.gameManager.gameOverSystem.showVictory());
    await expect(page.locator('#gameover-title')).toHaveText(/Cidade Guardiã/);
    await expect(page.locator('#gameover-text')).toContainText('Aquífero');
    expect(await page.evaluate(() => window.gameManager.isSimulationRunning())).toBe(false);
    await page.click('#gameover-continue-btn');
    await expect(page.locator('#gameover-container')).toBeHidden();
    expect(await page.evaluate(() => window.gameManager.isSimulationRunning())).toBe(true);
    expect(await page.evaluate(() => window.gameManager.gameState)).toBe('playing');
    expect(problems).toEqual([]);
});

test('fim de jogo: "Declarar situação de emergência" (3 vidas) traz ajuda e devolve o jogo', async ({ page }) => {
    const problems = watchErrors(page);
    await ready(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.gameOverSystem.update = window.GameOverSystem.prototype.update; // ready() desligou a checagem
        gm.resourceManager.resources.water.current = 0;
    });
    const button = page.locator('#gameover-emergency-btn');
    await expect(button).toBeVisible({ timeout: 8000 });
    await expect(button).toContainText('3 de 3');
    await expect(page.locator('#gameover-text .emergency-offer')).toContainText('Preço');
    await button.click();
    await expect(page.locator('#gameover-container')).toBeHidden();
    const state = await page.evaluate(() => {
        const gm = window.gameManager;
        return { state: gm.gameState, left: gm.gameOverSystem.getEmergenciesLeft(), water: gm.resourceManager.resources.water.current };
    });
    expect(state.state).toBe('playing');
    expect(state.left).toBe(2);
    expect(state.water).toBeGreaterThan(0);
    await expect(page.locator('.event-card.active[data-event-type="state_intervention"]')).toBeVisible();
    expect(problems).toEqual([]);
});
