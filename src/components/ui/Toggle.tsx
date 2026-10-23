type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** yorliq ko'rinmaydi (jadval ichida) — faqat ekran o'quvchi uchun */
  hideLabel?: boolean
}

/** Yoqish / o'chirish: yoqilgani sariq yo'lakda qora tugmacha. */
export default function Toggle({ checked, onChange, label, hideLabel = false }: Props) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${checked ? 'bg-taxi' : 'bg-neutral-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full shadow transition-all ${checked ? 'left-[22px] bg-coal' : 'left-0.5 bg-white'}`} />
      </button>
      {!hideLabel && <span className="text-sm font-semibold text-neutral-700">{label}</span>}
    </label>
  )
}
