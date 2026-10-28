import '@fontsource-variable/inter/index.css'
// GoMeal mavzusi: Poppins (lotin) + Montserrat (kirill — Poppins'da yo'q); fayllar faqat mavzu yoqilganda yuklanadi
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/poppins/800.css'
import '@fontsource-variable/montserrat/index.css'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { refreshSession } from './api/session'
import { router } from './app/router'
import { settingsStore } from './store/settingsStore'

// sahifa yangilanganda: saqlangan token hali amal qiladimi (eskirgan bo'lsa — kirish ekraniga)
void refreshSession()

// <html lang> joriy tilga mos — ekran o'quvchilar va brauzer tarjimoni uchun; <html data-theme> — ko'rinish tokenlari
const syncRoot = () => {
  const { lang, theme } = settingsStore.get()
  document.documentElement.setAttribute('lang', lang)
  document.documentElement.dataset.theme = theme
}
syncRoot()
settingsStore.subscribe(syncRoot)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
