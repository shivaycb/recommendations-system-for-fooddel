<template>
  <div class="container py-4">
    <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
      <div>
        <h1 class="h3 mb-1">Browse</h1>
        <div class="small fd-muted">Restaurants and dishes from multiple cuisines worldwide.</div>
      </div>

      <div class="btn-group" role="group" aria-label="Browse mode">
        <button
          type="button"
          class="btn"
          :class="mode === 'restaurants' ? 'btn-primary' : 'btn-outline-primary'"
          @click="mode = 'restaurants'"
        >
          Restaurants
        </button>
        <button
          type="button"
          class="btn"
          :class="mode === 'foods' ? 'btn-primary' : 'btn-outline-primary'"
          @click="mode = 'foods'"
        >
          Foods
        </button>
      </div>
    </div>

    <div class="card border-0 shadow-sm mt-3">
      <div class="card-body">
        <div v-if="mode === 'restaurants'" class="row g-2 align-items-end">
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Search restaurants</label>
            <input v-model.trim="restaurantQuery" type="text" class="form-control" placeholder="e.g. Lagos, Sushi, Pizza" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Cuisine</label>
            <select v-model="cuisine" class="form-select">
              <option value="">All</option>
              <option v-for="c in catalog.cuisines" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <div v-else class="row g-2 align-items-end">
          <div class="col-md-6">
            <label class="form-label small fw-semibold">Search foods</label>
            <input v-model.trim="foodQuery" type="text" class="form-control" placeholder="e.g. biryani, jollof, pizza" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Tag</label>
            <input v-model.trim="tagQuery" type="text" class="form-control" placeholder="e.g. spicy, vegetarian" />
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Sort</label>
            <select v-model="foodSort" class="form-select">
              <option value="relevance">Relevance</option>
              <option value="price_low">Lowest price</option>
              <option value="price_high">Highest price</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-if="mode === 'restaurants'" class="mt-4">
      <div class="d-flex align-items-center justify-content-between">
        <h2 class="h5 mb-0">Restaurants</h2>
        <div class="small fd-muted">{{ filteredRestaurants.length }} found</div>
      </div>

      <div v-if="filteredRestaurants.length === 0" class="card border-0 shadow-sm mt-3">
        <div class="card-body">
          <EmptyState
            title="No restaurants match your filters"
            message="Try clearing the cuisine filter or searching for something else."
            icon-class="bi bi-shop"
          >
            <button class="btn btn-outline-primary" type="button" @click="resetRestaurantFilters">Reset filters</button>
          </EmptyState>
        </div>
      </div>

      <div v-else class="row g-3 g-lg-4 mt-2">
        <div v-for="r in filteredRestaurants" :key="r.id" class="col-sm-6 col-lg-4">
          <RestaurantCard :restaurant="r" />
        </div>
      </div>
    </div>

    <div v-else class="mt-4">
      <div v-if="!foodQuery && !tagQuery && foodSort === 'relevance'" class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <div class="fw-semibold">For you</div>
              <div class="small fd-muted">Personalized recommendations based on your preferences.</div>
            </div>
            <div v-if="!recommendationsLoading" class="small fd-muted">{{ forYouFoods.length }} items</div>
          </div>

          <div v-if="recommendationsLoading" class="d-flex align-items-center justify-content-center py-4">
            <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            <span class="small fd-muted">Loading recommendations...</span>
          </div>

          <div v-else-if="forYouFoods.length === 0" class="small fd-muted mt-2">No recommendations available yet.</div>

          <div v-else class="row g-3 mt-3 align-items-start">
            <div v-for="f in forYouFoods" :key="f.id" class="col-sm-6 col-lg-4">
              <FoodCard :food="f" :price-cents="minPriceForFood(f.id)" :currency="catalog.currency" :show-tags="true">
                <template #actions>
                  <button class="btn btn-sm btn-outline-secondary me-2" type="button" @click="showMoreInfo(f)">
                    <i class="bi bi-info-circle me-1"></i>
                    More Info
                  </button>
                  <button class="btn btn-sm btn-outline-primary" type="button" @click="toggleOffers(f.id)">
                    <i class="bi bi-tag me-1"></i>
                    Offers
                    <span class="ms-1">({{ offersForFood(f.id).length }})</span>
                  </button>
                </template>
              </FoodCard>

              <div v-if="expandedFoodId === f.id" class="card border-0 shadow-sm mt-2">
                <div class="card-body">
                  <div class="fw-semibold">Available at</div>
                  <div v-if="offersForFood(f.id).length === 0" class="small fd-muted mt-1">No current offers.</div>

                  <div v-else class="list-group list-group-flush mt-2">
                    <div
                      v-for="o in offersForFood(f.id)"
                      :key="o.restaurantId"
                      class="list-group-item d-flex align-items-center justify-content-between"
                    >
                      <div class="min-w-0">
                        <div class="fw-semibold text-truncate">{{ o.restaurant.name }} (⭐{{ o.restaurant.rating }})</div>
                        <div class="small fd-muted">Delivery Fee: {{ formatMoney(o.restaurant.deliveryFeeCents, catalog.currency) }}</div>
                      </div>
                      <div class="text-end">
                        <div class="fw-semibold">{{ formatMoney(o.priceCents, catalog.currency) }}</div>
                        <button class="btn btn-sm btn-primary mt-2" type="button" @click="addOfferToCart(o.restaurantId, f.id)">
                          Add to cart
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="mt-3 d-flex justify-content-end">
                    <button class="btn btn-sm btn-outline-secondary" type="button" @click="expandedFoodId = null">Close</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex align-items-center justify-content-between">
        <h2 class="h5 mb-0">Foods</h2>
        <div class="small fd-muted">{{ filteredFoods.length }} found</div>
      </div>

      <div v-if="filteredFoods.length === 0" class="card border-0 shadow-sm mt-3">
        <div class="card-body">
          <EmptyState
            title="No foods match your filters"
            message="Try searching by a different name or a broader tag."
            icon-class="bi bi-egg-fried"
          >
            <button class="btn btn-outline-primary" type="button" @click="resetFoodFilters">Reset filters</button>
          </EmptyState>
        </div>
      </div>

      <div v-else class="row g-3 g-lg-4 mt-2 align-items-start">
        <div v-for="f in filteredFoods" :key="f.id" class="col-sm-6 col-lg-4">
          <FoodCard :food="f" :price-cents="minPriceForFood(f.id)" :currency="catalog.currency" :show-tags="true">
            <template #actions>
              <button class="btn btn-sm btn-outline-secondary me-2" type="button" @click="showMoreInfo(f)">
                <i class="bi bi-info-circle me-1"></i>
                More Info
              </button>
              <button class="btn btn-sm btn-outline-primary" type="button" @click="toggleOffers(f.id)">
                <i class="bi bi-tag me-1"></i>
                Offers
                <span class="ms-1">({{ offersForFood(f.id).length }})</span>
              </button>
            </template>
          </FoodCard>

          <div v-if="expandedFoodId === f.id" class="card border-0 shadow-sm mt-2">
            <div class="card-body">
              <div class="fw-semibold">Available at</div>
              <div v-if="offersForFood(f.id).length === 0" class="small fd-muted mt-1">No current offers.</div>

              <div v-else class="list-group list-group-flush mt-2">
                <div
                  v-for="o in offersForFood(f.id)"
                  :key="o.restaurantId"
                  class="list-group-item d-flex align-items-center justify-content-between"
                >
                  <div class="min-w-0">
                    <div class="fw-semibold text-truncate">{{ o.restaurant.name }} (⭐{{ o.restaurant.rating }})</div>
                    <div class="small fd-muted">Delivery Fee: {{ formatMoney(o.restaurant.deliveryFeeCents, catalog.currency) }}</div>
                  </div>
                  <div class="text-end">
                    <div class="fw-semibold">{{ formatMoney(o.priceCents, catalog.currency) }}</div>
                    <button class="btn btn-sm btn-primary mt-2" type="button" @click="addOfferToCart(o.restaurantId, f.id)">
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-3 d-flex justify-content-end">
                <button class="btn btn-sm btn-outline-secondary" type="button" @click="expandedFoodId = null">Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm mt-4">
        <div class="card-body">
          <div class="fw-semibold">Tip</div>
          <div class="small fd-muted mt-1">
            Some foods appear in multiple restaurants with different prices. Open “Offers” to choose where to order from.
          </div>
        </div>
      </div>
    </div>

    <!-- More Info Modal -->
    <div
      v-if="moreInfoFood"
      class="modal d-block"
      tabindex="-1"
      style="background-color: rgba(0, 0, 0, 0.5)"
      @click.self="closeMoreInfo"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ moreInfoFood.name }}</h5>
            <button type="button" class="btn-close" @click="closeMoreInfo"></button>
          </div>
          <div class="modal-body">
            <img :src="moreInfoFood.imageUrl" class="img-fluid rounded mb-3" :alt="moreInfoFood.name" loading="lazy" style="max-height: 250px; object-fit: cover; width: 100%;" />
            
            <div class="d-flex align-items-start justify-content-between gap-2 mb-3">
              <div class="min-w-0">
                <div class="fw-semibold">{{ moreInfoFood.name }}</div>
                <div class="small fd-muted">{{ moreInfoFood.cuisine }} • {{ moreInfoFood.country }}</div>
              </div>
              <div v-if="minPriceForFood(moreInfoFood.id) != null" class="fw-semibold">
                {{ formatMoney(minPriceForFood(moreInfoFood.id), catalog.currency) }}
              </div>
            </div>

            <div v-if="moreInfoFood.more_info" class="small mb-3">{{ moreInfoFood.more_info }}</div>

            <div v-if="moreInfoFood.tags && moreInfoFood.tags.length" class="d-flex flex-wrap gap-1 mb-3">
              <span v-for="t in moreInfoFood.tags.slice(0, 6)" :key="t" class="fd-tag">{{ t }}</span>
            </div>

            <div class="mb-3">
              <span
                v-if="moreInfoFood.diet?.vegetarian"
                class="badge text-bg-success-subtle border border-success-subtle text-success-emphasis"
              >
                Veg
              </span>
              <span
                v-else
                class="badge text-bg-secondary-subtle border border-secondary-subtle text-secondary-emphasis"
              >
                Non-veg
              </span>
            </div>

            <div class="fw-semibold mb-2">Available at</div>
            <div v-if="offersForFood(moreInfoFood.id).length === 0" class="small fd-muted">No current offers.</div>

            <div v-else class="list-group">
              <div
                v-for="o in offersForFood(moreInfoFood.id)"
                :key="o.restaurantId"
                class="list-group-item d-flex align-items-center justify-content-between"
              >
                <div class="min-w-0">
                  <div class="fw-semibold text-truncate">{{ o.restaurant.name }} (⭐{{ o.restaurant.rating }})</div>
                  <div class="small fd-muted">Delivery Fee: {{ formatMoney(o.restaurant.deliveryFeeCents, catalog.currency) }}</div>
                </div>
                <div class="text-end">
                  <div class="fw-semibold">{{ formatMoney(o.priceCents, catalog.currency) }}</div>
                  <button class="btn btn-sm btn-primary mt-2" type="button" @click="addOfferToCart(o.restaurantId, moreInfoFood.id)">
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useOrdersStore } from '@/stores/orders'
import { useToastStore } from '@/stores/toasts'
import RestaurantCard from '@/components/RestaurantCard.vue'
import FoodCard from '@/components/FoodCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { formatMoney } from '@/utils/money'
import { neo4j_added_to_cart, neo4j_get_topk_recommendations, neo4j_clicked_food_description } from '@/services/recommendation'

const catalog = useCatalogStore()
const auth = useAuthStore()
const cart = useCartStore()
const orders = useOrdersStore()
const toast = useToastStore()

const mode = ref('restaurants')

const restaurantQuery = ref('')
const cuisine = ref('')

const foodQuery = ref('')
const tagQuery = ref('')
const foodSort = ref('relevance')

const expandedFoodId = ref(null)
const moreInfoFood = ref(null)

const recommendations = ref([])
const recommendationsLoading = ref(true)

onMounted(async () => {
  recommendationsLoading.value = true
  try {
    recommendations.value = await neo4j_get_topk_recommendations(auth.user?.id, 15)
  } catch (error) {
    console.error('Failed to load recommendations:', error)
    recommendations.value = []
  } finally {
    recommendationsLoading.value = false
  }
})

const seedFoodIds = computed(() => {
  const out = []
  const seen = new Set()

  for (const it of cart.items || []) {
    if (!it?.foodId || seen.has(it.foodId)) continue
    seen.add(it.foodId)
    out.push(it.foodId)
  }

  const userId = auth.user?.id
  if (userId) {
    const recentOrders = orders.ordersForUser(userId).slice(0, 8)
    for (const o of recentOrders) {
      for (const it of o.items || []) {
        if (!it?.foodId || seen.has(it.foodId)) continue
        seen.add(it.foodId)
        out.push(it.foodId)
      }
    }
  }

  return out
})

const forYouFoods = computed(() => {
  if (!recommendations.value || recommendations.value.length === 0) {
    return []
  }
  return recommendations.value
    .map((rec) => catalog.foodById(rec.id))
    .filter(Boolean)
})

const filteredRestaurants = computed(() => {
  const q = restaurantQuery.value.trim().toLowerCase()
  const c = cuisine.value

  return catalog.restaurants
    .filter((r) => {
      if (c && !(r.cuisines || []).includes(c)) return false
      if (!q) return true

      const hay = `${r.name} ${r.tagline} ${(r.cuisines || []).join(' ')}`.toLowerCase()
      return hay.includes(q)
    })
    .slice()
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
})

function resetRestaurantFilters() {
  restaurantQuery.value = ''
  cuisine.value = ''
}

function offersForFood(foodId) {
  const res = []
  for (const m of catalog.menus) {
    const item = (m.items || []).find((x) => x.foodId === foodId && x.isAvailable)
    if (!item) continue

    const restaurant = catalog.restaurantById(m.restaurantId)
    if (!restaurant) continue

    res.push({ restaurantId: m.restaurantId, restaurant, priceCents: item.priceCents })
  }

  return res.sort((a, b) => a.priceCents - b.priceCents)
}

function minPriceForFood(foodId) {
  const offers = offersForFood(foodId)
  return offers.length ? offers[0].priceCents : null
}

const filteredFoods = computed(() => {
  const q = foodQuery.value.trim().toLowerCase()
  const t = tagQuery.value.trim().toLowerCase()

  const base = catalog.foods.filter((f) => {
    const hay = `${f.name} ${f.cuisine} ${f.country} ${(f.tags || []).join(' ')}`.toLowerCase()

    if (q && !hay.includes(q)) return false

    if (t) {
      const tagHay = (f.tags || []).join(' ').toLowerCase()
      if (!tagHay.includes(t)) return false
    }

    return true
  })

  if (foodSort.value === 'price_low') {
    return base.slice().sort((a, b) => (minPriceForFood(a.id) ?? 1e12) - (minPriceForFood(b.id) ?? 1e12))
  }

  if (foodSort.value === 'price_high') {
    return base.slice().sort((a, b) => (minPriceForFood(b.id) ?? -1) - (minPriceForFood(a.id) ?? -1))
  }

  return base
})

function resetFoodFilters() {
  foodQuery.value = ''
  tagQuery.value = ''
  foodSort.value = 'relevance'
  expandedFoodId.value = null
}

function toggleOffers(foodId) {
  expandedFoodId.value = expandedFoodId.value === foodId ? null : foodId
}

function addOfferToCart(restaurantId, foodId) {
  const res = cart.addItem({ restaurantId, foodId, qty: 1 })
  if (res.ok) {
    const food = catalog.foodById(foodId)
    toast.push({ title: 'Added to cart', message: food?.name || 'Item added', variant: 'primary' })
    neo4j_added_to_cart(foodId, auth.user?.id)
  }
}

function showMoreInfo(food) {
  moreInfoFood.value = food
  neo4j_clicked_food_description(food.id, auth.user?.id)
}

function closeMoreInfo() {
  moreInfoFood.value = null
}
</script>
