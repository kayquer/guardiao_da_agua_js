/**
 * Desafios da cidade (QuestSystem partial): quando não há missão nenhuma (a campanha acabou ou a última falhou),
 * depois de CITY_CHALLENGE_DELAY_MS de jogo surge um desafio novo, medido pela cidade de agora: crescer sem sujar,
 * recarregar o aquífero, aguentar uma seca, deixar os moradores felizes ou construir uma tecnologia nova.
 * Os desafios usam só tipos de objetivo que o QuestSystem mede (build, resource, sustained, survival, avoid).
 * Ficam no save (quests.cityChallenges), porque não estão em js/data/missions.js.
 */
mixin(QuestSystem, {
    CITY_CHALLENGE_DELAY_MS: 30000,

    getCityChallengeState() {
        if (!this.cityChallenge) this.cityChallenge = { count: 0, idleSince: null, generated: {} };
        return this.cityChallenge;
    },

    /** Chamado pelo update (4×/s): conta o tempo sem missão e cria o próximo desafio. */
    updateCityChallenges() {
        const gm = this.gameManager;
        if (gm?.gameState !== 'playing' || !gm.tutorialDone) return;
        const state = this.getCityChallengeState();
        if (this.activeQuests.size > 0) {
            state.idleSince = null;
            return;
        }
        const now = this.simNow();
        if (state.idleSince === null) state.idleSince = now;
        if (now - state.idleSince < this.CITY_CHALLENGE_DELAY_MS) return;
        state.idleSince = null;
        this.createCityChallenge();
    },

    /** Cria e registra o próximo desafio (addQuest já o ativa). Devolve o id ou null. */
    createCityChallenge() {
        const state = this.getCityChallengeState();
        const n = state.count + 1;
        const config = this.buildCityChallenge(n);
        if (!config) return null;
        const id = `city_challenge_${n}`;
        state.count = n;
        state.generated[id] = structuredClone(config);
        this.addQuest(id, structuredClone(config));
        this.gameManager.uiManager?.showNotification(`🏙️ ${config.title}`, 'info', 6000);
        return id;
    },

    /** Monta o desafio n: os modelos se revezam e pulam os que não fazem sentido para a cidade de agora. */
    buildCityChallenge(n) {
        const templates = ['growth', 'aquifer', 'drought', 'satisfaction', 'technology', 'river'];
        const r = this.gameManager.resourceManager?.resources;
        if (!r) return null;
        for (let i = 0; i < templates.length; i++) {
            const kind = templates[(n - 1 + i) % templates.length];
            const challenge = this.cityChallengeTemplate(kind, n, r);
            if (!challenge) continue;
            const income = r.budget?.income || 0;
            return {
                title: `Desafio da cidade ${n}: ${challenge.name}`,
                description: challenge.description,
                type: 'main',
                category: 'primary',
                missionIcon: 'ui-target',
                generated: true,
                challengeKind: kind,
                prerequisites: [],
                objectives: challenge.objectives,
                starSpec: challenge.starSpec,
                ...(challenge.startEvent ? { startEvent: challenge.startEvent } : {}),
                rewards: { score: 300, budget: Math.max(3000, Math.round(income * 4 / 500) * 500) }
            };
        }
        return null;
    },

    cityChallengeTemplate(kind, n, r) {
        const goal = (id, description, extra) => ({ id, description, current: 0, ...extra });
        switch (kind) {
            case 'growth': {
                const pop = Math.round(r.population?.current || 0);
                const target = Math.max(pop + 100, Math.ceil(pop * 1.25 / 50) * 50);
                return {
                    name: 'Crescer sem sujar o rio',
                    description: `Mais gente quer morar aqui. Chegue a ${target} moradores sem deixar a poluição passar de 30%.`,
                    objectives: [
                        goal('grow', `Chegar a ${target} moradores`, { type: 'resource', target: 'population', required: target, comparison: 'greater' }),
                        goal('clean', 'Manter a poluição abaixo de 30%', { type: 'resource', target: 'pollution', required: 30, comparison: 'less' })
                    ],
                    starSpec: { parMs: 600000 }
                };
            }
            case 'aquifer': {
                const aquifer = Number.isFinite(r.water?.aquifer) ? r.water.aquifer : 100;
                if (aquifer >= 90) return null; // já está cheio: o desafio seria de graça
                const target = Math.min(95, Math.max(60, Math.ceil((aquifer + 10) / 5) * 5));
                const storage = r.water?.storage || r.water?.max || 1000;
                const reserve = Math.max(600, Math.round(storage * 0.6 / 100) * 100);
                return {
                    name: 'Água debaixo da terra',
                    description: `O aquífero está em ${Math.round(aquifer)}%. Recarregue até ${target}% (menos bombas, mais verde, jardins de chuva) e guarde ${reserve} L na reserva.`,
                    objectives: [
                        goal('aquifer', `Aquífero acima de ${target}%`, { type: 'resource', target: 'aquifer', required: target, comparison: 'greater' }),
                        goal('reserve', `Guardar ${reserve} L de água`, { type: 'resource', target: 'water', required: reserve, comparison: 'greater' })
                    ],
                    starSpec: { parMs: 480000 }
                };
            }
            case 'river': {
                // Só com ETA captando (sem ela o rio não baixa) e o rio abaixo de 90%
                const river = Number.isFinite(r.water?.river) ? r.water.river : 100;
                if (river >= 90 || !(r.water?.surfaceProduction > 0)) return null;
                const target = Math.min(95, Math.max(60, Math.ceil((river + 10) / 5) * 5));
                return {
                    name: 'Rio cheio de novo',
                    description: `Os rios estão em ${Math.round(river)}%. Deixe o nível subir até ${target}%: trate o esgoto (ETE) para devolver água limpa ao rio e não capte mais do que ele aguenta.`,
                    objectives: [
                        goal('river', `Rios acima de ${target}%`, { type: 'resource', target: 'river', required: target, comparison: 'greater' }),
                        goal('clean', 'Manter a poluição abaixo de 40%', { type: 'resource', target: 'pollution', required: 40, comparison: 'less' })
                    ],
                    starSpec: { parMs: 480000 }
                };
            }
            case 'drought': {
                const es = this.gameManager.eventSystem;
                const busy = ['drought', 'flood', 'heavy_rain'].some(t => es?.hasActiveEventOfType?.(t) || es?.pendingEvents?.some(p => p.type === t));
                if (!es || busy) return null;
                const durationMs = 120000 + 30000 * Math.min(4, n - 1); // cada seca do jogo livre dura um pouco mais
                const minutes = Math.round(durationMs / 60000 * 10) / 10;
                return {
                    name: 'Teste de seca',
                    description: `Uma seca de ${String(minutes).replace('.', ',')} min vai testar a cidade: as bombas e poços produzem metade. Não deixe a água faltar.`,
                    objectives: [
                        goal('survive', `Aguentar ${String(minutes).replace('.', ',')} min de seca`, { type: 'survival', target: 'time', required: durationMs / 1000 }),
                        goal('no_shortage', 'Não deixar faltar água', { type: 'avoid', target: 'water_shortage', required: 0 })
                    ],
                    startEvent: { type: 'drought', durationMs },
                    starSpec: { minWater: 0.3 }
                };
            }
            case 'satisfaction': {
                const sat = r.population?.satisfaction || 0;
                const target = Math.min(90, Math.max(70, Math.round(sat / 5) * 5 + 10));
                return {
                    name: 'Cidade feliz',
                    description: `Deixe os moradores mais felizes: satisfação acima de ${target}% por 2 minutos seguidos.`,
                    objectives: [
                        goal('happy', `Satisfação acima de ${target}% por 2 minutos`, { type: 'sustained', target: 'satisfaction', required: 120, threshold: target })
                    ],
                    starSpec: { parMs: 360000 }
                };
            }
            case 'technology': {
                const type = this.pickChallengeBuilding();
                if (!type) return null;
                return {
                    name: `Tecnologia nova: ${type.name}`,
                    description: `A cidade já sabe construir ${type.name}, mas ainda não tem nenhum. Construa um e veja o que muda.`,
                    objectives: [
                        goal('build_new', `Construir 1 ${type.name}`, { type: 'build', target: type.id, required: 1 })
                    ],
                    starSpec: { parMs: 600000 }
                };
            }
        }
        return null;
    },

    /** Prédio liberado (tecnologia + estudo), visível, que a cidade ainda não tem: o de nível mais alto. */
    pickChallengeBuilding() {
        const bs = this.gameManager.buildingSystem;
        const study = this.gameManager.studySystem;
        if (!bs?.buildingTypes) return null;
        const candidates = [...bs.buildingTypes.values()].filter(t =>
            !t.roadType && !t.zoneType && t.id !== 'city_hall' &&
            (typeof FEATURE_FLAGS === 'undefined' || FEATURE_FLAGS.isBuildingVisible(t.id)) &&
            (!study || study.isBuildingUnlocked(t.id)) &&
            bs.getBuildingsByType(t.id).length === 0);
        candidates.sort((a, b) => (b.tier || 1) - (a.tier || 1) || a.cost - b.cost);
        return candidates[0] || null;
    },

    getCityChallengeSaveData() {
        const state = this.getCityChallengeState();
        return { count: state.count, generated: structuredClone(state.generated) };
    },

    /** Antes do estado das missões (QuestSystem.loadData): recria os desafios gerados na partida. */
    loadCityChallenges(data) {
        const state = this.getCityChallengeState();
        if (!data) return;
        state.count = data.count || 0;
        state.generated = data.generated || {};
        for (const [id, config] of Object.entries(state.generated)) {
            if (!this.quests.has(id)) this.addQuest(id, structuredClone(config));
        }
    }
});
