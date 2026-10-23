/**
 * GUARDIÃO DA ÁGUA - POLUIÇÃO VISÍVEL
 * Acima de 70% de poluição a cidade mostra o problema: água turva (verde-marrom), ruas encardidas e o ar
 * com névoa de fumaça (céu e neblina amarronzados, sol mais fraco e amarelado). Cresce até 100% e some quando
 * a poluição baixa, sempre aos poucos (level persegue o alvo).
 *
 * Água: uniform `pollution` do shader (GridManager.setWaterPollution); ruas: diffuse dos materiais
 * `roadPieceMat_*` (RoadMeshes, cor de vértice × diffuse); ar: applyToLighting, chamado por
 * GameManager.updateDayNightLighting depois do clima (o ciclo dia/noite reescreve a luz a cada segundo).
 */
class PollutionVisuals {
    static START = 70;            // % de poluição em que a cidade começa a ficar suja
    static FULL = 100;            // % de efeito máximo
    static CHANGE_MS = 4000;      // tempo para ir de limpo a sujo (ou voltar) por inteiro
    static SMOG = [0.58, 0.54, 0.42];
    static ROAD_DIRTY = [0.66, 0.6, 0.5];
    static FOG_DENSITY = 0.022;

    /** Poluição 0-100 → intensidade do efeito 0-1 (0 até START). */
    static levelFor(pollution) {
        const p = Number(pollution);
        if (!Number.isFinite(p)) return 0;
        return Math.max(0, Math.min(1, (p - PollutionVisuals.START) / (PollutionVisuals.FULL - PollutionVisuals.START)));
    }

    constructor(gameManager) {
        this.gameManager = gameManager;
        this.level = 0;
        this.applied = null; // nível já aplicado na cena (null = nunca)
        this.timer = 0;
    }

    get scene() {
        return this.gameManager.scene;
    }

    targetLevel() {
        return PollutionVisuals.levelFor(this.gameManager.resourceManager?.resources?.pollution?.current);
    }

    /** No update do jogo (ms). Na primeira vez (jogo novo/carregado) vai direto ao nível certo. */
    update(deltaTime) {
        this.timer += deltaTime;
        if (this.timer < 250 && this.applied !== null) return;
        const dt = this.timer;
        this.timer = 0;

        const target = this.targetLevel();
        if (this.applied === null) {
            this.level = target;
        } else {
            const step = dt / PollutionVisuals.CHANGE_MS;
            this.level += Math.max(-step, Math.min(step, target - this.level));
        }
        if (this.applied !== null && Math.abs(this.level - this.applied) < 0.01 && !(this.level === 0 && this.applied !== 0)) return;
        this.applied = this.level;

        this.gameManager.gridManager?.setWaterPollution?.(this.level);
        this.applyToRoads();
        this.gameManager.updateDayNightLighting?.();
    }

    applyToRoads() {
        const t = this.level;
        const [r, g, b] = PollutionVisuals.ROAD_DIRTY;
        const color = new BABYLON.Color3(1 + (r - 1) * t, 1 + (g - 1) * t, 1 + (b - 1) * t);
        this.scene?.materials.forEach(material => {
            if (material.name.startsWith('roadPieceMat_')) material.diffuseColor = color;
        });
    }

    /** Ar poluído por cima do dia/noite e do clima (GameManager.updateDayNightLighting). */
    applyToLighting(ambientLight) {
        const scene = this.scene;
        if (!scene) return;
        const t = this.level;
        const weather = this.gameManager.weatherEffects;
        const weatherFog = weather?.profile?.fog || 0;
        if (t <= 0) {
            // Sem poluição: a neblina volta a ser só a do clima
            scene.fogMode = weatherFog ? BABYLON.Scene.FOGMODE_EXP2 : BABYLON.Scene.FOGMODE_NONE;
            scene.fogDensity = weatherFog;
            const sun = scene.getLightByName('sunLight');
            if (sun && !weather) {
                sun.intensity = 0.8;
                sun.diffuse = new BABYLON.Color3(1, 0.95, 0.8);
            }
            return;
        }

        // Céu amarronzado, proporcional ao brilho do céu (de noite a fumaça também é escura)
        const sky = scene.clearColor;
        const brightness = Math.min(1, ((sky.r + sky.g + sky.b) / 3) / 0.75);
        const mix = 0.7 * t;
        const [sr, sg, sb] = PollutionVisuals.SMOG.map(c => c * brightness);
        scene.clearColor = new BABYLON.Color4(
            sky.r + (sr - sky.r) * mix,
            sky.g + (sg - sky.g) * mix,
            sky.b + (sb - sky.b) * mix,
            1
        );
        if (weather) weather.baseClearColor = scene.clearColor.clone(); // o relâmpago volta para este céu

        scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        scene.fogDensity = Math.max(weatherFog, PollutionVisuals.FOG_DENSITY * t);
        scene.fogColor = new BABYLON.Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b);

        if (ambientLight) {
            ambientLight.intensity *= 1 - 0.2 * t;
            const d = ambientLight.diffuse;
            ambientLight.diffuse = new BABYLON.Color3(d.r, d.g + (0.9 - d.g) * t * 0.5, d.b + (0.7 - d.b) * t * 0.5);
        }
        // O sol só é recalculado do zero pelo clima (WeatherEffects.applyToLighting): sem ele, parte do valor
        // padrão para não ir multiplicando a cada segundo
        const sun = scene.getLightByName('sunLight');
        if (sun) {
            const base = weather ? sun.diffuse : new BABYLON.Color3(1, 0.95, 0.8);
            sun.intensity = (weather ? sun.intensity : 0.8) * (1 - 0.25 * t);
            sun.diffuse = new BABYLON.Color3(1, base.g + (0.85 - base.g) * t, base.b + (0.6 - base.b) * t);
        }
    }
}

window.PollutionVisuals = PollutionVisuals;
