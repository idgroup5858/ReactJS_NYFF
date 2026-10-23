import { useEffect } from 'react'

const APP_NAME = 'New York Fast Food'

/** Brauzer tabidagi sarlavha: "Kassa · New York Fast Food". */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
