// Sistema robusto de tratamento de erros
export class ErrorHandler {
    static showError(message, type = 'error', duration = 5000) {
        this.showNotification(message, type, duration);
    }

    static showSuccess(message, duration = 3000) {
        this.showNotification(message, 'success', duration);
    }

    static showWarning(message, duration = 4000) {
        this.showNotification(message, 'warning', duration);
    }

    static showNotification(message, type = 'info', duration = 4000) {
        // Verificar se SweetAlert2 está disponível
        if (typeof Swal !== 'undefined') {
            const config = {
                title: this.getNotificationTitle(type),
                text: message,
                icon: this.getSweetAlertIcon(type),
                timer: duration,
                timerProgressBar: true,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                showCloseButton: true
            };
            Swal.fire(config);
        } else {
            // Fallback para notificações simples
            this.showSimpleNotification(message, type, duration);
        }
    }

    static showSimpleNotification(message, type, duration) {
        // Criar container se não existir
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // Criar notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Usar createElement para evitar XSS
        const iconDiv = document.createElement('div');
        iconDiv.className = 'notification-icon';
        iconDiv.textContent = this.getNotificationIcon(type);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'notification-content';
        contentDiv.textContent = message; // Usar textContent para segurança
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => notification.remove();
        
        notification.appendChild(iconDiv);
        notification.appendChild(contentDiv);
        notification.appendChild(closeBtn);

        container.appendChild(notification);

        // Auto-remover após duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);

        // Adicionar animação
        setTimeout(() => notification.classList.add('notification-show'), 100);
    }

    static getNotificationTitle(type) {
        const titles = {
            'error': 'Erro',
            'success': 'Sucesso',
            'warning': 'Atenção',
            'info': 'Informação'
        };
        return titles[type] || 'Notificação';
    }

    static getNotificationIcon(type) {
        const icons = {
            'error': '❌',
            'success': '✅', 
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    static getSweetAlertIcon(type) {
        const icons = {
            'error': 'error',
            'success': 'success',
            'warning': 'warning',
            'info': 'info'
        };
        return icons[type] || 'info';
    }

    static async handleApiError(error, context = '') {
        console.error(`API Error${context ? ' in ' + context : ''}:`, error);
        
        let message = 'Ocorreu um erro inesperado';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            message = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message) {
            try {
                const errorData = JSON.parse(error.message);
                message = errorData.error || message;
            } catch {
                message = error.message;
            }
        }

        this.showError(message);
        return { error: true, message };
    }

    static async withRetry(asyncFunction, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await asyncFunction();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    break;
                }
                
                // Exponential backoff
                const retryDelay = delay * Math.pow(2, attempt - 1);
                console.warn(`Tentativa ${attempt} falhou, tentando novamente em ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        throw lastError;
    }

    static validateRequired(value, fieldName) {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            throw new Error(`${fieldName} é obrigatório`);
        }
    }

    static validateNumber(value, fieldName, min = null, max = null) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            throw new Error(`${fieldName} deve ser um número válido`);
        }
        if (min !== null && num < min) {
            throw new Error(`${fieldName} deve ser maior ou igual a ${min}`);
        }
        if (max !== null && num > max) {
            throw new Error(`${fieldName} deve ser menor ou igual a ${max}`);
        }
        return num;
    }

    static validateDate(value, fieldName) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            throw new Error(`${fieldName} deve ser uma data válida`);
        }
        return date;
    }

    static validateEmail(value, fieldName) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
            throw new Error(`${fieldName} deve ser um email válido`);
        }
    }

    static validateCNPJCPF(value, fieldName) {
        if (!value) return; // Campo opcional
        
        // Remove formatação
        const cleaned = value.replace(/[^\d]/g, '');
        
        if (cleaned.length === 11) {
            // Validação CPF simplificada
            if (!/^\d{11}$/.test(cleaned)) {
                throw new Error(`${fieldName} deve ser um CPF válido`);
            }
        } else if (cleaned.length === 14) {
            // Validação CNPJ simplificada  
            if (!/^\d{14}$/.test(cleaned)) {
                throw new Error(`${fieldName} deve ser um CNPJ válido`);
            }
        } else {
            throw new Error(`${fieldName} deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos) válido`);
        }
    }
}