/**
 * ===== LOGO ANIMADO DO JOGO =====
 * assets/logo/guardiao-logo.svg (gerado por assets/logo/_src/build_logo.py; ver o cabeçalho de lá).
 *
 * O index.html já traz o logo como <img> (a versão estática no menu, a animada na tela de carregamento),
 * então ele aparece mesmo sem JS. GameLogo.mount() troca o <img> do menu pelo SVG inline, para a animação
 * ser comandada por classe na raiz do <svg>:
 *   - `logo-play`  → toca a entrada (letras quicando, gota caindo e respingando, faixa, brilho) e depois o
 *                    loop sutil (ondas, gota balançando, cata-vento, brilho a cada 7 s);
 *   - sem classe   → pose final parada;
 *   - `logo-wait`  → escondido (ex.: a intro esconde o logo e chama play() quando a câmera chegar).
 *
 *   GameLogo.play()   → reinicia a entrada do zero (tira `logo-play`, força o reflow e põe de novo)
 *   GameLogo.hide()   → esconde até o próximo play()
 *   GameLogo.ENTRY_MS → duração da entrada (para encadear os menus depois dela)
 *
 * Só monte UMA cópia inline por página: os ids internos (gl-*) seriam repetidos.
 */
const GameLogo = {
    SRC: 'assets/logo/guardiao-logo.svg',
    ENTRY_MS: 2600,
    svg: null,
    pending: null, // 'play' | 'hide' pedido antes do SVG carregar

    /** Troca o <img> de `container` (padrão: #main-menu-logo) pelo SVG animado inline. */
    async mount(container = document.getElementById('main-menu-logo')) {
        if (!container || this.svg) return this.svg;
        try {
            const res = await fetch(this.SRC);
            if (!res.ok) return null;
            const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
            const svg = doc.documentElement;
            if (!svg || svg.nodeName.toLowerCase() !== 'svg') return null;
            svg.classList.remove('logo-play'); // parado até alguém pedir play()
            svg.setAttribute('focusable', 'false');
            container.replaceChildren(document.importNode(svg, true));
            this.svg = container.querySelector('svg');
            if (this.pending === 'play') this.play();
            else if (this.pending === 'hide') this.hide();
            this.pending = null;
        } catch (e) {
            console.warn('GameLogo: mantendo o logo estático', e);
        }
        return this.svg;
    },

    play() {
        if (!this.svg) { this.pending = 'play'; return; }
        this.svg.classList.remove('logo-play', 'logo-wait');
        void this.svg.getBoundingClientRect(); // reflow: sem isso a animação não recomeça
        this.svg.classList.add('logo-play');
    },

    hide() {
        if (!this.svg) { this.pending = 'hide'; return; }
        this.svg.classList.remove('logo-play');
        this.svg.classList.add('logo-wait');
    }
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => GameLogo.mount());
    else GameLogo.mount();
}
