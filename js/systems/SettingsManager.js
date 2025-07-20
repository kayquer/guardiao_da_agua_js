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
                console.log('🔊 Volume geral alterado para:', value);
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
                console.log('🎵 Volume da música alterado para:', value);
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
                console.log('🔊 Volume dos efeitos alterado para:', value);
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
                console.log('🎨 Qualidade gráfica alterada para:', e.target.value);
                this.applyGraphicsSettings();
            });
        }

        // Anti-aliasing
        const antialiasing = document.getElementById('antialiasing');
        if (antialiasing) {
            antialiasing.addEventListener('change', (e) => {
                this.settings.graphics.antialiasing = e.target.checked;
                console.log('🎨 Anti-aliasing alterado para:', e.target.checked);
                this.applyGraphicsSettings();
            });
        }

        // Sombras
        const shadows = document.getElementById('shadows');
        if (shadows) {
            shadows.addEventListener('change', (e) => {
                this.settings.graphics.shadows = e.target.checked;
                console.log('🌑 Sombras alteradas para:', e.target.checked);
                this.applyGraphicsSettings();
            });
        }
    }
    
    setupGameplayControls() {
        // Dificuldade
        const difficulty = document.getElementById('difficulty');
        if (difficulty) {
            difficulty.addEventListener('change', (e) => {
                this.settings.gameplay.difficulty = e.target.value;
                console.log('🎮 Dificuldade alterada para:', e.target.value);
                this.applyGameplaySettings();
            });
        }

        // Auto-save
        const autoSave = document.getElementById('auto-save');
        if (autoSave) {
            autoSave.addEventListener('change', (e) => {
                this.settings.gameplay.autoSave = e.target.checked;
                console.log('💾 Auto-save alterado para:', e.target.checked);
                this.applyGameplaySettings();
            });
        }

        // Dicas do tutorial
        const tutorialHints = document.getElementById('tutorial-hints');
        if (tutorialHints) {
            tutorialHints.addEventListener('change', (e) => {
                this.settings.gameplay.tutorialHints = e.target.checked;
                console.log('💡 Dicas do tutorial alteradas para:', e.target.checked);
                this.applyGameplaySettings();
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
                console.log('🎮 Sensibilidade da câmera alterada para:', value);
                this.applyControlsSettings();
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
                console.log('🔍 Velocidade do zoom alterada para:', value);
                this.applyControlsSettings();
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
        this.updateElement('master-volume-value', `${this.settings.audio.masterVolume}%`, 'textContent');
        this.updateElement('music-volume', this.settings.audio.musicVolume);
        this.updateElement('music-volume-value', `${this.settings.audio.musicVolume}%`, 'textContent');
        this.updateElement('sfx-volume', this.settings.audio.sfxVolume);
        this.updateElement('sfx-volume-value', `${this.settings.audio.sfxVolume}%`, 'textContent');
        
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
        console.log('🔊 Aplicando configurações de áudio...', this.settings.audio);

        if (typeof AudioManager !== 'undefined') {
            try {
                const audioManager = AudioManager.getInstance();
                console.log('🔊 AudioManager encontrado, aplicando volumes...');

                // Aplicar volumes (converter de 0-100 para 0-1)
                audioManager.setMasterVolume(this.settings.audio.masterVolume / 100);
                audioManager.setMusicVolume(this.settings.audio.musicVolume / 100);
                audioManager.setSfxVolume(this.settings.audio.sfxVolume / 100);

                console.log('✅ Configurações de áudio aplicadas:', {
                    master: audioManager.masterVolume,
                    music: audioManager.musicVolume,
                    sfx: audioManager.sfxVolume
                });
            } catch (error) {
                console.error('❌ Erro ao aplicar configurações de áudio:', error);
            }
        } else {
            console.warn('⚠️ AudioManager não encontrado');
        }
    }
    
    applyGraphicsSettings() {
        console.log('🎨 Aplicando configurações gráficas...', this.settings.graphics);

        if (window.gameManager && window.gameManager.scene && window.gameManager.engine) {
            const scene = window.gameManager.scene;
            const engine = window.gameManager.engine;

            try {
                // Aplicar qualidade gráfica
                this.applyQualitySettings(scene, engine);

                // Aplicar configurações de sombras
                this.applyShadowSettings(scene);

                // Anti-aliasing (requer reinicialização do engine)
                const currentAntialias = engine.getCreationOptions().antialias;
                if (this.settings.graphics.antialiasing !== currentAntialias) {
                    console.log('⚙️ Anti-aliasing alterado - será aplicado na próxima inicialização');
                    // Salvar configuração para próxima inicialização
                    if (typeof GAME_CONFIG !== 'undefined') {
                        GAME_CONFIG.canvas.antialias = this.settings.graphics.antialiasing;
                    }
                }

                console.log('✅ Configurações gráficas aplicadas');
            } catch (error) {
                console.error('❌ Erro ao aplicar configurações gráficas:', error);
            }
        } else {
            console.warn('⚠️ GameManager, scene ou engine não encontrados');
        }
    }

    applyQualitySettings(scene, engine) {
        const quality = this.settings.graphics.quality;
        console.log('🎨 Aplicando qualidade gráfica:', quality);

        // Configurações baseadas na qualidade
        let renderTargetSize, shadowMapSize, particleCount, lightIntensity;

        switch (quality) {
            case 'low':
                renderTargetSize = 512;
                shadowMapSize = 512;
                particleCount = 0.5;
                lightIntensity = 0.8;
                break;
            case 'medium':
                renderTargetSize = 1024;
                shadowMapSize = 1024;
                particleCount = 1.0;
                lightIntensity = 1.0;
                break;
            case 'high':
                renderTargetSize = 2048;
                shadowMapSize = 2048;
                particleCount = 1.5;
                lightIntensity = 1.2;
                break;
            default:
                renderTargetSize = 1024;
                shadowMapSize = 1024;
                particleCount = 1.0;
                lightIntensity = 1.0;
        }

        // Aplicar configurações de sombra baseadas na qualidade
        if (window.gameManager.shadowGenerator) {
            window.gameManager.shadowGenerator.mapSize = shadowMapSize;
            console.log('🎨 Tamanho do mapa de sombras definido para:', shadowMapSize);
        }

        // Ajustar intensidade das luzes
        const lights = scene.lights;
        lights.forEach(light => {
            if (light.name !== 'cityHallLight') { // Não alterar luzes especiais
                const originalIntensity = light._originalIntensity || light.intensity;
                light._originalIntensity = originalIntensity;
                light.intensity = originalIntensity * lightIntensity;
            }
        });

        console.log('🎨 Qualidade aplicada - Sombras:', shadowMapSize, 'Luzes:', lightIntensity);
    }

    applyShadowSettings(scene) {
        const shadowsEnabled = this.settings.graphics.shadows;
        console.log('🌑 Aplicando configurações de sombras:', shadowsEnabled);

        if (window.gameManager.shadowGenerator) {
            const shadowGenerator = window.gameManager.shadowGenerator;

            if (shadowsEnabled) {
                // Ativar sombras
                shadowGenerator.getShadowMap().renderList = shadowGenerator.getShadowMap().renderList || [];

                // Encontrar todos os meshes que devem projetar sombras
                scene.meshes.forEach(mesh => {
                    if (mesh.name.includes('building_') || mesh.name.includes('structure_')) {
                        shadowGenerator.addShadowCaster(mesh);
                    }
                });

                console.log('✅ Sombras ativadas');
            } else {
                // Desativar sombras
                shadowGenerator.getShadowMap().renderList = [];
                console.log('❌ Sombras desativadas');
            }
        }
    }
    
    applyGameplaySettings() {
        console.log('🎮 Aplicando configurações de gameplay...', this.settings.gameplay);

        try {
            // Auto-save
            if (typeof GAME_CONFIG !== 'undefined') {
                if (this.settings.gameplay.autoSave) {
                    GAME_CONFIG.gameplay.autoSaveInterval = 30000; // 30 segundos
                    console.log('✅ Auto-save ativado (30s)');
                } else {
                    GAME_CONFIG.gameplay.autoSaveInterval = Number.MAX_SAFE_INTEGER; // Desativar
                    console.log('❌ Auto-save desativado');
                }
            }

            // Dificuldade
            if (window.gameManager && window.gameManager.eventSystem) {
                let difficultyMultiplier = 1.0;
                switch (this.settings.gameplay.difficulty) {
                    case 'easy':
                        difficultyMultiplier = 0.7;
                        break;
                    case 'normal':
                        difficultyMultiplier = 1.0;
                        break;
                    case 'hard':
                        difficultyMultiplier = 1.5;
                        break;
                }
                window.gameManager.eventSystem.setDifficulty(difficultyMultiplier);
                console.log(`🎮 Dificuldade definida: ${this.settings.gameplay.difficulty} (${difficultyMultiplier}x)`);
            }

            // Dicas do tutorial
            if (window.gameManager && window.gameManager.tutorialManager) {
                window.gameManager.tutorialManager.showHints = this.settings.gameplay.tutorialHints;
                console.log(`💡 Dicas do tutorial: ${this.settings.gameplay.tutorialHints ? 'ativadas' : 'desativadas'}`);
            }

            console.log('✅ Configurações de gameplay aplicadas');
        } catch (error) {
            console.error('❌ Erro ao aplicar configurações de gameplay:', error);
        }
    }
    
    applyControlsSettings() {
        console.log('🎮 Aplicando configurações de controles...', this.settings.controls);

        try {
            if (window.gameManager && window.gameManager.camera) {
                const camera = window.gameManager.camera;

                // Aplicar sensibilidade da câmera
                // Valores menores = mais sensível, valores maiores = menos sensível
                const baseSensitivity = 1000;
                const sensitivityMultiplier = 1 / this.settings.controls.cameraSensitivity;

                camera.angularSensibilityX = baseSensitivity * sensitivityMultiplier;
                camera.angularSensibilityY = baseSensitivity * sensitivityMultiplier;

                console.log(`🎮 Sensibilidade da câmera aplicada: ${this.settings.controls.cameraSensitivity}x (${camera.angularSensibilityX})`);

                // Aplicar velocidade do zoom
                // Valores menores = zoom mais rápido, valores maiores = zoom mais lento
                const baseZoomSpeed = 50;
                const zoomMultiplier = 1 / this.settings.controls.zoomSpeed;

                camera.wheelPrecision = baseZoomSpeed * zoomMultiplier;

                console.log(`🔍 Velocidade do zoom aplicada: ${this.settings.controls.zoomSpeed}x (${camera.wheelPrecision})`);

                // Aplicar velocidade de movimento WASD
                if (window.gameManager.cameraControls) {
                    const baseMovementSpeed = 0.5;
                    window.gameManager.cameraControls.speed = baseMovementSpeed * this.settings.controls.cameraSensitivity;

                    console.log(`🚶 Velocidade de movimento WASD aplicada: ${window.gameManager.cameraControls.speed}`);
                }

                console.log('✅ Configurações de controles aplicadas');
            } else {
                console.warn('⚠️ GameManager ou câmera não encontrados');
            }
        } catch (error) {
            console.error('❌ Erro ao aplicar configurações de controles:', error);
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
                console.log('✅ Configurações carregadas:', this.settings);

                // Aplicar configurações carregadas com delay para garantir que os sistemas estejam prontos
                setTimeout(() => {
                    this.applyAudioSettings();
                    this.applyGraphicsSettings();
                    this.applyGameplaySettings();
                    this.applyControlsSettings();
                }, 100);
            } else {
                console.log('📝 Nenhuma configuração salva encontrada, usando padrões');
                // Aplicar configurações padrão
                setTimeout(() => {
                    this.applyAudioSettings();
                    this.applyGraphicsSettings();
                    this.applyGameplaySettings();
                    this.applyControlsSettings();
                }, 100);
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
