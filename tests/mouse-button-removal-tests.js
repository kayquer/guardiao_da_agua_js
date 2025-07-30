/**
 * Unit Tests for Complete Mouse Button 0 and 1 Event Removal
 * 
 * These tests verify that left mouse button (0) and middle mouse button (1) 
 * events are completely ignored by the GameManager event handling system.
 */

// Mock Babylon.js environment for testing
const mockBabylon = {
    PointerEventTypes: {
        POINTERDOWN: 1,
        POINTERUP: 2,
        POINTERMOVE: 4,
        POINTERWHEEL: 8,
        POINTERPICK: 16,
        POINTERTAP: 32,
        POINTERDOUBLETAP: 64
    }
};

// Mock console to capture logs
let consoleLogs = [];
const originalConsoleLog = console.log;
console.log = (...args) => {
    consoleLogs.push(args.join(' '));
    originalConsoleLog(...args);
};

// Mock GameManager class for testing
class MockGameManager {
    constructor() {
        this.gameState = 'playing';
        this.camera = { getTarget: () => ({ clone: () => ({}) }) };
        this.buildMode = false;
        this.currentBuildingType = null;
        this.buildingSystem = { previewMode: false };
        this.isometricCameraState = { isPanning: false };
        this.canvas = { focus: () => {} };
        this.debugLevel = 1;
    }

    // Copy the exact filtering logic from GameManager.js
    handlePointerEvent(pointerInfo) {
        if (this.gameState !== 'playing') return;

        // ===== COMPLETE REMOVAL: Filter out left mouse button (0) and middle mouse button (1) events =====
        const button = pointerInfo.event?.button;
        if (button === 0 || button === 1) {
            // Completely ignore left mouse button and middle mouse button events
            // No logging, no processing, no handling whatsoever
            return;
        }

        // Continue with normal processing for other buttons
        console.log(`🖱️ Pointer Event Processed:`, {
            button: button,
            eventType: pointerInfo.type,
            timestamp: Date.now()
        });

        // Simulate normal event processing
        switch (pointerInfo.type) {
            case mockBabylon.PointerEventTypes.POINTERDOWN:
                this.handlePointerDown(pointerInfo);
                break;
            case mockBabylon.PointerEventTypes.POINTERUP:
                this.handlePointerUp(pointerInfo);
                break;
        }
    }

    handlePointerDown(pointerInfo) {
        const button = pointerInfo.event?.button;

        // ===== COMPLETE REMOVAL: Filter out left mouse button (0) and middle mouse button (1) events =====
        if (button === 0 || button === 1) {
            // Completely ignore left mouse button and middle mouse button events
            return;
        }

        console.log(`🖱️ PointerDown Handler:`, {
            button: button,
            timestamp: Date.now()
        });
    }

    handlePointerUp(pointerInfo) {
        const button = pointerInfo.event?.button;

        // ===== COMPLETE REMOVAL: Filter out left mouse button (0) and middle mouse button (1) events =====
        if (button === 0 || button === 1) {
            // Completely ignore left mouse button and middle mouse button events
            return;
        }

        console.log(`🖱️ PointerUp Handler:`, {
            button: button,
            timestamp: Date.now()
        });
    }

    handleIsometricMouseDown(event) {
        if (!this.camera) return;

        // ===== COMPLETE REMOVAL: Filter out left mouse button (0) and middle mouse button (1) events =====
        if (event.button === 0 || event.button === 1) {
            // Completely ignore left mouse button and middle mouse button events
            return;
        }

        console.log(`🎮 Camera mouseDown:`, {
            button: event.button,
            timestamp: Date.now()
        });
    }

    handleIsometricMouseUp(event) {
        // ===== COMPLETE REMOVAL: Filter out left mouse button (0) and middle mouse button (1) events =====
        if (event.button === 0 || event.button === 1) {
            // Completely ignore left mouse button and middle mouse button events
            return;
        }

        console.log(`🎮 Camera mouseUp:`, {
            button: event.button,
            timestamp: Date.now()
        });
    }
}

// Test Suite
class MouseButtonRemovalTests {
    constructor() {
        this.gameManager = new MockGameManager();
        this.testResults = [];
    }

    clearLogs() {
        consoleLogs = [];
    }

    runTest(testName, testFunction) {
        this.clearLogs();
        console.log(`\n🧪 Running test: ${testName}`);
        
        try {
            const result = testFunction();
            if (result) {
                console.log(`✅ PASSED: ${testName}`);
                this.testResults.push({ name: testName, status: 'PASSED' });
            } else {
                console.log(`❌ FAILED: ${testName}`);
                this.testResults.push({ name: testName, status: 'FAILED' });
            }
        } catch (error) {
            console.log(`❌ ERROR: ${testName} - ${error.message}`);
            this.testResults.push({ name: testName, status: 'ERROR', error: error.message });
        }
    }

    // Test 1: Left mouse button (0) events should be completely ignored
    testLeftMouseButtonIgnored() {
        return this.runTest('Left Mouse Button (0) Events Ignored', () => {
            // Test POINTERDOWN with button 0
            this.gameManager.handlePointerEvent({
                type: mockBabylon.PointerEventTypes.POINTERDOWN,
                event: { button: 0 },
                pickInfo: { hit: true }
            });

            // Test POINTERUP with button 0
            this.gameManager.handlePointerEvent({
                type: mockBabylon.PointerEventTypes.POINTERUP,
                event: { button: 0 },
                pickInfo: { hit: true }
            });

            // Test direct mouse events with button 0
            this.gameManager.handleIsometricMouseDown({ button: 0, clientX: 100, clientY: 100 });
            this.gameManager.handleIsometricMouseUp({ button: 0 });

            // Verify NO logs were generated for button 0
            const hasButton0Logs = consoleLogs.some(log => 
                log.includes('button: 0') || 
                log.includes('button:0') ||
                log.includes('Pointer Event Processed') ||
                log.includes('PointerDown Handler') ||
                log.includes('PointerUp Handler') ||
                log.includes('Camera mouseDown') ||
                log.includes('Camera mouseUp')
            );

            return !hasButton0Logs; // Test passes if NO logs were generated
        });
    }

    // Test 2: Middle mouse button (1) events should be completely ignored
    testMiddleMouseButtonIgnored() {
        return this.runTest('Middle Mouse Button (1) Events Ignored', () => {
            // Test POINTERDOWN with button 1
            this.gameManager.handlePointerEvent({
                type: mockBabylon.PointerEventTypes.POINTERDOWN,
                event: { button: 1 },
                pickInfo: { hit: true }
            });

            // Test POINTERUP with button 1
            this.gameManager.handlePointerEvent({
                type: mockBabylon.PointerEventTypes.POINTERUP,
                event: { button: 1 },
                pickInfo: { hit: true }
            });

            // Test direct mouse events with button 1
            this.gameManager.handleIsometricMouseDown({ button: 1, clientX: 100, clientY: 100 });
            this.gameManager.handleIsometricMouseUp({ button: 1 });

            // Verify NO logs were generated for button 1
            const hasButton1Logs = consoleLogs.some(log => 
                log.includes('button: 1') || 
                log.includes('button:1') ||
                log.includes('Pointer Event Processed') ||
                log.includes('PointerDown Handler') ||
                log.includes('PointerUp Handler') ||
                log.includes('Camera mouseDown') ||
                log.includes('Camera mouseUp')
            );

            return !hasButton1Logs; // Test passes if NO logs were generated
        });
    }

    // Test 3: Right mouse button (2) events should still work
    testRightMouseButtonStillWorks() {
        return this.runTest('Right Mouse Button (2) Events Still Work', () => {
            // Test POINTERDOWN with button 2
            this.gameManager.handlePointerEvent({
                type: mockBabylon.PointerEventTypes.POINTERDOWN,
                event: { button: 2 },
                pickInfo: { hit: true }
            });

            // Verify logs were generated for button 2
            const hasButton2Logs = consoleLogs.some(log => 
                log.includes('button: 2') && 
                (log.includes('Pointer Event Processed') || log.includes('PointerDown Handler'))
            );

            return hasButton2Logs; // Test passes if logs were generated
        });
    }

    // Test 4: Verify no event processing occurs for buttons 0 and 1
    testNoEventProcessingForButtons0And1() {
        return this.runTest('No Event Processing for Buttons 0 and 1', () => {
            const initialLogCount = consoleLogs.length;

            // Send multiple events for buttons 0 and 1
            for (let i = 0; i < 10; i++) {
                this.gameManager.handlePointerEvent({
                    type: mockBabylon.PointerEventTypes.POINTERDOWN,
                    event: { button: 0 },
                    pickInfo: { hit: true }
                });

                this.gameManager.handlePointerEvent({
                    type: mockBabylon.PointerEventTypes.POINTERUP,
                    event: { button: 1 },
                    pickInfo: { hit: true }
                });
            }

            // Verify no new logs were added
            const finalLogCount = consoleLogs.length;
            return finalLogCount === initialLogCount;
        });
    }

    // Run all tests
    runAllTests() {
        console.log('🚀 Starting Mouse Button Removal Tests...\n');

        this.testLeftMouseButtonIgnored();
        this.testMiddleMouseButtonIgnored();
        this.testRightMouseButtonStillWorks();
        this.testNoEventProcessingForButtons0And1();

        // Print summary
        console.log('\n📊 Test Results Summary:');
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;
        const errors = this.testResults.filter(r => r.status === 'ERROR').length;

        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`💥 Errors: ${errors}`);
        console.log(`📈 Success Rate: ${(passed / this.testResults.length * 100).toFixed(1)}%`);

        return { passed, failed, errors, total: this.testResults.length };
    }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MouseButtonRemovalTests;
} else if (typeof window !== 'undefined') {
    window.MouseButtonRemovalTests = MouseButtonRemovalTests;
}

// Auto-run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    const tests = new MouseButtonRemovalTests();
    tests.runAllTests();
}
