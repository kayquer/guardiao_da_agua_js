/**
 * CAMERA MATHEMATICAL OPERATIONS VALIDATION TEST SUITE
 * 
 * This test suite focuses on validating all mathematical operations
 * that could lead to Alpha: Infinity and Position: NaN corruption.
 * 
 * Tests individual functions and edge cases that might cause mathematical overflow.
 */

const { test, expect } = require('@playwright/test');

test.describe('Camera Mathematical Operations Validation', () => {
  let page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await page.waitForFunction(() => window.gameManager && window.gameManager.camera);
  });

  test('should validate isValidNumber function with edge cases', async () => {
    const testResults = await page.evaluate(() => {
      const gameManager = window.gameManager;
      const testCases = [
        { value: 0, expected: true, description: 'zero' },
        { value: 1, expected: true, description: 'positive integer' },
        { value: -1, expected: true, description: 'negative integer' },
        { value: 3.14159, expected: true, description: 'positive float' },
        { value: -3.14159, expected: true, description: 'negative float' },
        { value: Number.MAX_VALUE, expected: true, description: 'max safe value' },
        { value: Number.MIN_VALUE, expected: true, description: 'min safe value' },
        { value: NaN, expected: false, description: 'NaN' },
        { value: Infinity, expected: false, description: 'positive infinity' },
        { value: -Infinity, expected: false, description: 'negative infinity' },
        { value: undefined, expected: false, description: 'undefined' },
        { value: null, expected: false, description: 'null' },
        { value: 'string', expected: false, description: 'string' },
        { value: {}, expected: false, description: 'object' },
        { value: [], expected: false, description: 'array' }
      ];

      const results = testCases.map(testCase => {
        const result = gameManager.isValidNumber(testCase.value);
        return {
          ...testCase,
          actual: result,
          passed: result === testCase.expected
        };
      });

      return results;
    });

    console.log('🧮 isValidNumber Test Results:');
    testResults.forEach(result => {
      console.log(`  ${result.passed ? '✅' : '❌'} ${result.description}: expected ${result.expected}, got ${result.actual}`);
      expect(result.passed).toBe(true);
    });
  });

  test('should validate isValidCameraAngle function with edge cases', async () => {
    const testResults = await page.evaluate(() => {
      const gameManager = window.gameManager;
      const testCases = [
        { value: 0, expected: true, description: 'zero angle' },
        { value: Math.PI, expected: true, description: 'pi radians' },
        { value: -Math.PI, expected: true, description: 'negative pi radians' },
        { value: Math.PI / 2, expected: true, description: 'pi/2 radians' },
        { value: 2 * Math.PI, expected: true, description: '2*pi radians' },
        { value: -2 * Math.PI, expected: true, description: '-2*pi radians' },
        { value: 10, expected: false, description: 'angle too large (10)' },
        { value: -10, expected: false, description: 'angle too small (-10)' },
        { value: 15, expected: false, description: 'angle way too large (15)' },
        { value: NaN, expected: false, description: 'NaN angle' },
        { value: Infinity, expected: false, description: 'infinite angle' },
        { value: -Infinity, expected: false, description: 'negative infinite angle' }
      ];

      const results = testCases.map(testCase => {
        const result = gameManager.isValidCameraAngle(testCase.value);
        return {
          ...testCase,
          actual: result,
          passed: result === testCase.expected
        };
      });

      return results;
    });

    console.log('📐 isValidCameraAngle Test Results:');
    testResults.forEach(result => {
      console.log(`  ${result.passed ? '✅' : '❌'} ${result.description}: expected ${result.expected}, got ${result.actual}`);
      expect(result.passed).toBe(true);
    });
  });

  test('should validate screenToIsometricWorld mathematical operations', async () => {
    const testResults = await page.evaluate(() => {
      const gameManager = window.gameManager;
      const testCases = [
        { deltaX: 0, deltaY: 0, sensitivity: 1, description: 'zero movement' },
        { deltaX: 10, deltaY: 10, sensitivity: 1, description: 'normal movement' },
        { deltaX: -10, deltaY: -10, sensitivity: 1, description: 'negative movement' },
        { deltaX: 100, deltaY: 100, sensitivity: 0.1, description: 'large movement, small sensitivity' },
        { deltaX: 1, deltaY: 1, sensitivity: 10, description: 'small movement, large sensitivity' },
        { deltaX: Number.MAX_VALUE, deltaY: 1, sensitivity: 1, description: 'extreme deltaX' },
        { deltaX: 1, deltaY: Number.MAX_VALUE, sensitivity: 1, description: 'extreme deltaY' },
        { deltaX: 1, deltaY: 1, sensitivity: Number.MAX_VALUE, description: 'extreme sensitivity' },
        { deltaX: NaN, deltaY: 1, sensitivity: 1, description: 'NaN deltaX' },
        { deltaX: 1, deltaY: NaN, sensitivity: 1, description: 'NaN deltaY' },
        { deltaX: 1, deltaY: 1, sensitivity: NaN, description: 'NaN sensitivity' },
        { deltaX: Infinity, deltaY: 1, sensitivity: 1, description: 'infinite deltaX' },
        { deltaX: 1, deltaY: Infinity, sensitivity: 1, description: 'infinite deltaY' },
        { deltaX: 1, deltaY: 1, sensitivity: Infinity, description: 'infinite sensitivity' }
      ];

      const results = testCases.map(testCase => {
        try {
          const result = gameManager.screenToIsometricWorld(testCase.deltaX, testCase.deltaY, testCase.sensitivity);
          
          const isValid = result && 
                         gameManager.isValidNumber(result.x) && 
                         gameManager.isValidNumber(result.y) && 
                         gameManager.isValidNumber(result.z);

          return {
            ...testCase,
            result: result ? { x: result.x, y: result.y, z: result.z } : null,
            isValid: isValid,
            error: null
          };
        } catch (error) {
          return {
            ...testCase,
            result: null,
            isValid: false,
            error: error.message
          };
        }
      });

      return results;
    });

    console.log('🌍 screenToIsometricWorld Test Results:');
    testResults.forEach(result => {
      const status = result.isValid ? '✅' : '❌';
      console.log(`  ${status} ${result.description}:`);
      if (result.result) {
        console.log(`    Result: x=${result.result.x}, y=${result.result.y}, z=${result.result.z}`);
      }
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
      
      // For invalid inputs, we expect the function to return a safe zero vector
      if (isNaN(result.deltaX) || isNaN(result.deltaY) || isNaN(result.sensitivity) ||
          !isFinite(result.deltaX) || !isFinite(result.deltaY) || !isFinite(result.sensitivity)) {
        expect(result.isValid).toBe(true); // Should return safe values, not crash
        if (result.result) {
          expect(result.result.x).toBe(0);
          expect(result.result.z).toBe(0);
        }
      } else {
        expect(result.isValid).toBe(true);
      }
    });
  });

  test('should validate camera angle enforcement operations', async () => {
    const testResults = await page.evaluate(() => {
      const gameManager = window.gameManager;
      
      // Test the angle enforcement logic
      const testCases = [
        { alpha: 0, beta: Math.PI / 3, description: 'normal angles' },
        { alpha: Math.PI * 2, beta: Math.PI / 3, description: 'alpha > 2π' },
        { alpha: -Math.PI * 2, beta: Math.PI / 3, description: 'alpha < -2π' },
        { alpha: 0, beta: Math.PI + 1, description: 'beta > π' },
        { alpha: 0, beta: -1, description: 'beta < 0' },
        { alpha: NaN, beta: Math.PI / 3, description: 'NaN alpha' },
        { alpha: 0, beta: NaN, description: 'NaN beta' },
        { alpha: Infinity, beta: Math.PI / 3, description: 'infinite alpha' },
        { alpha: 0, beta: Infinity, description: 'infinite beta' }
      ];

      const results = testCases.map(testCase => {
        try {
          // Store original values
          const originalAlpha = gameManager.camera.alpha;
          const originalBeta = gameManager.camera.beta;
          
          // Set test values
          gameManager.camera.alpha = testCase.alpha;
          gameManager.camera.beta = testCase.beta;
          
          // Call enforcement function
          gameManager.enforceIsometricAngles();
          
          // Check results
          const finalAlpha = gameManager.camera.alpha;
          const finalBeta = gameManager.camera.beta;
          
          const isValidFinal = gameManager.isValidCameraAngle(finalAlpha) && 
                              gameManager.isValidCameraAngle(finalBeta);
          
          // Restore original values
          gameManager.camera.alpha = originalAlpha;
          gameManager.camera.beta = originalBeta;
          
          return {
            ...testCase,
            finalAlpha: finalAlpha,
            finalBeta: finalBeta,
            isValidFinal: isValidFinal,
            error: null
          };
        } catch (error) {
          return {
            ...testCase,
            finalAlpha: null,
            finalBeta: null,
            isValidFinal: false,
            error: error.message
          };
        }
      });

      return results;
    });

    console.log('🔒 Camera Angle Enforcement Test Results:');
    testResults.forEach(result => {
      const status = result.isValidFinal ? '✅' : '❌';
      console.log(`  ${status} ${result.description}:`);
      console.log(`    Input: alpha=${result.alpha}, beta=${result.beta}`);
      console.log(`    Final: alpha=${result.finalAlpha}, beta=${result.finalBeta}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
      
      // The enforcement should always result in valid angles
      expect(result.isValidFinal).toBe(true);
    });
  });

  test('should validate camera target calculations', async () => {
    const testResults = await page.evaluate(() => {
      const gameManager = window.gameManager;
      
      // Test camera target operations that might cause corruption
      const testCases = [
        { x: 0, y: 0, z: 0, description: 'origin target' },
        { x: 20, y: 0, z: 20, description: 'normal target' },
        { x: -20, y: 0, z: -20, description: 'negative coordinates' },
        { x: 1000, y: 0, z: 1000, description: 'large coordinates' },
        { x: Number.MAX_VALUE, y: 0, z: 0, description: 'extreme X coordinate' },
        { x: 0, y: Number.MAX_VALUE, z: 0, description: 'extreme Y coordinate' },
        { x: 0, y: 0, z: Number.MAX_VALUE, description: 'extreme Z coordinate' },
        { x: NaN, y: 0, z: 0, description: 'NaN X coordinate' },
        { x: 0, y: NaN, z: 0, description: 'NaN Y coordinate' },
        { x: 0, y: 0, z: NaN, description: 'NaN Z coordinate' },
        { x: Infinity, y: 0, z: 0, description: 'infinite X coordinate' },
        { x: 0, y: Infinity, z: 0, description: 'infinite Y coordinate' },
        { x: 0, y: 0, z: Infinity, description: 'infinite Z coordinate' }
      ];

      const results = testCases.map(testCase => {
        try {
          // Store original target
          const originalTarget = gameManager.camera.getTarget().clone();
          
          // Create test target
          const testTarget = new BABYLON.Vector3(testCase.x, testCase.y, testCase.z);
          
          // Validate the target
          const isValidTarget = gameManager.isValidVector3(testTarget);
          
          // Try to set the target
          if (isValidTarget) {
            gameManager.camera.setTarget(testTarget);
            
            // Check if camera state is still valid
            const isValidAfter = gameManager.validateCameraState();
            
            // Get final position and target
            const finalPosition = gameManager.camera.position;
            const finalTarget = gameManager.camera.getTarget();
            
            // Restore original target
            gameManager.camera.setTarget(originalTarget);
            
            return {
              ...testCase,
              isValidTarget: isValidTarget,
              isValidAfter: isValidAfter,
              finalPosition: { x: finalPosition.x, y: finalPosition.y, z: finalPosition.z },
              finalTarget: { x: finalTarget.x, y: finalTarget.y, z: finalTarget.z },
              error: null
            };
          } else {
            return {
              ...testCase,
              isValidTarget: isValidTarget,
              isValidAfter: true, // Should not have been set
              finalPosition: null,
              finalTarget: null,
              error: null
            };
          }
        } catch (error) {
          return {
            ...testCase,
            isValidTarget: false,
            isValidAfter: false,
            finalPosition: null,
            finalTarget: null,
            error: error.message
          };
        }
      });

      return results;
    });

    console.log('🎯 Camera Target Calculation Test Results:');
    testResults.forEach(result => {
      const status = result.isValidAfter ? '✅' : '❌';
      console.log(`  ${status} ${result.description}:`);
      console.log(`    Input: x=${result.x}, y=${result.y}, z=${result.z}`);
      console.log(`    Valid Target: ${result.isValidTarget}`);
      console.log(`    Valid After: ${result.isValidAfter}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
      
      // Camera should remain valid after any operation
      expect(result.isValidAfter).toBe(true);
    });
  });
});
