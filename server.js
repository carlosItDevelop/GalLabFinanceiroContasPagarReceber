// Servidor Express para API REST
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Joi = require('joi');
const db = require('./database.js');

// Schemas de validação
const schemas = {
    contaPagar: Joi.object({
        descricao: Joi.string().min(3).max(255).required().messages({
            'string.empty': 'Descrição é obrigatória',
            'string.min': 'Descrição deve ter pelo menos 3 caracteres',
            'string.max': 'Descrição deve ter no máximo 255 caracteres'
        }),
        valor_original: Joi.number().positive().required().messages({
            'number.base': 'Valor deve ser um número',
            'number.positive': 'Valor deve ser maior que zero',
            'any.required': 'Valor é obrigatório'
        }),
        data_vencimento: Joi.date().required().messages({
            'date.base': 'Data de vencimento deve ser uma data válida',
            'any.required': 'Data de vencimento é obrigatória'
        }),
        fornecedor_id: Joi.string().guid({ version: 'uuidv4' }).allow(null).messages({
            'string.guid': 'Fornecedor deve ser um ID válido'
        }),
        categoria_id: Joi.string().guid({ version: 'uuidv4' }).allow(null).messages({
            'string.guid': 'Categoria deve ser um ID válido'
        }),
        observacoes: Joi.string().allow('').max(1000).messages({
            'string.max': 'Observações deve ter no máximo 1000 caracteres'
        })
    }),

    contaReceber: Joi.object({
        descricao: Joi.string().min(3).max(255).required().messages({
            'string.empty': 'Descrição é obrigatória',
            'string.min': 'Descrição deve ter pelo menos 3 caracteres',
            'string.max': 'Descrição deve ter no máximo 255 caracteres'
        }),
        valor_original: Joi.number().positive().required().messages({
            'number.base': 'Valor deve ser um número',
            'number.positive': 'Valor deve ser maior que zero',
            'any.required': 'Valor é obrigatório'
        }),
        data_vencimento: Joi.date().required().messages({
            'date.base': 'Data de vencimento deve ser uma data válida',
            'any.required': 'Data de vencimento é obrigatória'
        }),
        cliente_id: Joi.string().guid({ version: 'uuidv4' }).allow(null).messages({
            'string.guid': 'Cliente deve ser um ID válido'
        }),
        categoria_id: Joi.string().guid({ version: 'uuidv4' }).allow(null).messages({
            'string.guid': 'Categoria deve ser um ID válido'
        }),
        observacoes: Joi.string().allow('').max(1000).messages({
            'string.max': 'Observações deve ter no máximo 1000 caracteres'
        })
    }),

    contaUpdate: Joi.object({
        descricao: Joi.string().min(3).max(255),
        valor_original: Joi.number().positive(),
        data_vencimento: Joi.date(),
        data_pagamento: Joi.date().allow(null),
        status: Joi.string().valid('pendente', 'pago', 'recebido', 'atrasado', 'cancelado'),
        fornecedor_id: Joi.string().guid({ version: 'uuidv4' }).allow(null),
        cliente_id: Joi.string().guid({ version: 'uuidv4' }).allow(null),
        categoria_id: Joi.string().guid({ version: 'uuidv4' }).allow(null),
        observacoes: Joi.string().allow('').max(1000)
    }).min(1).messages({
        'object.min': 'Pelo menos um campo deve ser fornecido para atualização'
    }),

    filtros: Joi.object({
        status: Joi.string().valid('pendente', 'pago', 'recebido', 'atrasado', 'cancelado'),
        data_inicio: Joi.date(),
        data_fim: Joi.date(),
        fornecedor_id: Joi.string().guid({ version: 'uuidv4' }),
        cliente_id: Joi.string().guid({ version: 'uuidv4' }),
        categoria_id: Joi.string().guid({ version: 'uuidv4' }),
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100)
    })
};

// Middleware de validação
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        if (error) {
            const errorMessage = error.details[0].message;
            return res.status(400).json({ 
                error: errorMessage,
                field: error.details[0].path.join('.')
            });
        }
        req.validatedData = value;
        next();
    };
};

// Middleware para validar query parameters
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query);
        if (error) {
            const errorMessage = error.details[0].message;
            return res.status(400).json({ 
                error: errorMessage,
                field: error.details[0].path.join('.')
            });
        }
        req.validatedQuery = value;
        next();
    };
};

// Middleware para validar UUIDs em parâmetros
const validateUUID = (req, res, next) => {
    const { id } = req.params;
    const schema = Joi.string().guid({ version: 'uuidv4' }).required();
    const { error } = schema.validate(id);
    
    if (error) {
        return res.status(400).json({ error: 'ID deve ser um UUID válido' });
    }
    next();
};

// Middleware de tratamento de erros do banco
const handleDatabaseError = (error, req, res, next) => {
    console.error('Database Error:', error);
    
    if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Registro já existe' });
    }
    
    if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({ error: 'Referência inválida' });
    }
    
    if (error.code === '23502') { // Not null violation
        return res.status(400).json({ error: 'Campo obrigatório não informado' });
    }
    
    return res.status(500).json({ error: 'Erro interno do servidor' });
};

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de segurança
app.use(helmet({
    contentSecurityPolicy: false // Desabilitar para desenvolvimento
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por IP
});
app.use('/api', limiter);

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de log
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===== ROTAS DA API =====

// Dashboard
app.get('/api/dashboard', async (req, res) => {
    try {
        // Usar dados reais do banco via método agregado
        const dashboardResults = await db.getDashboardData();
        
        // Extrair dados dos resultados
        const totalPagar = parseFloat(dashboardResults.totalPagarMes.rows[0].total) || 0;
        const totalReceber = parseFloat(dashboardResults.totalReceberMes.rows[0].total) || 0;
        const vencidasPagar = parseInt(dashboardResults.contasVencidasPagar.rows[0].total) || 0;
        const vencidasReceber = parseInt(dashboardResults.contasVencidasReceber.rows[0].total) || 0;

        const dashboardData = {
            totalPagar,
            totalReceber,
            vencidasPagar,
            vencidasReceber,
            alertas: vencidasPagar + vencidasReceber,
            fluxoMensal: generateFluxoMock(), // TODO: Implementar dados reais de fluxo
            distribuicaoCategorias: generateCategoriasMock() // TODO: Implementar dados reais de categorias
        };

        res.json(dashboardData);
    } catch (error) {
        console.error('Erro no dashboard:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Contas a Pagar
app.get('/api/contas-pagar', validateQuery(schemas.filtros), async (req, res) => {
    try {
        const filtros = req.validatedQuery;
        const result = await db.getContasPagar(filtros);
        res.json(result.rows);
    } catch (error) {
        handleDatabaseError(error, req, res);
    }
});

app.post('/api/contas-pagar', validate(schemas.contaPagar), async (req, res) => {
    try {
        const conta = req.validatedData;
        const result = await db.createContaPagar(conta);
        
        // Log da operação
        await db.createLog({
            acao: 'CREATE',
            tabela: 'contas_pagar',
            registro_id: result.rows[0].id,
            detalhes: `Conta criada: ${conta.descricao}`
        });

        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleDatabaseError(error, req, res);
    }
});

app.put('/api/contas-pagar/:id', validateUUID, validate(schemas.contaUpdate), async (req, res) => {
    try {
        const { id } = req.params;
        const conta = req.validatedData;

        const result = await db.updateContaPagar(id, conta);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        // Log da operação
        await db.createLog({
            acao: 'UPDATE',
            tabela: 'contas_pagar',
            registro_id: id,
            detalhes: `Conta atualizada: ${conta.descricao || 'N/A'}`
        });

        res.json(result.rows[0]);
    } catch (error) {
        handleDatabaseError(error, req, res);
    }
});

app.delete('/api/contas-pagar/:id', validateUUID, async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar conta antes de deletar para log
        const contaResult = await db.query('SELECT descricao FROM contas_pagar WHERE id = $1', [id]);
        
        if (contaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        await db.deleteContaPagar(id);

        // Log da operação
        await db.createLog({
            acao: 'DELETE',
            tabela: 'contas_pagar',
            registro_id: id,
            detalhes: `Conta excluída: ${contaResult.rows[0].descricao}`
        });

        res.status(204).send();
    } catch (error) {
        handleDatabaseError(error, req, res);
    }
});

// Contas a Receber
app.get('/api/contas-receber', validateQuery(schemas.filtros), async (req, res) => {
    try {
        const filtros = req.validatedQuery;
        const result = await db.getContasReceber(filtros);
        res.json(result.rows);
    } catch (error) {
        handleDatabaseError(error, req, res);
    }
});

app.post('/api/contas-receber', validate(schemas.contaReceber), async (req, res) => {
    try {
        const conta = req.validatedData;
        const result = await db.createContaReceber(conta);
        
        // Log da operação
        await db.createLog({
            acao: 'CREATE',
            tabela: 'contas_receber',
            registro_id: result.rows[0].id,
            detalhes: `Conta criada: ${conta.descricao}`
        });

        res.status(201).json(result.rows[0]);
    } catch (error) {
        handleDatabaseError(error, req, res);
    }
});

app.put('/api/contas-receber/:id', validateUUID, validate(schemas.contaUpdate), async (req, res) => {
    try {
        const { id } = req.params;
        const conta = req.validatedData;

        const result = await db.updateContaReceber(id, conta);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        // Log da operação
        await db.createLog({
            acao: 'UPDATE',
            tabela: 'contas_receber',
            registro_id: id,
            detalhes: `Conta atualizada: ${conta.descricao || 'N/A'}`
        });

        res.json(result.rows[0]);
    } catch (error) {
        handleDatabaseError(error, req, res);
    }
});

app.delete('/api/contas-receber/:id', validateUUID, async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar conta antes de deletar para log
        const contaResult = await db.query('SELECT descricao FROM contas_receber WHERE id = $1', [id]);
        
        if (contaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conta não encontrada' });
        }

        await db.deleteContaReceber(id);

        // Log da operação
        await db.createLog({
            acao: 'DELETE',
            tabela: 'contas_receber',
            registro_id: id,
            detalhes: `Conta excluída: ${contaResult.rows[0].descricao}`
        });

        res.status(204).send();
    } catch (error) {
        handleDatabaseError(error, req, res);
    }
});

// Fornecedores
app.get('/api/fornecedores', async (req, res) => {
    try {
        const result = await db.getFornecedores();
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
        res.status(500).json({ error: 'Erro ao buscar fornecedores' });
    }
});

// Clientes
app.get('/api/clientes', async (req, res) => {
    try {
        const result = await db.getClientes();
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

// Categorias
app.get('/api/categorias', async (req, res) => {
    try {
        const { tipo } = req.query;
        const result = await db.getCategorias(tipo);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// Logs
app.get('/api/logs', validateQuery(schemas.filtros), async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.validatedQuery;
        const result = await db.getLogs(parseInt(page), parseInt(limit));
        res.json(result.rows);
    } catch (error) {
        handleDatabaseError(error, req, res);
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ===== FUNÇÕES AUXILIARES =====

function generateFluxoMock() {
    const baseEntradas = [25000, 22000, 35000, 33000, 27000, 45000];
    const baseSaidas = [18000, 16000, 23000, 24000, 24000, 32000];
    
    const entradas = baseEntradas.map(valor => 
        Math.round(valor + (Math.random() - 0.5) * valor * 0.3)
    );
    const saidas = baseSaidas.map(valor => 
        Math.round(valor + (Math.random() - 0.5) * valor * 0.2)
    );

    return {
        categorias: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        entradas,
        saidas
    };
}

function generateCategoriasMock() {
    return {
        labels: ['Fornecedores', 'Utilidades', 'Escritório', 'Serviços', 'Outros'],
        series: [35, 25, 20, 15, 5],
        colors: ['#007bff', '#28a745', '#ffc107', '#17a2b8', '#6c757d']
    };
}

// ===== MIDDLEWARE DE ERRO =====
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// ===== ROTA 404 =====
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint não encontrado' });
    }
    next();
});

// ===== INICIALIZAÇÃO =====
async function startServer() {
    try {
        // Testar conexão com banco
        await db.query('SELECT NOW()');
        console.log('✅ Conexão com banco de dados estabelecida');

        app.listen(PORT, () => {
            console.log(`🚀 Servidor API rodando na porta ${PORT}`);
            console.log(`📡 Endpoints disponíveis em http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;