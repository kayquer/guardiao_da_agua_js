/**
 * Conquistas por níveis (5 cada), conferidas por js/systems/AchievementTracks.js (QuestSystem).
 * Só dados. `metric` = o que é medido (AchievementTracks.measureTrack); `levels[i]` = { goal, name }.
 * `description` usa {n} (a meta do nível). Metas bem espaçadas: o 5º nível é para quem jogou muito.
 * Conquistas de missão e do Paulo continuam em ACHIEVEMENTS (js/data/missions.js), sem mudança.
 * Id salvo em quests.achievements: `track_<id>_<nível 1-5>`.
 */
const ACHIEVEMENT_TRACKS = {
    water_sources: {
        icon: 'ach-water-sources', title: 'Caçador de Nascentes', metric: 'water_sources',
        description: 'Tenha {n} fontes de água funcionando: bombas, poços e outras captações.',
        levels: [
            { goal: 5, name: 'Farejador de Água' },
            { goal: 12, name: 'Caçador de Nascentes' },
            { goal: 25, name: 'Guardião dos Poços' },
            { goal: 40, name: 'Mestre das Águas Profundas' },
            { goal: 60, name: 'Lenda da Captação' }
        ]
    },
    paved_roads: {
        icon: 'ach-paved-roads', title: 'Rei do Asfalto', metric: 'road_paved', unit: 'blocos',
        description: 'Tenha {n} blocos de rua asfaltada.',
        levels: [
            { goal: 25, name: 'Primeira Avenida' },
            { goal: 100, name: 'Tapete Preto' },
            { goal: 250, name: 'Malha Viária' },
            { goal: 450, name: 'Cidade Conectada' },
            { goal: 700, name: 'Rodovia Lendária' }
        ]
    },
    dirt_roads: {
        icon: 'ach-dirt-roads', title: 'Estrada Boiadeira', metric: 'road_dirt', unit: 'blocos',
        description: 'Tenha {n} blocos de estrada de terra.',
        levels: [
            { goal: 10, name: 'Trilha Aberta' },
            { goal: 40, name: 'Estrada Boiadeira' },
            { goal: 100, name: 'Caminhos da Roça' },
            { goal: 200, name: 'Sertão Ligado' },
            { goal: 350, name: 'Mapa de Terra Batida' }
        ]
    },
    gravel_roads: {
        icon: 'ach-gravel-roads', title: 'Pedrinha por Pedrinha', metric: 'road_gravel', unit: 'blocos',
        description: 'Tenha {n} blocos de estrada de cascalho.',
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
    budget: {
        icon: 'ach-budget', title: 'Cofre da Cidade', metric: 'budget', money: true,
        description: 'Junte R$ {n} no caixa da cidade.',
        levels: [
            { goal: 100000, name: 'Cofre Cheio' },
            { goal: 250000, name: 'Caixa Forte' },
            { goal: 500000, name: 'Meio Milhão!' },
            { goal: 1000000, name: 'Cidade Milionária' },
            { goal: 2500000, name: 'Tesouro Municipal' }
        ]
    },
    power: {
        icon: 'ach-power', title: 'Força da Natureza', metric: 'power', unit: 'MW',
        description: 'Gere {n} MW de energia ao mesmo tempo.',
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
        description: 'Tenha {n} zonas industriais.',
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
