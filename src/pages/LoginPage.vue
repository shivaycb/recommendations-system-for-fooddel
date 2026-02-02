<template>
  <div class="container py-5" style="max-width: 520px">
    <div class="card border-0 shadow-sm">
      <div class="card-body p-4">
        <div class="d-flex align-items-center gap-2">
          <div class="text-primary"><i class="bi bi-person-lock"></i></div>
          <h1 class="h4 mb-0">Login</h1>
        </div>

        <div class="small fd-muted mt-2">Welcome back. Login to checkout and view your orders.</div>

        <div class="mt-4">
          <label class="form-label small fw-semibold">Email</label>
          <input v-model.trim="email" type="email" class="form-control" placeholder="you@example.com" />
        </div>

        <div class="mt-3">
          <label class="form-label small fw-semibold">Password</label>
          <input v-model="password" type="password" class="form-control" placeholder="••••••" />
        </div>

        <div v-if="error" class="alert alert-danger mt-3 mb-0">{{ error }}</div>

        <button class="btn btn-primary w-100 mt-4" type="button" @click="submit">Login</button>

        <div class="small fd-muted mt-3">
          Don’t have an account?
          <RouterLink to="/register">Create one</RouterLink>
        </div>

        <div class="small fd-muted mt-2">Demo note: credentials are stored locally in your browser (localStorage).</div>
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

const email = ref('')
const password = ref('')
const error = ref('')

function submit() {
  error.value = ''

  try {
    const user = auth.login({ email: email.value, password: password.value })
    toast.push({ title: 'Welcome back', message: `Logged in as ${user.email}`, variant: 'success' })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    router.push(redirect || { name: 'browse' })
  } catch (err) {
    error.value = err?.message || 'Login failed.'
  }
}
</script>
