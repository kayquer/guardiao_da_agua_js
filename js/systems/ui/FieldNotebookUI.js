/**
 * UIManager — Caderno de Campo da Márcia (11/2026): o momento "o sapo voltou!" e a página de cada espécie.
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * PropSystem.refresh → onPropsPlanned(placements) → FieldNotebook.observe: espécie que volta ou aparece pela
 * primeira vez vira um momento (câmera vai até ela se o jogador não está fazendo nada, fala da Márcia, toast com
 * "Ver onde" e "Caderno"); espécie que some vira aviso do Paulo. Clicar num bicho no mapa (GameManager.handleTerrainClick)
 * mostra a nota da Márcia. Pausa → "📓 Caderno de campo" (#notebook-panel, css/notebook.css): espécies vistas,
 * onde estão agora e as ainda não encontradas (com a faixa de poluição em que aparecem).
 */
mixin(UIManager, {
    setupNotebookPanel() {
        document.getElementById('btn-notebook')?.addEventListener('click', () => this.openNotebookPanel());
        document.getElementById('btn-notebook-back')?.addEventListener('click', () => this.closeNotebookPanel());
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isNotebookPanelOpen()) {
                event.preventDefault();
                this.closeNotebookPanel();
            }
        });
    },

    /** Chamado pelo PropSystem a cada replanejamento, com os props já desenhados. */
    onPropsPlanned(placements) {
        const gm = this.gameManager;
        const notebook = gm.fieldNotebook;
        if (!notebook || gm.gameState !== 'playing' || !gm.tutorialDone) return;
        const { found, gone } = notebook.observe(placements, gm.gameTime || 0);
        const moments = found.filter(f => f.notify && (f.first || f.returned));
        // Um momento grande por vez; os outros do mesmo instante entram só no histórico
        moments.forEach((f, i) => (i === 0 ? this.celebrateFieldDiscovery(f) : this.recordFieldDiscovery(f)));
        gone.filter(g => g.notify).forEach(g => this.warnFieldLoss(g.id));
        if (this.isNotebookPanelOpen()) this.renderNotebookPanel();
    },

    fieldText(id, returned) {
        const e = FieldNotebook.entry(id);
        return returned
            ? `${e.icon} Márcia: ${e.name} voltou, ${e.look}! É o rio dizendo que a água melhorou.`
            : `${e.icon} Márcia: anotei no caderno: ${e.name}, ${e.look}.`;
    },

    celebrateFieldDiscovery({ id, cell, returned }) {
        const gm = this.gameManager;
        // Câmera só se o jogador não estiver no meio de algo (construindo, painel aberto, lendo)
        if (gm.isIdleForEscPause?.() && !this.isMessageSlotBusy?.()) this.lookAtNotebookCell(cell);
        this.showNotification(this.fieldText(id, returned), 'success', 9000, {
            className: 'toast--notebook',
            actions: [
                { label: '🔎 Ver onde', onClick: () => this.lookAtNotebookCell(cell) },
                { label: '📓 Caderno', onClick: () => this.openNotebookFromToast(id) }
            ]
        });
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('sfx_achievement', 0.6);
            setTimeout(() => AudioManager.onSpeaker?.('marcia', 'happy'), 600);
        }
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('notebook', { target: id, value: returned ? 'returned' : 'first' });
    },

    recordFieldDiscovery({ id, returned }) {
        this.showNotification(this.fieldText(id, returned), 'success', 0, { quiet: true });
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('notebook', { target: id, value: returned ? 'returned' : 'first' });
    },

    warnFieldLoss(id) {
        const e = FieldNotebook.entry(id);
        if (!e) return;
        this.showNotification(`${e.icon} Secretário Paulo: ${e.name} sumiu ${e.look}. Bicho sumindo é sinal de que a água piorou.`, 'warning', 7000);
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('notebook', { target: id, value: 'gone' });
    },

    lookAtNotebookCell(cell) {
        const gm = this.gameManager;
        if (!cell || !gm.gridManager) return;
        const world = gm.gridManager.gridToWorld(cell.x, cell.z);
        gm.cameraControls?.centerCameraOn?.(world.x, world.z, 18);
    },

    /**
     * Clique no mapa (GameManager.handleTerrainClick): tem bicho do caderno nesta célula ou do lado?
     * Mostra a nota da Márcia e devolve true; senão false (segue o painel do terreno).
     */
    showSpeciesAt(x, z) {
        const placements = this.gameManager.propSystem?.placements || [];
        const hit = placements.find(p => FieldNotebook.entry(p.id) && Math.abs(p.x - x) <= 1 && Math.abs(p.z - z) <= 1);
        if (!hit) return false;
        const e = FieldNotebook.entry(hit.id);
        this.showNotification(`${e.icon} <b>${e.name}</b>: ${e.note}`, 'info', 10000, {
            className: 'toast--notebook',
            actions: [{ label: '📓 Caderno', onClick: () => this.openNotebookFromToast(hit.id) }]
        });
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click', 0.5);
        return true;
    },

    isNotebookPanelOpen() {
        const panel = document.getElementById('notebook-panel');
        return !!panel && !panel.hidden;
    },

    openNotebookPanel(focusId = null) {
        const panel = document.getElementById('notebook-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel) return;
        if (playerPanel) playerPanel.hidden = true;
        panel.hidden = false;
        this.renderNotebookPanel(focusId);
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_open');
        document.getElementById('btn-notebook-back')?.focus();
    },

    closeNotebookPanel({ focus = true } = {}) {
        const panel = document.getElementById('notebook-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel || panel.hidden) return;
        panel.hidden = true;
        if (playerPanel) playerPanel.hidden = false;
        if (focus) document.getElementById('btn-notebook')?.focus();
    },

    /** Botão do toast: pausa (o caderno fica na tela de pausa) e abre na página da espécie. */
    openNotebookFromToast(id) {
        const gm = this.gameManager;
        if (gm.gameState === 'playing') gm.pauseGame();
        if (gm.gameState !== 'paused') return;
        this.openNotebookPanel(id);
    },

    renderNotebookPanel(focusId = null) {
        const list = document.getElementById('notebook-list');
        const count = document.getElementById('notebook-count');
        const notebook = this.gameManager.fieldNotebook;
        if (!list || !notebook) return;
        const ids = FieldNotebook.ids();
        if (count) count.textContent = `${notebook.count()} de ${ids.length}`;
        const labels = { here: 'No mapa agora', gone: 'Sumiu: a água piorou', unknown: 'Ainda não encontrado' };
        list.innerHTML = ids.map(id => {
            const e = FieldNotebook.entry(id);
            const status = notebook.status(id);
            const range = FieldNotebook.range(id);
            const clue = range ? `Aparece com a poluição abaixo de ${range.gone}; todos voltam abaixo de ${range.full}.` : '';
            const known = status !== 'unknown';
            return `<li class="nb-entry nb-${status}${id === focusId ? ' nb-focus' : ''}" data-species="${id}">
                <span class="nb-icon" aria-hidden="true">${known ? e.icon : '❔'}</span>
                <div class="nb-text">
                    <b>${known ? e.name : '???'}</b> <span class="nb-status">${labels[status]}</span>
                    ${known ? `<p>${e.note}</p><small>Onde procurar: ${e.look}.</small>` : ''}
                    ${clue ? `<small class="nb-clue">${clue}</small>` : ''}
                </div>
            </li>`;
        }).join('');
        if (focusId) list.querySelector(`[data-species="${focusId}"]`)?.scrollIntoView({ block: 'nearest' });
    }
});
