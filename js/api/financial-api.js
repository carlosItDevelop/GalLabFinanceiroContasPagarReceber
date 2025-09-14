// API para comunicação com o backend
export class FinancialAPI {
    constructor() {
        this.baseURL = '/api';
    }

    // === MÉTODOS GENÉRICOS ===
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options
        };

        // Only add Content-Type for requests with body
        if (options.body && !config.headers?.['Content-Type']) {
            config.headers = {
                'Content-Type': 'application/json',
                ...config.headers
            };
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // HTTP method helpers
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // === DASHBOARD ===
    async getDashboardData() {
        try {
            return await this.get('/dashboard');
        } catch (error) {
            console.warn('Fallback para dados simulados devido a erro na API:', error);
            return this.generateMockDashboardData();
        }
    }

    generateMockDashboardData() {
        const baseEntradas = [25000, 22000, 35000, 33000, 27000, 45000];
        const baseSaidas = [18000, 16000, 23000, 24000, 24000, 32000];
        
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

    // === CONTAS A PAGAR ===
    async getContasPagar(filtros = {}) {
        return this.get('/contas-pagar', filtros);
    }

    async createContaPagar(conta) {
        return this.post('/contas-pagar', conta);
    }

    async updateContaPagar(id, conta) {
        return this.put(`/contas-pagar/${id}`, conta);
    }

    async deleteContaPagar(id) {
        return this.delete(`/contas-pagar/${id}`);
    }

    // === CONTAS A RECEBER ===
    async getContasReceber(filtros = {}) {
        return this.get('/contas-receber', filtros);
    }

    async createContaReceber(conta) {
        return this.post('/contas-receber', conta);
    }

    async updateContaReceber(id, conta) {
        return this.put(`/contas-receber/${id}`, conta);
    }

    async deleteContaReceber(id) {
        return this.delete(`/contas-receber/${id}`);
    }

    // === FORNECEDORES E CLIENTES ===
    async getFornecedores() {
        return this.get('/fornecedores');
    }

    async getClientes() {
        return this.get('/clientes');
    }

    async getCategorias(tipo = null) {
        const params = tipo ? { tipo } : {};
        return this.get('/categorias', params);
    }
}