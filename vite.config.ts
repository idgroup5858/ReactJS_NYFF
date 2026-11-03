import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Xodimlar tizimi domenning qaysi yo'lida: `UI_BASE` (backend `.env` dagi bilan bir xil), standart `/shorva` — domen
 * ildizida emas (2026-11-03: mijoz `newyork24.uz` ni tersa kirish ekraniga tushmasin; ildizda — alohida sahifa).
 * "NYFF Offline" (kassa kompyuteri) o'z build'ini `--base /` bilan oladi — offline kassa `localhost:3100/offline` da.
 */
const UI_BASE = `/${(process.env.UI_BASE ?? '').trim().replace(/^\/+|\/+$/g, '') || 'shorva'}/`

// https://vite.dev/config/
export default defineConfig({
  base: UI_BASE,
  plugins: [react(), tailwindcss()],
  // 5173 band bo'lsa boshqa portga jim o'tib ketmasin (5174 — ReactJS_HR_System, 5175 — ReactJS_Language).
  // API, Socket.IO va taom / kategoriya rasmlari — backend (C:\BACKEND APPS\NestJS_NYFF, 3000; rasmlar uning `uploads`
  // papkasida); tayyor ilovani backend o'zi beradi. Ikonkalar (`/images/icons`) — shu ilovaning `public/` papkasidan.
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
      '/images/products': { target: 'http://localhost:3000', changeOrigin: true },
      '/images/categories': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
