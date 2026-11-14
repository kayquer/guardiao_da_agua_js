const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Prefeitura (11/2026, ui/CityHallUI.js): Financeiro (impostos com prévia, confirmação e espera) e Funcionários
// (contratar, cartão de parabéns, conversa, nível novo, demitir). Regras em CityFinance/CityStaff (unit city-hall.test.js).

function watchErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
    page.on('dialog', d => { errors.push(`diálogo nativo: ${d.message()}`); d.dismiss(); });
    return errors;
}

/** Jogo rodando com uma Prefeitura pronta e selecionada (painel da direita aberto). */
async function startWithCityHall(page) {
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        gm.tutorialSystem.complete();
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.resourceManager.resources.budget.current = 100000;
        let hall = bs.getAllBuildings().find(b => b.type === 'city_hall');
        if (!hall) {
            const s = gm.gridManager.startArea;
            outer: for (let x = s.x; x < 40; x++) for (let z = s.z; z < 40; z++) {
                if (bs.canPlaceBuilding(x, z, 'city_hall').canPlace) { hall = bs.placeBuilding(x, z, 'city_hall'); break outer; }
            }
        }
        if (hall.underConstruction) bs.completeConstruction(hall, { quiet: true });
        document.querySelector('.central-alert-overlay')?.remove();
        gm.selectBuilding(hall);
    });
}

test('prefeitura: impostos e funcionários', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'mesmo HTML; o celular só muda o CSS (tela cheia)');
    const errors = watchErrors(page);
    await startWithCityHall(page);

    // ===== Financeiro =====
    await page.locator('#btn-city-finance').click();
    const finance = page.locator('#city-finance');
    await expect(finance).toBeVisible();
    await expect(finance.locator('.ch-tax')).toHaveCount(3);
    await expect(finance.locator('#cf-summary')).toContainText('Saldo');
    expect(await page.evaluate(() => window.gameManager.uiManager.isInfoPopupOpen())).toBe(true); // pausa leve

    const alto = finance.locator('.ch-seg-btn[data-group="commerce"][data-level="alto"]');
    await alto.hover();
    const preview = finance.locator('#cf-commerce-preview');
    await expect(preview).toContainText('R$');
    await expect(preview).toContainText('comércio cresce 12% mais devagar');
    // teclado: seta a partir do nível de agora mostra a prévia do vizinho
    await finance.locator('.ch-seg-btn[data-group="residents"][data-level="normal"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(finance.locator('#cf-residents-preview')).toContainText('satisfação −4');

    await alto.click();
    await expect(page.locator('.swal2-popup')).toContainText('Comércio e serviços');
    await page.locator('.swal2-confirm').click();
    await expect.poll(() => page.evaluate(() => window.gameManager.cityFinance.levels.commerce)).toBe('alto');
    await expect(alto).toHaveAttribute('aria-checked', 'true');
    // espera: a segunda mudança fica bloqueada
    await expect(finance.locator('#cf-commerce-wait')).toContainText('Mude de novo daqui a ~');
    await expect(finance.locator('.ch-seg-btn[data-group="commerce"][data-level="muito_alto"]')).toBeDisabled();
    await expect(finance.locator('.ch-seg-btn[data-group="residents"][data-level="alto"]')).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(finance).toBeHidden();
    await expect(page.locator('.hud-right')).toBeVisible(); // o Esc fechou só o popup

    // ===== Funcionários: contratar =====
    await page.locator('#btn-city-staff').click();
    const staffPopup = page.locator('#city-staff');
    await expect(staffPopup).toBeVisible();
    await expect(staffPopup.locator('#cs-tab-hire')).toHaveAttribute('aria-selected', 'true'); // ninguém ainda: Contratar
    await expect(staffPopup.locator('.cs-role[data-role="assistente_social"] .cs-reason')).toContainText('Libera com 150 moradores');
    await expect(staffPopup.locator('.cs-role[data-role="assistente_social"] .cs-hire')).toBeDisabled();

    const before = await page.evaluate(() => ({
        budget: window.gameManager.resourceManager.resources.budget.current,
        fee: CityStaff.hireCost('obras'),
        slots: window.gameManager.buildingSystem.maxSimultaneousConstructions
    }));
    expect(before.slots).toBe(3);
    await staffPopup.locator('.cs-hire[data-role="obras"]').click();
    const card = page.locator('#staff-hire-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Parabéns pela contratação!');
    const person = await page.evaluate(() => window.gameManager.cityStaff.staff[0]);
    await expect(card.locator('.mission-card-title')).toHaveText(person.name);
    await expect(card.locator('.staff-hire-intro')).toContainText(`ou ${person.gender === 'f' ? 'a' : 'o'} ${person.name}`); // "Eu sou a…" / "Sou o…"
    await expect(card.locator('.staff-hire-intro')).not.toContainText('{');
    const after = await page.evaluate(() => {
        const gm = window.gameManager;
        return {
            budget: gm.resourceManager.resources.budget.current,
            slots: gm.buildingSystem.maxSimultaneousConstructions,
            payroll: gm.resourceManager.getExpenseBreakdown().groups.find(g => g.key === 'payroll')?.total || 0,
            popup: gm.uiManager.isInfoPopupOpen()
        };
    });
    expect(before.budget - after.budget).toBeGreaterThanOrEqual(before.fee); // cobrou a contratação
    expect(after.slots).toBe(4);
    expect(after.payroll).toBe(80);
    expect(after.popup).toBe(true);
    await card.locator('#staff-hire-ok').click();
    await expect(card).toBeHidden();
    await expect(page.locator('#toast-stack')).toContainText(`${person.name} foi para o trabalho`);

    // ===== Equipe e conversa =====
    await expect(staffPopup.locator('#cs-tab-team')).toHaveAttribute('aria-selected', 'true');
    const personCard = staffPopup.locator(`.cs-person[data-person="${person.id}"]`);
    await expect(personCard).toContainText('Mestre de obras');
    await expect(personCard).toContainText('obras 6% mais rápidas');
    await expect(personCard.locator('.cs-pip.on')).toHaveCount(1);
    await expect(staffPopup.locator('#cs-payroll')).toContainText('R$ 80/min');

    await personCard.locator('.cs-talk').click();
    const talk = page.locator('#staff-talk');
    await expect(talk).toBeVisible();
    const lines = async () => talk.evaluate(el => ['#st-day', '#st-work', '#st-tip'].map(s => el.querySelector(s).textContent));
    const first = await lines();
    first.forEach(text => { expect(text.length).toBeGreaterThan(10); expect(text).not.toMatch(/[{}|]/); });
    await talk.locator('.st-again').click();
    const second = await lines();
    expect(second[0]).not.toBe(first[0]); // "Outra conversa" não repete a fala do dia
    second.forEach(text => expect(text).not.toMatch(/[{}|]/));
    await page.keyboard.press('Escape');
    await expect(talk).toBeHidden();
    await expect(staffPopup).toBeVisible(); // o Esc fecha só o de cima

    // ===== Nível novo =====
    await page.evaluate(() => {
        const gm = window.gameManager, cs = gm.cityStaff;
        cs.kpiGood = () => true; // "obras entregues" indo bem
        cs.staff[0].xp = 99;
        cs.tick(1000, gm);
        gm.uiManager.onStaffEvents(cs.takeEvents());
    });
    await expect.poll(() => page.evaluate(() => window.gameManager.cityStaff.staff[0].level)).toBe(2);
    await expect(page.locator('.staff-level-toast')).toContainText(person.name);
    await expect(personCard.locator('.cs-pip.on')).toHaveCount(2);

    // ===== Demitir =====
    await personCard.locator('.cs-fire').click();
    await expect(page.locator('.swal2-popup')).toContainText('nível 2');
    await page.locator('.swal2-confirm').click();
    await expect.poll(() => page.evaluate(() => window.gameManager.cityStaff.staff.length)).toBe(0);
    const end = await page.evaluate(() => ({
        payroll: window.gameManager.cityStaff.payroll(),
        slots: window.gameManager.buildingSystem.maxSimultaneousConstructions
    }));
    expect(end).toEqual({ payroll: 0, slots: 3 });
    await expect(staffPopup.locator('#cs-payroll')).toContainText('R$ 0/min');
    await staffPopup.locator('.ch-done').click();
    await expect(staffPopup).toBeHidden();
    expect(await page.evaluate(() => window.gameManager.uiManager.isInfoPopupOpen())).toBe(false);

    expect(errors).toEqual([]);
});
