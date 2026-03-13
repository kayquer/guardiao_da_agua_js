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
            console.log('📦 AssetLoader não disponível, carregando sons RSE/SoundFX');
            this.loadRSESoundFX();
            return;
        }

        // Lista de sons para carregar (RSE SoundFX)
        const soundKeys = [
            // Background Music (Legacy)
            'bgm_main', 'bgm_caketown', 'bgm_waves', 'bgm_whispers',

            // RSE SoundFX Effects
            'sfx_click1', 'sfx_beep1', 'sfx_bling1', 'sfx_error1', 'sfx_chime1',
            'sfx_splash1', 'sfx_whoosh1', 'sfx_fanfare1', 'sfx_alarm1',

            // Legacy Sound Effects
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

        // Load RSE SoundFX as fallback
        this.loadRSESoundFX();
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

        // ===== SONS ESPECÍFICOS PARA CONSTRUÇÃO =====
        this.createConstructionSounds();

        // Som de água (ruído branco filtrado)
        this.createWaterSound('sfx_water');

        // Sons ambientes para ciclo dia/noite
        this.createAmbientSounds();

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

    // ===== SONS AMBIENTES =====
    createAmbientSounds() {
        console.log('🌅 Criando sons ambientes para ciclo dia/noite...');

        // Tentar carregar sons de arquivo primeiro
        this.loadEnvironmentSounds();

        // Criar sons procedurais como fallback
        this.createProceduralAmbientSounds();
    }

    loadEnvironmentSounds() {
        // Verificar se os arquivos de som existem
        const environmentSounds = [
            'morning-sound',
            'night-sound'
        ];

        environmentSounds.forEach(soundName => {
            // Tentar carregar do AssetLoader se disponível
            if (typeof AssetLoader !== 'undefined' && AssetLoader.instance) {
                const asset = AssetLoader.getAsset(`sfx_${soundName}`);
                if (asset && asset.audio) {
                    this.sounds.set(`sfx_${soundName}`, asset);
                    console.log(`🌅 Som ambiente carregado: ${soundName}`);
                    return;
                }
            }

            // Tentar carregar diretamente
            this.loadEnvironmentSoundFile(soundName);
        });
    }

    loadSoundFile(key, filepath, onError = null) {
        try {
            const audio = new Audio(filepath);
            audio.preload = 'auto';

            audio.addEventListener('canplaythrough', () => {
                this.sounds.set(key, {
                    play: () => {
                        audio.currentTime = 0;
                        audio.volume = this.sfxVolume * this.masterVolume;
                        audio.play().catch(error => {
                            console.warn(`⚠️ Erro ao reproduzir ${key}:`, error);
                        });
                    },
                    setVolume: (volume) => {
                        audio.volume = volume * this.sfxVolume * this.masterVolume;
                    },
                    pause: () => {
                        audio.pause();
                        audio.currentTime = 0;
                    },
                    audio: audio
                });
                console.log(`🔊 Som carregado: ${key}`);
            });

            audio.addEventListener('error', () => {
                console.log(`⚠️ Arquivo ${filepath} não encontrado`);
                if (onError) onError();
            });

        } catch (error) {
            console.log(`⚠️ Erro ao carregar ${key}:`, error);
            if (onError) onError();
        }
    }

    loadEnvironmentSoundFile(soundName) {
        this.loadSoundFile(
            `sfx_${soundName}`,
            `Sounds/SFX/Environment/${soundName}.mp3`
        );
    }

    // ===== RSE SOUNDFX LOADING =====
    loadRSESoundFX() {
        console.log('🎵 Carregando RSE SoundFX...');

        // Load individual sound files
        const rseSounds = [
            { key: 'sfx_click1', file: 'click1.mp3', category: 'ui' },
            { key: 'sfx_beep1', file: 'beep1.mp3', category: 'ui' },
            { key: 'sfx_bling1', file: 'bling1.mp3', category: 'success' },
            { key: 'sfx_error1', file: 'error1.mp3', category: 'error' },
            { key: 'sfx_chime1', file: 'chime1.mp3', category: 'notification' },
            { key: 'sfx_splash1', file: 'splash1.mp3', category: 'water' }
        ];

        rseSounds.forEach(soundInfo => {
            this.loadRSESoundFile(soundInfo.key, soundInfo.file, soundInfo.category);
        });

        // Create sound mappings for compatibility
        this.createRSESoundMappings();
    }

    loadRSESoundFile(key, filename, category) {
        this.loadSoundFile(
            key,
            `Sounds/SFX/RSE/${filename}`,
            () => this.createProceduralSound(key, category)
        );
    }

    createRSESoundMappings() {
        // Map old Archive.org sound names to new RSE sounds
        const soundMappings = {
            // UI Sounds
            'sfx_ui_click': 'sfx_click1',
            'sfx_ui_hover': 'sfx_beep1',
            'sfx_ui_select': 'sfx_bling1',
            'sfx_ui_error': 'sfx_error1',
            'sfx_ui_success': 'sfx_chime1',

            // Construction Sounds
            'sfx_construction_start': 'sfx_click1',
            'sfx_construction_progress': 'sfx_beep1',
            'sfx_construction_complete': 'sfx_chime1',
            'sfx_building_place': 'sfx_bling1',

            // Environmental Sounds
            'sfx_water_flow': 'sfx_splash1',
            'sfx_water_splash': 'sfx_splash1',

            // Alert/Notification Sounds
            'sfx_mission_start': 'sfx_chime1',
            'sfx_mission_complete': 'sfx_bling1',
            'sfx_warning_alert': 'sfx_error1',
            'sfx_resource_low': 'sfx_error1',

            // Legacy mappings
            'sfx_click': 'sfx_click1',
            'sfx_build': 'sfx_bling1',
            'sfx_water': 'sfx_splash1',
            'sfx_success': 'sfx_chime1',
            'sfx_error': 'sfx_error1'
        };

        // Create aliases for compatibility
        Object.entries(soundMappings).forEach(([oldKey, newKey]) => {
            const newSound = this.sounds.get(newKey);
            if (newSound && !this.sounds.has(oldKey)) {
                this.sounds.set(oldKey, newSound);
                console.log(`🔗 RSE Mapeamento criado: ${oldKey} -> ${newKey}`);
            }
        });
    }

    createProceduralSound(key, category) {
        // Create procedural fallback sounds based on category
        const frequencies = {
            'ui': 800,
            'success': 1200,
            'error': 400,
            'notification': 1000,
            'water': 600
        };

        const frequency = frequencies[category] || 800;
        this.createBeepSound(key, frequency, 0.2);
    }

    createProceduralAmbientSounds() {
        // Criar som de manhã (pássaros cantando)
        this.createMorningSoundProcedural();

        // Criar som de noite (grilos e vento)
        this.createNightSoundProcedural();
    }

    createMorningSoundProcedural() {
        if (!window.AudioContext && !window.webkitAudioContext) return;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const playMorningSound = () => {
            // Simular pássaros com tons aleatórios
            const duration = 3.0;
            const birdFrequencies = [800, 1200, 1600, 2000];

            birdFrequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(this.sfxVolume * this.masterVolume * 0.05, audioContext.currentTime + 0.1);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.5);
                }, index * 200);
            });
        };

        this.sounds.set('sfx_morning-sound', {
            play: playMorningSound,
            setVolume: () => {},
            pause: () => {},
            audio: null
        });

        console.log('🌅 Som procedural de manhã criado');
    }

    createNightSoundProcedural() {
        if (!window.AudioContext && !window.webkitAudioContext) return;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const playNightSound = () => {
            // Simular grilos com ruído filtrado
            const duration = 2.0;

            // Criar ruído branco para simular grilos
            const bufferSize = audioContext.sampleRate * duration;
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.1;
            }

            const source = audioContext.createBufferSource();
            const filter = audioContext.createBiquadFilter();
            const gainNode = audioContext.createGain();

            source.buffer = buffer;
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(3000, audioContext.currentTime);
            filter.Q.setValueAtTime(10, audioContext.currentTime);

            source.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);

            gainNode.gain.setValueAtTime(this.sfxVolume * this.masterVolume * 0.025, audioContext.currentTime);

            source.start(audioContext.currentTime);
            source.stop(audioContext.currentTime + duration);
        };

        this.sounds.set('sfx_night-sound', {
            play: playNightSound,
            setVolume: () => {},
            pause: () => {},
            audio: null
        });

        console.log('🌙 Som procedural de noite criado');
    }

    // ===== SONS ESPECÍFICOS PARA CONSTRUÇÃO =====
    createConstructionSounds() {
        console.log('🏗️ Criando sons de construção procedurais...');

        // Som de colocação de edifício (martelo + clique)
        this.createConstructionPlacementSound('sfx_build_place');

        // Som de progresso de construção (marteladas rítmicas)
        this.createConstructionProgressSound('sfx_build_progress');

        // Som de conclusão (fanfarra simples)
        this.createConstructionCompletionSound('sfx_build_complete');

        // Som de erro de construção (buzzer)
        this.createConstructionErrorSound('sfx_build_error');

        console.log('✅ Sons de construção procedurais criados');
    }

    createConstructionPlacementSound(key) {
        if (!window.AudioContext && !window.webkitAudioContext) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            const createPlacementSound = () => {
                const duration = 0.3;
                const sampleRate = audioContext.sampleRate;
                const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;

                    // Combinação de frequências para simular martelo
                    const hammer = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 8);
                    const click = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 15);
                    const thud = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 5);

                    data[i] = (hammer * 0.4 + click * 0.3 + thud * 0.3) * 0.5;
                }

                return buffer;
            };

            this.sounds.set(key, {
                play: () => {
                    try {
                        const source = audioContext.createBufferSource();
                        const gainNode = audioContext.createGain();

                        source.buffer = createPlacementSound();
                        gainNode.gain.value = this.sfxVolume * this.masterVolume * 0.6;

                        source.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        source.start();
                    } catch (error) {
                        console.warn(`⚠️ Erro ao reproduzir ${key}:`, error);
                    }
                },
                setVolume: (volume) => { /* Implementado no play */ }
            });

        } catch (error) {
            console.warn(`⚠️ Erro ao criar som de colocação ${key}:`, error);
        }
    }

    createConstructionProgressSound(key) {
        if (!window.AudioContext && !window.webkitAudioContext) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            const createProgressSound = () => {
                const duration = 0.4;
                const sampleRate = audioContext.sampleRate;
                const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;

                    // Som de martelada com eco
                    const beat1 = Math.sin(2 * Math.PI * 150 * t) * Math.exp(-t * 6);
                    const beat2 = Math.sin(2 * Math.PI * 300 * t) * Math.exp(-t * 8);
                    const echo = Math.sin(2 * Math.PI * 100 * t) * Math.exp(-t * 3) * 0.3;

                    // Adicionar ruído para textura
                    const noise = (Math.random() - 0.5) * 0.1 * Math.exp(-t * 10);

                    data[i] = (beat1 * 0.4 + beat2 * 0.3 + echo + noise) * 0.4;
                }

                return buffer;
            };

            this.sounds.set(key, {
                play: () => {
                    try {
                        const source = audioContext.createBufferSource();
                        const gainNode = audioContext.createGain();

                        source.buffer = createProgressSound();
                        gainNode.gain.value = this.sfxVolume * this.masterVolume * 0.4;

                        source.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        source.start();
                    } catch (error) {
                        console.warn(`⚠️ Erro ao reproduzir ${key}:`, error);
                    }
                },
                setVolume: (volume) => { /* Implementado no play */ }
            });

        } catch (error) {
            console.warn(`⚠️ Erro ao criar som de progresso ${key}:`, error);
        }
    }

    createConstructionCompletionSound(key) {
        if (!window.AudioContext && !window.webkitAudioContext) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            const createCompletionSound = () => {
                const duration = 1.0;
                const sampleRate = audioContext.sampleRate;
                const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;

                    // Fanfarra ascendente
                    const note1 = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 2); // A
                    const note2 = Math.sin(2 * Math.PI * 554 * t) * Math.exp(-t * 1.5); // C#
                    const note3 = Math.sin(2 * Math.PI * 659 * t) * Math.exp(-t * 1); // E

                    // Envelope para criar efeito de fanfarra
                    const envelope = Math.sin(Math.PI * t / duration) * Math.exp(-t * 0.8);

                    data[i] = (note1 * 0.3 + note2 * 0.3 + note3 * 0.4) * envelope * 0.6;
                }

                return buffer;
            };

            this.sounds.set(key, {
                play: () => {
                    try {
                        const source = audioContext.createBufferSource();
                        const gainNode = audioContext.createGain();

                        source.buffer = createCompletionSound();
                        gainNode.gain.value = this.sfxVolume * this.masterVolume * 0.7;

                        source.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        source.start();
                    } catch (error) {
                        console.warn(`⚠️ Erro ao reproduzir ${key}:`, error);
                    }
                },
                setVolume: (volume) => { /* Implementado no play */ }
            });

        } catch (error) {
            console.warn(`⚠️ Erro ao criar som de conclusão ${key}:`, error);
        }
    }

    createConstructionErrorSound(key) {
        if (!window.AudioContext && !window.webkitAudioContext) return;

        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            const createErrorSound = () => {
                const duration = 0.5;
                const sampleRate = audioContext.sampleRate;
                const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;

                    // Som de buzzer descendente
                    const freq = 400 - (t * 200); // De 400Hz para 200Hz
                    const buzz = Math.sin(2 * Math.PI * freq * t);
                    const envelope = Math.exp(-t * 3);

                    data[i] = buzz * envelope * 0.4;
                }

                return buffer;
            };

            this.sounds.set(key, {
                play: () => {
                    try {
                        const source = audioContext.createBufferSource();
                        const gainNode = audioContext.createGain();

                        source.buffer = createErrorSound();
                        gainNode.gain.value = this.sfxVolume * this.masterVolume * 0.5;

                        source.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        source.start();
                    } catch (error) {
                        console.warn(`⚠️ Erro ao reproduzir ${key}:`, error);
                    }
                },
                setVolume: (volume) => { /* Implementado no play */ }
            });

        } catch (error) {
            console.warn(`⚠️ Erro ao criar som de erro ${key}:`, error);
        }
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
    playMusic(key, fadeIn = true, volumeMultiplier = 1.0) {
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
            this.currentMusicVolumeMultiplier = volumeMultiplier;
            music.setVolume(fadeIn ? 0 : this.musicVolume * this.masterVolume * volumeMultiplier);
            music.play();

            if (fadeIn) {
                this.fadeInMusic();
            }

            console.log(`🎵 Reproduzindo música: ${key} (volume: ${Math.round(volumeMultiplier * 100)}%)`);

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

        const multiplier = this.currentMusicVolumeMultiplier || 1.0;
        const targetVolume = this.musicVolume * this.masterVolume * multiplier;
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
    
    // ===== RSE SOUNDFX AUDIO METHODS =====

    // UI Sound Effects (mapped to RSE SoundFX)
    playUIClick() { this.playSound('sfx_ui_click', 0.7); }
    playUIHover() { this.playSound('sfx_ui_hover', 0.5); }
    playUISelect() { this.playSound('sfx_ui_select', 0.8); }
    playUIError() { this.playSound('sfx_ui_error', 0.9); }
    playUISuccess() { this.playSound('sfx_ui_success', 0.8); }

    // Construction Sound Effects (mapped to RSE SoundFX)
    playConstructionStart() { this.playSound('sfx_construction_start', 0.7); }
    playConstructionProgress() { this.playSound('sfx_construction_progress', 0.6); }
    playConstructionComplete() { this.playSound('sfx_construction_complete', 0.8); }
    playBuildingPlace() { this.playSound('sfx_building_place', 0.7); }

    // Environmental Sound Effects (mapped to RSE SoundFX)
    playWaterFlow() { this.playSound('sfx_water_flow', 0.6); }
    playWaterSplash() { this.playSound('sfx_water_splash', 0.7); }
    playNatureBirds() { this.playSound('sfx_nature_birds', 0.5); }
    playWindGentle() { this.playSound('sfx_wind_gentle', 0.4); }
    playRainLight() { this.playSound('sfx_rain_light', 0.5); }

    // Alert/Notification Sounds (mapped to RSE SoundFX)
    playMissionStart() { this.playSound('sfx_mission_start', 0.8); }
    playMissionComplete() { this.playSound('sfx_mission_complete', 0.9); }
    playWarningAlert() { this.playSound('sfx_warning_alert', 0.8); }
    playResourceLow() { this.playSound('sfx_resource_low', 0.7); }

    // Enhanced Background Music Control (Legacy)
    playMenuMusic() { this.playMusic('bgm_menu'); }
    playMainMusic() { this.playMusic('bgm_main'); }
    playWavesMusic() { this.playMusic('bgm_waves'); }
    playWhispersMusic() { this.playMusic('bgm_whispers'); }

    // Smart Audio Selection (fallback system)
    playSmartUISound(action) {
        const soundMap = {
            'click': 'sfx_ui_click',
            'hover': 'sfx_ui_hover',
            'select': 'sfx_ui_select',
            'error': 'sfx_ui_error',
            'success': 'sfx_ui_success'
        };

        const soundKey = soundMap[action];
        if (soundKey && this.sounds.has(soundKey)) {
            this.playSound(soundKey, 0.7);
        } else {
            // Fallback to procedural sounds
            this.playSound(`sfx_${action}`, 0.7);
        }
    }

    playSmartConstructionSound(phase) {
        const soundMap = {
            'start': 'sfx_construction_start',
            'progress': 'sfx_construction_progress',
            'complete': 'sfx_construction_complete',
            'place': 'sfx_building_place'
        };

        const soundKey = soundMap[phase];
        if (soundKey && this.sounds.has(soundKey)) {
            this.playSound(soundKey, 0.7);
        } else {
            // Fallback to existing procedural sounds
            this.playSound(`sfx_build_${phase}`, 0.7);
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

    // ===== SONS DE TRANSIÇÃO DIA/NOITE =====
    playDayNightTransition(transitionType) {
        if (!this.enabled) return;

        let soundKey;
        if (transitionType === 'morning' || transitionType === 'dawn') {
            soundKey = 'sfx_morning-sound';
        } else if (transitionType === 'night' || transitionType === 'dusk') {
            soundKey = 'sfx_night-sound';
        } else {
            console.warn(`⚠️ Tipo de transição desconhecido: ${transitionType}`);
            return;
        }

        // Reproduzir som com fade-in suave (volume reduzido para 50%)
        this.playAmbientSoundWithFade(soundKey, 0.15);

        console.log(`🌅 Som de transição reproduzido: ${transitionType}`);
    }

    playAmbientSoundWithFade(soundKey, targetVolume = 0.15) {
        const sound = this.sounds.get(soundKey);
        if (!sound) {
            console.warn(`⚠️ Som ambiente não encontrado: ${soundKey}`);
            return;
        }

        try {
            // Configurar volume inicial baixo
            sound.setVolume(0.01);
            sound.play();

            // Fade-in gradual
            const fadeSteps = 20;
            const fadeTime = 1500; // 1.5 segundos
            const stepTime = fadeTime / fadeSteps;
            const volumeStep = (targetVolume * this.sfxVolume * this.masterVolume) / fadeSteps;

            let currentStep = 0;
            const fadeInterval = setInterval(() => {
                currentStep++;
                const newVolume = volumeStep * currentStep;
                sound.setVolume(newVolume / (this.sfxVolume * this.masterVolume));

                if (currentStep >= fadeSteps) {
                    clearInterval(fadeInterval);
                }
            }, stepTime);

        } catch (error) {
            console.error(`❌ Erro ao reproduzir som ambiente ${soundKey}:`, error);
        }
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

AudioManager.playDayNightTransition = function(transitionType) {
    AudioManager.getInstance().playDayNightTransition(transitionType);
};

console.log('🔊 AudioManager carregado');
