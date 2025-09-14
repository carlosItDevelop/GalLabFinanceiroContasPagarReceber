// Sistema de loading states e indicadores visuais
export class LoadingManager {
    constructor() {
        this.activeLoadings = new Set();
        this.createGlobalSpinner();
    }

    createGlobalSpinner() {
        // Criar spinner global se não existir
        if (!document.getElementById('global-spinner')) {
            const spinner = document.createElement('div');
            spinner.id = 'global-spinner';
            spinner.className = 'global-spinner';
            spinner.innerHTML = `
                <div class="spinner-backdrop"></div>
                <div class="spinner-container">
                    <div class="spinner"></div>
                    <div class="spinner-text">Carregando...</div>
                </div>
            `;
            document.body.appendChild(spinner);
        }
    }

    show(identifier = 'default', text = 'Carregando...') {
        this.activeLoadings.add(identifier);
        
        const spinner = document.getElementById('global-spinner');
        if (spinner) {
            const textElement = spinner.querySelector('.spinner-text');
            if (textElement) {
                textElement.textContent = text;
            }
            spinner.style.display = 'flex';
        }
    }

    hide(identifier = 'default') {
        this.activeLoadings.delete(identifier);
        
        // Se não há mais carregamentos ativos, esconder spinner
        if (this.activeLoadings.size === 0) {
            const spinner = document.getElementById('global-spinner');
            if (spinner) {
                spinner.style.display = 'none';
            }
        }
    }

    showElement(element, text = 'Carregando...') {
        if (!element) return;

        // Salvar conteúdo original
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
        }

        // Adicionar loading
        element.classList.add('loading');
        element.innerHTML = `
            <div class="element-loading">
                <div class="element-spinner"></div>
                <span>${text}</span>
            </div>
        `;
        element.disabled = true;
    }

    hideElement(element) {
        if (!element) return;

        element.classList.remove('loading');
        element.disabled = false;
        
        // Remover elemento de loading se existir
        const loadingElement = element.querySelector('.element-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // Limpar dataset
        if (element.dataset.originalContent) {
            delete element.dataset.originalContent;
        }
    }

    showTable(tableId, text = 'Carregando dados...') {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (tbody) {
            // Salvar conteúdo original
            if (!tbody.dataset.originalContent) {
                tbody.dataset.originalContent = tbody.innerHTML;
            }

            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="100%" class="text-center">
                        <div class="table-loading">
                            <div class="table-spinner"></div>
                            <span>${text}</span>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    hideTable(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (tbody) {
            // Remove apenas o loading, não restaura conteúdo após renderização
            const loadingRow = tbody.querySelector('.loading-row');
            if (loadingRow) {
                loadingRow.remove();
            }
            // Limpar dataset apenas se não há conteúdo útil
            if (tbody.dataset.originalContent && tbody.children.length <= 1) {
                delete tbody.dataset.originalContent;
            }
        }
    }

    showCard(cardId, text = 'Carregando...') {
        const card = document.getElementById(cardId);
        if (!card) return;

        const valueElement = card.querySelector('.card-value');
        if (valueElement) {
            if (!valueElement.dataset.originalContent) {
                valueElement.dataset.originalContent = valueElement.textContent;
            }
            valueElement.innerHTML = `
                <div class="card-loading">
                    <div class="card-spinner"></div>
                    <span>${text}</span>
                </div>
            `;
        }
    }

    hideCard(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const valueElement = card.querySelector('.card-value');
        if (valueElement) {
            // Remove apenas o loading spinner, mantém conteúdo atualizado
            const loadingElement = valueElement.querySelector('.card-loading');
            if (loadingElement) {
                loadingElement.remove();
            }
            // Limpar dataset apenas se não há dados novos
            if (valueElement.dataset.originalContent) {
                delete valueElement.dataset.originalContent;
            }
        }
    }

    // Skeleton loading para listas
    showSkeleton(containerId, itemCount = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const skeletonItems = Array.from({ length: itemCount }, () => `
            <div class="skeleton-item">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-subtitle"></div>
                <div class="skeleton-line skeleton-content"></div>
            </div>
        `).join('');

        if (!container.dataset.originalContent) {
            container.dataset.originalContent = container.innerHTML;
        }

        container.innerHTML = `<div class="skeleton-container">${skeletonItems}</div>`;
    }

    hideSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (container.dataset.originalContent) {
            container.innerHTML = container.dataset.originalContent;
            delete container.dataset.originalContent;
        }
    }

    // Progress bar para uploads ou operações longas
    showProgress(identifier, progress = 0, text = 'Processando...') {
        let progressBar = document.getElementById(`progress-${identifier}`);
        
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = `progress-${identifier}`;
            progressBar.className = 'progress-overlay';
            progressBar.innerHTML = `
                <div class="progress-container">
                    <div class="progress-text">${text}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-percent">${Math.round(progress)}%</div>
                </div>
            `;
            document.body.appendChild(progressBar);
        }

        // Atualizar progress
        const fill = progressBar.querySelector('.progress-fill');
        const percent = progressBar.querySelector('.progress-percent');
        const textEl = progressBar.querySelector('.progress-text');
        
        if (fill) fill.style.width = `${progress}%`;
        if (percent) percent.textContent = `${Math.round(progress)}%`;
        if (textEl) textEl.textContent = text;

        progressBar.style.display = 'flex';
    }

    hideProgress(identifier) {
        const progressBar = document.getElementById(`progress-${identifier}`);
        if (progressBar) {
            progressBar.remove();
        }
    }

    updateProgress(identifier, progress, text = null) {
        const progressBar = document.getElementById(`progress-${identifier}`);
        if (!progressBar) return;

        const fill = progressBar.querySelector('.progress-fill');
        const percent = progressBar.querySelector('.progress-percent');
        const textEl = progressBar.querySelector('.progress-text');
        
        if (fill) fill.style.width = `${progress}%`;
        if (percent) percent.textContent = `${Math.round(progress)}%`;
        if (text && textEl) textEl.textContent = text;
    }
}