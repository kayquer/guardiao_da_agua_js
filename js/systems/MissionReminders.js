/**
 * QuestSystem — a missão principal não some de vista (as missões tinham ido para segundo plano: a barra se
 * esconde sozinha e nada lembrava delas).
 * - Progresso: cada prédio a mais numa meta "construir" e cada meta cumprida viram um aviso curto com o que falta.
 * - Lembrete: missão parada por MISSION_REMIND_MS de tempo de jogo → aviso com o que falta, botões "Construir"
 *   (vai direto ao prédio da meta) e "Ver missão", e a barra de missão aparece de novo com o 🎯 pulsando.
 *   Cada lembrete seguido espera um pouco mais (até MISSION_REMIND_MAX_MS), para ajudar sem encher o saco.
 * Tempo de jogo (simNow): pausa, popups e tutoriais não contam como "parado".
 */
mixin(QuestSystem, {
    MISSION_REMIND_MS: 150000,
    MISSION_REMIND_MAX_MS: 360000,
    MISSION_PROGRESS_TOAST_GAP_MS: 8000,

    /** Chamado por QuestSystem.update (4×/s). */
    updateMissionReminders() {
        const gm = this.gameManager;
        const ui = gm.uiManager;
        if (!ui || gm.gameState !== 'playing' || gm.tutorialDone === false || gm.tutorialSystem?.isActive) return;
        const quest = this.getFocusQuest();
        if (!quest) {
            this.missionWatch = null;
            return;
        }
        const now = this.simNow();
        let watch = this.missionWatch;
        if (!watch || watch.id !== quest.id) {
            watch = this.missionWatch = { id: quest.id, progress: quest.progress || 0, since: now, reminders: 0, counts: this.objectiveCounts(quest) };
        }
        this.announceObjectiveProgress(quest, watch);

        const progress = quest.progress || 0;
        if (progress > watch.progress + 0.02) {
            Object.assign(watch, { progress, since: now, reminders: 0 });
        } else if (progress < watch.progress) {
            watch.progress = progress; // recurso que caiu: não zera o tempo parado
        }
        const wait = Math.min(this.MISSION_REMIND_MAX_MS, this.MISSION_REMIND_MS * (1 + 0.5 * watch.reminders));
        if (now - watch.since < wait) return;
        if (gm.buildMode || ui.isInfoPopupOpen?.() || ui.isReadingOverlayOpen?.()) return;
        watch.since = now;
        watch.reminders++;
        this.remindMission(quest);
    },

    /** Contagem inteira de cada meta (as de recurso andam aos poucos e não viram aviso). */
    objectiveCounts(quest) {
        const counts = {};
        quest.objectives.forEach((o, i) => { counts[o.id ?? i] = Math.floor(o.current || 0); });
        return counts;
    },

    /**
     * Missão que a barra mostra: a principal (currentMainQuest, só tipos 'tutorial'/'main') ou, sem ela, a primeira
     * ativa da campanha. As missões 'primary'/'challenge' não viram currentMainQuest, então ele fica vazio quase sempre.
     */
    getFocusQuest() {
        const main = this.quests.get(this.currentMainQuest);
        if (main?.status === 'active') return main;
        const active = [...this.activeQuests].map(id => this.quests.get(id)).filter(q => q?.status === 'active');
        return active.find(q => !String(q.id).startsWith('city_challenge_')) || active[0] || null;
    },

    /** "Construa 2 Bombas de Água" (MissionUI.getActionableObjectiveText; sem a UI, a descrição da meta). */
    objectiveText(objective, quest) {
        return this.getActionableObjectiveText?.(objective, quest) ?? objective.description;
    },

    pendingObjective(quest) {
        return quest.objectives.find(o => (o.required > 0 ? (o.current || 0) < o.required : false)) || null;
    },

    /** Aviso de meta "construir" que andou ou de meta cumprida (a última fica com o cartão da missão). */
    announceObjectiveProgress(quest, watch) {
        const counts = this.objectiveCounts(quest);
        const changed = quest.objectives.find((o, i) => {
            const key = o.id ?? i;
            return o.required > 0 && counts[key] > (watch.counts[key] ?? 0) && (o.type === 'build' || counts[key] >= o.required);
        });
        watch.counts = counts;
        if (!changed || !this.pendingObjective(quest)) return;
        const now = performance.now();
        if (now - (this.lastObjectiveToastAt ?? -Infinity) < this.MISSION_PROGRESS_TOAST_GAP_MS) return;
        this.lastObjectiveToastAt = now;
        const done = (changed.current || 0) >= changed.required;
        const next = this.pendingObjective(quest);
        const nextText = next ? ` Agora: ${this.objectiveText(next, quest)}.` : '';
        const text = done
            ? `<b>Meta cumprida:</b> ${changed.description}.${nextText}`
            : `<b>Missão andando:</b> ${changed.description} (${Math.floor(changed.current)}/${changed.required}).`;
        this.gameManager.uiManager.showNotification(`🎯 ${text}`, 'success', 6000, { className: 'toast--mission' });
        this.gameManager.uiManager.peekMissionBar?.();
    },

    /** Lembrete da missão parada: o que falta + atalhos. */
    remindMission(quest) {
        const ui = this.gameManager.uiManager;
        const pending = this.pendingObjective(quest);
        const what = pending ? this.objectiveText(pending, quest) : quest.description;
        const title = typeof PlayerProfile !== 'undefined' ? PlayerProfile.personalize(quest.title) : quest.title;
        const actions = [{ label: '🎯 Ver missão', onClick: () => this.openMissionInterface() }];
        if (pending?.type === 'build' && pending.target) actions.unshift({ label: '🏗️ Construir', onClick: () => this.goToBuildGoal(pending.target) });
        ui.showNotification(`<b>Lembrete da missão:</b> ${title}<br>${what}.`, 'info', 14000, { icon: '🎯', className: 'toast--mission', actions });
        ui.peekMissionBar?.(12000);
        ui.pulseMissionPeek?.();
        log(`🎯 Lembrete da missão ${quest.id}`);
    }
});
