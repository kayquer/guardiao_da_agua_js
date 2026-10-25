/**
 * Aulas sobre a água (central de aulas 📚). Chave = capítulo (`chapter`) dos passos de
 * TutorialSystem.createTutorialSteps(), que guardam o conteúdo das páginas.
 * `sources`: fontes da aula, mostradas com link no fim do livro (LessonBookUI.renderLessonPage).
 * O progresso de cada jogador fica em LessonProgress (localStorage).
 */
const LESSON_SOURCES = {
    ana: { label: 'ANA — Agência Nacional de Águas e Saneamento Básico', url: 'https://www.gov.br/ana/pt-br' },
    anaRegioes: { label: 'ANA — As regiões hidrográficas do Brasil', url: 'https://www.gov.br/ana/pt-br/assuntos/gestao-das-aguas/panorama-das-aguas/regioes-hidrograficas' },
    anaComites: { label: 'ANA — Comitês de bacia hidrográfica', url: 'https://www.gov.br/ana/pt-br/assuntos/gestao-das-aguas/fortalecimento-dos-entes-do-singreh/comites-de-bacia-hidrografica' },
    sgbAgua: { label: 'Serviço Geológico do Brasil (SGB) — Coisas que você deve saber sobre a água', url: 'https://www.sgb.gov.br/coisas-que-voce-deve-saber-sobre-a-agua' },
    usgsWhere: { label: 'USGS Water Science School — Onde está a água da Terra (em inglês)', url: 'https://www.usgs.gov/special-topics/water-science-school/science/where-earths-water' },
    usgsCycle: { label: 'USGS Water Science School — O ciclo da água (em inglês)', url: 'https://www.usgs.gov/special-topics/water-science-school/science/water-cycle' },
    usgsWatershed: { label: 'USGS Water Science School — Bacias hidrográficas (em inglês)', url: 'https://www.usgs.gov/special-topics/water-science-school/science/watersheds-and-drainage-basins' },
    usgsOxygen: { label: 'USGS Water Science School — Oxigênio dissolvido na água (em inglês)', url: 'https://www.usgs.gov/special-topics/water-science-school/science/dissolved-oxygen-and-water' },
    usgsGroundwater: { label: 'USGS Water Science School — O que é água subterrânea (em inglês)', url: 'https://www.usgs.gov/special-topics/water-science-school/science/groundwater-what-groundwater' },
    embrapa: { label: 'Embrapa — Água na agricultura', url: 'https://www.embrapa.br/agua-na-agricultura' },
    leiAguas: { label: 'Lei das Águas (Lei nº 9.433/1997) — Planalto', url: 'https://www.planalto.gov.br/ccivil_03/leis/l9433.htm' },
    codigoFlorestal: { label: 'Código Florestal (Lei nº 12.651/2012) — Planalto', url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm' },
    leiSaneamento: { label: 'Lei do Saneamento Básico (Lei nº 11.445/2007) — Planalto', url: 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/lei/l11445.htm' },
    trata: { label: 'Instituto Trata Brasil — saneamento básico', url: 'https://tratabrasil.org.br' },
    unicef: { label: 'UNICEF Brasil — Água, saneamento e higiene', url: 'https://www.unicef.org/brazil/agua-saneamento-e-higiene' },
    sgbGuarani: { label: 'Serviço Geológico do Brasil (SGB) — Aquífero Guarani', url: 'https://www.sgb.gov.br/aquifero-guarani' },
    iucn: { label: 'UICN — Soluções Baseadas na Natureza (em inglês)', url: 'https://www.iucn.org/our-work/nature-based-solutions' },
    wri: { label: 'WRI Brasil — Soluções baseadas na natureza em cidades brasileiras', url: 'https://www.wribrasil.org.br/noticias/solucoes-baseadas-na-natureza-exemplos-implementados-por-cidades-brasileiras' }
};

const LESSON_CHAPTERS = {
    1: { title: 'A água do planeta', icon: '🌍', summary: 'Hidrosfera: onde está toda a água da Terra e quanta dá para beber.', sources: ['usgsWhere', 'sgbAgua', 'anaRegioes'] },
    2: { title: 'O caminho da água', icon: '🔄', summary: 'O ciclo da água, os rios voadores e as bacias hidrográficas.', sources: ['usgsCycle', 'usgsWatershed', 'anaRegioes'] },
    3: { title: 'Água para todos', icon: '⚖️', summary: 'Como dividir a água, a Lei das Águas e os comitês de bacia.', sources: ['leiAguas', 'anaComites', 'embrapa'] },
    4: { title: 'A vida no rio', icon: '🐟', summary: 'Mata ciliar, bioindicadores e o perigo do esgoto.', sources: ['codigoFlorestal', 'usgsOxygen', 'leiSaneamento', 'trata', 'unicef'] },
    5: { title: 'Água escondida e cidades', icon: '🏙️', summary: 'Aquíferos, o Aquífero Guarani e cidades que respeitam o rio.', sources: ['usgsGroundwater', 'sgbGuarani', 'ana'] },
    6: { title: 'Soluções verdes', icon: '🌿', summary: 'Infraestrutura verde, cidades-esponja e filtros vivos.', sources: ['iucn', 'wri'] }
};
