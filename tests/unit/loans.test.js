const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/core/ResourceManager.js', 'js/systems/LoanManager.js');
const ResourceManager = g('ResourceManager');
const LoanManager = g('LoanManager');

function setup() {
    const gm = {};
    gm.resourceManager = new ResourceManager(gm);
    gm.loanManager = new LoanManager(gm);
    return gm;
}

test('parcela pela tabela Price', () => {
    const lm = setup().loanManager;
    assert.strictEqual(lm.calculateMonthlyPayment(10000, 12, 0.06).toFixed(2), '860.66');
    assert.strictEqual(lm.calculateMonthlyPayment(1200, 12, 0), 100);
});

test('empréstimo aprovado credita o orçamento e registra a dívida', () => {
    const gm = setup();
    const before = gm.resourceManager.resources.budget.current;
    const result = gm.loanManager.requestLoan(3000, 12);
    assert.strictEqual(result.approved, true);
    assert.strictEqual(gm.resourceManager.resources.budget.current, before + 3000);
    assert.strictEqual(gm.loanManager.getTotalDebt(), 3000);
});

test('empréstimo acima de 5x a receita mensal é recusado', () => {
    const gm = setup();
    const income = gm.resourceManager.resources.budget.income;
    assert.strictEqual(gm.loanManager.requestLoan(income * 5 + 1, 12).approved, false);
});

test('parcela continua sendo cobrada depois de salvar e carregar o jogo', () => {
    const gm = setup();
    gm.loanManager.requestLoan(3000, 12);
    gm.gameTime = 0;

    const restored = setup();
    restored.loanManager.loadData(JSON.parse(JSON.stringify(gm.loanManager.saveData())));
    const before = restored.resourceManager.resources.budget.current;
    restored.gameTime = LoanManager.MONTH_MS - 1;
    restored.loanManager.processMonthlyPayments();
    assert.strictEqual(restored.resourceManager.resources.budget.current, before, 'antes de vencer não cobra');
    restored.gameTime = LoanManager.MONTH_MS;
    restored.loanManager.processMonthlyPayments();

    assert.ok(restored.resourceManager.resources.budget.current < before, 'parcela não foi cobrada');
});

test('parcela vence a cada mês de jogo (tempo de jogo, não calendário) e o atraso não repete a cada quadro', () => {
    const gm = setup();
    gm.gameTime = 0;
    gm.loanManager.requestLoan(3000, 12);
    const loan = gm.loanManager.loans.get('loan_1');
    assert.strictEqual(loan.nextPaymentAt, LoanManager.MONTH_MS);

    gm.gameTime = LoanManager.MONTH_MS;
    gm.loanManager.processMonthlyPayments();
    assert.strictEqual(loan.remainingMonths, 11);
    assert.strictEqual(loan.nextPaymentAt, 2 * LoanManager.MONTH_MS);

    gm.resourceManager.resources.budget.current = 0;
    const score = gm.loanManager.getCreditScore();
    gm.gameTime = 2 * LoanManager.MONTH_MS;
    gm.loanManager.processMonthlyPayments();
    gm.loanManager.processMonthlyPayments();
    assert.strictEqual(gm.loanManager.getCreditScore(), score - 10, 'um atraso, não um por chamada');
});

test('save antigo (nextPaymentDate com data real) vence um mês de jogo depois de carregar', () => {
    const gm = setup();
    gm.gameTime = 50000;
    gm.loanManager.loadData({ loans: [['loan_1', { id: 'loan_1', status: 'active', startDate: '2026-01-01', nextPaymentDate: '2026-02-01', paymentHistory: [] }]] });
    assert.strictEqual(gm.loanManager.loans.get('loan_1').nextPaymentAt, 50000 + LoanManager.MONTH_MS);
});
