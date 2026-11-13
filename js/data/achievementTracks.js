/**
 * Conquistas por níveis (5 cada), conferidas por js/systems/AchievementTracks.js (QuestSystem).
 * Só dados. `metric` = o que é medido (AchievementTracks.measureTrack); `levels[i]` = { goal, name }.
 * `description` usa {n} (a meta do nível). Metas bem espaçadas: o 5º nível é para quem jogou muito.
 * Conquistas de missão e do Paulo continuam em ACHIEVEMENTS (js/data/missions.js), sem mudança.
 * Id salvo em quests.achievements: `track_<id>_<nível 1-5>`.
 */
const ACHIEVEMENT_TRACKS = {
    // 11/2026: as trilhas premiam o que o jogo ensina. Saíram "fontes de água" (premiava bombear demais),
    // "asfalto" e "terra batida" (enxurrada e erosão) e "caixa da cidade" (dinheiro parado em vez de investido).
    healthy_river: {
        icon: 'ach-river', title: 'Rio Cheio', metric: 'river_minutes', unit: 'min',
        description: 'Mantenha o rio acima de 70% por {n} minutos de jogo (somando todas as vezes).',
        levels: [
            { goal: 5, name: 'Água Correndo' },
            { goal: 15, name: 'Rio Cheio' },
            { goal: 30, name: 'Margens Vivas' },
            { goal: 60, name: 'Rio que Canta' },
            { goal: 120, name: 'Guardião do Rio' }
        ]
    },
    no_shortage: {
        icon: 'ach-tap', title: 'Torneira Sempre Aberta', metric: 'no_shortage_minutes', unit: 'min',
        description: 'Passe {n} minutos de jogo seguidos sem faltar água para ninguém.',
        levels: [
            { goal: 5, name: 'Água na Torneira' },
            { goal: 15, name: 'Sem Racionamento' },
            { goal: 30, name: 'Cidade Abastecida' },
            { goal: 60, name: 'Água para Todos' },
            { goal: 120, name: 'Torneira Sempre Aberta' }
        ]
    },
    sewage_treated: {
        icon: 'ach-sewage', title: 'Esgoto em Dia', metric: 'sewage_minutes', unit: 'min',
        description: 'Com moradores na cidade, passe {n} minutos de jogo com a limpeza dando conta de todo o esgoto.',
        levels: [
            { goal: 5, name: 'Cano no Lugar' },
            { goal: 15, name: 'Esgoto em Dia' },
            { goal: 30, name: 'Rio sem Mau Cheiro' },
            { goal: 60, name: 'Saneamento de Verdade' },
            { goal: 120, name: 'Cidade Saneada' }
        ]
    },
    riparian: {
        icon: 'ach-riparian', title: 'Mata Ciliar', metric: 'riparian_planted',
        description: 'Tenha {n} árvores plantadas na beira da água (lá elas limpam mais).',
        levels: [
            { goal: 3, name: 'Sombra na Margem' },
            { goal: 8, name: 'Cílios do Rio' },
            { goal: 15, name: 'Beira-Rio Verde' },
            { goal: 30, name: 'Corredor Verde' },
            { goal: 50, name: 'Floresta das Águas' }
        ]
    },
    sponge_city: {
        icon: 'ach-sponge', title: 'Cidade Esponja', metric: 'runoff_controls',
        description: 'Tenha {n} construções que seguram a chuva funcionando (jardim de chuva, parque linear, telhado verde…).',
        levels: [
            { goal: 1, name: 'Primeira Gota Guardada' },
            { goal: 3, name: 'Chão que Bebe Chuva' },
            { goal: 6, name: 'Bairro Esponja' },
            { goal: 10, name: 'Enxurrada Domada' },
            { goal: 15, name: 'Cidade Esponja' }
        ]
    },
    green_investment: {
        icon: 'ach-green-invest', title: 'Investimento Verde', metric: 'green_invested', money: true,
        description: 'Tenha R$ {n} investidos em construções verdes funcionando (natureza, energia limpa, recarga e tratamento).',
        levels: [
            { goal: 20000, name: 'Semente Plantada' },
            { goal: 60000, name: 'Orçamento Verde' },
            { goal: 150000, name: 'Cidade que Investe' },
            { goal: 300000, name: 'Economia Verde' },
            { goal: 600000, name: 'Tesouro da Natureza' }
        ]
    },
    gravel_roads: {
        icon: 'ach-gravel-roads', title: 'Pedrinha por Pedrinha', metric: 'road_gravel', unit: 'blocos',
        description: 'Tenha {n} blocos de estrada de cascalho (a chuva passa entre as pedras).',
        levels: [
            { goal: 10, name: 'Pedrinha por Pedrinha' },
            { goal: 40, name: 'Chão que Respira' },
            { goal: 100, name: 'Estrada Drenante' },
            { goal: 200, name: 'Mosaico de Pedras' },
            { goal: 350, name: 'Caminho das Mil Pedras' }
        ]
    },
    high_tech: {
        icon: 'ach-high-tech', title: 'Cidade do Futuro', metric: 'high_tech',
        description: 'Tenha {n} construções de alta tecnologia (nível 4 ou 5 da árvore) funcionando.',
        levels: [
            { goal: 1, name: 'Primeira Inovação' },
            { goal: 3, name: 'Cidade Inteligente' },
            { goal: 6, name: 'Polo Tecnológico' },
            { goal: 10, name: 'Laboratório a Céu Aberto' },
            { goal: 15, name: 'Cidade do Futuro' }
        ]
    },
    power: {
        icon: 'ach-power', title: 'Força da Natureza', metric: 'power', unit: 'kW',
        description: 'Gere {n} kW de energia renovável (sol, vento, água, biomassa) ao mesmo tempo.',
        levels: [
            { goal: 400, name: 'Luz Acesa' },
            { goal: 1000, name: 'Cidade Iluminada' },
            { goal: 2000, name: 'Turbina Total' },
            { goal: 3500, name: 'Força da Natureza' },
            { goal: 6000, name: 'Potência Máxima' }
        ]
    },
    storage: {
        icon: 'ach-storage', title: 'Reserva para a Seca', metric: 'storage', unit: 'L',
        description: 'Consiga guardar {n} L de água (capacidade dos reservatórios).',
        levels: [
            { goal: 2500, name: 'Caixa d\'Água Cheia' },
            { goal: 5000, name: 'Reserva para a Seca' },
            { goal: 8000, name: 'Represa da Cidade' },
            { goal: 12000, name: 'Cofre de Água' },
            { goal: 20000, name: 'Oceano Guardado' }
        ]
    },
    trees: {
        icon: 'ach-trees', title: 'Floresta Urbana', metric: 'trees',
        description: 'Tenha {n} árvores plantadas (Muda de Árvore) na cidade.',
        levels: [
            { goal: 5, name: 'Mão Verde' },
            { goal: 15, name: 'Bosque Plantado' },
            { goal: 30, name: 'Mata Ciliar' },
            { goal: 60, name: 'Floresta Urbana' },
            { goal: 100, name: 'Pulmão Verde' }
        ]
    },
    recycling: {
        icon: 'ach-recycling', title: 'Lixo é Recurso', metric: 'recycling',
        description: 'Tenha {n} estruturas de lixo e reciclagem funcionando.',
        levels: [
            { goal: 2, name: 'Separando o Lixo' },
            { goal: 5, name: 'Lixo é Recurso' },
            { goal: 9, name: 'Ciclo Fechado' },
            { goal: 14, name: 'Cidade Lixo Zero' },
            { goal: 20, name: 'Mestre da Reciclagem' }
        ]
    },
    residential_zones: {
        icon: 'ach-residential', title: 'Bairro Animado', metric: 'zone_residential',
        description: 'Tenha {n} zonas residenciais.',
        levels: [
            { goal: 3, name: 'Primeiros Vizinhos' },
            { goal: 8, name: 'Bairro Novo' },
            { goal: 15, name: 'Bairro Animado' },
            { goal: 25, name: 'Metrópole de Gente' },
            { goal: 40, name: 'Lar de Milhares' }
        ]
    },
    commercial_zones: {
        icon: 'ach-commercial', title: 'Rua do Comércio', metric: 'zone_commercial',
        description: 'Tenha {n} zonas comerciais.',
        levels: [
            { goal: 2, name: 'Portas Abertas' },
            { goal: 6, name: 'Rua do Comércio' },
            { goal: 12, name: 'Centro Movimentado' },
            { goal: 20, name: 'Polo de Compras' },
            { goal: 32, name: 'Capital do Comércio' }
        ]
    },
    industrial_zones: {
        icon: 'ach-industrial', title: 'Distrito Industrial', metric: 'zone_industrial',
        description: 'Tenha {n} zonas industriais com a poluição da cidade em até 40%.',
        levels: [
            { goal: 2, name: 'Primeira Fábrica' },
            { goal: 5, name: 'Distrito Industrial' },
            { goal: 10, name: 'Chaminés em Fila' },
            { goal: 16, name: 'Polo Industrial' },
            { goal: 25, name: 'Gigante da Indústria' }
        ]
    }
};

// Nome do nível no selo (cor do selo em css/achievements.css: .lvl-1 … .lvl-5)
const ACHIEVEMENT_LEVEL_NAMES = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'];
