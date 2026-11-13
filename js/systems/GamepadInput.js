/**
 * GamepadInput — controle de videogame pela Gamepad API (mapeamento "standard": Xbox/PlayStation/genéricos).
 * GameManager.startRenderLoop chama poll() a cada quadro, antes do limitador de FPS (a pausa roda a 5 FPS e um
 * toque rápido no Start se perderia). Sem controle conectado, poll() sai na primeira linha.
 *
 * Mapeamento (documentado em Pausa → Controles, UIManager.renderControlsHelp):
 *   analógico esquerdo = mover a câmera · analógico direito = girar (←→) e aproximar/afastar (↑↓)
 *   RT / LT = aproximar / afastar · Start = pausar e continuar · LB / RB = mais devagar / mais rápido
 *   B = cancelar e fechar (o mesmo que Esc) · A = apertar o botão em foco · direcional ↑↓ = trocar o botão em foco
 *   Y = voltar a câmera ao início
 * Sem DOM no cálculo: poll(now, pads) recebe os controles (tests/unit/input-bindings.test.js usa controles falsos).
 */
class GamepadInput {
    static DEADZONE = 0.2;
    static MOVE_SPEED = 20;     // unidades por segundo (o mesmo do teclado, SimCityCameraControls.config.keyboardMoveSpeed)
    static ROTATE_SPEED = 2;    // radianos por segundo (o mesmo de Q/E)
    static ZOOM_SPEED = 30;     // unidades de distância por segundo
    static SPEED_STEPS = [0.5, 1, 2, 3];
    static BUTTON = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

    constructor(gameManager) {
        this.gameManager = gameManager;
        this.pressed = new Map(); // índice do controle → botões apertados no quadro anterior
        this.lastTime = 0;
        this.connected = 0;
        this.announced = new Set();
    }

    /** Liga os eventos do navegador (fora dos testes). Um controle já conectado antes do jogo também conta. */
    attach() {
        if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.getGamepads) return;
        window.addEventListener('gamepadconnected', event => this.onConnected(event.gamepad));
        window.addEventListener('gamepaddisconnected', event => this.onDisconnected(event.gamepad));
        try {
            for (const pad of navigator.getGamepads() || []) if (pad) this.onConnected(pad, { quiet: true });
        } catch { /* navegador sem permissão para controles */ }
    }

    onConnected(pad, { quiet = false } = {}) {
        this.connected = this.countPads();
        if (!pad || this.announced.has(pad.index)) return;
        this.announced.add(pad.index);
        if (!quiet) {
            this.gameManager?.uiManager?.showNotification?.('🎮 Controle conectado. Os botões estão em Pausa → Controles.', 'info', 4000);
        }
        log(`🎮 Controle conectado: ${pad.id}`);
    }

    onDisconnected(pad) {
        if (pad) {
            this.announced.delete(pad.index);
            this.pressed.delete(pad.index);
        }
        this.connected = this.countPads();
    }

    countPads() {
        try {
            return Array.from(navigator.getGamepads?.() || []).filter(Boolean).length;
        } catch {
            return 0;
        }
    }

    /** Eixo com zona morta: pequeno tremor do analógico = 0; o resto vai de 0 a 1 sem salto. */
    static axis(value) {
        const v = Number(value) || 0;
        const abs = Math.abs(v);
        if (abs < GamepadInput.DEADZONE) return 0;
        return Math.sign(v) * Math.min(1, (abs - GamepadInput.DEADZONE) / (1 - GamepadInput.DEADZONE));
    }

    static buttonValue(pad, index) {
        const b = pad?.buttons?.[index];
        if (!b) return 0;
        return typeof b === 'object' ? (b.value || (b.pressed ? 1 : 0)) : Number(b) || 0;
    }

    static isDown(pad, index) {
        const b = pad?.buttons?.[index];
        if (!b) return false;
        return typeof b === 'object' ? !!b.pressed || (b.value || 0) > 0.5 : Number(b) > 0.5;
    }

    /** Próxima velocidade em SPEED_STEPS (dir = +1 mais rápido, -1 mais devagar), sem dar a volta. */
    static nextSpeed(current, dir) {
        const steps = GamepadInput.SPEED_STEPS;
        let i = steps.indexOf(current);
        if (i < 0) i = steps.indexOf(1);
        return steps[Math.max(0, Math.min(steps.length - 1, i + dir))];
    }

    /**
     * Um quadro: câmera pelos analógicos e gatilhos, ações na borda do aperto (apertou agora, não estava antes).
     * `pads` vem de navigator.getGamepads() no jogo e de controles falsos nos testes.
     */
    poll(now, pads) {
        if (pads === undefined) {
            if (!this.connected) return;
            try {
                pads = navigator.getGamepads?.() || [];
            } catch {
                return;
            }
        }
        const dt = this.lastTime ? Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000)) : 0;
        this.lastTime = now;
        for (const pad of Array.from(pads || [])) {
            if (!pad || pad.connected === false) continue;
            this.moveCamera(pad, dt);
            const before = this.pressed.get(pad.index) || new Set();
            const down = new Set();
            for (let i = 0; i < (pad.buttons?.length || 0); i++) if (GamepadInput.isDown(pad, i)) down.add(i);
            for (const i of down) if (!before.has(i)) this.onButton(i);
            this.pressed.set(pad.index, down);
        }
    }

    moveCamera(pad, dt) {
        const cc = this.gameManager?.cameraControls;
        if (!cc || !dt) return;
        const lx = GamepadInput.axis(pad.axes?.[0]);
        const ly = GamepadInput.axis(pad.axes?.[1]);
        const rx = GamepadInput.axis(pad.axes?.[2]);
        const ry = GamepadInput.axis(pad.axes?.[3]);
        if (lx || ly) {
            const step = GamepadInput.MOVE_SPEED * dt * (cc.zoomPanScale?.() || 1);
            cc.moveRelativeToView(lx * step, -ly * step); // analógico para cima = eixo negativo = para a frente
        }
        if (rx) cc.targetAlpha += rx * GamepadInput.ROTATE_SPEED * dt;
        // Analógico direito ↑↓ e gatilhos: RT aproxima, LT afasta
        const zoom = ry - GamepadInput.buttonValue(pad, GamepadInput.BUTTON.RT) + GamepadInput.buttonValue(pad, GamepadInput.BUTTON.LT);
        if (Math.abs(zoom) > 0.01) {
            const limits = cc.config?.zoomLimits || { min: 10, max: 80 };
            cc.targetRadius = Math.max(limits.min, Math.min(limits.max, cc.targetRadius + zoom * GamepadInput.ZOOM_SPEED * dt));
        }
    }

    onButton(index) {
        const gm = this.gameManager;
        if (!gm) return;
        const B = GamepadInput.BUTTON;
        const running = gm.gameState === 'playing' || gm.gameState === 'paused';
        switch (index) {
            case B.START:
                if (gm.gameState === 'playing') gm.pauseGame();
                else if (gm.gameState === 'paused') gm.resumeGame();
                break;
            case B.LB:
            case B.RB:
                if (running) gm.setTimeScale(GamepadInput.nextSpeed(gm.timeScale, index === B.RB ? 1 : -1));
                break;
            case B.B:
                gm.dispatchEscape?.();
                break;
            case B.A:
                this.pressFocused();
                break;
            case B.Y:
                gm.cameraControls?.resetCamera?.();
                break;
            case B.UP:
                this.moveFocus(-1);
                break;
            case B.DOWN:
                this.moveFocus(1);
                break;
        }
    }

    static FOCUSABLE = 'button, a[href], [role="button"], [role="menuitemradio"], [role="radio"], input, select, summary, [tabindex]:not([tabindex="-1"])';

    /** A: aperta o botão em foco (o mesmo que Enter). */
    pressFocused() {
        if (typeof document === 'undefined') return;
        const el = document.activeElement;
        if (!el || el === document.body || el.tagName === 'CANVAS' || !el.matches?.(GamepadInput.FOCUSABLE)) return;
        el.click();
    }

    /** Direcional ↑↓: vai para o botão anterior/seguinte dentro do diálogo que está na frente (ou da tela toda). */
    moveFocus(dir) {
        if (typeof document === 'undefined') return;
        const scope = Array.from(document.querySelectorAll('[role="dialog"], .modal-overlay, #pause-overlay'))
            .filter(d => !d.hidden && d.getClientRects().length).pop() || document;
        const items = Array.from(scope.querySelectorAll(GamepadInput.FOCUSABLE))
            .filter(el => !el.disabled && el.getClientRects().length && el.tagName !== 'CANVAS');
        if (!items.length) return;
        const i = items.indexOf(document.activeElement);
        const next = items[i < 0 ? (dir > 0 ? 0 : items.length - 1) : (i + dir + items.length) % items.length];
        next.focus({ preventScroll: false });
    }
}
