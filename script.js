// Classe principal do sistema
class SistemaContasApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.theme = 'dark'; // Modo escuro como padrão
        this.modalType = null; // 'pagar' ou 'receber'
        this.calendar = null;
        this.calendarAgenda = null;
        this.charts = {};
        this.arquivos = [];
        this.eventos = [];
        this.eventIdCounter = 1;
        this.notificationIdCounter = 1;
        this.editingEventId = null; // Controle para edição de eventos
        
        // Sistema de Edição de Contas
        this.editingType = null; // 'pagar' ou 'receber'
        this.editingId = null; // ID da conta sendo editada
        
        // Sistema de Logs
        this.logs = [];
        this.logIdCounter = 1;
        this.currentLogPage = 1;
        this.logsPerPage = 10;
        this.filteredLogs = [];
        
        this.init();
    }

    async init() {
        this.setupTheme();
        this.setupTabs();
        this.setupModals();
        this.setupEventListeners();
        this.setupCalendar();
        this.setupAgenda();
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
                await this.loadAgenda();
                break;
            case 'arquivos':
                this.loadArquivos();
                break;
            case 'logs':
                this.loadLogs();
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
        this.setupNovaContaModal();
        this.setupEditarContaModal();
    }

    setupNovaContaModal() {
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

    setupEditarContaModal() {
        const modal = document.getElementById('modal-editar-conta');
        if (!modal) return; // Modal será criado no HTML
        
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const form = document.getElementById('form-editar-conta');
        const fileInput = document.getElementById('edit-arquivo');

        // Fechar modal
        const closeModal = () => {
            modal.classList.remove('active');
            form.reset();
            this.editingType = null;
            this.editingId = null;
            this.updateAttachmentDisplay(null, null);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Handle file attachment
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleAttachmentChange(e);
            });
        }

        // Submit do formulário
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveEditedConta();
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
            // Simular dados dinâmicos do dashboard
            const dashboardData = this.generateDashboardData();

            // Atualizar cards
            document.getElementById('total-pagar').textContent = this.formatCurrency(dashboardData.totalPagar);
            document.getElementById('total-receber').textContent = this.formatCurrency(dashboardData.totalReceber);
            document.getElementById('saldo-projetado').textContent = this.formatCurrency(dashboardData.totalReceber - dashboardData.totalPagar);
            document.getElementById('vencidas-pagar').textContent = `${dashboardData.vencidasPagar} vencidas`;
            document.getElementById('vencidas-receber').textContent = `${dashboardData.vencidasReceber} vencidas`;
            document.getElementById('total-alertas').textContent = dashboardData.alertas;

            // Carregar gráficos com dados dinâmicos
            this.loadDashboardCharts(dashboardData);

            console.log('Dashboard carregado com dados:', dashboardData);

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    }

    generateDashboardData() {
        // Gerar dados realistas e variados para demonstração
        const baseEntradas = [25000, 22000, 35000, 33000, 27000, 45000];
        const baseSaidas = [18000, 16000, 23000, 24000, 24000, 32000];
        
        // Adicionar variação aleatória aos dados base
        const entradas = baseEntradas.map(valor => 
            Math.round(valor + (Math.random() - 0.5) * valor * 0.3)
        );
        const saidas = baseSaidas.map(valor => 
            Math.round(valor + (Math.random() - 0.5) * valor * 0.2)
        );

        const totalPagar = Math.round(15000 + Math.random() * 10000);
        const totalReceber = Math.round(25000 + Math.random() * 15000);

        return {
            totalPagar,
            totalReceber,
            vencidasPagar: Math.floor(Math.random() * 6),
            vencidasReceber: Math.floor(Math.random() * 3),
            alertas: Math.floor(Math.random() * 8) + 1,
            fluxoMensal: {
                categorias: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                entradas,
                saidas
            },
            distribuicaoCategorias: {
                labels: ['Fornecedores', 'Utilidades', 'Escritório', 'Serviços', 'Outros'],
                series: [35, 25, 20, 15, 5],
                colors: ['#007bff', '#28a745', '#ffc107', '#17a2b8', '#6c757d']
            }
        };
    }

    // === GRÁFICOS DO DASHBOARD ===
    loadDashboardCharts(dashboardData) {
        this.loadFluxoCaixaChart(dashboardData.fluxoMensal);
        this.loadCategoriasChart(dashboardData.distribuicaoCategorias);
    }

    loadFluxoCaixaChart(fluxoData) {
        const { categorias, entradas, saidas } = fluxoData;
        
        // Calcular saldo líquido para cada mês
        const saldoLiquido = entradas.map((entrada, index) => entrada - saidas[index]);

        const fluxoOptions = {
            series: [{
                name: 'Entradas',
                type: 'column',
                data: entradas
            }, {
                name: 'Saídas',
                type: 'column',
                data: saidas
            }, {
                name: 'Saldo Líquido',
                type: 'line',
                data: saldoLiquido
            }],
            chart: {
                height: 400,
                background: 'transparent',
                toolbar: { 
                    show: true,
                    tools: {
                        download: true,
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: false
                    }
                },
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                }
            },
            colors: ['#28a745', '#dc3545', '#007bff'],
            plotOptions: {
                bar: {
                    columnWidth: '60%',
                    borderRadius: 4
                }
            },
            stroke: {
                width: [0, 0, 3],
                curve: 'smooth'
            },
            xaxis: {
                categories: categorias,
                labels: { 
                    style: { 
                        colors: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 500
                    }
                }
            },
            yaxis: {
                labels: { 
                    style: { 
                        colors: 'var(--text-secondary)',
                        fontSize: '11px'
                    },
                    formatter: (val) => this.formatCurrency(val)
                }
            },
            legend: {
                labels: { 
                    colors: 'var(--text-primary)',
                    useSeriesColors: false
                },
                position: 'top',
                horizontalAlign: 'right',
                floating: true,
                offsetY: -25,
                offsetX: -5
            },
            grid: {
                borderColor: 'var(--border-color)',
                strokeDashArray: 3,
                opacity: 0.3
            },
            tooltip: {
                theme: this.theme,
                shared: true,
                intersect: false,
                y: {
                    formatter: (val) => this.formatCurrency(val)
                }
            },
            dataLabels: {
                enabled: false
            },
            fill: {
                type: ['solid', 'solid', 'gradient'],
                gradient: {
                    shade: this.theme,
                    type: "vertical",
                    shadeIntensity: 0.3,
                    gradientToColors: undefined,
                    inverseColors: false,
                    opacityFrom: 0.8,
                    opacityTo: 0.1,
                    stops: [0, 100]
                }
            }
        };

        if (this.charts.fluxoDashboard) this.charts.fluxoDashboard.destroy();
        const chartElement = document.querySelector("#chart-fluxo-dashboard");
        if (chartElement) {
            this.charts.fluxoDashboard = new ApexCharts(chartElement, fluxoOptions);
            this.charts.fluxoDashboard.render();
        }

        console.log('Gráfico de fluxo carregado com dados:', fluxoData);
    }

    loadCategoriasChart(categoriaData) {
        const { labels, series, colors } = categoriaData;

        const categoriaOptions = {
            series: series,
            chart: {
                type: 'donut',
                height: 400,
                background: 'transparent',
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    }
                }
            },
            labels: labels,
            colors: colors,
            plotOptions: {
                pie: {
                    donut: {
                        size: '65%',
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '16px',
                                fontWeight: 600,
                                color: 'var(--text-primary)'
                            },
                            value: {
                                show: true,
                                fontSize: '14px',
                                fontWeight: 400,
                                color: 'var(--text-secondary)',
                                formatter: (val) => `${val}%`
                            },
                            total: {
                                show: true,
                                showAlways: false,
                                label: 'Total Gastos',
                                fontSize: '16px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                formatter: () => '100%'
                            }
                        }
                    }
                }
            },
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                floating: false,
                fontSize: '13px',
                fontWeight: 500,
                labels: {
                    colors: 'var(--text-primary)',
                    useSeriesColors: true
                },
                markers: {
                    width: 12,
                    height: 12,
                    strokeWidth: 0,
                    radius: 6
                },
                itemMargin: {
                    horizontal: 15,
                    vertical: 5
                }
            },
            tooltip: {
                theme: this.theme,
                y: {
                    formatter: (val) => `${val}%`
                }
            },
            dataLabels: {
                enabled: true,
                style: {
                    fontSize: '12px',
                    fontWeight: 'bold',
                    colors: ['#fff']
                },
                formatter: (val) => `${Math.round(val)}%`,
                dropShadow: {
                    enabled: true,
                    top: 1,
                    left: 1,
                    blur: 1,
                    color: '#000',
                    opacity: 0.45
                }
            },
            responsive: [{
                breakpoint: 768,
                options: {
                    chart: {
                        height: 300
                    },
                    legend: {
                        fontSize: '11px'
                    }
                }
            }]
        };

        if (this.charts.categoriasDashboard) this.charts.categoriasDashboard.destroy();
        const chartElement = document.querySelector("#chart-categorias-dashboard");
        if (chartElement) {
            this.charts.categoriasDashboard = new ApexCharts(chartElement, categoriaOptions);
            this.charts.categoriasDashboard.render();
        }

        console.log('Gráfico de categorias carregado com dados:', categoriaData);
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
            
            // Adicionar log
            this.addLog(
                'create',
                `Nova conta ${this.modalType === 'pagar' ? 'a pagar' : 'a receber'} criada`,
                `Conta "${dados.descricao}" foi criada no valor de ${this.formatCurrency(dados.valor)}`,
                this.modalType === 'pagar' ? 'contas-pagar' : 'contas-receber',
                dados
            );
            
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
            
            // Ícones para anexo e comentário
            const hasAttachment = conta.arquivo_anexo ? true : false;
            const hasComment = conta.comentario ? true : false;
            
            const attachmentIcon = hasAttachment ? 
                `<span class="action-icon attachment-icon" onclick="app.viewAttachment(${conta.id}, '${tipo}')" title="Ver anexo">📎</span>` : '';
            
            const commentIcon = hasComment ? 
                `<span class="action-icon comment-icon" onclick="app.viewComment(${conta.id}, '${tipo}')" title="Ver comentário">💬</span>` : '';
            
            row.innerHTML = `
                <td>
                    <div class="cell-content">
                        <span class="main-text">${conta.descricao}</span>
                        <div class="cell-icons">
                            ${attachmentIcon}
                            ${commentIcon}
                        </div>
                    </div>
                </td>
                <td>${fornecedorClienteNome || '-'}</td>
                <td>${conta.categoria || '-'}</td>
                <td>${this.formatCurrency(conta.valor)}</td>
                <td>${this.formatDate(conta.vencimento)}</td>
                <td><span class="status-badge status-${conta.status}">${conta.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-success" onclick="app.pagarReceber(${conta.id}, '${tipo}')">
                            ${tipo === 'pagar' ? 'Pagar' : 'Receber'}
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="app.editarConta(${conta.id}, '${tipo}')">
                            ✏️ Editar
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    async viewAttachment(id, tipo) {
        // Simular dados do anexo
        const attachmentData = {
            nome: 'nota_fiscal_123.pdf',
            url: 'uploads/nota_fiscal_123.pdf',
            tamanho: '245 KB'
        };

        await Swal.fire({
            title: '📎 Anexo',
            html: `
                <div class="attachment-viewer">
                    <div class="file-preview">
                        <div class="file-icon-large">${this.getFileIcon(attachmentData.nome)}</div>
                        <div class="file-details">
                            <h4>${attachmentData.nome}</h4>
                            <p>Tamanho: ${attachmentData.tamanho}</p>
                        </div>
                    </div>
                    <div class="attachment-actions">
                        <button class="btn btn-primary" onclick="window.open('${attachmentData.url}', '_blank')">
                            📥 Baixar
                        </button>
                        <button class="btn btn-secondary" onclick="window.open('${attachmentData.url}', '_blank')">
                            👁️ Visualizar
                        </button>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            width: '400px'
        });
    }

    async viewComment(id, tipo) {
        // Simular dados do comentário
        const commentData = {
            comentario: 'Este pagamento deve ser feito com urgência devido ao prazo de vencimento.',
            data_criacao: '2024-01-10',
            usuario: 'Usuário Sistema'
        };

        await Swal.fire({
            title: '💬 Comentário',
            html: `
                <div class="comment-viewer">
                    <div class="comment-content">
                        <p>${commentData.comentario}</p>
                    </div>
                    <div class="comment-meta">
                        <small>
                            📅 ${this.formatDate(commentData.data_criacao)} • 
                            👤 ${commentData.usuario}
                        </small>
                    </div>
                </div>
            `,
            confirmButtonText: 'Fechar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            width: '400px'
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
                    
                    // Adicionar log
                    this.addLog(
                        tipo === 'pagar' ? 'payment' : 'receive',
                        `${tipo === 'pagar' ? 'Pagamento' : 'Recebimento'} realizado`,
                        `Conta ID ${id} foi ${tipo === 'pagar' ? 'paga' : 'recebida'} no valor de ${this.formatCurrency(formValues.valor)}`,
                        tipo === 'pagar' ? 'contas-pagar' : 'contas-receber',
                        {
                            conta_id: id,
                            valor: formValues.valor,
                            data: formValues.data,
                            observacoes: formValues.observacoes
                        }
                    );
                    
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
        try {
            // Simular carregamento dos dados da conta
            const contaData = await this.getContaData(id, tipo);
            
            await this.openEditModal(contaData, tipo);
        } catch (error) {
            console.error('Erro ao carregar dados da conta:', error);
            this.showError('Erro ao carregar dados da conta');
        }
    }

    async getContaData(id, tipo) {
        // Simular dados da conta para edição
        const dados = {
            id: id,
            descricao: tipo === 'pagar' ? 'Energia Elétrica - Janeiro' : 'Consultoria - Janeiro',
            valor_original: tipo === 'pagar' ? 450.00 : 2500.00,
            data_vencimento: '2024-01-15',
            entidade_nome: tipo === 'pagar' ? 'Companhia Elétrica SP' : 'XYZ Consultoria Ltda',
            categoria_nome: tipo === 'pagar' ? 'Utilidades' : 'Consultoria',
            observacoes: 'Observações existentes...',
            comentario: '',
            arquivo_anexo: null,
            nome_arquivo: null
        };
        
        return dados;
    }

    async openEditModal(contaData, tipo) {
        const modal = document.getElementById('modal-editar-conta');
        const title = document.getElementById('modal-edit-title');
        
        // Configurar título e tipo
        title.textContent = `Editar Conta ${tipo === 'pagar' ? 'a Pagar' : 'a Receber'}`;
        this.editingType = tipo;
        this.editingId = contaData.id;
        
        // Preencher campos básicos
        document.getElementById('edit-descricao').value = contaData.descricao || '';
        document.getElementById('edit-valor').value = contaData.valor_original || '';
        document.getElementById('edit-vencimento').value = contaData.data_vencimento || '';
        document.getElementById('edit-observacoes').value = contaData.observacoes || '';
        
        // Limpar campo de novo comentário
        document.getElementById('edit-comentario').value = '';
        
        // Carregar comentários e anexos existentes
        await this.loadComentariosExistentes(tipo, contaData.id);
        await this.loadAnexosExistentes(tipo, contaData.id);
        
        // Carregar dropdown de entidades
        await this.loadEditModalData(tipo);
        
        modal.classList.add('active');
    }

    async loadComentariosExistentes(tipo, contaId) {
        const container = document.getElementById('comentarios-existentes');
        
        // Simular comentários existentes
        const comentarios = [
            {
                id: 1,
                comentario: 'Este pagamento deve ser feito com urgência devido ao prazo.',
                usuario: 'Usuário Sistema',
                created_at: '2024-01-10T10:30:00'
            },
            {
                id: 2,
                comentario: 'Fornecedor confirmou recebimento do pedido.',
                usuario: 'Usuário Sistema',
                created_at: '2024-01-08T14:15:00'
            }
        ];

        if (comentarios.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-style: italic; font-size: 0.8rem;">Nenhum comentário anterior</p>';
            return;
        }

        container.innerHTML = comentarios.map(comentario => `
            <div class="comentario-item">
                <div class="comentario-header">
                    <span>👤 ${comentario.usuario}</span>
                    <span>${this.formatDate(comentario.created_at)} ${this.formatTime(comentario.created_at)}</span>
                </div>
                <div class="comentario-texto">${comentario.comentario}</div>
            </div>
        `).join('');
    }

    async loadAnexosExistentes(tipo, contaId) {
        const container = document.getElementById('anexos-existentes');
        
        // Simular anexos existentes
        const anexos = [
            {
                id: 1,
                nome_arquivo: 'nota_fiscal_123.pdf',
                tamanho_arquivo: 245760,
                tipo_arquivo: 'application/pdf',
                usuario: 'Usuário Sistema',
                created_at: '2024-01-10T10:30:00'
            }
        ];

        if (anexos.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-style: italic; font-size: 0.8rem;">Nenhum anexo anterior</p>';
            return;
        }

        container.innerHTML = anexos.map(anexo => `
            <div class="anexo-item">
                <div class="anexo-icon">${this.getFileIcon(anexo.tipo_arquivo)}</div>
                <div class="anexo-info">
                    <div class="anexo-nome">${anexo.nome_arquivo}</div>
                    <div class="anexo-meta">
                        ${this.formatFileSize(anexo.tamanho_arquivo)} • 
                        ${this.formatDate(anexo.created_at)} • 
                        ${anexo.usuario}
                    </div>
                </div>
                <div class="anexo-acoes">
                    <button class="btn btn-sm btn-primary btn-anexo" onclick="app.downloadAnexo(${anexo.id})">
                        📥
                    </button>
                    <button class="btn btn-sm btn-secondary btn-anexo" onclick="app.viewAnexo(${anexo.id})">
                        👁️
                    </button>
                </div>
            </div>
        `).join('');
    }

    downloadAnexo(anexoId) {
        console.log('Download anexo:', anexoId);
        this.showInfo('Download iniciado!');
    }

    viewAnexo(anexoId) {
        console.log('Visualizar anexo:', anexoId);
        this.showInfo('Abrindo anexo...');
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

    // === MÉTODOS PARA MODAL DE EDIÇÃO ===
    async loadEditModalData(tipo) {
        try {
            // Carregar entidades (fornecedores ou clientes)
            const entidades = tipo === 'pagar' ? await this.getFornecedores() : await this.getClientes();
            const selectEntidade = document.getElementById('edit-entidade');
            selectEntidade.innerHTML = '<option value="">Selecione</option>';
            
            entidades.forEach(entidade => {
                const option = document.createElement('option');
                option.value = entidade.id;
                option.textContent = entidade.nome;
                selectEntidade.appendChild(option);
            });

            // Carregar categorias
            const categorias = await this.getCategorias(tipo);
            const selectCategoria = document.getElementById('edit-categoria');
            selectCategoria.innerHTML = '<option value="">Selecione uma categoria</option>';
            
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nome;
                selectCategoria.appendChild(option);
            });

        } catch (error) {
            console.error('Erro ao carregar dados do modal:', error);
        }
    }

    async saveEditedConta() {
        try {
            const dados = {
                id: this.editingId,
                descricao: document.getElementById('edit-descricao').value,
                valor_original: parseFloat(document.getElementById('edit-valor').value),
                data_vencimento: document.getElementById('edit-vencimento').value,
                entidade_id: document.getElementById('edit-entidade').value,
                categoria_id: document.getElementById('edit-categoria').value,
                observacoes: document.getElementById('edit-observacoes').value
            };

            // Atualizar conta principal
            console.log('Salvando conta editada:', dados);
            
            // Salvar novo comentário se foi adicionado
            const novoComentario = document.getElementById('edit-comentario').value.trim();
            if (novoComentario) {
                await this.salvarComentario(this.editingType, this.editingId, novoComentario);
            }

            // Salvar novo anexo se foi adicionado
            const fileInput = document.getElementById('edit-arquivo');
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                await this.salvarAnexo(this.editingType, this.editingId, file);
            }
            
            this.showSuccess('Conta atualizada com sucesso!');
            
            // Adicionar log
            this.addLog(
                'update',
                `Conta ${this.editingType === 'pagar' ? 'a pagar' : 'a receber'} editada`,
                `Conta "${dados.descricao}" foi editada`,
                this.editingType === 'pagar' ? 'contas-pagar' : 'contas-receber',
                dados
            );
            
            // Recarregar dados
            if (this.editingType === 'pagar') {
                await this.loadContasPagar();
            } else {
                await this.loadContasReceber();
            }

        } catch (error) {
            console.error('Erro ao salvar conta editada:', error);
            this.showError('Erro ao salvar alterações');
        }
    }

    async salvarComentario(tipo, contaId, comentario) {
        try {
            // Simular salvamento do comentário
            console.log(`Salvando comentário para ${tipo}:`, { contaId, comentario });
            
            this.addLog(
                'create',
                'Comentário adicionado',
                `Novo comentário adicionado à conta`,
                tipo === 'pagar' ? 'contas-pagar' : 'contas-receber',
                { conta_id: contaId, comentario }
            );
        } catch (error) {
            console.error('Erro ao salvar comentário:', error);
            throw error;
        }
    }

    async salvarAnexo(tipo, contaId, arquivo) {
        try {
            if (arquivo.size > 10 * 1024 * 1024) { // 10MB
                throw new Error('Arquivo muito grande (máx. 10MB)');
            }

            const dadosArquivo = {
                nome: arquivo.name,
                caminho: `uploads/${Date.now()}_${arquivo.name}`,
                tamanho: arquivo.size,
                tipo: arquivo.type
            };

            // Simular upload e salvamento
            console.log(`Salvando anexo para ${tipo}:`, { contaId, dadosArquivo });
            
            this.addLog(
                'create',
                'Anexo adicionado',
                `Arquivo "${arquivo.name}" anexado à conta`,
                tipo === 'pagar' ? 'contas-pagar' : 'contas-receber',
                { conta_id: contaId, arquivo: dadosArquivo }
            );
        } catch (error) {
            console.error('Erro ao salvar anexo:', error);
            throw error;
        }
    }

    async processFileUpload(file) {
        // Simular upload do arquivo
        return new Promise((resolve) => {
            setTimeout(() => {
                const fileUrl = `uploads/${Date.now()}_${file.name}`;
                resolve(fileUrl);
            }, 1000);
        });
    }

    updateAttachmentDisplay(fileName, fileUrl) {
        const attachmentInfo = document.getElementById('attachment-info');
        const attachmentPreview = document.getElementById('attachment-preview');
        
        if (fileName && fileUrl) {
            attachmentInfo.style.display = 'block';
            attachmentPreview.innerHTML = `
                <div class="attached-file">
                    <span class="file-icon">${this.getFileIcon(fileName)}</span>
                    <span class="file-name">${fileName}</span>
                    <button type="button" class="btn-remove-attachment" onclick="app.removeAttachment()">
                        <span>&times;</span>
                    </button>
                </div>
            `;
        } else {
            attachmentInfo.style.display = 'none';
            attachmentPreview.innerHTML = '';
        }
    }

    removeAttachment() {
        document.getElementById('edit-arquivo').value = '';
        this.updateAttachmentDisplay(null, null);
    }

    handleAttachmentChange(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB
                this.showError('Arquivo muito grande (máx. 10MB)');
                event.target.value = '';
                return;
            }
            this.updateAttachmentDisplay(file.name, URL.createObjectURL(file));
        }
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

    // === AGENDA COMPLETA ===
    setupAgenda() {
        this.setupAgendaEventListeners();
        this.setupDragAndDrop();
        this.setupAgendaNotifications();
        this.generateSampleEvents();
    }

    setupAgendaEventListeners() {
        // Botão novo evento
        const novoEventoBtn = document.getElementById('novo-evento');
        if (novoEventoBtn) {
            novoEventoBtn.addEventListener('click', () => this.openEventModal());
        }

        // Botão sincronizar vencimentos
        const sincronizarBtn = document.getElementById('sincronizar-vencimentos');
        if (sincronizarBtn) {
            sincronizarBtn.addEventListener('click', () => this.sincronizarVencimentos());
        }

        // Ações rápidas
        this.setupAcoesRapidas();

        // Filtros do calendário
        this.setupCalendarFilters();

        // Views do calendário
        this.setupCalendarViews();

        // Modal de eventos
        this.setupEventModal();
    }

    setupAcoesRapidas() {
        const acoes = [
            { id: 'agendar-vencimentos-semana', action: () => this.agendarVencimentosSemana() },
            { id: 'agendar-cobrancas-atraso', action: () => this.agendarCobrancasAtraso() },
            { id: 'agendar-followup-clientes', action: () => this.agendarFollowupClientes() },
            { id: 'lembretes-importantes', action: () => this.mostrarLembretesImportantes() }
        ];

        acoes.forEach(acao => {
            const btn = document.getElementById(acao.id);
            if (btn) {
                btn.addEventListener('click', acao.action);
            }
        });
    }

    setupCalendarFilters() {
        const filtroTipo = document.getElementById('filtro-tipo-evento');
        const filtroPrioridade = document.getElementById('filtro-prioridade');
        const limparFiltros = document.getElementById('limpar-filtros');

        if (filtroTipo) {
            filtroTipo.addEventListener('change', () => this.aplicarFiltrosCalendario());
        }

        if (filtroPrioridade) {
            filtroPrioridade.addEventListener('change', () => this.aplicarFiltrosCalendario());
        }

        if (limparFiltros) {
            limparFiltros.addEventListener('click', () => {
                filtroTipo.value = '';
                filtroPrioridade.value = '';
                this.aplicarFiltrosCalendario();
            });
        }
    }

    setupCalendarViews() {
        const viewBtns = document.querySelectorAll('[data-view]');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (this.calendarAgenda) {
                    this.calendarAgenda.changeView(view);
                }
                
                // Update active button
                viewBtns.forEach(b => b.classList.remove('btn-primary'));
                btn.classList.add('btn-primary');
            });
        });
    }

    setupEventModal() {
        const modal = document.getElementById('modal-novo-evento');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const form = document.getElementById('form-novo-evento');
        const recorrenteCheckbox = document.getElementById('evento-recorrente');
        const recorrenciaOptions = document.getElementById('recorrencia-options');

        // Fechar modal
        const closeModal = () => {
            modal.classList.remove('active');
            form.reset();
            recorrenciaOptions.style.display = 'none';
            // Limpar controle de edição
            this.editingEventId = null;
            document.getElementById('modal-evento-title').textContent = 'Novo Evento';
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Mostrar/ocultar opções de recorrência
        recorrenteCheckbox.addEventListener('change', () => {
            recorrenciaOptions.style.display = recorrenteCheckbox.checked ? 'block' : 'none';
        });

        // Submit do formulário
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveNewEvent();
            closeModal();
        });
    }

    setupDragAndDrop() {
        const predefinicoes = document.querySelectorAll('.predefinicao-item');
        
        predefinicoes.forEach(item => {
            // Configurar draggable
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.tipo);
                e.dataTransfer.setData('application/json', JSON.stringify({
                    tipo: item.dataset.tipo,
                    titulo: item.querySelector('strong').textContent
                }));
                item.classList.add('dragging');
                
                // Definir dados para o FullCalendar
                e.dataTransfer.effectAllowed = 'copy';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });
    }

    setupAgendaNotifications() {
        // Verificar eventos próximos a cada minuto
        setInterval(() => {
            this.checkUpcomingEvents();
        }, 60000);

        // Verificação inicial
        setTimeout(() => {
            this.checkUpcomingEvents();
        }, 2000);
    }

    async loadAgenda() {
        try {
            // Inicializar calendário da agenda
            this.initCalendarAgenda();
            
            // Carregar dados
            await this.loadEventos();
            this.updateAgendaStats();
            this.loadProximosEventos();
            
            console.log('Agenda carregada com sucesso!');
        } catch (error) {
            console.error('Erro ao carregar agenda:', error);
        }
    }

    initCalendarAgenda() {
        const calendarEl = document.getElementById('calendar-agenda');
        if (!calendarEl) return;

        this.calendarAgenda = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            headerToolbar: {
                left: 'title',
                center: '',
                right: 'today prev,next'
            },
            height: 'auto',
            events: this.eventos,
            eventClick: (info) => {
                this.showEventDetails(info.event);
            },
            dateClick: (info) => {
                this.openEventModal(info.dateStr);
            },
            eventDrop: (info) => {
                this.updateEventDate(info.event, info.event.start);
            },
            editable: true,
            droppable: true,
            dropAccept: '.predefinicao-item',
            drop: (info) => {
                const draggedEl = info.draggedEl;
                const tipo = draggedEl.dataset.tipo;
                const date = info.date;
                
                // Remover classes de drag
                draggedEl.classList.remove('dragging');
                
                // Criar evento
                this.createEventFromDrop(tipo, date);
            },
            dragover: (info) => {
                // Permitir drop
                info.jsEvent.preventDefault();
            },
            eventDidMount: (info) => {
                // Adicionar classes CSS baseadas no tipo e prioridade
                const tipo = info.event.extendedProps.tipo;
                const prioridade = info.event.extendedProps.prioridade;
                
                if (tipo) {
                    info.el.classList.add(`evento-${tipo}`);
                }
                if (prioridade) {
                    info.el.classList.add(`prioridade-${prioridade}`);
                }
            },
            // Configuração adicional para external dragging
            dayMaxEvents: true,
            moreLinkClick: 'popover'
        });

        this.calendarAgenda.render();
        
        // Configurar container como drop zone
        this.setupCalendarDropZone();
    }

    generateSampleEvents() {
        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(hoje.getDate() + 1);
        
        const proximaSemana = new Date(hoje);
        proximaSemana.setDate(hoje.getDate() + 7);

        this.eventos = [
            {
                id: 'evento-1',
                title: '💸 Energia Elétrica - Vencimento',
                start: amanha.toISOString().split('T')[0] + 'T09:00:00',
                end: amanha.toISOString().split('T')[0] + 'T09:30:00',
                extendedProps: {
                    tipo: 'vencimento-pagar',
                    prioridade: 'alta',
                    valor: 450.00,
                    participantes: 'Financeiro',
                    descricao: 'Pagamento da conta de energia elétrica'
                }
            },
            {
                id: 'evento-2',
                title: '🤝 Reunião - XYZ Consultoria',
                start: proximaSemana.toISOString().split('T')[0] + 'T14:00:00',
                end: proximaSemana.toISOString().split('T')[0] + 'T15:00:00',
                extendedProps: {
                    tipo: 'reuniao-cliente',
                    prioridade: 'media',
                    participantes: 'João Silva, Maria Santos',
                    local: 'Presencial - Escritório',
                    descricao: 'Discussão sobre novo projeto'
                }
            },
            {
                id: 'evento-3',
                title: '📞 Cobrança - Comércio ABC',
                start: hoje.toISOString().split('T')[0] + 'T16:00:00',
                end: hoje.toISOString().split('T')[0] + 'T16:15:00',
                extendedProps: {
                    tipo: 'cobranca',
                    prioridade: 'alta',
                    valor: 1800.00,
                    participantes: 'Gerente Financeiro',
                    descricao: 'Cobrança de fatura em atraso'
                }
            }
        ];
    }

    async loadEventos() {
        // Carregar eventos do banco de dados ou localStorage para persistência
        try {
            const eventosStorage = localStorage.getItem('agenda_eventos');
            if (eventosStorage) {
                this.eventos = JSON.parse(eventosStorage);
            }
            
            if (this.calendarAgenda) {
                this.calendarAgenda.removeAllEvents();
                this.eventos.forEach(evento => {
                    this.calendarAgenda.addEvent(evento);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
        }
    }

    openEventModal(date = null) {
        const modal = document.getElementById('modal-novo-evento');
        const dataInput = document.getElementById('evento-data');
        
        if (date) {
            dataInput.value = date;
        } else {
            dataInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Definir hora padrão
        document.getElementById('evento-hora').value = '09:00';
        
        modal.classList.add('active');
    }

    async saveNewEvent() {
        try {
            const formData = this.getEventFormData();
            
            if (!this.validateEventData(formData)) {
                return;
            }

            // Verificar se é edição ou criação
            const isEditing = this.editingEventId;
            
            if (isEditing) {
                // Atualizar evento existente
                const eventoIndex = this.eventos.findIndex(e => e.id === this.editingEventId);
                if (eventoIndex !== -1) {
                    const evento = this.createEventObject(formData);
                    evento.id = this.editingEventId; // Manter o ID original
                    
                    // Atualizar no array
                    this.eventos[eventoIndex] = evento;
                    
                    // Atualizar no calendário
                    if (this.calendarAgenda) {
                        const calendarEvent = this.calendarAgenda.getEventById(this.editingEventId);
                        if (calendarEvent) {
                            calendarEvent.remove();
                            this.calendarAgenda.addEvent(evento);
                        }
                    }
                    
                    this.showSuccess('Evento atualizado com sucesso!');
                }
                this.editingEventId = null;
            } else {
                // Criar novo evento
                const evento = this.createEventObject(formData);
                
                // Adicionar ao array de eventos
                this.eventos.push(evento);
                
                // Adicionar ao calendário
                if (this.calendarAgenda) {
                    this.calendarAgenda.addEvent(evento);
                }
                
                this.showSuccess('Evento criado com sucesso!');
                
                // Adicionar log
                this.addLog(
                    'create',
                    'Novo evento agendado',
                    `Evento "${formData.titulo}" criado na agenda para ${this.formatDate(formData.data)}`,
                    'agenda',
                    formData
                );
            }
            
            // Salvar no localStorage para persistência
            this.saveEventosToStorage();
            
            // Atualizar estatísticas
            this.updateAgendaStats();
            this.loadProximosEventos();
            
        } catch (error) {
            console.error('Erro ao salvar evento:', error);
            this.showError('Erro ao salvar evento');
        }
    }

    getEventFormData() {
        return {
            titulo: document.getElementById('evento-titulo').value,
            tipo: document.getElementById('evento-tipo').value,
            data: document.getElementById('evento-data').value,
            hora: document.getElementById('evento-hora').value,
            duracao: parseInt(document.getElementById('evento-duracao').value),
            prioridade: document.getElementById('evento-prioridade').value,
            participantes: document.getElementById('evento-participantes').value,
            local: document.getElementById('evento-local').value,
            valor: parseFloat(document.getElementById('evento-valor').value) || 0,
            lembrete: parseInt(document.getElementById('evento-lembrete').value),
            descricao: document.getElementById('evento-descricao').value,
            recorrente: document.getElementById('evento-recorrente').checked,
            frequencia: document.getElementById('evento-frequencia').value
        };
    }

    validateEventData(data) {
        if (!data.titulo.trim()) {
            this.showError('Título é obrigatório');
            return false;
        }
        if (!data.tipo) {
            this.showError('Tipo do evento é obrigatório');
            return false;
        }
        if (!data.data) {
            this.showError('Data é obrigatória');
            return false;
        }
        if (!data.hora) {
            this.showError('Hora é obrigatória');
            return false;
        }
        return true;
    }

    createEventObject(data) {
        const startDateTime = new Date(`${data.data}T${data.hora}:00`);
        const endDateTime = new Date(startDateTime.getTime() + (data.duracao * 60000));
        
        const tipoIcons = {
            'vencimento-pagar': '💸',
            'vencimento-receber': '💰',
            'reuniao-cliente': '🤝',
            'cobranca': '📞',
            'revisao-fluxo': '📊',
            'negociacao': '🎯',
            'reuniao-interna': '👥',
            'lembrete': '⏰'
        };

        return {
            id: `evento-${this.eventIdCounter++}`,
            title: `${tipoIcons[data.tipo] || '📅'} ${data.titulo}`,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            extendedProps: {
                tipo: data.tipo,
                prioridade: data.prioridade,
                participantes: data.participantes,
                local: data.local,
                valor: data.valor,
                lembrete: data.lembrete,
                descricao: data.descricao,
                recorrente: data.recorrente,
                frequencia: data.frequencia
            }
        };
    }

    setupCalendarDropZone() {
        const calendarEl = document.getElementById('calendar-agenda');
        if (!calendarEl) return;
        
        // Adicionar eventos de drag para o calendário
        calendarEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            
            // Adicionar feedback visual
            const dayEl = e.target.closest('.fc-day, .fc-timegrid-slot');
            if (dayEl) {
                dayEl.classList.add('drag-over');
            }
        });
        
        calendarEl.addEventListener('dragleave', (e) => {
            // Remover feedback visual
            const dayEl = e.target.closest('.fc-day, .fc-timegrid-slot');
            if (dayEl) {
                dayEl.classList.remove('drag-over');
            }
        });
        
        calendarEl.addEventListener('drop', (e) => {
            e.preventDefault();
            
            // Remover feedback visual
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
            
            // Obter dados do drag
            const tipo = e.dataTransfer.getData('text/plain');
            if (!tipo) return;
            
            // Calcular data baseada na posição do drop
            const dayEl = e.target.closest('.fc-day');
            if (dayEl) {
                const dateStr = dayEl.dataset.date;
                if (dateStr) {
                    const date = new Date(dateStr + 'T12:00:00');
                    this.createEventFromDrop(tipo, date);
                }
            }
        });
    }

    createEventFromDrop(tipo, date) {
        const tipoInfo = {
            'vencimento-pagar': { titulo: 'Vencimento a Pagar', duracao: 30, cor: '#dc3545', icone: '💸' },
            'vencimento-receber': { titulo: 'Vencimento a Receber', duracao: 30, cor: '#28a745', icone: '💰' },
            'reuniao-cliente': { titulo: 'Reunião com Cliente', duracao: 60, cor: '#17a2b8', icone: '🤝' },
            'cobranca': { titulo: 'Cobrança', duracao: 15, cor: '#ffc107', icone: '📞' },
            'revisao-fluxo': { titulo: 'Revisão de Fluxo', duracao: 60, cor: '#6f42c1', icone: '📊' },
            'negociacao': { titulo: 'Negociação', duracao: 90, cor: '#fd7e14', icone: '🎯' },
            'reuniao-interna': { titulo: 'Reunião Interna', duracao: 60, cor: '#6c757d', icone: '👥' },
            'lembrete': { titulo: 'Lembrete', duracao: 15, cor: '#20c997', icone: '⏰' }
        };

        const info = tipoInfo[tipo];
        if (!info) {
            console.error('Tipo de evento não reconhecido:', tipo);
            return;
        }

        // Definir hora padrão baseada no tipo
        const hora = tipo.includes('cobranca') ? '16:00' : 
                    tipo.includes('reuniao') ? '14:00' : '09:00';

        // Garantir que a data seja um objeto Date válido
        let targetDate;
        if (date instanceof Date) {
            targetDate = date;
        } else {
            targetDate = new Date(date);
        }

        // Verificar se a data é válida
        if (isNaN(targetDate.getTime())) {
            console.error('Data inválida para criar evento:', date);
            return;
        }

        const formData = {
            titulo: info.titulo,
            tipo: tipo,
            data: targetDate.toISOString().split('T')[0],
            hora: hora,
            duracao: info.duracao,
            prioridade: tipo.includes('vencimento') ? 'alta' : 'media',
            participantes: '',
            local: '',
            valor: 0,
            lembrete: 15,
            descricao: `${info.titulo} criado por arrastar e soltar`,
            recorrente: false,
            frequencia: 'weekly'
        };

        try {
            const evento = this.createEventObject(formData);
            
            // Adicionar cor específica do tipo
            evento.backgroundColor = info.cor;
            evento.borderColor = info.cor;
            
            this.eventos.push(evento);
            
            if (this.calendarAgenda) {
                this.calendarAgenda.addEvent(evento);
            }
            
            // Salvar no localStorage para persistência
            this.saveEventosToStorage();
            
            this.updateAgendaStats();
            this.loadProximosEventos();
            
            this.showSuccess(`${info.icone} ${info.titulo} agendado para ${this.formatDate(targetDate)}!`);
        } catch (error) {
            console.error('Erro ao criar evento do drop:', error);
            this.showError('Erro ao criar evento. Tente novamente.');
        }
    }

    // Método para salvar eventos no localStorage
    saveEventosToStorage() {
        try {
            localStorage.setItem('agenda_eventos', JSON.stringify(this.eventos));
        } catch (error) {
            console.error('Erro ao salvar eventos no storage:', error);
        }
    }

    updateEventDate(event, newDate) {
        // Atualizar evento no array
        const eventoIndex = this.eventos.findIndex(e => e.id === event.id);
        if (eventoIndex !== -1) {
            this.eventos[eventoIndex].start = newDate.toISOString();
        }
        
        this.showSuccess('Evento movido com sucesso!');
    }

    showEventDetails(event) {
        const props = event.extendedProps;
        
        Swal.fire({
            title: event.title,
            html: `
                <div class="event-details">
                    <p><strong>📅 Data:</strong> ${event.start.toLocaleDateString('pt-BR')}</p>
                    <p><strong>🕐 Horário:</strong> ${event.start.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} - ${event.end.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</p>
                    ${props.prioridade ? `<p><strong>⚡ Prioridade:</strong> ${props.prioridade.charAt(0).toUpperCase() + props.prioridade.slice(1)}</p>` : ''}
                    ${props.participantes ? `<p><strong>👥 Participantes:</strong> ${props.participantes}</p>` : ''}
                    ${props.local ? `<p><strong>📍 Local:</strong> ${props.local}</p>` : ''}
                    ${props.valor > 0 ? `<p><strong>💰 Valor:</strong> ${this.formatCurrency(props.valor)}</p>` : ''}
                    ${props.descricao ? `<p><strong>📝 Descrição:</strong> ${props.descricao}</p>` : ''}
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '✏️ Editar',
            cancelButtonText: '🗑️ Excluir',
            showDenyButton: true,
            denyButtonText: '✅ Fechar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        }).then((result) => {
            if (result.isConfirmed) {
                this.editEvent(event);
            } else if (result.isDismissed && result.dismiss === 'cancel') {
                this.deleteEvent(event);
            }
        });
    }

    async editEvent(event) {
        // Preencher modal com dados do evento
        const props = event.extendedProps;
        
        // Definir que estamos editando um evento específico
        this.editingEventId = event.id;
        
        document.getElementById('evento-titulo').value = event.title.replace(/^[^\s]+\s/, ''); // Remove emoji
        document.getElementById('evento-tipo').value = props.tipo || '';
        document.getElementById('evento-data').value = event.start.toISOString().split('T')[0];
        document.getElementById('evento-hora').value = event.start.toTimeString().split(':').slice(0,2).join(':');
        document.getElementById('evento-duracao').value = props.duracao || 60;
        document.getElementById('evento-prioridade').value = props.prioridade || 'media';
        document.getElementById('evento-participantes').value = props.participantes || '';
        document.getElementById('evento-local').value = props.local || '';
        document.getElementById('evento-valor').value = props.valor || '';
        document.getElementById('evento-lembrete').value = props.lembrete || 15;
        document.getElementById('evento-descricao').value = props.descricao || '';
        
        // Abrir modal em modo edição
        const modal = document.getElementById('modal-novo-evento');
        document.getElementById('modal-evento-title').textContent = 'Editar Evento';
        modal.classList.add('active');
    }

    deleteEvent(event) {
        Swal.fire({
            title: 'Excluir evento?',
            text: 'Esta ação não pode ser desfeita.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        }).then((result) => {
            if (result.isConfirmed) {
                // Remover do calendário
                event.remove();
                
                // Remover do array
                this.eventos = this.eventos.filter(e => e.id !== event.id);
                
                // Salvar no localStorage após exclusão
                this.saveEventosToStorage();
                
                this.updateAgendaStats();
                this.loadProximosEventos();
                
                this.showSuccess('Evento excluído com sucesso!');
            }
        });
    }

    aplicarFiltrosCalendario() {
        const filtroTipo = document.getElementById('filtro-tipo-evento')?.value;
        const filtroPrioridade = document.getElementById('filtro-prioridade')?.value;
        
        if (!this.calendarAgenda) return;
        
        // Remover todos os eventos
        this.calendarAgenda.removeAllEvents();
        
        // Filtrar eventos
        const eventosFiltrados = this.eventos.filter(evento => {
            const tipoMatch = !filtroTipo || evento.extendedProps.tipo === filtroTipo;
            const prioridadeMatch = !filtroPrioridade || evento.extendedProps.prioridade === filtroPrioridade;
            
            return tipoMatch && prioridadeMatch;
        });
        
        // Adicionar eventos filtrados
        eventosFiltrados.forEach(evento => {
            this.calendarAgenda.addEvent(evento);
        });
    }

    updateAgendaStats() {
        const hoje = new Date();
        const fimSemana = new Date(hoje);
        fimSemana.setDate(hoje.getDate() + 7);
        
        const eventosHoje = this.eventos.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate.toDateString() === hoje.toDateString();
        }).length;
        
        const eventosSemana = this.eventos.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate >= hoje && eventDate <= fimSemana;
        }).length;
        
        const vencimentosProximos = this.eventos.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate >= hoje && eventDate <= fimSemana && 
                   (e.extendedProps.tipo === 'vencimento-pagar' || e.extendedProps.tipo === 'vencimento-receber');
        }).length;
        
        const eventosAtrasados = this.eventos.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate < hoje;
        }).length;
        
        // Atualizar interface
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateStat('eventos-hoje', eventosHoje);
        updateStat('eventos-semana', eventosSemana);
        updateStat('vencimentos-proximos', vencimentosProximos);
        updateStat('eventos-atrasados', eventosAtrasados);
    }

    loadProximosEventos() {
        const container = document.getElementById('proximos-eventos-lista');
        if (!container) return;
        
        const hoje = new Date();
        const proximos = this.eventos
            .filter(e => new Date(e.start) >= hoje)
            .sort((a, b) => new Date(a.start) - new Date(b.start))
            .slice(0, 5);
        
        container.innerHTML = proximos.map(evento => {
            const data = new Date(evento.start);
            const prioridade = evento.extendedProps.prioridade || 'media';
            
            return `
                <div class="proximo-evento prioridade-${prioridade}">
                    <div class="evento-titulo">${evento.title}</div>
                    <div class="evento-horario">
                        ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Ações Rápidas
    agendarVencimentosSemana() {
        const hoje = new Date();
        const fimSemana = new Date(hoje);
        fimSemana.setDate(hoje.getDate() + 7);
        
        // Simular vencimentos da semana
        const vencimentos = [
            { titulo: 'Energia Elétrica', valor: 450.00, data: new Date(hoje.getTime() + 2*24*60*60*1000) },
            { titulo: 'Internet', valor: 120.00, data: new Date(hoje.getTime() + 4*24*60*60*1000) },
            { titulo: 'Aluguel', valor: 2500.00, data: new Date(hoje.getTime() + 6*24*60*60*1000) }
        ];
        
        vencimentos.forEach(v => {
            const evento = {
                id: `venc-${this.eventIdCounter++}`,
                title: `💸 ${v.titulo} - Vencimento`,
                start: v.data.toISOString().split('T')[0] + 'T09:00:00',
                end: v.data.toISOString().split('T')[0] + 'T09:30:00',
                extendedProps: {
                    tipo: 'vencimento-pagar',
                    prioridade: 'alta',
                    valor: v.valor,
                    descricao: `Vencimento: ${v.titulo}`
                }
            };
            
            this.eventos.push(evento);
            if (this.calendarAgenda) {
                this.calendarAgenda.addEvent(evento);
            }
        });
        
        this.updateAgendaStats();
        this.loadProximosEventos();
        this.showSuccess(`${vencimentos.length} vencimentos agendados para a semana!`);
    }

    agendarCobrancasAtraso() {
        const clientesAtraso = ['Comércio ABC Ltda', 'Tech Solutions Inc'];
        const hoje = new Date();
        
        clientesAtraso.forEach((cliente, index) => {
            const dataCobranca = new Date(hoje);
            dataCobranca.setDate(hoje.getDate() + index + 1);
            
            const evento = {
                id: `cobranca-${this.eventIdCounter++}`,
                title: `📞 Cobrança - ${cliente}`,
                start: dataCobranca.toISOString().split('T')[0] + 'T16:00:00',
                end: dataCobranca.toISOString().split('T')[0] + 'T16:15:00',
                extendedProps: {
                    tipo: 'cobranca',
                    prioridade: 'alta',
                    participantes: cliente,
                    descricao: `Cobrança de valores em atraso - ${cliente}`
                }
            };
            
            this.eventos.push(evento);
            if (this.calendarAgenda) {
                this.calendarAgenda.addEvent(evento);
            }
        });
        
        this.updateAgendaStats();
        this.loadProximosEventos();
        this.showSuccess(`${clientesAtraso.length} cobranças agendadas!`);
    }

    agendarFollowupClientes() {
        const clientes = ['XYZ Consultoria Ltda', 'Digital Solutions Inc'];
        const hoje = new Date();
        
        clientes.forEach((cliente, index) => {
            const dataFollowup = new Date(hoje);
            dataFollowup.setDate(hoje.getDate() + (index + 1) * 3);
            
            const evento = {
                id: `followup-${this.eventIdCounter++}`,
                title: `🤝 Follow-up - ${cliente}`,
                start: dataFollowup.toISOString().split('T')[0] + 'T14:00:00',
                end: dataFollowup.toISOString().split('T')[0] + 'T15:00:00',
                extendedProps: {
                    tipo: 'reuniao-cliente',
                    prioridade: 'media',
                    participantes: cliente,
                    descricao: `Follow-up comercial com ${cliente}`
                }
            };
            
            this.eventos.push(evento);
            if (this.calendarAgenda) {
                this.calendarAgenda.addEvent(evento);
            }
        });
        
        this.updateAgendaStats();
        this.loadProximosEventos();
        this.showSuccess(`${clientes.length} follow-ups agendados!`);
    }

    mostrarLembretesImportantes() {
        Swal.fire({
            title: '⚡ Lembretes Importantes',
            html: `
                <div class="lembretes-importantes">
                    <div class="lembrete-item">
                        <strong>📊 Revisão Mensal de Fluxo</strong>
                        <p>Analisar performance financeira do mês</p>
                        <div class="lembrete-opcoes">
                            <select id="revisao-mensal-data" class="data-select">
                                <option value="proxima-segunda">Próxima Segunda</option>
                                <option value="proxima-sexta">Próxima Sexta</option>
                                <option value="fim-mes">Final do Mês</option>
                                <option value="personalizado">Data Personalizada</option>
                            </select>
                            <button class="btn btn-sm btn-primary" onclick="app.agendarLembrete('revisao-mensal')">Agendar</button>
                        </div>
                    </div>
                    
                    <div class="lembrete-item">
                        <strong>📈 Relatório Gerencial</strong>
                        <p>Preparar relatório para diretoria</p>
                        <div class="lembrete-opcoes">
                            <select id="relatorio-gerencial-data" class="data-select">
                                <option value="proxima-segunda">Próxima Segunda</option>
                                <option value="proxima-quinta">Próxima Quinta</option>
                                <option value="fim-mes">Final do Mês</option>
                                <option value="personalizado">Data Personalizada</option>
                            </select>
                            <button class="btn btn-sm btn-primary" onclick="app.agendarLembrete('relatorio-gerencial')">Agendar</button>
                        </div>
                    </div>
                    
                    <div class="lembrete-item">
                        <strong>🎯 Revisão de Metas</strong>
                        <p>Avaliar cumprimento de metas financeiras</p>
                        <div class="lembrete-opcoes">
                            <select id="revisao-metas-data" class="data-select">
                                <option value="proxima-terca">Próxima Terça</option>
                                <option value="meio-mes">Meio do Mês</option>
                                <option value="fim-mes">Final do Mês</option>
                                <option value="personalizado">Data Personalizada</option>
                            </select>
                            <button class="btn btn-sm btn-primary" onclick="app.agendarLembrete('revisao-metas')">Agendar</button>
                        </div>
                    </div>
                    
                    <div class="lembrete-item">
                        <strong>💰 Fechamento Financeiro</strong>
                        <p>Reconciliação de contas e balanço mensal</p>
                        <div class="lembrete-opcoes">
                            <select id="fechamento-financeiro-data" class="data-select">
                                <option value="ultimo-dia-mes">Último Dia do Mês</option>
                                <option value="primeiro-dia-mes">Primeiro Dia do Próximo Mês</option>
                                <option value="personalizado">Data Personalizada</option>
                            </select>
                            <button class="btn btn-sm btn-primary" onclick="app.agendarLembrete('fechamento-financeiro')">Agendar</button>
                        </div>
                    </div>
                    
                    <div class="lembrete-item">
                        <strong>📋 Backup de Dados</strong>
                        <p>Backup de segurança do sistema financeiro</p>
                        <div class="lembrete-opcoes">
                            <select id="backup-dados-data" class="data-select">
                                <option value="toda-sexta">Toda Sexta-feira</option>
                                <option value="quinzenal">Quinzenal</option>
                                <option value="mensal">Mensal</option>
                                <option value="personalizado">Data Personalizada</option>
                            </select>
                            <button class="btn btn-sm btn-primary" onclick="app.agendarLembrete('backup-dados')">Agendar</button>
                        </div>
                    </div>
                    
                    <div class="lembrete-item">
                        <strong>🔍 Auditoria de Processos</strong>
                        <p>Revisão de procedimentos e controles internos</p>
                        <div class="lembrete-opcoes">
                            <select id="auditoria-processos-data" class="data-select">
                                <option value="trimestral">Trimestral</option>
                                <option value="semestral">Semestral</option>
                                <option value="personalizado">Data Personalizada</option>
                            </select>
                            <button class="btn btn-sm btn-primary" onclick="app.agendarLembrete('auditoria-processos')">Agendar</button>
                        </div>
                    </div>
                </div>
                
                <div class="lembretes-acao-rapida">
                    <hr style="margin: 1.5rem 0; border-color: var(--border-color);">
                    <h4>🚀 Ação Rápida</h4>
                    <p>Agendar todos os lembretes essenciais para este mês:</p>
                    <button class="btn btn-primary" onclick="app.agendarTodosLembretes()">
                        ⚡ Agendar Todos os Essenciais
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            width: '700px'
        });
    }

    agendarLembrete(tipo) {
        const lembretes = {
            'revisao-mensal': { 
                titulo: 'Revisão Mensal de Fluxo', 
                duracao: 120, 
                icone: '📊',
                descricao: 'Análise completa da performance financeira mensal'
            },
            'relatorio-gerencial': { 
                titulo: 'Relatório Gerencial', 
                duracao: 90, 
                icone: '📈',
                descricao: 'Preparação do relatório executivo para diretoria'
            },
            'revisao-metas': { 
                titulo: 'Revisão de Metas', 
                duracao: 60, 
                icone: '🎯',
                descricao: 'Avaliação do cumprimento de objetivos financeiros'
            },
            'fechamento-financeiro': { 
                titulo: 'Fechamento Financeiro', 
                duracao: 180, 
                icone: '💰',
                descricao: 'Reconciliação de contas e fechamento do período'
            },
            'backup-dados': { 
                titulo: 'Backup de Dados', 
                duracao: 30, 
                icone: '📋',
                descricao: 'Backup de segurança do sistema financeiro'
            },
            'auditoria-processos': { 
                titulo: 'Auditoria de Processos', 
                duracao: 240, 
                icone: '🔍',
                descricao: 'Revisão de procedimentos e controles internos'
            }
        };
        
        const lembrete = lembretes[tipo];
        if (!lembrete) return;
        
        // Obter a opção de data selecionada
        const selectElement = document.getElementById(`${tipo}-data`);
        const opcaoData = selectElement ? selectElement.value : 'proxima-segunda';
        
        const dataEvento = this.calcularDataLembrete(opcaoData, tipo);
        const horaEvento = this.obterHorarioLembrete(tipo);
        
        const evento = {
            id: `lembrete-${this.eventIdCounter++}`,
            title: `${lembrete.icone} ${lembrete.titulo}`,
            start: dataEvento.toISOString().split('T')[0] + `T${horaEvento}:00`,
            end: new Date(dataEvento.getTime() + lembrete.duracao * 60000).toISOString(),
            extendedProps: {
                tipo: 'lembrete',
                prioridade: this.obterPrioridadeLembrete(tipo),
                descricao: lembrete.descricao,
                categoria: 'Gestão Financeira',
                recorrente: this.isRecorrente(opcaoData),
                frequencia: this.getFrequenciaRecorrencia(opcaoData)
            }
        };
        
        this.eventos.push(evento);
        if (this.calendarAgenda) {
            this.calendarAgenda.addEvent(evento);
        }
        
        // Salvar no localStorage para persistência
        this.saveEventosToStorage();
        
        this.updateAgendaStats();
        this.loadProximosEventos();
        
        // Adicionar log
        this.addLog(
            'create',
            `Lembrete importante agendado`,
            `${lembrete.titulo} foi agendado para ${this.formatDate(dataEvento)} às ${horaEvento}`,
            'agenda',
            {
                tipo: tipo,
                data: dataEvento,
                duracao: lembrete.duracao,
                opcao_data: opcaoData
            }
        );
        
        Swal.close();
        this.showSuccess(`${lembrete.icone} ${lembrete.titulo} agendado para ${this.formatDate(dataEvento)} às ${horaEvento}!`);
    }

    calcularDataLembrete(opcaoData, tipo) {
        const hoje = new Date();
        let dataCalculada = new Date();
        
        switch (opcaoData) {
            case 'proxima-segunda':
                dataCalculada.setDate(hoje.getDate() + (8 - hoje.getDay()) % 7);
                break;
            case 'proxima-terca':
                const diasParaTerca = (2 - hoje.getDay() + 7) % 7;
                dataCalculada.setDate(hoje.getDate() + (diasParaTerca === 0 ? 7 : diasParaTerca));
                break;
            case 'proxima-quinta':
                const diasParaQuinta = (4 - hoje.getDay() + 7) % 7;
                dataCalculada.setDate(hoje.getDate() + (diasParaQuinta === 0 ? 7 : diasParaQuinta));
                break;
            case 'proxima-sexta':
                const diasParaSexta = (5 - hoje.getDay() + 7) % 7;
                dataCalculada.setDate(hoje.getDate() + (diasParaSexta === 0 ? 7 : diasParaSexta));
                break;
            case 'meio-mes':
                dataCalculada = new Date(hoje.getFullYear(), hoje.getMonth(), 15);
                if (dataCalculada <= hoje) {
                    dataCalculada = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 15);
                }
                break;
            case 'fim-mes':
                dataCalculada = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); // Último dia do mês
                break;
            case 'ultimo-dia-mes':
                dataCalculada = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                break;
            case 'primeiro-dia-mes':
                dataCalculada = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
                break;
            case 'toda-sexta':
                const diasParaProximaSexta = (5 - hoje.getDay() + 7) % 7;
                dataCalculada.setDate(hoje.getDate() + (diasParaProximaSexta === 0 ? 7 : diasParaProximaSexta));
                break;
            case 'quinzenal':
                dataCalculada.setDate(hoje.getDate() + 14);
                break;
            case 'mensal':
                dataCalculada.setMonth(hoje.getMonth() + 1);
                break;
            case 'trimestral':
                dataCalculada.setMonth(hoje.getMonth() + 3);
                break;
            case 'semestral':
                dataCalculada.setMonth(hoje.getMonth() + 6);
                break;
            default:
                // Próxima segunda como padrão
                dataCalculada.setDate(hoje.getDate() + (8 - hoje.getDay()) % 7);
        }
        
        return dataCalculada;
    }

    obterHorarioLembrete(tipo) {
        const horarios = {
            'revisao-mensal': '10:00',
            'relatorio-gerencial': '09:00',
            'revisao-metas': '14:00',
            'fechamento-financeiro': '08:00',
            'backup-dados': '18:00',
            'auditoria-processos': '09:00'
        };
        
        return horarios[tipo] || '10:00';
    }

    obterPrioridadeLembrete(tipo) {
        const prioridades = {
            'revisao-mensal': 'alta',
            'relatorio-gerencial': 'alta',
            'revisao-metas': 'media',
            'fechamento-financeiro': 'alta',
            'backup-dados': 'media',
            'auditoria-processos': 'alta'
        };
        
        return prioridades[tipo] || 'media';
    }

    isRecorrente(opcaoData) {
        const recorrentes = ['toda-sexta', 'quinzenal', 'mensal', 'trimestral', 'semestral'];
        return recorrentes.includes(opcaoData);
    }

    getFrequenciaRecorrencia(opcaoData) {
        const frequencias = {
            'toda-sexta': 'weekly',
            'quinzenal': 'bi-weekly',
            'mensal': 'monthly',
            'trimestral': 'quarterly',
            'semestral': 'bi-annually'
        };
        
        return frequencias[opcaoData] || 'none';
    }

    agendarTodosLembretes() {
        const lembretesEssenciais = [
            { tipo: 'revisao-mensal', opcao: 'proxima-sexta' },
            { tipo: 'relatorio-gerencial', opcao: 'proxima-quinta' },
            { tipo: 'fechamento-financeiro', opcao: 'ultimo-dia-mes' },
            { tipo: 'backup-dados', opcao: 'toda-sexta' }
        ];
        
        let contadorAgendados = 0;
        
        lembretesEssenciais.forEach(item => {
            // Simular seleção da opção
            const selectElement = document.getElementById(`${item.tipo}-data`);
            if (selectElement) {
                selectElement.value = item.opcao;
                this.agendarLembrete(item.tipo);
                contadorAgendados++;
            }
        });
        
        Swal.close();
        this.showSuccess(`🚀 ${contadorAgendados} lembretes essenciais agendados com sucesso!`);
        
        // Adicionar log resumo
        this.addLog(
            'create',
            'Agendamento em lote de lembretes',
            `${contadorAgendados} lembretes essenciais foram agendados automaticamente`,
            'agenda',
            { lembretes_agendados: contadorAgendados, tipos: lembretesEssenciais.map(l => l.tipo) }
        );
    }

    sincronizarVencimentos() {
        Swal.fire({
            title: 'Sincronizar Vencimentos',
            text: 'Importar vencimentos de contas a pagar e receber para a agenda?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, sincronizar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        }).then((result) => {
            if (result.isConfirmed) {
                // Simular sincronização
                const vencimentosImportados = 5;
                this.showSuccess(`${vencimentosImportados} vencimentos importados com sucesso!`);
            }
        });
    }

    checkUpcomingEvents() {
        const agora = new Date();
        const em15min = new Date(agora.getTime() + 15 * 60000);
        
        const eventosProximos = this.eventos.filter(evento => {
            const inicio = new Date(evento.start);
            const lembrete = evento.extendedProps.lembrete || 15;
            const tempoLembrete = new Date(inicio.getTime() - lembrete * 60000);
            
            return tempoLembrete <= agora && inicio > agora;
        });
        
        eventosProximos.forEach(evento => {
            this.showAgendaNotification(evento);
        });
    }

    showAgendaNotification(evento) {
        const container = document.getElementById('agenda-notifications');
        if (!container) return;
        
        const inicio = new Date(evento.start);
        const tempoRestante = Math.round((inicio - new Date()) / 60000);
        
        const notification = document.createElement('div');
        notification.className = 'agenda-notification';
        if (evento.extendedProps.prioridade === 'alta') {
            notification.classList.add('urgente');
        }
        
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">🔔 ${evento.title}</div>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-content">
                Início em ${tempoRestante} minutos
                ${evento.extendedProps.local ? `<br>📍 ${evento.extendedProps.local}` : ''}
            </div>
            <div class="notification-time">
                ${inicio.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
            </div>
        `;
        
        // Fechar notificação
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Clicar para ver detalhes
        notification.addEventListener('click', () => {
            if (this.calendarAgenda) {
                const calendarEvent = this.calendarAgenda.getEventById(evento.id);
                if (calendarEvent) {
                    this.showEventDetails(calendarEvent);
                }
            }
            notification.remove();
        });
        
        container.appendChild(notification);
        
        // Auto-remover após 30 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 30000);
    }

    showEventDetails(event) {
        const props = event.extendedProps;
        
        Swal.fire({
            title: event.title,
            html: `
                <div class="event-details" style="text-align: left;">
                    <p><strong>📅 Data:</strong> ${event.start.toLocaleDateString('pt-BR')}</p>
                    <p><strong>🕐 Horário:</strong> ${event.start.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} - ${event.end.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</p>
                    ${props.prioridade ? `<p><strong>⚡ Prioridade:</strong> ${props.prioridade.charAt(0).toUpperCase() + props.prioridade.slice(1)}</p>` : ''}
                    ${props.participantes ? `<p><strong>👥 Participantes:</strong> ${props.participantes}</p>` : ''}
                    ${props.local ? `<p><strong>📍 Local:</strong> ${props.local}</p>` : ''}
                    ${props.valor > 0 ? `<p><strong>💰 Valor:</strong> ${this.formatCurrency(props.valor)}</p>` : ''}
                    ${props.descricao ? `<p><strong>📝 Descrição:</strong> ${props.descricao}</p>` : ''}
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '✏️ Editar',
            cancelButtonText: '🗑️ Excluir',
            showDenyButton: true,
            denyButtonText: '✅ Fechar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        }).then((result) => {
            if (result.isConfirmed) {
                this.editEvent(event);
            } else if (result.isDismissed && result.dismiss === 'cancel') {
                this.deleteEvent(event);
            }
        });
    }

    // === SISTEMA DE LOGS ===
    loadLogs() {
        this.setupLogsEventListeners();
        this.generateSampleLogs();
        this.applyLogsFilters();
    }

    setupLogsEventListeners() {
        // Filtros
        const aplicarFiltros = document.getElementById('aplicar-filtros-logs');
        const limparFiltros = document.getElementById('limpar-filtros-logs');
        
        if (aplicarFiltros) {
            aplicarFiltros.addEventListener('click', () => this.applyLogsFilters());
        }
        
        if (limparFiltros) {
            limparFiltros.addEventListener('click', () => this.clearLogsFilters());
        }

        // Busca em tempo real
        const buscaInput = document.getElementById('filtro-busca-logs');
        if (buscaInput) {
            buscaInput.addEventListener('input', () => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.applyLogsFilters();
                }, 300);
            });
        }

        // Paginação
        const anteriorBtn = document.getElementById('logs-anterior');
        const proximoBtn = document.getElementById('logs-proximo');
        
        if (anteriorBtn) {
            anteriorBtn.addEventListener('click', () => this.previousLogsPage());
        }
        
        if (proximoBtn) {
            proximoBtn.addEventListener('click', () => this.nextLogsPage());
        }

        // Ações dos botões
        const exportBtn = document.getElementById('export-logs');
        const clearBtn = document.getElementById('clear-logs');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLogs());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllLogs());
        }

        // Modal de detalhes
        this.setupLogDetailsModal();
    }

    setupLogDetailsModal() {
        const modal = document.getElementById('modal-detalhes-log');
        const closeBtn = modal.querySelector('.modal-close');
        const fecharBtn = document.getElementById('modal-log-fechar');
        const exportarBtn = document.getElementById('modal-log-exportar');

        const closeModal = () => {
            modal.classList.remove('active');
        };

        closeBtn.addEventListener('click', closeModal);
        fecharBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        exportarBtn.addEventListener('click', () => {
            this.exportSingleLog(this.currentLogDetail);
            closeModal();
        });
    }

    generateSampleLogs() {
        const now = new Date();
        const sampleLogs = [
            {
                id: 'LOG_001',
                tipo: 'create',
                titulo: 'Nova conta a pagar criada',
                descricao: 'Conta "Energia Elétrica - Janeiro" foi criada no valor de R$ 450,00',
                modulo: 'contas-pagar',
                usuario: 'Usuário Sistema',
                timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 horas atrás
                ip: '192.168.1.100',
                sessao: 'SES_12345',
                dados: {
                    conta: {
                        descricao: 'Energia Elétrica - Janeiro',
                        valor: 450.00,
                        vencimento: '2024-01-15',
                        fornecedor: 'Companhia Elétrica SP'
                    }
                }
            },
            {
                id: 'LOG_002',
                tipo: 'payment',
                titulo: 'Pagamento realizado',
                descricao: 'Conta "Material Escritório" foi paga no valor de R$ 230,50',
                modulo: 'contas-pagar',
                usuario: 'Usuário Sistema',
                timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 horas atrás
                ip: '192.168.1.100',
                sessao: 'SES_12345',
                dados: {
                    pagamento: {
                        conta_id: 2,
                        valor_pago: 230.50,
                        data_pagamento: '2024-01-12',
                        metodo: 'Transferência bancária'
                    }
                }
            },
            {
                id: 'LOG_003',
                tipo: 'receive',
                titulo: 'Recebimento registrado',
                descricao: 'Recebimento da consultoria XYZ no valor de R$ 2.500,00',
                modulo: 'contas-receber',
                usuario: 'Usuário Sistema',
                timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 horas atrás
                ip: '192.168.1.100',
                sessao: 'SES_12345',
                dados: {
                    recebimento: {
                        conta_id: 1,
                        valor_recebido: 2500.00,
                        data_recebimento: '2024-01-10',
                        cliente: 'XYZ Consultoria Ltda'
                    }
                }
            },
            {
                id: 'LOG_004',
                tipo: 'export',
                titulo: 'Relatório exportado',
                descricao: 'Relatório consolidado exportado em formato PDF',
                modulo: 'consolidados',
                usuario: 'Usuário Sistema',
                timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000), // 8 horas atrás
                ip: '192.168.1.100',
                sessao: 'SES_12345',
                dados: {
                    exportacao: {
                        tipo: 'consolidado',
                        formato: 'PDF',
                        periodo: 'Dezembro 2024',
                        tamanho: '1.2 MB'
                    }
                }
            },
            {
                id: 'LOG_005',
                tipo: 'create',
                titulo: 'Evento agendado',
                descricao: 'Novo evento "Reunião com Cliente XYZ" criado na agenda',
                modulo: 'agenda',
                usuario: 'Usuário Sistema',
                timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000), // 10 horas atrás
                ip: '192.168.1.100',
                sessao: 'SES_12345',
                dados: {
                    evento: {
                        titulo: 'Reunião com Cliente XYZ',
                        data: '2024-01-15',
                        hora: '14:00',
                        tipo: 'reuniao-cliente'
                    }
                }
            },
            {
                id: 'LOG_006',
                tipo: 'update',
                titulo: 'Conta editada',
                descricao: 'Conta "Internet - Janeiro" teve o valor alterado de R$ 100,00 para R$ 120,00',
                modulo: 'contas-pagar',
                usuario: 'Usuário Sistema',
                timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 horas atrás
                ip: '192.168.1.100',
                sessao: 'SES_12345',
                dados: {
                    alteracao: {
                        campo: 'valor',
                        valor_anterior: 100.00,
                        valor_novo: 120.00,
                        conta_id: 3
                    }
                }
            },
            {
                id: 'LOG_007',
                tipo: 'delete',
                titulo: 'Arquivo removido',
                descricao: 'Arquivo "nota_fiscal_123.pdf" foi excluído do sistema',
                modulo: 'arquivos',
                usuario: 'Usuário Sistema',
                timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 dia atrás
                ip: '192.168.1.100',
                sessao: 'SES_12345',
                dados: {
                    arquivo: {
                        nome: 'nota_fiscal_123.pdf',
                        tamanho: '245 KB',
                        tipo: 'application/pdf'
                    }
                }
            },
            {
                id: 'LOG_008',
                tipo: 'login',
                titulo: 'Login realizado',
                descricao: 'Usuário realizou login no sistema',
                modulo: 'sistema',
                usuario: 'Usuário Sistema',
                timestamp: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 1 dia e 1 hora atrás
                ip: '192.168.1.100',
                sessao: 'SES_12345',
                dados: {
                    login: {
                        metodo: 'username_password',
                        navegador: 'Chrome 120.0',
                        dispositivo: 'Desktop'
                    }
                }
            },
            {
                id: 'LOG_009',
                tipo: 'system',
                titulo: 'Backup automático',
                descricao: 'Backup automático do banco de dados realizado com sucesso',
                modulo: 'sistema',
                usuario: 'Sistema Automático',
                timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 dias atrás
                ip: '127.0.0.1',
                sessao: 'SYS_AUTO',
                dados: {
                    backup: {
                        tamanho: '15.8 MB',
                        duracao: '2.3 segundos',
                        tabelas: 8,
                        registros: 1247
                    }
                }
            },
            {
                id: 'LOG_010',
                tipo: 'import',
                titulo: 'Dados importados',
                descricao: 'Planilha de contas importada com 15 novos registros',
                modulo: 'contas-pagar',
                usuario: 'Usuário Sistema',
                timestamp: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 3 dias atrás
                ip: '192.168.1.100',
                sessao: 'SES_12345',
                dados: {
                    importacao: {
                        arquivo: 'contas_janeiro.xlsx',
                        registros_importados: 15,
                        registros_erro: 0,
                        tamanho: '32 KB'
                    }
                }
            }
        ];

        this.logs = sampleLogs;
        this.filteredLogs = [...this.logs];
    }

    applyLogsFilters() {
        const dataInicio = document.getElementById('filtro-data-inicio-logs')?.value;
        const dataFim = document.getElementById('filtro-data-fim-logs')?.value;
        const tipo = document.getElementById('filtro-tipo-logs')?.value;
        const modulo = document.getElementById('filtro-modulo-logs')?.value;
        const busca = document.getElementById('filtro-busca-logs')?.value?.toLowerCase();

        this.filteredLogs = this.logs.filter(log => {
            // Filtro por data
            if (dataInicio) {
                const dataInicioDate = new Date(dataInicio);
                if (log.timestamp < dataInicioDate) return false;
            }
            
            if (dataFim) {
                const dataFimDate = new Date(dataFim + 'T23:59:59');
                if (log.timestamp > dataFimDate) return false;
            }

            // Filtro por tipo
            if (tipo && log.tipo !== tipo) return false;

            // Filtro por módulo
            if (modulo && log.modulo !== modulo) return false;

            // Filtro por busca
            if (busca) {
                const searchString = `${log.titulo} ${log.descricao} ${log.usuario}`.toLowerCase();
                if (!searchString.includes(busca)) return false;
            }

            return true;
        });

        // Ordenar por timestamp (mais recente primeiro)
        this.filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Reset página atual
        this.currentLogPage = 1;

        this.renderLogs();
        this.renderLogsPagination();
    }

    clearLogsFilters() {
        document.getElementById('filtro-data-inicio-logs').value = '';
        document.getElementById('filtro-data-fim-logs').value = '';
        document.getElementById('filtro-tipo-logs').value = '';
        document.getElementById('filtro-modulo-logs').value = '';
        document.getElementById('filtro-busca-logs').value = '';
        
        this.applyLogsFilters();
    }

    renderLogs() {
        const container = document.getElementById('logs-list');
        if (!container) return;

        const startIndex = (this.currentLogPage - 1) * this.logsPerPage;
        const endIndex = startIndex + this.logsPerPage;
        const pageData = this.filteredLogs.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            container.innerHTML = `
                <div class="logs-empty">
                    <h3>📋 Nenhum log encontrado</h3>
                    <p>Não há logs que correspondam aos filtros aplicados. Tente ajustar os critérios de busca.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pageData.map(log => `
            <div class="log-item ${log.tipo}" onclick="app.showLogDetails('${log.id}')">
                <div class="log-icon">${this.getLogIcon(log.tipo)}</div>
                <div class="log-content">
                    <div class="log-title">
                        ${log.titulo}
                        <span class="log-tipo-badge ${log.tipo}">${this.getLogTypeLabel(log.tipo)}</span>
                    </div>
                    <div class="log-description">${log.descricao}</div>
                    <div class="log-meta">
                        <div class="log-meta-item">
                            <span>👤</span>
                            <span>${log.usuario}</span>
                        </div>
                        <div class="log-meta-item">
                            <span>📍</span>
                            <span>${this.getModuleLabel(log.modulo)}</span>
                        </div>
                        <div class="log-meta-item">
                            <span>🌐</span>
                            <span>${log.ip}</span>
                        </div>
                    </div>
                </div>
                <div class="log-timestamp">
                    <div class="log-date">${this.formatDate(log.timestamp)}</div>
                    <div class="log-time">${this.formatTime(log.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    renderLogsPagination() {
        const totalPages = Math.ceil(this.filteredLogs.length / this.logsPerPage);
        const startIndex = (this.currentLogPage - 1) * this.logsPerPage;
        const endIndex = Math.min(startIndex + this.logsPerPage, this.filteredLogs.length);

        // Atualizar informações
        const infoElement = document.getElementById('logs-info');
        if (infoElement) {
            infoElement.textContent = `Mostrando ${startIndex + 1}-${endIndex} de ${this.filteredLogs.length} registros`;
        }

        // Atualizar botões anterior/próximo
        const anteriorBtn = document.getElementById('logs-anterior');
        const proximoBtn = document.getElementById('logs-proximo');
        
        if (anteriorBtn) {
            anteriorBtn.disabled = this.currentLogPage === 1;
        }
        
        if (proximoBtn) {
            proximoBtn.disabled = this.currentLogPage === totalPages || totalPages === 0;
        }

        // Gerar páginas
        const pagesContainer = document.getElementById('logs-pages');
        if (pagesContainer) {
            pagesContainer.innerHTML = this.generatePaginationPages(totalPages);
        }
    }

    generatePaginationPages(totalPages) {
        if (totalPages <= 1) return '';

        const pages = [];
        const current = this.currentLogPage;
        const delta = 2; // Quantas páginas mostrar ao redor da atual

        // Primeira página
        if (current > delta + 1) {
            pages.push(1);
            if (current > delta + 2) {
                pages.push('...');
            }
        }

        // Páginas ao redor da atual
        const start = Math.max(1, current - delta);
        const end = Math.min(totalPages, current + delta);
        
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // Última página
        if (current < totalPages - delta) {
            if (current < totalPages - delta - 1) {
                pages.push('...');
            }
            pages.push(totalPages);
        }

        return pages.map(page => {
            if (page === '...') {
                return '<span class="pagination-page disabled">...</span>';
            }
            
            const isActive = page === current ? 'active' : '';
            return `<span class="pagination-page ${isActive}" onclick="app.goToLogPage(${page})">${page}</span>`;
        }).join('');
    }

    goToLogPage(page) {
        this.currentLogPage = page;
        this.renderLogs();
        this.renderLogsPagination();
    }

    previousLogsPage() {
        if (this.currentLogPage > 1) {
            this.currentLogPage--;
            this.renderLogs();
            this.renderLogsPagination();
        }
    }

    nextLogsPage() {
        const totalPages = Math.ceil(this.filteredLogs.length / this.logsPerPage);
        if (this.currentLogPage < totalPages) {
            this.currentLogPage++;
            this.renderLogs();
            this.renderLogsPagination();
        }
    }

    showLogDetails(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;

        this.currentLogDetail = log;

        // Preencher modal
        document.getElementById('modal-log-icon').textContent = this.getLogIcon(log.tipo);
        document.getElementById('modal-log-titulo').textContent = log.titulo;
        document.getElementById('modal-log-tipo').textContent = this.getLogTypeLabel(log.tipo);
        document.getElementById('modal-log-data').textContent = this.formatDate(log.timestamp);
        document.getElementById('modal-log-hora').textContent = this.formatTime(log.timestamp);
        document.getElementById('modal-log-descricao').textContent = log.descricao;
        document.getElementById('modal-log-usuario').textContent = log.usuario;
        document.getElementById('modal-log-modulo').textContent = this.getModuleLabel(log.modulo);
        document.getElementById('modal-log-ip').textContent = log.ip;
        document.getElementById('modal-log-id').textContent = log.id;
        document.getElementById('modal-log-sessao').textContent = log.sessao;

        // Dados estruturados
        const dadosElement = document.getElementById('modal-log-dados');
        dadosElement.textContent = JSON.stringify(log.dados, null, 2);

        // Mostrar modal
        document.getElementById('modal-detalhes-log').classList.add('active');
    }

    getLogIcon(tipo) {
        const icons = {
            'create': '📝',
            'update': '✏️',
            'delete': '🗑️',
            'payment': '💰',
            'receive': '💸',
            'login': '🔑',
            'export': '📄',
            'import': '📥',
            'system': '⚙️'
        };
        return icons[tipo] || '📋';
    }

    getLogTypeLabel(tipo) {
        const labels = {
            'create': 'Criação',
            'update': 'Edição',
            'delete': 'Exclusão',
            'payment': 'Pagamento',
            'receive': 'Recebimento',
            'login': 'Login',
            'export': 'Exportação',
            'import': 'Importação',
            'system': 'Sistema'
        };
        return labels[tipo] || 'Desconhecido';
    }

    getModuleLabel(modulo) {
        const labels = {
            'dashboard': 'Dashboard',
            'contas-pagar': 'Contas a Pagar',
            'contas-receber': 'Contas a Receber',
            'consolidados': 'Consolidados',
            'agenda': 'Agenda',
            'arquivos': 'Arquivos',
            'sistema': 'Sistema'
        };
        return labels[modulo] || modulo;
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Adicionar log (método para ser usado por outras funcionalidades)
    addLog(tipo, titulo, descricao, modulo, dados = {}) {
        const log = {
            id: `LOG_${this.logIdCounter++}`,
            tipo: tipo,
            titulo: titulo,
            descricao: descricao,
            modulo: modulo,
            usuario: 'Usuário Sistema',
            timestamp: new Date(),
            ip: '192.168.1.100',
            sessao: 'SES_12345',
            dados: dados
        };

        this.logs.unshift(log); // Adicionar no início
        
        // Se estamos na aba de logs, atualizar
        if (this.currentTab === 'logs') {
            this.applyLogsFilters();
        }

        return log.id;
    }

    exportLogs() {
        const csvContent = this.convertLogsToCSV(this.filteredLogs);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `logs_sistema_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccess('Logs exportados com sucesso!');
    }

    convertLogsToCSV(logs) {
        const headers = ['ID', 'Data/Hora', 'Tipo', 'Título', 'Descrição', 'Módulo', 'Usuário', 'IP'];
        const csvRows = [headers.join(',')];
        
        logs.forEach(log => {
            const row = [
                log.id,
                `"${log.timestamp.toLocaleString('pt-BR')}"`,
                this.getLogTypeLabel(log.tipo),
                `"${log.titulo}"`,
                `"${log.descricao}"`,
                this.getModuleLabel(log.modulo),
                `"${log.usuario}"`,
                log.ip
            ];
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }

    exportSingleLog(log) {
        const logData = {
            ...log,
            timestamp: log.timestamp.toLocaleString('pt-BR'),
            tipo_label: this.getLogTypeLabel(log.tipo),
            modulo_label: this.getModuleLabel(log.modulo)
        };
        
        const jsonContent = JSON.stringify(logData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `log_${log.id}_${new Date().toISOString().split('T')[0]}.json`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showSuccess(`Log ${log.id} exportado com sucesso!`);
    }

    async clearAllLogs() {
        const result = await Swal.fire({
            title: 'Limpar todos os logs?',
            text: 'Esta ação não pode ser desfeita. Todos os logs serão removidos permanentemente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, limpar tudo',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            this.logs = [];
            this.filteredLogs = [];
            this.renderLogs();
            this.renderLogsPagination();
            this.showSuccess('Todos os logs foram removidos!');
        }
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
            // Configurar sub-tabs dos consolidados
            this.setupConsolidadosSubTabs();
            
            // Configurar event listeners específicos dos consolidados
            this.setupConsolidadosEventListeners();
            
            // Carregar dados consolidados
            await this.loadConsolidadosData();
            
            // Carregar gráficos dos consolidados
            this.loadConsolidadosCharts();
            
            // Configurar exportação (Fase 2)
            this.setupExportacao();
            
            // === FASE 1 REVISITADA ===
            // Carregar drill-down interativo nos gráficos
            this.setupInteractiveCharts();
            
            // Carregar alertas personalizados
            this.loadAlertasPersonalizados();
            
            // Carregar apenas dados da visão geral inicialmente
            // As outras sub-abas carregam quando selecionadas
            
        } catch (error) {
            console.error('Erro ao carregar consolidados:', error);
            this.showError('Erro ao carregar dados consolidados');
        }
    }

    setupConsolidadosSubTabs() {
        const subTabBtns = document.querySelectorAll('.consolidados-tab-btn');
        const subPanels = document.querySelectorAll('.consolidados-sub-panel');

        subTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-consolidado-tab');
                
                // Remover classe active de todos
                subTabBtns.forEach(b => b.classList.remove('active'));
                subPanels.forEach(p => p.classList.remove('active'));
                
                // Adicionar classe active aos selecionados
                btn.classList.add('active');
                const targetPanel = document.getElementById(tabId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
                
                // Carregar dados específicos da sub-tab
                this.loadConsolidadosSubTabData(tabId);
            });
        });
    }

    async loadConsolidadosSubTabData(tabId) {
        switch (tabId) {
            case 'visao-geral':
                // Já carregado na inicialização
                break;
            case 'rankings':
                this.loadRankings();
                break;
            case 'orcamento':
                this.loadOrcamentoCompleto();
                break;
            case 'inteligente':
                this.loadAnaliseInteligente();
                break;
            case 'riscos':
                this.loadAnalisePreditivaInadimplencia();
                break;
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

        // Carregar apenas análises temporais na sub-aba Rankings
        this.loadAnaliseTemporais();
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

    // === FASE 1 REVISITADA: GRÁFICOS INTERATIVOS ===
    setupInteractiveCharts() {
        // Configurar drill-down nos gráficos existentes
        if (this.charts.fluxoConsolidado) {
            this.charts.fluxoConsolidado.updateOptions({
                chart: {
                    events: {
                        dataPointSelection: (event, chartContext, config) => {
                            this.handleChartDrillDown(config.dataPointIndex, 'fluxo');
                        }
                    }
                }
            });
        }

        if (this.charts.categoriasConsolidado) {
            this.charts.categoriasConsolidado.updateOptions({
                chart: {
                    events: {
                        dataPointSelection: (event, chartContext, config) => {
                            this.handleChartDrillDown(config.dataPointIndex, 'categoria');
                        }
                    }
                }
            });
        }
    }

    async handleChartDrillDown(index, type) {
        let drillDownData = {};
        
        if (type === 'fluxo') {
            const meses = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const mesSelecionado = meses[index];
            
            drillDownData = {
                titulo: `Detalhamento de ${mesSelecionado}`,
                transacoes: [
                    { data: `2024-${index + 7}-05`, descricao: 'Consultoria ABC Ltda', valor: 2500.00, tipo: 'entrada' },
                    { data: `2024-${index + 7}-10`, descricao: 'Material Escritório', valor: -450.00, tipo: 'saida' },
                    { data: `2024-${index + 7}-15`, descricao: 'Energia Elétrica', valor: -380.00, tipo: 'saida' },
                    { data: `2024-${index + 7}-20`, descricao: 'Venda Produtos', valor: 1800.00, tipo: 'entrada' }
                ]
            };
        } else if (type === 'categoria') {
            const categorias = ['Fornecedores', 'Utilidades', 'Escritório', 'Serviços', 'Outros'];
            const categoriaSelecionada = categorias[index];
            
            drillDownData = {
                titulo: `Detalhamento - ${categoriaSelecionada}`,
                transacoes: [
                    { data: '2024-12-01', descricao: `Item 1 - ${categoriaSelecionada}`, valor: -1200.00, tipo: 'saida' },
                    { data: '2024-12-05', descricao: `Item 2 - ${categoriaSelecionada}`, valor: -850.00, tipo: 'saida' },
                    { data: '2024-12-10', descricao: `Item 3 - ${categoriaSelecionada}`, valor: -650.00, tipo: 'saida' }
                ]
            };
        }

        // Mostrar modal com detalhamento
        await Swal.fire({
            title: drillDownData.titulo,
            html: `
                <div class="drill-down-content">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--bg-tertiary);">
                                <th style="padding: 8px; border: 1px solid var(--border-color);">Data</th>
                                <th style="padding: 8px; border: 1px solid var(--border-color);">Descrição</th>
                                <th style="padding: 8px; border: 1px solid var(--border-color);">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${drillDownData.transacoes.map(t => `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid var(--border-color);">${this.formatDate(t.data)}</td>
                                    <td style="padding: 8px; border: 1px solid var(--border-color);">${t.descricao}</td>
                                    <td style="padding: 8px; border: 1px solid var(--border-color); color: ${t.valor > 0 ? 'var(--success-color)' : 'var(--danger-color)'};">
                                        ${this.formatCurrency(Math.abs(t.valor))}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `,
            width: '80%',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            confirmButtonText: 'Fechar'
        });
    }

    // === FASE 1 REVISITADA: ALERTAS PERSONALIZADOS ===
    loadAlertasPersonalizados() {
        const alertas = [
            {
                id: 1,
                tipo: 'vencimento',
                titulo: 'Contas vencendo hoje',
                mensagem: '3 contas a pagar vencem hoje',
                prioridade: 'alta',
                acao: () => this.showTab('contas-pagar')
            },
            {
                id: 2,
                tipo: 'fluxo',
                titulo: 'Fluxo negativo projetado',
                mensagem: 'Próxima semana com saldo negativo de R$ 2.500',
                prioridade: 'media',
                acao: () => this.loadFluxoCaixaInteligente()
            },
            {
                id: 3,
                tipo: 'limite',
                titulo: 'Limite de categoria atingido',
                mensagem: 'Gastos com "Escritório" atingiram 95% do orçamento',
                prioridade: 'alta',
                acao: () => this.loadOrcamentoRealizado()
            }
        ];

        this.renderAlertasPersonalizados(alertas);
    }

    renderAlertasPersonalizados(alertas) {
        // Adicionar notificação visual na interface
        const alertContainer = document.createElement('div');
        alertContainer.className = 'alertas-container';
        alertContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 1000;
            max-width: 350px;
        `;

        alertas.forEach((alerta, index) => {
            setTimeout(() => {
                const alertElement = document.createElement('div');
                alertElement.className = `alerta-item alerta-${alerta.prioridade}`;
                alertElement.style.cssText = `
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-left: 4px solid ${alerta.prioridade === 'alta' ? 'var(--danger-color)' : 'var(--warning-color)'};
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px var(--shadow);
                `;

                alertElement.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong style="color: var(--text-primary);">${alerta.titulo}</strong>
                            <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                                ${alerta.mensagem}
                            </p>
                        </div>
                        <button style="background: none; border: none; color: var(--text-muted); cursor: pointer;">&times;</button>
                    </div>
                `;

                alertElement.addEventListener('click', () => {
                    alerta.acao();
                    alertElement.remove();
                });

                alertElement.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation();
                    alertElement.remove();
                });

                alertContainer.appendChild(alertElement);

                // Auto-remover após 10 segundos
                setTimeout(() => {
                    if (alertElement.parentNode) {
                        alertElement.remove();
                    }
                }, 10000);

            }, index * 1000); // Mostrar alertas com delay
        });

        document.body.appendChild(alertContainer);
    }

    // === ORÇAMENTO COMPLETO ===
    loadOrcamentoCompleto() {
        // Dados baseados nos rankings existentes
        const fornecedoresRanking = [
            { nome: 'ABC Materiais Ltda', valor: 8500.00, categoria: 'Fornecedores', transacoes: 12, crescimento: 8.5 },
            { nome: 'Companhia Elétrica SP', valor: 6200.00, categoria: 'Utilidades', transacoes: 8, crescimento: 2.1 },
            { nome: 'TechSolutions Corp', valor: 4800.00, categoria: 'Serviços', transacoes: 6, crescimento: 15.3 },
            { nome: 'Office Supply Co', valor: 3200.00, categoria: 'Escritório', transacoes: 15, crescimento: -8.2 },
            { nome: 'Clean Services Ltda', valor: 2800.00, categoria: 'Serviços', transacoes: 4, crescimento: 5.7 }
        ];

        const clientesRanking = [
            { nome: 'XYZ Consultoria Ltda', valor: 15000.00, categoria: 'Consultoria', transacoes: 6, crescimento: 12.4 },
            { nome: 'Comércio ABC Ltda', valor: 12500.00, categoria: 'Vendas', transacoes: 10, crescimento: 6.8 },
            { nome: 'Digital Solutions Inc', valor: 9800.00, categoria: 'Serviços', transacoes: 8, crescimento: 18.2 },
            { nome: 'Retail Group SA', valor: 7500.00, categoria: 'Vendas', transacoes: 12, crescimento: -3.1 },
            { nome: 'Startup Tech Ltda', valor: 5200.00, categoria: 'Consultoria', transacoes: 4, crescimento: 25.6 }
        ];

        const orcamentoData = this.calcularOrcamentoFromRankings(fornecedoresRanking, clientesRanking);
        this.renderOrcamentoCompleto(orcamentoData);
    }

    calcularOrcamentoFromRankings(fornecedores, clientes) {
        // Calcular orçamento baseado nos dados de ranking
        const categoriasSaidas = {};
        const categoriasEntradas = {};

        // Agrupar fornecedores por categoria
        fornecedores.forEach(f => {
            if (!categoriasSaidas[f.categoria]) {
                categoriasSaidas[f.categoria] = { realizado: 0, items: [] };
            }
            categoriasSaidas[f.categoria].realizado += f.valor;
            categoriasSaidas[f.categoria].items.push(f);
        });

        // Agrupar clientes por categoria
        clientes.forEach(c => {
            if (!categoriasEntradas[c.categoria]) {
                categoriasEntradas[c.categoria] = { realizado: 0, items: [] };
            }
            categoriasEntradas[c.categoria].realizado += c.valor;
            categoriasEntradas[c.categoria].items.push(c);
        });

        // Definir orçamentos baseados no realizado com margem
        const categoriasSaidasCompletas = Object.keys(categoriasSaidas).map(categoria => {
            const realizado = categoriasSaidas[categoria].realizado;
            const orcado = realizado * 1.1; // 10% de margem
            const percentual = (realizado / orcado) * 100;
            
            return {
                nome: categoria,
                tipo: 'saida',
                orcado: orcado,
                realizado: realizado,
                percentual: percentual,
                status: percentual > 100 ? 'ultrapassado' : percentual > 90 ? 'atencao' : 'ok',
                items: categoriasSaidas[categoria].items,
                meta: this.getMetaPorCategoria(categoria, 'saida')
            };
        });

        const categoriasEntradasCompletas = Object.keys(categoriasEntradas).map(categoria => {
            const realizado = categoriasEntradas[categoria].realizado;
            const orcado = realizado * 0.95; // Meta 5% maior que realizado
            const percentual = (realizado / orcado) * 100;
            
            return {
                nome: categoria,
                tipo: 'entrada',
                orcado: orcado,
                realizado: realizado,
                percentual: percentual,
                status: percentual > 110 ? 'excelente' : percentual > 100 ? 'superado' : 'ok',
                items: categoriasEntradas[categoria].items,
                meta: this.getMetaPorCategoria(categoria, 'entrada')
            };
        });

        return {
            saidas: categoriasSaidasCompletas,
            entradas: categoriasEntradasCompletas,
            resumo: this.calcularResumoOrcamento(categoriasSaidasCompletas, categoriasEntradasCompletas),
            projecoes: this.calcularProjecoesOrcamento(fornecedores, clientes)
        };
    }

    getMetaPorCategoria(categoria, tipo) {
        const metas = {
            saida: {
                'Fornecedores': 'Negociar melhores preços',
                'Utilidades': 'Reduzir 10% vs mês anterior',
                'Escritório': 'Manter gastos controlados',
                'Serviços': 'Otimizar contratos'
            },
            entrada: {
                'Consultoria': 'Aumentar ticket médio',
                'Vendas': 'Crescer 15% ao mês',
                'Serviços': 'Expandir carteira'
            }
        };
        return metas[tipo][categoria] || `Otimizar ${categoria.toLowerCase()}`;
    }

    calcularResumoOrcamento(saidas, entradas) {
        const totalOrcadoSaidas = saidas.reduce((acc, cat) => acc + cat.orcado, 0);
        const totalRealizadoSaidas = saidas.reduce((acc, cat) => acc + cat.realizado, 0);
        const totalOrcadoEntradas = entradas.reduce((acc, cat) => acc + cat.orcado, 0);
        const totalRealizadoEntradas = entradas.reduce((acc, cat) => acc + cat.realizado, 0);

        return {
            saidas: {
                orcado: totalOrcadoSaidas,
                realizado: totalRealizadoSaidas,
                percentual: (totalRealizadoSaidas / totalOrcadoSaidas) * 100,
                economia: totalOrcadoSaidas - totalRealizadoSaidas
            },
            entradas: {
                orcado: totalOrcadoEntradas,
                realizado: totalRealizadoEntradas,
                percentual: (totalRealizadoEntradas / totalOrcadoEntradas) * 100,
                superacao: totalRealizadoEntradas - totalOrcadoEntradas
            },
            saldoLiquido: {
                orcado: totalOrcadoEntradas - totalOrcadoSaidas,
                realizado: totalRealizadoEntradas - totalRealizadoSaidas
            }
        };
    }

    calcularProjecoesOrcamento(fornecedores, clientes) {
        // Projeções baseadas no crescimento dos rankings
        const crescimentoMedioFornecedores = fornecedores.reduce((acc, f) => acc + f.crescimento, 0) / fornecedores.length;
        const crescimentoMedioClientes = clientes.reduce((acc, c) => acc + c.crescimento, 0) / clientes.length;

        return {
            proximoMes: {
                saidasProjetadas: fornecedores.reduce((acc, f) => acc + f.valor, 0) * (1 + crescimentoMedioFornecedores / 100),
                entradasProjetadas: clientes.reduce((acc, c) => acc + c.valor, 0) * (1 + crescimentoMedioClientes / 100),
                crescimentoSaidas: crescimentoMedioFornecedores,
                crescimentoEntradas: crescimentoMedioClientes
            },
            alertas: this.gerarAlertasOrcamento(fornecedores, clientes),
            recomendacoes: this.gerarRecomendacoesOrcamento(fornecedores, clientes)
        };
    }

    gerarAlertasOrcamento(fornecedores, clientes) {
        const alertas = [];

        // Fornecedores com crescimento alto
        fornecedores.forEach(f => {
            if (f.crescimento > 10) {
                alertas.push({
                    tipo: 'atencao',
                    categoria: f.categoria,
                    fornecedor: f.nome,
                    message: `${f.nome}: crescimento de ${f.crescimento.toFixed(1)}% pode impactar orçamento`
                });
            }
        });

        // Clientes com crescimento negativo
        clientes.forEach(c => {
            if (c.crescimento < 0) {
                alertas.push({
                    tipo: 'risco',
                    categoria: c.categoria,
                    cliente: c.nome,
                    message: `${c.nome}: queda de ${Math.abs(c.crescimento).toFixed(1)}% nas receitas`
                });
            }
        });

        return alertas.slice(0, 5); // Máximo 5 alertas
    }

    gerarRecomendacoesOrcamento(fornecedores, clientes) {
        const recomendacoes = [];

        // Top fornecedor com maior crescimento
        const fornecedorMaiorCrescimento = fornecedores.reduce((max, f) => f.crescimento > max.crescimento ? f : max);
        if (fornecedorMaiorCrescimento.crescimento > 15) {
            recomendacoes.push({
                tipo: 'negociacao',
                titulo: 'Renegociar Contrato',
                descricao: `${fornecedorMaiorCrescimento.nome} teve crescimento de ${fornecedorMaiorCrescimento.crescimento.toFixed(1)}%. Considere renegociar preços.`,
                impacto: fornecedorMaiorCrescimento.valor * 0.1
            });
        }

        // Top cliente com maior crescimento
        const clienteMaiorCrescimento = clientes.reduce((max, c) => c.crescimento > max.crescimento ? c : max);
        if (clienteMaiorCrescimento.crescimento > 20) {
            recomendacoes.push({
                tipo: 'oportunidade',
                titulo: 'Expandir Relacionamento',
                descricao: `${clienteMaiorCrescimento.nome} cresceu ${clienteMaiorCrescimento.crescimento.toFixed(1)}%. Oportunidade para aumentar ticket médio.`,
                impacto: clienteMaiorCrescimento.valor * 0.2
            });
        }

        return recomendacoes;
    }

    renderOrcamentoCompleto(data) {
        const container = document.getElementById('orcamento-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="orcamento-dashboard">
                <!-- Resumo Executivo -->
                <div class="orcamento-resumo-executivo">
                    <div class="resumo-card saidas">
                        <h4>💸 Saídas (Gastos)</h4>
                        <div class="resumo-valores">
                            <div class="valor-principal">${this.formatCurrency(data.resumo.saidas.realizado)}</div>
                            <div class="valor-meta">Meta: ${this.formatCurrency(data.resumo.saidas.orcado)}</div>
                            <div class="performance ${data.resumo.saidas.percentual > 100 ? 'ruim' : 'boa'}">
                                ${data.resumo.saidas.percentual.toFixed(1)}% da meta
                            </div>
                        </div>
                    </div>
                    
                    <div class="resumo-card entradas">
                        <h4>💰 Entradas (Receitas)</h4>
                        <div class="resumo-valores">
                            <div class="valor-principal">${this.formatCurrency(data.resumo.entradas.realizado)}</div>
                            <div class="valor-meta">Meta: ${this.formatCurrency(data.resumo.entradas.orcado)}</div>
                            <div class="performance ${data.resumo.entradas.percentual > 100 ? 'boa' : 'ruim'}">
                                ${data.resumo.entradas.percentual.toFixed(1)}% da meta
                            </div>
                        </div>
                    </div>
                    
                    <div class="resumo-card saldo">
                        <h4>📊 Saldo Líquido</h4>
                        <div class="resumo-valores">
                            <div class="valor-principal ${data.resumo.saldoLiquido.realizado > 0 ? 'positivo' : 'negativo'}">
                                ${this.formatCurrency(data.resumo.saldoLiquido.realizado)}
                            </div>
                            <div class="valor-meta">Meta: ${this.formatCurrency(data.resumo.saldoLiquido.orcado)}</div>
                            <div class="performance ${data.resumo.saldoLiquido.realizado > data.resumo.saldoLiquido.orcado ? 'boa' : 'ruim'}">
                                ${((data.resumo.saldoLiquido.realizado / data.resumo.saldoLiquido.orcado) * 100).toFixed(1)}% da meta
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Saídas por Categoria -->
                <div class="orcamento-section">
                    <h3>💸 Controle de Gastos por Categoria</h3>
                    <div class="categorias-grid">
                        ${data.saidas.map(categoria => `
                            <div class="categoria-card ${categoria.status}">
                                <div class="categoria-header">
                                    <h5>${categoria.nome}</h5>
                                    <span class="status-badge ${categoria.status}">${categoria.percentual.toFixed(1)}%</span>
                                </div>
                                
                                <div class="categoria-valores">
                                    <div class="valor-linha">
                                        <span>Orçado:</span>
                                        <strong>${this.formatCurrency(categoria.orcado)}</strong>
                                    </div>
                                    <div class="valor-linha">
                                        <span>Realizado:</span>
                                        <strong class="${categoria.realizado > categoria.orcado ? 'over-budget' : 'in-budget'}">
                                            ${this.formatCurrency(categoria.realizado)}
                                        </strong>
                                    </div>
                                    <div class="valor-linha diferenca">
                                        <span>Diferença:</span>
                                        <strong class="${categoria.realizado > categoria.orcado ? 'negativo' : 'positivo'}">
                                            ${categoria.realizado > categoria.orcado ? '+' : ''}${this.formatCurrency(Math.abs(categoria.realizado - categoria.orcado))}
                                        </strong>
                                    </div>
                                </div>
                                
                                <div class="progresso-container">
                                    <div class="progresso-bar">
                                        <div class="progresso-fill ${categoria.status}" style="width: ${Math.min(categoria.percentual, 100)}%"></div>
                                    </div>
                                </div>
                                
                                <div class="categoria-detalhes">
                                    <div class="meta-categoria">🎯 ${categoria.meta}</div>
                                    <div class="items-categoria">
                                        <strong>Top Fornecedores:</strong>
                                        ${categoria.items.slice(0, 2).map(item => `
                                            <div class="item-ranking">
                                                ${item.nome}: ${this.formatCurrency(item.valor)}
                                                <span class="crescimento ${item.crescimento >= 0 ? 'positivo' : 'negativo'}">
                                                    ${item.crescimento >= 0 ? '+' : ''}${item.crescimento.toFixed(1)}%
                                                </span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Entradas por Categoria -->
                <div class="orcamento-section">
                    <h3>💰 Performance de Receitas por Categoria</h3>
                    <div class="categorias-grid">
                        ${data.entradas.map(categoria => `
                            <div class="categoria-card ${categoria.status}">
                                <div class="categoria-header">
                                    <h5>${categoria.nome}</h5>
                                    <span class="status-badge ${categoria.status}">${categoria.percentual.toFixed(1)}%</span>
                                </div>
                                
                                <div class="categoria-valores">
                                    <div class="valor-linha">
                                        <span>Meta:</span>
                                        <strong>${this.formatCurrency(categoria.orcado)}</strong>
                                    </div>
                                    <div class="valor-linha">
                                        <span>Realizado:</span>
                                        <strong class="${categoria.realizado > categoria.orcado ? 'over-target' : 'under-target'}">
                                            ${this.formatCurrency(categoria.realizado)}
                                        </strong>
                                    </div>
                                    <div class="valor-linha diferenca">
                                        <span>Superação:</span>
                                        <strong class="${categoria.realizado > categoria.orcado ? 'positivo' : 'negativo'}">
                                            ${categoria.realizado > categoria.orcado ? '+' : ''}${this.formatCurrency(categoria.realizado - categoria.orcado)}
                                        </strong>
                                    </div>
                                </div>
                                
                                <div class="progresso-container">
                                    <div class="progresso-bar">
                                        <div class="progresso-fill ${categoria.status}" style="width: ${Math.min(categoria.percentual, 100)}%"></div>
                                    </div>
                                </div>
                                
                                <div class="categoria-detalhes">
                                    <div class="meta-categoria">🎯 ${categoria.meta}</div>
                                    <div class="items-categoria">
                                        <strong>Top Clientes:</strong>
                                        ${categoria.items.slice(0, 2).map(item => `
                                            <div class="item-ranking">
                                                ${item.nome}: ${this.formatCurrency(item.valor)}
                                                <span class="crescimento ${item.crescimento >= 0 ? 'positivo' : 'negativo'}">
                                                    ${item.crescimento >= 0 ? '+' : ''}${item.crescimento.toFixed(1)}%
                                                </span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Projeções e Alertas -->
                <div class="orcamento-projecoes">
                    <div class="projecao-card">
                        <h4>📈 Projeção Próximo Mês</h4>
                        <div class="projecao-valores">
                            <div class="projecao-item saidas">
                                <span>Gastos Projetados:</span>
                                <strong>${this.formatCurrency(data.projecoes.proximoMes.saidasProjetadas)}</strong>
                                <small class="${data.projecoes.proximoMes.crescimentoSaidas >= 0 ? 'negativo' : 'positivo'}">
                                    ${data.projecoes.proximoMes.crescimentoSaidas >= 0 ? '+' : ''}${data.projecoes.proximoMes.crescimentoSaidas.toFixed(1)}%
                                </small>
                            </div>
                            <div class="projecao-item entradas">
                                <span>Receitas Projetadas:</span>
                                <strong>${this.formatCurrency(data.projecoes.proximoMes.entradasProjetadas)}</strong>
                                <small class="${data.projecoes.proximoMes.crescimentoEntradas >= 0 ? 'positivo' : 'negativo'}">
                                    ${data.projecoes.proximoMes.crescimentoEntradas >= 0 ? '+' : ''}${data.projecoes.proximoMes.crescimentoEntradas.toFixed(1)}%
                                </small>
                            </div>
                            <div class="projecao-item saldo">
                                <span>Saldo Projetado:</span>
                                <strong class="${(data.projecoes.proximoMes.entradasProjetadas - data.projecoes.proximoMes.saidasProjetadas) > 0 ? 'positivo' : 'negativo'}">
                                    ${this.formatCurrency(data.projecoes.proximoMes.entradasProjetadas - data.projecoes.proximoMes.saidasProjetadas)}
                                </strong>
                            </div>
                        </div>
                    </div>

                    ${data.projecoes.alertas.length > 0 ? `
                        <div class="alertas-orcamento">
                            <h4>⚠️ Alertas Orçamentários</h4>
                            <div class="alertas-list">
                                ${data.projecoes.alertas.map(alerta => `
                                    <div class="alerta-item ${alerta.tipo}">
                                        <span class="alerta-categoria">${alerta.categoria}</span>
                                        <span class="alerta-message">${alerta.message}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${data.projecoes.recomendacoes.length > 0 ? `
                        <div class="recomendacoes-orcamento">
                            <h4>💡 Recomendações Estratégicas</h4>
                            <div class="recomendacoes-list">
                                ${data.projecoes.recomendacoes.map(rec => `
                                    <div class="recomendacao-item ${rec.tipo}">
                                        <h5>${rec.titulo}</h5>
                                        <p>${rec.descricao}</p>
                                        <small>💰 Impacto estimado: ${this.formatCurrency(rec.impacto)}</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Ações -->
                <div class="orcamento-acoes">
                    <button class="btn btn-primary" onclick="app.editarOrcamentoDetalhado()">
                        ✏️ Editar Orçamento Detalhado
                    </button>
                    <button class="btn btn-success" onclick="app.exportarOrcamento()">
                        📊 Exportar Relatório Orçamentário
                    </button>
                    <button class="btn btn-secondary" onclick="app.configurarAlertasOrcamento()">
                        🔔 Configurar Alertas
                    </button>
                </div>
            </div>
        `;
    }

    createOrcamentoContainer() {
        const container = document.createElement('div');
        container.id = 'orcamento-realizado';
        container.className = 'analise-container';
        
        // Adicionar após análises avançadas
        const analiseAvancada = document.querySelector('.consolidados-analises-avancadas');
        if (analiseAvancada && analiseAvancada.parentNode) {
            analiseAvancada.parentNode.insertBefore(container, analiseAvancada.nextSibling);
        }
        
        return container;
    }

    // === ANÁLISE INTELIGENTE COMPLETA ===
    loadAnaliseInteligente() {
        const analiseCompleta = this.calcularAnaliseInteligente();
        this.renderAnaliseInteligente(analiseCompleta);
    }

    calcularAnaliseInteligente() {
        // Dados dos rankings para alimentar a IA
        const fornecedoresData = [
            { nome: 'ABC Materiais Ltda', valor: 8500.00, categoria: 'Fornecedores', transacoes: 12, crescimento: 8.5 },
            { nome: 'Companhia Elétrica SP', valor: 6200.00, categoria: 'Utilidades', transacoes: 8, crescimento: 2.1 },
            { nome: 'TechSolutions Corp', valor: 4800.00, categoria: 'Serviços', transacoes: 6, crescimento: 15.3 },
            { nome: 'Office Supply Co', valor: 3200.00, categoria: 'Escritório', transacoes: 15, crescimento: -8.2 },
            { nome: 'Clean Services Ltda', valor: 2800.00, categoria: 'Serviços', transacoes: 4, crescimento: 5.7 }
        ];

        const clientesData = [
            { nome: 'XYZ Consultoria Ltda', valor: 15000.00, categoria: 'Consultoria', transacoes: 6, crescimento: 12.4 },
            { nome: 'Comércio ABC Ltda', valor: 12500.00, categoria: 'Vendas', transacoes: 10, crescimento: 6.8 },
            { nome: 'Digital Solutions Inc', valor: 9800.00, categoria: 'Serviços', transacoes: 8, crescimento: 18.2 },
            { nome: 'Retail Group SA', valor: 7500.00, categoria: 'Vendas', transacoes: 12, crescimento: -3.1 },
            { nome: 'Startup Tech Ltda', valor: 5200.00, categoria: 'Consultoria', transacoes: 4, crescimento: 25.6 }
        ];

        return {
            fluxoCaixaInteligente: this.calcularFluxoCaixaInteligente(),
            analiseComportamental: this.analisarComportamentoTransacional(fornecedoresData, clientesData),
            previsoesMachineLearning: this.calcularPrevisoesMachineLearning(fornecedoresData, clientesData),
            otimizacaoAutomatica: this.sugerirOtimizacoes(fornecedoresData, clientesData),
            alertasInteligentes: this.gerarAlertasInteligentes(fornecedoresData, clientesData),
            recomendacoesStrategicas: this.gerarRecomendacoesIA(fornecedoresData, clientesData)
        };
    }

    analisarComportamentoTransacional(fornecedores, clientes) {
        // Análise de padrões comportamentais
        const padroesFornecedores = {
            frecuenciaMedia: fornecedores.reduce((acc, f) => acc + f.transacoes, 0) / fornecedores.length,
            ticketMedio: fornecedores.reduce((acc, f) => acc + (f.valor / f.transacoes), 0) / fornecedores.length,
            crescimentoMedio: fornecedores.reduce((acc, f) => acc + f.crescimento, 0) / fornecedores.length,
            volatilidade: this.calcularVolatilidadeCrescimento(fornecedores),
            fornecedorMaisEstavel: fornecedores.reduce((min, f) => Math.abs(f.crescimento) < Math.abs(min.crescimento) ? f : min),
            fornecedorMaisVolatil: fornecedores.reduce((max, f) => Math.abs(f.crescimento) > Math.abs(max.crescimento) ? f : max)
        };

        const padroesClientes = {
            frecuenciaMedia: clientes.reduce((acc, c) => acc + c.transacoes, 0) / clientes.length,
            ticketMedio: clientes.reduce((acc, c) => acc + (c.valor / c.transacoes), 0) / clientes.length,
            crescimentoMedio: clientes.reduce((acc, c) => acc + c.crescimento, 0) / clientes.length,
            volatilidade: this.calcularVolatilidadeCrescimento(clientes),
            clienteMaisEstavel: clientes.reduce((min, c) => Math.abs(c.crescimento) < Math.abs(min.crescimento) ? c : min),
            clienteMaisVolatil: clientes.reduce((max, c) => Math.abs(c.crescimento) > Math.abs(max.crescimento) ? c : max)
        };

        return {
            fornecedores: padroesFornecedores,
            clientes: padroesClientes,
            insights: this.gerarInsightComportamentais(padroesFornecedores, padroesClientes)
        };
    }

    calcularVolatilidadeCrescimento(dados) {
        const crescimentos = dados.map(d => d.crescimento);
        const media = crescimentos.reduce((acc, c) => acc + c, 0) / crescimentos.length;
        const variancia = crescimentos.reduce((acc, c) => acc + Math.pow(c - media, 2), 0) / crescimentos.length;
        return Math.sqrt(variancia);
    }

    gerarInsightComportamentais(fornecedores, clientes) {
        const insights = [];

        if (fornecedores.volatilidade > 10) {
            insights.push({
                tipo: 'risco',
                categoria: 'Fornecedores',
                insight: `Alta volatilidade nos gastos (${fornecedores.volatilidade.toFixed(1)}%). Revisar contratos para maior previsibilidade.`
            });
        }

        if (clientes.crescimentoMedio > 15) {
            insights.push({
                tipo: 'oportunidade',
                categoria: 'Clientes',
                insight: `Crescimento médio de ${clientes.crescimentoMedio.toFixed(1)}% indica tendência positiva. Momento para expandir relacionamentos.`
            });
        }

        if (fornecedores.ticketMedio > clientes.ticketMedio) {
            insights.push({
                tipo: 'alerta',
                categoria: 'Eficiência',
                insight: `Ticket médio de gastos (${this.formatCurrency(fornecedores.ticketMedio)}) superior ao de receitas (${this.formatCurrency(clientes.ticketMedio)}). Analisar rentabilidade.`
            });
        }

        return insights;
    }

    calcularPrevisoesMachineLearning(fornecedores, clientes) {
        // Simulação de algoritmo de Machine Learning
        const historicoMeses = [
            { mes: 'Jan', entradas: 42000, saidas: 35000 },
            { mes: 'Fev', entradas: 38000, saidas: 32000 },
            { mes: 'Mar', entradas: 45000, saidas: 38000 },
            { mes: 'Abr', entradas: 48000, saidas: 40000 },
            { mes: 'Mai', entradas: 44000, saidas: 37000 },
            { mes: 'Jun', entradas: 52000, saidas: 42000 }
        ];

        // Algoritmo de regressão linear simples
        const tendenciaEntradas = this.calcularTendenciaLinear(historicoMeses.map(h => h.entradas));
        const tendenciaSaidas = this.calcularTendenciaLinear(historicoMeses.map(h => h.saidas));

        // Projeções para próximos 6 meses
        const projecoes = [];
        for (let i = 1; i <= 6; i++) {
            const entradaProjetada = tendenciaEntradas.intercept + (tendenciaEntradas.slope * (historicoMeses.length + i));
            const saidaProjetada = tendenciaSaidas.intercept + (tendenciaSaidas.slope * (historicoMeses.length + i));
            
            projecoes.push({
                mes: this.getProximoMes(i),
                entradaProjetada: Math.max(0, entradaProjetada),
                saidaProjetada: Math.max(0, saidaProjetada),
                saldoProjetado: entradaProjetada - saidaProjetada,
                confianca: Math.max(60, 95 - (i * 5)) // Confiança diminui com o tempo
            });
        }

        return {
            historico: historicoMeses,
            tendencias: { entradas: tendenciaEntradas, saidas: tendenciaSaidas },
            projecoes: projecoes,
            cenarios: this.calcularCenarios(projecoes),
            recomendacaoIA: this.gerarRecomendacaoIA(projecoes)
        };
    }

    calcularTendenciaLinear(valores) {
        const n = valores.length;
        const x = Array.from({length: n}, (_, i) => i + 1);
        
        const somaX = x.reduce((acc, val) => acc + val, 0);
        const somaY = valores.reduce((acc, val) => acc + val, 0);
        const somaXY = x.reduce((acc, val, i) => acc + val * valores[i], 0);
        const somaX2 = x.reduce((acc, val) => acc + val * val, 0);
        
        const slope = (n * somaXY - somaX * somaY) / (n * somaX2 - somaX * somaX);
        const intercept = (somaY - slope * somaX) / n;
        
        return { slope, intercept };
    }

    getProximoMes(offset) {
        const meses = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        const mesAtual = new Date().getMonth() + 6; // Assumindo que estamos em junho
        return meses[(mesAtual + offset) % 12];
    }

    calcularCenarios(projecoes) {
        return {
            otimista: projecoes.map(p => ({
                ...p,
                entradaProjetada: p.entradaProjetada * 1.2,
                saidaProjetada: p.saidaProjetada * 0.9,
                cenario: 'otimista'
            })),
            conservador: projecoes.map(p => ({
                ...p,
                entradaProjetada: p.entradaProjetada * 0.9,
                saidaProjetada: p.saidaProjetada * 1.1,
                cenario: 'conservador'
            })),
            pessimista: projecoes.map(p => ({
                ...p,
                entradaProjetada: p.entradaProjetada * 0.8,
                saidaProjetada: p.saidaProjetada * 1.2,
                cenario: 'pessimista'
            }))
        };
    }

    gerarRecomendacaoIA(projecoes) {
        const saldoMedio = projecoes.reduce((acc, p) => acc + p.saldoProjetado, 0) / projecoes.length;
        const tendencia = projecoes[5].saldoProjetado > projecoes[0].saldoProjetado ? 'crescente' : 'decrescente';
        
        if (saldoMedio > 10000 && tendencia === 'crescente') {
            return {
                tipo: 'investimento',
                recomendacao: 'Cenário favorável para investimentos em expansão e novos projetos',
                confianca: 85
            };
        } else if (saldoMedio < 0) {
            return {
                tipo: 'urgente',
                recomendacao: 'Ações imediatas necessárias: revisar gastos e acelerar recebimentos',
                confianca: 90
            };
        } else {
            return {
                tipo: 'monitoramento',
                recomendacao: 'Manter monitoramento próximo e aplicar otimizações graduais',
                confianca: 75
            };
        }
    }

    sugerirOtimizacoes(fornecedores, clientes) {
        const otimizacoes = [];

        // Otimizações baseadas em fornecedores
        const fornecedorMaiorVolume = fornecedores.reduce((max, f) => f.valor > max.valor ? f : max);
        otimizacoes.push({
            tipo: 'negociacao',
            categoria: 'Fornecedores',
            alvo: fornecedorMaiorVolume.nome,
            acao: 'Renegociar condições de pagamento',
            impactoEstimado: fornecedorMaiorVolume.valor * 0.05,
            prazo: '30 dias',
            prioridade: 'alta'
        });

        // Otimizações baseadas em clientes
        const clienteMaiorPotencial = clientes.reduce((max, c) => c.crescimento > max.crescimento ? c : max);
        otimizacoes.push({
            tipo: 'expansao',
            categoria: 'Clientes',
            alvo: clienteMaiorPotencial.nome,
            acao: 'Propor aumento de escopo/serviços',
            impactoEstimado: clienteMaiorPotencial.valor * 0.3,
            prazo: '60 dias',
            prioridade: 'media'
        });

        // Otimização de frequência
        const fornecedorMaisFrequente = fornecedores.reduce((max, f) => f.transacoes > max.transacoes ? f : max);
        otimizacoes.push({
            tipo: 'automacao',
            categoria: 'Processos',
            alvo: fornecedorMaisFrequente.nome,
            acao: 'Automatizar processo de compras recorrentes',
            impactoEstimado: 1200, // Economia em tempo/custo administrativo
            prazo: '45 dias',
            prioridade: 'baixa'
        });

        return otimizacoes;
    }

    gerarAlertasInteligentes(fornecedores, clientes) {
        const alertas = [];

        // Alertas baseados em padrões anômalos
        fornecedores.forEach(f => {
            if (f.crescimento > 20) {
                alertas.push({
                    tipo: 'anomalia',
                    urgencia: 'alta',
                    entidade: f.nome,
                    categoria: f.categoria,
                    problema: `Crescimento anômalo de ${f.crescimento.toFixed(1)}%`,
                    acao: 'Investigar causa e renegociar se necessário'
                });
            }
        });

        clientes.forEach(c => {
            if (c.crescimento < -10) {
                alertas.push({
                    tipo: 'risco',
                    urgencia: 'media',
                    entidade: c.nome,
                    categoria: c.categoria,
                    problema: `Queda de ${Math.abs(c.crescimento).toFixed(1)}% nas receitas`,
                    acao: 'Contato comercial para entender motivos'
                });
            }
        });

        return alertas;
    }

    gerarRecomendacoesIA(fornecedores, clientes) {
        const recomendacoes = [];

        // Análise de concentração de risco
        const totalFornecedores = fornecedores.reduce((acc, f) => acc + f.valor, 0);
        const maiorFornecedor = fornecedores.reduce((max, f) => f.valor > max.valor ? f : max);
        const concentracao = (maiorFornecedor.valor / totalFornecedores) * 100;

        if (concentracao > 30) {
            recomendacoes.push({
                tipo: 'diversificacao',
                titulo: 'Diversificar Base de Fornecedores',
                descricao: `${maiorFornecedor.nome} representa ${concentracao.toFixed(1)}% dos gastos. Risco de concentração alto.`,
                impacto: 'Alto',
                prazo: '90 dias',
                acoes: [
                    'Identificar fornecedores alternativos',
                    'Dividir compras entre múltiplos fornecedores',
                    'Renegociar dependência atual'
                ]
            });
        }

        // Análise de oportunidades de crescimento
        const clienteAltoGrowth = clientes.filter(c => c.crescimento > 15);
        if (clienteAltoGrowth.length > 0) {
            recomendacoes.push({
                tipo: 'crescimento',
                titulo: 'Aproveitar Clientes em Crescimento',
                descricao: `${clienteAltoGrowth.length} cliente(s) com crescimento >15%. Oportunidade de expansão.`,
                impacto: 'Alto',
                prazo: '60 dias',
                acoes: [
                    'Propor serviços adicionais',
                    'Aumentar ticket médio',
                    'Estabelecer parcerias estratégicas'
                ]
            });
        }

        return recomendacoes;
    }

    // === FASE 3: FLUXO DE CAIXA INTELIGENTE ===
    loadFluxoCaixaInteligente() {
        const fluxoInteligente = this.calcularFluxoCaixaInteligente();
        this.renderFluxoCaixaInteligente(fluxoInteligente);
    }

    calcularFluxoCaixaInteligente() {
        // Simulação de algoritmo inteligente baseado em:
        // - Histórico de entradas/saídas
        // - Sazonalidade
        // - Contas já cadastradas
        // - Tendências identificadas

        const hoje = new Date();
        const proximosDias = [];
        
        for (let i = 1; i <= 30; i++) {
            const data = new Date(hoje);
            data.setDate(hoje.getDate() + i);
            
            // Calcular projeção baseada em padrões históricos
            const diaCategoria = this.categorizarDia(data);
            const entradaBase = this.calcularEntradaBase(diaCategoria);
            const saidaBase = this.calcularSaidaBase(diaCategoria);
            
            // Aplicar fatores de ajuste
            const fatorSazonalidade = this.getFatorSazonalidade(data);
            const fatorTendencia = this.getFatorTendencia();
            
            const entradaProjetada = entradaBase * fatorSazonalidade * fatorTendencia;
            const saidaProjetada = saidaBase * fatorSazonalidade;
            
            proximosDias.push({
                data: data,
                entradaProjetada: entradaProjetada,
                saidaProjetada: saidaProjetada,
                saldoProjetado: entradaProjetada - saidaProjetada,
                confianca: this.calcularConfianca(i)
            });
        }

        // Calcular saldo acumulado
        let saldoAcumulado = 17000; // Saldo atual simulado
        proximosDias.forEach(dia => {
            saldoAcumulado += dia.saldoProjetado;
            dia.saldoAcumulado = saldoAcumulado;
        });

        return {
            saldoAtual: 17000,
            proximosDias: proximosDias,
            alertas: this.identificarAlertasFluxo(proximosDias),
            recomendacoes: this.gerarRecomendacoesFluxo(proximosDias)
        };
    }

    categorizarDia(data) {
        const diaSemana = data.getDay(); // 0 = domingo, 6 = sábado
        const diaMs = data.getDate();
        
        if (diaSemana === 0 || diaSemana === 6) return 'fimSemana';
        if (diaMs <= 5) return 'inicioMes';
        if (diaMs >= 25) return 'fimMes';
        return 'meioMes';
    }

    calcularEntradaBase(categoria) {
        const baseEntradas = {
            'inicioMes': 3500,
            'meioMes': 1800,
            'fimMes': 2200,
            'fimSemana': 500
        };
        return baseEntradas[categoria] || 1500;
    }

    calcularSaidaBase(categoria) {
        const baseSaidas = {
            'inicioMes': 1200,
            'meioMes': 900,
            'fimMes': 1500,
            'fimSemana': 300
        };
        return baseSaidas[categoria] || 800;
    }

    getFatorSazonalidade(data) {
        const mes = data.getMonth();
        // Janeiro: pós-férias (0.8), Dezembro: alta temporada (1.3)
        const fatoresSazonais = [0.8, 0.9, 1.0, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];
        return fatoresSazonais[mes];
    }

    getFatorTendencia() {
        // Baseado na análise de tendências: +8.5% nas entradas
        return 1.085;
    }

    calcularConfianca(dias) {
        // Confiança decresce com o tempo
        if (dias <= 7) return 95;
        if (dias <= 15) return 85;
        if (dias <= 22) return 75;
        return 65;
    }

    identificarAlertasFluxo(proximosDias) {
        const alertas = [];
        
        proximosDias.forEach((dia, index) => {
            if (dia.saldoAcumulado < 0) {
                alertas.push({
                    tipo: 'saldo_negativo',
                    data: dia.data,
                    valor: dia.saldoAcumulado,
                    message: `Saldo negativo previsto: ${this.formatCurrency(dia.saldoAcumulado)}`
                });
            }
            
            if (dia.saldoAcumulado < 5000 && dia.saldoAcumulado > 0) {
                alertas.push({
                    tipo: 'saldo_baixo',
                    data: dia.data,
                    valor: dia.saldoAcumulado,
                    message: `Saldo baixo previsto: ${this.formatCurrency(dia.saldoAcumulado)}`
                });
            }
        });
        
        return alertas.slice(0, 3); // Máximo 3 alertas
    }

    gerarRecomendacoesFluxo(proximosDias) {
        const recomendacoes = [];
        
        const menorSaldo = Math.min(...proximosDias.map(d => d.saldoAcumulado));
        if (menorSaldo < 0) {
            recomendacoes.push({
                tipo: 'urgente',
                titulo: 'Ação Necessária',
                descricao: 'Antecipar recebimentos ou postergar pagamentos não críticos',
                impacto: Math.abs(menorSaldo)
            });
        }
        
        const mediaEntradas = proximosDias.reduce((acc, d) => acc + d.entradaProjetada, 0) / proximosDias.length;
        if (mediaEntradas > 2000) {
            recomendacoes.push({
                tipo: 'oportunidade',
                titulo: 'Momento de Investimento',
                descricao: 'Período favorável para investimentos em crescimento',
                impacto: mediaEntradas
            });
        }
        
        return recomendacoes;
    }

    renderFluxoCaixaInteligente(fluxoData) {
        const container = document.getElementById('fluxo-caixa-inteligente') || this.createFluxoInteligenteContainer();
        
        container.innerHTML = `
            <div class="fluxo-inteligente-resumo">
                <div class="resumo-card">
                    <h4>💰 Saldo Atual</h4>
                    <div class="valor-destaque">${this.formatCurrency(fluxoData.saldoAtual)}</div>
                </div>
                
                <div class="resumo-card">
                    <h4>📈 Projeção 30 dias</h4>
                    <div class="valor-destaque ${fluxoData.proximosDias[29].saldoAcumulado > fluxoData.saldoAtual ? 'positivo' : 'negativo'}">
                        ${this.formatCurrency(fluxoData.proximosDias[29].saldoAcumulado)}
                    </div>
                </div>
                
                <div class="resumo-card">
                    <h4>🎯 Menor Saldo Previsto</h4>
                    <div class="valor-destaque ${Math.min(...fluxoData.proximosDias.map(d => d.saldoAcumulado)) > 0 ? 'ok' : 'negativo'}">
                        ${this.formatCurrency(Math.min(...fluxoData.proximosDias.map(d => d.saldoAcumulado)))}
                    </div>
                </div>
            </div>
            
            ${fluxoData.alertas.length > 0 ? `
                <div class="fluxo-alertas">
                    <h4>⚠️ Alertas de Fluxo de Caixa</h4>
                    <div class="alertas-list">
                        ${fluxoData.alertas.map(alerta => `
                            <div class="alerta-fluxo ${alerta.tipo}">
                                <span class="alerta-data">${this.formatDate(alerta.data)}</span>
                                <span class="alerta-message">${alerta.message}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${fluxoData.recomendacoes.length > 0 ? `
                <div class="fluxo-recomendacoes">
                    <h4>💡 Recomendações Inteligentes</h4>
                    <div class="recomendacoes-list">
                        ${fluxoData.recomendacoes.map(rec => `
                            <div class="recomendacao-item ${rec.tipo}">
                                <h5>${rec.titulo}</h5>
                                <p>${rec.descricao}</p>
                                <small>Impacto estimado: ${this.formatCurrency(rec.impacto)}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="fluxo-chart-container">
                <h4>📊 Projeção Inteligente - Próximos 30 Dias</h4>
                <div id="chart-fluxo-inteligente"></div>
            </div>
        `;
        
        this.renderFluxoInteligenteChart(fluxoData);
    }

    createFluxoInteligenteContainer() {
        const container = document.createElement('div');
        container.id = 'fluxo-caixa-inteligente';
        container.className = 'analise-container';
        
        // Adicionar após orçamento vs realizado
        const orcamentoContainer = document.getElementById('orcamento-realizado');
        if (orcamentoContainer && orcamentoContainer.parentNode) {
            orcamentoContainer.parentNode.insertBefore(container, orcamentoContainer.nextSibling);
        }
        
        return container;
    }

    renderFluxoInteligenteChart(fluxoData) {
        const options = {
            series: [{
                name: 'Saldo Projetado',
                data: fluxoData.proximosDias.map(d => ({
                    x: d.data.getTime(),
                    y: d.saldoAcumulado
                }))
            }, {
                name: 'Confiança (%)',
                data: fluxoData.proximosDias.map(d => ({
                    x: d.data.getTime(),
                    y: d.confianca
                })),
                yAxis: 1
            }],
            chart: {
                type: 'line',
                height: 400,
                background: 'transparent',
                toolbar: { show: false }
            },
            colors: ['#007bff', '#28a745'],
            xaxis: {
                type: 'datetime',
                labels: { 
                    style: { colors: 'var(--text-secondary)' },
                    format: 'dd/MM'
                }
            },
            yaxis: [{
                title: {
                    text: 'Saldo (R$)',
                    style: { color: 'var(--text-secondary)' }
                },
                labels: { 
                    style: { colors: 'var(--text-secondary)' },
                    formatter: (val) => this.formatCurrency(val)
                }
            }, {
                opposite: true,
                title: {
                    text: 'Confiança (%)',
                    style: { color: 'var(--text-secondary)' }
                },
                labels: { 
                    style: { colors: 'var(--text-secondary)' },
                    formatter: (val) => `${val.toFixed(0)}%`
                }
            }],
            stroke: {
                width: [3, 2],
                curve: 'smooth'
            },
            legend: {
                labels: { colors: 'var(--text-primary)' }
            },
            grid: {
                borderColor: 'var(--border-color)'
            },
            theme: {
                mode: this.theme
            },
            tooltip: {
                theme: this.theme
            }
        };

        if (this.charts.fluxoInteligente) this.charts.fluxoInteligente.destroy();
        this.charts.fluxoInteligente = new ApexCharts(document.querySelector("#chart-fluxo-inteligente"), options);
        this.charts.fluxoInteligente.render();
    }

    // === FASE 3: ANÁLISE PREDITIVA DE INADIMPLÊNCIA ===
    loadAnalisePreditivaInadimplencia() {
        const analiseInadimplencia = this.calcularRiscoInadimplencia();
        this.renderAnaliseInadimplencia(analiseInadimplencia);
    }

    calcularRiscoInadimplencia() {
        // Simulação de algoritmo de machine learning para prever inadimplência
        const clientes = [
            {
                nome: 'XYZ Consultoria Ltda',
                contasAbertas: 2,
                valorTotal: 15000.00,
                diasAtraso: 0,
                historicoPagamentos: 95, // % pontualidade
                scorePreditivo: 85,
                risco: 'baixo',
                probabilidadeInadimplencia: 15,
                fatoresRisco: ['Histórico excelente', 'Cliente antigo'],
                recomendacoes: ['Manter relacionamento atual']
            },
            {
                nome: 'Comércio ABC Ltda',
                contasAbertas: 3,
                valorTotal: 8500.00,
                diasAtraso: 5,
                historicoPagamentos: 78,
                scorePreditivo: 65,
                risco: 'medio',
                probabilidadeInadimplencia: 35,
                fatoresRisco: ['Atraso recente', 'Histórico irregular'],
                recomendacoes: ['Monitorar de perto', 'Contato preventivo']
            },
            {
                nome: 'Startup Tech Ltda',
                contasAbertas: 1,
                valorTotal: 5200.00,
                diasAtraso: 12,
                historicoPagamentos: 60,
                scorePreditivo: 40,
                risco: 'alto',
                probabilidadeInadimplencia: 65,
                fatoresRisco: ['Atraso significativo', 'Empresa jovem', 'Pagamentos irregulares'],
                recomendacoes: ['Ação imediata', 'Renegociar condições', 'Considerar cobrança']
            },
            {
                nome: 'Digital Solutions Inc',
                contasAbertas: 2,
                valorTotal: 12000.00,
                diasAtraso: 0,
                historicoPagamentos: 88,
                scorePreditivo: 75,
                risco: 'baixo',
                probabilidadeInadimplencia: 22,
                fatoresRisco: ['Bom histórico', 'Empresa sólida'],
                recomendacoes: ['Cliente confiável']
            }
        ];

        const resumoRisco = {
            totalExposicao: clientes.reduce((acc, c) => acc + c.valorTotal, 0),
            riscoAlto: clientes.filter(c => c.risco === 'alto').length,
            riscoMedio: clientes.filter(c => c.risco === 'medio').length,
            riscoBaixo: clientes.filter(c => c.risco === 'baixo').length,
            valorRiscoAlto: clientes.filter(c => c.risco === 'alto').reduce((acc, c) => acc + c.valorTotal, 0),
            probabilidadeMedia: clientes.reduce((acc, c) => acc + c.probabilidadeInadimplencia, 0) / clientes.length
        };

        return {
            clientes: clientes,
            resumo: resumoRisco,
            alertasCriticos: this.identificarAlertasCriticos(clientes),
            acoesSugeridas: this.gerarAcoesPrevencao(clientes)
        };
    }

    identificarAlertasCriticos(clientes) {
        const alertas = [];
        
        clientes.forEach(cliente => {
            if (cliente.risco === 'alto') {
                alertas.push({
                    tipo: 'critico',
                    cliente: cliente.nome,
                    valor: cliente.valorTotal,
                    message: `Alto risco: ${cliente.probabilidadeInadimplencia}% chance de inadimplência`
                });
            }
            
            if (cliente.diasAtraso > 7) {
                alertas.push({
                    tipo: 'atraso',
                    cliente: cliente.nome,
                    dias: cliente.diasAtraso,
                    message: `${cliente.diasAtraso} dias de atraso`
                });
            }
        });
        
        return alertas;
    }

    gerarAcoesPrevencao(clientes) {
        const acoes = [];
        
        // Ações baseadas no perfil de risco
        const clientesAltoRisco = clientes.filter(c => c.risco === 'alto');
        if (clientesAltoRisco.length > 0) {
            acoes.push({
                prioridade: 'alta',
                titulo: 'Revisão de Clientes Alto Risco',
                descricao: `${clientesAltoRisco.length} cliente(s) necessitam atenção imediata`,
                valorImpacto: clientesAltoRisco.reduce((acc, c) => acc + c.valorTotal, 0)
            });
        }
        
        const clientesAtraso = clientes.filter(c => c.diasAtraso > 0);
        if (clientesAtraso.length > 0) {
            acoes.push({
                prioridade: 'media',
                titulo: 'Contato Preventivo',
                descricao: `${clientesAtraso.length} cliente(s) com atraso precisam de contato`,
                valorImpacto: clientesAtraso.reduce((acc, c) => acc + c.valorTotal, 0)
            });
        }
        
        return acoes;
    }

    renderAnaliseInadimplencia(analiseData) {
        const container = document.getElementById('analise-inadimplencia') || this.createInadimplenciaContainer();
        
        container.innerHTML = `
            <div class="inadimplencia-resumo">
                <div class="resumo-risco">
                    <div class="risco-card total">
                        <h5>💰 Exposição Total</h5>
                        <div class="valor-risco">${this.formatCurrency(analiseData.resumo.totalExposicao)}</div>
                    </div>
                    
                    <div class="risco-card alto">
                        <h5>🔴 Alto Risco</h5>
                        <div class="quantidade-risco">${analiseData.resumo.riscoAlto} clientes</div>
                        <div class="valor-risco">${this.formatCurrency(analiseData.resumo.valorRiscoAlto)}</div>
                    </div>
                    
                    <div class="risco-card medio">
                        <h5>🟡 Médio Risco</h5>
                        <div class="quantidade-risco">${analiseData.resumo.riscoMedio} clientes</div>
                    </div>
                    
                    <div class="risco-card baixo">
                        <h5>🟢 Baixo Risco</h5>
                        <div class="quantidade-risco">${analiseData.resumo.riscoBaixo} clientes</div>
                    </div>
                </div>
            </div>
            
            ${analiseData.alertasCriticos.length > 0 ? `
                <div class="inadimplencia-alertas">
                    <h4>🚨 Alertas Críticos</h4>
                    <div class="alertas-criticos-list">
                        ${analiseData.alertasCriticos.map(alerta => `
                            <div class="alerta-critico ${alerta.tipo}">
                                <strong>${alerta.cliente}</strong>
                                <span>${alerta.message}</span>
                                ${alerta.valor ? `<span class="valor-risco">${this.formatCurrency(alerta.valor)}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="clientes-analise">
                <h4>👥 Análise Detalhada por Cliente</h4>
                <div class="clientes-grid">
                    ${analiseData.clientes.map(cliente => `
                        <div class="cliente-card risco-${cliente.risco}">
                            <div class="cliente-header">
                                <h5>${cliente.nome}</h5>
                                <span class="risco-badge risco-${cliente.risco}">${cliente.risco.toUpperCase()}</span>
                            </div>
                            
                            <div class="cliente-metricas">
                                <div class="metrica">
                                    <span>Valor em Aberto:</span>
                                    <strong>${this.formatCurrency(cliente.valorTotal)}</strong>
                                </div>
                                <div class="metrica">
                                    <span>Score Preditivo:</span>
                                    <strong>${cliente.scorePreditivo}/100</strong>
                                </div>
                                <div class="metrica">
                                    <span>Prob. Inadimplência:</span>
                                    <strong class="prob-${cliente.risco}">${cliente.probabilidadeInadimplencia}%</strong>
                                </div>
                            </div>
                            
                            <div class="fatores-risco">
                                <h6>Fatores de Risco:</h6>
                                <ul>
                                    ${cliente.fatoresRisco.map(fator => `<li>${fator}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div class="recomendacoes">
                                <h6>Recomendações:</h6>
                                <ul>
                                    ${cliente.recomendacoes.map(rec => `<li>${rec}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div class="cliente-acoes">
                                <button class="btn btn-sm btn-primary" onclick="app.contatarCliente('${cliente.nome}')">
                                    📞 Contatar
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="app.verHistoricoCliente('${cliente.nome}')">
                                    📊 Histórico
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${analiseData.acoesSugeridas.length > 0 ? `
                <div class="acoes-prevencao">
                    <h4>💡 Ações Preventivas Sugeridas</h4>
                    <div class="acoes-list">
                        ${analiseData.acoesSugeridas.map(acao => `
                            <div class="acao-item prioridade-${acao.prioridade}">
                                <h5>${acao.titulo}</h5>
                                <p>${acao.descricao}</p>
                                <small>Impacto: ${this.formatCurrency(acao.valorImpacto)}</small>
                                <button class="btn btn-sm btn-primary" onclick="app.executarAcao('${acao.titulo}')">
                                    ⚡ Executar
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderAnaliseInteligente(data) {
        const container = document.getElementById('inteligente-content');
        if (!container) return;
        
        container.innerHTML = `
            <div class="inteligente-dashboard">
                <!-- Resumo Executivo IA -->
                <div class="ia-resumo-executivo">
                    <div class="ia-card principal">
                        <div class="ia-header">
                            <h4>🧠 Análise Inteligente - Resumo Executivo</h4>
                            <span class="ia-status ativa">IA Ativa</span>
                        </div>
                        <div class="ia-insights">
                            <div class="insight-item">
                                <strong>Recomendação Principal:</strong>
                                ${data.previsoesMachineLearning.recomendacaoIA.recomendacao}
                                <span class="confianca">${data.previsoesMachineLearning.recomendacaoIA.confianca}% confiança</span>
                            </div>
                            <div class="insight-item">
                                <strong>Tendência de Mercado:</strong>
                                ${data.analiseComportamental.clientes.crescimentoMedio > 0 ? 'Expansão' : 'Contração'} 
                                (${data.analiseComportamental.clientes.crescimentoMedio.toFixed(1)}% médio)
                            </div>
                            <div class="insight-item">
                                <strong>Risco Operacional:</strong>
                                ${data.analiseComportamental.fornecedores.volatilidade > 10 ? 'Alto' : 'Baixo'}
                                (Volatilidade: ${data.analiseComportamental.fornecedores.volatilidade.toFixed(1)}%)
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Machine Learning Predictions -->
                <div class="ia-section">
                    <h3>🤖 Previsões Machine Learning - Próximos 6 Meses</h3>
                    <div class="ml-previsoes">
                        <div class="cenarios-tabs">
                            <button class="cenario-tab active" data-cenario="base">📊 Cenário Base</button>
                            <button class="cenario-tab" data-cenario="otimista">📈 Otimista (+20%)</button>
                            <button class="cenario-tab" data-cenario="conservador">📉 Conservador (-10%)</button>
                            <button class="cenario-tab" data-cenario="pessimista">⚠️ Pessimista (-20%)</button>
                        </div>
                        
                        <div class="previsoes-grid" id="previsoes-container">
                            ${data.previsoesMachineLearning.projecoes.map((p, index) => `
                                <div class="previsao-card ${index < 2 ? 'alta-confianca' : index < 4 ? 'media-confianca' : 'baixa-confianca'}">
                                    <div class="previsao-mes">${p.mes}</div>
                                    <div class="previsao-valores">
                                        <div class="valor-entrada">
                                            <span>Entradas:</span>
                                            <strong class="positivo">${this.formatCurrency(p.entradaProjetada)}</strong>
                                        </div>
                                        <div class="valor-saida">
                                            <span>Saídas:</span>
                                            <strong class="negativo">${this.formatCurrency(p.saidaProjetada)}</strong>
                                        </div>
                                        <div class="valor-saldo">
                                            <span>Saldo:</span>
                                            <strong class="${p.saldoProjetado > 0 ? 'positivo' : 'negativo'}">
                                                ${this.formatCurrency(p.saldoProjetado)}
                                            </strong>
                                        </div>
                                    </div>
                                    <div class="confianca-ia">
                                        <div class="confianca-bar">
                                            <div class="confianca-fill" style="width: ${p.confianca}%"></div>
                                        </div>
                                        <span>${p.confianca}% confiança</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Análise Comportamental -->
                <div class="ia-section">
                    <h3>📊 Análise Comportamental Transacional</h3>
                    <div class="comportamental-grid">
                        <div class="comportamento-card fornecedores">
                            <h4>💸 Padrão de Gastos</h4>
                            <div class="comportamento-metricas">
                                <div class="metrica">
                                    <span>Frequência Média:</span>
                                    <strong>${data.analiseComportamental.fornecedores.frecuenciaMedia.toFixed(1)} transações/mês</strong>
                                </div>
                                <div class="metrica">
                                    <span>Ticket Médio:</span>
                                    <strong>${this.formatCurrency(data.analiseComportamental.fornecedores.ticketMedio)}</strong>
                                </div>
                                <div class="metrica">
                                    <span>Crescimento Médio:</span>
                                    <strong class="${data.analiseComportamental.fornecedores.crescimentoMedio >= 0 ? 'negativo' : 'positivo'}">
                                        ${data.analiseComportamental.fornecedores.crescimentoMedio.toFixed(1)}%
                                    </strong>
                                </div>
                                <div class="metrica">
                                    <span>Volatilidade:</span>
                                    <strong class="${data.analiseComportamental.fornecedores.volatilidade > 10 ? 'alta' : 'baixa'}">
                                        ${data.analiseComportamental.fornecedores.volatilidade.toFixed(1)}%
                                    </strong>
                                </div>
                            </div>
                            <div class="extremos">
                                <div class="extremo estavel">
                                    <span>➕ Mais Estável:</span>
                                    <strong>${data.analiseComportamental.fornecedores.fornecedorMaisEstavel.nome}</strong>
                                    <small>${data.analiseComportamental.fornecedores.fornecedorMaisEstavel.crescimento.toFixed(1)}%</small>
                                </div>
                                <div class="extremo volatil">
                                    <span>⚠️ Mais Volátil:</span>
                                    <strong>${data.analiseComportamental.fornecedores.fornecedorMaisVolatil.nome}</strong>
                                    <small>${data.analiseComportamental.fornecedores.fornecedorMaisVolatil.crescimento.toFixed(1)}%</small>
                                </div>
                            </div>
                        </div>

                        <div class="comportamento-card clientes">
                            <h4>💰 Padrão de Receitas</h4>
                            <div class="comportamento-metricas">
                                <div class="metrica">
                                    <span>Frequência Média:</span>
                                    <strong>${data.analiseComportamental.clientes.frecuenciaMedia.toFixed(1)} transações/mês</strong>
                                </div>
                                <div class="metrica">
                                    <span>Ticket Médio:</span>
                                    <strong>${this.formatCurrency(data.analiseComportamental.clientes.ticketMedio)}</strong>
                                </div>
                                <div class="metrica">
                                    <span>Crescimento Médio:</span>
                                    <strong class="${data.analiseComportamental.clientes.crescimentoMedio >= 0 ? 'positivo' : 'negativo'}">
                                        ${data.analiseComportamental.clientes.crescimentoMedio.toFixed(1)}%
                                    </strong>
                                </div>
                                <div class="metrica">
                                    <span>Volatilidade:</span>
                                    <strong class="${data.analiseComportamental.clientes.volatilidade > 10 ? 'alta' : 'baixa'}">
                                        ${data.analiseComportamental.clientes.volatilidade.toFixed(1)}%
                                    </strong>
                                </div>
                            </div>
                            <div class="extremos">
                                <div class="extremo estavel">
                                    <span>➕ Mais Estável:</span>
                                    <strong>${data.analiseComportamental.clientes.clienteMaisEstavel.nome}</strong>
                                    <small>${data.analiseComportamental.clientes.clienteMaisEstavel.crescimento.toFixed(1)}%</small>
                                </div>
                                <div class="extremo volatil">
                                    <span>📈 Maior Crescimento:</span>
                                    <strong>${data.analiseComportamental.clientes.clienteMaisVolatil.nome}</strong>
                                    <small>+${data.analiseComportamental.clientes.clienteMaisVolatil.crescimento.toFixed(1)}%</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Insights Comportamentais -->
                    ${data.analiseComportamental.insights.length > 0 ? `
                        <div class="insights-comportamentais">
                            <h4>🔍 Insights Descobertos pela IA</h4>
                            <div class="insights-list">
                                ${data.analiseComportamental.insights.map(insight => `
                                    <div class="insight-card ${insight.tipo}">
                                        <div class="insight-header">
                                            <span class="insight-tipo">${insight.categoria}</span>
                                            <span class="insight-tag ${insight.tipo}">${insight.tipo.toUpperCase()}</span>
                                        </div>
                                        <p>${insight.insight}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Otimizações Automáticas -->
                <div class="ia-section">
                    <h3>⚡ Otimizações Inteligentes Sugeridas</h3>
                    <div class="otimizacoes-grid">
                        ${data.otimizacaoAutomatica.map(opt => `
                            <div class="otimizacao-card prioridade-${opt.prioridade}">
                                <div class="otimizacao-header">
                                    <h5>${opt.acao}</h5>
                                    <span class="prioridade-badge ${opt.prioridade}">${opt.prioridade.toUpperCase()}</span>
                                </div>
                                <div class="otimizacao-detalhes">
                                    <div class="detalhe-item">
                                        <span>🎯 Alvo:</span>
                                        <strong>${opt.alvo}</strong>
                                    </div>
                                    <div class="detalhe-item">
                                        <span>📈 Impacto:</span>
                                        <strong class="positivo">${this.formatCurrency(opt.impactoEstimado)}</strong>
                                    </div>
                                    <div class="detalhe-item">
                                        <span>⏱️ Prazo:</span>
                                        <strong>${opt.prazo}</strong>
                                    </div>
                                    <div class="detalhe-item">
                                        <span>📋 Categoria:</span>
                                        <strong>${opt.categoria}</strong>
                                    </div>
                                </div>
                                <div class="otimizacao-acoes">
                                    <button class="btn btn-sm btn-primary" onclick="app.executarOtimizacao('${opt.tipo}', '${opt.alvo}')">
                                        ⚡ Executar
                                    </button>
                                    <button class="btn btn-sm btn-secondary" onclick="app.agendarOtimizacao('${opt.tipo}', '${opt.alvo}')">
                                        📅 Agendar
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Alertas Inteligentes -->
                ${data.alertasInteligentes.length > 0 ? `
                    <div class="ia-section">
                        <h3>🚨 Alertas Inteligentes</h3>
                        <div class="alertas-inteligentes">
                            ${data.alertasInteligentes.map(alerta => `
                                <div class="alerta-inteligente ${alerta.urgencia}">
                                    <div class="alerta-header">
                                        <span class="alerta-tipo">${alerta.tipo.toUpperCase()}</span>
                                        <span class="urgencia-badge ${alerta.urgencia}">${alerta.urgencia.toUpperCase()}</span>
                                    </div>
                                    <div class="alerta-content">
                                        <strong>${alerta.entidade}</strong> - ${alerta.categoria}
                                        <p>${alerta.problema}</p>
                                        <div class="acao-sugerida">
                                            <strong>Ação:</strong> ${alerta.acao}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Recomendações Estratégicas IA -->
                ${data.recomendacoesStrategicas.length > 0 ? `
                    <div class="ia-section">
                        <h3>🎯 Recomendações Estratégicas IA</h3>
                        <div class="recomendacoes-estrategicas">
                            ${data.recomendacoesStrategicas.map(rec => `
                                <div class="recomendacao-estrategica ${rec.tipo}">
                                    <div class="rec-header">
                                        <h4>${rec.titulo}</h4>
                                        <div class="rec-badges">
                                            <span class="impacto-badge ${rec.impacto.toLowerCase()}">${rec.impacto} Impacto</span>
                                            <span class="prazo-badge">${rec.prazo}</span>
                                        </div>
                                    </div>
                                    <p class="rec-descricao">${rec.descricao}</p>
                                    <div class="rec-acoes-lista">
                                        <strong>Ações Recomendadas:</strong>
                                        <ul>
                                            ${rec.acoes.map(acao => `<li>${acao}</li>`).join('')}
                                        </ul>
                                    </div>
                                    <div class="rec-botoes">
                                        <button class="btn btn-primary" onclick="app.implementarRecomendacao('${rec.tipo}')">
                                            🚀 Implementar
                                        </button>
                                        <button class="btn btn-secondary" onclick="app.estudarRecomendacao('${rec.tipo}')">
                                            📊 Estudar Impacto
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Fluxo de Caixa Inteligente (Integrado) -->
                <div class="ia-section">
                    <h3>💰 Fluxo de Caixa Inteligente</h3>
                    <div id="fluxo-caixa-ia-container">
                        <!-- Container será preenchido pela função existente -->
                    </div>
                </div>

                <!-- Centro de Controle IA -->
                <div class="ia-centro-controle">
                    <h3>🎛️ Centro de Controle IA</h3>
                    <div class="controle-grid">
                        <button class="btn-controle principal" onclick="app.executarAnaliseCompleta()">
                            🔄 Executar Análise Completa
                        </button>
                        <button class="btn-controle" onclick="app.configurarIA()">
                            ⚙️ Configurar IA
                        </button>
                        <button class="btn-controle" onclick="app.exportarAnaliseIA()">
                            📊 Exportar Análise IA
                        </button>
                        <button class="btn-controle" onclick="app.agendarAnaliseAutomatica()">
                            ⏰ Análise Automática
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Configurar tabs de cenários
        this.setupCenariosIA(data);
        
        // Renderizar fluxo de caixa integrado
        const fluxoContainer = document.getElementById('fluxo-caixa-ia-container');
        if (fluxoContainer) {
            const fluxoInteligente = this.calcularFluxoCaixaInteligente();
            fluxoContainer.innerHTML = this.renderFluxoCaixaInteligenteSimplificado(fluxoInteligente);
        }
    }

    setupCenariosIA(data) {
        const tabBtns = document.querySelectorAll('.cenario-tab');
        const container = document.getElementById('previsoes-container');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active de todos
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const cenario = btn.dataset.cenario;
                let dadosCenario = data.previsoesMachineLearning.projecoes;
                
                if (cenario !== 'base') {
                    dadosCenario = data.previsoesMachineLearning.cenarios[cenario];
                }
                
                // Atualizar container com dados do cenário selecionado
                container.innerHTML = dadosCenario.map((p, index) => `
                    <div class="previsao-card ${index < 2 ? 'alta-confianca' : index < 4 ? 'media-confianca' : 'baixa-confianca'}">
                        <div class="previsao-mes">${p.mes}</div>
                        <div class="previsao-valores">
                            <div class="valor-entrada">
                                <span>Entradas:</span>
                                <strong class="positivo">${this.formatCurrency(p.entradaProjetada)}</strong>
                            </div>
                            <div class="valor-saida">
                                <span>Saídas:</span>
                                <strong class="negativo">${this.formatCurrency(p.saidaProjetada)}</strong>
                            </div>
                            <div class="valor-saldo">
                                <span>Saldo:</span>
                                <strong class="${(p.entradaProjetada - p.saidaProjetada) > 0 ? 'positivo' : 'negativo'}">
                                    ${this.formatCurrency(p.entradaProjetada - p.saidaProjetada)}
                                </strong>
                            </div>
                        </div>
                        <div class="confianca-ia">
                            <div class="confianca-bar">
                                <div class="confianca-fill" style="width: ${p.confianca || 85}%"></div>
                            </div>
                            <span>${p.confianca || 85}% confiança</span>
                            ${cenario !== 'base' ? `<small class="cenario-label">${cenario}</small>` : ''}
                        </div>
                    </div>
                `).join('');
            });
        });
    }

    renderFluxoCaixaInteligenteSimplificado(fluxoData) {
        return `
            <div class="fluxo-ia-resumo">
                <div class="fluxo-card">
                    <h5>💰 Saldo Atual</h5>
                    <div class="valor-principal">${this.formatCurrency(fluxoData.saldoAtual)}</div>
                </div>
                <div class="fluxo-card">
                    <h5>📊 Menor Saldo (30 dias)</h5>
                    <div class="valor-principal ${Math.min(...fluxoData.proximosDias.map(d => d.saldoAcumulado)) > 0 ? 'positivo' : 'negativo'}">
                        ${this.formatCurrency(Math.min(...fluxoData.proximosDias.map(d => d.saldoAcumulado)))}
                    </div>
                </div>
                <div class="fluxo-card">
                    <h5>🎯 Projeção (30 dias)</h5>
                    <div class="valor-principal ${fluxoData.proximosDias[29].saldoAcumulado > 0 ? 'positivo' : 'negativo'}">
                        ${this.formatCurrency(fluxoData.proximosDias[29].saldoAcumulado)}
                    </div>
                </div>
            </div>
            ${fluxoData.recomendacoes.length > 0 ? `
                <div class="fluxo-recomendacoes-rapidas">
                    <strong>💡 Recomendações Rápidas:</strong>
                    ${fluxoData.recomendacoes.slice(0, 2).map(rec => `
                        <div class="rec-rapida ${rec.tipo}">
                            ${rec.descricao}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    createInadimplenciaContainer() {
        const container = document.createElement('div');
        container.id = 'analise-inadimplencia';
        container.className = 'analise-container';
        
        // Adicionar após fluxo de caixa inteligente
        const fluxoContainer = document.getElementById('fluxo-caixa-inteligente');
        if (fluxoContainer && fluxoContainer.parentNode) {
            fluxoContainer.parentNode.insertBefore(container, fluxoContainer.nextSibling);
        }
        
        return container;
    }

    // === MÉTODOS DE AÇÃO PARA AS NOVAS FUNCIONALIDADES ===
    showTab(tabId) {
        document.querySelector(`[data-tab="${tabId}"]`).click();
    }

    async editarOrcamento() {
        this.showInfo('Funcionalidade de edição de orçamento será implementada em breve');
    }

    async projetarOrcamento() {
        this.showInfo('Projeção automática de orçamento será implementada em breve');
    }

    async contatarCliente(nomeCliente) {
        const result = await Swal.fire({
            title: `Contatar ${nomeCliente}`,
            html: `
                <div class="swal-form">
                    <div class="swal-form-group">
                        <label>Tipo de contato:</label>
                        <select id="tipo-contato" class="swal2-input">
                            <option value="preventivo">Contato Preventivo</option>
                            <option value="cobranca">Cobrança Amigável</option>
                            <option value="renegociacao">Renegociação</option>
                        </select>
                    </div>
                    <div class="swal-form-group">
                        <label>Observações:</label>
                        <textarea id="obs-contato" class="swal2-textarea" placeholder="Adicione observações sobre o contato..."></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Registrar Contato',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            this.showSuccess(`Contato com ${nomeCliente} registrado com sucesso!`);
        }
    }

    async verHistoricoCliente(nomeCliente) {
        // Simular histórico do cliente
        const historico = [
            { data: '2024-11-15', evento: 'Pagamento realizado', valor: 2500.00 },
            { data: '2024-10-20', evento: 'Fatura emitida', valor: -2500.00 },
            { data: '2024-10-18', evento: 'Contato preventivo', valor: 0 },
            { data: '2024-09-25', evento: 'Pagamento com atraso', valor: 1800.00 }
        ];

        await Swal.fire({
            title: `Histórico - ${nomeCliente}`,
            html: `
                <div class="historico-cliente">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--bg-tertiary);">
                                <th style="padding: 8px; border: 1px solid var(--border-color);">Data</th>
                                <th style="padding: 8px; border: 1px solid var(--border-color);">Evento</th>
                                <th style="padding: 8px; border: 1px solid var(--border-color);">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historico.map(h => `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid var(--border-color);">${this.formatDate(h.data)}</td>
                                    <td style="padding: 8px; border: 1px solid var(--border-color);">${h.evento}</td>
                                    <td style="padding: 8px; border: 1px solid var(--border-color); color: ${h.valor > 0 ? 'var(--success-color)' : h.valor < 0 ? 'var(--danger-color)' : 'var(--text-primary)'};">
                                        ${h.valor !== 0 ? this.formatCurrency(Math.abs(h.valor)) : '-'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `,
            width: '80%',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            confirmButtonText: 'Fechar'
        });
    }

    async executarAcao(tituloAcao) {
        this.showInfo(`Executando ação: ${tituloAcao}`);
    }

    // === MÉTODOS PARA ORÇAMENTO ===
    async editarOrcamentoDetalhado() {
        this.showInfo('Editor de orçamento detalhado será implementado em breve');
    }

    async exportarOrcamento() {
        this.showInfo('Exportando relatório orçamentário...');
        // Simular exportação
        setTimeout(() => {
            this.showSuccess('Relatório orçamentário exportado com sucesso!');
        }, 2000);
    }

    async configurarAlertasOrcamento() {
        const result = await Swal.fire({
            title: 'Configurar Alertas de Orçamento',
            html: `
                <div class="swal-form">
                    <div class="swal-form-group">
                        <label>Limite de alerta (%)</label>
                        <input id="limite-alerta" type="number" value="90" min="50" max="100" class="swal2-input">
                    </div>
                    <div class="swal-form-group">
                        <label>Notificação por email</label>
                        <select id="email-alerta" class="swal2-input">
                            <option value="diario">Diário</option>
                            <option value="semanal" selected>Semanal</option>
                            <option value="mensal">Mensal</option>
                        </select>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Salvar Configurações',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            this.showSuccess('Alertas de orçamento configurados com sucesso!');
        }
    }

    // === MÉTODOS PARA IA ===
    async executarOtimizacao(tipo, alvo) {
        this.showInfo(`Executando otimização ${tipo} para ${alvo}...`);
        
        // Simular execução
        setTimeout(() => {
            this.showSuccess(`Otimização ${tipo} iniciada para ${alvo}!`);
        }, 1500);
    }

    async agendarOtimizacao(tipo, alvo) {
        const result = await Swal.fire({
            title: `Agendar Otimização - ${alvo}`,
            html: `
                <div class="swal-form">
                    <div class="swal-form-group">
                        <label>Data para execução:</label>
                        <input id="data-otimizacao" type="date" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="swal-form-group">
                        <label>Observações:</label>
                        <textarea id="obs-otimizacao" class="swal2-textarea" placeholder="Adicione observações sobre a otimização..."></textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Agendar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            this.showSuccess(`Otimização ${tipo} agendada para ${alvo}!`);
        }
    }

    async implementarRecomendacao(tipo) {
        this.showInfo(`Implementando recomendação ${tipo}...`);
        
        // Simular implementação
        setTimeout(() => {
            this.showSuccess(`Recomendação ${tipo} implementada com sucesso!`);
        }, 2000);
    }

    async estudarRecomendacao(tipo) {
        await Swal.fire({
            title: `Estudo de Impacto - ${tipo}`,
            html: `
                <div class="estudo-impacto">
                    <h4>📊 Análise de Viabilidade</h4>
                    <div class="impacto-grid">
                        <div class="impacto-item positivo">
                            <strong>Benefícios Esperados:</strong>
                            <ul>
                                <li>Redução de custos operacionais</li>
                                <li>Melhoria na eficiência</li>
                                <li>Maior previsibilidade financeira</li>
                            </ul>
                        </div>
                        <div class="impacto-item neutro">
                            <strong>Recursos Necessários:</strong>
                            <ul>
                                <li>Tempo de implementação: 30-60 dias</li>
                                <li>Equipe: 2-3 pessoas</li>
                                <li>Orçamento: R$ 5.000 - R$ 15.000</li>
                            </ul>
                        </div>
                        <div class="impacto-item negativo">
                            <strong>Riscos Identificados:</strong>
                            <ul>
                                <li>Resistência à mudança</li>
                                <li>Período de adaptação</li>
                                <li>Custos iniciais de transição</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `,
            width: '80%',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            confirmButtonText: 'Fechar Estudo'
        });
    }

    async executarAnaliseCompleta() {
        this.showInfo('Executando análise completa da IA...');
        
        // Simular análise completa
        setTimeout(() => {
            this.showSuccess('Análise completa finalizada! Novos insights disponíveis.');
            // Recarregar dados da aba inteligente
            this.loadAnaliseInteligente();
        }, 3000);
    }

    async configurarIA() {
        const result = await Swal.fire({
            title: 'Configurações da IA',
            html: `
                <div class="swal-form">
                    <div class="swal-form-group">
                        <label>Frequência de análise automática:</label>
                        <select id="freq-ia" class="swal2-input">
                            <option value="diario">Diário</option>
                            <option value="semanal" selected>Semanal</option>
                            <option value="mensal">Mensal</option>
                        </select>
                    </div>
                    <div class="swal-form-group">
                        <label>Nível de sensibilidade dos alertas:</label>
                        <select id="sensibilidade-ia" class="swal2-input">
                            <option value="baixa">Baixa</option>
                            <option value="media" selected>Média</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>
                    <div class="swal-form-group">
                        <label>
                            <input type="checkbox" id="auto-otimizacao" checked>
                            Permitir otimizações automáticas
                        </label>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Salvar Configurações',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            this.showSuccess('Configurações da IA atualizadas com sucesso!');
        }
    }

    async exportarAnaliseIA() {
        this.showInfo('Gerando relatório completo da análise IA...');
        
        // Simular exportação
        setTimeout(() => {
            this.showSuccess('Relatório de análise IA exportado com sucesso!');
        }, 2500);
    }

    async agendarAnaliseAutomatica() {
        const result = await Swal.fire({
            title: 'Análise Automática IA',
            html: `
                <div class="swal-form">
                    <div class="swal-form-group">
                        <label>Horário para análise diária:</label>
                        <input id="horario-ia" type="time" value="09:00" class="swal2-input">
                    </div>
                    <div class="swal-form-group">
                        <label>Dias da semana:</label>
                        <div style="text-align: left;">
                            <label><input type="checkbox" checked> Segunda</label><br>
                            <label><input type="checkbox" checked> Terça</label><br>
                            <label><input type="checkbox" checked> Quarta</label><br>
                            <label><input type="checkbox" checked> Quinta</label><br>
                            <label><input type="checkbox" checked> Sexta</label><br>
                            <label><input type="checkbox"> Sábado</label><br>
                            <label><input type="checkbox"> Domingo</label>
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Ativar Análise Automática',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)'
        });

        if (result.isConfirmed) {
            this.showSuccess('Análise automática da IA configurada com sucesso!');
        }
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