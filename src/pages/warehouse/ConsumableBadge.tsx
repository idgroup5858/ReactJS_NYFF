import { useT } from '@/i18n'

/** Sarf materiali belgisi (mahsulotlar va qoldiqlar ro'yxatida nom yonida) — izohi sichqoncha ostida. */
export default function ConsumableBadge() {
  const t = useT()
  return (
    <span
      title={t.ingredients.consumableHint}
      className="ml-2 inline-block cursor-help rounded-chip bg-sky-50 px-1.5 py-0.5 align-middle text-[10px] font-bold tracking-wide text-sky-700 uppercase"
    >
      {t.ingredients.consumableBadge}
    </span>
  )
}
