import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import markdown from 'unplugin-vue-markdown/vite'
import markdownItAttrs from 'markdown-it-attrs'

export default defineConfig({
  plugins: [
    vue({ include: [/\.vue$/, /\.md$/] }),
    // Help pages: Markdown compiled to Vue components at build time, with
    // explicit `{#anchor}` ids so section links are identical in every locale
    markdown({
      // Plain punctuation, like the rest of the UI strings
      markdownOptions: { typographer: false },
      markdownSetup: (md) => { md.use(markdownItAttrs) },
    }),
  ],
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
