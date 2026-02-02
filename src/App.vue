<template>
  <div class="min-vh-100 d-flex flex-column">
    <AppNavbar />

    <main class="flex-grow-1">
      <RouterView />
    </main>

    <AppFooter />

    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 1080; width: min(420px, 100vw);">
      <div
        v-for="t in toastStore.toasts"
        :key="t.id"
        class="toast show align-items-center border-0 mb-2"
        :class="`text-bg-${t.variant}`"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="d-flex">
          <div class="toast-body">
            <div class="fw-semibold d-flex align-items-center gap-2">
              <span v-if="t.loading" class="spinner-border spinner-border-sm" role="status"></span>
              {{ t.title }}
            </div>
            <div class="small">{{ t.message }}</div>
          </div>
          <button v-if="!t.loading" type="button" class="btn-close btn-close-white me-2 m-auto" @click="toastStore.remove(t.id)"></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useToastStore } from '@/stores/toasts'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'

const toastStore = useToastStore()
const authStore = useAuthStore()
const cartStore = useCartStore()

// Initialize cart for logged-in user on app startup
if (authStore.sessionUserId) {
  cartStore.loadForUser(authStore.sessionUserId)
}
</script>
