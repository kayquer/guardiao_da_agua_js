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

        // Primeira falta de energia do jogador: o guia 'energy' da Cláudia (TutorialSystem.GUIDES) no lugar do alerta
        if (window.gameManager?.tutorialSystem?.requestEnergyGuide?.()) return;

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
                `Geração atual: ${generation} MW | Consumo: ${consumption} MW | Falta: ${deficit} MW\n\nConstrua usinas em ⚡ Energia (Campo Eólico, Usina Solar ou Hidrelétrica) para suprir a demanda.`,
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
            consumption += this.getInitialPowerConsumption(b.config); // zona entra na fase 0
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
            material.diffuseColor.set(red, green, 0.2); // sem Color3 novo a cada quadro
            material.emissiveColor.set(red * 0.5, green * 0.5, 0.1);
        }

        // Atualizar texto de porcentagem: redesenhar o canvas e subir a textura só quando o número muda
        // (antes era a cada quadro, por obra)
        const percentage = Math.floor(progress * 100);
        if (buildingData.constructionIndicators.lastPercent === percentage) return;
        buildingData.constructionIndicators.lastPercent = percentage;
        if (textPlate && textPlate.updateText) {
            try {
                textPlate.updateText(`${percentage}%`);
            } catch (error) {
                logWarn('⚠️ Erro ao atualizar texto de progresso:', error);
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

            // Rotação do prédio (quarto de volta alinhado ao grid)
            this.applyBuildingRotation(buildingData);

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
        this.stopConstructionFx(buildingData);
    },

    applyConstructionVisuals(buildingData) {
        if (buildingData.mesh) {
            // Rotação do prédio (quarto de volta alinhado ao grid) antes de salvar
            this.applyBuildingRotation(buildingData);

            // Aplicar efeito de construção aprimorado (modelo .glb: cresce de baixo pra cima, base no chão)
            buildingData.mesh.scaling = this.getConstructionScaling(buildingData.mesh, 0);
            buildingData.originalRotation = this.getBuildingRotationVector(buildingData);
            buildingData.originalScaling = new BABYLON.Vector3(1, 1, 1);

            // ✅ FIX: Salvar material original ANTES de aplicar efeitos de construção
            if (!buildingData.originalMaterial && buildingData.mesh.material) {
                buildingData.originalMaterial = buildingData.mesh.material;
                log(`💾 Material original salvo para ${buildingData.config.name}`);
            }

            // Aplicar material de construção semi-transparente
            this.applyConstructionMaterial(buildingData);

            // Canteiro: poeira, fumacinha, marteladas e luzinhas de obra (startConstructionFx, abaixo)
            this.startConstructionFx(buildingData);

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
            logWarn('⚠️ Erro ao criar celebração de conclusão:', error);
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
            logWarn('⚠️ Erro ao criar texto de conclusão:', error);
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

    // ===== EFEITOS DE OBRA E DE CONCLUSÃO (partículas sutis) =====
    // Três sistemas de partículas COMPARTILHADOS por todos os canteiros (poeira, fumacinha, faíscas): a cada
    // quadro o emissor pula para um canteiro sorteado, então 1 ou 10 obras custam o mesmo número de draw
    // calls. Luzinhas âmbar e o clarão da martelada são instâncias de peças-modelo escondidas (sem PointLight).
    // Tudo escala com GraphicsQuality.particleScale (baixa: só faíscas pequenas e luzinhas).
    // A fumaça das zonas industriais (só na Alta) usa o mesmo observador: updateIndustrialSmoke.

    /** Escala de partículas do preset gráfico atual (1 alta, 0,6 média, 0,3 baixa). */
    getFxParticleScale() {
        const level = this.gameManager?.graphicsQuality || (typeof GraphicsQuality !== 'undefined' ? GraphicsQuality.current() : 'high');
        return typeof GraphicsQuality !== 'undefined' ? GraphicsQuality.preset(level).particleScale : 1;
    },

    /** isDisposed é método nos meshes e propriedade (boolean) em ParticleSystem/texturas. */
    isFxDisposed(obj) {
        return typeof obj.isDisposed === 'function' ? obj.isDisposed() : !!obj.isDisposed;
    },

    /** Textura gerada (DynamicTexture), criada uma vez e compartilhada: 'puff' (mancha redonda) ou 'spark' (estrela). */
    getFxTexture(kind) {
        if (!this.fxTextures) this.fxTextures = new Map();
        const cached = this.fxTextures.get(kind);
        if (cached && cached.getInternalTexture()) return cached; // descartada por fora (ex.: ps.dispose()) → refaz
        const size = 64;
        const tex = new BABYLON.DynamicTexture(`fxTex_${kind}`, { width: size, height: size }, this.scene, false);
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, size, size);
        const c = size / 2;
        if (kind === 'spark') {
            const g = ctx.createRadialGradient(c, c, 0, c, c, c);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.25, 'rgba(255,240,200,0.8)');
            g.addColorStop(1, 'rgba(255,200,120,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); // estrela de quatro pontas
            for (let i = 0; i < 8; i++) {
                const r = i % 2 ? c * 0.18 : c;
                const a = i * Math.PI / 4;
                ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            const g = ctx.createRadialGradient(c, c, 0, c, c, c);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.45, 'rgba(255,255,255,0.55)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, size, size);
        }
        tex.hasAlpha = true;
        tex.update();
        this.fxTextures.set(kind, tex);
        return tex;
    },

    /** Peça-modelo escondida dos efeitos (instanciada por canteiro): poste, lâmpada, brilho e clarão. */
    getFxTemplate(kind) {
        if (!this.fxTemplates) this.fxTemplates = new Map();
        const cached = this.fxTemplates.get(kind);
        if (cached && !cached.isDisposed()) return cached;
        let mesh;
        const mat = new BABYLON.StandardMaterial(`fxMat_${kind}`, this.scene);
        mat.specularColor = BABYLON.Color3.Black();
        if (kind === 'pole') {
            mesh = BABYLON.MeshBuilder.CreateCylinder('fxTpl_pole', { height: 0.55, diameter: 0.05, tessellation: 5 }, this.scene);
            mesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 0.275, 0));
            mat.diffuseColor = new BABYLON.Color3(0.35, 0.36, 0.4);
        } else if (kind === 'lamp') {
            mesh = BABYLON.MeshBuilder.CreateSphere('fxTpl_lamp', { diameter: 0.13, segments: 4 }, this.scene);
            mat.diffuseColor = BABYLON.Color3.Black();
            mat.emissiveColor = new BABYLON.Color3(1, 0.62, 0.12);
            mat.disableLighting = true;
        } else { // 'glow' (luzinha âmbar acesa) e 'flash' (clarão da martelada): plano virado para a câmera, aditivo
            mesh = BABYLON.MeshBuilder.CreatePlane(`fxTpl_${kind}`, { size: 1 }, this.scene);
            mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            mat.diffuseColor = BABYLON.Color3.Black();
            mat.emissiveColor = kind === 'flash' ? new BABYLON.Color3(1, 0.92, 0.7) : new BABYLON.Color3(1, 0.6, 0.12);
            mat.opacityTexture = this.getFxTexture(kind === 'flash' ? 'spark' : 'puff');
            mat.alphaMode = BABYLON.Engine.ALPHA_ADD;
            mat.disableLighting = true;
            mat.backFaceCulling = false;
        }
        mesh.material = mat;
        mesh.isPickable = false;
        mesh.isVisible = false; // modelo escondido: só as instâncias aparecem
        mesh.metadata = { fxTemplate: true };
        this.fxTemplates.set(kind, mesh);
        return mesh;
    },

    /** Sistema de partículas compartilhado dos canteiros ('dust', 'smoke', 'sparks'), criado sob demanda. */
    getSiteParticleSystem(kind) {
        if (!this.fxSystems) this.fxSystems = {};
        const existing = this.fxSystems[kind];
        if (existing && !this.isFxDisposed(existing)) return existing;
        const capacity = { dust: 120, smoke: 60, sparks: 80 }[kind];
        const ps = new BABYLON.ParticleSystem(`fx_site_${kind}`, capacity, this.scene);
        ps.particleTexture = this.getFxTexture(kind === 'sparks' ? 'spark' : 'puff');
        ps.emitter = new BABYLON.Vector3(0, -50, 0);
        ps.minEmitBox = new BABYLON.Vector3(0, 0, 0);
        ps.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
        ps.emitRate = 0;
        if (kind === 'dust') { // poeira de terra baixinha, subindo devagar
            ps.color1 = new BABYLON.Color4(0.66, 0.55, 0.4, 0.7);
            ps.color2 = new BABYLON.Color4(0.58, 0.48, 0.35, 0.45);
            ps.colorDead = new BABYLON.Color4(0.66, 0.57, 0.44, 0);
            ps.minSize = 0.45; ps.maxSize = 1;
            ps.minLifeTime = 1.4; ps.maxLifeTime = 2.4;
            ps.minEmitPower = 0.15; ps.maxEmitPower = 0.4;
            ps.direction1 = new BABYLON.Vector3(-0.5, 0.6, -0.5);
            ps.direction2 = new BABYLON.Vector3(0.5, 1, 0.5);
            ps.minAngularSpeed = -0.6; ps.maxAngularSpeed = 0.6;
            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        } else if (kind === 'smoke') { // fumacinha cinza clara do gerador/betoneira
            ps.color1 = new BABYLON.Color4(0.5, 0.5, 0.53, 0.6);
            ps.color2 = new BABYLON.Color4(0.42, 0.42, 0.45, 0.5);
            ps.colorDead = new BABYLON.Color4(0.7, 0.7, 0.72, 0);
            ps.minSize = 0.18; ps.maxSize = 0.4;
            ps.minLifeTime = 1.6; ps.maxLifeTime = 2.6;
            ps.minEmitPower = 0.5; ps.maxEmitPower = 0.8;
            ps.direction1 = new BABYLON.Vector3(-0.15, 1, -0.15);
            ps.direction2 = new BABYLON.Vector3(0.15, 1, 0.15);
            ps.addSizeGradient(0, 0.5);
            ps.addSizeGradient(1, 1.8);
            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
        } else { // faíscas da martelada: rajada curta (manualEmitCount), caem com a gravidade
            ps.color1 = new BABYLON.Color4(1, 0.9, 0.5, 1);
            ps.color2 = new BABYLON.Color4(1, 0.65, 0.2, 1);
            ps.colorDead = new BABYLON.Color4(1, 0.4, 0.05, 0);
            ps.minSize = 0.08; ps.maxSize = 0.16;
            ps.minLifeTime = 0.25; ps.maxLifeTime = 0.5;
            ps.minEmitPower = 1.2; ps.maxEmitPower = 2.4;
            ps.direction1 = new BABYLON.Vector3(-1, 1.2, -1);
            ps.direction2 = new BABYLON.Vector3(1, 2, 1);
            ps.gravity = new BABYLON.Vector3(0, -9, 0);
            ps.manualEmitCount = 0;
            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        }
        ps.start();
        this.fxSystems[kind] = ps;
        return ps;
    },

    /** Liga o observador único dos efeitos (canteiros, conclusões, fumaça industrial) e o aviso de qualidade. */
    ensureBuildingFx() {
        if (!this.scene) return;
        if (!this.fxSites) this.fxSites = new Map();
        if (!this.fxBursts) this.fxBursts = [];
        if (!this.fxObserver) {
            this.fxObserver = this.scene.onBeforeRenderObservable.add(() => {
                try {
                    this.updateBuildingFx();
                } catch (error) {
                    logWarn('⚠️ Erro nos efeitos de obra:', error);
                }
            });
        }
        if (!this.fxQualityUnsub && typeof GraphicsQuality !== 'undefined') {
            this.fxQualityUnsub = GraphicsQuality.onChange(() => this.updateIndustrialSmoke(true));
        }
    },

    /** Centro do lote no chão e meia largura (unidades do mundo). */
    getBuildingFootprint(buildingData) {
        const size = buildingData.config?.size || 1;
        const cell = this.gridManager.cellSize;
        const w = this.gridManager.gridToWorld(buildingData.gridX, buildingData.gridZ);
        const y = this.getBuildingAreaTerrainHeight(buildingData.gridX, buildingData.gridZ, size);
        return { center: new BABYLON.Vector3(w.x + (size - 1) * cell / 2, y, w.z + (size - 1) * cell / 2), half: size * cell / 2 };
    },

    startConstructionFx(buildingData) {
        try {
            this.ensureBuildingFx();
            this.stopConstructionFx(buildingData);
            const { center, half } = this.getBuildingFootprint(buildingData);
            const site = { building: buildingData, center, half, parts: [], glows: [], nextHit: performance.now() + 600 + Math.random() * 800, flash: null, flashAt: 0 };
            // Duas luzinhas âmbar em cantos opostos do lote (piscam alternadas)
            const corners = [[-1, -1], [1, 1]];
            corners.forEach(([sx, sz], i) => {
                const base = center.add(new BABYLON.Vector3(sx * half * 0.86, 0.02, sz * half * 0.86));
                const pole = this.getFxTemplate('pole').createInstance(`fxPole_${buildingData.id}_${i}`);
                pole.position.copyFrom(base);
                const lamp = this.getFxTemplate('lamp').createInstance(`fxLamp_${buildingData.id}_${i}`);
                lamp.position.copyFrom(base).addInPlaceFromFloats(0, 0.6, 0);
                const glow = this.getFxTemplate('glow').createInstance(`fxGlow_${buildingData.id}_${i}`);
                glow.position.copyFrom(lamp.position);
                glow.scaling.setAll(0.42);
                [pole, lamp, glow].forEach(m => { m.isPickable = false; });
                site.parts.push(pole, lamp, glow);
                site.glows.push(glow);
            });
            const flash = this.getFxTemplate('flash').createInstance(`fxFlash_${buildingData.id}`);
            flash.isPickable = false;
            flash.setEnabled(false);
            site.flash = flash;
            site.parts.push(flash);
            this.fxSites.set(buildingData.id, site);
            buildingData.constructionFx = site;
        } catch (error) {
            logWarn('⚠️ Erro ao criar efeitos de obra:', error);
        }
    },

    /** Tira luzinhas/clarão do canteiro (obra concluída, demolida, cancelada ou save recarregado). */
    stopConstructionFx(buildingData) {
        const site = buildingData?.constructionFx || this.fxSites?.get(buildingData?.id);
        if (!site) return;
        site.parts.forEach(m => { if (!m.isDisposed()) m.dispose(); });
        site.parts.length = 0;
        this.fxSites?.delete(buildingData.id);
        delete buildingData.constructionFx;
    },

    /** Topo do prédio em obra (o mesh cresce de baixo pra cima): onde as marteladas acontecem. */
    getSiteHitPoint(site) {
        const mesh = site.building.mesh;
        let top = site.center.y + 0.3;
        if (mesh && !mesh.isDisposed()) {
            try {
                top = Math.max(top, mesh.getHierarchyBoundingVectors(true).max.y);
            } catch (e) { /* mesh trocando (replaceBuildingMesh): usa o chão */ }
        }
        const r = site.half * 0.55;
        return new BABYLON.Vector3(site.center.x + (Math.random() * 2 - 1) * r, top, site.center.z + (Math.random() * 2 - 1) * r);
    },

    updateBuildingFx() {
        const now = performance.now();
        const scale = this.getFxParticleScale();
        const sites = this.fxSites ? [...this.fxSites.values()] : [];
        const running = this.gameManager?.isSimulationRunning ? this.gameManager.isSimulationRunning() : true;

        // Canteiro sem prédio (removido por um caminho que não passou por removeConstructionVisuals)
        sites.forEach(site => {
            if (!this.buildings.has(site.building.id) || !site.building.underConstruction) this.stopConstructionFx(site.building);
        });
        const live = this.fxSites ? [...this.fxSites.values()] : [];

        if (live.length || this.fxSystems) {
            const dust = this.getSiteParticleSystem('dust');
            const smoke = this.getSiteParticleSystem('smoke');
            const sparks = this.getSiteParticleSystem('sparks');
            const heavy = scale >= 0.5; // baixa: sem poeira nem fumaça
            dust.emitRate = live.length && heavy && running ? 10 * live.length * scale : 0;
            smoke.emitRate = live.length && heavy && running ? 2.5 * live.length * scale : 0;
            if (live.length) {
                const site = live[Math.floor(Math.random() * live.length)];
                const h = site.half * 0.85;
                dust.emitter.copyFrom(site.center);
                dust.minEmitBox.set(-h, 0.2, -h);
                dust.maxEmitBox.set(h, 0.5, h);
                const s2 = live[Math.floor(Math.random() * live.length)];
                smoke.emitter.copyFromFloats(s2.center.x + s2.half * 0.6, s2.center.y + 0.3, s2.center.z - s2.half * 0.6);
                const w = this.gameManager?.weatherEffects?.wind;
                smoke.gravity.set((w?.x || 0) * 0.25, 0, (w?.z || 0) * 0.25);
            }
            // Martelada: rajada de faíscas + clarão rápido num ponto do topo, a cada 0,7-1,9 s por canteiro
            for (const site of live) {
                if (running && now >= site.nextHit) {
                    site.nextHit = now + 700 + Math.random() * 1200;
                    if (sparks.manualEmitCount > 0) continue; // outra rajada neste quadro: fica para o próximo
                    const p = this.getSiteHitPoint(site);
                    sparks.emitter.copyFrom(p);
                    sparks.manualEmitCount = Math.max(2, Math.round(9 * scale));
                    site.flash.position.copyFrom(p).addInPlaceFromFloats(0, 0.05, 0);
                    site.flash.setEnabled(true);
                    site.flashAt = now;
                }
                const t = (now - site.flashAt) / 160;
                if (site.flash.isEnabled()) {
                    if (t >= 1) site.flash.setEnabled(false);
                    else site.flash.scaling.setAll(0.25 + 0.45 * Math.sin(t * Math.PI));
                }
                // Luzinhas: piscam alternadas (meio segundo cada)
                const phase = Math.floor(now / 520) % 2;
                site.glows.forEach((g, i) => g.setEnabled(i === phase));
            }
        }

        // Conclusões em andamento (poeira se abrindo + brilho no chão)
        if (this.fxBursts?.length) {
            this.fxBursts = this.fxBursts.filter(burst => {
                const t = (now - burst.start) / burst.duration;
                if (t >= 1) {
                    burst.systems.forEach(ps => ps.dispose(false)); // false: a textura é compartilhada
                    if (!burst.glow.isDisposed()) burst.glow.dispose();
                    return false;
                }
                const k = Math.min(1, t * 1.6);
                burst.glow.scaling.setAll(burst.size * (0.4 + 1.1 * k));
                burst.glow.visibility = Math.max(0, 1 - t) * 0.9;
                return true;
            });
        }

        this.updateIndustrialSmoke(false, now);
    },

    /** Efeito de conclusão: anel de poeira se abrindo no chão, faíscas subindo e um brilho rápido. */
    createCompletionParticles(buildingData) {
        try {
            this.ensureBuildingFx();
            const scale = this.getFxParticleScale();
            const { center, half } = this.getBuildingFootprint(buildingData);
            const systems = [];
            const dust = new BABYLON.ParticleSystem(`fx_completion_dust_${buildingData.id}`, 60, this.scene);
            dust.particleTexture = this.getFxTexture('puff');
            dust.emitter = center.add(new BABYLON.Vector3(0, 0.4, 0));
            dust.particleEmitterType = new BABYLON.CylinderParticleEmitter(half * 0.75, 0.05, 1, 0);
            dust.color1 = new BABYLON.Color4(0.74, 0.64, 0.49, 0.65);
            dust.color2 = new BABYLON.Color4(0.66, 0.57, 0.44, 0.55);
            dust.colorDead = new BABYLON.Color4(0.8, 0.74, 0.6, 0);
            dust.minSize = 0.5; dust.maxSize = 1.1;
            dust.minLifeTime = 0.8; dust.maxLifeTime = 1.4;
            dust.minEmitPower = 1.2; dust.maxEmitPower = 2.2;
            dust.addSizeGradient(0, 0.6);
            dust.addSizeGradient(1, 1.6);
            dust.manualEmitCount = Math.round(40 * scale);
            dust.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
            dust.start();
            systems.push(dust);

            const glints = new BABYLON.ParticleSystem(`fx_completion_glints_${buildingData.id}`, 30, this.scene);
            glints.particleTexture = this.getFxTexture('spark');
            glints.emitter = center.clone();
            glints.minEmitBox = new BABYLON.Vector3(-half * 0.7, 0.2, -half * 0.7);
            glints.maxEmitBox = new BABYLON.Vector3(half * 0.7, 1.4, half * 0.7);
            glints.direction1 = new BABYLON.Vector3(-0.1, 0.6, -0.1);
            glints.direction2 = new BABYLON.Vector3(0.1, 1, 0.1);
            glints.color1 = new BABYLON.Color4(1, 0.95, 0.7, 1);
            glints.color2 = new BABYLON.Color4(0.7, 1, 0.85, 1);
            glints.colorDead = new BABYLON.Color4(1, 1, 1, 0);
            glints.minSize = 0.1; glints.maxSize = 0.2;
            glints.minLifeTime = 0.6; glints.maxLifeTime = 1.1;
            glints.minEmitPower = 0.5; glints.maxEmitPower = 1;
            glints.manualEmitCount = Math.max(4, Math.round(16 * scale));
            glints.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
            glints.start();
            systems.push(glints);

            // Brilho no chão (plano deitado, aditivo) que se abre e some
            const glow = BABYLON.MeshBuilder.CreatePlane(`fx_completion_glow_${buildingData.id}`, { size: 1 }, this.scene);
            glow.rotation.x = Math.PI / 2;
            glow.position.copyFrom(center).addInPlaceFromFloats(0, 0.05, 0);
            glow.material = this.getFxTemplate('glow').material; // material compartilhado (não descartar)
            glow.isPickable = false;
            this.fxBursts.push({ systems, glow, start: performance.now(), duration: 1800, size: half * 3.4 });
        } catch (error) {
            logWarn('⚠️ Erro ao criar efeito de conclusão:', error);
        }
    },

    // ===== FUMAÇA DAS ZONAS INDUSTRIAIS (só na qualidade Alta) =====
    // Um único sistema de partículas: a cada quadro o emissor vai para uma chaminé sorteada (peso = fase da
    // zona), no topo das peças mais altas do lote. Fase 1 = 1 chaminé, fase 3 = 3 e mais fumaça.

    /** Chaminés das zonas industriais prontas: [{ building, pos, weight }]. */
    collectIndustrialChimneys() {
        const list = [];
        for (const b of this.buildings.values()) {
            if (!/^industrial/.test(b.config?.zoneType || '') || b.underConstruction || !b.active) continue;
            const stage = Number(b.zoneStage) || 0;
            if (stage < 1) continue;
            const pieces = (b.zonePieces || []).filter(p => p.node && !p.node.isDisposed() && !p.key.startsWith('prop:'));
            const tops = pieces.map(p => {
                try {
                    const { min, max } = p.node.getHierarchyBoundingVectors(true);
                    return { pos: new BABYLON.Vector3((min.x + max.x) / 2, max.y + 0.05, (min.z + max.z) / 2), h: max.y };
                } catch (e) { return null; }
            }).filter(Boolean).sort((a, b) => b.h - a.h).slice(0, stage);
            tops.forEach(t => list.push({ building: b, pos: t.pos, weight: stage }));
        }
        return list;
    },

    /** Liga/desliga e alimenta a fumaça industrial. force: qualidade mudou (refaz na hora). */
    updateIndustrialSmoke(force = false, now = performance.now()) {
        const level = this.gameManager?.graphicsQuality || (typeof GraphicsQuality !== 'undefined' ? GraphicsQuality.current() : 'high');
        const wanted = level === 'high';
        if (!wanted) {
            if (this.industrialSmoke) {
                this.industrialSmoke.dispose(false);
                this.industrialSmoke = null;
                this.industrialChimneys = [];
            }
            return;
        }
        if (force || !this.industrialChimneysAt || now - this.industrialChimneysAt > 2000) {
            this.industrialChimneys = this.collectIndustrialChimneys();
            this.industrialChimneysAt = now;
        }
        const chimneys = (this.industrialChimneys || []).filter(c => this.buildings.has(c.building.id) && c.building.active);
        if (!chimneys.length && !this.industrialSmoke) return;
        if (!this.industrialSmoke) {
            const ps = new BABYLON.ParticleSystem('fx_industrial_smoke', 400, this.scene);
            ps.particleTexture = this.getFxTexture('puff');
            ps.emitter = new BABYLON.Vector3(0, -50, 0);
            ps.minEmitBox = new BABYLON.Vector3(-0.06, 0, -0.06);
            ps.maxEmitBox = new BABYLON.Vector3(0.06, 0, 0.06);
            ps.color1 = new BABYLON.Color4(0.58, 0.58, 0.6, 0.42);
            ps.color2 = new BABYLON.Color4(0.45, 0.45, 0.48, 0.36);
            ps.colorDead = new BABYLON.Color4(0.65, 0.65, 0.68, 0);
            ps.minSize = 0.25; ps.maxSize = 0.45;
            ps.addSizeGradient(0, 0.5);
            ps.addSizeGradient(1, 2.6);
            ps.minLifeTime = 2.5; ps.maxLifeTime = 4;
            ps.minEmitPower = 0.6; ps.maxEmitPower = 0.9;
            ps.direction1 = new BABYLON.Vector3(-0.08, 1, -0.08);
            ps.direction2 = new BABYLON.Vector3(0.08, 1, 0.08);
            ps.minAngularSpeed = -0.4; ps.maxAngularSpeed = 0.4;
            ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
            ps.start();
            this.industrialSmoke = ps;
        }
        const ps = this.industrialSmoke;
        const totalWeight = chimneys.reduce((s, c) => s + c.weight, 0);
        ps.emitRate = totalWeight * 2.2;
        if (totalWeight) {
            let r = Math.random() * totalWeight;
            const pick = chimneys.find(c => (r -= c.weight) <= 0) || chimneys[0];
            ps.emitter.copyFrom(pick.pos);
        }
        const w = this.gameManager?.weatherEffects?.wind;
        ps.gravity.set((w?.x || 0) * 0.35, 0.05, (w?.z || 0) * 0.35);
    },

    /** Para testes/depuração: quantos canteiros com efeito, bursts de conclusão e chaminés ativas. */
    getBuildingFxStats() {
        return {
            sites: this.fxSites?.size || 0,
            bursts: this.fxBursts?.length || 0,
            siteParts: [...(this.fxSites?.values() || [])].reduce((s, site) => s + site.parts.length, 0),
            dustRate: this.fxSystems?.dust?.emitRate || 0,
            industrialSmoke: !!this.industrialSmoke,
            chimneys: (this.industrialChimneys || []).length,
            smokeRate: this.industrialSmoke?.emitRate || 0
        };
    },

    animateBuildingCompletion(buildingData) {
        try {
            const targetScale = buildingData.originalScaling || new BABYLON.Vector3(1, 1, 1);

            // Animação de "pop" de conclusão
            const startTime = Date.now();
            const duration = 800;

            const animateCompletion = () => {
                // Mesh atual a cada quadro: se o .glb chegar no meio do pop (replaceBuildingMesh), o novo
                // termina na escala e na rotação certas em vez de ficar parado no meio do balanço
                const mesh = buildingData.mesh;
                if (!mesh || mesh.isDisposed()) return;

                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;

                if (progress >= 1) {
                    mesh.scaling = targetScale;
                    this.applyBuildingRotation(buildingData);
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

                // Leve balanço em torno da rotação do prédio, que some no fim (não briga com o botão "girar")
                if (!buildingData.rotateAnimation) {
                    const rotationFactor = 1 - progress;
                    mesh.rotation.y = this.getBuildingRotationVector(buildingData).y + (rotationFactor * 0.1);
                }

                requestAnimationFrame(animateCompletion);
            };

            animateCompletion();

        } catch (error) {
            logWarn('⚠️ Erro ao animar conclusão do edifício:', error);
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

    /**
     * Rótulo em texto junto do cursor durante a escolha do lugar (a cor do fantasma não é o único sinal):
     * state 'ok' | 'trees' (detail = quantas) | 'bad' (detail = motivo) | null (esconde).
     * note = linha extra quando pode construir (ETA: distância da água e canos, WaterIntake.describeWaterIntake).
     */
    updatePlacementLabel(state, detail, note = '') {
        let label = document.getElementById('placement-label');
        if (!state) {
            if (label) label.hidden = true;
            return;
        }
        if (!label) {
            label = document.createElement('div');
            label.id = 'placement-label';
            label.setAttribute('aria-live', 'polite');
            document.getElementById('game-screen')?.appendChild(label);
        }
        const base = state === 'ok' ? '✓ Pode construir aqui'
            : state === 'trees' ? `🌳 Pode, mas derruba ${detail} ${detail === 1 ? 'árvore' : 'árvores'}`
                : `✕ ${detail || 'Não dá para construir aqui'}`;
        const text = note && state !== 'bad' ? `${base} · ${note}` : base;
        if (label.dataset.state !== state || label.textContent !== text) {
            label.dataset.state = state;
            label.textContent = text;
        }
        label.hidden = false;
        const x = this.scene?.pointerX ?? 0;
        const y = this.scene?.pointerY ?? 0;
        label.style.transform = `translate(${Math.round(x + 18)}px, ${Math.round(y + 22)}px)`;
    },
});
