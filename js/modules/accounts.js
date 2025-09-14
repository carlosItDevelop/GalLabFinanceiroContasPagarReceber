// Módulo para gestão de contas a pagar e receber
import { Formatters } from '../utils/formatters.js';

export class AccountsManager {
    constructor(api) {
        this.api = api;
        this.editingType = null;
        this.editingId = null;
    }

    init() {
        this.setupEventListeners();
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
        const btnNovaPagar = document.querySelector('[data-action="nova-pagar"]');
        const btnNovaReceber = document.querySelector('[data-action="nova-receber"]');

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
    }

    async loadContasPagar(filtros = {}) {
        try {
            this.showLoading('tabela-contas-pagar');
            const contas = await this.api.getContasPagar(filtros);
            this.renderContasPagar(contas);
        } catch (error) {
            console.error('Erro ao carregar contas a pagar:', error);
            this.showError('Erro ao carregar contas a pagar');
        } finally {
            this.hideLoading('tabela-contas-pagar');
        }
    }

    async loadContasReceber(filtros = {}) {
        try {
            this.showLoading('tabela-contas-receber');
            const contas = await this.api.getContasReceber(filtros);
            this.renderContasReceber(contas);
        } catch (error) {
            console.error('Erro ao carregar contas a receber:', error);
            this.showError('Erro ao carregar contas a receber');
        } finally {
            this.hideLoading('tabela-contas-receber');
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

    showError(message) {
        console.error(message);
        // TODO: Implementar sistema de notificações mais robusto
        alert(message);
    }

    showSuccess(message) {
        console.log(message);
        // TODO: Implementar sistema de notificações mais robusto
        alert(message);
    }

    // Métodos que serão chamados pelo HTML
    async editConta(id, tipo) {
        // TODO: Implementar edição
        console.log('Editar conta:', id, tipo);
    }

    async deleteConta(id, tipo) {
        if (!confirm('Tem certeza que deseja excluir esta conta?')) {
            return;
        }

        try {
            if (tipo === 'pagar') {
                await this.api.deleteContaPagar(id);
            } else {
                await this.api.deleteContaReceber(id);
            }
            
            this.showSuccess('Conta excluída com sucesso!');
            
            // Recarregar lista
            if (tipo === 'pagar') {
                await this.loadContasPagar();
            } else {
                await this.loadContasReceber();
            }
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            this.showError('Erro ao excluir conta');
        }
    }

    async markAsPaid(id, tipo) {
        try {
            const updateData = {
                status: tipo === 'pagar' ? 'pago' : 'recebido',
                data_pagamento: new Date().toISOString().split('T')[0]
            };

            if (tipo === 'pagar') {
                await this.api.updateContaPagar(id, updateData);
            } else {
                await this.api.updateContaReceber(id, updateData);
            }
            
            this.showSuccess(`Conta marcada como ${tipo === 'pagar' ? 'paga' : 'recebida'}!`);
            
            // Recarregar lista
            if (tipo === 'pagar') {
                await this.loadContasPagar();
            } else {
                await this.loadContasReceber();
            }
        } catch (error) {
            console.error('Erro ao atualizar conta:', error);
            this.showError('Erro ao atualizar conta');
        }
    }
}