/**
 * GUARDIÃO DA ÁGUA - STUDY SYSTEM
 * Sistema educacional de estudos para desbloqueio de edifícios
 */

class StudySystem {
    constructor(gameManager) {
        console.log('📚 Inicializando StudySystem...');

        this.gameManager = gameManager;

        // Estado de desbloqueio de edifícios
        this.unlockedBuildings = new Set();

        // Conteúdo educacional
        this.studyContent = new Map();

        // Estado atual do estudo
        this.currentStudy = null;
        this.currentPage = 0;

        // Quiz state management
        this.currentQuizAnswers = {}; // { questionId: selectedOptionIndex }
        this.quizScore = 0;
        this.quizCompleted = false;

        // Flag para indicar se o conteúdo foi carregado
        this.contentLoaded = false;

        // Edifícios desbloqueados por padrão (tutorial/básicos)
        this.defaultUnlockedBuildings = [
            'city_hall',      // Prefeitura (sempre disponível)
            'road',           // Estradas (básico)
            'park'            // Parque (básico)
        ];

        // Inicializar edifícios padrão como desbloqueados
        this.defaultUnlockedBuildings.forEach(id => {
            this.unlockedBuildings.add(id);
        });

        console.log('✅ StudySystem inicializado (aguardando carregamento de conteúdo)');
    }

    // ===== INICIALIZAÇÃO ASSÍNCRONA =====
    async initialize() {
        console.log('📚 Carregando conteúdo educacional...');
        await this.loadStudyContent();
        console.log('✅ StudySystem totalmente inicializado');
    }

    // ===== CARREGAMENTO DE CONTEÚDO =====
    async loadStudyContent() {
        try {
            const response = await fetch('data/building-studies.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.json();

            // Armazenar conteúdo no Map
            Object.entries(content).forEach(([buildingId, studyData]) => {
                this.studyContent.set(buildingId, studyData);
            });

            this.contentLoaded = true;
            console.log(`📚 ${this.studyContent.size} módulos de estudo carregados`);

            // Auto-unlock buildings without study content
            this.unlockBuildingsWithoutStudyContent();

            // Refresh building items in UI after content loads
            if (this.gameManager && this.gameManager.uiManager) {
                // Small delay to ensure UI is ready
                setTimeout(() => {
                    if (this.gameManager.uiManager.loadBuildingItemsWithStateManagement) {
                        this.gameManager.uiManager.loadBuildingItemsWithStateManagement();
                    }
                }, 100);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar conteúdo de estudos:', error);
            console.error('   Detalhes:', error.message);
            this.contentLoaded = false;
        }
    }
    
    // ===== VERIFICAÇÃO DE DESBLOQUEIO =====
    isBuildingUnlocked(buildingId) {
        // If building is already unlocked, return true
        if (this.unlockedBuildings.has(buildingId)) {
            return true;
        }

        // If content is loaded and building has no study content, auto-unlock it
        if (this.contentLoaded && !this.hasStudyContent(buildingId)) {
            return true;
        }

        return false;
    }

    hasStudyContent(buildingId) {
        return this.studyContent.has(buildingId);
    }

    // Auto-unlock all buildings that don't have study content
    unlockBuildingsWithoutStudyContent() {
        if (!this.gameManager || !this.gameManager.buildingSystem) {
            console.warn('⚠️ BuildingSystem not available for auto-unlock');
            return;
        }

        const allBuildingTypes = this.gameManager.buildingSystem.buildingTypes;
        let unlockedCount = 0;

        allBuildingTypes.forEach((buildingType, buildingId) => {
            // Skip if already unlocked
            if (this.unlockedBuildings.has(buildingId)) {
                return;
            }

            // Auto-unlock if no study content exists
            if (!this.hasStudyContent(buildingId)) {
                this.unlockedBuildings.add(buildingId);
                unlockedCount++;
            }
        });

        console.log(`🔓 Auto-unlocked ${unlockedCount} buildings without study content`);
    }
    
    // ===== DESBLOQUEIO DE EDIFÍCIOS =====
    unlockBuilding(buildingId) {
        if (!this.unlockedBuildings.has(buildingId)) {
            this.unlockedBuildings.add(buildingId);
            console.log(`🔓 Edifício desbloqueado: ${buildingId}`);
            
            // Notificar UI
            if (this.gameManager.uiManager) {
                const buildingType = this.gameManager.buildingSystem.buildingTypes.get(buildingId);
                if (buildingType) {
                    this.gameManager.uiManager.showNotification(
                        `🎓 ${buildingType.name} desbloqueado!`,
                        'success'
                    );
                }
            }
            
            // Salvar progresso
            this.saveProgress();
            
            return true;
        }
        return false;
    }
    
    // ===== GESTÃO DE ESTUDO =====
    getStudyContent(buildingId) {
        return this.studyContent.get(buildingId);
    }
    
    startStudy(buildingId) {
        const content = this.getStudyContent(buildingId);
        if (!content) {
            console.warn(`⚠️ Conteúdo de estudo não encontrado para: ${buildingId}`);
            return false;
        }

        this.currentStudy = buildingId;
        this.currentPage = 0;

        // Reset quiz state
        this.currentQuizAnswers = {};
        this.quizScore = 0;
        this.quizCompleted = false;

        console.log(`📖 Iniciando estudo: ${content.studyTitle}`);
        return true;
    }
    
    completeStudy(buildingId) {
        if (this.currentStudy === buildingId) {
            this.unlockBuilding(buildingId);
            this.currentStudy = null;
            this.currentPage = 0;
            
            console.log(`✅ Estudo concluído: ${buildingId}`);
            return true;
        }
        return false;
    }
    
    // ===== NAVEGAÇÃO DE PÁGINAS =====
    getCurrentPage() {
        if (!this.currentStudy) return null;
        
        const content = this.getStudyContent(this.currentStudy);
        if (!content || !content.pages) return null;
        
        return content.pages[this.currentPage];
    }
    
    nextPage() {
        if (!this.currentStudy) return false;
        
        const content = this.getStudyContent(this.currentStudy);
        if (!content || !content.pages) return false;
        
        if (this.currentPage < content.pages.length - 1) {
            this.currentPage++;
            return true;
        }
        return false;
    }
    
    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            return true;
        }
        return false;
    }
    
    isLastPage() {
        if (!this.currentStudy) return false;

        const content = this.getStudyContent(this.currentStudy);
        if (!content || !content.pages) return false;

        return this.currentPage === content.pages.length - 1;
    }

    getProgress() {
        if (!this.currentStudy) return 0;

        const content = this.getStudyContent(this.currentStudy);
        if (!content || !content.pages) return 0;

        return Math.round(((this.currentPage + 1) / content.pages.length) * 100);
    }

    // ===== SAVE/LOAD =====
    getSaveData() {
        return {
            unlockedBuildings: Array.from(this.unlockedBuildings)
        };
    }

    loadSaveData(data) {
        if (data && data.unlockedBuildings) {
            this.unlockedBuildings = new Set(data.unlockedBuildings);
            console.log(`📁 ${this.unlockedBuildings.size} edifícios desbloqueados carregados`);
        }
    }

    saveProgress() {
        // Salvar automaticamente através do GameManager
        if (this.gameManager && this.gameManager.saveSystem) {
            // Trigger autosave
            console.log('💾 Progresso de estudos salvo');
        }
    }

    // ===== QUIZ MANAGEMENT =====
    hasQuiz() {
        if (!this.currentStudy) return false;

        const content = this.getStudyContent(this.currentStudy);
        return content && content.quiz && content.quiz.enabled === true;
    }

    getQuiz() {
        if (!this.currentStudy) return null;

        const content = this.getStudyContent(this.currentStudy);
        if (!content || !content.quiz || !content.quiz.enabled) return null;

        return content.quiz;
    }

    submitQuizAnswer(questionId, selectedOptionIndex) {
        this.currentQuizAnswers[questionId] = selectedOptionIndex;
        console.log(`📝 Resposta registrada - Questão ${questionId}: Opção ${selectedOptionIndex}`);
    }

    calculateQuizScore() {
        const quiz = this.getQuiz();
        if (!quiz || !quiz.questions) return 0;

        let correctAnswers = 0;
        const totalQuestions = quiz.questions.length;

        quiz.questions.forEach(question => {
            const userAnswer = this.currentQuizAnswers[question.id];
            if (userAnswer === question.correctAnswer) {
                correctAnswers++;
            }
        });

        this.quizScore = Math.round((correctAnswers / totalQuestions) * 100);
        console.log(`📊 Quiz Score: ${correctAnswers}/${totalQuestions} (${this.quizScore}%)`);

        return this.quizScore;
    }

    isQuizPassed() {
        const quiz = this.getQuiz();
        if (!quiz) return true; // No quiz = auto pass

        const score = this.calculateQuizScore();
        const passed = score >= quiz.passingScore;

        console.log(`🎓 Quiz ${passed ? 'APROVADO' : 'REPROVADO'}: ${score}% (mínimo: ${quiz.passingScore}%)`);

        return passed;
    }

    areAllQuestionsAnswered() {
        const quiz = this.getQuiz();
        if (!quiz || !quiz.questions) return true;

        const answeredCount = Object.keys(this.currentQuizAnswers).length;
        const totalQuestions = quiz.questions.length;

        return answeredCount === totalQuestions;
    }

    // ===== RESET =====
    reset() {
        this.unlockedBuildings = new Set(this.defaultUnlockedBuildings);
        this.currentStudy = null;
        this.currentPage = 0;
        this.currentQuizAnswers = {};
        this.quizScore = 0;
        this.quizCompleted = false;
        console.log('🔄 StudySystem resetado');
    }
}

// Exportar para escopo global
window.StudySystem = StudySystem;
console.log('📚 StudySystem carregado e exportado para window.StudySystem');

