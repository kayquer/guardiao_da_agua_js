/**
 * GUARDIÃO DA ÁGUA - TUTORIAL SYSTEM
 * Sistema de tutorial educacional com interface RPG para crianças de 11-14 anos
 */

class TutorialSystem {
    constructor(gameManager) {
        log('📚 Inicializando TutorialSystem...');

        this.gameManager = gameManager;
        this.currentStep = 0;
        this.isActive = false;

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
        this.coachTimer = null;
        this.handleKey = (e) => this.onKeyDown(e);

        // FIX #1: Setup event listeners for tutorial navigation buttons
        this.setupEventListeners();

        log('✅ TutorialSystem inicializado');
    }

    /**
     * FIX #1: Setup event listeners for tutorial control buttons
     */
    setupEventListeners() {
        // Skip button
        const skipBtn = document.getElementById('tutorial-skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skip());
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

        setupReadAloud(document.getElementById('tutorial-read-btn'), () =>
            `${document.getElementById('tutorial-title').innerText}. ${document.getElementById('tutorial-text').innerText}`);

        document.getElementById('btn-lessons')?.addEventListener('click', () => this.openLessons());

        log('✅ Tutorial event listeners configured');
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

            log('✅ 3D Portrait system initialized');
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

            log(`📦 Loading ${characterName} OBJ model...`);

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
                log(`✅ Loaded ${result.meshes.length} meshes for ${characterName}`);
                
                // Log all mesh names for debugging
                result.meshes.forEach((mesh, idx) => {
                    log(`  Mesh ${idx}: ${mesh.name} (material: ${mesh.material ? mesh.material.name : 'none'})`);
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
                log(`📊 Filtered to ${meshes.length} renderable meshes`);
                
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

                    log(`📐 Model bounds - Size: ${size.toString()}, Center: ${center.toString()}`);

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

                    log(`✅ Auto-scaled: ${scale.toFixed(4)}x, Position: ${this.portraitModel.position.toString()}`);
                }

                // APPLY PBR TEXTURES
                await this.applyPBRTextures(meshes, texturePath, texturePrefix);

                // IDENTIFY AND STORE MESH PARTS
                this.identifyMeshParts(meshes);

                // START PROCEDURAL ANIMATIONS
                this.startProceduralAnimations();

                log('✅ 3D character model loaded and positioned successfully');
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
        log('🎨 Applying PBR textures...');
        log(`📁 Texture path: ${texturePath}`);
        log(`🏷️ Texture prefix: ${texturePrefix}`);

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
            log('✅ Loaded albedo texture');

            // Load normal texture
            const normalTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'nrm-metalness-4k.png',
                this.portraitScene
            );
            pbr.bumpTexture = normalTexture;
            pbr.invertNormalMapX = false;
            pbr.invertNormalMapY = false;
            log('✅ Loaded normal texture');

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
            log('✅ Loaded roughness texture');

            // Load ambient occlusion texture
            const aoTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'ao-metalness-4k.png',
                this.portraitScene
            );
            pbr.ambientTexture = aoTexture;
            pbr.ambientTextureStrength = 1.0;
            log('✅ Loaded AO texture');

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

            log(`✅ PBR material applied to ${appliedCount} meshes`);
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
            
            log('⚠️ Using fallback material');
        }
    }

    /**
     * Identify mesh parts for animation
     */
    identifyMeshParts(meshes) {
        log('🔍 Identifying mesh parts for animation...');
        
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
                log(`👁️ Found eye mesh: ${mesh.name}`);
            }
            
            // Identify hair
            if (name.includes('hair') || name.includes('cabelo') || name.includes('pelo')) {
                this.animationData.meshParts.hair.push(mesh);
                log(`💇 Found hair mesh: ${mesh.name}`);
            }
            
            // Identify arms
            if (name.includes('arm') || name.includes('braco') || name.includes('braço') || 
                name.includes('hand') || name.includes('mao') || name.includes('mão')) {
                this.animationData.meshParts.arms.push(mesh);
                log(`💪 Found arm mesh: ${mesh.name}`);
            }
            
            // Identify head
            if (name.includes('head') || name.includes('cabeca') || name.includes('cabeça')) {
                this.animationData.meshParts.head.push(mesh);
                log(`🗣️ Found head mesh: ${mesh.name}`);
            }
            
            // Identify body
            if (name.includes('body') || name.includes('torso') || name.includes('corpo') ||
                name.includes('chest') || name.includes('peito')) {
                this.animationData.meshParts.body.push(mesh);
                log(`🫀 Found body mesh: ${mesh.name}`);
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
            log(`💇 Auto-detected ${this.animationData.meshParts.hair.length} hair meshes`);
        }

        log(`✅ Mesh identification complete`);
    }

    /**
     * Start procedural animations
     */
    startProceduralAnimations() {
        log('🎬 Starting procedural animations...');
        
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

        log('✅ Procedural animations started');
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
        this.currentCharacter = null;
        
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
    // Retratos 2D (fallback quando o 3D não carrega)
    const CLAUDIA = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy';
    const GIL = 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=400';
    const SAPO = 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400';
    const openMissions = gm => gm.questSystem.missionUI.isOpen || gm.questSystem.openMissionInterface();
    const closeMissions = gm => { if (gm.questSystem.missionUI.isOpen) gm.questSystem.closeMissionInterface(); gm.uiManager.hideHudRight(); };
    // Passo sem `group` é da introdução; sem `mode` é 'story' (tela cheia)
    return [
        // Escolha: aprender sobre a água agora (lições em seguida) ou durante o jogo (uma por missão)
        {
            offer: true,
            nextLabel: 'Aprender agora',
            skipLabel: 'Durante o jogo',
            character: 'Claudia',
            portrait: CLAUDIA,
            background: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=1080',
            title: 'Olá, Guardião!',
            text: 'Eu sou a Pesquisadora Cláudia! Antes de construir a cidade, posso te contar como a água funciona na natureza, com a ajuda dos meus amigos Gil e Dr. Sapo. <br><br>Você quer aprender <b>agora</b>, ou <b>aos poucos, durante o jogo</b>? Se escolher durante o jogo, a cada missão completada a gente aparece com uma aula nova.',
            icon: '💧'
        },

        // Step 1: Introduction & Responsibility
        {
            chapter: 1,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=1080',
            title: 'Bem-vindo, Guardião da Água!',
            text: 'Olá! Eu sou a Pesquisadora Cláudia. Nossa cidade está com um problema sério: a água que a gente bebe, usa no banho e leva para as plantações está em perigo! <img src="https://images.pexels.com/photos/1481105/pexels-photo-1481105.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Por isso você foi escolhido como o novo <b>Guardião da Água</b>. Sua missão é proteger esse tesouro, e eu vou estar do seu lado, te ensinando cada passo. Topa cuidar da água com a gente?',
            icon: '👋'
        },

        // Step 2: Hidrosfera - Concepts & References
        {
            chapter: 1,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=1080',
            title: 'A Hidrosfera: Toda a Água do Planeta',
            text: 'Vamos começar pela <b>hidrosfera</b>: é toda a água do planeta, a que a gente vê e a que fica escondida debaixo da terra! <img src="UI/JPG/ciclo_agua.jpg" style="width:100%; border-radius:8px; margin:10px 0;"/> Ela aparece de três jeitos: <b>sólida</b> (gelo, como o do congelador), <b>líquida</b> (rios, lagos e mares) e <b>gasosa</b> (o vapor que forma as nuvens). E a água nunca fica parada! Às vezes ela se move rapidinho, como numa chuva. Outras vezes vai devagar, devagarinho, mais lenta que uma tartaruga.',
            icon: '🌍',
            educationalTopic: 'hidrosfera'
        },

        // Step 3: Concepts - Hydrological Cycle & References
        {
            chapter: 2,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1080',
            title: 'O Ciclo Hidrológico: O Motor da Vida',
            text: 'Agora vem a parte mais legal: o <b>ciclo da água</b>! É como uma brincadeira de transformações. <img src="https://images.pexels.com/photos/531756/pexels-photo-531756.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> O Sol esquenta o rio e a água <b>evapora</b>, igual à fumacinha da panela. Lá em cima, ela vira <b>nuvem</b>. Quando a nuvem fica pesada, cai como <b>chuva</b>, enche os rios e tudo recomeça! Uma parte acontece no céu e a outra no chão. Se a gente estragar qualquer pedaço dessa roda, a natureza inteira sente.',
            icon: '🔄',
            educationalTopic: 'ciclo_hidrologico'
        },

        // Step 4: Concept - Watershed & References
        {
            chapter: 2,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1080',
            title: 'A Bacia Hidrográfica: Como uma Grande Tigela',
            text: 'Vou te contar um segredo: uma <b>bacia hidrográfica</b> funciona como uma tigela gigante! <img src="https://images.pexels.com/photos/414171/pexels-photo-414171.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Os riozinhos, chamados <b>afluentes</b>, se juntam e formam o <b>rio principal</b>. Toda chuva que cai na tigela escorre para o mesmo lugar. O rio nasce na <b>nascente</b>, as bordas da tigela são os <b>divisores de água</b> e o fim do rio é a <b>foz</b>. Agora o mais importante: se alguém suja a água lá no alto, quem mora lá embaixo recebe água suja!',
            icon: '🏞️',
            educationalTopic: 'bacia_hidrografica'
        },

        // Step 5: Water Resources Management & References
        {
            chapter: 3,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?q=80&w=1080',
            title: 'Recursos Hídricos: Água para Todos',
            text: 'Água não é brinquedo de loja para ser vendida a quem paga mais! <img src="UI/JPG/agua_de_todos.jpg" style="width:100%; border-radius:8px; margin:10px 0;"/> Os <b>recursos hídricos</b> são toda a água que temos para usar. E todo mundo quer um pedaço: as pessoas precisam beber, as fábricas precisam trabalhar e as plantações precisam crescer. É como dividir uma pizza numa festa cheia: se ninguém organiza, alguém fica sem. Por isso a água é <b>fonte de vida</b> e precisa chegar a todos. Seu papel de Guardião é equilibrar essa divisão!',
            icon: '⚖️',
            educationalTopic: 'recursos_hidricos'
        },

        // Step 6: Research Centers
        {
            chapter: 3,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1080',
            title: 'Centros de Pesquisa: Nossos Olhos Científicos',
            text: 'Eu trabalho num <b>Centro de Pesquisa</b>! Lá a gente usa microscópios e aparelhos especiais para enxergar o que o olho não vê. <img src="https://images.pexels.com/photos/2280571/pexels-photo-2280571.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Nós examinamos a <b>qualidade da água</b>: se tem bactérias perigosas, se está quente demais, se tem produtos químicos ruins. É como levar a água ao médico para um check-up! Sem ciência, a gente só ia ficar chutando. Os Centros de Pesquisa são seus melhores aliados nessa missão.',
            icon: '🔬',
            educationalTopic: 'centros_pesquisa'
        },

        // Step 7: Agriculture Dilemma
        {
            chapter: 3,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1080',
            title: 'Agricultura: Produzir Alimentos sem Destruir',
            text: 'A <b>agricultura</b> é super importante: é dela que vem a comida do nosso prato! Mas ela bebe muita, muita água. <img src="/UI/JPG/cana_de_acucar.jpg" style="width:100%; border-radius:8px; margin:10px 0;"/> A <b>cana-de-açúcar</b> e a criação de gado ajudam a região a ganhar dinheiro. Só que os <b>agrotóxicos</b>, venenos que matam insetos, podem escorrer para os rios. E o cocô do gado também suja a água. Seu desafio é produzir comida SEM destruir a natureza. Agora quero te apresentar alguém que sofre muito quando a gente erra nisso...',
            icon: '🌾',
            educationalTopic: 'agricultura_agua'
        },

        // Step 8: Riparian Forest & APP (Gil the Fish)
        {
            chapter: 4,
            character: 'Gil, o Lambari',
            portrait: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?q=80&w=1080',
            title: 'Glub glub! Prazer, sou o Gil!',
            text: 'Glub! Oi, Guardião! Eu sou o Gil, o Lambari mais esperto desse rio! Meu segredo é a <b>Mata Ciliar</b>! <img src="https://images.pexels.com/photos/35047478/pexels-photo-35047478.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Sabe por que ela tem esse nome? Porque protege o rio igual os cílios protegem seus olhos! As árvores da margem fazem sombra e deixam a água fresquinha (eu odeio água quente!). Elas também seguram a terra para não cair no rio. Essas margens são <b>áreas protegidas</b>: ninguém pode construir nem cortar árvore ali. É lá que eu guardo meus ovinhos!',
            icon: '🐟',
            educationalTopic: 'mata_ciliar_app'
        },

        // Step 9: Erosion & Sedimentation (Gil the Fish)
        {
            chapter: 4,
            character: 'Gil, o Lambari',
            portrait: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1599940824399-b87987ce0799?q=80&w=1080',
            title: 'Socorro! Não consigo respirar!',
            text: 'Glub... glub... quando cortam as árvores da margem, é um desastre! A chuva arrasta a terra solta para dentro do rio. Isso é a <b>erosão</b>! <img src="UI/JPG/erosao.jpg" style="width:100%; border-radius:8px; margin:10px 0;"/> Aí vem o <b>assoreamento</b>: o rio vai enchendo de terra, lama e areia, fica raso e com cor de café com leite. Minhas brânquias, que são o meu nariz de peixe, entopem de barro. É horrível, não consigo respirar! Muitos amigos meus morrem assim. Por favor, proteja nossas árvores! Mas tem coisa pior... o Dr. Sapo vai te contar.',
            icon: '🧱',
            educationalTopic: 'erosao_assoreamento'
        },

        // Step 10: Sewage & Contamination Details
        {
            chapter: 4,
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=1080',
            title: 'Dr. Sapo e o Perigo Invisível! ☣️',
            text: 'Croac! Sou o Dr. Sapo, especialista em poluição da água, e tenho um alerta URGENTE: cuidado com o <b>esgoto</b>! <img src="https://images.pexels.com/photos/15060366/pexels-photo-15060366.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Quando o esgoto cai no rio sem tratamento, as bactérias do cocô comem o <b>oxigênio</b> da água, justo o ar que o Gil respira! Sem ele, os peixes sufocam. E as pessoas pegam doenças, como diarreia. A água limpa vira VENENO! Croac! Por isso precisamos de <b>estações de tratamento de esgoto</b>: elas lavam a água suja antes de devolvê-la ao rio.',
            icon: '🤢',
            educationalTopic: 'esgoto_contaminacao'
        },

        // Step 11: Groundwater & Springs
        {
            chapter: 5,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1633511090164-b43840ea1607?q=80&w=1080',
            title: 'A Água Subterrânea: O Tesouro Escondido',
            text: 'Guardião, olha esse perigo escondido! Debaixo da terra existe um mundo de água: os <b>aquíferos</b> e os <b>lençóis freáticos</b>. <img src="UI/JPG/agua_subterranea.png" style="width:100%; border-radius:8px; margin:10px 0;"/> Funcionam como uma grande caixa-d\'água subterrânea que abastece poços e nascentes. Mas quando vaza sujeira no chão, como o <b>chorume</b> do lixão, gasolina ou agrotóxicos, ela afunda e contamina essa água. E o pior: limpar um aquífero sujo pode demorar mais que a vida inteira dos seus avós! Proteja as <b>nascentes</b> como tesouros, porque elas alimentam os rios.',
            icon: '💧',
            educationalTopic: 'agua_subterranea'
        },

        // Step 12: Urban Planning (Várzea)
        {
            chapter: 5,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1547619292-240402b5ae5d?q=80&w=1080',
            title: 'Cidades Inteligentes: Respeitar o Rio',
            text: 'Sabe o que acontece quando a cidade cresce do jeito errado? Enchente! O rio precisa de espaço para respirar. <img src="https://images.pexels.com/photos/2418664/pexels-photo-2418664.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> A <b>várzea</b> é a área de segurança do rio: quando chove muito, a água se espalha por ali. Mas tem gente que constrói casa bem nesse lugar! Resultado: na enchente, as casas ficam debaixo d\'água. E o asfalto e o concreto não deixam a chuva entrar no chão. Precisamos de um <b>planejamento urbano inteligente</b>, que respeite o espaço da natureza.',
            icon: '🏗️',
            educationalTopic: 'ocupacao_urbana'
        },

        // Step 13: Green Infrastructure Solutions
        {
            chapter: 6,
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1080',
            title: 'Soluções Verdes: Tecnologia a Favor da Natureza',
            text: 'Agora as soluções incríveis! A <b>infraestrutura verde</b> usa a própria natureza como tecnologia. <img src="https://images.pexels.com/photos/1105019/pexels-photo-1105019.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Os <b>jardins de chuva</b> são canteiros que chupam a água como uma esponja. Os <b>tetos verdes</b> são telhados cheios de plantas que seguram a chuva e refrescam a cidade. E os <b>pavimentos permeáveis</b> são calçadas com furinhos que deixam a água passar para o chão. É a engenharia copiando a natureza! Assim a gente evita enchentes e ainda deixa a cidade mais bonita.',
            icon: '🌿',
            educationalTopic: 'infraestrutura_verde'
        },

        // Step 14: Floating Gardens
        {
            chapter: 6,
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1542355554-46329402513f?q=80&w=1080',
            title: 'Jardins Flutuantes: Ilhas Mágicas que Limpam',
            text: 'Croac! Essa é minha invenção favorita: os <b>jardins flutuantes</b>! São ilhas de plantas que boiam no rio. <img src="https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> As raízes ficam penduradas na água e funcionam como o filtro de uma geladeira: elas comem a sujeira e deixam a água mais limpa! E ainda viram casa para todo mundo: o Gil põe seus ovos embaixo, eu pulo de planta em planta caçando insetos e até passarinho faz ninho ali. Limpeza, beleza e vida juntas. Croac, que ideia genial!',
            icon: '🪷',
            educationalTopic: 'jardins_flutuantes'
        },

        // ===== PREFEITURA (obrigatório): o jogador constrói a sede da cidade =====
        {
            group: 'cityhall', mode: 'coach', character: 'Claudia', portrait: CLAUDIA, icon: '🏛️',
            title: 'Primeiro passo: a Prefeitura',
            text: 'Toda cidade precisa de uma sede de governo, e é da <b>Prefeitura</b> que você vai comandar as obras. Esta fica por conta do governo federal: <b>não custa nada</b>!',
            waitFor: 'city_hall',
            // já abre a categoria certa: com outra aberta, o botão "Públicos" fica fora da tela
            enter: gm => gm.uiManager.uiState.currentCategory !== 'public' && gm.uiManager.selectCategory('public'),
            placingHint: '👆 Agora clique (ou toque) num terreno do mapa. Onde a sombra ficar <b>verde</b>, a Prefeitura cabe.',
            // O primeiro alvo visível ganha o destaque: acompanha o jogador abrindo menu → categoria → item
            targets: [
                { selector: '.mobile-build-btn', text: '👆 Toque em <b>Construir</b>.' },
                { selector: '.building-item[data-building-type="city_hall"]', text: '👆 Escolha a <b>🏛️ Prefeitura Municipal</b>.', scrollIn: '#building-panel' },
                { selector: '.category-btn[data-category="public"]', text: '👆 Abra a categoria <b>🏛️ Públicos</b>.' },
                { selector: '.mobile-toggle.left', text: '👆 Toque em <b>🏗️</b> para abrir as construções.' },
                { selector: '#building-panel', text: '👆 Abra a categoria <b>🏛️ Públicos</b> no menu de construções.' }
            ]
        },
        {
            group: 'cityhall', mode: 'coach', character: 'Claudia', portrait: CLAUDIA, icon: '🎉',
            title: 'Prefeitura construída!',
            text: 'Muito bem, Guardião! A cidade agora tem governo. Daqui pra frente, cada construção sai do <b>orçamento</b> da cidade: gaste com sabedoria.'
        },

        // ===== MISSÕES (opcional) =====
        {
            group: 'missions', mode: 'coach', offer: true, character: 'Claudia', portrait: CLAUDIA, icon: '🎯',
            title: 'Quer conhecer as missões?',
            text: 'As missões mostram o que a cidade precisa agora e dão recompensas. Posso te mostrar onde elas ficam?'
        },
        {
            group: 'missions', mode: 'coach', character: 'Claudia', portrait: CLAUDIA, icon: '🎯',
            title: 'O botão de Missões',
            text: 'Clique em <b>🎯</b> sempre que quiser ver todos os seus desafios.',
            targets: ['#btn-missions']
        },
        {
            group: 'missions', mode: 'coach', character: 'Claudia', portrait: CLAUDIA, icon: '📋',
            title: 'Suas missões',
            text: 'Aqui ficam as missões ativas, com objetivos, recompensas e dicas. Completar missões dá <b>dinheiro</b> e <b>desbloqueia construções</b>!',
            enter: openMissions,
            targets: ['.hud-right']
        },
        {
            group: 'missions', mode: 'coach', character: 'Claudia', portrait: CLAUDIA, icon: '💧',
            title: 'A missão da vez',
            text: 'Aqui fica a missão atual e o progresso dela. A primeira é construir uma <b>Bomba de Água</b>. Clique nela para ver os detalhes.',
            enter: closeMissions,
            targets: ['.hud-bottom .mission-info', '.hud-bottom-toggle']
        },

        // ===== INTERFACE (opcional) =====
        {
            group: 'interface', mode: 'coach', offer: true, character: 'Gil, o Lambari', portrait: GIL, icon: '🧭',
            title: 'Um tour pela tela?',
            text: 'Glub! Posso te mostrar o que cada número da tela significa. É rapidinho!',
            enter: closeMissions
        },
        {
            group: 'interface', mode: 'coach', character: 'Gil, o Lambari', portrait: GIL, icon: '💧',
            title: 'Água',
            text: 'Quanta água a cidade tem guardada. Se ela acabar, é <b>fim de jogo</b>!',
            targets: ['.resource-item:has(#water-amount)', '#compact-water']
        },
        {
            group: 'interface', mode: 'coach', character: 'Gil, o Lambari', portrait: GIL, icon: '🏭',
            title: 'Poluição',
            text: 'Quanto mais alta, pior para o rio e para mim! Se chegar a <b>100%</b>, também é fim de jogo. Tratamento de esgoto ajuda a baixar.',
            targets: ['.resource-item:has(#pollution-level)', '.mobile-top-toggle.resource-toggle']
        },
        {
            group: 'interface', mode: 'coach', character: 'Gil, o Lambari', portrait: GIL, icon: '👥',
            title: 'População',
            text: 'Quantas pessoas moram na cidade. Mais gente paga mais impostos, mas também consome mais água.',
            targets: ['.resource-item:has(#population-count)', '#compact-population']
        },
        {
            group: 'interface', mode: 'coach', character: 'Gil, o Lambari', portrait: GIL, icon: '😊',
            title: 'Satisfação',
            text: 'O quanto os moradores estão felizes com a cidade. Serviços públicos e parques deixam todo mundo mais contente.',
            targets: ['.resource-item:has(#satisfaction-level)', '.mobile-top-toggle.resource-toggle']
        },
        {
            group: 'interface', mode: 'coach', character: 'Gil, o Lambari', portrait: GIL, icon: '💰',
            title: 'Orçamento',
            text: 'O dinheiro da cidade. Toda construção custa, e algumas têm manutenção. Guarde um pouco para emergências!',
            targets: ['.resource-item:has(#budget-amount)', '#compact-budget']
        },
        {
            group: 'interface', mode: 'coach', character: 'Gil, o Lambari', portrait: GIL, icon: '⚡',
            title: 'Energia',
            text: 'Algumas construções precisam de eletricidade. Se faltar energia, elas perdem eficiência.',
            targets: ['.resource-item:has(#electricity-amount)', '#compact-energy']
        },
        {
            group: 'interface', mode: 'coach', character: 'Gil, o Lambari', portrait: GIL, icon: '🕐',
            title: 'Relógio',
            text: 'A data e a hora da cidade. O tempo só começa a passar quando este tutorial terminar.',
            targets: ['.resource-item:has(#game-clock)', '.mobile-top-toggle.resource-toggle']
        },
        {
            group: 'interface', mode: 'coach', character: 'Claudia', portrait: CLAUDIA, icon: '🏗️',
            title: 'Construções',
            text: 'Aqui ficam as construções, separadas por categoria. As marcadas com 🔒 ainda estão bloqueadas: clique nelas para <b>estudar</b> e desbloquear.',
            targets: ['#building-panel', '.mobile-toggle.left']
        },
        {
            group: 'interface', mode: 'coach', character: 'Gil, o Lambari', portrait: GIL, icon: '📹',
            title: 'Movendo a câmera',
            text: 'Arraste para mover, segure o <b>botão direito</b> para girar e use a <b>roda do mouse</b> para zoom (teclado: setas/WASD, Q/E gira, R volta). No celular, arraste com um dedo e use dois para zoom. Clique numa construção para ver os detalhes dela.'
        },
        {
            group: 'interface', mode: 'coach', character: 'Dr. Sapo', portrait: SAPO, icon: '❓',
            title: 'Ajuda e pausa',
            text: 'Croac! Esqueceu um comando? O botão <b>❓</b> mostra todos. No computador, aperte <b>Espaço</b> para pausar: é no menu de pausa que você salva (o jogo também salva sozinho de tempos em tempos).',
            targets: ['#btn-help']
        },

        // ===== FINAL =====

        // Step 18: Game Logic
        {
            group: 'end',
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1080',
            title: 'Como o Jogo Funciona: Causa e Efeito!',
            text: 'Croac! Vou explicar a lógica do jogo de um jeito fácil. Imagine que a cidade é um organismo vivo: <img src="https://images.pexels.com/photos/1166644/pexels-photo-1166644.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> ✅ Se você PLANTAR mata ciliar → Qualidade da água MELHORA ↑<br>❌ Se FALTAR tratamento de esgoto → Poluição AUMENTA ↑<br>✅ Se construir jardins de chuva → Enchentes DIMINUEM ↓<br>❌ Se usar muitos agrotóxicos → Peixes MORREM ↓<br>Cada ação tem uma reação! Observe os <b>indicadores coloridos</b> na tela: verde = bom, amarelo = atenção, vermelho = perigo! Pense antes de agir.',
            icon: '⚙️'
        },

        // Step 21: Tips & Strategy
        {
            group: 'end',
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?q=80&w=400',
            background: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1080',
            title: 'Dicas Estratégicas do Dr. Sapo!',
            text: 'Croac! Anote essas <b>dicas de ouro</b> para ter sucesso:<br>🔍 <b>Priorize a Pesquisa</b>: Construa Centros de Pesquisa cedo para identificar problemas<br>🌳 <b>Proteja Primeiro</b>: Mata Ciliar previne problemas futuros<br>💧 <b>Trate o Esgoto</b>: Sempre antes de expandir a população<br>⚖️ <b>Balance Economia e Ecologia</b>: Não sacrifique a natureza pelo lucro rápido<br>📊 <b>Monitore Constantemente</b>: Fique de olho nos indicadores<br><img src="https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Lembre-se: prevenção é mais barato que correção! Um problema pequeno hoje vira crise amanhã.',
            icon: '💡'
        },

        // Step 22: Final Conclusion
        {
            group: 'end',
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            background: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=1080',
            title: 'Você Está Pronto, Guardião!',
            text: 'Parabéns, Guardião! A Prefeitura está de pé e você já sabe como a cidade funciona. <img src="https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=300" style="width:100%; border-radius:8px; margin:10px 0;"/> Lembre-se: a água conecta tudo — a cidade, as plantações, a floresta e os bichos. Gil, Dr. Sapo e eu estaremos por perto. Quer rever as aulas sobre a água? É só tocar em <b>📚</b>. <b>Boa sorte, Guardião da Água!</b> 🌊',
            icon: '🎓'
        }
    ];
}

    /**
     * Inicia o tutorial. O GameManager já deixou o jogo em gameState 'tutorial' (congelado).
     */
    start() {
        this.lessonsDeferred = false; // true = aulas sobre a água vêm uma por missão
        this.nextChapter = 1;
        return this.begin(this.tutorialSteps, 'tutorial');
    }

    /**
     * Abre aulas sobre a água no meio do jogo, que fica congelado enquanto estiverem abertas.
     * chapter = uma aula (a da missão concluída); sem chapter = todas (botão 📚).
     */
    openLessons(chapter) {
        const gm = this.gameManager;
        if (this.isActive || gm.gameState !== 'playing') return false;
        const lessons = this.tutorialSteps.filter(s => s.chapter && (!chapter || s.chapter === chapter));
        if (!lessons.length) return false;
        gm.gameState = 'tutorial';
        this.begin(lessons, 'lessons');
        return true;
    }

    /** Hook de QuestSystem.completeQuest: quem escolheu aprender "durante o jogo" ganha a próxima aula. */
    onMissionCompleted() {
        if (!this.lessonsDeferred) return;
        setTimeout(() => { // depois da comemoração da missão
            if (this.openLessons(this.nextChapter)) this.nextChapter++;
            const lastChapter = Math.max(...this.tutorialSteps.map(s => s.chapter || 0));
            if (this.nextChapter > lastChapter) this.lessonsDeferred = false;
        }, 4000);
    }

    /** run: 'tutorial' (início do jogo) ou 'lessons' (aulas abertas durante o jogo) */
    async begin(steps, run) {
        this.steps = steps;
        this.run = run;
        this.isActive = true;
        this.currentStep = 0;
        this.mode = null;

        this.showTutorialUI();
        this.renderCurrentStep();
        document.addEventListener('keydown', this.handleKey, true);
        this.coachTimer = setInterval(() => this.updateCoach(), 250);

        if (this.use3DPortrait) {
            const initialized = await this.initialize3DPortrait();
            if (!this.isActive) { this.dispose3DPortrait(); return; } // concluído enquanto carregava
            if (!initialized) {
                console.warn('⚠️ Falling back to 2D portraits');
                this.use3DPortrait = false;
            }
            this.renderCurrentStep(); // agora com o retrato 3D
        }
        log(`📚 Tutorial iniciado (${run})`);
    }

    showTutorialUI() {
        document.getElementById('tutorial-container').style.display = 'flex';
    }

    hideTutorialUI() {
        document.getElementById('tutorial-container').style.display = 'none';
        document.getElementById('tutorial-spotlight').hidden = true;
    }

    groupOf(step) {
        return step.group || 'intro';
    }

    /** Prédio que o passo atual manda construir (null = nenhum). Usado pela trava em UIManager.selectBuildingType. */
    get allowedBuilding() {
        return this.isActive ? this.steps[this.currentStep]?.waitFor ?? null : null;
    }

    isStepDone(step) {
        return !step.waitFor || this.gameManager.buildingSystem.getBuildingsByType(step.waitFor).length > 0;
    }

    /**
     * Renders the current tutorial step
     */
    async renderCurrentStep() {
        const step = this.steps[this.currentStep];
        if (!step || !this.isActive) return;

        stopSpeaking();
        step.enter?.(this.gameManager);

        const container = document.getElementById('tutorial-container');
        const mode = step.mode || 'story';
        if (mode !== this.mode) {
            this.mode = mode;
            container.classList.toggle('tutorial--story', mode === 'story');
            container.classList.toggle('tutorial--coach', mode === 'coach');
            // o canvas do retrato muda de tamanho entre os modos
            requestAnimationFrame(() => this.portraitEngine?.resize());
        }

        // Handle portrait display (3D or 2D)
        const portrait = document.getElementById('tutorial-portrait');
        const portraitCanvas = document.getElementById('tutorial-portrait-canvas');
        const portraitContainer = container.querySelector('.tut-portrait');

        // Characters with 3D models
        const has3DModel = ['Claudia', 'Gil, o Lambari', 'Dr. Sapo'].includes(step.character);

        if (this.use3DPortrait && this.portraitScene && has3DModel) {
            portraitCanvas.style.display = 'block';
            portrait.style.display = 'none';

            // Load the appropriate character model if not already loaded or if character changed
            if (!this.currentCharacter || this.currentCharacter !== step.character) {
                this.currentCharacter = step.character;
                await this.load3DCharacter(step.character);
            }

            // Set character-specific background for portrait container
            const backgrounds = {
                'Claudia': 'linear-gradient(135deg, rgba(101, 84, 192, 0.55) 0%, rgba(74, 47, 189, 0.55) 100%), url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=400&h=400&fit=crop")',
                'Gil, o Lambari': 'linear-gradient(135deg, rgba(0, 119, 182, 0.5) 0%, rgba(0, 180, 216, 0.5) 100%), url("https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=400&h=400&fit=crop")',
                'Dr. Sapo': 'linear-gradient(135deg, rgba(46, 125, 50, 0.5) 0%, rgba(27, 94, 32, 0.5) 100%), url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=400&h=400&fit=crop")'
            };
            portraitContainer.style.backgroundImage = backgrounds[step.character];
        } else {
            portraitCanvas.style.display = 'none';
            portrait.style.display = 'block';

            // Use emoji SVG as fallback immediately (don't wait for error)
            portrait.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%234a9eff" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" font-size="80" text-anchor="middle" dy=".3em"%3E👩‍🔬%3C/text%3E%3C/svg%3E';
            portrait.alt = step.character;

            // Try to load actual image if it exists
            const img = new Image();
            img.onload = () => { portrait.src = step.portrait; };
            img.onerror = () => log(`ℹ️ Using emoji fallback for portrait: ${step.character}`);
            img.src = step.portrait;

            portraitContainer.style.backgroundImage = '';
        }

        // Fundo de tela cheia só existe no modo story
        if (step.background) {
            const background = document.getElementById('tutorial-background');
            const img = new Image();
            img.onload = () => { background.style.backgroundImage = `url('${step.background}')`; };
            img.onerror = () => log('ℹ️ Using gradient fallback for background');
            img.src = step.background;
        }

        document.getElementById('tutorial-icon').textContent = step.icon;
        document.getElementById('tutorial-title').textContent = step.title;
        const text = document.getElementById('tutorial-text');
        text.innerHTML = step.text;
        text.scrollTop = 0;
        document.getElementById('tutorial-character-name').textContent = step.character;

        // Progresso dentro da parte atual ("Missões · 2 de 4", "Aula 3 · 1 de 2")
        const lessons = this.run === 'lessons';
        const partOf = s => (lessons ? s.chapter : this.groupOf(s));
        const part = this.steps.filter(s => partOf(s) === partOf(step));
        const position = part.indexOf(step) + 1;
        const label = lessons ? `Aula ${step.chapter}` : TutorialSystem.GROUP_LABELS[this.groupOf(step)];
        document.getElementById('tutorial-progress').textContent = `${label} · ${position} de ${part.length}`;
        document.getElementById('tutorial-progress-fill').style.width = `${(position / part.length) * 100}%`;

        this.lastHint = null; // força redesenhar a dica
        this.updateButtonStates();
        this.updateCoach();

        log(`📚 Tutorial step ${this.currentStep + 1}/${this.steps.length}: ${step.title}`);
    }

    updateButtonStates() {
        const step = this.steps[this.currentStep];
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const nextBtn = document.getElementById('tutorial-next-btn');
        const skipBtn = document.getElementById('tutorial-skip-btn');

        prevBtn.disabled = this.currentStep === 0;
        nextBtn.disabled = !this.isStepDone(step);

        const last = this.currentStep === this.steps.length - 1;
        const lessons = this.run === 'lessons';
        if (last) {
            nextBtn.textContent = lessons ? 'Voltar ao jogo' : 'Começar a jogar!';
        } else {
            nextBtn.textContent = step.nextLabel || (step.offer ? 'Mostrar' : 'Próximo →');
        }

        const skipLabel = lessons ? (!last && 'Fechar aula') : step.skipLabel || TutorialSystem.SKIP_LABELS[this.groupOf(step)];
        skipBtn.hidden = !skipLabel;
        if (skipLabel) skipBtn.textContent = skipLabel;
    }

    /**
     * Modo coach: destaca o primeiro alvo visível do passo e encaixa o card longe dele.
     * Roda num intervalo porque o alvo muda conforme o jogador abre menus.
     */
    updateCoach() {
        const step = this.steps[this.currentStep];
        const spotlight = document.getElementById('tutorial-spotlight');
        if (!this.isActive || !step || this.mode !== 'coach') {
            spotlight.hidden = true;
            return;
        }

        const placing = step.waitFor && this.gameManager.buildingSystem.previewMode;
        const target = placing ? null : this.findTarget(step.targets);

        const hint = document.getElementById('tutorial-hint');
        const hintHtml = (placing ? step.placingHint : target?.text) || '';
        if (hintHtml !== this.lastHint) {
            this.lastHint = hintHtml;
            hint.hidden = !hintHtml;
            hint.innerHTML = hintHtml || '';
        }

        const container = document.getElementById('tutorial-container');
        let dockX = 'center';
        let dockY = 'bottom';
        if (target) {
            const r = target.el.getBoundingClientRect();
            const pad = 6;
            Object.assign(spotlight.style, {
                left: `${r.left - pad}px`, top: `${r.top - pad}px`,
                width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`
            });
            spotlight.hidden = false;
            const cx = (r.left + r.right) / 2;
            const cy = (r.top + r.bottom) / 2;
            dockY = cy > window.innerHeight / 2 ? 'top' : 'bottom';
            if (cx < window.innerWidth / 3) dockX = 'right';
            else if (cx > window.innerWidth * 2 / 3) dockX = 'left';
        } else {
            spotlight.hidden = true;
            if (placing) { // canto de cima: centro do mapa e barra do modo construção livres
                dockX = 'right';
                dockY = 'top';
            }
        }
        container.dataset.dockX = dockX;
        container.dataset.dockY = dockY;

        // o "Próximo" destrava assim que o passo é cumprido
        document.getElementById('tutorial-next-btn').disabled = !this.isStepDone(step);
    }

    findTarget(targets = []) {
        for (const t of targets) {
            const el = document.querySelector(t.selector || t);
            if (!el) continue;
            // alvo dentro de lista rolável: traz para a vista se a lista estiver na tela
            if (t.scrollIn && !this.isOnScreen(el) && this.isOnScreen(document.querySelector(t.scrollIn))) {
                el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            if (this.isOnScreen(el)) return { el, text: t.text };
        }
        return null;
    }

    isOnScreen(el) {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 &&
            r.left < window.innerWidth && r.top < window.innerHeight &&
            (el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) ?? true);
    }

    /**
     * Hook chamado por BuildingSystem.placeBuilding. A prefeitura do tutorial é
     * grátis e fica pronta na hora (o loop está congelado, a obra nunca terminaria).
     */
    onBuildingPlaced(building) {
        const step = this.steps[this.currentStep];
        if (!this.isActive || building.type !== step?.waitFor) return;

        const gm = this.gameManager;
        gm.resourceManager.adjustResource('budget', building.config.cost);
        gm.buildingSystem.buildingCooldown.active = false;
        gm.buildingSystem.completeConstruction(building);
        if (building.type === 'city_hall') {
            gm.addCityHallLightingEffects(building);
            gm.centerCameraOnCityHall(building.gridX, building.gridZ);
        }
        this.next();
    }

    onKeyDown(e) {
        if (!this.isActive || e.target.closest?.('button, input, textarea, select')) return;
        if (document.querySelector('.swal2-container')) return;

        const story = this.mode === 'story';
        const nextBtn = document.getElementById('tutorial-next-btn');
        const skipBtn = document.getElementById('tutorial-skip-btn');

        if (e.key === 'Enter' || (story && e.key === 'ArrowRight')) {
            if (!nextBtn.disabled) this.next();
        } else if (story && e.key === 'ArrowLeft') {
            this.previous();
        } else if (e.key === 'Escape' && !skipBtn.hidden) {
            this.skip();
        } else {
            return; // no modo coach as setas continuam movendo a câmera
        }
        e.preventDefault();
        e.stopPropagation();
    }

    goTo(index) {
        this.currentStep = index;
        this.renderCurrentStep();
    }

    next() {
        if (!this.isStepDone(this.steps[this.currentStep])) return;
        if (this.currentStep < this.steps.length - 1) {
            this.goTo(this.currentStep + 1);
        } else {
            this.complete();
        }
    }

    previous() {
        if (this.currentStep > 0) this.goTo(this.currentStep - 1);
    }

    /**
     * "Pular" leva ao início da próxima parte. Partes obrigatórias não têm o botão.
     */
    skip() {
        if (this.run === 'lessons') return this.complete();
        const step = this.steps[this.currentStep];
        const group = this.groupOf(step);
        if (!step.skipLabel && !TutorialSystem.SKIP_LABELS[group]) return;
        if (group === 'intro') { // "durante o jogo": as aulas que faltam vêm uma por missão
            this.lessonsDeferred = true;
            this.nextChapter = step.chapter || 1;
        }
        const nextIndex = this.steps.findIndex((s, i) => i > this.currentStep && this.groupOf(s) !== group);
        log(`📚 Parte "${group}" pulada`);
        if (nextIndex === -1) return this.complete();
        this.goTo(nextIndex);
    }

    /**
     * Encerra o tutorial e só então solta o jogo.
     */
    complete() {
        if (!this.isActive) return;
        this.isActive = false;
        clearInterval(this.coachTimer);
        document.removeEventListener('keydown', this.handleKey, true);
        this.hideTutorialUI();
        stopSpeaking();
        this.dispose3DPortrait();

        const gm = this.gameManager;
        gm.gameState = 'playing';
        if (this.run === 'lessons') return;

        gm.timeScale = 1;
        gm.questSystem?.restartClocks();
        gm.saveSystem?.setTutorialCompleted(true);

        log('✅ Tutorial concluído');
        gm.uiManager?.showNotification('🎓 Tutorial concluído! Boa sorte, Guardião da Água!', 'success', 5000);
    }
}

TutorialSystem.GROUP_LABELS = { intro: 'Introdução', cityhall: 'Prefeitura', missions: 'Missões', interface: 'Interface', end: 'Final' };
TutorialSystem.SKIP_LABELS = { intro: 'Pular aulas', missions: 'Pular esta parte', interface: 'Pular esta parte' };


// Exportar para escopo global
window.TutorialSystem = TutorialSystem;
log('📚 TutorialSystem carregado e exportado para window.TutorialSystem');
