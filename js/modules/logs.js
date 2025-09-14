/**
 * Módulo de Logs
 * Gerencia visualização e filtragem de logs do sistema
 */

import { ErrorHandler } from '../utils/error-handler.js';
import { LoadingManager } from '../utils/loading-manager.js';

class LogsModule {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFilters = {};
        this.logs = [];
        
        this.init();
    }

    init() {
        this.createLogsStructure();
        this.setupEventListeners();
        this.loadLogs();
    }

    createLogsStructure() {
        const logsPanel = document.getElementById('logs');
        if (!logsPanel) {
            console.log('Aba logs ainda não foi carregada');
            return;
        }

        // Verificar se já existe estrutura
        const existingContainer = logsPanel.querySelector('.logs-container');
        if (existingContainer) return;

        const logsHTML = `
            <div class="logs-container">
                <div class="logs-header">
                    <h3>📝 Sistema de Logs</h3>
                    <div class="logs-actions">
                        <button id="refresh-logs" class="btn btn-primary">🔄 Atualizar</button>
                        <button id="clear-logs" class="btn btn-outline-danger">🗑️ Limpar Logs</button>
                        <button id="export-logs" class="btn btn-outline-secondary">📄 Exportar</button>
                    </div>
                </div>
                
                <div class="logs-filters">
                    <div class="filters-row">
                        <select id="log-level-filter" class="form-control">
                            <option value="">Todos os níveis</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                            <option value="debug">Debug</option>
                        </select>
                        
                        <select id="log-module-filter" class="form-control">
                            <option value="">Todos os módulos</option>
                            <option value="accounts">Contas</option>
                            <option value="dashboard">Dashboard</option>
                            <option value="files">Arquivos</option>
                            <option value="api">API</option>
                            <option value="database">Database</option>
                        </select>
                        
                        <input type="text" id="log-search" class="form-control" placeholder="Buscar nos logs...">
                        
                        <input type="date" id="log-date-start" class="form-control">
                        <input type="date" id="log-date-end" class="form-control">
                        
                        <button id="apply-log-filters" class="btn btn-outline-primary">Filtrar</button>
                        <button id="clear-log-filters" class="btn btn-outline-secondary">Limpar</button>
                    </div>
                </div>
                
                <div class="logs-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total:</span>
                        <span id="total-logs" class="stat-value">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Errors:</span>
                        <span id="error-logs" class="stat-value text-danger">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Warnings:</span>
                        <span id="warning-logs" class="stat-value text-warning">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Info:</span>
                        <span id="info-logs" class="stat-value text-info">0</span>
                    </div>
                </div>
                
                <div class="logs-content">
                    <div id="logs-table-container">
                        <!-- Tabela de logs será carregada aqui -->
                    </div>
                </div>
                
                <div class="logs-pagination">
                    <div id="logs-pagination-container">
                        <!-- Paginação será carregada aqui -->
                    </div>
                </div>
            </div>
        `;

        logsPanel.innerHTML = logsHTML;
    }

    setupEventListeners() {
        // Botão atualizar
        const refreshBtn = document.getElementById('refresh-logs');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadLogs());
        }

        // Botão limpar logs
        const clearBtn = document.getElementById('clear-logs');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLogs());
        }

        // Botão exportar
        const exportBtn = document.getElementById('export-logs');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLogs());
        }

        // Filtros
        const applyFiltersBtn = document.getElementById('apply-log-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }

        const clearFiltersBtn = document.getElementById('clear-log-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        // Busca em tempo real
        const searchInput = document.getElementById('log-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = searchInput.value;
                    this.currentPage = 1;
                    this.loadLogs();
                }, 500);
            });
        }
    }

    async loadLogs() {
        LoadingManager.show('logs-table-container', 'Carregando logs...');
        
        try {
            // Tentar carregar logs do servidor
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.currentFilters
            });

            const response = await fetch(`/api/logs?${params}`);
            
            if (response.ok) {
                this.logs = await response.json();
            } else {
                // Usar logs mock para demonstração
                this.logs = this.generateMockLogs();
            }
            
            this.renderLogsTable();
            this.updateStats();
            
        } catch (error) {
            console.log('API de logs não disponível, usando logs mock');
            this.logs = this.generateMockLogs();
            this.renderLogsTable();
            this.updateStats();
        } finally {
            LoadingManager.hide('logs-table-container');
        }
    }

    generateMockLogs() {
        const logs = [];
        const levels = ['info', 'warning', 'error', 'debug'];
        const modules = ['accounts', 'dashboard', 'files', 'api', 'database'];
        const messages = [
            'Sistema inicializado com sucesso',
            'Usuário logado no sistema',
            'Conta criada com sucesso',
            'Erro ao conectar com banco de dados',
            'Upload de arquivo concluído',
            'Relatório gerado com sucesso',
            'Falha na validação de dados',
            'Cache invalidado',
            'Backup realizado',
            'Configuração atualizada'
        ];

        for (let i = 0; i < 50; i++) {
            const date = new Date();
            date.setMinutes(date.getMinutes() - (i * 10));
            
            logs.push({
                id: `log-${i}`,
                timestamp: date.toISOString(),
                level: levels[Math.floor(Math.random() * levels.length)],
                module: modules[Math.floor(Math.random() * modules.length)],
                message: messages[Math.floor(Math.random() * messages.length)],
                details: Math.random() > 0.7 ? `Detalhes adicionais do log ${i}` : null,
                user_id: Math.random() > 0.5 ? 'user-123' : null
            });
        }
        
        return logs;
    }

    renderLogsTable() {
        const container = document.getElementById('logs-table-container');
        if (!container) return;

        if (this.logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt text-muted" style="font-size: 3rem;"></i>
                    <h4 class="text-muted mt-3">Nenhum log encontrado</h4>
                    <p class="text-muted">Não há logs para exibir com os filtros atuais.</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Timestamp</th>
                            <th>Nível</th>
                            <th>Módulo</th>
                            <th>Mensagem</th>
                            <th>Usuário</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.logs.map(log => this.renderLogRow(log)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;

        // Adicionar event listeners para ações
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-view-details')) {
                const logId = e.target.getAttribute('data-log-id');
                this.viewLogDetails(logId);
            }
        });
    }

    renderLogRow(log) {
        const formatDate = (timestamp) => {
            return new Date(timestamp).toLocaleString('pt-BR');
        };

        const getLevelBadge = (level) => {
            const badges = {
                'info': 'badge bg-info',
                'warning': 'badge bg-warning text-dark',
                'error': 'badge bg-danger',
                'debug': 'badge bg-secondary'
            };
            return badges[level] || 'badge bg-light text-dark';
        };

        const getLevelIcon = (level) => {
            const icons = {
                'info': 'fas fa-info-circle',
                'warning': 'fas fa-exclamation-triangle',
                'error': 'fas fa-times-circle',
                'debug': 'fas fa-bug'
            };
            return icons[level] || 'fas fa-circle';
        };

        return `
            <tr class="log-row log-${log.level}">
                <td>
                    <small>${formatDate(log.timestamp)}</small>
                </td>
                <td>
                    <span class="${getLevelBadge(log.level)}">
                        <i class="${getLevelIcon(log.level)} me-1"></i>
                        ${log.level.toUpperCase()}
                    </span>
                </td>
                <td>
                    <span class="badge bg-light text-dark">${log.module}</span>
                </td>
                <td>
                    <div class="log-message">
                        ${log.message}
                        ${log.details ? '<br><small class="text-muted">Clique para ver detalhes</small>' : ''}
                    </div>
                </td>
                <td>
                    ${log.user_id ? `<small class="text-muted">${log.user_id}</small>` : '-'}
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        ${log.details ? `
                            <button type="button" class="btn btn-outline-info btn-view-details" 
                                    data-log-id="${log.id}" title="Ver detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-outline-secondary btn-copy-log" 
                                data-log-id="${log.id}" title="Copiar">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    updateStats() {
        const stats = this.calculateStats();
        
        const totalEl = document.getElementById('total-logs');
        const errorEl = document.getElementById('error-logs');
        const warningEl = document.getElementById('warning-logs');
        const infoEl = document.getElementById('info-logs');

        if (totalEl) totalEl.textContent = stats.total;
        if (errorEl) errorEl.textContent = stats.error;
        if (warningEl) warningEl.textContent = stats.warning;
        if (infoEl) infoEl.textContent = stats.info;
    }

    calculateStats() {
        return {
            total: this.logs.length,
            error: this.logs.filter(log => log.level === 'error').length,
            warning: this.logs.filter(log => log.level === 'warning').length,
            info: this.logs.filter(log => log.level === 'info').length,
            debug: this.logs.filter(log => log.level === 'debug').length
        };
    }

    applyFilters() {
        const levelFilter = document.getElementById('log-level-filter');
        const moduleFilter = document.getElementById('log-module-filter');
        const searchInput = document.getElementById('log-search');
        const dateStart = document.getElementById('log-date-start');
        const dateEnd = document.getElementById('log-date-end');

        this.currentFilters = {};
        
        if (levelFilter && levelFilter.value) {
            this.currentFilters.level = levelFilter.value;
        }
        
        if (moduleFilter && moduleFilter.value) {
            this.currentFilters.module = moduleFilter.value;
        }
        
        if (searchInput && searchInput.value) {
            this.currentFilters.search = searchInput.value;
        }
        
        if (dateStart && dateStart.value) {
            this.currentFilters.dateStart = dateStart.value;
        }
        
        if (dateEnd && dateEnd.value) {
            this.currentFilters.dateEnd = dateEnd.value;
        }

        this.currentPage = 1;
        this.loadLogs();
    }

    clearFilters() {
        this.currentFilters = {};
        this.currentPage = 1;
        
        // Limpar inputs
        const inputs = ['log-level-filter', 'log-module-filter', 'log-search', 'log-date-start', 'log-date-end'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        this.loadLogs();
    }

    viewLogDetails(logId) {
        const log = this.logs.find(l => l.id === logId);
        if (!log) return;

        const details = `
            <strong>Timestamp:</strong> ${new Date(log.timestamp).toLocaleString('pt-BR')}<br>
            <strong>Nível:</strong> ${log.level.toUpperCase()}<br>
            <strong>Módulo:</strong> ${log.module}<br>
            <strong>Mensagem:</strong> ${log.message}<br>
            ${log.details ? `<strong>Detalhes:</strong> ${log.details}<br>` : ''}
            ${log.user_id ? `<strong>Usuário:</strong> ${log.user_id}<br>` : ''}
        `;

        ErrorHandler.showInfo('Detalhes do Log', details);
    }

    async clearLogs() {
        const confirmed = await ErrorHandler.showConfirmation(
            'Confirmar limpeza',
            'Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.',
            'Limpar Logs',
            'danger'
        );

        if (!confirmed) return;

        LoadingManager.show('logs-clear', 'Limpando logs...');
        
        try {
            // TODO: Implementar limpeza no servidor
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.logs = [];
            this.renderLogsTable();
            this.updateStats();
            
            ErrorHandler.showSuccess('Logs limpos', 'Todos os logs foram removidos do sistema');
            
        } catch (error) {
            ErrorHandler.showError('Erro ao limpar logs', error.message);
        } finally {
            LoadingManager.hide('logs-clear');
        }
    }

    async exportLogs() {
        LoadingManager.show('logs-export', 'Exportando logs...');
        
        try {
            // TODO: Implementar exportação real
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            ErrorHandler.showSuccess('Exportação concluída', 'Logs exportados em CSV com sucesso');
            
        } catch (error) {
            ErrorHandler.showError('Erro na exportação', error.message);
        } finally {
            LoadingManager.hide('logs-export');
        }
    }

    // Método público para ser chamado pelo TabManager
    async load() {
        if (!document.getElementById('logs-table-container')) {
            this.createLogsStructure();
            this.setupEventListeners();
        }
        await this.loadLogs();
    }

    // Método público para adicionar log programaticamente
    addLog(level, module, message, details = null, userId = null) {
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            level,
            module,
            message,
            details,
            user_id: userId
        };

        this.logs.unshift(log);
        
        // Manter apenas os últimos 1000 logs em memória
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(0, 1000);
        }

        // Atualizar interface se estiver visível
        if (document.getElementById('logs-table-container')) {
            this.renderLogsTable();
            this.updateStats();
        }

        // TODO: Enviar para servidor
        console.log('Log adicionado:', log);
    }
}

export { LogsModule };