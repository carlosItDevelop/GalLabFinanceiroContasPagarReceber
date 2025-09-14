// Validador de formulários frontend
import { ErrorHandler } from './error-handler.js';

export class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.errors = new Map();
        this.rules = new Map();
        
        this.setupValidation();
    }

    setupValidation() {
        if (!this.form) return;

        // Validação em tempo real
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.validateForm();
        });

        // Validação por campo
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    addRule(fieldName, validationFn, errorMessage) {
        if (!this.rules.has(fieldName)) {
            this.rules.set(fieldName, []);
        }
        this.rules.get(fieldName).push({ validationFn, errorMessage });
        return this;
    }

    addRequiredRule(fieldName, message = null) {
        return this.addRule(
            fieldName,
            (value) => value && value.toString().trim() !== '',
            message || `${this.getFieldLabel(fieldName)} é obrigatório`
        );
    }

    addEmailRule(fieldName, message = null) {
        return this.addRule(
            fieldName,
            (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            message || `${this.getFieldLabel(fieldName)} deve ser um email válido`
        );
    }

    addNumberRule(fieldName, min = null, max = null, message = null) {
        return this.addRule(
            fieldName,
            (value) => {
                if (!value) return true; // Campo opcional
                const num = parseFloat(value);
                if (isNaN(num)) return false;
                if (min !== null && num < min) return false;
                if (max !== null && num > max) return false;
                return true;
            },
            message || this.generateNumberMessage(fieldName, min, max)
        );
    }

    addDateRule(fieldName, minDate = null, maxDate = null, message = null) {
        return this.addRule(
            fieldName,
            (value) => {
                if (!value) return true; // Campo opcional
                const date = new Date(value);
                if (isNaN(date.getTime())) return false;
                if (minDate && date < new Date(minDate)) return false;
                if (maxDate && date > new Date(maxDate)) return false;
                return true;
            },
            message || this.generateDateMessage(fieldName, minDate, maxDate)
        );
    }

    addCustomRule(fieldName, validationFn, message) {
        return this.addRule(fieldName, validationFn, message);
    }

    validateField(field) {
        const fieldName = field.name || field.id;
        if (!fieldName) return true;

        const value = this.getFieldValue(field);
        const rules = this.rules.get(fieldName) || [];
        
        this.clearFieldError(field);
        
        for (const rule of rules) {
            if (!rule.validationFn(value)) {
                this.setFieldError(field, rule.errorMessage);
                return false;
            }
        }
        
        this.setFieldSuccess(field);
        return true;
    }

    validateForm() {
        this.clearAllErrors();
        let isValid = true;

        // Validar todos os campos com regras
        for (const [fieldName] of this.rules) {
            const field = this.form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        }

        if (isValid) {
            this.onValidationSuccess();
        } else {
            this.onValidationError();
        }

        return isValid;
    }

    getFieldValue(field) {
        if (field.type === 'checkbox') {
            return field.checked;
        } else if (field.type === 'radio') {
            const radioGroup = this.form.querySelectorAll(`[name="${field.name}"]:checked`);
            return radioGroup.length > 0 ? radioGroup[0].value : '';
        }
        return field.value;
    }

    getFieldLabel(fieldName) {
        const field = this.form.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!field) return fieldName;

        const label = this.form.querySelector(`label[for="${field.id}"]`);
        if (label) {
            return label.textContent.replace('*', '').trim();
        }

        return field.placeholder || fieldName;
    }

    setFieldError(field, message) {
        const fieldName = field.name || field.id;
        this.errors.set(fieldName, message);

        field.classList.add('field-error');
        field.classList.remove('field-success');

        // Criar ou atualizar mensagem de erro
        let errorElement = field.parentElement.querySelector('.field-error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error-message';
            field.parentElement.appendChild(errorElement);
        }
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    setFieldSuccess(field) {
        field.classList.remove('field-error');
        field.classList.add('field-success');
        this.clearFieldError(field);
    }

    clearFieldError(field) {
        const fieldName = field.name || field.id;
        this.errors.delete(fieldName);

        field.classList.remove('field-error');
        
        const errorElement = field.parentElement.querySelector('.field-error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    clearAllErrors() {
        this.errors.clear();
        
        const errorFields = this.form.querySelectorAll('.field-error');
        errorFields.forEach(field => {
            field.classList.remove('field-error', 'field-success');
        });

        const errorMessages = this.form.querySelectorAll('.field-error-message');
        errorMessages.forEach(msg => {
            msg.style.display = 'none';
        });
    }

    generateNumberMessage(fieldName, min, max) {
        const label = this.getFieldLabel(fieldName);
        if (min !== null && max !== null) {
            return `${label} deve ser um número entre ${min} e ${max}`;
        } else if (min !== null) {
            return `${label} deve ser maior ou igual a ${min}`;
        } else if (max !== null) {
            return `${label} deve ser menor ou igual a ${max}`;
        }
        return `${label} deve ser um número válido`;
    }

    generateDateMessage(fieldName, minDate, maxDate) {
        const label = this.getFieldLabel(fieldName);
        if (minDate && maxDate) {
            return `${label} deve estar entre ${minDate} e ${maxDate}`;
        } else if (minDate) {
            return `${label} deve ser posterior a ${minDate}`;
        } else if (maxDate) {
            return `${label} deve ser anterior a ${maxDate}`;
        }
        return `${label} deve ser uma data válida`;
    }

    onValidationSuccess() {
        // Método para ser sobrescrito
        console.log('Formulário válido');
    }

    onValidationError() {
        // Mostrar primeiro erro
        const firstError = this.errors.values().next().value;
        if (firstError) {
            ErrorHandler.showError(firstError);
        }

        // Focar no primeiro campo com erro
        const firstErrorField = this.form.querySelector('.field-error');
        if (firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    getFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    setFormData(data) {
        for (const [key, value] of Object.entries(data)) {
            const field = this.form.querySelector(`[name="${key}"], #${key}`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = !!value;
                } else {
                    field.value = value;
                }
            }
        }
    }

    reset() {
        this.form.reset();
        this.clearAllErrors();
    }
}