/**
 * UIManager — jogador e clima no HUD: chip com o nome e card com a temperatura + animação do tempo.
 * Clicar no card abre #weather-modal com o clima atual e a previsão (pausa o jogo via syncPopupPause).
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
    initPlayerHud() {
        const profile = PlayerProfile.getActive();
        const nameEl = document.getElementById('player-name');
        if (nameEl) nameEl.textContent = PlayerProfile.displayName();
        const chip = document.getElementById('player-chip');
        if (chip && profile) {
            chip.title = `${profile.name} · ${profile.age} anos · ${profile.city}/${profile.uf}`;
        }

        // O clima mora dentro do item do relógio: o item inteiro abre a previsão
        // (no mobile, o item compacto #compact-weather faz o mesmo)
        for (const id of ['clock-weather', 'compact-weather']) {
            const item = document.getElementById(id);
            if (item && !item.dataset.wired) {
                item.dataset.wired = '1';
                item.addEventListener('click', () => this.showWeatherModal());
            }
        }

        this.initCompass(); // bússola + seta do vento (ui/CompassUI.js)
        this.refreshWeather();
        clearInterval(this.weatherTimer);
        this.weatherTimer = setInterval(() => this.refreshWeather(), WEATHER.CACHE_MS);
    },

    async refreshWeather({ force = false } = {}) {
        // Configurações → Clima: Simulado (SimulatedWeather) não busca nada na internet
        if (SimulatedWeather.mode() === 'simulated') return this.applySimulatedWeather();
        let profile = PlayerProfile.getActive();
        // Sem coordenadas (rede caiu no cadastro): tenta localizar a cidade de novo e guarda no perfil
        if (profile && (profile.lat == null || profile.lon == null)) {
            try {
                const coords = await PlayerProfile.geocode(profile.city, profile.uf);
                if (coords) profile = PlayerProfile.update(profile.id, { lat: coords.lat, lon: coords.lon });
            } catch (error) {
                console.warn('⚠️ Cidade ainda sem localização:', error.message);
            }
        }
        if (!profile || profile.lat == null || profile.lon == null) {
            // Sem localização da cidade: o jogo inventa o tempo (melhor que ficar sem chuva, vento e previsão)
            return this.applySimulatedWeather({ fallback: true });
        }
        if (!this.weather?.data) {
            this.weather = { status: 'loading' };
            this.renderWeatherCard();
        }
        try {
            const data = await WeatherService.fetch(profile.lat, profile.lon, { force });
            if (SimulatedWeather.mode() === 'simulated') return; // trocou de modo enquanto buscava
            this.weather = { status: 'ok', data };
            this.gameManager.applyWeather?.(data.current); // chuva, vento, nuvens e sol no mapa 3D
        } catch (error) {
            console.warn('⚠️ Clima indisponível:', error.message);
            // Mantém o último clima bom, se houver
            if (!this.weather?.data) this.weather = { status: 'error' };
        }
        this.renderWeatherCard();
        if (document.getElementById('weather-modal')) this.renderWeatherModal();
    },

    /**
     * Clima simulado para o dia e a hora do relógio do jogo (mesma semente por perfil: o tempo de cada dia é sempre o
     * mesmo). fallback = modo real, mas a cidade não tem localização.
     */
    applySimulatedWeather({ fallback = false } = {}) {
        const gm = this.gameManager;
        const date = gm?.gameClockTime instanceof Date ? gm.gameClockTime : new Date();
        const isDay = gm?.getDayNightState ? gm.getDayNightState() !== 'night' : true;
        const data = SimulatedWeather.generate({ seed: SimulatedWeather.seedFrom(PlayerProfile.getActive()?.id), date, isDay });
        this.weather = { status: 'ok', data, simulated: true, fallback };
        this.simulatedWeatherHour = date.toDateString() + ' ' + date.getHours();
        gm?.applyWeather?.(data.current);
        this.renderWeatherCard();
        if (document.getElementById('weather-modal')) this.renderWeatherModal();
    },

    /** A cada hora de jogo, o clima simulado anda (chamado pelo UIManager.update). */
    tickSimulatedWeather() {
        if (!this.weather?.simulated) return;
        const date = this.gameManager?.gameClockTime;
        if (!(date instanceof Date)) return;
        if (date.toDateString() + ' ' + date.getHours() !== this.simulatedWeatherHour) this.applySimulatedWeather({ fallback: this.weather.fallback });
    },

    weatherAnimationHtml(anim, isDay = true) {
        const sun = isDay ? '<span class="wx-sun"></span>' : '<span class="wx-moon"></span>';
        const cloud = (extra = '') => `<span class="wx-cloud ${extra}"></span>`;
        const drops = n => Array.from({ length: n }, (_, i) => `<span class="wx-drop" style="--i:${i}"></span>`).join('');
        const flakes = n => Array.from({ length: n }, (_, i) => `<span class="wx-flake" style="--i:${i}"></span>`).join('');
        const scenes = {
            sun: sun,
            partly: sun + cloud('wx-cloud--small'),
            cloud: cloud('wx-cloud--back') + cloud(),
            fog: cloud() + '<span class="wx-fog"></span><span class="wx-fog wx-fog--2"></span>',
            rain: cloud('wx-cloud--dark') + drops(4),
            storm: cloud('wx-cloud--dark') + '<span class="wx-bolt"></span>' + drops(3),
            snow: cloud() + flakes(4)
        };
        return `<span class="wx-scene wx-scene--${anim}" aria-hidden="true">${scenes[anim] || scenes.cloud}</span>`;
    },

    // Ícone SVG do tempo para um código WMO (chuva forte tem ícone próprio; o emoji de WeatherService é o mesmo da chuva)
    weatherIconHtml(code, isDay = true, size = 'sm') {
        const heavy = [65, 67, 82].includes(Number(code));
        return uiIcon(heavy ? 'weather-heavy-rain' : WeatherService.describe(code, isDay).icon, size);
    },

    renderWeatherCard() {
        const card = document.getElementById('weather-card');
        if (!card) return;
        const state = this.weather?.status;
        const compactIcon = document.getElementById('compact-weather-icon');
        const compactTemp = document.getElementById('compact-weather-temp');
        if (state === 'ok') {
            const { current } = this.weather.data;
            const info = WeatherService.describe(current.code, current.isDay);
            if (compactIcon) compactIcon.innerHTML = this.weatherIconHtml(current.code, current.isDay);
            if (compactTemp) compactTemp.textContent = `${Math.round(current.temperature)}°`;
            card.className = `weather-card weather-card--${info.anim}${current.isDay ? '' : ' weather-card--night'}`;
            card.innerHTML = `${this.weatherAnimationHtml(info.anim, current.isDay)}
                <span class="weather-temp">${Math.round(current.temperature)}°</span>`;
            card.title = this.weather.simulated
                ? `${info.label} agora (clima simulado) — clique para ver a previsão`
                : `${info.label} agora em ${PlayerProfile.getActive()?.city || 'sua cidade'} — clique para ver a previsão`;
        } else {
            const text = uiIcon({ loading: 'status-pending', error: 'status-warning' }[state] || 'res-temperature');
            card.className = 'weather-card weather-card--empty';
            card.innerHTML = `<span class="weather-temp">${text}</span>`;
            card.title = state === 'loading' ? 'Buscando o clima...' : 'Clima indisponível agora — clique para tentar de novo';
        }
    },

    showWeatherModal() {
        if (document.getElementById('weather-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'weather-modal';
        modal.className = 'weather-modal';
        modal.addEventListener('click', event => {
            if (event.target === modal || event.target.closest('.weather-modal-close')) this.closeWeatherModal();
            if (event.target.closest('.weather-retry')) this.refreshWeather({ force: true });
        });
        document.getElementById('game-screen')?.appendChild(modal);
        this.renderWeatherModal();
        if (this.weather?.status !== 'ok') this.refreshWeather({ force: true });
    },

    renderWeatherModal() {
        const modal = document.getElementById('weather-modal');
        if (!modal) return;
        const profile = PlayerProfile.getActive();
        const place = profile ? `${profile.city}/${profile.uf}` : 'sua cidade';
        let body;
        if (this.weather?.status === 'ok') {
            const { current, daily } = this.weather.data;
            const info = WeatherService.describe(current.code, current.isDay);
            const wind = WeatherEffects.profileFor(current);
            const gusts = current.gusts > current.wind ? ` · rajadas ${Math.round(current.gusts)}` : '';
            const from = current.windDir != null ? ` do ${WeatherService.compass(current.windDir)}` : '';
            const days = daily.map((day, i) => {
                const d = WeatherService.describe(day.code);
                return `<div class="weather-day">
                    <span class="weather-day-name">${WeatherService.dayLabel(day.date, i)}</span>
                    <span class="weather-day-icon" title="${d.label}">${this.weatherIconHtml(day.code, true, 'lg')}</span>
                    <span class="weather-day-temp"><b>${Math.round(day.max)}°</b> ${Math.round(day.min)}°</span>
                    <span class="weather-day-rain" title="Chance de chuva">${uiIcon('res-water')} ${day.rainChance ?? 0}%</span>
                    ${day.gusts >= 50 ? `<span class="weather-day-wind" title="Rajadas de até ${Math.round(day.gusts)} km/h">${uiIcon('weather-wind')} ${Math.round(day.gusts)}</span>` : ''}
                </div>`;
            }).join('');
            body = `
                <div class="weather-now weather-card--${info.anim}${current.isDay ? '' : ' weather-card--night'}">
                    ${this.weatherAnimationHtml(info.anim, current.isDay)}
                    <div class="weather-now-main">
                        <span class="weather-now-temp">${Math.round(current.temperature)}°C</span>
                        <span class="weather-now-label">${info.label}</span>
                    </div>
                </div>
                <div class="weather-stats">
                    <span>${uiIcon('res-temperature')} Sensação <b>${Math.round(current.apparent)}°C</b></span>
                    <span>${uiIcon('weather-humidity')} Umidade <b>${current.humidity}%</b></span>
                    <span>${uiIcon('weather-wind')} Vento <b>${Math.round(current.wind)} km/h</b>${from}${gusts}</span>
                    <span>${uiIcon('weather-rain')} Chuva agora <b>${current.precipitation} mm</b></span>
                </div>
                ${wind.windy ? `<p class="weather-wind-alert">${uiIcon('weather-wind')} <b>Vento forte agora!</b> No mapa as árvores se curvam e o vento leva folhas e poeira.</p>` : ''}
                <h4 class="weather-forecast-title">Próximos dias</h4>
                <div class="weather-forecast">${days}</div>
                <p class="weather-tip">${uiIconsIn(this.weatherTip(this.weather.data))}</p>`;
        } else if (this.weather?.status === 'nolocation') {
            body = '<p class="weather-tip">Não encontramos a localização da sua cidade, então não dá para mostrar o clima.</p>';
        } else {
            body = `<p class="weather-tip">${this.weather?.status === 'loading' ? 'Buscando o clima...' : 'Não foi possível buscar o clima agora (sem internet?).'}</p>
                <button class="weather-retry overlay-btn primary">Tentar de novo</button>`;
        }
        modal.innerHTML = `<div class="weather-modal-card" role="dialog" aria-label="Clima">
            <button class="weather-modal-close" aria-label="Fechar">${uiIcon('ui-close')}</button>
            <h3>${uiIcon('weather-drizzle', 'lg')} ${this.weather?.simulated ? 'Clima simulado' : `Clima em ${place}`}</h3>
            ${this.weather?.simulated ? `<p class="weather-sim-note">${this.weather.fallback
        ? 'Não encontramos a localização da sua cidade: o jogo está inventando o tempo.'
        : 'Você escolheu o clima simulado em ⚙️ Configurações: o jogo inventa o tempo de cada dia.'}</p>` : ''}
            ${body}
        </div>`;
    },

    // Liga o clima real ao tema do jogo: o que a chuva (ou a falta dela) muda para a água da cidade
    weatherTip({ current, daily }) {
        const name = PlayerProfile.displayName();
        const rainyDays = daily.filter(d => (d.rainChance ?? 0) >= 60).length;
        if (rainyDays >= 2) return `💡 ${name}, vem chuva aí! Chuva enche rios e represas — uma boa hora para pensar em captar e guardar água.`;
        if (current.temperature >= 30) return `💡 ${name}, está quente! No calor as pessoas usam mais água, então economizar faz diferença.`;
        if (rainyDays === 0) return `💡 ${name}, poucos sinais de chuva nos próximos dias. Sem chuva, rios e represas baixam: cada gota conta.`;
        return `💡 ${name}, o clima muda quanta água chega aos rios e quanta a cidade gasta. Fique de olho!`;
    },

    closeWeatherModal() {
        document.getElementById('weather-modal')?.remove();
    }
});
