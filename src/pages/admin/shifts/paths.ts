import type { ID } from '@/domain/types'

/** Smenalar bo'limi manzillari: ro'yxat → smena → smenadagi buyurtma (ichma-ich sahifalar). */
export const SHIFTS_PATH = '/admin/smenalar'
export const shiftPath = (shiftId: ID) => `${SHIFTS_PATH}/${shiftId}`
export const shiftOrderPath = (shiftId: ID, orderId: ID) => `${shiftPath(shiftId)}/${orderId}`
