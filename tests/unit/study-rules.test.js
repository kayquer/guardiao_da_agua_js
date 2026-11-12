// Regras de estudo e prova (STUDY_RULES em js/config/GameConstants.js → StudySystem.rules()).
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

function setup(rules) {
    const g = load('js/systems/StudySystem.js');
    if (rules) g(`Object.assign(STUDY_RULES, ${JSON.stringify(rules)})`);
    const StudySystem = g('StudySystem');
    const study = new StudySystem({});
    study.studyContent.set('ete', { pages: [{}, {}, {}], quiz: { enabled: true, passingScore: 50, questions: [] } });
    study.contentLoaded = true;
    study.saveProgress = () => {};
    return { g, StudySystem, study };
}

test('padrão da versão: estudo e prova obrigatórios, "Continuar e desbloquear" da 2ª reprovação', () => {
    const { StudySystem, study } = setup();
    assert.strictEqual(JSON.stringify(StudySystem.rules()), JSON.stringify({ study: 'obrigatorio', quiz: 'obrigatorio', unlockAfterFailures: 2 }));
    assert.strictEqual(StudySystem.continueAfterFailures(), 2);
    assert.strictEqual(study.isStudyUnlocked('ete'), false, 'prédio com estudo começa bloqueado');
    study.startStudy('ete');
    assert.strictEqual(study.skipCurrent('study'), false, 'obrigatório não pula');
    assert.strictEqual(study.skipCurrent('quiz'), false);
    assert.strictEqual(study.isStudyUnlocked('ete'), false);
});

test('valor desconhecido vira obrigatório; UNLOCK_AFTER_FAILURES 0 = só passando', () => {
    const { StudySystem } = setup({ STUDY: 'talvez', QUIZ: 'Opcional', UNLOCK_AFTER_FAILURES: 0 });
    const r = StudySystem.rules();
    assert.strictEqual(r.study, 'obrigatorio');
    assert.strictEqual(r.quiz, 'obrigatorio');
    assert.strictEqual(StudySystem.continueAfterFailures(), null);
});

test('estudo pulável: continua bloqueado, mas pular libera e vai para o registro da pesquisa', () => {
    const { g, study } = setup({ STUDY: 'pulavel', QUIZ: 'opcional' });
    const records = [];
    g('globalThis').ResearchLog = { record: (type, data) => records.push({ type, ...data }) };
    assert.strictEqual(study.isStudyUnlocked('ete'), false);
    study.startStudy('ete');
    study.currentPage = 1;
    assert.strictEqual(study.skipCurrent('quiz'), true, 'prova opcional também pula');
    assert.strictEqual(study.isStudyUnlocked('ete'), true);
    assert.strictEqual(JSON.stringify(records), JSON.stringify([{ type: 'quiz_skip', target: 'ete', value: 2 }]));
});

test('prova pulável: "Continuar e desbloquear" já na 1ª reprovação; estudo obrigatório não pula a leitura', () => {
    const { StudySystem, study } = setup({ QUIZ: 'pulavel' });
    assert.strictEqual(StudySystem.continueAfterFailures(), 1);
    study.startStudy('ete');
    assert.strictEqual(study.skipCurrent('study'), false);
    assert.strictEqual(study.skipCurrent('quiz'), true);
    assert.strictEqual(study.isStudyUnlocked('ete'), true);
});

test('estudo opcional: nada fica bloqueado por estudo (a árvore tecnológica continua valendo)', () => {
    const { study } = setup({ STUDY: 'opcional' });
    assert.strictEqual(study.isStudyUnlocked('ete'), true);
    assert.strictEqual(study.isBuildingUnlocked('ete'), true);
    study.gameManager = { techTree: { isReached: () => false } };
    assert.strictEqual(study.isBuildingUnlocked('ete'), false, 'tecnologia não atingida segura o prédio');
});

test('a sessão da pesquisa anota as regras de estudo e prova', () => {
    const g = load('js/systems/PlayerProfile.js', 'js/systems/StudySystem.js', 'js/systems/ResearchLog.js');
    g(`Object.assign(STUDY_RULES, { STUDY: 'pulavel', QUIZ: 'opcional' })`);
    const rec = g('ResearchLog').startSession('new');
    assert.strictEqual(rec.study, 'pulavel');
    assert.strictEqual(rec.quiz, 'opcional');
});
