/**
 * ===== AVISO INICIAL (#start-notice em index.html) =====
 *
 * Objetivo do jogo, público, idade de foco, supervisão de um adulto e a pesquisa de mestrado (Unesp).
 * É a primeira coisa na tela: este script roda logo depois do HTML do aviso, antes do Babylon e do resto.
 * O carregamento segue por trás; main.js espera `StartNotice.accepted` para mostrar o menu (e a abertura).
 * "Recusar" leva ao Google. Aceito, não volta nesta aba (voltar ao menu recarrega a página, ver leaveToMainMenu).
 * Testes E2E (navigator.webdriver): desligado, a não ser com ?aviso na URL (tests/notice.spec.js).
 */
const StartNotice = {
    STORAGE_KEY: 'guardiao_agua_aviso_aceito',
    DECLINE_URL: 'https://www.google.com.br/',
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
        StartNotice.accepted = new Promise(resolve => {
            document.getElementById('btn-notice-accept').addEventListener('click', () => {
                try { sessionStorage.setItem(StartNotice.STORAGE_KEY, '1'); } catch { /* aba privada: aparece de novo */ }
                StartNotice.el.remove();
                resolve();
            }, { once: true });
        });
        document.getElementById('btn-notice-decline').addEventListener('click', () => {
            location.assign(StartNotice.DECLINE_URL);
        });
        StartNotice.el.querySelector('.start-notice__card').focus({ preventScroll: true });
    }
};

StartNotice.init();
