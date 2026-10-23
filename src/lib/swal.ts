import Swal from 'sweetalert2'
import { currentDict } from '@/i18n'

const closeIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'

/** SweetAlert2 ilova uslubida (ReactJS_Language dagi mixin); tugma yozuvlari joriy tilda. Ko'rinishi global.css da. */
function appSwal() {
  const t = currentDict()
  return Swal.mixin({
    showCloseButton: true,
    closeButtonHtml: closeIcon,
    closeButtonAriaLabel: t.common.close,
    reverseButtons: true,
    confirmButtonText: 'OK',
    cancelButtonText: t.common.cancel,
  })
}

/** Tasdiqlash oynasi: "Ha" bosilsa true. */
export async function confirmDialog(title: string, text: string, confirmText?: string): Promise<boolean> {
  const t = currentDict()
  const result = await appSwal().fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText ?? t.common.confirm,
  })
  return result.isConfirmed
}

/** Uch javobli savol: asosiy (sariq) tugma, ikkinchi tugma va bekor qilish (✕ / Esc ham). */
export async function choiceDialog(title: string, text: string, confirmText: string, denyText: string): Promise<'confirm' | 'deny' | 'cancel'> {
  const result = await appSwal().fire({
    icon: 'question',
    title,
    text,
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: confirmText,
    denyButtonText: denyText,
  })
  if (result.isConfirmed) return 'confirm'
  if (result.isDenied) return 'deny'
  return 'cancel'
}

/** Tepada o'rtadagi qisqa xabar (pastki o'ng burchakda kassaning "To'lash" tugmasi turadi — uni to'smasin). */
export function showToast(title: string, icon: 'success' | 'error' | 'info' = 'success'): void {
  void appSwal().fire({
    toast: true,
    position: 'top',
    icon,
    title,
    showCloseButton: false,
    showConfirmButton: false,
    timer: 1800,
  })
}
