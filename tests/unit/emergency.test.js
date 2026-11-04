// Situação de emergência no fim de jogo: 3 "vidas", com ajuda e preço (GameOverSystem.declareEmergency).
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/data/missions.js', 'js/core/ResourceManager.js',
    'js/systems/EventSystem.js', 'js/systems/QuestSystem.js', 'js/systems/LoanManager.js', 'js/systems/GameOverSystem.js');
const ResourceManager = g('ResourceManager');
const EventSystem = g('EventSystem');
const QuestSystem = g('QuestSystem');
const LoanManager = g('LoanManager');
const GameOverSystem = g('GameOverSystem');
const win = g('window');
Object.assign(QuestSystem.prototype, { updateQuestUI() {}, playMissionCompletionAudio() {} });
win.PlayerProfile = { personalize: t => t, getActive: () => null };
win.document = { getElementById: () => null };

function game() {
    const notes = [];
    const gm = { gameTime: 0, timeScale: 1, gameState: 'playing', saved: 0, autoSave() { this.saved++; },
        uiManager: { showNotification: m => notes.push(m) }, buildingSystem: { getAllBuildings: () => [], buildings: new Map() } };
    gm.resourceManager = new ResourceManager(gm);
    gm.questSystem = new QuestSystem(gm);
    gm.eventSystem = new EventSystem(gm);
    gm.loanManager = new LoanManager(gm);
    gm.gameOverSystem = new GameOverSystem(gm);
    gm.gameOverSystem.showGameOverDialog = () => {};
    win.gameManager = gm;
    return { gm, gos: gm.gameOverSystem, res: gm.resourceManager.resources, notes };
}

test('sem água: declarar emergência traz água, dinheiro (empréstimo), calma e devolve o jogo', () => {
    const { gm, gos, res, notes } = game();
    res.water.current = 0;
    res.pollution.current = 95;
    gm.eventSystem.triggerEvent('pipe_leak'); // o vazamento cobra o custo dele na hora
    const budget = res.budget.current;
    gos.triggerGameOver('water_depleted');
    assert.strictEqual(gm.gameState, 'gameover');

    assert.ok(gos.declareEmergency());
    assert.strictEqual(gm.gameState, 'playing');
    assert.strictEqual(gos.isGameOver, false);
    assert.ok(res.water.max > 0);
    assert.strictEqual(res.water.current, res.water.max * GameOverSystem.EMERGENCY_WATER_RATIO);
    assert.strictEqual(res.pollution.current, GameOverSystem.EMERGENCY_POLLUTION);
    assert.strictEqual(res.budget.current - budget, [...gm.loanManager.loans.values()][0].principal);
    assert.strictEqual(gos.getEmergenciesLeft(), GameOverSystem.EMERGENCY_LIVES - 1);
    assert.ok(gm.saved > 0, 'salva o jogo que voltou');
    assert.ok(notes.some(n => n.includes('emergência')));
    // O vazamento acabou (Defesa Civil) e a intervenção do Estado começou
    assert.ok(!gm.eventSystem.hasActiveEventOfType('pipe_leak'));
    assert.ok(gm.eventSystem.hasActiveEventOfType('state_intervention'));
    assert.ok(gm.eventSystem.lastEventTime < 0, 'nenhum evento novo por um tempo');
});

test('o preço: empréstimo com juros maiores, confiança menor e satisfação mais baixa durante a intervenção', () => {
    const { gm, gos, res } = game();
    res.water.current = 0;
    gos.triggerGameOver('water_depleted');
    gos.declareEmergency();
    const loan = [...gm.loanManager.loans.values()][0];
    assert.ok(loan.emergency);
    assert.ok(loan.principal >= GameOverSystem.EMERGENCY_FUNDS_MIN);
    assert.ok(Math.abs(loan.annualInterestRate - gm.loanManager.calculateInterestRate() * GameOverSystem.EMERGENCY_RATE_FACTOR) < 1e-9, 'juros 50% acima do normal da cidade');
    assert.strictEqual(gm.questSystem.getReputation('government'), 50 + GameOverSystem.EMERGENCY_REPUTATION.government);
    assert.strictEqual(gm.questSystem.getReputation('citizens'), 50 + GameOverSystem.EMERGENCY_REPUTATION.citizens);
    assert.strictEqual(res.population.eventSatisfaction, -10);
    const intervention = [...gm.eventSystem.activeEvents.values()].find(e => e.type === 'state_intervention');
    gm.eventSystem.endEvent(intervention.id);
    assert.strictEqual(res.population.eventSatisfaction, 0, 'a intervenção acaba e a satisfação volta');
});

test('são só 3: depois o fim de jogo é de verdade; o número usado vai no save', () => {
    const { gos, res } = game();
    for (let i = 0; i < GameOverSystem.EMERGENCY_LIVES; i++) {
        res.water.current = 0;
        gos.triggerGameOver('water_depleted');
        assert.ok(gos.declareEmergency(), `declaração ${i + 1}`);
    }
    res.water.current = 0;
    gos.triggerGameOver('water_depleted');
    assert.strictEqual(gos.declareEmergency(), false);
    assert.strictEqual(gos.isGameOver, true);

    const other = game().gos;
    other.loadData(JSON.parse(JSON.stringify(gos.getSaveData())));
    assert.strictEqual(other.getEmergenciesLeft(), 0);
    other.loadData(undefined);
    assert.strictEqual(other.getEmergenciesLeft(), GameOverSystem.EMERGENCY_LIVES, 'save antigo: as 3 disponíveis');
});

test('sem fim de jogo não há o que declarar', () => {
    const { gos } = game();
    assert.strictEqual(gos.declareEmergency(), false);
});

// ===== Equilíbrio do empréstimo da intervenção =====
const crisis = income => {
    const ctx = game();
    ctx.res.budget.income = income;
    ctx.res.water.current = 0;
    ctx.gos.triggerGameOver('water_depleted');
    return ctx;
};

for (const income of [600, 1000, 3000, 10000, 40000]) {
    test(`receita de R$ ${income}/min: a parcela cabe e o dinheiro ajuda de verdade`, () => {
        const { gm, gos } = crisis(income);
        const terms = gos.getEmergencyLoan();
        const monthly = gm.loanManager.getMonthlyIncome();
        assert.ok(terms.funds >= GameOverSystem.EMERGENCY_FUNDS_MIN && terms.funds <= GameOverSystem.EMERGENCY_FUNDS_MAX);
        assert.ok(terms.months >= GameOverSystem.EMERGENCY_MONTHS_MIN && terms.months <= GameOverSystem.EMERGENCY_MONTHS_MAX);
        assert.ok(terms.payment / monthly <= 0.35, `parcela = ${Math.round(100 * terms.payment / monthly)}% da receita`);
        const interest = terms.payment * terms.months - terms.funds;
        assert.ok(interest > 0 && interest < terms.funds * 0.4, `juros de R$ ${Math.round(interest)}`);
    });
}

test('a primeira parcela só vem depois da carência da Defesa Civil', () => {
    const { gm, gos } = crisis(1000);
    gos.declareEmergency();
    const loan = [...gm.loanManager.loans.values()][0];
    assert.strictEqual(loan.nextPaymentAt, gm.gameTime + GameOverSystem.EMERGENCY_CALM_MS);
    gm.gameTime += GameOverSystem.EMERGENCY_CALM_MS - 1;
    assert.strictEqual(gm.loanManager.isPaymentDue(loan), false);
    gm.gameTime += 1;
    assert.strictEqual(gm.loanManager.isPaymentDue(loan), true);
});

test('as 3 declarações juntas não passam de 50% da receita', () => {
    const { gm, gos, res } = crisis(1000);
    for (let i = 0; i < GameOverSystem.EMERGENCY_LIVES; i++) {
        res.water.current = 0;
        gos.triggerGameOver('water_depleted');
        assert.ok(gos.declareEmergency());
    }
    const share = gm.loanManager.getMonthlyPayments() / gm.loanManager.getMonthlyIncome();
    assert.ok(share <= 0.5, `parcelas = ${Math.round(share * 100)}% da receita`);
});

test('atrasar: um aviso e um desconto no crédito por mês, não a cada tentativa', () => {
    const { gm, gos, res, notes } = crisis(1000);
    gos.declareEmergency();
    const lm = gm.loanManager;
    const loan = [...lm.loans.values()][0];
    res.budget.current = 0;
    const score = lm.getCreditScore();
    const late = () => notes.filter(n => n.includes('atraso')).length;
    for (let i = 0; i < 5; i++) {
        gm.gameTime = loan.nextPaymentAt;
        lm.processMonthlyPayments();
    }
    assert.strictEqual(late(), 1);
    assert.strictEqual(lm.getCreditScore(), score - 10);
    gm.gameTime += LoanManager.MONTH_MS;
    lm.processMonthlyPayments();
    assert.strictEqual(late(), 2, 'no mês seguinte avisa de novo');
});

test('a oferta mostra o mesmo valor que chega, e cada nova declaração traz menos', () => {
    const { gm, gos, res } = crisis(1000);
    const principals = [];
    for (let i = 0; i < GameOverSystem.EMERGENCY_LIVES; i++) {
        res.water.current = 0;
        gos.triggerGameOver('water_depleted');
        const offered = gos.getEmergencyLoan().funds;
        const before = gm.loanManager.loans.size;
        gos.declareEmergency();
        assert.strictEqual(gm.loanManager.loans.size, before + 1);
        const principal = [...gm.loanManager.loans.values()].pop().principal;
        assert.strictEqual(principal, offered);
        principals.push(principal);
    }
    assert.ok(principals[0] > principals[1] && principals[1] > principals[2], String(principals));
});
