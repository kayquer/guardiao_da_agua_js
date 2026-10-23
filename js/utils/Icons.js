/**
 * ===== ÍCONES SVG DA INTERFACE =====
 * Troca os emojis da interface pelos SVGs animados de assets/icons/svg (catálogo: assets/icons/index.html).
 *
 *   uiIcon('res-water')            → <img class="ui-icon ui-icon--sm" src="assets/icons/svg/res-water.svg" ...>
 *   uiIcon('💧', 'lg')             → mesmo, aceitando o emoji (com ou sem U+FE0F)
 *   buildingIcon('water_pump')     → ícone do prédio (id do BUILDING_TYPES; cai no emoji se não houver SVG)
 *   categoryIcon('water')          → ícone da categoria de construção
 *   uiIconsIn('💧 Água')           → troca os emojis conhecidos de um texto CURTO (rótulos, títulos)
 *
 * Tamanho: 'sm' em chips/botões/listas/HUD; 'lg' em cabeçalhos de painel, cards grandes, modais e livro.
 * Sem a versão pedida, usa a outra (é SVG, escala sem perder).
 * Devolve HTML: use só em innerHTML. Em textContent/title/aria-label/voz alta continue com o emoji.
 * Não use em conteúdo didático longo (lições/estudos) nem em rótulos 3D do Babylon.
 *
 * As tabelas abaixo são geradas de assets/icons/icons.json (id → arquivos; emoji → id preferido).
 * Ao regerar os ícones (assets/icons/_src/generate.js), atualize-as.
 */

// 's' = só <id>.svg (pequena), 'l' = só <id>.svg (grande), 'b' = <id>.svg (grande) + <id>-sm.svg (pequena)
const UI_ICON_FILES = {
    'res-water': 's', 'res-pollution': 's', 'res-budget': 's', 'res-population': 's', 'res-energy': 's',
    'res-satisfaction': 's', 'res-temperature': 'b', 'ui-target': 'b', 'ui-books': 'b', 'ui-pause': 's',
    'ui-build': 's', 'ui-player': 's', 'ui-help': 's', 'ui-save': 's', 'ui-home': 's', 'ui-settings': 's',
    'ui-sound': 's', 'ui-close': 's', 'ui-play': 's', 'ui-rocket': 's', 'ui-hello': 's', 'status-done': 's',
    'status-locked': 's', 'status-unlocked': 's', 'status-pending': 's', 'status-star': 's',
    'status-trophy': 's', 'status-warning': 's', 'status-info': 's', 'status-tip': 's', 'status-error': 's',
    'ui-box': 's', 'ui-chart-up': 's', 'ui-clipboard': 's', 'ui-stats': 's', 'ui-book': 's', 'ui-clock': 's',
    'ui-camera': 's', 'ui-compass': 's', 'ui-celebrate': 's', 'ui-leaf': 's', 'ui-briefcase': 's',
    'ui-renewable': 's', 'ui-income': 's', 'ui-expense': 's', 'ui-battery': 's', 'ui-plug': 's',
    'ui-no-water': 's', 'ui-construction': 's', 'ui-recycle': 's', 'ui-axe': 's', 'ui-sick': 's',
    'ui-bus': 's', 'ui-tree': 's', 'ui-river': 's', 'ui-farm': 's', 'ui-bricks': 's', 'ui-microscope': 's',
    'ui-biohazard': 's', 'weather-wind': 's', 'weather-humidity': 's', 'cat-water': 's',
    'cat-treatment': 's', 'cat-storage': 's', 'cat-public': 's', 'cat-power': 's', 'cat-infrastructure': 's', 'cat-roads': 's',
    'cat-zoning': 's', 'cat-commercial': 's', 'cat-tourism': 's', 'cat-industrial': 's', 'weather-sun': 'b',
    'weather-moon': 'b', 'weather-partly': 'b', 'weather-cloud': 'b', 'weather-fog': 'b',
    'weather-drizzle': 'b', 'weather-rain': 'b', 'weather-heavy-rain': 'b', 'weather-snow': 'b',
    'weather-storm': 'b', 'water-pump': 'b', 'water-well': 'b', 'treatment-plant': 'b',
    'filter-station': 'b', 'water-tank': 'b', 'water-tower': 'b', 'paved-road': 'b', 'dirt-road': 'b',
    'sidewalk': 'b', 'plaza': 'b', 'house': 'b', 'apartment': 'b', 'zone-residential-light': 'b',
    'zone-residential-balanced': 'b', 'zone-residential-heavy': 'b', 'zone-industrial-light': 'b',
    'zone-industrial-balanced': 'b', 'zone-industrial-heavy': 'b', 'zone-commercial-light': 'b',
    'zone-commercial-balanced': 'b', 'zone-commercial-heavy': 'b', 'hydroelectric-plant': 'b',
    'power-pole': 'b', 'thermal-plant': 'b', 'nuclear-plant': 'b', 'coal-plant': 'b', 'solar-farm': 'b',
    'wind-farm': 'b', 'city-hall': 'b', 'school': 'b', 'hospital': 'b', 'fire-station': 'b',
    'police-station': 'b', 'research-center': 'b', 'university': 'b', 'shopping-center': 'b',
    'office-building': 'b', 'bank': 'b', 'restaurant': 'b', 'museum': 'b', 'park': 'b', 'monument': 'b',
    'hotel': 'b', 'factory': 'b', 'tech-center': 'b', 'port': 'b', 'water-research-center': 'b',
    'linear-park': 'b', 'rain-garden': 'b', 'green-roof': 'b', 'green-wall': 'b', 'floating-garden': 'b',
    'monitoring-station': 'b', 'water-quality-monitor': 'b', 'erosion-control': 'b', 'lesson-planet': 'b',
    'lesson-water-cycle': 'b', 'lesson-sharing': 'b', 'lesson-river-life': 'b', 'lesson-hidden-water': 'b',
    'lesson-green-solutions': 'b', 'mission-new-manager': 'b'
};
const UI_ICON_BY_EMOJI = {
    '💧': 'res-water', '🏭': 'res-pollution', '💰': 'res-budget', '👥': 'res-population', '⚡': 'res-energy',
    '😊': 'res-satisfaction', '🌡': 'res-temperature', '🤒': 'res-temperature', '🎯': 'ui-target',
    '📚': 'ui-books', '⏸': 'ui-pause', '🏗': 'ui-build', '👤': 'ui-player', '❓': 'ui-help', '💾': 'ui-save',
    '🏠': 'ui-home', '⚙': 'ui-settings', '🔊': 'ui-sound', '✕': 'ui-close', '✖': 'ui-close', '🎮': 'ui-play',
    '🚀': 'ui-rocket', '👋': 'ui-hello', '✅': 'status-done', '✔': 'status-done', '🔒': 'status-locked',
    '🔓': 'status-unlocked', '⏳': 'status-pending', '⭐': 'status-star', '🏆': 'status-trophy',
    '⚠': 'status-warning', 'ℹ': 'status-info', '💡': 'status-tip', '❌': 'status-error', '📦': 'ui-box',
    '📈': 'ui-chart-up', '📋': 'ui-clipboard', '📊': 'ui-stats', '📖': 'ui-book', '🕐': 'ui-clock',
    '⏱': 'ui-clock', '📹': 'ui-camera', '🧭': 'ui-compass', '🎉': 'ui-celebrate', '🌿': 'ui-leaf',
    '💼': 'ui-briefcase', '🌱': 'ui-renewable', '💵': 'ui-income', '💸': 'ui-expense', '🔋': 'ui-battery',
    '🔌': 'ui-plug', '🚱': 'ui-no-water', '🚧': 'ui-construction', '♻': 'ui-recycle', '🪓': 'ui-axe',
    '😷': 'ui-sick', '🤢': 'ui-sick', '🚌': 'ui-bus', '🌳': 'ui-tree', '🏞': 'ui-river', '🌾': 'ui-farm',
    '🧱': 'ui-bricks', '🔬': 'ui-microscope', '☣': 'ui-biohazard', '💨': 'weather-wind', '🌬': 'weather-wind',
    '💦': 'weather-humidity', '🏛': 'cat-public', '🛣': 'cat-infrastructure', '🏘': 'cat-zoning',
    '🏬': 'cat-commercial', '🎡': 'cat-tourism', '☀': 'weather-sun', '🌙': 'weather-moon',
    '🌤': 'weather-partly', '☁': 'weather-cloud', '🌫': 'weather-fog', '🌦': 'weather-drizzle',
    '🌧': 'weather-rain', '❄': 'weather-snow', '⛈': 'weather-storm', '🕳': 'water-well', '🔧': 'filter-station',
    '🛢': 'water-tank', '🗼': 'water-tower', '🛤': 'dirt-road', '🚶': 'sidewalk', '🏢': 'apartment',
    '🏪': 'zone-commercial-light', '🌊': 'hydroelectric-plant', '☢': 'nuclear-plant', '🏫': 'school',
    '🏥': 'hospital', '🚒': 'fire-station', '🚔': 'police-station', '🎓': 'university', '🏦': 'bank',
    '🍽': 'restaurant', '🗿': 'monument', '🏨': 'hotel', '⚓': 'port', '🪷': 'floating-garden',
    '🔍': 'water-quality-monitor', '🛡': 'erosion-control', '🌍': 'lesson-planet', '🔄': 'lesson-water-cycle',
    '⚖': 'lesson-sharing', '🐟': 'lesson-river-life', '🏙': 'lesson-hidden-water',
    '👩‍💼': 'mission-new-manager'
};

const UI_ICON_DIR = 'assets/icons/svg/';
const UI_ICON_FE0F = /\uFE0F/g;

/** id do ícone a partir de um id, emoji ou id de prédio (water_pump). null se não houver. */
function uiIconId(key) {
    if (!key) return null;
    const k = String(key).trim();
    if (UI_ICON_FILES[k]) return k;
    const kebab = k.replace(/_/g, '-');
    if (UI_ICON_FILES[kebab]) return kebab;
    return UI_ICON_BY_EMOJI[k.replace(UI_ICON_FE0F, '')] || null;
}

/** Caminho do SVG (relativo ao index.html) no tamanho pedido, ou null. */
function uiIconSrc(key, size = 'sm') {
    const id = uiIconId(key);
    if (!id) return null;
    const kind = UI_ICON_FILES[id];
    const file = kind === 'b' && size === 'sm' ? `${id}-sm.svg` : `${id}.svg`;
    return UI_ICON_DIR + file;
}

/**
 * <img> do ícone. Chave desconhecida → devolve o próprio texto escapado (o emoji continua aparecendo).
 * extraClass: classes a mais (ex.: 'ui-icon--xl').
 */
function uiIcon(key, size = 'sm', extraClass = '') {
    const src = uiIconSrc(key, size);
    if (!src) {
        return key == null ? '' : String(key).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    const cls = `ui-icon ui-icon--${size === 'lg' ? 'lg' : 'sm'}${extraClass ? ' ' + extraClass : ''}`;
    return `<img class="${cls}" src="${src}" alt="" aria-hidden="true" draggable="false">`;
}

/** Ícone de um prédio pelo id do tipo (ou objeto do tipo). Sem SVG próprio, usa o emoji do tipo. */
function buildingIcon(typeOrId, size = 'sm', extraClass = '') {
    const type = typeof typeOrId === 'string'
        ? (typeof BUILDING_TYPES !== 'undefined' ? BUILDING_TYPES[typeOrId] : null)
        : typeOrId;
    const id = typeof typeOrId === 'string' ? typeOrId : type && type.id;
    const own = id && UI_ICON_FILES[String(id).replace(/_/g, '-')] ? String(id).replace(/_/g, '-') : null;
    return uiIcon(own || (type && type.icon) || '', size, extraClass);
}

/** Ícone de uma aula (capítulo de LESSON_CHAPTERS, 1..6): o emoji 🌿 do capítulo 6 é o mesmo da folha genérica. */
const UI_LESSON_ICONS = ['lesson-planet', 'lesson-water-cycle', 'lesson-sharing', 'lesson-river-life', 'lesson-hidden-water', 'lesson-green-solutions'];
function lessonIcon(chapter, size = 'lg', extraClass = '') {
    const id = UI_LESSON_ICONS[Number(chapter) - 1];
    const fallback = typeof LESSON_CHAPTERS !== 'undefined' ? LESSON_CHAPTERS[chapter]?.icon : '';
    return uiIcon(id || fallback || '', size, extraClass);
}

/** Ícone de uma categoria de construção (water, treatment, ...). */
function categoryIcon(category, size = 'sm', extraClass = '') {
    return uiIcon(`cat-${category}`, size, extraClass);
}

// Emojis que, soltos num texto, são símbolos genéricos e não o prédio do mesmo emoji (🔧 Manutenção ≠ estação de filtragem)
const UI_ICON_TEXT_SKIP = new Set(['🔧', '🌊', '🔍', '🛡', '🚶', '🕳', '🛤', '⚓', '☢']);
let uiIconEmojiRegex = null;
/**
 * Troca por <img> os emojis conhecidos de um texto curto que vai para innerHTML.
 * Não escapa o resto: passe texto já seguro (fixo do jogo ou já escapado).
 */
function uiIconsIn(text, size = 'sm') {
    if (text == null) return '';
    if (!uiIconEmojiRegex) {
        // Emojis não têm metacaracteres de regex; os mais longos (ZWJ) primeiro
        const keys = Object.keys(UI_ICON_BY_EMOJI)
            .filter(e => !UI_ICON_TEXT_SKIP.has(e))
            .sort((a, b) => b.length - a.length);
        uiIconEmojiRegex = new RegExp(`(?:${keys.join('|')})\uFE0F?`, 'gu');
    }
    return String(text).replace(uiIconEmojiRegex, m => uiIcon(m, size));
}
