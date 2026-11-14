/**
 * Ilustração animada: uma figura de IA (assets/images/tutorial|lessons) vira um SVG inline em camadas.
 * Mesma ideia do AnimatedPortrait: a imagem base + recortes da própria imagem com máscara elíptica esfumada
 * (água, nuvens, copas, sol, bichos…) que se mexem pouco, e desenhos vetoriais por cima que contam a ideia
 * (gotas, setas de fluxo, bolhas, brilho na água). Os dados de cada arquivo ficam em js/data/illustrations.js.
 *
 * Tratamento (tirar a "cara de IA"): na primeira vez que um arquivo aparece, ele é redesenhado num canvas uma
 * única vez (sem JS por quadro), como guache: Kuwahara (manchas lisas no lugar da textura miúda e brilhante de
 * IA, bordas mantidas), faixas de luz, sombras puxadas para a tinta azul-marinho do tema e luzes para o creme do
 * papel, contorno de tinta nas bordas fortes e grão de papel (outros testes: só borrão = foto desfocada;
 * Kuwahara forte/posterização dura = mosaico e faixas de cor erradas). O
 * resultado (blob URL, em cache por arquivo) alimenta a base e todos os recortes, então não há emenda.
 * A moldura (borda branca, cantos e sombra do tema) é CSS (css/illustrations.css).
 *
 * Movimento: só CSS (transform/opacity). Pausa fora da tela (IntersectionObserver → .ail--paused) e some com o
 * painel (o elemento sai do DOM). prefers-reduced-motion: nada se mexe (css/illustrations.css).
 * Arquivo sem entrada no manifesto: a imagem com o tratamento, sem camadas.
 *
 * Uso: AnimatedIllustration.enhance(el)  → troca os <img> de tutorial/aulas dentro de `el`;
 *      AnimatedIllustration.mountBackdrop(el, src) → fundo de tela cheia (cobre, sem barras).
 */
class AnimatedIllustration {
    constructor(src, { alt = '', backdrop = false } = {}) {
        this.src = src;
        this.key = AnimatedIllustration.keyOf(src);
        this.data = (typeof ILLUSTRATIONS !== 'undefined' && ILLUSTRATIONS[this.key]) || null;
        this.uid = `ail${++AnimatedIllustration.count}`;
        this.random = AnimatedIllustration.seeded(this.key || src);

        this.el = document.createElement('figure');
        this.el.className = `ail${backdrop ? ' ail--backdrop' : ''}${this.data ? '' : ' ail--still'}`;
        this.el.dataset.illustration = this.key || src;
        this.el.innerHTML = this.render(alt);
        this.svg = this.el.querySelector('svg');

        AnimatedIllustration.treat(src).then(url => {
            this.svg.querySelectorAll('image').forEach(img => img.setAttribute('href', url));
            this.el.classList.add('ail--ready');
        });
        AnimatedIllustration.watch(this.el);
    }

    // ===== DESENHO =====
    render(alt) {
        const { W, H } = AnimatedIllustration;
        const cuts = (this.data?.cuts || []).map((cut, i) => this.renderCut(cut, i)).join('');
        const fx = (this.data?.fx || []).map(item => this.renderFx(item)).join('');
        const label = alt.replace(/"/g, '&quot;');
        return `<svg class="ail-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">
            <defs>
                <radialGradient id="${this.uid}-glow"><stop offset="0" stop-color="#fff6cf" stop-opacity="0.95"/><stop offset="0.45" stop-color="#ffe9a6" stop-opacity="0.45"/><stop offset="1" stop-color="#ffe9a6" stop-opacity="0"/></radialGradient>
                <radialGradient id="${this.uid}-vignette" r="0.75"><stop offset="0.6" stop-color="#15324e" stop-opacity="0"/><stop offset="1" stop-color="#15324e" stop-opacity="0.28"/></radialGradient>
            </defs>
            <image class="ail-base" width="${W}" height="${H}" preserveAspectRatio="none"/>
            ${cuts}<g class="ail-fx">${fx}</g>
            <rect class="ail-vignette" width="${W}" height="${H}" fill="url(#${this.uid}-vignette)"/>
        </svg>`;
    }

    /** Recorte: a imagem inteira com máscara elíptica esfumada na caixa; o <g> é que se mexe. */
    renderCut(cut, i) {
        const { W, H } = AnimatedIllustration;
        const [x, y, w, h] = cut.box;
        const cx = (x + w / 2) * W, cy = (y + h / 2) * H, rx = (w / 2) * W, ry = (h / 2) * H;
        const id = `${this.uid}-c${i}`;
        const feather = cut.feather ?? 0.55;
        // origem do movimento: base da caixa (sway), topo (hang) ou centro
        const oy = cut.kind === 'sway' ? (y + h) * H : cut.kind === 'hang' ? y * H : cy;
        const vars = [`transform-origin:${ailRound(cx)}px ${ailRound(oy)}px`];
        if (cut.amp != null) vars.push(`--amp:${cut.amp}`);
        if (cut.dur != null) vars.push(`--dur:${cut.dur}s`);
        const mask = `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
            <radialGradient id="${id}-f"><stop offset="${feather}" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
            <ellipse cx="${ailRound(cx)}" cy="${ailRound(cy)}" rx="${ailRound(rx)}" ry="${ailRound(ry)}" fill="url(#${id}-f)"/></mask>`;
        const copies = cut.kind === 'fall' || cut.kind === 'rise' ? 2 : 1; // escorrer/subir: 2 cópias em meia fase
        let out = mask;
        for (let k = 0; k < copies; k++) {
            const half = (cut.dur ?? AnimatedIllustration.FLOW_DUR[cut.kind] ?? 0) / 2;
            const delay = `animation-delay:${ailRound(-(this.random() * 4) - k * half, 2)}s`;
            out += `<g class="ail-cut ail-cut--${cut.kind}" style="${vars.join(';')};${delay}">` +
                `<image width="${W}" height="${H}" preserveAspectRatio="none" mask="url(#${id})"/></g>`;
        }
        return out;
    }

    renderFx(item) {
        const fn = AnimatedIllustration.FX[item.kind];
        return fn ? `<g class="ail-fx-${item.kind}${item.tone ? ` ail-tone-${item.tone}` : ''}">${fn.call(this, item)}</g>` : '';
    }

    /** Ponto aleatório (determinístico por arquivo) dentro da caixa, em unidades do viewBox. */
    pointIn([x, y, w, h]) {
        const { W, H } = AnimatedIllustration;
        return [(x + this.random() * w) * W, (y + this.random() * h) * H];
    }

    /** Partícula que viaja (tx, ty) e some; dur/delay em segundos. */
    particle(inner, x, y, tx, ty, dur, extra = '') {
        const delay = ailRound(-this.random() * dur, 2);
        return `<g transform="translate(${ailRound(x)} ${ailRound(y)})"><g class="ail-p ${extra}" style="--tx:${ailRound(tx)}px;--ty:${ailRound(ty)}px;animation-duration:${ailRound(dur, 2)}s;animation-delay:${delay}s">${inner}</g></g>`;
    }

    // ===== UTILITÁRIOS ESTÁTICOS =====
    /** 'assets/images/lessons/x.webp?v=1' → 'lessons/x.webp' (chave do manifesto). */
    static keyOf(src) {
        const clean = String(src || '').split(/[?#]/)[0];
        const at = clean.indexOf('assets/images/');
        return at === -1 ? '' : clean.slice(at + 'assets/images/'.length);
    }

    static seeded(text) {
        let s = 2166136261;
        for (const ch of String(text)) s = Math.imul(s ^ ch.charCodeAt(0), 16777619);
        return () => {
            s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** Troca cada <img> de tutorial/aulas dentro de `root` pela ilustração animada. Devolve quantas trocou. */
    static enhance(root) {
        if (!root) return 0;
        const imgs = root.querySelectorAll('img[src*="assets/images/tutorial/"], img[src*="assets/images/lessons/"]');
        imgs.forEach(img => {
            const ill = new AnimatedIllustration(img.getAttribute('src'), { alt: img.getAttribute('alt') || '' });
            img.replaceWith(ill.el);
        });
        return imgs.length;
    }

    /** Fundo de tela cheia (tutorial no celular, vitória). Some com `unmount`. */
    static mountBackdrop(container, src) {
        if (!container) return null;
        const current = container.querySelector(':scope > .ail');
        if (current?.dataset.illustration === AnimatedIllustration.keyOf(src)) return current;
        container.style.backgroundImage = '';
        const ill = new AnimatedIllustration(src, { backdrop: true });
        container.replaceChildren(ill.el);
        return ill.el;
    }

    static unmount(container) {
        container?.querySelector(':scope > .ail')?.remove();
    }

    // ===== TRATAMENTO (uma vez por arquivo) =====
    /** Promise do URL tratado (blob); sem canvas ou com erro, o próprio arquivo. */
    static treat(src) {
        const cache = AnimatedIllustration.cache;
        if (!cache.has(src)) {
            cache.set(src, AnimatedIllustration.process(src).catch(() => src));
        }
        return cache.get(src);
    }

    static async process(src) {
        const img = new Image();
        img.src = src;
        await img.decode();
        const t = AnimatedIllustration.TREATMENT;
        const w = Math.min(img.naturalWidth, t.maxWidth);
        const h = Math.round(img.naturalHeight * w / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const image = ctx.getImageData(0, 0, w, h);
        image.data.set(await AnimatedIllustration.runTreatment(image.data, w, h, t));
        ctx.putImageData(image, 0, 0);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (!blob) throw new Error('toBlob');
        return URL.createObjectURL(blob);
    }

    /**
     * Roda o tratamento num Worker (≈ 0,2-0,4 s por figura: fora da thread principal, a página não trava).
     * O Worker é montado com o código destas mesmas funções; sem Worker, roda aqui mesmo.
     */
    static runTreatment(data, w, h, t) {
        const self = AnimatedIllustration;
        if (self.worker === undefined) {
            try {
                const code = `const ailClamp = ${ailClamp};
                    const AnimatedIllustration = { ${self.applyTreatment}, ${self.kuwahara}, ${self.boxBlend}, ${self.seeded} };
                    onmessage = e => {
                        const { id, buf, w, h, t } = e.data;
                        const px = new Uint8ClampedArray(buf);
                        AnimatedIllustration.applyTreatment(px, w, h, t);
                        postMessage({ id, buf }, [buf]);
                    };`;
                self.worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
                self.jobs = new Map();
                self.worker.onmessage = e => {
                    self.jobs.get(e.data.id)?.(new Uint8ClampedArray(e.data.buf));
                    self.jobs.delete(e.data.id);
                };
            } catch {
                self.worker = null;
            }
        }
        if (!self.worker) {
            self.applyTreatment(data, w, h, t);
            return Promise.resolve(data);
        }
        const id = ++self.jobCount;
        const buf = data.slice().buffer;
        return new Promise(resolve => {
            self.jobs.set(id, resolve);
            self.worker.postMessage({ id, buf, w, h, t }, [buf]);
        });
    }

    /**
     * Pixels RGBA no lugar: pintura (Kuwahara: cada pixel vira a média do quadrante mais liso em volta, o que
     * apaga a textura miúda de IA e mantém as bordas), faixas de luz (achata a luminância sem mudar a cor),
     * saturação menor, sombras → tinta azul-marinho e luzes → creme de papel, contorno de tinta onde a luz
     * muda forte (Sobel) e grão de papel. Puro (testável sem DOM).
     */
    static applyTreatment(px, w, h, t) {
        if (t.kuwahara > 0) AnimatedIllustration.kuwahara(px, w, h, t.kuwahara);
        if (t.smooth > 0) AnimatedIllustration.boxBlend(px, w, h, t.smooth);
        const n = w * h;
        const lum = new Float32Array(n);
        for (let i = 0, p = 0; i < n; i++, p += 4) lum[i] = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
        const step = 255 / (t.levels - 1);
        const [dr, dg, db] = t.dark, [lr, lg, lb] = t.light, ink = t.inkColor;
        const rand = AnimatedIllustration.seeded('papel');
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x, p = i * 4;
                const L = lum[i];
                // faixas de luz: a cor anda junto com a luminância "arredondada" (sem desvio de matiz)
                const Lq = Math.round(L / step) * step;
                const k = L > 1 ? 1 + ((Lq / L) - 1) * t.posterize : 1;
                const Lk = L * k;
                let rr = Lk + (px[p] * k - Lk) * t.saturation;
                let gg = Lk + (px[p + 1] * k - Lk) * t.saturation;
                let bb = Lk + (px[p + 2] * k - Lk) * t.saturation;
                // preto vira tinta azul-marinho, branco vira creme de papel
                rr = dr + ailClamp(rr) * (lr - dr) / 255;
                gg = dg + ailClamp(gg) * (lg - dg) / 255;
                bb = db + ailClamp(bb) * (lb - db) / 255;
                if (t.ink > 0 && x > 0 && y > 0 && x < w - 1 && y < h - 1) {
                    const a = lum[i - w - 1], b = lum[i - w], c = lum[i - w + 1];
                    const d = lum[i - 1], f = lum[i + 1];
                    const g = lum[i + w - 1], hh = lum[i + w], kk = lum[i + w + 1];
                    const gx = (c + 2 * f + kk) - (a + 2 * d + g);
                    const gy = (g + 2 * hh + kk) - (a + 2 * b + c);
                    const mag = Math.sqrt(gx * gx + gy * gy);
                    const alpha = Math.min(1, Math.max(0, (mag - t.inkFrom) / (t.inkTo - t.inkFrom))) * t.ink;
                    rr += (ink[0] - rr) * alpha;
                    gg += (ink[1] - gg) * alpha;
                    bb += (ink[2] - bb) * alpha;
                }
                const grain = (rand() - 0.5) * t.grain;
                px[p] = ailClamp(rr + grain);
                px[p + 1] = ailClamp(gg + grain);
                px[p + 2] = ailClamp(bb + grain);
            }
        }
    }

    /** Mistura um borrão 3 × 3 (amacia os degraus quadrados do Kuwahara). */
    static boxBlend(px, w, h, amount) {
        const src = px.slice();
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const p = (y * w + x) * 4;
                for (let c = 0; c < 3; c++) {
                    let acc = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        const row = p + dy * w * 4 + c;
                        acc += src[row - 4] + src[row] + src[row + 4];
                    }
                    px[p + c] = src[p + c] + (acc / 9 - src[p + c]) * amount;
                }
            }
        }
    }

    /** Filtro de Kuwahara com tabelas de soma (custo fixo por pixel, qualquer raio). */
    static kuwahara(px, w, h, R) {
        const W1 = w + 1, size = W1 * (h + 1);
        const sr = new Uint32Array(size), sg = new Uint32Array(size), sb = new Uint32Array(size);
        const sl = new Uint32Array(size), sq = new Float64Array(size);
        for (let y = 0; y < h; y++) {
            let ar = 0, ag = 0, ab = 0, al = 0, aq = 0;
            for (let x = 0; x < w; x++) {
                const p = (y * w + x) * 4;
                const l = (77 * px[p] + 150 * px[p + 1] + 29 * px[p + 2]) >> 8;
                ar += px[p]; ag += px[p + 1]; ab += px[p + 2]; al += l; aq += l * l;
                const o = (y + 1) * W1 + x + 1, u = y * W1 + x + 1;
                sr[o] = sr[u] + ar; sg[o] = sg[u] + ag; sb[o] = sb[u] + ab; sl[o] = sl[u] + al; sq[o] = sq[u] + aq;
            }
        }
        const sum = (S, x0, y0, x1, y1) => S[y1 * W1 + x1] - S[y0 * W1 + x1] - S[y1 * W1 + x0] + S[y0 * W1 + x0];
        const out = new Uint8ClampedArray(px.length);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let best = Infinity, bx0 = 0, by0 = 0, bx1 = 0, by1 = 0;
                for (let q = 0; q < 4; q++) {
                    const x0 = q & 1 ? x : Math.max(0, x - R), x1 = q & 1 ? Math.min(w, x + R + 1) : x + 1;
                    const y0 = q & 2 ? y : Math.max(0, y - R), y1 = q & 2 ? Math.min(h, y + R + 1) : y + 1;
                    const cnt = (x1 - x0) * (y1 - y0);
                    const m = sum(sl, x0, y0, x1, y1) / cnt;
                    const v = sum(sq, x0, y0, x1, y1) / cnt - m * m;
                    if (v < best) { best = v; bx0 = x0; by0 = y0; bx1 = x1; by1 = y1; }
                }
                const cnt = (bx1 - bx0) * (by1 - by0), p = (y * w + x) * 4;
                out[p] = sum(sr, bx0, by0, bx1, by1) / cnt;
                out[p + 1] = sum(sg, bx0, by0, bx1, by1) / cnt;
                out[p + 2] = sum(sb, bx0, by0, bx1, by1) / cnt;
                out[p + 3] = px[p + 3];
            }
        }
        px.set(out);
    }

    // ===== PAUSA FORA DA TELA =====
    static watch(el) {
        if (typeof IntersectionObserver === 'undefined') return;
        const self = AnimatedIllustration;
        self.observer ||= new IntersectionObserver(entries => {
            for (const entry of entries) entry.target.classList.toggle('ail--paused', !entry.isIntersecting);
        });
        // quem saiu do DOM (página virada, painel fechado) deixa de ser observado
        for (const old of self.watched) {
            if (!old.isConnected) { self.observer.unobserve(old); self.watched.delete(old); }
        }
        el.classList.add('ail--paused'); // começa parado até o observer dizer que está na tela
        self.observer.observe(el);
        self.watched.add(el);
    }
}

function ailRound(n, digits = 1) {
    const f = 10 ** digits;
    return Math.round(n * f) / f;
}

function ailClamp(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
}

AnimatedIllustration.W = 1600;
AnimatedIllustration.H = 900;
AnimatedIllustration.count = 0;
AnimatedIllustration.cache = new Map();
AnimatedIllustration.watched = new Set();
AnimatedIllustration.observer = null;
AnimatedIllustration.worker = undefined; // criado na primeira figura (null = sem Worker)
AnimatedIllustration.jobCount = 0;
/** Duração (s) dos recortes que escorrem/sobem (a 2ª cópia anda meia volta atrás); igual ao CSS. */
AnimatedIllustration.FLOW_DUR = { fall: 2.2, rise: 3 };

/** O tratamento escolhido (ver o cabeçalho). Cores: as de --gda-ink e do creme das ilustrações. */
AnimatedIllustration.TREATMENT = {
    maxWidth: 960,
    kuwahara: 2, smooth: 0.5,          // pintura: manchas lisas no lugar da textura miúda
    levels: 7, posterize: 0.35,        // faixas de luz, só meia força
    saturation: 0.94,
    dark: [14, 30, 50], light: [252, 247, 234],
    ink: 0.45, inkColor: [21, 50, 78], inkFrom: 60, inkTo: 200,
    grain: 6
};

/**
 * Desenhos vetoriais por cima (coordenadas do manifesto em fração 0-1). Cada um devolve SVG; o movimento é CSS.
 * Funções chamadas com `this` = a ilustração (random determinístico, particle, pointIn).
 */
AnimatedIllustration.FX = {
    /** Brilhos correndo na água. */
    glints(item) {
        let out = '';
        for (let i = 0; i < (item.count || 6); i++) {
            const [x, y] = this.pointIn(item.box);
            const len = 22 + this.random() * 30;
            out += `<line class="ail-glint" x1="${ailRound(x)}" y1="${ailRound(y)}" x2="${ailRound(x + len)}" y2="${ailRound(y)}" style="animation-delay:${ailRound(-this.random() * 5, 2)}s;animation-duration:${ailRound(3.5 + this.random() * 2.5, 2)}s"/>`;
        }
        return out;
    },

    /** Chuva caindo inclinada na caixa. */
    rain(item) {
        const { H } = AnimatedIllustration;
        const fall = item.box[3] * H;
        let out = '';
        for (let i = 0; i < (item.count || 14); i++) {
            const [x] = this.pointIn(item.box);
            const y = item.box[1] * H;
            const len = 26 + this.random() * 18;
            out += this.particle(`<line class="ail-drop-line" x1="0" y1="0" x2="${ailRound(-len * 0.18)}" y2="${ailRound(len)}"/>`,
                x, y - len, -fall * 0.18, fall, 0.9 + this.random() * 0.5);
        }
        return out;
    },

    /** Gotas que caem de `from` até `to` e fazem uma onda no fim. */
    drops(item) {
        const { W, H } = AnimatedIllustration;
        const [fx, fy] = item.from, [tx, ty] = item.to;
        const dur = item.dur || 1.6;
        let out = '';
        for (let i = 0; i < (item.count || 2); i++) {
            const delay = ailRound(-(i * dur) / (item.count || 2), 2);
            out += `<g transform="translate(${ailRound(fx * W)} ${ailRound(fy * H)})"><path class="ail-p ail-drop" d="M0,-15 C6,-5 10,1 10,6 A10,10 0 0 1 -10,6 C-10,1 -6,-5 0,-15Z" style="--tx:${ailRound((tx - fx) * W)}px;--ty:${ailRound((ty - fy) * H)}px;animation-duration:${dur}s;animation-delay:${delay}s"/></g>`;
            out += `<ellipse class="ail-ripple" cx="${ailRound(tx * W)}" cy="${ailRound(ty * H + 4)}" rx="30" ry="10" style="animation-duration:${dur}s;animation-delay:${delay}s"/>`;
        }
        return out;
    },

    /** Bolhas subindo (oxigênio, ar). */
    bubbles(item) {
        const { H } = AnimatedIllustration;
        let out = '';
        for (let i = 0; i < (item.count || 8); i++) {
            const [x, y] = this.pointIn([item.box[0], item.box[1] + item.box[3] * 0.6, item.box[2], item.box[3] * 0.4]);
            const rad = 5 + this.random() * 8;
            out += this.particle(`<circle class="ail-bubble" r="${ailRound(rad)}"/>`, x, y, (this.random() - 0.5) * 20,
                -item.box[3] * H * (0.5 + this.random() * 0.4), 2.6 + this.random() * 2);
        }
        return out;
    },

    /** Partículas andando numa direção: dir = [dx, dy] em fração (terra escorrendo, sujeira afundando, água subindo no cano). */
    stream(item) {
        const { W, H } = AnimatedIllustration;
        const [dx, dy] = item.dir;
        let out = '';
        for (let i = 0; i < (item.count || 10); i++) {
            const [x, y] = this.pointIn(item.box);
            const rad = (item.size || 5) * 1.4 * (0.6 + this.random() * 0.7);
            out += this.particle(`<circle class="ail-dot ail-dot--${item.tone || 'water'}" r="${ailRound(rad)}"/>`, x, y,
                dx * W, dy * H, (item.dur || 3) * (0.8 + this.random() * 0.4));
        }
        return out;
    },

    /** Setas (chevrons) ao longo de um caminho; acendem em onda, do começo para o fim. */
    flow(item) {
        const { W, H } = AnimatedIllustration;
        const pts = item.points.map(([x, y]) => [x * W, y * H]);
        const spacing = item.spacing || 70;
        const marks = [];
        for (let s = 0; s < pts.length - 1; s++) {
            const [ax, ay] = pts[s], [bx, by] = pts[s + 1];
            const len = Math.hypot(bx - ax, by - ay);
            const angle = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
            for (let d = spacing / 2; d < len; d += spacing) {
                marks.push([ax + (bx - ax) * d / len, ay + (by - ay) * d / len, angle]);
            }
        }
        const wave = item.dur || 2.4;
        return marks.map(([x, y, a], i) =>
            `<g transform="translate(${ailRound(x)} ${ailRound(y)}) rotate(${ailRound(a)})"><g class="ail-chev" style="animation-duration:${wave}s;animation-delay:${ailRound((i / marks.length) * wave - wave, 2)}s">` +
            '<path class="ail-chev-back" d="M-13,-17 L8,0 L-13,17"/><path class="ail-chev-line" d="M-13,-17 L8,0 L-13,17"/></g></g>').join('');
    },

    /** Raios girando devagar e um brilho que pulsa (sol, luz). */
    rays(item) {
        const { W, H } = AnimatedIllustration;
        const [x, y] = [item.at[0] * W, item.at[1] * H];
        const rad = (item.r || 0.08) * W;
        let lines = '';
        const n = item.count || 12;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const r1 = rad * 0.62, r2 = rad * (i % 2 ? 0.9 : 1.05);
            lines += `<line x1="${ailRound(x + Math.cos(a) * r1)}" y1="${ailRound(y + Math.sin(a) * r1)}" x2="${ailRound(x + Math.cos(a) * r2)}" y2="${ailRound(y + Math.sin(a) * r2)}"/>`;
        }
        return `<circle class="ail-glow" cx="${ailRound(x)}" cy="${ailRound(y)}" r="${ailRound(rad * 1.1)}" fill="url(#${this.uid}-glow)" style="transform-origin:${ailRound(x)}px ${ailRound(y)}px"/>` +
            `<g class="ail-rays" style="transform-origin:${ailRound(x)}px ${ailRound(y)}px">${lines}</g>`;
    },

    /** Brilho que pulsa (reflexo do sol na água, luz). */
    glow(item) {
        const { W, H } = AnimatedIllustration;
        const [x, y] = [item.at[0] * W, item.at[1] * H];
        const rad = (item.r || 0.06) * W;
        return `<ellipse class="ail-glow" cx="${ailRound(x)}" cy="${ailRound(y)}" rx="${ailRound(rad)}" ry="${ailRound(rad * (item.squash || 1))}" fill="url(#${this.uid}-glow)" style="transform-origin:${ailRound(x)}px ${ailRound(y)}px"/>`;
    },

    /** Fumaça/vapor subindo de um ponto. tone: 'smoke' (cinza) ou 'steam' (branco). */
    smoke(item) {
        const { W, H } = AnimatedIllustration;
        const [x, y] = [item.at[0] * W, item.at[1] * H];
        const rise = (item.rise || 0.15) * H;
        let out = '';
        for (let i = 0; i < (item.count || 4); i++) {
            out += this.particle(`<circle class="ail-puff ail-puff--${item.tone || 'smoke'}" r="${ailRound(10 + this.random() * 10)}"/>`,
                x + (this.random() - 0.5) * 16, y, (item.drift || 0.02) * W * (0.6 + this.random() * 0.8), -rise, 3.5 + this.random() * 2, 'ail-p--puff');
        }
        return out;
    },

    /** Pássaros planando pela caixa, batendo as asas. */
    birds(item) {
        const { W } = AnimatedIllustration;
        let out = '';
        for (let i = 0; i < (item.count || 2); i++) {
            const [x, y] = this.pointIn([item.box[0], item.box[1], item.box[2] * 0.3, item.box[3]]);
            const s = 1 + this.random() * 0.6, k = v => ailRound(v * s);
            out += this.particle(`<path class="ail-bird" d="M${k(-14)},0 Q${k(-7)},${k(-8)} 0,0 Q${k(7)},${k(-8)} ${k(14)},0"/>`,
                x, y, item.box[2] * W * (0.7 + this.random() * 0.3), (this.random() - 0.5) * 30, 12 + this.random() * 6, 'ail-p--glide');
        }
        return out;
    },

    /** Ondas que se abrem na água (peixe, gota, chuva). */
    ripples(item) {
        const { W, H } = AnimatedIllustration;
        return item.points.map(([x, y]) =>
            `<ellipse class="ail-ripple" cx="${ailRound(x * W)}" cy="${ailRound(y * H)}" rx="${item.rx || 34}" ry="${ailRound((item.rx || 34) / 3)}" style="animation-duration:${ailRound(2.2 + this.random(), 2)}s;animation-delay:${ailRound(-this.random() * 3, 2)}s"/>`).join('');
    },

    /** Estrelinhas que piscam (algo bom, limpo, novo). */
    sparkles(item) {
        let out = '';
        for (let i = 0; i < (item.count || 4); i++) {
            const [x, y] = this.pointIn(item.box);
            const s = 1.1 + this.random() * 0.8;
            out += `<g transform="translate(${ailRound(x)} ${ailRound(y)}) scale(${ailRound(s, 2)})"><path class="ail-sparkle" d="M0,-14 L3,-3 L14,0 L3,3 L0,14 L-3,3 L-14,0 L-3,-3Z" style="animation-delay:${ailRound(-this.random() * 3, 2)}s"/></g>`;
        }
        return out;
    }
};

window.AnimatedIllustration = AnimatedIllustration;
