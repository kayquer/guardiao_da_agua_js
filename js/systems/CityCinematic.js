/**
 * Planos de câmera na cena do JOGO (11/2026): o voo da vitória sobre a cidade do próprio jogador e o corte curto até
 * a 1ª espécie ameaçada que chega. Mesma ideia da abertura do menu (js/systems/intro/IntroCinematic.js: caminho
 * Catmull-Rom, faixas de cinema, legendas, "Pular"), mas com a câmera do jogo (ArcRotateCamera: alvo, alpha, beta,
 * raio), sem engine nem cena novas.
 *
 * Enquanto toca: `gameState = 'cinematic'` (GameManager.update não simula nada, o Espaço não pausa, o Esc não abre
 * a pausa, o autosave não grava), `body.city-cinematic` some com o HUD e o observador desta classe roda DEPOIS do
 * SimCityCameraControls no onBeforeRenderObservable (a pose daqui é a que vale no quadro). No fim os alvos dos
 * controles recebem a pose final (sem pulo) e o estado volta ao de antes. Beta termina em π/3.5, o ângulo que os
 * controles travam. Pulável: Esc, Enter, Espaço, clique/toque ou "Pular". Com prefers-reduced-motion não toca
 * (play devolve false e quem chamou segue direto).
 *
 * Partes puras (testadas em tests/unit/diary.test.js): catmull, sample, planVictory, planSpecies.
 */
class CityCinematic {
    static VICTORY_MS = 12500;
    static SPECIES_MS = 3200;
    static ISO_BETA = Math.PI / 3.5;
    static current = null;

    static reducedMotion() {
        return !!(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    }

    static catmull(p0, p1, p2, p3, t) {
        const t2 = t * t, t3 = t2 * t;
        return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }

    /** Voo contínuo: quase linear, só amacia as pontas (o mesmo de IntroCinematic.ease 'flight'). */
    static ease(t) {
        return t * 0.55 + (0.5 - Math.cos(Math.PI * t) / 2) * 0.45;
    }

    /** Pose no ponto u (0..1) do caminho: cada número passa pelos quadros-chave numa curva Catmull-Rom. */
    static sample(keys, u) {
        const n = keys.length;
        if (n === 1) return { ...keys[0] };
        const s = Math.max(0, Math.min(n - 1 - 1e-6, u * (n - 1)));
        const i = Math.floor(s);
        const t = s - i;
        const K = k => keys[Math.max(0, Math.min(n - 1, k))];
        const out = {};
        for (const key of ['x', 'z', 'alpha', 'beta', 'radius']) {
            out[key] = CityCinematic.catmull(K(i - 1)[key], K(i)[key], K(i + 1)[key], K(i + 2)[key], t);
        }
        return out;
    }

    /**
     * Quadros-chave do voo da vitória (puro). start = pose atual { x, z, alpha, beta, radius }; poi = { center, river,
     * homes, utilities } em mundo ({ x, z } ou null) e extent (alcance da cidade). Rio → bairros → usinas/ETE → giro
     * lento sobre o centro. Pontos ausentes ou colados no anterior são pulados.
     */
    static planVictory(start, poi = {}) {
        const center = poi.center || { x: start.x, z: start.z };
        const keys = [{ x: start.x, z: start.z, alpha: start.alpha, beta: start.beta, radius: start.radius }];
        let alpha = start.alpha;
        const stops = [
            [poi.river, 20, 1.06],
            [poi.homes, 22, 1.0],
            [poi.utilities, 20, 0.97]
        ];
        for (const [p, radius, beta] of stops) {
            if (!p) continue;
            const last = keys[keys.length - 1];
            if (Math.hypot(p.x - last.x, p.z - last.z) < 4) continue;
            alpha += 0.55;
            keys.push({ x: p.x, z: p.z, alpha, beta, radius });
        }
        const wide = Math.max(30, Math.min(52, (poi.extent || 20) * 1.25 + 14));
        alpha += 0.5;
        keys.push({ x: center.x, z: center.z, alpha, beta: 1.0, radius: wide * 0.9 });
        // giro lento: mesmo centro, a câmera dá a volta devagar e termina no ângulo de sempre do jogo
        keys.push({ x: center.x, z: center.z, alpha: alpha + 0.7, beta: CityCinematic.ISO_BETA, radius: wide });
        return keys;
    }

    /** Corte curto até um ponto (a espécie que chegou): aproxima, gira um pouco e para no ângulo do jogo. */
    static planSpecies(start, target) {
        const mid = { x: start.x + (target.x - start.x) * 0.7, z: start.z + (target.z - start.z) * 0.7 };
        return [
            { x: start.x, z: start.z, alpha: start.alpha, beta: start.beta, radius: start.radius },
            { x: mid.x, z: mid.z, alpha: start.alpha + 0.2, beta: 1.0, radius: Math.max(18, Math.min(start.radius, 28)) },
            { x: target.x, z: target.z, alpha: start.alpha + 0.35, beta: CityCinematic.ISO_BETA, radius: 16 }
        ];
    }

    /** Pontos da cidade do jogador (mundo): centro, rio mais perto, bairros, a obra de água/energia mais cara. */
    static cityPoints(gm) {
        const grid = gm.gridManager;
        const buildings = (gm.buildingSystem?.getAllBuildings?.() || []).filter(b => b?.config && !b.underConstruction && !b.config.roadType);
        const at = b => {
            const size = b.config.size || 1;
            const w = grid.gridToWorld(b.gridX + (size - 1) / 2, b.gridZ + (size - 1) / 2);
            return { x: w.x, z: w.z };
        };
        const mean = list => (list.length ? {
            x: list.reduce((s, p) => s + p.x, 0) / list.length,
            z: list.reduce((s, p) => s + p.z, 0) / list.length
        } : null);
        const all = buildings.map(at);
        const start = grid.startArea ? grid.gridToWorld(grid.startArea.x, grid.startArea.z) : { x: 0, z: 0 };
        const center = mean(all) || { x: start.x, z: start.z };
        const homes = mean(buildings.filter(b => b.config.zoneType && b.config.category === 'residential').map(at)) ||
            mean(buildings.filter(b => b.config.zoneType).map(at));
        const utility = buildings
            .filter(b => ['water', 'treatment', 'power'].includes(b.config.category))
            .sort((a, b) => (b.config.cost || 0) - (a.config.cost || 0))[0];
        // célula de água mais perto do centro
        let river = null;
        const cs = grid.cellSize || 2, half = (grid.gridSize * cs) / 2;
        let best = Infinity;
        for (let x = 0; x < grid.gridSize; x++) {
            for (let z = 0; z < grid.gridSize; z++) {
                if (grid.terrainGrid?.[x]?.[z] !== 'water') continue;
                const wx = (x + 0.5) * cs - half, wz = (z + 0.5) * cs - half;
                const d = Math.hypot(wx - center.x, wz - center.z);
                if (d < best) { best = d; river = { x: wx, z: wz }; }
            }
        }
        const extent = all.reduce((m, p) => Math.max(m, Math.hypot(p.x - center.x, p.z - center.z)), 0);
        return { center, river, homes, utilities: utility ? at(utility) : null, extent };
    }

    static poseOf(camera) {
        const t = camera.target || camera.getTarget();
        return { x: t.x, z: t.z, alpha: camera.alpha, beta: camera.beta, radius: camera.radius };
    }

    /**
     * Voo da vitória. Devolve true se começou (onDone vem no fim ou ao pular); false = sem voo (movimento reduzido,
     * sem câmera, outro plano tocando) e quem chamou segue direto.
     */
    static playVictory(gm, captions, onDone) {
        if (!gm?.camera || CityCinematic.reducedMotion() || CityCinematic.current) return false;
        const keys = CityCinematic.planVictory(CityCinematic.poseOf(gm.camera), CityCinematic.cityPoints(gm));
        return new CityCinematic(gm).play({ keys, durationMs: CityCinematic.VICTORY_MS, captions, onDone, kind: 'victory' });
    }

    /** Corte curto até a célula (grade) de uma espécie. Mesmas regras de play. */
    static playSpecies(gm, cell, caption, onDone) {
        if (!gm?.camera || !cell || CityCinematic.reducedMotion() || CityCinematic.current) return false;
        const w = gm.gridManager.gridToWorld(cell.x, cell.z);
        const keys = CityCinematic.planSpecies(CityCinematic.poseOf(gm.camera), { x: w.x, z: w.z });
        return new CityCinematic(gm).play({ keys, durationMs: CityCinematic.SPECIES_MS, captions: [{ at: 0.02, text: caption }], onDone, kind: 'species' });
    }

    constructor(gm) {
        this.gm = gm;
        this.done = false;
    }

    play({ keys, durationMs, captions = [], onDone = () => {}, kind = 'victory' }) {
        const gm = this.gm;
        const scene = gm.scene;
        if (!scene || !keys?.length) return false;
        CityCinematic.current = this;
        this.keys = keys;
        this.durationMs = durationMs;
        this.captions = captions.slice().sort((a, b) => a.at - b.at);
        this.captionIndex = -1;
        this.onDone = onDone;
        this.kind = kind;
        this.prevState = gm.gameState;
        gm.gameState = 'cinematic';
        if (gm.buildMode) gm.exitBuildMode?.();
        gm.uiManager?.closePlayerMenu?.();
        gm.uiManager?.closeSpeedMenu?.();

        this.overlay = this.ensureOverlay();
        this.overlay.dataset.kind = kind;
        this.overlay.hidden = false;
        this.caption = this.overlay.querySelector('.cc-caption');
        this.caption.classList.remove('is-on');
        document.body.classList.add('city-cinematic');
        // as faixas entram no quadro seguinte (transição do CSS)
        requestAnimationFrame(() => this.overlay?.classList.add('is-on'));
        this.bindSkip();

        this.startTime = performance.now();
        this.observer = scene.onBeforeRenderObservable.add(() => this.step());
        log(`🎬 Plano de câmera (${kind}): ${keys.length} quadros-chave, ${durationMs} ms`);
        return true;
    }

    step() {
        if (this.done) return;
        const u = Math.min(1, (performance.now() - this.startTime) / this.durationMs);
        this.applyPose(CityCinematic.sample(this.keys, CityCinematic.ease(u)));
        while (this.captionIndex + 1 < this.captions.length && this.captions[this.captionIndex + 1].at <= u) {
            this.captionIndex++;
            this.showCaption(this.captions[this.captionIndex].text);
        }
        if (u >= 1) this.finish();
    }

    /** Alvo primeiro (o setter recalcula ângulos pela posição antiga), depois alpha, beta e raio. */
    applyPose(p) {
        const camera = this.gm.camera;
        if (!camera || ![p.x, p.z, p.alpha, p.beta, p.radius].every(Number.isFinite)) return;
        camera.target = new BABYLON.Vector3(p.x, 0, p.z);
        camera.alpha = p.alpha;
        camera.beta = Math.max(0.3, Math.min(1.4, p.beta));
        const lo = camera.lowerRadiusLimit ?? 1, hi = camera.upperRadiusLimit ?? 200;
        camera.radius = Math.max(lo, Math.min(hi, p.radius));
    }

    showCaption(text) {
        const el = this.caption;
        if (!el) return;
        el.classList.remove('is-on');
        el.textContent = text || '';
        if (!text) return;
        void el.offsetWidth; // reinicia a animação de entrada
        el.classList.add('is-on');
    }

    skip() {
        if (this.done) return;
        // pulou: a câmera vai direto para a pose final (sem pulo quando os controles voltam)
        this.applyPose(this.keys[this.keys.length - 1]);
        this.finish();
    }

    finish() {
        if (this.done) return;
        this.done = true;
        const gm = this.gm;
        gm.scene?.onBeforeRenderObservable.remove(this.observer);
        this.observer = null;
        this.unbindSkip();
        // controles da câmera continuam de onde o plano parou
        const controls = gm.cameraControls;
        const camera = gm.camera;
        if (controls && camera) {
            controls.targetPosition?.copyFrom?.(camera.target);
            controls.targetAlpha = camera.alpha;
            controls.targetRadius = camera.radius;
        }
        if (camera) camera.beta = CityCinematic.ISO_BETA;
        if (gm.gameState === 'cinematic') gm.gameState = this.prevState === 'cinematic' ? 'playing' : this.prevState;
        this.overlay?.classList.remove('is-on');
        if (this.overlay) this.overlay.hidden = true;
        this.caption?.classList.remove('is-on');
        document.body.classList.remove('city-cinematic');
        if (CityCinematic.current === this) CityCinematic.current = null;
        log(`🎬 Plano de câmera (${this.kind}) terminou`);
        try {
            this.onDone?.();
        } catch (error) {
            console.error('❌ Erro depois do plano de câmera:', error);
        }
    }

    bindSkip() {
        this.onKey = event => {
            if (!['Escape', 'Enter', ' '].includes(event.key) && event.code !== 'Space') return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!event.repeat) this.skip();
        };
        this.onPointer = event => {
            if (!event.target?.closest?.('#city-cinematic, #game-canvas, #game-screen')) return;
            event.preventDefault();
            event.stopPropagation();
            // o clique que pulou não pode cair num prédio ou botão que aparece embaixo do dedo
            const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); };
            window.addEventListener('click', swallow, { capture: true, once: true });
            setTimeout(() => window.removeEventListener('click', swallow, true), 600);
            this.skip();
        };
        window.addEventListener('keydown', this.onKey, true);
        window.addEventListener('pointerdown', this.onPointer, true);
    }

    unbindSkip() {
        if (this.onKey) window.removeEventListener('keydown', this.onKey, true);
        if (this.onPointer) window.removeEventListener('pointerdown', this.onPointer, true);
        this.onKey = this.onPointer = null;
    }

    ensureOverlay() {
        let el = document.getElementById('city-cinematic');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'city-cinematic';
        el.className = 'city-cinematic';
        el.hidden = true;
        el.innerHTML = `<div class="cc-bar cc-bar--top"></div>
            <div class="cc-bar cc-bar--bottom"></div>
            <p class="cc-caption" role="status" aria-live="polite"></p>
            <button type="button" class="cc-skip" id="city-cinematic-skip">Pular <span class="cc-skip-key">Esc</span></button>`;
        (document.getElementById('game-screen') || document.body).appendChild(el);
        return el;
    }
}

window.CityCinematic = CityCinematic;
