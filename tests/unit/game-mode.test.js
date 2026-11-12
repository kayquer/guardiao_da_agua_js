// Modo de jogo (js/config/GameMode.js): pesquisa (escolas) × loja (10 a 99+). Tudo o que muda entre as versões é
// configuração: regras de estudo, aviso, cadastro, clima padrão, registro de pesquisa e bônus de leitura.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

test('modo: ?modo= na URL troca; nome desconhecido fica no padrão; os dois modos têm os mesmos campos', () => {
    const g = load();
    const GameMode = g('GameMode');
    const MODES = g('GAME_MODES');
    assert.strictEqual(GameMode.resolve('?modo=loja', 'pesquisa'), 'loja');
    assert.strictEqual(GameMode.resolve('?x=1&modo=PESQUISA', 'loja'), 'pesquisa');
    assert.strictEqual(GameMode.resolve('?modo=steam', 'pesquisa'), 'pesquisa');
    assert.strictEqual(GameMode.resolve('', 'loja'), 'loja');
    assert.strictEqual(GameMode.resolve('', 'inexistente'), 'pesquisa');
    assert.strictEqual(JSON.stringify(Object.keys(MODES.loja).sort()), JSON.stringify(Object.keys(MODES.pesquisa).sort()));
    // a pesquisa continua como sempre foi; a loja não trava prédio por leitura nem coleta dados
    assert.strictEqual(MODES.pesquisa.study.STUDY, 'obrigatorio');
    assert.strictEqual(MODES.pesquisa.noticeEveryStart, true);
    assert.strictEqual(MODES.loja.study.STUDY, 'opcional');
    assert.strictEqual(MODES.loja.research, false);
    assert.strictEqual(g('STUDY_RULES.STUDY'), MODES[g('GAME_MODE')].study.STUDY, 'STUDY_RULES vem do modo');
});

test('cadastro: na pesquisa tudo é obrigatório; na loja só o apelido (idade, estado e cidade opcionais)', () => {
    const g = load('js/data/brazil.js', 'js/systems/PlayerProfile.js');
    const PlayerProfile = g('PlayerProfile');
    assert.strictEqual(PlayerProfile.validate({ name: 'Ana', age: '', uf: '', city: '' }, 'completo').length, 3);
    assert.strictEqual(PlayerProfile.validate({ name: 'Ana', age: '', uf: '', city: '' }, 'apelido').length, 0);
    assert.strictEqual(PlayerProfile.validate({ name: 'Ana', age: '', uf: 'XX', city: 'Lisboa' }, 'apelido').length, 0, 'fora do Brasil');
    assert.strictEqual(PlayerProfile.validate({ name: '', age: '', uf: '', city: '' }, 'apelido').length, 1, 'apelido continua obrigatório');
    assert.strictEqual(PlayerProfile.validate({ name: 'Ana', age: '2', uf: '', city: '' }, 'apelido').length, 1, 'idade dada precisa ser possível');
    const p = PlayerProfile.create({ name: 'Ana', age: '', uf: 'XX', city: 'Lisboa' });
    assert.strictEqual(p.age, null);
    assert.strictEqual(PlayerProfile.describe(p), 'Lisboa');
    assert.strictEqual(PlayerProfile.describe({ age: 40, uf: 'SP', city: 'Campinas' }), '40 anos · Campinas/SP');
    assert.strictEqual(PlayerProfile.describe({ age: null, uf: 'XX', city: '' }), 'fora do Brasil');
    assert.strictEqual(PlayerProfile.describe({ age: null, uf: null, city: '' }), '');
});

test('loja: estudo lido até o fim dá bônus de eficiência; pulado não; na pesquisa não existe', () => {
    const g = load('js/systems/StudySystem.js');
    const StudySystem = g('StudySystem');
    const study = new StudySystem({});
    study.currentStudy = 'water_pump';
    study.completeStudy('water_pump');
    assert.strictEqual(study.getReadingBonus('water_pump'), 0, 'pesquisa: estudo obrigatório, sem bônus');
    g("STUDY_RULES.STUDY = 'opcional'; GameMode.current = () => GAME_MODES.loja");
    assert.strictEqual(study.getReadingBonus('water_pump'), g('GAME_MODES.loja.readingBonus'));
    study.currentStudy = 'water_well';
    study.skipCurrent('study');
    assert.strictEqual(study.getReadingBonus('water_well'), 0, 'pulou: libera, mas não conta como lido');
    const saved = JSON.parse(JSON.stringify(study.getSaveData()));
    const again = new StudySystem({});
    again.loadSaveData(saved);
    assert.ok(again.readStudies.has('water_pump') && !again.readStudies.has('water_well'));
});

test('loja: sem registro de pesquisa nem envio; clima simulado como padrão', () => {
    const g = load('js/systems/ResearchLog.js', 'js/systems/ResearchSync.js', 'js/systems/SimulatedWeather.js');
    assert.strictEqual(g('SimulatedWeather.mode()'), 'real', 'pesquisa: clima real da cidade');
    g('GameMode.current = () => GAME_MODES.loja');
    assert.strictEqual(g("ResearchLog.record('build', { target: 'x' })"), null);
    assert.strictEqual(g('ResearchSync.isConfigured()'), false);
    assert.strictEqual(g('SimulatedWeather.mode()'), 'simulated');
    g("SimulatedWeather.setMode('real')");
    assert.strictEqual(g('SimulatedWeather.mode()'), 'real', 'a escolha do jogador vale mais que o padrão');
});
