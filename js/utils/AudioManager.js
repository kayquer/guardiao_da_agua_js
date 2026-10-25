/**
 * GUARDIÃO DA ÁGUA - AUDIO MANAGER
 * Toca tudo pelas chaves de SOUND_MANIFEST (js/data/audioManifest.js).
 *
 * - Efeitos curtos (sfx/loop/voice/jingle): Web Audio. Os arquivos são baixados aos poucos depois do boot
 *   (fetch → ArrayBuffer) e decodificados quando o AudioContext existe (só depois do 1º gesto: autoplay).
 *   Sem Web Audio, HTMLAudio. Variações: sorteio sem repetir a última; `gap` evita metralhar o mesmo som.
 * - Música e ambientes: streaming (HTMLAudio), nada de baixar ~20 MB no boot. Loop com crossfade
 *   (StreamTrack), troca de música com crossfade, jingle abaixa a música (ducking).
 * - Volumes separados música / efeitos / ambiente + geral + mudo, salvos em localStorage (guardiao_agua_audio).
 * - Pausa do jogo: música baixa, ambientes calam. Aba oculta: silêncio total.
 * O diretor (que música/ambiente toca em cada contexto e os ganchos de eventos) está em js/utils/audio/SoundDirector.js.
 */

/** Uma faixa em streaming (música ou ambiente) com fade e loop por crossfade entre dois <audio>. */
class StreamTrack {
    constructor(manager, key, entry, category) {
        this.manager = manager;
        this.key = key;
        this.entry = entry;
        this.category = category; // 'music' | 'ambient'
        this.files = entry.files;
        this.loop = entry.loop !== false;
        this.index = Math.floor(Math.random() * this.files.length);
        this.level = 1; // multiplicador pedido (ex.: intensidade da chuva)
        this.voices = []; // { el, fade, target, rate }
        this.stopped = false;
        this.onEnded = null;
    }

    /**
     * Próxima faixa da playlist em ordem aleatória: sorteia entre as que ainda não tocaram nesta rodada (nunca a
     * mesma de agora); quando todas tocaram, começa outra rodada.
     */
    nextIndex() {
        if (this.files.length < 2) return this.index;
        this.played = this.played || new Set([this.index]);
        if (this.played.size >= this.files.length) this.played = new Set([this.index]);
        const options = this.files.map((_, i) => i).filter(i => !this.played.has(i));
        const pick = options[Math.floor(Math.random() * options.length)];
        this.played.add(pick);
        return pick;
    }

    start(fadeMs = 1500) {
        this.spawn(this.files[this.index], fadeMs);
    }

    spawn(file, fadeMs) {
        const el = new Audio();
        el.preload = 'auto';
        el.src = file;
        const voice = { el, fade: fadeMs > 0 ? 0 : 1, target: 1, rate: fadeMs > 0 ? 1000 / fadeMs : Infinity, next: false };
        el.addEventListener('ended', () => this.onVoiceEnded(voice));
        el.addEventListener('error', () => {
            console.warn(`⚠️ Áudio não carregou: ${file}`);
            this.dropVoice(voice);
        });
        this.voices.push(voice);
        this.apply(voice);
        this.manager.playElement(el);
        return voice;
    }

    onVoiceEnded(voice) {
        this.dropVoice(voice);
        if (this.stopped) return;
        if (!this.voices.length) {
            if (this.loop) this.start(0);
            else this.onEnded?.();
        }
    }

    dropVoice(voice) {
        const i = this.voices.indexOf(voice);
        if (i >= 0) this.voices.splice(i, 1);
        StreamTrack.release(voice.el);
    }

    static release(el) {
        try {
            el.pause();
            el.removeAttribute('src');
            el.load();
        } catch (e) { /* elemento já liberado */ }
    }

    stop(fadeMs = 1500) {
        this.stopped = true;
        this.voices.forEach(v => {
            v.target = 0;
            v.rate = fadeMs > 0 ? 1000 / fadeMs : Infinity;
        });
    }

    get finished() {
        return this.stopped && this.voices.length === 0;
    }

    /** A cada tick: fades, crossfade do loop e volume. */
    update(dt) {
        const xf = StreamTrack.CROSSFADE_S;
        for (const v of [...this.voices]) {
            if (v.fade !== v.target) {
                const step = v.rate === Infinity ? 1 : v.rate * dt;
                v.fade = v.fade < v.target ? Math.min(v.target, v.fade + step) : Math.max(v.target, v.fade - step);
            }
            if (v.target === 0 && v.fade <= 0) {
                this.dropVoice(v);
                continue;
            }
            // Perto do fim: a próxima volta (ou a próxima faixa da playlist) entra por baixo
            const d = v.el.duration;
            if (this.loop && !this.stopped && !v.next && d > xf * 3 && d - v.el.currentTime < xf) {
                v.next = true;
                v.target = 0;
                v.rate = 1 / xf;
                this.index = this.nextIndex();
                this.spawn(this.files[this.index], xf * 1000);
            }
            this.apply(v);
        }
    }

    apply(voice) {
        const vol = this.manager.trackVolume(this) * voice.fade;
        voice.el.volume = Math.max(0, Math.min(1, vol));
    }

    pauseAll() { this.voices.forEach(v => v.el.pause()); }
    resumeAll() { this.voices.forEach(v => this.manager.playElement(v.el)); }

    dispose() {
        this.stopped = true;
        this.voices.forEach(v => StreamTrack.release(v.el));
        this.voices = [];
    }
}

StreamTrack.CROSSFADE_S = 2; // segundos de crossfade na emenda do loop

class AudioManager {
    constructor() {
        log('🔊 Inicializando AudioManager...');
        this.manifest = typeof SOUND_MANIFEST !== 'undefined' ? SOUND_MANIFEST : {};
        this.aliases = typeof SOUND_ALIASES !== 'undefined' ? SOUND_ALIASES : {};

        // Volumes (0-1) e mudo
        this.enabled = true;
        this.muted = false;
        this.masterVolume = 1.0;
        this.musicVolume = 0.6;
        this.sfxVolume = 0.9;
        this.ambientVolume = 0.6;

        // Web Audio (criado no 1º gesto) e arquivos curtos
        this.audioContext = null;
        this.rawFiles = new Map();   // file → Promise<ArrayBuffer>
        this.buffers = new Map();    // file → AudioBuffer
        this.decoding = new Map();   // file → Promise<AudioBuffer>
        this.lastVariant = new Map(); // key → índice tocado por último
        this.lastPlayAt = new Map();  // key → performance.now()
        this.lastSfxAt = -Infinity;
        this.activeLoops = new Map(); // key → { source, gain }

        // Música / ambiente
        this.musicTrack = null;
        this.currentMusicKey = null;
        this.musicMultiplier = 1;
        this.fadingTracks = new Set();
        this.ambientTracks = new Map(); // key → StreamTrack
        this.duck = 1;
        this.duckUntil = 0;
        this.pendingElements = new Set(); // <audio> que o autoplay barrou

        this.loadSettings();
        this.initialized = !!window.Audio;
        if (!this.initialized) {
            console.warn('⚠️ Áudio não suportado neste navegador');
            this.enabled = false;
            return;
        }

        this.lastTick = performance.now();
        this.ticker = setInterval(() => this.tick(), 50);
        document.addEventListener('visibilitychange', () => this.onVisibility());
        this._setupAutoplayResume();
        // Baixa os efeitos curtos aos poucos, depois que a tela de carregamento já andou
        setTimeout(() => this.preloadEffects(), 1500);
        this.initDirector?.();
        log('✅ AudioManager inicializado');
    }

    // ===== MANIFESTO =====
    resolve(key) {
        return this.aliases[key] || key;
    }

    getEntry(key) {
        return this.manifest[this.resolve(key)] || null;
    }

    /** Sorteia uma variação sem repetir a última. */
    pickFile(key, files) {
        if (files.length === 1) return files[0];
        const last = this.lastVariant.get(key);
        let i = Math.floor(Math.random() * files.length);
        if (i === last) i = (i + 1 + Math.floor(Math.random() * (files.length - 1))) % files.length;
        this.lastVariant.set(key, i);
        return files[i];
    }

    // ===== CARREGAMENTO DOS CURTOS =====
    async preloadEffects() {
        const files = [];
        Object.values(this.manifest).forEach(entry => {
            if (entry.kind !== 'music' && entry.kind !== 'ambient') files.push(...entry.files);
        });
        // 4 de cada vez: não disputa banda com o resto do boot
        let next = 0;
        const worker = async () => {
            while (next < files.length) {
                const file = files[next++];
                await this.fetchFile(file).catch(() => {});
            }
        };
        await Promise.all([worker(), worker(), worker(), worker()]);
        if (this.audioContext) files.forEach(f => this.decodeFile(f));
    }

    fetchFile(file) {
        if (!this.rawFiles.has(file)) {
            const p = fetch(file).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.arrayBuffer();
            });
            p.catch(err => console.warn(`⚠️ Som não carregou: ${file} (${err.message})`));
            this.rawFiles.set(file, p);
        }
        return this.rawFiles.get(file);
    }

    decodeFile(file) {
        if (!this.audioContext) return null;
        if (this.buffers.has(file)) return Promise.resolve(this.buffers.get(file));
        if (!this.decoding.has(file)) {
            const p = this.fetchFile(file)
                // decodeAudioData consome o ArrayBuffer: decodifica uma cópia
                .then(data => this.audioContext.decodeAudioData(data.slice(0)))
                .then(buffer => {
                    this.buffers.set(file, buffer);
                    return buffer;
                })
                .catch(err => {
                    console.warn(`⚠️ Som não decodificou: ${file}`, err?.message || err);
                    return null;
                });
            this.decoding.set(file, p);
        }
        return this.decoding.get(file);
    }

    ensureContext() {
        if (this.audioContext || !(window.AudioContext || window.webkitAudioContext)) return this.audioContext;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // O que já foi baixado decodifica agora
            this.rawFiles.forEach((p, file) => this.decodeFile(file));
        } catch (error) {
            console.warn('⚠️ Web Audio indisponível, usando HTMLAudio', error);
        }
        return this.audioContext;
    }

    // ===== VOLUME EFETIVO =====
    categoryVolume(kind) {
        if (!this.enabled || this.muted || document.hidden) return 0;
        if (kind === 'music' || kind === 'jingle') return this.musicVolume * this.masterVolume;
        if (kind === 'ambient') return this.ambientVolume * this.masterVolume;
        return this.sfxVolume * this.masterVolume;
    }

    /** Música: 0-1 · pausa do jogo: música a 35 %, ambientes calados. */
    gamePauseFactor(category) {
        const gm = typeof gameManager !== 'undefined' ? gameManager : null;
        const paused = gm && (gm.gameState === 'paused' || gm.gameState === 'gameover');
        if (!paused) return 1;
        if (category === 'ambient') return 0;
        return gm.gameState === 'gameover' ? 1 : 0.35;
    }

    trackVolume(track) {
        const base = (track.entry.volume ?? 1) * track.level;
        if (track.category === 'music') {
            return base * this.musicMultiplier * this.categoryVolume('music') * this.duck * this.gamePauseFactor('music');
        }
        return base * this.categoryVolume('ambient') * this.gamePauseFactor('ambient');
    }

    // ===== EFEITOS =====
    /** Pode tocar efeito agora? Durante a abertura do menu só a música toca. */
    canPlayEffects() {
        if (!this.enabled || this.muted || document.hidden) return false;
        if (typeof MenuIntro !== 'undefined' && MenuIntro.state === 'playing') return false;
        return true;
    }

    /**
     * @param {string} key chave do manifesto (ou alias antigo)
     * @param {number} volume 0-1 relativo
     * @param {{ifQuiet?: number, pan?: number, rate?: number}} opts ifQuiet: não toca se outro efeito tocou há menos de N ms
     */
    playSound(key, volume = 1.0, opts = {}) {
        const k = this.resolve(key);
        const entry = this.manifest[k];
        if (!entry) {
            log(`🔇 Som ${key} não existe no manifesto`);
            return false;
        }
        if (!this.canPlayEffects()) return false;
        const now = performance.now();
        // Alguém quis tocar um som agora (mesmo que o intervalo mínimo da chave o bloqueie): o clique padrão dos
        // botões (SoundDirector.setupUiSounds) não entra por cima do som próprio do botão
        this.lastSfxIntentAt = now;
        if (entry.gap && now - (this.lastPlayAt.get(k) ?? -Infinity) < entry.gap) return false;
        if (opts.ifQuiet && now - this.lastSfxAt < opts.ifQuiet) return false;
        this.lastPlayAt.set(k, now);
        this.lastSfxAt = now;
        const file = this.pickFile(k, entry.files);
        const gain = (volume ?? 1) * (entry.volume ?? 1) * this.categoryVolume(entry.kind);
        if (gain <= 0) return false;
        return this.playFile(file, gain, opts);
    }

    playFile(file, gain, opts = {}) {
        const ctx = this.audioContext;
        const buffer = this.buffers.get(file);
        if (ctx && buffer && ctx.state !== 'closed') {
            this.startBuffer(buffer, gain, opts);
            return true;
        }
        if (ctx) {
            // Ainda decodificando: toca quando ficar pronto, se for logo (senão o som chegaria atrasado)
            const asked = performance.now();
            this.decodeFile(file)?.then(buf => {
                if (buf && performance.now() - asked < 400) this.startBuffer(buf, gain, opts);
            });
            return true;
        }
        // Antes do 1º gesto o navegador não deixa tocar: nem tenta (cada tentativa seria um download)
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;
        // Sem Web Audio: HTMLAudio (o autoplay ainda pode recusar, sem erro)
        const el = new Audio(file);
        el.volume = Math.max(0, Math.min(1, gain));
        el.play().catch(() => {});
        return true;
    }

    startBuffer(buffer, gain, { pan = 0, rate = 1, loop = false } = {}) {
        const ctx = this.audioContext;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.playbackRate.value = rate;
        const g = ctx.createGain();
        g.gain.value = Math.max(0, Math.min(1.5, gain));
        let node = source.connect(g);
        if (pan && ctx.createStereoPanner) {
            const p = ctx.createStereoPanner();
            p.pan.value = Math.max(-1, Math.min(1, pan));
            node = node.connect(p);
        }
        node.connect(ctx.destination);
        source.start();
        return { source, gain: g };
    }

    /** Efeito curto em loop (ex.: rolo compactador ao arrastar rua). stopLoop para com fade curto. */
    playLoop(key, volume = 1) {
        const k = this.resolve(key);
        const entry = this.manifest[k];
        if (!entry || this.activeLoops.has(k) || !this.canPlayEffects()) return;
        const ctx = this.audioContext;
        const buffer = ctx && this.buffers.get(entry.files[0]);
        if (!buffer) {
            if (ctx) this.decodeFile(entry.files[0]);
            return;
        }
        const handle = this.startBuffer(buffer, volume * (entry.volume ?? 1) * this.categoryVolume(entry.kind), { loop: true });
        this.activeLoops.set(k, handle);
    }

    stopLoop(key) {
        const k = this.resolve(key);
        const handle = this.activeLoops.get(k);
        if (!handle) return;
        this.activeLoops.delete(k);
        const ctx = this.audioContext;
        try {
            handle.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
            handle.source.stop(ctx.currentTime + 0.3);
        } catch (e) { /* já parou */ }
    }

    stopAllLoops() {
        [...this.activeLoops.keys()].forEach(k => this.stopLoop(k));
    }

    // ===== JINGLES =====
    /** Jingle curto por cima da música: ela abaixa enquanto ele toca (duck = false para não abaixar). */
    playJingle(key, { duck = true, volume = 1 } = {}) {
        const k = this.resolve(key);
        const entry = this.manifest[k];
        if (!entry || !this.enabled || this.muted || document.hidden) return false;
        if (typeof MenuIntro !== 'undefined' && MenuIntro.state === 'playing') return false;
        const file = entry.files[0];
        const gain = volume * (entry.volume ?? 1) * this.categoryVolume('jingle');
        const seconds = this.buffers.get(file)?.duration || 3;
        if (duck) this.duckUntil = performance.now() + seconds * 1000 + 300;
        this.lastSfxAt = performance.now();
        return this.playFile(file, gain);
    }

    // ===== MÚSICA =====
    /**
     * Troca a música com crossfade. Mesma chave já tocando = nada muda (só o multiplicador).
     * Assinatura antiga mantida: playMusic(key, fadeIn = true, volumeMultiplier = 1).
     */
    playMusic(key, fadeIn = true, volumeMultiplier = 1.0) {
        const k = this.resolve(key);
        const entry = this.manifest[k];
        if (!entry || entry.kind !== 'music') {
            console.warn(`⚠️ Música não encontrada: ${key}`);
            return;
        }
        this.musicMultiplier = volumeMultiplier ?? 1;
        if (this.currentMusicKey === k && this.musicTrack && !this.musicTrack.stopped) return;
        const xfade = fadeIn ? 2000 : 0;
        if (this.musicTrack) {
            this.musicTrack.stop(xfade || 300);
            this.fadingTracks.add(this.musicTrack);
        }
        this.currentMusicKey = k;
        this.musicStartedAt = performance.now();
        if (!this.enabled) {
            this.musicTrack = null;
            return;
        }
        const track = new StreamTrack(this, k, entry, 'music');
        track.onEnded = () => {
            if (this.musicTrack === track) {
                this.musicTrack = null;
                this.onMusicEnded?.(k);
            }
        };
        this.musicTrack = track;
        track.start(xfade);
        log(`🎵 Música: ${k}`);
    }

    stopMusic(fadeOut = true) {
        if (this.musicTrack) {
            this.musicTrack.stop(fadeOut ? 1500 : 0);
            this.fadingTracks.add(this.musicTrack);
        }
        this.musicTrack = null;
        this.currentMusicKey = null;
    }

    /** <audio>.play() que o autoplay barrou volta no 1º gesto. */
    playElement(el) {
        const p = el.play();
        if (p && typeof p.catch === 'function') {
            p.catch(error => {
                if (error?.name === 'NotAllowedError') this.pendingElements.add(el);
                // AbortError: o elemento foi liberado antes de tocar (troca rápida de faixa)
            });
        }
    }

    _setupAutoplayResume() {
        const resume = () => {
            this.ensureContext();
            if (this.audioContext?.state === 'suspended' && !document.hidden) this.audioContext.resume().catch(() => {});
            this.pendingElements.forEach(el => {
                if (el.src) el.play().catch(() => {});
            });
            this.pendingElements.clear();
        };
        ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(type => document.addEventListener(type, resume, { capture: true, passive: true }));
    }

    // ===== AMBIENTES =====
    /**
     * Liga/desliga camadas de ambiente: { amb_rain_light: 0.8, amb_river: 1 } (nível 0-1).
     * Quem não está no mapa sai com fade; quem entra, entra com fade.
     */
    setAmbientLayers(layers, fadeMs = 2500) {
        const wanted = new Map(Object.entries(layers).filter(([k, level]) => level > 0 && this.manifest[k]?.kind === 'ambient'));
        this.ambientTracks.forEach((track, k) => {
            if (!wanted.has(k)) {
                track.stop(fadeMs);
                this.fadingTracks.add(track);
                this.ambientTracks.delete(k);
            }
        });
        wanted.forEach((level, k) => {
            let track = this.ambientTracks.get(k);
            if (!track) {
                if (!this.enabled) return;
                track = new StreamTrack(this, k, this.manifest[k], 'ambient');
                this.ambientTracks.set(k, track);
                track.level = level;
                track.start(fadeMs);
            }
            track.level = level;
        });
    }

    getAmbientKeys() {
        return [...this.ambientTracks.keys()].sort();
    }

    // ===== RELÓGIO =====
    tick() {
        const now = performance.now();
        const dt = Math.min(0.25, (now - this.lastTick) / 1000);
        this.lastTick = now;
        // Ducking: desce rápido, volta devagar
        const duckTarget = now < this.duckUntil ? 0.25 : 1;
        this.duck += (duckTarget - this.duck) * Math.min(1, dt * (duckTarget < this.duck ? 8 : 1.2));
        this.musicTrack?.update(dt);
        this.fadingTracks.forEach(t => {
            t.update(dt);
            if (t.finished) this.fadingTracks.delete(t);
        });
        this.ambientTracks.forEach(t => t.update(dt));
        this.tickDirector?.(now, dt);
    }

    onVisibility() {
        const all = [this.musicTrack, ...this.fadingTracks, ...this.ambientTracks.values()].filter(Boolean);
        if (document.hidden) {
            all.forEach(t => t.pauseAll());
            this.stopAllLoops();
            this.audioContext?.suspend().catch(() => {});
        } else {
            this.audioContext?.resume().catch(() => {});
            all.forEach(t => t.resumeAll());
        }
    }

    // ===== CONTROLE DE VOLUME =====
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    setAmbientVolume(volume) {
        this.ambientVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    setMuted(muted) {
        this.muted = !!muted;
        if (this.muted) this.stopAllLoops();
        this.saveSettings();
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    saveSettings() {
        const settings = {
            enabled: this.enabled,
            muted: this.muted,
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            ambientVolume: this.ambientVolume
        };
        try {
            localStorage.setItem('guardiao_agua_audio', JSON.stringify(settings));
        } catch (error) {
            console.warn('⚠️ Não deu para salvar o volume:', error);
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('guardiao_agua_audio');
            if (!saved) return;
            const s = JSON.parse(saved);
            const num = (v, d) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d);
            this.enabled = s.enabled !== false;
            this.muted = !!s.muted;
            this.masterVolume = num(s.masterVolume, this.masterVolume);
            this.musicVolume = num(s.musicVolume, this.musicVolume);
            this.sfxVolume = num(s.sfxVolume, this.sfxVolume);
            this.ambientVolume = num(s.ambientVolume, this.ambientVolume);
        } catch (error) {
            console.warn('⚠️ Erro ao carregar configurações de áudio:', error);
        }
    }

    // ===== CLEANUP =====
    dispose() {
        clearInterval(this.ticker);
        this.stopAllLoops();
        [this.musicTrack, ...this.fadingTracks, ...this.ambientTracks.values()].forEach(t => t?.dispose());
        this.musicTrack = null;
        this.fadingTracks.clear();
        this.ambientTracks.clear();
        this.audioContext?.close().catch(() => {});
        log('🗑️ AudioManager disposed');
    }

    // ===== DIA/NOITE =====
    playDayNightTransition(transitionType) {
        if (transitionType === 'morning' || transitionType === 'dawn') this.playSound('sfx_new_day');
        else if (transitionType === 'night' || transitionType === 'dusk') this.playSound('sfx_night_falls');
    }
}

// Instância singleton
AudioManager.instance = null;

AudioManager.getInstance = function() {
    if (!AudioManager.instance) {
        AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
};

AudioManager.playSound = function(key, volume, opts) {
    return AudioManager.getInstance().playSound(key, volume, opts);
};

AudioManager.playMusic = function(key, fadeIn, volumeMultiplier) {
    AudioManager.getInstance().playMusic(key, fadeIn, volumeMultiplier);
};

AudioManager.playJingle = function(key, opts) {
    return AudioManager.getInstance().playJingle(key, opts);
};

AudioManager.playDayNightTransition = function(transitionType) {
    AudioManager.getInstance().playDayNightTransition(transitionType);
};

log('🔊 AudioManager carregado');
