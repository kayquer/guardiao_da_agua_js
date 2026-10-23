/**
 * BuildingSystem — Malha das ruas (auto-encaixe)
 * Parte da classe BuildingSystem (js/systems/BuildingSystem.js), anexada via mixin(): use this.* normalmente.
 *
 * Cada rua é uma instância (createInstance) de uma peça-modelo escondida por tipo de rua × peça
 * (RoadNetwork.pieceForMask: ponta, reta, curva, T, cruzamento, isolada), girada em quartos de volta.
 * A peça ocupa a célula inteira (sem frestas): laje de calçada + asfalto (curva em arco, cantos
 * arredondados no T e no cruzamento) + meio-fio + faixa tracejada/faixas de pedestre, tudo com cor de
 * vértice num mesh só. Ao construir/demolir/carregar, a célula e as vizinhas trocam de peça.
 */
mixin(BuildingSystem, {
    // Medidas da peça em unidades de meia célula (h = cellSize / 2): asfalto de -A a +A
    ROAD_SHAPE: { A: 0.75, CURB: 0.06, DASH: 0.035, SLAB: 0.1 },

    ROAD_COLORS: {
        paved: { slab: '#b9b5ab', slabSide: '#9a968d', road: '#4b4f55', curb: '#e4e1d8', dash: '#f2c230', zebra: '#f1efe8' },
        dirt: { slab: '#6f9b45', slabSide: '#5a7d38', road: '#a47d52', curb: '#8a6a45', dash: null, zebra: null }
    },

    isRoadType(typeOrId) {
        const type = typeof typeOrId === 'string' ? this.buildingTypes.get(typeOrId) : typeOrId;
        return !!type?.roadType;
    },

    /** Rede com todas as ruas do mapa (qualquer tipo de rua liga com qualquer outro). */
    getRoadNetwork() {
        const net = new RoadNetwork();
        for (const b of this.buildings.values()) if (b.config?.roadType) net.add(b.gridX, b.gridZ);
        return net;
    },

    /** Altura do topo da rua na célula (topo do bloco do terreno + laje). */
    getRoadSurfaceHeight(gridX, gridZ) {
        return this.getBuildingAreaTerrainHeight(gridX, gridZ, 1) + this.ROAD_SHAPE.SLAB * this.gridManager.cellSize / 2 + 0.02;
    },

    /** Mesh da rua (instância da peça certa para os vizinhos de agora), já com metadata. */
    createRoadMesh(gridX, gridZ, buildingType, piece = null) {
        piece = piece || this.getRoadNetwork().pieceAt(gridX, gridZ);
        const template = this.getRoadPieceTemplate(buildingType.roadType, piece.tipo);
        const mesh = template.createInstance(`road_${buildingType.id}_${gridX}_${gridZ}#${template.instances.length}`);
        const world = this.gridManager.gridToWorld(gridX, gridZ);
        mesh.position.set(world.x, this.getRoadSurfaceHeight(gridX, gridZ), world.z);
        mesh.rotation.y = piece.rotacao * Math.PI / 2;
        mesh.isPickable = true;
        mesh.metadata = { building: true, buildingType: buildingType.id, gridX, gridZ, roadPiece: piece.tipo, roadRotation: piece.rotacao };
        return mesh;
    },

    /** Recalcula a peça das ruas nas células dadas e nas vizinhas (troca a instância se mudou). */
    refreshRoadPieces(cells) {
        const net = this.getRoadNetwork();
        const targets = new Map();
        for (const c of cells) {
            for (const [dx, dz] of [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0]]) {
                targets.set(RoadNetwork.key(c.x + dx, c.z + dz), { x: c.x + dx, z: c.z + dz });
            }
        }
        const byCell = new Map();
        for (const b of this.buildings.values()) if (b.config?.roadType) byCell.set(RoadNetwork.key(b.gridX, b.gridZ), b);
        for (const [key, cell] of targets) {
            const building = byCell.get(key);
            if (building) this.applyRoadPiece(building, net.pieceAt(cell.x, cell.z));
        }
    },

    refreshAllRoadPieces() {
        const net = this.getRoadNetwork();
        for (const b of this.buildings.values()) {
            if (b.config?.roadType) this.applyRoadPiece(b, net.pieceAt(b.gridX, b.gridZ));
        }
    },

    applyRoadPiece(building, piece) {
        const old = building.mesh;
        if (old && !old.isDisposed() && old.metadata?.roadPiece === piece.tipo && old.metadata?.roadRotation === piece.rotacao) return;
        const mesh = this.createRoadMesh(building.gridX, building.gridZ, building.config, piece);
        mesh.metadata = { ...(old?.metadata || {}), ...mesh.metadata, buildingId: building.id };
        building.mesh = mesh;
        if (old && !old.isDisposed()) old.dispose();
    },

    // ===== PEÇAS-MODELO =====
    getRoadPieceTemplate(roadType, tipo) {
        if (!this.roadTemplates) this.roadTemplates = new Map();
        const key = `${roadType}_${tipo}`;
        let template = this.roadTemplates.get(key);
        if (template && !template.isDisposed()) return template;
        template = this.buildRoadPieceMesh(roadType, tipo);
        this.roadTemplates.set(key, template);
        return template;
    },

    /** Peça canônica (ligações N=+z, L=+x), origem no topo da laje, centro da célula. */
    buildRoadPieceMesh(roadType, tipo) {
        const h = this.gridManager.cellSize / 2;
        const { A, CURB, DASH, SLAB } = this.ROAD_SHAPE;
        const colors = this.ROAD_COLORS[roadType] || this.ROAD_COLORS.paved;
        const positions = [], indices = [], vcolors = [], normals = [];
        const Y = { road: 0.012, curb: 0.03, mark: 0.022 };

        const pushPoly = (pts, y, color) => { // polígono em estrela a partir do 1º ponto (leque)
            const c = BABYLON.Color3.FromHexString(color);
            const base = positions.length / 3;
            pts.forEach(([x, z]) => {
                positions.push(x * h, y, z * h);
                normals.push(0, 1, 0);
                vcolors.push(c.r, c.g, c.b, 1);
            });
            for (let i = 1; i < pts.length - 1; i++) indices.push(base, base + i + 1, base + i);
        };
        const rect = (x0, z0, x1, z1, y, color) => pushPoly([[x0, z0], [x0, z1], [x1, z1], [x1, z0]], y, color);
        const arcPts = (cx, cz, r, a0, a1, segs) => {
            const pts = [];
            for (let i = 0; i <= segs; i++) {
                const a = a0 + (a1 - a0) * i / segs;
                pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
            }
            return pts;
        };
        const band = (cx, cz, r0, r1, a0, a1, segs, y, color) => { // faixa em arco (anel)
            const inner = arcPts(cx, cz, r0, a0, a1, segs);
            const outer = arcPts(cx, cz, r1, a0, a1, segs);
            for (let i = 0; i < segs; i++) pushPoly([inner[i], outer[i], outer[i + 1], inner[i + 1]], y, color);
        };
        const dashesAlong = (r, cx, cz, a0, a1) => { // tracejado num arco: 2 traços
            if (!colors.dash) return;
            for (const [f0, f1] of [[0.12, 0.42], [0.58, 0.88]]) band(cx, cz, r - DASH, r + DASH, a0 + (a1 - a0) * f0, a0 + (a1 - a0) * f1, 4, Y.mark, colors.dash);
        };
        const dashesNS = (z0, z1) => { // tracejado reto no eixo x = 0, traços de 0,5 a cada 1
            if (!colors.dash) return;
            for (const [a, b] of [[-0.75, -0.25], [0.25, 0.75]]) {
                const lo = Math.max(a, z0), hi = Math.min(b, z1);
                if (hi > lo) rect(-DASH, lo, DASH, hi, Y.mark, colors.dash);
            }
        };
        // Canto arredondado (filete) no quadrado [A,1]×[A,1] girado por (sx, sz): asfalto fora do quarto de
        // círculo de raio 1-A centrado no canto da célula, meio-fio na borda do arco
        const fillet = (sx, sz) => {
            const r = 1 - A;
            const cx = sx, cz = sz;
            const start = Math.atan2(-sz, 0); // ponto (cx, cz - sz·r)
            const end = Math.atan2(0, -sx);   // ponto (cx - sx·r, cz)
            let a1 = end;
            if (Math.abs(a1 - start) > Math.PI) a1 += a1 < start ? 2 * Math.PI : -2 * Math.PI;
            const arc = arcPts(cx, cz, r, start, a1, 6);
            pushPoly([[sx * A, sz * A], ...arc], Y.road, colors.road);
            band(cx, cz, r - CURB, r, start, a1, 6, Y.curb, colors.curb);
        };
        const zebra = (side) => { // faixa de pedestre na boca do braço (side: 'N','L','S','O')
            if (!colors.zebra) return;
            for (let i = 0; i < 4; i++) {
                const t0 = -A + 0.12 + i * 0.36, t1 = t0 + 0.18;
                if (side === 'L') rect(A + 0.03, t0, 0.97, t1, Y.mark, colors.zebra);
                if (side === 'O') rect(-0.97, t0, -A - 0.03, t1, Y.mark, colors.zebra);
                if (side === 'N') rect(t0, A + 0.03, t1, 0.97, Y.mark, colors.zebra);
                if (side === 'S') rect(t0, -0.97, t1, -A - 0.03, Y.mark, colors.zebra);
            }
        };

        // Laje de calçada: topo + lados (cobre a fresta entre os blocos do terreno)
        const s = SLAB;
        rect(-1, -1, 1, 1, 0, colors.slab);
        const side = (pts, [nx, nz]) => {
            const c = BABYLON.Color3.FromHexString(colors.slabSide);
            const base = positions.length / 3;
            pts.forEach(([x, y, z]) => { positions.push(x * h, y * h, z * h); normals.push(nx, 0, nz); vcolors.push(c.r, c.g, c.b, 1); });
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        };
        side([[-1, 0, -1], [1, 0, -1], [1, -s, -1], [-1, -s, -1]], [0, -1]);
        side([[1, 0, 1], [-1, 0, 1], [-1, -s, 1], [1, -s, 1]], [0, 1]);
        side([[1, 0, -1], [1, 0, 1], [1, -s, 1], [1, -s, -1]], [1, 0]);
        side([[-1, 0, 1], [-1, 0, -1], [-1, -s, -1], [-1, -s, 1]], [-1, 0]);

        const curbLine = (x0, z0, x1, z1) => rect(x0, z0, x1, z1, Y.curb, colors.curb);
        if (tipo === 'reta') {
            rect(-A, -1, A, 1, Y.road, colors.road);
            curbLine(-A - CURB, -1, -A, 1);
            curbLine(A, -1, A + CURB, 1);
            dashesNS(-1, 1);
        } else if (tipo === 'ponta') {
            rect(-A, -0.25, A, 1, Y.road, colors.road);
            pushPoly([[0, -0.25], ...arcPts(0, -0.25, A, Math.PI, 2 * Math.PI, 12)], Y.road, colors.road);
            curbLine(-A - CURB, -0.25, -A, 1);
            curbLine(A, -0.25, A + CURB, 1);
            band(0, -0.25, A, A + CURB, Math.PI, 2 * Math.PI, 12, Y.curb, colors.curb);
            dashesNS(0.25, 1);
        } else if (tipo === 'isolada') {
            pushPoly([[0, 0], ...arcPts(0, 0, A + 0.1, 0, 2 * Math.PI, 20)], Y.road, colors.road);
            band(0, 0, A + 0.1, A + 0.1 + CURB, 0, 2 * Math.PI, 20, Y.curb, colors.curb);
        } else if (tipo === 'curva') {
            // Liga N e L: arco centrado no canto NE (1, 1), raios 1-A a 1+A, de 180° a 270°
            const a0 = Math.PI, a1 = 1.5 * Math.PI;
            band(1, 1, 1 - A, 1 + A, a0, a1, 14, Y.road, colors.road);
            band(1, 1, 1 - A - CURB, 1 - A, a0, a1, 14, Y.curb, colors.curb);
            band(1, 1, 1 + A, 1 + A + CURB, a0, a1, 14, Y.curb, colors.curb);
            dashesAlong(1, 1, 1, a0, a1);
        } else if (tipo === 'T') {
            // Liga N, L e S: avenida N-S + braço a leste com cantos arredondados
            rect(-A, -1, A, 1, Y.road, colors.road);
            rect(A, -A, 1, A, Y.road, colors.road);
            fillet(1, 1);
            fillet(1, -1);
            curbLine(-A - CURB, -1, -A, 1);
            dashesNS(-1, 1);
            zebra('L');
        } else if (tipo === 'cruzamento') {
            rect(-A, -1, A, 1, Y.road, colors.road);
            rect(A, -A, 1, A, Y.road, colors.road);
            rect(-1, -A, -A, A, Y.road, colors.road);
            fillet(1, 1);
            fillet(1, -1);
            fillet(-1, 1);
            fillet(-1, -1);
            ['N', 'L', 'S', 'O'].forEach(zebra);
        }

        const mesh = new BABYLON.Mesh(`roadPiece_${roadType}_${tipo}`, this.scene);
        const data = new BABYLON.VertexData();
        data.positions = positions;
        data.indices = indices;
        data.colors = vcolors;
        data.normals = normals;
        data.applyToMesh(mesh);

        const mat = new BABYLON.StandardMaterial(`roadPieceMat_${roadType}_${tipo}`, this.scene);
        mat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
        mat.backFaceCulling = false;
        mesh.material = mat;
        mesh.receiveShadows = true;
        mesh.isPickable = false;
        mesh.isVisible = false; // modelo escondido: só as instâncias aparecem (como as árvores do TreeSystem)
        mesh.metadata = { roadTemplate: true };
        return mesh;
    }
});
