/**
 * UIManager — "📊 Dados da pesquisa" na tela de pausa: resumo do registro do perfil (ResearchLog) e exportação em
 * JSON ou CSV para a dissertação. Mesmo esquema do histórico de notificações: o painel troca de lugar com o do
 * jogador e o Esc volta para a pausa.
 */
mixin(UIManager, {
    setupResearchPanel() {
        document.getElementById('btn-research')?.addEventListener('click', () => this.openResearchPanel());
        document.getElementById('btn-research-back')?.addEventListener('click', () => this.closeResearchPanel());
        document.getElementById('btn-research-json')?.addEventListener('click', () => this.downloadResearch('json'));
        document.getElementById('btn-research-csv')?.addEventListener('click', () => this.downloadResearch('csv'));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isResearchPanelOpen()) {
                event.preventDefault();
                this.closeResearchPanel();
            }
        });
    },

    isResearchPanelOpen() {
        const panel = document.getElementById('research-panel');
        return !!panel && !panel.hidden;
    },

    openResearchPanel() {
        const panel = document.getElementById('research-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel) return;
        if (playerPanel) playerPanel.hidden = true;
        panel.hidden = false;
        this.renderResearchPanel();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_open');
        document.getElementById('btn-research-back')?.focus();
    },

    closeResearchPanel({ focus = true } = {}) {
        const panel = document.getElementById('research-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel || panel.hidden) return;
        panel.hidden = true;
        if (playerPanel) playerPanel.hidden = false;
        if (focus) document.getElementById('btn-research')?.focus();
    },

    renderResearchPanel() {
        const box = document.getElementById('rs-summary');
        if (!box) return;
        const s = ResearchLog.summary();
        const item = (icon, value, label) => `<div class="rs-item"><span class="rs-icon" aria-hidden="true">${icon}</span><b>${value}</b><span>${label}</span></div>`;
        box.innerHTML = [
            item('🎮', s.sessions, s.sessions === 1 ? 'sessão' : 'sessões'),
            item('📖', s.pages, `${s.pages === 1 ? 'página lida' : 'páginas lidas'} (${s.readingMinutes.toLocaleString('pt-BR')} min)`),
            item('🎓', `${s.quizzesPassed}/${s.quizzes}`, 'quizzes aprovados'),
            item('🌿', `${s.goodDecisions}/${s.decisions}`, 'boas decisões com o Paulo'),
            item('🎯', s.missions, s.missions === 1 ? 'missão concluída' : 'missões concluídas'),
            item('📚', s.lessons, s.lessons === 1 ? 'aula concluída' : 'aulas concluídas')
        ].join('');
        const count = document.getElementById('rs-count');
        if (count) count.textContent = `${s.events} registros`;
    },

    /** Baixa o arquivo pelo navegador (nada sai do computador sem esse clique). */
    downloadResearch(kind) {
        const profileId = ResearchLog.profileKey();
        const body = kind === 'csv' ? '﻿' + ResearchLog.toCSV(profileId) // BOM: o Excel lê os acentos
            : JSON.stringify(ResearchLog.toJSON(profileId), null, 2);
        const blob = new Blob([body], { type: kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `guardiao-pesquisa-${profileId}-${new Date().toISOString().slice(0, 10)}.${kind}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.showNotification(`📊 Dados da pesquisa baixados (${kind.toUpperCase()}).`, 'success', 3000);
    }
});
