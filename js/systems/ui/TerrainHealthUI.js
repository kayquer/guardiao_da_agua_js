/**
 * UIManager — "Saúde deste lugar" no painel de terreno: os indicadores do chão (infiltração, umidade, matéria
 * orgânica, poluição local, erosão) ou do rio (oxigênio, turbidez, nível, sombra, vida aquática) da célula clicada,
 * cada um com barra, cor E palavra (nunca só a cor) e a linha do que mexe nele. Conta em js/systems/TerrainHealth.js,
 * pesos e textos em js/data/terrainHealth.js. Atualiza ao vivo (updateTerrainHealthPanel, a cada 1 s pelo update)
 * só trocando larguras, classes e textos, sem redesenhar o painel.
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
    /** Avalia a célula agora (snapshot do jogo → TerrainHealth.evaluate). */
    getTerrainHealth(x, z) {
        if (typeof TerrainHealth === 'undefined') return null;
        return TerrainHealth.evaluate(TerrainHealth.collect(this.gameManager, x, z));
    },

    /** ✓ / ! / ✕ junto da palavra: o nível não depende só da cor. */
    terrainHealthMark(level) {
        return { good: '✓', ok: '!', bad: '✕' }[level] || '';
    },

    /** Bloco do painel (string HTML). Guarda a célula para a atualização ao vivo. */
    renderTerrainHealth(x, z, health = this.getTerrainHealth(x, z)) {
        this.terrainHealthCell = health ? { x, z } : null;
        if (!health) return '';
        const title = health.kind === 'water' ? 'Saúde da água aqui' : 'Saúde do solo aqui';
        const rows = health.indicators.map(ind => `
            <li class="th-row th-${ind.level}" data-indicator="${ind.id}">
                <div class="th-head">
                    <span class="th-label">${ind.icon} ${ind.label}</span>
                    <span class="th-pill" id="th-word-${ind.id}" title="${ind.levelWord}">${this.terrainHealthMark(ind.level)} ${ind.word}</span>
                </div>
                <div class="th-track" role="meter" aria-label="${ind.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${ind.value}"
                     aria-valuetext="${ind.word} (${ind.levelWord})">
                    <div class="th-fill" id="th-fill-${ind.id}" style="width:${ind.value}%"></div>
                </div>
                <p class="th-why" id="th-why-${ind.id}" title="${ind.moves}">${ind.why}</p>
            </li>`).join('');
        return `
            <section id="terrain-health" class="terrain-health th-${health.level}" data-kind="${health.kind}" data-level="${health.level}">
                <div class="th-summary">
                    <h5>${title}</h5>
                    <span class="th-score" id="th-score">${this.terrainHealthScoreText(health)}</span>
                </div>
                <ul class="th-list">${rows}</ul>
                <p class="th-species" id="th-species">${this.terrainHealthSpeciesText(health)}</p>
            </section>`;
    },

    terrainHealthScoreText(health) {
        return `${this.terrainHealthMark(health.level)} ${health.levelWord} · ${health.score}/100`;
    },

    /** Bichos do caderno de campo por perto (nome só dos que o jogador já registrou). */
    terrainHealthSpeciesText(health) {
        const list = health.species || [];
        if (!list.length) {
            return health.kind === 'water' ? '🔎 Nenhum bicho do caderno de campo aqui perto.' : '';
        }
        const known = list.filter(s => s.known).map(s => `${s.icon} ${s.name}`);
        const unknown = list.length - known.length;
        const parts = [...known];
        if (unknown) parts.push(`${unknown} ${unknown === 1 ? 'bicho ainda não registrado' : 'bichos ainda não registrados'} (toque ${unknown === 1 ? 'nele' : 'neles'} no mapa)`);
        return `🔎 Por perto: ${parts.join(', ')}.`;
    },

    /** Atualização ao vivo do painel aberto (chamada a cada 1 s por update): só o que mudou. */
    updateTerrainHealthPanel() {
        const cell = this.terrainHealthCell;
        if (!cell || this.uiState?.currentOpenPanel !== 'terrain' || typeof document === 'undefined') return;
        const root = document.getElementById('terrain-health');
        if (!root) return;
        const health = this.getTerrainHealth(cell.x, cell.z);
        if (!health) return;
        const swap = (el, level) => {
            for (const l of ['good', 'ok', 'bad']) el.classList.toggle(`th-${l}`, l === level);
        };
        swap(root, health.level);
        if (root.dataset.level !== health.level) root.dataset.level = health.level;
        const score = document.getElementById('th-score');
        if (score) this.setText(score, this.terrainHealthScoreText(health));
        health.indicators.forEach(ind => {
            const row = root.querySelector(`[data-indicator="${ind.id}"]`);
            if (!row) return;
            swap(row, ind.level);
            const fill = document.getElementById(`th-fill-${ind.id}`);
            const width = `${ind.value}%`;
            if (fill && fill.style.width !== width) {
                fill.style.width = width;
                const track = fill.parentElement;
                track.setAttribute('aria-valuenow', String(ind.value));
                track.setAttribute('aria-valuetext', `${ind.word} (${ind.levelWord})`);
            }
            const word = document.getElementById(`th-word-${ind.id}`);
            if (word) {
                this.setText(word, `${this.terrainHealthMark(ind.level)} ${ind.word}`);
                if (word.title !== ind.levelWord) word.title = ind.levelWord;
            }
            const why = document.getElementById(`th-why-${ind.id}`);
            if (why) this.setText(why, ind.why);
        });
        const species = document.getElementById('th-species');
        if (species) this.setText(species, this.terrainHealthSpeciesText(health));
    },

    /** Som da seleção do terreno pela saúde do lugar (SoundDirector.onSelectTerrain). */
    playTerrainSelectSound(terrainType, health) {
        if (typeof AudioManager === 'undefined') return;
        const group = terrainType === 'water' ? 'river' : 'soil';
        const polluted = !!health?.indicators?.some(ind => (ind.id === 'pollution' || ind.id === 'oxygen') && ind.level === 'bad');
        AudioManager.onSelectTerrain(group, { level: health?.level || 'ok', polluted });
    }
});
