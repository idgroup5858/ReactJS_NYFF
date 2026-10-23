import type { ReactNode } from 'react'
import { SectionTitle } from './Card'

type Props = {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

/** Sahifa sarlavhasi: sariq belgi + nom, ostida izoh, o'ngda amallar. */
export default function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <SectionTitle as="h1">{title}</SectionTitle>
        {description && <p className="mt-1 pl-3 text-sm text-neutral-500 gomeal:pl-0 gomeal:text-neutral-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
