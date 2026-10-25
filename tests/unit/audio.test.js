// Áudio: manifesto único (js/data/audioManifest.js) × arquivos em Sounds/ × chaves usadas no código.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/data/audioManifest.js');
const MANIFEST = JSON.parse(JSON.stringify(g('SOUND_MANIFEST')));
const ALIASES = JSON.parse(JSON.stringify(g('SOUND_ALIASES')));
const resolve = key => ALIASES[key] || key;

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}
const rel = file => path.relative(ROOT, file).split(path.sep).join('/');
const manifestFiles = Object.values(MANIFEST).flatMap(entry => entry.files);

test('todo arquivo do manifesto existe e é mp3', () => {
    for (const [key, entry] of Object.entries(MANIFEST)) {
        assert.ok(['music', 'jingle', 'ambient', 'sfx', 'loop', 'voice'].includes(entry.kind), `${key}: kind ${entry.kind}`);
        assert.ok(entry.files.length > 0, `${key} sem arquivos`);
        for (const file of entry.files) {
            assert.ok(file.endsWith('.mp3'), `${key}: ${file} não é mp3`);
            assert.ok(fs.existsSync(path.join(ROOT, file)), `${key}: ${file} não existe`);
        }
        if (entry.volume !== undefined) assert.ok(entry.volume > 0 && entry.volume <= 1, `${key}: volume ${entry.volume}`);
    }
});

test('sem áudio órfão em Sounds/ e todo áudio tem prompt em Sounds/_prompts.json', () => {
    const listed = new Set(manifestFiles);
    const onDisk = walk(path.join(ROOT, 'Sounds')).map(rel).filter(f => f !== 'Sounds/_prompts.json');
    const orphans = onDisk.filter(f => !listed.has(f));
    assert.deepStrictEqual(orphans, [], `arquivos fora do manifesto: ${orphans.join(', ')}`);
    const prompts = JSON.parse(fs.readFileSync(path.join(ROOT, 'Sounds/_prompts.json'), 'utf8'));
    const registered = new Set([...Object.keys(prompts.music), ...Object.keys(prompts.sfx)]);
    const missing = manifestFiles.filter(f => !registered.has(f));
    assert.deepStrictEqual(missing, [], `sem registro em _prompts.json: ${missing.join(', ')}`);
});

test('apelidos antigos apontam para chaves que existem', () => {
    for (const [alias, key] of Object.entries(ALIASES)) assert.ok(MANIFEST[key], `${alias} → ${key} não existe`);
    // Chaves que o código antigo usava continuam tocando
    for (const key of ['sfx_click', 'sfx_ui_click', 'sfx_success', 'sfx_build_error', 'sfx_pickup', 'sfx_ui_success', 'sfx_water',
        'sfx_item', 'sfx_build_complete', 'sfx_ui_select', 'sfx_error', 'sfx_build_progress', 'sfx_build_place', 'sfx_build', 'sfx_axe',
        'bgm_menu', 'bgm_gameplay']) {
        assert.ok(MANIFEST[resolve(key)], `${key} sumiu`);
    }
});

test('toda chave de som citada no código existe no manifesto', () => {
    const files = walk(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && !f.endsWith('audioManifest.js'));
    const missing = [];
    let count = 0;
    for (const file of files) {
        const src = fs.readFileSync(file, 'utf8');
        // Qualquer literal 'sfx_…'/'bgm_…'/'amb_…'/'voc_…'/'jingle_…' (playSound, playMusic, tabelas de eventos, ternários)
        for (const m of src.matchAll(/['"]((?:sfx|bgm|amb|voc|jingle)_[a-z0-9_]+)['"]/g)) {
            count++;
            if (!MANIFEST[resolve(m[1])]) missing.push(`${rel(file)}: ${m[1]}`);
        }
    }
    assert.ok(count > 50, `poucas chaves encontradas (${count}): o padrão de busca quebrou?`);
    assert.deepStrictEqual(missing, []);
});

test('cada personagem do tutorial tem a voz de entrada', () => {
    const src = fs.readFileSync(path.join(ROOT, 'js/systems/TutorialSystem.js'), 'utf8');
    const ids = [...src.matchAll(/id: '([a-z]+)', hello:/g)].map(m => m[1]);
    assert.ok(ids.length >= 3, 'personagens não encontrados');
    for (const id of ids) assert.ok(MANIFEST[`voc_${id}_hello`], `voc_${id}_hello não existe`);
});

// Música é streaming (uma faixa por vez, nunca pré-carregada): o orçamento total é do repositório, e cada faixa
// tem um teto para começar rápido. Em 10/2026 as playlists ganharam 3 faixas por categoria (25 → 64 MB).
test('música total cabe no orçamento (< 64 MB, faixa < 4 MB) e efeitos curtos são pequenos', () => {
    const size = files => files.reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);
    const music = Object.values(MANIFEST).filter(e => e.kind === 'music' || e.kind === 'jingle').flatMap(e => e.files);
    assert.ok(size(music) < 64 * 1024 * 1024, `música: ${(size(music) / 1048576).toFixed(1)} MB`);
    for (const f of music) assert.ok(size([f]) < 4 * 1024 * 1024, `${f}: faixa grande demais`);
    for (const [key, entry] of Object.entries(MANIFEST)) {
        if (entry.kind !== 'sfx' && entry.kind !== 'voice') continue;
        for (const f of entry.files) assert.ok(size([f]) < 150 * 1024, `${key}: ${f} grande demais para pré-carregar`);
    }
});
