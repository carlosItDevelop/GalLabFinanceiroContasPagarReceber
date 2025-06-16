
# Sistema de Contas a Pagar e Receber

## Plano de Ação

### 1. Estrutura da Aplicação
- **Interface:** Sistema baseado em abas/tabs (não menu lateral) para integração com aplicação existente
- **Banco de Dados:** PostgreSQL (Neon) integrado ao Replit
- **Frontend:** HTML5, CSS3, JavaScript vanilla com Vite

### 2. Abas/Tabs Planejadas
- **Dashboard:** Visão geral, indicadores principais, gráficos resumo
- **Contas a Pagar:** Cadastro, listagem, pagamentos de fornecedores
- **Contas a Receber:** Cadastro, listagem, recebimentos de clientes
- **Consolidados:** Relatórios consolidados, fluxo de caixa
- **Relatórios:** Relatórios detalhados por período, categoria
- **Logs:** Histórico de operações, auditoria

### 3. Modelos/Tabelas Iniciais

#### 3.1 Tabela: fornecedores
```sql
CREATE TABLE fornecedores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.2 Tabela: clientes
```sql
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.3 Tabela: categorias
```sql
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('pagar', 'receber')),
    cor VARCHAR(7), -- código hex da cor
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.4 Tabela: contas_pagar
```sql
CREATE TABLE contas_pagar (
    id SERIAL PRIMARY KEY,
    fornecedor_id INTEGER REFERENCES fornecedores(id),
    categoria_id INTEGER REFERENCES categorias(id),
    descricao VARCHAR(255) NOT NULL,
    valor_original DECIMAL(10,2) NOT NULL,
    valor_pago DECIMAL(10,2) DEFAULT 0,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.5 Tabela: contas_receber
```sql
CREATE TABLE contas_receber (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id),
    categoria_id INTEGER REFERENCES categorias(id),
    descricao VARCHAR(255) NOT NULL,
    valor_original DECIMAL(10,2) NOT NULL,
    valor_recebido DECIMAL(10,2) DEFAULT 0,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'atrasado', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.6 Tabela: logs_sistema
```sql
CREATE TABLE logs_sistema (
    id SERIAL PRIMARY KEY,
    tabela VARCHAR(50) NOT NULL,
    registro_id INTEGER,
    acao VARCHAR(20) NOT NULL, -- insert, update, delete
    dados_anteriores JSONB,
    dados_novos JSONB,
    usuario VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Funcionalidades Principais

#### 4.1 Dashboard
- Total a pagar (mês atual)
- Total a receber (mês atual)
- Contas vencidas
- Fluxo de caixa projetado
- Gráficos de evolução

#### 4.2 Contas a Pagar
- Listagem com filtros (status, período, fornecedor)
- Cadastro de novos títulos
- Registro de pagamentos
- Alertas de vencimento

#### 4.3 Contas a Receber
- Listagem com filtros (status, período, cliente)
- Cadastro de novos títulos
- Registro de recebimentos
- Alertas de vencimento

### 5. Tecnologias
- **Frontend:** HTML5, CSS3, JavaScript ES6+
- **Build Tool:** Vite
- **Banco:** PostgreSQL (Neon)
- **Conexão DB:** pg (node-postgres)

### 6. Próximos Passos
1. ✅ Criar plano de ação (README.md)
2. 🔄 Configurar banco PostgreSQL no Replit
3. 🔄 Criar database.js para conexões
4. 🔄 Implementar estrutura de tabs
5. 🔄 Criar tabelas no banco
6. 🔄 Desenvolver funcionalidades básicas
7. 🔄 Implementar dashboard
8. 🔄 Testes e refinamentos

### 7. Estrutura de Arquivos Planejada
```
/
├── index.html          # Página principal com tabs
├── script.js          # JavaScript principal
├── style.css          # Estilos globais
├── database.js        # Conexões e queries do banco
├── /components/       # Componentes JavaScript
│   ├── dashboard.js
│   ├── contasPagar.js
│   ├── contasReceber.js
│   ├── consolidados.js
│   ├── relatorios.js
│   └── logs.js
└── /assets/          # Recursos estáticos
    ├── css/
    └── js/
```

---

**Status Atual:** Planejamento concluído - Aguardando criação do banco de dados PostgreSQL
