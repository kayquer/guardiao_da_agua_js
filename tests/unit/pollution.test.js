const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

// PollutionVisuals.levelFor: até 70% a cidade fica limpa; de 70% a 100% a sujeira cresce de 0 a 1
test('poluição visível: começa em 70% e chega ao máximo em 100%', () => {
    const g = load('js/systems/PollutionVisuals.js');
    const level = p => g(`PollutionVisuals.levelFor(${JSON.stringify(p)})`);
    assert.strictEqual(level(0), 0);
    assert.strictEqual(level(70), 0);
    assert.strictEqual(level(85), 0.5);
    assert.strictEqual(level(100), 1);
    assert.strictEqual(level(130), 1);
    assert.strictEqual(level(null), 0);
    assert.strictEqual(level('x'), 0);
});
