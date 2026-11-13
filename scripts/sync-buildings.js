// Copia os prédios do Kit Prédios Brasil Low Poly (repo próprio, gerado no Blender: github.com/kayquer/kit-predios-brasil-lowpoly)
// para models/buildings/brasil/<grupo>/<id>.glb. Uso: node scripts/sync-buildings.js [<pasta do kit>]
// (padrão: ../kit-predios-brasil-lowpoly). Entram só os arquivos usados em js/data/buildingModels.js e js/data/zoneLots.js
// ('brasil/...'); .glb de models/buildings/brasil/ que ninguém usa é apagado. A licença (CC0) vai junto como License.txt.
// Depois: atualize `tris` em buildingModels.js se o kit mudou e rode npm run test:unit (models.test.js, zones.test.js).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const KIT = path.resolve(process.argv[2] || path.join(ROOT, '..', 'kit-predios-brasil-lowpoly'));
const OUT = path.join(ROOT, 'models', 'buildings', 'brasil');

const ctx = {};
vm.createContext(ctx);
for (const f of ['buildingModels.js', 'zoneLots.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', f), 'utf8'), ctx);
vm.runInContext('this.M = BUILDING_MODELS; this.Z = ZONE_LOTS;', ctx);

const wanted = new Set();
Object.values(ctx.M).forEach(m => { if (m.file.startsWith('brasil/')) wanted.add(m.file); });
Object.values(ctx.Z).forEach(lot => lot.stages.flat().forEach(p => { if (p.file.startsWith('brasil/')) wanted.add(p.file); }));

const missing = [];
for (const file of wanted) {
    const src = path.join(KIT, 'models', file.slice('brasil/'.length));
    if (!fs.existsSync(src)) { missing.push(file); continue; }
    const dest = path.join(OUT, file.slice('brasil/'.length));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
}
fs.copyFileSync(path.join(KIT, 'LICENSE'), path.join(OUT, 'License.txt'));

let removed = 0;
(function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        const rel = 'brasil/' + path.relative(OUT, full).split(path.sep).join('/');
        if (entry.name.endsWith('.glb') && !wanted.has(rel)) { fs.unlinkSync(full); removed++; }
    }
})(OUT);
console.log(`prédios: ${wanted.size - missing.length} copiados de ${KIT}, ${removed} removidos`);
if (missing.length) {
    console.error(`faltam no kit: ${missing.join(', ')}`);
    process.exit(1);
}
