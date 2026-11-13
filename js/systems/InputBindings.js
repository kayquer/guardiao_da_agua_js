/**
 * InputBindings — teclas do jogo que o jogador pode trocar (acessibilidade de loja). Sem DOM: testado em
 * tests/unit/input-bindings.test.js.
 *
 * Cada ação tem duas teclas (principal e alternativa), guardadas pelo `event.code` (tecla física: o W continua
 * no mesmo lugar em qualquer layout). Quem lê: SimCityCameraControls (câmera), GameManager.handleKeyboardEvent
 * (pausa e velocidades) e o Esc alternativo (GameManager). O Esc é fixo na ação "cancelar" (todo painel do jogo
 * fecha com ele); dá para pôr uma segunda tecla que faz o mesmo. Configurações → "Teclas" (ui/SettingsUI.js).
 */
class InputBindings {
    static STORAGE_KEY = STORAGE_PREFIX + 'keys';

    /** Ordem = ordem da lista nas Configurações. `locked`: a tecla principal não muda (o Esc). */
    static ACTIONS = [
        { id: 'camForward', label: 'Mover a câmera para a frente', group: 'Câmera', keys: ['KeyW', 'ArrowUp'] },
        { id: 'camBack', label: 'Mover a câmera para trás', group: 'Câmera', keys: ['KeyS', 'ArrowDown'] },
        { id: 'camLeft', label: 'Mover a câmera para a esquerda', group: 'Câmera', keys: ['KeyA', 'ArrowLeft'] },
        { id: 'camRight', label: 'Mover a câmera para a direita', group: 'Câmera', keys: ['KeyD', 'ArrowRight'] },
        { id: 'rotateLeft', label: 'Girar a câmera para a esquerda', group: 'Câmera', keys: ['KeyQ', null] },
        { id: 'rotateRight', label: 'Girar a câmera para a direita', group: 'Câmera', keys: ['KeyE', null] },
        { id: 'camReset', label: 'Voltar a câmera ao início', group: 'Câmera', keys: ['KeyR', null] },
        { id: 'pause', label: 'Pausar e continuar', group: 'Tempo', keys: ['Space', null] },
        { id: 'speedHalf', label: 'Velocidade 0,5x (devagar)', group: 'Tempo', keys: ['Digit0', 'Numpad0'] },
        { id: 'speed1', label: 'Velocidade 1x', group: 'Tempo', keys: ['Digit1', 'Numpad1'] },
        { id: 'speed2', label: 'Velocidade 2x', group: 'Tempo', keys: ['Digit2', 'Numpad2'] },
        { id: 'speed3', label: 'Velocidade 3x', group: 'Tempo', keys: ['Digit3', 'Numpad3'] },
        { id: 'cancel', label: 'Cancelar e fechar', group: 'Geral', keys: ['Escape', null], locked: true }
    ];

    /** Velocidade de cada ação de tempo (GameManager.setTimeScale). */
    static SPEEDS = { speedHalf: 0.5, speed1: 1, speed2: 2, speed3: 3 };

    /** Teclas que não podem virar comando: o navegador usa (F5, F11, F12, Tab) ou o jogo já usa (Shift = construir vários). */
    static RESERVED = ['Escape', 'Tab', 'F5', 'F11', 'F12', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
        'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu', 'CapsLock'];

    static NAMES = {
        Space: 'Espaço', Escape: 'Esc', Enter: 'Enter', Backspace: 'Apagar', Tab: 'Tab', Delete: 'Del', Insert: 'Ins',
        Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
        ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
        Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: 'Ç', Quote: '~',
        Comma: ',', Period: '.', Slash: ';', Backquote: "'", IntlBackslash: '\\', IntlRo: '/',
        NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadMultiply: 'Num *', NumpadDivide: 'Num /',
        NumpadDecimal: 'Num ,', NumpadEnter: 'Num Enter'
    };

    static listeners = [];
    static cache = null;

    static action(id) {
        return InputBindings.ACTIONS.find(a => a.id === id) || null;
    }

    /** Teclas padrão: { ação: [principal, alternativa] } (cópia nova). */
    static defaults() {
        const map = {};
        for (const a of InputBindings.ACTIONS) map[a.id] = [...a.keys];
        return map;
    }

    static isValidCode(code) {
        return typeof code === 'string' && /^[A-Za-z][A-Za-z0-9]{1,24}$/.test(code);
    }

    /** Lê o que foi salvo; o que faltar ou vier estragado volta ao padrão. Nunca lança. */
    static load() {
        const map = InputBindings.defaults();
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem(InputBindings.STORAGE_KEY) || 'null');
        } catch {
            saved = null;
        }
        if (saved && typeof saved === 'object') {
            for (const a of InputBindings.ACTIONS) {
                const keys = saved[a.id];
                if (!Array.isArray(keys)) continue;
                for (let slot = 0; slot < 2; slot++) {
                    if (a.locked && slot === 0) continue;
                    const code = keys[slot];
                    if (code === null || code === undefined) map[a.id][slot] = null;
                    else if (InputBindings.isValidCode(code) && !InputBindings.RESERVED.includes(code)) map[a.id][slot] = code;
                }
            }
        }
        // Uma tecla, uma ação: se o save trouxer repetida, fica com a primeira da lista
        const seen = new Set();
        for (const a of InputBindings.ACTIONS) {
            for (let slot = 0; slot < 2; slot++) {
                const code = map[a.id][slot];
                if (!code) continue;
                if (seen.has(code)) map[a.id][slot] = null;
                else seen.add(code);
            }
        }
        InputBindings.cache = map;
        return map;
    }

    static current() {
        return InputBindings.cache || InputBindings.load();
    }

    static save() {
        try {
            localStorage.setItem(InputBindings.STORAGE_KEY, JSON.stringify(InputBindings.current()));
        } catch { /* modo privado: vale só nesta visita */ }
        InputBindings.listeners.forEach(fn => fn(InputBindings.current()));
    }

    /** Teclas de uma ação, sem as vazias. */
    static keysFor(id) {
        return (InputBindings.current()[id] || []).filter(Boolean);
    }

    /** Ação de uma tecla (event.code) ou null. */
    static actionFor(code) {
        if (!code) return null;
        const map = InputBindings.current();
        for (const a of InputBindings.ACTIONS) {
            if (map[a.id].includes(code)) return a.id;
        }
        return null;
    }

    static matches(id, code) {
        return !!code && InputBindings.keysFor(id).includes(code);
    }

    /** Quem já usa a tecla (fora da posição `id`/`slot`): { action, slot } ou null. */
    static findConflict(code, id = null, slot = -1) {
        const map = InputBindings.current();
        for (const a of InputBindings.ACTIONS) {
            for (let s = 0; s < 2; s++) {
                if (map[a.id][s] === code && !(a.id === id && s === slot)) return { action: a.id, slot: s };
            }
        }
        return null;
    }

    /**
     * Troca a tecla de uma ação. Se outra ação usava a tecla, ela fica sem essa tecla (e o resultado diz qual,
     * para o aviso de conflito). `code` null = deixa a posição vazia.
     * Devolve { ok, reason?, conflict?: { action, slot } }.
     */
    static set(id, slot, code) {
        const action = InputBindings.action(id);
        if (!action || (slot !== 0 && slot !== 1)) return { ok: false, reason: 'Ação desconhecida.' };
        if (action.locked && slot === 0) return { ok: false, reason: 'O Esc sempre cancela e fecha; mude só a tecla alternativa.' };
        const map = InputBindings.current();
        if (code === null) {
            map[id][slot] = null;
            InputBindings.save();
            return { ok: true, conflict: null };
        }
        if (!InputBindings.isValidCode(code)) return { ok: false, reason: 'Tecla não reconhecida.' };
        if (InputBindings.RESERVED.includes(code)) {
            return { ok: false, reason: `${InputBindings.label(code)} não pode ser usada: o navegador ou o jogo já usam essa tecla.` };
        }
        const conflict = InputBindings.findConflict(code, id, slot);
        if (conflict) {
            if (InputBindings.action(conflict.action).locked && conflict.slot === 0) {
                return { ok: false, reason: `${InputBindings.label(code)} é fixa em "${InputBindings.action(conflict.action).label}".` };
            }
            map[conflict.action][conflict.slot] = null;
        }
        map[id][slot] = code;
        InputBindings.save();
        return { ok: true, conflict };
    }

    /** Volta tudo ao padrão (botão "Restaurar padrão"). */
    static reset() {
        InputBindings.cache = InputBindings.defaults();
        InputBindings.save();
    }

    /** Nome da tecla para mostrar ao jogador ("W", "↑", "Espaço", "Num 1"). */
    static label(code) {
        if (!code) return '—';
        if (InputBindings.NAMES[code]) return InputBindings.NAMES[code];
        let m = /^Key([A-Z])$/.exec(code);
        if (m) return m[1];
        m = /^Digit(\d)$/.exec(code);
        if (m) return m[1];
        m = /^Numpad(\d)$/.exec(code);
        if (m) return `Num ${m[1]}`;
        if (/^F\d{1,2}$/.test(code)) return code;
        return code;
    }

    static onChange(fn) {
        InputBindings.listeners.push(fn);
    }
}
