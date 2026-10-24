/**
 * UIManager — Decisão de evento com o Secretário de Meio Ambiente Paulo (#event-decision, css/event-decision.css)
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * Quando o EventSystem anuncia um evento com `response` (announceEvent), o anúncio entra na fila
 * (queueEventDecision) e o modal abre assim que nada mais importante estiver na tela (tutorial, livro, alerta):
 * o Paulo explica a situação e mostra 4 cartas — a melhor (custa mais e às vezes pede um prédio), a do meio, a
 * barata e "não fazer nada" — com o que cada uma faz (estrago evitado e duração, ou quanto se aproveita).
 * É popup de decisão: pausa o jogo (isInfoPopupOpen) e não fecha pelo Esc. Teclas 1-4 escolhem.
 */
const PAULO = 'Secretário Paulo';

mixin(UIManager, {
    queueEventDecision(pending) {
        if (!pending) return;
        this.eventDecisionQueue ||= [];
        if (!this.eventDecisionQueue.some(p => p.id === pending.id)) this.eventDecisionQueue.push(pending);
        this.flushEventDecisions();
    },

    /** Abre o próximo anúncio da fila quando a tela está livre (UIManager.update, a cada 200 ms). */
    flushEventDecisions() {
        if (this.eventDecisionPending || !this.eventDecisionQueue?.length) return;
        const es = this.gameManager?.eventSystem;
        this.eventDecisionQueue = this.eventDecisionQueue.filter(p => p.awaiting && es?.pendingEvents.includes(p));
        const next = this.eventDecisionQueue[0];
        if (!next || !this.canShowEventDecision()) return;
        this.showEventDecision(next);
    },

    /** Jogo rodando e nada de leitura, tutorial ou diálogo na frente. */
    canShowEventDecision() {
        const gm = this.gameManager;
        return gm?.gameState === 'playing' && !gm.tutorialSystem?.isActive && !this.isReadingOverlayOpen()
            && !document.querySelector('.swal2-container, .central-alert-overlay, #pause-overlay:not(.hidden)')
            && !this.isTechTreeOpen?.();
    },

    getEventDecisionModal() {
        let modal = document.getElementById('event-decision');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'event-decision';
            modal.className = 'event-decision';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'event-decision-title');
            (document.getElementById('game-screen') || document.body).appendChild(modal);
            this.onEventDecisionKey = event => {
                if (!this.eventDecisionPending || event.repeat) return;
                const index = Number(event.key) - 1;
                const button = modal.querySelectorAll('.decision-option')[index];
                if (button && !button.disabled) {
                    event.preventDefault();
                    button.click();
                }
            };
            document.addEventListener('keydown', this.onEventDecisionKey);
        }
        return modal;
    },

    /** Retrato animado do Paulo (rosto); sem as imagens ainda, o avatar com emoji. */
    createPauloPortrait(scope) {
        const id = TutorialSystem.CHARACTERS[PAULO]?.id;
        if (id && typeof PORTRAIT_MANIFEST !== 'undefined' && PORTRAIT_MANIFEST[id]) {
            const portrait = new AnimatedPortrait(id, { crop: 'face', label: PAULO, speechScope: scope });
            return { el: portrait.el, portrait };
        }
        const img = document.createElement('img');
        img.src = TutorialSystem.avatarOf(PAULO);
        img.alt = PAULO;
        img.className = 'decision-avatar-img';
        return { el: img, portrait: null };
    },

    showEventDecision(pending) {
        const es = this.gameManager.eventSystem;
        const config = es?.eventTypes.get(pending.type);
        if (!config?.response || !pending.awaiting) return;
        this.closeEventDecision({ silent: true });
        this.eventDecisionPending = pending;
        if (this.gameManager.buildMode) this.gameManager.exitBuildMode();
        this.dismissBuildModal?.();

        const modal = this.getEventDecisionModal();
        const threat = config.response.kind !== 'opportunity';
        const intro = PlayerProfile.personalize(config.response.intro || config.description);
        const seconds = pending.total > 0 ? Math.round(pending.total / 1000 / (this.gameManager.timeScale || 1)) : 0;
        const when = threat
            ? (seconds ? `Chega em ~${seconds} s depois da sua decisão: dá tempo de se preparar.` : 'Começa assim que você decidir.')
            : 'Quanto melhor a resposta, mais a cidade ganha.';

        modal.innerHTML = `
            <div class="decision-box ${threat ? 'threat' : 'opportunity'}">
                <div class="decision-head">
                    <div class="decision-avatar"></div>
                    <div class="decision-speech">
                        <div class="decision-who">${PAULO} <small>· Secretaria Municipal de Meio Ambiente</small></div>
                        <h3 id="event-decision-title"><span aria-hidden="true">${config.icon}</span> ${config.name}
                            <span class="decision-kind">${threat ? 'Ameaça' : 'Oportunidade'}</span></h3>
                        <p class="decision-intro">${intro}</p>
                        <p class="decision-when">${when}</p>
                    </div>
                    <button class="read-aloud-btn decision-read" type="button" aria-label="Ouvir">🔊</button>
                </div>
                <div class="decision-options">${config.response.options.map((o, i) => this.renderDecisionOption(o, i, threat)).join('')}</div>
                <p class="decision-foot">${this.describeDecisionStreak()}</p>
            </div>`;

        const { el, portrait } = this.createPauloPortrait(modal);
        modal.querySelector('.decision-avatar').appendChild(el);
        this.eventDecisionPortrait = portrait;
        portrait?.setExpression(threat ? 'worried' : 'happy');
        portrait?.talk?.(2500);
        setTimeout(() => AudioManager.onSpeaker('paulo', threat ? 'worried' : 'happy'), 450); // depois do som do modal
        setupReadAloud(modal.querySelector('.decision-read'), () => `${config.name}. ${intro.replace(/<[^>]+>/g, '')}`);

        modal.querySelectorAll('.decision-option').forEach(button => button.addEventListener('click', () => {
            const ok = es.chooseResponse(pending.id, button.dataset.option);
            if (!ok) {
                AudioManager.playSound('sfx_ui_error', 0.6);
                return;
            }
            const option = es.getResponseOption(config, button.dataset.option);
            AudioManager.playSound(option.tier === 'none' ? 'sfx_ui_click' : 'sfx_ui_success', 0.7);
            if (option.tier !== 'none') this.showNotification(`🌿 ${PAULO}: combinado, "${option.label}"!`, 'success', 4000);
            this.closeEventDecision();
        }));

        modal.classList.add('open');
        this.syncPopupPause(); // pausa já (a sincronização periódica só roda a cada 200 ms)
        AudioManager.playSound('sfx_modal_open', 0.6);
        modal.querySelector('.decision-option:not([disabled])')?.focus({ preventScroll: true });
    },

    /** Uma carta: nível, ação, custo, o que muda (estrago/duração ou aproveitamento), reputação e o que falta. */
    renderDecisionOption(option, index, threat) {
        const es = this.gameManager.eventSystem;
        const { ok, missing, short } = es.getOptionAvailability(option);
        const tiers = { max: ['★★★', 'Melhor resposta'], mid: ['★★', 'Boa resposta'], low: ['★', 'Resposta fraca'], none: ['✖', 'Sem ação'] };
        const [stars, tierName] = tiers[option.tier] || ['', ''];
        const pct = n => `${Math.round(n * 100)}%`;
        const chips = [];
        if (threat) {
            if (option.tier !== 'none') {
                chips.push(`<span class="chip good">Estrago −${pct(1 - (option.impact ?? 1))}</span>`);
                chips.push(`<span class="chip good">Dura −${pct(1 - (option.duration ?? 1))}</span>`);
            } else chips.push('<span class="chip bad">Estrago e duração inteiros</span>');
        } else {
            chips.push(option.gain > 0 ? `<span class="chip good">Aproveita ${pct(option.gain)}</span>` : '<span class="chip bad">Perde a oportunidade</span>');
        }
        if (option.instant?.budget) chips.push(`<span class="chip good">+R$ ${option.instant.budget.toLocaleString('pt-BR')}</span>`);
        if (option.instant?.water) chips.push(`<span class="chip good">+${option.instant.water} L de água</span>`);
        const stake = QuestSystem.STAKEHOLDERS || {};
        Object.entries(option.reputation || {}).forEach(([key, value]) => {
            chips.push(`<span class="chip ${value > 0 ? 'good' : 'bad'}">${stake[key]?.icon || ''} ${value > 0 ? '+' : ''}${value}</span>`);
        });
        const lock = missing.length ? `🔒 Precisa de: ${missing.join(', ')}` : short > 0 ? `💰 Falta R$ ${Math.ceil(short).toLocaleString('pt-BR')}` : '';
        return `<button class="decision-option tier-${option.tier}" type="button" data-option="${option.id}" ${ok ? '' : 'disabled'}>
            <span class="decision-key" aria-hidden="true">${index + 1}</span>
            <span class="decision-tier"><b>${stars}</b> ${tierName}</span>
            <span class="decision-label">${option.label}</span>
            <span class="decision-detail">${option.detail || ''}</span>
            <span class="decision-chips">${chips.join('')}</span>
            <span class="decision-cost">${option.cost ? `R$ ${option.cost.toLocaleString('pt-BR')}` : 'Sem custo'}</span>
            ${lock ? `<span class="decision-lock">${lock}</span>` : ''}
        </button>`;
    },

    /** Rodapé: a sequência de boas decisões até o próximo prêmio (meta curta e visível). */
    describeDecisionStreak() {
        const st = this.gameManager.eventSystem?.responseStats;
        if (!st) return '';
        const goal = EventSystem.STREAK_BONUS;
        const left = goal - (st.streak % goal);
        return `🏅 Boas decisões seguidas: <b>${st.streak}</b>. Mais ${left} ${left === 1 ? 'boa decisão' : 'boas decisões'} e o governo manda R$ ${EventSystem.STREAK_REWARD.toLocaleString('pt-BR')} de prêmio.`;
    },

    isEventDecisionOpen() {
        return !!document.getElementById('event-decision')?.classList.contains('open');
    },

    closeEventDecision({ silent = false } = {}) {
        const modal = document.getElementById('event-decision');
        if (modal) {
            modal.classList.remove('open');
            modal.innerHTML = '';
        }
        stopSpeaking();
        this.eventDecisionPortrait?.destroy();
        this.eventDecisionPortrait = null;
        const done = this.eventDecisionPending;
        this.eventDecisionPending = null;
        if (done) this.eventDecisionQueue = (this.eventDecisionQueue || []).filter(p => p.id !== done.id);
        if (!silent) this.updateEventTracker();
    }
});
