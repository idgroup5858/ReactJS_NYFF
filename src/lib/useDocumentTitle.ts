import { useEffect } from 'react'

const APP_NAME = 'New York Fast Food'

/**
 * Brauzer tabidagi sarlavha: "Kassa · New York Fast Food". [alert] berilsa — sarlavha har soniyada u bilan almashib
 * miltillaydi (kassir boshqa tab / oynada bo'lsa ham ko'rsin).
 */
export function useDocumentTitle(title?: string, alert?: string | null): void {
  useEffect(() => {
    const normal = title ? `${title} · ${APP_NAME}` : APP_NAME
    document.title = alert ?? normal
    if (!alert) return
    let showAlert = true
    const timer = window.setInterval(() => {
      showAlert = !showAlert
      document.title = showAlert ? alert : normal
    }, 1000)
    return () => {
      window.clearInterval(timer)
      document.title = normal
    }
  }, [title, alert])
}
