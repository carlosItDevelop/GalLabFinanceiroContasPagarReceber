
// Classe principal do sistema
class SistemaContasApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.theme = 'dark'; // Modo escuro como padrão
        this.modalType = null; // 'pagar' ou 'receber'
        this.calendar = null;
        this.charts = {};
        this.arquivos = [];
        
        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupTabs();
        this.setupModals();
        this.setupEventListeners();
        this.setupCalendar();
        this.setupFileUpload();
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
            case 'agenda':
                this.loadAgenda();
                break;
            case 'arquivos':
                this.loadArquivos();
                break;
            case 'consolidados':
                await this.loadConsolidados();
                break;
        }
    }

    // === SETUP CALENDÁRIO ===
    setupCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (calendarEl) {
            this.calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                locale: 'pt-br',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,listWeek'
                },
                events: [
                    {
                        title: 'Energia Elétrica',
                        date: '2024-01-15',
                        color: '#dc3545'
                    },
                    {
                        title: 'Consultoria - Receber',
                        date: '2024-01-10',
                        color: '#28a745'
                    }
                ],
                eventClick: (info) => {
                    this.showEventDetails(info.event);
                }
            });
        }
    }

    // === SETUP UPLOAD DE ARQUIVOS ===
    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const uploadBtn = document.getElementById('upload-arquivo');

        if (uploadArea && fileInput) {
            // Drag and drop
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files);
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => fileInput.click());
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

            // Carregar gráficos
            this.loadCharts();

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    }

    // === GRÁFICOS ===
    loadCharts() {
        // Gráfico de Fluxo de Caixa
        const fluxoOptions = {
            series: [{
                name: 'A Receber',
                data: [31000, 28000, 35000, 42000, 38000, 45000]
            }, {
                name: 'A Pagar',
                data: [22000, 25000, 28000, 31000, 29000, 35000]
            }],
            chart: {
                type: 'area',
                height: 350,
                background: 'transparent',
                toolbar: { show: false }
            },
            colors: ['#28a745', '#dc3545'],
            xaxis: {
                categories: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                labels: { style: { colors: 'var(--text-secondary)' } }
            },
            yaxis: {
                labels: { 
                    style: { colors: 'var(--text-secondary)' },
                    formatter: (val) => this.formatCurrency(val)
                }
            },
            legend: {
                labels: { colors: 'var(--text-primary)' }
            },
            grid: {
                borderColor: 'var(--border-color)'
            },
            theme: {
                mode: this.theme
            }
        };

        if (this.charts.fluxo) this.charts.fluxo.destroy();
        this.charts.fluxo = new ApexCharts(document.querySelector("#chart-fluxo-caixa"), fluxoOptions);
        this.charts.fluxo.render();

        // Gráfico de Categorias
        const categoriaOptions = {
            series: [44, 35, 21],
            chart: {
                type: 'donut',
                height: 350,
                background: 'transparent'
            },
            labels: ['Fornecedores', 'Utilidades', 'Escritório'],
            colors: ['#007bff', '#ffc107', '#28a745'],
            legend: {
                labels: { colors: 'var(--text-primary)' }
            },
            theme: {
                mode: this.theme
            }
        };

        if (this.charts.categorias) this.charts.categorias.destroy();
        this.charts.categorias = new ApexCharts(document.querySelector("#chart-categorias"), categoriaOptions);
        this.charts.categorias.render();
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
        const titulo = tipo === 'pagar' ? 'Registrar Pagamento' : 'Registrar Recebimento';
        const labelValor = tipo === 'pagar' ? 'Valor pago:' : 'Valor recebido:';
        const confirmButtonText = tipo === 'pagar' ? 'Confirmar Pagamento' : 'Confirmar Recebimento';
        
        const { value: formValues } = await Swal.fire({
            title: titulo,
            html: `
                <div class="swal-form">
                    <div class="swal-form-group">
                        <label for="swal-valor">${labelValor}</label>
                        <input id="swal-valor" type="number" step="0.01" min="0" class="swal2-input" placeholder="0,00" required>
                    </div>
                    <div class="swal-form-group">
                        <label for="swal-data">Data do ${acao}:</label>
                        <input id="swal-data" type="date" class="swal2-input" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="swal-form-group">
                        <label for="swal-observacoes">Observações (opcional):</label>
                        <textarea id="swal-observacoes" class="swal2-textarea" placeholder="Adicione observações sobre este ${acao}..."></textarea>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: confirmButtonText,
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            confirmButtonColor: tipo === 'pagar' ? '#dc3545' : '#28a745',
            preConfirm: () => {
                const valor = document.getElementById('swal-valor').value;
                const data = document.getElementById('swal-data').value;
                const observacoes = document.getElementById('swal-observacoes').value;
                
                if (!valor || isNaN(valor) || parseFloat(valor) <= 0) {
                    Swal.showValidationMessage('Por favor, informe um valor válido');
                    return false;
                }
                
                if (!data) {
                    Swal.showValidationMessage('Por favor, informe a data');
                    return false;
                }
                
                return {
                    valor: parseFloat(valor),
                    data: data,
                    observacoes: observacoes
                };
            }
        });

        if (formValues) {
            try {
                console.log(`${acao.charAt(0).toUpperCase() + acao.slice(1)} conta ID:`, id, 'Dados:', formValues);
                
                // Mostrar modal de confirmação
                const confirmResult = await Swal.fire({
                    title: 'Confirmar operação?',
                    html: `
                        <div class="swal-confirm-details">
                            <p><strong>Valor:</strong> ${this.formatCurrency(formValues.valor)}</p>
                            <p><strong>Data:</strong> ${this.formatDate(formValues.data)}</p>
                            ${formValues.observacoes ? `<p><strong>Observações:</strong> ${formValues.observacoes}</p>` : ''}
                        </div>
                    `,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sim, confirmar',
                    cancelButtonText: 'Cancelar',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    confirmButtonColor: tipo === 'pagar' ? '#dc3545' : '#28a745'
                });

                if (confirmResult.isConfirmed) {
                    // Aqui seria feita a chamada para a API
                    // await this.database.pagarConta(id, formValues.valor, formValues.data) ou receberConta()
                    
                    this.showSuccess(`Conta ${acao === 'pagar' ? 'paga' : 'recebida'} com sucesso!`);
                    
                    // Recarregar dados
                    if (tipo === 'pagar') {
                        await this.loadContasPagar();
                    } else {
                        await this.loadContasReceber();
                    }
                    
                    await this.loadDashboard();
                }
                
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

    // === AGENDA ===
    loadAgenda() {
        if (this.calendar) {
            this.calendar.render();
        }
    }

    showEventDetails(event) {
        Swal.fire({
            title: event.title,
            text: `Data: ${event.start.toLocaleDateString('pt-BR')}`,
            icon: 'info',
            confirmButtonText: 'OK',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });
    }

    // === ARQUIVOS ===
    loadArquivos() {
        this.renderArquivos();
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB
                this.showError('Arquivo muito grande (máx. 10MB)');
                return;
            }

            const arquivo = {
                id: Date.now() + Math.random(),
                name: file.name,
                size: file.size,
                type: file.type,
                uploadDate: new Date()
            };

            this.arquivos.push(arquivo);
            this.showSuccess(`Arquivo "${file.name}" adicionado!`);
        });

        this.renderArquivos();
    }

    renderArquivos() {
        const grid = document.getElementById('arquivos-grid');
        if (!grid) return;

        grid.innerHTML = this.arquivos.map(arquivo => `
            <div class="arquivo-item">
                <div class="arquivo-icon">${this.getFileIcon(arquivo.type)}</div>
                <div class="arquivo-name">${arquivo.name}</div>
                <div class="arquivo-info">
                    ${this.formatFileSize(arquivo.size)} • ${this.formatDate(arquivo.uploadDate)}
                </div>
                <div class="arquivo-actions">
                    <button class="btn btn-sm btn-primary" onclick="app.downloadFile('${arquivo.id}')">
                        📥 Download
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteFile('${arquivo.id}')">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    getFileIcon(type) {
        if (type.includes('pdf')) return '📄';
        if (type.includes('image')) return '🖼️';
        if (type.includes('word')) return '📝';
        if (type.includes('excel')) return '📊';
        return '📎';
    }

    formatFileSize(size) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    downloadFile(id) {
        this.showInfo('Download iniciado!');
    }

    deleteFile(id) {
        Swal.fire({
            title: 'Excluir arquivo?',
            text: 'Esta ação não pode ser desfeita.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        }).then((result) => {
            if (result.isConfirmed) {
                this.arquivos = this.arquivos.filter(arquivo => arquivo.id !== id);
                this.renderArquivos();
                this.showSuccess('Arquivo excluído!');
            }
        });
    }

    // === CONSOLIDADOS ===
    async loadConsolidados() {
        try {
            // Configurar event listeners específicos dos consolidados
            this.setupConsolidadosEventListeners();
            
            // Carregar dados consolidados
            await this.loadConsolidadosData();
            
            // Carregar gráficos dos consolidados
            this.loadConsolidadosCharts();
            
            // Carregar rankings
            this.loadRankings();
            
            // Carregar análises temporais (Fase 2)
            this.loadAnaliseTemporais();
            
            // Configurar exportação (Fase 2)
            this.setupExportacao();
            
        } catch (error) {
            console.error('Erro ao carregar consolidados:', error);
            this.showError('Erro ao carregar dados consolidados');
        }
    }

    setupConsolidadosEventListeners() {
        // Filtro de período
        const filtroPeriodo = document.getElementById('filtro-periodo');
        const dataInicio = document.getElementById('data-inicio-consolidado');
        const dataFim = document.getElementById('data-fim-consolidado');
        const btnAplicar = document.getElementById('aplicar-filtros');

        if (filtroPeriodo) {
            filtroPeriodo.addEventListener('change', () => {
                if (filtroPeriodo.value === 'personalizado') {
                    dataInicio.style.display = 'block';
                    dataFim.style.display = 'block';
                } else {
                    dataInicio.style.display = 'none';
                    dataFim.style.display = 'none';
                }
            });
        }

        if (btnAplicar) {
            btnAplicar.addEventListener('click', async () => {
                await this.loadConsolidadosData();
                this.loadConsolidadosCharts();
                this.loadRankings();
                this.showSuccess('Dados atualizados com sucesso!');
            });
        }
    }

    async loadConsolidadosData() {
        try {
            // Simular dados consolidados (será conectado com API)
            const consolidadosData = {
                totalEntradas: 45000.00,
                totalSaidas: 28000.00,
                saldoLiquido: 17000.00,
                margemLiquida: 37.8,
                variacoes: {
                    entradas: 12.5,
                    saidas: -8.3,
                    saldo: 45.2
                }
            };

            // Atualizar cards
            document.getElementById('total-entradas-consolidado').textContent = this.formatCurrency(consolidadosData.totalEntradas);
            document.getElementById('total-saidas-consolidado').textContent = this.formatCurrency(consolidadosData.totalSaidas);
            document.getElementById('saldo-liquido-consolidado').textContent = this.formatCurrency(consolidadosData.saldoLiquido);
            document.getElementById('margem-liquida').textContent = `${consolidadosData.margemLiquida.toFixed(1)}%`;

            // Atualizar variações
            this.updateVariacao('variacao-entradas', consolidadosData.variacoes.entradas);
            this.updateVariacao('variacao-saidas', consolidadosData.variacoes.saidas);
            this.updateVariacao('variacao-saldo', consolidadosData.variacoes.saldo);

        } catch (error) {
            console.error('Erro ao carregar dados consolidados:', error);
        }
    }

    updateVariacao(elementId, valor) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const sinal = valor >= 0 ? '+' : '';
        const classe = valor > 0 ? 'variacao-positiva' : valor < 0 ? 'variacao-negativa' : 'variacao-neutra';
        
        element.textContent = `${sinal}${valor.toFixed(1)}% vs período anterior`;
        element.className = classe;
    }

    loadConsolidadosCharts() {
        // Gráfico de Fluxo de Caixa
        const fluxoOptions = {
            series: [{
                name: 'Entradas',
                data: [31000, 28000, 35000, 42000, 38000, 45000],
                type: 'column'
            }, {
                name: 'Saídas',
                data: [22000, 25000, 28000, 31000, 29000, 28000],
                type: 'column'
            }, {
                name: 'Saldo Líquido',
                data: [9000, 3000, 7000, 11000, 9000, 17000],
                type: 'line'
            }],
            chart: {
                height: 400,
                background: 'transparent',
                toolbar: { show: false }
            },
            colors: ['#28a745', '#dc3545', '#007bff'],
            xaxis: {
                categories: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                labels: { style: { colors: 'var(--text-secondary)' } }
            },
            yaxis: {
                labels: { 
                    style: { colors: 'var(--text-secondary)' },
                    formatter: (val) => this.formatCurrency(val)
                }
            },
            legend: {
                labels: { colors: 'var(--text-primary)' }
            },
            grid: {
                borderColor: 'var(--border-color)'
            },
            stroke: {
                width: [0, 0, 3]
            },
            theme: {
                mode: this.theme
            },
            tooltip: {
                theme: this.theme
            }
        };

        if (this.charts.fluxoConsolidado) this.charts.fluxoConsolidado.destroy();
        this.charts.fluxoConsolidado = new ApexCharts(document.querySelector("#chart-fluxo-caixa"), fluxoOptions);
        this.charts.fluxoConsolidado.render();

        // Gráfico de Categorias (Pizza)
        const categoriasOptions = {
            series: [35, 25, 20, 15, 5],
            chart: {
                type: 'donut',
                height: 400,
                background: 'transparent'
            },
            labels: ['Fornecedores', 'Utilidades', 'Escritório', 'Serviços', 'Outros'],
            colors: ['#007bff', '#28a745', '#ffc107', '#17a2b8', '#6c757d'],
            legend: {
                labels: { colors: 'var(--text-primary)' },
                position: 'bottom'
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: () => 'R$ 28.000'
                            }
                        }
                    }
                }
            },
            theme: {
                mode: this.theme
            },
            tooltip: {
                theme: this.theme,
                y: {
                    formatter: (val) => this.formatCurrency(val * 280) // Simulação
                }
            }
        };

        if (this.charts.categoriasConsolidado) this.charts.categoriasConsolidado.destroy();
        this.charts.categoriasConsolidado = new ApexCharts(document.querySelector("#chart-categorias"), categoriasOptions);
        this.charts.categoriasConsolidado.render();

        // Gráfico Comparativo Mensal
        const comparativoOptions = {
            series: [{
                name: 'Este Ano',
                data: [31000, 28000, 35000, 42000, 38000, 45000]
            }, {
                name: 'Ano Passado',
                data: [25000, 30000, 28000, 35000, 32000, 38000]
            }],
            chart: {
                type: 'area',
                height: 350,
                background: 'transparent',
                toolbar: { show: false }
            },
            colors: ['#007bff', '#6c757d'],
            xaxis: {
                categories: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                labels: { style: { colors: 'var(--text-secondary)' } }
            },
            yaxis: {
                labels: { 
                    style: { colors: 'var(--text-secondary)' },
                    formatter: (val) => this.formatCurrency(val)
                }
            },
            legend: {
                labels: { colors: 'var(--text-primary)' }
            },
            grid: {
                borderColor: 'var(--border-color)'
            },
            fill: {
                opacity: 0.7
            },
            theme: {
                mode: this.theme
            },
            tooltip: {
                theme: this.theme
            }
        };

        if (this.charts.comparativoMensal) this.charts.comparativoMensal.destroy();
        this.charts.comparativoMensal = new ApexCharts(document.querySelector("#chart-comparativo-mensal"), comparativoOptions);
        this.charts.comparativoMensal.render();
    }

    loadRankings() {
        // Ranking de fornecedores com dados da Fase 2
        const fornecedores = [
            { nome: 'ABC Materiais Ltda', valor: 8500.00, categoria: 'Fornecedores', transacoes: 12, crescimento: 8.5 },
            { nome: 'Companhia Elétrica SP', valor: 6200.00, categoria: 'Utilidades', transacoes: 8, crescimento: 2.1 },
            { nome: 'TechSolutions Corp', valor: 4800.00, categoria: 'Serviços', transacoes: 6, crescimento: 15.3 },
            { nome: 'Office Supply Co', valor: 3200.00, categoria: 'Escritório', transacoes: 15, crescimento: -8.2 },
            { nome: 'Clean Services Ltda', valor: 2800.00, categoria: 'Serviços', transacoes: 4, crescimento: 5.7 }
        ];

        this.renderRanking('ranking-fornecedores', fornecedores);

        // Ranking de clientes com dados da Fase 2
        const clientes = [
            { nome: 'XYZ Consultoria Ltda', valor: 15000.00, categoria: 'Consultoria', transacoes: 6, crescimento: 12.4 },
            { nome: 'Comércio ABC Ltda', valor: 12500.00, categoria: 'Vendas', transacoes: 10, crescimento: 6.8 },
            { nome: 'Digital Solutions Inc', valor: 9800.00, categoria: 'Serviços', transacoes: 8, crescimento: 18.2 },
            { nome: 'Retail Group SA', valor: 7500.00, categoria: 'Vendas', transacoes: 12, crescimento: -3.1 },
            { nome: 'Startup Tech Ltda', valor: 5200.00, categoria: 'Consultoria', transacoes: 4, crescimento: 25.6 }
        ];

        this.renderRanking('ranking-clientes', clientes);
    }

    renderRanking(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = data.map((item, index) => `
            <div class="ranking-item">
                <div class="ranking-item-info">
                    <div class="ranking-posicao">${index + 1}</div>
                    <div>
                        <div class="ranking-nome">${item.nome}</div>
                        <div class="ranking-categoria">${item.categoria}</div>
                        <div class="ranking-detalhes">
                            <small>📊 ${item.transacoes || 0} transações</small>
                            <small>📈 Ticket médio: ${this.formatCurrency((item.valor / (item.transacoes || 1)))}</small>
                        </div>
                    </div>
                </div>
                <div class="ranking-valor-info">
                    <div class="ranking-valor">${this.formatCurrency(item.valor)}</div>
                    <div class="ranking-crescimento ${item.crescimento >= 0 ? 'positivo' : 'negativo'}">
                        ${item.crescimento >= 0 ? '↗️' : '↘️'} ${item.crescimento.toFixed(1)}%
                    </div>
                </div>
            </div>
        `).join('');
    }

    // === FASE 2: ANÁLISES TEMPORAIS ===
    loadAnaliseTemporais() {
        this.loadComparativoAnualMensal();
        this.loadTendencias();
        this.loadSazonalidade();
    }

    loadComparativoAnualMensal() {
        // Dados simulados para comparativo ano vs ano
        const dadosComparativos = {
            anoAtual: {
                meses: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                entradas: [35000, 42000, 38000, 45000, 41000, 47000, 52000, 48000, 51000, 46000, 49000, 55000],
                saidas: [28000, 31000, 29000, 35000, 32000, 38000, 42000, 39000, 41000, 37000, 40000, 44000]
            },
            anoAnterior: {
                entradas: [32000, 38000, 35000, 41000, 37000, 43000, 47000, 44000, 46000, 42000, 45000, 50000],
                saidas: [30000, 33000, 31000, 37000, 34000, 40000, 44000, 41000, 43000, 39000, 42000, 46000]
            }
        };

        this.renderComparativoAnual(dadosComparativos);
    }

    renderComparativoAnual(dados) {
        const container = document.getElementById('analise-comparativo-anual');
        if (!container) return;

        // Calcular crescimento médio
        const crescimentoEntradas = this.calcularCrescimentoMedio(dados.anoAtual.entradas, dados.anoAnterior.entradas);
        const crescimentoSaidas = this.calcularCrescimentoMedio(dados.anoAtual.saidas, dados.anoAnterior.saidas);

        container.innerHTML = `
            <div class="comparativo-resumo">
                <div class="comparativo-card">
                    <h4>📈 Crescimento Entradas</h4>
                    <div class="crescimento-valor ${crescimentoEntradas >= 0 ? 'positivo' : 'negativo'}">
                        ${crescimentoEntradas >= 0 ? '+' : ''}${crescimentoEntradas.toFixed(1)}%
                    </div>
                </div>
                <div class="comparativo-card">
                    <h4>📉 Crescimento Saídas</h4>
                    <div class="crescimento-valor ${crescimentoSaidas >= 0 ? 'negativo' : 'positivo'}">
                        ${crescimentoSaidas >= 0 ? '+' : ''}${crescimentoSaidas.toFixed(1)}%
                    </div>
                </div>
            </div>
        `;
    }

    calcularCrescimentoMedio(atual, anterior) {
        const totalAtual = atual.reduce((sum, val) => sum + val, 0);
        const totalAnterior = anterior.reduce((sum, val) => sum + val, 0);
        return ((totalAtual - totalAnterior) / totalAnterior) * 100;
    }

    loadTendencias() {
        // Análise de tendências dos últimos 6 meses
        const tendencias = {
            entradas: { tendencia: 'crescente', percentual: 8.5, previsao: 58000 },
            saidas: { tendencia: 'estavel', percentual: 2.1, previsao: 45000 },
            categoriaEmAlta: 'Consultorias (+15%)',
            categoriaEmBaixa: 'Escritório (-8%)'
        };

        this.renderTendencias(tendencias);
    }

    renderTendencias(tendencias) {
        const container = document.getElementById('analise-tendencias');
        if (!container) return;

        container.innerHTML = `
            <div class="tendencias-grid">
                <div class="tendencia-item">
                    <div class="tendencia-icon">📈</div>
                    <div class="tendencia-info">
                        <h4>Entradas</h4>
                        <p class="tendencia-status crescente">Tendência Crescente</p>
                        <p class="tendencia-valor">+${tendencias.entradas.percentual}% nos últimos 6 meses</p>
                        <p class="tendencia-previsao">Projeção próximo mês: ${this.formatCurrency(tendencias.entradas.previsao)}</p>
                    </div>
                </div>
                
                <div class="tendencia-item">
                    <div class="tendencia-icon">📊</div>
                    <div class="tendencia-info">
                        <h4>Saídas</h4>
                        <p class="tendencia-status estavel">Tendência Estável</p>
                        <p class="tendencia-valor">+${tendencias.saidas.percentual}% nos últimos 6 meses</p>
                        <p class="tendencia-previsao">Projeção próximo mês: ${this.formatCurrency(tendencias.saidas.previsao)}</p>
                    </div>
                </div>
                
                <div class="tendencia-item">
                    <div class="tendencia-icon">🏆</div>
                    <div class="tendencia-info">
                        <h4>Categoria em Alta</h4>
                        <p class="tendencia-categoria-alta">${tendencias.categoriaEmAlta}</p>
                    </div>
                </div>
                
                <div class="tendencia-item">
                    <div class="tendencia-icon">⚠️</div>
                    <div class="tendencia-info">
                        <h4>Atenção</h4>
                        <p class="tendencia-categoria-baixa">${tendencias.categoriaEmBaixa}</p>
                    </div>
                </div>
            </div>
        `;
    }

    loadSazonalidade() {
        // Análise de sazonalidade baseada nos últimos 2 anos
        const sazonalidade = {
            melhorMes: { nome: 'Dezembro', valor: 55000, motivo: 'Vendas de fim de ano' },
            piorMes: { nome: 'Fevereiro', valor: 35000, motivo: 'Pós-férias' },
            trimestres: [
                { nome: '1º Trimestre', performance: 'Baixa', valor: 38500 },
                { nome: '2º Trimestre', performance: 'Média', valor: 44300 },
                { nome: '3º Trimestre', performance: 'Alta', valor: 50300 },
                { nome: '4º Trimestre', performance: 'Muito Alta', valor: 51600 }
            ]
        };

        this.renderSazonalidade(sazonalidade);
    }

    renderSazonalidade(sazonalidade) {
        const container = document.getElementById('analise-sazonalidade');
        if (!container) return;

        container.innerHTML = `
            <div class="sazonalidade-resumo">
                <div class="sazonalidade-card melhor">
                    <h4>🏅 Melhor Mês</h4>
                    <p class="mes-nome">${sazonalidade.melhorMes.nome}</p>
                    <p class="mes-valor">${this.formatCurrency(sazonalidade.melhorMes.valor)}</p>
                    <p class="mes-motivo">${sazonalidade.melhorMes.motivo}</p>
                </div>
                
                <div class="sazonalidade-card pior">
                    <h4>📉 Menor Mês</h4>
                    <p class="mes-nome">${sazonalidade.piorMes.nome}</p>
                    <p class="mes-valor">${this.formatCurrency(sazonalidade.piorMes.valor)}</p>
                    <p class="mes-motivo">${sazonalidade.piorMes.motivo}</p>
                </div>
            </div>
            
            <div class="trimestres-performance">
                <h4>📊 Performance por Trimestre</h4>
                <div class="trimestres-grid">
                    ${sazonalidade.trimestres.map(trimestre => `
                        <div class="trimestre-item">
                            <h5>${trimestre.nome}</h5>
                            <p class="performance-nivel ${trimestre.performance.toLowerCase().replace(' ', '-')}">${trimestre.performance}</p>
                            <p class="performance-valor">${this.formatCurrency(trimestre.valor)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // === FASE 2: EXPORTAÇÃO DE RELATÓRIOS ===
    setupExportacao() {
        const exportButtons = document.querySelectorAll('.btn-export');
        exportButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const formato = e.target.dataset.formato;
                const tipo = e.target.dataset.tipo;
                this.exportarRelatorio(formato, tipo);
            });
        });
    }

    async exportarRelatorio(formato, tipo) {
        try {
            this.showInfo(`Gerando relatório ${tipo} em formato ${formato.toUpperCase()}...`);
            
            // Simular geração do relatório
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (formato === 'pdf') {
                await this.exportarPDF(tipo);
            } else if (formato === 'excel') {
                await this.exportarExcel(tipo);
            } else if (formato === 'csv') {
                await this.exportarCSV(tipo);
            }
            
            this.showSuccess(`Relatório ${tipo} exportado com sucesso!`);
            
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            this.showError('Erro ao exportar relatório');
        }
    }

    async exportarPDF(tipo) {
        // Simular exportação PDF
        const dadosRelatorio = await this.gerarDadosRelatorio(tipo);
        
        // Em implementação real, usaria jsPDF ou similar
        console.log('Exportando PDF:', { tipo, dados: dadosRelatorio });
        
        // Simular download
        this.downloadFile(`relatorio-${tipo}-${new Date().toISOString().split('T')[0]}.pdf`, 'application/pdf');
    }

    async exportarExcel(tipo) {
        // Simular exportação Excel
        const dadosRelatorio = await this.gerarDadosRelatorio(tipo);
        
        // Em implementação real, usaria SheetJS ou similar
        console.log('Exportando Excel:', { tipo, dados: dadosRelatorio });
        
        // Simular download
        this.downloadFile(`relatorio-${tipo}-${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    async exportarCSV(tipo) {
        // Simular exportação CSV
        const dadosRelatorio = await this.gerarDadosRelatorio(tipo);
        
        // Converter dados para CSV
        const csv = this.convertToCSV(dadosRelatorio);
        
        // Criar e baixar arquivo
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio-${tipo}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async gerarDadosRelatorio(tipo) {
        // Simular geração de dados baseado no tipo
        const dados = {
            consolidado: {
                periodo: 'Dezembro 2024',
                totalEntradas: 45000.00,
                totalSaidas: 28000.00,
                saldoLiquido: 17000.00,
                transacoes: [
                    { data: '2024-12-01', descricao: 'Consultoria ABC', valor: 2500.00, tipo: 'entrada' },
                    { data: '2024-12-02', descricao: 'Energia Elétrica', valor: -450.00, tipo: 'saida' },
                    // ... mais dados
                ]
            },
            fornecedores: {
                ranking: [
                    { nome: 'ABC Materiais Ltda', valor: 8500.00, transacoes: 12 },
                    { nome: 'Companhia Elétrica SP', valor: 6200.00, transacoes: 8 }
                ]
            },
            clientes: {
                ranking: [
                    { nome: 'XYZ Consultoria Ltda', valor: 15000.00, transacoes: 6 },
                    { nome: 'Comércio ABC Ltda', valor: 12500.00, transacoes: 10 }
                ]
            }
        };
        
        return dados[tipo] || dados.consolidado;
    }

    convertToCSV(data) {
        if (!data || !data.transacoes) return '';
        
        const headers = ['Data', 'Descrição', 'Valor', 'Tipo'];
        const csvContent = [
            headers.join(','),
            ...data.transacoes.map(row => [
                row.data,
                `"${row.descricao}"`,
                row.valor,
                row.tipo
            ].join(','))
        ].join('\n');
        
        return csvContent;
    }

    downloadFile(filename, mimeType) {
        // Simular download de arquivo
        console.log(`Baixando arquivo: ${filename} (${mimeType})`);
    }

    // === NOTIFICAÇÕES COM SWEETALERT2 ===
    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            text: message,
            timer: 3000,
            showConfirmButton: false,
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Erro!',
            text: message,
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });
    }

    showInfo(message) {
        Swal.fire({
            icon: 'info',
            title: 'Informação',
            text: message,
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });
    }

    showNotification(message, type) {
        // Implementação básica - pode ser melhorada com biblioteca de toast
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Inicializar aplicação
const app = new SistemaContasApp();
