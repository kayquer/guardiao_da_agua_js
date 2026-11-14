/**
 * UIManager — "Diário da cidade" (11/2026): a linha do tempo da partida que o jogador vê (js/systems/CityDiary.js).
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 *
 * Pausa → "📔 Diário da cidade" (#diary-panel, css/city-story.css): mesmo esquema do painel de Conquistas (troca de
 * lugar com o painel do jogador e o Esc volta para a pausa). Também no menu do jogador. A tela de vitória mostra
 * um resumo (renderDiarySummary). Só leitura: nada de timer de ausência nem recompensa por voltar.
 */
mixin(UIManager, {
    setupDiaryPanel() {
        document.getElementById('btn-diary')?.addEventListener('click', () => this.openDiaryPanel());
        document.getElementById('btn-diary-back')?.addEventListener('click', () => this.closeDiaryPanel());
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isDiaryPanelOpen()) {
                event.preventDefault();
                this.closeDiaryPanel();
            }
        });
    },

    isDiaryPanelOpen() {
        const panel = document.getElementById('diary-panel');
        return !!panel && !panel.hidden;
    },

    openDiaryPanel() {
        const panel = document.getElementById('diary-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel) return;
        this.gameManager.cityDiary?.check?.(this.gameManager); // o que aconteceu nos últimos segundos também entra
        if (playerPanel) playerPanel.hidden = true;
        panel.hidden = false;
        this.renderDiaryPanel();
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_panel_open');
        document.getElementById('btn-diary-back')?.focus();
    },

    closeDiaryPanel({ focus = true } = {}) {
        const panel = document.getElementById('diary-panel');
        const playerPanel = this.elements.pauseOverlay?.querySelector('.player-panel');
        if (!panel || panel.hidden) return;
        panel.hidden = true;
        if (playerPanel) playerPanel.hidden = false;
        if (focus) document.getElementById('btn-diary')?.focus();
    },

    /** Texto de uma entrada (escapado; {nome} das missões vira o apelido, já escapado por personalize). */
    diaryEntryHtml(e) {
        const esc = typeof escapeHtml === 'function' ? escapeHtml : s => String(s);
        const text = PlayerProfile.personalize(esc(e.text));
        const stars = e.kind === 'mission' && e.stars
            ? ` <span class="diary-stars" aria-label="${e.stars} de 3 estrelas">${'★'.repeat(e.stars)}${'☆'.repeat(3 - e.stars)}</span>` : '';
        let detail = '';
        if (e.kind === 'event' && e.choice) {
            const verdict = e.good === true ? '<span class="diary-good">✓ boa escolha</span>'
                : e.good === false ? '<span class="diary-bad">! escolha arriscada</span>' : '';
            detail = `<small class="diary-detail">Decisão com o Paulo: ${esc(e.choice)} ${verdict}${e.good === false && e.why ? ` — ${esc(e.why)}` : ''}</small>`;
        }
        const badge = e.threatened ? ' <span class="diary-threat">ameaçada</span>' : '';
        return `<span class="diary-icon" aria-hidden="true">${uiIcon(e.icon || '•')}</span>
            <div class="diary-text"><span>${text}${badge}${stars}</span>${detail}</div>`;
    },

    renderDiaryPanel() {
        const list = document.getElementById('diary-list');
        const count = document.getElementById('diary-count');
        const diary = this.gameManager.cityDiary;
        if (!list || !diary) return;
        this.renderDiaryAlbum();
        const entries = diary.entries;
        if (count) count.textContent = `${entries.length} ${entries.length === 1 ? 'marco' : 'marcos'}`;
        if (!entries.length) {
            list.innerHTML = '<li class="diary-empty">Ainda não há marcos. A primeira obra pronta, a primeira missão e o primeiro bicho no caderno entram aqui.</li>';
            return;
        }
        // agrupado por dia, do começo para hoje
        let lastDay = null;
        list.innerHTML = entries.map(e => {
            const head = e.day !== lastDay ? `<li class="diary-day"><b>Dia ${e.day}</b></li>` : '';
            lastDay = e.day;
            return `${head}<li class="diary-entry diary-${e.kind}" data-kind="${e.kind}">${this.diaryEntryHtml(e)}</li>`;
        }).join('');
        list.lastElementChild?.scrollIntoView?.({ block: 'nearest' });
    },

    /**
     * Álbum "Como a cidade mudou" (js/systems/CityMoments.js): a foto do começo e a mais nova lado a lado ("Antes" e
     * "Agora") e a fila de todas, do mesmo ângulo. Fotos são data URLs do próprio jogo; textos escapados.
     */
    renderDiaryAlbum() {
        const section = document.getElementById('diary-album');
        const compare = document.getElementById('diary-album-compare');
        const strip = document.getElementById('diary-album-strip');
        if (!section || !compare || !strip) return;
        const album = this.gameManager.cityMoments?.getAlbum?.() || [];
        section.hidden = album.length === 0;
        if (!album.length) return;
        const esc = typeof escapeHtml === 'function' ? escapeHtml : s => String(s);
        const safeImg = p => (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.img) ? p.img : '');
        const caption = p => `${p.key === 'start' ? 'O começo' : esc(p.title || 'Missão cumprida')} · dia ${Number(p.day) || 1}`;
        const figure = (p, label) => `<figure class="diary-photo${label ? ' diary-photo--big' : ''}">
                <img src="${safeImg(p)}" alt="A cidade: ${caption(p)}" width="400" height="225" loading="lazy" draggable="false">
                <figcaption>${label ? `<b>${label}</b> ` : ''}${caption(p)}</figcaption>
            </figure>`;
        const first = album[0], last = album[album.length - 1];
        compare.innerHTML = album.length > 1 ? figure(first, 'Antes') + figure(last, 'Agora') : figure(first, 'Antes');
        strip.innerHTML = album.length > 2 ? album.map(p => `<li>${figure(p)}</li>`).join('') : '';
        strip.hidden = album.length <= 2;
    },

    /** Resumo do diário para a tela de vitória (no máximo 8 marcos). '' sem diário. */
    renderDiarySummary(max = 8) {
        const diary = this.gameManager.cityDiary;
        if (!diary?.entries?.length) return '';
        const items = diary.highlights(max).map(e =>
            `<li class="diary-entry diary-${e.kind}" data-kind="${e.kind}"><span class="diary-day-pill">Dia ${e.day}</span>${this.diaryEntryHtml(e)}</li>`).join('');
        return `<div class="diary-summary" id="victory-diary">
            <p><strong>📔 Diário da cidade</strong> <small>(${diary.entries.length} ${diary.entries.length === 1 ? 'marco' : 'marcos'}; todos na pausa → Diário da cidade)</small></p>
            <ol class="diary-list diary-list--mini">${items}</ol>
        </div>`;
    }
});
