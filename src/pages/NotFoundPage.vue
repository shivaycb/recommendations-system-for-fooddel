<template>
  <div class="container py-5" style="max-width: 720px">
    <div class="card border-0 shadow-sm">
      <div class="card-body p-5">
        <div class="display-6"><i class="bi bi-compass"></i></div>
        <h1 class="h4 mt-3">Page not found</h1>
        <div class="fd-muted">The page you’re looking for doesn’t exist.</div>

        <div class="d-flex gap-2 mt-4">
          <RouterLink class="btn btn-primary" to="/">Home</RouterLink>
          <RouterLink class="btn btn-outline-secondary" to="/browse">Browse</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
