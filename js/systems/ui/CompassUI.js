/**
 * UIManager — bússola no canto inferior direito.
 * O N aponta para o norte do mapa (+z no mundo) e gira junto com a câmera; a seta azul mostra para onde
 * o vento real sopra (WeatherEffects.windVector, o mesmo vetor que move nuvens, chuva, riscos e árvores).
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
    initCompass() {
        // Cada partida tem cena nova: o elemento fica, o observador é deste UIManager
        if (!this.compassObserver) {
            this.compassObserver = this.gameManager.scene.onBeforeRenderObservable.add(() => this.updateCompass());
        }
        document.getElementById('compass')?.remove();
        this.compassNorth = this.compassWind = null;
        const compass = document.createElement('div');
        compass.id = 'compass';
        compass.className = 'compass';
        compass.setAttribute('role', 'button');
        compass.tabIndex = 0;
        compass.setAttribute('aria-label', 'Virar a câmera para o norte');
        compass.addEventListener('click', () => this.turnCameraNorthSouth());
        compass.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.turnCameraNorthSouth();
            }
        });
        compass.innerHTML = `
            <svg class="compass-dial" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="46" class="compass-face"/>
                <circle cx="50" cy="50" r="38" class="compass-inner"/>
                <!-- rotate(a 50 50) do JS fica no grupo de fora; a animação (com transform-origin) no de dentro:
                     juntos no mesmo elemento, o transform-origin do CSS deslocava o centro do rotate -->
                <g class="compass-rose"><g class="compass-rose-settle">
                    <path d="M50 8 L56 50 L50 46 L44 50 Z" class="compass-north"/>
                    <path d="M50 92 L56 50 L50 54 L44 50 Z" class="compass-south"/>
                    <text x="50" y="25" class="compass-letter compass-letter--n">N</text>
                    <text x="50" y="84" class="compass-letter">S</text>
                    <text x="81" y="54" class="compass-letter">L</text>
                    <text x="19" y="54" class="compass-letter">O</text>
                </g></g>
                <g class="compass-wind" hidden>
                    <path d="M50 30 L50 70 M50 22 L42 36 L58 36 Z" class="compass-wind-arrow"/>
                </g>
                <circle cx="50" cy="50" r="4" class="compass-pin"/>
            </svg>
            <span class="compass-wind-label" hidden></span>`;
        document.getElementById('game-screen')?.appendChild(compass);
        this.compassEls = {
            root: compass,
            rose: compass.querySelector('.compass-rose'),
            wind: compass.querySelector('.compass-wind'),
            label: compass.querySelector('.compass-wind-label')
        };
    },

    /**
     * Clique na bússola: vira a câmera para o norte (N para cima); se já estiver no norte, vira para o sul.
     * A câmera olha para (-cos α, -sin α): norte (+z) é α = -π/2 e sul é α = +π/2. Gira pelo caminho mais
     * curto a partir do alvo atual (o alpha acumula voltas com Q/E e o mouse); o controle suave faz a animação.
     */
    turnCameraNorthSouth() {
        const controls = this.gameManager.cameraControls;
        if (!controls || this.isOnCooldown('compass')) return;
        this.setCooldown('compass', 300);
        const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
        const from = controls.targetAlpha ?? this.gameManager.camera.alpha;
        // Pelo alvo (não pelo ângulo atual): o giro suave demora a assentar, e o 2º clique logo depois deve ir ao sul
        const facingNorth = Math.abs(wrap(from + Math.PI / 2)) < 0.09;
        const wanted = facingNorth ? Math.PI / 2 : -Math.PI / 2;
        const delta = wrap(wanted - from);
        controls.targetAlpha = from + delta;
        const next = facingNorth ? 'norte' : 'sul'; // depois do giro, o próximo clique vai para o outro lado
        this.compassEls?.root.setAttribute('aria-label', `Virar a câmera para o ${next}`);
        AudioManager.playSound('sfx_click', 0.6);
    },

    /** Ângulo na tela (graus, horário a partir do "para cima") de uma direção do mundo {x, z}. */
    screenAngle(direction) {
        const alpha = this.gameManager.camera?.alpha ?? 0;
        // A câmera (ArcRotate) olha para (-cos α, -sin α) no chão; a direita da tela é up × frente
        const forward = { x: -Math.cos(alpha), z: -Math.sin(alpha) };
        const right = { x: forward.z, z: -forward.x };
        // A câmera olha inclinada (beta): o chão "encurta" na vertical da tela por cos(beta)
        const up = (direction.x * forward.x + direction.z * forward.z) * Math.cos(this.gameManager.camera?.beta ?? 0);
        const side = direction.x * right.x + direction.z * right.z;
        return Math.atan2(side, up) * 180 / Math.PI;
    },

    updateCompass() {
        const els = this.compassEls;
        if (!els) return;
        const north = this.screenAngle({ x: 0, z: 1 });
        // Só mexe no DOM quando muda (roda a cada frame)
        const key = Math.round(north);
        if (key !== this.compassNorth) {
            this.compassNorth = key;
            els.rose.setAttribute('transform', `rotate(${north.toFixed(1)} 50 50)`);
        }

        const profile = this.gameManager.weatherEffects?.profile;
        const hasWind = profile && profile.kind !== 'none';
        els.wind.hidden = !hasWind;
        els.label.hidden = !hasWind;
        if (!hasWind) {
            els.root.title = 'Bússola: o N aponta para o norte. Clique para virar a câmera para o norte (de novo: sul)';
            return;
        }
        const angle = this.screenAngle(WeatherEffects.windVector(profile.windDir));
        const windKey = `${Math.round(angle)}|${Math.round(profile.wind)}|${profile.windy}`;
        if (windKey === this.compassWind) return;
        this.compassWind = windKey;
        els.wind.setAttribute('transform', `rotate(${angle.toFixed(1)} 50 50)`);
        els.root.classList.toggle('compass--windy', !!profile.windy);
        const from = WeatherService.compass(profile.windDir);
        els.label.innerHTML = `${uiIcon('weather-wind')} ${Math.round(profile.wind)} km/h`;
        els.root.title = `Bússola: o N aponta para o norte. Vento de ${Math.round(profile.wind)} km/h vindo do ${from} (seta azul: para onde ele sopra). Clique para virar a câmera para o norte (de novo: sul)`;
    }
});
