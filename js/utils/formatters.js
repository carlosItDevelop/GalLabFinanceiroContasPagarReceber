// Utilitários de formatação e helpers
export class Formatters {
    static formatCurrency(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return 'R$ 0,00';
        }
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    static formatDate(date) {
        if (!date) return '';
        
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    }

    static formatDateTime(date) {
        if (!date) return '';
        
        const d = new Date(date);
        return d.toLocaleString('pt-BR');
    }

    static parseDate(dateString) {
        if (!dateString) return null;
        return new Date(dateString);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    static validateColor(color) {
        // Validate hex color format
        const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
        return hexRegex.test(color) ? color : '#6c757d';
    }

    static buildQueryString(params) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                query.append(key, value);
            }
        });
        return query.toString();
    }
}