/**
 * UIManager — "⚙️ Configurações" na tela de pausa: gráficos, tamanho do texto, clima (real ou simulado), dificuldade,
 * cores para daltonismo, tela cheia, teclas e som.
 * Mesmo esquema do histórico de notificações e dos dados da pesquisa: o painel troca de lugar com o do jogador e o
 * Esc volta para a pausa. Os seletores de gráficos/texto/clima são ligados em main.js ([data-*-picker]); o bloco de
 * som é criado por AudioManager.setupSoundPanel dentro de .settings-body; cores, tela cheia e teclas são criados aqui
 * (setupAccessibilitySettings). Pausa → Controles mostra as teclas atuais e o controle (renderControlsHelp).
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
        this.setupAccessibilitySettings();
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
        window.renderDifficultyPickers?.(); // dificuldade do perfil que está jogando
        this.renderColorModePicker();
        this.renderFullscreenButton();
        this.renderKeyBindings();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_open');
        document.getElementById('btn-settings-back')?.focus();
    },

    closeSettingsPanel({ focus = true } = {}) {
        const panel = document.getElementById('settings-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel || panel.hidden) return;
        this.stopKeyCapture();
        panel.hidden = true;
        if (playerPanel) playerPanel.hidden = false;
        if (focus) document.getElementById('btn-settings')?.focus();
    },

    // ===== ACESSIBILIDADE: cores, tela cheia e teclas =====

    /** Cria os blocos "Cores", "Tela cheia" e "Teclas" no fim de .settings-body (uma vez). */
    setupAccessibilitySettings() {
        const body = document.querySelector('#settings-panel .settings-body');
        if (!body || document.getElementById('pause-color')) return;

        const color = document.createElement('div');
        color.id = 'pause-color';
        color.className = 'gfx-picker gfx-picker--panel color-picker';
        color.innerHTML = `
            <span class="gfx-title" id="pause-color-title">🎨 Cores</span>
            <div class="gfx-seg" role="radiogroup" aria-labelledby="pause-color-title">
                ${ColorMode.MODES.map(mode => `<button type="button" role="radio" data-color-mode="${mode}">${{ normal: 'Normal', deutan: 'Verde e vermelho', tritan: 'Azul e amarelo' }[mode]}</button>`).join('')}
            </div>
            <p class="gfx-hint color-hint" aria-live="polite"></p>`;
        color.addEventListener('click', event => {
            const button = event.target.closest('[data-color-mode]');
            if (!button || button.dataset.colorMode === ColorMode.current()) return;
            ColorMode.set(button.dataset.colorMode);
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click', 0.6);
        });

        const screen = document.createElement('div');
        screen.id = 'pause-fullscreen';
        screen.className = 'gfx-picker gfx-picker--panel fullscreen-picker';
        screen.innerHTML = `
            <span class="gfx-title">🖥️ Tela</span>
            <button type="button" id="btn-fullscreen" class="overlay-btn secondary fullscreen-btn" aria-pressed="false">Tela cheia</button>
            <p class="gfx-hint fullscreen-hint" aria-live="polite"></p>`;
        screen.querySelector('#btn-fullscreen').addEventListener('click', () => this.toggleFullscreen());
        document.addEventListener('fullscreenchange', () => this.renderFullscreenButton());

        const keys = document.createElement('section');
        keys.id = 'pause-keys';
        keys.className = 'gfx-picker gfx-picker--panel keys-picker';
        keys.setAttribute('aria-labelledby', 'pause-keys-title');
        keys.innerHTML = `
            <span class="gfx-title" id="pause-keys-title">⌨️ Teclas</span>
            <button type="button" id="btn-keys-reset" class="overlay-btn secondary keys-reset">Restaurar padrão</button>
            <p class="gfx-hint keys-hint">Clique numa tecla e aperte a nova. Esc cancela; Apagar deixa vazio.</p>
            <ul class="keys-list" id="keys-list"></ul>
            <p class="keys-status" id="keys-status" role="status" aria-live="polite"></p>`;
        keys.querySelector('#btn-keys-reset').addEventListener('click', () => {
            this.stopKeyCapture();
            InputBindings.reset();
            this.renderKeyBindings();
            this.setKeyStatus('Teclas de volta ao padrão.', 'ok');
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click', 0.6);
        });
        keys.addEventListener('click', event => {
            const button = event.target.closest('.key-btn');
            if (!button || button.disabled) return;
            if (this.keyCapture?.button === button) this.stopKeyCapture();
            else this.startKeyCapture(button.dataset.action, Number(button.dataset.slot), button);
        });

        body.append(color, screen, keys);

        // A tecla nova chega aqui antes de qualquer atalho do jogo (captura na janela)
        window.addEventListener('keydown', event => this.handleKeyCapture(event), true);
        ColorMode.onChange(() => this.renderColorModePicker());
        InputBindings.onChange(() => this.renderKeyBindings());
        this.renderColorModePicker();
        this.renderFullscreenButton();
        this.renderKeyBindings();
    },

    renderColorModePicker() {
        const picker = document.getElementById('pause-color');
        if (!picker) return;
        const mode = ColorMode.current();
        picker.querySelectorAll('[data-color-mode]').forEach(button => {
            const on = button.dataset.colorMode === mode;
            button.classList.toggle('active', on);
            button.setAttribute('aria-checked', String(on));
        });
        const hint = picker.querySelector('.color-hint');
        if (hint) hint.textContent = `${ColorMode.LABELS[mode]}: ${ColorMode.HINTS[mode]}`;
    },

    isFullscreen() {
        return !!(document.fullscreenElement || document.webkitFullscreenElement);
    },

    /** Tela cheia pela Fullscreen API; se o navegador negar, só avisa no texto (F11 continua valendo). */
    toggleFullscreen() {
        const root = document.documentElement;
        const hint = document.querySelector('#pause-fullscreen .fullscreen-hint');
        const denied = () => {
            if (hint) hint.textContent = 'O navegador não deixou abrir em tela cheia. Tente a tecla F11.';
        };
        try {
            const request = this.isFullscreen()
                ? (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
                : (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root);
            if (!request) {
                if (!this.isFullscreen() && !root.requestFullscreen && !root.webkitRequestFullscreen) denied();
                return;
            }
            Promise.resolve(request).then(() => this.renderFullscreenButton()).catch(error => {
                logWarn('⚠️ Tela cheia negada:', error?.message || error);
                denied();
            });
        } catch (error) {
            logWarn('⚠️ Tela cheia negada:', error?.message || error);
            denied();
        }
    },

    renderFullscreenButton() {
        const button = document.getElementById('btn-fullscreen');
        if (!button) return;
        const on = this.isFullscreen();
        button.textContent = on ? 'Sair da tela cheia' : 'Tela cheia';
        button.setAttribute('aria-pressed', String(on));
        const hint = document.querySelector('#pause-fullscreen .fullscreen-hint');
        if (hint) hint.textContent = on ? 'O jogo ocupa a tela toda. Esc ou F11 também saem.' : 'Use a tela toda para jogar (ou a tecla F11).';
    },

    /** Lista de ações com as duas teclas de cada uma (InputBindings). */
    renderKeyBindings() {
        const list = document.getElementById('keys-list');
        if (!list) return;
        const map = InputBindings.current();
        const capture = this.keyCapture;
        let group = null;
        list.innerHTML = InputBindings.ACTIONS.map(action => {
            const header = action.group !== group ? `<li class="keys-group">${action.group}</li>` : '';
            group = action.group;
            const slots = [0, 1].map(slot => {
                const code = map[action.id][slot];
                const locked = action.locked && slot === 0;
                const waiting = capture && capture.action === action.id && capture.slot === slot;
                const name = waiting ? 'Aperte…' : InputBindings.label(code);
                const aria = `${action.label}, tecla ${slot === 0 ? 'principal' : 'alternativa'}: ${code ? InputBindings.label(code) : 'nenhuma'}${locked ? ' (fixa)' : ''}`;
                return `<button type="button" class="key-btn${waiting ? ' waiting' : ''}${code ? '' : ' empty'}" data-action="${action.id}" data-slot="${slot}"
                    ${locked ? 'disabled' : ''} aria-label="${aria}" aria-pressed="${waiting ? 'true' : 'false'}"><kbd>${name}</kbd></button>`;
            }).join('');
            return `${header}<li class="keys-row"><span class="keys-action">${action.label}</span><span class="keys-slots">${slots}</span></li>`;
        }).join('');
        if (capture) {
            const button = list.querySelector(`.key-btn[data-action="${capture.action}"][data-slot="${capture.slot}"]`);
            if (button) {
                capture.button = button;
                button.focus({ preventScroll: true });
            }
        }
    },

    setKeyStatus(text, kind = 'ok') {
        const status = document.getElementById('keys-status');
        if (!status) return;
        status.textContent = text;
        status.dataset.kind = kind;
    },

    startKeyCapture(action, slot, button) {
        this.keyCapture = { action, slot, button };
        const label = InputBindings.action(action)?.label || '';
        this.setKeyStatus(`Aperte a nova tecla para "${label}". Esc cancela.`, 'wait');
        this.renderKeyBindings();
    },

    stopKeyCapture() {
        if (!this.keyCapture) return;
        this.keyCapture = null;
        this.renderKeyBindings();
    },

    /** Captura (keydown na janela, fase de captura): enquanto espera a tecla nova, nenhum atalho do jogo roda. */
    handleKeyCapture(event) {
        const capture = this.keyCapture;
        if (!capture) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat) return;
        const action = InputBindings.action(capture.action);
        if (event.code === 'Escape') {
            this.keyCapture = null;
            this.renderKeyBindings();
            this.setKeyStatus('Troca cancelada.', 'ok');
            return;
        }
        const code = event.code === 'Backspace' || event.code === 'Delete' ? null : event.code;
        const result = InputBindings.set(capture.action, capture.slot, code);
        if (!result.ok) {
            this.setKeyStatus(result.reason, 'bad'); // continua esperando outra tecla
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_error', 0.5);
            return;
        }
        this.keyCapture = null;
        this.renderKeyBindings();
        if (code === null) {
            this.setKeyStatus(`"${action.label}" ficou sem a tecla ${capture.slot === 0 ? 'principal' : 'alternativa'}.`, 'ok');
        } else if (result.conflict) {
            const other = InputBindings.action(result.conflict.action);
            this.setKeyStatus(`${InputBindings.label(code)} agora é "${action.label}". Ela era de "${other.label}", que ficou sem essa tecla.`, 'warn');
        } else {
            this.setKeyStatus(`${InputBindings.label(code)} agora é "${action.label}".`, 'ok');
        }
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click', 0.6);
    },

    // ===== Pausa → Controles: teclas atuais e controle =====

    /** Reescreve a aba do computador do #controls-modal com as teclas de agora (InputBindings) e o mapa do controle. */
    renderControlsHelp() {
        const group = document.getElementById('controls-desktop');
        if (!group || typeof InputBindings === 'undefined') return;
        const kbd = id => {
            const keys = InputBindings.keysFor(id);
            return keys.length ? keys.map(code => `<kbd>${InputBindings.label(code)}</kbd>`).join(' ') : '<em>sem tecla</em>';
        };
        // As quatro direções juntas, primeiro as principais (W A S D) e depois as alternativas (setas)
        const moveKeys = slot => ['camForward', 'camLeft', 'camBack', 'camRight']
            .map(id => InputBindings.current()[id][slot]).filter(Boolean).map(code => `<kbd>${InputBindings.label(code)}</kbd>`).join(' ');
        const icon = name => `<img class="ui-icon ui-icon--lg" src="assets/icons/svg/${name}.svg" alt="" aria-hidden="true" draggable="false">`;
        group.innerHTML = `
            <p class="controls-intro">Os atalhos de teclado funcionam em qualquer lugar da tela, menos enquanto você digita num campo. Para trocar as teclas: Pausa → Configurações → Teclas.</p>
            <div class="controls-section">
                <h3>🖱️ Câmera</h3>
                <ul>
                    <li><strong>Mover:</strong> clique esquerdo + arrastar, ou ${[moveKeys(0), moveKeys(1)].filter(Boolean).join(' ou ') || '<em>sem tecla</em>'}</li>
                    <li><strong>Girar:</strong> botão direito (ou o do meio) + arrastar, ou ${kbd('rotateLeft')} / ${kbd('rotateRight')}</li>
                    <li><strong>Aproximar e afastar:</strong> roda do mouse</li>
                    <li><strong>Voltar à posição inicial:</strong> ${kbd('camReset')}</li>
                    <li><strong>Apontar para o norte:</strong> clique na bússola (clique de novo para o sul)</li>
                </ul>
            </div>
            <div class="controls-section">
                <h3>${icon('ui-build')} Construção</h3>
                <ul>
                    <li><strong>Escolher:</strong> clique numa categoria, depois num prédio e em <em>Construir</em> (ou dois cliques no prédio)</li>
                    <li><strong>Construir:</strong> clique esquerdo no lugar marcado como livre no mapa</li>
                    <li><strong>Construir vários iguais:</strong> segure <kbd>Shift</kbd> ao clicar</li>
                    <li><strong>Ruas:</strong> clique e arraste para desenhar uma linha reta</li>
                    <li><strong>Cancelar:</strong> ${kbd('cancel')}, botão direito ou o botão <em>Cancelar</em></li>
                </ul>
            </div>
            <div class="controls-section">
                <h3>${icon('status-info')} Prédios e painéis</h3>
                <ul>
                    <li><strong>Ver um prédio:</strong> clique nele (girar, consertar e reciclar ficam no painel)</li>
                    <li><strong>Ver um recurso:</strong> clique em água, dinheiro, energia… no topo da tela</li>
                    <li><strong>Fechar o painel:</strong> ${kbd('cancel')} ou o ✕</li>
                    <li><strong>Seu menu</strong> (perfil, aulas, conquistas, configurações, salvar): clique no seu nome</li>
                </ul>
            </div>
            <div class="controls-section">
                <h3>${icon('ui-clock')} Tempo</h3>
                <ul>
                    <li><strong>Pausar e continuar:</strong> ${kbd('pause')}, ou <kbd>Esc</kbd> sem nada aberto</li>
                    <li><strong>Velocidade:</strong> ${kbd('speedHalf')} (0,5x), ${kbd('speed1')} (1x), ${kbd('speed2')} (2x), ${kbd('speed3')} (3x) ou o botão de velocidade no topo</li>
                </ul>
            </div>
            <div class="controls-section" id="controls-gamepad">
                <h3>🎮 Controle (Xbox, PlayStation e parecidos)</h3>
                <ul>
                    <li><strong>Mover a câmera:</strong> analógico esquerdo</li>
                    <li><strong>Girar e aproximar:</strong> analógico direito (para os lados gira, para cima e para baixo aproxima e afasta); <kbd>RT</kbd> aproxima, <kbd>LT</kbd> afasta</li>
                    <li><strong>Pausar e continuar:</strong> <kbd>Start</kbd></li>
                    <li><strong>Velocidade:</strong> <kbd>LB</kbd> mais devagar, <kbd>RB</kbd> mais rápido</li>
                    <li><strong>Cancelar e fechar:</strong> <kbd>B</kbd> (o mesmo que Esc)</li>
                    <li><strong>Botões da tela:</strong> direcional ↑ ↓ troca o botão em foco, <kbd>A</kbd> aperta</li>
                    <li><strong>Voltar a câmera ao início:</strong> <kbd>Y</kbd></li>
                </ul>
            </div>`;
    }
});
