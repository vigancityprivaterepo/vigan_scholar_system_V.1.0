import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,

      setTokens: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),

      initAuth: async () => {
        try {
          const existingAccess = get().accessToken

          if (existingAccess) {
            const meRes = await api.get('/auth/me', { _skipAuthRefresh: true })
            set({ user: meRes.data.user, isLoading: false })
            return
          }

          const refreshRes = await api.post('/auth/refresh', {}, { _skipAuthRefresh: true })
          const newAccess = refreshRes.data?.accessToken
          if (!newAccess) throw new Error('No access token')
          set({ accessToken: newAccess })

          const meRes = await api.get('/auth/me')
          set({ user: meRes.data.user, isLoading: false })
        } catch {
          set({ user: null, accessToken: null, isLoading: false })
        }
      },

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password }, { _skipAuthRefresh: true })
        set({
          user: res.data.user,
          accessToken: res.data.accessToken,
        })
        return res.data.user
      },

      register: async (email, password, fullName) => {
        const res = await api.post('/auth/register', { email, password, fullName })
        return res.data
      },

      logout: async () => {
        try { await api.post('/auth/logout', {}) } catch {}
        set({ user: null, accessToken: null })
      },
    }),
    {
      name: 'scholarship-auth-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
)
