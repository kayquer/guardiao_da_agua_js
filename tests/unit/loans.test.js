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
    gm.loanManager.loans.get('loan_1').nextPaymentDate = new Date(Date.now() - 1000);

    const restored = setup();
    restored.loanManager.loadData(JSON.parse(JSON.stringify(gm.loanManager.saveData())));
    const before = restored.resourceManager.resources.budget.current;
    restored.loanManager.processMonthlyPayments();

    assert.ok(restored.resourceManager.resources.budget.current < before, 'parcela não foi cobrada');
});
