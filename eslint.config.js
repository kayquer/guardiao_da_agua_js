// Sem ES modules: cada arquivo é um <script> e enxerga os globais dos outros.
// Os globais do projeto são lidos dos scripts que o index.html carrega, então usar
// uma classe de um arquivo que não está no index.html vira erro de no-undef.
const fs = require('fs');
const globals = require('globals');

const scripts = [...fs.readFileSync('index.html', 'utf8').matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
const projectGlobals = {};
for (const file of scripts) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/^(?:(?:class|const|let|var|function)\s+|window\.)([A-Za-z_$][\w$]*)/gm)) {
        projectGlobals[m[1]] = 'readonly';
    }
}

module.exports = [
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { ...globals.browser, ...projectGlobals, BABYLON: 'readonly' }
        },
        rules: {
            'no-undef': 'error',
            'no-redeclare': ['error', { builtinGlobals: false }],
            'no-dupe-class-members': 'error',
            'no-dupe-keys': 'error',
            'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }]
        }
    },
    {
        files: ['tests/**/*.js', '*.config.js'],
        languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } }
    }
];
