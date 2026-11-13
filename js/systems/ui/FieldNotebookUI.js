/**
 * UIManager — Caderno de Campo da Márcia (11/2026): a caça aos bichos que mostram como está a água.
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * PropSystem.refresh → onPropsPlanned(placements) → FieldNotebook.observe:
 *   - bicho que aparece no mapa e ainda NÃO está no caderno: a Márcia avisa que tem algo diferente (onde procurar),
 *     sem dizer o que é — a página fica apagada, com "?", até o jogador tocar nele;
 *   - bicho do caderno que tinha sumido e volta: o grande momento (câmera vai até ele se o jogador está à toa);
 *   - bicho do caderno que some: aviso do Paulo.
 * Tocar num bicho no mapa (GameManager → showSpeciesAtScreen, que usa PropSystem.pickSpeciesAt: malha ou o mais perto
 * na tela) seleciona o bicho (anel e seta que o seguem), registra no caderno e abre a ficha (#species-card: nome,
 * nome científico, situação no Livro Vermelho, tamanho, onde vive, o que a Márcia anotou e como ajudar).
 * Pausa → "📓 Caderno de campo" (#notebook-panel, css/notebook.css): páginas acesas e apagadas; tocar numa acesa abre
 * a ficha.
 */
mixin(UIManager, {
    setupNotebookPanel() {
        document.getElementById('btn-notebook')?.addEventListener('click', () => this.openNotebookPanel());
        document.getElementById('btn-notebook-back')?.addEventListener('click', () => this.closeNotebookPanel());
        document.getElementById('notebook-list')?.addEventListener('click', event => {
            const item = event.target.closest('[data-species]');
            if (item && this.gameManager.fieldNotebook?.isRegistered(item.dataset.species)) this.openSpeciesCard(item.dataset.species);
        });
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            if (this.isSpeciesCardOpen()) {
                event.preventDefault();
                event.stopPropagation();
                this.closeSpeciesCard();
            } else if (this.isNotebookPanelOpen()) {
                event.preventDefault();
                this.closeNotebookPanel();
            }
        }, true);
    },

    /** Chamado pelo PropSystem a cada replanejamento, com o plano inteiro. */
    onPropsPlanned(placements) {
        const gm = this.gameManager;
        const notebook = gm.fieldNotebook;
        if (!notebook || gm.gameState !== 'playing' || !gm.tutorialDone) return;
        const { found, gone } = notebook.observe(placements, gm.gameTime || 0);
        const moments = found.filter(f => f.notify && (f.first || f.returned));
        // Um momento grande por vez; os outros do mesmo instante entram só no histórico
        moments.forEach((f, i) => {
            const known = notebook.isRegistered(f.id);
            if (!known) return i === 0 ? this.hintNewSpecies(f) : null;
            return i === 0 ? this.celebrateFieldReturn(f) : this.recordFieldReturn(f);
        });
        gone.filter(g => g.notify && notebook.isRegistered(g.id)).forEach(g => this.warnFieldLoss(g.id));
        if (this.isNotebookPanelOpen()) this.renderNotebookPanel();
    },

    /** Bicho que o jogador ainda não registrou chegou: a Márcia dá a pista, sem contar quem é. */
    hintNewSpecies({ id, cell }) {
        const e = FieldNotebook.entry(id);
        this.showNotification(`Márcia: tem um bicho diferente ${e.look}! Toque nele no mapa para anotar no caderno.`, 'info', 9000, {
            icon: 'status-info',
            className: 'toast--notebook',
            actions: [{ label: 'Ver onde', onClick: () => this.lookAtNotebookCell(cell) }]
        });
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_notification', 0.5);
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('notebook', { target: id, value: 'sighted' });
    },

    fieldText(id) {
        const e = FieldNotebook.entry(id);
        return `Márcia: ${e.name} voltou, ${e.look}! É o rio dizendo que a água melhorou.`;
    },

    /** Figura da espécie (render do próprio modelo, assets/images/fauna/<id>.webp) — sem emoji. */
    speciesImage(id, cls = 'nb-img') {
        return `<img class="${cls}" src="assets/images/fauna/${id}.webp" alt="" aria-hidden="true" draggable="false">`;
    },

    celebrateFieldReturn({ id, cell }) {
        const gm = this.gameManager;
        // Câmera só se o jogador não estiver no meio de algo (construindo, painel aberto, lendo)
        if (gm.isIdleForEscPause?.() && !this.isMessageSlotBusy?.()) this.lookAtNotebookCell(cell);
        this.showNotification(this.fieldText(id), 'success', 9000, {
            className: 'toast--notebook',
            actions: [
                { label: 'Ver onde', onClick: () => this.lookAtNotebookCell(cell) },
                { label: 'Ficha', onClick: () => this.openSpeciesCard(id) }
            ]
        });
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('sfx_discovery', 0.8); // som de descoberta (arpejo de sino)
            setTimeout(() => AudioManager.onSpeaker?.('marcia', 'happy'), 600);
        }
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('notebook', { target: id, value: 'returned' });
    },

    recordFieldReturn({ id }) {
        this.showNotification(this.fieldText(id), 'success', 0, { quiet: true });
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('notebook', { target: id, value: 'returned' });
    },

    warnFieldLoss(id) {
        const e = FieldNotebook.entry(id);
        if (!e) return;
        this.showNotification(`Secretário Paulo: ${e.name} sumiu ${e.look}. Bicho sumindo é sinal de que a água piorou.`, 'warning', 7000, { icon: 'status-warning' });
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('notebook', { target: id, value: 'gone' });
    },

    lookAtNotebookCell(cell) {
        const gm = this.gameManager;
        if (!cell || !gm.gridManager) return;
        const world = gm.gridManager.gridToWorld(cell.x, cell.z);
        gm.cameraControls?.centerCameraOn?.(world.x, world.z, 18);
    },

    /**
     * Toque/clique no mapa (x, y em px do canvas): tem bicho do caderno ali (malha ou perto na tela)? Seleciona,
     * registra e abre a ficha; devolve true. `exact` = só se acertou a malha (antes de testar os prédios).
     */
    showSpeciesAtScreen(x, y, { exact = false, touch = false } = {}) {
        const gm = this.gameManager;
        if (gm.gameState !== 'playing' || gm.buildingSystem?.selectedBuildingType) return false;
        const hit = gm.propSystem?.pickSpeciesAt(x, y, { exact, touch });
        if (!hit) return false;
        gm.deselectBuilding?.();
        gm.propSystem.selectSpecies(hit.key);
        const isNew = gm.fieldNotebook?.register(hit.id, gm.gameTime || 0) || false;
        // com um alerta central aberto, a ficha espera ele fechar (antes abria por cima dele)
        if (document.querySelector('.central-alert-overlay')?.getClientRects().length) this.pendingSpeciesCard = { id: hit.id, isNew };
        else this.openSpeciesCard(hit.id, { isNew });
        if (typeof AudioManager !== 'undefined') {
            if (isNew) {
                AudioManager.playSound('sfx_discovery', 0.8); // som de descoberta (arpejo de sino)
                setTimeout(() => AudioManager.onSpeaker?.('marcia', 'happy'), 500);
            } else AudioManager.playSound('sfx_click', 0.5);
        }
        if (isNew && typeof ResearchLog !== 'undefined') ResearchLog.record('notebook', { target: hit.id, value: 'registered' });
        return true;
    },

    /** Chamado pelo UIManager.update: abre a ficha que esperava o alerta central fechar. */
    flushSpeciesCard() {
        if (!this.pendingSpeciesCard || document.querySelector('.central-alert-overlay')?.getClientRects().length) return;
        const { id, isNew } = this.pendingSpeciesCard;
        this.pendingSpeciesCard = null;
        this.openSpeciesCard(id, { isNew });
    },

    // ===== Ficha da espécie (#species-card, popup que pausa) =====
    ensureSpeciesCard() {
        let card = document.getElementById('species-card');
        if (card) return card;
        card = document.createElement('div');
        card.id = 'species-card';
        card.className = 'species-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.setAttribute('aria-labelledby', 'species-card-name');
        card.hidden = true;
        card.innerHTML = `<div class="sc-box">
            <div class="sc-new" id="species-card-new" hidden>Nova espécie no caderno!</div>
            <div class="sc-head">
                <span class="sc-icon" id="species-card-icon" aria-hidden="true"></span>
                <div class="sc-title">
                    <h2 id="species-card-name"></h2>
                    <i id="species-card-sci"></i>
                </div>
                <span class="sc-status" id="species-card-status"></span>
            </div>
            <dl class="sc-facts" id="species-card-facts"></dl>
            <div class="sc-note"><b>Márcia anotou:</b> <span id="species-card-note"></span></div>
            <div class="sc-help"><b>Como ajudar:</b> <span id="species-card-help"></span></div>
            <small class="sc-source" id="species-card-source"></small>
            <div class="sc-buttons">
                <button type="button" class="overlay-btn" id="species-card-notebook">Ver caderno</button>
                <button type="button" class="overlay-btn primary" id="species-card-close">Fechar</button>
            </div>
        </div>`;
        (document.getElementById('game-screen') || document.body).appendChild(card);
        card.querySelector('#species-card-close').addEventListener('click', () => this.closeSpeciesCard());
        card.querySelector('#species-card-notebook').addEventListener('click', () => {
            const id = this.speciesCardId;
            this.closeSpeciesCard({ keepSelection: false });
            this.openNotebookFromToast(id);
        });
        card.addEventListener('click', event => { if (event.target === card) this.closeSpeciesCard(); });
        return card;
    },

    openSpeciesCard(id, { isNew = false } = {}) {
        const e = FieldNotebook.entry(id);
        if (!e) return;
        const card = this.ensureSpeciesCard();
        const status = (typeof FIELD_NOTEBOOK_STATUS !== 'undefined' && FIELD_NOTEBOOK_STATUS[e.status]) || { label: e.status, short: '' };
        const range = FieldNotebook.range(id);
        const here = this.gameManager.fieldNotebook?.isPresent(id);
        const set = (sel, text) => { card.querySelector(sel).textContent = text; };
        this.speciesCardId = id;
        card.querySelector('#species-card-new').hidden = !isNew;
        card.querySelector('#species-card-icon').innerHTML = this.speciesImage(id, 'sc-img');
        set('#species-card-name', e.name);
        set('#species-card-sci', e.sci);
        const pill = card.querySelector('#species-card-status');
        pill.textContent = status.label;
        pill.className = `sc-status sc-status--${e.status}`;
        const facts = [
            ['Tamanho', e.size],
            ['Onde vive', e.habitat],
            ['No mapa', here ? `agora, ${e.look}` : `sumiu (${e.look})`],
            range ? ['Aparece com', `poluição abaixo de ${range.gone}; fica à vontade abaixo de ${range.full}`] : null
        ].filter(Boolean);
        card.querySelector('#species-card-facts').innerHTML = facts.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('');
        set('#species-card-note', e.note);
        set('#species-card-help', e.help);
        // a fonte segue a situação (antes seguia o kit do modelo, e o tamanduá "Vulnerável" aparecia como "fora da lista")
        set('#species-card-source', FieldNotebook.isThreatened(id)
            ? 'Situação: Livro Vermelho da Fauna Brasileira Ameaçada de Extinção (ICMBio, 2018).'
            : 'Espécie comum no Brasil, fora da lista de ameaçadas.');
        card.hidden = false;
        card.querySelector('#species-card-close').focus();
    },

    isSpeciesCardOpen() {
        const card = document.getElementById('species-card');
        return !!card && !card.hidden;
    },

    closeSpeciesCard({ keepSelection = false } = {}) {
        const card = document.getElementById('species-card');
        if (!card || card.hidden) return;
        card.hidden = true;
        if (!keepSelection) this.gameManager.propSystem?.clearSelection();
        if (this.isNotebookPanelOpen()) this.renderNotebookPanel(this.speciesCardId);
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

    /** Botão do toast/ficha: pausa (o caderno fica na tela de pausa) e abre na página da espécie. */
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
            const known = status !== 'unknown';
            const nearby = !known && notebook.isPresent(id);
            const range = FieldNotebook.range(id);
            const clue = known
                ? (range ? `Aparece com a poluição abaixo de ${range.gone}.` : '')
                : `Procure ${e.look}${nearby ? ' — tem um por perto agora!' : '.'}`;
            return `<li class="nb-entry nb-${status}${nearby ? ' nb-nearby' : ''}${id === focusId ? ' nb-focus' : ''}" data-species="${id}"${known ? ' tabindex="0" role="button"' : ''}>
                <span class="nb-icon" aria-hidden="true">${known ? this.speciesImage(id) : `${this.speciesImage(id, 'nb-img nb-shadow')}<span class="nb-q">?</span>`}</span>
                <div class="nb-text">
                    <b>${known ? e.name : '???'}</b> <span class="nb-status">${labels[status]}</span>
                    ${known ? `<i class="nb-sci">${e.sci}</i><p>${e.note}</p>` : ''}
                    ${clue ? `<small class="nb-clue">${clue}</small>` : ''}
                </div>
            </li>`;
        }).join('');
        if (focusId) list.querySelector(`[data-species="${focusId}"]`)?.scrollIntoView({ block: 'nearest' });
    }
});
