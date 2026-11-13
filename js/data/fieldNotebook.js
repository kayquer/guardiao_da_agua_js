/**
 * Caderno de Campo da Márcia (11/2026): os bichos e plantas que mostram como está a água e a mata.
 * Só dados. A chave é o id do prop (js/data/props.js, com `cleanBelow`): quando o planejador põe a espécie no mapa ela
 * fica por perto; quando o jogador TOCA nela, ela entra no caderno (js/systems/FieldNotebook.js) e a ficha abre.
 * Antes disso a página fica apagada, com um "?" e só a dica de onde procurar.
 *
 *   name     nome popular            sci     nome científico (espécie que o modelo representa)
 *   icon     emoji da página          status  LC (pouco preocupante) | VU | EN | CR (Livro Vermelho, ICMBio 2018)
 *   size     tamanho real (texto)     habitat onde vive no Brasil
 *   look     onde procurar no mapa (a dica da página apagada)
 *   note     o que a Márcia anota: por que esse bicho é um sinal
 *   help     o que a cidade pode fazer para ele ficar
 *   kit      true = modelo do Kit Fauna Ameaçada
 * A fonte da ficha vem da situação (status): ameaçada = Livro Vermelho; LC = espécie comum. A figura é o render do
 * próprio modelo (assets/images/fauna/<id>.webp, scripts/fauna-thumbs.js). A bacia em que cada um aparece fica no
 * prop (props.js `basins`); o caderno só lista os bichos da bacia da partida.
 * As faixas de poluição vêm do próprio prop (cleanBelow), para o caderno nunca contradizer o mapa.
 */
const FIELD_NOTEBOOK_STATUS = {
    LC: { label: 'Pouco preocupante', short: 'Fora de perigo' },
    VU: { label: 'Vulnerável', short: 'Ameaçada' },
    EN: { label: 'Em perigo', short: 'Ameaçada' },
    CR: { label: 'Criticamente em perigo', short: 'Quase sumindo' }
};

const FIELD_NOTEBOOK = {
    // ===== Rio e margem =====
    sapo: {
        name: 'Sapo-cururu', sci: 'Rhinella diptycha', icon: '🐸', status: 'LC', size: 'até 20 cm',
        habitat: 'Beira de rios, lagoas e quintais de quase todo o Brasil', look: 'na margem do rio',
        note: 'A pele do sapo é fina e ajuda a respirar: a sujeira da água passa direto para dentro dele. Por isso ele é o primeiro a sumir quando o rio piora e um dos últimos a voltar.',
        help: 'Tratar o esgoto antes que ele chegue ao rio.'
    },
    ra_das_pedras: {
        name: 'Rã-das-pedras', sci: 'Thoropa saxatilis', icon: '🐸', status: 'VU', size: 'cerca de 5 cm', kit: true,
        habitat: 'Pedras molhadas de riachos e cachoeiras da Mata Atlântica', look: 'nas pedras da margem',
        note: 'Vive grudada nas pedras onde a água escorre limpa. Os girinos crescem nessa película de água: se ela suja, a rã some.',
        help: 'Manter a mata e as pedras da margem e não jogar esgoto no rio.'
    },
    tartaruga: {
        name: 'Cágado-de-barbicha', sci: 'Phrynops geoffroanus', icon: '🐢', status: 'LC', size: 'até 35 cm',
        habitat: 'Rios e lagoas do Brasil inteiro', look: 'tomando sol na margem',
        note: 'O cágado vive muitos anos no mesmo trecho de rio. Quando ele some, é porque a água ficou ruim por bastante tempo, não só por um dia.',
        help: 'Deixar a margem com mata e areia, onde ele bota os ovos.'
    },
    lambaris: {
        name: 'Lambari', sci: 'Astyanax sp.', icon: '🐟', status: 'LC', size: 'até 15 cm',
        habitat: 'Rios, riachos e represas de todo o país', look: 'nadando perto da margem',
        note: 'Peixinho pequeno precisa de água com bastante oxigênio. Esgoto sem tratamento tira o oxigênio da água, e o cardume vai embora.',
        help: 'Estação de tratamento de esgoto e mata ciliar.'
    },
    piracanjuba: {
        name: 'Piracanjuba', sci: 'Brycon orbignyanus', icon: '🐟', status: 'EN', size: 'até 80 cm', kit: true,
        habitat: 'Rios grandes da bacia do rio Paraná', look: 'no meio do rio',
        note: 'Na piracema ela sobe o rio por longas distâncias para desovar. Água suja e rio cortado por obras atrapalham a viagem.',
        help: 'Rio limpo e com mata nas margens, sem lixo nem esgoto.'
    },
    surubim: {
        name: 'Surubim-do-iguaçu', sci: 'Steindachneridion melanodermatum', icon: '🐟', status: 'EN', size: 'até 1 m', kit: true,
        habitat: 'Só no rio Iguaçu (Paraná)', look: 'no fundo do rio',
        note: 'Peixe de couro, sem escamas, com bigodes compridos. Só existe num rio do mundo, e precisa de água corrente e com oxigênio.',
        help: 'Tratar o esgoto e evitar a terra que desce das ruas sem calçamento.'
    },
    pato_mergulhao: {
        name: 'Pato-mergulhão', sci: 'Mergus octosetaceus', icon: '🦆', status: 'CR', size: 'cerca de 55 cm', kit: true,
        habitat: 'Rios de água limpa e corrente do Cerrado', look: 'mergulhando no rio',
        note: 'Uma das aves mais raras das Américas: restam poucas centenas. Mergulha atrás de peixes em rio claro e com mata dos dois lados. Onde ele aparece, o rio está muito saudável.',
        help: 'Poluição bem baixa e muita árvore na margem.'
    },
    vitoria_regia: {
        name: 'Vitória-régia', sci: 'Victoria cruziana', icon: '🪷', status: 'LC', size: 'folhas de até 1,5 m',
        habitat: 'Lagoas e águas calmas do Pantanal e da bacia do Paraná', look: 'boiando nas águas calmas',
        note: 'Planta aquática que gosta de água limpa e calma. Água turva demais não deixa a luz chegar, e ela não cresce.',
        help: 'Evitar a terra e o esgoto que deixam a água turva.'
    },
    egla: {
        name: 'Egla', sci: 'Aegla rossiana', icon: '🦀', status: 'EN', size: 'cerca de 6 cm', kit: true,
        habitat: 'Riachos frios de água limpa no Sudeste e no Sul', look: 'embaixo das pedras da margem',
        note: 'Parente do caranguejo, do tamanho de um dedo. Só aguenta água muito limpa e fria: é um ótimo detetive de poluição.',
        help: 'Poluição bem baixa e mata em volta do riacho para a água não esquentar.'
    },
    libelula: {
        name: 'Libélula', sci: 'Castoraeschna januaria', icon: '🪰', status: 'VU', size: 'cerca de 10 cm', kit: true,
        habitat: 'Riachos e brejos da Mata Atlântica', look: 'voando baixo perto da água',
        note: 'Os filhotes da libélula (ninfas) crescem dentro da água por meses. Ver libélula voando é sinal de água limpa por perto.',
        help: 'Não jogar esgoto nem lixo no rio.'
    },
    garca: {
        name: 'Garça-branca', sci: 'Ardea alba', icon: '🪶', status: 'LC', size: 'até 1 m',
        habitat: 'Beira de rios, lagos e mangues de todo o país', look: 'na margem, de pé na água rasa',
        note: 'A garça come peixes e sapos. Se ela está pescando, é porque tem peixe no rio, e peixe só tem onde a água está boa.',
        help: 'Rio com peixe: tratamento de esgoto e mata ciliar.'
    },
    soco_boi_escuro: {
        name: 'Socó-boi-escuro', sci: 'Tigrisoma fasciatum', icon: '🪶', status: 'VU', size: 'cerca de 70 cm', kit: true,
        habitat: 'Rios de correnteza com pedras, na Mata Atlântica', look: 'parado na beira do rio',
        note: 'Parente da garça, fica imóvel nas pedras esperando um peixe passar. Só vive em rio de água corrente e limpa.',
        help: 'Manter a correnteza limpa e as pedras da margem.'
    },
    capivara: {
        name: 'Capivara', sci: 'Hydrochoerus hydrochaeris', icon: '🦫', status: 'LC', size: 'até 1,3 m',
        habitat: 'Beira de rios e lagoas do Brasil inteiro', look: 'na beira do rio, perto da mata',
        note: 'A capivara come capim da margem e se refresca na água. Ela precisa de mata ciliar e de rio limpo ao mesmo tempo.',
        help: 'Deixar a faixa de mata da margem (a APP) sem prédios.'
    },
    ariranha: {
        name: 'Ariranha', sci: 'Pteronura brasiliensis', icon: '🦦', status: 'VU', size: 'até 1,7 m', kit: true,
        habitat: 'Rios do Pantanal e da Amazônia', look: 'na margem do rio',
        note: 'Vive em família e caça peixes juntos. Faz tocas no barranco da margem. Já sumiu de muitos rios do Brasil.',
        help: 'Rio cheio de peixe e barranco com mata, sem erosão.'
    },

    // ===== Mata e campo =====
    tamandua: {
        name: 'Tamanduá-bandeira', sci: 'Myrmecophaga tridactyla', icon: '🐜', status: 'VU', size: 'até 2 m',
        habitat: 'Cerrado, Pantanal e campos', look: 'no campo, longe da cidade',
        note: 'O tamanduá anda grandes distâncias atrás de formigueiros e cupinzeiros. Ele só aparece onde o campo e a mata continuam inteiros.',
        help: 'Não derrubar a mata e deixar campo livre longe da cidade.'
    },
    tucano: {
        name: 'Tucano-toco', sci: 'Ramphastos toco', icon: '🐦', status: 'LC', size: 'cerca de 55 cm',
        habitat: 'Cerrado, matas e até cidades arborizadas', look: 'nas árvores',
        note: 'O tucano espalha sementes das frutas que come: ajuda a mata a crescer de novo. Ar e água sujos demais o afastam.',
        help: 'Plantar árvores e manter a poluição baixa.'
    },
    arara: {
        name: 'Arara-canindé', sci: 'Ara ararauna', icon: '🦜', status: 'LC', size: 'cerca de 85 cm',
        habitat: 'Cerrado, Pantanal e Amazônia', look: 'nas árvores altas',
        note: 'Araras voam em casal e fazem ninho em árvores velhas e altas. Onde a mata é derrubada e o ar fica sujo, elas não ficam.',
        help: 'Guardar as árvores grandes e antigas.'
    },
    gaviao_real: {
        name: 'Gavião-real', sci: 'Harpia harpyja', icon: '🦅', status: 'VU', size: 'até 1 m de altura', kit: true,
        habitat: 'Florestas grandes da Amazônia e da Mata Atlântica', look: 'pousado num galho alto',
        note: 'Uma das águias mais fortes do mundo. Faz ninho no alto das árvores mais altas e precisa de muita floresta para caçar.',
        help: 'Manter manchas grandes de mata ligadas umas às outras.'
    },
    mico_leao_dourado: {
        name: 'Mico-leão-dourado', sci: 'Leontopithecus rosalia', icon: '🐒', status: 'EN', size: 'cerca de 60 cm com a cauda', kit: true,
        habitat: 'Mata Atlântica do Rio de Janeiro', look: 'pulando perto das árvores',
        note: 'Quase desapareceu. Voltou a crescer graças a reservas e a corredores de árvores que ligam um pedaço de mata ao outro.',
        help: 'Plantar mudas que liguem as matas (corredores verdes).'
    },
    morfo: {
        name: 'Borboleta-morfo', sci: 'Morpho menelaus eberti', icon: '🦋', status: 'CR', size: 'cerca de 14 cm de asa', kit: true,
        habitat: 'Mata Atlântica', look: 'voando perto da mata',
        note: 'As asas azuis brilham ao sol. A lagarta come folhas de plantas da mata: sem mata e com ar sujo, não há morfo.',
        help: 'Manter a mata e a poluição baixa.'
    },
    quati: {
        name: 'Quati', sci: 'Nasua nasua', icon: '🦝', status: 'LC', size: 'até 1,1 m com a cauda',
        habitat: 'Matas de quase todo o Brasil', look: 'no chão da mata',
        note: 'O quati vive em bando e come de tudo um pouco. Ele volta quando a mata e o rio voltam a ficar saudáveis.',
        help: 'Mata em pé e lixo no lugar certo (ele revira o lixo da cidade).'
    },
    tatu: {
        name: 'Tatu-galinha', sci: 'Dasypus novemcinctus', icon: '🦔', status: 'LC', size: 'até 80 cm',
        habitat: 'Campos e matas de todo o país', look: 'no campo, cavando',
        note: 'O tatu cava tocas no chão. Ele é um dos mais exigentes da lista: só aparece com a poluição bem baixa.',
        help: 'Poluição baixa e campo sem lixo.'
    },
    anta: {
        name: 'Anta', sci: 'Tapirus terrestris', icon: '🐗', status: 'VU', size: 'até 2,2 m', kit: true,
        habitat: 'Matas perto de rios, do Cerrado à Amazônia', look: 'no campo, perto da mata',
        note: 'O maior mamífero terrestre do Brasil. Come frutos e espalha as sementes: é chamada de jardineira da floresta. Adora tomar banho de rio.',
        help: 'Mata perto do rio e campo longe da cidade.'
    },
    onca_pintada: {
        name: 'Onça-pintada', sci: 'Panthera onca', icon: '🐆', status: 'VU', size: 'até 2,2 m', kit: true,
        habitat: 'Pantanal, Amazônia, Cerrado e Mata Atlântica', look: 'no campo, bem longe da cidade',
        note: 'O maior felino das Américas. Precisa de muito território com mata, rio e outros bichos para comer. Onde há onça, a natureza está inteira.',
        help: 'Cidade compacta, que deixa espaço para a mata e o campo.'
    },
    lobo_guara: {
        name: 'Lobo-guará', sci: 'Chrysocyon brachyurus', icon: '🐺', status: 'VU', size: 'até 1,45 m', kit: true,
        habitat: 'Campos do Cerrado', look: 'no campo aberto',
        note: 'De pernas longas e pelo ruivo, come frutas como a lobeira e também pequenos bichos. Perde espaço quando o campo vira cidade.',
        help: 'Deixar campo livre em volta da cidade.'
    },
    cervo_pantanal: {
        name: 'Cervo-do-pantanal', sci: 'Blastocerus dichotomus', icon: '🦌', status: 'VU', size: 'até 2 m', kit: true,
        habitat: 'Várzeas e brejos alagados', look: 'na várzea perto do rio',
        note: 'O maior cervo da América do Sul. Vive onde o chão fica alagado parte do ano: precisa de várzea preservada.',
        help: 'Não construir na várzea (a planície que alaga).'
    },
    // ===== Bichos de cada bioma (11/2026) =====
    boto_cinza: {
        name: 'Boto-cinza', sci: 'Sotalia guianensis', icon: '🐬', status: 'VU', size: 'até 2 m', kit: true,
        habitat: 'Estuários, baías e foz de rios do litoral brasileiro', look: 'nadando perto da foz do rio',
        note: 'Golfinho pequeno que vive onde o rio encontra o mar. Come peixes que só existem em água limpa, então esgoto e lixo na foz o afastam.',
        help: 'Tratar o esgoto antes que ele chegue ao mar e cuidar do mangue.'
    },
    guaiamum: {
        name: 'Guaiamum', sci: 'Cardisoma guanhumi', icon: '🦀', status: 'CR', size: 'cerca de 30 cm com as patas', kit: true,
        habitat: 'Mangues e restingas do litoral', look: 'nas tocas da margem',
        note: 'Caranguejo azul que cava tocas na lama do mangue. Foi tão caçado e perdeu tanto mangue que está quase sumindo.',
        help: 'Não aterrar a margem e deixar a vegetação da beira do rio e do mangue em pé.'
    },
    muriqui_do_sul: {
        name: 'Muriqui-do-sul', sci: 'Brachyteles arachnoides', icon: '🐒', status: 'EN', size: 'até 1,6 m com a cauda', kit: true,
        habitat: 'Mata Atlântica das serras de São Paulo e do Paraná', look: 'perto da mata na encosta',
        note: 'O maior macaco das Américas, pacífico e brincalhão. Precisa de muita mata contínua, porque come folhas e frutos de muitas árvores.',
        help: 'Não derrubar a mata da serra e plantar árvores ligando os pedaços.'
    },
    arara_azul_de_lear: {
        name: 'Arara-azul-de-lear', sci: 'Anodorhynchus leari', icon: '🦜', status: 'EN', size: 'cerca de 72 cm', kit: true,
        habitat: 'Caatinga do norte da Bahia', look: 'pousada perto dos paredões',
        note: 'Come os cocos da palmeira licuri e dorme em paredões de pedra. Quase sumiu, e voltou a crescer com a proteção da caatinga.',
        help: 'Guardar a caatinga e as palmeiras de licuri.'
    },
    tatu_bola: {
        name: 'Tatu-bola', sci: 'Tolypeutes tricinctus', icon: '🦔', status: 'EN', size: 'cerca de 35 cm', kit: true,
        habitat: 'Caatinga e Cerrado do Nordeste', look: 'no campo seco, longe da cidade',
        note: 'Quando se assusta, fecha a carapaça e vira uma bola. Só existe no Brasil e sofre com a caça e a perda da caatinga.',
        help: 'Deixar a caatinga em pé longe da cidade.'
    },
    jacucaca: {
        name: 'Jacucaca', sci: 'Penelope jacucaca', icon: '🐦', status: 'VU', size: 'cerca de 70 cm', kit: true,
        habitat: 'Caatinga', look: 'andando no chão da caatinga',
        note: 'Parente do jacu, come frutos e sementes e ajuda a plantar a caatinga. Some onde a mata seca é derrubada.',
        help: 'Manter a caatinga e o ar limpos.'
    }
};
