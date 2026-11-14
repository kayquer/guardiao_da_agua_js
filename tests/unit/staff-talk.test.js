// Falas dos funcionários da prefeitura (js/data/staffTalk.js) e o sorteio/marcadores (js/systems/StaffTalk.js).
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./load');

const g = load('js/data/cityHall.js', 'js/data/staffTalk.js', 'js/systems/StaffTalk.js');
const STAFF_ROLES = g('STAFF_ROLES');
const STAFF_TALK = g('STAFF_TALK');
const STAFF_TALK_VARS = g('STAFF_TALK_VARS');
const STAFF_TALK_WHEN = g('STAFF_TALK_WHEN');
const STAFF_LEVEL_UP = g('STAFF_LEVEL_UP');
const StaffTalk = g('StaffTalk');

const roles = Object.keys(STAFF_ROLES);
const linesOf = role => {
    const t = STAFF_TALK[role];
    return [...t.intro.map(text => ({ text })), ...t.day, ...t.work, ...t.tips];
};
// Valor de mentira para toda variável conhecida
const fakeVars = role => Object.fromEntries([...STAFF_TALK_VARS.common, ...(STAFF_TALK_VARS[role] || [])].map(k => [k, `<${k}>`]));

test('todo cargo tem falas: apresentação, ≥ 6 do dia, ≥ 4 do trabalho (boas e paradas), ≥ 4 dicas', () => {
    for (const role of roles) {
        const t = STAFF_TALK[role];
        assert.ok(t, `${role} sem falas`);
        assert.ok(t.intro.length >= 1, `${role}: sem apresentação`);
        assert.ok(t.day.length >= 6, `${role}: ${t.day.length} falas do dia`);
        assert.ok(t.work.length >= 4, `${role}: ${t.work.length} falas do trabalho`);
        assert.ok(t.work.filter(l => l.when === 'good').length >= 2, `${role}: poucas falas de trabalho indo bem`);
        assert.ok(t.work.filter(l => l.when === 'bad').length >= 2, `${role}: poucas falas de trabalho parado`);
        assert.ok(t.tips.length >= 4, `${role}: ${t.tips.length} dicas`);
        assert.ok(t.tips.some(l => !l.when), `${role}: precisa de um conselho geral (dica sem when)`);
        assert.ok(t.tips.some(l => l.when === 'calm'), `${role}: precisa de uma dica de cidade tranquila`);
        // a apresentação tem 2 frases e o trabalho mostra o número do cargo
        t.intro.forEach(text => assert.ok((text.match(/[.!?](\s|$)/g) || []).length >= 2, `${role}: apresentação com menos de 2 frases`));
        t.work.forEach(l => assert.ok(StaffTalk.varsUsed(l.text).some(v => (STAFF_TALK_VARS[role] || []).includes(v)),
            `${role}: fala de trabalho sem número ao vivo: ${l.text}`));
    }
    assert.strictEqual(Object.keys(STAFF_TALK).filter(r => !STAFF_ROLES[r]).length, 0, 'falas de cargo que não existe');
});

test('`when` só com etiquetas conhecidas', () => {
    for (const role of roles) {
        const t = STAFF_TALK[role];
        for (const [kind, list] of [['day', t.day], ['work', t.work], ['tips', t.tips]]) {
            list.forEach(l => assert.ok(!l.when || STAFF_TALK_WHEN[kind].includes(l.when), `${role}.${kind}: when desconhecido ${l.when}`));
        }
    }
});

test('nenhuma fala vazia e só variáveis conhecidas do cargo', () => {
    for (const role of roles) {
        const known = new Set([...STAFF_TALK_VARS.common, ...(STAFF_TALK_VARS[role] || [])]);
        for (const l of linesOf(role)) {
            assert.ok(typeof l.text === 'string' && l.text.trim().length > 10, `${role}: fala vazia`);
            StaffTalk.varsUsed(l.text).forEach(v => assert.ok(known.has(v), `${role}: variável {${v}} desconhecida em "${l.text}"`));
        }
    }
    STAFF_LEVEL_UP.forEach(text => {
        assert.ok(text.includes('{nivel}'), `comemoração sem o nível: ${text}`);
        StaffTalk.varsUsed(text).forEach(v => assert.ok(STAFF_TALK_VARS.common.includes(v), `{${v}} na comemoração`));
    });
    assert.ok(STAFF_LEVEL_UP.length >= 4);
});

test('marcadores de gênero e variáveis resolvem (nada de { } | sobrando)', () => {
    for (const role of roles) {
        const vars = fakeVars(role);
        for (const l of [...linesOf(role), ...STAFF_LEVEL_UP.map(text => ({ text }))]) {
            for (const gender of ['f', 'm']) {
                const out = StaffTalk.resolve(l.text, gender, vars);
                assert.ok(!/[{}|]/.test(out), `${role}/${gender}: sobrou marcador em "${out}"`);
                assert.ok(out.trim().length > 0);
            }
        }
    }
    assert.strictEqual(StaffTalk.resolve('Eu sou {a|o} {eu}, {obrigada|obrigado}!', 'f', { eu: 'Ana Souza' }), 'Eu sou a Ana Souza, obrigada!');
    assert.strictEqual(StaffTalk.resolve('Eu sou {a|o} {eu}, {obrigada|obrigado}!', 'm', { eu: 'João Lima' }), 'Eu sou o João Lima, obrigado!');
    assert.strictEqual(StaffTalk.resolve('sozinh{a|o}', 'f'), 'sozinha');
});

test('dia: período e tempo do momento; trabalho: bom × parado', () => {
    assert.ok(StaffTalk.conditions({ hour: 8 }).has('morning'));
    assert.ok(StaffTalk.conditions({ hour: 15 }).has('afternoon'));
    assert.ok(StaffTalk.conditions({ hour: 23 }).has('night'));
    assert.ok(StaffTalk.conditions({ hour: 2 }).has('night'));
    const rainy = StaffTalk.conditions({ hour: 8, rain: true, hot: true });
    assert.ok(rainy.has('rain') && !rainy.has('hot'), 'chuva e sol quente ao mesmo tempo não');

    const t = STAFF_TALK.obras;
    const night = StaffTalk.conditions({ hour: 22 });
    for (let i = 0; i < 40; i++) {
        const l = StaffTalk.chooseDay(t.day, night, Math.random);
        assert.ok(!l.when || l.when === 'night', `fala de ${l.when} à noite`);
        assert.strictEqual(StaffTalk.chooseWork(t.work, false, Math.random).when, 'bad');
        assert.strictEqual(StaffTalk.chooseWork(t.work, true, Math.random).when, 'good');
    }
    // "Outra conversa" não repete a fala anterior
    const first = StaffTalk.chooseWork(t.work, true, () => 0);
    assert.notStrictEqual(StaffTalk.chooseWork(t.work, true, () => 0, first.text).text, first.text);
});

test('dica: o problema mais grave do tema do cargo; nunca "tudo bem" com a cidade mal', () => {
    assert.strictEqual(JSON.stringify(StaffTalk.problems({ water: 'low', pollution: 'critical', energy: 'ok' }, false)), '["pollution","water"]');
    assert.strictEqual(JSON.stringify(StaffTalk.problems({}, true)), '["events"]');
    assert.strictEqual(StaffTalk.problems({ water: 'great' }).length, 0);

    for (const role of roles) {
        const tips = STAFF_TALK[role].tips;
        for (let i = 0; i < 20; i++) {
            const calm = StaffTalk.chooseTip(tips, [], Math.random);
            assert.ok(!calm.when || calm.when === 'calm');
            // problema que o cargo não cobre → conselho geral, nunca a fala de cidade tranquila
            const other = StaffTalk.chooseTip(tips, ['nao_existe'], Math.random);
            assert.ok(!other.when, `${role}: dica "${other.when}" com problema fora do tema`);
        }
        const covered = tips.find(l => l.when && l.when !== 'calm');
        assert.strictEqual(StaffTalk.chooseTip(tips, [covered.when], Math.random).when, covered.when);
    }
});
