/**
 * GraphicsQuality — qualidade gráfica (Baixa / Média / Alta), escolhida no menu principal ou na pausa e salva
 * no navegador. Na primeira vez o jogo escolhe sozinho pelo aparelho (detect). Sem DOM/Babylon no topo:
 * presets e detecção são testados em tests/unit/graphics.test.js.
 *
 * O que cada preset muda está em GameManager.applyGraphicsQuality (escala de render, sombras, FXAA),
 * WeatherEffects.setQuality (partículas, nuvens, balanço das árvores) e GridManager.setWaterAnimated.
 * Antialias (MSAA) só muda ao recriar o engine: vale ao reabrir o jogo (needsRestart).
 */
const GraphicsQuality = {
    STORAGE_KEY: 'guardiao_agua_graphics',
    LEVELS: ['low', 'medium', 'high'],
    LABELS: { low: 'Baixa', medium: 'Média', high: 'Alta' },
    HINTS: {
        high: 'Tudo ligado: sombras suaves, bordas lisas, chuva cheia e árvores balançando.',
        medium: 'Equilíbrio: imagem um pouco mais leve, sombras simples e menos chuva.',
        low: 'Para computadores antigos: sem sombras, sem nuvens e pouca chuva.'
    },

    /**
     * resolution = pixels renderizados por pixel da tela (CSS); 1 = como sempre foi.
     * shadows: 'blur' (sombra suave, a de sempre), 'pcf' (borda simples, mais barata) ou 'off' (só a sombra falsa).
     * treeSway: atualiza o balanço das árvores a cada N quadros (0 = paradas).
     */
    PRESETS: {
        high: { resolution: 1, antialias: true, fxaa: false, shadows: 'blur', particleScale: 1, clouds: true, treeSway: 1, waterShader: true },
        medium: { resolution: 0.8, antialias: false, fxaa: true, shadows: 'pcf', particleScale: 0.6, clouds: true, treeSway: 2, waterShader: true },
        low: { resolution: 0.625, antialias: false, fxaa: false, shadows: 'off', particleScale: 0.3, clouds: false, treeSway: 0, waterShader: false }
    },

    listeners: [],
    detected: null,

    isLevel(level) {
        return this.LEVELS.includes(level);
    },

    /** Nível salvo pelo jogador (null se nunca escolheu). */
    saved() {
        try {
            const value = window.localStorage?.getItem(this.STORAGE_KEY);
            return this.isLevel(value) ? value : null;
        } catch (e) {
            return null;
        }
    },

    /** Nível em uso: o escolhido pelo jogador ou, sem escolha, o detectado para o aparelho. */
    current() {
        const saved = this.saved();
        if (saved) return saved;
        if (!this.detected) this.detected = this.detect(this.readEnvironment());
        return this.detected;
    },

    isAuto() {
        return !this.saved();
    },

    preset(level = this.current()) {
        return this.PRESETS[this.isLevel(level) ? level : 'medium'];
    },

    set(level) {
        if (!this.isLevel(level)) return false;
        try {
            window.localStorage?.setItem(this.STORAGE_KEY, level);
        } catch (e) { /* sem localStorage: vale só nesta sessão (detected abaixo) */ }
        this.detected = level;
        this.listeners.slice().forEach(fn => {
            try { fn(level); } catch (error) { console.warn('GraphicsQuality: erro ao aplicar', error); }
        });
        return true;
    },

    onChange(fn) {
        this.listeners.push(fn);
        return () => { this.listeners = this.listeners.filter(f => f !== fn); };
    },

    /** O MSAA do engine só muda ao recriá-lo: com ele ligado e um nível que não o usa, avisa "ao reabrir". */
    needsRestart(level, engineAntialias) {
        return !!engineAntialias !== !!this.preset(level).antialias;
    },

    /**
     * Escolha automática (sem DOM, testável). env = { mobile, cores, memory (GB), gpu (texto do renderer) }.
     * Placa fraca (software, Intel HD antiga, Mali/Adreno antigos) ou pouca memória/núcleos → baixa;
     * celular, Intel integrada ou máquina mediana → média; o resto → alta.
     */
    detect(env = {}) {
        const gpu = String(env.gpu || '').toLowerCase();
        const cores = Number(env.cores) || 0;
        const memory = Number(env.memory) || 0;
        const software = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/.test(gpu);
        // Intel "HD Graphics" sem número ou 2000-5xxx (2011-2015; as 520/620 em diante ficam na média),
        // GMA, e GPUs de celular antigas
        const weakGpu = software
            || /intel.*\b(gma|hd graphics(?! \d{3}\b))/.test(gpu)
            || /mali-[t4]|adreno[^\d]*[2-4]\d{2}\b|powervr sgx|videocore/.test(gpu);
        const lowCpu = (cores && cores <= 2) || (memory && memory <= 2);
        if (weakGpu || lowCpu) return 'low';
        const integrated = /intel|uhd graphics|iris|mali|adreno|powervr|apple gpu/.test(gpu);
        if (env.mobile || integrated || (cores && cores <= 4) || (memory && memory <= 4)) return 'medium';
        return 'high';
    },

    /** Lê o aparelho (navigator + nome da placa via WEBGL_debug_renderer_info). Nunca lança. */
    readEnvironment() {
        const env = { mobile: false, cores: 0, memory: 0, gpu: '' };
        try {
            const nav = window.navigator || {};
            env.cores = nav.hardwareConcurrency || 0;
            env.memory = nav.deviceMemory || 0;
            env.mobile = !!(nav.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '')
                || window.matchMedia?.('(pointer: coarse)').matches);
            const canvas = window.document?.createElement('canvas');
            const gl = canvas?.getContext('webgl') || canvas?.getContext('experimental-webgl');
            if (gl) {
                const info = gl.getExtension('WEBGL_debug_renderer_info');
                env.gpu = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
                gl.getExtension('WEBGL_lose_context')?.loseContext();
            }
        } catch (e) { /* sem informação: fica com o que deu para ler */ }
        return env;
    }
};
