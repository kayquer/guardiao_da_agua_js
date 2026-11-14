// Prefeitura (11/2026): impostos por grupo (CityFinance) e funcionários (CityStaff) — regras puras, sem DOM.
// Objetos do vm comparam via JSON.stringify.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/data/cityHall.js', 'js/systems/CityFinance.js', 'js/systems/CityStaff.js');
const CityFinance = g('CityFinance');
const CityStaff = g('CityStaff');
const TAX_GROUPS = g('TAX_GROUPS');
const TAX_LEVELS = g('TAX_LEVELS');
const STAFF_ROLES = g('STAFF_ROLES');
const STAFF_LEVEL_XP = g('STAFF_LEVEL_XP');
const STAFF_NAMES = g('STAFF_NAMES');

/** GameManager de mentira com o que os sistemas leem. */
function fakeGame({ population = 30, budget = 100000, satisfaction = 70 } = {}) {
    const gm = {
        gameTime: 0,
        buildings: [],
        resourceManager: {
            resources: { population: { current: population, satisfaction }, budget: { current: budget, income: 2000, expenses: 500 }, pollution: { current: 20 }, water: { aquifer: 80, river: 90 } },
            spendBudget(amount) {
                if (this.resources.budget.current < amount) return false;
                this.resources.budget.current -= amount;
                return true;
            }
        },
        buildingSystem: { getAllBuildings: () => gm.buildings, markEfficiencyDirty() {} },
        questSystem: { stakeholderReputation: { business: 50 } }
    };
    return gm;
}

// ===== IMPOSTOS =====

test('impostos: 5 níveis com receita 0,6 → 1,4 e normal no meio', () => {
    assert.strictEqual(JSON.stringify(TAX_LEVELS.map(l => l.revenue)), '[0.6,0.8,1,1.2,1.4]');
    const f = new CityFinance();
    for (const group of CityFinance.GROUPS) assert.strictEqual(f.revenue(group), 1);
});

test('impostos: a penalidade cresce mais rápido que o ganho dos dois lados do normal (sem escolha falsa)', () => {
    const s = TAX_GROUPS.residents.satisfaction; // [6, 3, 0, -4, -11]
    assert.ok(Math.abs(s[4] - s[3]) > Math.abs(s[3] - s[2]), 'de alto para muito alto perde mais satisfação');
    assert.ok(Math.abs(s[3]) > Math.abs(s[1]), 'subir um passo custa mais do que descer um rende');
    for (const group of ['commerce', 'industry']) {
        const growth = TAX_GROUPS[group].growth;
        assert.ok(1 - growth[4] > growth[0] - 1, `${group}: muito alto freia mais que muito baixo acelera`);
        // muito alto: receita × eficiência ainda sobe, mas menos que o nível (o crescimento lento cobra depois)
        assert.ok(1.4 * (1 + TAX_GROUPS[group].efficiency[4]) < 1.4);
    }
});

test('impostos: mudar tem espera de 1 mês de jogo e a satisfação acompanha devagar', () => {
    const f = new CityFinance();
    assert.ok(f.setLevel('residents', 'alto', 0).ok);
    const again = f.setLevel('residents', 'muito_alto', 30000);
    assert.strictEqual(again.ok, false);
    assert.match(again.reason, /Mude de novo/);
    assert.ok(f.setLevel('residents', 'muito_alto', CityFinance.CHANGE_COOLDOWN_MS + 1).ok);
    assert.strictEqual(f.setLevel('residents', 'muito_alto', 1e9).ok, false, 'mesmo nível não conta como mudança');
    // satisfação: vai até −11 aos poucos (não de uma vez)
    const gm = fakeGame();
    f.tick(1000, gm);
    assert.ok(f.satisfactionNow() < 0 && f.satisfactionNow() > -11);
    for (let i = 0; i < 400; i++) f.tick(1000, gm);
    assert.strictEqual(f.satisfactionNow(), -11);
});

test('impostos: assistente social alivia a reclamação do imposto alto (não o bônus do imposto baixo)', () => {
    const f = new CityFinance();
    f.levels.residents = 'muito_alto';
    assert.strictEqual(f.satisfactionTarget(0.5), -5.5);
    f.levels.residents = 'muito_baixo';
    assert.strictEqual(f.satisfactionTarget(0.5), 6);
});

test('impostos: grupos de prédio, crescimento, eficiência e prévia', () => {
    assert.strictEqual(CityFinance.groupOf({ zoneType: 'industrial', category: 'industrial' }), 'industry');
    assert.strictEqual(CityFinance.groupOf({ zoneType: 'commercial', category: 'commercial' }), 'commerce');
    assert.strictEqual(CityFinance.groupOf({ taxGroup: 'tourism' }), 'commerce');
    assert.strictEqual(CityFinance.groupOf({ category: 'water' }), null);
    const f = new CityFinance();
    f.levels.industry = 'muito_alto';
    assert.strictEqual(f.growth('industrial'), 0.7);
    assert.strictEqual(f.growth('commercial'), 1);
    assert.strictEqual(f.efficiencyBonus({ zoneType: 'industrial', category: 'industrial' }), -0.1);
    assert.strictEqual(f.efficiencyBonus({ category: 'water' }), 0);
    const p = f.preview('residents', 'alto', { residents: 1000 });
    assert.strictEqual(p.revenueDelta, 200);
    assert.strictEqual(p.satisfaction, -4);
    const back = f.preview('industry', 'normal', { industry: 1400 });
    assert.strictEqual(back.revenueDelta, -400);
});

test('impostos: comércio/indústria alto tira confiança das empresas aos poucos; save volta igual', () => {
    const f = new CityFinance();
    f.levels.commerce = 'muito_alto';
    const gm = fakeGame();
    for (let i = 0; i < 60; i++) f.tick(1000, gm);
    assert.ok(Math.abs(gm.questSystem.stakeholderReputation.business - (50 - 0.75)) < 1e-6);
    const back = new CityFinance();
    back.loadData(JSON.parse(JSON.stringify(f.getSaveData())));
    assert.strictEqual(back.levels.commerce, 'muito_alto');
    assert.strictEqual(back.changedAt.residents, -Infinity, 'JSON transforma -Infinity em null: volta a -Infinity');
    const old = new CityFinance();
    old.loadData(null);
    assert.strictEqual(old.levels.residents, 'normal');
});

// ===== FUNCIONÁRIOS =====

test('vagas: base fixas; especialistas liberam pela população e ganham +1 a cada 500', () => {
    assert.strictEqual(CityStaff.cap('obras', 0), 3);
    assert.strictEqual(CityStaff.cap('assistente_social', 149), 0);
    assert.strictEqual(CityStaff.cap('assistente_social', 150), 1);
    assert.strictEqual(CityStaff.cap('assistente_social', 650), 2);
    assert.strictEqual(CityStaff.cap('geografo', 899), 0);
    assert.strictEqual(CityStaff.cap('geografo', 1200), 1);
    // todo especialista libera durante a campanha (a missão final pede 1.200 moradores)
    for (const [id, r] of Object.entries(STAFF_ROLES)) {
        if (r.group === 'specialist') assert.ok(r.cap.unlockAt <= 1200, `${id} libera depois do fim da campanha`);
    }
});

test('contratar: cobra 1 mês de salário, respeita vagas e dinheiro; demitir corta a folha', () => {
    const gm = fakeGame({ budget: 1000 });
    const staff = new CityStaff();
    assert.strictEqual(CityStaff.hireCost('obras'), 160); // R$ 80/min × 2 min
    let seq = 0;
    const rng = () => [0.2, 0.1, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9][seq++ % 8];
    const a = staff.hire('obras', gm, rng);
    assert.ok(a.ok);
    assert.strictEqual(gm.resourceManager.resources.budget.current, 840);
    assert.strictEqual(staff.payroll(), 80);
    staff.hire('obras', gm, rng);
    staff.hire('obras', gm, rng);
    const fourth = staff.canHire('obras', gm);
    assert.strictEqual(fourth.ok, false);
    assert.strictEqual(staff.canHire('eng_civil', gm).ok, false);
    assert.match(staff.canHire('eng_civil', gm).reason, /Libera com 400 moradores/);
    const poor = new CityStaff();
    assert.match(poor.canHire('obras', fakeGame({ budget: 10 })).reason, /Falta dinheiro/);
    staff.fire(a.person.id);
    assert.strictEqual(staff.payroll(), 160);
    assert.strictEqual(staff.bonus('slots'), 2);
});

test('pessoa sorteada: gênero, nome brasileiro sem repetir no quadro, variante de retrato numerada', () => {
    const taken = [];
    for (let i = 0; i < 40; i++) {
        const p = CityStaff.randomPerson('eng_ambiental', Math.random, taken);
        assert.ok(['f', 'm'].includes(p.gender));
        const [first] = p.name.split(' ');
        assert.ok(STAFF_NAMES[p.gender].includes(first), `${first} não é um nome ${p.gender}`);
        assert.ok(Number.isInteger(p.variant) && p.variant >= 1, 'variante é um número');
        assert.strictEqual(p.portrait, `staff/eng_ambiental-${p.gender}-${p.variant}`);
        assert.ok(!/parda|branca|preta|amarela|indigena/.test(JSON.stringify(p)), 'nada de cor/raça nos dados da pessoa');
        assert.ok(!taken.includes(p.name) || i > 30);
        taken.push(p.name);
    }
    assert.strictEqual(CityStaff.title({ role: 'eng_ambiental', gender: 'f' }), 'Engenheira ambiental');
    // chance igual entre as variantes prontas (sem manifesto: só a 1)
    assert.strictEqual(JSON.stringify(CityStaff.portraitVariants('obras', 'm')), '[1]');
});

test('progressão: só ganha experiência com o número indo bem; sobe de nível; salário +15%, bônus sobe mais', () => {
    const gm = fakeGame({ satisfaction: 70 });
    const staff = new CityStaff();
    gm.resourceManager.resources.population.current = 200;
    const { person } = staff.hire('assistente_social', gm);
    // satisfação boa e parada (≥ 60, não caindo): conta
    for (let i = 0; i < 3 * 60; i++) { gm.gameTime += 1000; staff.tick(1000, gm); }
    assert.strictEqual(person.level, 2);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(staff.takeEvents())), [{ type: 'level', id: person.id, level: 2 }]);
    // satisfação ruim: não evolui (e não perde)
    gm.resourceManager.resources.population.satisfaction = 40;
    const xp = person.xp;
    for (let i = 0; i < 120; i++) { gm.gameTime += 1000; staff.tick(1000, gm); }
    assert.strictEqual(person.xp, xp);
    assert.strictEqual(person.level, 2);
    // nível 5: salário × 1,6 e bônus maior que o crescimento do salário
    person.level = 5;
    const r = STAFF_ROLES.assistente_social;
    assert.strictEqual(CityStaff.salaryOf(person), Math.round(r.salary * 1.6));
    assert.ok(r.bonus.satisfaction[4] / r.bonus.satisfaction[0] > 1.6);
    assert.strictEqual(STAFF_LEVEL_XP.reduce((a, b) => a + b, 0), 28, '~28 min de jogo bom do nível 1 ao 5');
});

test('bônus de todo cargo cresce do nível 1 ao 5 mais que o salário (sensação de conquista) e tem teto', () => {
    for (const [id, r] of Object.entries(STAFF_ROLES)) {
        for (const [key, v] of Object.entries(r.bonus)) {
            if (!Array.isArray(v)) continue;
            assert.strictEqual(v.length, 5, `${id}.${key}: um valor por nível`);
            for (let i = 1; i < 5; i++) assert.ok(v[i] >= v[i - 1], `${id}.${key} não pode cair de nível`);
            assert.ok(v[4] / v[0] >= 1.6, `${id}.${key}: L5/L1 ≥ 1,6 (o salário sobe 1,6×)`);
        }
    }
    const staff = new CityStaff();
    staff.staff = [1, 2, 3].map(i => ({ id: `x${i}`, role: 'eng_civil', level: 5 }));
    assert.strictEqual(staff.bonus('buildCost'), CityStaff.BONUS_CAP.buildCost);
});

test('serviços gerais consertam aos poucos o estrago de enchente; save/load guarda o quadro', () => {
    const gm = fakeGame();
    const staff = new CityStaff();
    staff.hire('servicos', gm);
    const b = { damageFactor: 0.5, config: { name: 'x' } };
    gm.buildings.push(b);
    for (let i = 0; i < 60; i++) staff.tick(1000, gm);
    assert.ok(Math.abs(b.damageFactor - 0.54) < 1e-6, 'nível 1: +4% por minuto');
    const back = new CityStaff();
    back.loadData(JSON.parse(JSON.stringify(staff.getSaveData())));
    assert.strictEqual(back.staff.length, 1);
    assert.strictEqual(back.staff[0].role, 'servicos');
    assert.strictEqual(back.payroll(), staff.payroll());
    const old = new CityStaff();
    old.loadData({ staff: [{ role: 'cargo_que_nao_existe' }, { role: 'obras', level: 9 }] });
    assert.strictEqual(old.staff.length, 1);
    assert.strictEqual(old.staff[0].level, 5);
});
