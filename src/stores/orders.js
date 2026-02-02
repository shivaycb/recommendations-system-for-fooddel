import { defineStore } from 'pinia'
import { readJson, writeJson } from '@/utils/storage'
import { useCatalogStore } from '@/stores/catalog'

const ORDERS_KEY = 'fd_orders_v1'

function uid(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }

  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    orders: Array.isArray(readJson(ORDERS_KEY, [])) ? readJson(ORDERS_KEY, []) : [],
  }),
  getters: {
    orderById: (state) => (id) => state.orders.find((o) => o.id === id),
    ordersForUser: (state) => (userId) =>
      state.orders
        .filter((o) => o.userId === userId)
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt),
  },
  actions: {
    _persist() {
      writeJson(ORDERS_KEY, this.orders)
    },
    placeOrder({
      userId,
      customerEmail,
      customerName,
      restaurantId,
      items,
      address,
      paymentMethod,
    }) {
      const catalog = useCatalogStore()
      const restaurant = catalog.restaurantById(restaurantId)

      const snapshotItems = (items || [])
        .map((it) => {
          const food = catalog.foodById(it.foodId)
          const unitPriceCents = catalog.menuPriceCents(restaurantId, it.foodId) ?? 0

          return {
            foodId: it.foodId,
            qty: it.qty,
            unitPriceCents,
            name: food?.name || it.foodId,
            imageUrl: food?.imageUrl || '',
          }
        })
        .filter((x) => x.qty > 0)

      const subtotalCents = snapshotItems.reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0)
      const deliveryFeeCents = restaurant?.deliveryFeeCents ?? 0
      const taxCents = Math.round(subtotalCents * 0.075)
      const totalCents = subtotalCents + deliveryFeeCents + taxCents

      const order = {
        id: uid('ord'),
        createdAt: Date.now(),
        status: 'placed',
        currency: catalog.currency,
        userId,
        customerEmail,
        customerName,
        restaurantId,
        restaurantName: restaurant?.name || '',
        etaMin: restaurant?.etaMin ?? null,
        address,
        paymentMethod,
        items: snapshotItems,
        totals: { subtotalCents, deliveryFeeCents, taxCents, totalCents }
      }

      this.orders.push(order)
      this._persist()

      return order
    }
  },
})
