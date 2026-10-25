/**
 * Gera assets/icons/svg/*.svg, assets/icons/icons.json e assets/icons/index.html (catálogo).
 * Uso: node assets/icons/_src/generate.js
 *
 * Cada definição: { id, area, emoji: [...], title, used: [...arquivos], sm?: () => corpo, lg?: () => corpo }
 * Com as duas versões: <id>.svg (grande, 128) e <id>-sm.svg (pequena, 32). Só uma: <id>.svg.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { svg } = require('./core');

const defs = [
    ...require('./icons-ui'),
    ...require('./icons-res-states'),
    ...require('./icons-cat-weather'),
    ...require('./icons-buildings'),
    ...require('./icons-content'),
    ...require('./icons-achievements')
];

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'svg');
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.svg')) fs.unlinkSync(path.join(OUT, f));

const LIMIT = { sm: 2048, lg: 8192 };
const manifest = {};
const seen = new Set();
const warnings = [];
let nSm = 0, nLg = 0;

for (const d of defs) {
    if (seen.has(d.id)) throw new Error('id duplicado: ' + d.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.id)) throw new Error('id fora de kebab-case: ' + d.id);
    seen.add(d.id);
    const files = {};
    const both = d.sm && d.lg;
    for (const size of ['lg', 'sm']) {
        if (!d[size]) continue;
        const base = size === 'sm' && both ? `${d.id}-sm` : d.id;
        const title = d.title + (size === 'sm' && both ? '' : '');
        const out = svg(base, size, title, d[size]());
        const bytes = Buffer.byteLength(out);
        if (bytes > LIMIT[size]) warnings.push(`${base}.svg: ${bytes} B (limite ${LIMIT[size]})`);
        fs.writeFileSync(path.join(OUT, base + '.svg'), out);
        files[size] = `svg/${base}.svg`;
        size === 'sm' ? nSm++ : nLg++;
    }
    manifest[d.id] = {
        title: d.title,
        area: d.area,
        emoji: d.emoji,
        usedIn: d.used,
        size: both ? 'both' : (d.lg ? 'lg' : 'sm'),
        files
    };
}

fs.writeFileSync(path.join(ROOT, 'icons.json'), JSON.stringify(manifest, null, 2) + '\n');

// ---------- Catálogo ----------
const AREAS = {
    hud: 'HUD e recursos',
    ui: 'Botões, status e painéis',
    cat: 'Categorias de construção',
    weather: 'Clima',
    building: 'Prédios',
    mission: 'Missões',
    lesson: 'Aulas',
    ach: 'Conquistas'
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
let sections = '';
for (const [key, label] of Object.entries(AREAS)) {
    const items = Object.entries(manifest).filter(([, m]) => m.area === key);
    if (!items.length) continue;
    sections += `<section><h2>${label} <small>${items.length}</small></h2><div class="grid">`;
    for (const [id, m] of items) {
        const imgs = bg => [
            m.files.lg ? `<img src="${m.files.lg}" width="96" height="96" alt="">` : '',
            m.files.sm ? `<img src="${m.files.sm}" width="24" height="24" alt="">` : '',
            !m.files.lg && m.files.sm ? `<img src="${m.files.sm}" width="48" height="48" alt="" class="zoom">` : ''
        ].join('');
        sections += `<figure class="card ${m.files.lg ? 'has-lg' : 'only-sm'}" data-id="${id}">` +
            `<div class="pair"><div class="light">${imgs()}</div><div class="dark">${imgs()}</div></div>` +
            `<figcaption><b>${esc(id)}</b><span>${esc(m.title)}</span><i>${m.emoji.join(' ')} · ${m.size}</i></figcaption></figure>`;
    }
    sections += '</div></section>';
}

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catálogo de Ícones</title>
<style>
:root { --ink:#1a1a1a; --bg:#f4f8fb; --card:#fff; --muted:#5b6770; --blue:#00D4FF; --yellow:#FFD700; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Lilita One', 'Trebuchet MS', system-ui, sans-serif; background: var(--bg); color: var(--ink); }
header { padding: 20px 16px; background: var(--blue); border-bottom: 3px solid var(--ink); }
header h1 { margin: 0; font-size: 28px; }
header p { margin: 6px 0 0; font-family: system-ui, sans-serif; font-size: 14px; }
main { padding: 8px 16px 40px; max-width: 1400px; margin: 0 auto; }
h2 { font-size: 22px; margin: 24px 0 10px; }
h2 small { font-size: 14px; background: var(--yellow); border: 2px solid var(--ink); border-radius: 10px; padding: 0 8px; vertical-align: middle; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.card { margin: 0; background: var(--card); border: 3px solid var(--ink); border-radius: 12px; box-shadow: 4px 4px 0 var(--ink); overflow: hidden; }
.pair { display: grid; grid-template-columns: 1fr 1fr; }
.pair > div { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 112px; padding: 8px; }
.light { background: #ffffff; }
.dark { background: #1f2a36; border-left: 3px solid var(--ink); }
.only-sm .pair > div { min-height: 72px; }
figcaption { border-top: 3px solid var(--ink); padding: 6px 10px; display: grid; font-family: system-ui, sans-serif; font-size: 12px; }
figcaption b { font-size: 13px; }
figcaption span { color: var(--muted); }
figcaption i { font-style: normal; color: var(--muted); }
.toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.toolbar button { font: inherit; font-size: 14px; border: 3px solid var(--ink); border-radius: 10px; background: var(--yellow); box-shadow: 3px 3px 0 var(--ink); padding: 4px 12px; cursor: pointer; }
body.paused img { animation-play-state: paused; }
</style>
</head>
<body>
<header>
<h1>Guardião da Água · Ícones</h1>
<p>${nSm + nLg} arquivos SVG (${nLg} grandes de 128, ${nSm} pequenos de 32). Grandes mostrados a 96 px; pequenos a 24 px (e 48 px quando só existe a versão pequena). Fundo claro à esquerda, escuro à direita.</p>
</header>
<main>${sections}</main>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'index.html'), html);

console.log(`ícones: ${Object.keys(manifest).length} | pequenos: ${nSm} | grandes: ${nLg}`);
if (warnings.length) console.log('AVISOS de tamanho:\n  ' + warnings.join('\n  '));
