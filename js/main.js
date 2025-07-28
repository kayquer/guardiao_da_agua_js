/**
 * GUARDIÃO DA ÁGUA - ARQUIVO PRINCIPAL
 * Jogo educacional de simulação e gerenciamento de recursos hídricos
 * 
 * @author Desenvolvedor Especialista em Jogos Educacionais
 * @version 1.0.0
 */

// ===== CONFIGURAÇÕES GLOBAIS =====
const GAME_CONFIG = {
    // Configurações do Canvas
    canvas: {
        width: window.innerWidth,
        height: window.innerHeight,
        antialias: true,
        preserveDrawingBuffer: false
    },
    
    // Configurações do Grid
    grid: {
        size: 40,        // Aumentado de 20 para 40 (4x mais área)
        cellSize: 2,
        height: 0.1
    },
    
    // Configurações de Performance
    performance: {
        targetFPS: 60,
        maxObjects: 400,
        cullingDistance: 50
    },
    
    // Configurações de Recursos
    resources: {
        initialWater: 1000,
        initialBudget: 30000,        // Reduzido de 50000 para 30000 para maior desafio
        initialPopulation: 75,       // Reduzido de 500 para 75 para progressão mais realista
        initialSatisfaction: 50,     // Reduzido de 85 para 50 para estado neutro inicial
        initialPollution: 15         // Mantido em 15% (já está na faixa ideal 10-20%)
    },
    
    // Configurações de Gameplay
    gameplay: {
        timeScale: 1,
        autoSaveInterval: 30000, // 30 segundos
        eventFrequency: 60000 // 1 minuto
    }
};

// ===== VARIÁVEIS GLOBAIS =====
let gameManager = null;
let settingsManager = null;
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
    console.log('🎮 Guardião da Água - Iniciando...');

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
    console.log('🔍 Validando dependências críticas...');

    const criticalDependencies = [
        { name: 'Babylon.js', check: () => typeof BABYLON !== 'undefined' },
        { name: 'GAME_CONFIG', check: () => typeof GAME_CONFIG !== 'undefined' }
    ];

    for (const dep of criticalDependencies) {
        if (!dep.check()) {
            console.error(`❌ Dependência crítica não encontrada: ${dep.name}`);
            return false;
        }
        console.log(`✅ ${dep.name} carregado`);
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
    
    console.log('✅ Navegador suportado');
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
    document.getElementById('btn-new-game').addEventListener('click', startNewGame);
    document.getElementById('btn-continue').addEventListener('click', continueGame);
    document.getElementById('btn-tutorial').addEventListener('click', startTutorial);
    document.getElementById('btn-settings').addEventListener('click', showSettings);
    document.getElementById('btn-about').addEventListener('click', showAbout);
    
    // Verificar se há save game
    if (SaveSystem.hasSaveData()) {
        document.getElementById('btn-continue').disabled = false;
    }
}

// ===== INICIALIZAÇÃO DOS SISTEMAS DE JOGO =====
function initializeGameSystems() {
    // Sistemas serão inicializados quando o jogo começar
    console.log('🔧 Sistemas de jogo preparados');
}

// ===== CARREGAMENTO =====
async function startLoading() {
    try {
        updateLoadingProgress(10);

        // Carregar assets
        console.log('📦 Carregando assets...');
        await AssetLoader.loadAssets(updateLoadingProgress);
        updateLoadingProgress(40);

        // Inicializar áudio
        console.log('🔊 Inicializando sistema de áudio...');
        AudioManager.getInstance();
        updateLoadingProgress(50);

        // Inicializar Babylon.js
        console.log('🎨 Inicializando renderização 3D...');
        await initializeBabylon();
        updateLoadingProgress(70);

        // Preparar sistemas
        console.log('⚙️ Preparando sistemas...');
        await prepareGameSystems();
        updateLoadingProgress(90);

        // Finalizar
        console.log('✅ Carregamento concluído');
        updateLoadingProgress(100);

        setTimeout(() => {
            showScreen('main-menu');
        }, 1000);

    } catch (error) {
        console.error('❌ Erro no carregamento:', error);
        showLoadingError(error);
    }
}

async function initializeBabylon() {
    // Babylon.js será inicializado quando necessário
    return new Promise(resolve => {
        setTimeout(resolve, 500); // Simular carregamento
    });
}

async function prepareGameSystems() {
    // Preparar sistemas sem inicializar completamente
    return new Promise(resolve => {
        setTimeout(resolve, 300); // Simular preparação
    });
}

// ===== CONTROLE DE TELAS =====
function showScreen(screenId) {
    // Ocultar todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar tela solicitada
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
        console.log(`📺 Tela ativa: ${screenId}`);
    }
}

// ===== AÇÕES DO MENU =====
async function startNewGame() {
    console.log('🎮 Iniciando novo jogo...');

    try {
        // Mostrar tela de loading temporariamente
        showScreen('loading-screen');
        updateLoadingProgress(0);

        // Validar dependências críticas antes de prosseguir
        console.log('🔍 Validando dependências...');
        if (typeof GameManager === 'undefined') {
            throw new Error('GameManager class não está disponível. Verifique se todos os scripts foram carregados.');
        }
        updateLoadingProgress(10);

        // Inicializar GameManager
        console.log('🔧 Criando GameManager...');
        gameManager = new GameManager();

        if (!gameManager) {
            throw new Error('Falha ao criar instância do GameManager');
        }
        updateLoadingProgress(30);

        // Aguardar inicialização dos sistemas
        console.log('⏳ Aguardando inicialização dos sistemas...');
        await gameManager.initializeSystems();

        // Verificar se a inicialização foi bem-sucedida
        if (!gameManager.initialized) {
            throw new Error('GameManager não foi inicializado corretamente');
        }
        updateLoadingProgress(70);

        // Iniciar novo jogo
        console.log('🚀 Iniciando novo jogo...');
        const success = gameManager.startNewGame();
        updateLoadingProgress(100);

        if (success) {
            showScreen('game-screen');
            isGameInitialized = true;

            // Tornar gameManager disponível globalmente para testes
            window.gameManager = gameManager;

            console.log('✅ Jogo iniciado com sucesso');
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

async function continueGame() {
    console.log('📁 Continuando jogo salvo...');

    try {
        // Carregar save
        const saveData = SaveSystem.loadGame();
        if (saveData) {
            // Mostrar tela de loading
            showScreen('loading-screen');
            updateLoadingProgress(0);

            // Inicializar GameManager
            gameManager = new GameManager();
            updateLoadingProgress(30);

            // Aguardar inicialização dos sistemas
            await gameManager.initializeSystems();
            updateLoadingProgress(70);

            // Carregar jogo salvo
            gameManager.loadGame(saveData);
            updateLoadingProgress(100);

            showScreen('game-screen');
            isGameInitialized = true;

            // Tornar gameManager disponível globalmente para testes
            window.gameManager = gameManager;

            console.log('✅ Jogo carregado com sucesso');
        } else {
            alert('Nenhum jogo salvo encontrado!');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar jogo:', error);
        alert('Erro ao carregar o jogo: ' + error.message);
        showScreen('main-menu');
    }
}

function startTutorial() {
    console.log('📚 Iniciando tutorial...');

    // Verificar se TutorialManager está disponível
    if (typeof TutorialManager !== 'undefined') {
        try {
            const tutorialManager = new TutorialManager(null);
            tutorialManager.startTutorial();
            showScreen('tutorial-screen');
        } catch (error) {
            console.error('❌ Erro ao inicializar tutorial:', error);
            alert('Erro ao carregar o tutorial: ' + error.message);
        }
    } else {
        console.error('❌ TutorialManager não carregado');
        alert('Sistema de tutorial não disponível. Verifique se todos os scripts foram carregados.');
    }
}

function showSettings() {
    console.log('⚙️ Abrindo configurações...');

    // Inicializar SettingsManager se não existir
    if (!settingsManager) {
        settingsManager = new SettingsManager();
    }

    settingsManager.showSettings();
    showScreen('settings-screen');
}

function showAbout() {
    console.log('ℹ️ Mostrando sobre...');
    alert(`
🎮 Guardião da Água v1.0.0

Jogo educacional de simulação e gerenciamento de recursos hídricos.

Desenvolvido para ensinar sobre:
• Conservação da água
• Gestão sustentável
• Responsabilidade ambiental
• Planejamento urbano

Tecnologias utilizadas:
• HTML5 Canvas
• Babylon.js
• JavaScript ES6+
• CSS3

© 2024 - Projeto Educacional
    `);
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
    console.error('❌ Erro global:', e.error);

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

// ===== EXPORT PARA DEBUG =====
if (typeof window !== 'undefined') {
    window.GAME_DEBUG = {
        config: GAME_CONFIG,
        gameManager: () => gameManager,
        showScreen,
        currentScreen: () => currentScreen
    };
}

console.log('🎮 Guardião da Água - Sistema principal carregado');
