
// setup-database.js - Script para configurar o banco PostgreSQL
const db = require('./database.js');

async function setupDatabase() {
    console.log('🚀 Iniciando configuração do banco de dados...');
    
    try {
        // Criar tabelas
        console.log('📝 Criando tabelas...');
        await db.createTables();
        
        // Inserir dados iniciais
        console.log('📊 Inserindo dados iniciais...');
        await insertInitialData();
        
        console.log('✅ Banco de dados configurado com sucesso!');
        console.log('🎉 Sistema pronto para uso!');
        
    } catch (error) {
        console.error('❌ Erro ao configurar banco de dados:', error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

async function insertInitialData() {
    // Inserir categorias padrão
    const categorias = [
        { nome: 'Escritório', tipo: 'pagar', cor: '#fd7e14', descricao: 'Material de escritório' },
        { nome: 'Utilidades', tipo: 'pagar', cor: '#6f42c1', descricao: 'Energia, água, internet' },
        { nome: 'Fornecedores', tipo: 'pagar', cor: '#dc3545', descricao: 'Pagamentos a fornecedores' },
        { nome: 'Serviços', tipo: 'receber', cor: '#198754', descricao: 'Prestação de serviços' },
        { nome: 'Vendas', tipo: 'receber', cor: '#0d6efd', descricao: 'Vendas de produtos' },
        { nome: 'Consultoria', tipo: 'receber', cor: '#20c997', descricao: 'Serviços de consultoria' }
    ];
    
    for (const categoria of categorias) {
        try {
            await db.createCategoria(categoria);
            console.log(`   ✓ Categoria criada: ${categoria.nome}`);
        } catch (error) {
            if (!error.message.includes('duplicate key')) {
                console.log(`   ⚠ Erro ao criar categoria ${categoria.nome}:`, error.message);
            }
        }
    }
    
    // Inserir fornecedores de exemplo
    const fornecedores = [
        { 
            nome: 'ABC Materiais Ltda', 
            cnpj_cpf: '12.345.678/0001-90', 
            email: 'contato@abcmateriais.com.br',
            telefone: '(11) 99999-9999',
            endereco: 'Rua das Flores, 123 - São Paulo/SP',
            observacoes: 'Fornecedor de materiais de escritório'
        },
        { 
            nome: 'Companhia Elétrica SP', 
            cnpj_cpf: '98.765.432/0001-10', 
            email: 'atendimento@energia.com.br',
            telefone: '0800-123-4567',
            endereco: 'Av. Energia, 1000 - São Paulo/SP',
            observacoes: 'Fornecimento de energia elétrica'
        }
    ];
    
    for (const fornecedor of fornecedores) {
        try {
            await db.createFornecedor(fornecedor);
            console.log(`   ✓ Fornecedor criado: ${fornecedor.nome}`);
        } catch (error) {
            if (!error.message.includes('duplicate key')) {
                console.log(`   ⚠ Erro ao criar fornecedor ${fornecedor.nome}:`, error.message);
            }
        }
    }
    
    // Inserir clientes de exemplo
    const clientes = [
        { 
            nome: 'XYZ Consultoria Ltda', 
            cnpj_cpf: '11.222.333/0001-44', 
            email: 'contato@xyzconsultoria.com.br',
            telefone: '(11) 88888-8888',
            endereco: 'Rua do Comércio, 456 - São Paulo/SP',
            observacoes: 'Cliente de serviços de consultoria'
        },
        { 
            nome: 'Comércio ABC Ltda', 
            cnpj_cpf: '22.333.444/0001-55', 
            email: 'vendas@comercioabc.com.br',
            telefone: '(11) 77777-7777',
            endereco: 'Av. do Comércio, 789 - São Paulo/SP',
            observacoes: 'Cliente de vendas de produtos'
        }
    ];
    
    for (const cliente of clientes) {
        try {
            await db.createCliente(cliente);
            console.log(`   ✓ Cliente criado: ${cliente.nome}`);
        } catch (error) {
            if (!error.message.includes('duplicate key')) {
                console.log(`   ⚠ Erro ao criar cliente ${cliente.nome}:`, error.message);
            }
        }
    }
    
    console.log('📊 Dados iniciais inseridos com sucesso!');
}

// Executar se chamado diretamente
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };
