
// Classe principal do sistema
class SistemaContasApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.theme = 'dark'; // Modo escuro como padrão
        this.modalType = null; // 'pagar' ou 'receber'
        
        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupTabs();
        this.setupModals();
        this.setupEventListeners();
        await this.loadInitialData();
        
        console.log('Sistema inicializado com sucesso!');
    }

    // === SISTEMA DE TEMAS ===
    setupTheme() {
        const themeBtn = document.getElementById('theme-toggle');
        const themeIcon = themeBtn.querySelector('.theme-icon');
        const themeText = themeBtn.querySelector('.theme-text');
        
        // Aplicar tema padrão (escuro)
        this.applyTheme();
        
        themeBtn.addEventListener('click', () => {
            this.theme = this.theme === 'dark' ? 'light' : 'dark';
            this.applyTheme();
            
            // Atualizar botão
            if (this.theme === 'dark') {
                themeIcon.textContent = '🌙';
                themeText.textContent = 'Escuro';
            } else {
                themeIcon.textContent = '☀️';
                themeText.textContent = 'Claro';
            }
        });
    }

    applyTheme() {
        if (this.theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    // === SISTEMA DE TABS ===
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
        switch (tabId) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'contas-pagar':
                await this.loadContasPagar();
                break;
            case 'contas-receber':
                await this.loadContasReceber();
                break;
        }
    }

    // === MODAIS ===
    setupModals() {
        const modal = document.getElementById('modal-nova-conta');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const form = document.getElementById('form-nova-conta');

        // Botões para abrir modal
        document.getElementById('nova-conta-pagar').addEventListener('click', () => {
            this.openModal('pagar');
        });

        document.getElementById('nova-conta-receber').addEventListener('click', () => {
            this.openModal('receber');
        });

        // Fechar modal
        const closeModal = () => {
            modal.classList.remove('active');
            form.reset();
            this.modalType = null;
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Submit do formulário
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveNewConta();
            closeModal();
        });
    }

    async openModal(tipo) {
        this.modalType = tipo;
        const modal = document.getElementById('modal-nova-conta');
        const title = document.getElementById('modal-title');
        const labelFornecedorCliente = document.querySelector('label[for="conta-fornecedor-cliente"]');
        
        title.textContent = tipo === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber';
        labelFornecedorCliente.textContent = tipo === 'pagar' ? 'Fornecedor' : 'Cliente';
        
        // Carregar categorias e fornecedores/clientes
        await this.loadModalData(tipo);
        
        modal.classList.add('active');
    }

    // === EVENT LISTENERS ===
    setupEventListeners() {
        // Filtros das tabelas
        const setupFilter = (inputId, tableId) => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    this.filterTable(tableId, input.value);
                });
            }
        };

        setupFilter('filtro-pagar', 'tabela-contas-pagar');
        setupFilter('filtro-receber', 'tabela-contas-receber');
    }

    // === CARREGAMENTO DE DADOS ===
    async loadInitialData() {
        try {
            await this.loadDashboard();
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados do sistema');
        }
    }

    async loadDashboard() {
        try {
            // Simular dados do dashboard (será conectado com API)
            const dashboardData = {
                totalPagar: 15000.00,
                totalReceber: 25000.00,
                vencidasPagar: 3,
                vencidasReceber: 1,
                alertas: 4
            };

            // Atualizar cards
            document.getElementById('total-pagar').textContent = this.formatCurrency(dashboardData.totalPagar);
            document.getElementById('total-receber').textContent = this.formatCurrency(dashboardData.totalReceber);
            document.getElementById('saldo-projetado').textContent = this.formatCurrency(dashboardData.totalReceber - dashboardData.totalPagar);
            document.getElementById('vencidas-pagar').textContent = `${dashboardData.vencidasPagar} vencidas`;
            document.getElementById('vencidas-receber').textContent = `${dashboardData.vencidasReceber} vencidas`;
            document.getElementById('total-alertas').textContent = dashboardData.alertas;

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    }

    async loadContasPagar() {
        try {
            // Simular dados (será conectado com API)
            const contas = [
                {
                    id: 1,
                    descricao: 'Energia Elétrica - Janeiro',
                    fornecedor: 'Companhia Elétrica SP',
                    categoria: 'Utilidades',
                    valor: 450.00,
                    vencimento: '2024-01-15',
                    status: 'pendente'
                },
                {
                    id: 2,
                    descricao: 'Material de Escritório',
                    fornecedor: 'ABC Materiais Ltda',
                    categoria: 'Escritório',
                    valor: 230.50,
                    vencimento: '2024-01-20',
                    status: 'pago'
                }
            ];

            this.renderContasTable('tabela-contas-pagar', contas, 'pagar');

        } catch (error) {
            console.error('Erro ao carregar contas a pagar:', error);
        }
    }

    async loadContasReceber() {
        try {
            // Simular dados (será conectado com API)
            const contas = [
                {
                    id: 1,
                    descricao: 'Consultoria - Janeiro',
                    cliente: 'XYZ Consultoria Ltda',
                    categoria: 'Consultoria',
                    valor: 2500.00,
                    vencimento: '2024-01-10',
                    status: 'recebido'
                },
                {
                    id: 2,
                    descricao: 'Venda de Produtos',
                    cliente: 'Comércio ABC Ltda',
                    categoria: 'Vendas',
                    valor: 1800.00,
                    vencimento: '2024-01-25',
                    status: 'pendente'
                }
            ];

            this.renderContasTable('tabela-contas-receber', contas, 'receber');

        } catch (error) {
            console.error('Erro ao carregar contas a receber:', error);
        }
    }

    async loadModalData(tipo) {
        try {
            // Carregar categorias
            const categorias = await this.getCategorias(tipo);
            const selectCategoria = document.getElementById('conta-categoria');
            selectCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
            
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nome;
                selectCategoria.appendChild(option);
            });

            // Carregar fornecedores/clientes
            const fornecedoresClientes = tipo === 'pagar' 
                ? await this.getFornecedores() 
                : await this.getClientes();
            
            const selectFornecedorCliente = document.getElementById('conta-fornecedor-cliente');
            selectFornecedorCliente.innerHTML = '<option value="">Selecione</option>';
            
            fornecedoresClientes.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.nome;
                selectFornecedorCliente.appendChild(option);
            });

        } catch (error) {
            console.error('Erro ao carregar dados do modal:', error);
        }
    }

    // === MÉTODOS DA API (simulados) ===
    async getCategorias(tipo) {
        // Simular categorias
        const todasCategorias = [
            { id: 1, nome: 'Escritório', tipo: 'pagar' },
            { id: 2, nome: 'Utilidades', tipo: 'pagar' },
            { id: 3, nome: 'Fornecedores', tipo: 'pagar' },
            { id: 4, nome: 'Serviços', tipo: 'receber' },
            { id: 5, nome: 'Vendas', tipo: 'receber' },
            { id: 6, nome: 'Consultoria', tipo: 'receber' }
        ];
        
        return todasCategorias.filter(cat => cat.tipo === tipo);
    }

    async getFornecedores() {
        // Simular fornecedores
        return [
            { id: 1, nome: 'ABC Materiais Ltda' },
            { id: 2, nome: 'Companhia Elétrica SP' }
        ];
    }

    async getClientes() {
        // Simular clientes
        return [
            { id: 1, nome: 'XYZ Consultoria Ltda' },
            { id: 2, nome: 'Comércio ABC Ltda' }
        ];
    }

    async saveNewConta() {
        try {
            const formData = new FormData(document.getElementById('form-nova-conta'));
            const dados = {
                descricao: document.getElementById('conta-descricao').value,
                valor: parseFloat(document.getElementById('conta-valor').value),
                vencimento: document.getElementById('conta-vencimento').value,
                categoria_id: document.getElementById('conta-categoria').value,
                fornecedor_cliente_id: document.getElementById('conta-fornecedor-cliente').value,
                observacoes: document.getElementById('conta-observacoes').value,
                tipo: this.modalType
            };

            console.log('Salvando conta:', dados);
            
            // Aqui será implementada a chamada para a API
            this.showSuccess('Conta cadastrada com sucesso!');
            
            // Recarregar dados da tab atual
            if (this.modalType === 'pagar') {
                await this.loadContasPagar();
            } else {
                await this.loadContasReceber();
            }

        } catch (error) {
            console.error('Erro ao salvar conta:', error);
            this.showError('Erro ao salvar conta');
        }
    }

    // === RENDERIZAÇÃO ===
    renderContasTable(tableId, contas, tipo) {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        
        tbody.innerHTML = '';

        contas.forEach(conta => {
            const row = document.createElement('tr');
            
            const fornecedorClienteNome = tipo === 'pagar' ? conta.fornecedor : conta.cliente;
            
            row.innerHTML = `
                <td>${conta.descricao}</td>
                <td>${fornecedorClienteNome || '-'}</td>
                <td>${conta.categoria || '-'}</td>
                <td>${this.formatCurrency(conta.valor)}</td>
                <td>${this.formatDate(conta.vencimento)}</td>
                <td><span class="status-badge status-${conta.status}">${conta.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="app.pagarReceber(${conta.id}, '${tipo}')">
                        ${tipo === 'pagar' ? 'Pagar' : 'Receber'}
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="app.editarConta(${conta.id}, '${tipo}')">
                        Editar
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    // === AÇÕES ===
    async pagarReceber(id, tipo) {
        const acao = tipo === 'pagar' ? 'pagar' : 'receber';
        const valor = prompt(`Valor a ${acao}:`);
        
        if (valor && !isNaN(valor)) {
            try {
                console.log(`${acao.charAt(0).toUpperCase() + acao.slice(1)} conta ID:`, id, 'Valor:', valor);
                this.showSuccess(`Conta ${acao === 'pagar' ? 'paga' : 'recebida'} com sucesso!`);
                
                // Recarregar dados
                if (tipo === 'pagar') {
                    await this.loadContasPagar();
                } else {
                    await this.loadContasReceber();
                }
                
                await this.loadDashboard();
                
            } catch (error) {
                console.error(`Erro ao ${acao} conta:`, error);
                this.showError(`Erro ao ${acao} conta`);
            }
        }
    }

    async editarConta(id, tipo) {
        console.log('Editar conta:', id, tipo);
        this.showInfo('Funcionalidade de edição será implementada em breve');
    }

    // === FILTROS ===
    filterTable(tableId, searchTerm) {
        const table = document.getElementById(tableId);
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            row.style.display = matches ? '' : 'none';
        });
    }

    // === UTILITÁRIOS ===
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }

    // === NOTIFICAÇÕES ===
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        // Implementação básica - pode ser melhorada com biblioteca de toast
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Inicializar aplicação
const app = new SistemaContasApp();
