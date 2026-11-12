/**
 * GUARDIÃO DA ÁGUA - SAVE SYSTEM
 * Um jogo salvo por perfil de jogador (PlayerProfile), no localStorage: cada aluno continua o seu jogo.
 * Sem DOM nem Babylon (testável em tests/unit). Quem monta o conteúdo é GameManager.getSaveData();
 * quem aplica é GameManager.loadGame().
 *
 * Formato gravado (envelope):
 *   { format: 'guardiao_agua_save', version, profileId, savedAt, kind: 'manual'|'auto', summary, game }
 * - version: SaveSystem.VERSION. Save de outra versão (ou o formato antigo, sem prédios) é recusado
 *   como 'incompatible'; JSON quebrado ou sem os campos essenciais, como 'corrupt'.
 * - summary: o que a tela de perfis mostra sem abrir o jogo inteiro (data, nº de construções...).
 * - lost: true depois de um fim de jogo (markLost): o menu oferece voltar a um ponto anterior em vez de continuar.
 *
 * Espaços (slots) por perfil, 11/2026 (derrota não apaga mais a cidade):
 *   main (o de sempre: autosave e "Salvar jogo"), safe (ponto seguro: último autosave com a cidade bem),
 *   rewind ("alguns minutos antes", GameManager.recordSavePoints) e slot_1…slot_3 (manuais, painel "Jogos salvos").
 */
class SaveSystem {
    static VERSION = 3; // 3: mapa novo, com rio, planície e APP (o terreno não é salvo)
    static FORMAT = 'guardiao_agua_save';
    // Partida sem volta (isLostGame): água abaixo de 5% da capacidade ou poluição a partir de 90
    static LOST_WATER_RATIO = 0.05;
    static LOST_POLLUTION = 90;
    static KEY_PREFIX = STORAGE_PREFIX + 'save_';
    static SLOTS = ['main', 'safe', 'rewind', 'slot_1', 'slot_2', 'slot_3'];
    static MANUAL_SLOTS = ['slot_1', 'slot_2', 'slot_3'];
    // Ponto seguro (isSafePoint): caixa com água, poluição longe do alarme e moradores ao menos razoáveis
    static SAFE_WATER_RATIO = 0.25;
    static SAFE_POLLUTION = 60;
    static SAFE_SATISFACTION = 40;
    // Chaves do formato antigo (um save só para todo mundo, sem prédios): nunca carregavam direito
    static LEGACY_KEYS = ['guardiao_agua_autosave', 'guardiao_agua_save_manual_save', 'guardiao_agua_save_list'];

    constructor() {
        this.storageAvailable = SaveSystem.checkStorageSupport();
        if (this.storageAvailable) SaveSystem.clearLegacySaves();
        log('💾 SaveSystem inicializado');
    }

    static checkStorageSupport() {
        try {
            const test = '__guardiao_teste__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            logWarn('⚠️ localStorage não disponível: o jogo não poderá ser salvo');
            return false;
        }
    }

    static clearLegacySaves() {
        SaveSystem.LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
    }

    /** Chave do espaço: `main` é a chave antiga (saves de antes continuam abrindo); os outros ganham `__<slot>`. */
    static keyFor(profileId, slot = 'main') {
        const base = `${SaveSystem.KEY_PREFIX}${profileId || 'sem_perfil'}`;
        return !slot || slot === 'main' ? base : `${base}__${slot}`;
    }

    /** Nome do espaço para a tela. */
    static slotLabel(slot) {
        return {
            main: 'Jogo atual', safe: 'Ponto seguro', rewind: 'Alguns minutos antes',
            slot_1: 'Espaço 1', slot_2: 'Espaço 2', slot_3: 'Espaço 3'
        }[slot] || slot;
    }

    /**
     * Ponto seguro: a cidade está bem o bastante para recomeçar dali (não é derrota, tem água, a poluição está
     * longe do alarme e os moradores não estão revoltados). Puro: recebe o `game` de getSaveData.
     */
    static isSafePoint(game) {
        if (!game || SaveSystem.isLostGame(game)) return false;
        const r = game.resources?.resources;
        if (!r) return false;
        const water = r.water || {};
        const capacity = water.max || water.storage || 0;
        if (!(capacity > 0) || !(water.current / capacity >= SaveSystem.SAFE_WATER_RATIO)) return false;
        if (!((r.pollution?.current ?? 100) < SaveSystem.SAFE_POLLUTION)) return false;
        return (r.population?.satisfaction ?? 0) >= SaveSystem.SAFE_SATISFACTION;
    }

    // ===== Formato (puro: sem localStorage) =====

    /** Monta o envelope que vai para o localStorage. */
    static buildEnvelope(game, profileId, { kind = 'auto', now = Date.now() } = {}) {
        return {
            format: SaveSystem.FORMAT,
            version: SaveSystem.VERSION,
            profileId,
            savedAt: now,
            kind,
            summary: {
                gameTime: game.gameTime || 0,
                gameClockTime: game.gameClockTime || null,
                buildingCount: game.buildings?.buildings?.length || 0,
                population: Math.round(game.resources?.resources?.population?.current || 0),
                score: game.quests?.totalScore || 0,
                completedQuests: game.quests?.completedQuests?.length || 0
            },
            game
        };
    }

    /**
     * Lê o texto gravado. Nunca lança: devolve { ok: true, envelope } ou { ok: false, reason }
     * com reason 'missing' | 'corrupt' | 'incompatible'.
     */
    static parseEnvelope(raw, profileId = null) {
        if (raw === null || raw === undefined || raw === '') return { ok: false, reason: 'missing' };
        let envelope;
        try {
            envelope = JSON.parse(raw);
        } catch (error) {
            return { ok: false, reason: 'corrupt' };
        }
        if (!envelope || typeof envelope !== 'object') return { ok: false, reason: 'corrupt' };
        // Formato antigo (metadata/gameData) ou de outra versão do jogo
        if (envelope.format !== SaveSystem.FORMAT) {
            return { ok: false, reason: envelope.metadata || envelope.gameData ? 'incompatible' : 'corrupt' };
        }
        if (envelope.version !== SaveSystem.VERSION) return { ok: false, reason: 'incompatible' };
        if (profileId && envelope.profileId !== profileId) return { ok: false, reason: 'corrupt' };

        const game = envelope.game;
        const valid = game && typeof game === 'object' &&
            Number.isFinite(game.gameTime) &&
            game.resources && typeof game.resources.resources === 'object' &&
            game.buildings && Array.isArray(game.buildings.buildings) &&
            game.trees && Array.isArray(game.trees.cells) &&
            game.quests && typeof game.quests === 'object';
        if (!valid) return { ok: false, reason: 'corrupt' };
        return { ok: true, envelope };
    }

    /**
     * Partida sem volta: game over, água abaixo de LOST_WATER_RATIO da capacidade ou poluição a partir de
     * LOST_POLLUTION. Continuar um jogo assim terminaria em segundos, então o menu oferece só um jogo novo.
     * Recebe o `game` do envelope (o mesmo de getSaveData).
     */
    static isLostGame(game) {
        const r = game?.resources?.resources;
        if (!r) return false;
        const water = r.water || {};
        const capacity = water.max || water.storage || 0;
        if (Number.isFinite(water.current) && (water.current <= 0 || (capacity > 0 && water.current / capacity < SaveSystem.LOST_WATER_RATIO))) return true;
        return Number.isFinite(r.pollution?.current) && r.pollution.current >= SaveSystem.LOST_POLLUTION;
    }

    /** Texto amigável para cada motivo de falha ao carregar. */
    static reasonText(reason) {
        return {
            corrupt: 'O jogo salvo está danificado e não pôde ser aberto.',
            incompatible: 'O jogo salvo é de uma versão antiga do Guardião da Água e não pode ser aberto nesta.',
            missing: 'Não há jogo salvo para este jogador.'
        }[reason] || 'Não foi possível abrir o jogo salvo.';
    }

    // ===== localStorage =====

    /** Grava o jogo do perfil. Retorna true se deu certo (cheio/bloqueado = false, com aviso). */
    save(game, profileId, { kind = 'auto', slot = 'main' } = {}) {
        if (!this.storageAvailable) return false;
        try {
            const envelope = SaveSystem.buildEnvelope(game, profileId, { kind });
            localStorage.setItem(SaveSystem.keyFor(profileId, slot), JSON.stringify(envelope));
            log(`💾 Jogo salvo (${kind}, ${slot}) para o perfil ${profileId}`);
            return true;
        } catch (error) {
            logWarn('⚠️ Não foi possível salvar o jogo:', error);
            return false;
        }
    }

    /** { ok: true, data } com o conteúdo do jogo, ou { ok: false, reason } (ver parseEnvelope). */
    load(profileId, slot = 'main') {
        if (!this.storageAvailable) return { ok: false, reason: 'missing' };
        const result = SaveSystem.parseEnvelope(localStorage.getItem(SaveSystem.keyFor(profileId, slot)), profileId);
        if (!result.ok) {
            if (result.reason !== 'missing') logWarn(`⚠️ Save do perfil ${profileId} (${slot}) recusado: ${result.reason}`);
            return result;
        }
        log(`📁 Jogo carregado do perfil ${profileId} (${slot})`);
        return { ok: true, data: result.envelope.game };
    }

    hasSave(profileId, slot = 'main') {
        return this.storageAvailable && localStorage.getItem(SaveSystem.keyFor(profileId, slot)) !== null;
    }

    /**
     * Resumo para a tela de perfis, sem carregar o jogo: null se não houver save;
     * { ok: false, slot, reason } se estiver danificado/antigo; senão { ok: true, slot, savedAt, kind, lost, summary }.
     */
    getSaveInfo(profileId, slot = 'main') {
        if (!this.hasSave(profileId, slot)) return null;
        const result = SaveSystem.parseEnvelope(localStorage.getItem(SaveSystem.keyFor(profileId, slot)), profileId);
        if (!result.ok) return { ok: false, slot, reason: result.reason };
        const e = result.envelope;
        return { ok: true, slot, savedAt: e.savedAt, kind: e.kind, lost: !!e.lost, summary: e.summary };
    }

    /** Todos os espaços com save do perfil (na ordem de SLOTS), com o resumo de cada. */
    listSaves(profileId) {
        return SaveSystem.SLOTS.map(slot => this.getSaveInfo(profileId, slot)).filter(Boolean);
    }

    /**
     * Fim de jogo: o save principal fica, marcado como derrota. "Continuar" acabaria de novo na hora, então o menu
     * oferece voltar ao ponto seguro/alguns minutos antes, outro espaço ou um jogo novo (nada é apagado sem confirmar).
     */
    markLost(profileId) {
        if (!this.storageAvailable) return false;
        const key = SaveSystem.keyFor(profileId);
        const result = SaveSystem.parseEnvelope(localStorage.getItem(key), profileId);
        if (!result.ok) return false;
        try {
            localStorage.setItem(key, JSON.stringify({ ...result.envelope, lost: true }));
            return true;
        } catch (error) {
            logWarn('⚠️ Não foi possível marcar o fim de jogo no save:', error);
            return false;
        }
    }

    deleteSave(profileId, slot = 'main') {
        if (!this.storageAvailable) return;
        localStorage.removeItem(SaveSystem.keyFor(profileId, slot));
        log(`🗑️ Jogo salvo do perfil ${profileId} (${slot}) apagado`);
    }

    /** Jogo novo: somem o principal e os pontos automáticos daquela cidade; os espaços manuais ficam. */
    deleteCity(profileId) {
        ['main', 'safe', 'rewind'].forEach(slot => this.deleteSave(profileId, slot));
    }

    /** Perfil apagado: todos os espaços. */
    deleteAll(profileId) {
        SaveSystem.SLOTS.forEach(slot => this.deleteSave(profileId, slot));
    }
}

// Exportar para escopo global
window.SaveSystem = SaveSystem;
log('💾 SaveSystem carregado e exportado para window.SaveSystem');
