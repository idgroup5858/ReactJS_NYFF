/** Noyob id: `ord_3f2a9c1b…`. Prefiks loglarda va localStorage da qaysi jadvalga tegishliligini ko'rsatadi. */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`
}
