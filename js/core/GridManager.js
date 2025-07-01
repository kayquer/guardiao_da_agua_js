/**
 * GUARDIÃO DA ÁGUA - GRID MANAGER
 * Gerencia o sistema de grade 3D para posicionamento de estruturas
 */

class GridManager {
    constructor(scene) {
        console.log('🗂️ Inicializando GridManager...');
        
        this.scene = scene;
        this.gridSize = GAME_CONFIG.grid.size;
        this.cellSize = GAME_CONFIG.grid.cellSize;
        this.gridHeight = GAME_CONFIG.grid.height;
        
        // Grid de ocupação (true = ocupado, false = livre)
        this.occupationGrid = [];
        
        // Grid de elevação (altura do terreno)
        this.elevationGrid = [];
        
        // Grid de tipos de terreno
        this.terrainGrid = [];
        
        // Meshes visuais
        this.gridMesh = null;
        this.terrainMesh = null;
        this.waterMesh = null;
        
        // Materiais
        this.gridMaterial = null;
        this.terrainMaterial = null;
        this.waterMaterial = null;
        
        // Configurações visuais
        this.showGrid = true;
        this.gridOpacity = 0.3;
        
        this.initializeGrid();
        this.createVisualGrid();
        this.createTerrain();
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeGrid() {
        console.log(`🗂️ Criando grid ${this.gridSize}x${this.gridSize}...`);

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

        console.log('✅ Grid inicializado');
        console.log(`📊 Grid stats: ${this.gridSize}x${this.gridSize} = ${this.gridSize * this.gridSize} células`);
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

        // Criar lagos maiores com ruído de baixa frequência
        if (lakeNoise > 0.7 && terrainValue < 0.4) return 'water'; // Lagos grandes
        if (terrainValue < 0.2) return 'water';      // Corpos d'água menores
        if (terrainValue < 0.35) return 'grassland'; // Pastagem (ideal para construção)
        if (terrainValue < 0.5) return 'lowland';    // Planície baixa
        if (terrainValue < 0.65) return 'hill';      // Colinas
        if (terrainValue < 0.8) return 'grassland';  // Mais pastagem
        return 'hill';                                // Colinas altas
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
    createVisualGrid() {
        console.log('🎨 Criando grid visual...');
        
        // Material do grid
        this.gridMaterial = new BABYLON.StandardMaterial("gridMaterial", this.scene);
        this.gridMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        this.gridMaterial.alpha = this.gridOpacity;
        this.gridMaterial.wireframe = true;
        
        // Criar linhas do grid
        const lines = [];
        const halfSize = (this.gridSize * this.cellSize) / 2;
        
        // Linhas horizontais
        for (let i = 0; i <= this.gridSize; i++) {
            const z = (i * this.cellSize) - halfSize;
            lines.push([
                new BABYLON.Vector3(-halfSize, this.gridHeight, z),
                new BABYLON.Vector3(halfSize, this.gridHeight, z)
            ]);
        }
        
        // Linhas verticais
        for (let i = 0; i <= this.gridSize; i++) {
            const x = (i * this.cellSize) - halfSize;
            lines.push([
                new BABYLON.Vector3(x, this.gridHeight, -halfSize),
                new BABYLON.Vector3(x, this.gridHeight, halfSize)
            ]);
        }
        
        // Criar mesh das linhas
        this.gridMesh = BABYLON.MeshBuilder.CreateLineSystem("grid", {
            lines: lines
        }, this.scene);
        
        this.gridMesh.color = new BABYLON.Color3(0.8, 0.8, 0.8);
        this.gridMesh.alpha = this.gridOpacity;
    }
    
    createTerrain() {
        console.log('🏔️ Criando terreno procedural...');

        try {
            // Criar terreno com subdivisões suficientes para detalhes
            this.terrainMesh = BABYLON.MeshBuilder.CreateGround("terrain", {
                width: this.gridSize * this.cellSize,
                height: this.gridSize * this.cellSize,
                subdivisions: this.gridSize * 2 // Mais subdivisões para melhor qualidade
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

    applyElevationToTerrain() {
        if (!this.terrainMesh) return;

        console.log('🏔️ Aplicando elevação ao terreno...');

        try {
            // Obter dados dos vértices
            const positions = this.terrainMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            if (!positions) {
                console.warn('⚠️ Não foi possível obter posições dos vértices');
                return;
            }

            // Calcular dimensões do grid de vértices
            const subdivisions = this.gridSize;
            const verticesPerSide = subdivisions + 1;
            const terrainWidth = this.gridSize * this.cellSize;
            const terrainHeight = this.gridSize * this.cellSize;

            // Aplicar elevação a cada vértice
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const z = positions[i + 2];

                // Converter coordenadas do mundo para grid
                const gridX = Math.floor(((x + terrainWidth / 2) / terrainWidth) * this.gridSize);
                const gridZ = Math.floor(((z + terrainHeight / 2) / terrainHeight) * this.gridSize);

                // Garantir que estamos dentro dos limites
                const clampedX = Math.max(0, Math.min(this.gridSize - 1, gridX));
                const clampedZ = Math.max(0, Math.min(this.gridSize - 1, gridZ));

                // Aplicar elevação
                if (this.elevationGrid[clampedX] && this.elevationGrid[clampedX][clampedZ] !== undefined) {
                    positions[i + 1] = this.elevationGrid[clampedX][clampedZ] * 2; // Y position (altura)
                }
            }

            // Atualizar mesh com novas posições
            this.terrainMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);

            // Recalcular normais para iluminação correta
            this.terrainMesh.createNormals(true);

            console.log('✅ Elevação aplicada ao terreno');

        } catch (error) {
            console.error('❌ Erro ao aplicar elevação:', error);
        }
    }
    
    createWaterBodies() {
        console.log('💧 Criando corpos d\'água estilo Minecraft...');

        // Encontrar áreas de água e criar blocos individuais
        this.waterMeshes = [];
        this.waterAnimationInitialized = false;

        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                if (this.terrainGrid[x][z] === 'water') {
                    this.createWaterBlock(x, z);
                }
            }
        }

        // Inicializar animação centralizada após criar todos os blocos
        if (this.waterMeshes.length > 0) {
            this.initializeWaterAnimation();
        }
    }

    createWaterBlock(gridX, gridZ) {
        const worldPos = this.gridToWorld(gridX, gridZ);
        const elevation = this.elevationGrid[gridX][gridZ];

        // Calcular profundidade da água baseada na elevação
        const waterDepth = Math.max(0.2, 0.5 - elevation * 0.8);

        // Criar bloco de água estilo Minecraft com profundidade variável
        const waterBlock = BABYLON.MeshBuilder.CreateBox(`water_${gridX}_${gridZ}`, {
            width: this.cellSize * 0.98,
            height: waterDepth,
            depth: this.cellSize * 0.98
        }, this.scene);

        waterBlock.position = worldPos;
        waterBlock.position.y = waterDepth / 2 + 0.05; // Posicionar baseado na profundidade

        // Material de água melhorado com efeitos de profundidade
        const waterMaterial = new BABYLON.StandardMaterial(`waterMat_${gridX}_${gridZ}`, this.scene);

        // Cor baseada na profundidade - água mais profunda é mais escura
        const depthFactor = Math.min(1, waterDepth / 0.5);
        waterMaterial.diffuseColor = new BABYLON.Color3(
            0.15 + (0.25 - 0.15) * (1 - depthFactor), // Azul mais escuro para água profunda
            0.45 + (0.56 - 0.45) * (1 - depthFactor),
            0.8 + (1.0 - 0.8) * (1 - depthFactor)
        );

        // Transparência baseada na profundidade
        waterMaterial.alpha = 0.6 + depthFactor * 0.2;
        waterMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 1.0);
        waterMaterial.specularPower = 64; // Reflexos mais nítidos

        // Adicionar reflexão se disponível
        if (this.scene.environmentTexture) {
            waterMaterial.reflectionTexture = this.scene.environmentTexture;
            waterMaterial.reflectionFresnelParameters = new BABYLON.FresnelParameters();
            waterMaterial.reflectionFresnelParameters.bias = 0.1;
            waterMaterial.reflectionFresnelParameters.power = 0.5;
            waterMaterial.reflectionFresnelParameters.leftColor = BABYLON.Color3.White();
            waterMaterial.reflectionFresnelParameters.rightColor = BABYLON.Color3.Black();
        }

        // Armazenar dados para animação centralizada
        waterBlock.animationData = {
            gridX: gridX,
            gridZ: gridZ,
            baseY: waterDepth / 2 + 0.05,
            depth: waterDepth
        };

        waterBlock.material = waterMaterial;
        this.waterMeshes.push(waterBlock);
    }

    // Inicializar animação centralizada de água (chamado uma vez)
    initializeWaterAnimation() {
        if (this.waterAnimationInitialized) return;

        this.scene.registerBeforeRender(() => {
            const time = Date.now() * 0.001;

            // Animar todos os blocos de água de uma vez
            this.waterMeshes.forEach(waterBlock => {
                if (waterBlock && !waterBlock.isDisposed() && waterBlock.animationData) {
                    const { gridX, gridZ, baseY, depth } = waterBlock.animationData;

                    // Ondas mais suaves baseadas na profundidade
                    const waveAmplitude = Math.min(0.03, depth * 0.1);
                    const wave1 = Math.sin(time + gridX * 0.5 + gridZ * 0.3) * waveAmplitude;
                    const wave2 = Math.cos(time * 1.3 + gridX * 0.3 + gridZ * 0.5) * waveAmplitude * 0.5;

                    waterBlock.position.y = baseY + wave1 + wave2;

                    // Animar transparência para simular movimento da água
                    if (waterBlock.material && waterBlock.material.alpha) {
                        const alphaVariation = Math.sin(time * 2 + gridX + gridZ) * 0.1;
                        const baseAlpha = 0.6 + depth * 0.2;
                        waterBlock.material.alpha = baseAlpha + alphaVariation;
                    }
                }
            });
        });

        this.waterAnimationInitialized = true;
    }

    createVoxelTerrainBlocks() {
        console.log('🧱 Criando blocos de terreno estilo voxel...');

        this.terrainBlocks = [];
        this.decorationMeshes = [];

        // Criar blocos individuais para áreas não-água
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const terrainType = this.terrainGrid[x][z];

                if (terrainType !== 'water') {
                    this.createTerrainBlock(x, z, terrainType);
                }
            }
        }

        // Criar decorações após os blocos de terreno
        this.createTerrainDecorations();
    }

    createTerrainBlock(gridX, gridZ, terrainType) {
        const worldPos = this.gridToWorld(gridX, gridZ);
        const elevation = this.elevationGrid[gridX][gridZ];

        // Criar bloco de terreno
        const blockHeight = Math.max(0.1, elevation * 0.5 + 0.1);

        const terrainBlock = BABYLON.MeshBuilder.CreateBox(`terrain_${gridX}_${gridZ}`, {
            width: this.cellSize * 0.98,
            height: blockHeight,
            depth: this.cellSize * 0.98
        }, this.scene);

        terrainBlock.position = worldPos;
        terrainBlock.position.y = blockHeight / 2;

        // Material baseado no tipo de terreno
        const material = new BABYLON.StandardMaterial(`terrainBlockMat_${terrainType}_${gridX}_${gridZ}`, this.scene);
        const color = this.getMinecraftTerrainColor(terrainType);
        material.diffuseColor = new BABYLON.Color3(color.r / 255, color.g / 255, color.b / 255);
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Adicionar variação de cor para realismo
        const variation = (Math.random() - 0.5) * 0.1;
        material.diffuseColor.r = Math.max(0, Math.min(1, material.diffuseColor.r + variation));
        material.diffuseColor.g = Math.max(0, Math.min(1, material.diffuseColor.g + variation));
        material.diffuseColor.b = Math.max(0, Math.min(1, material.diffuseColor.b + variation));

        terrainBlock.material = material;
        terrainBlock.receiveShadows = true;

        // Metadados para identificação
        terrainBlock.metadata = {
            terrain: true,
            terrainType: terrainType,
            gridX: gridX,
            gridZ: gridZ
        };

        this.terrainBlocks.push(terrainBlock);
    }

    // ===== SISTEMA DE DECORAÇÃO =====
    createTerrainDecorations() {
        console.log('🌿 Criando decorações do terreno...');

        // Criar decorações apenas em terreno de terra/grama
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const terrainType = this.terrainGrid[x][z];

                // Não decorar área da cidade inicial
                if (x >= 5 && x <= 16 && z >= 5 && z <= 16) continue;

                // Apenas decorar terreno de terra
                if (terrainType === 'dirt') {
                    this.createRandomDecoration(x, z);
                }
            }
        }
    }

    createRandomDecoration(gridX, gridZ) {
        // Chance de ter decoração (30%)
        if (Math.random() > 0.3) return;

        // Verificar se está próximo à água para diferentes tipos de vegetação
        const nearWater = this.isNearWater(gridX, gridZ);

        // Escolher tipo de decoração baseado na proximidade com água
        let decorationType;
        const rand = Math.random();

        if (nearWater) {
            // Vegetação aquática
            if (rand < 0.4) decorationType = 'reeds';
            else if (rand < 0.7) decorationType = 'water_grass';
            else decorationType = 'small_tree';
        } else {
            // Vegetação terrestre
            if (rand < 0.3) decorationType = 'grass_patch';
            else if (rand < 0.5) decorationType = 'flowers';
            else if (rand < 0.8) decorationType = 'bush';
            else decorationType = 'tree';
        }

        this.createDecorationMesh(gridX, gridZ, decorationType);
    }

    isNearWater(gridX, gridZ) {
        // Verificar células adjacentes para água
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                const checkX = gridX + dx;
                const checkZ = gridZ + dz;

                if (checkX >= 0 && checkX < this.gridSize &&
                    checkZ >= 0 && checkZ < this.gridSize) {
                    if (this.terrainGrid[checkX][checkZ] === 'water') {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    createDecorationMesh(gridX, gridZ, decorationType) {
        const worldPos = this.gridToWorld(gridX, gridZ);
        const terrainHeight = Math.max(0.1, this.elevationGrid[gridX][gridZ] * 0.5 + 0.1);

        let decoration;

        switch (decorationType) {
            case 'grass_patch':
                decoration = this.createGrassPatch(gridX, gridZ);
                break;
            case 'flowers':
                decoration = this.createFlowers(gridX, gridZ);
                break;
            case 'bush':
                decoration = this.createBush(gridX, gridZ);
                break;
            case 'tree':
                decoration = this.createTree(gridX, gridZ);
                break;
            case 'small_tree':
                decoration = this.createSmallTree(gridX, gridZ);
                break;
            case 'reeds':
                decoration = this.createReeds(gridX, gridZ);
                break;
            case 'water_grass':
                decoration = this.createWaterGrass(gridX, gridZ);
                break;
        }

        if (decoration) {
            decoration.position.x = worldPos.x;
            decoration.position.z = worldPos.z;
            decoration.position.y = terrainHeight;

            // Adicionar variação na rotação
            decoration.rotation.y = Math.random() * Math.PI * 2;

            // Metadados para identificação
            decoration.metadata = {
                decoration: true,
                decorationType: decorationType,
                gridX: gridX,
                gridZ: gridZ
            };

            this.decorationMeshes.push(decoration);
        }
    }

    // ===== CRIAÇÃO DE DECORAÇÕES ESPECÍFICAS =====
    createGrassPatch(gridX, gridZ) {
        // Pequenos tufos de grama
        const grass = BABYLON.MeshBuilder.CreateBox(`grass_${gridX}_${gridZ}`, {
            width: 0.3, height: 0.2, depth: 0.3
        }, this.scene);

        const material = new BABYLON.StandardMaterial(`grassMat_${gridX}_${gridZ}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.1);
        material.alpha = 0.8;
        grass.material = material;

        return grass;
    }

    createFlowers(gridX, gridZ) {
        // Pequenas flores coloridas
        const flower = BABYLON.MeshBuilder.CreateCylinder(`flower_${gridX}_${gridZ}`, {
            height: 0.3, diameterTop: 0.1, diameterBottom: 0.05
        }, this.scene);

        const material = new BABYLON.StandardMaterial(`flowerMat_${gridX}_${gridZ}`, this.scene);
        const colors = [
            new BABYLON.Color3(1, 0.2, 0.2), // Vermelho
            new BABYLON.Color3(1, 1, 0.2),   // Amarelo
            new BABYLON.Color3(0.8, 0.2, 1), // Roxo
            new BABYLON.Color3(1, 0.6, 0.8)  // Rosa
        ];
        material.diffuseColor = colors[Math.floor(Math.random() * colors.length)];
        flower.material = material;

        return flower;
    }

    createBush(gridX, gridZ) {
        // Arbusto pequeno
        const bush = BABYLON.MeshBuilder.CreateSphere(`bush_${gridX}_${gridZ}`, {
            diameter: 0.6
        }, this.scene);
        bush.scaling.y = 0.7; // Achatar um pouco

        const material = new BABYLON.StandardMaterial(`bushMat_${gridX}_${gridZ}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.15, 0.4, 0.1);
        bush.material = material;

        return bush;
    }

    createTree(gridX, gridZ) {
        // Árvore com tronco e copa
        const trunk = BABYLON.MeshBuilder.CreateCylinder(`trunk_${gridX}_${gridZ}`, {
            height: 1.2, diameter: 0.2
        }, this.scene);

        const crown = BABYLON.MeshBuilder.CreateSphere(`crown_${gridX}_${gridZ}`, {
            diameter: 1.0
        }, this.scene);
        crown.position.y = 1.0;

        // Materiais
        const trunkMaterial = new BABYLON.StandardMaterial(`trunkMat_${gridX}_${gridZ}`, this.scene);
        trunkMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        trunk.material = trunkMaterial;

        const crownMaterial = new BABYLON.StandardMaterial(`crownMat_${gridX}_${gridZ}`, this.scene);
        crownMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.5, 0.1);
        crown.material = crownMaterial;

        // Combinar meshes
        const tree = BABYLON.Mesh.MergeMeshes([trunk, crown]);
        tree.name = `tree_${gridX}_${gridZ}`;

        return tree;
    }

    createSmallTree(gridX, gridZ) {
        // Árvore menor para perto da água
        const trunk = BABYLON.MeshBuilder.CreateCylinder(`smallTrunk_${gridX}_${gridZ}`, {
            height: 0.8, diameter: 0.15
        }, this.scene);

        const crown = BABYLON.MeshBuilder.CreateSphere(`smallCrown_${gridX}_${gridZ}`, {
            diameter: 0.7
        }, this.scene);
        crown.position.y = 0.6;

        // Materiais
        const trunkMaterial = new BABYLON.StandardMaterial(`smallTrunkMat_${gridX}_${gridZ}`, this.scene);
        trunkMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        trunk.material = trunkMaterial;

        const crownMaterial = new BABYLON.StandardMaterial(`smallCrownMat_${gridX}_${gridZ}`, this.scene);
        crownMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2);
        crown.material = crownMaterial;

        // Combinar meshes
        const tree = BABYLON.Mesh.MergeMeshes([trunk, crown]);
        tree.name = `smallTree_${gridX}_${gridZ}`;

        return tree;
    }

    createReeds(gridX, gridZ) {
        // Juncos para perto da água
        const reed = BABYLON.MeshBuilder.CreateCylinder(`reed_${gridX}_${gridZ}`, {
            height: 0.8, diameterTop: 0.02, diameterBottom: 0.05
        }, this.scene);

        const material = new BABYLON.StandardMaterial(`reedMat_${gridX}_${gridZ}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.2);
        reed.material = material;

        return reed;
    }

    createWaterGrass(gridX, gridZ) {
        // Grama aquática
        const grass = BABYLON.MeshBuilder.CreateBox(`waterGrass_${gridX}_${gridZ}`, {
            width: 0.2, height: 0.4, depth: 0.2
        }, this.scene);

        const material = new BABYLON.StandardMaterial(`waterGrassMat_${gridX}_${gridZ}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.2, 0.7, 0.3);
        material.alpha = 0.9;
        grass.material = material;

        return grass;
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
        const y = this.elevationGrid[gridX][gridZ];
        
        return new BABYLON.Vector3(x, y, z);
    }
    
    // ===== OCUPAÇÃO =====
    isCellOccupied(gridX, gridZ) {
        if (gridX < 0 || gridX >= this.gridSize || gridZ < 0 || gridZ >= this.gridSize) {
            return true; // Fora dos limites = ocupado
        }
        return this.occupationGrid[gridX][gridZ];
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
            return this.elevationGrid[gridX][gridZ];
        }
        return 0;
    }
    
    // ===== VISUALIZAÇÃO =====
    toggleGridVisibility() {
        this.showGrid = !this.showGrid;
        if (this.gridMesh) {
            this.gridMesh.setEnabled(this.showGrid);
        }
    }
    
    setGridOpacity(opacity) {
        this.gridOpacity = Math.max(0, Math.min(1, opacity));
        if (this.gridMesh) {
            this.gridMesh.alpha = this.gridOpacity;
        }
    }
    
    highlightCell(gridX, gridZ, color = new BABYLON.Color3(1, 1, 0)) {
        // TODO: Implementar highlight de célula
    }
    
    clearHighlights() {
        // TODO: Implementar limpeza de highlights
    }
    
    // ===== UTILITÁRIOS =====
    getGridInfo() {
        let occupiedCells = 0;
        let waterCells = 0;
        
        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                if (this.occupationGrid[x][z]) occupiedCells++;
                if (this.terrainGrid[x][z] === 'water') waterCells++;
            }
        }
        
        return {
            totalCells: this.gridSize * this.gridSize,
            occupiedCells,
            freeCells: (this.gridSize * this.gridSize) - occupiedCells,
            waterCells,
            landCells: (this.gridSize * this.gridSize) - waterCells,
            occupationPercentage: (occupiedCells / (this.gridSize * this.gridSize)) * 100
        };
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
    
    getTerrainType(gridX, gridZ) {
        if (gridX < 0 || gridX >= this.gridSize || gridZ < 0 || gridZ >= this.gridSize) {
            return 'unknown';
        }

        return this.terrainGrid[gridX][gridZ] || 'grassland';
    }

    // ===== CLEANUP =====
    dispose() {
        if (this.gridMesh) this.gridMesh.dispose();
        if (this.terrainMesh) this.terrainMesh.dispose();
        if (this.waterMesh) this.waterMesh.dispose();
        if (this.gridMaterial) this.gridMaterial.dispose();
        if (this.terrainMaterial) this.terrainMaterial.dispose();
        if (this.waterMaterial) this.waterMaterial.dispose();

        console.log('🗑️ GridManager disposed');
    }

    // ===== MATERIAIS E CORES =====
    createMultiTerrainMaterial() {
        console.log('🎨 Criando sistema de materiais multi-terreno estilo Minecraft...');

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
        console.log('🧱 Criando textura estilo Minecraft...');

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
            return this.terrainGrid[gridX][gridZ];
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

    createTerrainTexture() {
        // Criar textura procedural simples para dar mais realismo
        const textureSize = 512;
        const dynamicTexture = new BABYLON.DynamicTexture("terrainTexture", textureSize, this.scene);

        // Preencher com padrão de grama
        const context = dynamicTexture.getContext();
        const imageData = context.createImageData(textureSize, textureSize);

        for (let i = 0; i < imageData.data.length; i += 4) {
            // Adicionar variação sutil na cor da grama
            const variation = (Math.random() - 0.5) * 0.1;
            imageData.data[i] = Math.max(0, Math.min(255, (34 + variation * 255))); // R
            imageData.data[i + 1] = Math.max(0, Math.min(255, (139 + variation * 255))); // G
            imageData.data[i + 2] = Math.max(0, Math.min(255, (34 + variation * 255))); // B
            imageData.data[i + 3] = 255; // A
        }

        context.putImageData(imageData, 0, 0);
        dynamicTexture.update();

        this.terrainMaterial.diffuseTexture = dynamicTexture;
        this.terrainMaterial.diffuseTexture.uOffset = 0;
        this.terrainMaterial.diffuseTexture.vOffset = 0;
        this.terrainMaterial.diffuseTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
        this.terrainMaterial.diffuseTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    }

    // ===== LIMPEZA DE DECORAÇÕES =====
    clearDecorationsInArea(gridX, gridZ, size = 1) {
        // Remove decorações em uma área específica (para construção)
        const decorationsToRemove = [];

        this.decorationMeshes.forEach((decoration, index) => {
            if (decoration.metadata && decoration.metadata.decoration) {
                const decX = decoration.metadata.gridX;
                const decZ = decoration.metadata.gridZ;

                // Verificar se a decoração está na área
                if (decX >= gridX && decX < gridX + size &&
                    decZ >= gridZ && decZ < gridZ + size) {
                    decoration.dispose();
                    decorationsToRemove.push(index);
                }
            }
        });

        // Remover das arrays (em ordem reversa para não afetar índices)
        decorationsToRemove.reverse().forEach(index => {
            this.decorationMeshes.splice(index, 1);
        });
    }

    // ===== LIMPEZA GERAL =====
    dispose() {
        // Limpar meshes de água
        if (this.waterMeshes) {
            this.waterMeshes.forEach(mesh => {
                if (mesh && !mesh.isDisposed()) {
                    mesh.dispose();
                }
            });
            this.waterMeshes = [];
        }

        // Limpar blocos de terreno
        if (this.terrainBlocks) {
            this.terrainBlocks.forEach(block => {
                if (block && !block.isDisposed()) {
                    block.dispose();
                }
            });
            this.terrainBlocks = [];
        }

        // Limpar decorações
        if (this.decorationMeshes) {
            this.decorationMeshes.forEach(decoration => {
                if (decoration && !decoration.isDisposed()) {
                    decoration.dispose();
                }
            });
            this.decorationMeshes = [];
        }

        // Limpar mesh principal do terreno
        if (this.terrainMesh) {
            this.terrainMesh.dispose();
            this.terrainMesh = null;
        }

        console.log('🗑️ GridManager disposed - Terreno e decorações limpos');
    }
}

// Exportar para escopo global
window.GridManager = GridManager;
console.log('🗂️ GridManager carregado e exportado para window.GridManager');
