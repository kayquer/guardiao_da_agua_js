/**
 * GUARDIÃO DA ÁGUA - SAVE SYSTEM
 * Sistema de persistência usando localStorage
 */

class SaveSystem {
    constructor() {
        console.log('💾 Inicializando SaveSystem...');
        
        // Configurações
        this.saveKey = 'guardiao_agua_save';
        this.autoSaveKey = 'guardiao_agua_autosave';
        this.settingsKey = 'guardiao_agua_settings';
        this.maxSaveSlots = 5;
        this.compressionEnabled = true;
        
        // Verificar suporte
        this.storageAvailable = this.checkStorageSupport();
        
        console.log('✅ SaveSystem inicializado');
    }
    
    // ===== VERIFICAÇÃO DE SUPORTE =====
    checkStorageSupport() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('⚠️ localStorage não disponível');
            return false;
        }
    }
    
    // ===== SAVE MANUAL =====
    saveGame(gameData, slotName = 'manual_save') {
        if (!this.storageAvailable) {
            console.error('❌ Sistema de save não disponível');
            return false;
        }
        
        try {
            const saveData = this.prepareSaveData(gameData, slotName);
            const key = `${this.saveKey}_${slotName}`;
            
            // Comprimir dados se habilitado
            const dataToSave = this.compressionEnabled ? 
                this.compressData(saveData) : 
                JSON.stringify(saveData);
            
            localStorage.setItem(key, dataToSave);
            
            // Atualizar lista de saves
            this.updateSaveList(slotName, saveData.metadata);
            
            console.log(`💾 Jogo salvo: ${slotName}`);
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao salvar jogo:', error);
            return false;
        }
    }
    
    // ===== AUTO-SAVE =====
    autoSave(gameData) {
        if (!this.storageAvailable) return false;
        
        try {
            const saveData = this.prepareSaveData(gameData, 'auto_save');
            const dataToSave = this.compressionEnabled ? 
                this.compressData(saveData) : 
                JSON.stringify(saveData);
            
            localStorage.setItem(this.autoSaveKey, dataToSave);
            
            console.log('💾 Auto-save realizado');
            return true;
            
        } catch (error) {
            console.error('❌ Erro no auto-save:', error);
            return false;
        }
    }
    
    // ===== PREPARAÇÃO DOS DADOS =====
    prepareSaveData(gameData, slotName) {
        const now = new Date();
        
        return {
            metadata: {
                version: '1.0.0',
                slotName: slotName,
                timestamp: now.getTime(),
                dateString: now.toLocaleString('pt-BR'),
                gameTime: gameData.gameTime || 0,
                playerScore: gameData.quests?.totalScore || 0,
                population: gameData.resources?.population?.current || 0,
                buildingCount: gameData.buildings?.buildings?.length || 0
            },
            gameData: {
                ...gameData,
                saveVersion: '1.0.0'
            }
        };
    }
    
    // ===== LOAD =====
    loadGame(slotName = 'manual_save') {
        if (!this.storageAvailable) {
            console.error('❌ Sistema de save não disponível');
            return null;
        }
        
        try {
            const key = `${this.saveKey}_${slotName}`;
            const savedData = localStorage.getItem(key);
            
            if (!savedData) {
                console.warn(`⚠️ Save não encontrado: ${slotName}`);
                return null;
            }
            
            // Descomprimir se necessário
            const saveData = this.compressionEnabled ? 
                this.decompressData(savedData) : 
                JSON.parse(savedData);
            
            // Verificar versão
            if (!this.isCompatibleVersion(saveData)) {
                console.warn('⚠️ Versão do save incompatível');
                return null;
            }
            
            console.log(`📁 Jogo carregado: ${slotName}`);
            return saveData.gameData;
            
        } catch (error) {
            console.error('❌ Erro ao carregar jogo:', error);
            return null;
        }
    }
    
    loadAutoSave() {
        if (!this.storageAvailable) return null;
        
        try {
            const savedData = localStorage.getItem(this.autoSaveKey);
            
            if (!savedData) {
                console.warn('⚠️ Auto-save não encontrado');
                return null;
            }
            
            const saveData = this.compressionEnabled ? 
                this.decompressData(savedData) : 
                JSON.parse(savedData);
            
            if (!this.isCompatibleVersion(saveData)) {
                console.warn('⚠️ Versão do auto-save incompatível');
                return null;
            }
            
            console.log('📁 Auto-save carregado');
            return saveData.gameData;
            
        } catch (error) {
            console.error('❌ Erro ao carregar auto-save:', error);
            return null;
        }
    }
    
    // ===== VERIFICAÇÕES =====
    hasSaveData(slotName = 'manual_save') {
        if (!this.storageAvailable) return false;
        
        const key = `${this.saveKey}_${slotName}`;
        return localStorage.getItem(key) !== null;
    }
    
    hasAutoSave() {
        if (!this.storageAvailable) return false;
        return localStorage.getItem(this.autoSaveKey) !== null;
    }
    
    isCompatibleVersion(saveData) {
        // Verificar compatibilidade de versão
        const saveVersion = saveData.metadata?.version || '1.0.0';
        const currentVersion = '1.0.0';
        
        // Por enquanto, aceitar apenas a mesma versão
        return saveVersion === currentVersion;
    }
    
    // ===== LISTA DE SAVES =====
    updateSaveList(slotName, metadata) {
        try {
            const saveListKey = `${this.saveKey}_list`;
            let saveList = JSON.parse(localStorage.getItem(saveListKey) || '{}');
            
            saveList[slotName] = metadata;
            
            localStorage.setItem(saveListKey, JSON.stringify(saveList));
            
        } catch (error) {
            console.error('❌ Erro ao atualizar lista de saves:', error);
        }
    }

    // ===== COMPRESSÃO =====
    compressData(data) {
        try {
            // Compressão simples usando JSON.stringify com replacer
            const jsonString = JSON.stringify(data);
            
            // Para uma compressão real, seria necessário usar uma biblioteca como pako
            // Por enquanto, apenas retornar o JSON string
            return jsonString;
            
        } catch (error) {
            console.error('❌ Erro na compressão:', error);
            return JSON.stringify(data);
        }
    }
    
    decompressData(compressedData) {
        try {
            // Descompressão correspondente
            return JSON.parse(compressedData);
            
        } catch (error) {
            console.error('❌ Erro na descompressão:', error);
            throw error;
        }
    }
    
    // ===== CONFIGURAÇÕES =====
    saveSettings(settings) {
        if (!this.storageAvailable) return false;
        
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            console.log('💾 Configurações salvas');
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar configurações:', error);
            return false;
        }
    }
    
    loadSettings() {
        if (!this.storageAvailable) return null;
        
        try {
            const settings = localStorage.getItem(this.settingsKey);
            return settings ? JSON.parse(settings) : null;
        } catch (error) {
            console.error('❌ Erro ao carregar configurações:', error);
            return null;
        }
    }

    // ===== MÉTODOS ESTÁTICOS =====
    static hasSaveData() {
        const saveSystem = new SaveSystem();
        return saveSystem.hasSaveData() || saveSystem.hasAutoSave();
    }
    
    static loadGame() {
        const saveSystem = new SaveSystem();
        
        // Tentar carregar save manual primeiro, depois auto-save
        let gameData = saveSystem.loadGame();
        if (!gameData) {
            gameData = saveSystem.loadAutoSave();
        }

        return gameData;
    }

    // ===== TUTORIAL COMPLETION TRACKING =====
    // Tutorial persistence disabled - tutorial always shows on game start
    setTutorialCompleted(completed = true) {
        // No-op: Tutorial completion is not persisted
        console.log(`📚 Tutorial completion not persisted (always shows on start)`);
        return true;
    }

    isTutorialCompleted() {
        // Always return false so tutorial shows every time
        return false;
    }
}

// Exportar para escopo global
window.SaveSystem = SaveSystem;
console.log('💾 SaveSystem carregado e exportado para window.SaveSystem');
