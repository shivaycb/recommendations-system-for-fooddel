import { defineStore } from 'pinia'
import { readJson, writeJson } from '@/utils/storage'
import { useCartStore } from '@/stores/cart'
import { neo4j_create_user, get_user_about_me } from '@/services/recommendation'

const USERS_KEY = 'fd_users_v1'
const SESSION_KEY = 'fd_session_v1'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const users = readJson(USERS_KEY, [])
    const session = readJson(SESSION_KEY, { userId: null })

    return {
      users: Array.isArray(users) ? users : [],
      sessionUserId: session?.userId || null,
      userAboutMeData: null,
      isLoadingAboutMe: false,
    }
  },
  getters: {
    user: (state) => state.users.find((u) => u.id === state.sessionUserId) || null,
  },
  actions: {
    _persistUsers() {
      writeJson(USERS_KEY, this.users)
    },
    _persistSession() {
      writeJson(SESSION_KEY, { userId: this.sessionUserId })
    },
    register({ name, email, password }) {
      const cleanName = String(name || '').trim()
      const cleanEmail = normalizeEmail(email)
      const cleanPassword = String(password || '')

      if (!cleanName) throw new Error('Please enter your name.')
      if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please enter a valid email address.')
      if (cleanPassword.length < 6) throw new Error('Password must be at least 6 characters.')

      const exists = this.users.some((u) => normalizeEmail(u.email) === cleanEmail)
      if (exists) throw new Error('An account with this email already exists.')

      const user_id = crypto.randomUUID()

      const user = {
        id: user_id,
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        createdAt: Date.now(),
      }

      this.users.push(user)
      this._persistUsers()

      this.sessionUserId = user.id
      this._persistSession()

      // Load user's cart
      const cartStore = useCartStore()
      cartStore.loadForUser(user.id)

      // Add to neo4j
      neo4j_create_user(user_id)

      // Fetch user about me data in background
      this.fetchUserAboutMe()

      return user
    },
    login({ email, password }) {
      const cleanEmail = normalizeEmail(email)
      const cleanPassword = String(password || '')

      const user = this.users.find((u) => normalizeEmail(u.email) === cleanEmail)
      if (!user || user.password !== cleanPassword) {
        throw new Error('Invalid email or password.')
      }

      this.sessionUserId = user.id
      this._persistSession()

      // Load user's cart
      const cartStore = useCartStore()
      cartStore.loadForUser(user.id)

      // Fetch user about me data in background
      this.fetchUserAboutMe()

      return user
    },
    logout() {
      this.sessionUserId = null
      this._persistSession()

      // Clear user about me data
      this.userAboutMeData = null
      this.isLoadingAboutMe = false

      // Clear cart for logout
      const cartStore = useCartStore()
      cartStore.clearForLogout()
    },
    async fetchUserAboutMe() {
      if (!this.user) return

      // Don't fetch if already loaded or currently loading
      if (this.userAboutMeData || this.isLoadingAboutMe) return

      this.isLoadingAboutMe = true
      try {
        this.userAboutMeData = await get_user_about_me(this.user.id, this.user.name)
      } catch (error) {
        console.error('Failed to load user about me data:', error)
        this.userAboutMeData = {}
      } finally {
        this.isLoadingAboutMe = false
      }
    }
  },
})
