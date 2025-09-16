
// database.js - Conexões e operações do banco PostgreSQL
const { Pool } = require('pg');

class Database {
    constructor() {
        // Configuração da conexão com pool
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 10, // máximo de 10 conexões no pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Event listeners para monitoramento
        this.pool.on('error', (err) => {
            console.error('Erro inesperado no pool de conexões:', err);
        });
    }

    // Método genérico para executar queries
    async query(text, params) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } catch (error) {
            console.error('Erro na query:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Método para transações
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // === MÉTODOS PARA FORNECEDORES ===
    async getFornecedores(filtros = {}) {
        let query = 'SELECT * FROM fornecedores WHERE ativo = true';
        const params = [];
        
        if (filtros.nome) {
            params.push(`%${filtros.nome}%`);
            query += ` AND nome ILIKE $${params.length}`;
        }
        
        query += ' ORDER BY nome';
        return await this.query(query, params);
    }

    async createFornecedor(dados) {
        const query = `
            INSERT INTO fornecedores (nome, cnpj_cpf, email, telefone, endereco, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const params = [dados.nome, dados.cnpj_cpf, dados.email, dados.telefone, dados.endereco, dados.observacoes];
        return await this.query(query, params);
    }

    // === MÉTODOS PARA CLIENTES ===
    async getClientes(filtros = {}) {
        let query = 'SELECT * FROM clientes WHERE ativo = true';
        const params = [];
        
        if (filtros.nome) {
            params.push(`%${filtros.nome}%`);
            query += ` AND nome ILIKE $${params.length}`;
        }
        
        query += ' ORDER BY nome';
        return await this.query(query, params);
    }

    async createCliente(dados) {
        const query = `
            INSERT INTO clientes (nome, cnpj_cpf, email, telefone, endereco, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const params = [dados.nome, dados.cnpj_cpf, dados.email, dados.telefone, dados.endereco, dados.observacoes];
        return await this.query(query, params);
    }

    // === MÉTODOS PARA CATEGORIAS ===
    async getCategorias(tipo = null) {
        let query = 'SELECT * FROM categorias WHERE ativo = true';
        const params = [];
        
        if (tipo) {
            params.push(tipo);
            query += ` AND tipo = $${params.length}`;
        }
        
        query += ' ORDER BY nome';
        return await this.query(query, params);
    }

    async createCategoria(dados) {
        const query = `
            INSERT INTO categorias (nome, tipo, cor, descricao)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const params = [dados.nome, dados.tipo, dados.cor, dados.descricao];
        return await this.query(query, params);
    }

    // === MÉTODOS PARA CONTAS A PAGAR ===
    async getContasPagar(filtros = {}) {
        let query = `
            SELECT cp.*, f.nome as fornecedor_nome, c.nome as categoria_nome, c.cor as categoria_cor
            FROM contas_pagar cp
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            LEFT JOIN categorias c ON cp.categoria_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (filtros.status) {
            params.push(filtros.status);
            query += ` AND cp.status = $${params.length}`;
        }

        if (filtros.data_inicio) {
            params.push(filtros.data_inicio);
            query += ` AND cp.data_vencimento >= $${params.length}`;
        }

        if (filtros.data_fim) {
            params.push(filtros.data_fim);
            query += ` AND cp.data_vencimento <= $${params.length}`;
        }

        query += ' ORDER BY cp.data_vencimento, cp.created_at DESC';
        return await this.query(query, params);
    }

    async createContaPagar(dados) {
        const query = `
            INSERT INTO contas_pagar (fornecedor_id, categoria_id, descricao, valor_original, data_vencimento, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const params = [dados.fornecedor_id, dados.categoria_id, dados.descricao, dados.valor_original, dados.data_vencimento, dados.observacoes];
        return await this.query(query, params);
    }

    async pagarConta(id, valor_pago, data_pagamento = new Date()) {
        return await this.transaction(async (client) => {
            // Atualizar conta
            const updateQuery = `
                UPDATE contas_pagar 
                SET valor_pago = valor_pago + $1, data_pagamento = $2, status = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;
            const status = 'pago'; // Pode ser ajustado para pagamento parcial
            await client.query(updateQuery, [valor_pago, data_pagamento, status, id]);

            // Log da operação
            await this.logOperacao(client, 'contas_pagar', id, 'update', { acao: 'pagamento', valor: valor_pago });
        });
    }

    // === MÉTODOS PARA CONTAS A RECEBER ===
    async getContasReceber(filtros = {}) {
        let query = `
            SELECT cr.*, cl.nome as cliente_nome, c.nome as categoria_nome, c.cor as categoria_cor
            FROM contas_receber cr
            LEFT JOIN clientes cl ON cr.cliente_id = cl.id
            LEFT JOIN categorias c ON cr.categoria_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (filtros.status) {
            params.push(filtros.status);
            query += ` AND cr.status = $${params.length}`;
        }

        if (filtros.data_inicio) {
            params.push(filtros.data_inicio);
            query += ` AND cr.data_vencimento >= $${params.length}`;
        }

        if (filtros.data_fim) {
            params.push(filtros.data_fim);
            query += ` AND cr.data_vencimento <= $${params.length}`;
        }

        query += ' ORDER BY cr.data_vencimento, cr.created_at DESC';
        return await this.query(query, params);
    }

    async createContaReceber(dados) {
        const query = `
            INSERT INTO contas_receber (cliente_id, categoria_id, descricao, valor_original, data_vencimento, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const params = [dados.cliente_id, dados.categoria_id, dados.descricao, dados.valor_original, dados.data_vencimento, dados.observacoes];
        return await this.query(query, params);
    }

    async receberConta(id, valor_recebido, data_recebimento = new Date()) {
        return await this.transaction(async (client) => {
            // Atualizar conta
            const updateQuery = `
                UPDATE contas_receber 
                SET valor_recebido = valor_recebido + $1, data_recebimento = $2, status = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;
            const status = 'recebido'; // Pode ser ajustado para recebimento parcial
            await client.query(updateQuery, [valor_recebido, data_recebimento, status, id]);

            // Log da operação
            await this.logOperacao(client, 'contas_receber', id, 'update', { acao: 'recebimento', valor: valor_recebido });
        });
    }

    // === MÉTODOS PARA EDIÇÃO COM ANEXOS ===
    async updateContaPagar(id, dados) {
        const query = `
            UPDATE contas_pagar 
            SET descricao = $1, valor_original = $2, data_vencimento = $3, 
                fornecedor_id = $4, categoria_id = $5, observacoes = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `;
        const params = [
            dados.descricao, dados.valor_original, dados.data_vencimento,
            dados.fornecedor_id, dados.categoria_id, dados.observacoes, id
        ];
        return await this.query(query, params);
    }

    async updateContaReceber(id, dados) {
        const query = `
            UPDATE contas_receber 
            SET descricao = $1, valor_original = $2, data_vencimento = $3, 
                cliente_id = $4, categoria_id = $5, observacoes = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `;
        const params = [
            dados.descricao, dados.valor_original, dados.data_vencimento,
            dados.cliente_id, dados.categoria_id, dados.observacoes, id
        ];
        return await this.query(query, params);
    }

    async getContaById(tipo, id) {
        const table = tipo === 'pagar' ? 'contas_pagar' : 'contas_receber';
        const joinTable = tipo === 'pagar' ? 'fornecedores' : 'clientes';
        const joinField = tipo === 'pagar' ? 'fornecedor_id' : 'cliente_id';
        
        const query = `
            SELECT c.*, e.nome as entidade_nome, cat.nome as categoria_nome
            FROM ${table} c
            LEFT JOIN ${joinTable} e ON c.${joinField} = e.id
            LEFT JOIN categorias cat ON c.categoria_id = cat.id
            WHERE c.id = $1
        `;
        return await this.query(query, [id]);
    }

    // === MÉTODOS PARA DASHBOARD ===
    async getDashboardData() {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

        const queries = {
            totalPagarMes: `
                SELECT COALESCE(SUM(valor_original - valor_pago), 0) as total
                FROM contas_pagar 
                WHERE data_vencimento BETWEEN $1 AND $2 AND status != 'cancelado'
            `,
            totalReceberMes: `
                SELECT COALESCE(SUM(valor_original - valor_recebido), 0) as total
                FROM contas_receber 
                WHERE data_vencimento BETWEEN $1 AND $2 AND status != 'cancelado'
            `,
            contasVencidasPagar: `
                SELECT COUNT(*) as total
                FROM contas_pagar 
                WHERE data_vencimento < CURRENT_DATE AND status = 'pendente'
            `,
            contasVencidasReceber: `
                SELECT COUNT(*) as total
                FROM contas_receber 
                WHERE data_vencimento < CURRENT_DATE AND status = 'pendente'
            `
        };

        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            if (key.includes('Mes')) {
                results[key] = await this.query(query, [inicioMes, fimMes]);
            } else {
                results[key] = await this.query(query);
            }
        }

        return results;
    }

    // === MÉTODO PARA LOGS ===
    async logOperacao(client, tabela, registro_id, acao, dados) {
        const query = `
            INSERT INTO logs_sistema (tabela, registro_id, acao, dados_novos, usuario, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const params = [tabela, registro_id, acao, JSON.stringify(dados), 'sistema', '127.0.0.1'];
        
        if (client) {
            return await client.query(query, params);
        } else {
            return await this.query(query, params);
        }
    }

    // === MÉTODOS PARA COMENTÁRIOS ===
    async addComment(tipo, contaId, comentario) {
        const table = tipo === 'pagar' ? 'contas_pagar_comments' : 'contas_receber_comments';
        const foreignKey = tipo === 'pagar' ? 'conta_pagar_id' : 'conta_receber_id';
        
        const query = `
            INSERT INTO ${table} (${foreignKey}, comentario, usuario)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        return await this.query(query, [contaId, comentario, 'Usuário Sistema']);
    }

    async getComments(tipo, contaId) {
        const table = tipo === 'pagar' ? 'contas_pagar_comments' : 'contas_receber_comments';
        const foreignKey = tipo === 'pagar' ? 'conta_pagar_id' : 'conta_receber_id';
        
        const query = `
            SELECT * FROM ${table} 
            WHERE ${foreignKey} = $1 
            ORDER BY created_at DESC
        `;
        return await this.query(query, [contaId]);
    }

    // === MÉTODOS PARA ANEXOS ===
    async addAttachment(tipo, contaId, dadosArquivo) {
        const table = tipo === 'pagar' ? 'contas_pagar_attachments' : 'contas_receber_attachments';
        const foreignKey = tipo === 'pagar' ? 'conta_pagar_id' : 'conta_receber_id';
        
        const query = `
            INSERT INTO ${table} (${foreignKey}, nome_arquivo, caminho_arquivo, tamanho_arquivo, tipo_arquivo, usuario)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        return await this.query(query, [
            contaId, 
            dadosArquivo.nome, 
            dadosArquivo.caminho, 
            dadosArquivo.tamanho, 
            dadosArquivo.tipo, 
            'Usuário Sistema'
        ]);
    }

    async getAttachments(tipo, contaId) {
        const table = tipo === 'pagar' ? 'contas_pagar_attachments' : 'contas_receber_attachments';
        const foreignKey = tipo === 'pagar' ? 'conta_pagar_id' : 'conta_receber_id';
        
        const query = `
            SELECT * FROM ${table} 
            WHERE ${foreignKey} = $1 
            ORDER BY created_at DESC
        `;
        return await this.query(query, [contaId]);
    }

    // === MÉTODO PARA CRIAR TABELAS ===
    async createTables() {
        const tables = [
            // Habilitar extensão UUID
            `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
            
            `CREATE TABLE IF NOT EXISTS fornecedores (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                nome VARCHAR(255) NOT NULL,
                cnpj_cpf VARCHAR(20) UNIQUE,
                email VARCHAR(255),
                telefone VARCHAR(20),
                endereco TEXT,
                observacoes TEXT,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS clientes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                nome VARCHAR(255) NOT NULL,
                cnpj_cpf VARCHAR(20) UNIQUE,
                email VARCHAR(255),
                telefone VARCHAR(20),
                endereco TEXT,
                observacoes TEXT,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS categorias (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                nome VARCHAR(255) NOT NULL,
                tipo VARCHAR(20) CHECK (tipo IN ('pagar', 'receber')),
                cor VARCHAR(7),
                descricao TEXT,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS contas_pagar (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                fornecedor_id UUID REFERENCES fornecedores(id),
                categoria_id UUID REFERENCES categorias(id),
                descricao VARCHAR(255) NOT NULL,
                valor_original DECIMAL(10,2) NOT NULL,
                valor_pago DECIMAL(10,2) DEFAULT 0,
                data_vencimento DATE NOT NULL,
                data_pagamento DATE,
                status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
                observacoes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS contas_receber (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                cliente_id UUID REFERENCES clientes(id),
                categoria_id UUID REFERENCES categorias(id),
                descricao VARCHAR(255) NOT NULL,
                valor_original DECIMAL(10,2) NOT NULL,
                valor_recebido DECIMAL(10,2) DEFAULT 0,
                data_vencimento DATE NOT NULL,
                data_recebimento DATE,
                status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'atrasado', 'cancelado')),
                observacoes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS logs_sistema (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tabela VARCHAR(50) NOT NULL,
                registro_id UUID,
                acao VARCHAR(20) NOT NULL,
                dados_anteriores JSONB,
                dados_novos JSONB,
                usuario VARCHAR(255),
                ip_address INET,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Tabelas para comentários
            `CREATE TABLE IF NOT EXISTS contas_pagar_comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conta_pagar_id UUID REFERENCES contas_pagar(id) ON DELETE CASCADE,
                comentario TEXT NOT NULL,
                usuario VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS contas_receber_comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conta_receber_id UUID REFERENCES contas_receber(id) ON DELETE CASCADE,
                comentario TEXT NOT NULL,
                usuario VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Tabelas para anexos
            `CREATE TABLE IF NOT EXISTS contas_pagar_attachments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conta_pagar_id UUID REFERENCES contas_pagar(id) ON DELETE CASCADE,
                nome_arquivo VARCHAR(255) NOT NULL,
                caminho_arquivo VARCHAR(500) NOT NULL,
                tamanho_arquivo INTEGER,
                tipo_arquivo VARCHAR(100),
                usuario VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS contas_receber_attachments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conta_receber_id UUID REFERENCES contas_receber(id) ON DELETE CASCADE,
                nome_arquivo VARCHAR(255) NOT NULL,
                caminho_arquivo VARCHAR(500) NOT NULL,
                tamanho_arquivo INTEGER,
                tipo_arquivo VARCHAR(100),
                usuario VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        try {
            for (const table of tables) {
                await this.query(table);
            }
            console.log('Tabelas criadas com sucesso com UUIDs!');
            return true;
        } catch (error) {
            console.error('Erro ao criar tabelas:', error);
            throw error;
        }
    }

    // Fechar todas as conexões
    async close() {
        await this.pool.end();
    }
}

// Instância única do banco (singleton)
const db = new Database();

module.exports = db;
