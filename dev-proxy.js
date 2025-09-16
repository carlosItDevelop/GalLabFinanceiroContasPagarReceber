const http = require('http');
const httpProxy = require('http-proxy');
const { spawn } = require('child_process');

console.log('🚀 Iniciando proxy desenvolvimento...');

// Criar proxy server
const proxy = httpProxy.createProxyServer({});

// Handler para errors do proxy
proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
    }
});

// Criar server HTTP na porta 5000
const server = http.createServer((req, res) => {
    // Proxy HTTP requests para Vite na 5174
    proxy.web(req, res, { 
        target: 'http://127.0.0.1:5175',
        changeOrigin: true 
    });
});

// Handler para WebSocket (HMR)
server.on('upgrade', (req, socket, head) => {
    // Proxy WebSocket connections para Vite
    proxy.ws(req, socket, head, { 
        target: 'ws://127.0.0.1:5175' 
    });
});

// Iniciar Vite como processo filho na porta 5174
console.log('🔧 Iniciando Vite na porta 5175...');
const viteProcess = spawn('npx', ['vite', '--port', '5175', '--host', '0.0.0.0'], {
    stdio: 'inherit',
    env: { ...process.env }
});

// Handler para sinal de término
process.on('SIGTERM', () => {
    console.log('📛 Finalizando proxy e Vite...');
    viteProcess.kill('SIGTERM');
    server.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📛 Finalizando proxy e Vite...');
    viteProcess.kill('SIGINT');
    server.close();
    process.exit(0);
});

// Iniciar server proxy na porta 5000
server.listen(5000, '0.0.0.0', () => {
    console.log('✅ Proxy ativo na porta 5000 -> Vite 5175');
    console.log('📡 Sistema disponível em http://localhost:5000');
});