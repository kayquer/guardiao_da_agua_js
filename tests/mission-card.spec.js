const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Auditoria de game design (10/2026): missão com estrelas e cartão de comemoração que pausa, "bem-vindo de volta"
// ao continuar, quiz que pede releitura antes de liberar e desafio da cidade quando não há missão.

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    return errors;
}

async function start(page) {
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
}

test('missão concluída: cartão com estrelas pausa o jogo e fecha com Enter', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => {
        const gm = window.gameManager, qs = gm.questSystem, r = gm.resourceManager.resources;
        // cidade saudável e missão recém-começada: 3 estrelas
        Object.assign(r.water, { current: (r.water.storage || r.water.max) * 0.6 });
        r.pollution.current = 10;
        r.population.satisfaction = 70;
        Object.assign(r.electricity, { generation: 100, consumption: 50, efficiency: 1 });
        qs.quests.get('tutorial_01').startTime = gm.gameTime;
        qs.completeQuest('tutorial_01');
    });
    const card = page.locator('#mission-card');
    await expect(card).toBeVisible();
    await expect(card.locator('.mission-card-title')).toContainText('Boas-vindas');
    await expect(card.locator('.mission-card-star.earned')).toHaveCount(3);
    await expect(card.locator('.mission-card-goals li.done')).toHaveCount(3);
    await expect(card.locator('.reward-chip').first()).toContainText('+50% pelas estrelas');
    // pausa leve enquanto o cartão está na tela
    await expect.poll(() => page.evaluate(() => window.gameManager.isSimulationRunning())).toBe(false);
    await page.keyboard.press('Enter');
    await expect(card).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.gameManager.isSimulationRunning())).toBe(true);
    // painel de missões mostra as estrelas da concluída
    const stars = await page.evaluate(() => window.gameManager.questSystem.quests.get('tutorial_01').stars);
    expect(stars).toBe(3);
    expect(errors).toEqual([]);
});

test('continuar o jogo salvo abre "que bom ter você de volta" com a missão e o que falta', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    const result = await page.evaluate(() => {
        const gm = window.gameManager;
        gm.uiManager.queueWelcomeBack();
        gm.uiManager.flushMissionCards();
        const card = document.getElementById('mission-card');
        return { title: card?.querySelector('.mission-card-title')?.textContent, text: card?.textContent };
    });
    expect(result.title).toMatch(/ter você de volta/);
    expect(result.text).toMatch(/Você estava na missão/);
    await page.locator('#mission-card-ok').click();
    await expect(page.locator('#mission-card')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('quiz: na 1ª reprovação só reler ou tentar de novo; na 2ª aparece "Continuar e desbloquear"', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    // vai até a última página (onde fica o quiz) e erra todas
    const fail = () => page.evaluate(() => {
        const ss = window.gameManager.studySystem;
        ss.currentPage = ss.getStudyContent(ss.currentStudy).pages.length - 1;
        window.gameManager.uiManager.showStudyBookInterface(ss.getStudyContent(ss.currentStudy));
        ss.getQuiz().questions.forEach((q, i) => ss.submitQuizAnswer(q.id ?? i, (q.correctAnswer + 1) % q.options.length));
        window.gameManager.uiManager.completeStudy();
    });
    await page.waitForFunction(() => window.gameManager.studySystem.contentLoaded);
    await page.evaluate(() => window.gameManager.uiManager.openStudyBook('monitoring_station')); // estudo com quiz
    await fail();
    await expect(page.locator('.quiz-review')).toBeVisible();
    await expect(page.locator('.quiz-review-actions .continue-btn')).toHaveCount(0);
    await expect(page.locator('.quiz-review-actions .reread-btn')).toBeVisible();
    // reler volta para a primeira página do estudo
    await page.locator('.quiz-review-actions .reread-btn').click();
    await expect.poll(() => page.evaluate(() => window.gameManager.studySystem.currentPage)).toBe(0);
    await fail();
    await expect(page.locator('.quiz-review-actions .continue-btn')).toBeVisible();
    expect(errors).toEqual([]);
});

test('sem missão ativa, um desafio da cidade aparece e vai para a barra de missões', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    const id = await page.evaluate(() => {
        const qs = window.gameManager.questSystem;
        qs.activeQuests.clear();
        return qs.createCityChallenge();
    });
    expect(id).toBe('city_challenge_1');
    await expect.poll(() => page.evaluate(() => window.gameManager.questSystem.activeQuests.has('city_challenge_1'))).toBe(true);
    expect(errors).toEqual([]);
});

test('vitrine de conquistas na pausa e cartão quando a zona evolui', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    // zona evoluiu: cartão com o que melhorou e o que piorou
    await page.evaluate(() => {
        const types = window.gameManager.buildingSystem.buildingTypes;
        window.gameManager.uiManager.queueZoneEvolution(types.get('zone_residential_balanced'), types.get('zone_residential_heavy'));
    });
    const card = page.locator('#mission-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Moradores');
    await expect(card).toContainText('Precisa de drenagem');
    await page.locator('#mission-card-ok').click();
    await expect(card).toHaveCount(0);

    // conquistas: ganha uma, abre a vitrine pela pausa
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.questSystem.achievements.add('sustainable_city');
        gm.pauseGame();
    });
    await page.locator('#btn-achievements').click();
    await expect(page.locator('#achievements-panel')).toBeVisible();
    await expect(page.locator('.ach-badge.earned')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#achievements-panel')).toBeHidden();
    expect(errors).toEqual([]);
});
