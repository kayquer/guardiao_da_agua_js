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

// evolucao-pesquisa: versão de loja por padrão (11/2026); a pesquisa abre com ?modo=pesquisa
const GAME_MODE = 'loja';
// Navegador automatizado (Playwright, navigator.webdriver) e testes de unidade usam a pesquisa, a mais rígida
// (estudo e prova obrigatórios, mapa fixo, registro): a suíte E2E foi escrita para ela. A loja tem a própria
// suíte (tests/game-mode.spec.js com ?modo=loja, tests/unit/game-mode.test.js).
const GAME_MODE_TESTS = 'pesquisa';

const GameMode = {
    /** Modo a partir da busca da URL (?modo=…) e do padrão; nome desconhecido = o padrão. Puro. */
    resolve(search = '', fallback = GAME_MODE) {
        const match = /[?&]modo=([a-z]+)/i.exec(String(search || ''));
        const wanted = match ? match[1].toLowerCase() : null;
        if (wanted && GAME_MODES[wanted]) return wanted;
        return GAME_MODES[fallback] ? fallback : 'pesquisa';
    },

    /** Padrão desta aba: GAME_MODE, ou GAME_MODE_TESTS em teste (sem navegador de verdade ou navigator.webdriver). */
    fallback() {
        const automated = typeof navigator === 'undefined' || !!navigator.webdriver;
        return automated ? GAME_MODE_TESTS : GAME_MODE;
    },

    id() {
        return GameMode.resolve(typeof location !== 'undefined' ? location.search : '', GameMode.fallback());
    },

    current() {
        return GAME_MODES[GameMode.id()];
    },

    is(id) {
        return GameMode.id() === id;
    }
};

window.GameMode = GameMode;
