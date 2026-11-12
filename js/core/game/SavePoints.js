/**
 * GameManager — pontos de volta (11/2026: a derrota não apaga mais a cidade)
 * Parte da classe GameManager (js/core/GameManager.js), anexada via mixin(): use this.* normalmente.
 *
 * A cada autosave (GAME_CONFIG.gameplay.autoSaveInterval) a foto do jogo entra numa fila em memória
 * (`rewindSnapshots`, JSON: nada é compartilhado com o estado vivo). O espaço `rewind` do SaveSystem guarda
 * a foto de pelo menos REWIND_MS de jogo atrás ("Voltar alguns minutos") e o espaço `safe`, o último autosave
 * com a cidade bem (SaveSystem.isSafePoint). No fim de jogo e no menu dá para voltar a um deles.
 */
mixin(GameManager, {
    REWIND_MS: 180000,   // "voltar 3 minutos" de tempo de jogo
    REWIND_KEEP: 16,     // fotos na memória (com autosave de 30 s reais cobre de 8 a 24 min de jogo)

    /** Chamado pelo autoSave com o que acabou de ser salvo no espaço principal. */
    recordSavePoints(data) {
        const profile = PlayerProfile.getActive();
        if (!profile || !data) return;
        const json = JSON.stringify(data);
        const snaps = this.rewindSnapshots || (this.rewindSnapshots = []);
        // relógio voltou (carregou um ponto anterior): as fotos "do futuro" não valem mais
        while (snaps.length && snaps[snaps.length - 1].gameTime > data.gameTime) snaps.pop();
        snaps.push({ gameTime: data.gameTime || 0, json });
        if (snaps.length > this.REWIND_KEEP) snaps.splice(0, snaps.length - this.REWIND_KEEP);

        const target = this.getRewindSnapshot(data.gameTime);
        if (target && target.gameTime < data.gameTime) {
            this.saveSystem.save(JSON.parse(target.json), profile.id, { kind: 'rewind', slot: 'rewind' });
        }
        if (SaveSystem.isSafePoint(data)) this.saveSystem.save(data, profile.id, { kind: 'safe', slot: 'safe' });
    },

    /** Foto mais nova com pelo menos REWIND_MS de jogo atrás; sem nenhuma tão antiga, a mais antiga que houver. */
    getRewindSnapshot(now = this.gameTime) {
        const snaps = this.rewindSnapshots || [];
        const old = snaps.filter(s => s.gameTime <= now - this.REWIND_MS);
        return old.length ? old[old.length - 1] : snaps[0] || null;
    },

    /** Jogo novo: nada do jogo anterior vale como ponto de volta. */
    clearSavePoints() {
        this.rewindSnapshots = [];
    },

    /**
     * Pontos de volta disponíveis agora: [{ slot: 'rewind'|'safe', gameTime, minutesBack }] (o mais recente primeiro).
     * A foto em memória vale mais que a gravada (é a mesma partida); sem ela, o espaço gravado.
     */
    getRecoveryOptions() {
        const profile = PlayerProfile.getActive();
        if (!profile) return [];
        const now = this.gameTime || 0;
        const out = [];
        const mem = this.getRewindSnapshot(now);
        const rewindTime = mem && mem.gameTime < now ? mem.gameTime : this.saveSystem.getSaveInfo(profile.id, 'rewind')?.summary?.gameTime;
        if (Number.isFinite(rewindTime) && rewindTime < now) out.push({ slot: 'rewind', gameTime: rewindTime });
        const safe = this.saveSystem.getSaveInfo(profile.id, 'safe');
        if (safe?.ok && safe.summary.gameTime < now) out.push({ slot: 'safe', gameTime: safe.summary.gameTime });
        out.forEach(o => { o.minutesBack = Math.max(1, Math.round((now - o.gameTime) / 60000)); });
        return out;
    },

    /**
     * Volta a um ponto: 'rewind' (memória ou espaço gravado), 'safe' ou um espaço manual. Carrega no mesmo
     * GameManager (loadGame remonta o mundo) e volta a 'playing'. Devolve true se carregou.
     */
    restoreSavePoint(slot) {
        const profile = PlayerProfile.getActive();
        if (!profile) return false;
        let data = null;
        if (slot === 'rewind') {
            const mem = this.getRewindSnapshot(this.gameTime);
            if (mem && mem.gameTime < (this.gameTime || 0)) data = JSON.parse(mem.json);
        }
        if (!data) {
            const result = this.saveSystem.load(profile.id, slot);
            if (!result.ok) {
                this.uiManager?.showNotification(`⚠️ ${SaveSystem.reasonText(result.reason)}`, 'error');
                return false;
            }
            data = result.data;
        }
        this.gameOverSystem?.dismissForRestore?.();
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('restore', { target: slot });
        const ok = this.loadGame(data, { welcome: false });
        if (ok) {
            this.uiManager?.showNotification(`⏪ De volta: ${SaveSystem.slotLabel(slot).toLowerCase()}. Desta vez você já sabe o que vem pela frente!`, 'success', 6000);
            this.autoSave(); // o jogo atual passa a ser este (a derrota deixa de ser o "continuar")
        }
        return ok;
    },

    /** Painel "Jogos salvos": grava a partida atual num espaço manual. */
    saveToSlot(slot) {
        if (!SaveSystem.MANUAL_SLOTS.includes(slot)) return false;
        if (!this.canSave()) {
            this.uiManager?.showNotification('Termine o tutorial para poder salvar o jogo.', 'warning');
            return false;
        }
        const ok = this.saveSystem.save(this.getSaveData(), PlayerProfile.getActive().id, { kind: 'manual', slot });
        this.uiManager?.showNotification(ok ? `💾 Salvo no ${SaveSystem.slotLabel(slot)}.`
            : '⚠️ Não foi possível salvar (o navegador está sem espaço ou bloqueou o salvamento).', ok ? 'success' : 'error');
        return ok;
    }
});
