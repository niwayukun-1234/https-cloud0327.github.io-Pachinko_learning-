import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    // Allow access via the sandbox preview proxy (dynamic *.sandbox.novita.ai host)
    allowedHosts: true,
  },
})
