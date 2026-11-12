const { test, expect } = require('@playwright/test');
const { mockExternalApis } = require('./helpers');

// Aviso inicial (js/ui/StartNotice.js). Nos outros testes ele não aparece (navigator.webdriver);
// aqui ?aviso força: é a primeira tela, o menu e a abertura esperam o "Aceitar", "Recusar" vai ao Google.

test('aviso aparece primeiro, segura menu e abertura até "Aceitar" e volta a cada abertura', async ({ page }) => {
    await mockExternalApis(page);
    await page.goto('/index.html?aviso&intro');

    const notice = page.locator('#start-notice');
    await expect(notice).toBeVisible();
    await expect(notice.locator('.start-notice__logo')).toBeVisible();
    expect(await notice.locator('.start-notice__logo').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(notice).toContainText('Cláudia Dias Roxinol');
    await expect(notice).toContainText('Cerca de 11 anos');
    await expect(notice).toContainText('professor ou de um adulto responsável');

    // Carregou tudo por trás, mas nada de menu nem abertura enquanto o aviso está na tela
    await page.waitForFunction(() => MenuIntro.state === 'ready', null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => ({ state: MenuIntro.state, menu: document.getElementById('main-menu').classList.contains('active') })))
        .toEqual({ state: 'ready', menu: false });

    await page.click('#btn-notice-accept');
    await expect(notice).toHaveCount(0);
    await page.waitForFunction(() => document.body.classList.contains('intro-playing'), null, { timeout: 30000 });

    // Sempre no início: recarregar (voltar ao menu recarrega a página) mostra o aviso de novo
    await page.goto('/index.html?aviso&nointro');
    await expect(page.locator('#start-notice')).toBeVisible();
});

test('no celular o aviso recomenda computador com teclado e mouse; no computador, não', async ({ page }, testInfo) => {
    await mockExternalApis(page);
    await page.goto('/index.html?aviso&nointro');
    const note = page.locator('#start-notice-mobile');
    if (testInfo.project.name === 'mobile') {
        await expect(note).toBeVisible();
        await expect(note).toContainText('computador com teclado e mouse');
    } else {
        await expect(note).toBeHidden();
    }
});

/**
 * Troca RESEARCH_SYNC.ENDPOINT/FORM_URL na resposta do GameConstants.js: o teste vale para qualquer versão
 * (main tem a planilha; evolucao-pesquisa começa com a coleta desligada).
 */
async function withResearchConfig(page, { endpoint, form }) {
    await page.route('**/js/config/GameConstants.js*', async route => {
        const body = (await (await route.fetch()).text())
            .replace(/ENDPOINT: '[^']*'/, `ENDPOINT: '${endpoint}'`)
            .replace(/FORM_URL: '[^']*'/, `FORM_URL: '${form}'`);
        await route.fulfill({ contentType: 'application/javascript', body });
    });
}

test('sem servidor da pesquisa: o aviso não tem a caixa de envio', async ({ page }) => {
    await mockExternalApis(page);
    await withResearchConfig(page, { endpoint: '', form: '' });
    await page.goto('/index.html?aviso&nointro');
    await expect(page.locator('#start-notice')).toBeVisible();
    await expect(page.locator('.start-notice__consent')).toHaveCount(0);
    await page.click('#btn-notice-accept');
    await expect(page.locator('#start-notice')).toHaveCount(0);
    expect(await page.evaluate(() => ({ configured: ResearchSync.isConfigured(), saved: localStorage.getItem(ResearchSync.CONSENT_KEY) })))
        .toEqual({ configured: false, saved: null });
});

test('caixa do envio anônimo: marcada por padrão, a escolha vale ao aceitar e é lembrada', async ({ page }) => {
    await mockExternalApis(page);
    await withResearchConfig(page, { endpoint: 'https://script.google.com/macros/s/teste/exec', form: 'https://docs.google.com/forms/teste' });
    await page.goto('/index.html?aviso&nointro');
    const box = page.locator('#notice-research-consent');
    await expect(box).toBeChecked();
    await expect(page.locator('.start-notice__consent')).toContainText('nunca o apelido');

    await box.uncheck();
    await page.click('#btn-notice-accept');
    await expect(page.locator('#start-notice')).toHaveCount(0);
    expect(await page.evaluate(() => ({ saved: localStorage.getItem(ResearchSync.CONSENT_KEY), consent: ResearchSync.hasConsent() })))
        .toEqual({ saved: 'no', consent: false });

    await page.goto('/index.html?aviso&nointro');
    await expect(page.locator('#notice-research-consent')).not.toBeChecked();
    await page.locator('#notice-research-consent').check();
    await page.click('#btn-notice-accept');
    await expect(page.locator('#start-notice')).toHaveCount(0);
    expect(await page.evaluate(() => ResearchSync.hasConsent())).toBe(true);
});

test('"Recusar" leva à página inicial do Google', async ({ page }) => {
    await mockExternalApis(page);
    await page.route('https://www.google.com.br/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Google</title>' }));
    await page.goto('/index.html?aviso&nointro');
    await page.click('#btn-notice-decline');
    await page.waitForURL('https://www.google.com.br/');
});
