import Brand from './Brand'

/** Bo'lim fayli yuklanayotganda (sahifa to'g'ridan-to'g'ri ichki manzildan ochilganda). */
export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-coal">
      <div className="animate-pulse">
        <Brand size="lg" />
      </div>
    </div>
  )
}
