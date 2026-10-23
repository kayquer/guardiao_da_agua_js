/**
 * UIManager — Interface de empréstimos
 * Parte da classe UIManager (js/systems/UIManager.js), anexada via mixin(): use this.* normalmente.
 */
mixin(UIManager, {
    // ===== SISTEMA DE EMPRÉSTIMOS =====
    showLoanInterface() {
        if (!this.gameManager.loanManager) {
            console.warn('⚠️ LoanManager não disponível');
            return;
        }

        const loanManager = this.gameManager.loanManager;
        const monthlyIncome = loanManager.getMonthlyIncome();
        const maxLoanAmount = loanManager.getMaxLoanAmount();
        const creditScore = loanManager.getCreditScore();
        const currentDebt = loanManager.getTotalDebt();
        const monthlyPayments = loanManager.getMonthlyPayments();

        // Usar o painel de detalhes para mostrar a interface de empréstimos
        const detailsPanel = this.elements.detailsPanel;
        const detailsContent = this.elements.detailsContent;

        if (!detailsPanel || !detailsContent) return;

        const content = `
            <div class="loan-interface">
                <div class="loan-header">
                    <h3>🏦 Sistema de Empréstimos</h3>
                    <button class="close-btn" onclick="window.gameManager.uiManager.closeLoanInterface()">✖️</button>
                </div>

                <div class="financial-status">
                    <h4>📊 Status Financeiro da Cidade</h4>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Receita Mensal:</span>
                            <span class="status-value">R$ ${monthlyIncome.toFixed(2)}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Score de Crédito:</span>
                            <span class="status-value credit-score-${this.getCreditScoreClass(creditScore)}">${creditScore}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Dívida Total:</span>
                            <span class="status-value">R$ ${currentDebt.toFixed(2)}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Pagamentos Mensais:</span>
                            <span class="status-value">R$ ${monthlyPayments.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div class="loan-application">
                    <h4>💰 Solicitar Empréstimo</h4>
                    <div class="loan-form">
                        <div class="form-group">
                            <label for="loan-amount">Valor do Empréstimo (máx. R$ ${maxLoanAmount.toFixed(2)}):</label>
                            <input type="number" id="loan-amount" min="1000" max="${maxLoanAmount}" step="1000" value="10000">
                        </div>

                        <div class="form-group">
                            <label for="loan-term">Prazo de Pagamento:</label>
                            <select id="loan-term">
                                <option value="6">6 meses</option>
                                <option value="12" selected>12 meses</option>
                                <option value="24">24 meses</option>
                                <option value="36">36 meses</option>
                            </select>
                        </div>

                        <div class="loan-preview" id="loan-preview">
                            <div class="preview-item">
                                <span>Taxa de Juros Estimada:</span>
                                <span id="estimated-rate">-</span>
                            </div>
                            <div class="preview-item">
                                <span>Pagamento Mensal:</span>
                                <span id="monthly-payment">-</span>
                            </div>
                            <div class="preview-item">
                                <span>Total a Pagar:</span>
                                <span id="total-payment">-</span>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button class="loan-btn calculate-btn" onclick="window.gameManager.uiManager.calculateLoanPreview()">
                                📊 Calcular
                            </button>
                            <button class="loan-btn apply-btn" onclick="window.gameManager.uiManager.applyForLoan()">
                                💰 Solicitar Empréstimo
                            </button>
                        </div>
                    </div>
                </div>

                <div class="active-loans">
                    <h4>📋 Empréstimos Ativos</h4>
                    <div id="active-loans-list">
                        ${this.generateActiveLoansHTML(loanManager.getActiveLoans())}
                    </div>
                </div>
            </div>
        `;

        detailsContent.innerHTML = uiIconsIn(content);
        detailsPanel.style.display = 'flex';
        this.updatePanelState('loans');

        // Calcular preview inicial
        this.calculateLoanPreview();

        log('🏦 Interface de empréstimos aberta');
    },

    closeLoanInterface() {
        const detailsPanel = this.elements.detailsPanel;

        if (detailsPanel && this.uiState.currentOpenPanel === 'loans') {
            detailsPanel.style.display = 'none';
            this.updatePanelState(null);
        }
    },

    calculateLoanPreview() {
        const amountInput = document.getElementById('loan-amount');
        const termSelect = document.getElementById('loan-term');

        if (!amountInput || !termSelect) return;

        const amount = parseFloat(amountInput.value) || 0;
        const termMonths = parseInt(termSelect.value) || 12;

        if (amount <= 0) return;

        const loanManager = this.gameManager.loanManager;
        const interestRate = loanManager.calculateInterestRate();
        const monthlyPayment = loanManager.calculateMonthlyPayment(amount, termMonths, interestRate);
        const totalPayment = monthlyPayment * termMonths;

        // Atualizar preview
        document.getElementById('estimated-rate').textContent = `${(interestRate * 100).toFixed(2)}% ao ano`;
        document.getElementById('monthly-payment').textContent = `R$ ${monthlyPayment.toFixed(2)}`;
        document.getElementById('total-payment').textContent = `R$ ${totalPayment.toFixed(2)}`;
    },

    applyForLoan() {
        const amountInput = document.getElementById('loan-amount');
        const termSelect = document.getElementById('loan-term');

        if (!amountInput || !termSelect) return;

        const amount = parseFloat(amountInput.value) || 0;
        const termMonths = parseInt(termSelect.value) || 12;

        if (amount <= 0) {
            this.showNotification('❌ Valor do empréstimo inválido', 'error');
            return;
        }

        const result = this.gameManager.loanManager.requestLoan(amount, termMonths);

        if (result.approved) {
            AudioManager.playSound('sfx_cash_register');
            this.showNotification(
                `✅ Empréstimo aprovado! R$ ${amount} a ${(result.interestRate * 100).toFixed(2)}% ao ano`,
                'success'
            );

            // Atualizar interface
            this.showLoanInterface();
        } else {
            AudioManager.playSound('sfx_error');
            this.showNotification(`❌ Empréstimo rejeitado: ${result.reason}`, 'error');
        }
    },

    generateActiveLoansHTML(loans) {
        if (loans.length === 0) {
            return '<p class="no-loans">Nenhum empréstimo ativo</p>';
        }

        return loans.map(loan => `
            <div class="loan-item">
                <div class="loan-info">
                    <span class="loan-id">${loan.id}</span>
                    <span class="loan-balance">Saldo: R$ ${loan.remainingBalance.toFixed(2)}</span>
                    <span class="loan-payment">Pagamento: R$ ${loan.monthlyPayment.toFixed(2)}/mês</span>
                    <span class="loan-remaining">${loan.remainingMonths} meses restantes</span>
                </div>
            </div>
        `).join('');
    },

    getCreditScoreClass(score) {
        if (score >= 750) return 'excellent';
        if (score >= 650) return 'good';
        if (score >= 550) return 'fair';
        return 'poor';
    },
});
