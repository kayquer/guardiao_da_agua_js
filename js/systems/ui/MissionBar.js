/**
 * UIManager — Barra de missão compacta que se esconde sozinha (css/mission-bar.css)
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * Só no computador (no celular a barra já é a gaveta do ▲). A faixa de baixo aparece ao começar, quando a
 * missão avança (MissionUI.updateMissionInfoPanel → onMissionBarChange) e ao clicar no botão 🎯; depois de
 * MISSION_BAR_IDLE_MS sem o mouse em cima, desce para fora da tela e deixa só o botão animado.
 * Durante tutoriais ela não some (os passos apontam para ela).
 */
const MISSION_BAR_IDLE_MS = 7000;
const MISSION_BAR_PEEK_MS = 6000;

mixin(UIManager, {
    setupMissionBarAutoHide() {
        if (this.missionBarReady) return;
        const bar = document.querySelector('.hud-bottom');
        const screen = document.getElementById('game-screen');
        if (!bar || !screen) return;
        this.missionBarReady = true;

        const button = document.createElement('button');
        button.id = 'mission-peek-btn';
        button.className = 'mission-peek-btn';
        button.type = 'button';
        button.setAttribute('aria-label', 'Mostrar a missão atual');
        button.innerHTML = `${uiIcon('ui-target')} <span>Missão</span> <b class="mission-peek-progress"></b>`;
        button.addEventListener('click', () => {
            this.peekMissionBar(MISSION_BAR_PEEK_MS + 2000);
            AudioManager.playSound('sfx_ui_click', 0.5);
        });
        screen.appendChild(button);

        bar.addEventListener('pointerenter', () => {
            this.missionBarHover = true;
            this.showMissionBar();
        });
        bar.addEventListener('pointerleave', () => {
            this.missionBarHover = false;
            this.scheduleMissionBarHide();
        });
        this.peekMissionBar(MISSION_BAR_IDLE_MS + 3000);
    },

    showMissionBar() {
        clearTimeout(this.missionBarTimer);
        document.body.classList.remove('mission-bar-hidden');
    },

    /** Mostra a barra por um tempo e esconde de novo. */
    peekMissionBar(ms = MISSION_BAR_PEEK_MS) {
        this.showMissionBar();
        this.scheduleMissionBarHide(ms);
    },

    scheduleMissionBarHide(ms = MISSION_BAR_IDLE_MS) {
        clearTimeout(this.missionBarTimer);
        this.missionBarTimer = setTimeout(() => this.hideMissionBar(), ms);
    },

    hideMissionBar() {
        if (this.isMobile) return;
        // Mouse em cima ou tutorial (que aponta para a barra): tenta de novo mais tarde
        if (this.missionBarHover || this.gameManager?.tutorialSystem?.isActive) {
            this.scheduleMissionBarHide();
            return;
        }
        document.body.classList.add('mission-bar-hidden');
    },

    /** A missão mostrada ou o progresso mudou: atualiza o botão e mostra a barra um pouco. */
    onMissionBarChange(key, progressText) {
        const label = document.querySelector('#mission-peek-btn .mission-peek-progress');
        if (label) label.textContent = progressText || '';
        if (this.missionBarKey === key) return;
        const first = this.missionBarKey === undefined;
        this.missionBarKey = key;
        if (!first && this.missionBarReady) this.peekMissionBar();
    }
});
