/**
 * TextSize — tamanho do texto de leitura (acessibilidade): Normal / Grande / Maior, salvo neste navegador.
 * Aplica `html[data-text-size]` + a variável CSS --text-scale, que css/accessibility.css usa (zoom) nos blocos de
 * leitura: tutorial, livro de aulas, estudos, quiz, Paulo, avisos e painéis. O HUD fica do mesmo tamanho.
 * Seletores [data-text-picker] no menu e na pausa (main.js initializeTextPickers).
 */
class TextSize {
    static STORAGE_KEY = 'guardiao_agua_text';
    static LEVELS = { normal: 1, large: 1.15, xlarge: 1.3 };
    static listeners = [];

    static current() {
        try {
            const saved = localStorage.getItem(TextSize.STORAGE_KEY);
            return TextSize.LEVELS[saved] ? saved : 'normal';
        } catch {
            return 'normal';
        }
    }

    static set(level) {
        if (!TextSize.LEVELS[level]) return;
        try { localStorage.setItem(TextSize.STORAGE_KEY, level); } catch { /* modo privado: vale só nesta visita */ }
        TextSize.apply(level);
        TextSize.listeners.forEach(fn => fn(level));
    }

    static apply(level = TextSize.current()) {
        if (typeof document === 'undefined') return;
        document.documentElement.dataset.textSize = level;
        document.documentElement.style.setProperty('--text-scale', String(TextSize.LEVELS[level] || 1));
    }

    static onChange(fn) {
        TextSize.listeners.push(fn);
    }
}
TextSize.apply();
