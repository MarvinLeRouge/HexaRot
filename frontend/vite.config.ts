import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000',
    },
    allowedHosts: ['hexarot.marvinlerouge.local'],
  },
  test: {
    environment: 'jsdom',
    globals: false,
  },
})
