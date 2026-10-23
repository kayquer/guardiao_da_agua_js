/**
 * GUARDIÃO DA ÁGUA - GAME OVER SYSTEM
 * Sistema de detecção de condições de fim de jogo e exibição de diálogo educacional
 */

class GameOverSystem {
    constructor(gameManager) {
        log('💀 Inicializando GameOverSystem...');

        this.gameManager = gameManager;
        this.isGameOver = false;
        this.gameOverReason = null;
        
        // Retrato animado da Cláudia (AnimatedPortrait), criado quando o fim de jogo aparece
        this.portrait = null;

        // Game over conditions
        this.conditions = {
            waterDepleted: {
                check: () => {
                    const water = this.gameManager.resourceManager.getResource('water');
                    return water && water.current <= 0;
                },
                reason: 'water_depleted'
            },
            pollutionCritical: {
                check: () => {
                    const pollution = this.gameManager.resourceManager.getResource('pollution');
                    return pollution && pollution.current >= 100;
                },
                reason: 'pollution_critical'
            }
        };

        // Game over messages
        this.messages = this.createGameOverMessages();

        log('✅ GameOverSystem inicializado');
    }

    /**
     * Create game over messages for different failure conditions
     */
    createGameOverMessages() {
        return {
            water_depleted: {
                character: 'Claudia',
                expression: 'worried',
                background: 'assets/images/gameover/bg-sem-agua.webp',
                title: 'A Cidade Ficou Sem Água! 💧',
                text: `<p>Infelizmente, a cidade esgotou completamente suas reservas de água. A população está enfrentando uma crise hídrica severa.</p>
                
                <p><strong>O que aconteceu?</strong></p>
                <ul>
                    <li>💧 A produção de água não acompanhou o consumo da população</li>
                    <li>🏗️ Faltaram <b>Bombas de Água</b> e <b>Estações de Tratamento</b></li>
                    <li>📊 O monitoramento dos recursos não foi suficiente</li>
                </ul>
                
                <p><strong>Dicas para a próxima vez:</strong></p>
                <ul>
                    <li>🔬 Construa <b>Centros de Pesquisa</b> para monitorar os recursos</li>
                    <li>💧 Instale mais <b>Bombas de Água</b> antes que a população cresça muito</li>
                    <li>🌳 Plante <b>Mata Ciliar</b> para proteger as nascentes</li>
                    <li>⚖️ Equilibre o crescimento urbano com a capacidade hídrica</li>
                </ul>`,
                icon: '💧'
            },
            pollution_critical: {
                character: 'Claudia',
                expression: 'worried',
                background: 'assets/images/gameover/bg-poluicao.webp',
                title: 'Poluição Crítica! ☣️',
                text: `<p>A poluição atingiu níveis críticos e tornou a água imprópria para consumo. A saúde pública está em risco.</p>
                
                <p><strong>O que aconteceu?</strong></p>
                <ul>
                    <li>☣️ A poluição acumulou mais rápido do que a capacidade de tratamento</li>
                    <li>🏭 Faltaram <b>Estações de Tratamento de Esgoto</b></li>
                    <li>🌿 Não havia <b>Jardins Flutuantes</b> suficientes para filtrar a água</li>
                </ul>
                
                <p><strong>Dicas para a próxima vez:</strong></p>
                <ul>
                    <li>🏭 Construa <b>Estações de Tratamento</b> antes que a poluição aumente</li>
                    <li>🌿 Use <b>Jardins Flutuantes</b> para redução natural de poluição</li>
                    <li>🔬 Invista em <b>Centros de Pesquisa</b> para monitorar a qualidade da água</li>
                    <li>🌳 Plante <b>Mata Ciliar</b> para filtrar poluentes naturalmente</li>
                    <li>⚖️ Gerencie a agricultura com cuidado para evitar agrotóxicos no rio</li>
                </ul>`,
                icon: '☣️'
            }
        };
    }

    /**
     * Check game over conditions every update
     */
    update(deltaTime) {
        if (this.isGameOver) return;

        // Check all conditions
        for (const condition of Object.values(this.conditions)) {
            if (condition.check()) {
                this.triggerGameOver(condition.reason);
                break;
            }
        }
    }

    /**
     * Trigger game over with specific reason
     */
    triggerGameOver(reason) {
        if (this.isGameOver) return;

        log(`💀 Game Over: ${reason}`);
        this.isGameOver = true;
        this.gameOverReason = reason;

        // Pause the game
        this.gameManager.gameState = 'gameover';
        if (typeof AudioManager !== 'undefined') AudioManager.onGameOver(); // música para, toca o fim triste

        // O último autosave é de segundos antes da derrota: "Continuar" acabaria de novo na hora
        const profile = typeof PlayerProfile !== 'undefined' ? PlayerProfile.getActive() : null;
        if (profile) this.gameManager.saveSystem?.deleteSave(profile.id);

        // Show game over dialog
        this.showGameOverDialog();
    }

    /**
     * Show game over dialog using tutorial-style UI
     */
    showGameOverDialog() {
        const container = document.getElementById('gameover-container');
        if (!container) {
            console.error('❌ Game over container not found');
            return;
        }

        // Show container
        container.style.display = 'flex';

        // Render the message
        this.renderGameOverMessage();
    }

    /**
     * Render game over message based on failure reason
     */
    renderGameOverMessage() {
        const message = this.messages[this.gameOverReason];
        if (!message) {
            console.error('❌ No message found for reason:', this.gameOverReason);
            return;
        }

        // Update background
        const background = document.getElementById('gameover-background');
        if (background) {
            background.style.backgroundImage = `url('${message.background}')`;
        }

        // Retrato animado (o mesmo do tutorial), com a expressão da mensagem
        const slot = document.getElementById('gameover-portrait');
        const id = TutorialSystem.CHARACTERS[message.character]?.id;
        if (slot && id && !this.portrait) {
            this.portrait = new AnimatedPortrait(id, { crop: 'face', label: TutorialSystem.displayName(message.character) });
            slot.replaceChildren(this.portrait.el);
        }
        if (this.portrait) {
            this.portrait.setExpression(message.expression || null);
            this.portrait.enter();
            this.portrait.talk(1800);
        }

        // Update dialog content
        const icon = document.getElementById('gameover-icon');
        if (icon) icon.innerHTML = uiIcon(message.icon, 'lg');

        const title = document.getElementById('gameover-title');
        if (title) title.textContent = message.title;

        const text = document.getElementById('gameover-text');
        if (text) text.innerHTML = message.text;

        const character = document.getElementById('gameover-character-name');
        if (character) character.textContent = TutorialSystem.displayName(message.character);
    }

    /**
     * Return to main menu
     */
    returnToMainMenu() {
        log('🔙 Returning to main menu...');

        this.disposePortrait();

        // Hide game over container
        const container = document.getElementById('gameover-container');
        if (container) {
            container.style.display = 'none';
        }

        // Reset game over state
        this.isGameOver = false;
        this.gameOverReason = null;

        // Volta ao menu recarregando a página (main.js): um GameManager por página. O jogo salvo
        // do perfil fica como estava no último salvamento (o fim de jogo não é salvo).
        leaveToMainMenu();
    }

    disposePortrait() {
        this.portrait?.destroy();
        this.portrait = null;
    }

    /**
     * Cleanup
     */
    dispose() {
        this.disposePortrait();
        log('🗑️ GameOverSystem disposed');
    }
}

// Export to global scope
window.GameOverSystem = GameOverSystem;
log('💀 GameOverSystem carregado e exportado para window.GameOverSystem');
