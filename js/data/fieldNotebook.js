/**
 * Caderno de Campo da Márcia (11/2026): os bichos e plantas que mostram como está a água.
 * Só dados. A chave é o id do prop (js/data/props.js, com `cleanBelow`): quando o planejador põe a espécie no mapa,
 * ela entra no caderno (js/systems/FieldNotebook.js); quando a poluição a tira, o Paulo avisa.
 * `note` = o que a Márcia escreve (por que aquele bicho é um sinal), `look` = onde procurar no mapa.
 * As faixas de poluição vêm do próprio prop (cleanBelow), para o caderno nunca contradizer o mapa.
 */
const FIELD_NOTEBOOK = {
    sapo: {
        name: 'Sapo', icon: '🐸', look: 'na margem do rio',
        note: 'A pele do sapo é fina e ajuda a respirar: a sujeira da água passa direto para dentro dele. Por isso ele é o primeiro a sumir quando o rio piora e um dos últimos a voltar.'
    },
    tartaruga: {
        name: 'Tartaruga', icon: '🐢', look: 'tomando sol na margem',
        note: 'A tartaruga vive muitos anos no mesmo trecho de rio. Quando ela some, é porque a água ficou ruim por bastante tempo, não só por um dia.'
    },
    lambaris: {
        name: 'Lambaris', icon: '🐟', look: 'nadando perto da margem',
        note: 'Peixinho pequeno precisa de água com bastante oxigênio. Esgoto sem tratamento tira o oxigênio da água, e o cardume vai embora.'
    },
    vitoria_regia: {
        name: 'Vitória-régia', icon: '🪷', look: 'boiando nas águas calmas',
        note: 'Planta aquática que gosta de água limpa e calma. Água turva demais não deixa a luz chegar, e ela não cresce.'
    },
    garca: {
        name: 'Garça', icon: '🪶', look: 'na margem, de pé na água rasa',
        note: 'A garça come peixes e sapos. Se ela está pescando, é porque tem peixe no rio, e peixe só tem onde a água está boa.'
    },
    capivara: {
        name: 'Capivara', icon: '🦫', look: 'na beira do rio, perto da mata',
        note: 'A capivara come capim da margem e se refresca na água. Ela precisa de mata ciliar e de rio limpo ao mesmo tempo.'
    },
    tamandua: {
        name: 'Tamanduá', icon: '🐜', look: 'no campo, longe da cidade',
        note: 'O tamanduá anda grandes distâncias atrás de formigueiros. Ele só aparece onde o campo e a mata continuam inteiros.'
    },
    tucano: {
        name: 'Tucano', icon: '🐦', look: 'nas árvores',
        note: 'O tucano espalha sementes das frutas que come: ajuda a mata a crescer de novo. Ar e água sujos demais o afastam.'
    },
    arara: {
        name: 'Arara', icon: '🦜', look: 'nas árvores altas',
        note: 'Araras voam em casal e fazem ninho em árvores velhas. Onde a mata é derrubada e o ar fica sujo, elas não ficam.'
    },
    quati: {
        name: 'Quati', icon: '🦝', look: 'no chão da mata',
        note: 'O quati vive em bando e come de tudo um pouco. Ele volta quando a mata e o rio voltam a ficar saudáveis.'
    },
    tatu: {
        name: 'Tatu', icon: '🦔', look: 'no campo, cavando',
        note: 'O tatu cava tocas no chão. Ele é o mais exigente da lista: só aparece com a poluição bem baixa.'
    }
};
