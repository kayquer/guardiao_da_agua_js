/**
 * GUARDIÃO DA ÁGUA - EVENT SYSTEM
 * Sistema de eventos dinâmicos e aleatórios
 */

class EventSystem {
    constructor(gameManager) {
        console.log('⚡ Inicializando EventSystem...');
        
        this.gameManager = gameManager;
        
        // Eventos
        this.eventTypes = new Map();
        this.activeEvents = new Map();
        this.eventHistory = [];
        
        // Configurações
        this.eventFrequency = GAME_CONFIG.gameplay.eventFrequency; // 1 minuto
        this.lastEventTime = 0;
        this.eventProbability = 0.3; // 30% de chance por verificação
        
        // Estado
        this.eventsEnabled = true;
        this.difficultyMultiplier = 1.0;
        
        this.initializeEventTypes();
        
        console.log('✅ EventSystem inicializado');
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeEventTypes() {
        console.log('⚡ Definindo tipos de eventos...');
        
        // EVENTOS CLIMÁTICOS
        this.addEventType('drought', {
            name: 'Seca',
            description: 'Uma seca severa está afetando a região, reduzindo a produção de água.',
            category: 'climate',
            severity: 'high',
            duration: 120000, // 2 minutos
            probability: 0.15,
            icon: '☀️',
            effects: {
                waterProductionMultiplier: 0.5,
                pollutionIncrease: 5
            },
            educationalContent: {
                message: 'Secas são períodos prolongados de baixa precipitação que podem durar meses ou anos.',
                tips: [
                    'Implemente medidas de conservação de água',
                    'Diversifique suas fontes hídricas',
                    'Considere tecnologias de dessalinização'
                ]
            }
        });
        
        this.addEventType('flood', {
            name: 'Enchente',
            description: 'Chuvas intensas causaram enchentes, danificando a infraestrutura.',
            category: 'climate',
            severity: 'medium',
            duration: 60000, // 1 minuto
            probability: 0.12,
            icon: '🌊',
            effects: {
                infrastructureDamage: 0.1,
                pollutionIncrease: 15,
                waterContamination: true
            },
            educationalContent: {
                message: 'Enchentes podem contaminar fontes de água e danificar sistemas de tratamento.',
                tips: [
                    'Construa sistemas de drenagem adequados',
                    'Eleve estruturas críticas acima do nível de enchente',
                    'Tenha planos de emergência para contaminação'
                ]
            }
        });
        
        this.addEventType('heavy_rain', {
            name: 'Chuva Intensa',
            description: 'Chuvas intensas estão reabastecendo os reservatórios naturais.',
            category: 'climate',
            severity: 'low',
            duration: 45000, // 45 segundos
            probability: 0.25,
            icon: '🌧️',
            effects: {
                waterProductionBonus: 20,
                pollutionReduction: 5
            },
            educationalContent: {
                message: 'A captação de água da chuva pode ser uma fonte sustentável importante.',
                tips: [
                    'Instale sistemas de captação pluvial',
                    'Use a água da chuva para usos não potáveis',
                    'Mantenha reservatórios limpos para armazenamento'
                ]
            }
        });
        
        // EVENTOS DE INFRAESTRUTURA
        this.addEventType('pipe_leak', {
            name: 'Vazamento na Rede',
            description: 'Um vazamento foi detectado na rede de distribuição.',
            category: 'infrastructure',
            severity: 'medium',
            duration: 90000, // 1.5 minutos
            probability: 0.18,
            icon: '🔧',
            effects: {
                waterWasteIncrease: 25,
                maintenanceCost: 2000
            },
            educationalContent: {
                message: 'Vazamentos podem desperdiçar até 30% da água tratada em sistemas mal mantidos.',
                tips: [
                    'Monitore a pressão da rede regularmente',
                    'Invista em manutenção preventiva',
                    'Use tecnologias de detecção de vazamentos'
                ]
            }
        });
        
        this.addEventType('equipment_failure', {
            name: 'Falha de Equipamento',
            description: 'Um equipamento crítico apresentou falha e precisa de reparo.',
            category: 'infrastructure',
            severity: 'high',
            duration: 180000, // 3 minutos
            probability: 0.10,
            icon: '⚙️',
            effects: {
                randomBuildingDisabled: true,
                repairCost: 5000
            },
            educationalContent: {
                message: 'Manutenção preventiva é mais econômica que reparos de emergência.',
                tips: [
                    'Estabeleça cronogramas de manutenção',
                    'Mantenha peças de reposição em estoque',
                    'Treine equipes para reparos rápidos'
                ]
            }
        });
        
        // EVENTOS POPULACIONAIS
        this.addEventType('population_boom', {
            name: 'Crescimento Populacional',
            description: 'Um influxo de novos moradores está aumentando a demanda por água.',
            category: 'population',
            severity: 'medium',
            duration: 300000, // 5 minutos
            probability: 0.08,
            icon: '👥',
            effects: {
                populationIncrease: 100,
                waterDemandIncrease: 1.3
            },
            educationalContent: {
                message: 'O crescimento populacional requer planejamento antecipado da infraestrutura.',
                tips: [
                    'Monitore tendências demográficas',
                    'Expanda a infraestrutura antes da demanda',
                    'Eduque novos moradores sobre conservação'
                ]
            }
        });
        
        // EVENTOS AMBIENTAIS
        this.addEventType('industrial_pollution', {
            name: 'Poluição Industrial',
            description: 'Uma indústria próxima causou um vazamento, aumentando a poluição.',
            category: 'environment',
            severity: 'high',
            duration: 240000, // 4 minutos
            probability: 0.12,
            icon: '🏭',
            effects: {
                pollutionSpike: 30,
                treatmentCostIncrease: 1.5
            },
            educationalContent: {
                message: 'A poluição industrial pode contaminar fontes de água por décadas.',
                tips: [
                    'Monitore fontes de poluição próximas',
                    'Invista em tratamento avançado',
                    'Trabalhe com autoridades para controle'
                ]
            }
        });
        
        // EVENTOS POSITIVOS
        this.addEventType('government_grant', {
            name: 'Subsídio Governamental',
            description: 'O governo aprovou um subsídio para melhorias na infraestrutura hídrica.',
            category: 'economic',
            severity: 'positive',
            duration: 0, // Instantâneo
            probability: 0.05,
            icon: '💰',
            effects: {
                budgetBonus: 15000
            },
            educationalContent: {
                message: 'Investimentos públicos são essenciais para infraestrutura hídrica sustentável.',
                tips: [
                    'Use recursos extras para melhorias de longo prazo',
                    'Invista em tecnologias eficientes',
                    'Documente resultados para futuros subsídios'
                ]
            }
        });
        
        this.addEventType('water_conservation_campaign', {
            name: 'Campanha de Conservação',
            description: 'Uma campanha educativa reduziu o consumo de água da população.',
            category: 'social',
            severity: 'positive',
            duration: 180000, // 3 minutos
            probability: 0.10,
            icon: '📢',
            effects: {
                waterConsumptionReduction: 0.15,
                satisfactionBonus: 10
            },
            educationalContent: {
                message: 'Educação e conscientização podem reduzir o consumo em até 20%.',
                tips: [
                    'Promova campanhas regulares de conscientização',
                    'Ofereça incentivos para conservação',
                    'Compartilhe dados de consumo com a população'
                ]
            }
        });
        
        console.log(`✅ ${this.eventTypes.size} tipos de eventos definidos`);
    }
    
    addEventType(id, config) {
        this.eventTypes.set(id, {
            id,
            ...config
        });
    }
    
    // ===== ATUALIZAÇÃO =====
    update(deltaTime) {
        if (!this.eventsEnabled) return;
        
        this.lastEventTime += deltaTime;
        
        // Verificar se é hora de tentar gerar um evento
        if (this.lastEventTime >= this.eventFrequency) {
            this.tryGenerateEvent();
            this.lastEventTime = 0;
        }
        
        // Atualizar eventos ativos
        this.updateActiveEvents(deltaTime);
    }
    
    tryGenerateEvent() {
        if (Math.random() > this.eventProbability * this.difficultyMultiplier) {
            return; // Não gerar evento desta vez
        }
        
        // Selecionar tipo de evento baseado em probabilidades
        const availableEvents = Array.from(this.eventTypes.values()).filter(
            eventType => !this.hasActiveEventOfType(eventType.id)
        );
        
        if (availableEvents.length === 0) return;
        
        // Calcular probabilidades ponderadas
        const totalProbability = availableEvents.reduce((sum, event) => sum + event.probability, 0);
        let random = Math.random() * totalProbability;
        
        for (const eventType of availableEvents) {
            random -= eventType.probability;
            if (random <= 0) {
                this.triggerEvent(eventType.id);
                break;
            }
        }
    }
    
    updateActiveEvents(deltaTime) {
        this.activeEvents.forEach((event, eventId) => {
            if (event.duration > 0) {
                event.remainingTime -= deltaTime;
                
                if (event.remainingTime <= 0) {
                    this.endEvent(eventId);
                }
            }
        });
    }
    
    // ===== CONTROLE DE EVENTOS =====
    triggerEvent(eventTypeId, forced = false) {
        const eventType = this.eventTypes.get(eventTypeId);
        if (!eventType) {
            console.error(`❌ Tipo de evento não encontrado: ${eventTypeId}`);
            return null;
        }
        
        if (!forced && this.hasActiveEventOfType(eventTypeId)) {
            console.warn(`⚠️ Evento já ativo: ${eventTypeId}`);
            return null;
        }
        
        // Criar instância do evento
        const event = {
            id: `event_${Date.now()}`,
            type: eventTypeId,
            config: eventType,
            startTime: Date.now(),
            duration: eventType.duration,
            remainingTime: eventType.duration,
            active: true
        };
        
        this.activeEvents.set(event.id, event);
        
        // Aplicar efeitos
        this.applyEventEffects(event, true);
        
        // Notificar UI
        this.notifyEventStart(event);
        
        // Adicionar ao histórico
        this.eventHistory.push({
            type: eventTypeId,
            startTime: event.startTime,
            duration: eventType.duration
        });
        
        console.log(`⚡ Evento iniciado: ${eventType.name}`);
        return event;
    }
    
    endEvent(eventId) {
        const event = this.activeEvents.get(eventId);
        if (!event) return;
        
        // Remover efeitos
        this.applyEventEffects(event, false);
        
        // Remover da lista de ativos
        this.activeEvents.delete(eventId);
        
        // Notificar UI
        this.notifyEventEnd(event);
        
        console.log(`⚡ Evento finalizado: ${event.config.name}`);
    }
    
    // ===== EFEITOS =====
    applyEventEffects(event, apply = true) {
        const effects = event.config.effects;
        const resourceManager = this.gameManager.resourceManager;
        const buildingSystem = this.gameManager.buildingSystem;
        
        if (!effects) return;
        
        // Efeitos nos recursos
        if (effects.waterProductionMultiplier && resourceManager) {
            // Aplicar multiplicador na produção de água
            // TODO: Implementar sistema de multiplicadores no ResourceManager
        }
        
        if (effects.waterProductionBonus && resourceManager) {
            if (apply) {
                resourceManager.addWaterProduction(effects.waterProductionBonus);
            } else {
                resourceManager.removeWaterProduction(effects.waterProductionBonus);
            }
        }
        
        if (effects.pollutionIncrease && resourceManager) {
            if (apply) {
                resourceManager.addPollutionSource(effects.pollutionIncrease);
            } else {
                resourceManager.removePollutionSource(effects.pollutionIncrease);
            }
        }
        
        if (effects.pollutionSpike && resourceManager && apply) {
            resourceManager.adjustResource('pollution', effects.pollutionSpike);
        }
        
        if (effects.budgetBonus && resourceManager && apply) {
            resourceManager.adjustResource('budget', effects.budgetBonus);
        }
        
        if (effects.maintenanceCost && resourceManager && apply) {
            resourceManager.spendBudget(effects.maintenanceCost);
        }
        
        // Efeitos em edifícios
        if (effects.randomBuildingDisabled && buildingSystem && apply) {
            this.disableRandomBuilding();
        }
        
        if (effects.infrastructureDamage && buildingSystem && apply) {
            this.damageInfrastructure(effects.infrastructureDamage);
        }
    }
    
    disableRandomBuilding() {
        const buildings = this.gameManager.buildingSystem.getAllBuildings();
        const activeBuildings = buildings.filter(b => b.active);
        
        if (activeBuildings.length > 0) {
            const randomBuilding = activeBuildings[Math.floor(Math.random() * activeBuildings.length)];
            randomBuilding.active = false;
            
            // Reaplicar efeitos
            this.gameManager.buildingSystem.applyBuildingEffects(randomBuilding, false);
            
            if (this.gameManager.uiManager) {
                this.gameManager.uiManager.showNotification(
                    `${randomBuilding.config.name} foi danificado e está inativo!`,
                    'warning'
                );
            }
        }
    }
    
    damageInfrastructure(damagePercentage) {
        const buildings = this.gameManager.buildingSystem.getAllBuildings();
        const buildingsToAffect = Math.ceil(buildings.length * damagePercentage);
        
        for (let i = 0; i < buildingsToAffect; i++) {
            const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
            if (randomBuilding.efficiency > 0.5) {
                randomBuilding.efficiency = Math.max(0.5, randomBuilding.efficiency - 0.2);
            }
        }
    }
    
    // ===== NOTIFICAÇÕES =====
    notifyEventStart(event) {
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `${event.config.icon} ${event.config.name}: ${event.config.description}`,
                event.config.severity === 'positive' ? 'success' : 
                event.config.severity === 'high' ? 'error' : 'warning',
                8000
            );
            
            // Mostrar conteúdo educacional se disponível
            if (event.config.educationalContent) {
                setTimeout(() => {
                    this.showEducationalContent(event.config.educationalContent);
                }, 2000);
            }
        }
        
        // Som baseado na severidade
        if (event.config.severity === 'high') {
            AudioManager.playSound('sfx_error');
        } else if (event.config.severity === 'positive') {
            AudioManager.playSound('sfx_success');
        } else {
            AudioManager.playSound('sfx_click');
        }
    }
    
    notifyEventEnd(event) {
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `${event.config.name} terminou`,
                'info',
                3000
            );
        }
    }
    
    showEducationalContent(content) {
        if (this.gameManager.uiManager) {
            let message = content.message;
            
            if (content.tips && content.tips.length > 0) {
                message += '\n\nDicas:\n' + content.tips.map(tip => `• ${tip}`).join('\n');
            }
            
            // TODO: Implementar modal educacional na UI
            console.log('📚 Conteúdo educacional:', message);
        }
    }
    
    // ===== UTILITÁRIOS =====
    hasActiveEventOfType(eventTypeId) {
        return Array.from(this.activeEvents.values()).some(
            event => event.type === eventTypeId
        );
    }

    setDifficulty(multiplier) {
        this.difficultyMultiplier = Math.max(0.1, Math.min(3.0, multiplier));
        console.log(`⚡ Dificuldade dos eventos: ${this.difficultyMultiplier}x`);
    }
    
    // ===== SAVE/LOAD =====
    getSaveData() {
        return {
            activeEvents: Array.from(this.activeEvents.entries()),
            eventHistory: this.eventHistory,
            lastEventTime: this.lastEventTime,
            difficultyMultiplier: this.difficultyMultiplier,
            eventsEnabled: this.eventsEnabled
        };
    }
    
    loadData(data) {
        if (data) {
            this.activeEvents = new Map(data.activeEvents || []);
            this.eventHistory = data.eventHistory || [];
            this.lastEventTime = data.lastEventTime || 0;
            this.difficultyMultiplier = data.difficultyMultiplier || 1.0;
            this.eventsEnabled = data.eventsEnabled !== undefined ? data.eventsEnabled : true;
        }
    }
}

// Exportar para escopo global
window.EventSystem = EventSystem;
console.log('⚡ EventSystem carregado e exportado para window.EventSystem');
