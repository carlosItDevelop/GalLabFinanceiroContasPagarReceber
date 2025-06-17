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
                }                return {
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
            if (Replaced the loadOrcamentoCompleto function with the provided code to implement the three cards of orçamento.