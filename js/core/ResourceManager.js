/**
 * GUARDIÃO DA ÁGUA - RESOURCE MANAGER
 * Gerencia todos os recursos do jogo (água, poluição, população, orçamento)
 */

class ResourceManager {
    constructor(gameManager = null) {
        console.log('💧 Inicializando ResourceManager...');

        this.gameManager = gameManager;
        
        // Recursos principais
        this.resources = {
            water: {
                current: GAME_CONFIG.resources.initialWater,
                max: GAME_CONFIG.resources.initialWater, // Capacidade inicial limitada
                storage: GAME_CONFIG.resources.initialWater, // Capacidade de armazenamento
                production: 0,
                consumption: 0,
                waste: 0
            },
            budget: {
                current: GAME_CONFIG.resources.initialBudget,
                income: 1000, // Receita por minuto
                expenses: 0
            },
            population: {
                current: GAME_CONFIG.resources.initialPopulation,
                max: 1000,
                growth: 0,
                satisfaction: GAME_CONFIG.resources.initialSatisfaction
            },
            pollution: {
                current: GAME_CONFIG.resources.initialPollution,
                max: 100,
                sources: 0,
                reduction: 0
            },
            electricity: {
                current: 0,
                max: 1000,
                generation: 0,
                consumption: 0,
                efficiency: 1.0
            }
        };
        
        // Cache para cálculos de consumo
        this.consumptionCache = {
            lastUpdate: 0,
            cacheInterval: 100,
            cachedConsumption: 0,
            cachedWaste: 0
        };

        // Histórico para gráficos
        this.history = {
            water: [],
            budget: [],
            population: [],
            pollution: [],
            satisfaction: []
        };

        // Tax Revenue System
        this.taxRevenue = {
            population: 0,      // Income tax from citizens
            business: 0,        // Business tax from commercial buildings
            tourism: 0,         // Tourism tax from tourism buildings
            total: 0            // Total tax revenue
        };

        // Tax rates (per minute)
        this.taxRates = {
            perCitizen: 10,           // R$ 10 per citizen per minute
            perCommercial: 50,        // R$ 50 per commercial building per minute
            perTourism: 100,          // R$ 100 per tourism building per minute
            developmentMultiplier: 1.0 // Increases with city development
        };

        // Configurações
        this.updateInterval = 1000; // 1 segundo
        this.lastUpdate = 0;
        this.historyMaxLength = 100;

        // Callbacks para mudanças
        this.onResourceChange = new Map();
        
        // Inicializar
        this.initializeResources();
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeResources() {
        // Configurar consumo base da população
        this.updateConsumption();
        
        // Adicionar primeiro ponto no histórico
        this.addToHistory();
        
        console.log('✅ Recursos inicializados');
    }
    
    // ===== ATUALIZAÇÃO =====
    update(deltaTime) {
        this.lastUpdate += deltaTime;
        
        if (this.lastUpdate >= this.updateInterval) {
            this.updateResources();
            this.addToHistory();
            this.checkCriticalLevels();
            this.lastUpdate = 0;
        }
    }
    
    updateResources() {
        // Atualizar água
        this.updateWater();
        
        // Atualizar orçamento
        this.updateBudget();
        
        // Atualizar população
        this.updatePopulation();
        
        // Atualizar poluição
        this.updatePollution();

        // Atualizar energia
        this.updateElectricity();

        // Notificar mudanças
        this.notifyResourceChanges();
    }
    
    updateWater() {
        const water = this.resources.water;

        // Garantir que water.current não seja null ou undefined
        if (water.current === null || water.current === undefined || isNaN(water.current)) {
            water.current = GAME_CONFIG.resources.initialWater;
            console.warn('⚠️ water.current era null/undefined, resetando para valor inicial:', water.current);
        }

        // Garantir que storage está definido
        if (!water.storage || water.storage <= 0) {
            water.storage = GAME_CONFIG.resources.initialWater;
            water.max = water.storage;
        }

        // Atualizar consumo baseado na população ANTES de calcular mudanças
        this.updateConsumption();

        // Produção - Consumo - Desperdício
        const production = water.production || 0;
        const consumption = water.consumption || 0;
        const waste = water.waste || 0;
        const netChange = production - consumption - waste;

        // Limitar pela capacidade de armazenamento (mudança gradual por segundo)
        const changePerSecond = netChange / 60;
        const newCurrent = water.current + changePerSecond;
        water.current = Math.max(0, Math.min(water.storage, newCurrent));
        water.max = water.storage; // Atualizar max para refletir capacidade atual

        // Verificar se o resultado é válido
        if (isNaN(water.current)) {
            console.error('❌ water.current resultou em NaN, resetando para valor inicial');
            water.current = GAME_CONFIG.resources.initialWater;
        }
    }
    
    updateBudget() {
        const budget = this.resources.budget;

        // Calculate tax revenue
        this.calculateTaxRevenue();

        // Receita - Despesas
        const netIncome = budget.income - budget.expenses;
        budget.current = Math.max(0, budget.current + (netIncome / 60)); // Por segundo
    }

    // ===== TAX REVENUE SYSTEM =====
    calculateTaxRevenue() {
        // Defensive checks to prevent errors during initialization
        if (!this.gameManager || !this.gameManager.buildingSystem) {
            return;
        }

        if (!this.resources || !this.resources.population || !this.resources.budget) {
            return;
        }

        const buildings = this.gameManager.buildingSystem.getAllBuildings();
        const population = this.resources.population.current || 0;
        const satisfaction = this.resources.population.satisfaction || 50; // Default to 50 if undefined

        // Calculate development multiplier based on city progress
        const totalBuildings = buildings.length;
        const satisfactionBonus = satisfaction / 100;
        this.taxRates.developmentMultiplier = 1.0 + (totalBuildings * 0.01) + (satisfactionBonus * 0.5);

        // Population tax (income tax from citizens)
        this.taxRevenue.population = population * this.taxRates.perCitizen * this.taxRates.developmentMultiplier;

        // Business tax (from commercial buildings)
        const commercialBuildings = buildings.filter(b =>
            b.type && (
                b.type.includes('commercial') ||
                b.type.includes('shop') ||
                b.type.includes('market') ||
                b.type.includes('mall')
            )
        );
        this.taxRevenue.business = commercialBuildings.length * this.taxRates.perCommercial * this.taxRates.developmentMultiplier;

        // Tourism tax (from tourism buildings)
        const tourismBuildings = buildings.filter(b =>
            b.type && (
                b.type.includes('tourism') ||
                b.type.includes('hotel') ||
                b.type.includes('museum') ||
                b.type.includes('park') ||
                b.type.includes('monument')
            )
        );
        this.taxRevenue.tourism = tourismBuildings.length * this.taxRates.perTourism * this.taxRates.developmentMultiplier;

        // Calculate total tax revenue
        this.taxRevenue.total = this.taxRevenue.population + this.taxRevenue.business + this.taxRevenue.tourism;

        // Update budget income with tax revenue
        // Base income (1000) + tax revenue
        this.resources.budget.income = 1000 + this.taxRevenue.total;
    }

    getTaxRevenue() {
        return { ...this.taxRevenue };
    }

    getTaxRates() {
        return { ...this.taxRates };
    }

    updatePopulation() {
        const population = this.resources.population;
        const water = this.resources.water;
        const pollution = this.resources.pollution;

        // Atualizar capacidade máxima baseada em edifícios de zoneamento
        this.updatePopulationCapacity();

        // Calcular satisfação baseada em recursos
        let satisfaction = 50; // Base

        // Água disponível
        const waterRatio = water.current / (population.current * 2); // 2L por pessoa
        if (waterRatio >= 1) satisfaction += 20;
        else if (waterRatio >= 0.5) satisfaction += 10;
        else satisfaction -= 20;

        // Poluição
        if (pollution.current < 20) satisfaction += 15;
        else if (pollution.current < 50) satisfaction += 5;
        else satisfaction -= 15;

        // Atualizar satisfação
        population.satisfaction = Math.max(0, Math.min(100, satisfaction));

        // Crescimento populacional baseado na satisfação e recursos disponíveis
        const attractionFactor = this.calculatePopulationAttraction();

        if (population.satisfaction > 70 && attractionFactor > 0.8) {
            population.growth = 0.1; // 0.1% por segundo
        } else if (population.satisfaction > 50 && attractionFactor > 0.6) {
            population.growth = 0.05;
        } else if (attractionFactor < 0.3) {
            population.growth = -0.05; // Declínio mais rápido se recursos críticos
        } else {
            population.growth = -0.02; // Declínio padrão
        }

        // Aplicar crescimento limitado pela capacidade
        const newPopulation = population.current * (1 + population.growth / 100);
        const oldPopulation = population.current;
        population.current = Math.max(100, Math.min(population.max, newPopulation));
        
        if (oldPopulation !== population.current) {
            this.invalidateConsumptionCache();
        }
    }

    updatePopulationCapacity() {
        // Calcular capacidade baseada em edifícios de zoneamento
        if (!this.gameManager || !this.gameManager.buildingSystem) {
            return;
        }

        const buildings = this.gameManager.buildingSystem.getAllBuildings();
        let totalCapacity = 500; // Capacidade base

        // Somar capacidade de edifícios residenciais e zonas
        buildings.forEach(building => {
            if (building.active) {
                if (building.config.populationCapacity) {
                    totalCapacity += building.config.populationCapacity;
                } else if (building.config.population) {
                    totalCapacity += building.config.population;
                }
            }
        });

        this.resources.population.max = totalCapacity;
        console.log(`👥 Capacidade populacional atualizada: ${totalCapacity}`);
    }

    calculatePopulationAttraction() {
        const water = this.resources.water;
        const electricity = this.resources.electricity;
        const pollution = this.resources.pollution;
        const population = this.resources.population;

        let attractionFactor = 1.0;

        // Fator água (crítico)
        const waterRatio = water.current / (population.current * 2);
        if (waterRatio < 0.3) attractionFactor *= 0.2; // Muito crítico
        else if (waterRatio < 0.7) attractionFactor *= 0.6;
        else if (waterRatio >= 1.0) attractionFactor *= 1.2; // Abundante

        // Fator energia
        const energyEfficiency = electricity.efficiency || 0;
        if (energyEfficiency < 0.5) attractionFactor *= 0.7;
        else if (energyEfficiency >= 1.0) attractionFactor *= 1.1;

        // Fator poluição
        if (pollution.current > 70) attractionFactor *= 0.5; // Muito poluído
        else if (pollution.current > 40) attractionFactor *= 0.8;
        else if (pollution.current < 20) attractionFactor *= 1.1; // Limpo

        return Math.max(0, Math.min(2.0, attractionFactor));
    }

    updatePollution() {
        const pollution = this.resources.pollution;

        // Poluição = Fontes - Redução (dividido por 60 para mudança gradual por segundo)
        const netPollution = (pollution.sources - pollution.reduction) / 60;
        pollution.current = Math.max(0, Math.min(pollution.max, pollution.current + netPollution));
    }
    
    updateConsumption() {
        const now = performance.now();
        const timeSinceLastUpdate = now - this.consumptionCache.lastUpdate;
        
        if (timeSinceLastUpdate < this.consumptionCache.cacheInterval) {
            this.resources.water.consumption = this.consumptionCache.cachedConsumption;
            this.resources.water.waste = this.consumptionCache.cachedWaste;
            return;
        }
        
        const population = this.resources.population;
        const water = this.resources.water;
        
        water.consumption = population.current * 2;
        water.waste = water.consumption * 0.1;
        
        this.consumptionCache.cachedConsumption = water.consumption;
        this.consumptionCache.cachedWaste = water.waste;
        this.consumptionCache.lastUpdate = now;
    }
    
    invalidateConsumptionCache() {
        this.consumptionCache.lastUpdate = 0;
    }
    
    // ===== GESTÃO DE RECURSOS =====
    addWaterProduction(amount) {
        this.resources.water.production += amount;
        this.notifyChange('water', 'production', amount);
    }
    
    removeWaterProduction(amount) {
        this.resources.water.production = Math.max(0, this.resources.water.production - amount);
        this.notifyChange('water', 'production', -amount);
    }
    
    addPollutionReduction(amount) {
        this.resources.pollution.reduction += amount;
        this.notifyChange('pollution', 'reduction', amount);
    }
    
    removePollutionReduction(amount) {
        this.resources.pollution.reduction = Math.max(0, this.resources.pollution.reduction - amount);
        this.notifyChange('pollution', 'reduction', -amount);
    }
    
    addPollutionSource(amount) {
        this.resources.pollution.sources += amount;
        this.notifyChange('pollution', 'sources', amount);
    }
    
    removePollutionSource(amount) {
        this.resources.pollution.sources = Math.max(0, this.resources.pollution.sources - amount);
        this.notifyChange('pollution', 'sources', -amount);
    }
    
    spendBudget(amount) {
        if (this.resources.budget.current >= amount) {
            this.resources.budget.current -= amount;
            this.notifyChange('budget', 'spent', amount);
            return true;
        }
        return false;
    }
    
    addIncome(amount) {
        this.resources.budget.income += amount;
        this.notifyChange('budget', 'income', amount);
    }

    removeIncome(amount) {
        this.resources.budget.income = Math.max(0, this.resources.budget.income - amount);
        this.notifyChange('budget', 'income', -amount);
    }

    addBudget(amount) {
        this.resources.budget.current += amount;
        this.notifyChange('budget', 'current', amount);
        console.log(`💰 Orçamento aumentado: +R$ ${amount} (total: R$ ${this.resources.budget.current})`);
    }

    addExpense(amount) {
        this.resources.budget.expenses += amount;
        this.notifyChange('budget', 'expenses', amount);
    }

    // ===== GESTÃO DE ARMAZENAMENTO DE ÁGUA =====
    addWaterStorage(amount) {
        this.resources.water.storage += amount;
        this.notifyChange('water', 'storage', amount);
        console.log(`💧 Capacidade de armazenamento aumentada: +${amount}L (total: ${this.resources.water.storage}L)`);
    }

    removeWaterStorage(amount) {
        this.resources.water.storage = Math.max(0, this.resources.water.storage - amount);
        // Se a água atual exceder a nova capacidade, ajustar
        if (this.resources.water.current > this.resources.water.storage) {
            this.resources.water.current = this.resources.water.storage;
        }
        this.notifyChange('water', 'storage', -amount);
        console.log(`💧 Capacidade de armazenamento reduzida: -${amount}L (total: ${this.resources.water.storage}L)`);
    }
    
    // ===== VERIFICAÇÕES =====
    canAfford(amount) {
        return this.resources.budget.current >= amount;
    }
    
    hasWaterShortage() {
        const water = this.resources.water;
        return water.current < (water.consumption * 10); // Menos de 10 segundos de reserva
    }
    
    hasCriticalPollution() {
        return this.resources.pollution.current > 80;
    }
    
    hasLowSatisfaction() {
        return this.resources.population.satisfaction < 30;
    }
    
    checkCriticalLevels() {
        const criticalEvents = [];
        
        if (this.hasWaterShortage()) {
            criticalEvents.push({
                type: 'water_shortage',
                severity: 'critical',
                message: 'Escassez de água! A população está sem água suficiente.'
            });
        }
        
        if (this.hasCriticalPollution()) {
            criticalEvents.push({
                type: 'high_pollution',
                severity: 'warning',
                message: 'Níveis críticos de poluição detectados!'
            });
        }
        
        if (this.hasLowSatisfaction()) {
            criticalEvents.push({
                type: 'low_satisfaction',
                severity: 'warning',
                message: 'A população está insatisfeita com a gestão da cidade.'
            });
        }
        
        // Notificar eventos críticos
        criticalEvents.forEach(event => {
            this.notifyChange('critical', event.type, event);
        });
    }
    
    // ===== HISTÓRICO =====
    addToHistory() {
        const timestamp = Date.now();
        
        // Adicionar dados atuais ao histórico
        this.history.water.push({
            time: timestamp,
            current: this.resources.water.current,
            production: this.resources.water.production,
            consumption: this.resources.water.consumption
        });
        
        this.history.budget.push({
            time: timestamp,
            current: this.resources.budget.current,
            income: this.resources.budget.income,
            expenses: this.resources.budget.expenses
        });
        
        this.history.population.push({
            time: timestamp,
            current: this.resources.population.current,
            satisfaction: this.resources.population.satisfaction
        });
        
        this.history.pollution.push({
            time: timestamp,
            current: this.resources.pollution.current,
            sources: this.resources.pollution.sources,
            reduction: this.resources.pollution.reduction
        });
        
        // Limitar tamanho do histórico
        Object.keys(this.history).forEach(key => {
            while (this.history[key].length > this.historyMaxLength) {
                this.history[key].shift();
            }
        });
    }
    
    getHistory(resourceType, timeRange = 3600000) { // 1 hora por padrão
        const now = Date.now();
        const cutoff = now - timeRange;
        
        return this.history[resourceType]?.filter(entry => entry.time >= cutoff) || [];
    }
    
    // ===== CALLBACKS =====
    onResourceChange(resourceType, callback) {
        if (!this.onResourceChange.has(resourceType)) {
            this.onResourceChange.set(resourceType, []);
        }
        this.onResourceChange.get(resourceType).push(callback);
    }
    
    notifyChange(resourceType, changeType, value) {
        const callbacks = this.onResourceChange.get(resourceType);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(changeType, value, this.resources[resourceType]);
                } catch (error) {
                    console.error('Erro no callback de recurso:', error);
                }
            });
        }
    }
    
    notifyResourceChanges() {
        // Notificar mudanças gerais
        this.notifyChange('all', 'update', this.resources);
    }
    
    // ===== GETTERS =====
    getResource(resourceType) {
        if (this.resources[resourceType]) {
            return { ...this.resources[resourceType] };
        }
        console.warn(`⚠️ Recurso não encontrado: ${resourceType}`);
        return null;
    }

    getWater() { return { ...this.resources.water }; }
    getBudget() { return { ...this.resources.budget }; }
    getPopulation() { return { ...this.resources.population }; }
    getPollution() { return { ...this.resources.pollution }; }
    getElectricity() { return { ...this.resources.electricity }; }
    getAllResources() { return JSON.parse(JSON.stringify(this.resources)); }
    
    getWaterPercentage() {
        return (this.resources.water.current / this.resources.water.max) * 100;
    }
    
    getSatisfactionLevel() {
        const satisfaction = this.resources.population.satisfaction;
        if (satisfaction >= 80) return 'excellent';
        if (satisfaction >= 60) return 'good';
        if (satisfaction >= 40) return 'fair';
        if (satisfaction >= 20) return 'poor';
        return 'critical';
    }
    
    getPollutionLevel() {
        const pollution = this.resources.pollution.current;
        if (pollution <= 20) return 'clean';
        if (pollution <= 40) return 'moderate';
        if (pollution <= 60) return 'polluted';
        if (pollution <= 80) return 'heavily_polluted';
        return 'toxic';
    }
    
    // ===== RESET =====
    reset() {
        this.resources = {
            water: {
                current: GAME_CONFIG.resources.initialWater,
                max: GAME_CONFIG.resources.initialWater * 2,
                production: 0,
                consumption: 0,
                waste: 0
            },
            budget: {
                current: GAME_CONFIG.resources.initialBudget,
                income: 1000,
                expenses: 0
            },
            population: {
                current: GAME_CONFIG.resources.initialPopulation,
                max: 1000,
                growth: 0,
                satisfaction: GAME_CONFIG.resources.initialSatisfaction
            },
            pollution: {
                current: GAME_CONFIG.resources.initialPollution,
                max: 100,
                sources: 0,
                reduction: 0
            },
            electricity: {
                current: 0,
                max: 1000,
                generation: 0,
                consumption: 0,
                efficiency: 1.0
            }
        };
        
        // Limpar histórico
        Object.keys(this.history).forEach(key => {
            this.history[key] = [];
        });
        
        this.initializeResources();
        console.log('🔄 Recursos resetados');
    }

    // ===== ENERGIA =====
    addElectricityGeneration(amount) {
        this.resources.electricity.generation += amount;
        console.log(`⚡ Geração de energia +${amount} MW`);
    }

    removeElectricityGeneration(amount) {
        this.resources.electricity.generation = Math.max(0, this.resources.electricity.generation - amount);
        console.log(`⚡ Geração de energia -${amount} MW`);
    }

    addElectricityConsumption(amount) {
        this.resources.electricity.consumption += amount;
        console.log(`⚡ Consumo de energia +${amount} MW`);
    }

    removeElectricityConsumption(amount) {
        this.resources.electricity.consumption = Math.max(0, this.resources.electricity.consumption - amount);
        console.log(`⚡ Consumo de energia -${amount} MW`);
    }

    updateElectricity() {
        // Calcular energia disponível
        const available = this.resources.electricity.generation - this.resources.electricity.consumption;
        this.resources.electricity.current = Math.max(0, available);

        // Calcular eficiência baseada na disponibilidade
        if (this.resources.electricity.consumption > 0) {
            this.resources.electricity.efficiency = Math.min(1.0,
                this.resources.electricity.generation / this.resources.electricity.consumption);
        } else {
            this.resources.electricity.efficiency = 1.0;
        }
    }

    // ===== SAVE/LOAD =====
    getSaveData() {
        return {
            resources: this.resources,
            history: this.history
        };
    }
    
    loadData(data) {
        if (data && data.resources) {
            this.resources = { ...data.resources };
        }
        if (data && data.history) {
            this.history = { ...data.history };
        }
        console.log('📁 Dados de recursos carregados');
    }
}

// Exportar para escopo global
window.ResourceManager = ResourceManager;
console.log('💧 ResourceManager carregado e exportado para window.ResourceManager');
