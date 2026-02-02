import { defineStore } from 'pinia'

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

export const useToastStore = defineStore('toasts', {
  state: () => ({
    toasts: [],
  }),
  actions: {
    push({ title, message, variant = 'primary', timeoutMs = 3500, loading = false }) {
      const id = uid()
      this.toasts.push({ id, title, message, variant, loading })

      if (timeoutMs > 0 && !loading) {
        setTimeout(() => {
          this.remove(id)
        }, timeoutMs)
      }

      return id
    },
    update(id, { title, message, variant, loading, timeoutMs = 3500 }) {
      const toast = this.toasts.find(t => t.id === id)
      if (toast) {
        if (title !== undefined) toast.title = title
        if (message !== undefined) toast.message = message
        if (variant !== undefined) toast.variant = variant
        if (loading !== undefined) toast.loading = loading

        // If no longer loading, auto-remove after timeout
        if (loading === false && timeoutMs > 0) {
          setTimeout(() => {
            this.remove(id)
          }, timeoutMs)
        }
      }
    },
    remove(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },
    clear() {
      this.toasts = []
    },
  },
})
