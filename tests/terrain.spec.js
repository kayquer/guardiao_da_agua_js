// Relevo no jogo: painel de terreno, regra de construção e cheia na planície (js/data/riverMap.js, terrainInfo.js)
const { test, expect } = require('@playwright/test');
const { startGame, closeCards } = require('./helpers');

test.skip(({ isMobile }) => isMobile, 'mesma lógica do computador');

const findCell = (page, wanted, filter) => page.evaluate(([wanted, filter]) => {
    const g = window.gameManager.gridManager;
    for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) {
        if (g.getTerrainZone(x, z) !== wanted) continue;
        if (filter === 'plain' && !g.hasFloodplainReach(x, z)) continue;
        if (filter === 'entrenched' && g.hasFloodplainReach(x, z)) continue;
        return [x, z];
    }
    return null;
}, [wanted, filter]);

test.beforeEach(async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await closeCards(page, 500);
});

const panel = async (page, [x, z], type) => {
    await page.evaluate(([x, z, type]) => window.gameManager.uiManager.showTerrainInfo(x, z, type), [x, z, type]);
    return page.locator('.terrain-info-panel');
};

test('o painel segue a sequência do relevo, com e sem planície', async ({ page }) => {
    let info = await panel(page, await findCell(page, 'floodplain'), 'floodplain');
    await expect(info).toContainText('Planície fluvial');
    await expect(info).toContainText('alagável');
    await expect(info.locator('.terrain-sequence li')).toHaveText(['Rio', 'Planície fluvial', 'APP do rio', 'Planalto']);
    await expect(info.locator('.terrain-sequence li.here')).toHaveText('Planície fluvial');

    info = await panel(page, await findCell(page, 'app', 'entrenched'), 'grassland');
    await expect(info).toContainText('APP do rio');
    await expect(info).toContainText('30 metros');
    await expect(info.locator('.terrain-sequence li')).toHaveText(['Rio', 'APP do rio', 'Planalto']);

    info = await panel(page, await findCell(page, 'app', 'plain'), 'grassland');
    await expect(info).toContainText('depois da planície');
    await expect(info).toContainText('50 metros');

    info = await panel(page, await findCell(page, 'hill'), 'hill');
    await expect(info).toContainText('Encosta');
    await expect(info).not.toContainText('Desconhecido');
});

test('o jogo recusa construir na planície e na APP, com o motivo, e a rua atravessa', async ({ page }) => {
    const check = async (cell, type) => page.evaluate(([x, z, type]) => {
        const r = window.gameManager.buildingSystem.canPlaceBuilding(x, z, type, { quiet: true });
        return { canPlace: r.canPlace, reason: r.reason };
    }, [...cell, type]);
    const plain = await findCell(page, 'floodplain');
    const app = await findCell(page, 'app');
    expect(await check(plain, 'zone_residential_light')).toMatchObject({ canPlace: false, reason: expect.stringMatching(/^Planície/) });
    expect(await check(app, 'zone_residential_light')).toMatchObject({ canPlace: false, reason: expect.stringMatching(/^APP/) });
    expect((await check(plain, 'paved_road')).canPlace).toBe(true);
    expect((await check(app, 'paved_road')).canPlace).toBe(true);
});

test('ETA fora das faixas protegidas ganha bomba e canos', async ({ page }) => {
    const plan = await page.evaluate(() => {
        const bs = window.gameManager.buildingSystem;
        for (let x = 0; x < 39; x++) for (let z = 0; z < 39; z++) {
            if (!bs.canPlaceBuilding(x, z, 'water_treatment_plant', { quiet: true }).canPlace) continue;
            return bs.planWaterIntake(x, z, 2, 10);
        }
        return null;
    });
    expect(plan.adjacent).toBeFalsy();
    expect(plan.path.length).toBeGreaterThan(0);
});

test('a planície fica coberta de água durante a enchente e seca depois', async ({ page }) => {
    const mesh = () => page.evaluate(() => {
        const m = window.gameManager.gridManager.floodMesh;
        return m ? { enabled: m.isEnabled(), alpha: m.material.alpha, pickable: m.isPickable } : null;
    });
    expect(await mesh()).toBeNull();
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.eventSystem.hasActiveEventOfType = type => type === 'flood';
        for (let i = 0; i < 12; i++) gm.updateDayNightLighting();
    });
    expect(await mesh()).toMatchObject({ enabled: true, pickable: false });
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.eventSystem.hasActiveEventOfType = () => false;
        for (let i = 0; i < 12; i++) gm.updateDayNightLighting();
    });
    expect((await mesh()).enabled).toBe(false);
});

// Saúde do lugar (js/systems/TerrainHealth.js + ui/TerrainHealthUI.js): indicadores com barra, cor e palavra, ao vivo
test('o painel mostra a saúde do solo e da água, e ela piora quando a poluição sobe', async ({ page }) => {
    const setPollution = value => page.evaluate(v => { window.gameManager.resourceManager.resources.pollution.current = v; }, value);
    const read = () => page.evaluate(() => {
        window.gameManager.uiManager.updateTerrainHealthPanel(); // o mesmo que o update faz a cada 1 s
        const root = document.getElementById('terrain-health');
        return {
            kind: root.dataset.kind,
            level: root.dataset.level,
            score: Number(document.getElementById('th-score').textContent.match(/(\d+)\/100/)[1]),
            rows: [...root.querySelectorAll('.th-row')].map(row => ({
                id: row.dataset.indicator,
                value: Number(row.querySelector('.th-track').getAttribute('aria-valuenow')),
                width: row.querySelector('.th-fill').style.width,
                word: row.querySelector('.th-pill').textContent.trim(),
                why: row.querySelector('.th-why').textContent.trim(),
                level: ['good', 'ok', 'bad'].find(l => row.classList.contains(`th-${l}`))
            }))
        };
    });
    const row = (state, id) => state.rows.find(r => r.id === id);

    // Chão (planalto)
    await setPollution(5);
    const soilCell = await findCell(page, 'grassland');
    await panel(page, soilCell, 'grassland');
    let soil = await read();
    expect(soil.kind).toBe('soil');
    expect(soil.rows.map(r => r.id)).toEqual(['infiltration', 'moisture', 'cover', 'pollution', 'erosion']);
    for (const r of soil.rows) {
        expect(r.width).toBe(`${r.value}%`);
        expect(r.word).toMatch(/^[✓!✕] \S/); // nível também em texto, não só na cor
        expect(r.why.length).toBeGreaterThan(5);
        expect(r.level).toBeTruthy();
    }
    await expect(page.locator('.terrain-info-panel')).toContainText('Saúde do solo aqui');
    const cleanSoil = row(soil, 'pollution').value;
    await setPollution(95);
    soil = await read();
    expect(row(soil, 'pollution').value).toBeGreaterThan(cleanSoil);
    expect(row(soil, 'pollution').level).not.toBe('good');
    expect(row(soil, 'pollution').why).toContain('poluição da cidade');

    // Rio
    await setPollution(5);
    await panel(page, await findCell(page, 'water'), 'water');
    let water = await read();
    expect(water.kind).toBe('water');
    expect(water.rows.map(r => r.id)).toEqual(['oxygen', 'turbidity', 'river', 'shade', 'life']);
    await expect(page.locator('.terrain-info-panel')).toContainText('Saúde da água aqui');
    await expect(page.locator('#th-species')).toContainText('🔎');
    const before = { oxygen: row(water, 'oxygen').value, life: row(water, 'life').value, score: water.score };
    await setPollution(95);
    water = await read();
    expect(row(water, 'oxygen').value).toBeLessThan(before.oxygen);
    expect(row(water, 'life').value).toBeLessThan(before.life);
    expect(water.score).toBeLessThan(before.score);

    // O painel fica dentro do .hud-right (não estica para fora da tela)
    const box = await page.locator('#terrain-health').boundingBox();
    const viewport = page.viewportSize();
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
});

test('o som da seleção do terreno segue a saúde do lugar', async ({ page }) => {
    const calls = await page.evaluate(() => {
        const ui = window.gameManager.uiManager;
        const got = [];
        const original = AudioManager.onSelectTerrain;
        AudioManager.onSelectTerrain = (group, info) => got.push({ group, ...info });
        const gm = window.gameManager;
        let water = null;
        for (let x = 0; x < 40 && !water; x++) for (let z = 0; z < 40; z++) {
            if (gm.gridManager.getTerrainType(x, z) === 'water') { water = [x, z]; break; }
        }
        gm.resourceManager.resources.pollution.current = 0;
        ui.showTerrainInfo(water[0], water[1], 'water');
        gm.resourceManager.resources.pollution.current = 100;
        gm.resourceManager.resources.population.current = 3000; // muito esgoto sem tratar
        ui.showTerrainInfo(water[0], water[1], 'water');
        AudioManager.onSelectTerrain = original;
        return got;
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ group: 'river' });
    expect(calls[0].level).not.toBe('bad');
    expect(calls[1]).toMatchObject({ group: 'river', polluted: true });
    expect(['ok', 'bad']).toContain(calls[1].level);
});
