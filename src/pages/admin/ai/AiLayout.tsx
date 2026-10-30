import { Bot, MessageSquare } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { useT } from '@/i18n'

type Tab = 'chat' | 'telegram'

/** AI yordamchi: ikki tab — chat (`/admin/ai`, tepadagi "AI" tugmasi) va Telegram bot sozlamasi (`/admin/ai/telegram`). */
export default function AiLayout() {
  const t = useT()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tab: Tab = pathname.replace(/\/$/, '').endsWith('/telegram') ? 'telegram' : 'chat'

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.ai.title}
        description={t.ai.hint}
        actions={
          <SegmentedControl<Tab>
            label={t.ai.title}
            value={tab}
            onChange={(value) => void navigate(value === 'chat' ? '/admin/ai' : '/admin/ai/telegram')}
            options={[
              { value: 'chat', label: <><MessageSquare size={14} />{t.ai.tabs.chat}</> },
              { value: 'telegram', label: <><Bot size={14} />{t.ai.tabs.telegram}</> },
            ]}
          />
        }
      />
      <Outlet />
    </div>
  )
}
