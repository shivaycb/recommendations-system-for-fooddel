<template>
  <div class="container py-4">
    <div class="d-flex align-items-end justify-content-between">
      <div>
        <h1 class="h3 mb-1">Cart</h1>
        <div v-if="groups.length" class="small fd-muted">{{ groups.length }} restaurant(s)</div>
      </div>
      <RouterLink class="btn btn-outline-secondary" to="/browse"><i class="bi bi-arrow-left me-2"></i>Browse</RouterLink>
    </div>

    <div v-if="cart.isEmpty" class="card border-0 shadow-sm mt-3">
      <div class="card-body">
        <EmptyState
          title="Your cart is empty"
          message="Add items from a restaurant to get started."
          icon-class="bi bi-cart3"
        >
          <RouterLink class="btn btn-primary" to="/browse">Find food</RouterLink>
        </EmptyState>
      </div>
    </div>

    <template v-else>
      <div class="row g-3 g-lg-4 mt-3">
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between">
                <div class="fw-semibold">Items</div>
                <button class="btn btn-sm btn-outline-danger" type="button" @click="clearCart">Clear all</button>
              </div>

              <div v-for="g in groups" :key="g.restaurantId" class="mt-3">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <div class="fw-semibold">{{ g.restaurant?.name || 'Restaurant' }}</div>
                    <div class="small fd-muted" v-if="g.restaurant">Delivery Fee: {{ formatMoney(g.restaurant.deliveryFeeCents, catalog.currency) }}</div>
                  </div>
                  <div class="text-end">
                    <div class="small fd-muted">Subtotal</div>
                    <div class="fw-semibold">{{ formatMoney(g.subtotalCents, catalog.currency) }}</div>
                  </div>
                </div>

                <div class="list-group list-group-flush mt-2">
                  <div v-for="it in g.items" :key="`${it.restaurantId}_${it.foodId}`" class="list-group-item py-3">
                    <div class="d-flex gap-3">
                      <img
                        :src="it.food.imageUrl"
                        :alt="it.food.name"
                        class="rounded-3 border"
                        style="width: 72px; height: 72px; object-fit: cover"
                        loading="lazy"
                      />

                      <div class="flex-grow-1 min-w-0">
                        <div class="d-flex align-items-start justify-content-between gap-2">
                          <div class="min-w-0">
                            <div class="fw-semibold text-truncate">{{ it.food.name }}</div>
                            <div class="small fd-muted text-truncate">{{ it.food.cuisine }} • {{ it.food.country }}</div>
                          </div>
                          <div class="fw-semibold">{{ formatMoney(it.lineTotalCents, catalog.currency) }}</div>
                        </div>

                        <div class="d-flex align-items-center justify-content-between mt-2">
                          <QuantityControl
                            :qty="it.qty"
                            @increment="cart.increment(it.restaurantId, it.foodId)"
                            @decrement="cart.decrement(it.restaurantId, it.foodId)"
                          />

                          <button
                            class="btn btn-sm btn-outline-secondary"
                            type="button"
                            @click="cart.removeItem(it.restaurantId, it.foodId)"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <hr class="mt-4 mb-4" v-if="groups.length > 1" />
              </div>

              <div class="mt-3 small fd-muted">Tax is estimated. Payment is simulated in this demo app.</div>
            </div>
          </div>
        </div>


        <div class="col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="fw-semibold">Summary</div>

              <div class="mt-3">
                <div class="d-flex justify-content-between">
                  <div class="fd-muted">Subtotal</div>
                  <div>{{ formatMoney(cart.subtotalCents, catalog.currency) }}</div>
                </div>
                <div class="d-flex justify-content-between mt-2">
                  <div class="fd-muted">Delivery</div>
                  <div>{{ formatMoney(cart.deliveryFeeCents, catalog.currency) }}</div>
                </div>
                <div class="d-flex justify-content-between mt-2">
                  <div class="fd-muted">Tax</div>
                  <div>{{ formatMoney(cart.taxCents, catalog.currency) }}</div>
                </div>
                <hr />
                <div class="d-flex justify-content-between fw-semibold">
                  <div>Total</div>
                  <div>{{ formatMoney(cart.totalCents, catalog.currency) }}</div>
                </div>
              </div>

              <RouterLink
                class="btn btn-primary w-100 mt-3"
                :class="{ disabled: !canCheckout }"
                to="/checkout"
              >
                <i class="bi bi-credit-card me-2"></i>Checkout
              </RouterLink>

              <div class="small fd-muted mt-2">You’ll be asked to login/register if needed.</div>
            </div>
          </div>

        </div>
      </div>

        <!-- Recommendations "You may also like" Section -->
         <div v-if="similarFoods.length > 0" class="mt-4 mb-4">
          <h3 class="h5 fw-semibold mb-3">You may also like</h3>
          
           <div class="row g-3 align-items-start">
            <div v-for="f in similarFoods" :key="f.id" class="col-sm-6 col-lg-4">
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
    </template>
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
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth' // Added for user ID
import { useToastStore } from '@/stores/toasts'
import { formatMoney } from '@/utils/money'
import { neo4j_get_similar_cart_food, neo4j_clicked_food_description, neo4j_added_to_cart } from '@/services/recommendation' // Added services

import EmptyState from '@/components/EmptyState.vue'
import QuantityControl from '@/components/QuantityControl.vue'
import FoodCard from '@/components/FoodCard.vue'

const catalog = useCatalogStore()
const cart = useCartStore()
const auth = useAuthStore() // Added
const toast = useToastStore()

// --- Recommendations Logic ---
const similarFoods = ref([])
const loadingRecommendations = ref(false)

async function loadRecommendations() {
  const foodIds = [...new Set(cart.items.map(i => i.foodId))]
  if (foodIds.length === 0) {
    similarFoods.value = []
    return
  }

  loadingRecommendations.value = true
  try {
    // 1. Get similar items (returns [{id, name}, ...])
    const rawRecs = await neo4j_get_similar_cart_food(foodIds)
    
    // 2. Resolve to full food objects from catalog
    // The user explicitly noted: "since what is return is id and name, you have to use the id to get the food from catalog.json"
    similarFoods.value = rawRecs
      .map(r => catalog.foodById(r.id))
      .filter(Boolean)
  } catch (err) {
    console.error("Failed to load cart recommendations", err)
    similarFoods.value = []
  } finally {
    loadingRecommendations.value = false
  }
}

// Watch for cart changes to refresh recommendations
watch(() => cart.items.length, () => {
  loadRecommendations()
}, { immediate: true })

// --- Helper Functions (Reused from BrowsePage) ---
const expandedFoodId = ref(null)
const moreInfoFood = ref(null)

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

const groups = computed(() => cart.detailedGroups)

const minOrderWarnings = computed(() =>
  groups.value.filter((g) => g.restaurant && g.subtotalCents < g.restaurant.minOrderCents),
)

const canCheckout = computed(() => minOrderWarnings.value.length === 0)

function clearCart() {
  cart.clear()
  toast.push({ title: 'Cart cleared', message: 'Your cart is now empty.', variant: 'secondary' })
}
</script>
