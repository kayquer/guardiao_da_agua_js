// Cidade da abertura do menu (js/data/introCity.js + js/systems/intro/IntroLayout.js): layout válido,
// só prédios com modelo .glb real, tomadas da câmera coerentes e destaques do menu com ícones existentes.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/data/buildings.js', 'js/data/buildingModels.js', 'js/data/introCity.js',
    'js/utils/Icons.js', 'js/systems/intro/IntroLayout.js');
const CITY = g('INTRO_CITY');
const SHOTS = g('INTRO_SHOTS');
const BILLBOARD = g('MENU_BILLBOARD');
const MODELS = g('BUILDING_MODELS');
const layout = new (g('IntroLayout'))(CITY, g('BUILDING_TYPES'));

test('layout da cidade sem prédio no rio, na rua, sobreposto ou fora do mapa', () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(layout.errors)), []);
    assert.strictEqual(layout.buildings.length, CITY.buildings.length, 'algum prédio ficou de fora');
});

test('todo prédio da abertura usa um modelo .glb do jogo', () => {
    for (const [type] of CITY.buildings) assert.ok(MODELS[type], `${type} sem modelo em BUILDING_MODELS`);
});

test('a cidade mostra os recursos do jogo: água, tratamento, energia limpa e serviços', () => {
    const types = new Set(CITY.buildings.map(b => b[0]));
    for (const t of ['treatment_plant', 'water_pump', 'floating_garden', 'wind_farm', 'solar_farm',
        'hydroelectric_plant', 'city_hall', 'hospital', 'university', 'park', 'school']) {
        assert.ok(types.has(t), `falta ${t}`);
    }
    const kinds = new Set(layout.kind.flat());
    for (const k of ['river', 'bank', 'road', 'bridge', 'plaza']) assert.ok(kinds.has(k), `sem célula ${k}`);
    assert.ok(layout.trees.length > 500, 'cidade sem mata');
});

test('o layout é determinístico (mesma semente, mesma cidade)', () => {
    const again = new (g('IntroLayout'))(CITY, g('BUILDING_TYPES'));
    assert.strictEqual(JSON.stringify(again.trees.slice(0, 50)), JSON.stringify(layout.trees.slice(0, 50)));
});

test('tomadas: 15–25 s no total', () => {
    const total = SHOTS.shots.reduce((sum, s) => sum + s.ms, 0);
    assert.ok(total >= 15000 && total <= 25000, `abertura com ${total} ms`);
    for (const s of SHOTS.shots) {
        assert.ok(s.points.length >= 2, 'tomada precisa de 2+ pontos');
        for (const p of s.points) {
            assert.strictEqual(p.pos.length, 3);
            assert.strictEqual(p.look.length, 3);
        }
    }
});

test('destaques do menu usam ícones que existem (js/utils/Icons.js)', () => {
    const files = g('UI_ICON_FILES');
    assert.ok(BILLBOARD.length >= 2);
    for (const b of BILLBOARD) {
        assert.ok(files[b.icon], `ícone inexistente: ${b.icon}`);
        assert.ok(b.title && b.text && b.tag);
    }
});
