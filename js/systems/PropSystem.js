/**
 * PropSystem — props de cenário (js/data/props.js) no mapa do jogo, o mais leve possível.
 *
 * Onde cada um fica sai do PropPlanner (puro, determinístico). Aqui só desenhamos:
 *   - os PARADOS: a geometria de todos os props de um pedaço do mapa (PROP_SETTINGS.CHUNK × CHUNK células) é juntada
 *     num único mesh com cor por vértice e um material para todos — no máximo 4 draw calls para o mapa inteiro, sem
 *     sombra projetada, sem picking, matriz congelada. Só o pedaço que mudou é refeito (assinatura dos props dele);
 *   - os que SE MEXEM (`motion`: bichos, o que boia, capim e bananeira no vento): um modelo-base escondido por tipo e
 *     uma instância por prop (uma draw call por tipo), movida a cada quadro em `animate` com contas simples (seno,
 *     círculo); os bichos do caderno de campo são clicáveis (metadata.species) e ganham um anel quando selecionados.
 *
 * Tamanho: cada .glb é medido ao carregar (maior medida) e escalado para `size` do tipo, em unidades do mundo —
 * o tamanho segue a escala do mapa, não a do arquivo (um hidrante não fica da altura de uma casa).
 *
 * Cada .glb (models/props/<id>.glb, dos kits Props Brasil e Fauna Ameaçada) é baixado uma vez, só quando o tipo
 * aparece pela primeira vez. Nada vai no save: o plano depende só do estado da cidade. Replaneja a cada
 * PROP_SETTINGS.REFRESH_MS com o jogo rodando e logo depois de construir/demolir (markDirty, chamado pelo BuildingSystem).
 */
class PropSystem {
    static PICK_RADIUS_PX = 34;      // clique a até esta distância (px da tela) do bicho também o seleciona
    static PICK_RADIUS_TOUCH_PX = 46;

    constructor(gameManager) {
        this.gameManager = gameManager;
        this.scene = gameManager.scene;
        this.gridManager = gameManager.gridManager;
        this.geometry = new Map(); // id → { positions, normals, colors, indices, fit } | null (falhou)
        this.loading = new Map();  // id → Promise
        this.chunks = new Map();   // "cx,cz" → { mesh, signature }
        this.templates = new Map(); // id → Mesh escondido (modelo-base das instâncias que se mexem)
        this.movers = new Map();   // chave do prop → { p, inst, base: {x, y, z} }
        this.placements = [];
        this.dirty = true;
        this.timer = 0;
        this.disposed = false;
        this.selected = null;      // { key, ring }

        const mat = new BABYLON.StandardMaterial('propsMat', this.scene);
        mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        mat.emissiveColor = new BABYLON.Color3(0.14, 0.14, 0.15); // como os modelos dos prédios (cinza não vira preto)
        mat.backFaceCulling = false; // toldos, redes e placas finas
        this.material = mat;
        this.animObserver = this.scene.onBeforeRenderObservable.add(() => this.animate());
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
            quality: gm.graphicsQuality || (typeof GraphicsQuality !== 'undefined' ? GraphicsQuality.current() : 'high'),
            basin: typeof Basin !== 'undefined' ? Basin.id() : undefined,
            ecology: this.getEcology()
        };
    }

    /**
     * Recuperação da bacia (0-1) para os bichos ameaçados chegarem: metade pelo tempo de jogo com o rio cheio
     * (QuestSystem.trackTimers.riverS, ≥ 70% — 12 min = cheio) e metade pela mata ciliar plantada (mudas prontas e
     * parques lineares na beira da água — 10 = cheio). Cresce com o cuidado mantido, não com um pico.
     */
    getEcology() {
        const gm = this.gameManager;
        const riverMin = (gm.questSystem?.trackTimers?.riverS || 0) / 60;
        let riparian = 0;
        gm.buildingSystem?.buildings?.forEach(b => {
            if (b.underConstruction || !['tree_sapling', 'linear_park'].includes(b.type)) return;
            if (gm.treeSystem?.isRiparianCell?.(b.gridX, b.gridZ)) riparian += b.type === 'linear_park' ? 2 : 1;
        });
        return Math.min(1, 0.5 * Math.min(1, riverMin / 12) + 0.5 * Math.min(1, riparian / 10));
    }

    static keyOf(p) {
        return `${p.id}@${p.x},${p.z},${p.ox.toFixed(2)},${p.oz.toFixed(2)}`;
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
        const moving = new Map();
        this.placements.forEach(p => {
            if (!this.geometry.get(p.id)) return; // ainda baixando (ou falhou)
            if (p.motion) { moving.set(PropSystem.keyOf(p), p); return; }
            const key = `${Math.floor(p.x / size)},${Math.floor(p.z / size)}`;
            if (!byChunk.has(key)) byChunk.set(key, []);
            byChunk.get(key).push(p);
        });
        const keys = new Set([...byChunk.keys(), ...this.chunks.keys()]);
        keys.forEach(key => {
            const items = byChunk.get(key) || [];
            const signature = items.map(PropSystem.keyOf).join('|');
            const chunk = this.chunks.get(key);
            if (chunk && chunk.signature === signature) return;
            if (!items.length) {
                chunk?.mesh.dispose(false, false); // o material é de todos
                this.chunks.delete(key);
                return;
            }
            this.buildChunk(key, items, signature);
        });
        this.syncMovers(moving);
        // Caderno de campo: o plano inteiro (não só o que já tem modelo): um bicho cujo .glb termina de baixar depois
        // não pode virar "descoberta" falsa; se o modelo ainda não chegou, ele aparece em instantes
        this.gameManager.uiManager?.onPropsPlanned?.(this.placements);
    }

    /** Baixa o .glb uma vez e guarda só a geometria (cores do material viram cor de vértice) e a medida. */
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
                const positions = Float32Array.from(vertexData.positions);
                this.geometry.set(id, {
                    positions,
                    normals: Float32Array.from(vertexData.normals || new Float32Array(n * 3)),
                    colors: Float32Array.from(colors),
                    indices: Uint32Array.from(vertexData.indices),
                    ...PropSystem.measure(positions)
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

    /** Caixa do modelo: `fit` = 1 / maior medida (escala 1 → maior medida = 1 unidade), centro e base. */
    static measure(positions) {
        let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i], y = positions[i + 1], z = positions[i + 2];
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
            if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        }
        const big = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
        return { fit: 1 / big, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, minY, height: (maxY - minY) / big };
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
            const c = Math.cos(p.rot), s = Math.sin(p.rot), k = p.scale * g.fit;
            const count = g.positions.length / 3;
            for (let i = 0; i < count; i++) {
                const px = g.positions[i * 3] - g.cx, py = g.positions[i * 3 + 1] - g.minY, pz = g.positions[i * 3 + 2] - g.cz;
                // Yaw do Babylon (mão esquerda): x' = x cos + z sen, z' = -x sen + z cos
                positions[(v + i) * 3] = tx + k * (px * c + pz * s);
                positions[(v + i) * 3 + 1] = ty + k * py + (g.minY < 0 ? k * g.minY * 0.5 : 0); // peça de água afunda um pouco
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

    /** Modelo-base escondido de um tipo que se mexe: centrado, base em y = 0, maior medida = 1. */
    getTemplate(id) {
        if (this.templates.has(id)) return this.templates.get(id);
        const g = this.geometry.get(id);
        if (!g) return null;
        const n = g.positions.length / 3;
        const positions = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            positions[i * 3] = (g.positions[i * 3] - g.cx) * g.fit;
            positions[i * 3 + 1] = (g.positions[i * 3 + 1] - g.minY) * g.fit;
            positions[i * 3 + 2] = (g.positions[i * 3 + 2] - g.cz) * g.fit;
        }
        const mesh = new BABYLON.Mesh(`propTemplate_${id}`, this.scene);
        const vd = new BABYLON.VertexData();
        vd.positions = positions;
        vd.normals = g.normals;
        vd.colors = g.colors;
        vd.indices = g.indices;
        vd.applyToMesh(mesh, false);
        mesh.material = this.material;
        mesh.isVisible = false; // nunca aparece; as instâncias sim (não descartar enquanto houver instância)
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        mesh.metadata = { props: true, propTemplate: true };
        this.templates.set(id, mesh);
        return mesh;
    }

    /** Cria/remove as instâncias dos props que se mexem para casar com o plano. */
    syncMovers(moving) {
        const gm = this.gridManager;
        this.movers.forEach((m, key) => {
            if (moving.has(key)) return;
            if (this.selected?.key === key) this.clearSelection();
            m.inst.dispose();
            this.movers.delete(key);
        });
        moving.forEach((p, key) => {
            if (this.movers.has(key)) return;
            const template = this.getTemplate(p.id);
            if (!template) return;
            const inst = template.createInstance(`prop_${key}`);
            const world = gm.gridToWorld(p.x, p.z);
            const g = this.geometry.get(p.id);
            const base = { x: world.x + p.ox, y: gm.getTerrainBlockHeight(p.x, p.z) + (g.minY < 0 ? p.scale * g.minY * g.fit * 0.5 : 0), z: world.z + p.oz };
            inst.scaling.setAll(p.scale);
            inst.position.set(base.x, base.y, base.z);
            inst.rotation.set(0, p.rot, 0);
            const species = typeof FieldNotebook !== 'undefined' && FieldNotebook.entry(p.id) ? p.id : null;
            inst.isPickable = !!species;
            inst.metadata = { props: true, species, propKey: key };
            // quanto o bicho pode passear sem sair da célula (e entrar numa casa ou rua vizinha)
            const wander = Math.max(0, Math.min(1, (0.96 - p.scale / 2 - Math.max(Math.abs(p.ox), Math.abs(p.oz))) / 0.28));
            this.movers.set(key, { p, inst, base, wander, height: (g.height || 1) * p.scale });
        });
    }

    /** Vento de agora (0-1) para o balanço das plantas: clima do jogo (WeatherEffects). */
    windFactor() {
        const prof = this.gameManager.weatherEffects?.profile;
        const kmh = prof?.wind ?? prof?.windSpeed ?? 10;
        return Math.max(0, Math.min(1, kmh / 40));
    }

    /** Movimento de cada quadro: contas baratas por instância (≤ algumas dezenas no mapa). */
    animate() {
        if (this.disposed || !this.movers.size) return;
        const t = performance.now() / 1000;
        const wind = 1 + this.windFactor();
        const yawTo = (dx, dz) => Math.atan2(-dx, -dz); // frente do modelo (-Z) apontando para (dx, dz)
        this.movers.forEach(m => {
            const { p, inst, base, wander = 1 } = m;
            const ph = p.phase || 0;
            let x = base.x, y = base.y, z = base.z, yaw = p.rot, rx = 0, rz = 0;
            switch (p.motion) {
                case 'bob':
                    y += 0.025 * Math.sin(t * 1.6 + ph);
                    rx = 0.05 * Math.sin(t * 1.3 + ph * 2);
                    rz = 0.06 * Math.sin(t * 1.1 + ph);
                    yaw += 0.15 * Math.sin(t * 0.2 + ph);
                    break;
                case 'swim': {
                    const a = t * 0.45 + ph, r = 0.4;
                    x += Math.cos(a) * r;
                    z += Math.sin(a) * r * 0.8;
                    yaw = yawTo(-Math.sin(a), Math.cos(a) * 0.8);
                    y += 0.02 * Math.sin(t * 2.2 + ph);
                    rz = 0.08 * Math.sin(t * 3 + ph);
                    break;
                }
                case 'graze': {
                    // passeia devagar perto do ponto (Lissajous) e para de vez em quando para comer
                    const s = t * 0.12;
                    const ex = Math.sin(s + ph) * 0.28 * wander, ez = Math.sin(s * 1.37 + ph * 2) * 0.22 * wander;
                    const vx = Math.cos(s + ph), vz = 1.37 * Math.cos(s * 1.37 + ph * 2) * 0.8;
                    x += ex;
                    z += ez;
                    yaw = yawTo(vx, vz);
                    rx = 0.07 * Math.max(0, Math.sin(t * 0.9 + ph)) * Math.abs(Math.sin(t * 4 + ph)); // abaixa para comer
                    break;
                }
                case 'hop': {
                    const u = (t * 0.4 + ph) % 1;
                    const n = Math.floor(t * 0.4 + ph);
                    if (u < 0.18) y += Math.sin((u / 0.18) * Math.PI) * 0.09;
                    yaw += (n % 5) * 1.1;
                    break;
                }
                case 'perch':
                    yaw += 0.35 * Math.sin(t * 0.45 + ph) + 0.2 * Math.sin(t * 1.7 + ph * 3);
                    y += 0.004 * Math.sin(t * 2 + ph);
                    break;
                case 'fly': {
                    const a = t * 1.3 + ph, r = 0.32;
                    x += Math.cos(a) * r;
                    z += Math.sin(a * 1.3) * r * 0.7;
                    y += 0.32 + 0.06 * Math.sin(t * 5 + ph);
                    yaw = yawTo(-Math.sin(a), Math.cos(a * 1.3) * 0.9);
                    rz = 0.25 * Math.sin(t * 9 + ph); // bate as asas (o corpo balança)
                    break;
                }
                case 'sway':
                    rx = 0.045 * wind * Math.sin(t * 1.3 + ph);
                    rz = 0.035 * wind * Math.sin(t * 1.05 + ph * 1.3);
                    break;
                default:
                    break;
            }
            inst.position.set(x, y, z);
            inst.rotation.set(rx, yaw, rz);
        });
        if (this.selected) {
            const m = this.movers.get(this.selected.key);
            if (!m) { this.clearSelection(); return; }
            const ring = this.selected.ring;
            ring.position.set(m.inst.position.x, m.base.y + 0.04, m.inst.position.z);
            ring.scaling.setAll((0.35 + m.p.scale) * (1 + 0.08 * Math.sin(t * 4)));
            this.selected.arrow.position.set(m.inst.position.x, m.inst.position.y + m.height + 0.18 + 0.05 * Math.sin(t * 3), m.inst.position.z);
            this.selected.arrow.rotation.y = t * 1.5;
        }
    }

    /** Bichos do caderno que estão no mapa agora (instâncias com modelo). */
    speciesInstances() {
        return [...this.movers.values()].filter(m => m.inst.metadata?.species && m.inst.isEnabled());
    }

    /**
     * Bicho do caderno sob o ponteiro (x, y em px do canvas): primeiro a malha do bicho; sem `exact`, também o
     * bicho cujo centro na tela está a até PICK_RADIUS_PX do clique (os bichos são pequenos e se mexem).
     * Devolve { id, key, cell: {x, z} } ou null.
     */
    pickSpeciesAt(x, y, { exact = false, touch = false } = {}) {
        const result = m => ({ id: m.p.id, key: m.inst.metadata.propKey, cell: { x: m.p.x, z: m.p.z } });
        const hit = this.scene.pick(x, y, mesh => !!mesh.metadata?.species && mesh.isEnabled());
        if (hit?.hit && hit.pickedMesh) {
            const m = this.movers.get(hit.pickedMesh.metadata.propKey);
            if (m) return result(m);
        }
        if (exact) return null;
        const camera = this.scene.activeCamera;
        const engine = this.scene.getEngine();
        if (!camera || !engine) return null;
        const scaleLevel = engine.getHardwareScalingLevel();
        const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const transform = this.scene.getTransformMatrix();
        const radius = touch ? PropSystem.PICK_RADIUS_TOUCH_PX : PropSystem.PICK_RADIUS_PX;
        let best = null, bestD = radius * radius;
        this.speciesInstances().forEach(m => {
            const center = new BABYLON.Vector3(m.inst.position.x, m.inst.position.y + m.height * 0.5, m.inst.position.z);
            const s = BABYLON.Vector3.Project(center, BABYLON.Matrix.IdentityReadOnly, transform, viewport);
            if (s.z < 0 || s.z > 1) return;
            const dx = s.x * scaleLevel - x, dy = s.y * scaleLevel - y;
            const d = dx * dx + dy * dy;
            if (d <= bestD) { bestD = d; best = m; }
        });
        return best ? result(best) : null;
    }

    /** Anel e setinha em cima do bicho selecionado (seguem o bicho em `animate`). */
    selectSpecies(key) {
        this.clearSelection();
        const m = this.movers.get(key);
        if (!m) return false;
        const mat = new BABYLON.StandardMaterial('speciesSelectMat', this.scene);
        mat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.2);
        mat.emissiveColor = new BABYLON.Color3(1, 0.78, 0.15);
        mat.disableLighting = true;
        const ring = BABYLON.MeshBuilder.CreateTorus('speciesSelectRing', { diameter: 1, thickness: 0.06, tessellation: 28 }, this.scene);
        ring.material = mat;
        ring.isPickable = false;
        const arrow = BABYLON.MeshBuilder.CreateCylinder('speciesSelectArrow', { diameterTop: 0.16, diameterBottom: 0, height: 0.18, tessellation: 4 }, this.scene);
        arrow.material = mat;
        arrow.isPickable = false;
        this.selected = { key, ring, arrow, material: mat };
        this.animate();
        return true;
    }

    clearSelection() {
        if (!this.selected) return;
        this.selected.ring.dispose();
        this.selected.arrow.dispose();
        this.selected.material.dispose();
        this.selected = null;
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
        this.movers.forEach(m => { triangles += (m.inst.sourceMesh.getTotalIndices() || 0) / 3; });
        return { planned: this.placements.length, shown, types, meshes: this.chunks.size, movers: this.movers.size, templates: this.templates.size, triangles };
    }

    dispose() {
        this.disposed = true;
        this.clearSelection();
        if (this.animObserver) this.scene.onBeforeRenderObservable.remove(this.animObserver);
        this.chunks.forEach(c => c.mesh.dispose(false, false));
        this.chunks.clear();
        this.movers.forEach(m => m.inst.dispose());
        this.movers.clear();
        this.templates.forEach(t => t.dispose(false, false));
        this.templates.clear();
        this.material.dispose();
    }
}

window.PropSystem = PropSystem;
