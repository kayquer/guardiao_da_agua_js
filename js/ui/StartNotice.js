/**
 * ===== AVISO INICIAL (#start-notice em index.html, estilo da tela de aviso do Nintendo Wii) =====
 *
 * Objetivo do jogo, público, idade de foco, supervisão de um adulto e a pesquisa de mestrado (Unesp).
 * É a primeira coisa na tela: este script roda logo depois do HTML do aviso, antes do Babylon e do resto.
 * O carregamento segue por trás; main.js espera `StartNotice.accepted` para mostrar o menu (e a abertura).
 * Aceitar: botão (já focado, Enter aceita), com fade. "Recusar" leva ao Google.
 * Aparece sempre que o jogo abre (também ao voltar ao menu, que recarrega a página).
 * Testes E2E (navigator.webdriver): desligado, a não ser com ?aviso na URL (tests/notice.spec.js).
 */
const StartNotice = {
    DECLINE_URL: 'https://www.google.com.br/',
    FADE_MS: 450,
    el: document.getElementById('start-notice'),
    accepted: null,

    enabled() {
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
