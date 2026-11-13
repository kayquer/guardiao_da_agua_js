/**
 * ===== AVISO INICIAL (#start-notice em index.html, estilo da tela de aviso do Nintendo Wii) =====
 *
 * Objetivo do jogo, faixa etária (10 a 99+ anos), supervisão recomendada para menores de 18 e a pesquisa de mestrado (Unesp).
 * É a primeira coisa na tela: este script roda logo depois do HTML do aviso, antes do Babylon e do resto.
 * O carregamento segue por trás; main.js espera `StartNotice.accepted` para mostrar o menu (e a abertura).
 * Aceitar: botão (já focado, Enter aceita), com fade.
 * Modo pesquisa (GameMode, js/config/GameMode.js): aparece sempre que o jogo abre (também ao voltar ao menu, que
 * recarrega a página), fala do registro da pesquisa e "Recusar" leva ao Google. Modo loja (research: false): só até
 * ser aceito uma vez neste computador (NOTICE_KEY), o texto de privacidade diz que nada é enviado e "Recusar" troca o
 * aviso por uma tela simples (#start-notice-declined) com o botão "Ler o aviso de novo".
 * Os trechos de cada modo têm data-notice-mode="pesquisa|loja" no HTML; applyMode tira os do outro modo.
 * Testes E2E (navigator.webdriver): desligado, a não ser com ?aviso na URL (tests/notice.spec.js).
 */
const StartNotice = {
    DECLINE_URL: 'https://www.google.com.br/',
    // = STORAGE_PREFIX (GameConstants.js, que roda depois deste arquivo); tests/unit/research.test.js confere
    PREFIX: 'guardiao_agua_evo_',
    get CONSENT_KEY() { return StartNotice.PREFIX + 'research_consent'; }, // = ResearchSync.CONSENT_KEY
    get NOTICE_KEY() { return StartNotice.PREFIX + 'notice_seen'; },       // aviso já aceito (modo loja)
    FADE_MS: 450,
    el: document.getElementById('start-notice'),
    accepted: null,
    versionPromise: null,

    enabled() {
        return /[?&]aviso\b/.test(location.search) || !navigator.webdriver;
    },

    /** 'loja' quando esta versão não registra nada para a pesquisa (GameMode.current().research false). */
    mode() {
        return typeof GameMode !== 'undefined' && GameMode.current().research === false ? 'loja' : 'pesquisa';
    },

    /** Modo loja: o aviso já foi aceito uma vez neste computador (no modo pesquisa ele volta sempre). */
    alreadySeen() {
        if (typeof GameMode === 'undefined' || GameMode.current().noticeEveryStart) return false;
        try { return localStorage.getItem(StartNotice.NOTICE_KEY) === 'yes'; } catch { return false; }
    },

    /** Deixa só os textos do modo atual; na loja, sem a caixa de envio da pesquisa. */
    applyMode() {
        const mode = StartNotice.mode();
        StartNotice.el.querySelectorAll('[data-notice-mode]').forEach(node => {
            if (node.dataset.noticeMode !== mode) node.remove();
        });
        if (mode === 'loja') StartNotice.el.querySelector('.start-notice__consent')?.remove();
    },

    /**
     * Celular ou tablet: user agent (iPadOS se passa por Mac, então conta o toque) ou tela pequena com toque.
     * O jogo foi feito para computador nesta fase da pesquisa: o aviso recomenda teclado e mouse.
     */
    isMobileDevice() {
        const ua = navigator.userAgent || '';
        if (navigator.userAgentData?.mobile) return true;
        if (/Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini|Silk|Kindle/i.test(ua)) return true;
        if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
        const coarse = window.matchMedia?.('(pointer: coarse)').matches;
        const shortSide = Math.min(window.screen?.width || innerWidth, window.screen?.height || innerHeight);
        return !!coarse && shortSide <= 900;
    },

    /**
     * Texto da versão: "v1.0.0 · build 412 · evolucao-pesquisa · 6217d27" (campos que faltarem saem).
     * @param {{release?: string, build?: number, branch?: string, commit?: string, local?: boolean}} info
     */
    formatVersion(info) {
        if (!info || typeof info !== 'object') return '';
        const parts = [];
        if (info.release) parts.push(`v${info.release}`);
        if (info.build) parts.push(`build ${info.build}`);
        if (info.branch) parts.push(info.local ? `${info.branch} (local)` : info.branch);
        if (info.commit) parts.push(info.commit);
        return parts.join(' · ');
    },

    /**
     * build-info.json (gravado pelo workflow do Pages; o npm start gera na hora), lido uma vez só: o rodapé do aviso
     * e o "Sobre" (main.js showAbout) usam a mesma resposta. Resolve null sem o arquivo (outro servidor).
     */
    versionInfo() {
        if (!StartNotice.versionPromise) {
            StartNotice.versionPromise = fetch('build-info.json', { cache: 'no-store' })
                .then(response => (response.ok ? response.json() : null))
                .catch(() => null);
        }
        return StartNotice.versionPromise;
    },

    /** Mostra a versão em `el` (com a data no title); sem versão o elemento fica escondido. */
    async fillVersion(el, suffix = '') {
        if (!el) return;
        const info = await StartNotice.versionInfo();
        const text = StartNotice.formatVersion(info);
        if (!text || !el.isConnected) return;
        el.textContent = text + suffix;
        if (info.date) el.title = `Publicado em ${new Date(info.date).toLocaleString('pt-BR')}`;
        el.hidden = false;
    },

    showVersion() {
        return StartNotice.fillVersion(document.getElementById('start-notice-version'));
    },

    /** Modo loja: "Recusar" troca o aviso pela tela que pede o aceite; "Ler o aviso de novo" volta. */
    showDeclined(declined) {
        const acceptBtn = document.getElementById('btn-notice-accept');
        const reopen = document.getElementById('btn-notice-reopen');
        StartNotice.el.classList.add('is-declined');
        declined.hidden = false;
        reopen.focus({ preventScroll: true });
        reopen.onclick = () => {
            StartNotice.el.classList.remove('is-declined');
            declined.hidden = true;
            StartNotice.el.querySelector('.start-notice__scroll')?.scrollTo?.(0, 0);
            acceptBtn.focus({ preventScroll: true });
        };
    },

    init() {
        StartNotice.applyMode();
        StartNotice.showVersion();
        const mobileNote = document.getElementById('start-notice-mobile');
        if (mobileNote) mobileNote.hidden = !StartNotice.isMobileDevice();
        if (!StartNotice.enabled() || StartNotice.alreadySeen()) {
            StartNotice.el.remove();
            StartNotice.accepted = Promise.resolve();
            return;
        }
        const acceptBtn = document.getElementById('btn-notice-accept');
        const consent = document.getElementById('notice-research-consent');
        // Envio anônimo dos dados de pesquisa (ResearchSync.CONSENT_KEY; este script roda antes dele):
        // marcado por padrão nesta fase do estudo, e lembra se alguém desmarcou neste computador
        try {
            if (consent && localStorage.getItem(StartNotice.CONSENT_KEY) === 'no') consent.checked = false;
        } catch { /* sem localStorage: fica o padrão */ }
        StartNotice.accepted = new Promise(resolve => {
            const accept = () => {
                try {
                    if (consent?.isConnected) localStorage.setItem(StartNotice.CONSENT_KEY, consent.checked ? 'yes' : 'no');
                    localStorage.setItem(StartNotice.NOTICE_KEY, 'yes');
                } catch { /* modo privado */ }
                const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
                StartNotice.el.classList.add('is-leaving');
                setTimeout(() => {
                    StartNotice.el.remove();
                    resolve();
                }, reduced ? 0 : StartNotice.FADE_MS);
            };
            acceptBtn.addEventListener('click', accept, { once: true });
        });
        const declined = document.getElementById('start-notice-declined');
        document.getElementById('btn-notice-decline').addEventListener('click', () => {
            if (declined) StartNotice.showDeclined(declined); // loja: fica no jogo, sem sair da página
            else location.assign(StartNotice.DECLINE_URL);
        });
        // Como no Wii, o "cursor" já começa no botão de continuar (Enter aceita)
        acceptBtn.focus({ preventScroll: true });
    }
};

StartNotice.init();
