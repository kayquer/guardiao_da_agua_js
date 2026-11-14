// "Como funciona" das categorias do menu de construção (js/data/buildGuides.js): toda categoria visível tem guia,
// os atalhos apontam para aulas/guias que existem e os números do texto são os do código (mudou a regra, mude o texto).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./load');

const g = load('js/utils/GameUtils.js', 'js/data/buildings.js', 'js/data/zoneLots.js', 'js/data/cityHall.js', 'js/data/lessons.js',
    'js/data/buildGuides.js', 'js/systems/BuildingSystem.js', 'js/systems/building/ZoneGrowth.js',
    'js/systems/building/BuildingEfficiency.js', 'js/systems/building/TreeGrowth.js', 'js/core/ResourceManager.js');
const GUIDES = g('BUILD_GUIDES');
const B = g('BUILDING_TYPES');
const FLAGS = g('FEATURE_FLAGS');
const RM = g('ResourceManager');
const RULES = g('EFFICIENCY_RULES');
const LESSONS = g('LESSON_CHAPTERS');
const src = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const text = id => JSON.stringify(GUIDES[id]).replace(/<\/?b>/g, '');
const num = n => Number(n).toLocaleString('pt-BR');
const has = (id, fragment) => assert.ok(text(id).includes(fragment), `guia '${id}' deveria dizer "${fragment}"`);

test('toda categoria visível do menu de construção tem um "Como funciona"', () => {
    const categories = new Set(Object.entries(B)
        .filter(([id, b]) => FLAGS.isBuildingVisible(id) && FLAGS.isCategoryVisible(b.category))
        .map(([, b]) => b.category));
    assert.ok(categories.size >= 10, 'categorias visíveis');
    for (const c of categories) assert.ok(GUIDES[c], `categoria '${c}' sem guia em BUILD_GUIDES`);
    // e o botão da categoria existe no HTML
    const html = src('index.html');
    for (const c of Object.keys(GUIDES)) assert.match(html, new RegExp(`data-category="${c}"`), `${c}: categoria sem botão`);
});

test('cada guia: para que serve, como funciona (3-5), causa e efeito e 3 a 5 dicas, sem emoji', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const [id, guide] of Object.entries(GUIDES)) {
        assert.ok(guide.title && guide.purpose && guide.purpose.length > 30, `${id}: título e para que serve`);
        assert.ok(guide.how.length >= 3 && guide.how.length <= 5, `${id}: 3 a 5 itens de "como funciona"`);
        assert.ok(guide.tips.length >= 3 && guide.tips.length <= 5, `${id}: 3 a 5 dicas`);
        for (const item of guide.how) assert.ok(item.icon && item.text, `${id}: item sem ícone ou texto`);
        for (const c of guide.chain || []) {
            assert.ok(c.act && c.eff && ['up', 'down'].includes(c.trend) && typeof c.good === 'boolean', `${id}: causa e efeito`);
        }
        assert.ok(!emoji.test(JSON.stringify(guide)), `${id}: sem emoji (os ícones vêm de uiIcon)`);
    }
});

test('ícones existem (chave de uiIcon ou id de prédio com SVG)', () => {
    const icons = new Set(fs.readdirSync(path.join(ROOT, 'assets/icons/svg')).map(f => f.replace(/(-sm)?\.svg$/, '')));
    for (const [id, guide] of Object.entries(GUIDES)) {
        for (const item of guide.how) {
            assert.ok(icons.has(item.icon.replace(/_/g, '-')), `${id}: ícone '${item.icon}' sem SVG`);
        }
    }
});

test('"Ver aula" e guias apontam para aulas, aulas rápidas e guias que existem', () => {
    const tutorial = src('js/systems/TutorialSystem.js');
    const topicsAt = tutorial.indexOf('TutorialSystem.TOPICS = {');
    const topics = tutorial.slice(topicsAt, tutorial.indexOf('TutorialSystem.GUIDES_KEY', topicsAt));
    const topicIds = new Set([...topics.matchAll(/^ {4}([a-z]+): \{/gm)].map(m => m[1]));
    const guides = tutorial.slice(tutorial.indexOf('TutorialSystem.GUIDES = ['));
    const guideIds = new Set([...guides.matchAll(/^ {8}id: '([a-z_]+)'/gm)].map(m => m[1]));
    assert.ok(topicIds.has('water') && guideIds.has('energy'), 'leitura dos ids do TutorialSystem');
    for (const [id, guide] of Object.entries(GUIDES)) {
        assert.ok((guide.links || []).length >= 1, `${id}: pelo menos um atalho para aula ou guia`);
        for (const link of guide.links) {
            if (link.kind === 'lesson') assert.ok(LESSONS[link.id], `${id}: aula ${link.id} inexistente`);
            else if (link.kind === 'topic') assert.ok(topicIds.has(link.id), `${id}: aula rápida '${link.id}' inexistente`);
            else if (link.kind === 'guide') assert.ok(guideIds.has(link.id), `${id}: guia '${link.id}' inexistente`);
            else assert.fail(`${id}: atalho '${link.kind}' desconhecido`);
        }
    }
});

test('os números dos guias são os do código', () => {
    // Água
    has('water', `cada morador usa ${RM.WATER_PER_PERSON} L/min`);
    has('water', `(${B.water_pump.waterProduction} L/min)`);
    has('water', `(${B.water_well.waterProduction} L/min)`);
    has('water', `(${B.water_treatment_plant.waterProduction} L/min)`);
    has('water', `a até ${B.water_treatment_plant.requirements.maxWaterDistance} blocos`);
    has('water', `(+${B.water_tank.waterStorage} L)`);
    has('water', `(+${B.water_tower.waterStorage} L)`);
    assert.strictEqual(RM.AQUIFER_LOW, 30); assert.strictEqual(RM.RIVER_LOW, 30); assert.strictEqual(RM.AQUIFER_MIN_FACTOR, 0.2);
    has('water', `rendem só ${Math.round(RULES.noRoadFactor * 100)}%`);
    // Tratamento
    has('treatment', `cada 100 moradores somam ${num(100 * RM.SEWAGE_PER_PERSON)} pontos`);
    has('treatment', `limpa ${B.treatment_plant.pollutionReduction} pontos por minuto`);
    has('treatment', `sobe ${num(B.treatment_plant.riverRecharge)}% por minuto`);
    has('treatment', `limpa mais ${B.filter_station.pollutionReduction}`);
    has('treatment', `cerca de ${num(B.treatment_plant.pollutionReduction / RM.SEWAGE_PER_PERSON)} moradores`);
    has('treatment', `usa ${B.treatment_plant.powerConsumption} kW`);
    has('treatment', `acima de ${RULES.zoneHighPollution}%`);
    // Natureza
    const trees = src('js/config/GameConstants.js');
    assert.match(trees, /RIPARIAN_DISTANCE: 2,/); assert.match(trees, /RIPARIAN_FACTOR: 2\.5,/);
    has('nature', 'até 2 blocos'); has('nature', '2,5 vezes');
    has('nature', `a até ${RULES.drainageRadius} blocos`);
    assert.strictEqual(B.tree_sapling.treeStages.length, 4); has('nature', '4 fases');
    // Ciência
    has('science', `a até ${B.research_center.effectRadius} blocos ${num(B.research_center.nearbyEfficiencyBonus * 100)}%`);
    has('science', `a até ${B.university.effectRadius} blocos, com ${Math.round(B.university.nearbyEfficiencyBonus * 100)}%`);
    has('science', `usa ${B.research_center.powerConsumption} kW e a universidade ${B.university.powerConsumption} kW`);
    // Públicos e Prefeitura
    has('public', `no máximo ${RM.BUILDING_SATISFACTION_MAX} pontos`);
    assert.match(src('js/systems/CityFinance.js'), /CHANGE_COOLDOWN_MS = 2 \* 60 \* 1000/); has('public', '2 minutos de jogo');
    const roles = g('STAFF_ROLES');
    has('public', `assistente social com ${roles.assistente_social.cap.unlockAt}`);
    has('public', `engenharia ambiental com ${roles.eng_ambiental.cap.unlockAt}`);
    assert.strictEqual(g('TAX_LEVELS').length, 5); has('public', 'em 5 níveis');
    // Energia
    has('power', `(R$ ${num(B.solar_micro.cost)}, ${B.solar_micro.powerGeneration} kW)`);
    has('power', `a bomba gasta ${B.water_pump.powerConsumption} kW e a ETE, ${B.treatment_plant.powerConsumption} kW`);
    assert.strictEqual(RULES.solarNight, 0.5); has('power', 'entrega metade');
    has('power', `devolve ${Math.round(B.grid_battery.solarStorage * 100)}%`);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(RULES.windSteps[0])), [8, 0.5]); has('power', 'menos de 8 km/h');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(RULES.windSteps.at(-2))), [70, 1.25]); assert.strictEqual(RULES.windSteps.at(-1)[1], 0.6);
    has('power', '70 km/h ou mais, só 60%');
    for (const id of ['coal_plant', 'thermal_plant']) assert.match(JSON.stringify(B[id].techRequires), /zone_industrial_light/, `${id} depois da indústria`);
    // Ruas
    has('roads', `a <b>${Math.round(RULES.noRoadFactor * 100)}%</b>`.replace(/<\/?b>/g, ''));
    has('roads', `(R$ ${B.paved_road.cost} o bloco, R$ ${B.paved_road.maintenanceCost} por minuto`);
    has('roads', `(R$ ${B.gravel_road.cost}): ${Math.round((1 - B.gravel_road.runoffImpervious) * 100)}% da chuva`);
    has('roads', `(R$ ${B.dirt_road.cost}): só ${Math.round((1 - B.dirt_road.runoffImpervious) * 100)}% da chuva`);
    assert.match(src('js/systems/roads/RoadNetwork.js'), /RoadNetwork\.BRIDGE_SPAN = 4;/); has('roads', '(até 4 blocos)');
    assert.match(src('js/systems/CityLifeSystem.js'), /CityLifeSystem\.MIN_ROADS = 20;/); has('roads', 'Com 20 blocos');
    // Zonas
    const stages = g('ZONE_GROWTH').stageMs.map(ms => ms / 1000);
    has('residential', `com ${stages[0]}, ${stages[1]} e ${stages[2]} s de jogo`);
    has('residential', `só ${Math.round(B.zone_residential_light.runoffImpervious * 100)}% do chão coberto`);
    has('residential', `A pesada cobre ${Math.round(B.zone_residential_heavy.runoffImpervious * 100)}%`);
    assert.strictEqual(RULES.heavyRunoff, B.zone_residential_heavy.runoffImpervious, 'a pesada é a que precisa de drenagem');
    has('residential', `começa com ${g('GAME_CONFIG').resources.initialPopulation} moradores e lugar para ${RM.BASE_POPULATION_CAPACITY}`);
    has('industrial', `${B.zone_industrial_light.pollutionGeneration} na leve, ${B.zone_industrial_balanced.pollutionGeneration} na equilibrada e ${B.zone_industrial_heavy.pollutionGeneration} na pesada`);
    has('industrial', `gasta ${B.zone_industrial_heavy.waterConsumption} L/min`);
    assert.match(JSON.stringify(B.zone_industrial_light.techRequires), /"count":2/); has('industrial', 'pede duas zonas residenciais');
    assert.match(src('js/systems/AchievementTracks.js'), /INDUSTRY_CLEAN_MAX = 40/); has('industrial', 'até 40%');
    // Comércio: turismo paga o dobro do comércio
    const rates = src('js/core/ResourceManager.js');
    const perCommercial = Number(rates.match(/perCommercial: (\d+)/)[1]);
    const perTourism = Number(rates.match(/perTourism: (\d+)/)[1]);
    assert.strictEqual(perTourism, perCommercial * 2); has('commercial', 'vale o dobro');
    assert.strictEqual(RULES.needsWaterFactor, 0.5); has('commercial', 'rendem metade');
});
