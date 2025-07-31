/**
 * CRITICAL CAMERA CORRUPTION DETECTION TEST SUITE
 * 
 * This test suite is specifically designed to detect and identify the root cause
 * of camera corruption issues where Alpha: Infinity and Position: NaN occur.
 * 
 * The tests monitor camera state in real-time and catch corruption at the source
 * before it reaches the render loop at GameManager.js:1720:19
 */

const { test, expect } = require('@playwright/test');

test.describe('Camera Corruption Detection', () => {
  let page;
  let gameManager;
  let corruptionDetected = false;
  let corruptionDetails = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the game
    await page.goto('/');
    
    // Wait for game initialization
    await page.waitForFunction(() => window.gameManager && window.gameManager.camera);
    
    // Get reference to game manager
    gameManager = await page.evaluateHandle(() => window.gameManager);
    
    // Reset corruption tracking
    corruptionDetected = false;
    corruptionDetails = [];
    
    // Set up real-time camera monitoring
    await setupCameraMonitoring(page);
  });

  /**
   * Set up comprehensive camera state monitoring
   */
  async function setupCameraMonitoring(page) {
    await page.evaluate(() => {
      // Store original validation functions to monitor calls
      const originalValidateWithBreaker = window.gameManager.validateCameraStateWithBreaker;
      const originalValidateState = window.gameManager.validateCameraState;
      
      // Track all camera operations
      window.cameraOperationLog = [];
      window.corruptionEvents = [];
      
      // Enhanced validation wrapper
      window.gameManager.validateCameraStateWithBreaker = function() {
        const result = originalValidateWithBreaker.call(this);
        
        if (!result) {
          const corruptionEvent = {
            timestamp: Date.now(),
            type: 'CIRCUIT_BREAKER_TRIGGERED',
            cameraState: this.camera ? {
              alpha: this.camera.alpha,
              beta: this.camera.beta,
              radius: this.camera.radius,
              position: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
              },
              target: this.camera.getTarget ? {
                x: this.camera.getTarget().x,
                y: this.camera.getTarget().y,
                z: this.camera.getTarget().z
              } : null
            } : null,
            stackTrace: new Error().stack,
            renderState: this.renderState ? {
              corruptionCount: this.renderState.corruptionCount,
              lastCorruptionTime: this.renderState.lastCorruptionTime,
              circuitBreakerActive: this.renderState.circuitBreakerActive
            } : null
          };
          
          window.corruptionEvents.push(corruptionEvent);
          console.error('🚨 CORRUPTION DETECTED IN TEST:', corruptionEvent);
        }
        
        return result;
      };
      
      // Monitor all camera property changes
      if (window.gameManager.camera) {
        const camera = window.gameManager.camera;
        
        // Create property watchers
        ['alpha', 'beta', 'radius'].forEach(prop => {
          let currentValue = camera[prop];
          
          Object.defineProperty(camera, `_${prop}`, {
            value: currentValue,
            writable: true
          });
          
          Object.defineProperty(camera, prop, {
            get() {
              return this[`_${prop}`];
            },
            set(newValue) {
              const oldValue = this[`_${prop}`];
              
              // Log the change
              window.cameraOperationLog.push({
                timestamp: Date.now(),
                property: prop,
                oldValue: oldValue,
                newValue: newValue,
                isValid: window.gameManager.isValidNumber ? window.gameManager.isValidNumber(newValue) : !isNaN(newValue) && isFinite(newValue),
                stackTrace: new Error().stack
              });
              
              // Check for corruption
              if (isNaN(newValue) || !isFinite(newValue)) {
                const corruptionEvent = {
                  timestamp: Date.now(),
                  type: 'PROPERTY_CORRUPTION',
                  property: prop,
                  oldValue: oldValue,
                  newValue: newValue,
                  stackTrace: new Error().stack
                };
                
                window.corruptionEvents.push(corruptionEvent);
                console.error('🚨 PROPERTY CORRUPTION DETECTED:', corruptionEvent);
              }
              
              this[`_${prop}`] = newValue;
            }
          });
        });
      }
      
      // Monitor position changes
      if (window.gameManager.camera && window.gameManager.camera.position) {
        const position = window.gameManager.camera.position;
        
        ['x', 'y', 'z'].forEach(coord => {
          let currentValue = position[coord];
          
          Object.defineProperty(position, `_${coord}`, {
            value: currentValue,
            writable: true
          });
          
          Object.defineProperty(position, coord, {
            get() {
              return this[`_${coord}`];
            },
            set(newValue) {
              const oldValue = this[`_${coord}`];
              
              // Log the change
              window.cameraOperationLog.push({
                timestamp: Date.now(),
                property: `position.${coord}`,
                oldValue: oldValue,
                newValue: newValue,
                isValid: !isNaN(newValue) && isFinite(newValue),
                stackTrace: new Error().stack
              });
              
              // Check for corruption
              if (isNaN(newValue) || !isFinite(newValue)) {
                const corruptionEvent = {
                  timestamp: Date.now(),
                  type: 'POSITION_CORRUPTION',
                  property: `position.${coord}`,
                  oldValue: oldValue,
                  newValue: newValue,
                  stackTrace: new Error().stack
                };
                
                window.corruptionEvents.push(corruptionEvent);
                console.error('🚨 POSITION CORRUPTION DETECTED:', corruptionEvent);
              }
              
              this[`_${coord}`] = newValue;
            }
          });
        });
      }
    });
  }

  test('should detect camera corruption during normal gameplay', async () => {
    // Wait for game to be fully loaded
    await page.waitForTimeout(2000);
    
    // Perform various camera operations that might trigger corruption
    await performCameraStressTest(page);
    
    // Check for corruption events
    const corruptionEvents = await page.evaluate(() => window.corruptionEvents || []);
    const operationLog = await page.evaluate(() => window.cameraOperationLog || []);
    
    console.log('📊 Camera Operations Logged:', operationLog.length);
    console.log('🚨 Corruption Events Detected:', corruptionEvents.length);
    
    if (corruptionEvents.length > 0) {
      console.error('CORRUPTION DETAILS:', JSON.stringify(corruptionEvents, null, 2));
      
      // Analyze the corruption pattern
      await analyzeCorrectionPattern(corruptionEvents, operationLog);
      
      // This test should fail if corruption is detected so we can analyze it
      expect(corruptionEvents.length).toBe(0);
    }
    
    // Verify camera state is valid at the end
    const finalCameraState = await page.evaluate(() => {
      if (!window.gameManager || !window.gameManager.camera) return null;
      
      const camera = window.gameManager.camera;
      return {
        alpha: camera.alpha,
        beta: camera.beta,
        radius: camera.radius,
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z
        },
        target: camera.getTarget ? {
          x: camera.getTarget().x,
          y: camera.getTarget().y,
          z: camera.getTarget().z
        } : null
      };
    });
    
    console.log('📷 Final Camera State:', finalCameraState);
    
    // Validate final state
    if (finalCameraState) {
      expect(isFinite(finalCameraState.alpha)).toBe(true);
      expect(isFinite(finalCameraState.beta)).toBe(true);
      expect(isFinite(finalCameraState.radius)).toBe(true);
      expect(isFinite(finalCameraState.position.x)).toBe(true);
      expect(isFinite(finalCameraState.position.y)).toBe(true);
      expect(isFinite(finalCameraState.position.z)).toBe(true);
    }
  });

  /**
   * Perform comprehensive camera stress testing
   */
  async function performCameraStressTest(page) {
    console.log('🧪 Starting Camera Stress Test...');
    
    // Test 1: Rapid mouse movements
    await page.mouse.move(640, 360);
    await page.mouse.down();
    
    for (let i = 0; i < 50; i++) {
      await page.mouse.move(640 + Math.sin(i * 0.1) * 100, 360 + Math.cos(i * 0.1) * 100);
      await page.waitForTimeout(10);
    }
    
    await page.mouse.up();
    await page.waitForTimeout(100);
    
    // Test 2: Rapid zoom operations
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(50);
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(50);
    }
    
    // Test 3: Edge scrolling simulation
    await page.mouse.move(10, 360); // Left edge
    await page.waitForTimeout(500);
    await page.mouse.move(1270, 360); // Right edge
    await page.waitForTimeout(500);
    await page.mouse.move(640, 10); // Top edge
    await page.waitForTimeout(500);
    await page.mouse.move(640, 710); // Bottom edge
    await page.waitForTimeout(500);
    
    // Test 4: Rapid camera resets
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        if (window.gameManager && window.gameManager.centerCameraOnCityHall) {
          window.gameManager.centerCameraOnCityHall();
        }
      });
      await page.waitForTimeout(100);
    }
    
    console.log('✅ Camera Stress Test Completed');
  }

  /**
   * Analyze corruption patterns to identify root cause
   */
  async function analyzeCorrectionPattern(corruptionEvents, operationLog) {
    console.log('🔍 ANALYZING CORRUPTION PATTERN...');
    
    // Group corruption events by type
    const corruptionByType = {};
    corruptionEvents.forEach(event => {
      if (!corruptionByType[event.type]) {
        corruptionByType[event.type] = [];
      }
      corruptionByType[event.type].push(event);
    });
    
    console.log('📊 Corruption Events by Type:', Object.keys(corruptionByType).map(type => ({
      type,
      count: corruptionByType[type].length
    })));
    
    // Find operations that preceded corruption
    corruptionEvents.forEach((corruption, index) => {
      console.log(`\n🚨 CORRUPTION EVENT ${index + 1}:`);
      console.log('Type:', corruption.type);
      console.log('Timestamp:', new Date(corruption.timestamp).toISOString());
      
      if (corruption.property) {
        console.log('Property:', corruption.property);
        console.log('Old Value:', corruption.oldValue);
        console.log('New Value:', corruption.newValue);
      }
      
      // Find recent operations before this corruption
      const recentOps = operationLog.filter(op => 
        op.timestamp <= corruption.timestamp && 
        op.timestamp > corruption.timestamp - 1000 // 1 second before
      );
      
      console.log('Recent Operations (1s before corruption):');
      recentOps.forEach(op => {
        console.log(`  - ${op.property}: ${op.oldValue} → ${op.newValue} (valid: ${op.isValid})`);
      });
      
      // Extract stack trace for analysis
      if (corruption.stackTrace) {
        const stackLines = corruption.stackTrace.split('\n').slice(1, 6); // First 5 stack frames
        console.log('Stack Trace (top 5 frames):');
        stackLines.forEach(line => console.log(`  ${line.trim()}`));
      }
    });
  }
});
