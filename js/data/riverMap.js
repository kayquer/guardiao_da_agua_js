// O rio do mapa: dados puros, lidos por GridManager.classifyRiverCells. O relevo segue a sequência geomorfológica
// indicada pelo orientador da pesquisa (Prof. Paulo Rocha, Unesp):
//   com planície:    rio → planície fluvial (alagável, largura quase uniforme) → APP (começa depois dela) → planalto
//   rio encaixado:   rio → APP (começa na beira) → planalto
// Escala didática: 1 bloco ≈ 30 m. APP do rio encaixado = 1 bloco (30 m); depois da planície = 2 blocos (60 m, "50 m ou mais").
const RIVER_MAP = {
    halfWidth: 0.95,           // meia largura do rio, em células (cerca de 2 blocos; pontes vão até RoadNetwork.BRIDGE_SPAN)
    appEntrenched: 1,          // largura da APP no trecho encaixado, em células
    appAfterPlain: 2,          // largura da APP depois da planície, em células
    minPlain: 0.75,            // abaixo disso o trecho conta como encaixado (transição entre os dois)
    // Eixo do rio [x, z, largura da planície em células]. Os extremos ficam fora do mapa para o rio cruzar a borda.
    path: [
        [-3, 6, 0], [4, 9, 0], [10, 6, 0], [15, 8, 0],   // trecho encaixado, oeste
        [18, 9, 1.5],                                   // a planície começa a abrir
        [22, 12, 3], [28, 8, 3], [34, 12, 3], [40, 9, 3], [45, 11, 3] // meandros largos, com planície
    ],
    samplesPerSegment: 8       // suaviza o eixo (Catmull-Rom) para as curvas não ficarem em ângulo
};
