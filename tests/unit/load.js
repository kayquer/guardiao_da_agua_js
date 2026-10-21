// Carrega scripts do jogo (globais, sem ES modules) num contexto isolado do Node.
// Uso: const g = load('js/core/ResourceManager.js'); new (g('ResourceManager'))(...)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const silent = { log() {}, warn() {}, info() {}, debug() {}, error() {} };

function load(...files) {
    const store = new Map();
    const ctx = {
        console: silent,
        location: { search: '' },
        performance: { now: () => Date.now() },
        localStorage: {
            getItem: k => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: k => store.delete(k)
        },
        structuredClone,
        URLSearchParams,
        setTimeout,
        clearTimeout
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    for (const f of ['js/config/GameConstants.js', ...files]) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
    }
    // const/class de topo são lexicais: só acessíveis avaliando o nome no contexto
    return expr => vm.runInContext(expr, ctx);
}

module.exports = { load, ROOT };
