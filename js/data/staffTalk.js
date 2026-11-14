/**
 * Falas dos funcionários da prefeitura (11/2026) — dados puros, lidos por js/systems/StaffTalk.js (sorteio e
 * marcadores) e mostrados por js/systems/ui/CityHallUI.js (cartão de contratação, conversa, nível novo).
 *
 * Marcadores (resolvidos por StaffTalk.resolve):
 *   {a|o}        gênero gramatical de quem fala: a 1ª opção é a forma feminina, a 2ª a masculina
 *                (ex.: "{obrigada|obrigado}", "sozinh{a|o}", "{a|o} {eu}" = "a Ana Souza" / "o João Lima");
 *   {nome}       nome do jogador; {eu} nome de quem fala; {cargo} título no gênero, em minúscula; {nivel} nível;
 *   {fila} …     números ao vivo do cargo (STAFF_TALK_VARS[cargo]), já escritos por extenso com a unidade.
 *
 * Por cargo:
 *   intro: apresentação em 2 frases (cartão "Parabéns pela contratação!");
 *   day:   o dia dela/dele — `when`: morning (5-12 h), afternoon (12-18 h), night, rain (chuva/tempestade), hot
 *          (sol forte e quente); sem `when` = qualquer hora;
 *   work:  o trabalho agora, com o número do cargo — `when`: good (o número vai bem) ou bad (parado);
 *   tips:  dica do momento — `when` = o problema da cidade que ela resolve (water, energy, pollution, money,
 *          satisfaction, events) ou calm (só com a cidade toda bem); sem `when` = conselho que vale sempre.
 * Texto para ~11 anos, coloquial, sem prometer número que o jogo não tem.
 */
const STAFF_TALK_WHEN = {
    day: ['morning', 'afternoon', 'night', 'rain', 'hot'],
    work: ['good', 'bad'],
    tips: ['water', 'energy', 'pollution', 'money', 'satisfaction', 'events', 'calm']
};

// Variáveis que cada cargo pode usar (CityHallUI.staffTalkVars entrega todas)
const STAFF_TALK_VARS = {
    common: ['nome', 'eu', 'cargo', 'nivel'],
    obras: ['fila', 'max', 'prontos'],
    servicos: ['estragados', 'eficiencia'],
    assistente_social: ['satisfacao', 'moradores'],
    eng_ambiental: ['poluicao', 'tendencia'],
    eng_civil: ['fila', 'desconto', 'prontos'],
    economista: ['saldo', 'caixa', 'folha'],
    eng_agronomo: ['arvores', 'mudas'],
    veterinario: ['especies', 'rio'],
    geografo: ['aquifero', 'rio']
};

const STAFF_TALK = {
    obras: {
        intro: [
            'Oi, {nome}! Eu sou {a|o} {eu}, {cargo} da prefeitura. Comigo a cidade toca mais uma obra ao mesmo tempo, e cada uma termina mais rápido.',
            'Prazer, {nome}! Sou {a|o} {eu} e vou cuidar dos canteiros de obra da cidade. Pode mandar construir que a turma está pronta.'
        ],
        day: [
            { when: 'morning', text: 'Acordei cedo, tomei um café bem forte e já passei em todos os canteiros.' },
            { when: 'afternoon', text: 'Almoço no canteiro é sagrado: marmita, uma sombra e meia hora de conversa com a turma.' },
            { when: 'night', text: 'Já escureceu. Conferi se as máquinas ficaram desligadas e as cercas, fechadas.' },
            { when: 'rain', text: 'Com essa chuva, o cimento não seca direito. Cobri tudo com lona e mandei a turma esperar.' },
            { when: 'hot', text: 'Que calor! Distribuí água para todo mundo e passei o serviço pesado para a sombra.' },
            { text: 'Hoje medi um terreno três vezes antes de marcar. No canteiro, a regra é medir duas vezes e cortar uma.' },
            { text: 'Achei um ninho de passarinho num andaime. Mudamos o andaime de lugar e o ninho ficou.' },
            { text: 'Ensinei um ajudante novo a usar o prumo hoje. Ele pegou o jeito rapidinho.' }
        ],
        work: [
            { when: 'good', text: 'Na fila agora: {fila}, de {max} que a gente aguenta ao mesmo tempo. A turma está animada!' },
            { when: 'good', text: 'Entregamos obra nova faz pouco tempo. A cidade já tem {prontos} de pé.' },
            { when: 'good', text: 'Com {fila} andando, ainda sobra espaço: o canteiro aguenta {max} de uma vez.' },
            { when: 'bad', text: 'Faz tempo que não entregamos nada. Na fila agora: {fila}. A turma está parada esperando serviço.' },
            { when: 'bad', text: 'Sem obra nova eu não aprendo nada novo. A cidade tem {prontos}, e o canteiro está quieto.' }
        ],
        tips: [
            { when: 'water', text: 'Se falta água, a primeira obra é uma bomba ou um poço perto da rua. Eu ponho ela na frente da fila.' },
            { when: 'energy', text: 'Prédio sem energia trabalha pela metade. Antes de abrir obra nova, vale construir uma usina.' },
            { when: 'money', text: 'Com o caixa apertado, é melhor terminar o que já começou do que abrir obra nova.' },
            { when: 'events', text: 'Quando o Paulo avisa de crise, eu seguro as obras grandes e deixo a turma pronta para consertar.' },
            { when: 'pollution', text: 'Obra também suja. Mudas perto do canteiro seguram a poeira e ajudam com a poluição.' },
            { when: 'calm', text: 'Tudo andando bem. Boa hora para planejar o próximo bairro, já com rua e água perto.' },
            { text: 'Toda obra precisa de rua do lado. Sem rua o caminhão não chega e o prédio rende menos.' }
        ]
    },

    servicos: {
        intro: [
            'Oi, {nome}! Eu sou {a|o} {eu}, {cargo}. Eu cuido para os equipamentos da cidade não quebrarem e conserto aos poucos o que a enchente estragar.',
            'Olá, {nome}! Pode me chamar de {eu}. Minha caixa de ferramentas já está no carro, {pronta|pronto} para qualquer conserto.'
        ],
        day: [
            { when: 'morning', text: 'Comecei o dia apertando parafuso de bomba d\'água. Barulho estranho nunca é bom sinal.' },
            { when: 'afternoon', text: 'Passei a tarde trocando uma peça gasta. Melhor trocar agora do que quebrar amanhã.' },
            { when: 'night', text: 'De noite eu faço a ronda das máquinas. Com a cidade quieta dá para ouvir o que está errado.' },
            { when: 'rain', text: 'Chuva é dia de olhar calha, bueiro e motor. Água no lugar errado estraga muita coisa.' },
            { when: 'hot', text: 'Com esse calor o motor esquenta demais. Fui conferir a ventilação de todo mundo.' },
            { text: 'Hoje achei um vazamento pequenininho. Pequeno hoje, enorme amanhã, se ninguém cuidar.' },
            { text: 'Organizei minha caixa de ferramentas. Chave certa na hora certa economiza um tempão.' }
        ],
        work: [
            { when: 'good', text: 'Os prédios estão funcionando, em média, a {eficiencia}. Do jeito que eu gosto.' },
            { when: 'good', text: 'Prédios com estrago agora: {estragados}. Ronda feita, tudo no lugar.' },
            { when: 'good', text: 'Média de {eficiencia} de funcionamento. Manutenção em dia evita conserto caro.' },
            { when: 'bad', text: 'Tem {estragados} com estrago agora. Estou consertando um pouquinho a cada minuto.' },
            { when: 'bad', text: 'A média caiu para {eficiencia}. Prédio sem rua ou sem energia rende menos, e aí não resolvo sozinh{a|o}.' }
        ],
        tips: [
            { when: 'energy', text: 'Está faltando energia: os prédios funcionam pela metade. Uma usina nova resolve mais que qualquer conserto.' },
            { when: 'water', text: 'Faltando água, confira se as bombas têm rua e energia. Bomba parada não enche tanque nenhum.' },
            { when: 'events', text: 'Tem crise chegando. Se algum prédio estragar eu conserto aos poucos, mas o botão Consertar é mais rápido.' },
            { when: 'money', text: 'Com pouco dinheiro, cuide do que já existe antes de construir mais. Conserto sai mais barato que prédio novo.' },
            { when: 'calm', text: 'Tudo funcionando! Aproveite para ligar numa rua os prédios que ainda estão sem.' },
            { text: 'Prédio sem rua do lado trabalha mais devagar. Uma rua curtinha já resolve.' }
        ]
    },

    assistente_social: {
        intro: [
            'Oi, {nome}! Eu sou {a|o} {eu}, {cargo}. Eu escuto os moradores e ajudo a deixar todo mundo mais satisfeito, até quando o imposto aperta.',
            'Que bom estar aqui, {nome}! Sou {a|o} {eu}, e minha porta vai estar sempre aberta para quem precisar conversar.'
        ],
        day: [
            { when: 'morning', text: 'Abri o atendimento cedinho e já tinha fila de gente querendo conversar.' },
            { when: 'afternoon', text: 'Passei a tarde visitando famílias novas no bairro. Todo mundo quer saber onde fica a escola.' },
            { when: 'night', text: 'Já é noite, mas ainda estou lendo os bilhetes dos moradores. Cada um conta uma história.' },
            { when: 'rain', text: 'Com chuva, o pessoal fica com medo de alagar. Fui avisar quem mora perto do rio.' },
            { when: 'hot', text: 'Nesse calorão, levei água para a praça e fiquei conversando na sombra com os mais velhos.' },
            { text: 'Uma senhora me trouxe bolo de fubá para agradecer uma ajuda. Fiquei {emocionada|emocionado}.' },
            { text: 'Fiz uma roda de conversa com as crianças. Elas têm ideias ótimas para a cidade!' }
        ],
        work: [
            { when: 'good', text: 'A satisfação dos moradores está em {satisfacao}. Gente feliz cuida melhor da cidade.' },
            { when: 'good', text: 'Somos {moradores} agora, e a satisfação está em {satisfacao}. Gosto do que escuto nas ruas.' },
            { when: 'good', text: 'Satisfação em {satisfacao} e firme. É assim que eu aprendo e cresço no trabalho.' },
            { when: 'bad', text: 'A satisfação está em {satisfacao}, abaixo do que eu queria. Tem muita gente reclamando.' },
            { when: 'bad', text: 'Com {moradores} e a satisfação em {satisfacao}, as reclamações aumentaram. Preciso da sua ajuda.' }
        ],
        tips: [
            { when: 'satisfaction', text: 'Os moradores andam chateados. Praça, parque e escola perto de casa costumam animar todo mundo.' },
            { when: 'money', text: 'Se o dinheiro aperta, subir o imposto dos moradores ajuda, mas eles reclamam. Eu seguro parte das reclamações.' },
            { when: 'water', text: 'Falta água nas casas, e é isso que mais aparece nas reclamações. Água primeiro!' },
            { when: 'pollution', text: 'Muita gente reclamando de cheiro ruim e ar sujo. Poluição deixa os moradores tristes.' },
            { when: 'energy', text: 'Casa sem luz deixa todo mundo nervoso. Uma usina nova acalma os ânimos.' },
            { when: 'calm', text: 'O pessoal está tranquilo. Que tal um parque novo? Gente feliz atrai mais gente.' },
            { text: 'Imposto baixo deixa os moradores contentes, mas a cidade arrecada menos. É sempre uma escolha.' }
        ]
    },

    eng_ambiental: {
        intro: [
            'Oi, {nome}! Eu sou {a|o} {eu}, {cargo}. Meu trabalho é fazer os prédios da cidade poluírem menos.',
            'Prazer, {nome}! Sou {a|o} {eu}. Vou medir o ar e a água todo dia e achar jeitos de sujar menos o rio.'
        ],
        day: [
            { when: 'morning', text: 'Logo cedo colhi uma amostra de água do rio. A cor diz muita coisa, mas o laboratório diz mais.' },
            { when: 'afternoon', text: 'À tarde visitei uma fábrica para ver o filtro da chaminé. Filtro sujo é fumaça na cidade.' },
            { when: 'night', text: 'De noite eu passo a limpo as medições do dia. Número anotado vira decisão melhor.' },
            { when: 'rain', text: 'A chuva lava as ruas e leva a sujeira para o rio. Hoje é dia de medir a água depois da enxurrada.' },
            { when: 'hot', text: 'No calor, o ar parado segura a fumaça perto do chão. Fiquei de olho nas chaminés.' },
            { text: 'Vi uma garça pescando na margem hoje. Bicho na beira do rio é sinal de água melhor.' },
            { text: 'Troquei ideia com o pessoal da estação de esgoto. Esgoto tratado é rio vivo.' }
        ],
        work: [
            { when: 'good', text: 'A poluição está em {poluicao} e {tendencia}. Sob controle, do jeito que precisa.' },
            { when: 'good', text: 'Poluição em {poluicao}. Com os prédios poluindo menos, o ar está melhor.' },
            { when: 'good', text: 'Medi de novo: poluição em {poluicao}, {tendencia}. Gosto de ver esse número assim.' },
            { when: 'bad', text: 'A poluição está em {poluicao} e {tendencia}. Preciso de ajuda para segurar isso.' },
            { when: 'bad', text: 'Poluição em {poluicao}. Eu diminuo a sujeira dos prédios, mas sozinh{a|o} não dou conta.' }
        ],
        tips: [
            { when: 'pollution', text: 'A poluição está alta. Estação de tratamento de esgoto e mudas na beira do rio limpam muito.' },
            { when: 'water', text: 'Faltou água? Antes de cavar mais poço, veja se o rio está limpo: água suja dá mais trabalho para tratar.' },
            { when: 'energy', text: 'Precisa de energia? Sol e vento não soltam fumaça. Usina a carvão resolve rápido, mas suja muito.' },
            { when: 'money', text: 'Com pouco dinheiro, plante mudas: são baratas e limpam o ar e a água aos poucos.' },
            { when: 'events', text: 'Crise à vista. Rio limpo e mata na margem aguentam melhor a seca e a enchente.' },
            { when: 'calm', text: 'A cidade está limpa. Para continuar assim, toda fábrica nova precisa de verde por perto.' },
            { text: 'O esgoto de cada morador também conta. Cidade crescendo pede estação de tratamento.' }
        ]
    },

    eng_civil: {
        intro: [
            'Oi, {nome}! Eu sou {a|o} {eu}, {cargo}. Com os meus cálculos, cada construção sai mais barata.',
            'Prazer, {nome}! Sou {a|o} {eu}. Projeto bem feito gasta menos material, e a cidade economiza.'
        ],
        day: [
            { when: 'morning', text: 'Comecei o dia revisando a planta de um prédio. Achei uma viga que podia ser menor.' },
            { when: 'afternoon', text: 'Fui ao canteiro conferir se a obra segue o projeto. Estava tudo direitinho.' },
            { when: 'night', text: 'À noite eu fico fazendo contas. Cada metro de cano a menos é dinheiro que sobra.' },
            { when: 'rain', text: 'Com chuva eu confiro se a água escoa no terreno. Prédio bom não deixa água parada.' },
            { when: 'hot', text: 'No calor o concreto seca rápido demais. Pedi para molharem a laje de hora em hora.' },
            { text: 'Testei um bloco de concreto novo hoje. Aguentou mais peso que o antigo e custa menos.' },
            { text: 'Desenhei uma ponte no meu caderno, só por diversão. Quem sabe um dia a cidade precise.' }
        ],
        work: [
            { when: 'good', text: 'Obras na fila: {fila}. Com os meus projetos, cada uma sai {desconto} mais barata.' },
            { when: 'good', text: 'Entregamos obra nova faz pouco tempo, e a cidade já tem {prontos}. Projeto bom, obra rápida.' },
            { when: 'good', text: 'As obras estão saindo {desconto} mais baratas. Essa economia vira outro prédio depois.' },
            { when: 'bad', text: 'Faz tempo que não sai obra nova. A cidade parou em {prontos}, e meus projetos ficam na gaveta.' },
            { when: 'bad', text: 'Na fila agora: {fila}. Eu economizo {desconto} em cada obra, mas preciso de obra para economizar.' }
        ],
        tips: [
            { when: 'money', text: 'Pouco dinheiro? Construa primeiro o que dá retorno: bairro com rua e água paga imposto.' },
            { when: 'water', text: 'Para a água, um reservatório guarda o que as bombas produzem. Assim nada se perde.' },
            { when: 'energy', text: 'Energia curta: uma microgeração solar é barata e rápida de construir.' },
            { when: 'events', text: 'Crise chegando: obra grande pode esperar. Guarde dinheiro para consertar o que quebrar.' },
            { when: 'pollution', text: 'Chão todo coberto de asfalto faz enxurrada. Jardim de chuva e parque ajudam a água a entrar na terra.' },
            { when: 'calm', text: 'Caixa bom e cidade tranquila: hora de planejar o próximo bairro, já com rua e drenagem.' },
            { text: 'Construir perto da rua e da água evita obra extra de cano e de acesso.' }
        ]
    },

    economista: {
        intro: [
            'Oi, {nome}! Eu sou {a|o} {eu}, {cargo}. Vou deixar a manutenção dos prédios mais barata e ficar de olho no caixa.',
            'Prazer, {nome}! Sou {a|o} {eu}. Dinheiro bem cuidado vira escola, praça e água limpa.'
        ],
        day: [
            { when: 'morning', text: 'Abri as contas da cidade logo cedo, com um café. De manhã os números parecem mais fáceis.' },
            { when: 'afternoon', text: 'Passei a tarde negociando o preço da manutenção das bombas. Consegui um bom desconto.' },
            { when: 'night', text: 'À noite eu fecho o caixa do dia. Gosto de dormir sabendo quanto entrou e quanto saiu.' },
            { when: 'rain', text: 'Dia de chuva é dia de planilha. Aproveitei para revisar os contratos da cidade.' },
            { when: 'hot', text: 'Com esse calor, o ventilador do escritório não dá conta. Mas as contas não esperam.' },
            { text: 'Ensinei uma criança a guardar moedas num pote. Economia começa pequena.' },
            { text: 'Descobri um contrato antigo que a cidade pagava à toa. Já cancelei!' }
        ],
        work: [
            { when: 'good', text: 'O saldo está em {saldo}. Está entrando mais do que saindo, como tem que ser.' },
            { when: 'good', text: 'Temos {caixa} no caixa e saldo de {saldo}. A folha da equipe custa {folha}.' },
            { when: 'good', text: 'Saldo de {saldo}. Do jeito que está, dá para planejar obra nova com calma.' },
            { when: 'bad', text: 'O saldo está em {saldo}. Está saindo mais do que entrando, e isso me preocupa.' },
            { when: 'bad', text: 'Com saldo de {saldo}, os {caixa} do caixa vão acabar. A folha da equipe já custa {folha}.' }
        ],
        tips: [
            { when: 'money', text: 'O dinheiro está curto. Um imposto um pouco mais alto ajuda, ou um empréstimo pequeno, mas sem exagero.' },
            { when: 'energy', text: 'Prédio sem energia rende menos e ainda custa manutenção. Energia primeiro, depois crescer.' },
            { when: 'water', text: 'Sem água, o bairro para de crescer e de pagar imposto. Água é investimento, não gasto.' },
            { when: 'satisfaction', text: 'Morador triste vai embora e leva o imposto junto. Cuidar deles também é economia.' },
            { when: 'events', text: 'Crise vindo: guarde uma reserva no caixa para os consertos.' },
            { when: 'calm', text: 'As contas fecham! Uma reserva guardada agora salva a cidade numa crise depois.' },
            { text: 'Imposto muito alto rende hoje, mas espanta gente e empresa amanhã. Equilíbrio é tudo.' }
        ]
    },

    eng_agronomo: {
        intro: [
            'Oi, {nome}! Eu sou {a|o} {eu}, {cargo}. Comigo as árvores e as obras verdes limpam mais, e as mudas crescem mais rápido.',
            'Prazer, {nome}! Sou {a|o} {eu}. Trouxe sementes, adubo e muita vontade de ver a cidade verde.'
        ],
        day: [
            { when: 'morning', text: 'Acordei com os passarinhos e fui regar as mudas novas. De manhã a água não some tão rápido.' },
            { when: 'afternoon', text: 'À tarde preparei adubo com casca de fruta e folha seca. Nada se perde na horta.' },
            { when: 'night', text: 'De noite eu anoto quanto cada muda cresceu. Algumas cresceram um dedo inteiro!' },
            { when: 'rain', text: 'Chuva boa! As mudas agradecem, e eu economizo a água da cidade.' },
            { when: 'hot', text: 'No calor forte, cobri a terra das mudas com palha. Assim a umidade não vai embora.' },
            { text: 'Encontrei uma minhoca enorme no canteiro. Minhoca é sinal de terra saudável.' },
            { text: 'Separei sementes de ipê para plantar na beira do rio. Daqui a uns anos vai ficar lindo.' }
        ],
        work: [
            { when: 'good', text: 'A cidade tem {arvores}, fora {mudas} que nós plantamos. Cada uma ajuda a limpar o ar.' },
            { when: 'good', text: 'Temos {mudas} crescendo na cidade. Mata na beira do rio é a parte que eu mais gosto do trabalho.' },
            { when: 'good', text: 'Com {arvores} de pé, a terra segura a chuva e o rio fica mais limpo.' },
            { when: 'bad', text: 'Faz tempo que ninguém planta nada: são {mudas} na cidade. A beira do rio precisa de mais.' },
            { when: 'bad', text: 'Árvores de pé: {arvores}. Mudas plantadas: {mudas}. Sem plantio novo eu fico de mãos atadas.' }
        ],
        tips: [
            { when: 'pollution', text: 'Poluição alta? Árvore é filtro de graça, e muda na beira do rio limpa ainda mais.' },
            { when: 'water', text: 'Árvore ajuda a chuva a entrar na terra e encher o aquífero. É menos poço secando.' },
            { when: 'money', text: 'Sem dinheiro? Muda de árvore é barata e vai rendendo cada vez mais.' },
            { when: 'events', text: 'Seca ou enchente chegando: raiz segura a terra, e a mata guarda umidade.' },
            { when: 'satisfaction', text: 'Gente gosta de sombra e de verde. Parque e árvore na rua deixam o bairro mais feliz.' },
            { when: 'calm', text: 'Tudo verdinho! Que tal plantar mais umas mudas perto do rio? Os bichos raros adoram.' },
            { text: 'Construir em cima da mata derruba árvore. Sempre que der, construa onde já é campo.' }
        ]
    },

    veterinario: {
        intro: [
            'Oi, {nome}! Eu sou {a|o} {eu}, {cargo}. Vou cuidar dos bichos da cidade: com o rio bem cuidado, os raros aparecem antes e aguentam mais.',
            'Prazer, {nome}! Sou {a|o} {eu}. Bicho saudável é sinal de cidade saudável, e de morador mais contente também.'
        ],
        day: [
            { when: 'morning', text: 'Cedinho vi uma capivara com filhotes na margem. Estão todos gordinhos!' },
            { when: 'afternoon', text: 'À tarde atendi um cachorro que comeu o que não devia. Já está abanando o rabo de novo.' },
            { when: 'night', text: 'À noite eu saio com a lanterna para ouvir os sapos. Sapo cantando é sinal de água limpa.' },
            { when: 'rain', text: 'Com chuva, os sapos fazem festa. Contei pelo menos cinco cantos diferentes.' },
            { when: 'hot', text: 'No calor, os bichos procuram sombra e água. Deixei bebedouros na praça.' },
            { text: 'Um morador me trouxe um passarinho com a asa machucada. Vai ficar comigo até voar de novo.' },
            { text: 'Anotei pegadas novas na lama da margem. Tem alguém novo visitando o rio!' }
        ],
        work: [
            { when: 'good', text: 'O rio está em {rio} e já registramos {especies} no caderno. Os bichos estão gostando daqui.' },
            { when: 'good', text: 'Com o rio em {rio}, os bichos ficam por perto. Temos {especies} anotadas.' },
            { when: 'good', text: 'Caderno de campo com {especies}, rio em {rio}: do jeito que os bichos precisam.' },
            { when: 'bad', text: 'O rio está em {rio}. Com pouca água limpa, os bichos vão embora.' },
            { when: 'bad', text: 'Espécies no caderno: {especies}. Toque nos bichos do mapa para registrar, e cuide do rio, que está em {rio}.' }
        ],
        tips: [
            { when: 'pollution', text: 'Poluição alta espanta os bichos. Se ela baixar, eles voltam para a margem.' },
            { when: 'water', text: 'Rio baixo é ruim para peixe e para sapo. Bomba demais no rio seca a casa deles.' },
            { when: 'events', text: 'Numa seca, os bichos sofrem primeiro. Rio com mata na margem aguenta mais.' },
            { when: 'satisfaction', text: 'Os moradores gostam de ver bicho por perto. Parque na beira do rio é festa para todo mundo.' },
            { when: 'calm', text: 'Os bichos estão bem. Fique de olho na margem: às vezes aparece uma espécie rara!' },
            { text: 'Toque nos bichos que aparecem no mapa para registrar no caderno de campo da Márcia.' }
        ]
    },

    geografo: {
        intro: [
            'Oi, {nome}! Eu sou {a|o} {eu}, {cargo}. Eu leio o mapa e o céu: seca, enchente e chuva forte vão fazer menos estrago, com aviso mais cedo.',
            'Prazer, {nome}! Sou {a|o} {eu}. Conheço cada morro e cada curva deste rio, e isso vai ajudar a cidade.'
        ],
        day: [
            { when: 'morning', text: 'Subi o morro cedinho para ver a neblina sobre o rio. Parecia um mar de algodão.' },
            { when: 'afternoon', text: 'Passei a tarde desenhando o mapa das partes que alagam. Ninguém deveria morar ali.' },
            { when: 'night', text: 'À noite eu confiro a previsão do tempo dos próximos dias. Melhor saber antes.' },
            { when: 'rain', text: 'Está chovendo, então fui medir quanto o rio subiu. Anotei tudinho.' },
            { when: 'hot', text: 'Calor e céu limpo: bom para medir o terreno, ruim para quem trabalha no sol. Chapéu na cabeça!' },
            { text: 'Achei uma nascente pequenininha no meio do mato. Nascente é o começo de todo rio.' },
            { text: 'Mostrei para as crianças da escola como a água desce do morro até o rio. Elas amaram a maquete.' }
        ],
        work: [
            { when: 'good', text: 'O aquífero está em {aquifero} e o rio em {rio}. Com essa reserva, a cidade aguenta uma crise.' },
            { when: 'good', text: 'Rio em {rio}, água debaixo da terra em {aquifero}. Mapa tranquilo hoje.' },
            { when: 'good', text: 'Medi tudo: aquífero em {aquifero}, rio em {rio}. Reserva boa é a melhor defesa contra a seca.' },
            { when: 'bad', text: 'O aquífero está em {aquifero} e o rio em {rio}. Se vier uma seca agora, vai doer.' },
            { when: 'bad', text: 'Rio em {rio}. Com a água tão baixa, qualquer crise vira problema grande.' }
        ],
        tips: [
            { when: 'events', text: 'Tem crise no caminho. Responda ao Paulo com calma: eu já ajudo a diminuir o estrago.' },
            { when: 'water', text: 'Água acabando? Bomba demais seca o aquífero. Reservatório e árvores ajudam a guardar.' },
            { when: 'pollution', text: 'A chuva leva a sujeira das ruas para o rio. Jardim de chuva segura a enxurrada.' },
            { when: 'energy', text: 'Hidrelétrica depende do rio cheio. Na seca, sol e vento são mais garantidos.' },
            { when: 'calm', text: 'Céu tranquilo por enquanto. Boa hora para cuidar da várzea e da mata da beira do rio.' },
            { text: 'Não construa na parte baixa perto do rio: é ali que a enchente chega primeiro.' }
        ]
    }
};

// Subiu de nível (toast): uma frase de comemoração, qualquer cargo
const STAFF_LEVEL_UP = [
    'Subi para o nível {nivel}! {Obrigada|Obrigado} pela confiança, {nome}.',
    'Nível {nivel}! Cada dia eu aprendo um pouco mais neste trabalho.',
    'Uhul, nível {nivel}! Vou contar para a minha família hoje mesmo.',
    'Nível {nivel}! Estou {orgulhosa|orgulhoso} do que a gente faz por esta cidade.',
    'Cheguei ao nível {nivel}, {nome}! Agora eu rendo ainda mais.'
];
