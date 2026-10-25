/**
 * Botões de recurso do HUD que contam como o recurso vai (UIManager partial):
 * - seta de gráfico ao lado do valor: subindo / estável / caindo, verde quando é bom e vermelha quando é ruim;
 * - o ícone e o visual do botão mudam com a faixa (cachoeira → gota → torneira pingando → deserto, etc.);
 * - um som próprio quando o recurso piora de faixa, e um de alívio quando volta a ficar bem.
 * Regras e faixas: js/systems/ResourceTrends.js + js/data/resourceStates.js.
 */
mixin(UIManager, {
    /** Som de alerta de cada recurso (chaves do manifesto). */
    RESOURCE_ALERT_SOUNDS: {
        water: 'sfx_alert_water', pollution: 'sfx_alert_pollution', population: 'sfx_alert_population',
        satisfaction: 'sfx_alert_satisfaction', budget: 'sfx_alert_money', energy: 'sfx_alert_energy'
    },

    RESOURCE_HUD_NAMES: {
        water: 'Água', pollution: 'Poluição', population: 'População', satisfaction: 'Satisfação', budget: 'Orçamento', energy: 'Energia'
    },

    /** Acha os botões e cria as setas (uma vez; refaz se o HUD foi recriado). */
    setupResourceHud() {
        const hud = { trends: new ResourceTrends(), items: {} };
        for (const [id, def] of Object.entries(RESOURCE_STATES.resources)) {
            const targets = [];
            const value = document.querySelector(def.selector);
            const item = value?.closest('.resource-item');
            if (item) targets.push(item);
            const compact = def.compact && document.querySelector(def.compact);
            if (compact) targets.push(compact);
            for (const el of targets) {
                if (!el.querySelector('.res-trend')) {
                    const arrow = document.createElement('span');
                    arrow.className = 'res-trend res-trend--flat';
                    arrow.setAttribute('aria-hidden', 'true');
                    arrow.innerHTML = this.trendArrowSvg('flat');
                    el.appendChild(arrow);
                }
            }
            hud.items[id] = { targets, tier: null, dir: null, good: undefined, lastAlertAt: -Infinity };
        }
        this.resourceHud = hud;
        return hud;
    },

    /** Seta de gráfico (linha quebrada com ponta) que sobe, fica reta ou desce. */
    trendArrowSvg(dir) {
        const shape = {
            up: '<polyline points="1,12 5,8 8,10 14,3"/><polyline points="9.5,3 14,3 14,7.5"/>',
            down: '<polyline points="1,3 5,7 8,5 14,12"/><polyline points="9.5,12 14,12 14,7.5"/>',
            flat: '<polyline points="1,7.5 14,7.5"/><polyline points="10.5,4 14,7.5 10.5,11"/>'
        }[dir];
        return `<svg viewBox="0 0 15 15" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
    },

    resourceIconFor(id, tier) {
        return `assets/icons/svg/res-${id}${tier === 'ok' ? '' : '-' + tier}.svg`;
    },

    /** Chamado a cada atualização do HUD (10×/s); só mexe no DOM quando algo muda. */
    updateResourceHud(resources) {
        const gm = this.gameManager;
        if (!resources || typeof RESOURCE_STATES === 'undefined') return;
        const hud = this.resourceHud && Object.values(this.resourceHud.items).every(i => i.targets.every(t => t.isConnected))
            ? this.resourceHud : this.setupResourceHud();
        const now = Number.isFinite(gm?.gameTime) ? gm.gameTime : 0;
        hud.trends.sample(resources, now);
        const growth = hud.trends.populationGrowth();
        // Alerta só com o jogo correndo de verdade (tutorial congelado, pausa e popups não tocam)
        const canAlert = gm?.gameState === 'playing' && (gm.isSimulationRunning?.() ?? true);

        for (const [id, item] of Object.entries(hud.items)) {
            const tier = ResourceTrends.tierOf(id, resources, growth);
            const { dir, good } = hud.trends.trend(id);
            const previous = item.tier;
            if (tier !== previous) {
                item.tier = tier;
                for (const el of item.targets) {
                    for (const t of ResourceTrends.TIERS) el.classList.toggle(`res-tier-${t}`, t === tier);
                    const img = el.querySelector('.resource-icon img, .compact-icon img');
                    const src = this.resourceIconFor(id, tier);
                    if (img && img.getAttribute('src') !== src) img.setAttribute('src', src);
                }
                if (previous !== null && canAlert) this.alertResourceTier(id, item, previous, tier, now);
            }
            if (dir !== item.dir || good !== item.good) {
                item.dir = dir;
                item.good = good;
                for (const el of item.targets) {
                    const arrow = el.querySelector('.res-trend');
                    if (!arrow) continue;
                    arrow.className = `res-trend res-trend--${dir}${good === null ? '' : good ? ' res-trend--good' : ' res-trend--bad'}`;
                    arrow.innerHTML = this.trendArrowSvg(dir);
                }
            }
            const label = `${this.RESOURCE_HUD_NAMES[id]}: ${RESOURCE_STATES.trendLabels[dir]}, ${RESOURCE_STATES.labels[tier]}`;
            for (const el of item.targets) if (el.title !== label) el.title = label;
        }
    },

    /** Piorou para "piorando"/"crítico" → som do recurso; voltou de lá para normal/muito bem → som de alívio. */
    alertResourceTier(id, item, from, to, now) {
        if (typeof AudioManager === 'undefined') return;
        if (now - item.lastAlertAt < RESOURCE_STATES.alertCooldownMs) return;
        const worse = ResourceTrends.compare(from, to) > 0;
        const bad = t => t === 'low' || t === 'critical';
        let key = null;
        if (worse && bad(to)) key = this.RESOURCE_ALERT_SOUNDS[id];
        else if (!worse && bad(from) && !bad(to)) key = 'sfx_alert_recover';
        if (!key) return;
        item.lastAlertAt = now;
        AudioManager.playSound(key);
    }
});
