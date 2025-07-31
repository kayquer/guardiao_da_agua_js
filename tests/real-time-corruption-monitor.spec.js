/**
 * REAL-TIME CAMERA CORRUPTION MONITORING TEST
 * 
 * This test runs the game for an extended period while continuously monitoring
 * for camera corruption. It simulates real gameplay scenarios and catches
 * corruption the moment it occurs, providing detailed forensic information.
 */

const { test, expect } = require('@playwright/test');

test.describe('Real-Time Camera Corruption Monitoring', () => {
  let page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await page.waitForFunction(() => window.gameManager && window.gameManager.camera);
  });

  test('should monitor camera corruption during extended gameplay', async () => {
    // Set up comprehensive monitoring
    await setupRealTimeMonitoring(page);
    
    // Run extended gameplay simulation
    await runExtendedGameplaySimulation(page);
    
    // Analyze results
    const monitoringResults = await page.evaluate(() => window.corruptionMonitor.getResults());
    
    console.log('📊 MONITORING RESULTS:');
    console.log(`Total Frames Monitored: ${monitoringResults.totalFrames}`);
    console.log(`Corruption Events: ${monitoringResults.corruptionEvents.length}`);
    console.log(`Camera Operations: ${monitoringResults.cameraOperations.length}`);
    console.log(`Mathematical Operations: ${monitoringResults.mathOperations.length}`);
    
    if (monitoringResults.corruptionEvents.length > 0) {
      console.error('🚨 CORRUPTION DETECTED DURING MONITORING:');
      monitoringResults.corruptionEvents.forEach((event, index) => {
        console.error(`\nCorruption Event ${index + 1}:`);
        console.error(`  Type: ${event.type}`);
        console.error(`  Timestamp: ${new Date(event.timestamp).toISOString()}`);
        console.error(`  Frame: ${event.frame}`);
        console.error(`  Details:`, event.details);
        
        if (event.precedingOperations) {
          console.error(`  Preceding Operations (last 10):`);
          event.precedingOperations.forEach(op => {
            console.error(`    - ${op.type}: ${op.description} (frame ${op.frame})`);
          });
        }
      });
      
      // Fail the test to trigger investigation
      expect(monitoringResults.corruptionEvents.length).toBe(0);
    }
    
    // Verify final camera state
    const finalState = await page.evaluate(() => {
      const camera = window.gameManager.camera;
      return {
        alpha: camera.alpha,
        beta: camera.beta,
        radius: camera.radius,
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: camera.getTarget ? { x: camera.getTarget().x, y: camera.getTarget().y, z: camera.getTarget().z } : null
      };
    });
    
    console.log('📷 Final Camera State:', finalState);
    
    // Validate final state
    expect(isFinite(finalState.alpha)).toBe(true);
    expect(isFinite(finalState.beta)).toBe(true);
    expect(isFinite(finalState.radius)).toBe(true);
    expect(isFinite(finalState.position.x)).toBe(true);
    expect(isFinite(finalState.position.y)).toBe(true);
    expect(isFinite(finalState.position.z)).toBe(true);
  });

  async function setupRealTimeMonitoring(page) {
    await page.evaluate(() => {
      // Create comprehensive monitoring system
      window.corruptionMonitor = {
        frameCount: 0,
        corruptionEvents: [],
        cameraOperations: [],
        mathOperations: [],
        lastCameraState: null,
        
        // Monitor every frame
        monitorFrame() {
          this.frameCount++;
          
          if (!window.gameManager || !window.gameManager.camera) return;
          
          const camera = window.gameManager.camera;
          const currentState = {
            frame: this.frameCount,
            timestamp: Date.now(),
            alpha: camera.alpha,
            beta: camera.beta,
            radius: camera.radius,
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            target: camera.getTarget ? { x: camera.getTarget().x, y: camera.getTarget().y, z: camera.getTarget().z } : null
          };
          
          // Check for corruption
          const corruption = this.detectCorruption(currentState);
          if (corruption) {
            this.recordCorruption(corruption, currentState);
          }
          
          this.lastCameraState = currentState;
        },
        
        // Detect various types of corruption
        detectCorruption(state) {
          const corruptions = [];
          
          // Check for NaN values
          if (isNaN(state.alpha)) corruptions.push({ type: 'NaN_ALPHA', value: state.alpha });
          if (isNaN(state.beta)) corruptions.push({ type: 'NaN_BETA', value: state.beta });
          if (isNaN(state.radius)) corruptions.push({ type: 'NaN_RADIUS', value: state.radius });
          if (isNaN(state.position.x)) corruptions.push({ type: 'NaN_POSITION_X', value: state.position.x });
          if (isNaN(state.position.y)) corruptions.push({ type: 'NaN_POSITION_Y', value: state.position.y });
          if (isNaN(state.position.z)) corruptions.push({ type: 'NaN_POSITION_Z', value: state.position.z });
          
          // Check for Infinity values
          if (!isFinite(state.alpha)) corruptions.push({ type: 'INFINITE_ALPHA', value: state.alpha });
          if (!isFinite(state.beta)) corruptions.push({ type: 'INFINITE_BETA', value: state.beta });
          if (!isFinite(state.radius)) corruptions.push({ type: 'INFINITE_RADIUS', value: state.radius });
          if (!isFinite(state.position.x)) corruptions.push({ type: 'INFINITE_POSITION_X', value: state.position.x });
          if (!isFinite(state.position.y)) corruptions.push({ type: 'INFINITE_POSITION_Y', value: state.position.y });
          if (!isFinite(state.position.z)) corruptions.push({ type: 'INFINITE_POSITION_Z', value: state.position.z });
          
          // Check for extreme values
          if (Math.abs(state.alpha) > 10) corruptions.push({ type: 'EXTREME_ALPHA', value: state.alpha });
          if (Math.abs(state.beta) > 10) corruptions.push({ type: 'EXTREME_BETA', value: state.beta });
          if (state.radius > 1000 || state.radius < 0) corruptions.push({ type: 'EXTREME_RADIUS', value: state.radius });
          
          return corruptions.length > 0 ? corruptions : null;
        },
        
        // Record corruption with context
        recordCorruption(corruptions, currentState) {
          const event = {
            timestamp: Date.now(),
            frame: this.frameCount,
            type: 'CAMERA_CORRUPTION',
            corruptions: corruptions,
            currentState: currentState,
            previousState: this.lastCameraState,
            details: {
              stateChange: this.lastCameraState ? this.calculateStateChange(this.lastCameraState, currentState) : null,
              stackTrace: new Error().stack
            },
            precedingOperations: this.cameraOperations.slice(-10) // Last 10 operations
          };
          
          this.corruptionEvents.push(event);
          console.error('🚨 REAL-TIME CORRUPTION DETECTED:', event);
        },
        
        // Calculate what changed between states
        calculateStateChange(prev, curr) {
          return {
            alphaDelta: curr.alpha - prev.alpha,
            betaDelta: curr.beta - prev.beta,
            radiusDelta: curr.radius - prev.radius,
            positionDelta: {
              x: curr.position.x - prev.position.x,
              y: curr.position.y - prev.position.y,
              z: curr.position.z - prev.position.z
            }
          };
        },
        
        // Record camera operations
        recordOperation(type, description, details = {}) {
          this.cameraOperations.push({
            timestamp: Date.now(),
            frame: this.frameCount,
            type: type,
            description: description,
            details: details
          });
        },
        
        // Record mathematical operations
        recordMathOperation(operation, inputs, output) {
          this.mathOperations.push({
            timestamp: Date.now(),
            frame: this.frameCount,
            operation: operation,
            inputs: inputs,
            output: output,
            isValidOutput: !isNaN(output) && isFinite(output)
          });
        },
        
        // Get monitoring results
        getResults() {
          return {
            totalFrames: this.frameCount,
            corruptionEvents: this.corruptionEvents,
            cameraOperations: this.cameraOperations,
            mathOperations: this.mathOperations
          };
        }
      };
      
      // Hook into the render loop
      const originalRender = window.gameManager.render;
      window.gameManager.render = function(currentTime) {
        window.corruptionMonitor.monitorFrame();
        return originalRender.call(this, currentTime);
      };
      
      // Hook into camera operations
      const originalPanCamera = window.gameManager.panIsometricCamera;
      window.gameManager.panIsometricCamera = function(deltaX, deltaY) {
        window.corruptionMonitor.recordOperation('PAN_CAMERA', `deltaX: ${deltaX}, deltaY: ${deltaY}`, { deltaX, deltaY });
        return originalPanCamera.call(this, deltaX, deltaY);
      };
      
      const originalScreenToWorld = window.gameManager.screenToIsometricWorld;
      window.gameManager.screenToIsometricWorld = function(deltaX, deltaY, sensitivity) {
        const result = originalScreenToWorld.call(this, deltaX, deltaY, sensitivity);
        window.corruptionMonitor.recordOperation('SCREEN_TO_WORLD', `deltaX: ${deltaX}, deltaY: ${deltaY}, sensitivity: ${sensitivity}`, {
          inputs: { deltaX, deltaY, sensitivity },
          output: result
        });
        return result;
      };
      
      // Hook into mathematical operations
      const originalMathOperations = ['sin', 'cos', 'atan2', 'sqrt'];
      originalMathOperations.forEach(op => {
        const original = Math[op];
        Math[op] = function(...args) {
          const result = original.apply(Math, args);
          window.corruptionMonitor.recordMathOperation(op, args, result);
          return result;
        };
      });
      
      console.log('✅ Real-time corruption monitoring activated');
    });
  }

  async function runExtendedGameplaySimulation(page) {
    console.log('🎮 Starting Extended Gameplay Simulation...');
    
    const simulationDuration = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < simulationDuration) {
      // Simulate various user interactions
      await simulateRandomCameraMovement(page);
      await page.waitForTimeout(100);
      
      await simulateZoomOperations(page);
      await page.waitForTimeout(100);
      
      await simulateEdgeScrolling(page);
      await page.waitForTimeout(100);
      
      await simulateCameraReset(page);
      await page.waitForTimeout(200);
    }
    
    console.log('✅ Extended Gameplay Simulation Completed');
  }

  async function simulateRandomCameraMovement(page) {
    const startX = 400 + Math.random() * 400;
    const startY = 200 + Math.random() * 400;
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // Random movement pattern
    for (let i = 0; i < 10; i++) {
      const newX = startX + (Math.random() - 0.5) * 200;
      const newY = startY + (Math.random() - 0.5) * 200;
      await page.mouse.move(newX, newY);
      await page.waitForTimeout(20);
    }
    
    await page.mouse.up();
  }

  async function simulateZoomOperations(page) {
    const zoomCount = 3 + Math.random() * 5;
    for (let i = 0; i < zoomCount; i++) {
      const direction = Math.random() > 0.5 ? 120 : -120;
      await page.mouse.wheel(0, direction);
      await page.waitForTimeout(50);
    }
  }

  async function simulateEdgeScrolling(page) {
    const edges = [
      { x: 5, y: 360 },    // Left edge
      { x: 1275, y: 360 }, // Right edge
      { x: 640, y: 5 },    // Top edge
      { x: 640, y: 715 }   // Bottom edge
    ];
    
    const edge = edges[Math.floor(Math.random() * edges.length)];
    await page.mouse.move(edge.x, edge.y);
    await page.waitForTimeout(300);
  }

  async function simulateCameraReset(page) {
    if (Math.random() > 0.7) { // 30% chance
      await page.evaluate(() => {
        if (window.gameManager && window.gameManager.centerCameraOnCityHall) {
          window.gameManager.centerCameraOnCityHall();
        }
      });
    }
  }
});
