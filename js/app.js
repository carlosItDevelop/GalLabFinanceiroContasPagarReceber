// Aplicação principal modularizada
import { ThemeManager } from './modules/theme-manager.js';
import { FinancialAPI } from './api/financial-api.js';
import { Dashboard } from './modules/dashboard.js';
import { AccountsManager } from './modules/accounts.js';
import { TabManager } from './modules/tab-manager.js';

class ModularFinancialApp {
    constructor() {
        // Inicializar módulos
        this.themeManager = new ThemeManager();
        this.api = new FinancialAPI();
        this.dashboard = new Dashboard(this.api, this.themeManager);
        this.accountsManager = new AccountsManager(this.api);
        this.tabManager = new TabManager(this.dashboard, this.accountsManager);

        // Expor accountsManager globalmente para compatibilidade com HTML
        window.accountsManager = this.accountsManager;
    }

    async init() {
        try {
            // Inicializar todos os módulos
            this.themeManager.init();
            this.accountsManager.init();
            this.tabManager.init();
            
            // Carregar dados iniciais
            await this.dashboard.load();
            
            console.log('Sistema modular inicializado com sucesso!');
        } catch (error) {
            console.error('Erro ao inicializar sistema:', error);
            this.showError('Erro ao inicializar sistema');
        }
    }

    showError(message) {
        console.error(message);
        // TODO: Implementar sistema de notificações mais robusto
        alert(message);
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new ModularFinancialApp();
    app.init();
    
    // Expor app globalmente para debug
    window.app = app;
});