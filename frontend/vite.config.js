import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Dev only: forward API calls to the NestJS backend on :3000.
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
