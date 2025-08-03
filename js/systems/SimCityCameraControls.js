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
            // More intelligent building mode check - only block if actively placing a building
            const isActivelyBuilding = this.gameManager.buildMode &&
                                     this.gameManager.buildingSystem &&
                                     this.gameManager.buildingSystem.previewMode;

            if (isActivelyBuilding) {
                console.log('🏗️ Camera controls blocked - actively placing building');
                return;
            }

            if (event.button === 0) { // Left button - pan
                this.isDragging = true;
                this.canvas.style.cursor = 'grabbing';
                console.log('🖱️ Mouse drag started');
            } else if (event.button === 2) { // Right button - rotation
                this.isRotating = true;
                this.canvas.style.cursor = 'grab';
                console.log('🖱️ Mouse rotation started');
            }

            this.lastPointerPosition = { x: event.clientX, y: event.clientY };
            event.preventDefault();
        });

        // Mouse move - execute drag/rotation
        this.canvas.addEventListener('mousemove', (event) => {
            // Allow camera movement unless actively placing a building
            const isActivelyBuilding = this.gameManager.buildMode &&
                                     this.gameManager.buildingSystem &&
                                     this.gameManager.buildingSystem.previewMode;

            if (isActivelyBuilding) return;

            if (this.isDragging) {
                this.handlePan(event);
            } else if (this.isRotating) {
                this.handleRotation(event);
            }
        });

        // Mouse up - stop drag/rotation
        this.canvas.addEventListener('mouseup', () => {
            if (this.isDragging) {
                console.log('🖱️ Mouse drag ended');
            }
            if (this.isRotating) {
                console.log('🖱️ Mouse rotation ended');
            }

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
            // More intelligent building mode check for touch
            const isActivelyBuilding = this.gameManager.buildMode &&
                                     this.gameManager.buildingSystem &&
                                     this.gameManager.buildingSystem.previewMode;

            if (isActivelyBuilding) return;

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
            // Allow touch movement unless actively placing a building
            const isActivelyBuilding = this.gameManager.buildMode &&
                                     this.gameManager.buildingSystem &&
                                     this.gameManager.buildingSystem.previewMode;

            if (isActivelyBuilding) return;

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

        // Calculate movement vector relative to camera rotation
        let moveVector = new BABYLON.Vector3(0, 0, 0);

        // Forward/backward movement (relative to camera facing direction)
        if (this.keys.w) {
            moveVector.z += moveSpeed; // Forward (corrected direction)
        }
        if (this.keys.s) {
            moveVector.z -= moveSpeed; // Backward (corrected direction)
        }

        // Left/right movement (relative to camera facing direction)
        if (this.keys.a) {
            moveVector.x -= moveSpeed; // Left
        }
        if (this.keys.d) {
            moveVector.x += moveSpeed; // Right
        }

        // Apply camera rotation to movement vector if there's any movement
        if (moveVector.length() > 0) {
            const rotatedMovement = moveVector.rotateByQuaternionToRef(
                BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Up(), this.camera.alpha),
                new BABYLON.Vector3()
            );

            // Apply the rotated movement to camera target
            this.camera.target.addInPlace(rotatedMovement);

            // Apply bounds after movement
            this.enforceBounds();
        }

        // Rotation (independent of movement)
        if (this.keys.q) {
            this.camera.alpha -= rotateSpeed;
        }
        if (this.keys.e) {
            this.camera.alpha += rotateSpeed;
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
