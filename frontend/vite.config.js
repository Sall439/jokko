import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite + Vitest de JokkoDentiste.
// En développement sans mode mock, les appels vers /api sont redirigés
// vers l'API locale (VITE_API_PROXY, par défaut http://localhost:8000).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const cibleApi = env.VITE_API_PROXY || 'http://localhost:8000'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: cibleApi,
          changeOrigin: true,
          rewrite: (chemin) => chemin.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      host: true,
      port: 3000,
      allowedHosts: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/tests/setup.js',
      css: false,
    },
  }
})
