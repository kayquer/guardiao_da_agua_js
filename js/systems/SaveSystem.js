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
 */
class SaveSystem {
    static VERSION = 2;
    static FORMAT = 'guardiao_agua_save';
    // Partida sem volta (isLostGame): água abaixo de 5% da capacidade ou poluição a partir de 90
    static LOST_WATER_RATIO = 0.05;
    static LOST_POLLUTION = 90;
    static KEY_PREFIX = 'guardiao_agua_save_';
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
            console.warn('⚠️ localStorage não disponível: o jogo não poderá ser salvo');
            return false;
        }
    }

    static clearLegacySaves() {
        SaveSystem.LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
    }

    static keyFor(profileId) {
        return `${SaveSystem.KEY_PREFIX}${profileId || 'sem_perfil'}`;
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
    save(game, profileId, { kind = 'auto' } = {}) {
        if (!this.storageAvailable) return false;
        try {
            const envelope = SaveSystem.buildEnvelope(game, profileId, { kind });
            localStorage.setItem(SaveSystem.keyFor(profileId), JSON.stringify(envelope));
            log(`💾 Jogo salvo (${kind}) para o perfil ${profileId}`);
            return true;
        } catch (error) {
            console.warn('⚠️ Não foi possível salvar o jogo:', error);
            return false;
        }
    }

    /** { ok: true, data } com o conteúdo do jogo, ou { ok: false, reason } (ver parseEnvelope). */
    load(profileId) {
        if (!this.storageAvailable) return { ok: false, reason: 'missing' };
        const result = SaveSystem.parseEnvelope(localStorage.getItem(SaveSystem.keyFor(profileId)), profileId);
        if (!result.ok) {
            if (result.reason !== 'missing') console.warn(`⚠️ Save do perfil ${profileId} recusado: ${result.reason}`);
            return result;
        }
        log(`📁 Jogo carregado do perfil ${profileId}`);
        return { ok: true, data: result.envelope.game };
    }

    hasSave(profileId) {
        return this.storageAvailable && localStorage.getItem(SaveSystem.keyFor(profileId)) !== null;
    }

    /**
     * Resumo para a tela de perfis, sem carregar o jogo: null se não houver save;
     * { ok: false, reason } se estiver danificado/antigo; senão { ok: true, savedAt, summary }.
     */
    getSaveInfo(profileId) {
        if (!this.hasSave(profileId)) return null;
        const result = SaveSystem.parseEnvelope(localStorage.getItem(SaveSystem.keyFor(profileId)), profileId);
        if (!result.ok) return { ok: false, reason: result.reason };
        return { ok: true, savedAt: result.envelope.savedAt, kind: result.envelope.kind, summary: result.envelope.summary };
    }

    deleteSave(profileId) {
        if (!this.storageAvailable) return;
        localStorage.removeItem(SaveSystem.keyFor(profileId));
        log(`🗑️ Jogo salvo do perfil ${profileId} apagado`);
    }
}

// Exportar para escopo global
window.SaveSystem = SaveSystem;
log('💾 SaveSystem carregado e exportado para window.SaveSystem');
