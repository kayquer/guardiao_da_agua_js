/**
 * UIManager — Painéis das árvores: árvore NATIVA selecionada (showNativeTreeInfo) e as linhas da árvore
 * PLANTADA no painel do prédio (generatePlantedTreeStats: etapa, barra, tempo até a próxima etapa e efeito).
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 * Regras do crescimento: js/systems/building/TreeGrowth.js; árvores nativas: js/systems/TreeSystem.js.
 */
mixin(UIManager, {
    /** Linhas da árvore plantada no painel do prédio (vazio para os outros prédios). */
    generatePlantedTreeStats(building) {
        const bs = this.gameManager?.buildingSystem;
        if (!bs?.isPlantedTree?.(building)) return '';
        const fmt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
        const tag = `<div class="stat-item tree-kind" data-tree-kind="planted">${buildingIcon('tree_sapling')} Árvore plantada por você (tutor de madeira e copa verde-clara)</div>`;
        const stage = bs.getTreeStage(building);
        if (stage === null) {
            const first = building.config.treeStages[0];
            return `${tag}<div class="stat-item">⛏️ Abrindo a cova: quando a muda for plantada vai precisar de rega (${fmt(first.waterConsumption)} L/min).</div>`;
        }
        const data = building.config.treeStages[stage];
        const percent = Math.round(bs.getTreeStageProgress(building) * 100);
        const growth = bs.describeTreeGrowth(building);
        const effect = data.waterConsumption > 0
            ? `<div class="stat-item tree-effect" data-effect="water">🚰 Rega da muda: consome ${fmt(data.waterConsumption)} L/min de água (ainda não limpa o ar)</div>`
            : `<div class="stat-item tree-effect" data-effect="pollution">🌿 Limpa o ar: -${fmt(data.pollutionReduction)} de poluição/min (não precisa mais de rega)</div>`;
        return `
            ${tag}
            <div class="stat-item tree-stage" data-tree-stage="${stage}">🌳 Etapa: ${data.name} (${stage + 1}/4)</div>
            <div class="tree-stage-track" style="height:8px;border-radius:4px;background:rgba(0,0,0,0.25);margin:2px 0 6px;overflow:hidden">
                <div id="tree-stage-bar-${building.id}" class="tree-stage-bar" style="height:100%;width:${percent}%;background:${building.config.color || '#7CB342'};transition:width 0.4s"></div>
            </div>
            <div class="stat-item tree-stage-eta">⏱️ <span id="tree-stage-eta-${building.id}">${growth ? growth.eta : 'Árvore madura: crescimento completo'}</span></div>
            <div id="tree-stage-why-${building.id}" class="tree-stage-why" style="font-size:0.85em;opacity:0.8;margin:-2px 0 4px">${growth?.reason || ''}</div>
            ${effect}`;
    },

    /** Linha das árvores plantadas no painel de poluição (vazio se não há nenhuma pronta). */
    plantedTreesLine() {
        const summary = this.gameManager?.buildingSystem?.getPlantedTreeSummary?.();
        if (!summary?.count) return '';
        const saplings = summary.saplings ? ` (${summary.saplings} ainda ${summary.saplings === 1 ? 'muda' : 'mudas'}, bebendo ${this.formatNumber(summary.water, 1)} L/min)` : '';
        return `
                        <li class="planted-trees-line">
                            <span class="building-icon">${buildingIcon('tree_sapling')}</span>
                            <span class="building-name">${summary.count} ${summary.count === 1 ? 'árvore plantada' : 'árvores plantadas'}${saplings}</span>
                            <span class="building-production">-${this.formatNumber(summary.pollution, 1)}%/min</span>
                        </li>`;
    },

    /** Painel de uma árvore nativa clicada (TreeSystem.selectAt → getNativeTreeInfo). */
    showNativeTreeInfo(info) {
        const detailsPanel = this.elements.detailsPanel;
        const detailsContent = this.elements.detailsContent;
        if (!detailsPanel || !detailsContent || !info) return;
        const fmt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

        // uiIconsIn: os emojis do painel viram os ícones SVG, como no painel de prédio (só texto fixo + números aqui)
        detailsContent.innerHTML = uiIconsIn(`
            <div class="building-selection-info tree-info" id="native-tree-info" data-tree-kind="native">
                <div class="selection-header">
                    <h3>🌳 Árvore nativa</h3>
                    <button class="deselect-btn" data-action="deselect">${uiIcon('ui-close')} Desselecionar</button>
                </div>
                <div class="building-details">
                    <div class="detail-row">
                        <span class="detail-label">Origem:</span>
                        <span class="detail-value">Nativa: já crescia aqui antes da cidade</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Posição:</span>
                        <span class="detail-value">(${info.gridX}, ${info.gridZ})</span>
                    </div>
                </div>
                <div class="building-stats">
                    <div class="stat-item tree-effect" data-effect="pollution">🌿 Limpa o ar: -${fmt(info.pollutionReduction)} de poluição/min</div>
                    <div class="stat-item">💧 Não gasta água da cidade: já tem raízes fundas</div>
                    <div class="stat-item">😊 Deixa a cidade mais verde (moradores mais satisfeitos)</div>
                    <div class="stat-item">🌲 ${info.count} árvores nativas em pé no mapa</div>
                    <div class="stat-item tree-warning">🪓 Construir em cima derruba esta árvore: a poluição sobe na hora (+${fmt(info.fellPollution)}%) e a cidade fica menos verde.</div>
                    <div class="stat-note">Quer mais verde? Plante uma ${buildingIcon('tree_sapling')} Muda de Árvore (categoria Tratamento).</div>
                </div>
            </div>`);
        detailsPanel.style.display = 'flex';
        this.updatePanelState('selection'); // Esc e "Desselecionar" fecham como a seleção de prédio
        this.showHudRight();

        const button = detailsContent.querySelector('.deselect-btn');
        const close = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.gameManager.deselectBuilding();
            if (this.isMobile) this.closeMobilePanel?.('right');
        };
        button?.addEventListener('click', close);
        button?.addEventListener('touchend', close, { passive: false });
    }
});
