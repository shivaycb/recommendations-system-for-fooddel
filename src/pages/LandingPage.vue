<template>
  <div class="container py-4 py-lg-5">
    <div class="fd-hero p-4 p-lg-5">
      <div class="row align-items-center g-4">
        <div class="col-lg-7">
          <div class="badge text-bg-primary-subtle border border-primary-subtle text-primary-emphasis mb-3">
            Fast delivery • Global cuisines • Real food photos
          </div>
          <h1 class="display-5 fw-semibold">Order from the best local restaurants.</h1>
          <p class="lead fd-muted mt-3 mb-0">
            Browse Indian, Nigerian, Italian, Japanese, Thai, Middle Eastern and more. Add items to your cart, checkout,
            and view your orders.
          </p>

          <div class="d-flex flex-column flex-sm-row gap-2 mt-4">
            <RouterLink class="btn btn-primary btn-lg" to="/browse">
              <i class="bi bi-search me-2"></i>Browse restaurants
            </RouterLink>
            <RouterLink class="btn btn-outline-secondary btn-lg" to="/register">
              <i class="bi bi-person-plus me-2"></i>Create account
            </RouterLink>
          </div>

          <div class="mt-4 d-flex flex-wrap gap-2">
            <span v-for="c in featuredCuisines" :key="c" class="badge text-bg-light border">{{ c }}</span>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card shadow-sm border-0 overflow-hidden">
            <img :src="heroFood.imageUrl" class="w-100" style="height: 280px; object-fit: cover" :alt="heroFood.name" />
            <div class="card-body">
              <div class="fw-semibold">{{ heroFood.name }}</div>
              <div class="small fd-muted">A top pick on Food Recommendation App</div>
              <div class="mt-3">
                <RouterLink class="btn btn-sm btn-outline-primary" to="/browse">Explore menu</RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 g-lg-4 mt-4">
      <div class="col-md-4">
        <div class="card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="fw-semibold"><i class="bi bi-bag-check me-2 text-primary"></i>Simple checkout</div>
            <div class="small fd-muted mt-2">Add items, change quantities, and place an order in under a minute.</div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="fw-semibold"><i class="bi bi-stars me-2 text-primary"></i>Smart recommendations</div>
            <div class="small fd-muted mt-2">We utilize your previous food searches, cart and orders to recommend similar dishes you might love next.</div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="fw-semibold"><i class="bi bi-envelope-paper me-2 text-primary"></i>Personalized Email</div>
            <div class="small fd-muted mt-2">We send emails about your orders and other cuisines to try out.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="d-flex align-items-center justify-content-between mt-5">
      <h2 class="h4 mb-0">Popular restaurants</h2>
      <RouterLink class="btn btn-sm btn-outline-secondary" to="/browse">View all</RouterLink>
    </div>

    <div class="row g-3 g-lg-4 mt-2">
      <div v-for="r in topRestaurants" :key="r.id" class="col-sm-6 col-lg-4">
        <RestaurantCard :restaurant="r" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import RestaurantCard from '@/components/RestaurantCard.vue'
import * as recommendation from '@/services/recommendation.js'

const catalog = useCatalogStore()

const featuredCuisines = computed(() => catalog.cuisines.slice(0, 10))

const topRestaurants = computed(() =>
  catalog.restaurants
    .slice()
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6),
)

const heroFood = computed(() => {
  const pick = catalog.foods.find((f) => f.id === 'food_biryani') || catalog.foods[0]
  return pick || { name: 'Great food', imageUrl: '' }
})
</script>
