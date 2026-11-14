/**
 * Prefeitura (UIManager partial, css/city-hall.css) — interface do Financeiro e dos Funcionários. As regras ficam em
 * js/systems/CityFinance.js (impostos) e js/systems/CityStaff.js (equipe); aqui só se mostra e se chama.
 *
 * - Painel da Prefeitura selecionada: botões "Financeiro" e "Funcionários" (getCityHallActionsHtml, chamado por
 *   UIManager.generateBuildingActions).
 * - #city-finance: os 3 impostos (moradores/IPTU, comércio e serviços/ISS, indústrias) em botões segmentados
 *   (role="radiogroup", setas mostram a prévia, Enter/clique escolhe com confirmação), receita de hoje do grupo,
 *   prévia do que muda (CityFinance.preview sobre ResourceManager.getTaxBaseByGroup) e a espera entre mudanças.
 * - #city-staff: abas Equipe (cartões com retrato, nível, barra até o próximo, bônus, Conversar/Demitir) e Contratar.
 * - #staff-hire-card: cartão de parabéns (estilo do cartão de missão) com a pessoa se apresentando.
 * - #staff-talk: conversa — o dia, o trabalho (número ao vivo do cargo) e uma dica (js/systems/StaffTalk.js +
 *   js/data/staffTalk.js), com leitura em voz alta e "Outra conversa".
 * - onStaffEvents (GameManager.update): nível novo → aviso com "Ver".
 * Os quatro estão em isInfoPopupOpen (pausa leve) e isReadingOverlayOpen (alertas esperam). Esc fecha o de cima.
 * Retrato: AnimatedPortrait quando `person.portrait` está no PORTRAIT_MANIFEST; senão, avatar SVG com as iniciais.
 */
const CITY_HALL_POPUPS = ['staff-hire-card', 'staff-talk', 'city-staff', 'city-finance']; // de cima para baixo

// Uma frase sobre cada imposto, para quem tem 11 anos
const CITY_TAX_EXPLAIN = {
    residents: 'Cada casa paga um pouco por ano para a prefeitura cuidar das ruas, da água e das escolas.',
    commerce: 'ISS é o que lojas, restaurantes e serviços pagam sobre o que vendem e fazem.',
    industry: 'As fábricas pagam sobre o que produzem. Imposto alto pode afastar fábrica nova.'
};

// Bônus de cada funcionário em texto (CityStaff.personBonus por chave de STAFF_ROLES[cargo].bonus)
const STAFF_BONUS_TEXT = {
    slots: v => `+${v} obra ao mesmo tempo`,
    buildTime: v => `obras ${Math.round(v * 100)}% mais rápidas`,
    failure: v => `${Math.round(v * 100)}% menos falha de equipamento`,
    repairPerMin: v => `conserta ${Math.round(v * 100)}% do estrago por minuto`,
    satisfaction: v => `+${v} de satisfação`,
    taxComplaint: v => `${Math.round(v * 100)}% menos reclamação de imposto alto`,
    pollution: v => `prédios poluem ${Math.round(v * 100)}% menos`,
    buildCost: v => `obras ${Math.round(v * 100)}% mais baratas`,
    maintenance: v => `manutenção ${Math.round(v * 100)}% mais barata`,
    green: v => `verde limpa ${Math.round(v * 100)}% mais e mudas crescem mais rápido`,
    ecology: () => 'bichos raros chegam antes',
    tolerance: v => `bichos aguentam +${v} de poluição`,
    climate: v => `seca e enchente ${Math.round(v * 100)}% mais fracas`,
    warning: v => `aviso de crise ${Math.round(v * 100)}% mais cedo`
};

mixin(UIManager, {
    // ===== Painel da Prefeitura =====

    getCityHallActionsHtml(building) {
        if (building?.type !== 'city_hall' || building.underConstruction || !this.gameManager?.cityFinance) return '';
        return `
            <div class="city-hall-actions">
                <button type="button" class="action-btn city-hall-btn" id="btn-city-finance"
                    onclick="window.gameManager.uiManager.openCityFinance()">${uiIcon('res-budget')} Financeiro</button>
                <button type="button" class="action-btn city-hall-btn" id="btn-city-staff"
                    onclick="window.gameManager.uiManager.openCityStaff()">${uiIcon('res-population')} Funcionários</button>
            </div>`;
    },

    // ===== Base comum dos popups =====

    formatMoney(value) {
        const v = Math.round(Number(value) || 0);
        return `${v < 0 ? '−' : ''}R$ ${Math.abs(v).toLocaleString('pt-BR')}`;
    },

    isCityHallPopupOpen(id) {
        const el = document.getElementById(id);
        return !!el && !el.hidden;
    },

    /** Overlay de diálogo (criado uma vez, escondido com hidden). */
    createCityHallOverlay(id, { kicker, title, className = '' }) {
        let el = document.getElementById(id);
        if (el) return el;
        el = document.createElement('div');
        el.id = id;
        el.className = `ch-overlay ${className}`;
        el.hidden = true;
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'true');
        el.setAttribute('aria-labelledby', `${id}-title`);
        el.innerHTML = `
            <div class="ch-card">
                <header class="ch-head">
                    <div class="ch-head-text">
                        <div class="gda-label ch-kicker">${kicker}</div>
                        <h2 id="${id}-title" class="ch-title">${title}</h2>
                    </div>
                    <button type="button" class="ch-close" aria-label="Fechar">${uiIcon('ui-close')}</button>
                </header>
                <div class="ch-body"></div>
                <footer class="ch-foot"></footer>
            </div>`;
        el.querySelector('.ch-close').addEventListener('click', () => this.closeCityHallPopup(id));
        el.addEventListener('mousedown', event => { if (event.target === el) this.closeCityHallPopup(id); });
        (document.getElementById('game-screen') || document.body).appendChild(el);
        this.setupCityHallKeys();
        return el;
    },

    /** Esc fecha o popup de cima (em captura: antes do Esc que fecharia o painel da direita). */
    setupCityHallKeys() {
        if (this.cityHallKeys) return;
        this.cityHallKeys = event => {
            if (event.key !== 'Escape' || document.querySelector('.swal2-container:not(.swal2-backdrop-hide)')) return;
            const top = CITY_HALL_POPUPS.find(id => this.isCityHallPopupOpen(id));
            if (!top) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.closeCityHallPopup(top);
        };
        window.addEventListener('keydown', this.cityHallKeys, true);
    },

    /** body.city-hall-open: no celular, esconde os botões flutuantes (eles ficam por cima da tela cheia). */
    syncCityHallOpen() {
        const open = CITY_HALL_POPUPS.some(id => this.isCityHallPopupOpen(id));
        if (document.body.classList.contains('city-hall-open') !== open) document.body.classList.toggle('city-hall-open', open);
    },

    showCityHallPopup(el, focusSelector) {
        if (el.hidden) this.cityHallReturnFocus = document.activeElement;
        el.hidden = false;
        this.syncCityHallOpen();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_open');
        requestAnimationFrame(() => (el.querySelector(focusSelector) || el.querySelector('.ch-close'))?.focus());
    },

    closeCityHallPopup(id) {
        if (id === 'staff-hire-card') return this.closeStaffHireCard();
        if (id === 'staff-talk') return this.closeStaffTalk();
        const el = document.getElementById(id);
        if (!el || el.hidden) return;
        el.hidden = true;
        if (id === 'city-finance') {
            clearInterval(this.cityFinanceTimer);
            this.cityFinanceTimer = null;
        }
        if (id === 'city-staff') this.destroyStaffPortraits('team');
        this.syncCityHallOpen();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_close');
        const back = this.cityHallReturnFocus;
        if (back?.isConnected && !CITY_HALL_POPUPS.some(p => this.isCityHallPopupOpen(p))) back.focus?.();
    },

    // ===== FINANCEIRO =====

    openCityFinance() {
        const finance = this.gameManager?.cityFinance;
        if (!finance) return;
        const el = this.createCityHallOverlay('city-finance', { kicker: 'Prefeitura', title: 'Financeiro', className: 'city-finance' });
        this.renderCityFinance(el);
        this.showCityHallPopup(el, '.ch-seg-btn[tabindex="0"]:not([disabled])');
        clearInterval(this.cityFinanceTimer);
        this.cityFinanceTimer = setInterval(() => {
            if (this.isCityHallPopupOpen('city-finance')) this.refreshCityFinance();
        }, 1000);
    },

    renderCityFinance(el = document.getElementById('city-finance')) {
        if (!el) return;
        const sections = CityFinance.GROUPS.map(group => {
            const g = TAX_GROUPS[group];
            const buttons = TAX_LEVELS.map(level => `
                <button type="button" role="radio" class="ch-seg-btn" data-group="${group}" data-level="${level.id}"
                    aria-checked="false" tabindex="-1">${level.label}</button>`).join('');
            return `
                <section class="ch-tax" data-group="${group}" aria-labelledby="cf-${group}-title">
                    <div class="ch-tax-head">
                        <span class="ch-tax-icon" aria-hidden="true">${uiIcon(g.icon, 'lg')}</span>
                        <div class="ch-tax-text">
                            <h3 id="cf-${group}-title">${g.label} <span class="ch-tag">${g.short}</span></h3>
                            <p class="ch-tax-what">${g.what} ${CITY_TAX_EXPLAIN[group] || ''}</p>
                        </div>
                        <div class="ch-tax-rev">
                            <span class="gda-label">Rende hoje</span>
                            <b id="cf-${group}-rev">R$ 0/min</b>
                        </div>
                    </div>
                    <div class="ch-seg" role="radiogroup" aria-labelledby="cf-${group}-title" data-group="${group}">${buttons}</div>
                    <p class="ch-preview" id="cf-${group}-preview" aria-live="polite"></p>
                    <p class="ch-wait" id="cf-${group}-wait" hidden></p>
                </section>`;
        }).join('');
        el.querySelector('.ch-body').innerHTML = `
            <p class="ch-intro">Imposto é o dinheiro que moradores e empresas pagam para a cidade funcionar: obras,
                manutenção e equipe. Mais imposto traz mais dinheiro, mas deixa as pessoas e as empresas menos contentes.</p>
            <dl class="ch-summary" id="cf-summary"></dl>
            ${sections}`;
        el.querySelector('.ch-foot').innerHTML = `
            <p class="ch-foot-note">Use as setas para ver o que muda; Enter escolhe.</p>
            <button type="button" class="gda-btn gda-btn--primary ch-done">Fechar</button>`;
        el.querySelector('.ch-done').addEventListener('click', () => this.closeCityHallPopup('city-finance'));

        el.querySelectorAll('.ch-seg').forEach(seg => {
            seg.addEventListener('keydown', event => this.onTaxSegmentKey(event, seg));
            seg.addEventListener('focusout', event => {
                if (!seg.contains(event.relatedTarget)) this.showTaxPreview(seg.dataset.group, null);
            });
            seg.addEventListener('mouseleave', () => {
                if (!seg.contains(document.activeElement)) this.showTaxPreview(seg.dataset.group, null);
            });
        });
        el.querySelectorAll('.ch-seg-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => this.showTaxPreview(btn.dataset.group, btn.dataset.level));
            btn.addEventListener('focus', () => this.showTaxPreview(btn.dataset.group, btn.dataset.level));
            btn.addEventListener('click', () => this.chooseTaxLevel(btn.dataset.group, btn.dataset.level));
        });
        this.refreshCityFinance();
        CityFinance.GROUPS.forEach(group => this.showTaxPreview(group, null));
    },

    /** Números que mudam (1 vez por segundo enquanto aberto): receita, resumo, nível marcado e espera. */
    refreshCityFinance() {
        const el = document.getElementById('city-finance');
        const gm = this.gameManager, finance = gm?.cityFinance, rm = gm?.resourceManager;
        if (!el || !finance || !rm) return;
        const base = rm.getTaxBaseByGroup?.() || {};
        const now = gm.gameTime || 0;
        for (const group of CityFinance.GROUPS) {
            const rev = el.querySelector(`#cf-${group}-rev`);
            if (rev) rev.textContent = `${this.formatMoney(base[group])}/min`;
            const gate = finance.canChange(group, now);
            const current = finance.levels[group];
            const seg = el.querySelector(`.ch-seg[data-group="${group}"]`);
            const focused = seg?.contains(document.activeElement);
            seg?.querySelectorAll('.ch-seg-btn').forEach(btn => {
                const on = btn.dataset.level === current;
                btn.setAttribute('aria-checked', on ? 'true' : 'false');
                btn.classList.toggle('is-on', on);
                btn.disabled = !gate.ok && !on;
                if (!focused) btn.tabIndex = on ? 0 : -1;
            });
            const wait = el.querySelector(`#cf-${group}-wait`);
            if (wait) {
                wait.hidden = gate.ok;
                wait.innerHTML = gate.ok ? '' : `${uiIcon('ui-pause')} Mude de novo daqui a ~${Math.ceil(gate.waitMs / 1000)} s de jogo.`;
            }
        }
        const budget = rm.resources?.budget || {};
        const staff = rm.getStaffBalance?.() || { payroll: 0, savings: 0 };
        const income = budget.income || 0, expenses = budget.expenses || 0;
        const net = income - expenses - staff.payroll + staff.savings;
        const summary = el.querySelector('#cf-summary');
        if (summary) {
            summary.innerHTML = `
                <div><dt>Entra</dt><dd>${this.formatMoney(income)}/min</dd></div>
                <div><dt>Despesas</dt><dd>${this.formatMoney(expenses)}/min</dd></div>
                <div><dt>Funcionários</dt><dd>${this.formatMoney(staff.payroll - staff.savings)}/min</dd></div>
                <div class="${net >= 0 ? 'ch-pos' : 'ch-neg'}"><dt>Saldo</dt><dd>${net >= 0 ? '▲' : '▼'} ${this.formatMoney(net)}/min</dd></div>`;
        }
    },

    /** Partes da prévia [{ text, good }] de trocar o imposto do grupo para levelId. */
    getTaxPreviewParts(group, levelId) {
        const gm = this.gameManager, finance = gm.cityFinance;
        const p = finance.preview(group, levelId, gm.resourceManager?.getTaxBaseByGroup?.() || {});
        const g = TAX_GROUPS[group];
        const from = finance.index(group), to = CityFinance.levelIndex(levelId);
        const pct = v => `${Math.round(Math.abs(v) * 100)}%`;
        const parts = [{ text: `${p.revenueDelta >= 0 ? '+' : '−'}R$ ${Math.abs(p.revenueDelta).toLocaleString('pt-BR')}/min`, good: p.revenueDelta >= 0 }];
        if (group === 'residents') {
            if (p.satisfaction) parts.push({ text: `satisfação ${p.satisfaction > 0 ? '+' : '−'}${Math.abs(p.satisfaction)}`, good: p.satisfaction > 0 });
            const r = p.attraction / (g.attraction[from] || 1) - 1;
            if (Math.abs(r) >= 0.005) parts.push({ text: `chegam ${pct(r)} ${r > 0 ? 'mais' : 'menos'} moradores`, good: r > 0 });
        } else {
            const who = group === 'commerce' ? 'comércio' : 'indústria';
            const r = p.growth / (g.growth[from] || 1) - 1;
            if (Math.abs(r) >= 0.005) parts.push({ text: `${who} cresce ${pct(r)} mais ${r > 0 ? 'rápido' : 'devagar'}`, good: r > 0 });
            const de = p.efficiency - g.efficiency[from];
            if (Math.abs(de) >= 0.005) parts.push({ text: `${group === 'commerce' ? 'lojas rendem' : 'fábricas rendem'} ${pct(de)} ${de > 0 ? 'mais' : 'menos'}`, good: de > 0 });
            const trust = g.trust[to] - g.trust[from];
            if (trust) parts.push({ text: `empresas confiam ${trust > 0 ? 'mais' : 'menos'} na prefeitura`, good: trust > 0 });
        }
        return parts;
    },

    showTaxPreview(group, levelId) {
        const out = document.getElementById(`cf-${group}-preview`);
        const finance = this.gameManager?.cityFinance;
        if (!out || !finance) return;
        const current = CityFinance.level(finance.levels[group]);
        if (!levelId) {
            out.className = 'ch-preview';
            out.textContent = `Agora: ${current.label}. ${this.isMobile
                ? 'Toque num nível para ver o que muda antes de confirmar.'
                : 'Passe o mouse num nível para ver o que muda.'}`;
            return;
        }
        if (levelId === finance.levels[group]) {
            out.className = 'ch-preview';
            out.textContent = `${current.label} é o nível de agora.`;
            return;
        }
        const parts = this.getTaxPreviewParts(group, levelId);
        out.className = 'ch-preview is-preview';
        out.innerHTML = `<b>${CityFinance.level(levelId).label}:</b> ` + parts.map(p =>
            `<span class="${p.good ? 'ch-up' : 'ch-down'}">${p.text}</span>`).join(' · ');
    },

    /** Setas/Home/End andam pelos níveis (mostram a prévia); Enter/Espaço escolhem (clique do botão). */
    onTaxSegmentKey(event, seg) {
        const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const buttons = [...seg.querySelectorAll('.ch-seg-btn')].filter(b => !b.disabled);
        if (!buttons.length) return;
        let i = buttons.indexOf(document.activeElement);
        if (event.key === 'Home') i = 0;
        else if (event.key === 'End') i = buttons.length - 1;
        else i = (i + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length;
        buttons.forEach(b => { b.tabIndex = -1; });
        buttons[i].tabIndex = 0;
        buttons[i].focus();
    },

    async chooseTaxLevel(group, levelId) {
        const gm = this.gameManager, finance = gm?.cityFinance;
        if (!finance || finance.levels[group] === levelId) return;
        const gate = finance.canChange(group, gm.gameTime || 0);
        if (!gate.ok) return;
        const g = TAX_GROUPS[group], level = CityFinance.level(levelId);
        const preview = this.getTaxPreviewParts(group, levelId).map(p => p.text).join(' · ');
        const ok = await gameConfirm(`${g.label}: imposto ${level.label.toLowerCase()}?`,
            `${preview}. Depois de mudar, este imposto só muda de novo daqui a ${Math.round(CityFinance.CHANGE_COOLDOWN_MS / 1000)} s de jogo.`,
            { confirmText: 'Mudar', cancelText: 'Manter', icon: 'question' });
        if (!ok) return;
        const result = finance.setLevel(group, levelId, gm.gameTime || 0);
        if (!result.ok) {
            this.showNotification(result.reason, 'warning', 4000);
            return;
        }
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('tax_change', { target: group, value: levelId });
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_success');
        gm.resourceManager?.calculateTaxRevenue?.(); // a receita nova já aparece no resumo
        this.showNotification(`Imposto de ${g.label.toLowerCase()} agora é ${level.label.toLowerCase()}.`, 'info', 4000, { quiet: true });
        this.refreshCityFinance();
        this.showTaxPreview(group, null);
        document.querySelector(`#city-finance .ch-seg-btn[data-group="${group}"][data-level="${levelId}"]`)?.focus();
    },

    // ===== FUNCIONÁRIOS =====

    openCityStaff(tab = null) {
        const staff = this.gameManager?.cityStaff;
        if (!staff) return;
        const el = this.createCityHallOverlay('city-staff', { kicker: 'Prefeitura', title: 'Funcionários', className: 'city-staff' });
        if (!el.dataset.ready) {
            el.dataset.ready = '1';
            el.querySelector('.ch-body').innerHTML = `
                <div class="ch-tabs" role="tablist" aria-label="Funcionários">
                    <button type="button" role="tab" class="ch-tab" id="cs-tab-team" data-tab="team" aria-controls="cs-panel-team">Equipe</button>
                    <button type="button" role="tab" class="ch-tab" id="cs-tab-hire" data-tab="hire" aria-controls="cs-panel-hire">Contratar</button>
                </div>
                <div class="cs-panel" role="tabpanel" id="cs-panel-team" aria-labelledby="cs-tab-team"></div>
                <div class="cs-panel" role="tabpanel" id="cs-panel-hire" aria-labelledby="cs-tab-hire" hidden></div>`;
            el.querySelector('.ch-foot').innerHTML = `
                <p class="cs-payroll" id="cs-payroll"></p>
                <button type="button" class="gda-btn gda-btn--primary ch-done">Fechar</button>`;
            el.querySelector('.ch-done').addEventListener('click', () => this.closeCityHallPopup('city-staff'));
            const tabs = [...el.querySelectorAll('.ch-tab')];
            tabs.forEach(t => {
                t.addEventListener('click', () => this.setStaffTab(t.dataset.tab, { focus: true }));
                t.addEventListener('keydown', event => {
                    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
                    event.preventDefault();
                    const next = tabs[(tabs.indexOf(t) + 1) % tabs.length];
                    this.setStaffTab(next.dataset.tab, { focus: true });
                });
            });
            // Delegação: os cartões são refeitos a cada mudança
            el.querySelector('.ch-body').addEventListener('click', event => this.onStaffPanelClick(event));
            el.querySelector('.ch-body').addEventListener('keydown', event => {
                const card = event.target.closest?.('.cs-person');
                if (card && event.target === card && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    this.openStaffTalk(card.dataset.person);
                }
            });
        }
        this.setStaffTab(tab || this.staffTab || (staff.staff.length ? 'team' : 'hire'));
        this.showCityHallPopup(el, '.ch-tab[aria-selected="true"]');
    },

    setStaffTab(tab, { focus = false } = {}) {
        this.staffTab = tab === 'hire' ? 'hire' : 'team';
        const el = document.getElementById('city-staff');
        if (!el) return;
        el.querySelectorAll('.ch-tab').forEach(t => {
            const on = t.dataset.tab === this.staffTab;
            t.setAttribute('aria-selected', on ? 'true' : 'false');
            t.tabIndex = on ? 0 : -1;
            if (on && focus) t.focus();
        });
        el.querySelector('#cs-panel-team').hidden = this.staffTab !== 'team';
        el.querySelector('#cs-panel-hire').hidden = this.staffTab !== 'hire';
        this.renderCityStaff();
    },

    renderCityStaff() {
        const el = document.getElementById('city-staff');
        const gm = this.gameManager, staff = gm?.cityStaff;
        if (!el || !staff) return;
        if (this.staffTab === 'team') this.renderStaffTeam(el.querySelector('#cs-panel-team'));
        else this.renderStaffHire(el.querySelector('#cs-panel-hire'));
        const payroll = staff.payroll();
        el.querySelector('#cs-payroll').innerHTML = staff.staff.length
            ? `${uiIcon('res-budget')} Folha da equipe: <b>${this.formatMoney(payroll)}/min</b> · ${staff.staff.length} ${staff.staff.length === 1 ? 'pessoa' : 'pessoas'}`
            : `${uiIcon('res-budget')} Folha da equipe: <b>R$ 0/min</b> · ninguém contratado`;
    },

    renderStaffTeam(panel) {
        const staff = this.gameManager.cityStaff;
        this.destroyStaffPortraits('team');
        if (!staff.staff.length) {
            panel.innerHTML = `
                <div class="cs-empty">
                    <p>Ainda não tem ninguém na equipe da prefeitura. Cada pessoa ajuda a cidade de um jeito e fica melhor com o tempo.</p>
                    <button type="button" class="gda-btn gda-btn--secondary cs-go-hire">Ver quem dá para contratar</button>
                </div>`;
            return;
        }
        panel.innerHTML = `<div class="cs-grid">${staff.staff.map(p => this.renderStaffPersonCard(p)).join('')}</div>`;
        staff.staff.forEach(p => {
            const slot = panel.querySelector(`.cs-person[data-person="${p.id}"] .cs-face`);
            if (!slot) return;
            const { el, portrait } = this.createStaffPortrait(p, { crop: 'face' });
            slot.appendChild(el);
            if (portrait) (this.staffPortraits ||= {}).team = [...(this.staffPortraits.team || []), portrait];
        });
    },

    /** Texto do bônus de uma pessoa no nível dela ("obras 10% mais rápidas · +1 obra ao mesmo tempo"). */
    describeStaffBonus(person) {
        const keys = Object.keys(STAFF_ROLES[person.role]?.bonus || {});
        return keys.map(key => {
            const v = CityStaff.personBonus(person, key);
            return v && STAFF_BONUS_TEXT[key] ? STAFF_BONUS_TEXT[key](v) : '';
        }).filter(Boolean).join(' · ');
    },

    /** Linha da barra de progresso: quanto falta, parado ou nível máximo. */
    describeStaffProgress(person) {
        const role = STAFF_ROLES[person.role];
        if ((person.level || 1) >= STAFF_MAX_LEVEL) return { text: 'Nível máximo! Já rende tudo o que pode.', state: 'max' };
        if (person.good === false) return { text: `Parado: ${role.kpiText} não está indo bem.`, state: 'stopped' };
        const { left } = CityStaff.progress(person);
        const min = Math.max(1, Math.ceil(left));
        return { text: `Falta ~${min} min de ${role.kpiText} indo bem.`, state: 'going' };
    },

    renderStaffPersonCard(person) {
        const role = STAFF_ROLES[person.role];
        const { ratio } = CityStaff.progress(person);
        const progress = this.describeStaffProgress(person);
        const pips = Array.from({ length: STAFF_MAX_LEVEL }, (_, i) => `<span class="cs-pip${i < person.level ? ' on' : ''}"></span>`).join('');
        const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
        return `
            <article class="cs-person" data-person="${person.id}" tabindex="0" aria-label="${esc(person.name)}, ${esc(CityStaff.title(person))}. Enter para conversar.">
                <div class="cs-face"></div>
                <div class="cs-info">
                    <h3 class="cs-name">${esc(person.name)}</h3>
                    <p class="cs-title">${uiIcon(role.icon)} ${CityStaff.title(person)}</p>
                    <div class="cs-level"><span class="gda-label">Nível ${person.level}</span><span class="cs-pips" role="img" aria-label="Nível ${person.level} de ${STAFF_MAX_LEVEL}">${pips}</span></div>
                    <div class="cs-bar cs-bar--${progress.state}" role="progressbar" aria-label="Até o próximo nível" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(ratio * 100)}"><span style="width:${Math.round(ratio * 100)}%"></span></div>
                    <p class="cs-xp cs-xp--${progress.state}">${progress.state === 'stopped' ? '! ' : ''}${progress.text}</p>
                    <p class="cs-bonus">${this.describeStaffBonus(person)}</p>
                    <p class="cs-salary">Salário: <b>${this.formatMoney(CityStaff.salaryOf(person))}/min</b></p>
                    <div class="cs-actions">
                        <button type="button" class="gda-btn gda-btn--primary cs-talk" data-person="${person.id}">Conversar</button>
                        <button type="button" class="gda-btn gda-btn--ghost cs-fire" data-person="${person.id}">Demitir</button>
                    </div>
                </div>
            </article>`;
    },

    /** "Engenheira ou engenheiro ambiental" (parte igual dos dois títulos só uma vez). */
    staffRoleTitle(role) {
        const { f, m } = role.title;
        if (f === m) return f;
        const fw = f.split(' '), mw = m.split(' ');
        let same = 0;
        while (same < Math.min(fw.length, mw.length) - 1 && fw[fw.length - 1 - same] === mw[mw.length - 1 - same]) same++;
        const tail = same ? ` ${fw.slice(fw.length - same).join(' ')}` : '';
        const head = w => w.slice(0, w.length - same).join(' ');
        return `${head(fw)} ou ${head(mw).toLowerCase()}${tail}`;
    },

    renderStaffHire(panel) {
        const gm = this.gameManager, staff = gm.cityStaff;
        const pop = gm.resourceManager?.resources?.population?.current || 0;
        const card = id => {
            const role = STAFF_ROLES[id];
            const cap = CityStaff.cap(id, pop);
            const gate = staff.canHire(id, gm);
            const rule = Number.isFinite(role.cap.base)
                ? `${role.cap.base} ${role.cap.base === 1 ? 'vaga fixa' : 'vagas fixas'}`
                : `Libera com ${role.cap.unlockAt.toLocaleString('pt-BR')} moradores · +1 vaga a cada ${role.cap.extraEvery.toLocaleString('pt-BR')}`;
            return `
                <article class="cs-role${gate.ok ? '' : ' is-locked'}" data-role="${id}">
                    <div class="cs-role-icon" aria-hidden="true">${uiIcon(role.icon, 'lg')}</div>
                    <div class="cs-info">
                        <h3 class="cs-name">${this.staffRoleTitle(role)}</h3>
                        <p class="cs-what">${role.what}</p>
                        <ul class="cs-facts">
                            <li><span>Vagas</span><b>${staff.count(id)}/${cap}</b></li>
                            <li><span>Salário</span><b>${this.formatMoney(role.salary)}/min</b></li>
                            <li><span>Contratar</span><b>${this.formatMoney(CityStaff.hireCost(id))}</b></li>
                        </ul>
                        <p class="cs-rule">${rule}</p>
                        <button type="button" class="gda-btn gda-btn--primary cs-hire" data-role="${id}"${gate.ok ? '' : ' disabled'}
                            ${gate.ok ? '' : `aria-describedby="cs-reason-${id}"`}>Contratar</button>
                        ${gate.ok ? '' : `<p class="cs-reason" id="cs-reason-${id}">${uiIcon('status-warning')} ${gate.reason}</p>`}
                    </div>
                </article>`;
        };
        const ids = Object.keys(STAFF_ROLES);
        panel.innerHTML = `
            <h3 class="gda-label cs-group">Equipe de base</h3>
            <div class="cs-grid">${ids.filter(id => STAFF_ROLES[id].group === 'base').map(card).join('')}</div>
            <h3 class="gda-label cs-group">Especialistas (chegam com a cidade crescendo)</h3>
            <div class="cs-grid">${ids.filter(id => STAFF_ROLES[id].group !== 'base').map(card).join('')}</div>`;
    },

    onStaffPanelClick(event) {
        const target = event.target.closest?.('button, .cs-person');
        if (!target) return;
        if (target.classList.contains('cs-go-hire')) return this.setStaffTab('hire', { focus: true });
        if (target.classList.contains('cs-hire')) return this.hireStaff(target.dataset.role);
        if (target.classList.contains('cs-fire')) return this.confirmFireStaff(target.dataset.person);
        if (target.classList.contains('cs-talk')) return this.openStaffTalk(target.dataset.person);
        if (target.classList.contains('cs-person')) return this.openStaffTalk(target.dataset.person);
    },

    hireStaff(roleId) {
        const gm = this.gameManager;
        if (this.isOnCooldown?.('staff-hire')) return;
        this.setCooldown?.('staff-hire', 400);
        const result = gm.cityStaff.hire(roleId, gm);
        if (!result.ok) {
            this.showNotification(result.reason || 'Não deu para contratar agora.', 'warning', 4000);
            this.renderCityStaff();
            return;
        }
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('staff_hire', { target: roleId, value: result.fee, level: 1 });
        this.updateResourceDisplay?.();
        this.staffTab = 'team';
        this.setStaffTab('team');
        this.showStaffHireCard(result.person, result.fee);
    },

    async confirmFireStaff(personId) {
        const gm = this.gameManager, staff = gm.cityStaff;
        const person = staff.staff.find(p => p.id === personId);
        if (!person) return;
        const ok = await gameConfirm(`Demitir ${person.name}?`,
            `${person.name} sai da prefeitura e leva embora o nível ${person.level} e toda a experiência. ` +
            `Quem for contratado depois começa do nível 1. O salário de ${this.formatMoney(CityStaff.salaryOf(person))}/min para na hora.`,
            { confirmText: 'Demitir', cancelText: 'Manter', icon: 'warning' });
        if (!ok) return;
        const gone = staff.fire(personId);
        if (!gone) return;
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('staff_fire', { target: gone.role, value: gone.level });
        this.showNotification(`${gone.name} saiu da prefeitura.`, 'info', 3500);
        this.renderCityStaff();
    },

    // ===== Retratos =====

    hasStaffPortrait(person) {
        return !!(person?.portrait && typeof PORTRAIT_MANIFEST !== 'undefined' && PORTRAIT_MANIFEST[person.portrait] &&
            typeof AnimatedPortrait !== 'undefined');
    },

    /** Retrato animado (manifesto pronto) ou avatar SVG com as iniciais e o ícone do cargo. */
    createStaffPortrait(person, { crop = 'face', scope = null } = {}) {
        if (this.hasStaffPortrait(person)) {
            try {
                const portrait = new AnimatedPortrait(person.portrait, { crop, label: person.name, speechScope: scope });
                portrait.el.classList.add('staff-portrait');
                return { el: portrait.el, portrait };
            } catch (error) {
                logWarn('⚠️ Retrato do funcionário indisponível:', person.portrait, error);
            }
        }
        return { el: this.createStaffAvatar(person), portrait: null };
    },

    createStaffAvatar(person) {
        const words = String(person?.name || '?').trim().split(/\s+/);
        const initials = (words[0]?.[0] || '?') + (words.length > 1 ? words[words.length - 1][0] : '');
        const el = document.createElement('div');
        el.className = 'staff-avatar';
        el.dataset.role = person?.role || '';
        el.innerHTML = `
            <svg viewBox="0 0 100 100" role="img" aria-label="${String(person?.name || '').replace(/"/g, '&quot;')}">
                <circle class="sa-bg" cx="50" cy="50" r="50"/>
                <circle class="sa-ring" cx="50" cy="50" r="44"/>
                <text class="sa-initials" x="50" y="50" text-anchor="middle" dominant-baseline="central">${initials.toUpperCase()}</text>
            </svg>
            <span class="sa-badge" aria-hidden="true">${uiIcon(STAFF_ROLES[person?.role]?.icon || '')}</span>`;
        return el;
    },

    destroyStaffPortraits(key) {
        (this.staffPortraits?.[key] || []).forEach(p => p.destroy?.());
        if (this.staffPortraits) this.staffPortraits[key] = [];
    },

    // ===== Falas =====

    /** Variáveis das falas (js/data/staffTalk.js): nomes e os números ao vivo de cada cargo. */
    staffTalkVars(person) {
        const gm = this.gameManager, rm = gm.resourceManager, r = rm?.resources || {};
        const bs = gm.buildingSystem, staff = gm.cityStaff;
        const n = v => Math.round(Number(v) || 0).toLocaleString('pt-BR');
        const count = (v, one, many, zero) => (v <= 0 ? zero : `${n(v)} ${v === 1 ? one : many}`);
        const all = bs?.getAllBuildings?.() || [];
        const finished = all.filter(b => b.config && !b.underConstruction && !b.config.roadType);
        const queue = bs?.constructionQueue?.size || 0;
        const working = finished.filter(b => b.effectsApplied);
        const avgEff = working.length ? working.reduce((s, b) => s + (b.efficiency ?? 1), 0) / working.length : 1;
        const damaged = finished.filter(b => bs.isBuildingDamaged?.(b)).length;
        const balance = rm?.getPollutionBalance?.();
        const staffBal = rm?.getStaffBalance?.() || { payroll: 0, savings: 0 };
        const net = (r.budget?.income || 0) - (r.budget?.expenses || 0) - staffBal.payroll + staffBal.savings;
        const saplings = finished.filter(b => b.type === 'tree_sapling' || b.config.treeStages).length;
        const river = rm?.getRiverLevel?.() ?? r.water?.river ?? 100;
        const aquifer = rm?.getAquiferLevel?.() ?? r.water?.aquifer ?? 100;
        const species = gm.fieldNotebook?.count?.() || 0;
        return {
            nome: PlayerProfile.displayName(),
            eu: person.name,
            cargo: CityStaff.title(person).toLowerCase(),
            nivel: person.level,
            fila: count(queue, 'obra', 'obras', 'nenhuma obra'),
            max: n(bs?.maxSimultaneousConstructions || 3),
            prontos: count(finished.length, 'prédio', 'prédios', 'nenhum prédio'),
            estragados: count(damaged, 'prédio', 'prédios', 'nenhum prédio'),
            eficiencia: `${Math.round(avgEff * 100)}%`,
            satisfacao: n(r.population?.satisfaction),
            moradores: count(Math.round(r.population?.current || 0), 'morador', 'moradores', 'nenhum morador'),
            poluicao: n(r.pollution?.current),
            tendencia: !balance ? 'parada' : balance.net > 0.5 ? 'subindo' : balance.net < -0.5 ? 'caindo' : 'parada',
            desconto: `${Math.round((staff?.bonus?.('buildCost') || 0) * 100)}%`,
            saldo: `${net < 0 ? 'menos ' : ''}R$ ${n(Math.abs(net))} por minuto`,
            caixa: this.formatMoney(r.budget?.current),
            folha: `R$ ${n(staffBal.payroll)} por minuto`,
            arvores: count(gm.treeSystem?.trees?.size || 0, 'árvore', 'árvores', 'nenhuma árvore'),
            mudas: count(saplings, 'muda', 'mudas', 'nenhuma muda'),
            especies: count(species, 'espécie', 'espécies', 'nenhuma espécie'),
            rio: `${Math.round(river)}%`,
            aquifero: `${Math.round(aquifer)}%`
        };
    },

    /** Hora, chuva e calor de agora (relógio do jogo + tempo do mundo 3D). */
    staffTalkConditions() {
        const gm = this.gameManager;
        const hour = gm.gameClockTime?.getHours?.() ?? (gm.getDayNightState?.() === 'night' ? 21 : 12);
        const profile = gm.weatherEffects?.profile || {};
        const rain = (profile.rain || 0) > 0 || ['rain', 'storm'].includes(profile.kind);
        return StaffTalk.conditions({ hour, rain, hot: !!profile.hot });
    },

    /** Problemas da cidade agora (mesmas faixas dos botões do topo) para escolher a dica. */
    staffTalkProblems() {
        const gm = this.gameManager, r = gm.resourceManager?.resources;
        const tier = id => (r && typeof ResourceTrends !== 'undefined' ? ResourceTrends.tierOf(id, r) : 'ok');
        const es = gm.eventSystem;
        const events = !!(es && (es.activeEvents?.size || es.pendingEvents?.length));
        return StaffTalk.problems({
            water: tier('water'), energy: tier('energy'), pollution: tier('pollution'),
            money: tier('budget'), satisfaction: tier('satisfaction')
        }, events);
    },

    /** As 3 falas de uma conversa: { day, work, tip } já resolvidas (texto puro). */
    buildStaffTalk(person) {
        const talk = STAFF_TALK[person.role];
        if (!talk) return { day: '', work: '', tip: '' };
        const last = this.staffTalkLast?.[person.id] || {};
        const day = StaffTalk.chooseDay(talk.day, this.staffTalkConditions(), Math.random, last.day);
        const work = StaffTalk.chooseWork(talk.work, person.good !== false, Math.random, last.work);
        const tip = StaffTalk.chooseTip(talk.tips, this.staffTalkProblems(), Math.random, last.tip);
        (this.staffTalkLast ||= {})[person.id] = { day: day?.text, work: work?.text, tip: tip?.text };
        const vars = this.staffTalkVars(person);
        const say = line => StaffTalk.resolve(line?.text || '', person.gender, vars);
        return { day: say(day), work: say(work), tip: say(tip) };
    },

    // ===== Cartão de contratação =====

    showStaffHireCard(person, fee = 0) {
        this.closeStaffHireCard({ silent: true });
        const role = STAFF_ROLES[person.role];
        const overlay = document.createElement('div');
        overlay.id = 'staff-hire-card';
        overlay.className = 'mission-card-overlay staff-hire-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'staff-hire-card-title');
        overlay.innerHTML = `
            <div class="mission-card staff-hire">
                <div class="staff-hire-portrait"></div>
                <div class="mission-card-kicker">Parabéns pela contratação!</div>
                <h2 id="staff-hire-card-title" class="mission-card-title"></h2>
                <p class="staff-hire-role"></p>
                <div class="staff-speech">
                    <p class="staff-hire-intro"></p>
                    <button type="button" class="staff-read" aria-label="Ler em voz alta">${uiIcon('ui-sound')}</button>
                </div>
                <div class="mission-card-rewards">
                    <span class="reward-chip">${uiIcon('res-budget')} Contratação ${this.formatMoney(fee)}</span>
                    <span class="reward-chip">Salário ${this.formatMoney(CityStaff.salaryOf(person))}/min</span>
                </div>
                <p class="mission-card-tip staff-hire-bonus">${uiIcon(role.icon)} <span></span></p>
                <button type="button" id="staff-hire-ok" class="overlay-btn mission-card-ok">Bom trabalho!</button>
            </div>`;
        overlay.querySelector('#staff-hire-card-title').textContent = person.name;
        overlay.querySelector('.staff-hire-role').textContent = `${CityStaff.title(person)} · nível 1`;
        const intro = StaffTalk.resolve(STAFF_TALK[person.role]?.intro?.[Math.floor(Math.random() * (STAFF_TALK[person.role]?.intro?.length || 1))] || '',
            person.gender, this.staffTalkVars(person));
        overlay.querySelector('.staff-hire-intro').textContent = intro;
        overlay.querySelector('.staff-hire-bonus span').textContent = `Já ajuda: ${this.describeStaffBonus(person)}.`;
        (document.getElementById('game-screen') || document.body).appendChild(overlay);

        const { el, portrait } = this.createStaffPortrait(person, { crop: 'face', scope: overlay });
        overlay.querySelector('.staff-hire-portrait').appendChild(el);
        this.staffHirePortrait = portrait;
        portrait?.setExpression?.('happy');
        portrait?.talk?.(3500);
        setupReadAloud(overlay.querySelector('.staff-read'), () => intro);
        this.staffHirePerson = person;
        overlay.querySelector('#staff-hire-ok').addEventListener('click', () => this.closeStaffHireCard());
        this.setupCityHallKeys();
        overlay.querySelector('#staff-hire-ok').focus();
        this.syncCityHallOpen();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_achievement');
    },

    closeStaffHireCard({ silent = false } = {}) {
        const overlay = document.getElementById('staff-hire-card');
        if (!overlay) return;
        stopSpeaking();
        this.staffHirePortrait?.destroy?.();
        this.staffHirePortrait = null;
        overlay.id = 'staff-hire-card-closing';
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 220);
        this.syncCityHallOpen();
        const person = this.staffHirePerson;
        this.staffHirePerson = null;
        if (silent || !person) return;
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click');
        this.showNotification(`${person.name} foi para o trabalho.`, 'success', 3500, { icon: STAFF_ROLES[person.role]?.icon || 'status-done' });
        document.querySelector('#city-staff:not([hidden]) .cs-talk')?.focus();
    },

    // ===== Conversa =====

    openStaffTalk(personId) {
        const person = this.gameManager?.cityStaff?.staff.find(p => p.id === personId);
        if (!person) return;
        this.closeStaffTalk({ silent: true });
        const el = this.createCityHallOverlay('staff-talk', { kicker: 'Conversa', title: '', className: 'staff-talk' });
        el.querySelector('#staff-talk-title').textContent = person.name;
        el.querySelector('.ch-body').innerHTML = `
            <p class="st-role"></p>
            <div class="st-main">
                <div class="st-portrait"></div>
                <div class="st-lines">
                    <div class="st-line"><span class="gda-label">Meu dia</span><p id="st-day"></p></div>
                    <div class="st-line"><span class="gda-label">O trabalho agora</span><p id="st-work"></p></div>
                    <div class="st-line st-tip"><span class="gda-label">${uiIcon('status-tip')} Uma dica</span><p id="st-tip"></p></div>
                </div>
            </div>`;
        el.querySelector('.st-role').textContent = `${CityStaff.title(person)} · nível ${person.level}`;
        el.querySelector('.ch-foot').innerHTML = `
            <button type="button" class="gda-btn gda-btn--ghost st-read" aria-label="Ler em voz alta">${uiIcon('ui-sound')}</button>
            <button type="button" class="gda-btn gda-btn--secondary st-again">Outra conversa</button>
            <button type="button" class="gda-btn gda-btn--primary ch-done">Fechar</button>`;
        const { el: face, portrait } = this.createStaffPortrait(person, { crop: 'bust', scope: el });
        el.querySelector('.st-portrait').appendChild(face);
        this.staffTalkPortrait = portrait;
        this.staffTalkPersonId = person.id;
        setupReadAloud(el.querySelector('.st-read'), () => ['#st-day', '#st-work', '#st-tip']
            .map(s => el.querySelector(s)?.textContent || '').join(' '));
        el.querySelector('.st-again').addEventListener('click', () => this.rerollStaffTalk());
        el.querySelector('.ch-done').addEventListener('click', () => this.closeStaffTalk());
        this.rerollStaffTalk({ sound: false });
        this.showCityHallPopup(el, '.st-again');
    },

    rerollStaffTalk({ sound = true } = {}) {
        const el = document.getElementById('staff-talk');
        const person = this.gameManager?.cityStaff?.staff.find(p => p.id === this.staffTalkPersonId);
        if (!el || !person) return;
        stopSpeaking();
        const talk = this.buildStaffTalk(person);
        el.querySelector('#st-day').textContent = talk.day;
        el.querySelector('#st-work').textContent = talk.work;
        el.querySelector('#st-tip').textContent = talk.tip;
        this.staffTalkPortrait?.setExpression?.(person.good === false ? 'worried' : null);
        this.staffTalkPortrait?.talk?.(3000);
        if (sound && typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click');
    },

    closeStaffTalk({ silent = false } = {}) {
        const el = document.getElementById('staff-talk');
        if (!el || el.hidden) return;
        stopSpeaking();
        this.staffTalkPortrait?.destroy?.();
        this.staffTalkPortrait = null;
        el.hidden = true;
        this.syncCityHallOpen();
        if (!silent && typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_close');
        if (!silent) document.querySelector(`#city-staff:not([hidden]) .cs-person[data-person="${this.staffTalkPersonId}"]`)?.focus();
    },

    // ===== Nível novo (GameManager.update → cityStaff.takeEvents) =====

    onStaffEvents(events = []) {
        const staff = this.gameManager?.cityStaff;
        if (!staff) return;
        for (const ev of events) {
            if (ev?.type !== 'level') continue;
            const person = staff.staff.find(p => p.id === ev.id);
            if (!person) continue;
            if (typeof ResearchLog !== 'undefined') ResearchLog.record('staff_level', { target: person.role, value: ev.level });
            const line = StaffTalk.resolve(STAFF_LEVEL_UP[Math.floor(Math.random() * STAFF_LEVEL_UP.length)], person.gender,
                { ...this.staffTalkVars(person), nivel: ev.level });
            const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
            this.showNotification(`<b>${esc(person.name)}</b>: “${esc(line)}”`, 'success', 7000, {
                icon: 'ui-medal', className: 'staff-level-toast',
                actions: [{ label: 'Ver', onClick: () => this.openCityStaff('team') }]
            });
            if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_success');
        }
        if (this.isCityHallPopupOpen('city-staff')) this.renderCityStaff();
    }
});
