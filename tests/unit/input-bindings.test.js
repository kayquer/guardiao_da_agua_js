// Acessibilidade de loja: teclas que o jogador troca (InputBindings), modo para daltonismo (ColorMode) e
// controle de videogame (GamepadInput, com controles falsos).
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const files = ['js/systems/InputBindings.js', 'js/systems/ColorMode.js', 'js/systems/GamepadInput.js'];
const json = v => JSON.parse(JSON.stringify(v));

test('teclas: o padrão é o de sempre (WASD/setas, Q/E, R, Espaço, 0/1/2/3, Esc)', () => {
    const g = load(...files);
    const kb = g('InputBindings');
    assert.deepStrictEqual(json(kb.keysFor('camForward')), ['KeyW', 'ArrowUp']);
    assert.deepStrictEqual(json(kb.keysFor('camLeft')), ['KeyA', 'ArrowLeft']);
    assert.strictEqual(kb.actionFor('KeyQ'), 'rotateLeft');
    assert.strictEqual(kb.actionFor('KeyE'), 'rotateRight');
    assert.strictEqual(kb.actionFor('KeyR'), 'camReset');
    assert.strictEqual(kb.actionFor('Space'), 'pause');
    assert.strictEqual(kb.actionFor('Digit0'), 'speedHalf');
    assert.strictEqual(kb.actionFor('Numpad3'), 'speed3');
    assert.strictEqual(kb.actionFor('Escape'), 'cancel');
    assert.strictEqual(kb.actionFor('KeyZ'), null);
    assert.strictEqual(kb.SPEEDS.speedHalf, 0.5);
    // Nenhuma tecla padrão repetida em duas ações
    const all = Object.values(json(kb.defaults())).flat().filter(Boolean);
    assert.strictEqual(new Set(all).size, all.length);
    // Toda ação tem nome em português e grupo
    for (const a of kb.ACTIONS) assert.ok(a.label.length > 5 && a.group);
});

test('teclas: trocar, conflito (a outra ação perde a tecla), reservadas e Esc fixo', () => {
    const g = load(...files);
    const kb = g('InputBindings');
    let r = kb.set('camForward', 0, 'KeyI');
    assert.ok(r.ok && !r.conflict);
    assert.strictEqual(kb.actionFor('KeyI'), 'camForward');
    assert.strictEqual(kb.actionFor('KeyW'), null); // W saiu
    assert.ok(kb.matches('camForward', 'ArrowUp')); // a alternativa continua

    // Q já é de "girar à esquerda": vai para a nova ação e a antiga fica sem ela
    r = kb.set('camReset', 1, 'KeyQ');
    assert.ok(r.ok);
    assert.deepStrictEqual(json(r.conflict), { action: 'rotateLeft', slot: 0 });
    assert.strictEqual(kb.actionFor('KeyQ'), 'camReset');
    assert.deepStrictEqual(json(kb.keysFor('rotateLeft')), []);
    assert.deepStrictEqual(json(kb.findConflict('KeyQ', 'camReset', 1)), null);
    assert.deepStrictEqual(json(kb.findConflict('KeyQ')), { action: 'camReset', slot: 1 });

    // Teclas do navegador/jogo e o Esc fixo
    for (const code of ['F5', 'F11', 'Tab', 'ShiftLeft', 'Escape']) {
        r = kb.set('pause', 1, code);
        assert.strictEqual(r.ok, false, code);
        assert.ok(r.reason.length > 10);
    }
    assert.strictEqual(kb.set('cancel', 0, 'KeyX').ok, false);
    assert.ok(kb.set('cancel', 1, 'KeyX').ok); // a alternativa do cancelar pode
    assert.strictEqual(kb.actionFor('KeyX'), 'cancel');
    assert.strictEqual(kb.set('nada', 0, 'KeyX').ok, false);

    // Apagar uma posição
    assert.ok(kb.set('pause', 0, null).ok);
    assert.strictEqual(kb.actionFor('Space'), null);

    // Restaurar padrão
    kb.reset();
    assert.strictEqual(kb.actionFor('KeyW'), 'camForward');
    assert.strictEqual(kb.actionFor('KeyQ'), 'rotateLeft');
    assert.strictEqual(kb.actionFor('Space'), 'pause');
});

test('teclas: salvas no navegador (STORAGE_PREFIX) e lidas de volta; save estragado volta ao padrão', () => {
    const g = load(...files);
    const kb = g('InputBindings');
    assert.strictEqual(kb.STORAGE_KEY, g('STORAGE_PREFIX') + 'keys');
    const changed = [];
    kb.onChange(() => changed.push(1));
    kb.set('rotateRight', 1, 'KeyP');
    assert.strictEqual(changed.length, 1);
    const saved = JSON.parse(g(`localStorage.getItem(${JSON.stringify(kb.STORAGE_KEY)})`));
    assert.deepStrictEqual(saved.rotateRight, ['KeyE', 'KeyP']);

    // Outra visita: lê do localStorage
    g('InputBindings.cache = null');
    assert.strictEqual(kb.actionFor('KeyP'), 'rotateRight');

    // Save com lixo, ação desconhecida, tecla reservada e repetida
    g(`localStorage.setItem(InputBindings.STORAGE_KEY, JSON.stringify({ camForward: ['KeyJ', 42], foo: ['KeyK'], pause: ['F5', 'KeyJ'], cancel: ['KeyM', null] }))`);
    g('InputBindings.cache = null');
    assert.deepStrictEqual(json(kb.current().camForward), ['KeyJ', 'ArrowUp']); // 42 inválido = padrão
    assert.deepStrictEqual(json(kb.current().pause), ['Space', null]); // F5 recusada; J repetida sai
    assert.deepStrictEqual(json(kb.current().cancel), ['Escape', null]); // Esc fixo
    g(`localStorage.setItem(InputBindings.STORAGE_KEY, '{não é json')`);
    g('InputBindings.cache = null');
    assert.deepStrictEqual(json(kb.current()), json(kb.defaults()));
});

test('teclas: nomes para mostrar ao jogador', () => {
    const kb = load(...files)('InputBindings');
    assert.strictEqual(kb.label('KeyW'), 'W');
    assert.strictEqual(kb.label('ArrowUp'), '↑');
    assert.strictEqual(kb.label('Space'), 'Espaço');
    assert.strictEqual(kb.label('Digit0'), '0');
    assert.strictEqual(kb.label('Numpad2'), 'Num 2');
    assert.strictEqual(kb.label('Escape'), 'Esc');
    assert.strictEqual(kb.label(null), '—');
});

test('daltonismo: modo salvo, cores do 3D trocam e o normal mantém as de sempre', () => {
    const g = load(...files);
    const cm = g('ColorMode');
    assert.strictEqual(cm.current(), 'normal');
    assert.deepStrictEqual(json(cm.rgb('good', [0, 1, 0])), [0, 1, 0]);
    assert.deepStrictEqual(json(cm.rgb('bad', [0.2, 0, 0], 0.2)), [0.2, 0, 0]);
    cm.set('deutan');
    assert.strictEqual(cm.current(), 'deutan');
    assert.strictEqual(g(`localStorage.getItem(${JSON.stringify(cm.STORAGE_KEY)})`), 'deutan');
    const good = cm.rgb('good', [0, 1, 0]);
    const bad = cm.rgb('bad', [1, 0, 0]);
    // Deuteranopia: bom é azul (b > g > r), ruim é laranja (r > g, sem azul) — não é mais verde × vermelho
    assert.ok(good[2] > good[0] && good[2] > good[1]);
    assert.ok(bad[0] > bad[1] && bad[2] === 0);
    assert.deepStrictEqual(json(cm.rgb('good', [0, 1, 0], 0.5)), json(good.map(c => c * 0.5)));
    cm.set('nada'); // inválido: não muda
    assert.strictEqual(cm.current(), 'deutan');
    cm.set('tritan');
    assert.notDeepStrictEqual(json(cm.rgb('good', [0, 1, 0])), json(cm.rgb('bad', [1, 0, 0])));
    for (const m of cm.MODES) assert.ok(cm.LABELS[m] && cm.HINTS[m]);
});

// Controle falso no formato da Gamepad API
function pad(index, { axes = [0, 0, 0, 0], down = [] } = {}) {
    const buttons = Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 }));
    return { index, connected: true, axes, buttons };
}

function fakeGame() {
    const cc = {
        moves: [], targetAlpha: 0, targetRadius: 30, config: { zoomLimits: { min: 10, max: 80 } }, resets: 0,
        zoomPanScale: () => 1,
        moveRelativeToView(right, forward) { this.moves.push([right, forward]); },
        resetCamera() { this.resets++; }
    };
    return {
        cameraControls: cc, gameState: 'playing', timeScale: 1, escapes: 0,
        pauseGame() { this.gameState = 'paused'; },
        resumeGame() { this.gameState = 'playing'; },
        setTimeScale(s) { this.timeScale = s; },
        dispatchEscape() { this.escapes++; }
    };
}

test('controle: zona morta, velocidades e câmera pelos analógicos', () => {
    const GP = load(...files)('GamepadInput');
    assert.strictEqual(GP.axis(0.1), 0);
    assert.strictEqual(GP.axis(-0.19), 0);
    assert.strictEqual(GP.axis(1), 1);
    assert.strictEqual(GP.axis(-1), -1);
    assert.ok(GP.axis(0.6) > 0 && GP.axis(0.6) < 1);
    assert.strictEqual(GP.nextSpeed(1, -1), 0.5);
    assert.strictEqual(GP.nextSpeed(0.5, -1), 0.5); // não dá a volta
    assert.strictEqual(GP.nextSpeed(2, 1), 3);
    assert.strictEqual(GP.nextSpeed(3, 1), 3);

    const gm = fakeGame();
    const input = new GP(gm);
    input.poll(1000, [pad(0)]); // primeiro quadro: só marca o tempo
    input.poll(1100, [pad(0, { axes: [0.05, -1, 1, 0] })]); // analógico esquerdo para cima, direito para a direita
    assert.strictEqual(gm.cameraControls.moves.length, 1);
    const [right, forward] = gm.cameraControls.moves[0];
    assert.strictEqual(right, 0); // tremor dentro da zona morta
    assert.ok(forward > 0); // para cima = para a frente
    assert.ok(gm.cameraControls.targetAlpha > 0);
    // RT aproxima (raio menor), sem passar do limite
    input.poll(1200, [pad(0, { down: [GP.BUTTON.RT] })]);
    assert.ok(gm.cameraControls.targetRadius < 30);
    for (let t = 1300; t < 9000; t += 100) input.poll(t, [pad(0, { down: [GP.BUTTON.RT] })]);
    assert.strictEqual(gm.cameraControls.targetRadius, 10);
});

test('controle: Start pausa/continua, LB/RB mudam a velocidade, B é Esc — só na borda do aperto', () => {
    const GP = load(...files)('GamepadInput');
    const gm = fakeGame();
    const input = new GP(gm);
    const B = GP.BUTTON;
    input.poll(0, [pad(0, { down: [B.START] })]);
    assert.strictEqual(gm.gameState, 'paused');
    input.poll(16, [pad(0, { down: [B.START] })]); // segurando: nada de novo
    assert.strictEqual(gm.gameState, 'paused');
    input.poll(32, [pad(0)]);
    input.poll(48, [pad(0, { down: [B.START] })]);
    assert.strictEqual(gm.gameState, 'playing');

    input.poll(64, [pad(0, { down: [B.LB] })]);
    assert.strictEqual(gm.timeScale, 0.5);
    input.poll(80, [pad(0)]);
    input.poll(96, [pad(0, { down: [B.RB] })]);
    input.poll(112, [pad(0)]);
    input.poll(128, [pad(0, { down: [B.RB] })]);
    assert.strictEqual(gm.timeScale, 2);

    input.poll(144, [pad(0, { down: [B.B, B.Y] })]);
    assert.strictEqual(gm.escapes, 1);
    assert.strictEqual(gm.cameraControls.resets, 1);

    // No tutorial a velocidade não muda (como as teclas)
    gm.gameState = 'tutorial';
    input.poll(160, [pad(0)]);
    input.poll(176, [pad(0, { down: [B.RB] })]);
    assert.strictEqual(gm.timeScale, 2);

    // Sem controle conectado, poll() do jogo não faz nada
    const idle = new GP(fakeGame());
    assert.doesNotThrow(() => idle.poll(0));
});
