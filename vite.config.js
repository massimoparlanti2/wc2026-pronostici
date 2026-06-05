import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // './' funziona con qualsiasi nome di repository GitHub
  base: './',
})
