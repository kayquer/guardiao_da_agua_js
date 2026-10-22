/**
 * TreeSystem — bosques sorteados no mapa, leves e low poly.
 * Modelos pela técnica do QuickTreeGenerator da comunidade Babylon (copa = esfera com vértices sorteados,
 * tronco = cilindro), feitos uma vez só por variante; cada árvore no mapa é uma InstancedMesh
 * (mesma geometria e material na GPU: centenas de árvores custam poucas draw calls).
 *
 * Árvores em pé limpam o ar (redução de poluição) e deixam a cidade mais verde (satisfação, via
 * ResourceManager.greenBonus). Construir em cima derruba (fellTreesInArea, chamado por placeBuilding):
 * perde o bônus e a poluição sobe na hora. Valores em TREES (GameConstants).
 */
class TreeSystem {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.scene = gameManager.scene;
        this.gridManager = gameManager.gridManager;
        this.trees = new Map(); // "x,z" → InstancedMesh
        this.appliedReduction = 0;
        this.templates = this.createTemplates();
        this.generate();
    }

    // ===== Modelos (um por variante, escondidos; o mapa só tem instâncias) =====
    createTemplates() {
        const trunkMat = new BABYLON.StandardMaterial('treeTrunkMat', this.scene);
        trunkMat.diffuseColor = new BABYLON.Color3(0.42, 0.27, 0.14);
        trunkMat.specularColor = BABYLON.Color3.Black();
        const leaf = (name, r, g, b) => {
            const mat = new BABYLON.StandardMaterial(name, this.scene);
            mat.diffuseColor = new BABYLON.Color3(r, g, b);
            mat.specularColor = BABYLON.Color3.Black();
            return mat;
        };
        return [
            this.createTreeTemplate('treeRound', { crown: 1.3, trunk: 0.7, crownY: 1.15 }, trunkMat, leaf('treeLeafMat', 0.22, 0.58, 0.2)),
            this.createTreeTemplate('treeDark', { crown: 1.0, trunk: 0.6, crownY: 0.95 }, trunkMat, leaf('treeLeafDarkMat', 0.13, 0.42, 0.16)),
            this.createTreeTemplate('treePine', { crown: 1.0, trunk: 0.5, crownY: 1.1, pine: true }, trunkMat, leaf('treePineMat', 0.1, 0.36, 0.2))
        ];
    }

    createTreeTemplate(name, { crown, trunk, crownY, pine = false }, trunkMat, leafMat) {
        const trunkMesh = BABYLON.MeshBuilder.CreateCylinder(`${name}_trunk`, {
            height: trunk, diameterTop: 0.14, diameterBottom: 0.22, tessellation: 5
        }, this.scene);
        trunkMesh.position.y = trunk / 2; // base no chão: a árvore balança a partir do pé
        trunkMesh.material = trunkMat;

        const crownMesh = pine
            ? BABYLON.MeshBuilder.CreateCylinder(`${name}_crown`, { height: crown * 1.6, diameterTop: 0, diameterBottom: crown, tessellation: 6 }, this.scene)
            : BABYLON.MeshBuilder.CreateSphere(`${name}_crown`, { diameter: crown, segments: 2 }, this.scene);
        crownMesh.position.y = pine ? crownY + crown * 0.5 : crownY;
        crownMesh.material = leafMat;
        if (!pine) TreeSystem.jitterVertices(crownMesh, crown * 0.12);

        const tree = BABYLON.Mesh.MergeMeshes([trunkMesh, crownMesh], true, true, undefined, false, true);
        tree.name = `${name}_template`;
        tree.convertToFlatShadedMesh(); // facetado = low poly
        tree.isPickable = false;
        tree.isVisible = false; // o modelo não aparece; as instâncias sim
        return tree;
    }

    /** O "Quick Tree": desloca cada vértice da copa ao acaso, mantendo juntos os que estão no mesmo lugar. */
    static jitterVertices(mesh, amount) {
        const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const moved = new Map();
        for (let i = 0; i < positions.length; i += 3) {
            const key = `${positions[i].toFixed(3)},${positions[i + 1].toFixed(3)},${positions[i + 2].toFixed(3)}`;
            if (!moved.has(key)) moved.set(key, [0, 1, 2].map(() => (Math.random() - 0.5) * 2 * amount));
            const d = moved.get(key);
            positions[i] += d[0]; positions[i + 1] += d[1]; positions[i + 2] += d[2];
        }
        mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    }

    // ===== Sorteio dos bosques =====
    generate() {
        const gm = this.gridManager;
        const start = gm.startArea;
        const seed = Math.random() * 1000;
        for (let x = 0; x < gm.gridSize; x++) {
            for (let z = 0; z < gm.gridSize; z++) {
                const type = gm.getTerrainType(x, z);
                if (type !== 'grassland' && type !== 'lowland') continue;
                if (gm.occupationGrid[x][z]) continue;
                if (start && Math.abs(x - start.x) <= TREES.START_AREA_CLEAR && Math.abs(z - start.z) <= TREES.START_AREA_CLEAR) continue;
                const forest = gm.simpleNoise(x * 0.18, z * 0.18, seed) > 0.68;
                if (Math.random() < (forest ? TREES.FOREST_CHANCE : TREES.SCATTER_CHANCE)) this.addTree(x, z);
            }
        }
        this.initialCount = this.trees.size;
        log(`🌳 ${this.trees.size} árvores no mapa`);
    }

    addTree(x, z) {
        const template = this.templates[Math.floor(Math.random() * this.templates.length)];
        const tree = template.createInstance(`tree_${x}_${z}`);
        const pos = this.gridManager.gridToWorld(x, z);
        const jitter = this.gridManager.cellSize * 0.2;
        tree.position.set(
            pos.x + (Math.random() - 0.5) * 2 * jitter,
            this.gridManager.getTerrainBlockHeight(x, z),
            pos.z + (Math.random() - 0.5) * 2 * jitter
        );
        tree.rotation.y = Math.random() * Math.PI * 2;
        tree.scaling.setAll(0.8 + Math.random() * 0.45);
        tree.isPickable = false;
        tree.metadata = { tree: true, decorationType: 'tree', gridX: x, gridZ: z };
        this.trees.set(`${x},${z}`, tree);
    }

    // ===== Efeitos na cidade =====
    get count() {
        return this.trees.size;
    }

    /** Poluição/min que as árvores tiram agora. */
    get pollutionReduction() {
        return this.trees.size * TREES.POLLUTION_REDUCTION;
    }

    /** Reaplica redução de poluição e bônus verde (fresh: depois de ResourceManager.reset, que zera tudo). */
    applyEffects({ fresh = false } = {}) {
        const rm = this.gameManager.resourceManager;
        if (!rm) return;
        if (fresh) this.appliedReduction = 0;
        rm.removePollutionReduction(this.appliedReduction);
        this.appliedReduction = this.pollutionReduction;
        rm.addPollutionReduction(this.appliedReduction);
        rm.greenBonus = this.initialCount ? TREES.GREEN_BONUS_MAX * (this.trees.size / this.initialCount) : 0;
    }

    /** Derruba as árvores da área da obra. Retorna quantas caíram. */
    fellTreesInArea(gridX, gridZ, size = 1) {
        let felled = 0;
        for (let x = gridX; x < gridX + size; x++) {
            for (let z = gridZ; z < gridZ + size; z++) {
                const tree = this.trees.get(`${x},${z}`);
                if (!tree) continue;
                tree.dispose();
                this.trees.delete(`${x},${z}`);
                felled++;
            }
        }
        if (!felled) return 0;

        this.applyEffects();
        const pollution = this.gameManager.resourceManager?.resources.pollution;
        if (pollution) pollution.current = Math.min(pollution.max, pollution.current + felled * TREES.FELL_POLLUTION);
        this.gameManager.uiManager?.showNotification(
            `🪓 ${felled === 1 ? '1 árvore derrubada' : `${felled} árvores derrubadas`} para a obra: o ar piora e a cidade fica menos verde.`,
            'warning', 5000);
        log(`🪓 ${felled} árvore(s) derrubada(s) em (${gridX}, ${gridZ})`);
        return felled;
    }

    /** Quantas árvores uma obra nessa área derrubaria (aviso no posicionamento). */
    countTreesInArea(gridX, gridZ, size = 1) {
        let count = 0;
        for (let x = gridX; x < gridX + size; x++) {
            for (let z = gridZ; z < gridZ + size; z++) {
                if (this.trees.has(`${x},${z}`)) count++;
            }
        }
        return count;
    }

    // ===== Save/load =====
    // O mapa sorteia os bosques a cada jogo: o save guarda quais células têm árvore (as derrubadas não estão lá)
    // e initialCount (base do bônus verde).
    getSaveData() {
        return {
            cells: Array.from(this.trees.values(), tree => [tree.metadata.gridX, tree.metadata.gridZ]),
            initialCount: this.initialCount
        };
    }

    /**
     * Troca o bosque sorteado pelo do save. Os recursos salvos já contêm a redução de poluição das árvores,
     * então aqui só se acerta a contabilidade (appliedReduction) e o bônus verde, sem somar de novo.
     */
    loadData(data) {
        if (!data || !Array.isArray(data.cells)) return;
        this.trees.forEach(tree => tree.dispose());
        this.trees.clear();
        const size = this.gridManager.gridSize;
        for (const cell of data.cells) {
            const [x, z] = Array.isArray(cell) ? cell : [];
            if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || z < 0 || x >= size || z >= size) continue;
            if (!this.trees.has(`${x},${z}`)) this.addTree(x, z);
        }
        this.initialCount = Number.isFinite(data.initialCount) ? data.initialCount : this.trees.size;
        this.appliedReduction = this.pollutionReduction;
        const rm = this.gameManager.resourceManager;
        if (rm) rm.greenBonus = this.initialCount ? TREES.GREEN_BONUS_MAX * (this.trees.size / this.initialCount) : 0;
        log(`🌳 ${this.trees.size} árvores restauradas do save`);
    }

    dispose() {
        this.trees.forEach(tree => tree.dispose());
        this.trees.clear();
        this.templates.forEach(template => template.dispose(false, true));
    }
}
