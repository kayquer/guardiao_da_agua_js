/**
 * BuildingSystem — Notificações, indicadores de obra, celebração e rótulos
 * Parte da classe BuildingSystem (js/systems/BuildingSystem.js), anexada via mixin(): use this.* normalmente.
 */
mixin(BuildingSystem, {
    // ===== SISTEMA DE NOTIFICAÇÕES =====
    showNotification(message, type = 'info') {
        // Tentar usar o sistema de notificações do jogo se disponível
        if (window.gameManager && window.gameManager.uiManager && window.gameManager.uiManager.showNotification) {
            window.gameManager.uiManager.showNotification(message, type);
        } else if (window.gameManager && window.gameManager.uiManager && window.gameManager.uiManager.showAlert) {
            window.gameManager.uiManager.showAlert(message, type);
        } else {
            // Fallback para console se UI não estiver disponível
            const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
            log(`${prefix} ${message}`);
        }
    },

    showEnergyShortageNotification(electricity) {
        // Cooldown de 30s para não spammar
        const now = Date.now();
        if (this._energyWarningCooldown && now < this._energyWarningCooldown) return;
        this._energyWarningCooldown = now + 30000;

        const efficiencyPercent = Math.round((electricity.efficiency || 0) * 100);
        const generation = Math.round(electricity.generation || 0);
        const consumption = Math.round(electricity.consumption || 0);
        const deficit = consumption - generation;

        const uiManager = window.gameManager?.uiManager;
        if (uiManager && uiManager.showCentralAlert) {
            uiManager.showCentralAlert(
                'Energia Insuficiente',
                `Seus edifícios estão operando a apenas ${efficiencyPercent}% de eficiência por falta de energia.`,
                'warning',
                `Geração atual: ${generation} kW | Consumo: ${consumption} kW | Déficit: ${deficit} kW\n\nConstrua usinas de energia (Hidrelétrica, Painéis Solares ou Turbinas Eólicas) para suprir a demanda.`,
                // Se esperou um livro/tutorial fechar: só mostra se ainda faltar energia (obras contam)
                { stillRelevant: () => this.isEnergyShortProjected() }
            );
        } else {
            this.showNotification(`Energia insuficiente! Eficiência: ${efficiencyPercent}%`, 'warning');
        }
    },

    // Falta energia contando as obras em andamento (o consumo/geração delas só entra na conclusão)?
    isEnergyShortProjected() {
        const rm = window.gameManager?.resourceManager;
        if (!rm) return false;
        const electricity = rm.getElectricity();
        let consumption = electricity.consumption, generation = electricity.generation;
        this.buildings.forEach(b => {
            if (b.effectsApplied || !b.underConstruction) return;
            consumption += b.config?.powerConsumption || 0;
            if (!b.isRented) generation += b.config?.powerGeneration || 0;
        });
        return consumption > generation;
    },

    // ===== FUNÇÃO REUTILIZÁVEL PARA CRIAR PLAQUINHAS DE TEXTO CARTOON =====
    createCartoonTextPlate(id, position, initialText = "", options = {}) {
        // Presets de cores
        const colorPresets = {
            green: {
                bgColor: "rgba(0, 100, 20, 0.95)",
                highlightColor: "rgba(100, 255, 100, 0.3)",
                outlineColor: "rgba(0, 40, 0, 1)",
                textColor: "white",
                emissiveColor: new BABYLON.Color3(0.5, 1, 0.5)
            },
            red: {
                bgColor: "rgba(180, 20, 20, 0.95)",
                highlightColor: "rgba(255, 100, 100, 0.3)",
                outlineColor: "rgba(80, 0, 0, 1)",
                textColor: "#FF4444",
                emissiveColor: new BABYLON.Color3(1, 0.2, 0.2)
            },
            blue: {
                bgColor: "rgba(20, 100, 200, 0.95)",
                highlightColor: "rgba(100, 150, 255, 0.3)",
                outlineColor: "rgba(0, 40, 100, 1)",
                textColor: "#00CCFF",
                emissiveColor: new BABYLON.Color3(0.2, 0.6, 1)
            },
            yellow: {
                bgColor: "rgba(200, 180, 0, 0.95)",
                highlightColor: "rgba(255, 255, 100, 0.3)",
                outlineColor: "rgba(100, 80, 0, 1)",
                textColor: "yellow",
                emissiveColor: new BABYLON.Color3(1, 1, 0.2)
            },
            orange: {
                bgColor: "rgba(200, 100, 0, 0.95)",
                highlightColor: "rgba(255, 150, 50, 0.3)",
                outlineColor: "rgba(100, 40, 0, 1)",
                textColor: "#FFA500",
                emissiveColor: new BABYLON.Color3(1, 0.6, 0)
            },
            purple: {
                bgColor: "rgba(120, 20, 180, 0.95)",
                highlightColor: "rgba(200, 100, 255, 0.3)",
                outlineColor: "rgba(60, 0, 100, 1)",
                textColor: "#CC00FF",
                emissiveColor: new BABYLON.Color3(0.8, 0.2, 1)
            }
        };

        // Aplicar preset se fornecido
        let colors = {};
        if (options.preset && colorPresets[options.preset]) {
            colors = { ...colorPresets[options.preset] };
        }

        // Opções padrão (podem sobrescrever o preset)
        const config = {
            width: 1.5,
            height: 0.5,
            textureWidth: 320,
            textureHeight: 80,
            fontSize: 44,
            bgColor: colors.bgColor || "rgba(0, 100, 20, 0.95)",
            highlightColor: colors.highlightColor || "rgba(100, 255, 100, 0.3)",
            outlineColor: colors.outlineColor || "rgba(0, 40, 0, 1)",
            textColor: colors.textColor || "white",
            textOutlineColor: "rgba(0, 0, 0, 0.8)",
            emissiveColor: colors.emissiveColor || new BABYLON.Color3(0.5, 1, 0.5),
            borderRadius: 25,
            outlineWidth: 6,
            textOutlineWidth: 5,
            billboard: true,
            renderingGroupId: 2,
            alphaIndex: 999,
            ...options
        };

        // Criar plano para o texto
        const textPlane = BABYLON.MeshBuilder.CreatePlane(`cartoonText_${id}`, {
            width: config.width,
            height: config.height
        }, this.scene);

        textPlane.position = position.clone();
    
        if (config.billboard) {
            textPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        }

        // Configurar rendering
        textPlane.renderingGroupId = config.renderingGroupId;
        textPlane.alphaIndex = config.alphaIndex;

        // Criar textura dinâmica
        const texture = new BABYLON.DynamicTexture(`cartoonTexture_${id}`,
            { width: config.textureWidth, height: config.textureHeight }, this.scene, false);

        texture.hasAlpha = true;

        // Material
        const material = new BABYLON.StandardMaterial(`cartoonMat_${id}`, this.scene);
        material.diffuseTexture = texture;
        material.emissiveTexture = texture;
        material.emissiveColor = config.emissiveColor;
        material.backFaceCulling = false;
        material.opacityTexture = texture;
        material.disableDepthWrite = true;
        material.needDepthPrePass = false;
        material.separateCullingPass = false;

        textPlane.material = material;

        // ===== FUNÇÃO DE DESENHO CARTOON =====
        const drawCartoonText = (text) => {
            const ctx = texture.getContext();
            const centerX = config.textureWidth / 2;
            const centerY = config.textureHeight / 2;
            const boxWidth = config.textureWidth - 40;
            const boxHeight = config.textureHeight - 20;
            const radius = config.borderRadius;
        
            ctx.clearRect(0, 0, config.textureWidth, config.textureHeight);
        
            // Sombra
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
        
            // Desenhar retângulo arredondado - fundo
            ctx.fillStyle = config.bgColor;
            ctx.beginPath();
            ctx.moveTo(centerX - boxWidth/2 + radius, centerY - boxHeight/2);
            ctx.lineTo(centerX + boxWidth/2 - radius, centerY - boxHeight/2);
            ctx.quadraticCurveTo(centerX + boxWidth/2, centerY - boxHeight/2, centerX + boxWidth/2, centerY - boxHeight/2 + radius);
            ctx.lineTo(centerX + boxWidth/2, centerY + boxHeight/2 - radius);
            ctx.quadraticCurveTo(centerX + boxWidth/2, centerY + boxHeight/2, centerX + boxWidth/2 - radius, centerY + boxHeight/2);
            ctx.lineTo(centerX - boxWidth/2 + radius, centerY + boxHeight/2);
            ctx.quadraticCurveTo(centerX - boxWidth/2, centerY + boxHeight/2, centerX - boxWidth/2, centerY + boxHeight/2 - radius);
            ctx.lineTo(centerX - boxWidth/2, centerY - boxHeight/2 + radius);
            ctx.quadraticCurveTo(centerX - boxWidth/2, centerY - boxHeight/2, centerX - boxWidth/2 + radius, centerY - boxHeight/2);
            ctx.closePath();
            ctx.fill();
        
            // Resetar sombra
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        
            // Contorno cartoon
            ctx.strokeStyle = config.outlineColor;
            ctx.lineWidth = config.outlineWidth;
            ctx.stroke();
        
            // Highlight no topo (efeito 3D cartoon)
            ctx.fillStyle = config.highlightColor;
            ctx.beginPath();
            ctx.moveTo(centerX - boxWidth/2 + radius, centerY - boxHeight/2);
            ctx.lineTo(centerX + boxWidth/2 - radius, centerY - boxHeight/2);
            ctx.quadraticCurveTo(centerX + boxWidth/2, centerY - boxHeight/2, centerX + boxWidth/2, centerY - boxHeight/2 + radius);
            ctx.lineTo(centerX + boxWidth/2, centerY - boxHeight/2 + 15);
            ctx.lineTo(centerX - boxWidth/2, centerY - boxHeight/2 + 15);
            ctx.lineTo(centerX - boxWidth/2, centerY - boxHeight/2 + radius);
            ctx.quadraticCurveTo(centerX - boxWidth/2, centerY - boxHeight/2, centerX - boxWidth/2 + radius, centerY - boxHeight/2);
            ctx.closePath();
            ctx.fill();
        
            // Texto com contorno cartoon
            ctx.font = `bold ${config.fontSize}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
        
            // Contorno preto grosso do texto
            ctx.strokeStyle = config.textOutlineColor;
            ctx.lineWidth = config.textOutlineWidth;
            ctx.strokeText(text, centerX, centerY);
        
            // Texto principal
            ctx.fillStyle = config.textColor;
            ctx.fillText(text, centerX, centerY);
        
            // Brilho no texto (efeito cartoon)
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.fillText(text, centerX - 1, centerY - 2);
        
            texture.update();
        };

        // Desenhar texto inicial
        if (initialText) {
            drawCartoonText(initialText);
        }

        // Retornar objeto com referências
        return {
            mesh: textPlane,
            texture: texture,
            material: material,
            updateText: drawCartoonText,
            dispose: () => {
                textPlane.dispose();
                texture.dispose();
                material.dispose();
            }
        };
    },
// ===== INDICADORES VISUAIS DE CONSTRUÇÃO (USANDO A FUNÇÃO REUTILIZÁVEL) =====
    createConstructionIndicator(buildingData) {
        const worldPos = this.gridManager.gridToWorld(buildingData.gridX, buildingData.gridZ);

        // Criar barra de progresso 3D
        const progressBar = BABYLON.MeshBuilder.CreateBox(`progress_${buildingData.id}`, {
            width: 2,
            height: 0.2,
            depth: 0.4
        }, this.scene);

        progressBar.position.x = worldPos.x;
        progressBar.position.z = worldPos.z;
        progressBar.position.y = 3;

        // Material da barra de progresso
        const progressMaterial = new BABYLON.StandardMaterial(`progressMat_${buildingData.id}`, this.scene);
        progressMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.8, 0.2);
        progressMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.1);
        progressBar.material = progressMaterial;

        // Criar fundo da barra
        const progressBg = BABYLON.MeshBuilder.CreateBox(`progressBg_${buildingData.id}`, {
            width: 2.1,
            height: 0.25,
            depth: 0.45
        }, this.scene);

        progressBg.position.x = worldPos.x;
        progressBg.position.z = worldPos.z;
        progressBg.position.y = 2.98;

        const bgMaterial = new BABYLON.StandardMaterial(`progressBgMat_${buildingData.id}`, this.scene);
        bgMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        progressBg.material = bgMaterial;

        // ===== USAR A FUNÇÃO REUTILIZÁVEL PARA CRIAR PLAQUINHA =====
        const textPosition = new BABYLON.Vector3(worldPos.x, 3.8, worldPos.z);
        const textPlate = this.createCartoonTextPlate(
            `progress_${buildingData.id}`,
            textPosition,
            "0%",
            {
                bgColor: "rgba(0, 100, 20, 0.95)", // Verde escuro
                fontSize: 44
            }
        );

        // Armazenar referências
        buildingData.constructionIndicators = {
            progressBar: progressBar,
            progressBg: progressBg,
            textPlate: textPlate
        };
    },

    updateConstructionIndicator(buildingData, progress) {
        if (!buildingData.constructionIndicators) return;

        const { progressBar, textPlate } = buildingData.constructionIndicators;

        // Atualizar largura da barra de progresso
        progressBar.scaling.x = progress;

        // Atualizar cor baseada no progresso
        const material = progressBar.material;
        if (material) {
            const red = 1 - progress;
            const green = progress;
            material.diffuseColor = new BABYLON.Color3(red, green, 0.2);
            material.emissiveColor = new BABYLON.Color3(red * 0.5, green * 0.5, 0.1);
        }

        // Atualizar texto de porcentagem
        const percentage = Math.floor(progress * 100);
        if (textPlate && textPlate.updateText) {
            try {
                textPlate.updateText(`${percentage}%`);
            } catch (error) {
                console.warn('⚠️ Erro ao atualizar texto de progresso:', error);
            }
        }
    },

    removeConstructionVisuals(buildingData) {
        // ===== FIX BUILDING VISIBILITY: Restore building to normal state =====

        // Remover indicadores de progresso
        if (buildingData.constructionIndicators) {
            const { progressBar, progressBg, textPlate } = buildingData.constructionIndicators;

            // Remover barras de progresso
            if (progressBar && !progressBar.isDisposed()) progressBar.dispose();
            if (progressBg && !progressBg.isDisposed()) progressBg.dispose();
        
            // ===== USAR O MÉTODO DISPOSE DA PLAQUINHA =====
            if (textPlate) {
                textPlate.dispose(); // Já faz cleanup completo de mesh, texture e material
            }

            delete buildingData.constructionIndicators;
        }

        // ===== CRITICAL FIX: Restore building mesh to normal state =====
        if (buildingData.mesh && !buildingData.mesh.isDisposed()) {
            // ✅ FIX: Parar a animação de construção ANTES de restaurar visuais
            if (buildingData.constructionAnimationData) {
                buildingData.constructionAnimationData.isAnimating = false;
            }

            // Restore original scaling immediately
            buildingData.mesh.scaling = buildingData.originalScaling || new BABYLON.Vector3(1, 1, 1);

            // ✅ FIX: FORÇAR rotação para (0, 0, 0) para alinhamento perfeito com grid
            buildingData.mesh.rotation = BABYLON.Vector3.Zero();
            log(`🎯 Rotação FORÇADA para (0, 0, 0) - alinhamento perfeito ao grid`);

            // ✅ FIX: Restaurar material original SEM sobrescrever com novo material
            if (buildingData.originalMaterial) {
                buildingData.mesh.material = buildingData.originalMaterial;
                log(`♻️ Material original restaurado para ${buildingData.config.name}`);
            }
            // Se não houver material salvo, o mesh já deve ter o material do merge

            // Ensure mesh is visible
            buildingData.mesh.isVisible = true;
            buildingData.mesh.setEnabled(true);

            log(`🔧 Building mesh restored to normal state: ${buildingData.config.name}`);
        }

        // Remover efeitos visuais aprimorados
        this.removeConstructionEffects(buildingData);
    },

    applyConstructionVisuals(buildingData) {
        if (buildingData.mesh) {
            // ✅ FIX: Garantir que a rotação esteja zerada antes de salvar
            buildingData.mesh.rotation = BABYLON.Vector3.Zero();
            
            // Aplicar efeito de construção aprimorado (modelo .glb: cresce de baixo pra cima, base no chão)
            buildingData.mesh.scaling = this.getConstructionScaling(buildingData.mesh, 0);
            buildingData.originalRotation = BABYLON.Vector3.Zero(); // Sempre (0, 0, 0) para grid
            buildingData.originalScaling = new BABYLON.Vector3(1, 1, 1);

            // ✅ FIX: Salvar material original ANTES de aplicar efeitos de construção
            if (!buildingData.originalMaterial && buildingData.mesh.material) {
                buildingData.originalMaterial = buildingData.mesh.material;
                log(`💾 Material original salvo para ${buildingData.config.name}`);
            }

            // Aplicar material de construção semi-transparente
            this.applyConstructionMaterial(buildingData);

            // Criar efeitos de partículas de construção
            this.createConstructionParticles(buildingData);

            // Adicionar animação de rotação suave durante construção
            this.startConstructionAnimation(buildingData);

            log(`🎨 Efeitos visuais de construção aplicados para ${buildingData.config.name}`);
        }
    },

    showCompletionIndicator(buildingData) {
        const worldPos = this.gridManager.gridToWorld(buildingData.gridX, buildingData.gridZ);

        // ===== EFEITOS DE CONCLUSÃO APRIMORADOS =====
        this.createCompletionCelebration(buildingData, worldPos);
        this.createCompletionText(buildingData, worldPos);
        this.createCompletionParticles(buildingData, worldPos);

        // Restaurar escala do edifício com animação suave
        if (buildingData.mesh) {
            this.animateBuildingCompletion(buildingData);
        }

        // Mostrar notificação aprimorada
        this.showNotification(`🎉 ${buildingData.config.name} concluído com sucesso!`, 'success');
    },

    createCompletionCelebration(buildingData, worldPos) {
        try {
            // Criar anel de energia que se expande
            const celebrationRing = BABYLON.MeshBuilder.CreateTorus(`celebration_${buildingData.id}`, {
                diameter: 0.5,
                thickness: 0.1
            }, this.scene);

            celebrationRing.position = worldPos.clone();
            celebrationRing.position.y += 1;

            // Material brilhante
            const ringMaterial = new BABYLON.StandardMaterial(`celebrationMat_${buildingData.id}`, this.scene);
            ringMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0.5);
            ringMaterial.disableLighting = true;
            celebrationRing.material = ringMaterial;

            // Animação de expansão e fade
            const startTime = Date.now();
            const duration = 1500;

            const animateRing = () => {
                if (celebrationRing.isDisposed()) return;

                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;

                if (progress >= 1) {
                    celebrationRing.dispose();
                    ringMaterial.dispose();
                    return;
                }

                // Expansão
                const scale = 1 + progress * 3;
                celebrationRing.scaling = new BABYLON.Vector3(scale, scale, scale);

                // Fade out
                ringMaterial.alpha = 1 - progress;

                // Rotação
                celebrationRing.rotation.y += 0.1;

                requestAnimationFrame(animateRing);
            };

            animateRing();

        } catch (error) {
            console.warn('⚠️ Erro ao criar celebração de conclusão:', error);
        }
    },
    createCompletionText(buildingData, worldPos) {
        try {
            // ===== USAR A FUNÇÃO REUTILIZÁVEL PARA CRIAR PLAQUINHA DE CONCLUSÃO =====
            const completionPosition = new BABYLON.Vector3(worldPos.x, 4, worldPos.z);
            const completionPlate = this.createCartoonTextPlate(
                `completion_${buildingData.id}`,
                completionPosition,
                "✅ CONCLUÍDO!",
                {
                    width: 3,
                    height: 1,
                    textureWidth: 512,
                    textureHeight: 128,
                    fontSize: 48,
                    bgColor: "rgba(0, 180, 80, 0.95)", // Verde vibrante
                    highlightColor: "rgba(100, 255, 150, 0.4)",
                    outlineColor: "rgba(0, 80, 40, 1)",
                    textColor: "#00FF88", // Verde neon
                    borderRadius: 30,
                    outlineWidth: 8,
                    textOutlineWidth: 6,
                    renderingGroupId: 2,
                    alphaIndex: 1001
                }
            );

            const completionText = completionPlate.mesh;
            const textMaterial = completionPlate.material;

            // Adicionar emissão extra para efeito de brilho
            textMaterial.emissiveColor = new BABYLON.Color3(0, 1, 0.5);

            // Animação de entrada e saída
            completionText.scaling = new BABYLON.Vector3(0, 0, 0);

            const startTime = Date.now();
            const animateText = () => {
                if (completionText.isDisposed()) return;

                const elapsed = Date.now() - startTime;

                if (elapsed < 300) {
                    // Animação de entrada (0-300ms)
                    const progress = elapsed / 300;
                    const scale = this.easeOutBounce(progress);
                    completionText.scaling = new BABYLON.Vector3(scale, scale, scale);
                } else if (elapsed < 2000) {
                    // Manter visível (300-2000ms)
                    completionText.scaling = new BABYLON.Vector3(1, 1, 1);
                    completionText.position.y = 4 + Math.sin(elapsed * 0.005) * 0.2; // Flutuação suave
                
                    // Pulsar o brilho
                    const pulse = Math.sin(elapsed * 0.008) * 0.3 + 0.7;
                    textMaterial.emissiveColor = new BABYLON.Color3(0, pulse, pulse * 0.5);
                } else if (elapsed < 2500) {
                    // Animação de saída (2000-2500ms)
                    const progress = (elapsed - 2000) / 500;
                    const scale = 1 - progress;
                    completionText.scaling = new BABYLON.Vector3(scale, scale, scale);
                    textMaterial.alpha = 1 - progress;
                } else {
                    // Limpar usando o método dispose da plaquinha
                    completionPlate.dispose();
                    return;
                }

                requestAnimationFrame(animateText);
            };

            animateText();

        } catch (error) {
            console.warn('⚠️ Erro ao criar texto de conclusão:', error);
        }
    },

    easeOutBounce(t) {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    },

    createCompletionParticles(buildingData, worldPos) {
        try {
            const particleCount = 12;
            const particles = [];

            for (let i = 0; i < particleCount; i++) {
                const particle = BABYLON.MeshBuilder.CreateSphere(`completionParticle_${buildingData.id}_${i}`, {
                    diameter: 0.15
                }, this.scene);

                // Posição inicial no centro
                particle.position = worldPos.clone();
                particle.position.y += 2;

                // Material brilhante colorido
                const particleMaterial = new BABYLON.StandardMaterial(`completionParticleMat_${buildingData.id}_${i}`, this.scene);
                const hue = (i / particleCount) * 360;
                const color = this.hslToRgb(hue, 0.8, 0.6);
                particleMaterial.emissiveColor = new BABYLON.Color3(color.r, color.g, color.b);
                particleMaterial.disableLighting = true;
                particle.material = particleMaterial;

                particles.push({ mesh: particle, material: particleMaterial });

                // Animação de explosão
                const angle = (i / particleCount) * Math.PI * 2;
                const velocity = {
                    x: Math.cos(angle) * (2 + Math.random()),
                    y: 3 + Math.random() * 2,
                    z: Math.sin(angle) * (2 + Math.random())
                };

                this.animateCompletionParticle(particle, particleMaterial, velocity, worldPos);
            }

        } catch (error) {
            console.warn('⚠️ Erro ao criar partículas de conclusão:', error);
        }
    },

    animateCompletionParticle(particle, material, velocity, startPos) {
        const startTime = Date.now();
        const duration = 2000;
        const gravity = -0.01;

        const animateParticle = () => {
            if (particle.isDisposed()) return;

            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                material.dispose();
                particle.dispose();
                return;
            }

            // Física simples
            const time = elapsed / 1000;
            particle.position.x = startPos.x + velocity.x * time;
            particle.position.z = startPos.z + velocity.z * time;
            particle.position.y = startPos.y + velocity.y * time + 0.5 * gravity * time * time;

            // Fade out
            material.alpha = 1 - progress;

            // Rotação
            particle.rotation.x += 0.1;
            particle.rotation.y += 0.1;

            requestAnimationFrame(animateParticle);
        };

        animateParticle();
    },

    animateBuildingCompletion(buildingData) {
        try {
            const mesh = buildingData.mesh;
            const targetScale = buildingData.originalScaling || new BABYLON.Vector3(1, 1, 1);

            // Animação de "pop" de conclusão
            const startTime = Date.now();
            const duration = 800;

            const animateCompletion = () => {
                if (mesh.isDisposed()) return;

                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;

                if (progress >= 1) {
                    mesh.scaling = targetScale;
                    mesh.rotation = buildingData.originalRotation || BABYLON.Vector3.Zero();
                    return;
                }

                // Efeito de "bounce" na escala
                const bounceScale = this.easeOutBounce(progress);
                // Modelo .glb já terminou a obra no tamanho cheio: só um "pulo" leve na altura
                const popStart = mesh.metadata?.fromModel
                    ? new BABYLON.Vector3(targetScale.x, targetScale.y * 0.85, targetScale.z)
                    : new BABYLON.Vector3(0.3, 0.3, 0.3);
                const scale = BABYLON.Vector3.Lerp(
                    popStart,
                    targetScale,
                    bounceScale
                );

                mesh.scaling = scale;

                // Parar rotação gradualmente
                const rotationFactor = 1 - progress;
                mesh.rotation.y = (buildingData.originalRotation?.y || 0) + (rotationFactor * 0.1);

                requestAnimationFrame(animateCompletion);
            };

            animateCompletion();

        } catch (error) {
            console.warn('⚠️ Erro ao animar conclusão do edifício:', error);
        }
    },

    hslToRgb(h, s, l) {
        h /= 360;
        const a = s * Math.min(l, 1 - l);
        const f = n => {
            const k = (n + h / (1/12)) % 1;
            return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        return { r: f(0), g: f(8), b: f(4) };
    },

    // ===== LABELS DE NOME DOS EDIFÍCIOS =====
    createBuildingNameLabel(buildingMesh, buildingType, worldPos) {
        try {
            // Criar plano para o texto
            const labelPlane = BABYLON.MeshBuilder.CreatePlane(`label_${buildingMesh.name}`, {
                width: 3,
                height: 0.8
            }, this.scene);

            // Posicionar acima do edifício
            labelPlane.position.x = worldPos.x;
            labelPlane.position.z = worldPos.z;
            labelPlane.position.y = this.getBuildingHeight(buildingType) + 1.5;
            labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

            // ===== Z-INDEX FIX: Configurar rendering group para aparecer acima de outros elementos =====
            labelPlane.renderingGroupId = 2; // Grupo de renderização alto para aparecer por cima
            labelPlane.alphaIndex = 1000; // Índice alto para garantir ordem de renderização

            // Desabilitar depth testing para garantir que sempre apareça por cima
            labelPlane.material = null; // Temporário para configurar depois

            // Criar textura dinâmica com texto
            const dynamicTexture = new BABYLON.DynamicTexture(`labelTexture_${buildingMesh.name}`,
                { width: 512, height: 128 }, this.scene);

            // Configurar fonte e texto
            const font = "bold 48px Arial";
            const text = buildingType.name || buildingType.id;

            // Limpar textura e desenhar texto
            dynamicTexture.drawText(text, null, null, font, "#FFFFFF", "#000000AA", true);

            // Criar material para o label com configurações otimizadas para z-index
            const labelMaterial = new BABYLON.StandardMaterial(`labelMat_${buildingMesh.name}`, this.scene);
            labelMaterial.diffuseTexture = dynamicTexture;
            labelMaterial.emissiveTexture = dynamicTexture;
            labelMaterial.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            labelMaterial.backFaceCulling = false;
            labelMaterial.hasAlpha = true;

            // ===== Z-INDEX FIX: Configurações de material para renderização por cima =====
            labelMaterial.disableDepthWrite = true; // Não escrever no depth buffer
            labelMaterial.needDepthPrePass = false; // Não precisa de depth pre-pass
            labelMaterial.separateCullingPass = false; // Renderizar em uma única passada

            labelPlane.material = labelMaterial;

            // Inicialmente oculto - só aparece no hover ou seleção
            labelPlane.visibility = 0;
            labelPlane.isVisible = false;

            // Armazenar referência no mesh do edifício
            buildingMesh.nameLabel = labelPlane;

            // Adicionar propriedades para animação
            labelPlane.targetVisibility = 0;
            labelPlane.fadeSpeed = 5; // Velocidade da transição (5 = 200ms)

            log(`✅ Label criado para ${buildingType.name}: "${text}" (inicialmente oculto) - Z-index configurado`);

        } catch (error) {
            console.error(`❌ Erro ao criar label para ${buildingType.name}:`, error);
        }
    },

    removeBuildingNameLabel(buildingMesh) {
        if (buildingMesh.nameLabel) {
            try {
                if (!buildingMesh.nameLabel.isDisposed()) {
                    // Limpar material e textura
                    if (buildingMesh.nameLabel.material) {
                        if (buildingMesh.nameLabel.material.diffuseTexture) {
                            buildingMesh.nameLabel.material.diffuseTexture.dispose();
                        }
                        if (buildingMesh.nameLabel.material.emissiveTexture) {
                            buildingMesh.nameLabel.material.emissiveTexture.dispose();
                        }
                        buildingMesh.nameLabel.material.dispose();
                    }
                    buildingMesh.nameLabel.dispose();
                }
                buildingMesh.nameLabel = null;
            } catch (error) {
                console.error('❌ Erro ao remover label do edifício:', error);
            }
        }
    },

    // Atualizar animações dos labels (chamado no update loop)
    updateBuildingLabels(deltaTime) {
        this.buildings.forEach(building => {
            if (building.mesh && building.mesh.nameLabel) {
                const label = building.mesh.nameLabel;

                // Animar transição suave
                if (Math.abs(label.visibility - label.targetVisibility) > 0.01) {
                    const direction = label.targetVisibility > label.visibility ? 1 : -1;
                    label.visibility += direction * label.fadeSpeed * deltaTime;

                    // Clamp entre 0 e 1
                    label.visibility = Math.max(0, Math.min(1, label.visibility));

                    // Ocultar completamente quando invisível
                    if (label.visibility <= 0.01) {
                        label.visibility = 0;
                        label.isVisible = false;
                    }
                }
            }
        });
    },

    // Atualizar efeitos de escassez de energia (chamado no update loop)
    updatePowerShortageEffects(deltaTime) {
        this.buildings.forEach(building => {
            if (building.mesh && building.mesh.powerShortageFlicker) {
                const flicker = building.mesh.powerShortageFlicker;
                flicker.time += deltaTime / 1000; // deltaTime vem em ms; interval/duration em segundos

                // Verificar se é hora de piscar
                if (flicker.time >= flicker.interval) {
                    flicker.time = 0;

                    // Aplicar efeito de piscada
                    if (building.mesh.material) {
                        // Guarda o alfa real uma vez: lido no meio de uma piscada, ele ficaria preso em 0.3
                        flicker.baseAlpha ??= building.mesh.material.alpha || 1;
                        const originalAlpha = flicker.baseAlpha;

                        // Piscar reduzindo a opacidade
                        building.mesh.material.alpha = 0.3;

                        // Restaurar opacidade após a duração do piscar
                        setTimeout(() => {
                            if (building.mesh && building.mesh.material) {
                                building.mesh.material.alpha = originalAlpha;
                            }
                        }, flicker.duration * 1000);
                    }
                }
            }
        });
    },
});
