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

// Prédio que polui pelo menos isto por minuto ganha no cartão o tempo até a poluição chegar a 100% (getPollutionFillMinutes)
const BuildMenuUI_POLLUTION_FILL_WARN = 15;
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
        this.setupBuildGuideButton();
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
        this.buildModalCategory = category;
        this.syncBuildGuideButton(category);
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
        this.closeBuildGuide({ restoreFocus: false });
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

    /**
     * Esc: com o "Como funciona" aberto, fecha só ele; no celular, das informações volta aos cards; senão fecha.
     * true se havia algo para fechar (GameManager chama no Esc em captura, antes de qualquer pausa).
     */
    handleBuildModalEscape() {
        if (this.isBuildGuideOpen()) {
            this.closeBuildGuide();
            return true;
        }
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
            const guide = this.getBuildGuide(this.buildModalCategory);
            const intro = guide ? `
                <div class="build-info-guide-intro">
                    <span class="gda-label">Para que serve</span>
                    <p>${guide.purpose}</p>
                    <button type="button" class="gda-btn gda-btn--secondary" data-action="build-guide">${uiIcon('ui-help')} Como funciona: ${guide.title}</button>
                </div>` : '';
            if (content) {
                content.innerHTML = `<div class="build-info-empty">${intro}${uiIcon('ui-build', 'lg')}<span>Escolha um card para ver o prédio, o que ele faz e o que precisa.</span><span>Clique duas vezes para construir direto.</span></div>`;
                content.querySelector('[data-action="build-guide"]')?.addEventListener('click', () => this.openBuildGuide(this.buildModalCategory));
            }
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
        this.wireBuildInfoActions(content, type);
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
     * Prédio que polui muito (≥ POLLUTION_FILL_WARN/min): em quanto tempo de jogo ele leva a poluição a 100% com a
     * cidade como está agora (getPollutionBalance + a poluição dele). 3ª auditoria: a Usina a Carvão, sozinha, levava
     * a cidade à derrota em 2,5 min e nada no cartão avisava. Sem perigo em 30 min = sem linha.
     */
    getPollutionFillMinutes(type) {
        const rm = this.gameManager?.resourceManager;
        if (!rm?.getPollutionBalance || (type.pollutionGeneration || 0) < BuildMenuUI_POLLUTION_FILL_WARN) return null;
        const now = rm.resources.pollution?.current || 0;
        const max = rm.resources.pollution?.max || 100;
        const net = rm.getPollutionBalance().net + type.pollutionGeneration;
        if (net <= 0) return null;
        const minutes = (max - now) / net;
        if (minutes > 30) return null;
        const when = minutes < 1 ? 'menos de 1 min' : `~${Math.round(minutes)} min`;
        return `leva a poluição de ${Math.round(now)}% a ${Math.round(max)}% em ${when} de jogo (fim de jogo), se nada limpar`;
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
        if (type.waterConsumption) add('🚰 Gasta água', `${fmt(type.waterConsumption * (type.rainwaterReuse ? 0.5 : 1))} L/min`, 'bad');
        if (type.powerGeneration) add('⚡ Gera energia', `${fmt(type.powerGeneration)} kW${rented}`, 'good');
        if (type.powerConsumption) {
            // Zona consome pela fase (BuildingEfficiency.getBuildingPowerConsumption)
            const now = building?.active && bs?.getBuildingPowerConsumption ? bs.getBuildingPowerConsumption(building) : type.powerConsumption;
            const ofFull = now !== type.powerConsumption ? ` (de ${fmt(type.powerConsumption)} kW com a zona completa)` : '';
            add('🔌 Usa energia', `${fmt(now)} kW${ofFull}`, 'bad', 'power-consumption');
        }
        if (type.pollutionReduction) add('🌿 Limpa a poluição', `-${fmt(type.pollutionReduction)}/min`, 'good');
        if (type.pollutionGeneration) add('🏭 Polui', `+${fmt(type.pollutionGeneration)}/min`, 'bad');
        const fill = !building ? this.getPollutionFillMinutes?.(type) : null;
        if (fill) add('⚠️ Com a cidade de agora', fill, 'bad', 'pollution-fill');
        if (type.satisfactionBonus) add('😊 Satisfação', `+${fmt(type.satisfactionBonus)}`, 'good');
        if (type.incomeGeneration) add('💵 Rende', `R$ ${fmt(type.incomeGeneration)}/min${rented}`, 'good');
        if (type.populationCapacity || type.population) add('👥 Moradores', fmt(type.populationCapacity || type.population), 'good');
        if (type.aquiferRecharge) add('🪨 Recarrega o aquífero', `+${fmt(type.aquiferRecharge)}%/min`, 'good');
        if (type.groundwater) add('🪨 Tira água do aquífero', 'sim', 'bad');
        if (type.surfaceWater) add('🏞️ Tira água do rio', 'baixa o nível dos rios (rio baixo = capta menos)', 'bad');
        if (type.riverRecharge) add('🏞️ Devolve água limpa ao rio', `+${fmt(type.riverRecharge)}%/min no nível dos rios`, 'good');
        if (type.runoffAbsorption) add('🌧️ Segura a enxurrada', `${fmt(type.runoffAbsorption)} (menos enchente)`, 'good');
        if (type.earlyWarning) add('📡 Avisa antes', 'eventos chegam com o dobro de aviso', 'good');
        if (type.solarStorage) add('🔋 Guarda energia do sol', `as usinas solares recuperam ${Math.round(type.solarStorage * 100)}% do que perdem à noite e com nuvem`, 'good');
        // Centros de pesquisa: valem para os prédios a até effectRadius blocos (BuildingSystem.findNearbyResearchBuildings)
        const radius = type.effectRadius ? ` a até ${type.effectRadius} blocos` : '';
        if (type.nearbyEfficiencyBonus) add('🔬 Melhora os vizinhos', `+${fmt(type.nearbyEfficiencyBonus * 100)}% de eficiência${radius}`, 'good');
        // Desconto na obra de quem é construído perto (calculateConstructionCostWithBonuses: ±5% de sorte, teto de 40%)
        if (type.constructionCostReduction) add('🏗️ Obras perto mais baratas', `cerca de −${fmt(type.constructionCostReduction * 100)}% no custo${radius}`, 'good');
        if (type.runoffImpervious && type.zoneType) {
            // Zonas: quanto do lote é chão coberto (a leve tem quintais; a pesada é quase toda telhado e asfalto)
            const share = type.runoffImpervious;
            if (share >= 0.5) add('🌧️ Lote coberto', `${Math.round(share * 100)}% do chão é telhado e asfalto: mais enxurrada e enchente`, 'bad');
            else add('🌧️ Lote com quintais', `só ${Math.round(share * 100)}% do chão é coberto: a chuva entra na terra`, 'good');
        } else if (type.runoffImpervious) {
            // Ruas: quanto da chuva escorre (asfalto 1 = toda; cascalho e terra deixam a água entrar no chão)
            const share = type.runoffImpervious;
            if (share >= 0.8) add('🌧️ Chão impermeável', 'quase toda a chuva escorre (mais enxurrada e enchente)', 'bad');
            else if (type.roadType === 'dirt') add('🌧️ Terra batida', `pouca chuva entra no chão (${Math.round((1 - share) * 100)}% infiltra) e a enxurrada leva barro para o rio (erosão)`, 'bad');
            else if (share >= 0.3) add('🌧️ Chão semipermeável', `parte da chuva entra entre as pedras (${Math.round((1 - share) * 100)}% infiltra)`, 'good');
            else add('🌧️ Chão permeável', `a chuva entra no chão (${Math.round((1 - share) * 100)}% infiltra)`, 'good');
        }
        if (type.powerSource) add({ wind: '🌬️ Depende do vento', solar: '☀️ Depende do sol', hydro: '💧 Depende do rio' }[type.powerSource],
            { wind: 'pouco vento = menos energia; ventania forte desliga', solar: 'nuvem, chuva e noite = menos energia', hydro: 'na seca o rio baixa e gera menos' }[type.powerSource], 'bad');
        if (type.needsWater) add('🚱 Precisa de água', 'sem água na cidade funciona a 50%', 'bad');
        if (type.needsCleanWater) add('🛳️ Precisa de rio limpo', 'com poluição acima de 50% funciona a 50%', 'bad');
        if (type.rainwaterReuse) add('♻️ Reaproveita a chuva', 'gasta metade da água', 'good');
        if (type.taxGroup) add('🧾 Paga imposto', type.taxGroup === 'tourism' ? 'de turismo (R$ 100/min com a cidade crescendo)'
            : type.taxGroup === 'industry' ? 'da indústria (a prefeitura fica com mais ou menos da renda, conforme o imposto)'
                : 'de comércio (R$ 50/min com a cidade crescendo)', 'good');
        // Serviços públicos (js/data/cityServices.js + CityServices): o efeito de um prédio deste tipo sozinho
        if (typeof CityServices !== 'undefined') {
            for (const [key, def] of Object.entries(CITY_SERVICES)) {
                const v = CityServices.single(key, type);
                if (v > 0) add(`🏛️ Serviço da cidade`, `${def.text(v)}${Number.isFinite(def.cap) ? ` (até ${Math.round(def.cap * 100)}% com mais deles)` : ''}`, 'good', `service-${key}`);
            }
        }
        if (type.administrativeBonus) add('🏛️ Prefeitura', 'abre o Financeiro (impostos) e os Funcionários', 'good');
        if (type.growthRate && typeof CityServices !== 'undefined') {
            const pace = CityServices.pace(1, type.growthRate);
            if (Math.abs(pace - 1) >= 0.05) add('👥 Moradores chegam', `${Math.round(pace * 10) / 10}× mais rápido que na zona leve`, 'good');
        }
        const popNeed = bs?.getPopulationRequirement?.(type) || 0;
        if (popNeed && !building) add('👥 Precisa de moradores', `a cidade com ${popNeed.toLocaleString('pt-BR')} ou mais`, '', 'population-need');
        if (type.plantedTree) add('🌳 Cresce, limpa o ar e recarrega o aquífero', '4 fases', 'good');
        if (type.recycleBonus) add('♻️ Reciclar prédios', `+${Math.round(type.recycleBonus * 100)}% no valor (uma vez por tipo)`, 'good');
        if (type.maintenanceCost) add('🔧 Manutenção', `R$ ${fmt(type.maintenanceCost)}/min`, 'bad');
        // Só no menu (o painel do prédio pronto já avisa "Sem rua" quando falta): BuildingEfficiency.buildingNeedsRoad
        if (!building && bs?.buildingNeedsRoad?.(type)) add('🛣️ Precisa de rua encostada', `sem rua funciona a ${Math.round((typeof EFFICIENCY_RULES !== 'undefined' ? EFFICIENCY_RULES.noRoadFactor : 0.75) * 100)}%`, '', 'needs-road');
        if (!building && type.allowedInRiverZone && !type.roadType) add('🌿 Pode ir na beira do rio', 'na faixa de proteção (APP) e na várzea', 'good', 'river-zone');
        if (!building) add('📐 Tamanho', `${type.size}×${type.size} quadrados`);
        return lines;
    },

    /** Links dentro das informações do prédio: árvore tecnológica e (estudo opcional) ler o estudo. */
    wireBuildInfoActions(content, type) {
        content?.querySelector('[data-action="tech-tree"]')?.addEventListener('click', () => this.openTechTree(type.id));
        content?.querySelector('[data-action="study"]')?.addEventListener('click', () => {
            this.closeBuildModal();
            this.openStudyBook(type.id);
        });
    },

    /** Estudo opcional (STUDY_RULES.STUDY): o prédio já está livre, então o estudo vira um link de leitura. */
    renderOptionalStudyLink(type) {
        const study = this.gameManager.studySystem;
        if (StudySystem.rules().study !== 'opcional' || !study?.hasStudyContent?.(type.id)) return '';
        const done = study.unlockedBuildings?.has(type.id);
        const bonus = Math.round(((typeof GameMode !== 'undefined' && GameMode.current().readingBonus) || 0) * 100);
        const read = study.readStudies?.has(type.id);
        const label = read ? `Ler de novo o estudo${bonus ? ` (já vale +${bonus}% de eficiência)` : ''}`
            : done ? 'Ler de novo o estudo' : `Ler o estudo (opcional${bonus ? `: lido até o fim, +${bonus}% de eficiência` : ''})`;
        return `<p><button class="build-info-link" data-action="study" type="button">📖 ${label}</button></p>`;
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
        const maxWater = type.requirements?.maxWaterDistance;
        const near = maxWater
            ? `<p class="build-info-desc">💧 Precisa de um rio, lago ou represa a até ${maxWater} blocos. Encostada na água capta direto; mais longe, a bomba e os canos são instalados sozinhos.</p>`
            : type.requirements?.nearWater ? '<p class="build-info-desc">💧 Precisa ficar perto da água.</p>' : '';
        return uiIconsIn(`
            <h4>${type.name}</h4>
            <div class="build-info-meta">${TechTree.TIERS[tier]?.icon || ''} Nível ${tier} · ${tierName}${type.group ? ` · ${type.group}` : ''}</div>
            <p class="build-info-desc">${type.description || ''}</p>
            ${near}
            <ul class="build-info-stats">${stats}</ul>
            ${req}
            ${unlocks.length ? `<div class="build-info-unlocks"><h5>⬆️ Abre caminho para</h5>${unlocks.map(t => t.name).join(', ')}</div>` : ''}
            ${this.renderOptionalStudyLink(type)}
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
        // Prêmio de missão (desconto/obra grátis): mostra o preço com ele
        const perkCost = this.gameManager.questSystem?.getPerkCost?.(type.id, type.cost) ?? type.cost;
        const cost = perkCost < type.cost
            ? (perkCost === 0 ? 'grátis (prêmio)' : `R$ ${perkCost.toLocaleString('pt-BR')} (prêmio)`)
            : `R$ ${type.cost.toLocaleString('pt-BR')}`;
        if (state === 'tech') {
            button.disabled = true;
            button.innerHTML = `${uiIcon('status-locked')} Tecnologia bloqueada`;
            if (hint) hint.textContent = 'Construa os prédios da lista acima para liberar.';
        } else if (state === 'locked') {
            button.disabled = false;
            button.innerHTML = `${uiIcon('ui-books')} Estudar para liberar`;
            if (hint) hint.textContent = 'Um estudo rápido libera este prédio.';
        } else if (state === 'population') {
            button.disabled = true;
            const need = this.gameManager.buildingSystem.getPopulationRequirement(type);
            const pop = Math.floor(this.gameManager.resourceManager?.resources.population.current || 0);
            button.innerHTML = `${uiIcon('res-population')} Precisa de ${need.toLocaleString('pt-BR')} moradores`;
            if (hint) hint.textContent = `A cidade tem ${pop.toLocaleString('pt-BR')}: faltam ${Math.max(0, need - pop).toLocaleString('pt-BR')}. Zonas residenciais trazem moradores.`;
        } else if (state === 'disabled') {
            button.disabled = true;
            const missing = perkCost - (this.gameManager.resourceManager?.resources.budget.current || 0);
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
        if (state === 'tech' || state === 'population') return;
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
                this.wireBuildInfoActions(content, type);
            }
            this.updateBuildInfoButton();
        }
        if (this.isTechTreeOpen?.()) this.renderTechTree();
    },

    // ===== "COMO FUNCIONA" DA CATEGORIA (#build-guide, dados em js/data/buildGuides.js) =====
    // Painel de leitura sobre o modal: para que serve a categoria, as regras do jogo por trás, causa e efeito e
    // dicas, com atalhos para a aula/guia que já existe. Pausa (UIManager.isInfoPopupOpen); Esc fecha só ele
    // (handleBuildModalEscape); foco preso dentro dele e devolvido ao botão que abriu.

    getBuildGuide(category) {
        return (typeof BUILD_GUIDES !== 'undefined' && category && BUILD_GUIDES[category]) || null;
    },

    /** Botão "Como funciona" no topo do modal (criado aqui: o HTML do modal não muda). */
    setupBuildGuideButton() {
        const tech = document.getElementById('build-modal-tech');
        if (!tech || document.getElementById('build-modal-guide')) return;
        // "Tecnologias" vira só ícone em tela estreita: o texto ganha um span e o botão, um nome acessível
        if (!tech.querySelector('.build-modal-btn-text')) {
            [...tech.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).forEach(n => {
                const span = document.createElement('span');
                span.className = 'build-modal-btn-text';
                span.textContent = n.textContent.trim();
                n.replaceWith(span);
            });
            tech.setAttribute('aria-label', 'Tecnologias');
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'build-modal-guide';
        button.className = 'build-modal-btn guide';
        button.innerHTML = `${uiIcon('ui-help')}<span>Como funciona</span>`;
        button.addEventListener('click', () => this.openBuildGuide(this.buildModalCategory));
        tech.before(button);
    },

    syncBuildGuideButton(category) {
        const button = document.getElementById('build-modal-guide');
        if (!button) return;
        const guide = this.getBuildGuide(category);
        button.hidden = !guide;
        button.dataset.category = category || '';
        if (guide) button.setAttribute('aria-label', `Como funciona: ${guide.title}`);
    },

    isBuildGuideOpen() {
        const panel = document.getElementById('build-guide');
        return !!panel && !panel.hidden;
    },

    ensureBuildGuide() {
        let panel = document.getElementById('build-guide');
        if (panel) return panel;
        panel = document.createElement('div');
        panel.id = 'build-guide';
        panel.className = 'build-guide';
        panel.hidden = true;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'build-guide-title');
        panel.innerHTML = '<div class="build-guide-box" id="build-guide-box"></div>';
        // Irmão do modal (mesmo contexto de empilhamento, z-index acima dele)
        if (this.buildModal?.parentNode) this.buildModal.after(panel);
        else (document.getElementById('game-screen') || document.body).appendChild(panel);
        panel.addEventListener('pointerdown', event => {
            if (event.target === panel) this.closeBuildGuide();
        });
        panel.addEventListener('keydown', event => this.trapBuildGuideFocus(event));
        return panel;
    },

    /** Tab e Shift+Tab dão a volta dentro do painel. */
    trapBuildGuideFocus(event) {
        if (event.key !== 'Tab') return;
        const panel = document.getElementById('build-guide');
        const items = [...panel.querySelectorAll('button:not([disabled]), [tabindex="0"]')].filter(el => el.getClientRects().length);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    },

    openBuildGuide(category = this.buildModalCategory) {
        const guide = this.getBuildGuide(category);
        if (!guide) return false;
        const panel = this.ensureBuildGuide();
        const wasOpen = !panel.hidden;
        if (!wasOpen) this.buildGuideReturnFocus = document.activeElement;
        panel.dataset.category = category;
        panel.querySelector('#build-guide-box').innerHTML = this.renderBuildGuide(category, guide);
        panel.hidden = false;
        panel.querySelector('#build-guide-x')?.addEventListener('click', () => this.closeBuildGuide());
        panel.querySelector('#build-guide-ok')?.addEventListener('click', () => this.closeBuildGuide());
        panel.querySelectorAll('[data-guide-link]').forEach(button => button.addEventListener('click', () =>
            this.onBuildGuideLink(button.dataset.guideLink, button.dataset.guideId)));
        panel.querySelector('.build-guide-body')?.scrollTo?.(0, 0);
        panel.querySelector('#build-guide-ok')?.focus({ preventScroll: true });
        this.hideStudyTooltip?.();
        if (!wasOpen) AudioManager.playSound('sfx_book_open', 0.5);
        return true;
    },

    closeBuildGuide({ restoreFocus = true } = {}) {
        const panel = document.getElementById('build-guide');
        if (!panel || panel.hidden) return false;
        panel.hidden = true;
        AudioManager.playSound('sfx_book_close', 0.4);
        const back = this.buildGuideReturnFocus;
        this.buildGuideReturnFocus = null;
        if (restoreFocus && back?.isConnected && back.getClientRects().length) back.focus({ preventScroll: true });
        return true;
    },

    /** Atalhos: aula do livro (LESSON_CHAPTERS), aula rápida (TOPICS) ou guia (GUIDES); nenhum durante um tutorial. */
    getBuildGuideLinks(guide) {
        const tutorial = this.gameManager?.tutorialSystem;
        if (tutorial?.isActive || typeof TutorialSystem === 'undefined') return [];
        return (guide.links || []).map(link => {
            if (link.kind === 'lesson' && typeof LESSON_CHAPTERS !== 'undefined' && LESSON_CHAPTERS[link.id]) {
                return { ...link, icon: lessonIcon(link.id, 'sm'), label: `Ver aula: ${LESSON_CHAPTERS[link.id].title}` };
            }
            if (link.kind === 'topic' && TutorialSystem.TOPICS?.[link.id]) {
                return { ...link, icon: uiIcon('ui-book'), label: `Aula rápida: ${TutorialSystem.TOPICS[link.id].title}` };
            }
            const g = link.kind === 'guide' && (TutorialSystem.GUIDES || []).find(x => x.id === link.id);
            return g ? { ...link, icon: uiIcon('ui-compass'), label: `Guia: ${g.title}` } : null;
        }).filter(Boolean);
    },

    renderBuildGuide(category, guide) {
        const how = guide.how.map(item => `<li>${uiIcon(item.icon)}<span>${item.text}</span></li>`).join('');
        const chain = (guide.chain || []).map(c => {
            const word = c.trend === 'up' ? 'sobe' : 'desce';
            return `<li class="${c.good ? 'is-good' : 'is-bad'}">
                <span class="build-guide-act">${c.act}</span>
                <span class="build-guide-arrow" aria-hidden="true">→</span>
                <span class="build-guide-eff">${c.eff}</span>
                <span class="build-guide-trend build-guide-trend--${c.trend}">${c.trend === 'up' ? '▲' : '▼'} ${word}</span>
            </li>`;
        }).join('');
        const tips = guide.tips.map(t => `<li>${t}</li>`).join('');
        const links = this.getBuildGuideLinks(guide).map(l => `
            <button type="button" class="gda-btn gda-btn--secondary" data-guide-link="${l.kind}" data-guide-id="${l.id}">${l.icon}<span>${l.label}</span></button>`).join('');
        return `
            <header class="build-guide-head">
                <span class="build-guide-icon">${categoryIcon(category, 'lg')}</span>
                <div class="build-guide-titles">
                    <span class="gda-label">Como funciona</span>
                    <h3 id="build-guide-title">${guide.title}</h3>
                </div>
                <button type="button" class="build-guide-x" id="build-guide-x" aria-label="Fechar">✕</button>
            </header>
            <div class="build-guide-body" tabindex="0">
                <section class="build-guide-purpose">
                    <h4 class="gda-label">Para que serve</h4>
                    <p>${guide.purpose}</p>
                </section>
                <section>
                    <h4 class="gda-label">Como funciona no jogo</h4>
                    <ul class="build-guide-how">${how}</ul>
                </section>
                ${chain ? `<section>
                    <h4 class="gda-label">Causa e efeito</h4>
                    <ul class="build-guide-chain">${chain}</ul>
                </section>` : ''}
                <section>
                    <h4 class="gda-label">Dicas</h4>
                    <ol class="build-guide-tips">${tips}</ol>
                </section>
            </div>
            <footer class="build-guide-foot">
                ${links ? `<div class="build-guide-links">${links}</div>` : ''}
                <button type="button" class="gda-btn gda-btn--primary" id="build-guide-ok">Entendi</button>
            </footer>`;
    },

    /** "Ver aula" abre o livro da aula; aula rápida e guia rodam por cima do jogo (fecham o menu antes). */
    onBuildGuideLink(kind, id) {
        this.closeBuildGuide({ restoreFocus: false });
        this.closeBuildModal();
        if (kind === 'lesson') {
            if (!this.openLessonBook?.(Number(id))) this.showNotification('⏳ Não deu para abrir a aula agora.', 'warning', 3000);
            return;
        }
        const tutorial = this.gameManager?.tutorialSystem;
        const started = !tutorial?.isActive && (kind === 'guide' ? tutorial?.startGuide(id, { replay: true }) : tutorial?.startTopic(id));
        if (!started) this.showNotification('⏳ Feche o que estiver aberto e tente de novo.', 'warning', 3000);
    }
});
