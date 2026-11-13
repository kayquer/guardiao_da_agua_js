// Figuras do caderno de campo: render de cada espécie (kits Props Brasil e Fauna Ameaçada, CC0) recortado em
// quadrado e convertido para WebP em assets/images/fauna/<id>.webp. Uso: node scripts/fauna-thumbs.js
// (precisa de ../kit-props-brasil-lowpoly e ../kit-fauna-ameacada-lowpoly com os previews gerados e do ffmpeg).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PROPS_KIT = path.join(ROOT, '..', 'kit-props-brasil-lowpoly');
const FAUNA_KIT = path.join(ROOT, '..', 'kit-fauna-ameacada-lowpoly');
const OUT = path.join(ROOT, 'assets', 'images', 'fauna');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${fs.readFileSync(path.join(ROOT, 'js/data/props.js'), 'utf8')}\n${fs.readFileSync(path.join(ROOT, 'js/data/fieldNotebook.js'), 'utf8')}\nthis.T = PROP_TYPES; this.N = FIELD_NOTEBOOK;`, ctx);

fs.mkdirSync(OUT, { recursive: true });
const missing = [];
for (const id of Object.keys(ctx.N)) {
    const type = ctx.T[id];
    const src = type.kit
        ? path.join(FAUNA_KIT, 'previews', `${type.kit.slice('fauna/'.length)}.jpg`)
        : ['fauna', 'natureza', 'rio'].map(cat => path.join(PROPS_KIT, 'previews', cat, `${id}.jpg`)).find(f => fs.existsSync(f));
    if (!src || !fs.existsSync(src)) { missing.push(id); continue; }
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', "crop='min(iw,ih)':'min(iw,ih)',scale=240:240", '-q:v', '72', path.join(OUT, `${id}.webp`)]);
}
console.log(`figuras: ${Object.keys(ctx.N).length - missing.length} em ${OUT}`);
if (missing.length) { console.error('sem render:', missing.join(', ')); process.exit(1); }
