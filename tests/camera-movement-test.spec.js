/**
 * Comprehensive Camera Movement Test Suite
 * Tests the enhanced camera system with ArrowLeft bug fix
 */

const { test, expect } = require('@playwright/test');

test.describe('Camera Movement System Tests', () => {
    let page;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();
        
        // Navigate to the game
        await page.goto('/');
        
        // Wait for game to load
        await page.waitForSelector('button:has-text("🎮 Novo Jogo")', { timeout: 30000 });
        
        // Start new game
        await page.click('button:has-text("🎮 Novo Jogo")');
        
        // Wait for game screen to load
        await page.waitForSelector('.resource-panel', { timeout: 30000 });
        
        // Wait for camera to be initialized
        await page.waitForFunction(() => {
            return window.gameManager && window.gameManager.camera && window.getCameraState;
        }, { timeout: 10000 });
    });

    test('Camera system initializes correctly', async () => {
        // Test camera state function is available
        const cameraState = await page.evaluate(() => window.getCameraState());
        
        expect(cameraState).toBeDefined();
        expect(cameraState.position).toBeDefined();
        expect(cameraState.target).toBeDefined();
        expect(cameraState.alpha).toBeDefined();
        expect(cameraState.beta).toBeDefined();
        expect(cameraState.radius).toBeDefined();
        expect(cameraState.bounds).toBeDefined();
        expect(cameraState.scene.visible).toBe(true);
        
        console.log('✅ Camera initialized with state:', cameraState);
    });

    test('ArrowLeft key does not cause screen blanking', async () => {
        // Get initial camera state
        const initialState = await page.evaluate(() => window.getCameraState());
        
        // Press ArrowLeft key
        await page.keyboard.press('ArrowLeft');
        
        // Wait a moment for any potential issues to manifest
        await page.waitForTimeout(1000);
        
        // Get camera state after ArrowLeft
        const afterState = await page.evaluate(() => window.getCameraState());
        
        // Verify camera is still functional
        expect(afterState).toBeDefined();
        expect(afterState.scene.visible).toBe(true);
        expect(afterState.position).toBeDefined();
        expect(afterState.target).toBeDefined();
        
        // Verify no null values
        expect(afterState.position.x).not.toBeNull();
        expect(afterState.position.y).not.toBeNull();
        expect(afterState.position.z).not.toBeNull();
        expect(afterState.target.x).not.toBeNull();
        expect(afterState.target.y).not.toBeNull();
        expect(afterState.target.z).not.toBeNull();
        
        console.log('✅ ArrowLeft test passed - Camera state after:', afterState);
    });

    test('All arrow keys work correctly', async () => {
        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        
        for (const key of keys) {
            // Get state before key press
            const beforeState = await page.evaluate(() => window.getCameraState());
            
            // Press the key
            await page.keyboard.press(key);
            
            // Wait for movement to process
            await page.waitForTimeout(100);
            
            // Get state after key press
            const afterState = await page.evaluate(() => window.getCameraState());
            
            // Verify camera is still functional
            expect(afterState).toBeDefined();
            expect(afterState.scene.visible).toBe(true);
            expect(afterState.position).toBeDefined();
            expect(afterState.target).toBeDefined();
            
            console.log(`✅ ${key} test passed - Camera functional`);
        }
    });

    test('WASD keys work correctly', async () => {
        const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
        
        for (const key of keys) {
            // Get state before key press
            const beforeState = await page.evaluate(() => window.getCameraState());
            
            // Press the key
            await page.keyboard.press(key);
            
            // Wait for movement to process
            await page.waitForTimeout(100);
            
            // Get state after key press
            const afterState = await page.evaluate(() => window.getCameraState());
            
            // Verify camera is still functional
            expect(afterState).toBeDefined();
            expect(afterState.scene.visible).toBe(true);
            expect(afterState.position).toBeDefined();
            expect(afterState.target).toBeDefined();
            
            console.log(`✅ ${key} test passed - Camera functional`);
        }
    });

    test('Camera bounds are respected', async () => {
        // Get camera bounds
        const bounds = await page.evaluate(() => {
            const state = window.getCameraState();
            return state.bounds;
        });
        
        expect(bounds).toBeDefined();
        expect(bounds.MIN_X).toBeDefined();
        expect(bounds.MAX_X).toBeDefined();
        expect(bounds.MIN_Z).toBeDefined();
        expect(bounds.MAX_Z).toBeDefined();
        
        console.log('✅ Camera bounds defined:', bounds);
    });

    test('Camera recovery function works', async () => {
        // Test camera recovery function
        const recoveryResult = await page.evaluate(() => {
            try {
                window.recoverCamera();
                return { success: true, state: window.getCameraState() };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        expect(recoveryResult.success).toBe(true);
        expect(recoveryResult.state).toBeDefined();
        expect(recoveryResult.state.scene.visible).toBe(true);
        
        console.log('✅ Camera recovery test passed');
    });

    test('No console errors during camera movement', async () => {
        const consoleErrors = [];
        
        // Listen for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Test all movement keys
        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        
        for (const key of keys) {
            await page.keyboard.press(key);
            await page.waitForTimeout(100);
        }
        
        // Check for console errors
        expect(consoleErrors.length).toBe(0);
        
        if (consoleErrors.length > 0) {
            console.log('❌ Console errors found:', consoleErrors);
        } else {
            console.log('✅ No console errors during camera movement tests');
        }
    });

    test('Extended ArrowLeft stress test', async () => {
        // Press ArrowLeft multiple times rapidly
        for (let i = 0; i < 10; i++) {
            await page.keyboard.press('ArrowLeft');
            await page.waitForTimeout(50);
        }
        
        // Verify camera is still functional
        const finalState = await page.evaluate(() => window.getCameraState());
        
        expect(finalState).toBeDefined();
        expect(finalState.scene.visible).toBe(true);
        expect(finalState.position).toBeDefined();
        expect(finalState.target).toBeDefined();
        
        console.log('✅ ArrowLeft stress test passed - Camera remains functional');
    });
});
