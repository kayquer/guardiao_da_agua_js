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
        
        // Configuration
        this.config = {
            panSensitivity: 0.02,
            rotateSensitivity: 0.008,
            zoomSensitivity: 0.15,
            keyboardMoveSpeed: 20.0, // Units per second
            keyboardRotateSpeed: 2.0, // Radians per second
            smoothing: 0.15,
            
            // Camera bounds
            bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 },
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
        
        // Animation frame tracking
        this.animationFrame = null;
        this.lastUpdateTime = performance.now();
        
        // Reusable objects for memory optimization
        this._tempVector = new BABYLON.Vector3();
        this._tempQuaternion = new BABYLON.Quaternion();
        
        // Store bound event handlers for proper cleanup
        this.boundHandlers = {};
        
        this.setupControls();
        this.startUpdateLoop();
        
        console.log('🎮 SimCity-style camera controls initialized (Fixed Version)');
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
        // Mouse down - start drag/rotation
        this.boundHandlers.mousedown = (event) => {
            if (this.isActivelyPlacingBuilding()) {
                console.log('🏗️ Camera controls blocked - actively placing building');
                return;
            }

            if (event.button === 0) { // Left button - pan
                this.isDragging = true;
                this.canvas.style.cursor = 'grabbing';
                console.log('🖱️ Mouse drag started');
            } else if (event.button === 1) { // Middle button - rotation
                this.isRotating = true;
                this.canvas.style.cursor = 'grab';
                console.log('🖱️ Mouse rotation started (middle button)');
                event.preventDefault();
            } else if (event.button === 2) { // Right button - also rotation
                this.isRotating = true;
                this.canvas.style.cursor = 'grab';
                console.log('🖱️ Mouse rotation started (right button)');
            }

            this.lastPointerPosition = { x: event.clientX, y: event.clientY };
            
            // Prevent default for middle mouse to avoid scrolling
            if (event.button === 1) {
                event.preventDefault();
            }
        };

        // Mouse move - execute drag/rotation and edge panning
        this.boundHandlers.mousemove = (event) => {
            if (this.isActivelyPlacingBuilding()) {
                return;
            }

            if (this.isDragging) {
                this.handlePan(event);
            } else if (this.isRotating) {
                this.handleRotation(event);
            }
            
            // Edge panning (when not dragging/rotating)
            if (!this.isDragging && !this.isRotating && this.config.edgePanEnabled) {
                this.handleEdgePanning(event);
            }
        };

        // Mouse up - stop drag/rotation
        this.boundHandlers.mouseup = () => {
            if (this.isDragging) {
                console.log('🖱️ Mouse drag ended');
            }
            if (this.isRotating) {
                console.log('🖱️ Mouse rotation ended');
            }

            this.isDragging = false;
            this.isRotating = false;
            this.canvas.style.cursor = 'default';
        };

        // Mouse leave - stop all interactions
        this.boundHandlers.mouseleave = () => {
            this.isDragging = false;
            this.isRotating = false;
            this.canvas.style.cursor = 'default';
        };
        
        // Mouse wheel - zoom
        this.boundHandlers.wheel = (event) => {
            this.handleZoom(event);
            event.preventDefault();
        };
        
        // Add all mouse event listeners
        this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
        this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseleave);
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
                console.log('👆 Quick tap detected - allowing building selection');
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
        
        let moved = false;
        
        // Left edge
        if (event.clientX - rect.left < threshold) {
            this.targetPosition.x -= moveSpeed;
            moved = true;
        }
        // Right edge
        else if (rect.right - event.clientX < threshold) {
            this.targetPosition.x += moveSpeed;
            moved = true;
        }
        
        // Top edge
        if (event.clientY - rect.top < threshold) {
            this.targetPosition.z += moveSpeed;
            moved = true;
        }
        // Bottom edge
        else if (rect.bottom - event.clientY < threshold) {
            this.targetPosition.z -= moveSpeed;
            moved = true;
        }
        
        if (moved) {
            this.enforceTargetBounds();
        }
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
        // Reuse temp vector
        this._tempVector.set(
            -deltaX * sensitivity,
            0,
            deltaY * sensitivity
        );
        
        // Apply camera rotation to pan vector
        BABYLON.Quaternion.RotationAxisToRef(
            BABYLON.Vector3.Up(),
            this.camera.alpha,
            this._tempQuaternion
        );
        
        this._tempVector.rotateByQuaternionToRef(this._tempQuaternion, this._tempVector);
        
        // Move camera target
        this.targetPosition.addInPlace(this._tempVector);
        
        // Apply bounds
        this.enforceTargetBounds();
    }
    
    handleKeyDown(event) {
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
    
    startUpdateLoop() {
        const update = () => {
            this.updateCamera();
            this.animationFrame = requestAnimationFrame(update);
        };
        update();
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
        
        // Apply smoothing to camera position
        this.camera.target = BABYLON.Vector3.Lerp(
            this.camera.target,
            this.targetPosition,
            this.config.smoothing
        );
        
        // Apply smoothing to rotation
        const alphaDiff = this.targetAlpha - this.camera.alpha;
        this.camera.alpha += alphaDiff * this.config.smoothing;
        
        // Apply smoothing to zoom
        const radiusDiff = this.targetRadius - this.camera.radius;
        this.camera.radius += radiusDiff * this.config.smoothing;
        
        // Maintain isometric angle
        this.camera.beta = Math.PI / 3.5;
    }
    
    /**
     * Update keyboard movement with frame-rate independence
     */
    updateKeyboardMovement(deltaTime) {
        const moveSpeed = this.config.keyboardMoveSpeed * deltaTime;
        const rotateSpeed = this.config.keyboardRotateSpeed * deltaTime;

        // Calculate movement vector relative to camera rotation
        this._tempVector.set(0, 0, 0);

        // Forward/backward movement (relative to camera facing direction)
        if (this.keys.w) {
            this._tempVector.z += moveSpeed;
        }
        if (this.keys.s) {
            this._tempVector.z -= moveSpeed;
        }

        // Left/right movement (relative to camera facing direction)
        if (this.keys.a) {
            this._tempVector.x -= moveSpeed;
        }
        if (this.keys.d) {
            this._tempVector.x += moveSpeed;
        }

        // Apply camera rotation to movement vector if there's any movement
        if (this._tempVector.length() > 0) {
            BABYLON.Quaternion.RotationAxisToRef(
                BABYLON.Vector3.Up(),
                this.camera.alpha,
                this._tempQuaternion
            );
            
            this._tempVector.rotateByQuaternionToRef(this._tempQuaternion, this._tempVector);

            // Apply the rotated movement to target position
            this.targetPosition.addInPlace(this._tempVector);

            // Apply bounds after movement
            this.enforceTargetBounds();
        }

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
    
    /**
     * Enforce bounds on current camera position (for immediate updates)
     */
    enforceBounds() {
        this.camera.target.x = Math.max(this.config.bounds.minX, 
                                      Math.min(this.config.bounds.maxX, this.camera.target.x));
        this.camera.target.z = Math.max(this.config.bounds.minZ, 
                                      Math.min(this.config.bounds.maxZ, this.camera.target.z));
    }
    
    resetCamera() {
        // Return to default position and rotation
        this.targetPosition = BABYLON.Vector3.Zero();
        this.targetAlpha = -Math.PI / 4;
        this.targetRadius = 30;
        this.camera.beta = Math.PI / 3.5;
        
        console.log('📷 Camera reset to default position');
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
    
    setEdgePanning(enabled, threshold = 30, speed = 15.0) {
        this.config.edgePanEnabled = enabled;
        this.config.edgePanThreshold = threshold;
        this.config.edgePanSpeed = speed;
    }
    
    setSmoothingFactor(factor) {
        this.config.smoothing = Math.max(0, Math.min(1, factor));
    }
    
    setTouchMoveThreshold(threshold) {
        this.touchMoveThreshold = threshold;
    }
    
    // ===== CLEANUP =====
    
    dispose() {
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Remove all canvas event listeners
        this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
        this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
        this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseleave);
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
        
        // Clear bound handlers
        this.boundHandlers = {};
        
        console.log('🗑️ SimCity camera controls disposed');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SimCityCameraControls = SimCityCameraControls;
}