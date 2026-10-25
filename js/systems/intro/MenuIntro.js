/**
 * ===== ABERTURA + MENU PRINCIPAL (orquestra a IntroCinematic e a revelação do menu) =====
 *
 *   MenuIntro.prepare(progress)  → durante a tela de carregamento: cria o #intro-canvas e monta a cidade
 *   MenuIntro.onMenuShown(prev)  → showScreen('main-menu'): toca a abertura (1ª vez) ou só mostra o menu
 *   MenuIntro.skip()             → Esc / clique / toque / botão "Pular": vai direto ao fim com o menu
 *   MenuIntro.dispose()          → ao iniciar/continuar o jogo: descarta cena, engine, canvas e listeners
 *
 * Quando toca: a abertura inteira (~21 s) toda vez que o menu abre (voltar ao menu recarrega a página);
 * com prefers-reduced-motion, direto na pose final e sem balanço.
 * Sem a abertura (sem WebGL, falha ao montar, ou navegador automatizado — navigator.webdriver, os testes
 * E2E — sem ?intro na URL): o menu aparece na hora sobre o fundo em degradê, como antes.
 * ?intro força a abertura (teste E2E dela); ?nointro desliga.
 */
const MenuIntro = {
    cinematic: null,
    canvas: null,
    state: 'off', // off | ready | playing | menu | disposed
    billboardTimer: null,
    billboardIndex: 0,

    enabled() {
        const q = location.search;
        if (/[?&]nointro\b/.test(q)) return false;
        if (/[?&]intro\b/.test(q)) return true;
        return !navigator.webdriver;
    },

    reducedMotion() {
        return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    },

    // A mesma qualidade gráfica do jogo (GraphicsQuality: escolhida no menu/pausa ou detectada pelo aparelho).
    // IntroCinematic trata tudo que não é 'high' como a versão leve; 'low' ainda renderiza menos pixels.
    quality() {
        return GraphicsQuality.current();
    },

    /** Seletor de Gráficos mexido com o menu aberto: a abertura muda de qualidade na hora. */
    applyQuality() {
        this.cinematic?.setQuality?.(this.quality());
    },

    /** Monta a cidade atrás da tela de carregamento. Nunca lança: sem abertura, o menu segue normal. */
    async prepare(onProgress = () => {}) {
        this.renderBillboard();
        if (!this.enabled() || typeof IntroCinematic === 'undefined') return false;
        try {
            const canvas = document.createElement('canvas');
            canvas.id = 'intro-canvas';
            canvas.setAttribute('aria-hidden', 'true');
            canvas.tabIndex = -1;
            document.body.prepend(canvas);
            this.canvas = canvas;
            const cinematic = new IntroCinematic(canvas, {
                fadeEl: document.getElementById('intro-fade'),
                quality: this.quality()
            });
            this.cinematic = cinematic;
            const ok = await cinematic.build(onProgress);
            if (!ok || this.cinematic !== cinematic) {
                this.dispose();
                return false;
            }
            document.body.classList.add('has-intro');
            this.state = 'ready';
            return true;
        } catch (error) {
            console.warn('MenuIntro: abertura indisponível, seguindo para o menu', error?.message || error);
            this.dispose();
            return false;
        }
    },

    /** Chamado por showScreen('main-menu'). */
    onMenuShown(previousScreen) {
        this.renderWelcome();
        this.startBillboard();
        if (this.state === 'ready') {
            this.play();
            return;
        }
        if (this.state === 'playing') return;
        // Sem abertura (ou já tocada): entrada do logo, menos ao voltar do cadastro
        if (previousScreen !== 'profile-screen' && typeof GameLogo !== 'undefined') GameLogo.play();
        document.body.classList.add('menu-ready');
    },

    play() {
        const mode = this.reducedMotion() ? 'final' : 'full';

        this.state = 'playing';
        document.body.classList.remove('menu-ready');
        document.body.classList.add('intro-playing');
        if (mode === 'full') document.body.classList.add('intro-letterbox');
        if (typeof GameLogo !== 'undefined') GameLogo.hide();
        const overlay = document.getElementById('intro-overlay');
        if (overlay) overlay.hidden = false;
        this.bindSkip();
        // Música da abertura começa junto com a 1ª tomada (movimento reduzido: direto o tema do menu)
        if (typeof AudioManager !== 'undefined') AudioManager.onIntroStart(mode);

        this.cinematic.play(mode, {
            orbit: !this.reducedMotion(),
            onShot: (i, shot) => this.showCaption(shot.caption || ''),
            onFinish: () => this.reveal()
        });
    },

    /** Câmera chegou (ou pulou): logo entra, depois os painéis do menu. */
    reveal() {
        if (this.state !== 'playing') return;
        this.state = 'menu';
        this.unbindSkip();
        this.showCaption('');
        document.body.classList.remove('intro-playing', 'intro-letterbox');
        const overlay = document.getElementById('intro-overlay');
        if (overlay) overlay.hidden = true;
        if (typeof GameLogo !== 'undefined') GameLogo.play();
        document.body.classList.add('menu-ready');
        document.getElementById('btn-start')?.focus({ preventScroll: true });
        if (typeof AudioManager !== 'undefined') AudioManager.onIntroDone(); // crossfade para o tema do menu
    },

    skip() {
        if (this.state !== 'playing') return;
        this.cinematic?.skip(); // chama reveal() pelo onFinish
    },

    bindSkip() {
        this.onSkipKey = e => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.skip();
            }
        };
        this.onSkipPointer = e => {
            if (!e.target.closest?.('#intro-overlay, #intro-canvas, #main-menu')) return;
            // O clique que pulou não pode cair num botão do menu que acabou de aparecer embaixo do dedo
            const swallow = ev => { ev.stopPropagation(); ev.preventDefault(); };
            window.addEventListener('click', swallow, { capture: true, once: true });
            setTimeout(() => window.removeEventListener('click', swallow, true), 600);
            this.skip();
        };
        window.addEventListener('keydown', this.onSkipKey, true);
        window.addEventListener('pointerdown', this.onSkipPointer, true);
    },

    unbindSkip() {
        if (this.onSkipKey) window.removeEventListener('keydown', this.onSkipKey, true);
        if (this.onSkipPointer) window.removeEventListener('pointerdown', this.onSkipPointer, true);
        this.onSkipKey = this.onSkipPointer = null;
    },

    showCaption(text) {
        const el = document.getElementById('intro-caption');
        if (!el) return;
        el.classList.remove('is-on');
        if (!text) return;
        el.textContent = text;
        void el.offsetWidth; // reinicia a animação de entrada
        el.classList.add('is-on');
    },

    /** Ao iniciar/continuar o jogo: some com tudo da abertura (a cena do jogo é outra engine). */
    dispose() {
        this.unbindSkip();
        this.stopBillboard();
        this.cinematic?.dispose();
        this.cinematic = null;
        this.canvas?.remove();
        this.canvas = null;
        if (this.state !== 'off') this.state = 'disposed';
        document.body.classList.remove('has-intro', 'intro-playing', 'intro-letterbox');
        const overlay = document.getElementById('intro-overlay');
        if (overlay) overlay.hidden = true;
    },

    // ===================== CARD DE BOAS-VINDAS =====================

    /** Perfil a usar no "Começar": o ativo, senão o último que jogou. */
    startProfile() {
        if (typeof PlayerProfile === 'undefined') return null;
        const profiles = PlayerProfile.list();
        if (!profiles.length) return null;
        const active = PlayerProfile.getActive();
        if (active && profiles.some(p => p.id === active.id)) return active;
        return profiles.slice().sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))[0];
    },

    renderWelcome() {
        const title = document.getElementById('welcome-title');
        const text = document.getElementById('welcome-text');
        const sub = document.getElementById('menu-start-sub');
        if (!title || !text) return;
        const profile = this.startProfile();
        const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
        if (profile) {
            title.innerHTML = `Bem-vindo(a) de volta, <span class="welcome-name">${esc(profile.name)}</span>!`;
            text.textContent = 'A cidade está esperando o seu cuidado. Escolha quem vai jogar ou toque em Começar.';
            if (sub) sub.textContent = `Jogar como ${profile.name}`;
        } else {
            title.innerHTML = 'Bem-vindo(a), <span class="welcome-name">Guardião!</span>';
            text.textContent = 'Construa uma cidade que capta, trata e economiza água, e proteja o rio que dá vida a ela.';
            if (sub) sub.textContent = 'Crie seu Guardião e construa a cidade';
        }
    },

    // ===================== BILLBOARD (destaques) =====================

    renderBillboard() {
        const box = document.getElementById('menu-billboard');
        if (!box || typeof MENU_BILLBOARD === 'undefined' || box.dataset.ready) return;
        box.dataset.ready = '1';
        const slides = MENU_BILLBOARD.map((s, i) => `
            <article class="billboard-slide${i === 0 ? ' is-active' : ''}" data-slide="${i}" aria-hidden="${i === 0 ? 'false' : 'true'}">
                <div class="billboard-art">${uiIcon(s.icon, 'lg', 'billboard-icon')}</div>
                <div class="billboard-copy">
                    <span class="billboard-tag">${s.tag}</span>
                    <h3 class="billboard-title">${s.title}</h3>
                    <p class="billboard-text">${s.text}</p>
                </div>
            </article>`).join('');
        const dots = MENU_BILLBOARD.map((s, i) =>
            `<button type="button" class="billboard-dot${i === 0 ? ' is-active' : ''}" data-dot="${i}" aria-label="Destaque ${i + 1}: ${s.title}"></button>`).join('');
        box.innerHTML = `<div class="billboard-slides">${slides}</div><div class="billboard-dots">${dots}</div>`;
        box.addEventListener('click', e => {
            const dot = e.target.closest('[data-dot]');
            if (!dot) return;
            this.showSlide(Number(dot.dataset.dot));
            this.startBillboard();
        });
    },

    showSlide(i) {
        const box = document.getElementById('menu-billboard');
        if (!box) return;
        const n = box.querySelectorAll('.billboard-slide').length;
        if (!n) return;
        this.billboardIndex = ((i % n) + n) % n;
        box.querySelectorAll('.billboard-slide').forEach((el, k) => {
            el.classList.toggle('is-active', k === this.billboardIndex);
            el.setAttribute('aria-hidden', k === this.billboardIndex ? 'false' : 'true');
        });
        box.querySelectorAll('.billboard-dot').forEach((el, k) => el.classList.toggle('is-active', k === this.billboardIndex));
    },

    startBillboard() {
        this.stopBillboard();
        if (this.reducedMotion()) return;
        this.billboardTimer = setInterval(() => this.showSlide(this.billboardIndex + 1), 7000);
    },

    stopBillboard() {
        clearInterval(this.billboardTimer);
        this.billboardTimer = null;
    }
};
