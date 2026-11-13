/**
 * Bacia da partida (js/data/basinMaps.js) — sem DOM nem Babylon.
 * main.js escolhe antes de criar o GameManager (o terreno nasce no construtor do GridManager): jogo novo = a escolhida
 * no modo loja (GameMode.mapChoice) ou sempre `vale` na pesquisa; jogo salvo = a do save (`game.basin`; save antigo = vale).
 * Trocar de bacia no meio da partida não existe: carregar um espaço de outra bacia volta pelo menu (SavePoints).
 */
const Basin = {
    selected: null,

    select(id) {
        Basin.selected = typeof BASIN_MAPS !== 'undefined' && BASIN_MAPS[id] ? id : Basin.defaultId();
        return Basin.selected;
    },

    defaultId() {
        return typeof DEFAULT_BASIN !== 'undefined' ? DEFAULT_BASIN : 'vale';
    },

    id() {
        return Basin.selected || Basin.defaultId();
    },

    /** Dados da bacia com o rio já resolvido ('RIVER_MAP' = o mapa da pesquisa). */
    current() {
        const def = (typeof BASIN_MAPS !== 'undefined' && BASIN_MAPS[Basin.id()]) || {};
        const river = def.river === 'RIVER_MAP' || !def.river ? (typeof RIVER_MAP !== 'undefined' ? RIVER_MAP : null) : def.river;
        return { id: Basin.id(), hills: 'some', start: {}, eventWeights: {}, ...def, river };
    },

    /** Limites do ruído de encosta (GridManager.determineTerrainType) por jeito de terreno. */
    hillThresholds(kind = Basin.current().hills) {
        return { few: [0.94, 0.9], some: [0.8, 0.6], many: [0.6, 0.45] }[kind] || [0.8, 0.6];
    },

    eventWeight(type) {
        const w = Basin.current().eventWeights?.[type];
        return Number.isFinite(w) && w > 0 ? w : 1;
    },

    /**
     * Cores da bacia (js/data/basinMaps.js): BASIN_PALETTE (= o vale) com o `palette` da bacia por cima, objetos novos
     * (pode mexer sem estragar os dados). Sem id = a bacia da partida. Terreno em RGB 0-255, água e copas em 0-1.
     * { grassland, floodplain, app, hill, hillSide, bank|null, water: { shallow, deep }, trees: { round, dark, pine } }
     */
    palette(id = Basin.id()) {
        const base = typeof BASIN_PALETTE !== 'undefined' ? BASIN_PALETTE : {};
        const own = (typeof BASIN_MAPS !== 'undefined' && BASIN_MAPS[id]?.palette) || {};
        const copy = v => Array.isArray(v) ? v.slice() : v;
        const out = {};
        for (const key of new Set([...Object.keys(base), ...Object.keys(own)])) {
            const b = base[key], o = own[key];
            if (b && typeof b === 'object' && !Array.isArray(b)) {
                out[key] = {};
                for (const k of new Set([...Object.keys(b), ...Object.keys(o || {})])) out[key][k] = copy(o?.[k] ?? b[k]);
            } else {
                out[key] = copy(o !== undefined ? o : b);
            }
        }
        return out;
    },

    /** Cor da paleta como CSS (para telas fora do 3D, ex. a escolha de bacia): `rgb(r, g, b)`, aceitando 0-255 ou 0-1. */
    cssColor(rgb) {
        if (!Array.isArray(rgb)) return null;
        const unit = rgb.every(n => n <= 1);
        const [r, g, b] = rgb.map(n => Math.round(unit ? n * 255 : n));
        return `rgb(${r}, ${g}, ${b})`;
    }
};

window.Basin = Basin;
