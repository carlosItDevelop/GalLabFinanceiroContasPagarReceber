/**
 * API para gerenciamento de arquivos
 * Fornece métodos para upload, download, listagem e exclusão de arquivos
 */

import { ErrorHandler } from '../utils/error-handler.js';
import { LoadingManager } from '../utils/loading-manager.js';

class FilesAPI {
    constructor() {
        this.baseURL = '/api/files';
        this.maxFileSize = 200 * 1024 * 1024; // 200MB
        this.supportedExtensions = ['pdf', 'docx', 'xlsx', 'txt', 'csv', 'jpg', 'jpeg', 'png', 'zip'];
        this.uploadQueue = new Map();
    }

    /**
     * Upload de arquivos com progress tracking
     * @param {FileList|File[]} files - Arquivos para upload
     * @param {Object} options - Opções de upload
     * @param {Function} onProgress - Callback de progresso
     * @param {Function} onFileComplete - Callback quando um arquivo completa
     * @returns {Promise<Object>} Resultado do upload
     */
    async uploadFiles(files, options = {}, onProgress = null, onFileComplete = null) {
        try {
            // Validar arquivos antes do upload
            const validationResult = this.validateFiles(files);
            if (!validationResult.valid) {
                throw new Error(validationResult.errors.join(', '));
            }

            const formData = new FormData();
            
            // Adicionar arquivos ao FormData
            Array.from(files).forEach(file => {
                formData.append('files', file);
            });

            // Adicionar opções
            if (options.entityType) {
                formData.append('entity_type', options.entityType);
            }
            if (options.entityId) {
                formData.append('entity_id', options.entityId);
            }
            if (options.accessScope) {
                formData.append('access_scope', options.accessScope);
            }

            // Criar XMLHttpRequest para progress tracking
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                
                // Progress tracking
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable && onProgress) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        onProgress({
                            loaded: event.loaded,
                            total: event.total,
                            percent: percentComplete
                        });
                    }
                });

                // Sucesso
                xhr.addEventListener('load', () => {
                    try {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } else {
                            const errorResponse = JSON.parse(xhr.responseText);
                            reject(new Error(errorResponse.message || 'Erro no upload'));
                        }
                    } catch (parseError) {
                        reject(new Error('Resposta inválida do servidor'));
                    }
                });

                // Erro de rede
                xhr.addEventListener('error', () => {
                    reject(new Error('Erro de rede durante o upload'));
                });

                // Timeout
                xhr.addEventListener('timeout', () => {
                    reject(new Error('Timeout durante o upload'));
                });

                // Configurar e enviar
                xhr.open('POST', this.baseURL);
                xhr.timeout = 300000; // 5 minutos
                xhr.send(formData);
            });

        } catch (error) {
            ErrorHandler.showError('Erro no upload de arquivos', error);
            throw error;
        }
    }

    /**
     * Upload de múltiplos arquivos individualmente com controle granular
     * @param {FileList|File[]} files - Arquivos para upload
     * @param {Object} options - Opções de upload
     * @param {Function} onFileProgress - Callback de progresso por arquivo
     * @param {Function} onFileComplete - Callback quando um arquivo completa
     * @returns {Promise<Array>} Array de resultados de upload
     */
    async uploadFilesIndividually(files, options = {}, onFileProgress = null, onFileComplete = null) {
        const results = [];
        const fileArray = Array.from(files);
        
        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            
            try {
                const result = await this.uploadFiles([file], options, 
                    (progress) => {
                        if (onFileProgress) {
                            onFileProgress(file, progress, i, fileArray.length);
                        }
                    }
                );
                
                results.push({ file, result, success: true });
                
                if (onFileComplete) {
                    onFileComplete(file, result, i, fileArray.length);
                }
                
            } catch (error) {
                results.push({ file, error, success: false });
                console.error(`Erro no upload do arquivo ${file.name}:`, error);
            }
        }
        
        return results;
    }

    /**
     * Listar arquivos com filtros e paginação
     * @param {Object} params - Parâmetros de busca
     * @returns {Promise<Object>} Lista de arquivos e metadados de paginação
     */
    async listFiles(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.q) queryParams.append('q', params.q);
            if (params.type) queryParams.append('type', params.type);
            if (params.ext) queryParams.append('ext', params.ext);
            if (params.entityType) queryParams.append('entity_type', params.entityType);
            if (params.entityId) queryParams.append('entity_id', params.entityId);

            const url = `${this.baseURL}?${queryParams.toString()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            ErrorHandler.showError('Erro ao listar arquivos', error);
            throw error;
        }
    }

    /**
     * Obter metadados de um arquivo específico
     * @param {string} fileId - ID do arquivo
     * @returns {Promise<Object>} Metadados do arquivo
     */
    async getFileMetadata(fileId) {
        try {
            const response = await fetch(`${this.baseURL}/${fileId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Arquivo não encontrado');
            }

            return await response.json();

        } catch (error) {
            ErrorHandler.showError('Erro ao obter informações do arquivo', error);
            throw error;
        }
    }

    /**
     * Download de arquivo
     * @param {string} fileId - ID do arquivo
     * @param {string} fileName - Nome do arquivo (para save dialog)
     * @returns {Promise<void>}
     */
    async downloadFile(fileId, fileName = null) {
        try {
            const url = `${this.baseURL}/${fileId}/download`;
            
            // Criar link temporário para download
            const link = document.createElement('a');
            link.href = url;
            if (fileName) {
                link.download = fileName;
            }
            link.target = '_blank';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            ErrorHandler.showError('Erro ao fazer download do arquivo', error);
            throw error;
        }
    }

    /**
     * Excluir arquivo
     * @param {string} fileId - ID do arquivo
     * @returns {Promise<void>}
     */
    async deleteFile(fileId) {
        try {
            const response = await fetch(`${this.baseURL}/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erro ao excluir arquivo');
            }

            return await response.json();

        } catch (error) {
            ErrorHandler.showError('Erro ao excluir arquivo', error);
            throw error;
        }
    }

    /**
     * Validar arquivos antes do upload
     * @param {FileList|File[]} files - Arquivos para validar
     * @returns {Object} Resultado da validação
     */
    validateFiles(files) {
        const errors = [];
        const fileArray = Array.from(files);

        if (fileArray.length === 0) {
            return { valid: false, errors: ['Nenhum arquivo selecionado'] };
        }

        if (fileArray.length > 10) {
            errors.push('Máximo de 10 arquivos por vez');
        }

        fileArray.forEach((file, index) => {
            // Validar tamanho
            if (file.size > this.maxFileSize) {
                const sizeMB = Math.round(file.size / (1024 * 1024));
                errors.push(`${file.name}: arquivo muito grande (${sizeMB}MB). Máximo: 200MB`);
            }

            // Validar extensão
            const ext = this.getFileExtension(file.name);
            if (ext && !this.supportedExtensions.includes(ext.toLowerCase())) {
                errors.push(`${file.name}: tipo de arquivo não suportado (.${ext})`);
            }

            // Validar nome do arquivo
            if (file.name.length > 255) {
                errors.push(`${file.name}: nome do arquivo muito longo (máximo 255 caracteres)`);
            }

            // Verificar caracteres especiais no nome
            if (!/^[a-zA-Z0-9._\-\s()]+$/.test(file.name.replace(/\.[^.]+$/, ''))) {
                errors.push(`${file.name}: nome contém caracteres especiais não permitidos`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            validFiles: errors.length === 0 ? fileArray : []
        };
    }

    /**
     * Obter extensão do arquivo
     * @param {string} filename - Nome do arquivo
     * @returns {string|null} Extensão do arquivo
     */
    getFileExtension(filename) {
        const match = filename.match(/\.([^.]+)$/);
        return match ? match[1] : null;
    }

    /**
     * Formatar tamanho do arquivo para exibição
     * @param {number} bytes - Tamanho em bytes
     * @returns {string} Tamanho formatado
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Obter ícone baseado na extensão do arquivo
     * @param {string} extension - Extensão do arquivo
     * @returns {string} Classe do ícone
     */
    static getFileIcon(extension) {
        const iconMap = {
            pdf: 'fas fa-file-pdf text-danger',
            doc: 'fas fa-file-word text-primary',
            docx: 'fas fa-file-word text-primary',
            xls: 'fas fa-file-excel text-success',
            xlsx: 'fas fa-file-excel text-success',
            txt: 'fas fa-file-alt text-secondary',
            csv: 'fas fa-file-csv text-info',
            xml: 'fas fa-file-code text-warning',
            jpg: 'fas fa-file-image text-info',
            jpeg: 'fas fa-file-image text-info',
            png: 'fas fa-file-image text-info',
            gif: 'fas fa-file-image text-info',
            webp: 'fas fa-file-image text-info',
            svg: 'fas fa-file-image text-info',
            zip: 'fas fa-file-archive text-warning',
            rar: 'fas fa-file-archive text-warning',
            '7z': 'fas fa-file-archive text-warning',
            mp3: 'fas fa-file-audio text-purple',
            mp4: 'fas fa-file-video text-danger',
            avi: 'fas fa-file-video text-danger'
        };

        return iconMap[extension?.toLowerCase()] || 'fas fa-file text-secondary';
    }

    /**
     * Verificar se o arquivo é uma imagem
     * @param {string} extension - Extensão do arquivo
     * @returns {boolean}
     */
    static isImageFile(extension) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        return imageExtensions.includes(extension?.toLowerCase());
    }

    /**
     * Verificar se o arquivo pode ter preview
     * @param {string} extension - Extensão do arquivo
     * @returns {boolean}
     */
    static canPreview(extension) {
        const previewExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt'];
        return previewExtensions.includes(extension?.toLowerCase());
    }
}

export { FilesAPI };