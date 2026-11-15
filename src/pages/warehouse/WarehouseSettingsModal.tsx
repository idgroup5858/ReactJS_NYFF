import { Repeat } from 'lucide-react'
import { useBranches, useWarehouses } from '@/api/queries'
import type { WarehouseNavItem } from '@/components/layout/useBackOfficeNav'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { selectClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import type { ID } from '@/domain/types'
import { useT } from '@/i18n'
import { activeWarehouses, warehouseLabel } from '@/lib/warehouses'
import { setTransferDefaults, setWarehouseTabVisible, useSettings, WAREHOUSE_TABS } from '@/store/settingsStore'

const SECTION_TITLE = 'text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase'

type Props = {
  /** ta'minotchining tablari — berilmasa (admin: chap menyu) tablar bo'limi yo'q */
  tabs?: WarehouseNavItem[]
  onClose: () => void
}

/**
 * Ombor sozlamalari (shu qurilma uchun — localStorage): ta'minotchiga — tepadagi qatorda qaysi tablar ko'rinadi (kamida
 * bittasi qoladi); hammaga — ko'chirish formasi qaysi yo'nalish bilan ochiladi. O'zgarish darhol saqlanadi.
 */
export default function WarehouseSettingsModal({ tabs, onClose }: Props) {
  const t = useT()
  const { hiddenWarehouseTabs, transferDefaults } = useSettings()
  const allWarehouses = useWarehouses().data ?? []
  const branches = useBranches().data ?? []
  const warehouses = activeWarehouses(allWarehouses, branches)
  // o'chirilgan / nofaol filial ombori — "Avtomatik" bo'lib ko'rinadi (ko'chirish formasi ham uni e'tiborga olmaydi)
  const valid = (id: ID | null) => (id && warehouses.some((w) => w.id === id) ? id : '')
  const from = valid(transferDefaults.from)
  const to = valid(transferDefaults.to)
  const save = (nextFrom: string, nextTo: string) => setTransferDefaults({ from: nextFrom || null, to: nextTo || null })
  const lastVisible = WAREHOUSE_TABS.length - hiddenWarehouseTabs.length <= 1

  const warehouseSelect = (id: string, value: string, onChange: (value: string) => void) => (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
      <option value="">{t.warehouseSettings.auto}</option>
      {warehouses.map((w) => (
        <option key={w.id} value={w.id}>
          {warehouseLabel(allWarehouses, branches, w.id, t)}
        </option>
      ))}
    </select>
  )

  const transferSection = (
    <section className="space-y-2">
      <h3 className={SECTION_TITLE}>{t.warehouseSettings.transfer}</h3>
      <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Field label={t.transfer.from} htmlFor="default-transfer-from">
          {warehouseSelect('default-transfer-from', from, (value) => save(value, to))}
        </Field>
        <button
          type="button"
          onClick={() => save(to, from)}
          aria-label={t.transfer.swap}
          title={t.transfer.swap}
          className="btn-icon flex h-10 w-10 items-center justify-center justify-self-center rounded"
        >
          <Repeat size={16} />
        </button>
        <Field label={t.transfer.to} htmlFor="default-transfer-to">
          {warehouseSelect('default-transfer-to', to, (value) => save(from, value))}
        </Field>
      </div>
      {from && from === to && <p className="text-sm font-semibold text-red-700">{t.errors.same_warehouse}</p>}
      <p className="text-xs text-neutral-400">{t.warehouseSettings.transferHint}</p>
    </section>
  )

  if (!tabs) {
    return (
      <Modal title={t.warehouseSettings.title} onClose={onClose} size="md">
        {transferSection}
      </Modal>
    )
  }

  // planshet: oyna eniga — chapda tablar, o'ngda ko'chirish
  return (
    <Modal title={t.warehouseSettings.title} onClose={onClose} size="lg">
      <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="space-y-2">
          <h3 className={SECTION_TITLE}>{t.warehouseSettings.tabs}</h3>
          <div className="flex flex-col gap-3 py-1">
            {tabs.map(({ tab, label }) => {
              const visible = !hiddenWarehouseTabs.includes(tab)
              return (
                <Toggle
                  key={tab}
                  checked={visible}
                  onChange={(value) => setWarehouseTabVisible(tab, value)}
                  label={label}
                  disabled={visible && lastVisible}
                />
              )
            })}
          </div>
          <p className="text-xs text-neutral-400">{t.warehouseSettings.tabsHint}</p>
        </section>
        <div className="border-t border-neutral-200 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">{transferSection}</div>
      </div>
    </Modal>
  )
}
