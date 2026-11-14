/**
 * Momentos da cidade (11/2026, 1ª auditoria de game design: "ideias de momentos uau deste jogo"). Não muda nenhuma
 * regra: olha os sistemas a cada CHECK_EVERY_MS de jogo (tick, chamado pelo GameManager.update) e transforma o que
 * já acontece num momento com câmera, voz e diário.
 *
 *   - A nascente que volta: o aquífero caiu abaixo de SPRING_LOW e depois passou de SPRING_HIGH → um olho-d'água brota
 *     numa encosta perto da cidade (malha pequena, nada na grade), o José comenta e entra no diário. Se o aquífero cair
 *     de novo abaixo de SPRING_LOW ele seca (e pode voltar). Construir em cima também o apaga.
 *   - Cheia contida: enchente com uma resposta que cortou o estrago (effectScale ≤ EventSystem.GOOD_THREAT_IMPACT)
 *     e a várzea já cheia (GameManager.floodplainWet) → corte até a várzea perto dos bairros: "parou antes das casas".
 *     É verdade no jogo: nada se constrói na várzea (regra das faixas do rio).
 *   - Chuva da sua cidade: clima REAL (não simulado) da cidade do perfil começou a chover → o Paulo avisa e mostra
 *     quanto o aquífero sobe por minuto com a chuva (ResourceManager.AQUIFER_RAIN_RECHARGE).
 *   - Primeiros carros: o primeiro veículo do CityLifeSystem (20 blocos de rua ligados) → a câmera segue o carro ~3 s,
 *     com buzina.
 *   - Álbum "Como a cidade mudou": uma foto do MESMO ângulo (área inicial + rio, GridManager.getStartFraming) no
 *     começo e a cada missão cumprida, por render target (sem o HUD). Fica no localStorage do perfil
 *     (STORAGE_PREFIX + 'album_' + perfil, não no save: o save tem limite de 30 KB) e aparece no Diário da cidade.
 *
 * Os planos de câmera só tocam com o jogador à toa (UIManager.isIdleForCityCut) e nunca com movimento reduzido;
 * sem plano, vira um aviso com "Ver onde". Partes puras testadas em tests/unit/moments.test.js; E2E em
 * tests/city-moments.spec.js.
 */
class CityMoments {
    static CHECK_EVERY_MS = 2000;
    static SPRING_LOW = 30;          // aquífero (%) que "seca" a nascente / arma a volta
    static SPRING_HIGH = 80;         // aquífero (%) que faz a nascente brotar de novo
    static FLOOD_FILL = 0.8;         // várzea já cheia (GameManager.floodplainWet 0-1)
    static RAIN_GAP_MS = 20 * 60 * 1000; // tempo real entre dois avisos de chuva de verdade
    static ALBUM_MAX = 30;           // fotos por perfil (a do começo nunca sai)
    static ALBUM_SIZE = { width: 400, height: 225 };
    static ALBUM_QUALITY = 0.7;

    constructor() {
        this.reset();
    }

    /** Jogo novo: tudo do zero (o álbum do perfil é apagado por clearAlbum, chamado no startNewGame). */
    reset() {
        this.state = { aquiferWasLow: false, spring: null, carsShown: false, startShot: false };
        this.timer = 0;
        this.floodShown = new Set();
        this.lastRainNotice = -Infinity;
        this.wasRaining = null;
        this.albumSeen = new Set();
        this.primeAfterLoad = false;
        this.disposeSpring();
    }

    getSaveData() {
        return { ...this.state, spring: this.state.spring ? { ...this.state.spring } : null };
    }

    /**
     * Save antigo (sem momentos): nada de nascente, carros já vistos se a rede já tinha trânsito e sem a foto do
     * começo (a cidade já não é mais o começo). As missões já cumpridas não ganham foto.
     */
    loadData(data, gm) {
        this.reset();
        if (data) {
            this.state.aquiferWasLow = !!data.aquiferWasLow;
            this.state.carsShown = !!data.carsShown;
            this.state.startShot = !!data.startShot;
            const s = data.spring;
            if (s && Number.isInteger(s.x) && Number.isInteger(s.z)) this.state.spring = { x: s.x, z: s.z };
        } else {
            this.state.startShot = true;
            this.primeCars = true;
        }
        this.primeAfterLoad = true;
        this.albumSeen = new Set(gm?.questSystem?.completedQuests || []);
        if (gm) this.pruneAlbum(gm);
    }

    // ===== Partes puras =====

    /**
     * Um passo da nascente pelo nível do aquífero (puro). state = { aquiferWasLow, spring } → { aquiferWasLow, event }
     * event: 'appear' (precisa de célula), 'dry' ou null.
     */
    static springStep(state, aquifer) {
        if (!Number.isFinite(aquifer)) return { aquiferWasLow: !!state.aquiferWasLow, event: null };
        if (aquifer < CityMoments.SPRING_LOW) {
            return { aquiferWasLow: true, event: state.spring ? 'dry' : null };
        }
        if (state.aquiferWasLow && !state.spring && aquifer > CityMoments.SPRING_HIGH) {
            return { aquiferWasLow: false, event: 'appear' };
        }
        return { aquiferWasLow: !!state.aquiferWasLow, event: null };
    }

    /**
     * Célula da nascente (puro, com a grade como interface): encosta livre mais perto de `near` (célula); sem
     * encosta, a faixa de APP livre mais perto. blocked(x, z) = árvore etc. null se não houver lugar.
     */
    static pickSpringCell(grid, near, blocked = () => false) {
        const n = grid.gridSize;
        let best = null;
        for (const pass of ['hill', 'app']) {
            for (let x = 0; x < n; x++) {
                for (let z = 0; z < n; z++) {
                    const type = grid.getTerrainType(x, z);
                    const ok = pass === 'hill' ? type === 'hill' : type !== 'water' && grid.getRiverZone?.(x, z) === 'app';
                    if (!ok || grid.isCellOccupied(x, z) || blocked(x, z)) continue;
                    const d = Math.hypot(x - near.x, z - near.z);
                    if (!best || d < best.d) best = { x, z, d };
                }
            }
            if (best) return { x: best.x, z: best.z };
        }
        return null;
    }

    /** Começou a chover agora? (puro) prev = estado da última olhada (null = primeira). */
    static rainStarted(prev, rain) {
        return rain > 0 && prev !== true;
    }

    /** Quanto do estrago a resposta evitou (0-100, puro). */
    static savedPercent(effectScale) {
        const s = Number.isFinite(effectScale) ? effectScale : 1;
        return Math.max(0, Math.min(100, Math.round((1 - Math.min(1, s)) * 100)));
    }

    /** Álbum sem fotos de missões que ainda não foram cumpridas (save de antes) e no máximo ALBUM_MAX (puro). */
    static trimAlbum(album, completed) {
        const done = completed instanceof Set ? completed : new Set(completed || []);
        let list = (Array.isArray(album) ? album : []).filter(p => p && typeof p.img === 'string' && (p.key === 'start' || done.has(p.key)));
        while (list.length > CityMoments.ALBUM_MAX) {
            const i = list.findIndex(p => p.key !== 'start');
            if (i < 0) break;
            list.splice(i, 1);
        }
        return list;
    }

    // ===== Olhar os sistemas =====

    tick(dt, gm) {
        this.timer += dt || 0;
        if (this.timer < CityMoments.CHECK_EVERY_MS) return;
        this.timer = 0;
        this.check(gm);
    }

    check(gm) {
        if (!gm || gm.gameState !== 'playing' || !gm.tutorialDone) return;
        if (this.primeAfterLoad) {
            // depois de carregar: a nascente salva volta a aparecer, cheias ativas só são marcadas
            this.primeAfterLoad = false;
            gm.eventSystem?.activeEvents?.forEach((e, id) => this.floodShown.add(id));
            if (this.state.spring) this.createSpring(gm, this.state.spring);
            if (this.primeCars) this.state.carsShown = (gm.cityLifeSystem?.getTargetVehicleCount?.() || 0) > 0;
            this.primeCars = false;
        }
        try {
            this.checkSpring(gm);
            this.checkFlood(gm);
            this.checkRain(gm);
            this.checkCars(gm);
            this.checkAlbum(gm);
        } catch (error) {
            console.error('❌ Erro nos momentos da cidade:', error);
        }
    }

    ui(gm) {
        return gm.uiManager;
    }

    canCut(gm) {
        return !!this.ui(gm)?.isIdleForCityCut?.();
    }

    diary(gm, icon, text) {
        gm.cityDiary?.add?.('moment', { icon, text }, gm);
    }

    // ----- A nascente que volta -----

    checkSpring(gm) {
        const spring = this.state.spring;
        // construiu em cima: o olho-d'água some sem alarde
        if (spring && gm.gridManager?.isCellOccupied?.(spring.x, spring.z)) {
            this.state.spring = null;
            this.disposeSpring();
        }
        const aquifer = gm.resourceManager?.resources?.water?.aquifer;
        const step = CityMoments.springStep(this.state, aquifer);
        this.state.aquiferWasLow = step.aquiferWasLow;
        if (step.event === 'appear') this.springAppears(gm);
        else if (step.event === 'dry') this.springDries(gm);
    }

    cityCenterCell(gm) {
        const list = (gm.buildingSystem?.getAllBuildings?.() || []).filter(b => b?.config && !b.config.roadType);
        if (list.length) {
            return {
                x: list.reduce((s, b) => s + b.gridX, 0) / list.length,
                z: list.reduce((s, b) => s + b.gridZ, 0) / list.length
            };
        }
        const sa = gm.gridManager?.startArea;
        return sa ? { x: sa.x, z: sa.z } : { x: (gm.gridManager?.gridSize || 40) / 2, z: (gm.gridManager?.gridSize || 40) / 2 };
    }

    springAppears(gm) {
        const grid = gm.gridManager;
        if (!grid) return;
        const trees = gm.treeSystem?.trees;
        const cell = CityMoments.pickSpringCell(grid, this.cityCenterCell(gm), (x, z) => !!trees?.has?.(`${x},${z}`));
        if (!cell) return;
        this.state.spring = cell;
        this.createSpring(gm, cell);
        this.diary(gm, '💧', 'Um olho-d\'água voltou a brotar na encosta: o aquífero encheu de novo');
        const ui = this.ui(gm);
        const toast = () => ui?.showNotification?.(
            'Pescador José: o aquífero encheu tanto que a água voltou a brotar na encosta. Um olho-d\'água! Fazia anos que eu não via isso.',
            'success', 9000, { className: 'toast--moment', actions: [{ label: 'Ver onde', onClick: () => ui.lookAtNotebookCell?.(cell) }] });
        const w = grid.gridToWorld(cell.x, cell.z);
        const started = this.canCut(gm) && CityCinematic.playSpot(gm, { x: w.x, z: w.z },
            'José: olha lá… um olho-d\'água! Fazia anos que eu não via a água brotar dessa encosta.', toast, { radius: 15 });
        if (!started) toast();
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('sfx_discovery', 0.7);
            setTimeout(() => AudioManager.onSpeaker?.('jose', 'happy'), 500);
        }
    }

    springDries(gm) {
        this.state.spring = null;
        this.disposeSpring();
        this.diary(gm, '🏜️', 'O olho-d\'água da encosta secou: o aquífero baixou demais');
        this.ui(gm)?.showNotification?.('Pescador José: o olho-d\'água da encosta secou… o aquífero baixou demais. Árvores e jardins de chuva ajudam a água a voltar para dentro da terra.', 'warning', 8000);
    }

    /** Olho-d'água: espelho de água redondo, pedras em volta e uma onda que se abre devagar. Nada na grade. */
    createSpring(gm, cell) {
        this.disposeSpring();
        const scene = gm.scene, grid = gm.gridManager;
        if (!scene || !grid || typeof BABYLON === 'undefined') return;
        const w = grid.gridToWorld(cell.x, cell.z);
        const y = (grid.getTerrainBlockHeight?.(cell.x, cell.z) ?? 0) + 0.03;
        const root = new BABYLON.TransformNode('spring_root', scene);
        root.position.set(w.x, y, w.z);
        const colors = grid.getWaterColors?.() || { shallow: [0.35, 0.75, 0.85], deep: [0.1, 0.4, 0.6] };
        const waterMat = new BABYLON.StandardMaterial('spring_water', scene);
        waterMat.diffuseColor = new BABYLON.Color3(...colors.shallow);
        waterMat.emissiveColor = new BABYLON.Color3(...colors.shallow).scale(0.35);
        waterMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        waterMat.alpha = 0.92;
        const pool = BABYLON.MeshBuilder.CreateDisc('spring_pool', { radius: 0.5, tessellation: 24 }, scene);
        pool.rotation.x = Math.PI / 2;
        pool.material = waterMat;
        pool.parent = root;
        const ring = BABYLON.MeshBuilder.CreateTorus('spring_ripple', { diameter: 0.5, thickness: 0.03, tessellation: 24 }, scene);
        const ringMat = new BABYLON.StandardMaterial('spring_ripple_mat', scene);
        ringMat.diffuseColor = new BABYLON.Color3(0.92, 0.98, 1);
        ringMat.emissiveColor = new BABYLON.Color3(0.5, 0.6, 0.65);
        ring.material = ringMat;
        ring.position.y = 0.02;
        ring.parent = root;
        const rockMat = new BABYLON.StandardMaterial('spring_rock', scene);
        rockMat.diffuseColor = new BABYLON.Color3(0.48, 0.44, 0.4);
        rockMat.specularColor = BABYLON.Color3.Black();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + 0.3;
            const rock = BABYLON.MeshBuilder.CreatePolyhedron(`spring_rock_${i}`, { type: 1, size: 0.08 + (i % 3) * 0.03 }, scene);
            rock.position.set(Math.cos(a) * 0.6, 0.04, Math.sin(a) * 0.6);
            rock.rotation.y = a;
            rock.material = rockMat;
            rock.parent = root;
        }
        root.getChildMeshes().forEach(m => {
            m.isPickable = false;
            m.metadata = { ...(m.metadata || {}), spring: true };
        });
        const reduced = typeof CityCinematic !== 'undefined' && CityCinematic.reducedMotion();
        this.springObserver = reduced ? null : scene.onBeforeRenderObservable.add(() => {
            const t = (performance.now() % 2400) / 2400; // onda: abre e some a cada 2,4 s
            ring.scaling.set(1 + t * 1.6, 1, 1 + t * 1.6);
            ringMat.alpha = 0.8 * (1 - t);
        });
        this.springMesh = { root, materials: [waterMat, ringMat, rockMat], scene };
    }

    disposeSpring() {
        const s = this.springMesh;
        if (!s) return;
        if (this.springObserver) s.scene?.onBeforeRenderObservable.remove(this.springObserver);
        this.springObserver = null;
        s.root.getChildMeshes().forEach(m => m.dispose());
        s.root.dispose();
        s.materials.forEach(m => m.dispose());
        this.springMesh = null;
    }

    // ----- Cheia contida -----

    checkFlood(gm) {
        const es = gm.eventSystem;
        if (!es?.activeEvents || (gm.floodplainWet || 0) < CityMoments.FLOOD_FILL) return;
        es.activeEvents.forEach((event, id) => {
            if (event.type !== 'flood' || this.floodShown.has(id)) return;
            this.floodShown.add(id);
            const option = es.getResponseOption?.(event.config, event.responseId);
            const scale = event.effectScale ?? 1;
            if (!option || option.tier === 'none' || scale > EventSystem.GOOD_THREAT_IMPACT) return;
            this.floodContained(gm, CityMoments.savedPercent(scale));
        });
    }

    /** Várzea (ou água) mais perto dos bairros. */
    floodplainNearHomes(gm) {
        const grid = gm.gridManager;
        const homes = (gm.buildingSystem?.getAllBuildings?.() || []).filter(b => b?.config?.zoneType && b.config.category === 'residential');
        const near = homes.length
            ? { x: homes.reduce((s, b) => s + b.gridX, 0) / homes.length, z: homes.reduce((s, b) => s + b.gridZ, 0) / homes.length }
            : this.cityCenterCell(gm);
        let best = null;
        for (const want of ['floodplain', 'water']) {
            for (let x = 0; x < grid.gridSize; x++) {
                for (let z = 0; z < grid.gridSize; z++) {
                    if (grid.getTerrainType(x, z) !== want) continue;
                    const d = Math.hypot(x - near.x, z - near.z);
                    if (!best || d < best.d) best = { x, z, d };
                }
            }
            if (best) break;
        }
        if (!best) return null;
        // entre a várzea e os bairros: mostra as duas coisas no quadro
        return { x: Math.round(best.x + (near.x - best.x) * 0.3), z: Math.round(best.z + (near.z - best.z) * 0.3) };
    }

    floodContained(gm, pct) {
        const cell = this.floodplainNearHomes(gm);
        const ui = this.ui(gm);
        this.diary(gm, '🌊', `A cheia encheu a várzea e parou antes das casas: evitamos ${pct}% do estrago`);
        const toast = () => ui?.showNotification?.(
            `Secretário Paulo: a cheia encheu a várzea e parou antes das casas. Evitamos ${pct}% do estrago! A várzea é o lugar do rio quando ele enche.`,
            'success', 9000, { className: 'toast--moment', actions: cell ? [{ label: 'Ver onde', onClick: () => ui.lookAtNotebookCell?.(cell) }] : [] });
        let started = false;
        if (cell && this.canCut(gm)) {
            const w = gm.gridManager.gridToWorld(cell.x, cell.z);
            started = CityCinematic.playSpot(gm, { x: w.x, z: w.z },
                `A água encheu a várzea e parou antes das casas · evitamos ${pct}% do estrago`, toast, { radius: 22 });
        }
        if (!started) toast();
        if (typeof AudioManager !== 'undefined') setTimeout(() => AudioManager.onSpeaker?.('paulo', 'happy'), 400);
    }

    // ----- Chuva da sua cidade -----

    checkRain(gm) {
        const rain = gm.weatherEffects?.profile?.rain || 0;
        const real = gm.uiManager?.weather && !gm.uiManager.weather.simulated;
        const started = CityMoments.rainStarted(this.wasRaining, rain);
        this.wasRaining = rain > 0;
        if (!started || !real) return;
        const city = typeof PlayerProfile !== 'undefined' ? PlayerProfile.getActive()?.city : '';
        const now = Date.now();
        if (!city || now - this.lastRainNotice < CityMoments.RAIN_GAP_MS) return;
        this.lastRainNotice = now;
        const perMin = (ResourceManager.AQUIFER_RAIN_RECHARGE * rain).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
        const ui = this.ui(gm);
        const actions = [{
            label: 'Ver o aquífero',
            onClick: () => (ui.openAquiferView ? ui.openAquiferView() : ui.showResourcePanel?.('water'))
        }];
        ui?.showNotification?.(
            `Secretário Paulo: está chovendo de verdade em ${city} agora, e na nossa cidade também! A chuva entra na terra e enche o aquífero: +${perMin}% por minuto enquanto chover.`,
            'info', 10000, { className: 'toast--moment', actions });
        if (typeof AudioManager !== 'undefined') AudioManager.onSpeaker?.('paulo', 'happy');
    }

    // ----- Primeiros carros -----

    checkCars(gm) {
        if (this.state.carsShown) return;
        const vehicles = gm.cityLifeSystem?.vehicles || [];
        const car = vehicles.find(v => v.kind === 'car' && v.mesh && !v.mesh.isDisposed()) || vehicles.find(v => v.mesh && !v.mesh.isDisposed());
        if (!car) return;
        this.state.carsShown = true;
        this.diary(gm, '🚗', 'Os primeiros carros saíram às ruas');
        const ui = this.ui(gm);
        const toast = () => ui?.showNotification?.('Os primeiros carros saíram às ruas! Com 20 blocos de rua ligados, a cidade começa a se mexer.', 'success', 6000);
        const started = this.canCut(gm) && CityCinematic.playFollow(gm, () => {
            const p = car.mesh && !car.mesh.isDisposed() ? car.mesh.position : null;
            return p ? { x: p.x, z: p.z } : null;
        }, 'Os primeiros carros na rua!', null);
        if (!started) toast();
        if (typeof AudioManager !== 'undefined') setTimeout(() => AudioManager.playSound('sfx_car_horn', 0.6), started ? 900 : 0);
    }

    // ----- Álbum "Como a cidade mudou" -----

    static albumKey(profileId) {
        return `${typeof STORAGE_PREFIX !== 'undefined' ? STORAGE_PREFIX : 'guardiao_agua_'}album_${profileId || 'anon'}`;
    }

    profileId() {
        return typeof PlayerProfile !== 'undefined' ? PlayerProfile.getActive()?.id : null;
    }

    getAlbum() {
        try {
            const list = JSON.parse(localStorage.getItem(CityMoments.albumKey(this.profileId())) || '[]');
            return Array.isArray(list) ? list : [];
        } catch {
            return [];
        }
    }

    saveAlbum(list) {
        const key = CityMoments.albumKey(this.profileId());
        let items = list.slice();
        // cheio: tira a foto mais antiga (menos a do começo) e tenta de novo
        for (let tries = 0; tries < 6; tries++) {
            try {
                localStorage.setItem(key, JSON.stringify(items));
                return true;
            } catch {
                const i = items.findIndex(p => p.key !== 'start');
                if (i < 0 || items.length <= 1) return false;
                items.splice(i, 1);
            }
        }
        return false;
    }

    clearAlbum() {
        try {
            localStorage.removeItem(CityMoments.albumKey(this.profileId()));
        } catch { /* sem localStorage: nada a apagar */ }
    }

    pruneAlbum(gm) {
        const album = this.getAlbum();
        const trimmed = CityMoments.trimAlbum(album, gm.questSystem?.completedQuests);
        if (trimmed.length !== album.length) this.saveAlbum(trimmed);
    }

    checkAlbum(gm) {
        if (!this.state.startShot) {
            this.state.startShot = true;
            this.capturePhoto(gm, 'start', 'O começo');
        }
        const done = gm.questSystem?.completedQuests;
        if (!done) return;
        for (const id of done) {
            if (this.albumSeen.has(id)) continue;
            this.albumSeen.add(id);
            if (String(id).startsWith('city_challenge_')) continue; // só a campanha
            const title = gm.questSystem.quests?.get?.(id)?.title || '';
            this.capturePhoto(gm, id, title);
        }
    }

    /** Pose fixa do álbum: a área inicial e o rio mais perto, no ângulo isométrico de sempre. */
    albumPose(gm) {
        const framing = gm.gridManager?.getStartFraming?.();
        const target = framing ? { x: framing.x, z: framing.z } : { x: 0, z: 0 };
        const radius = Math.min(60, Math.max(40, (framing?.radius || 30) * 1.35));
        return { target, alpha: CAMERA.ISOMETRIC_ALPHA, beta: CAMERA.ISOMETRIC_BETA, radius };
    }

    /**
     * Foto do mesmo ângulo por um render target PRÓPRIO (sem HUD). Não usa BABYLON.Tools.CreateScreenshotUsing-
     * RenderTarget: ele muda o tamanho da engine (engine.setSize) enquanto a foto não fica pronta, e um quadro do
     * jogo desenhado nesse meio-tempo deixava a tela pequena no canto inferior esquerdo. Aqui a engine nunca muda
     * de tamanho: renderiza na textura, lê os pixels e monta o JPEG num canvas 2D. Assíncrona; falha = sem foto.
     */
    capturePhoto(gm, key, title) {
        const scene = gm.scene, engine = gm.engine || scene?.getEngine?.();
        if (!scene || !engine || typeof BABYLON === 'undefined' || !BABYLON.RenderTargetTexture) return null;
        const pose = this.albumPose(gm);
        const camera = new BABYLON.ArcRotateCamera('album_camera', pose.alpha, pose.beta, pose.radius,
            new BABYLON.Vector3(pose.target.x, 0, pose.target.z), scene);
        camera.minZ = gm.camera?.minZ ?? 0.1;
        camera.maxZ = gm.camera?.maxZ ?? 1000;
        camera.fov = gm.camera?.fov ?? camera.fov;
        const { width, height } = CityMoments.ALBUM_SIZE;
        const day = typeof CityDiary !== 'undefined' ? CityDiary.dayOf(gm) : 1;
        const name = typeof PlayerProfile !== 'undefined' ? PlayerProfile.displayName() : '';
        const label = String(title || '').replace(/\{nome\}/g, name);
        // as nuvens ficam entre a câmera alta do álbum e a cidade: somem só durante a foto (volta no finally)
        const clouds = (gm.weatherEffects?.clouds || []).filter(c => c?.isVisible && !c.isDisposed?.());
        clouds.forEach(c => { c.isVisible = false; });
        let rtt = null;
        this.pendingPhoto = Promise.resolve()
            .then(() => {
                rtt = new BABYLON.RenderTargetTexture('album_rtt', { width, height }, scene, false);
                rtt.activeCamera = camera;
                rtt.renderList = scene.meshes.filter(m => m.isEnabled() && m.isVisible && !m.isDisposed());
                rtt.clearColor = scene.clearColor;
                rtt.render(true);
                return rtt.readPixels();
            })
            .then(pixels => CityMoments.pixelsToJpeg(pixels, width, height))
            .then(img => {
                if (typeof img !== 'string' || !img.startsWith('data:image')) return null;
                const album = this.getAlbum().filter(p => p.key !== key);
                album.push({ key, title: label, day, gt: Math.round(gm.gameTime || 0), img });
                this.saveAlbum(CityMoments.trimAlbum(album, new Set([...(gm.questSystem?.completedQuests || []), key])));
                if (gm.uiManager?.isDiaryPanelOpen?.()) gm.uiManager.renderDiaryPanel();
                return key;
            })
            .catch(error => {
                logWarn('⚠️ Foto do álbum não saiu:', error);
                return null;
            })
            .finally(() => {
                clouds.forEach(c => { if (!c.isDisposed?.()) c.isVisible = true; });
                rtt?.dispose();
                camera.dispose();
            });
        return this.pendingPhoto;
    }

    /** Pixels RGBA do render target (linhas de baixo para cima) → data URL JPEG. */
    static pixelsToJpeg(pixels, width, height) {
        if (!pixels || pixels.length < width * height * 4) return null;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const image = ctx.createImageData(width, height);
        const row = width * 4;
        const src = pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray ? pixels : new Uint8Array(pixels.buffer || pixels);
        for (let y = 0; y < height; y++) {
            const from = (height - 1 - y) * row;
            image.data.set(src.subarray(from, from + row), y * row);
        }
        for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255; // sem transparência
        ctx.putImageData(image, 0, 0);
        return canvas.toDataURL('image/jpeg', CityMoments.ALBUM_QUALITY);
    }
}

window.CityMoments = CityMoments;
