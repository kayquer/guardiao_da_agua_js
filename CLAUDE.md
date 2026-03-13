# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Prerequisites

- **Python 3** — required for `npm start` (uses `python -m http.server`)
- **Node.js >= 16** — required for Playwright tests
- Run `npm install` before first use to install Playwright dev dependency

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
- `js/main.js` — game boot: defines `GAME_CONFIG`, initializes `GameManager`, wires loading screen, manages screen transitions and BGM

### Module Hierarchy

```text
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
- `Sounds/BGM/` — background music (MP3 only; MIDI not supported by Web Audio API)
- `Sounds/SFX/` — sound effects
- `models/` — OBJ 3D character models used by TutorialSystem
- `data/building-studies.json` — educational content for buildings (used by StudySystem)
- `UI/` — PNG/JPG UI elements and dialogue assets

### CSS

- `css/styles.css` — base styles
- `css/ui.css` — HUD and panel components
- `css/responsive.css` — responsive overrides: `max-width: 768px` (mobile) and `min-width: 769px` (desktop accordion)
- `css/tutorial.css` — tutorial and game over overlay styles

## Key Patterns

- **Singleton pattern**: `GameManager`, `SettingsManager`, `SaveSystem` — accessed via module-level `let` variables in `main.js`.
- **System communication**: all systems receive a `gameManager` reference at construction and call back through it rather than importing each other directly.
- **Building definitions**: large data objects defined inside `BuildingSystem.js`; `data/building-studies.json` holds supplemental educational text shown in StudySystem.
- **Dual Babylon.js scenes**: `TutorialSystem` creates a second Babylon.js scene for rendering 3D character portraits independently from the main game scene.
- **Mobile/desktop branching**: `UIManager.isMobile = window.innerWidth <= 768` set at construction and on resize. Many methods early-return with `if (this.isMobile) return` or `if (!this.isMobile) return`.
- **Cooldown system**: `UIManager.cooldownManager` prevents double-triggers. Use `this.isOnCooldown('key')` / `this.setCooldown('key', ms)` when adding new click handlers.
- **Building categories (desktop & mobile)**: Accordion pattern works on both platforms — `selectCategory()` moves `#building-items` via `insertAdjacentElement('afterend', ...)` below the clicked button. Toggling the same category closes it.
- **Camera input mapping** (SimCityCameraControls): left-click drag = pan (tracked at `document` level so dragging off-canvas works); right/middle drag = rotate; scroll wheel = zoom; WASD/arrows = keyboard pan; Q/E = keyboard rotate; R = reset.
- **Mouse drag threshold**: `pendingDrag`/`mouseHasMoved` in SimCityCameraControls prevents micro-movements during clicks from triggering camera pan. Mirrors touch's `touchMoveThreshold`/`touchHasMoved`.
- **Building selection (dual path)**: Desktop uses `scene.pick()` + `metadata.buildingId` in `GameManager.handleBuildingSelection()`. Mobile uses `scene.pick()` + `metadata.buildingId` in UIManager's `touchend` handler. Both rely on `mesh.metadata.buildingId` set by `BuildingSystem.placeBuilding()`.
- **Mesh metadata**: Every building mesh gets `metadata.buildingId` in `BuildingSystem.placeBuilding()`. `replaceBuildingMesh()` copies metadata to new meshes. This metadata is the primary way buildings are identified on click/tap.
- **Canvas must remain 100% viewport**: Do not resize `#game-canvas` based on HUD panel dimensions — HUD panels are designed as overlays. Changing canvas size breaks Babylon.js rendering and layout.
- **hud-right visibility (desktop)**: Hidden by default (`display: none`). Shown via `showHudRight()` when building/terrain info is displayed, hidden via `hideHudRight()` when panels close.
- **hud-right visibility (mobile)**: Uses `transform: translateX(100%)` to hide off-screen and `.active` class to slide in. Mobile CSS must override `display: none` from base CSS or the panel stays invisible regardless of transform.
- **Panel show/hide must use centralized methods**: Always call `showHudRight()`/`hideHudRight()` instead of manually toggling `.hud-right` display or classes. Methods like `showMissionPanel()` must go through these to work on both platforms.
- **BGM per screen**: `showScreen()` in `main.js` handles BGM transitions — menu/loading plays `bgm_menu` (Green Future), gameplay plays `bgm_gameplay` (Green City) at 30% volume. `AudioManager.playMusic()` auto-stops the current track with fade-out before starting the new one, preventing overlap.
- **BGM volume multiplier**: `AudioManager.playMusic(key, fadeIn, volumeMultiplier)` accepts a third parameter (0.0–1.0) that scales `musicVolume * masterVolume`. Used to keep gameplay ambient music quieter than menu music.
- **Game over overlay**: `GameOverSystem` detects defeat conditions (water depleted, pollution critical) and shows a fullscreen educational dialog via `#gameover-container`. CSS lives in `css/tutorial.css` alongside tutorial styles — both share `.tutorial-dialog` classes.
- **Building placement feedback**: Clicking a disabled (can't afford) building button shows a warning notification with a clickable link to the FAQ budget section (`UIManager.showBudgetInsufficientNotification()`). After placing a building that causes energy deficit, `BuildingSystem.showEnergyShortageNotification()` warns about insufficient power (30s cooldown).

## Gotchas

- **No ES modules**: All JS files use plain `<script>` tags — no `import`/`export`. Order of `<script>` tags in `index.html` matters.
- **Dev server required for tests**: Playwright tests expect the server running on `localhost:3000`. Start it with `npm start` before running `npm test`.
- **No linter/formatter**: There is no ESLint or Prettier configured. Follow existing code style (camelCase methods, PascalCase classes).
- **pointer-events on HUD**: `.hud` has `pointer-events: none` with `.hud > *` re-enabling via `auto`. This works for nested elements (inherited), but elements appended to `document.body` (like `.mobile-toggle`) must have their own `z-index` and are unaffected.
- **`display: none` vs transform visibility**: Mobile panels use CSS transforms for show/hide animations, but if the base CSS sets `display: none`, the transform has no visual effect. Always ensure mobile CSS overrides `display` for transform-animated panels.
- **Mesh metadata must be preserved**: When replacing/merging building meshes, always copy `metadata` from old to new mesh or buildings become unselectable.
- **building-studies.json format**: Each entry needs `buildingId`, `buildingName`, `category`, `difficulty`, `studyTitle`, `studyIcon`, `estimatedTime`, `learningObjectives`, `pages` (array of `{pageNumber, title, content (HTML string), image}`), `quiz`, `relatedBuildings`, `relatedConcepts`. Target audience: teenagers 11-14. Validate JSON with `node -e "JSON.parse(require('fs').readFileSync('data/building-studies.json','utf8'))"`.
- **IDE diagnostics for AudioManager**: `AudioManager` hints ("Não foi possível encontrar o nome") are false positives — it's a global loaded via `<script>` tag, not an import.
- **MIDI not supported**: The AudioManager uses Web Audio API / HTML5 Audio — only MP3, WAV, OGG are supported. MIDI files require a separate library (not implemented). Always use MP3 for BGM.
- **Game over container CSS**: `#gameover-container` styles live in `css/tutorial.css` (not a separate file). It reuses tutorial classes (`.tutorial-content`, `.tutorial-dialog`) but has its own container/background/portrait rules. Missing these CSS rules causes the game over dialog to be invisible.
