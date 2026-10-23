/**
 * ===== VEÍCULOS LOW POLY (compartilhados) =====
 * Os carrinhos da abertura (IntroCinematic.createCars) e o trânsito do jogo (CityLifeSystem) usam os
 * mesmos modelos: peças em caixa com cor de vértice, juntas num mesh só, sombreamento chapado.
 * Frente do veículo = +z (rotation.y = atan2(dx, dz) aponta para o sentido do movimento).
 * Medidas para a célula de 2 unidades (cellSize da intro e do jogo).
 */
const VehicleMeshes = {
    CAR_COLORS: ['#e74c3c', '#f1c40f', '#3498db', '#ecf0f1', '#2ecc71', '#e67e22', '#9b59b6'],
    TRUCK_COLORS: ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'],

    /** Mesh com cor de vértice a partir de peças [mesh, '#cor'], juntas num só (as peças são descartadas). */
    coloredMesh(scene, name, parts) {
        parts.forEach(([mesh, color]) => {
            const count = mesh.getTotalVertices();
            const c = BABYLON.Color3.FromHexString(color);
            const colors = new Float32Array(count * 4);
            for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b, 1], i * 4);
            mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors);
        });
        const merged = BABYLON.Mesh.MergeMeshes(parts.map(p => p[0]), true, true);
        merged.name = name;
        merged.convertToFlatShadedMesh();
        const mat = new BABYLON.StandardMaterial(`${name}Mat`, scene);
        mat.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);
        merged.material = mat;
        merged.isPickable = false;
        return merged;
    },

    box(scene, opts, x, y, z) {
        const mesh = BABYLON.MeshBuilder.CreateBox('vehiclePart', opts, scene);
        mesh.position.set(x, y, z);
        mesh.bakeCurrentTransformIntoVertices();
        return mesh;
    },

    /** Carro da abertura: carroceria colorida + cabine clara. */
    createCar(scene, color, name = `car_${color}`) {
        const body = VehicleMeshes.box(scene, { width: 0.5, height: 0.22, depth: 0.95 }, 0, 0.17, 0);
        const cabin = VehicleMeshes.box(scene, { width: 0.44, height: 0.18, depth: 0.5 }, 0, 0.36, -0.05);
        return VehicleMeshes.coloredMesh(scene, name, [[body, color], [cabin, '#dfe9ef']]);
    },

    /** Caminhão no mesmo estilo: chassi escuro, cabine colorida com para-brisa e baú claro atrás. */
    createTruck(scene, color, name = `truck_${color}`) {
        const chassis = VehicleMeshes.box(scene, { width: 0.48, height: 0.12, depth: 1.36 }, 0, 0.1, 0);
        const cabin = VehicleMeshes.box(scene, { width: 0.52, height: 0.4, depth: 0.36 }, 0, 0.36, 0.48);
        const glass = VehicleMeshes.box(scene, { width: 0.44, height: 0.14, depth: 0.04 }, 0, 0.46, 0.665);
        const cargo = VehicleMeshes.box(scene, { width: 0.56, height: 0.52, depth: 0.88 }, 0, 0.44, -0.2);
        const stripe = VehicleMeshes.box(scene, { width: 0.58, height: 0.07, depth: 0.9 }, 0, 0.32, -0.2);
        return VehicleMeshes.coloredMesh(scene, name, [
            [chassis, '#3a3f45'], [cabin, color], [glass, '#bfe3f2'], [cargo, '#eef1f3'], [stripe, color]
        ]);
    }
};

window.VehicleMeshes = VehicleMeshes;
