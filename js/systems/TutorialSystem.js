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
            this.portraitScene.clearColor = new BABYLON.Color4(0.4, 0.62, 1.0, 1.0); // Sky blue background

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

            // Add lighting
            const light1 = new BABYLON.HemisphericLight(
                'portraitLight1',
                new BABYLON.Vector3(0, 1, 0),
                this.portraitScene
            );
            light1.intensity = 0.7;

            const light2 = new BABYLON.DirectionalLight(
                'portraitLight2',
                new BABYLON.Vector3(-1, -2, -1),
                this.portraitScene
            );
            light2.intensity = 0.5;

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
    async load3DCharacter(modelPath) {
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

            console.log('📦 Loading OBJ model...');

            // Load OBJ model
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                '',
                'models/Characters/girl-reading-a-book-icon-obj/',
                'girl-reading-a-book-icon.obj',
                this.portraitScene
            );

            if (result.meshes && result.meshes.length > 0) {
                console.log(`✅ Loaded ${result.meshes.length} meshes`);

                // Create parent mesh for the model
                this.portraitModel = new BABYLON.TransformNode('characterModel', this.portraitScene);

                // Parent all loaded meshes
                result.meshes.forEach(mesh => {
                    if (mesh.parent === null) {
                        mesh.parent = this.portraitModel;
                    }
                });

                // AUTO-CALCULATE BOUNDING BOX AND POSITION
                const meshes = result.meshes.filter(m => m.name !== '__root__');
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
                await this.applyPBRTextures(meshes);

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
    async applyPBRTextures(meshes) {
        const texturePath = 'models/Characters/girl-reading-a-book-icon-obj/textures/';
        const texturePrefix = 'girl-reading-a-book-icon-001-';

        console.log('🎨 Applying PBR textures...');

        try {
            // Create PBR material
            const pbr = new BABYLON.PBRMaterial('girlPBR', this.portraitScene);

            // Load textures
            const colorTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'col-metalness-4k.png',
                this.portraitScene
            );
            pbr.albedoTexture = colorTexture;

            const normalTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'nrm-metalness-4k.png',
                this.portraitScene
            );
            pbr.bumpTexture = normalTexture;

            const roughnessTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'roughness-metalness-4k.png',
                this.portraitScene
            );
            pbr.metallicTexture = roughnessTexture;
            pbr.useRoughnessFromMetallicTextureAlpha = false;
            pbr.useRoughnessFromMetallicTextureGreen = true;
            pbr.useMetallnessFromMetallicTextureBlue = true;

            const aoTexture = new BABYLON.Texture(
                texturePath + texturePrefix + 'ao-metalness-4k.png',
                this.portraitScene
            );
            pbr.ambientTexture = aoTexture;

            // Apply material to all meshes
            meshes.forEach(mesh => {
                if (mesh.material) {
                    mesh.material = pbr;
                }
            });

            console.log('✅ PBR textures applied successfully');
        } catch (error) {
            console.warn('⚠️ Error loading textures, using default material:', error);
            
            // Fallback to simple material
            const fallbackMat = new BABYLON.StandardMaterial('girlFallback', this.portraitScene);
            fallbackMat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 0.7);
            meshes.forEach(mesh => {
                if (mesh.material) {
                    mesh.material = fallbackMat;
                }
            });
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
            // Avatar estilo cartoon gerado dinamicamente
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            // Fundo: Imagem tecnológica/global
            background: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1080',
            title: 'Precisamos da sua visão, Guardião.',
            text: 'Olá, eu sou a Pesquisadora Cláudia. A situação dos nossos recursos hídricos chegou a um ponto crítico e precisamos de alguém com capacidade estratégica para assumir o comando. Eu estarei aqui para dar suporte, mas as decisões difíceis? Essas serão suas.',
            icon: '👋'
        },
        
        // Step 2: Concepts - Resources & Cycle
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            // Fundo: Chuva/Ciclo da água
            background: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1080',
            title: 'Entendendo o Sistema',
            text: 'Antes de agir, observe. Nossos **recursos hídricos** não são infinitos. Eles dependem do **ciclo hidrológico**: a chuva cai, infiltra no solo, abastece os rios e evapora novamente. Se quebrarmos um elo desse ciclo, o sistema entra em colapso.',
            icon: '🔄',
            educationalTopic: 'ciclo_hidrologico'
        },
        
        // Step 3: Concept - Watershed
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            // Fundo: Vista aérea de rio sinuoso (Bacia)
            background: 'https://images.unsplash.com/photo-1504198458649-3128b932f49e?q=80&w=1080',
            title: 'O Território: A Bacia Hidrográfica',
            text: 'Imagine a região como uma grande tigela inclinada. Isso é a **Bacia Hidrográfica**. Toda gota de chuva ou poluente que cai nas bordas escorre para o mesmo rio principal no centro. Ou seja: o que você faz no alto do morro impacta quem vive lá embaixo.',
            icon: '🏞️',
            educationalTopic: 'bacia_hidrografica'
        },
        
        // Step 4: Research Centers
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            // Fundo: Laboratório/Microscópio
            background: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1080',
            title: 'Informação é Poder',
            text: 'Não tome decisões no escuro. Os **Centros de Pesquisa** são seus olhos e ouvidos. Eles monitoram a qualidade da água e indicam onde estão os problemas invisíveis. Sem ciência, estamos apenas adivinhando.',
            icon: '🔬',
            educationalTopic: 'centros_pesquisa'
        },
        
        // Step 5: Agriculture Dilemma
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            // Fundo: Plantação vasta
            background: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=1080',
            title: 'O Desafio da Produção',
            text: 'Aqui temos um dilema: a **produção de cana** e a **pecuária** movem a economia, mas exigem muita água. O risco real? O uso incorreto de **agrotóxicos**. Se eles lavarem para o rio, contaminam tudo. Seu papel é buscar o equilíbrio.',
            icon: '⚖️',
            educationalTopic: 'agricultura_agua'
        },

        // Step 6: Riparian Forest & APP
        {
            character: 'Téo, a Lontra',
            // Retrato: Lontra real (Unsplash)
            portrait: 'https://images.unsplash.com/photo-1598556885318-48a33d94309f?q=80&w=400',
            // Fundo: Floresta densa e verde
            background: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1080',
            title: 'Ei! Proteja minha casa! 🦦',
            text: 'Oi! A Claudia fala difícil, né? Deixa eu explicar: a **Mata Ciliar** funciona como os cílios dos seus olhos. Ela protege o rio! Essas áreas são **APPs (Áreas de Preservação Permanente)**. Sem elas, a terra cai na água e minha toca desaparece.',
            icon: '🌳',
            educationalTopic: 'mata_ciliar_app'
        },

        // Step 7: Erosion & Sedimentation
        {
            character: 'Téo, a Lontra',
            portrait: 'https://images.unsplash.com/photo-1598556885318-48a33d94309f?q=80&w=400',
            // Fundo: Terra seca/Erosão
            background: 'https://images.unsplash.com/photo-1599940824399-b87987ce0799?q=80&w=1080',
            title: 'O Rio está sufocando',
            text: 'Quando tiram as árvores, a chuva leva a terra solta para o rio. Isso é **erosão**. Essa terra se acumula no fundo (**assoreamento**) e o rio fica rasinho. É como tentar nadar em uma piscina cheia de areia. Não dá!',
            icon: '🧱',
            educationalTopic: 'erosao_assoreamento'
        },

        // Step 8: Sewage & Contamination Details
        {
            character: 'Dr. Sapo',
            // Retrato: Sapo real vibrante (Unsplash)
            portrait: 'https://images.unsplash.com/photo-1579389083078-4e7018379f7e?q=80&w=400',
            // Fundo: Água turva/poluída
            background: 'https://images.unsplash.com/photo-1573166675921-076ea6b621ce?q=80&w=1080',
            title: 'Alerta de Toxicidade! ☣️',
            text: 'Croac! Atenção aos níveis de **esgoto**! O excesso de matéria orgânica consome todo o **oxigênio dissolvido** na água. Além disso, traz **coliformes fecais** e doenças. Sem tratamento de esgoto, a vida aquática — e a minha — acaba.',
            icon: '🤢',
            educationalTopic: 'esgoto_contaminacao'
        },

        // Step 9: Groundwater & Springs
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            // Fundo: Caverna ou água subterrânea (atmosfera)
            background: 'https://images.unsplash.com/photo-1633511090164-b43840ea1607?q=80&w=1080',
            title: 'O Perigo Invisível',
            text: 'Cuidado com o que vaza para o solo. **Chorume** de lixões e excesso de **nitrato** podem contaminar a **água subterrânea**. Uma vez poluído, um aquífero pode levar décadas para se recuperar. Proteja as **nascentes** como se fossem tesouros.',
            icon: '💧',
            educationalTopic: 'agua_subterranea'
        },

        // Step 10: Urban Planning (Várzea)
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            // Fundo: Cidade próxima à água
            background: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1080',
            title: 'A Cidade e o Rio',
            text: 'O rio precisa de espaço para respirar. A **ocupação desordenada em áreas de várzea** (as margens naturais de inundação) é um erro grave. Se construirmos ali, teremos enchentes constantes. Precisamos planejar onde a cidade cresce.',
            icon: '🏗️',
            educationalTopic: 'ocupacao_urbana'
        },

        // Step 11: Green Infrastructure Solutions
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            // Fundo: Parede verde/Jardim urbano
            background: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1080',
            title: 'Tecnologia Verde',
            text: 'Podemos inovar! **Jardins de chuva**, **tetos verdes** e **parques lineares** ajudam a cidade a absorver a água como uma esponja, evitando enchentes. É a engenharia trabalhando a favor da natureza.',
            icon: '🌿',
            educationalTopic: 'infraestrutura_verde'
        },

        // Step 12: Floating Gardens
        {
            character: 'Dr. Sapo',
            portrait: 'https://images.unsplash.com/photo-1579389083078-4e7018379f7e?q=80&w=400',
            // Fundo: Plantas aquáticas/Vitória Régia
            background: 'https://images.unsplash.com/photo-1542355554-46329402513f?q=80&w=1080',
            title: 'Ilhas que Limpam',
            text: 'Minha solução favorita: **jardins flutuantes**! São ilhas de plantas nativas que flutuam no rio. As raízes filtram poluentes naturalmente. É bonito, eficiente e cria um habitat perfeito para nós!',
            icon: '🪷',
            educationalTopic: 'jardins_flutuantes'
        },

        // Step 13: Conclusion
        {
            character: 'Claudia',
            portrait: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Claudia&backgroundColor=b6e3f4&clothing=blazerAndShirt&eyes=happy',
            // Fundo: Luz do sol/Esperança
            background: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1080',
            title: 'O Comando é Seu',
            text: 'Agora você entende a complexidade. Agricultura, cidade, floresta e água... tudo está conectado. Suas escolhas definirão se teremos um futuro sustentável ou um colapso ambiental. Boa sorte, Guardião.',
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
    renderCurrentStep() {
        const step = this.tutorialSteps[this.currentStep];
        if (!step) return;

        // Handle portrait display (3D or 2D)
        const portrait = document.getElementById('tutorial-portrait');
        const portraitCanvas = document.getElementById('tutorial-portrait-canvas');

        if (this.use3DPortrait && this.portraitScene && step.character === 'Claudia') {
            // Show 3D portrait for Claudia
            if (portraitCanvas) {
                portraitCanvas.style.display = 'block';
            }
            if (portrait) {
                portrait.style.display = 'none';
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
        if (text) text.textContent = step.text;

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

