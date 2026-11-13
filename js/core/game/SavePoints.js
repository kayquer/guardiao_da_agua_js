/**
 * GameManager — pontos de volta (11/2026: a derrota não apaga mais a cidade)
 * Parte da classe GameManager (js/core/GameManager.js), anexada via mixin(): use this.* normalmente.
 *
 * A cada autosave (GAME_CONFIG.gameplay.autoSaveInterval) a foto do jogo entra numa fila em memória
 * (`rewindSnapshots`, JSON: nada é compartilhado com o estado vivo). O espaço `rewind` do SaveSystem guarda
 * a foto de pelo menos REWIND_MS de jogo atrás ("Voltar alguns minutos") e o espaço `safe`, o último autosave
 * com a cidade bem (SaveSystem.isSafePoint). No fim de jogo e no menu dá para voltar a um deles.
 *
 * Cada foto leva também um resumo (água, poluição, satisfação, moradores) e a tendência em relação à foto
 * anterior (js/systems/SavePointTrend.js). Os espaços gravados levam o mesmo em `game.savePoint`, então a derrota
 * mostra em cada opção como a cidade estava e para onde ia, mesmo depois de recarregar a página.
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
        const summary = typeof SavePointTrend !== 'undefined' ? SavePointTrend.summarize(data) : null;
        const prev = snaps[snaps.length - 1];
        const trend = summary && prev?.summary ? SavePointTrend.compare(prev.summary, summary) : null;
        snaps.push({ gameTime: data.gameTime || 0, json, summary, trend });
        if (snaps.length > this.REWIND_KEEP) snaps.splice(0, snaps.length - this.REWIND_KEEP);

        const target = this.getRewindSnapshot(data.gameTime);
        if (target && target.gameTime < data.gameTime) {
            const game = JSON.parse(target.json);
            if (target.summary) game.savePoint = { summary: target.summary, trend: target.trend };
            this.saveSystem.save(game, profile.id, { kind: 'rewind', slot: 'rewind' });
        }
        if (SaveSystem.isSafePoint(data)) {
            const game = summary ? { ...data, savePoint: { summary, trend } } : data;
            this.saveSystem.save(game, profile.id, { kind: 'safe', slot: 'safe' });
        }
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
     * Pontos de volta disponíveis agora: [{ slot: 'rewind'|'safe', gameTime, minutesBack, trend }] (o mais recente
     * primeiro). A foto em memória vale mais que a gravada (é a mesma partida); sem ela, o espaço gravado.
     * `trend` = SavePointTrend.describe(...) ({ text, risky, parts }) ou null.
     */
    getRecoveryOptions() {
        const profile = PlayerProfile.getActive();
        if (!profile) return [];
        const now = this.gameTime || 0;
        const out = [];
        const mem = this.getRewindSnapshot(now);
        if (mem && mem.gameTime < now) {
            out.push({ slot: 'rewind', gameTime: mem.gameTime, point: mem.summary ? { summary: mem.summary, trend: mem.trend } : null });
        } else {
            const rewindTime = this.saveSystem.getSaveInfo(profile.id, 'rewind')?.summary?.gameTime;
            if (Number.isFinite(rewindTime) && rewindTime < now) out.push({ slot: 'rewind', gameTime: rewindTime });
        }
        const safe = this.saveSystem.getSaveInfo(profile.id, 'safe');
        if (safe?.ok && safe.summary.gameTime < now) out.push({ slot: 'safe', gameTime: safe.summary.gameTime });
        out.forEach(o => {
            o.minutesBack = Math.max(1, Math.round((now - o.gameTime) / 60000));
            const point = o.point || this.readSavePoint(profile.id, o.slot);
            o.trend = point && typeof SavePointTrend !== 'undefined'
                ? SavePointTrend.describe(point.summary, point.trend, o.minutesBack) : null;
            delete o.point;
        });
        return out;
    },

    /** Resumo + tendência gravados com o espaço (save sem `savePoint` = só o resumo, sem tendência). */
    readSavePoint(profileId, slot) {
        if (typeof SavePointTrend === 'undefined') return null;
        const result = this.saveSystem.load(profileId, slot);
        if (!result?.ok) return null;
        return result.data.savePoint?.summary
            ? result.data.savePoint
            : { summary: SavePointTrend.summarize(result.data), trend: null };
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
        delete data.savePoint; // só servia para a tela de derrota
        // O terreno nasce com o GameManager: um espaço de outra bacia só abre pelo menu (que recria o mundo)
        if (typeof Basin !== 'undefined' && (data.basin || Basin.defaultId()) !== Basin.id()) {
            this.uiManager?.showNotification(`🗺️ Esse jogo é de outra bacia (${BASIN_MAPS[data.basin]?.name || data.basin}). Abra pelo menu: escolha o jogador e "Outros jogos salvos".`, 'warning', 8000);
            return false;
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
