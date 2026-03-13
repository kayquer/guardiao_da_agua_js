/**
 * GUARDIÃO DA ÁGUA - GAME OVER SYSTEM
 * Sistema de detecção de condições de fim de jogo e exibição de diálogo educacional
 */

class GameOverSystem {
    constructor(gameManager) {
        console.log('💀 Inicializando GameOverSystem...');

        this.gameManager = gameManager;
        this.isGameOver = false;
        this.gameOverReason = null;
        
        // 3D Portrait System (reuse from tutorial)
        this.portraitEngine = null;
        this.portraitScene = null;
        this.portraitCamera = null;
        this.portraitModel = null;
        this.use3DPortrait = true;
        
        // Animation system
        this.animationData = {
            time: 0,
            blinkTimer: 0,
            breathTimer: 0,
            hairWaveOffset: 0,
            meshParts: {}
        };

        // Game over conditions
        this.conditions = {
            waterDepleted: {
                check: () => {
                    const water = this.gameManager.resourceManager.getResource('water');
                    return water && water.current <= 0;
                },
                reason: 'water_depleted'
            },
            pollutionCritical: {
                check: () => {
                    const pollution = this.gameManager.resourceManager.getResource('pollution');
                    return pollution && pollution.current >= 100;
                },
                reason: 'pollution_critical'
            }
        };

        // Game over messages
        this.messages = this.createGameOverMessages();

        console.log('✅ GameOverSystem inicializado');
    }

    /**
     * Create game over messages for different failure conditions
     */
    createGameOverMessages() {
        return {
            water_depleted: {
                character: 'Claudia',
                portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=sad',
                background: 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?q=80&w=1080',
                title: 'A Cidade Ficou Sem Água! 💧',
                text: `<p>Infelizmente, a cidade esgotou completamente suas reservas de água. A população está enfrentando uma crise hídrica severa.</p>
                
                <p><strong>O que aconteceu?</strong></p>
                <ul>
                    <li>💧 A produção de água não acompanhou o consumo da população</li>
                    <li>🏗️ Faltaram <b>Bombas de Água</b> e <b>Estações de Tratamento</b></li>
                    <li>📊 O monitoramento dos recursos não foi suficiente</li>
                </ul>
                
                <p><strong>Dicas para a próxima vez:</strong></p>
                <ul>
                    <li>🔬 Construa <b>Centros de Pesquisa</b> para monitorar os recursos</li>
                    <li>💧 Instale mais <b>Bombas de Água</b> antes que a população cresça muito</li>
                    <li>🌳 Plante <b>Mata Ciliar</b> para proteger as nascentes</li>
                    <li>⚖️ Equilibre o crescimento urbano com a capacidade hídrica</li>
                </ul>`,
                icon: '💧'
            },
            pollution_critical: {
                character: 'Claudia',
                portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=sad',
                background: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?q=80&w=1080',
                title: 'Poluição Crítica! ☣️',
                text: `<p>A poluição atingiu níveis críticos e tornou a água imprópria para consumo. A saúde pública está em risco.</p>
                
                <p><strong>O que aconteceu?</strong></p>
                <ul>
                    <li>☣️ A poluição acumulou mais rápido do que a capacidade de tratamento</li>
                    <li>🏭 Faltaram <b>Estações de Tratamento de Esgoto</b></li>
                    <li>🌿 Não havia <b>Jardins Flutuantes</b> suficientes para filtrar a água</li>
                </ul>
                
                <p><strong>Dicas para a próxima vez:</strong></p>
                <ul>
                    <li>🏭 Construa <b>Estações de Tratamento</b> antes que a poluição aumente</li>
                    <li>🌿 Use <b>Jardins Flutuantes</b> para redução natural de poluição</li>
                    <li>🔬 Invista em <b>Centros de Pesquisa</b> para monitorar a qualidade da água</li>
                    <li>🌳 Plante <b>Mata Ciliar</b> para filtrar poluentes naturalmente</li>
                    <li>⚖️ Gerencie a agricultura com cuidado para evitar agrotóxicos no rio</li>
                </ul>`,
                icon: '☣️'
            }
        };
    }

    /**
     * Check game over conditions every update
     */
    update(deltaTime) {
        if (this.isGameOver) return;

        // Check all conditions
        for (const [key, condition] of Object.entries(this.conditions)) {
            if (condition.check()) {
                this.triggerGameOver(condition.reason);
                break;
            }
        }
    }

    /**
     * Trigger game over with specific reason
     */
    triggerGameOver(reason) {
        if (this.isGameOver) return;

        console.log(`💀 Game Over: ${reason}`);
        this.isGameOver = true;
        this.gameOverReason = reason;

        // Pause the game
        this.gameManager.gameState = 'gameover';

        // Show game over dialog
        this.showGameOverDialog();
    }

    /**
     * Show game over dialog using tutorial-style UI
     */
    async showGameOverDialog() {
        const container = document.getElementById('gameover-container');
        if (!container) {
            console.error('❌ Game over container not found');
            return;
        }

        // Show container
        container.style.display = 'flex';

        // Initialize 3D portrait if enabled
        if (this.use3DPortrait) {
            const initialized = await this.initialize3DPortrait();
            if (initialized) {
                await this.load3DCharacter('Claudia');
            } else {
                console.warn('⚠️ Falling back to 2D portraits');
                this.use3DPortrait = false;
            }
        }

        // Render the message
        this.renderGameOverMessage();
    }

    /**
     * Render game over message based on failure reason
     */
    renderGameOverMessage() {
        const message = this.messages[this.gameOverReason];
        if (!message) {
            console.error('❌ No message found for reason:', this.gameOverReason);
            return;
        }

        // Update background
        const background = document.getElementById('gameover-background');
        if (background) {
            background.style.backgroundImage = `url('${message.background}')`;
        }

        // Handle portrait display (3D or 2D)
        const portrait = document.getElementById('gameover-portrait');
        const portraitCanvas = document.getElementById('gameover-portrait-canvas');

        if (this.use3DPortrait && this.portraitScene) {
            if (portraitCanvas) portraitCanvas.style.display = 'block';
            if (portrait) portrait.style.display = 'none';
        } else {
            if (portraitCanvas) portraitCanvas.style.display = 'none';
            if (portrait) {
                portrait.style.display = 'block';
                portrait.src = message.portrait;
                portrait.alt = message.character;
            }
        }

        // Update dialog content
        const icon = document.getElementById('gameover-icon');
        if (icon) icon.textContent = message.icon;

        const title = document.getElementById('gameover-title');
        if (title) title.textContent = message.title;

        const text = document.getElementById('gameover-text');
        if (text) text.innerHTML = message.text;

        const character = document.getElementById('gameover-character-name');
        if (character) character.textContent = message.character;
    }

    /**
     * Initialize 3D portrait system (reuse tutorial code)
     */
    async initialize3DPortrait() {
        const canvas = document.getElementById('gameover-portrait-canvas');
        if (!canvas) {
            console.warn('⚠️ Game over portrait canvas not found');
            return false;
        }

        try {
            this.portraitEngine = new BABYLON.Engine(canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true
            });

            this.portraitScene = new BABYLON.Scene(this.portraitEngine);
            this.portraitScene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

            this.portraitCamera = new BABYLON.ArcRotateCamera(
                'portraitCamera',
                Math.PI / 2,
                Math.PI / 2.5,
                3,
                new BABYLON.Vector3(0, 1, 0),
                this.portraitScene
            );
            this.portraitCamera.lowerRadiusLimit = 2;
            this.portraitCamera.upperRadiusLimit = 5;
            this.portraitCamera.attachControl(canvas, false);

            // Add lighting
            const light1 = new BABYLON.HemisphericLight(
                'portraitLight1',
                new BABYLON.Vector3(0, 1, 0),
                this.portraitScene
            );
            light1.intensity = 1.2;

            const light2 = new BABYLON.DirectionalLight(
                'portraitLight2',
                new BABYLON.Vector3(-1, -2, -1),
                this.portraitScene
            );
            light2.intensity = 0.8;

            // Start render loop
            this.portraitEngine.runRenderLoop(() => {
                if (this.portraitScene) {
                    this.portraitScene.render();
                }
            });

            window.addEventListener('resize', () => {
                if (this.portraitEngine) {
                    this.portraitEngine.resize();
                }
            });

            console.log('✅ Game over 3D portrait initialized');
            return true;
        } catch (error) {
            console.error('❌ Error initializing game over portrait:', error);
            return false;
        }
    }

    /**
     * Load 3D character model (simplified from tutorial)
     */
    async load3DCharacter(characterName = 'Claudia') {
        if (!this.portraitScene) return false;

        try {
            if (this.portraitModel) {
                this.portraitModel.dispose();
                this.portraitModel = null;
            }

            const modelFolder = 'models/Characters/girl-reading-a-book-icon-obj/';
            const modelFile = 'girl-reading-a-book-icon.obj';

            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                '',
                modelFolder,
                modelFile,
                this.portraitScene
            );

            if (result.meshes && result.meshes.length > 0) {
                this.portraitModel = new BABYLON.TransformNode('characterModel', this.portraitScene);
                result.meshes.forEach(mesh => {
                    if (mesh.parent === null) {
                        mesh.parent = this.portraitModel;
                    }
                });

                // Auto-position model
                const meshes = result.meshes.filter(m => m.name !== '__root__' && m instanceof BABYLON.Mesh);
                if (meshes.length > 0) {
                    let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
                    let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);

                    meshes.forEach(mesh => {
                        mesh.computeWorldMatrix(true);
                        const boundingInfo = mesh.getBoundingInfo();
                        min = BABYLON.Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
                        max = BABYLON.Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
                    });

                    const center = BABYLON.Vector3.Center(min, max);
                    const size = max.subtract(min);
                    const maxDimension = Math.max(size.x, size.y, size.z);
                    const scale = 2 / maxDimension;

                    this.portraitModel.scaling = new BABYLON.Vector3(scale, scale, scale);
                    this.portraitModel.position = center.scale(scale).negate();
                    this.portraitCamera.target = new BABYLON.Vector3(0, 0, 0);
                    this.portraitCamera.radius = 4;
                }

                // Apply PBR textures
                const texturePath = 'models/Characters/girl-reading-a-book-icon-obj/textures/';
                const texturePrefix = 'girl-reading-a-book-icon-001-';
                await this.applyPBRTextures(meshes, texturePath, texturePrefix);

                return true;
            }
        } catch (error) {
            console.error('❌ Error loading game over character:', error);
            return false;
        }

        return false;
    }

    /**
     * Apply PBR textures to meshes (same as TutorialSystem)
     */
    async applyPBRTextures(meshes, texturePath, texturePrefix) {
        try {
            meshes.forEach(mesh => {
                if (mesh.material) {
                    mesh.material.dispose();
                    mesh.material = null;
                }
            });

            const pbr = new BABYLON.PBRMaterial('characterPBR', this.portraitScene);

            pbr.albedoTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'col-metalness-4k.png',
                this.portraitScene
            );

            const normalTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'nrm-metalness-4k.png',
                this.portraitScene
            );
            pbr.bumpTexture = normalTexture;
            pbr.invertNormalMapX = false;
            pbr.invertNormalMapY = false;

            const roughnessTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'roughness-metalness-4k.png',
                this.portraitScene
            );
            pbr.metallicTexture = roughnessTexture;
            pbr.useRoughnessFromMetallicTextureAlpha = false;
            pbr.useRoughnessFromMetallicTextureGreen = true;
            pbr.useMetallnessFromMetallicTextureBlue = false;
            pbr.metallic = 0.0;
            pbr.roughness = 1.0;

            const aoTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'ao-metalness-4k.png',
                this.portraitScene
            );
            pbr.ambientTexture = aoTexture;
            pbr.ambientTextureStrength = 1.0;

            pbr.directIntensity = 1.0;
            pbr.environmentIntensity = 1.0;
            pbr.specularIntensity = 0.5;
            pbr.albedoColor = new BABYLON.Color3(1, 1, 1);

            meshes.forEach(mesh => {
                mesh.material = pbr;
            });

            console.log(`✅ PBR textures applied to ${meshes.length} meshes (game over)`);
        } catch (error) {
            console.error('❌ Error loading game over textures:', error);

            const fallbackMat = new BABYLON.StandardMaterial('characterFallback', this.portraitScene);
            fallbackMat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 0.7);
            fallbackMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

            meshes.forEach(mesh => {
                mesh.material = fallbackMat;
            });
        }
    }

    /**
     * Return to main menu
     */
    returnToMainMenu() {
        console.log('🔙 Returning to main menu...');

        // Dispose 3D portrait
        this.dispose3DPortrait();

        // Hide game over container
        const container = document.getElementById('gameover-container');
        if (container) {
            container.style.display = 'none';
        }

        // Reset game over state
        this.isGameOver = false;
        this.gameOverReason = null;

        // Return to main menu (use global showScreen function)
        if (typeof showScreen === 'function') {
            showScreen('main-menu');
        } else {
            console.error('❌ showScreen function not found');
        }
    }

    /**
     * Dispose 3D portrait system
     */
    dispose3DPortrait() {
        if (this.portraitModel) {
            this.portraitModel.dispose();
            this.portraitModel = null;
        }
        if (this.portraitScene) {
            this.portraitScene.dispose();
            this.portraitScene = null;
        }
        if (this.portraitEngine) {
            this.portraitEngine.dispose();
            this.portraitEngine = null;
        }
    }

    /**
     * Cleanup
     */
    dispose() {
        this.dispose3DPortrait();
        console.log('🗑️ GameOverSystem disposed');
    }
}

// Export to global scope
window.GameOverSystem = GameOverSystem;
console.log('💀 GameOverSystem carregado e exportado para window.GameOverSystem');
