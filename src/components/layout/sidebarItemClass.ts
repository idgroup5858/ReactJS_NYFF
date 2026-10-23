/** Chap menyu bandi (havola ham, oddiy tugma ham): ikonka · nom · belgi; tanlangani — sariq. Uzun nom ikki qatorga o'tadi. */
export function sidebarItemClass(active: boolean, collapsed: boolean): string {
  return `relative flex min-h-11 w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left text-sm leading-tight font-semibold transition-colors ${collapsed ? 'justify-center' : ''} ${active ? 'bg-taxi text-coal gomeal:shadow-[0_12px_24px_-12px_rgba(249,180,6,0.9)]' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`
}
