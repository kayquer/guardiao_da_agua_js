@echo off
echo ========================================
echo Running Mobile Fixes Tests (Chromium Only)
echo ========================================
echo.

npx playwright test tests/mobile-fixes-test.spec.js --project=chromium --reporter=list

echo.
echo ========================================
echo Test run complete!
echo ========================================
pause

