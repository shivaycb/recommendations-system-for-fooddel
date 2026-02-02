import { createRouter, createWebHistory } from 'vue-router'

import LandingPage from '@/pages/LandingPage.vue'
import BrowsePage from '@/pages/BrowsePage.vue'
import RestaurantPage from '@/pages/RestaurantPage.vue'
import AboutMePage from '@/pages/AboutMePage.vue'
import CartPage from '@/pages/CartPage.vue'
import CheckoutPage from '@/pages/CheckoutPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import RegisterPage from '@/pages/RegisterPage.vue'
import OrdersPage from '@/pages/OrdersPage.vue'
import NotFoundPage from '@/pages/NotFoundPage.vue'

import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: LandingPage, meta: { title: 'Home' } },
    { path: '/browse', name: 'browse', component: BrowsePage, meta: { title: 'Browse' } },
    {
      path: '/restaurants/:id',
      name: 'restaurant',
      component: RestaurantPage,
      props: true,
      meta: { title: 'Restaurant' },
    },
    { path: '/about-me', name: 'about-me', component: AboutMePage, meta: { title: 'About Me' } },
    { path: '/cart', name: 'cart', component: CartPage, meta: { title: 'Cart' } },
    {
      path: '/checkout',
      name: 'checkout',
      component: CheckoutPage,
      meta: { title: 'Checkout', requiresAuth: true },
    },
    {
      path: '/orders',
      name: 'orders',
      component: OrdersPage,
      meta: { title: 'Orders', requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { title: 'Login', guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
      meta: { title: 'Register', guestOnly: true },
    },
    { path: '/:pathMatch(.*)*', name: 'notfound', component: NotFoundPage, meta: { title: 'Not Found' } },
  ],
})

router.beforeEach((to) => {
  if (typeof to.meta?.title === 'string') {
    document.title = `${to.meta.title} • Food Recommendation App`
  }

  const auth = useAuthStore()

  if (to.meta?.requiresAuth && !auth.user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta?.guestOnly && auth.user) {
    return { name: 'browse' }
  }
})

export default router
