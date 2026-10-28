import type { CourierStatus } from '@/domain/types'

/** Kuryer hozir nima qilyapti: bo'sh / buyurtma olgan / yo'lda / ishda emas / bloklangan. */
export type CourierActivity = 'free' | 'busy' | 'on_the_way' | 'off' | 'blocked'

/** "Ishdaman" o'chirilgan, lekin qo'lida buyurtma qolgan kuryer — buyurtmalariga qarab (band / yo'lda). */
export const courierActivity = (courier: CourierStatus): CourierActivity =>
  !courier.active
    ? 'blocked'
    : courier.departed
      ? 'on_the_way'
      : courier.orders > 0
        ? 'busy'
        : courier.onDuty
          ? 'free'
          : 'off'

/** Ishdagi ("Ishdaman" yoqilgan, bloklanmagan) kuryerlar. */
export const onDutyCouriers = (couriers: CourierStatus[]): CourierStatus[] => couriers.filter((c) => c.active && c.onDuty)
