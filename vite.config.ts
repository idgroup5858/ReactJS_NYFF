import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 5173 band bo'lsa boshqa portga jim o'tib ketmasin (5174 — ReactJS_HR_System, 5175 — ReactJS_Language).
  // API va Socket.IO — backend (C:\BACKEND APPS\NestJS_NYFF, 3000); tayyor ilovani backend o'zi beradi.
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
