import type { Payment, PaymentStatus } from '../types'

export const PAYMENT_METHODS = ['transferencia', 'efectivo', 'bizum'] as const

export interface PaymentSummary {
  paid: number
  pending: number
  pct: number            // 0-100, capped
  status: PaymentStatus  // sin_pagos | parcial | completo
}

// Payment status is derived: sum(payments) vs agreed_price.
export function summarizePayments(agreedPrice: number, payments?: Pick<Payment, 'amount'>[] | null): PaymentSummary {
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const price = Number(agreedPrice) || 0
  const pending = Math.max(0, price - paid)
  const pct = price > 0 ? Math.min(100, Math.round((paid / price) * 100)) : (paid > 0 ? 100 : 0)
  const status: PaymentStatus =
    paid <= 0 ? 'sin_pagos' : (price > 0 && paid >= price) ? 'completo' : 'parcial'
  return { paid, pending, pct, status }
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  sin_pagos: 'Sin pagos',
  parcial:   'Pago parcial',
  completo:  'Pago completo',
}

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, { bg: string; color: string }> = {
  sin_pagos: { bg: '#FCEAEA', color: '#8C1F1F' },
  parcial:   { bg: '#FDF3DC', color: '#9C6A00' },
  completo:  { bg: '#EAF3EC', color: '#2E6B3E' },
}
