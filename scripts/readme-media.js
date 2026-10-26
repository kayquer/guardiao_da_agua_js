// Imagens e GIFs do README (docs/media/): abertura do menu, menu, uma cidade montada, menu de construção e aula.
// Uso: node scripts/readme-media.js   (precisa de ffmpeg no PATH para os GIFs; usa localhost:3000, sobe `npm start` se preciso)
// Repita depois de mudar o visual para o README não mostrar um jogo antigo.
const fs = require('fs');
const path = require('path');
const { spawn, execSync, execFileSync } = require('child_process');
const { chromium } = require('@playwright/test');
const { startGame, mockExternalApis, CLEAR_SKY } = require('../tests/helpers');

const ROOT = path.join(__dirname, '..');
const URL = 'http://localhost:3000';
const OUT = path.join(ROOT, 'docs', 'media');
const TMP = path.join(OUT, '_tmp');
const VIEW = { width: 1280, height: 720 };

const isUp = () => fetch(URL).then(r => r.ok, () => false);

async function startServer() {
    if (await isUp()) return null;
    const server = spawn('npm', ['start'], { cwd: ROOT, shell: true, stdio: 'ignore' });
    for (let i = 0; i < 60; i++) {
        if (await isUp()) return server;
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('servidor não subiu em localhost:3000');
}

function stopServer(server) {
    if (!server) return;
    if (process.platform === 'win32') execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
    else server.kill();
}

/** Trecho de um vídeo .webm → GIF com paleta própria (pequeno e sem faixas de cor). */
function toGif(video, out, { start, duration, width = 560, fps = 10 }) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start), '-t', String(duration), '-i', video,
        '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
        '-loop', '0', out]);
}

/** PNG → WebP menor para o README. */
function toWebp(png, out, width = 1280) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-vf', `scale=${width}:-1:flags=lanczos`, '-quality', '82', out]);
}

async function newContext(browser, video) {
    const context = await browser.newContext({
        viewport: VIEW,
        ...(video ? { recordVideo: { dir: TMP, size: VIEW } } : {})
    });
    // Qualidade alta (no headless o jogo detectaria placa de software e cairia na baixa)
    await context.addInitScript(() => localStorage.setItem('guardiao_agua_graphics', 'high'));
    return context;
}

async function intro(browser) {
    const context = await newContext(browser, true);
    const page = await context.newPage();
    const t0 = Date.now();
    await mockExternalApis(page, { forecast: CLEAR_SKY });
    await page.goto(`${URL}/index.html?intro`);
    await page.waitForFunction(() => document.body.classList.contains('intro-playing'), null, { timeout: 90000 });
    const startedAt = (Date.now() - t0) / 1000;
    await page.waitForTimeout(16000);
    await page.evaluate(() => MenuIntro.skip());
    await page.waitForFunction(() => document.body.classList.contains('menu-ready'), null, { timeout: 30000 });
    await page.waitForTimeout(2500); // painéis entram em cascata
    await page.screenshot({ path: path.join(TMP, 'menu.png') });
    const video = await page.video().path();
    await context.close();
    toGif(video, path.join(OUT, 'abertura.gif'), { start: startedAt + 1, duration: 11 });
    toWebp(path.join(TMP, 'menu.png'), path.join(OUT, 'menu.webp'));
    console.log('🎬 abertura.gif, menu.webp');
}

async function city(browser) {
    const context = await newContext(browser, true);
    const page = await context.newPage();
    const t0 = Date.now();
    await startGame(page, { url: `${URL}/index.html`, forecast: CLEAR_SKY });
    await page.evaluate(() => {
        const gm = window.gameManager;
        gm.tutorialSystem.complete();
        gm.studySystem.isBuildingUnlocked = () => true;
        gm.techTree && (gm.techTree.isTechReached = () => true);
        gm.gameOverSystem.update = () => {};
        gm.eventSystem.tryGenerateEvent = () => {};
        gm.uiManager.syncPopupPause = () => {};
        gm.uiManager.queueMissionCelebration = () => {}; // cartão de missão concluída cobriria a cidade
        gm.releasePause('popup');
        const rm = gm.resourceManager.resources;
        rm.budget.current = 1e7;
        const bs = gm.buildingSystem;
        bs.maxSimultaneousConstructions = 999; // senão só 3 obras por vez e o resto fica de fora
        const { x: cx, z: cz } = gm.gridManager.startArea;
        // Lugar livre mais perto do centro da área inicial (deslocado pelo "jeito" do prédio)
        const place = (type, dx, dz) => {
            bs.buildingCooldown.active = false;
            const spots = [];
            for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) spots.push([x, z]);
            spots.sort((a, b) => Math.hypot(a[0] - (cx + dx), a[1] - (cz + dz)) - Math.hypot(b[0] - (cx + dx), b[1] - (cz + dz)));
            const spot = spots.find(([x, z]) => bs.canPlaceBuilding(x, z, type, { quiet: true }).canPlace);
            if (!spot) return null;
            const b = bs.placeBuilding(spot[0], spot[1], type);
            if (b) b.constructionDuration = 1;
            return b;
        };
        // Avenida em cruz + prédios em volta
        for (let i = -7; i <= 7; i++) { place('paved_road', i, 0); place('paved_road', 0, i); }
        const plan = [
            ['city_hall', 2, 2], ['school', -3, 2], ['hospital', 2, -3], ['park', -2, -2],
            ['zone_residential_balanced', 5, 3], ['zone_residential_light', -5, 4], ['zone_residential_light', 4, 6],
            ['zone_commercial_balanced', -5, -3], ['zone_commercial_light', 5, -5], ['zone_industrial_light', -6, -7],
            ['water_pump', 8, 1], ['water_tank', -8, 1], ['treatment_plant', 1, 8], ['water_treatment_plant', 1, -8],
            ['wind_farm', 9, 7], ['solar_farm', -9, -4], ['rain_garden', 3, 1], ['tree_sapling', -1, 3]
        ];
        const failed = plan.filter(([type, dx, dz]) => !place(type, dx, dz)).map(([type]) => type);
        return failed;
    }).then(failed => failed.length && console.warn(`⚠️  sem lugar: ${failed.join(', ')}`));
    // Obras terminam e os modelos .glb chegam; zonas vão direto à fase completa
    await page.waitForFunction(() => {
        const bs = window.gameManager.buildingSystem;
        return [...bs.buildings.values()].every(b => !b.underConstruction) && !bs.hasPendingBuildingModels();
    }, null, { timeout: 60000 }).catch(() => console.warn('⚠️  algumas obras não terminaram'));
    await page.evaluate(() => {
        const gm = window.gameManager, bs = gm.buildingSystem;
        [...bs.buildings.values()].filter(b => b.config.zoneType).forEach(b => bs.forceZoneStage(b.id, 3));
        bs.forceTreeStage?.([...bs.buildings.values()].find(b => b.type === 'tree_sapling')?.id, 3);
        bs.buildings.forEach(b => b.noRoadIcon?.setEnabled?.(false)); // placas "Sem rua" das zonas longe da avenida
        gm.scene.particleSystems.filter(p => /completion|celebration|burst/i.test(p.name)).forEach(p => p.stop());
        document.querySelectorAll('.swal2-container, .central-alert-overlay, #mission-card').forEach(el => el.remove());
        document.getElementById('toast-stack')?.replaceChildren();
        // Centro dos prédios (não da área inicial: ela pode encostar num morro)
        const meshes = [...bs.buildings.values()].filter(b => !b.config.roadType).map(b => b.mesh.getAbsolutePosition());
        const center = meshes.reduce((c, m) => ({ x: c.x + m.x / meshes.length, z: c.z + m.z / meshes.length }), { x: 0, z: 0 });
        const cc = gm.cameraControls;
        cc.targetPosition.set(center.x, 0, center.z);
        cc.targetRadius = 34;
        cc.targetAlpha = -Math.PI / 4;
    });
    await page.addStyleTag({ content: '#toast-stack { display: none !important; }' });
    await page.waitForTimeout(8000); // peças das zonas crescem e a câmera assenta
    await page.screenshot({ path: path.join(TMP, 'cidade.png') });

    // Volta lenta em torno da cidade (para o GIF)
    const orbitStart = (Date.now() - t0) / 1000;
    await page.evaluate(() => {
        const cc = window.gameManager.cameraControls;
        const from = cc.targetAlpha, t = performance.now();
        const step = () => {
            const k = (performance.now() - t) / 10000;
            cc.targetAlpha = from + k * Math.PI * 0.6;
            if (k < 1) requestAnimationFrame(step);
        };
        step();
    });
    await page.waitForTimeout(10500);

    // Menu de construção (categoria Água, com a ficha do primeiro prédio)
    await page.evaluate(() => {
        const ui = window.gameManager.uiManager;
        ui.selectCategory('water');
        ui.showBuildInfo?.('water_treatment_plant');
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(TMP, 'construcao.png') });
    await page.evaluate(() => window.gameManager.uiManager.dismissBuildModal?.());

    // Livro de aulas
    await page.evaluate(() => window.gameManager.uiManager.openLessonBook(1));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(TMP, 'aula.png') });

    const video = await page.video().path();
    await context.close();
    toGif(video, path.join(OUT, 'cidade.gif'), { start: orbitStart + 0.3, duration: 8, fps: 9 });
    ['cidade', 'construcao', 'aula'].forEach(n => toWebp(path.join(TMP, `${n}.png`), path.join(OUT, `${n}.webp`)));
    console.log('🏙️  cidade.gif, cidade.webp, construcao.webp, aula.webp');
}

async function main() {
    fs.mkdirSync(TMP, { recursive: true });
    const server = await startServer();
    // GPU de verdade quando houver (o SwiftShader do headless deixa o vídeo travado)
    const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] });
    try {
        const only = process.argv.slice(2);
        if (!only.length || only.includes('intro')) await intro(browser);
        if (!only.length || only.includes('cidade')) await city(browser);
    } finally {
        await browser.close();
        stopServer(server);
        fs.rmSync(TMP, { recursive: true, force: true });
    }
}

main().catch(e => { console.error(e); process.exit(1); });
