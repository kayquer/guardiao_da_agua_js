/**
 * GUARDIÃO DA ÁGUA - TUTORIAL MANAGER
 * Sistema de tutorial interativo e conteúdo educacional
 */

class TutorialManager {
    constructor(gameManager) {
        console.log('📚 Inicializando TutorialManager...');
        
        this.gameManager = gameManager;
        
        // Estado do tutorial
        this.isActive = false;
        this.currentStep = 0;
        this.tutorialSteps = [];
        this.completedTutorials = new Set();
        
        // Elementos da UI
        this.tutorialScreen = document.getElementById('tutorial-screen');
        this.tutorialContent = document.getElementById('tutorial-content');
        this.tutorialPage = document.getElementById('tutorial-page');
        this.prevBtn = document.getElementById('btn-tutorial-prev');
        this.nextBtn = document.getElementById('btn-tutorial-next');
        this.closeBtn = document.getElementById('btn-close-tutorial');
        
        // Configurações

        this.showHints = true;
        
        this.initializeTutorialSteps();
        this.setupEventListeners();
        
        console.log('✅ TutorialManager inicializado');
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeTutorialSteps() {
        console.log('📚 Definindo passos do tutorial...');
        
        this.tutorialSteps = [
            {
                title: 'Bem-vindo ao Guardião da Água!',
                content: `
                    <div class="tutorial-step">
                        <h3>🌊 Seja bem-vindo, futuro Guardião da Água!</h3>
                        <p>Você foi escolhido para gerenciar os recursos hídricos de uma cidade em crescimento. Sua missão é garantir que todos tenham acesso à água limpa e segura.</p>
                        
                        <div class="tutorial-highlight">
                            <h4>💧 O que você vai aprender:</h4>
                            <ul>
                                <li>Como extrair e tratar água</li>
                                <li>Gerenciar recursos e orçamento</li>
                                <li>Combater a poluição</li>
                                <li>Manter a população satisfeita</li>
                                <li>Lidar com crises hídricas</li>
                            </ul>
                        </div>
                        
                        <div class="tutorial-fact">
                            <strong>💡 Você sabia?</strong> Mais de 2 bilhões de pessoas no mundo não têm acesso à água potável em casa.
                        </div>
                    </div>
                `,
                interactive: false
            },
            
            {
                title: 'Interface do Jogo',
                content: `
                    <div class="tutorial-step">
                        <h3>🖥️ Conhecendo a Interface</h3>
                        <p>Vamos conhecer os elementos principais da tela de jogo:</p>
                        
                        <div class="tutorial-ui-guide">
                            <div class="ui-item">
                                <span class="ui-icon">💧</span>
                                <div>
                                    <strong>Painel de Recursos (topo)</strong>
                                    <p>Mostra água disponível, poluição, população, satisfação e orçamento</p>
                                </div>
                            </div>
                            
                            <div class="ui-item">
                                <span class="ui-icon">🏗️</span>
                                <div>
                                    <strong>Painel de Construção (esquerda)</strong>
                                    <p>Aqui você escolhe o que construir na sua cidade</p>
                                </div>
                            </div>
                            
                            <div class="ui-item">
                                <span class="ui-icon">ℹ️</span>
                                <div>
                                    <strong>Painel de Informações (direita)</strong>
                                    <p>Detalhes sobre edifícios e estruturas selecionadas</p>
                                </div>
                            </div>
                            
                            <div class="ui-item">
                                <span class="ui-icon">🎯</span>
                                <div>
                                    <strong>Painel de Missões (inferior)</strong>
                                    <p>Suas missões atuais e progresso</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="tutorial-tip">
                            <strong>💡 Dica:</strong> Use os botões de velocidade para acelerar ou pausar o tempo!
                        </div>
                    </div>
                `,
                interactive: false
            },
            
            {
                title: 'Recursos Hídricos',
                content: `
                    <div class="tutorial-step">
                        <h3>💧 Entendendo os Recursos</h3>
                        <p>O sucesso da sua cidade depende do equilíbrio entre quatro recursos principais:</p>
                        
                        <div class="resource-explanation">
                            <div class="resource-item">
                                <span class="resource-icon">💧</span>
                                <div>
                                    <strong>Água</strong>
                                    <p>Recurso vital que deve ser extraído, tratado e distribuído. Monitore produção vs. consumo.</p>
                                </div>
                            </div>
                            
                            <div class="resource-item">
                                <span class="resource-icon">🏭</span>
                                <div>
                                    <strong>Poluição</strong>
                                    <p>Contamina a água e reduz a satisfação. Use estações de tratamento para controlá-la.</p>
                                </div>
                            </div>
                            
                            <div class="resource-item">
                                <span class="resource-icon">👥</span>
                                <div>
                                    <strong>População</strong>
                                    <p>Cresce quando há água suficiente e baixa poluição. Mais pessoas = mais consumo.</p>
                                </div>
                            </div>
                            
                            <div class="resource-item">
                                <span class="resource-icon">💰</span>
                                <div>
                                    <strong>Orçamento</strong>
                                    <p>Necessário para construir e manter infraestrutura. Gerencie com cuidado!</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="tutorial-fact">
                            <strong>🌍 Fato:</strong> Uma pessoa precisa de pelo menos 20 litros de água por dia para necessidades básicas.
                        </div>
                    </div>
                `,
                interactive: false
            },
            
            {
                title: 'Primeira Construção',
                content: `
                    <div class="tutorial-step">
                        <h3>🏗️ Sua Primeira Construção</h3>
                        <p>Agora vamos construir sua primeira fonte de água!</p>
                        
                        <div class="tutorial-instructions">
                            <h4>📋 Passos para construir:</h4>
                            <ol>
                                <li>Clique na categoria "💧 Água" no painel esquerdo</li>
                                <li>Selecione "Bomba de Água"</li>
                                <li>Clique em um local verde no mapa para construir</li>
                                <li>Observe como os recursos mudam!</li>
                            </ol>
                        </div>
                        
                        <div class="tutorial-highlight">
                            <h4>🎯 Objetivo:</h4>
                            <p>Construa uma Bomba de Água para começar a produzir água para sua cidade.</p>
                        </div>
                        
                        <div class="tutorial-tip">
                            <strong>💡 Dica:</strong> Bombas de água funcionam melhor em terrenos planos, longe de fontes de poluição.
                        </div>
                        
                        <div class="tutorial-fact">
                            <strong>🔧 Como funciona:</strong> Bombas extraem água de aquíferos subterrâneos usando energia para trazer a água à superfície.
                        </div>
                    </div>
                `,
                interactive: true,
                action: 'build_water_pump'
            },
            
            {
                title: 'Parabéns!',
                content: `
                    <div class="tutorial-step">
                        <h3>🎉 Excelente trabalho!</h3>
                        <p>Você construiu sua primeira fonte de água! Agora sua cidade tem um fornecimento básico de água.</p>
                        
                        <div class="tutorial-achievement">
                            <h4>🏆 Você aprendeu:</h4>
                            <ul>
                                <li>✅ Como navegar pela interface</li>
                                <li>✅ Entender os recursos básicos</li>
                                <li>✅ Construir sua primeira estrutura</li>
                                <li>✅ Observar mudanças nos recursos</li>
                            </ul>
                        </div>
                        
                        <div class="tutorial-next-steps">
                            <h4>🚀 Próximos passos:</h4>
                            <p>Continue jogando para aprender sobre:</p>
                            <ul>
                                <li>Tratamento de água e controle de poluição</li>
                                <li>Armazenamento e distribuição</li>
                                <li>Crescimento populacional sustentável</li>
                                <li>Gestão de crises hídricas</li>
                            </ul>
                        </div>
                        
                        <div class="tutorial-encouragement">
                            <p><strong>🌟 Lembre-se:</strong> Cada decisão que você toma afeta a vida de milhares de pessoas. Seja um verdadeiro Guardião da Água!</p>
                        </div>
                    </div>
                `,
                interactive: false,
                final: true
            }
        ];
        
        console.log(`✅ ${this.tutorialSteps.length} passos do tutorial definidos`);
    }
    
    setupEventListeners() {
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.previousStep());
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextStep());
        }
        
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeTutorial());
        }
        
        // Teclas de navegação
        document.addEventListener('keydown', (e) => {
            if (this.isActive) {
                if (e.key === 'ArrowLeft') this.previousStep();
                if (e.key === 'ArrowRight') this.nextStep();
                if (e.key === 'Escape') this.closeTutorial();
            }
        });
    }
    
    // ===== CONTROLE DO TUTORIAL =====
    startTutorial() {
        console.log('📚 Iniciando tutorial...');
        
        this.isActive = true;
        this.currentStep = 0;
        
        if (this.tutorialScreen) {
            this.tutorialScreen.classList.add('active');
        }
        
        this.showStep(0);
        
        // Pausar jogo se estiver rodando
        if (this.gameManager && this.gameManager.getGameState() === 'playing') {
            this.gameManager.pauseGame();
        }
    }
    
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.tutorialSteps.length) return;
        
        this.currentStep = stepIndex;
        const step = this.tutorialSteps[stepIndex];
        
        // Atualizar conteúdo
        if (this.tutorialContent) {
            this.tutorialContent.innerHTML = step.content;
        }
        
        // Atualizar navegação
        this.updateNavigation();
        
        // Configurar interatividade
        if (step.interactive) {
            this.setupStepInteraction(step);
        }
        
        console.log(`📚 Mostrando passo ${stepIndex + 1}/${this.tutorialSteps.length}: ${step.title}`);
    }
    
    updateNavigation() {
        // Atualizar indicador de página
        if (this.tutorialPage) {
            this.tutorialPage.textContent = `${this.currentStep + 1} / ${this.tutorialSteps.length}`;
        }
        
        // Atualizar botões
        if (this.prevBtn) {
            this.prevBtn.disabled = this.currentStep === 0;
        }
        
        if (this.nextBtn) {
            const currentStepData = this.tutorialSteps[this.currentStep];
            const isLastStep = this.currentStep === this.tutorialSteps.length - 1;
            
            if (isLastStep) {
                this.nextBtn.textContent = 'Finalizar';
            } else {
                this.nextBtn.textContent = 'Próximo →';
            }
            
            // Desabilitar se for passo interativo e ação não foi completada
            if (currentStepData.interactive && !this.isStepCompleted(currentStepData)) {
                this.nextBtn.disabled = true;
            } else {
                this.nextBtn.disabled = false;
            }
        }
    }
    
    nextStep() {
        if (this.currentStep < this.tutorialSteps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.completeTutorial();
        }
        
        AudioManager.playSound('sfx_click');
    }
    
    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
        
        AudioManager.playSound('sfx_click');
    }
    
    // ===== INTERATIVIDADE =====
    setupStepInteraction(step) {
        switch (step.action) {
            case 'build_water_pump':
                this.setupBuildingTutorial('water_pump');
                break;
        }
    }
    
    setupBuildingTutorial(buildingType) {
        // Destacar categoria de água
        const waterCategory = document.querySelector('[data-category="water"]');
        if (waterCategory) {
            waterCategory.classList.add('tutorial-highlight');
        }
        
        // Monitorar construção
        this.monitorBuildingConstruction(buildingType);
    }
    
    monitorBuildingConstruction(buildingType) {
        const checkConstruction = () => {
            if (this.gameManager && this.gameManager.buildingSystem) {
                const buildings = this.gameManager.buildingSystem.getBuildingsByType(buildingType);
                if (buildings.length > 0) {
                    this.onStepCompleted();
                    return;
                }
            }
            
            // Verificar novamente em 500ms
            setTimeout(checkConstruction, 500);
        };
        
        checkConstruction();
    }
    
    onStepCompleted() {
        // Remover highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        // Habilitar botão próximo
        if (this.nextBtn) {
            this.nextBtn.disabled = false;
        }
        
        // Mostrar feedback positivo
        if (this.gameManager && this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                '🎉 Passo do tutorial completado!',
                'success'
            );
        }
        
        AudioManager.playSound('sfx_success');
    }
    
    isStepCompleted(step) {
        if (!step.interactive) return true;
        
        switch (step.action) {
            case 'build_water_pump':
                if (this.gameManager && this.gameManager.buildingSystem) {
                    return this.gameManager.buildingSystem.getBuildingsByType('water_pump').length > 0;
                }
                break;
        }
        
        return false;
    }
    
    // ===== FINALIZAÇÃO =====
    completeTutorial() {
        console.log('📚 Tutorial completado!');
        
        this.completedTutorials.add('basic_tutorial');
        this.closeTutorial();
        
        // Salvar progresso
        this.saveTutorialProgress();
        
        // Mostrar mensagem de conclusão
        if (this.gameManager && this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                '🎓 Tutorial completado! Agora você está pronto para ser um verdadeiro Guardião da Água!',
                'success',
                8000
            );
        }
        
        AudioManager.playSound('sfx_success');
    }
    
    closeTutorial() {
        console.log('📚 Fechando tutorial...');

        this.isActive = false;

        if (this.tutorialScreen) {
            this.tutorialScreen.classList.remove('active');
        }

        // Remover highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });

        // Retomar jogo se estava pausado
        if (this.gameManager && this.gameManager.getGameState() === 'paused') {
            this.gameManager.resumeGame();
        } else {
            // Se não há jogo ativo, retornar ao menu principal
            if (typeof showScreen === 'function') {
                showScreen('main-menu');
            } else {
                // Fallback manual
                document.querySelectorAll('.screen').forEach(screen => {
                    screen.classList.remove('active');
                });
                const mainMenu = document.getElementById('main-menu');
                if (mainMenu) {
                    mainMenu.classList.add('active');
                }
            }
        }

        AudioManager.playSound('sfx_click');
    }
    
    // ===== DICAS CONTEXTUAIS =====
    showHint(message, duration = 5000) {
        if (!this.showHints) return;
        
        if (this.gameManager && this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `💡 Dica: ${message}`,
                'info',
                duration
            );
        }
    }
    
    showEducationalFact(fact) {
        if (this.gameManager && this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `🌍 Você sabia? ${fact}`,
                'info',
                8000
            );
        }
    }
    
    // ===== CONFIGURAÇÕES =====
    setAutoAdvance(enabled) {
        this.autoAdvance = enabled;
    }
    
    setShowHints(enabled) {
        this.showHints = enabled;
        this.saveTutorialProgress();
    }
    
    // ===== PERSISTÊNCIA =====
    saveTutorialProgress() {
        const progress = {
            completedTutorials: Array.from(this.completedTutorials),
            showHints: this.showHints,
            autoAdvance: this.autoAdvance
        };
        
        localStorage.setItem('guardiao_agua_tutorial', JSON.stringify(progress));
    }
    
    loadTutorialProgress() {
        try {
            const saved = localStorage.getItem('guardiao_agua_tutorial');
            if (saved) {
                const progress = JSON.parse(saved);
                this.completedTutorials = new Set(progress.completedTutorials || []);
                this.showHints = progress.showHints !== undefined ? progress.showHints : true;
                this.autoAdvance = progress.autoAdvance || false;
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar progresso do tutorial:', error);
        }
    }
    
    // ===== GETTERS =====
    isBasicTutorialCompleted() {
        return this.completedTutorials.has('basic_tutorial');
    }
    
    getCompletedTutorials() {
        return Array.from(this.completedTutorials);
    }
    
    // ===== CLEANUP =====
    dispose() {
        this.closeTutorial();
        console.log('🗑️ TutorialManager disposed');
    }
}

// Exportar para escopo global
window.TutorialManager = TutorialManager;
console.log('📚 TutorialManager carregado e exportado para window.TutorialManager');
