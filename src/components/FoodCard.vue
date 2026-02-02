<template>
  <div class="card h-100 fd-card-hover overflow-hidden">
    <img :src="food.imageUrl" class="card-img-top fd-image" :alt="food.name" loading="lazy" />

    <div class="card-body d-flex flex-column">
      <div class="d-flex align-items-start justify-content-between gap-2">
        <div class="min-w-0">
          <div class="fw-semibold text-truncate">{{ food.name }}</div>
          <div class="small fd-muted text-truncate">{{ food.cuisine }} • {{ food.country }}</div>
        </div>
        <div v-if="priceCents != null" class="fw-semibold">{{ formatMoney(priceCents, currency) }}</div>
      </div>

      <div v-if="food.description" class="small mt-2 fd-muted">{{ food.description }}</div>

      <div v-if="showTags" class="mt-2 d-flex flex-wrap gap-1">
        <span v-for="t in (food.tags || []).slice(0, 6)" :key="t" class="fd-tag">{{ t }}</span>
      </div>

      <div class="mt-auto pt-3 d-flex align-items-center justify-content-between gap-2">
        <div class="small fd-muted">
          <span
            v-if="food.diet?.vegetarian"
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

        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatMoney } from '@/utils/money'

defineProps({
  food: { type: Object, required: true },
  priceCents: { type: Number, default: undefined },
  currency: { type: String, default: 'USD' },
  showTags: { type: Boolean, default: true },
})
</script>
