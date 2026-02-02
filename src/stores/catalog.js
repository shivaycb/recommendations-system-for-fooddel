import { defineStore } from 'pinia'
import catalog from '@/data/catalog.json'

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    data: catalog,
  }),
  getters: {
    currency: (state) => state.data?.meta?.currency || 'USD',
    foods: (state) => state.data?.foods || [],
    restaurants: (state) => state.data?.restaurants || [],
    menus: (state) => state.data?.menus || [],
    foodById: (state) => (id) => state.data?.foods?.find((f) => f.id === id),
    restaurantById: (state) => (id) => state.data?.restaurants?.find((r) => r.id === id),
    menuForRestaurant: (state) => (restaurantId) => {
      const m = state.data?.menus?.find((x) => x.restaurantId === restaurantId)
      return m?.items || []
    },
    menuItem: (state) => (restaurantId, foodId) => {
      const m = state.data?.menus?.find((x) => x.restaurantId === restaurantId)
      return m?.items?.find((i) => i.foodId === foodId)
    },
    menuPriceCents: (state) => (restaurantId, foodId) => {
      const item = state.data?.menus
        ?.find((x) => x.restaurantId === restaurantId)
        ?.items?.find((i) => i.foodId === foodId)
      return item?.priceCents ?? null
    },
    cuisines: (state) => {
      const set = new Set()
      for (const r of state.data?.restaurants || []) {
        for (const c of r.cuisines || []) set.add(c)
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b))
    },
  },
  actions: {
    menuDetailed(restaurantId, { onlyAvailable = true } = {}) {
      const items = this.menuForRestaurant(restaurantId)
      const joined = items
        .map((i) => ({ ...i, food: this.foodById(i.foodId) }))
        .filter((x) => x.food)

      return onlyAvailable ? joined.filter((x) => x.isAvailable) : joined
    }
  },
})
