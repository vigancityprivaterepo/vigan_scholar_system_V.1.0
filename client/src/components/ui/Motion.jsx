import { forwardRef, useEffect, useRef, useState } from 'react'

// Wraps a list card so it can fold away (grid-rows 1fr → 0fr) and slide out, then come back on Undo.
export function CollapseOut({ leaving, children, className = '' }) {
  return (
    <div className={`collapse-out ${leaving ? 'is-leaving' : ''} ${className}`} aria-hidden={leaving || undefined} {...(leaving ? { inert: '' } : {})}>
      <div>{children}</div>
    </div>
  )
}

// Text field for a required remark. Bump `shakeKey` to shake it; `error` shows the helper line and red border.
export const RemarkField = forwardRef(function RemarkField({ error, helper, shakeKey, className = '', multiline = false, ...props }, ref) {
  const [shaking, setShaking] = useState(false)
  useEffect(() => {
    if (!shakeKey) return undefined
    setShaking(true)
    const timer = setTimeout(() => setShaking(false), 400)
    return () => clearTimeout(timer)
  }, [shakeKey])

  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div>
      <Tag
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={`form-control ${shaking ? 'animate-shake' : ''} ${className}`}
        {...props}
      />
      {error && <p className="field-error animate-fade-in">{helper}</p>}
    </div>
  )
})

// Hook form of the empty-remark check: returns [errorFor(id), shakeKeyFor(id), require(id, value) → boolean, clear(id)].
export function useRequiredRemark() {
  const [errors, setErrors] = useState({})
  const [shakes, setShakes] = useState({})
  const require = (id, value) => {
    if (String(value || '').trim()) {
      setErrors((current) => ({ ...current, [id]: false }))
      return true
    }
    setErrors((current) => ({ ...current, [id]: true }))
    setShakes((current) => ({ ...current, [id]: (current[id] || 0) + 1 }))
    return false
  }
  const clear = (id) => setErrors((current) => (current[id] ? { ...current, [id]: false } : current))
  return { errorFor: (id) => Boolean(errors[id]), shakeKeyFor: (id) => shakes[id] || 0, require, clear }
}

// Empty state used by the decision queues ("All clear").
export function EmptyQueue({ title, children }) {
  return (
    <div className="portal-empty animate-pop-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
      </div>
      <h2 className="font-display text-[22px] font-semibold text-brand-primary">{title}</h2>
      <p className="text-[15px] text-slate-500">{children}</p>
    </div>
  )
}

// On/off switch; the knob travels on the spring curve so it overshoots slightly.
export function Toggle({ checked, onChange, labelledBy, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-med disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-emerald-700' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-med ease-spring ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// Counts up from the previous value to the new one (ease-out), e.g. dashboard tiles and totals.
export function CountUp({ value, duration = 700, format = (n) => n.toLocaleString('en-PH') }) {
  const target = Number(value) || 0
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion')
    if (reduce) { from.current = target; setShown(target); return undefined }
    const start = performance.now()
    const begin = from.current
    let frame = 0
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(Math.round(begin + (target - begin) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); from.current = target }
  }, [target, duration])
  return <span className="tabular-nums">{format(shown)}</span>
}
