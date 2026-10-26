/**
 * GameManager — Validação e recuperação da câmera
 * Parte da classe GameManager (js/core/GameManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(GameManager, {
    // ===== VALIDAÇÃO E RECUPERAÇÃO =====
    validate(value, type = 'number', options = {}) {
        if (type === 'number') {
            const isValid = typeof value === 'number' && isFinite(value) && !isNaN(value);
            if (!isValid) return false;
            
            if (options.min !== undefined && value < options.min) return false;
            if (options.max !== undefined && value > options.max) return false;
            if (options.absMax !== undefined && Math.abs(value) > options.absMax) return false;
            
            return true;
        }
        
        if (type === 'vector3') {
            if (!value || typeof value !== 'object') return false;
            return this.validate(value.x, 'number', options) && 
                   this.validate(value.y, 'number', options) && 
                   this.validate(value.z, 'number', options);
        }
        
        return false;
    },

    validateCameraStateWithBreaker() {
        if (!this.camera) return false;
        
        try {
            const alpha = this.camera.alpha;
            const beta = this.camera.beta;
            const radius = this.camera.radius;
            const target = this.camera.getTarget();
            const position = this.camera.position;
            
            if (!this.validate(alpha) || !this.validate(beta, 'number', {absMax: 10}) || 
                !this.validate(radius) || !this.validate(target, 'vector3') || 
                !this.validate(position, 'vector3')) {
                
                console.error('🚨 Corrupção detectada:', {
                    alpha, beta, radius,
                    target: { x: target.x, y: target.y, z: target.z },
                    position: { x: position.x, y: position.y, z: position.z }
                });
                
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro na validação:', error);
            return false;
        }
    },

    validateCameraPositionChange(operation, beforeState) {
        if (!this.camera) return;

        try {
            const afterPosition = this.camera.position;
            const afterTarget = this.camera.getTarget();

            const hasNaNPosition = isNaN(afterPosition.x) || isNaN(afterPosition.y) || isNaN(afterPosition.z);
            const hasNaNTarget = isNaN(afterTarget.x) || isNaN(afterTarget.y) || isNaN(afterTarget.z);

            if (hasNaNPosition || hasNaNTarget) {
                console.error('🚨 NaN detectado após operação:', {
                    operation, beforeState,
                    afterPosition: { x: afterPosition.x, y: afterPosition.y, z: afterPosition.z },
                    afterTarget: { x: afterTarget.x, y: afterTarget.y, z: afterTarget.z }
                });

                this.emergencyRecovery();
            }

        } catch (error) {
            console.error('❌ Erro na validação de mudança:', error);
        }
    },

    emergencyRecovery() {
        log('🚨 Iniciando recuperação de emergência...');
        
        try {
            if (this.scene) {
                this.scene.stopAllAnimations();
                if (this.camera && this.camera.animations) {
                    this.camera.animations = [];
                }
            }
            
            this.recreateCamera();
            this.renderState.recoveryAttempts++;
            
            log(`✅ Recuperação concluída (tentativa ${this.renderState.recoveryAttempts})`);
            
        } catch (error) {
            console.error('❌ Falha na recuperação:', error);
            this.renderState.circuitBreakerActive = true;
        }
    },

    recreateCamera() {
        log('🔧 Recriando câmera...');
        
        try {
            const oldCamera = this.camera;
            const scene = this.scene;
            
            const safeAlpha = -Math.PI / 4;
            const safeBeta = Math.PI / 3.5;
            const safeRadius = 30;
            const safeTarget = new BABYLON.Vector3(20, 0, 20);
            
            const newCamera = new BABYLON.ArcRotateCamera(
                "recoveredCamera", safeAlpha, safeBeta, safeRadius, safeTarget, scene
            );
            
            // Sem attachControl: quem move a câmera é SimCityCameraControls. Os controles padrão do Babylon com
            // angularSensibility 0 dividiam o arraste por zero (alpha = Infinity) e travavam a câmera de vez.
            newCamera.lowerRadiusLimit = 10;
            newCamera.upperRadiusLimit = 60;
            newCamera.inertia = 0.9;
            newCamera.angularSensibilityX = 0;
            newCamera.angularSensibilityY = 0;
            
            this.camera = newCamera;
            scene.activeCamera = newCamera;
            if (this.cameraControls) {
                const controls = this.cameraControls;
                controls.camera = newCamera;
                controls.targetPosition = safeTarget.clone();
                controls.targetAlpha = safeAlpha;
                controls.targetRadius = safeRadius;
            }
            
            this.isometricAngles = { alpha: safeAlpha, beta: safeBeta };
            
            if (oldCamera) {
                try {
                    oldCamera.dispose();
                } catch (disposeError) {
                    logWarn('⚠️ Erro ao dispor câmera antiga:', disposeError);
                }
            }
            
            log('✅ Câmera recriada com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao recriar câmera:', error);
            throw error;
        }
    },

    recoverCameraState() {
        try {
            log('🔧 Recuperando estado da câmera...');

            if (!this.camera) {
                console.error('❌ Câmera não inicializada');
                return;
            }

            const safeTarget = new BABYLON.Vector3(20, 0, 20);
            this.camera.setTarget(safeTarget);
            this.camera.alpha = this.CAMERA_CONSTANTS.ISOMETRIC_ALPHA;
            this.camera.beta = this.CAMERA_CONSTANTS.ISOMETRIC_BETA;
            this.camera.radius = this.CAMERA_CONSTANTS.DEFAULT_ZOOM_DISTANCE;

            if (this.scene && this.engine) {
                this.scene.render();
                this.engine.resize();
            }

            log('✅ Recuperação da câmera concluída');

        } catch (error) {
            console.error('❌ Falha na recuperação:', error);
            try {
                if (this.engine && !this.engine.isDisposed) {
                    this.engine.resize();
                }
            } catch (fallbackError) {
                console.error('❌ Fallback também falhou:', fallbackError);
            }
        }
    },

    handleCriticalFailure() {
        console.error('🚨 Falha crítica do sistema 3D');
        
        if (this.engine) {
            try {
                this.engine.stopRenderLoop();
                log('🔧 Render loop parado');
            } catch (error) {
                console.error('❌ Erro ao parar render loop:', error);
            }
        }
        
        const errorMessage = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.8); color: white; z-index: 10000;
                        display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <h1>🚨 Erro Crítico no Sistema 3D</h1>
                <p>O sistema de renderização 3D encontrou um erro irrecuperável.</p>
                <button onclick="window.location.reload()" 
                        style="padding: 10px 20px; font-size: 16px; background: #007acc; color: white; border: none; cursor: pointer;">
                    🔄 Recarregar Página
                </button>
                <small>O progresso não salvo será perdido.</small>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorMessage);
    },

    updateCameraControls(deltaTime) {
        if (!this.camera) return;

        if (!this.validateCameraStateWithBreaker()) {
            logWarn('⚠️ Câmera inválida, pulando frame');
            return;
        }

        // Only enforce isometric angles if not using SimCity controls
        // SimCity controls handle their own angle management
        if (!this.cameraControls) {
            this.enforceIsometricAngles();
        }

        if (!this.validateCameraStateWithBreaker()) {
            console.error('🚨 Câmera corrompida após operações de controle');
        }
    },

    enforceIsometricAngles() {
        if (!this.camera || !this.isometricAngles) return;
        
        try {
            const targetAlpha = this.isometricAngles.alpha;
            const targetBeta = this.isometricAngles.beta;
            
            if (!this.validate(targetAlpha, 'number', {absMax: 10}) || !this.validate(targetBeta, 'number', {absMax: 10})) {
                console.error('❌ Ângulos isométricos inválidos:', { targetAlpha, targetBeta });
                return;
            }
            
            const currentAlpha = this.camera.alpha;
            const currentBeta = this.camera.beta;
            
            if (this.validate(currentAlpha, 'number', {absMax: 10}) && this.validate(currentBeta, 'number', {absMax: 10})) {
                const alphaDiff = Math.abs(currentAlpha - targetAlpha);
                const betaDiff = Math.abs(currentBeta - targetBeta);
                
                if (alphaDiff > 0.01 || betaDiff > 0.01) {
                    this.camera.alpha = targetAlpha;
                    this.camera.beta = targetBeta;
                }
            } else {
                logWarn('⚠️ Corrigindo ângulos inválidos da câmera');
                this.camera.alpha = targetAlpha;
                this.camera.beta = targetBeta;
            }
            
        } catch (error) {
            console.error('❌ Erro ao enforcar ângulos isométricos:', error);
            this.emergencyRecovery();
        }
    },

    getCameraState() {
        if (!this.camera) return null;
        
        try {
            const target = this.camera.getTarget();
            return {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                },
                target: { x: target.x, y: target.y, z: target.z },
                alpha: this.camera.alpha,
                beta: this.camera.beta,
                radius: this.camera.radius
            };
        } catch (error) {
            return { error: 'Falha ao obter estado da câmera: ' + error.message };
        }
    },
});
