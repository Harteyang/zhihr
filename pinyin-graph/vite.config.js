import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/pinyin-graph/',
  build: {
    outDir: 'dist',
  },
})