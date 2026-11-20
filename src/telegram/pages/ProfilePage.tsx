import { CircleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AddCardRow, SavedCardRow } from '../components'
import { cardEnabled, refreshCards, removeCard } from '../data'
import { phone } from '../domain'
import { currentDict, errorText, useT } from '../i18n'
import { useNav } from '../nav'
import { cardsStore, profileDraftStore, profileStore, useStore, type Profile } from '../store'
import { BottomBar, Field, Notice, PrimaryButton, SectionLabel, Spinner, TopBar } from '../ui'

/**
 * Profil (Android `ProfileScreen`): ism va telefon — rasmiylashtirishda maydonlarga o'zi qo'yiladi (faqat qurilmada,
 * serverga alohida yuborilmaydi); "Kartalarim" — shu qurilmaga bog'langan kartalar (qo'shish, o'chirish — tasdiqsiz).
 */
export default function ProfilePage() {
  const t = useT()
  const nav = useNav()
  const draft = useStore(profileDraftStore) ?? profileStore.get()
  const name = draft.name
  const phoneValue = draft.phone
  const edit = (change: Partial<Profile>) => profileDraftStore.set((d) => ({ ...(d ?? profileStore.get()), ...change }))
  const [showProblems, setShowProblems] = useState(false)
  const [cardsOn, setCardsOn] = useState(false)
  const [cardsLoading, setCardsLoading] = useState(true)
  const [cardError, setCardError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const cards = useStore(cardsStore)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const enabled = await cardEnabled()
      if (cancelled) return
      setCardsOn(enabled)
      if (enabled) {
        try {
          await refreshCards()
        } catch (e) {
          if (!cancelled) setCardError(errorText(currentDict(), e))
        }
      }
      if (!cancelled) setCardsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // telefon ixtiyoriy, lekin yozilgan bo'lsa — to'liq 9 raqam
  const phoneIncomplete = phoneValue.length > 0 && !phone.isComplete(phoneValue)

  const save = () => {
    if (phoneIncomplete) {
      setShowProblems(true)
      return
    }
    profileStore.set({ name: name.trim(), phone: phoneValue })
    profileDraftStore.set(null)
    nav.back()
  }

  const remove = async (id: string) => {
    if (deleting) return
    setDeleting(id)
    setCardError(null)
    try {
      await removeCard(id)
    } catch (e) {
      setCardError(errorText(t, e))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t.profile} subtitle={t.profileHint} onBack={nav.back} />
      <div className="flex flex-1 flex-col gap-5 p-4">
        <section className="flex flex-col gap-1.5">
          <Field value={name} onChange={(v) => edit({ name: v.slice(0, 100) })} placeholder={t.name} autoCapitalize="words" autoComplete="name" />
          <Field
            value={phoneValue}
            onChange={(v) => edit({ phone: phone.clean(v) })}
            display={phone.group}
            placeholder="90 123 45 67"
            prefix={`${phone.PREFIX} `}
            inputMode="tel"
            autoComplete="tel-national"
            error={showProblems && phoneIncomplete ? t.phoneIncomplete : null}
          />
        </section>

        {(cardsLoading || cardsOn) && (
          <section className="flex flex-col gap-2">
            <SectionLabel>{t.myCards}</SectionLabel>
            {cardsLoading ? (
              <div className="flex justify-center p-4">
                <Spinner size={24} />
              </div>
            ) : (
              <>
                <p className="px-1 text-[12px] text-(--nyt-text-muted)">{t.myCardsHint}</p>
                {(cards ?? []).map((card) => (
                  <SavedCardRow key={card.id} card={card} deleting={deleting === card.id} onDelete={() => void remove(card.id)} />
                ))}
                {cardError && <Notice tone="danger" icon={CircleAlert} title={cardError} />}
                <AddCardRow onClick={() => nav.go('card')} />
              </>
            )}
          </section>
        )}
      </div>
      <BottomBar>
        <PrimaryButton onClick={save}>{t.save}</PrimaryButton>
      </BottomBar>
    </div>
  )
}
