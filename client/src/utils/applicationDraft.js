import { useAuthStore } from '../store/authStore'

// Application form drafts live in this browser only, one per signed-in account, and are wiped on logout
// so the next person on a shared computer cannot see them. Files are never saved, only typed answers.
const PREFIX = 'scholarship_form_draft_v3:'
const LEGACY_KEY = 'scholarship_form_draft_v2'

const keyFor = (userId) => (userId ? `${PREFIX}${userId}` : null)
const currentUserId = () => useAuthStore.getState().user?.id

export const readDraft = (userId = currentUserId()) => {
  const key = keyFor(userId)
  if (!key) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
    // One-time move of a draft saved before drafts were tied to an account.
    const legacy = window.localStorage.getItem(LEGACY_KEY)
    if (!legacy) return null
    window.localStorage.removeItem(LEGACY_KEY)
    const draft = { form: JSON.parse(legacy), step: 0, savedAt: new Date().toISOString() }
    window.localStorage.setItem(key, JSON.stringify(draft))
    return draft
  } catch {
    return null
  }
}

export const writeDraft = (userId, { form, step }) => {
  const key = keyFor(userId)
  if (!key) return
  try {
    window.localStorage.setItem(key, JSON.stringify({ form, step, savedAt: new Date().toISOString() }))
  } catch {
    // Storage full or blocked: the form still works, it just will not resume.
  }
}

export const clearDraft = (userId = currentUserId()) => {
  const key = keyFor(userId)
  if (key) window.localStorage.removeItem(key)
}

export const clearAllDrafts = () => {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(PREFIX) || key === LEGACY_KEY)
      .forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // ignore
  }
}

// Just enough for the dashboard's "Resume" banner.
export const readDraftMeta = () => {
  const draft = readDraft()
  if (!draft?.form) return null
  const hasAnswers = Object.entries(draft.form).some(([k, v]) => k !== 'collegePreferences' && typeof v === 'string' && v.trim())
  return hasAnswers ? { step: Number(draft.step) || 0, savedAt: draft.savedAt } : null
}
