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
    assert.strictEqual(res.budget.current - budget, GameOverSystem.EMERGENCY_FUNDS);
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
    assert.strictEqual(loan.principal, GameOverSystem.EMERGENCY_FUNDS);
    assert.ok(loan.annualInterestRate > gm.loanManager.config.baseInterestRate);
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
