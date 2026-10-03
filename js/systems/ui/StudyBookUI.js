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
            console.warn('⏳ Conteúdo educacional ainda carregando...');
            this.showNotification('⏳ Aguarde, carregando conteúdo educacional...', 'warning');
            return;
        }

        const studyContent = this.gameManager.studySystem.getStudyContent(buildingId);
        if (!studyContent) {
            console.warn(`⚠️ No study content for building: ${buildingId}`);
            this.showNotification('⚠️ Conteúdo educacional não disponível para este edifício', 'warning');
            return;
        }

        // Start the study
        this.gameManager.studySystem.startStudy(buildingId);

        // Create and show the book interface
        this.showStudyBookInterface(studyContent);

        // Play book opening sound
        if (this.gameManager.audioManager) {
            this.gameManager.audioManager.playSound('sfx_ui_select');
        }
    },

    showStudyBookInterface(studyContent) {
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
            <div class="study-book-container">
                <div class="study-book ${isQuizPage ? 'quiz-page' : ''}">
                    <div class="book-header">
                        <h2>${studyContent.studyTitle}</h2>
                        <button class="book-close-btn" onclick="window.gameManager.uiManager.closeStudyBook()">✕</button>
                    </div>

                    <div class="book-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${progress}% concluído</span>
                    </div>

                    <div class="book-content">
                        <div class="page-number">Página ${currentPage.pageNumber} de ${studyContent.pages.length}</div>
                        <h3 class="page-title">${currentPage.title}</h3>
                        ${currentPage.image ? `<div class="page-image"><img src="${currentPage.image}" alt="${currentPage.title}" onerror="this.parentElement.style.display='none'"></div>` : ''}
                        <div class="page-text">${currentPage.content}</div>
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
                        <span>⏱️ ${studyContent.estimatedTime}</span>
                        
                    </div>
                </div>
            </div>
        `;

        // Show overlay with animation
        bookOverlay.classList.add('active');

        // Setup quiz event listeners if this is a quiz page
        if (isQuizPage && quiz) {
            this.setupQuizEventListeners(quiz);
        }

        // Pause game
        if (this.gameManager.timeScale > 0) {
            this.gameManager.previousTimeScale = this.gameManager.timeScale;
            this.gameManager.setTimeScale(0);
        }
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
                <p>📊 <strong>Nota mínima para aprovação:</strong> ${quiz.passingScore}%</p>
                <p>❓ <strong>Total de questões:</strong> ${quiz.questions.length}</p>
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

                    // Play selection sound
                    if (this.gameManager.audioManager) {
                        this.gameManager.audioManager.playSound('sfx_ui_click');
                    }
                });
            });
        }, 100);
    },

    nextStudyPage() {
        if (this.gameManager.studySystem.nextPage()) {
            const studyContent = this.gameManager.studySystem.getStudyContent(this.gameManager.studySystem.currentStudy);
            this.showStudyBookInterface(studyContent);

            // Play page turn sound
            if (this.gameManager.audioManager) {
                this.gameManager.audioManager.playSound('sfx_ui_click');
            }
        }
    },

    previousStudyPage() {
        if (this.gameManager.studySystem.previousPage()) {
            const studyContent = this.gameManager.studySystem.getStudyContent(this.gameManager.studySystem.currentStudy);
            this.showStudyBookInterface(studyContent);

            // Play page turn sound
            if (this.gameManager.audioManager) {
                this.gameManager.audioManager.playSound('sfx_ui_click');
            }
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

                if (this.gameManager.audioManager) {
                    this.gameManager.audioManager.playSound('sfx_build_error');
                }

                // Scroll to quiz section
                const quizContainer = document.querySelector('.quiz-container');
                if (quizContainer) {
                    quizContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // Add warning message at top of quiz
                    const existingWarning = document.querySelector('.quiz-warning-message');
                    if (existingWarning) existingWarning.remove();
                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'quiz-warning-message';
                    warningDiv.innerHTML = '⚠️ Responda todas as questões antes de concluir o estudo!';
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
                    bookInfo.innerHTML = '<span style="color: #FF9800;">⚠️ Responda o quiz para concluir</span>';
                }

                return;
            }

            // Calculate score and check if passed
            const score = studySystem.calculateQuizScore();
            const passed = studySystem.isQuizPassed();

            if (!passed) {
                // Quiz failed - show results and allow retry
                this.showQuizResults(false, score, quiz.passingScore);

                if (this.gameManager.audioManager) {
                    this.gameManager.audioManager.playSound('sfx_build_error');
                }
                return;
            }

            // Quiz passed - show success and unlock building
            this.showQuizResults(true, score, quiz.passingScore);
            studySystem.completeStudy(buildingId);

            // Play success sound
            if (this.gameManager.audioManager) {
                this.gameManager.audioManager.playSound('sfx_ui_success');
            }

            // Close book after a delay to show results
            setTimeout(() => {
                this.closeStudyBook();
                this.loadBuildingItemsWithStateManagement();
            }, 2500);

        } else {
            // No quiz - complete study directly
            studySystem.completeStudy(buildingId);

            // Play success sound
            if (this.gameManager.audioManager) {
                this.gameManager.audioManager.playSound('sfx_ui_success');
            }

            // Close book
            this.closeStudyBook();

            // Refresh building items to show unlocked state
            this.loadBuildingItemsWithStateManagement();
        }
    },

    showQuizResults(passed, score, passingScore) {
        const resultsContainer = document.querySelector('.quiz-container');
        if (!resultsContainer) return;

        const resultClass = passed ? 'quiz-passed' : 'quiz-failed';
        const resultIcon = passed ? '🎉' : '❌';
        const resultTitle = passed ? 'Parabéns! Você foi aprovado!' : 'Não foi dessa vez...';
        const resultMessage = passed
            ? `Você acertou ${score}% das questões e desbloqueou este edifício!`
            : `Você acertou ${score}% das questões. É necessário ${passingScore}% para aprovação. Revise o conteúdo e tente novamente.`;

        const resultsHTML = `
            <div class="quiz-results ${resultClass}">
                <div class="results-icon">${resultIcon}</div>
                <h3>${resultTitle}</h3>
                <div class="results-score">
                    <div class="score-circle">
                        <span class="score-value">${score}%</span>
                    </div>
                </div>
                <p class="results-message">${resultMessage}</p>
                ${!passed ? '<button class="retry-btn" onclick="window.gameManager.uiManager.retryQuiz()">🔄 Tentar Novamente</button>' : ''}
            </div>
        `;

        resultsContainer.innerHTML = resultsHTML;
    },

    retryQuiz() {
        // Reset quiz state
        this.gameManager.studySystem.currentQuizAnswers = {};
        this.gameManager.studySystem.quizScore = 0;

        // Go back to first page to review content
        this.gameManager.studySystem.currentPage = 0;

        // Refresh the study interface
        const studyContent = this.gameManager.studySystem.getStudyContent(
            this.gameManager.studySystem.currentStudy
        );
        this.showStudyBookInterface(studyContent);

        this.showNotification('📚 Revise o conteúdo e tente novamente!', 'info', 3000);

        if (this.gameManager.audioManager) {
            this.gameManager.audioManager.playSound('sfx_ui_click');
        }
    },
});
