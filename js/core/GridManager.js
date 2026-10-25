/**
 * GUARDIÃO DA ÁGUA - GRID MANAGER
 * Gerencia o sistema de grade 3D para posicionamento de estruturas
 */

class GridManager {
    // Quanto o chão (mesh "terrain") fica abaixo do topo dos blocos voxel: escondido na fresta entre eles
    static TERRAIN_FLOOR_GAP = 0.15;
    // Blocos voxel: largura do chanfro na borda do topo (fração da célula), realce da cor de vértice e lado
    // dos pedaços do mapa (em células)
    static TERRAIN_BEVEL = 0.045;
    static TERRAIN_BRIGHTNESS = 1.3;
    static TERRAIN_CHUNK = 10;
    // A terra toda fica este tanto acima do fundo; a água de cada lago/rio fica WATER_MARGIN abaixo da margem mais
    // baixa dele (nunca acima da terra em volta — antes a água rasa ficava mais alta que a margem). Mínimo WATER_MIN.
    static TERRAIN_BASE = 0.3;
    static WATER_MARGIN = 0.12;
    static WATER_MIN = 0.12;

    constructor(scene) {
        log('🗂️ Inicializando GridManager...');
        
        this.scene = scene;
        this.gridSize = GAME_CONFIG.grid.size;
        this.cellSize = GAME_CONFIG.grid.cellSize;
        
        // Grid de ocupação (true = ocupado, false = livre)
        this.occupationGrid = [];
        
        // Grid de elevação (altura do terreno)
        this.elevationGrid = [];
        
        // Grid de tipos de terreno
        this.terrainGrid = [];
        
        // Meshes visuais (blocos de terra e água em pedaços do mapa: createVoxelTerrainBlocks/createWaterBodies)
        this.terrainMesh = null; // chão sob os blocos (aparece sob a água)
        this.terrainMaterial = null;
        this.terrainBlocks = [];
        this.waterMeshes = [];

        // Água animada (shader) ou simples: segue a qualidade gráfica (GraphicsQuality), pode trocar ao vivo
        this.waterAnimated = typeof GraphicsQuality === 'undefined' ? true : GraphicsQuality.preset().waterShader;

        this.initializeGrid();
        this.createTerrain();
    }

    // ===== INICIALIZAÇÃO =====
    initializeGrid() {
        this.waterBodySizes = null; // getWaterBodySize recalcula para o terreno novo
        this.waterLevels = null;    // getWaterLevel também
        log(`🗂️ Criando grid ${this.gridSize}x${this.gridSize}...`);

        // Verificar se gridSize é válido
        if (!this.gridSize || this.gridSize < 1) {
            console.error('❌ GridSize inválido:', this.gridSize);
            this.gridSize = 20; // Fallback
        }

        // Inicializar grids
        for (let x = 0; x < this.gridSize; x++) {
            this.occupationGrid[x] = [];
            this.elevationGrid[x] = [];
            this.terrainGrid[x] = [];

            for (let z = 0; z < this.gridSize; z++) {
                this.occupationGrid[x][z] = false;

                // Gerar elevação procedural com verificação
                const elevation = this.generateElevation(x, z);
                this.elevationGrid[x][z] = isNaN(elevation) ? 0 : elevation;

                // Determinar tipo de terreno
                this.terrainGrid[x][z] = this.determineTerrainType(x, z);
            }
        }
        this.removeIsolatedHills();
        this.startArea = this.findStartArea();

        log('✅ Grid inicializado');
        log(`📊 Grid stats: ${this.gridSize}x${this.gridSize} = ${this.gridSize * this.gridSize} células`);
    }
    
    generateElevation(x, z) {
        try {
            // Verificar parâmetros
            if (typeof x !== 'number' || typeof z !== 'number') {
                console.warn('⚠️ Parâmetros inválidos para generateElevation:', x, z);
                return 0;
            }

            // Gerar elevação usando ruído Perlin simplificado
            const centerX = this.gridSize / 2;
            const centerZ = this.gridSize / 2;

            // Distância do centro
            const distanceFromCenter = Math.sqrt(
                Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2)
            );

            // Elevação base (mais alto no centro)
            const baseElevation = Math.max(0, 1 - (distanceFromCenter / (this.gridSize * 0.6)));

            // Adicionar variação
            const noise = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.2;

            const result = Math.max(0, baseElevation + noise);

            // Verificar se o resultado é válido
            return isNaN(result) ? 0 : result;

        } catch (error) {
            console.error('❌ Erro ao gerar elevação:', error);
            return 0;
        }
    }
    
    determineTerrainType(x, z) {
        const elevation = this.elevationGrid[x][z];

        // Área da cidade inicial (5-16, 5-16) deve ser adequada para construção
        if (x >= 5 && x <= 16 && z >= 5 && z <= 16) {
            // Garantir que a área da cidade inicial seja adequada para construção
            if (elevation < 0.3) return 'grassland';   // Pastagem (ideal para construção)
            return 'lowland'; // Planície baixa (também adequada)
        }

        // Usar seed baseado na posição para gerar terreno procedural consistente
        const seed = this.getTerrainSeed(x, z);

        // Gerar ruído para variação de terreno
        const noise1 = this.simpleNoise(x * 0.1, z * 0.1, seed);
        const noise2 = this.simpleNoise(x * 0.05, z * 0.05, seed + 1000);
        const combinedNoise = (noise1 + noise2 * 0.5) / 1.5;

        // Gerar ruído adicional para criar lagos maiores
        const lakeNoise = this.simpleNoise(x * 0.03, z * 0.03, seed + 2000);

        // Determinar tipo baseado em elevação e ruído
        const terrainValue = elevation + combinedNoise * 0.3;

        // Gerar ruído específico para colinas (menos frequente)
        const hillNoise = this.simpleNoise(x * 0.02, z * 0.02, seed + 3000);

        // Criar lagos maiores com ruído de baixa frequência
        if (lakeNoise > 0.7 && terrainValue < 0.4) return 'water'; // Lagos grandes
        if (terrainValue < 0.2) return 'water';      // Corpos d'água menores
        if (terrainValue < 0.4) return 'grassland';  // Pastagem (ideal para construção)
        if (terrainValue < 0.6) return 'lowland';    // Planície baixa

        // Colinas raras (~4% do mapa): antes eram 15% e tomavam o centro, onde o jogo começa
        if (hillNoise > 0.8 && terrainValue > 0.65) return 'hill'; // Colinas elevadas (mais raras)
        if (terrainValue < 0.8) return 'grassland';  // Mais pastagem

        // Colinas muito altas apenas em terreno muito elevado
        if (terrainValue > 0.95 && hillNoise > 0.6) return 'hill';
        return 'grassland';                           // Padrão para pastagem
    }

    /** Colina solta (sem outra colina ao lado) vira pastagem: só picota a área de construção. */
    removeIsolatedHills() {
        const isHill = (x, z) => this.terrainGrid[x]?.[z] === 'hill';
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                if (isHill(x, z) && !isHill(x + 1, z) && !isHill(x - 1, z) && !isHill(x, z + 1) && !isHill(x, z - 1)) {
                    this.terrainGrid[x][z] = 'grassland';
                }
            }
        }
    }

    /**
     * Área onde o jogo começa (câmera e Prefeitura do tutorial): o quadrado size×size com pelo menos
     * `minBuildable` de terreno construível (campo/planície), o mais perto do centro do mapa.
     * Retorna o centro em células { x, z } e a fração construível.
     */
    findStartArea(size = 8, minBuildable = 0.8) {
        const center = this.gridSize / 2;
        let best = null;
        for (let x0 = 0; x0 + size <= this.gridSize; x0++) {
            for (let z0 = 0; z0 + size <= this.gridSize; z0++) {
                let buildable = 0;
                for (let x = x0; x < x0 + size; x++) {
                    for (let z = z0; z < z0 + size; z++) {
                        const type = this.terrainGrid[x][z];
                        if ((type === 'grassland' || type === 'lowland') && !this.occupationGrid[x][z]) buildable++;
                    }
                }
                const ratio = buildable / (size * size);
                if (ratio < minBuildable) continue;
                const cx = x0 + size / 2, cz = z0 + size / 2;
                // Área mais livre primeiro (cada 2,5% construível vale 1 célula de distância), depois a mais central
                const score = Math.hypot(cx - center, cz - center) + (1 - ratio) * 40;
                if (!best || score < best.score) best = { x: Math.floor(cx), z: Math.floor(cz), ratio, score };
            }
        }
        return best ? { x: best.x, z: best.z, ratio: best.ratio } : { x: Math.floor(center), z: Math.floor(center), ratio: 0 };
    }

    // Função para gerar seed baseado na posição
    getTerrainSeed(x, z) {
        return (x * 73856093) ^ (z * 19349663) ^ 83492791;
    }

    // Função de ruído simples para geração procedural
    simpleNoise(x, z, seed = 0) {
        let n = Math.sin(x + seed) * Math.cos(z + seed);
        n += Math.sin(x * 2.1 + seed) * Math.cos(z * 1.9 + seed) * 0.5;
        n += Math.sin(x * 4.3 + seed) * Math.cos(z * 3.7 + seed) * 0.25;
        return (n + 1) / 2; // Normalizar para 0-1
    }
    
    // ===== CRIAÇÃO VISUAL =====
    createTerrain() {
        log('🏔️ Criando terreno procedural...');

        try {
            this.terrainMesh = BABYLON.MeshBuilder.CreateGround("terrain", {
                width: this.gridSize * this.cellSize,
                height: this.gridSize * this.cellSize,
                subdivisions: this.gridSize * 2
            }, this.scene);

            // Aplicar elevação customizada aos vértices
            this.applyElevationToTerrain();

        } catch (error) {
            console.error('❌ Erro ao criar terreno:', error);
            // Fallback: terreno plano simples
            this.terrainMesh = BABYLON.MeshBuilder.CreateGround("terrain_fallback", {
                width: this.gridSize * this.cellSize,
                height: this.gridSize * this.cellSize,
                subdivisions: 4
            }, this.scene);
        }

        // Criar sistema de materiais multi-terreno
        this.createMultiTerrainMaterial();

        this.terrainMesh.material = this.terrainMaterial;
        this.terrainMesh.receiveShadows = true;

        // Criar corpos d'água separados
        this.createWaterBodies();

        // Criar blocos de terreno individuais para estilo voxel
        this.createVoxelTerrainBlocks();
    }

    // O mesh "terrain" é o chão sob os blocos voxel: aparece só nas frestas entre eles (e sob a água) e serve
    // de alvo para o pick de posicionamento/informações do terreno. Cada vértice fica TERRAIN_FLOOR_GAP abaixo
    // do topo mais baixo das células que ele toca (água conta como 0), então o relevo nunca passa por cima de
    // um bloco. Antes ele usava elevação × 2 (até ~1,4 acima do topo de pastagens) e só a CPU via essa altura
    // (buffer não atualizável): o pick acertava um chão invisível acima dos prédios e, se a GPU recriasse o
    // buffer, o relevo aparecia por cima dos blocos perto de colinas.
    applyElevationToTerrain() {
        if (!this.terrainMesh) return;

        log('🏔️ Aplicando elevação ao terreno...');

        try {
            const positions = this.terrainMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            if (!positions) {
                console.warn('⚠️ Não foi possível obter posições dos vértices');
                return;
            }

            const half = (this.gridSize * this.cellSize) / 2;
            const eps = 1e-3;
            for (let i = 0; i < positions.length; i += 3) {
                // Vértice em coordenadas de célula; na borda entre células ele toca 2 ou 4 delas
                const fx = (positions[i] + half) / this.cellSize;
                const fz = (positions[i + 2] + half) / this.cellSize;
                positions[i + 1] = this.getTerrainFloorHeight(fx, fz, eps);
            }

            // setVerticesData (e não updateVerticesData): o buffer do CreateGround não é atualizável, então só a
            // cópia da CPU mudava. Recalcula normais e a caixa envolvente (usada pelo pick).
            this.terrainMesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
            this.terrainMesh.createNormals(false);
            this.terrainMesh.refreshBoundingInfo();

            log('✅ Elevação aplicada ao terreno');

        } catch (error) {
            console.error('❌ Erro ao aplicar elevação:', error);
        }
    }

    // Altura do chão (mesh "terrain") no ponto (fx, fz) em coordenadas de célula: abaixo do topo mais baixo
    // das células que o ponto toca. Sem Babylon — testado em tests/unit/world.test.js.
    getTerrainFloorHeight(fx, fz, eps = 1e-3) {
        const xs = [Math.floor(fx - eps), Math.floor(fx + eps)];
        const zs = [Math.floor(fz - eps), Math.floor(fz + eps)];
        let lowest = Infinity;
        for (const x of xs) {
            for (const z of zs) {
                if (x < 0 || z < 0 || x >= this.gridSize || z >= this.gridSize) continue;
                const top = this.getTerrainType(x, z) === 'water' ? 0 : this.getTerrainBlockHeight(x, z);
                lowest = Math.min(lowest, top);
            }
        }
        if (!isFinite(lowest)) return 0;
        return Math.max(0, lowest - GridManager.TERRAIN_FLOOR_GAP);
    }

    // ===== BLOCOS VOXEL E ÁGUA =====
    // Cada célula é um bloco do tamanho inteiro da célula (sem fresta: pela fresta de 2% aparecia o chão,
    // mais escuro, e de lado as frestas viravam linhas pretas). A leitura de "blocos" vem de um chanfro
    // escuro na borda do topo (cor de vértice). Tudo vira poucos meshes por pedaço do mapa (TERRAIN_CHUNK ×
    // TERRAIN_CHUNK células), com um material só: antes eram ~1.600 caixas, cada uma com material próprio.
    // Só as faces laterais que aparecem são geradas (onde o vizinho é mais baixo, água ou a borda do mapa).
    // A geometria é montada sem Babylon (buildTerrainGeometry/buildWaterGeometry, testadas em world.test.js).

    /** Topo do bloco de terra (null fora do mapa; água = 0, para a lateral da margem descer até o fundo). */
    landTop(x, z) {
        if (x < 0 || z < 0 || x >= this.gridSize || z >= this.gridSize) return null;
        return this.getTerrainType(x, z) === 'water' ? 0 : this.getTerrainBlockHeight(x, z);
    }

    /**
     * Nível (topo) da água de cada célula: o lago/rio inteiro fica plano, WATER_MARGIN abaixo da terra mais baixa
     * da margem dele. Grade calculada uma vez (o terreno não muda na partida).
     */
    static measureWaterLevels(terrainGrid, size, landHeight) {
        const levels = Array.from({ length: size }, () => new Array(size).fill(0));
        const seen = Array.from({ length: size }, () => new Array(size).fill(false));
        const isWater = (x, z) => x >= 0 && z >= 0 && x < size && z < size && terrainGrid[x]?.[z] === 'water';
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (!isWater(x, z) || seen[x][z]) continue;
                const cells = [[x, z]];
                seen[x][z] = true;
                let shore = Infinity;
                for (let i = 0; i < cells.length; i++) {
                    const [cx, cz] = cells[i];
                    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = cx + dx, nz = cz + dz;
                        if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
                        if (isWater(nx, nz)) {
                            if (!seen[nx][nz]) { seen[nx][nz] = true; cells.push([nx, nz]); }
                        } else shore = Math.min(shore, landHeight(nx, nz));
                    }
                }
                const level = Math.max(GridManager.WATER_MIN, (isFinite(shore) ? shore : GridManager.TERRAIN_BASE) - GridManager.WATER_MARGIN);
                cells.forEach(([cx, cz]) => { levels[cx][cz] = level; });
            }
        }
        return levels;
    }

    /** Topo da água da célula (0 se não é água). */
    getWaterLevel(gridX, gridZ) {
        if (!this.waterLevels) {
            this.waterLevels = GridManager.measureWaterLevels(this.terrainGrid, this.gridSize,
                (x, z) => this.getTerrainBlockHeight(x, z));
        }
        return this.waterLevels[gridX]?.[gridZ] || 0;
    }

    /** Profundidade do bloco de água da célula (mais funda onde a elevação é baixa). */
    getWaterDepth(x, z) {
        const elevation = this.elevationGrid[x]?.[z] || 0;
        return Math.max(0.2, 0.5 - elevation * 0.8);
    }

    // Leve variação de cor por célula, sempre a mesma para a célula (antes: Math.random por bloco)
    cellShade(x, z) {
        const h = Math.abs(Math.sin(x * 127.1 + z * 311.7) * 43758.5453) % 1;
        return (h - 0.5) * 0.1;
    }

    /**
     * Geometria dos blocos de terra das células [x0, x1) × [z0, z1): topo com chanfro (borda ~6% da célula,
     * um pouco mais baixa e mais escura) e laterais visíveis com a cor do bloco um pouco mais escura.
     * Retorna arrays simples { positions, normals, colors, indices }.
     */
    buildTerrainGeometry(x0, z0, x1, z1) {
        const out = { positions: [], normals: [], colors: [], indices: [] };
        const cs = this.cellSize;
        const half = (this.gridSize * cs) / 2;
        const inset = cs * GridManager.TERRAIN_BEVEL;
        for (let x = x0; x < x1; x++) {
            for (let z = z0; z < z1; z++) {
                const type = this.getTerrainType(x, z);
                if (type === 'water' || type === 'unknown') continue;
                const h = this.getTerrainBlockHeight(x, z, type);
                const drop = Math.min(0.04, h * 0.4);
                const base = this.getMinecraftTerrainColor(type);
                const v = this.cellShade(x, z);
                // × TERRAIN_BRIGHTNESS: a cor de vértice entra depois do clamp da luz do StandardMaterial; sem ela o
                // topo ficava mais escuro que o antigo (cor no diffuseColor, com luz > 1 saturando)
                const c = [base.r / 255 + v, base.g / 255 + v, base.b / 255 + v].map(n => Math.max(0, Math.min(1, n)) * GridManager.TERRAIN_BRIGHTNESS);
                const shade = k => [c[0] * k, c[1] * k, c[2] * k];
                const ax = x * cs - half, bx = ax + cs, az = z * cs - half, bz = az + cs;
                const ix0 = ax + inset, ix1 = bx - inset, iz0 = az + inset, iz1 = bz - inset;
                const e = h - drop;
                const top = shade(1), rim = shade(0.94), edge = shade(0.8);
                // Centro do topo
                GridManager.pushQuad(out, [[ix0, h, iz0], [ix1, h, iz0], [ix1, h, iz1], [ix0, h, iz1]], [0, 1, 0], [top, top, top, top]);
                // Chanfro nos 4 lados (borda externa mais baixa e mais escura)
                const ring = [
                    [[ax, e, az], [bx, e, az], [ix1, h, iz0], [ix0, h, iz0]],   // -z
                    [[bx, e, az], [bx, e, bz], [ix1, h, iz1], [ix1, h, iz0]],   // +x
                    [[bx, e, bz], [ax, e, bz], [ix0, h, iz1], [ix1, h, iz1]],   // +z
                    [[ax, e, bz], [ax, e, az], [ix0, h, iz0], [ix0, h, iz1]]    // -x
                ];
                for (const quad of ring) {
                    GridManager.pushQuad(out, quad, GridManager.faceNormal(quad), [edge, edge, rim, rim]);
                }
                // Laterais: só onde o vizinho é mais baixo (ou é água, ou a borda do mapa). O último número clareia
                // as faces de costas para o sol (-z, -x: a direcional não as ilumina e só a hemisférica sobra —
                // ficavam quase pretas); as de frente para o sol já recebem luz.
                const sides = [
                    [x, z - 1, [[bx, az], [ax, az]], [0, 0, -1], 1.6],
                    [x + 1, z, [[bx, bz], [bx, az]], [1, 0, 0], 1],
                    [x, z + 1, [[ax, bz], [bx, bz]], [0, 0, 1], 1.25],
                    [x - 1, z, [[ax, az], [ax, bz]], [-1, 0, 0], 1.5]
                ];
                for (const [nx, nz, [[px, pz], [qx, qz]], normal, light] of sides) {
                    const nTop = this.landTop(nx, nz);
                    const bottom = nTop === null ? 0 : nTop;
                    if (bottom >= e - 1e-6) continue;
                    const sideTop = shade(0.86 * light), sideBottom = shade(0.7 * light);
                    GridManager.pushQuad(out, [[px, e, pz], [qx, e, qz], [qx, bottom, qz], [px, bottom, pz]], normal,
                        [sideTop, sideTop, sideBottom, sideBottom]);
                }
            }
        }
        return out;
    }

    /**
     * Geometria da água das células [x0, x1) × [z0, z1): uma lâmina por célula do tamanho inteiro dela (topo no
     * nível plano do lago/rio, getWaterLevel, abaixo da margem) e laterais onde o vizinho é mais baixo. Além de positions/normals/colors/indices,
     * `cells` (vec4 por vértice: célula x, z, profundidade, 1 = topo que ondula) alimenta o shader da água.
     */
    buildWaterGeometry(x0, z0, x1, z1) {
        const out = { positions: [], normals: [], colors: [], indices: [], cells: [] };
        const cs = this.cellSize;
        const half = (this.gridSize * cs) / 2;
        const waterTop = (x, z) => this.getWaterLevel(x, z);
        for (let x = x0; x < x1; x++) {
            for (let z = z0; z < z1; z++) {
                if (this.getTerrainType(x, z) !== 'water') continue;
                const depth = this.getWaterDepth(x, z);
                const t = waterTop(x, z);
                // Mesma cor/transparência do material antigo por bloco: mais funda = mais escura e opaca
                const k = Math.min(1, depth / 0.5);
                const rgba = [0.15 + 0.1 * (1 - k), 0.45 + 0.11 * (1 - k), 0.8 + 0.2 * (1 - k), 0.6 + k * 0.2];
                const ax = x * cs - half, bx = ax + cs, az = z * cs - half, bz = az + cs;
                const start = out.positions.length / 3;
                GridManager.pushQuad(out, [[ax, t, az], [bx, t, az], [bx, t, bz], [ax, t, bz]], [0, 1, 0], [rgba, rgba, rgba, rgba]);
                const sides = [
                    [x, z - 1, [[bx, az], [ax, az]], [0, 0, -1]],
                    [x + 1, z, [[bx, bz], [bx, az]], [1, 0, 0]],
                    [x, z + 1, [[ax, bz], [bx, bz]], [0, 0, 1]],
                    [x - 1, z, [[ax, az], [ax, bz]], [-1, 0, 0]]
                ];
                for (const [nx, nz, [[px, pz], [qx, qz]], normal] of sides) {
                    const type = this.getTerrainType(nx, nz);
                    const bottom = type === 'unknown' ? 0.05 : type === 'water' ? waterTop(nx, nz) : this.getTerrainBlockHeight(nx, nz);
                    if (bottom >= t - 1e-6) continue;
                    GridManager.pushQuad(out, [[px, t, pz], [qx, t, qz], [qx, bottom, qz], [px, bottom, pz]], normal, [rgba, rgba, rgba, rgba]);
                }
                // Atributo do shader: só os 4 vértices do topo ondulam
                const count = out.positions.length / 3 - start;
                for (let i = 0; i < count; i++) out.cells.push(x, z, depth, i < 4 ? 1 : 0);
            }
        }
        return out;
    }

    /** Quad (4 cantos em ordem) com normal e cor por vértice ([r, g, b] ou [r, g, b, a]). */
    static pushQuad(out, corners, normal, colors) {
        const start = out.positions.length / 3;
        corners.forEach((p, i) => {
            out.positions.push(p[0], p[1], p[2]);
            out.normals.push(normal[0], normal[1], normal[2]);
            const col = colors[i];
            out.colors.push(col[0], col[1], col[2], col.length > 3 ? col[3] : 1);
        });
        // Ordem dos cantos: anti-horária vista de fora (de cima no topo) = face da frente no Babylon
        out.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }

    /** Normal (unitária) de um quad plano a partir dos 3 primeiros cantos, apontando para fora/cima. */
    static faceNormal(q) {
        const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]];
        const w = [q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]];
        let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        if (n[1] < 0) n = n.map(v => -v);
        const len = Math.hypot(n[0], n[1], n[2]) || 1;
        return n.map(v => v / len);
    }

    /** Pedaços do mapa (TERRAIN_CHUNK × TERRAIN_CHUNK células): poucos draw calls e o pick só testa o pedaço certo. */
    forEachChunk(fn) {
        const n = GridManager.TERRAIN_CHUNK;
        for (let x0 = 0; x0 < this.gridSize; x0 += n) {
            for (let z0 = 0; z0 < this.gridSize; z0 += n) {
                fn(x0, z0, Math.min(this.gridSize, x0 + n), Math.min(this.gridSize, z0 + n));
            }
        }
    }

    static toMesh(name, geometry, scene) {
        if (!geometry.indices.length) return null;
        const mesh = new BABYLON.Mesh(name, scene);
        const data = new BABYLON.VertexData();
        data.positions = geometry.positions;
        data.normals = geometry.normals;
        data.colors = geometry.colors;
        data.indices = geometry.indices;
        data.applyToMesh(mesh, false);
        return mesh;
    }

    createVoxelTerrainBlocks() {
        log('🧱 Criando blocos de terreno estilo voxel...');
        const material = new BABYLON.StandardMaterial('terrainBlocksMat', this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1); // a cor vem dos vértices
        material.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);
        this.terrainBlocksMaterial = material;

        this.terrainBlocks = [];
        this.forEachChunk((x0, z0, x1, z1) => {
            const mesh = GridManager.toMesh(`terrainBlocks_${x0}_${z0}`, this.buildTerrainGeometry(x0, z0, x1, z1), this.scene);
            if (!mesh) return;
            mesh.material = material;
            mesh.receiveShadows = true;
            mesh.metadata = { terrain: true };
            mesh.freezeWorldMatrix();
            this.terrainBlocks.push(mesh);
        });
        log(`🧱 Terreno: ${this.terrainBlocks.length} meshes`);
    }

    createWaterBodies() {
        log('💧 Criando água...');
        this.waterMeshes = [];
        this.forEachChunk((x0, z0, x1, z1) => {
            const geometry = this.buildWaterGeometry(x0, z0, x1, z1);
            // "water_": GameManager.pickTerrainCell reconhece a água pelo nome
            const mesh = GridManager.toMesh(`water_${x0}_${z0}`, geometry, this.scene);
            if (!mesh) return;
            mesh.setVerticesData('waterCell', geometry.cells, false, 4);
            mesh.hasVertexAlpha = true;
            mesh.receiveShadows = true;
            mesh.freezeWorldMatrix();
            this.waterMeshes.push(mesh);
        });
        this.setWaterAnimated(this.waterAnimated);
    }

    /**
     * Água animada (shader com ondas, um material para toda a água) ou simples (cor de vértice translúcida,
     * para a qualidade gráfica baixa). Pode trocar com o jogo rodando.
     */
    setWaterAnimated(animated) {
        this.waterAnimated = animated;
        if (!this.waterMeshes?.length) return;
        let material;
        if (animated) {
            if (!this.waterShaderMaterial) this.waterShaderMaterial = this.createWaterShaderMaterial();
            material = this.waterShaderMaterial;
        } else {
            if (!this.waterSimpleMaterial) {
                const simple = new BABYLON.StandardMaterial('waterSimpleMat', this.scene);
                simple.diffuseColor = new BABYLON.Color3(1, 1, 1);
                simple.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                this.waterSimpleMaterial = simple;
                this.setWaterPollution(this.waterPollution || 0);
            }
            material = this.waterSimpleMaterial;
        }
        this.waterMeshes.forEach(mesh => { mesh.material = material; });
    }

    createWaterShaderMaterial() {
        const shaderMaterial = new BABYLON.ShaderMaterial('waterShader', this.scene, {
            vertexSource: `
                precision highp float;
                attribute vec3 position;
                attribute vec3 normal;
                attribute vec4 waterCell; // célula x, z, profundidade, 1 = topo
                uniform mat4 worldViewProjection;
                uniform mat4 world;
                uniform float time;
                varying vec3 vNormal;
                varying vec3 vCell;

                void main() {
                    vec3 p = position;
                    float waveAmplitude = min(0.03, waterCell.z * 0.1);
                    float wave1 = sin(time + waterCell.x * 0.5 + waterCell.y * 0.3) * waveAmplitude;
                    float wave2 = cos(time * 1.3 + waterCell.x * 0.3 + waterCell.y * 0.5) * waveAmplitude * 0.5;
                    p.y += (wave1 + wave2) * waterCell.w;
                    vNormal = normalize(vec3(world * vec4(normal, 0.0)));
                    vCell = waterCell.xyz;
                    gl_Position = worldViewProjection * vec4(p, 1.0);
                }
            `,
            fragmentSource: `
                precision highp float;
                uniform float time;
                uniform float pollution; // 0 limpa, 1 suja (PollutionVisuals, poluição > 70%)
                varying vec3 vNormal;
                varying vec3 vCell;

                void main() {
                    float depth = vCell.z;
                    float depthFactor = min(1.0, depth / 0.5);
                    vec3 waterColor = vec3(
                        0.15 + (0.25 - 0.15) * (1.0 - depthFactor),
                        0.45 + (0.56 - 0.45) * (1.0 - depthFactor),
                        0.8 + (1.0 - 0.8) * (1.0 - depthFactor)
                    );
                    float alphaVariation = sin(time * 2.0 + vCell.x + vCell.y) * 0.1;
                    float alpha = 0.6 + depth * 0.2 + alphaVariation;
                    // Poluída: turva, verde-marrom e quase opaca, com manchas que se mexem devagar
                    float scum = 0.5 + 0.5 * sin(vCell.x * 1.7 + vCell.y * 2.3 + time * 0.4);
                    waterColor = mix(waterColor, vec3(0.4, 0.4, 0.16) + scum * 0.06, pollution * 0.9);
                    alpha = mix(alpha, 0.93, pollution * 0.7);
                    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
                    float diffuse = max(dot(vNormal, lightDir), 0.0);
                    gl_FragColor = vec4(waterColor * (0.6 + 0.4 * diffuse), alpha);
                }
            `
        }, {
            attributes: ['position', 'normal', 'waterCell'],
            uniforms: ['worldViewProjection', 'world', 'time', 'pollution'],
            needAlphaBlending: true
        });
        // Um material para toda a água: o tempo anda aqui (antes cada bloco tinha um clone que nunca recebia
        // o tempo, e a água ficava parada). performance.now: Date.now() * 0,001 perde precisão no float da GPU.
        this.waterTimeObserver = this.scene.onBeforeRenderObservable.add(() => {
            shaderMaterial.setFloat('time', performance.now() * 0.001);
        });
        shaderMaterial.setFloat('pollution', this.waterPollution || 0);
        return shaderMaterial;
    }

    /** Água suja com a poluição (PollutionVisuals): 0 = limpa, 1 = turva. Vale para os dois materiais. */
    setWaterPollution(level) {
        this.waterPollution = level;
        this.waterShaderMaterial?.setFloat('pollution', level);
        if (this.waterSimpleMaterial) {
            this.waterSimpleMaterial.diffuseColor = new BABYLON.Color3(1 - 0.38 * level, 1 - 0.42 * level, 1 - 0.64 * level);
        }
    }

    // Altura do bloco de terreno da célula (= topo dele, já que a base fica em y = 0).
    // Usada também para assentar os edifícios (BuildingMeshes.getTerrainHeightAt).
    getTerrainBlockHeight(gridX, gridZ, terrainType = this.getTerrainType(gridX, gridZ)) {
        // Obter elevação com verificação de bounds
        let elevation = 0;
        if (gridX >= 0 && gridX < this.gridSize && gridZ >= 0 && gridZ < this.gridSize) {
            if (this.elevationGrid[gridX] && this.elevationGrid[gridX][gridZ] !== undefined) {
                elevation = this.elevationGrid[gridX][gridZ];
            }
        }

        // Água: a superfície do lago/rio (prédios sobre a água ficam boiando nela, não afundados)
        if (terrainType === 'water' && this.terrainGrid?.length) return this.getWaterLevel(gridX, gridZ);
        const base = GridManager.TERRAIN_BASE;
        if (terrainType === 'hill') {
            // Colinas são significativamente mais altas
            return base + Math.max(0.8, elevation * 1.5 + 0.5);
        }
        if (terrainType === 'lowland') {
            // Planícies baixas são mais baixas
            return base + Math.max(0.05, elevation * 0.3 + 0.05);
        }
        // Pastagem e outros terrenos têm altura padrão
        return base + Math.max(0.1, elevation * 0.5 + 0.1);
    }

    // ===== CONVERSÕES DE COORDENADAS =====
    worldToGrid(worldPosition) {
        const halfSize = (this.gridSize * this.cellSize) / 2;
        const x = Math.floor((worldPosition.x + halfSize) / this.cellSize);
        const z = Math.floor((worldPosition.z + halfSize) / this.cellSize);
        
        return {
            x: Math.max(0, Math.min(this.gridSize - 1, x)),
            z: Math.max(0, Math.min(this.gridSize - 1, z))
        };
    }
    
    gridToWorld(gridX, gridZ) {
        const halfSize = (this.gridSize * this.cellSize) / 2;
        const x = (gridX * this.cellSize) - halfSize + (this.cellSize / 2);
        const z = (gridZ * this.cellSize) - halfSize + (this.cellSize / 2);

        // Verificar bounds e obter elevação com segurança
        let y = 0;
        if (gridX >= 0 && gridX < this.gridSize && gridZ >= 0 && gridZ < this.gridSize) {
            if (this.elevationGrid[gridX] && this.elevationGrid[gridX][gridZ] !== undefined) {
                y = this.elevationGrid[gridX][gridZ];
            }
        }

        return new BABYLON.Vector3(x, y, z);
    }
    
    // ===== OCUPAÇÃO =====
    isCellOccupied(gridX, gridZ) {
        if (gridX < 0 || gridX >= this.gridSize || gridZ < 0 || gridZ >= this.gridSize) {
            return true; // Fora dos limites = ocupado
        }

        // Verificar se o array existe antes de acessar
        if (this.occupationGrid[gridX] && this.occupationGrid[gridX][gridZ] !== undefined) {
            return this.occupationGrid[gridX][gridZ];
        }

        return false; // Célula não ocupada se não existe no grid
    }
    
    setCellOccupied(gridX, gridZ, occupied = true) {
        if (gridX >= 0 && gridX < this.gridSize && gridZ >= 0 && gridZ < this.gridSize) {
            this.occupationGrid[gridX][gridZ] = occupied;
            return true;
        }
        return false;
    }

    // Alias para compatibilidade
    isOccupied(gridX, gridZ) {
        return this.isCellOccupied(gridX, gridZ);
    }
    
    canPlaceBuilding(gridX, gridZ, buildingSize = 1) {
        // Verificar se todas as células necessárias estão livres
        for (let x = gridX; x < gridX + buildingSize; x++) {
            for (let z = gridZ; z < gridZ + buildingSize; z++) {
                if (this.isCellOccupied(x, z)) {
                    return false;
                }
                
                // Verificar tipo de terreno
                if (this.terrainGrid[x] && this.terrainGrid[x][z] === 'water') {
                    return false; // Não pode construir na água (exceto estruturas especiais)
                }
            }
        }
        return true;
    }
    
    occupyArea(gridX, gridZ, buildingSize = 1) {
        for (let x = gridX; x < gridX + buildingSize; x++) {
            for (let z = gridZ; z < gridZ + buildingSize; z++) {
                this.setCellOccupied(x, z, true);
            }
        }
    }
    
    freeArea(gridX, gridZ, buildingSize = 1) {
        for (let x = gridX; x < gridX + buildingSize; x++) {
            for (let z = gridZ; z < gridZ + buildingSize; z++) {
                this.setCellOccupied(x, z, false);
            }
        }
    }
    
    // ===== INFORMAÇÕES DO TERRENO =====
    
    getElevation(gridX, gridZ) {
        if (gridX >= 0 && gridX < this.gridSize && gridZ >= 0 && gridZ < this.gridSize) {
            if (this.elevationGrid[gridX] && this.elevationGrid[gridX][gridZ] !== undefined) {
                return this.elevationGrid[gridX][gridZ];
            }
        }
        return 0;
    }

    // ===== SAVE/LOAD =====
    getSaveData() {
        return {
            gridSize: this.gridSize,
            cellSize: this.cellSize,
            occupationGrid: this.occupationGrid,
            elevationGrid: this.elevationGrid,
            terrainGrid: this.terrainGrid
        };
    }
    
    loadData(data) {
        if (data) {
            this.occupationGrid = data.occupationGrid || this.occupationGrid;
            this.elevationGrid = data.elevationGrid || this.elevationGrid;
            this.terrainGrid = data.terrainGrid || this.terrainGrid;
        }
    }
    
    /**
     * Tamanho (em células) de cada corpo d'água ligado (vizinhos N/S/L/O). Puro: recebe a grade de terreno.
     * Devolve uma grade com o tamanho do corpo d'água em cada célula de água (0 em terra).
     */
    static measureWaterBodies(terrainGrid, size) {
        const sizes = Array.from({ length: size }, () => new Array(size).fill(0));
        const isWater = (x, z) => x >= 0 && z >= 0 && x < size && z < size && terrainGrid[x]?.[z] === 'water';
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                if (!isWater(x, z) || sizes[x][z]) continue;
                const cells = [[x, z]];
                sizes[x][z] = -1;
                for (let i = 0; i < cells.length; i++) {
                    const [cx, cz] = cells[i];
                    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = cx + dx, nz = cz + dz;
                        if (isWater(nx, nz) && !sizes[nx][nz]) { sizes[nx][nz] = -1; cells.push([nx, nz]); }
                    }
                }
                cells.forEach(([cx, cz]) => { sizes[cx][cz] = cells.length; });
            }
        }
        return sizes;
    }

    /** Quantas células tem o corpo d'água desta célula (0 se não é água). O terreno não muda na partida: cache. */
    getWaterBodySize(gridX, gridZ) {
        if (!this.waterBodySizes) this.waterBodySizes = GridManager.measureWaterBodies(this.terrainGrid, this.gridSize);
        return this.waterBodySizes[gridX]?.[gridZ] || 0;
    }

    getTerrainType(gridX, gridZ) {
        if (gridX < 0 || gridX >= this.gridSize || gridZ < 0 || gridZ >= this.gridSize) {
            return 'unknown';
        }

        // Verificar se o array existe antes de acessar
        if (this.terrainGrid[gridX] && this.terrainGrid[gridX][gridZ] !== undefined) {
            return this.terrainGrid[gridX][gridZ];
        }

        return 'grassland';
    }

    // ===== MATERIAIS E CORES =====
    createMultiTerrainMaterial() {
        log('🎨 Criando sistema de materiais multi-terreno estilo Minecraft...');

        // Criar material base com textura procedural
        this.terrainMaterial = new BABYLON.StandardMaterial("multiTerrainMaterial", this.scene);

        // Configurar propriedades básicas para estilo voxel
        this.terrainMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Menos brilho
        this.terrainMaterial.alpha = 1.0;
        this.terrainMaterial.backFaceCulling = false; // Para melhor visualização dos blocos

        // Criar textura procedural estilo Minecraft
        try {
            this.createMinecraftStyleTexture();
        } catch (error) {
            console.warn('⚠️ Não foi possível criar textura procedural, usando cor sólida');
            this.terrainMaterial.diffuseColor = this.getTerrainColor('dirt');
        }
    }

    createMinecraftStyleTexture() {
        log('🧱 Criando textura estilo Minecraft...');

        const textureSize = 256;
        const dynamicTexture = new BABYLON.DynamicTexture("minecraftTerrain", textureSize, this.scene);
        const context = dynamicTexture.getContext();

        // Criar padrão pixelado para diferentes tipos de terreno
        const imageData = context.createImageData(textureSize, textureSize);
        const data = imageData.data;

        const blockSize = 16; // Tamanho do bloco em pixels
        const blocksPerSide = textureSize / blockSize;

        for (let bx = 0; bx < blocksPerSide; bx++) {
            for (let bz = 0; bz < blocksPerSide; bz++) {
                // Determinar tipo de terreno para este bloco
                const terrainType = this.getBlockTerrainType(bx, bz, blocksPerSide);
                const baseColor = this.getMinecraftTerrainColor(terrainType);

                // Preencher bloco com variação de cor
                for (let px = 0; px < blockSize; px++) {
                    for (let pz = 0; pz < blockSize; pz++) {
                        const x = bx * blockSize + px;
                        const z = bz * blockSize + pz;
                        const index = (z * textureSize + x) * 4;

                        // Adicionar variação aleatória para textura
                        const variation = (Math.random() - 0.5) * 0.2;

                        data[index] = Math.max(0, Math.min(255, baseColor.r + variation * 255));     // R
                        data[index + 1] = Math.max(0, Math.min(255, baseColor.g + variation * 255)); // G
                        data[index + 2] = Math.max(0, Math.min(255, baseColor.b + variation * 255)); // B
                        data[index + 3] = 255; // A
                    }
                }
            }
        }

        context.putImageData(imageData, 0, 0);
        dynamicTexture.update();

        this.terrainMaterial.diffuseTexture = dynamicTexture;
        this.terrainMaterial.diffuseTexture.hasAlpha = false;
        this.terrainMaterial.diffuseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        this.terrainMaterial.diffuseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    }

    getBlockTerrainType(bx, bz, blocksPerSide) {
        // Mapear coordenadas do bloco para coordenadas do grid
        const gridX = Math.floor((bx / blocksPerSide) * this.gridSize);
        const gridZ = Math.floor((bz / blocksPerSide) * this.gridSize);

        if (gridX >= 0 && gridX < this.gridSize && gridZ >= 0 && gridZ < this.gridSize) {
            if (this.terrainGrid[gridX] && this.terrainGrid[gridX][gridZ] !== undefined) {
                return this.terrainGrid[gridX][gridZ];
            }
        }
        return 'dirt';
    }

    getTerrainColor(terrainType) {
        const colors = {
            'water': new BABYLON.Color3(0.25, 0.56, 1.0),      // #4169E1 - Azul real
            'lowland': new BABYLON.Color3(0.63, 0.32, 0.18),   // #A0522D - Marrom terra
            'grassland': new BABYLON.Color3(0.13, 0.55, 0.13), // #228B22 - Verde floresta
            'hill': new BABYLON.Color3(0.41, 0.41, 0.41),      // #696969 - Cinza escuro
            'mountain': new BABYLON.Color3(0.50, 0.50, 0.50),  // #808080 - Cinza
            'dirt': new BABYLON.Color3(0.55, 0.27, 0.07),      // #8B4513 - Marrom sela
            'rock': new BABYLON.Color3(0.41, 0.41, 0.41)       // #696969 - Cinza pedra
        };

        return colors[terrainType] || colors['dirt'];
    }

    getMinecraftTerrainColor(terrainType) {
        // Cores estilo Minecraft (valores RGB 0-255)
        const colors = {
            'water': { r: 64, g: 164, b: 223 },     // Azul água Minecraft
            'dirt': { r: 134, g: 96, b: 67 },       // Marrom terra Minecraft
            'rock': { r: 128, g: 128, b: 128 },     // Cinza pedra Minecraft
            'grassland': { r: 91, g: 153, b: 76 },  // Verde grama Minecraft
            'lowland': { r: 134, g: 96, b: 67 },    // Terra
            'hill': { r: 128, g: 128, b: 128 },     // Pedra
            'mountain': { r: 96, g: 96, b: 96 }     // Pedra escura
        };

        return colors[terrainType] || colors['dirt'];
    }

    // ===== LIMPEZA GERAL =====
    dispose() {
        [...(this.waterMeshes || []), ...(this.terrainBlocks || [])].forEach(mesh => {
            if (mesh && !mesh.isDisposed()) mesh.dispose();
        });
        this.waterMeshes = [];
        this.terrainBlocks = [];
        if (this.waterTimeObserver) this.scene.onBeforeRenderObservable.remove(this.waterTimeObserver);
        [this.waterShaderMaterial, this.waterSimpleMaterial, this.terrainBlocksMaterial].forEach(m => m?.dispose());
        if (this.terrainMesh) {
            this.terrainMesh.dispose();
            this.terrainMesh = null;
        }
        log('🗑️ GridManager disposed - terreno e água limpos');
    }
}

// Exportar para escopo global
window.GridManager = GridManager;
log('🗂️ GridManager carregado e exportado para window.GridManager');
