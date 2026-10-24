/**
 * GUARDIÃO DA ÁGUA - GAME OVER SYSTEM
 * Sistema de detecção de condições de fim de jogo e exibição de diálogo educacional
 */

class GameOverSystem {
    // ===== SITUAÇÃO DE EMERGÊNCIA (as "vidas" da partida) =====
    // No fim de jogo, enquanto houver declarações, o prefeito pode pedir ajuda ao Estado e continuar. Ajuda real
    // (carros-pipa, força-tarefa contra a poluição, dinheiro, um tempo sem eventos) com preço real (empréstimo
    // com juros maiores, confiança dos grupos em queda, intervenção do Estado com moradores menos satisfeitos).
    static EMERGENCY_LIVES = 3;
    static EMERGENCY_WATER_RATIO = 0.5;   // carros-pipa enchem a caixa até a metade
    static EMERGENCY_POLLUTION = 55;      // força-tarefa baixa a poluição até aqui
    static EMERGENCY_FUNDS = 20000;       // vem como empréstimo emergencial
    static EMERGENCY_LOAN_MONTHS = 6;
    static EMERGENCY_RATE_FACTOR = 1.5;   // juros 50% acima do normal
    static EMERGENCY_CALM_MS = 180000;    // Defesa Civil: 3 min de jogo sem eventos novos
    static EMERGENCY_REPUTATION = { government: -10, citizens: -6, business: -6 };

    constructor(gameManager) {
        log('💀 Inicializando GameOverSystem...');

        this.gameManager = gameManager;
        this.isGameOver = false;
        this.gameOverReason = null;
        this.emergenciesUsed = 0; // salvo (GameManager.getSaveData → emergency)
        
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
     * Mensagens de fim de jogo. O "O que aconteceu" vem dos números da partida (describeRun), e as dicas só citam
     * prédios que existem e fazem o que a dica diz (antes falavam de "Mata Ciliar" e agricultura, que não existem).
     */
    createGameOverMessages() {
        return {
            water_depleted: {
                character: 'Claudia',
                expression: 'worried',
                background: 'assets/images/gameover/bg-sem-agua.webp',
                title: 'A Cidade Ficou Sem Água! 💧',
                intro: 'A cidade esgotou as reservas de água. A população está enfrentando uma crise hídrica.',
                tips: [
                    '💧 Construa mais <b>Bombas de Água</b> ou <b>Poços</b> antes que a população cresça',
                    "🛢️ Um <b>Reservatório</b> ou uma <b>Caixa d'Água</b> guarda água para os momentos de seca",
                    '🌧️ <b>Jardins de Chuva</b> e <b>Tetos Verdes</b> guardam a água da chuva',
                    '📊 Abra o painel 💧: se o gasto passa da produção, a reserva vai secar',
                    '⚖️ Cresça a cidade no ritmo que a água aguenta'
                ],
                icon: '💧'
            },
            pollution_critical: {
                character: 'Claudia',
                expression: 'worried',
                background: 'assets/images/gameover/bg-poluicao.webp',
                title: 'Poluição Crítica! ☣️',
                intro: 'A poluição chegou ao máximo e deixou a água imprópria para consumo. A saúde de todos está em risco.',
                tips: [
                    '🏭 Construa <b>Estações de Tratamento</b> e <b>de Filtros</b> antes que a poluição suba',
                    '🪷 <b>Jardins Flutuantes</b> e o <b>Parque Linear</b> limpam a água com plantas',
                    '🌳 Cada árvore em pé limpa um pouco: plante <b>Mudas</b> e evite derrubar a mata para construir',
                    '🏗️ Indústrias rendem dinheiro, mas sujam o rio: só amplie com tratamento sobrando',
                    '📊 Abra o painel ☣️: se a sujeira que entra passa da limpeza, a poluição só sobe'
                ],
                icon: '☣️'
            }
        };
    }

    /** Linhas de "O que aconteceu" com os números da hora da derrota (L/min, poluição/min, prédios). */
    describeRun(reason) {
        const rm = this.gameManager.resourceManager;
        const res = rm?.resources;
        if (!res) return [];
        const fmt = n => Math.round(n).toLocaleString('pt-BR');
        const count = ids => (this.gameManager.buildingSystem?.getAllBuildings() || [])
            .filter(b => ids.includes(b.type) && !b.underConstruction).length;
        if (reason === 'water_depleted') {
            const { production, demand } = rm.getWaterBalance();
            const lines = [`💧 A cidade gastava <b>${fmt(demand)} L/min</b> e produzia só <b>${fmt(production)} L/min</b>`,
                `👥 ${fmt(res.population.current)} moradores e ${count(['water_pump', 'water_well'])} fonte(s) de água prontas`,
                `🛢️ A caixa da cidade guardava até ${fmt(res.water.storage || res.water.max || 0)} litros`];
            if ((res.water.productionMultiplier ?? 1) < 1) lines.push('☀️ Uma seca cortou a produção das bombas e poços');
            return lines;
        }
        const { sources, sewage, reduction } = rm.getPollutionBalance();
        return [`☣️ Entrava <b>${fmt(sources + sewage)}</b> de poluição por minuto (${fmt(sewage)} do esgoto dos moradores) e a limpeza tirava só <b>${fmt(reduction)}</b>`,
            `🏭 ${count(['treatment_plant', 'filter_station'])} estação(ões) de tratamento prontas`,
            `🌳 ${fmt(this.gameManager.treeSystem?.trees?.size ?? 0)} árvores em pé`];
    }

    buildMessageText(message, reason) {
        const happened = this.describeRun(reason);
        return `<p>${message.intro}</p>
            ${happened.length ? `<p><strong>O que aconteceu?</strong></p><ul>${happened.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
            <p><strong>Dicas para a próxima vez:</strong></p>
            <ul>${message.tips.map(t => `<li>${t}</li>`).join('')}</ul>`;
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
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('game_over', { target: reason, value: this.getEmergenciesLeft() });
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
            setTimeout(() => AudioManager.onSpeaker(id, 'sad'), 1200); // depois do jingle de fim de jogo
            this.portrait.enter();
            this.portrait.talk(1800);
        }

        // Update dialog content
        const icon = document.getElementById('gameover-icon');
        if (icon) icon.innerHTML = uiIcon(message.icon, 'lg');

        const title = document.getElementById('gameover-title');
        if (title) title.textContent = message.title;

        const text = document.getElementById('gameover-text');
        if (text) text.innerHTML = this.buildMessageText(message, this.gameOverReason);

        const character = document.getElementById('gameover-character-name');
        if (character) character.textContent = TutorialSystem.displayName(message.character);
        this.renderEmergencyOffer();
    }

    getEmergenciesLeft() {
        return Math.max(0, GameOverSystem.EMERGENCY_LIVES - this.emergenciesUsed);
    }

    /** Botão "Declarar situação de emergência" e o que ela traz e custa (some quando acabam as declarações). */
    renderEmergencyOffer() {
        const button = document.getElementById('gameover-emergency-btn');
        const text = document.getElementById('gameover-text');
        const left = this.getEmergenciesLeft();
        if (button) {
            button.style.display = left > 0 ? '' : 'none';
            button.innerHTML = `🚨 Declarar situação de emergência <small>(${left} de ${GameOverSystem.EMERGENCY_LIVES})</small>`;
        }
        if (!text) return;
        const fmt = n => `R$ ${n.toLocaleString('pt-BR')}`;
        text.insertAdjacentHTML('beforeend', left > 0 ? `
            <div class="emergency-offer">
                <p><strong>🚨 Ainda dá para pedir ajuda ao Estado</strong> (restam ${left} de ${GameOverSystem.EMERGENCY_LIVES} declarações).</p>
                <p>✅ <b>Ajuda:</b> carros-pipa enchem a caixa até a metade, uma força-tarefa limpa o rio (poluição até ${GameOverSystem.EMERGENCY_POLLUTION}%),
                ${fmt(GameOverSystem.EMERGENCY_FUNDS)} chegam na hora e a Defesa Civil segura novos problemas por um tempo.</p>
                <p>⚠️ <b>Preço:</b> o dinheiro é um empréstimo com juros maiores, o governo, os moradores e o comércio confiam menos
                na prefeitura e o Estado intervém por alguns minutos (moradores menos satisfeitos).</p>
            </div>` : `<p class="emergency-offer used"><strong>🚨 As ${GameOverSystem.EMERGENCY_LIVES} declarações de emergência já foram usadas.</strong> Desta vez não há mais ajuda do Estado.</p>`);
    }

    /**
     * Declara situação de emergência: gasta uma "vida", aplica a ajuda e o preço e devolve o jogo. Devolve false se
     * não há fim de jogo ou declarações.
     */
    declareEmergency() {
        if (!this.isGameOver || this.getEmergenciesLeft() <= 0) return false;
        const gm = this.gameManager;
        const rm = gm.resourceManager;
        const res = rm.resources;
        this.emergenciesUsed++;
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('emergency', { target: this.gameOverReason, value: this.getEmergenciesLeft() });

        // Ajuda: água, poluição, dinheiro (empréstimo emergencial) e calma
        res.water.current = Math.max(res.water.current, (res.water.max || 0) * GameOverSystem.EMERGENCY_WATER_RATIO); // max = capacidade
        res.pollution.current = Math.min(res.pollution.current, GameOverSystem.EMERGENCY_POLLUTION);
        const lm = gm.loanManager;
        if (lm) {
            const rate = (lm.config?.baseInterestRate || 0.1) * GameOverSystem.EMERGENCY_RATE_FACTOR;
            const loan = lm.createLoan(GameOverSystem.EMERGENCY_FUNDS, GameOverSystem.EMERGENCY_LOAN_MONTHS, rate);
            loan.emergency = true;
            if (lm.cityFinancialHealth) {
                lm.cityFinancialHealth.totalDebt += GameOverSystem.EMERGENCY_FUNDS;
                lm.cityFinancialHealth.monthlyPayments += loan.monthlyPayment;
            }
        }
        rm.adjustResource('budget', GameOverSystem.EMERGENCY_FUNDS);
        const es = gm.eventSystem;
        if (es) {
            // A Defesa Civil assume as ameaças em andamento e nada novo chega por um tempo
            [...es.activeEvents.values()].filter(e => e.config?.severity !== 'positive').forEach(e => es.endEvent(e.id));
            es.pendingEvents = es.pendingEvents.filter(p => es.eventTypes.get(p.type)?.severity === 'positive');
            es.lastEventTime = -GameOverSystem.EMERGENCY_CALM_MS;
            es.triggerEvent('state_intervention', true);
        }
        // Preço: confiança dos grupos
        gm.questSystem?.changeReputation?.(GameOverSystem.EMERGENCY_REPUTATION, 'Situação de emergência');

        // De volta ao jogo
        const container = document.getElementById('gameover-container');
        if (container) container.style.display = 'none';
        const button = document.getElementById('gameover-emergency-btn');
        if (button) button.style.display = 'none';
        this.disposePortrait();
        this.isGameOver = false;
        this.gameOverReason = null;
        gm.gameState = 'playing';
        const left = this.getEmergenciesLeft();
        gm.uiManager?.showNotification(`🚨 Secretário Paulo: situação de emergência declarada! O Estado mandou carros-pipa, uma força-tarefa e R$ ${GameOverSystem.EMERGENCY_FUNDS.toLocaleString('pt-BR')} (empréstimo). ${left > 0 ? `Restam ${left}.` : 'Foi a última!'} Agora é cuidar para não precisar de novo.`, 'warning', 10000);
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_alert_warning');
        gm.autoSave?.();
        return true;
    }

    getSaveData() {
        return { used: this.emergenciesUsed };
    }

    loadData(data) {
        this.emergenciesUsed = Math.max(0, Math.min(GameOverSystem.EMERGENCY_LIVES, Number(data?.used) || 0));
    }

    // ===== VITÓRIA (missão com victory: true) =====
    // Mesmo diálogo do fim de jogo, com a Cláudia feliz, os números da cidade e "Continuar jogando".
    // Pausa como um popup (holdPause) e não apaga nem encerra nada: o jogo segue no modo livre.
    showVictory() {
        const container = document.getElementById('gameover-container');
        if (!container || this.isGameOver) return;
        this.showingVictory = true;
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('victory');
        this.gameManager.holdPause?.('victory');
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_victory');

        const res = this.gameManager.resourceManager?.resources;
        const fmt = n => Math.round(n || 0).toLocaleString('pt-BR');
        const qs = this.gameManager.questSystem;
        const background = document.getElementById('gameover-background');
        if (background) background.style.backgroundImage = "url('assets/images/tutorial/bg-cidade-rio.webp')";
        const slot = document.getElementById('gameover-portrait');
        const id = TutorialSystem.CHARACTERS.Claudia?.id;
        if (slot && id && !this.portrait) {
            this.portrait = new AnimatedPortrait(id, { crop: 'face', label: TutorialSystem.displayName('Claudia') });
            slot.replaceChildren(this.portrait.el);
        }
        if (this.portrait) {
            this.portrait.setExpression('happy');
            setTimeout(() => AudioManager.onSpeaker(id, 'happy'), 1200);
            this.portrait.enter();
            this.portrait.talk(1800);
        }
        const icon = document.getElementById('gameover-icon');
        if (icon) icon.innerHTML = uiIcon('status-star', 'lg');
        const title = document.getElementById('gameover-title');
        if (title) title.textContent = 'Cidade Guardiã! 🏆';
        const text = document.getElementById('gameover-text');
        if (text) {
            text.innerHTML = `<p>${PlayerProfile.personalize('Parabéns, {nome}! Sua cidade cresceu e a água continua lá: no rio, na caixa e debaixo da terra.')}</p>
                <p><strong>Sua cidade agora:</strong></p>
                <ul>
                    <li>👥 ${fmt(res?.population.current)} moradores, ${fmt(res?.population.satisfaction)}% satisfeitos</li>
                    <li>☣️ Poluição em ${fmt(res?.pollution.current)}%</li>
                    <li>🪨 Aquífero em ${fmt(this.gameManager.resourceManager?.getAquiferLevel())}%</li>
                    <li>⭐ ${fmt(qs?.totalScore)} pontos e ${qs?.achievements?.size || 0} conquista(s)</li>
                </ul>
                <p>Você pode continuar cuidando da cidade no modo livre: os eventos continuam chegando.</p>`;
        }
        const character = document.getElementById('gameover-character-name');
        if (character) character.textContent = TutorialSystem.displayName('Claudia');
        const continueBtn = document.getElementById('gameover-continue-btn');
        if (continueBtn) continueBtn.style.display = '';
        container.style.display = 'flex';
    }

    continueAfterVictory() {
        const container = document.getElementById('gameover-container');
        if (container) container.style.display = 'none';
        const continueBtn = document.getElementById('gameover-continue-btn');
        if (continueBtn) continueBtn.style.display = 'none';
        this.disposePortrait();
        this.showingVictory = false;
        this.gameManager.releasePause?.('victory');
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
        const emergencyBtn = document.getElementById('gameover-emergency-btn');
        if (emergencyBtn) emergencyBtn.style.display = 'none';

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
