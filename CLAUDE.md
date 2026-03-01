# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm start          # Start Python HTTP server at http://localhost:3000
```

### Testing (Playwright E2E)
```bash
npm test                   # Run all Playwright tests (headless)
npm run test:headed        # Run tests with visible browser
npm run test:ui            # Open Playwright interactive UI
npm run test:debug         # Debug mode with step-through
npm run test:report        # View HTML test report
npm run install-playwright # Install Playwright browsers (first-time setup)
```

Tests are in `tests/`. There is no unit test framework — all tests are Playwright E2E tests targeting the running dev server.

## Architecture

### Tech Stack
- **No build step** — pure HTML/CSS/JavaScript loaded directly by browser
- **Babylon.js** loaded from CDN (3D engine for scene, mesh, lighting, camera)
- **Python HTTP server** for local development (`python -m http.server 3000`)

### Entry Points
- `index.html` — root HTML; imports all CSS and JS via `<script>` tags
- `js/main.js` — game boot: defines `GAME_CONFIG`, initializes `GameManager`, wires loading screen

### Module Hierarchy

```
GameManager (js/core/GameManager.js)  ← central orchestrator
├── GridManager       (js/core/GridManager.js)           — 40×40 grid, terrain, occupancy
├── ResourceManager   (js/core/ResourceManager.js)       — water, budget, population, pollution, electricity
├── BuildingSystem    (js/systems/BuildingSystem.js)     — building registry, placement, preview
├── UIManager         (js/systems/UIManager.js)          — all HUD panels, modals, notifications
├── QuestSystem       (js/systems/QuestSystem.js)        — missions, objectives, stakeholder rep
├── TutorialSystem    (js/systems/TutorialSystem.js)     — 3D character dialogue & animations
├── EventSystem       (js/systems/EventSystem.js)        — random climate events
├── SaveSystem        (js/systems/SaveSystem.js)         — localStorage, 5 save slots, auto-save
├── CityLifeSystem    (js/systems/CityLifeSystem.js)     — animated cars/pedestrians
├── GameOverSystem    (js/systems/GameOverSystem.js)     — end-game state & dialogue
├── LoanManager       (js/systems/LoanManager.js)        — city financing/debt
├── StudySystem       (js/systems/StudySystem.js)        — educational unlockable content
├── SettingsManager   (js/systems/SettingsManager.js)   — audio/graphics/gameplay settings
├── SimCityCameraControls (js/systems/SimCityCameraControls.js) — pan/zoom/rotate with touch
└── AudioManager      (js/utils/AudioManager.js)         — BGM/SFX pooling
```

### Key Configuration Files
- `js/config/GameConstants.js` — **all magic numbers live here**: `CAMERA`, `FEATURE_FLAGS`, initial resources, grid size. Edit here first when tuning gameplay.
- `FEATURE_FLAGS` in `GameConstants.js` controls which building categories and UI features are enabled in release. `ENABLE_INFRASTRUCTURE` and `ENABLE_POWER_GRID` are currently `false`.

### Assets
- `Sprites/` — 2D sprite sheets (Sunnyside World assets)
- `Sounds/BGM/` and `Sounds/SFX/` — audio files
- `models/` — OBJ 3D character models used by TutorialSystem
- `data/building-studies.json` — educational content for buildings (used by StudySystem)
- `UI/` — PNG/JPG UI elements and dialogue assets

### CSS
- `css/styles.css` — base styles
- `css/ui.css` — HUD and panel components
- `css/responsive.css` — responsive overrides: `max-width: 768px` (mobile) and `min-width: 769px` (desktop accordion)
- `css/tutorial.css` — tutorial overlay styles

## Key Patterns
- **Singleton pattern**: `GameManager`, `SettingsManager`, `SaveSystem` — accessed via module-level `let` variables in `main.js`.
- **System communication**: all systems receive a `gameManager` reference at construction and call back through it rather than importing each other directly.
- **Building definitions**: large data objects defined inside `BuildingSystem.js`; `data/building-studies.json` holds supplemental educational text shown in StudySystem.
- **Dual Babylon.js scenes**: `TutorialSystem` creates a second Babylon.js scene for rendering 3D character portraits independently from the main game scene.
- **Mobile/desktop branching**: `UIManager.isMobile = window.innerWidth <= 768` set at construction and on resize. Many methods early-return with `if (this.isMobile) return` or `if (!this.isMobile) return`.
- **Cooldown system**: `UIManager.cooldownManager` prevents double-triggers. Use `this.isOnCooldown('key')` / `this.setCooldown('key', ms)` when adding new click handlers.
- **Building categories (desktop)**: Accordion pattern — `selectCategory()` moves `#building-items` via `insertAdjacentElement('afterend', ...)` to appear inline below the clicked button. Toggling the same category closes it. `uiState.currentCategory` initialises as `null` so the first call always opens.
- **Camera input mapping** (SimCityCameraControls): left-click drag = pan (tracked at `document` level so dragging off-canvas works); right/middle drag = rotate; scroll wheel = zoom; WASD/arrows = keyboard pan; Q/E = keyboard rotate; R = reset.
