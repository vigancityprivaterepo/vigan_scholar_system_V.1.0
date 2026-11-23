import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FAQ_ITEMS } from '../../utils/faq'
import { ChevronDownIcon } from '../ui/PortalIcons'
import { prefersReducedMotion } from '../../utils/motionPreference'

// Spring constants from the design handoff (stiffness k, damping c) and how far ahead a fling is projected.
const K = 420
const C = 28
const PROJECT_S = 0.18

const reducedMotion = () => prefersReducedMotion()

// Draggable bottom sheet with "Common questions". Drag the handle and let go: it snaps to closed, half or full,
// picking the snap point nearest to where the release velocity would carry it.
export default function HelpSheet({ open, onClose }) {
  const [y, setY] = useState(null)
  const [openIndex, setOpenIndex] = useState(-1)
  const yRef = useRef(0)
  const vRef = useRef(0)
  const frame = useRef(0)
  const drag = useRef(null)
  const sheetRef = useRef(null)

  const snaps = () => {
    const h = window.innerHeight
    return { full: Math.round(h * 0.08), half: Math.round(h * 0.45), closed: h }
  }

  const place = (value) => {
    yRef.current = value
    setY(value)
  }

  const springTo = useCallback((target, closeAfter = false) => {
    cancelAnimationFrame(frame.current)
    if (reducedMotion()) {
      place(target)
      if (closeAfter) onClose()
      return
    }
    let last = performance.now()
    const step = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000)
      last = now
      const a = -K * (yRef.current - target) - C * vRef.current
      vRef.current += a * dt
      place(yRef.current + vRef.current * dt)
      if (Math.abs(yRef.current - target) < 0.5 && Math.abs(vRef.current) < 5) {
        vRef.current = 0
        place(target)
        if (closeAfter) onClose()
        return
      }
      frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const { closed, half } = snaps()
    vRef.current = 0
    place(closed)
    springTo(half)
    const onKey = (event) => { if (event.key === 'Escape') springTo(snaps().closed, true) }
    window.addEventListener('keydown', onKey)
    sheetRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      cancelAnimationFrame(frame.current)
    }
  }, [open, springTo])

  if (!open || y === null) return null

  const onPointerDown = (event) => {
    cancelAnimationFrame(frame.current)
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startY: event.clientY, startTop: yRef.current, samples: [{ t: performance.now(), y: event.clientY }] }
  }

  const onPointerMove = (event) => {
    if (!drag.current) return
    const { full } = snaps()
    const next = Math.max(full - 40, drag.current.startTop + (event.clientY - drag.current.startY))
    place(next)
    drag.current.samples = [...drag.current.samples.slice(-4), { t: performance.now(), y: event.clientY }]
  }

  const onPointerUp = () => {
    if (!drag.current) return
    const samples = drag.current.samples
    drag.current = null
    const first = samples[0]
    const lastSample = samples[samples.length - 1]
    const dt = (lastSample.t - first.t) / 1000
    vRef.current = dt > 0 ? (lastSample.y - first.y) / dt : 0
    const projected = yRef.current + vRef.current * PROJECT_S
    const points = snaps()
    const target = Object.entries(points).reduce((best, [name, value]) => (
      Math.abs(value - projected) < Math.abs(points[best] - projected) ? name : best
    ), 'half')
    springTo(points[target], target === 'closed')
  }

  const closed = snaps().closed
  const scrim = Math.max(0, Math.min(0.35, 0.35 * (1 - (y - snaps().half) / (closed - snaps().half))))

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-brand-primary" style={{ opacity: scrim }} onClick={() => springTo(closed, true)} aria-hidden="true" />
      <section
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Common questions"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-2xl flex-col rounded-t-sheet bg-white shadow-raised outline-none"
        style={{ top: 0, transform: `translateY(${y}px)` }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center gap-2 px-5 pb-3 pt-3 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300" aria-hidden="true" />
          <div className="flex w-full items-center justify-between">
            <h2 className="font-display text-[22px] font-semibold text-brand-primary">Common questions</h2>
            <button type="button" onClick={() => springTo(closed, true)} className="press min-h-11 rounded-control px-3 text-[15px] font-semibold text-brand-teal">
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-10" style={{ maxHeight: `calc(100vh - ${y}px - 72px)` }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={item.q} className="border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                aria-expanded={openIndex === i}
                className="flex min-h-[56px] w-full items-center justify-between gap-3 py-3 text-left text-base font-semibold text-brand-primary"
              >
                {item.q}
                <ChevronDownIcon className={`h-5 w-5 shrink-0 transition-transform duration-med ease-spring ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-med ease-out ${openIndex === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <p className="overflow-hidden pb-0 text-[15px] leading-relaxed text-slate-600">
                  <span className="block pb-4">{item.a}</span>
                </p>
              </div>
            </div>
          ))}
          <Link to="/applicant/help" onClick={onClose} className="mt-4 inline-flex min-h-11 items-center text-[15px] font-semibold text-brand-teal">
            Open the full help page →
          </Link>
        </div>
      </section>
    </div>
  )
}
