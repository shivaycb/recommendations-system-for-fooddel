<template>
  <div class="btn-group" role="group" aria-label="Quantity">
    <button
      type="button"
      class="btn btn-outline-secondary btn-sm"
      :disabled="disabled || qty <= 1"
      @click="$emit('decrement')"
    >
      <i class="bi bi-dash"></i>
    </button>

    <button type="button" class="btn btn-outline-secondary btn-sm disabled" tabindex="-1">{{ qty }}</button>

    <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="disabled" @click="$emit('increment')">
      <i class="bi bi-plus"></i>
    </button>
  </div>
</template>

<script setup>
defineProps({
  qty: { type: Number, required: true },
  disabled: { type: Boolean, default: false },
})

defineEmits(['increment', 'decrement'])
</script>
