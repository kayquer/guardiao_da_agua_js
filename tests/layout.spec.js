// A tela inteira precisa caber em 100% de zoom nos tamanhos comuns de notebook: o orientador da pesquisa teve de
// reduzir o navegador para 90%. O Playwright rola até o elemento antes de clicar, então os outros testes não notam.
const { test, expect } = require('@playwright/test');
const { startGame, mockExternalApis, closeCards } = require('./helpers');

test.skip(({ isMobile }) => isMobile, 'tamanhos de computador');

const inView = (page, selector) => page.evaluate(sel => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    return !!r && r.width > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
}, selector);

const fits = (page, selector) => page.evaluate(sel => {
    const el = document.querySelector(sel);
    return el.scrollHeight <= el.clientHeight + 1;
}, selector);

for (const [width, height] of [[1366, 650], [1536, 730], [1920, 940]]) {
    test.describe(`${width}×${height}`, () => {
        test.use({ viewport: { width, height } });

        test('aviso e menu cabem sem rolar', async ({ page }) => {
            await mockExternalApis(page);
            await page.goto('/index.html?aviso');
            expect(await inView(page, '#btn-notice-accept')).toBe(true);
            await page.goto('/index.html');
            await expect(page.locator('#main-menu .menu-layout')).toBeVisible();
            expect(await fits(page, '#main-menu .menu-layout')).toBe(true);
        });

        test('trilho, painel à esquerda e mensagens cabem, com o mapa à vista', async ({ page }) => {
            await startGame(page);

            // Tutorial: um painel à esquerda, depois do trilho, sem cobrir mais de 1/3 da largura
            const card = await page.locator('#tutorial-container .tut-card').boundingBox();
            const rail = await page.locator('.hud-left').boundingBox();
            expect(card.x).toBeGreaterThanOrEqual(rail.x + rail.width);
            expect(card.width).toBeLessThanOrEqual(width / 3 + 2);
            expect(card.y + card.height).toBeLessThanOrEqual(height);
            expect(await inView(page, '#tutorial-next-btn')).toBe(true);

            // Toda página do tutorial mantém os botões à vista (texto longo rola dentro do painel)
            await page.evaluate(() => {
                const ts = window.gameManager.tutorialSystem;
                ts.goTo(ts.steps.reduce((best, s, i, all) => (s.text.length > all[best].text.length ? i : best), 0));
            });
            await page.waitForTimeout(500); // a página termina de virar
            expect(await inView(page, '#tutorial-next-btn')).toBe(true);

            await page.evaluate(() => window.gameManager.tutorialSystem.complete());
            await closeCards(page, 500);

            // Todas as categorias à vista, sem rolagem
            expect(await fits(page, '#building-panel')).toBe(true);
            for (const button of await page.locator('.hud-left button:visible').all()) {
                const box = await button.boundingBox();
                expect(box.y + box.height).toBeLessThanOrEqual(height);
            }

            // Alerta e decisão do Paulo no mesmo lugar; o resto do mapa continua sem véu
            await page.evaluate(() => window.gameManager.uiManager.showCentralAlert('Teste', 'mensagem'));
            await page.waitForTimeout(500); // termina a animação de entrada
            const alert = await page.locator('.central-alert-card').boundingBox();
            expect(alert.x).toBeLessThan(card.x + 20);
            expect(alert.x + alert.width).toBeLessThanOrEqual(width / 2);
            expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [width - 200, height / 2])).toBe('game-canvas');
            await page.click('.central-alert-btn');

            await page.evaluate(() => window.gameManager.eventSystem.announceEvent('pipe_leak'));
            const decision = page.locator('#event-decision.open .decision-box');
            await expect(decision).toBeVisible();
            const box = await decision.boundingBox();
            expect(box.x).toBeLessThan(card.x + 20);
            expect(box.x + box.width).toBeLessThanOrEqual(width / 2);
        });
    });
}

for (const width of [1366, 1280]) test(`o selo de pausa fica na barra do topo, sem cobrir nada (${width} px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 650 });
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.uiManager.showCentralAlert('Teste', 'mensagem');
    });
    const badge = page.locator('#soft-pause-badge');
    await expect(badge).toBeVisible();
    const overlaps = await badge.evaluate(el => {
        const a = el.getBoundingClientRect();
        const others = [...document.querySelectorAll('.resource-item, #player-chip, .control-btn, #toast-stack > *, .event-card, .central-alert-card, .hud-left')];
        return others.filter(other => {
            const b = other.getBoundingClientRect();
            return b.width && !other.contains(el) && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        }).map(other => other.id || other.className);
    });
    expect(overlaps).toEqual([]);
    const top = await page.locator('.hud-top').boundingBox();
    const box = await badge.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(top.y);
    expect(box.y + box.height).toBeLessThanOrEqual(top.y + top.height);
    // Com o selo, os botões da direita continuam na tela
    expect(await page.evaluate(() => {
        const bar = document.querySelector('.hud-top');
        return bar.scrollWidth - bar.clientWidth;
    })).toBeLessThanOrEqual(0);
});

test('rever cartão de missão: o botão fica à vista mesmo em tela curta', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 650 });
    await startGame(page);
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.questSystem.completeQuest('tutorial_01');
    });
    await expect(page.locator('#mission-card')).toBeVisible();
    expect(await inView(page, '#mission-card-ok')).toBe(true);
});

// Topo: sem nada cortado de 769 px em diante, mesmo com os maiores valores do jogo e o selo de pausa aceso.
for (const width of [769, 800, 900, 999, 1000, 1100, 1200, 1280, 1366, 1440, 1600]) {
    test(`a barra do topo cabe inteira em ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 650 });
        await startGame(page);
        const result = await page.evaluate(() => {
            const gm = window.gameManager;
            gm.tutorialSystem.complete();
            gm.holdPause('teste');
            gm.uiManager.setText = () => {};
            const values = { 'budget-amount': 'R$ 2.500.000', 'water-amount': '20.000L', 'population-count': '12.000', 'electricity-amount': '6000 MW', 'pollution-level': '100%', 'satisfaction-level': '100%', 'player-name': 'Guardião Maximiliano' };
            for (const [id, text] of Object.entries(values)) document.getElementById(id).textContent = text;
            const bar = document.querySelector('.hud-top');
            const b = bar.getBoundingClientRect();
            const cut = [...bar.querySelectorAll('.resource-item, #player-chip, .control-btn')]
                .filter(el => el.offsetParent)
                .filter(el => {
                    const r = el.getBoundingClientRect();
                    return r.left < 0 || r.right > innerWidth || r.top < b.top || r.bottom > b.bottom;
                }).map(el => el.id || el.className);
            return { overflow: bar.scrollWidth - bar.clientWidth, cut };
        });
        expect(result).toEqual({ overflow: 0, cut: [] });
    });
}

// Painel da direita: a largura não depende do conteúdo; a barra de rolagem e o ✕ ficam sempre na tela.
for (const width of [800, 1024, 1366]) {
    test(`o painel da direita mantém a largura em ${width} px, em todo painel de recurso`, async ({ page }) => {
        await page.setViewportSize({ width, height: 650 });
        await startGame(page);
        await page.evaluate(() => window.gameManager.tutorialSystem.complete());
        const LONG = 'Estação de Tratamento com um nome bem comprido, sem fim, para esticar a linha <span style="white-space: nowrap">produzindo +1.234.567,8 L/min sem quebrar de jeito nenhum aqui dentro</span>';
        for (const type of ['water', 'budget', 'energy', 'satisfaction', 'population', 'pollution']) {
            const result = await page.evaluate(async ({ type, LONG }) => {
                const ui = window.gameManager.uiManager;
                ui.closeRightPanel();
                ui.uiState.isTransitioning = false;
                ui.showResourcePanel(type);
                await new Promise(done => setTimeout(done, 350));
                const content = document.getElementById('details-content');
                for (let i = 0; i < 40 && !content.querySelector('.resource-stat'); i++) await new Promise(done => setTimeout(done, 50));
                const list = content.querySelector('.resource-details-panel') || content;
                list.insertAdjacentHTML('beforeend', `<div class="resource-stat"><span class="stat-label">${LONG}</span><span class="stat-value">${LONG}</span></div>`);
                const hud = document.querySelector('.hud-right').getBoundingClientRect();
                const panel = document.getElementById('details-panel').getBoundingClientRect();
                const close = document.getElementById('hud-right-close').getBoundingClientRect();
                // Palavra sozinha não quebra ao meio ("Tendên-cia")
                const broken = [...content.querySelectorAll('.stat-label')].filter(el => {
                    if (el.textContent.trim().includes(' ')) return false;
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    return range.getClientRects().length > 1;
                }).map(el => el.textContent);
                const noNumber = /NaN|undefined/.test(content.textContent);
                return {
                    broken,
                    noNumber,
                    panelInside: panel.right <= hud.right + 0.5,
                    closeOnScreen: close.right <= innerWidth,
                    panelOnScreen: hud.right <= innerWidth + 0.5,
                };
            }, { type, LONG });
            expect(result, type).toEqual({ broken: [], noNumber: false, panelInside: true, closeOnScreen: true, panelOnScreen: true });
        }
    });
}

// Prédio de nome longo: nada do painel fica cortado (o botão Desselecionar passava até 48 px da largura).
for (const width of [800, 1366]) {
    test(`o painel do prédio não corta nada em ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 650 });
        await startGame(page);
        const cut = await page.evaluate(() => {
            const gm = window.gameManager, bs = gm.buildingSystem;
            gm.tutorialSystem.complete();
            gm.studySystem.isBuildingUnlocked = () => true;
            bs.maxSimultaneousConstructions = Infinity;
            const content = document.getElementById('details-content');
            const cut = [];
            for (const id of ['composting_yard', 'sugarcane_mill', 'monitoring_station', 'water_tank', 'zone_residential_light']) {
                gm.resourceManager.resources.budget.current = 1e9;
                bs.buildingCooldown.active = false;
                let spot = null;
                for (let x = 0; x < 40 && !spot; x++) for (let z = 0; z < 40 && !spot; z++) {
                    if (bs.canPlaceBuilding(x, z, id, { quiet: true }).canPlace) spot = [x, z];
                }
                gm.uiManager.showBuildingSelectionInfo(bs.placeBuilding(spot[0], spot[1], id));
                if (content.scrollWidth > content.clientWidth) cut.push(id);
            }
            return cut;
        });
        expect(cut).toEqual([]);
    });
}
