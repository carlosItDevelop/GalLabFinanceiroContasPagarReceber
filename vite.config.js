import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true, // Roda na 5174 (livre), proxy encaminha da 5000
    hmr: {
      port: 5174,
      clientPort: 5000 // Cliente conecta via proxy na 5000
    }
  }
})
