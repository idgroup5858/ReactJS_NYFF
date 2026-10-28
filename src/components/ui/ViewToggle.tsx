import { LayoutGrid, List } from 'lucide-react'
import { useT } from '@/i18n'
import type { ListView } from '@/store/settingsStore'
import SegmentedControl from './SegmentedControl'

/** Ko'rinish almashtirgich: kartochkalar to'ri ↔ ixcham ro'yxat (faqat ikonkalar, nomi — tooltipda). */
export default function ViewToggle({ value, onChange }: { value: ListView; onChange: (value: ListView) => void }) {
  const t = useT()
  return (
    <SegmentedControl<ListView>
      label={t.common.view}
      value={value}
      onChange={onChange}
      options={[
        { value: 'grid', label: <LayoutGrid size={15} />, title: t.common.gridView },
        { value: 'list', label: <List size={15} />, title: t.common.listView },
      ]}
    />
  )
}
