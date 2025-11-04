import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      rollupTypes: true
    })
  ],
  build: {
    lib: {
      entry: {
        'vue3-stripe-kit': resolve(fileURLToPath(new URL('./src/index.ts', import.meta.url))),
        'checkout': resolve(fileURLToPath(new URL('./src/checkout.ts', import.meta.url))),
        'elements': resolve(fileURLToPath(new URL('./src/elements.ts', import.meta.url))),
        'subscriptions': resolve(fileURLToPath(new URL('./src/subscriptions.ts', import.meta.url))),
        'subscriptions-lite': resolve(fileURLToPath(new URL('./src/subscriptions-lite.ts', import.meta.url))),
        'webhooks': resolve(fileURLToPath(new URL('./src/webhooks.ts', import.meta.url))),
        'composables': resolve(fileURLToPath(new URL('./src/composables.ts', import.meta.url))),
        'components': resolve(fileURLToPath(new URL('./src/components.ts', import.meta.url))),
        'types': resolve(fileURLToPath(new URL('./src/types.ts', import.meta.url)))
      },
      name: 'Vue3StripeKit',
      formats: ['es'], // ES modules only for optimal tree shaking
      fileName: (format: string, entryName: string) => `${entryName}.es.js`
    },
    rollupOptions: {
      external: ['vue', '@stripe/stripe-js'],
      output: {
        globals: {
          vue: 'Vue',
          '@stripe/stripe-js': 'Stripe'
        },
        exports: 'named'
      }
    },
    sourcemap: true,
    minify: 'terser',
    target: 'esnext'
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})