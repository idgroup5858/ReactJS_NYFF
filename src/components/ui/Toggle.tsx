type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** yorliq ko'rinmaydi (jadval ichida) — faqat ekran o'quvchi uchun */
  hideLabel?: boolean
  /** o'zgartirib bo'lmaydi (masalan oxirgi ko'rinib turgan tab) — xira */
  disabled?: boolean
}

/** Yoqish / o'chirish: yoqilgani sariq yo'lakda qora tugmacha. Ixcham (32 × 18 px) — POS monitori past. */
export default function Toggle({ checked, onChange, label, hideLabel = false, disabled = false }: Props) {
  return (
    <label className={`inline-flex items-center gap-2 select-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${checked ? 'bg-taxi' : 'bg-neutral-300'}`}
      >
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full shadow transition-all ${checked ? 'left-4 bg-coal' : 'left-0.5 bg-white'}`} />
      </button>
      {!hideLabel && <span className="text-[13px] font-semibold text-neutral-700">{label}</span>}
    </label>
  )
}
