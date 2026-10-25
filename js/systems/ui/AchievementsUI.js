/**
 * UIManager — "🏅 Conquistas" na tela de pausa: a vitrine do jogador (conquistas ganhas e as que faltam) e as
 * estrelas de cada missão concluída. Mesmo esquema do painel de pesquisa: troca de lugar com o painel do jogador
 * e o Esc volta para a pausa.
 * Também os avisos de conquista (toast com selo, nível e botão "Ver conquistas", que pausa e abre a vitrine) e as
 * trilhas por níveis (js/data/achievementTracks.js, regra em js/systems/AchievementTracks.js).
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

    /** Toast de conquista nova (QuestSystem.announceAchievement). info = QuestSystem.achievementInfo(id). */
    showAchievementToast(info) {
        const level = info.level
            ? `<span class="toast-ach-level lvl-${info.level}">Nível ${info.level} de 5 · ${info.levelName}</span>` : '';
        return this.showNotification(
            `<b class="toast-ach-name">Conquista: ${info.name}</b>${level}<span class="toast-ach-desc">${info.description || ''}</span>`,
            'success', 10000, {
                icon: info.icon, iconSize: 'lg', className: `toast--achievement${info.level ? ` lvl-${info.level}` : ''}`,
                actions: [{ label: '🏅 Ver conquistas', onClick: () => this.openAchievementsFromToast() }]
            });
    },

    /** Jogo carregado com conquistas de nível que o save antigo não tinha: um aviso só. */
    showAchievementSummaryToast(count) {
        return this.showNotification(
            `<b>${count} conquista${count > 1 ? 's' : ''} de nível guardada${count > 1 ? 's' : ''}!</b> A cidade já tinha chegado lá.`,
            'success', 9000, { icon: 'ui-medal', actions: [{ label: '🏅 Ver conquistas', onClick: () => this.openAchievementsFromToast() }] });
    },

    /** Botão do toast: pausa (a vitrine fica na tela de pausa) e abre as conquistas. Durante tutorial, nada. */
    openAchievementsFromToast() {
        const gm = this.gameManager;
        if (gm.gameState === 'playing') gm.pauseGame();
        if (gm.gameState !== 'paused') return;
        this.openAchievementsPanel();
    },

    /** Trilhas por níveis: selo do nível atual, 5 bolinhas, meta seguinte e barra de progresso (valor de agora). */
    renderAchievementTracks(earned) {
        if (typeof ACHIEVEMENT_TRACKS === 'undefined') return '';
        const gm = this.gameManager;
        const metrics = QuestSystem.measureAchievementMetrics(gm.buildingSystem?.getAllBuildings?.() || [], gm.resourceManager?.resources);
        const fmt = n => Math.floor(n).toLocaleString('pt-BR');
        return Object.entries(ACHIEVEMENT_TRACKS).map(([id, track]) => {
            const level = track.levels.filter((_, i) => earned.has(`track_${id}_${i + 1}`)).length;
            const current = track.levels[level - 1];
            const next = track.levels[level];
            const value = metrics[track.metric] || 0;
            const pips = track.levels.map((l, i) => `<i class="${i < level ? 'on' : ''}" title="${l.name}"></i>`).join('');
            const money = track.money ? 'R$ ' : '';
            const goal = next
                ? `<span class="ach-next">Próximo: <b>${next.name}</b>. ${QuestSystem.trackDescription(track, next.goal)}</span>
                   <span class="ach-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${next.goal}" aria-valuenow="${Math.min(value, next.goal)}"><i style="width:${Math.min(100, (value / next.goal) * 100).toFixed(0)}%"></i></span>
                   <small>${money}${fmt(Math.min(value, next.goal))} / ${money}${fmt(next.goal)}${track.unit ? ` ${track.unit}` : ''}</small>`
                : '<span class="ach-next">Todos os níveis conquistados! 🏆</span>';
            return `<div class="ach-track lvl-${level}">
                <span class="ach-icon">${uiIcon(track.icon, 'lg')}</span>
                <div class="ach-track-info">
                    <b>${current ? current.name : track.title}</b>
                    <span class="ach-track-level">${level ? `Nível ${level} · ${ACHIEVEMENT_LEVEL_NAMES[level - 1]}` : 'Ainda sem nível'}</span>
                    <span class="ach-pips" aria-label="${level} de 5 níveis">${pips}</span>
                    ${goal}
                </div>
            </div>`;
        }).join('');
    },

    renderAchievementsPanel() {
        const qs = this.gameManager.questSystem;
        const earned = qs?.achievements || new Set();
        const list = typeof ACHIEVEMENTS !== 'undefined' ? Object.entries(ACHIEVEMENTS) : [];
        const tracks = typeof ACHIEVEMENT_TRACKS !== 'undefined' ? Object.keys(ACHIEVEMENT_TRACKS) : [];
        const trackEarned = [...earned].filter(id => /^track_/.test(id)).length;
        const badges = list.map(([id, a]) => {
            const got = earned.has(id);
            return `<div class="ach-badge ${got ? 'earned' : 'locked'}" title="${a.description}">
                <span class="ach-icon">${got ? uiIcon(a.icon, 'lg') : '🔒'}</span>
                <b>${a.name}</b><span>${a.description}</span></div>`;
        }).join('');
        const done = qs ? [...qs.completedQuests].map(id => qs.quests.get(id)).filter(Boolean) : [];
        const totalStars = done.reduce((sum, q) => sum + (q.stars || 0), 0);
        const rows = done.map(q => `<li><span class="ach-stars" aria-label="${q.stars || 0} de 3 estrelas">${'★'.repeat(q.stars || 0)}${'☆'.repeat(3 - (q.stars || 0))}</span>${PlayerProfile.personalize(q.title)}</li>`).join('');
        document.getElementById('ach-count').textContent = `${list.filter(([id]) => earned.has(id)).length + trackEarned} de ${list.length + tracks.length * 5}`;
        document.getElementById('ach-body').innerHTML = `
            <h3 class="ach-title">🏆 Conquistas especiais</h3>
            <div class="ach-grid">${badges}</div>
            <h3 class="ach-title">📶 Conquistas por níveis <small>${trackEarned} de ${tracks.length * 5} níveis</small></h3>
            <div class="ach-tracks">${this.renderAchievementTracks(earned)}</div>
            <h3 class="ach-title">⭐ Estrelas das missões <small>${totalStars} de ${done.length * 3}</small></h3>
            ${rows ? `<ul class="ach-missions">${rows}</ul>` : '<p class="nh-hint">Conclua missões para ganhar estrelas.</p>'}`;
    }
});
