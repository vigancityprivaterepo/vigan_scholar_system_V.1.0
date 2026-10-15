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

      // Returns the signed-in user, or { twoFactor: 'required' | 'setup', challengeToken }
      // when a staff account still has to pass two-step sign-in.
      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password }, { _skipAuthRefresh: true })
        return get()._finishSignIn(res.data)
      },

      loginWithGoogle: async (credential) => {
        const res = await api.post('/auth/google', { credential }, { _skipAuthRefresh: true })
        return get()._finishSignIn(res.data)
      },

      startTwoFactorSetup: async (challengeToken) => {
        const res = await api.post('/auth/2fa/setup', { challengeToken }, { _skipAuthRefresh: true })
        return { qrDataUrl: res.data.qrDataUrl, manualKey: res.data.manualKey }
      },

      enableTwoFactor: async (challengeToken, code, trustDevice) => {
        const res = await api.post('/auth/2fa/enable', { challengeToken, code, trustDevice }, { _skipAuthRefresh: true })
        const user = get()._finishSignIn(res.data)
        return { user, backupCodes: res.data.backupCodes }
      },

      verifyTwoFactor: async (challengeToken, { code, backupCode }, trustDevice) => {
        const res = await api.post('/auth/2fa/verify', { challengeToken, code, backupCode, trustDevice }, { _skipAuthRefresh: true })
        return get()._finishSignIn(res.data)
      },

      _finishSignIn: (data) => {
        if (data.twoFactorRequired || data.twoFactorSetupRequired) {
          return { twoFactor: data.twoFactorRequired ? 'required' : 'setup', challengeToken: data.challengeToken }
        }
        set({ user: data.user, accessToken: data.accessToken, hasRefreshHint: true })
        return data.user
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
