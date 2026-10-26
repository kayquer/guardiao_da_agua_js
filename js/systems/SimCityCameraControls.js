/**
 * SimCity-Style Camera Controls for Guardião da Água
 * Provides comprehensive camera control system similar to SimCity games
 * Supports mouse, keyboard, and touch controls with smooth interactions
 * 
 * FIXED VERSION:
 * - Touch events now allow building selection
 * - Middle mouse button for rotation
 * - Proper event handling priority
 */

class SimCityCameraControls {
    constructor(camera, canvas, scene, gameManager) {
        this.camera = camera;
        this.canvas = canvas;
        this.scene = scene;
        this.gameManager = gameManager;
        
        // Control states
        this.isDragging = false;
        this.isRotating = false;
        this.isPanning = false;
        this.lastPointerPosition = { x: 0, y: 0 };
        
        // Touch gesture states
        this.lastTouchDistance = null;
        this.lastTouchAngle = null;
        this.touchStartPositions = [];
        this.touchStartTime = 0;
        this.touchMoveThreshold = 10; // pixels - minimum movement to consider it a drag
        this.touchHasMoved = false;

        // Mouse drag threshold (same concept as touch)
        this.mouseMoveThreshold = 5; // pixels - minimum movement to start dragging
        this.mouseHasMoved = false;
        this.mouseStartPosition = { x: 0, y: 0 };
        this.pendingDrag = false; // true between pointerdown and threshold exceeded
        
        // Configuration
        this.config = {
            panSensitivity: 0.02,
            rotateSensitivity: 0.008,
            zoomSensitivity: 0.15,
            keyboardMoveSpeed: 20.0, // Units per second
            keyboardRotateSpeed: 2.0, // Radians per second
            smoothing: 0.15,
            
            // Camera bounds
            bounds: { minX: -60, maxX: 100, minZ: -60, maxZ: 100 },
            zoomLimits: { min: 10, max: 80 },
            
            // Touch settings
            touchPanSensitivity: 0.045,
            pinchZoomSensitivity: 0.02,
            rotationSensitivity: 0.005,
            
            // Edge panning
            edgePanEnabled: true,
            edgePanThreshold: 30, // pixels from edge
            edgePanSpeed: 15.0 // Units per second
        };
        
        // Keyboard state tracking
        this.keys = {
            w: false, a: false, s: false, d: false,
            q: false, e: false, r: false,
            arrowUp: false, arrowDown: false, arrowLeft: false, arrowRight: false
        };
        
        // Smoothing targets
        this.targetPosition = this.camera.target.clone();
        this.targetAlpha = this.camera.alpha;
        this.targetRadius = this.camera.radius;
        
        // Atualização da câmera a cada quadro renderizado (startUpdateLoop)
        this.renderObserver = null;
        this.lerpTargets = [new BABYLON.Vector3(), new BABYLON.Vector3()];
        this.lerpIndex = 0;
        this.lastUpdateTime = performance.now();
        
        // Store bound event handlers for proper cleanup
        this.boundHandlers = {};
        
        this.setupControls();
        this.startUpdateLoop();
        
        log('🎮 SimCity-style camera controls initialized (Fixed Version)');
    }
    
    /**
     * Check if user is actively placing a building
     */
    isActivelyPlacingBuilding() {
        return this.gameManager.buildMode &&
               this.gameManager.buildingSystem &&
               this.gameManager.buildingSystem.previewMode;
    }
    
    setupControls() {
        // ===== MOUSE CONTROLS =====
        this.setupMouseControls();
        
        // ===== TOUCH CONTROLS =====
        this.setupTouchControls();
        
        // ===== KEYBOARD CONTROLS =====
        this.setupKeyboardControls();
        
        // ===== CONTEXT MENU PREVENTION =====
        this.boundHandlers.contextmenu = (event) => {
            event.preventDefault();
        };
        this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
        
        // ===== FOCUS MANAGEMENT =====
        this.boundHandlers.mousedownFocus = () => {
            this.canvas.focus();
        };
        this.canvas.addEventListener('mousedown', this.boundHandlers.mousedownFocus);
        
        // Make canvas focusable
        this.canvas.tabIndex = 0;
    }
    
    setupMouseControls() {
        // Document-level handlers attached during active drag/rotation so the
        // operation continues even when the cursor leaves the canvas (e.g. moves
        // over HUD elements). They are removed as soon as the pointer is released.
        // Uses pointer events (pointerdown/pointermove/pointerup) instead of mouse
        // events because Babylon.js registers internal pointerdown handlers on the
        // canvas that may call preventDefault(), which suppresses mousedown in modern
        // browsers. Pointer events fire before the browser generates mouse events so
        // they are never suppressed.
        this.boundHandlers.documentPointermove = (event) => {
            if (this.isActivelyPlacingBuilding()) return;

            // Check mouse drag threshold before activating drag
            if (this.pendingDrag && !this.isDragging) {
                const deltaX = Math.abs(event.clientX - this.mouseStartPosition.x);
                const deltaY = Math.abs(event.clientY - this.mouseStartPosition.y);
                const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                if (totalMovement > this.mouseMoveThreshold) {
                    this.isDragging = true;
                    this.mouseHasMoved = true;
                    this.pendingDrag = false;
                    this.canvas.style.cursor = 'grabbing';
                }
            }

            if (this.isDragging) {
                this.handlePan(event);
            } else if (this.isRotating) {
                this.handleRotation(event);
            }
        };

        this.boundHandlers.documentPointerup = () => {
            if (this.isDragging) {
                log('🖱️ Mouse drag ended');
            }
            if (this.isRotating) {
                log('🖱️ Mouse rotation ended');
            }
            this.isDragging = false;
            this.isRotating = false;
            this.pendingDrag = false;
            this.canvas.style.cursor = 'default';
            document.removeEventListener('pointermove', this.boundHandlers.documentPointermove);
            document.removeEventListener('pointerup', this.boundHandlers.documentPointerup);
        };

        // Pointer down - start drag/rotation
        this.boundHandlers.pointerdown = (event) => {
            if (this.isActivelyPlacingBuilding()) {
                log('🏗️ Camera controls blocked - actively placing building');
                return;
            }

            if (event.button === 0) { // Left button - pan (deferred until threshold)
                this.pendingDrag = true;
                this.mouseHasMoved = false;
                this.mouseStartPosition = { x: event.clientX, y: event.clientY };
            } else if (event.button === 1) { // Middle button - rotation
                this.isRotating = true;
                this.canvas.style.cursor = 'grab';
                log('🖱️ Mouse rotation started (middle button)');
                event.preventDefault();
            } else if (event.button === 2) { // Right button - also rotation
                this.isRotating = true;
                this.canvas.style.cursor = 'grab';
                log('🖱️ Mouse rotation started (right button)');
            }

            this.lastPointerPosition = { x: event.clientX, y: event.clientY };

            // Attach document-level listeners so drag continues off-canvas
            if (this.pendingDrag || this.isDragging || this.isRotating) {
                document.addEventListener('pointermove', this.boundHandlers.documentPointermove);
                document.addEventListener('pointerup', this.boundHandlers.documentPointerup);
            }

            // Prevent default for middle mouse to avoid scrolling
            if (event.button === 1) {
                event.preventDefault();
            }
        };

        // Canvas pointermove - used only for edge panning (drag is handled by document listener)
        this.boundHandlers.pointermove = (event) => {
            if (this.isActivelyPlacingBuilding()) {
                return;
            }

            // Edge panning (when not dragging/rotating)
            if (!this.isDragging && !this.isRotating && this.config.edgePanEnabled) {
                this.handleEdgePanning(event);
            }
        };

        // Pointer up on canvas (fallback — primary handler is documentPointerup)
        this.boundHandlers.pointerup = () => {
            this.isDragging = false;
            this.isRotating = false;
            this.canvas.style.cursor = 'default';
        };

        // Pointer leave - only reset if not in an active drag tracked by document
        this.boundHandlers.pointerleave = () => {
            if (!this.isDragging && !this.isRotating) {
                this.canvas.style.cursor = 'default';
            }
        };

        // Mouse wheel - zoom
        this.boundHandlers.wheel = (event) => {
            this.handleZoom(event);
            event.preventDefault();
        };

        // Add all pointer event listeners
        this.canvas.addEventListener('pointerdown', this.boundHandlers.pointerdown);
        this.canvas.addEventListener('pointermove', this.boundHandlers.pointermove);
        this.canvas.addEventListener('pointerup', this.boundHandlers.pointerup);
        this.canvas.addEventListener('pointerleave', this.boundHandlers.pointerleave);
        this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    }
    
    setupTouchControls() {
        // Touch start
        this.boundHandlers.touchstart = (event) => {
            this.touchStartTime = Date.now();
            this.touchHasMoved = false;
            
            this.touchStartPositions = Array.from(event.touches).map(touch => ({
                x: touch.clientX,
                y: touch.clientY,
                id: touch.identifier
            }));

            if (event.touches.length === 1) {
                // Single touch - can be tap (for selection) or pan
                this.lastPointerPosition = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY
                };
                
                // Don't prevent default yet - wait to see if it's a tap or drag
                // This allows building selection to work
            } else if (event.touches.length === 2) {
                // Two finger - zoom/rotate (prevent default immediately)
                this.setupTwoFingerGesture(event);
                event.preventDefault();
            }
        };

        // Touch move
        this.boundHandlers.touchmove = (event) => {
            // Traçando rua com o dedo (BuildingSystem.handleRoadPointer): o arrasto é da rua, não da câmera
            if (this.gameManager.buildingSystem?.roadDrag && event.touches.length === 1) {
                event.preventDefault();
                return;
            }
            // Calculate movement distance from start position
            if (event.touches.length === 1 && this.touchStartPositions.length === 1) {
                const deltaX = Math.abs(event.touches[0].clientX - this.touchStartPositions[0].x);
                const deltaY = Math.abs(event.touches[0].clientY - this.touchStartPositions[0].y);
                const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // Only start panning if moved more than threshold
                if (totalMovement > this.touchMoveThreshold) {
                    this.touchHasMoved = true;
                    this.isPanning = true;
                    
                    // Prevent default only when we're sure it's a pan
                    event.preventDefault();
                    
                    this.handleTouchPan(event);
                }
            } else if (event.touches.length === 2) {
                this.touchHasMoved = true;
                this.handleTwoFingerGesture(event);
                event.preventDefault();
            }
        };
        
        // Touch end
        this.boundHandlers.touchend = (event) => {
            // If it was a quick tap without movement, allow building selection
            const touchDuration = Date.now() - this.touchStartTime;
            const wasQuickTap = touchDuration < 200 && !this.touchHasMoved;
            
            if (wasQuickTap) {
                log('👆 Quick tap detected - allowing building selection');
                // Don't prevent default - let the tap propagate for building selection
            }
            
            this.isPanning = false;
            this.isDragging = false;
            this.isRotating = false;
            this.lastTouchDistance = null;
            this.lastTouchAngle = null;
            this.touchStartPositions = [];
            this.touchHasMoved = false;
        };
        
        // Touch cancel
        this.boundHandlers.touchcancel = () => {
            this.isPanning = false;
            this.isDragging = false;
            this.isRotating = false;
            this.lastTouchDistance = null;
            this.lastTouchAngle = null;
            this.touchStartPositions = [];
            this.touchHasMoved = false;
        };
        
        // Add all touch event listeners
        this.canvas.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: true });
        this.canvas.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: false });
        this.canvas.addEventListener('touchend', this.boundHandlers.touchend, { passive: true });
        this.canvas.addEventListener('touchcancel', this.boundHandlers.touchcancel, { passive: true });
    }
    
    setupKeyboardControls() {
        // Key down
        this.boundHandlers.keydown = (event) => {
            this.handleKeyDown(event);
        };
        
        // Key up
        this.boundHandlers.keyup = (event) => {
            this.handleKeyUp(event);
        };
        
        // Add keyboard event listeners
        document.addEventListener('keydown', this.boundHandlers.keydown);
        document.addEventListener('keyup', this.boundHandlers.keyup);
    }
    
    handlePan(event) {
        const deltaX = event.clientX - this.lastPointerPosition.x;
        const deltaY = event.clientY - this.lastPointerPosition.y;
        
        this.panCamera(deltaX, deltaY, this.config.panSensitivity);
        this.lastPointerPosition = { x: event.clientX, y: event.clientY };
    }
    
    handleRotation(event) {
        const deltaX = event.clientX - this.lastPointerPosition.x;
        
        // Update target rotation
        this.targetAlpha += deltaX * this.config.rotateSensitivity;
        
        // Maintain isometric beta angle
        this.camera.beta = Math.PI / 3.5;
        
        this.lastPointerPosition = { x: event.clientX, y: event.clientY };
    }
    
    handleZoom(event) {
        const delta = event.deltaY > 0 ? 1 : -1;
        const zoomAmount = delta * this.config.zoomSensitivity * this.camera.radius;
        
        this.targetRadius += zoomAmount;
        
        // Apply zoom limits
        this.targetRadius = Math.max(this.config.zoomLimits.min, 
                                    Math.min(this.config.zoomLimits.max, this.targetRadius));
    }
    
    handleEdgePanning(event) {
        const rect = this.canvas.getBoundingClientRect();
        const threshold = this.config.edgePanThreshold;
        const now = performance.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        const moveSpeed = this.config.edgePanSpeed * deltaTime;
        
        // Borda esquerda/direita/cima/baixo da tela, relativo a para onde a câmera olha
        let right = 0, forward = 0;
        if (event.clientX - rect.left < threshold) right = -moveSpeed;
        else if (rect.right - event.clientX < threshold) right = moveSpeed;
        if (event.clientY - rect.top < threshold) forward = moveSpeed;
        else if (rect.bottom - event.clientY < threshold) forward = -moveSpeed;
        this.moveRelativeToView(right, forward);
    }
    
    handleTouchPan(event) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.lastPointerPosition.x;
        const deltaY = touch.clientY - this.lastPointerPosition.y;
        
        this.panCamera(deltaX, deltaY, this.config.touchPanSensitivity);
        this.lastPointerPosition = { x: touch.clientX, y: touch.clientY };
    }
    
    setupTwoFingerGesture(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        // Calculate distance for zoom
        this.lastTouchDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        // Calculate angle for rotation
        this.lastTouchAngle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        );
    }
    
    handleTwoFingerGesture(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        // Zoom with pinch
        const currentDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        if (this.lastTouchDistance) {
            const distanceDelta = currentDistance - this.lastTouchDistance;
            const zoomAmount = -distanceDelta * this.config.pinchZoomSensitivity;
            
            this.targetRadius += zoomAmount;
            this.targetRadius = Math.max(this.config.zoomLimits.min, 
                                        Math.min(this.config.zoomLimits.max, this.targetRadius));
        }
        
        // Rotation with twist
        const currentAngle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        );
        
        if (this.lastTouchAngle !== null) {
            const angleDelta = currentAngle - this.lastTouchAngle;
            this.targetAlpha += angleDelta * this.config.rotationSensitivity;
        }
        
        this.lastTouchDistance = currentDistance;
        this.lastTouchAngle = currentAngle;
    }
    
    /**
     * Pan camera with optimized vector operations
     */
    panCamera(deltaX, deltaY, sensitivity) {
        // Arrastar leva o mapa junto com o dedo/mouse: para a esquerda = câmera vai para a direita da tela
        const scale = sensitivity * this.zoomPanScale();
        this.moveRelativeToView(-deltaX * scale, deltaY * scale);
    }

    /**
     * Move o alvo da câmera na direção da tela, não nos eixos do mapa: `right` para a direita de quem olha,
     * `forward` para a frente (para onde a câmera aponta, no chão). Na ArcRotateCamera a câmera fica em
     * alvo + (cos α, ·, sin α), então a frente no chão é (-cos α, -sin α) e a direita (-sin α, cos α)
     * (a mesma base da bússola, ui/CompassUI.js). Antes o vetor era girado por α, o que só acertava no
     * ângulo inicial: com a câmera virada, "para a direita" andava de lado ou para trás.
     */
    moveRelativeToView(right, forward) {
        if (!right && !forward) return;
        const a = this.camera.alpha;
        const cos = Math.cos(a), sin = Math.sin(a);
        this.targetPosition.x += -sin * right - cos * forward;
        this.targetPosition.z += cos * right - sin * forward;
        this.enforceTargetBounds();
    }

    /** Com a câmera longe, o mesmo gesto anda mais (o mapa parece menor); perto, anda menos. */
    zoomPanScale() {
        return Math.min(2.5, Math.max(0.5, (this.camera.radius || 30) / 30));
    }
    
    handleKeyDown(event) {
        // Digitando num campo (nome, cidade...): W/A/S/D/R são letras, não comandos de câmera
        const el = event.target;
        if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.w = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.s = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.a = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.d = true;
                break;
            case 'KeyQ':
                this.keys.q = true;
                break;
            case 'KeyE':
                this.keys.e = true;
                break;
            case 'KeyR':
                this.resetCamera();
                break;
        }
    }
    
    handleKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.w = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.s = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.a = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.d = false;
                break;
            case 'KeyQ':
                this.keys.q = false;
                break;
            case 'KeyE':
                this.keys.e = false;
                break;
        }
    }
    
    // Roda dentro do render do Babylon (antes era um requestAnimationFrame próprio, um segundo laço por quadro)
    startUpdateLoop() {
        this.renderObserver = this.scene.onBeforeRenderObservable.add(() => this.updateCamera());
    }
    
    /**
     * Frame-rate independent camera update with smoothing
     */
    updateCamera() {
        const now = performance.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = now;
        
        // Update keyboard movement
        this.updateKeyboardMovement(deltaTime);
        
        // Suavização igual em qualquer FPS: config.smoothing é o passo de um quadro a 60 FPS
        const smoothing = 1 - Math.pow(1 - this.config.smoothing, Math.min(deltaTime, 0.25) * 60);

        // Apply smoothing to camera position (dois vetores alternados: sem alocar um Vector3 por quadro, e o
        // setter de target continua recebendo outro objeto, como antes)
        let next = this.lerpTargets[this.lerpIndex = 1 - this.lerpIndex];
        if (next === this.camera.target) next = this.lerpTargets[this.lerpIndex = 1 - this.lerpIndex];
        BABYLON.Vector3.LerpToRef(this.camera.target, this.targetPosition, smoothing, next);
        this.camera.target = next;

        // Mantém o ângulo numa volta só (−π..π): girando sem parar ele acumulava voltas, passava do limite da
        // validação (CameraGuard) e a "recuperação" quebrava a câmera. Alvo e câmera andam juntos, sem pulo.
        if (Math.abs(this.targetAlpha) > Math.PI) {
            const turns = Math.round(this.targetAlpha / (2 * Math.PI)) * 2 * Math.PI;
            this.targetAlpha -= turns;
            this.camera.alpha -= turns;
        }

        // Apply smoothing to rotation
        const alphaDiff = this.targetAlpha - this.camera.alpha;
        this.camera.alpha += alphaDiff * smoothing;

        // Apply smoothing to zoom
        const radiusDiff = this.targetRadius - this.camera.radius;
        this.camera.radius += radiusDiff * smoothing;
        
        // Maintain isometric angle
        this.camera.beta = Math.PI / 3.5;
    }
    
    /**
     * Update keyboard movement with frame-rate independence
     */
    updateKeyboardMovement(deltaTime) {
        const moveSpeed = this.config.keyboardMoveSpeed * deltaTime;
        const rotateSpeed = this.config.keyboardRotateSpeed * deltaTime;

        // W/S = frente/trás e A/D = esquerda/direita de quem olha (relativo à câmera, não ao mapa)
        const step = moveSpeed * this.zoomPanScale();
        const forward = (this.keys.w ? step : 0) - (this.keys.s ? step : 0);
        const right = (this.keys.d ? step : 0) - (this.keys.a ? step : 0);
        this.moveRelativeToView(right, forward);

        // Rotation (independent of movement)
        if (this.keys.q) {
            this.targetAlpha -= rotateSpeed;
        }
        if (this.keys.e) {
            this.targetAlpha += rotateSpeed;
        }
    }
    
    /**
     * Enforce bounds on target position
     */
    enforceTargetBounds() {
        this.targetPosition.x = Math.max(this.config.bounds.minX, 
                                      Math.min(this.config.bounds.maxX, this.targetPosition.x));
        this.targetPosition.z = Math.max(this.config.bounds.minZ, 
                                      Math.min(this.config.bounds.maxZ, this.targetPosition.z));
    }

    resetCamera() {
        // Return to default position and rotation
        this.targetPosition = BABYLON.Vector3.Zero();
        this.targetAlpha = -Math.PI / 4;
        this.targetRadius = 30;
        this.camera.beta = Math.PI / 3.5;

        log('📷 Camera reset to default position');
    }

    /**
     * Center camera on a specific world position with smooth transition
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate
     * @param {number} radius - Optional camera distance (default: 25)
     */
    centerCameraOn(worldX, worldZ, radius = 25) {
        // Set target position for smooth transition
        this.targetPosition.set(worldX, 0, worldZ);
        this.targetRadius = radius;

        // Enforce bounds
        this.enforceTargetBounds();

        log(`📷 Camera centering on position (${worldX.toFixed(1)}, ${worldZ.toFixed(1)}) with radius ${radius}`);
    }

    // ===== CONFIGURATION METHODS =====
    
    setSensitivity(pan, rotate, zoom) {
        this.config.panSensitivity = pan;
        this.config.rotateSensitivity = rotate;
        this.config.zoomSensitivity = zoom;
    }
    
    setBounds(minX, maxX, minZ, maxZ) {
        this.config.bounds = { minX, maxX, minZ, maxZ };
        this.enforceTargetBounds();
    }
    
    setZoomLimits(min, max) {
        this.config.zoomLimits = { min, max };
        this.targetRadius = Math.max(min, Math.min(max, this.targetRadius));
    }

    // ===== CLEANUP =====
    
    dispose() {
        if (this.renderObserver) {
            this.scene.onBeforeRenderObservable.remove(this.renderObserver);
            this.renderObserver = null;
        }
        
        // Remove all canvas event listeners
        this.canvas.removeEventListener('pointerdown', this.boundHandlers.pointerdown);
        this.canvas.removeEventListener('pointermove', this.boundHandlers.pointermove);
        this.canvas.removeEventListener('pointerup', this.boundHandlers.pointerup);
        this.canvas.removeEventListener('pointerleave', this.boundHandlers.pointerleave);
        this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
        this.canvas.removeEventListener('touchstart', this.boundHandlers.touchstart);
        this.canvas.removeEventListener('touchmove', this.boundHandlers.touchmove);
        this.canvas.removeEventListener('touchend', this.boundHandlers.touchend);
        this.canvas.removeEventListener('touchcancel', this.boundHandlers.touchcancel);
        this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
        this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedownFocus);

        // Remove document event listeners
        document.removeEventListener('keydown', this.boundHandlers.keydown);
        document.removeEventListener('keyup', this.boundHandlers.keyup);
        document.removeEventListener('pointermove', this.boundHandlers.documentPointermove);
        document.removeEventListener('pointerup', this.boundHandlers.documentPointerup);
        
        // Clear bound handlers
        this.boundHandlers = {};
        
        log('🗑️ SimCity camera controls disposed');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SimCityCameraControls = SimCityCameraControls;
}