// Qualidade gráfica (GraphicsQuality): presets, escolha automática pelo aparelho e escolha salva.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const gq = () => load('js/systems/GraphicsQuality.js')('GraphicsQuality');

test('qualidade: presets vão do mais pesado (alta) ao mais leve (baixa)', () => {
    const q = gq();
    const [low, medium, high] = ['low', 'medium', 'high'].map(l => q.preset(l));
    // Alta = o visual de sempre (resolução cheia, MSAA, sombra suave, chuva toda)
    assert.strictEqual(high.resolution, 1);
    assert.strictEqual(high.antialias, true);
    assert.strictEqual(high.shadows, 'blur');
    assert.strictEqual(high.particleScale, 1);
    assert.ok(high.clouds && high.waterShader && high.treeSway === 1);
    // Cada nível abaixo renderiza menos pixels e menos partículas
    assert.ok(medium.resolution < high.resolution && low.resolution < medium.resolution);
    assert.ok(medium.particleScale < 1 && low.particleScale < medium.particleScale);
    assert.strictEqual(medium.shadows, 'pcf');
    assert.strictEqual(low.shadows, 'off');
    assert.ok(!low.clouds && !low.waterShader && low.treeSway === 0);
    // Todo nível tem nome e explicação em português
    for (const l of q.LEVELS) assert.ok(q.LABELS[l] && q.HINTS[l].length > 20);
    assert.strictEqual(q.LABELS.medium, 'Média');
});

test('qualidade: escolha automática pelo aparelho', () => {
    const q = gq();
    const pc = { mobile: false, cores: 8, memory: 8, gpu: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)' };
    assert.strictEqual(q.detect(pc), 'high');
    assert.strictEqual(q.detect({ ...pc, gpu: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11)' }), 'high');
    // Integrada nova ou máquina mediana → média
    assert.strictEqual(q.detect({ ...pc, gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' }), 'medium');
    assert.strictEqual(q.detect({ ...pc, gpu: 'ANGLE (Intel, Intel(R) HD Graphics 620 Direct3D11)' }), 'medium');
    assert.strictEqual(q.detect({ ...pc, cores: 4 }), 'medium');
    assert.strictEqual(q.detect({ ...pc, memory: 4 }), 'medium');
    assert.strictEqual(q.detect({ mobile: true, cores: 8, memory: 6, gpu: 'Adreno (TM) 650' }), 'medium');
    // Placa fraca, renderização por software, pouca memória/núcleos → baixa
    assert.strictEqual(q.detect({ ...pc, gpu: 'ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0, D3D11)' }), 'low');
    assert.strictEqual(q.detect({ ...pc, gpu: 'Intel(R) HD Graphics' }), 'low');
    assert.strictEqual(q.detect({ ...pc, gpu: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)' }), 'low');
    assert.strictEqual(q.detect({ ...pc, gpu: 'llvmpipe (LLVM 15.0.7, 256 bits)' }), 'low');
    assert.strictEqual(q.detect({ ...pc, cores: 2 }), 'low');
    assert.strictEqual(q.detect({ mobile: true, cores: 8, memory: 2, gpu: 'Mali-G52' }), 'low');
    assert.strictEqual(q.detect({ mobile: true, cores: 4, memory: 3, gpu: 'Adreno (TM) 306' }), 'low');
    // Sem informação nenhuma: não trava o jogo, fica na alta (a de sempre)
    assert.strictEqual(q.detect({}), 'high');
});

test('qualidade: escolha do jogador fica salva e avisa quem aplica', () => {
    const q = gq();
    q.detected = 'medium'; // aparelho "detectado" (sem navegador aqui)
    assert.strictEqual(q.current(), 'medium');
    assert.ok(q.isAuto());
    const seen = [];
    const off = q.onChange(level => seen.push(level));
    assert.strictEqual(q.set('ultra'), false, 'nível inválido é ignorado');
    assert.ok(q.set('low'));
    assert.strictEqual(q.current(), 'low');
    assert.strictEqual(q.saved(), 'low');
    assert.ok(!q.isAuto());
    assert.strictEqual(JSON.stringify(seen), '["low"]');
    off();
    q.set('high');
    assert.strictEqual(seen.length, 1, 'quem saiu não é mais avisado');
    // MSAA do engine só muda ao reabrir o jogo
    assert.strictEqual(q.needsRestart('low', true), true);
    assert.strictEqual(q.needsRestart('high', true), false);
    assert.strictEqual(q.needsRestart('high', false), true);
    assert.strictEqual(q.needsRestart('medium', false), false);
});
