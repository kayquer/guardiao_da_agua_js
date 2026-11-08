/**
 * UIManager — "📊 Dados da pesquisa" na tela de pausa: resumo do registro do perfil (ResearchLog) e exportação em
 * JSON ou CSV para a dissertação. Mesmo esquema do histórico de notificações: o painel troca de lugar com o do
 * jogador e o Esc volta para a pausa.
 */
mixin(UIManager, {
    setupResearchPanel() {
        document.getElementById('btn-research')?.addEventListener('click', () => this.openResearchPanel());
        document.getElementById('btn-research-back')?.addEventListener('click', () => this.closeResearchPanel());
        document.getElementById('btn-research-json')?.addEventListener('click', () => this.downloadResearch('json'));
        document.getElementById('btn-research-csv')?.addEventListener('click', () => this.downloadResearch('csv'));
        document.getElementById('btn-research-send')?.addEventListener('click', () => this.sendResearch());
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isResearchPanelOpen()) {
                event.preventDefault();
                this.closeResearchPanel();
            }
        });
    },

    isResearchPanelOpen() {
        const panel = document.getElementById('research-panel');
        return !!panel && !panel.hidden;
    },

    openResearchPanel() {
        const panel = document.getElementById('research-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel) return;
        if (playerPanel) playerPanel.hidden = true;
        panel.hidden = false;
        this.renderResearchPanel();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_open');
        document.getElementById('btn-research-back')?.focus();
    },

    closeResearchPanel({ focus = true } = {}) {
        const panel = document.getElementById('research-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel || panel.hidden) return;
        panel.hidden = true;
        if (playerPanel) playerPanel.hidden = false;
        if (focus) document.getElementById('btn-research')?.focus();
    },

    renderResearchPanel() {
        const box = document.getElementById('rs-summary');
        if (!box) return;
        const s = ResearchLog.summary();
        const item = (icon, value, label) => `<div class="rs-item"><span class="rs-icon" aria-hidden="true">${icon}</span><b>${value}</b><span>${label}</span></div>`;
        box.innerHTML = [
            item('🎮', s.sessions, s.sessions === 1 ? 'sessão' : 'sessões'),
            item('📖', s.pages, `${s.pages === 1 ? 'página lida' : 'páginas lidas'} (${s.readingMinutes.toLocaleString('pt-BR')} min)`),
            item('🎓', `${s.quizzesPassed}/${s.quizzes}`, 'quizzes aprovados'),
            item('🌿', `${s.goodDecisions}/${s.decisions}`, 'boas decisões com o Paulo'),
            item('🎯', s.missions, s.missions === 1 ? 'missão concluída' : 'missões concluídas'),
            item('📚', s.lessons, s.lessons === 1 ? 'aula concluída' : 'aulas concluídas')
        ].join('');
        const count = document.getElementById('rs-count');
        if (count) count.textContent = `${s.events} registros`;
        this.renderStrategyReport();
        this.renderResearchSync();
    },

    /** Situação do envio à planilha da pesquisa (ResearchSync): automático ligado?, pendentes, último envio. */
    renderResearchSync(message) {
        const box = document.getElementById('rs-sync');
        const button = document.getElementById('btn-research-send');
        if (!box) return;
        const configured = ResearchSync.isConfigured();
        if (button) button.disabled = !configured || !!ResearchSync.running;
        if (!configured) {
            box.textContent = '☁️ O servidor da pesquisa ainda não foi configurado: por enquanto, use os botões de baixar.';
            return;
        }
        const pending = ResearchSync.pendingCount();
        const last = ResearchSync.lastSentAt();
        const time = last ? new Date(last).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;
        const parts = [
            ResearchSync.hasConsent() ? '☁️ Envio automático ligado (a cada 5 min)' : '☁️ Envio automático desligado no aviso inicial',
            pending ? `${pending} ${pending === 1 ? 'registro esperando' : 'registros esperando'} (todos os jogadores deste computador)` : 'tudo enviado',
            time ? `último envio: ${time}` : 'nada enviado ainda'
        ];
        box.textContent = message || parts.join(' · ');
    },

    /** "☁️ Enviar para a pesquisa": envia na hora o que falta de todos os perfis deste computador. */
    async sendResearch() {
        if (!ResearchSync.isConfigured() || ResearchSync.running) return;
        const button = document.getElementById('btn-research-send');
        if (button) button.disabled = true;
        this.renderResearchSync('☁️ Enviando…');
        const result = await ResearchSync.syncAll();
        this.renderResearchSync();
        if (result.ok) {
            this.showNotification(result.sent ? `☁️ ${result.sent} registros enviados para a pesquisa.` : '☁️ Nada novo para enviar: está tudo na pesquisa.', 'success', 3500);
        } else {
            this.showNotification('☁️ Não deu para enviar agora (sem internet?). O jogo tenta de novo sozinho; os dados continuam aqui.', 'warning', 5000);
        }
    },

    /** Escolhas repetidas entre os perfis deste computador: ajuda a achar uma "receita" que domina o jogo. */
    renderStrategyReport() {
        const box = document.getElementById('rs-strategy');
        if (!box) return;
        const r = ResearchLog.strategyReport();
        const types = this.gameManager.buildingSystem?.buildingTypes;
        const name = id => types?.get(id)?.name || id;
        const tiers = { max: 'a resposta mais forte', mid: 'a resposta média', low: 'a resposta mínima', none: 'não fazer nada' };
        const line = (label, data, show) => data.total
            ? `<li class="${r.flags.includes(label) ? 'rs-flag' : ''}">${show(data.key)} — ${Math.round(data.share * 100)}% (${data.count} de ${data.total})${r.flags.includes(label) ? ' ⚠️ quase todos fazem igual' : ''}</li>`
            : '';
        const items = [
            line('opening', r.opening, key => `Abertura mais comum: ${key.split(' → ').map(name).join(' → ')}`),
            line('energy', r.energy, key => `Usina mais construída: ${name(key)}`),
            line('decisions', r.decisions, key => `Resposta mais dada ao Paulo: ${tiers[key] || key}`)
        ].join('');
        box.innerHTML = `<h3 class="rs-strategy-title">🔁 Escolhas repetidas <small>(${r.profiles} ${r.profiles === 1 ? 'perfil' : 'perfis'} neste computador)</small></h3>
            ${items ? `<ul>${items}</ul>` : '<p class="nh-hint">Ainda não há jogadas suficientes para comparar.</p>'}
            <p class="nh-hint">Se 80% ou mais fazem a mesma escolha, ela pode estar forte demais (estratégia dominante).</p>`;
    },

    /** Baixa o arquivo pelo navegador (nada sai do computador sem esse clique). */
    downloadResearch(kind) {
        const profileId = ResearchLog.profileKey();
        const body = kind === 'csv' ? '﻿' + ResearchLog.toCSV(profileId) // BOM: o Excel lê os acentos
            : JSON.stringify(ResearchLog.toJSON(profileId), null, 2);
        const blob = new Blob([body], { type: kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `guardiao-pesquisa-${profileId}-${new Date().toISOString().slice(0, 10)}.${kind}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.showNotification(`📊 Dados da pesquisa baixados (${kind.toUpperCase()}).`, 'success', 3000);
    }
});
