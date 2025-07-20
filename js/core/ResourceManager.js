/**
 * GUARDIÃO DA ÁGUA - RESOURCE MANAGER
 * Gerencia todos os recursos do jogo (água, poluição, população, orçamento)
 */

class ResourceManager {
    constructor() {
        console.log('💧 Inicializando ResourceManager...');
        
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
        
        // Histórico para gráficos
        this.history = {
            water: [],
            budget: [],
            population: [],
            pollution: [],
            satisfaction: []
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
        
        // Receita - Despesas
        const netIncome = budget.income - budget.expenses;
        budget.current = Math.max(0, budget.current + (netIncome / 60)); // Por segundo
    }
    
    updatePopulation() {
        const population = this.resources.population;
        const water = this.resources.water;
        const pollution = this.resources.pollution;
        
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
        
        // Crescimento populacional baseado na satisfação
        if (population.satisfaction > 70) {
            population.growth = 0.1; // 0.1% por segundo
        } else if (population.satisfaction > 50) {
            population.growth = 0.05;
        } else {
            population.growth = -0.02; // Declínio
        }
        
        // Aplicar crescimento
        const newPopulation = population.current * (1 + population.growth / 100);
        population.current = Math.max(100, Math.min(population.max, newPopulation));
    }
    
    updatePollution() {
        const pollution = this.resources.pollution;

        // Poluição = Fontes - Redução (dividido por 60 para mudança gradual por segundo)
        const netPollution = (pollution.sources - pollution.reduction) / 60;
        pollution.current = Math.max(0, Math.min(pollution.max, pollution.current + netPollution));
    }
    
    updateConsumption() {
        const population = this.resources.population;
        const water = this.resources.water;
        
        // Consumo base: 2L por pessoa por segundo (simulação acelerada)
        water.consumption = population.current * 2;
        
        // Desperdício baseado na infraestrutura (será calculado pelo BuildingSystem)
        // Por enquanto, desperdício base de 10%
        water.waste = water.consumption * 0.1;
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
            if (this.history[key].length > this.historyMaxLength) {
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
