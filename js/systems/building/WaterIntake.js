/**
 * ===== CAPTAÇÃO DE SUPERFÍCIE (ETA) — partial do BuildingSystem =====
 * A ETA (config.surfaceWater) precisa de um rio, lago ou represa a até requirements.maxWaterDistance blocos.
 * Encostada na água ela capta direto (sem cano). Mais longe, a cidade instala sozinha uma bomba de captação
 * na margem (sobre a célula de água) e a adutora (canos) da margem até a ETA. É só visual: a bomba e os canos
 * não ocupam o grid (a adutora é meio enterrada, passa por baixo de ruas) e somem junto com a ETA.
 *
 *   getWaterDistance / planWaterIntake  regras puras (sem Babylon), testadas em tests/unit/intake.test.js
 *   building.intake = { pump: [x, z] | null, path: [[x, z], ...] }  vai no save (serializeBuilding)
 *   createWaterIntake / removeWaterIntake / updateIntakePreview  meshes (um por ETA, peças fundidas)
 */
mixin(BuildingSystem, {
    // ===== REGRAS (sem Babylon) =====

    /** Menor distância (blocos, em quadrado: diagonal conta 1) da área do prédio até uma célula de água; Infinity se não houver até `max`. */
    getWaterDistance(gridX, gridZ, size = 1, max = 10) {
        const grid = this.gridManager;
        for (let d = 1; d <= max; d++) {
            for (let x = gridX - d; x < gridX + size + d; x++) {
                for (let z = gridZ - d; z < gridZ + size + d; z++) {
                    const ring = x === gridX - d || x === gridX + size + d - 1 || z === gridZ - d || z === gridZ + size + d - 1;
                    if (ring && grid.getTerrainType(x, z) === 'water') return d;
                }
            }
        }
        return Infinity;
    },

    /**
     * Traçado da captação: { distance, adjacent, pump: [x, z] | null, path: [[x, z], ...] }.
     * adjacent = alguma célula da ETA encosta (lado) na água: capta direto, sem bomba nem cano.
     * Senão: busca em largura a partir das células em volta da ETA, por terra, até uma célula que encoste na água
     * (a bomba vai na água ao lado). Evita prédios (rua pode: o cano passa por baixo); se não houver caminho livre,
     * passa por baixo de qualquer coisa. null se não há água perto.
     */
    planWaterIntake(gridX, gridZ, size = 1, max = 10) {
        const grid = this.gridManager;
        const distance = this.getWaterDistance(gridX, gridZ, size, max);
        if (!Number.isFinite(distance)) return null;
        const isWater = (x, z) => grid.getTerrainType(x, z) === 'water';
        const inside = (x, z) => x >= gridX && x < gridX + size && z >= gridZ && z < gridZ + size;
        const inGrid = (x, z) => x >= 0 && z >= 0 && x < grid.gridSize && z < grid.gridSize;
        const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const waterNext = (x, z) => DIRS.map(([dx, dz]) => [x + dx, z + dz]).find(([wx, wz]) => inGrid(wx, wz) && isWater(wx, wz));

        for (let x = gridX; x < gridX + size; x++) {
            for (let z = gridZ; z < gridZ + size; z++) {
                if (waterNext(x, z)) return { distance, adjacent: true, pump: null, path: [] };
            }
        }

        const roads = new Set();
        const blocked = new Set();
        for (const b of this.buildings.values()) {
            const s = b.config?.size || 1;
            for (let x = b.gridX; x < b.gridX + s; x++) {
                for (let z = b.gridZ; z < b.gridZ + s; z++) (b.config?.roadType ? roads : blocked).add(`${x},${z}`);
            }
        }
        const search = avoidBuildings => {
            const start = [];
            for (let x = gridX - 1; x <= gridX + size; x++) {
                for (let z = gridZ - 1; z <= gridZ + size; z++) {
                    const edge = (x === gridX - 1 || x === gridX + size) !== (z === gridZ - 1 || z === gridZ + size); // lados, sem cantos
                    if (edge && inGrid(x, z) && !isWater(x, z)) start.push([x, z]);
                }
            }
            const prev = new Map(start.map(([x, z]) => [`${x},${z}`, null]));
            let frontier = start.filter(([x, z]) => !avoidBuildings || !blocked.has(`${x},${z}`));
            for (let step = 0; step < max * 2 && frontier.length; step++) {
                // Mais perto da água primeiro (desempate estável: o traçado não muda com a ordem dos prédios)
                frontier.sort((a, b) => this.getWaterDistance(a[0], a[1], 1, max) - this.getWaterDistance(b[0], b[1], 1, max));
                for (const [x, z] of frontier) {
                    const water = waterNext(x, z);
                    if (!water) continue;
                    const path = [];
                    for (let key = `${x},${z}`; key; key = prev.get(key)) path.unshift(key.split(',').map(Number));
                    return { distance, adjacent: false, pump: water, path };
                }
                const next = [];
                for (const [x, z] of frontier) {
                    for (const [dx, dz] of DIRS) {
                        const nx = x + dx;
                        const nz = z + dz;
                        const key = `${nx},${nz}`;
                        if (!inGrid(nx, nz) || prev.has(key) || inside(nx, nz) || isWater(nx, nz)) continue;
                        if (avoidBuildings && blocked.has(key)) continue;
                        prev.set(key, `${x},${z}`);
                        next.push([nx, nz]);
                    }
                }
                frontier = next;
            }
            return null;
        };
        return search(true) || search(false) || { distance, adjacent: false, pump: null, path: [] };
    },

    /** Captação salva válida (save) ou planejada agora. */
    resolveWaterIntake(building, saved = null) {
        const ok = saved && (saved.pump === null || (Array.isArray(saved.pump) && saved.pump.length === 2)) &&
            Array.isArray(saved.path) && saved.path.every(c => Array.isArray(c) && c.length === 2 && c.every(Number.isInteger));
        if (ok) return { pump: saved.pump, path: saved.path };
        const plan = this.planWaterIntake(building.gridX, building.gridZ, building.config.size || 1,
            building.config.requirements?.maxWaterDistance || 10);
        return plan ? { pump: plan.pump, path: plan.path } : { pump: null, path: [] };
    },

    /** Texto do rótulo de posicionamento (BuildingFeedback.updatePlacementLabel). */
    describeWaterIntake(plan) {
        if (!plan) return '';
        if (plan.adjacent) return '💧 Encostada na água: capta direto, sem canos';
        return `💧 Água a ${plan.distance} ${plan.distance === 1 ? 'bloco' : 'blocos'}: bomba e ${plan.path.length} ${plan.path.length === 1 ? 'cano' : 'canos'} automáticos`;
    },

    // ===== MESHES =====

    getIntakeMaterial(key, hex, preview = false) {
        const name = `intakeMat_${key}${preview ? '_preview' : ''}`;
        let material = this.materials.get(name);
        if (!material) {
            material = new BABYLON.StandardMaterial(name, this.scene);
            material.diffuseColor = BABYLON.Color3.FromHexString(hex);
            material.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
            if (preview) {
                material.alpha = 0.55;
                material.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(0.35);
            }
            this.materials.set(name, material);
        }
        return material;
    },

    /** Um mesh com a bomba de captação (na água) e os canos (da margem até a borda da ETA). */
    buildWaterIntakeMesh(gridX, gridZ, size, intake, name, preview = false) {
        if (!intake?.pump && !intake?.path?.length) return null;
        const grid = this.gridManager;
        const scene = this.scene;
        const cell = grid.cellSize;
        const mats = {
            pipe: this.getIntakeMaterial('pipe', '#2b86d6', preview),
            concrete: this.getIntakeMaterial('concrete', '#cfccc4', preview),
            metal: this.getIntakeMaterial('metal', '#6f7a86', preview),
            motor: this.getIntakeMaterial('motor', '#ffc72c', preview),
            roof: this.getIntakeMaterial('roof', '#3f78bf', preview)
        };
        const parts = [];
        const center = (x, z) => {
            const p = grid.gridToWorld(x, z);
            return new BABYLON.Vector3(p.x, grid.getTerrainBlockHeight(x, z), p.z);
        };
        const R = 0.075 * cell;
        const pipeY = top => top + R * 0.55; // meio enterrado

        // Pontos da adutora: borda da ETA → centro de cada célula do traçado → margem (meio do caminho até a bomba)
        const points = [];
        const path = intake.path || [];
        if (path.length) {
            const [fx, fz] = path[0];
            const cx = Math.max(gridX, Math.min(gridX + size - 1, fx));
            const cz = Math.max(gridZ, Math.min(gridZ + size - 1, fz));
            const a = center(cx, cz);
            const b = center(fx, fz);
            points.push(new BABYLON.Vector3((a.x + b.x) / 2, pipeY(b.y), (a.z + b.z) / 2));
            for (const [x, z] of path) {
                const c = center(x, z);
                points.push(new BABYLON.Vector3(c.x, pipeY(c.y), c.z));
            }
        }
        if (intake.pump) {
            const [px, pz] = intake.pump;
            const pumpPos = center(px, pz);
            if (points.length) {
                const last = points[points.length - 1];
                const shore = new BABYLON.Vector3((last.x + pumpPos.x) / 2, last.y, (last.z + pumpPos.z) / 2);
                points.push(shore);
            }

            // Bomba flutuante: plataforma de concreto, casinha com telhado azul, motor amarelo e cano mergulhado
            const platform = BABYLON.MeshBuilder.CreateBox(`${name}_platform`, { width: 0.8 * cell, depth: 0.8 * cell, height: 0.14 * cell }, scene);
            platform.position.set(pumpPos.x, pumpPos.y + 0.05 * cell, pumpPos.z);
            platform.material = mats.concrete;
            const house = BABYLON.MeshBuilder.CreateBox(`${name}_house`, { width: 0.42 * cell, depth: 0.4 * cell, height: 0.32 * cell }, scene);
            house.position.set(pumpPos.x - 0.12 * cell, pumpPos.y + 0.28 * cell, pumpPos.z + 0.12 * cell);
            house.material = mats.concrete;
            const roof = BABYLON.MeshBuilder.CreateBox(`${name}_roof`, { width: 0.5 * cell, depth: 0.48 * cell, height: 0.06 * cell }, scene);
            roof.position.set(house.position.x, pumpPos.y + 0.47 * cell, house.position.z);
            roof.material = mats.roof;
            const motor = BABYLON.MeshBuilder.CreateCylinder(`${name}_motor`, { diameter: 0.2 * cell, height: 0.22 * cell, tessellation: 10 }, scene);
            motor.rotation.z = Math.PI / 2;
            motor.position.set(pumpPos.x + 0.18 * cell, pumpPos.y + 0.22 * cell, pumpPos.z - 0.16 * cell);
            motor.material = mats.motor;
            const intakePipe = BABYLON.MeshBuilder.CreateCylinder(`${name}_suction`, { diameter: R * 1.6, height: 0.5 * cell, tessellation: 8 }, scene);
            intakePipe.position.set(pumpPos.x + 0.25 * cell, pumpPos.y - 0.1 * cell, pumpPos.z + 0.25 * cell);
            intakePipe.material = mats.pipe;
            parts.push(platform, house, roof, motor, intakePipe);
            points.push(new BABYLON.Vector3(pumpPos.x, pumpPos.y + 0.18 * cell, pumpPos.z));
        }

        // Canos entre os pontos + flanges (anéis mais grossos) e estacas nas juntas
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i];
            const b = points[i + 1];
            const length = BABYLON.Vector3.Distance(a, b);
            if (length < 1e-3) continue;
            const seg = BABYLON.MeshBuilder.CreateCylinder(`${name}_pipe${i}`, { diameter: R * 2, height: length, tessellation: 8 }, scene);
            seg.position = BABYLON.Vector3.Center(a, b);
            const dir = b.subtract(a).normalize();
            const axis = BABYLON.Vector3.Cross(BABYLON.Axis.Y, dir);
            const angle = Math.acos(Math.max(-1, Math.min(1, BABYLON.Vector3.Dot(BABYLON.Axis.Y, dir))));
            seg.rotationQuaternion = axis.lengthSquared() < 1e-8
                ? BABYLON.Quaternion.Identity()
                : BABYLON.Quaternion.RotationAxis(axis.normalize(), angle);
            seg.material = mats.pipe;
            parts.push(seg);
            const flange = BABYLON.MeshBuilder.CreateSphere(`${name}_joint${i}`, { diameter: R * 2.6, segments: 4 }, scene);
            flange.position.copyFrom(b);
            flange.material = mats.metal;
            parts.push(flange);
        }
        if (!parts.length) return null;

        const merged = BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, true);
        if (!merged) return null;
        merged.name = name;
        merged.isPickable = !preview;
        merged.freezeWorldMatrix();
        return merged;
    },

    /** Cria (ou recria) a bomba e os canos de uma ETA. Chamado por placeBuilding e restoreBuilding. */
    createWaterIntake(building, { sound = false } = {}) {
        if (!building?.config?.surfaceWater || typeof BABYLON === 'undefined' || !this.scene) return;
        this.removeWaterIntake(building);
        const mesh = this.buildWaterIntakeMesh(building.gridX, building.gridZ, building.config.size || 1,
            building.intake, `waterIntake#${building.id}`);
        if (!mesh) return;
        mesh.metadata = { building: true, buildingId: building.id, buildingType: building.type, waterIntake: true };
        this.gameManager?.shadowGenerator?.addShadowCaster?.(mesh);
        building.intakeMesh = mesh;
        if (sound && typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_pipe_install');
    },

    removeWaterIntake(building) {
        const mesh = building?.intakeMesh;
        if (!mesh) return;
        this.gameManager?.shadowGenerator?.removeShadowCaster?.(mesh);
        const multi = mesh.material;
        mesh.dispose(false, false);
        if (multi instanceof BABYLON.MultiMaterial) multi.dispose(false, false, false); // os submateriais são compartilhados
        building.intakeMesh = null;
    },

    /** Fantasma da captação durante a escolha do lugar (mostra por onde vão os canos). */
    updateIntakePreview(gridX, gridZ, type, plan) {
        this.clearIntakePreview();
        if (!type?.surfaceWater || !plan || plan.adjacent) return;
        this.intakePreviewMesh = this.buildWaterIntakeMesh(gridX, gridZ, type.size || 1, plan, 'waterIntakePreview', true);
    },

    clearIntakePreview() {
        const mesh = this.intakePreviewMesh;
        if (!mesh) return;
        const multi = mesh.material;
        mesh.dispose(false, false);
        if (multi instanceof BABYLON.MultiMaterial) multi.dispose(false, false, false);
        this.intakePreviewMesh = null;
    }
});
