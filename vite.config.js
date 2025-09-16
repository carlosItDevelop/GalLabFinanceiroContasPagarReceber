import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
    hmr: false // Desabilitar HMR que pode estar causando reconexões infinitas
  }
})
