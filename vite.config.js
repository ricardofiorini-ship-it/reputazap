import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // A entrada `main` (index.html -> src/main.jsx -> src/App.jsx) SAIU em
        // 21/09/2026 junto com o painel legado. Ela nao servia o `/` — o `/`
        // sempre foi um redirect pra /landing — servia so a rota /app-legacy,
        // que agora redireciona pro /app.
        v2:   resolve(__dirname, 'index-v2.html'),
        // Painel V3 (privado, em construção). Entrada separada de propósito:
        // bundle próprio, rota própria, zero risco pro /app que está no ar.
        v3:   resolve(__dirname, 'index-v3.html')
      }
    }
  }
})
