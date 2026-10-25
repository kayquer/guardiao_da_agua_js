/**
 * ===== INTRO CINEMATOGRÁFICA (cidade de fundo do menu) =====
 * Engine e cena Babylon PRÓPRIAS, num <canvas> só dela (#intro-canvas), atrás do menu. Desenha a cidade de
 * INTRO_CITY (montada pela IntroLayout) com os modelos .glb reais dos prédios e voa a câmera pelas tomadas
 * de INTRO_SHOTS; no fim fica parada na pose final, balançando devagar (o menu aparece por cima).
 * Não toca no GameManager, no save nem na economia. dispose() libera tudo (cena, engine, listeners).
 *
 * Modelos: usa o carregador do jogo (BuildingSystem.prototype: loadBuildingModelFile →
 * extractBuildingModelData → createBuildingModelTemplate) com um contexto mínimo { scene, gridManager },
 * então a cor, a textura e o encaixe são os mesmos do jogo. A eólica é a exceção: é lida aqui mesmo para
 * manter os rotores (nós "pas_N") separados e girando.
 *
 *   const intro = new IntroCinematic(canvas, { fadeEl, quality: 'high' | 'medium' | 'low' }); // GraphicsQuality
 *   await intro.build(p => barra(p));                 // false se não deu (sem WebGL etc.)
 *   intro.play('full' | 'final', { onShot(i, shot), onFinish() });
 *   intro.skip();  intro.setOrbit(true|false);  intro.dispose();
 */
class IntroCinematic {
    constructor(canvas, { city = INTRO_CITY, shots = INTRO_SHOTS, fadeEl = null, quality = 'high' } = {}) {
        this.canvas = canvas;
        this.city = city;
        this.shotsData = shots;
        this.fadeEl = fadeEl;
        this.quality = quality;
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.rotors = [];
        this.cars = [];
        this.clouds = [];
        this.disposed = false;
        this.time = 0;          // ms acumulados (pausa junto com a aba)
        this.director = null;   // { shots, index, elapsed, onShot, onFinish }
        this.orbit = null;      // { center, radius, baseAngle, height, start }
        this.onResize = () => this.engine?.resize();
    }

    // ===================== MONTAGEM =====================

    async build(onProgress = () => {}) {
        try {
            this.engine = new BABYLON.Engine(this.canvas, this.quality === 'high', {
                preserveDrawingBuffer: false, stencil: false, powerPreference: 'high-performance'
            }, true);
        } catch (error) {
            console.warn('IntroCinematic: sem WebGL para a abertura', error?.message || error);
            return false;
        }
        // Celular: não renderiza na resolução nativa inteira (3x) — 1.5x já fica nítido; qualidade baixa: menos ainda
        const dpr = window.devicePixelRatio || 1;
        const pixels = Math.min(dpr, this.quality === 'high' ? 2 : 1.5) * (this.quality === 'low' ? 0.625 : 1);
        this.engine.setHardwareScalingLevel(1 / pixels);

        const scene = new BABYLON.Scene(this.engine);
        this.scene = scene;
        scene.skipPointerMovePicking = true;
        scene.autoClear = true;

        this.layout = new IntroLayout(this.city);
        if (this.layout.errors.length) console.warn('IntroCinematic: layout com problemas', this.layout.errors);

        this.createAtmosphere();
        this.createCamera();
        this.createLights();
        onProgress(0.1);
        this.createTerrain();
        this.createWater();
        this.createRoadDetails();
        this.createTrees();
        this.createClouds();
        this.createCars();
        onProgress(0.25);

        await this.createBuildings(p => onProgress(0.25 + p * 0.7));
        if (this.disposed) return false;

        this.createPostProcess();
        this.setCameraPose(this.finalPose());
        scene.onBeforeRenderObservable.add(() => this.tick());
        // Compila os shaders antes do primeiro quadro visível (sem engasgo no começo do voo)
        await scene.whenReadyAsync().catch(() => {});
        if (this.disposed) return false;
        this.engine.runRenderLoop(() => {
            if (!this.disposed && this.scene) this.scene.render();
        });
        window.addEventListener('resize', this.onResize);
        onProgress(1);
        return true;
    }

    cellToWorld(x, y, z) {
        const w = this.layout.toWorld(x, z);
        return new BABYLON.Vector3(w.x, y, w.z);
    }

    createAtmosphere() {
        const scene = this.scene;
        // Fim de tarde claro: horizonte quase branco-água, céu turquesa no alto
        this.horizon = new BABYLON.Color3(0.72, 0.87, 0.95);
        scene.clearColor = new BABYLON.Color4(this.horizon.r, this.horizon.g, this.horizon.b, 1);
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        scene.fogDensity = 0.0062;
        scene.fogColor = this.horizon.clone();
        scene.ambientColor = new BABYLON.Color3(0.25, 0.27, 0.3);

        const sky = BABYLON.MeshBuilder.CreateSphere('introSky', { diameter: 900, segments: 16, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
        const mat = new BABYLON.ShaderMaterial('introSkyMat', scene, {
            vertexSource: `precision highp float;
                attribute vec3 position; uniform mat4 worldViewProjection; varying vec3 vDir;
                void main() { vDir = normalize(position); gl_Position = worldViewProjection * vec4(position, 1.0); }`,
            fragmentSource: `precision highp float;
                varying vec3 vDir; uniform vec3 horizon; uniform vec3 zenith; uniform vec3 sunDir;
                void main() {
                    float h = clamp(vDir.y, 0.0, 1.0);
                    vec3 c = mix(horizon, zenith, pow(h, 0.55));
                    float sun = max(dot(normalize(vDir), normalize(-sunDir)), 0.0);
                    c += vec3(1.0, 0.85, 0.6) * (pow(sun, 24.0) * 0.35 + pow(sun, 400.0) * 0.8);
                    gl_FragColor = vec4(c, 1.0);
                }`
        }, { attributes: ['position'], uniforms: ['worldViewProjection', 'horizon', 'zenith', 'sunDir'] });
        mat.setColor3('horizon', this.horizon);
        mat.setColor3('zenith', new BABYLON.Color3(0.16, 0.5, 0.86));
        mat.backFaceCulling = false;
        mat.disableDepthWrite = true;
        sky.material = mat;
        sky.renderingGroupId = 0;
        sky.infiniteDistance = true;
        sky.isPickable = false;
        sky.applyFog = false;
        this.skyMaterial = mat;
    }

    createCamera() {
        const cam = new BABYLON.FreeCamera('introCam', new BABYLON.Vector3(0, 30, -60), this.scene);
        cam.minZ = 0.2;
        cam.maxZ = 1200;
        this.camera = cam;
        this.updateFov();
        this.engine.onResizeObservable.add(() => this.updateFov());
    }

    /** Em pé (celular), fixa o campo horizontal: senão a cidade vira uma fresta estreita. */
    updateFov() {
        if (!this.camera) return;
        const portrait = this.engine.getAspectRatio(this.camera) < 1;
        this.portrait = portrait;
        this.camera.fovMode = portrait ? BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED : BABYLON.Camera.FOVMODE_VERTICAL_FIXED;
        this.camera.fov = portrait ? 1.05 : 0.82;
    }

    createLights() {
        const scene = this.scene;
        const hemi = new BABYLON.HemisphericLight('introHemi', new BABYLON.Vector3(0.2, 1, -0.3), scene);
        hemi.intensity = 0.58;
        hemi.diffuse = new BABYLON.Color3(0.92, 0.97, 1);
        hemi.groundColor = new BABYLON.Color3(0.36, 0.42, 0.33);
        hemi.specular = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Sol baixo do sudoeste: ilumina as fachadas (viradas para o sul) e alonga as sombras
        const sunDir = new BABYLON.Vector3(0.55, -0.62, 0.56).normalize();
        const sun = new BABYLON.DirectionalLight('introSun', sunDir, scene);
        sun.position = sunDir.scale(-120);
        sun.intensity = 1.25;
        sun.diffuse = new BABYLON.Color3(1, 0.93, 0.8);
        sun.specular = new BABYLON.Color3(0.5, 0.45, 0.4);
        this.sun = sun;
        this.skyMaterial.setVector3('sunDir', sunDir);

        const size = this.quality === 'high' ? 2048 : 1024;
        const shadows = new BABYLON.ShadowGenerator(size, sun);
        shadows.usePercentageCloserFiltering = true;
        shadows.filteringQuality = this.quality === 'high' ? BABYLON.ShadowGenerator.QUALITY_MEDIUM : BABYLON.ShadowGenerator.QUALITY_LOW;
        shadows.bias = 0.0015;
        shadows.normalBias = 0.02;
        shadows.darkness = 0.35;
        // A sombra cobre só o núcleo da cidade (mais nitidez): extensão fixa, sem recalcular a cada quadro
        sun.autoUpdateExtends = false;
        sun.shadowMinZ = 1;
        sun.shadowMaxZ = 260;
        sun.orthoLeft = -52; sun.orthoRight = 52; sun.orthoTop = 52; sun.orthoBottom = -52;
        this.shadows = shadows;
    }

    // ===================== TERRENO, RIO E RUAS =====================

    static hex(h) { return BABYLON.Color3.FromHexString(h); }

    terrainColor(kind, x, z, height) {
        const L = this.layout;
        const n = L.noise(x * 2.3, z * 1.7) - 0.5;
        const jitter = ((x * 73856093) ^ (z * 19349663)) % 7 / 7 - 0.5; // xadrez sutil, estilo voxel do jogo
        let c;
        switch (kind) {
            case 'river': c = IntroCinematic.hex('#2f6f7a'); break;
            case 'bank': c = IntroCinematic.hex('#4f9a3f'); break;
            case 'road': case 'bridge': c = IntroCinematic.hex('#4a4f5a'); break;
            case 'plaza': c = IntroCinematic.hex('#e4dcc8'); break;
            case 'field': c = (z % 2 === 0) ? IntroCinematic.hex('#c9b458') : IntroCinematic.hex('#8fb84a'); break;
            default: {
                const high = Math.max(0, height - this.city.groundHeight) / 4;
                c = BABYLON.Color3.Lerp(IntroCinematic.hex('#6cc04a'), IntroCinematic.hex('#4e9a3c'), Math.min(1, high * 1.4 + 0.15));
                if (height > this.city.groundHeight + 3.2) c = BABYLON.Color3.Lerp(c, IntroCinematic.hex('#9a9a88'), 0.55);
            }
        }
        const v = 1 + n * 0.12 + jitter * 0.05;
        return new BABYLON.Color4(c.r * v, c.g * v, c.b * v, 1);
    }

    createTerrain() {
        const scene = this.scene;
        const L = this.layout;
        const cs = L.cellSize;
        // Um cubo só, desenhado uma vez por célula (thin instances): 1 draw call para o chão inteiro
        const block = BABYLON.MeshBuilder.CreateBox('introTerrain', { size: 1 }, scene);
        const mat = new BABYLON.StandardMaterial('introTerrainMat', scene);
        mat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
        block.material = mat;
        block.receiveShadows = true;
        block.isPickable = false;

        const n = (L.max - L.min) ** 2;
        const matrices = new Float32Array(n * 16);
        const colors = new Float32Array(n * 4);
        let i = 0;
        const bottom = -1.5;
        for (let x = L.min; x < L.max; x++) {
            for (let z = L.min; z < L.max; z++) {
                const kind = L.getKind(x, z);
                const h = kind === 'bridge' ? this.city.river.bedHeight : L.getHeight(x, z);
                const top = h;
                const w = L.toWorld(x + 0.5, z + 0.5);
                // Fresta entre blocos só no núcleo (a grade do jogo); nas colinas o chão fica contínuo
                const gap = L.isCore(x, z) ? 0.97 : 1;
                BABYLON.Matrix.ComposeToRef(
                    new BABYLON.Vector3(cs * gap, top - bottom, cs * gap),
                    BABYLON.Quaternion.Identity(),
                    new BABYLON.Vector3(w.x, (top + bottom) / 2, w.z),
                    BABYLON.TmpVectors.Matrix[0]
                );
                BABYLON.TmpVectors.Matrix[0].copyToArray(matrices, i * 16);
                const c = this.terrainColor(kind, x, z, h);
                colors.set([c.r, c.g, c.b, 1], i * 4);
                i++;
            }
        }
        block.thinInstanceSetBuffer('matrix', matrices, 16, true);
        block.thinInstanceSetBuffer('color', colors, 4, true);
        block.freezeWorldMatrix();
        this.terrain = block;

        // Fundo escuro sob a grade do núcleo: as frestas entre blocos viram as linhas do mapa
        const c = this.city.core;
        const coreMid = L.toWorld((c.x0 + c.x1 + 1) / 2, (c.z0 + c.z1 + 1) / 2);
        const under = BABYLON.MeshBuilder.CreateGround('introUnder', {
            width: (c.x1 - c.x0 + 1) * cs, height: (c.z1 - c.z0 + 1) * cs
        }, scene);
        under.position.set(coreMid.x, 0.1, coreMid.z);
        const underMat = new BABYLON.StandardMaterial('introUnderMat', scene);
        underMat.diffuseColor = IntroCinematic.hex('#2e5a2a');
        underMat.specularColor = BABYLON.Color3.Black();
        under.material = underMat;
        under.isPickable = false;
        under.freezeWorldMatrix();
    }

    /**
     * Rio: uma malha só, na altura da água, cobrindo as células do rio e as vizinhas (as margens, mais
     * altas, escondem a borda). Cada célula vira 2×2 quadradinhos para a onda do vertex shader.
     */
    createWater() {
        const scene = this.scene;
        const L = this.layout;
        const wet = (x, z) => ['river', 'bridge'].includes(L.getKind(x, z));
        const positions = [];
        const indices = [];
        const sub = 2;
        const y = this.city.river.waterLevel;
        for (let x = L.min; x < L.max; x++) {
            for (let z = L.min; z < L.max; z++) {
                let near = false;
                for (let dx = -1; dx <= 1 && !near; dx++) for (let dz = -1; dz <= 1 && !near; dz++) near = wet(x + dx, z + dz);
                if (!near) continue;
                for (let i = 0; i < sub; i++) {
                    for (let j = 0; j < sub; j++) {
                        const a = L.toWorld(x + i / sub, z + j / sub);
                        const b = L.toWorld(x + (i + 1) / sub, z + (j + 1) / sub);
                        const k = positions.length / 3;
                        positions.push(a.x, y, a.z, b.x, y, a.z, b.x, y, b.z, a.x, y, b.z);
                        indices.push(k, k + 2, k + 1, k, k + 3, k + 2);
                    }
                }
            }
        }
        const water = new BABYLON.Mesh('introWater', scene);
        const vd = new BABYLON.VertexData();
        vd.positions = positions;
        vd.indices = indices;
        vd.applyToMesh(water);
        water.isPickable = false;
        water.receiveShadows = false;

        const mat = new BABYLON.ShaderMaterial('introWaterMat', scene, {
            vertexSource: `precision highp float;
                attribute vec3 position;
                uniform mat4 world; uniform mat4 viewProjection; uniform float time;
                varying vec3 vWorld;
                void main() {
                    vec4 w = world * vec4(position, 1.0);
                    w.y += sin(w.x * 0.9 + time * 1.3) * 0.035 + cos(w.z * 0.7 - time * 1.1) * 0.03;
                    vWorld = w.xyz;
                    gl_Position = viewProjection * w;
                }`,
            fragmentSource: `precision highp float;
                varying vec3 vWorld;
                uniform float time; uniform vec3 cameraPos; uniform vec3 sunDir; uniform vec3 fogColor; uniform float fogDensity;
                uniform vec3 skyColor;
                float wave(vec2 p) {
                    return sin(p.x * 1.3 + time * 1.4) * 0.5 + sin(p.y * 1.7 - time * 1.1) * 0.35
                         + sin((p.x + p.y) * 2.9 + time * 2.3) * 0.15;
                }
                void main() {
                    vec2 p = vWorld.xz;
                    float e = 0.15;
                    // normal a partir da derivada da onda (correnteza descendo o rio)
                    float h = wave(p);
                    vec3 n = normalize(vec3(-(wave(p + vec2(e, 0.0)) - h) / e * 0.18, 1.0, -(wave(p + vec2(0.0, e)) - h) / e * 0.18));
                    vec3 v = normalize(cameraPos - vWorld);
                    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
                    vec3 deep = vec3(0.05, 0.42, 0.55);
                    vec3 shallow = vec3(0.16, 0.78, 0.82);
                    float m = 0.5 + 0.5 * sin(p.x * 0.21 + p.y * 0.17 + time * 0.3);
                    vec3 col = mix(deep, shallow, 0.35 + 0.35 * m);
                    col = mix(col, skyColor, fres * 0.65);
                    vec3 r = reflect(-v, n);
                    float spec = pow(max(dot(r, normalize(-sunDir)), 0.0), 90.0);
                    col += vec3(1.0, 0.95, 0.85) * spec * 1.4;
                    // brilhos andando com a correnteza
                    float glint = smoothstep(0.92, 1.0, sin(p.x * 3.1 + time * 2.0) * sin(p.y * 2.7 - time * 1.6));
                    col += glint * 0.1;
                    float d = length(cameraPos - vWorld);
                    float f = clamp(exp(-pow(d * fogDensity, 2.0)), 0.0, 1.0);
                    gl_FragColor = vec4(mix(fogColor, col, f), 1.0);
                }`
        }, {
            attributes: ['position'],
            uniforms: ['world', 'viewProjection', 'time', 'cameraPos', 'sunDir', 'fogColor', 'fogDensity', 'skyColor']
        });
        mat.setVector3('sunDir', this.sun.direction);
        mat.setColor3('fogColor', this.scene.fogColor);
        mat.setFloat('fogDensity', this.scene.fogDensity);
        mat.setColor3('skyColor', new BABYLON.Color3(0.62, 0.86, 0.95));
        mat.backFaceCulling = false;
        water.material = mat;
        this.waterMaterial = mat;
    }

    /** Faixas das ruas, calçadas e guarda-corpo das pontes (thin instances). */
    createRoadDetails() {
        const L = this.layout;
        const cs = L.cellSize;
        const g = this.city.groundHeight;
        const isRoad = (x, z) => ['road', 'bridge'].includes(L.getKind(x, z));
        const dashes = [];
        const curbs = [];
        const rails = [];
        const decks = [];
        for (let x = L.min; x < L.max; x++) {
            for (let z = L.min; z < L.max; z++) {
                if (!isRoad(x, z)) continue;
                const w = L.toWorld(x + 0.5, z + 0.5);
                const alongX = isRoad(x - 1, z) || isRoad(x + 1, z);
                const alongZ = isRoad(x, z - 1) || isRoad(x, z + 1);
                const bridge = L.getKind(x, z) === 'bridge';
                const y = bridge ? g + 0.15 : g;
                if (bridge) decks.push([w.x, g - 0.05, w.z, cs, 0.35, cs]);
                if (alongX !== alongZ) {
                    // faixa tracejada no meio, 2 traços por célula
                    for (const o of [-0.25, 0.25]) {
                        if (alongX) dashes.push([w.x + o * cs, y + 0.012, w.z, cs * 0.28, 0.02, 0.09]);
                        else dashes.push([w.x, y + 0.012, w.z + o * cs, 0.09, 0.02, cs * 0.28]);
                    }
                }
                // meio-fio onde a rua encosta em outra coisa
                for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    if (isRoad(x + dx, z + dz)) continue;
                    const k = L.getKind(x + dx, z + dz);
                    const ex = w.x + dx * cs * 0.47, ez = w.z + dz * cs * 0.47;
                    const sx = dx ? 0.14 : cs, sz = dz ? 0.14 : cs;
                    if (bridge && k === 'river') rails.push([ex, y + 0.25, ez, sx, 0.35, sz]);
                    else if (!bridge && k !== null) curbs.push([ex, y + 0.05, ez, sx, 0.1, sz]);
                }
            }
        }
        this.instanceBoxes('introDash', dashes, '#f4f1e6', { receive: false });
        this.instanceBoxes('introCurb', curbs, '#c9cbcf', { receive: true });
        this.instanceBoxes('introRail', rails, '#e8eef2', { cast: true });
        this.instanceBoxes('introDeck', decks, '#6b7280', { cast: true, receive: true });
    }

    /** Caixas iguais em thin instances: [x, y, z, sx, sy, sz] cada. */
    instanceBoxes(name, list, color, { cast = false, receive = false } = {}) {
        if (!list.length) return null;
        const box = BABYLON.MeshBuilder.CreateBox(name, { size: 1 }, this.scene);
        const mat = new BABYLON.StandardMaterial(`${name}Mat`, this.scene);
        mat.diffuseColor = IntroCinematic.hex(color);
        mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        box.material = mat;
        box.isPickable = false;
        box.receiveShadows = receive;
        const m = new Float32Array(list.length * 16);
        list.forEach(([x, y, z, sx, sy, sz], i) => {
            BABYLON.Matrix.ComposeToRef(new BABYLON.Vector3(sx, sy, sz), BABYLON.Quaternion.Identity(),
                new BABYLON.Vector3(x, y, z), BABYLON.TmpVectors.Matrix[0]);
            BABYLON.TmpVectors.Matrix[0].copyToArray(m, i * 16);
        });
        box.thinInstanceSetBuffer('matrix', m, 16, true);
        if (cast) this.shadows.addShadowCaster(box);
        return box;
    }

    // ===================== ÁRVORES, NUVENS, CARROS =====================

    /** Mesh com cor de vértice a partir de peças (cada uma com sua cor), juntas num só. */
    coloredMesh(name, parts) {
        return VehicleMeshes.coloredMesh(this.scene, name, parts);
    }

    createTrees() {
        const scene = this.scene;
        const make = (pine, crown) => {
            const trunk = BABYLON.MeshBuilder.CreateCylinder('t', { height: 0.9, diameterTop: 0.14, diameterBottom: 0.22, tessellation: 5 }, scene);
            trunk.position.y = 0.45;
            trunk.bakeCurrentTransformIntoVertices();
            let top;
            if (pine) {
                top = BABYLON.MeshBuilder.CreateCylinder('c', { height: 2.1, diameterTop: 0, diameterBottom: 1.25, tessellation: 6 }, scene);
                top.position.y = 1.75;
            } else {
                top = BABYLON.MeshBuilder.CreateIcoSphere('c', { radius: 0.78, subdivisions: 1 }, scene);
                top.scaling.y = 0.9;
                top.position.y = 1.45;
            }
            top.bakeCurrentTransformIntoVertices();
            return this.coloredMesh(`introTree_${pine ? 'pine' : 'round'}_${crown}`, [[trunk, '#7a4e2d'], [top, crown]]);
        };
        const kinds = [
            { pine: false, crowns: ['#3f9b3a', '#58b443', '#7cc24b'] },
            { pine: true, crowns: ['#2f7d3c', '#3b8f45'] }
        ];
        const buckets = new Map();
        const rand = IntroLayout.prng(7);
        // Celular: metade da mata fora da cidade (já some na neblina) — bem menos triângulos
        const low = this.quality !== 'high';
        const trees = low ? this.layout.trees.filter((t, i) => (Math.abs(t.x) < 44 && Math.abs(t.z) < 44) || i % 2 === 0) : this.layout.trees;
        for (const t of trees) {
            const kind = kinds[t.pine ? 1 : 0];
            const crown = kind.crowns[Math.floor(rand() * kind.crowns.length)];
            const key = `${t.pine}|${crown}`;
            if (!buckets.has(key)) buckets.set(key, { pine: t.pine, crown, list: [] });
            buckets.get(key).list.push(t);
        }
        for (const b of buckets.values()) {
            const mesh = make(b.pine, b.crown);
            const m = new Float32Array(b.list.length * 16);
            b.list.forEach((t, i) => {
                const s = t.scale;
                BABYLON.Matrix.ComposeToRef(new BABYLON.Vector3(s, s * (0.9 + (i % 5) * 0.06), s),
                    BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, i * 1.37),
                    new BABYLON.Vector3(t.x, t.y, t.z), BABYLON.TmpVectors.Matrix[0]);
                BABYLON.TmpVectors.Matrix[0].copyToArray(m, i * 16);
            });
            mesh.thinInstanceSetBuffer('matrix', m, 16, true);
            mesh.receiveShadows = true;
            if (!low) this.shadows.addShadowCaster(mesh);
        }
    }

    createClouds() {
        const scene = this.scene;
        const mat = new BABYLON.StandardMaterial('introCloudMat', scene);
        mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        mat.emissiveColor = new BABYLON.Color3(0.55, 0.6, 0.65);
        mat.specularColor = BABYLON.Color3.Black();
        mat.alpha = 0.92;
        const rand = IntroLayout.prng(11);
        for (let i = 0; i < 9; i++) {
            const root = new BABYLON.TransformNode(`introCloud${i}`, scene);
            const puffs = 3 + Math.floor(rand() * 3);
            for (let p = 0; p < puffs; p++) {
                const puff = BABYLON.MeshBuilder.CreateIcoSphere(`introCloud${i}_${p}`, { radius: 2 + rand() * 1.8, subdivisions: 1, flat: true }, scene);
                puff.position.set(p * 2.6 - puffs * 1.3, rand() * 0.8, (rand() - 0.5) * 2.5);
                puff.scaling.y = 0.55;
                puff.material = mat;
                puff.isPickable = false;
                puff.parent = root;
            }
            // Nuvens baixas e longe: aparecem contra o céu na pose final, acima da serra
            root.position.set(-120 + rand() * 240, 24 + rand() * 12, 70 + rand() * 120);
            this.clouds.push({ root, speed: 0.6 + rand() * 0.6 });
        }
    }

    /** Carrinhos low poly circulando nas avenidas (vida na cidade). */
    createCars() {
        const scene = this.scene;
        const L = this.layout;
        const lanes = this.city.roads.filter(([x0, z0, x1, z1]) => Math.abs(x1 - x0) + Math.abs(z1 - z0) >= 20);
        const rand = IntroLayout.prng(5);
        // Mesmo modelo do trânsito do jogo (js/systems/shared/VehicleMeshes.js)
        const templates = VehicleMeshes.CAR_COLORS.map(color => {
            const car = VehicleMeshes.createCar(scene, color, `introCar_${color}`);
            car.setEnabled(false);
            return car;
        });
        let n = 0;
        for (const [x0, z0, x1, z1] of lanes) {
            const a = L.toWorld(x0 + 0.5, z0 + 0.5);
            const b = L.toWorld(x1 + 0.5, z1 + 0.5);
            const length = Math.hypot(b.x - a.x, b.z - a.z);
            const count = Math.round(length / 14);
            for (let i = 0; i < count; i++) {
                const dir = rand() < 0.5 ? 1 : -1;
                const mesh = templates[n++ % templates.length].clone(`introCar${n}`);
                mesh.setEnabled(true);
                this.shadows.addShadowCaster(mesh);
                this.cars.push({ mesh, a, b, length, dir, t: rand(), speed: (3.2 + rand() * 2.2) / length });
            }
        }
    }

    // ===================== PRÉDIOS (.glb reais) =====================

    async createBuildings(onProgress) {
        const loader = Object.assign(Object.create(BuildingSystem.prototype), {
            scene: this.scene,
            gridManager: { cellSize: this.layout.cellSize }
        });
        this.loader = loader;
        const byType = new Map();
        for (const b of this.layout.buildings) {
            if (!byType.has(b.type)) byType.set(b.type, []);
            byType.get(b.type).push(b);
        }
        let done = 0;
        const total = byType.size;
        const tasks = [...byType.entries()].map(async ([type, list]) => {
            try {
                if (type === 'wind_farm') await this.createWindFarms(list);
                else await this.createModelBuildings(loader, type, list);
            } catch (error) {
                console.warn(`IntroCinematic: ${type} ficou de fora`, error?.message || error);
            }
            onProgress(++done / total);
        });
        // Rede lenta: não segura o menu para sempre — o que chegar depois entra na cena sozinho
        await Promise.race([Promise.all(tasks), new Promise(r => setTimeout(r, 12000))]);
    }

    async createModelBuildings(loader, type, list) {
        const entry = BUILDING_MODELS[type];
        const buildingType = BUILDING_TYPES[type];
        if (!entry || !buildingType) return;
        const data = await loader.loadBuildingModelFile(entry.file);
        if (!data || this.disposed) return;
        const template = loader.createBuildingModelTemplate({ ...buildingType, id: type }, entry, data);
        list.forEach((b, i) => {
            const mesh = i === 0 ? template : template.clone(`intro_${type}_${i}`);
            mesh.setEnabled(true);
            mesh.isVisible = true;
            mesh.position.set(b.cx, b.baseY, b.cz);
            mesh.scaling.setAll(b.scale);
            mesh.rotation.y = -b.rot * Math.PI / 2;
            mesh.receiveShadows = true;
            mesh.isPickable = false;
            this.shadows.addShadowCaster(mesh);
            mesh.freezeWorldMatrix();
        });
    }

    /** Eólica com os rotores separados (nós "pas_N" do .glb), para girar. */
    async createWindFarms(list) {
        const entry = BUILDING_MODELS.wind_farm;
        const res = await fetch(`models/buildings/${entry.file}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (this.disposed) return;
        BABYLON.SceneLoader.ShowLoadingScreen = false;
        const container = await BABYLON.LoadAssetContainerAsync(new Uint8Array(buffer), this.scene, { pluginExtension: '.glb' });
        if (this.disposed) { container.dispose(); return; }

        const rotorOf = node => {
            for (let n = node; n; n = n.parent) if (/^pas_/i.test(n.name)) return n;
            return null;
        };
        const body = [];
        const rotors = new Map(); // nó → partes
        container.meshes.forEach(m => {
            if (!m.getTotalVertices || m.getTotalVertices() === 0) return;
            m.computeWorldMatrix(true);
            const r = rotorOf(m);
            if (r) {
                if (!rotors.has(r)) rotors.set(r, []);
                rotors.get(r).push(m);
            } else body.push(m);
        });
        // Encaixe na área (mesma regra do jogo): base no chão, maior lado = BUILDING_MODEL_FILL × size
        const all = container.meshes.filter(m => m.getTotalVertices && m.getTotalVertices() > 0);
        const min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
        const max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        all.forEach(m => {
            const bb = m.getBoundingInfo().boundingBox;
            min.minimizeInPlace(bb.minimumWorld);
            max.maximizeInPlace(bb.maximumWorld);
        });
        const size = BUILDING_TYPES.wind_farm.size * this.layout.cellSize * BUILDING_MODEL_FILL;
        const scale = size / Math.max(max.x - min.x, max.z - min.z);
        const center = new BABYLON.Vector3((min.x + max.x) / 2, min.y, (min.z + max.z) / 2);

        const bake = (meshes, pivot) => {
            const parts = meshes.map(m => {
                const vd = BABYLON.VertexData.ExtractFromMesh(m, true, true);
                vd.tangents = null;
                vd.uvs = null;
                vd.transform(m.getWorldMatrix());
                vd.transform(BABYLON.Matrix.Translation(-pivot.x, -pivot.y, -pivot.z).multiply(BABYLON.Matrix.Scaling(scale, scale, scale)));
                const base = m.material?.albedoColor || m.material?.diffuseColor;
                const c = base ? base.toGammaSpace() : new BABYLON.Color3(1, 1, 1);
                const count = vd.positions.length / 3;
                vd.colors = new Float32Array(count * 4);
                for (let i = 0; i < count; i++) vd.colors.set([c.r, c.g, c.b, 1], i * 4);
                return vd;
            });
            const vd = parts[0];
            if (parts.length > 1) vd.merge(parts.slice(1), true);
            return vd;
        };
        const material = new BABYLON.StandardMaterial('introWindMat', this.scene);
        material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
        material.emissiveColor = new BABYLON.Color3(0.14, 0.14, 0.15);
        material.backFaceCulling = false;

        const bodyMesh = new BABYLON.Mesh('introWindBody', this.scene);
        bake(body, center).applyToMesh(bodyMesh);
        bodyMesh.material = material;
        const rotorTemplates = [...rotors.entries()].map(([node, meshes], k) => {
            const pivot = node.getAbsolutePosition().clone();
            const axis = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(0, 0, 1), node.getWorldMatrix()).normalize();
            const mesh = new BABYLON.Mesh(`introWindRotor${k}`, this.scene);
            bake(meshes, pivot).applyToMesh(mesh);
            mesh.material = material;
            return { mesh, offset: pivot.subtract(center).scale(scale), axis };
        });
        container.dispose();

        list.forEach((b, i) => {
            const root = new BABYLON.TransformNode(`introWind${i}`, this.scene);
            root.position.set(b.cx, b.baseY, b.cz);
            root.rotation.y = -b.rot * Math.PI / 2;
            root.scaling.setAll(b.scale * (this.city.windScale || 1));
            const bodyClone = i === 0 ? bodyMesh : bodyMesh.clone(`introWindBody${i}`);
            bodyClone.parent = root;
            this.shadows.addShadowCaster(bodyClone);
            rotorTemplates.forEach((rt, k) => {
                const r = i === 0 ? rt.mesh : rt.mesh.clone(`introWindRotor${i}_${k}`);
                r.parent = root;
                r.position.copyFrom(rt.offset);
                r.rotationQuaternion = BABYLON.Quaternion.Identity();
                this.shadows.addShadowCaster(r);
                this.rotors.push({ mesh: r, axis: rt.axis, speed: 2.2 + ((i * 3 + k) % 4) * 0.25, phase: i + k * 2.1 });
            });
        });
    }

    /**
     * Troca a qualidade com a abertura rodando (seletor de Gráficos do menu): resolução, sombras, bloom e FXAA mudam
     * na hora. O MSAA vem do engine, criado uma vez (FXAA cobre quando ele falta).
     */
    setQuality(quality) {
        if (!this.engine || !this.scene || quality === this.quality) return;
        this.quality = quality;
        const dpr = window.devicePixelRatio || 1;
        const pixels = Math.min(dpr, quality === 'high' ? 2 : 1.5) * (quality === 'low' ? 0.625 : 1);
        this.engine.setHardwareScalingLevel(1 / pixels);
        this.scene.shadowsEnabled = quality !== 'low';
        if (this.shadows) {
            this.shadows.filteringQuality = quality === 'high' ? BABYLON.ShadowGenerator.QUALITY_MEDIUM : BABYLON.ShadowGenerator.QUALITY_LOW;
        }
        if (this.pipeline) {
            const high = quality === 'high';
            this.pipeline.bloomEnabled = high;
            this.pipeline.fxaaEnabled = !high || !this.engine.getCaps().multiSampledRenderToTexture;
        }
    }

    // ===================== PÓS-PROCESSAMENTO =====================

    createPostProcess() {
        const high = this.quality === 'high';
        try {
            const p = new BABYLON.DefaultRenderingPipeline('introPipeline', true, this.scene, [this.camera]);
            p.samples = high ? 4 : 1;
            p.fxaaEnabled = !high;
            p.bloomEnabled = high;
            p.bloomThreshold = 0.82;
            p.bloomWeight = 0.22;
            p.bloomKernel = 48;
            p.imageProcessingEnabled = true;
            p.imageProcessing.contrast = 1.12;
            p.imageProcessing.exposure = 1.04;
            p.imageProcessing.vignetteEnabled = true;
            p.imageProcessing.vignetteWeight = 1.4;
            p.imageProcessing.vignetteColor = new BABYLON.Color4(0.03, 0.08, 0.16, 0);
            this.pipeline = p;
        } catch (error) {
            console.warn('IntroCinematic: sem pós-processamento', error?.message || error);
        }
    }

    // ===================== CÂMERA E TOMADAS =====================

    pointToWorld([x, y, z]) { return this.cellToWorld(x, y, z); }

    finalPose() {
        const shots = this.shotsData.shots;
        const last = shots[shots.length - 1].points.slice(-1)[0];
        return { pos: this.pointToWorld(last.pos), look: this.pointToWorld(last.look), roll: 0 };
    }

    setCameraPose({ pos, look, roll = 0 }) {
        const cam = this.camera;
        cam.position.copyFrom(pos);
        let fwd = look.subtract(pos).normalize();
        if (this.portrait) {
            // Em pé sobra céu: inclina o olhar um pouco para baixo (mais cidade na tela)
            const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, fwd).normalize();
            fwd = BABYLON.Vector3.TransformNormal(fwd, BABYLON.Matrix.RotationAxis(right, 0.12)).normalize();
            look = pos.add(fwd.scale(10));
        }
        // Inclinação lateral (roll) nas curvas: gira o "para cima" em volta da direção do olhar
        const up = roll ? BABYLON.Vector3.TransformNormal(BABYLON.Axis.Y, BABYLON.Matrix.RotationAxis(fwd, roll)) : BABYLON.Axis.Y;
        cam.upVector.copyFrom(up);
        cam.setTarget(look);
    }

    static ease(kind, t) {
        if (kind === 'out') return 1 - (1 - t) ** 3;
        if (kind === 'inout') return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
        // voo contínuo: quase linear, só amacia as pontas
        return t * 0.55 + (0.5 - Math.cos(Math.PI * t) / 2) * 0.45;
    }

    samplePath(points, u) {
        const n = points.length;
        if (n === 1) return { pos: this.pointToWorld(points[0].pos), look: this.pointToWorld(points[0].look), roll: points[0].roll || 0 };
        const segs = n - 1;
        const s = Math.min(segs - 1e-6, u * segs);
        const i = Math.floor(s);
        const t = s - i;
        const P = k => points[Math.max(0, Math.min(n - 1, k))];
        const cr = key => BABYLON.Vector3.CatmullRom(
            this.pointToWorld(P(i - 1)[key]), this.pointToWorld(P(i)[key]),
            this.pointToWorld(P(i + 1)[key]), this.pointToWorld(P(i + 2)[key]), t);
        const roll = (P(i).roll || 0) * (1 - t) + (P(i + 1).roll || 0) * t;
        return { pos: cr('pos'), look: cr('look'), roll };
    }

    /**
     * Começa a abertura. mode: 'full' (todas as tomadas) ou 'final' (já parada
     * na pose final — pular / movimento reduzido). onFinish é chamado uma vez, ao chegar na pose final.
     */
    play(mode = 'full', { onShot = () => {}, onFinish = () => {}, orbit = true } = {}) {
        const data = this.shotsData;
        const shots = mode === 'full' ? data.shots : [];
        this.orbitEnabled = orbit;
        this.director = { shots, index: -1, elapsed: 0, onShot, onFinish, finished: false };
        if (!shots.length) {
            this.finish();
            return;
        }
        this.nextShot();
    }

    nextShot() {
        const d = this.director;
        d.index++;
        d.elapsed = 0;
        const shot = d.shots[d.index];
        d.onShot(d.index, shot);
        this.setFade(d.index === 0 && d.shots.length > 1 ? 1 : (d.index > 0 ? 1 : 0));
        this.setCameraPose(this.samplePath(shot.points, 0));
    }

    setFade(v) {
        if (this.fadeEl) this.fadeEl.style.opacity = String(Math.max(0, Math.min(1, v)));
    }

    /** Pula direto para o fim: pose final, menu. */
    skip() {
        if (!this.director || this.director.finished) return;
        this.finish();
    }

    finish() {
        const d = this.director;
        if (!d || d.finished) return;
        d.finished = true;
        this.setFade(0);
        const pose = this.finalPose();
        this.setCameraPose(pose);
        const offset = pose.pos.subtract(pose.look);
        this.orbit = {
            center: pose.look,
            radius: Math.hypot(offset.x, offset.z),
            height: offset.y,
            baseAngle: Math.atan2(offset.z, offset.x),
            start: this.time
        };
        d.onFinish();
    }

    setOrbit(on) { this.orbitEnabled = on; }

    tick() {
        const dt = Math.min(100, this.engine.getDeltaTime());
        this.time += dt;
        const t = this.time / 1000;

        this.waterMaterial?.setFloat('time', t);
        this.waterMaterial?.setVector3('cameraPos', this.camera.globalPosition);

        for (const r of this.rotors) {
            r.mesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(r.axis, -(t * r.speed + r.phase));
        }
        for (const c of this.clouds) {
            c.root.position.x += c.speed * dt / 1000;
            if (c.root.position.x > 130) c.root.position.x = -130;
        }
        for (const car of this.cars) {
            car.t = (car.t + car.speed * dt / 1000) % 1;
            const u = car.dir > 0 ? car.t : 1 - car.t;
            const x = car.a.x + (car.b.x - car.a.x) * u;
            const z = car.a.z + (car.b.z - car.a.z) * u;
            const dx = (car.b.x - car.a.x) * car.dir, dz = (car.b.z - car.a.z) * car.dir;
            const len = Math.hypot(dx, dz) || 1;
            // mão direita: desloca para a direita do sentido
            car.mesh.position.set(x + (dz / len) * 0.45, this.city.groundHeight + (this.isOnBridge(x, z) ? 0.15 : 0), z - (dx / len) * 0.45);
            car.mesh.rotation.y = Math.atan2(dx, dz);
        }

        const d = this.director;
        if (d && !d.finished) {
            d.elapsed += dt;
            const shot = d.shots[d.index];
            const u = Math.min(1, d.elapsed / shot.ms);
            const last = d.index === d.shots.length - 1;
            const eased = IntroCinematic.ease(last ? 'out' : (shot.ease || 'flight'), u);
            this.setCameraPose(this.samplePath(shot.points, eased));
            const fade = this.shotsData.cutFadeMs;
            let f = 0;
            if (d.index > 0 || d.shots.length > 1) f = Math.max(f, 1 - d.elapsed / fade);
            if (!last) f = Math.max(f, 1 - (shot.ms - d.elapsed) / fade);
            this.setFade(f);
            if (u >= 1) {
                if (last) this.finish();
                else this.nextShot();
            }
        } else if (this.orbit && this.orbitEnabled) {
            const o = this.orbit;
            const { swing, periodMs } = this.shotsData.orbit;
            // começa parado e entra no balanço aos poucos (seno a partir de 0)
            const a = o.baseAngle + swing * Math.sin((this.time - o.start) / periodMs * Math.PI * 2);
            const pos = new BABYLON.Vector3(o.center.x + Math.cos(a) * o.radius, o.center.y + o.height, o.center.z + Math.sin(a) * o.radius);
            this.setCameraPose({ pos, look: o.center });
        }
    }

    isOnBridge(x, z) {
        const L = this.layout;
        const cx = Math.floor(x / L.cellSize + L.originX);
        const cz = Math.floor(z / L.cellSize + L.originZ);
        return L.getKind(cx, cz) === 'bridge';
    }

    // ===================== DESCARTE =====================

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        window.removeEventListener('resize', this.onResize);
        try {
            this.engine?.stopRenderLoop();
            this.pipeline?.dispose();
            this.scene?.dispose(); // meshes, materiais, texturas, luzes, sombras
            this.engine?.dispose();
        } catch (error) {
            console.warn('IntroCinematic: erro ao descartar', error?.message || error);
        }
        this.scene = null;
        this.engine = null;
        this.camera = null;
        this.loader = null;
        this.rotors = [];
        this.cars = [];
        this.clouds = [];
        this.director = null;
    }
}
