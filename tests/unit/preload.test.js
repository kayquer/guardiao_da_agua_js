// Preload (js/data/preloadImages.js + AssetLoader) e ritmo de quadros (FramePacer).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/preloadImages.js', 'js/utils/Icons.js', 'js/data/portraits.js',
    'js/data/buildingModels.js', 'js/data/zoneLots.js', 'js/utils/AssetLoader.js');
const AssetLoader = g('AssetLoader');
const LISTS = g('PRELOAD_IMAGES');
const exists = file => fs.existsSync(path.join(ROOT, file));

test('toda imagem de assets/images está na lista, e todo arquivo da lista existe', () => {
    const listed = new Set([...LISTS.critical, ...LISTS.background, ...LISTS.mobile]);
    for (const dir of ['lessons', 'gameover', 'institucional', 'studies', 'tutorial']) {
        for (const file of fs.readdirSync(path.join(ROOT, 'assets/images', dir))) {
            assert.ok(listed.has(`assets/images/${dir}/${file}`), `${dir}/${file} fora de js/data/preloadImages.js`);
        }
    }
    for (const file of listed) assert.ok(exists(file), file);
});

test('ícones, retratos e modelos do preload apontam para arquivos que existem', () => {
    g('window').innerWidth = 1280;
    const critical = AssetLoader.criticalImages();
    assert.ok(critical.some(f => f.includes('assets/characters/claudia/portrait.webp')));
    assert.ok(critical.some(f => f.includes('assets/icons/svg/')));
    for (const file of critical) assert.ok(exists(file), file);
    const models = AssetLoader.modelFiles();
    assert.ok(models.length > 30);
    for (const file of models) assert.ok(exists(file), file);
});

test('FramePacer: não muda nada em 60 Hz e segura monitores mais rápidos em 60', () => {
    const FramePacer = g('FramePacer');
    const count = (hz, fps) => {
        const pacer = new FramePacer();
        let drawn = 0;
        for (let i = 0; i < hz * 10; i++) if (pacer.ready(1000 + i * 1000 / hz, fps)) drawn++;
        return drawn / 10;
    };
    assert.strictEqual(count(60, 60), 60);
    for (const hz of [75, 100, 120, 144, 165, 240]) {
        const fps = count(hz, 60);
        assert.ok(fps >= 57 && fps <= 62, `${hz} Hz → ${fps} fps`);
    }
    assert.ok(Math.abs(count(60, 30) - 30) <= 1, 'lendo: 30');
    assert.ok(Math.abs(count(60, 5) - 5) <= 1, 'pausa: 5');
    assert.strictEqual(count(144, Infinity), 144, 'câmera andando: sem limite');
});

test('FramePacer: voltar da pausa desenha na hora', () => {
    const pacer = new (g('FramePacer'))();
    assert.strictEqual(pacer.ready(1000, 5), true);
    assert.strictEqual(pacer.ready(1010, 5), false);
    assert.strictEqual(pacer.ready(1020, 60), true);
});
