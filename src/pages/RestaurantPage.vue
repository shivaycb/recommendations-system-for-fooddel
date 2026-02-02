<template>
  <div v-if="restaurant" class="container py-4">
    <div class="d-flex flex-column flex-lg-row gap-3 align-items-lg-end justify-content-between">
      <div class="d-flex gap-3">
        <img
          :src="restaurant.imageUrl"
          :alt="restaurant.name"
          class="rounded-3 border"
          style="width: 120px; height: 120px; object-fit: cover"
        />
        <div>
          <div class="d-flex align-items-center gap-2">
            <h1 class="h3 mb-0">{{ restaurant.name }}</h1>
          </div>
          <div class="fd-muted">{{ restaurant.tagline }}</div>
          <div class="mt-2 d-flex flex-wrap gap-2">
            <span class="badge text-bg-light border" v-for="c in restaurant.cuisines" :key="c">{{ c }}</span>
          </div>
          <div class="small fd-muted mt-2">
            <i class="bi bi-star-fill text-warning"></i>
            <span class="ms-1 fw-semibold">{{ restaurant.rating.toFixed(1) }}</span>
            <span class="mx-2">•</span>
            Delivery {{ formatMoney(restaurant.deliveryFeeCents, catalog.currency) }}
          </div>
        </div>
      </div>

      <div class="d-flex align-items-center gap-2">
        <RouterLink class="btn btn-outline-secondary" to="/browse"><i class="bi bi-arrow-left me-2"></i>Back</RouterLink>
        <RouterLink class="btn btn-primary" to="/cart"><i class="bi bi-cart3 me-2"></i>View cart</RouterLink>
      </div>
    </div>

    <div class="card border-0 shadow-sm mt-4">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-md-8">
            <label class="form-label small fw-semibold">Search menu</label>
            <input v-model.trim="query" type="text" class="form-control" placeholder="Search by name or tag" />
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-semibold">Show</label>
            <select v-model="show" class="form-select">
              <option value="all">All items</option>
              <option value="popular">Popular</option>
              <option value="veg">Vegetarian</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4">
      <div class="d-flex align-items-center justify-content-between">
        <h2 class="h5 mb-0">Menu</h2>
        <div class="small fd-muted">{{ filteredMenu.length }} items</div>
      </div>

      <div v-if="filteredMenu.length === 0" class="card border-0 shadow-sm mt-3">
        <div class="card-body">
          <EmptyState
            title="No menu items match"
            message="Try a different search term, or switch the filter to All items."
            icon-class="bi bi-search"
          >
            <button class="btn btn-outline-primary" type="button" @click="reset">Reset</button>
          </EmptyState>
        </div>
      </div>

      <div v-else class="row g-3 g-lg-4 mt-2">
        <div v-for="mi in filteredMenu" :key="mi.foodId" class="col-sm-6 col-lg-4">
          <FoodCard :food="mi.food" :price-cents="mi.priceCents" :currency="catalog.currency" :show-tags="true">
            <template #actions>
              <button
                class="btn btn-sm btn-primary"
                type="button"
                @click="addToCart(mi.foodId)"
              >
                <i class="bi bi-plus-lg me-1"></i>Add
              </button>
            </template>
          </FoodCard>
        </div>
      </div>
    </div>

    <div class="card border-0 shadow-sm mt-4" v-if="restaurant && cart.countForRestaurant(restaurant.id) > 0">
      <div class="card-body d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        <div>
          <div class="fw-semibold">Cart ready</div>
          <div class="small fd-muted">
            {{ cart.countForRestaurant(restaurant.id) }} items • Total {{ formatMoney(cart.totalCentsFor(restaurant.id), catalog.currency) }}
          </div>
        </div>
        <RouterLink class="btn btn-primary" to="/checkout"><i class="bi bi-credit-card me-2"></i>Checkout</RouterLink>
      </div>
    </div>
  </div>

  <div v-else class="container py-4">
    <EmptyState
      title="Restaurant not found"
      message="This restaurant may have been removed."
      icon-class="bi bi-shop"
    >
      <RouterLink class="btn btn-primary" to="/browse">Browse restaurants</RouterLink>
    </EmptyState>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toasts'
import FoodCard from '@/components/FoodCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney } from '@/utils/money'
import { neo4j_added_to_cart } from '@/services/recommendation'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const catalog = useCatalogStore()
const cart = useCartStore()
const toast = useToastStore()
const auth = useAuthStore()

const id = computed(() => route.params.id)
const restaurant = computed(() => catalog.restaurantById(id.value))

const query = ref('')
const show = ref('all')

const menu = computed(() => {
  if (!restaurant.value) return []

  return catalog.menuDetailed(restaurant.value.id).map((x) => ({
    ...x,
    priceCents: x.priceCents,
  }))
})

const filteredMenu = computed(() => {
  const q = query.value.trim().toLowerCase()

  return menu.value
    .filter((m) => {
      const f = m.food
      if (!f) return false

      if (show.value === 'popular' && !m.popular) return false
      if (show.value === 'veg' && !f.diet?.vegetarian) return false

      if (!q) return true

      const hay = `${f.name} ${f.cuisine} ${f.country} ${(f.tags || []).join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
    .slice()
    .sort((a, b) => {
      if (a.popular && !b.popular) return -1
      if (!a.popular && b.popular) return 1
      return (a.food?.name || '').localeCompare(b.food?.name || '')
    })
})

function reset() {
  query.value = ''
  show.value = 'all'
}

function addToCart(foodId) {
  if (!restaurant.value) return

  const result = cart.addItem({ restaurantId: restaurant.value.id, foodId, qty: 1 })
  
  if (result.ok) {
    const food = catalog.foodById(foodId)
    toast.push({ title: 'Added to cart', message: food?.name || 'Item added', variant: 'primary' })
    neo4j_added_to_cart(foodId, auth.user?.id)
  }
}
</script>
