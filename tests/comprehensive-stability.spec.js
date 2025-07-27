/**
 * Comprehensive Stability and Performance Test Suite
 * Tests game stability, memory management, and performance under various conditions
 */

const { test, expect } = require('@playwright/test');

test.describe('Guardião da Água - Comprehensive Stability Tests', () => {
    
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

    test.describe('Zero-Error Policy Validation', () => {
        
        test('Game initialization produces zero critical errors', async ({ page }) => {
            console.log('🧪 Testing game initialization for zero errors...');
            
            const consoleErrors = [];
            const consoleWarnings = [];
            
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                } else if (msg.type() === 'warning') {
                    consoleWarnings.push(msg.text());
                }
            });
            
            // Wait for full initialization
            await page.waitForTimeout(3000);
            
            // Filter out non-critical errors
            const criticalErrors = consoleErrors.filter(error => 
                !error.includes('Failed to load resource') &&
                !error.includes('net::ERR_FILE_NOT_FOUND') &&
                !error.includes('Sprites/') &&
                !error.includes('Bounds checking') &&
                !error.includes('⚠️')
            );
            
            expect(criticalErrors).toHaveLength(0);
            
            console.log(`✅ Zero-error policy validated - ${criticalErrors.length} critical errors`);
            console.log(`ℹ️ Non-critical warnings: ${consoleWarnings.length}`);
        });

        test('UI interactions produce zero critical errors', async ({ page }) => {
            console.log('🧪 Testing UI interactions for zero errors...');
            
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });
            
            // Test various UI interactions
            await page.click('button:has-text("💧 Água")');
            await page.waitForTimeout(500);
            
            await page.click('button:has-text("🏭 Tratamento")');
            await page.waitForTimeout(500);
            
            await page.click('button:has-text("🏛️ Públicos")');
            await page.waitForTimeout(500);
            
            // Test resource panel clicks
            await page.click('[data-resource="water"], .resource-item:has-text("Água")').catch(() => {});
            await page.waitForTimeout(500);
            
            await page.click('[data-resource="budget"], .resource-item:has-text("Orçamento")').catch(() => {});
            await page.waitForTimeout(500);
            
            // Test canvas interactions
            const canvas = page.locator('#game-canvas');
            await canvas.click({ position: { x: 400, y: 300 } });
            await page.waitForTimeout(500);
            
            await canvas.click({ position: { x: 200, y: 200 } });
            await page.waitForTimeout(500);
            
            // Filter critical errors
            const criticalErrors = consoleErrors.filter(error => 
                !error.includes('Failed to load resource') &&
                !error.includes('net::ERR_FILE_NOT_FOUND') &&
                !error.includes('Bounds checking')
            );
            
            expect(criticalErrors).toHaveLength(0);
            
            console.log('✅ UI interactions zero-error test passed');
        });
    });

    test.describe('Performance and Memory Tests', () => {
        
        test('Game maintains stable performance during extended play', async ({ page }) => {
            console.log('🧪 Testing extended gameplay performance...');
            
            // Monitor performance metrics
            const performanceMetrics = [];
            
            // Test building placement performance
            await page.click('button:has-text("💧 Água")');
            await page.waitForTimeout(500);
            
            const canvas = page.locator('#game-canvas');
            
            // Place multiple buildings and measure performance
            const startTime = Date.now();
            
            for (let i = 0; i < 5; i++) {
                await page.click('text=Bomba de Água');
                await page.waitForTimeout(200);
                
                await canvas.click({ position: { x: 300 + i * 50, y: 300 + i * 30 } });
                await page.waitForTimeout(1000); // Wait for construction
                
                const currentTime = Date.now();
                performanceMetrics.push(currentTime - startTime);
            }
            
            // Verify performance doesn't degrade significantly
            const firstPlacement = performanceMetrics[0];
            const lastPlacement = performanceMetrics[performanceMetrics.length - 1];
            
            // Last placement shouldn't take more than 3x the first placement
            expect(lastPlacement).toBeLessThan(firstPlacement * 3);
            
            console.log(`✅ Performance test passed - First: ${firstPlacement}ms, Last: ${lastPlacement}ms`);
        });

        test('Memory usage remains stable during gameplay', async ({ page }) => {
            console.log('🧪 Testing memory stability...');
            
            // Get initial memory info
            const initialMemory = await page.evaluate(() => {
                if (window.performance && window.performance.memory) {
                    return {
                        used: window.performance.memory.usedJSHeapSize,
                        total: window.performance.memory.totalJSHeapSize,
                        limit: window.performance.memory.jsHeapSizeLimit
                    };
                }
                return null;
            });
            
            // Perform memory-intensive operations
            const canvas = page.locator('#game-canvas');
            
            // Rapid camera movements
            for (let i = 0; i < 20; i++) {
                await page.keyboard.press('KeyW');
                await page.waitForTimeout(50);
                await page.keyboard.press('KeyS');
                await page.waitForTimeout(50);
            }
            
            // Multiple UI interactions
            for (let i = 0; i < 10; i++) {
                await page.click('button:has-text("💧 Água")');
                await page.waitForTimeout(100);
                await page.click('button:has-text("🏛️ Públicos")');
                await page.waitForTimeout(100);
            }
            
            // Get final memory info
            const finalMemory = await page.evaluate(() => {
                if (window.performance && window.performance.memory) {
                    return {
                        used: window.performance.memory.usedJSHeapSize,
                        total: window.performance.memory.totalJSHeapSize,
                        limit: window.performance.memory.jsHeapSizeLimit
                    };
                }
                return null;
            });
            
            if (initialMemory && finalMemory) {
                const memoryIncrease = finalMemory.used - initialMemory.used;
                const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;
                
                // Memory increase should be reasonable (less than 50%)
                expect(memoryIncreasePercent).toBeLessThan(50);
                
                console.log(`✅ Memory stability test passed - Increase: ${memoryIncreasePercent.toFixed(2)}%`);
            } else {
                console.log('ℹ️ Memory API not available, skipping detailed memory test');
            }
        });
    });

    test.describe('Cross-Browser Compatibility', () => {
        
        test('Enhanced features work across different browsers', async ({ page, browserName }) => {
            console.log(`🧪 Testing enhanced features on ${browserName}...`);
            
            // Test enhanced mission info panel
            const missionHeader = page.locator('.mission-header');
            const objectiveDisplay = page.locator('.mission-objective-display');
            const urgencyIndicator = page.locator('.mission-urgency');
            
            await expect(missionHeader).toBeVisible();
            await expect(objectiveDisplay).toBeVisible();
            await expect(urgencyIndicator).toBeVisible();
            
            // Test mobile responsive features
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            const leftToggle = page.locator('.mobile-toggle.left');
            const rightToggle = page.locator('.mobile-toggle.right');
            
            await expect(leftToggle).toBeVisible();
            await expect(rightToggle).toBeVisible();
            
            // Test mobile panel functionality
            await rightToggle.click();
            await page.waitForTimeout(500);
            
            const hudRight = page.locator('.hud-right');
            const isActive = await hudRight.evaluate(el => el.classList.contains('active'));
            expect(isActive).toBeTruthy();
            
            console.log(`✅ Enhanced features work correctly on ${browserName}`);
        });
    });

    test.describe('Stress Testing', () => {
        
        test('Game handles rapid UI interactions without breaking', async ({ page }) => {
            console.log('🧪 Testing rapid UI interaction stress...');
            
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });
            
            // Rapid category switching
            const categories = ['💧 Água', '🏭 Tratamento', '🏛️ Públicos', '⚡ Energia'];
            
            for (let round = 0; round < 5; round++) {
                for (const category of categories) {
                    await page.click(`button:has-text("${category}")`);
                    await page.waitForTimeout(50); // Very rapid switching
                }
            }
            
            // Rapid canvas clicking
            const canvas = page.locator('#game-canvas');
            for (let i = 0; i < 20; i++) {
                await canvas.click({ position: { x: 200 + i * 10, y: 200 + i * 5 } });
                await page.waitForTimeout(50);
            }
            
            // Filter critical errors
            const criticalErrors = consoleErrors.filter(error => 
                !error.includes('Failed to load resource') &&
                !error.includes('Bounds checking')
            );
            
            expect(criticalErrors).toHaveLength(0);
            
            console.log('✅ Rapid UI interaction stress test passed');
        });

        test('Mobile panel rapid toggling stress test', async ({ page }) => {
            console.log('🧪 Testing mobile panel rapid toggling stress...');
            
            // Switch to mobile
            await page.setViewportSize({ width: 375, height: 667 });
            await page.waitForTimeout(1000);
            
            const consoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });
            
            const leftToggle = page.locator('.mobile-toggle.left');
            const rightToggle = page.locator('.mobile-toggle.right');
            
            // Rapid panel toggling
            for (let i = 0; i < 20; i++) {
                await leftToggle.click();
                await page.waitForTimeout(50);
                await rightToggle.click();
                await page.waitForTimeout(50);
            }
            
            // Test close button rapid clicking
            await rightToggle.click();
            await page.waitForTimeout(200);
            
            const closeButton = page.locator('.mobile-close-btn');
            for (let i = 0; i < 10; i++) {
                await closeButton.click();
                await page.waitForTimeout(50);
                await rightToggle.click();
                await page.waitForTimeout(50);
            }
            
            // Filter critical errors
            const criticalErrors = consoleErrors.filter(error => 
                !error.includes('Failed to load resource') &&
                !error.includes('Bounds checking')
            );
            
            expect(criticalErrors).toHaveLength(0);
            
            console.log('✅ Mobile panel rapid toggling stress test passed');
        });
    });

    test.afterEach(async ({ page }) => {
        await page.close();
    });
});
