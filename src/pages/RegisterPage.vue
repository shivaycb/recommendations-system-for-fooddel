<template>
  <div class="container py-5" style="max-width: 560px">
    <div class="card border-0 shadow-sm">
      <div class="card-body p-4">
        <div class="d-flex align-items-center gap-2">
          <div class="text-primary"><i class="bi bi-person-plus"></i></div>
          <h1 class="h4 mb-0">Create account</h1>
        </div>

        <div class="small fd-muted mt-2">
          Provide your email so we can send order confirmations and (optional) personalized offers.
        </div>

        <div class="row g-3 mt-3">
          <div class="col-12">
            <label class="form-label small fw-semibold">Full name</label>
            <input v-model.trim="name" type="text" class="form-control" placeholder="Your name" />
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Email</label>
            <input v-model.trim="email" type="email" class="form-control" placeholder="you@example.com" />
          </div>
          <div class="col-12">
            <label class="form-label small fw-semibold">Password</label>
            <input v-model="password" type="password" class="form-control" placeholder="At least 6 characters" />
          </div>
        </div>

        <div v-if="error" class="alert alert-danger mt-3 mb-0">{{ error }}</div>

        <button class="btn btn-primary w-100 mt-4" type="button" @click="submit">Create account</button>

        <div class="small fd-muted mt-3">
          Already have an account?
          <RouterLink to="/login">Login</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toasts'

const auth = useAuthStore()
const toast = useToastStore()

const router = useRouter() 
const route = useRoute()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')

function submit() {
  error.value = ''

  try {
    const user = auth.register({
      name: name.value,
      email: email.value,
      password: password.value
    })

    toast.push({ title: 'Account created', message: `Welcome, ${user.name}!`, variant: 'success' })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    router.push(redirect || { name: 'browse' })
  } catch (err) {
    error.value = err?.message || 'Registration failed.'
  }
}
</script>
