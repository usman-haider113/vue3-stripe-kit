import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

// Configuration for main bundle with UMD support
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
      entry: resolve(fileURLToPath(new URL('./src/index.ts', import.meta.url))),
      name: 'Vue3StripeKit',
      formats: ['es', 'umd'],
      fileName: (format: string) => `vue3-stripe-kit.${format}.js`
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