/**
 * GUARDIÃO DA ÁGUA - RESOURCE MANAGER
 * Gerencia todos os recursos do jogo (água, poluição, população, orçamento)
 */

class ResourceManager {
    constructor(gameManager = null) {
        log('💧 Inicializando ResourceManager...');

        this.gameManager = gameManager;

        // Satisfação extra pelas árvores em pé (TreeSystem.applyEffects)
        this.greenBonus = 0;

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
        this.changeListeners = new Map(); // tipo → callbacks (ver onResourceChange)
        
        // Inicializar
        this.initializeResources();
    }
    
    // ===== INICIALIZAÇÃO =====
    initializeResources() {
        // Configurar consumo base da população
        this.updateConsumption();
        
        // Adicionar primeiro ponto no histórico
        this.addToHistory();
        
        log('✅ Recursos inicializados');
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

        // Área verde: árvores em pé (cai quando derrubadas para construir)
        satisfaction += this.greenBonus || 0;

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

        const buildingSystem = this.gameManager.buildingSystem;
        const buildings = buildingSystem.getAllBuildings();
        let totalCapacity = 500; // Capacidade base

        // Somar capacidade de edifícios residenciais e zonas (zona: a fração da fase em que está)
        buildings.forEach(building => {
            if (building.active) {
                if (buildingSystem.getEffectivePopulationCapacity) {
                    totalCapacity += buildingSystem.getEffectivePopulationCapacity(building);
                } else if (building.config.populationCapacity) {
                    totalCapacity += building.config.populationCapacity;
                } else if (building.config.population) {
                    totalCapacity += building.config.population;
                }
            }
        });

        this.resources.population.max = totalCapacity;
        log(`👥 Capacidade populacional atualizada: ${totalCapacity}`);
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
        
        // população + consumo fixo dos edifícios (add/removeWaterConsumption)
        water.consumption = population.current * ResourceManager.WATER_PER_PERSON + (water.buildingConsumption || 0);
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
        log(`💰 Orçamento aumentado: +R$ ${amount} (total: R$ ${this.resources.budget.current})`);
    }

    // Ajuste pontual (eventos, missões, bônus). Mesmo limite que o tick aplica: [0, max].
    adjustResource(resourceType, amount) {
        const resource = this.resources[resourceType];
        resource.current = Math.max(0, Math.min(resource.max ?? Infinity, resource.current + amount));
        this.notifyChange(resourceType, 'current', amount);
    }

    addExpense(amount) {
        this.resources.budget.expenses += amount;
        this.notifyChange('budget', 'expenses', amount);
    }

    // Consumo fixo de edifícios (casas, zonas, comércio). Fica separado porque
    // updateConsumption() recalcula water.consumption a partir da população a cada ciclo.
    addWaterConsumption(amount) {
        this.resources.water.buildingConsumption = (this.resources.water.buildingConsumption || 0) + amount;
        this.invalidateConsumptionCache();
        this.notifyChange('water', 'consumption', amount);
    }

    removeWaterConsumption(amount) {
        this.resources.water.buildingConsumption = Math.max(0, (this.resources.water.buildingConsumption || 0) - amount);
        this.invalidateConsumptionCache();
        this.notifyChange('water', 'consumption', -amount);
    }

    // ===== DE ONDE VEM O CONSUMO E A DESPESA (painéis 💧 e 💰) =====
    // Mesma fonte que o cálculo: applyBuildingEffects soma buildingWaterUse/buildingMaintenance de cada prédio
    // com efeitos aplicados; updateConsumption soma WATER_PER_PERSON por morador. O que entrou nos totais por outro
    // caminho (ex.: add/removeWaterConsumption ou addExpense direto) aparece numa linha "Outros", e a soma bate.
    static WATER_PER_PERSON = 2;

    /** L/min que um prédio pronto consome (fixo, fora os moradores). Muda plantada: o que está aplicado na etapa. */
    static buildingWaterUse(building) {
        if (building?.treeApplied) return Number(building.treeApplied.water) || 0;
        return Number(building?.config?.waterConsumption) || 0;
    }

    /** R$/min de manutenção de um prédio pronto. */
    static buildingMaintenance(building) {
        return Number(building?.config?.maintenanceCost) || 0;
    }

    /** Agrupa por tipo: [{ key, config, count, total, people }] do maior para o menor total. */
    static groupByType(items) {
        const groups = new Map();
        items.forEach(({ building, value, people = 0 }) => {
            if (!building?.config) return;
            const key = building.type || building.config.id;
            const g = groups.get(key) || { key, config: building.config, count: 0, total: 0, people: 0 };
            g.count++;
            g.total += value;
            g.people += people;
            groups.set(key, g);
        });
        return [...groups.values()].sort((a, b) => b.total - a.total);
    }

    /**
     * Quem consome água agora, agrupado por tipo de prédio. Moradores (população × WATER_PER_PERSON) são divididos
     * entre os prédios pela capacidade de moradia de cada um (popCapacityOf, a mesma de updatePopulationCapacity);
     * a parte da capacidade base da cidade vira o grupo "Moradores sem zona". Devolve { groups, total }.
     */
    getWaterConsumers(buildings = [], popCapacityOf = b => b.config?.populationCapacity || b.config?.population || 0) {
        const population = this.resources.population;
        const water = this.resources.water;
        const perPerson = ResourceManager.WATER_PER_PERSON;
        const people = Math.max(0, population.current || 0);
        const housing = buildings.filter(b => b.active).map(b => ({ building: b, cap: Math.max(0, popCapacityOf(b) || 0) }));
        const capSum = housing.reduce((sum, h) => sum + h.cap, 0);
        const totalCap = Math.max(population.max || 0, capSum, 1);
        const share = new Map(housing.filter(h => h.cap > 0).map(h => [h.building, people * h.cap / totalCap]));

        const items = [];
        let fixedSum = 0;
        let housedPeople = 0;
        buildings.forEach(b => {
            const fixed = b.effectsApplied ? ResourceManager.buildingWaterUse(b) : 0;
            const residents = share.get(b) || 0;
            if (fixed <= 0 && residents <= 0) return;
            fixedSum += fixed;
            housedPeople += residents;
            items.push({ building: b, value: fixed + residents * perPerson, people: residents });
        });
        const groups = ResourceManager.groupByType(items);

        const otherPeople = people - housedPeople;
        if (otherPeople > 0.5) {
            groups.push({ key: 'residents', icon: '👥', name: 'Moradores sem zona', count: 1, people: otherPeople, total: otherPeople * perPerson });
        }
        const other = (water.buildingConsumption || 0) - fixedSum;
        if (other > 0.05) groups.push({ key: 'other', icon: '💧', name: 'Outros consumos', count: 1, people: 0, total: other });
        groups.sort((a, b) => b.total - a.total);
        return { groups, total: people * perPerson + (water.buildingConsumption || 0) };
    }

    /** Despesas por minuto agrupadas por tipo de prédio (+ "Outras despesas" fora dos prédios). { groups, total }. */
    getExpenseBreakdown(buildings = []) {
        const items = buildings
            .filter(b => b.effectsApplied && ResourceManager.buildingMaintenance(b) > 0)
            .map(b => ({ building: b, value: ResourceManager.buildingMaintenance(b) }));
        const groups = ResourceManager.groupByType(items);
        const total = this.resources.budget.expenses || 0;
        const other = total - items.reduce((sum, i) => sum + i.value, 0);
        if (other > 0.5) {
            groups.push({ key: 'other', icon: '📄', name: 'Outras despesas', count: 1, people: 0, total: other });
            groups.sort((a, b) => b.total - a.total);
        }
        return { groups, total };
    }

    // ===== GESTÃO DE ARMAZENAMENTO DE ÁGUA =====
    addWaterStorage(amount) {
        this.resources.water.storage += amount;
        this.notifyChange('water', 'storage', amount);
        log(`💧 Capacidade de armazenamento aumentada: +${amount}L (total: ${this.resources.water.storage}L)`);
    }

    removeWaterStorage(amount) {
        this.resources.water.storage = Math.max(0, this.resources.water.storage - amount);
        // Se a água atual exceder a nova capacidade, ajustar
        if (this.resources.water.current > this.resources.water.storage) {
            this.resources.water.current = this.resources.water.storage;
        }
        this.notifyChange('water', 'storage', -amount);
        log(`💧 Capacidade de armazenamento reduzida: -${amount}L (total: ${this.resources.water.storage}L)`);
    }
    
    // ===== VERIFICAÇÕES =====
    canAfford(amount) {
        return this.resources.budget.current >= amount;
    }
    
    /**
     * Balanço de água em L/min (como production/consumption): gasto = consumo + desperdício,
     * falta = quanto o gasto passa da produção (0 se a produção dá conta).
     */
    getWaterBalance() {
        const water = this.resources.water;
        const production = Math.max(0, water.production || 0);
        const demand = Math.max(0, (water.consumption || 0) + (water.waste || 0));
        return {
            production,
            demand,
            deficit: Math.max(0, demand - production),
            current: Math.max(0, water.current || 0),
            storage: water.storage || water.max || 0
        };
    }

    /**
     * Falta água = a produção não cobre o gasto E a caixa tem menos de 10 segundos do gasto.
     * (Antes comparava a reserva com consumo × 10, mas o consumo é por MINUTO: pedia 10 minutos de
     * reserva e acusava falta com a caixa enchendo — as zonas paravam de crescer "sem motivo".)
     */
    hasWaterShortage() {
        const { demand, deficit, current } = this.getWaterBalance();
        return deficit > 0 && current < demand / 60 * 10;
    }
    
    hasCriticalPollution() {
        return this.resources.pollution.current > 80;
    }
    
    hasLowSatisfaction() {
        return this.resources.population.satisfaction < 30;
    }
    
    checkWaterThresholds() {
        const water = this.resources.water;
        if (water.max <= 0) return;

        const percent = (water.current / water.max) * 100;
        const thresholds = [50, 25, 10, 5];

        for (const threshold of thresholds) {
            if (percent <= threshold && (this._lastWaterThreshold === undefined || this._lastWaterThreshold > threshold)) {
                this._lastWaterThreshold = threshold;

                const messages = {
                    50: 'O nível de água caiu para 50%. Fique atento ao consumo da sua cidade.',
                    25: 'Alerta! Apenas 25% da água restante. Considere construir novas fontes de captação.',
                    10: 'Situação crítica! Apenas 10% de água restante. Ação imediata necessária!',
                    5: 'EMERGÊNCIA! Apenas 5% de água! Sua cidade está prestes a entrar em colapso!'
                };

                const severity = threshold <= 10 ? 'error' : 'warning';
                const uiManager = this.gameManager?.uiManager;
                if (uiManager && uiManager.showCentralAlert) {
                    const currentWater = Math.round(water.current);
                    const maxWater = Math.round(water.max);
                    uiManager.showCentralAlert(
                        'Nível de Água Baixo',
                        messages[threshold],
                        severity,
                        `Reserva atual: ${currentWater} / ${maxWater} litros (${Math.round(percent)}%)`
                    );
                }
                break;
            }
        }

        // Reset threshold tracking when water recovers
        if (percent > 50) {
            this._lastWaterThreshold = undefined;
        }
    }

    checkCriticalLevels() {
        const criticalEvents = [];

        this.checkWaterThresholds();

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

    // ===== CALLBACKS =====
    onResourceChange(resourceType, callback) {
        if (!this.changeListeners.has(resourceType)) {
            this.changeListeners.set(resourceType, []);
        }
        this.changeListeners.get(resourceType).push(callback);
    }
    
    notifyChange(resourceType, changeType, value) {
        const callbacks = this.changeListeners.get(resourceType);
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

    getBudget() { return { ...this.resources.budget }; }
    getElectricity() { return { ...this.resources.electricity }; }
    getAllResources() { return JSON.parse(JSON.stringify(this.resources)); }

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
        log('🔄 Recursos resetados');
    }

    // ===== ENERGIA =====
    addElectricityGeneration(amount) {
        this.resources.electricity.generation += amount;
        log(`⚡ Geração de energia +${amount} MW`);
        this.updateElectricity(); // eficiência em dia já para quem lê logo depois (ex.: alerta pós-construção)
    }

    removeElectricityGeneration(amount) {
        this.resources.electricity.generation = Math.max(0, this.resources.electricity.generation - amount);
        log(`⚡ Geração de energia -${amount} MW`);
        this.updateElectricity(); // eficiência em dia já para quem lê logo depois (ex.: alerta pós-construção)
    }

    addElectricityConsumption(amount) {
        this.resources.electricity.consumption += amount;
        log(`⚡ Consumo de energia +${amount} MW`);
        this.updateElectricity(); // eficiência em dia já para quem lê logo depois (ex.: alerta pós-construção)
    }

    removeElectricityConsumption(amount) {
        this.resources.electricity.consumption = Math.max(0, this.resources.electricity.consumption - amount);
        log(`⚡ Consumo de energia -${amount} MW`);
        this.updateElectricity(); // eficiência em dia já para quem lê logo depois (ex.: alerta pós-construção)
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
    // Os totais (produção, consumo, fontes/redução de poluição, receita, despesas, geração de energia,
    // armazenamento, consumo fixo dos prédios) já incluem o efeito dos prédios, das árvores e dos eventos.
    // Por isso o load NÃO reaplica applyBuildingEffects/TreeSystem.applyEffects: restaura os números como estavam.
    // O histórico (até 100 amostras × 5 recursos, com horário real) não vai: nada o lê e ele inchava o save.
    getSaveData() {
        return JSON.parse(JSON.stringify({ resources: this.resources }));
    }

    loadData(data) {
        if (data && data.resources) {
            const saved = JSON.parse(JSON.stringify(data.resources));
            // Campos que faltarem (save de antes de um recurso novo) ficam com o valor do jogo novo
            for (const [type, values] of Object.entries(this.resources)) {
                this.resources[type] = { ...values, ...(saved[type] || {}) };
            }
        }
        this.invalidateConsumptionCache();
        this.lastUpdate = 0;
        this.updateElectricity();
        log('📁 Dados de recursos carregados');
    }
}

// Exportar para escopo global
window.ResourceManager = ResourceManager;
log('💧 ResourceManager carregado e exportado para window.ResourceManager');
