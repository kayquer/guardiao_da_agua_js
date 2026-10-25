/**
 * TutorialSystem — guias de socorro: um recurso caindo sem parar por um minuto de jogo (DeclineWatch) e o jogador
 * sem começar nada que ajude → a Cláudia abre um guia curto (coach, congela o jogo enquanto fala) com a causa em
 * números de agora e 2-3 construções clicáveis que resolvem (js/data/rescueGuides.js). "Agora não" fecha.
 * Volta a aparecer, mas espaçado: RESCUE_COOLDOWN_MS por recurso e RESCUE_GAP_MS entre quaisquer dois.
 * Chamado por checkGuides (a cada 2 s, só com o jogo rodando e nada na frente) quando nenhum guia progressivo abriu.
 */
mixin(TutorialSystem, {
    RESCUE_COOLDOWN_MS: 360000,
    RESCUE_GAP_MS: 150000,

    checkRescue() {
        const gm = this.gameManager;
        if (typeof RESCUE_GUIDES === 'undefined' || gm.tutorialDone === false) return false;
        const now = gm.buildingSystem?.simNow?.();
        const resources = gm.resourceManager?.resources;
        if (!Number.isFinite(now) || !resources) return false;
        this.declineWatch = this.declineWatch || new DeclineWatch();
        this.rescueShownAt = this.rescueShownAt || {};
        this.declineWatch.sample(resources, now);
        if (now - (this.lastRescueAt ?? -Infinity) < this.RESCUE_GAP_MS) return false;

        const id = this.declineWatch.declining().find(key =>
            now - (this.rescueShownAt[key] ?? -Infinity) >= this.RESCUE_COOLDOWN_MS && this.rescueApplies(key, now));
        if (!id) return false;
        const steps = this.buildRescueSteps(id);
        if (!steps) return false;
        this.rescueShownAt[id] = now;
        this.lastRescueAt = now;
        this.declineWatch.reset();
        this.startRescue(id, steps);
        return true;
    },

    /** O socorro faz sentido agora? Não se o jogador já está resolvendo ou se outro aviso cuida disso. */
    rescueApplies(id, now) {
        const gm = this.gameManager;
        const rm = gm.resourceManager;
        // a 1ª falta de energia tem o guia próprio (GUIDES.energy)
        if (id === 'energy' && !TutorialSystem.guidesDone().includes('energy')) return false;
        // dinheiro caindo por causa de construções não é "caindo sozinho": só com saldo por minuto negativo
        if (id === 'budget' && (rm.resources.budget.income || 0) - (rm.resources.budget.expenses || 0) >= 0) return false;
        const helps = TutorialSystem.RESCUE_HELPS[id];
        const windowMs = this.declineWatch.windowMs;
        return !gm.buildingSystem.getAllBuildings().some(b => b.config && !b.config.roadType && helps(b.config, b) &&
            (b.underConstruction || (b.constructionStartTime || 0) >= now - windowMs));
    },

    /** Passos do guia: causa com números e o que construir. null se não há nada para sugerir. */
    buildRescueSteps(id) {
        const def = RESCUE_GUIDES[id];
        const picks = this.pickRescueSuggestions(def);
        if (!def || !picks.length) return null;
        const list = picks.map(p => `<li><a href="#" class="rescue-link" data-build="${p.id}" onclick="event.preventDefault(); window.gameManager.tutorialSystem.rescueBuild('${p.id}')">${p.icon} ${p.name}</a> <small>R$ ${p.cost.toLocaleString('pt-BR')}${p.locked ? ' · 📖 estude para liberar' : ''}</small><br>${p.why}</li>`).join('');
        return [
            { title: def.title, expression: 'worried', text: `${this.rescueCause(id)} Já faz um minuto que só piora, {nome}.`, targets: def.targets },
            {
                title: 'O que construir agora', nextLabel: 'Entendi',
                text: `Clique em uma destas para ir direto a ela:<ul class="rescue-list">${list}</ul>💡 ${def.tip}`,
                targets: [`.category-btn[data-category="${def.category}"]`]
            }
        ];
    },

    /** Até 3 prédios da lista: visíveis e com a tecnologia já alcançada (estudo pendente pode). */
    pickRescueSuggestions(def) {
        const gm = this.gameManager;
        const types = gm.buildingSystem?.buildingTypes;
        const study = gm.studySystem;
        if (!def || !types) return [];
        return def.suggest.filter(s => {
            const type = types.get(s.id);
            if (!type || (typeof FEATURE_FLAGS !== 'undefined' && !FEATURE_FLAGS.isBuildingVisible(s.id))) return false;
            return !study?.isTechReached || study.isTechReached(s.id);
        }).slice(0, 3).map(s => {
            const type = types.get(s.id);
            return { ...s, name: type.name, icon: type.icon || '🏗️', cost: type.cost || 0, locked: study?.isBuildingUnlocked ? !study.isBuildingUnlocked(s.id) : false };
        });
    },

    /** Primeira frase: o porquê, com os números de agora. */
    rescueCause(id) {
        const rm = this.gameManager.resourceManager;
        const r = rm.resources;
        const n = v => Math.round(v).toLocaleString('pt-BR');
        switch (id) {
            case 'water': {
                const { production, demand } = rm.getWaterBalance();
                const energy = (r.electricity?.efficiency ?? 1) < 1 ? ' E falta energia: as bombas estão trabalhando devagar.' : '';
                return `A cidade gasta <b>${n(demand)} L/min</b> e produz só <b>${n(production)} L/min</b>: a caixa d'água está esvaziando.${energy}`;
            }
            case 'energy':
                return `As usinas geram <b>${n(r.electricity?.generation || 0)} MW</b>, mas a cidade usa <b>${n(r.electricity?.consumption || 0)} MW</b>. Todos os prédios estão trabalhando mais devagar.`;
            case 'pollution': {
                const p = rm.getPollutionBalance();
                return `A cidade suja <b>${n(p.sources + p.sewage)}</b> por minuto (fábricas, lixo e esgoto) e limpa só <b>${n(p.reduction)}</b>.`;
            }
            case 'budget':
                return `Entram <b>R$ ${n(r.budget.income || 0)}</b> por minuto e saem <b>R$ ${n(r.budget.expenses || 0)}</b> com manutenção: o caixa está diminuindo.`;
            case 'satisfaction':
            case 'population': {
                const bad = (rm.getSatisfactionFactors?.() || []).filter(f => f.value < 0).sort((a, b) => a.value - b.value).slice(0, 2);
                const why = bad.length ? ` O que mais incomoda: <b>${bad.map(f => `${f.icon} ${f.label.toLowerCase()}`).join('</b> e <b>')}</b>.` : '';
                return id === 'population'
                    ? `A população está diminuindo: quando falta água, energia ou casa, as famílias vão embora.${why}`
                    : `A satisfação está caindo.${why}`;
            }
            default:
                return '';
        }
    },

    startRescue(id, steps) {
        const gm = this.gameManager;
        const def = RESCUE_GUIDES[id];
        if (this.isActive || gm.gameState !== 'playing') return false;
        gm.uiManager.closeResourcePanel?.();
        const all = steps.map(s => ({
            mode: 'coach', group: 'rescue', chapter: `rescue_${id}`, character: 'Claudia',
            icon: def.icon, lessonLabel: `Socorro · ${def.title}`, skipLabel: 'Agora não', ...s
        }));
        gm.gameState = 'tutorial';
        this.rescueId = id;
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('rescue_guide', { target: id });
        this.begin(all, 'rescue');
        return true;
    },

    /** Link de uma sugestão: fecha o guia e mostra o prédio no menu de construção. */
    rescueBuild(typeId) {
        this.complete();
        this.gameManager.uiManager?.focusBuildingItem(typeId);
    }
});

// O que conta como "o jogador já está resolvendo" (obra em andamento ou começada dentro da janela do vigia)
TutorialSystem.RESCUE_HELPS = {
    water: c => c.waterProduction > 0 || c.waterStorage > 0,
    energy: c => c.powerGeneration > 0,
    pollution: (c, b) => c.pollutionReduction > 0 || b.type === 'tree_sapling',
    budget: c => c.incomeGeneration > 0 || /^(commercial|industrial|residential)/.test(c.zoneType || ''),
    satisfaction: (c, b) => c.satisfactionBonus > 0 || b.type === 'tree_sapling',
    population: c => /^residential/.test(c.zoneType || '') || c.populationCapacity > 0
};
