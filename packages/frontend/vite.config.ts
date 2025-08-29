import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@focus-academy/shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    https: process.env.HTTPS === 'true' ? {
      key: fs.readFileSync(resolve(__dirname, '../../certs/localhost-key.pem')),
      cert: fs.readFileSync(resolve(__dirname, '../../certs/localhost.pem')),
    } : false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})