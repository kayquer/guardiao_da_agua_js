// Tabela de modelos .glb dos prédios (js/data/buildingModels.js): referências, arquivos, orçamento, licença
// e regras dos modelos próprios (models/buildings/blender/, gerados por script no Blender).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/data/buildings.js', 'js/data/buildingModels.js', 'js/data/zoneLots.js');
const BUILDINGS = g('BUILDING_TYPES');
const MODELS = g('BUILDING_MODELS');
// Peças dos lotes das zonas (js/data/zoneLots.js) também são modelos da Kenney em uso
const ZONE_FILES = new Set(Object.values(g('ZONE_LOTS')).flatMap(lot => lot.stages.flat())
    .map(piece => piece.file).filter(file => file.endsWith('.glb')));
const MODELS_DIR = path.join(ROOT, 'models', 'buildings');
const MAX_TRIANGLES = 1500;

/** JSON do .glb (primeiro chunk) e total de triângulos de todas as primitivas. */
function readGlb(file) {
    const data = fs.readFileSync(file);
    assert.strictEqual(data.readUInt32LE(0), 0x46546c67, `${file} não é um .glb`);
    const json = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString('utf8'));
    let triangles = 0;
    for (const mesh of json.meshes || []) {
        for (const p of mesh.primitives) {
            const accessor = json.accessors[p.indices ?? p.attributes.POSITION];
            triangles += Math.floor(accessor.count / 3);
        }
    }
    return { json, triangles };
}

test('todo modelo é de um prédio que existe e tem os campos válidos', () => {
    for (const [id, entry] of Object.entries(MODELS)) {
        assert.ok(BUILDINGS[id], `modelo para prédio inexistente: ${id}`);
        assert.ok(typeof entry.file === 'string' && entry.file.endsWith('.glb'), `${id}.file`);
        for (const key of ['scale', 'rotationY', 'yOffset']) {
            if (key in entry) assert.ok(Number.isFinite(entry[key]), `${id}.${key} deve ser número`);
        }
        if ('tint' in entry) assert.match(entry.tint, /^#[0-9a-f]{6}$/i, `${id}.tint`);
    }
});

// Modelos próprios: models/buildings/blender/<id>.glb, gerados no Blender por _src/<id>.py (regeráveis)
const BLENDER_DIR = path.join(MODELS_DIR, 'blender');
const isBlender = entry => entry.file.startsWith('blender/');
const MAX_BLENDER_KB = 150;

test('peças de água, tratamento e energia não usam modelo de kit (só modelo próprio do Blender)', () => {
    // Regra de quando só havia a Kenney: nenhum prédio do pack representa bem bomba, ETA, usina...
    // Exceção: a caixa d'água da Kenney É uma caixa d'água (veio da antiga categoria Armazenamento, hoje em Água)
    const KIT_OK = new Set(['water_tower']);
    for (const [id, entry] of Object.entries(MODELS)) {
        const { category } = BUILDINGS[id];
        if (['water', 'treatment', 'power'].includes(category) && !KIT_OK.has(id)) {
            assert.ok(isBlender(entry), `${id} (${category}) só pode usar modelo próprio em blender/, não ${entry.file}`);
        }
    }
});

test('modelo próprio fica em blender/, tem o script gerador ao lado, cores chapadas e ≤ 150 KB', () => {
    assert.ok(fs.existsSync(path.join(BLENDER_DIR, '_src', 'lib.py')), 'falta blender/_src/lib.py');
    for (const [id, entry] of Object.entries(MODELS).filter(([, e]) => isBlender(e))) {
        const rel = entry.file.slice('blender/'.length);
        assert.ok(!rel.includes('/'), `${id}: modelo próprio direto em blender/ (${entry.file})`);
        const name = rel.replace(/\.glb$/, '');
        assert.ok(fs.existsSync(path.join(BLENDER_DIR, '_src', `${name}.py`)), `${id}: falta o gerador blender/_src/${name}.py`);
        const file = path.join(MODELS_DIR, entry.file);
        const kb = fs.statSync(file).size / 1024;
        assert.ok(kb <= MAX_BLENDER_KB, `${id}: ${kb.toFixed(1)} KB (máximo ${MAX_BLENDER_KB})`);
        const { json } = readGlb(file);
        assert.ok(!(json.images || []).length, `${id}: modelo próprio usa só cor de material, sem textura`);
    }
    // Todo .glb da pasta está na tabela e todo gerador tem seu .glb
    const used = new Set(Object.values(MODELS).map(e => e.file));
    for (const f of fs.readdirSync(BLENDER_DIR).filter(f => f.endsWith('.glb'))) {
        assert.ok(used.has(`blender/${f}`), `blender/${f} não é usado em BUILDING_MODELS`);
    }
    for (const f of fs.readdirSync(path.join(BLENDER_DIR, '_src')).filter(f => f.endsWith('.py'))) {
        if (['lib.py', 'gerar_todos.py'].includes(f)) continue;
        assert.ok(fs.existsSync(path.join(BLENDER_DIR, f.replace(/\.py$/, '.glb'))), `_src/${f} sem o .glb gerado`);
    }
});

test('arquivo existe, cabe no orçamento de triângulos e a contagem anotada confere', () => {
    for (const [id, entry] of Object.entries(MODELS)) {
        const file = path.join(MODELS_DIR, entry.file);
        assert.ok(fs.existsSync(file), `${id}: ${entry.file} não existe`);
        const { json, triangles } = readGlb(file);
        assert.ok(triangles <= MAX_TRIANGLES, `${id}: ${triangles} triângulos (máximo ${MAX_TRIANGLES})`);
        assert.strictEqual(entry.tris, triangles, `${id}: tris anotado ${entry.tris}, arquivo tem ${triangles}`);
        // Texturas externas (colormap da Kenney) são buscadas ao lado do .glb
        for (const image of json.images || []) {
            if (image.uri) {
                assert.ok(fs.existsSync(path.join(path.dirname(file), decodeURIComponent(image.uri))),
                    `${id}: textura ${image.uri} não existe`);
            }
        }
    }
});

test('todo kit da Kenney no repositório leva a licença CC0', () => {
    const kenney = path.join(MODELS_DIR, 'kenney');
    for (const kit of fs.readdirSync(kenney)) {
        const license = path.join(kenney, kit, 'License.txt');
        assert.ok(fs.existsSync(license), `${kit}: sem License.txt`);
        assert.match(fs.readFileSync(license, 'utf8'), /Creative Commons Zero, CC0/, `${kit}: licença não é CC0`);
    }
});

test('peças dos lotes das zonas existem, são da Kenney e cabem no orçamento de triângulos', () => {
    assert.ok(ZONE_FILES.size > 0);
    for (const file of ZONE_FILES) {
        assert.ok(file.startsWith('kenney/'), `zona usa modelo de kit da Kenney: ${file}`);
        const full = path.join(MODELS_DIR, file);
        assert.ok(fs.existsSync(full), `${file} não existe`);
        const { json, triangles } = readGlb(full);
        assert.ok(triangles <= MAX_TRIANGLES, `${file}: ${triangles} triângulos (máximo ${MAX_TRIANGLES})`);
        for (const image of json.images || []) {
            if (image.uri) assert.ok(fs.existsSync(path.join(path.dirname(full), decodeURIComponent(image.uri))), `${file}: textura ${image.uri}`);
        }
    }
});

test('nenhum .glb da Kenney sobrando sem uso na tabela', () => {
    const used = new Set([...Object.values(MODELS).map(e => e.file), ...ZONE_FILES]);
    const kenney = path.join(MODELS_DIR, 'kenney');
    for (const kit of fs.readdirSync(kenney)) {
        for (const f of fs.readdirSync(path.join(kenney, kit)).filter(f => f.endsWith('.glb'))) {
            assert.ok(used.has(`kenney/${kit}/${f}`), `kenney/${kit}/${f} não é usado em BUILDING_MODELS nem em ZONE_LOTS`);
        }
    }
});
