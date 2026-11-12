/**
 * ===== AVISO INICIAL (#start-notice em index.html, estilo da tela de aviso do Nintendo Wii) =====
 *
 * Objetivo do jogo, faixa etária (10 a 99+ anos), supervisão recomendada para menores de 18 e a pesquisa de mestrado (Unesp).
 * É a primeira coisa na tela: este script roda logo depois do HTML do aviso, antes do Babylon e do resto.
 * O carregamento segue por trás; main.js espera `StartNotice.accepted` para mostrar o menu (e a abertura).
 * Aceitar: botão (já focado, Enter aceita), com fade. "Recusar" leva ao Google.
 * Modo pesquisa (GameMode, js/config/GameMode.js): aparece sempre que o jogo abre (também ao voltar ao menu, que
 * recarrega a página). Modo loja (noticeEveryStart: false): só até ser aceito uma vez neste computador (NOTICE_KEY).
 * Testes E2E (navigator.webdriver): desligado, a não ser com ?aviso na URL (tests/notice.spec.js).
 */
const StartNotice = {
    DECLINE_URL: 'https://www.google.com.br/',
    CONSENT_KEY: 'guardiao_agua_evo_research_consent', // = STORAGE_PREFIX + 'research_consent' (ResearchSync.CONSENT_KEY)
    NOTICE_KEY: 'guardiao_agua_evo_notice_seen',       // = STORAGE_PREFIX + 'notice_seen' (aviso já aceito, modo loja)
    FADE_MS: 450,
    el: document.getElementById('start-notice'),
    accepted: null,

    enabled() {
        return /[?&]aviso\b/.test(location.search) || !navigator.webdriver;
    },

    /** Modo loja: o aviso já foi aceito uma vez neste computador (no modo pesquisa ele volta sempre). */
    alreadySeen() {
        if (typeof GameMode === 'undefined' || GameMode.current().noticeEveryStart) return false;
        try { return localStorage.getItem(StartNotice.NOTICE_KEY) === 'yes'; } catch { return false; }
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

    /** Lê build-info.json (gravado pelo workflow do Pages; o npm start gera na hora) e mostra no rodapé. */
    async showVersion() {
        const el = document.getElementById('start-notice-version');
        if (!el) return;
        try {
            const response = await fetch('build-info.json', { cache: 'no-store' });
            if (!response.ok) return;
            const info = await response.json();
            const text = StartNotice.formatVersion(info);
            if (!text || !el.isConnected) return;
            el.textContent = text;
            if (info.date) el.title = `Publicado em ${new Date(info.date).toLocaleString('pt-BR')}`;
            el.hidden = false;
        } catch { /* sem o arquivo (outro servidor): fica sem a versão */ }
    },

    init() {
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
        document.getElementById('btn-notice-decline').addEventListener('click', () => {
            location.assign(StartNotice.DECLINE_URL);
        });
        // Como no Wii, o "cursor" já começa no botão de continuar (Enter aceita)
        acceptBtn.focus({ preventScroll: true });
    }
};

StartNotice.init();
