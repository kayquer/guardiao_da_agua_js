/**
 * GUARDIÃO DA ÁGUA - TUTORIAL SYSTEM
 * Sistema de tutorial educacional com interface RPG para crianças de 11-14 anos
 */

class TutorialSystem {
    constructor(gameManager) {
        log('📚 Inicializando TutorialSystem...');

        this.gameManager = gameManager;
        this.currentStep = 0;
        this.isActive = false;

        // Retratos animados (AnimatedPortrait), um por personagem, criados na primeira fala
        this.portraits = {};
        this.portraitShown = null;

        // Tutorial steps with educational content
        this.tutorialSteps = this.createTutorialSteps();
        this.coachTimer = null;
        this.handleKey = (e) => this.onKeyDown(e);
        this.handleTargetClick = (e) => this.onTargetClick(e);

        // FIX #1: Setup event listeners for tutorial navigation buttons
        this.setupEventListeners();

        // Guias que aparecem conforme a cidade cresce (TutorialSystem.GUIDES)
        this.guideTimer = setInterval(() => this.checkGuides(), 2000);

        log('✅ TutorialSystem inicializado');
    }

    /**
     * FIX #1: Setup event listeners for tutorial control buttons
     */
    setupEventListeners() {
        // Skip button
        const skipBtn = document.getElementById('tutorial-skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skip());
        }

        // Previous button
        const prevBtn = document.getElementById('tutorial-prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.previous();
            });
        }

        // Next button
        const nextBtn = document.getElementById('tutorial-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.next();
            });
        }

        setupReadAloud(document.getElementById('tutorial-read-btn'), () =>
            `${document.getElementById('tutorial-title').innerText}. ${document.getElementById('tutorial-text').innerText}`);

        // 📚 abre a central de aulas (ui/LessonBookUI.js): o aluno escolhe o tema
        document.getElementById('btn-lessons')?.addEventListener('click', () => {
            if (!this.isActive && this.gameManager.gameState === 'playing') this.gameManager.uiManager.openLessonsHub();
        });

        log('✅ Tutorial event listeners configured');
    }

    /**
     * Creates all tutorial steps with educational content
     */
 createTutorialSteps() {
    // Personagens (TutorialSystem.CHARACTERS, no fim do arquivo): o retrato animado vem de `character`;
    // `expression` ('worried', 'happy', null) fixa a expressão do passo (senão, TutorialSystem.expressionFor)
    const JOSE = 'Pescador José';
    const MARCIA = 'Pesquisadora Márcia';
    const PAULO = 'Secretário Paulo';
    const openMissions = gm => gm.questSystem.missionUI.isOpen || gm.questSystem.openMissionInterface();
    const closeMissions = gm => { if (gm.questSystem.missionUI.isOpen) gm.questSystem.closeMissionInterface(); gm.uiManager.hideHudRight(); };
    // Passo sem `group` é da introdução; sem `mode` é 'story' (livro em tela cheia).
    // `bookOnly`: página só do livro da central de aulas (o tutorial inicial pula)
    return [
        // Abertura curta: o jogador constrói antes de ler (a pergunta das aulas vem depois da Prefeitura)
        {
            group: 'hello',
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-rio-boas-vindas.webp',
            title: 'Olá, {nome}!',
            text: 'Eu sou a <b>Pesquisadora Cláudia</b> e vou te ajudar a cuidar da água desta cidade. Vamos começar pelo começo: construir a <b>Prefeitura</b>, de onde você vai comandar tudo. Depois eu te conto como a água funciona!',
            nextLabel: 'Vamos lá!',
            icon: '💧'
        },

        // ===== PREFEITURA (obrigatório): o jogador constrói a sede da cidade =====
        {
            group: 'cityhall', mode: 'coach', character: 'Claudia', icon: '🏛️',
            title: 'Primeiro passo: a Prefeitura',
            text: 'Toda cidade precisa de uma sede de governo, e é da <b>Prefeitura</b> que você vai comandar as obras. Esta fica por conta do governo federal: <b>não custa nada</b>!',
            waitFor: 'city_hall',
            free: true, // obra do governo federal: não custa nada e fica pronta na hora
            // já abre a categoria certa: com outra aberta, o botão "Públicos" fica fora da tela
            enter: gm => gm.uiManager.uiState.currentCategory !== 'public' && gm.uiManager.selectCategory('public'),
            placingHint: '👆 Agora clique (ou toque) num terreno do mapa. Onde a sombra ficar <b>verde</b>, a Prefeitura cabe. <b>Laranja</b> = cabe, mas derruba árvores 🌳.',
            // O primeiro alvo visível ganha o destaque: acompanha o jogador abrindo menu → categoria → item
            targets: [
                { selector: '#build-info-construct:not([hidden])', text: '👆 Agora clique (ou toque) em <b>Construir</b>.' },
                { selector: '.building-item[data-building-type="city_hall"]', text: '👆 Escolha a <b>🏛️ Prefeitura Municipal</b>.', scrollIn: '#build-modal-grid' },
                { selector: '.category-btn[data-category="public"]', text: '👆 Abra a categoria <b>🏛️ Públicos</b>.' },
                { selector: '.mobile-toggle.left', text: '👆 Toque em <b>🏗️</b> para abrir as construções.' },
                { selector: '#building-panel', text: '👆 Abra a categoria <b>🏛️ Públicos</b> no menu de construções.' }
            ]
        },
        {
            group: 'cityhall', mode: 'coach', character: 'Claudia', icon: '🎉',
            title: 'Prefeitura construída!',
            text: 'Muito bem, {nome}! A cidade agora tem governo. Daqui pra frente, cada construção sai do <b>orçamento</b> da cidade: gaste com sabedoria.'
        },
        {
            group: 'cityhall', mode: 'coach', character: 'Claudia', icon: '🌳',
            title: 'Cuidado com as árvores',
            text: 'Viu os bosques no mapa? As árvores <b>limpam o ar</b> e deixam a cidade mais feliz. Se você construir em cima delas, elas são <b>derrubadas</b>: a <b>poluição sobe</b> e a <b>satisfação cai</b>. Quando a sombra da obra ficar <b>laranja</b>, tem árvore no caminho: prefira um terreno livre!'
        },

        // Depois da Prefeitura (a primeira ação vem em menos de um minuto): aprender sobre a água agora
        // (lições em seguida) ou durante o jogo (uma por missão, LessonProgress.forMission)
        {
            offer: true,
            nextLabel: 'Aprender agora',
            skipLabel: 'Durante o jogo',
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-rio-boas-vindas.webp',
            title: 'Hora de aprender sobre a água?',
            text: 'A cidade já tem sede! Agora posso te contar como a água funciona na natureza, com a ajuda de dois amigos: o <b>Pescador José</b>, que vive do rio desde criança, e a <b>Pesquisadora Márcia</b>, que vai até o rio coletar e analisar a água. <br><br>Você quer aprender <b>agora</b>, ou <b>aos poucos, durante o jogo</b>? Se escolher durante o jogo, a cada missão completada a gente aparece com uma aula nova.',
            icon: '💧'
        },

        // Step 1: Introduction & Responsibility
        {
            chapter: 1,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-rio-boas-vindas.webp',
            title: 'Boas-vindas, {nome}!',
            text: 'Olá! Eu sou a Pesquisadora Cláudia. Nossa cidade está com um problema sério: a água que a gente bebe, usa no banho e leva para as plantações está em perigo! <img src="assets/images/lessons/guardiao-da-agua.webp" alt="Dois jovens pegando água limpa de um riacho com as mãos" style="width:100%; border-radius:8px; margin:10px 0;"/> Por isso você foi escolhido como o novo <b>Guardião da Água</b>. Sua missão é proteger esse tesouro, e eu vou estar do seu lado, te ensinando cada passo. Topa cuidar da água com a gente?',
            icon: '👋'
        },

        // Step 2: Hidrosfera - Concepts & References
        {
            chapter: 1,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-rio-boas-vindas.webp',
            title: 'A Hidrosfera: Toda a Água do Planeta',
            text: 'Vamos começar pela <b>hidrosfera</b>: é toda a água do planeta, a que a gente vê e a que fica escondida debaixo da terra! <img src="assets/images/lessons/hidrosfera.webp" alt="A água no planeta: geleira, rios, mar, nuvens e água debaixo da terra" style="width:100%; border-radius:8px; margin:10px 0;"/> Ela aparece de três jeitos: <b>sólida</b> (gelo, como o do congelador), <b>líquida</b> (rios, lagos e mares) e <b>gasosa</b> (o vapor que forma as nuvens). E a água nunca fica parada! Às vezes ela se move rapidinho, como numa chuva. Outras vezes vai devagar, devagarinho, mais lenta que uma tartaruga.',
            icon: '🌍',
            educationalTopic: 'hidrosfera'
        },

        {
            chapter: 1, bookOnly: true,
            character: 'Claudia',
            title: 'Quanta Água Dá para Beber?',
            text: 'Se toda a água da Terra coubesse numa garrafa grande, quase tudo seria <b>água salgada</b>, cerca de 97%, quase toda nos oceanos! Sobra só um pouquinho de <b>água doce</b>, e a maior parte dela está <b>congelada</b> nas geleiras ou <b>escondida</b> debaixo da terra. <br><br>A água dos rios e lagos, que é a mais fácil de usar, é só uma gotinha dessa garrafa. <br><br>O Brasil tem sorte: guarda uma das <b>maiores reservas de água doce do mundo</b>, cerca de 12% da água doce de superfície do planeta. Só que ela está mal distribuída: a maior parte fica na Amazônia, onde mora pouca gente, e falta em muitas cidades grandes. Ter muita água não quer dizer que ela nunca vai faltar!',
            icon: '🧊'
        },

        // Step 3: Concepts - Hydrological Cycle & References
        {
            chapter: 2,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-ciclo-agua.webp',
            title: 'O Ciclo Hidrológico: O Motor da Vida',
            text: 'Agora vem a parte mais legal: o <b>ciclo da água</b>! É como uma brincadeira de transformações. <img src="assets/images/lessons/ciclo-da-agua.webp" alt="O ciclo da água: o sol evapora a água, as nuvens viram chuva e a chuva volta para o rio" style="width:100%; border-radius:8px; margin:10px 0;"/> O Sol esquenta o mar, os rios e os lagos, e a água <b>evapora</b>: vira vapor, um gás invisível, como a água da panela no fogo, que vai sumindo. As plantas também soltam vapor pelas folhas. Lá em cima, o vapor esfria e vira gotinhas: é a <b>condensação</b>, que forma as <b>nuvens</b>. Quando as gotinhas crescem e ficam pesadas, caem como <b>chuva</b>. Uma parte da chuva escorre para os rios e outra <b>infiltra</b> no chão e vai encher a água subterrânea. E tudo recomeça! Uma parte acontece no céu e a outra no chão. Se a gente estragar qualquer pedaço dessa roda, a natureza inteira sente.',
            icon: '🔄',
            educationalTopic: 'ciclo_hidrologico'
        },

        // Step 4: Concept - Watershed & References
        {
            chapter: 2,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-bacia.webp',
            title: 'A Bacia Hidrográfica: Como uma Grande Tigela',
            text: 'Vou te contar um segredo: uma <b>bacia hidrográfica</b> funciona como uma tigela gigante! <img src="assets/images/lessons/bacia-hidrografica.webp" alt="Uma bacia hidrográfica vista de cima: os riozinhos se juntam no rio principal" style="width:100%; border-radius:8px; margin:10px 0;"/> Os riozinhos, chamados <b>afluentes</b>, desaguam no <b>rio principal</b>. A água da chuva que escorre dentro da tigela vai toda para a mesma saída. O rio nasce na <b>nascente</b>, as bordas da tigela, as partes mais altas do terreno, são os <b>divisores de água</b> e o ponto onde o rio termina é a <b>foz</b>. Agora o mais importante: se alguém suja a água lá no alto, quem mora lá embaixo recebe água suja!',
            icon: '🏞️',
            educationalTopic: 'bacia_hidrografica'
        },

        {
            chapter: 2, bookOnly: true,
            character: 'Claudia',
            title: 'As Plantas Também Fazem Chover',
            text: 'As plantas também participam do ciclo da água! Elas puxam água do solo pelas raízes e soltam vapor pelas folhas. Isso se chama <b>transpiração</b>, como se a árvore suasse. <br><br>Na Amazônia, são tantas árvores fazendo isso ao mesmo tempo que se formam os <b>rios voadores</b>: correntes de vapor que viajam pelo céu e ajudam a trazer chuva para o Centro-Oeste, o Sudeste e o Sul do Brasil. Ou seja, a floresta em pé ajuda a encher as represas de cidades bem longe dali! <br><br>O Brasil tem grandes bacias hidrográficas, como a do <b>Amazonas</b>, a do <b>São Francisco</b> e a do <b>Paraná</b>. Toda cidade fica dentro de alguma bacia, inclusive a sua. Que tal descobrir qual é?',
            icon: '🌳'
        },

        // Step 5: Water Resources Management & References
        {
            chapter: 3,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-agua-para-todos.webp',
            title: 'Recursos Hídricos: Água para Todos',
            text: 'Água não é uma mercadoria qualquer, para ficar só com quem paga mais! <img src="assets/images/lessons/agua-para-todos.webp" alt="Um rio dividindo a água entre a casa, a plantação, a fábrica e o pescador" style="width:100%; border-radius:8px; margin:10px 0;"/> Os <b>recursos hídricos</b> são toda a água que temos para usar. E todo mundo quer um pedaço: as pessoas precisam beber, as fábricas precisam trabalhar e as plantações precisam crescer. É como dividir uma pizza numa festa cheia: se ninguém organiza, alguém fica sem. Por isso a água é <b>fonte de vida</b> e precisa chegar a todos. Seu papel, {nome}, é equilibrar essa divisão!',
            icon: '⚖️',
            educationalTopic: 'recursos_hidricos'
        },

        // Step 6: Research Centers
        {
            chapter: 3,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-centro-pesquisa.webp',
            title: 'Centros de Pesquisa: Nossos Olhos Científicos',
            text: 'Eu trabalho num <b>Centro de Pesquisa</b>! Lá a gente usa microscópios e aparelhos especiais para enxergar o que o olho não vê. <img src="assets/images/lessons/laboratorio.webp" alt="Bancada de laboratório com microscópio e amostras de água" style="width:100%; border-radius:8px; margin:10px 0;"/> Nós examinamos a <b>qualidade da água</b>: se tem bactérias perigosas, se está quente demais, se tem produtos químicos ruins. É como levar a água ao médico para um check-up! Sem ciência, a gente só ia ficar chutando. Os Centros de Pesquisa são seus melhores aliados nessa missão.',
            icon: '🔬',
            educationalTopic: 'centros_pesquisa'
        },

        // Step 7: Agriculture Dilemma
        {
            chapter: 3,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-agricultura.webp',
            title: 'Agricultura: Produzir Alimentos sem Destruir',
            text: 'A <b>agricultura</b> é super importante: é dela que vem a comida do nosso prato! Mas ela bebe muita, muita água. <img src="assets/images/lessons/agricultura.webp" alt="Canavial e gado perto do rio: com mata na margem a água fica limpa, sem ela fica suja" style="width:100%; border-radius:8px; margin:10px 0;"/> A <b>cana-de-açúcar</b> e a criação de gado ajudam a região a ganhar dinheiro. Só que os <b>agrotóxicos</b>, venenos usados contra insetos, fungos e ervas daninhas, podem escorrer com a chuva para os rios ou afundar no solo até a água subterrânea. E o cocô do gado também suja a água. Seu desafio é produzir comida SEM destruir a natureza. Agora quero te apresentar alguém que sente na pele quando a gente erra nisso...',
            icon: '🌾',
            educationalTopic: 'agricultura_agua'
        },

        {
            chapter: 3, bookOnly: true,
            character: 'Claudia',
            title: 'Quem Decide Sobre a Água?',
            text: 'No Brasil existe a <b>Lei das Águas</b>. Ela diz que a água é um <b>bem público</b>: ninguém é dono de um rio. Quando a água fica escassa, a prioridade é matar a sede das <b>pessoas</b> e dos <b>animais</b>. <br><br>Muitas decisões são tomadas nos <b>comitês de bacia</b>, uma espécie de reunião onde governo, empresas, agricultores e grupos de moradores conversam e combinam como dividir a água do rio. É democracia da água! <br><br>E você também ajuda em casa: fechar a torneira ao escovar os dentes, tomar banhos curtos e consertar vazamentos fazem diferença quando milhões de pessoas fazem o mesmo.',
            icon: '🤝'
        },

        // Step 8: Riparian Forest & APP (Pescador José)
        {
            chapter: 4,
            character: JOSE,
            background: 'assets/images/tutorial/bg-rio-pescador.webp',
            title: 'Prazer, eu sou o José!',
            text: 'Oi, {nome}! Eu sou o José, pescador deste rio. Aprendi a pescar com meu pai, que aprendeu com meu avô, e conheço cada curva dessa água desde menino. E vou te contar o segredo de um rio cheio de peixe: a <b>Mata Ciliar</b>! <img src="assets/images/lessons/mata-ciliar.webp" alt="Mata ciliar fazendo sombra no rio, com peixes e um martim-pescador" style="width:100%; border-radius:8px; margin:10px 0;"/> Sabe por que ela tem esse nome? Porque protege o rio igual os cílios protegem os seus olhos! As árvores da margem fazem sombra e deixam a água fresquinha, do jeito que o peixe gosta. As raízes seguram a terra para ela não cair no rio, e as frutas e os insetos que caem das galhadas viram comida para os peixes. Por isso essas margens são <b>Áreas de Preservação Permanente</b>: a lei não deixa desmatar nem construir ali, a não ser em casos especiais. É na sombra dessas árvores que muitos peixes se escondem, comem e se reproduzem.',
            icon: '🎣',
            educationalTopic: 'mata_ciliar_app'
        },

        // Step 9: Erosion & Sedimentation (Pescador José)
        {
            chapter: 4,
            character: JOSE,
            background: 'assets/images/tutorial/bg-erosao.webp',
            title: 'O Rio que Eu Conheci Está Sumindo',
            expression: 'worried',
            text: 'Quando cortam as árvores da margem, é um desastre! A chuva arrasta a terra solta para dentro do rio. Isso é a <b>erosão</b>! <img src="assets/images/lessons/erosao.webp" alt="Margem sem árvores: a chuva leva a terra para o rio e forma um banco de areia" style="width:100%; border-radius:8px; margin:10px 0;"/> Aí vem o <b>assoreamento</b>: o rio vai enchendo de terra, lama e areia, fica raso e com cor de café com leite. Onde eu passava de barco quando era moço, hoje encalho num banco de areia. O barro entope as brânquias dos peixes, que funcionam como os pulmões deles, e cobre o fundo onde eles botam os ovos. Tem dia que eu jogo a rede e ela volta vazia. Por favor, proteja as árvores da margem! Mas tem uma coisa pior, que nem dá para ver... a Pesquisadora Márcia vai te explicar.',
            icon: '🧱',
            educationalTopic: 'erosao_assoreamento'
        },

        // Step 10: Sewage & Contamination Details (Pesquisadora Márcia)
        {
            chapter: 4,
            character: MARCIA,
            background: 'assets/images/tutorial/bg-coleta-rio.webp',
            title: 'Márcia e o Perigo Invisível! ☣️',
            expression: 'worried',
            text: 'Olá, {nome}! Eu sou a Márcia, pesquisadora de <b>qualidade da água e saneamento</b>. Passo boa parte do tempo na beira do rio, de bota e binóculo, coletando amostras de água para analisar. E os resultados trazem um alerta: cuidado com o <b>esgoto</b>! <img src="assets/images/lessons/esgoto-oxigenio.webp" alt="Cano de esgoto sujando o rio e peixes sem ar na superfície" style="width:100%; border-radius:8px; margin:10px 0;"/> Quando o esgoto cai no rio sem tratamento, as bactérias que comem essa sujeira gastam o <b>oxigênio dissolvido</b> na água, o mesmo oxigênio que os peixes respiram. Quando eu meço e esse número despenca, já sei: os peixes vão sufocar. É por isso que a rede do José volta vazia! E tem mais: nas amostras aparecem bactérias que vêm do cocô, como os <b>coliformes fecais</b>, sinal de que a água pode causar doenças como a diarreia. Por isso precisamos de <b>rede de coleta de esgoto</b>, que leva a sujeira pelos canos, e de <b>estações de tratamento de esgoto</b>, que limpam essa água antes de devolvê-la ao rio.',
            icon: '🧪',
            educationalTopic: 'esgoto_contaminacao'
        },

        {
            chapter: 4, bookOnly: true,
            character: JOSE,
            title: 'Os Bichos Contam se a Água Está Boa',
            text: 'Quem vive do rio aprende a ler a água pelos bichos. Quando eu era menino, a gente virava as pedras do fundo e achava um monte de larvinhas. Alguns insetos e larvas só vivem em água limpa e cheia de oxigênio: se eles somem, é sinal de poluição. A Márcia me contou que os cientistas chamam esses bichinhos de <b>bioindicadores</b>. Os sapos e as rãs também avisam: eles têm a pele fina, que deixa a sujeira da água passar, e estão entre os primeiros a sofrer com ela. <br><br>Ela também me explicou o <b>oxigênio dissolvido</b>: a água limpa tem oxigênio misturado nela, e é dele que os peixes respiram. Esgoto e água quente diminuem esse oxigênio. <br><br>Por isso a lei brasileira, o <b>Código Florestal</b>, obriga a manter a mata nas margens dos rios. Quanto mais largo o rio, maior a faixa de floresta que precisa ficar em pé. Essa lei é boa para o rio e para quem vive dele!',
            icon: '🔍'
        },

        // Step 11: Groundwater & Springs
        {
            chapter: 5,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-agua-subterranea.webp',
            title: 'A Água Subterrânea: O Tesouro Escondido',
            expression: 'worried',
            text: '{nome}, olha esse perigo escondido! Debaixo da terra existe um mundo de água: os <b>aquíferos</b> e os <b>lençóis freáticos</b>. <img src="assets/images/lessons/agua-subterranea.webp" alt="Corte do solo mostrando o aquífero, um poço e a sujeira do lixão afundando" style="width:100%; border-radius:8px; margin:10px 0;"/> Não são lagos escondidos: na maior parte dos lugares, a água fica nos espacinhos entre os grãos de areia e nas rachaduras das rochas, como numa esponja. Essa reserva abastece poços e nascentes. Mas quando vaza sujeira no chão, como o <b>chorume</b> do lixão, gasolina ou agrotóxicos, ela afunda e contamina essa água. E o pior: limpar um aquífero sujo é difícil e pode levar muitas e muitas décadas! Proteja as <b>nascentes</b> como tesouros, porque elas alimentam os rios.',
            icon: '💧',
            educationalTopic: 'agua_subterranea'
        },

        // Step 12: Urban Planning (Várzea)
        {
            chapter: 5,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-cidade-rio.webp',
            title: 'Cidades Inteligentes: Respeitar o Rio',
            text: 'Sabe o que acontece quando a cidade cresce do jeito errado? Casas debaixo d\'água! O rio precisa de espaço para respirar. <img src="assets/images/lessons/enchente.webp" alt="Casas construídas na várzea do rio, alagadas na enchente" style="width:100%; border-radius:8px; margin:10px 0;"/> A <b>várzea</b> é a área de segurança do rio: quando chove muito, o rio enche (é a <b>enchente</b>) e transborda para ali (é a <b>inundação</b>). Mas tem gente que constrói casa bem nesse lugar! Resultado: as casas ficam debaixo d\'água. E o asfalto e o concreto não deixam a chuva entrar no chão: a água corre toda de uma vez pelas ruas, causa <b>alagamentos</b> e chega mais rápido ao rio. Precisamos de um <b>planejamento urbano inteligente</b>, que respeite o espaço da natureza.',
            icon: '🏗️',
            educationalTopic: 'ocupacao_urbana'
        },

        {
            chapter: 5, bookOnly: true,
            character: 'Claudia',
            title: 'O Gigante Debaixo dos Nossos Pés',
            text: 'Debaixo do Brasil, da Argentina, do Paraguai e do Uruguai existe o <b>Aquífero Guarani</b>, um dos maiores reservatórios de água subterrânea do mundo! A água fica guardada nos poros das rochas, como numa esponja de pedra. <br><br>Ele se enche devagar nas <b>áreas de recarga</b>, lugares onde a chuva consegue entrar no solo. Se esses lugares viram asfalto ou recebem lixo e agrotóxicos, o aquífero recebe menos água, e água mais suja. <br><br>Muitas cidades tiram água de <b>poços</b> que chegam até ele. Por isso, cuidar do chão também é cuidar da água que a gente bebe!',
            icon: '🗺️'
        },

        // Step 13: Green Infrastructure Solutions
        {
            chapter: 6,
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-solucoes-verdes.webp',
            title: 'Soluções Verdes: Tecnologia a Favor da Natureza',
            text: 'Agora as soluções incríveis! A <b>infraestrutura verde</b> usa a própria natureza como tecnologia. <img src="assets/images/lessons/infraestrutura-verde.webp" alt="Rua com jardim de chuva, telhado verde e calçada que deixa a água passar" style="width:100%; border-radius:8px; margin:10px 0;"/> Os <b>jardins de chuva</b> são canteiros mais baixos que a rua: recebem a enxurrada e deixam a água infiltrar devagar no solo, como uma esponja. Os <b>tetos verdes</b> são telhados cheios de plantas que seguram a chuva e refrescam a cidade. E os <b>pavimentos permeáveis</b> são calçadas com espaços ou poros que deixam a água passar para o chão. É a engenharia copiando a natureza! Assim a gente diminui as enchentes e ainda deixa a cidade mais bonita.',
            icon: '🌿',
            educationalTopic: 'infraestrutura_verde'
        },

        // Step 14: Floating Gardens (Pesquisadora Márcia)
        {
            chapter: 6,
            character: MARCIA,
            background: 'assets/images/tutorial/bg-jardins-flutuantes.webp',
            title: 'Jardins Flutuantes: Ilhas que Limpam a Água',
            text: 'Uma das soluções que eu mais gosto de estudar são os <b>jardins flutuantes</b>! São ilhas de plantas que boiam no rio ou no lago. <img src="assets/images/lessons/jardim-flutuante.webp" alt="Jardim flutuante com raízes na água, peixinhos e um sapo" style="width:100%; border-radius:8px; margin:10px 0;"/> As raízes ficam penduradas na água e funcionam como o filtro de uma geladeira: elas absorvem os nutrientes que sobram do adubo e do esgoto, que fazem as algas crescerem sem parar, e os micróbios que vivem grudados nelas ajudam a desmanchar a sujeira. Quando eu comparo as amostras, a água em volta deles sai mais limpa! E ainda viram abrigo: os peixes se escondem e desovam entre as raízes, os sapos caçam insetos nas folhas e até passarinho faz ninho ali. O José jura que já viu cardume voltando perto de um deles. Limpeza, beleza e vida juntas!',
            icon: '🪷',
            educationalTopic: 'jardins_flutuantes'
        },

        {
            chapter: 6, bookOnly: true,
            character: 'Claudia',
            title: 'Cidades-Esponja',
            text: 'Já imaginou uma cidade que funciona como uma <b>esponja</b>? Essa ideia já é usada em várias cidades do mundo! Em vez de jogar a chuva rapidinho para canos e bueiros, a cidade-esponja <b>guarda e infiltra</b> a água: parques que alagam de propósito, lagoas, jardins de chuva e calçadas que deixam a água passar. <br><br>Isso faz parte das <b>Soluções Baseadas na Natureza</b>: usar plantas, solo e água a nosso favor. Os <b>alagados construídos</b>, por exemplo, são brejos feitos pelas pessoas onde plantas, areia, pedras e micróbios ajudam a limpar o esgoto, como um filtro vivo. <br><br>Menos enchente, mais verde e água mais limpa. A natureza é a melhor engenheira, {nome}!',
            icon: '🧽'
        },

        // ===== MISSÕES (opcional) =====
        {
            group: 'missions', mode: 'coach', offer: true, character: 'Claudia', icon: '🎯',
            title: 'Quer conhecer as missões?',
            text: 'As missões mostram o que a cidade precisa agora e dão recompensas. Posso te mostrar onde elas ficam?'
        },
        // Cada passo pede um clique no que está destacado, e o clique já avança (advanceOnClick)
        {
            group: 'missions', mode: 'coach', character: 'Claudia', icon: '🎯',
            title: 'O botão de Missões',
            text: '{nome}, <b>clique no 🎯</b> para abrir as suas missões.',
            targets: ['#btn-missions'],
            advanceOnClick: true
        },
        {
            group: 'missions', mode: 'coach', character: 'Claudia', icon: '📋',
            title: 'Suas missões',
            text: 'Em <b>Agora</b> ficam as missões que você pode fazer: as metas, o progresso e o que você ganha. <b>Clique na missão</b> para ver os detalhes.',
            enter: openMissions,
            targets: [{ selector: '.mission-card.simple', scrollIn: '.hud-right' }, '.hud-right'],
            advanceOnClick: true
        },
        {
            group: 'missions', mode: 'coach', character: 'Claudia', icon: '📖',
            title: 'Os detalhes',
            text: 'Aqui está <b>o que fazer</b> e <b>o que você ganha</b>: dinheiro, pontos e às vezes a dica de um estudo que libera novas construções! Use <b>← Voltar</b> para ver a lista de novo.',
            enter: gm => {
                if (document.querySelector('.mission-details')) return;
                const id = [...gm.questSystem.activeQuests][0];
                if (id) gm.questSystem.showMissionDetails(id);
                gm.uiManager.showMissionPanel();
            },
            targets: ['.mission-details .mission-goals', '.hud-right']
        },
        {
            group: 'missions', mode: 'coach', character: 'Claudia', icon: '🏗️',
            title: 'Atalho para construir',
            text: 'Viu o <b>🏗️ ›</b> numa meta? <b>Clique na meta</b> e eu te levo direto ao prédio na aba de construções!',
            targets: ['.mission-details .mission-goal.goal-link', '.mission-details .mission-goals', '.hud-right'],
            advanceOnClick: true
        },
        {
            group: 'missions', mode: 'coach', character: 'Claudia', icon: '💧',
            title: 'A missão da vez',
            text: 'A missão atual também fica aqui embaixo, com o progresso. <b>Clique nela</b> sempre que quiser ver os detalhes.',
            // o atalho do passo anterior abriu o menu de construção: ele sairia por cima da barra de missão
            enter: gm => { closeMissions(gm); gm.uiManager.closeBuildModal?.(); },
            targets: ['.hud-bottom .mission-info', '.hud-bottom-toggle'],
            advanceOnClick: true
        },

        // ===== INTERFACE (opcional) =====
        {
            group: 'interface', mode: 'coach', offer: true, character: JOSE, icon: '🧭',
            title: 'Um tour pela tela?',
            text: 'Quer que eu te mostre o que cada número da tela significa? Eu também apanhei um pouco no começo, mas é rapidinho!',
            enter: closeMissions
        },
        {
            group: 'interface', mode: 'coach', character: JOSE, icon: '💧',
            title: 'Água',
            text: 'Quanta água a cidade tem guardada. Se ela acabar, é <b>fim de jogo</b>!',
            targets: ['.resource-item:has(#water-amount)', '#compact-water']
        },
        {
            group: 'interface', mode: 'coach', character: JOSE, icon: '🏭',
            title: 'Poluição',
            text: 'Quanto mais alta, pior para o rio, para os peixes e para quem vive deles! Se chegar a <b>100%</b>, também é fim de jogo. Tratamento de esgoto ajuda a baixar.',
            targets: ['.resource-item:has(#pollution-level)', '.mobile-top-toggle.resource-toggle']
        },
        {
            group: 'interface', mode: 'coach', character: JOSE, icon: '👥',
            title: 'População',
            text: 'Quantas pessoas moram na cidade. Mais gente paga mais impostos, mas também consome mais água.',
            targets: ['.resource-item:has(#population-count)', '#compact-population']
        },
        {
            group: 'interface', mode: 'coach', character: JOSE, icon: '😊',
            title: 'Satisfação',
            text: 'O quanto os moradores estão felizes com a cidade. Serviços públicos e parques deixam todo mundo mais contente.',
            targets: ['.resource-item:has(#satisfaction-level)', '.mobile-top-toggle.resource-toggle']
        },
        {
            group: 'interface', mode: 'coach', character: JOSE, icon: '💰',
            title: 'Orçamento',
            text: 'O dinheiro da cidade. Toda construção custa, e algumas têm manutenção. Guarde um pouco para emergências!',
            targets: ['.resource-item:has(#budget-amount)', '#compact-budget']
        },
        {
            group: 'interface', mode: 'coach', character: JOSE, icon: '⚡',
            title: 'Energia',
            text: 'Algumas construções precisam de eletricidade. Se faltar energia, elas perdem eficiência.',
            targets: ['.resource-item:has(#electricity-amount)', '#compact-energy']
        },
        {
            group: 'interface', mode: 'coach', character: JOSE, icon: '🕐',
            title: 'Relógio',
            text: 'A data e a hora da cidade. O tempo só começa a passar quando este tutorial terminar.',
            targets: ['.resource-item:has(#game-clock)', '.mobile-top-toggle.resource-toggle']
        },
        {
            group: 'interface', mode: 'coach', character: 'Claudia', icon: '🏗️',
            title: 'Construções',
            text: 'Aqui ficam as construções, separadas por categoria. As marcadas com 🔒 ainda estão bloqueadas: clique nelas para <b>estudar</b> e desbloquear.',
            targets: ['#building-panel', '.mobile-toggle.left']
        },
        {
            group: 'interface', mode: 'coach', character: JOSE, icon: '📹',
            title: 'Movendo a câmera',
            text: 'Arraste para mover, segure o <b>botão direito</b> para girar e use a <b>roda do mouse</b> para zoom (teclado: setas/WASD, Q/E gira, R volta). No celular, arraste com um dedo e use dois para zoom. Clique numa construção para ver os detalhes dela.'
        },
        {
            group: 'interface', mode: 'coach', character: MARCIA, icon: '❓',
            title: 'Seu perfil, pausa e ajuda',
            text: 'Anote aí: clique no <b>seu nome</b> para pausar o jogo: lá você vê seus pontos e missões, salva o jogo e encontra a <b>❓ ajuda</b> com todos os comandos. No computador, a tecla <b>Espaço</b> também pausa (e o jogo salva sozinho de tempos em tempos).',
            targets: ['#player-chip']
        },

        // ===== FINAL =====

        // Step 18: Game Logic
        {
            group: 'end',
            character: MARCIA,
            background: 'assets/images/tutorial/bg-causa-efeito.webp',
            title: 'Como o Jogo Funciona: Causa e Efeito!',
            text: 'Quando eu coleto uma amostra no rio e o resultado da análise muda, eu vou atrás da causa. No jogo é igual! Imagine que a cidade é um organismo vivo: <img src="assets/images/lessons/causa-e-efeito.webp" alt="Jovens plantando árvores na margem deixam o rio limpo; o esgoto mais adiante deixa o rio sujo" style="width:100%; border-radius:8px; margin:10px 0;"/> ✅ Se você PLANTAR mata ciliar → Qualidade da água MELHORA ↑<br>❌ Se FALTAR tratamento de esgoto → Poluição AUMENTA ↑<br>✅ Se construir jardins de chuva → Enchentes DIMINUEM ↓<br>❌ Se usar muitos agrotóxicos → Peixes MORREM ↓<br>Cada ação tem uma reação! Observe os <b>indicadores coloridos</b> na tela: verde = bom, amarelo = atenção, vermelho = perigo! Pense antes de agir.',
            icon: '⚙️'
        },

        // Step 21: Tips & Strategy
        {
            group: 'end',
            character: MARCIA,
            background: 'assets/images/tutorial/bg-caderno-campo.webp',
            title: 'Dicas Estratégicas da Márcia!',
            text: 'Anote estas <b>dicas de ouro</b>, do jeito que eu anoto tudo no meu caderno de campo:<br>🔍 <b>Priorize a Pesquisa</b>: Construa Centros de Pesquisa cedo para identificar problemas<br>🌳 <b>Proteja Primeiro</b>: Mata Ciliar previne problemas futuros<br>💧 <b>Trate o Esgoto</b>: Sempre antes de expandir a população<br>⚖️ <b>Equilibre Economia e Ecologia</b>: Não sacrifique a natureza pelo lucro rápido<br>📊 <b>Monitore Constantemente</b>: Fique de olho nos indicadores<br><img src="assets/images/lessons/caderno-de-campo.webp" alt="Caderno de campo com desenhos de árvore, gota e peixe, binóculo e amostra de água" style="width:100%; border-radius:8px; margin:10px 0;"/> Lembre-se: prevenção é mais barato que correção! Um problema pequeno hoje vira crise amanhã.',
            icon: '💡'
        },

        // Secretário Paulo: quem avisa dos eventos (EventDecisionUI) e dos alertas ambientais
        {
            group: 'end',
            character: PAULO,
            background: 'assets/images/tutorial/bg-causa-efeito.webp',
            title: 'Prazer, {nome}! Eu sou o Paulo',
            text: 'Sou o <b>Secretário Municipal de Meio Ambiente</b>. Meu trabalho é ficar de olho no tempo, no rio e no ar da cidade. Quando vier uma <b>seca</b>, uma <b>chuva forte</b>, um <b>vazamento</b> ou uma <b>oportunidade</b> (como um dinheiro do governo), eu chamo você e trago <b>quatro escolhas</b>: 🛡️ a melhor resolve quase tudo, mas custa mais e às vezes pede um prédio pronto; as outras ajudam menos; e <b>não fazer nada</b> deixa o problema inteiro (ou faz a gente perder a chance). Acertar várias seguidas rende prêmio! Também sou eu quem avisa quando a poluição sobe ou o aquífero baixa. Conto com você, {nome}!',
            icon: '🧢'
        },

        // Step 22: Final Conclusion
        {
            group: 'end',
            character: 'Claudia',
            background: 'assets/images/tutorial/bg-rio-boas-vindas.webp',
            title: 'Você está pronto, {nome}!',
            expression: 'happy',
            text: 'Parabéns, {nome}! A Prefeitura está de pé e você já sabe como a cidade funciona. <img src="assets/images/lessons/cidade-sustentavel.webp" alt="Cidade sustentável ao nascer do sol, com rio limpo, painéis solares e turbinas eólicas" style="width:100%; border-radius:8px; margin:10px 0;"/> Lembre-se: a água conecta tudo — a cidade, as plantações, a floresta e os bichos. O José, a Márcia, o Paulo e eu estaremos por perto. Quer rever as aulas sobre a água? É só tocar em <b>📚</b>. <b>Boa sorte, {nome}!</b> 🌊',
            icon: '🎓'
        }
    ];
}

    /**
     * Inicia o tutorial. O GameManager já deixou o jogo em gameState 'tutorial' (congelado).
     */
    start() {
        this.lessonsDeferred = false; // true = aulas sobre a água vêm uma por missão
        return this.begin(this.tutorialSteps.filter(step => !step.bookOnly), 'tutorial');
    }

    /**
     * Aula rápida de uma área (botão "🎓 Aprender sobre..." dos painéis de recurso): passos coach
     * que destacam o próprio HUD. O jogo fica congelado ('tutorial') até fechar.
     */
    startTopic(topic) {
        const gm = this.gameManager;
        const lesson = TutorialSystem.TOPICS[topic];
        if (!lesson || this.isActive || gm.gameState !== 'playing') return false;
        gm.uiManager.closeResourcePanel();
        gm.uiManager.hideHudRight();
        const steps = lesson.steps.map(s => ({
            mode: 'coach', group: 'topic', chapter: topic, character: 'Claudia',
            icon: lesson.icon, lessonLabel: `Aula rápida · ${lesson.title}`, ...s
        }));
        gm.gameState = 'tutorial';
        this.begin(steps, 'topic');
        return true;
    }

    // ===== REFAZER (central de aulas, aba "Como jogar") =====
    /** Passos de uma parte do tutorial inicial, sem a pergunta "quer ver?" nem as páginas só de livro. */
    replaySteps(group) {
        return this.tutorialSteps.filter(step => this.groupOf(step) === group && !step.offer && !step.bookOnly);
    }

    replayPart(group) {
        const gm = this.gameManager;
        const part = TutorialSystem.REPLAY_PARTS.find(p => p.group === group);
        if (!part || this.isActive || gm.gameState !== 'playing') return false;
        const steps = this.replaySteps(group).map(step => ({
            ...step, chapter: group, lessonLabel: `Rever · ${part.title}`, skipLabel: 'Fechar'
        }));
        gm.gameState = 'tutorial';
        this.begin(steps, 'replay');
        return true;
    }

    // ===== GUIAS PROGRESSIVOS =====
    /**
     * A cada 2 s: se a cidade chegou ao ponto de um guia (GUIDES[i].when) e o anterior já foi feito, abre
     * o guia, só com o jogo rodando e nada aberto na frente. Feito ou pulado, não volta (por jogador).
     */
    checkGuides() {
        const gm = this.gameManager;
        if (window.gameManager && window.gameManager !== gm) return clearInterval(this.guideTimer); // jogo antigo
        if (this.isActive || gm.gameState !== 'playing' || gm.buildMode || gm.pauseReasons?.size) return;
        if (gm.uiManager?.isInfoPopupOpen() || Date.now() - (this.lastGuideEnd || 0) < 3000) return;
        const guide = TutorialSystem.nextGuide(gm);
        if (guide) this.startGuide(guide.id);
        else this.checkRescue?.(); // recurso caindo sem parar: guia de socorro (RescueGuides.js)
    }

    static nextGuide(gm) {
        const done = TutorialSystem.guidesDone();
        return TutorialSystem.GUIDES.find(g => !done.includes(g.id) && (!g.after || done.includes(g.after)) && g.when(gm)) || null;
    }

    /**
     * Primeira falta de energia do jogador (BuildingFeedback.showEnergyShortageNotification): em vez do alerta
     * central, abre o guia 'energy' assim que o jogo estiver livre (checkGuides). Retorna true se o guia vai
     * aparecer (quem chamou não mostra o alerta); false se o jogador já viu o guia.
     */
    requestEnergyGuide() {
        if (TutorialSystem.guidesDone().includes('energy')) return false;
        if (this.isActive && this.run === 'guide' && this.guideId === 'energy') return true;
        this.energyGuidePending = true;
        return true;
    }

    startGuide(id) {
        const gm = this.gameManager;
        const guide = TutorialSystem.GUIDES.find(g => g.id === id);
        if (!guide || this.isActive || !['playing', 'tutorial'].includes(gm.gameState)) return false;
        if (id === 'energy') this.energyGuidePending = false;
        gm.uiManager.closeResourcePanel?.();
        const steps = guide.steps.map(s => ({
            mode: 'coach', group: 'guide', chapter: guide.id, character: 'Claudia',
            icon: guide.icon, lessonLabel: `Guia · ${guide.title}`, skipLabel: 'Fazer depois', ...s
        }));
        if (gm.gameState === 'playing') gm.gameState = 'tutorial';
        this.guideId = id;
        this.begin(steps, 'guide');
        return true;
    }

    // Guias feitos, por jogador (localStorage; como LessonProgress)
    static guidesDone() {
        try {
            const all = JSON.parse(localStorage.getItem(TutorialSystem.GUIDES_KEY)) || {};
            return all[PlayerProfile.getActive()?.id || 'anon'] || [];
        } catch {
            return [];
        }
    }

    static markGuideDone(id) {
        try {
            const all = JSON.parse(localStorage.getItem(TutorialSystem.GUIDES_KEY)) || {};
            const key = PlayerProfile.getActive()?.id || 'anon';
            all[key] = [...new Set([...(all[key] || []), id])];
            localStorage.setItem(TutorialSystem.GUIDES_KEY, JSON.stringify(all));
        } catch (error) {
            console.warn('⚠️ Não foi possível salvar o guia:', error.message);
        }
    }

    /**
     * Hook de QuestSystem.completeQuest: quem escolheu aprender "durante o jogo" ganha a próxima aula
     * ainda não feita (LessonProgress), aberta no livro da central de aulas.
     */
    onMissionCompleted(missionId) {
        if (!this.lessonsDeferred) return;
        const open = () => { // depois da comemoração da missão: a aula ligada à missão (LessonProgress.forMission)
            // o cartão de comemoração (ui/MissionCardUI.js) ainda na tela ou na fila: espera ele fechar
            const ui = this.gameManager.uiManager;
            if (ui?.isMissionCardOpen?.() || ui?.missionCardQueue?.length) return setTimeout(open, 1000);
            const next = LessonProgress.forMission(missionId);
            if (next == null) {
                this.lessonsDeferred = false;
                return;
            }
            if (this.isActive || this.gameManager.gameState !== 'playing') return;
            if (Number(MISSIONS[missionId]?.lesson) === next) {
                ui.showNotification(`📖 Aula ${next}: ${LESSON_CHAPTERS[next].title}. Tem tudo a ver com a missão que você acabou de concluir!`, 'info', 6000);
            }
            ui.openLessonBook(next);
        };
        setTimeout(open, 4000);
    }

    /** run: 'tutorial' (início do jogo) ou 'topic' (aula rápida de um painel de recurso) */
    async begin(steps, run) {
        this.lastStoryStep = null;
        this.steps = steps;
        this.run = run;
        this.isActive = true;
        this.currentStep = 0;
        this.mode = null;

        this.showTutorialUI();
        this.renderCurrentStep();
        document.addEventListener('keydown', this.handleKey, true);
        document.addEventListener('click', this.handleTargetClick, true);
        this.coachTimer = setInterval(() => this.updateCoach(), 250);
        log(`📚 Tutorial iniciado (${run})`);
    }

    showTutorialUI() {
        document.getElementById('tutorial-container').style.display = 'flex';
    }

    hideTutorialUI() {
        document.getElementById('tutorial-container').style.display = 'none';
        document.getElementById('tutorial-spotlight').hidden = true;
    }

    groupOf(step) {
        return step.group || 'intro';
    }

    /** Prédio que o passo atual manda construir (null = nenhum). */
    get allowedBuilding() {
        return this.isActive ? this.steps[this.currentStep]?.waitFor ?? null : null;
    }

    /** Trava de UIManager.selectBuildingType: com o tutorial aberto, só o que o passo pede (prédio ou categoria). */
    allowsBuilding(buildingTypeId) {
        const step = this.isActive ? this.steps[this.currentStep] : null;
        if (!step) return true;
        if (step.waitForCategory) return this.gameManager.buildingSystem.buildingTypes.get(buildingTypeId)?.category === step.waitForCategory;
        return buildingTypeId === step.waitFor;
    }

    stepWantsBuilding(step, building) {
        return step?.waitForCategory ? building.config?.category === step.waitForCategory : building.type === step?.waitFor;
    }

    /** Passo que manda construir algo pago (guias, aulas): o jogador age no jogo, então ele não pode estar congelado. */
    isActionStep(step) {
        return !!(step?.waitFor || step?.waitForCategory) && !step.free;
    }

    /**
     * Guias/aulas/revisões congelam o jogo ('tutorial') só nas falas; no passo de ação ele roda ('playing'),
     * para a obra andar e a fila de obras esvaziar. O tutorial inicial fica sempre congelado (prefeitura grátis
     * e pronta na hora). Pausa (Espaço) ou fim de jogo no meio do guia não são mexidos.
     */
    syncActionStepClock(step) {
        const gm = this.gameManager;
        if (this.run === 'tutorial' || !['playing', 'tutorial'].includes(gm.gameState)) return;
        gm.gameState = this.isActionStep(step) ? 'playing' : 'tutorial';
    }

    isStepDone(step) {
        const bs = this.gameManager.buildingSystem;
        if (step.waitForCategory) return bs.getAllBuildings().some(b => b.config?.category === step.waitForCategory);
        return !step.waitFor || bs.getBuildingsByType(step.waitFor).length > 0;
    }

    /**
     * Renders the current tutorial step
     */
    async renderCurrentStep() {
        const step = this.steps[this.currentStep];
        if (!step || !this.isActive) return;

        stopSpeaking();
        step.enter?.(this.gameManager);
        this.syncActionStepClock(step);
        ResearchLog.startPage(this.run, step.chapter ?? this.groupOf(step), step.title);

        const container = document.getElementById('tutorial-container');
        const mode = step.mode || 'story';
        if (mode !== this.mode) {
            this.mode = mode;
            container.classList.toggle('tutorial--story', mode === 'story');
            container.classList.toggle('tutorial--coach', mode === 'coach');
        }

        this.showPortrait(step);

        // Fundo de tela cheia só existe no modo story
        if (step.background) {
            const background = document.getElementById('tutorial-background');
            const img = new Image();
            img.onload = () => { background.style.backgroundImage = `url('${step.background}')`; };
            img.onerror = () => log('ℹ️ Using gradient fallback for background');
            img.src = step.background;
        }

        // Modo história = livro: vira a página (mesma animação do livro da central de aulas)
        const body = container.querySelector('.tut-body');
        body.classList.remove('turn-in-next', 'turn-in-prev');
        if (mode === 'story' && this.lastStoryStep != null && this.lastStoryStep !== this.currentStep) {
            void body.offsetWidth; // reinicia a animação
            body.classList.add(this.currentStep > this.lastStoryStep ? 'turn-in-next' : 'turn-in-prev');
        }
        this.lastStoryStep = mode === 'story' ? this.currentStep : null;

        document.getElementById('tutorial-icon').innerHTML = step.icon ? uiIcon(step.icon, 'lg') : '';
        document.getElementById('tutorial-title').textContent = PlayerProfile.personalize(step.title);
        const text = document.getElementById('tutorial-text');
        // Última página de uma aula: as fontes com link, como no livro
        const endsChapter = typeof step.chapter === 'number' && this.steps[this.currentStep + 1]?.chapter !== step.chapter;
        // Passos de interface citam botões ("toque em 🏗️"), que agora são SVG; o texto das aulas (capítulos) fica como está
        const stepText = PlayerProfile.personalize(step.text);
        text.innerHTML = (typeof step.chapter === 'number' ? stepText : uiIconsIn(stepText)) +
            (endsChapter ? this.gameManager.uiManager?.renderLessonSources?.(step.chapter) || '' : '');
        text.scrollTop = 0;
        document.getElementById('tutorial-character-name').textContent = TutorialSystem.displayName(step.character);

        // Progresso dentro da parte atual ("Missões · 2 de 4", "Aula 3 · 1 de 2")
        const lessons = this.run !== 'tutorial'; // aulas (📚) e aulas rápidas (painéis de recurso)
        const partOf = s => (lessons ? s.chapter : this.groupOf(s));
        const part = this.steps.filter(s => partOf(s) === partOf(step));
        const position = part.indexOf(step) + 1;
        const label = lessons ? (step.lessonLabel || `Aula ${step.chapter}`) : TutorialSystem.GROUP_LABELS[this.groupOf(step)];
        document.getElementById('tutorial-progress').textContent = `${label} · ${position} de ${part.length}`;
        document.getElementById('tutorial-progress-fill').style.width = `${(position / part.length) * 100}%`;

        this.lastHint = null; // força redesenhar a dica
        this.updateButtonStates();
        this.updateCoach();

        log(`📚 Tutorial step ${this.currentStep + 1}/${this.steps.length}: ${step.title}`);
    }

    /**
     * Retrato animado do personagem do passo (AnimatedPortrait, um por personagem, reaproveitado entre passos).
     * História no computador: busto no quadro; coach e celular: só o rosto, em círculo. Personagem novo em
     * cena entra com o balão de saudação; os demais passos só mexem a boca enquanto a página aparece.
     */
    showPortrait(step) {
        const slot = document.getElementById('tutorial-portrait');
        const portrait = this.portraitFor(step.character);
        if (!portrait) {
            slot.replaceChildren();
            this.portraitShown = null;
            return;
        }
        const small = this.mode === 'coach' || window.innerWidth <= 768;
        portrait.setCrop(small ? 'face' : 'bust');
        portrait.setLabel(TutorialSystem.displayName(step.character));
        portrait.setExpression(TutorialSystem.expressionFor(step, this.gameManager));
        if (portrait.el.parentNode !== slot) slot.replaceChildren(portrait.el);
        // Voz curta a cada página, no humor da expressão (normal sorteada, animada, preocupada, triste)
        AudioManager.onSpeaker(TutorialSystem.CHARACTERS[step.character]?.id, portrait.expression);
        if (this.portraitShown !== step.character) {
            this.portraitShown = step.character;
            const hello = TutorialSystem.CHARACTERS[step.character]?.hello;
            portrait.enter(!small && hello ? PlayerProfile.personalize(hello) : '');
        }
        portrait.talk(1400);
    }

    portraitFor(character) {
        const id = TutorialSystem.CHARACTERS[character]?.id;
        if (!id || typeof PORTRAIT_MANIFEST === 'undefined' || !PORTRAIT_MANIFEST[id]) return null;
        this.portraits[id] ||= new AnimatedPortrait(id, { speechScope: document.getElementById('tutorial-container') });
        return this.portraits[id];
    }

    updateButtonStates() {
        const step = this.steps[this.currentStep];
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const nextBtn = document.getElementById('tutorial-next-btn');
        const skipBtn = document.getElementById('tutorial-skip-btn');

        prevBtn.disabled = this.currentStep === 0;
        nextBtn.disabled = !this.isStepDone(step);

        const last = this.currentStep === this.steps.length - 1;
        const lessons = this.run !== 'tutorial'; // aulas (📚) e aulas rápidas (painéis de recurso)
        if (last) {
            nextBtn.textContent = lessons ? 'Voltar ao jogo' : 'Começar a jogar!';
        } else {
            nextBtn.textContent = step.nextLabel || (step.offer ? 'Mostrar' : 'Próximo →');
        }

        const skipLabel = lessons ? (!last && (step.skipLabel || 'Fechar aula')) : step.skipLabel || TutorialSystem.SKIP_LABELS[this.groupOf(step)];
        skipBtn.hidden = !skipLabel;
        if (skipLabel) skipBtn.textContent = skipLabel;
    }

    /**
     * Modo coach: destaca o primeiro alvo visível do passo e encaixa o card longe dele.
     * Roda num intervalo porque o alvo muda conforme o jogador abre menus.
     */
    updateCoach() {
        const step = this.steps[this.currentStep];
        const spotlight = document.getElementById('tutorial-spotlight');
        if (!this.isActive || !step || this.mode !== 'coach') {
            spotlight.hidden = true;
            return;
        }

        const placing = (step.waitFor || step.waitForCategory) && this.gameManager.buildingSystem.previewMode;
        const target = placing ? null : this.findTarget(step.targets);

        const hint = document.getElementById('tutorial-hint');
        const hintHtml = (placing ? step.placingHint : target?.text) || '';
        if (hintHtml !== this.lastHint) {
            this.lastHint = hintHtml;
            hint.hidden = !hintHtml;
            hint.innerHTML = uiIconsIn(hintHtml || '');
        }

        const container = document.getElementById('tutorial-container');
        let dockX = 'center';
        let dockY = 'bottom';
        if (target) {
            const r = target.el.getBoundingClientRect();
            const pad = 6;
            Object.assign(spotlight.style, {
                left: `${r.left - pad}px`, top: `${r.top - pad}px`,
                width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`
            });
            spotlight.hidden = false;
            const cx = (r.left + r.right) / 2;
            const cy = (r.top + r.bottom) / 2;
            dockY = cy > window.innerHeight / 2 ? 'top' : 'bottom';
            if (cx < window.innerWidth / 3) dockX = 'right';
            else if (cx > window.innerWidth * 2 / 3) dockX = 'left';
        } else {
            spotlight.hidden = true;
            if (placing) { // canto de cima: centro do mapa e barra do modo construção livres
                dockX = 'right';
                dockY = 'top';
            }
        }
        container.dataset.dockX = dockX;
        container.dataset.dockY = dockY;

        // o "Próximo" destrava assim que o passo é cumprido
        document.getElementById('tutorial-next-btn').disabled = !this.isStepDone(step);
    }

    /**
     * Passo coach com `advanceOnClick`: clicar no alvo destacado faz o que o jogo faria (abrir o painel,
     * a missão...) e avança o tutorial — o aluno segue clicando no que a Claudia aponta.
     * Escuta em captura; o next() vem depois para o clique chegar primeiro ao jogo.
     */
    onTargetClick(event) {
        const step = this.steps[this.currentStep];
        if (!this.isActive || this.mode !== 'coach' || !step?.advanceOnClick) return;
        const target = this.findTarget(step.targets);
        if (!target || !target.el.contains(event.target)) return;
        const stepIndex = this.currentStep;
        setTimeout(() => {
            if (this.isActive && this.currentStep === stepIndex) this.next();
        }, 60);
    }

    findTarget(targets = []) {
        for (const t of targets) {
            const el = document.querySelector(t.selector || t);
            if (!el) continue;
            // alvo dentro de lista rolável: traz para a vista se a lista estiver na tela
            if (t.scrollIn && !this.isOnScreen(el) && this.isOnScreen(document.querySelector(t.scrollIn))) {
                el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
            if (this.isOnScreen(el)) return { el, text: t.text };
        }
        return null;
    }

    isOnScreen(el) {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 &&
            r.left < window.innerWidth && r.top < window.innerHeight &&
            (el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) ?? true);
    }

    /**
     * Hook chamado por BuildingSystem.placeBuilding. A prefeitura do tutorial é
     * grátis e fica pronta na hora (o loop está congelado, a obra nunca terminaria).
     */
    /** O passo atual dá este prédio de graça (a prefeitura)? placeBuilding cobra 0 e o card fica liberado. */
    isFreeBuilding(typeId) {
        const step = this.steps?.[this.currentStep];
        return !!(this.isActive && step?.free && step.waitFor === typeId);
    }

    onBuildingPlaced(building) {
        const step = this.steps[this.currentStep];
        if (!this.isActive || !this.stepWantsBuilding(step, building)) return;

        const gm = this.gameManager;
        gm.uiManager?.dismissBuildModal?.(); // o menu aberto pelo passo não fica por cima dos próximos destaques
        if (!step.free) return this.next(); // guias: a obra é paga e termina quando o jogo voltar a rodar
        gm.buildingSystem.buildingCooldown.active = false; // não cobrou nada (isFreeBuilding), não há o que devolver
        gm.buildingSystem.completeConstruction(building);
        if (building.type === 'city_hall') {
            gm.addCityHallLightingEffects(building);
            gm.centerCameraOnCityHall(building.gridX, building.gridZ);
        }
        this.next();
    }

    onKeyDown(e) {
        if (!this.isActive || e.target.closest?.('button, input, textarea, select')) return;
        if (document.querySelector('.swal2-container')) return;

        const story = this.mode === 'story';
        const nextBtn = document.getElementById('tutorial-next-btn');
        const skipBtn = document.getElementById('tutorial-skip-btn');

        if (e.key === 'Enter' || (story && e.key === 'ArrowRight')) {
            if (!nextBtn.disabled) this.next();
        } else if (story && e.key === 'ArrowLeft') {
            this.previous();
        } else if (e.key === 'Escape' && !skipBtn.hidden) {
            this.skip();
        } else {
            return; // no modo coach as setas continuam movendo a câmera
        }
        e.preventDefault();
        e.stopPropagation();
    }

    goTo(index) {
        this.currentStep = index;
        this.renderCurrentStep();
    }

    next() {
        const step = this.steps[this.currentStep];
        if (!this.isStepDone(step)) return;
        // "Aprender agora" no início: terminar a última página de um capítulo conclui aquela aula
        if (this.run === 'tutorial' && typeof step.chapter === 'number' && this.steps[this.currentStep + 1]?.chapter !== step.chapter) {
            if (LessonProgress.markDone(step.chapter)) ResearchLog.record('lesson_done', { source: 'tutorial', target: step.chapter, value: 'first' });
        }
        if (this.run === 'tutorial' && step.offer && this.groupOf(step) === 'intro') ResearchLog.record('tutorial_choice', { value: 'now' });
        if (this.currentStep < this.steps.length - 1) {
            AudioManager.playSound(this.mode === 'story' ? 'sfx_book_page' : 'sfx_tutorial_next');
            this.goTo(this.currentStep + 1);
        } else {
            this.complete();
        }
    }

    previous() {
        if (this.currentStep > 0) {
            AudioManager.playSound(this.mode === 'story' ? 'sfx_book_page' : 'sfx_tutorial_next');
            this.goTo(this.currentStep - 1);
        }
    }

    /**
     * "Pular" leva ao início da próxima parte. Partes obrigatórias não têm o botão.
     */
    skip() {
        if (this.run !== 'tutorial') return this.complete();
        const step = this.steps[this.currentStep];
        const group = this.groupOf(step);
        if (!step.skipLabel && !TutorialSystem.SKIP_LABELS[group]) return;
        if (group === 'intro') { // "durante o jogo": as aulas que faltam vêm uma por missão
            this.lessonsDeferred = true;
            ResearchLog.record('tutorial_choice', { value: step.offer ? 'later' : 'skip_rest', target: step.chapter ?? null });
        }
        const nextIndex = this.steps.findIndex((s, i) => i > this.currentStep && this.groupOf(s) !== group);
        log(`📚 Parte "${group}" pulada`);
        if (nextIndex === -1) return this.complete();
        this.goTo(nextIndex);
    }

    /**
     * Encerra o tutorial e só então solta o jogo.
     */
    complete() {
        if (!this.isActive) return;
        this.isActive = false;
        clearInterval(this.coachTimer);
        document.removeEventListener('keydown', this.handleKey, true);
        document.removeEventListener('click', this.handleTargetClick, true);
        this.hideTutorialUI();
        stopSpeaking();
        ResearchLog.endPage();
        Object.values(this.portraits).forEach(p => p.hideBalloon());
        this.portraitShown = null;
        AudioManager.resetSpeaker(); // na próxima aula/guia o personagem cumprimenta de novo

        const gm = this.gameManager;
        gm.gameState = 'playing';
        if (this.run === 'guide') {
            TutorialSystem.markGuideDone(this.guideId);
            this.lastGuideEnd = Date.now();
        } else if (this.run === 'rescue') {
            this.lastGuideEnd = Date.now();
        }
        if (this.run !== 'tutorial') return;

        gm.timeScale = 1;
        gm.questSystem?.restartClocks();
        // Daqui em diante o jogo pode ser salvo; salva já a cidade com a prefeitura
        gm.tutorialDone = true;
        gm.autoSave();

        log('✅ Tutorial concluído');
        gm.uiManager?.showNotification(PlayerProfile.personalize('🎓 Tutorial concluído! Boa sorte, {nome}!'), 'success', 5000);
    }
}

// Partes do tutorial inicial que a central de aulas deixa refazer (aba "Como jogar")
TutorialSystem.REPLAY_PARTS = [
    { group: 'cityhall', icon: '🏛️', title: 'Primeiros passos', summary: 'A Prefeitura, o orçamento e o cuidado com as árvores.' },
    { group: 'missions', icon: '🎯', title: 'Missões', summary: 'Onde ficam as missões, os detalhes e o atalho para construir.' },
    { group: 'interface', icon: '🧭', title: 'Tour pela tela', summary: 'O que cada número do topo significa, câmera e pausa.' },
    { group: 'end', icon: '⚙️', title: 'Como o jogo funciona', summary: 'Causa e efeito, dicas da Pesquisadora Márcia, o Secretário Paulo e o recado final.' }
];

TutorialSystem.GROUP_LABELS = { intro: 'Introdução', cityhall: 'Prefeitura', missions: 'Missões', interface: 'Interface', end: 'Final' };
TutorialSystem.SKIP_LABELS = { intro: 'Pular aulas', missions: 'Pular esta parte', interface: 'Pular esta parte' };

// ===== PERSONAGENS =====
// Chave = `character` dos passos. `name` aparece no retrato e no livro; `id` = pasta assets/characters/<id>/ e
// entrada de PORTRAIT_MANIFEST (js/data/portraits.js): retrato animado de IA em camadas (js/ui/AnimatedPortrait.js),
// usado no tutorial, no livro de aulas e no fim de jogo. `hello`: balão quando o personagem entra em cena.
// Personagem novo: gere base + variações (olhos fechados, bocas a/o, worried, happy) pelo padrão de
// assets/images/_prompts.json, recorte as camadas e acrescente-o ao manifesto.
TutorialSystem.CHARACTERS = {
    Claudia: {
        name: 'Pesquisadora Cláudia', id: 'claudia', hello: 'Oi, {nome}!', emoji: '👩‍🔬', colors: ['#19c3c9', '#0b6e8a']
    },
    'Pescador José': {
        name: 'Pescador José', id: 'jose', hello: 'Ô, {nome}! Chega mais!', emoji: '🎣', colors: ['#0b6e8a', '#5cc6d0']
    },
    'Pesquisadora Márcia': {
        name: 'Pesquisadora Márcia', id: 'marcia', hello: 'Olá, {nome}!', emoji: '🧪', colors: ['#2e7d32', '#9ccc65']
    },
    // Secretário Municipal de Meio Ambiente: fala de todo problema e solução ambiental da cidade (eventos com
    // decisão em ui/EventDecisionUI.js, alertas de poluição e de aquífero)
    'Secretário Paulo': {
        name: 'Secretário Paulo', id: 'paulo', hello: 'E aí, {nome}! Prazer!', emoji: '🧢', colors: ['#2e7d32', '#00a86b']
    }
};

TutorialSystem.displayName = character => TutorialSystem.CHARACTERS[character]?.name || character || '';

/** Avatar local: círculo com gradiente e o emoji do personagem (SVG em data: URI, funciona como src de <img>). */
TutorialSystem.avatarOf = character => {
    const c = TutorialSystem.CHARACTERS[character] || { emoji: '💧', colors: ['#4a9eff', '#1d6fd1'] };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.colors[0]}"/>` +
        `<stop offset="1" stop-color="${c.colors[1]}"/></linearGradient></defs>` +
        `<rect width="200" height="200" fill="url(#g)"/>` +
        `<text x="100" y="104" font-size="96" text-anchor="middle" dominant-baseline="middle">${c.emoji}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/** Imagem fixa do personagem (base do retrato animado); sem retrato de IA, o avatar local. */
TutorialSystem.portraitOf = character => {
    const id = TutorialSystem.CHARACTERS[character]?.id;
    return id ? `assets/characters/${id}/portrait.webp` : TutorialSystem.avatarOf(character);
};

/**
 * Expressão do retrato num passo: `step.expression` se o passo define (inclusive null); nos guias (coach depois
 * do tutorial inicial), preocupado se falta água ou a poluição está crítica; feliz nos passos de comemoração
 * (🎉/🏆). Aulas rápidas e o livro não olham o estado da cidade: a aula explica, não dá bronca.
 */
TutorialSystem.expressionFor = (step, gm) => {
    if (step.expression !== undefined) return step.expression;
    const ts = gm?.tutorialSystem;
    if (step.mode === 'coach' && gm?.tutorialDone && ts?.isActive && ts.run === 'guide') {
        const rm = gm?.resourceManager;
        if (rm?.hasWaterShortage?.() || rm?.hasCriticalPollution?.()) return 'worried';
    }
    return /🎉|🏆/.test(step.icon || '') ? 'happy' : null;
};

// Aulas rápidas por área (startTopic), abertas pelos painéis de recurso. Chave = tipo do painel.
// name entra em "Aprender sobre <name>"; targets seguem a regra do coach (o primeiro alvo na tela ganha o destaque).
TutorialSystem.TOPICS = {
    water: {
        name: 'a água', title: 'Água', icon: '💧',
        steps: [
            { title: 'O estoque de água', text: '{nome}, este número é a água guardada na cidade. Ele <b>sobe</b> com o que bombas, poços e a ETA produzem e <b>desce</b> com o que as pessoas usam.', targets: ['.resource-item:has(#water-amount)', '#compact-water'] },
            { title: 'Como conseguir mais', text: 'Na categoria <b>💧 Água</b> ficam as fontes. Bombas e poços tiram água do <b>aquífero</b>, debaixo da terra. A <b>ETA</b> capta água de <b>rios e lagos</b> e precisa ficar a até 10 blocos da água. Quase todas precisam de <b>energia</b> para funcionar.', targets: ['.category-btn[data-category="water"]'] },
            { title: 'Aquífero e rio têm limite', text: 'No painel da 💧 água aparecem o nível do <b>aquífero</b> e dos <b>rios e lagos</b>. Tirar demais esvazia os dois. <b>Árvores</b> e áreas verdes recarregam o aquífero; a <b>estação de esgoto</b> devolve água limpa ao rio.', targets: ['.resource-item:has(#water-amount)', '#compact-water'] },
            { title: 'Guardar para depois', text: 'Reservatórios da categoria <b>💧 Água</b> guardam água para os dias secos. Sem chuva, os rios baixam: veja o clima no relógio!', targets: ['.category-btn[data-category="water"]', '#clock-weather', '#compact-weather'] },
            { title: 'Não deixe acabar!', expression: 'worried', text: 'Se a água acabar, é <b>fim de jogo</b>. Construa novas fontes antes de faltar, e não só quando o número já estiver baixo.' }
        ]
    },
    pollution: {
        name: 'a poluição', title: 'Poluição', icon: '🏭',
        steps: [
            { title: 'O nível de poluição', text: 'Este número mostra o quanto a cidade está suja. Fábricas, lixo e esgoto sem tratamento sujam <b>a água e o ar</b>.', targets: ['.resource-item:has(#pollution-level)'] },
            { title: 'Limpar a água', text: 'Na categoria <b>🏭 Tratamento</b> ficam as estações que limpam a água usada antes de ela voltar para o rio.', targets: ['.category-btn[data-category="treatment"]'] },
            { title: 'Cuidado com o exagero', expression: 'worried', text: '{nome}, poluição alta deixa a população triste e pode <b>acabar o jogo</b>. Áreas verdes e tratamento de esgoto ajudam muito!' }
        ]
    },
    population: {
        name: 'a população', title: 'População', icon: '👥',
        steps: [
            { title: 'Quem mora aqui', text: 'Este número mostra quantas pessoas vivem na cidade. Mais gente traz mais impostos, mas também gasta mais <b>água</b> e <b>energia</b>.', targets: ['.resource-item:has(#population-count)', '#compact-population'] },
            { title: 'Onde morar', text: 'As zonas da categoria <b>🏘️ Residencial</b> trazem novos moradores para a cidade.', targets: ['.category-btn[data-category="residential"]'] },
            { title: 'Crescer com cuidado', text: 'Antes de a cidade crescer, garanta que tem <b>água e energia</b> para todo mundo. Cidade grande sem água vira problema grande!' }
        ]
    },
    satisfaction: {
        name: 'a satisfação', title: 'Satisfação', icon: '😊',
        steps: [
            { title: 'A felicidade da cidade', text: 'Este número mostra se as pessoas estão felizes. Gente feliz fica na cidade e ajuda ela a crescer.', targets: ['.resource-item:has(#satisfaction-level)'] },
            { title: 'O que deixa triste', text: 'Falta de água, falta de energia e poluição deixam todo mundo chateado. Resolver esses problemas é o primeiro passo.' },
            { title: 'O que deixa feliz', text: '{nome}, os prédios da categoria <b>🏛️ Públicos</b>, como parques, deixam a cidade melhor de viver.', targets: ['.category-btn[data-category="public"]'] }
        ]
    },
    budget: {
        name: 'o dinheiro', title: 'Orçamento', icon: '💰',
        steps: [
            { title: 'O caixa da cidade', text: 'Este é o dinheiro da cidade. <b>Toda construção sai daqui.</b>', targets: ['.resource-item:has(#budget-amount)', '#compact-budget'] },
            { title: 'De onde vem o dinheiro', text: 'O dinheiro entra com os impostos dos moradores e com as recompensas das <b>missões 🎯</b>.', targets: ['#btn-missions'] },
            { title: 'Gastar com sabedoria', text: '{nome}, cada prédio também tem um custo para continuar funcionando. Planeje antes de construir e não deixe o caixa zerar!' }
        ]
    },
    electricity: {
        name: 'a energia', title: 'Energia', icon: '⚡',
        steps: [
            { title: 'Geração x consumo', text: 'Aqui você vê a energia da cidade. <b>Geração</b> é o que as usinas produzem; <b>consumo</b> é o que bombas, estações de tratamento e zonas gastam. A conta precisa fechar: geração <b>maior ou igual</b> ao consumo.', targets: ['.resource-item:has(#electricity-amount)', '#compact-energy'] },
            { title: 'Eficiência baixa', expression: 'worried', text: 'Se a cidade gasta mais do que gera, a energia é dividida e <b>todos os prédios trabalham mais devagar</b>: com metade da energia, as bombas tiram metade da água e o tratamento limpa menos. A eficiência mostra isso.' },
            { title: 'Como gerar', text: 'Na categoria <b>⚡ Energia</b> ficam as usinas. Prefira as <b>limpas</b>: o <b>Campo Eólico</b> usa o vento para girar as pás e um gerador, sem poluir a água nem o ar.<img src="assets/images/studies/parque-eolico.webp" alt="Campo eólico: o vento gira as pás e o gerador manda energia para a cidade" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin:8px 0;"/>', targets: ['.category-btn[data-category="power"]'] },
            { title: 'Sempre uma folga', text: 'Gere um pouco <b>mais</b> do que a cidade usa: cada obra nova de água, tratamento ou moradia aumenta o consumo. Usina bloqueada? Clique nela para estudar e liberar!' }
        ]
    }
};

// ===== GUIAS PROGRESSIVOS (checkGuides) =====
// Abrem sozinhos quando a cidade chega ao ponto certo, um depois do outro (after). Passo com waitFor/
// waitForCategory espera a obra (paga: só a prefeitura do tutorial é grátis). Feitos ficam em GUIDES_KEY.
TutorialSystem.GUIDES_KEY = 'guardiao_agua_guides';

// Alvos do passo "construa": acompanham o aluno abrindo menu (mobile) → categoria → prédio
TutorialSystem.buildTargets = (typeId, category, label) => [
    { selector: '#build-info-construct:not([hidden])', text: '👆 Agora clique (ou toque) em <b>Construir</b>.' },
    { selector: `.building-item[data-building-type="${typeId}"]`, text: `👆 Escolha <b>${label}</b>. Bloqueado? Veja o que falta e estude para liberar.`, scrollIn: '#build-modal-grid' },
    { selector: `.category-btn[data-category="${category}"]`, text: '👆 Abra esta categoria.' },
    { selector: '.mobile-toggle.left', text: '👆 Toque em <b>🏗️</b> para abrir as construções.' }
];

// Eficiência elétrica abaixo de 100% (ResourceManager.updateElectricity) com algum consumo
TutorialSystem.isEnergyShort = (gm) => {
    const electricity = gm?.resourceManager?.resources?.electricity;
    return !!electricity && electricity.consumption > 0 && electricity.efficiency < 1;
};

TutorialSystem.completedBuildings = (gm, test) =>
    gm.buildingSystem.getAllBuildings().some(b => !b.underConstruction && b.config && test(b.config));

TutorialSystem.GUIDES = [
    {
        // Primeira falta de energia (alerta "Energia Insuficiente" ou eficiência < 100%): substitui o alerta
        // central nessa primeira vez (requestEnergyGuide). Sem 'after': vale a qualquer momento, uma vez por jogador.
        id: 'energy', title: 'Energia', icon: '⚡',
        when: gm => !!gm.tutorialSystem?.energyGuidePending || TutorialSystem.isEnergyShort(gm),
        steps: [
            { title: 'Faltou energia!', expression: 'worried', text: '{nome}, a cidade está gastando mais energia do que produz. <b>Geração</b> é o que as usinas produzem; <b>consumo</b> é o que bombas, estações de tratamento e zonas gastam.', targets: ['.resource-item:has(#electricity-amount)', '#compact-energy'] },
            { title: 'O que acontece agora', text: 'Com menos energia do que precisa, <b>todos os prédios trabalham mais devagar</b>: a eficiência cai, as bombas tiram menos água, o tratamento limpa menos e os moradores ficam insatisfeitos.' },
            { title: 'O vento pode ajudar', text: 'Um <b>Campo Eólico</b> transforma vento em energia: o vento gira as pás, as pás giram um gerador e a energia vai pelos fios até a cidade. Não polui a água nem o ar!<img src="assets/images/studies/parque-eolico.webp" alt="Campo eólico: o vento gira as pás e o gerador manda energia para a cidade" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin:8px 0;"/>' },
            {
                title: 'Construa um Campo Eólico', waitFor: 'wind_farm',
                text: 'Abra <b>⚡ Energia</b> e construa um <b>Campo Eólico</b>. Está bloqueado? Clique nele para <b>estudar</b> e liberar. Sem dinheiro agora? Use <b>Fazer depois</b>.',
                placingHint: '👆 Escolha um terreno livre: colinas também servem, lá venta mais!',
                enter: gm => gm.uiManager.uiState.currentCategory !== 'power' && gm.uiManager.selectCategory('power'),
                targets: TutorialSystem.buildTargets('wind_farm', 'power', 'o 💨 Campo Eólico')
            },
            { title: 'Energia a caminho!', expression: 'happy', text: 'Quando a obra terminar, a geração sobe e a eficiência volta a <b>100%</b>. Dica: gere sempre um pouco <b>mais</b> do que a cidade usa, porque cada obra nova aumenta o consumo.', targets: ['.resource-item:has(#electricity-amount)', '#compact-energy'] }
        ]
    },
    {
        // Primeira vez que abre a categoria 🛣️ Asfalto (UIManager.selectCategory chama checkGuides na hora)
        // ou já tem rua. Sem 'after': vale a qualquer momento, uma vez por jogador.
        id: 'roads', title: 'Ruas', icon: '🛣️',
        when: gm => gm.uiManager?.uiState?.currentCategory === 'roads' ||
            gm.buildingSystem.getAllBuildings().some(b => b.config?.roadType),
        steps: [
            { title: 'Hora de abrir ruas!', text: 'Ruas levam as pessoas de casa até a escola, o trabalho e o hospital. Aqui no <b>🛣️ Asfalto</b> elas ficam <b>prontas na hora</b> e custam <b>bem pouco</b>: nada de esperar obra!', targets: ['.category-btn[data-category="roads"]'] },
            {
                title: 'Trace uma rua', waitForCategory: 'roads',
                text: 'Escolha a <b>Rua Asfaltada</b>. Depois, no mapa, <b>segure e arraste</b> (com o mouse ou o dedo): a rua segue em linha reta e o custo total aparece embaixo. Um clique só faz um bloco.',
                placingHint: '👆 Segure e arraste no mapa. <b>Verde</b> = vira rua; <b>vermelho</b> = ocupado, água ou falta dinheiro.',
                enter: gm => gm.uiManager.uiState.currentCategory !== 'roads' && gm.uiManager.selectCategory('roads'),
                targets: TutorialSystem.buildTargets('paved_road', 'roads', 'a 🛣️ Rua Asfaltada')
            },
            { title: 'Curvas e cruzamentos sozinhos', expression: 'happy', text: 'Encoste uma rua na outra e ela se liga sozinha: vira <b>curva</b>, <b>bifurcação</b> ou <b>cruzamento</b>, com faixa no meio e calçada nas bordas. Não precisa girar nada!' },
            { title: 'Cadê os carros?', text: 'Quando a cidade tiver <b>20 blocos de rua ligados</b>, carros e caminhões começam a circular. Quanto mais ruas, mais movimento, {nome}!' },
            { title: 'Rua também mexe com a água', expression: 'worried', text: 'O <b>asfalto</b> não deixa a chuva entrar no chão: a água corre por cima, vira <b>enxurrada</b> e leva lixo para o rio. A <b>estrada de terra</b> é de terra batida: entra pouca água e a enxurrada arrasta o barro (<b>erosão</b>), deixando o rio barrento. O <b>cascalho</b> é o melhor dos três para a chuva: entre as pedrinhas entra mais água e a enxurrada leva menos barro. Plante árvores e jardins de chuva perto das ruas!' }
        ]
    },
    {
        // Água de superfície (10/2026): primeira ETA construída, ou o aquífero baixando com a ETA já ao alcance
        // (bombas/poços puxando e tecnologia alcançada). Sem 'after': vale a qualquer momento, uma vez por jogador.
        id: 'rivers', title: 'Água dos rios', icon: '🏞️',
        when: gm => gm.buildingSystem.getAllBuildings().some(b => b.config?.surfaceWater) ||
            ((gm.resourceManager?.getAquiferLevel?.() ?? 100) <= 60 && (gm.techTree?.isReached?.('water_treatment_plant') ?? false)),
        steps: [
            { title: 'Água de baixo e água de cima', text: '{nome}, a cidade pode buscar água em dois lugares. <b>Embaixo da terra</b>, no <b>aquífero</b>, com bombas e poços. E <b>em cima</b>, nos <b>rios</b>, <b>lagos</b> e <b>represas</b>. Cada um tem seu limite: tirar demais esvazia os dois!', targets: ['.resource-item:has(#water-amount)', '#compact-water'] },
            { title: 'A ETA busca água no rio', text: 'A <b>Estação de Tratamento de Água (ETA)</b> capta a água do rio e deixa ela boa para beber. Ela precisa ficar a até <b>10 blocos</b> de um rio ou lago. Encostada na água, capta direto. Mais longe, a cidade instala sozinha uma <b>bomba na margem</b> e os <b>canos</b> até a estação. Ela dá o dobro de água de um poço, mas os produtos do tratamento <b>poluem</b> um pouco e as máquinas gastam <b>energia</b>.<img src="assets/images/studies/captacao-rio.webp" alt="Bomba na beira do rio e um cano azul levando a água até a estação de tratamento" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin:8px 0;"/>' },
            {
                title: 'Construa uma ETA', waitFor: 'water_treatment_plant',
                text: 'Abra <b>💧 Água</b> e construa uma <b>Estação de Tratamento de Água</b> perto de um rio ou lago. Está bloqueada? Clique nela para <b>estudar</b> e liberar. Sem dinheiro agora? Use <b>Fazer depois</b>.',
                placingHint: '👆 Chegue perto da água (até 10 blocos). O texto junto do cursor mostra quantos canos serão instalados.',
                enter: gm => gm.uiManager.uiState.currentCategory !== 'water' && gm.uiManager.selectCategory('water'),
                targets: TutorialSystem.buildTargets('water_treatment_plant', 'water', 'a 🏞️ Estação de Tratamento de Água')
            },
            { title: 'O rio também tem limite', expression: 'worried', text: 'Clique na 💧 água lá em cima: o painel mostra o nível dos <b>Rios e lagos</b>. A ETA faz o rio baixar; as nascentes e a chuva enchem de novo, e na <b>seca</b> enchem menos. Rio baixo dá menos água para a cidade e para os peixes.', targets: ['.resource-item:has(#water-amount)', '#compact-water'] },
            { title: 'Devolva a água limpa', expression: 'happy', text: 'O segredo é a <b>Estação de Tratamento de Esgoto (ETE)</b>, em <b>Tratamento</b>: ela limpa a água suja da cidade e devolve ao rio, que fica mais <b>cheio</b> e mais <b>vivo</b>. E as <b>árvores</b> ajudam o aquífero: as raízes deixam a chuva entrar no chão!', targets: ['.category-btn[data-category="treatment"]'] }
        ]
    },
    {
        id: 'storage', title: 'Guardar água', icon: '🛢️',
        // água e energia funcionando: hora de guardar para os dias secos
        when: gm => TutorialSystem.completedBuildings(gm, c => c.waterProduction > 0) &&
            TutorialSystem.completedBuildings(gm, c => c.powerGeneration > 0),
        steps: [
            { title: 'Água e energia funcionando!', expression: 'happy', text: 'Muito bem, {nome}! A cidade já tem <b>água</b> e <b>energia</b>. Mas e quando não chover? Rios e represas baixam na seca. Por isso as cidades <b>guardam água</b> em reservatórios.' },
            {
                title: 'Construa um Reservatório', waitFor: 'water_tank',
                text: 'Abra <b>💧 Água</b> e construa um <b>Reservatório</b>. Ele aumenta quanta água a cidade consegue guardar.',
                placingHint: '👆 Escolha um terreno livre. Sombra <b>laranja</b> = derruba árvores 🌳.',
                enter: gm => gm.uiManager.uiState.currentCategory !== 'water' && gm.uiManager.selectCategory('water'),
                targets: TutorialSystem.buildTargets('water_tank', 'water', 'o 🛢️ Reservatório')
            },
            { title: 'Reservatório em obra!', text: 'Quando a obra terminar, a <b>capacidade de água</b> da cidade aumenta. Na seca, é essa reserva que mantém as torneiras abertas!', targets: ['.resource-item:has(#water-amount)', '#compact-water'] }
        ]
    },
    {
        id: 'zoning', after: 'storage', title: 'Zoneamento', icon: '🏘️',
        when: () => true, // logo depois do armazenamento
        steps: [
            { title: 'Onde as pessoas vão morar?', text: 'Uma cidade cresce por <b>zonas</b>: <b>residencial</b> (casas), <b>comercial</b> (lojas) e <b>industrial</b> (fábricas). Cada uma pode ser <b>leve</b>, <b>equilibrada</b> ou <b>pesada</b>: quanto mais pesada, mais gente e mais gasto de água e energia. As casas ficam em <b>🏘️ Residencial</b>; lojas e fábricas, em Comercial e Industrial.', targets: ['.category-btn[data-category="residential"]'] },
            {
                title: 'Crie uma zona residencial', waitForCategory: 'residential',
                text: 'Abra <b>🏘️ Residencial</b> e construa uma <b>Zona Residencial Leve</b>. É a mais barata e traz os primeiros moradores!',
                placingHint: '👆 Escolha um terreno livre perto da cidade.',
                enter: gm => gm.uiManager.uiState.currentCategory !== 'residential' && gm.uiManager.selectCategory('residential'),
                targets: TutorialSystem.buildTargets('zone_residential_light', 'residential', 'a 🏘️ Zona Residencial Leve')
            },
            { title: 'Novos moradores a caminho', text: 'Quando a zona ficar pronta, chegam moradores. Lembre-se: mais gente = mais <b>água</b> e <b>energia</b>. Cresça com cuidado, {nome}!', targets: ['.resource-item:has(#population-count)', '#compact-population'] }
        ]
    },
    {
        id: 'public', after: 'zoning', title: 'Prédios públicos', icon: '🏛️',
        // com a primeira zona pronta, a cidade já tem moradores para atender
        when: gm => TutorialSystem.completedBuildings(gm, c => !!c.zoneType),
        steps: [
            { title: 'Serviços para a população', text: 'Agora que a cidade tem moradores, eles precisam de <b>escola</b>, <b>hospital</b>, <b>bombeiros</b> e <b>polícia</b>. Ficam em <b>🏛️ Públicos</b> e deixam as pessoas mais <b>satisfeitas</b>.', targets: ['.category-btn[data-category="public"]'] },
            { title: 'Áreas verdes também contam', text: 'Parques deixam a chuva infiltrar no solo; tetos e paredes verdes seguram parte da chuva e refrescam os prédios. Todos deixam a cidade mais fresca e ajudam a limpar o ar, igual às árvores do mapa!', targets: ['.resource-item:has(#satisfaction-level)'] }
        ]
    },
    {
        id: 'tourism', after: 'public', title: 'Turismo', icon: '🎡',
        when: () => true,
        steps: [
            { title: 'Visitantes trazem dinheiro', text: 'Em <b>🏬 Comercial</b>, nas partes <b>Cultura</b> e <b>Hospedagem e lazer</b>, ficam museus, hotéis e monumentos. Eles atraem visitantes e aumentam a <b>receita</b> da cidade, mas custam caro: junte dinheiro antes!', targets: ['.category-btn[data-category="commercial"]', '.resource-item:has(#budget-amount)'] },
            { title: 'Turista também usa água', text: 'Hotel cheio gasta muita água! Antes de investir em turismo, garanta <b>água guardada</b> e <b>tratamento</b> para todos.' }
        ]
    },
    {
        id: 'industrial', after: 'tourism', title: 'Indústria', icon: '🏭',
        when: () => true,
        steps: [
            { title: 'Fábricas geram empregos', text: 'Em <b>🏭 Industrial</b> ficam as zonas industriais, fábricas, centro tecnológico e porto. Eles rendem muito dinheiro e empregos.', targets: ['.category-btn[data-category="industrial"]'] },
            { title: 'E também poluem', expression: 'worried', text: 'Indústria pode sujar muito a água e o ar, e junto com o esgoto das casas é uma das grandes fontes de <b>poluição</b> dos rios. Construa <b>estações de tratamento</b> e mantenha as indústrias longe dos rios e das árvores, {nome}.', targets: ['.resource-item:has(#pollution-level)'] }
        ]
    },
    {
        id: 'commercial', after: 'industrial', title: 'Comércio', icon: '🏬',
        when: () => true,
        steps: [
            { title: 'Lojas e serviços', text: 'Em <b>🏬 Comercial</b> ficam as zonas comerciais, restaurantes, bancos, escritórios, shopping e o turismo. Eles movimentam a economia e pagam <b>impostos</b> para a cidade.', targets: ['.category-btn[data-category="commercial"]'] },
            { title: 'Equilíbrio é tudo', text: 'Cidade boa mistura casas, comércio, indústria, serviços e muito verde. Sempre com <b>água</b> e <b>energia</b> para todos. Agora é com você!' }
        ]
    }
];


// Exportar para escopo global
window.TutorialSystem = TutorialSystem;
log('📚 TutorialSystem carregado e exportado para window.TutorialSystem');
