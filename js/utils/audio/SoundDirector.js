/**
 * AudioManager — Diretor de som: que música e que ambientes tocam em cada contexto, e os ganchos de eventos.
 * Parte da classe AudioManager (js/utils/AudioManager.js), anexada via mixin(): use this.* normalmente.
 *
 * Música (prioridade): game over (silêncio + jingle) > alerta (falta d'água, poluição crítica, energia < 50 %)
 *   > chuva/tempestade (clima real) > noite (relógio do jogo) > cidade prosperando (satisfação alta e crescendo) > dia.
 *   Tutorial inicial = dia. Fica pelo menos minDwellMs numa faixa antes de trocar (o alerta entra na hora).
 * Ambientes: cidade dia/noite, rio baixinho, chuva/tempestade/vento/neve/sol quente/neblina pelo clima,
 *   trânsito com ≥ CityLifeSystem.MIN_ROADS blocos de rua. Tudo cala na pausa e no game over.
 * Estado para testes/debug: currentMusicKey (tocando), director.contextKey (o que o contexto pede), getAmbientKeys().
 */
mixin(AudioManager, {
    initDirector() {
        this.director = {
            screen: null,
            minDwellMs: 60000,
            alertClearMs: 15000,
            lastSwitch: -Infinity,
            contextKey: null,
            alert: false,
            alertClearSince: null,
            nextEval: 0,
            popSamples: [],
            energyOn: null,
            popMilestone: null,
            roadDragCell: null,
            nextTraffic: 0,
            selectedLoop: null,
            lastSpeaker: null
        };
        this.setupUiSounds();
        this.setupSoundPanel();
    },

    // ===== TELAS =====
    /** showScreen (main.js) avisa a tela: menu/cadastro = música do menu; partida = diretor. */
    onScreen(screenId) {
        const d = this.director;
        d.screen = screenId;
        if (screenId === 'loading-screen') return;
        if (screenId === 'game-screen') {
            this.resetCityWatch();
            d.lastSwitch = -Infinity;
            d.nextEval = 0;
            return;
        }
        this.setAmbientLayers({});
        this.stopAllLoops();
        // A abertura toca a própria música e passa para a do menu no fim (onIntroDone)
        if (typeof MenuIntro !== 'undefined' && MenuIntro.state === 'playing') return;
        this.playMusic('bgm_menu');
    },

    /** MenuIntro.play(): música da abertura junto com a 1ª tomada (sem movimento reduzido). */
    onIntroStart(mode) {
        if (mode === 'full') this.playMusic('bgm_intro', false);
        else this.playMusic('bgm_menu');
    },

    /** Abertura acabou ou "Pular": crossfade para o tema do menu. */
    onIntroDone() {
        if (this.director.screen === 'game-screen') return;
        this.playMusic('bgm_menu');
    },

    onMusicEnded(key) {
        if (key === 'bgm_intro') this.onIntroDone();
    },

    // ===== RELÓGIO DO DIRETOR =====
    tickDirector(now) {
        const d = this.director;
        if (d.screen !== 'game-screen') return;
        const gm = typeof gameManager !== 'undefined' ? gameManager : null;
        if (!gm) return;
        this.watchRoadDrag(gm);
        if (now < d.nextEval) return;
        d.nextEval = now + 1000;
        if (gm.gameState === 'loading' || gm.gameState === 'menu') {
            this.resetCityWatch();
            return;
        }
        if (gm.gameState === 'gameover') return;
        this.evaluateMusic(gm, now);
        this.evaluateAmbient(gm);
        this.watchCity(gm);
        this.watchSelectedBuilding(gm);
    },

    /** Linha de base de energia/população: carregar um save ou começar não toca nada. */
    resetCityWatch() {
        const d = this.director;
        d.energyOn = null;
        d.popMilestone = null;
        d.popSamples = [];
        d.alert = false;
        d.alertClearSince = null;
    },

    // ===== MÚSICA POR CONTEXTO =====
    computeMusicContext(gm, now = performance.now()) {
        const d = this.director;
        if (gm.gameState === 'gameover') return null;
        if (!gm.tutorialDone && gm.gameState === 'tutorial') return 'bgm_gameplay_day';
        const rm = gm.resourceManager;
        const res = rm?.resources;
        // Energia: só é crise se a geração existente não dá conta (ou a cidade já gasta muito sem usina);
        // no começo do jogo, sem usina nenhuma, quem ensina é o guia de energia, não a música de alerta
        const el = res?.electricity;
        const blackout = el?.consumption > 0 && el.efficiency < 0.5 && (el.generation > 0 || el.consumption >= 150);
        // Água: reserva abaixo de 15 % ou menos de ~2 minutos do consumo líquido (hasWaterShortage já acusa no
        // começo do jogo, com a caixa cheia e nenhuma bomba: cedo demais para música de alerta)
        const water = res?.water;
        const deficit = water ? (water.consumption || 0) - (rm?.getEffectiveWaterProduction?.() ?? (water.production || 0)) : 0;
        const dry = !!water && (water.current <= (water.max || 0) * 0.15 || (deficit > 0 && water.current < deficit * 2));
        const danger = !!rm && (dry || rm.hasCriticalPollution?.() || blackout);
        if (danger) {
            d.alert = true;
            d.alertClearSince = null;
        } else if (d.alert) {
            d.alertClearSince ??= now;
            if (now - d.alertClearSince >= d.alertClearMs) d.alert = false;
        }
        if (d.alert) return 'bgm_gameplay_alert';
        const w = gm.weatherEffects?.profile;
        if (w && (w.rain > 0 || w.kind === 'storm')) return 'bgm_gameplay_rain';
        if (gm.getDayNightState?.() === 'night') return 'bgm_gameplay_night';
        if (this.isThriving(gm, now)) return 'bgm_gameplay_thriving';
        return 'bgm_gameplay_day';
    },

    /** Satisfação ≥ 75, população ≥ 200 e crescendo ≥ 3 % nos últimos 2 minutos. */
    isThriving(gm, now) {
        const pop = gm.resourceManager?.resources?.population;
        if (!pop) return false;
        const samples = this.director.popSamples;
        samples.push([now, pop.current]);
        while (samples.length && now - samples[0][0] > 120000) samples.shift();
        const oldest = samples[0];
        const growing = oldest && now - oldest[0] > 60000 && pop.current >= oldest[1] * 1.03 && pop.current > oldest[1];
        return pop.satisfaction >= 75 && pop.current >= 200 && growing;
    },

    evaluateMusic(gm, now) {
        const d = this.director;
        const wanted = this.computeMusicContext(gm, now);
        d.contextKey = wanted;
        if (!wanted || wanted === this.currentMusicKey) return;
        const inGameplay = this.currentMusicKey?.startsWith('bgm_gameplay');
        if (!inGameplay || wanted === 'bgm_gameplay_alert' || now - d.lastSwitch >= d.minDwellMs) {
            d.lastSwitch = now;
            this.playMusic(wanted);
        }
    },

    // ===== AMBIENTES =====
    computeAmbientLayers(gm) {
        const layers = {};
        const night = gm.getDayNightState?.() === 'night';
        const p = gm.weatherEffects?.profile || {};
        const wet = p.rain > 0 || p.kind === 'storm';
        layers[night ? 'amb_city_night' : 'amb_city_day'] = wet ? 0.5 : 1;
        layers.amb_river = 1;
        if (p.kind === 'storm') layers.amb_storm = 1;
        else if (p.rain >= 0.8) layers.amb_rain_heavy = 1;
        else if (p.rain > 0) layers.amb_rain_light = Math.min(1, 0.6 + p.rain * 0.6);
        if (p.snow > 0) layers.amb_snow = 1;
        if (p.windy) layers.amb_wind_strong = 0.5 + 0.5 * (p.windStrength || 0);
        else if (p.wind >= 15 && !wet) layers.amb_wind_light = 1;
        if (p.hot && !night) layers.amb_sun_hot = 1;
        if (p.fog) layers.amb_fog = 1;
        const roads = this.countRoads(gm);
        const minRoads = typeof CityLifeSystem !== 'undefined' ? CityLifeSystem.MIN_ROADS : 20;
        if (roads >= minRoads) layers.amb_traffic_loop = Math.min(1, 0.5 + roads / 120);
        return layers;
    },

    /** Blocos de rua ligados (CityLifeSystem) ou, sem ele, prédios de rua prontos. */
    countRoads(gm) {
        const connected = gm.cityLifeSystem?.getConnectedRoadCount?.();
        if (Number.isFinite(connected)) return connected;
        let n = 0;
        gm.buildingSystem?.buildings?.forEach(b => { if (b.config?.roadType && !b.underConstruction) n++; });
        return n;
    },

    evaluateAmbient(gm) {
        const layers = this.computeAmbientLayers(gm);
        this.setAmbientLayers(layers);
        // Carros e caminhões de vez em quando, quando há trânsito
        const d = this.director;
        const now = performance.now();
        if (layers.amb_traffic_loop && gm.gameState === 'playing') {
            if (!d.nextTraffic) d.nextTraffic = now + 8000 + Math.random() * 12000;
            if (now >= d.nextTraffic && (gm.cityLifeSystem?.vehicles?.length ?? 1) > 0) {
                const r = Math.random();
                const key = r < 0.7 ? 'sfx_traffic_car' : r < 0.9 ? 'sfx_traffic_truck' : 'sfx_car_horn';
                this.playSound(key, 0.8, { pan: (Math.random() * 2 - 1) * 0.6 });
                d.nextTraffic = now + 12000 + Math.random() * 20000;
            }
        } else {
            d.nextTraffic = 0;
        }
    },

    // ===== CIDADE: energia, população =====
    watchCity(gm) {
        const d = this.director;
        const res = gm.resourceManager?.resources;
        if (!res) return;
        const playing = gm.gameState === 'playing';

        const el = res.electricity;
        const on = !(el?.consumption > 0) || el.efficiency >= 0.999;
        if (d.energyOn !== null && on !== d.energyOn && playing) this.playSound(on ? 'sfx_power_on' : 'sfx_power_off');
        d.energyOn = on;

        const milestones = AudioManager.POPULATION_MILESTONES;
        const pop = res.population?.current || 0;
        const reached = milestones.filter(m => pop >= m).pop() || 0;
        if (d.popMilestone !== null && reached > d.popMilestone && playing) {
            this.playSound('sfx_level_up');
            if (reached >= 25000) setTimeout(() => this.playSound('sfx_fireworks', 0.8), 900);
            else if (reached >= 5000) setTimeout(() => this.playSound('sfx_crowd_cheer', 0.8), 900);
        }
        if (d.popMilestone === null || reached > d.popMilestone) d.popMilestone = reached;
    },

    /** Prédio selecionado com máquina: o som dele em loop, baixinho, enquanto o painel está aberto. */
    watchSelectedBuilding(gm) {
        const b = gm.selectedBuilding;
        const id = b && !b.underConstruction && b.active !== false ? b.config?.id : null;
        const key = AudioManager.BUILDING_LOOPS[id] || null;
        const d = this.director;
        if (key === d.selectedLoop && (!key || this.activeLoops.has(key))) return;
        if (d.selectedLoop) this.stopLoop(d.selectedLoop);
        d.selectedLoop = key;
        if (key && gm.gameState === 'playing') this.playLoop(key, 0.8);
    },

    /** Traçado de rua: rolo compactador em loop e um "tum" a cada célula nova da prévia. */
    watchRoadDrag(gm) {
        const drag = gm.buildingSystem?.roadDrag;
        const d = this.director;
        if (!drag?.end) {
            if (d.roadDragCell !== null) {
                d.roadDragCell = null;
                this.stopLoop('sfx_road_drag');
            }
            return;
        }
        const cell = `${drag.end.x},${drag.end.z}`;
        if (cell === d.roadDragCell) return;
        if (d.roadDragCell !== null) this.playSound('sfx_road_place', 0.35);
        d.roadDragCell = cell;
        this.playLoop('sfx_road_drag', 0.8);
    },

    // ===== GANCHOS (chamados pelos sistemas) =====
    /** WeatherEffects: relâmpago na tempestade → estalo + trovão perto (na hora) ou longe (atrasado). */
    onLightning() {
        const gm = typeof gameManager !== 'undefined' ? gameManager : null;
        if (this.director.screen !== 'game-screen' || !gm || gm.gameState === 'paused' || gm.gameState === 'gameover') return;
        const near = Math.random() < 0.4;
        const pan = (Math.random() * 2 - 1) * 0.5;
        if (near) {
            this.playSound('sfx_lightning_flash', 0.8, { pan });
            setTimeout(() => this.playSound('sfx_thunder_near', 1, { pan }), 120);
        } else {
            setTimeout(() => this.playSound('sfx_thunder_far', 1, { pan }), 800 + Math.random() * 1700);
        }
    },

    /** GameOverSystem: a música para, os ambientes calam, toca o fim triste e o jingle. */
    onGameOver() {
        this.stopMusic(true);
        this.setAmbientLayers({}, 1500);
        this.stopAllLoops();
        this.director.contextKey = null;
        setTimeout(() => this.playSound('sfx_game_over'), 400);
        setTimeout(() => this.playJingle('jingle_game_over', { duck: false }), 3400);
    },

    /** Missão concluída: jingle com a música abaixada (música muda/zerada → efeito curto no lugar). */
    onMissionComplete(excellent = false) {
        if (this.musicVolume * this.masterVolume > 0.01) this.playJingle('jingle_mission_complete');
        else this.playSound('sfx_mission_complete');
        if (excellent) setTimeout(() => this.playSound('sfx_achievement', 0.8), 2200);
        setTimeout(() => this.playSound('sfx_coin', 0.7), 600);
    },

    /** Estudo liberado: o "aha" e, logo depois, o jingle (música abaixada). */
    onStudyUnlock() {
        this.playSound('sfx_study_unlock');
        setTimeout(() => this.playJingle('jingle_study_unlock'), 900);
    },

    /** EventSystem: abertura do evento (sting) + o som do tipo; bons eventos só o som alegre. */
    onEventStart(event) {
        const type = event?.type || event?.config?.id || '';
        const key = AudioManager.EVENT_SOUNDS[type] ||
            (/fire|fogo/.test(type) ? 'sfx_event_fire' : /heat|calor/.test(type) ? 'sfx_event_heatwave' : null);
        if (event?.config?.severity === 'positive') {
            this.playSound(key || 'sfx_event_good_news');
            return;
        }
        this.playSound('sfx_event_start');
        if (key) setTimeout(() => this.playSound(key), 900);
    },

    onEventEnd(event) {
        if (event?.config?.severity !== 'positive') this.playSound('sfx_event_resolved', 0.8);
    },

    /**
     * Voz curta do personagem a cada página nova (tutorial, livro de aulas, decisão do Paulo, alerta com quem fala,
     * fim de jogo). Humor pela expressão: happy → voc_<id>_happy (animado), worried → _worried, sad → _sad; senão a
     * normal voc_<id>_hello (várias variações, sorteadas sem repetir). Sem o arquivo do humor, toca a normal; o gap
     * do manifesto evita repetir em páginas viradas rápido.
     */
    onSpeaker(characterId, expression) {
        if (!characterId) return;
        this.director.lastSpeaker = characterId;
        const mood = { happy: 'happy', worried: 'worried', sad: 'sad' }[expression];
        const moodKey = mood && `voc_${characterId}_${mood}`;
        const key = moodKey && this.manifest[moodKey] ? moodKey : `voc_${characterId}_hello`;
        if (this.manifest[key]) this.playSound(key);
    },

    /**
     * Clique no que está pronto no mapa (como o "sim, senhor" dos prédios de jogos de estratégia): som próprio de
     * cada grupo — prédio pelo tipo (AudioManager.selectGroupFor), 'soil' (chão), 'trees', 'river' — com 3
     * variações sorteadas. Grupo sem arquivo ainda: o clique comum.
     */
    onSelect(group) {
        const key = `sfx_select_${group}`;
        this.playSound(this.manifest[key] ? key : 'sfx_click', 0.8);
    },

    /** Tutorial fechou: o próximo personagem cumprimenta de novo. */
    resetSpeaker() {
        this.director.lastSpeaker = null;
    },

    // ===== INTERFACE (delegação global) =====
    setupUiSounds() {
        // Clique em botão: depois dos handlers; se nenhum deles tocou som, toca o clique padrão
        const CLICKABLE = 'button, [role="button"], .overlay-btn, .profile-card, .building-item, .goal-link, .mission-card, .lessons-card';
        document.addEventListener('click', event => {
            const el = event.target.closest?.(CLICKABLE);
            if (!el || el.disabled || el.closest('.pp-sound')) return;
            const at = performance.now();
            setTimeout(() => {
                if (this.lastSfxAt >= at) return;
                const inGame = this.director.screen === 'game-screen' && !el.closest('.swal2-container');
                this.playSound(inGame ? 'sfx_click' : 'sfx_ui_click', 0.8);
            }, 0);
        }, true);

        document.addEventListener('change', event => {
            const input = event.target;
            if (input?.type === 'checkbox') this.playSound(input.checked ? 'sfx_toggle_on' : 'sfx_toggle_off');
        }, true);

        // Hover baixinho só nos botões do menu de construção (mouse no computador)
        let lastHover = null;
        document.addEventListener('pointerover', event => {
            if (event.pointerType !== 'mouse') return;
            const item = event.target.closest?.('.building-item');
            if (item === lastHover) return;
            lastHover = item;
            if (item) this.playSound('sfx_ui_hover', 0.7);
        }, { passive: true });

        // Q/E giram a câmera
        document.addEventListener('keydown', event => {
            if (event.repeat || this.director.screen !== 'game-screen') return;
            if (event.target?.closest?.('input, textarea, select, [contenteditable]')) return;
            if (event.code === 'KeyQ' || event.code === 'KeyE') this.playSound('sfx_camera_rotate');
        });
    },

    // ===== CONTROLES DE SOM NA PAUSA =====
    /** Bloco "Som" na tela de pausa (#pause-overlay): música / efeitos / ambiente + mudo, salvos no navegador. */
    setupSoundPanel() {
        // Fica no painel ⚙️ Configurações da pausa (ui/SettingsUI.js)
        const panel = document.querySelector('#settings-panel .settings-body');
        if (!panel || document.getElementById('pp-sound')) return;
        const section = document.createElement('section');
        section.id = 'pp-sound';
        section.className = 'pp-sound';
        section.setAttribute('aria-labelledby', 'pp-sound-title');
        const slider = (id, label, value) => `
            <label class="pp-sound-row" for="${id}">
                <span>${label}</span>
                <input type="range" id="${id}" min="0" max="100" step="5" value="${Math.round(value * 100)}">
                <output for="${id}">${Math.round(value * 100)}%</output>
            </label>`;
        section.innerHTML = `
            <h3 id="pp-sound-title">🔊 Som</h3>
            ${slider('pp-music-volume', 'Música', this.musicVolume)}
            ${slider('pp-sfx-volume', 'Efeitos', this.sfxVolume)}
            ${slider('pp-ambient-volume', 'Ambiente', this.ambientVolume)}
            <button type="button" id="pp-mute" class="overlay-btn secondary pp-mute"></button>`;
        panel.appendChild(section);

        const bind = (id, setter, preview) => {
            const input = section.querySelector(`#${id}`);
            const out = section.querySelector(`output[for="${id}"]`);
            input.addEventListener('input', () => {
                setter(Number(input.value) / 100);
                out.textContent = `${input.value}%`;
            });
            if (preview) input.addEventListener('change', preview);
        };
        bind('pp-music-volume', v => this.setMusicVolume(v));
        bind('pp-sfx-volume', v => this.setSfxVolume(v), () => this.playSound('sfx_click'));
        bind('pp-ambient-volume', v => this.setAmbientVolume(v));
        const mute = section.querySelector('#pp-mute');
        const renderMute = () => {
            mute.textContent = this.muted ? '🔇 Som desligado' : '🔊 Som ligado';
            mute.setAttribute('aria-pressed', String(this.muted));
            section.classList.toggle('is-muted', this.muted);
        };
        mute.addEventListener('click', () => {
            this.toggleMute();
            renderMute();
            this.playSound('sfx_toggle_on');
        });
        renderMute();
    }
});

AudioManager.POPULATION_MILESTONES = [250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

/** Tipo de evento (EventSystem) → som do card. */
AudioManager.EVENT_SOUNDS = {
    drought: 'sfx_event_drought',
    flood: 'sfx_event_flood',
    heavy_rain: 'sfx_event_storm',
    pipe_leak: 'sfx_event_flood',
    equipment_failure: 'sfx_event_blackout',
    industrial_pollution: 'sfx_event_pollution',
    population_boom: 'sfx_event_good_news',
    government_grant: 'sfx_cash_register',
    water_conservation_campaign: 'sfx_event_good_news'
};

/** Prédio selecionado → som da máquina em loop. */
AudioManager.BUILDING_LOOPS = {
    water_pump: 'sfx_water_pump_loop',
    water_well: 'sfx_water_pump_loop',
    treatment_plant: 'sfx_water_treatment',
    filter_station: 'sfx_water_treatment',
    wind_farm: 'sfx_wind_turbine'
};

/** Grupo do som de seleção de um prédio (onSelect): pela função, como o menu de construção. */
AudioManager.SELECT_GROUPS = ['water', 'treatment', 'waste', 'nature', 'science', 'power_clean', 'power_heavy', 'public',
    'homes', 'commerce', 'industry', 'tourism', 'roads', 'soil', 'trees', 'river'];
AudioManager.selectGroupFor = config => {
    if (!config) return 'soil';
    const id = config.id || '';
    if (config.plantedTree) return 'trees';
    if (config.roadType || config.category === 'roads') return 'roads';
    if (config.category === 'treatment') return config.waste ? 'waste' : 'treatment';
    if (config.category === 'power') return config.group === 'Renováveis' ? 'power_clean' : 'power_heavy';
    if (config.zoneType || config.category === 'residential') {
        return id.includes('commercial') ? 'commerce' : id.includes('industrial') ? 'industry' : 'homes';
    }
    // Turismo agora fica em Comercial: o som de turismo continua pelo grupo (Cultura, Hospedagem e lazer)
    if (config.group === 'Cultura' || config.group === 'Hospedagem e lazer') return 'tourism';
    const byCategory = { water: 'water', nature: 'nature', science: 'science', public: 'public', commercial: 'commerce',
        industrial: 'industry', tourism: 'tourism', infrastructure: 'roads' };
    return byCategory[config.category] || 'public';
};

/** Atalhos estáticos para os ganchos (quem chama não precisa saber da instância). */
['onScreen', 'onIntroStart', 'onIntroDone', 'onLightning', 'onGameOver', 'onMissionComplete', 'onStudyUnlock',
    'onEventStart', 'onEventEnd', 'onSpeaker', 'resetSpeaker', 'onSelect'].forEach(name => {
    AudioManager[name] = (...args) => AudioManager.getInstance()[name](...args);
});
