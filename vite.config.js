import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        v2:   resolve(__dirname, 'index-v2.html'),
        // Painel V3 (privado, em construção). Entrada separada de propósito:
        // bundle próprio, rota própria, zero risco pro /app que está no ar.
        v3:   resolve(__dirname, 'index-v3.html')
      }
    }
  }
})
