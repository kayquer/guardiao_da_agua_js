/**
 * GUARDIÃO DA ÁGUA - SETTINGS MANAGER
 * Sistema de configurações e preferências do jogo
 */

class SettingsManager {
    constructor() {
        console.log('⚙️ Inicializando SettingsManager...');
        
        // Configurações padrão
        this.defaultSettings = {
            audio: {
                masterVolume: 80,
                musicVolume: 70,
                sfxVolume: 90
            },
            graphics: {
                quality: 'medium',
                antialiasing: true,
                shadows: true
            },
            gameplay: {
                difficulty: 'normal',
                autoSave: true,
                tutorialHints: true
            },
            controls: {
                cameraSensitivity: 1.0,
                zoomSpeed: 1.0
            }
        };
        
        // Configurações atuais
        this.settings = { ...this.defaultSettings };
        
        // Elementos da UI
        this.settingsScreen = document.getElementById('settings-screen');
        this.closeBtn = document.getElementById('btn-close-settings');
        this.saveBtn = document.getElementById('btn-save-settings');
        this.resetBtn = document.getElementById('btn-reset-settings');
        
        // Carregar configurações salvas
        this.loadSettings();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        console.log('✅ SettingsManager inicializado');
    }
    
    // ===== INICIALIZAÇÃO =====
    setupEventListeners() {
        // Botões principais
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeSettings());
        }
        
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveSettings());
        }
        
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetToDefaults());
        }
        
        // Controles de áudio
        this.setupVolumeControls();
        
        // Controles de gráficos
        this.setupGraphicsControls();
        
        // Controles de gameplay
        this.setupGameplayControls();
        
        // Controles de câmera
        this.setupControlsSettings();
        
        // Tecla ESC para fechar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSettingsOpen()) {
                this.closeSettings();
            }
        });
    }
    
    setupVolumeControls() {
        // Volume geral
        const masterVolume = document.getElementById('master-volume');
        const masterVolumeValue = document.getElementById('master-volume-value');
        if (masterVolume && masterVolumeValue) {
            masterVolume.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                masterVolumeValue.textContent = `${value}%`;
                this.settings.audio.masterVolume = value;
                this.applyAudioSettings();
            });
        }
        
        // Volume da música
        const musicVolume = document.getElementById('music-volume');
        const musicVolumeValue = document.getElementById('music-volume-value');
        if (musicVolume && musicVolumeValue) {
            musicVolume.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                musicVolumeValue.textContent = `${value}%`;
                this.settings.audio.musicVolume = value;
                this.applyAudioSettings();
            });
        }
        
        // Volume dos efeitos
        const sfxVolume = document.getElementById('sfx-volume');
        const sfxVolumeValue = document.getElementById('sfx-volume-value');
        if (sfxVolume && sfxVolumeValue) {
            sfxVolume.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                sfxVolumeValue.textContent = `${value}%`;
                this.settings.audio.sfxVolume = value;
                this.applyAudioSettings();
            });
        }
    }
    
    setupGraphicsControls() {
        // Qualidade gráfica
        const graphicsQuality = document.getElementById('graphics-quality');
        if (graphicsQuality) {
            graphicsQuality.addEventListener('change', (e) => {
                this.settings.graphics.quality = e.target.value;
            });
        }
        
        // Anti-aliasing
        const antialiasing = document.getElementById('antialiasing');
        if (antialiasing) {
            antialiasing.addEventListener('change', (e) => {
                this.settings.graphics.antialiasing = e.target.checked;
            });
        }
        
        // Sombras
        const shadows = document.getElementById('shadows');
        if (shadows) {
            shadows.addEventListener('change', (e) => {
                this.settings.graphics.shadows = e.target.checked;
            });
        }
    }
    
    setupGameplayControls() {
        // Dificuldade
        const difficulty = document.getElementById('difficulty');
        if (difficulty) {
            difficulty.addEventListener('change', (e) => {
                this.settings.gameplay.difficulty = e.target.value;
            });
        }
        
        // Auto-save
        const autoSave = document.getElementById('auto-save');
        if (autoSave) {
            autoSave.addEventListener('change', (e) => {
                this.settings.gameplay.autoSave = e.target.checked;
            });
        }
        
        // Dicas do tutorial
        const tutorialHints = document.getElementById('tutorial-hints');
        if (tutorialHints) {
            tutorialHints.addEventListener('change', (e) => {
                this.settings.gameplay.tutorialHints = e.target.checked;
            });
        }
    }
    
    setupControlsSettings() {
        // Sensibilidade da câmera
        const cameraSensitivity = document.getElementById('camera-sensitivity');
        const cameraSensitivityValue = document.getElementById('camera-sensitivity-value');
        if (cameraSensitivity && cameraSensitivityValue) {
            cameraSensitivity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                cameraSensitivityValue.textContent = `${value.toFixed(1)}x`;
                this.settings.controls.cameraSensitivity = value;
            });
        }
        
        // Velocidade do zoom
        const zoomSpeed = document.getElementById('zoom-speed');
        const zoomSpeedValue = document.getElementById('zoom-speed-value');
        if (zoomSpeed && zoomSpeedValue) {
            zoomSpeed.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                zoomSpeedValue.textContent = `${value.toFixed(1)}x`;
                this.settings.controls.zoomSpeed = value;
            });
        }
    }
    
    // ===== CONTROLE DE TELA =====
    showSettings() {
        console.log('⚙️ Abrindo configurações...');
        
        if (this.settingsScreen) {
            this.settingsScreen.classList.add('active');
        }
        
        // Atualizar valores na interface
        this.updateUI();
        
        // Tocar som
        if (window.AudioManager) {
            AudioManager.playSound('sfx_click');
        }
    }
    
    closeSettings() {
        console.log('⚙️ Fechando configurações...');

        if (this.settingsScreen) {
            this.settingsScreen.classList.remove('active');
        }

        // Retornar ao menu principal
        if (typeof showScreen === 'function') {
            showScreen('main-menu');
        } else {
            // Fallback manual
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });
            const mainMenu = document.getElementById('main-menu');
            if (mainMenu) {
                mainMenu.classList.add('active');
            }
        }

        // Tocar som
        if (window.AudioManager) {
            AudioManager.playSound('sfx_click');
        }
    }
    
    isSettingsOpen() {
        return this.settingsScreen && this.settingsScreen.classList.contains('active');
    }
    
    // ===== ATUALIZAÇÃO DA UI =====
    updateUI() {
        // Atualizar controles de áudio
        this.updateElement('master-volume', this.settings.audio.masterVolume);
        this.updateElement('master-volume-value', `${this.settings.audio.masterVolume}%`);
        this.updateElement('music-volume', this.settings.audio.musicVolume);
        this.updateElement('music-volume-value', `${this.settings.audio.musicVolume}%`);
        this.updateElement('sfx-volume', this.settings.audio.sfxVolume);
        this.updateElement('sfx-volume-value', `${this.settings.audio.sfxVolume}%`);
        
        // Atualizar controles de gráficos
        this.updateElement('graphics-quality', this.settings.graphics.quality);
        this.updateElement('antialiasing', this.settings.graphics.antialiasing, 'checked');
        this.updateElement('shadows', this.settings.graphics.shadows, 'checked');
        
        // Atualizar controles de gameplay
        this.updateElement('difficulty', this.settings.gameplay.difficulty);
        this.updateElement('auto-save', this.settings.gameplay.autoSave, 'checked');
        this.updateElement('tutorial-hints', this.settings.gameplay.tutorialHints, 'checked');
        
        // Atualizar controles de câmera
        this.updateElement('camera-sensitivity', this.settings.controls.cameraSensitivity);
        this.updateElement('camera-sensitivity-value', `${this.settings.controls.cameraSensitivity.toFixed(1)}x`);
        this.updateElement('zoom-speed', this.settings.controls.zoomSpeed);
        this.updateElement('zoom-speed-value', `${this.settings.controls.zoomSpeed.toFixed(1)}x`);
    }
    
    updateElement(id, value, property = 'value') {
        const element = document.getElementById(id);
        if (element) {
            if (property === 'checked') {
                element.checked = value;
            } else if (property === 'textContent') {
                element.textContent = value;
            } else {
                element.value = value;
            }
        }
    }
    
    // ===== APLICAÇÃO DE CONFIGURAÇÕES =====
    applyAudioSettings() {
        if (window.AudioManager) {
            const audioManager = AudioManager.getInstance();
            audioManager.setMasterVolume(this.settings.audio.masterVolume / 100);
            audioManager.setMusicVolume(this.settings.audio.musicVolume / 100);
            audioManager.setSfxVolume(this.settings.audio.sfxVolume / 100);
        }
    }
    
    applyGraphicsSettings() {
        // Aplicar configurações gráficas ao engine Babylon.js
        if (window.gameManager && window.gameManager.engine) {
            const engine = window.gameManager.engine;
            
            // Anti-aliasing
            if (this.settings.graphics.antialiasing !== engine.getCreationOptions().antialias) {
                console.log('⚙️ Configuração de anti-aliasing alterada - reinicie o jogo para aplicar');
            }
        }
    }
    
    applyGameplaySettings() {
        // Aplicar configurações de gameplay
        if (window.gameManager) {
            // Auto-save
            if (this.settings.gameplay.autoSave) {
                window.gameManager.enableAutoSave();
            } else {
                window.gameManager.disableAutoSave();
            }
        }
    }
    
    applyControlsSettings() {
        // Aplicar configurações de controles
        if (window.gameManager && window.gameManager.camera) {
            // Sensibilidade da câmera será aplicada nos controles de câmera
            console.log('⚙️ Configurações de controle aplicadas');
        }
    }
    
    // ===== PERSISTÊNCIA =====
    saveSettings() {
        try {
            localStorage.setItem('guardiao_agua_settings', JSON.stringify(this.settings));
            
            // Aplicar todas as configurações
            this.applyAudioSettings();
            this.applyGraphicsSettings();
            this.applyGameplaySettings();
            this.applyControlsSettings();
            
            console.log('✅ Configurações salvas');
            
            // Mostrar feedback
            this.showSaveConfirmation();
            
        } catch (error) {
            console.error('❌ Erro ao salvar configurações:', error);
            alert('Erro ao salvar configurações!');
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('guardiao_agua_settings');
            if (saved) {
                const loadedSettings = JSON.parse(saved);
                this.settings = this.mergeSettings(this.defaultSettings, loadedSettings);
                console.log('✅ Configurações carregadas');
                
                // Aplicar configurações carregadas
                this.applyAudioSettings();
                this.applyGraphicsSettings();
                this.applyGameplaySettings();
                this.applyControlsSettings();
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar configurações, usando padrões:', error);
            this.settings = { ...this.defaultSettings };
        }
    }
    
    resetToDefaults() {
        if (confirm('Tem certeza que deseja restaurar todas as configurações para os valores padrão?')) {
            this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
            this.updateUI();
            this.saveSettings();
            
            console.log('🔄 Configurações restauradas para padrão');
        }
    }
    
    mergeSettings(defaults, loaded) {
        const merged = JSON.parse(JSON.stringify(defaults));
        
        for (const category in loaded) {
            if (merged[category]) {
                for (const setting in loaded[category]) {
                    if (merged[category].hasOwnProperty(setting)) {
                        merged[category][setting] = loaded[category][setting];
                    }
                }
            }
        }
        
        return merged;
    }
    
    showSaveConfirmation() {
        // Criar elemento de confirmação temporário
        const confirmation = document.createElement('div');
        confirmation.className = 'save-confirmation';
        confirmation.innerHTML = '✅ Configurações salvas!';
        confirmation.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(confirmation);
        
        // Remover após 3 segundos
        setTimeout(() => {
            confirmation.remove();
        }, 3000);
    }
    
    // ===== GETTERS =====
    getSettings() {
        return { ...this.settings };
    }
    
    getSetting(category, key) {
        return this.settings[category] && this.settings[category][key];
    }
    
    // ===== CLEANUP =====
    dispose() {
        console.log('🗑️ SettingsManager disposed');
    }
}

console.log('⚙️ SettingsManager carregado');
