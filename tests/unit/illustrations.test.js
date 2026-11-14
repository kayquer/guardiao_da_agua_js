// Ilustrações animadas (js/data/illustrations.js + js/ui/AnimatedIllustration.js): manifesto completo e coerente.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/data/illustrations.js', 'js/ui/AnimatedIllustration.js');
const MANIFEST = g('ILLUSTRATIONS');
const AI = g('AnimatedIllustration');
const CUT_KINDS = ['water', 'cloud', 'sway', 'hang', 'sun', 'bob', 'swim', 'fall', 'rise'];
const FX_KINDS = Object.keys(AI.FX);
const DIRS = ['tutorial', 'lessons'];

test('todo arquivo do manifesto existe', () => {
    for (const key of Object.keys(MANIFEST)) {
        assert.ok(fs.existsSync(path.join(ROOT, 'assets/images', key)), `${key} não existe`);
    }
});

test('toda imagem de tutorial e de aulas tem entrada (com recortes e desenhos)', () => {
    let count = 0;
    for (const dir of DIRS) {
        for (const file of fs.readdirSync(path.join(ROOT, 'assets/images', dir))) {
            const entry = MANIFEST[`${dir}/${file}`];
            assert.ok(entry, `${dir}/${file} sem entrada em js/data/illustrations.js`);
            assert.ok(entry.cuts?.length >= 2, `${dir}/${file}: poucos recortes`);
            assert.ok(entry.fx?.length >= 1, `${dir}/${file}: sem desenho por cima`);
            count++;
        }
    }
    assert.strictEqual(count, Object.keys(MANIFEST).length, 'entrada sobrando no manifesto');
    assert.ok(count >= 32);
});

test('regiões, pontos e tipos válidos (0 a 1, dentro da figura)', () => {
    const inside = (n, where) => assert.ok(typeof n === 'number' && n >= 0 && n <= 1, `${where}: ${n} fora de 0-1`);
    const box = (b, where) => {
        assert.strictEqual(b.length, 4, `${where}: box = [x, y, w, h]`);
        b.forEach(n => inside(n, where));
        assert.ok(b[2] > 0 && b[3] > 0, `${where}: box vazia`);
        assert.ok(b[0] + b[2] <= 1.0001 && b[1] + b[3] <= 1.0001, `${where}: box passa da borda`);
    };
    for (const [key, entry] of Object.entries(MANIFEST)) {
        entry.cuts.forEach((cut, i) => {
            const where = `${key} cuts[${i}]`;
            assert.ok(CUT_KINDS.includes(cut.kind), `${where}: tipo ${cut.kind}`);
            box(cut.box, where);
            if (cut.amp != null) assert.ok(cut.amp > 0 && cut.amp <= 20, `${where}: amp exagerado (movimento sutil)`);
        });
        entry.fx.forEach((fx, i) => {
            const where = `${key} fx[${i}]`;
            assert.ok(FX_KINDS.includes(fx.kind), `${where}: tipo ${fx.kind}`);
            if (fx.box) box(fx.box, where);
            for (const k of ['at', 'from', 'to']) if (fx[k]) fx[k].forEach(n => inside(n, `${where}.${k}`));
            if (fx.points) fx.points.forEach(p => p.forEach(n => inside(n, `${where}.points`)));
            if (fx.dir) fx.dir.forEach(n => assert.ok(Math.abs(n) <= 1, `${where}.dir`));
        });
    }
});

test('as imagens de tutorial/aulas citadas no código têm entrada', () => {
    const files = ['js/systems/TutorialSystem.js', 'js/systems/GameOverSystem.js'];
    for (const f of files) {
        const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
        for (const [, key] of text.matchAll(/assets\/images\/((?:tutorial|lessons)\/[\w-]+\.webp)/g)) {
            assert.ok(MANIFEST[key], `${f} usa ${key}, sem entrada no manifesto`);
        }
    }
});

test('chave do manifesto a partir do src (com ?v= e caminho)', () => {
    assert.strictEqual(AI.keyOf('assets/images/lessons/erosao.webp?v=1'), 'lessons/erosao.webp');
    assert.strictEqual(AI.keyOf('/x/assets/images/tutorial/bg-bacia.webp'), 'tutorial/bg-bacia.webp');
    assert.strictEqual(AI.keyOf('icons/a.svg'), '');
});

test('tratamento: puro, determinístico e dentro de 0-255; Kuwahara mantém uma cor lisa', () => {
    const w = 24, h = 16;
    const make = () => {
        const px = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < w * h; i++) {
            px[i * 4] = (i * 37) % 256; px[i * 4 + 1] = (i * 11) % 256; px[i * 4 + 2] = (i * 5) % 256; px[i * 4 + 3] = 255;
        }
        return px;
    };
    const a = make(), b = make();
    AI.applyTreatment(a, w, h, AI.TREATMENT);
    AI.applyTreatment(b, w, h, AI.TREATMENT);
    assert.deepStrictEqual(Array.from(a), Array.from(b));
    assert.ok(Array.from(a).every((v, i) => (i % 4 === 3 ? v === 255 : v >= 0 && v <= 255)));

    const flat = new Uint8ClampedArray(w * h * 4).fill(120);
    AI.kuwahara(flat, w, h, 2);
    assert.ok(Array.from(flat).every(v => v === 120));
});

test('prefetch acha as figuras citadas em textos de passos e caminhos (sem repetir)', () => {
    const html = 'Veja <img src="assets/images/lessons/erosao.webp" alt=""> e <img src="assets/images/lessons/erosao.webp">' +
        ' e <img src="assets/images/tutorial/bg-bacia.webp?v=2"> mas não <img src="assets/images/studies/x.webp">';
    const found = AI.sourcesIn(html, null, undefined, ['assets/images/lessons/enchente.webp'], 'sem figura');
    assert.deepStrictEqual(Array.from(found), [
        'assets/images/lessons/erosao.webp',
        'assets/images/tutorial/bg-bacia.webp?v=2',
        'assets/images/lessons/enchente.webp'
    ]);
    assert.strictEqual(AI.sourcesIn().length, 0);
});
