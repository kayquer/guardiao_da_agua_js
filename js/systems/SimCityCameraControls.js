/**
 * SimCity-Style Camera Controls for Guardião da Água
 * Provides comprehensive camera control system similar to SimCity games
 * Supports mouse, keyboard, and touch controls with smooth interactions
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
        
        // Configuration
        this.config = {
            panSensitivity: 0.02,
            rotateSensitivity: 0.008,
            zoomSensitivity: 0.15,
            keyboardMoveSpeed: 2.0,
            keyboardRotateSpeed: 0.1,
            smoothing: 0.1,
            
            // Camera bounds
            bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 },
            zoomLimits: { min: 10, max: 80 },
            
            // Touch settings
            touchPanSensitivity: 0.025,
            pinchZoomSensitivity: 0.02,
            rotationSensitivity: 0.005
        };
        
        // Keyboard state tracking
        this.keys = {
            w: false, a: false, s: false, d: false,
            q: false, e: false, r: false,
            arrowUp: false, arrowDown: false, arrowLeft: false, arrowRight: false
        };
        
        // Animation frame tracking
        this.animationFrame = null;
        
        this.setupControls();
        this.startUpdateLoop();
        
        console.log('🎮 SimCity-style camera controls initialized');
    }
    
    setupControls() {
        // ===== MOUSE CONTROLS =====
        this.setupMouseControls();
        
        // ===== TOUCH CONTROLS =====
        this.setupTouchControls();
        
        // ===== KEYBOARD CONTROLS =====
        this.setupKeyboardControls();
        
        // ===== CONTEXT MENU PREVENTION =====
        this.canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // ===== FOCUS MANAGEMENT =====
        this.canvas.addEventListener('mousedown', () => {
            this.canvas.focus();
        });
        
        // Make canvas focusable
        this.canvas.tabIndex = 0;
    }
    
    setupMouseControls() {
        // Mouse down - start drag/rotation
        this.canvas.addEventListener('mousedown', (event) => {
            // Only handle camera controls if not in building mode
            if (this.gameManager.buildMode) return;
            
            if (event.button === 0) { // Left button - pan
                this.isDragging = true;
                this.canvas.style.cursor = 'grabbing';
            } else if (event.button === 2) { // Right button - rotation
                this.isRotating = true;
                this.canvas.style.cursor = 'grab';
            }
            
            this.lastPointerPosition = { x: event.clientX, y: event.clientY };
            event.preventDefault();
        });
        
        // Mouse move - execute drag/rotation
        this.canvas.addEventListener('mousemove', (event) => {
            if (this.gameManager.buildMode) return;
            
            if (this.isDragging) {
                this.handlePan(event);
            } else if (this.isRotating) {
                this.handleRotation(event);
            }
        });
        
        // Mouse up - stop drag/rotation
        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isRotating = false;
            this.canvas.style.cursor = 'default';
        });
        
        // Mouse leave - stop all interactions
        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.isRotating = false;
            this.canvas.style.cursor = 'default';
        });
        
        // Mouse wheel - zoom (override existing zoom)
        this.canvas.addEventListener('wheel', (event) => {
            this.handleZoom(event);
            event.preventDefault();
        }, { passive: false });
    }
    
    setupTouchControls() {
        // Touch start
        this.canvas.addEventListener('touchstart', (event) => {
            if (this.gameManager.buildMode) return;
            
            this.touchStartPositions = Array.from(event.touches).map(touch => ({
                x: touch.clientX,
                y: touch.clientY,
                id: touch.identifier
            }));
            
            if (event.touches.length === 1) {
                // Single touch - pan
                this.isPanning = true;
                this.lastPointerPosition = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY
                };
            } else if (event.touches.length === 2) {
                // Two finger - zoom/rotate
                this.setupTwoFingerGesture(event);
            }
            
            event.preventDefault();
        }, { passive: false });
        
        // Touch move
        this.canvas.addEventListener('touchmove', (event) => {
            if (this.gameManager.buildMode) return;
            
            if (event.touches.length === 1 && this.isPanning) {
                this.handleTouchPan(event);
            } else if (event.touches.length === 2) {
                this.handleTwoFingerGesture(event);
            }
            
            event.preventDefault();
        }, { passive: false });
        
        // Touch end
        this.canvas.addEventListener('touchend', () => {
            this.isPanning = false;
            this.isDragging = false;
            this.isRotating = false;
            this.lastTouchDistance = null;
            this.lastTouchAngle = null;
            this.touchStartPositions = [];
        });
    }
    
    setupKeyboardControls() {
        // Key down
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        // Key up
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
    }
    
    handlePan(event) {
        const deltaX = event.clientX - this.lastPointerPosition.x;
        const deltaY = event.clientY - this.lastPointerPosition.y;
        
        this.panCamera(deltaX, deltaY, this.config.panSensitivity);
        this.lastPointerPosition = { x: event.clientX, y: event.clientY };
    }
    
    handleRotation(event) {
        const deltaX = event.clientX - this.lastPointerPosition.x;
        
        // Rotate camera horizontally
        this.camera.alpha += deltaX * this.config.rotateSensitivity;
        
        // Maintain isometric beta angle
        this.camera.beta = Math.PI / 3.5;
        
        this.lastPointerPosition = { x: event.clientX, y: event.clientY };
    }
    
    handleZoom(event) {
        const delta = event.deltaY > 0 ? 1 : -1;
        const zoomAmount = delta * this.config.zoomSensitivity * this.camera.radius;
        
        this.camera.radius += zoomAmount;
        
        // Apply zoom limits
        this.camera.radius = Math.max(this.config.zoomLimits.min, 
                                    Math.min(this.config.zoomLimits.max, this.camera.radius));
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
            
            this.camera.radius += zoomAmount;
            this.camera.radius = Math.max(this.config.zoomLimits.min, 
                                        Math.min(this.config.zoomLimits.max, this.camera.radius));
        }
        
        // Rotation with twist
        const currentAngle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        );
        
        if (this.lastTouchAngle !== null) {
            const angleDelta = currentAngle - this.lastTouchAngle;
            this.camera.alpha += angleDelta * this.config.rotationSensitivity;
        }
        
        this.lastTouchDistance = currentDistance;
        this.lastTouchAngle = currentAngle;
    }
    
    panCamera(deltaX, deltaY, sensitivity) {
        // Convert mouse movement to world movement
        const panVector = new BABYLON.Vector3(
            -deltaX * sensitivity,
            0,
            deltaY * sensitivity
        );
        
        // Apply camera rotation to pan vector
        const rotatedPan = panVector.rotateByQuaternionToRef(
            BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), this.camera.alpha),
            new BABYLON.Vector3()
        );
        
        // Move camera target
        this.camera.target.addInPlace(rotatedPan);
        
        // Apply bounds
        this.enforceBounds();
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
            this.updateKeyboardMovement();
            this.animationFrame = requestAnimationFrame(update);
        };
        update();
    }
    
    updateKeyboardMovement() {
        const moveSpeed = this.config.keyboardMoveSpeed;
        const rotateSpeed = this.config.keyboardRotateSpeed;
        
        // Movement
        if (this.keys.w) {
            this.camera.target.z -= moveSpeed;
        }
        if (this.keys.s) {
            this.camera.target.z += moveSpeed;
        }
        if (this.keys.a) {
            this.camera.target.x -= moveSpeed;
        }
        if (this.keys.d) {
            this.camera.target.x += moveSpeed;
        }
        
        // Rotation
        if (this.keys.q) {
            this.camera.alpha -= rotateSpeed;
        }
        if (this.keys.e) {
            this.camera.alpha += rotateSpeed;
        }
        
        // Apply bounds after keyboard movement
        if (this.keys.w || this.keys.s || this.keys.a || this.keys.d) {
            this.enforceBounds();
        }
    }
    
    enforceBounds() {
        // Limit camera movement to defined bounds
        this.camera.target.x = Math.max(this.config.bounds.minX, 
                                      Math.min(this.config.bounds.maxX, this.camera.target.x));
        this.camera.target.z = Math.max(this.config.bounds.minZ, 
                                      Math.min(this.config.bounds.maxZ, this.camera.target.z));
    }
    
    resetCamera() {
        // Return to default position and rotation
        this.camera.target = BABYLON.Vector3.Zero();
        this.camera.alpha = -Math.PI / 4;
        this.camera.beta = Math.PI / 3.5;
        this.camera.radius = 30;
        
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
    }
    
    setZoomLimits(min, max) {
        this.config.zoomLimits = { min, max };
    }
    
    // ===== CLEANUP =====
    
    dispose() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Remove all event listeners
        // Note: In a real implementation, you'd store references to bound functions
        // and remove them specifically. For brevity, this is simplified.
        
        console.log('🗑️ SimCity camera controls disposed');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SimCityCameraControls = SimCityCameraControls;
}
