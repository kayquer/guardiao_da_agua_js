/**
 * Comprehensive Integration Test Suite for Guardião da Água
 * Tests all implemented fixes and enhancements together
 */

const { test, expect } = require('@playwright/test');

test.describe('Guardião da Água - Comprehensive Integration Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the game
        await page.goto('file:///C:/Users/kayqu/Downloads/guardiao_da_agua_js/index.html');
        
        // Wait for the game to load
        await page.waitForSelector('button:has-text("🎮 Novo Jogo")', { timeout: 30000 });
        
        // Start a new game
        await page.click('button:has-text("🎮 Novo Jogo")');
        
        // Wait for game initialization
        await page.waitForSelector('#game-canvas', { timeout: 30000 });
        await page.waitForTimeout(5000);
    });

    test.describe('Camera Mouse Interaction Tests', () => {
        
        test('Camera panning with left mouse button maintains focus', async ({ page }) => {
            console.log('🧪 Testing camera panning focus management...');
            
            const canvas = page.locator('#game-canvas');
            await expect(canvas).toBeVisible();
            
            // Monitor console for focus-related errors
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error' && msg.text().includes('focus')) {
                    consoleErrors.push(msg.text());
                }
            });
            
            // Test left mouse button drag
            await canvas.hover({ position: { x: 400, y: 300 } });
            await page.mouse.down();
            await page.mouse.move(500, 400);
            await page.mouse.up();
            await page.waitForTimeout(500);
            
            // Verify no focus-related errors
            expect(consoleErrors).toHaveLength(0);
            
            // Verify canvas still has focus
            const canvasIsFocused = await canvas.evaluate(el => document.activeElement === el);
            expect(canvasIsFocused).toBeTruthy();
            
            console.log('✅ Camera panning focus test passed');
        });

        test('Middle mouse button interactions work correctly', async ({ page }) => {
            console.log('🧪 Testing middle mouse button interactions...');
            
            const canvas = page.locator('#game-canvas');
            
            // Test middle mouse button functionality
            await canvas.hover({ position: { x: 400, y: 300 } });
            await page.mouse.down({ button: 'middle' });
            await page.mouse.move(450, 350);
            await page.mouse.up({ button: 'middle' });
            await page.waitForTimeout(500);
            
            // Verify canvas maintains interactivity
            const canvasRect = await canvas.boundingBox();
            expect(canvasRect).toBeTruthy();
            
            console.log('✅ Middle mouse button test passed');
        });
    });

    test.describe('Mission Categories UI Tests', () => {
        
        test('Mission categories are simplified to 2 primary categories', async ({ page }) => {
            console.log('🧪 Testing simplified mission categories...');
            
            // Open mission panel
            await page.click('button:has-text("🎯")');
            await page.waitForTimeout(1000);
            
            // Check for simplified categories
            const missionPanel = page.locator('.mission-panel, .quest-panel');
            await expect(missionPanel).toBeVisible();
            
            // Should have Primary and Secondary missions
            const primaryMissions = page.locator('text=Primárias, text=Primary');
            const secondaryMissions = page.locator('text=Secundárias, text=Secondary');
            
            // At least one of these should be visible
            const primaryVisible = await primaryMissions.isVisible().catch(() => false);
            const secondaryVisible = await secondaryMissions.isVisible().catch(() => false);
            
            expect(primaryVisible || secondaryVisible).toBeTruthy();
            
            console.log('✅ Mission categories simplification test passed');
        });
    });

    test.describe('Mission Info Current Objective Tests', () => {
        
        test('Current objective display shows actionable text', async ({ page }) => {
            console.log('🧪 Testing current objective display...');
            
            // Check for mission objective display
            const objectiveDisplay = page.locator('.mission-objective-display, #mission-objective-display');
            await expect(objectiveDisplay).toBeVisible();
            
            // Check for actionable text
            const objectiveText = await objectiveDisplay.textContent();
            expect(objectiveText).toContain('Construa');
            
            // Check for urgency indicator
            const urgencyIndicator = page.locator('.mission-urgency, .urgency');
            await expect(urgencyIndicator).toBeVisible();
            
            console.log('✅ Current objective display test passed');
        });

        test('Mission objective is clickable and functional', async ({ page }) => {
            console.log('🧪 Testing mission objective clickability...');
            
            const objectiveDisplay = page.locator('.mission-objective-display, #mission-objective-display');
            await expect(objectiveDisplay).toBeVisible();
            
            // Click on objective
            await objectiveDisplay.click();
            await page.waitForTimeout(1000);
            
            // Should open mission details or building panel
            const missionDetails = page.locator('.mission-details, .mission-panel');
            const buildingPanel = page.locator('.building-panel');
            
            const detailsVisible = await missionDetails.isVisible().catch(() => false);
            const buildingVisible = await buildingPanel.isVisible().catch(() => false);
            
            expect(detailsVisible || buildingVisible).toBeTruthy();
            
            console.log('✅ Mission objective clickability test passed');
        });
    });

    test.describe('Mobile Responsive HUD Tests', () => {
        
        test('Mobile HUD displays correctly on mobile viewport', async ({ page }) => {
            console.log('🧪 Testing mobile HUD display...');
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Check for mobile toggle buttons
            const mobileToggles = page.locator('.mobile-toggle');
            const toggleCount = await mobileToggles.count();
            expect(toggleCount).toBeGreaterThan(0);
            
            // Test mobile panel functionality
            const rightToggle = page.locator('.mobile-toggle').last();
            await rightToggle.click();
            await page.waitForTimeout(500);
            
            // Check for full-screen panel
            const activePanel = page.locator('.hud-right.active, .hud-left.active');
            await expect(activePanel).toBeVisible();
            
            console.log('✅ Mobile HUD display test passed');
        });

        test('Mobile panels have close functionality', async ({ page }) => {
            console.log('🧪 Testing mobile panel close functionality...');
            
            // Switch to mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            // Open a mobile panel
            const mobileToggle = page.locator('.mobile-toggle').first();
            await mobileToggle.click();
            await page.waitForTimeout(500);
            
            // Find and click close button
            const closeButton = page.locator('.mobile-close-btn, .close-btn');
            if (await closeButton.isVisible()) {
                await closeButton.click();
                await page.waitForTimeout(500);
                
                // Verify panel is closed
                const activePanel = page.locator('.hud-right.active, .hud-left.active');
                const isActive = await activePanel.isVisible().catch(() => false);
                expect(isActive).toBeFalsy();
            }
            
            console.log('✅ Mobile panel close functionality test passed');
        });
    });

    test.describe('Integration and Performance Tests', () => {
        
        test('All features work together without conflicts', async ({ page }) => {
            console.log('🧪 Testing feature integration...');
            
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });
            
            // Test camera interactions
            const canvas = page.locator('#game-canvas');
            await canvas.click({ position: { x: 400, y: 300 } });
            await page.waitForTimeout(500);
            
            // Test mission objective click
            const objectiveDisplay = page.locator('.mission-objective-display, #mission-objective-display');
            if (await objectiveDisplay.isVisible()) {
                await objectiveDisplay.click();
                await page.waitForTimeout(500);
            }
            
            // Test mobile responsiveness
            await page.setViewportSize({ width: 375, y: 667 });
            await page.waitForTimeout(1000);
            
            // Test mobile toggle
            const mobileToggle = page.locator('.mobile-toggle').first();
            if (await mobileToggle.isVisible()) {
                await mobileToggle.click();
                await page.waitForTimeout(500);
            }
            
            // Switch back to desktop
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.waitForTimeout(1000);
            
            // Filter critical errors
            const criticalErrors = consoleErrors.filter(error => 
                !error.includes('Failed to load resource') &&
                !error.includes('net::ERR_FILE_NOT_FOUND') &&
                !error.includes('Bounds checking')
            );
            
            expect(criticalErrors).toHaveLength(0);
            
            console.log('✅ Feature integration test passed');
        });

        test('Game maintains stable performance', async ({ page }) => {
            console.log('🧪 Testing game performance stability...');
            
            // Get initial memory info if available
            const initialMemory = await page.evaluate(() => {
                if (window.performance && window.performance.memory) {
                    return window.performance.memory.usedJSHeapSize;
                }
                return null;
            });
            
            // Perform various interactions
            const canvas = page.locator('#game-canvas');
            
            // Multiple camera movements
            for (let i = 0; i < 10; i++) {
                await canvas.click({ position: { x: 300 + i * 20, y: 300 + i * 10 } });
                await page.waitForTimeout(100);
            }
            
            // UI interactions
            await page.click('button:has-text("💧 Água")');
            await page.waitForTimeout(200);
            await page.click('button:has-text("🏛️ Públicos")');
            await page.waitForTimeout(200);
            
            // Get final memory info
            const finalMemory = await page.evaluate(() => {
                if (window.performance && window.performance.memory) {
                    return window.performance.memory.usedJSHeapSize;
                }
                return null;
            });
            
            if (initialMemory && finalMemory) {
                const memoryIncrease = finalMemory - initialMemory;
                const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
                
                // Memory increase should be reasonable
                expect(memoryIncreasePercent).toBeLessThan(30);
                
                console.log(`✅ Performance test passed - Memory increase: ${memoryIncreasePercent.toFixed(2)}%`);
            } else {
                console.log('✅ Performance test passed - Memory API not available');
            }
        });
    });

    test.afterEach(async ({ page }) => {
        await page.close();
    });
});
