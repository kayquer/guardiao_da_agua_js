/**
 * WeatherEffects — o clima real da cidade do jogador dentro do mundo 3D.
 * Chuva/garoa/tempestade (partículas esticadas, inclinadas pelo vento), neve, nuvens que andam com o vento,
 * árvores que balançam, neblina, relâmpagos e sol forte. Tudo procedural (sem arquivos de imagem).
 *
 * GameManager.applyWeather(current) chama apply(); a luz entra em GameManager.updateDayNightLighting
 * via applyToLighting(), porque o ciclo dia/noite reescreve a luz a cada segundo.
 * `current` é o formato de WeatherService.parse (temperature, wind, precipitation, code, isDay).
 */
class WeatherEffects {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.scene = gameManager.scene;
        this.profile = WeatherEffects.profileFor(null);
        this.clouds = [];
        this.time = 0;
        this.nextLightning = 6;
        this.flash = 0;
        this.quality = GraphicsQuality.preset(); // partículas, nuvens e balanço das árvores (setQuality)
        this.swayFrame = 0;
        this.swayDt = 0;
        this.observer = this.scene.onBeforeRenderObservable.add(() => this.update());
    }

    /**
     * O que mostrar para um clima (sem Babylon: testável). kind segue WeatherService.describe(...).anim.
     * rain/snow 0..1 = intensidade; wind em km/h; light/sky = quanto clareia ou escurece o dia.
     */
    static profileFor(current) {
        if (!current) return { kind: 'none', rain: 0, snow: 0, wind: 8, gusts: 8, windDir: 270, windy: false, windStrength: 0, clouds: 2, fog: 0, light: 1, sky: 0, hot: false, lightning: false };
        const kind = WeatherService.describe(current.code, current.isDay).anim;
        const code = Number(current.code);
        const heavy = [65, 67, 82, 95, 96, 99].includes(code);
        const drizzle = [51, 53, 55, 56, 57].includes(code);
        const profile = {
            kind,
            rain: 0,
            snow: 0,
            wind: Number(current.wind) || 0,
            gusts: Number(current.gusts ?? current.wind) || 0,
            windDir: Number(current.windDir ?? 270),
            windy: false,
            windStrength: 0,
            clouds: { sun: 1, partly: 4, cloud: 8, fog: 6, rain: 9, storm: 10, snow: 8 }[kind] ?? 3,
            fog: kind === 'fog' ? 0.018 : 0,
            light: { sun: 1, partly: 0.95, cloud: 0.8, fog: 0.75, rain: 0.7, storm: 0.55, snow: 0.85 }[kind] ?? 1,
            sky: { sun: 0, partly: 0.15, cloud: 0.45, fog: 0.5, rain: 0.6, storm: 0.8, snow: 0.4 }[kind] ?? 0,
            hot: kind === 'sun' && current.isDay !== false && Number(current.temperature) >= 28,
            lightning: kind === 'storm'
        };
        if (kind === 'rain' || kind === 'storm') profile.rain = heavy ? 1 : drizzle ? 0.3 : 0.6;
        if (kind === 'snow') profile.snow = 0.6;
        // Vento forte (Beaufort 6+, ~39 km/h; aqui a partir de 30 de média ou 50 de rajada):
        // riscos de vento e folhas voando no mapa
        profile.windStrength = Math.min(Math.max(profile.wind, profile.gusts * 0.75) / 50, 1);
        profile.windy = profile.wind >= 30 || profile.gusts >= 50;
        return profile;
    }

    /** Para onde o vento sopra no mapa ({x, z} unitário). windDir é de onde ele vem (meteorologia: 0 = norte). */
    static windVector(windDir) {
        const toward = (Number(windDir) + 180) * Math.PI / 180;
        return { x: Math.sin(toward), z: Math.cos(toward) };
    }

    apply(current) {
        this.profile = WeatherEffects.profileFor(current);
        this.particleScale = this.quality.particleScale;

        this.wind = WeatherEffects.windVector(this.profile.windDir);
        this.setupPrecipitation();
        this.setupClouds();
        this.setupWindParticles();
        this.scene.fogMode = this.profile.fog ? BABYLON.Scene.FOGMODE_EXP2 : BABYLON.Scene.FOGMODE_NONE;
        this.scene.fogDensity = this.profile.fog;
        this.gameManager.updateDayNightLighting?.();
        log(`🌦️ Clima no mapa: ${this.profile.kind} · chuva ${this.profile.rain} · vento ${this.profile.wind} km/h (rajadas ${this.profile.gusts})${this.profile.windy ? ' · VENTO FORTE' : ''}`);
    }

    // ===== Chuva e neve =====
    static dropTexture(scene, round) {
        // Floco: quadrada (o quad da partícula é quadrado). Gota: fina e alta, esticada pelo BILLBOARDMODE_STRETCHED
        const size = round ? { width: 32, height: 32 } : { width: 16, height: 64 };
        const texture = new BABYLON.DynamicTexture(round ? 'weatherFlake' : 'weatherDrop', size, scene, false);
        const ctx = texture.getContext();
        ctx.clearRect(0, 0, size.width, size.height);
        if (round) {
            const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 32, 32);
        } else {
            const g = ctx.createLinearGradient(0, 0, 0, 64);
            g.addColorStop(0, 'rgba(200,225,255,0)');
            g.addColorStop(1, 'rgba(200,225,255,0.9)');
            ctx.fillStyle = g;
            ctx.fillRect(6, 0, 4, 64);
        }
        texture.hasAlpha = true;
        texture.update();
        return texture;
    }

    setupPrecipitation() {
        const { rain, snow } = this.profile;
        const amount = Math.max(rain, snow);
        const kind = snow ? 'snow' : 'rain';
        if (!amount) {
            this.precipitation?.stop();
            return;
        }
        if (this.precipitation && this.precipitationKind !== kind) {
            this.precipitation.dispose();
            this.precipitation = null;
        }
        if (!this.precipitation) {
            const ps = new BABYLON.ParticleSystem(`weather_${kind}`, 6000, this.scene);
            ps.particleTexture = WeatherEffects.dropTexture(this.scene, kind === 'snow');
            ps.emitter = new BABYLON.Vector3(0, 20, 0); // abaixo da câmera (~18-25 de altura), senão a chuva nem aparece
            ps.minEmitBox = new BABYLON.Vector3(-30, 0, -30);
            ps.maxEmitBox = new BABYLON.Vector3(30, 0, 30);
            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
            ps.color1 = new BABYLON.Color4(0.85, 0.93, 1, 1);
            ps.color2 = new BABYLON.Color4(0.75, 0.88, 1, 0.85);
            ps.colorDead = new BABYLON.Color4(0.7, 0.85, 1, 0);
            if (kind === 'snow') {
                ps.minSize = 0.35; ps.maxSize = 0.7;
                ps.minLifeTime = 3; ps.maxLifeTime = 4.5;
                ps.minEmitPower = 4; ps.maxEmitPower = 7;
            } else {
                ps.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_STRETCHED;
                ps.minSize = 0.12; ps.maxSize = 0.2;
                ps.minScaleY = 3; ps.maxScaleY = 5;
                ps.minLifeTime = 0.7; ps.maxLifeTime = 0.9;
                ps.minEmitPower = 24; ps.maxEmitPower = 30;
            }
            this.precipitation = ps;
            this.precipitationKind = kind;
        }
        const ps = this.precipitation;
        // O vento inclina a queda para onde ele sopra
        const slant = Math.min(this.profile.wind / 40, 1) * (kind === 'snow' ? 0.8 : 0.35);
        const w = this.wind;
        ps.direction1 = new BABYLON.Vector3(w.x * slant * 0.8 - 0.05, -1, w.z * slant * 0.8 - 0.05);
        ps.direction2 = new BABYLON.Vector3(w.x * slant * 1.2 + 0.05, -1, w.z * slant * 1.2 + 0.05);
        ps.emitRate = Math.round((kind === 'snow' ? 900 : 2600) * amount * this.particleScale);
        if (!ps.isStarted()) ps.start();
    }

    // ===== Nuvens =====
    setupClouds() {
        const wanted = this.quality.clouds ? this.profile.clouds : 0;
        const shade = 1 - this.profile.sky * 0.55; // nuvem de chuva é mais escura
        if (!this.cloudMaterial) {
            this.cloudMaterial = new BABYLON.StandardMaterial('weatherCloudMat', this.scene);
            this.cloudMaterial.specularColor = BABYLON.Color3.Black();
            this.cloudMaterial.alpha = 0.55; // passam entre a câmera e o chão: dá para ver a cidade através
            this.cloudMaterial.disableLighting = true;
        }
        this.cloudMaterial.emissiveColor = new BABYLON.Color3(shade, shade, shade * 1.03);
        while (this.clouds.length < wanted) this.clouds.push(this.createCloud(this.clouds.length));
        this.clouds.forEach((cloud, i) => cloud.setEnabled(i < wanted));
    }

    createCloud(index) {
        const puffs = [];
        const count = 3 + (index % 3);
        for (let i = 0; i < count; i++) {
            const puff = BABYLON.MeshBuilder.CreateSphere(`cloudPuff_${index}_${i}`, { diameter: 5 + (i % 2) * 2, segments: 6 }, this.scene);
            puff.position.set(i * 3 - count * 1.5, (i % 2) * 0.8, (i % 3) - 1);
            puffs.push(puff);
        }
        const cloud = BABYLON.Mesh.MergeMeshes(puffs, true);
        cloud.name = `weatherCloud_${index}`;
        cloud.material = this.cloudMaterial;
        cloud.scaling.y = 0.45;
        cloud.isPickable = false;
        // Altura entre o chão e a câmera (que fica a ~18-25): acima disso a nuvem sai da vista
        cloud.position.set(-50 + Math.random() * 100, 11 + Math.random() * 3, -50 + Math.random() * 100);
        return cloud;
    }

    // ===== Luz (chamado pelo ciclo dia/noite) =====
    applyToLighting(ambientLight) {
        const p = this.profile;
        if (ambientLight) ambientLight.intensity *= p.light * (p.hot ? 1.15 : 1);
        const sun = this.scene.getLightByName('sunLight');
        if (sun) {
            sun.intensity = 0.8 * p.light * (p.hot ? 1.5 : 1);
            sun.diffuse = p.hot ? new BABYLON.Color3(1, 0.88, 0.65) : new BABYLON.Color3(1, 0.95, 0.8);
        }
        // Céu mais cinza com nuvem/chuva
        const sky = this.scene.clearColor;
        const gray = (sky.r + sky.g + sky.b) / 3 * 0.85;
        this.scene.clearColor = new BABYLON.Color4(
            sky.r + (gray - sky.r) * p.sky,
            sky.g + (gray - sky.g) * p.sky,
            sky.b + (gray - sky.b) * p.sky,
            1
        );
        this.baseClearColor = this.scene.clearColor.clone();
        if (p.fog) this.scene.fogColor = new BABYLON.Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b);
    }

    // ===== A cada frame =====
    update() {
        const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.1);
        this.time += dt;
        const p = this.profile;
        const target = this.gameManager.camera?.target;

        // Chuva sempre sobre onde a câmera olha
        if (this.precipitation && target) {
            this.precipitation.emitter.x = target.x;
            this.precipitation.emitter.z = target.z;
        }

        // Nuvens andam na direção real do vento e dão a volta no mapa
        const cloudSpeed = 0.6 + p.wind * 0.12;
        const w = this.wind || WeatherEffects.windVector(p.windDir);
        const wrap = v => (v > 60 ? v - 120 : v < -60 ? v + 120 : v);
        this.clouds.forEach((cloud, i) => {
            if (!cloud.isEnabled()) return;
            const step = cloudSpeed * dt * (0.8 + (i % 3) * 0.15);
            cloud.position.x = wrap(cloud.position.x + w.x * step);
            cloud.position.z = wrap(cloud.position.z + w.z * step);
        });

        // Riscos de vento e folhas nascem a barlavento de onde a câmera olha
        if (this.windParticles && target) {
            this.windParticles.emitter.x = target.x - w.x * 18;
            this.windParticles.emitter.z = target.z - w.z * 18;
        }

        // Árvores balançam com o vento (decorações do GridManager)
        // (qualidade gráfica: a cada N quadros, com o tempo somado; 0 = paradas)
        const every = this.quality.treeSway;
        if (every) {
            this.swayDt += dt;
            if (++this.swayFrame % every === 0) {
                this.updateTrees(this.swayDt);
                this.swayDt = 0;
            }
        }

        // Relâmpago na tempestade: o céu e a luz piscam
        if (p.lightning) {
            this.nextLightning -= dt;
            if (this.nextLightning <= 0) {
                this.flash = 0.18;
                this.nextLightning = 4 + Math.random() * 8;
                if (typeof AudioManager !== 'undefined') AudioManager.onLightning(); // estalo + trovão junto do clarão
            }
        }
        const ambient = this.scene.getLightByName('ambientLight');
        if (this.flash > 0) {
            this.flash -= dt;
            if (ambient) ambient.intensity = 2.2;
            this.scene.clearColor = new BABYLON.Color4(0.85, 0.88, 1, 1);
            if (this.flash <= 0) this.gameManager.updateDayNightLighting?.();
        }
    }

    // ===== Vento =====
    /** Rajada: de vez em quando o vento sobe da média até a rajada da previsão (0 = média, 1 = rajada). */
    gustLevel() {
        const wave = Math.max(0, Math.sin(this.time * 0.45)) * Math.max(0, Math.sin(this.time * 1.3 + 1));
        return wave * wave;
    }

    /** Árvores (TreeSystem e decorações) inclinam para onde o vento sopra, mais nas rajadas. */
    /** Qualidade gráfica trocada (GameManager.applyGraphicsQuality): refaz chuva/vento/nuvens na nova escala. */
    setQuality(preset) {
        this.quality = preset;
        if (!preset.treeSway) {
            this.gameManager.treeSystem?.trees.forEach(tree => { tree.rotation.x = 0; tree.rotation.z = 0; });
        }
        if (this.profile.kind === 'none') return; // clima ainda não chegou: apply() usa a qualidade nova
        this.particleScale = preset.particleScale;
        this.setupPrecipitation();
        this.setupClouds();
        this.setupWindParticles();
    }

    updateTrees(dt) {
        const p = this.profile;
        const w = this.wind || WeatherEffects.windVector(p.windDir);
        const speed = p.wind + Math.max(0, p.gusts - p.wind) * this.gustLevel();
        const lean = Math.min(speed / 60, 1) * 0.16;
        const shake = Math.min(speed / 45, 1) * 0.06;
        // A fase acumula a frequência quadro a quadro: com time * freq, a rajada mudando freq
        // fazia a fase saltar (time grande × variação pequena) e as árvores sacudiam rápido e paravam.
        this.swayPhase = ((this.swayPhase || 0) + dt * (1.2 + speed * 0.03)) % (Math.PI * 2000);
        let i = 0;
        const sway = tree => {
            i++;
            if (tree.isDisposed()) return;
            // Inclinação no mundo convertida para os eixos da árvore (cada uma tem um giro próprio em Y)
            const c = Math.cos(tree.rotation.y), s = Math.sin(tree.rotation.y);
            const amount = lean + Math.sin(this.swayPhase + i * 0.7) * shake;
            tree.rotation.z = -(w.x * c - w.z * s) * amount;
            tree.rotation.x = (w.x * s + w.z * c) * amount;
        };
        this.gameManager.treeSystem?.trees.forEach(sway);
    }

    /** Vento forte: riscos brancos cruzando o mapa e folhas voando na direção do vento. */
    setupWindParticles() {
        const p = this.profile;
        if (!p.windy) {
            this.windParticles?.stop();
            return;
        }
        if (!this.windParticles) {
            const ps = new BABYLON.ParticleSystem('weather_wind', 800, this.scene);
            ps.particleTexture = WeatherEffects.windTexture(this.scene);
            ps.emitter = new BABYLON.Vector3(0, 3, 0);
            ps.minEmitBox = new BABYLON.Vector3(-20, 0, -20);
            ps.maxEmitBox = new BABYLON.Vector3(20, 6, 20);
            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
            ps.billboardMode = BABYLON.ParticleSystem.BILLBOARDMODE_STRETCHED;
            ps.minLifeTime = 1.2; ps.maxLifeTime = 2;
            ps.minSize = 0.08; ps.maxSize = 0.14;
            ps.minScaleY = 6; ps.maxScaleY = 10;
            ps.color1 = new BABYLON.Color4(1, 1, 1, 0.55);
            ps.color2 = new BABYLON.Color4(0.75, 0.95, 0.55, 0.7); // algumas parecem folhas
            ps.colorDead = new BABYLON.Color4(1, 1, 1, 0);
            this.windParticles = ps;
        }
        const ps = this.windParticles;
        const w = this.wind;
        ps.direction1 = new BABYLON.Vector3(w.x - w.z * 0.15, -0.05, w.z + w.x * 0.15);
        ps.direction2 = new BABYLON.Vector3(w.x + w.z * 0.15, 0.15, w.z - w.x * 0.15);
        const power = 10 + p.windStrength * 14;
        ps.minEmitPower = power * 0.8;
        ps.maxEmitPower = power * 1.2;
        ps.emitRate = Math.round((60 + 220 * p.windStrength) * this.particleScale);
        if (!ps.isStarted()) ps.start();
    }

    static windTexture(scene) {
        const texture = new BABYLON.DynamicTexture('weatherWind', { width: 16, height: 64 }, scene, false);
        const ctx = texture.getContext();
        ctx.clearRect(0, 0, 16, 64);
        const g = ctx.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(5, 0, 6, 64);
        texture.hasAlpha = true;
        texture.update();
        return texture;
    }

    dispose() {
        this.scene.onBeforeRenderObservable.remove(this.observer);
        this.precipitation?.dispose();
        this.windParticles?.dispose();
        this.clouds.forEach(cloud => cloud.dispose());
        this.cloudMaterial?.dispose();
        this.clouds = [];
    }
}
