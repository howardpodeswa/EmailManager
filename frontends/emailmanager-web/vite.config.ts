import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = process.env['EMAILMANAGER_CORE_PROXY_TARGET'] ?? 'http://127.0.0.1:3601'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Use workspace packages' TypeScript source directly (see docs/BUILDS_AND_DEPS.md)
    conditions: ['development', 'browser', 'import', 'module', 'default'],
  },
  server: {
    port: 5180,
    strictPort: true,
    // Same-origin API calls: the browser talks to /api on the web port, Vite forwards to the
    // backend, so the session cookie never has to cross origins.
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: { port: 5180, strictPort: true },
})
