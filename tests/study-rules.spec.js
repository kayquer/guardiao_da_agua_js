const { test, expect } = require('@playwright/test');
const { startGame } = require('./helpers');

// STUDY_RULES (js/config/GameConstants.js): estudo e prova obrigatórios, puláveis ou opcionais.
// O objeto é uma const mutável: cada teste troca as regras na página antes de abrir o livro.
test.skip(({ isMobile }) => isMobile, 'livro e menu de construção iguais no celular; basta o desktop');

const STUDY = 'monitoring_station'; // 4 páginas + prova de 2 questões

async function play(page, rules) {
    const problems = [];
    page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
    await startGame(page);
    await page.evaluate(() => window.gameManager.tutorialSystem.complete());
    await page.waitForFunction(() => window.gameManager.studySystem.contentLoaded);
    await page.evaluate(r => Object.assign(STUDY_RULES, r), rules);
    return problems;
}

const unlocked = page => page.evaluate(id => window.gameManager.studySystem.isBuildingUnlocked(id), STUDY);
const studyEvents = page => page.evaluate(() => ResearchLog.entry().events.filter(e => /_skip$/.test(e.type)).map(e => e.type));

test('obrigatório: sem botão de pular; o prédio só libera concluindo', async ({ page }) => {
    const problems = await play(page, { STUDY: 'obrigatorio', QUIZ: 'obrigatorio' });
    expect(await unlocked(page)).toBe(false);
    await page.evaluate(id => window.gameManager.uiManager.openStudyBook(id), STUDY);
    await expect(page.locator('#study-book-overlay .skip-btn')).toHaveCount(0);
    expect(problems).toEqual([]);
});

test('estudo pulável com prova obrigatória: "Pular para a prova" leva à prova, que não pula', async ({ page }) => {
    const problems = await play(page, { STUDY: 'pulavel', QUIZ: 'obrigatorio' });
    await page.evaluate(id => window.gameManager.uiManager.openStudyBook(id), STUDY);
    const skip = page.locator('#study-book-overlay .skip-btn');
    await expect(skip).toHaveText(/Pular para a prova/);
    await skip.click();
    await expect(page.locator('#study-book-overlay .quiz-container')).toBeVisible();
    await expect(page.locator('#study-book-overlay .skip-btn')).toHaveCount(0);
    expect(await unlocked(page)).toBe(false);
    expect(problems).toEqual([]);
});

test('estudo pulável: "Pular o estudo" libera na hora e fica no registro da pesquisa', async ({ page }) => {
    const problems = await play(page, { STUDY: 'pulavel', QUIZ: 'pulavel' });
    await page.evaluate(id => window.gameManager.uiManager.openStudyBook(id), STUDY);
    await page.locator('#study-book-overlay .skip-btn', { hasText: 'Pular o estudo' }).click();
    await expect(page.locator('#study-book-overlay')).toHaveCount(0);
    expect(await unlocked(page)).toBe(true);
    expect(await studyEvents(page)).toEqual(['study_skip']);
    expect(problems).toEqual([]);
});

test('prova pulável: "Pular a prova" na última página libera', async ({ page }) => {
    const problems = await play(page, { STUDY: 'obrigatorio', QUIZ: 'pulavel' });
    await page.evaluate(id => {
        const gm = window.gameManager;
        gm.uiManager.openStudyBook(id);
        const ss = gm.studySystem;
        ss.currentPage = ss.getStudyContent(id).pages.length - 1;
        gm.uiManager.showStudyBookInterface(ss.getStudyContent(id));
    }, STUDY);
    await page.locator('#study-book-overlay .skip-btn', { hasText: 'Pular a prova' }).click();
    await expect(page.locator('#study-book-overlay')).toHaveCount(0);
    expect(await unlocked(page)).toBe(true);
    expect(await studyEvents(page)).toEqual(['quiz_skip']);
    expect(problems).toEqual([]);
});

test('prova opcional: "Concluir" sem responder libera; respondendo errado mostra a revisão e libera', async ({ page }) => {
    const problems = await play(page, { STUDY: 'obrigatorio', QUIZ: 'opcional' });
    const toQuiz = () => page.evaluate(id => {
        const gm = window.gameManager;
        gm.uiManager.openStudyBook(id);
        const ss = gm.studySystem;
        ss.currentPage = ss.getStudyContent(id).pages.length - 1;
        gm.uiManager.showStudyBookInterface(ss.getStudyContent(id));
    }, STUDY);
    await toQuiz();
    await expect(page.locator('#study-book-overlay .quiz-optional')).toBeVisible();
    await page.locator('#study-book-overlay .complete-btn').click();
    await expect(page.locator('#study-book-overlay')).toHaveCount(0);
    expect(await unlocked(page)).toBe(true);

    // De novo, agora respondendo tudo errado: nota + onde errou, e o botão de seguir (sem "Tentar de novo")
    await page.waitForTimeout(500);
    await toQuiz();
    await page.evaluate(() => {
        const ss = window.gameManager.studySystem;
        ss.getQuiz().questions.forEach((q, i) => ss.submitQuizAnswer(q.id ?? i, (q.correctAnswer + 1) % q.options.length));
    });
    await page.locator('#study-book-overlay .complete-btn').click();
    await expect(page.locator('.quiz-results.quiz-failed .quiz-review')).toBeVisible();
    await expect(page.locator('#study-book-overlay .retry-btn')).toHaveCount(0);
    await expect(page.locator('#study-book-overlay .study-finish-btn')).toBeVisible();
    expect(problems).toEqual([]);
});

test('estudo opcional: prédio livre e "Ler o estudo (opcional)" no menu de construção', async ({ page }) => {
    const problems = await play(page, { STUDY: 'opcional', QUIZ: 'obrigatorio' });
    // O estudo não segura mais; a árvore tecnológica continua valendo (aqui marcada como atingida)
    expect(await page.evaluate(id => window.gameManager.studySystem.isStudyUnlocked(id), STUDY)).toBe(true);
    expect(await unlocked(page)).toBe(false);
    await page.evaluate(id => window.gameManager.techTree.markReached(id), STUDY);
    expect(await unlocked(page)).toBe(true);
    await page.evaluate(id => window.gameManager.uiManager.focusBuildingItem(id), STUDY);
    const link = page.locator('#build-info-content [data-action="study"]');
    await expect(link).toHaveText(/Ler o estudo \(opcional\)/);
    await expect(page.locator('#build-info-construct')).not.toHaveText(/Estudar/);
    await link.click();
    await expect(page.locator('#study-book-overlay')).toBeVisible();
    await expect(page.locator('#study-book-overlay .skip-btn')).toHaveCount(0);
    expect(problems).toEqual([]);
});

// Leitura em duas camadas (pages[].more): o bloco completo vem fechado, fora do texto que o "ouvir" lê
test('estudo da usina a carvão: "Para saber mais" fechado, com números e fontes, fora da camada curta', async ({ page }) => {
    const problems = await play(page, { STUDY: 'obrigatorio', QUIZ: 'obrigatorio' });
    expect(await page.evaluate(() => window.gameManager.studySystem.isStudyUnlocked('coal_plant'))).toBe(false);
    await page.evaluate(() => window.gameManager.uiManager.openStudyBook('coal_plant'));
    const more = page.locator('#study-book-overlay details.study-more');
    await expect(more).toHaveCount(1);
    await expect(more).not.toHaveAttribute('open', '');
    await expect(more.locator('summary')).toHaveText(/Para saber mais \(com números e fontes\)/i);
    await expect(page.locator('#study-book-overlay .page-text details')).toHaveCount(0);
    expect(await page.locator('#study-book-overlay .page-text').innerText()).not.toMatch(/\d/);
    await more.locator('summary').click();
    await expect(more).toHaveAttribute('open', '');
    await expect(more.locator('.study-more-body')).toContainText(/%/);
    await expect(more.locator('.more-src')).toContainText(/Fonte/);
    // Página seguinte: o bloco volta fechado
    await page.locator('#study-book-overlay .next-btn').click();
    await expect(page.locator('#study-book-overlay details.study-more')).not.toHaveAttribute('open', '');
    expect(problems).toEqual([]);
});
