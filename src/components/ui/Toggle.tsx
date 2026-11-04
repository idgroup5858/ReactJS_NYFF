type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** yorliq ko'rinmaydi (jadval ichida) — faqat ekran o'quvchi uchun */
  hideLabel?: boolean
}

/** Yoqish / o'chirish: yoqilgani sariq yo'lakda qora tugmacha. Ixcham (32 × 18 px) — POS monitori past. */
export default function Toggle({ checked, onChange, label, hideLabel = false }: Props) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full transition-colors ${checked ? 'bg-taxi' : 'bg-neutral-300'}`}
      >
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full shadow transition-all ${checked ? 'left-4 bg-coal' : 'left-0.5 bg-white'}`} />
      </button>
      {!hideLabel && <span className="text-[13px] font-semibold text-neutral-700">{label}</span>}
    </label>
  )
}
