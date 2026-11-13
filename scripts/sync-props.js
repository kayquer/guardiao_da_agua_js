// Copia os props do Kit Props Brasil Low Poly (repo próprio, gerado no Blender) para models/props/, e os bichos
// marcados com `kit: 'fauna/<grupo>/<id>'` do Kit Fauna Ameaçada Low Poly (../kit-fauna-ameacada-lowpoly).
// Uso: node scripts/sync-props.js [<pasta do kit de props>] [<pasta do kit de fauna>]
// Só entram os tipos de js/data/props.js (models/props/<file>, sem as pastas de categoria dos kits);
// .glb de models/props/ que não está mais na tabela é apagado. Depois: npm run test:unit (props.test.js).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const KIT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'kit-props-brasil-lowpoly'));
const FAUNA_KIT = path.resolve(process.argv[3] || path.join(ROOT, '..', 'kit-fauna-ameacada-lowpoly'));
const OUT = path.join(ROOT, 'models', 'props');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${fs.readFileSync(path.join(ROOT, 'js', 'data', 'props.js'), 'utf8')}\nthis.T = PROP_TYPES;`, ctx);
const types = ctx.T;

// O kit guarda models/<categoria>/<id>.glb: acha cada arquivo pelo nome em qualquer categoria
const found = new Map();
(function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.glb')) found.set(entry.name, full);
    }
})(path.join(KIT, 'models'));

fs.mkdirSync(OUT, { recursive: true });
const missing = [];
const wanted = new Set();
for (const [id, type] of Object.entries(types)) {
    wanted.add(type.file);
    const src = type.kit?.startsWith('fauna/')
        ? path.join(FAUNA_KIT, 'models', `${type.kit.slice('fauna/'.length)}.glb`)
        : found.get(type.file);
    if (src && !fs.existsSync(src)) { missing.push(id); continue; }
    if (!src) { missing.push(id); continue; }
    fs.copyFileSync(src, path.join(OUT, type.file));
}
let removed = 0;
for (const file of fs.readdirSync(OUT)) {
    if (file.endsWith('.glb') && !wanted.has(file)) {
        fs.unlinkSync(path.join(OUT, file));
        removed++;
    }
}
console.log(`props: ${wanted.size - missing.length} copiados de ${KIT}, ${removed} removidos`);
if (missing.length) {
    console.error(`faltam no kit: ${missing.join(', ')}`);
    process.exit(1);
}
