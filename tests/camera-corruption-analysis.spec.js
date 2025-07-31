/**
 * COMPREHENSIVE CAMERA CORRUPTION ANALYSIS TEST SUITE
 * 
 * This test suite runs comprehensive analysis to identify the exact root cause
 * of camera corruption. It combines all testing approaches and provides
 * detailed forensic analysis of the corruption patterns.
 */

const { test, expect } = require('@playwright/test');

test.describe('Camera Corruption Root Cause Analysis', () => {
  let page;
  let analysisResults = {
    corruptionEvents: [],
    operationSequences: [],
    mathematicalAnomalies: [],
    stackTracePatterns: [],
    timingAnalysis: []
  };

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await page.waitForFunction(() => window.gameManager && window.gameManager.camera);
    
    // Reset analysis results
    analysisResults = {
      corruptionEvents: [],
      operationSequences: [],
      mathematicalAnomalies: [],
      stackTracePatterns: [],
      timingAnalysis: []
    };
  });

  test('should perform comprehensive root cause analysis', async () => {
    console.log('🔍 STARTING COMPREHENSIVE ROOT CAUSE ANALYSIS...');
    
    // Set up forensic monitoring
    await setupForensicMonitoring(page);
    
    // Run targeted corruption scenarios
    await runCorruptionScenarios(page);
    
    // Collect and analyze results
    const forensicData = await page.evaluate(() => window.forensicMonitor.getForensicData());
    
    // Perform comprehensive analysis
    const analysis = await performRootCauseAnalysis(forensicData);
    
    console.log('📊 ROOT CAUSE ANALYSIS RESULTS:');
    console.log('='.repeat(50));
    
    if (analysis.corruptionFound) {
      console.error('🚨 CORRUPTION DETECTED - DETAILED ANALYSIS:');
      console.error(`Total Corruption Events: ${analysis.totalCorruptions}`);
      console.error(`Most Common Corruption Type: ${analysis.mostCommonType}`);
      console.error(`Primary Root Cause: ${analysis.primaryRootCause}`);
      console.error(`Corruption Trigger Pattern: ${analysis.triggerPattern}`);
      
      console.error('\n📋 DETAILED FINDINGS:');
      analysis.findings.forEach((finding, index) => {
        console.error(`\n${index + 1}. ${finding.category}:`);
        console.error(`   Description: ${finding.description}`);
        console.error(`   Evidence: ${finding.evidence}`);
        console.error(`   Confidence: ${finding.confidence}%`);
        console.error(`   Recommendation: ${finding.recommendation}`);
      });
      
      console.error('\n🔧 RECOMMENDED FIXES:');
      analysis.recommendedFixes.forEach((fix, index) => {
        console.error(`\n${index + 1}. ${fix.priority} Priority: ${fix.title}`);
        console.error(`   Location: ${fix.location}`);
        console.error(`   Action: ${fix.action}`);
        console.error(`   Expected Impact: ${fix.expectedImpact}`);
      });
      
      // Fail the test to ensure the corruption is addressed
      expect(analysis.corruptionFound).toBe(false);
    } else {
      console.log('✅ NO CORRUPTION DETECTED - SYSTEM APPEARS STABLE');
      console.log(`Total Operations Monitored: ${analysis.totalOperations}`);
      console.log(`Mathematical Operations: ${analysis.mathOperations}`);
      console.log(`Camera State Changes: ${analysis.stateChanges}`);
    }
  });

  async function setupForensicMonitoring(page) {
    await page.evaluate(() => {
      window.forensicMonitor = {
        events: [],
        operations: [],
        stateHistory: [],
        mathOperations: [],
        stackTraces: [],
        
        // Record detailed events
        recordEvent(type, data) {
          const event = {
            timestamp: Date.now(),
            type: type,
            data: data,
            stackTrace: new Error().stack,
            cameraState: this.getCurrentCameraState()
          };
          
          this.events.push(event);
          
          // Keep only last 1000 events to prevent memory issues
          if (this.events.length > 1000) {
            this.events = this.events.slice(-1000);
          }
        },
        
        // Get current camera state
        getCurrentCameraState() {
          if (!window.gameManager || !window.gameManager.camera) return null;
          
          const camera = window.gameManager.camera;
          return {
            alpha: camera.alpha,
            beta: camera.beta,
            radius: camera.radius,
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            target: camera.getTarget ? { x: camera.getTarget().x, y: camera.getTarget().y, z: camera.getTarget().z } : null
          };
        },
        
        // Monitor mathematical operations
        monitorMathOperation(operation, inputs, result) {
          const isCorrupt = isNaN(result) || !isFinite(result);
          
          this.mathOperations.push({
            timestamp: Date.now(),
            operation: operation,
            inputs: inputs,
            result: result,
            isCorrupt: isCorrupt,
            stackTrace: isCorrupt ? new Error().stack : null
          });
          
          if (isCorrupt) {
            this.recordEvent('MATH_CORRUPTION', {
              operation: operation,
              inputs: inputs,
              result: result
            });
          }
        },
        
        // Get comprehensive forensic data
        getForensicData() {
          return {
            events: this.events,
            operations: this.operations,
            stateHistory: this.stateHistory,
            mathOperations: this.mathOperations,
            stackTraces: this.stackTraces
          };
        }
      };
      
      // Hook into all critical functions
      const gameManager = window.gameManager;
      
      // Monitor camera validation
      const originalValidateWithBreaker = gameManager.validateCameraStateWithBreaker;
      gameManager.validateCameraStateWithBreaker = function() {
        const result = originalValidateWithBreaker.call(this);
        
        if (!result) {
          window.forensicMonitor.recordEvent('VALIDATION_FAILURE', {
            function: 'validateCameraStateWithBreaker',
            cameraState: window.forensicMonitor.getCurrentCameraState()
          });
        }
        
        return result;
      };
      
      // Monitor screen to world conversion
      const originalScreenToWorld = gameManager.screenToIsometricWorld;
      gameManager.screenToIsometricWorld = function(deltaX, deltaY, sensitivity) {
        const inputs = { deltaX, deltaY, sensitivity };
        const result = originalScreenToWorld.call(this, deltaX, deltaY, sensitivity);
        
        window.forensicMonitor.recordEvent('SCREEN_TO_WORLD', {
          inputs: inputs,
          result: result ? { x: result.x, y: result.y, z: result.z } : null
        });
        
        // Check for corruption in result
        if (result && (isNaN(result.x) || isNaN(result.y) || isNaN(result.z) ||
                      !isFinite(result.x) || !isFinite(result.y) || !isFinite(result.z))) {
          window.forensicMonitor.recordEvent('SCREEN_TO_WORLD_CORRUPTION', {
            inputs: inputs,
            corruptResult: { x: result.x, y: result.y, z: result.z }
          });
        }
        
        return result;
      };
      
      // Monitor camera panning
      const originalPanCamera = gameManager.panIsometricCamera;
      gameManager.panIsometricCamera = function(deltaX, deltaY) {
        const beforeState = window.forensicMonitor.getCurrentCameraState();
        
        window.forensicMonitor.recordEvent('PAN_START', {
          deltaX: deltaX,
          deltaY: deltaY,
          beforeState: beforeState
        });
        
        const result = originalPanCamera.call(this, deltaX, deltaY);
        
        const afterState = window.forensicMonitor.getCurrentCameraState();
        
        window.forensicMonitor.recordEvent('PAN_END', {
          deltaX: deltaX,
          deltaY: deltaY,
          beforeState: beforeState,
          afterState: afterState
        });
        
        return result;
      };
      
      // Monitor angle enforcement
      const originalEnforceAngles = gameManager.enforceIsometricAngles;
      gameManager.enforceIsometricAngles = function() {
        const beforeState = window.forensicMonitor.getCurrentCameraState();
        
        window.forensicMonitor.recordEvent('ENFORCE_ANGLES_START', {
          beforeState: beforeState
        });
        
        const result = originalEnforceAngles.call(this);
        
        const afterState = window.forensicMonitor.getCurrentCameraState();
        
        window.forensicMonitor.recordEvent('ENFORCE_ANGLES_END', {
          beforeState: beforeState,
          afterState: afterState
        });
        
        return result;
      };
      
      // Monitor mathematical operations
      const mathFunctions = ['sin', 'cos', 'tan', 'atan2', 'sqrt', 'pow'];
      mathFunctions.forEach(funcName => {
        const original = Math[funcName];
        Math[funcName] = function(...args) {
          const result = original.apply(Math, args);
          window.forensicMonitor.monitorMathOperation(funcName, args, result);
          return result;
        };
      });
      
      console.log('🔬 Forensic monitoring system activated');
    });
  }

  async function runCorruptionScenarios(page) {
    console.log('🧪 Running Targeted Corruption Scenarios...');
    
    // Scenario 1: Rapid camera movements
    await runRapidMovementScenario(page);
    
    // Scenario 2: Extreme zoom operations
    await runExtremeZoomScenario(page);
    
    // Scenario 3: Edge case mathematical inputs
    await runMathematicalEdgeCaseScenario(page);
    
    // Scenario 4: Rapid state changes
    await runRapidStateChangeScenario(page);
    
    // Scenario 5: Memory pressure scenario
    await runMemoryPressureScenario(page);
  }

  async function runRapidMovementScenario(page) {
    console.log('  📱 Scenario 1: Rapid Camera Movements');
    
    await page.mouse.move(640, 360);
    await page.mouse.down();
    
    // Extremely rapid movements
    for (let i = 0; i < 100; i++) {
      const x = 640 + Math.sin(i * 0.5) * 300;
      const y = 360 + Math.cos(i * 0.5) * 200;
      await page.mouse.move(x, y);
      // No wait time - as fast as possible
    }
    
    await page.mouse.up();
    await page.waitForTimeout(100);
  }

  async function runExtremeZoomScenario(page) {
    console.log('  🔍 Scenario 2: Extreme Zoom Operations');
    
    // Rapid zoom in/out cycles
    for (let i = 0; i < 50; i++) {
      await page.mouse.wheel(0, 1000); // Extreme zoom out
      await page.mouse.wheel(0, -1000); // Extreme zoom in
    }
    
    await page.waitForTimeout(100);
  }

  async function runMathematicalEdgeCaseScenario(page) {
    console.log('  🧮 Scenario 3: Mathematical Edge Cases');
    
    await page.evaluate(() => {
      // Inject extreme values directly
      const gameManager = window.gameManager;
      
      // Test extreme sensitivity values
      if (gameManager.screenToIsometricWorld) {
        gameManager.screenToIsometricWorld(1, 1, Number.MAX_VALUE);
        gameManager.screenToIsometricWorld(Number.MAX_VALUE, 1, 1);
        gameManager.screenToIsometricWorld(1, Number.MAX_VALUE, 1);
        gameManager.screenToIsometricWorld(NaN, 1, 1);
        gameManager.screenToIsometricWorld(1, NaN, 1);
        gameManager.screenToIsometricWorld(1, 1, NaN);
        gameManager.screenToIsometricWorld(Infinity, 1, 1);
        gameManager.screenToIsometricWorld(1, Infinity, 1);
        gameManager.screenToIsometricWorld(1, 1, Infinity);
      }
    });
    
    await page.waitForTimeout(100);
  }

  async function runRapidStateChangeScenario(page) {
    console.log('  ⚡ Scenario 4: Rapid State Changes');
    
    // Rapid camera resets and movements
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        if (window.gameManager && window.gameManager.centerCameraOnCityHall) {
          window.gameManager.centerCameraOnCityHall();
        }
      });
      
      await page.mouse.move(640 + i * 10, 360 + i * 5);
      await page.mouse.down();
      await page.mouse.move(640 - i * 10, 360 - i * 5);
      await page.mouse.up();
    }
    
    await page.waitForTimeout(100);
  }

  async function runMemoryPressureScenario(page) {
    console.log('  💾 Scenario 5: Memory Pressure');
    
    // Create memory pressure by generating many objects
    await page.evaluate(() => {
      const objects = [];
      for (let i = 0; i < 10000; i++) {
        objects.push({
          vector: new BABYLON.Vector3(Math.random(), Math.random(), Math.random()),
          data: new Array(100).fill(Math.random())
        });
      }
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
    });
    
    await page.waitForTimeout(100);
  }

  async function performRootCauseAnalysis(forensicData) {
    console.log('🔬 Performing Root Cause Analysis...');
    
    const analysis = {
      corruptionFound: false,
      totalCorruptions: 0,
      mostCommonType: null,
      primaryRootCause: null,
      triggerPattern: null,
      findings: [],
      recommendedFixes: [],
      totalOperations: forensicData.events.length,
      mathOperations: forensicData.mathOperations.length,
      stateChanges: forensicData.stateHistory.length
    };
    
    // Analyze corruption events
    const corruptionEvents = forensicData.events.filter(event => 
      event.type.includes('CORRUPTION') || event.type.includes('VALIDATION_FAILURE')
    );
    
    if (corruptionEvents.length > 0) {
      analysis.corruptionFound = true;
      analysis.totalCorruptions = corruptionEvents.length;
      
      // Find most common corruption type
      const typeCount = {};
      corruptionEvents.forEach(event => {
        typeCount[event.type] = (typeCount[event.type] || 0) + 1;
      });
      
      analysis.mostCommonType = Object.keys(typeCount).reduce((a, b) => 
        typeCount[a] > typeCount[b] ? a : b
      );
      
      // Analyze patterns
      analysis.findings = analyzeCorruptionPatterns(corruptionEvents, forensicData);
      analysis.recommendedFixes = generateRecommendedFixes(analysis.findings);
      analysis.primaryRootCause = analysis.findings.length > 0 ? analysis.findings[0].category : 'Unknown';
    }
    
    return analysis;
  }

  function analyzeCorruptionPatterns(corruptionEvents, forensicData) {
    const findings = [];
    
    // Analyze mathematical corruption
    const mathCorruptions = forensicData.mathOperations.filter(op => op.isCorrupt);
    if (mathCorruptions.length > 0) {
      findings.push({
        category: 'Mathematical Operation Corruption',
        description: `${mathCorruptions.length} mathematical operations produced invalid results`,
        evidence: `Operations: ${mathCorruptions.map(op => op.operation).join(', ')}`,
        confidence: 95,
        recommendation: 'Add input validation to mathematical operations'
      });
    }
    
    // Analyze screen-to-world conversion issues
    const screenToWorldCorruptions = corruptionEvents.filter(event => 
      event.type === 'SCREEN_TO_WORLD_CORRUPTION'
    );
    if (screenToWorldCorruptions.length > 0) {
      findings.push({
        category: 'Screen-to-World Conversion Corruption',
        description: `${screenToWorldCorruptions.length} screen-to-world conversions produced NaN/Infinity`,
        evidence: 'Invalid results in coordinate transformation',
        confidence: 90,
        recommendation: 'Validate inputs to screenToIsometricWorld function'
      });
    }
    
    // Analyze validation failures
    const validationFailures = corruptionEvents.filter(event => 
      event.type === 'VALIDATION_FAILURE'
    );
    if (validationFailures.length > 0) {
      findings.push({
        category: 'Camera State Validation Failure',
        description: `${validationFailures.length} camera state validations failed`,
        evidence: 'Camera state became invalid during operations',
        confidence: 85,
        recommendation: 'Strengthen camera state validation and recovery'
      });
    }
    
    return findings;
  }

  function generateRecommendedFixes(findings) {
    const fixes = [];
    
    findings.forEach(finding => {
      switch (finding.category) {
        case 'Mathematical Operation Corruption':
          fixes.push({
            priority: 'HIGH',
            title: 'Add Mathematical Input Validation',
            location: 'GameManager.js - mathematical operations',
            action: 'Validate all inputs to Math functions before execution',
            expectedImpact: 'Prevent NaN/Infinity propagation from mathematical operations'
          });
          break;
          
        case 'Screen-to-World Conversion Corruption':
          fixes.push({
            priority: 'CRITICAL',
            title: 'Fix screenToIsometricWorld Function',
            location: 'GameManager.js - screenToIsometricWorld method',
            action: 'Add comprehensive input validation and safe fallbacks',
            expectedImpact: 'Eliminate coordinate transformation corruption'
          });
          break;
          
        case 'Camera State Validation Failure':
          fixes.push({
            priority: 'HIGH',
            title: 'Enhance Camera State Recovery',
            location: 'GameManager.js - camera validation methods',
            action: 'Improve recovery mechanisms and add preventive checks',
            expectedImpact: 'Better camera state stability and corruption prevention'
          });
          break;
      }
    });
    
    return fixes;
  }
});
