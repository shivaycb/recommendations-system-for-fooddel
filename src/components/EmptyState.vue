<template>
  <div class="text-center py-5">
    <div class="display-6" v-if="iconClass"><i :class="iconClass"></i></div>
    <div class="fw-semibold mt-2">{{ title }}</div>
    <div v-if="message" class="small fd-muted mt-1">{{ message }}</div>
    <div class="mt-3">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  iconClass: { type: String, default: '' },
})
</script>
