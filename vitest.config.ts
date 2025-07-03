import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000, // 60 seconds for API calls and authentication
    hookTimeout: 30000, // 30 seconds for setup/teardown
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '~/': resolve(__dirname, './'),
    },
  },
})
