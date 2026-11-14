// Retratos animados dos funcionários da prefeitura (js/data/staffPortraits.js, gerados por scripts/portraits/staff.js).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/data/portraits.js', 'js/data/staffPortraits.js', 'js/data/preloadImages.js', 'js/utils/Icons.js',
    'js/data/buildingModels.js', 'js/data/zoneLots.js', 'js/utils/AssetLoader.js');
const STAFF = JSON.parse(JSON.stringify(g('STAFF_PORTRAITS')));
const PEOPLE = JSON.parse(JSON.stringify(g('STAFF_PEOPLE')));
const SIZE = g('PORTRAIT_SIZE');
const FILES = ['portrait', 'eyes', 'mouth-a', 'mouth-o', 'worried', 'happy'];
const SMALL = ['eyes', 'mouth-a', 'mouth-o'];

test('todo funcionário entra no PORTRAIT_MANIFEST, com os 6 arquivos (≤ 120 KB, prompt registrado) e quem ele é', () => {
    const ids = Object.keys(STAFF);
    const prompts = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/images/_prompts.json'), 'utf8')).images;
    assert.ok(ids.length >= 1, 'nenhum retrato de funcionário');
    for (const id of ids) {
        assert.match(id, /^staff\/[a-z_]+-[fm]-[1-9]$/, id); // só número: nada de cor ou raça em nomes e ids
        assert.ok(g(`PORTRAIT_MANIFEST[${JSON.stringify(id)}]`), `${id} fora do PORTRAIT_MANIFEST`);
        for (const name of FILES) {
            const file = path.join(ROOT, 'assets/characters', id, `${name}.webp`);
            assert.ok(fs.existsSync(file), `${id}/${name}.webp não existe`);
            assert.ok(fs.statSync(file).size <= 120 * 1024, `${id}/${name}.webp tem mais de 120 KB`);
            assert.ok(prompts[`assets/characters/${id}/${name}.webp`]?.prompt, `${id}/${name}.webp sem registro em assets/images/_prompts.json`);
        }
        const who = PEOPLE[id];
        assert.ok(who, `${id} sem STAFF_PEOPLE`);
        assert.strictEqual(id, `staff/${who.role}-${who.gender}-${who.variant}`);
        assert.ok(who.age >= 25 && who.age <= 60, `${id}: idade ${who.age}`);
    }
});

test('caixas dentro da imagem; olhos e boca pequenos (a edição não mexeu na imagem toda)', () => {
    const inside = ([x, y, w, h]) => x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= SIZE && y + h <= SIZE;
    for (const [id, entry] of Object.entries(STAFF)) {
        assert.ok(inside(entry.face), `${id} face ${entry.face}`);
        assert.strictEqual(entry.face[2], entry.face[3], `${id}: face não é quadrada`);
        for (const name of FILES.slice(1)) {
            const box = entry.layers[name];
            assert.ok(box && inside(box), `${id} ${name} ${box}`);
            if (SMALL.includes(name)) assert.ok(box[2] * box[3] <= 0.45 * SIZE * SIZE, `${id} ${name}: caixa maior que 45% da imagem`);
        }
    }
});

test('funcionários ficam fora do preload crítico (lazy); os personagens da história continuam nele', () => {
    g('window').innerWidth = 1280;
    const critical = g('AssetLoader').criticalImages();
    assert.ok(!critical.some(file => file.includes('assets/characters/staff/')));
    assert.ok(critical.includes('assets/characters/paulo/portrait.webp'));
    for (const entry of Object.values(STAFF)) assert.strictEqual(entry.lazy, true);
});

test('nenhuma pasta de retrato sem entrada no manifesto', () => {
    const dir = path.join(ROOT, 'assets/characters/staff');
    if (!fs.existsSync(dir)) return;
    for (const folder of fs.readdirSync(dir)) assert.ok(STAFF[`staff/${folder}`], `assets/characters/staff/${folder} sem entrada em staffPortraits.js`);
});
