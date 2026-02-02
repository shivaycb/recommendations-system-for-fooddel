<template>
  <RouterLink
    class="card text-decoration-none text-reset h-100 fd-card-hover overflow-hidden"
    :to="{ name: 'restaurant', params: { id: restaurant.id } }"
  >
    <img :src="restaurant.imageUrl" class="card-img-top fd-image" :alt="restaurant.name" loading="lazy" />

    <div class="card-body">
      <div class="d-flex align-items-start justify-content-between gap-2">
        <div class="min-w-0">
          <div class="fw-semibold text-truncate">{{ restaurant.name }}</div>
          <div class="small fd-muted text-truncate">{{ restaurant.tagline }}</div>
        </div>
        <div class="text-end">
          <div class="small">
            <i class="bi bi-star-fill text-warning"></i>
            <span class="fw-semibold ms-1">{{ restaurant.rating.toFixed(1) }}</span>
          </div>
        </div>
      </div>

      <div class="mt-2 d-flex flex-wrap gap-1">
        <span v-for="c in restaurant.cuisines" :key="c" class="badge text-bg-light border">{{ c }}</span>
      </div>

      <div class="mt-3 d-flex align-items-center justify-content-between">
        <div class="small fd-muted">
          Delivery Fee: {{ formatMoney(restaurant.deliveryFeeCents, currency) }}
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { formatMoney } from '@/utils/money'

defineProps({
  restaurant: { type: Object, required: true },
})

const catalog = useCatalogStore()
const currency = catalog.currency
</script>
