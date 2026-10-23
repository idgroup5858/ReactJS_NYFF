import SegmentedControl, { type SegmentOption } from '@/components/ui/SegmentedControl'
import { LANGS, type Lang } from '@/domain/types'
import { LANG_LABELS, useT } from '@/i18n'
import { setLang, useSettings } from '@/store/settingsStore'

const OPTIONS: SegmentOption<Lang>[] = LANGS.map((lang) => ({ value: lang, label: lang.toUpperCase(), title: LANG_LABELS[lang] }))

/** UZ / RU / EN — tanlov shu qurilmada saqlanadi. */
export default function LanguageSwitcher({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  const { lang } = useSettings()
  const t = useT()
  return <SegmentedControl label={t.common.language} options={OPTIONS} value={lang} onChange={setLang} tone={tone} />
}
