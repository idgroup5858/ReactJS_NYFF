import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

/** Kartochka: oq yumaloq yuza, chegarasiz, yengil soya. */
export function Card({ children, className = '' }: CardProps) {
  return <section className={`surface rounded-card border border-line shadow-card ${className}`}>{children}</section>
}

type TitleProps = {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

/** Bo'lim sarlavhasi: sariq nuqta + katta qalin nom. */
export function SectionTitle({ children, as: Tag = 'h2', className = '' }: TitleProps) {
  return (
    <Tag className={`title-section flex items-center gap-2 text-neutral-950 ${className}`}>
      <span className="title-mark" />
      {children}
    </Tag>
  )
}

type CardHeaderProps = {
  title: ReactNode
  hint?: ReactNode
  actions?: ReactNode
}

/** Kartochka sarlavhasi: nom, ostida izoh, o'ngda qo'shimcha element. */
export function CardHeader({ title, hint, actions }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <SectionTitle>{title}</SectionTitle>
        {hint && <p className="mt-0.5 pl-3 text-xs text-neutral-500 gomeal:pl-0 gomeal:text-neutral-400">{hint}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}
