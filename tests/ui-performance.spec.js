/**
 * Playwright Tests for Guardião da Água UI and Performance Improvements
 * Tests mouse performance, visual consistency, hover effects, and building placement
 */

const { test, expect } = require('@playwright/test');

test.describe('Guardião da Água - UI and Performance Tests', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the game
        await page.goto('http://localhost:3000'); // Adjust URL as needed
        
        // Wait for game to load
        await page.waitForSelector('#game-canvas', { timeout: 30000 });
        
        // Wait for loading to complete
        await page.waitForFunction(() => {
            return window.gameManager && window.gameManager.initialized;
        }, { timeout: 30000 });
        
        // Start a new game
        await page.click('#btn-new-game');
        await page.waitForTimeout(2000); // Wait for game initialization
    });

    test('Resource Display UI Redesign - No Text Labels', async ({ page }) => {
        // Test that resource counters only show emoji and values, no text labels
        const resourceItems = await page.locator('.resource-item').all();
        
        for (const item of resourceItems) {
            // Check that resource-label elements don't exist
            const labels = await item.locator('.resource-label').count();
            expect(labels).toBe(0);
            
            // Check that emoji icon exists
            const icon = await item.locator('.resource-icon');
            await expect(icon).toBeVisible();
            
            // Check that value exists
            const value = await item.locator('.resource-value');
            await expect(value).toBeVisible();
            
            // Verify tooltip appears on hover
            await item.hover();
            await page.waitForTimeout(500);
            const tooltip = await page.locator('#resource-tooltip');
            await expect(tooltip).toBeVisible();
            
            // Move away to hide tooltip
            await page.mouse.move(0, 0);
            await page.waitForTimeout(300);
        }
    });

    test('Mouse Performance - No FPS Drops During Movement', async ({ page }) => {
        // Test mouse movement performance over 3D environment
        const canvas = page.locator('#game-canvas');
        await expect(canvas).toBeVisible();
        
        // Get canvas bounds
        const canvasBounds = await canvas.boundingBox();
        
        // Measure performance during rapid mouse movement
        const startTime = Date.now();
        let frameCount = 0;
        
        // Monitor FPS using requestAnimationFrame
        await page.evaluate(() => {
            window.testFrameCount = 0;
            window.testStartTime = performance.now();
            
            function countFrames() {
                window.testFrameCount++;
                requestAnimationFrame(countFrames);
            }
            countFrames();
        });
        
        // Perform rapid mouse movements across the canvas
        for (let i = 0; i < 20; i++) {
            const x = canvasBounds.x + (canvasBounds.width * Math.random());
            const y = canvasBounds.y + (canvasBounds.height * Math.random());
            await page.mouse.move(x, y);
            await page.waitForTimeout(50); // 20 FPS movement
        }
        
        // Check FPS after movement
        const fps = await page.evaluate(() => {
            const elapsed = performance.now() - window.testStartTime;
            return (window.testFrameCount / elapsed) * 1000;
        });
        
        // FPS should be above 30 (reasonable threshold)
        expect(fps).toBeGreaterThan(30);
        console.log(`Mouse movement FPS: ${fps.toFixed(2)}`);
    });

    test('Hover Effects on All Interactive Objects', async ({ page }) => {
        const canvas = page.locator('#game-canvas');
        const canvasBounds = await canvas.boundingBox();
        
        // Test hover effects on different areas
        const testPoints = [
            { x: canvasBounds.x + canvasBounds.width * 0.3, y: canvasBounds.y + canvasBounds.height * 0.3, type: 'terrain' },
            { x: canvasBounds.x + canvasBounds.width * 0.5, y: canvasBounds.y + canvasBounds.height * 0.5, type: 'building' },
            { x: canvasBounds.x + canvasBounds.width * 0.7, y: canvasBounds.y + canvasBounds.height * 0.7, type: 'water' }
        ];
        
        for (const point of testPoints) {
            // Move mouse to test point
            await page.mouse.move(point.x, point.y);
            await page.waitForTimeout(300);
            
            // Check if hover tooltip appears
            const tooltip = await page.locator('#hover-tooltip');
            const isVisible = await tooltip.isVisible();
            
            if (isVisible) {
                // Verify tooltip content is appropriate
                const content = await tooltip.textContent();
                expect(content.length).toBeGreaterThan(0);
                console.log(`Hover effect on ${point.type}: ${content.substring(0, 50)}...`);
            }
        }
    });

    test('Building Placement Accuracy and Grid Alignment', async ({ page }) => {
        // Test building placement accuracy
        const canvas = page.locator('#game-canvas');
        
        // Select a building type (house)
        await page.click('[data-building-type="house"]');
        await page.waitForTimeout(500);
        
        // Get canvas bounds for placement
        const canvasBounds = await canvas.boundingBox();
        const centerX = canvasBounds.x + canvasBounds.width * 0.6;
        const centerY = canvasBounds.y + canvasBounds.height * 0.6;
        
        // Click to place building
        await page.mouse.click(centerX, centerY);
        await page.waitForTimeout(1000);
        
        // Verify building was placed
        const buildingCount = await page.evaluate(() => {
            return window.gameManager && window.gameManager.buildingSystem 
                ? window.gameManager.buildingSystem.buildings.size 
                : 0;
        });
        
        expect(buildingCount).toBeGreaterThan(1); // Should have City Hall + new building
        
        // Check building alignment (buildings should be properly positioned)
        const buildingPositions = await page.evaluate(() => {
            if (!window.gameManager || !window.gameManager.buildingSystem) return [];
            
            const positions = [];
            window.gameManager.buildingSystem.buildings.forEach(building => {
                positions.push({
                    type: building.type,
                    gridX: building.gridX,
                    gridZ: building.gridZ,
                    worldX: building.mesh.position.x,
                    worldZ: building.mesh.position.z
                });
            });
            return positions;
        });
        
        // Verify buildings are properly aligned to grid
        for (const building of buildingPositions) {
            // Grid coordinates should be integers
            expect(Number.isInteger(building.gridX)).toBe(true);
            expect(Number.isInteger(building.gridZ)).toBe(true);
            
            console.log(`Building ${building.type} at grid (${building.gridX}, ${building.gridZ}) world (${building.worldX.toFixed(2)}, ${building.worldZ.toFixed(2)})`);
        }
    });

    test('Building Labels Z-Index and Visibility', async ({ page }) => {
        const canvas = page.locator('#game-canvas');
        const canvasBounds = await canvas.boundingBox();
        
        // Hover over the City Hall area (should be at center)
        const centerX = canvasBounds.x + canvasBounds.width * 0.5;
        const centerY = canvasBounds.y + canvasBounds.height * 0.5;
        
        await page.mouse.move(centerX, centerY);
        await page.waitForTimeout(500);
        
        // Check if building labels are visible and properly rendered
        const labelVisibility = await page.evaluate(() => {
            if (!window.gameManager || !window.gameManager.buildingSystem) return null;
            
            const labels = [];
            window.gameManager.buildingSystem.buildings.forEach(building => {
                if (building.mesh && building.mesh.nameLabel) {
                    labels.push({
                        type: building.type,
                        visible: building.mesh.nameLabel.isVisible,
                        renderingGroupId: building.mesh.nameLabel.renderingGroupId,
                        alphaIndex: building.mesh.nameLabel.alphaIndex
                    });
                }
            });
            return labels;
        });
        
        if (labelVisibility && labelVisibility.length > 0) {
            for (const label of labelVisibility) {
                // Check that labels have proper z-index settings
                expect(label.renderingGroupId).toBe(2);
                expect(label.alphaIndex).toBeGreaterThan(900);
                console.log(`Label for ${label.type}: visible=${label.visible}, renderingGroup=${label.renderingGroupId}, alphaIndex=${label.alphaIndex}`);
            }
        }
    });

    test('Mobile Interface Responsiveness', async ({ page, isMobile }) => {
        if (isMobile) {
            // Test mobile-specific UI elements
            const mobileControls = page.locator('.mobile-controls');
            await expect(mobileControls).toBeVisible();
            
            // Test resource panel on mobile
            const resourcePanel = page.locator('.resource-panel');
            await expect(resourcePanel).toBeVisible();
            
            // Test building panel on mobile
            const buildingPanel = page.locator('.building-panel');
            await expect(buildingPanel).toBeVisible();
            
            // Test touch interactions
            const canvas = page.locator('#game-canvas');
            await canvas.tap();
            await page.waitForTimeout(500);
        }
    });

    test('Console Error Monitoring', async ({ page }) => {
        // Monitor console for errors during gameplay
        const consoleErrors = [];
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Perform various game actions
        await page.mouse.move(400, 300);
        await page.waitForTimeout(500);
        
        await page.click('[data-building-type="house"]');
        await page.waitForTimeout(500);
        
        const canvas = page.locator('#game-canvas');
        const canvasBounds = await canvas.boundingBox();
        await page.mouse.click(canvasBounds.x + 200, canvasBounds.y + 200);
        await page.waitForTimeout(1000);
        
        // Check for console errors
        expect(consoleErrors.length).toBe(0);
        
        if (consoleErrors.length > 0) {
            console.log('Console errors detected:', consoleErrors);
        }
    });
});
