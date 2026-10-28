import type { LucideIcon } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { errorMessage } from '@/i18n'

type Props = {
  icon: LucideIcon
  /** ma'lumot keldi, lekin ro'yxat bo'sh */
  empty: string
  query: { data: unknown; error: unknown }
}

/**
 * Ro'yxat o'rnidagi kartochka: yuklanmoqda (xira), server xatosi yoki haqiqatan bo'sh — uchalasi bir xil o'lchamda,
 * ma'lumot kelganda sahifa sakramaydi.
 */
export default function ListPlaceholder({ icon, empty, query }: Props) {
  if (query.data === undefined && !query.error) {
    return (
      <div className="animate-pulse">
        <EmptyState icon={icon} title="…" />
      </div>
    )
  }
  return <EmptyState icon={icon} title={query.data === undefined ? errorMessage(query.error) : empty} />
}
