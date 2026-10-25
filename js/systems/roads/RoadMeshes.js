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

    // Ponte: tabuleiro, guarda-corpo e pilares (concreto no asfalto; madeira na terra e no cascalho)
    BRIDGE_COLORS: {
        paved: { deck: '#b9b5ab', deckSide: '#8f8b82', rail: '#e4e1d8', pillar: '#9a968d' },
        dirt: { deck: '#8a5a2b', deckSide: '#6e4722', rail: '#a8743f', pillar: '#6e4a26' },
        gravel: { deck: '#8a5a2b', deckSide: '#6e4722', rail: '#a8743f', pillar: '#6e4a26' }
    },

    ROAD_COLORS: {
        paved: { slab: '#b9b5ab', slabSide: '#9a968d', road: '#4b4f55', curb: '#e4e1d8', dash: '#f2c230', zebra: '#f1efe8' },
        dirt: { slab: '#6f9b45', slabSide: '#5a7d38', road: '#a47d52', curb: '#8a6a45', dash: null, zebra: null },
        gravel: { slab: '#76a04c', slabSide: '#5f843d', road: '#a9a49a', curb: '#8c877e', dash: null, zebra: null }
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

    /** Altura da rua assentada no chão da célula (topo do bloco do terreno, ou da água, + laje). */
    getRoadGroundHeight(gridX, gridZ) {
        return this.getBuildingAreaTerrainHeight(gridX, gridZ, 1) + this.ROAD_SHAPE.SLAB * this.gridManager.cellSize / 2 + 0.02;
    },

    /**
     * Perfil de altura de todas as ruas (RoadNetwork.profile): planas, rampas e pontes. Guardado até a próxima
     * mudança de ruas (refreshRoadPieces/refreshAllRoadPieces refazem).
     */
    getRoadProfile(net = null) {
        if (!this.roadProfile) {
            net = net || this.getRoadNetwork();
            this.roadProfile = net.profile((x, z) => this.getRoadGroundHeight(x, z),
                (x, z) => this.gridManager.getTerrainType(x, z) === 'water');
        }
        return this.roadProfile;
    },

    /** Altura do topo da rua no centro da célula (rampa: o meio dela; ponte: o tabuleiro). Sem rua: no chão. */
    getRoadSurfaceHeight(gridX, gridZ) {
        const p = this.roadProfile?.get(RoadNetwork.key(gridX, gridZ));
        if (!p) return this.getRoadGroundHeight(gridX, gridZ);
        return p.kind === 'ramp' ? p.base + p.rise / 2 : p.base;
    },

    /** Mesh da rua (instância da peça certa para os vizinhos de agora), já com metadata. */
    createRoadMesh(gridX, gridZ, buildingType, piece = null, prof = null) {
        piece = piece || this.getRoadNetwork().pieceAt(gridX, gridZ);
        prof = prof || this.getRoadProfile().get(RoadNetwork.key(gridX, gridZ)) || { kind: 'flat', base: this.getRoadGroundHeight(gridX, gridZ) };
        const roadType = buildingType.roadType;
        let template, rotation = piece.rotacao;
        if (prof.kind === 'bridge') template = this.getRoadPieceTemplate(roadType, 'reta', { bridge: true });
        else if (prof.kind === 'ramp') {
            template = this.getRoadPieceTemplate(roadType, piece.tipo, { rise: prof.rise });
            rotation = prof.dir; // o modelo da rampa sobe para +z (N); gira para o lado de onde a rua sobe
        } else template = this.getRoadPieceTemplate(roadType, piece.tipo);
        const mesh = template.createInstance(`road_${buildingType.id}_${gridX}_${gridZ}#${template.instances.length}`);
        const world = this.gridManager.gridToWorld(gridX, gridZ);
        mesh.position.set(world.x, prof.base, world.z);
        mesh.rotation.y = rotation * Math.PI / 2;
        mesh.isPickable = true;
        if (prof.kind === 'bridge') this.addBridgePillar(mesh, roadType, gridX, gridZ, prof.base);
        // Peça de rua não se mexe (muda trocando a instância): matriz congelada, nada a recalcular por quadro
        mesh.freezeWorldMatrix();
        mesh.getChildMeshes().forEach(child => child.freezeWorldMatrix());
        mesh.metadata = { building: true, buildingType: buildingType.id, gridX, gridZ, roadPiece: piece.tipo, roadRotation: piece.rotacao,
            roadKind: prof.kind, roadSig: this.roadSignature(piece, prof) };
        return mesh;
    },

    roadSignature(piece, prof) {
        return `${piece.tipo}|${piece.rotacao}|${prof.kind}|${prof.base.toFixed(3)}|${(prof.rise || 0).toFixed(2)}|${prof.dir ?? ''}`;
    },

    /** Pilar da ponte: do fundo do tabuleiro até o chão (na água, até o leito), filho da peça da rua. */
    addBridgePillar(mesh, roadType, gridX, gridZ, deck) {
        const h = this.gridManager.cellSize / 2;
        const water = this.gridManager.getTerrainType(gridX, gridZ) === 'water';
        const floor = water ? 0 : this.gridManager.getTerrainBlockHeight(gridX, gridZ);
        const height = deck - this.ROAD_SHAPE.SLAB * h - floor;
        if (height <= 0.05) return;
        const template = this.getBridgePillarTemplate(roadType);
        const pillar = template.createInstance(`roadPillar_${gridX}_${gridZ}#${template.instances.length}`);
        pillar.parent = mesh;
        pillar.position.set(0, -this.ROAD_SHAPE.SLAB * h, 0);
        pillar.scaling.y = height;
        pillar.isPickable = false;
    },

    /** Pilar-modelo: duas colunas e uma travessa, de y = 0 até y = -1 (escala em y = altura). */
    getBridgePillarTemplate(roadType) {
        if (!this.roadPillarTemplates) this.roadPillarTemplates = new Map();
        const cached = this.roadPillarTemplates.get(roadType);
        if (cached && !cached.isDisposed()) return cached;
        const h = this.gridManager.cellSize / 2;
        const c = this.BRIDGE_COLORS[roadType] || this.BRIDGE_COLORS.paved;
        const geo = { positions: [], indices: [], colors: [], normals: [] };
        const w = roadType === 'paved' ? 0.12 : 0.08;
        for (const x of [-0.55, 0.55]) this.pushBox(geo, [x * h - w, -1, -w], [x * h + w, 0, w], c.pillar);
        this.pushBox(geo, [-0.62 * h, -0.12, -w * 0.8], [0.62 * h, 0, w * 0.8], c.pillar);
        const mesh = this.meshFromGeometry(`roadPillar_${roadType}`, geo, `roadPieceMat_${roadType}_pilar`);
        this.roadPillarTemplates.set(roadType, mesh);
        return mesh;
    },

    /** Caixa alinhada aos eixos (de a até b) com cor por vértice, num acumulador { positions, indices, colors, normals }. */
    pushBox(geo, a, b, color) {
        const col = BABYLON.Color3.FromHexString(color);
        const [x0, y0, z0] = a, [x1, y1, z1] = b;
        const faces = [
            [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], 1],
            [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], 0.85],
            [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], 0.85],
            [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], 0.75],
            [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], 0.75]
        ];
        for (const [p, q, r, s, n, shade] of faces) {
            const base = geo.positions.length / 3;
            [p, q, r, s].forEach(v => { geo.positions.push(...v); geo.normals.push(...n); geo.colors.push(col.r * shade, col.g * shade, col.b * shade, 1); });
            geo.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
        }
    },

    meshFromGeometry(name, geo, materialName) {
        const mesh = new BABYLON.Mesh(name, this.scene);
        const data = new BABYLON.VertexData();
        data.positions = geo.positions;
        data.indices = geo.indices;
        data.colors = geo.colors;
        data.normals = geo.normals;
        data.applyToMesh(mesh);
        const mat = new BABYLON.StandardMaterial(materialName, this.scene);
        mat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
        mat.backFaceCulling = false;
        mesh.material = mat;
        mesh.receiveShadows = true;
        mesh.isPickable = false;
        mesh.isVisible = false; // modelo escondido: só as instâncias aparecem
        mesh.metadata = { roadTemplate: true };
        return mesh;
    },

    /** Recalcula a peça das ruas nas células dadas e nas vizinhas (troca a instância se mudou). */
    // Uma rua nova pode virar o apoio de uma ponte ou o topo de uma rampa a algumas células: o perfil é refeito e
    // todas as ruas conferidas (applyRoadPiece só troca a instância se a peça mudou)
    refreshRoadPieces() {
        this.refreshAllRoadPieces();
    },

    refreshAllRoadPieces() {
        const net = this.getRoadNetwork();
        this.roadProfile = null;
        const profile = this.getRoadProfile(net);
        for (const b of this.buildings.values()) {
            if (b.config?.roadType) this.applyRoadPiece(b, net.pieceAt(b.gridX, b.gridZ), profile);
        }
        this.refreshRoadAccesses();
    },

    // ===== ACESSOS (entrada de garagem/rebaixo de calçada entre a rua e o prédio vizinho) =====
    // Rua com prédio (não rua) ao lado ganha, daquele lado, uma faixa de concreto atravessando a calçada
    // e o meio-fio até o lote: parece que o prédio "sai" na rua. Uma instância de uma peça-modelo
    // escondida por tipo de rua (≤ 2 draw calls no total), refeita por diferença a cada mudança.

    /** Distância (em meias células) do centro da célula até o fim do asfalto + meio-fio, no lado canônico. */
    getRoadAccessReach(tipo, canonicalSide) {
        const { A, CURB } = this.ROAD_SHAPE;
        if (tipo === 'isolada') return A + 0.1 + CURB;
        if (tipo === 'curva') return Math.sqrt((1 + A + CURB) ** 2 - 1) - 1; // lado de fora do arco (meio-fio no eixo do lado)
        if (tipo === 'ponta' && canonicalSide === 2) return null; // o arremate redondo já encosta no lote
        return A + CURB; // reta, ponta (lados), T (lado sem braço)
    },

    /** Lados (0=N, 1=L, 2=S, 3=O) de cada rua que encostam num prédio. */
    computeRoadAccesses() {
        const lots = new Map();
        const roads = [];
        for (const b of this.buildings.values()) {
            if (b.config?.roadType) { roads.push(b); continue; }
            const size = b.config?.size || 1;
            for (let x = b.gridX; x < b.gridX + size; x++) {
                for (let z = b.gridZ; z < b.gridZ + size; z++) lots.set(RoadNetwork.key(x, z), b);
            }
        }
        if (!roads.length || !lots.size) return [];
        const net = this.getRoadNetwork();
        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        // Um acesso por prédio e lado da rua: o mais perto do meio da fachada (prédio grande não vira estacionamento)
        const best = new Map();
        for (const road of roads) {
            const piece = net.pieceAt(road.gridX, road.gridZ);
            dirs.forEach(([dx, dz], side) => {
                const nx = road.gridX + dx, nz = road.gridZ + dz;
                const lot = lots.get(RoadNetwork.key(nx, nz));
                if (!lot || net.has(nx, nz)) return;
                const reach = this.getRoadAccessReach(piece.tipo, ((side - piece.rotacao) % 4 + 4) % 4);
                if (reach === null) return;
                const half = ((lot.config?.size || 1) - 1) / 2;
                const dist = Math.abs(nx - (lot.gridX + half)) + Math.abs(nz - (lot.gridZ + half));
                const key = `${lot.id}|${side}`;
                const current = best.get(key);
                if (!current || dist < current.dist) best.set(key, { road, side, nx, nz, reach, dist });
            });
        }
        return [...best.values()];
    },

    /** Cria/remove as instâncias de acesso para casar com o mapa atual (chamado ao mudar ruas ou prédios). */
    refreshRoadAccesses() {
        if (!this.scene || !this.gridManager) return;
        if (!this.roadAccesses) this.roadAccesses = new Map();
        const h = this.gridManager.cellSize / 2;
        const wanted = new Map();
        for (const a of this.computeRoadAccesses()) {
            const { road, side, nx, nz, reach } = a;
            const roadY = this.getRoadSurfaceHeight(road.gridX, road.gridZ);
            // Avança um pouco para dentro do lote só se o chão do vizinho estiver na mesma altura
            const lotY = this.getBuildingAreaTerrainHeight(nx, nz, 1) + this.ROAD_SHAPE.SLAB * h + 0.02;
            const ext = Math.abs(lotY - roadY) < 0.06 ? 0.16 : 0;
            const key = `${road.gridX},${road.gridZ},${side}`;
            wanted.set(key, { road, side, reach, ext, roadY, sig: `${road.config.roadType}|${reach.toFixed(3)}|${ext}|${roadY.toFixed(3)}` });
        }
        for (const [key, entry] of this.roadAccesses) {
            if (wanted.get(key)?.sig === entry.sig && !entry.mesh.isDisposed()) continue;
            entry.mesh.dispose();
            this.roadAccesses.delete(key);
        }
        for (const [key, w] of wanted) {
            if (this.roadAccesses.has(key)) continue;
            const template = this.getRoadAccessTemplate(w.road.config.roadType);
            const mesh = template.createInstance(`roadAccess_${key}`);
            const world = this.gridManager.gridToWorld(w.road.gridX, w.road.gridZ);
            const dir = [[0, 1], [1, 0], [0, -1], [-1, 0]][w.side];
            const start = (w.reach - 0.03) * h;
            mesh.position.set(world.x + dir[0] * start, w.roadY, world.z + dir[1] * start);
            mesh.rotation.y = w.side * Math.PI / 2;
            mesh.scaling.z = (1 - w.reach + 0.03 + w.ext) * h; // peça-modelo tem comprimento 1
            mesh.isPickable = false;
            mesh.metadata = { roadAccess: true, gridX: w.road.gridX, gridZ: w.road.gridZ, side: w.side };
            mesh.freezeWorldMatrix();
            this.roadAccesses.set(key, { mesh, sig: w.sig });
        }
    },

    /** Peça-modelo do acesso: faixa de z = 0 (asfalto) a z = 1 (lote), largura fixa, abas de rampa nas laterais. */
    getRoadAccessTemplate(roadType) {
        if (!this.roadAccessTemplates) this.roadAccessTemplates = new Map();
        const cached = this.roadAccessTemplates.get(roadType);
        if (cached && !cached.isDisposed()) return cached;
        const h = this.gridManager.cellSize / 2;
        const colors = roadType === 'dirt' ? { pad: '#b4905f', wing: '#9a7a4e', line: '#8a6a45' }
            : roadType === 'gravel' ? { pad: '#bdb8ae', wing: '#a39e94', line: '#8c877e' }
                : { pad: '#d9d5cc', wing: '#bdb8ad', line: '#a7a297' };
        const W = 0.3 * h, F = 0.1 * h, Y = 0.034; // meia largura, aba da rampa, acima do meio-fio (0,03)
        const positions = [], indices = [], vcolors = [], normals = [];
        const quad = (pts, color, y = Y) => {
            const c = BABYLON.Color3.FromHexString(color);
            const base = positions.length / 3;
            pts.forEach(([x, z]) => { positions.push(x, y, z); normals.push(0, 1, 0); vcolors.push(c.r, c.g, c.b, 1); });
            indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
        };
        quad([[-W, 0], [-W, 1], [W, 1], [W, 0]], colors.pad);                 // faixa central
        quad([[-W - F, 0], [-W - F * 0.2, 0.55], [-W, 0.55], [-W, 0]], colors.wing); // aba esquerda (rampa)
        quad([[W, 0], [W, 0.55], [W + F * 0.2, 0.55], [W + F, 0]], colors.wing);    // aba direita
        quad([[-W, 0], [-W, 0.06], [W, 0.06], [W, 0]], colors.line, Y + 0.002);    // junta junto ao asfalto
        const mesh = new BABYLON.Mesh(`roadAccessPiece_${roadType}`, this.scene);
        const data = new BABYLON.VertexData();
        data.positions = positions;
        data.indices = indices;
        data.colors = vcolors;
        data.normals = normals;
        data.applyToMesh(mesh);
        const mat = new BABYLON.StandardMaterial(`roadAccessMat_${roadType}`, this.scene);
        mat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
        mat.backFaceCulling = false;
        mesh.material = mat;
        mesh.receiveShadows = true;
        mesh.isPickable = false;
        mesh.isVisible = false; // modelo escondido: só as instâncias aparecem
        mesh.metadata = { roadTemplate: true };
        this.roadAccessTemplates.set(roadType, mesh);
        return mesh;
    },

    applyRoadPiece(building, piece, profile = this.getRoadProfile()) {
        const old = building.mesh;
        const prof = profile.get(RoadNetwork.key(building.gridX, building.gridZ)) || { kind: 'flat', base: this.getRoadGroundHeight(building.gridX, building.gridZ) };
        if (old && !old.isDisposed() && old.metadata?.roadSig === this.roadSignature(piece, prof)) return;
        const mesh = this.createRoadMesh(building.gridX, building.gridZ, building.config, piece, prof);
        mesh.metadata = { ...(old?.metadata || {}), ...mesh.metadata, buildingId: building.id };
        building.mesh = mesh;
        if (old && !old.isDisposed()) old.dispose();
    },

    // ===== PEÇAS-MODELO =====
    /** opts.bridge = tabuleiro de ponte; opts.rise = rampa (altura arredondada em 0,05: poucos modelos por tipo). */
    getRoadPieceTemplate(roadType, tipo, opts = {}) {
        if (!this.roadTemplates) this.roadTemplates = new Map();
        const rise = opts.rise ? Math.max(0.05, Math.round(opts.rise * 20) / 20) : 0;
        const key = `${roadType}_${tipo}${opts.bridge ? '_ponte' : ''}${rise ? `_rampa${rise.toFixed(2)}` : ''}`;
        let template = this.roadTemplates.get(key);
        if (template && !template.isDisposed()) return template;
        template = this.buildRoadPieceMesh(roadType, tipo, { bridge: !!opts.bridge, rise });
        this.roadTemplates.set(key, template);
        return template;
    },

    /** Peça canônica (ligações N=+z, L=+x), origem no topo da laje, centro da célula. */
    buildRoadPieceMesh(roadType, tipo, { bridge = false, rise = 0 } = {}) {
        const h = this.gridManager.cellSize / 2;
        const { A, CURB, DASH, SLAB } = this.ROAD_SHAPE;
        const baseColors = this.ROAD_COLORS[roadType] || this.ROAD_COLORS.paved;
        const bridgeColors = this.BRIDGE_COLORS[roadType] || this.BRIDGE_COLORS.paved;
        // Na ponte a "calçada" vira o tabuleiro (na terra/cascalho, de madeira em vez de grama)
        const colors = bridge ? { ...baseColors, slab: bridgeColors.deck, slabSide: bridgeColors.deckSide } : baseColors;
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

        if (bridge) {
            // Guarda-corpo dos dois lados (ao longo de z) com postes
            const geo = { positions, indices, colors: vcolors, normals };
            for (const x of [-0.95, 0.95]) {
                this.pushBox(geo, [x * h - 0.025, 0.2, -h], [x * h + 0.025, 0.25, h], bridgeColors.rail);
                for (const z of [-0.8, 0, 0.8]) this.pushBox(geo, [x * h - 0.03, 0, z * h - 0.03], [x * h + 0.03, 0.25, z * h + 0.03], bridgeColors.rail);
            }
        }
        if (rise) {
            // Rampa: a peça inteira inclina, de y = 0 na borda sul (z = -h) até y = rise na borda norte (z = +h)...
            for (let i = 0; i < positions.length; i += 3) positions[i + 1] += rise * (positions[i + 2] / h + 1) / 2;
            // ...e um aterro enche o vão embaixo dela até a altura da laje da ponta baixa
            const c = BABYLON.Color3.FromHexString(colors.slabSide);
            const bottom = -SLAB * h;
            const tri = (pts, n) => {
                const base = positions.length / 3;
                pts.forEach(p => { positions.push(...p); normals.push(...n); vcolors.push(c.r, c.g, c.b, 1); });
                indices.push(base, base + 1, base + 2);
            };
            for (const x of [-h, h]) {
                const n = [Math.sign(x), 0, 0];
                tri([[x, bottom, -h], [x, bottom + rise, h], [x, bottom, h]], n);
            }
            const base = positions.length / 3;
            [[-h, bottom, h], [h, bottom, h], [h, bottom + rise, h], [-h, bottom + rise, h]]
                .forEach(p => { positions.push(...p); normals.push(0, 0, 1); vcolors.push(c.r, c.g, c.b, 1); });
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }

        const mesh = new BABYLON.Mesh(`roadPiece_${roadType}_${tipo}${bridge ? '_ponte' : ''}${rise ? '_rampa' : ''}`, this.scene);
        const data = new BABYLON.VertexData();
        data.positions = positions;
        data.indices = indices;
        data.colors = vcolors;
        data.normals = normals;
        data.applyToMesh(mesh);

        const mat = new BABYLON.StandardMaterial(`roadPieceMat_${roadType}_${tipo}${bridge ? '_ponte' : ''}${rise ? `_rampa${rise.toFixed(2)}` : ''}`, this.scene);
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
