/**
 * Cartões que param o jogo um instante (UIManager partial, css/mission-card.css):
 * - comemoração da missão: estrelas (1 a 3) com a meta de cada uma, o dinheiro ganho e o próximo estudo;
 * - "que bom ter você de volta" ao continuar um jogo salvo: em que missão estava, o que falta e o que precisa de atenção.
 * Ficam numa fila e só abrem com a tela livre (nada de leitura, tutorial, diálogo ou decisão do Paulo na frente).
 * O cartão está em isInfoPopupOpen (pausa leve) e isReadingOverlayOpen (alertas centrais esperam ele fechar).
 */
mixin(UIManager, {
    queueMissionCelebration(quest, result) {
        (this.missionCardQueue ||= []).push({ kind: 'mission', quest, result });
        this.flushMissionCards();
    },

    /** Depois de carregar um jogo salvo (GameManager.loadGame). */
    queueWelcomeBack() {
        (this.missionCardQueue ||= []).push({ kind: 'welcome' });
        this.flushMissionCards();
    },

    /** Zona evoluiu (ZoneGrowth.evolveZone): o que melhorou e o que piorou com o peso novo. */
    queueZoneEvolution(fromConfig, toConfig) {
        (this.missionCardQueue ||= []).push({ kind: 'zone', fromConfig, toConfig });
        this.flushMissionCards();
    },

    isMissionCardOpen() {
        return !!document.getElementById('mission-card');
    },

    /** Abre o próximo da fila quando dá (UIManager.update, a cada 200 ms). */
    flushMissionCards() {
        if (!this.missionCardQueue?.length || this.isMissionCardOpen()) return;
        const gm = this.gameManager;
        const busy = gm?.gameState !== 'playing' || gm.tutorialSystem?.isActive || this.isReadingOverlayOpen() ||
            document.querySelector('.swal2-container, .central-alert-overlay, #event-decision:not([hidden]), #pause-overlay:not(.hidden)') ||
            this.isTechTreeOpen?.();
        if (busy) return;
        const card = this.missionCardQueue.shift();
        if (card.kind === 'mission') this.showMissionCelebration(card.quest, card.result);
        else if (card.kind === 'zone') this.showZoneEvolution(card.fromConfig, card.toConfig);
        else this.showWelcomeBack();
    },

    /** Linhas do que mudou entre dois pesos de zona: [{ text, good }] (dados de js/data/buildings.js). */
    getZoneEvolutionChanges(from, to) {
        const n = (cfg, key) => Number(cfg?.[key]) || 0;
        const changes = [];
        const diff = (key, label, unit, goodWhenUp) => {
            const delta = n(to, key) - n(from, key);
            if (Math.abs(delta) < 1e-9) return;
            const amount = `${delta > 0 ? '+' : '−'}${Math.abs(Math.round(delta)).toLocaleString('pt-BR')}${unit}`;
            changes.push({ text: `${label}: ${amount}`, good: (delta > 0) === goodWhenUp });
        };
        diff('populationCapacity', '🏠 Moradores', '', true);
        diff('jobCapacity', '💼 Empregos', '', true);
        diff('incomeGeneration', '💵 Renda', ' R$/min', true);
        diff('satisfactionBonus', '😊 Satisfação', '', true);
        diff('powerConsumption', '⚡ Energia gasta', ' MW', false);
        diff('waterConsumption', '🚰 Água gasta', ' L/min', false);
        diff('pollutionGeneration', '🏭 Poluição', '/min', false);
        const runoff = n(to, 'runoffImpervious') - n(from, 'runoffImpervious');
        if (runoff > 0.001) changes.push({ text: `🌧️ Chão coberto: ${Math.round(n(from, 'runoffImpervious') * 100)}% → ${Math.round(n(to, 'runoffImpervious') * 100)}% (mais enxurrada)`, good: false });
        if ((to.runoffImpervious || 0) >= EFFICIENCY_RULES.heavyRunoff) {
            changes.push({ text: `🚧 Precisa de drenagem a até ${EFFICIENCY_RULES.drainageRadius} quadrados, ou alaga com chuva`, good: false });
        }
        return changes;
    },

    showZoneEvolution(fromConfig, toConfig) {
        const changes = this.getZoneEvolutionChanges(fromConfig, toConfig);
        const list = items => items.map(c => `<li class="${c.good ? 'done' : 'missed'}"><span class="mission-card-check">${c.good ? '▲' : '▼'}</span>${c.text}</li>`).join('');
        const good = changes.filter(c => c.good), bad = changes.filter(c => !c.good);
        this.openMissionCard({
            kicker: 'O bairro cresceu!',
            title: `${fromConfig.name} → ${toConfig.name}`,
            body: `${good.length ? `<p class="mission-card-text"><b>O que melhorou</b></p><ul class="mission-card-goals">${list(good)}</ul>` : ''}
                ${bad.length ? `<p class="mission-card-text"><b>O que a cidade precisa aguentar agora</b></p><ul class="mission-card-goals">${list(bad)}</ul>` : ''}
                <p class="mission-card-tip">${uiIcon('status-tip')} A zona recomeça a crescer no peso novo. Mais gente pede mais água, energia e cuidado com a chuva.</p>`,
            button: 'Entendi',
            className: 'zone-evolved'
        });
        this.notificationLog?.add?.(`⬆️ ${fromConfig.name} evoluiu para ${toConfig.name}`, 'success', { game: this.gameManager.gameTime || 0 });
    },

    /** Monta o overlay com o conteúdo e o botão; Enter/Esc também fecham. */
    openMissionCard({ kicker, title, body, button, expression = 'happy', className = '' }) {
        const overlay = document.createElement('div');
        overlay.id = 'mission-card';
        overlay.className = `mission-card-overlay ${className}`;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'mission-card-title');
        overlay.innerHTML = `
            <div class="mission-card">
                <img class="mission-card-portrait" src="assets/characters/claudia/${expression === 'happy' ? 'happy' : 'portrait'}.webp" alt="Pesquisadora Cláudia" draggable="false">
                <div class="mission-card-kicker">${kicker}</div>
                <h2 id="mission-card-title" class="mission-card-title">${title}</h2>
                ${body}
                <button id="mission-card-ok" class="overlay-btn mission-card-ok">${button}</button>
            </div>`;
        (document.getElementById('game-screen') || document.body).appendChild(overlay);
        const close = () => this.closeMissionCard();
        overlay.querySelector('#mission-card-ok').addEventListener('click', close);
        this.missionCardKeys = event => {
            if (event.key !== 'Enter' && event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            close();
        };
        document.addEventListener('keydown', this.missionCardKeys, true);
        overlay.querySelector('#mission-card-ok').focus();
        if (typeof AudioManager !== 'undefined') AudioManager.onSpeaker?.('claudia', expression);
        return overlay;
    },

    closeMissionCard() {
        const overlay = document.getElementById('mission-card');
        if (!overlay) return;
        document.removeEventListener('keydown', this.missionCardKeys, true);
        overlay.classList.add('closing');
        overlay.id = 'mission-card-closing';
        setTimeout(() => overlay.remove(), 220);
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click');
    },

    showMissionCelebration(quest, result = {}) {
        const stars = Math.max(1, Math.min(3, result.stars || 1));
        const goals = result.goals || [];
        const results = result.results || goals.map((_, i) => i < stars);
        const starRow = [0, 1, 2].map(i => `<span class="mission-card-star ${i < stars ? 'earned' : ''}" style="animation-delay:${0.25 + i * 0.3}s" aria-hidden="true">★</span>`).join('');
        const goalRows = goals.map((text, i) => `<li class="${results[i] ? 'done' : 'missed'}"><span class="mission-card-check">${results[i] ? '★' : '☆'}</span>${text}</li>`).join('');
        const rewards = [];
        if (result.budget > 0) {
            const bonus = stars > 1 ? ` <small>(+${Math.round(QuestSystem.STAR_BONUS * (stars - 1) * 100)}% pelas estrelas)</small>` : '';
            rewards.push(`${uiIcon('res-budget')} R$ ${Math.round(result.budget).toLocaleString('pt-BR')}${bonus}`);
        }
        (this.gameManager.questSystem?.describeRewardPerks?.(quest.rewards) || []).forEach(text => rewards.push(text));
        const achievement = quest.rewards?.achievement && typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS[quest.rewards.achievement] : null;
        if (achievement) rewards.push(`${uiIcon('ui-medal')} Conquista: ${achievement.name}`);
        const types = this.gameManager.buildingSystem?.buildingTypes;
        (quest.rewards?.recommendStudy || []).forEach(id => {
            if (types?.has(id) && !this.gameManager.studySystem?.isBuildingUnlocked?.(id)) rewards.push(`${uiIcon('ui-book')} Novo estudo: ${types.get(id).name}`);
        });
        const missed = goals.filter((_, i) => !results[i]);
        const tip = missed.length
            ? `<p class="mission-card-tip">${uiIcon('status-tip')} Na próxima missão, para 3 estrelas: ${missed[0].charAt(0).toLowerCase() + missed[0].slice(1)}.</p>`
            : `<p class="mission-card-tip perfect">${uiIcon('status-star')} Três estrelas! A cidade terminou a missão em ótima forma.</p>`;
        const praise = ['Missão cumprida!', 'Muito bem!', 'Excelente!'][stars - 1];
        this.openMissionCard({
            kicker: `${praise} ${PlayerProfile.displayName()}, você concluiu:`,
            title: PlayerProfile.personalize(quest.title),
            body: `<div class="mission-card-stars stars-${stars}" aria-label="${stars} de 3 estrelas">${starRow}</div>
                <ul class="mission-card-goals">${goalRows}</ul>
                ${rewards.length ? `<div class="mission-card-rewards">${rewards.map(r => `<span class="reward-chip">${r}</span>`).join('')}</div>` : ''}
                ${tip}`,
            button: 'Continuar',
            className: `stars-${stars}`
        });
        this.notificationLog?.add?.(`Missão completa: ${PlayerProfile.personalize(quest.title)} (${stars} de 3 estrelas)`, 'success',
            { game: this.gameManager.gameTime || 0 });
    },

    showWelcomeBack() {
        const qs = this.gameManager.questSystem;
        const active = qs ? [...qs.activeQuests].map(id => qs.quests.get(id)).filter(Boolean) : [];
        const main = (qs && qs.quests.get(qs.currentMainQuest)?.status === 'active' && qs.quests.get(qs.currentMainQuest)) || active[0];
        const fmt = v => Math.round(Number(v) || 0).toLocaleString('pt-BR');
        let missionHtml = `<p class="mission-card-text">${uiIcon('status-tip')} Nenhuma missão ativa agora: um desafio novo da cidade vai aparecer em instantes.</p>`;
        if (main) {
            const pending = main.objectives.filter(o => (o.required > 0 ? (o.current || 0) < o.required : o.violated));
            const rows = (pending.length ? pending : main.objectives).map(o =>
                `<li><span class="mission-card-check">☐</span>${o.description}${o.required > 0 ? ` <b>${fmt(Math.min(o.current || 0, o.required))}/${fmt(o.required)}</b>` : ''}</li>`).join('');
            missionHtml = `<p class="mission-card-text">Você estava na missão <b>${PlayerProfile.personalize(main.title)}</b>. Falta:</p>
                <ul class="mission-card-goals">${rows}</ul>`;
        }
        // O que está piorando ou crítico agora (mesmas faixas dos botões do topo)
        const r = this.gameManager.resourceManager?.resources;
        const names = { water: 'a água', pollution: 'a poluição', population: 'a população', satisfaction: 'a satisfação', budget: 'o dinheiro', energy: 'a energia' };
        const attention = r && typeof ResourceTrends !== 'undefined'
            ? Object.keys(names).filter(id => ['low', 'critical'].includes(ResourceTrends.tierOf(id, r))) : [];
        const cityHtml = attention.length
            ? `<p class="mission-card-tip warn">${uiIcon('status-warning')} Fique de olho: ${attention.map(id => names[id]).join(', ').replace(/, ([^,]*)$/, ' e $1')}.</p>`
            : `<p class="mission-card-tip">${uiIcon('status-done')} A cidade está em ordem: água, energia e moradores bem.</p>`;
        this.openMissionCard({
            kicker: 'Olá de novo!',
            title: `Que bom ter você de volta, ${PlayerProfile.displayName()}!`,
            body: missionHtml + cityHtml,
            button: 'Vamos lá!',
            expression: attention.length ? 'portrait' : 'happy',
            className: 'welcome'
        });
    }
});
