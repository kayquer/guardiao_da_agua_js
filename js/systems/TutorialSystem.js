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
            background: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=1080',
            title: 'Bem-vindo, Guardião da Água!',
            text: 'Olá! Eu sou a Pesquisadora Cláudia, e tenho uma missão muito importante para você. Nossa cidade está enfrentando uma crise nos recursos hídricos - a água que usamos para beber, tomar banho e regar as plantações está em risco! <img src="https://images.pexels.com/photos/1481105/pexels-photo-1481105.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Você foi escolhido como o novo <b>Guardião da Água</b>. Eu vou te ensinar tudo sobre como proteger nosso bem mais precioso. Vamos juntos nessa jornada de aprendizado e descoberta?',
            icon: '👋'
        },

        // Step 2: Hidrosfera - Concepts & References
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=1080',
            title: 'A Hidrosfera: Toda a Água do Planeta',
            text: 'Primeiro, vamos entender o que é a <b>hidrosfera</b>. Segundo Oliveira e Santos (2017), a hidrosfera é toda a água presente na superfície e no subsolo do nosso planeta Terra! <img src="UI/JPG/ciclo_agua.jpg" style="width:100%; border-radius:8px; margin:10px 0;"/> Ela está distribuída em três formas: <b>sólida</b> (como gelo nas geleiras), <b>líquida</b> (nos oceanos, rios e lagos) e <b>gasosa</b> (nas nuvens). A água está sempre em movimento - ela nunca para! Esse movimento pode ser rápido, como uma chuva, ou muito lento, demorando até milhões de anos para acontecer.',
            icon: '🌍',
            educationalTopic: 'hidrosfera'
        },

        // Step 3: Concepts - Hydrological Cycle & References
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1080',
            title: 'O Ciclo Hidrológico: O Motor da Vida',
            text: 'Agora vem a parte mais legal! Garcez e Alvarez (1988) explicam que o <b>ciclo hidrológico</b> é como um jogo de transformações mágicas da água. <img src="https://images.pexels.com/photos/531756/pexels-photo-531756.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Imagine: o Sol aquece a água dos rios e ela <b>evapora</b> (vira vapor e sobe). Lá em cima, ela se junta em <b>nuvens</b>. Quando as nuvens ficam pesadas, a água cai como <b>chuva</b>. A chuva abastece os rios, e o ciclo recomeça! Este ciclo tem duas fases principais: a <b>fase atmosférica</b> (o que acontece no céu) e a <b>fase terrestre</b> (o que acontece no solo). Se quebrarmos qualquer parte desse ciclo, toda a natureza sofre.',
            icon: '🔄',
            educationalTopic: 'ciclo_hidrologico'
        },

        // Step 4: Concept - Watershed & References
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1080',
            title: 'A Bacia Hidrográfica: Como uma Grande Tigela',
            text: 'Vou te contar um segredo da natureza! Christofoletti (1974) descobriu que uma <b>bacia hidrográfica</b> funciona como uma tigela gigante. <img src="https://images.pexels.com/photos/414171/pexels-photo-414171.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Imagine: todos os riozinhos pequenos (chamados de <b>afluentes</b>) se juntam e formam um rio maior (o <b>rio principal</b>). Toda água da chuva que cai nessa "tigela" vai escorrer para o mesmo lugar! Santos (2007) complementa dizendo que precisamos entender as <b>nascentes</b> (onde o rio nasce), os <b>divisores de água</b> (as "bordas da tigela") e a <b>foz</b> (onde o rio termina). O mais importante: se alguém polui a água lá em cima da "tigela", quem mora lá embaixo vai receber água suja!',
            icon: '🏞️',
            educationalTopic: 'bacia_hidrografica'
        },

        // Step 5: Water Resources Management & References
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?q=80&w=1080',
            title: 'Recursos Hídricos: Água para Todos',
            text: 'Bordalo (2017) nos alerta: a água não pode ser tratada como uma mercadoria para ser vendida ao melhor preço! <img src="https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Os <b>recursos hídricos</b> são o conjunto de toda água disponível para usarmos. Mas existem muitos desafios: o governo precisa garantir água para as pessoas beberem, para as fábricas trabalharem, para a agricultura produzir alimentos. Às vezes esses interesses entram em conflito. Por isso, a água deve ser vista como <b>fonte de vida e sobrevivência</b>, com acesso garantido para todos em condições de <b>segurança hídrica</b>. Seu papel como Guardião é equilibrar essas necessidades!',
            icon: '⚖️',
            educationalTopic: 'recursos_hidricos'
        },

        // Step 6: Research Centers
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1080',
            title: 'Centros de Pesquisa: Nossos Olhos Científicos',
            text: 'Como cientista, eu trabalho em um <b>Centro de Pesquisa</b>! Aqui usamos microscópios e equipamentos especiais para descobrir coisas invisíveis. <img src="https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Medimos a <b>qualidade da água</b>: se tem bactérias perigosas, se está muito quente, se tem produtos químicos ruins. É como fazer um check-up de saúde na água! Sem a ciência, estaríamos apenas "chutando" e não sabendo o que fazer. Os Centros de Pesquisa são seus melhores aliados nessa missão.',
            icon: '🔬',
            educationalTopic: 'centros_pesquisa'
        },

        // Step 7: Agriculture Dilemma
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1080',
            title: 'Agricultura: Produzir Alimentos sem Destruir',
            text: 'A <b>agricultura</b> é super importante - ela produz a comida que comemos! Mas também precisa de muita, muita água. <img src="/UI/JPG/cana_de_acucar.jpg" style="width:100%; border-radius:8px; margin:10px 0;"/> A plantação de <b>cana-de-açúcar</b> e a <b>pecuária</b> (criação de gado) movimentam a economia da região. Mas temos que ter cuidado! Os <b>agrotóxicos</b> (venenos usados para matar insetos) podem escorrer para os rios. O gado pode sujar a água com seus dejetos. Seu desafio é encontrar o equilíbrio: produzir alimentos SEM destruir a natureza. Agora vou te apresentar alguém que sofre muito quando erramos nesse equilíbrio...',
            icon: '🌾',
            educationalTopic: 'agricultura_agua'
        },

        // Step 8: Riparian Forest & APP (Gil the Fish)
        {
            character: 'Gil, o Lambari',
            portrait: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?q=80&w=1080',
            title: 'Glub glub! Prazer, sou o Gil!',
            text: 'Oi, Guardião! Eu sou o Gil, o Lambari mais esperto desse rio! Vou te contar um segredo: a <b>Mata Ciliar</b> é a nossa salvação! <img src="https://images.pexels.com/photos/35047478/pexels-photo-35047478.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Sabe por quê ela se chama "ciliar"? Porque funciona como os cílios dos seus olhos - protege! As árvores nas margens fazem sombra e mantêm a água fresquinha (eu odeio água quente!). Elas também seguram a terra para não cair no rio. As <b>APPs</b> (Áreas de Preservação Permanente) são zonas especiais onde NINGUÉM pode construir ou cortar árvores. É lei! Ali eu coloco meus ovinhos e eles ficam protegidos.',
            icon: '🐟',
            educationalTopic: 'mata_ciliar_app'
        },

        // Step 9: Erosion & Sedimentation (Gil the Fish)
        {
            character: 'Gil, o Lambari',
            portrait: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1599940824399-b87987ce0799?q=80&w=1080',
            title: 'Socorro! Não consigo respirar!',
            text: 'Glub... glub... quando os humanos cortam as árvores da Mata Ciliar, acontece um desastre! A chuva cai e arrasta toda a terra solta para dentro do rio. Isso é a <b>erosão</b>! <img src="UI/JPG/erosao.jpg" style="width:100%; border-radius:8px; margin:10px 0;"/> Aí começa o <b>assoreamento</b>: o rio fica cheio de terra, lama e areia. Ele fica raso, a água fica toda barrenta e escura. Minhas brânquias (meu "nariz" de peixe) ficam entupidas de barro - é horrível! Não consigo respirar direito. Muitos dos meus amigos peixes morrem por causa disso. Por favor, proteja nossas árvores! Mas tem coisa pior... o Dr. Sapo vai te explicar.',
            icon: '🧱',
            educationalTopic: 'erosao_assoreamento'
        },

        // Step 10: Sewage & Contamination Details
        {
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=1080',
            title: 'Dr. Sapo e o Perigo Invisível! ☣️',
            text: 'Croac croac! Sou o Dr. Sapo, especialista em poluição aquática. Tenho um alerta URGENTE: cuidado com o <b>esgoto</b>! <img src="https://images.pexels.com/photos/15060366/pexels-photo-15060366.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Quando casas e fábricas jogam esgoto sem tratar no rio, as bactérias do cocô começam a comer todo o <b>oxigênio dissolvido</b> da água. É o oxigênio que o Gil usa para respirar! Sem oxigênio, os peixes morrem asfixiados. O esgoto também traz doenças terríveis para os humanos: diarreia, hepatite, leptospirose. A água limpa vira VENENO! Por isso precisamos de <b>estações de tratamento de esgoto</b>. Elas limpam a água suja antes de devolver ao rio.',
            icon: '🤢',
            educationalTopic: 'esgoto_contaminacao'
        },

        // Step 11: Groundwater & Springs
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1633511090164-b43840ea1607?q=80&w=1080',
            title: 'A Água Subterrânea: O Tesouro Escondido',
            text: 'Guardião, vou te mostrar um perigo invisível! Debaixo da terra existe um mundo de água: os <b>aquíferos</b> e <b>lençóis freáticos</b>. <img src="UI/JPG/agua_subterranea.png" style="width:100%; border-radius:8px; margin:10px 0;"/> É como um rio subterrâneo gigante que alimenta poços e nascentes. Mas quando vazam produtos perigosos no solo - como <b>chorume</b> de lixões, gasolina de postos ou agrotóxicos - eles infiltram e contaminam essa água escondida. O pior: um aquífero poluído pode levar 50, 100 ou até 200 anos para se limpar naturalmente! Proteja as <b>nascentes</b> como se fossem tesouros raros, porque elas alimentam os rios que vemos na superfície.',
            icon: '💧',
            educationalTopic: 'agua_subterranea'
        },

        // Step 12: Urban Planning (Várzea)
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1547619292-240402b5ae5d?q=80&w=1080',
            title: 'Cidades Inteligentes: Respeitar o Rio',
            text: 'Sabe o que acontece quando a cidade cresce de forma errada? Enchentes! Os rios precisam de espaço para "respirar". <img src="https://images.pexels.com/photos/2418664/pexels-photo-2418664.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> As <b>áreas de várzea</b> são como uma "zona de segurança" do rio - quando chove muito, ele precisa desse espaço extra para a água se espalhar. Mas algumas pessoas constroem casas bem ali! Resultado: quando vem a enchente, as casas ficam debaixo d\'água. Além disso, o asfalto e concreto das cidades não deixam a água da chuva penetrar no solo. Precisamos de um <b>planejamento urbano inteligente</b> que respeite os limites da natureza.',
            icon: '🏗️',
            educationalTopic: 'ocupacao_urbana'
        },

        // Step 13: Green Infrastructure Solutions
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1080',
            title: 'Soluções Verdes: Tecnologia a Favor da Natureza',
            text: 'Agora vou te mostrar soluções incríveis! A <b>infraestrutura verde</b> usa a própria natureza como tecnologia. <img src="https://images.pexels.com/photos/1105019/pexels-photo-1105019.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Os <b>jardins de chuva</b> são canteiros especiais que absorvem a água como uma esponja gigante. Os <b>tetos verdes</b> (telhados cobertos de plantas) também retêm água e deixam a cidade mais fresca. <b>Pavimentos permeáveis</b> são como calçadas com furinhos que deixam a água passar. É a engenharia imitando a natureza! Essas soluções evitam enchentes e ainda deixam a cidade mais bonita.',
            icon: '🌿',
            educationalTopic: 'infraestrutura_verde'
        },

        // Step 14: Floating Gardens
        {
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1542355554-46329402513f?q=80&w=1080',
            title: 'Jardins Flutuantes: Ilhas Mágicas que Limpam',
            text: 'Croac! Essa é minha invenção favorita: <b>jardins flutuantes</b>! São como ilhas de plantas que boiam na água do rio. <img src="https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> As raízes dessas plantas penduradas na água funcionam como filtros naturais - elas "comem" os poluentes e deixam a água mais limpa! Além disso, criam um habitat perfeito: o Gil coloca seus ovos ali embaixo, eu pulo de planta em planta caçando insetos, e até passarinhos fazem ninhos. É ecologia, beleza e limpeza, tudo junto! Uma solução genial que a natureza nos ensinou.',
            icon: '🪷',
            educationalTopic: 'jardins_flutuantes'
        },

        // NOVOS STEPS: Tutorial de Mecânicas do Jogo

        // Step 15: Game Introduction
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1498036882173-b41c28a8ba34?q=80&w=1080',
            title: 'Agora Vamos Aprender a Jogar!',
            text: 'Muito bem, Guardião! Você aprendeu toda a teoria sobre água e natureza. Agora vou te ensinar como usar este simulador! <img src="https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Pense neste jogo como uma cidade de verdade que você vai gerenciar. Você vai construir prédios, proteger o rio e tomar decisões importantes. Cada escolha sua afeta a saúde da água e a felicidade dos moradores. Nas próximas telas, vou te explicar cada parte do jogo para você virar um mestre!',
            icon: '🎮'
        },

        // Step 16: Camera Movement
        {
            character: 'Gil, o Lambari',
            portrait: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1498036882173-b41c28a8ba34?q=80&w=1080',
            title: 'Movendo a Câmera: Explore a Cidade!',
            text: 'Glub glub! Primeiro você precisa aprender a "nadar" pela cidade! Use as <b>setas do teclado</b> (↑ ↓ ← →) ou <b>arraste com o mouse</b> para mover a câmera. <img src="https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Quer ver de perto? Use a <b>roda do mouse</b> ou <b>Zoom +/-</b> para aproximar e afastar. Você pode girar a câmera segurando o <b>botão direito do mouse</b> e movendo. Pratique bastante para conhecer cada cantinho da cidade - desde as nascentes lá no alto até a foz do rio!',
            icon: '📹'
        },

        // Step 17: Building Selection
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1080',
            title: 'Construindo: Escolha com Sabedoria!',
            text: 'No canto da tela você vai ver o <b>Menu de Construções</b>. Clique nele para ver todas as opções disponíveis! <img src="https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Cada construção tem um propósito: 🏭 <b>Estação de Tratamento</b> limpa esgoto, 🌳 <b>Mata Ciliar</b> protege o rio, 🔬 <b>Centro de Pesquisa</b> monitora a qualidade da água. Para construir, <b>clique na construção desejada</b>, depois <b>clique no mapa</b> onde quer colocar. Mas cuidado! Cada construção custa dinheiro e recursos. Escolha com sabedoria!',
            icon: '🏗️'
        },

        // Step 18: Game Logic
        {
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1080',
            title: 'Como o Jogo Funciona: Causa e Efeito!',
            text: 'Croac! Vou explicar a lógica do jogo de um jeito fácil. Imagine que a cidade é um organismo vivo: <img src="https://images.pexels.com/photos/1166644/pexels-photo-1166644.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> ✅ Se você PLANTAR mata ciliar → Qualidade da água MELHORA ↑<br>❌ Se FALTAR tratamento de esgoto → Poluição AUMENTA ↑<br>✅ Se construir jardins de chuva → Enchentes DIMINUEM ↓<br>❌ Se usar muitos agrotóxicos → Peixes MORREM ↓<br>Cada ação tem uma reação! Observe os <b>indicadores coloridos</b> na tela: verde = bom, amarelo = atenção, vermelho = perigo! Pense antes de agir.',
            icon: '⚙️'
        },

        // Step 19: Missions Menu
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1080',
            title: 'Menu de Missões: Seus Objetivos!',
            text: 'Procure o ícone 📋 <b>Missões</b> na interface. Ali você verá todos os seus desafios! <img src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> As missões são divididas em categorias:<br>🎯 <b>Principais</b>: Objetivos obrigatórios para progredir<br>⭐ <b>Secundárias</b>: Desafios opcionais que dão recompensas<br>📚 <b>Educacionais</b>: Aprenda mais sobre ciência da água<br>Clique em cada missão para ver detalhes, recompensas e dicas. Complete missões para ganhar <b>pontos, dinheiro</b> e <b>desbloquear novas construções</b>!',
            icon: '📋'
        },

        // Step 20: Resources & Progression
        {
            character: 'Gil, o Lambari',
            portrait: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1080',
            title: 'Recursos e Progressão: Cresça Devagar!',
            text: 'Glub! No topo da tela você vê seus <b>recursos</b>: 💰 Dinheiro, ⚡ Energia, 👥 População. <img src="https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> A <b>progressão do jogo</b> funciona assim:<br>1️⃣ Complete missões → Ganhe recompensas<br>2️⃣ Use dinheiro para construir → Melhore a cidade<br>3️⃣ Melhore indicadores → Desbloqueie níveis<br>4️⃣ Níveis novos → Novas construções e desafios<br>Não gaste todo seu dinheiro de uma vez! Economize para emergências. A cidade cresce aos poucos, como uma plantinha que você cuida todos os dias.',
            icon: '📈'
        },

        // Step 21: Tips & Strategy
        {
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1080',
            title: 'Dicas Estratégicas do Dr. Sapo!',
            text: 'Croac! Anote essas <b>dicas de ouro</b> para ter sucesso:<br>🔍 <b>Priorize a Pesquisa</b>: Construa Centros de Pesquisa cedo para identificar problemas<br>🌳 <b>Proteja Primeiro</b>: Mata Ciliar previne problemas futuros<br>💧 <b>Trate o Esgoto</b>: Sempre antes de expandir a população<br>⚖️ <b>Balance Economia e Ecologia</b>: Não sacrifique a natureza pelo lucro rápido<br>📊 <b>Monitore Constantemente</b>: Fique de olho nos indicadores<br><img src="https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Lembre-se: prevenção é mais barato que correção! Um problema pequeno hoje vira crise amanhã.',
            icon: '💡'
        },

        // Step 22: Final Conclusion
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1080',
            title: 'Você Está Pronto, Guardião!',
            text: 'Parabéns! Agora você sabe tudo: desde o ciclo hidrológico e as bacias hidrográficas até como jogar e gerenciar a cidade. <img src="https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Você entende que a água conecta tudo: agricultura, cidade, floresta e vida selvagem. Como disse Bordalo (2017), a água é fonte de vida e deve ser acessível para todos. Gil, Dr. Sapo e eu estaremos aqui para te ajudar durante sua jornada. Suas escolhas definirão o futuro desta cidade e de todos os seres que dependem da água. <b>Boa sorte, Guardião da Água!</b> 🌊',
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
