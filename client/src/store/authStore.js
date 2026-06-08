import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      hasRefreshHint: false,

      setTokens: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),

      initAuth: async () => {
        try {
          const { accessToken: existingAccess, hasRefreshHint } = get()

          if (existingAccess) {
            const meRes = await api.get('/auth/me', { _skipAuthRefresh: true })
            set({ user: meRes.data.user, isLoading: false })
            return
          }

          if (!hasRefreshHint) {
            set({ user: null, accessToken: null, isLoading: false })
            return
          }

          const refreshRes = await api.post('/auth/refresh', {}, { _skipAuthRefresh: true })
          const newAccess = refreshRes.data?.accessToken
          if (!newAccess) throw new Error('No access token')
          set({ accessToken: newAccess, hasRefreshHint: true })

          const meRes = await api.get('/auth/me')
          set({ user: meRes.data.user, isLoading: false })
        } catch {
          set({ user: null, accessToken: null, hasRefreshHint: false, isLoading: false })
        }
      },

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password }, { _skipAuthRefresh: true })
        set({
          user: res.data.user,
          accessToken: res.data.accessToken,
          hasRefreshHint: true,
        })
        return res.data.user
      },

      loginWithGoogle: async (credential) => {
        const res = await api.post('/auth/google', { credential }, { _skipAuthRefresh: true })
        set({
          user: res.data.user,
          accessToken: res.data.accessToken,
          hasRefreshHint: true,
        })
        return res.data.user
      },

      register: async (email, password, fullName) => {
        const res = await api.post('/auth/register', { email, password, fullName })
        return res.data
      },

      logout: async () => {
        try { await api.post('/auth/logout', {}) } catch {}
        set({ user: null, accessToken: null, hasRefreshHint: false })
      },
    }),
    {
      name: 'scholarship-auth-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ accessToken: state.accessToken, hasRefreshHint: state.hasRefreshHint }),
    }
  )
)
