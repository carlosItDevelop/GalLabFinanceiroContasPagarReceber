/**
 * Módulo de gerenciamento de arquivos
 * Interface para upload, listagem e gerenciamento de arquivos
 */

import { FilesAPI } from '../api/files-api.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { LoadingManager } from '../utils/loading-manager.js';

class FilesModule {
    constructor() {
        this.api = new FilesAPI();
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFilters = {};
        this.uploadQueue = [];
        this.isUploading = false;
        this.loadingManager = new LoadingManager();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFiles();
    }

    setupEventListeners() {
        // Upload por drag & drop
        this.setupDragAndDrop();
        
        // Upload por input file
        this.setupFileInput();
        
        // Filtros e busca
        this.setupFilters();
        
        // Ações dos arquivos
        this.setupFileActions();
        
        // Paginação
        this.setupPagination();
        
        // FAB - Ações Rápidas
        this.setupFloatingActionButton();
        
        // Configurar funções globais para compatibilidade com HTML
        this.setupGlobalFunctions();
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('files-dropzone');
        if (!dropZone) return;

        // Prevenir comportamento padrão
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Visual feedback durante drag
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        // Handle drop
        dropZone.addEventListener('drop', async (e) => {
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                await this.handleFileUpload(files);
            }
        });

        // Click para abrir file dialog
        dropZone.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
    }

    setupFileInput() {
        const fileInput = document.getElementById('file-input');
        if (!fileInput) return;

        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                await this.handleFileUpload(files);
                // Reset input para permitir upload do mesmo arquivo novamente
                e.target.value = '';
            }
        });
    }

    setupFilters() {
        // Busca por texto
        const searchInput = document.getElementById('files-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.q = e.target.value;
                    this.currentPage = 1;
                    this.loadFiles();
                }, 500);
            });
        }

        // Filtro por tipo
        const typeFilter = document.getElementById('files-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.ext = e.target.value;
                this.currentPage = 1;
                this.loadFiles();
            });
        }

        // Botão limpar filtros
        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    setupFileActions() {
        // Delegação de eventos para ações dos arquivos
        const filesList = document.getElementById('files-list');
        if (!filesList) return;

        filesList.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const fileId = e.target.dataset.fileId;
            const fileName = e.target.dataset.fileName;

            if (!action || !fileId) return;

            e.preventDefault();
            e.stopPropagation();

            switch (action) {
                case 'download':
                    await this.downloadFile(fileId, fileName);
                    break;
                case 'delete':
                    await this.deleteFile(fileId, fileName);
                    break;
                case 'view':
                    await this.viewFile(fileId, fileName);
                    break;
                case 'preview':
                    await this.previewFile(fileId, fileName);
                    break;
            }
        });
    }

    setupPagination() {
        const paginationContainer = document.getElementById('files-pagination');
        if (!paginationContainer) return;

        paginationContainer.addEventListener('click', (e) => {
            if (e.target.dataset.page) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadFiles();
                }
            }
        });
    }

    async handleFileUpload(files) {
        if (this.isUploading) {
            ErrorHandler.showWarning('Upload em andamento', 'Aguarde o upload atual terminar');
            return;
        }

        this.isUploading = true;
        this.loadingManager.show('upload-progress', 'Preparando upload...');

        try {
            // Validar arquivos
            const validation = this.api.validateFiles(files);
            if (!validation.valid) {
                ErrorHandler.showError('Arquivos inválidos', validation.errors.join('\\n'));
                return;
            }

            // Criar container de progresso
            this.createUploadProgressContainer();

            // Upload individual com progresso por arquivo
            const results = await this.api.uploadFilesIndividually(
                files,
                {}, // options
                (file, progress, index, total) => {
                    this.updateFileProgress(file, progress, index, total);
                },
                (file, result, index, total) => {
                    this.completeFileUpload(file, result, index, total);
                }
            );

            // Processar resultados
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            if (successful > 0) {
                ErrorHandler.showSuccess('Upload concluído', 
                    `${successful} arquivo(s) enviado(s) com sucesso${failed > 0 ? `. ${failed} falharam.` : ''}`
                );
                
                // Recarregar lista
                this.loadFiles();
            } else {
                ErrorHandler.showError('Falha no upload', 'Nenhum arquivo foi enviado com sucesso');
            }

        } catch (error) {
            console.error('Erro no upload:', error);
            ErrorHandler.showError('Erro no upload', error.message);
        } finally {
            this.isUploading = false;
            this.loadingManager.hide('upload-progress');
            this.hideUploadProgressContainer();
        }
    }

    createUploadProgressContainer() {
        const existingContainer = document.getElementById('upload-progress-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        const container = document.createElement('div');
        container.id = 'upload-progress-container';
        container.className = 'upload-progress-container';
        container.innerHTML = `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                        <i class="fas fa-cloud-upload-alt text-primary"></i>
                        Enviando Arquivos
                    </h6>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="this.closest('.upload-progress-container').style.display='none'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="card-body" id="upload-files-progress">
                    <!-- Progress items will be added here -->
                </div>
            </div>
        `;

        // Adicionar ao container principal
        const mainContent = document.querySelector('#content .container-fluid') || document.body;
        mainContent.appendChild(container);
    }

    updateFileProgress(file, progress, index, total) {
        const progressContainer = document.getElementById('upload-files-progress');
        if (!progressContainer) return;

        let progressItem = document.getElementById(`progress-${index}`);
        if (!progressItem) {
            progressItem = document.createElement('div');
            progressItem.id = `progress-${index}`;
            progressItem.className = 'upload-progress-item mb-3';
            progressContainer.appendChild(progressItem);
        }

        progressItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <small class="text-truncate" style="max-width: 70%;">
                    <i class="${FilesAPI.getFileIcon(this.api.getFileExtension(file.name))}"></i>
                    ${file.name}
                </small>
                <small class="text-muted">
                    ${Math.round(progress.percent)}%
                </small>
            </div>
            <div class="progress" style="height: 6px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                     style="width: ${progress.percent}%"></div>
            </div>
            <small class="text-muted">
                ${FilesAPI.formatFileSize(progress.loaded)} / ${FilesAPI.formatFileSize(progress.total)}
            </small>
        `;
    }

    completeFileUpload(file, result, index, total) {
        const progressItem = document.getElementById(`progress-${index}`);
        if (!progressItem) return;

        const success = result && !result.error;
        const iconClass = success ? 'fas fa-check-circle text-success' : 'fas fa-times-circle text-danger';
        const message = success ? 'Concluído' : (result?.error || 'Erro desconhecido');

        progressItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <small class="text-truncate" style="max-width: 70%;">
                    <i class="${FilesAPI.getFileIcon(this.api.getFileExtension(file.name))}"></i>
                    ${file.name}
                </small>
                <small>
                    <i class="${iconClass}"></i>
                    ${message}
                </small>
            </div>
        `;
    }

    hideUploadProgressContainer() {
        setTimeout(() => {
            const container = document.getElementById('upload-progress-container');
            if (container) {
                container.style.display = 'none';
            }
        }, 3000);
    }

    async loadFiles() {
        try {
            this.loadingManager.showSkeleton('files-list', 3);

            const params = {
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.currentFilters
            };

            const response = await this.api.listFiles(params);
            this.renderFilesList(response.files);
            this.renderPagination(response.pagination);

        } catch (error) {
            console.error('Erro ao carregar arquivos:', error);
            ErrorHandler.showError('Erro ao carregar arquivos', error.message);
            this.renderEmptyState();
        } finally {
            this.loadingManager.hideSkeleton('files-list');
        }
    }

    renderFilesList(files) {
        const container = document.getElementById('files-list');
        if (!container) return;

        if (files.length === 0) {
            this.renderEmptyState();
            return;
        }

        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Arquivo</th>
                            <th>Tipo</th>
                            <th>Tamanho</th>
                            <th>Enviado em</th>
                            <th>Downloads</th>
                            <th class="text-end">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${files.map(file => this.renderFileRow(file)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    renderFileRow(file) {
        const uploadDate = new Date(file.created_at).toLocaleString('pt-BR');
        const canPreview = FilesAPI.canPreview(file.ext);
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="${FilesAPI.getFileIcon(file.ext)} me-2"></i>
                        <div>
                            <div class="fw-medium">${file.original_name}</div>
                            <small class="text-muted">${file.ext.toUpperCase()}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark">${file.ext.toUpperCase()}</span>
                </td>
                <td>${FilesAPI.formatFileSize(file.size_bytes)}</td>
                <td>
                    <small>${uploadDate}</small>
                </td>
                <td>
                    <small class="text-muted">${file.download_count || 0}x</small>
                </td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm">
                        ${canPreview ? `
                            <button type="button" class="btn btn-outline-info" 
                                    data-action="preview" data-file-id="${file.id}" data-file-name="${file.original_name}"
                                    title="Visualizar">
                                <i class="fas fa-eye"></i>
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-outline-primary" 
                                data-action="download" data-file-id="${file.id}" data-file-name="${file.original_name}"
                                title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" 
                                data-action="delete" data-file-id="${file.id}" data-file-name="${file.original_name}"
                                title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderEmptyState() {
        const container = document.getElementById('files-list');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-folder-open text-muted" style="font-size: 4rem;"></i>
                <h4 class="text-muted mt-3">Nenhum arquivo encontrado</h4>
                <p class="text-muted">
                    ${Object.keys(this.currentFilters).length > 0 
                        ? 'Tente ajustar os filtros de busca ou faça upload de novos arquivos.'
                        : 'Comece fazendo upload de arquivos usando a área de upload acima.'
                    }
                </p>
                ${Object.keys(this.currentFilters).length > 0 ? `
                    <button type="button" class="btn btn-outline-primary" id="clear-filters-empty">
                        <i class="fas fa-filter"></i> Limpar Filtros
                    </button>
                ` : ''}
            </div>
        `;

        // Event listener para limpar filtros do empty state
        const clearButton = document.getElementById('clear-filters-empty');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearFilters());
        }
    }

    renderPagination(pagination) {
        const container = document.getElementById('files-pagination');
        if (!container || pagination.pages <= 1) {
            container.innerHTML = '';
            return;
        }

        const { page: currentPage, pages: totalPages, total } = pagination;
        
        let paginationHTML = '<nav aria-label="Paginação de arquivos"><ul class="pagination pagination-sm justify-content-center">';
        
        // Botão anterior
        if (currentPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">&laquo; Anterior</a></li>`;
        }
        
        // Páginas
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<li class="page-item ${activeClass}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }
        
        // Botão próximo
        if (currentPage < totalPages) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">Próximo &raquo;</a></li>`;
        }
        
        paginationHTML += '</ul></nav>';
        
        // Adicionar info de contagem
        const startItem = (currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(currentPage * this.itemsPerPage, total);
        paginationHTML += `<small class="text-muted text-center d-block mt-2">Mostrando ${startItem}-${endItem} de ${total} arquivos</small>`;
        
        container.innerHTML = paginationHTML;
    }

    async downloadFile(fileId, fileName) {
        try {
            this.loadingManager.show('download-' + fileId, 'Baixando arquivo...');
            await this.api.downloadFile(fileId, fileName);
        } catch (error) {
            ErrorHandler.showError('Erro no download', error.message);
        } finally {
            this.loadingManager.hide('download-' + fileId);
        }
    }

    async deleteFile(fileId, fileName) {
        const confirmed = await ErrorHandler.showConfirmation(
            'Confirmar exclusão',
            `Tem certeza que deseja excluir o arquivo "${fileName}"?`,
            'Excluir',
            'danger'
        );

        if (!confirmed) return;

        try {
            this.loadingManager.show('delete-' + fileId, 'Excluindo arquivo...');
            await this.api.deleteFile(fileId);
            
            ErrorHandler.showSuccess('Arquivo excluído', `"${fileName}" foi excluído com sucesso`);
            this.loadFiles(); // Recarregar lista

        } catch (error) {
            ErrorHandler.showError('Erro ao excluir', error.message);
        } finally {
            this.loadingManager.hide('delete-' + fileId);
        }
    }

    async viewFile(fileId, fileName) {
        try {
            const metadata = await this.api.getFileMetadata(fileId);
            this.showFileModal(metadata.file);
        } catch (error) {
            ErrorHandler.showError('Erro ao visualizar arquivo', error.message);
        }
    }

    async previewFile(fileId, fileName) {
        // TODO: Implementar preview modal para imagens e PDFs
        console.log('Preview not implemented yet for:', fileName);
        ErrorHandler.showInfo('Preview', 'Funcionalidade de preview será implementada em breve');
    }

    showFileModal(file) {
        // TODO: Implementar modal com detalhes do arquivo
        console.log('File details modal not implemented yet');
    }

    clearFilters() {
        this.currentFilters = {};
        this.currentPage = 1;
        
        // Limpar inputs
        const searchInput = document.getElementById('files-search');
        const typeFilter = document.getElementById('files-type-filter');
        
        if (searchInput) searchInput.value = '';
        if (typeFilter) typeFilter.value = '';
        
        this.loadFiles();
    }

    setupFloatingActionButton() {
        const fabMain = document.getElementById('fab-main');
        const fabMenu = document.getElementById('fab-menu');
        
        if (fabMain && fabMenu) {
            // Toggle do menu FAB
            fabMain.addEventListener('click', () => {
                const isVisible = fabMenu.style.display !== 'none';
                fabMenu.style.display = isVisible ? 'none' : 'block';
                fabMain.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(45deg)';
            });
            
            // Fechar menu ao clicar fora
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.floating-actions')) {
                    fabMenu.style.display = 'none';
                    fabMain.style.transform = 'rotate(0deg)';
                }
            });
        }
    }
    
    setupGlobalFunctions() {
        // Expor funções globalmente para o HTML
        window.app = window.app || {};
        
        window.app.createNewFolder = () => {
            this.createNewFolder();
        };
        
        window.app.importFromUrl = () => {
            this.importFromUrl();
        };
        
        window.app.scanDocument = () => {
            this.scanDocument();
        };
        
        window.app.bulkDownload = () => {
            this.bulkDownload();
        };
        
        window.app.bulkMove = () => {
            this.bulkMove();
        };
        
        window.app.filterByRecent = () => {
            this.filterByRecent();
        };
        
        window.app.filterByShared = () => {
            this.filterByShared();
        };
        
        window.app.filterByLarge = () => {
            this.filterByLarge();
        };
        
        window.app.filterByVersioned = () => {
            this.filterByVersioned();
        };
    }
    
    createNewFolder() {
        const folderName = prompt('Nome da nova pasta:');
        if (folderName && folderName.trim()) {
            console.log('Criando pasta:', folderName);
            ErrorHandler.showSuccess('Pasta criada', `Pasta "${folderName}" criada com sucesso!`);
            // TODO: Implementar criação real de pasta na API
        }
    }
    
    importFromUrl() {
        const url = prompt('URL do arquivo para importar:');
        if (url && url.trim()) {
            console.log('Importando de URL:', url);
            ErrorHandler.showInfo('Importação iniciada', 'Download do arquivo em andamento...');
            // TODO: Implementar importação real de URL
        }
    }
    
    scanDocument() {
        console.log('Abrindo scanner de documentos');
        ErrorHandler.showInfo('Scanner', 'Funcionalidade de scan será implementada em breve');
        // TODO: Implementar integração com scanner/câmera
    }
    
    bulkDownload() {
        console.log('Download em lote');
        ErrorHandler.showInfo('Download em lote', 'Funcionalidade será implementada em breve');
        // TODO: Implementar download múltiplo
    }
    
    bulkMove() {
        console.log('Mover arquivos em lote');
        ErrorHandler.showInfo('Mover arquivos', 'Funcionalidade será implementada em breve');
        // TODO: Implementar movimentação em lote
    }
    
    filterByRecent() {
        console.log('Filtrar por arquivos recentes');
        this.currentFilters = { recent: true };
        this.loadFiles();
        ErrorHandler.showInfo('Filtro aplicado', 'Exibindo arquivos recentes');
    }
    
    filterByShared() {
        console.log('Filtrar por arquivos compartilhados');
        this.currentFilters = { shared: true };
        this.loadFiles();
        ErrorHandler.showInfo('Filtro aplicado', 'Exibindo arquivos compartilhados');
    }
    
    filterByLarge() {
        console.log('Filtrar por arquivos grandes');
        this.currentFilters = { large: true };
        this.loadFiles();
        ErrorHandler.showInfo('Filtro aplicado', 'Exibindo arquivos grandes (>10MB)');
    }
    
    filterByVersioned() {
        console.log('Filtrar por arquivos versionados');
        this.currentFilters = { versioned: true };
        this.loadFiles();
        ErrorHandler.showInfo('Filtro aplicado', 'Exibindo arquivos com versões');
    }

    // Métodos públicos para integração com outras partes do sistema
    
    /**
     * Listar arquivos vinculados a uma entidade
     */
    async loadEntityFiles(entityType, entityId) {
        this.currentFilters = { entityType, entityId };
        this.currentPage = 1;
        await this.loadFiles();
    }

    /**
     * Upload com vínculo a entidade
     */
    async uploadEntityFiles(files, entityType, entityId) {
        const options = { entityType, entityId };
        await this.handleFileUpload(files, options);
    }
}

// Inicializar quando a página carregar
let filesModule;

// Exportar para uso em outras partes do sistema
window.FilesModule = FilesModule;
window.initFilesModule = () => {
    if (!filesModule) {
        filesModule = new FilesModule();
    }
    return filesModule;
};

export { FilesModule };