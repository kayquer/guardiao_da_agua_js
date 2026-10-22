// Põe ?v=<hash do conteúdo> nos <script src="js/..."> e <link href="css/..."> do index.html.
// Sem isso o navegador mistura arquivo velho do cache com arquivo novo e o jogo quebra no boot.
// Uso: node scripts/cache-bust.js          → atualiza o index.html
//      node scripts/cache-bust.js --check  → só confere (sai com 1 se algum hash estiver velho)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const ASSET = /(<(?:script|link)\b[^>]*?\b(?:src|href)=")((?:js|css)\/[^"?]+)(?:\?v=[^"]*)?(")/g;

// CRLF → LF antes do hash: no Windows (core.autocrlf) o checkout vem com CRLF e o hash
// não bateria com o do CI (Linux, LF), que reprova o --check.
const hash = file => crypto.createHash('sha1')
    .update(fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n'))
    .digest('hex').slice(0, 8);

const html = fs.readFileSync(INDEX, 'utf8');
const stale = [];
const updated = html.replace(ASSET, (tag, before, file, after) => {
    const next = `${before}${file}?v=${hash(file)}${after}`;
    if (next !== tag) stale.push(file);
    return next;
});

if (process.argv.includes('--check')) {
    if (stale.length) {
        console.error(`index.html com versão desatualizada: ${stale.join(', ')}\nRode: npm run cache-bust`);
        process.exit(1);
    }
} else if (stale.length) {
    fs.writeFileSync(INDEX, updated);
    console.log(`cache-bust: ${stale.length} arquivo(s) com versão nova`);
}
