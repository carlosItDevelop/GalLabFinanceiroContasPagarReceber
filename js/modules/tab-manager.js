// Módulo para gestão de tabs
export class TabManager {
    constructor(dashboard, accountsManager) {
        this.currentTab = 'dashboard';
        this.dashboard = dashboard;
        this.accountsManager = accountsManager;
    }

    init() {
        this.setupTabs();
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                
                // Remover classe active de todos
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                
                // Adicionar classe active aos selecionados
                btn.classList.add('active');
                document.getElementById(tabId).classList.add('active');
                
                this.currentTab = tabId;
                
                // Carregar dados específicos da tab
                this.loadTabData(tabId);
            });
        });
    }

    async loadTabData(tabId) {
        try {
            switch (tabId) {
                case 'dashboard':
                    await this.dashboard.load();
                    break;
                case 'contas-pagar':
                    await this.accountsManager.loadContasPagar();
                    break;
                case 'contas-receber':
                    await this.accountsManager.loadContasReceber();
                    break;
                case 'agenda':
                    // TODO: Implementar módulo de agenda
                    console.log('Carregando agenda...');
                    break;
                case 'arquivos':
                    // TODO: Implementar módulo de arquivos
                    console.log('Carregando arquivos...');
                    break;
                case 'logs':
                    // TODO: Implementar módulo de logs
                    console.log('Carregando logs...');
                    break;
                case 'consolidados':
                    // TODO: Implementar módulo de relatórios
                    console.log('Carregando relatórios consolidados...');
                    break;
            }
        } catch (error) {
            console.error(`Erro ao carregar dados da tab ${tabId}:`, error);
        }
    }

    getCurrentTab() {
        return this.currentTab;
    }
}