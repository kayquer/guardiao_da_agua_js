// Fase 3: registro de pesquisa por perfil (ResearchLog) e aula ligada à missão concluída (LessonProgress.forMission).
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const setup = () => load('js/data/brazil.js', 'js/data/lessons.js', 'js/data/missions.js', 'js/systems/PlayerProfile.js',
    'js/systems/LessonProgress.js', 'js/systems/ResearchLog.js');

const ANA = { name: 'Ana', age: 12, uf: 'SP', city: 'Campinas' };

test('pesquisa: registros por perfil, com sessão e tempo de jogo', () => {
    const g = setup();
    const PlayerProfile = g('PlayerProfile'), ResearchLog = g('ResearchLog');
    const ana = PlayerProfile.create(ANA);
    g('window').gameManager = { gameTime: 12500 };
    ResearchLog.startSession('new');
    ResearchLog.record('quiz', { target: 'water_well', value: 50, ok: true });
    ResearchLog.record('event_decision', { target: 'drought', value: 'plan', tier: 'max', ok: true });
    ResearchLog.record('event_decision', { target: 'flood', value: 'none', tier: 'none', ok: false });
    const events = ResearchLog.entry().events;
    assert.strictEqual(events.length, 4);
    assert.strictEqual(events[0].type, 'session_start');
    assert.strictEqual(events[1].s, 1);
    assert.strictEqual(events[1].gt, 12.5, 'segundos de jogo');

    const s = ResearchLog.summary();
    assert.strictEqual(s.sessions, 1);
    assert.strictEqual(s.quizzesPassed, 1);
    assert.strictEqual(s.decisions, 2);
    assert.strictEqual(s.goodDecisions, 1);

    PlayerProfile.create({ ...ANA, name: 'Bia' }); // outro aluno: registro próprio, vazio
    assert.strictEqual(ResearchLog.entry().events.length, 0);
    PlayerProfile.activate(ana.id);
    ResearchLog.startSession('load');
    assert.strictEqual(ResearchLog.summary().sessions, 2);
});

test('pesquisa: tempo por página (páginas puladas não contam, tempo com teto)', () => {
    const g = setup();
    const ResearchLog = g('ResearchLog');
    g('PlayerProfile').create(ANA);
    const realNow = Date.now;
    let now = 1000;
    g('Date').now = () => now;
    try {
        ResearchLog.startPage('tutorial', 1, 'Boas-vindas, <b>{nome}</b>!');
        now += 8000;
        ResearchLog.startPage('tutorial', 1, 'Hidrosfera'); // fecha a anterior
        now += 100; // passou direto
        ResearchLog.startPage('book', 4, 'Mata ciliar');
        now += ResearchLog.MAX_PAGE_MS * 3; // aba esquecida
        ResearchLog.endPage();
    } finally {
        g('Date').now = realNow;
    }
    const pages = ResearchLog.entry().events.filter(e => e.type === 'page');
    assert.strictEqual(pages.length, 2);
    assert.strictEqual(pages[0].value, 8000);
    assert.strictEqual(pages[0].title, 'Boas-vindas, {nome}!', 'sem HTML');
    assert.strictEqual(pages[1].value, ResearchLog.MAX_PAGE_MS);
    assert.strictEqual(ResearchLog.endPage(), null, 'nada aberto');
});

test('pesquisa: exportação JSON e CSV sem o apelido; apagar o perfil apaga o registro', () => {
    const g = setup();
    const PlayerProfile = g('PlayerProfile'), ResearchLog = g('ResearchLog');
    const ana = PlayerProfile.create(ANA);
    ResearchLog.startSession('new');
    ResearchLog.record('quiz', { target: 'water_well', value: 50, ok: false, answers: [{ q: 1, chosen: 2, right: false }] });
    ResearchLog.record('page', { source: 'book', target: 2, title: 'Rios; "voadores"', value: 4000 });

    const json = ResearchLog.toJSON();
    assert.strictEqual(json.format, 'guardiao-da-agua-pesquisa');
    assert.strictEqual(json.profile.age, 12);
    assert.strictEqual(json.events.length, 3);
    assert.ok(!JSON.stringify(json).includes('Ana'), 'o apelido não sai no arquivo');

    const lines = ResearchLog.toCSV().split('\r\n');
    assert.strictEqual(lines.length, 4);
    assert.ok(lines[0].startsWith('perfil;idade;uf;cidade;data_hora;sessao'));
    const quiz = lines.find(l => l.includes(';quiz;'));
    assert.ok(quiz.includes(';water_well;') && quiz.includes(';50;0;'), quiz);
    assert.ok(quiz.includes('"{""answers"":[{""q"":1'), 'extras em JSON escapado');
    assert.ok(lines.some(l => l.includes('"Rios; ""voadores"""')), 'texto com ; e aspas fica entre aspas');
    assert.ok(!lines.join('\n').includes('Ana'));

    PlayerProfile.remove(ana.id);
    assert.strictEqual(ResearchLog.entry(ana.id).events.length, 0);
});

test('pesquisa: guarda no máximo MAX_EVENTS (os mais antigos saem)', () => {
    const g = setup();
    const ResearchLog = g('ResearchLog');
    g('PlayerProfile').create(ANA);
    g('ResearchLog.MAX_EVENTS = 5');
    for (let i = 0; i < 8; i++) ResearchLog.record('build', { target: `b${i}` });
    const events = ResearchLog.entry().events;
    assert.strictEqual(events.length, 5);
    assert.strictEqual(events[0].target, 'b3');
});

// Envio à planilha da pesquisa (ResearchSync): numeração dos registros, só o que falta, anônimo, consentimento
const setupSync = () => {
    const g = load('js/data/brazil.js', 'js/systems/PlayerProfile.js', 'js/systems/ResearchLog.js', 'js/systems/ResearchSync.js');
    const posts = [];
    let fail = false;
    g('ResearchSync').fetchImpl = async (url, opts) => {
        if (fail) throw new Error('offline');
        posts.push({ url, opts, body: JSON.parse(opts.body) });
        return { ok: true, json: async () => ({ ok: true }) };
    };
    return { g, posts, setFail: v => { fail = v; } };
};

test('pesquisa: cada registro ganha um número que nunca repete, mesmo quando os antigos saem', () => {
    const g = setup();
    const ResearchLog = g('ResearchLog');
    g('PlayerProfile').create(ANA);
    g('ResearchLog.MAX_EVENTS = 3');
    for (let i = 0; i < 5; i++) ResearchLog.record('build', { target: `b${i}` });
    assert.strictEqual(JSON.stringify(ResearchLog.entry().events.map(e => e.n)), "[3,4,5]");

    // Registro antigo (sem n): numerado na ordem e o próximo continua dali
    const key = ResearchLog.profileKey();
    g('localStorage').setItem(ResearchLog.STORAGE_KEY, JSON.stringify({ [key]: { sessions: 1, events: [{ type: 'a' }, { type: 'b' }] } }));
    assert.strictEqual(JSON.stringify(ResearchLog.entry().events.map(e => e.n)), "[1,2]");
    assert.strictEqual(ResearchLog.record('c').n, 3);
    assert.ok(ResearchLog.toCSV().split('\r\n')[0].endsWith(';registro'));
});

test('envio: anônimo (só id, idade e cidade), todos os perfis, só o que falta e em lotes', async () => {
    const { g, posts } = setupSync();
    const PlayerProfile = g('PlayerProfile'), ResearchLog = g('ResearchLog'), ResearchSync = g('ResearchSync');
    g('RESEARCH_SYNC.ENDPOINT = "https://script.google.com/macros/s/x/exec"; RESEARCH_SYNC.BATCH = 2');

    const ana = PlayerProfile.create(ANA);
    ResearchLog.startSession('new');
    ResearchLog.record('page', { title: 'Oi, Ana!', value: 2000, extra: { who: 'Ana' } });
    ResearchLog.record('quiz', { target: 'water_well', ok: true });
    const bia = PlayerProfile.create({ ...ANA, name: 'Bia', age: 11, city: 'Santos' });
    ResearchLog.record('build', { target: 'water_pump' });
    assert.strictEqual(ResearchSync.pendingCount(), 4);

    const result = await ResearchSync.syncAll();
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), { ok: true, sent: 4 });
    assert.strictEqual(posts.length, 3, 'Ana em 2 lotes de 2, Bia em 1');
    assert.strictEqual(posts[0].opts.method, 'POST');
    assert.strictEqual(posts[0].opts.headers['Content-Type'], 'text/plain;charset=utf-8', 'sem preflight CORS');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(posts[0].body.profile)), { id: ana.id, age: 12, city: 'Campinas' });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(posts[2].body.profile)), { id: bia.id, age: 11, city: 'Santos' });
    const all = JSON.stringify(posts.map(p => p.body));
    assert.ok(!all.includes('Ana') && !all.includes('Bia'), 'o apelido nunca sai');
    assert.ok(!all.includes('"uf"') && !all.includes('SP'), 'nem a UF');
    assert.ok(all.includes('Oi, {nome}!'));
    assert.strictEqual(ResearchSync.pendingCount(), 0);

    // Só o que é novo vai no próximo envio
    PlayerProfile.activate(ana.id);
    ResearchLog.record('mission_done', { target: 'm1' });
    await ResearchSync.syncAll();
    assert.strictEqual(posts.length, 4);
    assert.strictEqual(JSON.stringify(posts[3].body.events.map(e => e.type)), "[\"mission_done\"]");
    assert.ok(ResearchSync.lastSentAt());
});

test('envio: sem internet nada se perde; sem endpoint não envia; consentimento ligado por padrão', async () => {
    const { g, posts, setFail } = setupSync();
    const ResearchLog = g('ResearchLog'), ResearchSync = g('ResearchSync');
    g('PlayerProfile').create(ANA);
    ResearchLog.record('build', { target: 'water_pump' });

    g('RESEARCH_SYNC.ENDPOINT = ""');
    assert.strictEqual(ResearchSync.isConfigured(), false);
    assert.strictEqual((await ResearchSync.syncAll()).error, 'not_configured');
    assert.strictEqual(ResearchSync.start(), false, 'sem endpoint, nada de envio automático');

    g('RESEARCH_SYNC.ENDPOINT = "https://script.google.com/macros/s/x/exec"');
    setFail(true);
    const failed = await ResearchSync.syncAll();
    assert.strictEqual(failed.ok, false);
    assert.strictEqual(ResearchSync.pendingCount(), 1, 'continua esperando');
    setFail(false);
    assert.strictEqual((await ResearchSync.syncAll()).sent, 1);
    assert.strictEqual(posts.length, 1);

    assert.strictEqual(ResearchSync.hasConsent(), true, 'ligado por padrão nesta fase do estudo');
    assert.strictEqual(ResearchSync.autoEnabled(), true);
    ResearchSync.setConsent(false);
    assert.strictEqual(ResearchSync.autoEnabled(), false);
    assert.strictEqual(ResearchSync.start(), false);
    ResearchSync.setConsent(true);
    assert.strictEqual(ResearchSync.start(), true);
    ResearchSync.stop();
});

test('aulas: a missão concluída abre a aula ligada a ela; feita, vem a próxima que falta', () => {
    const g = setup();
    const LessonProgress = g('LessonProgress'), MISSIONS = g('MISSIONS'), LESSON_CHAPTERS = g('LESSON_CHAPTERS');
    g('PlayerProfile').create(ANA);
    // Toda missão com aula aponta para uma aula que existe, e nenhuma aula se repete
    const linked = Object.values(MISSIONS).map(m => m.lesson).filter(n => n !== undefined);
    linked.forEach(n => assert.ok(LESSON_CHAPTERS[n], `aula ${n}`));
    assert.strictEqual(new Set(linked).size, linked.length);

    assert.strictEqual(LessonProgress.forMission('tutorial_02'), MISSIONS.tutorial_02.lesson);
    LessonProgress.markDone(MISSIONS.tutorial_02.lesson);
    assert.strictEqual(LessonProgress.forMission('tutorial_02'), 1, 'já feita: a primeira que falta');
    assert.strictEqual(LessonProgress.forMission('final_01'), 1, 'missão sem aula: a próxima que falta');
    Object.keys(LESSON_CHAPTERS).forEach(n => LessonProgress.markDone(n));
    assert.strictEqual(LessonProgress.forMission('challenge_01'), null, 'todas feitas');
});

test('armazenamento: toda chave do jogo usa STORAGE_PREFIX (versões no mesmo Pages não se misturam)', () => {
    const fs = require('fs');
    const path = require('path');
    const g = load('js/systems/PlayerProfile.js', 'js/systems/LessonProgress.js', 'js/systems/ResearchLog.js',
        'js/systems/ResearchSync.js', 'js/systems/SaveSystem.js', 'js/systems/TextSize.js', 'js/systems/GraphicsQuality.js',
        'js/systems/WeatherService.js', 'js/systems/SimulatedWeather.js');
    const prefix = g('STORAGE_PREFIX');
    assert.match(prefix, /^[a-z_]+_$/);
    const keys = g(`[PlayerProfile.STORAGE_KEY, LessonProgress.STORAGE_KEY, ResearchLog.STORAGE_KEY, ResearchSync.CONSENT_KEY,
        ResearchSync.STATE_KEY, SaveSystem.KEY_PREFIX, TextSize.STORAGE_KEY, GraphicsQuality.STORAGE_KEY,
        WeatherService.CACHE_KEY, SimulatedWeather.STORAGE_KEY]`);
    keys.forEach(k => assert.ok(k.startsWith(prefix), k));
    // O aviso inicial roda antes de GameConstants: repete a chave do consentimento à mão
    const notice = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'ui', 'StartNotice.js'), 'utf8');
    assert.strictEqual(/CONSENT_KEY: '([^']+)'/.exec(notice)[1], g('ResearchSync.CONSENT_KEY'));
    // Nenhum outro arquivo do jogo grava chave fixa (fora o formato do save e as chaves antigas que ele apaga)
    const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []);
    const fixed = walk(path.join(__dirname, '..', '..', 'js'))
        .filter(f => !/(StartNotice|GameConstants)\.js$/.test(f)) // o aviso repete a chave; GameConstants define o prefixo
        .flatMap(f => (fs.readFileSync(f, 'utf8').match(/'guardiao_agua_[a-z_]+'/g) || []).map(m => `${path.basename(f)}: ${m}`))
        .filter(m => !/'guardiao_agua_save'|guardiao_agua_autosave|guardiao_agua_save_manual_save|guardiao_agua_save_list|'guardiao_agua_'/.test(m));
    assert.deepStrictEqual(fixed, []);
});
