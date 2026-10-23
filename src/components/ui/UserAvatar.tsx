/** Xodim bosh harfi qora doirada sariq rangda. */
export default function UserAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-base'
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-coal font-bold text-taxi ${box}`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}
