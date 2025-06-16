
// script.js - Funcionalidades principais do sistema

class SistemaContas {
    constructor() {
        this.theme = 'dark'; // Tema padrão
        this.activeTab = 'dashboard';
        this.db = null; // Será inicializado quando implementarmos a conexão
        
        this.init();
    }

    init() {
        this.setupThemeToggle();
        this.setupTabs();
        this.loadDashboard();
        
        // Event listeners
        document.addEventListener('DOMContentLoaded', () => {
            this.loadInitialData();
        });
    }

    // === CONTROLE DE TEMA ===
    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const body = document.body;

        // Definir tema inicial (dark como padrão)
        body.classList.add('dark-theme');
        themeToggle.checked = true;

        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Modo escuro
                body.classList.remove('light-theme');
                body.classList.add('dark-theme');
                this.theme = 'dark';
            } else {
                // Modo claro
                body.classList.remove('dark-theme');
                body.classList.add('light-theme');
                this.theme = 'light';
            }
            
            // Salvar preferência no localStorage
            localStorage.setItem('theme', this.theme);
        });

        // Carregar tema salvo
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.theme = savedTheme;
            if (savedTheme === 'light') {
                themeToggle.checked = false;
                body.classList.remove('dark-theme');
                body.classList.add('light-theme');
            }
        }
    }

    // === CONTROLE DE TABS ===
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTab = e.target.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    }

    switchTab(tabName) {
        // Remover classe active de todos os botões e conteúdos
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Adicionar classe active ao botão e conteúdo selecionados
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        this.activeTab = tabName;

        // Carregar dados específicos da tab se necessário
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'contas-pagar':
                this.loadContasPagar();
                break;
            case 'contas-receber':
                this.loadContasReceber();
                break;
            case 'consolidados':
                this.loadConsolidados();
                break;
            case 'relatorios':
                this.loadRelatorios();
                break;
            case 'logs':
                this.loadLogs();
                break;
        }
    }

    // === DASHBOARD ===
    loadDashboard() {
        // Simular carregamento de dados
        this.updateDashboardCards({
            totalPagar: 'R$ 15.450,00',
            totalReceber: 'R$ 28.750,00',
            vencidasPagar: 3,
            vencidasReceber: 1
        });
    }

    updateDashboardCards(data) {
        document.getElementById('total-pagar').textContent = data.totalPagar;
        document.getElementById('total-receber').textContent = data.totalReceber;
        document.getElementById('vencidas-pagar').textContent = data.vencidasPagar;
        document.getElementById('vencidas-receber').textContent = data.vencidasReceber;
    }

    atualizarDashboard() {
        // Mostrar loading
        const cards = document.querySelectorAll('.card-value');
        cards.forEach(card => {
            card.textContent = 'Carregando...';
        });

        // Simular requisição
        setTimeout(() => {
            this.loadDashboard();
            this.showNotification('Dashboard atualizado com sucesso!', 'success');
        }, 1000);
    }

    // === CONTAS A PAGAR ===
    loadContasPagar() {
        const tbody = document.getElementById('tabela-contas-pagar');
        
        // Dados simulados
        const contasPagar = [
            {
                id: '1',
                descricao: 'Fornecedor ABC - Material de escritório',
                fornecedor: 'ABC Materiais Ltda',
                categoria: 'Escritório',
                valor: 'R$ 1.250,00',
                vencimento: '2024-01-15',
                status: 'pendente'
            },
            {
                id: '2',
                descricao: 'Energia elétrica - Janeiro',
                fornecedor: 'Companhia Elétrica',
                categoria: 'Utilidades',
                valor: 'R$ 850,00',
                vencimento: '2024-01-20',
                status: 'atrasado'
            }
        ];

        tbody.innerHTML = contasPagar.map(conta => `
            <tr>
                <td>${conta.descricao}</td>
                <td>${conta.fornecedor}</td>
                <td>${conta.categoria}</td>
                <td class="font-weight-bold">${conta.valor}</td>
                <td>${this.formatDate(conta.vencimento)}</td>
                <td><span class="status-badge status-${conta.status}">${this.getStatusText(conta.status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="sistema.pagarConta('${conta.id}')">💰 Pagar</button>
                    <button class="btn btn-sm btn-secondary" onclick="sistema.editarConta('${conta.id}', 'pagar')">✏️ Editar</button>
                </td>
            </tr>
        `).join('');
    }

    // === CONTAS A RECEBER ===
    loadContasReceber() {
        const tbody = document.getElementById('tabela-contas-receber');
        
        // Dados simulados
        const contasReceber = [
            {
                id: '1',
                descricao: 'Serviços de consultoria - Cliente XYZ',
                cliente: 'XYZ Consultoria',
                categoria: 'Serviços',
                valor: 'R$ 5.500,00',
                vencimento: '2024-01-25',
                status: 'pendente'
            },
            {
                id: '2',
                descricao: 'Venda de produtos - Cliente ABC',
                cliente: 'ABC Comércio',
                categoria: 'Vendas',
                valor: 'R$ 3.200,00',
                vencimento: '2024-01-30',
                status: 'pendente'
            }
        ];

        tbody.innerHTML = contasReceber.map(conta => `
            <tr>
                <td>${conta.descricao}</td>
                <td>${conta.cliente}</td>
                <td>${conta.categoria}</td>
                <td class="font-weight-bold">${conta.valor}</td>
                <td>${this.formatDate(conta.vencimento)}</td>
                <td><span class="status-badge status-${conta.status}">${this.getStatusText(conta.status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="sistema.receberConta('${conta.id}')">💰 Receber</button>
                    <button class="btn btn-sm btn-secondary" onclick="sistema.editarConta('${conta.id}', 'receber')">✏️ Editar</button>
                </td>
            </tr>
        `).join('');
    }

    // === OUTRAS SEÇÕES ===
    loadConsolidados() {
        console.log('Carregando consolidados...');
    }

    loadRelatorios() {
        console.log('Carregando relatórios...');
    }

    loadLogs() {
        console.log('Carregando logs...');
    }

    // === AÇÕES ===
    novaContaPagar() {
        this.showNotification('Modal de nova conta a pagar será implementado', 'info');
    }

    novaContaReceber() {
        this.showNotification('Modal de nova conta a receber será implementado', 'info');
    }

    pagarConta(id) {
        this.showNotification(`Pagamento da conta ${id} será implementado`, 'info');
    }

    receberConta(id) {
        this.showNotification(`Recebimento da conta ${id} será implementado`, 'info');
    }

    editarConta(id, tipo) {
        this.showNotification(`Edição da conta ${tipo} ${id} será implementada`, 'info');
    }

    filtrarContasPagar() {
        const status = document.getElementById('filtro-status-pagar').value;
        const dataInicio = document.getElementById('filtro-data-inicio-pagar').value;
        const dataFim = document.getElementById('filtro-data-fim-pagar').value;
        
        console.log('Filtros aplicados:', { status, dataInicio, dataFim });
        this.showNotification('Filtros aplicados com sucesso!', 'success');
    }

    filtrarContasReceber() {
        const status = document.getElementById('filtro-status-receber').value;
        const dataInicio = document.getElementById('filtro-data-inicio-receber').value;
        const dataFim = document.getElementById('filtro-data-fim-receber').value;
        
        console.log('Filtros aplicados:', { status, dataInicio, dataFim });
        this.showNotification('Filtros aplicados com sucesso!', 'success');
    }

    // === UTILITÁRIOS ===
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    getStatusText(status) {
        const statusMap = {
            'pendente': 'Pendente',
            'pago': 'Pago',
            'recebido': 'Recebido',
            'atrasado': 'Atrasado',
            'cancelado': 'Cancelado'
        };
        return statusMap[status] || status;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Estilos inline para a notificação
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '9999',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease'
        });

        // Cores baseadas no tipo
        const colors = {
            success: '#51cf66',
            error: '#ff6b6b',
            warning: '#ffd43b',
            info: '#4dabf7'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Adicionar ao DOM
        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);

        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    loadInitialData() {
        // Carregar dados iniciais
        console.log('Sistema inicializado com sucesso!');
        this.showNotification('Sistema carregado com sucesso!', 'success');
    }
}

// === FUNÇÕES GLOBAIS ===
function atualizarDashboard() {
    sistema.atualizarDashboard();
}

function novaContaPagar() {
    sistema.novaContaPagar();
}

function novaContaReceber() {
    sistema.novaContaReceber();
}

function filtrarContasPagar() {
    sistema.filtrarContasPagar();
}

function filtrarContasReceber() {
    sistema.filtrarContasReceber();
}

// Inicializar sistema
const sistema = new SistemaContas();

// Exportar para uso global
window.sistema = sistema;
