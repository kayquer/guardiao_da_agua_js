/**
 * Retrato animado de personagem: ilustração de IA em camadas dentro de um SVG (sem Babylon, sem rede além dos .webp).
 * Base = assets/characters/<id>/portrait.webp; por cima, só os recortes que mudam (PORTRAIT_MANIFEST em
 * js/data/portraits.js), com borda esfumada por máscara radial: olhos fechados (piscar), bocas "a"/"o" (fala) e
 * expressões inteiras do rosto (worried, happy).
 *
 * Movimento: respira e balança (CSS), pisca em intervalos aleatórios de 3 a 6 s, mexe a boca enquanto fala.
 * Fala: escuta os eventos de leitura em voz alta (`readaloud` em document, emitidos por setupReadAloud em GameUtils.js)
 * cujo botão está dentro de `speechScope`; com `boundary` da voz, a boca segue as palavras, sem ele abre e fecha
 * num ritmo fixo enquanto a frase dura. Sem voz, `talk(ms)` mexe a boca enquanto o texto aparece.
 * prefers-reduced-motion: sem respirar/balançar/entrada (css/portraits.css) e sem a boca automática de `talk`.
 *
 * Uso: const p = new AnimatedPortrait('jose', { crop: 'face', speechScope: el }); el.appendChild(p.el);
 *      p.setExpression('worried'); p.enter('Oi!'); p.destroy();
 */
class AnimatedPortrait {
    constructor(id, { crop = 'bust', label = '', speechScope = null } = {}) {
        this.id = id;
        this.data = PORTRAIT_MANIFEST[id];
        if (!this.data) throw new Error(`Retrato sem manifesto: ${id}`);
        this.dir = `assets/characters/${id}/`;
        this.speechScope = speechScope;
        this.expression = null;
        this.timers = new Set();
        this.flapTimer = null;
        this.uid = `ap${++AnimatedPortrait.count}`;

        this.el = document.createElement('div');
        this.el.className = 'aportrait';
        this.el.dataset.character = id;
        this.el.innerHTML = this.render(label);
        this.svg = this.el.querySelector('svg');
        this.balloon = this.el.querySelector('.aportrait-balloon');
        this.layers = {};
        this.svg.querySelectorAll('[data-layer]').forEach(img => { this.layers[img.dataset.layer] = img; });
        this.setCrop(crop);

        this.onSpeech = event => this.handleSpeech(event.detail || {});
        document.addEventListener('readaloud', this.onSpeech);
        this.scheduleBlink();
    }

    render(label) {
        const size = PORTRAIT_SIZE;
        const feather = `${this.uid}-feather`;
        // Ordem: expressões, bocas e olhos por cima (piscar vale com qualquer boca)
        const order = ['worried', 'happy', 'mouth-a', 'mouth-o', 'eyes'].filter(name => this.data.layers[name]);
        const layers = order.map(name => {
            const [x, y, w, h] = this.data.layers[name];
            const mask = `${this.uid}-m-${name}`;
            return `<mask id="${mask}" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#${feather})"/></mask>` +
                `<image data-layer="${name}" class="aportrait-layer" href="${this.dir}${name}.webp" x="${x}" y="${y}" width="${w}" height="${h}" mask="url(#${mask})"/>`;
        }).join('');
        return `<svg class="aportrait-svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
            <defs><radialGradient id="${feather}"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient></defs>
            <g class="aportrait-sway"><g class="aportrait-breath">
                <image href="${this.dir}portrait.webp" width="${size}" height="${size}"/>${layers}
            </g></g>
        </svg><div class="aportrait-balloon" aria-hidden="true" hidden></div>`;
    }

    /** 'bust' = ilustração inteira (cabeça e ombros); 'face' = quadrado do rosto (círculos pequenos). */
    setCrop(crop) {
        this.crop = crop;
        const [x, y, w, h] = crop === 'face' ? this.data.face : [0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE];
        this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
        this.el.classList.toggle('aportrait--face', crop === 'face');
    }

    setLabel(label) {
        this.svg.setAttribute('aria-label', label);
    }

    /** Expressão do rosto inteiro ('worried', 'happy') ou null para o rosto neutro (sorriso da base). */
    setExpression(name) {
        const next = name && this.layers[name] ? name : null;
        if (next === this.expression) return;
        this.expression = next;
        for (const key of ['worried', 'happy']) this.layers[key]?.classList.toggle('on', key === next);
    }

    // ===== PISCAR =====
    scheduleBlink() {
        this.later(() => {
            // com expressão no rosto, os olhos neutros fechados destoariam: espera a próxima
            if (this.el.isConnected && !this.expression && !document.hidden) this.blink();
            this.scheduleBlink();
        }, 3000 + Math.random() * 3000);
    }

    blink() {
        const eyes = this.layers.eyes;
        if (!eyes) return;
        eyes.classList.add('on');
        this.later(() => eyes.classList.remove('on'), 140);
        if (Math.random() < 0.18) this.later(() => this.blink(), 320); // às vezes pisca duas vezes
    }

    // ===== BOCA =====
    showMouth(index) {
        this.layers['mouth-a']?.classList.toggle('on', index === 0);
        this.layers['mouth-o']?.classList.toggle('on', index === 1);
    }

    /** Uma palavra (evento boundary da voz): abre a boca e fecha logo depois. */
    word() {
        this.showMouth(Math.random() < 0.6 ? 0 : 1);
        clearTimeout(this.wordTimer);
        this.wordTimer = setTimeout(() => this.showMouth(-1), 170);
    }

    startTalking() {
        if (this.flapTimer) return;
        let step = 0;
        this.flapTimer = setInterval(() => {
            step = (step + 1) % 4;
            this.showMouth(step === 1 ? 0 : step === 3 ? 1 : -1);
        }, 120);
    }

    stopTalking() {
        clearInterval(this.flapTimer);
        clearTimeout(this.wordTimer);
        clearTimeout(this.talkTimer);
        this.flapTimer = null;
        this.showMouth(-1);
    }

    /** Mexe a boca por `ms` (texto aparecendo sem voz). Com movimento reduzido, não faz nada. */
    talk(ms = 1500) {
        if (AnimatedPortrait.reducedMotion() || this.speaking) return;
        this.stopTalking();
        this.startTalking();
        this.talkTimer = setTimeout(() => this.stopTalking(), Math.min(ms, 4000));
    }

    /** Eventos `readaloud` de GameUtils: start/word/pause por frase, end ao parar. */
    handleSpeech({ type, button }) {
        if (!this.el.isConnected || !this.speechScope || !button || !this.speechScope.contains(button)) {
            if (type === 'end' && this.speaking) this.endSpeech();
            return;
        }
        if (type === 'start') {
            this.speaking = true;
            clearTimeout(this.talkTimer);
            this.stopTalking();
            this.gotWord = false;
            // Muitas vozes não emitem boundary: sem palavra em 350 ms, abre e fecha no ritmo
            clearTimeout(this.fallbackTimer);
            this.fallbackTimer = setTimeout(() => { if (this.speaking && !this.gotWord) this.startTalking(); }, 350);
        } else if (type === 'word') {
            this.gotWord = true;
            if (this.flapTimer) this.stopTalking();
            this.word();
        } else if (type === 'pause') {
            clearTimeout(this.fallbackTimer);
            this.stopTalking();
        } else if (type === 'end') {
            this.endSpeech();
        }
    }

    endSpeech() {
        this.speaking = false;
        clearTimeout(this.fallbackTimer);
        this.stopTalking();
    }

    // ===== ENTRADA E BALÃO =====
    /** Entra em cena (pulo curto) e, com `line`, mostra um balão que some sozinho. */
    enter(line = '', ms = 2600) {
        if (!AnimatedPortrait.reducedMotion()) {
            this.el.classList.remove('aportrait--enter');
            void this.el.offsetWidth; // reinicia a animação
            this.el.classList.add('aportrait--enter');
        }
        if (!line) return;
        this.balloon.textContent = line;
        this.balloon.hidden = false;
        this.balloon.classList.remove('pop');
        void this.balloon.offsetWidth;
        this.balloon.classList.add('pop');
        this.talk(Math.min(ms - 600, line.length * 70));
        clearTimeout(this.balloonTimer);
        this.balloonTimer = setTimeout(() => { this.balloon.hidden = true; }, ms);
    }

    hideBalloon() {
        clearTimeout(this.balloonTimer);
        this.balloon.hidden = true;
    }

    later(fn, ms) {
        const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms);
        this.timers.add(id);
    }

    destroy() {
        document.removeEventListener('readaloud', this.onSpeech);
        this.timers.forEach(clearTimeout);
        this.timers.clear();
        this.endSpeech();
        clearTimeout(this.balloonTimer);
        this.el.remove();
    }

    static reducedMotion() {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    }
}

AnimatedPortrait.count = 0;

window.AnimatedPortrait = AnimatedPortrait;
