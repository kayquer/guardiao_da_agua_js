/**
 * Enhanced Features Test Suite for Guardião da Água
 * Tests the newly implemented enhanced mission info panel and mobile responsive HUD design
 */

const { test, expect } = require('@playwright/test');

test.describe('Guardião da Água - Enhanced Features Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the game
        await page.goto('file:///C:/Users/kayqu/Downloads/guardiao_da_agua_js/index.html');
        
        // Wait for the game to load
        await page.waitForSelector('button:has-text("🎮 Novo Jogo")', { timeout: 30000 });
        
        // Start a new game
        await page.click('button:has-text("🎮 Novo Jogo")');
        
        // Wait for game initialization
        await page.waitForSelector('#game-canvas', { timeout: 30000 });
        await page.waitForTimeout(5000); // Additional wait for full initialization
    });

    test.describe('Enhanced Mission Info Panel Tests', () => {
        
        test('Mission info panel displays enhanced structure', async ({ page }) => {
            console.log('🧪 Testing enhanced mission info panel structure...');
            
            // Check for mission header with urgency indicator
            const missionHeader = page.locator('.mission-header');
            await expect(missionHeader).toBeVisible();
            
            const missionTitle = page.locator('h4:has-text("Missão Atual")');
            await expect(missionTitle).toBeVisible();
            
            const urgencyIndicator = page.locator('.mission-urgency');
            await expect(urgencyIndicator).toBeVisible();
            
            console.log('✅ Mission header structure test passed');
        });

        test('Mission objective display shows actionable text', async ({ page }) => {
            console.log('🧪 Testing actionable mission objective text...');
            
            // Check for enhanced objective display
            const objectiveDisplay = page.locator('.mission-objective-display');
            await expect(objectiveDisplay).toBeVisible();
            
            // Check for objective icon
            const objectiveIcon = page.locator('.objective-icon');
            await expect(objectiveIcon).toBeVisible();
            
            // Check for actionable text (should be specific, not generic)
            const objectiveTitle = page.locator('.objective-title');
            await expect(objectiveTitle).toBeVisible();
            
            const objectiveText = await objectiveTitle.textContent();
            expect(objectiveText).toContain('Construa'); // Should contain actionable text
            
            // Check for action guidance
            const objectiveAction = page.locator('.objective-action');
            await expect(objectiveAction).toBeVisible();
            
            const actionText = await objectiveAction.textContent();
            expect(actionText).toContain('painel'); // Should contain guidance
            
            console.log('✅ Actionable mission text test passed');
        });

        test('Mission objective display is clickable and functional', async ({ page }) => {
            console.log('🧪 Testing mission objective clickability...');
            
            // Find the clickable objective display
            const objectiveDisplay = page.locator('.mission-objective-display');
            await expect(objectiveDisplay).toBeVisible();
            
            // Verify it has cursor pointer style
            const cursorStyle = await objectiveDisplay.evaluate(el => 
                window.getComputedStyle(el).cursor
            );
            expect(cursorStyle).toBe('pointer');
            
            // Click on the objective display
            await objectiveDisplay.click();
            await page.waitForTimeout(1000);
            
            // Check if mission details panel opened or building panel opened
            const missionDetails = page.locator('.mission-details-panel');
            const buildingPanel = page.locator('.building-panel');
            
            // Either mission details should be visible OR building panel should be active
            const missionDetailsVisible = await missionDetails.isVisible().catch(() => false);
            const buildingPanelVisible = await buildingPanel.isVisible().catch(() => false);
            
            expect(missionDetailsVisible || buildingPanelVisible).toBeTruthy();
            
            console.log('✅ Mission objective clickability test passed');
        });

        test('Mission urgency levels display correctly', async ({ page }) => {
            console.log('🧪 Testing mission urgency level display...');
            
            // Check for urgency indicator
            const urgencyIndicator = page.locator('.mission-urgency');
            await expect(urgencyIndicator).toBeVisible();
            
            // Get urgency text
            const urgencyText = await urgencyIndicator.textContent();
            
            // Should be one of the valid urgency levels
            const validUrgencyLevels = ['NORMAL', 'IMPORTANTE', 'URGENTE', 'CRÍTICA'];
            expect(validUrgencyLevels).toContain(urgencyText);
            
            // Check if urgency has appropriate styling
            const urgencyClass = await urgencyIndicator.getAttribute('class');
            expect(urgencyClass).toContain('mission-urgency');
            
            console.log(`✅ Mission urgency test passed - Level: ${urgencyText}`);
        });

        test('Mission progress tracking works correctly', async ({ page }) => {
            console.log('🧪 Testing mission progress tracking...');
            
            // Check for progress display
            const progressText = page.locator('.progress-text');
            await expect(progressText).toBeVisible();
            
            const progressContent = await progressText.textContent();
            expect(progressContent).toMatch(/\d+\/\d+/); // Should match pattern like "0/1"
            
            // Check for progress bar
            const progressBar = page.locator('.progress-bar');
            await expect(progressBar).toBeVisible();
            
            const progressFill = page.locator('.progress-fill');
            await expect(progressFill).toBeVisible();
            
            console.log('✅ Mission progress tracking test passed');
        });
    });

    test.describe('Mobile Responsive HUD Tests', () => {
        
        test('Mobile toggle buttons appear on mobile viewport', async ({ page }) => {
            console.log('🧪 Testing mobile toggle buttons...');
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Check for mobile toggle buttons
            const leftToggle = page.locator('.mobile-toggle.left');
            const rightToggle = page.locator('.mobile-toggle.right');
            
            await expect(leftToggle).toBeVisible();
            await expect(rightToggle).toBeVisible();
            
            // Check button content
            const leftContent = await leftToggle.textContent();
            const rightContent = await rightToggle.textContent();
            
            expect(leftContent).toBe('🏗️');
            expect(rightContent).toBe('ℹ️');
            
            console.log('✅ Mobile toggle buttons test passed');
        });

        test('Mobile panel toggle functionality works', async ({ page }) => {
            console.log('🧪 Testing mobile panel toggle functionality...');
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Test right panel toggle (information panel)
            const rightToggle = page.locator('.mobile-toggle.right');
            await rightToggle.click();
            await page.waitForTimeout(500);
            
            // Check if right panel is active
            const hudRight = page.locator('.hud-right');
            const isActive = await hudRight.evaluate(el => el.classList.contains('active'));
            expect(isActive).toBeTruthy();
            
            // Check if toggle button shows active state
            const toggleActive = await rightToggle.evaluate(el => el.classList.contains('active'));
            expect(toggleActive).toBeTruthy();
            
            console.log('✅ Mobile panel toggle functionality test passed');
        });

        test('Mobile panel close button works', async ({ page }) => {
            console.log('🧪 Testing mobile panel close button...');
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Open information panel
            const rightToggle = page.locator('.mobile-toggle.right');
            await rightToggle.click();
            await page.waitForTimeout(500);
            
            // Find and click close button
            const closeButton = page.locator('.mobile-close-btn');
            await expect(closeButton).toBeVisible();
            await closeButton.click();
            await page.waitForTimeout(500);
            
            // Check if panel is closed
            const hudRight = page.locator('.hud-right');
            const isActive = await hudRight.evaluate(el => el.classList.contains('active'));
            expect(isActive).toBeFalsy();
            
            // Check if toggle button is no longer active
            const toggleActive = await rightToggle.evaluate(el => el.classList.contains('active'));
            expect(toggleActive).toBeFalsy();
            
            console.log('✅ Mobile panel close button test passed');
        });

        test('Mobile panel headers display correctly', async ({ page }) => {
            console.log('🧪 Testing mobile panel headers...');
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Open information panel
            const rightToggle = page.locator('.mobile-toggle.right');
            await rightToggle.click();
            await page.waitForTimeout(500);
            
            // Check for mobile panel header
            const panelHeader = page.locator('.mobile-panel-header');
            await expect(panelHeader).toBeVisible();
            
            // Check for panel title
            const panelTitle = page.locator('.mobile-panel-title');
            await expect(panelTitle).toBeVisible();
            
            const titleText = await panelTitle.textContent();
            expect(titleText).toBe('Informações');
            
            // Check for close button
            const closeButton = page.locator('.mobile-close-btn');
            await expect(closeButton).toBeVisible();
            
            console.log('✅ Mobile panel headers test passed');
        });

        test('Mobile panels have proper full-screen display', async ({ page }) => {
            console.log('🧪 Testing mobile full-screen display...');
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Open information panel
            const rightToggle = page.locator('.mobile-toggle.right');
            await rightToggle.click();
            await page.waitForTimeout(500);
            
            // Check panel dimensions
            const hudRight = page.locator('.hud-right');
            const panelBox = await hudRight.boundingBox();
            
            // Should take full viewport height
            expect(panelBox.height).toBeGreaterThanOrEqual(667 - 10); // Allow small margin
            
            // Should take full viewport width
            expect(panelBox.width).toBeGreaterThanOrEqual(375 - 10); // Allow small margin
            
            console.log('✅ Mobile full-screen display test passed');
        });

        test('Only one mobile panel can be open at a time', async ({ page }) => {
            console.log('🧪 Testing exclusive mobile panel behavior...');
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Open information panel
            const rightToggle = page.locator('.mobile-toggle.right');
            await rightToggle.click();
            await page.waitForTimeout(500);
            
            // Verify right panel is active
            const hudRight = page.locator('.hud-right');
            let rightActive = await hudRight.evaluate(el => el.classList.contains('active'));
            expect(rightActive).toBeTruthy();
            
            // Open construction panel
            const leftToggle = page.locator('.mobile-toggle.left');
            await leftToggle.click();
            await page.waitForTimeout(500);
            
            // Verify left panel is active and right panel is closed
            const hudLeft = page.locator('.hud-left');
            const leftActive = await hudLeft.evaluate(el => el.classList.contains('active'));
            expect(leftActive).toBeTruthy();
            
            rightActive = await hudRight.evaluate(el => el.classList.contains('active'));
            expect(rightActive).toBeFalsy();
            
            console.log('✅ Exclusive mobile panel behavior test passed');
        });
    });

    test.describe('Desktop to Mobile Responsiveness Tests', () => {
        
        test('Responsive transition from desktop to mobile works', async ({ page }) => {
            console.log('🧪 Testing desktop to mobile transition...');
            
            // Start with desktop viewport
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.waitForTimeout(1000);
            
            // Verify desktop layout
            const hudLeft = page.locator('.hud-left');
            const hudRight = page.locator('.hud-right');
            
            await expect(hudLeft).toBeVisible();
            await expect(hudRight).toBeVisible();
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Verify mobile toggle buttons appear
            const leftToggle = page.locator('.mobile-toggle.left');
            const rightToggle = page.locator('.mobile-toggle.right');
            
            await expect(leftToggle).toBeVisible();
            await expect(rightToggle).toBeVisible();
            
            console.log('✅ Desktop to mobile transition test passed');
        });

        test('Mobile to desktop transition cleans up mobile controls', async ({ page }) => {
            console.log('🧪 Testing mobile to desktop transition cleanup...');
            
            // Start with mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Verify mobile controls exist
            const leftToggle = page.locator('.mobile-toggle.left');
            const rightToggle = page.locator('.mobile-toggle.right');
            
            await expect(leftToggle).toBeVisible();
            await expect(rightToggle).toBeVisible();
            
            // Switch to desktop viewport
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.waitForTimeout(1000);
            
            // Verify mobile controls are removed
            const leftToggleExists = await leftToggle.isVisible().catch(() => false);
            const rightToggleExists = await rightToggle.isVisible().catch(() => false);
            
            expect(leftToggleExists).toBeFalsy();
            expect(rightToggleExists).toBeFalsy();
            
            console.log('✅ Mobile to desktop transition cleanup test passed');
        });
    });

    test.describe('Integration Tests', () => {
        
        test('Enhanced mission info works with mobile responsive design', async ({ page }) => {
            console.log('🧪 Testing integration of enhanced mission info with mobile design...');
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Check that enhanced mission info is still visible on mobile
            const missionHeader = page.locator('.mission-header');
            const objectiveDisplay = page.locator('.mission-objective-display');
            const urgencyIndicator = page.locator('.mission-urgency');
            
            await expect(missionHeader).toBeVisible();
            await expect(objectiveDisplay).toBeVisible();
            await expect(urgencyIndicator).toBeVisible();
            
            // Test clicking mission objective on mobile
            await objectiveDisplay.click();
            await page.waitForTimeout(1000);
            
            // Should open building panel or mission details
            const buildingPanel = page.locator('.building-panel');
            const missionDetails = page.locator('.mission-details-panel');
            
            const buildingVisible = await buildingPanel.isVisible().catch(() => false);
            const missionVisible = await missionDetails.isVisible().catch(() => false);
            
            expect(buildingVisible || missionVisible).toBeTruthy();
            
            console.log('✅ Enhanced mission info mobile integration test passed');
        });

        test('All enhanced features work together without conflicts', async ({ page }) => {
            console.log('🧪 Testing all enhanced features integration...');
            
            // Monitor console for errors
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });
            
            // Test desktop features
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.waitForTimeout(1000);
            
            // Test mission objective click
            const objectiveDisplay = page.locator('.mission-objective-display');
            await objectiveDisplay.click();
            await page.waitForTimeout(500);
            
            // Switch to mobile and test mobile features
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Test mobile panel toggle
            const rightToggle = page.locator('.mobile-toggle.right');
            await rightToggle.click();
            await page.waitForTimeout(500);
            
            // Test mobile panel close
            const closeButton = page.locator('.mobile-close-btn');
            await closeButton.click();
            await page.waitForTimeout(500);
            
            // Test construction panel
            const leftToggle = page.locator('.mobile-toggle.left');
            await leftToggle.click();
            await page.waitForTimeout(500);
            
            // Filter out non-critical errors
            const criticalErrors = consoleErrors.filter(error => 
                !error.includes('Failed to load resource') &&
                !error.includes('net::ERR_FILE_NOT_FOUND') &&
                !error.includes('Sprites/') &&
                !error.includes('Bounds checking') // Known non-critical camera bounds issue
            );
            
            expect(criticalErrors).toHaveLength(0);
            
            console.log('✅ All enhanced features integration test passed');
        });
    });

    test.afterEach(async ({ page }) => {
        await page.close();
    });
});
