import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: true,

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),

      initAuth: async () => {
        const { accessToken } = get()
        if (!accessToken) {
          set({ isLoading: false })
          return
        }
        try {
          const res = await api.get('/auth/me')
          set({ user: res.data.user, isLoading: false })
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, isLoading: false })
        }
      },

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password }, { _skipAuthRefresh: true })
        set({
          user: res.data.user,
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        })
        return res.data.user
      },

      register: async (email, password, fullName) => {
        const res = await api.post('/auth/register', { email, password, fullName })
        return res.data
      },

      logout: async () => {
        const { refreshToken } = get()
        try { await api.post('/auth/logout', { refreshToken }) } catch {}
        set({ user: null, accessToken: null, refreshToken: null })
      },
    }),
    {
      name: 'scholarship-auth',
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
)
