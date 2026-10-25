/**
 * BuildingSystem — Modelos .glb dos prédios (tabela em js/data/buildingModels.js)
 * Parte da classe BuildingSystem (js/systems/BuildingSystem.js), anexada via mixin(): use this.* normalmente.
 *
 * Como funciona:
 * 1. Cada arquivo .glb é baixado UMA vez (fetch + LoadAssetContainerAsync, cache em modelFiles). A geometria
 *    vira um VertexData já no espaço do Babylon (transformações do glTF aplicadas), com a cor de cada
 *    material gravada como cor de vértice, e a textura (colormap da Kenney) é guardada; o resto do
 *    container é descartado.
 * 2. Para cada TIPO de prédio sai um modelo-base escondido (modelTemplates), já encaixado na área do
 *    prédio pela caixa envolvente: base no chão, centro na área, maior lado = BUILDING_MODEL_FILL do size.
 *    Nunca descarte o modelo-base: os prédios compartilham a geometria dele.
 * 3. Cada prédio é um clone do modelo-base (geometria compartilhada, um mesh só, sem filhos) com material
 *    próprio (metadata.perBuilding), como o procedural — obra, falta de energia e destaque mexem no
 *    material de um prédio só.
 * 4. Enquanto o arquivo carrega, ou se ele falhar, o prédio usa o mesh procedural; quando o modelo fica
 *    pronto, swapBuildingMeshForModel troca o mesh dos prédios daquele tipo que já estão no mapa.
 * 5. Partes que giram: nós do .glb chamados "pas_N" (rotor, eixo do cubo) ou "gira_N" (em pé) NÃO entram no
 *    mesh único: viram filhos do modelo-base (pivô no lugar, eixo em metadata.spinAxis), clonados junto com
 *    ele, e updateAnimatedParts os gira enquanto o prédio funciona (BuildingModels.ANIMATED_NODE).
 */
mixin(BuildingSystem, {
    /** Entrada da tabela de modelos para o tipo, ou null (sem modelo → procedural). */
    getBuildingModelEntry(typeId) {
        if (typeof BUILDING_MODELS === 'undefined') return null;
        return BUILDING_MODELS[typeId] || null;
    },

    /** Há algum .glb baixando agora? (usado por testes e pelo script de screenshots) */
    hasPendingBuildingModels() {
        return (this.modelLoadsInFlight || 0) > 0;
    },

    /**
     * Mesh do prédio a partir do modelo, se o tipo tem modelo e ele já está pronto. Senão pede o
     * carregamento (uma vez) e devolve null — quem chamou usa o procedural.
     */
    createBuildingModelMesh(buildingType) {
        const entry = this.getBuildingModelEntry(buildingType.id);
        if (!entry) return null;

        const template = this.modelTemplates?.get(buildingType.id);
        if (!template) {
            this.requestBuildingModel(buildingType);
            return null;
        }

        const mesh = template.clone(`${buildingType.id}_model`);
        mesh.setEnabled(true);
        mesh.isVisible = true;
        mesh.isPickable = true;
        // clone() leva as partes animadas (filhas do modelo-base): em vez de uma cópia, um pedaço que gira por prédio
        mesh.animatedParts = this.collectAnimatedParts(mesh);

        // Material próprio por prédio, com a textura compartilhada (liberado em performDisposal)
        const base = template.material;
        const material = new BABYLON.StandardMaterial(`buildingModelMat_${buildingType.id}_${mesh.uniqueId}`, this.scene);
        material.diffuseColor = base.diffuseColor.clone();
        material.specularColor = base.specularColor.clone();
        material.emissiveColor = base.emissiveColor.clone();
        material.diffuseTexture = base.diffuseTexture;
        material.backFaceCulling = false;
        material.metadata = { perBuilding: true };
        mesh.material = material;
        mesh.animatedParts.forEach(part => { part.mesh.material = material; });

        mesh.metadata = { ...(mesh.metadata || {}), fromModel: true, modelFile: entry.file };
        return mesh;
    },

    /**
     * Fantasma da prévia de posicionamento a partir do modelo (mesma geometria/escala do prédio final),
     * ou null se o tipo não tem modelo ou ele ainda não carregou (o pedido de carga sai aqui, então
     * escolher o prédio no menu já adianta o .glb para a obra). Material próprio, translúcido, com a
     * textura compartilhada do modelo-base — quem descarta a prévia libera o material, nunca a textura.
     */
    createBuildingModelPreviewMesh(buildingType) {
        if (!this.getBuildingModelEntry(buildingType.id)) return null;
        const template = this.modelTemplates?.get(buildingType.id);
        if (!template) {
            this.requestBuildingModel(buildingType);
            return null;
        }

        const mesh = template.clone(`preview_${buildingType.id}_model`);
        mesh.setEnabled(true);
        mesh.isVisible = true;
        mesh.isPickable = false;

        const material = new BABYLON.StandardMaterial(`previewModelMat_${buildingType.id}_${mesh.uniqueId}`, this.scene);
        material.diffuseTexture = template.material.diffuseTexture;
        material.specularColor = new BABYLON.Color3(0, 0, 0);
        material.backFaceCulling = false;
        // Translúcido sem ver as faces de dentro do modelo umas por cima das outras
        material.needDepthPrePass = true;
        material.metadata = { preview: true };
        mesh.material = material;
        this.collectAnimatedParts(mesh).forEach(part => { part.mesh.material = material; });

        mesh.metadata = { preview: true, fromModel: true, buildingType: buildingType.id };
        return mesh;
    },

    /** O modelo do tipo ficou pronto com a prévia dele na tela: troca o fantasma procedural pelo modelo. */
    upgradePreviewToModel(typeId) {
        if (!this.previewMode || this.selectedBuildingType !== typeId) return;
        if (!this.previewMesh || this.previewMesh.metadata?.fromModel) return;
        const last = this.lastPreviewPosition;
        this.disposePreviewMesh();
        this.createPreviewMesh(typeId);
        if (last && last.x >= 0) {
            this.lastPreviewPosition = { x: -1, z: -1 };
            this.updatePreview(last.x, last.z);
        }
    },

    /** Começa a carregar o modelo do tipo (se ainda não começou) e troca os prédios quando ficar pronto. */
    requestBuildingModel(buildingType) {
        const entry = this.getBuildingModelEntry(buildingType.id);
        if (!entry) return;
        if (!this.modelTemplates) this.modelTemplates = new Map();
        if (!this.modelRequests) this.modelRequests = new Set();
        if (this.modelTemplates.has(buildingType.id) || this.modelRequests.has(buildingType.id)) return;
        this.modelRequests.add(buildingType.id);

        const scene = this.scene;
        this.loadBuildingModelFile(entry.file).then(data => {
            if (!data || this.scene !== scene || scene.isDisposed) return;
            const template = this.createBuildingModelTemplate(buildingType, entry, data);
            this.modelTemplates.set(buildingType.id, template);
            this.upgradeBuildingsToModel(buildingType.id);
            this.upgradePreviewToModel(buildingType.id);
        }).catch(error => {
            console.warn(`⚠️ Modelo de ${buildingType.id} indisponível, mantendo o procedural:`, error?.message || error);
        });
    },

    /**
     * Baixa e lê um .glb uma vez só (promessa em cache por arquivo). Resolve com
     * { vertexData, texture } ou null se falhar (o aviso sai uma vez por arquivo).
     */
    loadBuildingModelFile(file) {
        if (!this.modelFiles) this.modelFiles = new Map();
        if (this.modelFiles.has(file)) return this.modelFiles.get(file);

        const scene = this.scene;
        const folder = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
        const rootUrl = `models/buildings/${folder}`;
        const url = `models/buildings/${file.split('/').map(encodeURIComponent).join('/')}`;

        this.modelLoadsInFlight = (this.modelLoadsInFlight || 0) + 1;
        const promise = (async () => {
            try {
                // fetch próprio: erro de rede vira um aviso nosso (o SceneLoader registraria console.error)
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);
                const buffer = await response.arrayBuffer();
                if (this.scene !== scene || scene.isDisposed) return null;

                // O jogo tem a própria tela de carregamento: sem o overlay padrão do Babylon sobre o canvas
                BABYLON.SceneLoader.ShowLoadingScreen = false;
                const container = await BABYLON.LoadAssetContainerAsync(new Uint8Array(buffer), scene, {
                    pluginExtension: '.glb',
                    rootUrl
                });
                if (this.scene !== scene || scene.isDisposed) {
                    container.dispose();
                    return null;
                }
                const data = this.extractBuildingModelData(container);
                log(`🏠 Modelo carregado: ${file} (${data.vertexData.indices.length / 3} triângulos)`);
                return data;
            } catch (error) {
                console.warn(`⚠️ Não foi possível carregar o modelo ${file}; prédios usam o mesh procedural.`, error?.message || error);
                return null;
            } finally {
                this.modelLoadsInFlight--;
            }
        })();
        this.modelFiles.set(file, promise);
        return promise;
    },

    /**
     * Junta as malhas do container num VertexData no espaço do Babylon (transformações aplicadas),
     * grava a cor base de cada material como cor de vértice e guarda a textura; descarta o resto.
     * Nós animados (pas_N / gira_N) saem à parte em `animated`: { name, vertexData (relativo ao pivô), pivot, axis }.
     */
    extractBuildingModelData(container) {
        const computeWorld = node => {
            if (node.parent) computeWorld(node.parent);
            node.computeWorldMatrix(true);
        };
        const animatedOf = node => {
            // o nó mais alto com o nome (um nó de várias cores vira "pas_1" + filhos "pas_1_primitive0/1")
            let found = null;
            for (let n = node; n; n = n.parent) if (BuildingSystem.ANIMATED_NODE.test(n.name || '')) found = n;
            return found;
        };

        const parts = [];
        const animatedGroups = new Map(); // nó animado → partes (VertexData no mundo)
        let texture = null;
        let anyColor = false;
        container.meshes.forEach(mesh => {
            if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0) return;
            computeWorld(mesh);
            const vd = BABYLON.VertexData.ExtractFromMesh(mesh, true, true);
            vd.tangents = null;
            vd.transform(mesh.getWorldMatrix());

            const material = mesh.material;
            texture = texture || material?.albedoTexture || material?.diffuseTexture || null;
            // glTF guarda a cor base em espaço linear; o StandardMaterial trabalha em gama
            const base = material?.albedoColor || material?.diffuseColor;
            const color = base ? base.toGammaSpace() : new BABYLON.Color3(1, 1, 1);
            const vertexCount = vd.positions.length / 3;
            const colors = new Float32Array(vertexCount * 4);
            for (let i = 0; i < vertexCount; i++) {
                colors[i * 4] = color.r;
                colors[i * 4 + 1] = color.g;
                colors[i * 4 + 2] = color.b;
                colors[i * 4 + 3] = 1;
            }
            if (color.r < 0.999 || color.g < 0.999 || color.b < 0.999) anyColor = true;
            vd.colors = colors;
            const animatedNode = animatedOf(mesh);
            if (animatedNode) {
                if (!animatedGroups.has(animatedNode)) animatedGroups.set(animatedNode, []);
                animatedGroups.get(animatedNode).push(vd);
            } else {
                parts.push(vd);
            }
        });
        if (parts.length === 0) throw new Error('modelo sem geometria');

        // Todas as partes precisam dos mesmos atributos para o merge
        const all = [...parts, ...[...animatedGroups.values()].flat()];
        const hasUvs = all.some(p => p.uvs);
        all.forEach(p => {
            if (!anyColor) p.colors = null;
            if (hasUvs && !p.uvs) p.uvs = new Float32Array((p.positions.length / 3) * 2);
        });
        const vertexData = parts[0];
        if (parts.length > 1) vertexData.merge(parts.slice(1), true);

        // Partes animadas: geometria relativa ao pivô (origem do nó) e o eixo de giro no espaço do Babylon
        const animated = [...animatedGroups.entries()].map(([node, list]) => {
            const vd = list[0];
            if (list.length > 1) vd.merge(list.slice(1), true);
            const pivot = node.getAbsolutePosition().clone();
            vd.transform(BABYLON.Matrix.Translation(-pivot.x, -pivot.y, -pivot.z));
            const local = /^pas_/i.test(node.name) ? new BABYLON.Vector3(0, 0, 1) : new BABYLON.Vector3(0, 1, 0);
            const axis = BABYLON.Vector3.TransformNormal(local, node.getWorldMatrix()).normalize();
            return { name: node.name, vertexData: vd, pivot, axis };
        });

        // A textura fica (é do modelo-base); malhas, materiais PBR e nós do container saem
        container.meshes.slice().forEach(m => m.dispose(false, false));
        container.materials.slice().forEach(m => m.dispose(false, false));
        container.transformNodes.slice().forEach(t => t.dispose());

        return { vertexData, texture, animated };
    },

    /** Modelo-base escondido do tipo, encaixado na área do prédio pela caixa envolvente. */
    createBuildingModelTemplate(buildingType, entry, data) {
        const source = data.vertexData;
        const vd = new BABYLON.VertexData();
        vd.positions = Float32Array.from(source.positions);
        vd.normals = source.normals ? Float32Array.from(source.normals) : null;
        vd.uvs = source.uvs ? Float32Array.from(source.uvs) : null;
        vd.colors = source.colors ? Float32Array.from(source.colors) : null;
        vd.indices = source.indices.slice ? source.indices.slice() : Array.from(source.indices);

        const turn = entry.rotationY ? BABYLON.Matrix.RotationY(entry.rotationY) : BABYLON.Matrix.Identity();
        if (entry.rotationY) vd.transform(turn);
        // Partes animadas: cópia própria, giradas como o corpo (pivô e eixo também)
        const animated = (data.animated || []).map(a => {
            const pvd = new BABYLON.VertexData();
            pvd.positions = Float32Array.from(a.vertexData.positions);
            pvd.normals = a.vertexData.normals ? Float32Array.from(a.vertexData.normals) : null;
            pvd.uvs = a.vertexData.uvs ? Float32Array.from(a.vertexData.uvs) : null;
            pvd.colors = a.vertexData.colors ? Float32Array.from(a.vertexData.colors) : null;
            pvd.indices = Array.from(a.vertexData.indices);
            pvd.transform(turn);
            return {
                name: a.name, vertexData: pvd,
                pivot: BABYLON.Vector3.TransformCoordinates(a.pivot, turn),
                axis: BABYLON.Vector3.TransformNormal(a.axis, turn).normalize()
            };
        });

        // Caixa envolvente do corpo + partes animadas (as pás contam na altura)
        const min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
        const max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < vd.positions.length; i += 3) {
            min.minimizeInPlaceFromFloats(vd.positions[i], vd.positions[i + 1], vd.positions[i + 2]);
            max.maximizeInPlaceFromFloats(vd.positions[i], vd.positions[i + 1], vd.positions[i + 2]);
        }
        animated.forEach(a => {
            const p = a.vertexData.positions;
            for (let i = 0; i < p.length; i += 3) {
                min.minimizeInPlaceFromFloats(p[i] + a.pivot.x, p[i + 1] + a.pivot.y, p[i + 2] + a.pivot.z);
                max.maximizeInPlaceFromFloats(p[i] + a.pivot.x, p[i + 1] + a.pivot.y, p[i + 2] + a.pivot.z);
            }
        });
        const footprint = Math.max(max.x - min.x, max.z - min.z) || 1;
        const target = (buildingType.size || 1) * this.gridManager.cellSize * BUILDING_MODEL_FILL;
        // Altura limitada a BUILDING_MODEL_MAX_HEIGHT × o lado: torres finas encolhem por inteiro
        const height = (max.y - min.y) || 1;
        const scale = Math.min(target / footprint, (target * BUILDING_MODEL_MAX_HEIGHT) / height) * (entry.scale || 1);
        const center = new BABYLON.Vector3((min.x + max.x) / 2, min.y, (min.z + max.z) / 2);
        // Centro na origem do mesh e base em y = 0 (+ yOffset): adjustBuildingToTerrain assenta no bloco
        const fit = BABYLON.Matrix.Translation(-center.x, -center.y, -center.z)
            .multiply(BABYLON.Matrix.Scaling(scale, scale, scale))
            .multiply(BABYLON.Matrix.Translation(0, entry.yOffset || 0, 0));
        vd.transform(fit);

        const template = new BABYLON.Mesh(`buildingModelTemplate_${buildingType.id}`, this.scene);
        vd.applyToMesh(template, false);
        template.setEnabled(false);
        template.isPickable = false;

        const material = new BABYLON.StandardMaterial(`buildingModelBaseMat_${buildingType.id}`, this.scene);
        material.diffuseColor = entry.tint ? BABYLON.Color3.FromHexString(entry.tint) : new BABYLON.Color3(1, 1, 1);
        material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
        // Um pouco de luz própria: a paleta da Kenney tem cinzas bem escuros, que sob a luz do jogo viravam preto
        material.emissiveColor = new BABYLON.Color3(0.14, 0.14, 0.15);
        material.diffuseTexture = data.texture;
        material.backFaceCulling = false;
        template.material = material;

        // Partes animadas como filhas do modelo-base: template.clone() as leva junto para cada prédio
        animated.forEach((a, k) => {
            a.vertexData.transform(BABYLON.Matrix.Scaling(scale, scale, scale));
            const part = new BABYLON.Mesh(`${a.name}_${buildingType.id}_${k}`, this.scene);
            a.vertexData.applyToMesh(part, false);
            part.parent = template;
            part.position = BABYLON.Vector3.TransformCoordinates(a.pivot, fit);
            part.rotationQuaternion = BABYLON.Quaternion.Identity();
            part.isPickable = false;
            part.material = material;
            part.metadata = { animatedPart: true, spinAxis: [a.axis.x, a.axis.y, a.axis.z], kind: /^pas_/i.test(a.name) ? 'rotor' : 'spin' };
        });
        return template;
    },

    /** Partes que giram de um clone do modelo (filhas com metadata.animatedPart), com eixo e fase próprios. */
    collectAnimatedParts(mesh) {
        return mesh.getChildMeshes(true)
            .filter(child => child.metadata?.animatedPart)
            .map((child, k) => ({
                mesh: child,
                axis: BABYLON.Vector3.FromArray(child.metadata.spinAxis),
                kind: child.metadata.kind,
                angle: k * 1.7 + (mesh.uniqueId % 7), // cada rotor começa num ponto: o campo não gira em uníssono
                speed: child.metadata.kind === 'rotor' ? 2.4 + (k % 3) * 0.3 : 1.6
            }));
    },

    /**
     * Gira as partes animadas dos prédios prontos e funcionando (BuildingSystem.update, tempo de jogo: para na
     * pausa). Rotores acompanham o vento real (WeatherEffects) e a eficiência; o material segue o do prédio
     * (obra, falta de energia e destaque trocam o material do mesh pai).
     */
    updateAnimatedParts(deltaTime) {
        const dt = (deltaTime || 0) / 1000;
        if (dt <= 0) return;
        const wind = this.gameManager?.weatherEffects?.profile?.wind;
        const windFactor = Number.isFinite(wind) ? Math.min(1.8, 0.45 + wind / 25) : 1;
        for (const b of this.buildings.values()) {
            const parts = b.mesh?.animatedParts;
            if (!parts || parts.length === 0) continue;
            const running = !b.underConstruction && b.active !== false && (b.efficiency ?? 1) > 0;
            for (const part of parts) {
                if (part.mesh.isDisposed()) continue;
                if (part.mesh.material !== b.mesh.material) part.mesh.material = b.mesh.material;
                if (!running) continue;
                const factor = part.kind === 'rotor' ? windFactor : 1;
                part.angle = (part.angle + part.speed * factor * Math.max(0.3, b.efficiency ?? 1) * dt) % (Math.PI * 2);
                // Reaproveita o quaternion (antes: um novo por peça a cada quadro)
                if (part.mesh.rotationQuaternion) BABYLON.Quaternion.RotationAxisToRef(part.axis, -part.angle, part.mesh.rotationQuaternion);
                else part.mesh.rotationQuaternion = BABYLON.Quaternion.RotationAxis(part.axis, -part.angle);
            }
        }
    },

    /** Troca pelo modelo o mesh procedural dos prédios desse tipo que já estão no mapa. */
    upgradeBuildingsToModel(typeId) {
        for (const buildingData of this.buildings.values()) {
            if (buildingData.type === typeId && buildingData.mesh && !buildingData.mesh.metadata?.fromModel) {
                this.swapBuildingMeshForModel(buildingData);
            }
        }
    },

    /** Troca pelo modelo o mesh (procedural) de um prédio já colocado (replaceBuildingMesh leva o resto junto). */
    swapBuildingMeshForModel(buildingData) {
        const oldMesh = buildingData.mesh;
        if (!oldMesh || oldMesh.isDisposed()) return false;
        const newMesh = this.createBuildingModelMesh(buildingData.config);
        if (!newMesh) return false;
        newMesh.name = `${newMesh.name}#${newMesh.uniqueId}`;
        if (!this.replaceBuildingMesh(oldMesh, newMesh)) {
            newMesh.material?.dispose(false, false);
            newMesh.dispose(false, false);
            return false;
        }
        log(`🏠 ${buildingData.id} (${buildingData.type}) agora usa o modelo ${newMesh.metadata.modelFile}`);
        return true;
    },

    /** Rótulo acima do topo do modelo (a altura padrão do rótulo é a do procedural). */
    fitBuildingLabelToMesh(mesh) {
        const label = mesh?.nameLabel;
        if (!label || label.isDisposed?.()) return;
        const top = mesh.position.y + mesh.getBoundingInfo().boundingBox.maximum.y;
        label.position.y = Math.max(label.position.y, top + 1);
    }
});
