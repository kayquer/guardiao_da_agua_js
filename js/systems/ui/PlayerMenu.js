/**
 * UIManager — menu do jogador (#player-menu, css/player-menu.css)
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * Clicar no nome (#player-chip) abre um menu: perfil e pausa, aulas e estudos (era o 📚 do topo), conquistas,
 * configurações, notificações, dados da pesquisa e salvar jogo. Os painéis são os mesmos da tela de pausa:
 * o item pausa o jogo e troca o painel do jogador pelo escolhido. Aulas e salvar não pausam.
 * Fecha ao escolher, ao clicar fora e no Esc (GameManager chama closePlayerMenu antes de pensar em pausar).
 */
mixin(UIManager, {
    setupPlayerMenu() {
        const chip = document.getElementById('player-chip');
        const menu = document.getElementById('player-menu');
        if (!chip || !menu || chip.dataset.menuWired) return;
        chip.dataset.menuWired = '1';
        const toggle = event => {
            event.stopPropagation();
            if (menu.hidden) this.openPlayerMenu();
            else this.closePlayerMenu();
        };
        chip.addEventListener('click', toggle);
        chip.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(event); }
        });
        menu.addEventListener('click', event => {
            const item = event.target.closest('[data-player-action]');
            if (!item) return;
            event.stopPropagation();
            this.closePlayerMenu();
            this.runPlayerMenuAction(item.dataset.playerAction);
        });
        document.addEventListener('pointerdown', event => {
            if (!menu.hidden && !event.target.closest('.player-hud')) this.closePlayerMenu();
        });
    },

    /** Só com o jogo rodando (no tutorial inicial o nome não faz nada, como antes). */
    openPlayerMenu() {
        const menu = document.getElementById('player-menu');
        if (!menu || this.gameManager.gameState !== 'playing') return;
        this.closeSpeedMenu?.();
        menu.hidden = false;
        document.body.classList.add('top-menu-open');
        document.getElementById('player-chip')?.setAttribute('aria-expanded', 'true');
        menu.querySelector('[data-player-action]')?.focus({ preventScroll: true });
        AudioManager.playSound('sfx_click');
    },

    /** Fecha o menu do jogador; devolve true se ele estava aberto (o Esc para por aqui). */
    closePlayerMenu({ focus = false } = {}) {
        const menu = document.getElementById('player-menu');
        if (!menu || menu.hidden) return false;
        menu.hidden = true;
        document.body.classList.remove('top-menu-open');
        const chip = document.getElementById('player-chip');
        chip?.setAttribute('aria-expanded', 'false');
        if (focus) chip?.focus({ preventScroll: true });
        return true;
    },

    runPlayerMenuAction(action) {
        const gm = this.gameManager;
        if (gm.gameState !== 'playing') return;
        if (action === 'lessons') {
            if (!gm.tutorialSystem?.isActive) this.openLessonsHub();
            return;
        }
        if (action === 'save') {
            const ok = gm.saveGame();
            AudioManager.playSound(ok ? 'sfx_success' : 'sfx_build_error');
            this.showNotification(ok ? '💾 Jogo salvo!' : '⚠️ Não deu para salvar agora.', ok ? 'success' : 'warning', 2500);
            return;
        }
        // O resto mora na tela de pausa: pausa (abre o painel do jogador) e troca pelo painel escolhido
        gm.pauseGame();
        if (gm.gameState !== 'paused') return;
        AudioManager.playSound('sfx_panel_open');
        const open = {
            achievements: () => this.openAchievementsPanel(),
            settings: () => this.openSettingsPanel(),
            notifications: () => this.openNotificationHistory(),
            research: () => this.openResearchPanel()
        }[action];
        open?.();
    },
});
