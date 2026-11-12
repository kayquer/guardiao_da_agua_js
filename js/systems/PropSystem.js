/**
 * PropSystem — props de cenário (js/data/props.js) no mapa do jogo, o mais leve possível.
 *
 * Onde cada um fica sai do PropPlanner (puro, determinístico). Aqui só desenhamos: a geometria de todos os
 * props de um pedaço do mapa (PROP_SETTINGS.CHUNK × CHUNK células) é juntada num único mesh com cor por vértice
 * e um material para todos — no máximo 4 draw calls para o mapa inteiro, sem sombra projetada, sem picking,
 * matriz congelada. Só o pedaço que mudou é refeito (assinatura dos props dele).
 *
 * Cada .glb (models/props/<id>.glb, do Kit Props Brasil Low Poly) é baixado uma vez, só quando o tipo aparece
 * pela primeira vez (a natureza no começo; o resto quando a cidade chega lá). Nada vai no save: o plano depende
 * só do estado da cidade. Replaneja a cada PROP_SETTINGS.REFRESH_MS com o jogo rodando e logo depois de
 * construir/demolir (markDirty, chamado pelo BuildingSystem).
 */
class PropSystem {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.scene = gameManager.scene;
        this.gridManager = gameManager.gridManager;
        this.geometry = new Map(); // id → { positions, normals, colors, indices } | null (falhou)
        this.loading = new Map();  // id → Promise
        this.chunks = new Map();   // "cx,cz" → { mesh, signature }
        this.placements = [];
        this.dirty = true;
        this.timer = 0;
        this.disposed = false;

        const mat = new BABYLON.StandardMaterial('propsMat', this.scene);
        mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        mat.emissiveColor = new BABYLON.Color3(0.14, 0.14, 0.15); // como os modelos dos prédios (cinza não vira preto)
        mat.backFaceCulling = false; // toldos, redes e placas finas
        this.material = mat;
    }

    /** Algo mudou na grade (obra colocada, demolida, terminada): replaneja no próximo quadro. */
    markDirty() {
        this.dirty = true;
    }

    /** Chamado pelo GameManager.update só com o jogo rodando (em pausa e tutorial nada muda). */
    update(deltaTime) {
        this.timer += deltaTime;
        if (!this.dirty && this.timer < PROP_SETTINGS.REFRESH_MS) return;
        this.refresh();
    }

    /** Retrato da cidade para o planejador. */
    buildWorld() {
        const gm = this.gridManager;
        const trees = this.gameManager.treeSystem?.trees;
        const buildings = [];
        this.gameManager.buildingSystem?.buildings?.forEach(b => {
            const zoneType = b.config?.zoneType || '';
            buildings.push({
                type: b.type, x: b.gridX, z: b.gridZ, size: b.config?.size || 1,
                finished: !b.underConstruction, road: !!b.config?.roadType,
                zone: zoneType ? zoneType.split('_')[0] : null
            });
        });
        return {
            size: gm.gridSize,
            terrain: (x, z) => gm.getTerrainType(x, z),
            occupied: (x, z) => !!gm.occupationGrid?.[x]?.[z],
            tree: (x, z) => !!trees?.has(`${x},${z}`),
            buildings
        };
    }

    buildState() {
        const gm = this.gameManager;
        const res = gm.resourceManager?.resources;
        const population = res?.population?.current || 0;
        const missions = gm.questSystem?.completedQuests?.size || 0;
        const hasETE = [...(gm.buildingSystem?.buildings?.values() || [])].some(b => b.type === 'treatment_plant' && !b.underConstruction);
        // Desmatamento: parte das árvores do começo que já caiu para obras (TreeSystem.initialCount, salvo)
        const trees = gm.treeSystem;
        const deforestation = trees?.initialCount ? Math.max(0, 1 - trees.trees.size / trees.initialCount) : 0;
        return {
            level: PropPlanner.levelFor(population, missions),
            pollution: res?.pollution?.current || 0,
            sewage: population >= 40 && !hasETE,
            deforestation,
            quality: gm.graphicsQuality || (typeof GraphicsQuality !== 'undefined' ? GraphicsQuality.current() : 'high')
        };
    }

    refresh() {
        if (this.disposed || !this.gridManager?.occupationGrid?.length) return;
        this.dirty = false;
        this.timer = 0;
        this.placements = PropPlanner.plan(this.buildWorld(), this.buildState());

        // Tipos que aparecem pela primeira vez: baixa o modelo e replaneja quando chegar
        const needed = new Set(this.placements.map(p => p.id));
        needed.forEach(id => { if (!this.geometry.has(id)) this.load(id); });

        const size = PROP_SETTINGS.CHUNK;
        const byChunk = new Map();
        this.placements.forEach(p => {
            if (!this.geometry.get(p.id)) return; // ainda baixando (ou falhou)
            const key = `${Math.floor(p.x / size)},${Math.floor(p.z / size)}`;
            if (!byChunk.has(key)) byChunk.set(key, []);
            byChunk.get(key).push(p);
        });
        const keys = new Set([...byChunk.keys(), ...this.chunks.keys()]);
        keys.forEach(key => {
            const items = byChunk.get(key) || [];
            const signature = items.map(p => `${p.id}@${p.x},${p.z}`).join('|');
            const chunk = this.chunks.get(key);
            if (chunk && chunk.signature === signature) return;
            if (!items.length) {
                chunk?.mesh.dispose(false, false); // o material é de todos
                this.chunks.delete(key);
                return;
            }
            this.buildChunk(key, items, signature);
        });
        // Caderno de campo: só o que já está desenhado (modelo carregado) conta como "apareceu"
        this.gameManager.uiManager?.onPropsPlanned?.(this.placements.filter(p => this.geometry.get(p.id)));
    }

    /** Baixa o .glb uma vez e guarda só a geometria (cores do material viram cor de vértice). */
    load(id) {
        if (this.loading.has(id)) return this.loading.get(id);
        const type = PROP_TYPES[id];
        const scene = this.scene;
        const promise = (async () => {
            try {
                const url = `models/props/${encodeURIComponent(type.file)}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);
                const buffer = await response.arrayBuffer();
                if (this.disposed || scene.isDisposed) return;
                BABYLON.SceneLoader.ShowLoadingScreen = false;
                const container = await BABYLON.LoadAssetContainerAsync(new Uint8Array(buffer), scene, {
                    pluginExtension: '.glb', rootUrl: 'models/props/'
                });
                if (this.disposed || scene.isDisposed) { container.dispose(); return; }
                // Mesmo extrator dos prédios: junta as malhas e grava a cor do material em cada vértice
                const { vertexData } = BuildingSystem.prototype.extractBuildingModelData.call(this, container);
                const n = vertexData.positions.length / 3;
                let colors = vertexData.colors;
                if (!colors) colors = new Float32Array(n * 4).fill(1);
                this.geometry.set(id, {
                    positions: Float32Array.from(vertexData.positions),
                    normals: Float32Array.from(vertexData.normals || new Float32Array(n * 3)),
                    colors: Float32Array.from(colors),
                    indices: Uint32Array.from(vertexData.indices)
                });
            } catch (error) {
                logWarn(`⚠️ Prop ${id} não carregou; o cenário segue sem ele.`, error?.message || error);
                this.geometry.set(id, null);
            }
            this.markDirty();
        })();
        this.loading.set(id, promise);
        return promise;
    }

    /** Junta a geometria de todos os props do pedaço num mesh só (girada, escalada e posta no lugar). */
    buildChunk(key, items, signature) {
        const gm = this.gridManager;
        let vertices = 0, indexCount = 0;
        items.forEach(p => {
            const g = this.geometry.get(p.id);
            vertices += g.positions.length / 3;
            indexCount += g.indices.length;
        });
        const positions = new Float32Array(vertices * 3);
        const normals = new Float32Array(vertices * 3);
        const colors = new Float32Array(vertices * 4);
        const indices = new Uint32Array(indexCount);
        let v = 0, ii = 0;
        items.forEach(p => {
            const g = this.geometry.get(p.id);
            const world = gm.gridToWorld(p.x, p.z);
            const tx = world.x + p.ox, tz = world.z + p.oz;
            const ty = gm.getTerrainBlockHeight(p.x, p.z);
            const c = Math.cos(p.rot), s = Math.sin(p.rot), k = p.scale;
            const count = g.positions.length / 3;
            for (let i = 0; i < count; i++) {
                const px = g.positions[i * 3], py = g.positions[i * 3 + 1], pz = g.positions[i * 3 + 2];
                // Yaw do Babylon (mão esquerda): x' = x cos + z sen, z' = -x sen + z cos
                positions[(v + i) * 3] = tx + k * (px * c + pz * s);
                positions[(v + i) * 3 + 1] = ty + k * py;
                positions[(v + i) * 3 + 2] = tz + k * (-px * s + pz * c);
                const nx = g.normals[i * 3], ny = g.normals[i * 3 + 1], nz = g.normals[i * 3 + 2];
                normals[(v + i) * 3] = nx * c + nz * s;
                normals[(v + i) * 3 + 1] = ny;
                normals[(v + i) * 3 + 2] = -nx * s + nz * c;
            }
            colors.set(g.colors, v * 4);
            for (let j = 0; j < g.indices.length; j++) indices[ii + j] = g.indices[j] + v;
            v += count;
            ii += g.indices.length;
        });

        let chunk = this.chunks.get(key);
        if (!chunk) {
            const mesh = new BABYLON.Mesh(`props_${key}`, this.scene);
            mesh.material = this.material;
            mesh.isPickable = false;
            mesh.receiveShadows = true;
            mesh.metadata = { props: true };
            chunk = { mesh, signature: '' };
            this.chunks.set(key, chunk);
        }
        const vd = new BABYLON.VertexData();
        vd.positions = positions;
        vd.normals = normals;
        vd.colors = colors;
        vd.indices = indices;
        chunk.mesh.unfreezeWorldMatrix();
        vd.applyToMesh(chunk.mesh, false);
        chunk.mesh.refreshBoundingInfo();
        chunk.mesh.freezeWorldMatrix();
        chunk.mesh.doNotSyncBoundingInfo = true;
        chunk.signature = signature;
    }

    /** Para testes e diagnóstico: quantos props, de quais tipos, em quantos meshes. */
    getStats() {
        const types = {};
        let shown = 0;
        this.placements.forEach(p => {
            if (!this.geometry.get(p.id)) return;
            types[p.id] = (types[p.id] || 0) + 1;
            shown++;
        });
        let triangles = 0;
        this.chunks.forEach(c => { triangles += (c.mesh.getTotalIndices() || 0) / 3; });
        return { planned: this.placements.length, shown, types, meshes: this.chunks.size, triangles };
    }

    dispose() {
        this.disposed = true;
        this.chunks.forEach(c => c.mesh.dispose(false, false));
        this.chunks.clear();
        this.material.dispose();
    }
}

window.PropSystem = PropSystem;
