// Balanceamento da prefeitura (11/2026): quanto cada profissional devolve em R$/min (a régua) contra o salário, em
// cidades típicas de cada fase da campanha, e quanto os impostos mexem na receita. Usa os dados reais
// (js/data/buildings.js, js/data/cityHall.js) e as fórmulas do ResourceManager. Uso: node scripts/balance/staff-sim.js
//
// Valor de cada bônus em R$/min:
//   - custo/tempo de obra: gasto médio com obras por minuto naquela fase × bônus (ou o tempo poupado, convertido);
//   - manutenção: manutenção total × bônus;
//   - poluição: pontos/min cortados × preço do ponto de limpeza mais barato da fase (ETE: manutenção ÷ limpeza);
//   - satisfação: +1 ponto ≈ +0,5% no multiplicador de desenvolvimento do imposto por morador (ResourceManager);
//   - verde (agrônomo/a): limpeza das árvores (nativas: city.trees × TREES.POLLUTION_REDUCTION × 1,5 de mata ciliar
//     média; mudas adultas: a última etapa de treeStages) e das obras da categoria natureza × bônus × preço do ponto.
//   Veterinário/a e geógrafo/a não viram R$ (bichos raros antes; crises de clima mais fracas e avisadas antes): o valor
//   deles é evitar perda (seca/enchente) e o caderno — confira só que o salário fica abaixo do de quem rende em R$.
// Talento: cada pessoa sai com bônus × 0,85-1,15 e salário × 0,925-1,075 (STAFF_TALENT); a tabela é o meio da faixa.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const load = (file, name) => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const ctx = {};
    new Function('ctx', `${src}\n;ctx.v = ${name};`)(ctx);
    return ctx.v;
};
const B = load('js/data/buildings.js', 'BUILDING_TYPES');
const roles = load('js/data/cityHall.js', 'STAFF_ROLES');
const levels = load('js/data/cityHall.js', 'TAX_LEVELS');

// Cidades típicas (montadas pela ordem das missões: bomba → energia → bairro → ETE → crescer)
const CITIES = [
    { name: 'começo (30-60 hab.)', trees: 180, pop: 50, sat: 60, build: { city_hall: 1, water_pump: 1, solar_micro: 1, zone_residential_light: 1 }, buildSpendPerMin: 900 },
    { name: 'meio (250 hab.)', trees: 160, pop: 250, sat: 65, build: { city_hall: 1, water_pump: 2, water_treatment_plant: 1, treatment_plant: 1, water_tank: 1, solar_farm: 1, solar_micro: 2, zone_residential_light: 3, zone_residential_balanced: 1, zone_commercial_light: 2, zone_industrial_light: 1, school: 1, tree_sapling: 6 }, buildSpendPerMin: 2500 },
    { name: 'fim do meio (500 hab.)', trees: 140, pop: 500, sat: 65, build: { city_hall: 1, water_pump: 3, water_well: 1, water_treatment_plant: 1, treatment_plant: 2, water_tank: 2, solar_farm: 2, wind_farm: 1, zone_residential_light: 2, zone_residential_balanced: 3, zone_commercial_light: 2, zone_commercial_balanced: 1, zone_industrial_light: 1, zone_industrial_balanced: 1, school: 1, hospital: 1, restaurant: 1, tree_sapling: 10, rain_garden: 1 }, buildSpendPerMin: 3500 },
    { name: 'fim (1.000 hab.)', trees: 120, pop: 1000, sat: 70, build: { city_hall: 1, water_pump: 3, water_well: 2, water_treatment_plant: 2, treatment_plant: 3, water_tank: 3, solar_farm: 3, wind_farm: 2, zone_residential_balanced: 4, zone_residential_heavy: 2, zone_commercial_balanced: 2, zone_commercial_heavy: 1, zone_industrial_balanced: 2, school: 2, hospital: 1, restaurant: 1, hotel: 1, tree_sapling: 14, rain_garden: 2 }, buildSpendPerMin: 4500 }
];

const money = n => `R$ ${Math.round(n).toLocaleString('pt-BR')}`;
for (const city of CITIES) {
    const list = Object.entries(city.build).flatMap(([id, n]) => Array(n).fill(B[id]).filter(Boolean));
    const count = list.length;
    const dev = 1 + count * 0.01 + (city.sat / 100) * 0.5;
    const popTax = city.pop * 7 * dev;
    const commerceTax = list.filter(b => b.taxGroup === 'commerce').length * 50 * dev + list.filter(b => b.taxGroup === 'tourism').length * 100 * dev;
    const commerceIncome = list.filter(b => b.taxGroup || (b.zoneType && b.category === 'commercial')).reduce((s, b) => s + (b.incomeGeneration || 0), 0);
    const industryIncome = list.filter(b => b.zoneType && b.category === 'industrial').reduce((s, b) => s + (b.incomeGeneration || 0), 0);
    const income = 800 + popTax + commerceTax + commerceIncome + industryIncome;
    const maintenance = list.reduce((s, b) => s + (b.maintenanceCost || 0), 0);
    const pollutionSources = list.reduce((s, b) => s + (b.pollutionGeneration || 0), 0);
    const ete = B.treatment_plant;
    const pricePerPollution = (ete.maintenanceCost || 300) / Math.max(1, ete.pollutionReduction || 40);
    const saplingAdult = (B.tree_sapling?.treeStages || []).slice(-1)[0]?.pollutionReduction || 0;
    const greenClean = city.trees * 0.04 * 1.5 + list.reduce((s, b) => s + (b === B.tree_sapling ? saplingAdult
        : b.category === 'nature' ? (b.pollutionReduction || 0) : 0), 0);

    console.log(`\n== ${city.name}: receita ${money(income)}/min · manutenção ${money(maintenance)}/min · saldo ${money(income - maintenance)}/min · poluição dos prédios ${pollutionSources.toFixed(0)}/min`);
    console.log(`   impostos: moradores ${money(popTax)} · comércio ${money(commerceTax + commerceIncome)} · indústria ${money(industryIncome)}`);
    console.log(`   ±1 nível de imposto: moradores ${money(popTax * 0.2)} · comércio ${money((commerceTax + commerceIncome) * 0.2)} · indústria ${money(industryIncome * 0.2)} por minuto`);

    const value = (id, lvl) => {
        const r = roles[id], i = lvl - 1, at = v => (Array.isArray(v) ? v[i] : v);
        switch (id) {
            case 'obras': return city.buildSpendPerMin * at(r.bonus.buildTime) * 0.5; // tempo poupado vale metade do gasto adiantado
            case 'servicos': return maintenance * 0.1 * at(r.bonus.failure); // falha ~10% da manutenção em conserto/perda
            case 'assistente_social': return popTax * (at(r.bonus.satisfaction) * 0.005) / dev;
            case 'eng_ambiental': return (pollutionSources + city.pop * 0.02) * at(r.bonus.pollution) * pricePerPollution; // prédios + esgoto (SEWAGE_PER_PERSON)
            case 'eng_civil': return city.buildSpendPerMin * at(r.bonus.buildCost);
            case 'economista': return maintenance * at(r.bonus.maintenance);
            case 'eng_agronomo': return greenClean * at(r.bonus.green) * pricePerPollution;
            default: return null; // agrônomo, veterinário, geógrafo: valor em verde/fauna/crises, não em R$ (ver texto)
        }
    };
    for (const [id, r] of Object.entries(roles)) {
        const open = r.cap.base || city.pop >= r.cap.unlockAt;
        if (!open) continue;
        const v1 = value(id, 1), v5 = value(id, 5);
        const s1 = r.salary, s5 = Math.round(r.salary * 1.6);
        const fmt = (v, s) => (v === null ? '—' : `${money(v)} (${(v / s).toFixed(1)}× o salário)`);
        console.log(`   ${id.padEnd(18)} salário ${money(s1)}→${money(s5)} · devolve N1 ${fmt(v1, s1)} · N5 ${fmt(v5, s5)}`);
    }
}
console.log(`\nNíveis de imposto: ${levels.map(l => `${l.label} ${l.revenue}×`).join(' · ')}`);
