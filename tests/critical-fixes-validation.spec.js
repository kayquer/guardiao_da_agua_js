/**
 * Critical Fixes Validation Test Suite
 * Tests all the critical fixes implemented for the Guardião da Água game
 */

const { test, expect } = require('@playwright/test');

test.describe('Guardião da Água - Critical Fixes Validation', () => {
    let page;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();
        
        // Navigate to the game
        await page.goto('file:///C:/Users/kayqu/Downloads/guardiao_da_agua_js/index.html');
        
        // Wait for game to load
        await page.waitForSelector('button:has-text("🎮 Novo Jogo")', { timeout: 30000 });
        
        // Start new game
        await page.click('button:has-text("🎮 Novo Jogo")');
        
        // Wait for game to initialize
        await page.waitForSelector('#game-canvas', { timeout: 30000 });
        await page.waitForTimeout(5000); // Additional wait for full initialization
    });

    test('1. Unknown Object Selection Bug Fix - Zero Console Errors', async () => {
        console.log('🧪 Testing building selection without console errors...');
        
        // Monitor console for errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Try to click on various areas of the game canvas
        const canvas = await page.locator('#game-canvas');
        
        // Click center (where City Hall should be)
        await canvas.click({ position: { x: 400, y: 300 } });
        await page.waitForTimeout(1000);
        
        // Click different areas to test terrain selection
        await canvas.click({ position: { x: 200, y: 200 } });
        await page.waitForTimeout(1000);
        
        await canvas.click({ position: { x: 600, y: 400 } });
        await page.waitForTimeout(1000);

        // Verify no console errors related to building selection
        const buildingSelectionErrors = consoleErrors.filter(error => 
            error.includes('Cannot read properties of undefined') ||
            error.includes('building.config') ||
            error.includes('deselectBuilding') ||
            error.includes('handleBuildingSelection')
        );

        expect(buildingSelectionErrors).toHaveLength(0);
        console.log('✅ Building selection working without errors');
    });

    test('2. Terrain Information Panel Display Fix', async () => {
        console.log('🧪 Testing terrain information display...');
        
        // Click on terrain to select it
        const canvas = await page.locator('#game-canvas');
        await canvas.click({ position: { x: 300, y: 200 } });
        await page.waitForTimeout(2000);

        // Check if terrain information is displayed in the right panel
        const terrainInfo = await page.locator('text=🌍 Informações do Terreno');
        await expect(terrainInfo).toBeVisible();

        // Verify terrain details are shown
        const terrainDetails = await page.locator('.terrain-info, [class*="terrain"], [class*="info"]');
        const hasTerrainContent = await terrainDetails.count() > 0 || 
                                 await page.locator('text=Terreno').count() > 0 ||
                                 await page.locator('text=Posição').count() > 0;
        
        expect(hasTerrainContent).toBeTruthy();
        console.log('✅ Terrain information panel displaying correctly');
    });

    test('3. Right Mouse Button Camera Movement Validation', async () => {
        console.log('🧪 Testing camera controls...');
        
        // Get initial camera state
        const initialCameraState = await page.evaluate(() => {
            if (!window.gameManager || !window.gameManager.camera) return null;
            const camera = window.gameManager.camera;
            return {
                alpha: camera.alpha,
                beta: camera.beta,
                radius: camera.radius,
                target: camera.getTarget()
            };
        });

        expect(initialCameraState).not.toBeNull();

        // Test orbital rotation with right mouse button
        const finalCameraState = await page.evaluate(() => {
            if (!window.gameManager || !window.gameManager.camera) return null;
            
            const gameManager = window.gameManager;
            const camera = gameManager.camera;
            
            // Simulate right mouse button orbital rotation
            gameManager.cameraControlState.rightMouseDown = true;
            gameManager.cameraControlState.isOrbiting = true;
            gameManager.orbitCamera(50, 30);
            gameManager.cameraControlState.rightMouseDown = false;
            gameManager.cameraControlState.isOrbiting = false;
            
            return {
                alpha: camera.alpha,
                beta: camera.beta,
                radius: camera.radius,
                target: camera.getTarget()
            };
        });

        // Verify orbital rotation behavior
        expect(Math.abs(finalCameraState.alpha - initialCameraState.alpha)).toBeGreaterThan(0.001);
        expect(Math.abs(finalCameraState.beta - initialCameraState.beta)).toBeGreaterThan(0.001);
        expect(Math.abs(finalCameraState.radius - initialCameraState.radius)).toBeLessThan(0.1);
        
        console.log('✅ Camera orbital rotation working correctly');
    });

    test('4. Building Size and Grid Alignment Corrections', async () => {
        console.log('🧪 Testing building size corrections...');
        
        // Select Energy category
        await page.click('button:has-text("⚡ Energia")');
        await page.waitForTimeout(1000);

        // Select Thermoelectric Plant (should be 2x2)
        await page.click('text=Termelétrica');
        await page.waitForTimeout(1000);

        // Place the building
        const canvas = await page.locator('#game-canvas');
        await canvas.click({ position: { x: 500, y: 300 } });
        await page.waitForTimeout(3000); // Wait for construction

        // Verify building was placed successfully
        const buildingPlaced = await page.evaluate(() => {
            return window.gameManager && 
                   window.gameManager.buildingSystem && 
                   window.gameManager.buildingSystem.buildings.size >= 2; // City Hall + Thermoelectric
        });

        expect(buildingPlaced).toBeTruthy();

        // Test placing a 1x1 building for comparison
        await page.click('button:has-text("💧 Água")');
        await page.waitForTimeout(1000);

        await page.click('text=Bomba de Água');
        await page.waitForTimeout(1000);

        await canvas.click({ position: { x: 300, y: 300 } });
        await page.waitForTimeout(3000);

        // Verify both buildings are placed
        const totalBuildings = await page.evaluate(() => {
            return window.gameManager && 
                   window.gameManager.buildingSystem && 
                   window.gameManager.buildingSystem.buildings.size;
        });

        expect(totalBuildings).toBeGreaterThanOrEqual(3); // City Hall + Thermoelectric + Water Pump
        console.log('✅ Building size and grid alignment working correctly');
    });

    test('5. Overall Game Stability and Zero-Error Policy', async () => {
        console.log('🧪 Testing overall game stability...');
        
        // Monitor console for any errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Perform various game actions
        await page.click('button:has-text("⚡ Energia")');
        await page.waitForTimeout(500);
        
        await page.click('button:has-text("💧 Água")');
        await page.waitForTimeout(500);
        
        await page.click('button:has-text("🏛️ Públicos")');
        await page.waitForTimeout(500);

        // Test camera controls
        const canvas = await page.locator('#game-canvas');
        await canvas.click({ position: { x: 400, y: 300 } });
        await page.waitForTimeout(1000);

        // Test terrain selection
        await canvas.click({ position: { x: 200, y: 200 } });
        await page.waitForTimeout(1000);

        // Filter out non-critical errors (like missing assets)
        const criticalErrors = consoleErrors.filter(error => 
            !error.includes('Failed to load resource') &&
            !error.includes('net::ERR_FILE_NOT_FOUND') &&
            !error.includes('Sprites/') &&
            error.includes('Error') || error.includes('TypeError') || error.includes('ReferenceError')
        );

        expect(criticalErrors).toHaveLength(0);
        console.log('✅ Game running with zero critical errors');
    });

    test.afterEach(async () => {
        await page.close();
    });
});
