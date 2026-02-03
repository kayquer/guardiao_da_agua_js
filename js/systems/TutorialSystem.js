/**
 * GUARDIÃO DA ÁGUA - TUTORIAL SYSTEM
 * Sistema de tutorial educacional com interface RPG para crianças de 11-14 anos
 */

class TutorialSystem {
    constructor(gameManager) {
        console.log('📚 Inicializando TutorialSystem...');

        this.gameManager = gameManager;
        this.currentStep = 0;
        this.isActive = false;
        this.canSkip = true; // Allow skipping for testing

        // 3D Portrait System
        this.portraitEngine = null;
        this.portraitScene = null;
        this.portraitCamera = null;
        this.portraitModel = null;
        this.currentCharacter = null; // Track current loaded character
        this.use3DPortrait = true; // Enable 3D portraits
        
        // Animation system
        this.animationData = {
            time: 0,
            blinkTimer: 0,
            breathTimer: 0,
            hairWaveOffset: 0,
            meshParts: {} // Store references to specific body parts
        }

        // Tutorial steps with educational content
        this.tutorialSteps = this.createTutorialSteps();

        // FIX #1: Setup event listeners for tutorial navigation buttons
        this.setupEventListeners();

        console.log('✅ TutorialSystem inicializado');
    }

    /**
     * FIX #1: Setup event listeners for tutorial control buttons
     */
    setupEventListeners() {
        // Skip button
        const skipBtn = document.getElementById('tutorial-skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                if (confirm('Tem certeza que deseja pular o tutorial?')) {
                    this.skip();
                }
            });
        }

        // Previous button
        const prevBtn = document.getElementById('tutorial-prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.previous();
            });
        }

        // Next button
        const nextBtn = document.getElementById('tutorial-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.next();
            });
        }

        console.log('✅ Tutorial event listeners configured');
    }

    /**
     * Initialize 3D portrait system
     */
    async initialize3DPortrait() {
        const canvas = document.getElementById('tutorial-portrait-canvas');
        if (!canvas) {
            console.warn('⚠️ Tutorial portrait canvas not found');
            return false;
        }

        try {
            // Create Babylon.js engine for portrait
            this.portraitEngine = new BABYLON.Engine(canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true
            });

            // Create scene
            this.portraitScene = new BABYLON.Scene(this.portraitEngine);
            this.portraitScene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Transparent background

            // Create camera
            this.portraitCamera = new BABYLON.ArcRotateCamera(
                'portraitCamera',
                Math.PI / 2, // Alpha (horizontal rotation)
                Math.PI / 2.5, // Beta (vertical rotation)
                3, // Radius
                new BABYLON.Vector3(0, 1, 0), // Target
                this.portraitScene
            );
            this.portraitCamera.lowerRadiusLimit = 2;
            this.portraitCamera.upperRadiusLimit = 5;
            this.portraitCamera.attachControl(canvas, false);

            // Add lighting optimized for PBR materials
            const light1 = new BABYLON.HemisphericLight(
                'portraitLight1',
                new BABYLON.Vector3(0, 1, 0),
                this.portraitScene
            );
            light1.intensity = 1.2;
            light1.diffuse = new BABYLON.Color3(1, 1, 1);
            light1.specular = new BABYLON.Color3(1, 1, 1);
            light1.groundColor = new BABYLON.Color3(0.5, 0.5, 0.5);

            const light2 = new BABYLON.DirectionalLight(
                'portraitLight2',
                new BABYLON.Vector3(-1, -2, -1),
                this.portraitScene
            );
            light2.intensity = 0.8;
            light2.diffuse = new BABYLON.Color3(1, 0.95, 0.9);
            light2.specular = new BABYLON.Color3(0.8, 0.8, 0.8);

            // Add fill light for better 3D appearance
            const light3 = new BABYLON.DirectionalLight(
                'portraitLight3',
                new BABYLON.Vector3(1, 0, 1),
                this.portraitScene
            );
            light3.intensity = 0.3;
            light3.diffuse = new BABYLON.Color3(0.8, 0.9, 1.0);
            
            // Create environment for PBR reflections
            const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
                "https://assets.babylonjs.com/environments/environmentSpecular.env",
                this.portraitScene
            );
            this.portraitScene.environmentTexture = hdrTexture;
            this.portraitScene.environmentIntensity = 0.5;

            // Start render loop
            this.portraitEngine.runRenderLoop(() => {
                if (this.portraitScene) {
                    this.portraitScene.render();
                }
            });

            // Handle resize
            window.addEventListener('resize', () => {
                if (this.portraitEngine) {
                    this.portraitEngine.resize();
                }
            });

            console.log('✅ 3D Portrait system initialized');
            return true;
        } catch (error) {
            console.error('❌ Error initializing 3D portrait:', error);
            return false;
        }
    }

    /**
     * Load 3D character model with auto-positioning and PBR textures
     */
    async load3DCharacter(characterName = 'Claudia') {
        if (!this.portraitScene) {
            console.warn('⚠️ Portrait scene not initialized');
            return false;
        }

        try {
            // Remove existing model
            if (this.portraitModel) {
                this.portraitModel.dispose();
                this.portraitModel = null;
            }

            console.log(`📦 Loading ${characterName} OBJ model...`);

            // Determine model path based on character
            let modelFolder, modelFile, texturePath, texturePrefix;
            
            switch(characterName.toLowerCase()) {
                case 'gil, o lambari':
                case 'gil':
                case 'fish':
                    modelFolder = 'models/Characters/fish-icon/';
                    modelFile = 'fish-icon.obj';
                    texturePath = 'models/Characters/fish-icon/textures/';
                    texturePrefix = 'fish-icon-003-';
                    break;
                case 'dr. sapo':
                case 'sapo':
                case 'frog':
                    modelFolder = 'models/Characters/frog-icon-obj/';
                    modelFile = 'frog-icon.obj';
                    texturePath = 'models/Characters/frog-icon-obj/textures/';
                    texturePrefix = 'frog-icon-001-';
                    break;
                default: // Claudia
                    modelFolder = 'models/Characters/girl-reading-a-book-icon-obj/';
                    modelFile = 'girl-reading-a-book-icon.obj';
                    texturePath = 'models/Characters/girl-reading-a-book-icon-obj/textures/';
                    texturePrefix = 'girl-reading-a-book-icon-001-';
            }

            // Load OBJ model
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                '',
                modelFolder,
                modelFile,
                this.portraitScene
            );

            if (result.meshes && result.meshes.length > 0) {
                console.log(`✅ Loaded ${result.meshes.length} meshes for ${characterName}`);
                
                // Log all mesh names for debugging
                result.meshes.forEach((mesh, idx) => {
                    console.log(`  Mesh ${idx}: ${mesh.name} (material: ${mesh.material ? mesh.material.name : 'none'})`);
                });

                // Create parent mesh for the model
                this.portraitModel = new BABYLON.TransformNode('characterModel', this.portraitScene);

                // Parent all loaded meshes
                result.meshes.forEach(mesh => {
                    if (mesh.parent === null) {
                        mesh.parent = this.portraitModel;
                    }
                });

                // AUTO-CALCULATE BOUNDING BOX AND POSITION
                const meshes = result.meshes.filter(m => m.name !== '__root__' && m instanceof BABYLON.Mesh);
                console.log(`📊 Filtered to ${meshes.length} renderable meshes`);
                
                if (meshes.length > 0) {
                    // Calculate total bounding box
                    let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
                    let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);

                    meshes.forEach(mesh => {
                        mesh.computeWorldMatrix(true);
                        const boundingInfo = mesh.getBoundingInfo();
                        const meshMin = boundingInfo.boundingBox.minimumWorld;
                        const meshMax = boundingInfo.boundingBox.maximumWorld;

                        min = BABYLON.Vector3.Minimize(min, meshMin);
                        max = BABYLON.Vector3.Maximize(max, meshMax);
                    });

                    // Calculate center and size
                    const center = BABYLON.Vector3.Center(min, max);
                    const size = max.subtract(min);
                    const maxDimension = Math.max(size.x, size.y, size.z);

                    console.log(`📐 Model bounds - Size: ${size.toString()}, Center: ${center.toString()}`);

                    // Auto-scale to fit in camera view (target size ~2 units)
                    const targetSize = 2;
                    const scale = targetSize / maxDimension;
                    this.portraitModel.scaling = new BABYLON.Vector3(scale, scale, scale);

                    // Center the model
                    const scaledCenter = center.scale(scale);
                    this.portraitModel.position = scaledCenter.negate();
                    
                    // Adjust camera to look at model
                    this.portraitCamera.target = new BABYLON.Vector3(0, 0, 0);
                    this.portraitCamera.radius = targetSize * 2;

                    console.log(`✅ Auto-scaled: ${scale.toFixed(4)}x, Position: ${this.portraitModel.position.toString()}`);
                }

                // APPLY PBR TEXTURES
                await this.applyPBRTextures(meshes, texturePath, texturePrefix);

                // IDENTIFY AND STORE MESH PARTS
                this.identifyMeshParts(meshes);

                // START PROCEDURAL ANIMATIONS
                this.startProceduralAnimations();

                console.log('✅ 3D character model loaded and positioned successfully');
                return true;
            }
        } catch (error) {
            console.error('❌ Error loading 3D character:', error);
            console.error(error.stack);
            return false;
        }

        return false;
    }

    /**
     * Apply PBR textures to meshes
     */
    async applyPBRTextures(meshes, texturePath, texturePrefix) {
        console.log('🎨 Applying PBR textures...');
        console.log(`📁 Texture path: ${texturePath}`);
        console.log(`🏷️ Texture prefix: ${texturePrefix}`);

        try {
            // Dispose old materials
            meshes.forEach(mesh => {
                if (mesh.material) {
                    mesh.material.dispose();
                    mesh.material = null;
                }
            });

            // Create PBR material
            const pbr = new BABYLON.PBRMaterial('characterPBR', this.portraitScene);

            // Load albedo/color texture
            const colorTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'col-metalness-4k.png',
                this.portraitScene
            );
            pbr.albedoTexture = colorTexture;
            console.log('✅ Loaded albedo texture');

            // Load normal texture
            const normalTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'nrm-metalness-4k.png',
                this.portraitScene
            );
            pbr.bumpTexture = normalTexture;
            pbr.invertNormalMapX = false;
            pbr.invertNormalMapY = false;
            console.log('✅ Loaded normal texture');

            // Load roughness/metallic texture
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
            console.log('✅ Loaded roughness texture');

            // Load ambient occlusion texture
            const aoTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'ao-metalness-4k.png',
                this.portraitScene
            );
            pbr.ambientTexture = aoTexture;
            pbr.ambientTextureStrength = 1.0;
            console.log('✅ Loaded AO texture');

            // Configure PBR settings
            pbr.directIntensity = 1.0;
            pbr.environmentIntensity = 1.0;
            pbr.specularIntensity = 0.5;
            pbr.albedoColor = new BABYLON.Color3(1, 1, 1);

            // Apply material to all meshes (including root meshes)
            let appliedCount = 0;
            meshes.forEach(mesh => {
                mesh.material = pbr;
                appliedCount++;
            });

            console.log(`✅ PBR material applied to ${appliedCount} meshes`);
        } catch (error) {
            console.error('❌ Error loading textures:', error);
            console.error(error.stack);
            
            // Fallback to simple material with distinct color
            const fallbackMat = new BABYLON.StandardMaterial('characterFallback', this.portraitScene);
            fallbackMat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 0.7);
            fallbackMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            
            meshes.forEach(mesh => {
                mesh.material = fallbackMat;
            });
            
            console.log('⚠️ Using fallback material');
        }
    }

    /**
     * Identify mesh parts for animation
     */
    identifyMeshParts(meshes) {
        console.log('🔍 Identifying mesh parts for animation...');
        
        this.animationData.meshParts = {
            eyes: [],
            hair: [],
            arms: [],
            body: [],
            head: [],
            all: meshes
        };

        meshes.forEach(mesh => {
            const name = mesh.name.toLowerCase();
            
            // Identify eyes
            if (name.includes('eye') || name.includes('olho')) {
                this.animationData.meshParts.eyes.push(mesh);
                console.log(`👁️ Found eye mesh: ${mesh.name}`);
            }
            
            // Identify hair
            if (name.includes('hair') || name.includes('cabelo') || name.includes('pelo')) {
                this.animationData.meshParts.hair.push(mesh);
                console.log(`💇 Found hair mesh: ${mesh.name}`);
            }
            
            // Identify arms
            if (name.includes('arm') || name.includes('braco') || name.includes('braço') || 
                name.includes('hand') || name.includes('mao') || name.includes('mão')) {
                this.animationData.meshParts.arms.push(mesh);
                console.log(`💪 Found arm mesh: ${mesh.name}`);
            }
            
            // Identify head
            if (name.includes('head') || name.includes('cabeca') || name.includes('cabeça')) {
                this.animationData.meshParts.head.push(mesh);
                console.log(`🗣️ Found head mesh: ${mesh.name}`);
            }
            
            // Identify body
            if (name.includes('body') || name.includes('torso') || name.includes('corpo') ||
                name.includes('chest') || name.includes('peito')) {
                this.animationData.meshParts.body.push(mesh);
                console.log(`🫀 Found body mesh: ${mesh.name}`);
            }
        });

        // If no specific parts found, use general approach
        if (this.animationData.meshParts.hair.length === 0) {
            // Assume top meshes are hair (heuristic)
            const topMeshes = meshes.filter(m => {
                const pos = m.getBoundingInfo().boundingBox.centerWorld;
                return pos.y > 0; // Upper half
            });
            this.animationData.meshParts.hair = topMeshes.slice(0, Math.min(5, topMeshes.length));
            console.log(`💇 Auto-detected ${this.animationData.meshParts.hair.length} hair meshes`);
        }

        console.log(`✅ Mesh identification complete`);
    }

    /**
     * Start procedural animations
     */
    startProceduralAnimations() {
        console.log('🎬 Starting procedural animations...');
        
        const deltaTimeMs = 16.67; // Assume 60fps
        
        this.portraitScene.registerBeforeRender(() => {
            if (!this.portraitModel) return;

            const deltaTime = deltaTimeMs / 1000; // Convert to seconds
            this.animationData.time += deltaTime;

            // BREATHING ANIMATION - Subtle body expansion
            this.animateBreathing(this.animationData.time);

            // EYE BLINKING - Periodic blink
            this.animateEyeBlink(this.animationData.time);

            // HAIR WAVE - Gentle hair movement
            this.animateHairWave(this.animationData.time);

            // IDLE MOVEMENT - Slight body sway
            this.animateIdleMovement(this.animationData.time);
        });

        console.log('✅ Procedural animations started');
    }

    /**
     * Animate breathing
     */
    animateBreathing(time) {
        const breathCycle = 4.0; // 4 seconds per breath
        const breathAmount = 0.015; // 1.5% scale change
        
        const breathPhase = Math.sin(time * Math.PI * 2 / breathCycle);
        const scale = 1.0 + breathPhase * breathAmount;

        this.animationData.meshParts.body.forEach(mesh => {
            if (mesh.metadata && mesh.metadata.originalScaling) {
                mesh.scaling.y = mesh.metadata.originalScaling.y * scale;
                mesh.scaling.z = mesh.metadata.originalScaling.z * (1.0 + breathPhase * breathAmount * 0.5);
            } else {
                // Store original scaling on first run
                if (!mesh.metadata) mesh.metadata = {};
                mesh.metadata.originalScaling = mesh.scaling.clone();
            }
        });
    }

    /**
     * Animate eye blinking
     */
    animateEyeBlink(time) {
        // Blink every 3-5 seconds randomly
        const blinkInterval = 3.5;
        const blinkDuration = 0.15; // 150ms blink
        
        const blinkCycle = time % blinkInterval;
        
        if (blinkCycle < blinkDuration) {
            // Blink is happening
            const blinkPhase = blinkCycle / blinkDuration;
            // Create smooth blink curve
            const blinkAmount = Math.sin(blinkPhase * Math.PI);
            const eyeScale = 1.0 - blinkAmount * 0.9; // Close 90%
            
            this.animationData.meshParts.eyes.forEach(mesh => {
                if (!mesh.metadata) mesh.metadata = {};
                if (!mesh.metadata.originalScaling) {
                    mesh.metadata.originalScaling = mesh.scaling.clone();
                }
                mesh.scaling.y = mesh.metadata.originalScaling.y * eyeScale;
            });
        } else {
            // Eyes open
            this.animationData.meshParts.eyes.forEach(mesh => {
                if (mesh.metadata && mesh.metadata.originalScaling) {
                    mesh.scaling.y = mesh.metadata.originalScaling.y;
                }
            });
        }
    }

    /**
     * Animate hair wave
     */
    animateHairWave(time) {
        const waveSpeed = 0.8;
        const waveAmplitude = 0.02;
        
        this.animationData.meshParts.hair.forEach((mesh, index) => {
            if (!mesh.metadata) mesh.metadata = {};
            if (!mesh.metadata.originalPosition) {
                mesh.metadata.originalPosition = mesh.position.clone();
                mesh.metadata.hairPhaseOffset = index * 0.3; // Offset each hair mesh
            }

            const phase = time * waveSpeed + mesh.metadata.hairPhaseOffset;
            const wave = Math.sin(phase) * waveAmplitude;
            const wave2 = Math.cos(phase * 1.3) * waveAmplitude * 0.5;
            
            mesh.position.x = mesh.metadata.originalPosition.x + wave;
            mesh.position.z = mesh.metadata.originalPosition.z + wave2;
        });
    }

    /**
     * Animate idle movement
     */
    animateIdleMovement(time) {
        const swaySpeed = 0.5;
        const swayAmount = 0.008; // Small sway
        
        const swayX = Math.sin(time * swaySpeed) * swayAmount;
        const swayZ = Math.cos(time * swaySpeed * 0.7) * swayAmount * 0.5;
        
        if (this.portraitModel) {
            if (!this.portraitModel.metadata) {
                this.portraitModel.metadata = {
                    originalRotation: this.portraitModel.rotation.clone()
                };
            }
            
            this.portraitModel.rotation.z = this.portraitModel.metadata.originalRotation.z + swayX;
            this.portraitModel.rotation.x = this.portraitModel.metadata.originalRotation.x + swayZ;
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
        
        // Reset animation data
        this.animationData = {
            time: 0,
            blinkTimer: 0,
            breathTimer: 0,
            hairWaveOffset: 0,
            meshParts: {}
        };
    }

    /**
     * Creates all tutorial steps with educational content
     */
 createTutorialSteps() {
    return [
        // Step 1: Introduction & Responsibility
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1080',
            title: 'Precisamos da sua ajuda, Guardião.',
            text: 'Olá, eu sou a Pesquisadora Cláudia. A situação dos nossos recursos hídricos chegou a um ponto crítico. <img src="https://images.unsplash.com/photo-1573166675921-076ea6b621ce?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Eu estarei aqui para dar suporte técnico, mas as decisões estratégicas serão suas. Vamos começar entendendo o fluxo da vida?',
            icon: '👋'
        },
        
        // Step 2: Concepts - Resources & Cycle
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1080',
            title: 'O Motor da Vida',
            text: 'Tudo depende do <b>ciclo hidrológico</b>. A água evapora, forma nuvens e retorna como chuva para abastecer nossos rios. <img src="https://images.unsplash.com/photo-1534274988757-a28bf1f539cf?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Se quebrarmos um elo desse ciclo, o sistema entra em colapso. Mas onde exatamente essa água se concentra?',
            icon: '🔄',
            educationalTopic: 'ciclo_hidrologico'
        },
        
        // Step 3: Concept - Watershed
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1504198458649-3128b932f49e?q=80&w=1080',
            title: 'O Território: A Bacia Hidrográfica',
            text: 'Imagine a região como uma grande tigela. Isso é a <b>Bacia Hidrográfica</b>. <img src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Toda gota que cai nas bordas escorre para o mesmo rio principal. O que você faz no alto do morro impacta quem vive lá embaixo.',
            icon: '🏞️',
            educationalTopic: 'bacia_hidrografica'
        },
        
        // Step 4: Research Centers
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1080',
            title: 'Ciência como Bússola',
            text: 'Os <b>Centros de Pesquisa</b> são seus olhos. Eles monitoram a qualidade da água e indicam problemas invisíveis. <img src="https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Sem ciência, estamos apenas adivinhando, especialmente diante dos desafios da agricultura.',
            icon: '🔬',
            educationalTopic: 'centros_pesquisa'
        },
        
        // Step 5: Agriculture Dilemma
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1080',
            title: 'O Desafio da Produção',
            text: 'A <b>produção de cana</b> e a <b>pecuária</b> movem a economia, mas exigem muita água e cuidado com <b>agrotóxicos</b>. <img src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Seu papel é buscar o equilíbrio. E por falar em equilíbrio, veja quem depende diretamente da pureza desse rio...',
            icon: '⚖️',
            educationalTopic: 'agricultura_agua'
        },

        // Step 6: Riparian Forest & APP (Gil o Peixe)
        {
            character: 'Gil, o Lambari',
            portrait: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1080',
            title: 'Glub! Preciso de sombra!',
            text: 'Oi! Eu sou o Gil. Para nós, peixes, a <b>Mata Ciliar</b> é vital! <img src="https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Ela funciona como os cílios do rio, protegendo a água do sol forte e mantendo a temperatura fresca para nossos ovos nas <b>APPs</b>.',
            icon: '🐟',
            educationalTopic: 'mata_ciliar_app'
        },

        // Step 7: Erosion & Sedimentation (Gil o Peixe)
        {
            character: 'Gil, o Lambari',
            portrait: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1599940824399-b87987ce0799?q=80&w=1080',
            title: 'Minhas brânquias ardem!',
            text: 'Quando tiram as árvores, a terra cai no rio. Isso é <b>erosão</b> e causa o <b>assoreamento</b>. <img src="https://images.unsplash.com/photo-1463123081488-729f65199f0e?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> O rio fica raso e barrento. É horrível respirar com lama nas brânquias! Mas o Dr. Sapo tem um alerta ainda mais grave...',
            icon: '🧱',
            educationalTopic: 'erosao_assoreamento'
        },

        // Step 8: Sewage & Contamination Details
        {
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1573166675921-076ea6b621ce?q=80&w=1080',
            title: 'Alerta de Toxicidade! ☣️',
            text: 'Croac! Cuidado com o <b>esgoto</b>! Ele consome o <b>oxigênio dissolvido</b> que o Gil usa para respirar. <img src="https://images.unsplash.com/photo-1535025639604-9a804c092faa?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Sem tratamento, a água vira um veneno para todos nós. E não é só o que vemos na superfície que corre perigo...',
            icon: '🤢',
            educationalTopic: 'esgoto_contaminacao'
        },

        // Step 9: Groundwater & Springs
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1633511090164-b43840ea1607?q=80&w=1080',
            title: 'O Perigo Invisível',
            text: 'O que vaza no solo, como o <b>chorume</b>, contamina a <b>água subterrânea</b>. <img src="https://images.unsplash.com/photo-1519331379826-f10be5486c6f?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Um aquífero poluído leva décadas para se recuperar. Proteja as <b>nascentes</b> como tesouros escondidos.',
            icon: '💧',
            educationalTopic: 'agua_subterranea'
        },

        // Step 10: Urban Planning (Várzea)
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1080',
            title: 'A Cidade e o Rio',
            text: 'O rio precisa de espaço. Construir em <b>áreas de várzea</b> é um erro que gera enchentes. <img src="https://images.unsplash.com/photo-1545048702-793e24bb1c33?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Precisamos planejar o crescimento urbano respeitando os limites da natureza.',
            icon: '🏗️',
            educationalTopic: 'ocupacao_urbana'
        },

        // Step 11: Green Infrastructure Solutions
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1080',
            title: 'Tecnologia Verde',
            text: 'Podemos inovar com <b>jardins de chuva</b> e <b>tetos verdes</b> para absorver a água. <img src="https://images.unsplash.com/photo-1536147116438-62679a5e01f2?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> É a engenharia trabalhando como uma esponja natural para a cidade.',
            icon: '🌿',
            educationalTopic: 'infraestrutura_verde'
        },

        // Step 12: Floating Gardens
        {
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1542355554-46329402513f?q=80&w=1080',
            title: 'Ilhas que Limpam',
            text: 'Minha solução favorita: <b>jardins flutuantes</b>! <img src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> As raízes dessas plantas filtram poluentes e criam um habitat perfeito para o Gil e para mim!',
            icon: '🪷',
            educationalTopic: 'jardins_flutuantes'
        },

        // Step 13: Conclusion
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1080',
            title: 'O Comando é Seu',
            text: 'Agora você entende a conexão entre tudo. Agricultura, cidade, floresta e água. <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Suas escolhas definirão nosso futuro. Boa sorte, Guardião.',
            icon: '🎓'
        }
    ];
}

    /**
     * Starts the tutorial
     */
    async start() {
        this.isActive = true;
        this.currentStep = 0;
        this.showTutorialUI();

        // Initialize 3D portrait if enabled
        if (this.use3DPortrait) {
            const initialized = await this.initialize3DPortrait();
            if (initialized) {
                // Load the 3D character model
                await this.load3DCharacter();
            } else {
                console.warn('⚠️ Falling back to 2D portraits');
                this.use3DPortrait = false;
            }
        }

        this.renderCurrentStep();
        console.log('📚 Tutorial iniciado');
    }

    /**
     * Shows the tutorial UI
     */
    showTutorialUI() {
        const tutorialContainer = document.getElementById('tutorial-container');
        if (tutorialContainer) {
            tutorialContainer.style.display = 'flex';
        }
    }

    /**
     * Hides the tutorial UI
     */
    hideTutorialUI() {
        const tutorialContainer = document.getElementById('tutorial-container');
        if (tutorialContainer) {
            tutorialContainer.style.display = 'none';
        }
    }

    /**
     * Renders the current tutorial step
     */
    async renderCurrentStep() {
        const step = this.tutorialSteps[this.currentStep];
        if (!step) return;

        // Handle portrait display (3D or 2D)
        const portrait = document.getElementById('tutorial-portrait');
        const portraitCanvas = document.getElementById('tutorial-portrait-canvas');
        const portraitContainer = document.querySelector('.tutorial-portrait-container');

        // Characters with 3D models
        const has3DModel = ['Claudia', 'Gil, o Lambari', 'Dr. Sapo'].includes(step.character);

        if (this.use3DPortrait && this.portraitScene && has3DModel) {
            // Show 3D portrait for characters with models
            if (portraitCanvas) {
                portraitCanvas.style.display = 'block';
            }
            if (portrait) {
                portrait.style.display = 'none';
            }

            // Load the appropriate character model if not already loaded or if character changed
            if (!this.currentCharacter || this.currentCharacter !== step.character) {
                await this.load3DCharacter(step.character);
                this.currentCharacter = step.character;
            }

            // Set character-specific background for portrait container
            if (portraitContainer) {
                switch(step.character) {
                    case 'Claudia':
                        portraitContainer.style.backgroundImage = 'linear-gradient(135deg, rgba(101, 84, 192, 0.15) 0%, rgba(74, 47, 189, 0.15) 100%), url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=400&h=400&fit=crop")';
                        portraitContainer.style.backgroundSize = 'cover';
                        portraitContainer.style.backgroundPosition = 'center';
                        break;
                    case 'Gil, o Lambari':
                        portraitContainer.style.backgroundImage = 'linear-gradient(135deg, rgba(0, 119, 182, 0.3) 0%, rgba(0, 180, 216, 0.3) 100%), url("https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=400&h=400&fit=crop")';
                        portraitContainer.style.backgroundSize = 'cover';
                        portraitContainer.style.backgroundPosition = 'center';
                        break;
                    case 'Dr. Sapo':
                        portraitContainer.style.backgroundImage = 'linear-gradient(135deg, rgba(46, 125, 50, 0.3) 0%, rgba(27, 94, 32, 0.3) 100%), url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=400&h=400&fit=crop")';
                        portraitContainer.style.backgroundSize = 'cover';
                        portraitContainer.style.backgroundPosition = 'center';
                        break;
                }
            }
        } else {
            // Show 2D portrait for other characters
            if (portraitCanvas) {
                portraitCanvas.style.display = 'none';
            }
            if (portrait) {
                portrait.style.display = 'block';

                // Use emoji SVG as fallback immediately (don't wait for error)
                portrait.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%234a9eff" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="80" text-anchor="middle" dy=".3em"%3E👩‍🔬%3C/text%3E%3C/svg%3E';
                portrait.alt = step.character;

                // Try to load actual image if it exists
                const img = new Image();
                img.onload = () => {
                    portrait.src = step.portrait;
                };
                img.onerror = () => {
                    // Keep the emoji fallback
                    console.log(`ℹ️ Using emoji fallback for portrait: ${step.character}`);
                };
                img.src = step.portrait;
            }

            // Remove background for 2D portraits
            if (portraitContainer) {
                portraitContainer.style.backgroundImage = 'none';
            }
        }

        // FIX #3: Update background with solid color fallback
        const background = document.getElementById('tutorial-background');
        if (background) {
            // Set gradient fallback immediately
            background.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            background.style.backgroundColor = '#667eea';

            // Try to load actual background if it exists
            const img = new Image();
            img.onload = () => {
                background.style.backgroundImage = `url('${step.background}')`;
            };
            img.onerror = () => {
                // Keep the gradient fallback
                console.log(`ℹ️ Using gradient fallback for background`);
            };
            img.src = step.background;
        }

        // Update dialog content
        const icon = document.getElementById('tutorial-icon');
        if (icon) icon.textContent = step.icon;

        const title = document.getElementById('tutorial-title');
        if (title) title.textContent = step.title;

        const text = document.getElementById('tutorial-text');
        if (text) text.innerHTML = step.text;

        const character = document.getElementById('tutorial-character-name');
        if (character) character.textContent = step.character;

        // Update progress
        const progress = document.getElementById('tutorial-progress');
        if (progress) {
            progress.textContent = `${this.currentStep + 1} / ${this.tutorialSteps.length}`;
        }

        // Update button states
        this.updateButtonStates();

        console.log(`📚 Tutorial step ${this.currentStep + 1}/${this.tutorialSteps.length}: ${step.title}`);
    }

    /**
     * Updates button states (enable/disable)
     */
    updateButtonStates() {
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const nextBtn = document.getElementById('tutorial-next-btn');

        if (prevBtn) {
            prevBtn.disabled = this.currentStep === 0;
        }

        if (nextBtn) {
            if (this.currentStep === this.tutorialSteps.length - 1) {
                nextBtn.textContent = 'Começar Jogo!';
            } else {
                nextBtn.textContent = 'Próximo';
            }
        }
    }

    /**
     * Goes to next step
     */
    next() {
        if (this.currentStep < this.tutorialSteps.length - 1) {
            this.currentStep++;
            this.renderCurrentStep();
        } else {
            // Tutorial completed
            this.complete();
        }
    }

    /**
     * Goes to previous step
     */
    previous() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.renderCurrentStep();
        }
    }

    /**
     * Skips the tutorial
     */
    skip() {
        if (this.canSkip) {
            console.log('📚 Tutorial pulado');
            this.complete();
        }
    }

    /**
     * Completes the tutorial
     */
    complete() {
        this.isActive = false;
        this.hideTutorialUI();

        // Dispose 3D portrait system
        this.dispose3DPortrait();

        // Mark tutorial as completed in save data
        if (this.gameManager.saveSystem) {
            this.gameManager.saveSystem.setTutorialCompleted(true);
        }

        console.log('✅ Tutorial concluído');

        // Show welcome notification
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                '🎓 Tutorial concluído! Boa sorte, Guardião da Água!',
                'success',
                5000
            );
        }
    }
}

// Exportar para escopo global
window.TutorialSystem = TutorialSystem;
console.log('📚 TutorialSystem carregado e exportado para window.TutorialSystem');
