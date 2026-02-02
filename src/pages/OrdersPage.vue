<template>
  <div class="container py-4">
    <div class="d-flex align-items-end justify-content-between">
      <div>
        <h1 class="h3 mb-1">Orders</h1>
        <div class="small fd-muted">Your recent orders and email status.</div>
      </div>
      <RouterLink class="btn btn-outline-secondary" to="/browse"><i class="bi bi-search me-2"></i>Order more</RouterLink>
    </div>

    <div v-if="myOrders.length === 0" class="card border-0 shadow-sm mt-3">
      <div class="card-body">
        <EmptyState
          title="No orders yet"
          message="When you checkout, your orders will show up here."
          icon-class="bi bi-receipt"
        >
          <RouterLink class="btn btn-primary" to="/browse">Browse restaurants</RouterLink>
        </EmptyState>
      </div>
    </div>

    <div v-else class="row g-3 g-lg-4 mt-3">
      <div v-for="o in myOrders" :key="o.id" class="col-12">
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex flex-column flex-md-row align-items-md-start justify-content-between gap-3">
              <div class="min-w-0">
                <div class="d-flex align-items-center gap-2">
                  <div class="fw-semibold">Order {{ o.id }}</div>
                  <span class="badge text-bg-light border">{{ o.status }}</span>
                </div>
                <div class="small fd-muted mt-1">
                  {{ formatDateTime(o.createdAt) }} • {{ o.restaurantName }}
                  <span v-if="o.etaMin" class="ms-2">• ETA ~{{ o.etaMin }} min</span>
                </div>

                <div class="small mt-2">
                  <span class="fd-muted">Total:</span>
                  <span class="fw-semibold ms-1">{{ formatMoney(o.totals.totalCents, o.currency) }}</span>
                </div>
              </div>
            </div>

            <hr class="my-4" />

            <div class="fw-semibold">Items</div>
            <div class="row g-3 mt-2">
              <div v-for="it in o.items" :key="it.foodId" class="col-md-6 col-lg-4">
                <div class="d-flex gap-3">
                  <img
                    :src="it.imageUrl"
                    :alt="it.name"
                    class="rounded-3 border"
                    style="width: 72px; height: 72px; object-fit: cover"
                    loading="lazy"
                  />
                  <div class="min-w-0">
                    <div class="fw-semibold text-truncate">{{ it.qty }}× {{ it.name }}</div>
                    <div class="small fd-muted">{{ formatMoney(it.unitPriceCents, o.currency) }} each</div>
                  </div>
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
import { computed, reactive } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useOrdersStore } from '@/stores/orders'
import { useToastStore } from '@/stores/toasts'
import { formatMoney } from '@/utils/money'
import EmptyState from '@/components/EmptyState.vue'


const auth = useAuthStore()
const catalog = useCatalogStore()
const orders = useOrdersStore()
const toast = useToastStore()

const previewByOrderId = reactive({})

const myOrders = computed(() => orders.ordersForUser(auth.user.id))

function formatDateTime(ts) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts))
  } catch {
    return String(ts)
  }
}

</script>
