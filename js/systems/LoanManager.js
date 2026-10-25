/**
 * GUARDIÃO DA ÁGUA - LOAN MANAGER
 * Gerencia o sistema de empréstimos da cidade
 */

class LoanManager {
    constructor(gameManager) {
        log('🏦 Inicializando LoanManager...');
        
        this.gameManager = gameManager;
        this.loans = new Map(); // ID do empréstimo -> dados do empréstimo
        this.loanCounter = 0;
        
        // Configurações do sistema de empréstimos
        this.config = {
            baseInterestRate: 0.05, // 5% ao ano
            maxDebtToIncomeRatio: 3.0, // Máximo 3x a receita mensal
            maxLoanMultiplier: 5, // Máximo 5x a receita mensal por empréstimo
            minCreditScore: 300,
            maxCreditScore: 850,
            defaultCreditScore: 600
        };
        
        // Estado financeiro da cidade
        this.cityFinancialHealth = {
            creditScore: this.config.defaultCreditScore,
            totalDebt: 0,
            monthlyPayments: 0,
            paymentHistory: []
        };
        
        log('✅ LoanManager inicializado');
    }
    
    // ===== SOLICITAÇÃO DE EMPRÉSTIMO =====
    requestLoan(amount, termMonths) {
        log(`🏦 Solicitação de empréstimo: R$ ${amount} por ${termMonths} meses`);
        
        // Validar parâmetros
        if (amount <= 0 || termMonths <= 0) {
            return {
                approved: false,
                reason: 'Valores inválidos para empréstimo'
            };
        }
        
        // Verificar critérios de aprovação
        const approval = this.evaluateLoanApplication(amount, termMonths);
        
        if (approval.approved) {
            // Criar empréstimo
            const loan = this.createLoan(amount, termMonths, approval.interestRate);
            
            // Adicionar fundos ao orçamento
            this.gameManager.resourceManager.addBudget(amount);
            
            // Atualizar estado financeiro
            this.cityFinancialHealth.totalDebt += amount;
            this.cityFinancialHealth.monthlyPayments += loan.monthlyPayment;
            
            log(`✅ Empréstimo aprovado: R$ ${amount} a ${(approval.interestRate * 100).toFixed(2)}% ao ano`);
            
            return {
                approved: true,
                loan: loan,
                interestRate: approval.interestRate
            };
        }
        
        log(`❌ Empréstimo rejeitado: ${approval.reason}`);
        return approval;
    }
    
    evaluateLoanApplication(amount, termMonths) {
        const monthlyIncome = this.getMonthlyIncome();
        const currentMonthlyPayments = this.cityFinancialHealth.monthlyPayments;
        
        // Critério 1: Valor máximo por empréstimo (5x receita mensal)
        const maxLoanAmount = monthlyIncome * this.config.maxLoanMultiplier;
        if (amount > maxLoanAmount) {
            return {
                approved: false,
                reason: `Valor solicitado excede o limite máximo (R$ ${maxLoanAmount.toFixed(2)})`
            };
        }
        
        // Critério 2: Relação dívida/receita
        const projectedMonthlyPayment = this.calculateMonthlyPayment(amount, termMonths, this.config.baseInterestRate);
        const totalMonthlyPayments = currentMonthlyPayments + projectedMonthlyPayment;
        const debtToIncomeRatio = totalMonthlyPayments / monthlyIncome;
        
        if (debtToIncomeRatio > this.config.maxDebtToIncomeRatio) {
            return {
                approved: false,
                reason: `Relação dívida/receita muito alta (${(debtToIncomeRatio * 100).toFixed(1)}%)`
            };
        }
        
        // Calcular taxa de juros baseada na saúde financeira
        const interestRate = this.calculateInterestRate();
        
        return {
            approved: true,
            interestRate: interestRate,
            monthlyPayment: this.calculateMonthlyPayment(amount, termMonths, interestRate)
        };
    }
    
    calculateInterestRate() {
        const creditScore = this.cityFinancialHealth.creditScore;
        const baseRate = this.config.baseInterestRate;
        
        // Ajustar taxa baseada no score de crédito
        let rateMultiplier = 1.0;
        
        if (creditScore >= 750) {
            rateMultiplier = 0.8; // 20% de desconto
        } else if (creditScore >= 650) {
            rateMultiplier = 1.0; // Taxa base
        } else if (creditScore >= 550) {
            rateMultiplier = 1.3; // 30% de acréscimo
        } else {
            rateMultiplier = 1.6; // 60% de acréscimo
        }
        
        return baseRate * rateMultiplier;
    }
    
    calculateMonthlyPayment(principal, termMonths, annualRate) {
        const monthlyRate = annualRate / 12;
        if (monthlyRate === 0) return principal / termMonths;
        
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                       (Math.pow(1 + monthlyRate, termMonths) - 1);
        
        return payment;
    }
    
    createLoan(amount, termMonths, interestRate) {
        this.loanCounter++;
        
        const loan = {
            id: `loan_${this.loanCounter}`,
            principal: amount,
            remainingBalance: amount,
            termMonths: termMonths,
            remainingMonths: termMonths,
            annualInterestRate: interestRate,
            monthlyPayment: this.calculateMonthlyPayment(amount, termMonths, interestRate),
            startDate: new Date(),
            nextPaymentAt: this.getNextPaymentAt(),
            status: 'active',
            paymentHistory: []
        };
        
        this.loans.set(loan.id, loan);
        return loan;
    }
    
    // Um "mês" do empréstimo = MONTH_MS de tempo de jogo (gameTime: para na pausa). Antes a cobrança somava
    // 720 h de jogo com a data real do calendário e as parcelas praticamente nunca chegavam.
    static MONTH_MS = 120000;
    static LATE_RETRY_MS = 20000;

    simNow() {
        return this.gameManager?.gameTime || 0;
    }

    getNextPaymentAt() {
        return this.simNow() + LoanManager.MONTH_MS;
    }
    
    getMonthlyIncome() {
        if (!this.gameManager.resourceManager) return 1600; // Fallback (renda fixa de 800/min × 2 min)
        
        // budget.income é por minuto; o "mês" do empréstimo dura MONTH_MS de jogo (2 min)
        const budget = this.gameManager.resourceManager.getBudget();
        return (budget.income || ResourceManager.BASE_INCOME) * (LoanManager.MONTH_MS / 60000);
    }
    
    // ===== PROCESSAMENTO DE PAGAMENTOS =====
    processMonthlyPayments() {
        let totalPayments = 0;
        
        this.loans.forEach(loan => {
            if (loan.status === 'active' && this.isPaymentDue(loan)) {
                const paymentResult = this.processLoanPayment(loan);
                if (paymentResult.success) {
                    totalPayments += paymentResult.amount;
                }
            }
        });
        
        if (totalPayments > 0) {
            log(`🏦 Pagamentos mensais processados: R$ ${totalPayments.toFixed(2)}`);
            
            if (this.gameManager.uiManager) {
                this.gameManager.uiManager.showNotification(
                    `🏦 Pagamentos de empréstimos: R$ ${totalPayments.toFixed(2)}`,
                    'info'
                );
            }
        }
    }
    
    isPaymentDue(loan) {
        return this.simNow() >= loan.nextPaymentAt;
    }
    
    processLoanPayment(loan) {
        const paymentAmount = loan.monthlyPayment;
        const currentBudget = this.gameManager.resourceManager.getBudget().current;
        
        if (currentBudget < paymentAmount) {
            // Pagamento em atraso: tenta de novo daqui a LATE_RETRY_MS (não a cada quadro)
            this.handleLatePayment(loan);
            loan.nextPaymentAt = this.simNow() + LoanManager.LATE_RETRY_MS;
            return { success: false, amount: 0 };
        }
        
        // Deduzir pagamento do orçamento
        this.gameManager.resourceManager.spendBudget(paymentAmount);
        
        // Calcular juros e principal
        const monthlyRate = loan.annualInterestRate / 12;
        const interestPayment = loan.remainingBalance * monthlyRate;
        const principalPayment = paymentAmount - interestPayment;
        
        // Atualizar saldo do empréstimo
        loan.remainingBalance -= principalPayment;
        loan.remainingMonths--;
        
        // Registrar pagamento
        loan.paymentHistory.push({
            date: new Date(),
            amount: paymentAmount,
            principal: principalPayment,
            interest: interestPayment,
            remainingBalance: loan.remainingBalance
        });
        
        // Atualizar próxima data de pagamento
        loan.nextPaymentAt = this.getNextPaymentAt();
        
        // Verificar se empréstimo foi quitado
        if (loan.remainingBalance <= 0.01 || loan.remainingMonths <= 0) {
            this.completeLoan(loan);
        }
        
        // Atualizar estado financeiro da cidade
        this.cityFinancialHealth.totalDebt -= principalPayment;
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('sfx_loan_payment'); // parcela paga
        
        return { success: true, amount: paymentAmount };
    }
    
    handleLatePayment(loan) {
        // Reduzir score de crédito
        this.cityFinancialHealth.creditScore = Math.max(
            this.config.minCreditScore,
            this.cityFinancialHealth.creditScore - 10
        );
        
        console.warn(`⚠️ Pagamento em atraso para empréstimo ${loan.id}`);
        
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                '⚠️ Pagamento de empréstimo em atraso! Score de crédito reduzido.',
                'warning'
            );
        }
    }
    
    completeLoan(loan) {
        loan.status = 'completed';
        loan.remainingBalance = 0;
        
        // Melhorar score de crédito
        this.cityFinancialHealth.creditScore = Math.min(
            this.config.maxCreditScore,
            this.cityFinancialHealth.creditScore + 20
        );
        
        // Atualizar pagamentos mensais
        this.cityFinancialHealth.monthlyPayments -= loan.monthlyPayment;
        
        log(`✅ Empréstimo ${loan.id} quitado com sucesso!`);
        
        if (this.gameManager.uiManager) {
            this.gameManager.uiManager.showNotification(
                `🎉 Empréstimo quitado! Score de crédito melhorado.`,
                'success'
            );
        }
    }
    
    // ===== GETTERS =====
    getActiveLoans() {
        return Array.from(this.loans.values()).filter(loan => loan.status === 'active');
    }
    
    getTotalDebt() {
        return this.cityFinancialHealth.totalDebt;
    }
    
    getMonthlyPayments() {
        return this.cityFinancialHealth.monthlyPayments;
    }
    
    getCreditScore() {
        return this.cityFinancialHealth.creditScore;
    }
    
    getMaxLoanAmount() {
        const monthlyIncome = this.getMonthlyIncome();
        return monthlyIncome * this.config.maxLoanMultiplier;
    }
    
    // ===== SAVE/LOAD =====
    saveData() {
        return {
            loans: Array.from(this.loans.entries()),
            loanCounter: this.loanCounter,
            cityFinancialHealth: this.cityFinancialHealth
        };
    }
    
    loadData(data) {
        if (data) {
            // JSON transforma Date em string: revive as datas do histórico. Save antigo (nextPaymentDate, data real):
            // a próxima parcela vence daqui a um mês de jogo.
            this.loans = new Map((data.loans || []).map(([id, loan]) => [id, {
                ...loan,
                startDate: new Date(loan.startDate),
                nextPaymentAt: Number.isFinite(loan.nextPaymentAt) ? loan.nextPaymentAt : this.getNextPaymentAt(),
                paymentHistory: (loan.paymentHistory || []).map(payment => ({ ...payment, date: new Date(payment.date) }))
            }]));
            this.loanCounter = data.loanCounter || 0;
            this.cityFinancialHealth = data.cityFinancialHealth || this.cityFinancialHealth;
        }
    }
    
    // ===== CLEANUP =====
    dispose() {
        this.loans.clear();
        log('🗑️ LoanManager disposed');
    }
}

// Exportar para escopo global
window.LoanManager = LoanManager;
log('🏦 LoanManager carregado e exportado para window.LoanManager');
