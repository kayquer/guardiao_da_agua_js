/**
 * UIManager — Livro de estudo e quiz
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
    // ===== STUDY BOOK SYSTEM =====
    openStudyBook(buildingId) {
        if (!this.gameManager.studySystem) {
            console.error('❌ StudySystem not initialized');
            this.showNotification('❌ Sistema de estudos não inicializado', 'error');
            return;
        }

        // Check if content is still loading
        if (!this.gameManager.studySystem.contentLoaded) {
            logWarn('⏳ Conteúdo educacional ainda carregando...');
            this.showNotification('⏳ Aguarde, carregando conteúdo educacional...', 'warning');
            return;
        }

        const studyContent = this.gameManager.studySystem.getStudyContent(buildingId);
        if (!studyContent) {
            logWarn(`⚠️ No study content for building: ${buildingId}`);
            this.showNotification('⚠️ Conteúdo educacional não disponível para este edifício', 'warning');
            return;
        }

        // Start the study
        this.gameManager.studySystem.startStudy(buildingId);

        // Create and show the book interface
        this.showStudyBookInterface(studyContent);

        AudioManager.playSound('sfx_book_open');
    },

    /** Fontes do estudo (data/building-studies.json → sources: [{ label, url }]), na última página, como nas aulas. */
    renderStudySources(studyContent) {
        const sources = (studyContent?.sources || []).filter(s => s?.label && /^https:\/\//.test(s.url || ''));
        if (!sources.length) return '';
        const esc = text => String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
        return `<div class="book-sources">
            <h5>📎 Fontes para saber mais</h5>
            <ul>${sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join('')}</ul>
        </div>`;
    },

    /**
     * @param {'next'|'prev'|null} [turn] direção da folha virando; null = abertura do livro
     *   (anima o livro abrindo, sem folha virando)
     */
    showStudyBookInterface(studyContent, turn = null) {
        stopSpeaking(); // trocou de página: a leitura anterior para
        // Create book overlay if it doesn't exist
        let bookOverlay = document.getElementById('study-book-overlay');
        if (!bookOverlay) {
            bookOverlay = document.createElement('div');
            bookOverlay.id = 'study-book-overlay';
            bookOverlay.className = 'study-book-overlay';
            document.body.appendChild(bookOverlay);
        }

        // Get current page
        const currentPage = this.gameManager.studySystem.getCurrentPage();
        const progress = this.gameManager.studySystem.getProgress();
        const isLastPage = this.gameManager.studySystem.isLastPage();

        // Check if this is a quiz page
        const hasQuiz = this.gameManager.studySystem.hasQuiz();
        const quiz = this.gameManager.studySystem.getQuiz();
        const isQuizPage = hasQuiz && isLastPage;

        // Generate quiz HTML if this is a quiz page
        let quizHTML = '';
        if (isQuizPage && quiz) {
            quizHTML = this.renderQuizQuestions(quiz);
        }

        // Build book HTML
        bookOverlay.innerHTML = `
            <div class="study-book-container${turn ? ' is-turning' : ''}">
                <div class="study-book ${isQuizPage ? 'quiz-page' : ''}">
                    <div class="book-header">
                        <h2>${studyContent.studyTitle}</h2>
                        <button class="book-close-btn" onclick="window.gameManager.uiManager.closeStudyBook()" aria-label="Fechar">${uiIcon('ui-close')}</button>
                    </div>

                    <div class="book-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${progress}% concluído</span>
                    </div>

                    <div class="book-content${turn ? ` turn-in-${turn}` : ''}">
                        <div class="page-number">Página ${currentPage.pageNumber} de ${studyContent.pages.length}</div>
                        <div class="page-title-row">
                            <h3 class="page-title">${currentPage.title}</h3>
                            <button class="read-aloud-btn" aria-label="Ouvir a página em voz alta" title="Ouvir">${uiIcon('ui-sound')}</button>
                        </div>
                        ${currentPage.image ? `<div class="page-image"><img src="${currentPage.image}" alt="${currentPage.title}" onerror="this.parentElement.style.display='none'"></div>` : ''}
                        <div class="page-text">${currentPage.content}</div>
                        ${isLastPage ? this.renderStudySources(studyContent) : ''}
                        ${quizHTML}
                    </div>

                    <div class="book-navigation">
                        <button class="nav-btn prev-btn" ${this.gameManager.studySystem.currentPage === 0 ? 'disabled' : ''}
                                onclick="window.gameManager.uiManager.previousStudyPage()">
                            ◀ Anterior
                        </button>

                        ${isLastPage ?
                            `<button class="nav-btn complete-btn" onclick="window.gameManager.uiManager.completeStudy()">
                                ✓ Concluir Estudo
                            </button>` :
                            `<button class="nav-btn next-btn" onclick="window.gameManager.uiManager.nextStudyPage()">
                                Próxima ▶
                            </button>`
                        }
                    </div>

                    <div class="book-info">
                        <span>${uiIcon('ui-clock')} ${studyContent.estimatedTime}</span>
                        
                    </div>
                </div>
            </div>
        `;

        setupReadAloud(bookOverlay.querySelector('.read-aloud-btn'), () =>
            `${currentPage.title}. ${bookOverlay.querySelector('.page-text').innerText}`);

        // Show overlay with animation
        bookOverlay.classList.add('active');

        // Setup quiz event listeners if this is a quiz page
        if (isQuizPage && quiz) {
            this.setupQuizEventListeners(quiz);
        }
        // A pausa vem de syncPopupPause (UIManager), que vê o #study-book-overlay aberto
    },

    renderQuizQuestions(quiz) {
        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            return '';
        }

        let questionsHTML = '<div class="quiz-container">';

        quiz.questions.forEach((question, index) => {
            const questionId = question.id ?? index;
            const userAnswer = this.gameManager.studySystem.currentQuizAnswers[questionId];

            questionsHTML += `
                <div class="quiz-question" data-question-id="${questionId}">
                    <h4 class="question-text">
                        <span class="question-number">${index + 1}.</span>
                        ${question.question}
                    </h4>
                    <div class="quiz-options">
            `;

            question.options.forEach((option, optionIndex) => {
                const isSelected = userAnswer === optionIndex;
                questionsHTML += `
                    <label class="quiz-option ${isSelected ? 'selected' : ''}">
                        <input type="radio"
                               name="quiz-${this.gameManager.studySystem.currentStudy}-q${questionId}"
                               value="${optionIndex}"
                               ${isSelected ? 'checked' : ''}
                               data-question-id="${questionId}">
                        <span class="option-text">${option}</span>
                    </label>
                `;
            });

            questionsHTML += `
                    </div>
                </div>
            `;
        });

        questionsHTML += `
            <div class="quiz-info">
                <p>${uiIcon('ui-stats')} <strong>Nota mínima para aprovação:</strong> ${quiz.passingScore}%</p>
                <p>${uiIcon('ui-help')} <strong>Total de questões:</strong> ${quiz.questions.length}</p>
            </div>
        </div>`;

        return questionsHTML;
    },

    setupQuizEventListeners(quiz) {
        // Wait for DOM to be ready
        setTimeout(() => {
            const bookOverlay = document.getElementById('study-book-overlay');
            if (!bookOverlay) return;
            const radioButtons = bookOverlay.querySelectorAll('.quiz-option input[type="radio"]');

            radioButtons.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const questionId = parseInt(e.target.dataset.questionId);
                    const selectedOption = parseInt(e.target.value);

                    // Submit answer to StudySystem
                    this.gameManager.studySystem.submitQuizAnswer(questionId, selectedOption);

                    // Update visual selection
                    const questionContainer = e.target.closest('.quiz-question');
                    questionContainer.querySelectorAll('.quiz-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    e.target.closest('.quiz-option').classList.add('selected');

                    AudioManager.playSound('sfx_ui_click');
                });
            });
        }, 100);
    },

    nextStudyPage() {
        if (this.gameManager.studySystem.nextPage()) {
            const studyContent = this.gameManager.studySystem.getStudyContent(this.gameManager.studySystem.currentStudy);
            this.showStudyBookInterface(studyContent, 'next');

            AudioManager.playSound('sfx_book_page');
        }
    },

    previousStudyPage() {
        if (this.gameManager.studySystem.previousPage()) {
            const studyContent = this.gameManager.studySystem.getStudyContent(this.gameManager.studySystem.currentStudy);
            this.showStudyBookInterface(studyContent, 'prev');

            AudioManager.playSound('sfx_book_page');
        }
    },

    completeStudy() {
        const buildingId = this.gameManager.studySystem.currentStudy;
        if (!buildingId) return;

        const studySystem = this.gameManager.studySystem;

        // Check if this study has a quiz
        if (studySystem.hasQuiz()) {
            const quiz = studySystem.getQuiz();

            // Validate all questions are answered
            if (!studySystem.areAllQuestionsAnswered()) {
                this.showNotification(
                    '⚠️ Por favor, responda todas as questões antes de concluir!',
                    'warning',
                    3000
                );

                AudioManager.playSound('sfx_error');

                // Scroll to quiz section
                const quizContainer = document.querySelector('.quiz-container');
                if (quizContainer) {
                    quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // Add warning message at top of quiz
                    const existingWarning = document.querySelector('.quiz-warning-message');
                    if (existingWarning) existingWarning.remove();
                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'quiz-warning-message';
                    warningDiv.innerHTML = uiIcon('status-warning') + ' Responda todas as questões antes de concluir o estudo!';
                    quizContainer.insertBefore(warningDiv, quizContainer.firstChild);
                }

                // Highlight unanswered questions
                const answers = studySystem.currentQuizAnswers;
                document.querySelectorAll('.quiz-question').forEach(q => {
                    const qId = parseInt(q.dataset.questionId);
                    q.classList.toggle('unanswered', answers[qId] === undefined);
                });

                // Update book-info with warning
                const bookInfo = document.querySelector('.book-info');
                if (bookInfo) {
                    bookInfo.innerHTML = '<span style="color: #FF9800;">' + uiIcon('status-warning') + ' Responda o quiz para concluir</span>';
                }

                return;
            }

            // Calculate score and check if passed
            const score = studySystem.calculateQuizScore();
            const passed = studySystem.isQuizPassed();
            ResearchLog.record('quiz', { target: buildingId, value: score, ok: passed,
                answers: quiz.questions.map((q, i) => ({ q: q.id ?? i, chosen: studySystem.currentQuizAnswers[q.id ?? i] ?? null, right: studySystem.currentQuizAnswers[q.id ?? i] === q.correctAnswer })) });

            if (!passed) {
                // Quiz failed - show results and allow retry
                this.showQuizResults(false, score, quiz.passingScore);
                AudioManager.playSound('sfx_quiz_wrong');
                return;
            }

            // Quiz passed - show success and unlock building
            this.showQuizResults(true, score, quiz.passingScore);
            studySystem.completeStudy(buildingId);

            // Acertou: "ding" e, logo depois, o prédio liberado (efeito + jingle)
            AudioManager.playSound('sfx_quiz_right');
            setTimeout(() => AudioManager.onStudyUnlock(), 700);

            // O livro fica aberto com o resultado até o aluno clicar: antes um temporizador de 2,5 s o fechava
            // sozinho e o "Concluir Estudo" continuava na tela sem fazer nada (o estudo já estava concluído)
            this.loadBuildingItemsWithStateManagement();
            this.showStudyFinishButton(buildingId);

        } else {
            // No quiz - complete study directly
            studySystem.completeStudy(buildingId);

            AudioManager.onStudyUnlock();

            // Close book
            this.closeStudyBook();

            // Refresh building items to show unlocked state
            this.loadBuildingItemsWithStateManagement();
            this.openStudiedBuilding(buildingId);
        }
    },

    /** Aprovado: a navegação vira um botão só, que fecha o livro e abre o prédio liberado. */
    showStudyFinishButton(buildingId) {
        this.passedStudyId = buildingId;
        const nav = document.querySelector('#study-book-overlay .book-navigation');
        if (!nav) return;
        nav.innerHTML = `<button class="nav-btn complete-btn study-finish-btn" onclick="window.gameManager.uiManager.finishPassedStudy()">
                ${uiIcon('status-done')} Ver o prédio liberado ▶
            </button>`;
        nav.querySelector('.study-finish-btn')?.focus({ preventScroll: true });
    },

    finishPassedStudy() {
        const buildingId = this.passedStudyId;
        if (!buildingId) return;
        this.closeStudyBook();
        this.openStudiedBuilding(buildingId);
    },

    showQuizResults(passed, score, passingScore) {
        const resultsContainer = document.querySelector('.quiz-container');
        if (!resultsContainer) return;

        // Reprovações por estudo: na 1ª o aluno relê ou tenta de novo; "Continuar e desbloquear" só da 2ª em diante
        const study = this.gameManager.studySystem;
        if (!passed) {
            study.quizFailures ||= {};
            study.quizFailures[study.currentStudy] = (study.quizFailures[study.currentStudy] || 0) + 1;
        }

        const resultClass = passed ? 'quiz-passed' : 'quiz-failed';
        const resultIcon = passed ? '🎉' : '❌';
        const resultTitle = passed ? 'Parabéns! Você foi aprovado!' : 'Não foi dessa vez...';
        const resultMessage = passed
            ? `Você acertou ${score}% das questões e desbloqueou este edifício!`
            : `Você acertou ${score}% das questões. É necessário ${passingScore}% para aprovação. Revise o conteúdo e tente novamente.`;

        const resultsHTML = `
            <div class="quiz-results ${resultClass}">
                <div class="results-icon">${uiIcon(resultIcon, 'lg')}</div>
                <h3>${resultTitle}</h3>
                <div class="results-score">
                    <div class="score-circle">
                        <span class="score-value">${score}%</span>
                    </div>
                </div>
                <p class="results-message">${resultMessage}</p>
                ${!passed ? this.renderQuizReview() : ''}
            </div>
        `;

        resultsContainer.innerHTML = resultsHTML;
        // Resultado/revisão entram como uma folha nova (mesma virada das páginas)
        this.turnStudyPage(resultsContainer.closest('.book-content'), 'next');
        if (!passed) resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Vira a folha de uma página que já está na tela (sem recriar o livro).
     * Tira a classe, força reflow e põe de novo: cliques rápidos reiniciam a animação em vez de travar.
     */
    turnStudyPage(pageEl, direction) {
        if (!pageEl) return;
        pageEl.classList.remove('turn-in-next', 'turn-in-prev');
        void pageEl.offsetWidth; // reinicia a animação
        pageEl.classList.add(`turn-in-${direction}`);
    },

    /** Reprovou: mostra rapidinho onde errou (resposta dada × certa + explicação) e deixa escolher o que fazer. */
    renderQuizReview() {
        const study = this.gameManager.studySystem;
        const wrong = study.getWrongAnswers();
        // Desbloquear sem acertar só depois de uma segunda tentativa: a recompensa vem de ler, não de pular
        const canContinue = (study.quizFailures?.[study.currentStudy] || 0) >= 2;
        const items = wrong.map(w => `
            <li class="quiz-review-item">
                <p class="quiz-review-question">${w.question}</p>
                <p class="quiz-review-answer wrong">${uiIcon('status-error')} Você respondeu: ${w.chosen}</p>
                <p class="quiz-review-answer right">${uiIcon('status-done')} Resposta certa: ${w.correct}</p>
                ${w.explanation ? `<p class="quiz-review-why">${uiIcon('status-tip')} ${w.explanation}</p>` : ''}
            </li>`).join('');
        return `
            <div class="quiz-review">
                <h4>📝 Onde você errou</h4>
                <ul>${items}</ul>
            </div>
            ${canContinue
                ? `<p class="quiz-review-ask">E agora, ${PlayerProfile.displayName()}? Quer tentar de novo ou seguir em frente?</p>`
                : `<p class="quiz-review-ask">Leia as explicações acima, ${PlayerProfile.displayName()}: com elas você acerta! Releia o estudo ou tente de novo.</p>`}
            <div class="quiz-review-actions">
                ${canContinue ? '' : `<button class="reread-btn" onclick="window.gameManager.uiManager.rereadStudy()">${uiIcon('ui-book')} Reler o estudo</button>`}
                <button class="retry-btn" onclick="window.gameManager.uiManager.retryQuiz()">🔄 Tentar de novo</button>
                ${canContinue ? `<button class="continue-btn" onclick="window.gameManager.uiManager.continueAfterQuiz()">${uiIcon('status-done')} Continuar e desbloquear</button>` : ''}
            </div>`;
    },

    /** Volta para a primeira página do estudo (respostas zeradas); o quiz está no fim, como da primeira vez. */
    rereadStudy() {
        const study = this.gameManager.studySystem;
        study.currentQuizAnswers = {};
        study.quizScore = 0;
        study.currentPage = 0;
        this.showStudyBookInterface(study.getStudyContent(study.currentStudy), 'prev');
        this.showNotification('📖 Releia com calma: as respostas estão no texto.', 'info', 3000);
        AudioManager.playSound('sfx_book_page');
    },

    retryQuiz() {
        // Respostas zeradas; continua na página do quiz (a revisão já mostrou o que estava errado)
        this.gameManager.studySystem.currentQuizAnswers = {};
        this.gameManager.studySystem.quizScore = 0;

        const studyContent = this.gameManager.studySystem.getStudyContent(
            this.gameManager.studySystem.currentStudy
        );
        this.showStudyBookInterface(studyContent, 'prev'); // volta a folha para o quiz em branco

        this.showNotification('📚 Responda de novo: você consegue!', 'info', 3000);

        AudioManager.playSound('sfx_book_page');
    },

    /** Da 2ª reprovação em diante, depois de ver os erros, o aluno pode seguir: o prédio é liberado sem a nota mínima. */
    continueAfterQuiz() {
        const studySystem = this.gameManager.studySystem;
        const buildingId = studySystem.currentStudy;
        if (!buildingId) return;
        ResearchLog.record('quiz_continue', { target: buildingId });
        studySystem.completeStudy(buildingId);
        AudioManager.onStudyUnlock();
        this.closeStudyBook();
        this.loadBuildingItemsWithStateManagement();
        const name = this.gameManager.buildingSystem.buildingTypes.get(buildingId)?.name || 'Prédio';
        this.showNotification(`🔓 ${name} liberado! Lembre-se das dicas da revisão.`, 'success', 4000);
        this.openStudiedBuilding(buildingId);
    },

    /** Estudo concluído: o passo seguinte é construir, então abre o menu de construção já com o prédio escolhido. */
    openStudiedBuilding(buildingId) {
        if (this.gameManager.tutorialSystem?.isActive) return; // o tutorial conduz o próximo passo
        setTimeout(() => {
            if (document.getElementById('study-book-overlay') || this.gameManager.buildMode) return;
            if (this.gameManager.studySystem.isBuildingUnlocked(buildingId)) this.focusBuildingItem(buildingId);
        }, 450); // depois do livro sair da tela (closeStudyBook remove em 300 ms)
    },
});
