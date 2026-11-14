/**
 * Prefeitura (11/2026): impostos por grupo e quadro de funcionários — dados puros (sem funções), lidos por
 * js/systems/CityFinance.js e js/systems/CityStaff.js. Valores em R$ por minuto de jogo (a régua do balanceamento:
 * todo salário e todo bônus se compara em R$/min) e minutos de jogo. Balanceamento em scripts/balance/staff-sim.js.
 */

// ===== IMPOSTOS =====
// 5 níveis. O ganho de receita é linear; a perda (satisfação, crescimento, eficiência) cresce mais rápido que o
// ganho dos dois lados do "normal" — o Muito alto rende hoje e encolhe a cidade depois (sem escolha falsa).
const TAX_LEVELS = [
    { id: 'muito_baixo', label: 'Muito baixo', step: -2, revenue: 0.6 },
    { id: 'baixo', label: 'Baixo', step: -1, revenue: 0.8 },
    { id: 'normal', label: 'Normal', step: 0, revenue: 1.0 },
    { id: 'alto', label: 'Alto', step: 1, revenue: 1.2 },
    { id: 'muito_alto', label: 'Muito alto', step: 2, revenue: 1.4 }
];

// Efeito de cada nível, na ordem de TAX_LEVELS (índice 0 = muito baixo … 4 = muito alto)
const TAX_GROUPS = {
    residents: {
        label: 'Moradores', short: 'IPTU', icon: '🏠',
        what: 'Imposto sobre as casas (IPTU). É a maior fonte de dinheiro da cidade.',
        satisfaction: [6, 3, 0, -4, -11],        // pontos de satisfação (entram devagar: CityFinance.SATISFACTION_EASE_S)
        attraction: [1.2, 1.1, 1, 0.9, 0.7],     // × chegada de moradores por segundo (ResourceManager.updatePopulation)
        // parte das casas que continua ocupada: com imposto alto, famílias se mudam para a cidade vizinha aos poucos
        // (CityFinance.OCCUPANCY_EASE_S). Rende mais hoje e encolhe depois: com a cidade cheia, Alto ≈ +6% e Muito
        // alto ≈ o mesmo que Normal na receita dos moradores, com menos satisfação (sem estratégia dominante)
        occupancy: [1, 1, 1, 0.88, 0.72]
    },
    commerce: {
        label: 'Comércio e serviços', short: 'ISS', icon: '🏬',
        what: 'Imposto sobre lojas, restaurantes, hotéis e serviços (ISS).',
        growth: [1.25, 1.12, 1, 0.88, 0.7],      // × velocidade das fases das zonas comerciais
        efficiency: [0.06, 0.03, 0, -0.03, -0.1], // + eficiência de zonas comerciais e prédios de comércio/turismo
        trust: [0.5, 0.25, 0, -0.25, -0.75]      // confiança das empresas por minuto (reputação 'business')
    },
    industry: {
        label: 'Indústrias', short: 'Indústria', icon: '🏭',
        what: 'Imposto sobre as fábricas e zonas industriais.',
        growth: [1.25, 1.12, 1, 0.88, 0.7],
        efficiency: [0.06, 0.03, 0, -0.03, -0.1],
        trust: [0.3, 0.15, 0, -0.15, -0.45]
    }
};

// ===== FUNCIONÁRIOS =====
// `title` por gênero (f/m). `cap`: base = vagas fixas; `unlockAt` = moradores para liberar (1 vaga) e `extraEvery`
// = +1 vaga a cada N moradores. `salary` R$/min no nível 1 (+15% por nível); `bonus` por nível (1 → 5).
// `kpi` = o número que faz a pessoa evoluir (CityStaff.kpiGood). Contratar custa `hireMonths` meses de salário.
const STAFF_ROLES = {
    obras: {
        title: { f: 'Mestre de obras', m: 'Mestre de obras' }, group: 'base', icon: '👷',
        what: 'Mais uma obra ao mesmo tempo e obras mais rápidas.',
        cap: { base: 3 }, salary: 80,
        bonus: { slots: 1, buildTime: [0.05, 0.07, 0.09, 0.11, 0.13] },
        kpi: 'builds', kpiText: 'obras entregues', kpiIdle: 'Esperando obra nova para ganhar experiência.'
    },
    servicos: {
        title: { f: 'Técnica de manutenção', m: 'Técnico de manutenção' }, group: 'base', icon: '🧰',
        what: 'Menos falha de equipamento e conserto aos poucos do estrago de enchentes.',
        cap: { base: 2 }, salary: 70,
        bonus: { failure: [0.2, 0.26, 0.33, 0.39, 0.45], repairPerMin: [0.04, 0.05, 0.06, 0.07, 0.08] },
        kpi: 'efficiency', kpiText: 'prédios funcionando bem'
    },
    assistente_social: {
        title: { f: 'Assistente social', m: 'Assistente social' }, group: 'specialist', icon: '🤝',
        what: 'Moradores mais satisfeitos e menos reclamação com imposto alto.',
        cap: { unlockAt: 150, extraEvery: 500 }, salary: 90,
        bonus: { satisfaction: [3, 4, 5, 6, 8], taxComplaint: [0.25, 0.3, 0.35, 0.4, 0.5] },
        kpi: 'satisfaction', kpiText: 'satisfação dos moradores'
    },
    eng_ambiental: {
        title: { f: 'Engenheira ambiental', m: 'Engenheiro ambiental' }, group: 'specialist', icon: '🌿',
        what: 'A cidade polui menos: prédios e esgoto.',
        cap: { unlockAt: 250, extraEvery: 500 }, salary: 120,
        bonus: { pollution: [0.08, 0.12, 0.16, 0.2, 0.25] },
        kpi: 'pollution', kpiText: 'poluição sob controle'
    },
    eng_civil: {
        title: { f: 'Engenheira civil', m: 'Engenheiro civil' }, group: 'specialist', icon: '📐',
        what: 'Construções mais baratas.',
        cap: { unlockAt: 400, extraEvery: 500 }, salary: 180,
        bonus: { buildCost: [0.05, 0.07, 0.09, 0.11, 0.13] },
        kpi: 'builds', kpiText: 'obras entregues', kpiIdle: 'Esperando obra nova para ganhar experiência.'
    },
    economista: {
        title: { f: 'Economista', m: 'Economista' }, group: 'specialist', icon: '📊',
        what: 'Manutenção dos prédios mais barata.',
        cap: { unlockAt: 500, extraEvery: 500 }, salary: 200,
        bonus: { maintenance: [0.05, 0.065, 0.08, 0.095, 0.11] },
        kpi: 'budget', kpiText: 'saldo positivo e sem cair'
    },
    eng_agronomo: {
        title: { f: 'Engenheira agrônoma', m: 'Engenheiro agrônomo' }, group: 'specialist', icon: '🌱',
        what: 'Árvores, mudas e obras verdes rendem mais; mudas crescem mais rápido.',
        cap: { unlockAt: 600, extraEvery: 500 }, salary: 120,
        bonus: { green: [0.12, 0.18, 0.25, 0.32, 0.4] },
        kpi: 'trees', kpiText: 'árvores e mata ciliar'
    },
    veterinario: {
        title: { f: 'Veterinária', m: 'Veterinário' }, group: 'specialist', icon: '🐾',
        what: 'Bichos raros chegam antes e aguentam mais antes de sumir; moradores mais contentes.',
        cap: { unlockAt: 750, extraEvery: 500 }, salary: 120,
        bonus: { ecology: [0.05, 0.08, 0.11, 0.14, 0.18], tolerance: [3, 4, 5, 6, 8], satisfaction: [1, 1, 2, 2, 3] },
        kpi: 'fauna', kpiText: 'rio vivo e bichos no caderno'
    },
    geografo: {
        title: { f: 'Geógrafa', m: 'Geógrafo' }, group: 'specialist', icon: '🗺️',
        what: 'Secas, enchentes e chuvas fortes fazem menos estrago, com aviso mais cedo.',
        cap: { unlockAt: 900, extraEvery: 500 }, salary: 130,
        bonus: { climate: [0.06, 0.1, 0.14, 0.19, 0.24], warning: [0.15, 0.2, 0.25, 0.3, 0.4] },
        kpi: 'climate', kpiText: 'crises atravessadas com rio e aquífero acima de 40%',
        kpiIdle: 'Sem crise de clima agora: ganha experiência atravessando a próxima.'
    }
};

// Progressão: minutos de jogo com o número da pessoa indo bem para passar de cada nível (1→2, 2→3, 3→4, 4→5)
const STAFF_LEVEL_XP = [3, 5, 8, 12];
const STAFF_MAX_LEVEL = 5;
const STAFF_SALARY_STEP = 0.15;   // +15% de salário por nível (o bônus sobe mais rápido: sensação de conquista)
const STAFF_HIRE_MONTHS = 1;      // contratar custa 1 "mês" de salário (LoanManager.MONTH_MS = 2 min de jogo)

// Talento sorteado na contratação: cada bônus da pessoa (as tabelas por nível acima) × um fator entre min e max,
// guardado e mantido em todos os níveis (evolui na mesma proporção). Quem rende mais pede mais: o salário acompanha
// metade do desvio médio (salaryWeight), então o valor por real fica entre −8% e +7% da curva — dentro do "perfect
// imbalance" de 10-15% de Schreiber e Romero (Game Balance, cap. 8). A escolha: ficar com quem veio ou demitir e
// pagar outra contratação, perdendo o nível.
const STAFF_TALENT = { min: 0.85, max: 1.15, salaryWeight: 0.5 };

// Retratos: cada cargo e gênero tem variantes numeradas (staff/<cargo>-<f|m>-<n>), sorteadas com chance igual entre
// as que existem no manifesto (PORTRAIT_MANIFEST). STAFF_PORTRAIT_VARIANTS = quantas tentar (1 … n); sem nenhuma pronta,
// o jogo usa o avatar de reserva com as iniciais.
const STAFF_PORTRAIT_VARIANTS = 8; // 1-5 em todo cargo; 6-8 só nos cargos com mais vagas (obras e serviços)

// Nomes brasileiros comuns (IBGE, Censo 2010/2022) — sorteados na contratação
const STAFF_NAMES = {
    f: ['Ana', 'Maria', 'Juliana', 'Fernanda', 'Patrícia', 'Aline', 'Camila', 'Bruna', 'Letícia', 'Larissa', 'Beatriz',
        'Gabriela', 'Vanessa', 'Daniela', 'Renata', 'Luana', 'Tainá', 'Jéssica', 'Priscila', 'Rafaela', 'Cristiane',
        'Simone', 'Adriana', 'Raquel', 'Débora', 'Thaís', 'Natália', 'Elaine', 'Rosângela', 'Iara'],
    m: ['José', 'João', 'Antônio', 'Carlos', 'Paulo', 'Lucas', 'Marcos', 'Luiz', 'Gabriel', 'Rafael', 'Pedro', 'Daniel',
        'Marcelo', 'Bruno', 'Eduardo', 'Felipe', 'Rodrigo', 'Gustavo', 'Thiago', 'Diego', 'André', 'Fábio', 'Leandro',
        'Vinícius', 'Matheus', 'Sérgio', 'Wellington', 'Raimundo', 'Francisco', 'Caio'],
    surnames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
        'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
        'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas',
        'Cardoso', 'Ramos', 'Gonçalves', 'Santana', 'Teixeira', 'Araújo', 'Pinto', 'Moura', 'Cavalcanti', 'Monteiro']
};
