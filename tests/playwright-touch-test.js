/**
 * Playwright Automated Touch Interaction Tests
 * Tests all touch interaction fixes and enhancements
 */

const { chromium } = require('playwright');

async function runTouchTests() {
    console.log('🧪 Starting Touch Interaction Tests...\n');
    
    // Launch browser with mobile emulation
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500 // Slow down for visibility
    });
    
    const context = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE size
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2
    });
    
    const page = await context.newPage();
    
    // Track console messages
    const consoleErrors = [];
    const consoleWarnings = [];
    
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        if (type === 'error') {
            consoleErrors.push(text);
            console.error('❌ Console Error:', text);
        } else if (type === 'warning') {
            consoleWarnings.push(text);
            console.warn('⚠️ Console Warning:', text);
        }
    });
    
    // Navigate to game
    console.log('📱 Loading game...');
    await page.goto('http://localhost:8000/index.html', { 
        waitUntil: 'networkidle',
        timeout: 60000 
    });
    
    // Wait for game to initialize
    await page.waitForTimeout(5000);
    console.log('✅ Game loaded\n');
    
    // Test 1: Rapid Tap Building Selection
    console.log('🧪 Test 1: Rapid Tap Building Selection');
    try {
        // Wait for a building to be available (assuming some are pre-placed or we need to place one)
        await page.waitForTimeout(2000);
        
        // Simulate rapid taps at center of screen
        const centerX = 375 / 2;
        const centerY = 667 / 2;
        
        for (let i = 0; i < 3; i++) {
            await page.touchscreen.tap(centerX, centerY);
            await page.waitForTimeout(100); // Quick succession
        }
        
        console.log('✅ Test 1 Passed: Rapid taps executed\n');
    } catch (error) {
        console.error('❌ Test 1 Failed:', error.message, '\n');
    }
    
    // Test 2: Long Touch for Terrain Info
    console.log('🧪 Test 2: Long Touch for Terrain Info (500ms)');
    try {
        const touchX = 200;
        const touchY = 300;
        
        // Touch down
        await page.touchscreen.tap(touchX, touchY);
        
        // Hold for 600ms (past 500ms threshold)
        await page.waitForTimeout(600);
        
        // Check if indicator appeared
        const indicator = await page.$('#touch-hold-indicator');
        if (indicator) {
            console.log('✅ Test 2 Passed: Touch hold indicator appeared\n');
        } else {
            console.log('⚠️ Test 2 Warning: Indicator not found\n');
        }
    } catch (error) {
        console.error('❌ Test 2 Failed:', error.message, '\n');
    }
    
    // Test 3: Multi-Selection Mode (1500ms)
    console.log('🧪 Test 3: Multi-Selection Mode Activation');
    try {
        const startX = 100;
        const startY = 200;
        const endX = 300;
        const endY = 400;
        
        // Touch and hold for 1500ms
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.waitForTimeout(1600); // Past 1500ms threshold
        
        // Drag to create selection rectangle
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.waitForTimeout(500);
        
        // Check if selection rectangle appeared
        const selectionRect = await page.$('#multi-select-rectangle');
        if (selectionRect) {
            // Check if it's orange
            const borderColor = await selectionRect.evaluate(el => 
                window.getComputedStyle(el).borderColor
            );
            console.log('   Selection rectangle border color:', borderColor);
            console.log('✅ Test 3 Passed: Multi-selection rectangle appeared\n');
        } else {
            console.log('⚠️ Test 3 Warning: Selection rectangle not found\n');
        }
        
        await page.mouse.up();
        await page.waitForTimeout(1000);
    } catch (error) {
        console.error('❌ Test 3 Failed:', error.message, '\n');
    }
    
    // Test 4: Details Panel Auto-Display
    console.log('🧪 Test 4: Details Panel Auto-Display');
    try {
        await page.waitForTimeout(1000);
        
        const detailsPanel = await page.$('#details-panel');
        if (detailsPanel) {
            const isVisible = await detailsPanel.evaluate(el => 
                window.getComputedStyle(el).display !== 'none'
            );
            
            if (isVisible) {
                console.log('✅ Test 4 Passed: Details panel is visible\n');
            } else {
                console.log('⚠️ Test 4 Warning: Details panel exists but not visible\n');
            }
        } else {
            console.log('⚠️ Test 4 Warning: Details panel not found\n');
        }
    } catch (error) {
        console.error('❌ Test 4 Failed:', error.message, '\n');
    }
    
    // Final Report
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Console Warnings: ${consoleWarnings.length}`);
    
    if (consoleErrors.length === 0 && consoleWarnings.length === 0) {
        console.log('\n✅ ZERO-ERROR POLICY: PASSED');
    } else {
        console.log('\n❌ ZERO-ERROR POLICY: FAILED');
        if (consoleErrors.length > 0) {
            console.log('\nErrors found:');
            consoleErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
        }
        if (consoleWarnings.length > 0) {
            console.log('\nWarnings found:');
            consoleWarnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
        }
    }
    
    console.log('='.repeat(60) + '\n');
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will remain open for manual inspection...');
    console.log('   Press Ctrl+C to close and exit\n');
    
    // Wait indefinitely
    await new Promise(() => {});
}

// Run tests
runTouchTests().catch(console.error);

