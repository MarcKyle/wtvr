import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Forward API calls to the Express backend during development.
      // Cookies (credentials: 'include' in src/lib/api.ts) are preserved by
      // the proxy and stay first-party from the browser's perspective.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
