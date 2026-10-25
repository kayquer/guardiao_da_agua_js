/**
 * UIManager — Eventos em andamento (#event-tracker, css/events.css)
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * Um cartão por evento ativo (com barra do tempo que falta para acabar) e por aviso de evento chegando
 * (barra até ele começar), com a resposta escolhida no modal do Secretário Paulo (ui/EventDecisionUI.js) ou o
 * botão "Decidir agora" se o anúncio ainda espera a decisão. Não pausa o jogo (não é popup):
 * fica no topo, no centro, e só os cartões recebem clique. Os cartões são criados uma vez por id e só
 * a barra/os segundos são atualizados, para o clique num botão não se perder numa nova renderização.
 */
mixin(UIManager, {
    getEventTracker() {
        let tracker = document.getElementById('event-tracker');
        if (!tracker) {
            tracker = document.createElement('div');
            tracker.id = 'event-tracker';
            tracker.className = 'event-tracker';
            tracker.setAttribute('role', 'region');
            tracker.setAttribute('aria-label', 'Eventos em andamento');
            (document.getElementById('game-screen') || document.body).appendChild(tracker);
        }
        return tracker;
    },

    /** Lista do que mostrar: avisos (kind 'warning') e eventos ativos com duração (kind 'active'). */
    getEventTrackerItems() {
        const es = this.gameManager?.eventSystem;
        if (!es) return [];
        // Anúncio esperando decisão com o modal aberto não vira cartão (o modal já mostra)
        const items = es.pendingEvents
            .filter(p => !(p.awaiting && this.eventDecisionPending?.id === p.id))
            .map(p => ({ kind: 'warning', holder: p, config: es.eventTypes.get(p.type), total: p.total }));
        es.activeEvents.forEach(e => {
            if (e.duration > 0) items.push({ kind: 'active', holder: e, config: e.config, total: e.duration });
        });
        return items.filter(i => i.config);
    },

    /** Segundos reais que faltam (o tempo do evento é de jogo: corre timeScale× mais rápido). */
    eventSecondsLeft(remainingMs) {
        return Math.max(0, Math.ceil(remainingMs / 1000 / (this.gameManager?.timeScale || 1)));
    },

    updateEventTracker() {
        const items = this.getEventTrackerItems();
        const tracker = document.getElementById('event-tracker') || (items.length ? this.getEventTracker() : null);
        if (!tracker) return;
        const alive = new Set(items.map(i => i.holder.id));
        tracker.querySelectorAll('.event-card').forEach(card => {
            if (!alive.has(card.dataset.eventId)) card.remove();
        });
        items.forEach(item => {
            let card = tracker.querySelector(`.event-card[data-event-id="${item.holder.id}"]`);
            const choiceKey = item.holder.choiceId || '';
            if (card && card.dataset.choice !== choiceKey) { card.remove(); card = null; }
            if (!card) {
                card = this.createEventCard(item);
                tracker.appendChild(card);
            }
            const fraction = item.total > 0 ? Math.max(0, Math.min(1, item.holder.remainingTime / item.total)) : 0;
            card.querySelector('.event-bar-fill').style.width = `${(fraction * 100).toFixed(1)}%`;
            const seconds = this.eventSecondsLeft(item.holder.remainingTime);
            card.querySelector('.event-time').textContent = item.holder.awaiting ? 'esperando você'
                : item.kind === 'warning' ? `chega em ${seconds} s` : `termina em ${seconds} s`;
            card.querySelector('.event-bar').setAttribute('aria-valuenow', String(seconds));
        });
    },

    createEventCard({ kind, holder, config }) {
        const es = this.gameManager.eventSystem;
        const card = document.createElement('div');
        const tone = config.severity === 'positive' ? 'good' : config.severity === 'high' ? 'bad' : 'mid';
        card.className = `event-card ${kind} ${tone}`;
        card.dataset.eventId = holder.id;
        card.dataset.eventType = holder.type;
        card.dataset.choice = holder.choiceId || '';

        const chosen = es.getResponseOption(config, holder.choiceId);
        let choicesHtml = '';
        if (chosen) {
            choicesHtml = `<div class="event-chosen">✔ ${chosen.label}${holder.choiceAuto ? ' (sem resposta: ficou "não fazer nada")' : ''}</div>`;
        } else if (holder.awaiting) {
            choicesHtml = `<div class="event-choices"><button class="event-choice-btn" data-decide="1">🌿 Decidir agora</button></div>`;
        }

        card.innerHTML = `
            <div class="event-head">
                <span class="event-icon" aria-hidden="true">${uiIcon(config.icon)}</span>
                <span class="event-name">${kind === 'warning' ? 'Previsão: ' : ''}${config.name}</span>
                <span class="event-time"></span>
            </div>
            <div class="event-bar" role="progressbar" aria-label="${kind === 'warning' ? 'Tempo até começar' : 'Tempo até terminar'}: ${config.name}"
                aria-valuemin="0" aria-valuenow="0"><span class="event-bar-fill"></span></div>
            ${choicesHtml}`;

        card.querySelector('[data-decide]')?.addEventListener('click', e => {
            e.stopPropagation();
            this.showEventDecision(holder);
        });
        return card;
    }
});
