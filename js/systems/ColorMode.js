/**
 * ColorMode — modo para daltonismo (acessibilidade de loja): Normal / Deuteranopia e protanopia / Tritanopia,
 * salvo neste navegador e aplicado no boot. Mesmo esquema do TextSize: `html[data-color-mode]`, que
 * css/color-modes.css usa para trocar os pares verde/vermelho de estado (tokens --gda-good/--gda-bad, setas e
 * fases do HUD de recursos, painéis de recurso, rótulo de obra). No 3D, `ColorMode.rgb(estado, cor normal)` dá a
 * cor da prévia de construção, do marcador, do overlay de colocação e do fantasma das ruas (BuildingSystem,
 * SelectionVisuals, RoadPlacement). Sem DOM nem Babylon fora de apply/color3: testado em tests/unit/input-bindings.test.js.
 */
class ColorMode {
    static STORAGE_KEY = STORAGE_PREFIX + 'color_mode';
    static MODES = ['normal', 'deutan', 'tritan'];
    static LABELS = { normal: 'Normal', deutan: 'Deuteranopia e protanopia', tritan: 'Tritanopia' };
    static HINTS = {
        normal: 'Verde = bom, vermelho = ruim.',
        deutan: 'Para quem confunde verde e vermelho: azul = bom, laranja = ruim, amarelo = atenção.',
        tritan: 'Para quem confunde azul e amarelo: verde-água = bom, vermelho = ruim.'
    };

    /** Cores de estado no 3D (0-1). `warn` = pode, mas derruba árvores. No modo normal valem as cores de cada lugar. */
    static PALETTES = {
        deutan: { good: [0.1, 0.55, 1], bad: [1, 0.42, 0], warn: [1, 0.88, 0.1] },
        tritan: { good: [0, 0.78, 0.7], bad: [1, 0.08, 0.25], warn: [0.9, 0.9, 0.9] }
    };

    static listeners = [];

    static current() {
        try {
            const saved = localStorage.getItem(ColorMode.STORAGE_KEY);
            return ColorMode.MODES.includes(saved) ? saved : 'normal';
        } catch {
            return 'normal';
        }
    }

    static set(mode) {
        if (!ColorMode.MODES.includes(mode)) return;
        try { localStorage.setItem(ColorMode.STORAGE_KEY, mode); } catch { /* modo privado: vale só nesta visita */ }
        ColorMode.apply(mode);
        ColorMode.listeners.forEach(fn => fn(mode));
    }

    static apply(mode = ColorMode.current()) {
        if (typeof document === 'undefined' || !document.documentElement) return;
        if (mode === 'normal') delete document.documentElement.dataset.colorMode;
        else document.documentElement.dataset.colorMode = mode;
    }

    /**
     * Cor de um estado ('good' | 'bad' | 'warn') para o modo atual: no normal devolve `fallback` (a cor de sempre
     * daquele lugar); nos outros, a cor da paleta × `scale` (emissivo = mais fraco).
     */
    static rgb(state, fallback, scale = 1, mode = ColorMode.current()) {
        const color = ColorMode.PALETTES[mode]?.[state];
        if (!color) return fallback.slice();
        return color.map(c => c * scale);
    }

    static color3(state, fallback, scale = 1) {
        return BABYLON.Color3.FromArray(ColorMode.rgb(state, fallback, scale));
    }

    static onChange(fn) {
        ColorMode.listeners.push(fn);
    }
}
ColorMode.apply();
