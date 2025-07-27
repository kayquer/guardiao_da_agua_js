/**
 * Comprehensive Test Runner for Guardião da Água
 * Executes all test suites and generates comprehensive reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
    constructor() {
        this.testResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            testSuites: [],
            startTime: new Date(),
            endTime: null,
            duration: 0
        };
    }

    async runAllTests() {
        console.log('🚀 Starting Comprehensive Test Suite for Guardião da Água');
        console.log('=' * 60);
        
        const testSuites = [
            {
                name: 'Critical Fixes Validation',
                file: 'critical-fixes-validation.spec.js',
                description: 'Tests critical bug fixes and stability'
            },
            {
                name: 'Advanced Features',
                file: 'advanced-features.spec.js',
                description: 'Tests advanced game features and functionality'
            },
            {
                name: 'Enhanced Features',
                file: 'enhanced-features.spec.js',
                description: 'Tests newly implemented enhanced mission info and mobile responsive design'
            },
            {
                name: 'Comprehensive Stability',
                file: 'comprehensive-stability.spec.js',
                description: 'Tests performance, memory management, and stability'
            }
        ];

        for (const suite of testSuites) {
            await this.runTestSuite(suite);
        }

        this.testResults.endTime = new Date();
        this.testResults.duration = this.testResults.endTime - this.testResults.startTime;

        this.generateReport();
    }

    async runTestSuite(suite) {
        console.log(`\n📋 Running Test Suite: ${suite.name}`);
        console.log(`📝 Description: ${suite.description}`);
        console.log('-' * 50);

        try {
            const command = `npx playwright test tests/${suite.file} --reporter=json`;
            const output = execSync(command, { 
                encoding: 'utf8',
                cwd: path.join(__dirname, '..'),
                timeout: 300000 // 5 minutes timeout per suite
            });

            const results = JSON.parse(output);
            this.processTestResults(suite, results);

        } catch (error) {
            console.error(`❌ Test suite ${suite.name} failed:`, error.message);
            
            this.testSuites.push({
                name: suite.name,
                status: 'failed',
                error: error.message,
                tests: 0,
                passed: 0,
                failed: 1
            });
            
            this.testResults.failedTests += 1;
        }
    }

    processTestResults(suite, results) {
        const suiteResults = {
            name: suite.name,
            status: 'passed',
            tests: results.stats?.total || 0,
            passed: results.stats?.passed || 0,
            failed: results.stats?.failed || 0,
            skipped: results.stats?.skipped || 0,
            duration: results.stats?.duration || 0
        };

        if (suiteResults.failed > 0) {
            suiteResults.status = 'failed';
        }

        this.testSuites.push(suiteResults);
        
        this.testResults.totalTests += suiteResults.tests;
        this.testResults.passedTests += suiteResults.passed;
        this.testResults.failedTests += suiteResults.failed;
        this.testResults.skippedTests += suiteResults.skipped;

        console.log(`✅ Tests Passed: ${suiteResults.passed}`);
        console.log(`❌ Tests Failed: ${suiteResults.failed}`);
        console.log(`⏭️ Tests Skipped: ${suiteResults.skipped}`);
        console.log(`⏱️ Duration: ${(suiteResults.duration / 1000).toFixed(2)}s`);
    }

    generateReport() {
        console.log('\n' + '=' * 60);
        console.log('📊 COMPREHENSIVE TEST REPORT');
        console.log('=' * 60);

        console.log(`\n📈 OVERALL RESULTS:`);
        console.log(`Total Tests: ${this.testResults.totalTests}`);
        console.log(`✅ Passed: ${this.testResults.passedTests}`);
        console.log(`❌ Failed: ${this.testResults.failedTests}`);
        console.log(`⏭️ Skipped: ${this.testResults.skippedTests}`);
        console.log(`⏱️ Total Duration: ${(this.testResults.duration / 1000).toFixed(2)}s`);

        const successRate = (this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(2);
        console.log(`📊 Success Rate: ${successRate}%`);

        console.log(`\n📋 TEST SUITE BREAKDOWN:`);
        this.testSuites.forEach(suite => {
            const status = suite.status === 'passed' ? '✅' : '❌';
            console.log(`${status} ${suite.name}: ${suite.passed}/${suite.tests} passed`);
        });

        // Generate JSON report
        const reportPath = path.join(__dirname, '..', 'test-results', 'comprehensive-report.json');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));

        console.log(`\n📄 Detailed report saved to: ${reportPath}`);

        // Determine overall status
        if (this.testResults.failedTests === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Game is ready for deployment.');
        } else {
            console.log('\n⚠️ Some tests failed. Please review and fix issues before deployment.');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests().catch(console.error);
}

module.exports = TestRunner;
