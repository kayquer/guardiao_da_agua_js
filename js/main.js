/**
 * GUARDIÃO DA ÁGUA - ARQUIVO PRINCIPAL
 * Jogo educacional de simulação e gerenciamento de recursos hídricos
 * 
 * @author Desenvolvedor Especialista em Jogos Educacionais
 * @version 1.0.0
 */

// ===== VARIÁVEIS GLOBAIS =====
let gameManager = null;
let isGameInitialized = false;
let currentScreen = 'loading';

// ===== DICAS DE CARREGAMENTO =====
const LOADING_TIPS = [
    "💧 A água é um recurso finito e precioso!",
    "🌱 Plantas ajudam a filtrar a água naturalmente",
    "🏭 Estações de tratamento reduzem a poluição",
    "💰 Gerencie bem seu orçamento municipal",
    "👥 População feliz = cidade próspera",
    "🌧️ Aproveite a água da chuva com sistemas de captação",
    "🔄 Recicle e reutilize a água sempre que possível",
    "📊 Monitore constantemente os níveis de poluição",
    "🎯 Complete missões para desbloquear novas tecnologias",
    "⚡ Eventos aleatórios testam suas habilidades de gestão"
];

// ===== INICIALIZAÇÃO COM TRATAMENTO DE ERRO =====
document.addEventListener('DOMContentLoaded', function() {
    log('🎮 Guardião da Água - Iniciando...');

    try {
        // Verificar suporte do navegador
        if (!checkBrowserSupport()) {
            showBrowserError();
            return;
        }

        // Verificar dependências críticas
        if (!validateCriticalDependencies()) {
            showDependencyError();
            return;
        }

        // Inicializar sistemas com tratamento de erro
        initializeLoadingScreen();
        initializeMenuSystem();
        initializeGameSystems();

        // Começar carregamento
        startLoading();

    } catch (error) {
        console.error('❌ Erro crítico na inicialização:', error);
        showCriticalError(error);
    }
});

// ===== VALIDAÇÃO DE DEPENDÊNCIAS CRÍTICAS =====
function validateCriticalDependencies() {
    log('🔍 Validando dependências críticas...');

    const criticalDependencies = [
        { name: 'Babylon.js', check: () => typeof BABYLON !== 'undefined' },
        { name: 'GAME_CONFIG', check: () => typeof GAME_CONFIG !== 'undefined' }
    ];

    for (const dep of criticalDependencies) {
        if (!dep.check()) {
            console.error(`❌ Dependência crítica não encontrada: ${dep.name}`);
            return false;
        }
        log(`✅ ${dep.name} carregado`);
    }

    return true;
}

// ===== VERIFICAÇÃO DE SUPORTE =====
function checkBrowserSupport() {
    // Verificar WebGL
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.error('❌ WebGL não suportado');
        return false;
    }
    
    // Verificar localStorage
    if (!window.localStorage) {
        console.error('❌ localStorage não suportado');
        return false;
    }
    
    // Verificar APIs necessárias
    if (!window.requestAnimationFrame) {
        console.error('❌ requestAnimationFrame não suportado');
        return false;
    }
    
    log('✅ Navegador suportado');
    return true;
}

// ===== TELA DE LOADING =====
function initializeLoadingScreen() {
    const loadingTip = document.getElementById('loading-tip');
    
    // Rotacionar dicas
    let tipIndex = 0;
    setInterval(() => {
        tipIndex = (tipIndex + 1) % LOADING_TIPS.length;
        loadingTip.textContent = LOADING_TIPS[tipIndex];
        loadingTip.style.animation = 'none';
        setTimeout(() => {
            loadingTip.style.animation = 'fadeIn 0.5s ease';
        }, 10);
    }, 3000);
}

function updateLoadingProgress(percentage) {
    const progressBar = document.getElementById('loading-progress');
    progressBar.style.width = percentage + '%';
}

// ===== SISTEMA DE MENUS =====
function initializeMenuSystem() {
    // Botões do menu principal
    document.getElementById('btn-new-game').addEventListener('click', showProfileForm);
    document.getElementById('btn-about').addEventListener('click', showAbout);
    document.getElementById('btn-start').addEventListener('click', onStartClick);
    initializeProfileScreen();
    initializeGraphicsPickers();
}

// ===== QUALIDADE GRÁFICA (GraphicsQuality) =====
// Seletor Baixa/Média/Alta no menu principal e na pausa ([data-gfx-picker]); a escolha fica salva no navegador
// e o jogo aplica na hora (GameManager.applyGraphicsQuality). Sem escolha, mostra a detectada para o aparelho.
function initializeGraphicsPickers() {
    const pickers = document.querySelectorAll('[data-gfx-picker]');
    const render = () => {
        const level = GraphicsQuality.current();
        let hint = GraphicsQuality.HINTS[level];
        if (GraphicsQuality.isAuto()) hint += ' Escolhida pelo jogo para este aparelho.';
        if (gameManager?.engine && GraphicsQuality.needsRestart(level, gameManager.engineAntialias)) {
            hint += ' A suavização das bordas muda quando você abrir o jogo de novo.';
        }
        pickers.forEach(picker => {
            picker.querySelectorAll('[data-quality]').forEach(button => {
                const on = button.dataset.quality === level;
                button.classList.toggle('active', on);
                button.setAttribute('aria-checked', String(on));
            });
            picker.querySelector('.gfx-hint').textContent = hint;
        });
    };
    pickers.forEach(picker => picker.addEventListener('click', event => {
        const button = event.target.closest('[data-quality]');
        if (!button || button.dataset.quality === GraphicsQuality.current() && !GraphicsQuality.isAuto()) return;
        GraphicsQuality.set(button.dataset.quality);
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_click', 0.6);
    }));
    GraphicsQuality.onChange(render);
    render();
}

// ===== PERFIS DE JOGADOR (PlayerProfile) =====
const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// Jogos salvos por perfil (SaveSystem): a tela inicial usa a sua própria instância, sem GameManager
let menuSaveSystem = null;
const menuSaves = () => (menuSaveSystem = menuSaveSystem || new SaveSystem());

function formatSavedAt(timestamp) {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderProfileList() {
    const section = document.getElementById('profile-section');
    const list = document.getElementById('profile-list');
    const profiles = PlayerProfile.list();
    section.hidden = profiles.length === 0;
    list.innerHTML = profiles.map(p => {
        const save = menuSaves().getSaveInfo(p.id);
        const saveBadge = save?.ok
            ? `<span class="profile-save" title="Jogo salvo em ${formatSavedAt(save.savedAt)}">${uiIcon('ui-save')} jogo salvo · ${save.summary.buildingCount} ${save.summary.buildingCount === 1 ? 'construção' : 'construções'}</span>`
            : '';
        return `<div class="profile-card" role="button" tabindex="0" data-profile-id="${p.id}" title="Jogar como ${escapeHtml(p.name)}">
            <span class="profile-avatar">${escapeHtml(p.name.charAt(0).toUpperCase())}</span>
            <span class="profile-info">
                <span class="profile-name">${escapeHtml(p.name)}</span>
                <span class="profile-meta">${p.age} anos · ${escapeHtml(p.city)}/${p.uf}</span>
                ${saveBadge}
            </span>
            <span class="profile-play">▶</span>
            <button class="profile-delete" data-delete-id="${p.id}" title="Apagar perfil" aria-label="Apagar perfil de ${escapeHtml(p.name)}">✕</button>
        </div>`;
    }).join('');
}

async function onProfileListClick(event) {
    const deleteBtn = event.target.closest('[data-delete-id]');
    if (deleteBtn) {
        event.stopPropagation();
        const profile = PlayerProfile.get(deleteBtn.dataset.deleteId);
        const savedNote = menuSaves().hasSave(deleteBtn.dataset.deleteId) ? ', junto com o jogo salvo,' : '';
        const ok = await gameConfirm('Apagar perfil?', `O perfil de ${profile?.name || 'jogador'}${savedNote} será apagado deste computador.`, { confirmText: 'Apagar', icon: 'warning' });
        if (ok) {
            PlayerProfile.remove(deleteBtn.dataset.deleteId);
            menuSaves().deleteSave(deleteBtn.dataset.deleteId);
            renderProfileList();
        }
        return;
    }
    const card = event.target.closest('[data-profile-id]');
    if (!card || profileChoiceOpen) return;
    profileChoiceOpen = true;
    try {
        await chooseGameForProfile(card.dataset.profileId);
    } finally {
        profileChoiceOpen = false;
    }
}

let profileChoiceOpen = false;

/** "Começar" (o "Getting Started" do menu): joga com o perfil ativo/último; sem perfil, abre o cadastro. */
async function onStartClick() {
    const profile = MenuIntro.startProfile();
    if (!profile) return showProfileForm();
    if (profileChoiceOpen) return;
    profileChoiceOpen = true;
    try {
        await chooseGameForProfile(profile.id);
    } finally {
        profileChoiceOpen = false;
    }
}

/**
 * Perfil sem jogo salvo: começa um jogo novo. Com jogo salvo: "Continuar" carrega e "Novo jogo" apaga o save
 * (depois de confirmar). Save danificado ou de versão antiga: avisa, apaga e começa um novo.
 */
async function chooseGameForProfile(profileId) {
    const profile = PlayerProfile.activate(profileId);
    if (!profile) return;
    const saves = menuSaves();
    const info = saves.getSaveInfo(profileId);
    if (!info) return startNewGame();

    const name = escapeHtml(profile.name);
    if (!info.ok) {
        await gameAlert('Jogo salvo com problema', `${SaveSystem.reasonText(info.reason)} Vamos começar um jogo novo para ${profile.name}.`, 'warning');
        saves.deleteSave(profileId);
        return startNewGame();
    }

    // Água quase no fim ou poluição quase no máximo: continuar acabaria o jogo em segundos
    const saved = saves.load(profileId);
    if (saved.ok && SaveSystem.isLostGame(saved.data)) {
        await gameAlert('Essa cidade não tem mais volta',
            `A última partida de ${name} parou com a água quase acabando ou a poluição quase no máximo. ` +
            'Se continuasse, o jogo terminaria logo em seguida. Vamos começar um jogo novo, e desta vez você já sabe o que evitar!',
            'warning');
        saves.deleteSave(profileId);
        return startNewGame();
    }

    const summary = info.summary;
    const day = summary.gameClockTime ? new Date(summary.gameClockTime).toLocaleDateString('pt-BR') : '';
    const choice = await gameChoice(`Olá de novo, ${name}!`, // o título do SweetAlert também é HTML
        `<p>Você tem um jogo salvo em <b>${formatSavedAt(info.savedAt)}</b>.</p>
        <p class="save-summary">${uiIcon('ui-build')} ${summary.buildingCount} ${summary.buildingCount === 1 ? 'construção' : 'construções'} · ${uiIcon('res-population')} ${summary.population} habitantes · ${uiIcon('ui-target')} ${summary.completedQuests} ${summary.completedQuests === 1 ? 'missão concluída' : 'missões concluídas'}${day ? ` · 📅 ${day}` : ''}</p>
        <p>Quer continuar de onde parou, ${name}?</p>`,
        { confirmText: '▶ Continuar', denyText: '🆕 Novo jogo', icon: 'question' });
    if (choice === 'confirm') {
        const result = saves.load(profileId);
        if (!result.ok) {
            await gameAlert('Jogo salvo com problema', `${SaveSystem.reasonText(result.reason)} Vamos começar um jogo novo.`, 'warning');
            saves.deleteSave(profileId);
            return startNewGame();
        }
        return startNewGame({ saveData: result.data });
    }
    if (choice === 'deny') {
        const sure = await gameConfirm('Começar um jogo novo?',
            `O jogo salvo de ${profile.name} será apagado e não dá para desfazer.`,
            { confirmText: 'Apagar e começar do zero', cancelText: 'Voltar', icon: 'warning' });
        if (!sure) return;
        saves.deleteSave(profileId);
        return startNewGame();
    }
}

function initializeProfileScreen() {
    const list = document.getElementById('profile-list');
    list.addEventListener('click', onProfileListClick);
    list.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') onProfileListClick(event);
    });

    const ufSelect = document.getElementById('profile-uf');
    ufSelect.innerHTML += Object.entries(BRAZIL_STATES)
        .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
        .map(([uf, nome]) => `<option value="${uf}">${nome}</option>`).join('');
    ufSelect.addEventListener('change', () => loadCitiesFor(ufSelect.value));

    document.getElementById('profile-form').addEventListener('submit', submitProfileForm);
    document.getElementById('btn-profile-back').addEventListener('click', () => showScreen('main-menu'));
}

let profileCities = null; // municípios do estado escolhido (null = API indisponível → texto livre)

async function loadCitiesFor(uf) {
    const input = document.getElementById('profile-city');
    const options = document.getElementById('profile-city-options');
    const hint = document.getElementById('profile-city-hint');
    input.value = '';
    options.innerHTML = '';
    profileCities = null;
    if (!uf) {
        input.disabled = true;
        input.placeholder = 'Escolha o estado primeiro';
        hint.textContent = '';
        return;
    }
    input.disabled = true;
    input.placeholder = 'Carregando cidades...';
    try {
        const cities = await PlayerProfile.fetchCities(uf);
        if (document.getElementById('profile-uf').value !== uf) return; // trocou de estado no meio
        profileCities = cities;
        options.innerHTML = cities.map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
        input.placeholder = 'Comece a digitar e escolha na lista';
        hint.textContent = `${cities.length} cidades em ${BRAZIL_STATES[uf]}`;
    } catch (error) {
        console.warn('⚠️ Lista de cidades indisponível:', error.message);
        input.placeholder = 'Digite o nome da sua cidade';
        hint.textContent = 'Sem internet para a lista de cidades: digite o nome.';
    }
    input.disabled = false;
    input.focus();
}

function showProfileForm() {
    document.getElementById('profile-form').reset();
    document.getElementById('profile-errors').textContent = '';
    loadCitiesFor('');
    showScreen('profile-screen');
    document.getElementById('profile-name').focus();
}

async function submitProfileForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const errorsEl = document.getElementById('profile-errors');
    const data = {
        name: form.elements.name.value,
        age: form.elements.age.value,
        uf: form.elements.uf.value,
        city: form.elements.city.value.trim()
    };
    const errors = PlayerProfile.validate(data);
    // Com a lista do IBGE, a cidade precisa ser uma dela (garante que o clima ache o lugar certo)
    if (data.city && profileCities) {
        const normalize = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const match = profileCities.find(c => normalize(c) === normalize(data.city));
        if (match) data.city = match;
        else errors.push('Escolha a cidade na lista de sugestões.');
    }
    errorsEl.textContent = errors.join(' ');
    if (errors.length) return;

    const button = document.getElementById('btn-profile-start');
    button.disabled = true;
    errorsEl.textContent = 'Procurando sua cidade no mapa...';
    let coords = null;
    try {
        coords = await PlayerProfile.geocode(data.city, data.uf);
    } catch (error) {
        console.warn('⚠️ Não foi possível localizar a cidade (o clima fica indisponível):', error.message);
    }
    button.disabled = false;
    errorsEl.textContent = '';

    PlayerProfile.create({ ...data, lat: coords?.lat ?? null, lon: coords?.lon ?? null });
    startNewGame();
}

// ===== INICIALIZAÇÃO DOS SISTEMAS DE JOGO =====
function initializeGameSystems() {
    // Sistemas serão inicializados quando o jogo começar
    log('🔧 Sistemas de jogo preparados');
}

// ===== CARREGAMENTO =====
async function startLoading() {
    try {
        updateLoadingProgress(10);

        // Carregar assets
        log('📦 Carregando assets...');
        await AssetLoader.loadAssets(updateLoadingProgress);
        updateLoadingProgress(40);

        // Inicializar áudio
        log('🔊 Inicializando sistema de áudio...');
        AudioManager.getInstance();
        updateLoadingProgress(50);

        // Cidade da abertura (cena própria atrás do menu): monta enquanto a tela de carregamento aparece
        log('🎨 Montando a cidade da abertura...');
        await MenuIntro.prepare(p => updateLoadingProgress(50 + Math.round(p * 40)));
        updateLoadingProgress(90);

        // Finalizar
        log('✅ Carregamento concluído');
        updateLoadingProgress(100);

        setTimeout(() => {
            showScreen('main-menu');
        }, MenuIntro.cinematic ? 300 : 1000);

    } catch (error) {
        console.error('❌ Erro no carregamento:', error);
        showLoadingError(error);
    }
}

// ===== CONTROLE DE TELAS =====
function showScreen(screenId) {
    const previousScreen = currentScreen;
    // Ocultar todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar tela solicitada
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
        log(`📺 Tela ativa: ${screenId}`);
    }
    if (screenId === 'main-menu') {
        renderProfileList();
        // Abertura (1ª vez) ou só a entrada do logo — voltar do cadastro não repete nada (MenuIntro)
        MenuIntro.onMenuShown(previousScreen);
    }

    // Música por tela: menu/cadastro = tema do menu (a abertura toca a dela); partida = diretor de som
    // (js/utils/audio/SoundDirector.js: dia/noite, chuva, alerta, cidade prosperando)
    if (typeof AudioManager !== 'undefined') AudioManager.onScreen(screenId);
}

// ===== AÇÕES DO MENU =====
// saveData (de SaveSystem.load): continua o jogo salvo em vez de começar um novo (sem tutorial)
async function startNewGame({ saveData = null } = {}) {
    log(saveData ? '📁 Continuando jogo salvo...' : '🎮 Iniciando novo jogo...');

    try {
        // A cidade da abertura sai antes do jogo montar a dele (libera a GPU e o loop de render)
        MenuIntro.dispose();
        // Mostrar tela de loading temporariamente
        showScreen('loading-screen');
        updateLoadingProgress(0);

        // Validar dependências críticas antes de prosseguir
        log('🔍 Validando dependências...');
        if (typeof GameManager === 'undefined') {
            throw new Error('GameManager class não está disponível. Verifique se todos os scripts foram carregados.');
        }
        updateLoadingProgress(10);

        // Inicializar GameManager
        log('🔧 Criando GameManager...');
        gameManager = new GameManager();

        if (!gameManager) {
            throw new Error('Falha ao criar instância do GameManager');
        }
        updateLoadingProgress(30);

        // Aguardar inicialização dos sistemas
        log('⏳ Aguardando inicialização dos sistemas...');
        await gameManager.initializeSystems();

        // Verificar se a inicialização foi bem-sucedida
        if (!gameManager.initialized) {
            throw new Error('GameManager não foi inicializado corretamente');
        }
        updateLoadingProgress(70);

        // Global antes de montar o jogo: partes do BuildingSystem leem window.gameManager (ex.: ao recriar prédios)
        window.gameManager = gameManager;
        // ===== FIX: Expose uiManager globally for HTML onclick handlers =====
        window.uiManager = gameManager.uiManager;

        // Iniciar novo jogo ou continuar o salvo
        const success = saveData ? gameManager.loadGame(saveData) : gameManager.startNewGame();
        updateLoadingProgress(100);

        if (success) {
            showScreen('game-screen');
            // O engine nasceu com o canvas escondido: só agora o tamanho real (e a escala da qualidade gráfica) vale
            gameManager.handleResize();
            armBackGuard();
            isGameInitialized = true;

            log('✅ Jogo iniciado com sucesso');
        } else {
            console.error('❌ Falha ao iniciar novo jogo');
            showLoadingError('Falha ao iniciar o jogo. Verifique se todos os sistemas foram inicializados corretamente.');
            showScreen('main-menu');
        }

    } catch (error) {
        console.error('❌ Erro ao inicializar jogo:', error);

        // Mostrar erro específico baseado no tipo
        if (error.message.includes('não está disponível') || error.message.includes('not defined')) {
            showCriticalError(error);
        } else {
            showLoadingError(error);
            showScreen('main-menu');
        }
    }
}

// Tutorial and Settings functions removed - tutorial now auto-starts on first game

function showAbout() {
    log('ℹ️ Mostrando sobre...');
    gameDialog({
        title: '💧 Guardião da Água',
        html: `
            <p>Jogo educacional de simulação e gestão de recursos hídricos.</p>
            <p style="margin-top: 1rem;"><strong>Para aprender sobre:</strong><br>
            conservação da água · gestão sustentável ·<br>
            responsabilidade ambiental · planejamento urbano</p>
            <p style="margin-top: 1rem; font-size: 0.9rem;">Versão 1.0.0 · Feito com Babylon.js</p>
        `,
        confirmButtonText: 'Fechar'
    });
}

// ===== TRATAMENTO DE ERROS =====
function showBrowserError() {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #2c3e50; color: white; font-family: Arial, sans-serif; text-align: center; padding: 2rem;">
            <div>
                <h1>❌ Navegador Não Suportado</h1>
                <p>Este jogo requer um navegador moderno com suporte a WebGL.</p>
                <p>Por favor, atualize seu navegador ou use:</p>
                <ul style="list-style: none; padding: 0;">
                    <li>• Google Chrome (recomendado)</li>
                    <li>• Mozilla Firefox</li>
                    <li>• Microsoft Edge</li>
                    <li>• Safari (macOS/iOS)</li>
                </ul>
            </div>
        </div>
    `;
}

function showDependencyError() {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; font-family: Arial, sans-serif; text-align: center; padding: 2rem;">
            <div style="background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 10px; max-width: 600px;">
                <h1>❌ Erro de Dependências</h1>
                <p>Algumas dependências críticas não foram carregadas corretamente.</p>
                <p>Verifique sua conexão com a internet e recarregue a página.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;
                        background: #4CAF50; color: white; border: none; border-radius: 5px;
                        cursor: pointer; font-size: 16px;">🔄 Recarregar Página</button>
            </div>
        </div>
    `;
}

function showCriticalError(error) {
    const errorMessage = error ? (error.message || error.toString()) : 'Erro desconhecido';
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; font-family: Arial, sans-serif; text-align: center; padding: 2rem;">
            <div style="background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 10px; max-width: 700px;">
                <h1>❌ Erro Crítico</h1>
                <p>Ocorreu um erro crítico durante a inicialização do jogo:</p>
                <div style="background: rgba(255,0,0,0.2); padding: 15px; border-radius: 5px;
                            margin: 20px 0; font-family: monospace; text-align: left; word-break: break-word;">
                    ${errorMessage}
                </div>
                <p>Por favor, recarregue a página ou execute os testes para diagnóstico.</p>
                <div style="margin-top: 20px;">
                    <button onclick="location.reload()" style="padding: 10px 20px; margin: 5px;
                            background: #4CAF50; color: white; border: none; border-radius: 5px;
                            cursor: pointer; font-size: 16px;">🔄 Recarregar</button>
                    <button onclick="window.open('test-comprehensive.html', '_blank')"
                            style="padding: 10px 20px; margin: 5px; background: #2196F3;
                            color: white; border: none; border-radius: 5px; cursor: pointer;
                            font-size: 16px;">🧪 Executar Testes</button>
                </div>
            </div>
        </div>
    `;
}

function showLoadingError(error) {
    const loadingScreen = document.getElementById('loading-screen');

    // Verificar se error existe e tem message
    let errorMessage = 'Erro desconhecido';
    if (error) {
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error.message) {
            errorMessage = error.message;
        } else if (error.toString) {
            errorMessage = error.toString();
        }
    }

    loadingScreen.innerHTML = `
        <div class="loading-container">
            <div class="logo">
                <h1>❌ Erro no Carregamento</h1>
                <p>Ocorreu um erro ao carregar o jogo:</p>
                <p style="color: #e74c3c; font-family: monospace;">${errorMessage}</p>
            </div>
            <button onclick="location.reload()" style="
                padding: 1rem 2rem;
                font-size: 1.1rem;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 2rem;
            ">
                🔄 Tentar Novamente
            </button>
        </div>
    `;
}

// ===== EVENTOS GLOBAIS =====
window.addEventListener('resize', function() {
    if (isGameInitialized && gameManager) {
        gameManager.handleResize();
    }
});

window.addEventListener('beforeunload', function(e) {
    if (isGameInitialized && gameManager) {
        // Auto-save antes de sair
        gameManager.autoSave();
    }
});

// ===== TRATAMENTO DE ERROS GLOBAIS =====
window.addEventListener('error', function(e) {
    console.error('❌ Erro global:', e);

    // Only show loading error for critical errors during initialization
    // Prevent page reloads for minor errors during gameplay
    if (!isGameInitialized && e.error && e.error.message) {
        // Only trigger loading error for critical initialization failures
        const criticalErrors = [
            'BABYLON is not defined',
            'GAME_CONFIG is not defined',
            'Failed to initialize',
            'Critical dependency missing'
        ];

        const isCriticalError = criticalErrors.some(errorText =>
            e.error.message.includes(errorText)
        );

        if (isCriticalError) {
            showLoadingError(e.error);
        } else {
            console.warn('⚠️ Non-critical error during initialization:', e.error.message);
        }
    }
});

// ===== SAIR NO MEIO DA PARTIDA =====
// F5/Ctrl+R e o "voltar" do navegador perguntam no diálogo do jogo (com opção de salvar). Fechar a aba ou a
// janela só permite o aviso nativo do navegador (beforeunload: o texto é fixo e o Chrome não deixa trocar).
let leavingOnPurpose = false;

function isMidGame() {
    return currentScreen === 'game-screen' && !!gameManager && gameManager.gameState !== 'gameover';
}

async function confirmLeaveGame(title) {
    const canSave = gameManager.canSave();
    const text = canSave
        ? 'O jogo será salvo antes de sair: depois, escolha o seu perfil e "Continuar".'
        : 'O tutorial ainda não acabou, então este jogo não fica salvo.';
    const leave = await gameConfirm(title, text,
        { confirmText: canSave ? 'Salvar e sair' : 'Sair', cancelText: 'Continuar jogando', icon: 'warning' });
    if (leave) {
        gameManager.autoSave();
        leavingOnPurpose = true;
    }
    return leave;
}

/**
 * "Menu principal" (pausa) e "Voltar ao menu" (fim de jogo): salva e recarrega a página na tela inicial.
 * Recarregar em vez de só trocar de tela: o GameManager deixa listeners no document/window, timers e uma
 * engine no canvas; um segundo jogo na mesma página duplicaria tudo (e o botão salvar do jogo velho
 * gravaria por cima do novo).
 */
function leaveToMainMenu() {
    gameManager?.autoSave();
    leavingOnPurpose = true;
    location.reload();
}

window.addEventListener('beforeunload', event => {
    if (leavingOnPurpose || !isMidGame()) return;
    event.preventDefault();
    event.returnValue = ''; // navegadores antigos só mostram o aviso com returnValue
});

document.addEventListener('keydown', async event => {
    const reload = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');
    if (!reload || !isMidGame()) return;
    event.preventDefault();
    if (await confirmLeaveGame('Recarregar a página?')) location.reload();
});

// Voltar do navegador: uma entrada a mais no histórico (posta ao entrar no jogo) segura a página
function armBackGuard() {
    if (history.state?.guardiao !== 'jogo') history.pushState({ guardiao: 'jogo' }, '');
}

window.addEventListener('popstate', async () => {
    if (!isMidGame()) return;
    history.pushState({ guardiao: 'jogo' }, '');
    if (await confirmLeaveGame('Sair do jogo?')) history.go(-2);
});

// ===== EXPORT PARA DEBUG (só com ?debug) =====
if (DEBUG) {
    window.GAME_DEBUG = {
        config: GAME_CONFIG,
        gameManager: () => gameManager,
        showScreen,
        currentScreen: () => currentScreen
    }; 
}

log('🎮 Guardião da Água - Sistema principal carregado');
