// "Reduce motion" switch in Profile. Stored per device; adds a class that collapses all motion tokens.
const KEY = 'pref.reduceMotion'

export const getMotionPreference = () => {
  try { return window.localStorage.getItem(KEY) === '1' } catch { return false }
}

export const applyMotionPreference = (on = getMotionPreference()) => {
  document.documentElement.classList.toggle('reduce-motion', on)
}

export const setMotionPreference = (on) => {
  try { window.localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
  applyMotionPreference(on)
}

// For animations started from JavaScript (Web Animations, the help sheet spring).
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion')
