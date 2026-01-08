/**
 * Sistema de Vida Urbana - Guardião da Água
 * Adiciona elementos animados como carros e pedestres para dar vida à cidade
 */

class CityLifeSystem {
    constructor(scene, gridManager, buildingSystem) {
        console.log('🚗 Inicializando Sistema de Vida Urbana...');
        
        this.scene = scene;
        this.gridManager = gridManager;
        this.buildingSystem = buildingSystem;
        
        // Arrays para armazenar entidades animadas
        this.cars = [];
        this.pedestrians = [];
        this.roads = [];
        
        // Configurações
        this.maxCars = 20;
        this.maxPedestrians = 30;
        this.carSpawnRate = 0.02;
        this.pedestrianSpawnRate = 0.03;
        
        // Materiais
        this.materials = new Map();
        
        // Estado do sistema
        this.enabled = true;
        this.lastUpdate = 0;
        this.updateInterval = 100;

        this.roadNetworkCache = {
            isDirty: true,
            lastUpdate: 0,
            updateInterval: 5000
        };
        
        this.initializeMaterials();
        this.findRoads();
        
        console.log('✅ Sistema de Vida Urbana inicializado');
    }
    
    initializeMaterials() {
        // Material para carros
        const carMaterial = new BABYLON.StandardMaterial("carMaterial", this.scene);
        carMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Vermelho
        carMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        this.materials.set('car', carMaterial);
        
        // Material para pedestres
        const pedestrianMaterial = new BABYLON.StandardMaterial("pedestrianMaterial", this.scene);
        pedestrianMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.8); // Azul
        pedestrianMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        this.materials.set('pedestrian', pedestrianMaterial);
        
        // Variações de cores para carros
        const carColors = [
            new BABYLON.Color3(0.8, 0.2, 0.2), // Vermelho
            new BABYLON.Color3(0.2, 0.2, 0.8), // Azul
            new BABYLON.Color3(0.2, 0.8, 0.2), // Verde
            new BABYLON.Color3(0.8, 0.8, 0.2), // Amarelo
            new BABYLON.Color3(0.6, 0.6, 0.6), // Cinza
            new BABYLON.Color3(0.1, 0.1, 0.1)  // Preto
        ];
        
        carColors.forEach((color, index) => {
            const material = new BABYLON.StandardMaterial(`carMaterial_${index}`, this.scene);
            material.diffuseColor = color;
            material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            this.materials.set(`car_${index}`, material);
        });
    }
    
    findRoads() {
        const now = performance.now();
        
        if (!this.roadNetworkCache.isDirty && 
            now - this.roadNetworkCache.lastUpdate < this.roadNetworkCache.updateInterval) {
            return;
        }
        
        this.roads = [];
        
        for (let x = 0; x < this.gridManager.gridSize; x++) {
            for (let z = 0; z < this.gridManager.gridSize; z++) {
                const building = this.buildingSystem.getBuildingAt(x, z);
                if (building && building.config.id === 'road') {
                    this.roads.push({ x, z, connections: [] });
                }
            }
        }
        
        this.calculateRoadConnections();
        
        this.roadNetworkCache.isDirty = false;
        this.roadNetworkCache.lastUpdate = now;
        
        console.log(`🛣️ Encontradas ${this.roads.length} estradas`);
    }
    
    invalidateRoadNetworkCache() {
        this.roadNetworkCache.isDirty = true;
    }
    
    calculateRoadConnections() {
        this.roads.forEach(road => {
            road.connections = [];
            
            // Verificar estradas adjacentes (4 direções)
            const directions = [
                { x: 0, z: 1 },  // Norte
                { x: 1, z: 0 },  // Leste
                { x: 0, z: -1 }, // Sul
                { x: -1, z: 0 }  // Oeste
            ];
            
            directions.forEach(dir => {
                const adjX = road.x + dir.x;
                const adjZ = road.z + dir.z;
                
                const adjacentRoad = this.roads.find(r => r.x === adjX && r.z === adjZ);
                if (adjacentRoad) {
                    road.connections.push(adjacentRoad);
                }
            });
        });
    }
    
    update(deltaTime) {
        if (!this.enabled || !this.scene || !this.gridManager || !this.buildingSystem) return;

        const currentTime = performance.now();
        if (currentTime - this.lastUpdate < this.updateInterval) return;

        this.lastUpdate = currentTime;
        
        // Atualizar carros existentes
        this.updateCars(deltaTime);
        
        // Atualizar pedestres existentes
        this.updatePedestrians(deltaTime);
        
        // Spawnar novos carros
        if (this.cars.length < this.maxCars && Math.random() < this.carSpawnRate) {
            this.spawnCar();
        }
        
        // Spawnar novos pedestres
        if (this.pedestrians.length < this.maxPedestrians && Math.random() < this.pedestrianSpawnRate) {
            this.spawnPedestrian();
        }
        
        // Limpar entidades que saíram do mapa
        this.cleanupEntities();
    }
    
    spawnCar() {
        if (this.roads.length === 0) return;
        
        // Escolher estrada aleatória para spawn
        const spawnRoad = this.roads[Math.floor(Math.random() * this.roads.length)];
        if (spawnRoad.connections.length === 0) return;
        
        // Criar mesh do carro estilo Minecraft
        const car = this.createCarMesh();
        
        // Posicionar na estrada
        const worldPos = this.gridManager.gridToWorld(spawnRoad.x, spawnRoad.z);
        car.position = worldPos;
        car.position.y += 0.3; // Acima da estrada
        
        // Escolher destino aleatório
        const targetRoad = spawnRoad.connections[Math.floor(Math.random() * spawnRoad.connections.length)];
        
        // Dados do carro
        const carData = {
            mesh: car,
            currentRoad: spawnRoad,
            targetRoad: targetRoad,
            speed: 0.5 + Math.random() * 0.5, // Velocidade variável
            progress: 0,
            lifetime: 0
        };
        
        this.cars.push(carData);
    }
    
    createCarMesh() {
        // Corpo do carro (estilo voxel)
        const body = BABYLON.MeshBuilder.CreateBox("carBody", {
            width: 0.6,
            height: 0.3,
            depth: 1.2
        }, this.scene);
        
        // Teto do carro
        const roof = BABYLON.MeshBuilder.CreateBox("carRoof", {
            width: 0.5,
            height: 0.2,
            depth: 0.8
        }, this.scene);
        roof.position.y = 0.25;
        
        // Combinar meshes
        const car = BABYLON.Mesh.MergeMeshes([body, roof]);
        car.name = `car_${Date.now()}_${Math.random()}`;
        
        // Material aleatório
        const colorIndex = Math.floor(Math.random() * 6);
        car.material = this.materials.get(`car_${colorIndex}`);
        
        return car;
    }
    
    spawnPedestrian() {
        // Escolher posição aleatória próxima a edifícios residenciais
        const residentialBuildings = [];
        
        for (let x = 0; x < this.gridManager.gridSize; x++) {
            for (let z = 0; z < this.gridManager.gridSize; z++) {
                const building = this.buildingSystem.getBuildingAt(x, z);
                if (building && building.config.category === 'residential') {
                    residentialBuildings.push({ x, z });
                }
            }
        }
        
        if (residentialBuildings.length === 0) return;
        
        const spawnBuilding = residentialBuildings[Math.floor(Math.random() * residentialBuildings.length)];
        
        // Criar mesh do pedestre
        const pedestrian = this.createPedestrianMesh();
        
        // Posicionar próximo ao edifício
        const worldPos = this.gridManager.gridToWorld(spawnBuilding.x, spawnBuilding.z);
        pedestrian.position = worldPos;
        pedestrian.position.x += (Math.random() - 0.5) * 2;
        pedestrian.position.z += (Math.random() - 0.5) * 2;
        pedestrian.position.y += 0.5;
        
        // Escolher destino aleatório
        const targetBuilding = residentialBuildings[Math.floor(Math.random() * residentialBuildings.length)];
        const targetPos = this.gridManager.gridToWorld(targetBuilding.x, targetBuilding.z);
        
        // Dados do pedestre
        const pedestrianData = {
            mesh: pedestrian,
            targetPosition: targetPos,
            speed: 0.2 + Math.random() * 0.3,
            lifetime: 0
        };
        
        this.pedestrians.push(pedestrianData);
    }
    
    createPedestrianMesh() {
        // Corpo do pedestre (estilo voxel simples)
        const body = BABYLON.MeshBuilder.CreateBox("pedestrianBody", {
            width: 0.3,
            height: 0.8,
            depth: 0.2
        }, this.scene);
        
        // Cabeça
        const head = BABYLON.MeshBuilder.CreateBox("pedestrianHead", {
            width: 0.25,
            height: 0.25,
            depth: 0.25
        }, this.scene);
        head.position.y = 0.5;
        
        // Combinar meshes
        const pedestrian = BABYLON.Mesh.MergeMeshes([body, head]);
        pedestrian.name = `pedestrian_${Date.now()}_${Math.random()}`;
        pedestrian.material = this.materials.get('pedestrian');
        
        return pedestrian;
    }
    
    updateCars(deltaTime) {
        this.cars.forEach((car, index) => {
            car.lifetime += deltaTime;
            
            if (!car.targetRoad) {
                // Remover carro sem destino
                this.cars.splice(index, 1);
                car.mesh.dispose();
                return;
            }
            
            // Mover em direção ao destino
            const currentPos = this.gridManager.gridToWorld(car.currentRoad.x, car.currentRoad.z);
            const targetPos = this.gridManager.gridToWorld(car.targetRoad.x, car.targetRoad.z);
            
            car.progress += car.speed * deltaTime * 0.001;
            
            if (car.progress >= 1) {
                // Chegou ao destino, escolher próximo
                car.currentRoad = car.targetRoad;
                car.progress = 0;
                
                if (car.targetRoad.connections.length > 0) {
                    car.targetRoad = car.targetRoad.connections[Math.floor(Math.random() * car.targetRoad.connections.length)];
                } else {
                    car.targetRoad = null;
                }
            } else {
                // Interpolar posição
                car.mesh.position.x = BABYLON.Tools.Lerp(currentPos.x, targetPos.x, car.progress);
                car.mesh.position.z = BABYLON.Tools.Lerp(currentPos.z, targetPos.z, car.progress);
                
                // Rotacionar na direção do movimento
                const direction = targetPos.subtract(currentPos);
                if (direction.length() > 0) {
                    car.mesh.lookAt(car.mesh.position.add(direction));
                }
            }
        });
    }
    
    updatePedestrians(deltaTime) {
        this.pedestrians.forEach((pedestrian, index) => {
            pedestrian.lifetime += deltaTime;
            
            // Mover em direção ao destino
            const direction = pedestrian.targetPosition.subtract(pedestrian.mesh.position);
            direction.y = 0; // Manter no plano horizontal
            
            if (direction.length() < 0.5) {
                // Chegou ao destino, escolher novo
                const newTarget = this.getRandomWalkablePosition();
                if (newTarget) {
                    pedestrian.targetPosition = newTarget;
                }
            } else {
                // Mover
                direction.normalize();
                const movement = direction.scale(pedestrian.speed * deltaTime * 0.001);
                pedestrian.mesh.position.addInPlace(movement);
                
                // Rotacionar na direção do movimento
                if (direction.length() > 0) {
                    pedestrian.mesh.lookAt(pedestrian.mesh.position.add(direction));
                }
            }
        });
    }
    
    getRandomWalkablePosition() {
        // Encontrar posição caminhável aleatória
        for (let attempts = 0; attempts < 10; attempts++) {
            const x = Math.floor(Math.random() * this.gridManager.gridSize);
            const z = Math.floor(Math.random() * this.gridManager.gridSize);
            
            if (!this.gridManager.isOccupied(x, z)) {
                return this.gridManager.gridToWorld(x, z);
            }
        }
        return null;
    }
    
    cleanupEntities() {
        // Remover carros antigos
        this.cars = this.cars.filter(car => {
            if (car.lifetime > 60000) { // 1 minuto
                car.mesh.dispose();
                return false;
            }
            return true;
        });
        
        // Remover pedestres antigos
        this.pedestrians = this.pedestrians.filter(pedestrian => {
            if (pedestrian.lifetime > 45000) { // 45 segundos
                pedestrian.mesh.dispose();
                return false;
            }
            return true;
        });
    }
    
    // Método para atualizar quando novas estradas são construídas
    onRoadBuilt() {
        this.findRoads();
    }
    
    // Método para ajustar densidade baseada na população
    updateDensity(population) {
        const densityFactor = Math.min(1, population / 1000);
        this.maxCars = Math.floor(20 * densityFactor);
        this.maxPedestrians = Math.floor(30 * densityFactor);
        this.carSpawnRate = 0.02 * densityFactor;
        this.pedestrianSpawnRate = 0.03 * densityFactor;
    }
    
    dispose() {
        // Limpar todas as entidades
        this.cars.forEach(car => car.mesh.dispose());
        this.pedestrians.forEach(pedestrian => pedestrian.mesh.dispose());
        
        this.cars = [];
        this.pedestrians = [];
        
        // Limpar materiais
        this.materials.forEach(material => material.dispose());
        this.materials.clear();
        
        console.log('🚗 Sistema de Vida Urbana finalizado');
    }
}

// Exportar para escopo global
window.CityLifeSystem = CityLifeSystem;
console.log('🚗 CityLifeSystem carregado e exportado para window.CityLifeSystem');
