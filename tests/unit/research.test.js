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
