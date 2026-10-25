/**
 * UIManager — "⚙️ Configurações" na tela de pausa: gráficos, tamanho do texto, clima (real ou simulado) e som.
 * Mesmo esquema do histórico de notificações e dos dados da pesquisa: o painel troca de lugar com o do jogador e o
 * Esc volta para a pausa. Os seletores de gráficos/texto/clima são ligados em main.js ([data-*-picker]); o bloco de
 * som é criado por AudioManager.setupSoundPanel dentro de .settings-body.
 */
mixin(UIManager, {
    setupSettingsPanel() {
        document.getElementById('btn-settings')?.addEventListener('click', () => this.openSettingsPanel());
        document.getElementById('btn-settings-back')?.addEventListener('click', () => this.closeSettingsPanel());
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isSettingsPanelOpen()) {
                event.preventDefault();
                this.closeSettingsPanel();
            }
        });
    },

    isSettingsPanelOpen() {
        const panel = document.getElementById('settings-panel');
        return !!panel && !panel.hidden;
    },

    openSettingsPanel() {
        const panel = document.getElementById('settings-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel) return;
        if (playerPanel) playerPanel.hidden = true;
        panel.hidden = false;
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_open');
        document.getElementById('btn-settings-back')?.focus();
    },

    closeSettingsPanel({ focus = true } = {}) {
        const panel = document.getElementById('settings-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel || panel.hidden) return;
        panel.hidden = true;
        if (playerPanel) playerPanel.hidden = false;
        if (focus) document.getElementById('btn-settings')?.focus();
    }
});
