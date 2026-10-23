/**
 * Sistema de Vida Urbana - Guardião da Água
 * Trânsito: com pelo menos MIN_ROADS blocos de rua ligados, carros e caminhões (os modelos da abertura,
 * js/systems/shared/VehicleMeshes.js) circulam célula a célula pela rede (RoadNetwork), na faixa da
 * direita, fazendo curva suave nas esquinas e escolhendo um vizinho ao acaso (meia-volta só em rua sem saída).
 * Cada veículo é uma instância (createInstance) do modelo-base escondido do tipo/cor: poucas chamadas de desenho.
 * Só anda quando GameManager.update roda (jogo rodando, sem pausa) e no tempo de jogo (dt × velocidade).
 */
class CityLifeSystem {
    constructor(scene, gridManager, buildingSystem) {
        this.scene = scene;
        this.gridManager = gridManager;
        this.buildingSystem = buildingSystem;

        this.vehicles = [];
        this.templates = new Map(); // 'car|#cor' → mesh escondido
        this.network = null;
        this.spawnTimer = 0;
        this.enabled = true;
        log('🚗 Sistema de Vida Urbana inicializado');
    }

    /** Blocos de rua ligados a outro bloco (isolados não contam para o trânsito). */
    getConnectedRoadCount() {
        return this.network ? this.network.connectedCount() : 0;
    }

    /** Quantos veículos a rede comporta agora: nenhum abaixo do mínimo, depois 1 a cada 4 blocos. */
    getTargetVehicleCount() {
        const roads = this.getConnectedRoadCount();
        if (roads < CityLifeSystem.MIN_ROADS) return 0;
        return Math.min(CityLifeSystem.MAX_VEHICLES, Math.max(3, Math.floor(roads / 4)));
    }

    /** Ruas mudaram (construiu, demoliu, carregou o save): refaz a rede e tira quem ficou fora dela. */
    onRoadBuilt() {
        this.network = this.buildingSystem?.getRoadNetwork?.() || null;
        const target = this.getTargetVehicleCount();
        this.vehicles = this.vehicles.filter(v => {
            const ok = target > 0 && this.network.has(v.cur.x, v.cur.z) && this.network.has(v.next.x, v.next.z);
            if (!ok) this.disposeVehicle(v);
            return ok;
        });
        while (this.vehicles.length > target) this.disposeVehicle(this.vehicles.pop());
    }

    update(deltaTime) {
        if (!this.enabled || !this.scene || !this.network) return;
        const dt = Math.min(deltaTime, 250) / 1000; // segundos (sem salto depois de uma aba parada)

        const target = this.getTargetVehicleCount();
        if (this.vehicles.length < target) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnVehicle();
                this.spawnTimer = 0.6;
            }
        }
        for (const v of this.vehicles) this.moveVehicle(v, dt);
    }

    // ===== VEÍCULOS =====
    getTemplate(kind, color) {
        const key = `${kind}|${color}`;
        let mesh = this.templates.get(key);
        if (mesh && !mesh.isDisposed()) return mesh;
        mesh = kind === 'truck'
            ? VehicleMeshes.createTruck(this.scene, color, `trafficTruck_${color}`)
            : VehicleMeshes.createCar(this.scene, color, `trafficCar_${color}`);
        mesh.isVisible = false; // só as instâncias aparecem
        mesh.receiveShadows = true;
        this.templates.set(key, mesh);
        return mesh;
    }

    spawnVehicle() {
        const cells = this.network.list().filter(c => this.network.maskAt(c.x, c.z));
        if (!cells.length) return null;
        // Longe dos outros veículos, para não nascer um em cima do outro
        const busy = new Set(this.vehicles.map(v => RoadNetwork.key(v.cur.x, v.cur.z)));
        const free = cells.filter(c => !busy.has(RoadNetwork.key(c.x, c.z)));
        const start = (free.length ? free : cells)[Math.floor(Math.random() * (free.length || cells.length))];
        const neighbors = this.network.neighbors(start.x, start.z);
        const from = neighbors[Math.floor(Math.random() * neighbors.length)];
        const prev = { x: from.x, z: from.z };
        const cur = { x: start.x, z: start.z };
        const next = this.network.nextCell(prev, cur);
        if (!next) return null;

        const truck = Math.random() < 0.25;
        const colors = truck ? VehicleMeshes.TRUCK_COLORS : VehicleMeshes.CAR_COLORS;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const mesh = this.getTemplate(truck ? 'truck' : 'car', color).createInstance(`traffic_${truck ? 'truck' : 'car'}_${++CityLifeSystem.counter}`);
        mesh.isPickable = false;
        window.gameManager?.shadowGenerator?.addShadowCaster(mesh);

        const vehicle = { mesh, kind: truck ? 'truck' : 'car', prev, cur, next, t: Math.random() * 0.5, speed: truck ? 1.5 : 2.1 + Math.random() * 0.6 };
        this.buildPath(vehicle);
        this.placeVehicle(vehicle);
        this.vehicles.push(vehicle);
        return vehicle;
    }

    disposeVehicle(v) {
        if (!v?.mesh || v.mesh.isDisposed()) return;
        window.gameManager?.shadowGenerator?.removeShadowCaster(v.mesh);
        v.mesh.dispose();
    }

    /** Trecho dentro da célula cur: da borda com prev até a borda com next, na faixa da direita (Bézier cúbica). */
    buildPath(v) {
        const cs = this.gridManager.cellSize;
        const lane = cs * CityLifeSystem.LANE_OFFSET;
        const c = this.gridManager.gridToWorld(v.cur.x, v.cur.z);
        const dIn = { x: v.cur.x - v.prev.x, z: v.cur.z - v.prev.z };   // sentido de quem entra
        const dOut = { x: v.next.x - v.cur.x, z: v.next.z - v.cur.z };  // sentido de quem sai
        const right = d => ({ x: d.z, z: -d.x }); // à direita do sentido (x leste, z norte)
        const rIn = right(dIn), rOut = right(dOut);
        const half = cs / 2;
        const p0 = { x: c.x - dIn.x * half + rIn.x * lane, z: c.z - dIn.z * half + rIn.z * lane };
        const p3 = { x: c.x + dOut.x * half + rOut.x * lane, z: c.z + dOut.z * half + rOut.z * lane };
        let p1, p2;
        if (dIn.x === dOut.x && dIn.z === dOut.z) { // reto
            p1 = { x: p0.x + dIn.x * half * 0.66, z: p0.z + dIn.z * half * 0.66 };
            p2 = { x: p3.x - dOut.x * half * 0.66, z: p3.z - dOut.z * half * 0.66 };
        } else if (dIn.x === -dOut.x && dIn.z === -dOut.z) { // meia-volta na ponta
            p1 = { x: p0.x + dIn.x * half * 1.3, z: p0.z + dIn.z * half * 1.3 };
            p2 = { x: p3.x + dIn.x * half * 1.3, z: p3.z + dIn.z * half * 1.3 };
        } else { // curva: as duas faixas se cruzam no canto da curva
            const k = { x: c.x + rIn.x * lane + rOut.x * lane, z: c.z + rIn.z * lane + rOut.z * lane };
            p1 = { x: p0.x + (k.x - p0.x) * 0.75, z: p0.z + (k.z - p0.z) * 0.75 };
            p2 = { x: p3.x + (k.x - p3.x) * 0.75, z: p3.z + (k.z - p3.z) * 0.75 };
        }
        // Altura: borda de entrada (média das células) → centro → borda de saída
        const h = (x, z) => this.buildingSystem.getRoadSurfaceHeight(x, z);
        const yCur = h(v.cur.x, v.cur.z);
        v.path = {
            p: [p0, p1, p2, p3],
            y0: (h(v.prev.x, v.prev.z) + yCur) / 2, y1: yCur, y2: (yCur + h(v.next.x, v.next.z)) / 2
        };
        // Comprimento aproximado (para a velocidade ser a mesma em reta e curva)
        let length = 0, last = this.bezier(v.path.p, 0);
        for (let i = 1; i <= 8; i++) {
            const pt = this.bezier(v.path.p, i / 8);
            length += Math.hypot(pt.x - last.x, pt.z - last.z);
            last = pt;
        }
        v.path.length = Math.max(0.1, length);
    }

    bezier(p, t) {
        const u = 1 - t;
        const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, z: a * p[0].z + b * p[1].z + c * p[2].z + d * p[3].z };
    }

    /** Outro veículo logo à frente, na mesma faixa? (espera atrás dele; depois de um tempo segue, sem travar) */
    isBlocked(v) {
        const p = v.mesh.position;
        const fx = Math.sin(v.mesh.rotation.y), fz = Math.cos(v.mesh.rotation.y);
        const gap = v.kind === 'truck' ? 1.6 : 1.25;
        return this.vehicles.some(o => {
            if (o === v) return false;
            const dx = o.mesh.position.x - p.x, dz = o.mesh.position.z - p.z;
            const ahead = dx * fx + dz * fz;
            return ahead > 0 && ahead < gap && Math.abs(dx * fz - dz * fx) < 0.35;
        });
    }

    moveVehicle(v, dt) {
        if (this.isBlocked(v)) {
            v.wait = (v.wait || 0) + dt;
            if (v.wait < 1.5) return;
        } else v.wait = 0;
        v.t += (v.speed * dt) / v.path.length;
        while (v.t >= 1) {
            v.t -= 1;
            const next = this.network.nextCell(v.cur, v.next);
            if (!next) return; // a rede mudou e onRoadBuilt ainda vai limpar
            v.prev = v.cur;
            v.cur = v.next;
            v.next = next;
            this.buildPath(v);
        }
        this.placeVehicle(v);
    }

    placeVehicle(v) {
        const { p, y0, y1, y2 } = v.path;
        const pos = this.bezier(p, v.t);
        const ahead = this.bezier(p, Math.min(1, v.t + 0.02));
        const behind = this.bezier(p, Math.max(0, v.t - 0.02));
        const y = v.t < 0.5 ? y0 + (y1 - y0) * v.t * 2 : y1 + (y2 - y1) * (v.t - 0.5) * 2;
        v.mesh.position.set(pos.x, y + 0.01, pos.z);
        const dx = ahead.x - behind.x, dz = ahead.z - behind.z;
        if (dx || dz) v.mesh.rotation.y = Math.atan2(dx, dz);
    }

    dispose() {
        this.vehicles.forEach(v => this.disposeVehicle(v));
        this.vehicles = [];
        this.templates.forEach(mesh => {
            mesh.material?.dispose();
            mesh.dispose();
        });
        this.templates.clear();
        log('🚗 Sistema de Vida Urbana finalizado');
    }
}

CityLifeSystem.MIN_ROADS = 20;      // blocos de rua ligados para o trânsito aparecer
CityLifeSystem.MAX_VEHICLES = 18;
CityLifeSystem.LANE_OFFSET = 0.19;  // × cellSize: meio da faixa da direita (o asfalto vai até 0,375 do centro)
CityLifeSystem.counter = 0;

// Exportar para escopo global
window.CityLifeSystem = CityLifeSystem;
