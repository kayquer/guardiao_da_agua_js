/**
 * UIManager — "Ver debaixo da terra" (#aquifer-view, css/aquifer-view.css): um corte do solo em SVG que mostra o
 * aquífero ao vivo. O nível da água = resources.water.aquifer (0-100) sobe e desce com transição suave; cada bomba
 * e poço terminado (config.groundwater) é um canudo descendo até a água (até AQUIFER_VIEW.MAX_STRAWS, depois "+N");
 * chuva, árvores e áreas verdes aparecem quando estão devolvendo água. A ponta dos canudos fica na linha de
 * ResourceManager.AQUIFER_LOW: com a água abaixo dela as bombas rendem menos (getAquiferFactor) e o canudo "seca".
 * Abre pelo botão do bloco do aquífero no painel 💧 (ResourcePanels.renderAquiferBlock); pausa como os outros popups
 * (UIManager.isInfoPopupOpen); updateAquiferView (a cada 1 s pelo update) só troca atributos e textos.
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
const AQUIFER_VIEW = {
    W: 600, H: 330,
    GROUND_Y: 86,      // superfície (céu acima)
    SOIL_BOTTOM: 140,  // terra de cima
    AQ_TOP: 140,       // areia que guarda a água: de AQ_TOP (100%) a AQ_BOTTOM (0%)
    AQ_BOTTOM: 290,    // rocha abaixo
    MAX_STRAWS: 8,
    STRAW_X0: 266, STRAW_X1: 570
};

mixin(UIManager, {
    /** y (unidades do desenho) da água para um nível 0-100. */
    aquiferWaterY(level) {
        const { AQ_TOP, AQ_BOTTOM } = AQUIFER_VIEW;
        const l = Math.max(0, Math.min(100, Number(level) || 0));
        return AQ_BOTTOM - (l / 100) * (AQ_BOTTOM - AQ_TOP);
    },

    /** Tudo o que o desenho e os textos precisam, lido do jogo agora. */
    getAquiferViewState() {
        const gm = this.gameManager;
        const rm = gm.resourceManager;
        const water = rm.resources.water;
        const level = rm.getAquiferLevel();
        const { drain, recharge, trees, net } = rm.getAquiferBalance();
        const realRain = gm.weatherEffects?.profile?.rain || 0;
        const stormEvent = ['heavy_rain', 'flood'].some(t => gm.eventSystem?.hasActiveEventOfType?.(t));
        const pumps = (gm.buildingSystem?.getAllBuildings?.() || [])
            .filter(b => b.config?.groundwater && !b.underConstruction)
            .map(b => ({ id: b.id, type: b.type, well: b.type === 'water_well' }));
        return {
            level, drain, recharge, net, trees,
            natural: ResourceManager.AQUIFER_NATURAL_RECHARGE,
            rain: realRain * ResourceManager.AQUIFER_RAIN_RECHARGE,
            green: Math.max(0, water.aquiferRecharge || 0),
            raining: realRain > 0 || stormEvent,
            stormEvent,
            factor: rm.getAquiferFactor(),
            low: level < ResourceManager.AQUIFER_LOW,
            pumps
        };
    },

    ensureAquiferView() {
        let view = document.getElementById('aquifer-view');
        if (view) return view;
        const { W, H, GROUND_Y, SOIL_BOTTOM, AQ_TOP, AQ_BOTTOM } = AQUIFER_VIEW;
        const lowY = this.aquiferWaterY(ResourceManager.AQUIFER_LOW);
        // Gotas da chuva e setas de infiltração: posições fixas, ligadas/desligadas por classe
        const drops = [40, 62, 84, 106, 128, 150].map((x, i) =>
            `<line class="av-drop" x1="${x}" y1="${44 + (i % 2) * 6}" x2="${x - 4}" y2="${56 + (i % 2) * 6}" style="animation-delay:${(i * 0.13).toFixed(2)}s"/>`).join('');
        const arrow = (x, cls) => `<g class="av-arrow ${cls}"><line x1="${x}" y1="${GROUND_Y + 12}" x2="${x}" y2="${AQ_TOP + 14}"/>` +
            `<path d="M${x - 6} ${AQ_TOP + 8} L${x} ${AQ_TOP + 18} L${x + 6} ${AQ_TOP + 8}"/></g>`;
        const tree = (x, s) => `<g transform="translate(${x} ${GROUND_Y}) scale(${s})">` +
            `<rect class="av-trunk" x="-2.5" y="-18" width="5" height="18" rx="1.5"/>` +
            `<circle class="av-crown" cx="0" cy="-26" r="13"/><circle class="av-crown av-crown--dark" cx="6" cy="-21" r="8"/></g>`;
        view = document.createElement('div');
        view.id = 'aquifer-view';
        view.className = 'aquifer-view';
        view.setAttribute('role', 'dialog');
        view.setAttribute('aria-modal', 'true');
        view.setAttribute('aria-labelledby', 'aquifer-view-title');
        view.hidden = true;
        view.innerHTML = `<div class="av-box">
            <header class="av-head">
                <span class="av-head-icon">${uiIcon('lesson-hidden-water', 'lg', 'av-title-icon')}</span>
                <div class="av-head-text">
                    <span class="gda-label">Aquífero ao vivo</span>
                    <h2 id="aquifer-view-title">Debaixo da terra</h2>
                </div>
                <button type="button" class="av-close" id="aquifer-view-x" aria-label="Fechar">${uiIcon('ui-close')}</button>
            </header>
            <figure class="av-figure">
                <svg id="aquifer-svg" class="av-svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="av-svg-desc">
                    <desc id="av-svg-desc">Corte do solo: terra, areia com água subterrânea e rocha, com as bombas e poços da cidade.</desc>
                    <defs>
                        <linearGradient id="av-sky-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" class="av-sky-top"/><stop offset="1" class="av-sky-bottom"/>
                        </linearGradient>
                        <linearGradient id="av-water-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" class="av-water-top"/><stop offset="1" class="av-water-bottom"/>
                        </linearGradient>
                        <pattern id="av-sand-dots" width="14" height="12" patternUnits="userSpaceOnUse">
                            <circle class="av-grain" cx="3" cy="3" r="1.6"/><circle class="av-grain" cx="10" cy="9" r="1.3"/>
                        </pattern>
                        <pattern id="av-rock-lines" width="40" height="20" patternUnits="userSpaceOnUse">
                            <path class="av-crack" d="M0 14 L12 8 L22 12 M26 4 L34 10 L40 6"/>
                        </pattern>
                        <clipPath id="av-aq-clip"><rect x="0" y="${AQ_TOP}" width="${W}" height="${AQ_BOTTOM - AQ_TOP}"/></clipPath>
                    </defs>
                    <rect class="av-sky" x="0" y="0" width="${W}" height="${GROUND_Y}" fill="url(#av-sky-grad)"/>
                    <g class="av-rain" id="av-rain">
                        <g class="av-cloud"><ellipse cx="96" cy="30" rx="44" ry="15"/><circle cx="74" cy="24" r="14"/><circle cx="104" cy="18" r="17"/><circle cx="126" cy="27" r="12"/></g>
                        ${drops}
                    </g>
                    <rect class="av-soil" x="0" y="${GROUND_Y}" width="${W}" height="${SOIL_BOTTOM - GROUND_Y}"/>
                    <rect class="av-grass" x="0" y="${GROUND_Y - 3}" width="${W}" height="9" rx="3"/>
                    <rect class="av-sand" x="0" y="${AQ_TOP}" width="${W}" height="${AQ_BOTTOM - AQ_TOP}"/>
                    <g clip-path="url(#av-aq-clip)">
                        <g class="av-water" id="av-water">
                            <rect x="0" y="${AQ_TOP}" width="${W}" height="${AQ_BOTTOM - AQ_TOP + 4}" fill="url(#av-water-grad)"/>
                            <path class="av-wave" d="M0 ${AQ_TOP} q 25 -5 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0"/>
                        </g>
                    </g>
                    <rect x="0" y="${AQ_TOP}" width="${W}" height="${AQ_BOTTOM - AQ_TOP}" fill="url(#av-sand-dots)"/>
                    <rect class="av-rock" x="0" y="${AQ_BOTTOM}" width="${W}" height="${H - AQ_BOTTOM}"/>
                    <rect x="0" y="${AQ_BOTTOM}" width="${W}" height="${H - AQ_BOTTOM}" fill="url(#av-rock-lines)"/>
                    <line class="av-low-line" x1="0" y1="${lowY}" x2="${W}" y2="${lowY}"/>
                    <g class="av-layer-names">
                        <text class="av-small" x="10" y="${SOIL_BOTTOM - 8}">Terra</text>
                        <text class="av-small" x="10" y="${AQ_BOTTOM - 24}">Areia com água</text>
                        <text class="av-small" x="10" y="${AQ_BOTTOM - 9}">(aquífero)</text>
                        <text class="av-small av-on-rock" x="10" y="${H - 14}">Rocha</text>
                    </g>
                    ${arrow(36, 'av-arrow--soil is-on')}
                    ${arrow(96, 'av-arrow--rain')}
                    <g class="av-trees" id="av-trees">${tree(150, 1)}${tree(176, 0.8)}${tree(198, 0.95)}</g>
                    ${arrow(176, 'av-arrow--trees')}
                    <g class="av-green" id="av-green">
                        <rect class="av-garden" x="208" y="${GROUND_Y - 7}" width="30" height="9" rx="4"/>
                        <circle class="av-flower" cx="214" cy="${GROUND_Y - 9}" r="3"/><circle class="av-flower" cx="224" cy="${GROUND_Y - 11}" r="3"/><circle class="av-flower" cx="233" cy="${GROUND_Y - 8}" r="3"/>
                    </g>
                    ${arrow(223, 'av-arrow--green')}
                    <g id="av-straws" class="av-straws"></g>
                    <text class="av-small av-low-text" x="${W - 8}" y="${lowY + 15}" text-anchor="end">abaixo da linha, as bombas rendem menos</text>
                    <g class="av-water-label" id="av-water-label">
                        <rect class="av-tag" x="128" y="${AQ_TOP - 22}" width="124" height="20" rx="10"/>
                        <text class="av-tag-text" id="av-tag-text" x="190" y="${AQ_TOP - 8}" text-anchor="middle">água: 100%</text>
                    </g>
                </svg>
                <ul class="av-legend" aria-hidden="true">
                    <li class="av-leg av-leg--rain" id="av-leg-rain">Chuva entrando</li>
                    <li class="av-leg av-leg--trees" id="av-leg-trees">Árvores segurando a chuva</li>
                    <li class="av-leg av-leg--green" id="av-leg-green">Jardins e parques</li>
                    <li class="av-leg av-leg--pump">Bombas e poços</li>
                </ul>
            </figure>
            <div class="av-text">
                <p id="av-level"></p>
                <p id="av-flow"></p>
                <p id="av-tip" class="av-tip"></p>
            </div>
            <div class="av-buttons">
                <button type="button" class="gda-btn gda-btn--primary" id="aquifer-view-close">Fechar</button>
            </div>
        </div>`;
        (document.getElementById('game-screen') || document.body).appendChild(view);
        view.querySelector('#aquifer-view-close').addEventListener('click', () => this.closeAquiferView());
        view.querySelector('#aquifer-view-x').addEventListener('click', () => this.closeAquiferView());
        view.addEventListener('click', event => { if (event.target === view) this.closeAquiferView(); });
        // Esc fecha só o corte (não o painel de água atrás): captura na janela, antes do Esc do painel da direita
        window.addEventListener('keydown', event => {
            if (event.key !== 'Escape' || !this.isAquiferViewOpen()) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.closeAquiferView();
        }, true);
        return view;
    },

    isAquiferViewOpen() {
        const view = document.getElementById('aquifer-view');
        return !!view && !view.hidden;
    },

    openAquiferView() {
        const view = this.ensureAquiferView();
        this.aquiferStrawSig = null;
        view.hidden = false;
        // Primeiro quadro sem transição: a água já aparece no nível certo, depois sobe/desce suave
        view.classList.add('av-instant');
        this.updateAquiferView({ force: true });
        requestAnimationFrame(() => requestAnimationFrame(() => view.classList.remove('av-instant')));
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_aquifer_view'); // descendo para debaixo da terra
        view.querySelector('#aquifer-view-close')?.focus();
    },

    closeAquiferView() {
        const view = document.getElementById('aquifer-view');
        if (!view || view.hidden) return;
        view.hidden = true;
        document.getElementById('btn-aquifer-view')?.focus();
    },

    /** Canudos: refeitos só quando muda a lista de bombas/poços; o resto é atributo. */
    renderAquiferStraws(pumps) {
        const { GROUND_Y, MAX_STRAWS, STRAW_X0, STRAW_X1 } = AQUIFER_VIEW;
        const tipY = this.aquiferWaterY(ResourceManager.AQUIFER_LOW);
        if (!pumps.length) {
            return `<text class="av-small av-none" x="${(STRAW_X0 + STRAW_X1) / 2}" y="${GROUND_Y - 30}" text-anchor="middle">Nenhuma bomba ou poço ainda</text>`;
        }
        const shown = pumps.slice(0, MAX_STRAWS);
        const extra = pumps.length - shown.length;
        const slots = shown.length + (extra > 0 ? 1 : 0);
        const step = slots > 1 ? (STRAW_X1 - STRAW_X0) / (slots - 1) : 0;
        const x0 = slots > 1 ? STRAW_X0 : (STRAW_X0 + STRAW_X1) / 2;
        const straws = shown.map((p, i) => {
            const x = Math.round(x0 + i * step);
            const head = p.well
                ? `<rect class="av-head av-head--well" x="${x - 7}" y="${GROUND_Y - 22}" width="14" height="22" rx="3"/>` +
                  `<rect class="av-head-cap" x="${x - 10}" y="${GROUND_Y - 26}" width="20" height="6" rx="3"/>`
                : `<rect class="av-head av-head--pump" x="${x - 11}" y="${GROUND_Y - 15}" width="22" height="15" rx="3"/>` +
                  `<path class="av-head-cap" d="M${x - 14} ${GROUND_Y - 14} L${x} ${GROUND_Y - 25} L${x + 14} ${GROUND_Y - 14} Z"/>`;
            return `<g class="av-straw" data-building="${p.id}" data-type="${p.type}">
                <line class="av-pipe" x1="${x}" y1="${GROUND_Y}" x2="${x}" y2="${tipY}"/>
                <line class="av-flow" x1="${x}" y1="${tipY - 2}" x2="${x}" y2="${GROUND_Y + 2}"/>
                <rect class="av-tip-cap" x="${x - 5}" y="${tipY - 3}" width="10" height="6" rx="2"/>
                <g class="av-dry-mark"><circle cx="${x + 12}" cy="${tipY - 12}" r="8"/><text x="${x + 12}" y="${tipY - 8}" text-anchor="middle">!</text></g>
                ${head}
            </g>`;
        }).join('');
        const more = extra > 0
            ? `<g class="av-more"><circle cx="${Math.round(x0 + shown.length * step)}" cy="${GROUND_Y - 14}" r="14"/>` +
              `<text x="${Math.round(x0 + shown.length * step)}" y="${GROUND_Y - 9}" text-anchor="middle">+${extra}</text></g>`
            : '';
        return straws + more;
    },

    /** Ao vivo (1×/s pelo update, e ao abrir): nível da água, canudos, ícones de recarga e os 3 textos. */
    updateAquiferView({ force = false } = {}) {
        if (typeof document === 'undefined' || (!force && !this.isAquiferViewOpen())) return;
        const view = document.getElementById('aquifer-view');
        if (!view || !this.gameManager?.resourceManager) return;
        const s = this.getAquiferViewState();
        const { AQ_TOP } = AQUIFER_VIEW;
        // pt-BR: vírgula decimal ("5,6%"), não o ponto do formatNumber
        const fmt = (n, d = 1) => (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { maximumFractionDigits: d });

        // Água: um grupo só, deslocado (transição no CSS); a etiqueta acompanha
        const shift = (this.aquiferWaterY(s.level) - AQ_TOP).toFixed(1);
        const water = view.querySelector('#av-water');
        const label = view.querySelector('#av-water-label');
        if (water) water.style.transform = `translateY(${shift}px)`;
        if (label) label.style.transform = `translateY(${shift}px)`;
        view.querySelector('#aquifer-svg')?.setAttribute('data-level', String(Math.round(s.level)));
        const tag = view.querySelector('#av-tag-text');
        if (tag) this.setText(tag, `água: ${Math.round(s.level)}%`);

        // Canudos
        const sig = s.pumps.map(p => `${p.id}:${p.type}`).join('|');
        const strawsEl = view.querySelector('#av-straws');
        if (strawsEl && (force || sig !== this.aquiferStrawSig)) {
            this.aquiferStrawSig = sig;
            strawsEl.innerHTML = this.renderAquiferStraws(s.pumps);
        }
        view.classList.toggle('av-dry', s.low && s.pumps.length > 0);
        view.classList.toggle('av-pumping', s.pumps.length > 0 && !s.low);

        // O que devolve água agora
        view.classList.toggle('av-raining', s.raining);
        view.classList.toggle('av-has-trees', s.trees >= 0.05);
        view.classList.toggle('av-has-green', s.green >= 0.05);

        // Textos (nível 11 anos)
        const state = s.level >= 50 ? { mark: '✓', word: 'bom', cls: 'good' }
            : s.level >= ResourceManager.AQUIFER_LOW ? { mark: '!', word: 'atenção', cls: 'ok' }
                : { mark: '✕', word: 'baixo', cls: 'bad' };
        const trend = s.net > 0.05 ? 'subindo' : s.net < -0.05 ? 'descendo' : 'parado';
        const levelEl = view.querySelector('#av-level');
        if (levelEl) {
            levelEl.className = `av-level av-level--${state.cls}`;
            levelEl.innerHTML = `<span class="av-pill">${state.mark} ${state.word}</span> Tem água em <b>${Math.round(s.level)}%</b> do aquífero, e ele está <b>${trend}</b>.`;
        }
        const ins = [`solo ${fmt(s.natural)}`];
        if (s.rain >= 0.05) ins.push(`chuva ${fmt(s.rain)}`);
        if (s.trees >= 0.05) ins.push(`árvores ${fmt(s.trees)}`);
        if (s.green >= 0.05) ins.push(`${s.stormEvent ? 'chuva forte e áreas verdes' : 'jardins e parques'} ${fmt(s.green)}`);
        const n = s.pumps.length;
        const who = n === 0 ? 'nenhuma bomba ou poço' : n === 1 ? '1 bomba ou poço' : `${n} bombas e poços`;
        const flowEl = view.querySelector('#av-flow');
        if (flowEl) {
            this.setText(flowEl, `Sai ${fmt(s.drain)}% por minuto (${who}). Entra ${fmt(s.recharge)}% por minuto (${ins.join(' + ')}).`);
        }
        let tip;
        if (s.low && n > 0) {
            tip = `Os canudos não alcançam bem a água: bombas e poços rendem só ${Math.round(s.factor * 100)}%. Plante árvores, faça jardins de chuva e parques e use menos bombas.`;
        } else if (trend === 'descendo') {
            tip = 'Está caindo: as bombas tiram mais do que a chuva e o verde devolvem. Plante árvores, faça jardins de chuva ou pegue água do rio com uma ETA.';
        } else if (trend === 'subindo') {
            tip = 'Está subindo: a chuva e o verde devolvem mais do que as bombas tiram. Continue assim!';
        } else {
            tip = 'Está parado: entra o mesmo tanto que sai.';
        }
        const tipEl = view.querySelector('#av-tip');
        if (tipEl) {
            this.setText(tipEl, tip);
            tipEl.classList.toggle('av-tip--bad', (s.low && n > 0) || trend === 'descendo');
        }
    }
});
