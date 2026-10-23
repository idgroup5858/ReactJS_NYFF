import type { ReactNode } from 'react'
import { labelClass } from './styles'

type Props = {
  label: string
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}

/** Forma maydoni: yorliq, maydonning o'zi va ostida kichik izoh. */
export default function Field({ label, htmlFor, hint, children, className = '' }: Props) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}
