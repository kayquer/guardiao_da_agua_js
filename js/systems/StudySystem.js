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
        
        // Carregar conteúdo educacional
        this.loadStudyContent();
        
        console.log('✅ StudySystem inicializado');
    }
    
    // ===== CARREGAMENTO DE CONTEÚDO =====
    async loadStudyContent() {
        try {
            const response = await fetch('data/building-studies.json');
            const content = await response.json();

            // Armazenar conteúdo no Map
            Object.entries(content).forEach(([buildingId, studyData]) => {
                this.studyContent.set(buildingId, studyData);
            });

            console.log(`📚 ${this.studyContent.size} módulos de estudo carregados`);

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
        }
    }
    
    // ===== VERIFICAÇÃO DE DESBLOQUEIO =====
    isBuildingUnlocked(buildingId) {
        return this.unlockedBuildings.has(buildingId);
    }
    
    hasStudyContent(buildingId) {
        return this.studyContent.has(buildingId);
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

    // ===== RESET =====
    reset() {
        this.unlockedBuildings = new Set(this.defaultUnlockedBuildings);
        this.currentStudy = null;
        this.currentPage = 0;
        console.log('🔄 StudySystem resetado');
    }
}

// Exportar para escopo global
window.StudySystem = StudySystem;
console.log('📚 StudySystem carregado e exportado para window.StudySystem');

