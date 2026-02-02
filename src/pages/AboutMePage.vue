<template>
  <div class="container py-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex justify-content-center align-items-center py-5">
      <div class="spinner-border text-primary me-3" role="status"></div>
      <span class="text-muted">Loading your food profile...</span>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Header / Intro -->
      <div class="text-center mb-5">
        <h1 class="fw-bold mb-1">
          👋 Hi {{ about_user.name || 'there' }}
        </h1>
        <p class="text-muted mb-2">
          This is your Food Recommendation App "About Me" — built from your food journey
        </p>
        <span v-if="about_user.currentDate" class="badge bg-primary">
          As of {{ about_user.currentDate }}
        </span>
      </div>

      <!-- EMPTY STATE : First time user -->
      <div
        v-if="!about_user.hasActivity"
        class="card border-0 shadow-sm text-center mb-5"
      >
        <div class="card-body py-5">
          <h4 class="fw-semibold mb-2">
            Your food story hasn't started yet 🍴
          </h4>
          <p class="text-muted mb-4">
            Explore restaurants &amp; foods, add to your cart, or place your first order
            and we'll start building your personal food profile here.
          </p>
          <div class="d-flex justify-content-center gap-3 flex-wrap">
            <button class="btn btn-primary px-4" @click="$router.push('/browse')">
              Start Exploring
            </button>
          </div>
        </div>
      </div>

      <!-- Taste Summary -->
      <div v-if="about_user.hasActivity" class="card border-0 shadow-sm mb-5">
        <div class="card-body">
          <h4 class="fw-semibold mb-3">
            Your Taste at a Glance 🍽️
          </h4>
          <p class="text-muted mb-3">
            These tags show up the most in foods that peaked your interest. (Ranked by interest strength)
          </p>

          <div class="d-flex flex-wrap gap-2">
            <span
              v-for="tag in about_user.topTags"
              :key="tag.name"
              class="badge rounded-pill bg-light text-dark border"
            >
              {{ tag.name }} · {{ tag.total_interest_shown.toFixed(2) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Food Identity & Culture (LLM-driven) -->
      <div v-if="about_user.hasActivity" class="row g-4 mb-5">
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h5 class="fw-semibold mb-2">
                Your Food Identity 🧭
              </h5>
              <p class="text-muted mb-0">
                {{ about_user.userFoodIdentity }}
              </p>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h5 class="fw-semibold mb-2">
                Cultures on Your Plate 🌍
              </h5>
              <p class="text-muted mb-0">
                {{ about_user.userCulturalProfile }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recently Interacted Foods -->
      <div v-if="about_user.hasActivity && enrichedRecentFoods.length > 0" class="mb-5">
        <h4 class="fw-semibold mb-3">
          Recently on Your Radar 👀
        </h4>

        <div class="row g-4 align-items-start">
          <div
            class="col-12 col-md-6 col-lg-4"
            v-for="food in enrichedRecentFoods"
            :key="food.id"
          >
            <FoodCard :food="food" :price-cents="minPriceForFood(food.id)" :currency="catalog.currency" :show-tags="true">
              <template #actions>
                <button class="btn btn-sm btn-outline-secondary me-2" type="button" @click="showMoreInfo(food)">
                  <i class="bi bi-info-circle me-1"></i>
                  More Info
                </button>
                <button class="btn btn-sm btn-outline-primary" type="button" @click="toggleOffers(food.id)">
                  <i class="bi bi-tag me-1"></i>
                  Offers
                  <span class="ms-1">({{ offersForFood(food.id).length }})</span>
                </button>
              </template>
            </FoodCard>

            <div v-if="expandedFoodId === food.id" class="card border-0 shadow-sm mt-2">
              <div class="card-body">
                <div class="fw-semibold">Available at</div>
                <div v-if="offersForFood(food.id).length === 0" class="small fd-muted mt-1">No current offers.</div>

                <div v-else class="list-group list-group-flush mt-2">
                  <div
                    v-for="o in offersForFood(food.id)"
                    :key="o.restaurantId"
                    class="list-group-item d-flex align-items-center justify-content-between"
                  >
                    <div class="min-w-0">
                      <div class="fw-semibold text-truncate">{{ o.restaurant.name }} (⭐{{ o.restaurant.rating }})</div>
                      <div class="small fd-muted">Delivery Fee: {{ formatMoney(o.restaurant.deliveryFeeCents, catalog.currency) }}</div>
                    </div>
                    <div class="text-end">
                      <div class="fw-semibold">{{ formatMoney(o.priceCents, catalog.currency) }}</div>
                      <button class="btn btn-sm btn-primary mt-2" type="button" @click="addOfferToCart(o.restaurantId, food.id)">
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

      <!-- Personalized Recommendations -->
      <div v-if="about_user.hasActivity && enrichedPicksToTryOut.length > 0" class="mb-5">
        <h4 class="fw-semibold mb-3">
          Picks to Try Out Next ✨
        </h4>
        <p class="text-muted mb-4">
          These are dishes that you should explore next, you will likely love it!
        </p>

        <div class="row g-3 g-lg-4 align-items-start">
          <div
            class="col-sm-6 col-lg-4"
            v-for="food in enrichedPicksToTryOut"
            :key="food.id"
          >
            <FoodCard :food="food" :price-cents="minPriceForFood(food.id)" :currency="catalog.currency" :show-tags="true">
              <template #actions>
                <button class="btn btn-sm btn-outline-secondary me-2" type="button" @click="showMoreInfo(food)">
                  <i class="bi bi-info-circle me-1"></i>
                  More Info
                </button>
                <button class="btn btn-sm btn-outline-primary" type="button" @click="toggleOffers(food.id)">
                  <i class="bi bi-tag me-1"></i>
                  Offers
                  <span class="ms-1">({{ offersForFood(food.id).length }})</span>
                </button>
              </template>
            </FoodCard>

            <div v-if="expandedFoodId === food.id" class="card border-0 shadow-sm mt-2">
              <div class="card-body">
                <div class="fw-semibold">Available at</div>
                <div v-if="offersForFood(food.id).length === 0" class="small fd-muted mt-1">No current offers.</div>

                <div v-else class="list-group list-group-flush mt-2">
                  <div
                    v-for="o in offersForFood(food.id)"
                    :key="o.restaurantId"
                    class="list-group-item d-flex align-items-center justify-content-between"
                  >
                    <div class="min-w-0">
                      <div class="fw-semibold text-truncate">{{ o.restaurant.name }} (⭐{{ o.restaurant.rating }})</div>
                      <div class="small fd-muted">Delivery Fee: {{ formatMoney(o.restaurant.deliveryFeeCents, catalog.currency) }}</div>
                    </div>
                    <div class="text-end">
                      <div class="fw-semibold">{{ formatMoney(o.priceCents, catalog.currency) }}</div>
                      <button class="btn btn-sm btn-primary mt-2" type="button" @click="addOfferToCart(o.restaurantId, food.id)">
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

      <!-- Journey Footer -->
      <div v-if="about_user.hasActivity" class="text-center">
        <p class="text-muted mb-3">
          This page evolves as your taste does 🙃
        </p>
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
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toasts'
import { neo4j_added_to_cart, neo4j_clicked_food_description } from '@/services/recommendation'
import { formatMoney } from '@/utils/money'
import FoodCard from '@/components/FoodCard.vue'

const auth = useAuthStore()
const catalog = useCatalogStore()
const cart = useCartStore()
const toast = useToastStore()

const expandedFoodId = ref(null)
const moreInfoFood = ref(null)

// Use data from auth store
const about_user = computed(() => auth.userAboutMeData || {})
const isLoading = computed(() => auth.isLoadingAboutMe)

onMounted(() => {
  // Trigger fetch if not already loaded or loading
  auth.fetchUserAboutMe()
})

// Enrich recent foods with full catalog data
const enrichedRecentFoods = computed(() => {
  if (!about_user.value.recently_on_your_rader) return []
  
  return about_user.value.recently_on_your_rader
    .map((item) => catalog.foodById(item.id))
    .filter(Boolean)
})

// Enrich picks to try out with full catalog data
const enrichedPicksToTryOut = computed(() => {
  if (!about_user.value.picks_to_try_out) return []
  
  return about_user.value.picks_to_try_out
    .map((item) => catalog.foodById(item.id))
    .filter(Boolean)
})

// Get all offers (restaurant + price) for a given food
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

// Get minimum price for a food across all offers
function minPriceForFood(foodId) {
  const offers = offersForFood(foodId)
  return offers.length ? offers[0].priceCents : null
}

// Toggle expanded offers for a specific food
function toggleOffers(foodId) {
  expandedFoodId.value = expandedFoodId.value === foodId ? null : foodId
}

// Add an offer to cart
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
