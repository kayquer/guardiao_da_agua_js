/**
 * UIManager — painel "📂 Jogos salvos" da pausa (#saves-panel, css/saves.css), 11/2026.
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * Mostra todos os espaços do perfil (SaveSystem.SLOTS): o jogo atual, o ponto seguro, "alguns minutos antes"
 * (automáticos, core/game/SavePoints.js) e os 3 espaços manuais, com "Salvar aqui" (manuais), "Carregar" e
 * "Apagar" (manuais). Carregar troca a partida na hora (GameManager.restoreSavePoint), depois de confirmar.
 * Mesmo padrão de troca com o painel do jogador que a vitrine de conquistas.
 */
mixin(UIManager, {
    setupSavesPanel() {
        document.getElementById('btn-saves')?.addEventListener('click', () => this.openSavesPanel());
        document.getElementById('btn-saves-back')?.addEventListener('click', () => this.closeSavesPanel());
        document.getElementById('saves-list')?.addEventListener('click', event => this.onSavesPanelClick(event));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isSavesPanelOpen() && !document.querySelector('.swal2-container')) {
                event.preventDefault();
                this.closeSavesPanel();
            }
        });
    },

    isSavesPanelOpen() {
        const panel = document.getElementById('saves-panel');
        return !!panel && !panel.hidden;
    },

    openSavesPanel() {
        const panel = document.getElementById('saves-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel) return;
        if (playerPanel) playerPanel.hidden = true;
        panel.hidden = false;
        this.renderSavesPanel();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_open');
        document.getElementById('btn-saves-back')?.focus();
    },

    closeSavesPanel({ focus = true } = {}) {
        const panel = document.getElementById('saves-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel || panel.hidden) return;
        panel.hidden = true;
        if (playerPanel) playerPanel.hidden = false;
        if (focus) document.getElementById('btn-saves')?.focus();
    },

    /** Uma linha por espaço (vazio também, nos manuais), com os botões que valem para ele. */
    renderSavesPanel() {
        const list = document.getElementById('saves-list');
        const profile = typeof PlayerProfile !== 'undefined' ? PlayerProfile.getActive() : null;
        const saves = this.gameManager.saveSystem;
        if (!list || !profile || !saves) return;
        const fmtDate = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const hints = {
            main: 'Salvo sozinho a cada meio minuto e quando você sai.',
            safe: 'O último momento em que a cidade estava bem. Salvo sozinho.',
            rewind: 'A cidade de alguns minutos atrás. Salvo sozinho.'
        };
        list.innerHTML = SaveSystem.SLOTS.map(slot => {
            const info = saves.getSaveInfo(profile.id, slot);
            const manual = SaveSystem.MANUAL_SLOTS.includes(slot);
            if (!info && !manual) return '';
            const s = info?.ok ? info.summary : null;
            const detail = !info ? 'Vazio'
                : !info.ok ? SaveSystem.reasonText(info.reason)
                    : `${fmtDate(info.savedAt)} · ${s.buildingCount} ${s.buildingCount === 1 ? 'construção' : 'construções'} · ${s.population} habitantes${info.lost ? ' · terminou' : ''}`;
            const buttons = [
                manual ? `<button class="overlay-btn secondary save-act" data-act="save" data-slot="${slot}">💾 Salvar aqui</button>` : '',
                info?.ok && slot !== 'main' ? `<button class="overlay-btn secondary save-act" data-act="load" data-slot="${slot}">📂 Carregar</button>` : '',
                manual && info ? `<button class="overlay-btn secondary save-act save-act--danger" data-act="delete" data-slot="${slot}" aria-label="Apagar ${SaveSystem.slotLabel(slot)}">🗑️</button>` : ''
            ].join('');
            return `<li class="save-row${info ? '' : ' save-row--empty'}" data-slot="${slot}">
                <div class="save-row-text"><b>${SaveSystem.slotLabel(slot)}</b><small>${detail}</small>${hints[slot] ? `<small class="save-row-hint">${hints[slot]}</small>` : ''}</div>
                <div class="save-row-actions">${buttons}</div>
            </li>`;
        }).join('');
    },

    async onSavesPanelClick(event) {
        const button = event.target.closest('[data-act]');
        if (!button) return;
        const { act, slot } = button.dataset;
        const gm = this.gameManager;
        const profile = PlayerProfile.getActive();
        if (!profile) return;
        const label = SaveSystem.slotLabel(slot);
        if (act === 'save') {
            const used = gm.saveSystem.hasSave(profile.id, slot);
            if (used && !(await gameConfirm(`Salvar no ${label}?`, `O que estava no ${label} será trocado pela partida de agora.`,
                { confirmText: 'Salvar por cima', cancelText: 'Voltar', icon: 'warning' }))) return;
            gm.saveToSlot(slot);
        } else if (act === 'load') {
            const ok = await gameConfirm(`Carregar "${label}"?`,
                'A partida de agora é trocada por essa. Se quiser guardar a de agora, salve antes num espaço livre.',
                { confirmText: 'Carregar', cancelText: 'Voltar', icon: 'question' });
            if (!ok) return;
            this.closeSavesPanel({ focus: false });
            gm.resumeGame?.();
            gm.restoreSavePoint(slot);
            return;
        } else if (act === 'delete') {
            if (!(await gameConfirm(`Apagar o ${label}?`, 'Não dá para desfazer.', { confirmText: 'Apagar', cancelText: 'Voltar', icon: 'warning' }))) return;
            gm.saveSystem.deleteSave(profile.id, slot);
        }
        this.renderSavesPanel();
    }
});
