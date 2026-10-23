/**
 * ===== AVISO INICIAL (#start-notice em index.html, estilo da tela de aviso do Nintendo Wii) =====
 *
 * Objetivo do jogo, público, idade de foco, supervisão de um adulto e a pesquisa de mestrado (Unesp).
 * É a primeira coisa na tela: este script roda logo depois do HTML do aviso, antes do Babylon e do resto.
 * O carregamento segue por trás; main.js espera `StartNotice.accepted` para mostrar o menu (e a abertura).
 * Aceitar: botão (já focado, Enter aceita), com fade. "Recusar" leva ao Google.
 * Aceito, não volta nesta aba (voltar ao menu recarrega a página, ver leaveToMainMenu).
 * Testes E2E (navigator.webdriver): desligado, a não ser com ?aviso na URL (tests/notice.spec.js).
 */
const StartNotice = {
    STORAGE_KEY: 'guardiao_agua_aviso_aceito',
    DECLINE_URL: 'https://www.google.com.br/',
    FADE_MS: 450,
    el: document.getElementById('start-notice'),
    accepted: null,

    enabled() {
        try {
            if (sessionStorage.getItem(StartNotice.STORAGE_KEY) === '1') return false;
        } catch { /* sem sessionStorage: mostra */ }
        return /[?&]aviso\b/.test(location.search) || !navigator.webdriver;
    },

    init() {
        if (!StartNotice.enabled()) {
            StartNotice.el.remove();
            StartNotice.accepted = Promise.resolve();
            return;
        }
        const acceptBtn = document.getElementById('btn-notice-accept');
        StartNotice.accepted = new Promise(resolve => {
            const accept = () => {
                try { sessionStorage.setItem(StartNotice.STORAGE_KEY, '1'); } catch { /* aba privada: aparece de novo */ }
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
