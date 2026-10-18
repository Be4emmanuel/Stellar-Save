import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allow imports like: import { formatAmount } from '@shared-utils/formatting'
      '@shared-utils': resolve(__dirname, '../packages/shared-utils/src'),
    },
  },
})
