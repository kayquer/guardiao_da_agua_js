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
 *   kit      true = modelo do Kit Fauna Ameaçada (ficha com a fonte do Livro Vermelho)
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
    boto_vermelho: {
        name: 'Boto-vermelho', sci: 'Inia geoffrensis', icon: '🐬', status: 'EN', size: 'até 2,5 m', kit: true,
        habitat: 'Rios da Amazônia', look: 'nadando no rio',
        note: 'É um golfinho de água doce, cor-de-rosa. Usa sons para achar peixes na água barrenta. Precisa de rio com muito peixe.',
        help: 'Rio limpo e cheio de peixes: o boto come o que o rio oferece.'
    },
    pato_mergulhao: {
        name: 'Pato-mergulhão', sci: 'Mergus octosetaceus', icon: '🦆', status: 'CR', size: 'cerca de 55 cm', kit: true,
        habitat: 'Rios de água limpa e corrente do Cerrado', look: 'mergulhando no rio',
        note: 'Uma das aves mais raras das Américas: restam poucas centenas. Mergulha atrás de peixes em rio claro e com mata dos dois lados. Onde ele aparece, o rio está muito saudável.',
        help: 'Poluição bem baixa e muita árvore na margem.'
    },
    vitoria_regia: {
        name: 'Vitória-régia', sci: 'Victoria amazonica', icon: '🪷', status: 'LC', size: 'folhas de até 2 m',
        habitat: 'Lagos e águas calmas da Amazônia', look: 'boiando nas águas calmas',
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
    cobra_dagua: {
        name: 'Cobra-d’água-grande', sci: 'Hydrodynastes melanogigas', icon: '🐍', status: 'EN', size: 'até 2,5 m', kit: true,
        habitat: 'Brejos e rios do Tocantins', look: 'na beira do rio',
        note: 'Nada bem e caça peixes e sapos na água rasa. Se o rio perde os peixes e os sapos, ela perde a comida.',
        help: 'Água limpa para os peixes e sapos que ela come.'
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
    }
};
