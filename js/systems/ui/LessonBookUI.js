/**
 * UIManager — Central de aulas (📚) e o livro de cada aula.
 * #lessons-hub tem três abas, todas refazíveis:
 *   - 🧭 Como jogar: as partes do tutorial inicial (TutorialSystem.REPLAY_PARTS → replayPart);
 *   - 📖 Conteúdo: um card por tema (LESSON_CHAPTERS) com o que o jogador já concluiu (LessonProgress);
 *   - 🗺️ Guias: os guias da cidade (TutorialSystem.GUIDES) e as aulas rápidas dos painéis (TOPICS).
 * #lesson-book: as páginas da aula (passos `chapter` do TutorialSystem) num livro que vira a página;
 * a última página mostra as fontes e conclui a aula. Os dois pausam o jogo (UIManager.syncPopupPause vê os ids).
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
    openLessonsHub(highlightChapter = null, tab = null) {
        this.closeLessonBook({ toHub: false });
        if (tab) this.lessonsTab = tab;
        if (highlightChapter != null) this.lessonsTab = 'content';
        this.lessonsTab = this.lessonsTab || 'content';

        let hub = document.getElementById('lessons-hub');
        if (!hub) {
            hub = document.createElement('div');
            hub.id = 'lessons-hub';
            hub.className = 'lessons-overlay';
            hub.addEventListener('click', event => {
                if (event.target === hub || event.target.closest('.lessons-close')) return this.closeLessonsHub();
                const tabBtn = event.target.closest('[data-lessons-tab]');
                if (tabBtn) {
                    AudioManager.playSound('sfx_tab_switch');
                    return this.openLessonsHub(null, tabBtn.dataset.lessonsTab);
                }
                const card = event.target.closest('[data-chapter]');
                if (card) return this.openLessonBook(Number(card.dataset.chapter), { fromHub: true });
                const replay = event.target.closest('[data-replay]');
                if (replay) return this.startFromHub(replay.dataset.replay, replay.dataset.id);
            });
            document.getElementById('game-screen')?.appendChild(hub);
        }

        const tabs = [
            ['intro', '🧭 Como jogar'],
            ['content', '📖 Conteúdo'],
            ['guides', '🗺️ Guias']
        ].map(([id, label]) => `<button class="lessons-tab ${id === this.lessonsTab ? 'active' : ''}" role="tab"
            aria-selected="${id === this.lessonsTab}" data-lessons-tab="${id}">${uiIconsIn(label)}</button>`).join('');

        const body = { intro: () => this.renderIntroTab(), guides: () => this.renderGuidesTab() }[this.lessonsTab]
            || (() => this.renderContentTab(highlightChapter));

        hub.innerHTML = `<div class="lessons-card" role="dialog" aria-label="Central de aulas">
            <div class="lessons-head">
                <h3>${uiIcon('ui-books', 'lg')} Central de aulas</h3>
                <button class="lessons-close" aria-label="Fechar">${uiIcon('ui-close')}</button>
            </div>
            <div class="lessons-tabs" role="tablist">${tabs}</div>
            ${body()}
        </div>`;
    },

    renderContentTab(highlightChapter) {
        const summary = LessonProgress.summary();
        const percent = Math.round((summary.done / summary.total) * 100);
        const cards = Object.entries(LESSON_CHAPTERS).map(([chapter, info]) => {
            const done = LessonProgress.isDone(chapter);
            const isNext = Number(chapter) === summary.next;
            const status = done ? '✅ Concluída · rever' : isNext ? '⭐ Próxima aula' : '▶ Começar';
            const pages = this.lessonPages(Number(chapter)).length;
            return `<button class="lesson-card ${done ? 'done' : ''} ${isNext ? 'next' : ''} ${Number(chapter) === highlightChapter ? 'just-done' : ''}" data-chapter="${chapter}">
                <span class="lesson-card-icon">${lessonIcon(chapter)}</span>
                <span class="lesson-card-number">Aula ${chapter} · ${pages} páginas</span>
                <b class="lesson-card-title">${info.title}</b>
                <small class="lesson-card-summary">${info.summary}</small>
                <span class="lesson-card-status">${uiIconsIn(status)}</span>
            </button>`;
        }).join('');

        const greeting = summary.done === summary.total
            ? '{nome}, você concluiu todas as aulas! 🏆 Pode rever qualquer uma quando quiser.'
            : '{nome}, escolha um tema para estudar. Cada aula concluída fica marcada aqui.';
        return `<p class="lessons-greeting">${uiIconsIn(PlayerProfile.personalize(greeting))}</p>
            <div class="lessons-progress">
                <div class="lessons-progress-bar"><div class="lessons-progress-fill" style="width: ${percent}%"></div></div>
                <span>${summary.done} de ${summary.total} aulas concluídas</span>
            </div>
            <div class="lessons-grid">${cards}</div>`;
    },

    renderIntroTab() {
        const parts = TutorialSystem.REPLAY_PARTS.map(part => {
            const steps = this.gameManager.tutorialSystem.replaySteps(part.group).length;
            return `<button class="lesson-card replay-card" data-replay="part" data-id="${part.group}">
                <span class="lesson-card-icon">${uiIcon(part.icon, 'lg')}</span>
                <span class="lesson-card-number">${steps} ${steps === 1 ? 'passo' : 'passos'}</span>
                <b class="lesson-card-title">${part.title}</b>
                <small class="lesson-card-summary">${part.summary}</small>
                <span class="lesson-card-status">↻ Refazer</span>
            </button>`;
        }).join('');
        return `<p class="lessons-greeting">${PlayerProfile.personalize('{nome}, esqueceu como algo funciona? Refaça qualquer parte do tutorial do começo do jogo.')}</p>
            <div class="lessons-grid">${parts}</div>`;
    },

    renderGuidesTab() {
        const done = TutorialSystem.guidesDone();
        const guides = TutorialSystem.GUIDES.map(guide => `<button class="lesson-card replay-card ${done.includes(guide.id) ? 'done' : ''}" data-replay="guide" data-id="${guide.id}">
                <span class="lesson-card-icon">${uiIcon(guide.icon, 'lg')}</span>
                <span class="lesson-card-number">Guia da cidade · ${guide.steps.length} passos</span>
                <b class="lesson-card-title">${guide.title}</b>
                <span class="lesson-card-status">${done.includes(guide.id) ? `${uiIcon('status-done')} Visto · refazer` : `${uiIcon('status-locked')} Aparece quando a cidade crescer · ver agora`}</span>
            </button>`).join('');
        const topics = Object.entries(TutorialSystem.TOPICS).map(([key, topic]) => `<button class="lesson-card replay-card" data-replay="topic" data-id="${key}">
                <span class="lesson-card-icon">${uiIcon(topic.icon, 'lg')}</span>
                <span class="lesson-card-number">Aula rápida · ${topic.steps.length} passos</span>
                <b class="lesson-card-title">${topic.title}</b>
                <span class="lesson-card-status">↻ Fazer</span>
            </button>`).join('');
        return `<p class="lessons-greeting">Os guias aparecem sozinhos conforme a cidade cresce. Aqui você pode ver ou refazer qualquer um.</p>
            <h4 class="lessons-section-title">🗺️ Guias da cidade</h4>
            <div class="lessons-grid">${guides}</div>
            <h4 class="lessons-section-title">${uiIcon('res-energy')} Aulas rápidas dos indicadores</h4>
            <div class="lessons-grid">${topics}</div>`;
    },

    /** Card de "Como jogar" ou "Guias": fecha a central e roda o tutorial em cima do jogo (ele aponta para a tela). */
    startFromHub(kind, id) {
        const tutorial = this.gameManager.tutorialSystem;
        if (!tutorial || tutorial.isActive) return;
        this.closeLessonsHub();
        const started = kind === 'part' ? tutorial.replayPart(id)
            : kind === 'guide' ? tutorial.startGuide(id, { replay: true })
                : tutorial.startTopic(id);
        if (!started) this.showNotification('⏳ Feche o que estiver aberto e tente de novo.', 'warning', 3000);
    },

    closeLessonsHub() {
        document.getElementById('lessons-hub')?.remove();
    },

    /** Páginas da aula = passos do tutorial com esse `chapter` (inclui as `bookOnly`). */
    lessonPages(chapter) {
        return (this.gameManager.tutorialSystem?.tutorialSteps || []).filter(step => step.chapter === chapter);
    },

    /** Fontes da aula (LESSON_SOURCES), em lista com link; aparece no fim do livro e do tutorial. */
    renderLessonSources(chapter) {
        const sources = (LESSON_CHAPTERS[chapter]?.sources || []).map(key => LESSON_SOURCES[key]).filter(Boolean);
        if (!sources.length) return '';
        return `<div class="book-sources">
            <h5>📎 Fontes para saber mais</h5>
            <ul>${sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a></li>`).join('')}</ul>
        </div>`;
    },

    openLessonBook(chapter, { fromHub = false } = {}) {
        const pages = this.lessonPages(chapter);
        if (!pages.length || !LESSON_CHAPTERS[chapter]) return false;
        this.closeLessonsHub();
        this.closeLessonBook({ toHub: false });

        this.lessonBook = { chapter, pages, page: 0, fromHub, turning: false };
        AudioManager.playSound('sfx_book_open');
        const book = document.createElement('div');
        book.id = 'lesson-book';
        book.className = 'lessons-overlay';
        book.innerHTML = `<div class="lesson-book" role="dialog" aria-label="Aula ${chapter}">
            <div class="book-page book-left"></div>
            <div class="book-spine"></div>
            <div class="book-page book-right"><div class="book-right-content"></div></div>
            <div class="book-footer">
                <button class="book-btn book-close">${fromHub ? '← Aulas' : `${uiIcon('ui-close')} Fechar`}</button>
                <button class="book-btn book-prev">◀</button>
                <div class="book-dots"></div>
                <button class="book-btn book-next">Próxima ▶</button>
                <button class="book-btn book-read" aria-label="Ouvir a página em voz alta" title="Ouvir a página">${uiIcon('ui-sound')}</button>
            </div>
        </div>`;
        book.addEventListener('click', event => {
            if (event.target.closest('.book-close')) return this.closeLessonBook();
            if (event.target.closest('.book-prev')) return this.turnLessonPage(-1);
            if (event.target.closest('.book-next')) return this.turnLessonPage(1);
        });
        this.lessonBookKeys = event => {
            if (event.key === 'ArrowRight') this.turnLessonPage(1);
            else if (event.key === 'ArrowLeft') this.turnLessonPage(-1);
            else if (event.key === 'Escape') this.closeLessonBook();
        };
        document.addEventListener('keydown', this.lessonBookKeys);
        document.getElementById('game-screen')?.appendChild(book);
        setupReadAloud(book.querySelector('.book-read'), () => {
            const text = book.querySelector('.book-text');
            return `${this.lessonBook?.pages[this.lessonBook.page]?.title || ''}. ${text?.innerText || ''}`;
        });
        this.renderLessonPage();
        return true;
    },

    renderLessonPage() {
        const book = document.getElementById('lesson-book');
        const state = this.lessonBook;
        if (!book || !state) return;
        const step = state.pages[state.page];
        const info = LESSON_CHAPTERS[state.chapter];
        const last = state.page === state.pages.length - 1;

        book.querySelector('.book-left').innerHTML = `
            <span class="book-chapter">${lessonIcon(state.chapter)} Aula ${state.chapter} · ${info.title}</span>
            <span class="book-portrait-slot"></span>
            <span class="book-character">${TutorialSystem.displayName(step.character)}</span>
            <span class="book-page-number">Página ${state.page + 1} de ${state.pages.length}</span>`;
        this.showBookPortrait(book, step);
        book.querySelector('.book-right-content').innerHTML = `
            <h4 class="book-title">${step.icon ? uiIcon(step.icon, 'lg') : ''} ${PlayerProfile.personalize(step.title)}</h4>
            <div class="book-text">${PlayerProfile.personalize(step.text)}</div>
            ${last ? this.renderLessonSources(state.chapter) : ''}`;
        book.querySelector('.book-right-content').scrollTop = 0;
        book.querySelector('.book-dots').innerHTML = state.pages.map((_, i) =>
            `<span class="book-dot ${i === state.page ? 'current' : ''} ${i < state.page ? 'read' : ''}"></span>`).join('');
        book.querySelector('.book-prev').disabled = state.page === 0;
        const next = book.querySelector('.book-next');
        next.textContent = last ? '✓ Concluir aula' : 'Próxima ▶';
        next.classList.toggle('finish', last);
    },

    /**
     * Retrato animado de quem fala na página (AnimatedPortrait, um por personagem enquanto o livro está aberto).
     * Quem entra em cena dá um pulinho; nas outras páginas só mexe a boca. A leitura em voz alta (.book-read)
     * move a boca pelas palavras, porque o livro é o speechScope.
     */
    showBookPortrait(book, step) {
        const state = this.lessonBook;
        const id = TutorialSystem.CHARACTERS[step.character]?.id;
        const slot = book.querySelector('.book-portrait-slot');
        if (!id || !slot || typeof PORTRAIT_MANIFEST === 'undefined' || !PORTRAIT_MANIFEST[id]) return;
        state.portraits ||= {};
        const portrait = state.portraits[id] ||= new AnimatedPortrait(id, { speechScope: book });
        // Celular em pé ou deitado (pouca altura): rosto em círculo; o busto não cabe e empurrava o resto para fora
        portrait.setCrop(window.innerWidth <= 768 || window.innerHeight <= 500 ? 'face' : 'bust');
        portrait.setLabel(TutorialSystem.displayName(step.character));
        portrait.setExpression(TutorialSystem.expressionFor(step, this.gameManager));
        slot.replaceWith(portrait.el);
        if (state.speaker !== step.character) {
            state.speaker = step.character;
            portrait.enter();
        }
        AudioManager.onSpeaker(id, portrait.expression); // voz curta a cada página
        portrait.talk(1400);
    },

    /** Vira a página com animação (meia volta, troca o conteúdo, termina a volta). */
    turnLessonPage(direction) {
        const state = this.lessonBook;
        const book = document.getElementById('lesson-book');
        if (!state || !book || state.turning) return;
        const target = state.page + direction;
        if (target < 0) return;
        if (target >= state.pages.length) return this.finishLesson();

        stopSpeaking();
        state.turning = true;
        const page = book.querySelector('.book-right');
        page.classList.add(direction > 0 ? 'turn-out-next' : 'turn-out-prev');
        setTimeout(() => {
            state.page = target;
            this.renderLessonPage();
            page.classList.remove('turn-out-next', 'turn-out-prev');
            page.classList.add(direction > 0 ? 'turn-in-next' : 'turn-in-prev');
            setTimeout(() => {
                page.classList.remove('turn-in-next', 'turn-in-prev');
                state.turning = false;
            }, 260);
        }, 260);
        AudioManager.playSound('sfx_book_page');
    },

    finishLesson() {
        const { chapter, fromHub } = this.lessonBook;
        const first = LessonProgress.markDone(chapter);
        this.showNotification(PlayerProfile.personalize(first
            ? `🎉 Aula ${chapter} concluída! Muito bem, {nome}!`
            : `📖 Aula ${chapter} revisada!`), 'success', 4000);
        this.closeLessonBook({ toHub: false });
        if (fromHub) this.openLessonsHub(chapter);
    },

    closeLessonBook({ toHub = true } = {}) {
        const book = document.getElementById('lesson-book');
        if (!book) return;
        stopSpeaking();
        document.removeEventListener('keydown', this.lessonBookKeys);
        Object.values(this.lessonBook?.portraits || {}).forEach(portrait => portrait.destroy());
        const fromHub = this.lessonBook?.fromHub;
        book.remove();
        AudioManager.playSound('sfx_book_close');
        this.lessonBook = null;
        if (toHub && fromHub) this.openLessonsHub();
    }
});
