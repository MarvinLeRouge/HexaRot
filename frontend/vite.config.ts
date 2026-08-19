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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: [
        'src/main.ts',
        'src/App.vue',
        'src/router/**',
        'src/layouts/**',
        'src/__fixtures__/**',
      ],
      thresholds: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
  },
})
