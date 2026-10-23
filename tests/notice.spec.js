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
    await expect(notice).toContainText('11 a 14 anos');
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

test('"Recusar" leva à página inicial do Google', async ({ page }) => {
    await mockExternalApis(page);
    await page.route('https://www.google.com.br/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Google</title>' }));
    await page.goto('/index.html?aviso&nointro');
    await page.click('#btn-notice-decline');
    await page.waitForURL('https://www.google.com.br/');
});
