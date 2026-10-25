/**
 * Guias de socorro (js/systems/RescueGuides.js): quando um recurso cai sem parar por um minuto de jogo e o jogador
 * não começou nada que ajude, a Cláudia aparece com a causa (números de agora) e 2-3 construções para resolver.
 * Só dados. `suggest` em ordem de preferência; entram só os prédios visíveis com a tecnologia já alcançada
 * (estudo pendente aparece como "estude para liberar"). `category` = botão destacado no 2º passo.
 */
const RESCUE_GUIDES = {
    water: {
        icon: '💧', title: 'A água não para de cair', category: 'water',
        targets: ['.resource-item:has(#water-amount)', '#compact-water'],
        suggest: [
            { id: 'water_pump', why: 'tira água do rio, é barata e rápida' },
            { id: 'water_well', why: 'tira mais água, do aquífero' },
            { id: 'loss_control_center', why: 'acha vazamentos e recupera a água perdida nos canos' },
            { id: 'water_reuse_plant', why: 'trata o esgoto e entrega água para as fábricas, sobrando a do rio para as casas' },
            { id: 'water_tank', why: 'guarda água para os momentos de aperto' }
        ],
        tip: 'Enquanto a água não volta a subir, segure as zonas novas: cada morador gasta água.'
    },
    energy: {
        icon: '⚡', title: 'Falta energia faz tempo', category: 'power',
        targets: ['.resource-item:has(#electricity-amount)', '#compact-energy'],
        suggest: [
            { id: 'wind_farm', why: 'o vento gira as pás e não polui' },
            { id: 'solar_farm', why: 'usa a luz do sol (de noite gera menos)' },
            { id: 'hydroelectric_plant', why: 'gera muita energia com a força do rio' },
            { id: 'biomass_plant', why: 'queima restos de madeira e da roça (solta um pouco de fumaça)' },
            { id: 'sugarcane_mill', why: 'o bagaço da cana vira eletricidade (gasta bastante água)' }
        ],
        tip: 'Com pouca energia, bombas e estações de tratamento trabalham devagar. Gere sempre um pouco mais do que a cidade usa.'
    },
    pollution: {
        icon: '🏭', title: 'A poluição só sobe', category: 'treatment',
        targets: ['.resource-item:has(#pollution-level)'],
        suggest: [
            { id: 'treatment_plant', why: 'trata o esgoto antes de ele voltar para o rio' },
            { id: 'tree_sapling', why: 'árvores limpam o ar; perto do rio limpam ainda mais' },
            { id: 'floating_garden', why: 'as raízes das plantas filtram a água do rio' },
            { id: 'filter_station', why: 'filtra a água em camadas' },
            { id: 'recycling_point', why: 'lixo separado não vai parar no rio' },
            { id: 'composting_yard', why: 'restos de comida viram adubo em vez de lixo' }
        ],
        tip: 'Zonas industriais pesadas e muita gente sem tratamento de esgoto sujam muito o rio.'
    },
    budget: {
        icon: '💰', title: 'O dinheiro está sumindo', category: 'commercial',
        targets: ['.resource-item:has(#budget-amount)', '#compact-budget'],
        suggest: [
            { id: 'zone_commercial_light', why: 'lojas pagam impostos para a cidade' },
            { id: 'zone_residential_light', why: 'mais moradores, mais impostos' },
            { id: 'zone_industrial_light', why: 'fábricas pagam impostos (mas poluem)' },
            { id: 'restaurant', why: 'traz renda todo minuto' }
        ],
        tip: 'Cada prédio tem custo de manutenção. Prédio parado? Use ♻️ Reciclar no painel dele. No aperto, o painel do 💰 tem empréstimos.'
    },
    satisfaction: {
        icon: '😊', title: 'Os moradores estão ficando tristes', category: 'public',
        targets: ['.resource-item:has(#satisfaction-level)'],
        suggest: [
            { id: 'tree_sapling', why: 'verde por perto deixa todo mundo mais feliz' },
            { id: 'school', why: 'escola perto de casa deixa as famílias felizes' },
            { id: 'hospital', why: 'saúde é o que os moradores mais pedem' },
            { id: 'linear_park', why: 'parque à beira do rio para passear' },
            { id: 'police_station', why: 'mais segurança no bairro' }
        ],
        tip: 'Falta de água, de energia e poluição alta deixam todo mundo triste: resolva esses primeiro.'
    },
    population: {
        icon: '👥', title: 'As pessoas estão indo embora', category: 'residential',
        targets: ['.resource-item:has(#population-count)', '#compact-population'],
        suggest: [
            { id: 'zone_residential_light', why: 'casas novas para quem quer morar aqui' },
            { id: 'zone_residential_balanced', why: 'mais moradores no mesmo espaço' },
            { id: 'water_pump', why: 'sem água, as zonas param de crescer e encolhem' },
            { id: 'wind_farm', why: 'sem energia, as zonas crescem devagar' }
        ],
        tip: 'Zona sem água, sem energia ou com poluição alta volta de fase e perde moradores.'
    }
};
