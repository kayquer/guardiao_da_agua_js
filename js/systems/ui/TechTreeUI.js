/**
 * UIManager — Árvore tecnológica (#tech-modal, css/build-menu.css)
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * Uma aba por ramo (as categorias do menu de construção); em cada uma, colunas pelos níveis 1 a 5 e um
 * card por prédio com o status (liberado / falta estudo / falta construir) e os requisitos com a contagem.
 * Setas ligam os requisitos do mesmo ramo; os de outro ramo aparecem só na lista do card. Clicar num card
 * abre o menu de construção nele. É tela de leitura: pausa o jogo (isInfoPopupOpen).
 * Dados: tier/techRequires/group em js/data/buildings.js; regras em js/systems/TechTree.js.
 */
// Ramos da árvore = categorias do menu de construção, na ordem dos botões
const TECH_BRANCHES = ['water', 'treatment', 'nature', 'science', 'power', 'public', 'zoning', 'commercial', 'tourism', 'industrial'];

mixin(UIManager, {
    setupTechTree() {
        if (this.techModal) return;
        this.techModal = document.getElementById('tech-modal');
        if (!this.techModal) return;
        document.getElementById('tech-modal-close')?.addEventListener('click', () => this.closeTechTree());
        this.techModal.addEventListener('pointerdown', event => {
            if (event.target === this.techModal) this.closeTechTree();
        });
        window.addEventListener('resize', () => {
            if (this.isTechTreeOpen()) this.drawTechLines();
        });
    },

    isTechTreeOpen() {
        return !!this.techModal?.classList.contains('open');
    },

    /** Abre a árvore (no ramo do prédio, se vier um id). */
    openTechTree(focusId = null) {
        this.setupTechTree();
        if (!this.techModal) return;
        const type = focusId ? this.gameManager.buildingSystem.buildingTypes.get(focusId) : null;
        if (type && TECH_BRANCHES.includes(type.category)) this.techBranch = type.category;
        if (!this.techBranch) this.techBranch = this.uiState.currentCategory && TECH_BRANCHES.includes(this.uiState.currentCategory)
            ? this.uiState.currentCategory : 'water';
        this.techFocus = focusId;
        this.techModal.classList.add('open');
        this.techModal.setAttribute('aria-hidden', 'false');
        this.renderTechTree();
        AudioManager.playSound('sfx_book_open', 0.5);
    },

    closeTechTree() {
        if (!this.isTechTreeOpen()) return;
        this.techModal.classList.remove('open');
        this.techModal.setAttribute('aria-hidden', 'true');
        AudioManager.playSound('sfx_book_close', 0.4);
    },

    /** Tipos visíveis de um ramo. */
    getTechBranchTypes(branch) {
        return [...this.gameManager.buildingSystem.buildingTypes.values()]
            .filter(t => t.category === branch && t.visible !== false);
    },

    renderTechTree() {
        const tabs = document.getElementById('tech-tabs');
        const body = document.getElementById('tech-body');
        if (!tabs || !body) return;
        const tech = this.gameManager.techTree;
        const study = this.gameManager.studySystem;

        tabs.innerHTML = TECH_BRANCHES
            .filter(b => FEATURE_FLAGS.isCategoryVisible(b) && this.getTechBranchTypes(b).length)
            .map(b => {
                const types = this.getTechBranchTypes(b);
                const ready = types.filter(t => !tech || tech.isReached(t.id)).length;
                return `<button class="tech-tab ${b === this.techBranch ? 'active' : ''}" data-branch="${b}" type="button">${categoryIcon(b, 'sm')} ${this.getCategoryDisplayName(b)} <small>${ready}/${types.length}</small></button>`;
            }).join('');
        tabs.querySelectorAll('.tech-tab').forEach(btn => btn.addEventListener('click', () => {
            this.techBranch = btn.dataset.branch;
            this.techFocus = null;
            AudioManager.playSound('sfx_tab_switch', 0.4);
            this.renderTechTree();
        }));

        const types = this.getTechBranchTypes(this.techBranch);
        const columns = [1, 2, 3, 4, 5].map(tier => {
            const cards = types.filter(t => (t.tier || 1) === tier)
                .sort((a, b) => (a.group || '').localeCompare(b.group || '') || a.cost - b.cost)
                .map(t => {
                    const reached = !tech || tech.isReached(t.id);
                    const studied = !study || study.isStudyUnlocked?.(t.id) !== false;
                    const cls = !reached ? 'locked' : (!studied ? 'study' : '');
                    const status = !reached ? '🔒 Falta construir antes' : (!studied ? '📚 Liberado: falta o estudo' : '✅ Liberado');
                    const req = (tech ? tech.getProgress(t.id) : []).map(p =>
                        `<li class="${p.done || reached ? 'done' : ''}">${p.done || reached ? '✔' : '•'} ${p.need}× ${p.label} (${reached ? p.need : p.have}/${p.need})</li>`).join('');
                    return `<div class="tech-card ${cls}" data-type="${t.id}" title="${t.description || ''}">
                        <div class="tech-card-head">${buildingIcon(t, 'sm')}<span>${t.name}</span></div>
                        <div class="tech-card-status">${status}${t.group ? ` · ${t.group}` : ''}</div>
                        ${req ? `<ul class="tech-card-req">${req}</ul>` : ''}
                    </div>`;
                }).join('');
            return `<div><div class="tech-col-head">${TechTree.TIERS[tier].icon} Nível ${tier} · ${TechTree.TIERS[tier].name}</div><div class="tech-col">${cards}</div></div>`;
        }).join('');
        body.innerHTML = uiIconsIn(`<div class="tech-grid" id="tech-grid"><svg class="tech-lines" id="tech-lines"></svg>${columns}</div>`);

        body.querySelectorAll('.tech-card').forEach(card => card.addEventListener('click', () => {
            const id = card.dataset.type;
            const type = this.gameManager.buildingSystem.buildingTypes.get(id);
            if (!type) return;
            this.closeTechTree();
            if (!(this.uiState.currentCategory === type.category && this.isBuildModalOpen())) {
                this.uiState.currentCategory = null;
                this.uiState.isTransitioning = false;
                this.selectCategory(type.category);
            }
            this.showBuildInfo(id);
            document.querySelector(`#building-items .building-item[data-building-type="${id}"]`)?.scrollIntoView({ block: 'center' });
        }));

        const focus = this.techFocus && body.querySelector(`.tech-card[data-type="${this.techFocus}"]`);
        if (focus) {
            focus.style.outline = '3px solid #ffd54f';
            focus.scrollIntoView({ block: 'center', inline: 'center' });
        }
        requestAnimationFrame(() => this.drawTechLines());
    },

    /** Setas requisito → prédio (só dentro do ramo aberto), desenhadas sobre a grade. */
    drawTechLines() {
        const grid = document.getElementById('tech-grid');
        const svg = document.getElementById('tech-lines');
        if (!grid || !svg) return;
        const tech = this.gameManager.techTree;
        const box = grid.getBoundingClientRect();
        svg.setAttribute('width', box.width);
        svg.setAttribute('height', grid.scrollHeight);
        const cardOf = id => grid.querySelector(`.tech-card[data-type="${id}"]`);
        const paths = [];
        grid.querySelectorAll('.tech-card').forEach(card => {
            const type = this.gameManager.buildingSystem.buildingTypes.get(card.dataset.type);
            (type?.techRequires || []).forEach(req => {
                (req.ids || [req.id]).forEach(reqId => {
                    const from = cardOf(reqId);
                    if (!from) return;
                    const a = from.getBoundingClientRect();
                    const b = card.getBoundingClientRect();
                    const x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top;
                    const x2 = b.left - box.left, y2 = b.top + b.height / 2 - box.top;
                    if (x2 <= x1) return; // mesmo nível: sem seta
                    const mid = (x1 + x2) / 2;
                    const done = !tech || tech.isReached(type.id);
                    paths.push(`<path class="${done ? 'done' : ''}" d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2 - 4},${y2}"/>`);
                });
            });
        });
        svg.innerHTML = paths.join('');
    }
});
