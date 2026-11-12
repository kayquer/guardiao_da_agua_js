/**
 * ===== MODO DE JOGO (11/2026): uma versão para a pesquisa nas escolas, outra para lojas (10 a 99+ anos) =====
 * Carregado antes de tudo (logo antes do aviso inicial, que já precisa saber o modo): sem dependências.
 *
 * Tudo o que muda entre as duas versões mora aqui, em valores de configuração — o código é o mesmo, e a futura
 * junção com a main continua uma decisão pequena:
 *   study            regras de estudo e prova (vira STUDY_RULES em GameConstants.js)
 *   noticeEveryStart o aviso inicial aparece em toda abertura (pesquisa) ou só até ser aceito uma vez (loja)
 *   profile          'completo' = nome, idade, estado e cidade obrigatórios; 'apelido' = só o apelido, resto opcional
 *   climate          clima padrão sem escolha salva: 'real' (Open-Meteo, cidade do perfil) ou 'simulated'
 *   research         registro/envio de pesquisa e o painel "Dados da pesquisa"
 *   mapChoice        escolher a bacia (js/data/basinMaps.js) ao começar uma cidade; a pesquisa usa o mapa fixo
 *   readingBonus     estudo lido até o fim deixa aquele prédio um pouco mais eficiente (só onde estudar é opcional)
 *
 * GAME_MODE é o modo desta versão; `?modo=loja` ou `?modo=pesquisa` na URL troca só naquela aba (testes, demonstração).
 */
const GAME_MODES = {
    pesquisa: {
        label: 'Pesquisa',
        study: { STUDY: 'obrigatorio', QUIZ: 'obrigatorio', UNLOCK_AFTER_FAILURES: 2 },
        noticeEveryStart: true,
        profile: 'completo',
        climate: 'real',
        research: true,
        mapChoice: false,
        readingBonus: 0
    },
    loja: {
        label: 'Loja',
        study: { STUDY: 'opcional', QUIZ: 'opcional', UNLOCK_AFTER_FAILURES: 0 },
        noticeEveryStart: false,
        profile: 'apelido',
        climate: 'simulated',
        research: false,
        mapChoice: true,
        readingBonus: 0.05
    }
};

// evolucao-pesquisa: segue no modo da pesquisa (o aviso e as regras do estudo ficam); 'loja' = versão de loja
const GAME_MODE = 'pesquisa';

const GameMode = {
    /** Modo a partir da busca da URL (?modo=…) e do padrão; nome desconhecido = o padrão. Puro. */
    resolve(search = '', fallback = GAME_MODE) {
        const match = /[?&]modo=([a-z]+)/i.exec(String(search || ''));
        const wanted = match ? match[1].toLowerCase() : null;
        if (wanted && GAME_MODES[wanted]) return wanted;
        return GAME_MODES[fallback] ? fallback : 'pesquisa';
    },

    id() {
        return GameMode.resolve(typeof location !== 'undefined' ? location.search : '');
    },

    current() {
        return GAME_MODES[GameMode.id()];
    },

    is(id) {
        return GameMode.id() === id;
    }
};

window.GameMode = GameMode;
