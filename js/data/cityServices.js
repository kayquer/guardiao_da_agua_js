/**
 * Serviços públicos da cidade (11/2026) — dados puros lidos por js/systems/CityServices.js, no mesmo padrão dos
 * bônus dos funcionários (CityStaff.bonus): cada chave soma o efeito dos prédios prontos que têm o campo, com teto.
 * O campo continua no prédio (js/data/buildings.js); aqui fica quanto ele vale e o que faz no jogo.
 *
 *   per  = efeito de cada prédio pronto (× eficiência dele); cap = teto da soma (mais prédios rendem cada vez menos
 *          só pelo teto, como BONUS_CAP).
 *   attraction usa o valor numérico do prédio (attractivenessBonus) com retorno decrescente: max × (1 − e^(−soma/scale)),
 *          o mesmo formato do bônus de satisfação dos prédios (ResourceManager.buildingSatisfactionEffect).
 */
const CITY_SERVICES = {
    // escola e universidade: a cidade aprende a economizar — cada morador gasta menos água (ResourceManager.waterPerPerson)
    education: { field: 'educationBonus', per: 0.05, cap: 0.15, text: v => `moradores gastam ${Math.round(v * 100)}% menos água` },
    // hospital: poluição alta tira menos satisfação (ResourceManager.getSatisfactionFactors, fator 'pollution')
    health: { field: 'healthBonus', per: 0.35, cap: 0.5, text: v => `poluição alta incomoda ${Math.round(v * 100)}% menos` },
    // bombeiros: queimada e enchente fazem menos estrago (EventSystem.startEvent, effectScale)
    safety: { field: 'safetyBonus', per: 0.15, cap: 0.3, text: v => `queimada e enchente ${Math.round(v * 100)}% mais fracas` },
    // polícia: comércio e turismo funcionam melhor com a rua segura (BuildingEfficiency, como o bônus do imposto)
    security: { field: 'securityBonus', per: 0.05, cap: 0.1, text: v => `comércio e turismo rendem ${Math.round(v * 100)}% mais` },
    // museu, parque, monumento, hotel: gente quer morar perto (× chegada de moradores, ResourceManager.updatePopulation)
    attraction: { field: 'attractivenessBonus', max: 0.3, scale: 120, text: v => `chegam ${Math.round(v * 100)}% mais moradores` }
};

// Zonas residenciais: growthRate = ritmo em que os moradores ocupam as casas da zona. A chegada da cidade é a média
// pela capacidade de cada zona pronta, relativa à zona leve (0,1 = 1×; equilibrada 1,5×; pesada 2×: prédio de
// apartamentos enche mais rápido que lote de casas). Sem zona pronta = 1×.
const RESIDENTIAL_PACE_BASE = 0.1;
