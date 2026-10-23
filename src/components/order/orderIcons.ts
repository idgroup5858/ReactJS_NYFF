import { Banknote, Bike, CreditCard, ShoppingBag, Smartphone, Utensils, type LucideIcon } from 'lucide-react'
import type { OrderType, PaymentMethod } from '@/domain/types'

export const ORDER_TYPE_ICONS: Record<OrderType, LucideIcon> = {
  dine_in: Utensils,
  takeaway: ShoppingBag,
  delivery: Bike,
}

export const PAYMENT_ICONS: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  card: CreditCard,
  click: Smartphone,
}
