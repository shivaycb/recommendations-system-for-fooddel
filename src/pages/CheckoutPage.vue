<template>
  <div class="container py-4">
    <div class="d-flex align-items-end justify-content-between">
      <div>
        <h1 class="h3 mb-1">Checkout</h1>
        <div v-if="groups.length" class="small fd-muted">Ordering from {{ groups.length }} restaurant(s)</div>
      </div>
      <RouterLink class="btn btn-outline-secondary" to="/cart"><i class="bi bi-arrow-left me-2"></i>Back to cart</RouterLink>
    </div>

    <div v-if="cart.isEmpty" class="card border-0 shadow-sm mt-3">
      <div class="card-body">
        <EmptyState
          title="Your cart is empty"
          message="Add items before checking out."
          icon-class="bi bi-cart3"
        >
          <RouterLink class="btn btn-primary" to="/browse">Browse restaurants</RouterLink>
        </EmptyState>
      </div>
    </div>

    <template v-else>
      <div class="row g-3 g-lg-4 mt-3">
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="fw-semibold">Delivery details</div>

              <div class="row g-2 mt-2">
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Full name</label>
                  <input v-model.trim="name" type="text" class="form-control" placeholder="Your name" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Email</label>
                  <input v-model.trim="email" type="email" class="form-control" placeholder="you@example.com" />
                </div>
                <div class="col-12">
                  <label class="form-label small fw-semibold">Street address</label>
                  <input v-model.trim="street" type="text" class="form-control" placeholder="123 Main St" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">City</label>
                  <input v-model.trim="city" type="text" class="form-control" placeholder="City" />
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-semibold">Phone</label>
                  <input v-model.trim="phone" type="tel" class="form-control" placeholder="+234..." />
                </div>
              </div>

              <hr class="my-4" />

              <div class="fw-semibold">Payment</div>
              <div class="mt-2">
                <div class="form-check">
                  <input id="payCash" v-model="paymentMethod" class="form-check-input" type="radio" value="cash" />
                  <label class="form-check-label" for="payCash">Cash on delivery</label>
                </div>
                <div class="form-check mt-2">
                  <input id="payCard" v-model="paymentMethod" class="form-check-input" type="radio" value="card" />
                  <label class="form-check-label" for="payCard">Card (demo)</label>
                </div>

                <div v-if="paymentMethod === 'card'" class="row g-2 mt-2">
                  <div class="col-12">
                    <label class="form-label small fw-semibold">Card number</label>
                    <input v-model.trim="cardNumber" type="text" class="form-control" placeholder="4242 4242 4242 4242" />
                  </div>
                  <div class="col-6">
                    <label class="form-label small fw-semibold">Expiry</label>
                    <input v-model.trim="cardExpiry" type="text" class="form-control" placeholder="MM/YY" />
                  </div>
                  <div class="col-6">
                    <label class="form-label small fw-semibold">CVV</label>
                    <input v-model.trim="cardCvv" type="password" class="form-control" placeholder="123" />
                  </div>
                </div>

                <div class="small fd-muted mt-2">No real payments are processed in this demo.</div>
              </div>

              <div v-if="error" class="alert alert-danger mt-3 mb-0">{{ error }}</div>

              <button
                class="btn btn-primary w-100 mt-3"
                type="button"
                :disabled="isPlacing || !canPlaceOrders"
                @click="placeOrder"
              >
                <span v-if="isPlacing" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Place order
              </button>

              <div class="small fd-muted mt-2">
                You’re logged in as <span class="fw-semibold">{{ auth.user.email }}</span>.
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm mt-3" v-if="lastEmailPreview">
            <div class="card-body">
              <div class="fw-semibold">Email preview</div>
              <div class="small fd-muted mt-1">
                EmailJS is not configured, so we’re showing what would be sent.
              </div>
              <pre class="small bg-body-tertiary border rounded-3 p-3 mt-2 mb-0" style="white-space: pre-wrap">{{ lastEmailPreview }}</pre>
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <div class="fw-semibold">Order summary</div>

              <div v-for="g in groups" :key="g.restaurantId" class="mt-3">
                <div class="d-flex align-items-center justify-content-between">
                  <div class="fw-semibold">{{ g.restaurant?.name || 'Restaurant' }}</div>
                  <RouterLink class="btn btn-sm btn-outline-secondary" :to="{ name: 'restaurant', params: { id: g.restaurantId } }">Menu</RouterLink>
                </div>

                <div class="list-group list-group-flush mt-2">
                  <div v-for="it in g.items" :key="`${it.restaurantId}_${it.foodId}`" class="list-group-item d-flex justify-content-between">
                    <div class="min-w-0">
                      <div class="fw-semibold text-truncate">{{ it.qty }}× {{ it.food.name }}</div>
                      <div class="small fd-muted text-truncate">{{ formatMoney(it.unitPriceCents, catalog.currency) }} each</div>
                    </div>
                    <div class="fw-semibold">{{ formatMoney(it.lineTotalCents, catalog.currency) }}</div>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="d-flex justify-content-between">
                    <div class="fd-muted">Subtotal</div>
                    <div>{{ formatMoney(g.subtotalCents, catalog.currency) }}</div>
                  </div>
                  <div class="d-flex justify-content-between mt-2">
                    <div class="fd-muted">Delivery</div>
                    <div>{{ formatMoney(g.deliveryFeeCents, catalog.currency) }}</div>
                  </div>
                  <div class="d-flex justify-content-between mt-2">
                    <div class="fd-muted">Tax</div>
                    <div>{{ formatMoney(g.taxCents, catalog.currency) }}</div>
                  </div>
                  <hr />
                </div>
              </div>

              <div class="mt-4">
                <div class="d-flex justify-content-between fw-semibold">
                  <div>Cart Total</div>
                  <div>{{ formatMoney(cart.totalCents, catalog.currency) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useCartStore } from '@/stores/cart'
import { useOrdersStore } from '@/stores/orders'
import { useToastStore } from '@/stores/toasts'
import { formatMoney } from '@/utils/money'
import EmptyState from '@/components/EmptyState.vue'

import { neo4j_purchased, craft_and_send_after_purchase_email } from '@/services/recommendation'

const auth = useAuthStore()
const catalog = useCatalogStore()
const cart = useCartStore()
const orders = useOrdersStore()
const toast = useToastStore()

const router = useRouter()

const groups = computed(() => cart.detailedGroups)

const canPlaceOrders = computed(() => groups.value.length > 0)

const name = ref(auth.user?.name || '')
const email = ref(auth.user?.email || '')
const street = ref('')
const city = ref('')
const phone = ref('')

const paymentMethod = ref('cash')
const cardNumber = ref('')
const cardExpiry = ref('')
const cardCvv = ref('')

const isPlacing = ref(false)
const error = ref('')
const lastEmailPreview = ref('')

function validate() {
  const cleanName = name.value.trim()
  const cleanEmail = email.value.trim().toLowerCase()

  if (!cleanName) return 'Please enter your name.'
  if (!cleanEmail || !cleanEmail.includes('@')) return 'Please enter a valid email address.'
  if (!street.value.trim() || !city.value.trim()) return 'Please enter your full delivery address.'
  if (!phone.value.trim()) return 'Please enter a phone number.'

  if (paymentMethod.value === 'card') {
    if (cardNumber.value.trim().length < 12) return 'Please enter a valid card number.'
    if (!cardExpiry.value.trim()) return 'Please enter card expiry.'
    if (cardCvv.value.trim().length < 3) return 'Please enter card CVV.'
  }

  if (groups.value.length === 0) return 'Your cart is empty.'

  return ''
}

async function placeOrder() {
  error.value = ''
  lastEmailPreview.value = ''

  const v = validate()
  if (v) {
    error.value = v
    return
  }

  isPlacing.value = true

  try {
    const previews = []

    var purchasedFoodIds = []

    for (const g of groups.value) { 

      const restaurant_items = cart.itemsForRestaurant(g.restaurantId)

      orders.placeOrder({
        userId: auth.user.id,
        customerEmail: email.value.trim().toLowerCase(),
        customerName: name.value.trim(),
        restaurantId: g.restaurantId,
        items: restaurant_items,
        address: {
          street: street.value.trim(),
          city: city.value.trim(),
          phone: phone.value.trim(),
        },
        paymentMethod: paymentMethod.value,
      })

      purchasedFoodIds.push(...restaurant_items.map((x) => x.foodId))
    }

    neo4j_purchased(purchasedFoodIds, auth.user?.id)
    craft_and_send_after_purchase_email(auth.user?.id, auth.user?.name, auth.user?.email, purchasedFoodIds)

    if (previews.length) {
      lastEmailPreview.value = previews.join('\n\n---\n\n')
    }

    cart.clear()
    toast.push({ title: 'Orders placed', message: 'Your orders have been confirmed.', variant: 'success' })
    router.push({ name: 'orders' })
  } catch (err) {
    error.value = err?.message || 'Failed to place order.'
  } finally {
    isPlacing.value = false
  }
}
</script>
