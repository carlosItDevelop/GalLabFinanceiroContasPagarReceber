// Servidor Express para API REST
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Joi = require('joi');
const multer = require('multer');
const fs = require('fs').promises;
const crypto = require('crypto');
const { fileTypeFromBuffer } = require('file-type');
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
    }),

    upload: Joi.object({
        entity_type: Joi.string().optional().max(50),
        entity_id: Joi.string().uuid().optional(),
        access_scope: Joi.string().valid('private', 'public', 'signed').default('private')
    }),

    filesQuery: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        q: Joi.string().optional(),
        type: Joi.string().optional(),
        ext: Joi.string().optional(),
        entity_type: Joi.string().optional(),
        entity_id: Joi.string().uuid().optional()
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

// Configuração do multer para upload de arquivos com streaming
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const uploadPath = createDirectoryPath();
            const fullPath = path.join('wwwroot', uploadPath);
            await fs.mkdir(fullPath, { recursive: true });
            cb(null, fullPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const fileId = crypto.randomUUID();
        const ext = path.extname(file.originalname).toLowerCase().substring(1);
        const fileName = `${fileId}.${ext}`;
        
        // Store metadata for later use
        if (!req.fileMetadata) req.fileMetadata = [];
        req.fileMetadata.push({
            fieldname: file.fieldname,
            originalname: file.originalname,
            fileId: fileId,
            fileName: fileName,
            ext: ext
        });
        
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit
        files: 10 // Max 10 files per request
    },
    fileFilter: async (req, file, cb) => {
        try {
            const ext = path.extname(file.originalname).toLowerCase().substring(1);
            if (!ext) {
                return cb(new Error('Arquivo deve ter uma extensão válida'));
            }
            
            // Quick validation against allowed extensions from database
            const allowedTypesResult = await db.query(
                'SELECT extension, mime_type, max_size_mb FROM allowed_file_types WHERE extension = $1 AND is_active = true',
                [ext]
            );
            
            if (allowedTypesResult.rows.length === 0) {
                return cb(new Error(`Tipo de arquivo não permitido: .${ext}`));
            }
            
            cb(null, true);
        } catch (error) {
            cb(new Error('Erro ao validar arquivo: ' + error.message));
        }
    }
});

// Servir arquivos estáticos da pasta wwwroot
app.use('/static', express.static(path.join(__dirname, 'wwwroot')));

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

// ===== ARQUIVOS API =====

// Helper functions para gerenciamento de arquivos
const createDirectoryPath = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `files/upload/${year}/${month}`;
};

const calculateSHA256 = async (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = require('fs').createReadStream(filePath);
        
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
};

const validateFileType = async (filePath, originalName, fileSizeBytes) => {
    try {
        // Read only first few bytes for magic number detection
        const buffer = Buffer.alloc(4100); // Enough for most magic numbers
        const fd = await fs.open(filePath, 'r');
        try {
            await fd.read(buffer, 0, 4100, 0);
        } finally {
            await fd.close();
        }
        
        const detectedType = await fileTypeFromBuffer(buffer);
        const ext = path.extname(originalName).toLowerCase().substring(1);
        
        // Query allowed types from database
        const allowedTypesResult = await db.query(
            'SELECT extension, mime_type, max_size_mb FROM allowed_file_types WHERE extension = $1 AND is_active = true',
            [ext]
        );
        
        if (allowedTypesResult.rows.length === 0) {
            throw new Error(`Tipo de arquivo não permitido: .${ext}`);
        }
        
        const allowedType = allowedTypesResult.rows[0];
        
        // CRITICAL SECURITY: Validate magic number matches expected MIME type
        if (detectedType) {
            const expectedMimes = allowedType.mime_type.split(',').map(m => m.trim());
            if (!expectedMimes.includes(detectedType.mime)) {
                throw new Error(
                    `Arquivo suspeito: extensão .${ext} não corresponde ao conteúdo real (${detectedType.mime}). ` +
                    `Esperado: ${allowedType.mime_type}`
                );
            }
        } else {
            // For files without detectable magic numbers (like .txt), allow but log
            console.warn(`Magic number não detectado para arquivo: ${originalName} (.${ext})`);
        }
        
        const maxSizeBytes = allowedType.max_size_mb * 1024 * 1024;
        if (fileSizeBytes > maxSizeBytes) {
            throw new Error(`Arquivo muito grande. Máximo permitido: ${allowedType.max_size_mb}MB`);
        }
        
        return {
            extension: ext,
            mimeType: allowedType.mime_type,
            maxSizeMb: allowedType.max_size_mb,
            detectedMime: detectedType?.mime || null
        };
    } catch (error) {
        throw new Error(`Erro na validação do arquivo: ${error.message}`);
    }
};

// Function to get relative storage path from absolute file path
const getRelativeStoragePath = (absolutePath) => {
    const wwwrootPath = path.join(__dirname, 'wwwroot');
    return path.relative(wwwrootPath, absolutePath);
};

const checkDuplicateFile = async (sha256, sizeBytes) => {
    try {
        const result = await db.query(
            'SELECT id, original_name, storage_path, ext, mime_type FROM files WHERE sha256 = $1 AND size_bytes = $2 AND deleted_at IS NULL',
            [sha256, sizeBytes]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error checking duplicate file:', error);
        return null;
    }
};

// Function to safely delete uploaded file on error
const cleanupUploadedFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error('Error cleaning up file:', filePath, error);
    }
};

// Upload de arquivos
app.post('/api/files', upload.array('files', 10), async (req, res) => {
    
    try {
        const { error: validationError, value: validatedBody } = schemas.upload.validate(req.body);
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: validationError.details.map(d => d.message)
            });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo enviado'
            });
        }
        
        const uploadedFiles = [];
        const errors = [];
        
        // Begin transaction
        await db.query('BEGIN');
        
        try {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                const fileMetadata = req.fileMetadata[i];
                
                try {
                    // Validate file type and content (magic numbers)
                    const fileValidation = await validateFileType(file.path, file.originalname, file.size);
                    
                    // Calculate SHA-256 hash from saved file
                    const sha256 = await calculateSHA256(file.path);
                    
                    // Check for duplicates
                    const duplicateFile = await checkDuplicateFile(sha256, file.size);
                    if (duplicateFile) {
                        // File is duplicate - remove uploaded file and link to existing
                        await cleanupUploadedFile(file.path);
                        
                        if (validatedBody.entity_type && validatedBody.entity_id) {
                            await db.query(
                                'INSERT INTO file_links (file_id, entity_type, entity_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                                [duplicateFile.id, validatedBody.entity_type, validatedBody.entity_id]
                            );
                        }
                        
                        uploadedFiles.push({
                            id: duplicateFile.id,
                            original_name: file.originalname,
                            message: 'Arquivo já existe - vinculado ao existente',
                            duplicate: true
                        });
                        continue;
                    }
                    
                    // File is unique - get storage path and insert into database
                    const storagePath = getRelativeStoragePath(file.path);
                    
                    const insertResult = await db.query(`
                        INSERT INTO files (
                            id, original_name, ext, mime_type, size_bytes, sha256, 
                            storage_path, is_private, access_scope, uploader_user_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        RETURNING id, original_name, ext, mime_type, size_bytes, created_at
                    `, [
                        fileMetadata.fileId, file.originalname, fileValidation.extension, fileValidation.mimeType,
                        file.size, sha256, storagePath, true, validatedBody.access_scope, null
                    ]);
                    
                    const savedFile = insertResult.rows[0];
                    
                    // Link to entity if provided
                    if (validatedBody.entity_type && validatedBody.entity_id) {
                        await db.query(
                            'INSERT INTO file_links (file_id, entity_type, entity_id) VALUES ($1, $2, $3)',
                            [fileMetadata.fileId, validatedBody.entity_type, validatedBody.entity_id]
                        );
                    }
                    
                    uploadedFiles.push({
                        ...savedFile,
                        message: 'Arquivo enviado com sucesso',
                        duplicate: false
                    });
                    
                } catch (fileError) {
                    console.error(`Error processing file ${file.originalname}:`, fileError);
                    
                    // Clean up uploaded file on error
                    await cleanupUploadedFile(file.path);
                    
                    errors.push({
                        filename: file.originalname,
                        error: fileError.message
                    });
                }
            }
            
            await db.query('COMMIT');
        
        const response = {
            success: uploadedFiles.length > 0,
            message: `${uploadedFiles.length} arquivo(s) processado(s)`,
            files: uploadedFiles
        };
        
        if (errors.length > 0) {
            response.errors = errors;
        }
        
            res.status(uploadedFiles.length > 0 ? 201 : 400).json(response);
            
        } catch (transactionError) {
            await db.query('ROLLBACK');
            throw transactionError;
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor ao fazer upload',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Listagem de arquivos
app.get('/api/files', validateQuery(schemas.filesQuery), async (req, res) => {
    try {
        const { page, limit, q, type, ext, entity_type, entity_id } = req.validatedQuery;
        const offset = (page - 1) * limit;
        
        let baseQuery = `
            SELECT f.*, 
                   COUNT(*) OVER() as total_count,
                   CASE WHEN fl.file_id IS NOT NULL THEN true ELSE false END as has_links
            FROM files f
            LEFT JOIN file_links fl ON f.id = fl.file_id
            WHERE f.deleted_at IS NULL
        `;
        
        const queryParams = [];
        let paramIndex = 1;
        
        if (q) {
            baseQuery += ` AND f.original_name ILIKE $${paramIndex}`;
            queryParams.push(`%${q}%`);
            paramIndex++;
        }
        
        if (ext) {
            baseQuery += ` AND f.ext = $${paramIndex}`;
            queryParams.push(ext);
            paramIndex++;
        }
        
        if (entity_type && entity_id) {
            baseQuery += ` AND fl.entity_type = $${paramIndex} AND fl.entity_id = $${paramIndex + 1}`;
            queryParams.push(entity_type, entity_id);
            paramIndex += 2;
        } else if (entity_type) {
            baseQuery += ` AND fl.entity_type = $${paramIndex}`;
            queryParams.push(entity_type);
            paramIndex++;
        }
        
        baseQuery += ` ORDER BY f.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);
        
        const result = await db.query(baseQuery, queryParams);
        
        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
        const files = result.rows.map(row => {
            const { total_count, ...file } = row;
            return file;
        });
        
        res.json({
            files,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });
        
    } catch (error) {
        console.error('Files listing error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar arquivos'
        });
    }
});

// Download de arquivo
app.get('/api/files/:id/download', validateUUID, async (req, res) => {
    try {
        const { id } = req.params;
        
        const fileResult = await db.query(
            'SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        
        if (fileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Arquivo não encontrado'
            });
        }
        
        const fileData = fileResult.rows[0];
        const fullPath = path.join('wwwroot', fileData.storage_path);
        
        // Check if file exists on disk
        try {
            await fs.access(fullPath);
        } catch (error) {
            console.error(`File not found on disk: ${fullPath}`);
            return res.status(404).json({
                success: false,
                message: 'Arquivo não encontrado no disco'
            });
        }
        
        // Update download count
        await db.query(
            'UPDATE files SET download_count = download_count + 1, updated_at = NOW() WHERE id = $1',
            [id]
        );
        
        // Set proper headers
        res.setHeader('Content-Type', fileData.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${fileData.original_name}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-cache');
        res.setHeader('ETag', `"${fileData.sha256}"`);
        
        // Stream file
        const fileBuffer = await fs.readFile(fullPath);
        res.send(fileBuffer);
        
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor ao fazer download'
        });
    }
});

// Deletar arquivo (soft delete)
app.delete('/api/files/:id', validateUUID, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            'UPDATE files SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING original_name',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Arquivo não encontrado'
            });
        }
        
        // Remove all file links
        await db.query('DELETE FROM file_links WHERE file_id = $1', [id]);
        
        res.json({
            success: true,
            message: `Arquivo ${result.rows[0].original_name} excluído com sucesso`
        });
        
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir arquivo'
        });
    }
});

// Obter metadados de um arquivo
app.get('/api/files/:id', validateUUID, async (req, res) => {
    try {
        const { id } = req.params;
        
        const fileResult = await db.query(`
            SELECT f.*, 
                   array_agg(
                       json_build_object(
                           'entity_type', fl.entity_type,
                           'entity_id', fl.entity_id
                       )
                   ) FILTER (WHERE fl.file_id IS NOT NULL) as links
            FROM files f
            LEFT JOIN file_links fl ON f.id = fl.file_id
            WHERE f.id = $1 AND f.deleted_at IS NULL
            GROUP BY f.id
        `, [id]);
        
        if (fileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Arquivo não encontrado'
            });
        }
        
        res.json({
            success: true,
            file: fileResult.rows[0]
        });
        
    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar arquivo'
        });
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