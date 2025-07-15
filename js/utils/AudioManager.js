/**
 * GUARDIÃO DA ÁGUA - AUDIO MANAGER
 * Gerencia todos os sons e música do jogo
 */

class AudioManager {
    constructor() {
        console.log('🔊 Inicializando AudioManager...');
        
        // Estado do áudio
        this.enabled = true;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.masterVolume = 1.0;
        
        // Áudios carregados
        this.sounds = new Map();
        this.music = new Map();
        
        // Controle de reprodução
        this.currentMusic = null;
        this.musicFadeInterval = null;
        
        // Pool de sons para evitar sobreposição
        this.soundPools = new Map();
        this.maxPoolSize = 5;
        
        // Configurações
        this.fadeTime = 1000; // 1 segundo
        
        this.initializeAudio();
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeAudio() {
        // Verificar suporte de áudio
        if (!window.Audio) {
            console.warn('⚠️ Áudio não suportado neste navegador');
            this.enabled = false;
            return;
        }

        // Carregar configurações salvas
        this.loadSettings();

        // Carregar sons do AssetLoader se disponível
        this.loadFromAssetLoader();

        // Criar sons procedurais se não houver assets
        this.createProceduralSounds();

        console.log('✅ AudioManager inicializado');
    }

    // ===== CARREGAMENTO DE ASSETS =====
    loadFromAssetLoader() {
        if (typeof AssetLoader === 'undefined' || !AssetLoader.instance) {
            console.log('📦 AssetLoader não disponível, usando sons procedurais');
            return;
        }

        // Lista de sons para carregar (usando arquivos existentes)
        const soundKeys = [
            'bgm_main', 'bgm_caketown', 'bgm_waves', 'bgm_whispers',
            'sfx_pickup', 'sfx_item', 'sfx_walk', 'sfx_watering', 'sfx_dig', 'sfx_axe'
        ];

        soundKeys.forEach(key => {
            const asset = AssetLoader.getAsset(key);
            if (asset && asset.audio) {
                if (key.startsWith('bgm_')) {
                    this.music.set(key, asset);
                    console.log(`🎵 Música carregada: ${key}`);
                } else {
                    this.sounds.set(key, asset);
                    console.log(`🔊 Som carregado: ${key}`);
                }
            } else {
                console.log(`⚠️ Asset de áudio não encontrado: ${key}, usando fallback`);
            }
        });
    }
    
    // ===== CARREGAMENTO DE SONS =====
    loadSound(key, asset) {
        if (!this.enabled || !asset) return;
        
        try {
            this.sounds.set(key, asset);
            
            // Criar pool de sons para SFX
            if (key.startsWith('sfx_')) {
                this.createSoundPool(key, asset);
            }
            
            console.log(`🔊 Som carregado: ${key}`);
            
        } catch (error) {
            console.error(`❌ Erro ao carregar som ${key}:`, error);
        }
    }
    
    loadMusic(key, asset) {
        if (!this.enabled || !asset) return;
        
        try {
            // Configurar música para loop
            asset.setLoop(true);
            this.music.set(key, asset);
            
            console.log(`🎵 Música carregada: ${key}`);
            
        } catch (error) {
            console.error(`❌ Erro ao carregar música ${key}:`, error);
        }
    }
    
    createSoundPool(key, asset) {
        const pool = [];
        
        for (let i = 0; i < this.maxPoolSize; i++) {
            try {
                // Criar cópia do áudio
                const audioClone = new Audio(asset.audio.src);
                audioClone.volume = this.sfxVolume * this.masterVolume;
                
                pool.push({
                    audio: audioClone,
                    inUse: false
                });
                
            } catch (error) {
                console.warn(`⚠️ Erro ao criar clone de áudio para ${key}:`, error);
            }
        }
        
        this.soundPools.set(key, pool);
    }
    
    // ===== SONS PROCEDURAIS =====
    createProceduralSounds() {
        console.log('🎵 Criando sons procedurais...');

        // Sons básicos usando Web Audio API (fallbacks para sons não encontrados)
        this.createBeepSound('sfx_click', 800, 0.1);
        this.createBeepSound('sfx_build', 600, 0.2);
        this.createBeepSound('sfx_error', 300, 0.3);
        this.createBeepSound('sfx_success', 1000, 0.2);

        // Som de água (ruído branco filtrado)
        this.createWaterSound('sfx_water');

        // Criar mapeamentos para compatibilidade com código existente
        this.createSoundMappings();
    }

    createSoundMappings() {
        // Mapear sons antigos para novos arquivos existentes
        const soundMappings = {
            'sfx_click': 'sfx_pickup',    // Usar pickup como click
            'sfx_build': 'sfx_axe',       // Usar axe como build
            'sfx_water': 'sfx_watering'   // Usar watering como water
        };

        // Criar aliases para manter compatibilidade
        Object.entries(soundMappings).forEach(([oldKey, newKey]) => {
            const newSound = this.sounds.get(newKey);
            if (newSound && !this.sounds.has(oldKey)) {
                this.sounds.set(oldKey, newSound);
                console.log(`🔗 Mapeamento criado: ${oldKey} -> ${newKey}`);
            }
        });
    }
    
    createBeepSound(key, frequency, duration) {
        if (!window.AudioContext && !window.webkitAudioContext) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playSound = () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
        
        this.sounds.set(key, {
            play: playSound,
            setVolume: () => {}, // Implementado no playSound
            pause: () => {},
            audio: null
        });
    }
    
    createWaterSound(key) {
        if (!window.AudioContext && !window.webkitAudioContext) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playSound = () => {
            const bufferSize = audioContext.sampleRate * 2; // 2 segundos
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Gerar ruído branco
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const source = audioContext.createBufferSource();
            const filter = audioContext.createBiquadFilter();
            const gainNode = audioContext.createGain();
            
            source.buffer = buffer;
            source.loop = true;
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.2, audioContext.currentTime);
            
            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            source.start();
            
            // Parar após 3 segundos
            setTimeout(() => {
                source.stop();
            }, 3000);
        };
        
        this.sounds.set(key, {
            play: playSound,
            setVolume: () => {},
            pause: () => {},
            audio: null
        });
    }
    
    // ===== REPRODUÇÃO DE SONS =====
    playSound(key, volume = 1.0) {
        if (!this.enabled) return;

        // Tentar usar pool primeiro
        if (this.soundPools.has(key)) {
            return this.playSoundFromPool(key, volume);
        }

        // Usar som direto
        const sound = this.sounds.get(key);
        if (sound) {
            try {
                sound.setVolume(this.sfxVolume * this.masterVolume * volume);
                sound.play();

            } catch (error) {
                console.warn(`⚠️ Erro ao reproduzir som ${key}:`, error);
            }
        } else {
            // Som não encontrado - tentar fallback silencioso
            console.log(`🔇 Som ${key} não disponível (usando fallback silencioso)`);
        }
    }
    
    playSoundFromPool(key, volume = 1.0) {
        const pool = this.soundPools.get(key);
        if (!pool) return;
        
        // Encontrar áudio disponível no pool
        const availableAudio = pool.find(item => !item.inUse);
        
        if (availableAudio) {
            availableAudio.inUse = true;
            availableAudio.audio.volume = this.sfxVolume * this.masterVolume * volume;
            
            const playPromise = availableAudio.audio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Som reproduzido com sucesso
                }).catch(error => {
                    console.warn(`⚠️ Erro ao reproduzir som do pool ${key}:`, error);
                });
            }
            
            // Marcar como disponível quando terminar
            availableAudio.audio.onended = () => {
                availableAudio.inUse = false;
            };
            
            return availableAudio.audio;
        }
    }
    
    // ===== MÚSICA =====
    playMusic(key, fadeIn = true) {
        if (!this.enabled) return;
        
        const music = this.music.get(key);
        if (!music) {
            console.warn(`⚠️ Música não encontrada: ${key}`);
            return;
        }
        
        // Parar música atual
        if (this.currentMusic) {
            this.stopMusic(fadeIn);
        }
        
        try {
            this.currentMusic = music;
            music.setVolume(fadeIn ? 0 : this.musicVolume * this.masterVolume);
            music.play();
            
            if (fadeIn) {
                this.fadeInMusic();
            }
            
            console.log(`🎵 Reproduzindo música: ${key}`);
            
        } catch (error) {
            console.error(`❌ Erro ao reproduzir música ${key}:`, error);
        }
    }
    
    stopMusic(fadeOut = true) {
        if (!this.currentMusic) return;
        
        if (fadeOut) {
            this.fadeOutMusic(() => {
                this.currentMusic.pause();
                this.currentMusic = null;
            });
        } else {
            this.currentMusic.pause();
            this.currentMusic = null;
        }
    }
    
    fadeInMusic() {
        if (!this.currentMusic) return;
        
        const targetVolume = this.musicVolume * this.masterVolume;
        const steps = 20;
        const stepTime = this.fadeTime / steps;
        const volumeStep = targetVolume / steps;
        
        let currentStep = 0;
        
        this.musicFadeInterval = setInterval(() => {
            currentStep++;
            const newVolume = volumeStep * currentStep;
            
            if (this.currentMusic) {
                this.currentMusic.setVolume(newVolume);
            }
            
            if (currentStep >= steps) {
                clearInterval(this.musicFadeInterval);
                this.musicFadeInterval = null;
            }
        }, stepTime);
    }
    
    fadeOutMusic(callback) {
        if (!this.currentMusic) {
            if (callback) callback();
            return;
        }
        
        const startVolume = this.musicVolume * this.masterVolume;
        const steps = 20;
        const stepTime = this.fadeTime / steps;
        const volumeStep = startVolume / steps;
        
        let currentStep = 0;
        
        this.musicFadeInterval = setInterval(() => {
            currentStep++;
            const newVolume = startVolume - (volumeStep * currentStep);
            
            if (this.currentMusic) {
                this.currentMusic.setVolume(Math.max(0, newVolume));
            }
            
            if (currentStep >= steps) {
                clearInterval(this.musicFadeInterval);
                this.musicFadeInterval = null;
                if (callback) callback();
            }
        }, stepTime);
    }
    
    // ===== CONTROLE DE VOLUME =====
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
        this.saveSettings();
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.musicVolume * this.masterVolume);
        }
        this.saveSettings();
    }
    
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateSfxVolumes();
        this.saveSettings();
    }
    
    updateAllVolumes() {
        // Atualizar música atual
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.musicVolume * this.masterVolume);
        }
        
        // Atualizar pools de SFX
        this.updateSfxVolumes();
    }
    
    updateSfxVolumes() {
        this.soundPools.forEach(pool => {
            pool.forEach(item => {
                if (item.audio) {
                    item.audio.volume = this.sfxVolume * this.masterVolume;
                }
            });
        });
    }
    
    // ===== CONFIGURAÇÕES =====
    toggleAudio() {
        this.enabled = !this.enabled;
        
        if (!this.enabled) {
            this.stopMusic(false);
        }
        
        this.saveSettings();
        return this.enabled;
    }
    
    saveSettings() {
        const settings = {
            enabled: this.enabled,
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume
        };
        
        localStorage.setItem('guardiao_agua_audio', JSON.stringify(settings));
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('guardiao_agua_audio');
            if (saved) {
                const settings = JSON.parse(saved);
                this.enabled = settings.enabled !== undefined ? settings.enabled : true;
                this.masterVolume = settings.masterVolume || 1.0;
                this.musicVolume = settings.musicVolume || 0.7;
                this.sfxVolume = settings.sfxVolume || 0.8;
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar configurações de áudio:', error);
        }
    }
    
    // ===== GETTERS =====
    isEnabled() { return this.enabled; }
    getMasterVolume() { return this.masterVolume; }
    getMusicVolume() { return this.musicVolume; }
    getSfxVolume() { return this.sfxVolume; }
    isPlayingMusic() { return this.currentMusic !== null; }
    
    // ===== CLEANUP =====
    dispose() {
        this.stopMusic(false);
        
        if (this.musicFadeInterval) {
            clearInterval(this.musicFadeInterval);
        }
        
        this.sounds.clear();
        this.music.clear();
        this.soundPools.clear();
        
        console.log('🗑️ AudioManager disposed');
    }
}

// Instância singleton
AudioManager.instance = null;

// Métodos estáticos para acesso global
AudioManager.getInstance = function() {
    if (!AudioManager.instance) {
        AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
};

AudioManager.playSound = function(key, volume) {
    AudioManager.getInstance().playSound(key, volume);
};

AudioManager.playMusic = function(key, fadeIn) {
    AudioManager.getInstance().playMusic(key, fadeIn);
};

console.log('🔊 AudioManager carregado');
