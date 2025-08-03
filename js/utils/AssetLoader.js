/**
 * GUARDIÃO DA ÁGUA - ASSET LOADER
 * Gerencia o carregamento de todos os recursos do jogo
 */

class AssetLoader {
    constructor() {
        this.loadedAssets = new Map();
        this.loadingPromises = new Map();
        this.totalAssets = 0;
        this.loadedCount = 0;
        this.onProgressCallback = null;
    }
    
    // ===== CARREGAMENTO PRINCIPAL =====
    static async loadAssets(onProgress = null) {
        const loader = new AssetLoader();
        AssetLoader.instance = loader; // Definir instância singleton
        loader.onProgressCallback = onProgress;
        
        console.log('📦 Iniciando carregamento de assets...');
        
        try {
            // Lista de assets para carregar
            const assetList = [
                // Sprites
                { type: 'image', key: 'buildings', path: 'Sprites/SUNNYSIDE_WORLD_BUILDINGS_V0.01.png' },
                { type: 'image', key: 'tileset', path: 'Sprites/SUNNYSIDE_WORLD_ASSETS_V0.2/TILESET/SunnysideWorld_Tileset_V0.1.png' },
                { type: 'image', key: 'ui_elements', path: 'Sprites/SUNNYSIDEWORLD_UI_V1.0/PNG/Blue/Default/button_square_header_large_square_screws.png' },
                
                // ===== BACKGROUND MUSIC (Legacy) =====
                { type: 'audio', key: 'bgm_main', path: 'Sounds/BGM/TownTheme.mp3', optional: true },
                { type: 'audio', key: 'bgm_caketown', path: 'Sounds/BGM/Caketown 1.mp3', optional: true },
                { type: 'audio', key: 'bgm_waves', path: 'Sounds/BGM/Waves of Destiny ext v2.mp3', optional: true },
                { type: 'audio', key: 'bgm_whispers', path: 'Sounds/BGM/Whispers of the Deep ext v1.mp3', optional: true },

                // ===== RSE SOUNDFX COLLECTION =====
                // Core RSE SoundFX Effects
                { type: 'audio', key: 'sfx_click1', path: 'Sounds/SFX/RSE/click1.mp3', optional: true },
                { type: 'audio', key: 'sfx_beep1', path: 'Sounds/SFX/RSE/beep1.mp3', optional: true },
                { type: 'audio', key: 'sfx_bling1', path: 'Sounds/SFX/RSE/bling1.mp3', optional: true },
                { type: 'audio', key: 'sfx_error1', path: 'Sounds/SFX/RSE/error1.mp3', optional: true },
                { type: 'audio', key: 'sfx_chime1', path: 'Sounds/SFX/RSE/chime1.mp3', optional: true },
                { type: 'audio', key: 'sfx_splash1', path: 'Sounds/SFX/RSE/splash1.mp3', optional: true },

                // ===== 3D MODELS =====
                { type: 'model', key: 'water_tank_3d', path: 'models/buildings/Water Tank.glb', optional: true },

                // ===== LEGACY SOUND EFFECTS (Existing) =====
                { type: 'audio', key: 'sfx_pickup', path: 'Sounds/SFX/Environment/pickup.wav', optional: true },
                { type: 'audio', key: 'sfx_item', path: 'Sounds/SFX/Environment/item_sound.wav', optional: true },
                { type: 'audio', key: 'sfx_walk', path: 'Sounds/SFX/Environment/walk.wav', optional: true },
                { type: 'audio', key: 'sfx_watering', path: 'Sounds/SFX/Player/watering.wav', optional: true },
                { type: 'audio', key: 'sfx_dig', path: 'Sounds/SFX/Player/dig.ogg', optional: true },
                { type: 'audio', key: 'sfx_axe', path: 'Sounds/SFX/Player/axe.wav', optional: true },
                
                // Texturas procedurais (criadas em código)
                { type: 'procedural', key: 'water_texture' },
                { type: 'procedural', key: 'grass_texture' },
                { type: 'procedural', key: 'concrete_texture' },
                { type: 'procedural', key: 'metal_texture' }
            ];
            
            loader.totalAssets = assetList.length;
            
            // Carregar assets em paralelo
            const loadPromises = assetList.map(asset => loader.loadAsset(asset));
            await Promise.allSettled(loadPromises);
            
            console.log('✅ Carregamento de assets concluído');
            return loader.loadedAssets;
            
        } catch (error) {
            console.error('❌ Erro no carregamento de assets:', error);
            throw error;
        }
    }
    
    // ===== CARREGAMENTO INDIVIDUAL =====
    async loadAsset(assetInfo) {
        const { type, key, path, optional = false } = assetInfo;
        
        try {
            let asset = null;
            
            switch (type) {
                case 'image':
                    asset = await this.loadImage(path);
                    break;
                case 'audio':
                    asset = await this.loadAudio(path);
                    break;
                case 'model':
                    asset = await this.loadModel(path);
                    break;
                case 'procedural':
                    asset = this.createProceduralTexture(key);
                    break;
                default:
                    throw new Error(`Tipo de asset desconhecido: ${type}`);
            }
            
            if (asset) {
                this.loadedAssets.set(key, asset);
                console.log(`✅ Asset carregado: ${key}`);
            }
            
        } catch (error) {
            if (optional) {
                console.warn(`⚠️ Asset opcional não encontrado: ${key} (${path})`);
            } else {
                console.error(`❌ Erro ao carregar asset: ${key}`, error);
                // Para assets não opcionais, criar fallback
                this.createFallbackAsset(key, type);
            }
        }
        
        this.loadedCount++;
        this.updateProgress();
    }
    
    // ===== CARREGAMENTO DE IMAGENS =====
    loadImage(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                // Criar canvas para manipulação se necessário
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                resolve({
                    image: img,
                    canvas: canvas,
                    context: ctx,
                    width: img.width,
                    height: img.height
                });
            };
            
            img.onerror = () => {
                reject(new Error(`Falha ao carregar imagem: ${path}`));
            };
            
            img.src = path;
        });
    }
    
    // ===== CARREGAMENTO DE ÁUDIO =====
    loadAudio(path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            
            audio.oncanplaythrough = () => {
                resolve({
                    audio: audio,
                    duration: audio.duration,
                    play: () => audio.play(),
                    pause: () => audio.pause(),
                    setVolume: (volume) => { audio.volume = Math.max(0, Math.min(1, volume)); },
                    setLoop: (loop) => { audio.loop = loop; }
                });
            };
            
            audio.onerror = () => {
                reject(new Error(`Falha ao carregar áudio: ${path}`));
            };
            
            audio.src = path;
            audio.load();
        });
    }

    // ===== CARREGAMENTO DE MODELOS 3D =====
    loadModel(path) {
        return new Promise((resolve, reject) => {
            // Store the model path for later loading in Babylon.js scene
            // We can't load the actual model here since we need a Babylon.js scene
            resolve({
                path: path,
                type: 'glb',
                loaded: false,
                loadInScene: async (scene) => {
                    try {
                        console.log(`🎯 Carregando modelo 3D: ${path}`);
                        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", path, scene);
                        console.log(`✅ Modelo 3D carregado: ${path}`);
                        return {
                            meshes: result.meshes,
                            rootMesh: result.meshes[0],
                            animationGroups: result.animationGroups,
                            skeletons: result.skeletons,
                            loaded: true
                        };
                    } catch (error) {
                        console.error(`❌ Erro ao carregar modelo 3D ${path}:`, error);
                        throw error;
                    }
                }
            });
        });
    }

    // ===== TEXTURAS PROCEDURAIS =====
    createProceduralTexture(key) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 256;
        
        switch (key) {
            case 'water_texture':
                this.generateWaterTexture(ctx, canvas.width, canvas.height);
                break;
            case 'grass_texture':
                this.generateGrassTexture(ctx, canvas.width, canvas.height);
                break;
            case 'concrete_texture':
                this.generateConcreteTexture(ctx, canvas.width, canvas.height);
                break;
            case 'metal_texture':
                this.generateMetalTexture(ctx, canvas.width, canvas.height);
                break;
            default:
                this.generateDefaultTexture(ctx, canvas.width, canvas.height);
        }
        
        return {
            canvas: canvas,
            context: ctx,
            width: canvas.width,
            height: canvas.height,
            dataURL: canvas.toDataURL()
        };
    }
    
    generateWaterTexture(ctx, width, height) {
        // Gradiente azul com ondas
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#4FC3F7');
        gradient.addColorStop(0.5, '#29B6F6');
        gradient.addColorStop(1, '#0288D1');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Adicionar ondas
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        for (let y = 0; y < height; y += 20) {
            ctx.beginPath();
            for (let x = 0; x < width; x += 5) {
                const waveY = y + Math.sin(x * 0.02) * 3;
                if (x === 0) ctx.moveTo(x, waveY);
                else ctx.lineTo(x, waveY);
            }
            ctx.stroke();
        }
    }
    
    generateGrassTexture(ctx, width, height) {
        // Base verde
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, width, height);
        
        // Adicionar variação
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 3 + 1;
            
            ctx.fillStyle = `hsl(${100 + Math.random() * 40}, 60%, ${30 + Math.random() * 20}%)`;
            ctx.fillRect(x, y, size, size);
        }
    }
    
    generateConcreteTexture(ctx, width, height) {
        // Base cinza
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(0, 0, width, height);
        
        // Adicionar ruído
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const brightness = Math.random() * 50 + 100;
            
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    
    generateMetalTexture(ctx, width, height) {
        // Base metálica
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#CFD8DC');
        gradient.addColorStop(0.5, '#90A4AE');
        gradient.addColorStop(1, '#607D8B');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Adicionar reflexos
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + 20, height);
            ctx.stroke();
        }
    }
    
    generateDefaultTexture(ctx, width, height) {
        // Textura padrão xadrez
        const cellSize = 16;
        for (let x = 0; x < width; x += cellSize) {
            for (let y = 0; y < height; y += cellSize) {
                const isEven = ((x / cellSize) + (y / cellSize)) % 2 === 0;
                ctx.fillStyle = isEven ? '#FFFFFF' : '#CCCCCC';
                ctx.fillRect(x, y, cellSize, cellSize);
            }
        }
    }
    
    // ===== FALLBACKS =====
    createFallbackAsset(key, type) {
        console.log(`🔄 Criando fallback para: ${key}`);
        
        switch (type) {
            case 'image':
                this.loadedAssets.set(key, this.createFallbackImage());
                break;
            case 'audio':
                this.loadedAssets.set(key, this.createFallbackAudio());
                break;
        }
    }
    
    createFallbackImage() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;
        
        // Criar imagem de erro
        ctx.fillStyle = '#FF5722';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('?', 32, 40);
        
        return {
            canvas: canvas,
            context: ctx,
            width: 64,
            height: 64
        };
    }
    
    createFallbackAudio() {
        return {
            audio: null,
            duration: 0,
            play: () => console.log('🔇 Audio fallback - sem som'),
            pause: () => {},
            setVolume: () => {},
            setLoop: () => {}
        };
    }
    
    // ===== PROGRESSO =====
    updateProgress() {
        const percentage = (this.loadedCount / this.totalAssets) * 100;
        
        if (this.onProgressCallback) {
            this.onProgressCallback(percentage);
        }
        
        console.log(`📦 Progresso: ${this.loadedCount}/${this.totalAssets} (${percentage.toFixed(1)}%)`);
    }
    
    // ===== ACESSO AOS ASSETS =====
    static getAsset(key) {
        return AssetLoader.instance?.loadedAssets.get(key) || null;
    }
    
    static hasAsset(key) {
        return AssetLoader.instance?.loadedAssets.has(key) || false;
    }
    
    static getAllAssets() {
        return AssetLoader.instance?.loadedAssets || new Map();
    }
    
    // ===== UTILITÁRIOS =====
    static createBabylonTexture(key, scene) {
        const asset = AssetLoader.getAsset(key);
        if (asset && asset.canvas) {
            return new BABYLON.Texture(asset.canvas.toDataURL(), scene);
        }
        return null;
    }
    
    static createBabylonMaterial(key, scene, materialName) {
        const texture = AssetLoader.createBabylonTexture(key, scene);
        if (texture) {
            const material = new BABYLON.StandardMaterial(materialName, scene);
            material.diffuseTexture = texture;
            return material;
        }
        return null;
    }
    
    // ===== CLEANUP =====
    dispose() {
        this.loadedAssets.clear();
        this.loadingPromises.clear();
        console.log('🗑️ AssetLoader disposed');
    }
}

// Instância singleton
AssetLoader.instance = null;

console.log('📦 AssetLoader carregado');
