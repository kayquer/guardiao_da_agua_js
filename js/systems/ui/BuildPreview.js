/**
 * GUARDIÃO DA ÁGUA - PRÉVIA 3D DO PRÉDIO NO MENU DE CONSTRUÇÃO (#build-preview-canvas)
 *
 * Engine Babylon própria e pequena, criada na primeira vez que uma prévia aparece e reaproveitada depois
 * (o render loop só roda com a prévia visível: stop() ao fechar o menu). Usa o carregador do jogo
 * (BuildingSystem.prototype com um contexto mínimo, como a intro): mesmo encaixe pela caixa envolvente e
 * as mesmas peças que giram (pás "pas_N", "gira_N"). Zonas mostram o lote da fase completa (ZONE_LOTS).
 * Sem modelo (ruas, calçada, controle de erosão): has() = false e a UI mostra o ícone no lugar.
 */
class BuildPreview {
    static SPIN_SPEED = 0.45; // rad/s do giro do prédio inteiro

    /** O tipo tem algo para mostrar em 3D? */
    static has(typeId) {
        return !!((typeof BUILDING_MODELS !== 'undefined' && BUILDING_MODELS[typeId])
            || (typeof ZONE_LOTS !== 'undefined' && ZONE_LOTS[typeId]));
    }

    constructor(canvas) {
        this.canvas = canvas;
        this.engine = null;
        this.templates = new Map();      // typeId → modelo-base (prédio)
        this.pieceTemplates = new Map(); // arquivo .glb → modelo-base de peça de zona
        this.current = null;             // { root, parts }
        this.token = 0;
        this.running = false;
    }

    /** Cria engine/cena na primeira vez. false se o WebGL não estiver disponível. */
    init() {
        if (this.engine) return true;
        if (typeof BABYLON === 'undefined' || !this.canvas) return false;
        try {
            this.engine = new BABYLON.Engine(this.canvas, true, { preserveDrawingBuffer: false, stencil: false, powerPreference: 'low-power' }, true);
        } catch (error) {
            logWarn('⚠️ Prévia 3D indisponível:', error?.message || error);
            this.engine = null;
            return false;
        }
        const scene = this.scene = new BABYLON.Scene(this.engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // o fundo é o degradê do CSS
        scene.skipPointerMovePicking = true;
        scene.autoClear = true;

        const camera = this.camera = new BABYLON.ArcRotateCamera('buildPreviewCam', -Math.PI / 4, 1.0, 12, BABYLON.Vector3.Zero(), scene);
        camera.minZ = 0.05;
        camera.fov = 0.6;

        const hemi = new BABYLON.HemisphericLight('buildPreviewHemi', new BABYLON.Vector3(0.2, 1, -0.3), scene);
        hemi.intensity = 0.9;
        hemi.groundColor = new BABYLON.Color3(0.45, 0.5, 0.58);
        const sun = new BABYLON.DirectionalLight('buildPreviewSun', new BABYLON.Vector3(-0.5, -1, 0.7), scene);
        sun.intensity = 0.55;

        // Ilha de grama sob o prédio
        this.ground = BABYLON.MeshBuilder.CreateCylinder('buildPreviewGround', { diameter: 1, height: 0.12, tessellation: 40 }, scene);
        const groundMat = new BABYLON.StandardMaterial('buildPreviewGroundMat', scene);
        groundMat.diffuseColor = BABYLON.Color3.FromHexString('#7cc85a');
        groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
        this.ground.material = groundMat;
        this.ground.position.y = -0.07;

        this.root = new BABYLON.TransformNode('buildPreviewRoot', scene);
        this.loader = Object.assign(Object.create(BuildingSystem.prototype), {
            scene,
            gridManager: { cellSize: GAME_CONFIG.grid.cellSize }
        });

        scene.onBeforeRenderObservable.add(() => this.tick());
        return true;
    }

    /** Mostra o prédio (troca o anterior). Resolve true quando aparece; false se não tem modelo/falhou. */
    async show(typeId) {
        const token = ++this.token;
        if (!BuildPreview.has(typeId) || !this.init()) {
            this.clear();
            return false;
        }
        this.start();
        try {
            const node = typeof ZONE_LOTS !== 'undefined' && ZONE_LOTS[typeId]
                ? await this.buildZoneLot(typeId)
                : await this.buildModel(typeId);
            if (token !== this.token || !node) {
                node?.dispose(false, false);
                return token === this.token ? false : null;
            }
            this.clear();
            node.parent = this.root;
            this.root.rotation.y = -0.6;
            this.current = { root: node, parts: node.animatedParts || [] };
            this.frame(node, typeId);
            return true;
        } catch (error) {
            logWarn(`⚠️ Prévia 3D de ${typeId} indisponível:`, error?.message || error);
            if (token === this.token) this.clear();
            return false;
        }
    }

    async buildModel(typeId) {
        let template = this.templates.get(typeId);
        if (!template) {
            const entry = BUILDING_MODELS[typeId];
            const data = await this.loader.loadBuildingModelFile(entry.file);
            if (!data) return null;
            template = this.templates.get(typeId)
                || this.loader.createBuildingModelTemplate({ ...BUILDING_TYPES[typeId], id: typeId }, entry, data);
            this.templates.set(typeId, template);
        }
        const mesh = template.clone(`buildPreview_${typeId}`);
        mesh.setEnabled(true);
        mesh.isVisible = true;
        mesh.animatedParts = this.loader.collectAnimatedParts(mesh);
        return mesh;
    }

    /** Lote da zona na fase completa: laje com a cor do chão + peças da Kenney (sem os adereços de obra). */
    async buildZoneLot(typeId) {
        const lot = ZONE_LOTS[typeId];
        const size = BUILDING_TYPES[typeId]?.size || 2;
        const cell = GAME_CONFIG.grid.cellSize;
        const pieces = lot.stages[lot.stages.length - 1].filter(p => p.file.endsWith('.glb'));
        await Promise.all([...new Set(pieces.map(p => p.file))].map(async file => {
            if (this.pieceTemplates.has(file)) return;
            const data = await this.loader.loadBuildingModelFile(file);
            if (data && !this.pieceTemplates.has(file)) this.pieceTemplates.set(file, this.loader.createZonePieceTemplate(file, data));
        }));

        const root = new BABYLON.TransformNode(`buildPreviewLot_${typeId}`, this.scene);
        const slab = BABYLON.MeshBuilder.CreateBox(`buildPreviewSlab_${typeId}`, { width: size * cell, depth: size * cell, height: 0.08 }, this.scene);
        const slabMat = new BABYLON.StandardMaterial(`buildPreviewSlabMat_${typeId}`, this.scene);
        const ground = { grass: '#7cc85a', paved: '#b9b6ae', concrete: '#a19e97' }[lot.ground] || '#b9b6ae';
        slabMat.diffuseColor = BABYLON.Color3.FromHexString(ground);
        slabMat.specularColor = new BABYLON.Color3(0, 0, 0);
        slab.material = slabMat;
        slab.position.y = 0.04;
        slab.parent = root;
        pieces.forEach((piece, i) => {
            const template = this.pieceTemplates.get(piece.file);
            if (!template) return;
            const instance = template.createInstance(`buildPreviewPiece_${typeId}_${i}`);
            instance.parent = root;
            instance.position.set((piece.x - size / 2) * cell, 0.08, (piece.z - size / 2) * cell);
            instance.rotation.y = (piece.rot || 0) * Math.PI / 2;
            instance.scaling.setAll(piece.scale || 1);
        });
        // a laje e o material são deste lote: descartados com ele (as peças são instâncias dos modelos-base)
        root.onDisposeObservable.add(() => slabMat.dispose());
        return root;
    }

    /** Câmera enquadrando o prédio inteiro; a ilha de grama cresce com ele. */
    frame(node, typeId) {
        node.computeWorldMatrix(true);
        const { min, max } = node.getHierarchyBoundingVectors(true);
        const size = max.subtract(min);
        const footprint = Math.max(size.x, size.z, 0.5);
        const radius = Math.max(footprint * 0.75, size.y * 0.6, 0.6);
        this.ground.scaling.set(footprint * 1.35, 1, footprint * 1.35);
        this.camera.target.set(0, size.y * 0.38, 0);
        this.camera.radius = radius / Math.tan(this.camera.fov / 2) * 1.05;
        this.camera.beta = 1.0;
        this.camera.alpha = -Math.PI / 4;
        this.typeId = typeId;
    }

    tick() {
        const dt = Math.min(this.engine.getDeltaTime(), 100) / 1000;
        if (!this.current) return;
        const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (!reduced) this.root.rotation.y += BuildPreview.SPIN_SPEED * dt;
        for (const part of this.current.parts) {
            part.angle = (part.angle + part.speed * dt) % (Math.PI * 2);
            // Reaproveita o quaternion (antes: um novo por peça a cada quadro)
                if (part.mesh.rotationQuaternion) BABYLON.Quaternion.RotationAxisToRef(part.axis, -part.angle, part.mesh.rotationQuaternion);
                else part.mesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(part.axis, -part.angle);
        }
    }

    clear() {
        if (this.current) {
            this.current.root.dispose(false, false);
            this.current = null;
        }
    }

    start() {
        if (!this.engine || this.running) return;
        this.engine.resize();
        this.engine.runRenderLoop(() => this.scene.render());
        this.running = true;
    }

    /** Menu fechado ou prédio sem modelo: para de desenhar (nada roda escondido). */
    stop() {
        this.token++;
        if (!this.engine || !this.running) return;
        this.engine.stopRenderLoop();
        this.running = false;
    }

    resize() {
        this.engine?.resize();
    }
}
