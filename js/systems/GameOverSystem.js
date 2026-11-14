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
    // Empréstimo emergencial proporcional à cidade (getEmergencyLoan). Era R$ 20.000 em 6 parcelas para qualquer cidade:
    // a parcela (R$ 1.696/min) passava da receita inteira de uma cidade pequena, que nunca saía do atraso.
    static EMERGENCY_FUNDS_MINUTES = 12;  // o dinheiro = 12 min de receita, entre o mínimo e o máximo abaixo
    static EMERGENCY_FUNDS_MIN = 12000;   // o bastante para reconstruir o básico
    static EMERGENCY_FUNDS_MAX = 40000;
    static EMERGENCY_INCOME_SHARE = 0.25; // todas as parcelas juntas: até 25% da receita, se o prazo permitir
    static EMERGENCY_MIN_SHARE = 0.1;     // com outras dívidas, esta parcela ainda usa até 10% da receita
    static EMERGENCY_REPEAT_SCALE = [1, 0.75, 0.5]; // cada nova declaração traz menos dinheiro: a conta não vira uma bola de neve
    static EMERGENCY_MONTHS_MIN = 6;
    static EMERGENCY_MONTHS_MAX = 36;     // 36 "meses" = 72 min de jogo
    static EMERGENCY_RATE_FACTOR = 1.5;   // juros 50% acima do que a cidade pagaria num empréstimo normal
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

    // ===== A CAUSA DA DERROTA (11/2026: antes eram só dicas genéricas) =====
    // Poluição: as maiores fontes com a parte de cada uma (mesma conta do painel ☣️ e dos totais: o que cada prédio
    // pronto somou em ResourceManager.addPollutionSource, + esgoto dos moradores, + o resto = eventos). Água: produção ×
    // gasto e quem mais gastava (ResourceManager.getWaterConsumers, a mesma lista do painel 💧). A 1ª dica fala da
    // maior fonte/do maior consumidor.

    /**
     * Fontes de poluição por minuto, agrupadas por tipo, da maior para a menor (puro: testável sem DOM).
     * buildings = BuildingSystem.getAllBuildings(); balance = ResourceManager.getPollutionBalance().
     * Devolve { total, groups: [{ key, name, config?, count, total, share }] }.
     */
    static pollutionCulprits(buildings = [], balance = {}) {
        const groups = new Map();
        let fromBuildings = 0;
        for (const b of buildings) {
            if (!b?.config || !b.effectsApplied) continue;
            const value = Number.isFinite(b.appliedPollution) ? b.appliedPollution : (b.config.pollutionGeneration || 0);
            if (!(value > 0)) continue;
            const key = b.type || b.config.id;
            const g = groups.get(key) || { key, name: b.config.name, config: b.config, count: 0, total: 0 };
            g.count++;
            g.total += value;
            fromBuildings += value;
            groups.set(key, g);
        }
        const list = [...groups.values()];
        const sewage = Math.max(0, balance.sewage || 0);
        if (sewage > 0.05) list.push({ key: 'sewage', name: 'Esgoto dos moradores', count: 1, total: sewage });
        const other = Math.max(0, balance.sources || 0) - fromBuildings;
        if (other > 0.5) list.push({ key: 'events', name: 'Eventos (queimada, enchente…)', count: 1, total: other });
        const total = Math.max(0, balance.sources || 0) + sewage;
        list.sort((a, b) => b.total - a.total);
        list.forEach(g => { g.share = total > 0 ? g.total / total : 0; });
        return { total, groups: list };
    }

    /** Dica que fala da maior fonte de poluição (ou null). */
    static pollutionTip(group) {
        if (!group) return null;
        const c = group.config || {};
        const name = `<b>${group.name}</b>`;
        if (group.key === 'sewage') return '🚽 O <b>esgoto dos moradores</b> era a maior fonte: construa uma <b>ETE</b> antes de abrir bairros novos';
        if (group.key === 'events') return '🔥 Os <b>eventos</b> jogaram muita poluição de uma vez: responda às decisões do Paulo e guarde limpeza sobrando para as crises';
        if ((c.powerGeneration || 0) > 0 && !c.renewable) return `⚡ ${name} era a maior fonte: troque por energia limpa (sol, vento, água) ou só ligue com tratamento e árvores sobrando`;
        if (c.category === 'industrial') return `🏭 ${name} era a maior fonte: indústria só com tratamento sobrando, e prefira a versão mais leve`;
        if (c.zoneType) return `🏘️ ${name} era a maior fonte: bairro maior pede mais <b>ETE</b> e filtros antes de crescer`;
        return `🏗️ ${name} era a maior fonte: compense com limpeza (ETE, filtros, mudas na beira do rio) ou recicle o prédio`;
    }

    /** Quem mais gastava água (getWaterConsumers): { total, groups: [{ key, name, count, total, share }] }. */
    static waterCulprits(consumers = { groups: [], total: 0 }) {
        const total = Math.max(0, consumers.total || 0);
        const groups = (consumers.groups || []).filter(g => g.total > 0).map(g => ({
            key: g.key, name: g.config ? g.config.name : g.name, config: g.config || null,
            count: g.count || 1, total: g.total, people: g.people || 0, share: total > 0 ? g.total / total : 0
        })).sort((a, b) => b.total - a.total);
        return { total, groups };
    }

    /** Dica que fala do maior consumidor de água (ou null). */
    static waterTip(group, production = 0) {
        if (!(production > 0)) return '💧 Nenhuma fonte de água estava funcionando: comece por uma <b>Bomba de Água</b> e veja se ela tem energia e rua';
        if (!group) return null;
        const c = group.config || {};
        const name = `<b>${group.name}</b>`;
        if (group.key === 'residents' || c.zoneType || group.people >= 1) return `👥 ${name} era quem mais gastava (os moradores): abra bairros novos só quando a produção de água sobrar`;
        if (c.category === 'industrial') return `🏭 ${name} gastava muita água: indústria pede mais captação ou água de reúso`;
        return `🚰 ${name} era quem mais gastava: antes de construir outro, ponha mais captação ou um reservatório`;
    }

    /** "<b>Usina a Carvão</b>" ou "<b>3× Zona Industrial</b>". */
    static groupLabel(g) {
        return `<b>${g.count > 1 ? `${g.count}× ` : ''}${g.name}</b>`;
    }

    /** Linhas de "O que aconteceu" + a 1ª dica (sobre a maior causa). { lines, tip, culprits }. */
    analyzeDefeat(reason) {
        const gm = this.gameManager;
        const rm = gm.resourceManager;
        const res = rm?.resources;
        if (!res) return { lines: [], tip: null, culprits: null };
        const fmt = n => Math.round(n).toLocaleString('pt-BR');
        const pct = share => `${Math.round(share * 100)}%`;
        const buildings = gm.buildingSystem?.getAllBuildings() || [];
        const count = ids => buildings.filter(b => ids.includes(b.type) && !b.underConstruction).length;
        if (reason === 'water_depleted') {
            const { production, demand } = rm.getWaterBalance();
            const bs = gm.buildingSystem;
            const consumers = rm.getWaterConsumers?.(buildings, bs?.getEffectivePopulationCapacity ? b => bs.getEffectivePopulationCapacity(b) : undefined);
            const culprits = GameOverSystem.waterCulprits(consumers);
            const top = culprits.groups[0];
            const lines = [`💧 A cidade gastava <b>${fmt(demand)} L/min</b> e produzia só <b>${fmt(production)} L/min</b>`];
            if (top) {
                lines.push(`🚰 Quem mais gastava: ${GameOverSystem.groupLabel(top)}, com <b>${fmt(top.total)} dos ${fmt(culprits.total)} L/min</b> (${pct(top.share)})`);
                culprits.groups.slice(1, 3).forEach(g => lines.push(`· ${GameOverSystem.groupLabel(g)}: ${fmt(g.total)} L/min (${pct(g.share)})`));
            }
            lines.push(`👥 ${fmt(res.population.current)} moradores e ${count(['water_pump', 'water_well', 'water_treatment_plant'])} fonte(s) de água prontas`,
                `🛢️ A caixa da cidade guardava até ${fmt(res.water.storage || res.water.max || 0)} litros`);
            if ((res.water.productionMultiplier ?? 1) < 1) lines.push('☀️ Uma seca cortou a produção das bombas e poços');
            return { lines, tip: GameOverSystem.waterTip(top, production), culprits };
        }
        const balance = rm.getPollutionBalance();
        const culprits = GameOverSystem.pollutionCulprits(buildings, balance);
        const top = culprits.groups[0];
        const lines = [`☣️ Entrava <b>${fmt(culprits.total)}</b> de poluição por minuto e a limpeza tirava só <b>${fmt(balance.reduction)}</b>`];
        if (top) {
            lines.push(`🏭 Quem mais sujava: ${GameOverSystem.groupLabel(top)}, com <b>${fmt(top.total)} dos ${fmt(culprits.total)}</b> pontos de poluição por minuto (${pct(top.share)})`);
            culprits.groups.slice(1, 3).forEach(g => lines.push(`· ${GameOverSystem.groupLabel(g)}: ${fmt(g.total)} por minuto (${pct(g.share)})`));
        }
        lines.push(`🧪 ${count(['treatment_plant', 'filter_station'])} estação(ões) de tratamento prontas`,
            `🌳 ${fmt(gm.treeSystem?.trees?.size ?? 0)} árvores em pé`);
        return { lines, tip: GameOverSystem.pollutionTip(top), culprits };
    }

    /** Linhas de "O que aconteceu" com os números da hora da derrota (L/min, poluição/min, prédios). */
    describeRun(reason) {
        return this.analyzeDefeat(reason).lines;
    }

    buildMessageText(message, reason) {
        const { lines: happened, tip } = this.analyzeDefeat(reason);
        const tips = tip ? [tip, ...message.tips.slice(0, 4)] : message.tips;
        return `<p>${message.intro}</p>
            ${happened.length ? `<p><strong>O que aconteceu?</strong></p><ul class="gameover-causes">${happened.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
            <p><strong>Dicas para a próxima vez:</strong></p>
            <ul class="gameover-tips">${tips.map(t => `<li>${t}</li>`).join('')}</ul>`;
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

        // O último autosave é de segundos antes da derrota: "Continuar" acabaria de novo na hora. Antes ele era
        // apagado (perdia a cidade inteira); agora fica marcado e o menu oferece voltar a um ponto anterior.
        const profile = typeof PlayerProfile !== 'undefined' ? PlayerProfile.getActive() : null;
        if (profile) this.gameManager.saveSystem?.markLost(profile.id);

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
            AnimatedIllustration.unmount(background); // a vitória põe uma ilustração animada aqui
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
        this.renderRecoveryOptions();
    }

    /**
     * Botões "⏪ Voltar N minutos" e "🛟 Voltar ao ponto seguro" (core/game/SavePoints.js): a derrota não precisa
     * custar a cidade inteira. Sem ponto nenhum (derrota logo no começo), não aparecem.
     */
    renderRecoveryOptions() {
        const box = document.getElementById('gameover-recovery');
        if (!box) return;
        const options = this.gameManager.getRecoveryOptions?.() || [];
        box.replaceChildren(...options.map(o => {
            const button = document.createElement('button');
            button.className = 'tutorial-btn recovery-btn';
            button.dataset.slot = o.slot;
            const label = document.createElement('span');
            label.className = 'recovery-label';
            label.textContent = o.slot === 'rewind'
                ? `⏪ Voltar ${o.minutesBack} ${o.minutesBack === 1 ? 'minuto' : 'minutos'}`
                : `🛟 Voltar ao ponto seguro (${o.minutesBack} min antes)`;
            button.append(label);
            // Como a cidade estava ali e para onde ia (SavePointTrend): não voltar às cegas para um ponto já perdido
            if (o.trend) {
                const trend = document.createElement('small');
                trend.className = `recovery-trend${o.trend.risky ? ' recovery-trend--risky' : ''}`;
                trend.innerHTML = o.trend.parts.map(p => `<span class="${p.bad ? 'rt-bad' : p.good ? 'rt-good' : ''}">${p.text}</span>`).join(', ');
                trend.prepend(`há ${o.minutesBack} min: `);
                if (o.trend.risky) trend.append(' — cuidado: a cidade já ia mal ali');
                button.append(trend);
                button.setAttribute('aria-label', `${label.textContent}. ${trend.textContent}`);
            }
            button.addEventListener('click', () => this.gameManager.restoreSavePoint(o.slot));
            return button;
        }));
        box.hidden = !options.length;
    }

    /** Fecha a tela de derrota para carregar um ponto anterior (SavePoints.restoreSavePoint). */
    dismissForRestore() {
        const container = document.getElementById('gameover-container');
        if (container) container.style.display = 'none';
        const button = document.getElementById('gameover-emergency-btn');
        if (button) button.style.display = 'none';
        this.disposePortrait();
        this.isGameOver = false;
        this.gameOverReason = null;
    }

    getEmergenciesLeft() {
        return Math.max(0, this.getEmergencyLimit() - this.emergenciesUsed);
    }

    /** 3 declarações + as ganhas em missão (rewards.emergency). */
    getEmergencyLimit() {
        return GameOverSystem.EMERGENCY_LIVES + (this.extraEmergencies || 0);
    }

    /** Botão "Declarar situação de emergência" e o que ela traz e custa (some quando acabam as declarações). */
    renderEmergencyOffer() {
        const button = document.getElementById('gameover-emergency-btn');
        const text = document.getElementById('gameover-text');
        const left = this.getEmergenciesLeft();
        if (button) {
            button.style.display = left > 0 ? '' : 'none';
            button.innerHTML = `🚨 Declarar situação de emergência <small>(${left} de ${this.getEmergencyLimit()})</small>`;
        }
        if (!text) return;
        const fmt = n => `R$ ${Math.round(n).toLocaleString('pt-BR')}`;
        const loan = left > 0 ? this.getEmergencyLoan() : null;
        text.insertAdjacentHTML('beforeend', left > 0 ? `
            <div class="emergency-offer">
                <p><strong>🚨 Ainda dá para pedir ajuda ao Estado</strong> (restam ${left} de ${this.getEmergencyLimit()} declarações).</p>
                <p>✅ <b>Ajuda:</b> carros-pipa enchem a caixa até a metade, uma força-tarefa limpa o rio (poluição até ${GameOverSystem.EMERGENCY_POLLUTION}%),
                ${fmt(loan.funds)} chegam na hora e a Defesa Civil segura novos problemas por um tempo.</p>
                <p>⚠️ <b>Preço:</b> o dinheiro é um empréstimo com juros maiores (${loan.months} parcelas de ${fmt(loan.payment)}), o governo, os moradores e o comércio confiam menos
                na prefeitura e o Estado intervém por alguns minutos (moradores menos satisfeitos).</p>
            </div>` : `<p class="emergency-offer used"><strong>🚨 As ${this.getEmergencyLimit()} declarações de emergência já foram usadas.</strong> Desta vez não há mais ajuda do Estado.</p>`);
    }

    /** Valor, prazo, juros e parcela do empréstimo que viria agora, conforme a receita e as dívidas da cidade. */
    getEmergencyLoan() {
        const lm = this.gameManager.loanManager;
        const perMinute = this.gameManager.resourceManager?.getBudget?.().income || ResourceManager.BASE_INCOME;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const repeat = GameOverSystem.EMERGENCY_REPEAT_SCALE;
        const scale = repeat[Math.min(this.emergenciesUsed || 0, repeat.length - 1)];
        const base = clamp(perMinute * GameOverSystem.EMERGENCY_FUNDS_MINUTES, GameOverSystem.EMERGENCY_FUNDS_MIN, GameOverSystem.EMERGENCY_FUNDS_MAX);
        const funds = Math.round(base * scale / 500) * 500;
        const rate = lm.calculateInterestRate() * GameOverSystem.EMERGENCY_RATE_FACTOR;
        const monthlyIncome = lm.getMonthlyIncome();
        const room = Math.max(monthlyIncome * GameOverSystem.EMERGENCY_INCOME_SHARE - lm.getMonthlyPayments(),
            monthlyIncome * GameOverSystem.EMERGENCY_MIN_SHARE);
        let months = GameOverSystem.EMERGENCY_MONTHS_MIN;
        while (months < GameOverSystem.EMERGENCY_MONTHS_MAX && lm.calculateMonthlyPayment(funds, months, rate) > room) months++;
        return { funds, months, rate, payment: lm.calculateMonthlyPayment(funds, months, rate) };
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
        const terms = this.getEmergencyLoan(); // antes de contar esta declaração: o mesmo valor que a oferta mostrou
        this.emergenciesUsed++;
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('emergency', { target: this.gameOverReason, value: this.getEmergenciesLeft() });

        // Ajuda: água, poluição, dinheiro (empréstimo emergencial) e calma
        res.water.current = Math.max(res.water.current, (res.water.max || 0) * GameOverSystem.EMERGENCY_WATER_RATIO); // max = capacidade
        res.pollution.current = Math.min(res.pollution.current, GameOverSystem.EMERGENCY_POLLUTION);
        const lm = gm.loanManager;
        const loan = lm.createLoan(terms.funds, terms.months, terms.rate);
        loan.emergency = true;
        // Carência: a primeira parcela só vem quando a Defesa Civil sai, com a cidade já se reerguendo
        loan.nextPaymentAt = lm.simNow() + GameOverSystem.EMERGENCY_CALM_MS;
        lm.cityFinancialHealth.totalDebt += terms.funds;
        lm.cityFinancialHealth.monthlyPayments += loan.monthlyPayment;
        rm.adjustResource('budget', terms.funds);
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
        gm.uiManager?.showNotification(`🚨 Secretário Paulo: situação de emergência declarada! O Estado mandou carros-pipa, uma força-tarefa e R$ ${terms.funds.toLocaleString('pt-BR')} (empréstimo). ${left > 0 ? `Restam ${left}.` : 'Foi a última!'} Agora é cuidar para não precisar de novo.`, 'warning', 10000);
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_alert_warning');
        gm.autoSave?.();
        return true;
    }

    getSaveData() {
        return { used: this.emergenciesUsed, extra: this.extraEmergencies || 0 };
    }

    loadData(data) {
        this.extraEmergencies = Math.max(0, Number(data?.extra) || 0);
        this.emergenciesUsed = Math.max(0, Math.min(this.getEmergencyLimit(), Number(data?.used) || 0));
    }

    // ===== VITÓRIA (missão com victory: true) =====
    // Primeiro um voo de câmera (~12 s) sobre a cidade do próprio jogador (js/systems/CityCinematic.js: rio, bairros,
    // usinas/ETE, giro lento), com faixas de cinema e legendas com os números da partida; pulável, e sem voo com
    // movimento reduzido. A simulação fica parada no voo (gameState 'cinematic'). Depois, o mesmo diálogo do fim de
    // jogo, com a Cláudia feliz, os números da cidade, o resumo do Diário da cidade e "Continuar jogando".
    // Pausa como um popup (holdPause) e não apaga nem encerra nada: o jogo segue no modo livre.
    showVictory() {
        const container = document.getElementById('gameover-container');
        if (!container || this.isGameOver || this.showingVictory || this.victoryFlight) return;
        const gm = this.gameManager;
        gm.cityDiary?.check?.(gm); // a missão final entra no diário antes da tela
        const started = typeof CityCinematic !== 'undefined' &&
            CityCinematic.playVictory(gm, this.victoryCaptions(), () => {
                this.victoryFlight = false;
                this.showVictoryScreen();
            });
        if (started) this.victoryFlight = true;
        else this.showVictoryScreen();
    }

    /** Números reais da partida para as legendas do voo. */
    getVictoryStats() {
        const gm = this.gameManager;
        const res = gm.resourceManager?.resources;
        return {
            day: typeof CityDiary !== 'undefined' ? CityDiary.dayOf(gm) : 1,
            population: Math.round(res?.population?.current || 0),
            river: Math.round(gm.resourceManager?.getRiverLevel?.() ?? res?.water?.river ?? 100),
            species: gm.fieldNotebook?.count?.() || 0,
            missions: gm.questSystem?.completedQuests?.size || 0
        };
    }

    victoryCaptions() {
        const s = this.getVictoryStats();
        const fmt = n => n.toLocaleString('pt-BR');
        // a última legenda é do jogador (textContent: o nome digitado não precisa de escape aqui)
        const name = typeof PlayerProfile !== 'undefined' ? PlayerProfile.displayName() : '';
        return [
            { at: 0.04, text: `Dia ${fmt(s.day)} · ${fmt(s.population)} moradores` },
            { at: 0.28, text: `Rio em ${s.river}%${s.species ? ` · ${s.species} ${s.species === 1 ? 'espécie registrada' : 'espécies registradas'} no caderno` : ''}` },
            { at: 0.52, text: `${fmt(s.missions)} ${s.missions === 1 ? 'missão cumprida' : 'missões cumpridas'} · Cidade Guardiã!` },
            { at: 0.76, text: name ? `E quem cuidou dela foi você, ${name}.` : 'E quem cuidou dela foi você.' }
        ];
    }

    showVictoryScreen() {
        const container = document.getElementById('gameover-container');
        if (!container || this.isGameOver || this.showingVictory) return;
        this.showingVictory = true;
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('victory');
        this.gameManager.holdPause?.('victory');
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_victory');

        const res = this.gameManager.resourceManager?.resources;
        const fmt = n => Math.round(n || 0).toLocaleString('pt-BR');
        const qs = this.gameManager.questSystem;
        const stats = this.getVictoryStats();
        const background = document.getElementById('gameover-background');
        AnimatedIllustration.mountBackdrop(background, 'assets/images/tutorial/bg-cidade-rio.webp');
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
                    <li>📅 ${fmt(stats.day)} ${stats.day === 1 ? 'dia' : 'dias'} de jogo</li>
                    <li>👥 ${fmt(res?.population.current)} moradores, ${fmt(res?.population.satisfaction)}% satisfeitos</li>
                    <li>🏞️ Rio em ${fmt(stats.river)}% · ☣️ Poluição em ${fmt(res?.pollution.current)}%</li>
                    <li>🪨 Aquífero em ${fmt(this.gameManager.resourceManager?.getAquiferLevel())}%</li>
                    <li>📓 ${stats.species} ${stats.species === 1 ? 'espécie registrada' : 'espécies registradas'} no caderno de campo</li>
                    <li>⭐ ${fmt(qs?.totalScore)} pontos e ${qs?.achievements?.size || 0} conquista(s)</li>
                </ul>
                ${this.gameManager.uiManager?.renderDiarySummary?.() || ''}
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
