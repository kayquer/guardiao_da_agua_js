---
description: Repository Information Overview
alwaysApply: true
---

# Guardião da Água - Game Information

## Summary

**Guardião da Água** is an educational water management simulation game built with HTML5, CSS3, JavaScript, and Babylon.js. Players assume the role of a municipal water manager responsible for managing a growing city's water resources, handling infrastructure decisions, and balancing environmental sustainability with economic growth. The game features interactive 3D graphics, resource management mechanics, missions, dynamic events, and educational content about water conservation and environmental responsibility.

## Structure

```
guardiao_da_agua_js/
├── index.html              # Main entry point (browser game)
├── css/                    # Stylesheets
│   ├── styles.css         # Main styles
│   ├── ui.css             # Game UI styling
│   └── responsive.css     # Mobile/responsive design
├── js/                    # Game logic
│   ├── main.js           # Core initialization and loop
│   ├── core/             # Core systems
│   │   ├── GameManager.js
│   │   ├── GridManager.js
│   │   └── ResourceManager.js
│   ├── systems/          # Game systems
│   │   ├── BuildingSystem.js
│   │   ├── UIManager.js
│   │   ├── QuestSystem.js
│   │   ├── EventSystem.js
│   │   ├── SaveSystem.js
│   │   ├── TutorialManager.js
│   │   ├── CityLifeSystem.js
│   │   ├── LoanManager.js
│   │   ├── SettingsManager.js
│   │   └── SimCityCameraControls.js
│   └── utils/            # Utilities
│       ├── AssetLoader.js
│       └── AudioManager.js
├── Sprites/              # 2D/3D visual assets
├── Sounds/               # Audio assets (BGM and SFX)
├── UI/                   # UI element assets
├── models/               # 3D models and building definitions
├── tests/                # Playwright test suite
├── package.json          # Project metadata and dependencies
├── playwright.config.js  # Playwright testing configuration
└── README.md             # Project documentation
```

## Language & Runtime

**Language**: JavaScript (ES6+)  
**Runtime**: Node.js >= 16.0.0 (for tooling and testing)  
**Browser Target**: Modern browsers with WebGL support  
**Build System**: None (static web assets)  
**Package Manager**: npm

## Dependencies

**Runtime Dependencies**: None (all libraries loaded via CDN)

**Development Dependencies**:
- `@playwright/test` (^1.54.1) - E2E testing framework

**External Libraries (via CDN)**:
- **Babylon.js** - 3D graphics engine and rendering
- **Materials Library** - Babylon.js materials and shaders
- **Babylon.js Loaders** - Asset loading support
- **Babylon.js GUI** - UI framework for 3D interfaces
- **Web Audio API** - Built-in browser audio handling

## Build & Installation

```bash
# Install dependencies (includes Playwright)
npm install

# Install Playwright browsers
npm run install-playwright

# Start development server (Python)
npm start

# Alternative: Direct browser access
# Open index.html in a modern web browser
```

After starting the server, access the game at `http://localhost:3000`

## Main Files & Entry Points

- **index.html**: Main HTML entry point; loads all stylesheets, Babylon.js CDN libraries, and initializes the game
- **js/main.js**: Core game initialization, main game loop, and orchestration of all systems
- **js/core/GameManager.js**: Central game state and lifecycle management
- **js/systems/UIManager.js**: Game UI rendering and interaction
- **js/systems/BuildingSystem.js**: Building placement and management logic

## Testing

**Framework**: Playwright Test (^1.54.1)  
**Test Location**: `tests/` directory  
**Naming Convention**: `*.spec.js`  
**Test Configuration**: `playwright.config.js`

**Test Suites** (11 test files):
- `advanced-features.spec.js` - Feature validation tests
- `camera-corruption-analysis.spec.js` - Camera system analysis
- `camera-corruption-detection.spec.js` - Camera system detection
- `camera-math-validation.spec.js` - Mathematical validation
- `camera-movement-test.spec.js` - Camera movement tests
- `comprehensive-integration.spec.js` - Integration testing
- `comprehensive-stability.spec.js` - Stability testing
- `critical-fixes-validation.spec.js` - Critical bug fix validation
- `enhanced-features.spec.js` - Feature enhancement tests
- `real-time-corruption-monitor.spec.js` - Runtime corruption monitoring
- `ui-performance.spec.js` - UI performance testing

**Test Configuration**:
- Base URL: `http://localhost:3000`
- Browsers tested: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Viewport: 1280x720 (desktop), mobile device sizes
- Retry policy: 2 retries on CI, 0 locally
- Screenshot on failure enabled
- Video recording on failure enabled
- Trace recording on first retry

**Run Tests**:
```bash
npm test                    # Run all tests
npm run test:ui            # Interactive UI mode
npm run test:headed        # Headed browser mode
npm run test:debug         # Debug mode
npm run test:report        # View test report
```

## Browser Compatibility

**Desktop**: Chrome, Firefox, Safari, Edge (all modern versions)  
**Mobile**: iOS Safari, Android Chrome  
**Requirements**: WebGL support, 1024x768 minimum resolution  
**Performance Target**: 60 FPS

## Architecture Patterns

- **MVC Architecture**: Separation of model (GameManager), view (UIManager), and controller (Systems)
- **Event-Driven Design**: EventSystem for inter-component communication
- **Object Pooling**: Resource reuse for performance optimization
- **Module Pattern**: Each system is self-contained and independently manageable
