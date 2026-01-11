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
     * Creates all tutorial steps with educational content
     */
    createTutorialSteps() {
        return [
            // Step 1: Introduction
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_1.jpg',
                title: 'Bem-vindo, Guardião!',
                text: 'Olá! Eu sou a Pesquisadora Claudia, e você foi escolhido para uma missão muito importante! Você será o responsável por gerenciar os recursos hídricos da nossa cidade. Está pronto para essa aventura?',
                icon: '👋'
            },
            
            // Step 2: Game Concept
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_2.jpg',
                title: 'Sua Missão',
                text: 'Como Guardião da Água, você vai construir estações de tratamento, proteger nascentes, e tomar decisões que afetam toda a população. Cada escolha sua terá consequências reais para a cidade!',
                icon: '🎯'
            },
            
            // Step 3: Water Resources
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_3.jpg',
                title: 'Recursos Hídricos',
                text: 'Os recursos hídricos são todas as fontes de água disponíveis: rios, lagos, água subterrânea e até a chuva! Nossa missão é proteger e usar esses recursos de forma inteligente.',
                icon: '💧',
                educationalTopic: 'recursos_hidricos'
            },
            
            // Step 4: Hydrological Cycle
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_4.jpg',
                title: 'Ciclo Hidrológico',
                text: 'A água está sempre em movimento! Ela evapora dos rios e oceanos, forma nuvens, cai como chuva, infiltra no solo e volta aos rios. É um ciclo perfeito da natureza!',
                icon: '🌊',
                educationalTopic: 'ciclo_hidrologico'
            },
            
            // Step 5: Watershed
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_5.jpg',
                title: 'Bacia Hidrográfica',
                text: 'Uma bacia hidrográfica é como uma grande bacia natural onde toda a água da chuva escorre para o mesmo rio principal. Tudo que acontece em uma parte da bacia afeta o resto!',
                icon: '🏞️',
                educationalTopic: 'bacia_hidrografica'
            },
            
            // Step 6: Research Centers
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_6.jpg',
                title: 'Centros de Pesquisa',
                text: 'Os centros de pesquisa são essenciais! Eles estudam a qualidade da água, desenvolvem novas tecnologias de tratamento e nos ajudam a tomar decisões baseadas em ciência.',
                icon: '🔬',
                educationalTopic: 'centros_pesquisa'
            },
            
            // Step 7: Agricultural Impact
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_7.jpg',
                title: 'Agricultura e Água',
                text: 'A produção de cana-de-açúcar e a pecuária precisam de muita água. O uso de agrotóxicos pode contaminar rios e lençóis freáticos. Precisamos equilibrar produção e proteção ambiental!',
                icon: '🌾',
                educationalTopic: 'agricultura_agua'
            },

            // Step 8: Riparian Forest and APP
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_8.jpg',
                title: 'Mata Ciliar e APP',
                text: 'A mata ciliar é a vegetação que protege as margens dos rios. As APPs (Áreas de Preservação Permanente) são zonas protegidas por lei. Elas evitam erosão e mantêm a água limpa!',
                icon: '🌳',
                educationalTopic: 'mata_ciliar_app'
            },

            // Step 9: Sewage and Contamination
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_9.jpg',
                title: 'Esgoto e Contaminação',
                text: 'O despejo de esgoto sem tratamento nos rios é um problema grave! Contamina a água, mata peixes e pode causar doenças. Precisamos construir estações de tratamento!',
                icon: '🚰',
                educationalTopic: 'esgoto_contaminacao'
            },

            // Step 10: Erosion and Sedimentation
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_10.jpg',
                title: 'Erosão e Assoreamento',
                text: 'Quando a chuva leva terra para os rios, isso se chama erosão. O acúmulo de sedimentos no fundo dos rios é o assoreamento. Isso diminui a quantidade de água disponível!',
                icon: '⛰️',
                educationalTopic: 'erosao_assoreamento'
            },

            // Step 11: Groundwater Protection
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_11.jpg',
                title: 'Água Subterrânea',
                text: 'A água subterrânea fica armazenada em aquíferos, como grandes reservatórios naturais. Uma vez contaminada, é muito difícil limpar! Proteger nascentes e evitar poluição é essencial.',
                icon: '💦',
                educationalTopic: 'agua_subterranea'
            },

            // Step 12: Spring and River Protection
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_12.jpg',
                title: 'Proteção de Nascentes',
                text: 'As nascentes são o início dos rios! Protegê-las com vegetação nativa e cercas evita que animais e poluentes contaminem a água desde a origem.',
                icon: '⛲',
                educationalTopic: 'protecao_nascentes'
            },

            // Step 13: Urban Planning
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_13.jpg',
                title: 'Ocupação Urbana',
                text: 'A ocupação desordenada em áreas de bacia hidrográfica causa problemas! Construções irregulares perto de rios aumentam enchentes e poluição. Planejamento é fundamental!',
                icon: '🏘️',
                educationalTopic: 'ocupacao_urbana'
            },

            // Step 14: Green Infrastructure
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_14.jpg',
                title: 'Infraestrutura Verde',
                text: 'Parques lineares, jardins de chuva, tetos e paredes verdes são soluções modernas! Eles ajudam a absorver água da chuva, reduzem enchentes e deixam a cidade mais bonita!',
                icon: '🌿',
                educationalTopic: 'infraestrutura_verde'
            },

            // Step 15: Floating Gardens
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_15.jpg',
                title: 'Jardins Flutuantes',
                text: 'Jardins flutuantes com plantas filtrantes são incríveis! Eles flutuam nos rios, absorvem poluentes e ainda embelezam a paisagem. Tecnologia e natureza trabalhando juntas!',
                icon: '🪷',
                educationalTopic: 'jardins_flutuantes'
            },

            // Step 16: Final Message
            {
                character: 'Claudia',
                portrait: 'assets/images/claudia_portrait.png',
                background: 'assets/images/tutorial_bg_16.jpg',
                title: 'Você Está Pronto!',
                text: 'Agora você conhece os principais desafios da gestão de recursos hídricos! Lembre-se: cada decisão sua afeta a vida de milhares de pessoas. Seja um verdadeiro Guardião da Água! 💪',
                icon: '🎓'
            }
        ];
    }

    /**
     * Starts the tutorial
     */
    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.showTutorialUI();
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

        // FIX #3: Update character portrait with proper fallback
        const portrait = document.getElementById('tutorial-portrait');
        if (portrait) {
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

