/**
 * UIManager — Menu de construção em modal (#build-modal, css/build-menu.css)
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * Clicar numa categoria (selectCategory) abre o modal com os cards da categoria, separados pelo `group` de
 * cada prédio (Captação, Armazenamento...). O #building-items do painel lateral é movido para dentro do
 * modal: refreshBuildingItemStates, focusBuildingItem e o cooldown de obra continuam valendo.
 * Um clique no card mostra as informações (prévia 3D girando, efeitos, requisitos da árvore tecnológica) com
 * o botão Construir fixo no rodapé; duplo clique num card liberado já constrói. Construir fecha o modal e
 * entra no modo de construção. Não pausa o jogo. No celular o modal é tela cheia e as informações
 * substituem os cards (← Voltar).
 */
mixin(UIManager, {
    /** Uma vez por página (initialize roda de novo ao carregar um save). */
    setupBuildModal() {
        if (this.buildModal) return;
        const modal = document.getElementById('build-modal');
        if (!modal) return;
        this.buildModal = modal;
        this.buildModalSelected = null;

        const grid = document.getElementById('build-modal-grid');
        const items = this.elements.buildingItems || document.getElementById('building-items');
        if (grid && items) grid.appendChild(items);

        document.getElementById('build-modal-close')?.addEventListener('click', () => this.closeBuildModal());
        document.getElementById('build-modal-back')?.addEventListener('click', () => this.showBuildInfo(null));
        document.getElementById('build-modal-tech')?.addEventListener('click', () => this.openTechTree(this.buildModalSelected));
        document.getElementById('btn-tech-tree')?.addEventListener('click', () => this.openTechTree());
        document.getElementById('build-info-construct')?.addEventListener('click', () => this.onBuildConstruct());
        // Clique no fundo escuro (fora da caixa) fecha
        modal.addEventListener('pointerdown', event => {
            if (event.target === modal) this.closeBuildModal();
        });
        window.addEventListener('resize', () => this.buildPreview?.resize());
    },

    isBuildModalOpen() {
        return !!this.buildModal?.classList.contains('open');
    },

    /** Abre o modal na categoria (os cards já foram montados por loadBuildingItemsWithStateManagement). */
    openBuildModal(category) {
        this.setupBuildModal();
        const modal = this.buildModal;
        if (!modal) return;
        const title = document.getElementById('build-modal-title');
        if (title) title.innerHTML = `${categoryIcon(category, 'sm')} ${this.getCategoryDisplayName(category)}`;
        const wasOpen = this.isBuildModalOpen();
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('build-modal-open'); // celular: botões flutuantes saem da frente do Construir
        document.getElementById('build-modal-grid')?.scrollTo?.(0, 0);
        this.showBuildInfo(null);
        if (!wasOpen) AudioManager.playSound('sfx_panel_open', 0.5);
    },

    closeBuildModal() {
        if (!this.buildModal) return;
        const wasOpen = this.isBuildModalOpen();
        this.buildModal.classList.remove('open', 'info-open');
        this.buildModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('build-modal-open');
        this.buildModalSelected = null;
        this.buildPreview?.stop();
        this.buildPreview?.clear();
        this.clearBuildingSelections();
        this.hideStudyTooltip();
        // Categoria fechada: clicar nela de novo reabre (selectCategory não confunde com "fechar")
        this.updateCategoryButtonStates(null);
        this.uiState.currentCategory = null;
        this.currentCategory = null;
        if (wasOpen) AudioManager.playSound('sfx_panel_close', 0.4);
    },

    /** Esc: no celular, das informações volta aos cards; senão fecha. true se havia algo para fechar. */
    handleBuildModalEscape() {
        if (!this.isBuildModalOpen()) return false;
        if (this.isMobile && this.buildModal.classList.contains('info-open')) this.showBuildInfo(null);
        else this.closeBuildModal();
        return true;
    },

    /** Mostra as informações do prédio no painel do modal (null = nenhum escolhido). */
    showBuildInfo(typeId) {
        this.setupBuildModal();
        const bs = this.gameManager.buildingSystem;
        const type = typeId ? bs?.buildingTypes.get(typeId) : null;
        const content = document.getElementById('build-info-content');
        const preview = document.getElementById('build-preview');
        const button = document.getElementById('build-info-construct');
        const hint = document.getElementById('build-info-hint');
        this.clearBuildingSelections();
        this.buildModalSelected = type ? type.id : null;
        this.buildModal?.classList.toggle('info-open', !!type);

        if (!type) {
            if (content) content.innerHTML = `<div class="build-info-empty">${uiIcon('ui-build', 'lg')}<span>Escolha um card para ver o prédio, o que ele faz e o que precisa.</span><span>Clique duas vezes para construir direto.</span></div>`;
            if (preview) preview.style.display = 'none';
            if (button) button.hidden = true;
            if (hint) hint.textContent = '';
            this.buildPreview?.stop();
            this.buildPreview?.clear();
            return;
        }

        document.querySelector(`#building-items .building-item[data-building-type="${type.id}"]`)?.classList.add('selected');
        if (content) content.innerHTML = this.renderBuildInfo(type);
        document.getElementById('build-info-scroll')?.scrollTo?.(0, 0);
        content?.querySelector('[data-action="tech-tree"]')?.addEventListener('click', () => this.openTechTree(type.id));
        this.updateBuildInfoButton();
        this.showBuildPreview(type);
        AudioManager.playSound('sfx_ui_click', 0.4);
    },

    /** Prévia 3D (BuildPreview) ou o ícone grande, para quem não tem modelo. */
    showBuildPreview(type) {
        const preview = document.getElementById('build-preview');
        if (!preview) return;
        preview.style.display = '';
        const icon = document.getElementById('build-preview-icon');
        if (icon) icon.innerHTML = buildingIcon(type, 'lg') || uiIcon('ui-build', 'lg');
        const badge = document.getElementById('build-preview-badge');
        if (badge) {
            badge.hidden = true;
            badge.textContent = '🔄 com peças que giram';
        }
        if (!BuildPreview.has(type.id)) {
            preview.classList.add('no-model');
            this.buildPreview?.stop();
            this.buildPreview?.clear();
            return;
        }
        if (!this.buildPreview) this.buildPreview = new BuildPreview(document.getElementById('build-preview-canvas'));
        // Enquanto o .glb chega (1ª vez), o ícone fica no lugar
        preview.classList.add('no-model');
        this.buildPreview.show(type.id).then(ok => {
            if (!ok || this.buildModalSelected !== type.id) return;
            preview.classList.remove('no-model');
            if (badge) badge.hidden = !this.buildPreview.current?.parts.length;
        });
    },

    /**
     * Linhas de efeito do prédio a partir dos campos que a simulação lê (applyBuildingEffects, EventSystem).
     * Uma fonte só para o menu de construção (type) e para o painel do prédio pronto (com building: valores reais —
     * rendimento de água com seca/aquífero, energia pela fase da zona). tests/unit/data.test.js confere a cobertura.
     */
    getBuildingEffectLines(type, building = null) {
        const lines = [];
        const add = (label, value, cls = '', key = '') => lines.push({ label, value, cls, key });
        const fmt = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
        const bs = this.gameManager?.buildingSystem;
        const rented = building?.isRented ? ' (alugado)' : '';
        if (type.waterProduction && building && bs?.getBuildingWaterYield) {
            const y = bs.getBuildingWaterYield(building);
            const why = y.actual < y.nominal && y.reasons.length ? ` de ${fmt(y.nominal)} (${y.reasons.join(', ')})` : '';
            add('💧 Produz água', `${fmt(y.actual)} L/min${why}${rented}`, y.actual < y.nominal ? 'bad' : 'good', 'water-yield');
        } else if (type.waterProduction) add('💧 Produz água', `${fmt(type.waterProduction)} L/min`, 'good');
        if (type.waterStorage) add('🛢️ Guarda água', `${fmt(type.waterStorage)} L`, 'good');
        if (type.waterConsumption) add('🚰 Gasta água', `${fmt(type.waterConsumption)} L/min`, 'bad');
        if (type.powerGeneration) add('⚡ Gera energia', `${fmt(type.powerGeneration)} MW${rented}`, 'good');
        if (type.powerConsumption) {
            // Zona consome pela fase (BuildingEfficiency.getBuildingPowerConsumption)
            const now = building?.active && bs?.getBuildingPowerConsumption ? bs.getBuildingPowerConsumption(building) : type.powerConsumption;
            const ofFull = now !== type.powerConsumption ? ` (de ${fmt(type.powerConsumption)} MW com a zona completa)` : '';
            add('🔌 Usa energia', `${fmt(now)} MW${ofFull}`, 'bad', 'power-consumption');
        }
        if (type.pollutionReduction) add('🌿 Limpa a poluição', `-${fmt(type.pollutionReduction)}/min`, 'good');
        if (type.pollutionGeneration) add('🏭 Polui', `+${fmt(type.pollutionGeneration)}/min`, 'bad');
        if (type.satisfactionBonus) add('😊 Satisfação', `+${fmt(type.satisfactionBonus)}`, 'good');
        if (type.incomeGeneration) add('💵 Rende', `R$ ${fmt(type.incomeGeneration)}/min${rented}`, 'good');
        if (type.populationCapacity || type.population) add('👥 Moradores', fmt(type.populationCapacity || type.population), 'good');
        if (type.aquiferRecharge) add('🪨 Recarrega o aquífero', `+${fmt(type.aquiferRecharge)}%/min`, 'good');
        if (type.groundwater) add('🪨 Tira água do aquífero', 'sim', 'bad');
        if (type.runoffAbsorption) add('🌧️ Segura a enxurrada', `${fmt(type.runoffAbsorption)} (menos enchente)`, 'good');
        if (type.earlyWarning) add('📡 Avisa antes', 'eventos chegam com o dobro de aviso', 'good');
        if (type.nearbyEfficiencyBonus) add('🔬 Melhora os vizinhos', `+${Math.round(type.nearbyEfficiencyBonus * 100)}% de eficiência`, 'good');
        if (type.runoffImpervious) add('🌧️ Chão impermeável', 'a chuva escorre (mais enchente)', 'bad');
        if (type.plantedTree) add('🌳 Cresce e limpa o ar', '4 fases', 'good');
        if (type.maintenanceCost) add('🔧 Manutenção', `R$ ${fmt(type.maintenanceCost)}/min`, 'bad');
        if (!building) add('📐 Tamanho', `${type.size}×${type.size} quadrados`);
        return lines;
    },

    renderBuildInfo(type) {
        const tech = this.gameManager.techTree;
        const tier = type.tier || 1;
        const tierName = typeof TechTree !== 'undefined' ? TechTree.TIERS[tier]?.name : '';
        const progress = tech ? tech.getProgress(type.id) : [];
        const reached = !tech || tech.isReached(type.id);
        const unlocks = tech ? tech.getUnlocks(type.id).map(id => this.gameManager.buildingSystem.buildingTypes.get(id))
            .filter(t => t && t.visible !== false) : [];
        const stats = this.getBuildingEffectLines(type)
            .map(l => `<li><span>${l.label}</span><b class="${l.cls}">${l.value}</b></li>`).join('');
        const req = progress.length ? `
            <div class="build-info-req">
                <h5>${reached ? '✅ Tecnologia liberada' : '🔒 Para liberar, construa antes:'}</h5>
                <ul>${progress.map(p => `
                    <li class="${p.done || reached ? 'done' : ''}">
                        <span>${p.done || reached ? '✅' : '⬜'} ${p.need}× ${p.label}</span>
                        <span class="req-bar"><span style="width:${reached ? 100 : Math.round(p.have / p.need * 100)}%"></span></span>
                        <span>${reached ? p.need : p.have}/${p.need}</span>
                    </li>`).join('')}
                </ul>
            </div>` : '';
        const near = type.requirements?.nearWater ? '<p class="build-info-desc">💧 Precisa ficar perto da água.</p>' : '';
        return uiIconsIn(`
            <h4>${type.name}</h4>
            <div class="build-info-meta">${TechTree.TIERS[tier]?.icon || ''} Nível ${tier} · ${tierName}${type.group ? ` · ${type.group}` : ''}</div>
            <p class="build-info-desc">${type.description || ''}</p>
            ${near}
            <ul class="build-info-stats">${stats}</ul>
            ${req}
            ${unlocks.length ? `<div class="build-info-unlocks"><h5>⬆️ Abre caminho para</h5>${unlocks.map(t => t.name).join(', ')}</div>` : ''}
            <p><button class="build-info-link" data-action="tech-tree" type="button">🔬 Ver na árvore tecnológica</button></p>
        `);
    },

    /** Texto e estado do botão Construir conforme o card agora (também chamado por refreshBuildingItemStates). */
    updateBuildInfoButton() {
        const id = this.buildModalSelected;
        const button = document.getElementById('build-info-construct');
        const hint = document.getElementById('build-info-hint');
        if (!button || !id) return;
        const type = this.gameManager.buildingSystem.buildingTypes.get(id);
        if (!type) return;
        const state = this.getBuildingItemState(type);
        button.hidden = false;
        button.classList.toggle('study', state === 'locked');
        button.dataset.state = state;
        const cost = `R$ ${type.cost.toLocaleString('pt-BR')}`;
        if (state === 'tech') {
            button.disabled = true;
            button.innerHTML = `${uiIcon('status-locked')} Tecnologia bloqueada`;
            if (hint) hint.textContent = 'Construa os prédios da lista acima para liberar.';
        } else if (state === 'locked') {
            button.disabled = false;
            button.innerHTML = `${uiIcon('ui-books')} Estudar para liberar`;
            if (hint) hint.textContent = 'Um estudo rápido libera este prédio.';
        } else if (state === 'disabled') {
            button.disabled = true;
            const missing = type.cost - (this.gameManager.resourceManager?.resources.budget.current || 0);
            button.innerHTML = `${uiIcon('ui-build')} Construir · ${cost}`;
            if (hint) hint.textContent = `Falta R$ ${Math.max(0, Math.ceil(missing)).toLocaleString('pt-BR')} no caixa.`;
        } else {
            button.disabled = false;
            button.innerHTML = `${uiIcon('ui-build')} Construir · ${cost}`;
            if (hint) hint.textContent = this.isMobile ? 'Depois toque no mapa para escolher o lugar.' : 'Depois clique no mapa para escolher o lugar (Esc cancela).';
        }
    },

    /** Botão do rodapé: estudar (bloqueado por estudo) ou construir. */
    onBuildConstruct() {
        const id = this.buildModalSelected;
        if (!id) return;
        const type = this.gameManager.buildingSystem.buildingTypes.get(id);
        if (!type) return;
        const state = this.getBuildingItemState(type);
        if (state === 'locked') {
            this.closeBuildModal();
            this.openStudyBook(id);
            return;
        }
        if (state === 'tech') return;
        if (state === 'disabled') {
            this.showBudgetInsufficientNotification();
            return;
        }
        this.constructFromBuildModal(id);
    },

    /** Fecha o modal (e a gaveta do celular) e entra no modo de construção. */
    constructFromBuildModal(id) {
        const tutorial = this.gameManager.tutorialSystem;
        if (tutorial?.isActive && !tutorial.allowsBuilding(id)) {
            this.showNotification('📚 Siga o tutorial: ainda não é hora de construir isso.', 'warning');
            return;
        }
        this.dismissBuildModal();
        if (this.isMobile) {
            this.closeMobilePanel?.('right');
            this.closeMobilePanel?.('left');
        }
        this.selectBuildingType(id);
    },

    /**
     * Fecha o modal mantendo a categoria marcada: o `enter` do passo do tutorial ("categoria !== X → abre") não
     * reabre o modal por cima da obra; clicar na categoria reabre (com o modal fechado, selectCategory abre).
     * Usado ao construir e quando uma obra é colocada por outro caminho (TutorialSystem.onBuildingPlaced).
     */
    dismissBuildModal() {
        if (!this.isBuildModalOpen()) return;
        const category = this.uiState.currentCategory;
        this.closeBuildModal();
        if (category) {
            this.uiState.currentCategory = category;
            this.currentCategory = category;
            this.updateCategoryButtonStates(category);
        }
    },

    /** Tecnologia nova (TechTree.check): redesenha as informações abertas. Os cards se atualizam sozinhos. */
    onTechUnlocked() {
        if (this.isBuildModalOpen() && this.buildModalSelected) {
            const content = document.getElementById('build-info-content');
            const type = this.gameManager.buildingSystem.buildingTypes.get(this.buildModalSelected);
            if (content && type) {
                content.innerHTML = this.renderBuildInfo(type);
                content.querySelector('[data-action="tech-tree"]')?.addEventListener('click', () => this.openTechTree(type.id));
            }
            this.updateBuildInfoButton();
        }
        if (this.isTechTreeOpen?.()) this.renderTechTree();
    }
});
