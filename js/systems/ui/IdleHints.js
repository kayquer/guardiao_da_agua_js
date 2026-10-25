/**
 * UIManager — dica durante a espera: com uma obra andando ou uma zona crescendo e o jogador parado há
 * IDLE_HINT_MS (sem clicar nem teclar), sugere algo útil para fazer enquanto espera (estudar um prédio que a
 * tecnologia já liberou, uma aula que falta ou a missão). Um aviso discreto a cada IDLE_HINT_EVERY_MS, no máximo.
 * Antes o aluno acelerava para 3x e só esperava (auditoria de design: lacuna de fluxo).
 */
mixin(UIManager, {
    IDLE_HINT_MS: 20000,
    IDLE_HINT_EVERY_MS: 120000,

    setupIdleHints() {
        this.lastInputAt = performance.now();
        this.lastIdleHintAt = -Infinity;
        const mark = () => { this.lastInputAt = performance.now(); };
        ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(type => document.addEventListener(type, mark, { passive: true, capture: true }));
    },

    /** Chamado a cada 200 ms (UIManager.update). */
    updateIdleHints() {
        const gm = this.gameManager;
        if (!Number.isFinite(this.lastInputAt)) return;
        if (gm?.gameState !== 'playing' || !gm.isSimulationRunning?.() || gm.buildMode || gm.tutorialSystem?.isActive) return;
        if (this.isInfoPopupOpen() || this.isReadingOverlayOpen()) return;
        const now = performance.now();
        if (now - this.lastInputAt < this.IDLE_HINT_MS || now - this.lastIdleHintAt < this.IDLE_HINT_EVERY_MS) return;
        if (!this.isPlayerWaiting()) return;
        const hint = this.pickIdleHint();
        if (!hint) return;
        this.lastIdleHintAt = now;
        this.showNotification(hint, 'info', 9000);
    },

    /** Há algo andando sozinho: obra em fila ou zona que ainda não chegou à fase final. */
    isPlayerWaiting() {
        const bs = this.gameManager.buildingSystem;
        if (!bs) return false;
        if (bs.constructionQueue?.size > 0) return true;
        for (const b of bs.buildings.values()) {
            const stage = bs.getZoneStage?.(b);
            if (stage !== null && stage !== undefined && stage < 3) return true;
        }
        return false;
    },

    /** Texto da dica (com link que faz a ação), na ordem: estudo liberado pela tecnologia, aula, missão. */
    pickIdleHint() {
        const gm = this.gameManager;
        const study = gm.studySystem;
        const types = gm.buildingSystem?.buildingTypes;
        if (study && types) {
            const candidates = [...types.values()].filter(t =>
                (typeof FEATURE_FLAGS === 'undefined' || FEATURE_FLAGS.isBuildingVisible(t.id)) &&
                study.hasStudyContent?.(t.id) && study.isTechReached?.(t.id) && !study.isStudyUnlocked?.(t.id));
            candidates.sort((a, b) => a.cost - b.cost);
            const next = candidates[0];
            if (next) {
                return `⏳ Enquanto a cidade trabalha, que tal estudar o <a href="#" onclick="event.preventDefault(); window.gameManager.uiManager.openStudyBook('${next.id}')">${next.name}</a>? Um estudo rápido libera ele.`;
            }
        }
        if (typeof LessonProgress !== 'undefined' && typeof LESSON_CHAPTERS !== 'undefined') {
            const lesson = LessonProgress.summary().next;
            if (lesson != null && LESSON_CHAPTERS[lesson]) {
                return `⏳ Enquanto espera, que tal a aula <a href="#" onclick="event.preventDefault(); window.gameManager.uiManager.openLessonsHub(${lesson})">${LESSON_CHAPTERS[lesson].title}</a>?`;
            }
        }
        const qs = gm.questSystem;
        const main = qs?.quests.get(qs.currentMainQuest);
        if (main?.status === 'active') {
            const pending = main.objectives.find(o => (o.required > 0 ? (o.current || 0) < o.required : false));
            if (pending) return `⏳ Enquanto espera, olhe a missão <b>${PlayerProfile.personalize(main.title)}</b>: falta ${pending.description.charAt(0).toLowerCase() + pending.description.slice(1)}.`;
        }
        return null;
    }
});
