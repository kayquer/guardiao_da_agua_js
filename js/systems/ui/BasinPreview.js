/**
 * GUARDIÃO DA ÁGUA - MAQUETE 3D DA BACIA NO CARROSSEL "ONDE FICA A SUA CIDADE?" (js/ui/BasinPicker.js)
 *
 * Engine Babylon própria e pequena, num canvas só, que o carrossel põe dentro do cartão em foco. O relevo é o do
 * jogo de verdade: um GridManager sem construtor (Object.create, como tests/unit/basins.test.js) roda initializeGrid
 * com a bacia escolhida por um instante (rio, planície, APP, planalto e encostas pelos limites da bacia, cores da
 * paleta) e cria os mesmos blocos voxel e a mesma água (createVoxelTerrainBlocks/createWaterBodies), em poucos meshes
 * com cor de vértice. Por cima: árvores (thin instances) na APP e algumas no planalto, e uma base de terra (maquete).
 * As 4 bacias ficam prontas na mesma cena (só a do cartão em foco ligada); a câmera gira devagar
 * (prefers-reduced-motion = parada). snapshot() tira a foto do canvas para os cartões fora de foco.
 * dispose() apaga engine e canvas: o carrossel chama ao fechar, antes de o jogo montar a cena dele.
 */
class BasinPreview {
    static SPIN_SPEED = 0.09; // rad/s
    static FPS = 30;          // maquete girando devagar: 30 quadros bastam
    static START_ALPHA = -Math.PI * 0.62;

    static supported() {
        return typeof BABYLON !== 'undefined' && typeof GridManager !== 'undefined' && typeof GAME_CONFIG !== 'undefined';
    }

    static reducedMotion() {
        return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    }

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'bp-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.canvas.tabIndex = -1;
        this.engine = null;
        this.scene = null;
        this.maps = new Map();  // id → { meshes, alpha }
        this.currentId = null;
        this.running = false;
        this.disposed = false;
    }

    /** Engine e cena na primeira vez. false sem WebGL. */
    init() {
        if (this.engine) return true;
        if (this.disposed || !BasinPreview.supported()) return false;
        try {
            // preserveDrawingBuffer: a foto do canvas (snapshot) vale a qualquer momento depois de um quadro
            this.engine = new BABYLON.Engine(this.canvas, true,
                { preserveDrawingBuffer: true, stencil: false, powerPreference: 'low-power', alpha: true }, true);
        } catch (error) {
            logWarn('⚠️ Maquete da bacia indisponível:', error?.message || error);
            this.engine = null;
            return false;
        }
        const scene = this.scene = new BABYLON.Scene(this.engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // o céu é o degradê do CSS
        scene.skipPointerMovePicking = true;

        const size = GAME_CONFIG.grid.size * GAME_CONFIG.grid.cellSize;
        const camera = this.camera = new BABYLON.ArcRotateCamera('basinPreviewCam', BasinPreview.START_ALPHA, 1.08, size * 2,
            new BABYLON.Vector3(0, -0.6, 0), scene);
        camera.fovMode = BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED;
        camera.fov = 0.7; // raio certo em fit(), pelo tamanho do quadro
        camera.minZ = 1;
        camera.maxZ = size * 4;

        // As mesmas luzes do jogo (GameManager.setupLighting): a cor dos blocos fica igual à da partida
        const hemi = new BABYLON.HemisphericLight('basinPreviewHemi', new BABYLON.Vector3(0, 1, 0), scene);
        hemi.intensity = 0.62;
        hemi.diffuse = new BABYLON.Color3(1, 1, 0.9);
        hemi.groundColor = new BABYLON.Color3(0.35, 0.36, 0.42);
        const sun = new BABYLON.DirectionalLight('basinPreviewSun', new BABYLON.Vector3(-1, -1, -0.5), scene);
        sun.intensity = 0.85;
        sun.diffuse = new BABYLON.Color3(1, 0.95, 0.8);

        this.baseMaterial = new BABYLON.StandardMaterial('basinPreviewBaseMat', scene);
        this.baseMaterial.diffuseColor = BABYLON.Color3.FromHexString('#6d4b33');
        this.baseMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        this.trunkMaterial = new BABYLON.StandardMaterial('basinPreviewTrunkMat', scene);
        this.trunkMaterial.diffuseColor = BABYLON.Color3.FromHexString('#6b4a2e');
        this.trunkMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

        this.pacer = typeof FramePacer !== 'undefined' ? new FramePacer() : null;
        this.dirty = true;
        scene.onBeforeRenderObservable.add(() => this.tick());
        return true;
    }

    /** Monta a maquete da bacia (uma vez). Rápido: o terreno é o mesmo cálculo do jogo, sem modelos para baixar. */
    build(id) {
        if (this.maps.has(id)) return this.maps.get(id);
        if (!this.init()) return null;
        const grid = BasinPreview.makeGrid(id, this.scene);
        grid.createWaterBodies();
        grid.createVoxelTerrainBlocks();
        const meshes = [...grid.terrainBlocks, ...grid.waterMeshes];
        meshes.push(this.createBase(id, grid), ...this.createTrees(id, grid));
        const entry = { meshes: meshes.filter(Boolean), alpha: BasinPreview.START_ALPHA };
        entry.meshes.forEach(mesh => {
            mesh.isPickable = false;
            mesh.setEnabled(false);
        });
        this.maps.set(id, entry);
        return entry;
    }

    /**
     * GridManager do jogo sem cena própria: initializeGrid com Basin.selected = id por um instante (ele lê
     * Basin.current() e Basin.palette()) e a bacia da partida volta logo em seguida.
     */
    static makeGrid(id, scene) {
        const grid = Object.create(GridManager.prototype);
        Object.assign(grid, {
            scene,
            gridSize: GAME_CONFIG.grid.size,
            cellSize: GAME_CONFIG.grid.cellSize,
            occupationGrid: [], elevationGrid: [], terrainGrid: [],
            terrainBlocks: [], waterMeshes: [],
            waterAnimated: typeof GraphicsQuality === 'undefined' ? true : !!GraphicsQuality.preset().waterShader
        });
        const previous = Basin.selected;
        try {
            Basin.select(id);
            grid.initializeGrid();
        } finally {
            Basin.selected = previous;
        }
        return grid;
    }

    /** Base de terra sob o mapa: a maquete fica "recortada" do chão. */
    createBase(id, grid) {
        const side = grid.gridSize * grid.cellSize;
        const base = BABYLON.MeshBuilder.CreateBox(`basinPreviewBase_${id}`, { width: side, depth: side, height: 2.4 }, this.scene);
        base.position.y = -1.2;
        base.material = this.baseMaterial;
        base.freezeWorldMatrix();
        return base;
    }

    /** Hash 0-1 fixo por célula (a maquete é sempre igual para a mesma bacia). */
    static cellHash(x, z, salt = 0) {
        const h = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453;
        return h - Math.floor(h);
    }

    /** Mata ciliar na APP, um pouco na planície e poucas árvores no planalto: copa + tronco em thin instances. */
    createTrees(id, grid) {
        const cs = grid.cellSize, half = (grid.gridSize * cs) / 2;
        const matrices = [];
        for (let x = 0; x < grid.gridSize; x++) {
            for (let z = 0; z < grid.gridSize; z++) {
                const zone = grid.getRiverZone(x, z);
                const type = grid.getTerrainType(x, z);
                if (type === 'water') continue;
                const chance = zone === 'app' ? 0.6 : type === 'floodplain' ? 0.12 : type === 'hill' ? 0.08 : 0.045;
                if (BasinPreview.cellHash(x, z) > chance) continue;
                const jx = (BasinPreview.cellHash(x, z, 1) - 0.5) * cs * 0.5;
                const jz = (BasinPreview.cellHash(x, z, 2) - 0.5) * cs * 0.5;
                const s = 0.75 + BasinPreview.cellHash(x, z, 3) * 0.55;
                const y = grid.getTerrainBlockHeight(x, z);
                matrices.push(BABYLON.Matrix.Compose(new BABYLON.Vector3(s, s, s), BABYLON.Quaternion.Identity(),
                    new BABYLON.Vector3((x + 0.5) * cs - half + jx, y, (z + 0.5) * cs - half + jz)));
            }
        }
        if (!matrices.length) return [];
        const crown = BABYLON.MeshBuilder.CreateCylinder(`basinPreviewCrown_${id}`,
            { diameterTop: 0, diameterBottom: 1.5, height: 2.1, tessellation: 6 }, this.scene);
        crown.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 1.45, 0));
        const trunk = BABYLON.MeshBuilder.CreateCylinder(`basinPreviewTrunk_${id}`,
            { diameter: 0.28, height: 0.5, tessellation: 5 }, this.scene);
        trunk.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 0.25, 0));
        const palette = typeof Basin.palette === 'function' ? Basin.palette(id) : null;
        const color = palette?.trees?.dark || [0.18, 0.47, 0.2];
        const crownMat = new BABYLON.StandardMaterial(`basinPreviewCrownMat_${id}`, this.scene);
        crownMat.diffuseColor = new BABYLON.Color3(color[0], color[1], color[2]).scale(1.15);
        crownMat.specularColor = new BABYLON.Color3(0, 0, 0);
        crown.material = crownMat;
        trunk.material = this.trunkMaterial;
        const buffer = new Float32Array(matrices.length * 16);
        matrices.forEach((m, i) => m.copyToArray(buffer, i * 16));
        crown.thinInstanceSetBuffer('matrix', buffer, 16, true);
        trunk.thinInstanceSetBuffer('matrix', buffer.slice(), 16, true);
        return [crown, trunk];
    }

    /** Liga a maquete da bacia (a outra desliga) e retoma o ângulo em que ela estava. */
    show(id) {
        const entry = this.build(id);
        if (!entry) return false;
        if (this.currentId && this.currentId !== id) {
            const old = this.maps.get(this.currentId);
            if (old) {
                old.alpha = this.camera.alpha;
                old.meshes.forEach(mesh => mesh.setEnabled(false));
            }
        }
        entry.meshes.forEach(mesh => mesh.setEnabled(true));
        this.camera.alpha = entry.alpha;
        this.currentId = id;
        this.dirty = true;
        return true;
    }

    /** Desenha um quadro agora e devolve a foto (PNG, fundo transparente) — para os cartões fora de foco. */
    snapshot() {
        if (!this.engine || !this.scene) return null;
        try {
            this.scene.render();
            return this.canvas.toDataURL('image/png');
        } catch (error) {
            logWarn('⚠️ Foto da maquete falhou:', error?.message || error);
            return null;
        }
    }

    tick() {
        const dt = Math.min(this.engine.getDeltaTime(), 100) / 1000;
        if (!BasinPreview.reducedMotion()) this.camera.alpha += BasinPreview.SPIN_SPEED * dt;
    }

    start() {
        if (!this.engine || this.running) return;
        this.running = true;
        this.engine.runRenderLoop(() => {
            if (this.disposed || !this.currentId) return;
            // Movimento reduzido: a câmera não gira; desenha só quando algo mudou (troca de bacia, tamanho)
            if (BasinPreview.reducedMotion() && !this.dirty) return;
            if (this.pacer && !this.pacer.ready(performance.now(), BasinPreview.FPS)) return;
            this.dirty = false;
            this.scene.render();
        });
    }

    resize() {
        if (!this.engine) return;
        this.engine.resize();
        this.fit();
        this.dirty = true;
    }

    /**
     * Distância da câmera para a maquete inteira caber em qualquer ângulo do giro: a diagonal do mapa na largura
     * (fov horizontal fixo) e a mesma diagonal, inclinada pela câmera, na altura do quadro.
     */
    fit() {
        const w = this.engine.getRenderWidth(), h = this.engine.getRenderHeight();
        if (!w || !h) return;
        const cam = this.camera;
        const side = GAME_CONFIG.grid.size * GAME_CONFIG.grid.cellSize;
        const diagonal = side * Math.SQRT2;
        const tanH = Math.tan(cam.fov / 2), tanV = tanH * h / w;
        const byWidth = diagonal / (2 * tanH);
        const byHeight = (diagonal * Math.cos(cam.beta) + 4 * Math.sin(cam.beta)) / (2 * tanV);
        // A diagonal só fica de frente em 4 momentos do giro: no quadro largo (desktop) dá para chegar mais perto
        cam.radius = Math.max(byWidth, byHeight) * (w / h > 2.2 ? 0.9 : 1);
    }

    dispose() {
        this.disposed = true;
        this.running = false;
        try {
            this.engine?.stopRenderLoop();
            this.scene?.dispose();
            this.engine?.dispose();
        } catch (error) {
            logWarn('⚠️ Erro ao descartar a maquete da bacia:', error?.message || error);
        }
        this.engine = null;
        this.scene = null;
        this.maps.clear();
        this.canvas.remove();
    }
}
