/**
 * UIManager — "🏅 Conquistas" na tela de pausa: a vitrine do jogador (conquistas ganhas e as que faltam) e as
 * estrelas de cada missão concluída. Mesmo esquema do painel de pesquisa: troca de lugar com o painel do jogador
 * e o Esc volta para a pausa.
 */
mixin(UIManager, {
    setupAchievementsPanel() {
        document.getElementById('btn-achievements')?.addEventListener('click', () => this.openAchievementsPanel());
        document.getElementById('btn-achievements-back')?.addEventListener('click', () => this.closeAchievementsPanel());
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isAchievementsPanelOpen()) {
                event.preventDefault();
                this.closeAchievementsPanel();
            }
        });
    },

    isAchievementsPanelOpen() {
        const panel = document.getElementById('achievements-panel');
        return !!panel && !panel.hidden;
    },

    openAchievementsPanel() {
        const panel = document.getElementById('achievements-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel) return;
        if (playerPanel) playerPanel.hidden = true;
        panel.hidden = false;
        this.renderAchievementsPanel();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_open');
        document.getElementById('btn-achievements-back')?.focus();
    },

    closeAchievementsPanel({ focus = true } = {}) {
        const panel = document.getElementById('achievements-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel || panel.hidden) return;
        panel.hidden = true;
        if (playerPanel) playerPanel.hidden = false;
        if (focus) document.getElementById('btn-achievements')?.focus();
    },

    renderAchievementsPanel() {
        const qs = this.gameManager.questSystem;
        const earned = qs?.achievements || new Set();
        const list = typeof ACHIEVEMENTS !== 'undefined' ? Object.entries(ACHIEVEMENTS) : [];
        const badges = list.map(([id, a]) => {
            const got = earned.has(id);
            return `<div class="ach-badge ${got ? 'earned' : 'locked'}" title="${a.description}">
                <span class="ach-icon">${got ? uiIcon(a.icon, 'lg') : '🔒'}</span>
                <b>${a.name}</b><span>${a.description}</span></div>`;
        }).join('');
        const done = qs ? [...qs.completedQuests].map(id => qs.quests.get(id)).filter(Boolean) : [];
        const totalStars = done.reduce((sum, q) => sum + (q.stars || 0), 0);
        const rows = done.map(q => `<li><span class="ach-stars" aria-label="${q.stars || 0} de 3 estrelas">${'★'.repeat(q.stars || 0)}${'☆'.repeat(3 - (q.stars || 0))}</span>${PlayerProfile.personalize(q.title)}</li>`).join('');
        document.getElementById('ach-count').textContent = `${list.filter(([id]) => earned.has(id)).length} de ${list.length}`;
        document.getElementById('ach-body').innerHTML = `
            <div class="ach-grid">${badges}</div>
            <h3 class="ach-title">⭐ Estrelas das missões <small>${totalStars} de ${done.length * 3}</small></h3>
            ${rows ? `<ul class="ach-missions">${rows}</ul>` : '<p class="nh-hint">Conclua missões para ganhar estrelas.</p>'}`;
    }
});
