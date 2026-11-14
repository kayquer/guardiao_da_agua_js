/**
 * "Como funciona" de cada categoria do menu de construção (#build-guide, js/systems/ui/BuildMenuUI.js).
 * Só dados, em pt-BR simples: para que serve a categoria, como ela funciona no jogo (as regras de verdade, com os
 * números do código), causa e efeito e de 3 a 5 dicas. Os números saem de ResourceManager, buildings.js,
 * zoneLots.js, EventSystem, BuildingEfficiency e cityHall.js — tests/unit/build-guides.test.js confere os
 * principais; mudou a regra, mude o texto.
 *
 * Campos: title, purpose (frase), how [{ icon, text }] (icon = chave de uiIcon() ou id de prédio),
 * chain [{ act, eff, trend: 'up'|'down', good }] (causa → efeito: sobe/desce, bom/ruim), tips [texto],
 * links [{ kind: 'lesson'|'topic'|'guide', id }] = "Ver aula" (LESSON_CHAPTERS), aula rápida
 * (TutorialSystem.TOPICS) ou guia (TutorialSystem.GUIDES) que já existem — sem repetir o conteúdo deles.
 * Textos podem ter <b>; nada de emoji (os ícones vêm de `icon`).
 */
const BUILD_GUIDES = {
    water: {
        title: 'Água',
        purpose: 'Dar água para a cidade beber, cozinhar e trabalhar. Se a água guardada acabar, o jogo termina.',
        how: [
            { icon: 'res-water', text: 'A água guardada <b>sobe</b> com o que bombas, poços e a ETA produzem e <b>desce</b> com o que se gasta: cada morador usa 2 L/min, e prédios, comércio e fábricas gastam mais.' },
            { icon: 'water_pump', text: 'A <b>bomba</b> (50 L/min) e o <b>poço</b> (80 L/min) tiram água do <b>aquífero</b>, debaixo da terra. Abaixo de 30% o aquífero rende cada vez menos, até só 20%.' },
            { icon: 'water_treatment_plant', text: 'A <b>ETA</b> (160 L/min) capta água de rio ou lago a até 10 blocos e baixa o <b>nível dos rios</b>. Rio abaixo de 30% = ETA captando menos.' },
            { icon: 'water_tank', text: 'O <b>reservatório</b> (+500 L) e a <b>caixa d\'água</b> (+800 L) aumentam quanto a cidade consegue guardar para os dias secos.' }
        ],
        chain: [
            { act: 'Muitas bombas', eff: 'Aquífero', trend: 'down', good: false },
            { act: 'Árvores e jardins de chuva', eff: 'Aquífero', trend: 'up', good: true },
            { act: 'Mais moradores', eff: 'Água gasta', trend: 'up', good: false }
        ],
        tips: [
            'Construa a próxima fonte <b>antes</b> de a água acabar: a setinha ao lado da água, no topo, mostra se ela está caindo.',
            'Uma bomba sozinha quase não baixa o aquífero; várias juntas, sim. Misture fontes do aquífero (bombas e poços) e do rio (ETA).',
            'Na seca os rios recebem menos água e a ETA sofre: reservatórios guardam água para esses dias.',
            'Bombas, poços e a ETA precisam de uma <b>rua encostada</b>: sem ela rendem só 75%.',
            'Clique numa fonte pronta para ver quanto ela rende <b>agora</b>, já contando a seca e o aquífero.'
        ],
        links: [{ kind: 'lesson', id: 5 }, { kind: 'topic', id: 'water' }]
    },

    treatment: {
        title: 'Tratamento',
        purpose: 'Limpar o esgoto e o lixo antes que cheguem ao rio. Se a poluição chegar a 100%, o jogo termina.',
        how: [
            { icon: 'res-pollution', text: 'Todo morador gera <b>esgoto</b>: cada 100 moradores somam 2 pontos de poluição por minuto. Prédios e fábricas poluem por conta própria.' },
            { icon: 'treatment_plant', text: 'A <b>ETE</b> limpa 30 pontos por minuto e devolve água limpa ao rio, que sobe 1,5% por minuto. A estação de filtros limpa mais 20.' },
            { icon: 'recycling_point', text: '<b>Reciclagem</b>, compostagem, aterro e biodigestor tiram o lixo do caminho do rio. A cooperativa e o ecoparque ainda rendem dinheiro.' },
            { icon: 'status-warning', text: 'Com a poluição acima de 70%, a água fica turva, as zonas crescem mais devagar e chegam bem menos moradores.' }
        ],
        chain: [
            { act: 'Mais moradores', eff: 'Esgoto', trend: 'up', good: false },
            { act: 'ETE pronta', eff: 'Poluição', trend: 'down', good: true },
            { act: 'ETE pronta', eff: 'Nível do rio', trend: 'up', good: true }
        ],
        tips: [
            'Uma ETE dá conta do esgoto de cerca de 1.500 moradores. O painel da poluição compara o esgoto com a limpeza.',
            'Construa a ETE <b>antes</b> de a cidade crescer muito: poluição acumulada demora para baixar.',
            'A ETE usa 40 kW de energia: tenha energia sobrando antes de construir.',
            'Os avisos chegam com 60%, 80% e 90% de poluição: aja já no primeiro.'
        ],
        links: [{ kind: 'lesson', id: 4 }, { kind: 'topic', id: 'pollution' }]
    },

    nature: {
        title: 'Natureza',
        purpose: 'Usar a própria natureza para limpar o ar e o rio, segurar a chuva no chão e encher o aquífero.',
        how: [
            { icon: 'ui-tree', text: 'Cada árvore em pé limpa um pouco da poluição e recarrega o aquífero. Na beira da água (até 2 blocos) ela limpa 2,5 vezes mais: é a <b>mata ciliar</b>.' },
            { icon: 'tree_sapling', text: 'A <b>muda</b> passa por 4 fases. No começo ela só gasta água; depois limpa o ar e ajuda a chuva a entrar no chão.' },
            { icon: 'rain_garden', text: 'Jardim de chuva, parque linear, teto verde e controle de erosão <b>seguram a enxurrada</b>: menos risco de enchente. Asfalto e telhados aumentam o risco.' },
            { icon: 'linear_park', text: 'Na faixa de proteção do rio (APP) e na várzea só entram mudas, o parque linear e os monitores da água.' },
            { icon: 'ui-axe', text: 'Construir em cima de árvores <b>derruba todas</b>: a poluição sobe e a satisfação cai.' }
        ],
        chain: [
            { act: 'Mata ciliar', eff: 'Água limpa', trend: 'up', good: true },
            { act: 'Jardim de chuva', eff: 'Risco de enchente', trend: 'down', good: true },
            { act: 'Derrubar árvores', eff: 'Poluição', trend: 'up', good: false }
        ],
        tips: [
            'Plante mudas na beira do rio: elas limpam mais e trazem de volta os bichos do Caderno de Campo.',
            'Bairro pesado precisa de jardim de chuva, parque linear, muda ou controle de erosão a até 4 blocos; sem isso, ele alaga quando chove.',
            'Clique no chão para ver a saúde do lugar: quanto da chuva ele está absorvendo.',
            'As obras verdes funcionam sem rua encostada.'
        ],
        links: [{ kind: 'lesson', id: 6 }, { kind: 'lesson', id: 4 }]
    },

    science: {
        title: 'Ciência',
        purpose: 'Medir e estudar a água para ver os problemas cedo e fazer os outros prédios funcionarem melhor.',
        how: [
            { icon: 'water_quality_monitor', text: 'O <b>monitor de qualidade</b> analisa a água o tempo todo e ajuda a limpá-la. Ele pode ficar na beira do rio.' },
            { icon: 'monitoring_station', text: 'Com a <b>estação de monitoramento</b> pronta, secas e enchentes chegam com o <b>dobro de aviso</b>.' },
            { icon: 'research_center', text: 'O <b>centro de pesquisa</b> deixa os prédios a até 3 blocos 12,5% mais eficientes e as obras ali perto mais baratas. A <b>universidade</b> faz o mesmo a até 5 blocos, com 20%.' },
            { icon: 'event-campaign', text: 'Monitores e centros de pesquisa abrem respostas novas nas decisões do Secretário Paulo.' }
        ],
        chain: [
            { act: 'Estação de monitoramento', eff: 'Tempo de aviso', trend: 'up', good: true },
            { act: 'Centro de pesquisa', eff: 'Eficiência dos vizinhos', trend: 'up', good: true }
        ],
        tips: [
            'Construa as obras importantes perto do centro de pesquisa: saem mais baratas e rendem mais.',
            'O centro de pesquisa usa 80 kW e a universidade 120 kW: confira a energia antes.',
            'Os níveis mais altos da árvore de tecnologia (água de reúso, ecoparque, usinas avançadas) pedem um centro de pesquisa.'
        ],
        links: [{ kind: 'lesson', id: 4 }]
    },

    public: {
        title: 'Públicos',
        purpose: 'Cuidar das pessoas: governo, escola, saúde e segurança deixam os moradores mais satisfeitos.',
        how: [
            { icon: 'city_hall', text: 'A <b>Prefeitura</b> abre o Financeiro (impostos de moradores, comércio e indústria, em 5 níveis) e os Funcionários (equipe que melhora a cidade).' },
            { icon: 'res-satisfaction', text: 'Escola, hospital, bombeiros e delegacia somam <b>satisfação</b>, mas cada um vale menos que o anterior: no máximo 15 pontos juntos.' },
            { icon: 'res-population', text: 'Satisfação acima de 70% faz a cidade crescer rápido; abaixo de 50%, ela encolhe.' },
            { icon: 'res-water', text: 'Todo prédio com gente gasta água e gera um pouco de esgoto, e todos têm manutenção por minuto.' }
        ],
        chain: [
            { act: 'Escola e hospital', eff: 'Satisfação', trend: 'up', good: true },
            { act: 'Imposto muito alto', eff: 'Satisfação', trend: 'down', good: false }
        ],
        tips: [
            'Depois de mudar um imposto, ele só muda de novo depois de 2 minutos de jogo (um mês).',
            'Com mais moradores, a Prefeitura libera especialistas: assistente social com 150, engenharia ambiental com 250, e outros depois.',
            'O Corpo de Bombeiros e a escola abrem respostas novas nas decisões do Secretário Paulo.',
            'A Escola Técnica faz a cidade recuperar mais dinheiro ao reciclar prédios.'
        ],
        links: [{ kind: 'guide', id: 'public' }, { kind: 'topic', id: 'satisfaction' }]
    },

    power: {
        title: 'Energia',
        purpose: 'Gerar a energia que bombas, estações e bairros usam. A energia aparece em kW.',
        how: [
            { icon: 'res-energy', text: 'A conta é <b>geração × consumo</b>. Faltando energia, os bairros crescem mais devagar e a satisfação perde até 20 pontos.' },
            { icon: 'solar_micro', text: '<b>Sol</b>: de noite a usina entrega metade, e de dia nuvem e chuva também tiram parte. Cada <b>bateria da rede</b> devolve 25% do que se perde.' },
            { icon: 'wind_small', text: '<b>Vento</b>: com menos de 8 km/h a turbina gera metade; com ventania de 70 km/h ou mais, só 60%.' },
            { icon: 'small_hydro', text: '<b>Água</b>: as hidrelétricas geram dia e noite, mas na seca e com o rio baixo geram menos.' },
            { icon: 'coal_plant', text: '<b>Carvão e gás</b> geram a qualquer hora, mas poluem muito e o combustível pesa na manutenção. Só liberam depois de uma zona industrial.' }
        ],
        chain: [
            { act: 'Noite ou nuvem', eff: 'Energia solar', trend: 'down', good: false },
            { act: 'Bateria da rede', eff: 'Energia à noite', trend: 'up', good: true },
            { act: 'Usina a carvão', eff: 'Poluição', trend: 'up', good: false }
        ],
        tips: [
            'Comece pela <b>Microgeração Solar</b>: é a mais barata (R$ 2.400, 45 kW).',
            'Misture fontes: sol, vento e água falham em horas diferentes.',
            'Antes de construir, veja no cartão quanto o prédio usa: a bomba gasta 4 kW e a ETE, 40 kW.',
            'No cartão das usinas que poluem muito aparece em quanto tempo elas levam a poluição a 100%.'
        ],
        links: [{ kind: 'guide', id: 'energy' }, { kind: 'topic', id: 'electricity' }]
    },

    roads: {
        title: 'Asfalto',
        purpose: 'Ligar os prédios: quase todo prédio que produz, trata ou rende dinheiro precisa de uma rua encostada.',
        how: [
            { icon: 'cat-roads', text: 'Sem rua encostada num dos lados (na diagonal não conta), o prédio funciona a <b>75%</b>. A maioria das usinas, os reservatórios e as obras verdes não precisam.' },
            { icon: 'paved_road', text: '<b>Asfalto</b> (R$ 40 o bloco, R$ 1 por minuto de manutenção): a chuva não entra no chão, então a enxurrada e o risco de enchente aumentam.' },
            { icon: 'gravel_road', text: '<b>Cascalho</b> (R$ 30): 60% da chuva entra no chão entre as pedras.' },
            { icon: 'dirt_road', text: '<b>Terra</b> (R$ 20): só 40% da chuva entra, e a enxurrada leva barro para o rio.' },
            { icon: 'ui-build', text: 'Arraste para traçar: curvas e cruzamentos se ligam sozinhos, a rua sobe encostas e vira ponte sobre a água (até 4 blocos).' }
        ],
        chain: [
            { act: 'Asfalto', eff: 'Enxurrada', trend: 'up', good: false },
            { act: 'Rua encostada', eff: 'Eficiência do prédio', trend: 'up', good: true }
        ],
        tips: [
            'A rua fica pronta na hora e não ocupa vaga de obra.',
            'Para um bairro virar pesado, a cidade precisa de rua de asfalto.',
            'Com 20 blocos de rua ligados, o trânsito aparece.',
            'Esc sai do modo de construir ruas.'
        ],
        links: [{ kind: 'guide', id: 'roads' }]
    },

    residential: {
        title: 'Residencial',
        purpose: 'Dar lugar para as pessoas morarem. Moradores pagam imposto, mas gastam água e energia e geram esgoto.',
        how: [
            { icon: 'zone_residential_light', text: 'A zona cresce sozinha em <b>4 fases</b> (Área livre, Início, Desenvolvimento e Completa), com 30, 45 e 60 s de jogo entre elas. Cada fase abre lugar para mais moradores.' },
            { icon: 'res-satisfaction', text: 'Ela cresce até 1,5 vez mais rápido com moradores satisfeitos e mais devagar com falta de energia. Sem água, para; com a cidade muito mal, volta de fase.' },
            { icon: 'ui-upgrade', text: 'Na fase Completa dá para <b>evoluir</b>: leve → equilibrada → pesada. A equilibrada pede uma ETA, ETE ou reservatório; a pesada pede asfalto, um controle de enxurrada e energia sobrando.' },
            { icon: 'city_hall', text: 'O imposto dos moradores (IPTU) se ajusta na Prefeitura: baixo atrai gente; alto rende mais hoje e afasta famílias depois.' }
        ],
        chain: [
            { act: 'Zona pesada', eff: 'Moradores', trend: 'up', good: true },
            { act: 'Zona pesada', eff: 'Enxurrada e esgoto', trend: 'up', good: false }
        ],
        tips: [
            'A leve tem quintais: só 10% do chão coberto e satisfação extra. A pesada cobre 70% e precisa de drenagem a até 4 blocos.',
            'Cada morador gasta 2 L/min de água e gera esgoto: planeje água e ETE antes de crescer.',
            'A cidade começa com 30 moradores e lugar para 40: novas zonas abrem espaço para mais gente.',
            'Clique numa zona para ver a fase, quanto falta para a próxima e por que ela está lenta.'
        ],
        links: [{ kind: 'guide', id: 'zoning' }, { kind: 'topic', id: 'population' }]
    },

    commercial: {
        title: 'Comercial',
        purpose: 'Empregos, serviços e dinheiro: lojas, escritórios e turismo pagam imposto e rendem por minuto.',
        how: [
            { icon: 'zone_commercial_light', text: 'As <b>zonas comerciais</b> crescem em 4 fases, como as residenciais, e a renda sobe com a fase. A primeira pede uma zona residencial pronta.' },
            { icon: 'museum', text: 'Comércio paga o imposto de comércio (ISS); museu, monumento, hotel e parque turístico pagam o de <b>turismo</b>, que vale o dobro.' },
            { icon: 'city_hall', text: 'O ISS se ajusta na Prefeitura: baixo faz o comércio crescer mais rápido e render melhor; alto rende mais hoje e desanima as empresas.' },
            { icon: 'hotel', text: 'Hotel e restaurante precisam de água: com falta d\'água rendem metade. Centro comercial, escritórios e banco reaproveitam a chuva e gastam metade da água.' }
        ],
        chain: [
            { act: 'Mais comércio', eff: 'Dinheiro por minuto', trend: 'up', good: true },
            { act: 'Zona comercial pesada', eff: 'Enxurrada', trend: 'up', good: false }
        ],
        tips: [
            'Comece por uma zona comercial leve: é barata e ainda dá satisfação aos moradores.',
            'Deixe o comércio encostado numa rua: sem rua ele rende 75%.',
            'Os prédios grandes (escritórios, banco, centro comercial) custam caro: confira a manutenção por minuto no cartão.'
        ],
        links: [{ kind: 'guide', id: 'commercial' }, { kind: 'topic', id: 'budget' }]
    },

    industrial: {
        title: 'Industrial',
        purpose: 'Fábricas dão empregos e muito dinheiro, mas gastam muita água e são as que mais poluem.',
        how: [
            { icon: 'zone_industrial_light', text: 'A primeira <b>zona industrial</b> pede duas zonas residenciais. Ela cresce em 4 fases, como as outras.' },
            { icon: 'res-pollution', text: 'Com a zona completa, a poluição por minuto é 10 na leve, 20 na equilibrada e 55 na pesada, que também gasta 100 L/min de água.' },
            { icon: 'city_hall', text: 'O imposto da indústria se ajusta na Prefeitura: baixo acelera e melhora as zonas industriais; alto rende mais hoje e afasta as empresas.' },
            { icon: 'coal_plant', text: 'Com uma zona industrial pronta, as usinas a carvão e a gás são liberadas.' }
        ],
        chain: [
            { act: 'Zona industrial pesada', eff: 'Dinheiro', trend: 'up', good: true },
            { act: 'Zona industrial pesada', eff: 'Poluição', trend: 'up', good: false }
        ],
        tips: [
            'Tenha a ETE e árvores prontas antes de crescer a indústria: a poluição sobe rápido.',
            'Poluição acima de 70% faz todas as zonas crescerem mais devagar.',
            'Nas conquistas, as zonas industriais só contam com a poluição da cidade em até 40%.'
        ],
        links: [{ kind: 'guide', id: 'industrial' }, { kind: 'topic', id: 'pollution' }]
    }
};
