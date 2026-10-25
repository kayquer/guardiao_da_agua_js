/**
 * QuestSystem — conquistas por níveis (js/data/achievementTracks.js): 13 trilhas × 5 níveis, conferidas a cada
 * ACHIEVEMENT_CHECK_MS com o jogo rodando. Contam o que está na cidade AGORA (prédios prontos, caixa, geração,
 * capacidade), não o que já foi construído um dia: construir e reciclar não sobe nível.
 * Ganhos vão para this.achievements (mesmo Set salvo das conquistas de missão) com id `track_<trilha>_<nível>`.
 * Para não virar enxurrada: de uma trilha só o maior nível novo vira aviso, um aviso a cada ACHIEVEMENT_TOAST_GAP_MS,
 * e a primeira conferência depois de carregar um jogo guarda em silêncio (save antigo) com um aviso só de resumo.
 * Sem DOM: o toast é do UIManager (ui/AchievementsUI.js → showAchievementToast).
 */
mixin(QuestSystem, {
    ACHIEVEMENT_CHECK_MS: 2000,
    ACHIEVEMENT_TOAST_GAP_MS: 40000,

    /** Chamado por QuestSystem.update. */
    updateAchievementTracks() {
        if (typeof ACHIEVEMENT_TRACKS === 'undefined') return;
        const gm = this.gameManager;
        if (gm.gameState !== 'playing' || gm.tutorialDone === false) return;
        const now = performance.now();
        this.flushAchievementToasts(now);
        if (now - (this.lastTrackCheckAt || 0) < this.ACHIEVEMENT_CHECK_MS) return;
        this.lastTrackCheckAt = now;

        const metrics = QuestSystem.measureAchievementMetrics(gm.buildingSystem?.getAllBuildings?.() || [], gm.resourceManager?.resources);
        const gained = this.collectTrackAchievements(metrics);
        const silent = !this.tracksPrimed;
        this.tracksPrimed = true;
        if (!gained.length) return;

        if (silent) {
            gained.forEach(key => this.recordAchievement(key, { quiet: true }));
            gm.uiManager?.showAchievementSummaryToast?.(gained.length);
            return;
        }
        // por trilha, só o maior nível novo vai para a fila (substitui um aviso da mesma trilha que ainda esperava)
        const best = new Map();
        gained.forEach(key => {
            const info = QuestSystem.achievementInfo(key);
            if (!best.has(info.track) || best.get(info.track).level < info.level) best.set(info.track, info);
        });
        this.achievementToastQueue = (this.achievementToastQueue || []).filter(k => !best.has(QuestSystem.achievementInfo(k).track));
        best.forEach(info => this.achievementToastQueue.push(info.id));
        // os níveis pulados de uma vez ficam só no histórico (o toast do maior registra o dele)
        const queued = new Set([...best.values()].map(info => info.id));
        gained.forEach(key => this.recordAchievement(key, { quiet: !queued.has(key) }));
        this.flushAchievementToasts(now);
    },

    /** Marca os níveis alcançados que ainda não estavam no Set e devolve os ids novos. */
    collectTrackAchievements(metrics) {
        const gained = [];
        for (const [id, track] of Object.entries(ACHIEVEMENT_TRACKS)) {
            const level = QuestSystem.trackLevel(track, metrics[track.metric]);
            for (let n = 1; n <= level; n++) {
                const key = `track_${id}_${n}`;
                if (this.achievements.has(key)) continue;
                this.achievements.add(key);
                gained.push(key);
            }
        }
        return gained;
    },

    /** Mostra o próximo aviso da fila, no máximo um a cada ACHIEVEMENT_TOAST_GAP_MS e só com a tela livre. */
    flushAchievementToasts(now = performance.now()) {
        if (!this.achievementToastQueue?.length) return;
        if (now - (this.lastAchievementToastAt ?? -Infinity) < this.ACHIEVEMENT_TOAST_GAP_MS) return;
        const ui = this.gameManager.uiManager;
        if (ui?.isReadingOverlayOpen?.() || ui?.isInfoPopupOpen?.()) return;
        this.lastAchievementToastAt = now;
        this.announceAchievement(this.achievementToastQueue.shift());
    },

    /** Histórico (ResearchLog e lista de avisos) sem toast. */
    recordAchievement(id, { quiet = false } = {}) {
        if (typeof ResearchLog !== 'undefined') ResearchLog.record('achievement', { target: id });
        if (quiet) {
            const info = QuestSystem.achievementInfo(id);
            this.gameManager.uiManager?.showNotification?.(`🏅 Conquista: ${info.name}${info.levelName ? ` (${info.levelName})` : ''}`, 'success', 0, { quiet: true });
        }
    },

    /** Toast com o selo, o nível e o botão "Ver conquistas" (UIManager.showAchievementToast) + som. */
    announceAchievement(id) {
        const info = QuestSystem.achievementInfo(id);
        const ui = this.gameManager.uiManager;
        if (ui?.showAchievementToast) ui.showAchievementToast(info);
        else ui?.showNotification?.(`🏆 Conquista: ${info.name}`, 'success', 8000);
        if (typeof AudioManager !== 'undefined' && this.gameManager.gameState === 'playing') AudioManager.playSound('sfx_achievement', 0.8);
        log(`🏆 Conquista desbloqueada: ${id}`);
    }
});

/** Números de cada métrica das trilhas. Prédios só contam prontos; ruas, por tipo (`road_<roadType>`). */
QuestSystem.measureAchievementMetrics = (buildings, r) => {
    const m = {
        water_sources: 0, road_paved: 0, road_dirt: 0, road_gravel: 0, high_tech: 0, trees: 0, recycling: 0,
        zone_residential: 0, zone_commercial: 0, zone_industrial: 0,
        budget: r?.budget?.current || 0, power: r?.electricity?.generation || 0, storage: r?.water?.storage || 0
    };
    for (const b of buildings || []) {
        const c = b?.config;
        if (!c || b.underConstruction) continue;
        if (c.roadType) {
            const key = `road_${c.roadType}`;
            m[key] = (m[key] || 0) + 1;
            continue;
        }
        if (c.waterProduction > 0) m.water_sources++;
        if ((c.tier || 0) >= 4) m.high_tech++;
        if (b.type === 'tree_sapling') m.trees++;
        if (c.waste) m.recycling++;
        const zone = String(c.zoneType || '').split('_')[0];
        if (zone && `zone_${zone}` in m) m[`zone_${zone}`]++;
    }
    return m;
};

/** Quantos níveis da trilha o valor já alcança (0-5). */
QuestSystem.trackLevel = (track, value) => (track?.levels || []).filter(l => (value || 0) >= l.goal).length;

/** Meta formatada como no jogo (R$ e milhares com ponto). */
QuestSystem.formatTrackGoal = (track, goal) => Number(goal).toLocaleString('pt-BR');

QuestSystem.trackDescription = (track, goal) => String(track.description || '').replace('{n}', QuestSystem.formatTrackGoal(track, goal));

/**
 * Nome, ícone e descrição de qualquer conquista: de nível (`track_<trilha>_<n>`) ou de missão/Paulo (ACHIEVEMENTS).
 * Conquista de nível também traz { track, level, levelName, goal }.
 */
QuestSystem.achievementInfo = (id) => {
    const match = /^track_(.+)_([1-5])$/.exec(String(id));
    const track = match && typeof ACHIEVEMENT_TRACKS !== 'undefined' ? ACHIEVEMENT_TRACKS[match[1]] : null;
    if (track) {
        const level = Number(match[2]);
        const def = track.levels[level - 1];
        return {
            id, track: match[1], level, goal: def.goal, icon: track.icon, name: def.name,
            levelName: typeof ACHIEVEMENT_LEVEL_NAMES !== 'undefined' ? ACHIEVEMENT_LEVEL_NAMES[level - 1] : `Nível ${level}`,
            description: QuestSystem.trackDescription(track, def.goal)
        };
    }
    const info = (typeof ACHIEVEMENTS !== 'undefined' && ACHIEVEMENTS[id]) || { icon: '🏆', name: id };
    return { id, ...info };
};
