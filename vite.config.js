import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ⚠️ Sostituisci 'wc2026-pronostici' con il nome del tuo repository GitHub
  mondiali2026: '/wc2026-pronostici/',
})
