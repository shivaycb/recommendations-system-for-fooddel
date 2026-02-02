<template>
  <nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top">
    <div class="container">
      <RouterLink class="navbar-brand fw-semibold d-flex align-items-center gap-2" to="/">
        <span class="text-primary"><i class="bi bi-bag-heart"></i></span>
        <span>Food Recommendation App</span>
      </RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#fdNav"
        aria-controls="fdNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="fdNav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <RouterLink class="nav-link" to="/browse">Browse</RouterLink>
          </li>
          <li v-if="auth.user" class="nav-item">
            <RouterLink class="nav-link" to="/orders">Orders</RouterLink>
          </li>
          <li v-if="auth.user" class="nav-item">
            <RouterLink class="nav-link" to="/about-me">About Me</RouterLink>
          </li>
          <li v-if="auth.user" class="nav-item">
            <a class="nav-link" href="#" @click.prevent="sendPromoEmail">Send Promo Email</a>
          </li>
        </ul>

        <div class="d-flex align-items-center gap-2">
          <RouterLink class="btn btn-outline-secondary position-relative" to="/cart">
            <i class="bi bi-cart3"></i>
            <span class="ms-2 d-none d-md-inline">Cart</span>
            <span
              v-if="cart.count > 0"
              class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary"
            >
              {{ cart.count }}
            </span>
          </RouterLink>

          <div v-if="auth.user" class="dropdown">
            <button class="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-person-circle me-2"></i>{{ auth.user.name }}
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <span class="dropdown-item-text small fd-muted">{{ auth.user.email }}</span>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <RouterLink class="dropdown-item" to="/orders">
                  <i class="bi bi-receipt me-2"></i>Orders
                </RouterLink>
              </li>
              <li>
                <button class="dropdown-item" type="button" @click="logout">
                  <i class="bi bi-box-arrow-right me-2"></i>Logout
                </button>
              </li>
            </ul>
          </div>

          <div v-else class="d-flex gap-2">
            <RouterLink class="btn btn-outline-primary" to="/login">Login</RouterLink>
            <RouterLink class="btn btn-primary" to="/register">Register</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </nav>

</template>

<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toasts'
import { craft_and_send_promo_email } from '../services/recommendation'

const auth = useAuthStore()
const cart = useCartStore()
const toast = useToastStore()

const router = useRouter()

function logout() {
  auth.logout()
  toast.push({ title: 'Logged out', message: 'See you soon.', variant: 'secondary' })
  router.push({ name: 'home' })
}

async function sendPromoEmail() {
  if (!auth.user) return
  
  const toastId = toast.push({
    title: 'Sending Promo Email',
    message: 'Crafting your personalized promotional email...',
    variant: 'info',
    loading: true
  })
  
  try {
    await craft_and_send_promo_email(auth.user?.id, auth.user?.name, auth.user?.email)
    toast.update(toastId, {
      title: 'Email Sent!',
      message: 'Your personalized promo email has been sent successfully.',
      variant: 'success',
      loading: false
    })
  } catch (error) {
    console.error('Failed to send promo email:', error)
    toast.update(toastId, {
      title: 'Failed to Send',
      message: 'There was an error sending your promo email.',
      variant: 'danger',
      loading: false
    })
  }
}
</script>

