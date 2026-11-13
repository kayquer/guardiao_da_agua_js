/**
 * ===== "ONDE FICA A SUA CIDADE?" — carrossel de bacias (modo loja, GameMode.mapChoice) =====
 * main.js chooseBasin → BasinPicker.open() → resolve o id escolhido ou null (Voltar/Esc).
 *
 * Tela cheia, um cartão por bacia (BASIN_MAPS; o vale, mapa clássico da pesquisa, sempre primeiro): o cartão em foco
 * fica grande no meio, os vizinhos menores dos lados. Setas, pontos, teclado (← →, Home/End, Enter joga, Esc volta)
 * e arrasto/deslize. Cada cartão mostra a maquete 3D da bacia (js/systems/ui/BasinPreview.js: o relevo de verdade,
 * girando devagar no cartão em foco; foto nos outros), nome, descrição e 4 traços com ícones SVG animados
 * (js/data/basinIcons.js). Sem emoji nesta tela. `.basin-pick[data-pick="<id>"]` = "Jogar aqui" de cada cartão
 * (tests/helpers.js pickBasin foca o cartão pelo ponto e clica nele).
 * Fechar (escolha ou volta) descarta a engine da maquete e o canvas antes de o jogo montar a cena dele.
 * traitsFor/orderedIds/circularOffset não tocam no DOM (tests/unit/basin-picker.test.js).
 */
const BasinPicker = {
    root: null,
    ids: [],
    index: 0,
    preview: null,
    resolve: null,
    lastFocus: null,
    shots: {},
    drag: null,
    suppressClick: false,
    inerted: [],

    // ===================== DADOS (sem DOM) =====================

    /** Bacias na ordem do carrossel: a padrão (vale, o mapa clássico) primeiro, depois a ordem de BASIN_MAPS. */
    orderedIds() {
        const ids = Object.keys(typeof BASIN_MAPS !== 'undefined' ? BASIN_MAPS : {});
        const first = typeof DEFAULT_BASIN !== 'undefined' ? DEFAULT_BASIN : 'vale';
        return ids.includes(first) ? [first, ...ids.filter(id => id !== first)] : ids;
    },

    /** Distância do cartão i ao foco, dando a volta (4 cartões: -2..1). */
    circularOffset(i, focus, n) {
        if (n <= 1) return 0;
        let off = ((i - focus) % n + n) % n;
        if (off >= n / 2) off -= n;
        return off;
    },

    /** Os 4 traços do cartão, tirados dos dados da bacia: [{ key, icon, label, value, level? }]. */
    traitsFor(id) {
        const def = BASIN_MAPS[id] || {};
        const river = def.river === 'RIVER_MAP' || !def.river ? (typeof RIVER_MAP !== 'undefined' ? RIVER_MAP : {}) : def.river;
        const hills = def.hills || 'some';
        const path = river.path || [];
        const plains = path.map(p => p[2] || 0);
        const minPlain = river.minPlain ?? 0.75;
        const withPlain = plains.filter(w => w >= minPlain).length;
        const maxPlain = Math.max(0, ...plains);
        const relief = { few: 'Plano', some: 'Alguns morros', many: 'Muitas encostas' }[hills] || 'Alguns morros';
        let riverText;
        if (maxPlain >= 3.5 && withPlain === path.length) riverText = 'planície larga que alaga';
        else if (withPlain && withPlain < path.length) riverText = 'planície num trecho do rio';
        else if (withPlain) riverText = 'rio com planície que alaga';
        else if ((river.halfWidth ?? 1) <= 0.7) riverText = 'rio fino e encaixado';
        else riverText = 'rio encaixado';

        const EVENTS = { flood: 'enchentes', heavy_rain: 'chuva forte', drought: 'secas', wildfire: 'queimadas' };
        const ICON = { flood: 'flood', heavy_rain: 'rain', drought: 'drought', wildfire: 'fire' };
        const strong = Object.entries(def.eventWeights || {})
            .filter(([type, w]) => EVENTS[type] && w >= 1.2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);
        const climate = strong.length
            ? `Mais ${strong.map(([type]) => EVENTS[type]).join(' e ')}`
            : 'Equilibrado: um pouco de tudo';

        const aquifer = Math.round(def.start?.aquifer ?? 100);
        const riverLevel = Math.round(def.start?.river ?? 100);
        const water = aquifer >= 100 && riverLevel >= 100
            ? 'Aquífero e rio cheios'
            : `Aquífero ${aquifer}% · rio ${riverLevel}%`;

        return [
            { key: 'relief', icon: `relief-${hills}`, label: 'Relevo', value: `${relief}, ${riverText}` },
            { key: 'climate', icon: strong.length ? ICON[strong[0][0]] : 'balance', label: 'Clima', value: climate },
            { key: 'water', icon: 'aquifer', label: 'Água no começo', value: water, level: aquifer },
            { key: 'challenge', icon: 'challenge', label: 'Desafio', value: (typeof BASIN_CARDS !== 'undefined' && BASIN_CARDS[id]?.challenge) || 'Cuidar da água da cidade' }
        ];
    },

    /** Ícone de traço com id único (clipPath) e o nível da água do aquífero (0-100 → altura no desenho). */
    traitIcon(name, level = 100, uid = name) {
        const svg = (typeof BASIN_TRAIT_ICONS !== 'undefined' && BASIN_TRAIT_ICONS[name]) || '';
        const y = (21 - Math.max(0, Math.min(100, level)) / 100 * 17).toFixed(1); // 100% = quase no topo da gota
        return svg.replace(/\{uid\}/g, uid).replace(/\{lvl\}/g, y);
    },

    escape(text) {
        return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    },

    // ===================== TELA =====================

    reducedMotion() {
        return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    },

    /** Abre o carrossel. Resolve o id da bacia ou null. */
    open() {
        if (this.root) this.close(null);
        this.ids = this.orderedIds();
        this.index = 0;
        this.shots = {};
        this.lastFocus = document.activeElement;
        this.root = this.render();
        document.body.appendChild(this.root);
        // Atrás do carrossel nada recebe foco nem clique (o menu continua na tela, só desfocado)
        this.inerted = [...document.querySelectorAll('body > .screen')].filter(el => !el.inert);
        this.inerted.forEach(el => { el.inert = true; });
        if (typeof MenuIntro !== 'undefined') MenuIntro.pauseRendering?.();
        this.bind();
        this.layout(true);
        requestAnimationFrame(() => this.root?.classList.add('is-open'));
        this.focusPick();
        this.startPreview();
        return new Promise(resolve => { this.resolve = resolve; });
    },

    render() {
        const root = document.createElement('div');
        root.id = 'basin-picker';
        root.className = 'basin-picker';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-labelledby', 'bp-title');
        root.setAttribute('aria-describedby', 'bp-subtitle');
        const esc = s => this.escape(s);
        const n = this.ids.length;
        const icons = typeof BASIN_TRAIT_ICONS !== 'undefined' ? BASIN_TRAIT_ICONS : {};
        const cards = this.ids.map((id, i) => {
            const def = BASIN_MAPS[id];
            const classic = i === 0;
            const palette = typeof Basin.palette === 'function' ? Basin.palette(id) : null;
            const accent = palette && Basin.cssColor ? Basin.cssColor(palette.water?.shallow) : null;
            const land = palette && Basin.cssColor ? Basin.cssColor(palette.grassland) : null;
            const style = [accent && `--bp-accent: ${accent}`, land && `--bp-land: ${land}`].filter(Boolean).join('; ');
            const traits = this.traitsFor(id).map(t => `
                <li class="bp-trait bp-trait--${t.key}">
                    <span class="bp-trait__icon">${this.traitIcon(t.icon, t.level, `${id}-${t.key}`)}</span>
                    <span class="bp-trait__text"><b>${esc(t.label)}</b><span>${esc(t.value)}</span></span>
                </li>`).join('');
            return `
            <article class="bp-card" data-basin="${id}" data-index="${i}" role="group" aria-roledescription="bacia"
                     aria-label="${i + 1} de ${n}: ${esc(def.name)}"${style ? ` style="${style}"` : ''}>
                <div class="bp-view">
                    <div class="bp-view__fallback">${(typeof BASIN_ICONS !== 'undefined' && BASIN_ICONS[id]) || ''}</div>
                    <img class="bp-shot" alt="" hidden>
                    ${classic ? `<span class="bp-badge">${icons.star || ''}Mapa clássico</span>` : ''}
                </div>
                <div class="bp-body">
                    <header class="bp-head">
                        <span class="bp-head__icon">${(typeof BASIN_ICONS !== 'undefined' && BASIN_ICONS[id]) || ''}</span>
                        <h3 class="bp-name">${esc(def.name)}</h3>
                    </header>
                    <p class="bp-desc">${esc(def.description)}</p>
                    <ul class="bp-traits">${traits}</ul>
                    <button type="button" class="bp-play basin-pick" data-pick="${id}" aria-label="Jogar em ${esc(def.name)}">
                        ${icons.play || ''}<span>Jogar aqui</span>
                    </button>
                </div>
            </article>`;
        }).join('');
        const dots = this.ids.map((id, i) => `<button type="button" class="bp-dot" data-basin="${id}" data-index="${i}"
            aria-label="Mostrar ${esc(BASIN_MAPS[id].name)}"></button>`).join('');
        root.innerHTML = `
            <div class="bp-backdrop" aria-hidden="true"></div>
            <header class="bp-header">
                <h2 id="bp-title" class="bp-title">Onde fica a sua cidade?</h2>
                <p id="bp-subtitle" class="bp-subtitle">Cada bacia tem um rio, um relevo e um clima diferentes. Escolha onde começar.</p>
            </header>
            <div class="bp-stage" role="region" aria-roledescription="carrossel" aria-label="Bacias para jogar">
                <div class="bp-track">${cards}</div>
            </div>
            <nav class="bp-nav" aria-label="Trocar de bacia">
                <button type="button" class="bp-arrow bp-arrow--prev" aria-label="Bacia anterior">${icons.prev || ''}</button>
                <div class="bp-dots">${dots}</div>
                <button type="button" class="bp-arrow bp-arrow--next" aria-label="Próxima bacia">${icons.next || ''}</button>
            </nav>
            <footer class="bp-footer">
                <button type="button" class="bp-back">Voltar</button>
                <p class="bp-keys" aria-hidden="true"><kbd>←</kbd> <kbd>→</kbd> para ver as bacias · <kbd>Enter</kbd> para jogar</p>
            </footer>
            <p class="bp-live" aria-live="polite"></p>`;
        return root;
    },

    bind() {
        const root = this.root;
        this.onKey = event => this.handleKey(event);
        this.onResize = () => this.preview?.resize();
        document.addEventListener('keydown', this.onKey, true);
        window.addEventListener('resize', this.onResize);
        root.querySelector('.bp-arrow--prev').addEventListener('click', () => this.move(-1));
        root.querySelector('.bp-arrow--next').addEventListener('click', () => this.move(1));
        root.querySelector('.bp-back').addEventListener('click', () => this.close(null));
        root.querySelector('.bp-dots').addEventListener('click', event => {
            const dot = event.target.closest('.bp-dot');
            if (dot) this.focusIndex(Number(dot.dataset.index));
        });
        const track = root.querySelector('.bp-track');
        track.addEventListener('click', event => {
            if (this.suppressClick) {
                this.suppressClick = false;
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            const card = event.target.closest('.bp-card');
            if (!card) return;
            const i = Number(card.dataset.index);
            if (i !== this.index) {
                // Cartão do lado: o clique só traz ele para o meio (o "Jogar aqui" dele também)
                event.preventDefault();
                this.focusIndex(i);
                return;
            }
            const pick = event.target.closest('.basin-pick');
            if (pick) this.choose(pick.dataset.pick);
        });
        // Arrastar/deslizar: o carrossel acompanha o dedo; passou de 50 px, troca de cartão
        const stage = root.querySelector('.bp-stage');
        stage.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            this.drag = { x: event.clientX, y: event.clientY, dx: 0, id: event.pointerId, active: false };
        });
        stage.addEventListener('pointermove', event => {
            const d = this.drag;
            if (!d || d.id !== event.pointerId) return;
            d.dx = event.clientX - d.x;
            if (!d.active && Math.abs(d.dx) > 8 && Math.abs(d.dx) > Math.abs(event.clientY - d.y)) {
                d.active = true;
                stage.setPointerCapture?.(event.pointerId);
                root.classList.add('is-dragging');
            }
            if (d.active) root.style.setProperty('--bp-drag', `${d.dx}px`);
        });
        const end = event => {
            const d = this.drag;
            if (!d || d.id !== event.pointerId) return;
            this.drag = null;
            root.classList.remove('is-dragging');
            root.style.setProperty('--bp-drag', '0px');
            if (!d.active) return;
            this.suppressClick = true;
            setTimeout(() => { this.suppressClick = false; }, 0);
            if (Math.abs(d.dx) > 50) this.move(d.dx < 0 ? 1 : -1);
        };
        stage.addEventListener('pointerup', end);
        stage.addEventListener('pointercancel', end);
    },

    handleKey(event) {
        if (!this.root) return;
        if (document.querySelector('.swal2-container')) return; // diálogo por cima: as teclas são dele
        const key = event.key;
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            this.move(key === 'ArrowLeft' ? -1 : 1);
        } else if (key === 'Home' || key === 'End') {
            event.preventDefault();
            this.focusIndex(key === 'Home' ? 0 : this.ids.length - 1);
        } else if (key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.close(null);
        } else if (key === 'Enter') {
            // Enter num botão é o clique dele (seta, ponto, Voltar, Jogar); fora deles joga na bacia em foco
            if (event.target.closest?.('button')) return;
            event.preventDefault();
            this.choose(this.ids[this.index]);
        } else if (key === 'Tab') {
            this.trapTab(event);
        }
    },

    /** Tab fica dentro do carrossel (os botões dos cartões do lado não entram na ordem). */
    trapTab(event) {
        const items = [...this.root.querySelectorAll('button:not([tabindex="-1"])')].filter(b => !b.disabled && b.offsetParent !== null);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !this.root.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !this.root.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    },

    move(delta) {
        const n = this.ids.length;
        if (n) this.focusIndex((this.index + delta + n) % n);
    },

    focusIndex(i) {
        if (!this.root || i === this.index || i < 0 || i >= this.ids.length) return;
        const keepFocus = this.root.contains(document.activeElement) && document.activeElement.closest('.bp-card');
        const previous = this.ids[this.index];
        this.capture(previous);
        this.index = i;
        this.layout(false);
        this.attachPreview();
        if (keepFocus) this.focusPick();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click', 0.45);
    },

    /** Posição de cada cartão (deslocamento circular), pontos, botões fora de foco fora do Tab, texto para leitor. */
    layout(initial) {
        const n = this.ids.length;
        const cards = [...this.root.querySelectorAll('.bp-card')];
        cards.forEach((card, i) => {
            const off = this.circularOffset(i, this.index, n);
            const was = Number(card.dataset.off);
            // Passando pela volta (de um lado para o outro), sem animar o caminho por trás dos outros
            card.classList.toggle('no-anim', initial || (Number.isFinite(was) && Math.abs(off - was) > 1));
            card.dataset.off = String(off);
            card.style.setProperty('--bp-off', String(off));
            card.classList.toggle('is-focus', off === 0);
            card.classList.toggle('is-side', Math.abs(off) === 1);
            card.classList.toggle('is-far', Math.abs(off) > 1);
            card.setAttribute('aria-hidden', off === 0 ? 'false' : 'true');
            card.querySelector('.basin-pick').tabIndex = off === 0 ? 0 : -1;
        });
        if (!initial) requestAnimationFrame(() => cards.forEach(card => card.classList.remove('no-anim')));
        this.root.querySelectorAll('.bp-dot').forEach((dot, i) => {
            const on = i === this.index;
            dot.classList.toggle('is-on', on);
            if (on) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
        });
        const id = this.ids[this.index];
        this.root.dataset.focus = id;
        const live = this.root.querySelector('.bp-live');
        if (live && !initial) live.textContent = `${BASIN_MAPS[id].name}, ${this.index + 1} de ${n}. ${BASIN_MAPS[id].description}`;
    },

    focusPick() {
        this.root?.querySelector('.bp-card.is-focus .basin-pick')?.focus({ preventScroll: true });
    },

    // ===================== MAQUETE 3D =====================

    /** Engine da maquete no cartão em foco; fotos de todas as bacias para os outros cartões, uma por quadro. */
    async startPreview() {
        if (typeof BasinPreview === 'undefined' || !BasinPreview.supported()) return;
        const preview = this.preview = new BasinPreview();
        const host = this.root.querySelector('.bp-card.is-focus .bp-view');
        host.appendChild(preview.canvas);
        preview.resize();
        if (!preview.init()) {
            preview.dispose();
            this.preview = null;
            return;
        }
        preview.resize();
        const frame = () => new Promise(r => requestAnimationFrame(() => r()));
        for (const id of this.ids) {
            await frame();
            if (this.preview !== preview) return; // fechou no meio
            try {
                preview.show(id);
                const url = preview.snapshot();
                if (url) this.setShot(id, url);
            } catch (error) {
                logWarn(`⚠️ Maquete da bacia ${id} indisponível:`, error?.message || error);
            }
        }
        if (this.preview !== preview) return;
        this.attachPreview();
        preview.start();
        this.root.classList.add('has-preview');
    },

    setShot(id, url) {
        this.shots[id] = url;
        const img = this.root?.querySelector(`.bp-card[data-basin="${id}"] .bp-shot`);
        if (!img) return;
        img.src = url;
        img.hidden = false;
        img.closest('.bp-view').classList.add('has-shot');
    },

    /** Antes de sair do foco, o cartão guarda a foto do ângulo em que parou (sem pulo na troca). */
    capture(id) {
        const preview = this.preview;
        if (!preview?.running || preview.currentId !== id) return;
        const url = preview.snapshot();
        if (url) this.setShot(id, url);
    },

    attachPreview() {
        const preview = this.preview;
        if (!preview?.engine) return;
        const id = this.ids[this.index];
        const host = this.root.querySelector(`.bp-card[data-basin="${id}"] .bp-view`);
        if (preview.canvas.parentElement !== host) host.appendChild(preview.canvas);
        preview.show(id);
        preview.resize();
    },

    // ===================== FECHAR =====================

    choose(id) {
        if (!this.root || !BASIN_MAPS[id] || this.root.classList.contains('is-closing')) return;
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click', 0.7);
        this.root.classList.add('is-chosen');
        this.close(id);
    },

    /** Fecha (escolha ou volta): descarta a maquete, devolve o foco e o menu, resolve a promessa. */
    close(result) {
        const root = this.root;
        if (!root) return;
        this.root = null;
        document.removeEventListener('keydown', this.onKey, true);
        window.removeEventListener('resize', this.onResize);
        this.preview?.dispose();
        this.preview = null;
        this.inerted.forEach(el => { el.inert = false; });
        this.inerted = [];
        if (result === null && typeof MenuIntro !== 'undefined') MenuIntro.resumeRendering?.();
        root.classList.add('is-closing');
        const remove = () => root.remove();
        if (this.reducedMotion()) remove();
        else setTimeout(remove, 260);
        if (result === null) this.lastFocus?.focus?.({ preventScroll: true });
        this.lastFocus = null;
        const resolve = this.resolve;
        this.resolve = null;
        resolve?.(result);
    }
};

window.BasinPicker = BasinPicker;
