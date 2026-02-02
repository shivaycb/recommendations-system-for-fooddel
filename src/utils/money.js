export function formatMoney(cents, currency = 'USD') {
  const value = Number.isFinite(cents) ? cents / 100 : 0
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
  }).format(value)
}