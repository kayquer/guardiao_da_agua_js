const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// Props de cenário (js/systems/PropSystem.js + js/data/props.js): leves (no máximo 4 meshes no mapa),
// natureza desde o começo, sinais de poluição que vêm e vão, e construir em cima tira o prop.
test.skip(({ isMobile }) => isMobile, 'mesmo mapa e mesmo sistema no celular; basta o desktop');

async function play(page) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    return problems;
}

/** Replaneja, espera os .glb que faltam e replaneja de novo; devolve as estatísticas. */
const settle = page => page.evaluate(async () => {
    const ps = window.gameManager.propSystem;
    ps.refresh();
    await Promise.all([...ps.loading.values()]);
    ps.refresh();
    return ps.getStats();
});

test('começo: só natureza e bichos do rio, em no máximo 4 meshes, leves e sem picking', async ({ page }) => {
    const problems = await play(page);
    const stats = await settle(page);
    expect(stats.shown).toBeGreaterThan(20);
    expect(stats.meshes).toBeLessThanOrEqual(4);
    const groups = await page.evaluate(types => types.map(id => PROP_TYPES[id].group), Object.keys(stats.types));
    expect(groups.every(g => g === 'natureza' || g === 'fauna')).toBe(true);
    const maxTris = await page.evaluate(() => PROP_SETTINGS.MAX_TRIS);
    expect(stats.triangles).toBeLessThanOrEqual(stats.shown * maxTris);
    const meshes = await page.evaluate(() => window.gameManager.scene.meshes.filter(m => m.metadata?.props)
        .map(m => ({ pickable: m.isPickable, frozen: m.isWorldMatrixFrozen, shadow: !!window.gameManager.shadowGenerator?.getShadowMap()?.renderList?.includes(m) })));
    meshes.forEach(m => expect(m).toEqual({ pickable: false, frozen: true, shadow: false }));
    expect(problems).toEqual([]);
});

test('poluição alta traz lixo, espuma e peixes; limpar tira tudo e os bichos voltam', async ({ page }) => {
    const problems = await play(page);
    await settle(page);
    await page.evaluate(() => { window.gameManager.resourceManager.resources.pollution.current = 88; });
    const dirty = await settle(page);
    expect(Object.keys(dirty.types)).toEqual(expect.arrayContaining(['lixo_flutuante', 'espuma_rio', 'peixe_morto']));
    expect(dirty.types.garca).toBeUndefined();
    await page.evaluate(() => { window.gameManager.resourceManager.resources.pollution.current = 5; });
    const clean = await settle(page);
    const left = await page.evaluate(types => types.filter(id => PROP_TYPES[id].group === 'poluicao'), Object.keys(clean.types));
    expect(left).toEqual([]);
    expect(clean.types.garca).toBeGreaterThan(0);
    expect(problems).toEqual([]);
});

test('construir em cima de um prop tira ele do mapa', async ({ page }) => {
    const problems = await play(page);
    await settle(page);
    const spot = await page.evaluate(() => {
        const gm = window.gameManager;
        gm.resourceManager.resources.budget.current = 1e6;
        const bs = gm.buildingSystem;
        return gm.propSystem.placements.find(p => PROP_TYPES[p.id].place === 'land'
            && bs.canPlaceBuilding(p.x, p.z, 'tree_sapling', { quiet: true })?.canPlace);
    });
    expect(spot).toBeTruthy();
    await page.evaluate(s => window.gameManager.buildingSystem.placeBuilding(s.x, s.z, 'tree_sapling'), spot);
    await settle(page);
    const still = await page.evaluate(s => window.gameManager.propSystem.placements.some(p => p.x === s.x && p.z === s.z), spot);
    expect(still).toBe(false);
    expect(problems).toEqual([]);
});

test('qualidade baixa desenha menos props', async ({ page }) => {
    const problems = await play(page);
    await page.evaluate(() => { window.gameManager.graphicsQuality = 'high'; });
    const high = await settle(page);
    await page.evaluate(() => { window.gameManager.graphicsQuality = 'low'; });
    const low = await settle(page);
    expect(low.shown).toBeLessThan(high.shown * 0.6);
    expect(problems).toEqual([]);
});
