// Fotografa cada prédio sozinho no mapa: confere visualmente meshes/materiais depois de mexer no 3D.
// Uso: npm run screenshots                          → todos os prédios visíveis, em screenshots/buildings/
//      npm run screenshots -- water_pump city_hall  → só esses
//      npm run screenshots -- --out screenshots/antes --labels
// Gera também um index.html com a grade de imagens. Para comparar antes/depois de uma mudança,
// rode com --out diferente em cada versão. Usa o servidor em localhost:3000 (sobe `npm start` se não houver).
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { chromium } = require('@playwright/test');
const { startGame, CLEAR_SKY } = require('../tests/helpers');

const ROOT = path.join(__dirname, '..');
const URL = 'http://localhost:3000';
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const outDir = path.resolve(ROOT, flag('--out') || 'screenshots/buildings');
const labels = args.includes('--labels') && args.splice(args.indexOf('--labels'), 1);
const only = args;

const isUp = () => fetch(URL).then(r => r.ok, () => false);

async function startServer() {
    if (await isUp()) return null;
    const server = spawn('npm', ['start'], { cwd: ROOT, shell: true, stdio: 'ignore' });
    for (let i = 0; i < 60; i++) {
        if (await isUp()) return server;
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('servidor não subiu em localhost:3000 (rode npm start e veja o erro)');
}

function stopServer(server) {
    if (!server) return;
    if (process.platform === 'win32') execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
    else server.kill();
}

async function main() {
    const server = await startServer();
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

        // Qualidade gráfica alta (no headless o jogo detectaria a placa de software e cairia na baixa: sem sombra)
        await page.addInitScript(() => localStorage.setItem('guardiao_agua_graphics', 'high'));
        // Perfil de teste + clima simulado (tests/helpers.js); sem nuvem/chuva na frente do prédio
        await startGame(page, { url: `${URL}/index.html`, forecast: CLEAR_SKY });
        await page.evaluate(() => {
            const gm = window.gameManager;
            gm.tutorialSystem.complete();
            gm.weatherEffects?.dispose();
            gm.weatherEffects = null;
            gm.applyWeather = () => {};
            // Alertas (ex.: falta de energia) ficam abertos atrás do CSS que esconde a interface e
            // segurariam a pausa leve: as obras não terminariam
            gm.uiManager.syncPopupPause = () => {};
            gm.releasePause('popup');
            // A soma de todos os prédios estoura poluição/água e daria game over no meio das fotos
            gm.gameOverSystem.update = () => {};
        });
        // Só o canvas aparece na foto (HUD, alertas e notificações ficam invisíveis)
        await page.addStyleTag({ content: '* { visibility: hidden !important } #game-canvas { visibility: visible !important }' });

        const ids = await page.evaluate(only => {
            const bs = window.gameManager.buildingSystem;
            return [...bs.buildingTypes].filter(([id, t]) => only.length ? only.includes(id) : t.visible).map(([id]) => id);
        }, only);
        const missing = only.filter(id => !ids.includes(id));
        if (missing.length) throw new Error(`prédio inexistente: ${missing.join(', ')}`);

        fs.mkdirSync(outDir, { recursive: true });
        const shots = [], failed = [];
        for (const id of ids) {
            const building = await page.evaluate(({ id, labels }) => {
                const gm = window.gameManager, bs = gm.buildingSystem;
                gm.studySystem.isBuildingUnlocked = () => true;
                gm.resourceManager.resources.budget.current = 1e9;
                bs.buildingCooldown.active = false;
                // Lugar válido mais perto do centro do mapa
                const spots = [];
                for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) spots.push([x, z]);
                spots.sort((a, b) => Math.hypot(a[0] - 20, a[1] - 20) - Math.hypot(b[0] - 20, b[1] - 20));
                const spot = spots.find(([x, z]) => bs.canPlaceBuilding(x, z, id).canPlace);
                if (!spot) return null;
                const b = bs.placeBuilding(spot[0], spot[1], id);
                if (!b) return null;
                b.constructionDuration = 1; // termina no próximo tick do loop de obra
                if (!labels) bs.removeBuildingNameLabel(b.mesh);
                return { id: b.id, name: b.config.name, size: b.config.size || 1 };
            }, { id, labels });
            if (!building) { failed.push(`${id}: sem lugar válido ou placeBuilding falhou`); continue; }

            try {
                await page.waitForFunction(bid => window.gameManager.buildingSystem.buildings.get(bid)?.underConstruction === false, building.id, { timeout: 10000 });
            } catch {
                failed.push(`${id}: obra não terminou em 10 s (gameState: ${await page.evaluate(() => window.gameManager.gameState)})`);
                await page.evaluate(bid => window.gameManager.buildingSystem.removeBuilding(bid), building.id);
                continue;
            }
            // Prédio com modelo .glb (js/data/buildingModels.js): espera o arquivo carregar e o mesh trocar,
            // e o fim da animação de obra (a escala volta a 1)
            await page.waitForFunction(bid => {
                const bs = window.gameManager.buildingSystem;
                return !bs.hasPendingBuildingModels() && bs.buildings.get(bid)?.mesh.scaling.x === 1;
            }, building.id, { timeout: 15000 }).catch(() => {});
            await page.evaluate(({ bid, size }) => {
                const gm = window.gameManager;
                const mesh = gm.buildingSystem.buildings.get(bid).mesh;
                // Efeitos de obra concluída (partículas, anel e plaquinha "CONCLUÍDO!")
                gm.scene.particleSystems.slice().forEach(p => p.dispose());
                gm.scene.meshes.filter(m => /(completion|celebration)_/.test(m.name)).forEach(m => m.dispose());
                const c = mesh.getHierarchyBoundingVectors(true);
                const center = c.min.add(c.max).scale(0.5);
                const radius = 7 + size * 4;
                const cc = gm.cameraControls;
                // Câmera parada no alvo, sem a suavização do SimCityCameraControls (o loop dele converge para targetPosition)
                cc.targetPosition.copyFrom(center);
                cc.targetRadius = radius;
                gm.camera.setTarget(center);
                gm.camera.radius = radius;
            }, { bid: building.id, size: building.size });
            await page.waitForTimeout(700); // textura do modelo e alguns frames

            const file = `${id}.png`;
            await page.locator('#game-canvas').screenshot({ path: path.join(outDir, file) });
            shots.push({ id, name: building.name, file });
            console.log(`📸 ${id}`);

            await page.evaluate(bid => window.gameManager.buildingSystem.removeBuilding(bid), building.id);
            await page.waitForTimeout(200);
        }

        const cards = shots.map(s => `<figure><img src="${s.file}" loading="lazy"><figcaption>${s.name}<br><code>${s.id}</code></figcaption></figure>`).join('\n');
        fs.writeFileSync(path.join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Prédios</title>
<style>body{font:14px sans-serif;margin:16px;background:#222;color:#eee}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
figure{margin:0;background:#333;border-radius:6px;overflow:hidden}img{width:100%;display:block}figcaption{padding:6px 8px}code{color:#9cf}</style>
<h1>${shots.length} prédios</h1><main>${cards}</main>`);

        console.log(`\n✅ ${shots.length}/${ids.length} fotos em ${path.relative(ROOT, outDir)} (abra index.html)`);
        if (failed.length) {
            console.error(`\n⚠️  sem foto:\n${failed.join('\n')}`);
            process.exitCode = 1;
        }
        if (errors.length) {
            console.error(`\n❌ erros no console durante as fotos:\n${errors.join('\n')}`);
            process.exitCode = 1;
        }
    } finally {
        await browser.close();
        stopServer(server);
    }
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
