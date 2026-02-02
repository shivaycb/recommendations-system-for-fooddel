import { defineStore } from 'pinia'
import { readJson, writeJson } from '@/utils/storage'
import { useCatalogStore } from '@/stores/catalog'

const CART_KEY_PREFIX = 'fd_cart_v2_'

function getCartKey(userId) {
  return userId ? `${CART_KEY_PREFIX}${userId}` : null
}

function sanitizeQty(value) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function loadCartItems(userId) {
  if (!userId) return []
  const key = getCartKey(userId)
  const saved = readJson(key, null)
  if (saved && Array.isArray(saved.items)) {
    return saved.items
      .map((it) => ({ restaurantId: it.restaurantId, foodId: it.foodId, qty: sanitizeQty(it.qty) }))
      .filter((it) => it.restaurantId && it.foodId && it.qty > 0)
  }
  return []
}

export const useCartStore = defineStore('cart', {
  state: () => {
    // Initially empty - cart will be loaded when user logs in
    return {
      items: [],
      currentUserId: null,
    }
  },
  getters: {
    isEmpty: (state) => state.items.length === 0,
    count: (state) => state.items.reduce((sum, it) => sum + (it.qty || 0), 0),
    restaurantIds: (state) => {
      const set = new Set()
      for (const it of state.items) {
        if (it?.restaurantId) set.add(it.restaurantId)
      }
      return Array.from(set)
    },
    countForRestaurant: (state) => (restaurantId) =>
      state.items
        .filter((it) => it.restaurantId === restaurantId)
        .reduce((sum, it) => sum + (it.qty || 0), 0),
    itemsForRestaurant: (state) => (restaurantId) => state.items.filter((it) => it.restaurantId === restaurantId),
    detailedItemsForRestaurant: (state) => (restaurantId) => {
      const catalog = useCatalogStore()
      return state.items
        .filter((it) => it.restaurantId === restaurantId)
        .map((it) => {
          const food = catalog.foodById(it.foodId)
          const unitPriceCents = catalog.menuPriceCents(restaurantId, it.foodId) ?? 0

          return {
            restaurantId,
            foodId: it.foodId,
            qty: it.qty,
            food,
            unitPriceCents,
            lineTotalCents: unitPriceCents * it.qty,
          }
        })
        .filter((x) => x.food)
    },
    subtotalCentsFor: (state) => (restaurantId) => {
      const catalog = useCatalogStore()
      return state.items
        .filter((it) => it.restaurantId === restaurantId)
        .reduce((sum, it) => {
          const p = catalog.menuPriceCents(restaurantId, it.foodId) ?? 0
          return sum + p * (it.qty || 0)
        }, 0)
    },
    deliveryFeeCentsFor: () => (restaurantId) => {
      const catalog = useCatalogStore()
      const r = restaurantId ? catalog.restaurantById(restaurantId) : null
      return r?.deliveryFeeCents ?? 0
    },
    taxCentsFor() {
      const rate = 0.075
      return (restaurantId) => Math.round(this.subtotalCentsFor(restaurantId) * rate)
    },
    totalCentsFor() {
      return (restaurantId) => this.subtotalCentsFor(restaurantId) + this.deliveryFeeCentsFor(restaurantId) + this.taxCentsFor(restaurantId)
    },
    detailedGroups() {
      const catalog = useCatalogStore()
      return this.restaurantIds
        .map((restaurantId) => {
          const restaurant = catalog.restaurantById(restaurantId)
          const items = this.detailedItemsForRestaurant(restaurantId)
          const subtotalCents = this.subtotalCentsFor(restaurantId)
          const deliveryFeeCents = this.deliveryFeeCentsFor(restaurantId)
          const taxCents = this.taxCentsFor(restaurantId)
          const totalCents = subtotalCents + deliveryFeeCents + taxCents
          return { restaurantId, restaurant, items, subtotalCents, deliveryFeeCents, taxCents, totalCents }
        })
        .filter((g) => g.items.length > 0)
        .sort((a, b) => (a.restaurant?.name || '').localeCompare(b.restaurant?.name || ''))
    },
    subtotalCents() {
      return this.restaurantIds.reduce((sum, rId) => sum + this.subtotalCentsFor(rId), 0)
    },
    deliveryFeeCents() {
      return this.restaurantIds.reduce((sum, rId) => sum + this.deliveryFeeCentsFor(rId), 0)
    },
    taxCents() {
      return this.restaurantIds.reduce((sum, rId) => sum + this.taxCentsFor(rId), 0)
    },
    totalCents() {
      return this.subtotalCents + this.deliveryFeeCents + this.taxCents
    },
    cartTags() {
      const catalog = useCatalogStore()
      const tags = new Set()
      for (const it of this.items) {
        const food = catalog.foodById(it.foodId)
        for (const t of food?.tags || []) tags.add(t)
      }
      return Array.from(tags)
    },
  },
  actions: {
    _persist() {
      if (!this.currentUserId) return // Don't persist if no user logged in
      const key = getCartKey(this.currentUserId)
      writeJson(key, { items: this.items })
    },
    loadForUser(userId) {
      // Load cart for a specific user (called on login)
      this.currentUserId = userId
      this.items = loadCartItems(userId)
    },
    clearForLogout() {
      // Clear cart in memory when user logs out (don't touch storage)
      this.currentUserId = null
      this.items = []
    },
    clear() {
      this.items = []
      this._persist()
    },
    addItem({ restaurantId, foodId, qty = 1 }) {
      if (!this.currentUserId) {
        return { ok: false, reason: 'not_logged_in' }
      }

      const cleanQty = sanitizeQty(qty || 1) || 1

      if (!restaurantId || !foodId) {
        return { ok: false, reason: 'invalid' }
      }

      const existing = this.items.find((x) => x.restaurantId === restaurantId && x.foodId === foodId)
      if (existing) existing.qty = sanitizeQty(existing.qty + cleanQty)
      else this.items.push({ restaurantId, foodId, qty: cleanQty })

      this.items = this.items.filter((x) => sanitizeQty(x.qty) > 0)
      this._persist()

      return { ok: true }
    },
    setQty(restaurantId, foodId, qty) {
      const q = sanitizeQty(qty)
      const it = this.items.find((x) => x.restaurantId === restaurantId && x.foodId === foodId)
      if (!it) return

      it.qty = q
      this.items = this.items.filter((x) => sanitizeQty(x.qty) > 0)
      this._persist()
    },
    increment(restaurantId, foodId) {
      const it = this.items.find((x) => x.restaurantId === restaurantId && x.foodId === foodId)
      if (!it) return
      it.qty = sanitizeQty(it.qty + 1)
      this._persist()
    },
    decrement(restaurantId, foodId) {
      const it = this.items.find((x) => x.restaurantId === restaurantId && x.foodId === foodId)
      if (!it) return
      it.qty = sanitizeQty(it.qty - 1)
      this.items = this.items.filter((x) => sanitizeQty(x.qty) > 0)
      this._persist()
    },
    removeItem(restaurantId, foodId) {
      this.items = this.items.filter((x) => !(x.restaurantId === restaurantId && x.foodId === foodId))
      this._persist()
    },
  },
})
