// Servidor local do jogo (npm start), sem dependências. Manda Cache-Control: no-cache em tudo: o navegador sempre
// confere se o arquivo mudou (ETag → 304, sem baixar de novo), então o index.html nunca fica velho e os ?v= dele
// valem na hora. Atende Range porque a música e os ambientes tocam por streaming (HTMLAudio).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary',
    '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};

function resolve(url) {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
    } catch {
        return null;
    }
    const file = path.join(ROOT, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
    return file === ROOT || file.startsWith(ROOT + path.sep) ? file : null; // nada fora da pasta do jogo
}

/**
 * build-info.json (versão no rodapé do aviso inicial, js/ui/StartNotice.js): no GitHub Pages o workflow
 * (.github/workflows/pages.yml) grava o arquivo; aqui ele sai do git na hora, com os mesmos campos.
 */
function buildInfo() {
    const { execFileSync } = require('child_process');
    const git = (...args) => {
        try {
            return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        } catch {
            return '';
        }
    };
    let release = '';
    try {
        release = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '';
    } catch { /* sem package.json */ }
    return {
        release,
        branch: git('rev-parse', '--abbrev-ref', 'HEAD') || 'local',
        build: Number(git('rev-list', '--count', 'HEAD')) || 0,
        commit: git('rev-parse', '--short', 'HEAD'),
        date: git('log', '-1', '--format=%cI'),
        local: true
    };
}

const server = http.createServer((req, res) => {
    if (/\/build-info\.json$/.test(req.url.split('?')[0])) {
        res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(buildInfo()));
        return;
    }
    const file = resolve(req.url);
    fs.stat(file || '', (error, stat) => {
        if (error || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Não encontrado');
            return;
        }
        const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
        const headers = {
            'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
            'Accept-Ranges': 'bytes',
            ETag: etag
        };
        if (req.headers['if-none-match'] === etag) {
            res.writeHead(304, headers);
            res.end();
            return;
        }
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        let start = 0, end = stat.size - 1, status = 200;
        if (range && (range[1] || range[2])) {
            if (range[1]) {
                start = Number(range[1]);
                if (range[2]) end = Math.min(Number(range[2]), end);
            } else {
                start = Math.max(0, stat.size - Number(range[2])); // bytes=-N: os últimos N
            }
            if (start > end) {
                res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
                res.end();
                return;
            }
            status = 206;
            headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
        }
        headers['Content-Length'] = stat.size ? end - start + 1 : 0;
        res.writeHead(status, headers);
        if (req.method === 'HEAD' || !stat.size) {
            res.end();
            return;
        }
        fs.createReadStream(file, { start, end }).pipe(res);
    });
});

server.listen(PORT, () => console.log(`Guardião da Água em http://localhost:${PORT}/`));
