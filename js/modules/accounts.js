// Módulo para gestão de contas a pagar e receber
import { Formatters } from '../utils/formatters.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { LoadingManager } from '../utils/loading-manager.js';
import { FormValidator } from '../utils/form-validator.js';

export class AccountsManager {
    constructor(api) {
        this.api = api;
        this.editingType = null;
        this.editingId = null;
        this.loadingManager = new LoadingManager();
        this.formValidator = null;
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
    }

    setupEventListeners() {
        // Filtros das tabelas
        this.setupFilter('filtro-pagar', 'tabela-contas-pagar');
        this.setupFilter('filtro-receber', 'tabela-contas-receber');

        // Botões de ação
        this.setupActionButtons();
    }

    setupFilter(inputId, tableId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', 
                Formatters.debounce(() => {
                    this.filterTable(tableId, input.value);
                }, 300)
            );
        }
    }

    setupActionButtons() {
        // Botões para adicionar nova conta
        // Corrigir seletores para os IDs reais no HTML
        const btnNovaPagar = document.getElementById('nova-conta-pagar');
        const btnNovaReceber = document.getElementById('nova-conta-receber');

        if (btnNovaPagar) {
            btnNovaPagar.addEventListener('click', () => this.openModal('pagar'));
        }

        if (btnNovaReceber) {
            btnNovaReceber.addEventListener('click', () => this.openModal('receber'));
        }

        // Event delegation para botões das tabelas
        document.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;
            const type = button.dataset.type;

            switch (action) {
                case 'edit':
                    this.editConta(id, type);
                    break;
                case 'delete':
                    this.deleteConta(id, type);
                    break;
                case 'pay':
                    this.markAsPaid(id, type);
                    break;
            }
        });
        
        // Event listener para formulário será gerenciado pelo FormValidator
    }

    async loadContasPagar(filtros = {}) {
        try {
            this.loadingManager.showTable('tabela-contas-pagar', 'Carregando contas a pagar...');
            
            const contas = await ErrorHandler.withRetry(
                () => this.api.getContasPagar(filtros),
                3,
                1000
            );
            
            this.renderContasPagar(contas);
            ErrorHandler.showSuccess(`${contas.length} contas a pagar carregadas`);
        } catch (error) {
            await ErrorHandler.handleApiError(error, 'contas a pagar');
            this.showTableError('tabela-contas-pagar', 'Erro ao carregar contas a pagar');
        } finally {
            this.loadingManager.hideTable('tabela-contas-pagar');
        }
    }

    async loadContasReceber(filtros = {}) {
        try {
            this.loadingManager.showTable('tabela-contas-receber', 'Carregando contas a receber...');
            
            const contas = await ErrorHandler.withRetry(
                () => this.api.getContasReceber(filtros),
                3,
                1000
            );
            
            this.renderContasReceber(contas);
            ErrorHandler.showSuccess(`${contas.length} contas a receber carregadas`);
        } catch (error) {
            await ErrorHandler.handleApiError(error, 'contas a receber');
            this.showTableError('tabela-contas-receber', 'Erro ao carregar contas a receber');
        } finally {
            this.loadingManager.hideTable('tabela-contas-receber');
        }
    }

    renderContasPagar(contas) {
        const tbody = document.querySelector('#tabela-contas-pagar tbody');
        if (!tbody) return;

        if (!contas || contas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            📄 Nenhuma conta a pagar encontrada
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = contas.map(conta => this.renderContaRow(conta, 'pagar')).join('');
    }

    renderContasReceber(contas) {
        const tbody = document.querySelector('#tabela-contas-receber tbody');
        if (!tbody) return;

        if (!contas || contas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            📄 Nenhuma conta a receber encontrada
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = contas.map(conta => this.renderContaRow(conta, 'receber')).join('');
    }

    renderContaRow(conta, tipo) {
        const statusClass = this.getStatusClass(conta.status);
        const entityName = tipo === 'pagar' ? conta.fornecedor_nome : conta.cliente_nome;
        
        return `
            <tr data-id="${conta.id}">
                <td>
                    <div class="conta-info">
                        <div class="conta-descricao">${Formatters.sanitizeHTML(conta.descricao)}</div>
                        <div class="conta-entity">${Formatters.sanitizeHTML(entityName || 'N/A')}</div>
                    </div>
                </td>
                <td>
                    <span class="badge badge-${statusClass}">${this.getStatusText(conta.status)}</span>
                </td>
                <td class="text-right">
                    ${Formatters.formatCurrency(conta.valor_original)}
                </td>
                <td class="text-right">
                    ${Formatters.formatDate(conta.data_vencimento)}
                </td>
                <td>
                    ${conta.categoria_nome ? 
                        `<span class="categoria-tag" style="background-color: ${Formatters.validateColor(conta.categoria_cor)}">${conta.categoria_nome}</span>` : 
                        '<span class="text-muted">Sem categoria</span>'
                    }
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" data-action="edit" data-id="${conta.id}" data-type="${tipo}" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-action btn-delete" data-action="delete" data-id="${conta.id}" data-type="${tipo}" title="Excluir">
                            🗑️
                        </button>
                        ${conta.status === 'pendente' ? 
                            `<button class="btn-action btn-pay" data-action="pay" data-id="${conta.id}" data-type="${tipo}" title="Marcar como ${tipo === 'pagar' ? 'pago' : 'recebido'}">
                                ${tipo === 'pagar' ? '💰' : '💵'}
                            </button>` : ''
                        }
                    </div>
                </td>
            </tr>
        `;
    }

    getStatusClass(status) {
        const statusMap = {
            'pendente': 'warning',
            'pago': 'success',
            'recebido': 'success',
            'atrasado': 'danger',
            'cancelado': 'secondary'
        };
        return statusMap[status] || 'secondary';
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

    filterTable(tableId, filterText) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        const filter = filterText.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const shouldShow = text.includes(filter);
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    async openModal(tipo) {
        this.editingType = tipo;
        this.editingId = null;

        const modal = document.getElementById('modal-conta');
        if (!modal) return;

        const title = document.getElementById('modal-title');
        const labelFornecedorCliente = document.querySelector('label[for="conta-fornecedor-cliente"]');
        
        if (title) {
            title.textContent = tipo === 'pagar' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber';
        }
        
        if (labelFornecedorCliente) {
            labelFornecedorCliente.textContent = tipo === 'pagar' ? 'Fornecedor' : 'Cliente';
        }
        
        // Limpar formulário
        this.clearForm();
        
        // Carregar dados do modal
        await this.loadModalData(tipo);
        
        modal.classList.add('active');
        
        // Inicializar validação para nova conta
        this.initFormValidator();
    }

    clearForm() {
        const form = document.getElementById('form-conta');
        if (form) {
            form.reset();
        }
    }

    async loadModalData(tipo) {
        try {
            // Carregar categorias
            const categorias = await this.api.getCategorias(tipo);
            this.populateSelect('conta-categoria', categorias, 'id', 'nome');

            // Carregar fornecedores ou clientes
            if (tipo === 'pagar') {
                const fornecedores = await this.api.getFornecedores();
                this.populateSelect('conta-fornecedor-cliente', fornecedores, 'id', 'nome');
            } else {
                const clientes = await this.api.getClientes();
                this.populateSelect('conta-fornecedor-cliente', clientes, 'id', 'nome');
            }
        } catch (error) {
            console.error('Erro ao carregar dados do modal:', error);
        }
    }

    populateSelect(selectId, items, valueField, textField) {
        const select = document.getElementById(selectId);
        if (!select || !items) return;

        select.innerHTML = '<option value="">Selecione...</option>';
        
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            select.appendChild(option);
        });
    }

    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.add('loading');
        }
    }

    hideLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.remove('loading');
        }
    }

    showTableError(tableId, message) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr class="error-row">
                    <td colspan="100%" class="text-center">
                        <div class="table-error">
                            <div class="error-icon">⚠️</div>
                            <div class="error-message">${message}</div>
                            <button class="btn btn-sm btn-primary" onclick="location.reload()">
                                Tentar Novamente
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    async showConfirmation(title, text, icon = 'question') {
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title,
                text,
                icon,
                showCancelButton: true,
                confirmButtonText: 'Sim, confirmar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: 'var(--danger-color)',
                cancelButtonColor: 'var(--text-secondary)'
            });
            return result.isConfirmed;
        } else {
            return confirm(`${title}\n\n${text}`);
        }
    }

    setupFormValidation() {
        // Validação será configurada quando o modal for aberto
    }

    initFormValidator() {
        const form = document.getElementById('form-conta');
        if (!form) return;

        // Evitar múltiplas inicializações
        if (this.formValidator) {
            this.formValidator.reset();
            return;
        }

        this.formValidator = new FormValidator(form);
        
        this.formValidator
            .addRequiredRule('conta-descricao', 'Descrição da conta é obrigatória')
            .addCustomRule('conta-descricao', 
                (value) => value && value.length >= 3, 
                'Descrição deve ter pelo menos 3 caracteres'
            )
            .addRequiredRule('conta-valor', 'Valor é obrigatório')
            .addNumberRule('conta-valor', 0.01, null, 'Valor deve ser maior que zero')
            .addRequiredRule('conta-data-vencimento', 'Data de vencimento é obrigatória')
            .addDateRule('conta-data-vencimento', 
                new Date().toISOString().split('T')[0], 
                null, 
                'Data deve ser hoje ou futura'
            );

        // Configurar callback de sucesso
        this.formValidator.onValidationSuccess = () => {
            this.processFormSubmission();
        };
        
        // Configurar callback de erro para debug
        this.formValidator.onValidationError = () => {
            console.log('Formulário com erros de validação');
        };
    }

    // Método removido - validação gerenciada pelo FormValidator

    async processFormSubmission() {
        if (!this.formValidator || !this.editingType) return;

        const formData = this.formValidator.getFormData();
        
        const conta = {
            descricao: formData['conta-descricao'],
            valor_original: parseFloat(formData['conta-valor']),
            data_vencimento: formData['conta-data-vencimento'],
            observacoes: formData['conta-observacoes'] || ''
        };
        
        // Adicionar campos específicos
        if (this.editingType === 'pagar') {
            conta.fornecedor_id = formData['conta-fornecedor-cliente'] || null;
        } else {
            conta.cliente_id = formData['conta-fornecedor-cliente'] || null;
        }

        try {
            const submitBtn = document.querySelector('#form-conta button[type="submit"]');
            this.loadingManager.showElement(submitBtn, 'Salvando...');
            
            if (this.editingId) {
                // Edição
                if (this.editingType === 'pagar') {
                    await this.api.updateContaPagar(this.editingId, conta);
                    ErrorHandler.showSuccess('Conta a pagar atualizada com sucesso!');
                } else {
                    await this.api.updateContaReceber(this.editingId, conta);
                    ErrorHandler.showSuccess('Conta a receber atualizada com sucesso!');
                }
            } else {
                // Criação
                if (this.editingType === 'pagar') {
                    await this.api.createContaPagar(conta);
                    ErrorHandler.showSuccess('Conta a pagar criada com sucesso!');
                } else {
                    await this.api.createContaReceber(conta);
                    ErrorHandler.showSuccess('Conta a receber criada com sucesso!');
                }
            }
            
            this.closeModal();
            
            // Recarregar lista
            if (this.editingType === 'pagar') {
                await this.loadContasPagar();
            } else {
                await this.loadContasReceber();
            }
        } catch (error) {
            await ErrorHandler.handleApiError(error, `salvar conta a ${this.editingType}`);
        } finally {
            const submitBtn = document.querySelector('#form-conta button[type="submit"]');
            this.loadingManager.hideElement(submitBtn);
        }
    }

    closeModal() {
        const modal = document.getElementById('modal-conta');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Limpar estado
        this.editingType = null;
        this.editingId = null;
        
        // Limpar validação
        if (this.formValidator) {
            this.formValidator.reset();
        }
    }

    // Métodos que serão chamados pelo HTML
    async editConta(id, tipo) {
        try {
            this.loadingManager.show('edit-conta', 'Carregando dados...');
            
            // Buscar dados da conta
            let conta;
            if (tipo === 'pagar') {
                conta = await this.api.getContaPagar(id);
            } else {
                conta = await this.api.getContaReceber(id);
            }
            
            if (!conta) {
                ErrorHandler.showError('Conta não encontrada');
                return;
            }
            
            // Configurar modal para edição
            this.editingType = tipo;
            this.editingId = id;
            
            // Abrir modal
            const modal = document.getElementById('modal-conta');
            if (!modal) return;

            const title = document.getElementById('modal-title');
            const labelFornecedorCliente = document.querySelector('label[for="conta-fornecedor-cliente"]');
            
            if (title) {
                title.textContent = tipo === 'pagar' ? 'Editar Conta a Pagar' : 'Editar Conta a Receber';
            }
            
            if (labelFornecedorCliente) {
                labelFornecedorCliente.textContent = tipo === 'pagar' ? 'Fornecedor' : 'Cliente';
            }
            
            // Carregar dados do modal
            await this.loadModalData(tipo);
            
            // Preencher formulário
            this.populateForm(conta);
            
            modal.classList.add('active');
            
            // Inicializar validação
            this.initFormValidator();
            
        } catch (error) {
            await ErrorHandler.handleApiError(error, 'carregar dados da conta');
        } finally {
            this.loadingManager.hide('edit-conta');
        }
    }

    populateForm(conta) {
        const fields = {
            'conta-descricao': conta.descricao,
            'conta-valor': conta.valor_original,
            'conta-data-vencimento': conta.data_vencimento,
            'conta-observacoes': conta.observacoes || '',
            'conta-fornecedor-cliente': conta.fornecedor_id || conta.cliente_id || '',
            'conta-categoria': conta.categoria_id || ''
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value;
            }
        });
    }

    async deleteConta(id, tipo) {
        // Usar SweetAlert para confirmação se disponível
        const confirmed = await this.showConfirmation(
            'Tem certeza que deseja excluir esta conta?',
            'Esta ação não pode ser desfeita.',
            'warning'
        );
        
        if (!confirmed) return;

        try {
            this.loadingManager.show('delete-conta', 'Excluindo conta...');
            
            if (tipo === 'pagar') {
                await this.api.deleteContaPagar(id);
            } else {
                await this.api.deleteContaReceber(id);
            }
            
            ErrorHandler.showSuccess('Conta excluída com sucesso!');
            
            // Recarregar lista
            if (tipo === 'pagar') {
                await this.loadContasPagar();
            } else {
                await this.loadContasReceber();
            }
        } catch (error) {
            await ErrorHandler.handleApiError(error, 'exclusão de conta');
        } finally {
            this.loadingManager.hide('delete-conta');
        }
    }

    async markAsPaid(id, tipo) {
        try {
            this.loadingManager.show('update-conta', `Marcando como ${tipo === 'pagar' ? 'paga' : 'recebida'}...`);
            
            const updateData = {
                status: tipo === 'pagar' ? 'pago' : 'recebido',
                data_pagamento: new Date().toISOString().split('T')[0]
            };

            if (tipo === 'pagar') {
                await this.api.updateContaPagar(id, updateData);
            } else {
                await this.api.updateContaReceber(id, updateData);
            }
            
            ErrorHandler.showSuccess(`Conta marcada como ${tipo === 'pagar' ? 'paga' : 'recebida'}!`);
            
            // Recarregar lista
            if (tipo === 'pagar') {
                await this.loadContasPagar();
            } else {
                await this.loadContasReceber();
            }
        } catch (error) {
            await ErrorHandler.handleApiError(error, 'atualização de conta');
        } finally {
            this.loadingManager.hide('update-conta');
        }
    }
}